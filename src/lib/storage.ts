export function safeDispatchCustomEvent(name: string, detail?: any): void {
  if (typeof window === 'undefined') return;
  try {
    let event: Event;
    try {
      event = new CustomEvent(name, detail !== undefined ? { detail } : undefined);
    } catch {
      try {
        event = document.createEvent('CustomEvent');
        (event as any).initCustomEvent(name, true, true, detail);
      } catch {
        try {
          event = new Event(name);
        } catch {
          event = { type: name, detail } as any;
        }
      }
    }
    window.dispatchEvent(event);
  } catch (err) {
    console.warn(`Failed to dispatch custom event "${name}":`, err);
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        safeDispatchCustomEvent('local_project_mutated', { key });
        if ('BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('era_frontend_sync');
            bc.postMessage({ type: 'storage_update', key });
            bc.close();
          } catch (e) {}
        }
      }, 0);
    }
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn('LocalStorage quota exceeded. Attempting to clear older or unused storage keys...');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            // Remove older versions of projects/users/approvals keys (e.g. up to v27)
            const matchProj = k.match(/^era_proj_v(\d+)$/);
            if (matchProj && parseInt(matchProj[1], 10) < 28) {
              keysToRemove.push(k);
            }
            const matchUsers = k.match(/^era_users_v(\d+)$/);
            if (matchUsers && parseInt(matchUsers[1], 10) < 28) {
              keysToRemove.push(k);
            }
            const matchAppr = k.match(/^era_appr_v(\d+)$/);
            if (matchAppr && parseInt(matchAppr[1], 10) < 28) {
              keysToRemove.push(k);
            }
          }
        }
        if (keysToRemove.length > 0) {
          console.info('Removing obsolete keys:', keysToRemove);
          keysToRemove.forEach(k => localStorage.removeItem(k));
          try {
            localStorage.setItem(key, value);
            if (typeof window !== 'undefined') {
              safeDispatchCustomEvent('local_project_mutated', { key });
            }
            return;
          } catch (retryError) {
            console.error('Failed to setItem even after clearing obsolete keys:', retryError);
          }
        }
      } catch (cleanError) {
        console.error('Error during localStorage cleanup:', cleanError);
      }
    }
  }
}

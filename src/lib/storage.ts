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

export function reclaimFirestoreWebStorageKeys(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let removed = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('firestore_mutations_') ||
        k.startsWith('firestore_clients_') ||
        k.startsWith('firestore_online_state_') ||
        k.startsWith('firestore_sequence_number_') ||
        k.startsWith('firestore_overlay_') ||
        k.startsWith('firestore_throttle_')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
        removed++;
      } catch {}
    });
  } catch {}
  return removed;
}

export function pruneReconstructibleStorage(aggressive = false): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let removed = reclaimFirestoreWebStorageKeys();
  try {
    const obsoleteKeys: string[] = [];
    const cacheKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      const matchProj = k.match(/^era_proj_v(\d+)$/);
      if (matchProj && parseInt(matchProj[1], 10) < 28) {
        obsoleteKeys.push(k);
        continue;
      }
      const matchUsers = k.match(/^era_users_v(\d+)$/);
      if (matchUsers && parseInt(matchUsers[1], 10) < 28) {
        obsoleteKeys.push(k);
        continue;
      }
      const matchAppr = k.match(/^era_appr_v(\d+)$/);
      if (matchAppr && parseInt(matchAppr[1], 10) < 28) {
        obsoleteKeys.push(k);
        continue;
      }

      if (aggressive) {
        if (
          k === 'era_sync_logs_v28' ||
          k.startsWith('era_hist_backup_') ||
          k.startsWith('era_daily_notes_') ||
          k.startsWith('era_labor_') ||
          k.startsWith('era_no_work_') ||
          k.startsWith('era_production_') ||
          k.startsWith('era_equipment_') ||
          k.startsWith('era_materials_') ||
          k.startsWith('era_challenges_') ||
          k.startsWith('era_plans_')
        ) {
          cacheKeys.push(k);
        }
      }
    }

    obsoleteKeys.forEach((k) => {
      try {
        localStorage.removeItem(k);
        removed++;
      } catch {}
    });
    if (aggressive) {
      cacheKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
          removed++;
        } catch {}
      });
    }
  } catch (cleanError) {
    console.error('Error during localStorage cleanup:', cleanError);
  }
  return removed;
}

function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22;
  }
  const msg = (error as any)?.message || String(error);
  return msg.includes('QuotaExceededError') || msg.includes('exceeded the quota');
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        safeDispatchCustomEvent('local_project_mutated', { key });
        if (typeof window.BroadcastChannel === 'function') {
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
    if (isQuotaError(error)) {
      console.warn('LocalStorage quota exceeded. Reclaiming orphaned Firestore & cache storage keys...');
      // First pass: remove orphaned Firestore WebStorage keys & obsolete old-version keys
      pruneReconstructibleStorage(false);
      try {
        localStorage.setItem(key, value);
        if (typeof window !== 'undefined') {
          safeDispatchCustomEvent('local_project_mutated', { key });
        }
        return;
      } catch {
        // Second pass: remove reconstructible per-date caches & sync logs
        pruneReconstructibleStorage(true);
        try {
          localStorage.setItem(key, value);
          if (typeof window !== 'undefined') {
            safeDispatchCustomEvent('local_project_mutated', { key });
          }
          return;
        } catch (retryError) {
          console.error('Failed to setItem even after aggressive localStorage cleanup:', retryError);
        }
      }
    }
  }
}


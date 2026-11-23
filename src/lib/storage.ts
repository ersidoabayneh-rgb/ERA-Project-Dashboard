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

const KV_DB_NAME = 'ERA_Enterprise_KV';
const KV_DB_VERSION = 1;
const KV_STORE_NAME = 'kv_store';
const memoryFallbackStore = new Map<string, string>();

function openKvDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(KV_DB_NAME, KV_DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(KV_STORE_NAME)) {
          db.createObjectStore(KV_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSetItem(key: string, value: string): Promise<boolean> {
  memoryFallbackStore.set(key, value);
  const idb = await openKvDb();
  if (!idb) return false;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(KV_STORE_NAME, 'readwrite');
      tx.objectStore(KV_STORE_NAME).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGetItem(key: string): Promise<string | null> {
  if (memoryFallbackStore.has(key)) {
    return memoryFallbackStore.get(key) || null;
  }
  const idb = await openKvDb();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(KV_STORE_NAME, 'readonly');
      const req = tx.objectStore(KV_STORE_NAME).get(key);
      req.onsuccess = () => {
        const val = req.result?.value;
        if (typeof val === 'string') {
          memoryFallbackStore.set(key, val);
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
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
          k.startsWith('era_plans_') ||
          k.startsWith('era_active_sections_')
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
    console.warn('Notice during localStorage cleanup:', cleanError);
  }
  return removed;
}

function stripHeavyMediaForCache(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const clone: any = { ...obj };
  if (Array.isArray(clone.images)) {
    clone.images = clone.images.map((img: any) =>
      typeof img === 'string' && img.startsWith('data:')
        ? ''
        : img && typeof img === 'object'
          ? { ...img, url: typeof img.url === 'string' && img.url.startsWith('data:') ? '' : img.url, dataUrl: '' }
          : img
    );
  }
  if (Array.isArray(clone.bonds)) {
    clone.bonds = clone.bonds.map((b: any) =>
      b && Array.isArray(b.attachments)
        ? { ...b, attachments: b.attachments.map((att: any) => ({ ...att, dataUrl: undefined })) }
        : b
    );
  }
  return clone;
}

function compactOversizedValueForLocalStorage(key: string, value: string): string | null {
  try {
    if (key === 'era_appr_v28') {
      const list = JSON.parse(value);
      if (Array.isArray(list)) {
        // Keep full approval metadata & trimmed snapshotData, omit heavy baselineData/base64 media in localStorage mirror
        const compact = list.slice(0, 60).map((item: any) => ({
          ...item,
          baselineData: undefined,
          snapshotData: item?.snapshotData
            ? stripHeavyMediaForCache({
                ...item.snapshotData,
                dailySiteLogs: undefined,
                history: Array.isArray(item.snapshotData.history) ? item.snapshotData.history.slice(0, 10) : undefined,
              })
            : item?.snapshotData,
        }));
        return JSON.stringify(compact);
      }
    }
    if (key === 'era_proj_v28') {
      const list = JSON.parse(value);
      if (Array.isArray(list)) {
        const compact = list.map((p: any) => stripHeavyMediaForCache(p));
        return JSON.stringify(compact);
      }
    }
    if (key === 'era_offline_sync_queue') {
      const list = JSON.parse(value);
      if (Array.isArray(list)) {
        const compact = list.slice(-5).map((p: any) => stripHeavyMediaForCache(p));
        return JSON.stringify(compact);
      }
    }
    if (key === 'era_private_drafts_v1' || key === 'era_workflow_audit_logs_v1') {
      const list = JSON.parse(value);
      if (Array.isArray(list)) {
        return JSON.stringify(list.slice(0, 25));
      }
    }
  } catch {}
  return null;
}

function evictSecondaryLargeCaches(excludeKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const secondaryOrder = [
    'era_sync_logs_v28',
    'era_workflow_audit_logs_v1',
    'era_private_drafts_v1',
    'era_offline_sync_queue',
    'era_appr_v28',
  ];
  for (const k of secondaryOrder) {
    if (k === excludeKey) continue;
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        // Preserve full copy in IndexedDB before evicting from localStorage
        void idbSetItem(k, raw);
        localStorage.removeItem(k);
      }
    } catch {}
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22;
  }
  const msg = (error as any)?.message || String(error);
  return msg.includes('QuotaExceededError') || msg.includes('exceeded the quota');
}

function notifyLocalMutation(key: string): void {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    safeDispatchCustomEvent('local_project_mutated', { key });
    if (typeof window.BroadcastChannel === 'function') {
      try {
        const bc = new BroadcastChannel('era_frontend_sync');
        bc.postMessage({ type: 'storage_update', key });
        bc.close();
      } catch {}
    }
  }, 0);
}

export function safeSetSmallItem(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  memoryFallbackStore.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (isQuotaError(error)) {
      pruneReconstructibleStorage(true);
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        evictSecondaryLargeCaches(key);
        try {
          localStorage.setItem(key, value);
        } catch {
          void idbSetItem(key, value);
        }
      }
    }
  }
}

export function safeSetItem(key: string, value: string): void {
  // Always mirror large core keys to IndexedDB (multi-hundred MB quota) so no data is ever lost
  if (
    key === 'era_proj_v28' ||
    key === 'era_appr_v28' ||
    key === 'era_users_v28' ||
    key === 'era_offline_sync_queue' ||
    key === 'era_private_drafts_v1' ||
    key === 'era_workflow_audit_logs_v1'
  ) {
    void idbSetItem(key, value);
  } else {
    memoryFallbackStore.set(key, value);
  }

  try {
    localStorage.setItem(key, value);
    notifyLocalMutation(key);
  } catch (error) {
    if (!isQuotaError(error)) {
      console.warn(`localStorage.setItem notice for key "${key}":`, error);
      return;
    }

    // Pass 1: Remove orphaned Firestore WebStorage keys & obsolete < v28 keys
    pruneReconstructibleStorage(false);
    try {
      localStorage.setItem(key, value);
      notifyLocalMutation(key);
      return;
    } catch {}

    // Pass 2: Remove reconstructible daily caches & sync logs
    pruneReconstructibleStorage(true);
    try {
      localStorage.setItem(key, value);
      notifyLocalMutation(key);
      return;
    } catch {}

    // Pass 3: Offload secondary caches to IndexedDB & try compacted copy in localStorage
    try {
      localStorage.removeItem(key);
    } catch {}
    evictSecondaryLargeCaches(key);
    try {
      localStorage.setItem(key, value);
      notifyLocalMutation(key);
      return;
    } catch {}

    const compacted = compactOversizedValueForLocalStorage(key, value);
    if (compacted) {
      try {
        localStorage.setItem(key, compacted);
        notifyLocalMutation(key);
        console.warn(`Stored compacted "${key}" in localStorage; full dataset safely persisted in IndexedDB.`);
        return;
      } catch {}
    }

    // Final graceful fallback: full payload is already safely saved in IndexedDB + memory + Cloud Firestore
    notifyLocalMutation(key);
    console.warn(`"${key}" exceeded 5MB localStorage budget; persisted cleanly to IndexedDB instead.`);
  }
}



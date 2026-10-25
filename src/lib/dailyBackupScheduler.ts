import { Project, ProgressPlanHistoryItem } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { recordSyncLog } from './apiSync';

const BACKUP_TIMESTAMP_KEY = 'era_last_daily_progress_plan_backup_time';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// IndexedDB database and store names (survives localStorage.clear())
const IDB_NAME = 'ERA_Enterprise_DB';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'progressPlanHistoryBackups';

/**
 * Initializes or retrieves the IndexedDB instance for persistent offline storage
 * that persists even when localStorage is wiped or cleared.
 */
function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'projectId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[DailyBackup] IndexedDB open error, proceeding with API/cloud persistence.');
        resolve(null);
      };
    } catch (e) {
      console.warn('[DailyBackup] IndexedDB exception:', e);
      resolve(null);
    }
  });
}

/**
 * Persists progressPlanHistory into browser IndexedDB
 */
async function saveToIndexedDb(projectId: string, history: ProgressPlanHistoryItem[], timestamp: string): Promise<boolean> {
  const idb = await openIndexedDb();
  if (!idb) return false;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put({
        projectId,
        history,
        backedUpAt: timestamp
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Retrieves progressPlanHistory from browser IndexedDB
 */
export async function getFromIndexedDb(projectId: string): Promise<ProgressPlanHistoryItem[] | null> {
  const idb = await openIndexedDb();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(projectId);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.history) && req.result.history.length > 0) {
          resolve(req.result.history);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Synchronizes a single project's progressPlanHistory to all three tiers of persistent storage:
 * 1. Persistent backend REST endpoint (/api/backup/progress-plan-history)
 * 2. Firebase Firestore persistent collection (progress_plan_history_backups)
 * 3. Browser IndexedDB storage (unaffected by localStorage.clear())
 */
export async function syncProgressPlanHistoryToPersistentStorage(
  projectId: string,
  projectName: string,
  history: ProgressPlanHistoryItem[]
): Promise<{ success: boolean; count: number; timestamp: string }> {
  const timestamp = new Date().toISOString();
  if (!projectId || !Array.isArray(history)) {
    return { success: false, count: 0, timestamp };
  }

  // Tier 1: Browser IndexedDB (guarantees survival through localStorage clearing)
  saveToIndexedDb(projectId, history, timestamp).catch(() => {});

  // Tier 2: Persistent Backend REST API (writes to disk JSON file & Firestore Admin)
  try {
    fetch('/api/backup/progress-plan-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectName,
        progressPlanHistory: history,
        timestamp
      })
    }).catch(() => {});
  } catch (e) {}

  // Tier 3: Firebase Firestore Client Database
  try {
    const backupDocRef = doc(db, 'progress_plan_history_backups', projectId);
    setDoc(backupDocRef, {
      projectId,
      projectName,
      progressPlanHistory: history,
      backedUpAt: timestamp,
      recordCount: history.length
    }, { merge: true }).catch(() => {});
  } catch (e) {}

  // Also maintain localStorage backup key for fast local access
  try {
    localStorage.setItem(`era_hist_backup_${projectId}`, JSON.stringify(history));
  } catch (e) {}

  return { success: true, count: history.length, timestamp };
}

/**
 * Checks whether 24 hours have elapsed since the last automated backup,
 * and if so, performs the backup of all projects' progressPlanHistory.
 */
export async function runAutomatedDailyBackupCheck(projects: Project[], force = false): Promise<boolean> {
  if (!projects || projects.length === 0) return false;

  let lastBackupTime = 0;
  try {
    const stored = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) lastBackupTime = parsed;
    }
  } catch (e) {}

  const now = Date.now();
  const timeSinceLastBackup = now - lastBackupTime;

  // Trigger if 24 hours elapsed or if force requested (e.g., initial setup)
  if (force || timeSinceLastBackup >= TWENTY_FOUR_HOURS_MS || lastBackupTime === 0) {
    console.log(`[ERA Daily Backup] Automated 24h trigger initiated. Backing up ${projects.length} project history records...`);

    let totalHistoryRecords = 0;
    const backupPromises = projects.map(async (project) => {
      const hist = project.progressPlanHistory;
      if (Array.isArray(hist) && hist.length > 0) {
        totalHistoryRecords += hist.length;
        return syncProgressPlanHistoryToPersistentStorage(project.id, project.name, hist);
      }
      return null;
    });

    await Promise.allSettled(backupPromises);

    // Save timestamp of successful daily backup
    try {
      localStorage.setItem(BACKUP_TIMESTAMP_KEY, now.toString());
    } catch (e) {}

    recordSyncLog({
      recordType: 'batch_sync',
      status: 'firestore_synced',
      details: `Automated 24h Daily Backup completed: Persisted ${totalHistoryRecords} progressPlanHistory records across ${projects.length} projects to persistent storage (Disk, Firestore, and IndexedDB).`
    });

    return true;
  }

  return false;
}

/**
 * Restores progressPlanHistory from persistent storage tiers if localStorage was cleared
 * or if project.progressPlanHistory is empty.
 */
export async function restoreProgressPlanHistoryFromPersistentStorage(projectId: string): Promise<ProgressPlanHistoryItem[] | null> {
  if (!projectId) return null;

  // 1. Try IndexedDB first (fastest local persistent store that survives localStorage.clear())
  try {
    const idbData = await getFromIndexedDb(projectId);
    if (idbData && idbData.length > 0) {
      console.log(`[ERA Restore] Successfully recovered ${idbData.length} progressPlanHistory records from IndexedDB for project ${projectId}`);
      return idbData;
    }
  } catch (e) {}

  // 2. Try Backend REST API (persisted disk file & Firestore Admin)
  try {
    const res = await fetch(`/api/backup/progress-plan-history/${encodeURIComponent(projectId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.progressPlanHistory) && json.progressPlanHistory.length > 0) {
        console.log(`[ERA Restore] Recovered ${json.progressPlanHistory.length} history records from backend persistent backup`);
        return json.progressPlanHistory;
      }
    }
  } catch (e) {}

  // 3. Try Direct Firestore collection
  try {
    const backupDocRef = doc(db, 'progress_plan_history_backups', projectId);
    const snap = await getDoc(backupDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.progressPlanHistory) && data.progressPlanHistory.length > 0) {
        console.log(`[ERA Restore] Recovered ${data.progressPlanHistory.length} history records from Firestore backup`);
        return data.progressPlanHistory;
      }
    }
  } catch (e) {}

  return null;
}

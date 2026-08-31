import { Project, User as AppUser, ApprovalRequest } from '../types';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { defaultProjectTemplate } from '../data/defaultProject';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export interface SyncLogEntry {
  id: string;
  createdAt: string;
  recordType: 'project' | 'user' | 'approval' | 'config' | 'batch_sync';
  recordId?: string;
  status: 'synced' | 'validation_failed' | 'server_error' | 'offline_queued' | 'firestore_synced' | 'deleted';
  ipAddress?: string;
  errorMessage?: string;
  details?: string;
}

const SYNC_LOGS_STORAGE_KEY = 'era_sync_logs_v28';

/**
 * Appends a sync event to the local audit trail and dispatches a notification event.
 */
export function recordSyncLog(entry: {
  recordType: SyncLogEntry['recordType'];
  recordId?: string;
  status: SyncLogEntry['status'];
  errorMessage?: string;
  details?: string;
  ipAddress?: string;
}): void {
  try {
    const newLog: SyncLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      recordType: entry.recordType,
      recordId: entry.recordId,
      status: entry.status,
      ipAddress: entry.ipAddress || '127.0.0.1 (Local Client)',
      errorMessage: entry.errorMessage,
      details: entry.details,
    };

    let currentLogs: SyncLogEntry[] = [];
    try {
      const stored = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
      if (stored) currentLogs = JSON.parse(stored);
    } catch {}

    // Prepend newest logs, capped at 100 entries
    currentLogs = [newLog, ...currentLogs].slice(0, 100);
    localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(currentLogs));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync_log_recorded', { detail: newLog }));
    }
  } catch (e) {
    // Silently ignore storage failures
  }
}

/**
 * Returns locally stored sync event logs.
 */
export function getLocalSyncLogs(): SyncLogEntry[] {
  try {
    const stored = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

/**
 * Fetches sync logs from local repository and attempts remote sync without noisy warnings.
 */
export async function safeFetchSyncLogs(): Promise<SyncLogEntry[]> {
  let logs = getLocalSyncLogs();
  try {
    const res = await fetch('/api/sync-logs').catch(() => null);
    if (res && res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json().catch(() => null);
      if (json && json.success && Array.isArray(json.logs)) {
        const map = new Map<string, SyncLogEntry>();
        logs.forEach(l => map.set(l.id, l));
        json.logs.forEach((l: SyncLogEntry) => map.set(l.id, l));
        logs = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
        localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(logs));
      }
    }
  } catch {}

  return logs;
}

/**
 * Clears local sync logs.
 */
export function clearSyncLogs(): void {
  try {
    localStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync_log_recorded'));
    }
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let syncSuspendedState = false;
let quotaExhaustedState = false;

export function isSyncSuspended(): boolean {
  return syncSuspendedState || quotaExhaustedState;
}

export function isQuotaExhausted(): boolean {
  return quotaExhaustedState;
}

export async function reactivateSync(): Promise<void> {
  syncSuspendedState = false;
  quotaExhaustedState = false;
}

export function handleFsError(err: any): void {
  const msg = err?.message || String(err);
  if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('code=resource-exhausted')) {
    if (!quotaExhaustedState) {
      quotaExhaustedState = true;
      syncSuspendedState = true;
      console.warn('[Firestore Notice]: Cloud Firestore daily write quota reached. Operating seamlessly in local mode.');
    }
  }
}

export function normalizeProject(p: any): Project {
  if (!p) return p;
  const tmpl = defaultProjectTemplate();
  return {
    ...p,
    origDays: typeof p.origDays === 'string' ? parseFloat(p.origDays) || 0 : (p.origDays || 0),
    eotDays: typeof p.eotDays === 'string' ? parseFloat(p.eotDays) || 0 : (p.eotDays || 0),
    variation: typeof p.variation === 'string' ? parseFloat(p.variation) || 0 : (p.variation || 0),
    origAmount: typeof p.origAmount === 'string' ? parseFloat(p.origAmount) || 0 : (p.origAmount || 0),
    lengthKm: typeof p.lengthKm === 'string' ? parseFloat(p.lengthKm) || 0 : (p.lengthKm || 0),
    provisionalSum: typeof p.provisionalSum === 'string' ? parseFloat(p.provisionalSum) || 0 : (p.provisionalSum || 0),
    physicalProgress: typeof p.physicalProgress === 'string' ? parseFloat(p.physicalProgress) || 0 : (p.physicalProgress || 0),
    rowMetrics: Array.isArray(p.rowMetrics) && p.rowMetrics.length > 0 ? p.rowMetrics : tmpl.rowMetrics,
    quantities: Array.isArray(p.quantities) && p.quantities.length > 0 ? p.quantities : tmpl.quantities,
    series: Array.isArray(p.series) ? p.series : tmpl.series,
    monthly: Array.isArray(p.monthly) ? p.monthly : tmpl.monthly,
    payment: Array.isArray(p.payment) ? p.payment : tmpl.payment,
    bonds: Array.isArray(p.bonds) ? p.bonds : tmpl.bonds,
    ipcTracker: Array.isArray(p.ipcTracker) ? p.ipcTracker : tmpl.ipcTracker,
    workProgram: Array.isArray(p.workProgram) ? p.workProgram : tmpl.workProgram,
    history: Array.isArray(p.history) 
      ? p.history.map((h: any) => ({
          ...h,
          physicalProgress: typeof h.physicalProgress === 'string' ? parseFloat(h.physicalProgress) || 0 : (typeof h.physicalProgress === 'number' ? h.physicalProgress : 0)
        }))
      : tmpl.history,
    annual: Array.isArray(p.annual) ? p.annual : tmpl.annual,
    images: Array.isArray(p.images) ? p.images : tmpl.images,
    supervisionConsultant: p.supervisionConsultant ? {
      ...tmpl.supervisionConsultant,
      ...p.supervisionConsultant,
      firmName: p.supervisionConsultant.firmName || p.consultant || tmpl.supervisionConsultant?.firmName || '',
      personnel: Array.isArray(p.supervisionConsultant.personnel) ? p.supervisionConsultant.personnel : (tmpl.supervisionConsultant?.personnel || []),
      invoices: Array.isArray(p.supervisionConsultant.invoices) ? p.supervisionConsultant.invoices : (tmpl.supervisionConsultant?.invoices || [])
    } : (tmpl.supervisionConsultant ? {
      ...tmpl.supervisionConsultant,
      firmName: p.consultant || tmpl.supervisionConsultant.firmName
    } : undefined)
  };
}

/**
 * Fetches all tombstoned / permanently deleted project IDs from Firestore and local cache.
 */
export async function safeFetchDeletedProjectIds(): Promise<string[]> {
  const localSet = new Set<string>();
  try {
    const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const parsed: string[] = JSON.parse(delStr);
    if (Array.isArray(parsed)) {
      parsed.forEach(id => { if (id && typeof id === 'string') localSet.add(id); });
    }
  } catch {}

  try {
    const querySnapshot = await getDocs(collection(db, 'deleted_projects')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.id) localSet.add(data.id);
        if (docSnap.id) localSet.add(docSnap.id);
      });
    }
  } catch (e) {
    console.warn('Firestore fetch deleted projects notice:', e);
  }

  const result = Array.from(localSet);
  try {
    localStorage.setItem('era_deleted_project_ids', JSON.stringify(result));
  } catch {}
  return result;
}

/**
 * Robust, self-healing project sync function that handles Firebase Cloud Firestore & REST Backend Sync.
 */
export async function safeSyncProject(proj: Project, isBackgroundQueueSync = false): Promise<void> {
  if (!proj || !proj.id) return;

  // Block sync if this project has been permanently deleted
  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (deletedIds.includes(proj.id)) {
      console.warn(`Sync blocked: Project "${proj.name || proj.id}" (ID: ${proj.id}) is permanently deleted.`);
      // Clean from offline queue if accidentally present
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      const filtered = queue.filter(p => p.id !== proj.id);
      localStorage.setItem('era_offline_sync_queue', JSON.stringify(filtered));
      return;
    }
  } catch {}

  if (!proj.lastModifiedAt) {
    proj.lastModifiedAt = new Date().toISOString();
  }

  // Emit event for Local Mutation Listener to pick up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
  }

  const normalized = normalizeProject(proj);

  // Firestore Sync
  if (!isSyncSuspended()) {
    try {
      const cleanNormalized = JSON.parse(JSON.stringify(normalized));
      cleanNormalized.updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'projects', normalized.id), cleanNormalized, { merge: true });
      recordSyncLog({
        recordType: 'project',
        recordId: normalized.id,
        status: 'firestore_synced',
        details: `Successfully synchronized "${normalized.name || normalized.id}" to Cloud Firestore`
      });
    } catch (fsErr) {
      handleFsError(fsErr);
      recordSyncLog({
        recordType: 'project',
        recordId: normalized.id,
        status: 'server_error',
        errorMessage: fsErr instanceof Error ? fsErr.message : String(fsErr)
      });
    }
  }

  // Relational Database Sync: optional Express REST API (/api/projects/sync)
  const sqlSyncPromise = (async () => {
    if (!proj.id || typeof proj.id !== 'string') {
      const msg = "Client Validation Failed: Project ID must be a non-empty string.";
      recordSyncLog({ recordType: 'project', recordId: proj.id || 'unknown', status: 'validation_failed', errorMessage: msg });
      throw new Error(msg);
    }
    if (!proj.name || typeof proj.name !== 'string' || proj.name.trim() === '') {
      const msg = "Client Validation Failed: Project Name is required.";
      recordSyncLog({ recordType: 'project', recordId: proj.id, status: 'validation_failed', errorMessage: msg });
      throw new Error(msg);
    }
    if (!proj.client || typeof proj.client !== 'string' || proj.client.trim() === '') {
      const msg = "Client Validation Failed: Client Name is required.";
      recordSyncLog({ recordType: 'project', recordId: proj.id, status: 'validation_failed', errorMessage: msg });
      throw new Error(msg);
    }

    try {
      const response = await fetch('/api/projects/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(proj)
      });

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const resJson = await response.json().catch(() => null);
        if (resJson && resJson.success) {
          // Clean from offline queue if present
          try {
            const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
            const queue: Project[] = JSON.parse(queueStr);
            const filtered = queue.filter(p => p.id !== proj.id);
            localStorage.setItem('era_offline_sync_queue', JSON.stringify(filtered));
          } catch {}
          console.log('Project successfully synchronized with backend REST API.');
          recordSyncLog({
            recordType: 'project',
            recordId: proj.id,
            status: 'synced',
            details: `Synchronized "${proj.name}" with backend database`
          });
        }
      }
    } catch (e) {
      // Optional REST backend offline or not deployed
    }
  })();

  try {
    await sqlSyncPromise;
  } catch (error: any) {
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      if (!queue.some(p => p.id === proj.id)) {
        queue.push(proj);
        localStorage.setItem('era_offline_sync_queue', JSON.stringify(queue));
        recordSyncLog({
          recordType: 'project',
          recordId: proj.id,
          status: 'offline_queued',
          details: `Queued project "${proj.name || proj.id}" for offline sync`
        });
      }
    } catch (e) {}
  }
}

/**
 * Deletes a project from standalone Express backend and Firestore.
 * Universally tombstones the project so all connected users and devices remove it in real time.
 */
export async function safeDeleteProject(id: string, projectName?: string, deletedBy?: string): Promise<void> {
  if (!id) return;

  // 1. Store deleted ID locally so real-time listeners and sync daemons don't resurrect it
  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
    }

    // Clean from offline sync queue
    const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
    const queue: Project[] = JSON.parse(queueStr);
    const filteredQueue = queue.filter(p => p.id !== id);
    localStorage.setItem('era_offline_sync_queue', JSON.stringify(filteredQueue));

    // Clean from local cached projects
    const projStr = localStorage.getItem('era_proj_v28');
    if (projStr) {
      const projs: Project[] = JSON.parse(projStr);
      if (Array.isArray(projs)) {
        const filteredProjs = projs.filter(p => p.id !== id);
        localStorage.setItem('era_proj_v28', JSON.stringify(filteredProjs));
      }
    }

    // Clear active selection if viewing this deleted project
    if (localStorage.getItem('era_current_project_id') === id) {
      localStorage.removeItem('era_current_project_id');
    }
  } catch (err) {
    console.warn('Failed to track deleted project ID locally:', err);
  }

  // 2. Broadcast multi-tab and local window events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
    window.dispatchEvent(new CustomEvent('project_globally_deleted', { detail: { id, projectName } }));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('era_broadcast_channel');
        bc.postMessage({ type: 'PROJECT_DELETED', id, projectName, timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  }

  recordSyncLog({
    recordType: 'project',
    recordId: id,
    status: 'deleted',
    details: `Permanently deleted project "${projectName || id}" from system`
  });

  const syncPromises: Promise<any>[] = [];

  // 3. Firestore Tombstone & Permanent Document Deletion
  if (!isSyncSuspended()) {
    // Record in deleted_projects tombstone collection for universal multi-user synchronization
    syncPromises.push(
      setDoc(doc(db, 'deleted_projects', id), {
        id,
        projectName: projectName || '',
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || 'Administrator'
      }, { merge: true }).catch(err => {
        handleFsError(err);
        console.warn('Firestore write deleted_project tombstone notice:', err);
      })
    );

    // Delete project document from projects collection
    syncPromises.push(
      deleteDoc(doc(db, 'projects', id)).catch(fsErr => {
        handleFsError(fsErr);
        console.warn('Firestore delete project notice:', fsErr);
      })
    );

    // Clean up any pending variance approval documents tied to this deleted project
    syncPromises.push(
      getDocs(collection(db, 'approvals')).then(snap => {
        if (!snap.empty) {
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data && data.projectId === id) {
              deleteDoc(doc(db, 'approvals', docSnap.id)).catch(() => {});
            }
          });
        }
      }).catch(() => {})
    );
  }

  // 4. Delete from relational REST API backend if active
  syncPromises.push(
    fetch(`/api/projects/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          console.log('Project deleted from backend DB:', id);
        }
      })
      .catch(() => {})
  );

  await Promise.allSettled(syncPromises);
}

/**
 * Fetches all synchronized projects from standalone Express backend or Firestore.
 */
export async function safeFetchProjects(): Promise<Project[] | null> {
  // Always fetch latest deleted project IDs first to guarantee zero resurrection
  const deletedIds = await safeFetchDeletedProjectIds();
  const deletedSet = new Set(deletedIds);

  let fetched: Project[] | null = null;
  try {
    const response = await fetch('/api/projects/sync', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched projects from backend REST API');
        fetched = json.data
          .filter((p: any) => p && p.id && !deletedSet.has(p.id))
          .map((p: any) => normalizeProject(p));
      }
    }
  } catch (err: any) {
    // Optional backend REST disabled/not present
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'projects')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      const fsProjects: Project[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as Project;
        if (data && data.id && !deletedSet.has(data.id)) {
          fsProjects.push(normalizeProject(data));
        }
      });
      if (fsProjects.length > 0) {
        if (!fetched) {
          fetched = fsProjects;
        } else {
          // Merge Firestore projects into fetched projects
          const map = new Map<string, Project>();
          fetched.forEach(p => {
            if (!deletedSet.has(p.id)) map.set(p.id, p);
          });
          fsProjects.forEach(p => {
            if (deletedSet.has(p.id)) return;
            const existing = map.get(p.id);
            if (!existing) {
              map.set(p.id, p);
            } else {
              const existingTime = existing.lastModifiedAt ? new Date(existing.lastModifiedAt).getTime() : 0;
              const fsTime = p.lastModifiedAt ? new Date(p.lastModifiedAt).getTime() : 0;
              if (fsTime >= existingTime) {
                map.set(p.id, { ...existing, ...p });
              }
            }
          });
          fetched = Array.from(map.values()).filter(p => !deletedSet.has(p.id));
        }
      }
    }
  } catch (e) {
    console.warn('Firestore fetch projects notice:', e);
  }

  return fetched ? fetched.filter(p => !deletedSet.has(p.id)) : null;
}

export async function safeSaveSingleUser(user: AppUser): Promise<void> {
  if (!user || !user.username) return;
  if (!isSyncSuspended()) {
    try {
      const userDocRef = doc(db, 'users', user.username.toLowerCase());
      await setDoc(userDocRef, { ...user, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => handleFsError(err));
      recordSyncLog({
        recordType: 'user',
        recordId: user.username,
        status: 'firestore_synced',
        details: `Synchronized user account "${user.username}"`
      });
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore single user sync notice:', e);
      recordSyncLog({
        recordType: 'user',
        recordId: user.username,
        status: 'server_error',
        errorMessage: e instanceof Error ? e.message : String(e)
      });
    }
  }
}

export async function safeDeleteUser(username: string): Promise<void> {
  if (!username) return;
  if (!isSyncSuspended()) {
    try {
      const userDocRef = doc(db, 'users', username.toLowerCase());
      await deleteDoc(userDocRef).catch(err => handleFsError(err));
      recordSyncLog({
        recordType: 'user',
        recordId: username,
        status: 'deleted',
        details: `Deleted user "${username}"`
      });
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore delete user notice:', e);
    }
  }
}

/**
 * Synchronizes all registered users with backend REST API and Firebase Firestore.
 */
export async function safeSyncUsers(users: AppUser[]): Promise<void> {
  // Sync to Firestore if authenticated user or client present
  if (!isSyncSuspended()) {
    try {
      for (const u of users) {
        if (u && u.username) {
          const userDocRef = doc(db, 'users', u.username.toLowerCase());
          await setDoc(userDocRef, { ...u, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => handleFsError(err));
        }
      }
      recordSyncLog({
        recordType: 'user',
        recordId: `${users.length} users`,
        status: 'firestore_synced',
        details: `Synchronized ${users.length} user accounts to Cloud Firestore`
      });
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore user sync notice:', e);
      recordSyncLog({
        recordType: 'user',
        recordId: `${users.length} users`,
        status: 'server_error',
        errorMessage: e instanceof Error ? e.message : String(e)
      });
    }
  }

  try {
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(users)
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log('Users successfully synchronized with backend REST API');
      recordSyncLog({
        recordType: 'user',
        recordId: `${users.length} users`,
        status: 'synced',
        details: `Synchronized ${users.length} users with backend database`
      });
    }
  } catch (err: any) {}
}

/**
 * Fetches synchronized users list from backend REST API or Firestore fallback.
 */
export async function safeFetchUsers(): Promise<AppUser[] | null> {
  let fetched: AppUser[] | null = null;
  try {
    const response = await fetch('/api/users/sync', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched users from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {}

  try {
    const querySnapshot = await getDocs(collection(db, 'users')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      const fsUsers: AppUser[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as AppUser;
        if (data && data.username) fsUsers.push(data);
      });
      if (fsUsers.length > 0) {
        if (!fetched) {
          fetched = fsUsers;
        } else {
          // Merge Firestore users into fetched users
          const map = new Map<string, AppUser>();
          fetched.forEach(u => map.set(u.username.toLowerCase(), u));
          fsUsers.forEach(u => {
            const existing = map.get(u.username.toLowerCase());
            map.set(u.username.toLowerCase(), existing ? { ...existing, ...u } : u);
          });
          fetched = Array.from(map.values());
        }
      }
    }
  } catch (e) {
    console.warn('Firestore fetch users notice:', e);
  }

  return fetched;
}

/**
 * Synchronizes all variance approvals with backend REST API and Firestore.
 */
export async function safeSyncApprovals(approvals: ApprovalRequest[]): Promise<void> {
  if (!isSyncSuspended()) {
    try {
      for (const a of approvals) {
        if (a && a.id) {
          await setDoc(doc(db, 'approvals', a.id), { ...a, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => handleFsError(err));
        }
      }
      recordSyncLog({
        recordType: 'approval',
        recordId: `${approvals.length} requests`,
        status: 'firestore_synced',
        details: `Synchronized ${approvals.length} approval records to Cloud Firestore`
      });
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore approvals sync notice:', e);
      recordSyncLog({
        recordType: 'approval',
        status: 'server_error',
        errorMessage: e instanceof Error ? e.message : String(e)
      });
    }
  }

  try {
    const response = await fetch('/api/approvals/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(approvals)
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log('Approvals successfully synchronized with backend REST API');
      recordSyncLog({
        recordType: 'approval',
        recordId: `${approvals.length} requests`,
        status: 'synced',
        details: `Synchronized ${approvals.length} approvals with backend database`
      });
    }
  } catch (err: any) {}
}

/**
 * Fetches synchronized approvals list from backend REST API or Firestore.
 */
export async function safeFetchApprovals(): Promise<ApprovalRequest[] | null> {
  let fetched: ApprovalRequest[] | null = null;
  try {
    const response = await fetch('/api/approvals/sync', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched approvals from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {}

  try {
    const querySnapshot = await getDocs(collection(db, 'approvals')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      const fsApprovals: ApprovalRequest[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as ApprovalRequest;
        if (data && data.id) fsApprovals.push(data);
      });
      if (fsApprovals.length > 0) {
        if (!fetched) {
          fetched = fsApprovals;
        } else {
          const map = new Map<string, ApprovalRequest>();
          fetched.forEach(a => map.set(a.id, a));
          fsApprovals.forEach(a => map.set(a.id, a));
          fetched = Array.from(map.values());
        }
      }
    }
  } catch (e) {
    console.warn('Firestore fetch approvals notice:', e);
  }

  return fetched;
}

/**
 * Synchronizes PMO and Directorate taxonomy with backend REST API and Firestore.
 */
export async function safeSyncConfig(pmos: string[], directorates: string[]): Promise<void> {
  if (!isSyncSuspended()) {
    try {
      await setDoc(doc(db, 'config', 'taxonomy'), { pmos, directorates, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => handleFsError(err));
      recordSyncLog({
        recordType: 'config',
        status: 'firestore_synced',
        details: `Updated PMO taxonomy (${pmos.length}) & Directorate taxonomy (${directorates.length})`
      });
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore config sync notice:', e);
      recordSyncLog({
        recordType: 'config',
        status: 'server_error',
        errorMessage: e instanceof Error ? e.message : String(e)
      });
    }
  }

  try {
    const response = await fetch('/api/config/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ pmos, directorates })
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      console.log('Config successfully synchronized with backend REST API');
      recordSyncLog({
        recordType: 'config',
        status: 'synced',
        details: `Config taxonomy synchronized with backend database`
      });
    }
  } catch (err: any) {}
}

/**
 * Fetches synchronized PMO and Directorate configuration from backend REST API or Firestore.
 */
export async function safeFetchConfig(): Promise<{ pmos: string[], directorates: string[] } | null> {
  let fetched: { pmos: string[], directorates: string[] } | null = null;
  try {
    const response = await fetch('/api/config/sync', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if (json && json.success && json.data) {
        console.log('Successfully fetched config from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {}

  try {
    const querySnapshot = await getDocs(collection(db, 'config')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      querySnapshot.forEach(docSnap => {
        if (docSnap.id === 'taxonomy') {
          const data = docSnap.data();
          if (data && (Array.isArray(data.pmos) || Array.isArray(data.directorates))) {
            fetched = {
              pmos: data.pmos || fetched?.pmos || [],
              directorates: data.directorates || fetched?.directorates || []
            };
          }
        }
      });
    }
  } catch (e) {
    console.warn('Firestore fetch config notice:', e);
  }

  return fetched;
}


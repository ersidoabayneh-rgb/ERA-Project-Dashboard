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
    history: Array.isArray(p.history) ? p.history : tmpl.history,
    annual: Array.isArray(p.annual) ? p.annual : tmpl.annual,
    images: Array.isArray(p.images) ? p.images : tmpl.images,
  };
}

/**
 * Robust, self-healing project sync function that handles Firebase Cloud Firestore & REST Backend Sync.
 */
export async function safeSyncProject(proj: Project, isBackgroundQueueSync = false): Promise<void> {
  if (!proj.lastModifiedAt) {
    proj.lastModifiedAt = new Date().toISOString();
  }

  // Clear from deleted IDs set if re-created or updated
  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (deletedIds.includes(proj.id)) {
      const filtered = deletedIds.filter(id => id !== proj.id);
      localStorage.setItem('era_deleted_project_ids', JSON.stringify(filtered));
    }
  } catch {}

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
    } catch (fsErr) {
      handleFsError(fsErr);
    }
  }

  // Relational Database Sync: optional Express REST API (/api/projects/sync)
  const sqlSyncPromise = (async () => {
    if (!proj.id || typeof proj.id !== 'string') {
      throw new Error("Client Validation Failed: Project ID must be a non-empty string.");
    }
    if (!proj.name || typeof proj.name !== 'string' || proj.name.trim() === '') {
      throw new Error("Client Validation Failed: Project Name is required.");
    }
    if (!proj.client || typeof proj.client !== 'string' || proj.client.trim() === '') {
      throw new Error("Client Validation Failed: Client Name is required.");
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
      }
    } catch (e) {}
  }
}

/**
 * Deletes a project from standalone Express backend and Firestore.
 */
export async function safeDeleteProject(id: string): Promise<void> {
  // Store deleted ID locally so real-time listeners don't resurrect it
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
  } catch (err) {
    console.warn('Failed to track deleted project ID locally:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
  }

  const syncPromises: Promise<any>[] = [];

  // Delete from Firestore
  if (!isSyncSuspended()) {
    syncPromises.push(
      deleteDoc(doc(db, 'projects', id)).catch(fsErr => {
        handleFsError(fsErr);
        console.warn('Firestore delete project notice:', fsErr);
      })
    );
  }

  // Delete from relational REST API backend if active
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
  let fetched: Project[] | null = null;
  try {
    const response = await fetch('/api/projects/sync', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched projects from backend REST API');
        fetched = json.data.map((p: any) => normalizeProject(p));
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
        if (data && data.id) fsProjects.push(normalizeProject(data));
      });
      if (fsProjects.length > 0) {
        if (!fetched) {
          fetched = fsProjects;
        } else {
          // Merge Firestore projects into fetched projects
          const map = new Map<string, Project>();
          fetched.forEach(p => map.set(p.id, p));
          fsProjects.forEach(p => {
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
          fetched = Array.from(map.values());
        }
      }
    }
  } catch (e) {
    console.warn('Firestore fetch projects notice:', e);
  }

  return fetched;
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
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore user sync notice:', e);
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
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore approvals sync notice:', e);
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
    } catch (e) {
      handleFsError(e);
      console.warn('Firestore config sync notice:', e);
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


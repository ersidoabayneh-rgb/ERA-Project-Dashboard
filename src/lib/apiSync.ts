import { Project, User as AppUser, ApprovalRequest } from '../types';
import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let syncSuspendedState = false;

export function isSyncSuspended(): boolean {
  return syncSuspendedState;
}

export async function reactivateSync(): Promise<void> {
  syncSuspendedState = false;
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

  // Emit event for Drive Auto-Sync to pick up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('local_project_mutated'));
  }

  // Firestore Sync
  try {
    await setDoc(doc(db, 'projects', proj.id), {
      id: proj.id,
      name: proj.name || '',
      client: proj.client || '',
      consultant: proj.consultant || '',
      contractor: proj.contractor || '',
      signDate: proj.signDate || '',
      startDate: proj.startDate || '',
      origDays: String(proj.origDays || 0),
      eotDays: String(proj.eotDays || 0),
      variation: String(proj.variation || 0),
      origAmount: String(proj.origAmount || 0),
      lengthKm: String(proj.lengthKm || 0),
      classification: proj.classification || '',
      contractType: proj.contractType || '',
      programDirectorate: proj.programDirectorate || '',
      pmo: proj.pmo || '',
      physicalProgress: String(proj.physicalProgress || 0),
      provisionalSum: String(proj.provisionalSum || 0),
      lastModifiedAt: proj.lastModifiedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore project sync failed:', fsErr);
  }

  // Relational Database Sync: custom Express REST API (/api/projects/sync)
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

    const response = await fetch('/api/projects/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proj)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status} Server Error`);
    }

    // Clean from offline queue if present
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      const filtered = queue.filter(p => p.id !== proj.id);
      localStorage.setItem('era_offline_sync_queue', JSON.stringify(filtered));
    } catch {}

    console.log('Project successfully synchronized with backend REST API.');
  })();

  try {
    await sqlSyncPromise;
  } catch (error: any) {
    console.warn('Backend REST DB Sync failed/offline:', error.message || error);
    if (isBackgroundQueueSync) {
      throw error;
    }
    try {
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      if (!queue.some(p => p.id === proj.id)) {
        queue.push(proj);
        localStorage.setItem('era_offline_sync_queue', JSON.stringify(queue));
      }
    } catch (e) {
      console.error('Failed to write to offline sync queue:', e);
    }
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
  syncPromises.push(
    deleteDoc(doc(db, 'projects', id)).catch(fsErr => console.warn('Firestore delete project notice:', fsErr))
  );

  // Delete from relational REST API backend
  syncPromises.push(
    fetch(`/api/projects/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) console.log('Project deleted from backend DB:', id);
      })
      .catch(err => console.warn('Backend delete warning:', err))
  );

  syncPromises.push(
    fetch(`/api/projects/sync/${id}`, { method: 'DELETE' })
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
    const response = await fetch('/api/projects/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched projects from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend DB Fetch failed:', err?.message || err);
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'projects')).catch(() => null);
    if (querySnapshot && !querySnapshot.empty) {
      const fsProjects: Project[] = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as Project;
        if (data && data.id) fsProjects.push(data);
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
  try {
    for (const u of users) {
      if (u && u.username) {
        const userDocRef = doc(db, 'users', u.username.toLowerCase());
        await setDoc(userDocRef, { ...u, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Firestore user sync notice:', e);
  }

  try {
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
    if (response.ok) {
      console.log('Users successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend users sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized users list from backend REST API or Firestore fallback.
 */
export async function safeFetchUsers(): Promise<AppUser[] | null> {
  let fetched: AppUser[] | null = null;
  try {
    const response = await fetch('/api/users/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched users from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch users failed:', err?.message || err);
  }

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
  try {
    for (const a of approvals) {
      if (a && a.id) {
        await setDoc(doc(db, 'approvals', a.id), { ...a, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Firestore approvals sync notice:', e);
  }

  try {
    const response = await fetch('/api/approvals/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvals)
    });
    if (response.ok) {
      console.log('Approvals successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend approvals sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized approvals list from backend REST API or Firestore.
 */
export async function safeFetchApprovals(): Promise<ApprovalRequest[] | null> {
  let fetched: ApprovalRequest[] | null = null;
  try {
    const response = await fetch('/api/approvals/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        console.log('Successfully fetched approvals from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch approvals failed:', err?.message || err);
  }

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
  try {
    await setDoc(doc(db, 'config', 'taxonomy'), { pmos, directorates, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  } catch (e) {
    console.warn('Firestore config sync notice:', e);
  }

  try {
    const response = await fetch('/api/config/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pmos, directorates })
    });
    if (response.ok) {
      console.log('Config successfully synchronized with backend REST API');
    }
  } catch (err: any) {
    console.warn('Backend config sync failed:', err?.message || err);
  }
}

/**
 * Fetches synchronized PMO and Directorate configuration from backend REST API or Firestore.
 */
export async function safeFetchConfig(): Promise<{ pmos: string[], directorates: string[] } | null> {
  let fetched: { pmos: string[], directorates: string[] } | null = null;
  try {
    const response = await fetch('/api/config/sync');
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        console.log('Successfully fetched config from backend REST API');
        fetched = json.data;
      }
    }
  } catch (err: any) {
    console.warn('Backend fetch config failed:', err?.message || err);
  }

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


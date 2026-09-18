import fs from 'fs';
import path from 'path';
import { db } from './firebase.js';
import { defaultProjectTemplate } from '../data/defaultProject.js';

export interface DatabaseRecord {
  projects: Record<string, { id: string; name: string; data: any; last_modified_at: string; updated_at: string }>;
  deleted_projects: Record<string, { id: string; project_name: string; deleted_by: string; deleted_at: string }>;
  users: Record<string, { username: string; full_name: string; role: string; data: any; updated_at: string }>;
  approvals: Record<string, { id: string; project_id: string; section: string; status: string; data: any; updated_at: string }>;
  config: Record<string, { config_key: string; data: any; updated_at: string }>;
  version: number;
  last_updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'era_database.json');

// In-memory cache for fast multi-device access and fallback resilience
let dbState: DatabaseRecord = {
  projects: {},
  deleted_projects: {},
  users: {},
  approvals: {},
  config: {},
  version: 1,
  last_updated_at: new Date().toISOString()
};

let isInitialized = false;
let isSaving = false;
let pendingSave = false;

// Default admin users seed
const DEFAULT_USERS = [
  { username: 'ersidoabay', fullName: 'Ersido Abayneh', password: 'Helikina@#045536', role: 'admin', email: 'ErsidoAbayneh@gmail.com', accessibleProjects: [] },
  { username: 'user', fullName: 'Standard Project Engineer', password: 'user123', role: 'editor', email: 'engineer@era.gov.et', accessibleProjects: [] },
  { username: 'viewer', fullName: 'Executive Guest Viewer', password: 'view123', role: 'viewer', email: 'director@era.gov.et', accessibleProjects: [] },
  { username: 'approver', fullName: 'Quality & IPC Approver', password: '12345', role: 'approver', email: 'approvals@era.gov.et', accessibleProjects: [] }
];

/**
 * Initialize persistent database storage on the server.
 * Loads local disk cache and checks Firestore connectivity.
 */
export async function initServerDatabase(): Promise<void> {
  if (isInitialized) return;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          dbState = {
            projects: parsed.projects || {},
            deleted_projects: parsed.deleted_projects || {},
            users: parsed.users || {},
            approvals: parsed.approvals || {},
            config: parsed.config || {},
            version: parsed.version || 1,
            last_updated_at: parsed.last_updated_at || new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('⚠️ [Server DB] Failed to parse existing db file, creating fresh store:', err);
      }
    }

    // Seed default users if empty
    if (Object.keys(dbState.users).length === 0) {
      for (const u of DEFAULT_USERS) {
        dbState.users[u.username.toLowerCase()] = {
          username: u.username,
          full_name: u.fullName || u.username,
          role: u.role,
          data: u,
          updated_at: new Date().toISOString()
        };
      }
      persistDbSync();
    }

    // Seed default project if empty so all connected devices share the exact same authoritative data
    if (Object.keys(dbState.projects).length === 0) {
      try {
        const dp = defaultProjectTemplate();
        if (dp && dp.id) {
          dbState.projects[dp.id] = {
            id: dp.id,
            name: dp.name || 'Default Road Project',
            data: dp,
            last_modified_at: dp.lastModifiedAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          persistDbSync();
          console.log('✅ [Server DB] Seeded canonical default project template into server database');
        }
      } catch (err) {
        console.warn('⚠️ [Server DB] Failed to seed default project template:', err);
      }
    }

    // Seed default taxonomy / config if empty
    if (Object.keys(dbState.config).length === 0) {
      try {
        const defaultPmos = [
          'Central Region Directorate PMO',
          'Northern Region Directorate PMO',
          'Western Region Directorate PMO',
          'Southern Region Directorate PMO',
          'Eastern Region Directorate PMO',
          'Expressway & Special Projects PMO'
        ];
        const defaultDirectorates = [
          'Road Development Directorate',
          'Road Maintenance & Asset Management Directorate',
          'Planning & Program Management Directorate',
          'Procurement & Contract Administration Directorate',
          'Engineering Services & Quality Assurance Directorate'
        ];
        dbState.config['taxonomy'] = {
          config_key: 'taxonomy',
          data: { pmos: defaultPmos, directorates: defaultDirectorates },
          updated_at: new Date().toISOString()
        };
        persistDbSync();
      } catch (err) {}
    }

    // Try synchronizing with Firebase Firestore if online
    if (db) {
      try {
        console.log('🔄 [Server DB] Synchronizing local cache with Firestore cloud storage...');
        
        // 1. Sync config
        const configCol = db.collection('config');
        const configSnap = await configCol.get();
        if (!configSnap.empty) {
          configSnap.forEach((doc: any) => {
            const val = doc.data();
            if (val && val.config_key) {
              dbState.config[val.config_key] = {
                config_key: val.config_key,
                data: val.data,
                updated_at: val.updated_at || new Date().toISOString()
              };
            }
          });
        } else {
          // Push local config to Cloud
          for (const [key, record] of Object.entries(dbState.config)) {
            await configCol.doc(key).set(record);
          }
        }

        // 2. Sync users
        const usersCol = db.collection('users');
        const usersSnap = await usersCol.get();
        if (!usersSnap.empty) {
          usersSnap.forEach((doc: any) => {
            const val = doc.data();
            if (val && val.username) {
              dbState.users[val.username.toLowerCase()] = {
                username: val.username,
                full_name: val.full_name || val.fullName || val.username,
                role: val.role || 'viewer',
                data: val.data || val,
                updated_at: val.updated_at || new Date().toISOString()
              };
            }
          });
        } else {
          // Push local users to Cloud
          for (const [key, record] of Object.entries(dbState.users)) {
            await usersCol.doc(key).set(record);
          }
        }

        // 3. Sync projects
        const projectsCol = db.collection('projects');
        const projectsSnap = await projectsCol.get();
        if (!projectsSnap.empty) {
          projectsSnap.forEach((doc: any) => {
            const val = doc.data();
            if (val && val.id) {
              dbState.projects[val.id] = {
                id: val.id,
                name: val.name || 'Untitled',
                data: val.data || val,
                last_modified_at: val.last_modified_at || new Date().toISOString(),
                updated_at: val.updated_at || new Date().toISOString()
              };
            }
          });
        } else {
          // Push local projects to Cloud
          for (const [key, record] of Object.entries(dbState.projects)) {
            await projectsCol.doc(key).set(record);
          }
        }

        // 4. Sync approvals
        const approvalsCol = db.collection('approvals');
        const approvalsSnap = await approvalsCol.get();
        if (!approvalsSnap.empty) {
          approvalsSnap.forEach((doc: any) => {
            const val = doc.data();
            if (val && val.id) {
              dbState.approvals[val.id] = {
                id: val.id,
                project_id: val.project_id || '',
                section: val.section || '',
                status: val.status || 'pending',
                data: val.data || val,
                updated_at: val.updated_at || new Date().toISOString()
              };
            }
          });
        } else {
          // Push local approvals to Cloud
          for (const [key, record] of Object.entries(dbState.approvals)) {
            await approvalsCol.doc(key).set(record);
          }
        }

        persistDbSync();
        console.log('✅ [Server DB] Sync completed successfully with Firestore cloud collections.');
      } catch (err: any) {
        console.warn('⚠️ [Server DB] Could not sync with Firestore at startup (falling back to local DB):', err?.message || err);
      }
    }

    isInitialized = true;
    console.log(`✅ [Server Database] Persistent database initialized with ${Object.keys(dbState.projects).length} projects, ${Object.keys(dbState.users).length} users, ${Object.keys(dbState.deleted_projects).length} deleted records.`);
  } catch (err) {
    console.error('❌ [Server Database Init Error]:', err);
    isInitialized = true;
  }
}

/**
 * Persist database state to disk atomically
 */
function persistDbSync(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    dbState.last_updated_at = new Date().toISOString();
    dbState.version += 1;
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('❌ [Server DB Write Error]:', err);
  }
}

export function persistDbAsync(): void {
  if (isSaving) {
    pendingSave = true;
    return;
  }
  isSaving = true;
  setImmediate(() => {
    try {
      persistDbSync();
    } finally {
      isSaving = false;
      if (pendingSave) {
        pendingSave = false;
        persistDbAsync();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function serverGetProjects(): Promise<{ projects: any[]; deletedIds: string[] }> {
  await initServerDatabase();
  const deletedIds = Object.keys(dbState.deleted_projects);
  const deletedSet = new Set(deletedIds);

  const projects: any[] = [];
  for (const [id, record] of Object.entries(dbState.projects)) {
    if (!deletedSet.has(id) && record?.data) {
      projects.push(record.data);
    }
  }

  // Sync projects from firestore in the background
  tryAsyncSyncFirestoreProjects().catch(() => {});

  return { projects, deletedIds };
}

export async function serverSaveProject(project: any): Promise<{ success: boolean; id: string }> {
  await initServerDatabase();
  if (!project || !project.id) {
    throw new Error('Invalid project payload: missing ID');
  }

  // Check if project was marked as permanently deleted
  if (dbState.deleted_projects[project.id]) {
    throw new Error('Project has been permanently deleted and cannot be saved.');
  }

  const projName = project.name || 'Untitled Project';
  const lastMod = project.lastModifiedAt || new Date().toISOString();

  dbState.projects[project.id] = {
    id: project.id,
    name: projName,
    data: project,
    last_modified_at: lastMod,
    updated_at: new Date().toISOString()
  };

  persistDbAsync();

  // Async push to Cloud Firestore
  tryAsyncPushFirestoreProject(project).catch(() => {});

  return { success: true, id: project.id };
}

export async function serverDeleteProject(id: string, projectName?: string, deletedBy?: string): Promise<{ success: boolean; id: string }> {
  await initServerDatabase();
  if (!id) throw new Error('Project ID required for deletion');

  const deletedAt = new Date().toISOString();
  dbState.deleted_projects[id] = {
    id,
    project_name: projectName || id,
    deleted_by: deletedBy || 'system',
    deleted_at: deletedAt
  };

  // Remove from active projects
  delete dbState.projects[id];

  persistDbAsync();

  // Async push to Firestore
  tryAsyncPushFirestoreDelete(id, projectName, deletedBy).catch(() => {});

  return { success: true, id };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function serverGetUsers(): Promise<any[]> {
  await initServerDatabase();
  return Object.values(dbState.users).map(u => u.data).filter(Boolean);
}

export async function serverSaveUsers(users: any[]): Promise<void> {
  await initServerDatabase();
  for (const u of users) {
    if (!u || !u.username) continue;
    const key = u.username.toLowerCase();
    dbState.users[key] = {
      username: u.username,
      full_name: u.fullName || u.username,
      role: u.role || 'user',
      data: u,
      updated_at: new Date().toISOString()
    };
  }
  persistDbAsync();
  tryAsyncPushFirestoreUsers(users).catch(() => {});
}

export async function serverDeleteUser(username: string): Promise<void> {
  await initServerDatabase();
  if (!username) return;
  const key = username.toLowerCase();
  delete dbState.users[key];
  persistDbAsync();
  tryAsyncPushFirestoreDeleteUser(username).catch(() => {});
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function serverGetApprovals(): Promise<any[]> {
  await initServerDatabase();
  return Object.values(dbState.approvals).map(a => a.data).filter(Boolean);
}

export async function serverSaveApprovals(approvals: any[]): Promise<void> {
  await initServerDatabase();
  for (const a of approvals) {
    if (!a || !a.id) continue;
    dbState.approvals[a.id] = {
      id: a.id,
      project_id: a.projectId || '',
      section: a.section || '',
      status: a.status || '',
      data: a,
      updated_at: new Date().toISOString()
    };
  }
  persistDbAsync();
  tryAsyncPushFirestoreApprovals(approvals).catch(() => {});
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export async function serverGetConfig(): Promise<Record<string, any>> {
  await initServerDatabase();
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(dbState.config)) {
    result[k] = v.data;
  }
  return result;
}

export async function serverSaveConfig(key: string, data: any): Promise<void> {
  await initServerDatabase();
  if (!key) return;
  dbState.config[key] = {
    config_key: key,
    data,
    updated_at: new Date().toISOString()
  };
  persistDbAsync();
  tryAsyncPushFirestoreConfig(key, data).catch(() => {});
}

// ---------------------------------------------------------------------------
// Database Health & Sync Status
// ---------------------------------------------------------------------------

export function serverGetDbStats(): {
  projectCount: number;
  deletedCount: number;
  userCount: number;
  approvalCount: number;
  configCount: number;
  version: number;
  lastUpdatedAt: string;
} {
  return {
    projectCount: Object.keys(dbState.projects).length,
    deletedCount: Object.keys(dbState.deleted_projects).length,
    userCount: Object.keys(dbState.users).length,
    approvalCount: Object.keys(dbState.approvals).length,
    configCount: Object.keys(dbState.config).length,
    version: dbState.version,
    lastUpdatedAt: dbState.last_updated_at
  };
}

// ---------------------------------------------------------------------------
// Async Firestore Operations
// ---------------------------------------------------------------------------

async function tryAsyncSyncFirestoreProjects(): Promise<void> {
  if (!db) return;
  try {
    const projSnap = await db.collection('projects').get();
    if (!projSnap.empty) {
      let hasChanges = false;
      projSnap.forEach((doc: any) => {
        const val = doc.data();
        if (val && val.id) {
          if (!dbState.projects[val.id] && !dbState.deleted_projects[val.id]) {
            dbState.projects[val.id] = {
              id: val.id,
              name: val.name || 'Untitled',
              data: val.data || val,
              last_modified_at: val.last_modified_at || new Date().toISOString(),
              updated_at: val.updated_at || new Date().toISOString()
            };
            hasChanges = true;
          }
        }
      });
      if (hasChanges) persistDbAsync();
    }
  } catch {}
}

async function tryAsyncPushFirestoreProject(project: any): Promise<void> {
  if (!db) return;
  try {
    const docData = {
      id: project.id,
      name: project.name || 'Untitled Project',
      data: project,
      last_modified_at: project.lastModifiedAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.collection('projects').doc(project.id).set(docData);
  } catch {}
}

async function tryAsyncPushFirestoreDelete(id: string, projectName?: string, deletedBy?: string): Promise<void> {
  if (!db) return;
  try {
    await db.collection('projects').doc(id).delete();
    await db.collection('deleted_projects').doc(id).set({
      id,
      project_name: projectName || id,
      deleted_by: deletedBy || 'system',
      deleted_at: new Date().toISOString()
    });
  } catch {}
}

async function tryAsyncPushFirestoreUsers(users: any[]): Promise<void> {
  if (!db) return;
  try {
    for (const u of users) {
      if (!u || !u.username) continue;
      const key = u.username.toLowerCase();
      await db.collection('users').doc(key).set({
        username: u.username,
        full_name: u.fullName || u.username,
        role: u.role || 'viewer',
        data: u,
        updated_at: new Date().toISOString()
      });
    }
  } catch {}
}

async function tryAsyncPushFirestoreDeleteUser(username: string): Promise<void> {
  if (!db) return;
  try {
    await db.collection('users').doc(username.toLowerCase()).delete();
  } catch {}
}

async function tryAsyncPushFirestoreApprovals(approvals: any[]): Promise<void> {
  if (!db) return;
  try {
    for (const a of approvals) {
      if (!a || !a.id) continue;
      await db.collection('approvals').doc(a.id).set({
        id: a.id,
        project_id: a.projectId || '',
        section: a.section || '',
        status: a.status || 'pending',
        data: a,
        updated_at: new Date().toISOString()
      });
    }
  } catch {}
}

async function tryAsyncPushFirestoreConfig(key: string, data: any): Promise<void> {
  if (!db) return;
  try {
    await db.collection('config').doc(key).set({
      config_key: key,
      data,
      updated_at: new Date().toISOString()
    });
  } catch {}
}

export async function serverSyncAllWithFirestore(): Promise<{
  success: boolean;
  pushedProjects: number;
  pulledProjects: number;
  pushedUsers: number;
  pulledUsers: number;
  message: string;
}> {
  await initServerDatabase();
  if (!db) {
    throw new Error('Firestore database is not available.');
  }

  let pushedProjects = 0;
  let pulledProjects = 0;
  let pushedUsers = 0;
  let pulledUsers = 0;

  // 1. Sync config
  const configCol = db.collection('config');
  for (const record of Object.values(dbState.config)) {
    await configCol.doc(record.config_key).set(record);
  }

  // 2. Sync users
  const usersCol = db.collection('users');
  for (const record of Object.values(dbState.users)) {
    await usersCol.doc(record.username.toLowerCase()).set(record);
    pushedUsers++;
  }

  const usersSnap = await usersCol.get();
  usersSnap.forEach((doc: any) => {
    const val = doc.data();
    if (val && val.username) {
      const key = val.username.toLowerCase();
      if (!dbState.users[key]) {
        dbState.users[key] = {
          username: val.username,
          full_name: val.full_name || val.username,
          role: val.role || 'viewer',
          data: val.data || val,
          updated_at: val.updated_at || new Date().toISOString()
        };
        pulledUsers++;
      }
    }
  });

  // 3. Sync projects
  const projCol = db.collection('projects');
  for (const record of Object.values(dbState.projects)) {
    await projCol.doc(record.id).set(record);
    pushedProjects++;
  }

  const projSnap = await projCol.get();
  projSnap.forEach((doc: any) => {
    const val = doc.data();
    if (val && val.id && !dbState.projects[val.id] && !dbState.deleted_projects[val.id]) {
      dbState.projects[val.id] = {
        id: val.id,
        name: val.name || 'Untitled',
        data: val.data || val,
        last_modified_at: val.last_modified_at || new Date().toISOString(),
        updated_at: val.updated_at || new Date().toISOString()
      };
      pulledProjects++;
    }
  });

  persistDbAsync();

  return {
    success: true,
    pushedProjects,
    pulledProjects,
    pushedUsers,
    pulledUsers,
    message: `Bi-directional Cloud sync complete: Pushed ${pushedProjects} projects & ${pushedUsers} users; Pulled ${pulledProjects} projects & ${pulledUsers} users.`
  };
}

import fs from 'fs';
import path from 'path';
import { getMySQLPool, initMySQLTables } from './mysql.js';

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
 * Loads local disk cache and checks MySQL connectivity on Ethio Telecom hosting.
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

    // Try initializing MySQL tables & loading existing MySQL data
    initMySQLTables().then(() => {
      tryAsyncSyncMySQLProjects().catch(() => {});
      tryAsyncSyncMySQLUsers().catch(() => {});
      tryAsyncSyncMySQLConfig().catch(() => {});
    }).catch(() => {});

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

  // Attempt async sync from MySQL if connected
  tryAsyncSyncMySQLProjects().catch(() => {});

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

  // Async push to traditional MySQL database
  tryAsyncPushMySQLProject(project).catch(() => {});

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

  // Async push to MySQL
  tryAsyncPushMySQLDelete(id, projectName, deletedBy).catch(() => {});

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
  tryAsyncPushMySQLUsers(users).catch(() => {});
}

export async function serverDeleteUser(username: string): Promise<void> {
  await initServerDatabase();
  if (!username) return;
  const key = username.toLowerCase();
  delete dbState.users[key];
  persistDbAsync();
  tryAsyncPushMySQLDeleteUser(username).catch(() => {});
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
  tryAsyncPushMySQLApprovals(approvals).catch(() => {});
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
  tryAsyncPushMySQLConfig(key, data).catch(() => {});
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
// Traditional MySQL Operations with Structured Column Storage
// ---------------------------------------------------------------------------

async function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
}

async function tryAsyncSyncMySQLProjects(): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    const [rows]: any = await withTimeout(pool.query('SELECT id, data FROM projects'), 2500);
    if (Array.isArray(rows) && rows.length > 0) {
      let hasChanges = false;
      for (const r of rows) {
        if (!r.id) continue;
        if (!dbState.projects[r.id] && !dbState.deleted_projects[r.id]) {
          const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          dbState.projects[r.id] = {
            id: r.id,
            name: parsed.name || r.id,
            data: parsed,
            last_modified_at: parsed.lastModifiedAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          hasChanges = true;
        }
      }
      if (hasChanges) persistDbAsync();
    }
  } catch {}
}

async function tryAsyncSyncMySQLUsers(): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    const [rows]: any = await withTimeout(pool.query('SELECT username, data FROM users'), 2500);
    if (Array.isArray(rows) && rows.length > 0) {
      let hasChanges = false;
      for (const r of rows) {
        if (!r.username) continue;
        const key = r.username.toLowerCase();
        if (!dbState.users[key]) {
          const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          dbState.users[key] = {
            username: r.username,
            full_name: parsed.fullName || r.username,
            role: parsed.role || 'viewer',
            data: parsed,
            updated_at: new Date().toISOString()
          };
          hasChanges = true;
        }
      }
      if (hasChanges) persistDbAsync();
    }
  } catch {}
}

async function tryAsyncSyncMySQLConfig(): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    const [rows]: any = await withTimeout(pool.query('SELECT config_key, data FROM config'), 2500);
    if (Array.isArray(rows) && rows.length > 0) {
      let hasChanges = false;
      for (const r of rows) {
        if (!r.config_key) continue;
        if (!dbState.config[r.config_key]) {
          const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          dbState.config[r.config_key] = {
            config_key: r.config_key,
            data: parsed,
            updated_at: new Date().toISOString()
          };
          hasChanges = true;
        }
      }
      if (hasChanges) persistDbAsync();
    }
  } catch {}
}

/**
 * Pushes project to MySQL with full structured columns for phpMyAdmin queryability
 */
async function tryAsyncPushMySQLProject(project: any): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;

    const projJson = JSON.stringify(project);
    const projName = project.name || 'Untitled Project';
    const directorate = project.programDirectorate || null;
    const pmo = project.pmo || null;
    const contractor = project.contractor || null;
    const consultant = project.consultant || null;
    const physProg = typeof project.physicalProgress === 'number' ? project.physicalProgress : 0.0;
    const finProg = typeof project.financialProgress === 'number' ? project.financialProgress : 0.0;
    const totalBudget = project.financial?.totalBudget || 0.0;
    const disbursed = project.financial?.disbursedAmount || 0.0;
    const status = project.status || 'Active';
    const lastSection = project.lastModifiedSection || 'General';
    const lastMod = project.lastModifiedAt || new Date().toISOString();

    await withTimeout(
      pool.query(
        `INSERT INTO projects (
          id, name, program_directorate, pmo, contractor, consultant,
          physical_progress, financial_progress, total_budget, disbursed_amount,
          status, last_modified_section, last_modified_at, data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          program_directorate = VALUES(program_directorate),
          pmo = VALUES(pmo),
          contractor = VALUES(contractor),
          consultant = VALUES(consultant),
          physical_progress = VALUES(physical_progress),
          financial_progress = VALUES(financial_progress),
          total_budget = VALUES(total_budget),
          disbursed_amount = VALUES(disbursed_amount),
          status = VALUES(status),
          last_modified_section = VALUES(last_modified_section),
          last_modified_at = VALUES(last_modified_at),
          data = VALUES(data)`,
        [
          project.id,
          projName,
          directorate,
          pmo,
          contractor,
          consultant,
          physProg,
          finProg,
          totalBudget,
          disbursed,
          status,
          lastSection,
          lastMod,
          projJson
        ]
      ),
      3000
    );

    // Audit log
    pool.query(
      `INSERT INTO sync_logs (record_type, record_id, action, author, details)
       VALUES ('project', ?, 'upsert', 'system', ?)`,
      [project.id, `Saved project ${projName}`]
    ).catch(() => {});
  } catch (err: any) {
    console.warn('[MySQL Project Push Notice]:', err?.message || err);
  }
}

async function tryAsyncPushMySQLDelete(id: string, projectName?: string, deletedBy?: string): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    const deletedAt = new Date().toISOString();
    await withTimeout(
      pool.query(
        `INSERT INTO deleted_projects (id, project_name, deleted_by, deleted_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE project_name = VALUES(project_name), deleted_by = VALUES(deleted_by), deleted_at = VALUES(deleted_at)`,
        [id, projectName || id, deletedBy || 'system', deletedAt]
      ),
      2500
    );
    await withTimeout(pool.query('DELETE FROM projects WHERE id = ?', [id]), 2500);

    pool.query(
      `INSERT INTO sync_logs (record_type, record_id, action, author, details)
       VALUES ('project', ?, 'delete', ?, ?)`,
      [id, deletedBy || 'system', `Deleted project ${projectName || id}`]
    ).catch(() => {});
  } catch {}
}

async function tryAsyncPushMySQLUsers(users: any[]): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    for (const u of users) {
      if (!u || !u.username) continue;
      const uJson = JSON.stringify(u);
      await withTimeout(
        pool.query(
          `INSERT INTO users (username, full_name, password, role, email, accessible_projects, data)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             full_name = VALUES(full_name),
             password = VALUES(password),
             role = VALUES(role),
             email = VALUES(email),
             accessible_projects = VALUES(accessible_projects),
             data = VALUES(data)`,
          [
            u.username,
            u.fullName || u.username,
            u.password || '',
            u.role || 'viewer',
            u.email || '',
            Array.isArray(u.accessibleProjects) ? u.accessibleProjects.join(',') : '*',
            uJson
          ]
        ),
        2500
      );
    }
  } catch {}
}

async function tryAsyncPushMySQLDeleteUser(username: string): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    await withTimeout(pool.query('DELETE FROM users WHERE username = ?', [username]), 2500);
  } catch {}
}

async function tryAsyncPushMySQLApprovals(approvals: any[]): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    for (const appr of approvals) {
      if (!appr || !appr.id) continue;
      const aJson = JSON.stringify(appr);
      await withTimeout(
        pool.query(
          `INSERT INTO approvals (id, project_id, section, status, requested_by, approved_by, data)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             project_id = VALUES(project_id),
             section = VALUES(section),
             status = VALUES(status),
             requested_by = VALUES(requested_by),
             approved_by = VALUES(approved_by),
             data = VALUES(data)`,
          [
            appr.id,
            appr.projectId || '',
            appr.section || '',
            appr.status || 'pending',
            appr.requestedBy || null,
            appr.approvedBy || null,
            aJson
          ]
        ),
        2500
      );
    }
  } catch {}
}

async function tryAsyncPushMySQLConfig(key: string, data: any): Promise<void> {
  try {
    const pool = getMySQLPool();
    if (!pool) return;
    const dJson = JSON.stringify(data);
    await withTimeout(
      pool.query(
        `INSERT INTO config (config_key, data)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [key, dJson]
      ),
      2500
    );
  } catch {}
}

/**
 * Executes a full bi-directional synchronization between local database
 * and traditional MySQL database.
 */
export async function serverSyncAllWithMySQL(): Promise<{
  success: boolean;
  pushedProjects: number;
  pulledProjects: number;
  pushedUsers: number;
  pulledUsers: number;
  message: string;
}> {
  await initServerDatabase();
  const pool = getMySQLPool();
  if (!pool) {
    throw new Error('MySQL connection pool is not available. Please verify your host and credentials.');
  }

  // 1. Verify connection
  const conn = await pool.getConnection();
  conn.release();

  let pushedProjects = 0;
  let pulledProjects = 0;
  let pushedUsers = 0;
  let pulledUsers = 0;

  // 2. Push all local projects to MySQL
  for (const record of Object.values(dbState.projects)) {
    if (record?.data) {
      await tryAsyncPushMySQLProject(record.data);
      pushedProjects++;
    }
  }

  // 3. Pull projects from MySQL
  const [rows]: any = await pool.query('SELECT id, data FROM projects');
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (r.id && !dbState.projects[r.id] && !dbState.deleted_projects[r.id]) {
        const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        dbState.projects[r.id] = {
          id: r.id,
          name: parsed.name || r.id,
          data: parsed,
          last_modified_at: parsed.lastModifiedAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        pulledProjects++;
      }
    }
  }

  // 4. Push users to MySQL
  const allUsers = Object.values(dbState.users).map(u => u.data).filter(Boolean);
  if (allUsers.length > 0) {
    await tryAsyncPushMySQLUsers(allUsers);
    pushedUsers = allUsers.length;
  }

  // 5. Pull users from MySQL
  const [userRows]: any = await pool.query('SELECT username, data FROM users');
  if (Array.isArray(userRows)) {
    for (const ur of userRows) {
      const key = ur.username?.toLowerCase();
      if (key && !dbState.users[key]) {
        const parsed = typeof ur.data === 'string' ? JSON.parse(ur.data) : ur.data;
        dbState.users[key] = {
          username: ur.username,
          full_name: parsed.fullName || ur.username,
          role: parsed.role || 'viewer',
          data: parsed,
          updated_at: new Date().toISOString()
        };
        pulledUsers++;
      }
    }
  }

  persistDbAsync();

  return {
    success: true,
    pushedProjects,
    pulledProjects,
    pushedUsers,
    pulledUsers,
    message: `Bi-directional synchronization complete: Pushed ${pushedProjects} projects & ${pushedUsers} users; Pulled ${pulledProjects} projects & ${pulledUsers} users.`
  };
}

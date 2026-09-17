import { Project, User as AppUser, ApprovalRequest, ContractorScoringWeights, ConsultantScoringWeights } from '../types';
import { defaultProjectTemplate, defaultZeroRowMetrics } from '../data/defaultProject';
import { safeDispatchCustomEvent } from './storage';
import { enqueueOfflineProject, removeOfflineQueueItem } from './offlineQueue';

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

// MySQL API HTTP Helper Functions
async function apiPost(endpoint: string, body: any): Promise<any> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function apiGet(endpoint: string): Promise<any> {
  try {
    const res = await fetch(endpoint);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function apiDelete(endpoint: string, body?: any): Promise<any> {
  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

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
      ipAddress: entry.ipAddress || '127.0.0.1 (MySQL Client)',
      errorMessage: entry.errorMessage,
      details: entry.details,
    };

    let currentLogs: SyncLogEntry[] = [];
    try {
      const stored = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
      if (stored) currentLogs = JSON.parse(stored);
    } catch {}

    currentLogs = [newLog, ...currentLogs].slice(0, 100);
    localStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(currentLogs));

    safeDispatchCustomEvent('sync_log_recorded', newLog);
  } catch {}
}

export function getLocalSyncLogs(): SyncLogEntry[] {
  try {
    const stored = localStorage.getItem(SYNC_LOGS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export async function safeFetchSyncLogs(): Promise<SyncLogEntry[]> {
  return getLocalSyncLogs();
}

export function clearSyncLogs(): void {
  try {
    localStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
    safeDispatchCustomEvent('sync_log_recorded');
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('MySQL/Storage Error: ', error);
}

export function isSyncSuspended(): boolean {
  return false;
}

export function isQuotaExhausted(): boolean {
  return false;
}

export async function reactivateSync(): Promise<void> {}

export function handleFsError(err: any): void {}

export function normalizeProject(p: any): Project {
  if (!p) return p;
  const tmpl = defaultProjectTemplate();
  let linkedConsultantFirm = '';
  const scFirm = p.supervisionConsultant?.firmName?.trim();
  const cFirm = p.consultant?.trim();
  if (scFirm && cFirm && scFirm !== cFirm) {
    const modSection = (p.lastModifiedSection || '').toLowerCase();
    if (modSection.includes('project information') || modSection.includes('dossier') || modSection.includes('stakeholder')) {
      linkedConsultantFirm = cFirm;
    } else {
      linkedConsultantFirm = scFirm;
    }
  } else {
    linkedConsultantFirm = scFirm || cFirm || tmpl.supervisionConsultant?.firmName || tmpl.consultant || '';
  }
  return {
    ...p,
    consultant: linkedConsultantFirm,
    origDays: typeof p.origDays === 'string' ? parseFloat(p.origDays) || 0 : (p.origDays || 0),
    eotDays: typeof p.eotDays === 'string' ? parseFloat(p.eotDays) || 0 : (p.eotDays || 0),
    variation: typeof p.variation === 'string' ? parseFloat(p.variation) || 0 : (p.variation || 0),
    origAmount: typeof p.origAmount === 'string' ? parseFloat(p.origAmount) || 0 : (p.origAmount || 0),
    lengthKm: typeof p.lengthKm === 'string' ? parseFloat(p.lengthKm) || 0 : (p.lengthKm || 0),
    provisionalSum: typeof p.provisionalSum === 'string' ? parseFloat(p.provisionalSum) || 0 : (p.provisionalSum || 0),
    physicalProgress: typeof p.physicalProgress === 'string' ? parseFloat(p.physicalProgress) || 0 : (p.physicalProgress || 0),
    rowMetrics: Array.isArray(p.rowMetrics) && p.rowMetrics.length > 0 
      ? p.rowMetrics 
      : (p.id === 'proj_default' ? tmpl.rowMetrics : defaultZeroRowMetrics()),
    quantities: Array.isArray(p.quantities) && p.quantities.length > 0 ? p.quantities : tmpl.quantities,
    series: Array.isArray(p.series) ? p.series : tmpl.series,
    monthly: Array.isArray(p.monthly) ? p.monthly : tmpl.monthly,
    payment: Array.isArray(p.payment) ? p.payment : tmpl.payment,
    bonds: Array.isArray(p.bonds) ? p.bonds : (p.id === 'proj_default' ? tmpl.bonds : []),
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
      firmName: linkedConsultantFirm,
      personnel: Array.isArray(p.supervisionConsultant.personnel) ? p.supervisionConsultant.personnel : (tmpl.supervisionConsultant?.personnel || []),
      invoices: Array.isArray(p.supervisionConsultant.invoices) ? p.supervisionConsultant.invoices : (tmpl.supervisionConsultant?.invoices || [])
    } : (tmpl.supervisionConsultant ? {
      ...tmpl.supervisionConsultant,
      firmName: linkedConsultantFirm
    } : undefined)
  };
}

export async function safeFetchDeletedProjectIds(): Promise<string[]> {
  const localSet = new Set<string>();
  try {
    const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const parsed: string[] = JSON.parse(delStr);
    if (Array.isArray(parsed)) {
      parsed.forEach(id => { if (id && typeof id === 'string') localSet.add(id); });
    }
  } catch {}

  return Array.from(localSet);
}

/**
 * Saves a project to MySQL database and updates local storage.
 */
export async function safeSyncProject(proj: Project, isBackgroundQueueSync = false, forceWrite = false): Promise<void> {
  if (!proj || !proj.id) return;

  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (deletedIds.includes(proj.id)) return;
  } catch {}

  if (!proj.lastModifiedAt) {
    proj.lastModifiedAt = new Date().toISOString();
  }

  const normalized = normalizeProject(proj);

  // 1. Update local storage repository
  try {
    const existingStr = localStorage.getItem('era_proj_v28') || '[]';
    let projectsList: Project[] = JSON.parse(existingStr);
    if (!Array.isArray(projectsList)) projectsList = [];

    const idx = projectsList.findIndex(p => p.id === normalized.id);
    if (idx >= 0) {
      projectsList[idx] = normalized;
    } else {
      projectsList.push(normalized);
    }
    localStorage.setItem('era_proj_v28', JSON.stringify(projectsList));
  } catch (e) {
    console.warn('Failed to save project to local storage:', e);
  }

  // 2. Sync to MySQL database via Express API
  const apiRes = await apiPost('/api/projects/sync', { project: normalized });

  safeDispatchCustomEvent('local_project_mutated');

  if (apiRes && apiRes.success !== false) {
    removeOfflineQueueItem(normalized.id);
  } else if (!isBackgroundQueueSync) {
    enqueueOfflineProject(normalized, normalized.lastModifiedSection || 'Project Update');
  }

  recordSyncLog({
    recordType: 'project',
    recordId: normalized.id,
    status: apiRes ? 'synced' : 'offline_queued',
    details: `Saved "${normalized.name || normalized.id}" to ${apiRes ? 'MySQL Database' : 'Local Repository'}`
  });
}

/**
 * Permanently deletes a project from MySQL database and local cache.
 */
export async function safeDeleteProject(id: string, projectName?: string, deletedBy?: string): Promise<void> {
  if (!id) return;

  removeOfflineQueueItem(id);

  try {
    const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
    }

    const projStr = localStorage.getItem('era_proj_v28');
    if (projStr) {
      const projs: Project[] = JSON.parse(projStr);
      if (Array.isArray(projs)) {
        const filteredProjs = projs.filter(p => p.id !== id);
        localStorage.setItem('era_proj_v28', JSON.stringify(filteredProjs));
      }
    }

    if (localStorage.getItem('era_current_project_id') === id) {
      localStorage.removeItem('era_current_project_id');
    }
  } catch {}

  // Sync delete to MySQL API
  await apiDelete(`/api/projects/${id}`, { projectName, deletedBy });

  safeDispatchCustomEvent('local_project_mutated');
  safeDispatchCustomEvent('project_globally_deleted', { id, projectName });

  recordSyncLog({
    recordType: 'project',
    recordId: id,
    status: 'deleted',
    details: `Permanently deleted project "${projectName || id}"`
  });
}

/**
 * Fetches all projects from MySQL database or local repository cache.
 */
export async function safeFetchProjects(): Promise<Project[] | null> {
  // Try fetching from MySQL API first
  const apiData = await apiGet('/api/projects');
  if (apiData && Array.isArray(apiData.projects) && apiData.projects.length > 0) {
    const deletedSet = new Set<string>(apiData.deletedIds || []);
    const projects = apiData.projects
      .filter((p: any) => p && p.id && !deletedSet.has(p.id))
      .map((p: any) => normalizeProject(p));

    if (projects.length > 0) {
      try {
        localStorage.setItem('era_proj_v28', JSON.stringify(projects));
      } catch {}
      return projects;
    }
  }

  // Fallback to local storage
  const deletedIds = await safeFetchDeletedProjectIds();
  const deletedSet = new Set(deletedIds);

  try {
    const projStr = localStorage.getItem('era_proj_v28');
    if (projStr) {
      const projs: Project[] = JSON.parse(projStr);
      if (Array.isArray(projs) && projs.length > 0) {
        return projs
          .filter(p => p && p.id && !deletedSet.has(p.id))
          .map(p => normalizeProject(p));
      }
    }
  } catch {}

  return null;
}

export async function safeSaveSingleUser(user: AppUser): Promise<void> {
  if (!user || !user.username) return;
  try {
    const usersStr = localStorage.getItem('era_users_v28') || '[]';
    let usersList: AppUser[] = JSON.parse(usersStr);
    if (!Array.isArray(usersList)) usersList = [];

    const idx = usersList.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      usersList[idx] = user;
    } else {
      usersList.push(user);
    }
    localStorage.setItem('era_users_v28', JSON.stringify(usersList));
  } catch {}

  await apiPost('/api/users/sync', { user });

  recordSyncLog({
    recordType: 'user',
    recordId: user.username,
    status: 'synced',
    details: `Saved user account "${user.username}"`
  });
}

export async function safeDeleteUser(username: string): Promise<void> {
  if (!username) return;
  try {
    const usersStr = localStorage.getItem('era_users_v28') || '[]';
    let usersList: AppUser[] = JSON.parse(usersStr);
    if (Array.isArray(usersList)) {
      usersList = usersList.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      localStorage.setItem('era_users_v28', JSON.stringify(usersList));
    }
  } catch {}

  await apiDelete(`/api/users/${username}`);

  recordSyncLog({
    recordType: 'user',
    recordId: username,
    status: 'deleted',
    details: `Deleted user "${username}"`
  });
}

export async function safeSyncUsers(users: AppUser[]): Promise<void> {
  try {
    localStorage.setItem('era_users_v28', JSON.stringify(users));
  } catch {}

  await apiPost('/api/users/sync', { users });

  recordSyncLog({
    recordType: 'user',
    recordId: `${users.length} users`,
    status: 'synced',
    details: `Synchronized ${users.length} user accounts`
  });
}

export async function safeFetchUsers(): Promise<AppUser[] | null> {
  const apiData = await apiGet('/api/users');
  if (apiData && Array.isArray(apiData.users) && apiData.users.length > 0) {
    try {
      localStorage.setItem('era_users_v28', JSON.stringify(apiData.users));
    } catch {}
    return apiData.users;
  }

  try {
    const usersStr = localStorage.getItem('era_users_v28');
    if (usersStr) {
      const users = JSON.parse(usersStr);
      if (Array.isArray(users) && users.length > 0) return users;
    }
  } catch {}
  return null;
}

export async function safeSyncApprovals(approvals: ApprovalRequest[]): Promise<void> {
  try {
    localStorage.setItem('era_appr_v28', JSON.stringify(approvals));
  } catch {}

  await apiPost('/api/approvals/sync', { approvals });

  recordSyncLog({
    recordType: 'approval',
    recordId: `${approvals.length} requests`,
    status: 'synced',
    details: `Synchronized ${approvals.length} approval records`
  });
}

export async function safeFetchApprovals(): Promise<ApprovalRequest[] | null> {
  const apiData = await apiGet('/api/approvals');
  if (apiData && Array.isArray(apiData.approvals)) {
    try {
      localStorage.setItem('era_appr_v28', JSON.stringify(apiData.approvals));
    } catch {}
    return apiData.approvals;
  }

  try {
    const apprStr = localStorage.getItem('era_appr_v28');
    if (apprStr) {
      const approvals = JSON.parse(apprStr);
      if (Array.isArray(approvals)) return approvals;
    }
  } catch {}
  return null;
}

export async function safeSyncConfig(pmos: string[], directorates: string[]): Promise<void> {
  try {
    localStorage.setItem('era_pmo_taxonomy', JSON.stringify(pmos));
    localStorage.setItem('era_directorates_taxonomy', JSON.stringify(directorates));
  } catch {}

  await apiPost('/api/config/sync', { key: 'taxonomy', data: { pmos, directorates } });

  recordSyncLog({
    recordType: 'config',
    status: 'synced',
    details: `Updated taxonomy configuration`
  });
}

export async function safeFetchConfig(): Promise<{ pmos: string[], directorates: string[] } | null> {
  const apiData = await apiGet('/api/config');
  if (apiData && apiData.config && apiData.config.taxonomy) {
    const { pmos = [], directorates = [] } = apiData.config.taxonomy;
    try {
      localStorage.setItem('era_pmo_taxonomy', JSON.stringify(pmos));
      localStorage.setItem('era_directorates_taxonomy', JSON.stringify(directorates));
    } catch {}
    return { pmos, directorates };
  }

  try {
    const pmosStr = localStorage.getItem('era_pmo_taxonomy');
    const dirStr = localStorage.getItem('era_directorates_taxonomy');
    if (pmosStr || dirStr) {
      return {
        pmos: pmosStr ? JSON.parse(pmosStr) : [],
        directorates: dirStr ? JSON.parse(dirStr) : []
      };
    }
  } catch {}
  return null;
}

export async function safeSyncScoringWeights(
  contractorWeights: ContractorScoringWeights,
  consultantWeights: ConsultantScoringWeights,
  updatedBy?: string
): Promise<void> {
  try {
    localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(contractorWeights));
    localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(consultantWeights));
  } catch {}

  await apiPost('/api/config/sync', { key: 'scoring_weights', data: { contractorWeights, consultantWeights } });

  recordSyncLog({
    recordType: 'config',
    status: 'synced',
    details: `Updated Scoring Weights`
  });
}

export async function safeFetchScoringWeights(): Promise<{
  contractorWeights: ContractorScoringWeights;
  consultantWeights: ConsultantScoringWeights;
} | null> {
  const apiData = await apiGet('/api/config');
  if (apiData && apiData.config && apiData.config.scoring_weights) {
    const { contractorWeights, consultantWeights } = apiData.config.scoring_weights;
    if (contractorWeights && consultantWeights) {
      try {
        localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(contractorWeights));
        localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(consultantWeights));
      } catch {}
      return { contractorWeights, consultantWeights };
    }
  }

  try {
    const cW = localStorage.getItem('era_contractor_scoring_weights');
    const sW = localStorage.getItem('era_consultant_scoring_weights');
    if (cW && sW) {
      return {
        contractorWeights: JSON.parse(cW),
        consultantWeights: JSON.parse(sW)
      };
    }
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Ethio Telecom Traditional MySQL Database Client Helpers
// ---------------------------------------------------------------------------

export interface ClientMySQLDiagnostics {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
  socket?: string;
  charset: string;
  timezone: string;
  latencyMs: number;
  lastTestedAt: string;
  errorDetails?: string;
  recommendation?: string;
  tableStats?: {
    projects: number;
    users: number;
    approvals: number;
    config: number;
    deletedProjects: number;
  };
}

export async function fetchMySQLDiagnostics(): Promise<ClientMySQLDiagnostics | null> {
  return await apiGet('/api/mysql/status');
}

export async function testMySQLServerConnection(): Promise<{ success: boolean; diagnostics?: ClientMySQLDiagnostics; error?: string }> {
  const result = await apiPost('/api/mysql/test', {});
  return result || { success: false, error: 'Network request failed' };
}

export async function triggerMySQLBiDirectionalSync(): Promise<{
  success: boolean;
  pushedProjects?: number;
  pulledProjects?: number;
  pushedUsers?: number;
  pulledUsers?: number;
  message?: string;
  error?: string;
}> {
  const result = await apiPost('/api/mysql/sync', {});
  if (result?.success) {
    recordSyncLog({
      recordType: 'batch_sync',
      status: 'synced',
      details: result.message || 'Bi-directional MySQL synchronization completed'
    });
  }
  return result || { success: false, error: 'Sync request failed' };
}

export async function fetchMySQLSchemaSQL(): Promise<string> {
  try {
    const res = await fetch('/api/mysql/schema');
    if (res.ok) {
      return await res.text();
    }
  } catch {}
  return '-- Failed to fetch schema script from server.';
}


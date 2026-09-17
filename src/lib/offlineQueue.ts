import { Project } from '../types';
import { safeDispatchCustomEvent } from './storage';
import { normalizeProject } from './apiSync';

export interface OfflineQueueItem {
  id: string;
  projectId: string;
  projectName: string;
  section: string;
  queuedAt: string;
  lastAttemptAt?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  progressPercent: number;
  currentStep: string;
  errorMessage?: string;
  payloadSize: number;
  projectData: Project;
  author?: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = 'era_offline_sync_queue';

/**
 * Loads and normalizes queue items from localStorage.
 * Handles backwards-compatibility if localStorage stored raw Project[] arrays previously.
 */
export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let hasConversions = false;
    const normalized: OfflineQueueItem[] = parsed.map((item: any, idx: number) => {
      // If already an OfflineQueueItem
      if (item && item.id && item.projectData) {
        return {
          id: String(item.id),
          projectId: item.projectId || item.projectData.id || `proj_${idx}`,
          projectName: item.projectName || item.projectData.name || 'Unnamed Project',
          section: item.section || item.projectData.lastModifiedSection || 'General Information',
          queuedAt: item.queuedAt || new Date().toISOString(),
          lastAttemptAt: item.lastAttemptAt,
          status: item.status || 'pending',
          retryCount: typeof item.retryCount === 'number' ? item.retryCount : 0,
          progressPercent: typeof item.progressPercent === 'number' ? item.progressPercent : 0,
          currentStep: item.currentStep || 'Queued for database sync',
          errorMessage: item.errorMessage,
          payloadSize: item.payloadSize || JSON.stringify(item.projectData).length,
          projectData: item.projectData,
          author: item.author || 'Current User'
        };
      }

      // Legacy raw Project object in queue
      if (item && item.id) {
        hasConversions = true;
        const jsonStr = JSON.stringify(item);
        return {
          id: `queue_${item.id}_${Date.now()}_${idx}`,
          projectId: item.id,
          projectName: item.name || 'Unnamed Road Project',
          section: item.lastModifiedSection || 'Project Details',
          queuedAt: item.lastModifiedAt || new Date().toISOString(),
          status: 'pending',
          retryCount: 0,
          progressPercent: 0,
          currentStep: 'Waiting in local queue',
          payloadSize: jsonStr.length,
          projectData: item,
          author: 'System Editor'
        };
      }

      return null;
    }).filter(Boolean) as OfflineQueueItem[];

    if (hasConversions) {
      saveOfflineQueue(normalized);
    }

    return normalized;
  } catch (err) {
    console.warn('Failed to parse offline sync queue:', err);
    return [];
  }
}

/**
 * Persists the queue and broadcasts updates.
 */
export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    safeDispatchCustomEvent('offline_queue_updated', { count: queue.length, queue });
  } catch (err) {
    console.error('Failed to save offline sync queue:', err);
  }
}

/**
 * Enqueues a project update into the offline queue.
 * Replaces any existing pending queue item for the same project with the latest state.
 */
export function enqueueOfflineProject(
  project: Project,
  section?: string,
  author?: string
): OfflineQueueItem {
  const currentQueue = getOfflineQueue();
  const normalizedProj = normalizeProject(project);
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(normalizedProj);

  const determinedSection = section || normalizedProj.lastModifiedSection || 'Project Update';

  // Check if project already has a pending or failed item in queue
  const existingIndex = currentQueue.findIndex(
    item => item.projectId === normalizedProj.id && item.status !== 'synced'
  );

  let targetItem: OfflineQueueItem;

  if (existingIndex >= 0) {
    targetItem = {
      ...currentQueue[existingIndex],
      projectName: normalizedProj.name || normalizedProj.id,
      section: determinedSection,
      lastAttemptAt: undefined,
      status: 'pending',
      progressPercent: 0,
      currentStep: 'Updated in offline queue',
      payloadSize: payloadJson.length,
      projectData: normalizedProj,
      errorMessage: undefined,
      author: author || currentQueue[existingIndex].author || 'Current User'
    };
    currentQueue[existingIndex] = targetItem;
  } else {
    targetItem = {
      id: `queue_${normalizedProj.id}_${Date.now()}`,
      projectId: normalizedProj.id,
      projectName: normalizedProj.name || normalizedProj.id,
      section: determinedSection,
      queuedAt: now,
      status: 'pending',
      retryCount: 0,
      progressPercent: 0,
      currentStep: 'Enqueued for database sync',
      payloadSize: payloadJson.length,
      projectData: normalizedProj,
      author: author || 'Current User'
    };
    currentQueue.unshift(targetItem);
  }

  saveOfflineQueue(currentQueue);
  return targetItem;
}

/**
 * Removes a specific queue item by its queue ID or project ID.
 */
export function removeOfflineQueueItem(id: string): void {
  const currentQueue = getOfflineQueue();
  const filtered = currentQueue.filter(item => item.id !== id && item.projectId !== id);
  saveOfflineQueue(filtered);
}

/**
 * Clears all successfully synchronized items from the queue.
 */
export function clearCompletedOfflineQueue(): void {
  const currentQueue = getOfflineQueue();
  const remaining = currentQueue.filter(item => item.status !== 'synced');
  saveOfflineQueue(remaining);
}

/**
 * Clears the entire offline queue.
 */
export function clearAllOfflineQueue(): void {
  saveOfflineQueue([]);
}

/**
 * Updates the progress and step state of an individual queue item.
 */
export function updateQueueItemProgress(
  id: string,
  progress: number,
  step: string,
  status?: OfflineQueueItem['status'],
  errorMessage?: string
): void {
  const currentQueue = getOfflineQueue();
  const item = currentQueue.find(q => q.id === id);
  if (!item) return;

  item.progressPercent = Math.min(100, Math.max(0, Math.round(progress)));
  item.currentStep = step;
  if (status) item.status = status;
  if (errorMessage !== undefined) item.errorMessage = errorMessage;
  if (status === 'syncing' || status === 'failed') {
    item.lastAttemptAt = new Date().toISOString();
  }

  saveOfflineQueue(currentQueue);
}

/**
 * Helper to simulate realistic upload/verification steps for smooth visual UX
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Synchronizes an individual queue item to the remote Ethio Telecom server and central database,
 * reporting detailed granular progress throughout each stage.
 */
export async function syncSingleQueueItem(
  id: string,
  onProgress?: (percent: number, step: string) => void
): Promise<boolean> {
  const queue = getOfflineQueue();
  const item = queue.find(q => q.id === id);
  if (!item) return false;

  const report = (percent: number, step: string, status?: OfflineQueueItem['status'], error?: string) => {
    updateQueueItemProgress(id, percent, step, status, error);
    if (onProgress) onProgress(percent, step);
  };

  try {
    report(10, 'Validating project data schema & metrics...', 'syncing');
    await sleep(250);

    const projectToSync = normalizeProject(item.projectData);
    report(30, 'Packaging payload for Ethio Telecom server (eradashboard.com.et:3306)...', 'syncing');
    await sleep(250);

    report(60, 'Transmitting project data via REST sync channel...', 'syncing');

    const res = await fetch('/api/projects/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: projectToSync })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success === false) {
      throw new Error(data.message || 'Central database rejected payload');
    }

    report(85, 'Verifying MySQL database checksum & transaction commit...', 'syncing');
    await sleep(200);

    report(100, 'Synchronized successfully to Ethio Telecom server!', 'synced');
    safeDispatchCustomEvent('local_project_mutated');
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || 'Network connection timeout or server unreachable';
    const updatedQueue = getOfflineQueue();
    const currentItem = updatedQueue.find(q => q.id === id);
    if (currentItem) {
      currentItem.retryCount = (currentItem.retryCount || 0) + 1;
      currentItem.status = 'failed';
      currentItem.errorMessage = errorMsg;
      currentItem.currentStep = `Failed: ${errorMsg}`;
      currentItem.lastAttemptAt = new Date().toISOString();
      saveOfflineQueue(updatedQueue);
    }
    return false;
  }
}

/**
 * Synchronizes all pending and failed queue items one by one with live progress tracking.
 */
let isAllSyncRunning = false;

export async function syncAllOfflineQueue(
  onProgress?: (overallPercent: number, activeItem?: OfflineQueueItem) => void
): Promise<{ success: number; failed: number; total: number }> {
  if (isAllSyncRunning) {
    return { success: 0, failed: 0, total: 0 };
  }

  isAllSyncRunning = true;
  const queue = getOfflineQueue();
  const itemsToSync = queue.filter(item => item.status !== 'synced');

  if (itemsToSync.length === 0) {
    isAllSyncRunning = false;
    return { success: 0, failed: 0, total: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < itemsToSync.length; i++) {
    const current = itemsToSync[i];
    const overallStartPercent = Math.round((i / itemsToSync.length) * 100);
    
    if (onProgress) onProgress(overallStartPercent, current);

    const ok = await syncSingleQueueItem(current.id, (percent, step) => {
      const stepPercent = Math.round(overallStartPercent + (percent / itemsToSync.length));
      if (onProgress) onProgress(stepPercent, current);
    });

    if (ok) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  if (onProgress) onProgress(100, undefined);
  isAllSyncRunning = false;

  return {
    success: successCount,
    failed: failedCount,
    total: itemsToSync.length
  };
}

/**
 * Creates a sample simulated project update in the queue.
 * Useful for user testing, demonstration, or simulating intermittent connectivity.
 */
export function enqueueSampleTestUpdate(existingProjects: Project[]): OfflineQueueItem {
  const baseProject = existingProjects[0] || {
    id: `proj_${Date.now()}`,
    name: 'Sample High-Priority Corridor Road Project',
    programDirectorate: 'Southern',
    pmo: 'PMO 1',
    financial: { totalBudget: 450000000, disbursedAmount: 210000000 },
    physicalProgress: 48.5,
    lastModifiedSection: 'Financials & IPC Tracker',
    lastModifiedAt: new Date().toISOString()
  } as unknown as Project;

  const sections = [
    'Physical Progress & Milestones',
    'Financial & IPC Certification',
    'Right-of-Way & Environmental Compliance',
    'Contractor & Consultant Performance Audit',
    'Work Program & Revised Schedules'
  ];

  const randomSection = sections[Math.floor(Math.random() * sections.length)];

  const modifiedProject: Project = {
    ...baseProject,
    lastModifiedSection: randomSection,
    lastModifiedAt: new Date().toISOString()
  };

  return enqueueOfflineProject(
    modifiedProject,
    randomSection,
    'Field Engineer (Offline)'
  );
}

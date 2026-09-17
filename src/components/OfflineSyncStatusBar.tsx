import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Layers,
  Database,
  Wifi,
  WifiOff,
  FileText,
  Play,
  Check,
  X,
  ExternalLink,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Project } from '../types';
import {
  OfflineQueueItem,
  getOfflineQueue,
  saveOfflineQueue,
  removeOfflineQueueItem,
  clearCompletedOfflineQueue,
  clearAllOfflineQueue,
  syncSingleQueueItem,
  syncAllOfflineQueue,
  enqueueSampleTestUpdate
} from '../lib/offlineQueue';

interface OfflineSyncStatusBarProps {
  projects: Project[];
  onProjectSynced?: (syncedProject: Project) => void;
}

export const OfflineSyncStatusBar: React.FC<OfflineSyncStatusBarProps> = ({
  projects,
  onProjectSynced
}) => {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeSyncingItemId, setActiveSyncingItemId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [inspectedItem, setInspectedItem] = useState<OfflineQueueItem | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [, startTransition] = useTransition();

  // Load and subscribe to offline queue changes
  const reloadQueue = () => {
    startTransition(() => {
      setQueue(getOfflineQueue());
    });
  };

  useEffect(() => {
    reloadQueue();

    const handleQueueUpdated = () => {
      reloadQueue();
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (autoSyncEnabled) {
        handleSyncAll();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('offline_queue_updated', handleQueueUpdated);
    window.addEventListener('storage', handleQueueUpdated);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check to keep UI fresh
    const interval = setInterval(reloadQueue, 3000);

    return () => {
      window.removeEventListener('offline_queue_updated', handleQueueUpdated);
      window.removeEventListener('storage', handleQueueUpdated);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [autoSyncEnabled]);

  // Derived statistics
  const stats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter(q => q.status === 'pending').length;
    const syncing = queue.filter(q => q.status === 'syncing').length;
    const synced = queue.filter(q => q.status === 'synced').length;
    const failed = queue.filter(q => q.status === 'failed').length;
    return { total, pending, syncing, synced, failed };
  }, [queue]);

  const currentlySyncingItem = useMemo(() => {
    return queue.find(q => q.status === 'syncing') || null;
  }, [queue]);

  // Trigger sync for all pending and failed items
  const handleSyncAll = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setOverallProgress(0);

    try {
      await syncAllOfflineQueue((percent, activeItem) => {
        setOverallProgress(percent);
        if (activeItem) {
          setActiveSyncingItemId(activeItem.id);
        } else {
          setActiveSyncingItemId(null);
        }
        reloadQueue();
      });
    } catch (err) {
      console.error('Batch sync queue error:', err);
    } finally {
      setIsSyncingAll(false);
      setActiveSyncingItemId(null);
      setOverallProgress(100);
      reloadQueue();
      setTimeout(() => setOverallProgress(0), 1200);
    }
  };

  // Trigger sync for an individual queue item
  const handleSyncSingle = async (item: OfflineQueueItem) => {
    setActiveSyncingItemId(item.id);
    try {
      await syncSingleQueueItem(item.id, () => {
        reloadQueue();
      });
    } catch (err) {
      console.error('Single item sync error:', err);
    } finally {
      setActiveSyncingItemId(null);
      reloadQueue();
    }
  };

  // Remove single item
  const handleRemove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    removeOfflineQueueItem(id);
    reloadQueue();
  };

  // Clear completed
  const handleClearCompleted = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    clearCompletedOfflineQueue();
    reloadQueue();
  };

  // Enqueue a sample update for testing/demonstration
  const handleAddSample = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    enqueueSampleTestUpdate(projects);
    reloadQueue();
    setIsExpanded(true);
  };

  const hasItems = queue.length > 0;
  const isPendingOrSyncing = stats.pending > 0 || stats.syncing > 0 || stats.failed > 0;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* Docked Dedicated Status Bar at Bottom */}
      {/* ------------------------------------------------------------- */}
      <div
        id="offline-sync-status-bar-container"
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto select-none ${
          isExpanded ? 'shadow-2xl' : 'shadow-lg'
        }`}
      >
        {/* Subtle top indicator border */}
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
          {isSyncingAll && (
            <motion.div
              className="h-full bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-500"
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          )}
          {!isSyncingAll && currentlySyncingItem && (
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${currentlySyncingItem.progressPercent}%` }}
              transition={{ duration: 0.2 }}
            />
          )}
          {!isSyncingAll && !currentlySyncingItem && stats.failed > 0 && (
            <div className="h-full w-full bg-rose-500/80" />
          )}
          {!isSyncingAll && !currentlySyncingItem && stats.failed === 0 && stats.pending > 0 && (
            <div className="h-full w-full bg-amber-400" />
          )}
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4 text-xs font-medium">
          {/* Left: Status Badge & Item Count */}
          <div
            id="offline-status-bar-summary-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            title="Click to view full offline queue and progress details"
          >
            <div className="relative">
              {isSyncingAll || currentlySyncingItem ? (
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
              ) : !isOnline ? (
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                </div>
              ) : stats.failed > 0 ? (
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              ) : stats.pending > 0 ? (
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <CloudOff className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                <span className="text-[11px] sm:text-xs">Offline Sync Queue:</span>
                {isSyncingAll ? (
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                    Syncing All ({overallProgress}%)
                  </span>
                ) : currentlySyncingItem ? (
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                    Syncing Project ({currentlySyncingItem.progressPercent}%)
                  </span>
                ) : stats.failed > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                    {stats.failed} Failed / {stats.pending + stats.failed} Pending
                  </span>
                ) : stats.pending > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                    {stats.pending} {stats.pending === 1 ? 'Update Pending' : 'Updates Pending'}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    All Local Changes Synced
                  </span>
                )}
              </div>

              {/* Sub-label */}
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 hidden sm:flex">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Target: eradashboard.com.et:3306 (Ethio Telecom)</span>
                <span>•</span>
                <span className={isOnline ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Live Progress Ticker of Currently Active Project */}
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            {currentlySyncingItem ? (
              <div className="bg-slate-100 dark:bg-slate-800/80 rounded-lg px-3 py-1 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    Updating: {currentlySyncingItem.projectName}
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-[10px] shrink-0 ml-2">
                    {currentlySyncingItem.progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-blue-600 h-full rounded-full"
                    animate={{ width: `${currentlySyncingItem.progressPercent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentlySyncingItem.currentStep}
                </div>
              </div>
            ) : isPendingOrSyncing ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                <span>
                  {stats.pending + stats.failed} project modifications waiting in local cache to sync with central database.
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Central database synchronized with all field modifications.</span>
              </div>
            )}
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isPendingOrSyncing ? (
              <button
                id="offline-sync-now-btn"
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Synchronize all pending offline queue updates immediately"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{isSyncingAll ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            ) : (
              <button
                id="offline-queue-sample-btn"
                onClick={handleAddSample}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Queue a sample project update to test offline sync progress"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Queue Test Update</span>
              </button>
            )}

            <button
              id="offline-expand-details-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
              title={isExpanded ? 'Collapse queue details' : 'Expand queue details'}
            >
              <span className="text-[11px] font-bold hidden sm:inline">
                {isExpanded ? 'Hide Details' : 'Details'}
              </span>
              {hasItems && (
                <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-750 rounded-full text-[10px] font-mono font-bold">
                  {queue.length}
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Expanded Detailed Queue Drawer Panel */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="offline-queue-expanded-panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[52px] left-0 right-0 z-40 max-h-[75vh] flex flex-col bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Offline Synchronization Queue
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    {queue.length} {queue.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed progress of queued project modifications awaiting transmission to Ethio Telecom server (<code className="font-mono text-blue-600 dark:text-blue-400">eradashboard.com.et:3306</code>).
                </p>
              </div>

              {/* Drawer Top Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="offline-drawer-add-test-btn"
                  onClick={handleAddSample}
                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Enqueues a test project modification to verify offline sync queue progression"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-500" />
                  <span>Queue Test Project</span>
                </button>

                {stats.synced > 0 && (
                  <button
                    id="offline-drawer-clear-synced-btn"
                    onClick={handleClearCompleted}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Clear Synced ({stats.synced})</span>
                  </button>
                )}

                {hasItems && (
                  <button
                    id="offline-drawer-sync-all-btn"
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? `Syncing (${overallProgress}%)` : 'Sync All Queue'}</span>
                  </button>
                )}

                <button
                  id="offline-drawer-close-btn"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Close queue drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Bar */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-100/60 dark:bg-slate-850/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-3 overflow-x-auto">
              <div className="flex items-center gap-4 sm:gap-6 font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500">Total Items:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{stats.total}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-500">Pending:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-slate-500">Syncing:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{stats.syncing}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-500">Synced:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.synced}</span>
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-slate-500">Failed / Retries:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{stats.failed}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-2">
                <span className="hidden sm:inline">Automatic synchronization on reconnect:</span>
                <button
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                    autoSyncEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {autoSyncEnabled ? 'Auto-Sync ON' : 'Manual Sync'}
                </button>
              </div>
            </div>

            {/* Queue Items List */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[50vh] space-y-3">
              {queue.length === 0 ? (
                <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Offline Queue is Currently Empty
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    All local project edits, financial updates, and milestone revisions have been safely synchronized to the Ethio Telecom MySQL database.
                  </p>
                  <button
                    onClick={handleAddSample}
                    className="mt-4 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Queue a Test Project Update
                  </button>
                </div>
              ) : (
                queue.map(item => {
                  const isItemSyncing = item.status === 'syncing' || activeSyncingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      id={`queue-item-${item.id}`}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                        item.status === 'synced'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50'
                          : item.status === 'failed'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                          : isItemSyncing
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-sm'
                          : 'bg-slate-50/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Project Info & Status Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                              {item.projectName}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              ({item.projectId})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                              {item.section}
                            </span>
                            {item.status === 'synced' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Synced
                              </span>
                            ) : item.status === 'failed' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Sync Failed
                              </span>
                            ) : isItemSyncing ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending Sync
                              </span>
                            )}
                          </div>

                          {/* Metadata row */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span>Queued: {new Date(item.queuedAt).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>Payload: {Math.round(item.payloadSize / 1024 * 10) / 10} KB</span>
                            {item.retryCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  Retries: {item.retryCount}
                                </span>
                              </>
                            )}
                            {item.author && (
                              <>
                                <span>•</span>
                                <span>Author: {item.author}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status !== 'synced' && (
                            <button
                              id={`sync-item-btn-${item.id}`}
                              onClick={() => handleSyncSingle(item)}
                              disabled={isItemSyncing || isSyncingAll}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Synchronize this individual project update now"
                            >
                              <RefreshCw className={`w-3 h-3 ${isItemSyncing ? 'animate-spin' : ''}`} />
                              <span>{isItemSyncing ? 'Syncing...' : 'Sync This'}</span>
                            </button>
                          )}

                          <button
                            id={`inspect-item-btn-${item.id}`}
                            onClick={() => setInspectedItem(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-750 transition cursor-pointer"
                            title="Inspect project modification payload"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`remove-item-btn-${item.id}`}
                            onClick={e => handleRemove(item.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Discard / remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Individual Project Progress Bar & Step Tracker */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {item.currentStep}
                          </span>
                          <span className={`font-mono font-bold text-[10px] shrink-0 ml-2 ${
                            item.status === 'synced'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.status === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {item.progressPercent}%
                          </span>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-slate-200 dark:bg-slate-750 h-2 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.status === 'synced'
                                ? 'bg-emerald-500'
                                : item.status === 'failed'
                                ? 'bg-rose-500'
                                : 'bg-linear-to-r from-blue-500 to-indigo-500'
                            }`}
                            initial={{ width: '0%' }}
                            animate={{ width: `${item.progressPercent}%` }}
                          />
                        </div>

                        {/* Failure note if any */}
                        {item.errorMessage && item.status === 'failed' && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/60">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">Last error: {item.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* Inspection Modal for Queued Project Payload */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {inspectedItem && (
          <motion.div
            id="offline-item-inspector-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Queued Project Modification Payload
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {inspectedItem.projectName} ({inspectedItem.projectId})
                  </p>
                </div>
                <button
                  onClick={() => setInspectedItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                  <div><strong className="text-slate-700 dark:text-slate-300">Target Section:</strong> {inspectedItem.section}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Queued Timestamp:</strong> {inspectedItem.queuedAt}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Current Step:</strong> {inspectedItem.currentStep}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Progress:</strong> {inspectedItem.progressPercent}%</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Target Database:</strong> Ethio Telecom (eradashboard.com.et:3306)</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    Normalized JSON Payload ({Math.round(inspectedItem.payloadSize / 1024 * 10) / 10} KB):
                  </label>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(inspectedItem.projectData, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    handleRemove(inspectedItem.id);
                    setInspectedItem(null);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard from Queue
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleSyncSingle(inspectedItem);
                      setInspectedItem(null);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Now
                  </button>
                  <button
                    onClick={() => setInspectedItem(null)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

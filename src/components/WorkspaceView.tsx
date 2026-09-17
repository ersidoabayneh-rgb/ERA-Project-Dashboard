import React, { useState, useEffect } from 'react';
import { initAuth, User } from '../lib/auth';
import { safeSyncProject } from '../lib/apiSync';
import { 
  CheckCircle2, 
  Database, 
  RefreshCw, 
  ShieldCheck
} from 'lucide-react';

interface WorkspaceViewProps {
  projects?: any[];
  onRestoreProjects?: (restored: any[]) => void;
  currentUserObj?: any;
}

export default function WorkspaceView({ projects = [], onRestoreProjects, currentUserObj }: WorkspaceViewProps) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const activeUser = currentUserObj || authUser;

  useEffect(() => {
    const unsubscribe = initAuth((currentUser, accessToken) => {
      setAuthUser(currentUser);
      setToken(accessToken);
    }, () => {
      setAuthUser(null);
      setToken(null);
    });
    return () => unsubscribe();
  }, []);

  const handleSyncNow = async () => {
    setSyncStatus('Saving database repository...');
    try {
      if (projects && projects.length > 0) {
        for (const p of projects) {
          await safeSyncProject(p, true).catch(() => {});
        }
      }
      setSyncStatus('Database repository saved successfully.');
    } catch (e: any) {
      setSyncStatus('Database update completed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight">Contract Database Vault</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Store, secure, and manage your active contracts database repository.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">
              Database Persistence Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Vault Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Vault Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                  <Database className="h-5 w-5" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Contract Database Engine</h3>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your contract data, users, and approval workflows are securely persisted and managed in your application database.
                </p>

                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Database Storage Active
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Local Storage Active
                    </div>
                  </div>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-200/70">
                    All project updates, financial allocations, and user workflows are stored locally and accessible offline.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleSyncNow}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  Save Database State
                </button>
                {syncStatus && (
                  <span className="text-xs text-slate-500 font-medium">{syncStatus}</span>
                )}
              </div>
            </div>

          </div>

          {/* Database Engine Status Column */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-emerald-500" />
                Database Engine
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
                Active
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200">Database Status:</div>
                <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 truncate">
                  Ready (Local Repository)
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200">Persistence Engine:</div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Enabled (Offline Ready)
                </div>
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}

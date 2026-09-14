import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, UserPlus, UserMinus, Search, Check, AlertCircle, X, Users, Lock, Eye } from 'lucide-react';
import { User, PrivateDraft } from '../types';

interface ExplicitAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: PrivateDraft | null;
  users: User[];
  currentUsername: string;
  onGrantAccess: (targetUsername: string) => void;
  onRevokeAccess: (targetUsername: string) => void;
}

export default function ExplicitAccessModal({
  isOpen,
  onClose,
  draft,
  users,
  currentUsername,
  onGrantAccess,
  onRevokeAccess
}: ExplicitAccessModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen || !draft) return null;

  const grantedSet = new Set(draft.grantedAccessUsernames || []);

  // Filter out the author themselves and filter by query
  const eligibleUsers = users.filter(u => {
    if (!u || !u.username) return false;
    if (u.username.toLowerCase() === draft.author.toLowerCase()) return false;
    if (u.username.toLowerCase() === currentUsername.toLowerCase()) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchUser = u.username.toLowerCase().includes(query);
    const matchName = u.fullName?.toLowerCase().includes(query);
    const matchRole = u.role.toLowerCase().includes(query);
    const matchDir = u.assignedDirectorate?.toLowerCase().includes(query);
    return matchUser || matchName || matchRole || matchDir;
  });

  const handleGrant = (targetUsername: string) => {
    onGrantAccess(targetUsername);
    setSuccessNotice(`Granted view access to ${targetUsername}`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleRevoke = (targetUsername: string) => {
    onRevokeAccess(targetUsername);
    setSuccessNotice(`Revoked view access for ${targetUsername}`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master_admin':
      case 'admin':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Admin</span>;
      case 'directorate_admin':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Directorate Admin</span>;
      case 'pmo_admin':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">PMO</span>;
      case 'approver':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Approver</span>;
      case 'editor':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Editor</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Viewer</span>;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Grant Explicit Access to Private Draft
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Granular, per-user draft authorization with full audit logging
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Draft Context Banner */}
          <div className="px-6 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span className="font-bold text-blue-700 dark:text-blue-300">Draft Target:</span>
              <span className="font-semibold">{draft.section}</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">{draft.projectName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                Author: <strong>{draft.authorFullName || draft.author}</strong>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                {grantedSet.size} Granted
              </span>
            </div>
          </div>

          {/* Notice Banner */}
          {successNotice && (
            <div className="mx-6 mt-3 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Search & Instructions */}
          <div className="p-6 pb-3 space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Private Draft Isolation Rule:</p>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5">
                  Under strict governance rules, this draft is invisible to all other users until submitted and approved. Granting access allows the selected colleague to inspect this draft in read-only mode for collaboration before final submission.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search colleagues by name, username, or role..."
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* User List */}
          <div className="px-6 flex-1 overflow-y-auto space-y-2 pb-4">
            {eligibleUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No colleagues found matching "{searchQuery}".
              </div>
            ) : (
              eligibleUsers.map((user) => {
                const isGranted = grantedSet.has(user.username);
                return (
                  <div
                    key={user.username}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isGranted
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60'
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isGranted
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-200'
                      }`}>
                        {(user.fullName || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {user.fullName || user.username}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            (@{user.username})
                          </span>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {user.email || 'No email registered'}
                          {user.assignedDirectorate && ` • ${user.assignedDirectorate} Directorate`}
                          {user.assignedPmo && ` • ${user.assignedPmo}`}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isGranted ? (
                        <button
                          onClick={() => handleRevoke(user.username)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Revoke Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrant(user.username)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Grant View Access</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Eye className="w-3.5 h-3.5" />
              <span>All access grants and revocations are immutably logged in the audit trail.</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-bold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

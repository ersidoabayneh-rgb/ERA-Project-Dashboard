import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserCheck, Shield, Check, Search, X, Lock } from 'lucide-react';
import { User, PrivateDraft } from '../types';

interface ExplicitAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: PrivateDraft | null;
  users: User[];
  onSaveAccess: (draftId: string, grantedUsernames: string[]) => void;
}

export default function ExplicitAccessModal({
  isOpen,
  onClose,
  draft,
  users,
  onSaveAccess,
}: ExplicitAccessModalProps) {
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>(() => {
    return draft?.grantedAccessUsernames || [];
  });
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !draft) return null;

  const toggleUser = (username: string) => {
    if (selectedUsernames.includes(username)) {
      setSelectedUsernames(selectedUsernames.filter(u => u !== username));
    } else {
      setSelectedUsernames([...selectedUsernames, username]);
    }
  };

  const handleSave = () => {
    onSaveAccess(draft.id, selectedUsernames);
    onClose();
  };

  const filteredUsers = users.filter(u => {
    // Exclude author
    if (u.username.toLowerCase() === draft.author.toLowerCase()) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-4 p-6"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-150 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Grant Explicit Access to Private Draft
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Private draft for <strong className="text-slate-800 dark:text-slate-200">{draft.projectName} ({draft.section})</strong> is visible only to author <strong className="text-indigo-600 dark:text-indigo-400">{draft.author}</strong> by default. Select specific users below to explicitly grant view access.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search user by name, username or role..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching users found.
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedUsernames.includes(u.username);
                return (
                  <div
                    key={`grant-user-${u.username}`}
                    onClick={() => toggleUser(u.username)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {u.fullName || u.username}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          @{u.username} • <span className="uppercase font-semibold text-indigo-500">{u.role}</span>
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
            <span className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-200">
              <Lock className="w-3 h-3 text-amber-500" /> Explicit Access Enforcement Notice:
            </span>
            <p>
              Users selected above will be granted read access to view this private draft prior to approval submission. All other users, viewers, approvers, and non-granted admins remain restricted.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" /> Save Access Permissions
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

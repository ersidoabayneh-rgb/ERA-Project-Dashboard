import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building, 
  FolderKanban, 
  Check, 
  Sparkles
} from 'lucide-react';
import { User as UserType } from '../types';

interface UserProfileModalProps {
  currentUser: UserType;
  allUsers: UserType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCredentials: (updatedUser: UserType, oldUsername: string) => Promise<{ success: boolean; message?: string }>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  allUsers,
  isOpen,
  onClose,
  onUpdateCredentials
}) => {
  // Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Visibility Toggles
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Status State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with fresh user data
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewUsername(currentUser.username);
      setNewPassword('');
      setConfirmNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Validation Checkers
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const doPasswordsMatch = newPassword === confirmNewPassword && newPassword.length > 0;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Confirm previous credentials (verify current password)
    if (!currentPassword) {
      setErrorMsg('Please enter your current password to confirm your previous credentials.');
      return;
    }

    const trimmedCurrentPw = currentPassword;
    const actualCurrentPw = currentUser.password || '';

    if (actualCurrentPw && trimmedCurrentPw !== actualCurrentPw) {
      setErrorMsg('❌ Verification Failed: The current password you entered is incorrect.');
      return;
    }

    const trimmedNewUsername = newUsername.trim();
    const isChangingUsername = trimmedNewUsername.toLowerCase() !== currentUser.username.toLowerCase();
    const isChangingPassword = newPassword.length > 0;

    if (!isChangingUsername && !isChangingPassword) {
      setErrorMsg('No changes detected. Please specify a new username or new password.');
      return;
    }

    // 2. Validate new username
    if (isChangingUsername) {
      if (!trimmedNewUsername) {
        setErrorMsg('Username cannot be blank.');
        return;
      }
      if (trimmedNewUsername.length < 3) {
        setErrorMsg('Username must be at least 3 characters long.');
        return;
      }
      const duplicateExists = allUsers.some(
        u => u.username.toLowerCase() === trimmedNewUsername.toLowerCase() &&
             u.username.toLowerCase() !== currentUser.username.toLowerCase()
      );
      if (duplicateExists) {
        setErrorMsg(`The username "${trimmedNewUsername}" is already taken by another account. Please choose a different username.`);
        return;
      }
    }

    // 3. Validate new password if provided
    if (isChangingPassword) {
      if (currentUser.role !== 'admin' && currentUser.role !== 'master_admin') {
        if (!hasMinLength) {
          setErrorMsg('New password must be at least 8 characters long.');
          return;
        }
        if (!hasUppercase) {
          setErrorMsg('New password must contain at least one uppercase letter (A-Z).');
          return;
        }
        if (!hasNumber) {
          setErrorMsg('New password must contain at least one number (0-9).');
          return;
        }
        if (!hasSpecial) {
          setErrorMsg('New password must contain at least one special character (e.g. !@#$%^&*).');
          return;
        }
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('New password and confirmation password do not match.');
        return;
      }
    }

    // 4. Submit update
    setIsSubmitting(true);
    try {
      const updatedUserObj: UserType = {
        ...currentUser,
        username: trimmedNewUsername,
        password: isChangingPassword ? newPassword : currentUser.password
      };

      const result = await onUpdateCredentials(updatedUserObj, currentUser.username);
      if (result.success) {
        setSuccessMsg(result.message || 'Credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setErrorMsg(result.message || 'Failed to update credentials. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred while updating credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master_admin':
      case 'admin':
        return { label: '⭐ Master Admin', style: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'directorate_admin':
        return { label: '🏢 Directorate Admin', style: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' };
      case 'pmo_admin':
        return { label: '📁 PMO Admin', style: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800' };
      case 'approver':
        return { label: '⚖️ Approver', style: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800' };
      case 'editor':
        return { label: '✏️ Editor', style: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      case 'viewer':
      default:
        return { label: '👁️ Viewer', style: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-lg bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-750 shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">
                User Profile & Credentials
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Manage your account credentials and security settings
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* User Profile Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide">
                  {currentUser.username}
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleInfo.style}`}>
                  {roleInfo.label}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-md">
                Active Account
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              {currentUser.assignedDirectorate && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Directorate: <strong className="text-slate-800 dark:text-slate-200">{currentUser.assignedDirectorate}</strong></span>
                </div>
              )}
              {currentUser.assignedPmo && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">PMO: <strong className="text-slate-800 dark:text-slate-200">{currentUser.assignedPmo}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Accessible Contracts: <strong className="text-slate-800 dark:text-slate-200">{currentUser.role === 'admin' || currentUser.role === 'master_admin' ? 'All (Unrestricted)' : `${currentUser.accessibleProjects?.length || 0} Contracts`}</strong></span>
              </div>
            </div>
          </div>

          {/* Change Credentials Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                Change Username or Password
              </h3>
            </div>

            {/* Notification messages */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: Confirm Previous Credentials */}
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center justify-between">
                <span>1. Confirm Previous Credentials (Required)</span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 font-normal">Security verification</span>
              </label>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Please enter your current password to authenticate this update request:
              </p>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-2 pl-9 pr-10 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-500 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2: New Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>New Username</span>
                <span className="text-[10px] text-slate-400 font-normal">Leave unchanged to keep current</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Step 3: New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>New Password</span>
                <span className="text-[10px] text-slate-400 font-normal">Leave blank if not changing</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-9 pr-10 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showNewPw ? 'Hide password' : 'Show password'}
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checklist (shown when user types in new password) */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 mt-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">
                    Password Security Criteria:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 font-semibold ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-500' : 'opacity-30'}`} />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 font-semibold ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasUppercase ? 'text-emerald-500' : 'opacity-30'}`} />
                      <span>1+ Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 font-semibold ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-500' : 'opacity-30'}`} />
                      <span>1+ Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 font-semibold ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-500' : 'opacity-30'}`} />
                      <span>1+ Special char (!@#)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Confirm New Password</span>
                  {confirmNewPassword.length > 0 && (
                    <span className={`text-[10px] font-bold ${doPasswordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {doPasswordsMatch ? '✓ Passwords Match' : '✗ Do Not Match'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-9 pr-10 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title={showConfirmPw ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Confirm & Update Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

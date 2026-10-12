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
  Sparkles,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  Trash2,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { User as UserType, UserSignInRecord } from '../types';
import { 
  getCurrentDeviceId, 
  ensureUserSignInRecords, 
  removeOtherDeviceRecords, 
  removeSpecificDeviceRecord 
} from '../lib/deviceSession';

interface UserProfileModalProps {
  currentUser: UserType;
  allUsers: UserType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCredentials: (updatedUser: UserType, oldUsername: string) => Promise<{ success: boolean; message?: string }>;
  onRemoveOtherDeviceRecords?: (keptDeviceId: string) => Promise<{ success: boolean; message?: string }>;
  onRemoveSpecificDeviceRecord?: (recordId: string) => Promise<{ success: boolean; message?: string }>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  allUsers,
  isOpen,
  onClose,
  onUpdateCredentials,
  onRemoveOtherDeviceRecords,
  onRemoveSpecificDeviceRecord
}) => {
  // Navigation Tabs: 'credentials' | 'devices'
  const [activeTab, setActiveTab] = useState<'credentials' | 'devices'>('credentials');

  // Credentials Form State
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

  // Device Management State
  const [isRemovingDevices, setIsRemovingDevices] = useState(false);
  const [showConfirmRemoveAll, setShowConfirmRemoveAll] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<UserSignInRecord | null>(null);
  const [deviceActionNotice, setDeviceActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Device & Sessions computation
  const currentDeviceId = getCurrentDeviceId();
  const activeUserWithRecords = React.useMemo(() => {
    return ensureUserSignInRecords(currentUser);
  }, [currentUser]);

  const signInRecords = activeUserWithRecords.signInRecords || [];
  const currentDeviceRecord = signInRecords.find(r => r.deviceId === currentDeviceId);
  const otherDeviceRecords = signInRecords.filter(r => r.deviceId !== currentDeviceId);

  // Reset form when modal opens with fresh user data
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewUsername(currentUser.username);
      setNewPassword('');
      setConfirmNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setDeviceActionNotice(null);
      setShowConfirmRemoveAll(false);
      setDeviceToRemove(null);
    }
  }, [isOpen, currentUser.username]);

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

  // Handler to remove all sign-in records from other devices
  const handleExecuteRemoveOtherDevices = async () => {
    setShowConfirmRemoveAll(false);
    setIsRemovingDevices(true);
    setDeviceActionNotice(null);

    try {
      let result: { success: boolean; message?: string };
      if (onRemoveOtherDeviceRecords) {
        result = await onRemoveOtherDeviceRecords(currentDeviceId);
      } else {
        const updated = removeOtherDeviceRecords(activeUserWithRecords, currentDeviceId);
        result = await onUpdateCredentials(updated, currentUser.username);
      }

      if (result.success) {
        setDeviceActionNotice({
          type: 'success',
          message: `All sign-in records from other devices (${otherDeviceRecords.length} sessions) have been successfully removed and revoked.`
        });
      } else {
        setDeviceActionNotice({
          type: 'error',
          message: result.message || 'Failed to remove records from other devices.'
        });
      }
    } catch (err: any) {
      setDeviceActionNotice({
        type: 'error',
        message: err?.message || 'Error occurred while removing other device records.'
      });
    } finally {
      setIsRemovingDevices(false);
    }
  };

  // Handler to remove a specific sign-in record
  const handleExecuteRemoveSpecificDevice = async (record: UserSignInRecord) => {
    setDeviceToRemove(null);
    setIsRemovingDevices(true);
    setDeviceActionNotice(null);

    try {
      let result: { success: boolean; message?: string };
      if (onRemoveSpecificDeviceRecord) {
        result = await onRemoveSpecificDeviceRecord(record.id);
      } else {
        const updated = removeSpecificDeviceRecord(activeUserWithRecords, record.id);
        result = await onUpdateCredentials(updated, currentUser.username);
      }

      if (result.success) {
        setDeviceActionNotice({
          type: 'success',
          message: `Sign-in record for "${record.deviceInfo}" has been removed and its session revoked.`
        });
      } else {
        setDeviceActionNotice({
          type: 'error',
          message: result.message || 'Failed to remove device record.'
        });
      }
    } catch (err: any) {
      setDeviceActionNotice({
        type: 'error',
        message: err?.message || 'Error occurred while removing device record.'
      });
    } finally {
      setIsRemovingDevices(false);
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

  const getDeviceIcon = (info: string) => {
    const lower = info.toLowerCase();
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return <Tablet className="w-4 h-4" />;
    }
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return <Smartphone className="w-4 h-4" />;
    }
    if (lower.includes('mac') || lower.includes('pc') || lower.includes('workstation') || lower.includes('windows') || lower.includes('linux')) {
      return <Laptop className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-750 shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">
                User Profile & Account Security
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Manage your credentials and cross-device sign-in records
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 space-y-5 overflow-y-auto max-h-[82vh]">
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
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Account</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
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
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Signed-in Devices: <strong className="text-slate-800 dark:text-slate-200">{signInRecords.length} Device{signInRecords.length === 1 ? '' : 's'}</strong></span>
              </div>
            </div>
          </div>

          {/* Navigation Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Credentials & Password</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'devices'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Devices & Sign-in Records</span>
              {otherDeviceRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full text-[9px] font-black">
                  {otherDeviceRecords.length} Other
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CREDENTIALS & PASSWORD */}
          {activeTab === 'credentials' && (
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

                {/* Password strength checklist */}
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
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
          )}

          {/* TAB 2: CONNECTED DEVICES & SIGN-IN RECORDS */}
          {activeTab === 'devices' && (
            <div className="space-y-5">
              {/* Device action notice */}
              <AnimatePresence>
                {deviceActionNotice && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -6 }}
                    className={`rounded-2xl p-3.5 flex items-start gap-3 text-xs leading-relaxed border ${
                      deviceActionNotice.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {deviceActionNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="font-semibold">{deviceActionNotice.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Master Control: Option to Remove Sign-in Records from Other Devices */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-800/40 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        <ShieldAlert className="w-4 h-4 text-indigo-400" />
                      </span>
                      <h4 className="text-xs sm:text-sm font-black tracking-tight text-white">
                        Multi-Device Session Revocation
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 max-w-md leading-relaxed">
                      Terminate sessions and remove sign-in records for all devices other than your current browser. Protect your account if you forgot to sign out on a shared or remote machine.
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      disabled={otherDeviceRecords.length === 0 || isRemovingDevices}
                      onClick={() => setShowConfirmRemoveAll(true)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition shadow-sm ${
                        otherDeviceRecords.length > 0
                          ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow-rose-900/50 hover:shadow-md'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-70'
                      }`}
                      title={
                        otherDeviceRecords.length > 0 
                          ? `Remove sign-in records from ${otherDeviceRecords.length} other device(s)`
                          : 'No other devices currently signed in'
                      }
                    >
                      {isRemovingDevices ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Revoking...</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-3.5 h-3.5" />
                          <span>
                            {otherDeviceRecords.length > 0 
                              ? `Remove Sign-in Records from Other Devices (${otherDeviceRecords.length})` 
                              : 'No Other Devices'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-[10.5px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Current Session: <strong className="text-slate-200">{currentDeviceRecord?.deviceInfo || 'This Browser'}</strong></span>
                  </div>
                  <span>
                    {otherDeviceRecords.length > 0 
                      ? `⚠️ ${otherDeviceRecords.length} other device session(s) active`
                      : '✓ Only this device is currently authorized'}
                  </span>
                </div>
              </div>

              {/* Section 1: This Device (Current Session) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                    <span>This Device (Current Session)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Active Now</span>
                  </span>
                </div>

                <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      {getDeviceIcon(currentDeviceRecord?.deviceInfo || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {currentDeviceRecord?.deviceInfo || 'Primary Web Workstation'}
                        </h4>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                          Primary Device
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">Location: <strong className="text-slate-800 dark:text-slate-200">{currentDeviceRecord?.location || 'Addis Ababa (EN)'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">IP / Network: <strong className="text-slate-800 dark:text-slate-200">{currentDeviceRecord?.ipAddress || '196.188.42.118'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">Signed in: <strong className="text-slate-800 dark:text-slate-200">{currentDeviceRecord?.signedInAt ? new Date(currentDeviceRecord.signedInAt).toLocaleDateString() : 'Today'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">Device ID: <strong className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{currentDeviceId.slice(0, 14)}...</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Other Devices */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Other Device Sign-in Records ({otherDeviceRecords.length})</span>
                  </span>
                  {otherDeviceRecords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmRemoveAll(true)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove All ({otherDeviceRecords.length})</span>
                    </button>
                  )}
                </div>

                {otherDeviceRecords.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No Other Devices Signed In
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Your account currently has no active sign-in records on other computers, tablets, or phones. Only this device is authorized.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {otherDeviceRecords.map((record) => (
                      <div 
                        key={record.id}
                        className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 group-hover:text-indigo-600 transition">
                            {getDeviceIcon(record.deviceInfo)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {record.deviceInfo}
                              </h5>
                              <span className="text-[9.5px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                Remote Session
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{record.location || 'Unknown Location'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{record.ipAddress || 'IP Encrypted'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Signed in: {new Date(record.signedInAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Last Active: {new Date(record.lastActiveAt || record.signedInAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Individual Device Removal Button */}
                        <div className="shrink-0 flex items-center justify-end sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setDeviceToRemove(record)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Remove this specific sign-in record and revoke access"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Remove Record</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Safety Check Confirmation Modal: Remove ALL other devices */}
        {showConfirmRemoveAll && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-3 animate-in fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Confirm Removal of Other Devices
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Revoke all {otherDeviceRecords.length} remote sign-in session(s)
                  </p>
                </div>
              </div>

              <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-3.5 border border-rose-200 dark:border-rose-900/50 space-y-2 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                <p className="font-semibold">
                  Are you sure you want to remove sign-in records for all other devices?
                </p>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  This action will immediately revoke authorization for those devices. Any active sessions on those computers or phones will be disconnected and signed out.
                </p>
              </div>

              {/* Preview of devices being purged */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Devices being removed:
                </span>
                {otherDeviceRecords.map(r => (
                  <div key={r.id} className="text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="truncate">{r.deviceInfo}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{r.location?.split('—')[0] || ''}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmRemoveAll(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRemoveOtherDevices}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm & Remove All</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Safety Check Confirmation Modal: Remove SINGLE specific device */}
        {deviceToRemove && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-3 animate-in fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Remove Sign-in Record
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-xs">
                    {deviceToRemove.deviceInfo}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <p className="font-semibold">
                  Are you sure you want to remove the sign-in record for this device?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Location: {deviceToRemove.location || 'Unknown'} • Signed in: {new Date(deviceToRemove.signedInAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceToRemove(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteRemoveSpecificDevice(deviceToRemove)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Device Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

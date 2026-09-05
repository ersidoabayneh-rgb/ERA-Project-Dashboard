import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HardHat, Lock, User, UserPlus, LogIn, Eye, EyeOff, Mail, Phone, Building2, Briefcase, CheckCircle2 } from 'lucide-react';
import { User as UserType } from '../types';
import eraLogo from '../assets/logo.png';
import { safeSaveSingleUser } from '../lib/apiSync';

interface LoginPageProps {
  onLoginSuccess: (username: string, userObj: UserType) => void;
  getUsers: () => UserType[];
  saveUsers: (users: UserType[]) => void;
}

export default function LoginPage({ onLoginSuccess, getUsers, saveUsers }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [showResetMessage, setShowResetMessage] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestedDirectorate, setRequestedDirectorate] = useState('Southern');
  const [requestedPmo, setRequestedPmo] = useState('PMO 1');
  const [requestedRole, setRequestedRole] = useState<'editor' | 'viewer' | 'approver'>('editor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [lastRegisteredUser, setLastRegisteredUser] = useState<UserType | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const users = getUsers();
    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (found) {
      if (found.isPendingApproval) {
        setError('Your registration is pending Master Admin approval. Please wait for an Administrator to approve your credentials.');
        return;
      }
      if (found.status === 'Inactive') {
        setError('Your account is Inactive. Please contact the Master Administrator to activate your account.');
        return;
      }
      onLoginSuccess(found.username, found);
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedFullName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please complete all required fields (Full Name, Username, Email, and Password).');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please provide a valid official email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one capital letter (A-Z).');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number (0-9).');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('Password must contain at least one special character (e.g., !@#$%^&*).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
      setError('Username already exists. Please choose a different username.');
      return;
    }

    const newUser: UserType = {
      username: trimmedUsername,
      fullName: trimmedFullName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      password: password,
      role: requestedRole,
      accessibleProjects: [],
      assignedDirectorate: requestedDirectorate,
      assignedPmo: requestedPmo,
      status: 'Inactive',
      isPendingApproval: true,
      registeredAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    safeSaveSingleUser(newUser).catch(() => {});
    
    // Broadcast immediate notification event
    try {
      window.dispatchEvent(new CustomEvent('new_user_registered', { detail: newUser }));
    } catch {}

    setLastRegisteredUser(newUser);
    setRegSuccess(true);
  };

  if (regSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
        {/* Abstract Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-40" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl rounded-3xl p-7 relative z-10 text-center space-y-4"
        >
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800 shadow-sm animate-pulse">
            <UserPlus className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
              Registration Submitted & Dispatched
            </span>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wide mt-2">
              Credentials Sent for Approval
            </h2>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            Thank you, <strong className="text-slate-900 dark:text-white font-bold">{lastRegisteredUser?.fullName || username}</strong>. Your account credentials have been registered and transmitted to the <strong>Master Administrator</strong> for verification and activation.
          </p>

          {/* Submitted credentials receipt summary card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
            <p className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-750 pb-1 flex justify-between">
              <span>Submitted Credentials Summary</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">⏳ Awaiting Approval</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Username:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{lastRegisteredUser?.username}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Full Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{lastRegisteredUser?.fullName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Official Email:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{lastRegisteredUser?.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Phone Number:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{lastRegisteredUser?.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Requested Directorate:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{lastRegisteredUser?.assignedDirectorate || 'Southern'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Requested Role:</span>
                <span className="font-bold capitalize text-amber-600 dark:text-amber-400">{lastRegisteredUser?.role || 'editor'}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 text-left text-xs text-amber-900 dark:text-amber-200 leading-snug">
            <p className="font-bold text-[11px] flex items-center gap-1.5 mb-1">
              <span>🛡️</span> What happens next?
            </p>
            <p className="text-[10px] text-slate-650 dark:text-slate-300">
              The Master Admin (or authorized Directorate Admin) will receive a real-time prompt to review your credentials, assign project contract authorizations, and activate your account. You can sign in as soon as your credentials have been approved.
            </p>
          </div>

          <button
            onClick={() => {
              setRegSuccess(false);
              setIsSignUp(false);
              setUsername('');
              setFullName('');
              setEmail('');
              setPhone('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            Return to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
        {/* Abstract Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-40" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl p-8 relative z-10 text-center space-y-4"
        >
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-100">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Reset Password Request
          </h2>
          <div className="h-0.5 w-16 bg-blue-500 mx-auto" />
          
          {!showResetMessage ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (resetUsername.trim()) {
                  setShowResetMessage(true);
                }
              }} 
              className="space-y-4 text-left mt-6"
            >
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 text-center leading-relaxed">
                Please enter your registered username below to submit a password reset request.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    autoFocus
                    required
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!resetUsername.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                Submit Reset Request
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-left mt-6">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed text-center">
                  Password reset request initiated for: <strong className="text-slate-900 dark:text-white font-black">{resetUsername}</strong>
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                    <span>📢</span> System Administrator Contact Instructions:
                  </p>
                  <p className="leading-relaxed">
                    For security compliance and IP-binding verification, password resets must be authorized by an ERA System Administrator.
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                    Please contact the ERA System Administrator / IT Department directly:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    <li><strong>Contact:</strong> ERA System Administrator / IT Helpdesk</li>
                    <li><strong>Internal Phone:</strong> Ext. 4400 / IT Services</li>
                    <li><strong>Email:</strong> admin@era.gov.et / it-support@era.gov.et</li>
                  </ul>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                    Provide your username ({resetUsername}) and Staff ID to receive your new temporary access credentials.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setIsForgotPassword(false);
              setShowResetMessage(false);
              setResetUsername('');
            }}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs shadow-sm transition hover:scale-105 cursor-pointer mt-4"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
      {/* Abstract Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-40" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full ${isSignUp ? 'max-w-xl' : 'max-w-md'} bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-3xl p-6 md:p-7 relative z-10 transition-all duration-300`}
      >
        <div className="flex flex-col items-center">
          {/* Logo representation */}
          {logoError ? (
            <div className="w-18 h-18 rounded-full flex items-center justify-center shadow-md mb-3 border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-full flex flex-col items-center justify-center border border-white/20">
                <span className="text-[16px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                <span className="text-[7px] font-bold text-white uppercase tracking-wider leading-none mt-1">Ethiopia</span>
              </div>
            </div>
          ) : (
            <div className="w-18 h-18 rounded-full flex items-center justify-center shadow-md mb-3 border border-slate-100 dark:border-slate-700/60 overflow-hidden bg-white">
              <img
                src={eraLogo}
                alt="Ethiopian Roads Administration Logo"
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-center">
            Ethiopian Roads Administration
          </h2>
          <div className="h-0.5 w-16 bg-amber-500 my-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
            {isSignUp 
              ? 'New User Registration — Submit Credentials for Master Admin Approval' 
              : 'Construction Projects Management Monitoring and Controlling System'}
          </p>
        </div>

        <div className="mt-6">
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-3.5">
            {isSignUp ? (
              <>
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Eng. Dawit Kebede"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Username *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. dawit.k"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Official Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. dawit.k@era.gov.et"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +251 911 234567"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Directorate & PMO Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Directorate Affiliation
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <select
                        value={requestedDirectorate}
                        onChange={(e) => setRequestedDirectorate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 font-semibold"
                      >
                        <option value="Southern">Southern Directorate</option>
                        <option value="Western">Western Directorate</option>
                        <option value="Central">Central Directorate</option>
                        <option value="Northern">Northern Directorate</option>
                        <option value="Eastern">Eastern Directorate</option>
                        <option value="Alemgena">Alemgena Directorate</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      PMO Group
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <select
                        value={requestedPmo}
                        onChange={(e) => setRequestedPmo(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 font-semibold"
                      >
                        <option value="PMO 1">PMO 1</option>
                        <option value="PMO 2">PMO 2</option>
                        <option value="PMO 3">PMO 3</option>
                        <option value="PMO 4">PMO 4</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Requested Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Requested System Role / Access Level
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 font-semibold"
                    >
                      <option value="editor">✏️ Editor — Submit Physical Progress, IPC & Contract Updates</option>
                      <option value="viewer">👁️ Viewer — Read-only Executive Oversight & Analytics</option>
                      <option value="approver">⚖️ Approver — Review & Certify Draft Changes & Variances</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className={isSignUp ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Password {isSignUp ? '*' : ''}
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                      }}
                      className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-9 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-2 pl-9 pr-9 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none transition-colors"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pt-1"
              >
                <div className="p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl space-y-1.5 text-slate-700 dark:text-slate-300">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <span>🛡️</span> Password Policy & Master Admin Approval
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug font-medium">
                    Your password must be at least <strong>8 characters</strong> long with uppercase, number, and special character. Upon submission, the Master Admin will be prompted in real-time to approve your credentials and configure your project access permissions.
                  </p>
                  <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] pt-1.5 border-t border-amber-500/15">
                    <li className={`flex items-center gap-1 font-bold ${password.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span>{password.length >= 8 ? '✓' : '•'}</span> 8+ chars
                    </li>
                    <li className={`flex items-center gap-1 font-bold ${/[A-Z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span>{/[A-Z]/.test(password) ? '✓' : '•'}</span> Uppercase
                    </li>
                    <li className={`flex items-center gap-1 font-bold ${/[0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span>{/[0-9]/.test(password) ? '✓' : '•'}</span> Number
                    </li>
                    <li className={`flex items-center gap-1 font-bold ${/[^a-zA-Z0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span>{/[^a-zA-Z0-9]/.test(password) ? '✓' : '•'}</span> Special char
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {error && (
              <p className="text-xs text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100 dark:border-rose-900/30 text-center font-bold">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 dark:shadow-none hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isSignUp ? 'Register & Submit Credentials for Approval' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-150 dark:border-slate-750 pt-3 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Return to Sign In' : 'Need an account? Register New User Credentials'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

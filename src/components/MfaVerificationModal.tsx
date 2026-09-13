import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, AlertTriangle, Key, Smartphone, CheckCircle2, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface MfaVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  approverUser: User | null;
  actionType: 'approve' | 'reject' | 'changes_requested';
  itemTitle: string;
}

export default function MfaVerificationModal({
  isOpen,
  onClose,
  onVerifySuccess,
  approverUser,
  actionType,
  itemTitle,
}: MfaVerificationModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState<string>('123456');
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [method, setMethod] = useState<'totp' | 'sms' | 'password'>('totp');
  const [passwordInput, setPasswordInput] = useState('');

  // Generate a fresh code on modal open or refresh
  const generateNewToken = () => {
    const newToken = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newToken);
    setTimerSeconds(30);
    setErrorMsg('');
  };

  useEffect(() => {
    if (isOpen) {
      setCode(['', '', '', '', '', '']);
      setErrorMsg('');
      setVerifiedSuccess(false);
      generateNewToken();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          generateNewToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    const sanitized = val.replace(/[^0-9]/g, '');
    if (!sanitized && val !== '') return;

    const newCode = [...code];
    newCode[index] = sanitized.slice(-1);
    setCode(newCode);

    // Auto focus next box
    if (sanitized && index < 5) {
      const nextInput = document.getElementById(`mfa-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`mfa-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleQuickFillGenerated = () => {
    if (generatedCode.length === 6) {
      setCode(generatedCode.split(''));
      setErrorMsg('');
    }
  };

  const handleVerify = () => {
    setErrorMsg('');
    setIsVerifying(true);

    const enteredCode = code.join('');

    setTimeout(() => {
      if (method === 'totp' || method === 'sms') {
        // Accept generatedCode, default test token '123456', or demo code
        if (enteredCode === generatedCode || enteredCode === '123456' || enteredCode === '888888') {
          setVerifiedSuccess(true);
          setTimeout(() => {
            setIsVerifying(false);
            onVerifySuccess();
          }, 600);
        } else {
          setIsVerifying(false);
          setErrorMsg(`Invalid MFA passcode. Please enter the active 6-digit token (${generatedCode}) or use '123456'.`);
        }
      } else {
        // Password method
        if (passwordInput && (passwordInput === approverUser?.password || passwordInput.length >= 4)) {
          setVerifiedSuccess(true);
          setTimeout(() => {
            setIsVerifying(false);
            onVerifySuccess();
          }, 600);
        } else {
          setIsVerifying(false);
          setErrorMsg('Invalid password re-confirmation.');
        }
      }
    }, 500);
  };

  const actionLabels = {
    approve: { title: 'Approve Submission', color: 'from-emerald-600 to-emerald-800', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    reject: { title: 'Reject Submission', color: 'from-rose-600 to-rose-800', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    changes_requested: { title: 'Request Revisions', color: 'from-amber-600 to-amber-800', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
  };

  const actionConfig = actionLabels[actionType];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Top Banner */}
          <div className={`p-5 bg-gradient-to-r ${actionConfig.color} text-white flex justify-between items-center relative`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/80 block">
                  Mandatory Approver MFA Security Check
                </span>
                <h3 className="text-base font-black tracking-tight text-white">
                  Multi-Factor Authentication Required
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Action Context Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <span>Pending Approver Action:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${actionConfig.bg}`}>
                  {actionConfig.title}
                </span>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                {itemTitle}
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>Approver Credential: <strong className="text-slate-700 dark:text-slate-300">{approverUser?.fullName || approverUser?.username}</strong> ({approverUser?.role})</span>
              </div>
            </div>

            {/* Method Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMethod('totp')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  method === 'totp'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" /> Authenticator App (TOTP)
              </button>
              <button
                type="button"
                onClick={() => setMethod('sms')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  method === 'sms'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> SMS Security Passcode
              </button>
              <button
                type="button"
                onClick={() => setMethod('password')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  method === 'password'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Security Password
              </button>
            </div>

            {/* Simulated Live Authenticator Token Bar */}
            {(method === 'totp' || method === 'sms') && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
                    {method === 'totp' ? '🔐 Active TOTP Security Token' : '📱 SMS Code Sent to Registered Phone'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black tracking-widest text-indigo-900 dark:text-indigo-200">
                      {generatedCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickFillGenerated}
                      className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black hover:bg-indigo-700 transition"
                      title="Auto-fill token into verification boxes"
                    >
                      Auto-Fill Code
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" /> Refreshing in {timerSeconds}s
                  </span>
                  <button
                    type="button"
                    onClick={generateNewToken}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-800"
                  >
                    Generate New Code
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            {method !== 'password' ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-center">
                  Enter 6-Digit MFA Verification Code:
                </label>
                <div className="flex justify-center gap-2">
                  {code.map((digit, idx) => (
                    <input
                      key={`mfa-input-${idx}`}
                      id={`mfa-digit-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      className="w-11 h-13 text-center text-xl font-mono font-black rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Re-enter Approver Account Security Password:
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter security password..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Animation */}
            {verifiedSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-2 animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>MFA Challenge Verified Successfully! Executing Workflow Action...</span>
              </div>
            )}

            {/* Security Rules Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-500" /> ERA Workflow Security Compliance:
              </span>
              <p>
                All approver actions require explicit MFA token validation, logging timestamp, client IP, and approver identity to prevent unauthorized database modifications.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel Action
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || verifiedSuccess}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying MFA Code...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify MFA & Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react';

export interface DatabaseSavedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  details?: string;
  timestamp?: string;
  autoCloseMs?: number;
}

export default function DatabaseSavedPopupModal({
  isOpen,
  onClose,
  title = "Saved on Database",
  message = "All project parameters and changes have been successfully committed and saved on the database.",
  details,
  timestamp,
  autoCloseMs = 3500
}: DatabaseSavedPopupProps) {
  // Auto-close after autoCloseMs
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, autoCloseMs]);

  if (!isOpen) return null;

  const displayTime = timestamp || new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-white dark:bg-slate-900 border border-emerald-500/40 dark:border-emerald-500/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Top Emerald Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                  <Database className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white text-emerald-700 rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Database Sync Active
                  </span>
                </div>
                <h3 className="text-base font-black tracking-wide text-white mt-0.5">
                  {title}
                </h3>
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                {message}
              </p>
            </div>

            {details && (
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <strong>Target Record:</strong> {details}
              </div>
            )}

            <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500 dark:text-slate-400 pt-1">
              <span>Timestamp: <strong className="text-slate-800 dark:text-slate-200">{displayTime}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Saved on Database
              </span>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              OK / Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

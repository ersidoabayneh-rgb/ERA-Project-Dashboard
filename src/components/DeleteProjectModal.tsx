import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Project } from '../types';

export interface DeleteProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (projectId: string) => void;
}

export default function DeleteProjectModal({
  project,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteProjectModalProps) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  const handleConfirm = () => {
    if (!isConfirmed) return;
    onConfirmDelete(project.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-850 border-2 border-rose-500/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>🛑 Permanent Project Deletion</span>
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-extrabold mt-0.5">
              Warning: This action permanently purges project data and cannot be undone.
            </p>
          </div>
        </div>

        {/* Target Project Overview Card */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
              Project Title:
            </span>
            <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              ID: {project.id}
            </span>
          </div>
          <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug">
            {project.name}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
            <div>
              <span className="font-bold text-slate-400">Directorate: </span>
              <span>{project.programDirectorate || 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400">PMO: </span>
              <span>{project.pmo || 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400">Contract Scope: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{project.lengthKm ? `${project.lengthKm} Km` : 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400">Contractor: </span>
              <span className="truncate block">{project.contractor || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* High Risk Notice Box */}
        <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-300 uppercase text-[10px] tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Scope of Impact</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-rose-800 dark:text-rose-300">
            Deleting this project will permanently remove all IPC financial records, physical progress logs, S-curves, monthly targets, risk logs, and historical baseline archives from offline storage and Firestore cloud databases.
          </p>
        </div>

        {/* Confirmation Input Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            To confirm permanent deletion, please type <strong className="font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">DELETE</strong> in the box below:
          </label>
          <div className="relative">
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold outline-none transition-all ${
                isConfirmed
                  ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-rose-500'
              }`}
              autoFocus
            />
            {isConfirmed && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute right-3 top-2.5" />
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Permanently Delete Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Timer, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  Trash2, 
  Settings, 
  X, 
  FileText, 
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';
import { Project, DlpDefectItem, DefectSeverity, DefectStatus, User as UserType } from '../types';
import { getProjectDlpInfo, DlpInfo } from '../lib/dlpUtils';

interface DlpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUserObj?: UserType | null;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
  onUpdateProjectStatus?: (id: string, status: any) => void;
}

export default function DlpDetailModal({
  isOpen,
  onClose,
  project,
  currentUserObj,
  onProjectUpdate,
  onUpdateProjectStatus
}: DlpDetailModalProps) {
  // Live ticking state (updates every second)
  const [currentTick, setCurrentTick] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const dlpInfo: DlpInfo = getProjectDlpInfo(project, currentTick);

  // Defect Form States
  const [isAddDefectOpen, setIsAddDefectOpen] = useState(false);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectLocation, setDefectLocation] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('Major');
  const [defectDescription, setDefectDescription] = useState('');
  const [defectReportedBy, setDefectReportedBy] = useState('');
  const [defectReportedAt, setDefectReportedAt] = useState('');

  // Settings edit mode states inside modal
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editDays, setEditDays] = useState(365);

  // Initialize form defaults when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setDefectReportedBy(currentUserObj?.username || (currentUserObj as any)?.name || 'Resident Engineer');
      setDefectReportedAt(new Date().toISOString().slice(0, 16));
      setEditStartDate(project.dlpStartDate || project.completionDate || '');
      setEditDays(project.dlpDays !== undefined ? project.dlpDays : 365);
    }
  }, [isOpen, project.id, currentUserObj]);

  if (!isOpen) return null;

  const defectsList: DlpDefectItem[] = project.dlpDefects || [];

  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectTitle.trim()) return;

    const newDefect: DlpDefectItem = {
      id: 'defect_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: defectTitle.trim(),
      stationOrLocation: defectLocation.trim() || undefined,
      severity: defectSeverity,
      status: 'Reported / Pending',
      description: defectDescription.trim() || 'No detailed notes provided.',
      reportedBy: defectReportedBy.trim() || 'Inspector',
      reportedAt: defectReportedAt ? new Date(defectReportedAt).toISOString() : new Date().toISOString()
    };

    const updatedDefects = [newDefect, ...defectsList];

    if (onProjectUpdate) {
      onProjectUpdate({
        dlpDefects: updatedDefects
      }, `New DLP Defect Logged: "${newDefect.title}"`);
    }

    // Reset form
    setDefectTitle('');
    setDefectLocation('');
    setDefectSeverity('Major');
    setDefectDescription('');
    setIsAddDefectOpen(false);
  };

  const handleUpdateDefectStatus = (defectId: string, newStatus: DefectStatus) => {
    const updated = defectsList.map(d => {
      if (d.id === defectId) {
        return {
          ...d,
          status: newStatus,
          rectifiedAt: newStatus === 'Resolved / Approved' ? new Date().toISOString() : d.rectifiedAt
        };
      }
      return d;
    });

    if (onProjectUpdate) {
      onProjectUpdate({
        dlpDefects: updated
      }, `DLP Defect Status updated to ${newStatus}`);
    }
  };

  const handleDeleteDefect = (defectId: string) => {
    if (!window.confirm('Are you sure you want to delete this reported defect record?')) return;
    const updated = defectsList.filter(d => d.id !== defectId);
    if (onProjectUpdate) {
      onProjectUpdate({
        dlpDefects: updated
      }, 'DLP Defect Record Deleted');
    }
  };

  const handleSaveSettings = () => {
    if (onProjectUpdate) {
      onProjectUpdate({
        dlpStartDate: editStartDate.trim() ? editStartDate.trim() : undefined,
        dlpDays: editDays
      }, 'Defect Liability Period Settings & Start Date updated');
    }
    setIsEditingSettings(false);
  };

  const criticalCount = defectsList.filter(d => d.severity === 'Critical').length;
  const pendingCount = defectsList.filter(d => d.status !== 'Resolved / Approved').length;
  const resolvedCount = defectsList.filter(d => d.status === 'Resolved / Approved').length;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Modal Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                dlpInfo.isExpired 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : dlpInfo.isNearExpiry 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white">
                    Defect Liability Period (DLP) Management
                  </h2>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    dlpInfo.isExpired
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : dlpInfo.isNearExpiry
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : dlpInfo.isCountingDown
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {dlpInfo.statusLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  Project: <strong className="text-white">{project.name}</strong> • Classification / Contract: {project.classification || project.contractType || 'ERA Highway'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Container (Scrollable) */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            
            {/* 1. Automated Real-Time Ticker & Progress Card */}
            <div className={`p-4 rounded-xl border shadow-xs ${
              dlpInfo.isExpired
                ? 'bg-gradient-to-r from-slate-900 to-blue-950 border-blue-500/40 text-white'
                : dlpInfo.isNearExpiry
                  ? 'bg-gradient-to-r from-slate-900 to-amber-950 border-amber-500/40 text-white'
                  : dlpInfo.isCountingDown
                    ? 'bg-gradient-to-r from-slate-900 to-emerald-950 border-emerald-500/40 text-white'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Timer className={`w-4 h-4 ${dlpInfo.isCountingDown ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
                  <span className="text-xs font-black uppercase tracking-wider font-mono">
                    {dlpInfo.isCountingDown ? '⚡ Real-Time Automated Countdown Ticker' : 'DLP Settings & Configuration'}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditingSettings(!isEditingSettings)}
                  className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition border border-white/20 cursor-pointer self-start sm:self-auto"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEditingSettings ? 'Close Settings' : 'Configure DLP Start Date & Settings'}</span>
                </button>
              </div>

              {/* Inline Settings Editor */}
              {isEditingSettings ? (
                <div className="bg-black/40 backdrop-blur-xs p-3 rounded-xl border border-white/20 mb-3 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-300 block mb-1">
                        Assign DLP Start Date
                      </label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 px-2.5 py-1 rounded font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditStartDate(new Date().toISOString().split('T')[0])}
                          className="text-[8px] font-mono px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-slate-200 cursor-pointer"
                        >
                          Today
                        </button>
                        {project.completionDate && (
                          <button
                            type="button"
                            onClick={() => setEditStartDate(project.completionDate || '')}
                            className="text-[8px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 cursor-pointer"
                          >
                            Comp Date ({project.completionDate})
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-300 block mb-1">
                        DLP Duration (Calendar Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editDays}
                        onChange={(e) => setEditDays(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-900 text-white border border-slate-700 px-2.5 py-1 rounded font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        {[365, 730, 1095].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setEditDays(d)}
                            className="text-[8px] font-mono px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-slate-200 cursor-pointer"
                          >
                            {d}d ({d/365} Yr)
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEditingSettings(false)}
                      className="px-2.5 py-1 bg-white/10 text-slate-300 rounded text-[11px] font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Save DLP Settings</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Digital Clock Boxes */}
              {dlpInfo.isCountingDown ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">{dlpInfo.daysRemaining}</span>
                    <span className="text-[8.5px] font-mono uppercase text-slate-400 block tracking-wider">Days Remaining</span>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">{pad(dlpInfo.hoursRemaining)}</span>
                    <span className="text-[8.5px] font-mono uppercase text-slate-400 block tracking-wider">Hours</span>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">{pad(dlpInfo.minutesRemaining)}</span>
                    <span className="text-[8.5px] font-mono uppercase text-slate-400 block tracking-wider">Minutes</span>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 text-center">
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">{pad(dlpInfo.secondsRemaining)}</span>
                    <span className="text-[8.5px] font-mono uppercase text-slate-400 block tracking-wider">Seconds (Live)</span>
                  </div>
                </div>
              ) : null}

              {/* Governance & Dates Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono border-t border-white/10 pt-2 mb-2">
                <div>
                  <span className="text-slate-400 block">DLP Start Date</span>
                  <span className="font-bold text-white">{dlpInfo.startDateStr}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Target Handover Date</span>
                  <span className="font-bold text-white">{dlpInfo.endDateStr}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">DLP Duration</span>
                  <span className="font-bold text-white">{dlpInfo.dlpDays} Calendar Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Elapsed Ratio</span>
                  <span className="font-bold text-white">{dlpInfo.daysElapsed}d ({dlpInfo.elapsedPct.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dlpInfo.isExpired ? 'bg-blue-500' : dlpInfo.isNearExpiry ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${dlpInfo.elapsedPct}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-300 mt-2 font-sans flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{dlpInfo.alertMessage}</span>
              </p>
            </div>

            {/* 2. Defect Reporting & Logged Items Section */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white tracking-wide">
                      Reported Road Asset Defects ({defectsList.length})
                    </h3>
                    <div className="flex items-center gap-1">
                      {criticalCount > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-900">
                          {criticalCount} Critical
                        </span>
                      )}
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900">
                        {pendingCount} Active
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900">
                        {resolvedCount} Resolved
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Log and track defects for contractor rectification during the Defect Liability Period prior to Final Acceptance Certificate (FAC).
                  </p>
                </div>

                <button
                  onClick={() => setIsAddDefectOpen(!isAddDefectOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddDefectOpen ? 'Cancel Logging' : 'Log New Defect'}</span>
                </button>
              </div>

              {/* Add Defect Form Component */}
              <AnimatePresence>
                {isAddDefectOpen && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddDefect}
                    className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 rounded-xl p-3.5 space-y-3 overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        Log New DLP Defect & Inspection Flaw
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">Form ID: DEF-{Date.now().toString().slice(-4)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                          Defect Title / Feature Summary *
                        </label>
                        <input
                          type="text"
                          required
                          value={defectTitle}
                          onChange={(e) => setDefectTitle(e.target.value)}
                          placeholder="e.g. Longitudinal Pavement Cracking & Subgrade Settlement"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                        />
                      </div>

                      {/* Station / Location */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                          Chainage / Station / Location
                        </label>
                        <input
                          type="text"
                          value={defectLocation}
                          onChange={(e) => setDefectLocation(e.target.value)}
                          placeholder="e.g. Km 45+200 to 45+600, NB Lane"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                        />
                      </div>

                      {/* Severity Level */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                          Severity Classification *
                        </label>
                        <select
                          value={defectSeverity}
                          onChange={(e) => setDefectSeverity(e.target.value as DefectSeverity)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                        >
                          <option value="Critical">🔴 Critical (Immediate Hazard / Structural)</option>
                          <option value="Major">🟠 Major (Significant Functional Defect)</option>
                          <option value="Minor">🔵 Minor (Surface / Aesthetic Flaw)</option>
                          <option value="Low">⚪ Low (Routine Maintenance Touch-up)</option>
                        </select>
                      </div>

                      {/* Reported By & Timestamp */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                            Reported By
                          </label>
                          <input
                            type="text"
                            value={defectReportedBy}
                            onChange={(e) => setDefectReportedBy(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-900 dark:text-white outline-none font-medium text-2xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                            Logged Timestamp
                          </label>
                          <input
                            type="datetime-local"
                            value={defectReportedAt}
                            onChange={(e) => setDefectReportedAt(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-900 dark:text-white outline-none font-mono text-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                        Detailed Defect Notes & Remedial Requirements
                      </label>
                      <textarea
                        rows={2}
                        value={defectDescription}
                        onChange={(e) => setDefectDescription(e.target.value)}
                        placeholder="Provide engineering observations, cause analysis, and required contractor rectification works..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 text-xs font-normal"
                      />
                    </div>

                    {/* Form Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsAddDefectOpen(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Log Defect Record</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Defect Cards List */}
              {defectsList.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No defects logged yet for this Defect Liability Period
                  </p>
                  <p className="text-[10.5px] text-slate-400 max-w-md mx-auto mt-0.5">
                    Click the "Log New Defect" button above to record road asset defects, pavement distresses, or snagging items during joint site inspections.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {defectsList.map((defect) => {
                    const isCritical = defect.severity === 'Critical';
                    const isMajor = defect.severity === 'Major';
                    const isMinor = defect.severity === 'Minor';
                    const isResolved = defect.status === 'Resolved / Approved';

                    return (
                      <div
                        key={defect.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isResolved
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                            : isCritical
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                              : isMajor
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Severity Pill */}
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                : isMajor
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                  : isMinor
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}>
                              {defect.severity} Severity
                            </span>

                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {defect.title}
                            </h4>

                            {defect.stationOrLocation && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {defect.stationOrLocation}
                              </span>
                            )}
                          </div>

                          {/* Status Dropdown */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            <select
                              value={defect.status}
                              onChange={(e) => handleUpdateDefectStatus(defect.id, e.target.value as DefectStatus)}
                              className={`text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-lg border outline-none cursor-pointer ${
                                isResolved
                                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                                  : defect.status === 'Rectification In Progress'
                                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                    : 'bg-rose-100 dark:bg-rose-900 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              <option value="Reported / Pending">🔴 Reported / Pending</option>
                              <option value="In Inspection">🔍 In Inspection</option>
                              <option value="Rectification In Progress">⚙️ Rectification In Progress</option>
                              <option value="Resolved / Approved">✅ Resolved / Approved</option>
                            </select>

                            <button
                              onClick={() => handleDeleteDefect(defect.id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete Defect Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 my-1.5 font-normal leading-relaxed">
                          {defect.description}
                        </p>

                        {/* Footer Metadata */}
                        <div className="flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400 pt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Reported by <strong className="text-slate-700 dark:text-slate-300">{defect.reportedBy}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Logged: {new Date(defect.reportedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>
              Defect Liability Period governance according to FIDIC / ERA General Conditions of Contract.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

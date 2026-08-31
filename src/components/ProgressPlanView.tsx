import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Calendar, 
  RefreshCcw, 
  Save, 
  Trash2, 
  CalendarClock, 
  History, 
  CheckCircle, 
  Eye, 
  X, 
  RotateCcw, 
  Edit3,
  Check,
  PlusCircle,
  Undo2,
  Sparkles,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { Project, ProgressPlan, ProgressPlanHistoryItem } from '../types';

interface ProgressPlanViewProps {
  project: Project;
  onUpdateProgressPlan: (plan: ProgressPlan, labels: { monthLabel: string; quarterLabel: string; efyLabel: string }) => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
}

export default function ProgressPlanView({ project, onUpdateProgressPlan, onProjectUpdate }: ProgressPlanViewProps) {
  const plan: ProgressPlan = project.progressPlan || {
    contractor: { month: 0, quarter: 0, efy: 0, todate: 0 },
    era: { month: 0, quarter: 0, efy: 0, todate: 0 },
    actual: { month: 0, quarter: 0, efy: 0, todate: 0 }
  };

  const labels = project.progressPlanLabels || {
    monthLabel: 'Month',
    quarterLabel: 'Quarter',
    efyLabel: 'EFY'
  };

  const historyList = project.progressPlanHistory || [];

  // Local state for the archiver / update form inputs
  const [newMonthLabel, setNewMonthLabel] = useState(labels.monthLabel);
  const [newQuarterLabel, setNewQuarterLabel] = useState(labels.quarterLabel);
  const [newEfyLabel, setNewEfyLabel] = useState(labels.efyLabel);

  // Active loaded history item tracking
  const [activeLoadedRecordId, setActiveLoadedRecordId] = useState<string | null>(null);
  const [activeLoadedOriginal, setActiveLoadedOriginal] = useState<ProgressPlanHistoryItem | null>(null);

  // Modal states
  const [inspectingItem, setInspectingItem] = useState<ProgressPlanHistoryItem | null>(null);
  const [editingModalItem, setEditingModalItem] = useState<ProgressPlanHistoryItem | null>(null);

  // Feedback notification
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Live project snapshot so user can easily return to live tracking figures
  const [liveSnapshot, setLiveSnapshot] = useState<{
    plan: ProgressPlan;
    labels: { monthLabel: string; quarterLabel: string; efyLabel: string };
    physicalProgress?: number;
  } | null>(() => ({
    plan: JSON.parse(JSON.stringify(plan)),
    labels: JSON.parse(JSON.stringify(labels)),
    physicalProgress: project.physicalProgress,
  }));

  // Reset active loaded state if project switches
  useEffect(() => {
    setActiveLoadedRecordId(null);
    setActiveLoadedOriginal(null);
    const freshPlan = project.progressPlan || {
      contractor: { month: 0, quarter: 0, efy: 0, todate: 0 },
      era: { month: 0, quarter: 0, efy: 0, todate: 0 },
      actual: { month: 0, quarter: 0, efy: 0, todate: 0 }
    };
    const freshLabels = project.progressPlanLabels || {
      monthLabel: 'Month',
      quarterLabel: 'Quarter',
      efyLabel: 'EFY'
    };
    setLiveSnapshot({
      plan: JSON.parse(JSON.stringify(freshPlan)),
      labels: JSON.parse(JSON.stringify(freshLabels)),
      physicalProgress: project.physicalProgress,
    });
    setNewMonthLabel(freshLabels.monthLabel);
    setNewQuarterLabel(freshLabels.quarterLabel);
    setNewEfyLabel(freshLabels.efyLabel);
  }, [project.id]);

  // Keep live snapshot updated when user makes manual live changes outside reload mode
  useEffect(() => {
    if (activeLoadedRecordId === null) {
      setLiveSnapshot({
        plan: JSON.parse(JSON.stringify(plan)),
        labels: JSON.parse(JSON.stringify(labels)),
        physicalProgress: project.physicalProgress,
      });
      setNewMonthLabel(labels.monthLabel);
      setNewQuarterLabel(labels.quarterLabel);
      setNewEfyLabel(labels.efyLabel);
    }
  }, [activeLoadedRecordId, plan, labels, project.physicalProgress]);

  const handleFieldChange = (tier: keyof ProgressPlan, key: keyof typeof plan.contractor, val: string) => {
    const value = parseFloat(val) || 0;
    const updatedPlan: ProgressPlan = {
      ...plan,
      [tier]: {
        ...plan[tier],
        [key]: value
      }
    };
    onUpdateProgressPlan(updatedPlan, labels);
  };

  const handleLabelChange = (field: keyof typeof labels, value: string) => {
    const updatedLabels = {
      ...labels,
      [field]: value
    };
    if (field === 'monthLabel') setNewMonthLabel(value);
    if (field === 'quarterLabel') setNewQuarterLabel(value);
    if (field === 'efyLabel') setNewEfyLabel(value);
    onUpdateProgressPlan(plan, updatedLabels);
  };

  // 1. Update Currently Loaded History Record (Overwrite active loaded record in history)
  const handleUpdateLoadedHistoryItem = () => {
    if (!activeLoadedRecordId) return;

    const actualKm = plan.actual.todate || plan.actual.month;
    const computedPhysProgress = project.lengthKm > 0 
      ? Number(((actualKm / project.lengthKm) * 100).toFixed(2))
      : (typeof project.physicalProgress === 'number' ? project.physicalProgress : 0);

    const updatedItem: ProgressPlanHistoryItem = {
      id: activeLoadedRecordId,
      monthLabel: newMonthLabel.trim() || labels.monthLabel,
      quarterLabel: newQuarterLabel.trim() || labels.quarterLabel,
      efyLabel: newEfyLabel.trim() || labels.efyLabel,
      contractorMonth: plan.contractor.month,
      contractorQuarter: plan.contractor.quarter,
      contractorEfy: plan.contractor.efy,
      contractorTodate: plan.contractor.todate,
      eraMonth: plan.era.month,
      eraQuarter: plan.era.quarter,
      eraEfy: plan.era.efy,
      eraTodate: plan.era.todate,
      actualMonth: plan.actual.month,
      actualQuarter: plan.actual.quarter,
      actualEfy: plan.actual.efy,
      actualTodate: plan.actual.todate,
      physicalProgress: computedPhysProgress,
    };

    const updatedLabels = {
      monthLabel: updatedItem.monthLabel,
      quarterLabel: updatedItem.quarterLabel || labels.quarterLabel,
      efyLabel: updatedItem.efyLabel,
    };

    const updatedHistory = historyList.map(item => 
      item.id === activeLoadedRecordId ? updatedItem : item
    );

    setActiveLoadedOriginal(JSON.parse(JSON.stringify(updatedItem)));

    if (onProjectUpdate) {
      onProjectUpdate({ 
        progressPlan: plan,
        progressPlanLabels: updatedLabels,
        progressPlanHistory: updatedHistory,
        physicalProgress: computedPhysProgress
      }, `Updated archived record for ${updatedItem.monthLabel} (EFY ${updatedItem.efyLabel})`);
    }

    onUpdateProgressPlan(plan, updatedLabels);
    showToast(`Successfully updated archived record for ${updatedItem.monthLabel} (EFY ${updatedItem.efyLabel})!`);
  };

  // 2. Add / Archive Record as a New Entry
  const handleSaveToHistory = () => {
    if (!newMonthLabel.trim()) return;

    const actualKm = plan.actual.todate || plan.actual.month;
    const computedPhysProgress = project.lengthKm > 0 
      ? Number(((actualKm / project.lengthKm) * 100).toFixed(2))
      : (typeof project.physicalProgress === 'number' ? project.physicalProgress : 0);

    const newItem: ProgressPlanHistoryItem = {
      id: 'hist_' + Date.now(),
      monthLabel: newMonthLabel.trim(),
      quarterLabel: newQuarterLabel.trim() || labels.quarterLabel,
      efyLabel: newEfyLabel.trim() || labels.efyLabel,
      contractorMonth: plan.contractor.month,
      contractorQuarter: plan.contractor.quarter,
      contractorEfy: plan.contractor.efy,
      contractorTodate: plan.contractor.todate,
      eraMonth: plan.era.month,
      eraQuarter: plan.era.quarter,
      eraEfy: plan.era.efy,
      eraTodate: plan.era.todate,
      actualMonth: plan.actual.month,
      actualQuarter: plan.actual.quarter,
      actualEfy: plan.actual.efy,
      actualTodate: plan.actual.todate,
      physicalProgress: computedPhysProgress,
    };

    // Filter out duplicate month & EFY combos if user intentionally saves
    const filteredHistory = historyList.filter(
      item => !(item.monthLabel.toLowerCase() === newItem.monthLabel.toLowerCase() && item.efyLabel === newItem.efyLabel)
    );

    const updatedHistory = [newItem, ...filteredHistory];

    if (onProjectUpdate) {
      onProjectUpdate({ progressPlanHistory: updatedHistory }, `Archived milestone record for ${newItem.monthLabel} (EFY ${newItem.efyLabel})`);
    }
    showToast(`Archived milestone snapshot for ${newItem.monthLabel} (EFY ${newItem.efyLabel})`);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updatedHistory = historyList.filter(item => item.id !== id);
    if (activeLoadedRecordId === id) {
      setActiveLoadedRecordId(null);
      setActiveLoadedOriginal(null);
    }
    if (onProjectUpdate) {
      onProjectUpdate({ progressPlanHistory: updatedHistory }, 'Deleted archived milestone record');
    }
    showToast('Deleted archived record from history');
  };

  // Reload/Restore monthly save data: restores ALL targets saved for that month,
  // including cumulative save at that month and the EFY saved with that month!
  const handleRestoreHistoryItem = (item: ProgressPlanHistoryItem) => {
    const updatedPlan: ProgressPlan = {
      contractor: {
        month: item.contractorMonth,
        quarter: item.contractorQuarter !== undefined ? item.contractorQuarter : (plan.contractor.quarter || 0),
        efy: item.contractorEfy,
        todate: item.contractorTodate !== undefined ? item.contractorTodate : (plan.contractor.todate || 0),
      },
      era: {
        month: item.eraMonth,
        quarter: item.eraQuarter !== undefined ? item.eraQuarter : (plan.era.quarter || 0),
        efy: item.eraEfy,
        todate: item.eraTodate !== undefined ? item.eraTodate : (plan.era.todate || 0),
      },
      actual: {
        month: item.actualMonth,
        quarter: item.actualQuarter !== undefined ? item.actualQuarter : (plan.actual.quarter || 0),
        efy: item.actualEfy,
        todate: item.actualTodate !== undefined ? item.actualTodate : (plan.actual.todate || 0),
      }
    };

    const updatedLabels = {
      monthLabel: item.monthLabel,
      quarterLabel: item.quarterLabel || labels.quarterLabel,
      efyLabel: item.efyLabel,
    };

    setActiveLoadedRecordId(item.id);
    setActiveLoadedOriginal(JSON.parse(JSON.stringify(item)));
    setNewMonthLabel(item.monthLabel);
    if (item.quarterLabel) setNewQuarterLabel(item.quarterLabel);
    setNewEfyLabel(item.efyLabel);

    const updatePayload: Partial<Project> = {
      progressPlan: updatedPlan,
      progressPlanLabels: updatedLabels,
    };
    if (typeof item.physicalProgress === 'number') {
      updatePayload.physicalProgress = item.physicalProgress;
    }

    if (onProjectUpdate) {
      onProjectUpdate(updatePayload, `Reloaded archived targets for ${item.monthLabel} (EFY ${item.efyLabel})`);
    }
    onUpdateProgressPlan(updatedPlan, updatedLabels);
    if (inspectingItem) setInspectingItem(null);
    showToast(`Loaded ${item.monthLabel} (EFY ${item.efyLabel}) into editor - you can now edit and update all values!`);
  };

  // Reset current inputs back to the originally loaded historical record
  const handleResetToLoadedOriginal = () => {
    if (!activeLoadedOriginal) return;
    handleRestoreHistoryItem(activeLoadedOriginal);
    showToast(`Reset values back to original ${activeLoadedOriginal.monthLabel} save`);
  };

  // Revert back to the live project targets & EFY
  const handleRestoreLiveFigures = () => {
    if (!liveSnapshot) return;
    setActiveLoadedRecordId(null);
    setActiveLoadedOriginal(null);
    setNewMonthLabel(liveSnapshot.labels.monthLabel);
    setNewQuarterLabel(liveSnapshot.labels.quarterLabel);
    setNewEfyLabel(liveSnapshot.labels.efyLabel);

    const updatePayload: Partial<Project> = {
      progressPlan: liveSnapshot.plan,
      progressPlanLabels: liveSnapshot.labels,
    };
    if (typeof liveSnapshot.physicalProgress === 'number') {
      updatePayload.physicalProgress = liveSnapshot.physicalProgress;
    }

    if (onProjectUpdate) {
      onProjectUpdate(updatePayload, `Restored live active tracking figures (EFY ${liveSnapshot.labels.efyLabel})`);
    }
    onUpdateProgressPlan(liveSnapshot.plan, liveSnapshot.labels);
    showToast(`Switched back to live active tracking (EFY ${liveSnapshot.labels.efyLabel})`, 'info');
  };

  // 3. Save direct edits from the Edit Modal
  const handleSaveModalEdit = (edited: ProgressPlanHistoryItem) => {
    const actualKm = edited.actualTodate !== undefined ? edited.actualTodate : edited.actualMonth;
    const computedPhysProgress = project.lengthKm > 0 
      ? Number(((actualKm / project.lengthKm) * 100).toFixed(2))
      : (typeof edited.physicalProgress === 'number' ? edited.physicalProgress : 0);

    const finalizedItem: ProgressPlanHistoryItem = {
      ...edited,
      physicalProgress: computedPhysProgress,
    };

    const updatedHistory = historyList.map(item => 
      item.id === finalizedItem.id ? finalizedItem : item
    );

    const updatePayload: Partial<Project> = {
      progressPlanHistory: updatedHistory,
    };

    // If this record is currently loaded in the main table, sync it live
    if (activeLoadedRecordId === finalizedItem.id) {
      const updatedPlan: ProgressPlan = {
        contractor: {
          month: finalizedItem.contractorMonth,
          quarter: finalizedItem.contractorQuarter || 0,
          efy: finalizedItem.contractorEfy,
          todate: finalizedItem.contractorTodate || 0,
        },
        era: {
          month: finalizedItem.eraMonth,
          quarter: finalizedItem.eraQuarter || 0,
          efy: finalizedItem.eraEfy,
          todate: finalizedItem.eraTodate || 0,
        },
        actual: {
          month: finalizedItem.actualMonth,
          quarter: finalizedItem.actualQuarter || 0,
          efy: finalizedItem.actualEfy,
          todate: finalizedItem.actualTodate || 0,
        }
      };
      const updatedLabels = {
        monthLabel: finalizedItem.monthLabel,
        quarterLabel: finalizedItem.quarterLabel || labels.quarterLabel,
        efyLabel: finalizedItem.efyLabel,
      };
      updatePayload.progressPlan = updatedPlan;
      updatePayload.progressPlanLabels = updatedLabels;
      updatePayload.physicalProgress = computedPhysProgress;
      setActiveLoadedOriginal(JSON.parse(JSON.stringify(finalizedItem)));
      onUpdateProgressPlan(updatedPlan, updatedLabels);
    }

    if (onProjectUpdate) {
      onProjectUpdate(updatePayload, `Edited archived record for ${finalizedItem.monthLabel} (EFY ${finalizedItem.efyLabel})`);
    }

    setEditingModalItem(null);
    showToast(`Saved updates for archived record: ${finalizedItem.monthLabel}`);
  };

  const activeLoadedItem = historyList.find(h => h.id === activeLoadedRecordId);

  const previewActualKm = plan.actual.todate || plan.actual.month;
  const computedPhysProgress = project.lengthKm > 0 
    ? Number(((previewActualKm / project.lengthKm) * 100).toFixed(2))
    : (typeof project.physicalProgress === 'number' ? project.physicalProgress : 0);

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{feedbackToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Label Configs */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                Progress Plan Mileage Comparisons (Km)
                {activeLoadedRecordId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Editing Reloaded Record: {labels.monthLabel}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Comparison sheet of monthly, quarterly, EFY, and cumulative progress milestones. All figures and labels can be edited and updated live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {activeLoadedRecordId ? (
              <>
                <button
                  onClick={handleUpdateLoadedHistoryItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  title={`Save edits to archived record for ${labels.monthLabel}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  Save & Update {labels.monthLabel}
                </button>
                <button
                  onClick={handleRestoreLiveFigures}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-sm"
                  title="Switch back to active project tracking"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Return to Live Tracking
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Dynamic Headers Setup */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Month Tracking Period:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.monthLabel}
                onChange={(e) => handleLabelChange('monthLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Quarterly Range:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.quarterLabel}
                onChange={(e) => handleLabelChange('quarterLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Ethiopian Fiscal Year (EFY):</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.efyLabel}
                onChange={(e) => handleLabelChange('efyLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 font-mono font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active Reloaded Archive Notification Banner & In-Place Updater */}
      {activeLoadedRecordId && activeLoadedItem && (
        <motion.div 
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-blue-900 dark:text-blue-100">
                  Editing Reloaded Milestone: {activeLoadedItem.monthLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-mono">
                  EFY {labels.efyLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-700">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Live Editable in Spreadsheet Below
                </span>
              </div>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-200/90 leading-relaxed">
                You can edit any cell in the table below (Month, Quarter, EFY, and Cumulative To-Date). When done, click <strong>"Save & Update {labels.monthLabel}"</strong> to permanently update this archived record and keep history synchronized.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleUpdateLoadedHistoryItem}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save & Update Record
            </button>
            <button
              onClick={handleResetToLoadedOriginal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
              title="Discard edits made to this reloaded record"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleRestoreLiveFigures}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Exit to Live
            </button>
          </div>
        </motion.div>
      )}

      {/* Spreadsheet Input */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                <th className="p-3">Plan/Actual Tier Category</th>
                <th className="p-3 text-center">
                  <span className="block font-extrabold text-slate-700 dark:text-slate-200">{labels.monthLabel}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Month (Km)</span>
                </th>
                <th className="p-3 text-center">
                  <span className="block font-extrabold text-slate-700 dark:text-slate-200">{labels.quarterLabel}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Quarter (Km)</span>
                </th>
                <th className="p-3 text-center">
                  <span className="block font-extrabold text-slate-700 dark:text-slate-200">EFY {labels.efyLabel}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Fiscal Year (Km)</span>
                </th>
                <th className="p-3 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="block">Cumulative To-Date</span>
                  <span className="text-[10px] text-blue-500 dark:text-blue-400 font-normal">Saved at this Month (Km)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {/* Contractor */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <td className="p-3 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                  Contractor Program Schedule
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.month}
                    onChange={(e) => handleFieldChange('contractor', 'month', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.quarter}
                    onChange={(e) => handleFieldChange('contractor', 'quarter', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.efy}
                    onChange={(e) => handleFieldChange('contractor', 'efy', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.todate}
                    onChange={(e) => handleFieldChange('contractor', 'todate', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-center font-mono py-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
              </tr>

              {/* ERA Milestone */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <td className="p-3 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-500 rounded-sm" />
                  ERA Approved Milestone Plan
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.month}
                    onChange={(e) => handleFieldChange('era', 'month', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-slate-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.quarter}
                    onChange={(e) => handleFieldChange('era', 'quarter', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-slate-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.efy}
                    onChange={(e) => handleFieldChange('era', 'efy', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs font-semibold focus:ring-1 focus:ring-slate-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.todate}
                    onChange={(e) => handleFieldChange('era', 'todate', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono py-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold focus:ring-1 focus:ring-slate-500 outline-none"
                  />
                </td>
              </tr>

              {/* Actual Completed */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors bg-emerald-50/10 dark:bg-emerald-950/5">
                <td className="p-3 font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                  Actual Road Completed (Km)
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.month}
                    onChange={(e) => handleFieldChange('actual', 'month', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-center font-mono py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.quarter}
                    onChange={(e) => handleFieldChange('actual', 'quarter', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-center font-mono py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.efy}
                    onChange={(e) => handleFieldChange('actual', 'efy', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-center font-mono py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.todate}
                    onChange={(e) => handleFieldChange('actual', 'todate', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-dashed border-emerald-500 dark:border-emerald-400 rounded-lg text-center text-emerald-600 dark:text-emerald-400 font-black py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none shadow-2xs"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>



      {/* Persistence, Updating, and Archiving Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Archive / Update Form Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeLoadedRecordId ? (
                <Edit3 className="w-4.5 h-4.5 text-emerald-600" />
              ) : (
                <Save className="w-4.5 h-4.5 text-indigo-500" />
              )}
              <span className="text-xs font-bold text-slate-850 dark:text-zinc-150 block uppercase">
                {activeLoadedRecordId ? 'Update Reloaded Record' : 'Archive Elapsed Month'}
              </span>
            </div>
            {activeLoadedRecordId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold font-mono">
                Active Edit Mode
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            {activeLoadedRecordId 
              ? `Update figures for ${labels.monthLabel} (EFY ${labels.efyLabel}) or save as a new snapshot under a new label.`
              : 'Record Contractor program, ERA milestone plan, and Actual completed measurements to lock and secure historical performance for that month.'
            }
          </p>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">Month Label</label>
                <input
                  type="text"
                  value={newMonthLabel}
                  onChange={(e) => {
                    setNewMonthLabel(e.target.value);
                    handleLabelChange('monthLabel', e.target.value);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-indigo-500 font-medium"
                  placeholder="e.g. Feb 2026"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">EFY Label</label>
                <input
                  type="text"
                  value={newEfyLabel}
                  onChange={(e) => {
                    setNewEfyLabel(e.target.value);
                    handleLabelChange('efyLabel', e.target.value);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-indigo-500 font-medium font-mono"
                  placeholder="e.g. 2018"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] text-slate-400 font-semibold block">Quarter Label</label>
              <input
                type="text"
                value={newQuarterLabel}
                onChange={(e) => {
                  setNewQuarterLabel(e.target.value);
                  handleLabelChange('quarterLabel', e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-indigo-500 font-medium"
                placeholder="e.g. Q3 2018 or Jan-Mar 2026"
              />
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl p-3 space-y-2 text-[10px] border border-slate-100 dark:border-slate-700/30">
              <span className="font-bold text-slate-400 tracking-wide uppercase block pb-1 border-b border-slate-100 dark:border-slate-700/30">
                Summary of Figures for {labels.monthLabel}:
              </span>
              
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Contractor Plan:</span>
                    <span className="font-mono">{plan.contractor.month.toFixed(2)} Km (Mo) • {plan.contractor.efy.toFixed(2)} Km (EFY)</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-blue-600 dark:text-blue-400 font-mono pl-2">
                    <span>Saved Cumulative:</span>
                    <span className="font-bold">{plan.contractor.todate.toFixed(2)} Km</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 font-semibold">
                    <span>ERA Milestone Plan:</span>
                    <span className="font-mono">{plan.era.month.toFixed(2)} Km (Mo) • {plan.era.efy.toFixed(2)} Km (EFY)</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-mono pl-2">
                    <span>Saved Cumulative:</span>
                    <span className="font-bold">{plan.era.todate.toFixed(2)} Km</span>
                  </div>
                </div>

                <div className="text-emerald-600 dark:text-emerald-400">
                  <div className="flex justify-between items-center font-bold">
                    <span>Actual Completed:</span>
                    <span className="font-mono">{plan.actual.month.toFixed(2)} Km (Mo) • {plan.actual.efy.toFixed(2)} Km (EFY)</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono pl-2">
                    <span>Saved Cumulative:</span>
                    <span className="font-extrabold">{plan.actual.todate.toFixed(2)} Km ({computedPhysProgress.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {activeLoadedRecordId ? (
              <div className="space-y-2">
                <button
                  onClick={handleUpdateLoadedHistoryItem}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save & Update {labels.monthLabel}
                </button>

                <button
                  onClick={handleSaveToHistory}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors duration-200 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Save as New Archive Snapshot
                </button>
              </div>
            ) : (
              <button
                onClick={handleSaveToHistory}
                disabled={!newMonthLabel.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors duration-200 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Month & Cumulative Data
              </button>
            )}
          </div>
        </div>

        {/* History / Archive Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-blue-500" />
              <div>
                <span className="text-xs font-bold text-slate-850 dark:text-zinc-150 block uppercase">
                  Elapsed Months & EFY Records List
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Click "Load" to restore and edit in table, or click "Edit" to modify any archived record directly.
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono font-extrabold shrink-0">
              {historyList.length} Archived
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-700/50 rounded-xl">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-100 dark:border-slate-700/60">
                  <th className="p-3">Period & EFY</th>
                  <th className="p-3 text-center">Contractor Plan (Km)</th>
                  <th className="p-3 text-center">ERA Milestone (Km)</th>
                  <th className="p-3 text-center">Actual Accomplished (Km)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-[11px]">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      <CalendarClock className="w-8 h-8 mx-auto stroke-1.5 opacity-40 mb-2 text-slate-400" />
                      <span className="block font-medium">No archived elapsed records found.</span>
                      <span className="block text-[10px] text-slate-400/80 mt-1">Use the left form to lock in current tracking figures.</span>
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => {
                    const isCurrentLoaded = activeLoadedRecordId === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors duration-150 ${
                          isCurrentLoaded 
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-3 border-l-blue-500' 
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                        }`}
                      >
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 dark:text-zinc-200 block text-xs">
                              {item.monthLabel}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                                EFY {item.efyLabel}
                              </span>
                              {item.quarterLabel && (
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {item.quarterLabel}
                                </span>
                              )}
                            </div>
                            {isCurrentLoaded && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <Check className="w-2.5 h-2.5 text-emerald-600" /> Active in Table
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contractor */}
                        <td className="p-3 text-center font-mono">
                          <div className="space-y-0.5">
                            <div className="text-slate-700 dark:text-slate-300 font-semibold">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">Mo:</span>
                              {item.contractorMonth.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">EFY:</span>
                              {item.contractorEfy.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-1 rounded">
                              <span className="text-[9px] text-blue-500/80 mr-1 font-sans">Cum:</span>
                              {item.contractorTodate !== undefined ? item.contractorTodate.toFixed(2) : '—'}
                            </div>
                          </div>
                        </td>

                        {/* ERA */}
                        <td className="p-3 text-center font-mono">
                          <div className="space-y-0.5">
                            <div className="text-slate-700 dark:text-slate-300 font-semibold">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">Mo:</span>
                              {item.eraMonth.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">EFY:</span>
                              {item.eraEfy.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 px-1 rounded">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">Cum:</span>
                              {item.eraTodate !== undefined ? item.eraTodate.toFixed(2) : '—'}
                            </div>
                          </div>
                        </td>

                        {/* Actual */}
                        <td className="p-3 text-center font-mono bg-emerald-50/10 dark:bg-emerald-950/5">
                          <div className="space-y-0.5">
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">Mo:</span>
                              {item.actualMonth.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span className="text-[9px] text-slate-400 mr-1 font-sans">EFY:</span>
                              {item.actualEfy.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/40 px-1 rounded">
                              <span className="text-[9px] text-emerald-500/80 mr-1 font-sans">Cum:</span>
                              {item.actualTodate !== undefined ? item.actualTodate.toFixed(2) : '—'}
                            </div>
                            {item.physicalProgress !== undefined && (
                              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">
                                {item.physicalProgress.toFixed(2)}% Phys
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleRestoreHistoryItem(item)}
                              title={`Reload and edit all saved data for ${item.monthLabel}`}
                              className={`p-1.5 rounded-lg transition-colors text-[10px] font-bold flex items-center gap-1 px-2.5 cursor-pointer ${
                                isCurrentLoaded
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-400'
                              }`}
                            >
                              <RefreshCcw className="w-3 h-3" />
                              {isCurrentLoaded ? 'Editing' : 'Load'}
                            </button>

                            <button
                              onClick={() => setEditingModalItem(JSON.parse(JSON.stringify(item)))}
                              title="Directly edit all fields of this archived record"
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setInspectingItem(item)}
                              title="View full detailed snapshot for this month"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              title="Remove this archived record"
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Direct Record Edit Modal */}
      <AnimatePresence>
        {editingModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Edit Archived Milestone Record
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Update targets, cumulative to-date save, and period labels for this month.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingModalItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Labels Header Inputs */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/40">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Month Period</label>
                    <input
                      type="text"
                      value={editingModalItem.monthLabel}
                      onChange={(e) => setEditingModalItem({ ...editingModalItem, monthLabel: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Quarter Range</label>
                    <input
                      type="text"
                      value={editingModalItem.quarterLabel || ''}
                      onChange={(e) => setEditingModalItem({ ...editingModalItem, quarterLabel: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">EFY Year</label>
                    <input
                      type="text"
                      value={editingModalItem.efyLabel}
                      onChange={(e) => setEditingModalItem({ ...editingModalItem, efyLabel: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Values Table */}
                <div className="overflow-x-auto border border-slate-150 dark:border-slate-700/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-150 dark:border-slate-700/60">
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-center">Month (Km)</th>
                        <th className="p-2.5 text-center">Quarter (Km)</th>
                        <th className="p-2.5 text-center">EFY (Km)</th>
                        <th className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                          Cumulative To-Date (Km)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-700/40">
                      {/* Contractor */}
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">Contractor Plan</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorMonth: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorQuarter: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorEfy: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorTodate || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorTodate: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-md text-center font-mono py-1 text-xs text-blue-600 dark:text-blue-400 font-bold"
                          />
                        </td>
                      </tr>

                      {/* ERA */}
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">ERA Milestone</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraMonth: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraQuarter: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraEfy: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraTodate || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraTodate: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-center font-mono py-1 text-xs text-slate-700 dark:text-slate-300 font-bold"
                          />
                        </td>
                      </tr>

                      {/* Actual */}
                      <tr className="bg-emerald-50/15 dark:bg-emerald-950/10">
                        <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">Actual Completed</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualMonth: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualQuarter: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualEfy: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-emerald-100/30 dark:bg-emerald-950/20">
                          <input
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualTodate !== undefined ? editingModalItem.actualTodate : editingModalItem.actualMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualTodate: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-white dark:bg-slate-800 border border-dashed border-emerald-500 rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-black"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Auto Calculated Performance */}
                {project.lengthKm > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Calculated Physical Progress:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {(((editingModalItem.actualTodate !== undefined ? editingModalItem.actualTodate : editingModalItem.actualMonth) / project.lengthKm) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveModalEdit(editingModalItem)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Updates
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Detailed Snapshot Modal */}
      <AnimatePresence>
        {inspectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Saved Snapshot: {inspectingItem.monthLabel}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>Saved under EFY <strong className="font-mono text-slate-700 dark:text-slate-300">{inspectingItem.efyLabel}</strong></span>
                      {inspectingItem.quarterLabel && (
                        <span>• {inspectingItem.quarterLabel}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="overflow-x-auto border border-slate-150 dark:border-slate-700/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-150 dark:border-slate-700/60">
                        <th className="p-3">Program Plan Tier</th>
                        <th className="p-3 text-center">{inspectingItem.monthLabel} (Km)</th>
                        <th className="p-3 text-center">Quarter (Km)</th>
                        <th className="p-3 text-center">EFY {inspectingItem.efyLabel} (Km)</th>
                        <th className="p-3 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                          Cumulative To-Date Save (Km)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-700/40">
                      <tr>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">Contractor Plan</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.contractorMonth.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.contractorQuarter !== undefined ? inspectingItem.contractorQuarter.toFixed(2) : '—'}</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.contractorEfy.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                          {inspectingItem.contractorTodate !== undefined ? inspectingItem.contractorTodate.toFixed(2) : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">ERA Milestone Plan</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.eraMonth.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.eraQuarter !== undefined ? inspectingItem.eraQuarter.toFixed(2) : '—'}</td>
                        <td className="p-3 text-center font-mono">{inspectingItem.eraEfy.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10">
                          {inspectingItem.eraTodate !== undefined ? inspectingItem.eraTodate.toFixed(2) : '—'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">Actual Accomplished</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{inspectingItem.actualMonth.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{inspectingItem.actualQuarter !== undefined ? inspectingItem.actualQuarter.toFixed(2) : '—'}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{inspectingItem.actualEfy.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/30 dark:bg-emerald-950/20">
                          {inspectingItem.actualTodate !== undefined ? inspectingItem.actualTodate.toFixed(2) : inspectingItem.actualMonth.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 border border-slate-150 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Recorded Performance Progress:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm font-mono">
                      {inspectingItem.physicalProgress !== undefined ? inspectingItem.physicalProgress.toFixed(2) + '% Physical Progress' : '—'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Road completed to-date: <strong className="font-mono text-slate-800 dark:text-slate-200">{inspectingItem.actualTodate !== undefined ? inspectingItem.actualTodate.toFixed(2) : inspectingItem.actualMonth.toFixed(2)} Km</strong> of <span className="font-mono">{project.lengthKm} Km</span> total.
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRestoreHistoryItem(inspectingItem)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Reload & Edit This Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Settings2,
  Calendar,
  Sparkles,
  Info,
  Check,
  X,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  RotateCcw,
  ShieldCheck,
  History,
  Users,
  ExternalLink
} from 'lucide-react';
import {
  SupervisionConsultantInfo,
  ConsultantSubmittalKpi,
  EvaluationCriteriaItem,
  Project
} from '../types';
import ComprehensiveConsultantEvaluationMatrixView from './ComprehensiveConsultantEvaluationMatrixView';
import { 
  getProjectConsultantEvaluation, 
  evaluateQualitativeGrade, 
  DEFAULT_GRADE_THRESHOLDS,
  DEFAULT_SLA_TARGETS,
  DEFAULT_EVALUATION_CRITERIA,
  DEFAULT_SUBMITTAL_KPIS,
  calculateElapsedDays,
  checkSubmittalDelay,
  resolveProjectSubmittals
} from '../data/consultantEvaluationMatrix';

export {
  DEFAULT_SLA_TARGETS,
  DEFAULT_EVALUATION_CRITERIA,
  DEFAULT_SUBMITTAL_KPIS,
  calculateElapsedDays,
  checkSubmittalDelay,
  resolveProjectSubmittals
};

export interface ConsultantPerformanceKpiWidgetProps {
  project: Project;
  consultant: SupervisionConsultantInfo;
  onUpdateConsultant?: (updatedConsultant: SupervisionConsultantInfo, actionDescription?: string) => void;
  isReadonly?: boolean;
  compact?: boolean;
  isAdmin?: boolean;
}

export default function ConsultantPerformanceKpiWidget({
  project,
  consultant,
  onUpdateConsultant,
  isReadonly = false,
  compact = false,
  isAdmin = true
}: ConsultantPerformanceKpiWidgetProps) {
  // Consultant Tenure & Succession selection state ('current' or historical consultant id)
  const [selectedTenureConsultantId, setSelectedTenureConsultantId] = useState<string>('current');
  const [livePillar2Score, setLivePillar2Score] = useState<number | null>(null);

  const calculatedEvaluation = useMemo(() => {
    return getProjectConsultantEvaluation(project, consultant);
  }, [project, consultant]);

  const isViewingHistorical = selectedTenureConsultantId !== 'current';
  const historicalConsultant = useMemo(() => {
    if (!isViewingHistorical) return null;
    return (consultant.previousConsultants || []).find(h => h.id === selectedTenureConsultantId) || null;
  }, [isViewingHistorical, selectedTenureConsultantId, consultant.previousConsultants]);

  // Evaluation Criteria & Weightage state
  const evaluationCriteria = useMemo(() => {
    if (isViewingHistorical && historicalConsultant?.evaluationCriteria && historicalConsultant.evaluationCriteria.length > 0) {
      return historicalConsultant.evaluationCriteria;
    }
    return consultant.evaluationCriteria && consultant.evaluationCriteria.length > 0
      ? consultant.evaluationCriteria
      : DEFAULT_EVALUATION_CRITERIA;
  }, [consultant.evaluationCriteria, isViewingHistorical, historicalConsultant]);

  const targetOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    evaluationCriteria.forEach(c => {
      map[c.name] = c.targetDays;
    });
    const customOverrides = isViewingHistorical
      ? (historicalConsultant?.targetOverrides || {})
      : (consultant.targetOverrides || {});
    return {
      ...DEFAULT_SLA_TARGETS,
      ...map,
      ...customOverrides
    };
  }, [evaluationCriteria, consultant.targetOverrides, isViewingHistorical, historicalConsultant]);

  // State for submittals data, merging consultant submittals with live IPC tracker items
  const submittalsList: ConsultantSubmittalKpi[] = useMemo(() => {
    if (isViewingHistorical && historicalConsultant) {
      return historicalConsultant.submittalKpis || [];
    }

    let baseList: ConsultantSubmittalKpi[] = [];
    if (consultant.submittalKpis !== undefined) {
      baseList = [...consultant.submittalKpis];
    } else if (project?.id === 'proj_default') {
      baseList = [...DEFAULT_SUBMITTAL_KPIS];
    }

    // Active consultant assignment date filtering
    const commencementTime = consultant.commencementDate ? new Date(consultant.commencementDate).getTime() : null;

    if (project?.ipcTracker && project.ipcTracker.length > 0) {
      const ipcSubmittals: ConsultantSubmittalKpi[] = project.ipcTracker
        .filter(ipc => {
          if (!ipc.submissionDate) return false;
          if (commencementTime) {
            const subTime = new Date(ipc.submissionDate).getTime();
            if (!isNaN(subTime) && subTime < commencementTime) {
              return false;
            }
          }
          return true;
        })
        .map(ipc => {
          let actualDays: number | undefined = undefined;
          if (ipc.submissionDate && ipc.certificationDate) {
            const subTime = new Date(ipc.submissionDate).getTime();
            const certTime = new Date(ipc.certificationDate).getTime();
            if (!isNaN(subTime) && !isNaN(certTime) && certTime >= subTime) {
              actualDays = Math.max(0, Math.round((certTime - subTime) / (1000 * 60 * 60 * 24)));
            }
          }
          const target = targetOverrides['IPC Review'] || 7;
          return {
            id: `ipc_kpi_${ipc.id}`,
            submittalNo: ipc.paymentNo || 'IPC',
            type: 'IPC Review',
            title: `Interim Payment Certificate (${ipc.paymentNo || 'IPC'}) - Period: ${ipc.period || 'Monthly'}`,
            submittedDate: ipc.submissionDate || '',
            respondedDate: ipc.certificationDate || undefined,
            targetDays: target,
            actualDays: actualDays,
            status: ipc.certificationDate ? 'Approved / Closed' : 'Under Review',
            priority: 'High',
            assignedEngineer: consultant.residentEngineerName || 'Resident Engineer / Quantity Surveyor',
            notes: ipc.remarks || `Financial IPC submitted by Contractor on ${ipc.submissionDate || 'N/A'}${ipc.certificationDate ? ` and certified on ${ipc.certificationDate} (${actualDays} days)` : ' (pending Engineer certification)'}.`
          };
        });

      const nonIpcItems = baseList.filter(s => s.type !== 'IPC Review' && !s.id.startsWith('ipc_kpi_'));
      return [...nonIpcItems, ...ipcSubmittals];
    }

    return baseList;
  }, [consultant.submittalKpis, project?.id, project?.ipcTracker, consultant.residentEngineerName, consultant.commencementDate, targetOverrides, isViewingHistorical, historicalConsultant]);

  // Modal states
  const [isTargetSettingsOpen, setIsTargetSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const [editCriteriaForm, setEditCriteriaForm] = useState<EvaluationCriteriaItem[]>(evaluationCriteria);
  const [newCritName, setNewCritName] = useState('');
  const [newCritTarget, setNewCritTarget] = useState(7);
  const [newCritWeight, setNewCritWeight] = useState(10);

  // Core Category KPI Statistics & Weighted Evaluation Scoring Calculation
  const categoryKpiStats = useMemo(() => {
    return evaluationCriteria.map((crit) => {
      const cat = crit.name;
      const weightPct = crit.weightPct || 0;
      const items = submittalsList.filter(s => s.type === cat || s.type.toLowerCase() === cat.toLowerCase());
      const targetDays = targetOverrides[cat] !== undefined ? targetOverrides[cat] : crit.targetDays;

      const evaluatedItems = items.map(item => {
        const delayInfo = checkSubmittalDelay(item, targetDays);
        return { ...item, ...delayInfo };
      });

      const resolvedItems = evaluatedItems.filter(i => i.isResolved);
      const pendingItems = evaluatedItems.filter(i => i.isPending);

      const resolvedDelayedItems = evaluatedItems.filter(i => i.isResolved && i.isDelayed);
      const pendingDelayedItems = evaluatedItems.filter(i => i.isPending && i.isDelayed);
      const totalDelayedCount = resolvedDelayedItems.length + pendingDelayedItems.length;
      const resolvedDelayedCount = resolvedDelayedItems.length;
      const pendingDelayedCount = pendingDelayedItems.length;

      const totalSubmittals = items.length;
      const resolvedCount = resolvedItems.length;
      const pendingCount = pendingItems.length;
      const onTimeCount = Math.max(0, totalSubmittals - totalDelayedCount);
      const onTimePct = totalSubmittals > 0 ? (onTimeCount / totalSubmittals) * 100 : 100;

      const avgActualDays = resolvedItems.length > 0
        ? parseFloat((resolvedItems.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / resolvedItems.length).toFixed(1))
        : (evaluatedItems.length > 0
            ? parseFloat((evaluatedItems.reduce((acc, cur) => acc + cur.elapsedDays, 0) / evaluatedItems.length).toFixed(1))
            : 0);

      const varianceDays = resolvedCount > 0 ? parseFloat((avgActualDays - targetDays).toFixed(1)) : 0;
      const isAverageFaster = avgActualDays <= targetDays;

      // Evaluation Mark Scoring & Delayed Penalty Formula:
      // Net Mark = Weightage − Deduction
      // Deduction = (Delayed ÷ Submitted) × Weightage
      let deduction = 0;
      if (totalSubmittals > 0 && totalDelayedCount > 0) {
        deduction = parseFloat(((totalDelayedCount / totalSubmittals) * weightPct).toFixed(2));
      }
      const earnedScore = parseFloat(Math.max(0, weightPct - deduction).toFixed(2));

      // Compliance determination
      const isComplying = totalSubmittals === 0
        ? true
        : (avgActualDays <= targetDays && pendingDelayedCount === 0 && resolvedDelayedCount === 0);

      let complianceBadge: { label: string; type: 'complying' | 'not-complying' | 'no-data' };
      if (totalSubmittals === 0) {
        complianceBadge = { label: 'Complying (No Data)', type: 'no-data' };
      } else if (pendingDelayedCount > 0) {
        complianceBadge = { label: `Not Complying (${pendingDelayedCount} Pending Overdue)`, type: 'not-complying' };
      } else if (isComplying) {
        complianceBadge = { label: 'Complying (Full Mark)', type: 'complying' };
      } else {
        complianceBadge = { label: 'Not Complying (Exceeds SLA)', type: 'not-complying' };
      }

      return {
        id: crit.id,
        category: cat,
        shortName: cat.length > 18 ? cat.substring(0, 16) + '...' : cat,
        targetDays,
        actualDays: avgActualDays,
        varianceDays,
        isFaster: isAverageFaster,
        isComplying,
        complianceBadge,
        weightPct,
        totalSubmittals,
        resolvedCount,
        pendingCount,
        delayedCount: totalDelayedCount,
        resolvedDelayedCount,
        pendingDelayedCount,
        onTimeCount,
        onTimePct,
        deduction,
        earnedScore,
        fidicClause: crit.fidicClause,
        pmbokDomain: crit.pmbokDomain,
        minDays: resolvedCount > 0 ? Math.min(...resolvedItems.map(s => s.actualDays || 0)) : 0,
        maxDays: resolvedCount > 0 ? Math.max(...resolvedItems.map(s => s.actualDays || 0)) : 0,
        status: totalSubmittals === 0 ? 'No Data' : isComplying ? 'Excellent' : (pendingDelayedCount > 0 ? 'Penalized (Pending Overdue)' : 'Needs Review')
      };
    });
  }, [submittalsList, targetOverrides, evaluationCriteria]);

  // Overall Headline Metrics & Evaluation Audit Summary
  const overallMetrics = useMemo(() => {
    const totalCount = submittalsList.length;
    
    // Evaluate delay status for all submittals
    const evaluatedAll = submittalsList.map(item => {
      const target = item.targetDays || targetOverrides[item.type] || 7;
      return { ...item, ...checkSubmittalDelay(item, target) };
    });

    const resolved = evaluatedAll.filter(s => s.isResolved);
    const resolvedCount = resolved.length;
    const pendingList = evaluatedAll.filter(s => s.isPending);
    const pendingCount = pendingList.length;
    const pendingOverdueCount = pendingList.filter(s => s.isDelayed).length;
    const pendingOnTrackCount = pendingList.filter(s => !s.isDelayed).length;

    // RFI specific stats
    const rfiStat = categoryKpiStats.find(s => s.category === 'RFI') || {
      actualDays: 0,
      targetDays: targetOverrides['RFI'] || 7,
      isComplying: true,
      varianceDays: 0,
      weightPct: 20,
      deduction: 0,
      earnedScore: 20,
      totalSubmittals: 0,
      resolvedCount: 0,
      pendingCount: 0,
      delayedCount: 0,
      resolvedDelayedCount: 0,
      pendingDelayedCount: 0,
      onTimeCount: 0,
      complianceBadge: { label: 'Complying', type: 'complying' as const }
    };

    const rfiItems = evaluatedAll.filter(s => s.type === 'RFI');
    const rfiResolved = rfiItems.filter(s => s.isResolved);
    const rfiTarget = targetOverrides['RFI'] || 7;
    const avgRfiDays = rfiStat.actualDays || (rfiResolved.length > 0
      ? parseFloat((rfiResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / rfiResolved.length).toFixed(1))
      : 0);
    const rfiEfficiencyPct = (rfiTarget > 0 && avgRfiDays > 0) ? (((rfiTarget - avgRfiDays) / rfiTarget) * 100) : 0;

    // Total Weightage & Earned Evaluation Score
    const totalWeight = evaluationCriteria.reduce((sum, c) => sum + (c.weightPct || 0), 0);
    const totalEarnedScore = parseFloat(categoryKpiStats.reduce((sum, s) => sum + s.earnedScore, 0).toFixed(2));
    const totalDeductions = parseFloat(categoryKpiStats.reduce((sum, s) => sum + s.deduction, 0).toFixed(2));
    const totalDelayedSubmittals = categoryKpiStats.reduce((sum, s) => sum + s.delayedCount, 0);
    const totalPendingDelayedSubmittals = categoryKpiStats.reduce((sum, s) => sum + s.pendingDelayedCount, 0);
    const totalResolvedDelayedSubmittals = categoryKpiStats.reduce((sum, s) => sum + s.resolvedDelayedCount, 0);

    // Global on-time compliance
    const onTimeTotal = evaluatedAll.filter(s => !s.isDelayed).length;
    const complianceRate = totalCount > 0 ? (onTimeTotal / totalCount) * 100 : 100;

    // Overall Average turnaround
    const avgOverallDays = resolvedCount > 0
      ? parseFloat((resolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / resolvedCount).toFixed(1))
      : 0;

    // Overall Grading Tier
    let gradeLabel = 'Grade A (Excellent)';
    let gradeBadgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    
    if (totalPendingDelayedSubmittals > 0) {
      if (totalEarnedScore >= 80) {
        gradeLabel = `Grade B+ (Penalized: ${totalPendingDelayedSubmittals} Pending Overdue)`;
        gradeBadgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      } else if (totalEarnedScore >= 60) {
        gradeLabel = `Grade C (Penalized: ${totalPendingDelayedSubmittals} Pending Overdue)`;
        gradeBadgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      } else {
        gradeLabel = `Grade F (Non-Compliant: ${totalPendingDelayedSubmittals} Pending Overdue)`;
        gradeBadgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      }
    } else if (totalEarnedScore >= 85) {
      gradeLabel = 'Grade A (Excellent)';
      gradeBadgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    } else if (totalEarnedScore >= 70) {
      gradeLabel = 'Grade B (Satisfactory)';
      gradeBadgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    } else {
      gradeLabel = 'Grade C (Needs Review)';
      gradeBadgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    }

    return {
      totalCount,
      resolvedCount,
      pendingCount,
      pendingOverdueCount,
      pendingOnTrackCount,
      avgRfiDays,
      rfiTarget,
      rfiEfficiencyPct,
      rfiStat,
      totalWeight,
      totalEarnedScore,
      totalDeductions,
      totalDelayedSubmittals,
      totalPendingDelayedSubmittals,
      totalResolvedDelayedSubmittals,
      complianceRate,
      avgOverallDays,
      gradeLabel,
      gradeBadgeStyle
    };
  }, [submittalsList, targetOverrides, categoryKpiStats, evaluationCriteria]);

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all submittal evaluation criteria and targets to standard contract baseline benchmarks?')) {
      const updatedConsultant: SupervisionConsultantInfo = {
        ...consultant,
        evaluationCriteria: DEFAULT_EVALUATION_CRITERIA,
        targetOverrides: DEFAULT_SLA_TARGETS
      };
      if (onUpdateConsultant) {
        onUpdateConsultant(updatedConsultant, 'Reset submittal evaluation benchmarks to standard baseline');
      }
    }
  };

  const pillar1ScoreValue = useMemo(() => {
    return (overallMetrics.totalEarnedScore / (overallMetrics.totalWeight || 100)) * 100;
  }, [overallMetrics.totalEarnedScore, overallMetrics.totalWeight]);

  const pillar2ScoreValue = useMemo(() => {
    return livePillar2Score !== null ? livePillar2Score : calculatedEvaluation.fiveDimScore;
  }, [livePillar2Score, calculatedEvaluation.fiveDimScore]);

  const combinedAvgScoreValue = useMemo(() => {
    return (pillar1ScoreValue + pillar2ScoreValue) / 2;
  }, [pillar1ScoreValue, pillar2ScoreValue]);

  const combinedGradeInfo = useMemo(() => {
    const score = combinedAvgScoreValue;
    const thresholds = consultant.customGradeThresholds || DEFAULT_GRADE_THRESHOLDS;
    const matched = evaluateQualitativeGrade(score, thresholds);
    return {
      grade: matched.grade.replace('Grade ', '').trim(),
      standing: matched.standing,
      style: 'bg-indigo-600 text-white'
    };
  }, [combinedAvgScoreValue, consultant.customGradeThresholds]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Top Banner / Widget Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Supervision Consultant Performance KPI & SLA Evaluation
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              {overallMetrics.complianceRate.toFixed(1)}% On-Time SLA
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              📋 {submittalsList.length} Evaluated Submittal Records
            </span>
          </div>

          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Consultant SLA Response Performance & Weighted Evaluation Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
            Real-time benchmarking of technical RFIs, material approvals, IPC verification, and design turnaround times against contract and Ethiopian Roads Administration targets. Performance marks and deductions are dynamically calculated from the evaluated Submittal Log.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isReadonly && isAdmin && (
            <button
              onClick={() => {
                setEditCriteriaForm(evaluationCriteria);
                setIsTargetSettingsOpen(true);
              }}
              title="Configure Evaluation Criteria, Target Days & Weightages"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-indigo-600" />
              Criteria & Weights
            </button>
          )}

          {!isReadonly && (
            <button
              onClick={handleResetToDefaults}
              title="Reset to standard contract benchmarks"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 text-xs font-bold"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Consultant Evaluation Scope & Succession History Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Evaluation Scope:
          </span>
          <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100">
            {isViewingHistorical ? historicalConsultant?.firmName : consultant.firmName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {isViewingHistorical 
              ? `Archived Term: ${historicalConsultant?.commencementDate || 'Start'} to ${historicalConsultant?.handoverDate || 'Archived'}`
              : `Active Term: Since ${consultant.commencementDate || 'Assignment'}`}
          </span>
        </div>

        {consultant.previousConsultants && consultant.previousConsultants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Consultant History:
            </span>
            <select
              value={selectedTenureConsultantId}
              onChange={(e) => setSelectedTenureConsultantId(e.target.value)}
              aria-label="Select Consultant Evaluation Term"
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-100 shadow-2xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="current">
                🟢 Current: {consultant.firmName} (Since {consultant.commencementDate || 'Assignment'})
              </option>
              {consultant.previousConsultants.map((hist) => (
                <option key={hist.id} value={hist.id}>
                  📜 Predecessor: {hist.firmName} ({hist.commencementDate || 'Start'} — {hist.handoverDate || 'Archived'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Historical View Active Banner */}
      {isViewingHistorical && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-900 dark:text-amber-200 font-medium">
              Displaying archived performance evaluation for predecessor <strong>{historicalConsultant?.firmName}</strong> (Tenure: {historicalConsultant?.commencementDate || 'Start'} to {historicalConsultant?.handoverDate || 'Archived'}).
            </span>
          </div>
          <button
            onClick={() => setSelectedTenureConsultantId('current')}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition shrink-0 cursor-pointer"
          >
            Switch to Active Consultant
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Dynamic Dual-Pillar Composite Scorecard Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
          {/* Pillar I Score Card */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Pillar I: Submittal SLA
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 dark:text-zinc-100 font-mono">
                  {pillar1ScoreValue.toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-slate-400">score</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Pillar II Score Card */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Pillar II: Technical Audit
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 dark:text-zinc-100 font-mono">
                  {pillar2ScoreValue.toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-slate-400">score</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Combined Composite Overall Score */}
          <div className="bg-indigo-950/30 dark:bg-indigo-950/60 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-900/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                Combined Overall Score (Avg)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-indigo-900 dark:text-indigo-100 font-mono">
                  {combinedAvgScoreValue.toFixed(1)}%
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-indigo-600 text-white leading-tight">
                    Grade {combinedGradeInfo.grade}
                  </span>
                  <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 leading-none mt-1">
                    {combinedGradeInfo.standing}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section 1: Submittal Log & Operational SLA Turnaround (19 Categories - Pillar I) */}
        <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                ⚡ I. Submittal Log & Operational SLA Turnaround ({submittalsList.length} items - Pillar I)
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-3xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 text-indigo-600" /> Hide SLA Turnaround Table
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-indigo-600" /> Show SLA Turnaround Table
                </>
              )}
            </button>
          </div>

          {/* Summary Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Avg RFI Response Time Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Avg RFI Response Time
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
              overallMetrics.rfiStat.isComplying
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700'
            }`}>
              {overallMetrics.rfiStat.isComplying ? '✓ Complying' : '✕ Not Complying'}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-indigo-950 dark:text-white">
                {overallMetrics.avgRfiDays}
              </span>
              <span className="text-xs text-slate-500 font-semibold">days</span>
              <span className="text-[11px] text-slate-400 font-mono">/ {overallMetrics.rfiTarget}d target</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black font-mono text-indigo-700 dark:text-indigo-300">
                {overallMetrics.rfiStat.earnedScore.toFixed(1)} / {overallMetrics.rfiStat.weightPct} pts
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 dark:text-slate-400">
              {overallMetrics.rfiStat.deduction === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">★ Full Mark (0 delayed)</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  -{overallMetrics.rfiStat.deduction.toFixed(2)} pts ({overallMetrics.rfiStat.delayedCount}/{overallMetrics.rfiStat.totalSubmittals} delayed)
                </span>
              )}
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {overallMetrics.rfiEfficiencyPct >= 0 
                ? `${Math.abs(overallMetrics.rfiEfficiencyPct).toFixed(0)}% faster` 
                : `${Math.abs(overallMetrics.rfiEfficiencyPct).toFixed(0)}% over SLA`}
            </span>
          </div>
        </div>

        {/* Total Consultant Evaluation Score Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Evaluation Score
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
              overallMetrics.totalEarnedScore >= 85
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : overallMetrics.totalEarnedScore >= 70
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700'
            }`}>
              {overallMetrics.gradeLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-emerald-950 dark:text-white">
                {overallMetrics.totalEarnedScore.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ {overallMetrics.totalWeight} pts</span>
            </div>
            <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {((overallMetrics.totalEarnedScore / (overallMetrics.totalWeight || 100)) * 100).toFixed(1)}% Net
            </span>
          </div>

          <div className="pt-1 border-t border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 dark:text-slate-400">
              {overallMetrics.totalDeductions === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Full SLA Marks</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  Deductions: -{overallMetrics.totalDeductions.toFixed(2)} pts ({overallMetrics.totalDelayedSubmittals} delayed items)
                </span>
              )}
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
              {overallMetrics.complianceRate.toFixed(0)}% On-Time
            </span>
          </div>
        </div>

        {/* Total Submittals Processed */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Processed Submittals
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {overallMetrics.complianceRate.toFixed(0)}% SLA
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {overallMetrics.resolvedCount}
            </span>
            <span className="text-xs text-slate-400 font-normal">/ {overallMetrics.totalCount} logged</span>
            <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 ml-auto">
              {overallMetrics.totalCount - overallMetrics.totalDelayedSubmittals} on-time
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>Avg: <strong className="font-mono text-slate-700 dark:text-slate-300">{overallMetrics.avgOverallDays} days</strong></span>
            <span className="text-slate-400 font-normal">Completed reviews</span>
          </div>
        </div>

        {/* Pending Queue / In Review */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Active Review Queue
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono">
              {overallMetrics.pendingOverdueCount > 0 ? `${overallMetrics.pendingOverdueCount} Overdue` : 'On Track'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-900 dark:text-amber-200">
              {overallMetrics.pendingCount}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">in review</span>
            <span className="text-[11px] font-bold font-mono text-amber-700 dark:text-amber-300 ml-auto">
              {overallMetrics.totalPendingDelayedSubmittals} delayed past target
            </span>
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center justify-between">
            <span>Pending Engineer certification</span>
            <span className="text-amber-700 dark:text-amber-300 font-semibold">Active processing</span>
          </div>
        </div>
      </div>

      {/* Expanded Interactive Body */}
      {isExpanded && (
        <div className="space-y-4 pt-2">
          {/* Formula & Rule Guidance Banner - Hidden by user request */}

          {/* Detailed Performance Metric Table with editable target SLAs & weighted evaluation marks */}
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs scroll-smooth">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5">Submittal Criteria</th>
                  <th className="py-2.5 px-3 text-center">
                    Target SLA
                    <span className="text-[9px] font-normal text-indigo-500 block">Editable</span>
                  </th>
                  <th className="py-2.5 px-3 text-center">Actual Avg</th>
                  <th className="py-2.5 px-3.5 text-center">Compliance Status</th>
                  <th className="py-2.5 px-3 text-center">Submitted / Delayed</th>
                  <th className="py-2.5 px-2.5 text-center">Weight</th>
                  <th className="py-2.5 px-3 text-center">Deductions</th>
                  <th className="py-2.5 px-3.5 text-center">Evaluation Mark</th>
                  <th className="py-2.5 px-3 text-center">On-Time Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {categoryKpiStats.map((stat, sIdx) => (
                  <tr key={`stat-cat-${stat.category}-${sIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {/* Submittal Criteria Name */}
                    <td className="py-2.5 px-3.5 font-bold">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            stat.isComplying ? 'bg-indigo-600' : 'bg-rose-500'
                          }`}></span>
                          <span className="text-slate-900 dark:text-white font-semibold">
                            {stat.category}
                          </span>
                        </div>
                        {stat.pmbokDomain && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-4 text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-100 dark:border-emerald-900/50 font-medium">
                              {stat.pmbokDomain}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Target SLA (Editable) */}
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {!isReadonly ? (
                        <div className="inline-flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={targetOverrides[stat.category] !== undefined ? targetOverrides[stat.category] : stat.targetDays}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              const newOverrides = { ...targetOverrides, [stat.category]: val };
                              const updatedConsultant: SupervisionConsultantInfo = {
                                ...consultant,
                                targetOverrides: newOverrides
                              };
                              if (onUpdateConsultant) {
                                onUpdateConsultant(updatedConsultant, `Updated ${stat.category} target SLA to ${val} days`);
                              }
                            }}
                            className="w-12 px-1 py-0.5 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-bold text-slate-900 dark:text-white text-xs"
                          />
                          <span className="text-slate-400 text-[11px]">d</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">{stat.targetDays}d</span>
                      )}
                    </td>

                    {/* Actual Average */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {stat.actualDays}d
                    </td>

                    {/* Compliance Status */}
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono inline-flex items-center gap-1 border ${
                        stat.isComplying
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {stat.isComplying ? '✓ Complying' : '✕ Not Complying'}
                      </span>
                    </td>

                    {/* Submitted vs Delayed */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{stat.totalSubmittals}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className={stat.delayedCount > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                        {stat.delayedCount} delayed
                      </span>
                    </td>

                    {/* Weightage */}
                    <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {stat.weightPct}%
                    </td>

                    {/* Deductions */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {stat.deduction > 0 ? (
                        <span 
                          title={`Deduction formula: (${stat.delayedCount} delayed ÷ ${stat.totalSubmittals} submitted) × ${stat.weightPct}% = -${stat.deduction.toFixed(2)} pts`}
                          className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 cursor-help"
                        >
                          -{stat.deduction.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          0.00 (Full)
                        </span>
                      )}
                    </td>

                    {/* Evaluation Mark Earned */}
                    <td className="py-2.5 px-3.5 text-center font-mono font-black text-xs">
                      <span className={`${
                        stat.earnedScore === stat.weightPct
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : stat.earnedScore >= stat.weightPct * 0.75
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {stat.earnedScore.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[10px] font-normal"> / {stat.weightPct}</span>
                    </td>

                    {/* On-Time Rate */}
                    <td className="py-2.5 px-3 text-center font-bold">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${
                              stat.onTimePct >= 90 ? 'bg-emerald-500' : stat.onTimePct >= 70 ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${stat.onTimePct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {stat.onTimePct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Summary / Totals Footer Row */}
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/95 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <tr>
                  <td className="py-3 px-3.5 font-black uppercase text-[11px] text-slate-900 dark:text-white">
                    Total / Performance Matrix
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">
                    —
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {overallMetrics.avgOverallDays}d avg
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wide border ${
                      overallMetrics.totalEarnedScore >= 80
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                    }`}>
                      {overallMetrics.totalEarnedScore >= 80 ? '✓ Compliant Portfolio' : '⚠ Attention Required'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-xs">
                    <span className="text-slate-900 dark:text-white font-bold">{overallMetrics.totalCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className={overallMetrics.totalDelayedSubmittals > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600'}>
                      {overallMetrics.totalDelayedSubmittals} delayed
                    </span>
                  </td>
                  <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                    {overallMetrics.totalWeight}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                    -{overallMetrics.totalDeductions.toFixed(2)} pts
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {overallMetrics.totalEarnedScore.toFixed(2)} / {overallMetrics.totalWeight}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {overallMetrics.complianceRate.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
        </div>

        {/* Section 2: Technical & Supervisory Performance Audit (105 Criteria Framework - Pillar II) */}
        <div className="space-y-4 pt-8">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              🏆 II. Technical & Supervisory Performance Audit (105 Criteria Framework - Pillar II)
            </h4>
          </div>
          <ComprehensiveConsultantEvaluationMatrixView
            project={project}
            consultant={isViewingHistorical && historicalConsultant ? historicalConsultant : consultant}
            onUpdateConsultant={onUpdateConsultant}
            isReadonly={isReadonly}
            isAdmin={isAdmin}
            submittalsList={submittalsList}
            onScoreChange={setLivePillar2Score}
          />
        </div>
      </div>

      {/* Target Settings & Weightages Modal */}
      <AnimatePresence>
        {isTargetSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Consultant Evaluation Criteria & Target SLA Weights
                  </h4>
                </div>
                <button
                  onClick={() => setIsTargetSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Configure baseline response deadlines (in calendar days) and percentage weight distribution for consultant evaluation. The sum of all weights should equal 100%.
              </p>

              {/* Weight Distribution Balance Bar */}
              {(() => {
                const sumWeight = editCriteriaForm.reduce((s, c) => s + (c.weightPct || 0), 0);
                return (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-bold ${
                    sumWeight === 100
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    <span>Total Weight Allocated:</span>
                    <span className="font-mono text-sm">{sumWeight}% / 100% {sumWeight === 100 ? '✓ Balanced' : '⚠️ Adjust to 100%'}</span>
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                {editCriteriaForm.map((crit, idx) => (
                  <div
                    key={crit.id || `crit_form_${idx}`}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex-1 font-bold text-slate-800 dark:text-slate-200">
                      {crit.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px]">Target:</span>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={crit.targetDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const updated = [...editCriteriaForm];
                          updated[idx] = { ...updated[idx], targetDays: val };
                          setEditCriteriaForm(updated);
                        }}
                        className="w-14 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs"
                      />
                      <span className="text-slate-400 text-[10px]">days</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px]">Weight:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={crit.weightPct}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updated = [...editCriteriaForm];
                          updated[idx] = { ...updated[idx], weightPct: val };
                          setEditCriteriaForm(updated);
                        }}
                        className="w-14 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs"
                      />
                      <span className="text-slate-400 text-[10px]">%</span>
                    </div>

                    {editCriteriaForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditCriteriaForm(editCriteriaForm.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Remove criterion"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add New Criterion Row */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">Add Custom Submittal Type:</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Environmental Clearance"
                      value={newCritName}
                      onChange={(e) => setNewCritName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        placeholder="Days"
                        value={newCritTarget}
                        onChange={(e) => setNewCritTarget(parseInt(e.target.value) || 1)}
                        className="w-14 px-1.5 py-1.5 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                      />
                      <span className="text-slate-400 text-[11px]">d</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Weight"
                        value={newCritWeight}
                        onChange={(e) => setNewCritWeight(parseInt(e.target.value) || 0)}
                        className="w-14 px-1.5 py-1.5 text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                      />
                      <span className="text-slate-400 text-[11px]">%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCritName.trim()) {
                        alert('Please enter a valid criterion name.');
                        return;
                      }
                      const newItem: EvaluationCriteriaItem = {
                        id: `crit_${Date.now()}`,
                        name: newCritName.trim(),
                        targetDays: newCritTarget,
                        weightPct: newCritWeight
                      };
                      setEditCriteriaForm([...editCriteriaForm, newItem]);
                      setNewCritName('');
                      setNewCritTarget(7);
                      setNewCritWeight(10);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                  >
                    Add Criterion to Evaluation Matrix
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTargetSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedOverrides: Record<string, number> = {};
                    editCriteriaForm.forEach(c => {
                      updatedOverrides[c.name] = c.targetDays;
                    });
                    const updatedConsultant: SupervisionConsultantInfo = {
                      ...consultant,
                      evaluationCriteria: editCriteriaForm,
                      targetOverrides: updatedOverrides
                    };
                    if (onUpdateConsultant) {
                      onUpdateConsultant(updatedConsultant, 'Updated evaluation criteria, target SLA days, and weightage percentages');
                    }
                    setIsTargetSettingsOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Save Criteria & Weightages
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

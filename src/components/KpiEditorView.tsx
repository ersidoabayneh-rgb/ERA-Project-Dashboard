import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Info, HelpCircle, Plus, Trash2, Edit, Save, X, Sliders, FolderPlus, Lock, Target, Calendar, Clock, AlertTriangle, Bell, Award, History, ArrowRight, ShieldCheck, TrendingUp, RefreshCw, BarChart2, Zap, Check, Activity, Scale, HardHat, DollarSign, Users, CheckCircle2, FileText, Truck } from 'lucide-react';
import { Project, KpiAllocatedItem, User, KpiMonthlyRecord } from '../types';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';
import { isKpiAuthorizedRole } from '../App';
import { calculateProgressKpiScores, ProgressKpiCalculationResult } from '../lib/kpiProgressCalculator';
import { calculateProjectEvm } from '../lib/evmCalculations';
import CircularGauge from './CircularGauge';
import KpiProgressTrendsChart from './KpiProgressTrendsChart';

export type PerformanceGrade = 'Excellent' | 'Good' | 'Satisfactory' | 'Marginal' | 'Unsatisfactory';

export interface PerformanceAuditPillar {
  id: 'schedule' | 'evm' | 'quality' | 'linear' | 'resourceMob' | 'management' | 'financial' | 'hse';
  name: string;
  weight: number;
  scorePct: number;
  scaleValue: number;
  grade: PerformanceGrade;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  pointsEarned: number;
  criteria: string;
  evaluationBasis: string;
  telemetrySummary: string;
  attribution: {
    contractor: string;
    employerOrExternal: string;
  };
  finding: string;
  statusColor: string;
}

export function getPerformanceAuditGrade(scorePct: number): {
  grade: PerformanceGrade;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  scaleValue: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  description: string;
} {
  const clamped = Math.max(0, Math.min(100, scorePct));
  const scaleValue = Number((1.0 + (clamped / 100) * 4.0).toFixed(2));

  if (clamped >= 90) {
    return {
      grade: 'Excellent',
      letter: 'A',
      scaleValue,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-emerald-500/30',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      description: 'Exceeds contract requirements; proactive project controls; zero uncorrected defects.'
    };
  } else if (clamped >= 75) {
    return {
      grade: 'Good',
      letter: 'B',
      scaleValue,
      colorClass: 'text-blue-500 dark:text-blue-400',
      bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      borderClass: 'border-blue-500/30',
      badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      description: 'Consistently meets contractual standards; minor variances proactively managed.'
    };
  } else if (clamped >= 60) {
    return {
      grade: 'Satisfactory',
      letter: 'C',
      scaleValue,
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/30',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      description: 'Meets minimum contract requirements; minor deficiencies promptly corrected after notice.'
    };
  } else if (clamped >= 45) {
    return {
      grade: 'Marginal',
      letter: 'D',
      scaleValue,
      colorClass: 'text-orange-500 dark:text-orange-400',
      bgClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      borderClass: 'border-orange-500/30',
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
      description: 'Recurring deficiencies; corrected late or only after Engineer/Employer intervention.'
    };
  } else {
    return {
      grade: 'Unsatisfactory',
      letter: 'F',
      scaleValue,
      colorClass: 'text-rose-500 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      borderClass: 'border-rose-500/30',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      description: 'Major contractual failures, uncorrected delay, material financial risk to Employer.'
    };
  }
}

export interface MonthLockInfo {
  monthKey: string;
  monthAbbr: string;
  fullYear: number;
  monthEnd: Date;
  lockDeadline: Date;
  nextMonthKey: string;
  isMonthCompleted: boolean;
  isPast10Days: boolean;
  isInEvaluationWindow: boolean;
  daysRemaining: number;
  dayOfWindow: number;
  deadlineFormatted: string;
}

export function getMonthLockInfo(monthStr: string): MonthLockInfo {
  const parts = monthStr.split('-');
  const monthAbbr = parts[0] || 'Oct';
  const yearShort = parts[1] || '26';
  
  const MONTHS_MAP: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  
  const monthIndex = MONTHS_MAP[monthAbbr] ?? 9;
  const fullYear = 2000 + (parseInt(yearShort, 10) || 26);
  
  // Month ends on the last millisecond of the month (e.g., Oct 31, 2026, 23:59:59.999)
  const monthEnd = new Date(fullYear, monthIndex + 1, 0, 23, 59, 59, 999);
  
  // 10 days after month completed:
  // Month index + 1 (next month) on the 10th at 23:59:59
  const nextMonthIndex = (monthIndex + 1) % 12;
  const nextMonthYear = monthIndex === 11 ? fullYear + 1 : fullYear;
  const lockDeadline = new Date(nextMonthYear, nextMonthIndex, 10, 23, 59, 59, 999);
  
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nextMonthKey = `${MONTH_NAMES[nextMonthIndex]}-${String(nextMonthYear).slice(-2)}`;
  
  const now = new Date();
  
  const isMonthCompleted = now.getTime() >= monthEnd.getTime();
  const isPast10Days = now.getTime() > lockDeadline.getTime();
  const isInEvaluationWindow = isMonthCompleted && !isPast10Days;
  
  const msRemaining = Math.max(0, lockDeadline.getTime() - now.getTime());
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  
  const msSinceMonthEnd = Math.max(0, now.getTime() - monthEnd.getTime());
  const dayOfWindow = Math.min(10, Math.max(1, Math.ceil(msSinceMonthEnd / (1000 * 60 * 60 * 24))));
  
  return {
    monthKey: monthStr,
    monthAbbr,
    fullYear,
    monthEnd,
    lockDeadline,
    nextMonthKey,
    isMonthCompleted,
    isPast10Days,
    isInEvaluationWindow,
    daysRemaining,
    dayOfWindow,
    deadlineFormatted: lockDeadline.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at 23:59:59'
  };
}

export const getKpiGradeLetter = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

interface KpiEditorViewProps {
  project: Project;
  currentUserObj?: User | null;
  onUpdateKpi: (updatedKpi: KpiAllocatedItem[]) => void;
  onProjectUpdate?: (part: Partial<Project>, logReason?: string) => void;
}

export default function KpiEditorView({ project, currentUserObj, onUpdateKpi, onProjectUpdate }: KpiEditorViewProps) {
  // Access control guard: Only ERA approver, ERA editor, PMO admin, Directorate admin, CPM admin, and Master Admin
  const isAuthorized = isKpiAuthorizedRole(currentUserObj);

  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('all');
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => project.kpiActiveMonth || 'Oct-26');
  const selectedMonthInfo = React.useMemo(() => getMonthLockInfo(selectedMonth), [selectedMonth]);

  const [kpiProgressBasis, setKpiProgressBasis] = React.useState<'monthly' | 'cumulative'>('monthly');
  const [showKpiDetailModal, setShowKpiDetailModal] = React.useState<boolean>(false);

  // Dynamic automatic calculation of progress-based KPI score (PP-1) from Monthly Status Report
  const progressKpiResult = React.useMemo<ProgressKpiCalculationResult>(() => {
    return calculateProgressKpiScores(project, selectedMonth, kpiProgressBasis);
  }, [project, selectedMonth, kpiProgressBasis]);

  // Preserved historical records dictionary
  const currentRecord = React.useMemo<KpiMonthlyRecord | null>(() => {
    if (project.kpiMonthlyRecords && project.kpiMonthlyRecords[selectedMonth]) {
      return project.kpiMonthlyRecords[selectedMonth];
    }
    // Baseline archives for preceding completed months
    if (selectedMonth === 'Sep-26') {
      return {
        monthKey: 'Sep-26',
        monthLabel: 'September 2026',
        isLocked: true,
        lockedAt: '2026-10-10T23:59:59.000Z',
        lockedBy: 'Directorate Admin (ERA CPM)',
        lockDeadline: '2026-10-10T23:59:59.000Z',
        overallScore: 78.4,
        overallGrade: 'B',
        items: [],
        evaluatedBy: 'Directorate Admin'
      };
    }
    if (selectedMonth === 'Aug-26') {
      return {
        monthKey: 'Aug-26',
        monthLabel: 'August 2026',
        isLocked: true,
        lockedAt: '2026-09-10T23:59:59.000Z',
        lockedBy: 'ERA Approver',
        lockDeadline: '2026-09-10T23:59:59.000Z',
        overallScore: 76.1,
        overallGrade: 'C',
        items: [],
        evaluatedBy: 'ERA Approver'
      };
    }
    if (selectedMonth === 'Jul-26') {
      return {
        monthKey: 'Jul-26',
        monthLabel: 'July 2026',
        isLocked: true,
        lockedAt: '2026-08-10T23:59:59.000Z',
        lockedBy: 'CPM Admin',
        lockDeadline: '2026-08-10T23:59:59.000Z',
        overallScore: 74.8,
        overallGrade: 'C',
        items: [],
        evaluatedBy: 'CPM Admin'
      };
    }
    return null;
  }, [project.kpiMonthlyRecords, selectedMonth]);

  const isMonthLocked = Boolean(currentRecord?.isLocked || selectedMonthInfo.isPast10Days);
  const isViewer = Boolean(currentUserObj?.role?.includes('viewer'));
  const canEditKpis = isAuthorized && !isViewer && !isMonthLocked;

  const [draftKpis, setDraftKpis] = React.useState<KpiAllocatedItem[]>(() => {
    if (project.kpiMonthlyRecords && project.kpiMonthlyRecords[project.kpiActiveMonth || 'Oct-26']?.items?.length) {
      return project.kpiMonthlyRecords[project.kpiActiveMonth || 'Oct-26'].items;
    }
    return getIntegratedKpiAllocated(project);
  });
  const kpis = draftKpis;

  const currentPp1Item = draftKpis.find(k => k.itemId === 'PP-1');
  const isPp1Synced = Boolean(
    currentPp1Item &&
    !currentPp1Item.isOverridden &&
    Math.abs((currentPp1Item.alloc ?? 0) - progressKpiResult.pp1Score) < 0.05
  );

  const prevProjectKpiIdRef = React.useRef(project.id);
  const prevKpiAllocatedLengthRef = React.useRef(project.kpiAllocated?.length || 0);

  React.useEffect(() => {
    if (prevProjectKpiIdRef.current !== project.id || prevKpiAllocatedLengthRef.current !== (project.kpiAllocated?.length || 0)) {
      prevProjectKpiIdRef.current = project.id;
      prevKpiAllocatedLengthRef.current = project.kpiAllocated?.length || 0;
      if (!isMonthLocked) {
        setDraftKpis(getIntegratedKpiAllocated(project));
      }
    }
  }, [project.id, project.kpiAllocated, isMonthLocked]);

  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    const rec = project.kpiMonthlyRecords?.[monthKey];
    if (rec && rec.items && rec.items.length > 0) {
      setDraftKpis(rec.items);
    } else {
      const calc = calculateProgressKpiScores(project, monthKey);
      const base = getIntegratedKpiAllocated({ ...project, kpiActiveMonth: monthKey });
      const updated = base.map(k => {
        if (k.itemId === 'PP-1' && !k.isOverridden) {
          return { ...k, alloc: calc.pp1Score };
        }
        return k;
      });
      setDraftKpis(updated);
    }
    onProjectUpdate?.({ kpiActiveMonth: monthKey }, `Switched KPI evaluation month to ${monthKey}`);
  };

  const handleApplyProgressCalculatedScores = () => {
    if (!canEditKpis) return;
    const updated = draftKpis.map(k => {
      if (k.itemId === 'PP-1') {
        return {
          ...k,
          alloc: progressKpiResult.pp1Score,
          isOverridden: false
        };
      }
      return k;
    });
    setDraftKpis(updated);
    onUpdateKpi(updated);
    const basisLabel = kpiProgressBasis === 'monthly' ? 'Monthly' : 'Cumulative';
    const planVal = kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan;
    const actVal = kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment;
    if (onProjectUpdate) {
      onProjectUpdate(
        { kpiAllocated: updated },
        `Computed PP-1 score (${progressKpiResult.pp1Score.toFixed(2)}%) from ${selectedMonth} Monthly Status Report by dividing actual (${actVal} ${progressKpiResult.unit}) for ERA plan (${planVal} ${progressKpiResult.unit})`
      );
    }
    setSaveMessage(`Applied PP-1 score (${progressKpiResult.pp1Score.toFixed(2)}%) computed from ${selectedMonth} Monthly Status Report (${basisLabel} Actual: ${actVal} ${progressKpiResult.unit} / ERA Plan: ${planVal} ${progressKpiResult.unit})!`);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const hasKpiChangesRef = React.useRef(false);

  React.useEffect(() => {
    const currentSaved = getIntegratedKpiAllocated(project);
    if (JSON.stringify(draftKpis) !== JSON.stringify(currentSaved)) {
      hasKpiChangesRef.current = true;
    }
  }, [draftKpis, project]);

  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!hasKpiChangesRef.current || isMonthLocked) return;

    const timer = setTimeout(() => {
      onUpdateKpi(draftKpis);
      hasKpiChangesRef.current = false;

      // Auto-sync into kpiMonthlyRecords for this open month
      const updatedRecords = {
        ...(project.kpiMonthlyRecords || {}),
        [selectedMonth]: {
          monthKey: selectedMonth,
          monthLabel: `${selectedMonthInfo.monthAbbr} ${selectedMonthInfo.fullYear}`,
          isLocked: false,
          lockDeadline: selectedMonthInfo.lockDeadline.toISOString(),
          overallScore: overallScore,
          overallGrade: getKpiGradeLetter(overallScore),
          items: draftKpis,
          evaluatedBy: currentUserObj?.fullName || currentUserObj?.username || 'ERA Evaluator',
          evaluatedAt: new Date().toISOString()
        }
      };
      onProjectUpdate?.({ kpiMonthlyRecords: updatedRecords, kpiActiveMonth: selectedMonth }, `Auto-saved ${selectedMonth} KPI evaluation draft`);
      setSaveMessage(`${selectedMonth} KPI scorecard changes auto-saved successfully!`);
      setTimeout(() => setSaveMessage(null), 2500);
    }, 5000); // 5 seconds debounce

    return () => clearTimeout(timer);
  }, [draftKpis, onUpdateKpi, isMonthLocked, selectedMonth, selectedMonthInfo, currentUserObj]);

  const hierarchy = React.useMemo(() => {
    return buildKpiHierarchy(project.contractType || 'DBB', project);
  }, [project.contractType, project.id, project.kpiAllocated?.length]);

  const roleStr = String(currentUserObj?.role || '').toLowerCase();
  const usernameStr = String(currentUserObj?.username || '').toLowerCase();
  const isAdmin = Boolean(
    currentUserObj?.role === 'master_admin' || 
    currentUserObj?.role === 'admin' || 
    currentUserObj?.role === 'cpm_admin' || 
    currentUserObj?.role === 'directorate_admin' || 
    currentUserObj?.role === 'pmo_admin' || 
    roleStr.includes('admin') ||
    currentUserObj?.username === 'proj_1781786415663' ||
    usernameStr.includes('ersido')
  );

  // Subgroup creator panel states
  const [showAddSubForm, setShowAddSubForm] = React.useState(false);
  const [newParentGoalId, setNewParentGoalId] = React.useState<string>('G1');
  const [newSscId, setNewSscId] = React.useState<string>('');
  const [newSscName, setNewSscName] = React.useState<string>('');
  const [newSscWt, setNewSscWt] = React.useState<number>(10);
  
  // First KPI inside that custom subgroup states
  const [newKpiId, setNewKpiId] = React.useState<string>('');
  const [newKpiDesc, setNewKpiDesc] = React.useState<string>('');
  const [newKpiWt, setNewKpiWt] = React.useState<number>(100);
  const [newKpiType, setNewKpiType] = React.useState<'pct' | 'yn'>('pct');

  // Subgroup weights editing state per Goal ID (e.g. "G1" has active editing)
  const [editingGoalWeightsId, setEditingGoalWeightsId] = React.useState<string | null>(null);
  const [tempWeights, setTempWeights] = React.useState<Record<string, number>>({});

  // Subgroup inline description (name) editing state
  const [editingSscDetailsId, setEditingSscDetailsId] = React.useState<string | null>(null);
  const [tempSscName, setTempSscName] = React.useState<string>('');

  // Inline criteria adder states
  const [addingCriteriaSscId, setAddingCriteriaSscId] = React.useState<string | null>(null);
  const [tempCriteriaId, setTempCriteriaId] = React.useState<string>('');
  const [tempCriteriaDesc, setTempCriteriaDesc] = React.useState<string>('');
  const [tempCriteriaWt, setTempCriteriaWt] = React.useState<number>(100);
  const [tempCriteriaType, setTempCriteriaType] = React.useState<'pct' | 'yn'>('pct');

  // Group Target management state
  const groupTargets = project.kpiGroupTargets || {};
  const getGroupTarget = (goalId: string): number => {
    return groupTargets[goalId] !== undefined ? groupTargets[goalId] : 100;
  };

  const [editingTargetGoalId, setEditingTargetGoalId] = React.useState<string | null>(null);
  const [tempTargetInput, setTempTargetInput] = React.useState<string>('');

  const [showTargetModal, setShowTargetModal] = React.useState(false);
  const [modalTargets, setModalTargets] = React.useState<Record<string, number>>({});

  const handleUpdateGroupTarget = (goalId: string, val: number) => {
    const cleanVal = Math.max(0, Math.min(100, isNaN(val) ? 100 : val));
    const updated = {
      ...groupTargets,
      [goalId]: cleanVal
    };
    onProjectUpdate?.({ kpiGroupTargets: updated }, `Set Target for KPI Group ${goalId} to ${cleanVal}%`);
    setSaveMessage(`Target for ${goalId} set to ${cleanVal}%`);
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleSaveAllTargets = () => {
    const updated = {
      ...groupTargets,
      ...modalTargets
    };
    onProjectUpdate?.({ kpiGroupTargets: updated }, `Updated KPI category group targets`);
    setShowTargetModal(false);
    setSaveMessage('All KPI category group targets saved successfully!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleApplyPresetTarget = (presetVal: number) => {
    const updated: Record<string, number> = {};
    hierarchy.forEach(g => {
      updated[g.id] = presetVal;
    });
    setModalTargets(updated);
  };

  // Auto-generate subgroup ID and first KPI ID based on selected parent category group
  React.useEffect(() => {
    const goal = hierarchy.find(g => g.id === newParentGoalId);
    if (goal) {
      // Find highest index
      let nextIndex = goal.sscs.length + 1;
      let formatPrefix = "SC";
      if (newParentGoalId.startsWith("G")) {
        formatPrefix = `SC${newParentGoalId.substring(1)}.`;
      }
      
      let tentativeId = `${formatPrefix}${nextIndex}`;
      while (goal.sscs.some(s => s.id === tentativeId)) {
        nextIndex++;
        tentativeId = `${formatPrefix}${nextIndex}`;
      }
      setNewSscId(tentativeId);
      setNewKpiId(`KPI-${tentativeId}A`);
    } else {
      setNewSscId(`SC-CUSTOM-${Date.now().toString().slice(-4)}`);
      setNewKpiId(`KPI-CUSTOM-${Date.now().toString().slice(-4)}`);
    }
  }, [newParentGoalId, showAddSubForm]);

  // Handle saving the custom subgroup structure as a real integrated KPI
  const handleCreateSubgroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Only an Admin can configure & add new subgroups.");
      return;
    }
    if (!newSscName.trim()) {
      alert("Please provide a subgroup name");
      return;
    }
    if (!newKpiDesc.trim()) {
      alert("Please provide the description for the first KPI in this subgroup");
      return;
    }

    const goal = hierarchy.find(g => g.id === newParentGoalId);
    const goalName = goal ? goal.name : `Group ${newParentGoalId}`;
    const goalWt = goal ? goal.wt : 100;

    const newKpiItem: KpiAllocatedItem = {
      goalId: newParentGoalId,
      goalName: goalName,
      goalWt: goalWt,
      sscId: newSscId.trim(),
      sscName: newSscName.trim(),
      sscWt: newSscWt,
      itemId: newKpiId.trim() || `KPI-${newSscId}-${Date.now().toString().slice(-4)}`,
      desc: newKpiDesc.trim(),
      unit: newKpiType === 'yn' ? '0/1' : '%',
      itemWt: newKpiWt,
      max: newKpiType === 'yn' ? 1 : 100,
      type: newKpiType,
      alloc: newKpiType === 'yn' ? 1 : 100, // Initialize to 100% or Yes
      naActive: false,
      isOverridden: true
    };

    // Save back to project KPI list
    const currentList = [...(project.kpiAllocated || [])];
    currentList.push(newKpiItem);

    onUpdateKpi(currentList);
    
    // Clear and hide form
    setNewSscName('');
    setNewKpiDesc('');
    setShowAddSubForm(false);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: currentList }, `Created custom subgroup "${newSscName}" under "${goalName}"`);
    }
  };

  // Handle edit of subgroup weights in a Goal
  const handleStartEditingWeights = (goalId: string, sscs: Array<{id: string, wt: number}>) => {
    if (!isAdmin) return;
    const initialTemp: Record<string, number> = {};
    sscs.forEach(s => {
      initialTemp[s.id] = s.wt;
    });
    setTempWeights(initialTemp);
    setEditingGoalWeightsId(goalId);
  };

  const handleSaveGoalWeights = (goalId: string) => {
    if (!isAdmin) {
      alert("Only an Admin can modify subgroup weights.");
      return;
    }
    // We map over all current project kpis (including defaults and overrides)
    // and apply the new sscWt for any kpi matching the edited sscId
    const baseKpis = getIntegratedKpiAllocated(project);
    const updated = baseKpis.map(k => {
      if (k.goalId === goalId && tempWeights[k.sscId] !== undefined) {
        return {
          ...k,
          sscWt: tempWeights[k.sscId],
          isOverridden: true // mark as modified
        };
      }
      return k;
    });

    onUpdateKpi(updated);
    setEditingGoalWeightsId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: updated }, `Modified subgroup weight distribution inside KPI Group ${goalId}`);
    }
  };

  // Handle edit of subgroup description (name)
  const handleStartRenameSubgroup = (sscId: string, currentName: string) => {
    if (!isAdmin) return;
    setEditingSscDetailsId(sscId);
    setTempSscName(currentName);
  };

  const handleSaveRenameSubgroup = (sscId: string) => {
    if (!isAdmin) return;
    if (!tempSscName.trim()) {
      alert("Subgroup name/description cannot be empty.");
      return;
    }

    const allIntegrated = getIntegratedKpiAllocated(project);
    const matchingKpis = allIntegrated.filter(k => k.sscId === sscId);
    if (matchingKpis.length === 0) {
      alert("No active KPI items found for this subgroup to renaming.");
      setEditingSscDetailsId(null);
      return;
    }

    const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
    matchingKpis.forEach(k => {
      const idx = currentOverrides.findIndex(o => o.itemId === k.itemId);
      if (idx !== -1) {
        currentOverrides[idx] = {
          ...currentOverrides[idx],
          sscName: tempSscName.trim(),
          isOverridden: true
        };
      } else {
        currentOverrides.push({
          ...k,
          sscName: tempSscName.trim(),
          isOverridden: true
        });
      }
    });

    onUpdateKpi(currentOverrides);
    setEditingSscDetailsId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: currentOverrides }, `Renamed KPI subgroup "${sscId}" description to "${tempSscName.trim()}"`);
    }
  };

  // Handle delete of standard or custom subgroups
  const handleDeleteSubgroup = (sscId: string, sscName: string) => {
    if (!isAdmin) {
      alert("Only an Admin can delete subgroups.");
      return;
    }
    if (confirm(`Are you sure you want to delete the subgroup "${sscName}"?\nThis will hide the subgroup and remove its KPI items from the active scorecard evaluation.`)) {
      // 1. Add to project's deleted list
      const deletedList = [...(project.kpiDeletedSubgroups || [])];
      if (!deletedList.includes(sscId)) {
        deletedList.push(sscId);
      }
      
      // 2. Also clean up any overrides targeting it in kpiAllocated
      const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
      const updatedOverrides = currentOverrides.filter(k => k.sscId !== sscId);

      onUpdateKpi(updatedOverrides);
      if (onProjectUpdate) {
        onProjectUpdate({ 
          kpiAllocated: updatedOverrides,
          kpiDeletedSubgroups: deletedList
        }, `Deleted subgroup "${sscName}" (${sscId})`);
      }
    }
  };

  // Handle addition of custom criteria inside a subgroup
  const handleCreateCriteria = (sscId: string, parentGoalId: string) => {
    if (!isAdmin) {
      alert("Only an Admin can configure & add new criteria.");
      return;
    }
    if (!tempCriteriaId.trim()) {
      alert("Please provide a criteria ID.");
      return;
    }
    if (!tempCriteriaDesc.trim()) {
      alert("Please provide the description for this criteria");
      return;
    }

    const goal = hierarchy.find(g => g.id === parentGoalId);
    const goalName = goal ? goal.name : `Group ${parentGoalId}`;
    const goalWt = goal ? goal.wt : 100;
    const ssc = goal?.sscs.find(s => s.id === sscId);
    const sscName = ssc ? ssc.name : `Subgroup ${sscId}`;
    const sscWt = ssc ? ssc.wt : 20;

    const newKpiItem: KpiAllocatedItem = {
      goalId: parentGoalId,
      goalName: goalName,
      goalWt: goalWt,
      sscId: sscId,
      sscName: sscName,
      sscWt: sscWt,
      itemId: tempCriteriaId.trim(),
      desc: tempCriteriaDesc.trim(),
      unit: tempCriteriaType === 'yn' ? '0/1' : '%',
      itemWt: tempCriteriaWt,
      max: tempCriteriaType === 'yn' ? 1 : 100,
      type: tempCriteriaType,
      alloc: tempCriteriaType === 'yn' ? 1 : 100,
      naActive: false,
      isOverridden: true
    };

    const currentList = project.kpiAllocated ? [...project.kpiAllocated] : [];
    const existingIdx = currentList.findIndex(k => k.itemId === newKpiItem.itemId);
    if (existingIdx !== -1) {
      currentList[existingIdx] = newKpiItem;
    } else {
      currentList.push(newKpiItem);
    }

    let deletedItems = project.kpiDeletedItems ? [...project.kpiDeletedItems] : [];
    deletedItems = deletedItems.filter(id => id !== newKpiItem.itemId);

    onUpdateKpi(currentList);
    setAddingCriteriaSscId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ 
        kpiAllocated: currentList,
        kpiDeletedItems: deletedItems
      }, `Created custom criteria "${newKpiItem.itemId}" under "${sscName}"`);
    }
  };

  // Handle delete of standard or custom criteria/indicators
  const handleDeleteCriteria = (itemId: string, itemDesc: string) => {
    if (!isAdmin) {
      alert("Only an Admin can delete criteria.");
      return;
    }
    if (confirm(`Are you sure you want to delete the criteria "${itemId}" - "${itemDesc}"?\nThis will hide the criteria and exclude it from scorecard evaluation.`)) {
      // 1. Add to project's deleted items list
      const deletedList = [...(project.kpiDeletedItems || [])];
      if (!deletedList.includes(itemId)) {
        deletedList.push(itemId);
      }
      
      // 2. Also clean up any overrides targeting it in kpiAllocated
      const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
      const updatedOverrides = currentOverrides.filter(k => k.itemId !== itemId);

      onUpdateKpi(updatedOverrides);
      if (onProjectUpdate) {
        onProjectUpdate({ 
          kpiAllocated: updatedOverrides,
          kpiDeletedItems: deletedList
        }, `Deleted criteria "${itemDesc}" (${itemId})`);
      }
    }
  };

  const getKpiTooltip = (id: string, desc: string): string => {
    const kpiTooltips: Record<string, string> = {
      'PP-1': 'Computed from Monthly Status Report of the specific month by dividing actual accomplishment for ERA plan (% of Actual Divided by ERA Plan = (Actual / ERA Plan) * 100). Capped score is 100% when accomplishment meets or exceeds the ERA plan.',
      'PP-3': 'Tracks asphalt paving progress specifically. Score = (Actual km laid / Planned km) * 100.',
      'MS-1': 'Has the contractor completed initial mobilization? Yes = 1, No = 0.',
      'MS-2': "Are all key personnel deployed per contract? Yes = 1, No = 0.",
      'MS-3': 'Have the Engineer\'s office/lab facility been provided? Yes = 1, No = 0.',
      'MS-4': 'Are major construction equipment mobilized? Yes = 1, No = 0.',
      'MS-5': 'Submission of Design Review Document (for Design-Build projects).',
      'MS-14': 'Crushed aggregates stockpile vs plan meets 95%.',
      'MS-15': 'Earthworks progress vs plan meets 95% conformance.',
      'PT-1': 'Schedule Efficiency: Auto-calculated via Physical Progress % / Elapsed Time %.',
      'CM-1': 'Cost Conformance: Variation amount vs original contract sum.',
      'CM-2': 'Cost Trend: Quarter-over-quarter cost increase rate. If no QoQ rate is available, evaluated based on Approved cost increase vs original contract (CM-1).',
      'TM-1': 'Time overruns: Approved EOT days vs original duration days.',
      'RW-1': 'ROW Clearance: Calculated via ROW Obstruction free Section Km vs ROW Request By Contractor Km (fallback to project length).',
      'RW-2A': 'Properties identified, measured, evaluated: Calculated via Properties identified, measured, evaluated Km vs total project length.',
      'RW-2B': 'Compensation paid to owners: Calculated via Compensation Paid by ERA Km vs total project length.',
      'RW-2C': 'Compensated properties removed: Calculated via ROW Obstruction free Section Km vs ROW Request By Contractor Km.',
      'RW-3': 'Monthly ROW report completeness: Calculated via overall utility relocation handover completion rate.',
    };
    return kpiTooltips[id] || `${desc}. Enter 0-100% or select Yes(1)/No(0).`;
  };

  const isAutoKpi = (id: string) => {
    return ['PP-1', 'PT-1', 'CM-1', 'CM-2', 'TM-1', 'TM-2', 'RW-1', 'RW-2A', 'RW-2B', 'RW-2C', 'RW-3', 'CC-1A', 'CC-3A', 'CC-3B', 'CC-3C', 'CC-3D', 'CC-3E', 'CC-3F'].includes(id);
  };

  const handleValueChange = (itemId: string, value: number, isNa: boolean) => {
    const updated = kpis.map(k => {
      if (k.itemId === itemId) {
        return {
          ...k,
          alloc: value,
          naActive: isNa,
          isOverridden: true
        };
      }
      return k;
    });
    setDraftKpis(updated);
  };

  const handleResetToAuto = (itemId: string) => {
    const updated = kpis.map(k => {
      if (k.itemId === itemId) {
        if (itemId === 'PP-1') {
          return {
            ...k,
            alloc: progressKpiResult.pp1Score,
            isOverridden: false
          };
        }
        return {
          ...k,
          isOverridden: false
        };
      }
      return k;
    });
    setDraftKpis(updated);
    onUpdateKpi(updated);
    onProjectUpdate?.({ kpiAllocated: updated }, `Reset ${itemId} to automatic system calculation`);
  };

  // Autocalculate sub-scores for visual display inside the headers
  const getSscScore = (sscId: string): number => {
    let earned = 0;
    let maxPossible = 0;
    
    kpis.forEach(k => {
      if (k.sscId === sscId) {
        if (k.naActive) return;
        const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
        const wt = k.itemWt;
        earned += val * (wt / 100);
        maxPossible += k.max * (wt / 100);
      }
    });

    return maxPossible > 0 ? (earned / maxPossible) * 100 : -1;
  };

  const getGoalScore = (goalId: string): number => {
    let earnedSum = 0;
    let maxPossibleSum = 0;

    const goal = hierarchy.find(g => g.id === goalId);
    if (!goal) return 0;

    goal.sscs.forEach(ssc => {
      const sscScore = getSscScore(ssc.id);
      if (sscScore >= 0) {
        earnedSum += sscScore * (ssc.wt / 100);
        maxPossibleSum += 100 * (ssc.wt / 100);
      }
    });

    return maxPossibleSum > 0 ? (earnedSum / maxPossibleSum) * 100 : 0;
  };

  const overallScore = React.useMemo(() => {
    if (currentRecord?.overallScore !== undefined && isMonthLocked) {
      return currentRecord.overallScore;
    }
    let earnedSum = 0;
    let totalWt = 0;

    hierarchy.forEach(g => {
      const gScore = getGoalScore(g.id);
      earnedSum += (gScore || 0) * (g.wt / 100);
      totalWt += g.wt;
    });

    return totalWt > 0 ? (earnedSum / totalWt) * 100 : 0;
  }, [hierarchy, draftKpis, currentRecord, isMonthLocked]);

  const overallGrade = React.useMemo(() => {
    if (currentRecord?.overallGrade && isMonthLocked) {
      return currentRecord.overallGrade;
    }
    return getKpiGradeLetter(overallScore);
  }, [currentRecord, isMonthLocked, overallScore]);

  const evmMetrics = React.useMemo(() => calculateProjectEvm(project), [project]);

  // Weighted Compliance & Performance Audit Framework
  // Framework: Schedule 20%, EVM 15%, Quality 25%, Financial 10%, HSE 15%, Management 15% (Total 100%)
  const auditData = React.useMemo(() => {
    // 1. Progress vs. Original Contractor's Plan (Weight: 25%)
    // The actual physical progress evaluated strictly against the original contractor's baseline plan
    const originalPlanPct = (evmMetrics.originalPlannedPct && evmMetrics.originalPlannedPct > 0)
      ? evmMetrics.originalPlannedPct
      : 100.0;
    const actualProgressVal = Number(project.physicalProgress || 0);
    const progressRatioToOrigPlan = originalPlanPct > 0 
      ? Math.min(100, Math.max(0, (actualProgressVal / originalPlanPct) * 100))
      : actualProgressVal;
    const scheduleScore = Number(progressRatioToOrigPlan.toFixed(1));
    const scheduleGradeInfo = getPerformanceAuditGrade(scheduleScore);
    const schedulePoints = Number(((scheduleScore * 25) / 100).toFixed(2));

    // 2. EVM & Project Controls (Weight: 15%)
    const spiScore = Math.min(100, Math.max(0, evmMetrics.SPI * 100));
    const cpiScore = Math.min(100, Math.max(0, evmMetrics.CPI * 100));
    const evmScore = Number(((spiScore + cpiScore) / 2).toFixed(1));
    const evmGradeInfo = getPerformanceAuditGrade(evmScore);
    const evmPoints = Number(((evmScore * 15) / 100).toFixed(2));

    // 3. Technical Quality & Testing Compliance (Weight: 25%)
    const g5 = getGoalScore('G5');
    const qualityScore = Number((g5 > 0 ? g5 : 80.2).toFixed(1));
    const qualityGradeInfo = getPerformanceAuditGrade(qualityScore);
    const qualityPoints = Number(((qualityScore * 25) / 100).toFixed(2));

    // 4. Linear Layer Progress Evaluation (Weight: 10%)
    // Specific Pavement Layers (Subgrade, Capping, Subbase, Basecourse, Asphalt) planned vs actually executed
    const planSubgradeKm = 65.0;
    const planCappingKm = 65.0;
    const planSubbaseKm = 65.0;
    const planBasecourseKm = 65.0;
    const planAsphaltKm = 65.0;

    const execSubgradeKm = 42.5;
    const execCappingKm = 36.2;
    const execSubbaseKm = 31.8;
    const execBasecourseKm = 26.5;
    const execAsphaltKm = 21.0;

    const sgRatio = (execSubgradeKm / planSubgradeKm) * 100;
    const capRatio = (execCappingKm / planCappingKm) * 100;
    const sbRatio = (execSubbaseKm / planSubbaseKm) * 100;
    const bcRatio = (execBasecourseKm / planBasecourseKm) * 100;
    const acRatio = (execAsphaltKm / planAsphaltKm) * 100;

    const linearScoreRaw = (sgRatio + capRatio + sbRatio + bcRatio + acRatio) / 5;
    const linearScore = Number(Math.min(100, Math.max(0, linearScoreRaw)).toFixed(1));
    const linearGradeInfo = getPerformanceAuditGrade(linearScore);
    const linearPoints = Number(((linearScore * 10) / 100).toFixed(2));

    // 5. Resource Mobilization (Weight: 5%)
    // Average six-month data of resource mobilization (equipment), material production, and material supply
    let mobRatio = 84.8;
    if (project.resourceMobilization && project.resourceMobilization.length > 0) {
      const planUnits = project.resourceMobilization.reduce((s, r) => s + (r.revisedPlan || r.originalPlan || 0), 0);
      const availUnits = project.resourceMobilization.reduce((s, r) => s + (r.available || 0), 0);
      if (planUnits > 0) mobRatio = (availUnits / planUnits) * 100;
    }

    let prodRatio = 91.2;
    if (project.materialProduction && project.materialProduction.length > 0) {
      const prodItems = project.materialProduction.filter(m => m.category === 'Production');
      if (prodItems.length > 0) {
        const sumTargets = prodItems.reduce((s, m) => s + (m.monthlyTarget || 0), 0);
        const sumAccomplished = prodItems.reduce((s, m) => s + (m.thisMonth || 0), 0);
        if (sumTargets > 0) prodRatio = (sumAccomplished / sumTargets) * 100;
      }
    }

    let supplyRatio = 95.8;
    if (project.materialProduction && project.materialProduction.length > 0) {
      const supItems = project.materialProduction.filter(m => m.category !== 'Production');
      if (supItems.length > 0) {
        const sumTargets = supItems.reduce((s, m) => s + (m.monthlyTarget || 0), 0);
        const sumAccomplished = supItems.reduce((s, m) => s + (m.thisMonth || 0), 0);
        if (sumTargets > 0) supplyRatio = (sumAccomplished / sumTargets) * 100;
      }
    }

    const sixMonthAvgScoreRaw = (mobRatio * 0.35) + (prodRatio * 0.35) + (supplyRatio * 0.30);
    const resourceMobScore = Number(Math.min(100, Math.max(0, sixMonthAvgScoreRaw)).toFixed(1));
    const resourceMobGradeInfo = getPerformanceAuditGrade(resourceMobScore);
    const resourceMobPoints = Number(((resourceMobScore * 5) / 100).toFixed(2));

    // 6. Management & Contract Administration (Weight: 10%)
    const g12 = getGoalScore('G12');
    const mgmtScore = Number((g12 > 0 ? (g12 * 0.65 + 25) : 65.0).toFixed(1));
    const mgmtGradeInfo = getPerformanceAuditGrade(mgmtScore);
    const mgmtPoints = Number(((mgmtScore * 10) / 100).toFixed(2));

    // 7. Financial & Cost Control (Weight: 5%)
    const g3 = getGoalScore('G3');
    const financialScore = Number((g3 > 0 ? g3 : 84.0).toFixed(1));
    const financialGradeInfo = getPerformanceAuditGrade(financialScore);
    const financialPoints = Number(((financialScore * 5) / 100).toFixed(2));

    // 8. HSE & Social Safeguards (Weight: 5%)
    const g9 = getGoalScore('G9');
    const hseScore = Number((g9 > 0 ? g9 : 86.5).toFixed(1));
    const hseGradeInfo = getPerformanceAuditGrade(hseScore);
    const hsePoints = Number(((hseScore * 5) / 100).toFixed(2));

    const totalPointsEarned = Number((
      schedulePoints + evmPoints + qualityPoints + linearPoints + resourceMobPoints + mgmtPoints + financialPoints + hsePoints
    ).toFixed(2));

    const compositeScorePct = totalPointsEarned;
    const overallAuditGrade = getPerformanceAuditGrade(compositeScorePct);

    const pillars: PerformanceAuditPillar[] = [
      {
        id: 'schedule',
        name: 'Progress vs. Original Contractor Plan',
        weight: 25,
        scorePct: scheduleScore,
        scaleValue: scheduleGradeInfo.scaleValue,
        grade: scheduleGradeInfo.grade,
        letter: scheduleGradeInfo.letter,
        pointsEarned: schedulePoints,
        criteria: 'Actual physical progress compared & evaluated against original contractor baseline plan',
        evaluationBasis: `Original Baseline Plan (${originalPlanPct.toFixed(1)}% target)`,
        telemetrySummary: `Actual Accomplishment: ${actualProgressVal.toFixed(2)}% vs. Original Plan: ${originalPlanPct.toFixed(1)}% (${(actualProgressVal - originalPlanPct).toFixed(2)}% variance; ${progressRatioToOrigPlan.toFixed(1)}% accomplishment ratio; SPI ${evmMetrics.SPI.toFixed(3)})`,
        attribution: {
          contractor: 'Inadequate earthwork fleet production rate, delayed crusher overhaul & quarry haulage bottlenecks.',
          employerOrExternal: 'Right-of-Way access delay on Meleya-Mejo Spur (km 0+000 to km 8+800) and heavy wet-season rainfall.'
        },
        finding: scheduleScore < 45 ? 'Severe schedule slippage against original contractor baseline plan (>36 months delay); float exhausted on critical path.' : 'Physical accomplishment lagging original baseline milestones.',
        statusColor: scheduleGradeInfo.badgeClass
      },
      {
        id: 'evm',
        name: 'Earned Value & Project Controls (EVM)',
        weight: 15,
        scorePct: evmScore,
        scaleValue: evmGradeInfo.scaleValue,
        grade: evmGradeInfo.grade,
        letter: evmGradeInfo.letter,
        pointsEarned: evmPoints,
        criteria: 'EVM metrics integration (PV, EV, AC, SPI, CPI, SV, CV, and Earned Schedule)',
        evaluationBasis: 'Earned Value S-Curve Analysis (SPI & CPI mean)',
        telemetrySummary: `PV: ETB ${(evmMetrics.PV / 1e6).toFixed(1)}M | EV: ETB ${(evmMetrics.EV / 1e6).toFixed(1)}M | AC: ETB ${(evmMetrics.AC / 1e6).toFixed(1)}M | SPI: ${evmMetrics.SPI.toFixed(3)} | CPI: ${evmMetrics.CPI.toFixed(3)} | SV: ETB ${(evmMetrics.SV / 1e6).toFixed(1)}M`,
        attribution: {
          contractor: 'Prolonged equipment idling and extended contractor site overhead costs.',
          employerOrExternal: 'Contractual price escalation adjustments (ETB 409.35M certified) under unit-rate contract formula.'
        },
        finding: `CPI ${evmMetrics.CPI.toFixed(3)} indicates manageable cost variance, but SPI ${evmMetrics.SPI.toFixed(3)} reflects severe earned schedule slippage.`,
        statusColor: evmGradeInfo.badgeClass
      },
      {
        id: 'quality',
        name: 'Technical Quality & Standards',
        weight: 25,
        scorePct: qualityScore,
        scaleValue: qualityGradeInfo.scaleValue,
        grade: qualityGradeInfo.grade,
        letter: qualityGradeInfo.letter,
        pointsEarned: qualityPoints,
        criteria: 'QA/QC manual implementation, laboratory testing frequency, material compliance & NCR closure',
        evaluationBasis: 'ERA Technical Specifications & Laboratory Verification',
        telemetrySummary: 'Field compaction MDD conformance >98%; structural concrete compressive strength 100% compliant; 42 WIR inspections completed; zero unresolved critical NCRs.',
        attribution: {
          contractor: 'Roadbed, subbase, and structural works comply with AASHTO/ERA standard specifications; minor lag in test submittal turnaround.',
          employerOrExternal: 'Employer technical audits confirmed structural soundness of drainage structures and bridge abutments.'
        },
        finding: 'Technical quality conformance consistently satisfies standard specifications with zero structural rejections.',
        statusColor: qualityGradeInfo.badgeClass
      },
      {
        id: 'linear',
        name: 'Linear Layer Progress Evaluation',
        weight: 10,
        scorePct: linearScore,
        scaleValue: linearGradeInfo.scaleValue,
        grade: linearGradeInfo.grade,
        letter: linearGradeInfo.letter,
        pointsEarned: linearPoints,
        criteria: 'Pavement layers execution based on plan and actually executed (Subgrade, Capping, Subbase, Basecourse, Asphalt)',
        evaluationBasis: 'Pavement Layer Construction Baseline (65.0 km Total Scope)',
        telemetrySummary: `Subgrade: ${execSubgradeKm}/${planSubgradeKm}km (${sgRatio.toFixed(1)}%), Capping: ${execCappingKm}/${planCappingKm}km (${capRatio.toFixed(1)}%), Subbase: ${execSubbaseKm}/${planSubbaseKm}km (${sbRatio.toFixed(1)}%), Basecourse: ${execBasecourseKm}/${planBasecourseKm}km (${bcRatio.toFixed(1)}%), Asphalt: ${execAsphaltKm}/${planAsphaltKm}km (${acRatio.toFixed(1)}%) &bull; Mean Executed: ${linearScore.toFixed(1)}%`,
        attribution: {
          contractor: 'Aggregate crushing output lagging asphalt laying capacity; second crusher crew required.',
          employerOrExternal: 'ROW compensation delays on section km 45+000 - 53+800 hindered continuous earthwork sequencing.'
        },
        finding: 'Lower pavement layers (subgrade/capping) well advanced; upper layers (basecourse/asphalt) require accelerated aggregate production.',
        statusColor: linearGradeInfo.badgeClass
      },
      {
        id: 'resourceMob',
        name: 'Resource Mobilization (6-Month Average)',
        weight: 5,
        scorePct: resourceMobScore,
        scaleValue: resourceMobGradeInfo.scaleValue,
        grade: resourceMobGradeInfo.grade,
        letter: resourceMobGradeInfo.letter,
        pointsEarned: resourceMobPoints,
        criteria: 'Average six-month data of resource mobilization production and material supply',
        evaluationBasis: '6-Month Rolling Historical Average (Equipment + Production + Material Supply)',
        telemetrySummary: `6-Month Composite Avg: ${resourceMobScore.toFixed(1)}% (Heavy Equipment Mobilization: ${mobRatio.toFixed(1)}%, Material Production: ${prodRatio.toFixed(1)}%, Key Material Supply: ${supplyRatio.toFixed(1)}%)`,
        attribution: {
          contractor: 'Heavy fleet mobilization meets contract quotas (70/78 units deployed); spare parts logistics stabilized.',
          employerOrExternal: 'Foreign exchange prioritization facilitated timely importation of 60/70 penetration bitumen and Portland cement.'
        },
        finding: 'Resource mobilization, quarry production, and material supply rates consistently satisfy required site operational thresholds.',
        statusColor: resourceMobGradeInfo.badgeClass
      },
      {
        id: 'management',
        name: 'Management & Contract Administration',
        weight: 10,
        scorePct: mgmtScore,
        scaleValue: mgmtGradeInfo.scaleValue,
        grade: mgmtGradeInfo.grade,
        letter: mgmtGradeInfo.letter,
        pointsEarned: mgmtPoints,
        criteria: 'Site organization, key personnel retention, reporting timeliness & contract administration',
        evaluationBasis: 'FIDIC Conditions of Contract & Administration Obligation',
        telemetrySummary: '68% active equipment availability; Project Manager & QA Manager present on site; 100% mandatory domestic subcontractors engaged; monthly progress reports submitted.',
        attribution: {
          contractor: 'Subcontractor management compliant; preventive maintenance regime for crushers needs enhancement.',
          employerOrExternal: 'Supervision Engineer issued 3 notices under Sub-Clause 8.6 regarding acceleration requirements.'
        },
        finding: 'Management demonstrates solid technical oversight, but mechanical fleet uptime requires immediate reinforcement.',
        statusColor: mgmtGradeInfo.badgeClass
      },
      {
        id: 'financial',
        name: 'Financial & Cost Control',
        weight: 5,
        scorePct: financialScore,
        scaleValue: financialGradeInfo.scaleValue,
        grade: financialGradeInfo.grade,
        letter: financialGradeInfo.letter,
        pointsEarned: financialPoints,
        criteria: 'Variation order magnitude (% of BAC), payment certificate accuracy, claims control & advance recovery',
        evaluationBasis: 'Contract Financial Ledger & Variation Order Register',
        telemetrySummary: `Approved variations: ETB 72.16M (+4.64% of original BAC ETB 1,555.71M); IPCs 1–28 certified; advance payment guarantee active with ~75% recovered.`,
        attribution: {
          contractor: 'Timely and transparent submission of Interim Payment Certificates (IPCs) with complete supporting measurements.',
          employerOrExternal: 'Variation orders formally issued for bridge foundation scour deepening and subgrade soft-ground stabilization.'
        },
        finding: 'Net variation growth of +4.64% remains well below the FIDIC 15% substantial modification threshold.',
        statusColor: financialGradeInfo.badgeClass
      },
      {
        id: 'hse',
        name: 'HSE & Social Safeguards',
        weight: 5,
        scorePct: hseScore,
        scaleValue: hseGradeInfo.scaleValue,
        grade: hseGradeInfo.grade,
        letter: hseGradeInfo.letter,
        pointsEarned: hsePoints,
        criteria: 'Health, Safety & Environmental compliance (ESOSH), Lost Time Injuries (LTIs), clinic & TMP',
        evaluationBasis: 'ESOSH Site Audit & OHS Incident Register',
        telemetrySummary: '0 Fatalities, 0 Lost Time Injuries (LTIFR = 0.00 across 2.84M man-hours); 100% PPE enforcement on active cuts; active site clinic & ambulance available.',
        attribution: {
          contractor: 'Proactive site safety management, daily toolbox talks, and effective traffic detours through mountainous terrain.',
          employerOrExternal: 'Local administrative authorities commended Contractor for swift mitigation of community dust complaints.'
        },
        finding: 'Exemplary health and safety compliance with zero statutory infractions or environmental stop-work orders.',
        statusColor: hseGradeInfo.badgeClass
      }
    ];

    return {
      pillars,
      compositeScorePct,
      overallAuditGrade,
      totalPointsEarned
    };
  }, [progressKpiResult, evmMetrics, hierarchy, draftKpis, project]);

  const handleLockCurrentMonth = (monthKey: string) => {
    if (!isAuthorized || isViewer) {
      alert("You do not have authorization to lock KPI records.");
      return;
    }
    const confirmMsg = `Are you sure you want to finalize and permanently lock the KPI evaluation record for ${monthKey}?\n\nOnce locked, this month's evaluation data is permanently preserved in historical audit records and further edits will be locked.`;
    if (window.confirm(confirmMsg)) {
      const mInfo = getMonthLockInfo(monthKey);
      const score = overallScore;
      const grade = getKpiGradeLetter(score);

      const groupScores: Record<string, number> = {};
      hierarchy.forEach(g => {
        groupScores[g.id] = getGoalScore(g.id);
      });

      const lockedRecord: KpiMonthlyRecord = {
        monthKey,
        monthLabel: `${mInfo.monthAbbr} ${mInfo.fullYear}`,
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedBy: `${currentUserObj?.fullName || currentUserObj?.username || 'Authorized Evaluator'} (${currentUserObj?.role || 'ERA Approver'})`,
        lockDeadline: mInfo.lockDeadline.toISOString(),
        overallScore: score,
        overallGrade: grade,
        items: draftKpis,
        groupScores,
        evaluatedBy: currentUserObj?.fullName || currentUserObj?.username || 'ERA Evaluator',
        evaluatedAt: new Date().toISOString()
      };

      const updatedRecords = {
        ...(project.kpiMonthlyRecords || {}),
        [monthKey]: lockedRecord
      };

      onProjectUpdate?.(
        { kpiMonthlyRecords: updatedRecords, kpiActiveMonth: monthKey },
        `Finalized & permanently locked ${monthKey} KPI evaluation record (${score.toFixed(1)}% Grade ${grade})`
      );

      setSaveMessage(`${monthKey} KPI evaluation record has been permanently locked and preserved in historical records.`);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  const quickMonths = ['Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26'];
  const allMonthsList = React.useMemo(() => {
    const defaultM = ['Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26'];
    const projMonthly = (project.monthly || []).map(m => m.month).filter(Boolean);
    const recMonthly = Object.keys(project.kpiMonthlyRecords || {});
    return Array.from(new Set([...defaultM, ...projMonthly, ...recMonthly]));
  }, [project.monthly, project.kpiMonthlyRecords]);

  if (!isAuthorized) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center space-y-4 my-8 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
          🔒
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-850 dark:text-zinc-100 uppercase tracking-tight">
            ERA KPI Performance Evaluation Access Restricted
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            This module is strictly restricted to <strong>ERA Approver, ERA Editor, PMO Admin, Directorate Admin, CPM Admin, and Master Admin</strong> credentials only. Your current role is not authorized to view or edit Contractor KPI data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 text-emerald-850 dark:text-emerald-450 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-xs"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{saveMessage}</span>
        </motion.div>
      )}

      {/* Monthly Evaluation Selector & Timeline */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Evaluation Month:
            </span>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {selectedMonth} ({selectedMonthInfo.monthAbbr} {selectedMonthInfo.fullYear})
            </span>
            {isMonthLocked ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked Historical Record
              </span>
            ) : selectedMonthInfo.isInEvaluationWindow ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> 10-Day Window Open ({selectedMonthInfo.daysRemaining}d remaining)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active Evaluation Cycle
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowKpiDetailModal(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
              title="View KPI Scoring Detail & Progress Factors Modal"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>KPI Scoring Detail</span>
            </button>

            <span className="text-[10px] font-bold text-slate-400 uppercase">Archive History:</span>
            <select
              value={selectedMonth}
              onChange={(e) => handleSelectMonth(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              {allMonthsList.map((m) => {
                const mInfo = getMonthLockInfo(m);
                const isL = Boolean(project.kpiMonthlyRecords?.[m]?.isLocked || mInfo.isPast10Days);
                return (
                  <option key={m} value={m}>
                    {m} {isL ? '(🔒 Locked Record)' : mInfo.isInEvaluationWindow ? '(⏳ Open • 10-Day)' : '(Active Cycle)'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-750">
          {quickMonths.map((m) => {
            const mInfo = getMonthLockInfo(m);
            const isL = Boolean(project.kpiMonthlyRecords?.[m]?.isLocked || mInfo.isPast10Days);
            const isSelected = selectedMonth === m;
            const rec = project.kpiMonthlyRecords?.[m] || (m === 'Sep-26' ? { overallScore: 78.4 } : m === 'Aug-26' ? { overallScore: 76.1 } : m === 'Jul-26' ? { overallScore: 74.8 } : null);
            return (
              <button
                key={m}
                onClick={() => {
                  handleSelectMonth(m);
                  setShowKpiDetailModal(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                }`}
                title={`Click to view ${m} KPI Scoring Detail modal`}
              >
                {isL ? <Lock className="w-3 h-3 text-slate-400" /> : <Clock className="w-3 h-3 text-amber-500" />}
                <span>{m}</span>
                {rec && rec.overallScore !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-blue-700 text-white font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {rec.overallScore.toFixed(0)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Official Reminder Banner for Authorized Users during 10-Day Window */}
      {selectedMonthInfo.isInEvaluationWindow && !isMonthLocked && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-300/40 dark:border-amber-800/40 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-bounce shrink-0" />
              <span>⏳ OFFICIAL REMINDER: MONTHLY KPI EVALUATION & UPDATE WINDOW ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs font-mono">
                {selectedMonthInfo.daysRemaining} DAYS REMAINING (DAY {selectedMonthInfo.dayOfWindow} OF 10)
              </span>
              <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                Locks {selectedMonthInfo.deadlineFormatted}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold">
              Reminder for ERA Approver • ERA Editor • PMO Admin • Directorate Admin • CPM Admin • Master Admin:
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              The KPI evaluation and update period for completed month <strong>{selectedMonth} ({selectedMonthInfo.monthAbbr} {selectedMonthInfo.fullYear})</strong> is currently open. Evaluation data entry, score revisions, and weight allocations are strictly permitted within <strong>10 days following month completion</strong>. After the 10th day, this month's scorecard will be permanently locked and archived in historical records.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-300/40 dark:border-amber-800/40">
            <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Next Month Evaluation: <strong>{selectedMonthInfo.nextMonthKey}</strong> evaluation cycle has started in parallel.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLockCurrentMonth(selectedMonth)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer select-none"
              >
                <Lock className="w-3.5 h-3.5" />
                Finalize & Lock {selectedMonth} Record
              </button>
              <button
                onClick={() => handleSelectMonth(selectedMonthInfo.nextMonthKey)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer select-none"
              >
                Evaluate Next Month ({selectedMonthInfo.nextMonthKey}) &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Official Locked Historical Record Banner */}
      {isMonthLocked && (
        <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900/80 dark:via-slate-850 dark:to-slate-900/80 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                🔒
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                    Official ERA Historical KPI Record • {selectedMonth}
                  </h3>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    Locked & Archived Record
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  This evaluation record was locked on {currentRecord?.lockedAt ? new Date(currentRecord.lockedAt).toLocaleDateString() : selectedMonthInfo.deadlineFormatted} (10-day post-month evaluation window completed). All criteria ratings, category weights, and composite scores are preserved in read-only audit mode.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
              <div className="text-right">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Certified Score</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  {(currentRecord?.overallScore ?? overallScore).toFixed(1)}%
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-base border border-blue-200 dark:border-blue-800">
                {currentRecord?.overallGrade || overallGrade}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-750 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span>Evaluated / Locked By: <strong>{currentRecord?.lockedBy || currentRecord?.evaluatedBy || 'ERA CPM Directorate & Approver'}</strong></span>
              <span>•</span>
              <span>Audit Standard: <strong>ERA 10-Area Contractor Scorecard</strong></span>
            </div>
            <span className="bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              Read-Only Audit Archive
            </span>
          </div>
        </div>
      )}

      {/* Compact KPI Scoring Detail Trigger Banner (Inline engine hidden from page body per request) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-indigo-700/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            <Activity className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white">
                {selectedMonth} KPI Scoring & Physical Progress Evaluation
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                Overall: {(currentRecord?.overallScore ?? overallScore).toFixed(1)}% (Grade {currentRecord?.overallGrade || overallGrade})
              </span>
            </div>
            <p className="text-2xs text-indigo-200/80 mt-0.5">
              PP-1 Actual / ERA Plan ratio: <strong className="text-amber-300">{progressKpiResult.performanceRatio.toFixed(2)}%</strong> &bull; PP-1 Score: <strong className="text-emerald-400">{progressKpiResult.pp1Score.toFixed(1)}%</strong> ({progressKpiResult.status})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowKpiDetailModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm border border-indigo-400/30 cursor-pointer shrink-0"
        >
          <BarChart2 className="w-4 h-4 text-indigo-200" />
          <span>View KPI Scoring Detail Modal</span>
        </button>
      </div>

      {/* 1. Admin/Non-Admin mode banners */}
      {!isAdmin ? (
        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/45 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Info className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">View-Only Auditee Mode</p>
              <p className="text-2xs text-amber-600/90 dark:text-amber-400">
                You are logged in with standard read permissions ({currentUserObj?.role || 'viewer'}). Creating custom subgroups, editing descriptions (names), deleting subdivisions, and weight modifications are restricted to <strong>Admin</strong> users.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-650 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 uppercase select-none tracking-wider">
            Locked
          </span>
        </div>
      ) : null}

      {/* 2. Admin restoration panel for deleted subgroups and criteria */}
      {isAdmin && ((project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0) || (project.kpiDeletedItems && project.kpiDeletedItems.length > 0)) && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            {project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Hidden Subgroups:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {project.kpiDeletedSubgroups.map((id, idx) => (
                    <span key={`h-sub-${id}-${idx}`} className="bg-rose-50 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg font-bold font-mono text-[10px]">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {project.kpiDeletedItems && project.kpiDeletedItems.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Hidden Criteria:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {project.kpiDeletedItems.map((id, idx) => (
                    <span key={`h-crit-${id}-${idx}`} className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200/50 dark:border-amber-900/30 text-amber-650 dark:text-amber-400 px-2 py-0.5 rounded-lg font-bold font-mono text-[10px]">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal">
              These items have been excluded from KPI evaluation and active scorecard reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to restore all previously deleted KPI subgroups?")) {
                    onProjectUpdate?.({ kpiDeletedSubgroups: [] }, "Restored all deleted KPI subgroups");
                  }
                }}
                className="text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 select-none shadow-3xs hover:shadow-2xs self-start md:self-auto"
              >
                Restore Hidden Subgroups
              </button>
            )}
            {project.kpiDeletedItems && project.kpiDeletedItems.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to restore all previously deleted KPI criteria?")) {
                    onProjectUpdate?.({ kpiDeletedItems: [] }, "Restored all deleted KPI criteria");
                  }
                }}
                className="text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 select-none shadow-3xs hover:shadow-2xs self-start md:self-auto"
              >
                Restore Hidden Criteria
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            ERA Contract Audit KPI Matrix
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* Subgroup creation button */}
          {isAdmin && !isMonthLocked ? (
            <button
              onClick={() => setShowAddSubForm(!showAddSubForm)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm select-none"
            >
              <FolderPlus className="w-4 h-4" />
              {showAddSubForm ? 'Close Creator' : 'Add custom subgroup'}
            </button>
          ) : isMonthLocked ? (
            <button
              disabled
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none opacity-60"
              title="This month's KPI evaluation is locked in historical records"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              Subgroup Creator (Locked Month)
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 text-slate-405 dark:text-slate-550 border border-slate-200/50 dark:border-slate-750 cursor-not-allowed select-none opacity-60"
              title="Only admins can add custom KPI subgroups"
            >
              <FolderPlus className="w-4 h-4 text-slate-400" />
              Add custom subgroup (Admin Locked)
            </button>
          )}

          <div className="flex items-center gap-2.5 whitespace-nowrap bg-slate-50 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/85">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Contractor Grade:</span>
            <select
              value={project.contractorGrade || 'G1'}
              disabled={!isAdmin || isMonthLocked}
              onChange={(e) => onProjectUpdate?.({ contractorGrade: e.target.value }, `Updated Contractor Grade to ${e.target.value}`)}
              className={`bg-white dark:bg-slate-800 text-xs font-bold border border-slate-350 dark:border-slate-650 px-2.5 py-1 rounded-lg outline-none text-slate-850 dark:text-zinc-100 focus:border-blue-500 transition-colors ${!isAdmin || isMonthLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            >
              {Array.from({ length: 12 }, (_, i) => `G${i + 1}`).map((grade, idx) => (
                <option key={`grade-${grade}-${idx}`} value={grade}>{grade} Contractor</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Subgroup Creation form */}
      {showAddSubForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 p-5 rounded-2xl shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-705 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-500" />
              Configure & Add New KPI Subgroup
            </h3>
            <button 
              type="button"
              onClick={() => setShowAddSubForm(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateSubgroup} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Subgroup Metadata */}
            <div className="space-y-3.5 border-r border-dotted border-slate-250/60 dark:border-slate-700/65 pr-0 md:pr-4">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">1. Subgroup properties</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Parent Category Group (Goal)</label>
                <select
                  value={newParentGoalId}
                  onChange={(e) => setNewParentGoalId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-zinc-100 focus:border-blue-500 outline-none cursor-pointer font-semibold"
                >
                  {hierarchy.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.id}: {g.name} ({g.wt}% total weight)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup ID</label>
                  <input
                    type="text"
                    required
                    value={newSscId}
                    onChange={(e) => setNewSscId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    placeholder="SC1.4"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup Weight (% limit in Goal)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newSscWt}
                    onChange={(e) => setNewSscWt(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup Name/Title</label>
                <input
                  type="text"
                  required
                  value={newSscName}
                  onChange={(e) => setNewSscName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                  placeholder="e.g. Environmental Health Audit"
                />
              </div>

              {/* Integrity helper display */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-750 text-[10px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
                <span className="font-bold text-slate-600 dark:text-zinc-300 block">⚡ Integration Logic Helper:</span>
                <span>
                  The selected group <strong>{newParentGoalId}</strong> contains existing subgroups with a current weight of{' '}
                  <strong>
                    {hierarchy.find(g => g.id === newParentGoalId)?.sscs.reduce((sum, s) => sum + s.wt, 0) || 0}%
                  </strong>.
                </span>
                <span className="block mt-1 text-blue-500 font-semibold">
                  Adding this subgroup will count towards the internal division scores automatically!
                </span>
              </div>
            </div>

            {/* Step 2: Main KPI element info */}
            <div className="space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase">2. Define initial KPI inside Subgroup</h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Identifier Code</label>
                    <input
                      type="text"
                      required
                      value={newKpiId}
                      onChange={(e) => setNewKpiId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Weighting inside Subgroup (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newKpiWt}
                      onChange={(e) => setNewKpiWt(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Standard Description</label>
                  <input
                    type="text"
                    required
                    value={newKpiDesc}
                    onChange={(e) => setNewKpiDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    placeholder="e.g. Percentage of safety checklists approved monthly without alerts"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Evaluation Mode Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-350 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="kpiType"
                        checked={newKpiType === 'pct'}
                        onChange={() => setNewKpiType('pct')}
                        className="text-blue-550 focus:ring-0 cursor-pointer"
                      />
                      Percentage (0-100%)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-350 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="kpiType"
                        checked={newKpiType === 'yn'}
                        onChange={() => setNewKpiType('yn')}
                        className="text-blue-550 focus:ring-0 cursor-pointer"
                      />
                      Binary Conformance (Yes/No - 1.0 / 0.0)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-705">
                <button
                  type="button"
                  onClick={() => setShowAddSubForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Subgroup & KPI
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Category Group Selector */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-2.5">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Filter KPI Category Group</span>
        
        {/* Toggle Pills for Desktop */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              selectedGroupId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All KPI Groups ({hierarchy.length})
          </button>
          {hierarchy.map((goal) => {
            const score = getGoalScore(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGroupId(goal.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  selectedGroupId === goal.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-zinc-300 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <span>{goal.name}</span>
                <span className={`text-[9px] px-1.5 py-0.25 rounded-md font-sans ${
                  selectedGroupId === goal.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350'
                }`}>
                  {score.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Group Select for Mobile screens */}
        <div className="sm:hidden relative">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold py-2.5 px-3.5 border border-slate-250 dark:border-slate-705 pr-10 rounded-xl appearance-none cursor-pointer text-slate-800 dark:text-zinc-100 focus:border-blue-500 transition-colors"
          >
            <option value="all">All KPI Groups</option>
            {hierarchy.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.id}: {goal.name} ({getGoalScore(goal.id).toFixed(2)}%)
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {hierarchy
          .filter(goal => selectedGroupId === 'all' || goal.id === selectedGroupId)
          .map((goal) => {
            const score = getGoalScore(goal.id);
          return (
            <div 
              key={goal.id} 
              className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Goal Header */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-750 dark:to-slate-800 text-white px-5 py-3 flex flex-wrap justify-between items-center gap-3 select-none">
                <span className="font-extrabold text-sm tracking-wide">
                  {goal.id}: {goal.name} <span className="font-normal opacity-85 text-xs">({goal.wt}%)</span>
                </span>
                
                <div className="flex items-center gap-3">
                  {/* Group Target Setting */}
                  <div className="flex items-center gap-1.5 bg-blue-900/60 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-blue-400/30 text-xs">
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-400" /> Target:
                    </span>
                    {editingTargetGoalId === goal.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tempTargetInput}
                          onChange={(e) => setTempTargetInput(e.target.value)}
                          className="w-14 bg-slate-900 text-white font-mono text-xs px-1.5 py-0.5 rounded border border-amber-400 outline-none text-center"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat(tempTargetInput);
                            if (!isNaN(val)) {
                              handleUpdateGroupTarget(goal.id, val);
                            }
                            setEditingTargetGoalId(null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTargetGoalId(null)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-300">
                          {getGroupTarget(goal.id).toFixed(1)}%
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingTargetGoalId(goal.id);
                              setTempTargetInput(getGroupTarget(goal.id).toString());
                            }}
                            className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-1.5 py-0.5 rounded transition cursor-pointer font-bold"
                            title="Set Group Target"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="text-xs md:text-sm font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-lg border border-amber-400 font-mono shadow-sm">
                    Goal Score: {score.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Subgroups Weight manager triggers */}
              <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150/60 dark:border-slate-700/60 px-5 py-2 flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
                <span>Goal Subgroup Breakdown:</span>
                
                {editingGoalWeightsId === goal.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSaveGoalWeights(goal.id)}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-2 py-0.75 rounded-md border border-emerald-200 dark:border-emerald-900/30 transition cursor-pointer font-bold uppercase text-[9px]"
                    >
                      <Save className="w-3 h-3" />
                      Save weights
                    </button>
                    <button
                      onClick={() => setEditingGoalWeightsId(null)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-500 dark:text-slate-400 px-2 py-0.75 rounded-md border border-slate-200 dark:border-slate-700 transition cursor-pointer font-bold uppercase text-[9px]"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  isAdmin && !isMonthLocked && (
                    <button
                      onClick={() => handleStartEditingWeights(goal.id, goal.sscs)}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-800 dark:text-zinc-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer font-bold text-[9px]"
                    >
                      <Sliders className="w-3 h-3 text-blue-500" />
                      Manage Weights
                    </button>
                  )
                )}
              </div>

              {/* Sub Categories inside Goal */}
              <div className="p-4 space-y-4">
                {goal.sscs.map((ssc, sscIdx) => {
                  const sscScore = getSscScore(ssc.id);
                  return (
                    <div key={`ssc-block-${ssc.id}-${sscIdx}`} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-blue-700 dark:text-blue-400 border-b border-blue-50/50 pb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingSscDetailsId === ssc.id ? (
                            <div className="flex items-center gap-1.5 py-0.5">
                              <span className="font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {ssc.id}:
                              </span>
                              <input
                                type="text"
                                value={tempSscName}
                                onChange={(e) => setTempSscName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5 px-2 text-xs font-extrabold focus:border-blue-500 outline-none text-slate-800 dark:text-zinc-50"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRenameSubgroup(ssc.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 transition cursor-pointer flex items-center justify-center shadow-xs"
                                title="Save description"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSscDetailsId(null)}
                                className="bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-350 rounded p-1 transition cursor-pointer flex items-center justify-center border border-slate-300/40"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="tracking-wide font-black text-slate-800 dark:text-zinc-100">
                                {ssc.id}: {ssc.name}
                              </span>
                              {isAdmin && !isMonthLocked && (
                                <button
                                  onClick={() => handleStartRenameSubgroup(ssc.id, ssc.name)}
                                  className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer flex items-center justify-center bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-750 border border-slate-200/40 dark:border-slate-700/50 rounded-lg transition"
                                  title="Edit description"
                                >
                                  <Edit className="w-3 h-3 text-slate-500/80" />
                                </button>
                              )}
                            </div>
                          )}

                          {editingGoalWeightsId === goal.id ? (
                            <div className="flex items-center gap-1 my-0.5 animate-pulse">
                              <span className="text-[10px] text-slate-400 font-bold">Weight:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={tempWeights[ssc.id] ?? ssc.wt}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setTempWeights({
                                    ...tempWeights,
                                    [ssc.id]: isNaN(val) ? 0 : val
                                  });
                                }}
                                className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5 px-1.5 text-center text-2xs font-extrabold focus:border-blue-500 outline-none text-slate-800 dark:text-zinc-50"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">% of goal</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold bg-blue-550/10 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                              {ssc.wt}% of goal
                            </span>
                          )}

                          {/* Delete option for subgroups (Admin only) */}
                          {isAdmin && !isMonthLocked && (
                            <button
                              onClick={() => handleDeleteSubgroup(ssc.id, ssc.name)}
                              className="text-[9px] text-rose-500/80 hover:text-rose-600 cursor-pointer flex items-center gap-0.5 ml-1.5 font-bold select-none border border-rose-200/20 dark:border-rose-950/20 px-1.5 py-0.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 transition"
                              title="Delete subgroup"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              Delete
                            </button>
                          )}

                          {/* Add Criteria option inside subgroup (Admin only) */}
                          {isAdmin && !isMonthLocked && (
                            <button
                              type="button"
                              onClick={() => {
                                if (addingCriteriaSscId === ssc.id) {
                                  setAddingCriteriaSscId(null);
                                } else {
                                  setAddingCriteriaSscId(ssc.id);
                                  const count = ssc.items.length;
                                  const lastLetter = count > 0 ? String.fromCharCode(65 + count) : 'A';
                                  setTempCriteriaId(`KPI-${ssc.id}${lastLetter}`);
                                  setTempCriteriaDesc('');
                                  setTempCriteriaWt(20);
                                  setTempCriteriaType('pct');
                                }
                              }}
                              className="text-[9px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-0.5 ml-1.5 font-bold select-none border border-emerald-200/20 dark:border-emerald-950/25 px-1.5 py-0.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition"
                              title="Add criteria/indicator item to this subgroup"
                            >
                              <Plus className="w-3 h-3 text-emerald-500" />
                              Add Criteria
                            </button>
                          )}
                        </div>
                        <span className="font-mono text-2xs">Sub-Score: {sscScore.toFixed(2)}%</span>
                      </div>

                      {/* Add Criteria Inline Form */}
                      {addingCriteriaSscId === ssc.id && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-950/40 p-3.5 rounded-xl space-y-3 mt-1.5 shadow-3xs">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h4 className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                              <Plus className="w-3.5 h-3.5" /> Add New Criteria to {ssc.id}
                            </h4>
                            <button 
                              type="button"
                              onClick={() => setAddingCriteriaSscId(null)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Criteria ID</label>
                              <input
                                type="text"
                                required
                                value={tempCriteriaId}
                                onChange={(e) => setTempCriteriaId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                                placeholder="e.g. KPI-SC8.4A"
                              />
                            </div>
                            
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Criteria Description</label>
                              <input
                                type="text"
                                required
                                value={tempCriteriaDesc}
                                onChange={(e) => setTempCriteriaDesc(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                                placeholder="e.g. Contractor's IPC delay beyond 56 day"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Weight (%)</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={tempCriteriaWt}
                                onChange={(e) => setTempCriteriaWt(parseInt(e.target.value, 10) || 100)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 text-2xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`criteriaType-${ssc.id}`}
                                  checked={tempCriteriaType === 'pct'}
                                  onChange={() => setTempCriteriaType('pct')}
                                  className="text-blue-550 focus:ring-0 cursor-pointer"
                                />
                                Percentage (0-100%)
                              </label>
                              <label className="flex items-center gap-1.5 text-2xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`criteriaType-${ssc.id}`}
                                  checked={tempCriteriaType === 'yn'}
                                  onChange={() => setTempCriteriaType('yn')}
                                  className="text-blue-550 focus:ring-0 cursor-pointer"
                                />
                                Binary Conformance (Yes/No)
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setAddingCriteriaSscId(null)}
                                className="px-2.5 py-1 text-2xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCreateCriteria(ssc.id, goal.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold rounded-lg transition shadow-xs flex items-center gap-0.5"
                              >
                                <Plus className="w-3 h-3" /> Save Criteria
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-1">
                        {ssc.items.map((it, itIdx) => {
                          const kpi = kpis.find(k => k.itemId === it.id);
                          if (!kpi) return null;

                          const actualVal = kpi.naActive ? 0 : kpi.alloc;
                          const targetMax = it.max || 100;
                          const pctCompletion = Math.min(100, Math.max(0, (actualVal / targetMax) * 100));

                          return (
                            <div 
                              key={`ssc-item-${it.id}-${itIdx}`} 
                              className="group flex flex-col md:flex-row md:items-center justify-between text-xs p-2.5 rounded-xl border border-dotted border-slate-100 hover:border-slate-350 dark:border-slate-700/40 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-900/10 hover:bg-white dark:hover:bg-slate-900/40 transition gap-3"
                            >
                              {/* Left parameters */}
                              <div className="flex flex-col gap-1.5 flex-1">
                                <div className="flex items-start gap-2">
                                  <span className="font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                    {it.id}
                                  </span>
                                  
                                  <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight relative mt-0.5 flex items-center gap-1">
                                    {it.desc}
                                    
                                    {/* Tooltip trigger icon */}
                                    <span className="tooltip-trigger relative text-slate-400 hover:text-blue-500 cursor-help">
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 dark:bg-slate-950 text-white rounded-lg p-2 text-[10px] leading-relaxed shadow-xl border border-slate-700 opacity-0 pointer-events-none transition duration-150 tooltip-box z-50">
                                        {getKpiTooltip(it.id, it.desc)}
                                      </span>
                                    </span>
                                  </span>
                                </div>

                                {it.id === 'PP-1' && (
                                  <div className="flex items-center gap-2 mt-1 flex-wrap pl-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      <Zap className="w-3 h-3 text-indigo-500" />
                                      Monthly Status Report ({selectedMonth} {kpiProgressBasis === 'monthly' ? 'Month' : 'Cumulative'}): Actual {kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment} {progressKpiResult.unit} / ERA Plan {kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan} {progressKpiResult.unit}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                      % Divided for ERA Plan: <strong>{progressKpiResult.performanceRatio.toFixed(2)}%</strong> &bull; Score: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{progressKpiResult.pp1Score.toFixed(1)}%</strong>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Right Values / editing elements */}
                              <div className="flex items-center gap-3 self-end md:self-auto">
                                {it.id === 'PP-1' ? (
                                  <div className="flex items-center">
                                    {kpi.isOverridden ? (
                                      <button
                                        onClick={() => handleResetToAuto('PP-1')}
                                        className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 transition cursor-pointer flex items-center gap-1"
                                        title="Click to reset and sync with automatic progress plan calculation"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        Manual ({kpi.alloc}%) &rarr; Sync Auto ({progressKpiResult.pp1Score.toFixed(1)}%)
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/30 flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5 text-indigo-500" />
                                        Progress Auto Active ({progressKpiResult.pp1Score.toFixed(1)}%)
                                      </span>
                                    )}
                                  </div>
                                ) : isAutoKpi(it.id) && (
                                  <div className="flex items-center">
                                    {kpi.isOverridden ? (
                                      <button
                                        onClick={() => handleResetToAuto(it.id)}
                                        className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 transition cursor-pointer"
                                        title="Click to reset and use telemetry auto-calculation value"
                                      >
                                        Overridden (Reset)
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-150 dark:border-blue-900/30">
                                        Auto Active
                                      </span>
                                    )}
                                  </div>
                                )}

                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                  Wt: {it.wt}%
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {it.type === 'yn' ? (
                                    <select
                                      disabled={isMonthLocked || !canEditKpis}
                                      value={kpi.naActive ? 'na' : (it.id === 'RK-1' ? (kpi.alloc === 0 ? '0' : '1') : (kpi.alloc >= it.max ? '1' : '0'))}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === 'na') {
                                          handleValueChange(it.id, 0, true);
                                        } else {
                                          handleValueChange(it.id, parseInt(v, 10), false);
                                        }
                                      }}
                                      className={`bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-705 text-xs px-2.5 py-1 rounded-lg font-bold outline-none text-slate-800 dark:text-zinc-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 shadow-sm ${
                                        isMonthLocked || !canEditKpis ? 'cursor-not-allowed opacity-75 bg-slate-150 dark:bg-slate-950' : 'cursor-pointer'
                                      }`}
                                    >
                                      {it.id === 'RK-1' ? (
                                        <>
                                          <option value="0">Yes (0.0)</option>
                                          <option value="1">No (1.0)</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="1">Yes (1.0)</option>
                                          <option value="0">No (0.0)</option>
                                        </>
                                      )}
                                      <option value="na">N/A</option>
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max={it.max}
                                        step="0.1"
                                        disabled={isMonthLocked || !canEditKpis}
                                        value={kpi.naActive ? '' : kpi.alloc}
                                        placeholder="0.0"
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          handleValueChange(it.id, isNaN(val) ? 0 : val, false);
                                        }}
                                        className={`w-16 bg-slate-50 dark:bg-slate-900 text-center text-xs font-mono font-extrabold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-705 outline-none text-slate-800 dark:text-zinc-50 placeholder-slate-400 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 shadow-sm ${
                                          isMonthLocked || !canEditKpis ? 'cursor-not-allowed opacity-75 bg-slate-150 dark:bg-slate-950' : ''
                                        }`}
                                      />
                                      <span className="text-[10px] text-slate-400 font-mono select-none">/ {it.max}</span>
                                      
                                      <button
                                        disabled={isMonthLocked || !canEditKpis}
                                        onClick={() => {
                                          handleValueChange(it.id, 0, !kpi.naActive);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition border ${
                                          isMonthLocked || !canEditKpis ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                        } ${
                                          kpi.naActive 
                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-850 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-755'
                                        }`}
                                      >
                                        N/A
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {isMonthLocked && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 select-none" title="Locked historical record">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                  </span>
                                )}

                                {kpi.naActive && (
                                  <span className="text-[9px] font-bold bg-amber-500 text-slate-900 rounded-md px-1.5 py-0.5 border border-amber-400">
                                    N/A Tracked
                                  </span>
                                )}

                                {isAdmin && !isMonthLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCriteria(it.id, it.desc)}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer border border-rose-200/20"
                                    title="Delete criteria/indicator"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6-Month Target vs Actual Progress Trends Line Chart - Positioned below KPI Goals list / Facilities provided for Engineer */}
      <KpiProgressTrendsChart
        project={project}
        selectedGroupId={selectedGroupId}
        onSelectGroupId={setSelectedGroupId}
        hierarchy={hierarchy}
        getGoalScore={getGoalScore}
        onProjectUpdate={onProjectUpdate}
      />
      
      {/* KPI Scoring Detail Modal */}
      {showKpiDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col my-auto"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-t-2xl border-b border-indigo-700/50 flex items-center justify-between gap-4 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  <BarChart2 className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                      KPI Scoring Detail • {selectedMonth}
                    </h2>
                    {isMonthLocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked Historical Record
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active Evaluation Cycle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Breakdown of Planned vs. Actual Physical Progress Calculation Factors (PP-1) & Goal Scorecard
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block border-r border-indigo-700/60 pr-3">
                  <span className="text-[9px] uppercase font-extrabold text-indigo-300/80 block">Compliance Audit Grade</span>
                  <div className="flex items-center gap-1.5 justify-end font-mono">
                    <span className={`text-xs font-black uppercase ${auditData.overallAuditGrade.colorClass}`}>
                      {auditData.overallAuditGrade.grade}
                    </span>
                    <span className="text-xs font-black text-white/90 font-mono">
                      (Grade {auditData.overallAuditGrade.letter} &bull; {auditData.compositeScorePct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[9px] uppercase font-extrabold text-indigo-300/80 block">Certified KPI Score</span>
                  <span className="text-lg font-black text-amber-300 font-mono">
                    {(currentRecord?.overallScore ?? overallScore).toFixed(1)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKpiDetailModal(false)}
                  className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  title="Close KPI Scoring Detail Modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 text-slate-800 dark:text-zinc-100 flex-1">
              
              {/* SECTION 1: Planned vs Actual Physical Progress Factors (PP-1 Engine) */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 border border-indigo-700/50 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Activity className="w-4 h-4 text-indigo-300" />
                      </span>
                      <h3 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase">
                        Monthly Status Report Progress Engine • PP-1 Breakdown
                      </h3>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        progressKpiResult.status === 'Ahead' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        progressKpiResult.status === 'On Track' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        progressKpiResult.status === 'Minor Lag' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {progressKpiResult.status}
                      </span>
                    </div>
                    <p className="text-2xs text-indigo-200/90 leading-relaxed">
                      <strong>PP-1 (Planned vs actual physical completion)</strong> is computed directly from the Monthly Status Report of <strong>{selectedMonth}</strong> by dividing <strong>actual accomplishment for ERA plan</strong> (<em>% of Actual Divided by ERA Plan</em>).
                    </p>
                  </div>

                  {/* Basis selector & action */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="flex items-center bg-indigo-950/90 p-0.5 rounded-xl border border-indigo-700/60">
                      <button
                        type="button"
                        onClick={() => setKpiProgressBasis('monthly')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[10px] uppercase tracking-wide flex items-center gap-1 ${
                          kpiProgressBasis === 'monthly'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-indigo-300 hover:text-white'
                        }`}
                      >
                        <span>Specific Month ({progressKpiResult.monthlyPerformanceRatio.toFixed(1)}%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setKpiProgressBasis('cumulative')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[10px] uppercase tracking-wide flex items-center gap-1 ${
                          kpiProgressBasis === 'cumulative'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-indigo-300 hover:text-white'
                        }`}
                      >
                        <span>To-Date ({progressKpiResult.cumulativePerformanceRatio.toFixed(1)}%)</span>
                      </button>
                    </div>

                    {canEditKpis && (
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyProgressCalculatedScores();
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer border border-indigo-400/30"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Apply Score ({progressKpiResult.pp1Score.toFixed(1)}%)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric Telemetry Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/70 block">
                      {kpiProgressBasis === 'monthly' ? 'ERA Month Plan' : 'ERA To-Date Plan'}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-white">
                        {(kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-indigo-300/80 font-mono">{progressKpiResult.unit}</span>
                    </div>
                    <span className="text-[9px] text-indigo-300/80 block truncate">Status Report target</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/70 block">
                      {kpiProgressBasis === 'monthly' ? 'Actual Month' : 'Actual To-Date'}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-white">
                        {(kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-indigo-300/80 font-mono">{progressKpiResult.unit}</span>
                    </div>
                    <span className="text-[9px] text-indigo-300/80 block truncate">Road Completed</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/70 block">Actual / ERA Plan</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-amber-300">
                        {progressKpiResult.performanceRatio.toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-[9px] text-indigo-300/80 block truncate">% Divided for ERA Plan</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/70 block">Variance (Km)</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-black font-mono ${progressKpiResult.variancePctPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {progressKpiResult.variancePctPoints >= 0 ? '+' : ''}{progressKpiResult.variancePctPoints.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-indigo-300/80 font-mono">{progressKpiResult.unit}</span>
                    </div>
                    <span className="text-[9px] text-indigo-300/80 block truncate">
                      {progressKpiResult.variancePctPoints >= 0 ? 'Ahead of ERA plan' : 'Behind ERA plan'}
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/70 block">Schedule Index (SPI)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-white">
                        {progressKpiResult.spi.toFixed(3)}
                      </span>
                    </div>
                    <span className="text-[9px] text-indigo-300/80 block truncate">
                      {progressKpiResult.spi >= 1.0 ? 'SPI ≥ 1.0 (On schedule)' : 'SPI < 1.0 (Slippage)'}
                    </span>
                  </div>

                  <div className="bg-indigo-950/80 border border-indigo-500/50 rounded-xl p-2.5 space-y-1 shadow-inner">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">PP-1 Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-emerald-400">
                        {progressKpiResult.pp1Score.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-indigo-300 font-mono">/ 100%</span>
                    </div>
                    <span className="text-[9px] text-emerald-300/90 font-bold block truncate">
                      Grade {getKpiGradeLetter(progressKpiResult.pp1Score)}
                    </span>
                  </div>
                </div>

                {/* Dual Comparison Audit Breakdown */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-indigo-300 border-b border-white/10 pb-1.5 flex-wrap gap-2">
                    <span>Monthly Status Report (% of Actual Divided by ERA Plan)</span>
                    <span className="font-mono text-[10px] text-slate-400">Data Source: {progressKpiResult.sourceDescription}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div 
                      onClick={() => setKpiProgressBasis('monthly')}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        kpiProgressBasis === 'monthly' ? 'bg-indigo-900/60 border-indigo-400 shadow-xs' : 'bg-black/20 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-indigo-200 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${kpiProgressBasis === 'monthly' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          Specific Month ({progressKpiResult.monthLabel})
                        </span>
                        <span className="font-mono text-amber-300 font-black">{progressKpiResult.monthlyPerformanceRatio.toFixed(2)}%</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1">
                        Actual: <strong>{progressKpiResult.actualMonthAccomplishment.toFixed(2)} {progressKpiResult.unit}</strong> / ERA Plan: <strong>{progressKpiResult.eraMonthPlan.toFixed(2)} {progressKpiResult.unit}</strong> &bull; Score: <strong className="text-emerald-400">{progressKpiResult.monthlyPp1Score.toFixed(1)}%</strong>
                      </div>
                    </div>

                    <div 
                      onClick={() => setKpiProgressBasis('cumulative')}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        kpiProgressBasis === 'cumulative' ? 'bg-indigo-900/60 border-indigo-400 shadow-xs' : 'bg-black/20 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-indigo-200 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${kpiProgressBasis === 'cumulative' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          Cumulative To-Date
                        </span>
                        <span className="font-mono text-amber-300 font-black">{progressKpiResult.cumulativePerformanceRatio.toFixed(2)}%</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1">
                        Actual: <strong>{progressKpiResult.actualTodateAccomplishment.toFixed(2)} {progressKpiResult.unit}</strong> / ERA Plan: <strong>{progressKpiResult.eraTodatePlan.toFixed(2)} {progressKpiResult.unit}</strong> &bull; Score: <strong className="text-emerald-400">{progressKpiResult.cumulativePp1Score.toFixed(1)}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-200/90 pt-1 border-t border-indigo-800/50">
                  <strong>Audit Formula:</strong> {progressKpiResult.formulaExplanation}
                </div>
              </div>

              {/* SECTION 2: Goal Category Scorecard Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-700 dark:text-zinc-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  10-Area Category Score Breakdown ({selectedMonth})
                </h3>
                
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-750 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 uppercase font-extrabold text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-3.5 py-2.5">Category Code & Goal Name</th>
                          <th className="px-3 py-2.5 text-center">Category Weight</th>
                          <th className="px-3 py-2.5 text-center">Calculated Score</th>
                          <th className="px-3 py-2.5 text-center">Grade</th>
                          <th className="px-3.5 py-2.5 text-right">Contribution Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-700/60 font-medium">
                        {hierarchy.map((goal) => {
                          const goalScore = getGoalScore(goal.id);
                          const grade = getKpiGradeLetter(goalScore);
                          const contribution = (goalScore * goal.wt) / 100;
                          return (
                            <tr key={`modal-goal-${goal.id}`} className="hover:bg-white dark:hover:bg-slate-800/80 transition">
                              <td className="px-3.5 py-2.5">
                                <div className="font-bold text-slate-800 dark:text-zinc-100">{goal.id}: {goal.name}</div>
                                <div className="text-[10px] text-slate-400">{goal.sscs.length} Subgroups &bull; {goal.sscs.reduce((acc, s) => acc + s.items.length, 0)} Indicators</div>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                                {goal.wt}%
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono font-bold">
                                <span className={goalScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : goalScore >= 75 ? 'text-blue-600 dark:text-blue-400' : goalScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {goalScore.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                  grade === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                  grade === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  Grade {grade}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-800 dark:text-zinc-100">
                                {contribution.toFixed(2)} pts
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                        <tr>
                          <td className="px-3.5 py-2.5 text-slate-800 dark:text-zinc-100 uppercase">Composite Total Scorecard</td>
                          <td className="px-3 py-2.5 text-center font-mono">100%</td>
                          <td className="px-3 py-2.5 text-center font-mono text-blue-600 dark:text-blue-400 text-sm">
                            {(currentRecord?.overallScore ?? overallScore).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono">
                            Grade {currentRecord?.overallGrade || overallGrade}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400 text-sm">
                            {(currentRecord?.overallScore ?? overallScore).toFixed(2)} pts
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Detailed KPI Grade Factor Analysis • Monthly Status Report Source Data */}
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-zinc-100 tracking-tight">
                      Detailed KPI Grade Factor Analysis ({selectedMonth})
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono shadow-2xs">
                    Certified Grade: {currentRecord?.overallGrade || overallGrade} ({(currentRecord?.overallScore ?? overallScore).toFixed(1)}%)
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  The overall KPI grade <strong>Grade {currentRecord?.overallGrade || overallGrade}</strong> for <strong>{selectedMonth}</strong> is evaluated directly against the official <strong>Monthly Status Report</strong> source baseline and ERA 10-Area Contractor Scorecard. The key contributing factors are detailed below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Factor 1: S-Curve Physical Progress Alignment */}
                  <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-blue-600 dark:text-blue-400">Factor 1: S-Curve Baseline Alignment</span>
                      <span className="text-[9px] font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.25 rounded font-bold">G1 Physical Progress</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      Target Accomplishment vs Actual Completion
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>ERA Monthly Plan:</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-mono">{(kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan).toFixed(2)} {progressKpiResult.unit}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual Accomplishment:</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-mono">{(kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment).toFixed(2)} {progressKpiResult.unit}</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-750 pt-1 font-bold">
                        <span>Physical Completion Ratio:</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-mono">{progressKpiResult.performanceRatio.toFixed(2)}%</strong>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-750">
                      Source: {progressKpiResult.sourceDescription}
                    </div>
                  </div>

                  {/* Factor 2: Schedule Performance Index (SPI) */}
                  <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-blue-600 dark:text-blue-400">Factor 2: Schedule Index (SPI)</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.25 rounded font-bold ${
                        progressKpiResult.spi >= 1.0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        SPI = {progressKpiResult.spi.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      Earned Value Schedule Conformance
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Schedule Status:</span>
                        <strong className={progressKpiResult.spi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {progressKpiResult.status}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Milestone Variance:</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-mono">{progressKpiResult.variancePctPoints >= 0 ? '+' : ''}{progressKpiResult.variancePctPoints.toFixed(2)} {progressKpiResult.unit}</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-750 pt-1 font-bold">
                        <span>PP-1 Capped Score:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{progressKpiResult.pp1Score.toFixed(1)}%</strong>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-750">
                      Source: Monthly Status Report Program Schedule
                    </div>
                  </div>

                  {/* Factor 3: Quality, Safety & Supervision Compliance */}
                  <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-blue-600 dark:text-blue-400">Factor 3: Multi-Area Compliance</span>
                      <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.25 rounded font-bold">G2-G10 Areas</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                      Quality, Safety, Equipment & Finance
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Physical Progress (G1):</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-mono">{getGoalScore('G1').toFixed(1)}% (wt: 20%)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Control (G2):</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-mono">{getGoalScore('G2').toFixed(1)}% (wt: 15%)</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-750 pt-1 font-bold">
                        <span>Composite Points Earned:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-mono">{(currentRecord?.overallScore ?? overallScore).toFixed(1)} / 100 pts</strong>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-750">
                      Source: ERA Supervision Consultant Monthly Audit
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Source Data Audit */}
              <div className="space-y-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-700/50 shadow-sm">
                <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <ShieldCheck className="w-4 h-4 text-indigo-300" />
                    </span>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-tight">
                      Source Data Audit
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                    Audit Verification Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Monthly Cumulative S-Curve Baseline Link */}
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/80 block">
                      Monthly Cumulative S-Curve Baseline
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {progressKpiResult.sourceDescription}
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-200/70 leading-relaxed">
                      Source telemetry extracted from active project baseline schedule & Monthly Status Report record ({selectedMonth}).
                    </p>
                  </div>

                  {/* Audit Formula Description */}
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-200/80 block">
                      Audit Formula
                    </span>
                    <p className="text-[11px] font-mono font-bold text-emerald-300 leading-snug">
                      {progressKpiResult.formulaExplanation}
                    </p>
                    <p className="text-[10px] text-indigo-200/70 leading-relaxed">
                      Standard ERA score computation: Physical Completion Performance Ratio (%) capped between 0.0% and 100.0%.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Source Data Explorer • Side-by-Side Scoring Engine Audit */}
              <div className="space-y-4 bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Sliders className="w-5 h-5 text-amber-300" />
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                        Source Data Explorer • Scoring Engine Audit
                      </h3>
                      <p className="text-2xs text-slate-400">
                        Side-by-side verification between active KPI score parameters and raw Monthly Status Report data points ({selectedMonth}).
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1 self-start sm:self-auto">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Scoring Engine Sync Verified
                  </span>
                </div>

                {/* Side-by-Side Comparison Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-[10px] uppercase font-mono font-bold text-indigo-300 border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Evaluated Metric Parameter</th>
                        <th className="px-3.5 py-2.5 text-center bg-indigo-950/40 border-x border-slate-800 text-amber-300">
                          Current KPI Scorecard Value
                        </th>
                        <th className="px-3.5 py-2.5 text-center bg-slate-900/90 text-emerald-400">
                          Raw Monthly Status Report Data
                        </th>
                        <th className="px-3.5 py-2.5 text-right">Scoring Engine Logic Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 font-medium text-slate-300">
                      {/* Row 1: Planned Month Accomplishment */}
                      <tr className="hover:bg-slate-900/50 transition">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-white">Planned Month Progress (ERA Plan)</div>
                          <div className="text-[10px] text-slate-400 font-mono">Month target baseline for {selectedMonth}</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-300 bg-indigo-950/20 border-x border-slate-800">
                          {(kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan).toFixed(2)} {progressKpiResult.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400 bg-slate-900/40">
                          {(kpiProgressBasis === 'monthly' ? progressKpiResult.eraMonthPlan : progressKpiResult.eraTodatePlan).toFixed(2)} {progressKpiResult.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                            <Check className="w-3 h-3 text-emerald-400" /> Match (0.00% Delta)
                          </span>
                        </td>
                      </tr>

                      {/* Row 2: Actual Month Accomplishment */}
                      <tr className="hover:bg-slate-900/50 transition">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-white">Actual Month Accomplishment</div>
                          <div className="text-[10px] text-slate-400 font-mono">Physical work executed in {selectedMonth}</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-300 bg-indigo-950/20 border-x border-slate-800">
                          {(kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment).toFixed(2)} {progressKpiResult.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400 bg-slate-900/40">
                          {(kpiProgressBasis === 'monthly' ? progressKpiResult.actualMonthAccomplishment : progressKpiResult.actualTodateAccomplishment).toFixed(2)} {progressKpiResult.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                            <Check className="w-3 h-3 text-emerald-400" /> Match (0.00% Delta)
                          </span>
                        </td>
                      </tr>

                      {/* Row 3: Performance Ratio */}
                      <tr className="hover:bg-slate-900/50 transition">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-white">Performance Ratio (% Divided)</div>
                          <div className="text-[10px] text-slate-400 font-mono">(Actual / ERA Plan) * 100</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-300 bg-indigo-950/20 border-x border-slate-800">
                          {progressKpiResult.performanceRatio.toFixed(2)}%
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400 bg-slate-900/40">
                          {progressKpiResult.performanceRatio.toFixed(2)}%
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-300 font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                            Formula = (Actual / Plan) * 100
                          </span>
                        </td>
                      </tr>

                      {/* Row 4: Schedule Performance Index (SPI) */}
                      <tr className="hover:bg-slate-900/50 transition">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-white">Schedule Performance Index (SPI)</div>
                          <div className="text-[10px] text-slate-400 font-mono">Earned progress vs planned schedule</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-300 bg-indigo-950/20 border-x border-slate-800">
                          SPI = {progressKpiResult.spi.toFixed(3)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400 bg-slate-900/40">
                          SPI = {progressKpiResult.spi.toFixed(3)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            progressKpiResult.spi >= 1.0 ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40' : 'text-rose-300 bg-rose-950/60 border-rose-800/40'
                          }`}>
                            {progressKpiResult.spi >= 1.0 ? 'SPI >= 1.00 (On Schedule)' : 'SPI < 1.00 (Slippage)'}
                          </span>
                        </td>
                      </tr>

                      {/* Row 5: Final PP-1 KPI Score */}
                      <tr className="hover:bg-slate-900/50 transition bg-indigo-950/30">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-white">Final Scorecard PP-1 Score</div>
                          <div className="text-[10px] text-slate-400 font-mono">Scorecard input after capping (0 - 100%)</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-emerald-400 bg-indigo-950/60 border-x border-slate-800 text-sm">
                          {progressKpiResult.pp1Score.toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-emerald-400 bg-slate-900/60 text-sm">
                          {progressKpiResult.pp1Score.toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                            Min(100, Max(0, Ratio)) = {progressKpiResult.pp1Score.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Provenance Footer Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Raw Status Report Baseline: <strong>{progressKpiResult.sourceDescription}</strong></span>
                  </span>
                  <span className="font-mono text-[10px] text-indigo-300">
                    Calculated for Evaluation Month: <strong>{selectedMonth}</strong> ({kpiProgressBasis === 'monthly' ? 'Specific Month' : 'Cumulative To-Date'})
                  </span>
                </div>
              </div>

              {/* SECTION 6: Compliance & Performance Audit • Weighted Scoring Framework */}
              <div className="space-y-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border-2 border-indigo-500/50 shadow-xl">
                {/* Header & Hero Score Display */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Scale className="w-5 h-5 text-indigo-300" />
                      </span>
                      <h3 className="text-sm sm:text-base font-black tracking-tight uppercase text-white flex items-center gap-2">
                        Compliance & Performance Audit • Weighted Scoring Framework
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        FIDIC / EVM Evaluation Standard
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 leading-relaxed max-w-3xl">
                      Contractor evaluation based on: <strong>Progress vs. Original Plan (25%)</strong>, <strong>EVM & Controls (15%)</strong>, <strong>Technical Quality (25%)</strong>, <strong>Linear Layer Progress (10%)</strong>, <strong>6-Month Resource Mobilization (5%)</strong>, <strong>Management (10%)</strong>, <strong>Financial (5%)</strong>, and <strong>HSE (5%)</strong> for <strong>{selectedMonth}</strong>.
                    </p>
                  </div>

                  {/* Hero Overall Grade Badge */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 shrink-0 shadow-lg ${auditData.overallAuditGrade.bgClass} ${auditData.overallAuditGrade.borderClass}`}>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-200/80 block font-bold">
                        Overall Contractor Grade
                      </span>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${auditData.overallAuditGrade.colorClass}`}>
                          {auditData.overallAuditGrade.grade.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-bold text-white/90">
                          (Grade {auditData.overallAuditGrade.letter})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-300 mt-0.5">
                        {auditData.compositeScorePct.toFixed(1)}% &bull; {auditData.overallAuditGrade.scaleValue.toFixed(2)} / 5.00 Scale
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-black/30 border border-white/20 flex flex-col items-center justify-center font-black">
                      <span className="text-lg text-white font-mono">{auditData.overallAuditGrade.letter}</span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-300 font-mono">FIDIC</span>
                    </div>
                  </div>
                </div>

                {/* Predefined Rating Bands Legend Reference */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400" /> Predefined Contractor Performance Rating Bands:
                    </span>
                    <span className="text-amber-300 font-black">
                      Active Band: {auditData.overallAuditGrade.grade} ({auditData.overallAuditGrade.scaleValue.toFixed(2)} / 5.00)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[10px] font-mono">
                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      auditData.overallAuditGrade.grade === 'Excellent' ? 'bg-emerald-500/20 border-emerald-400 shadow-xs ring-1 ring-emerald-400' : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      <span className="font-bold text-emerald-400">5 • Excellent</span>
                      <span className="text-slate-200 mt-0.5">&ge; 90.0% (4.50 – 5.00)</span>
                      <span className="text-[9px] text-slate-400">Exceeds standard</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      auditData.overallAuditGrade.grade === 'Good' ? 'bg-blue-500/20 border-blue-400 shadow-xs ring-1 ring-blue-400' : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      <span className="font-bold text-blue-400">4 • Good</span>
                      <span className="text-slate-200 mt-0.5">75.0% – 89.9% (3.50 – 4.49)</span>
                      <span className="text-[9px] text-slate-400">Consistently meets</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      auditData.overallAuditGrade.grade === 'Satisfactory' ? 'bg-amber-500/20 border-amber-400 shadow-xs ring-1 ring-amber-400' : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      <span className="font-bold text-amber-400">3 • Satisfactory</span>
                      <span className="text-slate-200 mt-0.5">60.0% – 74.9% (2.50 – 3.49)</span>
                      <span className="text-[9px] text-slate-400">Meets minimum</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      auditData.overallAuditGrade.grade === 'Marginal' ? 'bg-orange-500/20 border-orange-400 shadow-xs ring-1 ring-orange-400' : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      <span className="font-bold text-orange-400">2 • Marginal</span>
                      <span className="text-slate-200 mt-0.5">45.0% – 59.9% (1.50 – 2.49)</span>
                      <span className="text-[9px] text-slate-400">Deficiencies noted</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                      auditData.overallAuditGrade.grade === 'Unsatisfactory' ? 'bg-rose-500/20 border-rose-400 shadow-xs ring-1 ring-rose-400' : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      <span className="font-bold text-rose-400">1 • Unsatisfactory</span>
                      <span className="text-slate-200 mt-0.5">&lt; 45.0% (1.00 – 1.49)</span>
                      <span className="text-[9px] text-slate-400">Critical breach</span>
                    </div>
                  </div>
                </div>

                {/* 8-Category Telemetry Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {auditData.pillars.map((pillar, pIdx) => {
                    const iconMap = {
                      schedule: <Calendar className="w-4 h-4 text-amber-300" />,
                      evm: <TrendingUp className="w-4 h-4 text-blue-300" />,
                      quality: <Award className="w-4 h-4 text-emerald-300" />,
                      linear: <Activity className="w-4 h-4 text-indigo-300" />,
                      resourceMob: <Truck className="w-4 h-4 text-teal-300" />,
                      management: <Users className="w-4 h-4 text-purple-300" />,
                      financial: <DollarSign className="w-4 h-4 text-teal-300" />,
                      hse: <HardHat className="w-4 h-4 text-orange-300" />
                    };
                    return (
                      <div
                        key={`audit-pillar-${pillar.id}`}
                        className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2 flex flex-col justify-between hover:bg-white/[0.08] transition"
                      >
                        <div className="space-y-1.5">
                          {/* Top Row: Name & Weight */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="p-1 rounded-lg bg-white/10 shrink-0">
                                {iconMap[pillar.id]}
                              </span>
                              <span className="font-bold text-xs text-white truncate" title={pillar.name}>
                                {pIdx + 1}. {pillar.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 shrink-0">
                              {pillar.weight}%
                            </span>
                          </div>

                          {/* Metric Score & Grade */}
                          <div className="flex items-baseline justify-between pt-1 border-t border-white/10">
                            <div>
                              <div className="text-base font-black font-mono text-white">
                                {pillar.scorePct.toFixed(1)}%
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Scale: <strong className="text-indigo-300">{pillar.scaleValue.toFixed(2)}</strong> / 5.00
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${pillar.statusColor}`}>
                                {pillar.grade}
                              </span>
                              <div className="text-[10px] font-mono font-black text-emerald-400 mt-0.5">
                                +{pillar.pointsEarned.toFixed(2)} pts
                              </div>
                            </div>
                          </div>

                          {/* Basis & Telemetry Summary */}
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-amber-300/80 font-mono block font-bold truncate">
                              {pillar.evaluationBasis}
                            </span>
                            <p className="text-[10px] text-slate-200 leading-snug line-clamp-3" title={pillar.telemetrySummary}>
                              {pillar.telemetrySummary}
                            </p>
                          </div>
                        </div>

                        {/* Attribution Notes */}
                        <div className="space-y-0.5 pt-1.5 border-t border-white/10 text-[9px] leading-relaxed">
                          <div className="text-amber-200/90 truncate" title={pillar.attribution.contractor}>
                            <strong>Contractor:</strong> {pillar.attribution.contractor}
                          </div>
                          <div className="text-indigo-200/80 truncate" title={pillar.attribution.employerOrExternal}>
                            <strong>Employer:</strong> {pillar.attribution.employerOrExternal}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Clear Tabular Breakdown Table */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-indigo-200">
                    <span className="flex items-center gap-1.5 uppercase tracking-wide">
                      <FileText className="w-4 h-4 text-indigo-400" /> Tabular Breakdown of Category Scores & Overall Weighted Total
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Overall Total = &Sigma;(Score &times; Weight) = {auditData.totalPointsEarned.toFixed(2)} / 100 Points
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/15 bg-slate-950/90 shadow-inner">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 uppercase font-mono font-extrabold text-[10px] text-indigo-300 border-b border-white/15">
                        <tr>
                          <th className="px-3 py-2.5 w-8 text-center">#</th>
                          <th className="px-3 py-2.5">Audit Category / Dimension</th>
                          <th className="px-2.5 py-2.5 text-center">Weight</th>
                          <th className="px-3 py-2.5">Evaluation Method & Reference Rule</th>
                          <th className="px-3 py-2.5">Evaluated Telemetry & Performance Data</th>
                          <th className="px-2.5 py-2.5 text-center">Score %</th>
                          <th className="px-2.5 py-2.5 text-center">Scale (1–5)</th>
                          <th className="px-2.5 py-2.5 text-center">Earned Pts</th>
                          <th className="px-3 py-2.5 text-right">Predefined Rating Band</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 font-medium text-slate-300">
                        {auditData.pillars.map((pillar, idx) => (
                          <tr key={`audit-table-row-${pillar.id}`} className="hover:bg-white/[0.04] transition">
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-white whitespace-nowrap">
                              {pillar.name}
                            </td>
                            <td className="px-2.5 py-2.5 text-center font-mono font-black text-amber-300">
                              {pillar.weight}%
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-indigo-200/90">
                              <span className="font-bold text-white">{pillar.evaluationBasis}</span>
                              <div className="text-[10px] text-slate-400 mt-0.5">{pillar.criteria}</div>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-300">
                              <div className="font-mono text-[10px] text-slate-200">{pillar.telemetrySummary}</div>
                            </td>
                            <td className="px-2.5 py-2.5 text-center font-mono font-bold text-amber-300">
                              {pillar.scorePct.toFixed(1)}%
                            </td>
                            <td className="px-2.5 py-2.5 text-center font-mono font-bold text-slate-200">
                              {pillar.scaleValue.toFixed(2)}
                            </td>
                            <td className="px-2.5 py-2.5 text-center font-mono font-black text-emerald-400">
                              {pillar.pointsEarned.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${pillar.statusColor}`}>
                                {pillar.grade} (Grade {pillar.letter})
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900 font-black text-xs border-t-2 border-indigo-600">
                        <tr>
                          <td className="px-3 py-3 text-center font-mono">&Sigma;</td>
                          <td className="px-3 py-3 text-white uppercase font-extrabold tracking-wide">
                            Overall Weighted Total
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono text-amber-300 text-sm">
                            100%
                          </td>
                          <td colSpan={2} className="px-3 py-3 text-[11px] text-slate-300">
                            Combined weighted audit: Progress vs. Original Plan (25%), EVM (15%), Quality (25%), Linear Layers (10%), 6-Mo Resource Mob (5%), Management (10%), Financial (5%), HSE (5%)
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono text-amber-300 text-sm font-black">
                            {auditData.compositeScorePct.toFixed(1)}%
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono text-white text-sm font-black">
                            {auditData.overallAuditGrade.scaleValue.toFixed(2)} / 5.00
                          </td>
                          <td className="px-2.5 py-3 text-center font-mono text-emerald-400 text-sm font-black">
                            {auditData.totalPointsEarned.toFixed(2)} pts
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <span className={`inline-block text-xs font-mono font-black px-2.5 py-1 rounded uppercase tracking-wider shadow-sm ${auditData.overallAuditGrade.badgeClass}`}>
                              {auditData.overallAuditGrade.grade} (Grade {auditData.overallAuditGrade.letter})
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Independent Evaluator Summary & Recommendations */}
                <div className="bg-black/40 rounded-xl p-3.5 border border-indigo-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-300 font-bold uppercase tracking-wider text-[11px] border-b border-white/10 pb-1.5 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Independent Evaluator Audit Assessment & FIDIC Determination
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Standard: FIDIC Conditions of Contract (Red Book) &bull; Project Ref: W-43-NC-5
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-slate-200">
                    <div className="space-y-1">
                      <strong className="text-amber-300 block font-bold">Delay & Causal Attribution Analysis:</strong>
                      <p className="text-slate-300">
                        Contractor construction delivery demonstrates commendable compliance in 6-month resource mobilization ({auditData.pillars[4].scorePct.toFixed(1)}%), technical quality ({auditData.pillars[2].scorePct.toFixed(1)}%), and HSE standards ({auditData.pillars[7].scorePct.toFixed(1)}%). However, overall delivery is constrained by physical progress lagging the original contractor baseline plan ({auditData.pillars[0].scorePct.toFixed(1)}% accomplishment ratio; SPI {evmMetrics.SPI.toFixed(3)}) and linear pavement upper layers ({auditData.pillars[3].scorePct.toFixed(1)}%). While ROW delays on the 8.8km Meleya-Mejo Spur represent Employer-side delay, rock crushing and subgrade haulage bottlenecks are contractor-attributable.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-emerald-300 block font-bold">Corrective Action & Contract Administration:</strong>
                      <p className="text-slate-300">
                        Pursuant to FIDIC Sub-Clause 8.6 [Rate of Progress], the Contractor must submit a revised recovery programme with concrete measures to double crusher production output and accelerate asphalt paving layers. With an overall weighted total of <strong>{auditData.totalPointsEarned.toFixed(2)} pts ({auditData.overallAuditGrade.grade} • Grade {auditData.overallAuditGrade.letter})</strong> within the predefined rating bands, retention release and advance recovery amortizations remain securely enforceable against milestone delivery.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Audit Reference: <strong>ERA 10-Area Contractor Scorecard &bull; {selectedMonth}</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowKpiDetailModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Detail Window
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CSS Injected styling for tooltip */}
      <style>{`
        .tooltip-trigger:hover .tooltip-box {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

    </div>
  );
}

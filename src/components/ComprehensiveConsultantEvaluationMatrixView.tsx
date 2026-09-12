import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  Save,
  Sliders,
  Info,
  ShieldCheck,
  TrendingUp,
  Layers,
  Filter,
  Check,
  ExternalLink,
  Printer,
  ChevronRight,
  HelpCircle,
  Zap,
  Activity,
  Cpu,
  BarChart3,
  Database,
  RefreshCw,
  Clock,
  Briefcase,
  FileCheck,
  Users,
  CheckCheck,
  Calculator,
  Scale,
  Plus,
  Trash2,
  Settings,
  ArrowLeft,
  Wrench,
  Building2
} from 'lucide-react';
import {
  SupervisionConsultantInfo,
  Project,
  ConsultantSubmittalKpi,
  QualitativeGradeThreshold
} from '../types';
import {
  DIMENSIONS_META,
  CONSULTANT_EVALUATION_CRITERIA,
  DimensionId,
  ConsultantEvaluationCriterion,
  autoEvaluateProjectCriterion,
  autoEvaluateAllCriteria,
  calculateSubmittalQuantitativeMetrics,
  calculateComprehensiveEvaluationScore,
  DEFAULT_GRADE_THRESHOLDS,
  evaluateQualitativeGrade,
  SubmittalQuantitativeMetrics,
  getCriterionSourceInfo
} from '../data/consultantEvaluationMatrix';

export interface ComprehensiveConsultantEvaluationMatrixViewProps {
  project: Project;
  consultant: SupervisionConsultantInfo;
  onUpdateConsultant?: (updatedConsultant: SupervisionConsultantInfo, actionDescription?: string) => void;
  isReadonly?: boolean;
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
  currentUser?: any;
  submittalsList?: ConsultantSubmittalKpi[];
  onScoreChange?: (score: number) => void;
}

export default function ComprehensiveConsultantEvaluationMatrixView({
  project,
  consultant,
  onUpdateConsultant,
  isReadonly = false,
  isAdmin = true,
  isMasterAdmin,
  currentUser,
  submittalsList = [],
  onScoreChange
}: ComprehensiveConsultantEvaluationMatrixViewProps) {
  // Pre-calculate live quantitative metrics from submittal logs, IPC tracker, and contract records
  const quantitativeMetrics: SubmittalQuantitativeMetrics = useMemo(() => {
    return calculateSubmittalQuantitativeMetrics(project, consultant, submittalsList);
  }, [project, consultant, submittalsList]);

  // Master Admin role verification
  const isMasterAdminUser = useMemo(() => {
    if (isMasterAdmin !== undefined) return isMasterAdmin;
    if (!currentUser) return false;
    return (
      currentUser.role === 'master_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.username === 'proj_1781786415663' ||
      Boolean(currentUser.username && currentUser.username.toLowerCase().includes('ersido'))
    );
  }, [isMasterAdmin, currentUser]);

  // Editable criterion weights state for Master Admin
  const [customCriterionWeights, setCustomCriterionWeights] = useState<Record<string, number>>(() => {
    return consultant.customCriterionWeights || {};
  });

  // Master Admin qualitative grading thresholds state
  const [customThresholds, setCustomThresholds] = useState<QualitativeGradeThreshold[]>(() => {
    return consultant.customGradeThresholds && consultant.customGradeThresholds.length > 0
      ? consultant.customGradeThresholds
      : DEFAULT_GRADE_THRESHOLDS;
  });
  const [showThresholdsConfig, setShowThresholdsConfig] = useState(false);

  // Track which criteria have been manually overridden by the user
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const [showMetricsFeed, setShowMetricsFeed] = useState(false);

  // Evaluation scores state: map of criterion code to evaluation payload
  const [evaluations, setEvaluations] = useState<Record<string, {
    score: number;
    actualValue?: string | number;
    notes?: string;
    formulaEvidence?: string;
    autoEvaluated?: boolean;
    evaluatedAt?: string;
  }>>(() => {
    // Always auto-evaluate based on live submittals and criteria quantitative formulas
    return autoEvaluateAllCriteria(project, consultant, submittalsList);
  });

  // UI Filter states
  const [selectedDimension, setSelectedDimension] = useState<DimensionId | 'ALL'>('A');
  const [selectedParentId, setSelectedParentId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    'A1': true,
    'B1': true,
    'C1': true,
    'D1': true,
    'E1': true
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [autoEvaluatedCount, setAutoEvaluatedCount] = useState<number | null>(null);

  // Update custom weightage handler (Master Admin only)
  const handleUpdateCriterionWeight = (code: string, newWeight: number) => {
    if (!isMasterAdminUser || isReadonly) return;
    const sanitized = Math.max(0, Math.min(100, newWeight));
    const nextWeights = {
      ...customCriterionWeights,
      [code]: sanitized
    };
    setCustomCriterionWeights(nextWeights);

    if (onUpdateConsultant) {
      const updatedConsultant: SupervisionConsultantInfo = {
        ...consultant,
        customCriterionWeights: nextWeights
      };
      onUpdateConsultant(updatedConsultant, `Updated evaluation weightage for criterion ${code} to ${sanitized.toFixed(2)}%`);
    }
  };

  // Handlers for Qualitative Grading Thresholds (Master Admin)
  const handleUpdateThreshold = (index: number, field: keyof QualitativeGradeThreshold, value: any) => {
    if (!isMasterAdminUser || isReadonly) return;
    const updated = [...customThresholds];
    updated[index] = {
      ...updated[index],
      [field]: field === 'minScore' || field === 'maxScore' ? Number(value) : value
    };
    setCustomThresholds(updated);
  };

  const handleAddThresholdTier = () => {
    if (!isMasterAdminUser || isReadonly) return;
    const newTier: QualitativeGradeThreshold = {
      id: `tier_${Date.now()}`,
      grade: 'Grade Tier',
      minScore: 70,
      maxScore: 79.9,
      label: 'Custom Qualitative Tier',
      standing: 'Custom administrative standing or requirement',
      badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
      color: 'indigo'
    };
    setCustomThresholds([...customThresholds, newTier]);
  };

  const handleDeleteThresholdTier = (index: number) => {
    if (!isMasterAdminUser || isReadonly) return;
    if (customThresholds.length <= 1) return;
    setCustomThresholds(customThresholds.filter((_, i) => i !== index));
  };

  const handleResetThresholds = () => {
    if (!isMasterAdminUser || isReadonly) return;
    setCustomThresholds(DEFAULT_GRADE_THRESHOLDS);
  };

  const handleSaveThresholds = () => {
    if (!isMasterAdminUser || isReadonly || !onUpdateConsultant) return;
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      customGradeThresholds: customThresholds
    };
    onUpdateConsultant(updatedConsultant, `Updated qualitative grading thresholds configuration (${customThresholds.length} active tiers)`);
    setSaveSuccessMsg('Qualitative grading thresholds successfully saved!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Calculate comprehensive evaluation metrics combining Submittal SLA Turnaround and 5-Dimension Matrix
  const evaluationResult = useMemo(() => {
    const result = calculateComprehensiveEvaluationScore(evaluations, CONSULTANT_EVALUATION_CRITERIA, customCriterionWeights, customThresholds);
    let totalEvaluated = 0;
    let likertSum = 0;
    CONSULTANT_EVALUATION_CRITERIA.forEach(c => {
      const ev = evaluations[c.code];
      if (ev?.score !== undefined) {
        totalEvaluated++;
        likertSum += ev.score;
      }
    });
    const averageLikert = totalEvaluated > 0 ? likertSum / totalEvaluated : 4.0;
    
    // Submittal Log & Operational SLA Turnaround score (on-time rate)
    const slaTurnaroundScore = Number((quantitativeMetrics.overallOnTimeRate || 0).toFixed(1));
    // 5-Dimension Performance Evaluation score (105 criteria matrix)
    const fiveDimScore = Number((result.overallScore || 0).toFixed(1));
    // Composite combined score (50% SLA turnaround + 50% 5-dimension matrix)
    const compositeScore = Number(((fiveDimScore * 0.5) + (slaTurnaroundScore * 0.5)).toFixed(1));

    const matchedThreshold = evaluateQualitativeGrade(compositeScore, customThresholds);
    const officialGrade = matchedThreshold.grade;
    const gradeBadgeStyle = matchedThreshold.badgeStyle || (
      matchedThreshold.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' :
      matchedThreshold.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' :
      matchedThreshold.color === 'amber' ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' :
      matchedThreshold.color === 'orange' ? 'bg-orange-500/20 text-orange-300 border-orange-400/40' :
      'bg-rose-500/20 text-rose-300 border-rose-400/40'
    );

    const gradeLabel = `${officialGrade} (${matchedThreshold.label})`;

    return {
      ...result,
      fiveDimScore,
      slaTurnaroundScore,
      compositeScore,
      totalScore: compositeScore,
      officialGrade,
      officialTitle: `${officialGrade}: ${matchedThreshold.label}`,
      officialStanding: matchedThreshold.standing,
      matchedThreshold,
      dimensionScores: {
        A: result.dimensionBreakdown.A.earned,
        B: result.dimensionBreakdown.B.earned,
        C: result.dimensionBreakdown.C.earned,
        D: result.dimensionBreakdown.D.earned,
        E: result.dimensionBreakdown.E.earned,
      },
      gradeLabel,
      gradeBadgeStyle,
      totalCriteriaEvaluated: totalEvaluated || CONSULTANT_EVALUATION_CRITERIA.length,
      averageLikert
    };
  }, [evaluations, customCriterionWeights, quantitativeMetrics, customThresholds]);

  // Synchronize live Section 2 evaluation score to the parent component in real-time
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(evaluationResult.fiveDimScore);
    }
  }, [evaluationResult.fiveDimScore, onScoreChange]);

  // Real-time total weightage sum calculation
  const totalCustomWeightSum = useMemo(() => {
    return CONSULTANT_EVALUATION_CRITERIA.reduce((sum, c) => {
      const w = customCriterionWeights[c.code] !== undefined ? customCriterionWeights[c.code] : c.effectiveWeight;
      return sum + w;
    }, 0);
  }, [customCriterionWeights]);

  // List of all unique parent sub-criteria for filtering and grouping
  const parentCriteriaList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; dimensionId: DimensionId; weightInDimension: number }>();
    CONSULTANT_EVALUATION_CRITERIA.forEach(c => {
      if (!map.has(c.ref)) {
        map.set(c.ref, {
          id: c.ref,
          name: c.parentName,
          dimensionId: c.dim,
          weightInDimension: c.parentWeight
        });
      }
    });
    return Array.from(map.values());
  }, []);

  // Filtered criteria based on active filters
  const filteredCriteria = useMemo(() => {
    return CONSULTANT_EVALUATION_CRITERIA.filter(c => {
      if (selectedDimension !== 'ALL' && c.dim !== selectedDimension) return false;
      if (selectedParentId !== 'ALL' && c.ref !== selectedParentId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = c.code.toLowerCase().includes(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchParent = c.parentName.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchParent) {
          return false;
        }
      }
      return true;
    });
  }, [selectedDimension, selectedParentId, searchQuery]);

  interface CriteriaGroup {
    parentInfo: {
      id: string;
      name: string;
      dimensionId: DimensionId;
      weight: number;
    };
    items: typeof CONSULTANT_EVALUATION_CRITERIA;
  }

  // Group filtered criteria by parent sub-criterion
  const groupedCriteria = useMemo<Record<string, CriteriaGroup>>(() => {
    const groups: Record<string, CriteriaGroup> = {};
    filteredCriteria.forEach(item => {
      if (!groups[item.ref]) {
        groups[item.ref] = {
          parentInfo: {
            id: item.ref,
            name: item.parentName,
            dimensionId: item.dim,
            weight: item.parentWeight
          },
          items: []
        };
      }
      groups[item.ref].items.push(item);
    });
    return groups;
  }, [filteredCriteria]);

  // Handle score update for an individual criterion (marks as manual override)
  const handleScoreChange = (criterionId: string, newScore: number) => {
    if (isReadonly || !isAdmin) return;
    setManualOverrides(prev => ({ ...prev, [criterionId]: true }));
    setEvaluations(prev => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        score: newScore,
        autoEvaluated: false,
        notes: `Manual score override (${newScore}/5) set by evaluator.`
      }
    }));
  };

  // Reset a specific criterion back to automatic quantitative evaluation
  const handleResetCriterionToAuto = (criterion: ConsultantEvaluationCriterion) => {
    if (isReadonly || !isAdmin) return;
    const auto = autoEvaluateProjectCriterion(criterion, project, consultant, submittalsList, quantitativeMetrics);
    setManualOverrides(prev => {
      const next = { ...prev };
      delete next[criterion.code];
      return next;
    });
    setEvaluations(prev => ({
      ...prev,
      [criterion.code]: {
        score: auto.score,
        actualValue: auto.actualValue,
        notes: auto.notes,
        formulaEvidence: auto.formulaEvidence,
        autoEvaluated: true,
        evaluatedAt: new Date().toISOString()
      }
    }));
  };

  // Auto-evaluate all criteria from current project and submittal records
  const handleAutoEvaluateAll = () => {
    const autoResults = autoEvaluateAllCriteria(project, consultant, submittalsList);
    setEvaluations(autoResults);
    setManualOverrides({});
    setAutoEvaluatedCount(Object.keys(autoResults).length);
    setTimeout(() => setAutoEvaluatedCount(null), 5000);
  };

  // Save official evaluation into the consultant record
  const handleSaveEvaluation = () => {
    if (!onUpdateConsultant) return;
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      customCriterionWeights,
      detailedEvaluations: evaluations,
      dimensionScores: evaluationResult.dimensionScores,
      overallEvaluationScore: evaluationResult.totalScore,
      officialEvaluationGrade: evaluationResult.officialGrade,
      performanceRating: evaluationResult.totalScore
    };
    onUpdateConsultant(updatedConsultant, `Recorded quantitative 5-dimension consultant evaluation: ${evaluationResult.totalScore}% (${evaluationResult.officialGrade}) based on submittals & SLA turnaround`);
    setSaveSuccessMsg(`Evaluation successfully recorded! Overall Score: ${evaluationResult.totalScore}% (${evaluationResult.officialGrade})`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Toggle parent accordion collapse
  const toggleParentGroup = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const expandAllGroups = () => {
    const allTrue: Record<string, boolean> = {};
    parentCriteriaList.forEach(p => { allTrue[p.id] = true; });
    setExpandedParents(allTrue);
  };

  const collapseAllGroups = () => {
    setExpandedParents({});
  };

  const overriddenCount = Object.keys(manualOverrides).length;

  const renderDimensionIcon = (id: string, className = "w-4 h-4") => {
    switch (id) {
      case 'A': return <Wrench className={className} />;
      case 'B': return <Users className={className} />;
      case 'C': return <Building2 className={className} />;
      case 'D': return <Scale className={className} />;
      case 'E': return <ShieldCheck className={className} />;
      default: return <Award className={className} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Notifications Banner */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex-1">{saveSuccessMsg}</div>
          </motion.div>
        )}

        {autoEvaluatedCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-xs font-black flex items-center gap-2.5 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 animate-pulse" />
            <div className="flex-1">
              Recalculated all {autoEvaluatedCount} evaluation criteria using live project metrics! Click 'Save & Record Official Score' below to persist changes.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP: Multi-Tab Performance Segment Controller (5 Options) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
        {(Object.keys(DIMENSIONS_META) as DimensionId[]).map(dimId => {
          const meta = DIMENSIONS_META[dimId];
          const score = evaluationResult.dimensionScores[dimId] || 0;
          const maxWeight = meta.weight;
          const pct = maxWeight > 0 ? (score / maxWeight) * 100 : 0;
          const isSelected = selectedDimension === dimId;

          return (
            <button
              key={dimId}
              onClick={() => { setSelectedDimension(dimId); setSelectedParentId('ALL'); }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="mb-1">{renderDimensionIcon(dimId, "w-4 h-4")}</div>
              <span className="text-[10px] uppercase font-bold tracking-wider truncate max-w-full px-1" title={meta.name}>
                Dim {dimId}
              </span>
              <span className="text-[10px] font-mono mt-0.5 opacity-80">
                {score.toFixed(1)}/{maxWeight}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW PANEL 1: EXECUTIVE PERFORMANCE DASHBOARD */}
      {false && (
        <div className="space-y-6">
          {/* Executive Overview Headline */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white shadow-md border border-indigo-900/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Award className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 uppercase tracking-wider">
                    Official Executive Scorecard
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 uppercase tracking-wider font-mono">
                    Calibrated Matrix
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                  Supervision Service Performance Evaluation Model
                </h2>
                <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                  Real-time strategic oversight of consultant performance, combining the rigorous 105-point engineering audit with live contractor submittal response SLA turnaround speeds.
                </p>
              </div>

              {/* Huge Grade Score Dial */}
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shrink-0">
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-indigo-300 block">Weighted Rating</span>
                  <div className="text-3xl font-black font-mono text-white mt-0.5">
                    {evaluationResult.compositeScore.toFixed(1)}%
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-left">
                  <span className="text-[9px] uppercase font-bold text-indigo-300 block">Performance Tier</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-black border ${evaluationResult.gradeBadgeStyle}`}>
                    {evaluationResult.gradeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Evaluation Pillars Comparison (50/50 Dual Engine) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pillar A Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Pillar I</h3>
                    <p className="text-[11px] font-bold text-slate-400">Submittal Log & Turnaround SLA</p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg">
                  50% Weightage
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Pillar Score</span>
                  <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">
                    {evaluationResult.slaTurnaroundScore.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Overall SLA Status</span>
                  <span className={`text-[11px] font-black uppercase ${
                    evaluationResult.slaTurnaroundScore >= 80 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {evaluationResult.slaTurnaroundScore >= 80 ? 'Optimal Turnaround' : 'Attention Required'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Submittals</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{submittalsList.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">On-Time</span>
                  <span className="text-xs font-black text-emerald-500">
                    {submittalsList.filter(s => {
                      if (s.actualDays !== undefined) return s.actualDays <= s.targetDays;
                      return s.status !== 'Overdue';
                    }).length}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Delayed</span>
                  <span className="text-xs font-black text-rose-500">
                    {submittalsList.filter(s => {
                      if (s.actualDays !== undefined) return s.actualDays > s.targetDays;
                      return s.status === 'Overdue';
                    }).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar B Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Pillar II</h3>
                    <p className="text-[11px] font-bold text-slate-400">Technical & Supervisory Site Audit</p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">
                  50% Weightage
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Pillar Score</span>
                  <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">
                    {evaluationResult.fiveDimScore.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Evaluation Coverage</span>
                  <span className="text-[11px] font-black text-emerald-500 font-mono">
                    {evaluationResult.totalCriteriaEvaluated} / 105 Criteria
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Avg Likert</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {evaluationResult.averageLikert.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Manual</span>
                  <span className="text-xs font-black text-amber-500">
                    {overriddenCount}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Auto Calcs</span>
                  <span className="text-xs font-black text-emerald-500">
                    {105 - overriddenCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Dimension Performance Heatmap & Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Dimension-Wise Strategic Breakdown (Criteria Matrix)
                </h3>
                <p className="text-xs text-slate-400">Click on any dimension card to drill down and evaluate its detailed criteria</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(Object.keys(DIMENSIONS_META) as DimensionId[]).map(dimId => {
                const meta = DIMENSIONS_META[dimId];
                const score = evaluationResult.dimensionScores[dimId] || 0;
                const maxWeight = meta.weight;
                const pct = maxWeight > 0 ? (score / maxWeight) * 100 : 0;

                return (
                  <div
                    key={dimId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-800 transition"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-3xs mt-0.5">
                        {renderDimensionIcon(dimId, "w-5 h-5 text-indigo-600 dark:text-indigo-400")}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                            Dimension {dimId}
                          </span>
                          <span className="text-[10px] text-slate-400">• Weight: {maxWeight}%</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{meta.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{meta.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right font-mono">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Dimension Score</span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {score.toFixed(1)} / {maxWeight} pts
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-400">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>

                      {/* Progress visual */}
                      <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden hidden md:block">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <button
                        onClick={() => { setSelectedDimension(dimId); setSelectedParentId('ALL'); }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-[11px] font-black flex items-center gap-1 transition cursor-pointer border border-indigo-200/30 dark:border-slate-700"
                      >
                        Drill Down
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualitative Grading Scale & Threshold Rules */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  Qualitative Grading Scale & Standing Rules
                </h3>
                <p className="text-xs text-slate-400">The corporate standing guidelines based on the final composite evaluation score</p>
              </div>

              {isMasterAdminUser && !isReadonly && (
                <button
                  type="button"
                  onClick={() => setShowThresholdsConfig(!showThresholdsConfig)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {showThresholdsConfig ? 'Hide Thresholds Config' : 'Configure Grading Thresholds'}
                </button>
              )}
            </div>

            {/* Threshold Editor (Visible to Master Admins) */}
            <AnimatePresence>
              {showThresholdsConfig && isMasterAdminUser && !isReadonly && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3 bg-purple-50/40 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200">Qualitative Grading Configuration Matrix (Master Admin)</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetThresholds}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
                      >
                        Reset Defaults
                      </button>
                      <button
                        type="button"
                        onClick={handleAddThresholdTier}
                        className="px-2 py-1 rounded bg-purple-600 text-white font-bold hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Tier
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {customThresholds.map((tier, index) => (
                      <div key={tier.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-950/80">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">#{index+1}</span>
                          <input
                            type="text"
                            value={tier.grade}
                            onChange={(e) => handleUpdateThreshold(index, 'grade', e.target.value)}
                            className="w-full px-1.5 py-0.5 font-bold border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                            placeholder="Grade A"
                          />
                        </div>
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdateThreshold(index, 'label', e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                          placeholder="High Compliance"
                        />
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <input
                            type="number"
                            value={tier.minScore}
                            onChange={(e) => handleUpdateThreshold(index, 'minScore', e.target.value)}
                            className="w-12 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded text-center text-xs"
                            placeholder="90"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            value={tier.maxScore}
                            onChange={(e) => handleUpdateThreshold(index, 'maxScore', e.target.value)}
                            className="w-12 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded text-center text-xs"
                            placeholder="100"
                          />
                        </div>
                        <input
                          type="text"
                          value={tier.standing}
                          onChange={(e) => handleUpdateThreshold(index, 'standing', e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px]"
                          placeholder="Performance standing narrative"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={tier.color}
                            onChange={(e) => handleUpdateThreshold(index, 'color', e.target.value as any)}
                            className="px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 text-[10px]"
                          >
                            <option value="emerald">Emerald</option>
                            <option value="blue">Blue</option>
                            <option value="amber">Amber</option>
                            <option value="orange">Orange</option>
                            <option value="rose">Rose</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteThresholdTier(index)}
                            disabled={customThresholds.length <= 1}
                            className="text-rose-500 hover:text-rose-600 disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveThresholds}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Grading System
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2.5">
              {customThresholds.map((tier) => {
                const isCurrent = evaluationResult.compositeScore >= tier.minScore && evaluationResult.compositeScore <= tier.maxScore;
                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 justify-between transition ${
                      isCurrent
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-800 shadow-3xs'
                        : 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase font-mono border ${
                          tier.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40' :
                          tier.color === 'blue' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/40' :
                          tier.color === 'amber' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40' :
                          tier.color === 'orange' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-400/40' :
                          'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40'
                        }`}>
                          {tier.grade} — {tier.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">({tier.minScore}–{tier.maxScore}%)</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wide">
                            Active Rank
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tier.standing}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Action Command Center */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider">Evaluation Command Center</h4>
              <p className="text-[11px] text-slate-400">Save active scores to records, or reset all manual overrides to live calculated results.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              {!isReadonly && isAdmin && (
                <button
                  type="button"
                  onClick={handleAutoEvaluateAll}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                  title="Recalculate all 105 criteria automatically using live submittal logs and project data"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset to Auto Calcs
                </button>
              )}

              {!isReadonly && isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveEvaluation}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-200" />
                  Save & Record Official Score
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL 2: DETAILED CRITERIA DRILL-DOWN (DIMENSION SELECT) */}
      {selectedDimension !== 'ALL' && (
        <div className="space-y-6">
          {/* Dimension Drilling Header */}
          <div className="p-5 rounded-2xl bg-indigo-600 dark:bg-indigo-950 text-white border border-indigo-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-700 dark:bg-indigo-900 text-indigo-100 flex items-center justify-center shrink-0">
                {renderDimensionIcon(selectedDimension, "w-5 h-5")}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/40 text-indigo-100 font-mono text-[10px] uppercase font-bold">
                    Dimension {selectedDimension}
                  </span>
                  <span className="text-xs text-indigo-200 font-medium">Weight: {DIMENSIONS_META[selectedDimension].weight}%</span>
                </div>
                <h3 className="text-base font-black text-white">{DIMENSIONS_META[selectedDimension].name}</h3>
                <p className="text-xs text-indigo-100/80 leading-relaxed max-w-2xl">
                  {DIMENSIONS_META[selectedDimension].description}
                </p>
              </div>
            </div>

            <div className="bg-indigo-700 dark:bg-indigo-900/60 p-3 rounded-xl text-center border border-indigo-500/20 shrink-0 font-mono">
              <span className="text-[10px] text-indigo-200 block font-bold uppercase">Earned Points</span>
              <span className="text-lg font-black text-white">
                {evaluationResult.dimensionScores[selectedDimension].toFixed(1)} / {DIMENSIONS_META[selectedDimension].weight} pts
              </span>
            </div>
          </div>

          {/* Filtering, Search & Expand Core Block */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-3xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Parent category pre-filtered for current dimension */}
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-xs font-bold text-slate-400">Category Filter:</span>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-750 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Dimension {selectedDimension} Categories</option>
                  {parentCriteriaList
                    .filter(p => p.dimensionId === selectedDimension)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.id}] {p.name} ({p.weightInDimension}%)
                      </option>
                    ))}
                </select>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code, criteria..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
              <span className="text-slate-400 font-bold">
                Showing <span className="text-indigo-600 dark:text-indigo-400 font-black">{filteredCriteria.length}</span> criteria inside Dimension {selectedDimension}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={expandAllGroups}
                  className="px-2.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 transition cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300 dark:text-slate-800">|</span>
                <button
                  onClick={collapseAllGroups}
                  className="px-2.5 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 transition cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* Criteria accordion render block */}
          <div className="space-y-4">
            {Object.keys(groupedCriteria).length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                <Info className="w-10 h-10 text-slate-400 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No matching criteria found</h3>
                <p className="text-xs text-slate-500">Try adjusting your category select filter or search query string.</p>
              </div>
            ) : (
              (Object.entries(groupedCriteria) as [string, CriteriaGroup][]).map(([parentId, group]) => {
                const isExpanded = !!expandedParents[parentId];
                const parentMaxWeight = group.items.reduce((sum, item) => {
                  const eff = customCriterionWeights[item.code] !== undefined ? customCriterionWeights[item.code] : item.effectiveWeight;
                  return sum + eff;
                }, 0);

                const parentScoreSum = group.items.reduce((sum, item) => {
                  const evalItem = evaluations[item.code] || { score: 4 };
                  const eff = customCriterionWeights[item.code] !== undefined ? customCriterionWeights[item.code] : item.effectiveWeight;
                  return sum + ((evalItem.score || 4) / 5) * eff;
                }, 0);

                return (
                  <div
                    key={parentId}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs"
                  >
                    {/* Header bar of parent category */}
                    <div
                      onClick={() => toggleParentGroup(parentId)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition cursor-pointer border-b border-slate-100 dark:border-slate-800 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                          {parentId}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                              Weight: {group.parentInfo.weight}%
                            </span>
                          </div>
                          <h3 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                            {group.parentInfo.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Category Score</span>
                          <div className="flex items-baseline justify-end gap-1 font-mono">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {parentScoreSum.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-slate-400">/ {parentMaxWeight.toFixed(2)}%</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ml-1">
                              {parentMaxWeight > 0 ? ((parentScoreSum / parentMaxWeight) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                        </div>

                        <div className="p-1 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Criteria items of this category */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {group.items.map((criterion) => {
                          const evalItem = evaluations[criterion.code] || { score: 4 };
                          const currentScore = evalItem.score || 1;
                          const isOverridden = !!manualOverrides[criterion.code];
                          
                          const effectiveTotalWeight = customCriterionWeights[criterion.code] !== undefined
                            ? customCriterionWeights[criterion.code]
                            : criterion.effectiveWeight;

                          const itemEarnedScore = (currentScore / 5) * effectiveTotalWeight;

                          return (
                            <div
                              key={criterion.code}
                              className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition space-y-3"
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1.5 max-w-3xl flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 font-mono">
                                      {criterion.code}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                      {criterion.name}
                                    </h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      criterion.direction === 'H'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    }`}>
                                      {criterion.direction === 'H' ? '▲ High Better' : '▼ Low Better'}
                                    </span>

                                    {/* Score Weight Contribution */}
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold border border-emerald-100 dark:border-emerald-900">
                                      <span>Earned: {itemEarnedScore.toFixed(2)}% / {effectiveTotalWeight.toFixed(2)}%</span>
                                    </div>

                                    {/* Custom Weight editor for master admin */}
                                    {isMasterAdminUser && !isReadonly && (
                                      <div className="flex items-center gap-1 text-[10px] font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900">
                                        <span>Weight:</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={effectiveTotalWeight}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            handleUpdateCriterionWeight(criterion.code, isNaN(val) ? 0 : val);
                                          }}
                                          className="w-12 text-center text-xs font-bold bg-white dark:bg-slate-900 text-purple-900 border border-purple-300 dark:border-purple-700 rounded"
                                        />
                                        <span>%</span>
                                      </div>
                                    )}

                                    {/* Mode Indicator */}
                                    {isOverridden ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                                          ✍ Override
                                        </span>
                                        {!isReadonly && isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleResetCriterionToAuto(criterion)}
                                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                          >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                        Auto Calcs
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
                                    <p>• <span className="font-semibold text-slate-600 dark:text-slate-350">Metric Measured:</span> {criterion.metric}</p>
                                    <p>• <span className="font-semibold text-slate-600 dark:text-slate-350">Calculated Value:</span> {evalItem.actualValue || 'Not calibrated'}</p>
                                  </div>
                                </div>

                                {/* Right: Likert scale 1 to 5 selector */}
                                <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400">Likert Rating:</span>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                      {[1, 2, 3, 4, 5].map((val) => {
                                        const isActive = currentScore === val;
                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            disabled={isReadonly || !isAdmin}
                                            onClick={() => handleScoreChange(criterion.code, val)}
                                            title={`Score ${val}`}
                                            className={`w-7 h-7 rounded-lg text-xs font-black transition flex items-center justify-center cursor-pointer ${
                                              isActive
                                                ? val >= 4
                                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                                  : val === 3
                                                  ? 'bg-amber-500 text-white shadow-2xs'
                                                  : 'bg-rose-600 text-white shadow-2xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                          >
                                            {val}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Save / Auto-Evaluate Options */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {!isReadonly && isAdmin && (
                <button
                  type="button"
                  onClick={handleAutoEvaluateAll}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Recalculate all 105 criteria automatically using live submittal logs and project data"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  Reset to Auto Calcs
                </button>
              )}
            </div>

            {!isReadonly && isAdmin && (
              <button
                onClick={handleSaveEvaluation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-indigo-200" />
                Save & Record Official Score
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

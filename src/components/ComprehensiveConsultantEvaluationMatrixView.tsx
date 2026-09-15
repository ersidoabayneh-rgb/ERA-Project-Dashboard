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
  Building2, Edit3, X
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
  getCriterionSourceInfo,
  CriterionCalculationSource,
  CriterionSourceInfo
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

  const dynamicCriteriaList = useMemo(() => {
    return consultant.customConsultantEvaluationCriteria && consultant.customConsultantEvaluationCriteria.length > 0 
      ? consultant.customConsultantEvaluationCriteria 
      : CONSULTANT_EVALUATION_CRITERIA;
  }, [consultant.customConsultantEvaluationCriteria]);

  // Master Admin role verification
  const isMasterAdminUser = useMemo(() => {
    if (isMasterAdmin !== undefined) return isMasterAdmin;
    if (isAdmin) return true;
    if (!currentUser) return true;
    return (
      currentUser.role === 'master_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.username === 'proj_1781786415663' ||
      Boolean(currentUser.username && currentUser.username.toLowerCase().includes('ersido')) ||
      Boolean(currentUser.email && currentUser.email.toLowerCase().includes('ersido'))
    );
  }, [isMasterAdmin, currentUser, isAdmin]);

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

  // Custom Criteria Management State
  const [editingCriterion, setEditingCriterion] = useState<ConsultantEvaluationCriterion | null>(null);
  const [showCriterionModal, setShowCriterionModal] = useState(false);
  const [criterionForm, setCriterionForm] = useState<Partial<ConsultantEvaluationCriterion>>({});

  const handleAddCriterionClick = () => {
    setEditingCriterion(null);
    setCriterionForm({
      dim: 'A',
      dimName: 'Technical Skills & Engineering Competence',
      dimWeight: 35,
      ref: 'A1',
      parentName: 'Technical Specification Comprehension',
      parentWeight: 25,
      code: '',
      name: '',
      detailWeight: 1,
      effectiveWeight: 1,
      metric: '',
      formula: '',
      dataSource: '',
      benchmarks: {
        score5: '', score4: '', score3: '', score2: '', score1: ''
      }
    });
    setShowCriterionModal(true);
  };

  const handleEditCriterionClick = (crit: ConsultantEvaluationCriterion) => {
    setEditingCriterion(crit);
    setCriterionForm({
      ...crit,
      benchmarks: crit.benchmarks ? { ...crit.benchmarks } : { score5: '', score4: '', score3: '', score2: '', score1: '' }
    });
    setShowCriterionModal(true);
  };

  const handleDeleteCriterion = (code: string) => {
    if (confirm(`Are you sure you want to delete criterion ${code}?`)) {
      const updatedList = dynamicCriteriaList.filter(c => c.code !== code);
      const updatedConsultant = {
        ...consultant,
        customConsultantEvaluationCriteria: updatedList
      };
      if (onUpdateConsultant) onUpdateConsultant(updatedConsultant, `Deleted criterion ${code}`);
    }
  };

  const handleSaveCriterion = () => {
    if (!criterionForm.code || !criterionForm.name) {
      alert("Criterion Code and Name are required.");
      return;
    }

    const formattedCriterion: ConsultantEvaluationCriterion = {
      dim: criterionForm.dim || 'A',
      dimName: criterionForm.dimName || 'Technical Skills & Engineering Competence',
      dimWeight: Number(criterionForm.dimWeight) || 35,
      ref: criterionForm.ref || 'A1',
      parentName: criterionForm.parentName || 'Technical Specification Comprehension',
      parentWeight: Number(criterionForm.parentWeight) || 25,
      code: criterionForm.code.trim(),
      name: criterionForm.name.trim(),
      detailWeight: Number(criterionForm.detailWeight) || 1,
      effectiveWeight: Number(criterionForm.effectiveWeight) || 1,
      metric: criterionForm.metric || '',
      formula: criterionForm.formula || '',
      dataSource: criterionForm.dataSource || '',
      benchmarks: {
        score5: criterionForm.benchmarks?.score5 || '',
        score4: criterionForm.benchmarks?.score4 || '',
        score3: criterionForm.benchmarks?.score3 || '',
        score2: criterionForm.benchmarks?.score2 || '',
        score1: criterionForm.benchmarks?.score1 || '',
      }
    };
    
    let updatedList = [...dynamicCriteriaList];
    if (editingCriterion) {
      updatedList = updatedList.map(c => c.code === editingCriterion.code ? formattedCriterion : c);
    } else {
      if (updatedList.some(c => c.code === formattedCriterion.code)) {
        alert("Criterion code must be unique.");
        return;
      }
      updatedList.push(formattedCriterion);
    }
    
    const updatedConsultant = {
      ...consultant,
      customConsultantEvaluationCriteria: updatedList
    };
    
    if (onUpdateConsultant) onUpdateConsultant(updatedConsultant, `${editingCriterion ? 'Updated' : 'Added'} criterion ${formattedCriterion.code}`);
    setShowCriterionModal(false);
  };

  // Track which criteria have been manually overridden by the user
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>(() => {
    const overrides: Record<string, boolean> = {};
    if (consultant.detailedEvaluations) {
      Object.entries(consultant.detailedEvaluations).forEach(([code, ev]: [string, any]) => {
        const srcInfo = getCriterionSourceInfo({ code });
        if (srcInfo.source !== 'user_evaluation' && ev.autoEvaluated === false) {
          overrides[code] = true;
        }
      });
    }
    return overrides;
  });
  const [showMetricsFeed, setShowMetricsFeed] = useState(false);

  // Evaluation scores state: map of criterion code to evaluation payload
  // Auto-calculated criteria are populated from live submittals and project DB metrics;
  // Qualitative criteria provide a user evaluation option and preserve any previous ratings.
  const [evaluations, setEvaluations] = useState<Record<string, {
    score: number;
    actualValue?: string | number;
    notes?: string;
    formulaEvidence?: string;
    autoEvaluated?: boolean;
    evaluatedAt?: string;
    calculationSource?: CriterionCalculationSource;
    isAutoCalculated?: boolean;
    isUserEvaluated?: boolean;
  }>>(() => {
    const autoResults = autoEvaluateAllCriteria(project, consultant, submittalsList);
    if (consultant.detailedEvaluations && Object.keys(consultant.detailedEvaluations).length > 0) {
      const merged: Record<string, any> = { ...autoResults };
      Object.entries(consultant.detailedEvaluations).forEach(([code, prevEval]: [string, any]) => {
        const src = getCriterionSourceInfo({ code });
        if (src.source === 'user_evaluation' || prevEval.autoEvaluated === false || prevEval.isUserEvaluated) {
          merged[code] = {
            ...prevEval,
            calculationSource: src.source,
            isAutoCalculated: src.source !== 'user_evaluation',
            isUserEvaluated: true
          };
        }
      });
      return merged;
    }
    return autoResults;
  });

  // Source categorization filter: All, Auto-Calculated, Submittal, Project DB, User Evaluation Option, Overridden
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'AUTO_ALL' | 'AUTO_SUBMITTAL' | 'AUTO_DATABASE' | 'USER_EVALUATION' | 'OVERRIDDEN'>('ALL');
  // Expanded rubrics state for qualitative user evaluation criteria
  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});

  const toggleRubric = (code: string) => {
    setExpandedRubrics(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Compute breakdown counts across quantitative and qualitative criteria
  const autoCounts = useMemo(() => {
    let submittalCount = 0;
    let databaseCount = 0;
    let userEvalCount = 0;
    let userRatedCount = 0;

    dynamicCriteriaList.forEach(c => {
      const info = getCriterionSourceInfo(c);
      if (info.source === 'auto_submittal') submittalCount++;
      else if (info.source === 'auto_database') databaseCount++;
      else {
        userEvalCount++;
        const ev = evaluations[c.code];
        if (ev?.isUserEvaluated && ev?.score !== undefined) {
          userRatedCount++;
        }
      }
    });

    return {
      submittal: submittalCount,
      database: databaseCount,
      autoTotal: submittalCount + databaseCount,
      userEval: userEvalCount,
      userRated: userRatedCount,
      total: dynamicCriteriaList.length
    };
  }, [dynamicCriteriaList, evaluations]);

  // UI Filter states
  const [contractTypeFilter, setContractTypeFilter] = useState<'ALL' | 'DB' | 'DBB'>(() => project.contractType || 'DBB');
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

  // Sync contractTypeFilter if project.contractType updates
  useEffect(() => {
    if (project.contractType) {
      setContractTypeFilter(project.contractType);
    }
  }, [project.contractType]);

  // Criteria active under current Contract Type Selection (DB / DBB / ALL)
  const activeContractTypeCriteria = useMemo(() => {
    return dynamicCriteriaList.filter(c => {
      if (contractTypeFilter === 'ALL') return true;
      if (!c.contractType || c.contractType === 'ALL') return true;
      return c.contractType === contractTypeFilter;
    });
  }, [dynamicCriteriaList, contractTypeFilter]);

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
    const result = calculateComprehensiveEvaluationScore(evaluations, activeContractTypeCriteria, customCriterionWeights, customThresholds);
    let totalEvaluated = 0;
    let likertSum = 0;
    activeContractTypeCriteria.forEach(c => {
      const ev = evaluations[c.code];
      if (ev?.score !== undefined) {
        totalEvaluated++;
        likertSum += ev.score;
      }
    });
    const averageLikert = totalEvaluated > 0 ? likertSum / totalEvaluated : 4.0;
    
    // Submittal Log & Operational SLA Turnaround score (on-time rate)
    const slaTurnaroundScore = Number((quantitativeMetrics.overallOnTimeRate || 0).toFixed(1));
    // 5-Dimension Performance Evaluation score (matrix)
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
      totalCriteriaEvaluated: totalEvaluated || activeContractTypeCriteria.length,
      averageLikert
    };
  }, [evaluations, activeContractTypeCriteria, customCriterionWeights, quantitativeMetrics, customThresholds]);

  // Synchronize live Section 2 evaluation score to the parent component in real-time
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(evaluationResult.fiveDimScore);
    }
  }, [evaluationResult.fiveDimScore, onScoreChange]);

  // Real-time total weightage sum calculation
  const totalCustomWeightSum = useMemo(() => {
    return activeContractTypeCriteria.reduce((sum, c) => {
      const w = customCriterionWeights[c.code] !== undefined ? customCriterionWeights[c.code] : c.effectiveWeight;
      return sum + w;
    }, 0);
  }, [customCriterionWeights, activeContractTypeCriteria]);

  // List of all unique parent sub-criteria for filtering and grouping
  const parentCriteriaList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; dimensionId: DimensionId; weightInDimension: number }>();
    activeContractTypeCriteria.forEach(c => {
      const parentKey = `${c.dim}_${c.ref}`;
      if (!map.has(parentKey)) {
        map.set(parentKey, {
          id: c.ref,
          name: c.parentName,
          dimensionId: c.dim,
          weightInDimension: c.parentWeight
        });
      }
    });
    return Array.from(map.values());
  }, [activeContractTypeCriteria]);

  // Filtered criteria based on active dimension, category, source, and search filters
  const filteredCriteria = useMemo(() => {
    return activeContractTypeCriteria.filter(c => {
      if (selectedDimension !== 'ALL' && c.dim !== selectedDimension) return false;
      if (selectedParentId !== 'ALL' && c.ref !== selectedParentId) return false;
      
      const sourceInfo = getCriterionSourceInfo(c);
      if (sourceFilter === 'AUTO_ALL') {
        if (sourceInfo.source !== 'auto_submittal' && sourceInfo.source !== 'auto_database') return false;
      } else if (sourceFilter === 'AUTO_SUBMITTAL') {
        if (sourceInfo.source !== 'auto_submittal') return false;
      } else if (sourceFilter === 'AUTO_DATABASE') {
        if (sourceInfo.source !== 'auto_database') return false;
      } else if (sourceFilter === 'USER_EVALUATION') {
        if (sourceInfo.source !== 'user_evaluation') return false;
      } else if (sourceFilter === 'OVERRIDDEN') {
        if (!manualOverrides[c.code]) return false;
      }

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
  }, [selectedDimension, selectedParentId, sourceFilter, searchQuery, activeContractTypeCriteria, manualOverrides]);

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
      const groupKey = `${item.dim}_${item.ref}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          parentInfo: {
            id: item.ref,
            name: item.parentName,
            dimensionId: item.dim,
            weight: item.parentWeight
          },
          items: []
        };
      }
      groups[groupKey].items.push(item);
    });
    return groups;
  }, [filteredCriteria]);

  // Handle score update for an individual criterion:
  // - If it is an auto-calculated criterion, marks it as a manual override
  // - If it is a user evaluation option criterion, records the user's qualitative rating
  const handleScoreChange = (criterionId: string, newScore: number) => {
    if (isReadonly || !isAdmin) return;
    const sourceInfo = getCriterionSourceInfo({ code: criterionId });
    const isAuto = sourceInfo.source !== 'user_evaluation';
    if (isAuto) {
      setManualOverrides(prev => ({ ...prev, [criterionId]: true }));
    }
    setEvaluations(prev => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        score: newScore,
        autoEvaluated: isAuto ? false : false,
        isUserEvaluated: true,
        calculationSource: sourceInfo.source,
        evaluatedAt: new Date().toISOString(),
        notes: prev[criterionId]?.notes || (sourceInfo.source === 'user_evaluation'
          ? `User qualitative performance rating: ${newScore}/5`
          : `Manual score override (${newScore}/5) set by evaluator.`)
      }
    }));
  };

  // Handle evaluator notes or observation remarks update
  const handleNotesChange = (criterionId: string, newNotes: string) => {
    if (isReadonly || !isAdmin) return;
    setEvaluations(prev => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        score: prev[criterionId]?.score || 4,
        notes: newNotes,
        evaluatedAt: new Date().toISOString()
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
        calculationSource: auto.calculationSource,
        isAutoCalculated: true,
        isUserEvaluated: false,
        evaluatedAt: new Date().toISOString()
      }
    }));
  };

  // Recalculate auto-calculated criteria (submittals & project DB) from live data,
  // without touching qualitative user evaluations
  const handleRecalculateAutoCriteria = () => {
    const autoResults = autoEvaluateAllCriteria(project, consultant, submittalsList);
    setEvaluations(prev => {
      const next = { ...prev };
      Object.entries(autoResults).forEach(([code, autoData]) => {
        const sourceInfo = getCriterionSourceInfo({ code });
        if (sourceInfo.source !== 'user_evaluation' && !manualOverrides[code]) {
          next[code] = autoData;
        }
      });
      return next;
    });
    setAutoEvaluatedCount(autoCounts.autoTotal);
    setSaveSuccessMsg(`Recalculated ${autoCounts.autoTotal} auto-criteria from live submittals & project database metrics!`);
    setTimeout(() => {
      setAutoEvaluatedCount(null);
      setSaveSuccessMsg(null);
    }, 4500);
  };

  // Quick baseline assigner for qualitative user evaluation criteria
  const handleSetBaselineUserCriteria = (targetScore = 4) => {
    if (isReadonly || !isAdmin) return;
    setEvaluations(prev => {
      const next = { ...prev };
      dynamicCriteriaList.forEach(c => {
        const sourceInfo = getCriterionSourceInfo(c);
        if (sourceInfo.source === 'user_evaluation') {
          next[c.code] = {
            ...(next[c.code] || {}),
            score: targetScore,
            isUserEvaluated: true,
            autoEvaluated: false,
            calculationSource: 'user_evaluation',
            evaluatedAt: new Date().toISOString(),
            notes: next[c.code]?.notes || `Standard benchmark baseline evaluation: ${targetScore}/5`
          };
        }
      });
      return next;
    });
    setSaveSuccessMsg(`Assigned benchmark baseline (${targetScore}/5 - Good) across ${autoCounts.userEval} qualitative user criteria!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
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

      {/* TOP: Master Overall Formula Executive Scorecard */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-lg space-y-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-indigo-800/50 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider font-mono">
                Master Evaluation Formula
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Formula Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider font-mono">
                Likert Scale: 5 (Superior) to 1 (Poor)
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
              Supervision Consultant Performance Evaluation
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-3xl leading-relaxed">
              Overall Scoring Formula: <span className="font-mono font-bold text-amber-300">S = (0.30×A) + (0.25×B) + (0.20×C) + (0.15×D) + (0.10×E)</span>. Scoring standard: Highest Likert rating (5.00) delivers the superior performance score value. Artificial auto-caps to 2.00 disabled.
            </p>
          </div>

          {/* Master Score Dial */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center font-mono">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block">Overall Score (S)</span>
              <div className="text-3xl font-black text-white mt-0.5">
                {evaluationResult.overallScore.toFixed(1)}%
              </div>
              <span className="text-[10px] text-indigo-300 font-bold block">
                ({evaluationResult.overallScore1To5.toFixed(2)} / 5.00)
              </span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block">Official Grade</span>
              <span className={`inline-block mt-1 px-3 py-1 rounded-xl text-xs font-black border ${evaluationResult.gradeBadgeStyle}`}>
                {evaluationResult.officialGrade}
              </span>
            </div>
          </div>
        </div>

        {/* Formula Breakdown Live Calculation */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-900/40 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono">
            <span className="text-indigo-300 font-bold uppercase tracking-wider text-[11px]">Live Formula Substitution:</span>
            <span className="text-amber-300 font-black text-xs bg-slate-900 px-3 py-1 rounded-xl border border-indigo-800/60">
              {evaluationResult.formulaCalculationString}
            </span>
          </div>

          {/* 5 Dimension Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {(['A', 'B', 'C', 'D', 'E'] as DimensionId[]).map(dim => {
              const bd = evaluationResult.dimensionBreakdown[dim];
              const dimMeta = DIMENSIONS_META[dim];
              return (
                <div key={`formula-dim-${dim}`} className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-center font-mono space-y-1">
                  <span className="text-[10px] text-indigo-300 font-bold block uppercase truncate" title={dimMeta.name}>
                    Dim {dim} ({(bd.weightFactor * 100).toFixed(0)}%)
                  </span>
                  <div className="text-xs font-black text-white">
                    {bd.percentage.toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-400 block">
                    {bd.score1To5.toFixed(2)} / 5.0
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
                    <p className="text-[11px] font-bold text-slate-400">Section 2 Supervision Consultant Performance Evaluation Criteria</p>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center font-mono">
                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-bold uppercase flex items-center justify-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Submittals Auto
                  </span>
                  <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                    {autoCounts.submittal} Criteria
                  </span>
                </div>
                <div className="bg-teal-50/50 dark:bg-teal-950/30 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                  <span className="text-[9px] text-teal-600 dark:text-teal-400 block font-bold uppercase flex items-center justify-center gap-1">
                    <Database className="w-2.5 h-2.5" /> Project DB Auto
                  </span>
                  <span className="text-xs font-black text-teal-700 dark:text-teal-300">
                    {autoCounts.database} Criteria
                  </span>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-bold uppercase flex items-center justify-center gap-1">
                    <Award className="w-2.5 h-2.5" /> User Eval Option
                  </span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                    {autoCounts.userEval} Criteria
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                    User Rated / Ovr
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {autoCounts.userRated} rated · {overriddenCount} ovr
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
                      <div key={`thresh-edit-${tier.id || 'tier'}-${index}`} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-950/80">
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
              {customThresholds.map((tier, tierIdx) => {
                const isCurrent = evaluationResult.compositeScore >= tier.minScore && evaluationResult.compositeScore <= tier.maxScore;
                return (
                  <div
                    key={`thresh-view-${tier.id || 'tier'}-${tierIdx}`}
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

          {/* Contract Type Evaluation Criteria Mode Banner (DB vs DBB) */}
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-5 shadow-3xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                    Contract Type Alignment
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Project Type: <strong className="text-slate-800 dark:text-slate-200 font-bold">{project.contractType || 'DBB'}</strong>
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Section 2 Supervision Consultant Evaluation Criteria by Contract Type
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a contract type mode below to filter performance evaluation criteria tailored specifically for Design-Build (DB) or Design-Bid-Build (DBB) supervision contracts.
                </p>
              </div>

              {/* Interactive Pills for Contract Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setContractTypeFilter('DBB')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    contractTypeFilter === 'DBB'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  DBB Criteria
                </button>
                <button
                  type="button"
                  onClick={() => setContractTypeFilter('DB')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    contractTypeFilter === 'DB'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  DB Criteria
                </button>
                <button
                  type="button"
                  onClick={() => setContractTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    contractTypeFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  All Criteria
                </button>
              </div>
            </div>

            {/* Contract Mode Description */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                {contractTypeFilter === 'DB' && (
                  <span><strong>DB Mode Active:</strong> Evaluating Detailed Design Submittals (DDS), Contractor design calculations, Value Engineering (VE) reviews, and Employer&apos;s Requirements compliance.</span>
                )}
                {contractTypeFilter === 'DBB' && (
                  <span><strong>DBB Mode Active:</strong> Evaluating provision of Employer/Consultant construction drawings, Draft &amp; Final Design Review Report submissions, and Design modification controls.</span>
                )}
                {contractTypeFilter === 'ALL' && (
                  <span><strong>All Criteria Mode Active:</strong> Showing all general, DB, and DBB supervision consultant evaluation criteria simultaneously.</span>
                )}
              </div>
            </div>
          </div>

          {/* Core Action Command Center */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center lg:text-left">
              <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center justify-center lg:justify-start gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Section 2 Evaluation Command Center
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Auto-calculated criteria are populated directly from submittals and the project database, while qualitative criteria provide an interactive user evaluation option.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-center lg:justify-end">
              {!isReadonly && isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleRecalculateAutoCriteria}
                    className="px-3.5 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-bold flex items-center gap-1.5 border border-blue-700 transition cursor-pointer"
                    title="Recalculate only the criteria gained from submittals and project database without overwriting user ratings"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    Auto-Calculate ({autoCounts.autoTotal})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetBaselineUserCriteria(4)}
                    className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-200 text-xs font-bold flex items-center gap-1.5 border border-amber-800 transition cursor-pointer"
                    title="Set all qualitative user criteria to benchmark rating (4 - Good)"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Set Baseline for User Criteria (4/5)
                  </button>

                  {overriddenCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoEvaluateAll}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                      title="Reset all manual overrides back to calculated results"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset Overrides ({overriddenCount})
                    </button>
                  )}
                </>
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
                    .map((p, pIdx) => (
                      <option key={`parent-opt-${p.dimensionId}-${p.id}-${pIdx}`} value={p.id}>
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
              {isMasterAdminUser && !isReadonly && (
                <button
                  onClick={handleAddCriterionClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Criterion
                </button>
              )}
            </div>

            {/* Evaluation Source Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Evaluation Source:
              </span>
              <button
                type="button"
                onClick={() => setSourceFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All ({dynamicCriteriaList.filter(c => selectedDimension === 'ALL' || c.dim === selectedDimension).length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('AUTO_ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'AUTO_ALL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                }`}
                title="Criteria auto-calculated from Submittals and Project Database"
              >
                <Zap className="w-3 h-3" />
                Auto-Calculated ({dynamicCriteriaList.filter(c => (selectedDimension === 'ALL' || c.dim === selectedDimension) && (getCriterionSourceInfo(c).source === 'auto_submittal' || getCriterionSourceInfo(c).source === 'auto_database')).length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('AUTO_SUBMITTAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'AUTO_SUBMITTAL'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100'
                }`}
                title="Submittal Logs & Turnaround SLAs"
              >
                <FileText className="w-3 h-3" />
                Submittals ({dynamicCriteriaList.filter(c => (selectedDimension === 'ALL' || c.dim === selectedDimension) && getCriterionSourceInfo(c).source === 'auto_submittal').length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('AUTO_DATABASE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'AUTO_DATABASE'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100'
                }`}
                title="Project Database (IPCs, SPI, Staff, Invoices, Safety)"
              >
                <Database className="w-3 h-3" />
                Project DB ({dynamicCriteriaList.filter(c => (selectedDimension === 'ALL' || c.dim === selectedDimension) && getCriterionSourceInfo(c).source === 'auto_database').length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('USER_EVALUATION')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sourceFilter === 'USER_EVALUATION'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                }`}
                title="Qualitative Supervisory Performance Criteria requiring User Evaluation"
              >
                <Award className="w-3 h-3 text-amber-500" />
                User Evaluation Option ({dynamicCriteriaList.filter(c => (selectedDimension === 'ALL' || c.dim === selectedDimension) && getCriterionSourceInfo(c).source === 'user_evaluation').length})
              </button>
              {overriddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSourceFilter('OVERRIDDEN')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    sourceFilter === 'OVERRIDDEN'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100'
                  }`}
                >
                  ✍ Overridden ({overriddenCount})
                </button>
              )}
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
              (Object.entries(groupedCriteria) as [string, CriteriaGroup][]).map(([parentId, group], gIdx) => {
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
                    key={`group-card-${parentId}-${gIdx}`}
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
                        {group.items.map((criterion, critIdx) => {
                          const evalItem = evaluations[criterion.code] || { score: 4 };
                          const currentScore = evalItem.score || 1;
                          const isOverridden = !!manualOverrides[criterion.code];
                          
                          const sourceInfo = getCriterionSourceInfo(criterion);
                          const isSubmittal = sourceInfo.source === 'auto_submittal';
                          const isDatabase = sourceInfo.source === 'auto_database';
                          const isUserEval = sourceInfo.source === 'user_evaluation';
                          const isAuto = isSubmittal || isDatabase;
                          const isRatedByUser = !!evalItem.isUserEvaluated;
                          const isRubricExpanded = !!expandedRubrics[criterion.code];

                          const effectiveTotalWeight = customCriterionWeights[criterion.code] !== undefined
                            ? customCriterionWeights[criterion.code]
                            : criterion.effectiveWeight;

                          const itemEarnedScore = (currentScore / 5) * effectiveTotalWeight;

                          return (
                            <div
                              key={`crit-row-${criterion.code || 'item'}-${critIdx}`}
                              className={`p-4 transition space-y-3 ${
                                isOverridden
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-amber-400'
                                  : isSubmittal
                                  ? 'hover:bg-blue-50/30 dark:hover:bg-blue-950/20 border-l-4 border-blue-400'
                                  : isDatabase
                                  ? 'hover:bg-teal-50/30 dark:hover:bg-teal-950/20 border-l-4 border-teal-400'
                                  : 'hover:bg-amber-50/20 dark:hover:bg-amber-950/10 border-l-4 border-amber-500'
                              }`}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2 max-w-3xl flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                                      Code {criterion.code}
                                    </span>

                                    {/* Source Classification Badge */}
                                    {isSubmittal && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-mono">
                                        <FileText className="w-2.5 h-2.5 text-blue-600" />
                                        Submittal Auto
                                      </span>
                                    )}
                                    {isDatabase && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1 font-mono">
                                        <Database className="w-2.5 h-2.5 text-teal-600" />
                                        Project DB Auto
                                      </span>
                                    )}
                                    {isUserEval && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 font-mono">
                                        <Award className="w-2.5 h-2.5 text-amber-600" />
                                        User Evaluation Option
                                      </span>
                                    )}

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

                                    {/* Evaluation Status & Override Indicator */}
                                    {isOverridden ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                                          ✍ Manual Override
                                        </span>
                                        {!isReadonly && isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleResetCriterionToAuto(criterion)}
                                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                            title="Revert back to formula-calculated live score"
                                          >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                            Reset to Auto
                                          </button>
                                        )}
                                      </div>
                                    ) : isAuto ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                        Auto Calculated
                                      </span>
                                    ) : isRatedByUser ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5 text-indigo-600" />
                                        User Rated
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                        Benchmark Baseline (4)
                                      </span>
                                    )}

                                    {isMasterAdminUser && !isReadonly && (
                                      <div className="flex items-center gap-1 ml-auto">
                                        <button
                                          type="button"
                                          onClick={() => handleEditCriterionClick(criterion)}
                                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition cursor-pointer"
                                          title="Edit Criterion"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCriterion(criterion.code)}
                                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-rose-500 transition cursor-pointer"
                                          title="Delete Criterion"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Evaluator Question Box */}
                                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 mt-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                        <HelpCircle className="w-3 h-3" /> Performance Criterion Description:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRubric(criterion.code)}
                                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                                      >
                                        {isRubricExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        <span>Scoring Rubrics (1–5)</span>
                                      </button>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                                      {criterion.name}
                                    </p>

                                    {/* Data Source & Calculation Evidence Info */}
                                    <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-3 text-[11px]">
                                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">Data Source:</span>
                                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                                          {criterion.dataSource}
                                        </span>
                                      </div>

                                      {isAuto && (
                                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                          <span className="font-semibold text-slate-600 dark:text-slate-300">Formula:</span>
                                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                                            {evalItem.formulaEvidence || criterion.formula}
                                          </span>
                                        </div>
                                      )}

                                      {isAuto && evalItem.actualValue !== undefined && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-semibold text-slate-600 dark:text-slate-300">Metric Value:</span>
                                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                            {evalItem.actualValue}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Optional Evaluator Qualitative Notes Input for User Evaluated criteria */}
                                    {isUserEval && (
                                      <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                          <Award className="w-3 h-3" />
                                          <span>Qualitative Supervisory Assessment (User Input Required)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            disabled={isReadonly || !isAdmin}
                                            value={evalItem.notes || ''}
                                            onChange={(e) => handleNotesChange(criterion.code, e.target.value)}
                                            placeholder="Add evaluator assessment notes, evidence, or observation..."
                                            className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-slate-400 disabled:opacity-60"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Expandable Scoring Rubrics (1 to 5) */}
                                  {isRubricExpanded && (
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-850 text-[10px] border border-slate-200 dark:border-slate-750">
                                      <div className={`p-2 rounded-lg border ${currentScore === 1 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <span className="font-bold text-rose-600 dark:text-rose-400 block mb-0.5">1 - Deficient</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-[9px] leading-tight">{criterion.benchmarks?.score1 || 'Deficient performance benchmark'}</p>
                                      </div>
                                      <div className={`p-2 rounded-lg border ${currentScore === 2 ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <span className="font-bold text-orange-600 dark:text-orange-400 block mb-0.5">2 - Marginal</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-[9px] leading-tight">{criterion.benchmarks?.score2 || 'Marginal performance benchmark'}</p>
                                      </div>
                                      <div className={`p-2 rounded-lg border ${currentScore === 3 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">3 - Acceptable</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-[9px] leading-tight">{criterion.benchmarks?.score3 || 'Acceptable performance benchmark'}</p>
                                      </div>
                                      <div className={`p-2 rounded-lg border ${currentScore === 4 ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">4 - Good</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-[9px] leading-tight">{criterion.benchmarks?.score4 || 'Good performance benchmark'}</p>
                                      </div>
                                      <div className={`p-2 rounded-lg border ${currentScore === 5 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">5 - Superior</span>
                                        <p className="text-slate-600 dark:text-slate-400 text-[9px] leading-tight">{criterion.benchmarks?.score5 || 'Superior performance benchmark'}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right: Likert scale 1 to 5 selector */}
                                <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {isAuto ? 'Score (Click to Override):' : 'Evaluator Rating (1–5):'}
                                    </span>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                      {[1, 2, 3, 4, 5].map((val) => {
                                        const isActive = currentScore === val;
                                        return (
                                          <button
                                            key={val}
                                            type="button"
                                            disabled={isReadonly || !isAdmin}
                                            onClick={() => handleScoreChange(criterion.code, val)}
                                            title={`Score ${val} — ${val === 5 ? 'Superior' : val === 4 ? 'Good' : val === 3 ? 'Acceptable' : val === 2 ? 'Marginal' : 'Deficient'}`}
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

                                  <div className="text-[10px] font-bold font-mono">
                                    <span className={
                                      currentScore >= 4 ? 'text-emerald-600 dark:text-emerald-400' :
                                      currentScore === 3 ? 'text-amber-600 dark:text-amber-400' :
                                      'text-rose-600 dark:text-rose-400'
                                    }>
                                      {currentScore === 5 ? '5 - Superior' :
                                       currentScore === 4 ? '4 - Good' :
                                       currentScore === 3 ? '3 - Acceptable' :
                                       currentScore === 2 ? '2 - Marginal' : '1 - Deficient'}
                                    </span>
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
            <div className="flex flex-wrap items-center gap-2">
              {!isReadonly && isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleRecalculateAutoCriteria}
                    className="px-3.5 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/60 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Recalculate auto criteria directly from live submittals and project database"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    Auto-Calculate ({autoCounts.autoTotal})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetBaselineUserCriteria(4)}
                    className="px-3.5 py-2 bg-amber-950/50 hover:bg-amber-900 text-amber-200 border border-amber-800/60 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Apply standard benchmark rating (4 - Good) to qualitative user criteria"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Baseline User Criteria (4/5)
                  </button>

                  {overriddenCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoEvaluateAll}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      title="Reset all manual overrides back to calculated live scores"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset Overrides ({overriddenCount})
                    </button>
                  )}
                </>
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

      {/* Criterion Edit Modal */}
      {showCriterionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCriterionModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingCriterion ? 'Edit Criterion' : 'Add New Criterion'}
              </h3>
              <button
                onClick={() => setShowCriterionModal(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Criterion Code</label>
                <input
                  type="text"
                  value={criterionForm.code || ''}
                  onChange={(e) => setCriterionForm({ ...criterionForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. A2.1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Criterion Name / Description</label>
                <textarea
                  value={criterionForm.name || ''}
                  onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parent Sub-Category ID (Ref)</label>
                  <input
                    type="text"
                    value={criterionForm.ref || ''}
                    onChange={(e) => setCriterionForm({ ...criterionForm, ref: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    placeholder="e.g. A2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dimension (A-E)</label>
                  <select
                    value={criterionForm.dim || 'A'}
                    onChange={(e) => setCriterionForm({ ...criterionForm, dim: e.target.value as DimensionId })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="A">A: Technical Skills</option>
                    <option value="B">B: Staff Provision</option>
                    <option value="C">C: Quality Assurance</option>
                    <option value="D">D: Progress / Reporting</option>
                    <option value="E">E: HSE & Environment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Dim Weight (%)</label>
                  <input
                    type="number"
                    value={criterionForm.dimWeight || 0}
                    onChange={(e) => setCriterionForm({ ...criterionForm, dimWeight: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Parent Weight (%)</label>
                  <input
                    type="number"
                    value={criterionForm.parentWeight || 0}
                    onChange={(e) => setCriterionForm({ ...criterionForm, parentWeight: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Net Base Weight (%)</label>
                  <input
                    type="number"
                    value={criterionForm.effectiveWeight || 0}
                    onChange={(e) => setCriterionForm({ ...criterionForm, effectiveWeight: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Metric, Formula & Data Source */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Metric Measured</label>
                  <input
                    type="text"
                    value={criterionForm.metric || ''}
                    onChange={(e) => setCriterionForm({ ...criterionForm, metric: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="e.g. Turnaround Days"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Calculation Formula</label>
                  <input
                    type="text"
                    value={criterionForm.formula || ''}
                    onChange={(e) => setCriterionForm({ ...criterionForm, formula: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="e.g. Avg(Days)"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Data Source</label>
                  <input
                    type="text"
                    value={criterionForm.dataSource || ''}
                    onChange={(e) => setCriterionForm({ ...criterionForm, dataSource: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="e.g. RFI Log"
                  />
                </div>
              </div>

              {/* Benchmarks (5 Likert levels) */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Likert Benchmark Definitions</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-emerald-600 shrink-0">Score 5 (Excl)</span>
                    <input
                      type="text"
                      value={criterionForm.benchmarks?.score5 || ''}
                      onChange={(e) => setCriterionForm({
                        ...criterionForm,
                        benchmarks: { ...criterionForm.benchmarks, score5: e.target.value } as any
                      })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="e.g. 100% compliance or <= 3 days"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-emerald-500 shrink-0">Score 4 (Good)</span>
                    <input
                      type="text"
                      value={criterionForm.benchmarks?.score4 || ''}
                      onChange={(e) => setCriterionForm({
                        ...criterionForm,
                        benchmarks: { ...criterionForm.benchmarks, score4: e.target.value } as any
                      })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="e.g. 90-99% compliance or 4-7 days"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-amber-500 shrink-0">Score 3 (Fair)</span>
                    <input
                      type="text"
                      value={criterionForm.benchmarks?.score3 || ''}
                      onChange={(e) => setCriterionForm({
                        ...criterionForm,
                        benchmarks: { ...criterionForm.benchmarks, score3: e.target.value } as any
                      })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="e.g. 75-89% compliance or 8-14 days"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-rose-500 shrink-0">Score 2 (Poor)</span>
                    <input
                      type="text"
                      value={criterionForm.benchmarks?.score2 || ''}
                      onChange={(e) => setCriterionForm({
                        ...criterionForm,
                        benchmarks: { ...criterionForm.benchmarks, score2: e.target.value } as any
                      })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="e.g. 50-74% compliance or 15-21 days"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-rose-700 shrink-0">Score 1 (Crit)</span>
                    <input
                      type="text"
                      value={criterionForm.benchmarks?.score1 || ''}
                      onChange={(e) => setCriterionForm({
                        ...criterionForm,
                        benchmarks: { ...criterionForm.benchmarks, score1: e.target.value } as any
                      })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="e.g. < 50% compliance or > 21 days"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setShowCriterionModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCriterion}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
              >
                Save Criterion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

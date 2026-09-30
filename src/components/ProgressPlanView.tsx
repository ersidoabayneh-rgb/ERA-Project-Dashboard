import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Undo2,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowDownNarrowWide,
  CalendarRange,
  Layers,
  Sliders,
  Calculator,
  Copy,
  ArrowRight,
  Info,
  CheckCircle2,
  Percent,
  AlertCircle
} from 'lucide-react';
import { Project, ProgressPlan, ProgressPlanHistoryItem } from '../types';
import { parseMonthKey } from '../lib/monthlySync';

export interface EfyPlanValidation {
  isExceeded: boolean;
  message: string;
  reason?: 'length' | 'budget' | 'both';
}

export const validateEfyPlanValue = (
  val: number | string | undefined | null,
  project?: Partial<Project> | null
): EfyPlanValidation => {
  const num = typeof val === 'string' ? parseFloat(val) : (typeof val === 'number' ? val : 0);
  if (isNaN(num) || num <= 0) {
    return { isExceeded: false, message: '' };
  }

  const lengthKm = typeof project?.lengthKm === 'number' && project.lengthKm > 0 ? project.lengthKm : 0;
  
  // Total contract budget in ETB
  const totalBudget = project?.contractAmountEtb || 
    project?.revisedContractAmountEtb || 
    (typeof project?.origAmount === 'number' && project.origAmount > 0
      ? (project.origAmount > 100000 ? project.origAmount : project.origAmount * 1_000_000)
      : 0);

  // Annual budget for this EFY year if defined in project.annual
  const efyLabel = project?.progressPlanLabels?.efyLabel || '';
  const efyNum = parseInt(efyLabel.replace(/\D/g, ''), 10);
  const annualItem = project?.annual?.find(a => 
    a.year === efyNum || 
    (!isNaN(efyNum) && efyNum < 100 && (a.year % 100) === efyNum) || 
    (!isNaN(efyNum) && efyNum > 2000 && (a.year === efyNum || a.year === efyNum + 7 || a.year === efyNum + 8))
  );
  
  let annualBudget = 0;
  if (annualItem?.budget && annualItem.budget > 0) {
    annualBudget = annualItem.budget;
  } else if (annualItem?.amount && annualItem.amount > 0) {
    if (annualItem.amount > 100_000) {
      annualBudget = annualItem.amount;
    } else if (!annualItem.km || annualItem.amount !== annualItem.km) {
      annualBudget = annualItem.amount * 1_000_000;
    }
  }

  const exceedsLength = lengthKm > 0 && num > lengthKm;
  let exceedsBudget = false;
  let budgetDetail = '';

  if (totalBudget > 0 && num > totalBudget) {
    exceedsBudget = true;
    budgetDetail = `exceeds total contract budget constraint (${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB)`;
  } else if (annualBudget > 0 && num > annualBudget) {
    exceedsBudget = true;
    budgetDetail = `exceeds EFY ${annualItem?.year || efyLabel} annual budget constraint (${annualBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB)`;
  } else if (annualBudget > 0 && lengthKm > 0 && totalBudget > 0) {
    const impliedCost = (num / lengthKm) * totalBudget;
    if (impliedCost > annualBudget * 1.02) {
      exceedsBudget = true;
      budgetDetail = `implied cost (${impliedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB) exceeds EFY ${annualItem?.year || efyLabel} annual budget constraint (${annualBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB)`;
    }
  }

  if (exceedsLength && exceedsBudget) {
    return {
      isExceeded: true,
      reason: 'both',
      message: `⚠️ Exceeds Constraints: Entered ${num.toFixed(2)} Km exceeds total length (${lengthKm.toFixed(2)} Km) and ${budgetDetail}`
    };
  }

  if (exceedsLength) {
    return {
      isExceeded: true,
      reason: 'length',
      message: `⚠️ Exceeds Length Constraint: Entered ${num.toFixed(2)} Km exceeds project's total length of ${lengthKm.toFixed(2)} Km`
    };
  }

  if (exceedsBudget) {
    return {
      isExceeded: true,
      reason: 'budget',
      message: `⚠️ Exceeds Budget Constraint: Entered value ${budgetDetail}`
    };
  }

  return { isExceeded: false, message: '' };
};

export interface ValidatedEfyInputProps {
  value: number | string;
  project?: Partial<Project> | null;
  baseClassName?: string;
  normalBorderClass?: string;
  tooltipPosition?: 'top' | 'bottom';
  containerClassName?: string;
  className?: string;
  type?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  title?: string;
  id?: string;
  name?: string;
  onChange?: (e: any) => void;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  [key: string]: any;
}

export function ValidatedEfyInput({
  value,
  project,
  baseClassName = 'w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition',
  normalBorderClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500',
  tooltipPosition = 'top',
  containerClassName = '',
  className = '',
  ...rest
}: ValidatedEfyInputProps) {
  const validation = validateEfyPlanValue(value, project);

  return (
    <div className={`relative group inline-flex items-center justify-center ${containerClassName}`}>
      <input
        value={value}
        title={validation.isExceeded ? validation.message : (rest.title || undefined)}
        aria-invalid={validation.isExceeded}
        data-invalid={validation.isExceeded ? "true" : undefined}
        className={`${baseClassName} ${
          validation.isExceeded
            ? '!border-red-500 !border-2 !ring-2 !ring-red-500/60 !bg-red-50/90 dark:!bg-red-950/50 !text-red-700 dark:!text-red-300 font-bold focus:!border-red-600 focus:!ring-red-600 shadow-xs'
            : normalBorderClass
        } ${className}`}
        {...rest}
      />
      {validation.isExceeded && (
        <div 
          role="tooltip"
          className={`absolute ${tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 hidden group-hover:flex group-focus-within:flex flex-col items-center z-50 pointer-events-none w-max max-w-[260px] animate-fadeIn`}
        >
          {tooltipPosition === 'bottom' && <div className="w-2 h-2 bg-red-600 rotate-45 -mb-1 z-10" />}
          <div className="bg-red-600 text-white text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 text-center leading-snug whitespace-normal border border-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-200" />
            <span>{validation.message}</span>
          </div>
          {tooltipPosition === 'top' && <div className="w-2 h-2 bg-red-600 rotate-45 -mt-1" />}
        </div>
      )}
    </div>
  );
}

// EFY Month Definitions (12 Fiscal Months in Gregorian Calendar: Jul to Jun)
export const EFY_MONTH_DEFINITIONS = [
  { id: 1, idx: 0, name: 'M1 (July)', short: 'Jul', eth: 'July', q: 'Q1' },
  { id: 2, idx: 1, name: 'M2 (August)', short: 'Aug', eth: 'August', q: 'Q1' },
  { id: 3, idx: 2, name: 'M3 (September)', short: 'Sep', eth: 'September', q: 'Q1' },
  { id: 4, idx: 3, name: 'M4 (October)', short: 'Oct', eth: 'October', q: 'Q2' },
  { id: 5, idx: 4, name: 'M5 (November)', short: 'Nov', eth: 'November', q: 'Q2' },
  { id: 6, idx: 5, name: 'M6 (December)', short: 'Dec', eth: 'December', q: 'Q2' },
  { id: 7, idx: 6, name: 'M7 (January)', short: 'Jan', eth: 'January', q: 'Q3' },
  { id: 8, idx: 7, name: 'M8 (February)', short: 'Feb', eth: 'February', q: 'Q3' },
  { id: 9, idx: 8, name: 'M9 (March)', short: 'Mar', eth: 'March', q: 'Q3' },
  { id: 10, idx: 9, name: 'M10 (April)', short: 'Apr', eth: 'April', q: 'Q4' },
  { id: 11, idx: 10, name: 'M11 (May)', short: 'May', eth: 'May', q: 'Q4' },
  { id: 12, idx: 11, name: 'M12 (June)', short: 'Jun', eth: 'June', q: 'Q4' },
];

export const calculateQuarterlyAndEfyFromMonths = (months: number[]) => {
  const m = months && months.length === 12 ? months : Array(12).fill(0);
  const q1 = Number(((m[0] || 0) + (m[1] || 0) + (m[2] || 0)).toFixed(2));
  const q2 = Number(((m[3] || 0) + (m[4] || 0) + (m[5] || 0)).toFixed(2));
  const q3 = Number(((m[6] || 0) + (m[7] || 0) + (m[8] || 0)).toFixed(2));
  const q4 = Number(((m[9] || 0) + (m[10] || 0) + (m[11] || 0)).toFixed(2));
  const efy = Number((q1 + q2 + q3 + q4).toFixed(2));
  return { q1, q2, q3, q4, efy };
};

export const distributeTotalTo12Months = (total: number, pattern: 'even' | 'dry_season' | 'scurve' = 'even'): number[] => {
  const weightsEven = Array(12).fill(1 / 12);
  const weightsDry = [0.04, 0.04, 0.06, 0.09, 0.11, 0.12, 0.13, 0.13, 0.12, 0.08, 0.05, 0.03];
  const weightsScurve = [0.03, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.13, 0.11, 0.09, 0.06, 0.04];
  const weights = pattern === 'dry_season' ? weightsDry : pattern === 'scurve' ? weightsScurve : weightsEven;
  return weights.map(w => Number((total * w).toFixed(2)));
};

export const parseHistoryMonthSortKey = (monthLabel: string | undefined | null, efyLabel?: string): number => {
  if (!monthLabel) return 0;
  const s = monthLabel.trim();

  // 1. Try standard parseMonthKey (handles Jan 2026, Dec 2025, 2026-01, etc.)
  const parsed = parseMonthKey(s);
  if (parsed) {
    return parsed.year * 100 + (parsed.monthIndex + 1);
  }

  // 2. Check Ethiopian months
  const ethMonths = [
    'meskerem', 'tikimt', 'hidar', 'tahsas', 'tir', 'yakatit', 
    'megabit', 'miyazya', 'ginbot', 'sene', 'hamle', 'nehase', 'pagume'
  ];
  const ethShort = ['mes', 'tik', 'hid', 'tah', 'tir', 'yak', 'meg', 'miy', 'gin', 'sen', 'ham', 'neh', 'pag'];
  const sLower = s.toLowerCase();
  for (let i = 0; i < ethMonths.length; i++) {
    if (sLower.includes(ethMonths[i]) || sLower.includes(ethShort[i])) {
      const yearMatch = s.match(/\b(20\d{2}|\d{4}|\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[1], 10) : (parseFloat(efyLabel || '') || 2018);
      if (year < 100) year += 2000;
      return year * 100 + (i + 1);
    }
  }

  // 3. Month number (e.g. Month 1, Month 12)
  const monthNumMatch = s.match(/month\s*(\d+)/i);
  if (monthNumMatch) {
    const mNum = parseInt(monthNumMatch[1], 10);
    const yearMatch = s.match(/\b(20\d{2}|\d{4})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (parseFloat(efyLabel || '') || 2000);
    return year * 100 + mNum;
  }

  // 4. Generic year match
  const yearMatch = s.match(/\b(20\d{2}|\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return year * 100;
  }

  if (efyLabel) {
    const efy = parseFloat(efyLabel) || 0;
    if (efy > 0) return efy * 100;
  }

  return 0;
};

export const sortProgressPlanHistoryDescending = (items: ProgressPlanHistoryItem[]): ProgressPlanHistoryItem[] => {
  return [...items].sort((a, b) => {
    const valA = parseHistoryMonthSortKey(a.monthLabel, a.efyLabel);
    const valB = parseHistoryMonthSortKey(b.monthLabel, b.efyLabel);

    if (valA !== valB) {
      return valB - valA; // Descending: latest year & month first
    }

    // Secondary comparison by EFY if numeric
    const efyA = parseFloat(a.efyLabel) || 0;
    const efyB = parseFloat(b.efyLabel) || 0;
    if (efyA !== efyB) {
      return efyB - efyA;
    }

    // Fallback comparison by id timestamp or string descending
    return (b.id || '').localeCompare(a.id || '');
  });
};

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

  const historyList = useMemo(() => {
    return sortProgressPlanHistoryDescending(project.progressPlanHistory || []);
  }, [project.progressPlanHistory]);

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

  // EFY Whole Year Planning states (Whole Fiscal Year Planning at Beginning of FY)
  const [contractorMonths, setContractorMonths] = useState<number[]>(() => {
    if (project.monthly && project.monthly.length >= 12) {
      return project.monthly.slice(0, 12).map(m => typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0));
    }
    return distributeTotalTo12Months(plan.contractor.efy || 6.5, 'even');
  });

  const [eraMonths, setEraMonths] = useState<number[]>(() => {
    if (project.monthly && project.monthly.length >= 12) {
      return project.monthly.slice(0, 12).map(m => typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : 0));
    }
    return distributeTotalTo12Months(plan.era.efy || 5.0, 'even');
  });

  const [availableEfyYears, setAvailableEfyYears] = useState<string[]>([
    '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012'
  ]);
  const [planningEfyYear, setPlanningEfyYear] = useState<string>(labels.efyLabel || '2019');
  const [isAnnualEfyTableOpen, setIsAnnualEfyTableOpen] = useState<boolean>(true);
  const [isAddEfyModalOpen, setIsAddEfyModalOpen] = useState<boolean>(false);
  const [isViewRecordedEfyModalOpen, setIsViewRecordedEfyModalOpen] = useState<boolean>(false);
  const [isDeleteEfyModalOpen, setIsDeleteEfyModalOpen] = useState<boolean>(false);
  const [customEfyInput, setCustomEfyInput] = useState<string>('');
  const [selectedQuarterView, setSelectedQuarterView] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');

  // Real-time Sum calculations for Quarterly & EFY from Monthly Plans
  const contractorSums = useMemo(() => calculateQuarterlyAndEfyFromMonths(contractorMonths), [contractorMonths]);
  const eraSums = useMemo(() => calculateQuarterlyAndEfyFromMonths(eraMonths), [eraMonths]);

  const handleSwitchPlanningEfyYear = (targetYear: string) => {
    const cleaned = targetYear.trim().replace(/^EFY\s*/i, '');
    if (!cleaned) return;
    setPlanningEfyYear(cleaned);

    // Look up historical baseline plan for this target year
    const historyMatch = (project.progressPlanHistory || []).find(
      h => (h.efyLabel || '').trim() === cleaned || (h.monthLabel || '').includes(`EFY ${cleaned}`)
    );
    const numericYear = parseInt(cleaned, 10);
    const annualMatch = !isNaN(numericYear) ? (project.annual || []).find(a => a.year === numericYear) : undefined;

    if (historyMatch) {
      const cEfy = Number(historyMatch.contractorEfy || 0);
      const eEfy = Number(historyMatch.eraEfy || 0);
      setContractorMonths(distributeTotalTo12Months(cEfy, 'even'));
      setEraMonths(distributeTotalTo12Months(eEfy, 'even'));
      showToast(`Loaded historical baseline figures for EFY ${cleaned}`);
    } else if (annualMatch) {
      const eEfy = Number(annualMatch.km || annualMatch.amount || 0);
      const cEfy = Number((eEfy * 1.1).toFixed(2));
      setContractorMonths(distributeTotalTo12Months(cEfy, 'even'));
      setEraMonths(distributeTotalTo12Months(eEfy, 'even'));
      showToast(`Loaded annual plan target of ${eEfy.toFixed(2)} Km for EFY ${cleaned}`);
    } else if ((labels.efyLabel || '').trim() === cleaned && (plan.contractor.efy > 0 || plan.era.efy > 0)) {
      if (project.monthly && project.monthly.length >= 12) {
        setContractorMonths(project.monthly.slice(0, 12).map(m => typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0)));
        setEraMonths(project.monthly.slice(0, 12).map(m => typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : 0)));
      } else {
        setContractorMonths(distributeTotalTo12Months(plan.contractor.efy || 0, 'even'));
        setEraMonths(distributeTotalTo12Months(plan.era.efy || 0, 'even'));
      }
    } else {
      setContractorMonths(Array(12).fill(0));
      setEraMonths(Array(12).fill(0));
      showToast(`EFY ${cleaned} baseline plan is empty / unrecorded. Enter values to configure.`);
    }
  };

  const handleAddNewEfyYear = (newYear: string) => {
    const cleaned = newYear.trim().replace(/^EFY\s*/i, '');
    if (!cleaned) return;
    if (!availableEfyYears.includes(cleaned)) {
      const updatedList = Array.from(new Set([cleaned, ...availableEfyYears])).sort((a, b) => {
        const numA = parseInt(a, 10) || 0;
        const numB = parseInt(b, 10) || 0;
        return numB - numA;
      });
      setAvailableEfyYears(updatedList);
    }
    handleSwitchPlanningEfyYear(cleaned);
    setIsAddEfyModalOpen(false);
    setCustomEfyInput('');
    showToast(`Added EFY ${cleaned} baseline planning configuration!`);
  };

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

    if (project.monthly && project.monthly.length >= 12) {
      setContractorMonths(project.monthly.slice(0, 12).map(m => typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0)));
      setEraMonths(project.monthly.slice(0, 12).map(m => typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : 0)));
    } else {
      setContractorMonths(distributeTotalTo12Months(freshPlan.contractor.efy || 6.5, 'even'));
      setEraMonths(distributeTotalTo12Months(freshPlan.era.efy || 5.0, 'even'));
    }
    setPlanningEfyYear(freshLabels.efyLabel || '2019');
  }, [project.id]);

  // Monthly Edit handlers for whole fiscal year planning
  const handleContractorMonthChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...contractorMonths];
    updated[idx] = isNaN(num) ? 0 : Math.max(0, num);
    setContractorMonths(updated);
  };

  const handleEraMonthChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...eraMonths];
    updated[idx] = isNaN(num) ? 0 : Math.max(0, num);
    setEraMonths(updated);
  };

  const handleApplyPreset = (tier: 'all' | 'contractor' | 'era', preset: 'even' | 'dry_season' | 'scurve') => {
    const cTotal = contractorSums.efy || plan.contractor.efy || 6.5;
    const eTotal = eraSums.efy || plan.era.efy || 5.0;

    if (tier === 'all' || tier === 'contractor') {
      setContractorMonths(distributeTotalTo12Months(cTotal, preset));
    }
    if (tier === 'all' || tier === 'era') {
      setEraMonths(distributeTotalTo12Months(eTotal, preset));
    }
    const presetName = preset === 'dry_season' ? '☀️ Dry Season Weighted' : preset === 'scurve' ? '📈 S-Curve Gradual' : '⚖️ Equal Monthly';
    showToast(`Applied ${presetName} breakdown across all 12 months. Quarterly & EFY sums recalculated!`);
  };

  const handleCopyContractorToEra = () => {
    setEraMonths([...contractorMonths]);
    showToast('Copied Contractor monthly plan to ERA Approved Milestone plan.');
  };

  const handleSaveAndApplyEfyPlan = () => {
    const targetEfyStr = planningEfyYear.trim() || labels.efyLabel || '2019';
    const numericYear = parseInt(targetEfyStr, 10);
    const isActiveEfy = (labels.efyLabel || '').trim() === targetEfyStr;

    const updatedPlan: ProgressPlan = {
      contractor: {
        ...plan.contractor,
        month: isActiveEfy ? (contractorMonths[1] || contractorMonths[0] || plan.contractor.month) : plan.contractor.month,
        quarter: isActiveEfy ? contractorSums.q1 : plan.contractor.quarter,
        efy: isActiveEfy ? contractorSums.efy : plan.contractor.efy
      },
      era: {
        ...plan.era,
        month: isActiveEfy ? (eraMonths[1] || eraMonths[0] || plan.era.month) : plan.era.month,
        quarter: isActiveEfy ? eraSums.q1 : plan.era.quarter,
        efy: isActiveEfy ? eraSums.efy : plan.era.efy
      },
      actual: {
        ...plan.actual
      }
    };

    const updatedLabels = {
      ...labels,
      efyLabel: isActiveEfy ? targetEfyStr : labels.efyLabel
    };

    const historyItem: ProgressPlanHistoryItem = {
      id: `efy_${targetEfyStr}_plan_${project.id}`,
      monthLabel: `EFY ${targetEfyStr} Baseline Plan`,
      quarterLabel: `Q1-Q4 (EFY ${targetEfyStr})`,
      efyLabel: targetEfyStr,
      contractorMonth: contractorMonths[0] || 0,
      contractorQuarter: contractorSums.q1 || 0,
      contractorEfy: contractorSums.efy || 0,
      eraMonth: eraMonths[0] || 0,
      eraQuarter: eraSums.q1 || 0,
      eraEfy: eraSums.efy || 0,
      actualMonth: 0,
      actualQuarter: 0,
      actualEfy: 0,
      actualTodate: 0,
      contractorTodate: 0,
      eraTodate: 0,
      physicalProgress: 0
    };

    const existingHistory = project.progressPlanHistory || [];
    const filteredHistory = existingHistory.filter(h => h.id !== historyItem.id && h.monthLabel !== historyItem.monthLabel);
    const updatedHistory = sortProgressPlanHistoryDescending([historyItem, ...filteredHistory]);

    let updatedAnnual = [...(project.annual || [])];
    if (!isNaN(numericYear)) {
      const existsIdx = updatedAnnual.findIndex(a => a.year === numericYear);
      const annualEntry = {
        year: numericYear,
        amount: eraSums.efy || contractorSums.efy || 0,
        km: eraSums.efy || contractorSums.efy || 0,
        percent: project.lengthKm > 0 ? Number(((eraSums.efy / project.lengthKm) * 100).toFixed(2)) : 0
      };
      if (existsIdx >= 0) {
        updatedAnnual[existsIdx] = { ...updatedAnnual[existsIdx], ...annualEntry };
      } else {
        updatedAnnual.push(annualEntry);
      }
      updatedAnnual.sort((a, b) => b.year - a.year);
    }

    const updatedMonthly = (project.monthly || []).map((m, idx) => {
      if (isActiveEfy && idx < 12) {
        return {
          ...m,
          revisedPlan: contractorMonths[idx] !== undefined ? contractorMonths[idx] : m.revisedPlan,
          originalPlan: eraMonths[idx] !== undefined ? eraMonths[idx] : m.originalPlan
        };
      }
      return m;
    });

    if (onProjectUpdate) {
      onProjectUpdate({
        progressPlan: isActiveEfy ? updatedPlan : project.progressPlan,
        progressPlanLabels: isActiveEfy ? updatedLabels : project.progressPlanLabels,
        progressPlanHistory: updatedHistory,
        annual: updatedAnnual,
        monthly: updatedMonthly.length >= 12 ? updatedMonthly : project.monthly
      }, `Updated EFY ${targetEfyStr} Whole Fiscal Year Baseline Plan (Contractor: ${contractorSums.efy.toFixed(2)} Km, ERA: ${eraSums.efy.toFixed(2)} Km)`);
    }

    if (isActiveEfy) {
      onUpdateProgressPlan(updatedPlan, updatedLabels);
    }
    showToast(`Successfully saved EFY ${targetEfyStr} baseline plan! Contractor: ${contractorSums.efy.toFixed(2)} Km • ERA: ${eraSums.efy.toFixed(2)} Km`);
  };

  const handleDeleteRecordedEfyPlan = () => {
    const targetEfyStr = planningEfyYear.trim() || '2019';
    const numericYear = parseInt(targetEfyStr, 10);
    const isActiveEfy = (labels.efyLabel || '').trim() === targetEfyStr;

    // Reset current active monthly inputs
    setContractorMonths(Array(12).fill(0));
    setEraMonths(Array(12).fill(0));

    // Filter out from history
    const existingHistory = project.progressPlanHistory || [];
    const updatedHistory = existingHistory.filter(
      h => h.id !== `efy_${targetEfyStr}_plan_${project.id}` &&
           (h.efyLabel || '').trim() !== targetEfyStr &&
           h.monthLabel !== `EFY ${targetEfyStr} Baseline Plan`
    );

    // Filter out from annual
    const updatedAnnual = (project.annual || []).filter(a => a.year !== numericYear);

    // Reset active targets if deleting current active year
    const updatedPlan: ProgressPlan = {
      contractor: {
        ...plan.contractor,
        efy: isActiveEfy ? 0 : plan.contractor.efy
      },
      era: {
        ...plan.era,
        efy: isActiveEfy ? 0 : plan.era.efy
      },
      actual: plan.actual
    };

    if (onProjectUpdate) {
      onProjectUpdate({
        progressPlan: isActiveEfy ? updatedPlan : project.progressPlan,
        progressPlanHistory: updatedHistory,
        annual: updatedAnnual
      }, `Deleted recorded EFY ${targetEfyStr} baseline plan for ${project.name}`);
    }

    if (isActiveEfy) {
      onUpdateProgressPlan(updatedPlan, labels);
    }

    setIsDeleteEfyModalOpen(false);
    showToast(`🗑️ Deleted recorded EFY ${targetEfyStr} baseline plan for ${project.name}`);
  };

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

    const targetMonthLower = (newMonthLabel.trim() || labels.monthLabel).toLowerCase();
    const duplicateExists = historyList.some(
      item => item.id !== activeLoadedRecordId && item.monthLabel.trim().toLowerCase() === targetMonthLower
    );

    if (duplicateExists) {
      showToast(`Cannot update: A record for "${newMonthLabel.trim() || labels.monthLabel}" already exists in the system!`, 'info');
      return;
    }

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

    const updatedHistory = sortProgressPlanHistoryDescending(
      historyList.map(item => item.id === activeLoadedRecordId ? updatedItem : item)
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

    // Filter out any duplicate month to guarantee no duplication in the system
    const targetMonthLower = newItem.monthLabel.trim().toLowerCase();
    const duplicateExists = historyList.some(item => item.monthLabel.trim().toLowerCase() === targetMonthLower);

    const filteredHistory = historyList.filter(
      item => item.monthLabel.trim().toLowerCase() !== targetMonthLower
    );

    const updatedHistory = sortProgressPlanHistoryDescending([newItem, ...filteredHistory]);

    if (onProjectUpdate) {
      onProjectUpdate({ progressPlanHistory: updatedHistory }, `Archived milestone record for ${newItem.monthLabel} (EFY ${newItem.efyLabel})`);
    }
    
    if (duplicateExists) {
      showToast(`Overwrote existing record for ${newItem.monthLabel} to prevent duplication!`);
    } else {
      showToast(`Archived milestone snapshot for ${newItem.monthLabel} (EFY ${newItem.efyLabel})`);
    }
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
    const targetMonthLower = (edited.monthLabel || '').trim().toLowerCase();
    const duplicateExists = historyList.some(
      item => item.id !== edited.id && item.monthLabel.trim().toLowerCase() === targetMonthLower
    );

    if (duplicateExists) {
      showToast(`Cannot save edit: A record for "${edited.monthLabel.trim()}" already exists in the archive!`, 'info');
      return;
    }

    const actualKm = edited.actualTodate !== undefined ? edited.actualTodate : edited.actualMonth;
    const computedPhysProgress = project.lengthKm > 0 
      ? Number(((actualKm / project.lengthKm) * 100).toFixed(2))
      : (typeof edited.physicalProgress === 'number' ? edited.physicalProgress : 0);

    const finalizedItem: ProgressPlanHistoryItem = {
      ...edited,
      physicalProgress: computedPhysProgress,
    };

    const updatedHistory = sortProgressPlanHistoryDescending(
      historyList.map(item => item.id === finalizedItem.id ? finalizedItem : item)
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
    <div id="progressComparisonContainer" className="space-y-4">
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
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.contractor.month}
                    onChange={(e) => handleFieldChange('contractor', 'month', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.contractor.quarter}
                    onChange={(e) => handleFieldChange('contractor', 'quarter', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.contractor.efy}
                    onChange={(e) => handleFieldChange('contractor', 'efy', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.contractor.todate}
                    onChange={(e) => handleFieldChange('contractor', 'todate', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                    normalBorderClass="bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
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
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.era.month}
                    onChange={(e) => handleFieldChange('era', 'month', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-slate-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.era.quarter}
                    onChange={(e) => handleFieldChange('era', 'quarter', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-slate-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.era.efy}
                    onChange={(e) => handleFieldChange('era', 'efy', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition"
                    normalBorderClass="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-slate-500"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.era.todate}
                    onChange={(e) => handleFieldChange('era', 'todate', e.target.value)}
                    project={project}
                    tooltipPosition="bottom"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold focus:ring-1 focus:ring-slate-500 outline-none"
                    normalBorderClass="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
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
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.actual.month}
                    onChange={(e) => handleFieldChange('actual', 'month', e.target.value)}
                    project={project}
                    tooltipPosition="top"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-bold outline-none transition"
                    normalBorderClass="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.actual.quarter}
                    onChange={(e) => handleFieldChange('actual', 'quarter', e.target.value)}
                    project={project}
                    tooltipPosition="top"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-bold outline-none transition"
                    normalBorderClass="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </td>
                <td className="p-3 text-center">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.actual.efy}
                    onChange={(e) => handleFieldChange('actual', 'efy', e.target.value)}
                    project={project}
                    tooltipPosition="top"
                    baseClassName="w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-bold outline-none transition"
                    normalBorderClass="bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                  <ValidatedEfyInput
                    type="number"
                    step="0.01"
                    value={plan.actual.todate}
                    onChange={(e) => handleFieldChange('actual', 'todate', e.target.value)}
                    project={project}
                    tooltipPosition="top"
                    baseClassName="w-24 border border-dashed rounded-lg text-center text-emerald-600 dark:text-emerald-400 font-black py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none shadow-2xs transition"
                    normalBorderClass="bg-white dark:bg-slate-800 border-emerald-500 dark:border-emerald-400"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 📅 EFY Annual Baseline Planning Matrix & 12-Month Breakdown (Contractor & ERA) */}
      <div className="bg-white dark:bg-slate-800 border-2 border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl overflow-hidden shadow-md">
        {/* Header & Control Bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 p-4 sm:p-5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600/80 rounded-xl border border-indigo-400/40 shadow-inner">
              <CalendarRange className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                  EFY {planningEfyYear} Annual Baseline Plan (ERA & Contractor)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Whole Fiscal Year Setup (M1 - M12)
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80 mt-0.5 leading-relaxed">
                Add and edit monthly target allocations at the beginning of the fiscal year. <strong>Quarterly (Q1-Q4) and Total EFY sums are calculated automatically in real time from the 12 monthly inputs.</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* EFY Year Selector & Quick Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-indigo-400/30 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-300">EFY Year:</span>
              <select
                value={planningEfyYear}
                onChange={(e) => handleSwitchPlanningEfyYear(e.target.value)}
                className="bg-transparent font-mono font-bold text-white outline-none cursor-pointer"
              >
                {availableEfyYears.map(yr => {
                  const num = parseInt(yr, 10);
                  const gregorian = !isNaN(num) ? `(${num + 7}/${num + 8})` : '';
                  return (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      EFY {yr} {gregorian}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Add Previous / Custom EFY Year Button */}
            <button
              type="button"
              onClick={() => setIsAddEfyModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="Add previous fiscal year baseline plan"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>+ Add Previous EFY</span>
            </button>

            {/* Show Recorded EFY Plans Button */}
            <button
              type="button"
              onClick={() => setIsViewRecordedEfyModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="Show recorded EFY baseline plans for this project"
            >
              <Eye className="w-3.5 h-3.5 text-purple-300" />
              <span>Show Recorded EFY</span>
            </button>

            {/* Delete Recorded EFY Plan Button */}
            <button
              type="button"
              onClick={() => setIsDeleteEfyModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title={`Delete recorded EFY ${planningEfyYear} baseline plan for ${project.name}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              <span>Delete Recorded EFY</span>
            </button>

            {/* Save & Apply Button */}
            <button
              onClick={handleSaveAndApplyEfyPlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md active:scale-98 cursor-pointer"
              title="Save whole fiscal year plan & synchronize with active project tracking"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save EFY Plan to Project</span>
            </button>

            {/* Expand / Collapse Button */}
            <button
              onClick={() => setIsAnnualEfyTableOpen(!isAnnualEfyTableOpen)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-indigo-400/30 text-indigo-200 transition cursor-pointer"
              title={isAnnualEfyTableOpen ? 'Collapse EFY Table' : 'Expand EFY Table'}
            >
              {isAnnualEfyTableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Modal for Showing Recorded EFY Baseline Plans for this project */}
        {isViewRecordedEfyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-fadeIn max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Recorded EFY Baseline Plans
                    </h3>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {project.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewRecordedEfyModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Table of recorded EFY plans for this project */}
              <div className="overflow-auto flex-1 border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                      <th className="p-2.5">Fiscal Year (EFY)</th>
                      <th className="p-2.5 text-center">Contractor Plan (Km)</th>
                      <th className="p-2.5 text-center">ERA Approved (Km)</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {availableEfyYears.map((yr) => {
                      const historyMatch = (project.progressPlanHistory || []).find(
                        h => (h.efyLabel || '').trim() === yr.trim() || (h.monthLabel || '').includes(`EFY ${yr}`)
                      );
                      const numericYr = parseInt(yr, 10);
                      const annualMatch = !isNaN(numericYr) ? (project.annual || []).find(a => a.year === numericYr) : undefined;
                      const hasRecord = !!historyMatch || !!annualMatch || (planningEfyYear === yr && (contractorSums.efy > 0 || eraSums.efy > 0));

                      const cEfyVal = historyMatch?.contractorEfy || (planningEfyYear === yr ? contractorSums.efy : 0);
                      const eEfyVal = historyMatch?.eraEfy || annualMatch?.km || (planningEfyYear === yr ? eraSums.efy : 0);

                      return (
                        <tr key={`rec_p_${yr}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">
                            EFY {yr} {yr === planningEfyYear ? '(Active Selected)' : ''}
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-blue-700 dark:text-blue-300">
                            {Number(cEfyVal).toFixed(2)} Km
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-purple-700 dark:text-purple-300">
                            {Number(eEfyVal).toFixed(2)} Km
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSwitchPlanningEfyYear(yr);
                                  setIsViewRecordedEfyModalOpen(false);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] transition cursor-pointer flex items-center gap-1"
                                title="Load this EFY baseline into matrix to edit"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Load & Edit</span>
                              </button>
                              {hasRecord && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSwitchPlanningEfyYear(yr);
                                    setIsViewRecordedEfyModalOpen(false);
                                    setIsDeleteEfyModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-300/40 font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                                  title="Delete recorded baseline for this year"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-500" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-700 pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsViewRecordedEfyModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Deleting Recorded EFY Plan for this project */}
        {isDeleteEfyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Delete Recorded EFY {planningEfyYear} Plan?
                  </h3>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {project.name}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to delete the recorded EFY {planningEfyYear} baseline plan for this project?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteEfyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecordedEfyPlan}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Recorded Plan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for adding Previous / Custom EFY Year */}
        {isAddEfyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Add Previous / Custom EFY Baseline Plan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddEfyModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Select a previous Ethiopian Fiscal Year (EFY) or type any custom fiscal year to add and calibrate its annual progress baseline targets and monthly schedules in the system.
              </p>

              {/* Quick Previous Years Pick */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Quick Select Previous Fiscal Year:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleAddNewEfyYear(yr)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        planningEfyYear === yr
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      EFY {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom EFY Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Or Enter Custom Fiscal Year Number:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEfyInput}
                    onChange={(e) => setCustomEfyInput(e.target.value)}
                    placeholder="e.g. 2010 or 2015"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNewEfyYear(customEfyInput)}
                    disabled={!customEfyInput.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black transition cursor-pointer"
                  >
                    Add Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAnnualEfyTableOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Quick KPI & Preset Distribution Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              {/* Calculated KPI Badges */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Contractor EFY Sum:</span>
                  <span className="font-mono font-black text-blue-700 dark:text-blue-300">{contractorSums.efy.toFixed(2)} Km</span>
                  {project.lengthKm > 0 && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      ({((contractorSums.efy / project.lengthKm) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">ERA Approved EFY Sum:</span>
                  <span className="font-mono font-black text-purple-700 dark:text-purple-300">{eraSums.efy.toFixed(2)} Km</span>
                  {project.lengthKm > 0 && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      ({((eraSums.efy / project.lengthKm) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Variance:</span>
                  <span className={`font-mono font-extrabold ${contractorSums.efy >= eraSums.efy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {(contractorSums.efy - eraSums.efy) >= 0 ? '+' : ''}{(contractorSums.efy - eraSums.efy).toFixed(2)} Km
                  </span>
                </div>
              </div>

              {/* Presets & Helper Tools */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-indigo-500" />
                  Distribution Presets:
                </span>
                <button
                  onClick={() => handleApplyPreset('all', 'even')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
                  title="Distribute EFY total evenly (1/12 per month)"
                >
                  ⚖️ Equal
                </button>
                <button
                  onClick={() => handleApplyPreset('all', 'dry_season')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
                  title="Heavy distribution in dry season (Oct - May)"
                >
                  ☀️ Dry Season
                </button>
                <button
                  onClick={() => handleApplyPreset('all', 'scurve')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
                  title="Gradual S-Curve distribution"
                >
                  📈 S-Curve
                </button>
                <button
                  onClick={handleCopyContractorToEra}
                  className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Copy Contractor monthly schedule to ERA approved milestone plan"
                >
                  <Copy className="w-3 h-3" />
                  Copy Ctr → ERA
                </button>
              </div>
            </div>

            {/* Quarter Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit text-xs font-bold">
              <button
                onClick={() => setSelectedQuarterView('all')}
                className={`px-3 py-1 rounded-lg transition ${selectedQuarterView === 'all' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                All 12 Months
              </button>
              <button
                onClick={() => setSelectedQuarterView('Q1')}
                className={`px-3 py-1 rounded-lg transition ${selectedQuarterView === 'Q1' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Q1 (Jul - Sep)
              </button>
              <button
                onClick={() => setSelectedQuarterView('Q2')}
                className={`px-3 py-1 rounded-lg transition ${selectedQuarterView === 'Q2' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Q2 (Oct - Dec)
              </button>
              <button
                onClick={() => setSelectedQuarterView('Q3')}
                className={`px-3 py-1 rounded-lg transition ${selectedQuarterView === 'Q3' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Q3 (Jan - Mar)
              </button>
              <button
                onClick={() => setSelectedQuarterView('Q4')}
                className={`px-3 py-1 rounded-lg transition ${selectedQuarterView === 'Q4' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Q4 (Apr - Jun)
              </button>
            </div>

            {/* The Core 12-Month & Quarterly Interactive Planning Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {/* Top Tier Grouping: Quarters Header */}
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-2.5 min-w-[200px] sticky left-0 bg-slate-100 dark:bg-slate-900 z-10">
                      Stakeholder Plan Tier
                    </th>

                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q1') && (
                      <th colSpan={4} className="p-2 text-center bg-blue-100/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-l border-r border-blue-200 dark:border-blue-800/60">
                        Quarter 1 (Jul - Sep)
                      </th>
                    )}

                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q2') && (
                      <th colSpan={4} className="p-2 text-center bg-cyan-100/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 border-r border-cyan-200 dark:border-cyan-800/60">
                        Quarter 2 (Oct - Dec)
                      </th>
                    )}

                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q3') && (
                      <th colSpan={4} className="p-2 text-center bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-r border-indigo-200 dark:border-indigo-800/60">
                        Quarter 3 (Jan - Mar)
                      </th>
                    )}

                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q4') && (
                      <th colSpan={4} className="p-2 text-center bg-purple-100/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-r border-purple-200 dark:border-purple-800/60">
                        Quarter 4 (Apr - Jun)
                      </th>
                    )}

                    <th className="p-2 text-center bg-emerald-100/60 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-black min-w-[130px]">
                      EFY {planningEfyYear} Total
                    </th>
                    <th className="p-2 text-center bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 min-w-[90px]">
                      % of Scope
                    </th>
                  </tr>

                  {/* Individual Month Sub-Headers */}
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-400 text-center">
                    <th className="p-2 text-left sticky left-0 bg-slate-50 dark:bg-slate-850 z-10">
                      Editable Monthly Breakdown (Km)
                    </th>

                    {/* Q1 Months */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q1') && (
                      <>
                        <th className="p-2 min-w-[75px] bg-blue-50/40 dark:bg-blue-950/20">M1 (Jul)</th>
                        <th className="p-2 min-w-[75px] bg-blue-50/40 dark:bg-blue-950/20">M2 (Aug)</th>
                        <th className="p-2 min-w-[75px] bg-blue-50/40 dark:bg-blue-950/20">M3 (Sep)</th>
                        <th className="p-2 min-w-[90px] font-black bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 border-r border-blue-200 dark:border-blue-800">
                          Q1 Sum (Km)
                        </th>
                      </>
                    )}

                    {/* Q2 Months */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q2') && (
                      <>
                        <th className="p-2 min-w-[75px] bg-cyan-50/40 dark:bg-cyan-950/20">M4 (Oct)</th>
                        <th className="p-2 min-w-[75px] bg-cyan-50/40 dark:bg-cyan-950/20">M5 (Nov)</th>
                        <th className="p-2 min-w-[75px] bg-cyan-50/40 dark:bg-cyan-950/20">M6 (Dec)</th>
                        <th className="p-2 min-w-[90px] font-black bg-cyan-100/80 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-200 border-r border-cyan-200 dark:border-cyan-800">
                          Q2 Sum (Km)
                        </th>
                      </>
                    )}

                    {/* Q3 Months */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q3') && (
                      <>
                        <th className="p-2 min-w-[75px] bg-indigo-50/40 dark:bg-indigo-950/20">M7 (Jan)</th>
                        <th className="p-2 min-w-[75px] bg-indigo-50/40 dark:bg-indigo-950/20">M8 (Feb)</th>
                        <th className="p-2 min-w-[75px] bg-indigo-50/40 dark:bg-indigo-950/20">M9 (Mar)</th>
                        <th className="p-2 min-w-[90px] font-black bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 border-r border-indigo-200 dark:border-indigo-800">
                          Q3 Sum (Km)
                        </th>
                      </>
                    )}

                    {/* Q4 Months */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q4') && (
                      <>
                        <th className="p-2 min-w-[75px] bg-purple-50/40 dark:bg-purple-950/20">M10 (Apr)</th>
                        <th className="p-2 min-w-[75px] bg-purple-50/40 dark:bg-purple-950/20">M11 (May)</th>
                        <th className="p-2 min-w-[75px] bg-purple-50/40 dark:bg-purple-950/20">M12 (Jun)</th>
                        <th className="p-2 min-w-[90px] font-black bg-purple-100/80 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border-r border-purple-200 dark:border-purple-800">
                          Q4 Sum (Km)
                        </th>
                      </>
                    )}

                    <th className="p-2 font-black bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                      Calculated EFY
                    </th>
                    <th className="p-2 font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Contract %
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-200">
                  {/* Row 1: Contractor Program Plan */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="p-2.5 font-bold flex items-center gap-1.5 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm shrink-0" />
                      <div>
                        <span className="block text-blue-900 dark:text-blue-300 font-bold">Contractor Program Plan</span>
                        <span className="text-[10px] text-slate-400 font-normal">Monthly Targets (Km)</span>
                      </div>
                    </td>

                    {/* Q1 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q1') && (
                      <>
                        <td className="p-1.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[0] ?? 0}
                            onChange={(e) => handleContractorMonthChange(0, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-blue-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[1] ?? 0}
                            onChange={(e) => handleContractorMonthChange(1, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-blue-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[2] ?? 0}
                            onChange={(e) => handleContractorMonthChange(2, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30 border-r border-blue-200 dark:border-blue-800">
                          <span className="block">{contractorSums.q1.toFixed(2)}</span>
                          <span className="text-[9px] text-blue-500 font-normal">
                            {project.lengthKm > 0 ? `${((contractorSums.q1 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q2 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q2') && (
                      <>
                        <td className="p-1.5 text-center bg-cyan-50/20 dark:bg-cyan-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[3] ?? 0}
                            onChange={(e) => handleContractorMonthChange(3, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-cyan-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-cyan-50/20 dark:bg-cyan-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[4] ?? 0}
                            onChange={(e) => handleContractorMonthChange(4, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-cyan-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-cyan-50/20 dark:bg-cyan-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[5] ?? 0}
                            onChange={(e) => handleContractorMonthChange(5, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-cyan-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-cyan-700 dark:text-cyan-300 bg-cyan-100/50 dark:bg-cyan-900/30 border-r border-cyan-200 dark:border-cyan-800">
                          <span className="block">{contractorSums.q2.toFixed(2)}</span>
                          <span className="text-[9px] text-cyan-500 font-normal">
                            {project.lengthKm > 0 ? `${((contractorSums.q2 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q3 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q3') && (
                      <>
                        <td className="p-1.5 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[6] ?? 0}
                            onChange={(e) => handleContractorMonthChange(6, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[7] ?? 0}
                            onChange={(e) => handleContractorMonthChange(7, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[8] ?? 0}
                            onChange={(e) => handleContractorMonthChange(8, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/30 border-r border-indigo-200 dark:border-indigo-800">
                          <span className="block">{contractorSums.q3.toFixed(2)}</span>
                          <span className="text-[9px] text-indigo-500 font-normal">
                            {project.lengthKm > 0 ? `${((contractorSums.q3 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q4 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q4') && (
                      <>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[9] ?? 0}
                            onChange={(e) => handleContractorMonthChange(9, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[10] ?? 0}
                            onChange={(e) => handleContractorMonthChange(10, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={contractorMonths[11] ?? 0}
                            onChange={(e) => handleContractorMonthChange(11, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 border-r border-purple-200 dark:border-purple-800">
                          <span className="block">{contractorSums.q4.toFixed(2)}</span>
                          <span className="text-[9px] text-purple-500 font-normal">
                            {project.lengthKm > 0 ? `${((contractorSums.q4 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* EFY Total Calculated Sum */}
                    <td className={`p-2 text-center font-mono font-black text-sm relative group ${
                      validateEfyPlanValue(contractorSums.efy, project).isExceeded
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                        : 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{contractorSums.efy.toFixed(2)} Km</span>
                        {validateEfyPlanValue(contractorSums.efy, project).isExceeded && (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                            <div role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none w-max max-w-[220px]">
                              <div className="bg-red-600 text-white text-[9.5px] font-bold px-2 py-1 rounded shadow-lg border border-red-400">
                                <span>{validateEfyPlanValue(contractorSums.efy, project).message}</span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-red-600 rotate-45 -mt-0.5" />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850">
                      {project.lengthKm > 0 ? `${((contractorSums.efy / project.lengthKm) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>

                  {/* Row 2: ERA Approved Milestone Plan */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="p-2.5 font-bold flex items-center gap-1.5 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                      <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm shrink-0" />
                      <div>
                        <span className="block text-purple-900 dark:text-purple-300 font-bold">ERA Approved Milestone Plan</span>
                        <span className="text-[10px] text-slate-400 font-normal">Approved Milestones (Km)</span>
                      </div>
                    </td>

                    {/* Q1 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q1') && (
                      <>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[0] ?? 0}
                            onChange={(e) => handleEraMonthChange(0, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[1] ?? 0}
                            onChange={(e) => handleEraMonthChange(1, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[2] ?? 0}
                            onChange={(e) => handleEraMonthChange(2, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 border-r border-purple-200 dark:border-purple-800">
                          <span className="block">{eraSums.q1.toFixed(2)}</span>
                          <span className="text-[9px] text-purple-500 font-normal">
                            {project.lengthKm > 0 ? `${((eraSums.q1 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q2 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q2') && (
                      <>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[3] ?? 0}
                            onChange={(e) => handleEraMonthChange(3, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[4] ?? 0}
                            onChange={(e) => handleEraMonthChange(4, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[5] ?? 0}
                            onChange={(e) => handleEraMonthChange(5, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 border-r border-purple-200 dark:border-purple-800">
                          <span className="block">{eraSums.q2.toFixed(2)}</span>
                          <span className="text-[9px] text-purple-500 font-normal">
                            {project.lengthKm > 0 ? `${((eraSums.q2 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q3 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q3') && (
                      <>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[6] ?? 0}
                            onChange={(e) => handleEraMonthChange(6, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[7] ?? 0}
                            onChange={(e) => handleEraMonthChange(7, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[8] ?? 0}
                            onChange={(e) => handleEraMonthChange(8, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 border-r border-purple-200 dark:border-purple-800">
                          <span className="block">{eraSums.q3.toFixed(2)}</span>
                          <span className="text-[9px] text-purple-500 font-normal">
                            {project.lengthKm > 0 ? `${((eraSums.q3 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Q4 Inputs */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q4') && (
                      <>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[9] ?? 0}
                            onChange={(e) => handleEraMonthChange(9, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[10] ?? 0}
                            onChange={(e) => handleEraMonthChange(10, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={eraMonths[11] ?? 0}
                            onChange={(e) => handleEraMonthChange(11, e.target.value)}
                            project={project}
                            baseClassName="w-16 bg-white dark:bg-slate-900 border rounded-lg text-center font-mono py-1 text-xs font-semibold outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-900/30 border-r border-purple-200 dark:border-purple-800">
                          <span className="block">{eraSums.q4.toFixed(2)}</span>
                          <span className="text-[9px] text-purple-500 font-normal">
                            {project.lengthKm > 0 ? `${((eraSums.q4 / project.lengthKm) * 100).toFixed(1)}%` : ''}
                          </span>
                        </td>
                      </>
                    )}

                    {/* EFY Total Calculated Sum */}
                    <td className={`p-2 text-center font-mono font-black text-sm relative group ${
                      validateEfyPlanValue(eraSums.efy, project).isExceeded
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                        : 'bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{eraSums.efy.toFixed(2)} Km</span>
                        {validateEfyPlanValue(eraSums.efy, project).isExceeded && (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                            <div role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none w-max max-w-[220px]">
                              <div className="bg-red-600 text-white text-[9.5px] font-bold px-2 py-1 rounded shadow-lg border border-red-400">
                                <span>{validateEfyPlanValue(eraSums.efy, project).message}</span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-red-600 rotate-45 -mt-0.5" />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850">
                      {project.lengthKm > 0 ? `${((eraSums.efy / project.lengthKm) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>

                  {/* Row 3: Variance Row (Contractor - ERA) */}
                  <tr className="bg-slate-50/60 dark:bg-slate-900/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <td className="p-2 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700 text-slate-500 font-medium">
                      Monthly Alignment Variance
                    </td>

                    {/* Q1 Variance */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q1') && (
                      <>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[0] || 0) - (eraMonths[0] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[1] || 0) - (eraMonths[1] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[2] || 0) - (eraMonths[2] || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                          {(contractorSums.q1 - eraSums.q1).toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* Q2 Variance */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q2') && (
                      <>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[3] || 0) - (eraMonths[3] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[4] || 0) - (eraMonths[4] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[5] || 0) - (eraMonths[5] || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                          {(contractorSums.q2 - eraSums.q2).toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* Q3 Variance */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q3') && (
                      <>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[6] || 0) - (eraMonths[6] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[7] || 0) - (eraMonths[7] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[8] || 0) - (eraMonths[8] || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                          {(contractorSums.q3 - eraSums.q3).toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* Q4 Variance */}
                    {(selectedQuarterView === 'all' || selectedQuarterView === 'Q4') && (
                      <>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[9] || 0) - (eraMonths[9] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[10] || 0) - (eraMonths[10] || 0)).toFixed(2)}
                        </td>
                        <td className="p-1.5 text-center font-mono text-[10px]">
                          {((contractorMonths[11] || 0) - (eraMonths[11] || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                          {(contractorSums.q4 - eraSums.q4).toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* Total Annual Variance */}
                    <td className="p-2 text-center font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800">
                      {(contractorSums.efy - eraSums.efy) >= 0 ? '+' : ''}{(contractorSums.efy - eraSums.efy).toFixed(2)} Km
                    </td>
                    <td className="p-2 text-center font-mono text-slate-400">
                      —
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quarterly Cards Breakdown Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
              {/* Q1 Card */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">Quarter 1</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono font-bold">
                    Jul - Sep
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-blue-800 dark:text-blue-300">
                    <span>Contractor Plan:</span>
                    <span className="font-bold">{contractorSums.q1.toFixed(2)} Km</span>
                  </div>
                  <div className="flex justify-between text-purple-800 dark:text-purple-300">
                    <span>ERA Approved:</span>
                    <span className="font-bold">{eraSums.q1.toFixed(2)} Km</span>
                  </div>
                </div>
              </div>

              {/* Q2 Card */}
              <div className="p-3.5 bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-900 dark:text-cyan-200 text-xs">Quarter 2</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-200/60 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 font-mono font-bold">
                    Oct - Dec
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-blue-800 dark:text-blue-300">
                    <span>Contractor Plan:</span>
                    <span className="font-bold">{contractorSums.q2.toFixed(2)} Km</span>
                  </div>
                  <div className="flex justify-between text-purple-800 dark:text-purple-300">
                    <span>ERA Approved:</span>
                    <span className="font-bold">{eraSums.q2.toFixed(2)} Km</span>
                  </div>
                </div>
              </div>

              {/* Q3 Card */}
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs">Quarter 3</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-mono font-bold">
                    Jan - Mar
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-blue-800 dark:text-blue-300">
                    <span>Contractor Plan:</span>
                    <span className="font-bold">{contractorSums.q3.toFixed(2)} Km</span>
                  </div>
                  <div className="flex justify-between text-purple-800 dark:text-purple-300">
                    <span>ERA Approved:</span>
                    <span className="font-bold">{eraSums.q3.toFixed(2)} Km</span>
                  </div>
                </div>
              </div>

              {/* Q4 Card */}
              <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">Quarter 4</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-200/60 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono font-bold">
                    Apr - Jun
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-blue-800 dark:text-blue-300">
                    <span>Contractor Plan:</span>
                    <span className="font-bold">{contractorSums.q4.toFixed(2)} Km</span>
                  </div>
                  <div className="flex justify-between text-purple-800 dark:text-purple-300">
                    <span>ERA Approved:</span>
                    <span className="font-bold">{eraSums.q4.toFixed(2)} Km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-850 dark:text-zinc-150 block uppercase">
                    Elapsed Months & EFY Records List
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800/40">
                    <ArrowDownNarrowWide className="w-2.5 h-2.5" />
                    Descending by Month
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Click "Load" to restore and edit in table, or click "Edit" to modify any archived record directly.
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono font-extrabold shrink-0">
              {historyList.length} Archived
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-100 dark:border-slate-700/50 rounded-xl scroll-smooth">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-100 dark:border-slate-700/60">
                  <th className="p-3">
                    <div className="flex items-center gap-1">
                      <span>Period & EFY</span>
                      <span className="text-[8.5px] px-1 py-0.2 rounded font-sans font-extrabold bg-blue-100/70 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                        ↓ Newest First
                      </span>
                    </div>
                  </th>
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
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorMonth: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorQuarter: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorEfy: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.contractorTodate || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, contractorTodate: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border rounded-md text-center font-mono py-1 text-xs text-blue-600 dark:text-blue-400 font-bold outline-none transition"
                            normalBorderClass="border-blue-300 dark:border-blue-700"
                          />
                        </td>
                      </tr>

                      {/* ERA */}
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">ERA Milestone</td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraMonth: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraQuarter: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraEfy: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-slate-50 dark:bg-slate-900 border rounded-md text-center font-mono py-1 text-xs outline-none transition"
                            normalBorderClass="border-slate-200 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.eraTodate || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, eraTodate: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border rounded-md text-center font-mono py-1 text-xs text-slate-700 dark:text-slate-300 font-bold outline-none transition"
                            normalBorderClass="border-slate-300 dark:border-slate-700"
                          />
                        </td>
                      </tr>

                      {/* Actual */}
                      <tr className="bg-emerald-50/15 dark:bg-emerald-950/10">
                        <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">Actual Completed</td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualMonth: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold outline-none transition"
                            normalBorderClass="border-emerald-300 dark:border-emerald-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualQuarter || 0}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualQuarter: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold outline-none transition"
                            normalBorderClass="border-emerald-300 dark:border-emerald-700"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualEfy}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualEfy: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold outline-none transition"
                            normalBorderClass="border-emerald-300 dark:border-emerald-700"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-emerald-100/30 dark:bg-emerald-950/20">
                          <ValidatedEfyInput
                            type="number"
                            step="0.01"
                            value={editingModalItem.actualTodate !== undefined ? editingModalItem.actualTodate : editingModalItem.actualMonth}
                            onChange={(e) => setEditingModalItem({ ...editingModalItem, actualTodate: parseFloat(e.target.value) || 0 })}
                            project={project}
                            baseClassName="w-20 bg-white dark:bg-slate-800 border border-dashed rounded-md text-center font-mono py-1 text-xs text-emerald-600 dark:text-emerald-400 font-black outline-none transition"
                            normalBorderClass="border-emerald-500"
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

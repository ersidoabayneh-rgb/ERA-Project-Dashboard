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
  Archive,
  Lock,
  Unlock,
  ShieldAlert,
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
  AlertCircle,
  FileText,
  Printer,
  Link,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawEraLogo, drawUniversalSignatureBlock } from '../lib/pdfReportEngine';
import { 
  isProjectCommencedInEfy, 
  getStoredEfyYear, 
  setStoredEfyYear, 
  subscribeEfyYearChange 
} from '../lib/dateUtils';
import { Project, ProgressPlan, ProgressPlanHistoryItem, User } from '../types';
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
  onChange,
  onBlur,
  project,
  baseClassName = 'w-24 border rounded-lg text-center font-mono py-1.5 text-xs font-semibold outline-none transition',
  normalBorderClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500',
  tooltipPosition = 'top',
  containerClassName = '',
  className = '',
  disabled,
  ...rest
}: ValidatedEfyInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const validation = validateEfyPlanValue(localValue, project);

  return (
    <div className={`relative group inline-flex items-center justify-center ${containerClassName}`}>
      <input
        value={localValue}
        disabled={disabled}
        title={disabled ? "🔒 Saved baseline plan is locked. Master Admin or CPM Admin access is required to edit." : (validation.isExceeded ? validation.message : (rest.title || undefined))}
        aria-invalid={validation.isExceeded}
        data-invalid={validation.isExceeded ? "true" : undefined}
        className={`${baseClassName} ${
          disabled
            ? '!bg-slate-100 dark:!bg-slate-800/90 !text-slate-500 dark:!text-slate-400 !border-slate-300 dark:!border-slate-700/80 font-extrabold cursor-not-allowed opacity-90'
            : (validation.isExceeded
                ? '!border-red-500 !border-2 !ring-2 !ring-red-500/60 !bg-red-50/90 dark:!bg-red-950/50 !text-red-700 dark:!text-red-300 font-bold focus:!border-red-600 focus:!ring-red-600 shadow-xs'
                : normalBorderClass)
        } ${className}`}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          if (onChange) onChange(e);
          if (onBlur) onBlur(e);
        }}
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
  currentUserObj?: User | null;
  onUpdateProgressPlan: (plan: ProgressPlan, labels: { monthLabel: string; quarterLabel: string; efyLabel: string }) => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
}

export default function ProgressPlanView({ project, currentUserObj, onUpdateProgressPlan, onProjectUpdate }: ProgressPlanViewProps) {
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

  const [actualMonths, setActualMonths] = useState<number[]>(() => {
    if (project.monthly && project.monthly.length >= 12) {
      return project.monthly.slice(0, 12).map(m => typeof m.actual === 'number' ? m.actual : 0);
    }
    const arr = new Array(12).fill(0);
    arr[0] = plan.actual.month || 0.16;
    return arr;
  });

  const [availableEfyYears, setAvailableEfyYears] = useState<string[]>([
    '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012'
  ]);
  const [planningEfyYear, setPlanningEfyYear] = useState<string>(() => getStoredEfyYear(labels.efyLabel || '2019'));
  const [isAnnualEfyTableOpen, setIsAnnualEfyTableOpen] = useState<boolean>(true);
  const [isAddEfyModalOpen, setIsAddEfyModalOpen] = useState<boolean>(false);
  const [isViewRecordedEfyModalOpen, setIsViewRecordedEfyModalOpen] = useState<boolean>(false);
  const [isDeleteEfyModalOpen, setIsDeleteEfyModalOpen] = useState<boolean>(false);
  const [recordEfyOnArchive, setRecordEfyOnArchive] = useState<boolean>(true);
  const [customEfyInput, setCustomEfyInput] = useState<string>('');
  const [selectedQuarterView, setSelectedQuarterView] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');

  // Real-time synchronization: listen for EFY changes made on Group Report or other components
  useEffect(() => {
    const unsubscribe = subscribeEfyYearChange((newYear) => {
      if (newYear && newYear !== planningEfyYear) {
        setAvailableEfyYears(prev => {
          if (!prev.includes(newYear)) {
            return Array.from(new Set([newYear, ...prev])).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
          }
          return prev;
        });
        handleSwitchPlanningEfyYear(newYear, false);
      }
    });
    return unsubscribe;
  }, [planningEfyYear, project]);

  // Real-time Sum calculations for Quarterly & EFY from Monthly Plans
  const contractorSums = useMemo(() => calculateQuarterlyAndEfyFromMonths(contractorMonths), [contractorMonths]);
  const eraSums = useMemo(() => calculateQuarterlyAndEfyFromMonths(eraMonths), [eraMonths]);
  const actualSums = useMemo(() => calculateQuarterlyAndEfyFromMonths(actualMonths), [actualMonths]);

  // Exact 12 Month Headers matching Ethiopian Fiscal Year standard (Hamle to Sene / Jul to Jun)
  const efyMonthHeaders = useMemo(() => {
    const num = parseInt(planningEfyYear, 10);
    const yr1 = !isNaN(num) ? num + 7 : 2026;
    const yr2 = !isNaN(num) ? num + 8 : 2027;
    const y1Short = String(yr1).slice(-2);
    const y2Short = String(yr2).slice(-2);

    return [
      `Jul-${y1Short}`,
      `Aug-${y1Short}`,
      `Sep-${y1Short}`,
      `Oct-${y1Short}`,
      `Nov-${y1Short}`,
      `Dec-${y1Short}`,
      `Jan-${y2Short}`,
      `Feb-${y2Short}`,
      `Mar-${y2Short}`,
      `Apr-${y2Short}`,
      `May-${y2Short}`,
      `Jun-${y2Short}`,
    ];
  }, [planningEfyYear]);

  // User Permission & Lock State for EFY Baseline Plan: Directorate admin and Master admin only
  const isEfyAdmin = useMemo(() => {
    return currentUserObj?.role === 'master_admin' || 
           currentUserObj?.role === 'directorate_admin' || 
           currentUserObj?.role === 'admin' ||
           currentUserObj?.username === 'proj_1781786415663' ||
           Boolean(currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'));
  }, [currentUserObj]);

  const currentEfyHistoryMatch = useMemo(() => {
    return (project.progressPlanHistory || []).find(
      h => (h.efyLabel || '').trim() === planningEfyYear || (h.monthLabel || '').includes(`EFY ${planningEfyYear}`)
    );
  }, [project.progressPlanHistory, planningEfyYear]);

  const isEfyPlanSaved = useMemo(() => {
    return Boolean(
      currentEfyHistoryMatch || 
      (labels.efyLabel === planningEfyYear && (plan.contractor.efy > 0 || plan.era.efy > 0))
    );
  }, [currentEfyHistoryMatch, labels.efyLabel, planningEfyYear, plan.contractor.efy, plan.era.efy]);

  const isEfyPlanLocked = useMemo(() => {
    return isEfyPlanSaved && !isEfyAdmin;
  }, [isEfyPlanSaved, isEfyAdmin]);

  const handleSwitchPlanningEfyYear = (targetYear: string, broadcast: boolean = true) => {
    const cleaned = targetYear.trim().replace(/^EFY\s*/i, '');
    if (!cleaned) return;
    setPlanningEfyYear(cleaned);

    if (broadcast) {
      setStoredEfyYear(cleaned);
    }

    // Look up historical baseline plan for this target year
    const historyMatch = (project.progressPlanHistory || []).find(
      h => (h.efyLabel || '').trim() === cleaned || (h.monthLabel || '').includes(`EFY ${cleaned}`)
    );
    const numericYear = parseInt(cleaned, 10);
    const annualMatch = !isNaN(numericYear) ? (project.annual || []).find(a => a.year === numericYear) : undefined;

    if (historyMatch) {
      const cEfy = Number(historyMatch.contractorEfy || 0);
      const eEfy = Number(historyMatch.eraEfy || 0);
      if (historyMatch.contractorMonths && historyMatch.contractorMonths.length >= 12) {
        setContractorMonths([...historyMatch.contractorMonths]);
      } else {
        setContractorMonths(distributeTotalTo12Months(cEfy, 'even'));
      }
      if (historyMatch.eraMonths && historyMatch.eraMonths.length >= 12) {
        setEraMonths([...historyMatch.eraMonths]);
      } else {
        setEraMonths(distributeTotalTo12Months(eEfy, 'even'));
      }
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
    handleSwitchPlanningEfyYear(cleaned, true);
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

  const handleActualMonthChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...actualMonths];
    updated[idx] = isNaN(num) ? 0 : Math.max(0, num);
    setActualMonths(updated);
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
    if (currentUserObj?.role !== 'master_admin' && currentUserObj?.role !== 'directorate_admin') {
      showToast('Only Admins can edit the EFY plan after saving.', 'success');
      return;
    }

    // Validate Actuals against total length
    if (actualSums.efy > (project.lengthKm || 0)) {
      showToast('Actual EFY accomplishment cannot exceed total project length.', 'success');
      return;
    }

    const targetEfyStr = planningEfyYear.trim() || labels.efyLabel || '2019';
    const numericYear = parseInt(targetEfyStr, 10);
    const isActiveEfy = (labels.efyLabel || '').trim() === targetEfyStr;

    const updatedPlan: ProgressPlan = {
      ...plan,
      actual: {
        ...plan.actual,
        efy: actualSums.efy
      }
    };

    const updatedLabels = {
      ...labels,
      efyLabel: targetEfyStr
    };

    // 2. Also record in historical baseline archive (progressPlanHistory) if option enabled
    let updatedHistory = project.progressPlanHistory || [];
    if (recordEfyOnArchive) {
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
        contractorMonths: [...contractorMonths],
        eraMonths: [...eraMonths],
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
      updatedHistory = sortProgressPlanHistoryDescending([historyItem, ...filteredHistory]);
    }

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

    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonthly = project.monthly || [];
    const updatedMonthly = monthNames.map((name, idx) => {
      const existing = currentMonthly[idx] || { month: name };
      return {
        ...existing,
        month: existing.month || name,
        revisedPlan: contractorMonths[idx] !== undefined ? Number(contractorMonths[idx]) : (typeof existing.revisedPlan === 'number' ? existing.revisedPlan : 0),
        originalPlan: eraMonths[idx] !== undefined ? Number(eraMonths[idx]) : (typeof existing.originalPlan === 'number' ? existing.originalPlan : 0)
      };
    });

    if (onProjectUpdate) {
      onProjectUpdate({
        progressPlan: updatedPlan,
        progressPlanLabels: updatedLabels,
        progressPlanHistory: updatedHistory,
        annual: updatedAnnual,
        monthly: updatedMonthly
      }, `Updated EFY ${targetEfyStr} Whole Fiscal Year Baseline Plan (Contractor: ${contractorSums.efy.toFixed(2)} Km, ERA: ${eraSums.efy.toFixed(2)} Km)`);
    }

    onUpdateProgressPlan(updatedPlan, updatedLabels);
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

  // Dedicated calculations for ERA Plans with Accomplishments for specific month, quarter, and EFY
  const eraAccomplishmentMatrix = useMemo(() => {
    const lengthKm = project.lengthKm && project.lengthKm > 0 ? project.lengthKm : 65.0;

    const monthStr = labels.monthLabel || 'September 2026';
    const quarterStr = labels.quarterLabel || 'July 2026 to September 2026';
    const rawEfy = (labels.efyLabel || '2019').replace(/^EFY\s*/i, '').replace(/\s*EFY$/i, '').trim();
    const efyStr = `${rawEfy || '2019'} EFY`;

    // 1. Specific Month figures
    const eraMonthKm = Number(plan.era.month || 0);
    const actualMonthKm = Number(plan.actual.month || 0);
    const physMonthAccomplishment = lengthKm > 0 ? (actualMonthKm / lengthKm) * 100 : 0;
    const physMonthPlan = lengthKm > 0 ? (eraMonthKm / lengthKm) * 100 : 0;
    const monthPerfRatio = eraMonthKm > 0 ? (actualMonthKm / eraMonthKm) * 100 : (actualMonthKm > 0 ? 100 : 0);
    const monthVarianceKm = actualMonthKm - eraMonthKm;

    // 2. Specific Quarter figures
    const eraQuarterKm = Number(plan.era.quarter || 0);
    const actualQuarterKm = Number(plan.actual.quarter || 0);
    const physQuarterAccomplishment = lengthKm > 0 ? (actualQuarterKm / lengthKm) * 100 : 0;
    const physQuarterPlan = lengthKm > 0 ? (eraQuarterKm / lengthKm) * 100 : 0;
    const quarterPerfRatio = eraQuarterKm > 0 ? (actualQuarterKm / eraQuarterKm) * 100 : (actualQuarterKm > 0 ? 100 : 0);
    const quarterVarianceKm = actualQuarterKm - eraQuarterKm;

    // 3. Specific Cumulative FY (EFY) figures
    const eraEfyKm = Number(plan.era.efy || 0);
    const actualEfyKm = Number(plan.actual.efy || 0);
    const physEfyAccomplishment = lengthKm > 0 ? (actualEfyKm / lengthKm) * 100 : 0;
    const physEfyPlan = lengthKm > 0 ? (eraEfyKm / lengthKm) * 100 : 0;
    const efyPerfRatio = eraEfyKm > 0 ? (actualEfyKm / eraEfyKm) * 100 : (actualEfyKm > 0 ? 100 : 0);
    const efyVarianceKm = actualEfyKm - eraEfyKm;

    return {
      lengthKm,
      monthStr,
      quarterStr,
      efyStr,
      month: {
        eraKm: eraMonthKm,
        actualKm: actualMonthKm,
        physAccomplishment: physMonthAccomplishment,
        physPlan: physMonthPlan,
        perfRatio: monthPerfRatio,
        varianceKm: monthVarianceKm,
        spi: eraMonthKm > 0 ? (actualMonthKm / eraMonthKm).toFixed(2) : '1.00'
      },
      quarter: {
        eraKm: eraQuarterKm,
        actualKm: actualQuarterKm,
        physAccomplishment: physQuarterAccomplishment,
        physPlan: physQuarterPlan,
        perfRatio: quarterPerfRatio,
        varianceKm: quarterVarianceKm,
        spi: eraQuarterKm > 0 ? (actualQuarterKm / eraQuarterKm).toFixed(2) : '1.00'
      },
      efy: {
        eraKm: eraEfyKm,
        actualKm: actualEfyKm,
        physAccomplishment: physEfyAccomplishment,
        physPlan: physEfyPlan,
        perfRatio: efyPerfRatio,
        varianceKm: efyVarianceKm,
        spi: eraEfyKm > 0 ? (actualEfyKm / eraEfyKm).toFixed(2) : '1.00'
      }
    };
  }, [project.lengthKm, labels.monthLabel, labels.quarterLabel, labels.efyLabel, plan.era, plan.actual]);

  const handleExportEraAccomplishmentTablePDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.roundedRect(30, 20, pageWidth - 60, pageHeight - 40, 6, 6, 'S');

    drawEraLogo(doc, 45, 35, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 100, 48);

    doc.setFontSize(10.5);
    doc.setTextColor(30, 64, 175);
    doc.text("ERA PLANS & PHYSICAL ACCOMPLISHMENTS EVALUATION TABLE", 100, 64);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`PROJECT: ${project.name.toUpperCase()} • CONTRACTOR: ${(project.contractor || 'ERA').toUpperCase()} • SCOPE: ${eraAccomplishmentMatrix.lengthKm.toFixed(2)} Km`, 100, 78);

    const startX = 45;
    let curY = 105;
    const col1W = 280;
    const col2W = 150;
    const col3W = 165;
    const col4W = 155;
    const totalW = col1W + col2W + col3W + col4W;

    doc.setFillColor(226, 232, 240);
    doc.rect(startX, curY, totalW, 26, 'FD');
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(1);
    doc.rect(startX, curY, totalW, 26, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    doc.line(startX + col1W, curY, startX + col1W, curY + 26);
    doc.line(startX + col1W + col2W, curY, startX + col1W + col2W, curY + 26);
    doc.line(startX + col1W + col2W + col3W, curY, startX + col1W + col2W + col3W, curY + 26);

    doc.text(`This Month (${eraAccomplishmentMatrix.monthStr})`, startX + col1W + col2W / 2, curY + 17, { align: 'center' });
    doc.text(`This Quarter (${eraAccomplishmentMatrix.quarterStr})`, startX + col1W + col2W + col3W / 2, curY + 17, { align: 'center' });
    doc.text(`Cumulative FY (${eraAccomplishmentMatrix.efyStr})`, startX + col1W + col2W + col3W + col4W / 2, curY + 17, { align: 'center' });

    curY += 26;

    doc.setFillColor(241, 245, 249);
    doc.rect(startX, curY, totalW, 20, 'FD');
    doc.rect(startX, curY, totalW, 20, 'S');
    doc.line(startX + col1W, curY, startX + col1W, curY + 20);
    doc.line(startX + col1W + col2W, curY, startX + col1W + col2W, curY + 20);
    doc.line(startX + col1W + col2W + col3W, curY, startX + col1W + col2W + col3W, curY + 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("Physical", startX + col1W + col2W / 2, curY + 14, { align: 'center' });
    doc.text("Physical", startX + col1W + col2W + col3W / 2, curY + 14, { align: 'center' });
    doc.text("Physical", startX + col1W + col2W + col3W + col4W / 2, curY + 14, { align: 'center' });

    curY += 20;

    const tableRows = [
      {
        title: "Total Percentage Accomplishment",
        isBold: true,
        bg: [255, 255, 255],
        c1: `${eraAccomplishmentMatrix.month.physAccomplishment.toFixed(2)}%`,
        c2: `${eraAccomplishmentMatrix.quarter.physAccomplishment.toFixed(2)}%`,
        c3: `${eraAccomplishmentMatrix.efy.physAccomplishment.toFixed(2)}%`,
        textColor: [5, 150, 105]
      },
      {
        title: "ERA Planned Physical Percentage (%)",
        isBold: false,
        bg: [248, 250, 252],
        c1: `${eraAccomplishmentMatrix.month.physPlan.toFixed(2)}%`,
        c2: `${eraAccomplishmentMatrix.quarter.physPlan.toFixed(2)}%`,
        c3: `${eraAccomplishmentMatrix.efy.physPlan.toFixed(2)}%`,
        textColor: [100, 116, 139]
      },
      {
        title: "ERA Approved Milestone Plan (Km)",
        isBold: false,
        bg: [255, 255, 255],
        c1: `${eraAccomplishmentMatrix.month.eraKm.toFixed(2)} Km`,
        c2: `${eraAccomplishmentMatrix.quarter.eraKm.toFixed(2)} Km`,
        c3: `${eraAccomplishmentMatrix.efy.eraKm.toFixed(2)} Km`,
        textColor: [71, 85, 105]
      },
      {
        title: "Actual Road Accomplished (Km)",
        isBold: true,
        bg: [240, 253, 244],
        c1: `${eraAccomplishmentMatrix.month.actualKm.toFixed(2)} Km`,
        c2: `${eraAccomplishmentMatrix.quarter.actualKm.toFixed(2)} Km`,
        c3: `${eraAccomplishmentMatrix.efy.actualKm.toFixed(2)} Km`,
        textColor: [21, 128, 61]
      },
      {
        title: "Accomplishment Rate vs ERA Plan (%)",
        isBold: true,
        bg: [255, 255, 255],
        c1: `${eraAccomplishmentMatrix.month.perfRatio.toFixed(1)}%`,
        c2: `${eraAccomplishmentMatrix.quarter.perfRatio.toFixed(1)}%`,
        c3: `${eraAccomplishmentMatrix.efy.perfRatio.toFixed(1)}%`,
        textColor: [30, 58, 138]
      },
      {
        title: "% Accomplishment vs Contractor Plan (%)",
        isBold: true,
        bg: [248, 250, 252],
        c1: `${(plan.contractor.month > 0 ? (plan.actual.month / plan.contractor.month) * 100 : 0).toFixed(1)}%`,
        c2: `${(plan.contractor.quarter > 0 ? (plan.actual.quarter / plan.contractor.quarter) * 100 : 0).toFixed(1)}%`,
        c3: `${((contractorSums.efy || plan.contractor.efy) > 0 ? (plan.actual.efy / (contractorSums.efy || plan.contractor.efy)) * 100 : 0).toFixed(1)}%`,
        textColor: [30, 58, 138]
      }
    ];

    tableRows.forEach(row => {
      doc.setFillColor(row.bg[0], row.bg[1], row.bg[2]);
      doc.rect(startX, curY, totalW, 22, 'FD');
      doc.rect(startX, curY, totalW, 22, 'S');
      doc.line(startX + col1W, curY, startX + col1W, curY + 22);
      doc.line(startX + col1W + col2W, curY, startX + col1W + col2W, curY + 22);
      doc.line(startX + col1W + col2W + col3W, curY, startX + col1W + col2W + col3W, curY + 22);

      doc.setFont('helvetica', row.isBold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(row.title, startX + 12, curY + 15);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(row.textColor[0], row.textColor[1], row.textColor[2]);
      doc.text(row.c1, startX + col1W + col2W / 2, curY + 15, { align: 'center' });
      doc.text(row.c2, startX + col1W + col2W + col3W / 2, curY + 15, { align: 'center' });
      doc.text(row.c3, startX + col1W + col2W + col3W + col4W / 2, curY + 15, { align: 'center' });

      curY += 22;
    });

    doc.save(`ERA_Plans_and_Accomplishments_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportEfyPlanImageTablePDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Outer border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.roundedRect(30, 20, pageWidth - 60, pageHeight - 40, 6, 6, 'S');

    // Logo & Header
    drawEraLogo(doc, 45, 35, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 100, 48);

    doc.setFontSize(10.5);
    doc.setTextColor(29, 78, 216); // Blue
    doc.text(`EFY ${planningEfyYear} ANNUAL BASELINE PLAN & EXECUTION SCHEDULE`, 100, 64);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`PROJECT: ${project.name.toUpperCase()} • CONTRACTOR: ${(project.contractor || 'ERA').toUpperCase()} • SCOPE: ${(project.lengthKm || 65).toFixed(2)} Km`, 100, 78);

    const startX = 40;
    let curY = 100;
    const colProjW = 120;
    const colTierW = 110;
    const colMonthW = 38; // 38 * 12 = 456
    const colTotalW = 55;

    // Top Header: Blue Banner for EFY PLAN
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(startX + colProjW + colTierW, curY, colMonthW * 12 + colTotalW, 20, 'F');
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.75);
    doc.rect(startX + colProjW + colTierW, curY, colMonthW * 12 + colTotalW, 20, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("EFY  PLAN", startX + colProjW + colTierW + (colMonthW * 12 + colTotalW) / 2, curY + 14, { align: 'center' });

    // Project Name header cell on top left
    doc.setFillColor(241, 245, 249);
    doc.rect(startX, curY, colProjW, 40, 'FD');
    doc.setDrawColor(148, 163, 184);
    doc.rect(startX, curY, colProjW, 40, 'S');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text("Project-", startX + colProjW / 2, curY + 16, { align: 'center' });
    doc.text("Name", startX + colProjW / 2, curY + 28, { align: 'center' });

    // Blank spacer next to project name
    doc.rect(startX + colProjW, curY, colTierW, 40, 'FD');
    doc.rect(startX + colProjW, curY, colTierW, 40, 'S');

    curY += 20;

    // Sub-header row for 12 months + Total
    doc.setFillColor(30, 58, 138); // Darker blue
    doc.rect(startX + colProjW + colTierW, curY, colMonthW * 12 + colTotalW, 20, 'F');
    doc.setDrawColor(29, 78, 216);
    doc.rect(startX + colProjW + colTierW, curY, colMonthW * 12 + colTotalW, 20, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    efyMonthHeaders.forEach((mLabel, mIdx) => {
      const mX = startX + colProjW + colTierW + mIdx * colMonthW;
      doc.line(mX, curY, mX, curY + 20);
      doc.text(mLabel, mX + colMonthW / 2, curY + 13, { align: 'center' });
    });
    // Total column
    const totX = startX + colProjW + colTierW + 12 * colMonthW;
    doc.line(totX, curY, totX, curY + 20);
    doc.text("Total", totX + colTotalW / 2, curY + 13, { align: 'center' });

    curY += 20;

    // Data rows matching image
    const rows = [
      {
        tier: "Contractor-Plan(KM)",
        values: contractorMonths,
        total: contractorSums.efy,
        isRatio: false,
        textColor: [30, 58, 138],
        bg: [255, 255, 255]
      },
      {
        tier: "ERA-Plan(KM)",
        values: eraMonths,
        total: eraSums.efy,
        isRatio: false,
        textColor: [76, 29, 149],
        bg: [248, 250, 252]
      },
      {
        tier: "Actual-Accomplishment(KM)",
        values: actualMonths,
        total: actualSums.efy,
        isRatio: false,
        textColor: [5, 150, 105],
        bg: [240, 253, 244]
      },
      {
        tier: "% Accomplishment / ERA-Plan",
        values: eraMonths.map((eVal, i) => eVal > 0 ? (actualMonths[i] / eVal) * 100 : 0),
        total: eraSums.efy > 0 ? (actualSums.efy / eraSums.efy) * 100 : 0,
        isRatio: true,
        textColor: [15, 23, 42],
        bg: [255, 255, 255]
      },
      {
        tier: "% Accomplishment / Contractor-Plan",
        values: contractorMonths.map((cVal, i) => cVal > 0 ? (actualMonths[i] / cVal) * 100 : 0),
        total: contractorSums.efy > 0 ? (actualSums.efy / contractorSums.efy) * 100 : 0,
        isRatio: true,
        textColor: [30, 58, 138],
        bg: [248, 250, 252]
      }
    ];

    const dataRowH = 22;
    doc.setFillColor(255, 255, 255);
    doc.rect(startX, curY, colProjW, dataRowH * rows.length, 'FD');
    doc.setDrawColor(203, 213, 225);
    doc.rect(startX, curY, colProjW, dataRowH * rows.length, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const wrappedProj = doc.splitTextToSize(project.name, colProjW - 10);
    doc.text(wrappedProj, startX + 6, curY + 18);

    rows.forEach(r => {
      doc.setFillColor(r.bg[0], r.bg[1], r.bg[2]);
      doc.rect(startX + colProjW, curY, colTierW + colMonthW * 12 + colTotalW, dataRowH, 'FD');
      doc.setDrawColor(203, 213, 225);
      doc.rect(startX + colProjW, curY, colTierW + colMonthW * 12 + colTotalW, dataRowH, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(r.textColor[0], r.textColor[1], r.textColor[2]);
      doc.text(r.tier, startX + colProjW + 6, curY + 14);

      // Monthly values
      doc.setFont('helvetica', r.isRatio ? 'bold' : 'normal');
      doc.setFontSize(6.5);
      r.values.forEach((val, i) => {
        const cX = startX + colProjW + colTierW + i * colMonthW;
        doc.line(cX, curY, cX, curY + dataRowH);
        const valStr = r.isRatio ? `${val.toFixed(1)}%` : val.toFixed(2);
        doc.text(valStr, cX + colMonthW / 2, curY + 14, { align: 'center' });
      });

      // Total
      const totX = startX + colProjW + colTierW + 12 * colMonthW;
      doc.line(totX, curY, totX, curY + dataRowH);
      doc.setFont('helvetica', 'bold');
      const totStr = r.isRatio ? `${r.total.toFixed(1)}%` : `${r.total.toFixed(2)} Km`;
      doc.text(totStr, totX + colTotalW / 2, curY + 14, { align: 'center' });

      curY += dataRowH;
    });

    // Add Quarterly Summaries
    curY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("AGGREGATED QUARTERLY PROGRESS:", startX, curY);
    curY += 15;
    
    const quarters = [
      { name: "Quarter 1", era: eraSums.q1, ctr: contractorSums.q1, act: actualSums.q1 },
      { name: "Quarter 2", era: eraSums.q2, ctr: contractorSums.q2, act: actualSums.q2 },
      { name: "Quarter 3", era: eraSums.q3, ctr: contractorSums.q3, act: actualSums.q3 },
      { name: "Quarter 4", era: eraSums.q4, ctr: contractorSums.q4, act: actualSums.q4 }
    ];

    doc.setFontSize(7.5);
    quarters.forEach((q) => {
      doc.text(`${q.name}: ERA Plan: ${q.era.toFixed(2)} Km | Ctr Plan: ${q.ctr.toFixed(2)} Km | Actual: ${q.act.toFixed(2)} Km`, startX, curY);
      curY += 12;
    });

    curY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total EFY ${planningEfyYear} | ERA Total: ${eraSums.efy.toFixed(2)} Km | Ctr Total: ${contractorSums.efy.toFixed(2)} Km | Actual Total: ${actualSums.efy.toFixed(2)} Km`, startX, curY);

    curY += 20;
    drawUniversalSignatureBlock(doc, currentUserObj, {
      y: curY + 20,
      margin: startX,
      contentWidth: pageWidth - 80,
      orientation: 'l'
    });

    doc.save(`ERA_EFY_${planningEfyYear}_Plan_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportFocusedProjectPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

    doc.setDrawColor(194, 120, 3);
    doc.setLineWidth(3);
    doc.line(40, 25, pageWidth - 40, 25);

    drawEraLogo(doc, 40, 28, 26, {
      withContainer: true,
      containerBg: [255, 255, 255],
      containerBorder: [226, 232, 240],
      borderRadius: 3
    });

    const dsW = 140;
    const dsX = pageWidth - 40 - dsW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(dsX, 28, dsW, 26, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL REPORT AUDIT STAMP", dsX + 6, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX + 6, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`PROJECT: ${(project.name || 'Project').toUpperCase()}`, dsX + 6, 50);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 72, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT PROGRESS PLAN & ACCOMPLISHMENT COMPARISON REPORT", 72, 50);

    let curY = 62;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(40, curY, pageWidth - 80, 52, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`PROJECT: ${(project.name || 'Project').toUpperCase()}`, 50, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`CONTRACTOR: ${project.contractor || 'Not Specified'}`, 50, curY + 26);
    doc.text(`SUPERVISION CONSULTANT: ${project.consultant || 'Not Specified'}`, 50, curY + 36);
    doc.text(`DIRECTORATE: ${project.programDirectorate || 'Southern'} | PMO: ${project.pmo || 'PMO 1'}`, 50, curY + 46);

    const lengthKm = Number(project.lengthKm) || 65.0;
    const rightMetaX = pageWidth - 260;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`TARGET MILESTONE: ${(labels.monthLabel || 'Current Month').toUpperCase()} (${labels.quarterLabel || 'Q1'})`, rightMetaX, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`FISCAL YEAR: EFY ${labels.efyLabel || planningEfyYear}`, rightMetaX, curY + 26);
    doc.text(`PROJECT LENGTH: ${lengthKm.toFixed(2)} Km`, rightMetaX, curY + 36);
    doc.text(`CONTRACT AMOUNT: ETB ${(project.origAmount ? (project.origAmount * 1_000_000).toLocaleString() : 'N/A')}`, rightMetaX, curY + 46);

    curY += 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`1. MILESTONE PROGRESS COMPARISON MATRIX — AS REACHED AT ${(labels.monthLabel || 'MONTH').toUpperCase()}`, 40, curY);

    curY += 8;

    const tableX = 40;
    const tableW = pageWidth - 80;
    const colWidths = {
      tier: 181.89,
      month: 145,
      quarter: 145,
      efy: 145,
      todate: 145
    };

    doc.setFillColor(30, 41, 59);
    doc.rect(tableX, curY, tableW, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let hX = tableX;
    doc.text("PROGRESS PLAN / ACTUAL TIER CATEGORY", hX + 8, curY + 14);
    hX += colWidths.tier;
    doc.text(`MONTH: ${(labels.monthLabel || 'CURRENT').toUpperCase()}`, hX + 8, curY + 14);
    hX += colWidths.month;
    doc.text(`QUARTER: ${(labels.quarterLabel || 'Q1').toUpperCase()}`, hX + 8, curY + 14);
    hX += colWidths.quarter;
    doc.text(`FISCAL YEAR: EFY ${labels.efyLabel || planningEfyYear}`, hX + 8, curY + 14);
    hX += colWidths.efy;
    doc.text(`CUMULATIVE TO-DATE AT THIS MONTH`, hX + 8, curY + 14);

    curY += 22;

    const pctAccomplishmentVsCtrM = plan.contractor.month > 0 ? (plan.actual.month / plan.contractor.month) * 100 : 0;
    const pctAccomplishmentVsCtrQ = plan.contractor.quarter > 0 ? (plan.actual.quarter / plan.contractor.quarter) * 100 : 0;
    const pctAccomplishmentVsCtrE = (contractorSums.efy || plan.contractor.efy) > 0 ? (plan.actual.efy / (contractorSums.efy || plan.contractor.efy)) * 100 : 0;
    const pctAccomplishmentVsCtrTd = plan.contractor.todate > 0 ? (plan.actual.todate / plan.contractor.todate) * 100 : 0;

    const pctAccomplishmentVsEraM = plan.era.month > 0 ? (plan.actual.month / plan.era.month) * 100 : 0;
    const pctAccomplishmentVsEraQ = plan.era.quarter > 0 ? (plan.actual.quarter / plan.era.quarter) * 100 : 0;
    const pctAccomplishmentVsEraE = (eraSums.efy || plan.era.efy) > 0 ? (plan.actual.efy / (eraSums.efy || plan.era.efy)) * 100 : 0;
    const pctAccomplishmentVsEraTd = plan.era.todate > 0 ? (plan.actual.todate / plan.era.todate) * 100 : 0;

    const rows = [
      {
        tier: "Contractor Work Program Plan",
        subtier: "Contractor Baseline Schedule",
        bg: [239, 246, 255],
        textColor: [30, 58, 138],
        m: plan.contractor.month,
        q: plan.contractor.quarter,
        e: contractorSums.efy || plan.contractor.efy,
        td: plan.contractor.todate,
        isRatio: false
      },
      {
        tier: "ERA Approved Program Plan",
        subtier: "Employer Approved Target",
        bg: [245, 243, 255],
        textColor: [76, 29, 149],
        m: plan.era.month,
        q: plan.era.quarter,
        e: eraSums.efy || plan.era.efy,
        td: plan.era.todate,
        isRatio: false
      },
      {
        tier: "Actual Execution Accomplishment",
        subtier: "Supervision Verified Accomplishment",
        bg: [236, 253, 245],
        textColor: [6, 95, 70],
        m: plan.actual.month,
        q: plan.actual.quarter,
        e: plan.actual.efy,
        td: plan.actual.todate,
        isRatio: false
      },
      {
        tier: "% Accomplishment vs Contractor Plan (Actual / Contractor Plan)",
        subtier: "% Accomplishment divided by Contractor Plan Target",
        bg: [255, 255, 255],
        textColor: [30, 58, 138],
        m: pctAccomplishmentVsCtrM,
        q: pctAccomplishmentVsCtrQ,
        e: pctAccomplishmentVsCtrE,
        td: pctAccomplishmentVsCtrTd,
        isRatio: true
      },
      {
        tier: "% Accomplishment vs ERA Plan (Actual / ERA Plan)",
        subtier: "% Accomplishment divided by ERA Approved Target",
        bg: [248, 250, 252],
        textColor: [76, 29, 149],
        m: pctAccomplishmentVsEraM,
        q: pctAccomplishmentVsEraQ,
        e: pctAccomplishmentVsEraE,
        td: pctAccomplishmentVsEraTd,
        isRatio: true
      }
    ];

    rows.forEach((r) => {
      doc.setFillColor(r.bg[0], r.bg[1], r.bg[2]);
      doc.rect(tableX, curY, tableW, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(tableX, curY + 22, tableX + tableW, curY + 22);

      let rX = tableX;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(r.textColor[0], r.textColor[1], r.textColor[2]);
      doc.text(r.tier, rX + 8, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(r.subtier, rX + 8, curY + 18);

      const renderVal = (val: number, isRatio: boolean, curValX: number) => {
        if (isRatio) {
          const pctStr = `${val.toFixed(2)}%`;
          const statusStr = val >= 100 ? 'Ahead / Met' : val >= 75 ? 'Satisfactory' : 'Critical Lag';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          if (val >= 100) {
            doc.setTextColor(5, 150, 105);
          } else if (val >= 75) {
            doc.setTextColor(217, 119, 6);
          } else {
            doc.setTextColor(225, 29, 72);
          }
          doc.text(pctStr, curValX + 8, curY + 11);
          doc.setFontSize(5.5);
          doc.text(statusStr, curValX + 8, curY + 18);
        } else {
          const kmStr = `${val.toFixed(2)} Km`;
          const pctStr = `${((val / lengthKm) * 100).toFixed(2)}% of length`;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(r.textColor[0], r.textColor[1], r.textColor[2]);
          doc.text(kmStr, curValX + 8, curY + 11);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(pctStr, curValX + 8, curY + 18);
        }
      };

      rX += colWidths.tier;
      renderVal(r.m, r.isRatio, rX);
      rX += colWidths.month;
      renderVal(r.q, r.isRatio, rX);
      rX += colWidths.quarter;
      renderVal(r.e, r.isRatio, rX);
      rX += colWidths.efy;
      renderVal(r.td, r.isRatio, rX);

      curY += 22;
    });

    curY += 12;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, curY, pageWidth - 80, 42, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("EXECUTIVE AUDIT FINDINGS & SPI PERFORMANCE INDEX", 50, curY + 12);

    const spiMonth = plan.era.month > 0 ? (plan.actual.month / plan.era.month).toFixed(2) : '1.00';
    const spiTodate = plan.era.todate > 0 ? (plan.actual.todate / plan.era.todate).toFixed(2) : '1.00';
    const monthRatioStr = plan.era.month > 0 ? ((plan.actual.month / plan.era.month) * 100).toFixed(1) + '%' : '100.0%';
    const todateRatioStr = plan.era.todate > 0 ? ((plan.actual.todate / plan.era.todate) * 100).toFixed(1) + '%' : '100.0%';

    const narrative = `During ${labels.monthLabel || 'this tracking month'}, the actual execution reached ${plan.actual.month.toFixed(2)} Km vs the ERA approved plan of ${plan.era.month.toFixed(2)} Km (${monthRatioStr} accomplishment rate, Monthly SPI: ${spiMonth}). As of this milestone month, cumulative to-date physical accomplishment reached ${plan.actual.todate.toFixed(2)} Km (${((plan.actual.todate / lengthKm) * 100).toFixed(2)}% of total scope) against the planned ${plan.era.todate.toFixed(2)} Km (${todateRatioStr} cumulative accomplishment rate, Cumulative SPI: ${spiTodate}).`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const wrappedNarrative = doc.splitTextToSize(narrative, pageWidth - 100);
    doc.text(wrappedNarrative, 50, curY + 22);

    drawUniversalSignatureBlock(doc, currentUserObj, {
      y: curY + 35,
      margin: 40,
      contentWidth: pageWidth - 80,
      orientation: 'l'
    });

    const fileName = `ERA_Focused_Project_Comparison_${(project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_${(labels.monthLabel || 'Milestone').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);
    showToast(`📄 Exported focused project comparison PDF for "${project.name}"`);
  };

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
            <button
              type="button"
              onClick={handleExportFocusedProjectPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
              title="Export focused project progress plan & accomplishment comparison report in PDF"
              id="btn-export-focused-project-pdf"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Focused Project PDF</span>
            </button>

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

      {/* 📅 EFY PLAN 12-Month Grid & Progress Monitoring Section (As per Reference Image) */}
      <div className="bg-white dark:bg-slate-800 border-2 border-blue-400/80 dark:border-blue-700/80 rounded-2xl overflow-hidden shadow-md space-y-0">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow-inner shrink-0">
              <CalendarRange className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  EFY {planningEfyYear} Annual Baseline Plan & Execution Schedule
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40 font-mono">
                  12-Month Ethiopian Fiscal Calendar
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-white/10 text-white">
                  Scope: {(project.lengthKm || 65).toFixed(2)} Km
                </span>
                <span 
                  title={`Synchronized with Group Report EFY. Any change made to the fiscal year here or on the Group Report is linked in real-time.`}
                  className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 font-mono"
                >
                  <Link className="w-3 h-3 text-emerald-300 animate-pulse" />
                  Linked with Group Report EFY
                </span>
                {!isProjectCommencedInEfy(project, planningEfyYear) && (
                  <span 
                    title={`Project commencement date (${project.startDate || project.signDate || 'Scheduled in future'}) is after EFY ${planningEfyYear}. This project is automatically excluded from group tables & reports for EFY ${planningEfyYear}.`}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-1 font-mono cursor-help"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-300" />
                    Not Commenced in EFY {planningEfyYear}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-200/90 mt-0.5 leading-relaxed">
                Direct monthly breakdown table for Contractor and ERA plans, automatically aggregating quarterly (Q1-Q4) and annual EFY accomplishments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            {/* EFY Year Picker */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-blue-400/40 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-blue-300">EFY Year:</span>
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

            {/* Presets Quick Action */}
            <button
              type="button"
              onClick={() => handleApplyPreset('all', 'even')}
              className="px-2.5 py-1 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-400/30 text-blue-200 text-2xs font-bold transition cursor-pointer"
              title="Distribute EFY total evenly across 12 months"
            >
              ⚖️ Even
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all', 'dry_season')}
              className="px-2.5 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-400/30 text-amber-200 text-2xs font-bold transition cursor-pointer"
              title="Weight higher during dry season (Oct-May)"
            >
              ☀️ Dry Season
            </button>
            <button
              type="button"
              onClick={handleCopyContractorToEra}
              className="px-2.5 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-400/30 text-purple-200 text-2xs font-bold transition cursor-pointer"
              title="Copy Contractor monthly schedule to ERA Approved plan"
            >
              📋 Ctr → ERA
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveAndApplyEfyPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
              title="Save baseline targets to active project"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Plan</span>
            </button>

            {/* PDF Export Button */}
            <button
              type="button"
              onClick={handleExportEfyPlanImageTablePDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
              title="Export EFY Plan Landscape PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* 12-Month Table Replicating Uploaded Reference Image */}
        <div className="p-3 sm:p-4 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/40">
          <table className="w-full text-left border-collapse border-2 border-slate-300 dark:border-slate-600 font-sans text-xs">
            <thead>
              {/* Row 1: Project-Name Header and Vivid Blue EFY PLAN Banner */}
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <th rowSpan={2} className="p-2.5 w-[140px] min-w-[130px] border-r-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs">
                  Project-<br />Name
                </th>
                <th rowSpan={2} className="p-2 w-[150px] min-w-[140px] border-r-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold"></th>
                {/* Vivid Blue EFY PLAN Banner Header across all 12 months + Total */}
                <th colSpan={13} className="p-2.5 bg-blue-600 text-white font-black text-center text-xs sm:text-sm tracking-wider uppercase border-b border-blue-500 shadow-inner">
                  EFY  PLAN ({planningEfyYear})
                </th>
              </tr>

              {/* Row 2: Sub-header listing Jul-26 through Jun-27 + Total */}
              <tr className="bg-blue-700 text-white border-b-2 border-slate-300 dark:border-slate-600 text-2xs font-extrabold text-center">
                {efyMonthHeaders.map((mHeader, mIdx) => (
                  <th key={`hdr_${mIdx}`} className="p-2 border-r border-blue-500 min-w-[58px]">
                    {mHeader}
                  </th>
                ))}
                <th className="p-2 bg-blue-800 text-white font-black min-w-[70px] uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-600 bg-white dark:bg-slate-850">
              {/* Row 1: Contractor-Plan(KM) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td rowSpan={5} className="p-3 align-top border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-900/60">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-900 dark:text-white block text-xs leading-tight">
                      {project.name}
                    </span>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                      {(project.lengthKm || 65).toFixed(1)} Km
                    </span>
                  </div>
                </td>
                <td className="p-2.5 font-extrabold text-blue-900 dark:text-blue-300 border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                  Contractor-Plan(KM)
                </td>
                {contractorMonths.map((val, idx) => (
                  <td key={`c_m_${idx}`} className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-mono">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={val || ''}
                      placeholder="0"
                      onChange={(e) => handleContractorMonthChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-blue-50 dark:focus:bg-blue-950/60 outline-none transition"
                    />
                  </td>
                ))}
                <td className="p-2 text-center font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 text-xs">
                  {contractorSums.efy.toFixed(2)} Km
                </td>
              </tr>

              {/* Row 2: ERA-Plan(KM) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="p-2.5 font-extrabold text-purple-900 dark:text-purple-300 border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                  ERA-Plan(KM)
                </td>
                {eraMonths.map((val, idx) => (
                  <td key={`e_m_${idx}`} className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-mono">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={val || ''}
                      placeholder="0"
                      onChange={(e) => handleEraMonthChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-purple-50 dark:focus:bg-purple-950/60 outline-none transition"
                    />
                  </td>
                ))}
                <td className="p-2 text-center font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/60 text-xs">
                  {eraSums.efy.toFixed(2)} Km
                </td>
              </tr>

              {/* Row 3: Actual-Accomplishment(KM) */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition bg-emerald-50/30 dark:bg-emerald-950/10">
                <td className="p-2.5 font-extrabold text-emerald-900 dark:text-emerald-300 border-r-2 border-slate-300 dark:border-slate-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs">
                  Actual-Accomplishment(KM)
                </td>
                {actualMonths.map((val, idx) => (
                  <td key={`a_m_${idx}`} className="p-1 border-r border-slate-200 dark:border-slate-700 text-center font-mono">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={val || ''}
                      placeholder="0"
                      onChange={(e) => handleActualMonthChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-transparent font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/60 outline-none transition"
                    />
                  </td>
                ))}
                <td className="p-2 text-center font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 text-xs">
                  {actualSums.efy.toFixed(2)} Km
                </td>
              </tr>

              {/* Row 4: % Accomplishment / ERA-Plan */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="p-2.5 font-extrabold text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                  % Accomplishment / ERA-Plan
                </td>
                {eraMonths.map((eVal, idx) => {
                  const aVal = actualMonths[idx] || 0;
                  const ratio = eVal > 0 ? (aVal / eVal) * 100 : (aVal > 0 ? 100 : 0);
                  return (
                    <td key={`ratio_era_${idx}`} className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center font-mono text-2xs font-bold">
                      {eVal > 0 || aVal > 0 ? (
                        <span className={`px-1 py-0.5 rounded ${
                          ratio >= 100 
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50' 
                            : ratio >= 75 
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50' 
                            : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                        }`}>
                          {ratio.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-mono font-black text-xs bg-slate-100 dark:bg-slate-800">
                  {eraSums.efy > 0 ? (
                    <span className={actualSums.efy >= eraSums.efy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                      {((actualSums.efy / eraSums.efy) * 100).toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
              </tr>

              {/* Row 5: % Accomplishment / Contractor-Plan */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="p-2.5 font-extrabold text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                  % Accomplishment / Contractor-Plan
                </td>
                {contractorMonths.map((cVal, idx) => {
                  const aVal = actualMonths[idx] || 0;
                  const ratio = cVal > 0 ? (aVal / cVal) * 100 : (aVal > 0 ? 100 : 0);
                  return (
                    <td key={`ratio_ctr_${idx}`} className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center font-mono text-2xs font-bold">
                      {cVal > 0 || aVal > 0 ? (
                        <span className={`px-1 py-0.5 rounded ${
                          ratio >= 100 
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50' 
                            : ratio >= 75 
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50' 
                            : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                        }`}>
                          {ratio.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-mono font-black text-xs bg-slate-100 dark:bg-slate-800">
                  {contractorSums.efy > 0 ? (
                    <span className={actualSums.efy >= contractorSums.efy ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}>
                      {((actualSums.efy / contractorSums.efy) * 100).toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Automated Aggregated Quarterly (Q1-Q4) and Annual Accomplishments Monitoring Panel */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                Aggregated Quarterly & Fiscal Year Progress Monitoring:
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Calculates cumulative execution vs. ERA approved targets across all 4 quarters.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Quarter 1 */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">Quarter 1</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono font-bold">
                  {efyMonthHeaders[0]} - {efyMonthHeaders[2]}
                </span>
              </div>
              <div className="space-y-0.5 text-2xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ERA Plan:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">{eraSums.q1.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ctr Plan:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{contractorSums.q1.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-bold pt-1 border-t border-blue-200 dark:border-blue-800/40">
                  <span>Actual:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{actualSums.q1.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-0.5">
                  <span className="font-sans font-semibold">Accomplishment:</span>
                  <span className="font-black text-blue-700 dark:text-blue-300">
                    {eraSums.q1 > 0 ? ((actualSums.q1 / eraSums.q1) * 100).toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quarter 2 */}
            <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-cyan-900 dark:text-cyan-200 text-xs">Quarter 2</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-200 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 font-mono font-bold">
                  {efyMonthHeaders[3]} - {efyMonthHeaders[5]}
                </span>
              </div>
              <div className="space-y-0.5 text-2xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ERA Plan:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">{eraSums.q2.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ctr Plan:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{contractorSums.q2.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-bold pt-1 border-t border-cyan-200 dark:border-cyan-800/40">
                  <span>Actual:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{actualSums.q2.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-0.5">
                  <span className="font-sans font-semibold">Accomplishment:</span>
                  <span className="font-black text-cyan-700 dark:text-cyan-300">
                    {eraSums.q2 > 0 ? ((actualSums.q2 / eraSums.q2) * 100).toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quarter 3 */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs">Quarter 3</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-mono font-bold">
                  {efyMonthHeaders[6]} - {efyMonthHeaders[8]}
                </span>
              </div>
              <div className="space-y-0.5 text-2xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ERA Plan:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">{eraSums.q3.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ctr Plan:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{contractorSums.q3.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-bold pt-1 border-t border-indigo-200 dark:border-indigo-800/40">
                  <span>Actual:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{actualSums.q3.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-0.5">
                  <span className="font-sans font-semibold">Accomplishment:</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-300">
                    {eraSums.q3 > 0 ? ((actualSums.q3 / eraSums.q3) * 100).toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quarter 4 */}
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">Quarter 4</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-mono font-bold">
                  {efyMonthHeaders[9]} - {efyMonthHeaders[11]}
                </span>
              </div>
              <div className="space-y-0.5 text-2xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ERA Plan:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">{eraSums.q4.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ctr Plan:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{contractorSums.q4.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-bold pt-1 border-t border-purple-200 dark:border-purple-800/40">
                  <span>Actual:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{actualSums.q4.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-0.5">
                  <span className="font-sans font-semibold">Accomplishment:</span>
                  <span className="font-black text-purple-700 dark:text-purple-300">
                    {eraSums.q4 > 0 ? ((actualSums.q4 / eraSums.q4) * 100).toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Total Fiscal Year EFY */}
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 dark:text-emerald-200 text-xs">Total EFY {planningEfyYear}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-mono font-black">
                  Annual Sum
                </span>
              </div>
              <div className="space-y-0.5 text-2xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>ERA Total:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">{eraSums.efy.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Ctr Total:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{contractorSums.efy.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-900 dark:text-emerald-200 font-bold pt-1 border-t border-emerald-200 dark:border-emerald-800/40">
                  <span>Actual Total:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-xs">{actualSums.efy.toFixed(2)} Km</span>
                </div>
                <div className="flex justify-between text-emerald-900 dark:text-emerald-200 pt-0.5">
                  <span className="font-sans font-extrabold">% of ERA Plan:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                    {eraSums.efy > 0 ? ((actualSums.efy / eraSums.efy) * 100).toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>
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

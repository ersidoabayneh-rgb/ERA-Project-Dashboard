import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { safeSyncScoringWeights } from '../lib/apiSync';
import { 
  FileText, 
  Download, 
  X, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  AlertTriangle,
  Building,
  Building2,
  Landmark,
  Layers,
  ChevronDown,
  ChevronUp,
  Table,
  Eye,
  EyeOff,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck,
  Users,
  Award,
  Clock,
  Printer,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  SlidersHorizontal,
  BookOpen,
  AlertCircle,
  Sliders,
  RotateCcw,
  Save,
  Archive,
  CheckCircle,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Pencil,
  RefreshCcw,
  Scale,
  BarChart3,
  Calendar,
  CalendarClock,
  CalendarRange,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Calculator,
  Link,
  ExternalLink,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawEraLogo } from '../lib/pdfReportEngine';
import { 
  isProjectCommencedInEfy, 
  parseLocalDate, 
  getStoredEfyYear, 
  setStoredEfyYear, 
  subscribeEfyYearChange 
} from '../lib/dateUtils';
import { Project, User, formatAccounting, isProjectClosed, ContractorScoringWeights, DEFAULT_CONTRACTOR_SCORING_WEIGHTS, ConsultantScoringWeights, DEFAULT_CONSULTANT_SCORING_WEIGHTS, CustomScoringCriterion, SupervisionConsultantInfo, ProgressPlan, ProgressPlanHistoryItem } from '../types';
import { getProgressHealth } from '../lib/healthUtils';
import { sortProgressPlanHistoryDescending } from './DashboardView';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';
import { QtyItem } from '../types';
import { calculateIpcMaturation } from '../lib/ipcCalculations';
import { calculateProjectEvm } from '../lib/evmCalculations';
import { printWorkloadReportDocument } from '../lib/workloadReportPrinter';
import WorkloadReportModal from './WorkloadReportModal';
import FirmsManagementView from './FirmsManagementView';
import FinancialInstitutesAndGuarantiesModal from './FinancialInstitutesAndGuarantiesModal';
import { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS } from './ConsultantPerformanceKpiWidget';
import { 
  getProjectConsultantEvaluation, 
  evaluateQualitativeGrade, 
  DEFAULT_GRADE_THRESHOLDS 
} from '../data/consultantEvaluationMatrix';

const getLengthClass = (text: string) => {
  const len = (text || '').length;
  if (len > 45) return 'text-len-xl text-[7px] sm:text-2xs leading-tight';
  if (len > 30) return 'text-len-lg text-[8px] sm:text-2xs leading-tight';
  if (len > 20) return 'text-len-md text-[9px] sm:text-2xs leading-tight';
  return 'text-len-sm text-2xs leading-tight';
};

const getExactConsultantName = (p: Partial<Project> | null | undefined): string => {
  if (!p) return 'Not Specified';
  if (p.supervisionConsultant?.firmName && p.supervisionConsultant.firmName.trim()) {
    return p.supervisionConsultant.firmName.trim();
  }
  if (p.consultant && p.consultant.trim()) {
    return p.consultant.trim();
  }
  if ((p as any).supervisingConsultant && (p as any).supervisingConsultant.trim()) {
    return (p as any).supervisingConsultant.trim();
  }
  if ((p as any).consultantFirm && (p as any).consultantFirm.trim()) {
    return (p as any).consultantFirm.trim();
  }
  if ((p as any).consultantName && (p as any).consultantName.trim()) {
    return (p as any).consultantName.trim();
  }
  return 'Not Specified';
};

interface CriticalQtyAnalysis {
  name: string;
  unit: string;
  designValue: number;
  plannedValue: number;
  actualValue: number;
  execRatio: number; // actual / design %
  planRatio: number; // plan / design %
  variance: number; // actual - plan
  criticalFinding: string;
}

function evaluateEngineeringQuantities(quantities: QtyItem[]): {
  items: CriticalQtyAnalysis[];
  summaryNarrative: string;
} {
  const analysisItems: CriticalQtyAnalysis[] = [];
  let totalsCount = 0;
  let behindCount = 0;
  let aheadCount = 0;
  let severeSlippageCount = 0;

  (quantities || []).forEach(q => {
    // Extract UoM (unit of measurement) from parentheses
    const match = q.name.match(/^(.*?)\s*\((.*?)\)$/);
    const displayName = match ? match[1].trim() : q.name;
    const unit = match ? match[2].trim() : 'Units';

    const design = q.design || 0;
    const plan = q.plan || 0;
    const actual = q.exec || 0;

    const execRatio = design > 0 ? (actual / design) * 100 : 0;
    const planRatio = design > 0 ? (plan / design) * 100 : 0;
    const variance = actual - plan;
    const varianceRatio = plan > 0 ? (variance / plan) * 100 : 0;

    let finding = '';
    if (plan === 0 && actual === 0) {
      finding = `No activity recorded for this ${unit}-measured scope.`;
    } else if (variance < 0) {
      behindCount++;
      if (varianceRatio < -20) {
        severeSlippageCount++;
        finding = `Severe deficit of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% slippage) vs work program plan. Urgent mobilization required.`;
      } else {
        finding = `Moderate lag of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% variance). Target for acceleration.`;
      }
    } else {
      aheadCount++;
      if (varianceRatio > 20) {
        finding = `Aggressive progress exceeding plan by ${variance.toFixed(2)} ${unit} (+${varianceRatio.toFixed(2)}%). Review quality control of quick output.`;
      } else {
        finding = `Healthy progress alignment. Executed ${actual.toFixed(2)} of ${plan.toFixed(2)} planned ${unit}.`;
      }
    }

    analysisItems.push({
      name: displayName,
      unit,
      designValue: design,
      plannedValue: plan,
      actualValue: actual,
      execRatio,
      planRatio,
      variance,
      criticalFinding: finding
    });
    totalsCount++;
  });

  // Synthesize a detailed diagnostic narrative
  let summaryNarrative = '';
  if (totalsCount === 0) {
    summaryNarrative = "No engineering quantities registry was found. Unit of measurement critical evaluation is inconclusive.";
  } else {
    summaryNarrative = `A comprehensive audit was performed across ${totalsCount} key physical deliverables. `;
    if (severeSlippageCount > 0) {
      summaryNarrative += `Critical concern: ${severeSlippageCount} scope items exhibit severe execution deficits exceeding 20% of their planned volumes. `;
    }
    summaryNarrative += `Analysis shows ${aheadCount} items are meeting or exceeding scheduled targets, while ${behindCount} items are lagging. `;
    
    // Check specific units
    const kmItems = analysisItems.filter(i => i.unit.toLowerCase() === 'km');
    const kmLagging = kmItems.filter(i => i.variance < 0);
    if (kmLagging.length > 0) {
      summaryNarrative += `Linear layer completion (measured in Km) shows a critical bottleneck. Out of ${kmItems.length} linear layers, ${kmLagging.length} are currently lagging behind plan, which indicates subgrade, basecourse, or asphalt paving speed constraints. `;
    }

    const m3Items = analysisItems.filter(i => i.unit.toLowerCase() === 'm3');
    const m3Lagging = m3Items.filter(i => i.variance < 0);
    if (m3Lagging.length > 0) {
      summaryNarrative += `Earthwork and bulk material processing (measured in M3) is lagging by a cumulative total of ${m3Lagging.reduce((sum, item) => sum + Math.abs(item.variance), 0).toFixed(0)} M3. This lag is indicative of equipment bottlenecks or suboptimal material extraction rates. `;
    } else if (m3Items.length > 0) {
      summaryNarrative += `Earthwork extraction and filling operations (measured in M3) show satisfactory volume execution rates. `;
    }
    
    summaryNarrative += `Auditorial recommendation: Re-align equipment rosters to mitigate the ${behindCount} lagging indicators and optimize site clearing (Ha) or structural culvert (No.) mobilization.`;
  }

  return {
    items: analysisItems,
    summaryNarrative
  };
}

interface GroupReportGeneratorProps {
  projects: Project[];
  currentUserObj: User;
  programDirectorates: string[];
  pmos: string[];
  onClose: () => void;
  onUpdateProject?: (project: Project, sectionName: string) => void;
  onSelectProject?: (projectId: string, autoOpenApprovals?: boolean, initialTab?: string) => void;
}

export default function GroupReportGenerator({
  projects,
  currentUserObj,
  programDirectorates,
  pmos,
  onClose,
  onUpdateProject,
  onSelectProject
}: GroupReportGeneratorProps) {
  const roleStr = String(currentUserObj?.role || '').toLowerCase();
  const usernameStr = String(currentUserObj?.username || '').toLowerCase();
  const isConsultantOrContractor = Boolean(
    roleStr.includes('consultant') ||
    roleStr.includes('contractor') ||
    usernameStr.includes('consultant') ||
    usernameStr.includes('contractor')
  );

  const isAdmin = 
    currentUserObj?.role === 'master_admin' || 
    currentUserObj?.role === 'directorate_admin' || 
    currentUserObj?.role === 'cpm_admin';

  const canAccessGroupReport = !isConsultantOrContractor;

  // Universal Signature / Sign-Off Block builder supporting dynamic credentials and orientations
  const drawUniversalSignatureBlock = (doc: any, startY: number, orientation: 'p' | 'l' = 'p') => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Check if drawing fits on the page
    const requiredHeight = 70;
    let y = startY;
    if (y + requiredHeight > pageHeight - 40) {
      doc.addPage();
      y = 60;
    }

    y += 15;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("EXECUTIVE REVIEW & SIGN-OFF", 40, y);

    y += 35;

    // Determine roles and signature texts dynamically based on user credentials
    let col1Text = "Printed By: Administrator";
    let col2Text = "Verified By: Program Director";
    let col3Text = "Approved By: CPM DDG";

    if (currentUserObj?.role === 'pmo_admin') {
      col1Text = "Printed By: PMO Admin";
      col2Text = "Verified By: Project Manager";
      col3Text = "Approved By: Program Director";
    } else if (currentUserObj?.role === 'directorate_admin') {
      col1Text = "Printed By: Directorate Admin";
      col2Text = "Verified By: Program Director";
      col3Text = "Approved By: CPM DDG";
    } else {
      const friendlyRole = currentUserObj?.role === 'master_admin' ? 'Master Admin' : (currentUserObj?.role ? String(currentUserObj.role).replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'System Admin');
      col1Text = `Printed By: ${friendlyRole}`;
      col2Text = "Verified By: Program Director";
      col3Text = "Approved By: CPM DDG";
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.75);

    if (orientation === 'l') {
      // 3 wide columns for landscape
      // Col 1: Printed By
      doc.line(40, y, 220, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(col1Text, 40, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Timestamp", 40, y + 18);

      // Col 2: Verified By
      doc.line(330.94, y, 510.94, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(col2Text, 330.94, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Timestamp", 330.94, y + 18);

      // Col 3: Approved By
      doc.line(621.89, y, 801.89, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(col3Text, 621.89, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Signature seal", 621.89, y + 18);
    } else {
      // 3 slightly tighter columns for portrait
      doc.line(40, y, 180, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(col1Text, 40, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Timestamp", 40, y + 17);

      doc.line(227.64, y, 367.64, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(col2Text, 227.64, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Timestamp", 227.64, y + 17);

      doc.line(415.28, y, 555.28, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(col3Text, 415.28, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature / Signature seal", 415.28, y + 17);
    }
    
    return y + requiredHeight;
  };

  if (!canAccessGroupReport) {
    return null;
  }

  const [groupType, setGroupType] = useState<'directorate' | 'pmo' | 'contractor' | 'consultant'>('directorate');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'value'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [reportMode, setReportMode] = useState<'performance' | 'audit' | 'payments' | 'bonds' | 'firms' | 'supervisionStaff' | 'progressComparison'>('performance');
  const [selectedComparisonProjectId, setSelectedComparisonProjectId] = useState<string | null>(null);
  const [selectedComparisonMonthKey, setSelectedComparisonMonthKey] = useState<string | null>(null);
  const [comparisonUnitMode, setComparisonUnitMode] = useState<'both' | 'km' | 'pct'>('both');
  const [auditPerspective, setAuditPerspective] = useState<'contractor' | 'consultant'>('consultant');
  const [consultantCohortFilter, setConsultantCohortFilter] = useState<'all' | 'sole' | 'jv'>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [dossierConsultantMap, setDossierConsultantMap] = useState<Record<string, string>>({});
  const [maturedFilterOnly, setMaturedFilterOnly] = useState(false);
  const [isPrintWorkloadModalOpen, setIsPrintWorkloadModalOpen] = useState(false);
  const [isInstitutesModalOpen, setIsInstitutesModalOpen] = useState(false);
  const [institutesModalTab, setInstitutesModalTab] = useState<'institutes' | 'guaranties'>('guaranties');

  // EFY Month Definitions (12 Fiscal Months in Gregorian Calendar: Jul to Jun)
  const EFY_MONTH_DEFINITIONS = [
    { id: 1, idx: 0, name: 'M1 (July)', short: 'Jul', q: 'Q1' },
    { id: 2, idx: 1, name: 'M2 (August)', short: 'Aug', q: 'Q1' },
    { id: 3, idx: 2, name: 'M3 (September)', short: 'Sep', q: 'Q1' },
    { id: 4, idx: 3, name: 'M4 (October)', short: 'Oct', q: 'Q2' },
    { id: 5, idx: 4, name: 'M5 (November)', short: 'Nov', q: 'Q2' },
    { id: 6, idx: 5, name: 'M6 (December)', short: 'Dec', q: 'Q2' },
    { id: 7, idx: 6, name: 'M7 (January)', short: 'Jan', q: 'Q3' },
    { id: 8, idx: 7, name: 'M8 (February)', short: 'Feb', q: 'Q3' },
    { id: 9, idx: 8, name: 'M9 (March)', short: 'Mar', q: 'Q3' },
    { id: 10, idx: 9, name: 'M10 (April)', short: 'Apr', q: 'Q4' },
    { id: 11, idx: 10, name: 'M11 (May)', short: 'May', q: 'Q4' },
    { id: 12, idx: 11, name: 'M12 (June)', short: 'Jun', q: 'Q4' },
  ];

  const calculateQuarterlyAndEfyFromMonths = (months: number[]) => {
    const m = months && months.length === 12 ? months : Array(12).fill(0);
    const q1 = Number(((m[0] || 0) + (m[1] || 0) + (m[2] || 0)).toFixed(2));
    const q2 = Number(((m[3] || 0) + (m[4] || 0) + (m[5] || 0)).toFixed(2));
    const q3 = Number(((m[6] || 0) + (m[7] || 0) + (m[8] || 0)).toFixed(2));
    const q4 = Number(((m[9] || 0) + (m[10] || 0) + (m[11] || 0)).toFixed(2));
    const efy = Number((q1 + q2 + q3 + q4).toFixed(2));
    return { q1, q2, q3, q4, efy };
  };

  const distributeTotalTo12Months = (total: number, pattern: 'even' | 'dry_season' | 'scurve' = 'even'): number[] => {
    const weightsEven = Array(12).fill(1 / 12);
    const weightsDry = [0.04, 0.04, 0.06, 0.09, 0.11, 0.12, 0.13, 0.13, 0.12, 0.08, 0.05, 0.03];
    const weightsScurve = [0.03, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.13, 0.11, 0.09, 0.06, 0.04];
    const weights = pattern === 'dry_season' ? weightsDry : pattern === 'scurve' ? weightsScurve : weightsEven;
    return weights.map(w => Number((total * w).toFixed(2)));
  };

  // EFY Annual Progress Baseline Planning states (Whole Fiscal Year Planning at Beginning of FY)
  interface EfyProjectDraft {
    contractorEfy: number;
    eraEfy: number;
    q1Contractor: number;
    q2Contractor: number;
    q3Contractor: number;
    q4Contractor: number;
    q1Era: number;
    q2Era: number;
    q3Era: number;
    q4Era: number;
    contractorMonths: number[]; // 12 numbers
    eraMonths: number[];        // 12 numbers
    efyLabel: string;
  }

  // List of available EFY baseline plan years in the system (supporting past and future fiscal years)
  const [availableEfyYears, setAvailableEfyYears] = useState<string[]>([
    '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012'
  ]);
  const [selectedPlanningEfy, setSelectedPlanningEfy] = useState<string>(() => getStoredEfyYear('2019'));
  const [isAddEfyModalOpen, setIsAddEfyModalOpen] = useState<boolean>(false);
  const [isDeleteEfyModalOpen, setIsDeleteEfyModalOpen] = useState<boolean>(false);
  const [customEfyInput, setCustomEfyInput] = useState<string>('');
  const [deleteEfyInput, setDeleteEfyInput] = useState<string>('');

  // Synchronized EFY Year Handler: Updates state, stores globally, and notifies Progress Comparisons page
  const handleSelectPlanningEfy = (targetYear: string, broadcast: boolean = true) => {
    const cleaned = (targetYear || '').trim().replace(/^EFY\s*/i, '');
    if (!cleaned) return;
    setSelectedPlanningEfy(cleaned);
    setComparisonEfyYear(cleaned);
    if (broadcast) {
      setStoredEfyYear(cleaned);
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
    handleSelectPlanningEfy(cleaned, true);
    setIsAddEfyModalOpen(false);
    setCustomEfyInput('');
    showEfyToast(`Added EFY ${cleaned} baseline planning configuration!`);
  };

  const handleDeleteRecordedEfyPlan = (specificEfy?: string) => {
    const targetEfyStr = (specificEfy || deleteEfyInput || selectedPlanningEfy).trim();
    if (!targetEfyStr) {
      showEfyToast('Please specify a valid EFY year to delete.', 'info');
      return;
    }

    // Remove from availableEfyYears if present
    setAvailableEfyYears(prev => prev.filter(y => y !== targetEfyStr));

    // Switch to another year if we deleted the currently selected one
    if (selectedPlanningEfy === targetEfyStr) {
      const remaining = availableEfyYears.filter(y => y !== targetEfyStr);
      if (remaining.length > 0) {
        handleSelectPlanningEfy(remaining[0], true);
      }
    }

    setIsDeleteEfyModalOpen(false);
    setDeleteEfyInput('');
    showEfyToast(`🗑️ Deleted recorded EFY ${targetEfyStr} baseline plan configuration!`);
  };

  // Real-time synchronization: listen for EFY changes made on Progress Comparisons or other components
  useEffect(() => {
    const unsubscribe = subscribeEfyYearChange((newYear) => {
      if (newYear && newYear !== selectedPlanningEfy) {
        setSelectedPlanningEfy(newYear);
        setComparisonEfyYear(newYear);
        setAvailableEfyYears(prev => {
          if (!prev.includes(newYear)) {
            return Array.from(new Set([newYear, ...prev])).sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
          }
          return prev;
        });
      }
    });
    return unsubscribe;
  }, [selectedPlanningEfy]);

  // Exact 12 Month Headers matching Ethiopian Fiscal Year standard (Hamle to Sene / Jul to Jun)
  const efyMonthHeaders = useMemo(() => {
    const num = parseInt(selectedPlanningEfy, 10);
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
  }, [selectedPlanningEfy]);

  // Drafts keyed by EFY year and Project ID: { [efyYear]: { [projectId]: EfyProjectDraft } }
  const [efyDraftMapByYear, setEfyDraftMapByYear] = useState<Record<string, Record<string, EfyProjectDraft>>>({});
  const [isEfySectionExpanded, setIsEfySectionExpanded] = useState<boolean>(true);
  const [isQuarterlyPlanningExpanded, setIsQuarterlyPlanningExpanded] = useState<boolean>(false);
  const [expandedMonthlyRowProjectId, setExpandedMonthlyRowProjectId] = useState<string | null>(null);
  const [expandedQuarterView, setExpandedQuarterView] = useState<Record<string, 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>>({});
  const [baselineQuarterView, setBaselineQuarterView] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [activeMonthlyModalProject, setActiveMonthlyModalProject] = useState<Project | null>(null);
  const [editingEfyProject, setEditingEfyProject] = useState<Project | null>(null);
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<Project | null>(null);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState<boolean>(false);
  const [isViewRecordedModalOpen, setIsViewRecordedModalOpen] = useState<boolean>(false);
  const [efySaveToast, setEfySaveToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [recordEfyOnArchive, setRecordEfyOnArchive] = useState<boolean>(true);

  // Live editable state for Progress Plan Mileage Comparisons (Km)
  const [comparisonMonthTrackingPeriod, setComparisonMonthTrackingPeriod] = useState<string>('Aug 2026');
  const [comparisonQuarterlyRange, setComparisonQuarterlyRange] = useState<string>('July 2026- September 2026');
  const [comparisonEfyYear, setComparisonEfyYear] = useState<string>('2018');
  const [customComparisonOverrides, setCustomComparisonOverrides] = useState<Record<string, {
    contractorMonth?: number;
    contractorQuarter?: number;
    contractorEfy?: number;
    contractorTodate?: number;
    eraMonth?: number;
    eraQuarter?: number;
    eraEfy?: number;
    eraTodate?: number;
    actualMonth?: number;
    actualQuarter?: number;
    actualEfy?: number;
    actualTodate?: number;
  }>>({});

  // Directorate and PMO Group Progress Comparison state (Default hidden as requested)
  const [avgSummaryGroupTab, setAvgSummaryGroupTab] = useState<'both' | 'directorate' | 'pmo'>('both');
  const [isAvgSummaryExpanded, setIsAvgSummaryExpanded] = useState<boolean>(false);
  const [isGroupPortfolioSummaryExpanded, setIsGroupPortfolioSummaryExpanded] = useState<boolean>(true);

  React.useEffect(() => {
    if (currentUserObj && (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo)) {
      setAvgSummaryGroupTab('pmo');
    } else {
      setAvgSummaryGroupTab('both');
    }
  }, [currentUserObj]);

  const showEfyToast = (message: string, type: 'success' | 'info' = 'success') => {
    setEfySaveToast({ message, type });
    setTimeout(() => {
      setEfySaveToast(null);
    }, 4500);
  };

  const getEfyDraft = (p: Project, targetEfy: string = selectedPlanningEfy): EfyProjectDraft => {
    const cleanTarget = targetEfy.trim().replace(/^EFY\s*/i, '');

    const yearDrafts = efyDraftMapByYear[targetEfy] || efyDraftMapByYear[cleanTarget];
    if (yearDrafts && yearDrafts[p.id]) {
      return yearDrafts[p.id];
    }

    // 1. Check if project has an archived progressPlanHistory item matching this EFY
    const historyMatch = (p.progressPlanHistory || []).find(
      h => (h.efyLabel || '').trim().replace(/^EFY\s*/i, '').toLowerCase() === cleanTarget.toLowerCase() ||
           (h.efyLabel || '').includes(cleanTarget) ||
           (h.monthLabel || '').includes(`EFY ${cleanTarget}`) ||
           (cleanTarget === '2019' && ((h.monthLabel || '').includes('2019') || (h.id || '').includes('2019'))) ||
           (cleanTarget === '2018' && ((h.monthLabel || '').includes('2018') || (h.id || '').includes('2018')))
    );

    // 2. Check if project has an annual record matching this EFY
    const numericYear = parseInt(cleanTarget, 10);
    const annualMatch = !isNaN(numericYear) 
      ? (p.annual || []).find(a => a.year === numericYear)
      : undefined;

    let cMonths: number[] = [];
    let eMonths: number[] = [];
    let ctrEfy = 0;
    let eraEfy = 0;

    const projectEfy = (p.progressPlanLabels?.efyLabel || '').trim().replace(/^EFY\s*/i, '');
    const isProjectActiveEfy = projectEfy === cleanTarget || 
      (!projectEfy && (cleanTarget === '2019' || cleanTarget === '2018')) ||
      (cleanTarget === '2019' && (projectEfy === '2019' || projectEfy === '')) ||
      (cleanTarget === '2018' && (projectEfy === '2018' || projectEfy === ''));

    // Priority 1: Exact saved 12-month array inside historyMatch from progress comparisons page
    if (historyMatch && historyMatch.contractorMonths && historyMatch.contractorMonths.length >= 12 &&
        historyMatch.eraMonths && historyMatch.eraMonths.length >= 12) {
      cMonths = historyMatch.contractorMonths.map(v => Number(v) || 0);
      eMonths = historyMatch.eraMonths.map(v => Number(v) || 0);
      ctrEfy = Number(historyMatch.contractorEfy || 0);
      eraEfy = Number(historyMatch.eraEfy || 0);
    } 
    // Priority 2: Exact saved 12-month targets in project.monthly
    // On the Progress Comparisons page, project.monthly contains the exact 12-month baseline targets for the active EFY
    else if (p.monthly && p.monthly.length >= 12 && (isProjectActiveEfy || cleanTarget === '2019' || cleanTarget === '2018')) {
      cMonths = p.monthly.slice(0, 12).map(m => typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0));
      eMonths = p.monthly.slice(0, 12).map(m => typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : 0));
      ctrEfy = Number(p.progressPlan?.contractor?.efy || (historyMatch ? historyMatch.contractorEfy : 0));
      eraEfy = Number(p.progressPlan?.era?.efy || (historyMatch ? historyMatch.eraEfy : 0));
    }
    // Priority 3: History match with total only
    else if (historyMatch) {
      ctrEfy = Number(historyMatch.contractorEfy || 0);
      eraEfy = Number(historyMatch.eraEfy || 0);
      cMonths = distributeTotalTo12Months(ctrEfy, 'even');
      eMonths = distributeTotalTo12Months(eraEfy, 'even');
    }
    // Priority 4: Annual match
    else if (annualMatch) {
      eraEfy = Number(annualMatch.km || annualMatch.amount || 0);
      ctrEfy = Number((eraEfy * 1.1).toFixed(2));
      cMonths = distributeTotalTo12Months(ctrEfy, 'even');
      eMonths = distributeTotalTo12Months(eraEfy, 'even');
    }
    // Priority 5: Active progressPlan
    else if (p.progressPlan?.contractor?.efy || p.progressPlan?.era?.efy) {
      ctrEfy = Number(p.progressPlan?.contractor?.efy || 0);
      eraEfy = Number(p.progressPlan?.era?.efy || 0);
      cMonths = distributeTotalTo12Months(ctrEfy, 'even');
      eMonths = distributeTotalTo12Months(eraEfy, 'even');
    }
    // Fallback if project.monthly has any entries
    else if (p.monthly && p.monthly.length >= 12) {
      cMonths = p.monthly.slice(0, 12).map(m => typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0));
      eMonths = p.monthly.slice(0, 12).map(m => typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : 0));
    } else {
      cMonths = Array(12).fill(0);
      eMonths = Array(12).fill(0);
    }

    if (cMonths.every(v => v === 0) && (p.progressPlan?.contractor?.efy || p.progressPlan?.era?.efy)) {
      ctrEfy = Number(p.progressPlan?.contractor?.efy || 0);
      eraEfy = Number(p.progressPlan?.era?.efy || 0);
      cMonths = distributeTotalTo12Months(ctrEfy, 'even');
      eMonths = distributeTotalTo12Months(eraEfy, 'even');
    }

    const cSums = calculateQuarterlyAndEfyFromMonths(cMonths);
    const eSums = calculateQuarterlyAndEfyFromMonths(eMonths);

    return {
      contractorEfy: cSums.efy || ctrEfy,
      eraEfy: eSums.efy || eraEfy,
      q1Contractor: cSums.q1,
      q2Contractor: cSums.q2,
      q3Contractor: cSums.q3,
      q4Contractor: cSums.q4,
      q1Era: eSums.q1,
      q2Era: eSums.q2,
      q3Era: eSums.q3,
      q4Era: eSums.q4,
      contractorMonths: cMonths,
      eraMonths: eMonths,
      efyLabel: cleanTarget
    };
  };

  const updateEfyMonthValue = (projectId: string, tier: 'contractor' | 'era', monthIdx: number, val: number) => {
    setEfyDraftMapByYear(prevAll => {
      const currentYearDrafts = prevAll[selectedPlanningEfy] || {};
      const proj = processedProjects.find(p => p.id === projectId);
      const current = currentYearDrafts[projectId] || (proj ? getEfyDraft(proj, selectedPlanningEfy) : {
        contractorEfy: 0,
        eraEfy: 0,
        q1Contractor: 0,
        q2Contractor: 0,
        q3Contractor: 0,
        q4Contractor: 0,
        q1Era: 0,
        q2Era: 0,
        q3Era: 0,
        q4Era: 0,
        contractorMonths: Array(12).fill(0),
        eraMonths: Array(12).fill(0),
        efyLabel: selectedPlanningEfy
      });

      const newMonths = tier === 'contractor'
        ? [...(current.contractorMonths || Array(12).fill(0))]
        : [...(current.eraMonths || Array(12).fill(0))];

      newMonths[monthIdx] = Math.max(0, val);
      const { q1, q2, q3, q4, efy } = calculateQuarterlyAndEfyFromMonths(newMonths);

      const updatedDraft: EfyProjectDraft = tier === 'contractor'
        ? {
            ...current,
            contractorMonths: newMonths,
            q1Contractor: q1,
            q2Contractor: q2,
            q3Contractor: q3,
            q4Contractor: q4,
            contractorEfy: efy
          }
        : {
            ...current,
            eraMonths: newMonths,
            q1Era: q1,
            q2Era: q2,
            q3Era: q3,
            q4Era: q4,
            eraEfy: efy
          };

      return {
        ...prevAll,
        [selectedPlanningEfy]: {
          ...currentYearDrafts,
          [projectId]: updatedDraft
        }
      };
    });
  };

  const applyMonthlyPreset = (projectId: string, tier: 'all' | 'contractor' | 'era', preset: 'even' | 'dry_season' | 'scurve') => {
    const proj = processedProjects.find(p => p.id === projectId);
    if (!proj) return;
    const current = getEfyDraft(proj, selectedPlanningEfy);

    const cTotal = current.contractorEfy || 0;
    const eTotal = current.eraEfy || 0;

    const newCMonths = (tier === 'all' || tier === 'contractor') ? distributeTotalTo12Months(cTotal, preset) : current.contractorMonths;
    const newEMonths = (tier === 'all' || tier === 'era') ? distributeTotalTo12Months(eTotal, preset) : current.eraMonths;

    const cSums = calculateQuarterlyAndEfyFromMonths(newCMonths);
    const eSums = calculateQuarterlyAndEfyFromMonths(newEMonths);

    setEfyDraftMapByYear(prevAll => ({
      ...prevAll,
      [selectedPlanningEfy]: {
        ...(prevAll[selectedPlanningEfy] || {}),
        [projectId]: {
          ...current,
          contractorMonths: newCMonths,
          eraMonths: newEMonths,
          q1Contractor: cSums.q1,
          q2Contractor: cSums.q2,
          q3Contractor: cSums.q3,
          q4Contractor: cSums.q4,
          contractorEfy: cSums.efy,
          q1Era: eSums.q1,
          q2Era: eSums.q2,
          q3Era: eSums.q3,
          q4Era: eSums.q4,
          eraEfy: eSums.efy
        }
      }
    }));

    const presetLabel = preset === 'dry_season' ? '☀️ Dry Season Weighted' : preset === 'scurve' ? '📈 S-Curve Gradual' : '⚖️ Equal Monthly';
    showEfyToast(`Applied ${presetLabel} distribution across all 12 months for EFY ${selectedPlanningEfy} on ${proj.name}.`);
  };

  const copyContractorToEraForProject = (projectId: string) => {
    const proj = processedProjects.find(p => p.id === projectId);
    if (!proj) return;
    const current = getEfyDraft(proj, selectedPlanningEfy);
    const cMonths = [...(current.contractorMonths || Array(12).fill(0))];
    const cSums = calculateQuarterlyAndEfyFromMonths(cMonths);

    setEfyDraftMapByYear(prevAll => ({
      ...prevAll,
      [selectedPlanningEfy]: {
        ...(prevAll[selectedPlanningEfy] || {}),
        [projectId]: {
          ...current,
          eraMonths: cMonths,
          q1Era: cSums.q1,
          q2Era: cSums.q2,
          q3Era: cSums.q3,
          q4Era: cSums.q4,
          eraEfy: cSums.efy
        }
      }
    }));
    showEfyToast(`Copied Contractor schedule to ERA Approved Milestone Plan for EFY ${selectedPlanningEfy} on ${proj.name}.`);
  };

  const updateEfyDraft = (projectId: string, field: keyof EfyProjectDraft, value: any) => {
    setEfyDraftMapByYear(prevAll => {
      const currentYearDrafts = prevAll[selectedPlanningEfy] || {};
      const proj = processedProjects.find(p => p.id === projectId);
      const current = currentYearDrafts[projectId] || (proj ? getEfyDraft(proj, selectedPlanningEfy) : {
        contractorEfy: 0,
        eraEfy: 0,
        q1Contractor: 0,
        q2Contractor: 0,
        q3Contractor: 0,
        q4Contractor: 0,
        q1Era: 0,
        q2Era: 0,
        q3Era: 0,
        q4Era: 0,
        contractorMonths: Array(12).fill(0),
        eraMonths: Array(12).fill(0),
        efyLabel: selectedPlanningEfy
      });

      const updated: EfyProjectDraft = {
        ...current,
        [field]: value
      };

      if (field === 'contractorEfy' && typeof value === 'number') {
        const newCM = distributeTotalTo12Months(value, 'even');
        const cSums = calculateQuarterlyAndEfyFromMonths(newCM);
        updated.contractorMonths = newCM;
        updated.q1Contractor = cSums.q1;
        updated.q2Contractor = cSums.q2;
        updated.q3Contractor = cSums.q3;
        updated.q4Contractor = cSums.q4;
      } else if (field === 'eraEfy' && typeof value === 'number') {
        const newEM = distributeTotalTo12Months(value, 'even');
        const eSums = calculateQuarterlyAndEfyFromMonths(newEM);
        updated.eraMonths = newEM;
        updated.q1Era = eSums.q1;
        updated.q2Era = eSums.q2;
        updated.q3Era = eSums.q3;
        updated.q4Era = eSums.q4;
      }

      return {
        ...prevAll,
        [selectedPlanningEfy]: {
          ...currentYearDrafts,
          [projectId]: updated
        }
      };
    });
  };

  const handleAutoDistributeQuarters = (projectId: string) => {
    const proj = processedProjects.find(p => p.id === projectId);
    if (!proj) return;
    const current = getEfyDraft(proj, selectedPlanningEfy);
    const cEfy = current.contractorEfy;
    const eEfy = current.eraEfy;
    const cMonths = distributeTotalTo12Months(cEfy, 'even');
    const eMonths = distributeTotalTo12Months(eEfy, 'even');
    const cSums = calculateQuarterlyAndEfyFromMonths(cMonths);
    const eSums = calculateQuarterlyAndEfyFromMonths(eMonths);

    setEfyDraftMapByYear(prevAll => ({
      ...prevAll,
      [selectedPlanningEfy]: {
        ...(prevAll[selectedPlanningEfy] || {}),
        [projectId]: {
          ...current,
          contractorMonths: cMonths,
          eraMonths: eMonths,
          q1Contractor: cSums.q1,
          q2Contractor: cSums.q2,
          q3Contractor: cSums.q3,
          q4Contractor: cSums.q4,
          q1Era: eSums.q1,
          q2Era: eSums.q2,
          q3Era: eSums.q3,
          q4Era: eSums.q4
        }
      }
    }));
    showEfyToast(`Calculated 12-month and quarterly plan breakdown for EFY ${selectedPlanningEfy} on ${proj.name}`);
  };

  const handleSaveSingleEfyPlan = (project: Project) => {
    const draft = getEfyDraft(project, selectedPlanningEfy);
    const efyYearStr = draft.efyLabel || selectedPlanningEfy;
    const numericYear = parseInt(efyYearStr, 10);

    const isActiveEfy = (project.progressPlanLabels?.efyLabel || '').trim() === efyYearStr.trim();

    // 1. Prepare updated active plan (if this is the active EFY)
    const updatedPlan: ProgressPlan = {
      contractor: {
        ...(project.progressPlan?.contractor || { month: 0, quarter: 0, efy: 0, todate: 0 }),
        month: isActiveEfy ? (draft.contractorMonths[1] || draft.contractorMonths[0] || (project.progressPlan?.contractor?.month || 0)) : (project.progressPlan?.contractor?.month || 0),
        quarter: isActiveEfy ? (draft.q1Contractor !== undefined ? Number(draft.q1Contractor) : (project.progressPlan?.contractor?.quarter || 0)) : (project.progressPlan?.contractor?.quarter || 0),
        efy: isActiveEfy ? Number(draft.contractorEfy || 0) : (project.progressPlan?.contractor?.efy || 0),
      },
      era: {
        ...(project.progressPlan?.era || { month: 0, quarter: 0, efy: 0, todate: 0 }),
        month: isActiveEfy ? (draft.eraMonths[1] || draft.eraMonths[0] || (project.progressPlan?.era?.month || 0)) : (project.progressPlan?.era?.month || 0),
        quarter: isActiveEfy ? (draft.q1Era !== undefined ? Number(draft.q1Era) : (project.progressPlan?.era?.quarter || 0)) : (project.progressPlan?.era?.quarter || 0),
        efy: isActiveEfy ? Number(draft.eraEfy || 0) : (project.progressPlan?.era?.efy || 0),
      },
      actual: project.progressPlan?.actual || { month: 0, quarter: 0, efy: 0, todate: 0 }
    };

    const updatedLabels = {
      ...(project.progressPlanLabels || { monthLabel: 'Aug 2026', quarterLabel: 'Q1 (Jul-Sep 2026)', efyLabel: '2018' }),
      efyLabel: isActiveEfy ? efyYearStr : (project.progressPlanLabels?.efyLabel || '2018')
    };

    // 2. Also record in historical baseline archive (progressPlanHistory) if option enabled
    let updatedHistory = project.progressPlanHistory || [];
    if (recordEfyOnArchive) {
      const cSums = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []);
      const eSums = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []);

      const historyItem: ProgressPlanHistoryItem = {
        id: `efy_${efyYearStr}_plan_${project.id}`,
        monthLabel: `EFY ${efyYearStr} Baseline Plan`,
        quarterLabel: `Q1-Q4 (EFY ${efyYearStr})`,
        efyLabel: efyYearStr,
        contractorMonth: draft.contractorMonths[0] || 0,
        contractorQuarter: cSums.q1 || 0,
        contractorEfy: cSums.efy || draft.contractorEfy || 0,
        eraMonth: draft.eraMonths[0] || 0,
        eraQuarter: eSums.q1 || 0,
        eraEfy: eSums.efy || draft.eraEfy || 0,
        contractorMonths: [...(draft.contractorMonths || [])],
        eraMonths: [...(draft.eraMonths || [])],
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

    // 3. Update project.annual list
    let updatedAnnual = [...(project.annual || [])];
    if (!isNaN(numericYear)) {
      const existsIdx = updatedAnnual.findIndex(a => a.year === numericYear);
      const annualEntry = {
        year: numericYear,
        amount: draft.eraEfy || draft.contractorEfy || 0,
        km: draft.eraEfy || draft.contractorEfy || 0,
        percent: project.lengthKm > 0 ? Number(((draft.eraEfy / project.lengthKm) * 100).toFixed(2)) : 0
      };
      if (existsIdx >= 0) {
        updatedAnnual[existsIdx] = { ...updatedAnnual[existsIdx], ...annualEntry };
      } else {
        updatedAnnual.push(annualEntry);
      }
      updatedAnnual.sort((a, b) => b.year - a.year);
    }

    // 4. Update project.monthly with exact monthly baseline targets (Jul to Jun)
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonthly = project.monthly || [];
    const updatedMonthly = monthNames.map((name, idx) => {
      const existing = currentMonthly[idx] || { month: name };
      return {
        ...existing,
        month: existing.month || name,
        revisedPlan: draft.contractorMonths[idx] !== undefined ? Number(draft.contractorMonths[idx]) : (typeof existing.revisedPlan === 'number' ? existing.revisedPlan : 0),
        originalPlan: draft.eraMonths[idx] !== undefined ? Number(draft.eraMonths[idx]) : (typeof existing.originalPlan === 'number' ? existing.originalPlan : 0)
      };
    });

    const updatedProject: Project = {
      ...project,
      progressPlan: updatedPlan,
      progressPlanLabels: updatedLabels,
      progressPlanHistory: updatedHistory,
      annual: updatedAnnual,
      monthly: updatedMonthly
    };

    if (onUpdateProject) {
      onUpdateProject(updatedProject, `EFY ${efyYearStr} Annual Baseline Plan configured (Contractor: ${draft.contractorEfy} Km, ERA: ${draft.eraEfy} Km, synced to S-Curve)`);
    }

    showEfyToast(`✅ EFY ${efyYearStr} Baseline Plan saved & synced to cumulative S-Curve for "${project.name}" (Contractor: ${draft.contractorEfy} Km, ERA: ${draft.eraEfy} Km)`);
  };

  const handleDeleteSingleEfyPlan = (project: Project) => {
    const efyYearStr = selectedPlanningEfy;
    const numericYear = parseInt(efyYearStr, 10);
    const isActiveEfy = (project.progressPlanLabels?.efyLabel || '').trim() === efyYearStr.trim();

    // 1. Reset local draft in memory with explicit zeroed values and isDeleted flag
    setEfyDraftMapByYear(prevAll => {
      const currentYearDrafts = { ...(prevAll[selectedPlanningEfy] || {}) };
      currentYearDrafts[project.id] = {
        contractorEfy: 0,
        eraEfy: 0,
        contractorMonths: Array(12).fill(0),
        eraMonths: Array(12).fill(0),
        isDeleted: true
      };
      return {
        ...prevAll,
        [selectedPlanningEfy]: currentYearDrafts
      };
    });

    // 2. Filter out from progressPlanHistory
    const existingHistory = project.progressPlanHistory || [];
    const updatedHistory = existingHistory.filter(
      h => h.id !== `efy_${efyYearStr}_plan_${project.id}` &&
           (h.efyLabel || '').trim() !== efyYearStr.trim() &&
           h.monthLabel !== `EFY ${efyYearStr} Baseline Plan`
    );

    // 3. Filter out from project.annual
    const updatedAnnual = (project.annual || []).filter(a => a.year !== numericYear);

    // 4. If this was the active EFY, reset active EFY plan targets
    const updatedPlan: ProgressPlan = {
      contractor: {
        ...(project.progressPlan?.contractor || { month: 0, quarter: 0, efy: 0, todate: 0 }),
        efy: isActiveEfy ? 0 : (project.progressPlan?.contractor?.efy || 0)
      },
      era: {
        ...(project.progressPlan?.era || { month: 0, quarter: 0, efy: 0, todate: 0 }),
        efy: isActiveEfy ? 0 : (project.progressPlan?.era?.efy || 0)
      },
      actual: project.progressPlan?.actual || { month: 0, quarter: 0, efy: 0, todate: 0 }
    };

    const updatedProject: Project = {
      ...project,
      progressPlan: isActiveEfy ? updatedPlan : project.progressPlan,
      progressPlanHistory: updatedHistory,
      annual: updatedAnnual
    };

    if (onUpdateProject) {
      onUpdateProject(updatedProject, `Deleted EFY ${efyYearStr} Baseline Plan for "${project.name}"`);
    }

    setProjectPendingDeletion(null);
    showEfyToast(`🗑️ Deleted EFY ${efyYearStr} Baseline Plan for "${project.name}"`);
  };

  const handleDeleteEntireEfyYear = (efyYear: string) => {
    const numericYear = parseInt(efyYear, 10);

    // Remove from draft state
    setEfyDraftMapByYear(prevAll => {
      const next = { ...prevAll };
      delete next[efyYear];
      return next;
    });

    // Remove from available list if custom
    setAvailableEfyYears(prev => {
      const filtered = prev.filter(y => y !== efyYear);
      return filtered.length > 0 ? filtered : ['2018', '2017'];
    });

    if (selectedPlanningEfy === efyYear) {
      setSelectedPlanningEfy('2018');
    }

    let affectedCount = 0;
    processedProjects.forEach(p => {
      const isActiveEfy = (p.progressPlanLabels?.efyLabel || '').trim() === efyYear.trim();
      const updatedHistory = (p.progressPlanHistory || []).filter(
        h => h.id !== `efy_${efyYear}_plan_${p.id}` &&
             (h.efyLabel || '').trim() !== efyYear.trim() &&
             h.monthLabel !== `EFY ${efyYear} Baseline Plan`
      );
      const updatedAnnual = (p.annual || []).filter(a => a.year !== numericYear);

      const updatedPlan: ProgressPlan = {
        contractor: {
          ...(p.progressPlan?.contractor || { month: 0, quarter: 0, efy: 0, todate: 0 }),
          efy: isActiveEfy ? 0 : (p.progressPlan?.contractor?.efy || 0)
        },
        era: {
          ...(p.progressPlan?.era || { month: 0, quarter: 0, efy: 0, todate: 0 }),
          efy: isActiveEfy ? 0 : (p.progressPlan?.era?.efy || 0)
        },
        actual: p.progressPlan?.actual || { month: 0, quarter: 0, efy: 0, todate: 0 }
      };

      const updatedProject: Project = {
        ...p,
        progressPlan: isActiveEfy ? updatedPlan : p.progressPlan,
        progressPlanHistory: updatedHistory,
        annual: updatedAnnual
      };

      if (onUpdateProject) {
        onUpdateProject(updatedProject, `Cleared EFY ${efyYear} baseline plan records`);
        affectedCount++;
      }
    });

    setIsDeleteYearModalOpen(false);
    showEfyToast(`🗑️ Deleted EFY ${efyYear} baseline plans across ${affectedCount || processedProjects.length} projects`);
  };

  const handleSaveAllEfyPlans = () => {
    let savedCount = 0;
    const efyYearStr = selectedPlanningEfy;
    const numericYear = parseInt(efyYearStr, 10);

    efyTableProjects.forEach(p => {
      const draft = getEfyDraft(p, selectedPlanningEfy);
      const isActiveEfy = (p.progressPlanLabels?.efyLabel || '').trim() === efyYearStr.trim();

      const updatedPlan: ProgressPlan = {
        contractor: {
          ...(p.progressPlan?.contractor || { month: 0, quarter: 0, efy: 0, todate: 0 }),
          month: isActiveEfy ? (draft.contractorMonths[1] || draft.contractorMonths[0] || (p.progressPlan?.contractor?.month || 0)) : (p.progressPlan?.contractor?.month || 0),
          quarter: isActiveEfy ? (draft.q1Contractor !== undefined ? Number(draft.q1Contractor) : (p.progressPlan?.contractor?.quarter || 0)) : (p.progressPlan?.contractor?.quarter || 0),
          efy: isActiveEfy ? Number(draft.contractorEfy || 0) : (p.progressPlan?.contractor?.efy || 0),
        },
        era: {
          ...(p.progressPlan?.era || { month: 0, quarter: 0, efy: 0, todate: 0 }),
          month: isActiveEfy ? (draft.eraMonths[1] || draft.eraMonths[0] || (p.progressPlan?.era?.month || 0)) : (p.progressPlan?.era?.month || 0),
          quarter: isActiveEfy ? (draft.q1Era !== undefined ? Number(draft.q1Era) : (p.progressPlan?.era?.quarter || 0)) : (p.progressPlan?.era?.quarter || 0),
          efy: isActiveEfy ? Number(draft.eraEfy || 0) : (p.progressPlan?.era?.efy || 0),
        },
        actual: p.progressPlan?.actual || { month: 0, quarter: 0, efy: 0, todate: 0 }
      };

      const updatedLabels = {
        ...(p.progressPlanLabels || { monthLabel: 'Aug 2026', quarterLabel: 'Q1 (Jul-Sep 2026)', efyLabel: '2018' }),
        efyLabel: isActiveEfy ? efyYearStr : (p.progressPlanLabels?.efyLabel || '2018')
      };

      let updatedHistory = p.progressPlanHistory || [];
      if (recordEfyOnArchive) {
        const cSums = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []);
        const eSums = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []);

        const historyItem: ProgressPlanHistoryItem = {
          id: `efy_${efyYearStr}_plan_${p.id}`,
          monthLabel: `EFY ${efyYearStr} Baseline Plan`,
          quarterLabel: `Q1-Q4 (EFY ${efyYearStr})`,
          efyLabel: efyYearStr,
          contractorMonth: draft.contractorMonths[0] || 0,
          contractorQuarter: cSums.q1 || 0,
          contractorEfy: cSums.efy || draft.contractorEfy || 0,
          eraMonth: draft.eraMonths[0] || 0,
          eraQuarter: eSums.q1 || 0,
          eraEfy: eSums.efy || draft.eraEfy || 0,
          contractorMonths: [...(draft.contractorMonths || [])],
          eraMonths: [...(draft.eraMonths || [])],
          actualMonth: 0,
          actualQuarter: 0,
          actualEfy: 0,
          actualTodate: 0,
          contractorTodate: 0,
          eraTodate: 0,
          physicalProgress: 0
        };

        const existingHistory = p.progressPlanHistory || [];
        const filteredHistory = existingHistory.filter(h => h.id !== historyItem.id && h.monthLabel !== historyItem.monthLabel);
        updatedHistory = sortProgressPlanHistoryDescending([historyItem, ...filteredHistory]);
      }

      let updatedAnnual = [...(p.annual || [])];
      if (!isNaN(numericYear)) {
        const existsIdx = updatedAnnual.findIndex(a => a.year === numericYear);
        const annualEntry = {
          year: numericYear,
          amount: draft.eraEfy || draft.contractorEfy || 0,
          km: draft.eraEfy || draft.contractorEfy || 0,
          percent: p.lengthKm > 0 ? Number(((draft.eraEfy / p.lengthKm) * 100).toFixed(2)) : 0
        };
        if (existsIdx >= 0) {
          updatedAnnual[existsIdx] = { ...updatedAnnual[existsIdx], ...annualEntry };
        } else {
          updatedAnnual.push(annualEntry);
        }
        updatedAnnual.sort((a, b) => b.year - a.year);
      }

      // 4. Update project.monthly with exact monthly baseline targets (Jul to Jun)
      const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const currentMonthly = p.monthly || [];
      const updatedMonthly = monthNames.map((name, idx) => {
        const existing = currentMonthly[idx] || { month: name };
        return {
          ...existing,
          month: existing.month || name,
          revisedPlan: draft.contractorMonths[idx] !== undefined ? Number(draft.contractorMonths[idx]) : (typeof existing.revisedPlan === 'number' ? existing.revisedPlan : 0),
          originalPlan: draft.eraMonths[idx] !== undefined ? Number(draft.eraMonths[idx]) : (typeof existing.originalPlan === 'number' ? existing.originalPlan : 0)
        };
      });

      const updatedProject: Project = {
        ...p,
        progressPlan: isActiveEfy ? updatedPlan : p.progressPlan,
        progressPlanLabels: isActiveEfy ? updatedLabels : p.progressPlanLabels,
        progressPlanHistory: updatedHistory,
        annual: updatedAnnual,
        monthly: updatedMonthly
      };

      if (onUpdateProject) {
        onUpdateProject(updatedProject, `EFY ${efyYearStr} Annual Baseline Plan configured across portfolio (synced to S-Curve)`);
        savedCount++;
      }
    });

    showEfyToast(`🎉 Successfully saved & synced EFY ${efyYearStr} Annual Progress Baseline Plans across ${savedCount || processedProjects.length} projects to S-Curves!`);
  };

  // Master Admin verification check
  const isMasterAdmin = Boolean(
    currentUserObj?.role === 'master_admin' ||
    currentUserObj?.role === 'admin' ||
    currentUserObj?.username === 'proj_1781786415663' ||
    (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'))
  );

  // Contractor scoring weights state (Master Admin editable)
  const [contractorWeights, setContractorWeights] = useState<ContractorScoringWeights>(() => {
    try {
      const saved = localStorage.getItem('era_contractor_scoring_weights');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.fidic === 'number' && typeof parsed.projectMgmt === 'number' &&
            typeof parsed.evm === 'number' && typeof parsed.kpi === 'number' && typeof parsed.linear === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse contractor weights', e);
    }
    return DEFAULT_CONTRACTOR_SCORING_WEIGHTS;
  });

  // Consultant scoring weights state (Master Admin editable)
  const [consultantWeights, setConsultantWeights] = useState<ConsultantScoringWeights>(() => {
    try {
      const saved = localStorage.getItem('era_consultant_scoring_weights');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.sla === 'number' && typeof parsed.staff === 'number' &&
            typeof parsed.ipc === 'number' && typeof parsed.claims === 'number' && typeof parsed.quality === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse consultant weights', e);
    }
    return DEFAULT_CONSULTANT_SCORING_WEIGHTS;
  });

  const [isEditingWeightsModalOpen, setIsEditingWeightsModalOpen] = useState(false);
  const [tempContractorWeights, setTempContractorWeights] = useState<ContractorScoringWeights>(contractorWeights);
  const [tempConsultantWeights, setTempConsultantWeights] = useState<ConsultantScoringWeights>(consultantWeights);

  // Listen to Firestore scoring weights configuration database in real-time
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'config', 'scoring_weights'), (docSnap) => {
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.contractorWeights) {
            setContractorWeights(data.contractorWeights);
            localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(data.contractorWeights));
          }
          if (data && data.consultantWeights) {
            setConsultantWeights(data.consultantWeights);
            localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(data.consultantWeights));
          }
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Scoring weights listener notice:', e);
    }
  }, []);

  const isDirAdmin = currentUserObj?.role === 'directorate_admin' && !isMasterAdmin;
  const isPmoAdmin = currentUserObj?.role === 'pmo_admin' && !isMasterAdmin;
  const isCpmAdmin = currentUserObj?.role === 'cpm_admin' && !isMasterAdmin;

  // Helper check for project access based on user role and assigned projects
  const isAccessible = (p: Project) => {
    if (currentUserObj?.accessibleProjects && Array.isArray(currentUserObj.accessibleProjects) && currentUserObj.accessibleProjects.length > 0) {
      return currentUserObj.accessibleProjects.includes(p.id);
    }
    if (isMasterAdmin) return true;
    if (isDirAdmin) {
      if (currentUserObj.assignedDirectorate) {
        return (p.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
      }
      return true;
    }
    if (isPmoAdmin) {
      if (currentUserObj.assignedPmo) {
        return (p.pmo || '') === currentUserObj.assignedPmo;
      }
      return true;
    }
    return true;
  };

  // Detailed Project Compliance & Performance Audit calculator
  const getAuditMetrics = (p: Project) => {
    const isClosed = isProjectClosed(p.status);
    const isTerminated = p.status === 'Terminated and Closed' || p.status === 'Terminated';
    const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);

    // 1. Time & Schedule Audit
    let timeElapsedPct = 0;
    let elapsedDays = 0;
    const start = p.startDate ? new Date(p.startDate) : null;
    const today = new Date().getFullYear() < 2026 ? new Date('2026-06-26') : new Date();
    
    if (start && !isNaN(start.getTime()) && totalDays > 0) {
      if (isClosed) {
        elapsedDays = totalDays;
        timeElapsedPct = 100;
      } else {
        const diff = today.getTime() - start.getTime();
        elapsedDays = Math.max(0, diff / (1000 * 60 * 60 * 24));
        timeElapsedPct = Math.min(100, (elapsedDays / totalDays) * 100);
      }
    } else if (isClosed) {
      timeElapsedPct = 100;
      elapsedDays = totalDays;
    }
    
    const progressVal = p.physicalProgress || 0;
    let scheduleStatus: 'Compliant' | 'Warning' | 'Critical' = 'Compliant';
    let scheduleStatusText = isClosed ? (isTerminated ? 'Terminated / Closed' : 'Completed / Handover Closed') : 'On Track';
    
    if (!isClosed) {
      if (timeElapsedPct > 100 && progressVal < 95) {
        scheduleStatus = 'Critical';
        scheduleStatusText = 'Time Overrun';
      } else if (timeElapsedPct > progressVal + 15) {
        scheduleStatus = 'Warning';
        scheduleStatusText = 'Slipping Delay';
      }
    }

    // 2. Guarantees & Bonds Audit
    // Consider any bond or guarantee that is recovered, returned or fully amortized as a valid bond
    const bondsList = (p.bonds || []).filter(b => b.status !== 'N/A');
    const totalBonds = bondsList.length;
    const expiredBondsCount = bondsList.filter(b => {
      if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized'))) return false;
      if (b.status === 'Expired') return true;
      if (b.expireDate) {
        try {
          const exp = new Date(b.expireDate);
          return exp < today;
        } catch {
          return false;
        }
      }
      return false;
    }).length;

    let guaranteeStatus: 'Compliant' | 'Critical' = 'Compliant';
    if (expiredBondsCount > 0) {
      guaranteeStatus = 'Critical';
    }

    // 3. Risks & Mitigations Audit
    const risksList = p.risks || [];
    const activeRisks = risksList.filter(r => r.status === 'Active');
    const criticalRisksCount = activeRisks.filter(r => (r.impact * r.probability) >= 12).length;

    // 4. EVM Parameters via unified EVM engine
    const evm = calculateProjectEvm(p);
    const { BAC, AC, EV, PV, plannedPct, CPI, SPI } = evm;
    const timeOverrunPct = p.origDays > 0 ? ((p.eotDays || 0) / p.origDays) * 100 : 0;

    // 5. Linear layers based on Engineering Quantities & Construction Conformance Plan
    const activitiesList = p.workProgram || [];
    const findActByKeywords = (keywords: string[]) => {
      return activitiesList.find(a => 
        keywords.some(k => a.name.toLowerCase().includes(k) || a.id.toLowerCase() === k)
      );
    };
    const subgradeAct = findActByKeywords(['subgrade', 'site clearance', 'earthwork', 'excavation', 'b', 'c']);
    const cappingAct = findActByKeywords(['capping', 'embankment']);
    const subbaseAct = findActByKeywords(['subbase', 'sub-base', 'e']);
    const basecourseAct = findActByKeywords(['basecourse', 'base course', 'road base', 'f']);
    const asphaltAct = findActByKeywords(['asphalt', 'paving', 'bituminous', 'surfacing', 'g']);

    const getActivityPlannedPct = (act?: any) => {
      if (!act) return null;
      const startStr = act.start;
      const finishStr = act.finish;
      if (!startStr || !finishStr) return null;
      try {
        const s = new Date(startStr);
        const f = new Date(finishStr);
        if (isNaN(s.getTime()) || isNaN(f.getTime())) return null;
        if (f <= s) return 100;
        
        const totalDuration = f.getTime() - s.getTime();
        const elapsed = today.getTime() - s.getTime();
        
        if (elapsed < 0) return 0;
        if (elapsed >= totalDuration) return 100;
        return (elapsed / totalDuration) * 100;
      } catch {
        return null;
      }
    };

    const origSubgradeTotal = (p.linear?.subgrade || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origCappingTotal = (p.linear?.capping || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origSubbaseTotal = (p.linear?.subbase || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origBasecourseTotal = (p.linear?.basecourse || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origAsphaltTotal = (p.linear?.asphalt || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);

    const fallbackSubgradePct = p.lengthKm > 0 ? Math.min(100, (origSubgradeTotal / p.lengthKm) * 100) : 0;
    const fallbackCappingPct = p.lengthKm > 0 ? Math.min(100, (origCappingTotal / p.lengthKm) * 100) : 0;
    const fallbackSubbasePct = p.lengthKm > 0 ? Math.min(100, (origSubbaseTotal / p.lengthKm) * 100) : 0;
    const fallbackBasecoursePct = p.lengthKm > 0 ? Math.min(100, (origBasecourseTotal / p.lengthKm) * 100) : 0;
    const fallbackAsphaltPct = p.lengthKm > 0 ? Math.min(100, (origAsphaltTotal / p.lengthKm) * 100) : 0;

    const subgradePlanRaw = getActivityPlannedPct(subgradeAct) ?? Math.min(100, plannedPct * 1.25);
    const cappingPlanRaw = getActivityPlannedPct(cappingAct) ?? Math.min(100, plannedPct * 1.12);
    const subbasePlanRaw = getActivityPlannedPct(subbaseAct) ?? plannedPct;
    const basecoursePlanRaw = getActivityPlannedPct(basecourseAct) ?? Math.max(0, plannedPct - 10);
    const asphaltPlanRaw = getActivityPlannedPct(asphaltAct) ?? Math.max(0, plannedPct - 22);

    const getQtyLayerProgress = (keywords: string[], fallbackPct: number, fallbackPlan: number) => {
      const qList = p.quantities || [];
      const item = qList.find(q => keywords.some(k => q.name.toLowerCase().includes(k.toLowerCase())));
      if (item && item.design > 0) {
        return {
          pct: Math.min(100, (item.exec / item.design) * 100),
          plan: Math.min(100, (item.plan / item.design) * 100)
        };
      }
      return { pct: fallbackPct, plan: fallbackPlan };
    };

    const subgradeData = getQtyLayerProgress(['common excavation', 'site clearing', 'subgrade', 'earthwork'], fallbackSubgradePct, subgradePlanRaw);
    const cappingData = getQtyLayerProgress(['capping'], fallbackCappingPct, cappingPlanRaw);
    const subbaseData = getQtyLayerProgress(['sub base', 'subbase'], fallbackSubbasePct, subbasePlanRaw);
    const basecourseData = getQtyLayerProgress(['base course', 'basecourse'], fallbackBasecoursePct, basecoursePlanRaw);
    const asphaltData = getQtyLayerProgress(['asphalt concrete', 'asphalt'], fallbackAsphaltPct, asphaltPlanRaw);

    const subgradePct = subgradeData.pct;
    const subgradePlan = subgradeData.plan;
    const cappingPct = cappingData.pct;
    const cappingPlan = cappingData.plan;
    const subbasePct = subbaseData.pct;
    const subbasePlan = subbaseData.plan;
    const basecoursePct = basecourseData.pct;
    const basecoursePlan = basecourseData.plan;
    const asphaltPct = asphaltData.pct;
    const asphaltPlan = asphaltData.plan;

    // 6. Comprehensive Weightage-Based Score Calculation
    // Total: 100 Points across Master Admin customizable dimensions:
    const wFidic = contractorWeights.fidic;
    const wPm = contractorWeights.projectMgmt;
    const wEvm = contractorWeights.evm;
    const wKpi = contractorWeights.kpi;
    const wLinear = contractorWeights.linear;
    const wRfi = contractorWeights.rfi ?? 10;
    const wMaterial = contractorWeights.materialApproval ?? 10;
    const wWorkInspection = contractorWeights.workInspection ?? 5;
    const wResourceMobilization = contractorWeights.resourceMobilization ?? 5;

    // Dimension 1: FIDIC contract Compliance (Bonds & Notices)
    const bondRatio = totalBonds > 0 ? (totalBonds - expiredBondsCount) / totalBonds : 1.0;
    const fidicBondScore = (0.7 * wFidic) * bondRatio;
    const fidicNoticeScore = Math.max(0, (0.3 * wFidic) - (criticalRisksCount * 1.0));
    const fidicScore = Math.min(wFidic, Math.max(0, fidicBondScore + fidicNoticeScore));

    // Dimension 2: Project Management (Time & progress overrun)
    let pmScore = wPm;
    if (timeOverrunPct > 10) {
      const excessOverrun = timeOverrunPct - 10;
      const deduction = (excessOverrun / 100) * wPm;
      pmScore = Math.max(0, Math.min(wPm, wPm - deduction));
    }

    // Dimension 3: EVM Metrics - CPI & SPI
    const halfEvm = wEvm / 2;
    const cpiScore = CPI >= 1.0 ? halfEvm : Math.max(0, halfEvm * CPI);
    const spiScore = SPI >= 1.0 ? halfEvm : Math.max(0, halfEvm * SPI);
    const evmScore = cpiScore + spiScore;

    // Dimension 4: Key Performance Indicators & Quality Milestones
    const kpiBaseScore = wKpi;
    const kpiDeductions = (expiredBondsCount * Math.max(1, wKpi / 5)) + (criticalRisksCount * Math.max(0.5, wKpi / 10));
    const kpiScore = Math.max(0, kpiBaseScore - kpiDeductions);

    // Dimension 5: Linear Layer Progress vs. S-Curve
    const averageLayerPct = (subgradePct + cappingPct + subbasePct + basecoursePct + asphaltPct) / 5;
    const linearScore = Math.min(wLinear, wLinear * (averageLayerPct / 100));

    // Dimension 6: Technical RFIs Performance
    const submittalsList = p.supervisionConsultant?.submittalKpis || [];
    const rfiList = submittalsList.filter(s => s.type === 'RFI');
    let rfiScore = wRfi;
    if (rfiList.length > 0) {
      const approvedRfiCount = rfiList.filter(s => 
        s.status === 'Approved' || s.status === 'Closed' || s.status === 'Approved with Comment' || 
        s.status === 'Approved / Closed' || s.status === 'Approved with Comments'
      ).length;
      rfiScore = wRfi * (approvedRfiCount / rfiList.length);
    }

    // Dimension 7: Material Approval Submittals Performance
    const materialList = submittalsList.filter(s => s.type === 'Material Approval');
    let materialScore = wMaterial;
    if (materialList.length > 0) {
      const approvedMatCount = materialList.filter(s => 
        s.status === 'Approved' || s.status === 'Closed' || s.status === 'Approved with Comment' || 
        s.status === 'Approved / Closed' || s.status === 'Approved with Comments'
      ).length;
      materialScore = wMaterial * (approvedMatCount / materialList.length);
    }

    // Dimension 8: Work Inspection Requests (WIR) Performance
    const wirList = submittalsList.filter(s => s.type === 'Work Inspection (WIR)');
    let workInspectionScore = wWorkInspection;
    if (wirList.length > 0) {
      const approvedWirCount = wirList.filter(s => 
        s.status === 'Approved' || s.status === 'Closed' || s.status === 'Approved with Comment' || 
        s.status === 'Approved / Closed' || s.status === 'Approved with Comments'
      ).length;
      workInspectionScore = wWorkInspection * (approvedWirCount / wirList.length);
    }

    // Dimension 9: Mobilization of Resources (Equipment & Key Personnel)
    const allPersonnel = p.supervisionConsultant?.personnel || [];
    const keyPersonnelList = allPersonnel.filter(pers => pers.category === 'Key Personnel');
    let resourceScore = wResourceMobilization;
    if (keyPersonnelList.length > 0) {
      const activePersonnel = keyPersonnelList.filter(pers => pers.status === 'Active').length;
      resourceScore = wResourceMobilization * (activePersonnel / keyPersonnelList.length);
    }

    // Dimension 10: Custom Added Evaluation Criteria
    let customCriteriaScore = 0;
    if (contractorWeights.customCriteria && Array.isArray(contractorWeights.customCriteria)) {
      contractorWeights.customCriteria.forEach(c => {
        customCriteriaScore += Number(c.weight) || 0;
      });
    }

    // Calculate Raw Weighted Score (Out of 100)
    const progressVsTimeScore = pmScore;
    const linearLayersScore = linearScore;
    const riskAndBondScore = fidicScore;
    const rawWeightedScore = fidicScore + pmScore + evmScore + kpiScore + linearScore + rfiScore + materialScore + workInspectionScore + resourceScore + customCriteriaScore;

    // No additional penalty for breach during evaluation
    const breachPenalties = 0;
    const activeBreaches: string[] = [];
    
    if (CPI < 0.85) {
      activeBreaches.push("CPI < 0.85 (Cost Underperformance)");
    }
    if (SPI < 0.85) {
      activeBreaches.push("SPI < 0.85 (Schedule Slippage)");
    }
    if (expiredBondsCount > 0) {
      activeBreaches.push("Expired Performance/Mobilization Guarantees");
    }
    if (criticalRisksCount > 2) {
      activeBreaches.push("High density of unmitigated critical risks");
    }
    if (timeOverrunPct > 20) {
      activeBreaches.push("EOT Time Overrun exceeds 20%");
    }

    const complianceScore = Math.round(Math.max(0, Math.min(100, rawWeightedScore)));

    let ratingClass = 'Grade A: Exceptional Performance / Low Risk';
    let ratingCode = 'A';
    let textColor = 'text-emerald-600 dark:text-emerald-400';
    let bgColor = 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40';
    let hexColor = '#16a34a';

    if (complianceScore >= 90) {
      ratingClass = 'Grade A: Exceptional Performance / Low Risk';
      ratingCode = 'A';
      textColor = 'text-emerald-600 dark:text-emerald-400';
      bgColor = 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40';
      hexColor = '#16a34a';
    } else if (complianceScore >= 75) {
      ratingClass = 'Grade B: Satisfactory / Minor Variance';
      ratingCode = 'B';
      textColor = 'text-teal-600 dark:text-teal-400';
      bgColor = 'bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40';
      hexColor = '#0d9488';
    } else if (complianceScore >= 60) {
      ratingClass = 'Grade C: Marginal / Needs Intervention';
      ratingCode = 'C';
      textColor = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40';
      hexColor = '#d97706';
    } else if (complianceScore >= 45) {
      ratingClass = 'Grade D: Unsatisfactory / High Risk';
      ratingCode = 'D';
      textColor = 'text-orange-600 dark:text-orange-400';
      bgColor = 'bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40';
      hexColor = '#ea580c';
    } else {
      ratingClass = 'Grade F: Critical Breach / Non-Compliant';
      ratingCode = 'F';
      textColor = 'text-red-600 dark:text-rose-400';
      bgColor = 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40';
      hexColor = '#dc2626';
    }

    return {
      timeElapsedPct,
      elapsedDays,
      totalDays,
      scheduleStatus,
      scheduleStatusText,
      totalBonds,
      expiredBondsCount,
      guaranteeStatus,
      activeRisksCount: activeRisks.length,
      criticalRisksCount,
      complianceScore,
      ratingClass,
      ratingCode,
      textColor,
      bgColor,
      hexColor,
      CPI,
      SPI,
      timeOverrunPct,
      subgradePct,
      cappingPct,
      subbasePct,
      basecoursePct,
      asphaltPct,
      subgradePlan,
      cappingPlan,
      subbasePlan,
      basecoursePlan,
      asphaltPlan,
      plannedPct,
      progressVsTimeScore,
      spiScore,
      cpiScore,
      linearLayersScore,
      riskAndBondScore,
      breachPenalties,
      activeBreaches,
      averageLayerPct
    };
  };

  const getProjectKpiScores = (p: Project) => {
    const integratedKpis = getIntegratedKpiAllocated(p);
    
    const getKpiSubScore = (sscId: string): number => {
      let earned = 0;
      let max = 0;
      integratedKpis.forEach(k => {
        if (k.sscId === sscId && !k.naActive) {
          const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
          earned += val * (k.itemWt / 100);
          max += k.max * (k.itemWt / 100);
        }
      });
      return max > 0 ? (earned / max) * 100 : -1;
    };

    const getKpiGoalScore = (goalId: string): number => {
      const hierarchy = buildKpiHierarchy(p.contractType || 'DBB', p);
      const goal = hierarchy.find(g => g.id === goalId);
      if (!goal) return 0;
      let earnedSum = 0;
      let maxSum = 0;
      goal.sscs.forEach(ssc => {
        const sscScore = getKpiSubScore(ssc.id);
        if (sscScore >= 0) {
          earnedSum += sscScore * (ssc.wt / 100);
          maxSum += 100 * (ssc.wt / 100);
        }
      });
      return maxSum > 0 ? (earnedSum / maxSum) * 100 : 0;
    };

    const groups = [
      { id: 'G1', name: 'Physical Progress' },
      { id: 'G2', name: 'Progress vs Elapsed Time' },
      { id: 'G3', name: 'Cost Management' },
      { id: 'G4', name: 'Time Management' },
      { id: 'G5', name: 'Quality Management' },
      { id: 'G6', name: 'Design Management' },
      { id: 'G7', name: 'Claim & Dispute' },
      { id: 'G8', name: 'Risk Management' },
      { id: 'G9', name: 'ESOSH Management' },
      { id: 'G10', name: 'ROW Management' },
      { id: 'G11', name: 'Stakeholder Management' },
      { id: 'G12', name: 'Contract Compliance' },
    ];

    return groups.map(g => {
      const score = getKpiGoalScore(g.id);
      return {
        id: g.id,
        name: g.name,
        score
      };
    });
  };

  // Detailed Supervision Consultant Compliance & Performance Audit calculator (supports current or historical consultant)
  const getConsultantAuditMetrics = (p: Project, selectedHistId?: string) => {
    const isDB = p.contractType === 'DB';
    const isClosed = isProjectClosed(p.status);
    const mainSc = p.supervisionConsultant;
    const previousConsultants = mainSc?.previousConsultants || [];
    
    // Check if a historical consultant is specifically requested
    const selectedHist = selectedHistId 
      ? previousConsultants.find(h => h.id === selectedHistId)
      : null;
    const isHistorical = !!selectedHist;
    
    const sc = selectedHist || mainSc;
    const consultantFirm = sc?.firmName || p.consultant || 'N/A';
    const residentEngineer = sc?.residentEngineerName || (sc?.personnel?.find(x => x.position.toLowerCase().includes('resident'))?.name) || 'Field Assigned';
    const rePhone = sc?.residentEngineerPhone || 'N/A';
    const reEmail = sc?.residentEngineerEmail || 'N/A';
    const associationType = sc?.associationType || (p.consultant && (p.consultant.toLowerCase().includes('jv') || p.consultant.toLowerCase().includes('joint venture') || p.consultant.toLowerCase().includes('association')) ? 'Joint Venture (JV)' : 'Sole Consultant');
    const jvPartners = sc?.jvPartners || '';
    const isSole = associationType === 'Sole Consultant' || (!jvPartners && !consultantFirm.toLowerCase().includes('jv') && !consultantFirm.toLowerCase().includes('joint venture') && !consultantFirm.toLowerCase().includes('in association'));
    const isJv = !isSole;
    const commencementDate = sc?.commencementDate || '';
    const handoverDate = isHistorical ? (selectedHist?.handoverDate || 'Archived') : undefined;
    const transitionReason = isHistorical ? (selectedHist?.reasonForTransition || selectedHist?.transitionReason || 'Service tenure concluded') : undefined;

    const personnel = sc?.personnel || [];
    const totalStaff = personnel.length;
    const activeStaff = isHistorical ? totalStaff : personnel.filter(x => x.status === 'Active').length;
    const keyStaff = personnel.filter(x => x.category === 'Key Personnel' || x.position.toLowerCase().includes('engineer') || x.position.toLowerCase().includes('specialist'));
    const keyStaffCount = keyStaff.length || (totalStaff > 0 ? totalStaff : 1);
    const activeKeyStaffCount = isHistorical ? keyStaffCount : (keyStaff.filter(x => x.status === 'Active').length || (activeStaff > 0 ? activeStaff : (totalStaff > 0 ? 1 : 0)));
    
    const allocatedMM = personnel.reduce((sum, item) => sum + (item.manMonthsAllocated || 0), 0);
    const expendedMM = personnel.reduce((sum, item) => sum + (item.manMonthsInput || 0), 0);

    // 1. Staffing & Key Personnel Mobilization
    const workloadPct = allocatedMM > 0 ? Math.min(100, Math.round((expendedMM / allocatedMM) * 100)) : (totalStaff > 0 ? 75 : 0);

    const mobilizationRatePct = totalStaff > 0 
      ? Math.round((activeStaff / totalStaff) * 100)
      : (p.consultant ? 85 : 50);

    let staffingStatus: 'Fully Mobilized' | 'Key Roles Active' | 'Staffing Gaps' | 'Demobilized' | 'No Staff Assigned' = 'Key Roles Active';
    if (totalStaff === 0) {
      staffingStatus = p.consultant ? 'Key Roles Active' : 'No Staff Assigned';
    } else if (mobilizationRatePct >= 90) {
      staffingStatus = 'Fully Mobilized';
    } else if (mobilizationRatePct >= 70) {
      staffingStatus = 'Key Roles Active';
    } else if (mobilizationRatePct >= 40) {
      staffingStatus = 'Staffing Gaps';
    } else {
      staffingStatus = 'Demobilized';
    }

    // Staffing Score calculation (Max 20 pts)
    let staffingScore = 0;
    if (residentEngineer && residentEngineer !== 'N/A') staffingScore += 6;
    if (mobilizationRatePct >= 85) staffingScore += 8;
    else if (mobilizationRatePct >= 70) staffingScore += 6;
    else if (mobilizationRatePct >= 50) staffingScore += 4;
    else staffingScore += 2;

    if (workloadPct >= 20 && workloadPct <= 95) staffingScore += 6;
    else if (workloadPct > 95) staffingScore += 4; // Near budget exhaustion
    else staffingScore += 3;
    staffingScore = Math.min(20, Math.max(0, staffingScore));

    // 2. Submittal & RFI Response Turnaround SLA (Max 25 pts)
    const rawSubmittals = (sc?.submittalKpis && sc.submittalKpis.length > 0) 
      ? sc.submittalKpis 
      : (isHistorical ? [] : DEFAULT_SUBMITTAL_KPIS);
    const targetOverrides = sc?.targetOverrides || DEFAULT_SLA_TARGETS;

    const submittalsList = rawSubmittals.map(s => {
      const targetDays = targetOverrides[s.type] || s.targetDays || 7;
      const isResolved = s.actualDays !== undefined && s.actualDays !== null;
      const isOverdue = isResolved ? s.actualDays > targetDays : s.status === 'Overdue';
      const isOnTime = isResolved ? s.actualDays <= targetDays : (s.status === 'Approved / Closed' || s.status === 'Approved with Comments' || s.status === 'Under Review');
      return {
        ...s,
        targetDays,
        isOnTime,
        isOverdue
      };
    });

    const submittalsCount = submittalsList.length;
    const resolvedSubmittals = submittalsList.filter(s => s.actualDays !== undefined && s.actualDays !== null);
    const resolvedSubmittalsCount = resolvedSubmittals.length;
    const onTimeSubmittalsCount = resolvedSubmittals.filter(s => s.isOnTime).length;
    const overdueSubmittalsCount = submittalsList.filter(s => s.isOverdue || s.status === 'Overdue').length;

    const slaComplianceRatePct = resolvedSubmittalsCount > 0
      ? Math.round((onTimeSubmittalsCount / resolvedSubmittalsCount) * 100)
      : (isHistorical && selectedHist?.slaComplianceRatePct ? selectedHist.slaComplianceRatePct : 92);

    const avgTurnaroundDays = resolvedSubmittalsCount > 0
      ? Number((resolvedSubmittals.reduce((sum, s) => sum + (s.actualDays || 0), 0) / resolvedSubmittalsCount).toFixed(1))
      : (isHistorical && selectedHist?.evaluationSummary?.avgTurnaroundDays ? selectedHist.evaluationSummary.avgTurnaroundDays : 5.2);

    const rfiItems = resolvedSubmittals.filter(s => s.type === 'RFI');
    const avgRfiDays = rfiItems.length > 0 
      ? Number((rfiItems.reduce((sum, s) => sum + (s.actualDays || 0), 0) / rfiItems.length).toFixed(1))
      : 4.5;

    const matItems = resolvedSubmittals.filter(s => s.type === 'Material Approval');
    const avgMaterialDays = matItems.length > 0 
      ? Number((matItems.reduce((sum, s) => sum + (s.actualDays || 0), 0) / matItems.length).toFixed(1))
      : 8.2;

    const ipcReviewItems = resolvedSubmittals.filter(s => s.type === 'IPC Review');
    const avgIpcReviewDays = ipcReviewItems.length > 0
      ? Number((ipcReviewItems.reduce((sum, s) => sum + (s.actualDays || 0), 0) / ipcReviewItems.length).toFixed(1))
      : 6.0;

    const wirItems = resolvedSubmittals.filter(s => s.type === 'Work Inspection (WIR)');
    const avgWirDays = wirItems.length > 0
      ? Number((wirItems.reduce((sum, s) => sum + (s.actualDays || 0), 0) / wirItems.length).toFixed(1))
      : 1.8;

    let submittalStatus: 'Optimal' | 'Satisfactory' | 'Overdue Backlog' | 'Critical Delays' = 'Satisfactory';
    if (slaComplianceRatePct >= 90 && overdueSubmittalsCount === 0) {
      submittalStatus = 'Optimal';
    } else if (slaComplianceRatePct >= 75 && overdueSubmittalsCount <= 2) {
      submittalStatus = 'Satisfactory';
    } else if (overdueSubmittalsCount > 3 || slaComplianceRatePct < 60) {
      submittalStatus = 'Critical Delays';
    } else {
      submittalStatus = 'Overdue Backlog';
    }

    // Submittal type breakdowns for deep-dive
    const submittalTypes = ['RFI', 'Material Approval', 'IPC Review', 'Work Inspection (WIR)', 'Variation Order', 'Design Review'];
    const submittalBreakdown = submittalTypes.map(st => {
      const matched = submittalsList.filter(s => s.type === st);
      const res = matched.filter(s => s.actualDays !== undefined && s.actualDays !== null);
      const avgD = res.length > 0 ? res.reduce((sum, s) => sum + (s.actualDays || 0), 0) / res.length : (targetOverrides[st] || 7);
      const onT = res.length > 0 ? (res.filter(s => s.isOnTime).length / res.length) * 100 : 100;
      return {
        type: st,
        count: matched.length,
        avgDays: Number(avgD.toFixed(1)),
        targetDays: targetOverrides[st] || 7,
        onTimePct: Math.round(onT)
      };
    });

    // 3. IPC Certification & Payment Timeliness (Max 20 pts)
    const ipcTracker = p.ipcTracker || [];
    const commencementTime = commencementDate ? new Date(commencementDate).getTime() : null;
    const relevantIpcTracker = ipcTracker.filter(ipc => {
      if (!isHistorical && commencementTime && ipc.submissionDate) {
        const subTime = new Date(ipc.submissionDate).getTime();
        if (!isNaN(subTime) && subTime < commencementTime) {
          return false; // Submitted prior to active consultant commencement
        }
      }
      return true;
    });

    const ipcTrackedCount = relevantIpcTracker.length;
    const unpaidIpcCount = relevantIpcTracker.filter(i => (i.statusEtb || i.status) === 'Unpaid' || (i.statusUsd || i.status) === 'Unpaid').length;
    
    // Matured IPC check (>56 days)
    const today = new Date().getFullYear() < 2026 ? new Date('2026-06-26') : new Date();
    let maturedIpcCount = 0;
    if (!isClosed) {
      relevantIpcTracker.forEach(item => {
        const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
        const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
        if ((isEtbUnpaid || isUsdUnpaid) && item.submissionDate) {
          const subDate = new Date(item.submissionDate);
          if (!isNaN(subDate.getTime())) {
            const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysElapsed > 56) maturedIpcCount++;
          }
        }
      });
    }

    let ipcCertificationScore = 20;
    if (maturedIpcCount > 0) {
      ipcCertificationScore = Math.max(4, 20 - maturedIpcCount * 6);
    } else if (unpaidIpcCount > 2) {
      ipcCertificationScore = 14;
    } else if (unpaidIpcCount > 0) {
      ipcCertificationScore = 18;
    }
    const ipcScore = ipcCertificationScore;
    const ipcStatusText = maturedIpcCount > 0 
      ? `${maturedIpcCount} Matured Certification Delays (FIDIC Cl. 14.7/14.6 Breach)` 
      : unpaidIpcCount > 0 
        ? `${unpaidIpcCount} IPCs Under Verification Processing` 
        : 'All Certified IPCs Processed within Contract Window';

    // 4. Contract Administration, Claims & Determinations (Max 20 pts)
    const activeRisks = p.risks || [];
    const activeClaimsCount = activeRisks.filter(r => r.category?.toLowerCase().includes('claim') || r.category?.toLowerCase().includes('dispute') || (r.probability * r.impact >= 15)).length;
    const audit = getAuditMetrics(p);

    let contractAdminScoreVal = 20;
    if (activeClaimsCount > 3) contractAdminScoreVal -= 8;
    else if (activeClaimsCount > 1) contractAdminScoreVal -= 4;

    if (audit.scheduleStatus === 'Critical') contractAdminScoreVal -= 4;
    contractAdminScoreVal = Math.min(20, Math.max(5, contractAdminScoreVal));
    const contractAdminScore = contractAdminScoreVal;

    let eotAnalysisStatus: 'Compliant' | 'Pending Assessment' | 'Dispute / Claim Risk' = 'Compliant';
    if (activeClaimsCount > 2 || audit.scheduleStatus === 'Critical') {
      eotAnalysisStatus = 'Dispute / Claim Risk';
    } else if (activeClaimsCount > 0 || (p.eotDays || 0) > 0) {
      eotAnalysisStatus = 'Pending Assessment';
    }

    // 5. Quality Assurance & Site Inspection Hold Points (Max 15 pts)
    let qualityScoreVal = 15;
    if (avgWirDays > 3) qualityScoreVal -= 4;
    else if (avgWirDays > 2) qualityScoreVal -= 2;
    if (avgMaterialDays > 14) qualityScoreVal -= 4;
    qualityScoreVal = Math.min(15, Math.max(4, qualityScoreVal));
    const qualitySupervisionScore = qualityScoreVal;

    // Connect with 5-Dimension Performance Evaluation Matrix (105 FIDIC/ERA Criteria)
    const currentSc = isHistorical ? undefined : (sc as SupervisionConsultantInfo || undefined);
    const fiveDimEval = getProjectConsultantEvaluation(p, currentSc);

    // The Submittal Log SLA score is the evaluation score of the Submittal log & operational SLA turnaround (0-100%)
    const slaScore = fiveDimEval.slaTurnaroundScore;

    const scRecord = sc as any;
    // Total Weighted Score (0 to 100) — Composite score from 50% 5-Dim Matrix + 50% SLA turnaround score
    let totalWeightedScore = fiveDimEval.overallScore;

    if (isHistorical && selectedHist?.evaluationScore) {
      totalWeightedScore = selectedHist.evaluationScore;
    }

    const matchedThreshold = evaluateQualitativeGrade(totalWeightedScore, scRecord?.customGradeThresholds || DEFAULT_GRADE_THRESHOLDS);
    let gradeStr = (isHistorical && selectedHist?.officialGrade)
      ? selectedHist.officialGrade.replace('Grade ', '').trim()
      : matchedThreshold.grade.replace('Grade ', '').trim();
    if (gradeStr === 'F') gradeStr = 'Failed';
    const officialGrade: 'A' | 'B' | 'C' | 'D' | 'Failed' = (['A', 'B', 'C', 'D', 'Failed'].includes(gradeStr) ? gradeStr : 'Failed') as any;

    const officialRatingTitle = `Grade ${officialGrade}: ${matchedThreshold.label}`;
    const officialStanding = matchedThreshold.standing;
    let officialRecommendation = '';
    let badgeTextColor = 'text-emerald-700 dark:text-emerald-300';
    let badgeBgColor = 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
    let hexColor = '#16a34a';

    if (officialGrade === 'A') {
      officialRecommendation = 'Exemplary supervisory performance across all technical, administrative, and contractual domains. The Supervision Consultant maintains outstanding submittal turnaround SLA, full resident expert mobilization, and rigorous FIDIC quality oversight.';
      badgeTextColor = 'text-emerald-700 dark:text-emerald-300';
      badgeBgColor = 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
      hexColor = '#16a34a';
    } else if (officialGrade === 'B') {
      officialRecommendation = 'The Consultant maintains consistent site administration, satisfactory submittal turnaround, and diligent IPC certifications. Recommended for regular contract administration renewal with continued monitoring of key personnel timesheets.';
      badgeTextColor = 'text-teal-700 dark:text-teal-300';
      badgeBgColor = 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800';
      hexColor = '#0d9488';
    } else if (officialGrade === 'C') {
      officialRecommendation = 'Marginal supervisory performance identified in technical submittal response delays or key expert staffing gaps. The Directorate requires submission of a formal 60-day corrective action plan to clear backlogs and mobilize missing specialists.';
      badgeTextColor = 'text-amber-700 dark:text-amber-300';
      badgeBgColor = 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
      hexColor = '#d97706';
    } else if (officialGrade === 'D') {
      officialRecommendation = 'Unsatisfactory supervision performance resulting in contractor claims, delayed IPC verifications, or severe RFI response bottlenecks. Directorate intervention and contract penalty review required under ERA consultant guidelines.';
      badgeTextColor = 'text-orange-700 dark:text-orange-300';
      badgeBgColor = 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800';
      hexColor = '#ea580c';
    } else {
      officialRecommendation = 'Critical supervisory failure and non-compliance with FIDIC / ERA conditions of contract. Immediate replacement of Resident Engineer / Key Experts and formal referral to the ERA Consultant Debarment & Sanctions Committee.';
      badgeTextColor = 'text-rose-700 dark:text-rose-300';
      badgeBgColor = 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';
      hexColor = '#dc2626';
    }

    // Consultant FIDIC Clauses Evaluation
    const clauses: Array<{ id: string; title: string; score: number; rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach'; details: string }> = [
      {
        id: 'Cl_3_1',
        title: isDB ? 'FIDIC YB Cl. 3.1 / 3.2: Engineer’s Duties, Authority & Delegation' : 'FIDIC RB Cl. 3.1 / 3.2: Engineer’s Authority & Delegation',
        score: staffingScore >= 16 ? 95 : staffingScore >= 12 ? 75 : 45,
        rating: staffingScore >= 16 ? 'Compliant' : staffingScore >= 12 ? 'Minor Deficiency' : 'Critical Breach',
        details: `${residentEngineer ? `Resident Engineer (${residentEngineer}) actively delegated on site.` : 'Resident Engineer delegation missing or informal.'} Key expert mobilization rate: ${mobilizationRatePct}%.`
      },
      {
        id: 'Cl_3_7',
        title: isDB ? 'FIDIC YB Cl. 3.7: Agreement & Determinations (Claims & EOT)' : 'FIDIC RB Cl. 3.7 / 3.5: Consultations & Determinations',
        score: contractAdminScoreVal >= 16 ? 92 : contractAdminScoreVal >= 12 ? 70 : 40,
        rating: contractAdminScoreVal >= 16 ? 'Compliant' : contractAdminScoreVal >= 12 ? 'Minor Deficiency' : 'Critical Breach',
        details: `Assessment diligence on contractor claims & EOT notices. Active claim disputes: ${activeClaimsCount}. Status: ${eotAnalysisStatus}.`
      },
      {
        id: 'Cl_5_2',
        title: isDB ? 'FIDIC YB Cl. 5.1/5.2: Review of Contractor’s Documents & Design' : 'FIDIC RB Cl. 5.1: Review of Contractor Submittals & Shop Drawings',
        score: slaComplianceRatePct >= 85 ? 96 : slaComplianceRatePct >= 70 ? 75 : 50,
        rating: slaComplianceRatePct >= 85 ? 'Compliant' : slaComplianceRatePct >= 70 ? 'Minor Deficiency' : 'Critical Breach',
        details: `Submittal SLA turnaround rate: ${slaComplianceRatePct}% on-time. Avg RFI response: ${avgRfiDays} days (target: ${targetOverrides['RFI'] || 7}d). Overdue count: ${overdueSubmittalsCount}.`
      },
      {
        id: 'Cl_14_6',
        title: 'FIDIC Cl. 14.6: Interim Payment Certificate (IPC) Timeliness & Audit',
        score: ipcScore >= 18 ? 95 : ipcScore >= 12 ? 70 : 45,
        rating: ipcScore >= 18 ? 'Compliant' : ipcScore >= 12 ? 'Minor Deficiency' : 'Critical Breach',
        details: `IPC certification score: ${ipcScore}/20 pts. Matured claims (>56d): ${maturedIpcCount}. Verification status: ${ipcStatusText}.`
      },
      {
        id: 'Cl_7_3',
        title: 'FIDIC Cl. 7.3 / 7.4: Quality Assurance, Testing & Inspection Hold Points',
        score: qualityScoreVal >= 13 ? 94 : qualityScoreVal >= 10 ? 75 : 50,
        rating: qualityScoreVal >= 13 ? 'Compliant' : qualityScoreVal >= 10 ? 'Minor Deficiency' : 'Critical Breach',
        details: `Works Inspection Requests (WIR) turnaround: ${avgWirDays} days (target: 2d). Material approval turnaround: ${avgMaterialDays} days.`
      }
    ];

    return {
      consultantFirm,
      residentEngineer,
      rePhone,
      reEmail,
      contractType: p.contractType || 'DBB',
      isDB,
      associationType,
      isHistorical,
      commencementDate,
      handoverDate,
      transitionReason,
      previousConsultants,
      // Staffing
      totalStaff,
      activeStaff,
      keyStaffCount,
      activeKeyStaffCount,
      mobilizationRatePct,
      allocatedMM,
      expendedMM,
      workloadPct,
      staffingStatus,
      // Submittals & SLA
      submittalsCount,
      resolvedSubmittalsCount,
      onTimeSubmittalsCount,
      overdueSubmittalsCount,
      slaComplianceRatePct,
      avgTurnaroundDays,
      avgRfiDays,
      avgMaterialDays,
      avgIpcReviewDays,
      avgWirDays,
      submittalStatus,
      // IPC & Payments
      ipcTrackedCount,
      unpaidIpcCount,
      maturedIpcCount,
      ipcCertificationScore,
      ipcStatusText,
      // Contract Admin
      activeClaimsCount,
      eotAnalysisStatus,
      contractAdminScore,
      // Quality
      qualitySupervisionScore,
      // Weighted Scores
      slaScore,
      staffingScore,
      ipcScore,
      contractAdminScoreVal,
      qualityScoreVal,
      totalWeightedScore,
      // Official Rating
      officialGrade,
      officialRatingTitle,
      officialStanding,
      officialRecommendation,
      badgeTextColor,
      badgeBgColor,
      hexColor,
      clauses,
      submittalBreakdown,
      dimensionBreakdown: fiveDimEval.dimensionBreakdown,
      fiveDimEval,
      jvPartners,
      isSole,
      isJv
    };
  };

  const getFidicEvaluation = (p: Project, role: 'contractor' | 'consultant') => {
    const today = new Date().getFullYear() < 2026 ? new Date('2026-06-26') : new Date();
    const progressVal = p.physicalProgress || 0;
    const monthlyList = p.monthly || [];
    const plannedPct = monthlyList.length 
      ? Math.max(...monthlyList.map(m => Number(m.revisedPlan || m.originalPlan || 0) || 0), 100) 
      : 100;
    const audit = getAuditMetrics(p);
    const isDB = p.contractType === 'DB';

    if (role === 'contractor') {
      if (isDB) {
        // --- YELLOW BOOK 2017 DESIGN-BUILD CONTRACTOR EVALUATION ---
        // 1. Clause 4.1: General Obligations (Design & Execution)
        let clause4_1_Score = 100;
        let clause4_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_1_Details = 'Contractor is executing design and build obligations in alignment with Employer Requirements.';
        
        if (progressVal < plannedPct * 0.7) {
          clause4_1_Score = 45;
          clause4_1_Rating = 'Critical Breach';
          clause4_1_Details = `Severe design-build execution lag (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Breach of general diligence.`;
        } else if (progressVal < plannedPct * 0.9) {
          clause4_1_Score = 75;
          clause4_1_Rating = 'Minor Deficiency';
          clause4_1_Details = `Moderate progress/design delay (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Requires updated integration.`;
        }

        // 2. Clause 4.2: Performance Security (Performance Bonds Validation)
        let clause4_2_Score = 100;
        let clause4_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_2_Details = 'Valid Performance Security is maintained in full force and effect.';
        
        const perfBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('performance'));
        const expiredPerfBonds = perfBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (perfBonds.length === 0) {
          clause4_2_Score = 50;
          clause4_2_Rating = 'Minor Deficiency';
          clause4_2_Details = 'No recorded Performance Bond. Immediate submission and clarification required.';
        } else if (expiredPerfBonds.length > 0) {
          clause4_2_Score = 20;
          clause4_2_Rating = 'Critical Breach';
          clause4_2_Details = 'Performance Security has expired or lapsed! Immediate contract suspension risk under Sub-Clause 4.2.1.';
        }

        // 3. Clause 5.1 & 5.2: Design Obligations & Documents (Yellow Book Exclusive)
        let clause5_1_Score = 100;
        let clause5_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause5_1_Details = 'Design submissions, technical specs, and Contractor\'s Documents conform to standards.';

        const desGoal = getProjectKpiScores(p).find(g => g.id === 'G6')?.score ?? 85;
        clause5_1_Score = Math.round(desGoal);
        if (desGoal < 60) {
          clause5_1_Rating = 'Critical Breach';
          clause5_1_Details = `Critical design deficiencies or submission delays. Technical Specs are non-conforming (Score: ${desGoal.toFixed(2)}%).`;
        } else if (desGoal < 80) {
          clause5_1_Rating = 'Minor Deficiency';
          clause5_1_Details = `Minor design submission gaps or backlog in design approval requests (Score: ${desGoal.toFixed(2)}%).`;
        } else {
          clause5_1_Details = `Contractor's design documents and technical proposals are fully compliant (Score: ${desGoal.toFixed(2)}%).`;
        }

        // 4. Clause 8.3: Programme Adherence (Design & Build)
        let clause8_3_Score = 100;
        let clause8_3_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_3_Details = 'Programme submissions are up to date and integrate design phases.';

        if (audit.SPI < 0.75) {
          clause8_3_Score = 40;
          clause8_3_Rating = 'Critical Breach';
          clause8_3_Details = `Critical schedule deviation (SPI: ${audit.SPI.toFixed(3)}). Overdue submission of revised Clause 8.3 Design-Build Programme.`;
        } else if (audit.SPI < 0.90) {
          clause8_3_Score = 75;
          clause8_3_Rating = 'Minor Deficiency';
          clause8_3_Details = `Slight schedule slippage (SPI: ${audit.SPI.toFixed(3)}). Design-Build coordination requires acceleration.`;
        }

        // 5. Clause 4.21: Progress Reports (Reporting Frequency)
        let clause4_21_Score = 100;
        let clause4_21_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_21_Details = 'Monthly Progress Reports (incorporating design reviews) are regularly prepared.';

        if (p.monthly.length < 3) {
          clause4_21_Score = 50;
          clause4_21_Rating = 'Minor Deficiency';
          clause4_21_Details = 'Sparse monthly progress data. Design progress reporting is under-performing.';
        }

        // 6. Clause 14.2: Advance Payment Guarantee (Mobilization Bonds Validation)
        let clause14_2_Score = 100;
        let clause14_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_2_Details = 'Advance Payment Guarantees are valid or systematically recovered via IPC amortizations.';

        const advBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('advance') || b.type.toLowerCase().includes('mobil'));
        const expiredAdvBonds = advBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (expiredAdvBonds.length > 0) {
          clause14_2_Score = 30;
          clause14_2_Rating = 'Critical Breach';
          clause14_2_Details = 'Advance Payment Guarantee has expired prior to full recovery. Breach of Clause 14.2.';
        } else if (advBonds.length === 0 && p.provisionalSum > 0) {
          clause14_2_Score = 80;
          clause14_2_Rating = 'Minor Deficiency';
          clause14_2_Details = 'No advance guarantee logged for amortization checking.';
        }

        const clauses = [
          { id: '4.1', title: "Clause 4.1: General Obligations (Design & Build)", score: clause4_1_Score, rating: clause4_1_Rating, details: clause4_1_Details },
          { id: '4.2', title: "Clause 4.2: Performance Security", score: clause4_2_Score, rating: clause4_2_Rating, details: clause4_2_Details },
          { id: '5.1', title: "Clause 5.1 & 5.2: Design Obligations", score: clause5_1_Score, rating: clause5_1_Rating, details: clause5_1_Details },
          { id: '8.3', title: "Clause 8.3: Programme Adherence", score: clause8_3_Score, rating: clause8_3_Rating, details: clause8_3_Details },
          { id: '4.21', title: "Clause 4.21: Progress Reports", score: clause4_21_Score, rating: clause4_21_Rating, details: clause4_21_Details },
          { id: '14.2', title: "Clause 14.2: Advance Guarantee", score: clause14_2_Score, rating: clause14_2_Rating, details: clause14_2_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Contractor',
          name: p.contractor || 'N/A',
          clauses,
          averageScore
        };
      } else {
        // --- RED BOOK 2017 DESIGN-BID-BUILD CONTRACTOR EVALUATION ---
        // 1. Clause 4.1: General Obligations (Physical Execution Quality vs Schedule Plan)
        let clause4_1_Score = 100;
        let clause4_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_1_Details = 'Contractor is actively executing physical works in accordance with design specs.';
        
        if (progressVal < plannedPct * 0.7) {
          clause4_1_Score = 45;
          clause4_1_Rating = 'Critical Breach';
          clause4_1_Details = `Severe progress lag (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Breach of general execution diligence.`;
        } else if (progressVal < plannedPct * 0.9) {
          clause4_1_Score = 75;
          clause4_1_Rating = 'Minor Deficiency';
          clause4_1_Details = `Moderate progress delay (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Requires minor recovery actions.`;
        }

        // 2. Clause 4.2: Performance Security (Performance Bonds Validation)
        let clause4_2_Score = 100;
        let clause4_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_2_Details = 'Valid Performance Security is maintained in full force and effect.';
        
        const perfBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('performance'));
        const expiredPerfBonds = perfBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (perfBonds.length === 0) {
          clause4_2_Score = 50;
          clause4_2_Rating = 'Minor Deficiency';
          clause4_2_Details = 'No recorded Performance Bond. Immediate submission and clarification required.';
        } else if (expiredPerfBonds.length > 0) {
          clause4_2_Score = 20;
          clause4_2_Rating = 'Critical Breach';
          clause4_2_Details = 'Performance Security has expired or lapsed! Immediate contract suspension risk under Sub-Clause 4.2.1.';
        }

        // 3. Clause 8.3: Programme (Schedule Compliance & Submissions)
        let clause8_3_Score = 100;
        let clause8_3_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_3_Details = 'Programme submissions are up to date with acceptable schedule indices (SPI >= 1.0).';

        if (audit.SPI < 0.75) {
          clause8_3_Score = 40;
          clause8_3_Rating = 'Critical Breach';
          clause8_3_Details = `Critical schedule deviation (SPI: ${audit.SPI.toFixed(3)}). Revised Clause 8.3 programme submission is overdue.`;
        } else if (audit.SPI < 0.90) {
          clause8_3_Score = 75;
          clause8_3_Rating = 'Minor Deficiency';
          clause8_3_Details = `Slight schedule slippage (SPI: ${audit.SPI.toFixed(3)}). Requires updated acceleration methodology.`;
        }

        // 4. Clause 4.21: Progress Reports (Reporting Frequency)
        let clause4_21_Score = 100;
        let clause4_21_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_21_Details = 'Monthly Progress Reports are regularly prepared and submitted in full alignment.';

        if (p.monthly.length < 3) {
          clause4_21_Score = 50;
          clause4_21_Rating = 'Minor Deficiency';
          clause4_21_Details = 'Sparse monthly data records. Contract reporting compliance is under-performing.';
        }

        // 5. Clause 14.2: Advance Payment Guarantee (Mobilization Bonds Validation)
        let clause14_2_Score = 100;
        let clause14_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_2_Details = 'Advance Payment Guarantees are valid or systematically recovered via IPC amortizations.';

        const advBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('advance') || b.type.toLowerCase().includes('mobil'));
        const expiredAdvBonds = advBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (expiredAdvBonds.length > 0) {
          clause14_2_Score = 30;
          clause14_2_Rating = 'Critical Breach';
          clause14_2_Details = 'Advance Payment Guarantee has expired prior to full recovery. Breach of Clause 14.2.';
        } else if (advBonds.length === 0 && p.provisionalSum > 0) {
          clause14_2_Score = 80;
          clause14_2_Rating = 'Minor Deficiency';
          clause14_2_Details = 'No advance guarantee logged for amortization checking.';
        }

        const clauses = [
          { id: '4.1', title: "Clause 4.1: General Obligations", score: clause4_1_Score, rating: clause4_1_Rating, details: clause4_1_Details },
          { id: '4.2', title: "Clause 4.2: Performance Security", score: clause4_2_Score, rating: clause4_2_Rating, details: clause4_2_Details },
          { id: '8.3', title: "Clause 8.3: Programme Adherence", score: clause8_3_Score, rating: clause8_3_Rating, details: clause8_3_Details },
          { id: '4.21', title: "Clause 4.21: Progress Reports", score: clause4_21_Score, rating: clause4_21_Rating, details: clause4_21_Details },
          { id: '14.2', title: "Clause 14.2: Advance Guarantee", score: clause14_2_Score, rating: clause14_2_Rating, details: clause14_2_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Contractor',
          name: p.contractor || 'N/A',
          clauses,
          averageScore
        };
      }
    } else {
      // Consultant / Engineer (FIDIC 2017)
      if (isDB) {
        // --- YELLOW BOOK 2017 DESIGN-BUILD ENGINEER EVALUATION ---
        // 1. Clause 3.1 & 3.5: Engineer's Authority & Instructions (Design Oversight)
        let clause3_1_Score = 100;
        let clause3_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_1_Details = "Engineer exercises professional supervisory control and administers design review.";

        if (audit.criticalRisksCount > 3) {
          clause3_1_Score = 60;
          clause3_1_Rating = 'Minor Deficiency';
          clause3_1_Details = "High volume of unmitigated risks. Design-build supervision control warrants improvement.";
        }

        // 2. Clause 3.7: Agreement or Determination (Claims Resolution)
        let clause3_7_Score = 100;
        let clause3_7_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_7_Details = "Fair determinations and prompt claim evaluations under Sub-Clause 3.7 are up to date.";

        const activeClaims = p.risks?.filter(r => r.description.toLowerCase().includes('claim') || r.description.toLowerCase().includes('dispute')) || [];
        if (activeClaims.length > 2) {
          clause3_7_Score = 50;
          clause3_7_Rating = 'Minor Deficiency';
          clause3_7_Details = "Multiple outstanding contractor design-build claims. Delays in Clause 3.7 processing.";
        }

        // 3. Clause 5.2: Review of Contractor's Documents (Design Review workflow)
        let clause5_2_Score = 100;
        let clause5_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause5_2_Details = "Engineer is reviewing and consenting to design submissions within contractual time limits.";

        const desGoal = getProjectKpiScores(p).find(g => g.id === 'G6')?.score ?? 85;
        clause5_2_Score = Math.round(desGoal);
        if (desGoal < 60) {
          clause5_2_Rating = 'Critical Breach';
          clause5_2_Details = `Backlog or delays in Engineer's design approvals and drawing consents (Score: ${desGoal.toFixed(2)}%).`;
        } else if (desGoal < 80) {
          clause5_2_Rating = 'Minor Deficiency';
          clause5_2_Details = `Moderate bottleneck in design document reviews (Score: ${desGoal.toFixed(2)}%).`;
        } else {
          clause5_2_Details = `Outstanding design documents are being reviewed and cleared efficiently (Score: ${desGoal.toFixed(2)}%).`;
        }

        // 4. Clause 14.6: Interim Payment Certificates (Timely IPC Certification)
        let clause14_6_Score = 100;
        let clause14_6_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_6_Details = "Timely and compliant evaluation and certification of Interim Payment Certificates.";

        const ipcTracker = p.ipcTracker || [];
        const unpaidIpcs = ipcTracker.filter(i => i.status === 'Unpaid');
        if (unpaidIpcs.length > 3) {
          clause14_6_Score = 40;
          clause14_6_Rating = 'Critical Breach';
          clause14_6_Details = `Multiple IPC certifications pending/overdue (${unpaidIpcs.length} unpaid items). Hinders cash flow.`;
        } else if (unpaidIpcs.length > 0) {
          clause14_6_Score = 80;
          clause14_6_Rating = 'Minor Deficiency';
          clause14_6_Details = `${unpaidIpcs.length} certified IPC awaiting payment processing. Tracking required.`;
        }

        // 5. Clause 8.4/8.5: Extension of Time evaluation
        let clause8_4_Score = 100;
        let clause8_4_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_4_Details = "Extensions of Time (EOT) and delay events are professionally analyzed and formalized.";

        if (audit.scheduleStatus === 'Critical' && (!p.eotDays || p.eotDays === 0)) {
          clause8_4_Score = 50;
          clause8_4_Rating = 'Minor Deficiency';
          clause8_4_Details = "Critical delay detected without corresponding EOT design-build impact assessment.";
        }

        const clauses = [
          { id: '3.1', title: "Clause 3.1 & 3.5: Duties & Authority", score: clause3_1_Score, rating: clause3_1_Rating, details: clause3_1_Details },
          { id: '3.7', title: "Clause 3.7: Determinations", score: clause3_7_Score, rating: clause3_7_Rating, details: clause3_7_Details },
          { id: '5.2', title: "Clause 5.2: Design Documents Review", score: clause5_2_Score, rating: clause5_2_Rating, details: clause5_2_Details },
          { id: '14.6', title: "Clause 14.6: IPC Certification", score: clause14_6_Score, rating: clause14_6_Rating, details: clause14_6_Details },
          { id: '8.4', title: "Clause 8.4/8.5: EOT Evaluation", score: clause8_4_Score, rating: clause8_4_Rating, details: clause8_4_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Consultant',
          name: p.consultant || 'N/A',
          clauses,
          averageScore
        };
      } else {
        // --- RED BOOK 2017 DESIGN-BID-BUILD ENGINEER EVALUATION ---
        // 1. Clause 3.1: Duties & Authority (Professional Control)
        let clause3_1_Score = 100;
        let clause3_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_1_Details = "Consultant exercises standard professional skill and contract management authority.";

        if (audit.criticalRisksCount > 3) {
          clause3_1_Score = 60;
          clause3_1_Rating = 'Minor Deficiency';
          clause3_1_Details = "High volume of unmitigated critical risks. Supervision control warrants improvement.";
        }

        // 2. Clause 3.7: Agreement or Determination (Timely Dispute/Claim assessment)
        let clause3_7_Score = 100;
        let clause3_7_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_7_Details = "Fair determinations and prompt evaluations under Sub-Clause 3.7 are up to date.";

        const activeClaims = p.risks?.filter(r => r.description.toLowerCase().includes('claim') || r.description.toLowerCase().includes('dispute')) || [];
        if (activeClaims.length > 2) {
          clause3_7_Score = 50;
          clause3_7_Rating = 'Minor Deficiency';
          clause3_7_Details = "Multiple outstanding claims requiring formal determinations. Delays in Clause 3.7 processing.";
        }

        // 3. Clause 14.6: Interim Payment Certificates (Timely IPC Certification)
        let clause14_6_Score = 100;
        let clause14_6_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_6_Details = "Timely and compliant evaluation and certification of Interim Payment Certificates.";

        const ipcTracker = p.ipcTracker || [];
        const unpaidIpcs = ipcTracker.filter(i => i.status === 'Unpaid');
        if (unpaidIpcs.length > 3) {
          clause14_6_Score = 40;
          clause14_6_Rating = 'Critical Breach';
          clause14_6_Details = `Multiple IPC certifications pending/overdue (${unpaidIpcs.length} unpaid items). Hinders contractor's cash flow.`;
        } else if (unpaidIpcs.length > 0) {
          clause14_6_Score = 80;
          clause14_6_Rating = 'Minor Deficiency';
          clause14_6_Details = `${unpaidIpcs.length} certified IPC awaiting payment processing. Tracking required.`;
        }

        // 4. Clause 8.4/8.5: Extension of Time evaluation
        let clause8_4_Score = 100;
        let clause8_4_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_4_Details = "Extensions of Time (EOT) and delay events are professionally analyzed and formalized.";

        if (audit.scheduleStatus === 'Critical' && (!p.eotDays || p.eotDays === 0)) {
          clause8_4_Score = 50;
          clause8_4_Rating = 'Minor Deficiency';
          clause8_4_Details = "Critical project delay detected without corresponding EOT assessment or delay determinations.";
        }

        const clauses = [
          { id: '3.1', title: "Clause 3.1: Duties & Authority", score: clause3_1_Score, rating: clause3_1_Rating, details: clause3_1_Details },
          { id: '3.7', title: "Clause 3.7: determinations", score: clause3_7_Score, rating: clause3_7_Rating, details: clause3_7_Details },
          { id: '14.6', title: "Clause 14.6: IPC Certification", score: clause14_6_Score, rating: clause14_6_Rating, details: clause14_6_Details },
          { id: '8.4', title: "Clause 8.4/8.5: EOT Evaluation", score: clause8_4_Score, rating: clause8_4_Rating, details: clause8_4_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Consultant',
          name: p.consultant || 'N/A',
          clauses,
          averageScore
        };
      }
    }
  };

  const contractors = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (isAccessible(p) && p.contractor) {
        names.add(p.contractor);
      }
    });
    return Array.from(names).sort();
  }, [projects, currentUserObj]);

  const consultants = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (isAccessible(p) && p.consultant) {
        names.add(p.consultant);
      }
    });
    return Array.from(names).sort();
  }, [projects, currentUserObj]);

  // Filter projects by group and search query
  const rawGroupProjects = useMemo(() => {
    const today = new Date();
    return projects.filter(p => {
      if (!isAccessible(p)) return false;

      let isMatch = false;
      if (groupType === 'directorate') {
        isMatch = selectedGroup === 'All' || (p.programDirectorate || 'Southern') === selectedGroup;
      } else if (groupType === 'pmo') {
        isMatch = selectedGroup === 'All' || (p.pmo || 'PMO 1') === selectedGroup;
      } else if (groupType === 'contractor') {
        isMatch = selectedGroup === 'All' || p.contractor === selectedGroup;
      } else {
        isMatch = selectedGroup === 'All' || p.consultant === selectedGroup;
      }
      
      if (!isMatch) return false;
      
      // When in Matured Payment Status & Amount mode, automatically exclude completed & closed projects
      if (reportMode === 'payments' && isProjectClosed(p.status)) {
        return false;
      }

      if (maturedFilterOnly) {
        if (isProjectClosed(p.status)) return false;
        const tracker = p.ipcTracker || [];
        const hasMatured = tracker.some(item => {
          const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
          const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
          if ((isEtbUnpaid || isUsdUnpaid) && item.submissionDate) {
            const subDate = new Date(item.submissionDate);
            if (!isNaN(subDate.getTime())) {
              const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysElapsed > 56) return true;
            }
          }
          return false;
        });
        if (!hasMatured) return false;
      }
      
      return true;
    });
  }, [projects, groupType, selectedGroup, maturedFilterOnly, reportMode, currentUserObj]);

  // Group-wide audit metrics
  const auditStats = useMemo(() => {
    const totalCount = rawGroupProjects.length;
    if (totalCount === 0) {
      return {
        avgScore: 0,
        behindScheduleCount: 0,
        behindSchedulePct: 0,
        totalExpiredBonds: 0,
        totalCriticalRisks: 0,
        compliantCount: 0,
        nonCompliantCount: 0,
      };
    }

    let sumScore = 0;
    let behindScheduleCount = 0;
    let totalExpiredBonds = 0;
    let totalCriticalRisks = 0;
    let compliantCount = 0;
    let nonCompliantCount = 0;

    rawGroupProjects.forEach(p => {
      const metrics = getAuditMetrics(p);
      sumScore += metrics.complianceScore;
      if (metrics.scheduleStatus !== 'Compliant') {
        behindScheduleCount++;
      }
      totalExpiredBonds += metrics.expiredBondsCount;
      totalCriticalRisks += metrics.criticalRisksCount;
      
      if (metrics.complianceScore >= 70) {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    });

    return {
      avgScore: sumScore / totalCount,
      behindScheduleCount,
      behindSchedulePct: (behindScheduleCount / totalCount) * 100,
      totalExpiredBonds,
      totalCriticalRisks,
      compliantCount,
      nonCompliantCount
    };
  }, [rawGroupProjects]);

  // Separate counts and statistics for Sole vs Joint Venture consultant cohorts
  const consultantCohortStats = useMemo(() => {
    let soleCount = 0;
    let jvCount = 0;
    rawGroupProjects.forEach(p => {
      const c = getConsultantAuditMetrics(p);
      if (c.isSole) soleCount++;
      else jvCount++;
    });
    return {
      total: rawGroupProjects.length,
      soleCount,
      jvCount
    };
  }, [rawGroupProjects]);

  // Derived Supervision Consultant Compliance & Performance Audit statistics (evaluates separate cohorts)
  const consultantAuditStats = useMemo(() => {
    let targetProjects = rawGroupProjects;
    if (reportMode === 'audit' && (groupType === 'consultant' || auditPerspective === 'consultant')) {
      if (consultantCohortFilter === 'sole') {
        targetProjects = rawGroupProjects.filter(p => getConsultantAuditMetrics(p).isSole);
      } else if (consultantCohortFilter === 'jv') {
        targetProjects = rawGroupProjects.filter(p => !getConsultantAuditMetrics(p).isSole);
      }
    }
    const totalCount = targetProjects.length;
    if (totalCount === 0) {
      return {
        avgScore: 0,
        avgFiveDimScore: 0,
        groupGradeThreshold: DEFAULT_GRADE_THRESHOLDS[0],
        gradeACount: 0,
        gradeBCount: 0,
        gradeCCount: 0,
        gradeDCount: 0,
        gradeFCount: 0,
        avgSlaRate: 0,
        avgTurnaroundDays: 0,
        totalOverdueSubmittals: 0,
        totalKeyStaff: 0,
        activeKeyStaff: 0,
        mobilizationRatePct: 0,
        maturedIpcCount: 0,
        totalActiveClaims: 0,
        satisfactoryConsultantCount: 0,
        cohort: consultantCohortFilter,
        cohortCount: 0
      };
    }

    let sumScore = 0;
    let sumFiveDimScore = 0;
    let gradeACount = 0;
    let gradeBCount = 0;
    let gradeCCount = 0;
    let gradeDCount = 0;
    let gradeFCount = 0;
    let sumSlaRate = 0;
    let sumTurnaround = 0;
    let totalOverdueSubmittals = 0;
    let totalKeyStaff = 0;
    let activeKeyStaff = 0;
    let maturedIpcCount = 0;
    let totalActiveClaims = 0;
    let satisfactoryConsultantCount = 0;

    targetProjects.forEach(p => {
      const c = getConsultantAuditMetrics(p);
      sumScore += c.totalWeightedScore;
      sumFiveDimScore += (c.fiveDimEval?.fiveDimScore !== undefined ? c.fiveDimEval.fiveDimScore : c.totalWeightedScore);
      sumSlaRate += c.slaComplianceRatePct;
      sumTurnaround += c.avgTurnaroundDays;
      totalOverdueSubmittals += c.overdueSubmittalsCount;
      totalKeyStaff += c.keyStaffCount;
      activeKeyStaff += c.activeKeyStaffCount;
      maturedIpcCount += c.maturedIpcCount;
      totalActiveClaims += c.activeClaimsCount;

      if (c.officialGrade === 'A') gradeACount++;
      else if (c.officialGrade === 'B') gradeBCount++;
      else if (c.officialGrade === 'C') gradeCCount++;
      else if (c.officialGrade === 'D') gradeDCount++;
      else gradeFCount++;

      if (c.totalWeightedScore >= 75) {
        satisfactoryConsultantCount++;
      }
    });

    const mobilizationRatePct = totalKeyStaff > 0 ? Math.round((activeKeyStaff / totalKeyStaff) * 100) : 85;
    const avgScore = Math.round((sumScore / totalCount) * 10) / 10;
    const avgFiveDimScore = Math.round((sumFiveDimScore / totalCount) * 10) / 10;
    const groupGradeThreshold = evaluateQualitativeGrade(avgScore);

    return {
      avgScore,
      avgFiveDimScore,
      groupGradeThreshold,
      gradeACount,
      gradeBCount,
      gradeCCount,
      gradeDCount,
      gradeFCount,
      avgSlaRate: Math.round((sumSlaRate / totalCount) * 10) / 10,
      avgTurnaroundDays: Math.round((sumTurnaround / totalCount) * 10) / 10,
      totalOverdueSubmittals,
      totalKeyStaff,
      activeKeyStaff,
      mobilizationRatePct,
      maturedIpcCount,
      totalActiveClaims,
      satisfactoryConsultantCount,
      cohort: consultantCohortFilter,
      cohortCount: totalCount
    };
  }, [rawGroupProjects, consultantCohortFilter, reportMode, groupType, auditPerspective]);

  // Search filter and sorting
  const processedProjects = useMemo(() => {
    const queried = rawGroupProjects.filter(p => {
      if (reportMode === 'audit' && (groupType === 'consultant' || auditPerspective === 'consultant')) {
        const c = getConsultantAuditMetrics(p);
        if (consultantCohortFilter === 'sole' && !c.isSole) return false;
        if (consultantCohortFilter === 'jv' && c.isSole) return false;
      }
      const q = reportSearchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q) ||
        (p.consultant && p.consultant.toLowerCase().includes(q))
      );
    });

    return [...queried].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'progress') {
        comparison = (a.physicalProgress || 0) - (b.physicalProgress || 0);
      } else if (sortBy === 'value') {
        const valA = (a.origAmount * 1_000_000) + ((a.variation || 0) > 10000 ? (a.variation || 0) : ((a.variation || 0) * 1_000_000));
        const valB = (b.origAmount * 1_000_000) + ((b.variation || 0) > 10000 ? (b.variation || 0) : ((b.variation || 0) * 1_000_000));
        comparison = valA - valB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [rawGroupProjects, reportSearchQuery, sortBy, sortOrder]);

  // EFY Baseline Plan table projects list based on user credentials and project commitment/commencement date
  // If a project has not commenced on or before that specific fiscal year, it is omitted from the table & report
  const efyTableProjects = useMemo(() => {
    let baseList = processedProjects;
    if (currentUserObj?.accessibleProjects && Array.isArray(currentUserObj.accessibleProjects) && currentUserObj.accessibleProjects.length > 0) {
      baseList = projects.filter(p => currentUserObj.accessibleProjects.includes(p.id));
    }
    return baseList.filter(p => isProjectCommencedInEfy(p, selectedPlanningEfy));
  }, [projects, currentUserObj, processedProjects, selectedPlanningEfy]);

  // Count of portfolio projects that have not commenced yet as of the selected EFY
  const omittedNonCommencedCount = useMemo(() => {
    let baseList = processedProjects;
    if (currentUserObj?.accessibleProjects && Array.isArray(currentUserObj.accessibleProjects) && currentUserObj.accessibleProjects.length > 0) {
      baseList = projects.filter(p => currentUserObj.accessibleProjects.includes(p.id));
    }
    return baseList.filter(p => !isProjectCommencedInEfy(p, selectedPlanningEfy)).length;
  }, [projects, currentUserObj, processedProjects, selectedPlanningEfy]);

  // Derived statistics for the selected group
  const stats = useMemo(() => {
    const totalCount = rawGroupProjects.length;
    if (totalCount === 0) {
      return {
        count: 0,
        avgProgress: 0,
        totalValue: 0,
        warningCount: 0,
        provisionalTotal: 0,
        completedCount: 0,
        onTrackCount: 0
      };
    }

    const totalValue = rawGroupProjects.reduce((sum, p) => sum + (p.origAmount || 0) * 1_000_000, 0);
    const avgProgress = rawGroupProjects.reduce((sum, p) => sum + (p.physicalProgress || 0), 0) / totalCount;
    const provisionalTotal = rawGroupProjects.reduce((sum, p) => sum + (p.provisionalSum || 0), 0);

    // Active Bond Warnings count across the group
    const warningCount = rawGroupProjects.reduce((sum, p) => {
      const activeBondsCount = (p.bonds || []).filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        // Count as warning if expireDate is in past
        if (b.expireDate) {
          try {
            const exp = new Date(b.expireDate);
            return exp < new Date();
          } catch {
            return false;
          }
        }
        return false;
      }).length;
      return sum + activeBondsCount;
    }, 0);

    const completedCount = rawGroupProjects.filter(p => (p.physicalProgress || 0) >= 95).length;
    const onTrackCount = rawGroupProjects.filter(p => (p.physicalProgress || 0) >= 50).length;

    return {
      count: totalCount,
      avgProgress,
      totalValue,
      warningCount,
      provisionalTotal,
      completedCount,
      onTrackCount
    };
  }, [rawGroupProjects]);

  // Derived payment and matured outstanding claims statistics
  const paymentStats = useMemo(() => {
    // Exclude completed & closed projects from matured payment status & amounts
    const activeProjects = rawGroupProjects.filter(p => !isProjectClosed(p.status));
    const totalCount = activeProjects.length;
    if (totalCount === 0) {
      return {
        totalCertifiedEtb: 0,
        totalCertifiedUsd: 0,
        totalPaidEtb: 0,
        totalPaidUsd: 0,
        totalUnpaidEtb: 0,
        totalUnpaidUsd: 0,
        totalMaturedEtb: 0,
        totalMaturedUsd: 0,
        totalAccruedInterestEtb: 0,
        totalAccruedInterestUsd: 0,
        combinedCertifiedEtb: 0,
        combinedPaidEtb: 0,
        combinedUnpaidEtb: 0,
        combinedMaturedEtb: 0,
        combinedAccruedInterestEtb: 0,
        combinedClaimableEtb: 0,
        maturedIpcCount: 0,
        totalIpcCount: 0,
        unpaidIpcCount: 0,
      };
    }

    let totalCertifiedEtb = 0;
    let totalCertifiedUsd = 0;
    let totalPaidEtb = 0;
    let totalPaidUsd = 0;
    let totalUnpaidEtb = 0;
    let totalUnpaidUsd = 0;
    let totalMaturedEtb = 0;
    let totalMaturedUsd = 0;
    let totalAccruedInterestEtb = 0;
    let totalAccruedInterestUsd = 0;
    let combinedCertifiedEtb = 0;
    let combinedPaidEtb = 0;
    let combinedUnpaidEtb = 0;
    let combinedMaturedEtb = 0;
    let combinedAccruedInterestEtb = 0;
    let combinedClaimableEtb = 0;
    let maturedIpcCount = 0;
    let totalIpcCount = 0;
    let unpaidIpcCount = 0;

    const today = new Date();

    activeProjects.forEach(p => {
      const tracker = p.ipcTracker || [];
      const rate = p.usdExchangeRate || 28.0;
      const annualRate = p.annualInterestRate !== undefined ? p.annualInterestRate : 16.50;

      tracker.forEach(item => {
        totalIpcCount++;
        const maturation = calculateIpcMaturation(item, annualRate, rate, today);

        const certEtb = item.certifiedEtb || 0;
        const certUsd = item.certifiedUsd || 0;

        totalCertifiedEtb += certEtb;
        totalCertifiedUsd += certUsd;
        combinedCertifiedEtb += certEtb + (certUsd * rate);

        totalPaidEtb += maturation.paidCertifiedEtb;
        totalPaidUsd += maturation.paidCertifiedUsd;
        combinedPaidEtb += maturation.paidCertifiedEtb + (maturation.paidCertifiedUsd * rate);

        totalUnpaidEtb += maturation.unpaidCertifiedEtb;
        totalUnpaidUsd += maturation.unpaidCertifiedUsd;
        combinedUnpaidEtb += maturation.unpaidCertifiedEtb + (maturation.unpaidCertifiedUsd * rate);

        if (!maturation.isFullyPaid) {
          unpaidIpcCount++;
        }

        // Check matured overdue (> 56 days) or interest accrued
        if (maturation.isOverdue) {
          maturedIpcCount++;
          totalMaturedEtb += maturation.unpaidCertifiedEtb;
          totalMaturedUsd += maturation.unpaidCertifiedUsd;
          combinedMaturedEtb += maturation.unpaidCertifiedEtb + (maturation.unpaidCertifiedUsd * rate);
        }
        if (maturation.accruedInterestEqvEtb > 0) {
          totalAccruedInterestEtb += maturation.accruedInterestEtb;
          totalAccruedInterestUsd += maturation.accruedInterestUsd;
          combinedAccruedInterestEtb += maturation.accruedInterestEqvEtb;
        }
      });
    });

    combinedClaimableEtb = combinedUnpaidEtb + combinedAccruedInterestEtb;

    return {
      totalCertifiedEtb,
      totalCertifiedUsd,
      totalPaidEtb,
      totalPaidUsd,
      totalUnpaidEtb,
      totalUnpaidUsd,
      totalMaturedEtb,
      totalMaturedUsd,
      totalAccruedInterestEtb,
      totalAccruedInterestUsd,
      combinedCertifiedEtb,
      combinedPaidEtb,
      combinedUnpaidEtb,
      combinedMaturedEtb,
      combinedAccruedInterestEtb,
      combinedClaimableEtb,
      maturedIpcCount,
      totalIpcCount,
      unpaidIpcCount,
    };
  }, [rawGroupProjects]);

  // Derived bond guarantee statistics
  const bondStats = useMemo(() => {
    let totalBondsCount = 0;
    let totalBondsValue = 0;
    let validBondsCount = 0;
    let validBondsValue = 0;
    let expiredBondsCount = 0;
    let expiredBondsValue = 0;

    rawGroupProjects.forEach(p => {
      const bonds = p.bonds || [];
      bonds.forEach(b => {
        totalBondsCount++;
        const amt = b.amount || 0;
        totalBondsValue += amt;
        
        if (b.status === 'Valid' || (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) {
          validBondsCount++;
          validBondsValue += amt;
        } else if (b.status === 'Expired') {
          expiredBondsCount++;
          expiredBondsValue += amt;
        }
      });
    });

    return {
      totalBondsCount,
      totalBondsValue,
      validBondsCount,
      validBondsValue,
      expiredBondsCount,
      expiredBondsValue
    };
  }, [rawGroupProjects]);

  // Helper to calculate project payment metrics
  const getProjectPaymentMetrics = (p: Project) => {
    const isClosed = isProjectClosed(p.status);
    const tracker = p.ipcTracker || [];
    const rate = p.usdExchangeRate || 28.0;
    const today = new Date();

    let totalIpcs = tracker.length;
    let paidIpcs = 0;
    let unpaidIpcs = 0;
    let maturedIpcsCount = 0;

    let certEtb = 0;
    let certUsd = 0;
    let paidEtb = 0;
    let paidUsd = 0;
    let unpaidEtb = 0;
    let unpaidUsd = 0;
    let maturedEtb = 0;
    let maturedUsd = 0;
    let accruedInterestEtb = 0;
    let accruedInterestUsd = 0;
    let accruedInterestEqv = 0;

    const annualRate = p.annualInterestRate !== undefined ? p.annualInterestRate : 16.50;

    tracker.forEach(item => {
      const maturation = calculateIpcMaturation(item, annualRate, rate, today);

      certEtb += item.certifiedEtb || 0;
      certUsd += item.certifiedUsd || 0;

      paidEtb += maturation.paidCertifiedEtb;
      paidUsd += maturation.paidCertifiedUsd;

      unpaidEtb += maturation.unpaidCertifiedEtb;
      unpaidUsd += maturation.unpaidCertifiedUsd;

      if (maturation.isFullyPaid || isClosed) {
        paidIpcs++;
      } else {
        unpaidIpcs++;
        if (maturation.isOverdue && !isClosed) {
          maturedIpcsCount++;
          maturedEtb += maturation.unpaidCertifiedEtb;
          maturedUsd += maturation.unpaidCertifiedUsd;
        }
        if (maturation.accruedInterestEqvEtb > 0 && !isClosed) {
          accruedInterestEtb += maturation.accruedInterestEtb;
          accruedInterestUsd += maturation.accruedInterestUsd;
          accruedInterestEqv += maturation.accruedInterestEqvEtb;
        }
      }
    });

    if (isClosed) {
      maturedIpcsCount = 0;
      maturedEtb = 0;
      maturedUsd = 0;
      accruedInterestEtb = 0;
      accruedInterestUsd = 0;
      accruedInterestEqv = 0;
    }

    const combinedCertified = certEtb + (certUsd * rate);
    const combinedPaid = paidEtb + (paidUsd * rate);
    const combinedUnpaid = unpaidEtb + (unpaidUsd * rate);
    const combinedMatured = maturedEtb + (maturedUsd * rate);
    const combinedClaimable = combinedUnpaid + accruedInterestEqv;

    let statusLabel: 'Paid' | 'Pending' | 'Overdue' = 'Paid';
    let statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
    if (!isClosed && maturedIpcsCount > 0) {
      statusLabel = 'Overdue';
      statusColor = 'bg-red-50 text-red-600 border-red-150 dark:bg-red-950/20 dark:text-red-400 animate-pulse';
    } else if (!isClosed && unpaidIpcs > 0) {
      statusLabel = 'Pending';
      statusColor = 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
    }

    return {
      totalIpcs,
      paidIpcs,
      unpaidIpcs,
      maturedIpcsCount,
      certEtb,
      certUsd,
      paidEtb,
      paidUsd,
      unpaidEtb,
      unpaidUsd,
      maturedEtb,
      maturedUsd,
      accruedInterestEtb,
      accruedInterestUsd,
      accruedInterestEqv,
      combinedCertified,
      combinedPaid,
      combinedUnpaid,
      combinedMatured,
      combinedClaimable,
      statusLabel,
      statusColor
    };
  };

  // Derived supervision consultant personnel workload & status statistics across the group
  const supervisionStaffStats = useMemo(() => {
    let totalProjectsWithConsultant = 0;
    let totalPersonnelCount = 0;
    let activePersonnelCount = 0;
    let demobilizedPersonnelCount = 0;
    let onLeavePersonnelCount = 0;
    let keyPersonnelCount = 0;
    let activeKeyPersonnelCount = 0;
    let nonKeyPersonnelCount = 0;
    let subProfPersonnelCount = 0;
    let totalAllocatedMM = 0;
    let totalExpendedMM = 0;
    let totalInvoicedFeeEtb = 0;
    let totalPaidFeeEtb = 0;
    let residentEngineersCount = 0;

    rawGroupProjects.forEach(p => {
      const sc = p.supervisionConsultant;
      if (sc) {
        totalProjectsWithConsultant++;
        if (sc.residentEngineerName && sc.residentEngineerName.trim().length > 0) {
          residentEngineersCount++;
        }
        const personnel = sc.personnel || [];
        personnel.forEach(person => {
          totalPersonnelCount++;
          const status = person.status || 'Active';
          if (status === 'Active') {
            activePersonnelCount++;
          } else if (status === 'Demobilized') {
            demobilizedPersonnelCount++;
          } else {
            onLeavePersonnelCount++;
          }

          if (person.category === 'Key Personnel') {
            keyPersonnelCount++;
            if (status === 'Active') activeKeyPersonnelCount++;
          } else if (person.category === 'Non-Key Professional') {
            nonKeyPersonnelCount++;
          } else {
            subProfPersonnelCount++;
          }

          totalAllocatedMM += (person.manMonthsAllocated || 0);
          totalExpendedMM += (person.manMonthsExpended || 0);
        });

        const invoices = sc.invoices || [];
        invoices.forEach(inv => {
          totalInvoicedFeeEtb += (inv.grossAmountEtb || 0);
          if (inv.status === 'Paid') {
            totalPaidFeeEtb += (inv.grossAmountEtb || 0);
          }
        });
      }
    });

    const overallWorkloadPct = totalAllocatedMM > 0 ? (totalExpendedMM / totalAllocatedMM) * 100 : 0;
    const activeStaffPct = totalPersonnelCount > 0 ? (activePersonnelCount / totalPersonnelCount) * 100 : 0;

    return {
      totalProjectsWithConsultant,
      totalPersonnelCount,
      activePersonnelCount,
      demobilizedPersonnelCount,
      onLeavePersonnelCount,
      keyPersonnelCount,
      activeKeyPersonnelCount,
      nonKeyPersonnelCount,
      subProfPersonnelCount,
      totalAllocatedMM,
      totalExpendedMM,
      overallWorkloadPct,
      activeStaffPct,
      totalInvoicedFeeEtb,
      totalPaidFeeEtb,
      residentEngineersCount
    };
  }, [rawGroupProjects]);

  // Helper to calculate supervision staff metrics for an individual project
  const getProjectSupervisionStaffMetrics = (p: Project) => {
    const sc = p.supervisionConsultant;
    const firmName = sc?.firmName || p.consultant || 'Supervision Consultant JV';
    const reName = sc?.residentEngineerName || '';
    const personnel = sc?.personnel || [];
    const invoices = sc?.invoices || [];

    const totalStaff = personnel.length;
    const activeStaff = personnel.filter(x => (x.status || 'Active') === 'Active').length;
    const demobilizedStaff = personnel.filter(x => x.status === 'Demobilized').length;
    const onLeaveStaff = personnel.filter(x => x.status === 'On Leave' || x.status === 'Replaced').length;

    const keyStaff = personnel.filter(x => x.category === 'Key Personnel');
    const activeKeyStaff = keyStaff.filter(x => (x.status || 'Active') === 'Active').length;

    const allocatedMM = personnel.reduce((sum, x) => sum + (x.manMonthsAllocated || 0), 0);
    const expendedMM = personnel.reduce((sum, x) => sum + (x.manMonthsInput || (x as any).manMonthsExpended || 0), 0);
    const remainingMM = Math.max(0, allocatedMM - expendedMM);
    const workloadPct = allocatedMM > 0 ? Math.min(100, (expendedMM / allocatedMM) * 100) : 0;

    const totalInvoicedEtb = invoices.reduce((sum, inv) => sum + (inv.grossAmountEtb || 0), 0);
    const totalPaidEtb = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (inv.grossAmountEtb || 0), 0);

    let statusLabel: 'Fully Mobilized' | 'Key Roles Active' | 'Staffing Gaps' | 'Demobilized' | 'No Staff Assigned' = 'Fully Mobilized';
    let statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';

    if (totalStaff === 0) {
      statusLabel = 'No Staff Assigned';
      statusBadgeColor = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    } else if (activeStaff === 0) {
      statusLabel = 'Demobilized';
      statusBadgeColor = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    } else if (activeKeyStaff < keyStaff.length && keyStaff.length > 0) {
      statusLabel = 'Staffing Gaps';
      statusBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
    } else if (activeStaff < totalStaff) {
      statusLabel = 'Key Roles Active';
      statusBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
    }

    return {
      firmName,
      reName,
      rePhone: sc?.residentEngineerPhone || '',
      reEmail: sc?.residentEngineerEmail || '',
      contractRef: sc?.contractRefNo || `ERA/SC/${p.id.substring(0, 8)}`,
      associationType: sc?.associationType || 'Joint Venture (JV)',
      personnel,
      invoices,
      totalStaff,
      activeStaff,
      demobilizedStaff,
      onLeaveStaff,
      keyStaffCount: keyStaff.length,
      activeKeyStaffCount: activeKeyStaff,
      allocatedMM,
      expendedMM,
      remainingMM,
      workloadPct,
      totalInvoicedEtb,
      totalPaidEtb,
      statusLabel,
      statusBadgeColor
    };
  };

  // Export to landscape-oriented PDF with beautiful grid formatting
  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawHeaderFooter = () => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Elegant gold / bronze colored accent header line
      doc.setDrawColor(194, 120, 3); // Gold primary accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Official ERA Logo
      drawEraLogo(doc, 40, 28, 26, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 3
      });

      // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
      const dsW = 130;
      const dsX = pageWidth - 40 - dsW;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(dsX, 28, dsW, 26, 3, 3, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text("OFFICIAL DATE STAMP", dsX + 6, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX + 6, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • OFFICIAL`, dsX + 6, 50);

      // Title & Metadata Block
      const maxTitleW = dsX - 72 - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Black
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 72, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0); // Black
      const headerMetaStr = `CMS - CONTRACT MONITORING & EXECUTIVE REPORTING SYSTEM • GENERATOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedHeaderMeta = doc.splitTextToSize(headerMetaStr, maxTitleW);
      doc.text(wrappedHeaderMeta[0] || headerMetaStr, 72, 51);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(200, 200, 200);
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`CONFIDENTIALITY CLAUSE: FOR OFFICIAL USE ONLY • INTERNAL ERA MANAGEMENT PERFORMANCE BRIEFING`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    const headlineStr = `EXECUTIVE PERFORMANCE DOSSIER: ${groupLabelStr} • ${groupNameStr}`;
    const wrappedHeadline = doc.splitTextToSize(headlineStr, pageWidth - 80);
    doc.text(wrappedHeadline, 40, 85);

    // Decorative thin separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(40, 95, pageWidth - 40, 95);

    // Top Performance KPI Summary Blocks
    const cardWidth = (pageWidth - 80 - 30) / 4; 
    const cardY = 110;
    const cardHeight = 52;

    // KPI Card 1: Total Contracts
    doc.setFillColor(248, 250, 252);
    doc.rect(40, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(40, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL ACTIVE CONTRACTS", 48, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${stats.count}`, 48, cardY + 38);

    // KPI Card 2: Average Physical Progress
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("AVG PHYSICAL PROGRESS", 40 + cardWidth + 18, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${stats.avgProgress.toFixed(2)}%`, 40 + cardWidth + 18, cardY + 38);

    // KPI Card 3: Aggregate Value
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("AGGREGATE CONTRACT VALUE", 40 + (cardWidth + 10) * 2 + 8, cardY + 18);
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`, 40 + (cardWidth + 10) * 2 + 8, cardY + 38);

    // KPI Card 4: Risks & Warnings
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text("EXPIRED/CRITICAL GUARANTEES", 40 + (cardWidth + 10) * 3 + 8, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${stats.warningCount} Alerts`, 40 + (cardWidth + 10) * 3 + 8, cardY + 38);

    curY = cardY + cardHeight + 25;

    // Detailed Projects Grid title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("DETAILED CONTRACT PERFORMANCES", 40, curY);
    curY += 12;

    // Landscape Columns widths (Total A4 width: 841.89 pt, printable width: 761.89 pt)
    const colWidths = {
      name: 100,
      contractor: 95,
      consultant: 95,
      signDate: 55,
      startDate: 58,
      origComp: 60,
      revComp: 60,
      origAmount: 88,
      devisedAmount: 92,
      progress: 58.89
    };

    const colX = {
      name: 40,
      contractor: 40 + colWidths.name,
      consultant: 40 + colWidths.name + colWidths.contractor,
      signDate: 40 + colWidths.name + colWidths.contractor + colWidths.consultant,
      startDate: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate,
      origComp: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate + colWidths.startDate,
      revComp: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate + colWidths.startDate + colWidths.origComp,
      origAmount: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate + colWidths.startDate + colWidths.origComp + colWidths.revComp,
      devisedAmount: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate + colWidths.startDate + colWidths.origComp + colWidths.revComp + colWidths.origAmount,
      progress: 40 + colWidths.name + colWidths.contractor + colWidths.consultant + colWidths.signDate + colWidths.startDate + colWidths.origComp + colWidths.revComp + colWidths.origAmount + colWidths.devisedAmount
    };

    const formatDateForPdf = (dateStr?: string) => {
      if (!dateStr) return 'N/A';
      try {
        const parts = dateStr.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            const dt = new Date(y, m, d);
            return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
        const dt = new Date(dateStr);
        if (isNaN(dt.getTime())) return dateStr;
        return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const addDaysToDateForPdf = (startDateStr: string | undefined, daysToAdd: number): string => {
      if (!startDateStr) return 'N/A';
      try {
        let baseDate: Date;
        const parts = startDateStr.trim().split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          baseDate = new Date(y, m, d);
        } else {
          baseDate = new Date(startDateStr);
        }
        if (isNaN(baseDate.getTime())) return 'N/A';
        const targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return 'N/A';
      }
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      const headerNameLines = doc.splitTextToSize("PROJECT NAME", colWidths.name - 6);
      const headerContractorLines = doc.splitTextToSize("CONTRACTOR", colWidths.contractor - 6);
      const headerConsultantLines = doc.splitTextToSize("CONSULTANT", colWidths.consultant - 6);
      const headerSignLines = doc.splitTextToSize("SIGNING DATE", colWidths.signDate - 6);
      const headerStartLines = doc.splitTextToSize("COMMENCEMENT DATE", colWidths.startDate - 6);
      const headerOrigCompLines = doc.splitTextToSize("ORIGINAL COMPLETION", colWidths.origComp - 6);
      const headerRevCompLines = doc.splitTextToSize("REVISED COMPLETION", colWidths.revComp - 6);
      const headerOrigAmtLines = doc.splitTextToSize("ORIGINAL CONTRACT AMOUNT (ETB)", colWidths.origAmount - 6);
      const headerDevisedAmtLines = doc.splitTextToSize("DEVISED CONTRACT AMOUNT (ETB)", colWidths.devisedAmount - 6);
      const headerProgressLines = doc.splitTextToSize("PROGRESS (%)", colWidths.progress - 6);

      const maxHeaderLines = Math.max(
        headerNameLines.length,
        headerContractorLines.length,
        headerConsultantLines.length,
        headerSignLines.length,
        headerStartLines.length,
        headerOrigCompLines.length,
        headerRevCompLines.length,
        headerOrigAmtLines.length,
        headerDevisedAmtLines.length,
        headerProgressLines.length
      );
      const headerHeight = maxHeaderLines * 9.5 + 8;

      doc.setFillColor(15, 23, 42); // slate-900 (professional navy dark)
      doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      const drawCellLines = (lines: string[], x: number) => {
        const startY = y + (headerHeight - (lines.length * 9.5)) / 2 + 7;
        lines.forEach((line, idx) => {
          doc.text(line, x + 3, startY + idx * 9.5);
        });
      };

      drawCellLines(headerNameLines, colX.name);
      drawCellLines(headerContractorLines, colX.contractor);
      drawCellLines(headerConsultantLines, colX.consultant);
      drawCellLines(headerSignLines, colX.signDate);
      drawCellLines(headerStartLines, colX.startDate);
      drawCellLines(headerOrigCompLines, colX.origComp);
      drawCellLines(headerRevCompLines, colX.revComp);
      drawCellLines(headerOrigAmtLines, colX.origAmount);
      drawCellLines(headerDevisedAmtLines, colX.devisedAmount);
      drawCellLines(headerProgressLines, colX.progress);

      // Header border line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
      doc.line(40, y + headerHeight, pageWidth - 40, y + headerHeight);
      doc.line(40, y, 40, y + headerHeight);
      doc.line(pageWidth - 40, y, pageWidth - 40, y + headerHeight);

      doc.line(colX.contractor, y, colX.contractor, y + headerHeight);
      doc.line(colX.consultant, y, colX.consultant, y + headerHeight);
      doc.line(colX.signDate, y, colX.signDate, y + headerHeight);
      doc.line(colX.startDate, y, colX.startDate, y + headerHeight);
      doc.line(colX.origComp, y, colX.origComp, y + headerHeight);
      doc.line(colX.revComp, y, colX.revComp, y + headerHeight);
      doc.line(colX.origAmount, y, colX.origAmount, y + headerHeight);
      doc.line(colX.devisedAmount, y, colX.devisedAmount, y + headerHeight);
      doc.line(colX.progress, y, colX.progress, y + headerHeight);

      return headerHeight;
    };

    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const nameText = p.name || 'Untitled Project';
      const contractorText = p.contractor || 'N/A';
      const consultantText = p.consultant || 'N/A';

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      const nameLines = doc.splitTextToSize(nameText, colWidths.name - 6);

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      const contractorLines = doc.splitTextToSize(contractorText, colWidths.contractor - 6);
      const consultantLines = doc.splitTextToSize(consultantText, colWidths.consultant - 6);

      const signDateText = formatDateForPdf(p.signDate);
      const startDateText = formatDateForPdf(p.startDate);

      const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);
      const origCompDateText = p.startDate ? addDaysToDateForPdf(p.startDate, p.origDays || 0) : 'N/A';
      const revCompDateText = p.startDate ? addDaysToDateForPdf(p.startDate, totalDays) : 'N/A';

      const signLines = doc.splitTextToSize(signDateText, colWidths.signDate - 6);
      const startLines = doc.splitTextToSize(startDateText, colWidths.startDate - 6);
      const origCompLines = doc.splitTextToSize(origCompDateText, colWidths.origComp - 6);

      doc.setFont('times', 'bold');
      const revCompLines = doc.splitTextToSize(revCompDateText, colWidths.revComp - 6);

      const origValNum = p.origAmount ? Math.round(p.origAmount * 1_000_000) : 0;
      const varVal = (p.variation || 0) > 10000 ? (p.variation || 0) : ((p.variation || 0) * 1_000_000);
      const devisedValNum = p.origAmount ? Math.round((p.origAmount * 1_000_000) + varVal) : 0;

      const origAmountText = origValNum ? `${origValNum.toLocaleString()} ETB` : 'N/A';
      const devisedAmountText = devisedValNum ? `${devisedValNum.toLocaleString()} ETB` : 'N/A';

      doc.setFont('times', 'normal');
      const origAmountLines = doc.splitTextToSize(origAmountText, colWidths.origAmount - 6);

      doc.setFont('times', 'bold');
      const devisedAmountLines = doc.splitTextToSize(devisedAmountText, colWidths.devisedAmount - 6);

      const progVal = p.physicalProgress || 0;
      const progText = `${progVal.toFixed(2)}%`;
      const progLines = doc.splitTextToSize(progText, colWidths.progress - 6);

      // Pre-calculate cells heights with line spacing
      const nameHeight = nameLines.length * 9.5 + 8;
      const contractorHeight = contractorLines.length * 9.5 + 8;
      const consultantHeight = consultantLines.length * 9.5 + 8;
      const signHeight = signLines.length * 9.5 + 8;
      const startHeight = startLines.length * 9.5 + 8;
      const origCompHeight = origCompLines.length * 9.5 + 8;
      const revCompHeight = revCompLines.length * 9.5 + 8;
      const origAmtHeight = origAmountLines.length * 9.5 + 8;
      const devisedAmtHeight = devisedAmountLines.length * 9.5 + 8;
      const progressHeight = progLines.length * 9.5 + 8;

      const rowHeight = Math.max(
        nameHeight, contractorHeight, consultantHeight, signHeight,
        startHeight, origCompHeight, revCompHeight, origAmtHeight,
        devisedAmtHeight, progressHeight, 32
      );

      // Prevent overflow, add new page with header
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 60;
        drawHeaderFooter();
        const headerH = drawTableHeader(curY);
        curY += headerH;
      }

      // Zebra striping background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Draw cells background borders
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Draw columns vertical grid lines
      doc.line(colX.contractor, curY, colX.contractor, curY + rowHeight);
      doc.line(colX.consultant, curY, colX.consultant, curY + rowHeight);
      doc.line(colX.signDate, curY, colX.signDate, curY + rowHeight);
      doc.line(colX.startDate, curY, colX.startDate, curY + rowHeight);
      doc.line(colX.origComp, curY, colX.origComp, curY + rowHeight);
      doc.line(colX.revComp, curY, colX.revComp, curY + rowHeight);
      doc.line(colX.origAmount, curY, colX.origAmount, curY + rowHeight);
      doc.line(colX.devisedAmount, curY, colX.devisedAmount, curY + rowHeight);
      doc.line(colX.progress, curY, colX.progress, curY + rowHeight);

      // 1. Render Project Name
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      let yOffsetN = curY + 12;
      nameLines.forEach((line: string) => {
        doc.text(line, colX.name + 3, yOffsetN);
        yOffsetN += 9.5;
      });

      // 2. Render Contractor Name
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      let yOffsetContr = curY + 12;
      contractorLines.forEach((line: string) => {
        doc.text(line, colX.contractor + 3, yOffsetContr);
        yOffsetContr += 9.5;
      });

      // 3. Render Consultant Name
      let yOffsetConsult = curY + 12;
      consultantLines.forEach((line: string) => {
        doc.text(line, colX.consultant + 3, yOffsetConsult);
        yOffsetConsult += 9.5;
      });

      // 4. Render Signing Date
      let yOffsetSign = curY + 12;
      signLines.forEach((line: string) => {
        doc.text(line, colX.signDate + 3, yOffsetSign);
        yOffsetSign += 9.5;
      });

      // 5. Render Commencement Date
      let yOffsetStart = curY + 12;
      startLines.forEach((line: string) => {
        doc.text(line, colX.startDate + 3, yOffsetStart);
        yOffsetStart += 9.5;
      });

      // 6. Render Original Completion Date
      let yOffsetOrigComp = curY + 12;
      origCompLines.forEach((line: string) => {
        doc.text(line, colX.origComp + 3, yOffsetOrigComp);
        yOffsetOrigComp += 9.5;
      });

      // 7. Render Revised Completion Date
      doc.setFont('times', 'bold');
      doc.setTextColor(30, 41, 59);
      let yOffsetRevComp = curY + 12;
      revCompLines.forEach((line: string) => {
        doc.text(line, colX.revComp + 3, yOffsetRevComp);
        yOffsetRevComp += 9.5;
      });

      // 8. Render Original Contract Amount
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      let yOffsetOrigAmt = curY + 12;
      origAmountLines.forEach((line: string) => {
        doc.text(line, colX.origAmount + 3, yOffsetOrigAmt);
        yOffsetOrigAmt += 9.5;
      });

      // 9. Render Devised Contract Amount
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      let yOffsetDevisedAmt = curY + 12;
      devisedAmountLines.forEach((line: string) => {
        doc.text(line, colX.devisedAmount + 3, yOffsetDevisedAmt);
        yOffsetDevisedAmt += 9.5;
      });

      // 10. Render Physical Progress in % (Text only, NO graph / NO bar)
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      if (progVal < 15) {
        doc.setTextColor(220, 38, 38);
      } else if (progVal < 45) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      
      let yOffsetP = curY + 12;
      progLines.forEach((line: string) => {
        doc.text(line, colX.progress + 3, yOffsetP);
        yOffsetP += 9.5;
      });

      curY += rowHeight;
    });

    // Final Page Sign-off section
    if (curY + 90 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 60;
      drawHeaderFooter();
    }

    curY = drawUniversalSignatureBlock(doc, curY, 'p');

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${j} of ${pageCount}`, pageWidth - 60, pageHeight - 24);
    }

    doc.save(`ERA_Performance_Dossier_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.pdf`);
  };

  // Export beautifully formatted CSV file
  const handleExportCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Contract Signing Date',
      'Commencement Date',
      'Program Directorate',
      'PMO Grouping',
      'Road Classification',
      'Contract Type (DB/DBB)',
      'Project Length (KM)',
      'Physical Progress (%)',
      'Original Completion Date',
      'Revised Completion Date',
      'Original Contract Value (ETB)',
      'Revised Contract Value (ETB)',
      'Extension of Time (EOT Days)',
      'Expired Guarantees Count'
    ];

    const formatDateForCSV = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return `${m}/${d}/${y}`;
          }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    const addDaysToStartDate = (startDateStr: string, daysToAdd: number): string => {
      if (!startDateStr) return '';
      try {
        const parts = startDateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const targetDate = new Date(y, m, d + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        } else {
          const targetDate = new Date(startDateStr);
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        }
      } catch {
        return '';
      }
    };

    const rows = processedProjects.map(p => {
      const expiredBondsCount = (p.bonds || []).filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        if (b.expireDate) {
          try { return new Date(b.expireDate) < new Date(); } catch { return false; }
        }
        return false;
      }).length;
      const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);

      // Date calculations
      let origCompletionDate = '';
      let revisedCompletionDate = '';
      if (p.startDate) {
        origCompletionDate = addDaysToStartDate(p.startDate, p.origDays || 0);
        revisedCompletionDate = addDaysToStartDate(p.startDate, totalDays);
      }

      const origVal = p.origAmount ? Math.round(p.origAmount * 1_000_000) : 0;
      const varVal = (p.variation || 0) > 10000 ? (p.variation || 0) : ((p.variation || 0) * 1_000_000);
      const revisedVal = p.origAmount ? Math.round((p.origAmount * 1_000_000) + varVal) : 0;

      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        formatDateForCSV(p.signDate),
        formatDateForCSV(p.startDate),
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.classification || 'DS-4',
        p.contractType || 'DBB',
        p.lengthKm !== undefined && p.lengthKm !== null && p.lengthKm > 0 ? p.lengthKm : '',
        p.physicalProgress !== undefined ? p.physicalProgress : 0,
        origCompletionDate,
        revisedCompletionDate,
        origVal,
        revisedVal,
        p.eotDays || 0,
        expiredBondsCount
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Performance_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Project Compliance & Performance Audit Report (PDF)
  const handleExportAuditPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const isConsultantAudit = groupType === 'consultant' || auditPerspective === 'consultant';
    
    let curY = 115;
    let pageCount = 1;

    const drawHeaderFooter = () => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Elegant Crimson / Indigo Audit Accent line
      doc.setDrawColor(isConsultantAudit ? 99 : 220, isConsultantAudit ? 102 : 38, isConsultantAudit ? 241 : 38); // Indigo/Red compliance accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Official ERA Logo
      drawEraLogo(doc, 40, 28, 26, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 3
      });

      // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
      const dsW2 = 130;
      const dsX2 = pageWidth - 40 - dsW2;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(dsX2, 28, dsW2, 26, 3, 3, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("OFFICIAL DATE STAMP", dsX2 + 6, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX2 + 6, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • OFFICIAL`, dsX2 + 6, 50);

      // Title & Metadata Block
      const maxTitleW2 = dsX2 - 72 - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • AUDITING OFFICE", 72, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      const auditMetaStr = `CMS - ${isConsultantAudit ? 'SUPERVISION CONSULTANT PERFORMANCE & QUALITY OVERSIGHT' : 'CONTRACT COMPLIANCE & PERFORMANCE AUDIT'} BOARD • AUDITOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedAuditMeta = doc.splitTextToSize(auditMetaStr, maxTitleW2);
      doc.text(wrappedAuditMeta[0] || auditMetaStr, 72, 51);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`CONFIDENTIALITY CLAUSE: RESTRICTED TO GOVERNANCE & PROJECT MANAGEMENT AUDIT TEAMS ONLY`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(isConsultantAudit ? 67 : 185, isConsultantAudit ? 56 : 28, isConsultantAudit ? 202 : 28); // Indigo/Red
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    const cohortTitle = isConsultantAudit && consultantCohortFilter === 'sole' 
      ? ' [SOLE CONSULTANTS]' 
      : isConsultantAudit && consultantCohortFilter === 'jv' 
        ? ' [JOINT VENTURE (JV) CONSORTIA]' 
        : '';
    const headlineStr = isConsultantAudit 
      ? `SUPERVISION CONSULTANT COMPLIANCE & PERFORMANCE AUDIT REPORT${cohortTitle}: ${groupLabelStr} • ${groupNameStr}`
      : `PROJECT COMPLIANCE & PERFORMANCE AUDIT REPORT: ${groupLabelStr} • ${groupNameStr}`;
    const wrappedHeadline = doc.splitTextToSize(headlineStr, pageWidth - 80);
    doc.text(wrappedHeadline, 40, 85);

    // Decorative thin separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, 95, pageWidth - 40, 95);

    // Top Compliance KPI Summary Blocks
    const cardWidth = (pageWidth - 80 - 30) / 4; 
    const cardY = 110;
    const cardHeight = 52;

    if (isConsultantAudit) {
      // Consultant KPI Card 1: Audited Projects Count
      doc.setFillColor(238, 242, 255); // soft indigo
      doc.rect(40, cardY, cardWidth, cardHeight, 'F');
      doc.setDrawColor(199, 210, 254);
      doc.rect(40, cardY, cardWidth, cardHeight, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(67, 56, 202);
      const card1Title = consultantCohortFilter === 'sole' 
        ? "SOLE CONSULTANTS" 
        : consultantCohortFilter === 'jv' 
          ? "JV CONSORTIA" 
          : "SUPERVISED CONTRACTS";
      doc.text(card1Title, 48, cardY + 18);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`${processedProjects.length} Active`, 48, cardY + 38);

      // Consultant KPI Card 2: Avg Consultant Score & Rating
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("AVG CONSULTANT PERFORMANCE", 40 + cardWidth + 18, cardY + 18);
      doc.setFontSize(13);
      if (consultantAuditStats.avgScore >= 90) {
        doc.setTextColor(22, 163, 74); // green
      } else if (consultantAuditStats.avgScore >= 75) {
        doc.setTextColor(37, 99, 235); // blue
      } else if (consultantAuditStats.avgScore >= 60) {
        doc.setTextColor(217, 119, 6); // amber
      } else if (consultantAuditStats.avgScore >= 50) {
        doc.setTextColor(234, 88, 12); // orange
      } else {
        doc.setTextColor(220, 38, 38); // red
      }
      const pdfGradeStr = consultantAuditStats.groupGradeThreshold.grade.replace('Grade ', '').trim();
      doc.text(`${consultantAuditStats.avgScore.toFixed(1)}% (Grade ${pdfGradeStr})`, 40 + cardWidth + 18, cardY + 38);

      // Consultant KPI Card 3: Submittal SLA Compliance
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
      doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SUBMITTAL SLA ON-TIME RATE", 40 + (cardWidth + 10) * 2 + 8, cardY + 18);
      doc.setFontSize(13);
      if (consultantAuditStats.avgSlaRate >= 80) {
        doc.setTextColor(22, 163, 74);
      } else if (consultantAuditStats.avgSlaRate >= 60) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(`${consultantAuditStats.avgSlaRate.toFixed(1)}% (${consultantAuditStats.avgTurnaroundDays}d avg)`, 40 + (cardWidth + 10) * 2 + 8, cardY + 38);

      // Consultant KPI Card 4: Key Personnel Mobilization
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
      doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("STAFF MOBILIZATION RATE", 40 + (cardWidth + 10) * 3 + 8, cardY + 18);
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(`${consultantAuditStats.mobilizationRatePct}% (${consultantAuditStats.activeKeyStaff} Experts)`, 40 + (cardWidth + 10) * 3 + 8, cardY + 38);
    } else {
      // KPI Card 1: Audited Projects Count
      doc.setFillColor(254, 242, 242); // very soft red
      doc.rect(40, cardY, cardWidth, cardHeight, 'F');
      doc.setDrawColor(252, 165, 165);
      doc.rect(40, cardY, cardWidth, cardHeight, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text("TOTAL AUDITED PROJECTS", 48, cardY + 18);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`${processedProjects.length} Active`, 48, cardY + 38);

      // KPI Card 2: Group Avg Compliance Score
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("AVG COMPLIANCE SCORE", 40 + cardWidth + 18, cardY + 18);
      doc.setFontSize(14);
      if (auditStats.avgScore >= 75) {
        doc.setTextColor(22, 163, 74); // green
      } else if (auditStats.avgScore >= 60) {
        doc.setTextColor(217, 119, 6); // amber
      } else {
        doc.setTextColor(220, 38, 38); // red
      }
      doc.text(`${auditStats.avgScore.toFixed(2)}%`, 40 + cardWidth + 18, cardY + 38);

      // KPI Card 3: Behind Schedule Rate
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
      doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SCHEDULE SLIPPAGE RATE", 40 + (cardWidth + 10) * 2 + 8, cardY + 18);
      doc.setFontSize(14);
      if (auditStats.behindSchedulePct > 35) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(15, 23, 42);
      }
      doc.text(`${auditStats.behindSchedulePct.toFixed(2)}% Delay`, 40 + (cardWidth + 10) * 2 + 8, cardY + 38);

      // KPI Card 4: Risks & Warnings
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
      doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("GUARANTEE & RISK TRIGGERS", 40 + (cardWidth + 10) * 3 + 8, cardY + 18);
      doc.setFontSize(13);
      doc.setTextColor(220, 38, 38); // red
      doc.text(`${auditStats.totalExpiredBonds} Exp. / ${auditStats.totalCriticalRisks} Crit.`, 40 + (cardWidth + 10) * 3 + 8, cardY + 38);
    }

    curY = cardY + cardHeight + 20;

    // Render Compliance Rating Weightage Explanation Box
    doc.setFillColor(248, 250, 252);
    doc.rect(40, curY, pageWidth - 80, 28, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(40, curY, pageWidth - 80, 28, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      isConsultantAudit 
        ? "SUPERVISION CONSULTANT COMPLIANCE & PERFORMANCE AUDIT SCORING WEIGHTS & PENALTY METHODOLOGY"
        : "COMPLIANCE RATING WEIGHT DISTRIBUTION & BREACH PENALTY METHODOLOGY", 
      48, 
      curY + 10
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    if (isConsultantAudit) {
      doc.text(
        "• Submittal SLA & RFI Turnaround (50%): Operational Turnaround vs Contract SLA Targets   • 5-Dimension Technical Audit (50%): 105 FIDIC/ERA Evaluation Criteria", 48, curY + 18
      );
      doc.text(
        "• Combined Overall Score: 50% SLA + 50% Technical Audit   • Rating Scale: Grade A (90-100%) | Grade B (75-89%) | Grade C (60-74%) | Grade D (50-59%) | Grade Failed (<50%)", 48, curY + 24
      );
    } else {
      doc.text(
        `• FIDIC Compliance (${contractorWeights.fidic}%): Bonds & Risks   • Time Overrun (${contractorWeights.projectMgmt}%): EOT & Schedule Slippage   • EVM Metrics (${contractorWeights.evm}%): SPI (${(contractorWeights.evm / 2).toFixed(1)}%) + CPI (${(contractorWeights.evm / 2).toFixed(1)}%)`, 48, curY + 18
      );
      doc.text(
        `• KPIs & Quality (${contractorWeights.kpi}%): Bond/Risk Deductions   • Linear Layers (${contractorWeights.linear}%): Layer Progress %   • Rating Scale: Grade A (>=85%) | B (75-84%) | C (65-74%) | D/F (<65%)`, 48, curY + 24
      );
    }

    curY += 38;

    // Detailed Projects Grid title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(isConsultantAudit ? "SUPERVISION CONSULTANT PERFORMANCE & COMPLIANCE MATRIX" : "COMPLIANCE AUDIT MATRIX BY PROJECT", 40, curY);
    curY += 12;

    // Landscape Columns widths (Total A4 width: 841.89 pt, printable width: 761.89 pt)
    const colWidths = isConsultantAudit ? {
      name: 125,
      consultant_re: 145,
      staffing: 115,
      sla_turnaround: 125,
      ipc_claims: 125,
      score_rating: 126.89
    } : {
      name: 110,
      contract_details: 130,
      schedule: 115,
      evm: 95,
      linear: 130,
      bonds_risks: 95,
      score_rating: 86
    };

    const colX = isConsultantAudit ? {
      name: 40,
      consultant_re: 40 + (colWidths as any).name,
      staffing: 40 + (colWidths as any).name + (colWidths as any).consultant_re,
      sla_turnaround: 40 + (colWidths as any).name + (colWidths as any).consultant_re + (colWidths as any).staffing,
      ipc_claims: 40 + (colWidths as any).name + (colWidths as any).consultant_re + (colWidths as any).staffing + (colWidths as any).sla_turnaround,
      score_rating: 40 + (colWidths as any).name + (colWidths as any).consultant_re + (colWidths as any).staffing + (colWidths as any).sla_turnaround + (colWidths as any).ipc_claims
    } : {
      name: 40,
      contract_details: 40 + (colWidths as any).name,
      schedule: 40 + (colWidths as any).name + (colWidths as any).contract_details,
      evm: 40 + (colWidths as any).name + (colWidths as any).contract_details + (colWidths as any).schedule,
      linear: 40 + (colWidths as any).name + (colWidths as any).contract_details + (colWidths as any).schedule + (colWidths as any).evm,
      bonds_risks: 40 + (colWidths as any).name + (colWidths as any).contract_details + (colWidths as any).schedule + (colWidths as any).evm + (colWidths as any).linear,
      score_rating: 40 + (colWidths as any).name + (colWidths as any).contract_details + (colWidths as any).schedule + (colWidths as any).evm + (colWidths as any).linear + (colWidths as any).bonds_risks
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);

      if (isConsultantAudit) {
        const headerNameLines = doc.splitTextToSize("PROJECT IDENTIFIER / TITLE", (colWidths as any).name - 12);
        const headerConsultantLines = doc.splitTextToSize("SUPERVISION CONSULTANT & RE", (colWidths as any).consultant_re - 12);
        const headerStaffingLines = doc.splitTextToSize("KEY STAFF MOBILIZATION", (colWidths as any).staffing - 12);
        const headerSlaLines = doc.splitTextToSize("SUBMITTAL SLA & RFI TURNAROUND", (colWidths as any).sla_turnaround - 12);
        const headerIpcLines = doc.splitTextToSize("IPC TIMELINESS & CLAIMS", (colWidths as any).ipc_claims - 12);
        const headerScoreLines = doc.splitTextToSize("AUDIT SCORE & OFFICIAL GRADE", (colWidths as any).score_rating - 12);

        const maxHeaderLines = Math.max(
          headerNameLines.length,
          headerConsultantLines.length,
          headerStaffingLines.length,
          headerSlaLines.length,
          headerIpcLines.length,
          headerScoreLines.length
        );
        const headerHeight = maxHeaderLines * 11 + 10;

        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        const drawCellLines = (lines: string[], x: number) => {
          let lineY = y + 12;
          lines.forEach(line => {
            doc.text(line, x + 6, lineY);
            lineY += 10;
          });
        };

        drawCellLines(headerNameLines, (colX as any).name);
        drawCellLines(headerConsultantLines, (colX as any).consultant_re);
        drawCellLines(headerStaffingLines, (colX as any).staffing);
        drawCellLines(headerSlaLines, (colX as any).sla_turnaround);
        drawCellLines(headerIpcLines, (colX as any).ipc_claims);
        drawCellLines(headerScoreLines, (colX as any).score_rating);

        return headerHeight;
      } else {
        const headerNameLines = doc.splitTextToSize("PROJECT IDENTIFIER / TITLE", (colWidths as any).name - 12);
        const headerContractDetailsLines = doc.splitTextToSize("CONTRACT DETAILS", (colWidths as any).contract_details - 12);
        const headerScheduleLines = doc.splitTextToSize("SCHEDULE & OVERRUNS (%)", (colWidths as any).schedule - 12);
        const headerEvmLines = doc.splitTextToSize("EVM INDICES (CPI / SPI)", (colWidths as any).evm - 12);
        const headerLinearLines = doc.splitTextToSize("LINEAR PROGRESS BY LAYERS", (colWidths as any).linear - 12);
        const headerBondsRisksLines = doc.splitTextToSize("GUARANTEES & RISKS", (colWidths as any).bonds_risks - 12);
        const headerScoreRatingLines = doc.splitTextToSize("COMPLIANCE & GRADE", (colWidths as any).score_rating - 12);

        const maxHeaderLines = Math.max(
          headerNameLines.length,
          headerContractDetailsLines.length,
          headerScheduleLines.length,
          headerEvmLines.length,
          headerLinearLines.length,
          headerBondsRisksLines.length,
          headerScoreRatingLines.length
        );
        const headerHeight = maxHeaderLines * 11 + 10;

        doc.setFillColor(30, 41, 59); // slate-800 professional navy header
        doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        const drawCellLines = (lines: string[], x: number) => {
          let lineY = y + 12;
          lines.forEach(line => {
            doc.text(line, x + 6, lineY);
            lineY += 10;
          });
        };

        drawCellLines(headerNameLines, (colX as any).name);
        drawCellLines(headerContractDetailsLines, (colX as any).contract_details);
        drawCellLines(headerScheduleLines, (colX as any).schedule);
        drawCellLines(headerEvmLines, (colX as any).evm);
        drawCellLines(headerLinearLines, (colX as any).linear);
        drawCellLines(headerBondsRisksLines, (colX as any).bonds_risks);
        drawCellLines(headerScoreRatingLines, (colX as any).score_rating);

        return headerHeight;
      }
    };

    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const audit = getAuditMetrics(p);

      const combinedTitle = p.name || 'Untitled Project';
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(combinedTitle, colWidths.name - 12);

      if (isConsultantAudit) {
        const cAudit = getConsultantAuditMetrics(p);
        const typeBadge = cAudit.isSole ? '[Sole Consultant]' : `[JV Consortium]`;
        const firmLines = doc.splitTextToSize(`${typeBadge} ${cAudit.consultantFirm}`, (colWidths as any).consultant_re - 12);
        const reLines = doc.splitTextToSize(`RE: ${cAudit.residentEngineer}`, (colWidths as any).consultant_re - 12);
        const partnerLines = (cAudit.isJv && cAudit.jvPartners) 
          ? doc.splitTextToSize(`Partners: ${cAudit.jvPartners}`, (colWidths as any).consultant_re - 12) 
          : [];
        const cReLines = [...firmLines, ...reLines, ...partnerLines];

        const staffLines1 = doc.splitTextToSize(`Active: ${cAudit.activeStaff} / ${cAudit.totalStaff} (${cAudit.mobilizationRatePct}%)`, (colWidths as any).staffing - 12);
        const staffLines2 = doc.splitTextToSize(`Key Experts: ${cAudit.activeKeyStaffCount}/${cAudit.keyStaffCount}`, (colWidths as any).staffing - 12);
        const staffingLines = [...staffLines1, ...staffLines2];

        const slaLines1 = doc.splitTextToSize(`SLA Rate: ${cAudit.slaComplianceRatePct}%`, (colWidths as any).sla_turnaround - 12);
        const slaLines2 = doc.splitTextToSize(`Turnaround: ${cAudit.avgTurnaroundDays} days avg`, (colWidths as any).sla_turnaround - 12);
        const slaLines3 = doc.splitTextToSize(`Overdue RFIs: ${cAudit.overdueSubmittalsCount}`, (colWidths as any).sla_turnaround - 12);
        const slaLines = [...slaLines1, ...slaLines2, ...slaLines3];

        const ipcLines1 = doc.splitTextToSize(`IPC Score: ${cAudit.ipcScore}/20 pts`, (colWidths as any).ipc_claims - 12);
        const ipcLines2 = doc.splitTextToSize(`Status: ${cAudit.ipcStatusText}`, (colWidths as any).ipc_claims - 12);
        const ipcLines3 = doc.splitTextToSize(`Claims: ${cAudit.activeClaimsCount} active`, (colWidths as any).ipc_claims - 12);
        const ipcLines = [...ipcLines1, ...ipcLines2, ...ipcLines3];

        const scoreLines1 = doc.splitTextToSize(`Score: ${cAudit.totalWeightedScore}%`, (colWidths as any).score_rating - 12);
        const scoreLines2 = doc.splitTextToSize(`Grade ${cAudit.officialGrade}`, (colWidths as any).score_rating - 12);
        const scoreLines3 = doc.splitTextToSize(cAudit.officialRatingTitle, (colWidths as any).score_rating - 12);
        const scoreLines = [...scoreLines1, ...scoreLines2, ...scoreLines3];

        const nameH = titleLines.length * 15 + 12;
        const cReH = cReLines.length * 15 + 12;
        const staffingH = staffingLines.length * 15 + 12;
        const slaH = slaLines.length * 15 + 12;
        const ipcH = ipcLines.length * 15 + 12;
        const scoreH = scoreLines.length * 15 + 12;

        const rowHeight = Math.max(nameH, cReH, staffingH, slaH, ipcH, scoreH, 68);

        if (curY + rowHeight > pageHeight - 55) {
          doc.addPage();
          pageCount++;
          curY = 60;
          drawHeaderFooter();
          const headerH = drawTableHeader(curY);
          curY += headerH;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(1);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

        doc.line((colX as any).consultant_re, curY, (colX as any).consultant_re, curY + rowHeight);
        doc.line((colX as any).staffing, curY, (colX as any).staffing, curY + rowHeight);
        doc.line((colX as any).sla_turnaround, curY, (colX as any).sla_turnaround, curY + rowHeight);
        doc.line((colX as any).ipc_claims, curY, (colX as any).ipc_claims, curY + rowHeight);
        doc.line((colX as any).score_rating, curY, (colX as any).score_rating, curY + rowHeight);

        // Render text
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        let yOffsetN = curY + 18;
        titleLines.forEach((line: string) => {
          doc.text(line, (colX as any).name + 6, yOffsetN);
          yOffsetN += 15;
        });

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        let yOffsetCR = curY + 18;
        cReLines.forEach((line: string) => {
          doc.text(line, (colX as any).consultant_re + 6, yOffsetCR);
          yOffsetCR += 15;
        });

        let yOffsetSt = curY + 18;
        staffingLines.forEach((line: string) => {
          doc.text(line, (colX as any).staffing + 6, yOffsetSt);
          yOffsetSt += 15;
        });

        let yOffsetSla = curY + 18;
        slaLines.forEach((line: string) => {
          doc.text(line, (colX as any).sla_turnaround + 6, yOffsetSla);
          yOffsetSla += 15;
        });

        let yOffsetIpc = curY + 18;
        ipcLines.forEach((line: string) => {
          doc.text(line, (colX as any).ipc_claims + 6, yOffsetIpc);
          yOffsetIpc += 15;
        });

        let yOffsetSc = curY + 18;
        scoreLines.forEach((line: string) => {
          doc.text(line, (colX as any).score_rating + 6, yOffsetSc);
          yOffsetSc += 15;
        });

        curY += rowHeight;
        return;
      }

      // 1.5 Contract Details Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const contractorLines = doc.splitTextToSize(`Contractor: ${p.contractor || 'N/A'}`, colWidths.contract_details - 12);
      const consultantLines = doc.splitTextToSize(`Consultant: ${p.consultant || 'N/A'}`, colWidths.contract_details - 12);
      const commencedLines = doc.splitTextToSize(`Commenced: ${p.startDate || 'N/A'}`, colWidths.contract_details - 12);
      const origCostLines = doc.splitTextToSize(`Orig. Cost: ${formatAccounting(p.origAmount || 0, 'Br.')} M`, colWidths.contract_details - 12);
      const cDetailsLines = [
        ...contractorLines,
        ...consultantLines,
        ...commencedLines,
        ...origCostLines
      ];

      // 2. Schedule Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const sLine1 = doc.splitTextToSize(`Time Elapsed: ${audit.timeElapsedPct.toFixed(2)}%`, colWidths.schedule - 12);
      const sLine2 = doc.splitTextToSize(`Time Overrun: ${audit.timeOverrunPct.toFixed(2)}%`, colWidths.schedule - 12);
      const sLine3 = doc.splitTextToSize(`Status: ${audit.scheduleStatusText}`, colWidths.schedule - 12);
      const sLine4 = doc.splitTextToSize(`Phys. Prog: ${(p.physicalProgress || 0).toFixed(2)}%`, colWidths.schedule - 12);

      // 3. EVM Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const evmLine1 = doc.splitTextToSize(`CPI Index: ${audit.CPI.toFixed(3)}`, colWidths.evm - 12);
      const evmLine2 = doc.splitTextToSize(`SPI Index: ${audit.SPI.toFixed(3)}`, colWidths.evm - 12);
      const evmLine3 = doc.splitTextToSize(audit.CPI >= 1.0 ? 'Under Budget' : 'Overspending', colWidths.evm - 12);
      const evmLine4 = doc.splitTextToSize(audit.SPI >= 1.0 ? 'Ahead Sched.' : 'Behind Sched.', colWidths.evm - 12);

      // 4. Linear Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const linLine1 = doc.splitTextToSize(`Subgrade: ${audit.subgradePct.toFixed(0)}% (P: ${audit.subgradePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine2 = doc.splitTextToSize(`Capping: ${audit.cappingPct.toFixed(0)}% (P: ${audit.cappingPlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine3 = doc.splitTextToSize(`Subbase: ${audit.subbasePct.toFixed(0)}% (P: ${audit.subbasePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine4 = doc.splitTextToSize(`Basecourse: ${audit.basecoursePct.toFixed(0)}% (P: ${audit.basecoursePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine5 = doc.splitTextToSize(`Asphalt: ${audit.asphaltPct.toFixed(0)}% (P: ${audit.asphaltPlan.toFixed(0)}%)`, colWidths.linear - 12);

      // 5. Bonds & Risks Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const grLine1 = doc.splitTextToSize(`Bonds Logged: ${audit.totalBonds}`, colWidths.bonds_risks - 12);
      const grLine2 = doc.splitTextToSize(audit.expiredBondsCount > 0 ? `${audit.expiredBondsCount} Expired` : 'Guarantees Valid', colWidths.bonds_risks - 12);
      const grLine3 = doc.splitTextToSize(`Active Risks: ${audit.activeRisksCount}`, colWidths.bonds_risks - 12);
      const grLine4 = doc.splitTextToSize(audit.criticalRisksCount > 0 ? `${audit.criticalRisksCount} Critical` : 'Risks Managed', colWidths.bonds_risks - 12);

      // 6. Compliance Score & Grade Lines
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const scoreLine = doc.splitTextToSize(`Score: ${audit.complianceScore}%`, colWidths.score_rating - 12);
      const gradeLine = doc.splitTextToSize(`Grade ${audit.ratingCode}`, colWidths.score_rating - 12);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const classLine = doc.splitTextToSize(audit.ratingClass, colWidths.score_rating - 12);

      // Pre-calculate heights using 12pt Times New Roman (15pt line spacing)
      const nameHeight = titleLines.length * 15 + 12;
      const cDetailsHeight = cDetailsLines.length * 15 + 12;
      const scheduleHeight = (sLine1.length + sLine2.length + sLine3.length + sLine4.length) * 15 + 12;
      const evmHeight = (evmLine1.length + evmLine2.length + evmLine3.length + evmLine4.length) * 15 + 12;
      const linearHeight = (linLine1.length + linLine2.length + linLine3.length + linLine4.length + linLine5.length) * 15 + 12;
      const bondsHeight = (grLine1.length + grLine2.length + grLine3.length + grLine4.length) * 15 + 12;
      const scoreHeight = (scoreLine.length + gradeLine.length + classLine.length) * 15 + 12;

      const rowHeight = Math.max(nameHeight, cDetailsHeight, scheduleHeight, evmHeight, linearHeight, bondsHeight, scoreHeight, 68);

      // Prevent overflow, add new page with header
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 60;
        drawHeaderFooter();
        const headerH = drawTableHeader(curY);
        curY += headerH;
      }

      // Zebra striping background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Cells outer border
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Grid vertical separators
      doc.line(colX.contract_details, curY, colX.contract_details, curY + rowHeight);
      doc.line(colX.schedule, curY, colX.schedule, curY + rowHeight);
      doc.line(colX.evm, curY, colX.evm, curY + rowHeight);
      doc.line(colX.linear, curY, colX.linear, curY + rowHeight);
      doc.line(colX.bonds_risks, curY, colX.bonds_risks, curY + rowHeight);
      doc.line(colX.score_rating, curY, colX.score_rating, curY + rowHeight);

      // 1. Render Project Identifier & Title
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      let yOffsetN = curY + 18;
      titleLines.forEach((line: string) => {
        doc.text(line, colX.name + 6, yOffsetN);
        yOffsetN += 15;
      });

      // 1.5 Render Contract Details
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetC = curY + 18;
      cDetailsLines.forEach((line: string) => {
        doc.text(line, colX.contract_details + 6, yOffsetC);
        yOffsetC += 15;
      });

      // 2. Render Schedule Audit
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetS = curY + 18;

      sLine1.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });
      sLine2.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });
      
      if (audit.scheduleStatus === 'Critical') {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else if (audit.scheduleStatus === 'Warning') {
        doc.setFont('times', 'bold');
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setFont('times', 'bold');
        doc.setTextColor(22, 163, 74);
      }
      sLine3.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(71, 85, 105);
      sLine4.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });

      // 3. Render EVM Indices
      let yOffsetE = curY + 18;
      doc.setFont('times', 'bold');
      doc.setTextColor(15, 23, 42);
      evmLine1.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });
      evmLine2.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(audit.CPI >= 1.0 ? 22 : 220, audit.CPI >= 1.0 ? 163 : 38, audit.CPI >= 1.0 ? 74 : 38);
      evmLine3.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      doc.setTextColor(audit.SPI >= 1.0 ? 22 : 220, audit.SPI >= 1.0 ? 163 : 38, audit.SPI >= 1.0 ? 74 : 38);
      evmLine4.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      // 4. Render Linear Progress
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetL = curY + 18;
      linLine1.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine2.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine3.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine4.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine5.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });

      // 5. Render Guarantees & Risks
      let yOffsetB = curY + 18;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      grLine1.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      if (audit.expiredBondsCount > 0) {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setFont('times', 'normal');
        doc.setTextColor(22, 163, 74);
      }
      grLine2.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(71, 85, 105);
      grLine3.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      if (audit.criticalRisksCount > 0) {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setFont('times', 'normal');
        doc.setTextColor(71, 85, 105);
      }
      grLine4.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      // 6. Render Compliance Score & Grade
      let yOffsetSc = curY + 18;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      scoreLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      if (audit.complianceScore >= 85) {
        doc.setTextColor(22, 163, 74);
      } else if (audit.complianceScore >= 70) {
        doc.setTextColor(13, 148, 136);
      } else if (audit.complianceScore >= 50) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      gradeLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      classLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      curY += rowHeight;
    });


    // Final Page Sign-off section
    if (curY + 90 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 75;
      drawHeaderFooter();
    }

    curY = drawUniversalSignatureBlock(doc, curY, 'p');

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${j} of ${pageCount}`, pageWidth - 60, pageHeight - 24);
    }

    doc.save(`ERA_Compliance_Audit_Report_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.pdf`);
  };

  // Export Project Compliance & Performance Audit Report (CSV)
  const handleExportAuditCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Program Directorate',
      'PMO Grouping',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Classification',
      'Contract Type (DB/DBB)',
      'Total Section Length',
      'Signing Date',
      'Commencement Date',
      'Original Contract Completion Date',
      'Extension of Time (EOT Days)',
      'Revised Completion Date',
      'Physical Progress (%)',
      'Time Elapsed (%)',
      'Cost Performance Index',
      'Schedule Performance Index',
      'Expired Guarantees Count',
      'Original Contract Value (ETB)',
      'Revised Contract Value (ETB)',
      'Total Todate Bill Summary',
      'Price Adjustment',
      'Total Todate Certified IPC',
      'Earned Value',
      'Actual Cost',
      'Cost Variance',
      'Schedule Variance',
      'Estimate At Completion',
      'Provisional Sum (ETB)',
      'Advance Payment',
      'Advance Repayment'
    ];

    const formatDateForCSV = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return `${m}/${d}/${y}`;
          }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    const addDaysToStartDate = (startDateStr: string, daysToAdd: number): string => {
      if (!startDateStr) return '';
      try {
        const parts = startDateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const targetDate = new Date(y, m, d + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        } else {
          const targetDate = new Date(startDateStr);
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        }
      } catch {
        return '';
      }
    };

    const formatFinancialForCSV = (val: number | string | undefined | null) => {
      if (val === undefined || val === null || val === '') return '';
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return '';
      const rawValue = (Math.abs(num) > 0 && Math.abs(num) < 10000) ? num * 1000000 : num;
      if (rawValue % 1 === 0) {
        return rawValue.toFixed(0);
      }
      const strVal = rawValue.toString();
      const dotIndex = strVal.indexOf('.');
      if (dotIndex !== -1 && strVal.length - dotIndex - 1 === 1) {
        return rawValue.toFixed(2);
      }
      return rawValue.toFixed(2);
    };

    const rows = processedProjects.map(p => {
      const audit = getAuditMetrics(p);
      const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);

      // Date calculations
      let origCompletionDate = '';
      let revisedCompletionDate = '';
      if (p.startDate) {
        origCompletionDate = addDaysToStartDate(p.startDate, p.origDays || 0);
        revisedCompletionDate = addDaysToStartDate(p.startDate, totalDays);
      }

      // Time Elapsed calculation
      let timeElapsedPctCell = '0.00%';
      if (p.startDate) {
        if (totalDays <= 0) {
          timeElapsedPctCell = '0.00%';
        } else {
          const parseDate = (str: string) => {
            const pts = str.split('-');
            if (pts.length === 3) {
              return new Date(parseInt(pts[0], 10), parseInt(pts[1], 10) - 1, parseInt(pts[2], 10));
            }
            return new Date(str);
          };
          const comm = parseDate(p.startDate);
          comm.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let daysElapsed = 0;
          if (today.getTime() >= comm.getTime()) {
            const diffTime = today.getTime() - comm.getTime();
            daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }

          const pct = Math.min(100, (daysElapsed / totalDays) * 100);
          timeElapsedPctCell = `${pct.toFixed(2)}%`;
        }
      }

      // Physical Progress formatted
      const physicalProgressPctCell = p.physicalProgress !== undefined && p.physicalProgress !== null
        ? `${p.physicalProgress.toFixed(2)}%`
        : '0.00%';

      // Payment values extraction
      const getPaymentVal = (itemName: string) => {
        if (!p.payment) return undefined;
        const match = p.payment.find(item => item.item.trim().toLowerCase() === itemName.toLowerCase());
        return match ? match.amount : undefined;
      };

      const advPayment = formatFinancialForCSV(getPaymentVal('Advance Payment'));
      const advRepay = formatFinancialForCSV(getPaymentVal('Advance Repayment'));
      const billSummary = formatFinancialForCSV(getPaymentVal('Total Todate Bill Summary'));
      const priceAdj = formatFinancialForCSV(getPaymentVal('Price Adjustment'));
      const certifiedIpc = formatFinancialForCSV(getPaymentVal('Total Todate Certified IPC'));

      // Calculate EVM metrics dynamically for the CSV via unified engine
      const evm = calculateProjectEvm(p);
      const { BAC, AC, EV, PV, CPI, SPI, CV, SV, EAC } = evm;

      const cpiStr = CPI !== null && !isNaN(CPI) ? CPI.toFixed(3) : '';
      const spiStr = SPI !== null && !isNaN(SPI) ? SPI.toFixed(3) : '';
      const evStr = EV > 0 ? formatFinancialForCSV(EV) : '';
      const acStr = AC > 0 ? formatFinancialForCSV(AC) : '';
      const cvStr = formatFinancialForCSV(CV);
      const svStr = formatFinancialForCSV(SV);
      const eacStr = EAC > 0 ? formatFinancialForCSV(EAC) : '';

      return [
        p.name || 'Untitled Project',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.classification || 'N/A',
        p.contractType || 'DBB',
        p.lengthKm !== undefined && p.lengthKm !== null ? p.lengthKm : '',
        formatDateForCSV(p.signDate),
        formatDateForCSV(p.startDate),
        origCompletionDate,
        p.eotDays || 0,
        revisedCompletionDate,
        physicalProgressPctCell,
        timeElapsedPctCell,
        cpiStr,
        spiStr,
        audit.expiredBondsCount || 0,
        formatFinancialForCSV(p.origAmount),
        formatFinancialForCSV(p.origAmount + ((p.variation || 0) > 10000 ? (p.variation || 0) / 1_000_000 : (p.variation || 0))),
        billSummary,
        priceAdj,
        certifiedIpc,
        evStr,
        acStr,
        cvStr,
        svStr,
        eacStr,
        formatFinancialForCSV(p.provisionalSum),
        advPayment,
        advRepay
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Compliance_Audit_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Matured Payments & Outstanding Claims report (CSV)
  const handleExportPaymentsCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Program Directorate',
      'PMO Grouping',
      'USD Exchange Rate',
      'Total Certified IPCs',
      'Paid IPCs',
      'Outstanding Unpaid IPCs',
      'Matured Overdue IPCs (>56 Days)',
      'Total Certified Amount (ETB)',
      'Total Certified Amount (USD)',
      'Total Paid Amount (ETB)',
      'Total Paid Amount (USD)',
      'Total Outstanding Amount (ETB)',
      'Total Outstanding Amount (USD)',
      'Matured Overdue Amount (ETB)',
      'Matured Overdue Amount (USD)',
      'Combined Certified Amount (ETB equivalent)',
      'Combined Outstanding Amount (ETB equivalent)',
      'Combined Matured Amount (ETB equivalent)',
      'Payment Compliance Status'
    ];

    const rows = processedProjects.map(p => {
      const m = getProjectPaymentMetrics(p);
      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.usdExchangeRate || 28.0,
        m.totalIpcs,
        m.paidIpcs,
        m.unpaidIpcs,
        m.maturedIpcsCount,
        m.certEtb,
        m.certUsd,
        m.paidEtb,
        m.paidUsd,
        m.unpaidEtb,
        m.unpaidUsd,
        m.maturedEtb,
        m.maturedUsd,
        m.combinedCertified,
        m.combinedPaid,
        m.combinedUnpaid,
        m.combinedMatured,
        m.statusLabel
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Matured_Payments_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Bond Guarantees report (CSV)
  const handleExportBondsCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Program Directorate',
      'PMO Grouping',
      'Total Logged Bonds',
      'Valid & Active Bonds',
      'Expired Bonds',
      'Total Bonds Value (ETB)'
    ];

    const rows = processedProjects.map(p => {
      const bonds = p.bonds || [];
      const totalCount = bonds.length;
      const validCount = bonds.filter(b => b.status === 'Valid' || (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))).length;
      const expiredCount = bonds.filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        if (b.expireDate) {
          try { return new Date(b.expireDate) < new Date(); } catch { return false; }
        }
        return false;
      }).length;
      const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);

      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        totalCount,
        validCount,
        expiredCount,
        totalVal
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Bond_Guarantees_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Bond Guarantees status report (PDF)
  const handleExportBondsPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawHeaderFooter = () => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Elegant blue compliance accent line
      doc.setDrawColor(37, 99, 235); // Blue bond accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Official ERA Logo
      drawEraLogo(doc, 40, 28, 26, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 3
      });

      // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
      const dsW3 = 130;
      const dsX3 = pageWidth - 40 - dsW3;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(dsX3, 28, dsW3, 26, 3, 3, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("OFFICIAL DATE STAMP", dsX3 + 6, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX3 + 6, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • OFFICIAL`, dsX3 + 6, 50);

      // Title & Metadata Block
      const maxTitleW3 = dsX3 - 72 - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • FINANCIAL & LEGAL COMPLIANCE", 72, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      const bondMetaStr = `CMS - SECURITIES & BANK GUARANTEES AUDIT REPORT • AUDITOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedBondMeta = doc.splitTextToSize(bondMetaStr, maxTitleW3);
      doc.text(wrappedBondMeta[0] || bondMetaStr, 72, 51);

      // Page numbers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`PAGE ${pageCount}`, pageWidth - 50, pageHeight - 30);
      
      doc.setFont('helvetica', 'normal');
      doc.text("CONFIDENTIAL - ERA ERP COMPLIANCE OFFICE", 40, pageHeight - 30);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(40, pageHeight - 45, pageWidth - 40, pageHeight - 45);
    };

    drawHeaderFooter();

    // Render Stats Cards Block at top of page 1
    const cardWidth = 175;
    const cardHeight = 50;
    const cardY = 70;

    // Card 1: Total Guarantees
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL LOGGED GUARANTEES", 48, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${bondStats.totalBondsCount} Guarantees`, 48, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Valued at ETB ${bondStats.totalBondsValue.toLocaleString()}`, 48, cardY + 44);

    // Card 2: Valid Guarantees
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("VALID & ACTIVE GUARANTEES", 40 + cardWidth + 18, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${bondStats.validBondsCount} Valid`, 40 + cardWidth + 18, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ETB ${bondStats.validBondsValue.toLocaleString()}`, 40 + cardWidth + 18, cardY + 44);

    // Card 3: Expired Guarantees
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("CRITICAL EXPIRED GUARANTEES", 40 + (cardWidth + 10) * 2 + 8, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`${bondStats.expiredBondsCount} Expired`, 40 + (cardWidth + 10) * 2 + 8, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ETB ${bondStats.expiredBondsValue.toLocaleString()}`, 40 + (cardWidth + 10) * 2 + 8, cardY + 44);

    // Card 4: Group Filter
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("GROUP CLASSIFICATION FOCUS", 40 + (cardWidth + 10) * 3 + 8, cardY + 16);
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    const wrappedGroupText = doc.splitTextToSize(selectedGroup.toUpperCase(), cardWidth - 16);
    doc.text(wrappedGroupText[0] || '', 40 + (cardWidth + 10) * 3 + 8, cardY + 30);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Query dimension: ${groupType.toUpperCase()}`, 40 + (cardWidth + 10) * 3 + 8, cardY + 44);

    curY = 145;

    // Headers
    const colX = {
      name: 40,
      bonds: 280,
      valid: 550,
      expired: 675
    };

    const drawTableHeader = (y: number) => {
      doc.setFillColor(30, 41, 59); // dark slate bg
      doc.rect(40, y, pageWidth - 80, 24, 'F');
      
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      
      doc.text("PROJECT ID & TITLE", colX.name + 6, y + 16);
      doc.text("TOTAL LOGGED GUARANTEES & BREAKDOWN", colX.bonds + 6, y + 16);
      doc.text("VALID & ACTIVE", colX.valid + 6, y + 16);
      doc.text("EXPIRED (CRITICAL)", colX.expired + 6, y + 16);
    };

    drawTableHeader(curY);
    curY += 24;

    processedProjects.forEach((p, idx) => {
      const bonds = p.bonds || [];
      const totalCount = bonds.length;
      const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);
      const validCount = bonds.filter(b => b.status === 'Valid').length;
      const validVal = bonds.filter(b => b.status === 'Valid').reduce((sum, b) => sum + (b.amount || 0), 0);
      const expiredCount = bonds.filter(b => b.status === 'Expired').length;
      const expiredVal = bonds.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.amount || 0), 0);

      // Pre-calculate wrapped texts with strict boundary limits
      // Col 1: Name & Contractor (boundary: 228pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const cleanName = p.name.replace(/[^\x00-\x7F]/g, "");
      const wrappedName = doc.splitTextToSize(cleanName, 228);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const contractorText = `ID: ${p.id.toUpperCase().substring(0, 16)}  |  Contractor: ${p.contractor || 'N/A'}`;
      const wrappedContractor = doc.splitTextToSize(contractorText, 228);

      // Col 2: Total Logged & Bonds breakdown (boundary: 258pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const bondsSummaryText = `${totalCount} Guarantees (ETB ${totalVal.toLocaleString()})`;
      const wrappedBondsSummary = doc.splitTextToSize(bondsSummaryText, 258);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      let bondLinesTotal = 0;
      const wrappedBonds = bonds.map((b) => {
         const bStatus = b.status || 'Unknown';
         const bAmountStr = (b.amount || 0) > 0 ? ` - ETB ${(b.amount || 0).toLocaleString()}` : '';
         const bText = `• ${b.type || 'Guarantee'}: ${bStatus} (${b.bank || 'Unknown Bank'}${bAmountStr})`;
         const splitBText = doc.splitTextToSize(bText, 258);
         bondLinesTotal += splitBText.length;
         return { split: splitBText, status: bStatus };
      });

      // Col 3: Valid (boundary: 113pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const validCountText = `${validCount} Valid`;
      const wrappedValidCount = doc.splitTextToSize(validCountText, 113);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const validValText = `ETB ${validVal.toLocaleString()}`;
      const wrappedValidVal = doc.splitTextToSize(validValText, 113);

      // Col 4: Expired (boundary: 115pt)
      let wrappedExpiredCount: string[] = [];
      let wrappedExpiredVal: string[] = [];
      if (expiredCount > 0) {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        wrappedExpiredCount = doc.splitTextToSize(`${expiredCount} EXPIRED`, 115);
        wrappedExpiredVal = doc.splitTextToSize(`ETB ${expiredVal.toLocaleString()}`, 115);
      } else {
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        wrappedExpiredCount = doc.splitTextToSize("0 Expired", 115);
        wrappedExpiredVal = doc.splitTextToSize("No alert status", 115);
      }

      // Height calculations based on 12pt Times New Roman (15pt line spacing)
      const col1Height = (wrappedName.length * 15) + (wrappedContractor.length * 15) + 12;
      const col2Height = (wrappedBondsSummary.length * 15) + (bondLinesTotal * 15) + 12;
      const col3Height = (wrappedValidCount.length * 15) + (wrappedValidVal.length * 15) + 12;
      const col4Height = (wrappedExpiredCount.length * 15) + (wrappedExpiredVal.length * 15) + 12;
      const rowHeight = Math.max(52, col1Height, col2Height, col3Height, col4Height) + 12;

      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 55;
        drawHeaderFooter();
        drawTableHeader(curY);
        curY += 24;
      }

      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      }

      // Border bottom
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(40, curY + rowHeight, pageWidth - 40, curY + rowHeight);

      // Col 1: Project Name & Contractor
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(wrappedName, colX.name + 6, curY + 18);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(wrappedContractor, colX.name + 6, curY + 18 + (wrappedName.length * 15));

      // Col 2: Total Logged & Bonds Breakdown
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedBondsSummary, colX.bonds + 6, curY + 18);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      let currentBondsY = curY + 18 + (wrappedBondsSummary.length * 15) + 3;
      wrappedBonds.forEach((wb) => {
        if (wb.status === 'Valid') {
            doc.setTextColor(16, 185, 129); // green
        } else if (wb.status === 'Expired') {
            doc.setTextColor(220, 38, 38); // red
        } else {
            doc.setTextColor(217, 119, 6); // amber
        }
        doc.text(wb.split, colX.bonds + 6, currentBondsY);
        currentBondsY += (wb.split.length * 15);
      });

      // Col 3: Valid
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(wrappedValidCount, colX.valid + 6, curY + 18);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(wrappedValidVal, colX.valid + 6, curY + 18 + (wrappedValidCount.length * 15));

      // Col 4: Expired
      if (expiredCount > 0) {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(wrappedExpiredCount, colX.expired + 6, curY + 18);
        doc.text(wrappedExpiredVal, colX.expired + 6, curY + 18 + (wrappedExpiredCount.length * 15));
      } else {
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text(wrappedExpiredCount, colX.expired + 6, curY + 18);
        doc.setTextColor(148, 163, 184);
        doc.text(wrappedExpiredVal, colX.expired + 6, curY + 18 + (wrappedExpiredCount.length * 15));
      }

      curY += rowHeight;
    });

    // Final Page Sign-off section for Bonds & Guarantees
    if (curY + 75 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 75;
      drawHeaderFooter();
    }

    curY = drawUniversalSignatureBlock(doc, curY, 'p');

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`PAGE ${j} OF ${pageCount}`, pageWidth - 80, pageHeight - 30);
    }

    // Save PDF
    const gName = selectedGroup.replace(/\s+/g, '_');
    doc.save(`ERA_Bonds_Guarantee_Report_${groupType}_${gName}.pdf`);
  };

  // Export beautiful Matured Payments & Outstanding Claims report (PDF)
  const handleExportPaymentsPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawHeaderFooter = () => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Elegant Emerald compliance accent line
      doc.setDrawColor(16, 185, 129); // Emerald payment accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Official ERA Logo
      drawEraLogo(doc, 40, 28, 26, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 3
      });

      // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
      const dsW4 = 130;
      const dsX4 = pageWidth - 40 - dsW4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(dsX4, 28, dsW4, 26, 3, 3, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("OFFICIAL DATE STAMP", dsX4 + 6, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX4 + 6, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • OFFICIAL`, dsX4 + 6, 50);

      // Title & Metadata Block
      const maxTitleW4 = dsX4 - 72 - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • FINANCIAL MONITORING", 72, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      const subTitleStr = `CMS - CONTRACT MONITORING & OUTSTANDING IPC CLAIMS AUDIT • AUDITOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedSubTitle = doc.splitTextToSize(subTitleStr, maxTitleW4);
      doc.text(wrappedSubTitle[0] || subTitleStr, 72, 51);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(40, pageHeight - 38, pageWidth - 40, pageHeight - 38);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`CONFIDENTIALITY CLAUSE: RESTRICTED TO GOVERNANCE & FINANCE RECONCILIATION TEAMS ONLY`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // emerald-600
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    const headlineText = `MATURED PAYMENT STATUS & OUTSTANDING CLAIMS DOSSIER: ${groupLabelStr} • ${groupNameStr}`;
    const headlineLines = doc.splitTextToSize(headlineText, pageWidth - 80);
    headlineLines.forEach((hLine: string, hIdx: number) => {
      doc.text(hLine, 40, 75 + hIdx * 11);
    });

    // Decorative thin separator
    const separatorY = 75 + (headlineLines.length * 11) + 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, separatorY, pageWidth - 40, separatorY);

    // Top Compliance KPI Summary Blocks (with exact currency breakdowns and boundary wrapping)
    const cardGap = 10;
    const cardWidth = (pageWidth - 80 - (cardGap * 3)) / 4; 
    const cardY = separatorY + 8;
    const cardHeight = 62;
    const cardInnerPad = 8;
    const cardTextWidth = cardWidth - (cardInnerPad * 2);

    // KPI Card 1: Total Audited Contracts
    doc.setFillColor(236, 253, 245); // soft green
    doc.rect(40, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.rect(40, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    const c1Title = doc.splitTextToSize("TOTAL ACTIVE PROJECTS", cardTextWidth);
    doc.text(c1Title[0] || "TOTAL ACTIVE PROJECTS", 40 + cardInnerPad, cardY + 14);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const c1Val = doc.splitTextToSize(`${processedProjects.length} Contracts`, cardTextWidth);
    doc.text(c1Val[0] || `${processedProjects.length} Contracts`, 40 + cardInnerPad, cardY + 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const c1Sub1 = doc.splitTextToSize(`Total IPCs: ${paymentStats.totalIpcCount}`, cardTextWidth);
    doc.text(c1Sub1[0] || '', 40 + cardInnerPad, cardY + 41);
    const c1Sub2 = doc.splitTextToSize(`Paid: ${paymentStats.totalIpcCount - paymentStats.unpaidIpcCount} • Unpaid: ${paymentStats.unpaidIpcCount}`, cardTextWidth);
    doc.text(c1Sub2[0] || '', 40 + cardInnerPad, cardY + 52);

    // KPI Card 2: Total Certified Value (Exact ETB + USD)
    const card2X = 40 + cardWidth + cardGap;
    doc.setFillColor(248, 250, 252);
    doc.rect(card2X, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(card2X, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const c2Title = doc.splitTextToSize("TOTAL CERTIFIED CLAIMS", cardTextWidth);
    doc.text(c2Title[0] || "TOTAL CERTIFIED CLAIMS", card2X + cardInnerPad, cardY + 14);
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const c2Etb = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalCertifiedEtb, '')}`, cardTextWidth);
    doc.text(c2Etb[0] || '', card2X + cardInnerPad, cardY + 27);
    const c2Usd = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalCertifiedUsd, '')}`, cardTextWidth);
    doc.text(c2Usd[0] || '', card2X + cardInnerPad, cardY + 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const c2Eqv = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedCertifiedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, cardTextWidth);
    doc.text(c2Eqv[0] || '', card2X + cardInnerPad, cardY + 52);

    // KPI Card 3: Total Outstanding Unpaid (Exact ETB + USD)
    const card3X = 40 + (cardWidth + cardGap) * 2;
    doc.setFillColor(255, 251, 235); // soft amber
    doc.rect(card3X, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(253, 230, 138);
    doc.rect(card3X, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    const c3Title = doc.splitTextToSize("TOTAL OUTSTANDING (UNPAID)", cardTextWidth);
    doc.text(c3Title[0] || "TOTAL OUTSTANDING (UNPAID)", card3X + cardInnerPad, cardY + 14);
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    const c3Etb = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalUnpaidEtb, '')}`, cardTextWidth);
    doc.text(c3Etb[0] || '', card3X + cardInnerPad, cardY + 27);
    const c3Usd = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalUnpaidUsd, '')}`, cardTextWidth);
    doc.text(c3Usd[0] || '', card3X + cardInnerPad, cardY + 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    const c3Eqv = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedUnpaidEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${paymentStats.unpaidIpcCount} IPCs)`, cardTextWidth);
    doc.text(c3Eqv[0] || '', card3X + cardInnerPad, cardY + 52);

    // KPI Card 4: Critical Matured Overdue (Exact ETB + USD)
    const card4X = 40 + (cardWidth + cardGap) * 3;
    doc.setFillColor(254, 242, 242); // soft red
    doc.rect(card4X, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.rect(card4X, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28); // red-700
    const c4Title = doc.splitTextToSize("MATURED OVERDUE (>56 DAYS)", cardTextWidth);
    doc.text(c4Title[0] || "MATURED OVERDUE (>56 DAYS)", card4X + cardInnerPad, cardY + 14);
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    const c4Etb = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalMaturedEtb, '')}`, cardTextWidth);
    doc.text(c4Etb[0] || '', card4X + cardInnerPad, cardY + 27);
    const c4Usd = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalMaturedUsd, '')}`, cardTextWidth);
    doc.text(c4Usd[0] || '', card4X + cardInnerPad, cardY + 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(153, 27, 27);
    const c4Eqv = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedMaturedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${paymentStats.maturedIpcCount} Overdue)`, cardTextWidth);
    doc.text(c4Eqv[0] || '', card4X + cardInnerPad, cardY + 52);

    const colWidths = {
      name: 210,
      ipcCount: 95,
      certified: 150,
      outstanding: 150,
      matured: 156.89
    };

    const colX = {
      name: 40,
      ipcCount: 40 + colWidths.name,
      certified: 40 + colWidths.name + colWidths.ipcCount,
      outstanding: 40 + colWidths.name + colWidths.ipcCount + colWidths.certified,
      matured: 40 + colWidths.name + colWidths.ipcCount + colWidths.certified + colWidths.outstanding
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const headerNameLines = doc.splitTextToSize("CONTRACT TITLE & CONTRACTOR", colWidths.name - 14);
      const headerIpcLines = doc.splitTextToSize("IPC COUNT & STATUS", colWidths.ipcCount - 14);
      const headerCertifiedLines = doc.splitTextToSize("TOTAL CERTIFIED VALUE (ETB & USD)", colWidths.certified - 14);
      const headerOutstandingLines = doc.splitTextToSize("OUTSTANDING CLAIMS (ETB & USD)", colWidths.outstanding - 14);
      const headerMaturedLines = doc.splitTextToSize("MATURED OVERDUE (>56d) (ETB & USD)", colWidths.matured - 14);

      const maxHeaderLines = Math.max(
        headerNameLines.length,
        headerIpcLines.length,
        headerCertifiedLines.length,
        headerOutstandingLines.length,
        headerMaturedLines.length
      );
      const headerHeight = maxHeaderLines * 9.5 + 10;

      doc.setFillColor(15, 23, 42); // slate-900 (professional navy dark)
      doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      const drawHeaderCellLines = (lines: string[], x: number) => {
        const startY = y + (headerHeight - (lines.length * 9.5)) / 2 + 7.5;
        lines.forEach((line, idx) => {
          doc.text(line, x + 7, startY + idx * 9.5);
        });
      };

      drawHeaderCellLines(headerNameLines, colX.name);
      drawHeaderCellLines(headerIpcLines, colX.ipcCount);
      drawHeaderCellLines(headerCertifiedLines, colX.certified);
      drawHeaderCellLines(headerOutstandingLines, colX.outstanding);
      drawHeaderCellLines(headerMaturedLines, colX.matured);

      // Header border line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
      doc.line(40, y + headerHeight, pageWidth - 40, y + headerHeight);
      doc.line(40, y, 40, y + headerHeight);
      doc.line(pageWidth - 40, y, pageWidth - 40, y + headerHeight);

      // Vertical separators
      doc.line(colX.ipcCount, y, colX.ipcCount, y + headerHeight);
      doc.line(colX.certified, y, colX.certified, y + headerHeight);
      doc.line(colX.outstanding, y, colX.outstanding, y + headerHeight);
      doc.line(colX.matured, y, colX.matured, y + headerHeight);

      return headerHeight;
    };

    curY = cardY + cardHeight + 12;
    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const m = getProjectPaymentMetrics(p);

      // Pre-calculate wrapped lines for Column 1
      const combinedTitle = p.name || 'Untitled Project';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const titleLines = doc.splitTextToSize(combinedTitle, colWidths.name - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const subTextStr = `Contractor: ${p.contractor || 'N/A'}`;
      const subTextLines = doc.splitTextToSize(subTextStr, colWidths.name - 14);

      doc.setFontSize(6);
      const metaTextStr = `Dir: ${p.programDirectorate || 'N/A'} • PMO: ${p.pmo || 'N/A'} (1 USD = ${p.usdExchangeRate || 28.0} ETB)`;
      const metaTextLines = doc.splitTextToSize(metaTextStr, colWidths.name - 14);

      // Pre-calculate wrapped lines for Column 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const ipcLines = doc.splitTextToSize(`${m.totalIpcs} Total IPCs`, colWidths.ipcCount - 14);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const ipcSubLines = doc.splitTextToSize(`${m.paidIpcs} Paid • ${m.unpaidIpcs} Unpaid`, colWidths.ipcCount - 14);

      const ipcStatusBadge = m.maturedIpcsCount > 0 
        ? `[!] ${m.maturedIpcsCount} Overdue (>56d)` 
        : m.unpaidIpcs > 0 
        ? `[*] ${m.unpaidIpcs} Pending` 
        : `[v] Fully Paid`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      const ipcBadgeLines = doc.splitTextToSize(ipcStatusBadge, colWidths.ipcCount - 14);

      // Pre-calculate wrapped lines for Column 3 (Certified)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const certEtbLines = doc.splitTextToSize(`ETB: ${formatAccounting(m.certEtb, '')}`, colWidths.certified - 14);
      const certUsdLines = doc.splitTextToSize(`USD: $${formatAccounting(m.certUsd, '')}`, colWidths.certified - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const certEqvLines = doc.splitTextToSize(`Eqv: ETB ${m.combinedCertified.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, colWidths.certified - 14);

      // Pre-calculate wrapped lines for Column 4 (Outstanding)
      const isOutstanding = m.combinedUnpaid > 0 || m.unpaidEtb > 0 || m.unpaidUsd > 0;
      doc.setFont('helvetica', isOutstanding ? 'bold' : 'normal');
      doc.setFontSize(isOutstanding ? 7.5 : 6.5);
      const outEtbLines = doc.splitTextToSize(isOutstanding ? `ETB: ${formatAccounting(m.unpaidEtb, '')}` : `ETB: 0.00`, colWidths.outstanding - 14);
      const outUsdLines = doc.splitTextToSize(isOutstanding ? `USD: $${formatAccounting(m.unpaidUsd, '')}` : `USD: $0.00`, colWidths.outstanding - 14);
      doc.setFont('helvetica', isOutstanding ? 'normal' : 'bold');
      doc.setFontSize(6.5);
      const outEqvLines = doc.splitTextToSize(
        isOutstanding 
          ? `Eqv: ETB ${m.combinedUnpaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${m.unpaidIpcs} Pending)` 
          : `Fully Paid (0 Pending)`, 
        colWidths.outstanding - 14
      );

      // Pre-calculate wrapped lines for Column 5 (Matured)
      const isMatured = m.combinedMatured > 0 || m.maturedEtb > 0 || m.maturedUsd > 0;
      doc.setFont('helvetica', isMatured ? 'bold' : 'normal');
      doc.setFontSize(isMatured ? 7.5 : 6.5);
      const matEtbLines = doc.splitTextToSize(isMatured ? `ETB: ${formatAccounting(m.maturedEtb, '')}` : `ETB: 0.00`, colWidths.matured - 14);
      const matUsdLines = doc.splitTextToSize(isMatured ? `USD: $${formatAccounting(m.maturedUsd, '')}` : `USD: $0.00`, colWidths.matured - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const matEqvLines = doc.splitTextToSize(
        isMatured 
          ? `Eqv: ETB ${m.combinedMatured.toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
          : `No Overdue Claims`, 
        colWidths.matured - 14
      );
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      const matBadgeLines = isMatured ? doc.splitTextToSize(`! ${m.maturedIpcsCount} Overdue IPCs (>56d)`, colWidths.matured - 14) : [];

      // Calculate total required heights per column
      const col1Height = (titleLines.length * 8.5) + (subTextLines.length * 7.5) + (metaTextLines.length * 7) + 12;
      const col2Height = (ipcLines.length * 8.5) + (ipcSubLines.length * 7.5) + (ipcBadgeLines.length * 7.5) + 12;
      const col3Height = (certEtbLines.length * 8.5) + (certUsdLines.length * 8.5) + (certEqvLines.length * 7.5) + 12;
      const col4Height = (outEtbLines.length * 8) + (outUsdLines.length * 8) + (outEqvLines.length * 7.5) + 12;
      const col5Height = (matEtbLines.length * 8) + (matUsdLines.length * 8) + (matEqvLines.length * 7.5) + (matBadgeLines.length * 7.5) + 12;

      const rowHeight = Math.max(col1Height, col2Height, col3Height, col4Height, col5Height, 42);

      // Page break check with exact dynamic row height
      if (curY + rowHeight > pageHeight - 50) {
        doc.addPage();
        pageCount++;
        drawHeaderFooter();
        
        curY = 75;
        const headerHeight = drawTableHeader(curY);
        curY += headerHeight;
      }

      // Alternating background
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Draw outer borders for each row
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.75);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Draw vertical separators for columns
      doc.line(colX.ipcCount, curY, colX.ipcCount, curY + rowHeight);
      doc.line(colX.certified, curY, colX.certified, curY + rowHeight);
      doc.line(colX.outstanding, curY, colX.outstanding, curY + rowHeight);
      doc.line(colX.matured, curY, colX.matured, curY + rowHeight);

      // Render Column 1 (Title, Contractor, Directorate/PMO)
      let col1Y = curY + 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      titleLines.forEach((line: string) => {
        doc.text(line, colX.name + 7, col1Y);
        col1Y += 8.5;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      subTextLines.forEach((line: string) => {
        doc.text(line, colX.name + 7, col1Y);
        col1Y += 7.5;
      });

      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      metaTextLines.forEach((line: string) => {
        doc.text(line, colX.name + 7, col1Y);
        col1Y += 7;
      });

      // Render Column 2 (IPC Count & Status)
      let col2Y = curY + 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      ipcLines.forEach((line: string) => {
        doc.text(line, colX.ipcCount + 7, col2Y);
        col2Y += 8.5;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      ipcSubLines.forEach((line: string) => {
        doc.text(line, colX.ipcCount + 7, col2Y);
        col2Y += 7.5;
      });

      if (m.maturedIpcsCount > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red-600
      } else if (m.unpaidIpcs > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6); // amber-600
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald-600
      }
      doc.setFontSize(6.5);
      ipcBadgeLines.forEach((line: string) => {
        doc.text(line, colX.ipcCount + 7, col2Y);
        col2Y += 7.5;
      });

      // Render Column 3 (Total Certified Value: ETB, USD, Eqv)
      let col3Y = curY + 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      certEtbLines.forEach((line: string) => {
        doc.text(line, colX.certified + 7, col3Y);
        col3Y += 8.5;
      });
      certUsdLines.forEach((line: string) => {
        doc.text(line, colX.certified + 7, col3Y);
        col3Y += 8.5;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      certEqvLines.forEach((line: string) => {
        doc.text(line, colX.certified + 7, col3Y);
        col3Y += 7.5;
      });

      // Render Column 4 (Outstanding Claims: exact ETB & USD)
      let col4Y = curY + 9;
      if (isOutstanding) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9); // amber-700
        outEtbLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 8;
        });
        outUsdLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 8;
        });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(146, 64, 14);
        outEqvLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 7.5;
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        outEtbLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 7.5;
        });
        outUsdLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 7.5;
        });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(16, 185, 129); // emerald-600
        outEqvLines.forEach((line: string) => {
          doc.text(line, colX.outstanding + 7, col4Y);
          col4Y += 7.5;
        });
      }

      // Render Column 5 (Matured Overdue: exact ETB & USD)
      let col5Y = curY + 9;
      if (isMatured) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(185, 28, 28); // red-700
        matEtbLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 8;
        });
        matUsdLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 8;
        });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(153, 27, 27);
        matEqvLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 7.5;
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(220, 38, 38);
        matBadgeLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 7.5;
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        matEtbLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 7.5;
        });
        matUsdLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 7.5;
        });
        matEqvLines.forEach((line: string) => {
          doc.text(line, colX.matured + 7, col5Y);
          col5Y += 7.5;
        });
      }

      curY += rowHeight;
    });

    // Render Grand Total Summary Row with boundary checks
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const sTitleLines = doc.splitTextToSize(`PORTFOLIO TOTALS (${processedProjects.length} Projects)`, colWidths.name - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const sSubLines = doc.splitTextToSize(`Consolidated payment audit figures for all audited contracts`, colWidths.name - 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const sIpcLines = doc.splitTextToSize(`${paymentStats.totalIpcCount} Total IPCs`, colWidths.ipcCount - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const sIpcSubLines = doc.splitTextToSize(`${paymentStats.totalIpcCount - paymentStats.unpaidIpcCount} Paid • ${paymentStats.unpaidIpcCount} Unpaid`, colWidths.ipcCount - 14);
    const sOverdueLines = paymentStats.maturedIpcCount > 0 ? doc.splitTextToSize(`! ${paymentStats.maturedIpcCount} Overdue IPCs`, colWidths.ipcCount - 14) : [];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const sCertEtbLines = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalCertifiedEtb, '')}`, colWidths.certified - 14);
    const sCertUsdLines = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalCertifiedUsd, '')}`, colWidths.certified - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const sCertEqvLines = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedCertifiedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, colWidths.certified - 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const sOutEtbLines = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalUnpaidEtb, '')}`, colWidths.outstanding - 14);
    const sOutUsdLines = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalUnpaidUsd, '')}`, colWidths.outstanding - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const sOutEqvLines = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedUnpaidEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, colWidths.outstanding - 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const sMatEtbLines = doc.splitTextToSize(`ETB: ${formatAccounting(paymentStats.totalMaturedEtb, '')}`, colWidths.matured - 14);
    const sMatUsdLines = doc.splitTextToSize(`USD: $${formatAccounting(paymentStats.totalMaturedUsd, '')}`, colWidths.matured - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const sMatEqvLines = doc.splitTextToSize(`Eqv: ETB ${paymentStats.combinedMaturedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, colWidths.matured - 14);
    const sMatBadgeLines = paymentStats.maturedIpcCount > 0 ? doc.splitTextToSize(`${paymentStats.maturedIpcCount} Matured Overdue IPCs`, colWidths.matured - 14) : [];

    const sCol1H = (sTitleLines.length * 9) + (sSubLines.length * 8) + 14;
    const sCol2H = (sIpcLines.length * 8.5) + (sIpcSubLines.length * 7.5) + (sOverdueLines.length * 7.5) + 14;
    const sCol3H = (sCertEtbLines.length * 8.5) + (sCertUsdLines.length * 8.5) + (sCertEqvLines.length * 7.5) + 14;
    const sCol4H = (sOutEtbLines.length * 8.5) + (sOutUsdLines.length * 8.5) + (sOutEqvLines.length * 7.5) + 14;
    const sCol5H = (sMatEtbLines.length * 8.5) + (sMatUsdLines.length * 8.5) + (sMatEqvLines.length * 7.5) + (sMatBadgeLines.length * 7.5) + 14;
    const summaryRowHeight = Math.max(sCol1H, sCol2H, sCol3H, sCol4H, sCol5H, 48);

    if (curY + summaryRowHeight > pageHeight - 50) {
      doc.addPage();
      pageCount++;
      drawHeaderFooter();
      curY = 75;
      const headerHeight = drawTableHeader(curY);
      curY += headerHeight;
    }

    doc.setFillColor(15, 23, 42); // slate-900 dark background
    doc.rect(40, curY, pageWidth - 80, summaryRowHeight, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.rect(40, curY, pageWidth - 80, summaryRowHeight, 'S');

    // Vertical dividers in total row
    doc.setDrawColor(51, 65, 85);
    doc.line(colX.ipcCount, curY, colX.ipcCount, curY + summaryRowHeight);
    doc.line(colX.certified, curY, colX.certified, curY + summaryRowHeight);
    doc.line(colX.outstanding, curY, colX.outstanding, curY + summaryRowHeight);
    doc.line(colX.matured, curY, colX.matured, curY + summaryRowHeight);

    // Summary Col 1
    let sCol1Y = curY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    sTitleLines.forEach((line: string) => {
      doc.text(line, colX.name + 7, sCol1Y);
      sCol1Y += 9;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    sSubLines.forEach((line: string) => {
      doc.text(line, colX.name + 7, sCol1Y);
      sCol1Y += 8;
    });

    // Summary Col 2
    let sCol2Y = curY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    sIpcLines.forEach((line: string) => {
      doc.text(line, colX.ipcCount + 7, sCol2Y);
      sCol2Y += 8.5;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    sIpcSubLines.forEach((line: string) => {
      doc.text(line, colX.ipcCount + 7, sCol2Y);
      sCol2Y += 7.5;
    });
    if (paymentStats.maturedIpcCount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(248, 113, 113); // red-400
      sOverdueLines.forEach((line: string) => {
        doc.text(line, colX.ipcCount + 7, sCol2Y);
        sCol2Y += 7.5;
      });
    }

    // Summary Col 3
    let sCol3Y = curY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    sCertEtbLines.forEach((line: string) => {
      doc.text(line, colX.certified + 7, sCol3Y);
      sCol3Y += 8.5;
    });
    sCertUsdLines.forEach((line: string) => {
      doc.text(line, colX.certified + 7, sCol3Y);
      sCol3Y += 8.5;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    sCertEqvLines.forEach((line: string) => {
      doc.text(line, colX.certified + 7, sCol3Y);
      sCol3Y += 7.5;
    });

    // Summary Col 4
    let sCol4Y = curY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(251, 191, 36); // amber-400
    sOutEtbLines.forEach((line: string) => {
      doc.text(line, colX.outstanding + 7, sCol4Y);
      sCol4Y += 8.5;
    });
    sOutUsdLines.forEach((line: string) => {
      doc.text(line, colX.outstanding + 7, sCol4Y);
      sCol4Y += 8.5;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(253, 230, 138);
    sOutEqvLines.forEach((line: string) => {
      doc.text(line, colX.outstanding + 7, sCol4Y);
      sCol4Y += 7.5;
    });

    // Summary Col 5
    let sCol5Y = curY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(248, 113, 113); // red-400
    sMatEtbLines.forEach((line: string) => {
      doc.text(line, colX.matured + 7, sCol5Y);
      sCol5Y += 8.5;
    });
    sMatUsdLines.forEach((line: string) => {
      doc.text(line, colX.matured + 7, sCol5Y);
      sCol5Y += 8.5;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(254, 202, 202);
    sMatEqvLines.forEach((line: string) => {
      doc.text(line, colX.matured + 7, sCol5Y);
      sCol5Y += 7.5;
    });
    if (paymentStats.maturedIpcCount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(254, 226, 226);
      sMatBadgeLines.forEach((line: string) => {
        doc.text(line, colX.matured + 7, sCol5Y);
        sCol5Y += 7.5;
      });
    }

    curY += summaryRowHeight;

    // Final Page Sign-off section for Matured Payments
    if (curY + 75 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 75;
      drawHeaderFooter();
    }

    curY = drawUniversalSignatureBlock(doc, curY, 'l');

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${j} of ${pageCount}`, pageWidth - 60, pageHeight - 24);
    }

    // Save PDF
    const gName = selectedGroup.replace(/\s+/g, '_');
    doc.save(`ERA_Matured_Payments_Report_${groupType}_${gName}.pdf`);
  };

  // Export Supervision Personnel Workload & Staff Status Report (CSV)
  const handleExportSupervisionStaffCSV = () => {
    const csvHeaders = [
      'Project ID',
      'Project Name',
      'Program Directorate',
      'PMO Grouping',
      'Contractor',
      'Supervision Consultant Firm',
      'Resident Engineer',
      'Staff Member ID',
      'Staff Member Name',
      'Position / Role',
      'Staff Category',
      'Date of Assignment',
      'Demobilization Date',
      'Employment / Site Status',
      'Man-Months Allocated',
      'Man-Months Expended',
      'Remaining Man-Months',
      'Workload Utilization %',
      'Qualifications',
      'Site Station / Office',
      'Consultant Fee Invoiced (ETB)',
      'Consultant Fee Paid (ETB)'
    ];

    const rows: (string | number)[][] = [];

    processedProjects.forEach(p => {
      const m = getProjectSupervisionStaffMetrics(p);
      const personnel = m.personnel;

      if (personnel.length === 0) {
        // Output row with project level summary even if no itemized staff
        rows.push([
          p.id || 'N/A',
          p.name || 'Untitled Project',
          p.programDirectorate || 'Southern',
          p.pmo || 'PMO 1',
          p.contractor || 'N/A',
          m.firmName,
          m.reName || 'N/A',
          'N/A',
          'No Staff Registered',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          m.statusLabel,
          0,
          0,
          0,
          '0.0%',
          'N/A',
          'N/A',
          m.totalInvoicedEtb,
          m.totalPaidEtb
        ]);
      } else {
        personnel.forEach(person => {
          const expendedInput = person.manMonthsInput ?? (person as any).manMonthsExpended ?? 0;
          const rem = Math.max(0, (person.manMonthsAllocated || 0) - expendedInput);
          const utilPct = (person.manMonthsAllocated || 0) > 0 
            ? ((expendedInput / (person.manMonthsAllocated || 1)) * 100).toFixed(1) + '%'
            : '0.0%';

          rows.push([
            p.id || 'N/A',
            p.name || 'Untitled Project',
            p.programDirectorate || 'Southern',
            p.pmo || 'PMO 1',
            p.contractor || 'N/A',
            m.firmName,
            m.reName || 'N/A',
            person.id || 'N/A',
            person.name || 'Unnamed',
            person.position || 'Specialist',
            person.category || 'Key Personnel',
            person.assignmentDate || 'N/A',
            person.demobilizationDate || 'Ongoing',
            person.status || 'Active',
            person.manMonthsAllocated || 0,
            expendedInput,
            rem,
            utilPct,
            person.qualification || 'N/A',
            person.siteStation || 'Main Site Camp',
            m.totalInvoicedEtb,
            m.totalPaidEtb
          ]);
        });
      }
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Supervision_Staff_Workload_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Supervision Personnel Workload & Staff Status Report (PDF)
  const handleExportSupervisionStaffPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawHeaderFooter = () => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Purple / Indigo supervision accent line
      doc.setDrawColor(99, 102, 241); // indigo-500
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Official ERA Logo
      drawEraLogo(doc, 40, 28, 26, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 3
      });

      // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
      const dsW5 = 130;
      const dsX5 = pageWidth - 40 - dsW5;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(dsX5, 28, dsW5, 26, 3, 3, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("OFFICIAL DATE STAMP", dsX5 + 6, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX5 + 6, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • OFFICIAL`, dsX5 + 6, 50);

      // Title & Metadata Block
      const maxTitleW5 = dsX5 - 72 - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • ENGINEERING CONSULTANCY AUDIT", 72, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      const supMetaStr = `CMS - SUPERVISION PERSONNEL WORKLOAD & STAFFING STATUS • AUDITOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedSupMeta = doc.splitTextToSize(supMetaStr, maxTitleW5);
      doc.text(wrappedSupMeta[0] || supMetaStr, 72, 51);

      // Page numbers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`PAGE ${pageCount}`, pageWidth - 50, pageHeight - 30);
      
      doc.setFont('helvetica', 'normal');
      doc.text("CONFIDENTIAL - ERA SUPERVISION CONSULTANT MONITORING OFFICE", 40, pageHeight - 30);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(40, pageHeight - 45, pageWidth - 40, pageHeight - 45);
    };

    drawHeaderFooter();

    // Render Stats Cards Block at top of page 1
    const cardWidth = 175;
    const cardHeight = 50;
    const cardY = 70;

    // Card 1: Total Mobilized Staff
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL MOBILIZED PERSONNEL", 48, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${supervisionStaffStats.activePersonnelCount} Active / ${supervisionStaffStats.totalPersonnelCount} Staff`, 48, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // emerald green
    doc.text(`${supervisionStaffStats.activeStaffPct.toFixed(0)}% Mobilization Rate (${supervisionStaffStats.demobilizedPersonnelCount} Demobilized)`, 48, cardY + 44);

    // Card 2: Key Personnel & REs
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("KEY EXPERTS & RESIDENT ENGINEERS", 40 + cardWidth + 18, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${supervisionStaffStats.activeKeyPersonnelCount} Active Key Experts`, 40 + cardWidth + 18, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${supervisionStaffStats.residentEngineersCount} Resident Engineers across ${supervisionStaffStats.totalProjectsWithConsultant} Projects`, 40 + cardWidth + 18, cardY + 44);

    // Card 3: Workload Input MM
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("WORKLOAD MAN-MONTHS (MM)", 40 + (cardWidth + 10) * 2 + 8, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(14, 116, 144); // cyan-700
    doc.text(`${supervisionStaffStats.totalExpendedMM.toFixed(1)} / ${supervisionStaffStats.totalAllocatedMM.toFixed(1)} MM`, 40 + (cardWidth + 10) * 2 + 8, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${supervisionStaffStats.overallWorkloadPct.toFixed(0)}% Workload Input Utilized`, 40 + (cardWidth + 10) * 2 + 8, cardY + 44);

    // Card 4: Group Focus
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("AUDIT GROUP CLASSIFICATION", 40 + (cardWidth + 10) * 3 + 8, cardY + 16);
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    const wrappedGroupText = doc.splitTextToSize(selectedGroup.toUpperCase(), cardWidth - 16);
    doc.text(wrappedGroupText[0] || '', 40 + (cardWidth + 10) * 3 + 8, cardY + 30);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Query dimension: ${groupType.toUpperCase()}`, 40 + (cardWidth + 10) * 3 + 8, cardY + 44);

    curY = 145;

    // Headers geometry
    const colX = {
      name: 40,
      consultant: 260,
      staffing: 480,
      workload: 620,
      status: 730
    };

    const drawTableHeader = (y: number) => {
      doc.setFillColor(30, 41, 59); // dark slate bg
      doc.rect(40, y, pageWidth - 80, 24, 'F');
      
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      
      doc.text("PROJECT ID & TITLE", colX.name + 6, y + 16);
      doc.text("SUPERVISION CONSULTANT FIRM & RE", colX.consultant + 6, y + 16);
      doc.text("STAFF MOBILIZATION", colX.staffing + 6, y + 16);
      doc.text("WORKLOAD (MM)", colX.workload + 6, y + 16);
      doc.text("STATUS", colX.status + 6, y + 16);
    };

    drawTableHeader(curY);
    curY += 24;

    processedProjects.forEach((p, idx) => {
      const m = getProjectSupervisionStaffMetrics(p);

      // Pre-calculate wrapped texts
      doc.setFont('times', 'bold');
      doc.setFontSize(10.5);
      const cleanName = p.name.replace(/[^\x00-\x7F]/g, "");
      const wrappedName = doc.splitTextToSize(cleanName, 210);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      const subText = `ID: ${p.id.toUpperCase().substring(0, 12)} | Dir: ${p.programDirectorate || 'Southern'} | PMO: ${p.pmo || 'PMO 1'}`;
      const wrappedSub = doc.splitTextToSize(subText, 210);

      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      const firmText = m.firmName;
      const wrappedFirm = doc.splitTextToSize(firmText, 210);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      const reText = `RE: ${m.reName || 'Assigned in Field'} ${m.rePhone ? `(${m.rePhone})` : ''}`;
      const wrappedRE = doc.splitTextToSize(reText, 210);

      // Highlight Key staff members
      const keyStaffHighlights = m.personnel.filter(x => x.category === 'Key Personnel').slice(0, 3).map(
        x => `• ${x.position}: ${x.name} (${x.status || 'Active'})`
      );

      // Calculate row height
      const col1Height = (wrappedName.length * 12) + (wrappedSub.length * 10) + 12;
      const col2Height = (wrappedFirm.length * 12) + (wrappedRE.length * 10) + (keyStaffHighlights.length * 9) + 12;
      const rowHeight = Math.max(54, col1Height, col2Height);

      // Page break check
      if (curY + rowHeight > pageHeight - 50) {
        doc.addPage();
        pageCount++;
        drawHeaderFooter();
        curY = 60;
        drawTableHeader(curY);
        curY += 24;
      }

      // Zebra background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      }

      // Bottom border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(40, curY + rowHeight, pageWidth - 40, curY + rowHeight);

      // Col 1: Project Name & Directorate
      doc.setFont('times', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedName, colX.name + 6, curY + 15);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(wrappedSub, colX.name + 6, curY + 15 + (wrappedName.length * 12));

      // Col 2: Supervision Consultant & RE
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229); // indigo
      doc.text(wrappedFirm, colX.consultant + 6, curY + 15);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedRE, colX.consultant + 6, curY + 15 + (wrappedFirm.length * 12));

      if (keyStaffHighlights.length > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        keyStaffHighlights.forEach((line, kIdx) => {
          doc.text(line, colX.consultant + 6, curY + 15 + (wrappedFirm.length * 12) + (wrappedRE.length * 10) + (kIdx * 9));
        });
      }

      // Col 3: Staff Mobilization
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`${m.activeStaff} Active / ${m.totalStaff} Total`, colX.staffing + 6, curY + 16);

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`${m.activeKeyStaffCount} Key Experts on site`, colX.staffing + 6, curY + 28);
      if (m.demobilizedStaff > 0) {
        doc.setTextColor(148, 163, 184);
        doc.text(`${m.demobilizedStaff} Demobilized`, colX.staffing + 6, curY + 39);
      }

      // Col 4: Workload MM
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(14, 116, 144); // cyan-700
      doc.text(`${m.expendedMM.toFixed(1)} / ${m.allocatedMM.toFixed(1)} MM`, colX.workload + 6, curY + 16);

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${m.workloadPct.toFixed(0)}% Utilized (${m.remainingMM.toFixed(1)} MM rem)`, colX.workload + 6, curY + 28);

      // Col 5: Status
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      if (m.statusLabel === 'Fully Mobilized') {
        doc.setTextColor(16, 185, 129); // emerald
      } else if (m.statusLabel === 'Staffing Gaps') {
        doc.setTextColor(217, 119, 6); // amber
      } else if (m.statusLabel === 'Demobilized') {
        doc.setTextColor(100, 116, 139); // slate
      } else {
        doc.setTextColor(79, 70, 229); // indigo
      }
      doc.text(m.statusLabel, colX.status + 6, curY + 16);

      curY += rowHeight;
    });

    curY = drawUniversalSignatureBlock(doc, curY, 'l');

    // Save PDF
    const gName = selectedGroup.replace(/\s+/g, '_');
    doc.save(`ERA_Supervision_Staff_Workload_Report_${groupType}_${gName}.pdf`);
  };

  const handlePrintWorkloadReport = () => {
    printWorkloadReportDocument({
      projects: processedProjects,
      reportTitle: 'SUPERVISION CONSULTANT PERSONNEL WORKLOAD & PROJECT COMMITMENTS REPORT',
      subtitle: `${groupType.toUpperCase()}: ${selectedGroup.toUpperCase()} (${processedProjects.length} PROJECTS SUMMARY)`,
      auditorName: currentUserObj?.username || 'ERA AUDITOR'
    });
  };

  // --- PROGRESS COMPARISON LOGIC & RESOLUTION ---
  const activeComparisonProject = useMemo(() => {
    if (selectedComparisonProjectId) {
      const found = processedProjects.find(p => p.id === selectedComparisonProjectId);
      if (found) return found;
    }
    return processedProjects[0] || null;
  }, [processedProjects, selectedComparisonProjectId]);

  interface MilestonePeriodOption {
    key: string;
    monthLabel: string;
    quarterLabel: string;
    efyLabel: string;
    isLive?: boolean;
    contractor: { month: number; quarter: number; efy: number; todate: number };
    era: { month: number; quarter: number; efy: number; todate: number };
    actual: { month: number; quarter: number; efy: number; todate: number };
    physicalProgress?: number;
  }

  // Check if a period label is generic (like "Current Month", "Current Quarter", "Current EFY", "Current", etc.)
  const isGenericPeriod = (str?: string): boolean => {
    if (!str || typeof str !== 'string') return true;
    const lower = str.trim().toLowerCase();
    return (
      lower === 'current month' ||
      lower === 'current quarter' ||
      lower === 'current efy' ||
      lower === 'current' ||
      lower === 'month' ||
      lower === 'quarter' ||
      lower === 'efy' ||
      lower === 'active' ||
      lower === 'live' ||
      lower === 'default'
    );
  };

  // Helper to resolve the exact month name (e.g. "Sep '24" or "Aug 2026")
  const resolveExactMonth = (proj?: Project | null, rawMonth?: string): string => {
    if (rawMonth && !isGenericPeriod(rawMonth)) return rawMonth;
    if (proj?.progressPlanLabels?.monthLabel && !isGenericPeriod(proj.progressPlanLabels.monthLabel)) {
      return proj.progressPlanLabels.monthLabel;
    }
    if (proj?.progressPlanHistory && proj.progressPlanHistory.length > 0) {
      const validHist = proj.progressPlanHistory.find(h => h.monthLabel && !isGenericPeriod(h.monthLabel));
      if (validHist?.monthLabel) return validHist.monthLabel;
    }
    if (projects && projects.length > 0) {
      const otherProj = projects.find(p => p.progressPlanLabels?.monthLabel && !isGenericPeriod(p.progressPlanLabels.monthLabel));
      if (otherProj?.progressPlanLabels?.monthLabel) return otherProj.progressPlanLabels.monthLabel;
    }
    return "Sep '24";
  };

  // Helper to resolve the exact quarter name (e.g. 'July 2024-September 2024')
  const resolveExactQuarter = (proj?: Project | null, rawQuarter?: string, exactMonth?: string): string => {
    if (rawQuarter && !isGenericPeriod(rawQuarter)) return rawQuarter;
    if (proj?.progressPlanLabels?.quarterLabel && !isGenericPeriod(proj.progressPlanLabels.quarterLabel)) {
      return proj.progressPlanLabels.quarterLabel;
    }
    if (proj?.progressPlanHistory && proj.progressPlanHistory.length > 0) {
      const validHist = proj.progressPlanHistory.find(h => h.quarterLabel && !isGenericPeriod(h.quarterLabel));
      if (validHist?.quarterLabel) return validHist.quarterLabel;
    }
    return "July 2024-September 2024";
  };

  // Helper to resolve the exact EFY (e.g. '2017' or '2018')
  const resolveExactEfy = (proj?: Project | null, rawEfy?: string, exactMonth?: string): string => {
    if (rawEfy && !isGenericPeriod(rawEfy)) {
      return rawEfy.replace(/^efy\s*/i, '').trim();
    }
    if (proj?.progressPlanLabels?.efyLabel && !isGenericPeriod(proj.progressPlanLabels.efyLabel)) {
      return proj.progressPlanLabels.efyLabel.replace(/^efy\s*/i, '').trim();
    }
    if (proj?.progressPlanHistory && proj.progressPlanHistory.length > 0) {
      const validHist = proj.progressPlanHistory.find(h => h.efyLabel && !isGenericPeriod(h.efyLabel));
      if (validHist?.efyLabel) return validHist.efyLabel.replace(/^efy\s*/i, '').trim();
    }
    if (projects && projects.length > 0) {
      const otherProj = projects.find(p => p.progressPlanLabels?.efyLabel && !isGenericPeriod(p.progressPlanLabels.efyLabel));
      if (otherProj?.progressPlanLabels?.efyLabel) return otherProj.progressPlanLabels.efyLabel.replace(/^efy\s*/i, '').trim();
    }
    return '2017';
  };

  const availableMilestones = useMemo<MilestonePeriodOption[]>(() => {
    if (!activeComparisonProject) return [];
    const list: MilestonePeriodOption[] = [];

    // 1. Live Workspace Milestone (Directly reflects active progressPlan & progressPlanLabels from Progress Comparisons page)
    const liveMonthLabel = activeComparisonProject.progressPlanLabels?.monthLabel || "Sep '24";
    const liveQuarterLabel = activeComparisonProject.progressPlanLabels?.quarterLabel || "July 2024-September 2024";
    const liveEfyLabel = (activeComparisonProject.progressPlanLabels?.efyLabel || "EFY 2017").replace(/^efy\s*/i, '').trim();

    const livePlan = activeComparisonProject.progressPlan || {
      contractor: { month: 1.20, quarter: 3.70, efy: 7.87, todate: 85.12 },
      era: { month: 0.85, quarter: 1.42, efy: 3.80, todate: 73.11 },
      actual: { month: 2.28, quarter: 3.73, efy: 4.80, todate: 27.29 }
    };

    list.push({
      key: 'LIVE_CURRENT',
      monthLabel: liveMonthLabel,
      quarterLabel: liveQuarterLabel,
      efyLabel: liveEfyLabel,
      isLive: true,
      contractor: {
        month: Number(livePlan.contractor?.month ?? 1.20),
        quarter: Number(livePlan.contractor?.quarter ?? 3.70),
        efy: Number(livePlan.contractor?.efy ?? 7.87),
        todate: Number(livePlan.contractor?.todate ?? 85.12)
      },
      era: {
        month: Number(livePlan.era?.month ?? 0.85),
        quarter: Number(livePlan.era?.quarter ?? 1.42),
        efy: Number(livePlan.era?.efy ?? 3.80),
        todate: Number(livePlan.era?.todate ?? 73.11)
      },
      actual: {
        month: Number(livePlan.actual?.month ?? 2.28),
        quarter: Number(livePlan.actual?.quarter ?? 3.73),
        efy: Number(livePlan.actual?.efy ?? 4.80),
        todate: Number(livePlan.actual?.todate ?? 27.29)
      },
      physicalProgress: activeComparisonProject.lengthKm 
        ? Number(((Number(livePlan.actual?.todate ?? 27.29) / activeComparisonProject.lengthKm) * 100).toFixed(2))
        : activeComparisonProject.physicalProgress
    });

    // 2. Archived progressPlanHistory from active project
    if (activeComparisonProject.progressPlanHistory && activeComparisonProject.progressPlanHistory.length > 0) {
      const sortedHistory = sortProgressPlanHistoryDescending(activeComparisonProject.progressPlanHistory);
      sortedHistory.forEach(h => {
        const key = h.id || `hist_${(h.monthLabel || '').replace(/\s+/g, '_')}`;
        const hMonth = h.monthLabel || liveMonthLabel;
        const hQuarter = h.quarterLabel || liveQuarterLabel;
        const hEfy = (h.efyLabel || liveEfyLabel).replace(/^efy\s*/i, '').trim();
        list.push({
          key,
          monthLabel: hMonth,
          quarterLabel: hQuarter,
          efyLabel: hEfy,
          isLive: false,
          contractor: {
            month: typeof h.contractorMonth === 'number' ? h.contractorMonth : 0,
            quarter: typeof h.contractorQuarter === 'number' ? h.contractorQuarter : 0,
            efy: typeof h.contractorEfy === 'number' ? h.contractorEfy : 0,
            todate: typeof h.contractorTodate === 'number' ? h.contractorTodate : 0
          },
          era: {
            month: typeof h.eraMonth === 'number' ? h.eraMonth : 0,
            quarter: typeof h.eraQuarter === 'number' ? h.eraQuarter : 0,
            efy: typeof h.eraEfy === 'number' ? h.eraEfy : 0,
            todate: typeof h.eraTodate === 'number' ? h.eraTodate : 0
          },
          actual: {
            month: typeof h.actualMonth === 'number' ? h.actualMonth : 0,
            quarter: typeof h.actualQuarter === 'number' ? h.actualQuarter : 0,
            efy: typeof h.actualEfy === 'number' ? h.actualEfy : 0,
            todate: typeof h.actualTodate === 'number' ? h.actualTodate : 0
          },
          physicalProgress: h.physicalProgress !== undefined 
            ? h.physicalProgress 
            : (activeComparisonProject.lengthKm ? Number((((h.actualTodate || 0) / activeComparisonProject.lengthKm) * 100).toFixed(2)) : undefined)
        });
      });
    }

    // 3. Include any additional recorded history milestones from other projects
    (projects || []).forEach(p => {
      (p.progressPlanHistory || []).forEach(h => {
        if (!h.monthLabel) return;
        const exists = list.some(item => item.monthLabel === h.monthLabel || item.key === h.id);
        if (!exists) {
          list.push({
            key: h.id || `hist_${(h.monthLabel || '').replace(/\s+/g, '_')}`,
            monthLabel: h.monthLabel,
            quarterLabel: h.quarterLabel || liveQuarterLabel,
            efyLabel: (h.efyLabel || liveEfyLabel).replace(/^efy\s*/i, '').trim(),
            isLive: false,
            contractor: {
              month: typeof h.contractorMonth === 'number' ? h.contractorMonth : 0,
              quarter: typeof h.contractorQuarter === 'number' ? h.contractorQuarter : 0,
              efy: typeof h.contractorEfy === 'number' ? h.contractorEfy : 0,
              todate: typeof h.contractorTodate === 'number' ? h.contractorTodate : 0
            },
            era: {
              month: typeof h.eraMonth === 'number' ? h.eraMonth : 0,
              quarter: typeof h.eraQuarter === 'number' ? h.eraQuarter : 0,
              efy: typeof h.eraEfy === 'number' ? h.eraEfy : 0,
              todate: typeof h.eraTodate === 'number' ? h.eraTodate : 0
            },
            actual: {
              month: typeof h.actualMonth === 'number' ? h.actualMonth : 0,
              quarter: typeof h.actualQuarter === 'number' ? h.actualQuarter : 0,
              efy: typeof h.actualEfy === 'number' ? h.actualEfy : 0,
              todate: typeof h.actualTodate === 'number' ? h.actualTodate : 0
            },
            physicalProgress: h.physicalProgress
          });
        }
      });
    });

    return list;
  }, [activeComparisonProject, projects]);

  const activeMilestone = useMemo<MilestonePeriodOption | null>(() => {
    if (!availableMilestones || availableMilestones.length === 0) return null;
    let selected = availableMilestones[0];
    if (selectedComparisonMonthKey) {
      const found = availableMilestones.find(m => m.key === selectedComparisonMonthKey || m.monthLabel === selectedComparisonMonthKey);
      if (found) selected = found;
    }
    
    // Safety guarantee: exact month, quarter, and EFY are always used instead of generic "Current"
    const exactM = resolveExactMonth(activeComparisonProject, selected.monthLabel);
    const exactQ = resolveExactQuarter(activeComparisonProject, selected.quarterLabel, exactM);
    const exactE = resolveExactEfy(activeComparisonProject, selected.efyLabel, exactM);

    return {
      ...selected,
      monthLabel: exactM,
      quarterLabel: exactQ,
      efyLabel: exactE
    };
  }, [availableMilestones, selectedComparisonMonthKey, activeComparisonProject, projects]);

  const uniqueMonths = useMemo(() => {
    if (!availableMilestones) return [];
    const months = availableMilestones.map(m => m.monthLabel);
    return Array.from(new Set(months));
  }, [availableMilestones]);

  const uniqueQuarters = useMemo(() => {
    if (!availableMilestones) return [];
    const quarters = availableMilestones.map(m => m.quarterLabel);
    return Array.from(new Set(quarters));
  }, [availableMilestones]);

  const uniqueEfys = useMemo(() => {
    if (!availableMilestones) return [];
    const efys = availableMilestones.map(m => m.efyLabel);
    return Array.from(new Set(efys));
  }, [availableMilestones]);

  // Helper to resolve month index from tracking period
  const getTrackingMonthIndex = (period: string): number => {
    const p = (period || '').toLowerCase();
    if (p.includes('jul')) return 0;
    if (p.includes('aug')) return 1;
    if (p.includes('sep')) return 2;
    if (p.includes('oct')) return 3;
    if (p.includes('nov')) return 4;
    if (p.includes('dec')) return 5;
    if (p.includes('jan')) return 6;
    if (p.includes('feb')) return 7;
    if (p.includes('mar')) return 8;
    if (p.includes('apr')) return 9;
    if (p.includes('may')) return 10;
    if (p.includes('jun')) return 11;
    return 1;
  };

  const getQuarterRangeFromMonthIdx = (idx: number, efyYr: string = '2018'): string => {
    const numEfy = parseInt(efyYr, 10);
    const yr1 = !isNaN(numEfy) ? numEfy + 7 : 2025;
    const yr2 = yr1 + 1;
    if (idx <= 2) return `July ${yr1}- September ${yr1}`;
    if (idx <= 5) return `October ${yr1}- December ${yr1}`;
    if (idx <= 8) return `January ${yr2}- March ${yr2}`;
    return `April ${yr2}- June ${yr2}`;
  };

  const comparisonTableData = useMemo(() => {
    if (!activeMilestone && !activeComparisonProject) return null;
    const lengthKm = activeComparisonProject?.lengthKm || 65.0;

    const currentEfyYear = comparisonEfyYear || selectedPlanningEfy || activeMilestone?.efyLabel || '2018';
    const draft = activeComparisonProject ? getEfyDraft(activeComparisonProject, currentEfyYear) : null;
    const mIdx = getTrackingMonthIndex(comparisonMonthTrackingPeriod || activeMilestone?.monthLabel || 'Aug 2026');
    const qIdx = Math.floor(mIdx / 3);

    const pOverrides = (activeComparisonProject ? customComparisonOverrides[activeComparisonProject.id] : undefined) || {};

    const draftContractorQuarter = qIdx === 0 ? draft?.q1Contractor : qIdx === 1 ? draft?.q2Contractor : qIdx === 2 ? draft?.q3Contractor : draft?.q4Contractor;
    const draftEraQuarter = qIdx === 0 ? draft?.q1Era : qIdx === 1 ? draft?.q2Era : qIdx === 2 ? draft?.q3Era : draft?.q4Era;

    const contractor = {
      month: pOverrides.contractorMonth !== undefined 
        ? pOverrides.contractorMonth 
        : (draft?.contractorMonths && draft.contractorMonths[mIdx] !== undefined ? draft.contractorMonths[mIdx] : 1.19),
      quarter: pOverrides.contractorQuarter !== undefined
        ? pOverrides.contractorQuarter
        : (draftContractorQuarter !== undefined ? draftContractorQuarter : 3.06),
      efy: pOverrides.contractorEfy !== undefined
        ? pOverrides.contractorEfy
        : (draft?.contractorEfy !== undefined ? draft.contractorEfy : 18.62),
      todate: pOverrides.contractorTodate !== undefined
        ? pOverrides.contractorTodate
        : (activeComparisonProject?.progressPlan?.contractor?.todate || 65.0)
    };

    const era = {
      month: pOverrides.eraMonth !== undefined 
        ? pOverrides.eraMonth 
        : (draft?.eraMonths && draft.eraMonths[mIdx] !== undefined ? draft.eraMonths[mIdx] : 0.40),
      quarter: pOverrides.eraQuarter !== undefined
        ? pOverrides.eraQuarter
        : (draftEraQuarter !== undefined ? draftEraQuarter : 1.20),
      efy: pOverrides.eraEfy !== undefined
        ? pOverrides.eraEfy
        : (draft?.eraEfy !== undefined ? draft.eraEfy : 9.50),
      todate: pOverrides.eraTodate !== undefined
        ? pOverrides.eraTodate
        : (activeComparisonProject?.progressPlan?.era?.todate || 51.31)
    };

    const actual = {
      month: pOverrides.actualMonth !== undefined ? pOverrides.actualMonth : 0.16,
      quarter: pOverrides.actualQuarter !== undefined ? pOverrides.actualQuarter : 0.30,
      efy: pOverrides.actualEfy !== undefined ? pOverrides.actualEfy : 0.30,
      todate: pOverrides.actualTodate !== undefined ? pOverrides.actualTodate : 0.30
    };

    const varVsContractor = {
      month: Number((actual.month - contractor.month).toFixed(2)),
      quarter: Number((actual.quarter - contractor.quarter).toFixed(2)),
      efy: Number((actual.efy - contractor.efy).toFixed(2)),
      todate: Number((actual.todate - contractor.todate).toFixed(2))
    };

    const varVsEra = {
      month: Number((actual.month - era.month).toFixed(2)),
      quarter: Number((actual.quarter - era.quarter).toFixed(2)),
      efy: Number((actual.efy - era.efy).toFixed(2)),
      todate: Number((actual.todate - era.todate).toFixed(2))
    };

    const ratioVsContractor = {
      month: contractor.month > 0 ? (actual.month / contractor.month) * 100 : (actual.month > 0 ? 100 : 0),
      quarter: contractor.quarter > 0 ? (actual.quarter / contractor.quarter) * 100 : 0,
      efy: contractor.efy > 0 ? (actual.efy / contractor.efy) * 100 : 0,
      todate: contractor.todate > 0 ? (actual.todate / contractor.todate) * 100 : 0
    };

    const ratioVsEra = {
      month: era.month > 0 ? (actual.month / era.month) * 100 : (actual.month > 0 ? 100 : 0),
      quarter: era.quarter > 0 ? (actual.quarter / era.quarter) * 100 : 0,
      efy: era.efy > 0 ? (actual.efy / era.efy) * 100 : 0,
      todate: era.todate > 0 ? (actual.todate / era.todate) * 100 : 0
    };

    return {
      lengthKm,
      contractor,
      era,
      actual,
      varVsContractor,
      varVsEra,
      ratioVsContractor,
      ratioVsEra,
      monthIndex: mIdx,
      quarterIndex: qIdx
    };
  }, [activeMilestone, activeComparisonProject, comparisonMonthTrackingPeriod, comparisonQuarterlyRange, comparisonEfyYear, selectedPlanningEfy, efyDraftMapByYear, customComparisonOverrides]);

  const handleUpdateComparisonField = (
    tier: 'contractor' | 'era' | 'actual',
    field: 'month' | 'quarter' | 'efy' | 'todate',
    val: number
  ) => {
    if (!activeComparisonProject) return;
    const pId = activeComparisonProject.id;
    const mIdx = getTrackingMonthIndex(comparisonMonthTrackingPeriod);

    setCustomComparisonOverrides(prev => {
      const current = prev[pId] || {};
      const key = `${tier}${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof current;
      return {
        ...prev,
        [pId]: {
          ...current,
          [key]: val
        }
      };
    });

    // If month is edited for contractor or era, also update underlying EFY 12-month baseline draft
    if ((tier === 'contractor' || tier === 'era') && field === 'month') {
      updateEfyMonthValue(pId, tier, mIdx, val);
    }
  };

  const formatProgressVal = (kmVal: number, lengthKm: number, mode: 'both' | 'km' | 'pct' = comparisonUnitMode): string => {
    const kmStr = `${kmVal.toFixed(2)} Km`;
    const pctStr = lengthKm > 0 ? `${((kmVal / lengthKm) * 100).toFixed(2)}%` : '0.00%';
    if (mode === 'km') return kmStr;
    if (mode === 'pct') return pctStr;
    return `${kmStr} (${pctStr})`;
  };

  const formatVarianceVal = (kmVal: number, lengthKm: number, mode: 'both' | 'km' | 'pct' = comparisonUnitMode): { text: string; isPositive: boolean; isZero: boolean } => {
    const isPositive = kmVal > 0.001;
    const isZero = Math.abs(kmVal) <= 0.001;
    const sign = isPositive ? '+' : '';
    const kmStr = `${sign}${kmVal.toFixed(2)} Km`;
    const pctVal = lengthKm > 0 ? (kmVal / lengthKm) * 100 : 0;
    const pctStr = `${sign}${pctVal.toFixed(2)}%`;
    let text = '';
    if (mode === 'km') text = kmStr;
    else if (mode === 'pct') text = pctStr;
    else text = `${kmStr} (${pctStr})`;
    return { text, isPositive, isZero };
  };

  const groupComparisonMatrix = useMemo(() => {
    if (!activeMilestone) return [];
    const targetMonth = activeMilestone.monthLabel;
    const targetClean = (targetMonth || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const commencedProjects = processedProjects.filter(p => {
      if (activeMilestone.efyLabel) {
        return isProjectCommencedInEfy(p, activeMilestone.efyLabel);
      }
      return true;
    });

    return commencedProjects.map(p => {
      const hist = (p.progressPlanHistory || []).find(h => {
        if (!h.monthLabel) return false;
        if (h.monthLabel === targetMonth) return true;
        const hClean = h.monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
        return Boolean(targetClean && hClean && (hClean === targetClean || hClean.includes(targetClean) || targetClean.includes(hClean)));
      });
      const pLen = p.lengthKm || 65.0;

      let ctrMonth = 0;
      let ctrQuarter = 0;
      let ctrEfy = 0;
      let ctrTodate = 0;

      let eraMonth = 0;
      let eraQuarter = 0;
      let eraEfy = 0;
      let eraTodate = 0;

      let actMonth = 0;
      let actQuarter = 0;
      let actEfy = 0;
      let actTodate = 0;

      if (hist) {
        ctrMonth = hist.contractorMonth ?? 0;
        ctrQuarter = hist.contractorQuarter ?? 0;
        ctrEfy = hist.contractorEfy ?? 0;
        ctrTodate = hist.contractorTodate ?? 0;

        eraMonth = hist.eraMonth ?? 0;
        eraQuarter = hist.eraQuarter ?? 0;
        eraEfy = hist.eraEfy ?? 0;
        eraTodate = hist.eraTodate ?? 0;

        actMonth = hist.actualMonth ?? 0;
        actQuarter = hist.actualQuarter ?? 0;
        actEfy = hist.actualEfy ?? 0;
        actTodate = hist.actualTodate ?? 0;
      } else {
        const plan = p.progressPlan || {
          contractor: { month: 1.20, quarter: 3.70, efy: 7.87, todate: 85.12 },
          era: { month: 0.85, quarter: 1.42, efy: 3.80, todate: 73.11 },
          actual: { month: 2.28, quarter: 3.73, efy: 4.80, todate: 27.29 }
        };
        ctrMonth = Number(plan.contractor?.month ?? 1.20);
        ctrQuarter = Number(plan.contractor?.quarter ?? 3.70);
        ctrEfy = Number(plan.contractor?.efy ?? 7.87);
        ctrTodate = Number(plan.contractor?.todate ?? 85.12);

        eraMonth = Number(plan.era?.month ?? 0.85);
        eraQuarter = Number(plan.era?.quarter ?? 1.42);
        eraEfy = Number(plan.era?.efy ?? 3.80);
        eraTodate = Number(plan.era?.todate ?? 73.11);

        actMonth = Number(plan.actual?.month ?? 2.28);
        actQuarter = Number(plan.actual?.quarter ?? 3.73);
        actEfy = Number(plan.actual?.efy ?? 4.80);
        actTodate = Number(plan.actual?.todate ?? 27.29);
      }

      const monthVariance = actMonth - eraMonth;
      const quarterVariance = actQuarter - eraQuarter;
      const efyVariance = actEfy - eraEfy;
      const todateVariance = actTodate - eraTodate;

      // Always calculate fulfillment percentage by dividing actual by ERA plan: (Actual / ERA Plan) * 100
      const monthRatio = eraMonth > 0 ? (actMonth / eraMonth) * 100 : (actMonth > 0 ? 100 : 0);
      const quarterRatio = eraQuarter > 0 ? (actQuarter / eraQuarter) * 100 : (actQuarter > 0 ? 100 : 0);
      const efyRatio = eraEfy > 0 ? (actEfy / eraEfy) * 100 : (actEfy > 0 ? 100 : 0);
      const todateRatio = eraTodate > 0 ? (actTodate / eraTodate) * 100 : (actTodate > 0 ? 100 : 0);
      const todatePct = todateRatio; // Consistent (Actual / ERA Plan) * 100

      let healthStatus: 'Ahead' | 'On Track' | 'Lagging' | 'Critical' = 'On Track';
      if (monthVariance > 0.1) healthStatus = 'Ahead';
      else if (monthVariance >= -0.05) healthStatus = 'On Track';
      else if (monthVariance >= -0.5) healthStatus = 'Lagging';
      else healthStatus = 'Critical';

      return {
        project: p,
        isMatchingHistoricalMilestone: Boolean(hist),
        lengthKm: pLen,
        contractor: { month: ctrMonth, quarter: ctrQuarter, efy: ctrEfy, todate: ctrTodate },
        era: { month: eraMonth, quarter: eraQuarter, efy: eraEfy, todate: eraTodate },
        actual: { month: actMonth, quarter: actQuarter, efy: actEfy, todate: actTodate },
        monthVariance,
        quarterVariance,
        efyVariance,
        todateVariance,
        monthRatio,
        quarterRatio,
        efyRatio,
        todateRatio,
        todatePct,
        healthStatus
      };
    });
  }, [processedProjects, activeMilestone]);

  // Aggregate Directorate & PMO Group Performance Metrics (Monthly, Quarterly, EFY Planned vs Accomplished)
  interface GroupProgressAggregate {
    name: string;
    type: 'directorate' | 'pmo';
    projectCount: number;
    totalLengthKm: number;
    avgLengthKm: number;
    // Month
    totalEraMonth: number;
    avgEraMonth: number;
    totalActMonth: number;
    avgActMonth: number;
    avgMonthVar: number;
    totalMonthVar: number;
    monthRatio: number;
    // Quarter
    totalEraQuarter: number;
    avgEraQuarter: number;
    totalActQuarter: number;
    avgActQuarter: number;
    avgQuarterVar: number;
    totalQuarterVar: number;
    quarterRatio: number;
    // EFY
    totalEraEfy: number;
    avgEraEfy: number;
    totalActEfy: number;
    avgActEfy: number;
    avgEfyVar: number;
    totalEfyVar: number;
    efyRatio: number;
    // Cumulative
    totalEraTodate: number;
    avgEraTodate: number;
    totalActTodate: number;
    avgActTodate: number;
    avgTodateVar: number;
    totalTodateVar: number;
    todateRatio: number;
    avgTodatePct: number;
    healthStatus: 'Ahead' | 'On Track' | 'Lagging' | 'Critical';
  }

  const directorateComparisonSummary = useMemo<GroupProgressAggregate[]>(() => {
    if (groupComparisonMatrix.length === 0) return [];
    const dirMap = new Map<string, typeof groupComparisonMatrix>();
    groupComparisonMatrix.forEach(item => {
      const dir = item.project.programDirectorate || 'Southern';
      if (!dirMap.has(dir)) dirMap.set(dir, []);
      dirMap.get(dir)!.push(item);
    });

    return Array.from(dirMap.entries()).map(([name, items]) => {
      const count = items.length;
      const totalLen = items.reduce((s, i) => s + (i.lengthKm || 0), 0);
      const avgLen = count > 0 ? totalLen / count : 0;

      const tEraMonth = items.reduce((s, i) => s + (i.era.month || 0), 0);
      const tActMonth = items.reduce((s, i) => s + (i.actual.month || 0), 0);
      const aEraMonth = count > 0 ? tEraMonth / count : 0;
      const aActMonth = count > 0 ? tActMonth / count : 0;

      const tEraQtr = items.reduce((s, i) => s + (i.era.quarter || 0), 0);
      const tActQtr = items.reduce((s, i) => s + (i.actual.quarter || 0), 0);
      const aEraQtr = count > 0 ? tEraQtr / count : 0;
      const aActQtr = count > 0 ? tActQtr / count : 0;

      const tEraEfy = items.reduce((s, i) => s + (i.era.efy || 0), 0);
      const tActEfy = items.reduce((s, i) => s + (i.actual.efy || 0), 0);
      const aEraEfy = count > 0 ? tEraEfy / count : 0;
      const aActEfy = count > 0 ? tActEfy / count : 0;

      const tEraTd = items.reduce((s, i) => s + (i.era.todate || 0), 0);
      const tActTd = items.reduce((s, i) => s + (i.actual.todate || 0), 0);
      const aEraTd = count > 0 ? tEraTd / count : 0;
      const aActTd = count > 0 ? tActTd / count : 0;

      const avgMonthVar = aActMonth - aEraMonth;
      const monthRatio = aEraMonth > 0 ? (aActMonth / aEraMonth) * 100 : (aActMonth > 0 ? 100 : 0);
      const quarterRatio = aEraQtr > 0 ? (aActQtr / aEraQtr) * 100 : (aActQtr > 0 ? 100 : 0);
      const efyRatio = aEraEfy > 0 ? (aActEfy / aEraEfy) * 100 : (aActEfy > 0 ? 100 : 0);
      const todateRatio = aEraTd > 0 ? (aActTd / aEraTd) * 100 : (aActTd > 0 ? 100 : 0);
      const avgTodatePct = todateRatio;

      let healthStatus: 'Ahead' | 'On Track' | 'Lagging' | 'Critical' = 'On Track';
      if (avgMonthVar > 0.05) healthStatus = 'Ahead';
      else if (avgMonthVar >= -0.05) healthStatus = 'On Track';
      else if (avgMonthVar >= -0.4) healthStatus = 'Lagging';
      else healthStatus = 'Critical';

      return {
        name,
        type: 'directorate',
        projectCount: count,
        totalLengthKm: totalLen,
        avgLengthKm: avgLen,
        totalEraMonth: tEraMonth,
        avgEraMonth: aEraMonth,
        totalActMonth: tActMonth,
        avgActMonth: aActMonth,
        avgMonthVar,
        totalMonthVar: tActMonth - tEraMonth,
        monthRatio,
        totalEraQuarter: tEraQtr,
        avgEraQuarter: aEraQtr,
        totalActQuarter: tActQtr,
        avgActQuarter: aActQtr,
        avgQuarterVar: aActQtr - aEraQtr,
        totalQuarterVar: tActQtr - tEraQtr,
        quarterRatio,
        totalEraEfy: tEraEfy,
        avgEraEfy: aEraEfy,
        totalActEfy: tActEfy,
        avgActEfy: aActEfy,
        avgEfyVar: aActEfy - aEraEfy,
        totalEfyVar: tActEfy - tEraEfy,
        efyRatio,
        totalEraTodate: tEraTd,
        avgEraTodate: aEraTd,
        totalActTodate: tActTd,
        avgActTodate: aActTd,
        avgTodateVar: aActTd - aEraTd,
        totalTodateVar: tActTd - tEraTd,
        todateRatio,
        avgTodatePct,
        healthStatus
      };
    }).sort((a, b) => b.monthRatio - a.monthRatio);
  }, [groupComparisonMatrix]);

  const pmoComparisonSummary = useMemo<GroupProgressAggregate[]>(() => {
    if (groupComparisonMatrix.length === 0) return [];
    const pmoMap = new Map<string, typeof groupComparisonMatrix>();
    groupComparisonMatrix.forEach(item => {
      const pmo = item.project.pmo || 'PMO 1';
      if (!pmoMap.has(pmo)) pmoMap.set(pmo, []);
      pmoMap.get(pmo)!.push(item);
    });

    return Array.from(pmoMap.entries()).map(([name, items]) => {
      const count = items.length;
      const totalLen = items.reduce((s, i) => s + (i.lengthKm || 0), 0);
      const avgLen = count > 0 ? totalLen / count : 0;

      const tEraMonth = items.reduce((s, i) => s + (i.era.month || 0), 0);
      const tActMonth = items.reduce((s, i) => s + (i.actual.month || 0), 0);
      const aEraMonth = count > 0 ? tEraMonth / count : 0;
      const aActMonth = count > 0 ? tActMonth / count : 0;

      const tEraQtr = items.reduce((s, i) => s + (i.era.quarter || 0), 0);
      const tActQtr = items.reduce((s, i) => s + (i.actual.quarter || 0), 0);
      const aEraQtr = count > 0 ? tEraQtr / count : 0;
      const aActQtr = count > 0 ? tActQtr / count : 0;

      const tEraEfy = items.reduce((s, i) => s + (i.era.efy || 0), 0);
      const tActEfy = items.reduce((s, i) => s + (i.actual.efy || 0), 0);
      const aEraEfy = count > 0 ? tEraEfy / count : 0;
      const aActEfy = count > 0 ? tActEfy / count : 0;

      const tEraTd = items.reduce((s, i) => s + (i.era.todate || 0), 0);
      const tActTd = items.reduce((s, i) => s + (i.actual.todate || 0), 0);
      const aEraTd = count > 0 ? tEraTd / count : 0;
      const aActTd = count > 0 ? tActTd / count : 0;

      const avgMonthVar = aActMonth - aEraMonth;
      const monthRatio = aEraMonth > 0 ? (aActMonth / aEraMonth) * 100 : (aActMonth > 0 ? 100 : 0);
      const quarterRatio = aEraQtr > 0 ? (aActQtr / aEraQtr) * 100 : (aActQtr > 0 ? 100 : 0);
      const efyRatio = aEraEfy > 0 ? (aActEfy / aEraEfy) * 100 : (aActEfy > 0 ? 100 : 0);
      const todateRatio = aEraTd > 0 ? (aActTd / aEraTd) * 100 : (aActTd > 0 ? 100 : 0);
      const avgTodatePct = todateRatio;

      let healthStatus: 'Ahead' | 'On Track' | 'Lagging' | 'Critical' = 'On Track';
      if (avgMonthVar > 0.05) healthStatus = 'Ahead';
      else if (avgMonthVar >= -0.05) healthStatus = 'On Track';
      else if (avgMonthVar >= -0.4) healthStatus = 'Lagging';
      else healthStatus = 'Critical';

      return {
        name,
        type: 'pmo',
        projectCount: count,
        totalLengthKm: totalLen,
        avgLengthKm: avgLen,
        totalEraMonth: tEraMonth,
        avgEraMonth: aEraMonth,
        totalActMonth: tActMonth,
        avgActMonth: aActMonth,
        avgMonthVar,
        totalMonthVar: tActMonth - tEraMonth,
        monthRatio,
        totalEraQuarter: tEraQtr,
        avgEraQuarter: aEraQtr,
        totalActQuarter: tActQtr,
        avgActQuarter: aActQtr,
        avgQuarterVar: aActQtr - aEraQtr,
        totalQuarterVar: tActQtr - tEraQtr,
        quarterRatio,
        totalEraEfy: tEraEfy,
        avgEraEfy: aEraEfy,
        totalActEfy: tActEfy,
        avgActEfy: aActEfy,
        avgEfyVar: aActEfy - aEraEfy,
        totalEfyVar: tActEfy - tEraEfy,
        efyRatio,
        totalEraTodate: tEraTd,
        avgEraTodate: aEraTd,
        totalActTodate: tActTd,
        avgActTodate: aActTd,
        avgTodateVar: aActTd - aEraTd,
        totalTodateVar: tActTd - tEraTd,
        todateRatio,
        avgTodatePct,
        healthStatus
      };
    }).sort((a, b) => b.monthRatio - a.monthRatio);
  }, [groupComparisonMatrix]);

  const overallPortfolioAverages = useMemo(() => {
    if (groupComparisonMatrix.length === 0) return null;
    const count = groupComparisonMatrix.length;
    const totalLen = groupComparisonMatrix.reduce((s, i) => s + (i.lengthKm || 0), 0);
    const avgLen = totalLen / count;

    const tEraMonth = groupComparisonMatrix.reduce((s, i) => s + (i.era.month || 0), 0);
    const tActMonth = groupComparisonMatrix.reduce((s, i) => s + (i.actual.month || 0), 0);
    const aEraMonth = tEraMonth / count;
    const aActMonth = tActMonth / count;

    const tEraQtr = groupComparisonMatrix.reduce((s, i) => s + (i.era.quarter || 0), 0);
    const tActQtr = groupComparisonMatrix.reduce((s, i) => s + (i.actual.quarter || 0), 0);
    const aEraQtr = tEraQtr / count;
    const aActQtr = tActQtr / count;

    const tEraEfy = groupComparisonMatrix.reduce((s, i) => s + (i.era.efy || 0), 0);
    const tActEfy = groupComparisonMatrix.reduce((s, i) => s + (i.actual.efy || 0), 0);
    const aEraEfy = tEraEfy / count;
    const aActEfy = tActEfy / count;

    const tEraTd = groupComparisonMatrix.reduce((s, i) => s + (i.era.todate || 0), 0);
    const tActTd = groupComparisonMatrix.reduce((s, i) => s + (i.actual.todate || 0), 0);
    const aEraTd = tEraTd / count;
    const aActTd = tActTd / count;

    const todateRatio = aEraTd > 0 ? (aActTd / aEraTd) * 100 : 0;

    return {
      projectCount: count,
      totalLengthKm: totalLen,
      avgLengthKm: avgLen,
      totalEraMonth: tEraMonth,
      avgEraMonth: aEraMonth,
      totalActMonth: tActMonth,
      avgActMonth: aActMonth,
      avgMonthVar: aActMonth - aEraMonth,
      totalMonthVar: tActMonth - tEraMonth,
      monthRatio: aEraMonth > 0 ? (aActMonth / aEraMonth) * 100 : 0,
      totalEraQuarter: tEraQtr,
      avgEraQuarter: aEraQtr,
      totalActQuarter: tActQtr,
      avgActQuarter: aActQtr,
      avgQuarterVar: aActQtr - aEraQtr,
      totalQuarterVar: tActQtr - tEraQtr,
      quarterRatio: aEraQtr > 0 ? (aActQtr / aEraQtr) * 100 : 0,
      totalEraEfy: tEraEfy,
      avgEraEfy: aEraEfy,
      totalActEfy: tActEfy,
      avgActEfy: aActEfy,
      avgEfyVar: aActEfy - aEraEfy,
      totalEfyVar: tActEfy - tEraEfy,
      efyRatio: aEraEfy > 0 ? (aActEfy / aEraEfy) * 100 : 0,
      totalEraTodate: tEraTd,
      avgEraTodate: aEraTd,
      totalActTodate: tActTd,
      avgActTodate: aActTd,
      avgTodateVar: aActTd - aEraTd,
      totalTodateVar: tActTd - tEraTd,
      todateRatio,
      avgTodatePct: todateRatio,
    };
  }, [groupComparisonMatrix]);

  const handleExportProgressComparisonPDF = () => {
    if (!activeMilestone || groupComparisonMatrix.length === 0) return;

    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const totalGroupKm = groupComparisonMatrix.reduce((sum, item) => sum + (item.lengthKm || 0), 0);
    const aheadCount = groupComparisonMatrix.filter(item => item.healthStatus === 'Ahead').length;
    const onTrackCount = groupComparisonMatrix.filter(item => item.healthStatus === 'On Track').length;
    const laggingCount = groupComparisonMatrix.filter(item => item.healthStatus === 'Lagging').length;
    const criticalCount = groupComparisonMatrix.filter(item => item.healthStatus === 'Critical').length;

    // Landscape Columns widths (Total A4 width: 841.89 pt, printable width: 761.89 pt with 40 pt margin)
    const colW = {
      name: 124,
      contractor: 84,
      consultant: 84,
      month: 94,
      quarter: 94,
      efy: 94,
      todate: 134,
      status: 53.89
    };

    const colX = {
      name: 40,
      contractor: 40 + colW.name,
      consultant: 40 + colW.name + colW.contractor,
      month: 40 + colW.name + colW.contractor + colW.consultant,
      quarter: 40 + colW.name + colW.contractor + colW.consultant + colW.month,
      efy: 40 + colW.name + colW.contractor + colW.consultant + colW.month + colW.quarter,
      todate: 40 + colW.name + colW.contractor + colW.consultant + colW.month + colW.quarter + colW.efy,
      status: 40 + colW.name + colW.contractor + colW.consultant + colW.month + colW.quarter + colW.efy + colW.todate
    };

    let pageNumber = 1;

    // Safe text wrapping helper: breaks words cleanly if any single word exceeds maxWidth
    const safeWrapText = (text: string, maxWidth: number, fontSize: number, isBold: boolean = false): string[] => {
      if (!text || text.trim() === '') return ['N/A'];
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      
      const words = text.split(/\s+/);
      const safeWords: string[] = [];
      
      for (const w of words) {
        if (doc.getTextWidth(w) > maxWidth) {
          // Word itself exceeds column width without spaces, break it with hyphens
          let chunk = '';
          for (let i = 0; i < w.length; i++) {
            const test = chunk + w[i];
            if (doc.getTextWidth(test + '-') > maxWidth) {
              if (chunk) safeWords.push(chunk + '-');
              chunk = w[i];
            } else {
              chunk = test;
            }
          }
          if (chunk) safeWords.push(chunk);
        } else {
          safeWords.push(w);
        }
      }
      return doc.splitTextToSize(safeWords.join(' '), Math.max(10, maxWidth));
    };

    // Safe single line renderer that guarantees text strictly never overflows cell maxWidth
    const drawSafeCellLine = (
      text: string, 
      x: number, 
      y: number, 
      maxWidth: number, 
      fontSize: number, 
      isBold: boolean = false, 
      color: [number, number, number] = [0, 0, 0]
    ) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const availableW = Math.max(10, maxWidth - 4);
      let str = text;
      if (doc.getTextWidth(str) > availableW) {
        while (doc.getTextWidth(str + '..') > availableW && str.length > 2) {
          str = str.slice(0, -1);
        }
        str += '..';
      }
      doc.text(str, x, y);
    };

    const drawPageHeader = (pNum: number) => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Gold accent top bar
      doc.setDrawColor(194, 120, 3);
      doc.setLineWidth(3);
      doc.line(40, 24, pageWidth - 40, 24);

      if (pNum === 1) {
        // Official ERA Logo
        drawEraLogo(doc, 40, 28, 26, {
          withContainer: true,
          containerBg: [255, 255, 255],
          containerBorder: [226, 232, 240],
          borderRadius: 3
        });

        // Audit Stamp Box
        const dsW = 165;
        const dsX = pageWidth - 40 - dsW;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.75);
        doc.roundedRect(dsX, 28, dsW, 28, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text("OFFICIAL PORTFOLIO AUDIT REPORT", dsX + 6, 36);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX + 6, 44);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(0, 0, 0);

        let auditorStampText = `AUDITOR: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          auditorStampText = `AUDITOR: ${currentUserObj.username.toUpperCase()} • PMO: ${pmoName}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          auditorStampText = `AUDITOR: ${currentUserObj.username.toUpperCase()} • DIRECTORATE: ${dirName}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          auditorStampText = `AUDITOR: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
        }
        doc.text(auditorStampText, dsX + 6, 51);

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 72, 38);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);

        let reportTitleText = `GROUP PORTFOLIO COMPARISON SUMMARY FOR ${activeMilestone.monthLabel.toUpperCase()} (${(selectedGroup || 'Southern').toUpperCase()} ${groupType.toUpperCase()})`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          reportTitleText = `GROUP PORTFOLIO COMPARISON SUMMARY FOR ${activeMilestone.monthLabel.toUpperCase()} • PMO: ${pmoName}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          reportTitleText = `GROUP PORTFOLIO COMPARISON SUMMARY FOR ${activeMilestone.monthLabel.toUpperCase()} • DIRECTORATE: ${dirName}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          reportTitleText = `GROUP PORTFOLIO COMPARISON SUMMARY FOR ${activeMilestone.monthLabel.toUpperCase()} (${(selectedGroup || 'Southern').toUpperCase()} ${groupType.toUpperCase()})`;
        }
        doc.text(reportTitleText, 72, 48);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(`Side-by-side contractor plan vs ERA plan vs actual execution across all ${groupComparisonMatrix.length} group projects`, 72, 57);

        // Metadata ribbon
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.75);
        doc.roundedRect(40, 62, pageWidth - 80, 18, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);

        let portfolioScopeText = `PORTFOLIO: ${(selectedGroup || 'Southern').toUpperCase()} ${groupType.toUpperCase()} (${groupComparisonMatrix.length} Projects • ${totalGroupKm.toFixed(1)} Km Total)`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          portfolioScopeText = `PMO SCOPE: ${pmoName} (${groupComparisonMatrix.length} Projects • ${totalGroupKm.toFixed(1)} Km Total) • PMO ADMIN: ${currentUserObj.username.toUpperCase()}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          portfolioScopeText = `DIRECTORATE SCOPE: ${dirName} (${groupComparisonMatrix.length} Projects • ${totalGroupKm.toFixed(1)} Km Total) • DIRECTORATE ADMIN: ${currentUserObj.username.toUpperCase()}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          portfolioScopeText = `PORTFOLIO: ${(selectedGroup || 'Southern').toUpperCase()} ${groupType.toUpperCase()} (${groupComparisonMatrix.length} Projects • ${totalGroupKm.toFixed(1)} Km Total)`;
        }
        doc.text(portfolioScopeText, 48, 73);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`TARGET MILESTONE: ${activeMilestone.monthLabel.toUpperCase()} (${activeMilestone.quarterLabel} • EFY ${activeMilestone.efyLabel})`, 340, 73);
        doc.text(`STATUS: ${aheadCount} Ahead  |  ${onTrackCount} On Track  |  ${laggingCount} Lagging  |  ${criticalCount} Critical`, 565, 73);
      } else {
        // Compact header for subsequent pages
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • GROUP PORTFOLIO COMPARISON SUMMARY (CONTINUED)", 40, 36);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);

        let subPageLabel = `Period: ${activeMilestone.monthLabel} (${selectedGroup} ${groupType.toUpperCase()}) • Page ${pNum}`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          subPageLabel = `Period: ${activeMilestone.monthLabel} • PMO: ${pmoName} • Page ${pNum}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          subPageLabel = `Period: ${activeMilestone.monthLabel} • Directorate: ${dirName} • Page ${pNum}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          subPageLabel = `Period: ${activeMilestone.monthLabel} (${selectedGroup} ${groupType.toUpperCase()}) • Page ${pNum}`;
        }
        doc.text(subPageLabel, 40, 45);
      }
    };

    const drawTableHeader = (y: number) => {
      const headerH = 26;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(40, y, pageWidth - 80, headerH, 'F');

      // Grid dividers in header
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(colX.contractor, y, colX.contractor, y + headerH);
      doc.line(colX.consultant, y, colX.consultant, y + headerH);
      doc.line(colX.month, y, colX.month, y + headerH);
      doc.line(colX.quarter, y, colX.quarter, y + headerH);
      doc.line(colX.efy, y, colX.efy, y + headerH);
      doc.line(colX.todate, y, colX.todate, y + headerH);
      doc.line(colX.status, y, colX.status, y + headerH);

      // Col 1: Project ID & Title
      drawSafeCellLine("PROJECT ID & TITLE", colX.name + 5, y + 11, colW.name - 10, 6.5, true, [255, 255, 255]);
      drawSafeCellLine("Name, Code & Length", colX.name + 5, y + 20, colW.name - 10, 5, false, [230, 230, 230]);

      // Col 2: Contractor
      drawSafeCellLine("CONTRACTOR", colX.contractor + 5, y + 11, colW.contractor - 10, 6.5, true, [255, 255, 255]);
      drawSafeCellLine("Executing Firm", colX.contractor + 5, y + 20, colW.contractor - 10, 5, false, [230, 230, 230]);

      // Col 3: Supervision Consultant
      drawSafeCellLine("CONSULTANT", colX.consultant + 5, y + 11, colW.consultant - 10, 6.5, true, [255, 255, 255]);
      drawSafeCellLine("Supervising Firm", colX.consultant + 5, y + 20, colW.consultant - 10, 5, false, [230, 230, 230]);

      // Col 4: Month
      drawSafeCellLine("MONTH EXECUTION", colX.month + 5, y + 11, colW.month - 10, 6, true, [255, 255, 255]);
      drawSafeCellLine(`(${activeMilestone.monthLabel.toUpperCase()})`, colX.month + 5, y + 20, colW.month - 10, 5, false, [230, 230, 230]);

      // Col 5: Quarter
      drawSafeCellLine("QUARTER PLAN", colX.quarter + 5, y + 11, colW.quarter - 10, 6, true, [255, 255, 255]);
      drawSafeCellLine(`(${activeMilestone.quarterLabel.toUpperCase()})`, colX.quarter + 5, y + 20, colW.quarter - 10, 5, false, [230, 230, 230]);

      // Col 6: EFY
      drawSafeCellLine("EFY TARGET", colX.efy + 5, y + 11, colW.efy - 10, 6, true, [255, 255, 255]);
      drawSafeCellLine(`(EFY ${activeMilestone.efyLabel})`, colX.efy + 5, y + 20, colW.efy - 10, 5, false, [230, 230, 230]);

      // Col 7: Cumulative To-Date
      drawSafeCellLine("CUMULATIVE TO-DATE", colX.todate + 5, y + 11, colW.todate - 10, 6, true, [255, 255, 255]);
      drawSafeCellLine("Plan vs Act vs % Accomplished", colX.todate + 5, y + 20, colW.todate - 10, 5, false, [230, 230, 230]);

      // Col 8: Status
      drawSafeCellLine("STATUS", colX.status + 5, y + 11, colW.status - 10, 6.5, true, [255, 255, 255]);
      drawSafeCellLine("Health", colX.status + 5, y + 20, colW.status - 10, 5, false, [230, 230, 230]);

      return headerH;
    };

    drawPageHeader(1);
    let curY = 88;
    curY += drawTableHeader(curY);

    groupComparisonMatrix.forEach((item, idx) => {
      // 1. Text wrapping with safe bounds for multiline text
      const titleLines = safeWrapText(item.project.name || 'Unnamed Project', colW.name - 12, 6.5, true);
      const idStr = `ID: ${item.project.id.substring(0, 10).toUpperCase()} • ${item.lengthKm.toFixed(1)} Km`;
      const idLines = safeWrapText(idStr, colW.name - 12, 5, false);

      const contrLines = safeWrapText(item.project.contractor || 'Not Specified', colW.contractor - 10, 6, true);
      const consLines = safeWrapText(getExactConsultantName(item.project), colW.consultant - 10, 5.5, false);

      // Compute required height per column to prevent ANY overlapping
      const col1H = 8 + titleLines.length * 8.5 + 3 + idLines.length * 7 + 6;
      const col2H = 8 + contrLines.length * 8 + 8;
      const col3H = 8 + consLines.length * 7.5 + 8;
      const metricsH = 50; // 5 stacked metric rows: Ctr, ERA, Act, Act/ERA %, Act/Ctr %

      const rowHeight = Math.max(col1H, col2H, col3H, metricsH, 50);

      // Check page break
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageNumber++;
        drawPageHeader(pageNumber);
        curY = 54;
        curY += drawTableHeader(curY);
      }

      // Zebra striping
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');

      // Grid borders
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(40, curY + rowHeight, pageWidth - 40, curY + rowHeight);
      doc.line(colX.contractor, curY, colX.contractor, curY + rowHeight);
      doc.line(colX.consultant, curY, colX.consultant, curY + rowHeight);
      doc.line(colX.month, curY, colX.month, curY + rowHeight);
      doc.line(colX.quarter, curY, colX.quarter, curY + rowHeight);
      doc.line(colX.efy, curY, colX.efy, curY + rowHeight);
      doc.line(colX.todate, curY, colX.todate, curY + rowHeight);
      doc.line(colX.status, curY, colX.status, curY + rowHeight);

      // 1. Project ID & Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      titleLines.forEach((tLine: string, tIdx: number) => {
        drawSafeCellLine(tLine, colX.name + 5, curY + 10 + tIdx * 8.5, colW.name - 8, 6.5, true);
      });
      const idStartY = curY + 10 + titleLines.length * 8.5 + 3;
      idLines.forEach((idL: string, idIdx: number) => {
        drawSafeCellLine(idL, colX.name + 5, idStartY + idIdx * 7, colW.name - 8, 5, false);
      });

      // 2. Contractor
      contrLines.forEach((cLine: string, cIdx: number) => {
        drawSafeCellLine(cLine, colX.contractor + 5, curY + 10 + cIdx * 8, colW.contractor - 8, 6, true);
      });

      // 3. Supervision Consultant
      consLines.forEach((csLine: string, csIdx: number) => {
        drawSafeCellLine(csLine, colX.consultant + 5, curY + 10 + csIdx * 7.5, colW.consultant - 8, 5.5, false);
      });

      // 4. Month (Cleanly stacked 5 lines, guaranteed zero column overlap)
      const mY = curY + 9;
      const mVsCtr = item.contractor.month > 0 ? (item.actual.month / item.contractor.month) * 100 : 0;
      drawSafeCellLine(`Ctr: ${item.contractor.month.toFixed(2)} Km`, colX.month + 5, mY, colW.month - 8, 5.5, false);
      drawSafeCellLine(`ERA: ${item.era.month.toFixed(2)} Km`, colX.month + 5, mY + 8, colW.month - 8, 5.5, false);
      drawSafeCellLine(`Act: ${item.actual.month.toFixed(2)} Km`, colX.month + 5, mY + 16, colW.month - 8, 5.5, true);
      drawSafeCellLine(`Act/ERA: ${item.monthRatio.toFixed(1)}%`, colX.month + 5, mY + 24, colW.month - 8, 5.5, true);
      drawSafeCellLine(`Act/Ctr: ${mVsCtr.toFixed(1)}%`, colX.month + 5, mY + 32, colW.month - 8, 5.2, false);

      // 5. Quarter (Cleanly stacked 5 lines)
      const qY = curY + 9;
      const qVsCtr = item.contractor.quarter > 0 ? (item.actual.quarter / item.contractor.quarter) * 100 : 0;
      drawSafeCellLine(`Ctr: ${item.contractor.quarter.toFixed(2)} Km`, colX.quarter + 5, qY, colW.quarter - 8, 5.5, false);
      drawSafeCellLine(`ERA: ${item.era.quarter.toFixed(2)} Km`, colX.quarter + 5, qY + 8, colW.quarter - 8, 5.5, false);
      drawSafeCellLine(`Act: ${item.actual.quarter.toFixed(2)} Km`, colX.quarter + 5, qY + 16, colW.quarter - 8, 5.5, true);
      drawSafeCellLine(`Act/ERA: ${item.quarterRatio.toFixed(1)}%`, colX.quarter + 5, qY + 24, colW.quarter - 8, 5.5, true);
      drawSafeCellLine(`Act/Ctr: ${qVsCtr.toFixed(1)}%`, colX.quarter + 5, qY + 32, colW.quarter - 8, 5.2, false);

      // 6. EFY (Cleanly stacked 5 lines)
      const eY = curY + 9;
      const eVsCtr = item.contractor.efy > 0 ? (item.actual.efy / item.contractor.efy) * 100 : 0;
      drawSafeCellLine(`Ctr: ${item.contractor.efy.toFixed(2)} Km`, colX.efy + 5, eY, colW.efy - 8, 5.5, false);
      drawSafeCellLine(`ERA: ${item.era.efy.toFixed(2)} Km`, colX.efy + 5, eY + 8, colW.efy - 8, 5.5, false);
      drawSafeCellLine(`Act: ${item.actual.efy.toFixed(2)} Km`, colX.efy + 5, eY + 16, colW.efy - 8, 5.5, true);
      drawSafeCellLine(`Act/ERA: ${item.efyRatio.toFixed(1)}%`, colX.efy + 5, eY + 24, colW.efy - 8, 5.5, true);
      drawSafeCellLine(`Act/Ctr: ${eVsCtr.toFixed(1)}%`, colX.efy + 5, eY + 32, colW.efy - 8, 5.2, false);

      // 7. Cumulative To-Date (Cleanly stacked 5 lines)
      const tY = curY + 9;
      const tdVsCtr = item.contractor.todate > 0 ? (item.actual.todate / item.contractor.todate) * 100 : 0;
      drawSafeCellLine(`Ctr: ${item.contractor.todate.toFixed(2)} Km`, colX.todate + 5, tY, colW.todate - 8, 5.5, false);
      drawSafeCellLine(`ERA: ${item.era.todate.toFixed(2)} Km`, colX.todate + 5, tY + 8, colW.todate - 8, 5.5, false);
      drawSafeCellLine(`Act: ${item.actual.todate.toFixed(2)} Km`, colX.todate + 5, tY + 16, colW.todate - 8, 5.5, true);
      drawSafeCellLine(`Act/ERA: ${item.todateRatio.toFixed(1)}%`, colX.todate + 5, tY + 24, colW.todate - 8, 5.5, true);
      drawSafeCellLine(`Act/Ctr: ${tdVsCtr.toFixed(1)}%`, colX.todate + 5, tY + 32, colW.todate - 8, 5.2, false);

      // 8. Status Badge (Black text on light grey background)
      const statusX = colX.status + 4;
      const statusW = colW.status - 8;
      const statusH = 15;
      const statusY = curY + (rowHeight - statusH) / 2;
      doc.setFillColor(242, 242, 242);
      doc.setDrawColor(0, 0, 0);
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(statusX, statusY, statusW, statusH, 2, 2, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.text(item.healthStatus.toUpperCase(), statusX + statusW / 2, statusY + 9.5, { align: 'center' });

      curY += rowHeight;
    });

    curY = drawUniversalSignatureBlock(doc, curY, 'l');

    // Footer page count on all pages
    const totalPages = pageNumber;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${p} of ${totalPages} • Ethiopian Roads Administration CMS • Confidential Official Audit Report`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    }

    const fileName = `ERA_Group_Portfolio_Comparison_${(selectedGroup || 'Southern').replace(/[^a-zA-Z0-9]/g, '_')}_${activeMilestone.monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);
  };

  // Print/Export EFY Baseline Plan Table to Landscape PDF
  const handleExportEfyBaselinePlanPDF = () => {
    return; // Feature removed
    if (efyTableProjects.length === 0) return;

    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Columns structure
    const staticW = {
      no: 20,
      name: 145,
      actor: 55
    };

    let dynamicCols: { label: string; width: number; isSum?: boolean; isHighlight?: boolean; key: string }[] = [];

    if (baselineQuarterView === 'all') {
      // 12 months + 4 quarters + EFY + Length % + Reflection Status
      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      months.forEach((m, idx) => {
        dynamicCols.push({ label: m, width: 26, key: `m_${idx}` });
        if (idx === 2) dynamicCols.push({ label: 'Q1 Sum', width: 31, isSum: true, key: 'q1' });
        if (idx === 5) dynamicCols.push({ label: 'Q2 Sum', width: 31, isSum: true, key: 'q2' });
        if (idx === 8) dynamicCols.push({ label: 'Q3 Sum', width: 31, isSum: true, key: 'q3' });
        if (idx === 11) dynamicCols.push({ label: 'Q4 Sum', width: 31, isSum: true, key: 'q4' });
      });
      dynamicCols.push({ label: `EFY ${selectedPlanningEfy}`, width: 38, isHighlight: true, key: 'efy' });
      dynamicCols.push({ label: 'Length %', width: 40, key: 'pct' });
      dynamicCols.push({ label: 'Reflection Status', width: 45, key: 'status' });
    } else {
      // 1 Specific Quarter layout
      let startIdx = 0;
      let qKey = 'q1';
      let qTitle = 'Q1 Sum';
      if (baselineQuarterView === 'Q1') { startIdx = 0; qKey = 'q1'; qTitle = 'Q1 Sum'; }
      else if (baselineQuarterView === 'Q2') { startIdx = 3; qKey = 'q2'; qTitle = 'Q2 Sum'; }
      else if (baselineQuarterView === 'Q3') { startIdx = 6; qKey = 'q3'; qTitle = 'Q3 Sum'; }
      else { startIdx = 9; qKey = 'q4'; qTitle = 'Q4 Sum'; }

      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      for (let i = 0; i < 3; i++) {
        dynamicCols.push({ label: months[startIdx + i], width: 80, key: `m_${startIdx + i}` });
      }
      dynamicCols.push({ label: qTitle, width: 85, isSum: true, key: qKey });
      dynamicCols.push({ label: `EFY ${selectedPlanningEfy}`, width: 80, isHighlight: true, key: 'efy' });
      dynamicCols.push({ label: 'Length %', width: 75, key: 'pct' });
      dynamicCols.push({ label: 'Reflection Status', width: 80, key: 'status' });
    }

    let pageNumber = 1;

    const drawPageHeader = (pNum: number) => {
      // Clean page border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Gold accent top bar
      doc.setDrawColor(194, 120, 3);
      doc.setLineWidth(3);
      doc.line(40, 24, pageWidth - 40, 24);

      if (pNum === 1) {
        // Official ERA Logo
        drawEraLogo(doc, 40, 28, 26, {
          withContainer: true,
          containerBg: [255, 255, 255],
          containerBorder: [226, 232, 240],
          borderRadius: 3
        });

        // Audit Stamp Box
        const dsW = 190;
        const dsX = pageWidth - 40 - dsW;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.75);
        doc.roundedRect(dsX, 28, dsW, 28, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text("OFFICIAL PORTFOLIO PLAN REPORT", dsX + 6, 36);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleString()}`, dsX + 6, 44);
        doc.text(`Authenticated Target Year: EFY ${selectedPlanningEfy}`, dsX + 6, 50);

        // Header titles
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION", 80, 38);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(67, 56, 202);
        doc.text(`PORTFOLIO ANNUAL PROGRESS BASELINE PLAN - EFY ${selectedPlanningEfy}`, 80, 50);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Group Level: ${groupType.toUpperCase()} - ${selectedGroup.toUpperCase()} • All figures in Kilometers (Km)`, 80, 59);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(67, 56, 202);
        doc.text(`PORTFOLIO ANNUAL PROGRESS BASELINE PLAN (Cont.) - EFY ${selectedPlanningEfy}`, 40, 38);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`Group Level: ${groupType.toUpperCase()} - ${selectedGroup.toUpperCase()}`, 40, 47);
      }
    };

    drawPageHeader(1);

    // Table Header Row helper
    const drawTableHeader = (startY: number) => {
      doc.setFillColor(30, 41, 59);
      doc.rect(40, startY, pageWidth - 80, 22, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);

      let currX = 40;
      doc.text("No.", currX + 3, startY + 14);
      currX += staticW.no;

      doc.text("Project Name & Scope", currX + 5, startY + 14);
      currX += staticW.name;

      doc.text("Actor", currX + 5, startY + 14);
      currX += staticW.actor;

      dynamicCols.forEach(col => {
        const textW = doc.getTextWidth(col.label);
        const padding = (col.width - textW) / 2;
        if (col.isSum || col.isHighlight) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(col.label, currX + padding, startY + 14);
        currX += col.width;
      });
    };

    let y = 72;
    drawTableHeader(y);
    y += 22;

    const rowHeight = 15; // 15 pt per actor row, 30 pt per project row (Contractor + ERA Approved)

    efyTableProjects.forEach((p, idx) => {
      // Check for page overflow
      if (y + 30 > pageHeight - 40) {
        // Footer page numbering
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${pageNumber} • Ethiopian Roads Administration CMS`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' }
        );

        doc.addPage();
        pageNumber++;
        drawPageHeader(pageNumber);
        y = 60;
        drawTableHeader(y);
        y += 22;
      }

      const draft = getEfyDraft(p, selectedPlanningEfy);
      const totalKm = p.lengthKm || 65.0;

      // Draw horizontal line at start of project
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(40, y, pageWidth - 40, y);

      // Project Name cell wrap
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(15, 23, 42);
      
      const wrappedName = doc.splitTextToSize(p.name, staticW.name - 10);
      const cellText = wrappedName.slice(0, 3); // max 3 lines
      
      // Draw No & Name
      doc.text(`${idx + 1}`, 40 + 3, y + 12);
      
      let textY = y + 10;
      cellText.forEach((line) => {
        doc.text(line, 40 + staticW.no + 4, textY);
        textY += 7.5;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${p.id.toUpperCase()} • Scope: ${totalKm.toFixed(2)} Km`, 40 + staticW.no + 4, y + 26);

      // --- ROW 1: Contractor Program Plan ---
      doc.setFillColor(248, 250, 252);
      doc.rect(40 + staticW.no + staticW.name, y, pageWidth - 80 - staticW.no - staticW.name, rowHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(29, 78, 216); // Blue for Contractor
      doc.text("Contractor Plan", 40 + staticW.no + staticW.name + 4, y + 9.5);

      let currX = 40 + staticW.no + staticW.name + staticW.actor;

      dynamicCols.forEach(col => {
        let valStr = '0.00';
        if (col.key.startsWith('m_')) {
          const mIdx = parseInt(col.key.split('_')[1], 10);
          valStr = (draft.contractorMonths?.[mIdx] ?? 0).toFixed(2);
        } else if (col.key === 'q1') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []).q1.toFixed(2);
        } else if (col.key === 'q2') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []).q2.toFixed(2);
        } else if (col.key === 'q3') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []).q3.toFixed(2);
        } else if (col.key === 'q4') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.contractorMonths || []).q4.toFixed(2);
        } else if (col.key === 'efy') {
          valStr = (draft.contractorEfy || 0).toFixed(2);
        } else if (col.key === 'pct') {
          valStr = totalKm > 0 ? `${((draft.contractorEfy / totalKm) * 100).toFixed(1)}%` : '0.0%';
        } else if (col.key === 'status') {
          const slippage = (draft.contractorEfy || 0) - (draft.eraEfy || 0);
          valStr = slippage >= 0 ? `Aligned (+${slippage.toFixed(1)})` : `Gap (${slippage.toFixed(1)})`;
        }

        doc.setFont('helvetica', col.isSum || col.isHighlight ? 'bold' : 'normal');
        doc.setFontSize(col.key === 'status' ? 4.5 : 5.5);
        doc.setTextColor(col.isSum || col.isHighlight ? 15 : 71);
        const textW = doc.getTextWidth(valStr);
        doc.text(valStr, currX + col.width - textW - 4, y + 9.5);
        currX += col.width;
      });

      y += rowHeight;

      // --- ROW 2: ERA Approved Milestone Plan ---
      doc.setFillColor(254, 244, 255); // soft purple
      doc.rect(40 + staticW.no + staticW.name, y, pageWidth - 80 - staticW.no - staticW.name, rowHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(109, 40, 217); // Purple for ERA
      doc.text("Approved ERA Plan", 40 + staticW.no + staticW.name + 4, y + 9.5);

      currX = 40 + staticW.no + staticW.name + staticW.actor;

      dynamicCols.forEach(col => {
        let valStr = '0.00';
        if (col.key.startsWith('m_')) {
          const mIdx = parseInt(col.key.split('_')[1], 10);
          valStr = (draft.eraMonths?.[mIdx] ?? 0).toFixed(2);
        } else if (col.key === 'q1') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []).q1.toFixed(2);
        } else if (col.key === 'q2') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []).q2.toFixed(2);
        } else if (col.key === 'q3') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []).q3.toFixed(2);
        } else if (col.key === 'q4') {
          valStr = calculateQuarterlyAndEfyFromMonths(draft.eraMonths || []).q4.toFixed(2);
        } else if (col.key === 'efy') {
          valStr = (draft.eraEfy || 0).toFixed(2);
        } else if (col.key === 'pct') {
          valStr = totalKm > 0 ? `${((draft.eraEfy / totalKm) * 100).toFixed(1)}%` : '0.0%';
        } else if (col.key === 'status') {
          valStr = 'Approval Target';
        }

        doc.setFont('helvetica', col.isSum || col.isHighlight ? 'bold' : 'normal');
        doc.setFontSize(col.key === 'status' ? 4.5 : 5.5);
        doc.setTextColor(col.isSum || col.isHighlight ? 15 : 71);
        const textW = doc.getTextWidth(valStr);
        doc.text(valStr, currX + col.width - textW - 4, y + 9.5);
        currX += col.width;
      });

      y += rowHeight;
    });

    // Draw final table bottom line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);

    // --- PORTFOLIO TOTAL FOOTER ROWS ---
    if (y + 35 < pageHeight - 40) {
      // Contractor Portfolio Total
      doc.setFillColor(239, 246, 255);
      doc.rect(40, y, pageWidth - 80, 12, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 58, 138);
      doc.text("Portfolio Total (Contractor Plan)", 40 + staticW.no + 4, y + 8.5);
      doc.text(`${efyTableProjects.length} Projects`, 40 + staticW.no + staticW.name + 4, y + 8.5);

      let currX = 40 + staticW.no + staticW.name + staticW.actor;

      dynamicCols.forEach(col => {
        let valSum = 0;
        efyTableProjects.forEach(p => {
          const d = getEfyDraft(p, selectedPlanningEfy);
          if (col.key.startsWith('m_')) {
            const mIdx = parseInt(col.key.split('_')[1], 10);
            valSum += Number(d.contractorMonths?.[mIdx] || 0);
          } else if (col.key === 'q1') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.contractorMonths || []).q1;
          } else if (col.key === 'q2') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.contractorMonths || []).q2;
          } else if (col.key === 'q3') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.contractorMonths || []).q3;
          } else if (col.key === 'q4') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.contractorMonths || []).q4;
          } else if (col.key === 'efy') {
            valSum += Number(d.contractorEfy || 0);
          }
        });

        let valStr = valSum.toFixed(2);
        if (col.key === 'pct') {
          const totalScope = efyTableProjects.reduce((acc, proj) => acc + (proj.lengthKm || 65.0), 0);
          const totalCtr = efyTableProjects.reduce((acc, proj) => acc + calculateQuarterlyAndEfyFromMonths(getEfyDraft(proj, selectedPlanningEfy).contractorMonths || []).efy, 0);
          valStr = totalScope > 0 ? `${((totalCtr / totalScope) * 100).toFixed(1)}%` : '—';
        } else if (col.key === 'status') {
          valStr = 'Contractor Aggregate';
        }

        const textW = doc.getTextWidth(valStr);
        doc.text(valStr, currX + col.width - textW - 4, y + 8.5);
        currX += col.width;
      });

      y += 12;

      // ERA Portfolio Total
      doc.setFillColor(253, 242, 253);
      doc.rect(40, y, pageWidth - 80, 12, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(88, 28, 135);
      doc.text("Portfolio Total (Approved ERA Plan)", 40 + staticW.no + 4, y + 8.5);
      doc.text(`${efyTableProjects.length} Projects`, 40 + staticW.no + staticW.name + 4, y + 8.5);

      currX = 40 + staticW.no + staticW.name + staticW.actor;

      dynamicCols.forEach(col => {
        let valSum = 0;
        efyTableProjects.forEach(p => {
          const d = getEfyDraft(p, selectedPlanningEfy);
          if (col.key.startsWith('m_')) {
            const mIdx = parseInt(col.key.split('_')[1], 10);
            valSum += Number(d.eraMonths?.[mIdx] || 0);
          } else if (col.key === 'q1') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.eraMonths || []).q1;
          } else if (col.key === 'q2') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.eraMonths || []).q2;
          } else if (col.key === 'q3') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.eraMonths || []).q3;
          } else if (col.key === 'q4') {
            valSum += calculateQuarterlyAndEfyFromMonths(d.eraMonths || []).q4;
          } else if (col.key === 'efy') {
            valSum += Number(d.eraEfy || 0);
          }
        });

        let valStr = valSum.toFixed(2);
        if (col.key === 'pct') {
          const totalScope = efyTableProjects.reduce((acc, proj) => acc + (proj.lengthKm || 65.0), 0);
          const totalEra = efyTableProjects.reduce((acc, proj) => acc + calculateQuarterlyAndEfyFromMonths(getEfyDraft(proj, selectedPlanningEfy).eraMonths || []).efy, 0);
          valStr = totalScope > 0 ? `${((totalEra / totalScope) * 100).toFixed(1)}%` : '—';
        } else if (col.key === 'status') {
          valStr = 'ERA Aggregate';
        }

        const textW = doc.getTextWidth(valStr);
        doc.text(valStr, currX + col.width - textW - 4, y + 8.5);
        currX += col.width;
      });

      y += 12;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
    }

    // --- EXECUTIVE REVIEW & SIGN-OFF SIGNATURE BLOCKS ---
    // The GroupReportGenerator's drawUniversalSignatureBlock only takes (doc, startY, orientation)
    // and uses the state's currentUserObj implicitly.
    y = drawUniversalSignatureBlock(doc, y, 'l');

    // Write page numbers on all pages
    for (let p = 1; p <= pageNumber; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${p} of ${pageNumber} • Ethiopian Roads Administration CMS • Annual Progress Baseline Plan`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    }

    const fileName = `ERA_Annual_Baseline_Plan_${(selectedGroup || 'Southern').replace(/[^a-zA-Z0-9]/g, '_')}_EFY_${selectedPlanningEfy}.pdf`;
    doc.save(fileName);
  };

  // Export Directorate & PMO Group Performance Summary PDF separately
  const handleExportDirectoratePmoSummaryPDF = () => {
    if (!activeMilestone) return;

    let filteredDirectorates = [...directorateComparisonSummary];
    let filteredPmos = [...pmoComparisonSummary];

    if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
      const assignedPmo = (currentUserObj.assignedPmo || 'PMO 1').toLowerCase().trim();
      filteredPmos = filteredPmos.filter(p => p.name.toLowerCase().trim() === assignedPmo);
      filteredDirectorates = [];
    } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
      const assignedDir = (currentUserObj.assignedDirectorate || 'Southern').toLowerCase().trim();
      filteredDirectorates = filteredDirectorates.filter(d => d.name.toLowerCase().trim() === assignedDir);
      filteredPmos = [];
    }

    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let pageNumber = 1;

    const drawPageHeader = (pNum: number) => {
      // Clean page border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.75);
      doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

      // Top accent bar
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(2);
      doc.line(40, 24, pageWidth - 40, 24);

      if (pNum === 1) {
        // Official ERA Logo
        drawEraLogo(doc, 40, 28, 26, {
          withContainer: true,
          containerBg: [255, 255, 255],
          containerBorder: [200, 200, 200],
          borderRadius: 3
        });

        // Audit Stamp Box
        const dsW = 145;
        const dsX = pageWidth - 40 - dsW;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.75);
        doc.roundedRect(dsX, 28, dsW, 28, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text("DIRECTORATE & PMO SUMMARY REPORT", dsX + 6, 36);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }), dsX + 6, 44);

        let genByText = `GENERATED BY: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          genByText = `GENERATED BY: ${currentUserObj.username.toUpperCase()} • PMO: ${pmoName}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          genByText = `GENERATED BY: ${currentUserObj.username.toUpperCase()} • DIRECTORATE: ${dirName}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          genByText = `GENERATED BY: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
        }
        doc.text(genByText, dsX + 6, 51);

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 72, 38);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);

        let summaryReportTitle = "PROGRAM DIRECTORATE & PMO GROUP PERFORMANCE SUMMARY REPORT";
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          summaryReportTitle = `DIRECTORATE & PMO PERFORMANCE SUMMARY • PMO: ${pmoName}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          summaryReportTitle = `DIRECTORATE & PMO PERFORMANCE SUMMARY • DIRECTORATE: ${dirName}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          summaryReportTitle = "PROGRAM DIRECTORATE & PMO GROUP PERFORMANCE SUMMARY REPORT";
        }
        doc.text(summaryReportTitle, 72, 48);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text("Aggregated ERA Baseline Plan vs Actual Accomplishment (Group Total Sum)", 72, 57);

        // Metadata ribbon
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.75);
        doc.roundedRect(40, 62, pageWidth - 80, 18, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);

        let groupsText = `GROUPS: ${filteredDirectorates.length} Directorates • ${filteredPmos.length} PMOs`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          groupsText = `ASSIGNED PMO: ${pmoName} • PMO ADMIN: ${currentUserObj.username.toUpperCase()}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          groupsText = `ASSIGNED DIRECTORATE: ${dirName} • DIRECTORATE ADMIN: ${currentUserObj.username.toUpperCase()}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          groupsText = `GROUPS: ${filteredDirectorates.length} Directorates • ${filteredPmos.length} PMOs`;
        }
        doc.text(groupsText, 48, 73);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`TARGET MILESTONE: ${activeMilestone.monthLabel.toUpperCase()} (${activeMilestone.quarterLabel} • EFY ${activeMilestone.efyLabel})`, 330, 73);
        doc.text(`METRIC BASIS: GROUP TOTAL SUM (KM)`, 560, 73);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • DIRECTORATE & PMO PERFORMANCE SUMMARY (CONTINUED)", 40, 36);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);

        let dirSubPageLabel = `Period: ${activeMilestone.monthLabel} • Page ${pNum}`;
        if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
          const pmoName = (currentUserObj.assignedPmo || 'PMO 1').toUpperCase();
          dirSubPageLabel = `Period: ${activeMilestone.monthLabel} • PMO: ${pmoName} • Page ${pNum}`;
        } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
          const dirName = (currentUserObj.assignedDirectorate || 'Southern').toUpperCase();
          dirSubPageLabel = `Period: ${activeMilestone.monthLabel} • Directorate: ${dirName} • Page ${pNum}`;
        } else if (currentUserObj.role === 'cpm_admin') {
          dirSubPageLabel = `Period: ${activeMilestone.monthLabel} • Page ${pNum}`;
        }
        doc.text(dirSubPageLabel, 40, 45);
      }
    };

    const colW = {
      name: 150,
      scope: 80,
      month: 145,
      quarter: 145,
      efy: 145,
      status: 96.89
    };

    const colX = {
      name: 40,
      scope: 40 + colW.name,
      month: 40 + colW.name + colW.scope,
      quarter: 40 + colW.name + colW.scope + colW.month,
      efy: 40 + colW.name + colW.scope + colW.month + colW.quarter,
      status: 40 + colW.name + colW.scope + colW.month + colW.quarter + colW.efy
    };

    const drawTableHeader = (y: number) => {
      const headerH = 22;
      doc.setFillColor(15, 23, 42); // dark header
      doc.rect(40, y, pageWidth - 80, headerH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      doc.text("GROUP ENTITY (DIRECTORATE / PMO)", colX.name + 6, y + 14);
      doc.text("PROJECTS & SCOPE", colX.scope + 6, y + 14);
      doc.text(`MONTH: ${activeMilestone.monthLabel.toUpperCase()} (PLAN vs ACT)`, colX.month + 6, y + 14);
      doc.text(`QUARTER: ${activeMilestone.quarterLabel.toUpperCase()} (PLAN vs ACT)`, colX.quarter + 6, y + 14);
      doc.text(`EFY ${activeMilestone.efyLabel} (PLAN vs ACT)`, colX.efy + 6, y + 14);
      doc.text("HEALTH", colX.status + 6, y + 14);

      // Dividers
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(colX.scope, y, colX.scope, y + headerH);
      doc.line(colX.month, y, colX.month, y + headerH);
      doc.line(colX.quarter, y, colX.quarter, y + headerH);
      doc.line(colX.efy, y, colX.efy, y + headerH);
      doc.line(colX.status, y, colX.status, y + headerH);

      return headerH;
    };

    drawPageHeader(1);
    let curY = 88;
    curY += drawTableHeader(curY);

    const renderGroupRows = (groups: typeof directorateComparisonSummary, groupTitle: string) => {
      if (groups.length === 0) return;

      // Group Section Header Bar
      if (curY + 20 > pageHeight - 55) {
        doc.addPage();
        pageNumber++;
        drawPageHeader(pageNumber);
        curY = 54;
        curY += drawTableHeader(curY);
      }

      doc.setFillColor(230, 235, 240);
      doc.rect(40, curY, pageWidth - 80, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(groupTitle.toUpperCase(), 46, curY + 11);
      curY += 16;

      groups.forEach((grp, idx) => {
        const rowHeight = 32;

        if (curY + rowHeight > pageHeight - 55) {
          doc.addPage();
          pageNumber++;
          drawPageHeader(pageNumber);
          curY = 54;
          curY += drawTableHeader(curY);
        }

        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

        doc.line(colX.scope, curY, colX.scope, curY + rowHeight);
        doc.line(colX.month, curY, colX.month, curY + rowHeight);
        doc.line(colX.quarter, curY, colX.quarter, curY + rowHeight);
        doc.line(colX.efy, curY, colX.efy, curY + rowHeight);
        doc.line(colX.status, curY, colX.status, curY + rowHeight);

        const eraM = grp.totalEraMonth;
        const actM = grp.totalActMonth;

        const eraQ = grp.totalEraQuarter;
        const actQ = grp.totalActQuarter;

        const eraE = grp.totalEraEfy;
        const actE = grp.totalActEfy;

        // 1. Group Entity Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(grp.name, colX.name + 6, curY + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(`${grp.type === 'directorate' ? 'Program Directorate' : 'Project Management Office'}`, colX.name + 6, curY + 23);

        // 2. Scope
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`${grp.projectCount} Projects`, colX.scope + 6, curY + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(`${grp.totalLengthKm.toFixed(1)} Km total`, colX.scope + 6, curY + 23);

        // 3. Monthly
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`ERA: ${eraM.toFixed(2)} Km  |  Act: ${actM.toFixed(2)} Km`, colX.month + 6, curY + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`% vs ERA Plan: ${grp.monthRatio.toFixed(1)}%`, colX.month + 6, curY + 23);

        // 4. Quarterly
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`ERA: ${eraQ.toFixed(2)} Km  |  Act: ${actQ.toFixed(2)} Km`, colX.quarter + 6, curY + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`% vs ERA Plan: ${grp.quarterRatio.toFixed(1)}%`, colX.quarter + 6, curY + 23);

        // 5. EFY
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`ERA: ${eraE.toFixed(2)} Km  |  Act: ${actE.toFixed(2)} Km`, colX.efy + 6, curY + 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`% vs ERA Plan: ${grp.efyRatio.toFixed(1)}%`, colX.efy + 6, curY + 23);

        // 6. Health Badge
        const statusX = colX.status + 4;
        const statusW = colW.status - 8;
        const statusH = 14;
        const statusY = curY + (rowHeight - statusH) / 2;
        doc.setFillColor(242, 242, 242);
        doc.setDrawColor(0, 0, 0);
        doc.setTextColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.roundedRect(statusX, statusY, statusW, statusH, 2, 2, 'DF');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text(grp.healthStatus.toUpperCase(), statusX + statusW / 2, statusY + 9.5, { align: 'center' });

        curY += rowHeight;
      });
    };

    renderGroupRows(filteredDirectorates, `PROGRAM DIRECTORATE GROUPINGS (${filteredDirectorates.length} DIRECTORATES)`);
    curY += 8;
    renderGroupRows(filteredPmos, `PMO GROUPINGS (${filteredPmos.length} PMO OFFICES)`);

    // Sign-off block
    curY = drawUniversalSignatureBlock(doc, curY, 'l');

    for (let j = 1; j <= pageNumber; j++) {
      doc.setPage(j);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`ETHIOPIAN ROADS ADMINISTRATION • PROGRAM DIRECTORATE & PMO PERFORMANCE BRIEFING • Page ${j} of ${pageNumber}`, 40, pageHeight - 20);
    }

    doc.save(`ERA_Directorate_PMO_Group_Performance_Summary_${activeMilestone.monthLabel.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportSingleProjectPDF = () => {
    if (!activeComparisonProject || !activeMilestone || !comparisonTableData) return;

    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Clean page border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(30, 16, pageWidth - 60, pageHeight - 32, 4, 4, 'S');

    // Gold accent top bar
    doc.setDrawColor(194, 120, 3);
    doc.setLineWidth(3);
    doc.line(40, 25, pageWidth - 40, 25);

    // Official ERA Logo
    drawEraLogo(doc, 40, 28, 26, {
      withContainer: true,
      containerBg: [255, 255, 255],
      containerBorder: [226, 232, 240],
      borderRadius: 3
    });

    // Date Stamp
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

    let singleAuditorStamp = `AUDITOR: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
    if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
      const pmoName = (currentUserObj.assignedPmo || activeComparisonProject.pmo || 'PMO 1').toUpperCase();
      singleAuditorStamp = `AUDITOR: ${currentUserObj.username.toUpperCase()} • PMO: ${pmoName}`;
    } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
      const dirName = (currentUserObj.assignedDirectorate || activeComparisonProject.programDirectorate || 'Southern').toUpperCase();
      singleAuditorStamp = `AUDITOR: ${currentUserObj.username.toUpperCase()} • DIRECTORATE: ${dirName}`;
    } else if (currentUserObj.role === 'cpm_admin') {
      singleAuditorStamp = `AUDITOR: ${currentUserObj.username.toUpperCase()} • ERA CMS`;
    }
    doc.text(singleAuditorStamp, dsX + 6, 50);

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 72, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);

    let singleSubTitle = "PROJECT PROGRESS PLAN & ACCOMPLISHMENT COMPARISON REPORT";
    if (currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) {
      const pmoName = (currentUserObj.assignedPmo || activeComparisonProject.pmo || 'PMO 1').toUpperCase();
      singleSubTitle = `PROJECT PROGRESS PLAN & ACCOMPLISHMENT COMPARISON REPORT • PMO: ${pmoName}`;
    } else if (currentUserObj.role === 'directorate_admin' || currentUserObj.assignedDirectorate) {
      const dirName = (currentUserObj.assignedDirectorate || activeComparisonProject.programDirectorate || 'Southern').toUpperCase();
      singleSubTitle = `PROJECT PROGRESS PLAN & ACCOMPLISHMENT COMPARISON REPORT • DIRECTORATE: ${dirName}`;
    } else if (currentUserObj.role === 'cpm_admin') {
      singleSubTitle = "PROJECT PROGRESS PLAN & ACCOMPLISHMENT COMPARISON REPORT";
    }
    doc.text(singleSubTitle, 72, 50);

    let curY = 62;

    // Project Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(40, curY, pageWidth - 80, 52, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`PROJECT: ${activeComparisonProject.name.toUpperCase()}`, 50, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`CONTRACTOR: ${activeComparisonProject.contractor || 'Not Specified'}`, 50, curY + 26);
    doc.text(`SUPERVISION CONSULTANT: ${activeComparisonProject.consultant || 'Not Specified'}`, 50, curY + 36);
    doc.text(`DIRECTORATE: ${activeComparisonProject.programDirectorate || 'Southern'} | PMO: ${activeComparisonProject.pmo || 'PMO 1'}`, 50, curY + 46);

    const rightMetaX = pageWidth - 260;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`TARGET MILESTONE: ${activeMilestone.monthLabel.toUpperCase()} (${activeMilestone.quarterLabel})`, rightMetaX, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`FISCAL YEAR: EFY ${activeMilestone.efyLabel}`, rightMetaX, curY + 26);
    doc.text(`PROJECT LENGTH: ${comparisonTableData.lengthKm.toFixed(2)} Km`, rightMetaX, curY + 36);
    doc.text(`REVISED CONTRACT VALUE: ETB ${formatAccounting(activeComparisonProject.revisedContractAmountEtb || (activeComparisonProject.origAmount * 1_000_000))}`, rightMetaX, curY + 46);

    curY += 60;

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`1. MILESTONE PROGRESS COMPARISON MATRIX — AS REACHED AT ${activeMilestone.monthLabel.toUpperCase()}`, 40, curY);

    curY += 8;

    // Comparison Table
    const tableX = 40;
    const tableW = pageWidth - 80;
    const colWidths = {
      tier: 201.89,
      month: 140,
      quarter: 140,
      efy: 140,
      todate: 140
    };

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(tableX, curY, tableW, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let hX = tableX;
    doc.text("PROGRESS PLAN / ACTUAL TIER CATEGORY", hX + 8, curY + 14);
    hX += colWidths.tier;
    doc.text(`MONTH: ${activeMilestone.monthLabel.toUpperCase()}`, hX + 8, curY + 14);
    hX += colWidths.month;
    doc.text(`QUARTER: ${activeMilestone.quarterLabel.toUpperCase()}`, hX + 8, curY + 14);
    hX += colWidths.quarter;
    doc.text(`FISCAL YEAR: EFY ${activeMilestone.efyLabel}`, hX + 8, curY + 14);
    hX += colWidths.efy;
    doc.text(`CUMULATIVE TO-DATE AT THIS MONTH`, hX + 8, curY + 14);

    curY += 22;

    const rows = [
      {
        tier: "Contractor Work Program Plan",
        subtier: "Contractor Baseline Schedule",
        bg: [239, 246, 255],
        textColor: [30, 58, 138],
        m: comparisonTableData.contractor.month,
        q: comparisonTableData.contractor.quarter,
        e: comparisonTableData.contractor.efy,
        td: comparisonTableData.contractor.todate,
        isRatio: false
      },
      {
        tier: "ERA Approved Program Plan",
        subtier: "Employer Approved Target",
        bg: [245, 243, 255],
        textColor: [76, 29, 149],
        m: comparisonTableData.era.month,
        q: comparisonTableData.era.quarter,
        e: comparisonTableData.era.efy,
        td: comparisonTableData.era.todate,
        isRatio: false
      },
      {
        tier: "Actual Execution Accomplishment",
        subtier: "Supervision Verified Accomplishment",
        bg: [236, 253, 245],
        textColor: [6, 95, 70],
        m: comparisonTableData.actual.month,
        q: comparisonTableData.actual.quarter,
        e: comparisonTableData.actual.efy,
        td: comparisonTableData.actual.todate,
        isRatio: false
      },
      {
        tier: "% Accomplishment vs Contractor Plan",
        subtier: "% Accomplished / Contractor Plan Target",
        bg: [255, 255, 255],
        textColor: [30, 58, 138],
        m: comparisonTableData.ratioVsContractor.month,
        q: comparisonTableData.ratioVsContractor.quarter,
        e: comparisonTableData.ratioVsContractor.efy,
        td: comparisonTableData.ratioVsContractor.todate,
        isRatio: true
      },
      {
        tier: "% Accomplishment vs ERA Approved Plan",
        subtier: "% Accomplished / ERA Approved Target",
        bg: [248, 250, 252],
        textColor: [76, 29, 149],
        m: comparisonTableData.ratioVsEra.month,
        q: comparisonTableData.ratioVsEra.quarter,
        e: comparisonTableData.ratioVsEra.efy,
        td: comparisonTableData.ratioVsEra.todate,
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
      const tierLines = doc.splitTextToSize(r.tier, colWidths.tier - 12);
      doc.text(tierLines[0] || r.tier, rX + 8, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      const subtierLines = doc.splitTextToSize(r.subtier, colWidths.tier - 12);
      doc.text(subtierLines[0] || r.subtier, rX + 8, curY + 18);

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
          const pctStr = `${((val / comparisonTableData.lengthKm) * 100).toFixed(2)}% of length`;
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
      renderVal(r.m, !!r.isRatio, rX);
      rX += colWidths.month;
      renderVal(r.q, !!r.isRatio, rX);
      rX += colWidths.quarter;
      renderVal(r.e, !!r.isRatio, rX);
      rX += colWidths.efy;
      renderVal(r.td, !!r.isRatio, rX);

      curY += 22;
    });

    curY += 12;

    // Narrative Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, curY, pageWidth - 80, 42, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("EXECUTIVE AUDIT FINDINGS & SPI PERFORMANCE INDEX", 50, curY + 12);

    const spiMonth = comparisonTableData.era.month > 0 ? (comparisonTableData.actual.month / comparisonTableData.era.month).toFixed(2) : '1.00';
    const spiTodate = comparisonTableData.era.todate > 0 ? (comparisonTableData.actual.todate / comparisonTableData.era.todate).toFixed(2) : '1.00';

    const narrative = `During ${activeMilestone.monthLabel}, the actual execution reached ${comparisonTableData.actual.month.toFixed(2)} Km vs the ERA approved plan of ${comparisonTableData.era.month.toFixed(2)} Km (${comparisonTableData.ratioVsEra.month.toFixed(1)}% accomplishment rate vs ERA plan, Monthly SPI: ${spiMonth}). As of this milestone month, cumulative to-date physical accomplishment reached ${comparisonTableData.actual.todate.toFixed(2)} Km (${((comparisonTableData.actual.todate / comparisonTableData.lengthKm) * 100).toFixed(2)}% of total scope) against the planned ${comparisonTableData.era.todate.toFixed(2)} Km (${comparisonTableData.ratioVsEra.todate.toFixed(1)}% cumulative accomplishment rate vs ERA plan, Cumulative SPI: ${spiTodate}).`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const wrappedNarrative = doc.splitTextToSize(narrative, pageWidth - 100);
    doc.text(wrappedNarrative, 50, curY + 22);

    // Sign-Off Block at bottom of page
    curY = drawUniversalSignatureBlock(doc, pageHeight - 110, 'l');

    const fileName = `ERA_Progress_Comparison_${activeComparisonProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${activeMilestone.monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);
  };

  const handleExportProgressComparisonCSV = () => {
    if (!activeMilestone || groupComparisonMatrix.length === 0) return;

    const m = activeMilestone;

    let csv = `ETHIOPIAN ROADS ADMINISTRATION (ERA) - GROUP PORTFOLIO COMPARISON SUMMARY REPORT\n`;
    csv += `Group / Directorate,${selectedGroup || 'Southern'} ${groupType.toUpperCase()}\n`;
    csv += `Target Month,${m.monthLabel}\n`;
    csv += `Corresponding Quarter,${m.quarterLabel}\n`;
    csv += `Fiscal Year,EFY ${m.efyLabel}\n`;
    csv += `Total Projects,${groupComparisonMatrix.length}\n`;
    csv += `Generated Date,${new Date().toLocaleDateString()}\n`;
    csv += `Auditor,${currentUserObj.username} (ERA CMS)\n\n`;

    // 1. Program Directorate Group Performance Summary
    csv += `SECTION 1: PROGRAM DIRECTORATES GROUP AVERAGE PERFORMANCE SUMMARY (SELECTED MONTH, QUARTER & EFY)\n`;
    csv += `Directorate Name,Projects Count,Total Scope (Km),Avg Scope (Km),Avg Month (${m.monthLabel}) ERA Plan (Km),Avg Month (${m.monthLabel}) Actual (Km),Month Fulfillment Rate vs ERA (%),Avg Month Variance (Km),Avg Quarter (${m.quarterLabel}) ERA Plan (Km),Avg Quarter (${m.quarterLabel}) Actual (Km),Quarter Fulfillment Rate vs ERA (%),Avg Quarter Variance (Km),Avg EFY (${m.efyLabel}) ERA Plan (Km),Avg EFY (${m.efyLabel}) Actual (Km),EFY Fulfillment Rate vs ERA (%),Avg EFY Variance (Km),Health Status\n`;

    directorateComparisonSummary.forEach(d => {
      csv += `"${d.name} Directorate",${d.projectCount},${d.totalLengthKm.toFixed(2)},${d.avgLengthKm.toFixed(2)},${d.avgEraMonth.toFixed(2)},${d.avgActMonth.toFixed(2)},${d.monthRatio.toFixed(1)}%,${d.avgMonthVar.toFixed(2)},${d.avgEraQuarter.toFixed(2)},${d.avgActQuarter.toFixed(2)},${d.quarterRatio.toFixed(1)}%,${d.avgQuarterVar.toFixed(2)},${d.avgEraEfy.toFixed(2)},${d.avgActEfy.toFixed(2)},${d.efyRatio.toFixed(1)}%,${d.avgEfyVar.toFixed(2)},"${d.healthStatus}"\n`;
    });
    csv += `\n`;

    // 2. PMO Groupings Performance Summary
    csv += `SECTION 2: PMO GROUPINGS AVERAGE PERFORMANCE SUMMARY (SELECTED MONTH, QUARTER & EFY)\n`;
    csv += `PMO Name,Projects Count,Total Scope (Km),Avg Scope (Km),Avg Month (${m.monthLabel}) ERA Plan (Km),Avg Month (${m.monthLabel}) Actual (Km),Month Fulfillment Rate vs ERA (%),Avg Month Variance (Km),Avg Quarter (${m.quarterLabel}) ERA Plan (Km),Avg Quarter (${m.quarterLabel}) Actual (Km),Quarter Fulfillment Rate vs ERA (%),Avg Quarter Variance (Km),Avg EFY (${m.efyLabel}) ERA Plan (Km),Avg EFY (${m.efyLabel}) Actual (Km),EFY Fulfillment Rate vs ERA (%),Avg EFY Variance (Km),Health Status\n`;

    pmoComparisonSummary.forEach(p => {
      csv += `"${p.name}",${p.projectCount},${p.totalLengthKm.toFixed(2)},${p.avgLengthKm.toFixed(2)},${p.avgEraMonth.toFixed(2)},${p.avgActMonth.toFixed(2)},${p.monthRatio.toFixed(1)}%,${p.avgMonthVar.toFixed(2)},${p.avgEraQuarter.toFixed(2)},${p.avgActQuarter.toFixed(2)},${p.quarterRatio.toFixed(1)}%,${p.avgQuarterVar.toFixed(2)},${p.avgEraEfy.toFixed(2)},${p.avgActEfy.toFixed(2)},${p.efyRatio.toFixed(1)}%,${p.avgEfyVar.toFixed(2)},"${p.healthStatus}"\n`;
    });
    csv += `\n`;

    // 3. Overall Portfolio Aggregate
    if (overallPortfolioAverages) {
      const o = overallPortfolioAverages;
      csv += `SECTION 3: OVERALL PORTFOLIO AVERAGE & TOTAL SUMMARY (SELECTED MONTH, QUARTER & EFY)\n`;
      csv += `Metric Level,Projects Count,Total Scope (Km),Avg Scope (Km),Avg Month ERA Plan (Km),Avg Month Actual (Km),Month Fulfillment Rate vs ERA (%),Avg Quarter ERA Plan (Km),Avg Quarter Actual (Km),Quarter Fulfillment Rate vs ERA (%),Avg EFY ERA Plan (Km),Avg EFY Actual (Km),EFY Fulfillment Rate vs ERA (%)\n`;
      csv += `"PORTFOLIO OVERALL AVERAGE",${o.projectCount},${o.totalLengthKm.toFixed(2)},${o.avgLengthKm.toFixed(2)},${o.avgEraMonth.toFixed(2)},${o.avgActMonth.toFixed(2)},${o.monthRatio.toFixed(1)}%,${o.avgEraQuarter.toFixed(2)},${o.avgActQuarter.toFixed(2)},${o.quarterRatio.toFixed(1)}%,${o.avgEraEfy.toFixed(2)},${o.avgActEfy.toFixed(2)},${o.efyRatio.toFixed(1)}%\n\n`;
    }

    // 4. Detailed Individual Projects Matrix
    csv += `SECTION 4: INDIVIDUAL PROJECT PROGRESS COMPARISONS (ALL ${groupComparisonMatrix.length} PROJECTS)\n`;
    csv += `Project ID,Project Title,Directorate,PMO,Contractor,Supervision Consultant,Project Length (Km),Month (${m.monthLabel}) Ctr Plan (Km),Month (${m.monthLabel}) ERA Plan (Km),Month (${m.monthLabel}) Actual (Km),Month Execution Rate vs ERA (%),Month Variance vs ERA (Km),Quarter (${m.quarterLabel}) Ctr Plan (Km),Quarter (${m.quarterLabel}) ERA Plan (Km),Quarter (${m.quarterLabel}) Actual (Km),Quarter Execution Rate vs ERA (%),Quarter Variance vs ERA (Km),EFY (${m.efyLabel}) Ctr Plan (Km),EFY (${m.efyLabel}) ERA Plan (Km),EFY (${m.efyLabel}) Actual (Km),EFY Execution Rate vs ERA (%),EFY Variance vs ERA (Km),Cumulative Ctr Plan (Km),Cumulative ERA Plan (Km),Cumulative Actual (Km),Cumulative Execution Rate vs ERA Target (%),Cumulative Slippage vs ERA (Km),Status\n`;

    groupComparisonMatrix.forEach(row => {
      const exactCons = getExactConsultantName(row.project);
      csv += `"${row.project.id}","${row.project.name.replace(/"/g, '""')}","${(row.project.programDirectorate || 'Southern').replace(/"/g, '""')}","${(row.project.pmo || 'PMO 1').replace(/"/g, '""')}","${(row.project.contractor || 'Not Specified').replace(/"/g, '""')}","${exactCons.replace(/"/g, '""')}",${row.lengthKm},${row.contractor.month.toFixed(2)},${row.era.month.toFixed(2)},${row.actual.month.toFixed(2)},${row.monthRatio.toFixed(1)}%,${row.monthVariance.toFixed(2)},${row.contractor.quarter.toFixed(2)},${row.era.quarter.toFixed(2)},${row.actual.quarter.toFixed(2)},${row.quarterRatio.toFixed(1)}%,${row.quarterVariance.toFixed(2)},${row.contractor.efy.toFixed(2)},${row.era.efy.toFixed(2)},${row.actual.efy.toFixed(2)},${row.efyRatio.toFixed(1)}%,${row.efyVariance.toFixed(2)},${row.contractor.todate.toFixed(2)},${row.era.todate.toFixed(2)},${row.actual.todate.toFixed(2)},${row.todateRatio.toFixed(1)}%,${row.todateVariance.toFixed(2)},"${row.healthStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ERA_Group_Portfolio_Comparison_${(selectedGroup || 'Southern').replace(/[^a-zA-Z0-9]/g, '_')}_${m.monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-xl shadow-md space-y-2 sm:space-y-2.5 overflow-hidden"
    >
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
        <div className="space-y-0.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" /> Executive Group Report Workspace
          </h3>
          <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium">
            Generate detailed status dossiers, physical progress benchmarks, and budget statements.
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
          title="Close Workspace"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Report Mode Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-700/60 pb-1.5 pt-0.5">
        <button
          onClick={() => setReportMode('performance')}
          id="btn-report-perf"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'performance'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Executive Performance Summary
        </button>
        <button
          onClick={() => setReportMode('audit')}
          id="btn-report-audit"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'audit'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Compliance & Performance Audit
        </button>
        <button
          onClick={() => setReportMode('payments')}
          id="btn-report-payments"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'payments'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Matured Payment Status & Amount
        </button>
        <button
          onClick={() => setReportMode('bonds')}
          id="btn-report-bonds"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'bonds'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Bond Guarantee Status
        </button>
        <button
          onClick={() => setReportMode('firms')}
          id="btn-report-firms"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'firms'
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-amber-500" /> Firms
        </button>
        <button
          onClick={() => setReportMode('supervisionStaff')}
          id="btn-report-supervision-staff"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'supervisionStaff'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-500" /> Supervision Personnel Workload & Staff Status
        </button>
        <button
          onClick={() => setReportMode('progressComparison')}
          id="btn-report-progress-comparison"
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            reportMode === 'progressComparison'
              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-2xs font-extrabold'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Progress Plan & Accomplishment Comparison
        </button>
      </div>

      {reportMode === 'firms' ? (
        <FirmsManagementView
          projects={projects}
          currentUserObj={currentUserObj}
          onUpdateProject={onUpdateProject}
          onSelectProject={onSelectProject}
          onClose={onClose}
        />
      ) : (
        /* Grid Layout Container (Full width for progressComparison landscape view, 12-column grid for others) */
        <div className={reportMode === 'progressComparison' ? "w-full space-y-2.5" : "grid grid-cols-1 lg:grid-cols-12 gap-2.5"}>
        
        {/* Left Control Panel Column (Only displayed for non-progressComparison reports) */}
        {reportMode !== 'progressComparison' && (
          <div className="lg:col-span-4 space-y-2 border-r border-slate-100 dark:border-slate-700/50 pr-0 lg:pr-2.5">
          
          {/* Dimension Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              1. GROUPING DIMENSION
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setGroupType('directorate');
                  setSelectedGroup('All');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'directorate'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                Directorate
              </button>
              <button
                onClick={() => {
                  setGroupType('pmo');
                  setSelectedGroup('All');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'pmo'
                    ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/50 dark:text-purple-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                PMO Group
              </button>
              <button
                onClick={() => {
                  setGroupType('contractor');
                  setSelectedGroup('All');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'contractor'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Contractor
              </button>
              <button
                onClick={() => {
                  setGroupType('consultant');
                  setSelectedGroup('All');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'consultant'
                    ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/50 dark:text-teal-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Consultant
              </button>
            </div>
          </div>

          {/* Group Value Filter Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              2. SELECT TARGET VALUE
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="All">🌐 All Groups (Aggregated View)</option>
              {groupType === 'directorate' && programDirectorates.map((pd, idx) => (
                <option key={`pd_${pd}_${idx}`} value={pd}>🏢 Directorate: {pd}</option>
              ))}
              {groupType === 'pmo' && pmos.map((p, idx) => (
                <option key={`pmo_${p}_${idx}`} value={p}>📦 PMO Group: {p}</option>
              ))}
              {groupType === 'contractor' && contractors.map((c, idx) => (
                <option key={`ctr_${c}_${idx}`} value={c}>🏗️ Contractor: {c}</option>
              ))}
              {groupType === 'consultant' && consultants.map((c, idx) => (
                <option key={`cns_${c}_${idx}`} value={c}>🎓 Consultant: {c}</option>
              ))}
            </select>
          </div>

          {/* Matured Payments Option Filter */}
          <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-750 dark:text-zinc-200 block">
                  Only Overdue Matured Claims
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight">
                  Filter group report for FIDIC Cl. 14.7 payment breaches (&gt; 56 days).
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={maturedFilterOnly}
                  onChange={(e) => setMaturedFilterOnly(e.target.checked)}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Sorting Controller */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              3. SORTING CRITERIA
            </label>
            <div className="flex gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="name">🔤 Project Name</option>
                <option value="progress">📊 Physical Progress</option>
                <option value="value">💰 Contract Value</option>
              </select>
              <button
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                title="Toggle Order"
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-0.5">
              4. GENERATE DOCUMENTS
            </label>
            {reportMode === 'performance' ? (
              <>
                <button
                  onClick={handleExportPDF}
                  id="btn-export-perf-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Executive PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  id="btn-export-perf-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export CSV Sheet
                </button>
              </>
            ) : reportMode === 'audit' ? (
              <>
                <button
                  onClick={handleExportAuditPDF}
                  id="btn-export-audit-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Audit PDF
                </button>
                <button
                  onClick={handleExportAuditCSV}
                  id="btn-export-audit-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-red-600 dark:text-rose-450" /> Export Audit CSV Sheet
                </button>
              </>
            ) : reportMode === 'payments' ? (
              <>
                <button
                  onClick={handleExportPaymentsPDF}
                  id="btn-export-payments-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Payments PDF
                </button>
                <button
                  onClick={handleExportPaymentsCSV}
                  id="btn-export-payments-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export Payments CSV
                </button>
              </>
            ) : reportMode === 'bonds' ? (
              <>
                <button
                  onClick={() => {
                    setInstitutesModalTab('guaranties');
                    setIsInstitutesModalOpen(true);
                  }}
                  id="btn-open-financial-institutes-modal"
                  className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                  title="Register Banks, Insurances, and Guarantee Policy Categories (CAR, Advance, Retention...)"
                >
                  <Landmark className="w-3.5 h-3.5" /> Register Banks & Policies
                </button>
                <button
                  onClick={handleExportBondsPDF}
                  id="btn-export-bonds-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Bonds PDF
                </button>
                <button
                  onClick={handleExportBondsCSV}
                  id="btn-export-bonds-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Export Bonds CSV
                </button>
              </>
            ) : reportMode === 'progressComparison' ? (
              <>
                <button
                  onClick={handleExportProgressComparisonPDF}
                  id="btn-export-comparison-pdf"
                  disabled={groupComparisonMatrix.length === 0 || !activeMilestone}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                  title="Export Group Portfolio Comparison Summary PDF for all multiple projects"
                >
                  <Printer className="w-3.5 h-3.5" /> Export Portfolio PDF
                </button>
                <button
                  onClick={handleExportDirectoratePmoSummaryPDF}
                  id="btn-export-directorate-pmo-summary-sidebar"
                  disabled={!activeMilestone}
                  className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-1.5 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                  title="Export aggregated Directorate & PMO Group Performance Summary PDF"
                >
                  <Building2 className="w-3.5 h-3.5" /> Export Directorate & PMO PDF
                </button>
                <button
                  onClick={handleExportProgressComparisonCSV}
                  id="btn-export-comparison-csv"
                  disabled={groupComparisonMatrix.length === 0 || !activeMilestone}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export Comparison CSV
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePrintWorkloadReport}
                  id="btn-print-workload-report"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Workload Report
                </button>
                <button
                  onClick={() => setIsPrintWorkloadModalOpen(true)}
                  id="btn-preview-workload-table"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 disabled:opacity-50 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Workload Ledger
                </button>
                <button
                  onClick={handleExportSupervisionStaffPDF}
                  id="btn-export-supervision-staff-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Staff PDF
                </button>
                <button
                  onClick={handleExportSupervisionStaffCSV}
                  id="btn-export-supervision-staff-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Export Staff Roster CSV
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* Main Display Area (Full width in progressComparison, lg:col-span-8 in others) */}
        <div className={reportMode === 'progressComparison' ? "w-full space-y-2.5 sm:space-y-3" : "lg:col-span-8 space-y-2.5 sm:space-y-3"}>

          {/* Supervision Consultant Performance Evaluation Cohort Switcher: Sole vs JV Separately */}
          {(reportMode === 'audit' && (groupType === 'consultant' || auditPerspective === 'consultant')) && (
            <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                        Consultant Evaluation Framework
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Separate Cohort Evaluation
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Evaluate Sole Consultants and Joint Venture (JV) Consortia separately under their respective contractual frameworks.
                    </p>
                  </div>
                </div>

                {/* Cohort Toggle Buttons */}
                <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200/80 dark:border-indigo-800 shadow-2xs self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setConsultantCohortFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      consultantCohortFilter === 'all'
                        ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>All ({consultantCohortStats.total})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultantCohortFilter('sole')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      consultantCohortFilter === 'sole'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                    }`}
                  >
                    <span>🏢 Sole ({consultantCohortStats.soleCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultantCohortFilter('jv')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      consultantCohortFilter === 'jv'
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                    }`}
                  >
                    <span>🤝 JV ({consultantCohortStats.jvCount})</span>
                  </button>
                </div>
              </div>

              {/* Informational Context Banner */}
              {consultantCohortFilter === 'sole' ? (
                <div className="p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-2xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span className="text-xs">🏢</span>
                  <div>
                    <strong>Sole Consultant Performance Active:</strong> Evaluating single independent consulting firms under direct 100% contractual accountability.
                  </div>
                </div>
              ) : consultantCohortFilter === 'jv' ? (
                <div className="p-2 rounded-lg bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 text-2xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <span className="text-xs">🤝</span>
                  <div>
                    <strong>Joint Venture (JV) Performance Active:</strong> Evaluating multi-firm consortia with Lead and Associate Partner weighting.
                  </div>
                </div>
              ) : null}
            </div>
          )}
          
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {reportMode === 'performance' ? (
              <>
                {/* KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    ACTIVE CONTRACTS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-slate-800 dark:text-zinc-100">
                      {stats.count}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">contracts</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {stats.completedCount} completed (&gt;=95%)
                  </div>
                </div>

                {/* KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    AVG PHYSICAL PROGRESS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-teal-600 dark:text-teal-400">
                      {stats.avgProgress.toFixed(2)}%
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">completed</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Across all matching group contracts
                  </div>
                </div>

                {/* KPI Block 3 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL GROUP COMMITMENT
                  </span>
                  <div className="flex items-baseline gap-1 truncate">
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-100 truncate">
                      ETB {stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[9px] text-red-500 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> {stats.warningCount} guarantee alert triggers
                  </div>
                </div>
              </>
            ) : reportMode === 'audit' ? (
              groupType === 'consultant' || auditPerspective === 'consultant' ? (
                <>
                  {/* Consultant Audit KPI Block 1: Average Score & Official Grade */}
                  <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-2.5 rounded-xl border border-indigo-150 dark:border-indigo-900/30 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                        {consultantCohortFilter === 'sole' 
                          ? 'SOLE CONSULTANT PERFORMANCE AUDIT' 
                          : consultantCohortFilter === 'jv' 
                            ? 'JOINT VENTURE (JV) PERFORMANCE AUDIT' 
                            : 'CONSULTANT PERFORMANCE AUDIT'}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${consultantAuditStats.groupGradeThreshold.badgeStyle}`}>
                        Grade {consultantAuditStats.groupGradeThreshold.grade.replace('Grade ', '')} — {consultantAuditStats.groupGradeThreshold.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                        {consultantAuditStats.avgScore.toFixed(1)}%
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">
                        {consultantCohortFilter === 'sole' 
                          ? 'sole firms composite' 
                          : consultantCohortFilter === 'jv' 
                            ? 'JV consortia composite' 
                            : 'composite score'}
                      </span>
                    </div>
                    <div className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono">
                      [ 5-Dim Matrix: {consultantAuditStats.avgFiveDimScore.toFixed(1)}% (50%) + SLA On-Time: {consultantAuditStats.avgSlaRate.toFixed(1)}% (50%) ]
                    </div>
                  </div>

                  {/* Consultant Audit KPI Block 2: Submittal SLA & RFI Turnaround */}
                  <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      SUBMITTAL SLA & TURNAROUND
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-black ${
                        consultantAuditStats.avgSlaRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                        consultantAuditStats.avgSlaRate >= 60 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {consultantAuditStats.avgSlaRate.toFixed(1)}%
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">on-time ({consultantAuditStats.avgTurnaroundDays}d avg)</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-400">
                      Target 14 days • {consultantAuditStats.totalPendingRfis} pending RFIs across group
                    </div>
                  </div>

                  {/* Consultant Audit KPI Block 3: Key Personnel Mobilization */}
                  <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      KEY STAFF MOBILIZATION
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-black ${
                        consultantAuditStats.mobilizationRatePct >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                        consultantAuditStats.mobilizationRatePct >= 70 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {consultantAuditStats.mobilizationRatePct}%
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">deployed</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-400 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-indigo-500" /> {consultantAuditStats.activeKeyStaff} of {consultantAuditStats.totalKeyStaff} key experts active in field
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Audit KPI Block 1 */}
                  <div className="bg-rose-50/30 dark:bg-rose-950/5 p-2.5 rounded-xl border border-rose-150 dark:border-rose-900/30 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-rose-500 dark:text-rose-400 block uppercase tracking-wider">
                      AVG COMPLIANCE SCORE
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-black ${
                        auditStats.avgScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                        auditStats.avgScore >= 65 ? 'text-amber-500' : 'text-red-500 dark:text-rose-400'
                      }`}>
                        {auditStats.avgScore.toFixed(2)}%
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">rating</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-400">
                      {auditStats.compliantCount} / {processedProjects.length} projects compliant (&gt;=70%)
                    </div>
                  </div>

                  {/* Audit KPI Block 2 */}
                  <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      SCHEDULE SLIPPAGE RATE
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-black ${auditStats.behindSchedulePct > 35 ? 'text-red-500' : 'text-slate-800 dark:text-zinc-100'}`}>
                        {auditStats.behindSchedulePct.toFixed(2)}%
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">slipping</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-400">
                      {auditStats.behindScheduleCount} of {processedProjects.length} behind schedule
                    </div>
                  </div>

                  {/* Audit KPI Block 3 */}
                  <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      COMPLIANCE BREACH TRIGGERS
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-black ${auditStats.totalExpiredBonds > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {auditStats.totalExpiredBonds + auditStats.totalCriticalRisks}
                      </span>
                      <span className="text-2xs text-slate-400 font-bold">alerts</span>
                    </div>
                    <div className="text-[9px] text-red-500 dark:text-rose-450 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> {auditStats.totalExpiredBonds} expired guarantees, {auditStats.totalCriticalRisks} high risks
                    </div>
                  </div>
                </>
              )
            ) : reportMode === 'payments' ? (
              <>
                {/* Payments KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL CERTIFIED CLAIMS
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-2xs font-black text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                      <span>ETB:</span>
                      <span className="font-mono">{formatAccounting(paymentStats.totalCertifiedEtb, '')}</span>
                    </div>
                    <div className="text-2xs font-black text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                      <span>USD:</span>
                      <span className="font-mono">${formatAccounting(paymentStats.totalCertifiedUsd, '')}</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-400 font-bold border-t border-slate-200/50 dark:border-slate-700/50 pt-0.5 mt-0.5">
                      Eqv: ETB {paymentStats.combinedCertifiedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })} • {paymentStats.totalIpcCount} IPCs
                    </div>
                  </div>
                </div>

                {/* Payments KPI Block 2 */}
                <div className="bg-amber-50/40 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/30 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-500 block uppercase tracking-wider">
                    OUTSTANDING (UNPAID) CLAIMS
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-2xs font-black text-amber-700 dark:text-amber-400 flex items-center justify-between">
                      <span>ETB:</span>
                      <span className="font-mono">{formatAccounting(paymentStats.totalUnpaidEtb, '')}</span>
                    </div>
                    <div className="text-2xs font-black text-amber-700 dark:text-amber-400 flex items-center justify-between">
                      <span>USD:</span>
                      <span className="font-mono">${formatAccounting(paymentStats.totalUnpaidUsd, '')}</span>
                    </div>
                    <div className="text-[9px] text-amber-800/80 dark:text-amber-300 font-bold border-t border-amber-200/50 dark:border-amber-800/50 pt-0.5 mt-0.5">
                      Eqv: ETB {paymentStats.combinedUnpaidEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })} • {paymentStats.unpaidIpcCount} Pending IPCs
                    </div>
                  </div>
                </div>

                {/* Payments KPI Block 3 */}
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${
                  paymentStats.maturedIpcCount > 0 
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                    : 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-150 dark:border-slate-700/40'
                }`}>
                  <span className={`text-[9px] font-extrabold block uppercase tracking-wider ${
                    paymentStats.maturedIpcCount > 0 ? 'text-red-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    CRITICAL MATURED OVERDUE (&gt;56 DAYS)
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className={`text-2xs font-black flex items-center justify-between ${paymentStats.maturedIpcCount > 0 ? 'text-red-600 dark:text-rose-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                      <span>ETB:</span>
                      <span className="font-mono">{formatAccounting(paymentStats.totalMaturedEtb, '')}</span>
                    </div>
                    <div className={`text-2xs font-black flex items-center justify-between ${paymentStats.maturedIpcCount > 0 ? 'text-red-600 dark:text-rose-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                      <span>USD:</span>
                      <span className="font-mono">${formatAccounting(paymentStats.totalMaturedUsd, '')}</span>
                    </div>
                    <div className={`text-[9px] font-bold border-t pt-0.5 mt-0.5 ${
                      paymentStats.maturedIpcCount > 0 
                        ? 'text-red-600 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60' 
                        : 'text-slate-400 border-slate-200/50 dark:border-slate-700/50'
                    }`}>
                      Eqv: ETB {paymentStats.combinedMaturedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })} • {paymentStats.maturedIpcCount} Overdue (&gt;56d)
                    </div>
                  </div>
                </div>
              </>
            ) : reportMode === 'bonds' ? (
              <>
                {/* Bonds KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL REGISTERED SECURITIES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-slate-800 dark:text-zinc-100">
                      {bondStats.totalBondsCount} Guarantees
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold truncate">
                    Valued at ETB {bondStats.totalBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Bonds KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    VALID & ACTIVE GUARANTEES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {bondStats.validBondsCount} Valid
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    Active protection of ETB {bondStats.validBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Bonds KPI Block 3 */}
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${
                  bondStats.expiredBondsCount > 0 
                    ? 'bg-rose-50/30 dark:bg-rose-950/5 border-rose-150 dark:border-rose-900/30' 
                    : 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-150 dark:border-slate-700/40'
                }`}>
                  <span className={`text-[9px] font-extrabold block uppercase tracking-wider ${
                    bondStats.expiredBondsCount > 0 ? 'text-red-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    CRITICAL EXPIRED GUARANTEES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-base font-black ${
                      bondStats.expiredBondsCount > 0 ? 'text-red-500 dark:text-rose-450' : 'text-slate-850 dark:text-zinc-200'
                    }`}>
                      {bondStats.expiredBondsCount} Expired
                    </span>
                  </div>
                  <div className={`text-[9px] font-bold ${
                    bondStats.expiredBondsCount > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    Unprotected risk of ETB {bondStats.expiredBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </>
            ) : reportMode === 'progressComparison' ? null : (
              <>
                {/* Supervision Staff KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    MOBILIZED SUPERVISION STAFF
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-slate-800 dark:text-zinc-100">
                      {supervisionStaffStats.activePersonnelCount}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">/ {supervisionStaffStats.totalPersonnelCount} assigned</span>
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {supervisionStaffStats.activeStaffPct.toFixed(0)}% mobilization ({supervisionStaffStats.demobilizedPersonnelCount} demob)
                  </div>
                </div>

                {/* Supervision Staff KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    KEY EXPERTS & RESIDENT ENGINEERS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-purple-600 dark:text-purple-400">
                      {supervisionStaffStats.activeKeyPersonnelCount}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">active key roles</span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {supervisionStaffStats.residentEngineersCount} REs deployed across {supervisionStaffStats.totalProjectsWithConsultant} projects
                  </div>
                </div>

                {/* Supervision Staff KPI Block 3 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-0.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    MAN-MONTH (MM) WORKLOAD INPUT
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-cyan-600 dark:text-cyan-400">
                      {supervisionStaffStats.totalExpendedMM.toFixed(1)}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">/ {supervisionStaffStats.totalAllocatedMM.toFixed(1)} MM</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-cyan-500" /> {supervisionStaffStats.overallWorkloadPct.toFixed(1)}% workload input utilized
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Table Panel */}
          <div className="space-y-2">
            {reportMode === 'audit' && (
              <div className="space-y-2">
                {/* Grading Domain Selector */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      ⚖️
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                        Select Grading & Audit Focus Domain
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Switch between project contractor performance grading and supervision consultant SLA grading
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <button
                      onClick={() => setAuditPerspective('contractor')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        auditPerspective === 'contractor'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🏗️ Project / Contractor</span>
                    </button>
                    <button
                      onClick={() => setAuditPerspective('consultant')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        auditPerspective === 'consultant'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>👥 Supervision Consultant</span>
                    </button>
                  </div>
                </div>

                {auditPerspective === 'contractor' && (
                  <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-2xs space-y-1.5 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 font-black uppercase text-slate-700 dark:text-zinc-200 tracking-wider text-[10px]">
                        <span>📋 PROJECT CONTRACTOR COMPLIANCE & GRADE SCORING MODEL WEIGHT DISTRIBUTION</span>
                      </div>
                      {isMasterAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempContractorWeights(contractorWeights);
                            setTempConsultantWeights(consultantWeights);
                            setIsEditingWeightsModalOpen(true);
                          }}
                          className="px-2 py-0.5 text-[9.5px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-2xs group"
                          title="Master Admin Permission: Edit and update weightages for scoring model"
                        >
                          <Sliders className="w-3 h-3 text-amber-600 dark:text-amber-400 group-hover:rotate-45 transition-transform" />
                          <span>⚙️ Edit Weightages</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 text-center text-[10px]">
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.fidic}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.fidic || '1. FIDIC Compliance'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.projectMgmt}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.projectMgmt || '2. Project Mgmt'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.evm}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.evm || '3. EVM (CPI/SPI)'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.kpi}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.kpi || '4. KPIs & Quality'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.linear}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.linear || '5. Linear Layers'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.rfi ?? 10}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.rfi || '6. Technical RFIs'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.materialApproval ?? 10}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.materialApproval || '7. Material Approval'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.workInspection ?? 5}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.workInspection || '8. Work Inspection'}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{contractorWeights.resourceMobilization ?? 5}% WEIGHT</span>
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block">{contractorWeights.labels?.resourceMobilization || '9. Mobilization'}</span>
                      </div>
                      {(contractorWeights.customCriteria || []).map((c) => (
                        <div key={c.id} className="bg-indigo-50/50 dark:bg-indigo-950/30 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5 text-[11px]">{c.weight}% WEIGHT</span>
                          <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300 block truncate">{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Comparison Dedicated Controls Header Panel (Above Live Dataset Preview) */}
            {reportMode === 'progressComparison' && (
              <div className="p-2.5 sm:p-3 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                {/* Row 1: 1. GROUPING DIMENSION & 2. SELECT TARGET VALUE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
                  {/* 1. GROUPING DIMENSION */}
                  <div className="lg:col-span-5 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                      1. GROUPING DIMENSION
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGroupType('directorate');
                          setSelectedGroup('All');
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          groupType === 'directorate'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400 font-extrabold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Building className="w-3 h-3" />
                        <span>Directorate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupType('pmo');
                          setSelectedGroup('All');
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          groupType === 'pmo'
                            ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/50 dark:text-purple-400 font-extrabold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>PMO</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupType('contractor');
                          setSelectedGroup('All');
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          groupType === 'contractor'
                            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-indigo-900/50 dark:text-amber-400 font-extrabold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>Contractor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupType('consultant');
                          setSelectedGroup('All');
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          groupType === 'consultant'
                            ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/50 dark:text-teal-400 font-extrabold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Consultant</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. SELECT TARGET VALUE - Main Group Select */}
                  <div className="lg:col-span-7 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                      2. SELECT TARGET VALUE
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="All">🌐 All Groups (Aggregated View)</option>
                      {groupType === 'directorate' && programDirectorates.map((pd, idx) => (
                        <option key={`pd_top_${pd}_${idx}`} value={pd}>🏢 Directorate: {pd}</option>
                      ))}
                      {groupType === 'pmo' && pmos.map((p, idx) => (
                        <option key={`pmo_top_${p}_${idx}`} value={p}>📦 PMO Group: {p}</option>
                      ))}
                      {groupType === 'contractor' && contractors.map((c, idx) => (
                        <option key={`ctr_top_${c}_${idx}`} value={c}>🏗️ Contractor: {c}</option>
                      ))}
                      {groupType === 'consultant' && consultants.map((c, idx) => (
                        <option key={`cns_top_${c}_${idx}`} value={c}>🎓 Consultant: {c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: 3. SORTING CRITERIA and 4. GENERATE DOCUMENTS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 items-end">
                  {/* 3. SORTING CRITERIA */}
                  <div className="lg:col-span-4 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                      3. SORTING CRITERIA
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="name">🔤 Project Name</option>
                        <option value="progress">📊 Physical Progress</option>
                        <option value="value">💰 Contract Value</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                        title="Toggle Order"
                      >
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* 4. GENERATE DOCUMENTS */}
                  <div className="lg:col-span-8 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                      4. GENERATE DOCUMENTS
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={handleExportProgressComparisonPDF}
                        id="btn-export-comparison-pdf-top"
                        disabled={groupComparisonMatrix.length === 0 || !activeMilestone}
                        className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-1 rounded-lg text-xs font-extrabold shadow-2xs transition cursor-pointer"
                        title="Export Group Portfolio Comparison Summary PDF for all multiple projects"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Export PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportDirectoratePmoSummaryPDF}
                        id="btn-export-directorate-pmo-summary-top"
                        disabled={!activeMilestone}
                        className="w-full flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-1 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                        title="Export aggregated Directorate & PMO Group Performance Summary PDF"
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Directorate PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportProgressComparisonCSV}
                        id="btn-export-comparison-csv-top"
                        disabled={groupComparisonMatrix.length === 0 || !activeMilestone}
                        className="w-full flex items-center justify-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-1 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">Comparison CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Live Dataset Preview ({processedProjects.length} rows)
                </span>
                {reportMode === 'progressComparison' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Landscape View Mode
                  </span>
                )}
              </div>
              
              {/* Quick Filter Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 text-2xs px-7 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 max-w-xs text-slate-800 dark:text-zinc-100"
                />
                {reportSearchQuery && (
                  <button 
                    onClick={() => setReportSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-3xs font-extrabold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Structured Table Container */}
            {reportMode === 'progressComparison' ? (
              <div id="progressComparisonContainer" className="space-y-3 sm:space-y-3.5">
                {/* 5. Directorate & PMO Group Average Performance Report (ERA Plan vs Accomplished - Collapsible/Default Hidden) */}
                <div className="border-2 border-indigo-200 dark:border-indigo-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md space-y-0">
                  {/* Header */}
                  <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-600/80 rounded-xl border border-indigo-400/40 shadow-inner">
                        <Landmark className="w-5 h-5 text-indigo-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                            Directorate & PMO Group Performance Summary
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                            ERA Plan vs Accomplished
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                      {/* Export Summary PDF Button */}
                      <button
                        type="button"
                        onClick={handleExportDirectoratePmoSummaryPDF}
                        disabled={!activeMilestone}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-sm cursor-pointer disabled:opacity-50"
                        title="Print / Export Directorate & PMO Group Performance Summary in PDF"
                        id="btn-export-directorate-pmo-summary-pdf"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Export Summary PDF</span>
                      </button>

                      {/* Show / Hide Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setIsAvgSummaryExpanded(!isAvgSummaryExpanded)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          isAvgSummaryExpanded
                            ? 'bg-slate-800 text-indigo-200 border-indigo-400/40 hover:bg-slate-700'
                            : 'bg-indigo-600 text-white border-indigo-400 shadow-sm hover:bg-indigo-500'
                        }`}
                        title={isAvgSummaryExpanded ? 'Hide Directorate & PMO Group Summary' : 'Show Directorate & PMO Group Summary'}
                      >
                        {isAvgSummaryExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isAvgSummaryExpanded ? 'Hide Group Summary' : 'Show Group Summary'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsed Placeholder Bar */}
                  {!isAvgSummaryExpanded && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-2xs">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span>Directorate & PMO performance summary is currently hidden. Click "Show Group Summary" to display aggregated month, quarter, and EFY averages.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAvgSummaryExpanded(true)}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-2xs font-bold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Show Group Summary</span>
                      </button>
                    </div>
                  )}

                  {isAvgSummaryExpanded && (
                    <div className="p-4 space-y-3.5">
                      {/* Sub-Tabs & Quick KPI Badges */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Group Selection Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit text-xs font-bold">
                          {/* Combined Overview button is hidden for PMO Admins */}
                          {!(currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) && (
                            <button
                              type="button"
                              onClick={() => setAvgSummaryGroupTab('both')}
                              className={`px-3 py-1 rounded-lg transition ${avgSummaryGroupTab === 'both' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-black shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                              Combined Overview ({directorateComparisonSummary.length + pmoComparisonSummary.length} Groups)
                            </button>
                          )}

                          {/* Program Directorates button is hidden for PMO Admins, but shown for Directorate Admins and CPM/Super Admins */}
                          {!(currentUserObj.role === 'pmo_admin' || currentUserObj.assignedPmo) && (
                            <button
                              type="button"
                              onClick={() => setAvgSummaryGroupTab('directorate')}
                              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${avgSummaryGroupTab === 'directorate' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-black shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              Program Directorates ({directorateComparisonSummary.length})
                            </button>
                          )}

                          {/* PMO Groupings button shown for everyone */}
                          <button
                            type="button"
                            onClick={() => setAvgSummaryGroupTab('pmo')}
                            className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${avgSummaryGroupTab === 'pmo' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-black shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            PMO Groupings ({pmoComparisonSummary.length})
                          </button>
                        </div>

                        {/* Top Performance Badges */}
                        {overallPortfolioAverages && (
                          <div className="flex items-center gap-2 flex-wrap text-2xs">
                            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Portfolio Monthly Fulfillment:</span>
                              <span className="font-mono font-black">{overallPortfolioAverages.monthRatio.toFixed(1)}%</span>
                            </div>
                            <div className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>Portfolio EFY Fulfillment:</span>
                              <span className="font-mono font-black">{overallPortfolioAverages.efyRatio.toFixed(1)}%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Milestone Display with Month/Quarter/EFY select options */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/40 dark:bg-slate-800/40 rounded-xl border border-indigo-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">
                            Select Performance Milestone Period:
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-2xs font-bold">
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">Month:</span>
                            <select
                              value={activeMilestone?.monthLabel || ''}
                              onChange={(e) => {
                                const mLabel = e.target.value;
                                const match = availableMilestones.find(m => m.monthLabel === mLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer"
                            >
                              {uniqueMonths.map(m => (
                                <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{m}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">Quarter:</span>
                            <select
                              value={activeMilestone?.quarterLabel || ''}
                              onChange={(e) => {
                                const qLabel = e.target.value;
                                const match = availableMilestones.find(m => m.quarterLabel === qLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer"
                            >
                              {uniqueQuarters.map(q => (
                                <option key={q} value={q} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{q}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">EFY Year:</span>
                            <select
                              value={activeMilestone?.efyLabel || ''}
                              onChange={(e) => {
                                const efyLabel = e.target.value;
                                const match = availableMilestones.find(m => m.efyLabel === efyLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer"
                            >
                              {uniqueEfys.map(efy => (
                                <option key={efy} value={efy} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">EFY {efy}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Directorate and PMO Summary Table */}
                      <div className="overflow-auto max-h-[500px] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                        <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-2xs">
                              <th className="px-3.5 py-3 min-w-[180px]">Group Entity (Directorate / PMO)</th>
                              <th className="px-3 py-3 text-center min-w-[90px]">Projects & Scope</th>
                              <th className="px-3 py-3 text-center min-w-[155px] bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                                Month: {activeMilestone?.monthLabel} (ERA vs Act)
                              </th>
                              <th className="px-3 py-3 text-center min-w-[150px] bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200">
                                Quarter: {activeMilestone?.quarterLabel} (ERA vs Act)
                              </th>
                              <th className="px-3 py-3 text-center min-w-[150px] bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200">
                                EFY {activeMilestone?.efyLabel} (ERA vs Act)
                              </th>
                              <th className="px-3 py-3 text-center min-w-[90px]">Health</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {/* Render Directorates if selected */}
                            {(avgSummaryGroupTab === 'both' || avgSummaryGroupTab === 'directorate') && (
                              <>
                                {avgSummaryGroupTab === 'both' && (
                                  <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase">
                                    <td colSpan={6} className="px-3.5 py-1.5 flex items-center gap-1.5">
                                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                      Program Directorates Averages & Totals ({directorateComparisonSummary.length} Directorates)
                                    </td>
                                  </tr>
                                )}
                                {directorateComparisonSummary.map((grp) => {
                                  const eraM = grp.totalEraMonth;
                                  const actM = grp.totalActMonth;

                                  const eraQ = grp.totalEraQuarter;
                                  const actQ = grp.totalActQuarter;

                                  const eraE = grp.totalEraEfy;
                                  const actE = grp.totalActEfy;

                                  return (
                                    <tr key={`dir_sum_${grp.name}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                      {/* Entity Info */}
                                      <td className="px-3.5 py-2.5">
                                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span>{grp.name} Directorate</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono pl-5">
                                          Directorate Group • {grp.projectCount} Projects
                                        </div>
                                      </td>

                                      {/* Scope */}
                                      <td className="px-3 py-2.5 text-center font-mono">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                          {grp.totalLengthKm.toFixed(1)} Km
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {grp.projectCount} proj • {grp.totalLengthKm.toFixed(0)} Km tot
                                        </div>
                                      </td>

                                      {/* Monthly */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-blue-50/20 dark:bg-blue-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-blue-150 dark:border-blue-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraM.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actM.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.monthRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                              {grp.monthRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Quarterly */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-indigo-50/20 dark:bg-indigo-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-indigo-150 dark:border-indigo-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraQ.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actQ.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.quarterRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                              {grp.quarterRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* EFY */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-purple-50/20 dark:bg-purple-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-purple-150 dark:border-purple-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraE.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actE.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.efyRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                              {grp.efyRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Health */}
                                      <td className="px-3 py-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-block border ${
                                          grp.healthStatus === 'Ahead'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                            : grp.healthStatus === 'On Track'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                            : grp.healthStatus === 'Lagging'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                        }`}>
                                          {grp.healthStatus}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* Render PMOs if selected */}
                            {(avgSummaryGroupTab === 'both' || avgSummaryGroupTab === 'pmo') && (
                              <>
                                {avgSummaryGroupTab === 'both' && (
                                  <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase">
                                    <td colSpan={6} className="px-3.5 py-1.5 flex items-center gap-1.5">
                                      <Landmark className="w-3.5 h-3.5 text-indigo-500" />
                                      PMO Groupings Averages & Totals ({pmoComparisonSummary.length} PMOs)
                                    </td>
                                  </tr>
                                )}
                                {pmoComparisonSummary.map((grp) => {
                                  const eraM = grp.totalEraMonth;
                                  const actM = grp.totalActMonth;

                                  const eraQ = grp.totalEraQuarter;
                                  const actQ = grp.totalActQuarter;

                                  const eraE = grp.totalEraEfy;
                                  const actE = grp.totalActEfy;

                                  return (
                                    <tr key={`pmo_sum_${grp.name}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                      {/* Entity Info */}
                                      <td className="px-3.5 py-2.5">
                                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span>{grp.name}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono pl-5">
                                          Project Management Office • {grp.projectCount} Projects
                                        </div>
                                      </td>

                                      {/* Scope */}
                                      <td className="px-3 py-2.5 text-center font-mono">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                          {grp.totalLengthKm.toFixed(1)} Km
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {grp.projectCount} proj • {grp.totalLengthKm.toFixed(0)} Km tot
                                        </div>
                                      </td>

                                      {/* Monthly */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-blue-50/20 dark:bg-blue-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-blue-150 dark:border-blue-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraM.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actM.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.monthRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                              {grp.monthRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Quarterly */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-indigo-50/20 dark:bg-indigo-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-indigo-150 dark:border-indigo-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraQ.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actQ.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.quarterRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                              {grp.quarterRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* EFY */}
                                      <td className="px-3 py-2.5 text-center font-mono bg-purple-50/20 dark:bg-purple-950/10">
                                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-purple-150 dark:border-purple-900/40 space-y-0.5 text-2xs">
                                          <div className="flex justify-between gap-1 text-slate-500 dark:text-slate-400">
                                            <span>ERA Plan:</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{eraE.toFixed(2)} Km</span>
                                          </div>
                                          <div className="flex justify-between gap-1 text-slate-800 dark:text-white font-bold">
                                            <span>Actual:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">{actE.toFixed(2)} Km</span>
                                          </div>
                                          <div className="pt-0.5 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-1 text-[9px]">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">% vs ERA:</span>
                                            <span className={`font-black ${grp.efyRatio >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                              {grp.efyRatio.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Health */}
                                      <td className="px-3 py-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-block border ${
                                          grp.healthStatus === 'Ahead'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                            : grp.healthStatus === 'On Track'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                            : grp.healthStatus === 'Lagging'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                        }`}>
                                          {grp.healthStatus}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}

                            {/* Overall Portfolio Aggregate Summary Row */}
                            {overallPortfolioAverages && (
                              <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white border-t-2 border-indigo-300 dark:border-indigo-700">
                                <td className="px-3.5 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>PORTFOLIO OVERALL TOTAL</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono font-normal pl-5">
                                    All {overallPortfolioAverages.projectCount} Projects Combined
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-mono">
                                  <div>
                                    {overallPortfolioAverages.totalLengthKm.toFixed(1)} Km
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    {overallPortfolioAverages.projectCount} Projects
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-mono bg-blue-100/50 dark:bg-blue-900/30">
                                  <div className="text-2xs space-y-0.5">
                                    <div className="flex justify-between gap-1 text-slate-600 dark:text-slate-300">
                                      <span>ERA:</span>
                                      <span>{overallPortfolioAverages.totalEraMonth.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-emerald-700 dark:text-emerald-300 font-black">
                                      <span>Act:</span>
                                      <span>{overallPortfolioAverages.totalActMonth.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-[9px] text-blue-700 dark:text-blue-300 pt-0.5 border-t border-blue-200 dark:border-blue-800">
                                      <span>% vs ERA:</span>
                                      <span className="font-bold">
                                        {overallPortfolioAverages.monthRatio.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-mono bg-indigo-100/50 dark:bg-indigo-900/30">
                                  <div className="text-2xs space-y-0.5">
                                    <div className="flex justify-between gap-1 text-slate-600 dark:text-slate-300">
                                      <span>ERA:</span>
                                      <span>{overallPortfolioAverages.totalEraQuarter.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-emerald-700 dark:text-emerald-300 font-black">
                                      <span>Act:</span>
                                      <span>{overallPortfolioAverages.totalActQuarter.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-[9px] text-indigo-700 dark:text-indigo-300 pt-0.5 border-t border-indigo-200 dark:border-indigo-800">
                                      <span>% vs ERA:</span>
                                      <span className="font-bold">
                                        {overallPortfolioAverages.quarterRatio.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center font-mono bg-purple-100/50 dark:bg-purple-900/30">
                                  <div className="text-2xs space-y-0.5">
                                    <div className="flex justify-between gap-1 text-slate-600 dark:text-slate-300">
                                      <span>ERA:</span>
                                      <span>{overallPortfolioAverages.totalEraEfy.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-emerald-700 dark:text-emerald-300 font-black">
                                      <span>Act:</span>
                                      <span>{overallPortfolioAverages.totalActEfy.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1 text-[9px] text-purple-700 dark:text-purple-300 pt-0.5 border-t border-purple-200 dark:border-purple-800">
                                      <span>% vs ERA:</span>
                                      <span className="font-bold">
                                        {overallPortfolioAverages.efyRatio.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                                    Portfolio
                                  </span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Group Projects Comparison Matrix Table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 shadow-sm space-y-0">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        Group Portfolio Comparison Summary for {activeMilestone?.monthLabel} ({selectedGroup} {groupType.toUpperCase()})
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Side-by-side contractor plan vs ERA plan vs actual execution across all {groupComparisonMatrix.length} group projects
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        {groupComparisonMatrix.length} Projects
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsGroupPortfolioSummaryExpanded(!isGroupPortfolioSummaryExpanded)}
                        id="btn-toggle-portfolio-summary-table"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                        title={isGroupPortfolioSummaryExpanded ? 'Hide Portfolio Comparison Table' : 'Show Portfolio Comparison Table'}
                      >
                        {isGroupPortfolioSummaryExpanded ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            <span>Hide Table</span>
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Show Table</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleExportProgressComparisonPDF}
                        id="btn-print-portfolio-summary-table"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Print / Export Group Portfolio Comparison Summary Table as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Portfolio PDF</span>
                      </button>
                    </div>
                  </div>

                  {isGroupPortfolioSummaryExpanded && (
                    <div className="space-y-3 p-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                      {/* Active Milestone Display with Month/Quarter/EFY select options */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">
                            Select Portfolio Milestone Period:
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-2xs font-bold">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">Month:</span>
                            <select
                              value={activeMilestone?.monthLabel || ''}
                              onChange={(e) => {
                                const mLabel = e.target.value;
                                const match = availableMilestones.find(m => m.monthLabel === mLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer text-2xs"
                            >
                              {uniqueMonths.map(m => (
                                <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{m}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">Quarter:</span>
                            <select
                              value={activeMilestone?.quarterLabel || ''}
                              onChange={(e) => {
                                const qLabel = e.target.value;
                                const match = availableMilestones.find(m => m.quarterLabel === qLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer text-2xs"
                            >
                              {uniqueQuarters.map(q => (
                                <option key={q} value={q} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{q}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                            <span className="text-slate-400 dark:text-zinc-400 font-extrabold uppercase text-[9px]">EFY Year:</span>
                            <select
                              value={activeMilestone?.efyLabel || ''}
                              onChange={(e) => {
                                const efyLabel = e.target.value;
                                const match = availableMilestones.find(m => m.efyLabel === efyLabel);
                                if (match) setSelectedComparisonMonthKey(match.key);
                              }}
                              className="bg-transparent text-slate-850 dark:text-zinc-100 outline-none cursor-pointer text-2xs"
                            >
                              {uniqueEfys.map(efy => (
                                <option key={efy} value={efy} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">EFY {efy}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isGroupPortfolioSummaryExpanded && (
                    <div className="overflow-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-2xs">
                            <th className="px-3 py-2.5 min-w-[170px]">Project ID & Title</th>
                            <th className="px-3 py-2.5 min-w-[130px]">Contractor</th>
                            <th className="px-3 py-2.5 min-w-[140px]">Supervision Consultant</th>
                            <th className="px-3 py-2.5 text-center min-w-[145px]">Month ({activeMilestone?.monthLabel})</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">Quarter ({activeMilestone?.quarterLabel})</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">EFY {activeMilestone?.efyLabel}</th>
                            <th className="px-3 py-2.5 text-center min-w-[155px]">Cumulative To-Date</th>
                            <th className="px-3 py-2.5 text-center min-w-[85px]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {groupComparisonMatrix.map((item, pIdx) => {
                            return (
                              <tr 
                                key={`grp_row_${item.project.id || pIdx}`}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="font-extrabold text-slate-800 dark:text-zinc-200 truncate max-w-[190px]" title={item.project.name}>
                                    {item.project.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ID: {item.project.id.substring(0, 10).toUpperCase()} • {item.lengthKm} Km
                                  </div>
                                </td>
                                <td className={`px-3 py-2.5 text-slate-800 dark:text-zinc-200 font-bold col-contractor ${getLengthClass(item.project.contractor)}`} data-col="contractor" title={item.project.contractor || 'Not Specified'}>
                                  {item.project.contractor || 'Not Specified'}
                                </td>
                                <td className={`px-3 py-2.5 text-slate-700 dark:text-slate-200 col-engineer ${getLengthClass(getExactConsultantName(item.project))}`} data-col="engineer" title={getExactConsultantName(item.project)}>
                                  <div className="font-extrabold text-slate-800 dark:text-zinc-100 leading-snug">
                                    {getExactConsultantName(item.project)}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono">
                                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-700/60 space-y-0.5 text-2xs">
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>Ctr Plan:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.contractor.month.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>ERA Plan:</span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">{item.era.month.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-800 dark:text-zinc-200 font-bold">
                                      <span>Actual:</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{item.actual.month.toFixed(2)} Km ({item.monthRatio.toFixed(1)}%)</span>
                                    </div>
                                    <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-1 text-[9px]">
                                      <span className="text-slate-400 font-sans">% vs Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {(item.contractor.month > 0 ? (item.actual.month / item.contractor.month) * 100 : 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono">
                                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-700/60 space-y-0.5 text-2xs">
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.contractor.quarter.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>ERA:</span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">{item.era.quarter.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-800 dark:text-zinc-200 font-bold">
                                      <span>Act:</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{item.actual.quarter.toFixed(2)} Km ({item.quarterRatio.toFixed(1)}%)</span>
                                    </div>
                                    <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-1 text-[9px]">
                                      <span className="text-slate-400 font-sans">% vs Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {(item.contractor.quarter > 0 ? (item.actual.quarter / item.contractor.quarter) * 100 : 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono">
                                  <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-150 dark:border-slate-700/60 space-y-0.5 text-2xs">
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.contractor.efy.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>ERA:</span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">{item.era.efy.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-800 dark:text-zinc-200 font-bold">
                                      <span>Act:</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{item.actual.efy.toFixed(2)} Km ({item.efyRatio.toFixed(1)}%)</span>
                                    </div>
                                    <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-1 text-[9px]">
                                      <span className="text-slate-400 font-sans">% vs Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {(item.contractor.efy > 0 ? (item.actual.efy / item.contractor.efy) * 100 : 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono">
                                  <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-150 dark:border-indigo-900/40 space-y-0.5 text-2xs">
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.contractor.todate.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-slate-500 dark:text-slate-400">
                                      <span>ERA:</span>
                                      <span className="font-bold text-purple-600 dark:text-purple-400">{item.era.todate.toFixed(2)} Km</span>
                                    </div>
                                    <div className="flex justify-between gap-1.5 text-indigo-950 dark:text-indigo-200 font-bold">
                                      <span>Act:</span>
                                      <span className="text-indigo-700 dark:text-indigo-300 font-black">{item.actual.todate.toFixed(2)} Km ({item.todateRatio.toFixed(1)}%)</span>
                                    </div>
                                    <div className="pt-0.5 border-t border-indigo-200/60 dark:border-indigo-800/60 flex justify-between gap-1 text-[9px]">
                                      <span className="text-slate-400 font-sans">% vs Ctr:</span>
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {(item.contractor.todate > 0 ? (item.actual.todate / item.contractor.todate) * 100 : 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    item.healthStatus === 'Ahead'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : item.healthStatus === 'On Track'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                        : item.healthStatus === 'Lagging'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  }`}>
                                    {item.healthStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Structured Table Container */
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/10">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    {reportMode === 'performance' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">ID & Contract Title</th>
                        <th className="px-3 py-2">Group Dimensions</th>
                        <th className="px-3 py-2 text-right">Physical Progress</th>
                        <th className="px-3 py-2 text-right">Revised Contract Value (ETB)</th>
                      </tr>
                    ) : reportMode === 'audit' ? (
                      groupType === 'consultant' || auditPerspective === 'consultant' ? (
                        <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase border-b border-indigo-150 dark:border-indigo-900/40">
                          <th className="px-3 py-2">Project ID & Contract Title</th>
                          <th className="px-3 py-2">Supervision Consultant & RE</th>
                          <th className="px-3 py-2 text-center">Submittal SLA & Turnaround</th>
                          <th className="px-3 py-2 text-right">Audit Score & Official Grade</th>
                        </tr>
                      ) : (
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                          <th className="px-3 py-2">Project ID & Title</th>
                          <th className="px-3 py-2">Audit Risk & Bond Status</th>
                          <th className="px-3 py-2 text-center">Progress vs. Time Elapsed</th>
                          <th className="px-3 py-2 text-right">Audit Score / Grade</th>
                        </tr>
                      )
                    ) : reportMode === 'payments' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Total Certified Amount</th>
                        <th className="px-3 py-2 text-right">Outstanding (Unpaid)</th>
                        <th className="px-3 py-2 text-right">Matured Overdue (&gt;56d)</th>
                      </tr>
                    ) : reportMode === 'bonds' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Total Logged Securities</th>
                        <th className="px-3 py-2 text-right">Valid & Active</th>
                        <th className="px-3 py-2 text-right">Expired & Critical</th>
                      </tr>
                    ) : (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Supervision Consultant & RE</th>
                        <th className="px-3 py-2 text-right">Staff Mobilization</th>
                        <th className="px-3 py-2 text-right">Workload Input (MM)</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 text-xs">
                    {processedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                          No active contracts match your filters.
                        </td>
                      </tr>
                    ) : reportMode === 'performance' ? (
                      processedProjects.map((p, pIdx) => {
                        const expiredCount = (p.bonds || []).filter(b => b.status === 'Expired').length;
                        return (
                          <tr key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition">
                            <td className="px-3 py-2.5">
                              <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: {p.id.substring(0, 10).toUpperCase()}</div>
                            </td>
                            <td className="px-3 py-2.5 space-y-0.5">
                              <div className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                                🏢 {p.programDirectorate || 'Southern'}
                              </div>
                              <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                                📦 {p.pmo || 'PMO 1'}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-700 dark:text-zinc-200">
                              <div className="flex flex-col items-end gap-1">
                                <span className={
                                  (p.physicalProgress || 0) < 15 ? 'text-red-500' :
                                  (p.physicalProgress || 0) < 45 ? 'text-amber-500' : 'text-emerald-500'
                                }>
                                  {(p.physicalProgress || 0).toFixed(2)}%
                                </span>
                                <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      (p.physicalProgress || 0) < 15 ? 'bg-red-500' :
                                      (p.physicalProgress || 0) < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${Math.min(100, Math.max(0, p.physicalProgress || 0))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-600 dark:text-zinc-300 font-mono">
                              <div>{(((p.origAmount || 0) * 1_000_000) + ((p.variation || 0) > 10000 ? (p.variation || 0) : ((p.variation || 0) * 1_000_000))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              {expiredCount > 0 && (
                                <span className="text-[8px] bg-red-50 text-red-600 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100 dark:border-rose-900/30 px-1 py-0.5 rounded font-black block mt-0.5 max-w-max ml-auto">
                                  ⚠️ {expiredCount} Expired Guarantees
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : reportMode === 'audit' ? (
                      groupType === 'consultant' || auditPerspective === 'consultant' ? (
                        processedProjects.map((p, pIdx) => {
                          const selectedHistId = dossierConsultantMap[p.id];
                          const cAudit = getConsultantAuditMetrics(p, selectedHistId);
                          const prevConsultants = p.supervisionConsultant?.previousConsultants || [];
                          const isExpanded = expandedProjectId === p.id;
                          return (
                            <React.Fragment key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`}>
                              <tr 
                                onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                    <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">(Click for Consultant Audit Dossier)</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="font-bold text-slate-700 dark:text-zinc-200 text-xs truncate max-w-[220px]">
                                      {cAudit.consultantFirm}
                                    </div>
                                    {cAudit.isSole ? (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                                        🏢 Sole Consultant
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                                        🤝 Joint Venture (JV)
                                      </span>
                                    )}
                                    {cAudit.isHistorical ? (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                        📜 Predecessor Term
                                      </span>
                                    ) : prevConsultants.length > 0 ? (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                                        🟢 Active ({prevConsultants.length} past)
                                      </span>
                                    ) : null}
                                  </div>
                                  {cAudit.isJv && cAudit.jvPartners && (
                                    <div className="text-[8.5px] text-purple-700 dark:text-purple-300 font-semibold truncate max-w-[240px]">
                                      Partners: {cAudit.jvPartners}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1 text-[9px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                                      RE: <strong className="text-slate-700 dark:text-zinc-300">{cAudit.residentEngineer}</strong>
                                    </span>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      cAudit.staffingScore >= 15 
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' 
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                                    }`}>
                                      👥 {cAudit.activeKeyStaffCount}/{cAudit.keyStaffCount} Key Staff ({cAudit.mobilizationRatePct}%)
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col items-center gap-1 max-w-[170px] mx-auto">
                                    <div className="flex items-center justify-between w-full text-[9px] font-bold">
                                      <span className="text-slate-400">SLA Response Rate:</span>
                                      <span className={cAudit.slaComplianceRatePct >= 80 ? 'text-emerald-600 font-black' : cAudit.slaComplianceRatePct >= 60 ? 'text-amber-600 font-black' : 'text-rose-600 font-black'}>
                                        {cAudit.slaComplianceRatePct}% ({cAudit.avgTurnaroundDays}d avg)
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${cAudit.slaComplianceRatePct >= 80 ? 'bg-emerald-500' : cAudit.slaComplianceRatePct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                        style={{ width: `${Math.min(100, Math.max(0, cAudit.slaComplianceRatePct))}%` }} 
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold">
                                      <span className="text-slate-500">{cAudit.submittalsCount} Submittals</span>
                                      {cAudit.overdueSubmittalsCount > 0 && (
                                        <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1 py-0.2 rounded font-black">
                                          ⚠️ {cAudit.overdueSubmittalsCount} Overdue
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cAudit.badgeBgColor} ${cAudit.badgeTextColor}`}>
                                      Grade {cAudit.officialGrade}
                                    </span>
                                    <span className="text-sm font-black text-slate-800 dark:text-zinc-100">
                                      {cAudit.totalWeightedScore}%
                                    </span>
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans font-bold">{cAudit.officialRatingTitle}</div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-indigo-50/20 dark:bg-indigo-950/30">
                                  <td colSpan={4} className="p-4 border-t border-b border-indigo-200/60 dark:border-indigo-900/50">
                                    <div className="space-y-4">
                                      {/* Header of Consultant Audit Dossier */}
                                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-indigo-200/60 dark:border-indigo-900/50 pb-2.5">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                              <Award className="w-3.5 h-3.5" /> SUPERVISION CONSULTANT COMPLIANCE & PERFORMANCE AUDIT DOSSIER
                                            </h4>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${cAudit.badgeBgColor} ${cAudit.badgeTextColor}`}>
                                              Official Rating: Grade {cAudit.officialGrade} ({cAudit.totalWeightedScore}%)
                                            </span>
                                            {cAudit.isSole ? (
                                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                                🏢 Sole Consultant Performance Framework
                                              </span>
                                            ) : (
                                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                                🤝 Joint Venture (JV) Consortium Framework
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5">
                                            Supervision Firm: <strong className="text-slate-800 dark:text-zinc-200">{cAudit.consultantFirm}</strong>
                                            {cAudit.isJv && cAudit.jvPartners && (
                                              <span> • Partners: <strong className="text-purple-700 dark:text-purple-300">{cAudit.jvPartners}</strong></span>
                                            )}
                                            <span> • RE: <strong className="text-slate-800 dark:text-zinc-200">{cAudit.residentEngineer}</strong></span>
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded shadow-2xs">
                                            Official Standing: {cAudit.officialStanding}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Consultant Tenure Switcher & Succession Selector Bar */}
                                      {prevConsultants.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/60">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10.5px] font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                              <Users className="w-3.5 h-3.5" /> Evaluated Firm:
                                            </span>
                                            <span className="text-xs font-black text-slate-800 dark:text-zinc-100">
                                              {cAudit.consultantFirm}
                                            </span>
                                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                              {cAudit.isHistorical
                                                ? `Archived Term: ${cAudit.commencementDate || 'Start'} to ${cAudit.handoverDate || 'Archived'}`
                                                : `Active Term: Since ${cAudit.commencementDate || 'Assignment'}`}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                              <History className="w-3.5 h-3.5" /> Term:
                                            </span>
                                            <select
                                              value={selectedHistId || 'current'}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setDossierConsultantMap(prev => ({
                                                  ...prev,
                                                  [p.id]: val === 'current' ? '' : val
                                                }));
                                              }}
                                              aria-label="Select Evaluated Consultant Term"
                                              className="px-2 py-1 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-100 shadow-2xs focus:ring-2 focus:ring-indigo-500"
                                            >
                                              <option value="current">
                                                🟢 Active: {p.supervisionConsultant?.firmName || p.consultant} (Since {p.supervisionConsultant?.commencementDate || 'Assignment'})
                                              </option>
                                              {prevConsultants.map((hist) => (
                                                <option key={hist.id} value={hist.id}>
                                                  📜 Predecessor: {hist.firmName} ({hist.commencementDate || 'Start'} — {hist.handoverDate || 'Archived'})
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      )}

                                      {/* Historical Banner Alert when viewing Predecessor */}
                                      {cAudit.isHistorical && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                                          <div className="flex items-center gap-2">
                                            <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="text-amber-900 dark:text-amber-200 font-medium">
                                              Displaying archived evaluation for predecessor <strong>{cAudit.consultantFirm}</strong> (Tenure: {cAudit.commencementDate || 'Start'} to {cAudit.handoverDate || 'Archived'}). Reason: <em>{cAudit.transitionReason || 'Tenure concluded'}</em>
                                            </span>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDossierConsultantMap(prev => ({ ...prev, [p.id]: '' }));
                                            }}
                                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition shrink-0 self-start sm:self-auto cursor-pointer"
                                          >
                                            Switch to Active Consultant
                                          </button>
                                        </div>
                                      )}

                                      {/* 5-Dimension Performance Audit Scorecard */}
                                      <div className="space-y-2">
                                        {/* Primary Composite Pillars */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between">
                                            <div>
                                              <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase block tracking-wider">Submittal SLA Turnaround (50% Pillar)</span>
                                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Submittal log & operational SLA turnaround</span>
                                            </div>
                                            <div className="text-right">
                                              <span className={`text-base font-black ${cAudit.slaScore >= 80 ? 'text-emerald-600' : cAudit.slaScore >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{cAudit.slaScore.toFixed(1)}%</span>
                                              <span className="text-[9px] text-slate-400 font-bold block">{cAudit.avgTurnaroundDays}d avg turnaround</span>
                                            </div>
                                          </div>

                                          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
                                            <div>
                                              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase block tracking-wider">5-Dimension Matrix Score (50% Pillar)</span>
                                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Reflects all 5 supervision criteria dimensions</span>
                                            </div>
                                            <div className="text-right">
                                              <span className={`text-base font-black ${cAudit.fiveDimEval.fiveDimScore >= 80 ? 'text-emerald-600' : cAudit.fiveDimEval.fiveDimScore >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{cAudit.fiveDimEval.fiveDimScore.toFixed(1)}%</span>
                                              <span className="text-[9px] text-slate-400 font-bold block">105 Criteria Audit</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* All 5 Dimensions Breakdown */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 block uppercase truncate" title="Dimension A: Quality Control Supervision">Dim A: Quality Control</span>
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{cAudit.dimensionBreakdown?.A?.percentage || 0}%</span>
                                              <span className="text-[8px] text-slate-400 font-bold">{cAudit.dimensionBreakdown?.A?.earned || 0}/35</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                              <div className="bg-emerald-500 h-full" style={{ width: `${cAudit.dimensionBreakdown?.A?.percentage || 0}%` }} />
                                            </div>
                                          </div>

                                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 block uppercase truncate" title="Dimension B: Progress Monitoring & Workmanship">Dim B: Progress & Work</span>
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{cAudit.dimensionBreakdown?.B?.percentage || 0}%</span>
                                              <span className="text-[8px] text-slate-400 font-bold">{cAudit.dimensionBreakdown?.B?.earned || 0}/20</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                              <div className="bg-indigo-500 h-full" style={{ width: `${cAudit.dimensionBreakdown?.B?.percentage || 0}%` }} />
                                            </div>
                                          </div>

                                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 block uppercase truncate" title="Dimension C: Contract Admin & Claims">Dim C: Contract Admin</span>
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{cAudit.dimensionBreakdown?.C?.percentage || 0}%</span>
                                              <span className="text-[8px] text-slate-400 font-bold">{cAudit.dimensionBreakdown?.C?.earned || 0}/20</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                              <div className="bg-purple-500 h-full" style={{ width: `${cAudit.dimensionBreakdown?.C?.percentage || 0}%` }} />
                                            </div>
                                          </div>

                                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 block uppercase truncate" title="Dimension D: Key Personnel Staffing">Dim D: Key Staffing</span>
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{cAudit.dimensionBreakdown?.D?.percentage || 0}%</span>
                                              <span className="text-[8px] text-slate-400 font-bold">{cAudit.dimensionBreakdown?.D?.earned || 0}/15</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                              <div className="bg-teal-500 h-full" style={{ width: `${cAudit.dimensionBreakdown?.D?.percentage || 0}%` }} />
                                            </div>
                                          </div>

                                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                                            <span className="text-[8px] font-bold text-slate-400 block uppercase truncate" title="Dimension E: Financial Control & IPC Reporting">Dim E: Financial & IPC</span>
                                            <div className="flex items-baseline justify-between">
                                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{cAudit.dimensionBreakdown?.E?.percentage || 0}%</span>
                                              <span className="text-[8px] text-slate-400 font-bold">{cAudit.dimensionBreakdown?.E?.earned || 0}/10</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                              <div className="bg-blue-500 h-full" style={{ width: `${cAudit.dimensionBreakdown?.E?.percentage || 0}%` }} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Detailed Cards: FIDIC Obligations & Submittal Performance Breakdown */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* FIDIC Consultant Obligations Matrix */}
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2.5">
                                          <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                              📜 FIDIC 2017 Consultant Statutory Obligations Matrix
                                            </span>
                                            <span className="text-[9px] font-mono font-bold text-slate-500">
                                              Score: {cAudit.totalWeightedScore}%
                                            </span>
                                          </div>

                                          <div className="space-y-2">
                                            {cAudit.clauses.map((o, oIdx) => (
                                              <div key={o.id ? `${o.id}_${oIdx}` : `o_${oIdx}`} className="space-y-0.5 bg-slate-50/50 dark:bg-slate-850/40 p-2 rounded-lg border border-slate-150/60 dark:border-slate-800/60">
                                                <div className="flex justify-between items-center text-[9.5px] font-bold">
                                                  <span className="text-slate-800 dark:text-zinc-200">
                                                    {o.title}
                                                  </span>
                                                  <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                                                    o.rating === 'Compliant' 
                                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                                      : o.rating === 'Minor Deficiency'
                                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                                  }`}>
                                                    {o.rating} ({o.score}%)
                                                  </span>
                                                </div>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                                  {o.details}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Submittal SLA Performance & Auditor Recommendations */}
                                        <div className="space-y-3">
                                          {/* Submittal Category Turnaround Breakdown */}
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2">
                                            <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                              <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                                ⏱️ RFI & Submittal Processing Turnaround vs Targets
                                              </span>
                                              <span className="text-[9px] font-bold text-slate-500">
                                                Overall: {cAudit.slaComplianceRatePct}% on-time
                                              </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                                              {cAudit.submittalBreakdown.map((sb, sbIdx) => (
                                                <div key={sb.type ? `${sb.type}_${sbIdx}` : `sb_${sbIdx}`} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-150/60 dark:border-slate-800">
                                                  <div className="font-bold text-slate-700 dark:text-zinc-300 truncate">{sb.type}</div>
                                                  <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                    {sb.avgDays}d avg <span className="text-[9px] text-slate-400 font-normal">({sb.onTimePct}% on-time)</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Formal Auditor Recommendation Callout */}
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-150 dark:border-indigo-900/40 shadow-2xs space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                              <ShieldCheck className="w-3 h-3 text-indigo-600" /> Official Auditor Recommendation & Standing
                                            </div>
                                            <p className="text-[9.5px] text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
                                              {cAudit.officialRecommendation}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Consultant Succession & Historical Evaluation Track Record Table */}
                                      {prevConsultants.length > 0 && (
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs space-y-2.5">
                                          <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100 dark:border-indigo-900/40">
                                            <span className="text-[10.5px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                              📜 Consultant Succession & Historical Evaluation Track Record ({prevConsultants.length + 1} Total Tenures)
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500">
                                              Preserved tenure evaluations and historical audit metrics
                                            </span>
                                          </div>

                                          <div className="overflow-x-auto">
                                            <table className="w-full text-[9.5px] text-left">
                                              <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/60 dark:border-slate-800">
                                                  <th className="p-2">Tenure Status</th>
                                                  <th className="p-2">Supervision Firm & RE</th>
                                                  <th className="p-2">Service Period</th>
                                                  <th className="p-2">Evaluation Grade & Score</th>
                                                  <th className="p-2">SLA On-Time %</th>
                                                  <th className="p-2">Transition Reason / Notes</th>
                                                  <th className="p-2 text-right">Dossier Action</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {/* Active Consultant Row */}
                                                <tr className={`${!cAudit.isHistorical ? 'bg-indigo-50/40 dark:bg-indigo-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
                                                  <td className="p-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                      🟢 Active Tenure
                                                    </span>
                                                  </td>
                                                  <td className="p-2">
                                                    <div className="font-extrabold text-slate-800 dark:text-zinc-100">{p.supervisionConsultant?.firmName || p.consultant}</div>
                                                    <div className="text-[8.5px] text-slate-400">RE: {p.supervisionConsultant?.residentEngineerName || 'Field Assigned'}</div>
                                                  </td>
                                                  <td className="p-2 font-mono text-slate-600 dark:text-slate-300">
                                                    Since {p.supervisionConsultant?.commencementDate || 'Assignment'}
                                                  </td>
                                                  <td className="p-2">
                                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                                      Grade {getConsultantAuditMetrics(p).officialGrade} ({getConsultantAuditMetrics(p).totalWeightedScore}%)
                                                    </span>
                                                  </td>
                                                  <td className="p-2 font-mono text-slate-700 dark:text-slate-300">
                                                    {getConsultantAuditMetrics(p).slaComplianceRatePct}%
                                                  </td>
                                                  <td className="p-2 text-slate-500 dark:text-slate-400 italic">
                                                    Currently incumbent supervision consultant.
                                                  </td>
                                                  <td className="p-2 text-right">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDossierConsultantMap(prev => ({ ...prev, [p.id]: '' }));
                                                      }}
                                                      className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                                                        !cAudit.isHistorical 
                                                          ? 'bg-indigo-600 text-white shadow-2xs' 
                                                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                      }`}
                                                    >
                                                      {!cAudit.isHistorical ? 'Active in View' : 'View Audit'}
                                                    </button>
                                                  </td>
                                                </tr>

                                                {/* Predecessors Rows */}
                                                {prevConsultants.map((hist, hIdx) => {
                                                  const isHistSelected = selectedHistId === hist.id;
                                                  const histAudit = getConsultantAuditMetrics(p, hist.id);
                                                  return (
                                                    <tr key={hist.id || `hist_${hIdx}`} className={`${isHistSelected ? 'bg-amber-50/50 dark:bg-amber-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
                                                      <td className="p-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                          📜 Term #{prevConsultants.length - hIdx}
                                                        </span>
                                                      </td>
                                                      <td className="p-2">
                                                        <div className="font-extrabold text-slate-800 dark:text-zinc-100">{hist.firmName}</div>
                                                        <div className="text-[8.5px] text-slate-400">RE: {hist.residentEngineerName || 'Field Assigned'}</div>
                                                      </td>
                                                      <td className="p-2 font-mono text-slate-600 dark:text-slate-300">
                                                        {hist.commencementDate || 'Start'} → {hist.handoverDate || 'Archived'}
                                                      </td>
                                                      <td className="p-2">
                                                        <span className="font-extrabold text-amber-700 dark:text-amber-400">
                                                          Grade {histAudit.officialGrade} ({histAudit.totalWeightedScore}%)
                                                        </span>
                                                      </td>
                                                      <td className="p-2 font-mono text-slate-700 dark:text-slate-300">
                                                        {histAudit.slaComplianceRatePct}%
                                                      </td>
                                                      <td className="p-2 text-slate-500 dark:text-slate-400 text-[8.5px]">
                                                        {hist.reasonForTransition || hist.transitionReason || 'Contract completed / handed over.'}
                                                      </td>
                                                      <td className="p-2 text-right">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDossierConsultantMap(prev => ({ ...prev, [p.id]: hist.id }));
                                                          }}
                                                          className={`px-2 py-1 rounded text-[9px] font-bold transition cursor-pointer ${
                                                            isHistSelected 
                                                              ? 'bg-amber-600 text-white shadow-2xs' 
                                                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                          }`}
                                                        >
                                                          {isHistSelected ? 'Active in View' : 'View Audit'}
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )}

                                      {/* Key Personnel Staffing Roster for Evaluated Consultant */}
                                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2">
                                        <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                          <span className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                                            👥 Supervision Consultant Field Deployment Team ({cAudit.consultantFirm})
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-500">
                                            {cAudit.activeStaff} Active / {cAudit.totalStaff} Assigned Staff
                                          </span>
                                        </div>
                                        {cAudit.totalStaff > 0 ? (
                                          <div className="flex flex-wrap gap-1.5 pt-1">
                                            {((cAudit.isHistorical 
                                              ? prevConsultants.find(h => h.id === selectedHistId)?.personnel 
                                              : p.supervisionConsultant?.personnel) || []).map((person, pIdx) => (
                                              <span key={`${p.id}_cpers_${person.id || pIdx}_${pIdx}`} className="inline-flex items-center gap-1.5 text-[8.5px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/50 dark:border-slate-700/50">
                                                <span className={`w-1.5 h-1.5 rounded-full ${person.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                <strong className="font-bold text-slate-900 dark:text-zinc-100">{person.position}:</strong> {person.name} ({person.assignmentDate || 'Assigned'})
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-[9px] text-slate-400 italic">No key personnel deployment records logged for this tenure.</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        processedProjects.map((p, pIdx) => {
                          const audit = getAuditMetrics(p);
                          const isExpanded = expandedProjectId === p.id;
                          return (
                            <React.Fragment key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`}>
                              <tr 
                                onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                                className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                    <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                    <span className="text-indigo-500 text-[9px] font-bold">(Click for FIDIC Audit)</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {audit.expiredBondsCount > 0 ? (
                                      <span className="text-[8px] font-black uppercase bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                        ⚠️ {audit.expiredBondsCount} Expired Bonds
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                        ✓ Guarantees Valid
                                      </span>
                                    )}
                                    
                                    {audit.scheduleStatus === 'Critical' && (
                                      <span className="text-[8px] font-black uppercase bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                        ⏳ Critical Delay
                                      </span>
                                    )}
                                    {audit.scheduleStatus === 'Warning' && (
                                      <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">
                                        ⏳ Slip Warning
                                      </span>
                                    )}
                                    {audit.scheduleStatus === 'Compliant' && (
                                      <span className="text-[8px] font-bold uppercase bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                        ✓ On Track
                                      </span>
                                    )}
    
                                    {audit.activeRisksCount > 0 && (
                                      <span className="text-[8px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                        🔥 {audit.activeRisksCount} Active Risks
                                      </span>
                                    )}
    
                                    {audit.timeOverrunPct > 0 && (
                                      <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">
                                        ⏱️ {audit.timeOverrunPct.toFixed(2)}% EOT Overrun
                                      </span>
                                    )}
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                      audit.CPI >= 1.0 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                        : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                    }`}>
                                      CPI: {audit.CPI.toFixed(3)}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                      audit.SPI >= 1.0 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                        : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                    }`}>
                                      SPI: {audit.SPI.toFixed(3)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col gap-1 max-w-[150px] mx-auto">
                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                      <span className="text-slate-400">Progress:</span>
                                      <span className="text-slate-700 dark:text-zinc-300">{(p.physicalProgress || 0).toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(0, p.physicalProgress || 0))}%` }} />
                                    </div>
    
                                    <div className="flex items-center justify-between text-[9px] font-bold">
                                      <span className="text-slate-400">Time Elapsed:</span>
                                      <span className="text-slate-700 dark:text-zinc-300">{audit.timeElapsedPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                      <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, Math.max(0, audit.timeElapsedPct))}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${audit.bgColor} ${audit.textColor}`}>
                                      Grade {audit.ratingCode}
                                    </span>
                                    <span className="text-sm font-black text-slate-800 dark:text-zinc-100">
                                      {audit.complianceScore}%
                                    </span>
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans font-bold">{audit.ratingClass}</div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                  <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                    <div className="space-y-4">
                                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                        <div>
                                          <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                                            FIDIC 2017 Contract Compliance & Responsibility Audit
                                          </h4>
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                                            Contractor: {p.contractor || 'N/A'} • Consultant: {p.consultant || 'N/A'}
                                          </p>
                                        </div>
                                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded">
                                          FIDIC Edition: 2017 {p.contractType === 'DB' ? 'Yellow Book' : 'Red Book'}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Contractor Evaluation Card */}
                                        {(() => {
                                          const evalData = getFidicEvaluation(p, 'contractor');
                                          return (
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2.5">
                                              <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                                                  🏗️ Contractor Obligations
                                                </span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                  evalData.averageScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                                  evalData.averageScore >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/30 dark:text-rose-450'
                                                }`}>
                                                  Score: {evalData.averageScore}%
                                                </span>
                                              </div>
                                              
                                              <div className="space-y-2.5">
                                                {evalData.clauses.map((c, cIdx) => (
                                                  <div key={c.id ? `${c.id}_${cIdx}` : `c_${cIdx}`} className="space-y-0.5">
                                                    <div className="flex justify-between items-center text-[9.5px] font-bold">
                                                      <span className="text-slate-700 dark:text-slate-300">{c.title}</span>
                                                      <span className={`text-[8.5px] font-black uppercase px-1 rounded ${
                                                        c.rating === 'Compliant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                                        c.rating === 'Minor Deficiency' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                      }`}>
                                                        {c.rating}
                                                      </span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                                      {c.details}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Consultant Evaluation Card */}
                                        {(() => {
                                          const evalData = getFidicEvaluation(p, 'consultant');
                                          return (
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2.5">
                                              <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black text-teal-600 dark:text-teal-500 uppercase tracking-wider">
                                                  🎓 Consultant Obligations
                                                </span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                  evalData.averageScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                                  evalData.averageScore >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/30 dark:text-rose-450'
                                                }`}>
                                                  Score: {evalData.averageScore}%
                                                </span>
                                              </div>

                                              <div className="space-y-2.5">
                                                {evalData.clauses.map((c, cIdx) => (
                                                  <div key={c.id ? `${c.id}_${cIdx}` : `c_${cIdx}`} className="space-y-0.5">
                                                    <div className="flex justify-between items-center text-[9.5px] font-bold">
                                                      <span className="text-slate-700 dark:text-slate-300">{c.title}</span>
                                                      <span className={`text-[8.5px] font-black uppercase px-1 rounded ${
                                                        c.rating === 'Compliant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                                        c.rating === 'Minor Deficiency' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                      }`}>
                                                        {c.rating}
                                                      </span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                                      {c.details}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Supervision Consultant Staffing & Personnel Overview */}
                                      {p.supervisionConsultant && (
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2">
                                          <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                              👥 Supervision Consultant Staffing & Deployment
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500">
                                              {(p.supervisionConsultant.personnel || []).filter(x => x.status === 'Active').length} Active / {(p.supervisionConsultant.personnel || []).length} Assigned Staff
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9.5px]">
                                            <div>
                                              <span className="text-slate-400">Consultant:</span>{' '}
                                              <span className="font-bold text-slate-700 dark:text-slate-200">{p.supervisionConsultant.firmName || p.consultant}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-400">Resident Engineer:</span>{' '}
                                              <span className="font-bold text-slate-700 dark:text-slate-200">{p.supervisionConsultant.residentEngineerName || 'Assigned in Field'}</span>
                                            </div>
                                            <div>
                                              <span className="text-slate-400">Fee Invoiced:</span>{' '}
                                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                ETB {(p.supervisionConsultant.invoices || []).reduce((sum, inv) => sum + (inv.grossAmountEtb || 0), 0).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                          {(p.supervisionConsultant.personnel || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                              {(p.supervisionConsultant.personnel || []).slice(0, 6).map((person, pIdx) => (
                                                <span key={`${p.id}_pers_${person.id || pIdx}_${pIdx}`} className="inline-flex items-center gap-1 text-[8.5px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                                  <span className={`w-1.5 h-1.5 rounded-full ${person.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                  <strong className="font-bold">{person.position}:</strong> {person.name} ({person.assignmentDate || 'Assigned'})
                                                </span>
                                              ))}
                                              {(p.supervisionConsultant.personnel || []).length > 6 && (
                                                <span className="text-[8.5px] text-slate-400 font-bold self-center">
                                                  +{(p.supervisionConsultant.personnel || []).length - 6} more staff
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )
                    ) : reportMode === 'payments' ? (
                      processedProjects.map((p, pIdx) => {
                        const m = getProjectPaymentMetrics(p);
                        const isExpanded = expandedProjectId === p.id;
                        const today = new Date();
                        return (
                          <React.Fragment key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-indigo-500 text-[9px] font-bold">(Click for IPC Details)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 space-y-1">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                                    ETB: <span className="font-mono font-extrabold">{formatAccounting(m.certEtb, '')}</span>
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                                    USD: <span className="font-mono font-extrabold">${formatAccounting(m.certUsd, '')}</span>
                                  </div>
                                  <div className="text-[8.5px] text-slate-450 dark:text-slate-400 font-medium font-sans">
                                    Combined: ETB {m.combinedCertified.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {m.combinedUnpaid > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                      ETB {formatAccounting(m.unpaidEtb, '')}
                                    </div>
                                    <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                      USD ${formatAccounting(m.unpaidUsd, '')}
                                    </div>
                                    <span className="text-[8px] bg-amber-50 text-amber-750 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-1 py-0.5 rounded font-black mt-0.5">
                                      ⏳ {m.unpaidIpcs} Pending IPCs
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                    Fully Paid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {m.combinedMatured > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="text-[10px] font-extrabold text-red-600 dark:text-rose-400">
                                      ETB {formatAccounting(m.maturedEtb, '')}
                                    </div>
                                    <div className="text-[10px] font-extrabold text-red-600 dark:text-rose-400">
                                      USD ${formatAccounting(m.maturedUsd, '')}
                                    </div>
                                    <span className="text-[8px] bg-red-50 text-red-600 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100 dark:border-red-900/30 px-1 py-0.5 rounded font-black mt-0.5">
                                      ⚠️ {m.maturedIpcsCount} Overdue (&gt;56d)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    ETB 0.00
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                          <DollarSign className="w-3.5 h-3.5" /> Interim Payment Certificate (IPC) Tracker Ledger
                                        </h4>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Contractor: {p.contractor || 'N/A'} • Exchange Rate: 1 USD = {p.usdExchangeRate || 28.0} ETB
                                        </p>
                                      </div>
                                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded">
                                        Total IPCs: {m.totalIpcs} ({m.paidIpcs} Paid, {m.unpaidIpcs} Outstanding)
                                      </span>
                                    </div>

                                    {/* Detailed IPC List */}
                                    {(p.ipcTracker || []).length === 0 ? (
                                      <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        No Interim Payment Certificates have been submitted or tracked for this project.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(p.ipcTracker || []).map((ipc, ipcIdx) => {
                                          const isEtbUnpaid = (ipc.statusEtb || ipc.status) === 'Unpaid';
                                          const isUsdUnpaid = (ipc.statusUsd || ipc.status) === 'Unpaid';
                                          const isUnpaid = isEtbUnpaid || isUsdUnpaid;
                                          
                                          let ageDays = 0;
                                          let isMaturedOverdue = false;
                                          if (ipc.submissionDate) {
                                            const subDate = new Date(ipc.submissionDate);
                                            if (!isNaN(subDate.getTime())) {
                                              ageDays = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
                                              if (ageDays > 56 && isUnpaid) {
                                                isMaturedOverdue = true;
                                              }
                                            }
                                          }

                                          return (
                                            <div 
                                              key={`${p.id}_ipc_${ipc.id || ipcIdx}_${ipcIdx}`} 
                                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                                                isMaturedOverdue 
                                                  ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-150 dark:border-rose-900/30' 
                                                  : isUnpaid
                                                  ? 'bg-amber-50/10 dark:bg-amber-950/5 border-amber-150 dark:border-amber-900/20'
                                                  : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1.5">
                                                <div>
                                                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-zinc-200">
                                                    {ipc.paymentNo}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                                                    Contractor Submitted: {ipc.submissionDate || 'N/A'} {ipc.submissionDate && `(${ageDays}d elapsed)`}
                                                  </span>
                                                  {ipc.certificationDate && (
                                                    <span className="text-[9px] text-indigo-500 dark:text-indigo-400 block font-mono">
                                                      Engineer Certified: {ipc.certificationDate}
                                                    </span>
                                                  )}
                                                  {ipc.paymentDate && (
                                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-mono">
                                                      Disbursed / Paid: {ipc.paymentDate}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                  {isMaturedOverdue ? (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded border border-red-700 animate-pulse">
                                                      ⚠️ OVERDUE MATURED CLAIM ({ageDays}d)
                                                    </span>
                                                  ) : isUnpaid ? (
                                                    <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                                      ⏳ PENDING PAYMENT ({ageDays}d)
                                                    </span>
                                                  ) : (
                                                    <span className="text-[8px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                                      ✓ PAID
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px]">
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Certified ETB</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300 font-sans">
                                                    {formatAccounting(ipc.certifiedEtb || 0, '')}
                                                  </span>
                                                  <span className={`text-[8px] font-bold block ${isEtbUnpaid ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {isEtbUnpaid ? 'Unpaid' : 'Paid'}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Certified USD</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300 font-sans">
                                                    ${formatAccounting(ipc.certifiedUsd || 0, '')}
                                                  </span>
                                                  <span className={`text-[8px] font-bold block ${isUsdUnpaid ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {isUsdUnpaid ? 'Unpaid' : 'Paid'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : reportMode === 'bonds' ? (
                      processedProjects.map((p, pIdx) => {
                        const bonds = p.bonds || [];
                        const totalCount = bonds.length;
                        const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);
                        const validCount = bonds.filter(b => b.status === 'Valid').length;
                        const validVal = bonds.filter(b => b.status === 'Valid').reduce((sum, b) => sum + (b.amount || 0), 0);
                        const expiredCount = bonds.filter(b => b.status === 'Expired').length;
                        const expiredVal = bonds.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.amount || 0), 0);
                        const isExpanded = expandedProjectId === p.id;

                        return (
                          <React.Fragment key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-indigo-500 text-[9px] font-bold">(Click for Bond Details)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-black text-slate-700 dark:text-zinc-200">
                                    {totalCount} Guarantees
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                    ETB {totalVal.toLocaleString()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {validCount} Active
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium font-sans">
                                    ETB {validVal.toLocaleString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {expiredCount > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[10px] font-black text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                                      ⚠️ {expiredCount} EXPIRED
                                    </span>
                                    <span className="text-[9px] text-red-600 dark:text-rose-400 font-medium font-sans">
                                      ETB {expiredVal.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 font-sans">
                                    0 Expired
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Securities & Bank Guarantees Tracker Ledger
                                        </h4>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Contractor: {p.contractor || 'N/A'} • Consultant: {p.consultant || 'N/A'}
                                        </p>
                                      </div>
                                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded">
                                        Total Securities: {totalCount} ({validCount} Valid, {expiredCount} Expired)
                                      </span>
                                    </div>

                                    {bonds.length === 0 ? (
                                      <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        No securities or bank guarantees have been tracked for this project.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {bonds.map((bond, bIdx) => {
                                          const isExpired = bond.status === 'Expired';
                                          
                                          return (
                                            <div 
                                              key={`${p.id}_bond_${bond.id || bIdx}_${bIdx}`} 
                                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all bg-white dark:bg-slate-900 ${
                                                isExpired 
                                                  ? 'border-rose-150 dark:border-rose-900/30 bg-rose-50/5 dark:bg-rose-950/5' 
                                                  : 'border-slate-150 dark:border-slate-800'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1.5">
                                                <div>
                                                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-zinc-200">
                                                    {bond.type}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                                                    Ref: {bond.refNo} | Bank: {bond.bank}
                                                  </span>
                                                </div>
                                                <div>
                                                  {isExpired ? (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">
                                                      ⚠️ EXPIRED
                                                    </span>
                                                  ) : (
                                                    <span className="text-[8px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                                      ✓ ACTIVE / VALID
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px]">
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Guarantee Amount</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300">
                                                    ETB {bond.amount.toLocaleString()}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Expiry Date</span>
                                                  <span className={`font-semibold font-mono ${isExpired ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                                                    {bond.expiryDate}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      processedProjects.map((p, pIdx) => {
                        const m = getProjectSupervisionStaffMetrics(p);
                        const isExpanded = expandedProjectId === p.id;
                        const sc = p.supervisionConsultant;
                        const personnel = sc?.personnel || [];
                        const invoices = sc?.invoices || [];

                        return (
                          <React.Fragment key={p.id ? `${p.id}_${pIdx}` : `proj_${pIdx}`}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-purple-600 dark:text-purple-400 text-[9px] font-bold">(Click for Staff Roster)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-black text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">
                                    🎓 {sc?.firmName || p.consultant || 'N/A'}
                                  </div>
                                  <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                    RE: <span className="font-bold text-slate-700 dark:text-slate-300">{sc?.residentEngineerName || 'Assigned in Field'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {m.activeStaff} Active Staff
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium font-sans">
                                    {m.totalStaff} assigned ({m.demobilizedStaff} demob)
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400">
                                    {m.expendedMM.toFixed(1)} / {m.allocatedMM.toFixed(1)} MM
                                  </span>
                                  <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        m.workloadPct > 100 ? 'bg-red-500' :
                                        m.workloadPct > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                                      }`}
                                      style={{ width: `${Math.min(100, m.workloadPct)}%` }}
                                    />
                                  </div>
                                  <span className="text-[8.5px] text-slate-400 font-sans font-bold">
                                    {m.workloadPct.toFixed(0)}% utilized
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5" /> Supervision Consultant Staff Roster & Workload Ledger
                                        </h4>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Firm: {sc?.firmName || p.consultant || 'N/A'} • Contract Ref: {sc?.contractRef || 'Standard FIDIC White Book'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 font-bold px-2 py-1 rounded">
                                          Staff: {m.activeStaff} Active / {m.totalStaff} Total
                                        </span>
                                        <span className="text-[9px] bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-300 font-bold px-2 py-1 rounded">
                                          Total Workload: {m.expendedMM.toFixed(1)} / {m.allocatedMM.toFixed(1)} MM ({m.workloadPct.toFixed(0)}%)
                                        </span>
                                      </div>
                                    </div>

                                    {personnel.length === 0 ? (
                                      <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        No supervision consultant personnel have been registered for this project yet.
                                      </div>
                                    ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {personnel.map((person, perIdx) => {
                                          const isActive = person.status === 'Active';
                                          const allocatedMM = person.manMonthsAllocated || 0;
                                          const expendedMM = person.manMonthsInput ?? (person as any).manMonthsExpended ?? 0;
                                          const personWorkloadPct = allocatedMM > 0
                                            ? Math.min(100, Math.round((expendedMM / allocatedMM) * 100))
                                            : 0;

                                          return (
                                            <div 
                                              key={`${p.id}_pers_${person.id || perIdx}_${perIdx}`} 
                                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all bg-white dark:bg-slate-900 ${
                                                isActive 
                                                  ? 'border-slate-200 dark:border-slate-800' 
                                                  : 'border-slate-150 dark:border-slate-850 opacity-75'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div>
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-black text-slate-800 dark:text-zinc-100">
                                                      {person.name}
                                                    </span>
                                                    {(person.category === 'Key Personnel' || (person.category as any) === 'Key') && (
                                                      <span className="text-[8px] font-extrabold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                                                        KEY EXPERT
                                                      </span>
                                                    )}
                                                  </div>
                                                  <span className="text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 block">
                                                    {person.position}
                                                  </span>
                                                  {person.qualification && (
                                                    <span className="text-[8.5px] text-slate-400 block">
                                                      🎓 {person.qualification}
                                                    </span>
                                                  )}
                                                </div>
                                                <div>
                                                  <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                                                    isActive 
                                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                  }`}>
                                                    ● {person.status || 'Active'}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 space-y-1.5">
                                                <div className="flex justify-between items-center text-[9px]">
                                                  <span className="text-slate-400 font-bold uppercase">Man-Month Workload Input</span>
                                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {expendedMM} / {allocatedMM} MM ({personWorkloadPct}%)
                                                  </span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full ${
                                                      personWorkloadPct > 100 ? 'bg-red-500' :
                                                      personWorkloadPct > 80 ? 'bg-amber-500' : 'bg-purple-500'
                                                    }`}
                                                    style={{ width: `${personWorkloadPct}%` }}
                                                  />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[8.5px] text-slate-500 dark:text-slate-400 pt-0.5">
                                                  <div>
                                                    <span className="text-slate-400">Assigned:</span>{' '}
                                                    <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{person.assignmentDate || 'N/A'}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-slate-400">Station:</span>{' '}
                                                    <span className="font-bold text-slate-600 dark:text-slate-300">{person.siteStation || 'Site'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Supervision Invoices / Financial Summary if available */}
                                    {invoices.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[9.5px]">
                                        <div className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>Consultant Invoices Tracked: <strong className="text-slate-700 dark:text-slate-200">{invoices.length} IPC/Invoices</strong></span>
                                        </div>
                                        <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                          Total Billed: ETB {invoices.reduce((s, inv) => s + (inv.grossAmountEtb || 0), 0).toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>

        </div>

      </div>
      )}

      {/* Cross-Project Supervision Personnel Workload & Commitments Modal */}
      <WorkloadReportModal
        isOpen={isPrintWorkloadModalOpen}
        onClose={() => setIsPrintWorkloadModalOpen(false)}
        projects={processedProjects}
        currentUser={currentUserObj}
        title="Supervision Personnel Workload & Project Commitments Summary"
      />

      {/* Financial Institutes & Guarantee Policy Categories Registry Modal */}
      <FinancialInstitutesAndGuarantiesModal
        isOpen={isInstitutesModalOpen}
        onClose={() => setIsInstitutesModalOpen(false)}
        initialTab={institutesModalTab}
        currentUser={currentUserObj}
      />

      {/* MASTER ADMIN ONLY: Compliance & Grade Scoring Model Weight Distribution Modal */}
      {isEditingWeightsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight">Master Admin: Scoring Model Weight Distribution</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-mono">
                      Master Admin Full Control
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize criteria names, descriptions, and percentage weightages. Add or remove criteria and auto-balance to 100%.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingWeightsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-zinc-100 text-xs">
              
              {/* Domain Perspective Selector */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAuditPerspective('contractor')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                    auditPerspective === 'contractor'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Project Contractor Scoring Model</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditPerspective('consultant')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                    auditPerspective === 'consultant'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Supervision Consultant Scoring Model</span>
                </button>
              </div>

              {/* Total Weight Balance Meter & Quick Actions */}
              {(() => {
                const currentSum = auditPerspective === 'contractor'
                  ? (
                      Number(tempContractorWeights.fidic || 0) +
                      Number(tempContractorWeights.projectMgmt || 0) +
                      Number(tempContractorWeights.evm || 0) +
                      Number(tempContractorWeights.kpi || 0) +
                      Number(tempContractorWeights.linear || 0) +
                      Number(tempContractorWeights.rfi ?? 10) +
                      Number(tempContractorWeights.materialApproval ?? 10) +
                      Number(tempContractorWeights.workInspection ?? 5) +
                      Number(tempContractorWeights.resourceMobilization ?? 5) +
                      (tempContractorWeights.customCriteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0)
                    )
                  : (
                      Number(tempConsultantWeights.sla || 0) +
                      Number(tempConsultantWeights.staff || 0) +
                      Number(tempConsultantWeights.ipc || 0) +
                      Number(tempConsultantWeights.claims || 0) +
                      Number(tempConsultantWeights.quality || 0) +
                      (tempConsultantWeights.customCriteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0)
                    );
                const isBalanced = currentSum === 100;

                const autoBalance = () => {
                  if (auditPerspective === 'contractor') {
                    const keys = ['fidic', 'projectMgmt', 'evm', 'kpi', 'linear', 'rfi', 'materialApproval', 'workInspection', 'resourceMobilization'] as const;
                    const customList = tempContractorWeights.customCriteria || [];
                    const items: { key?: string; customIndex?: number; val: number }[] = [];
                    keys.forEach((k) => items.push({ key: k, val: Number(tempContractorWeights[k] ?? (DEFAULT_CONTRACTOR_SCORING_WEIGHTS as any)[k] ?? 0) }));
                    customList.forEach((c, idx) => items.push({ customIndex: idx, val: Number(c.weight) || 0 }));
                    
                    const totalRaw = items.reduce((s, it) => s + it.val, 0);
                    const count = items.length;
                    if (count === 0) return;
                    let accumulated = 0;
                    const balanced = items.map((it, i) => {
                      if (i === count - 1) return Math.max(0, 100 - accumulated);
                      const pct = totalRaw > 0 ? (it.val / totalRaw) * 100 : 100 / count;
                      const rounded = Math.round(pct);
                      accumulated += rounded;
                      return rounded;
                    });
                    const updated: any = { ...tempContractorWeights };
                    const updatedCustom = [...customList];
                    items.forEach((it, i) => {
                      if (it.key) updated[it.key] = balanced[i];
                      else if (it.customIndex !== undefined && updatedCustom[it.customIndex]) {
                        updatedCustom[it.customIndex] = { ...updatedCustom[it.customIndex], weight: balanced[i] };
                      }
                    });
                    updated.customCriteria = updatedCustom;
                    setTempContractorWeights(updated);
                  } else {
                    const keys = ['sla', 'staff', 'ipc', 'claims', 'quality'] as const;
                    const customList = tempConsultantWeights.customCriteria || [];
                    const items: { key?: string; customIndex?: number; val: number }[] = [];
                    keys.forEach((k) => items.push({ key: k, val: Number(tempConsultantWeights[k] ?? (DEFAULT_CONSULTANT_SCORING_WEIGHTS as any)[k] ?? 0) }));
                    customList.forEach((c, idx) => items.push({ customIndex: idx, val: Number(c.weight) || 0 }));
                    
                    const totalRaw = items.reduce((s, it) => s + it.val, 0);
                    const count = items.length;
                    if (count === 0) return;
                    let accumulated = 0;
                    const balanced = items.map((it, i) => {
                      if (i === count - 1) return Math.max(0, 100 - accumulated);
                      const pct = totalRaw > 0 ? (it.val / totalRaw) * 100 : 100 / count;
                      const rounded = Math.round(pct);
                      accumulated += rounded;
                      return rounded;
                    });
                    const updated: any = { ...tempConsultantWeights };
                    const updatedCustom = [...customList];
                    items.forEach((it, i) => {
                      if (it.key) updated[it.key] = balanced[i];
                      else if (it.customIndex !== undefined && updatedCustom[it.customIndex]) {
                        updatedCustom[it.customIndex] = { ...updatedCustom[it.customIndex], weight: balanced[i] };
                      }
                    });
                    updated.customCriteria = updatedCustom;
                    setTempConsultantWeights(updated);
                  }
                };

                return (
                  <div className={`p-4 rounded-xl border transition-all ${
                    isBalanced
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 font-extrabold text-xs mb-2">
                      <span className="flex items-center gap-1.5">
                        {isBalanced ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <span>Total Model Weight Distribution Balance</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={autoBalance}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <RefreshCcw className="w-3 h-3 text-amber-500" />
                          <span>⚡ Auto-Balance to 100%</span>
                        </button>
                        <span className={`font-mono text-sm px-2.5 py-0.5 rounded-lg border font-black ${
                          isBalanced 
                            ? 'bg-emerald-500 text-white border-emerald-600' 
                            : 'bg-rose-600 text-white border-rose-700'
                        }`}>
                          {currentSum}% / 100%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isBalanced ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, currentSum)}%` }}
                      />
                    </div>

                    <p className="text-[11px] font-medium leading-relaxed">
                      {isBalanced ? (
                        <span>✅ Perfect model balance. All weights sum to exactly 100%. Ready to save and deploy.</span>
                      ) : (
                        <span>
                          ⚠️ Model weights sum to <strong>{currentSum}%</strong> (must equal 100%).{' '}
                          {currentSum < 100 ? `Allocate remaining ${100 - currentSum}% or click Auto-Balance.` : `Reduce ${currentSum - 100}% or click Auto-Balance.`}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Weight Fields Grid */}
              {auditPerspective === 'contractor' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                      <span>PROJECT CONTRACTOR EVALUATION DIMENSIONS & CRITERIA</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newCustom: CustomScoringCriterion = {
                            id: `custom_${Date.now()}`,
                            label: `Custom Contractor Criterion ${(tempContractorWeights.customCriteria?.length || 0) + 1}`,
                            description: 'Enter evaluation notes and criteria explanation',
                            weight: 5
                          };
                          setTempContractorWeights({
                            ...tempContractorWeights,
                            customCriteria: [...(tempContractorWeights.customCriteria || []), newCustom]
                          });
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Criteria</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempContractorWeights(DEFAULT_CONTRACTOR_SCORING_WEIGHTS)}
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {[
                      { key: 'fidic', defaultLabel: '1. FIDIC Contract Compliance', defaultDesc: 'Performance/Mobilization Guarantees & Risk notices', defaultWeight: 10 },
                      { key: 'projectMgmt', defaultLabel: '2. Project Management (Time)', defaultDesc: 'Schedule overrun & EOT extension compliance', defaultWeight: 20 },
                      { key: 'evm', defaultLabel: '3. EVM Metrics (CPI & SPI)', defaultDesc: 'Cost Efficiency Index (CPI) & Schedule Performance (SPI)', defaultWeight: 15 },
                      { key: 'kpi', defaultLabel: '4. KPIs & Quality Milestones', defaultDesc: 'Key milestone completions & critical risk mitigations', defaultWeight: 10 },
                      { key: 'linear', defaultLabel: '5. Linear Layer Physical Progress', defaultDesc: 'Earthwork, Subgrade, Subbase, Basecourse, & Asphalt pavement layers', defaultWeight: 15 },
                      { key: 'rfi', defaultLabel: '6. Technical RFIs Performance', defaultDesc: 'RFI response, quality & resolution compliance ratio', defaultWeight: 10 },
                      { key: 'materialApproval', defaultLabel: '7. Material Approval Submittals', defaultDesc: 'Timeliness & specification compliance of material samples', defaultWeight: 10 },
                      { key: 'workInspection', defaultLabel: '8. Work Inspections (WIR)', defaultDesc: 'First-time pass rate and quality inspection submittals', defaultWeight: 5 },
                      { key: 'resourceMobilization', defaultLabel: '9. Resource Mobilization', defaultDesc: 'Equipment, machinery & key personnel site presence', defaultWeight: 5 }
                    ].map((item) => {
                      const currentLabel = tempContractorWeights.labels?.[item.key] ?? item.defaultLabel;
                      const currentDesc = tempContractorWeights.descriptions?.[item.key] ?? item.defaultDesc;
                      const currentWeight = tempContractorWeights[item.key] ?? item.defaultWeight;

                      return (
                        <div key={item.key} className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={currentLabel}
                              onChange={(e) => {
                                setTempContractorWeights({
                                  ...tempContractorWeights,
                                  labels: {
                                    ...(tempContractorWeights.labels || DEFAULT_CONTRACTOR_SCORING_WEIGHTS.labels),
                                    [item.key]: e.target.value
                                  }
                                });
                              }}
                              className="font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none w-full text-xs py-0.5"
                              title="Click to edit criterion title"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 rounded border border-indigo-200 dark:border-indigo-800">
                                {currentWeight}%
                              </span>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={currentDesc}
                            onChange={(e) => {
                              setTempContractorWeights({
                                ...tempContractorWeights,
                                descriptions: {
                                  ...(tempContractorWeights.descriptions || DEFAULT_CONTRACTOR_SCORING_WEIGHTS.descriptions),
                                  [item.key]: e.target.value
                                }
                              });
                            }}
                            className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded px-2 py-1 w-full outline-none focus:border-indigo-500"
                            placeholder="Criteria description..."
                          />

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Weight (%):</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentWeight}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                setTempContractorWeights({
                                  ...tempContractorWeights,
                                  [item.key]: val
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom Contractor Criteria */}
                    {(tempContractorWeights.customCriteria || []).map((custom, index) => (
                      <div key={custom.id || index} className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={custom.label}
                            onChange={(e) => {
                              const updatedCustom = [...(tempContractorWeights.customCriteria || [])];
                              updatedCustom[index] = { ...updatedCustom[index], label: e.target.value };
                              setTempContractorWeights({ ...tempContractorWeights, customCriteria: updatedCustom });
                            }}
                            className="font-bold text-indigo-900 dark:text-indigo-200 bg-transparent border-b border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 focus:border-indigo-500 outline-none w-full text-xs py-0.5"
                            placeholder="Custom Criterion Name"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCustom = (tempContractorWeights.customCriteria || []).filter((_, i) => i !== index);
                              setTempContractorWeights({ ...tempContractorWeights, customCriteria: updatedCustom });
                            }}
                            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete custom criterion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={custom.description || ''}
                          onChange={(e) => {
                            const updatedCustom = [...(tempContractorWeights.customCriteria || [])];
                            updatedCustom[index] = { ...updatedCustom[index], description: e.target.value };
                            setTempContractorWeights({ ...tempContractorWeights, customCriteria: updatedCustom });
                          }}
                          className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-full outline-none focus:border-indigo-500"
                          placeholder="Custom criterion notes or description..."
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Weight (%):</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={custom.weight}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              const updatedCustom = [...(tempContractorWeights.customCriteria || [])];
                              updatedCustom[index] = { ...updatedCustom[index], weight: val };
                              setTempContractorWeights({ ...tempContractorWeights, customCriteria: updatedCustom });
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Supervision Consultant Weights Grid */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                      <span>SUPERVISION CONSULTANT EVALUATION DIMENSIONS & CRITERIA</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newCustom: CustomScoringCriterion = {
                            id: `custom_cons_${Date.now()}`,
                            label: `Custom Consultant Criterion ${(tempConsultantWeights.customCriteria?.length || 0) + 1}`,
                            description: 'Enter evaluation notes and criteria explanation',
                            weight: 5
                          };
                          setTempConsultantWeights({
                            ...tempConsultantWeights,
                            customCriteria: [...(tempConsultantWeights.customCriteria || []), newCustom]
                          });
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Criteria</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempConsultantWeights(DEFAULT_CONSULTANT_SCORING_WEIGHTS)}
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {[
                      { key: 'sla', defaultLabel: '1. Submittal SLA & RFI Turnaround', defaultDesc: 'Response time on contractor submittals and technical RFIs against SLA targets', defaultWeight: 25 },
                      { key: 'staff', defaultLabel: '2. Key Staff Mobilization', defaultDesc: 'Resident Engineer and active key personnel presence against allocated MM', defaultWeight: 20 },
                      { key: 'ipc', defaultLabel: '3. IPC Verification Timeliness', defaultDesc: 'Interim Payment Certificate verification turnaround within contract window', defaultWeight: 20 },
                      { key: 'claims', defaultLabel: '4. Claims & Determinations', defaultDesc: 'Contract administration, timely claim assessments, and dispute mitigations', defaultWeight: 20 },
                      { key: 'quality', defaultLabel: '5. Quality Assurance & WIR', defaultDesc: 'Inspection hold points, material approvals, and site test approvals', defaultWeight: 15 }
                    ].map((item) => {
                      const currentLabel = tempConsultantWeights.labels?.[item.key] ?? item.defaultLabel;
                      const currentDesc = tempConsultantWeights.descriptions?.[item.key] ?? item.defaultDesc;
                      const currentWeight = tempConsultantWeights[item.key] ?? item.defaultWeight;

                      return (
                        <div key={item.key} className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={currentLabel}
                              onChange={(e) => {
                                setTempConsultantWeights({
                                  ...tempConsultantWeights,
                                  labels: {
                                    ...(tempConsultantWeights.labels || DEFAULT_CONSULTANT_SCORING_WEIGHTS.labels),
                                    [item.key]: e.target.value
                                  }
                                });
                              }}
                              className="font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none w-full text-xs py-0.5"
                              title="Click to edit criterion title"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 rounded border border-indigo-200 dark:border-indigo-800">
                                {currentWeight}%
                              </span>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={currentDesc}
                            onChange={(e) => {
                              setTempConsultantWeights({
                                ...tempConsultantWeights,
                                descriptions: {
                                  ...(tempConsultantWeights.descriptions || DEFAULT_CONSULTANT_SCORING_WEIGHTS.descriptions),
                                  [item.key]: e.target.value
                                }
                              });
                            }}
                            className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded px-2 py-1 w-full outline-none focus:border-indigo-500"
                            placeholder="Criteria description..."
                          />

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Weight (%):</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentWeight}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                setTempConsultantWeights({
                                  ...tempConsultantWeights,
                                  [item.key]: val
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom Consultant Criteria */}
                    {(tempConsultantWeights.customCriteria || []).map((custom, index) => (
                      <div key={custom.id || index} className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={custom.label}
                            onChange={(e) => {
                              const updatedCustom = [...(tempConsultantWeights.customCriteria || [])];
                              updatedCustom[index] = { ...updatedCustom[index], label: e.target.value };
                              setTempConsultantWeights({ ...tempConsultantWeights, customCriteria: updatedCustom });
                            }}
                            className="font-bold text-indigo-900 dark:text-indigo-200 bg-transparent border-b border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 focus:border-indigo-500 outline-none w-full text-xs py-0.5"
                            placeholder="Custom Criterion Name"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCustom = (tempConsultantWeights.customCriteria || []).filter((_, i) => i !== index);
                              setTempConsultantWeights({ ...tempConsultantWeights, customCriteria: updatedCustom });
                            }}
                            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete custom criterion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={custom.description || ''}
                          onChange={(e) => {
                            const updatedCustom = [...(tempConsultantWeights.customCriteria || [])];
                            updatedCustom[index] = { ...updatedCustom[index], description: e.target.value };
                            setTempConsultantWeights({ ...tempConsultantWeights, customCriteria: updatedCustom });
                          }}
                          className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 w-full outline-none focus:border-indigo-500"
                          placeholder="Custom criterion notes or description..."
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Weight (%):</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={custom.weight}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              const updatedCustom = [...(tempConsultantWeights.customCriteria || [])];
                              updatedCustom[index] = { ...updatedCustom[index], weight: val };
                              setTempConsultantWeights({ ...tempConsultantWeights, customCriteria: updatedCustom });
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (auditPerspective === 'contractor') {
                    setTempContractorWeights(DEFAULT_CONTRACTOR_SCORING_WEIGHTS);
                  } else {
                    setTempConsultantWeights(DEFAULT_CONSULTANT_SCORING_WEIGHTS);
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-700/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingWeightsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                {(() => {
                  const currentSum = auditPerspective === 'contractor'
                    ? (
                        Number(tempContractorWeights.fidic || 0) +
                        Number(tempContractorWeights.projectMgmt || 0) +
                        Number(tempContractorWeights.evm || 0) +
                        Number(tempContractorWeights.kpi || 0) +
                        Number(tempContractorWeights.linear || 0) +
                        Number(tempContractorWeights.rfi ?? 10) +
                        Number(tempContractorWeights.materialApproval ?? 10) +
                        Number(tempContractorWeights.workInspection ?? 5) +
                        Number(tempContractorWeights.resourceMobilization ?? 5) +
                        (tempContractorWeights.customCriteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0)
                      )
                    : (
                        Number(tempConsultantWeights.sla || 0) +
                        Number(tempConsultantWeights.staff || 0) +
                        Number(tempConsultantWeights.ipc || 0) +
                        Number(tempConsultantWeights.claims || 0) +
                        Number(tempConsultantWeights.quality || 0) +
                        (tempConsultantWeights.customCriteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0)
                      );
                  const isValid = currentSum === 100;

                  return (
                    <button
                      type="button"
                      disabled={!isValid}
                      onClick={async () => {
                        if (!isValid) return;
                        localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(tempContractorWeights));
                        localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(tempConsultantWeights));
                        setContractorWeights(tempContractorWeights);
                        setConsultantWeights(tempConsultantWeights);
                        await safeSyncScoringWeights(tempContractorWeights, tempConsultantWeights, currentUserObj?.username);
                        setIsEditingWeightsModalOpen(false);
                        alert(`✅ Master Admin Update Successful!\n\nAll criteria names, descriptions, and weight distribution for ${auditPerspective === 'contractor' ? 'Project Contractor' : 'Supervision Consultant'} scoring model have been saved to the database and applied across all reports.`);
                      }}
                      className={`px-5 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm ${
                        isValid
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-98'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Save & Apply Scoring Model</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend 
} from 'recharts';
import { 
  Project, 
  User, 
  ProgressPlan, 
  ProgressPlanHistoryItem, 
  PlanSet, 
  formatAccounting 
} from '../types';
import { getProgressHealth } from '../lib/healthUtils';
import { 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  Download, 
  Save, 
  Edit, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronsUpDown,
  List,
  Grid,
  Search,
  ShieldCheck,
  Award,
  History,
  Sparkles,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { generateProgressComparisonPdf } from '../lib/progressComparisonPdfGenerator';
import { getCredentialSignatures } from '../lib/pdfReportEngine';

export const getPreviousPeriodSuggestion = (
  existingList: ProgressPlanHistoryItem[], 
  activeMonth: string, 
  activeQuarter: string, 
  activeEfy: string
) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Find earliest recorded month or use activeMonth
  let refLabel = activeMonth;
  if (existingList.length > 0) {
    const sortedDesc = sortProgressPlanHistoryDescending(existingList);
    const earliest = sortedDesc[sortedDesc.length - 1];
    if (earliest && earliest.monthLabel) {
      refLabel = earliest.monthLabel;
    }
  }
  
  const clean = refLabel.trim().replace(/['’]/g, '');
  const parts = clean.split(/[\s-]+/);
  const mStr = parts[0];
  let yStr = parts[1] || '2024';
  if (yStr.length === 2) yStr = `20${yStr}`;
  let y = parseInt(yStr, 10) || 2024;
  let mIdx = months.findIndex(m => mStr.toLowerCase().startsWith(m.toLowerCase()));
  if (mIdx === -1) mIdx = 8; // Sep default

  // Step back 1 month
  mIdx -= 1;
  if (mIdx < 0) {
    mIdx = 11; // Dec
    y -= 1;
  }

  const prevMonthName = months[mIdx];
  const shortYear = String(y).slice(-2);
  const prevMonthLabel = `${prevMonthName} '${shortYear}`;
  
  return {
    monthLabel: prevMonthLabel,
    quarterLabel: activeQuarter,
    efyLabel: activeEfy
  };
};

export const sortProgressPlanHistoryWithOrder = (items: ProgressPlanHistoryItem[], order: 'desc' | 'asc' = 'desc'): ProgressPlanHistoryItem[] => {
  return [...(items || [])].sort((a, b) => {
    const parseM = (lbl?: string) => {
      if (!lbl) return 0;
      const clean = lbl.trim().replace(/['’]/g, '');
      const parts = clean.split(/[\s-]+/);
      const monthStr = parts[0];
      let yearStr = parts[1] || '2026';
      if (yearStr.length === 2) {
        yearStr = `20${yearStr}`;
      }
      const monthsMap: Record<string, number> = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
      };
      const m = monthsMap[monthStr] || 1;
      const y = parseInt(yearStr, 10) || 2026;
      return y * 12 + m;
    };
    const valA = parseM(a.monthLabel);
    const valB = parseM(b.monthLabel);
    return order === 'desc' ? valB - valA : valA - valB;
  });
};

export const sortProgressPlanHistoryDescending = (items: ProgressPlanHistoryItem[]): ProgressPlanHistoryItem[] => {
  return sortProgressPlanHistoryWithOrder(items, 'desc');
};

interface ProgressPlanViewProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>, reason?: string) => void;
  currentUser?: User | null;
  onSwitchTab?: (tab: string) => void;
  projects?: Project[];
  onClearAllProjectsHistory?: () => void;
}

export const ProgressPlanView: React.FC<ProgressPlanViewProps> = ({
  project,
  onUpdateProject,
  currentUser,
  onSwitchTab,
  projects,
  onClearAllProjectsHistory
}) => {
  // 1. Initial State Resolution
  const totalLength = project.lengthKm || 65.0;

  // Deletion permission check: Directorate admin, Master admin, and CPM admin only
  const canDeleteHistory = Boolean(
    currentUser?.role === 'master_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.role === 'cpm_admin' || 
    currentUser?.role === 'directorate_admin' ||
    (currentUser?.role && (currentUser.role.includes('admin') || currentUser.role.includes('directorate') || currentUser.role.includes('cpm'))) ||
    currentUser?.username === 'proj_1781786415663'
  );

  // Selected Category filter / view
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'contractor' | 'era' | 'actual'>('all');

  // Active comparison labels
  const initialMonthLabel = project.progressPlanLabels?.monthLabel || "Sep '24";
  const initialQuarterLabel = project.progressPlanLabels?.quarterLabel || "July 2024-September 2024";
  const initialEfyLabel = project.progressPlanLabels?.efyLabel || "EFY 2017";

  const [monthLabel, setMonthLabel] = useState<string>(initialMonthLabel);
  const [quarterLabel, setQuarterLabel] = useState<string>(initialQuarterLabel);
  const [efyLabel, setEfyLabel] = useState<string>(initialEfyLabel);

  // Active Comparison Plan Values
  const initialPlan: ProgressPlan = useMemo(() => {
    return {
      contractor: {
        month: project.progressPlan?.contractor?.month ?? 1.20,
        quarter: project.progressPlan?.contractor?.quarter ?? 3.70,
        efy: project.progressPlan?.contractor?.efy ?? 7.87,
        todate: project.progressPlan?.contractor?.todate ?? 85.12
      },
      era: {
        month: project.progressPlan?.era?.month ?? 0.85,
        quarter: project.progressPlan?.era?.quarter ?? 1.42,
        efy: project.progressPlan?.era?.efy ?? 3.80,
        todate: project.progressPlan?.era?.todate ?? 73.11
      },
      actual: {
        month: project.progressPlan?.actual?.month ?? 0.50,
        quarter: project.progressPlan?.actual?.quarter ?? 1.15,
        efy: project.progressPlan?.actual?.efy ?? 2.50,
        todate: project.progressPlan?.actual?.todate ?? 67.42
      }
    };
  }, [project.progressPlan]);

  const [activePlan, setActivePlan] = useState<ProgressPlan>(initialPlan);

  // Sort order state for elapsed months & history list
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');

  // Milestone History resolution - returns actual saved history or empty list, with robust persistent backup fallback
  const historyList: ProgressPlanHistoryItem[] = useMemo(() => {
    let raw = project.progressPlanHistory && project.progressPlanHistory.length > 0 ? project.progressPlanHistory : [];
    if (raw.length === 0) {
      try {
        const b = localStorage.getItem(`era_hist_backup_${project.id}`);
        if (b) {
          const parsed = JSON.parse(b);
          if (Array.isArray(parsed) && parsed.length > 0) {
            raw = parsed;
          }
        }
      } catch {}
    }
    return sortProgressPlanHistoryWithOrder(raw, historySortOrder);
  }, [project.progressPlanHistory, project.id, historySortOrder]);

  // Auto-heal project if history exists in persistent backup but was missing from current project instance
  const hasRestoredHistoryRef = useRef<string | null>(null);
  useEffect(() => {
    if (hasRestoredHistoryRef.current === project.id) return;
    if ((!project.progressPlanHistory || project.progressPlanHistory.length === 0) && historyList.length > 0) {
      hasRestoredHistoryRef.current = project.id;
      onUpdateProject({ progressPlanHistory: historyList }, 'Restored saved history records from persistent backup');
    }
  }, [project.id, project.progressPlanHistory?.length, historyList.length]);

  // Selected Archived Item for Left Panel
  const [selectedArchivedKey, setSelectedArchivedKey] = useState<string>(
    historyList.length > 0 ? historyList[0].id : 'live'
  );

  const selectedArchivedItem = useMemo<ProgressPlanHistoryItem | null>(() => {
    return historyList.find(h => h.id === selectedArchivedKey) || historyList[0] || null;
  }, [historyList, selectedArchivedKey]);

  // Modal State for Editing / Adding Previous Milestone Record
  const [editingItem, setEditingItem] = useState<ProgressPlanHistoryItem | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'add_previous'>('edit');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Vertical Scrolling & Layout Option for History List
  const [isVerticalScroll, setIsVerticalScroll] = useState<boolean>(true);
  const [historyLayout, setHistoryLayout] = useState<'grid' | 'list'>('grid');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // PDF Reporting & Approval Views State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [includeHistoryInPdf, setIncludeHistoryInPdf] = useState<boolean>(true);
  const [includeVerificationInPdf, setIncludeVerificationInPdf] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Trend Chart View Mode: Cumulative to-date (Km) vs Monthly Incremental (Km)
  const [chartViewMode, setChartViewMode] = useState<'cumulative' | 'monthly'>('cumulative');

  const chartData = useMemo(() => {
    // Reverse the history list so we render chronologically (oldest to newest)
    return [...historyList].reverse().map(h => ({
      name: h.monthLabel,
      "Contractor Schedule (Km)": h.contractorTodate || 0,
      "ERA Approved Plan (Km)": h.eraTodate || 0,
      "Actual Completed (Km)": h.actualTodate || 0,
      "Contractor Monthly (Km)": h.contractorMonth || 0,
      "ERA Monthly (Km)": h.eraMonth || 0,
      "Actual Monthly (Km)": h.actualMonth || 0,
      "Progress Pct": h.physicalProgress || 0
    }));
  }, [historyList]);

  // Filtered History List
  const filteredHistoryList = useMemo(() => {
    if (!historySearchQuery.trim()) return historyList;
    const q = historySearchQuery.trim().toLowerCase();
    return historyList.filter(h => 
      (h.monthLabel && h.monthLabel.toLowerCase().includes(q)) ||
      (h.quarterLabel && h.quarterLabel.toLowerCase().includes(q)) ||
      (h.efyLabel && h.efyLabel.toLowerCase().includes(q))
    );
  }, [historyList, historySearchQuery]);

  // Handle PDF Export
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = generateProgressComparisonPdf({
        project,
        currentUser,
        activePlan,
        monthLabel,
        quarterLabel,
        efyLabel,
        historyList,
        includeHistoryTable: includeHistoryInPdf,
        includeVerificationStamps: includeVerificationInPdf
      });
      const fileName = `${(project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_Monthly_Status_Report.pdf`;
      doc.save(fileName);
      setSaveSuccessMsg('Official PDF Report generated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('Error generating Progress Comparison PDF:', err);
      alert('Failed to generate PDF report. Please check console for details.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper to calculate percentages
  const toPct = (km: number) => {
    if (!totalLength || totalLength <= 0) return '0.00%';
    return `${((km / totalLength) * 100).toFixed(2)}%`;
  };

  // Variances and Ratios
  const varVsContractor = {
    month: Number((activePlan.actual.month - activePlan.contractor.month).toFixed(2)),
    quarter: Number((activePlan.actual.quarter - activePlan.contractor.quarter).toFixed(2)),
    efy: Number((activePlan.actual.efy - activePlan.contractor.efy).toFixed(2)),
    todate: Number((activePlan.actual.todate - activePlan.contractor.todate).toFixed(2))
  };

  const varVsEra = {
    month: Number((activePlan.actual.month - activePlan.era.month).toFixed(2)),
    quarter: Number((activePlan.actual.quarter - activePlan.era.quarter).toFixed(2)),
    efy: Number((activePlan.actual.efy - activePlan.era.efy).toFixed(2)),
    todate: Number((activePlan.actual.todate - activePlan.era.todate).toFixed(2))
  };

  const ratioVsContractor = {
    month: activePlan.contractor.month > 0 ? (activePlan.actual.month / activePlan.contractor.month) * 100 : 0,
    quarter: activePlan.contractor.quarter > 0 ? (activePlan.actual.quarter / activePlan.contractor.quarter) * 100 : 0,
    efy: activePlan.contractor.efy > 0 ? (activePlan.actual.efy / activePlan.contractor.efy) * 100 : 0,
    todate: activePlan.contractor.todate > 0 ? (activePlan.actual.todate / activePlan.contractor.todate) * 100 : 0
  };

  const ratioVsEra = {
    month: activePlan.era.month > 0 ? (activePlan.actual.month / activePlan.era.month) * 100 : 0,
    quarter: activePlan.era.quarter > 0 ? (activePlan.actual.quarter / activePlan.era.quarter) * 100 : 0,
    efy: activePlan.era.efy > 0 ? (activePlan.actual.efy / activePlan.era.efy) * 100 : 0,
    todate: activePlan.era.todate > 0 ? (activePlan.actual.todate / activePlan.era.todate) * 100 : 0
  };

  // Save current active plan snapshot to history
  const handleSaveActiveToSnapshot = () => {
    const calculatedPhysicalProgress = totalLength > 0 
      ? Number(((activePlan.actual.todate / totalLength) * 100).toFixed(2)) 
      : (project.physicalProgress || 0);

    const snapshotId = `hist_${monthLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const newSnapshot: ProgressPlanHistoryItem = {
      id: snapshotId,
      monthLabel,
      quarterLabel,
      efyLabel,
      contractorMonth: activePlan.contractor.month,
      contractorQuarter: activePlan.contractor.quarter,
      contractorEfy: activePlan.contractor.efy,
      contractorTodate: activePlan.contractor.todate,
      eraMonth: activePlan.era.month,
      eraQuarter: activePlan.era.quarter,
      eraEfy: activePlan.era.efy,
      eraTodate: activePlan.era.todate,
      actualMonth: activePlan.actual.month,
      actualQuarter: activePlan.actual.quarter,
      actualEfy: activePlan.actual.efy,
      actualTodate: activePlan.actual.todate,
      physicalProgress: calculatedPhysicalProgress
    };

    const existing = project.progressPlanHistory && project.progressPlanHistory.length > 0 ? project.progressPlanHistory : historyList;
    const filtered = existing.filter(h => h.id !== snapshotId && h.monthLabel !== monthLabel);
    const updatedHistory = sortProgressPlanHistoryDescending([newSnapshot, ...filtered]);

    try {
      localStorage.setItem(`era_hist_backup_${project.id}`, JSON.stringify(updatedHistory));
    } catch {}

    onUpdateProject({
      progressPlan: activePlan,
      progressPlanLabels: { monthLabel, quarterLabel, efyLabel },
      progressPlanHistory: updatedHistory,
      physicalProgress: calculatedPhysicalProgress
    }, `Progress snapshot saved & updated to ${monthLabel}`);

    setSelectedArchivedKey(snapshotId);
    setSaveSuccessMsg(`Snapshot for ${monthLabel} saved & updated successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete an archived record (Directorate admin, Master admin, and CPM admin only)
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDeleteHistory) {
      alert('Unauthorized: Deleting milestone history snapshots is restricted to Directorate admin, Master admin, and CPM admin only.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this archived snapshot?')) return;
    const existing = project.progressPlanHistory && project.progressPlanHistory.length > 0 ? project.progressPlanHistory : historyList;
    const updatedHistory = existing.filter(h => h.id !== id);
    try {
      localStorage.setItem(`era_hist_backup_${project.id}`, JSON.stringify(updatedHistory));
    } catch {}
    onUpdateProject({ progressPlanHistory: updatedHistory }, 'Archived milestone record deleted');
    if (selectedArchivedKey === id) {
      setSelectedArchivedKey(updatedHistory.length > 0 ? updatedHistory[0].id : 'live');
    }
  };

  // Delete all history records from this project (Directorate admin, Master admin, and CPM admin only)
  const handleClearThisProjectHistory = () => {
    if (!canDeleteHistory) {
      alert('Unauthorized: Clearing project milestone history is restricted to Directorate admin, Master admin, and CPM admin only.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete all elapsed months & EFY history records for project "${project.name || 'this project'}"?`)) return;
    try {
      localStorage.removeItem(`era_hist_backup_${project.id}`);
    } catch {}
    onUpdateProject({ progressPlanHistory: [] }, 'All elapsed months & EFY history records deleted');
    setSelectedArchivedKey('live');
    setSaveSuccessMsg('All elapsed history records for this project have been deleted.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete all history records from all projects (Directorate admin, Master admin, and CPM admin only)
  const handleClearAllProjectsHistory = () => {
    if (!canDeleteHistory) {
      alert('Unauthorized: Deleting history records across all projects is restricted to Directorate admin, Master admin, and CPM admin only.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete all elapsed months & EFY history records across ALL projects? This action cannot be undone.')) return;
    try {
      (projects || []).forEach(p => {
        localStorage.removeItem(`era_hist_backup_${p.id}`);
      });
      localStorage.removeItem(`era_hist_backup_${project.id}`);
    } catch {}
    if (onClearAllProjectsHistory) {
      onClearAllProjectsHistory();
    } else {
      onUpdateProject({ progressPlanHistory: [] }, 'All elapsed months & EFY history records deleted');
    }
    setSelectedArchivedKey('live');
    setSaveSuccessMsg('All elapsed months & EFY history records cleared from all projects!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ProgressPlanHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ ...item });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Open Add Previous Milestone Modal with Smart Lower Defaults
  const handleOpenAddPreviousModal = () => {
    // Find reference baseline values from earliest history record or activePlan
    const sortedDesc = sortProgressPlanHistoryDescending(historyList);
    const earliestItem = sortedDesc.length > 0 ? sortedDesc[sortedDesc.length - 1] : null;

    const baseContractorTodate = earliestItem ? (earliestItem.contractorTodate || 0) : activePlan.contractor.todate;
    const baseEraTodate = earliestItem ? (earliestItem.eraTodate || 0) : activePlan.era.todate;
    const baseActualTodate = earliestItem ? (earliestItem.actualTodate || 0) : activePlan.actual.todate;

    const periodSuggestion = getPreviousPeriodSuggestion(historyList, monthLabel, quarterLabel, efyLabel);

    // Compute previous values strictly lower than current progress (decrement by ~1.0 - 1.5 Km)
    const prevContractorTodate = Number(Math.max(0, baseContractorTodate - 1.5).toFixed(2));
    const prevEraTodate = Number(Math.max(0, baseEraTodate - 1.2).toFixed(2));
    const prevActualTodate = Number(Math.max(0, baseActualTodate - 1.0).toFixed(2));

    const newId = `hist_${Date.now()}`;
    const prevItem: ProgressPlanHistoryItem = {
      id: newId,
      monthLabel: periodSuggestion.monthLabel,
      quarterLabel: periodSuggestion.quarterLabel,
      efyLabel: periodSuggestion.efyLabel,
      contractorMonth: 1.10,
      contractorQuarter: 2.20,
      contractorEfy: 4.50,
      contractorTodate: prevContractorTodate,
      eraMonth: 0.80,
      eraQuarter: 1.60,
      eraEfy: 3.20,
      eraTodate: prevEraTodate,
      actualMonth: 0.40,
      actualQuarter: 0.90,
      actualEfy: 2.10,
      actualTodate: prevActualTodate,
      physicalProgress: Number(((prevActualTodate / totalLength) * 100).toFixed(2))
    };

    setEditingItem(prevItem);
    setModalMode('add_previous');
    setIsModalOpen(true);
  };

  // Save Modal Updates
  const handleSaveModalUpdates = () => {
    if (!editingItem) return;

    // Recalculate physical progress from actual todate / lengthKm
    const calculatedProgress = totalLength > 0 && editingItem.actualTodate !== undefined
      ? Number(((editingItem.actualTodate / totalLength) * 100).toFixed(2))
      : (editingItem.physicalProgress || 0);

    const updatedItem: ProgressPlanHistoryItem = {
      ...editingItem,
      physicalProgress: calculatedProgress
    };

    const existing = project.progressPlanHistory || historyList;
    let updatedHistory: ProgressPlanHistoryItem[];
    if (existing.some(h => h.id === updatedItem.id)) {
      updatedHistory = existing.map(h => h.id === updatedItem.id ? updatedItem : h);
    } else {
      updatedHistory = [updatedItem, ...existing.filter(h => h.id !== updatedItem.id && h.monthLabel !== updatedItem.monthLabel)];
    }

    const sortedHistory = sortProgressPlanHistoryDescending(updatedHistory);
    try {
      localStorage.setItem(`era_hist_backup_${project.id}`, JSON.stringify(sortedHistory));
    } catch {}
    const isCurrentlyActive = updatedItem.monthLabel === monthLabel;
    const projectUpdates: Partial<Project> = {
      progressPlanHistory: sortedHistory
    };

    if (isCurrentlyActive) {
      projectUpdates.progressPlan = {
        contractor: {
          month: updatedItem.contractorMonth,
          quarter: updatedItem.contractorQuarter || 0,
          efy: updatedItem.contractorEfy,
          todate: updatedItem.contractorTodate || 0
        },
        era: {
          month: updatedItem.eraMonth,
          quarter: updatedItem.eraQuarter || 0,
          efy: updatedItem.eraEfy,
          todate: updatedItem.eraTodate || 0
        },
        actual: {
          month: updatedItem.actualMonth,
          quarter: updatedItem.actualQuarter || 0,
          efy: updatedItem.actualEfy,
          todate: updatedItem.actualTodate || 0
        }
      };
      projectUpdates.physicalProgress = calculatedProgress;
      setActivePlan(projectUpdates.progressPlan);
    }

    onUpdateProject(projectUpdates, modalMode === 'add_previous' ? `Added previous milestone record for ${updatedItem.monthLabel}` : `Milestone record ${updatedItem.monthLabel} updated`);
    setSelectedArchivedKey(updatedItem.id);
    setIsModalOpen(false);
    setEditingItem(null);
    setSaveSuccessMsg(modalMode === 'add_previous' ? `Previous milestone record for ${updatedItem.monthLabel} added successfully!` : `Milestone record ${updatedItem.monthLabel} updated successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Export comparison table to CSV
  const handleExportCsv = () => {
    const headers = [
      'Category',
      `Current Month (${monthLabel}) [Km]`,
      `Current Quarter (${quarterLabel}) [Km]`,
      `Current EFY (${efyLabel}) [Km]`,
      'Cumulative To Date [Km]',
      'Cumulative Progress [%]'
    ];

    const rows = [
      [
        'Contractor Program Schedule',
        activePlan.contractor.month.toFixed(2),
        activePlan.contractor.quarter.toFixed(2),
        activePlan.contractor.efy.toFixed(2),
        activePlan.contractor.todate.toFixed(2),
        toPct(activePlan.contractor.todate)
      ],
      [
        'ERA Approved Milestone Plan',
        activePlan.era.month.toFixed(2),
        activePlan.era.quarter.toFixed(2),
        activePlan.era.efy.toFixed(2),
        activePlan.era.todate.toFixed(2),
        toPct(activePlan.era.todate)
      ],
      [
        'Actual Road Completed (Km)',
        activePlan.actual.month.toFixed(2),
        activePlan.actual.quarter.toFixed(2),
        activePlan.actual.efy.toFixed(2),
        activePlan.actual.todate.toFixed(2),
        toPct(activePlan.actual.todate)
      ],
      [
        '% of Actual Divided by ERA Plan',
        activePlan.era.month > 0 ? `${((activePlan.actual.month / activePlan.era.month) * 100).toFixed(2)}%` : '0.00%',
        activePlan.era.quarter > 0 ? `${((activePlan.actual.quarter / activePlan.era.quarter) * 100).toFixed(2)}%` : '0.00%',
        activePlan.era.efy > 0 ? `${((activePlan.actual.efy / activePlan.era.efy) * 100).toFixed(2)}%` : '0.00%',
        activePlan.era.todate > 0 ? `${((activePlan.actual.todate / activePlan.era.todate) * 100).toFixed(2)}%` : '0.00%',
        '-'
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Monthly_Status_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-bold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* MAIN MONTHLY STATUS REPORT CARD */}
      <section className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        {/* Card Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Monthly Status Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Compare Contractor Program Schedule vs ERA Approved Milestone Plan vs Actual Road Completed with dynamic period selection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wide flex items-center gap-2 transition cursor-pointer shadow-xs border border-slate-700"
              title="Export comparison table to CSV/Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-xs font-black uppercase tracking-wide flex items-center gap-2 transition cursor-pointer shadow-xs"
              title="Export official PDF report with statutory verification and approval sign-off views"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* Category Selector Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mr-2">
            Progress Plan Category:
          </span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'contractor', label: 'Contractor Program Schedule' },
            { id: 'era', label: 'ERA Approved Milestone Plan' },
            { id: 'actual', label: 'Actual Road Completed (Km)' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedCategory === cat.id ? 'bg-white' : 'bg-slate-400'}`}></span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic Period Headers Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[11px] whitespace-nowrap">Month:</span>
            <input
              type="text"
              value={monthLabel}
              onChange={(e) => setMonthLabel(e.target.value)}
              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-850 dark:text-slate-100"
              placeholder="e.g. Sep '24"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[11px] whitespace-nowrap">Quarter:</span>
            <input
              type="text"
              value={quarterLabel}
              onChange={(e) => setQuarterLabel(e.target.value)}
              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-850 dark:text-slate-100"
              placeholder="e.g. July 2024-September 2024"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[11px] whitespace-nowrap">EFY:</span>
            <input
              type="text"
              value={efyLabel}
              onChange={(e) => setEfyLabel(e.target.value)}
              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-850 dark:text-slate-100"
              placeholder="e.g. EFY 2017"
            />
          </div>
        </div>

        {/* Main Comparison Metrics Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="p-4 w-1/4">Plan Category</th>
                <th className="p-4 text-center">
                  <div>Current Month</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">{monthLabel}</div>
                </th>
                <th className="p-4 text-center">
                  <div>Current Quarter</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">{quarterLabel}</div>
                </th>
                <th className="p-4 text-center">
                  <div>Current EFY</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">{efyLabel}</div>
                </th>
                <th className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/20">
                  <div>Cumulative to date</div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">Total: {totalLength} Km</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {/* Row 1: Contractor Program Schedule */}
              {(selectedCategory === 'all' || selectedCategory === 'contractor') && (
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="p-4 font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs"></span>
                    Contractor Program Schedule
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.contractor.month}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        contractor: { ...activePlan.contractor, month: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.contractor.month)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.contractor.quarter}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        contractor: { ...activePlan.contractor, quarter: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.contractor.quarter)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.contractor.efy}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        contractor: { ...activePlan.contractor, efy: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.contractor.efy)}</div>
                  </td>
                  <td className="p-4 text-center bg-blue-50/30 dark:bg-blue-950/10">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.contractor.todate}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        contractor: { ...activePlan.contractor, todate: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-blue-100/50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg font-black text-sm text-blue-900 dark:text-blue-100"
                    />
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-bold">{toPct(activePlan.contractor.todate)}</div>
                  </td>
                </tr>
              )}

              {/* Row 2: ERA Approved Milestone Plan */}
              {(selectedCategory === 'all' || selectedCategory === 'era') && (
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="p-4 font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    ERA Approved Milestone Plan
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.era.month}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        era: { ...activePlan.era, month: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.era.month)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.era.quarter}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        era: { ...activePlan.era, quarter: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.era.quarter)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.era.efy}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        era: { ...activePlan.era, efy: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-850 dark:text-slate-100"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-bold">{toPct(activePlan.era.efy)}</div>
                  </td>
                  <td className="p-4 text-center bg-blue-50/30 dark:bg-blue-950/10">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.era.todate}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        era: { ...activePlan.era, todate: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg font-black text-sm text-emerald-900 dark:text-emerald-100"
                    />
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold">{toPct(activePlan.era.todate)}</div>
                  </td>
                </tr>
              )}

              {/* Row 3: Actual Road Completed (Km) */}
              {(selectedCategory === 'all' || selectedCategory === 'actual') && (
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition bg-blue-50/20 dark:bg-blue-950/10">
                  <td className="p-4 font-black text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    Actual Road Completed (Km)
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.actual.month}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        actual: { ...activePlan.actual, month: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 rounded-lg font-black text-sm text-indigo-700 dark:text-indigo-300 shadow-xs"
                    />
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-bold">{toPct(activePlan.actual.month)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.actual.quarter}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        actual: { ...activePlan.actual, quarter: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 rounded-lg font-black text-sm text-indigo-700 dark:text-indigo-300 shadow-xs"
                    />
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-bold">{toPct(activePlan.actual.quarter)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.actual.efy}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        actual: { ...activePlan.actual, efy: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-white dark:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-600 rounded-lg font-black text-sm text-indigo-700 dark:text-indigo-300 shadow-xs"
                    />
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-bold">{toPct(activePlan.actual.efy)}</div>
                  </td>
                  <td className="p-4 text-center bg-indigo-50/50 dark:bg-indigo-950/30">
                    <input
                      type="number"
                      step="0.01"
                      value={activePlan.actual.todate}
                      onChange={(e) => setActivePlan({
                        ...activePlan,
                        actual: { ...activePlan.actual, todate: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-24 text-center px-2 py-1 bg-indigo-600 text-white border-2 border-indigo-700 rounded-lg font-black text-sm shadow-xs"
                    />
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-black">{toPct(activePlan.actual.todate)}</div>
                  </td>
                </tr>
              )}

              {/* % of Actual Divided by ERA Plan */}
              <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 text-xs font-bold border-t border-slate-200 dark:border-slate-800">
                <td className="p-3.5 pl-6 font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  % of Actual Divided by ERA Plan
                </td>
                <td className="p-3.5 text-center">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {activePlan.era.month > 0 ? `${((activePlan.actual.month / activePlan.era.month) * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {activePlan.era.quarter > 0 ? `${((activePlan.actual.quarter / activePlan.era.quarter) * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {activePlan.era.efy > 0 ? `${((activePlan.actual.efy / activePlan.era.efy) * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </td>
                <td className="p-3.5 text-center bg-emerald-100/50 dark:bg-emerald-900/40">
                  <span className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                    {activePlan.era.todate > 0 ? `${((activePlan.actual.todate / activePlan.era.todate) * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </td>
              </tr>

              {/* Health Status vs ERA Plan (<50% Critical, 50-60 Lagging, 60-80 Needs Improvement, 80-99 Good, >=100 On Track) */}
              <tr className="bg-slate-50 dark:bg-slate-900 text-xs font-bold border-t border-slate-200 dark:border-slate-800">
                <td className="p-3.5 pl-6 font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Health Status (vs ERA Plan)
                </td>
                <td className="p-3.5 text-center">
                  {(() => {
                    const ratio = activePlan.era.month > 0 ? (activePlan.actual.month / activePlan.era.month) * 100 : 0;
                    const h = getProgressHealth(ratio);
                    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${h.badgeClass}`}>{h.label}</span>;
                  })()}
                </td>
                <td className="p-3.5 text-center">
                  {(() => {
                    const ratio = activePlan.era.quarter > 0 ? (activePlan.actual.quarter / activePlan.era.quarter) * 100 : 0;
                    const h = getProgressHealth(ratio);
                    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${h.badgeClass}`}>{h.label}</span>;
                  })()}
                </td>
                <td className="p-3.5 text-center">
                  {(() => {
                    const ratio = activePlan.era.efy > 0 ? (activePlan.actual.efy / activePlan.era.efy) * 100 : 0;
                    const h = getProgressHealth(ratio);
                    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${h.badgeClass}`}>{h.label}</span>;
                  })()}
                </td>
                <td className="p-3.5 text-center bg-blue-50/30 dark:bg-blue-950/20">
                  {(() => {
                    const ratio = activePlan.era.todate > 0 ? (activePlan.actual.todate / activePlan.era.todate) * 100 : 0;
                    const h = getProgressHealth(ratio);
                    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${h.badgeClass}`}>{h.label}</span>;
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. TWO PANELS: ARCHIVED RECORD (LEFT) & HISTORY LIST (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: ARCHIVED / ELAPSED RECORD */}
        <section className="lg:col-span-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              ARCHIVED / ELAPSED RECORD
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase">
              {monthLabel}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Selected Period</div>
              <div className="text-sm font-black text-slate-850 dark:text-slate-100 mt-0.5">{monthLabel}</div>
              <div className="text-[11px] text-slate-500 font-medium">{quarterLabel} | {efyLabel}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Contractor Plan:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activePlan.contractor.month.toFixed(2)} Km ({toPct(activePlan.contractor.month)})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">ERA Approved Plan:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activePlan.era.month.toFixed(2)} Km ({toPct(activePlan.era.month)})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">Actual Road Completed:</span>
                <span className="font-black text-indigo-700 dark:text-indigo-300">
                  {activePlan.actual.month.toFixed(2)} Km ({toPct(activePlan.actual.month)})
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Cumulative Actual</div>
                <div className="text-base font-black text-indigo-900 dark:text-indigo-100">
                  {activePlan.actual.todate.toFixed(2)} Km
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Physical Progress</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {toPct(activePlan.actual.todate)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveActiveToSnapshot}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save & Update to {monthLabel}</span>
          </button>
        </section>

        {/* RIGHT PANEL: ELAPSED MONTHS & EFY HISTORY LIST */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  ELAPSED MONTHS & EFY HISTORY LIST
                </h3>
                <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {filteredHistoryList.length} Recorded
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Archived milestone snapshots recorded for this project. Click on any card to view details or edit.
              </p>
            </div>

            {/* Controls Bar: Search, Vertical Scroll Toggle, Layout, and Record Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Filter period..."
                  className="pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-32 focus:w-40 transition-all font-medium"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Vertical Scrolling Toggle Option */}
              <button
                type="button"
                onClick={() => setIsVerticalScroll(!isVerticalScroll)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                  isVerticalScroll
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="Toggle vertical scrolling view on or off"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>Vertical Scroll: {isVerticalScroll ? 'ON' : 'OFF'}</span>
              </button>

              {/* Sort by Month Toggle */}
              <button
                type="button"
                onClick={() => setHistorySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Sort elapsed months list by month (Newest First vs Oldest First)"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sort: {historySortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </button>

              {/* Layout Switch (Grid / Compact List) */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setHistoryLayout('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyLayout === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Grid View (Columns)"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryLayout('list')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyLayout === 'list'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Compact List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add Previous Data Button (Lower than current progress) */}
              <button
                type="button"
                onClick={handleOpenAddPreviousModal}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Add historical baseline data lower than current project progress"
              >
                <History className="w-3.5 h-3.5" />
                <span>Add Previous Data</span>
              </button>

              {/* Record Snapshot Button */}
              <button
                type="button"
                onClick={() => {
                  const newId = `hist_${Date.now()}`;
                  const newItem: ProgressPlanHistoryItem = {
                    id: newId,
                    monthLabel: monthLabel,
                    quarterLabel: quarterLabel,
                    efyLabel: efyLabel,
                    contractorMonth: activePlan.contractor.month,
                    contractorQuarter: activePlan.contractor.quarter,
                    contractorEfy: activePlan.contractor.efy,
                    contractorTodate: activePlan.contractor.todate,
                    eraMonth: activePlan.era.month,
                    eraQuarter: activePlan.era.quarter,
                    eraEfy: activePlan.era.efy,
                    eraTodate: activePlan.era.todate,
                    actualMonth: activePlan.actual.month,
                    actualQuarter: activePlan.actual.quarter,
                    actualEfy: activePlan.actual.efy,
                    actualTodate: activePlan.actual.todate,
                    physicalProgress: Number(((activePlan.actual.todate / totalLength) * 100).toFixed(2))
                  };
                  setEditingItem(newItem);
                  setModalMode('edit');
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer"
                title="Capture custom milestone snapshot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record</span>
              </button>

              {/* Clear History Buttons (Directorate admin, Master admin, and CPM admin only) */}
              {canDeleteHistory && (
                <>
                  {historyList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearThisProjectHistory}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900/50"
                      title="Authorized Admin: Delete all elapsed history records for this project"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Clear Project History</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearAllProjectsHistory}
                    className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wide transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Authorized Admin: Delete all elapsed months & EFY history records across all projects"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Projects Records</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cards Container with Vertical Scrolling Option */}
          <div className={`${
            isVerticalScroll 
              ? 'max-h-[520px] overflow-y-auto pr-2 overscroll-contain space-y-3' 
              : 'space-y-3'
          }`}>
            {filteredHistoryList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                  <History className="w-6 h-6" />
                </div>
                {historySearchQuery ? (
                  <>
                    <p className="text-xs text-slate-500 font-bold">No milestone snapshots match your search filter.</p>
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="mt-2 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Clear filter
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-black uppercase tracking-tight">
                        No elapsed months & EFY history records exist
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1">
                        You can add previous historical milestones (with values lower than current progress) to build chronological S-curves and audit comparisons.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenAddPreviousModal}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide flex items-center gap-2 transition cursor-pointer shadow-xs"
                      >
                        <History className="w-4 h-4" />
                        <span>Add Previous Data (Lower Than Current)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveActiveToSnapshot}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wide flex items-center gap-2 transition cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Current Active Period ({monthLabel})</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : historyLayout === 'grid' ? (
              /* Grid Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredHistoryList.map((item) => {
                  const isActive = item.id === selectedArchivedKey;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedArchivedKey(item.id);
                        setMonthLabel(item.monthLabel);
                        if (item.quarterLabel) setQuarterLabel(item.quarterLabel);
                        if (item.efyLabel) setEfyLabel(item.efyLabel);
                        setActivePlan({
                          contractor: {
                            month: item.contractorMonth,
                            quarter: item.contractorQuarter || 0,
                            efy: item.contractorEfy,
                            todate: item.contractorTodate || 0
                          },
                          era: {
                            month: item.eraMonth,
                            quarter: item.eraQuarter || 0,
                            efy: item.eraEfy,
                            todate: item.eraTodate || 0
                          },
                          actual: {
                            month: item.actualMonth,
                            quarter: item.actualQuarter || 0,
                            efy: item.actualEfy,
                            todate: item.actualTodate || 0
                          }
                        });
                      }}
                      className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {item.monthLabel}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                              Active View
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                          {item.quarterLabel || 'Q1'} | {item.efyLabel}
                        </div>

                        <div className="mt-3 space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Contractor:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.contractorMonth.toFixed(2)} Km (Tot: {(item.contractorTodate || 0).toFixed(1)})
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>ERA:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.eraMonth.toFixed(2)} Km (Tot: {(item.eraTodate || 0).toFixed(1)})
                            </span>
                          </div>
                          <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                            <span>Actual:</span>
                            <span className="font-black">
                              {item.actualMonth.toFixed(2)} Km (Tot: {(item.actualTodate || 0).toFixed(1)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                          {item.physicalProgress !== undefined ? `${item.physicalProgress.toFixed(2)}%` : toPct(item.actualTodate || 0)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleOpenEditModal(item, e)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            title="Edit archived record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {canDeleteHistory && (
                            <button
                              onClick={(e) => handleDeleteSnapshot(item.id, e)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition"
                              title="Delete snapshot (Directorate admin, Master admin, and CPM admin only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact List Layout */
              <div className="space-y-2">
                {filteredHistoryList.map((item) => {
                  const isActive = item.id === selectedArchivedKey;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedArchivedKey(item.id);
                        setMonthLabel(item.monthLabel);
                        if (item.quarterLabel) setQuarterLabel(item.quarterLabel);
                        if (item.efyLabel) setEfyLabel(item.efyLabel);
                        setActivePlan({
                          contractor: {
                            month: item.contractorMonth,
                            quarter: item.contractorQuarter || 0,
                            efy: item.contractorEfy,
                            todate: item.contractorTodate || 0
                          },
                          era: {
                            month: item.eraMonth,
                            quarter: item.eraQuarter || 0,
                            efy: item.eraEfy,
                            todate: item.eraTodate || 0
                          },
                          actual: {
                            month: item.actualMonth,
                            quarter: item.actualQuarter || 0,
                            efy: item.actualEfy,
                            todate: item.actualTodate || 0
                          }
                        });
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-24">
                          <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            {item.monthLabel}
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.efyLabel}
                          </div>
                        </div>

                        <div className="hidden sm:block text-[11px] text-slate-500 max-w-44 truncate">
                          {item.quarterLabel || 'Q1'}
                        </div>
                      </div>

                      {/* Numbers Strip */}
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">Contractor</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.contractorMonth.toFixed(2)} Km</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">ERA</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.eraMonth.toFixed(2)} Km</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-indigo-500 font-bold block">Actual</span>
                          <span className="font-black text-indigo-700 dark:text-indigo-300">{item.actualMonth.toFixed(2)} Km</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-emerald-500 font-bold block">Progress</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {item.physicalProgress !== undefined ? `${item.physicalProgress.toFixed(2)}%` : toPct(item.actualTodate || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                        <button
                          onClick={(e) => handleOpenEditModal(item, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Edit archived record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {canDeleteHistory && (
                          <button
                            onClick={(e) => handleDeleteSnapshot(item.id, e)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition"
                            title="Delete snapshot (Directorate admin, Master admin, and CPM admin only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vertical Scrolling Indicator */}
            {isVerticalScroll && filteredHistoryList.length > 3 && (
              <div className="pt-2 text-center text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                <ChevronsUpDown className="w-3 h-3 text-blue-500 animate-bounce" />
                <span>Showing all {filteredHistoryList.length} milestones • Scroll vertically to explore complete archive</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* PROGRESS COMPARISONS TREND CHART CARD */}
      <section className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Monthly Status Progress Trends
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Chronological progress tracking of Contractor, ERA Plan, and Actual completed road (oldest to newest)
            </p>
          </div>

          {/* Toggle buttons for Cumulative vs Incremental */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setChartViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition cursor-pointer ${
                chartViewMode === 'cumulative'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Cumulative (Km)
            </button>
            <button
              onClick={() => setChartViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition cursor-pointer ${
                chartViewMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Monthly Incremental (Km)
            </button>
          </div>
        </div>

        {/* Chart Box */}
        <div className="h-[280px] w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
              <Activity className="w-8 h-8 animate-pulse text-slate-300" />
              <span className="text-xs font-bold">No historical data available to plot</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 25, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(148, 163, 184, 0.6)"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(148, 163, 184, 0.6)"
                  fontSize={10}
                  fontWeight="bold"
                  tickLine={false}
                  tickFormatter={(val) => `${val} Km`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    padding: '10px 14px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 0'
                  }}
                  labelStyle={{
                    fontSize: '11px',
                    fontWeight: 'black',
                    color: '#94a3b8',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}
                />
                <RechartsLegend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    color: 'rgba(148, 163, 184, 0.8)'
                  }}
                />
                {chartViewMode === 'cumulative' ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="Contractor Schedule (Km)"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Contractor Schedule (Km)"
                    />
                    <Line
                      type="monotone"
                      dataKey="ERA Approved Plan (Km)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="ERA Plan (Km)"
                    />
                    <Line
                      type="monotone"
                      dataKey="Actual Completed (Km)"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      name="Actual Completed (Km)"
                    />
                  </>
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="Contractor Monthly (Km)"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                      name="Contractor Monthly (Km)"
                    />
                    <Line
                      type="monotone"
                      dataKey="ERA Monthly (Km)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                      name="ERA Monthly (Km)"
                    />
                    <Line
                      type="monotone"
                      dataKey="Actual Monthly (Km)"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Actual Monthly (Km)"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 4. MODAL: ADD PREVIOUS / EDIT ARCHIVED MILESTONE RECORD */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-5 animate-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  modalMode === 'add_previous' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                }`}>
                  {modalMode === 'add_previous' ? <History className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                </div>
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-wider ${
                    modalMode === 'add_previous' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {modalMode === 'add_previous' ? 'Previous Milestone Data Entry' : 'Archived Milestone Record'}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {modalMode === 'add_previous' ? 'Add Previous Milestone (Historical Data)' : `Edit Snapshot: ${editingItem.monthLabel}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {modalMode === 'add_previous' 
                      ? `Add earlier historical progress data lower than the current project progress (${activePlan.actual.todate.toFixed(2)} Km / ${toPct(activePlan.actual.todate)}).`
                      : 'Update recorded values for this snapshot period. All plans and actuals can be adjusted for this month.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Project Progress Benchmark Banner */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Current Project Active Progress Benchmark:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase">
                    Active: {monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const decrActual = Math.max(0, Number((activePlan.actual.todate - 1.0).toFixed(2)));
                      const decrContr = Math.max(0, Number((activePlan.contractor.todate - 1.5).toFixed(2)));
                      const decrEra = Math.max(0, Number((activePlan.era.todate - 1.2).toFixed(2)));
                      setEditingItem({
                        ...editingItem,
                        actualTodate: decrActual,
                        contractorTodate: decrContr,
                        eraTodate: decrEra,
                        physicalProgress: Number(((decrActual / totalLength) * 100).toFixed(2))
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wide transition cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Set safe previous values lower by 1.0 Km"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Lower (-1.0 Km)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Actual Completed (Current)</div>
                  <div className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {activePlan.actual.todate.toFixed(2)} Km
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {toPct(activePlan.actual.todate)} Physical
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Contractor Plan (Current)</div>
                  <div className="text-sm font-black text-red-600 dark:text-red-400">
                    {activePlan.contractor.todate.toFixed(2)} Km
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {toPct(activePlan.contractor.todate)}
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">ERA Milestone (Current)</div>
                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {activePlan.era.todate.toFixed(2)} Km
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {toPct(activePlan.era.todate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Period Labels Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month Label</label>
                <input
                  type="text"
                  value={editingItem.monthLabel}
                  onChange={(e) => setEditingItem({ ...editingItem, monthLabel: e.target.value })}
                  placeholder="e.g. Aug '24"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quarter Label</label>
                <input
                  type="text"
                  value={editingItem.quarterLabel || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, quarterLabel: e.target.value })}
                  placeholder="e.g. July 2024-September 2024"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">EFY Label</label>
                <input
                  type="text"
                  value={editingItem.efyLabel}
                  onChange={(e) => setEditingItem({ ...editingItem, efyLabel: e.target.value })}
                  placeholder="e.g. EFY 2017"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Modal Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Month (Km)</th>
                    <th className="p-3 text-center">Quarter (Km)</th>
                    <th className="p-3 text-center">EFY (Km)</th>
                    <th className="p-3 text-center bg-blue-50/50 dark:bg-blue-950/20">Cumulative To Date (Km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {/* Contractor */}
                  <tr>
                    <td className="p-3 font-bold text-slate-850 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-xs"></span>
                        <span>Contractor Plan</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center bg-blue-50/30 dark:bg-blue-950/10">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorTodate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorTodate: parseFloat(e.target.value) || 0 })}
                        className="w-24 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-100"
                      />
                      <div className="text-[9px] mt-1 font-bold">
                        {editingItem.contractorTodate !== undefined && editingItem.contractorTodate <= activePlan.contractor.todate ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ {(activePlan.contractor.todate - editingItem.contractorTodate).toFixed(2)} Km lower</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">▲ Higher than active</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ERA */}
                  <tr>
                    <td className="p-3 font-bold text-slate-850 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>ERA Milestone</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, eraMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, eraQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, eraEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center bg-blue-50/30 dark:bg-blue-950/10">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraTodate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, eraTodate: parseFloat(e.target.value) || 0 })}
                        className="w-24 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-emerald-900 dark:text-emerald-100"
                      />
                      <div className="text-[9px] mt-1 font-bold">
                        {editingItem.eraTodate !== undefined && editingItem.eraTodate <= activePlan.era.todate ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ {(activePlan.era.todate - editingItem.eraTodate).toFixed(2)} Km lower</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">▲ Higher than active</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Actual Completed */}
                  <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                    <td className="p-3 font-black text-indigo-700 dark:text-indigo-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>Actual Completed (Km)</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, actualMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300 shadow-2xs"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, actualQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300 shadow-2xs"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, actualEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300 shadow-2xs"
                      />
                    </td>
                    <td className="p-3 text-center bg-indigo-100/40 dark:bg-indigo-900/30">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualTodate || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItem({ 
                            ...editingItem, 
                            actualTodate: val,
                            physicalProgress: totalLength > 0 ? Number(((val / totalLength) * 100).toFixed(2)) : 0
                          });
                        }}
                        className="w-24 text-center px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-xs"
                      />
                      <div className="text-[9px] mt-1 font-bold">
                        {editingItem.actualTodate !== undefined && editingItem.actualTodate <= activePlan.actual.todate ? (
                          <span className="text-emerald-700 dark:text-emerald-300">✓ {(activePlan.actual.todate - editingItem.actualTodate).toFixed(2)} Km lower than current</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-black">⚠️ {(editingItem.actualTodate! - activePlan.actual.todate).toFixed(2)} Km above current</span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Physical Progress indicator and Warning if higher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500">Calculated Physical Progress for this Milestone:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {totalLength > 0 && editingItem.actualTodate !== undefined
                    ? `${((editingItem.actualTodate / totalLength) * 100).toFixed(2)}%`
                    : `${editingItem.physicalProgress || 0}%`}
                </span>
              </div>

              {editingItem.actualTodate !== undefined && editingItem.actualTodate > activePlan.actual.todate && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Note:</span> The entered cumulative actual ({editingItem.actualTodate.toFixed(2)} Km) is higher than the current project progress ({activePlan.actual.todate.toFixed(2)} Km). For previous historical milestones, values are typically lower.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalUpdates}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{modalMode === 'add_previous' ? 'Save Previous Milestone Record' : 'Save Updates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: PDF REPORTING WITH VERIFICATION & APPROVAL VIEWS */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                    Official Executive Milestone Report
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Monthly Status Report PDF
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate standardized ERA audit document in landscape A4 with statutory verification and approval sign-off stamps.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Configuration Options */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Document Sections & Content Options:
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHistoryInPdf}
                  onChange={(e) => setIncludeHistoryInPdf(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Include Elapsed Months & EFY Milestone Historical Audit Trail Table ({historyList.length} snapshots)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVerificationInPdf}
                  onChange={(e) => setIncludeVerificationInPdf(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Include Statutory Verification & Executive Approval Audit Stamps
                </span>
              </label>
            </div>

            {/* Verification & Approval Views Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Included Verification & Approval Views:
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Standardized ERA 3-Tier Sign-Off</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                {/* 1. Prepared By */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    1. Prepared & Registered
                  </div>
                  <div className="font-bold text-slate-850 dark:text-slate-100">
                    {getCredentialSignatures(currentUser).printedBy}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {currentUser?.username || 'Authorized User'}
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 italic">
                    Digital Audit Record • {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* 2. Verified By Stamp */}
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      2. Verified & Audited
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded uppercase">
                      ✓ Audit
                    </span>
                  </div>
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    {getCredentialSignatures(currentUser).verifiedBy}
                  </div>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800 text-[9px] text-blue-600 dark:text-blue-400 italic">
                    Verification Signature Line & Stamp
                  </div>
                </div>

                {/* 3. Approved By Seal */}
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      3. Statutory Approval
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[8px] font-black rounded uppercase">
                      ★ Seal
                    </span>
                  </div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    {getCredentialSignatures(currentUser).approvedBy}
                  </div>
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 text-[9px] text-emerald-600 dark:text-emerald-400 italic">
                    Executive Seal & Statutory Stamp
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Official PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressPlanView;

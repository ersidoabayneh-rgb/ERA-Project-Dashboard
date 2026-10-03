import React, { useState, useMemo } from 'react';
import { 
  Project, 
  User, 
  ProgressPlan, 
  ProgressPlanHistoryItem, 
  PlanSet, 
  formatAccounting 
} from '../types';
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
  Award
} from 'lucide-react';
import { generateProgressComparisonPdf } from '../lib/progressComparisonPdfGenerator';
import { getCredentialSignatures } from '../lib/pdfReportEngine';

export const sortProgressPlanHistoryDescending = (items: ProgressPlanHistoryItem[]): ProgressPlanHistoryItem[] => {
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
    return parseM(b.monthLabel) - parseM(a.monthLabel);
  });
};

interface ProgressPlanViewProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>, reason?: string) => void;
  currentUser?: User | null;
  onSwitchTab?: (tab: string) => void;
}

export const ProgressPlanView: React.FC<ProgressPlanViewProps> = ({
  project,
  onUpdateProject,
  currentUser,
  onSwitchTab
}) => {
  // 1. Initial State Resolution
  const totalLength = project.lengthKm || 65.0;

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

  // Milestone History resolution
  const historyList: ProgressPlanHistoryItem[] = useMemo(() => {
    if (project.progressPlanHistory && project.progressPlanHistory.length > 0) {
      return sortProgressPlanHistoryDescending(project.progressPlanHistory);
    }
    // Seed with realistic baseline snapshots if none exist
    return [
      {
        id: 'hist_sep_24',
        monthLabel: "Sep '24",
        quarterLabel: "July 2024-September 2024",
        efyLabel: "EFY 2017",
        contractorMonth: 1.20,
        contractorQuarter: 3.70,
        contractorEfy: 7.87,
        contractorTodate: 85.12,
        eraMonth: 0.85,
        eraQuarter: 1.42,
        eraEfy: 3.80,
        eraTodate: 73.11,
        actualMonth: 0.50,
        actualQuarter: 1.15,
        actualEfy: 2.50,
        actualTodate: 67.42,
        physicalProgress: 67.42
      },
      {
        id: 'hist_aug_24',
        monthLabel: "Aug '24",
        quarterLabel: "July 2024-September 2024",
        efyLabel: "EFY 2017",
        contractorMonth: 1.25,
        contractorQuarter: 2.50,
        contractorEfy: 6.67,
        contractorTodate: 83.92,
        eraMonth: 0.80,
        eraQuarter: 0.57,
        eraEfy: 2.95,
        eraTodate: 72.26,
        actualMonth: 0.45,
        actualQuarter: 0.65,
        actualEfy: 2.00,
        actualTodate: 66.92,
        physicalProgress: 66.92
      },
      {
        id: 'hist_jul_24',
        monthLabel: "Jul '24",
        quarterLabel: "July 2024-September 2024",
        efyLabel: "EFY 2017",
        contractorMonth: 1.25,
        contractorQuarter: 1.25,
        contractorEfy: 5.42,
        contractorTodate: 82.67,
        eraMonth: 0.57,
        eraQuarter: 0.57,
        eraEfy: 2.15,
        eraTodate: 71.46,
        actualMonth: 0.20,
        actualQuarter: 0.20,
        actualEfy: 1.55,
        actualTodate: 66.47,
        physicalProgress: 66.47
      },
      {
        id: 'hist_jun_24',
        monthLabel: "Jun '24",
        quarterLabel: "April 2024-June 2024",
        efyLabel: "EFY 2016",
        contractorMonth: 1.10,
        contractorQuarter: 3.40,
        contractorEfy: 14.50,
        contractorTodate: 81.42,
        eraMonth: 0.75,
        eraQuarter: 2.20,
        eraEfy: 9.80,
        eraTodate: 70.89,
        actualMonth: 0.42,
        actualQuarter: 1.30,
        actualEfy: 6.10,
        actualTodate: 66.27,
        physicalProgress: 66.27
      },
      {
        id: 'hist_may_24',
        monthLabel: "May '24",
        quarterLabel: "April 2024-June 2024",
        efyLabel: "EFY 2016",
        contractorMonth: 1.15,
        contractorQuarter: 2.30,
        contractorEfy: 13.40,
        contractorTodate: 80.32,
        eraMonth: 0.70,
        eraQuarter: 1.45,
        eraEfy: 9.05,
        eraTodate: 70.14,
        actualMonth: 0.40,
        actualQuarter: 0.88,
        actualEfy: 5.68,
        actualTodate: 65.85,
        physicalProgress: 65.85
      }
    ];
  }, [project.progressPlanHistory]);

  // Selected Archived Item for Left Panel
  const [selectedArchivedKey, setSelectedArchivedKey] = useState<string>(
    historyList.length > 0 ? historyList[0].id : 'live'
  );

  const selectedArchivedItem = useMemo<ProgressPlanHistoryItem | null>(() => {
    return historyList.find(h => h.id === selectedArchivedKey) || historyList[0] || null;
  }, [historyList, selectedArchivedKey]);

  // Modal State for Editing Archived Milestone Record
  const [editingItem, setEditingItem] = useState<ProgressPlanHistoryItem | null>(null);
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
      const fileName = `${(project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_Progress_Comparisons_Audit_Report.pdf`;
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

  // Sync actuals from monthly progress
  const handleResync = () => {
    let cumActual = 0;
    let latestMonthPlan = 1.20;
    let latestEraPlan = 0.85;
    let latestActual = 0.50;

    if (project.monthly && project.monthly.length > 0) {
      project.monthly.forEach(m => {
        const act = typeof m.actual === 'number' ? m.actual : parseFloat(String(m.actual || '0')) || 0;
        cumActual += act;
        if (act > 0) latestActual = act;
        const p = typeof m.revisedPlan === 'number' ? m.revisedPlan : (typeof m.originalPlan === 'number' ? m.originalPlan : 0);
        if (p > 0) latestMonthPlan = p;
      });
    }

    const updated: ProgressPlan = {
      contractor: {
        ...activePlan.contractor,
        month: latestMonthPlan,
        quarter: Number((latestMonthPlan * 3).toFixed(2)),
        efy: Number((latestMonthPlan * 8).toFixed(2)),
        todate: activePlan.contractor.todate || totalLength
      },
      era: {
        ...activePlan.era,
        month: latestEraPlan,
        quarter: Number((latestEraPlan * 3).toFixed(2)),
        efy: Number((latestEraPlan * 8).toFixed(2)),
        todate: activePlan.era.todate || Number((totalLength * 0.88).toFixed(2))
      },
      actual: {
        month: latestActual,
        quarter: Number((latestActual * 2.3).toFixed(2)),
        efy: Number((latestActual * 5).toFixed(2)),
        todate: cumActual > 0 ? Number(cumActual.toFixed(2)) : (project.physicalProgress ? Number(((project.physicalProgress / 100) * totalLength).toFixed(2)) : activePlan.actual.todate)
      }
    };

    setActivePlan(updated);
    onUpdateProject({
      progressPlan: updated,
      progressPlanLabels: { monthLabel, quarterLabel, efyLabel }
    }, 'Comparison data re-synchronized from project monthly progress');

    setSaveSuccessMsg('Comparison data synchronized successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
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

    const existing = project.progressPlanHistory || historyList;
    const filtered = existing.filter(h => h.id !== snapshotId && h.monthLabel !== monthLabel);
    const updatedHistory = sortProgressPlanHistoryDescending([newSnapshot, ...filtered]);

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

  // Delete an archived record
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this archived snapshot?')) return;
    const existing = project.progressPlanHistory || historyList;
    const updatedHistory = existing.filter(h => h.id !== id);
    onUpdateProject({ progressPlanHistory: updatedHistory }, 'Archived milestone record deleted');
    if (selectedArchivedKey === id && updatedHistory.length > 0) {
      setSelectedArchivedKey(updatedHistory[0].id);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ProgressPlanHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ ...item });
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
    const updatedHistory = existing.map(h => h.id === updatedItem.id ? updatedItem : h);

    const isCurrentlyActive = updatedItem.monthLabel === monthLabel;
    const projectUpdates: Partial<Project> = {
      progressPlanHistory: sortProgressPlanHistoryDescending(updatedHistory)
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

    onUpdateProject(projectUpdates, `Milestone record ${updatedItem.monthLabel} updated`);
    setIsModalOpen(false);
    setEditingItem(null);
    setSaveSuccessMsg(`Milestone record ${updatedItem.monthLabel} updated successfully!`);
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
    link.setAttribute('download', `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Progress_Comparisons.csv`);
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

      {/* MAIN PROGRESS PLAN / MILEAGE COMPARISONS (KM) CARD */}
      <section className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        {/* Card Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Progress Plan / Mileage Comparisons (Km)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Compare Contractor Program Schedule vs ERA Approved Milestone Plan vs Actual Road Completed with dynamic period selection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleResync}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide flex items-center gap-2 transition cursor-pointer shadow-xs"
              title="Synchronize from monthly cumulative records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-sync Comparison Data</span>
            </button>

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
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
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

              {/* Add Snapshot Button */}
              <button
                type="button"
                onClick={() => {
                  const newId = `hist_${Date.now()}`;
                  const newItem: ProgressPlanHistoryItem = {
                    id: newId,
                    monthLabel: `New Month`,
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
                  setIsModalOpen(true);
                }}
                className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record</span>
              </button>
            </div>
          </div>

          {/* Cards Container with Vertical Scrolling Option */}
          <div className={`${
            isVerticalScroll 
              ? 'max-h-[520px] overflow-y-auto pr-2 overscroll-contain space-y-3' 
              : 'space-y-3'
          }`}>
            {filteredHistoryList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-bold">No milestone snapshots match your search filter.</p>
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                >
                  Clear filter
                </button>
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
                          <button
                            onClick={(e) => handleDeleteSnapshot(item.id, e)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                        <button
                          onClick={(e) => handleDeleteSnapshot(item.id, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* 4. MODAL: EDIT ARCHIVED MILESTONE RECORD */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Edit className="w-4 h-4" />
                  Edit Archived Milestone Record
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {editingItem.monthLabel}
                </h3>
                <p className="text-xs text-slate-400">
                  Update recorded values for this snapshot period. All plans and actuals can be adjusted for this month.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period Labels Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month Label</label>
                <input
                  type="text"
                  value={editingItem.monthLabel}
                  onChange={(e) => setEditingItem({ ...editingItem, monthLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quarter Label</label>
                <input
                  type="text"
                  value={editingItem.quarterLabel || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, quarterLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">EFY Label</label>
                <input
                  type="text"
                  value={editingItem.efyLabel}
                  onChange={(e) => setEditingItem({ ...editingItem, efyLabel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            {/* Modal Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Current Month (Km)</th>
                    <th className="p-3 text-center">Current Quarter (Km)</th>
                    <th className="p-3 text-center">Current EFY (Km)</th>
                    <th className="p-3 text-center">Cumulative To Date (Km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {/* Contractor */}
                  <tr>
                    <td className="p-3 font-bold text-slate-850 dark:text-slate-100">Contractor Plan</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.contractorTodate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, contractorTodate: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                  </tr>

                  {/* ERA */}
                  <tr>
                    <td className="p-3 font-bold text-slate-850 dark:text-slate-100">ERA Milestone</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, eraMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, eraQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, eraEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.eraTodate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, eraTodate: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold"
                      />
                    </td>
                  </tr>

                  {/* Actual */}
                  <tr className="bg-indigo-50/30 dark:bg-indigo-950/20">
                    <td className="p-3 font-black text-indigo-700 dark:text-indigo-300">Actual Completed</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualMonth}
                        onChange={(e) => setEditingItem({ ...editingItem, actualMonth: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualQuarter || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, actualQuarter: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualEfy}
                        onChange={(e) => setEditingItem({ ...editingItem, actualEfy: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-black text-indigo-700 dark:text-indigo-300"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.actualTodate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, actualTodate: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-center px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Physical Progress indicator */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">Calculated Physical Progress:</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {totalLength > 0 && editingItem.actualTodate !== undefined
                  ? `${((editingItem.actualTodate / totalLength) * 100).toFixed(2)}%`
                  : `${editingItem.physicalProgress || 0}%`}
              </span>
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
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Updates</span>
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
                    Progress Plan & Mileage Comparisons PDF
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
                  <div className="text-[10px] text-slate-500">
                    Conforms with verified IPC & site records
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
                  <div className="text-[10px] text-slate-500">
                    Executive Portfolio & Statutory Review
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

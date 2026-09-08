import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  Search,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  Edit3,
  Trash2,
  Copy,
  Save,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  Table as TableIcon,
  Users,
  X,
  Check,
  Building2
} from 'lucide-react';
import {
  Project,
  SupervisionConsultantInfo,
  ConsultantSubmittalKpi,
  User
} from '../types';
import { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS, calculateElapsedDays, checkSubmittalDelay } from './ConsultantPerformanceKpiWidget';

interface SubmittalLogViewProps {
  project: Project;
  projects?: Project[];
  onSelectProject?: (proj: Project) => void;
  onProjectUpdate?: (updatedFields: Partial<Project>, actionDescription?: string) => void;
  isReadonly?: boolean;
  currentUserObj?: User | null;
}

export default function SubmittalLogView({
  project,
  projects = [],
  onSelectProject,
  onProjectUpdate,
  isReadonly = false,
  currentUserObj
}: SubmittalLogViewProps) {
  const consultant: SupervisionConsultantInfo = useMemo(() => {
    if (project.supervisionConsultant) {
      return {
        ...project.supervisionConsultant,
        firmName: project.supervisionConsultant.firmName || project.consultant || 'Supervision Consultant JV',
        submittalKpis: project.supervisionConsultant.submittalKpis !== undefined ? project.supervisionConsultant.submittalKpis : (project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : []),
        targetOverrides: project.supervisionConsultant.targetOverrides || DEFAULT_SLA_TARGETS
      };
    }
    return {
      firmName: project.consultant || 'Supervision Consultant JV',
      submittalKpis: project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : [],
      targetOverrides: DEFAULT_SLA_TARGETS
    };
  }, [project.supervisionConsultant, project.consultant, project.id]);

  const targetOverrides = useMemo(() => {
    return {
      ...DEFAULT_SLA_TARGETS,
      ...(consultant.targetOverrides || {})
    };
  }, [consultant.targetOverrides]);

  const submittalsList: ConsultantSubmittalKpi[] = useMemo(() => {
    let baseList: ConsultantSubmittalKpi[] = [];
    if (consultant.submittalKpis !== undefined) {
      baseList = [...consultant.submittalKpis];
    } else if (project?.id === 'proj_default') {
      baseList = [...DEFAULT_SUBMITTAL_KPIS];
    }

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
  }, [consultant.submittalKpis, project?.id, project?.ipcTracker, consultant.residentEngineerName, consultant.commencementDate, targetOverrides]);

  // Search & filter states
  const [submittalSearch, setSubmittalSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Metrics summary for evaluation linkage
  const metricsSummary = useMemo(() => {
    const total = submittalsList.length;
    let totalDays = 0;
    let daysCount = 0;
    let delayedCount = 0;
    let pendingCount = 0;
    let closedCount = 0;

    submittalsList.forEach(s => {
      const target = s.targetDays || targetOverrides[s.type] || 7;
      const delayInfo = checkSubmittalDelay(s, target);
      if (delayInfo.isDelayed) {
        delayedCount++;
      }
      if (delayInfo.isResolved) {
        closedCount++;
      } else {
        pendingCount++;
      }
      if (delayInfo.elapsedDays !== undefined && !isNaN(delayInfo.elapsedDays)) {
        totalDays += delayInfo.elapsedDays;
        daysCount++;
      }
    });

    const avgDays = daysCount > 0 ? (totalDays / daysCount).toFixed(1) : '0.0';
    const onTimeCount = Math.max(0, total - delayedCount);
    const complianceRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;

    return {
      total,
      closedCount,
      pendingCount,
      delayedCount,
      onTimeCount,
      complianceRate,
      avgDays
    };
  }, [submittalsList, targetOverrides]);

  // Modal states
  const [isAddSubmittalModalOpen, setIsAddSubmittalModalOpen] = useState(false);
  const [isEditSubmittalModalOpen, setIsEditSubmittalModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowDraft, setEditingRowDraft] = useState<ConsultantSubmittalKpi | null>(null);

  // New submittal form
  const [newSubmittalForm, setNewSubmittalForm] = useState<Partial<ConsultantSubmittalKpi>>({
    submittalNo: `RFI-0${submittalsList.length + 1}`,
    type: 'RFI',
    title: '',
    submittedDate: new Date().toISOString().split('T')[0],
    respondedDate: new Date().toISOString().split('T')[0],
    targetDays: 7,
    actualDays: 4,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: consultant.residentEngineerName || 'Resident Engineer',
    notes: ''
  });

  const commitSubmittals = (updatedList: ConsultantSubmittalKpi[], actionDesc: string) => {
    if (!onProjectUpdate) return;
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      submittalKpis: updatedList
    };
    onProjectUpdate({
      supervisionConsultant: updatedConsultant
    }, `Submittal Log: ${actionDesc}`);
  };

  const handleSaveNewSubmittal = () => {
    if (!newSubmittalForm.title || !newSubmittalForm.submittalNo) return;

    let actualDays = Number(newSubmittalForm.actualDays);
    if (newSubmittalForm.respondedDate && newSubmittalForm.submittedDate) {
      const diff = Math.round((new Date(newSubmittalForm.respondedDate).getTime() - new Date(newSubmittalForm.submittedDate).getTime()) / (1000 * 60 * 60 * 24));
      if (!isNaN(diff) && diff >= 0) {
        actualDays = diff;
      }
    }

    const target = Number(newSubmittalForm.targetDays) || targetOverrides[newSubmittalForm.type || 'RFI'] || 7;

    const newRecord: ConsultantSubmittalKpi = {
      id: `sub_${Date.now()}`,
      submittalNo: newSubmittalForm.submittalNo,
      type: (newSubmittalForm.type as any) || 'RFI',
      title: newSubmittalForm.title,
      submittedDate: newSubmittalForm.submittedDate || new Date().toISOString().split('T')[0],
      respondedDate: newSubmittalForm.respondedDate || undefined,
      targetDays: target,
      actualDays: actualDays >= 0 ? actualDays : undefined,
      status: (newSubmittalForm.status as any) || 'Approved / Closed',
      priority: (newSubmittalForm.priority as any) || 'High',
      assignedEngineer: newSubmittalForm.assignedEngineer || consultant.residentEngineerName || '',
      notes: newSubmittalForm.notes || ''
    };

    const updatedList = [newRecord, ...submittalsList];
    commitSubmittals(updatedList, `Added submittal ${newRecord.submittalNo}`);
    setIsAddSubmittalModalOpen(false);
  };

  const handleStartRowEdit = (item: ConsultantSubmittalKpi) => {
    setEditingRowId(item.id);
    setEditingRowDraft({ ...item });
    setIsEditSubmittalModalOpen(true);
  };

  const handleSaveRowEdit = () => {
    if (!editingRowDraft) return;

    let actualDays = editingRowDraft.actualDays;
    if (editingRowDraft.respondedDate && editingRowDraft.submittedDate) {
      const subTime = new Date(editingRowDraft.submittedDate).getTime();
      const resTime = new Date(editingRowDraft.respondedDate).getTime();
      if (!isNaN(subTime) && !isNaN(resTime)) {
        actualDays = Math.max(0, Math.round((resTime - subTime) / (1000 * 60 * 60 * 24)));
      }
    }

    const finalDraft: ConsultantSubmittalKpi = {
      ...editingRowDraft,
      actualDays
    };

    const updatedList = submittalsList.map(item => 
      item.id === finalDraft.id ? finalDraft : item
    );

    commitSubmittals(updatedList, `Updated submittal ${finalDraft.submittalNo}`);
    setEditingRowId(null);
    setEditingRowDraft(null);
    setIsEditSubmittalModalOpen(false);
  };

  const handleDeleteRow = (id: string) => {
    const deletedItem = submittalsList.find(s => s.id === id);
    if (!window.confirm(`Are you sure you want to delete submittal record ${deletedItem?.submittalNo || id}?`)) return;
    const updatedList = submittalsList.filter(item => item.id !== id);
    commitSubmittals(updatedList, `Deleted submittal ${deletedItem?.submittalNo || id}`);
  };

  const handleDuplicateRow = (item: ConsultantSubmittalKpi) => {
    const newRecord: ConsultantSubmittalKpi = {
      ...item,
      id: `sub_${Date.now()}`,
      submittalNo: `${item.submittalNo}-COPY`,
      title: `${item.title} (Copy)`,
      submittedDate: new Date().toISOString().split('T')[0],
      respondedDate: undefined,
      actualDays: undefined,
      status: 'Under Review'
    };

    const updatedList = [newRecord, ...submittalsList];
    commitSubmittals(updatedList, `Duplicated submittal to create ${newRecord.submittalNo}`);
  };

  const handleInsertQuickRow = () => {
    const nextNum = submittalsList.length + 1;
    const newRecord: ConsultantSubmittalKpi = {
      id: `sub_${Date.now()}`,
      submittalNo: `RFI-0${nextNum < 10 ? '0' + nextNum : nextNum}`,
      type: 'RFI',
      title: 'New Technical Clarification Inquiry / Submittal',
      submittedDate: new Date().toISOString().split('T')[0],
      respondedDate: undefined,
      targetDays: targetOverrides['RFI'] || 7,
      actualDays: undefined,
      status: 'Under Review',
      priority: 'High',
      assignedEngineer: consultant.residentEngineerName || 'Resident Engineer',
      notes: ''
    };

    const updatedList = [newRecord, ...submittalsList];
    commitSubmittals(updatedList, `Inserted quick submittal row ${newRecord.submittalNo}`);
    handleStartRowEdit(newRecord);
  };

  const filteredSubmittals = useMemo(() => {
    return submittalsList.filter(item => {
      const matchesSearch = submittalSearch === '' || 
        item.submittalNo.toLowerCase().includes(submittalSearch.toLowerCase()) ||
        item.title.toLowerCase().includes(submittalSearch.toLowerCase()) ||
        (item.assignedEngineer && item.assignedEngineer.toLowerCase().includes(submittalSearch.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(submittalSearch.toLowerCase()));

      const matchesType = selectedTypeFilter === 'ALL' || item.type === selectedTypeFilter;
      
      const target = item.targetDays || targetOverrides[item.type] || 7;
      const delayInfo = checkSubmittalDelay(item, target);
      let matchesStatus = true;

      if (selectedStatusFilter === 'ALL') {
        matchesStatus = true;
      } else if (selectedStatusFilter === 'PENDING' || selectedStatusFilter === 'Under Review') {
        matchesStatus = delayInfo.isPending;
      } else if (selectedStatusFilter === 'PENDING_OVERDUE') {
        matchesStatus = delayInfo.isPending && delayInfo.isOverdue;
      } else if (selectedStatusFilter === 'CLOSED') {
        matchesStatus = item.status === 'Approved / Closed' || item.status === 'Approved with Comments';
      } else if (selectedStatusFilter === 'OVERDUE' || selectedStatusFilter === 'Overdue') {
        matchesStatus = delayInfo.isOverdue;
      } else if (selectedStatusFilter === 'ON_TIME') {
        matchesStatus = !delayInfo.isOverdue;
      } else {
        matchesStatus = item.status === selectedStatusFilter;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [submittalsList, submittalSearch, selectedTypeFilter, selectedStatusFilter, targetOverrides]);

  const handleExportCsv = () => {
    const headers = ['Submittal No', 'Type', 'Title / Subject', 'Submitted Date', 'Responded Date', 'Target Days', 'Actual Days', 'Status', 'Priority', 'Assigned Engineer', 'Notes'];
    const rows = filteredSubmittals.map(s => [
      `"${s.submittalNo}"`,
      `"${s.type}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.submittedDate}"`,
      `"${s.respondedDate || ''}"`,
      s.targetDays,
      s.actualDays !== undefined ? s.actualDays : '',
      `"${s.status}"`,
      `"${s.priority}"`,
      `"${(s.assignedEngineer || '').replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Submittal_Log_${project.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Project Selector Bar if projects array provided */}
      {projects && projects.length > 1 && onSelectProject && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Project Context</span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">{project.name || 'Current Project'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Switch Project:</span>
            <select
              value={project.id}
              onChange={(e) => {
                const targetProj = projects.find(p => p.id === e.target.value);
                if (targetProj && onSelectProject) {
                  onSelectProject(targetProj);
                }
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {projects.map((p, pIdx) => (
                <option key={`proj-sublog-${p.id || pIdx}`} value={p.id}>
                  {p.name || `Project ${pIdx + 1}`} ({p.lengthKm || 65} km)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Submittal Register & RFI Tracking
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {submittalsList.length} Total Records
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Supervision Consultant Submittal & RFI Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive register of technical requests for information (RFIs), material approvals, IPC reviews, design drawings, and work inspection requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isReadonly && (
            <button
              onClick={handleInsertQuickRow}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Submittal Item
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI & Evaluation Live Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Submittals</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {metricsSummary.total}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {metricsSummary.closedCount} resolved / closed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>SLA Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {metricsSummary.complianceRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {metricsSummary.onTimeCount} on-time vs target SLA
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Avg Turnaround</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
            {metricsSummary.avgDays} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Average response time
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pending & Overdue</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono mt-1 flex items-baseline gap-1.5">
            <span className={metricsSummary.delayedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
              {metricsSummary.delayedCount}
            </span>
            <span className="text-xs font-normal text-slate-400">
              delayed / {metricsSummary.pendingCount} open
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Active SLA monitoring
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={submittalSearch}
            onChange={(e) => setSubmittalSearch(e.target.value)}
            placeholder="Search by submittal #, subject, assigned engineer, or notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="RFI">Technical RFI</option>
              <option value="Material Approval">Material Approval</option>
              <option value="IPC Review">IPC Review</option>
              <option value="Work Inspection (WIR)">Work Inspection (WIR)</option>
              <option value="Variation Order">Variation Order</option>
              <option value="Design Review">Design Review</option>
              <option value="Claim / Notice">Claim / Notice</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Under Review (Pending)</option>
              <option value="PENDING_OVERDUE">Pending Overdue</option>
              <option value="CLOSED">Approved / Closed</option>
              <option value="OVERDUE">Overdue (Delayed)</option>
              <option value="ON_TIME">On-Time</option>
              <option value="Rejected / Resubmit">Rejected / Resubmit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submittals Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                <th className="p-3.5">Submittal #</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Subject / Description</th>
                <th className="p-3.5">Submitted</th>
                <th className="p-3.5">Responded</th>
                <th className="p-3.5 text-center">Target SLA</th>
                <th className="p-3.5 text-center">Actual Turnaround</th>
                <th className="p-3.5">Status & Delay</th>
                <th className="p-3.5">Assigned Engineer</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredSubmittals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No submittal records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmittals.map((item, idx) => {
                  const target = item.targetDays || targetOverrides[item.type] || 7;
                  const delayInfo = checkSubmittalDelay(item, target);

                  return (
                    <tr 
                      key={`sublog-${item.id}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {item.submittalNo}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={item.title}>
                          {item.title}
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={item.notes}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.submittedDate || '-'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.respondedDate || <span className="text-amber-500 font-semibold italic">Pending</span>}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {target}d
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {delayInfo.isResolved ? (
                          <span className={`font-bold ${delayInfo.isDelayed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {delayInfo.elapsedDays}d
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {delayInfo.elapsedDays}d <span className="text-[9px] opacity-80">(Elapsed)</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold w-fit ${
                            item.status === 'Approved / Closed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            item.status === 'Approved with Comments' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                            item.status === 'Rejected / Resubmit' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {item.status}
                          </span>
                          {delayInfo.isDelayed && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              ⚠️ +{delayInfo.delayDays}d Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {item.assignedEngineer || '-'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartRowEdit(item)}
                            title="Edit Submittal"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateRow(item)}
                            title="Duplicate Submittal"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!isReadonly && (
                            <button
                              onClick={() => handleDeleteRow(item.id)}
                              title="Delete Submittal"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* EDIT / ADD MODAL */}
      <AnimatePresence>
        {isEditSubmittalModalOpen && editingRowDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Edit Submittal Record
                </h3>
                <button
                  onClick={() => setIsEditSubmittalModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs overflow-y-auto max-h-[60vh] pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Submittal Reference #</label>
                    <input
                      type="text"
                      value={editingRowDraft.submittalNo}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, submittalNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={editingRowDraft.type}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="RFI">Technical RFI</option>
                      <option value="Material Approval">Material Approval</option>
                      <option value="IPC Review">IPC Review</option>
                      <option value="Work Inspection (WIR)">Work Inspection (WIR)</option>
                      <option value="Variation Order">Variation Order</option>
                      <option value="Design Review">Design Review</option>
                      <option value="Claim / Notice">Claim / Notice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject / Description</label>
                  <input
                    type="text"
                    value={editingRowDraft.title}
                    onChange={(e) => setEditingRowDraft({ ...editingRowDraft, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Submitted Date</label>
                    <input
                      type="date"
                      value={editingRowDraft.submittedDate || ''}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, submittedDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Responded Date</label>
                    <input
                      type="date"
                      value={editingRowDraft.respondedDate || ''}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, respondedDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target SLA (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingRowDraft.targetDays || 7}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, targetDays: parseInt(e.target.value) || 7 })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={editingRowDraft.status}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="Approved / Closed">Approved / Closed</option>
                      <option value="Approved with Comments">Approved with Comments</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Rejected / Resubmit">Rejected / Resubmit</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reviewing Engineer</label>
                  <input
                    type="text"
                    value={editingRowDraft.assignedEngineer || ''}
                    onChange={(e) => setEditingRowDraft({ ...editingRowDraft, assignedEngineer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes & Technical Verdict</label>
                  <textarea
                    rows={3}
                    value={editingRowDraft.notes || ''}
                    onChange={(e) => setEditingRowDraft({ ...editingRowDraft, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsEditSubmittalModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRowEdit}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

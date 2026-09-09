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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  Building2,
  Paperclip,
  File,
  Upload,
  Eye,
  ExternalLink,
  MoveVertical
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

  // Sorting states (default: submittedDate descending = newest date first)
  type SortField = 'submittedDate' | 'respondedDate' | 'submittalNo' | 'type' | 'actualDays' | 'status' | 'attachmentsCount';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('submittedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Table scrolling height state
  const [tableScrollHeight, setTableScrollHeight] = useState<'450px' | '650px' | '850px' | 'full'>('650px');

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

  // Attachment upload modal state
  const [activeAttachmentSubmittal, setActiveAttachmentSubmittal] = useState<ConsultantSubmittalKpi | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState<string | null>(null);

  const handleOpenAttachmentModal = (submittal: ConsultantSubmittalKpi) => {
    setActiveAttachmentSubmittal(submittal);
    setAttachmentUploadError(null);
    setIsAttachmentModalOpen(true);
  };

  const processPdfFiles = (files: FileList | File[]) => {
    const pdfFiles: File[] = [];
    let invalidCount = 0;

    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(file);
      } else {
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      setAttachmentUploadError(`${invalidCount} file(s) skipped. Only PDF documents (.pdf) are allowed.`);
    } else {
      setAttachmentUploadError(null);
    }

    return pdfFiles;
  };

  const handleDirectPdfUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSubmittal: ConsultantSubmittalKpi) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const validPdfs = processPdfFiles(e.target.files);
    if (validPdfs.length === 0) return;

    const newAttachments = validPdfs.map(file => {
      const sizeMb = file.size / (1024 * 1024);
      const formattedSize = sizeMb >= 0.1 ? `${sizeMb.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: formattedSize,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString().split('T')[0]
      };
    });

    const existingAtts = targetSubmittal.attachments || [];
    const updatedAtts = [...existingAtts, ...newAttachments];

    const updatedSubmittal: ConsultantSubmittalKpi = {
      ...targetSubmittal,
      attachments: updatedAtts,
      attachmentsCount: updatedAtts.length
    };

    const updatedList = submittalsList.map(s => s.id === updatedSubmittal.id ? updatedSubmittal : s);
    commitSubmittals(updatedList, `Uploaded ${validPdfs.length} PDF attachment(s) to submittal ${targetSubmittal.submittalNo}`);
    
    if (activeAttachmentSubmittal && activeAttachmentSubmittal.id === targetSubmittal.id) {
      setActiveAttachmentSubmittal(updatedSubmittal);
    }
    if (editingRowDraft && editingRowDraft.id === targetSubmittal.id) {
      setEditingRowDraft(updatedSubmittal);
    }

    e.target.value = '';
  };

  const handleRemoveAttachment = (targetSubmittal: ConsultantSubmittalKpi, attachmentId: string) => {
    const existingAtts = targetSubmittal.attachments || [];
    const updatedAtts = existingAtts.filter(a => a.id !== attachmentId);

    const updatedSubmittal: ConsultantSubmittalKpi = {
      ...targetSubmittal,
      attachments: updatedAtts,
      attachmentsCount: updatedAtts.length
    };

    const updatedList = submittalsList.map(s => s.id === updatedSubmittal.id ? updatedSubmittal : s);
    commitSubmittals(updatedList, `Removed attachment from submittal ${targetSubmittal.submittalNo}`);

    if (activeAttachmentSubmittal && activeAttachmentSubmittal.id === targetSubmittal.id) {
      setActiveAttachmentSubmittal(updatedSubmittal);
    }
    if (editingRowDraft && editingRowDraft.id === targetSubmittal.id) {
      setEditingRowDraft(updatedSubmittal);
    }
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

  // Order/sort filtered submittals dynamically
  const sortedSubmittals = useMemo(() => {
    return [...filteredSubmittals].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'submittedDate') {
        const timeA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
        const timeB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === 'respondedDate') {
        const timeA = a.respondedDate ? new Date(a.respondedDate).getTime() : 0;
        const timeB = b.respondedDate ? new Date(b.respondedDate).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === 'submittalNo') {
        comparison = a.submittalNo.localeCompare(b.submittalNo, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === 'actualDays') {
        const targetA = a.targetDays || targetOverrides[a.type] || 7;
        const delayInfoA = checkSubmittalDelay(a, targetA);
        const targetB = b.targetDays || targetOverrides[b.type] || 7;
        const delayInfoB = checkSubmittalDelay(b, targetB);
        const daysA = delayInfoA.elapsedDays ?? 0;
        const daysB = delayInfoB.elapsedDays ?? 0;
        comparison = daysA - daysB;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'attachmentsCount') {
        const countA = a.attachmentsCount ?? a.attachments?.length ?? 0;
        const countB = b.attachmentsCount ?? b.attachments?.length ?? 0;
        comparison = countA - countB;
      }

      if (comparison === 0) {
        // Fallback secondary sort: submittedDate desc, then submittalNo
        const timeA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
        const timeB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        return b.submittalNo.localeCompare(a.submittalNo, undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredSubmittals, sortField, sortDirection, targetOverrides]);

  const handleToggleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'submittedDate' || field === 'respondedDate' || field === 'actualDays' || field === 'attachmentsCount') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const handleExportCsv = () => {
    const headers = ['Submittal No', 'Type', 'Title / Subject', 'Attachments Count', 'Submitted Date', 'Responded Date', 'Target Days', 'Actual Days', 'Status', 'Priority', 'Assigned Engineer', 'Notes'];
    const rows = sortedSubmittals.map(s => [
      `"${s.submittalNo}"`,
      `"${s.type}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      s.attachmentsCount ?? s.attachments?.length ?? 0,
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
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Submittal Register & RFI Tracking
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-purple-500" /> {project.name || 'Current Project'}
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {submittalsList.length} Total Records
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Supervision Consultant Submittal & RFI Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive register of technical requests for information (RFIs), material approvals, IPC reviews, design drawings, and work inspection requests for <strong className="text-slate-700 dark:text-slate-300">{project.name || 'Current Project'}</strong>.
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
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-500" /> Sort By:
            </span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                setSortField(f);
                setSortDirection(d);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="submittedDate-desc">Submitted Date (Newest First)</option>
              <option value="submittedDate-asc">Submitted Date (Oldest First)</option>
              <option value="respondedDate-desc">Responded Date (Newest First)</option>
              <option value="respondedDate-asc">Responded Date (Oldest First)</option>
              <option value="submittalNo-asc">Submittal No (Ascending A-Z)</option>
              <option value="submittalNo-desc">Submittal No (Descending Z-A)</option>
              <option value="attachmentsCount-desc">Attachments (Most First)</option>
              <option value="attachmentsCount-asc">Attachments (Fewest First)</option>
              <option value="actualDays-desc">Turnaround Days (Longest First)</option>
              <option value="actualDays-asc">Turnaround Days (Shortest First)</option>
              <option value="type-asc">Category / Type (A-Z)</option>
              <option value="status-asc">Status</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
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

          <div className="flex items-center gap-1.5 text-xs border-l border-slate-200 dark:border-slate-700 pl-3">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <MoveVertical className="w-3.5 h-3.5 text-indigo-500" /> Height / Scroll:
            </span>
            <select
              value={tableScrollHeight}
              onChange={(e) => setTableScrollHeight(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="650px">Standard Scroll (650px)</option>
              <option value="450px">Compact Scroll (450px)</option>
              <option value="850px">Tall Scroll (850px)</option>
              <option value="full">Full Height (No Scroll Limit)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submittals Data Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        {/* Scrollable Table Area */}
        <div 
          id="submittals-table-scroll-container"
          className="overflow-x-auto overflow-y-auto relative scroll-smooth"
          style={{ 
            maxHeight: tableScrollHeight === 'full' ? 'none' : tableScrollHeight 
          }}
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold select-none shadow-2xs">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th 
                  onClick={() => handleToggleHeaderSort('submittalNo')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Submittal #"
                >
                  <div className="flex items-center gap-1">
                    <span>Submittal #</span>
                    {sortField === 'submittalNo' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleHeaderSort('type')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Category"
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {sortField === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th className="p-3.5">Subject / Description</th>
                <th 
                  onClick={() => handleToggleHeaderSort('attachmentsCount')}
                  className="p-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Attachments"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Attachments</span>
                    {sortField === 'attachmentsCount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleHeaderSort('submittedDate')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Submitted Date"
                >
                  <div className="flex items-center gap-1">
                    <span>Submitted</span>
                    {sortField === 'submittedDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleHeaderSort('respondedDate')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Responded Date"
                >
                  <div className="flex items-center gap-1">
                    <span>Responded</span>
                    {sortField === 'respondedDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th className="p-3.5 text-center">Target SLA</th>
                <th 
                  onClick={() => handleToggleHeaderSort('actualDays')}
                  className="p-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Actual Turnaround"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Actual Turnaround</span>
                    {sortField === 'actualDays' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleHeaderSort('status')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition group"
                  title="Click to sort by Status"
                >
                  <div className="flex items-center gap-1">
                    <span>Status & Delay</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                <th className="p-3.5">Assigned Engineer</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {sortedSubmittals.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No submittal records match your filter criteria.
                  </td>
                </tr>
              ) : (
                sortedSubmittals.map((item, idx) => {
                  const target = item.targetDays || targetOverrides[item.type] || 7;
                  const delayInfo = checkSubmittalDelay(item, target);
                  const fileCount = item.attachmentsCount ?? item.attachments?.length ?? 0;

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
                      {/* Attachments Column */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {fileCount > 0 ? (
                            <button
                              onClick={() => handleOpenAttachmentModal(item)}
                              className="relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition cursor-pointer"
                              title="Click to view or upload PDF attachments"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>{fileCount}</span>
                              <Upload className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 ml-0.5" />

                              {/* Floating Rich Tooltip / Popover on Hover */}
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col gap-1.5 z-40 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl text-[11px] border border-slate-700/80 pointer-events-none transition-all text-left">
                                <div className="flex items-center justify-between font-bold border-b border-slate-700/80 pb-1.5 text-indigo-300">
                                  <span className="flex items-center gap-1.5">
                                    <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                                    {fileCount} Attached PDF{fileCount > 1 ? 's' : ''}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Click to Manage</span>
                                </div>
                                {item.attachments && item.attachments.length > 0 ? (
                                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {item.attachments.map((att, i) => (
                                      <li key={att.id || i} className="flex items-center justify-between text-slate-200 truncate gap-1.5 bg-slate-800/80 dark:bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/50">
                                        <span className="truncate flex items-center gap-1.5">
                                          <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                                          <span className="truncate font-medium text-xs" title={att.name}>{att.name}</span>
                                        </span>
                                        {att.size && <span className="text-[9px] font-mono text-slate-400 shrink-0">{att.size}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-slate-300 text-[10px] italic py-1">
                                    {fileCount} attachment document(s) uploaded. Click to view or add PDF files.
                                  </div>
                                )}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 dark:border-t-slate-800"></div>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAttachmentModal(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-[11px] transition font-medium cursor-pointer"
                              title="Click to attach PDF files"
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span>+ PDF</span>
                            </button>
                          )}
                        </div>
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

        {/* Table Footer Navigation & Scroll Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {sortedSubmittals.length}
            </span>
            <span>of {submittalsList.length} submittal records visible</span>
            {submittalSearch && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                Filtered by search
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Height Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-0.5 rounded-xl text-[11px]">
              <span className="px-2 text-slate-400 font-bold">Scroll:</span>
              {(['450px', '650px', '850px', 'full'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setTableScrollHeight(h)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    tableScrollHeight === h
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {h === 'full' ? 'Full' : h.replace('px', '')}
                </button>
              ))}
            </div>

            {/* Scroll to top button */}
            <button
              onClick={() => {
                const container = document.getElementById('submittals-table-scroll-container');
                if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700"
              title="Scroll table back to top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Top</span>
            </button>
          </div>
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

                <div className="grid grid-cols-2 gap-3">
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
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      Attached Files Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingRowDraft.attachmentsCount ?? editingRowDraft.attachments?.length ?? 0}
                      onChange={(e) => {
                        const count = Math.max(0, parseInt(e.target.value) || 0);
                        setEditingRowDraft({
                          ...editingRowDraft,
                          attachmentsCount: count
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* PDF Attachments Upload Section in Edit Modal */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      PDF Documents Attached ({editingRowDraft.attachments?.length || editingRowDraft.attachmentsCount || 0})
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition">
                      <Upload className="w-3.5 h-3.5" />
                      Upload PDF
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => handleDirectPdfUpload(e, editingRowDraft)}
                      />
                    </label>
                  </div>

                  {editingRowDraft.attachments && editingRowDraft.attachments.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {editingRowDraft.attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={att.name}>{att.name}</span>
                            {att.size && <span className="text-[10px] font-mono text-slate-400 shrink-0">({att.size})</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.url && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="View PDF Document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleRemoveAttachment(editingRowDraft, att.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Delete Attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                      No PDF files attached yet. Click <strong>Upload PDF</strong> to attach submittal documents.
                    </div>
                  )}
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

      {/* Standalone Attachment PDF Manager Modal */}
      <AnimatePresence>
        {isAttachmentModalOpen && activeAttachmentSubmittal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Submittal PDF Attachments
                    </h3>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      {activeAttachmentSubmittal.submittalNo} • {activeAttachmentSubmittal.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAttachmentModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Submittal Title Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {activeAttachmentSubmittal.title}
                </p>
              </div>

              {attachmentUploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{attachmentUploadError}</span>
                </div>
              )}

              {/* PDF Drag & Drop Upload Zone */}
              <div className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload Submittal Documents
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select one or more PDF (.pdf) files requested for this submittal
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition">
                  <FileText className="w-3.5 h-3.5" />
                  Browse PDF Files
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => handleDirectPdfUpload(e, activeAttachmentSubmittal)}
                  />
                </label>
              </div>

              {/* List of Attached PDF Files */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Attached PDF Files ({activeAttachmentSubmittal.attachments?.length || 0})</span>
                </h4>

                {activeAttachmentSubmittal.attachments && activeAttachmentSubmittal.attachments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeAttachmentSubmittal.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0 font-bold text-[10px]">
                            PDF
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                              {att.name}
                            </p>
                            {att.size && (
                              <p className="text-[10px] font-mono text-slate-400">
                                {att.size} {att.uploadedAt ? `• Uploaded ${att.uploadedAt}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {att.url ? (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center gap-1"
                              title="Open PDF File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-2">Document Logged</span>
                          )}
                          <button
                            onClick={() => handleRemoveAttachment(activeAttachmentSubmittal, att.id)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Remove PDF File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    No PDF documents currently attached. Use the button above to upload files.
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsAttachmentModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

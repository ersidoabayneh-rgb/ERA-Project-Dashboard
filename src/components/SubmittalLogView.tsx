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
  MoveVertical,
  MessageSquare,
  Printer,
  ShieldAlert,
  Link as LinkIcon,
  Receipt
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawEraLogo, drawStandardDocumentHeader, STRICT_1_INCH_MARGIN, drawDocumentWatermark, safeSplitText } from '../lib/pdfReportEngine';
import { formatPdfDate } from '../lib/dateUtils';
import RfiLogComponent from './RfiLogComponent';
import SubmittalPrintModal from './SubmittalPrintModal';
import {
  Project,
  SupervisionConsultantInfo,
  ConsultantSubmittalKpi,
  User
} from '../types';
import { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS, calculateElapsedDays, checkSubmittalDelay } from './ConsultantPerformanceKpiWidget';
import {
  autoEvaluateAllCriteria,
  calculateComprehensiveEvaluationScore,
  getProjectConsultantEvaluation
} from '../data/consultantEvaluationMatrix';
import { Activity, Zap } from 'lucide-react';

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
          const existing = baseList.find(s => s.id === `ipc_kpi_${ipc.id}` || s.submittalNo === ipc.paymentNo);

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
            assignedEngineer: existing?.assignedEngineer || consultant.residentEngineerName || 'Resident Engineer / Quantity Surveyor',
            notes: existing?.notes || ipc.remarks || `Financial IPC submitted by Contractor on ${ipc.submissionDate || 'N/A'}${ipc.certificationDate ? ` and certified on ${ipc.certificationDate} (${actualDays} days)` : ' (pending Engineer certification)'}.`,
            attachments: existing?.attachments,
            attachmentsCount: existing?.attachmentsCount
          };
        });

      const nonIpcItems = baseList.filter(s => s.type !== 'IPC Review' && !s.id.startsWith('ipc_kpi_'));
      return [...nonIpcItems, ...ipcSubmittals];
    }

    return baseList;
  }, [consultant.submittalKpis, project?.id, project?.ipcTracker, consultant.residentEngineerName, targetOverrides]);

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

  // Contractor role detection
  const isContractorUser = useMemo(() => {
    if (!currentUserObj) return false;
    const r = (currentUserObj.role || '').toLowerCase();
    const u = (currentUserObj.username || '').toLowerCase();
    return r === 'contractor' || r.includes('contractor') || u.includes('contractor');
  }, [currentUserObj]);

  const isContractorEditor = useMemo(() => {
    if (!currentUserObj) return false;
    const r = (currentUserObj.role || '').toLowerCase();
    const u = (currentUserObj.username || '').toLowerCase();
    return (
      r === 'contractor_editor' ||
      u === 'contractor_editor' ||
      r.includes('contractor_editor') ||
      u.includes('contractor_editor')
    );
  }, [currentUserObj]);

  // Credentials Check: Consultant Approver and Master Admin credentials only
  const isConsultantApproverOrMasterAdmin = useMemo(() => {
    if (!currentUserObj) return false;
    const r = (currentUserObj.role || '').toLowerCase();
    const u = (currentUserObj.username || '').toLowerCase();
    const isMasterAdmin = 
      r === 'master_admin' || 
      r === 'admin' || 
      r === 'cpm_admin' || 
      u === 'admin' || 
      u === 'master_admin' || 
      u === 'proj_1781786415663';
    const isConsultantApprover = 
      r === 'consultant_approver' || 
      r === 'approver' || 
      r === 'era_approver' || 
      Boolean(currentUserObj.hasApprovalCredential) || 
      u === 'consultant_approver' || 
      r.includes('consultant_approver');
    return isMasterAdmin || isConsultantApprover;
  }, [currentUserObj]);

  // Watermark state for exported PDFs ('NONE' | 'DRAFT' | 'CONFIDENTIAL')
  const [pdfWatermark, setPdfWatermark] = useState<'NONE' | 'DRAFT' | 'CONFIDENTIAL'>('NONE');

  // Dynamic custom categories list
  const submittalCategories = useMemo<string[]>(() => {
    return consultant.submittalCategories || [
      'Material Approval',
      'IPC Review',
      'Work Inspection (WIR)',
      'Variation Order',
      'Design Review',
      'Claim / Notice'
    ];
  }, [consultant.submittalCategories]);

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Dynamic custom statuses list
  const submittalStatuses = useMemo<string[]>(() => {
    return consultant.submittalStatuses || [
      'Approved',
      'Closed',
      'Approved with Comment',
      'Under Review',
      'Rejected',
      'Resubmit',
      'Overdue'
    ];
  }, [consultant.submittalStatuses]);

  const [showStatusManager, setShowStatusManager] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  // Selected submittals for export (Technical Submittals & RFIs)
  const [selectedSubmittalNos, setSelectedSubmittalNos] = useState<string[]>([]);
  const [selectedRfiIds, setSelectedRfiIds] = useState<string[]>([]);

  // Print Submittals & RFI Register Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalInitialScope, setPrintModalInitialScope] = useState<'all' | 'selected' | 'technical' | 'rfi'>('all');

  const handleOpenPrintModal = (preferredScope?: 'all' | 'selected' | 'technical' | 'rfi') => {
    if (preferredScope) {
      setPrintModalInitialScope(preferredScope);
    } else if (selectedSubmittalNos.length > 0 || selectedRfiIds.length > 0) {
      setPrintModalInitialScope('selected');
    } else if (activeViewTab === 'rfi_log') {
      setPrintModalInitialScope('rfi');
    } else {
      setPrintModalInitialScope('all');
    }
    setIsPrintModalOpen(true);
  };

  // View mode: 'submittals' (technical submittals register) vs 'rfi_log' (dedicated RFI correspondence log)
  const [activeViewTab, setActiveViewTab] = useState<'submittals' | 'rfi_log'>('submittals');

  // Pure technical submittals (excluding RFIs which are tracked exclusively in the RFI Log table)
  const technicalSubmittalsList = useMemo(() => {
    return submittalsList.filter(s => s.type !== 'RFI');
  }, [submittalsList]);

  const rfiCount = useMemo(() => submittalsList.filter(s => s.type === 'RFI').length, [submittalsList]);
  const pendingRfiCount = useMemo(() => submittalsList.filter(s => s.type === 'RFI' && s.status !== 'Approved / Closed' && s.status !== 'Closed').length, [submittalsList]);

  // Modal states
  const [isAddSubmittalModalOpen, setIsAddSubmittalModalOpen] = useState(false);
  const [isEditSubmittalModalOpen, setIsEditSubmittalModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowDraft, setEditingRowDraft] = useState<ConsultantSubmittalKpi | null>(null);

  // New submittal form (Technical Submittals)
  const [newSubmittalForm, setNewSubmittalForm] = useState<Partial<ConsultantSubmittalKpi>>({
    submittalNo: `SUB-0${technicalSubmittalsList.length + 1}`,
    type: 'Material Approval',
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
    const tempConsultant: SupervisionConsultantInfo = {
      ...consultant,
      submittalKpis: updatedList
    };
    
    // Auto-evaluate 105 criteria and calculate 5-dimension & Pillar I composite performance
    const autoEvaluations = autoEvaluateAllCriteria(project, tempConsultant, updatedList);
    const evalSummary = getProjectConsultantEvaluation(project, tempConsultant);
    const dimensionScores = {
      A: { earnedScore: evalSummary.dimensionBreakdown.A.earned, maxScore: evalSummary.dimensionBreakdown.A.maxWeight, scorePct: evalSummary.dimensionBreakdown.A.percentage },
      B: { earnedScore: evalSummary.dimensionBreakdown.B.earned, maxScore: evalSummary.dimensionBreakdown.B.maxWeight, scorePct: evalSummary.dimensionBreakdown.B.percentage },
      C: { earnedScore: evalSummary.dimensionBreakdown.C.earned, maxScore: evalSummary.dimensionBreakdown.C.maxWeight, scorePct: evalSummary.dimensionBreakdown.C.percentage },
      D: { earnedScore: evalSummary.dimensionBreakdown.D.earned, maxScore: evalSummary.dimensionBreakdown.D.maxWeight, scorePct: evalSummary.dimensionBreakdown.D.percentage },
      E: { earnedScore: evalSummary.dimensionBreakdown.E.earned, maxScore: evalSummary.dimensionBreakdown.E.maxWeight, scorePct: evalSummary.dimensionBreakdown.E.percentage },
    };

    const performanceRatingLabel: 'Outstanding' | 'Satisfactory' | 'Needs Improvement' | 'Critical' = 
      evalSummary.overallScore >= 90 ? 'Outstanding' : evalSummary.overallScore >= 75 ? 'Satisfactory' : evalSummary.overallScore >= 60 ? 'Needs Improvement' : 'Critical';

    const updatedConsultant: SupervisionConsultantInfo = {
      ...tempConsultant,
      submittalKpis: updatedList,
      detailedEvaluations: autoEvaluations,
      dimensionScores: dimensionScores,
      overallEvaluationScore: evalSummary.overallScore,
      officialEvaluationGrade: evalSummary.officialGrade as any,
      performanceRating: performanceRatingLabel
    };

    // Bidirectional sync: If any IPC submittal was edited or added, sync its submissionDate to project.ipcTracker
    let updatedIpcTracker = project.ipcTracker;
    if (project.ipcTracker && project.ipcTracker.length > 0) {
      let trackerChanged = false;
      const newTracker = project.ipcTracker.map(ipc => {
        const matchingSub = updatedList.find(s => s.id === `ipc_kpi_${ipc.id}` || s.submittalNo === ipc.paymentNo);
        if (matchingSub) {
          const newSubDate = matchingSub.submittedDate || '';
          const newCertDate = matchingSub.respondedDate || '';
          if ((ipc.submissionDate || '') !== newSubDate || (ipc.certificationDate || '') !== newCertDate) {
            trackerChanged = true;
            return {
              ...ipc,
              submissionDate: newSubDate,
              certificationDate: newCertDate
            };
          }
        }
        return ipc;
      });

      // Also add newly created IPC Review items to ipcTracker if not already present
      const addedIpcSubs = updatedList.filter(s => 
        (s.type === 'IPC Review' || s.id.startsWith('ipc_kpi_')) &&
        !project.ipcTracker!.some(ipc => `ipc_kpi_${ipc.id}` === s.id || ipc.paymentNo === s.submittalNo)
      );
      if (addedIpcSubs.length > 0) {
        trackerChanged = true;
        addedIpcSubs.forEach(s => {
          newTracker.push({
            id: s.id.replace('ipc_kpi_', ''),
            paymentNo: s.submittalNo,
            period: 'Monthly',
            grossBillEtb: 0,
            grossBillUsd: 0,
            priceAdjustmentEtb: 0,
            advanceRepaymentEtb: 0,
            retentionEtb: 0,
            certifiedEtb: 0,
            certifiedUsd: 0,
            status: s.status === 'Approved / Closed' || s.status === 'Closed' ? 'Paid' : 'Unpaid',
            statusEtb: s.status === 'Approved / Closed' || s.status === 'Closed' ? 'Paid' : 'Unpaid',
            statusUsd: 'Unpaid',
            submissionDate: s.submittedDate,
            certificationDate: s.respondedDate,
            remarks: s.notes || 'Created via Technical Submittal Log'
          });
        });
      }

      if (trackerChanged) {
        updatedIpcTracker = newTracker;
      }
    }

    const updatePayload: Partial<Project> = {
      supervisionConsultant: updatedConsultant
    };
    if (updatedIpcTracker !== project.ipcTracker) {
      updatePayload.ipcTracker = updatedIpcTracker;
    }

    onProjectUpdate(updatePayload, `Submittal Log: ${actionDesc} (Pillar I SLA: ${evalSummary.slaTurnaroundScore.toFixed(1)}% | 5-Dim: ${evalSummary.fiveDimScore.toFixed(1)}% | Grade: ${evalSummary.officialGrade})`);
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

    const submittalType = newSubmittalForm.type && newSubmittalForm.type !== 'RFI' ? newSubmittalForm.type : 'Material Approval';
    const target = Number(newSubmittalForm.targetDays) || targetOverrides[submittalType] || 7;

    const newRecord: ConsultantSubmittalKpi = {
      id: `sub_${Date.now()}`,
      submittalNo: newSubmittalForm.submittalNo,
      type: submittalType as any,
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
    commitSubmittals(updatedList, `Added technical submittal ${newRecord.submittalNo}`);
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
    if (!deletedItem) return;

    const isApproved = deletedItem.status === 'Approved' || deletedItem.status === 'Approved / Closed' || deletedItem.status === 'Approved with Comment' || deletedItem.status === 'Approved with Comments' || deletedItem.status.toLowerCase().includes('approved');
    const isAdminUser = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'cpm_admin' || currentUserObj?.username === 'proj_1781786415663';

    if (isApproved && !isAdminUser) {
      alert('Access Denied: Once a submittal is approved, only users with Administrator credentials can delete it.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete submittal record ${deletedItem.submittalNo || id}?`)) return;
    const updatedList = submittalsList.filter(item => item.id !== id);
    commitSubmittals(updatedList, `Deleted submittal ${deletedItem.submittalNo || id}`);
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
    const nextNum = technicalSubmittalsList.length + 1;
    const newRecord: ConsultantSubmittalKpi = {
      id: `sub_${Date.now()}`,
      submittalNo: `SUB-0${nextNum < 10 ? '0' + nextNum : nextNum}`,
      type: 'Material Approval',
      title: 'New Technical Material Submittal / Method Statement',
      submittedDate: new Date().toISOString().split('T')[0],
      respondedDate: undefined,
      targetDays: targetOverrides['Material Approval'] || 7,
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
    return technicalSubmittalsList.filter(item => {
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
        matchesStatus = delayInfo.isPending || item.status === 'Under Review';
      } else if (selectedStatusFilter === 'PENDING_OVERDUE') {
        matchesStatus = delayInfo.isPending && delayInfo.isOverdue;
      } else if (selectedStatusFilter === 'CLOSED') {
        matchesStatus = item.status === 'Closed' || item.status === 'Approved / Closed';
      } else if (selectedStatusFilter === 'OVERDUE' || selectedStatusFilter === 'Overdue') {
        matchesStatus = delayInfo.isOverdue || item.status === 'Overdue';
      } else if (selectedStatusFilter === 'ON_TIME') {
        matchesStatus = !delayInfo.isOverdue;
      } else {
        matchesStatus = item.status === selectedStatusFilter ||
          (selectedStatusFilter === 'Approved' && (item.status === 'Approved' || item.status === 'Approved / Closed')) ||
          (selectedStatusFilter === 'Approved with Comment' && (item.status === 'Approved with Comment' || item.status === 'Approved with Comments')) ||
          (selectedStatusFilter === 'Rejected' && (item.status === 'Rejected' || item.status === 'Rejected / Resubmit')) ||
          (selectedStatusFilter === 'Resubmit' && (item.status === 'Resubmit' || item.status === 'Rejected / Resubmit'));
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [technicalSubmittalsList, submittalSearch, selectedTypeFilter, selectedStatusFilter, targetOverrides]);

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

  const handleExportPdf = (forcedScope?: 'selected' | 'all') => {
    // Determine which records to export (Selected Technical Submittals + Selected RFIs)
    const hasSelectedTech = selectedSubmittalNos.length > 0;
    const hasSelectedRfi = selectedRfiIds.length > 0;
    const hasAnySelection = hasSelectedTech || hasSelectedRfi;
    const isSelectionExport = (forcedScope === 'selected' || (hasAnySelection && forcedScope !== 'all'));

    let recordsToExport: ConsultantSubmittalKpi[] = [];

    if (isSelectionExport) {
      // 1. Collect selected technical submittals
      const selectedTechRecords = submittalsList.filter(s =>
        s.type !== 'RFI' && (
          selectedSubmittalNos.includes(s.submittalNo) || 
          (s.id && selectedSubmittalNos.includes(s.id))
        )
      );
      // 2. Collect selected RFIs
      const selectedRfiRecords = submittalsList.filter(s =>
        s.type === 'RFI' && (
          (s.id && selectedRfiIds.includes(s.id)) ||
          selectedSubmittalNos.includes(s.submittalNo) ||
          selectedRfiIds.includes(s.submittalNo)
        )
      );
      recordsToExport = [...selectedTechRecords, ...selectedRfiRecords];
    } else {
      recordsToExport = activeViewTab === 'rfi_log'
        ? submittalsList.filter(s => s.type === 'RFI')
        : [...submittalsList];
    }

    if (recordsToExport.length === 0) {
      alert('No submittal or RFI records available to export.');
      return;
    }

    // Chronological order by submitted date
    recordsToExport.sort((a, b) => {
      const timeA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const timeB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.submittalNo || '').localeCompare(b.submittalNo || '', undefined, { numeric: true });
    });

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 595.28 pt
    const margin = STRICT_1_INCH_MARGIN; // Standard border padding (36 pt)
    const contentWidth = pageWidth - (margin * 2); // 769.89 pt
    let curY = margin + 14;
    let pageCount = 0;

    const drawSignatureBlocksOnPage = () => {
      const sigBoxY = pageHeight - margin - 56;
      const sigBoxH = 38;

      // Card container for signatures at bottom of each page
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.6);
      doc.roundedRect(margin + 2, sigBoxY, contentWidth - 4, sigBoxH, 2, 2, 'DF');

      const personnelList = project.supervisionConsultant?.personnel || [];
      const findPerson = (keywords: string[]) => {
        const match = personnelList.find(p => {
          const pos = (p.position || '').toLowerCase();
          return keywords.some(k => pos.includes(k.toLowerCase()));
        });
        return match?.name || '';
      };

      const sigRoles = [
        { title: 'SENIOR SURVEYER', defaultName: findPerson(['surveyer', 'surveyor']) },
        { title: 'QUANTITY SURVEYOR', defaultName: findPerson(['quantity', 'qs']) },
        { title: 'MATERIAL ENGINEER', defaultName: findPerson(['material', 'laboratory']) },
        { title: 'ASSISSTANCE RESIDENT ENGINEER', defaultName: findPerson(['assistant resident', 'are']) },
        { title: 'RESIDENT ENGINEER', defaultName: consultant.residentEngineerName || findPerson(['resident engineer', 'team leader']) || '' }
      ];

      const colW = (contentWidth - 4) / 5;

      sigRoles.forEach((role, idx) => {
        const rx = margin + 2 + (idx * colW);

        // Vertical divider between signature columns
        if (idx > 0) {
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.5);
          doc.line(rx, sigBoxY, rx, sigBoxY + sigBoxH);
        }

        // Role title header strip
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(rx + 0.5, sigBoxY + 0.5, colW - 1, 9.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(role.title, rx + (colW / 2), sigBoxY + 7, { align: 'center' });

        // Name, Sign, Date lines
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(100, 116, 139); // slate-500

        // Name
        doc.text("Name:", rx + 3, sigBoxY + 16.5);
        if (role.defaultName) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(role.defaultName.substring(0, 24), rx + 22, sigBoxY + 16.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
        } else {
          doc.setDrawColor(203, 213, 225);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(rx + 22, sigBoxY + 16.5, rx + colW - 4, sigBoxY + 16.5);
        }

        // Sign
        doc.text("Sign:", rx + 3, sigBoxY + 24.5);
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(rx + 20, sigBoxY + 24.5, rx + colW - 4, sigBoxY + 24.5);

        // Date
        doc.text("Date:", rx + 3, sigBoxY + 32.5);
        doc.line(rx + 20, sigBoxY + 32.5, rx + colW - 4, sigBoxY + 32.5);

        doc.setLineDashPattern([], 0); // reset dash pattern
      });
    };

    const drawPageDecorations = () => {
      pageCount++;

      // Standard Page Border Frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 4, 4, 'S');

      // Top colored border strip (Royal Indigo style)
      doc.setFillColor(79, 70, 229);
      doc.rect(margin + 2, margin + 1, contentWidth - 4, 3, 'F');

      // Semi-transparent background watermark (DRAFT / CONFIDENTIAL) if configured
      if (pdfWatermark !== 'NONE') {
        drawDocumentWatermark(doc, pdfWatermark);
      }

      // 5 Mandatory Engineering Signatures at the bottom of each page
      drawSignatureBlocksOnPage();

      // Bottom footer line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(margin + 2, pageHeight - margin - 15, pageWidth - margin - 2, pageHeight - margin - 15);

      // Footer texts with safe width to avoid text overlap
      const leftFooter = `ETHIOPIAN ROADS ADMINISTRATION • TECHNICAL SUBMITTAL & RFI REGISTER • ${project.name || 'ERA PROJECT'}`;
      const splitLeftFooter = doc.splitTextToSize(leftFooter, contentWidth - 140);
      doc.text(
        splitLeftFooter[0] || leftFooter,
        margin + 6,
        pageHeight - margin - 6
      );
      doc.text(
        `OFFICIAL PROJECT DOCUMENTATION • Page ${pageCount}`,
        pageWidth - margin - 6,
        pageHeight - margin - 6,
        { align: 'right' }
      );
    };

    let drawTableHeader = () => {};

    const checkSpace = (needed: number, isTableContext: boolean = false) => {
      if (curY + needed > pageHeight - margin - 62) {
        doc.addPage();
        curY = margin + 16;
        drawPageDecorations();
        if (isTableContext) {
          drawTableHeader();
        }
      }
    };

    // Draw page 1 decorations
    drawPageDecorations();

    const techCount = recordsToExport.filter(s => s.type !== 'RFI').length;
    const rfiCountInExport = recordsToExport.filter(s => s.type === 'RFI').length;

    let scopeText = "ALL ACTIVE REGISTER RECORDS";
    if (isSelectionExport) {
      const parts = [];
      if (techCount > 0) parts.push(`${techCount} Technical Submittal${techCount > 1 ? 's' : ''}`);
      if (rfiCountInExport > 0) parts.push(`${rfiCountInExport} RFI${rfiCountInExport > 1 ? 's' : ''}`);
      scopeText = `SELECTED RECORDS: ${parts.join(' & ')} (${recordsToExport.length} TOTAL)`;
    } else if (activeViewTab === 'rfi_log') {
      scopeText = `ALL RFI CORRESPONDENCE RECORDS (${rfiCountInExport} TOTAL)`;
    } else {
      scopeText = `ALL TECHNICAL SUBMITTALS & RFIs (${recordsToExport.length} TOTAL)`;
    }

    const supervisionConsultantName = project.supervisionConsultant?.firmName || consultant?.firmName || project.consultant || 'N/A';
    const contractorName = project.contractor || 'N/A';

    // Standard Document Header: Official ERA Logo, Standard Title & Aligned Date Stamp
    curY = drawStandardDocumentHeader(doc, {
      margin,
      curY,
      contentWidth,
      documentTitle: "OFFICIAL TECHNICAL SUBMITTAL & RFI CORRESPONDENCE REGISTER",
      projectName: project.name || 'CURRENT PROJECT',
      consultantName: supervisionConsultantName,
      contractorName: contractorName,
      scopeText: scopeText,
      titleColor: [79, 70, 229], // Indigo
      referenceNo: project.id || 'SUBMITTAL-RFI-LOG',
      statusBadge: isSelectionExport ? 'SELECTED EXPORT' : 'REGISTER AUDIT',
    });

    // Mini Executive Stats Summary Bar inside PDF
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, curY, contentWidth, 34, 4, 4, 'DF');

    const totalCount = recordsToExport.length;
    const closedCount = recordsToExport.filter(s => s.status === 'Closed' || s.status === 'Approved / Closed' || s.status === 'Approved').length;
    const pendingCount = totalCount - closedCount;

    const colWidthKpi = contentWidth / 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("EXPORTED RECORDS", margin + 12, curY + 12);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalCount} Total`, margin + 12, curY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TECH SUBMITTALS", margin + colWidthKpi + 12, curY + 12);
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${techCount} Records`, margin + colWidthKpi + 12, curY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("REQUESTS FOR INFO (RFIs)", margin + (colWidthKpi * 2) + 12, curY + 12);
    doc.setFontSize(9);
    doc.setTextColor(147, 51, 234);
    doc.text(`${rfiCountInExport} Records`, margin + (colWidthKpi * 2) + 12, curY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("RESOLVED / CLOSED", margin + (colWidthKpi * 3) + 12, curY + 12);
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${closedCount} Records`, margin + (colWidthKpi * 3) + 12, curY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("UNDER REVIEW", margin + (colWidthKpi * 4) + 12, curY + 12);
    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text(`${pendingCount} Records`, margin + (colWidthKpi * 4) + 12, curY + 25);

    curY += 46;

    // Table Column Widths (SLA and Assigned RE removed as requested)
    const baseTableCols = [
      { id: 'subNo', title: "SUBMITTAL / RFI #", width: 90 },
      { id: 'category', title: "TYPE / DISCIPLINE", width: 110 },
      { id: 'title', title: "SUBJECT / DESCRIPTION", width: 280 },
      { id: 'submitted', title: "SUBMITTED", width: 80 },
      { id: 'responded', title: "RESPONDED", width: 80 },
      { id: 'status', title: "STATUS", width: 110 }
    ];
    const totalBaseColWidth = baseTableCols.reduce((sum, c) => sum + c.width, 0);
    const tableCols = baseTableCols.map(c => ({
      ...c,
      width: (c.width / totalBaseColWidth) * contentWidth
    }));

    drawTableHeader = () => {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, curY, contentWidth, 18, 'F');

      let tx = margin;
      tableCols.forEach((col, cIdx) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(255, 255, 255);
        const headerLines = safeSplitText(doc, col.title, col.width - 6, 6.8, true);
        headerLines.forEach((hline: string, hli: number) => {
          doc.text(hline, tx + 4, curY + 11 + (hli * 7.5));
        });
        tx += col.width;
        if (cIdx < tableCols.length - 1) {
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.5);
          doc.line(tx, curY, tx, curY + 18);
        }
      });

      doc.setDrawColor(15, 23, 42);
      doc.rect(margin, curY, contentWidth, 18, 'S');

      curY += 18;
    };

    drawTableHeader();

    // Table rows rendering loop with robust wrapping and strict DD MMM YYYY dates
    recordsToExport.forEach((item, index) => {
      const subNoLines = safeSplitText(doc, item.submittalNo || item.id || '-', tableCols[0].width - 8, 7, true);
      const catText = item.type === 'RFI' ? (item.discipline ? `RFI (${item.discipline})` : 'RFI') : (item.type || '-');
      const catLines = safeSplitText(doc, catText, tableCols[1].width - 8, 6.5, false);
      const titleLines = safeSplitText(doc, item.title || '-', tableCols[2].width - 8, 7, true);
      
      // Strict Date Format in DD MMM YYYY order (Day, Month, Year)
      const formattedSubDate = item.submittedDate ? formatPdfDate(item.submittedDate) : '-';
      const subDateLines = safeSplitText(doc, formattedSubDate, tableCols[3].width - 8, 6.5, false);

      const formattedRespDate = item.respondedDate ? formatPdfDate(item.respondedDate) : 'Awaiting';
      const respDateLines = safeSplitText(doc, formattedRespDate, tableCols[4].width - 8, 6.5, false);
      
      const statusLines = safeSplitText(doc, item.status || '-', tableCols[5].width - 14, 6.5, true);

      const maxLines = Math.max(
        subNoLines.length,
        catLines.length,
        titleLines.length,
        subDateLines.length,
        respDateLines.length,
        statusLines.length
      );
      const rowHeight = Math.max(22, (maxLines * 8.5) + 8);

      checkSpace(rowHeight + 4, true);

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');

      // Grid lines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);
      doc.line(margin, curY, margin, curY + rowHeight);
      doc.line(margin + contentWidth, curY, margin + contentWidth, curY + rowHeight);

      let divX = margin;
      tableCols.slice(0, -1).forEach(col => {
        divX += col.width;
        doc.line(divX, curY, divX, curY + rowHeight);
      });

      let rx = margin;

      // Col 0: Submittal #
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (item.type === 'RFI') {
        doc.setTextColor(147, 51, 234); // Purple for RFI
      } else {
        doc.setTextColor(15, 23, 42);
      }
      subNoLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 4, curY + 10 + (li * 8.5));
      });
      rx += tableCols[0].width;

      // Col 1: Category
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      catLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 4, curY + 10 + (li * 8.5));
      });
      rx += tableCols[1].width;

      // Col 2: Subject / Description
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      titleLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 4, curY + 10 + (li * 8.5));
      });
      rx += tableCols[2].width;

      // Col 3: Submitted Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      subDateLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 4, curY + 10 + (li * 8.5));
      });
      rx += tableCols[3].width;

      // Col 4: Responded Date
      respDateLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 4, curY + 10 + (li * 8.5));
      });
      rx += tableCols[4].width;

      // Col 5: Status Badges
      const lowerStatus = (item.status || '').toLowerCase();
      let badgeColor = { r: 100, g: 116, b: 139 };
      let badgeBg = { r: 241, g: 245, b: 249 };
      if (lowerStatus.includes('approved') || lowerStatus.includes('closed')) {
        badgeColor = { r: 16, g: 124, b: 65 };
        badgeBg = { r: 209, g: 250, b: 229 };
      } else if (lowerStatus.includes('review')) {
        badgeColor = { r: 180, g: 83, b: 9 };
        badgeBg = { r: 254, g: 243, b: 199 };
      } else if (lowerStatus.includes('reject') || lowerStatus.includes('resubmit')) {
        badgeColor = { r: 190, g: 24, b: 74 };
        badgeBg = { r: 255, g: 228, b: 230 };
      } else if (lowerStatus.includes('overdue')) {
        badgeColor = { r: 109, g: 40, b: 217 };
        badgeBg = { r: 243, g: 232, b: 255 };
      }

      const badgeBoxH = Math.max(14, (statusLines.length * 8) + 4);
      doc.setFillColor(badgeBg.r, badgeBg.g, badgeBg.b);
      doc.roundedRect(rx + 4, curY + 3, tableCols[5].width - 8, badgeBoxH, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(badgeColor.r, badgeColor.g, badgeColor.b);
      statusLines.forEach((line: string, li: number) => {
        doc.text(line, rx + 7, curY + 10 + (li * 8));
      });
      rx += tableCols[5].width;

      curY += rowHeight;
    });

    // Save generated PDF
    const filename = isSelectionExport
      ? `ERA_Selected_Submittals_and_RFIs_${new Date().toISOString().split('T')[0]}.pdf`
      : `ERA_Complete_Submittal_RFI_Register_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* View Switcher: Technical Submittals Register vs Dedicated RFI & Clarifications Log */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveViewTab('submittals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeViewTab === 'submittals'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Technical Submittals Register</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeViewTab === 'submittals'
                ? 'bg-white/20 text-white dark:text-slate-900 dark:bg-slate-900/20'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {technicalSubmittalsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('rfi_log')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer relative ${
              activeViewTab === 'rfi_log'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-300" />
            <span>RFI Log (Contractor ⇄ Consultant Correspondence)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeViewTab === 'rfi_log'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {rfiCount} RFIs
            </span>
            {pendingRfiCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title={`${pendingRfiCount} RFIs awaiting consultant response`} />
            )}
          </button>
        </div>

        {activeViewTab === 'submittals' ? (
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <span className="hidden md:inline">Separate RFI Registry:</span>
            <button
              onClick={() => setActiveViewTab('rfi_log')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              Open Dedicated RFI Log ({rfiCount}) →
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <span>Tracking design inquiries & technical directives</span>
          </div>
        )}
      </div>

      {activeViewTab === 'rfi_log' ? (
        <RfiLogComponent
          project={project}
          consultant={consultant}
          allSubmittals={submittalsList}
          onUpdateSubmittals={(updatedList, desc) => commitSubmittals(updatedList, desc)}
          isReadonly={isReadonly}
          currentUserObj={currentUserObj}
          targetOverrides={targetOverrides}
          selectedRfiIds={selectedRfiIds}
          onSelectedRfiIdsChange={setSelectedRfiIds}
          onExportPdfSelected={() => handleExportPdf('selected')}
          onOpenPrintModal={(ids) => {
            if (ids && ids.length > 0) {
              setSelectedRfiIds(ids);
              setPrintModalInitialScope('selected');
            } else {
              setPrintModalInitialScope('rfi');
            }
            setIsPrintModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Header Banner - Under Technical Submittal Button Only */}
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isReadonly && !isContractorEditor && (
                <button
                  onClick={handleInsertQuickRow}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Technical Submittal
                </button>
              )}
              <button
                onClick={() => handleOpenPrintModal()}
                className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Print or export selected technical submittals and RFIs by date and month as per user preferences"
              >
                <Printer className="w-4 h-4" />
                <span>Print Register (By Date/Month)</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Export CSV
              </button>
              {/* Configurable PDF Watermark Setting */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="px-2 py-1 text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                  <span>Watermark:</span>
                </span>
                <select
                  value={pdfWatermark}
                  onChange={(e) => setPdfWatermark(e.target.value as 'NONE' | 'DRAFT' | 'CONFIDENTIAL')}
                  className="bg-white dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none cursor-pointer"
                  title="Apply DRAFT or CONFIDENTIAL watermark to exported PDF files"
                >
                  <option value="NONE">None</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                </select>
              </div>
              {(selectedSubmittalNos.length > 0 || selectedRfiIds.length > 0) ? (
                <button
                  onClick={() => handleExportPdf('selected')}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Export selected RFIs and technical submittals directly to official PDF"
                >
                  <FileText className="w-4 h-4 text-rose-200" />
                  <span>
                    Export Selected ({selectedSubmittalNos.length + selectedRfiIds.length}) PDF
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => handleExportPdf('all')}
                  className="px-4 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
                  title="Export all submittal & RFI records to a beautifully formatted PDF document."
                >
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Export All PDF</span>
                </button>
              )}
            </div>
          </div>

      {/* KPI & Evaluation Live Metrics Strip */}
      {!isContractorEditor && (
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
      )}

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
              {submittalCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
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
              {submittalStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
              <option value="PENDING">Pending Review</option>
              <option value="PENDING_OVERDUE">Pending Overdue</option>
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

      {/* SELECTION ACTION BAR FOR TECHNICAL SUBMITTALS */}
      {selectedSubmittalNos.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-purple-700/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm shadow-xs border border-purple-400/40">
              {selectedSubmittalNos.length}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{selectedSubmittalNos.length} Technical Submittal{selectedSubmittalNos.length > 1 ? 's' : ''} Selected</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-semibold border border-purple-500/40">
                  Ready for Print / Export
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                Print or export selected records organized by date and month as per your settings
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => handleOpenPrintModal('selected')}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Print selected submittals by date and month"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Selected ({selectedSubmittalNos.length})</span>
            </button>
            <button
              onClick={() => handleExportPdf('selected')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Export selected technical submittals and RFIs directly to official PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export to PDF ({selectedSubmittalNos.length + selectedRfiIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedSubmittalNos([])}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

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
                <th className="p-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={sortedSubmittals.length > 0 && selectedSubmittalNos.length === sortedSubmittals.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubmittalNos(sortedSubmittals.map(s => s.submittalNo));
                      } else {
                        setSelectedSubmittalNos([]);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    title={selectedSubmittalNos.length === sortedSubmittals.length ? "Deselect All" : "Select All"}
                  />
                </th>
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
                  title="Click to sort by Contractor Submitted Date (Linked with Financial Data for IPCs)"
                >
                  <div className="flex items-center gap-1">
                    <span>Submitted (Contractor)</span>
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
                  title="Click to sort by Supervision Consultant Responded Date to submit to Employer (Linked with Financial Data for IPCs)"
                >
                  <div className="flex items-center gap-1">
                    <span>Responded (To Employer)</span>
                    {sortField === 'respondedDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600 dark:text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </th>
                {!isContractorEditor && <th className="p-3.5 text-center">Target SLA</th>}
                {!isContractorEditor && (
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
                )}
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
                {isConsultantApproverOrMasterAdmin && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {sortedSubmittals.length === 0 ? (
                <tr>
                  <td colSpan={9 + (!isContractorEditor ? 2 : 0) + (isConsultantApproverOrMasterAdmin ? 1 : 0)} className="p-8 text-center text-slate-400">
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
                      className={`transition-all duration-150 ${
                        selectedSubmittalNos.includes(item.submittalNo)
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50'
                          : idx % 2 === 1
                          ? 'bg-slate-50/70 dark:bg-slate-800/35 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                          : 'bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSubmittalNos.includes(item.submittalNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubmittalNos(prev => [...prev, item.submittalNo]);
                            } else {
                              setSelectedSubmittalNos(prev => prev.filter(no => no !== item.submittalNo));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {item.submittalNo}
                      </td>
                      <td className="p-3.5">
                        {item.type === 'RFI' ? (
                          <button
                            onClick={() => setActiveViewTab('rfi_log')}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer border border-blue-200 dark:border-blue-800 shadow-2xs"
                            title="Click to open full correspondence thread in RFI Log"
                          >
                            <MessageSquare className="w-3 h-3 text-blue-500" />
                            <span>Technical RFI</span>
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold block w-max">
                              {item.type}
                            </span>
                            {item.type === 'IPC Review' && (
                              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title="IPC Submission date is dynamically linked with the Financial Data page">
                                <LinkIcon className="w-2.5 h-2.5" /> Financial IPC
                              </span>
                            )}
                          </div>
                        )}
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
                              <Paperclip className="w-3.5 h-3.5 shrink-0" />
                              <span>+ PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.submittedDate || '-'}</span>
                          {item.type === 'IPC Review' && (
                            <span 
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5" 
                              title="Contractor Submission Date — Dynamically linked with Financial Data page"
                            >
                              <LinkIcon className="w-2.5 h-2.5 text-indigo-500" /> Contractor Subm.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.respondedDate ? (
                            <>
                              <span>{item.respondedDate}</span>
                              {item.type === 'IPC Review' && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5" 
                                  title="Supervision Consultant Response Date to submit to Employer (Certified & Submitted to Employer) — Dynamically linked with Financial Data page"
                                >
                                  <LinkIcon className="w-2.5 h-2.5 text-emerald-500" /> Submitted to Employer
                                </span>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-500 font-semibold italic">Pending</span>
                              {item.type === 'IPC Review' && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-sans font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
                                  title="Pending Supervision Consultant response / certification to submit to Employer"
                                >
                                  Pending to Employer
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {!isContractorEditor && (
                        <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {target}d
                        </td>
                      )}
                      {!isContractorEditor && (
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
                      )}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold w-fit ${
                            item.status === 'Approved' || item.status === 'Approved / Closed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            item.status === 'Closed' ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' :
                            item.status === 'Approved with Comment' || item.status === 'Approved with Comments' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                            item.status === 'Under Review' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                            item.status === 'Rejected' || item.status === 'Rejected / Resubmit' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                            item.status === 'Resubmit' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' :
                            item.status === 'Overdue' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
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
                      {isConsultantApproverOrMasterAdmin && (
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
                            {!isReadonly && (() => {
                              const isApproved = item.status === 'Approved' || item.status === 'Approved / Closed' || item.status === 'Approved with Comment' || item.status === 'Approved with Comments' || item.status.toLowerCase().includes('approved');
                              const isAdminUser = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'cpm_admin' || currentUserObj?.username === 'proj_1781786415663';
                              if (isApproved && !isAdminUser) {
                                return (
                                  <span title="Approved submittals can only be deleted by Administrators" className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </span>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleDeleteRow(item.id)}
                                  title="Delete Submittal"
                                  className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      )}
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
            <span>of {technicalSubmittalsList.length} submittal records visible</span>
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
      </>
      )}

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
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Category</label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ⚙️ {showCategoryManager ? 'Hide List' : 'Manage'}
                      </button>
                    </div>
                    <select
                      value={editingRowDraft.type}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {submittalCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {showCategoryManager && (
                      <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="New category..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newCategoryName.trim();
                              if (!trimmed) return;
                              if (submittalCategories.includes(trimmed)) {
                                alert('Category already exists!');
                                return;
                              }
                              const updated = [...submittalCategories, trimmed];
                              onProjectUpdate?.({
                                supervisionConsultant: {
                                  ...consultant,
                                  submittalCategories: updated
                                }
                              }, `Added custom category: "${trimmed}"`);
                              setNewCategoryName('');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>

                        {submittalCategories.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current Categories (Click ✕ to Delete):</p>
                            <div className="flex flex-wrap gap-1">
                              {submittalCategories.map(cat => (
                                <span
                                  key={cat}
                                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-semibold border border-slate-200 dark:border-slate-700"
                                >
                                  {cat}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (submittalCategories.length <= 1) {
                                        alert('You must have at least one category!');
                                        return;
                                      }
                                      if (confirm(`Are you sure you want to delete category "${cat}"?`)) {
                                        const updated = submittalCategories.filter(c => c !== cat);
                                        // If deleted currently active category, shift to the first remaining one
                                        if (editingRowDraft.type === cat) {
                                          setEditingRowDraft({ ...editingRowDraft, type: updated[0] as any });
                                        }
                                        onProjectUpdate?.({
                                          supervisionConsultant: {
                                            ...consultant,
                                            submittalCategories: updated
                                          }
                                        }, `Deleted category: "${cat}"`);
                                      }
                                    }}
                                    className="p-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                    title={`Delete "${cat}"`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Submitted Date (Contractor)
                      {editingRowDraft.type === 'IPC Review' && (
                        <span className="ml-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                          (🔗 Linked with Financial Data IPC Submission Date)
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={editingRowDraft.submittedDate || ''}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, submittedDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Responded Date (Submit to Employer)
                      {editingRowDraft.type === 'IPC Review' && (
                        <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          (🔗 Linked with Financial Data Certification / Submit to Employer Date)
                        </span>
                      )}
                    </label>
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Status</label>
                      <button
                        type="button"
                        onClick={() => setShowStatusManager(!showStatusManager)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ⚙️ {showStatusManager ? 'Hide List' : 'Manage'}
                      </button>
                    </div>
                    <select
                      value={editingRowDraft.status}
                      onChange={(e) => setEditingRowDraft({ ...editingRowDraft, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {submittalStatuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    {showStatusManager && (
                      <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl space-y-2.5">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="New status..."
                            value={newStatusName}
                            onChange={(e) => setNewStatusName(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newStatusName.trim();
                              if (!trimmed) return;
                              if (submittalStatuses.includes(trimmed)) {
                                alert('Status already exists!');
                                return;
                              }
                              const updated = [...submittalStatuses, trimmed];
                              onProjectUpdate?.({
                                supervisionConsultant: {
                                  ...consultant,
                                  submittalStatuses: updated
                                }
                              }, `Added custom status: "${trimmed}"`);
                              setNewStatusName('');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>

                        {submittalStatuses.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current Statuses (Click ✕ to Delete):</p>
                            <div className="flex flex-wrap gap-1">
                              {submittalStatuses.map(st => (
                                <span
                                  key={st}
                                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-semibold border border-slate-200 dark:border-slate-700"
                                >
                                  {st}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (submittalStatuses.length <= 1) {
                                        alert('You must have at least one status!');
                                        return;
                                      }
                                      if (confirm(`Are you sure you want to delete status "${st}"?`)) {
                                        const updated = submittalStatuses.filter(s => s !== st);
                                        // If deleted currently active status, shift to the first remaining one
                                        if (editingRowDraft.status === st) {
                                          setEditingRowDraft({ ...editingRowDraft, status: updated[0] as any });
                                        }
                                        onProjectUpdate?.({
                                          supervisionConsultant: {
                                            ...consultant,
                                            submittalStatuses: updated
                                          }
                                        }, `Deleted status: "${st}"`);
                                      }
                                    }}
                                    className="p-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                    title={`Delete "${st}"`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
              {!isContractorEditor && (
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
              )}

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
                          {!isContractorEditor && (
                            <button
                              onClick={() => handleRemoveAttachment(activeAttachmentSubmittal, att.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Remove PDF File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    No PDF documents currently attached.
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

      {/* SUBMITTAL & RFI PRINT & EXPORT MODAL */}
      <SubmittalPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        project={project}
        consultant={consultant}
        allSubmittals={submittalsList}
        selectedSubmittalNos={selectedSubmittalNos}
        selectedRfiIds={selectedRfiIds}
        initialScope={printModalInitialScope}
        targetOverrides={targetOverrides}
        watermark={pdfWatermark}
        onWatermarkChange={setPdfWatermark}
      />

    </div>
  );
}

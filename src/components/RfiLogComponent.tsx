import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Search,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Building2,
  Paperclip,
  Trash2,
  Edit2,
  Eye,
  X,
  MessageSquare,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  MapPin,
  HelpCircle,
  FileCode,
  DollarSign,
  AlertOctagon,
  CornerDownRight,
  User as UserIcon,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Upload,
  ListChecks,
  CheckCheck,
  CheckSquare,
  FileSpreadsheet
} from 'lucide-react';
import {
  Project,
  SupervisionConsultantInfo,
  ConsultantSubmittalKpi,
  RfiCorrespondenceMessage,
  User
} from '../types';
import { checkSubmittalDelay } from './ConsultantPerformanceKpiWidget';

interface RfiLogComponentProps {
  project: Project;
  consultant: SupervisionConsultantInfo;
  allSubmittals: ConsultantSubmittalKpi[];
  onUpdateSubmittals: (updatedList: ConsultantSubmittalKpi[], actionDesc: string) => void;
  isReadonly?: boolean;
  currentUserObj?: User | null;
  targetOverrides?: Record<string, number>;
}

export const RFI_INSPECTION_CATEGORIES = [
  '1.1) Horizontal and Vertical Alignment Check',
  '1.2) Subgrade Preparation',
  '1.3) Compaction and Moisture Content Verification',
  '1.4) Structural Formwork and Reinforcement Fixing',
  '1.5) Concrete / Asphalt Material Temperature and Workability',
  '1.6) Drainage and Structural Invert Level Compliance',
  '1.7) Surface Protection',
  '1.8) Traffic Management Integrity'
] as const;

export const RFI_INFORMATION_CATEGORIES = [
  '2.1) Original Ground Line (OGL) Cross-Section & Topographical',
  '2.2) Right-of-Way (ROW) Obstruction & Public Utility interferences',
  '2.3) Material Suitability & Alternative Quarry/Borrow Pit approval',
  '2.4) Variation Order (VO) Scope & Bill of Quantities (BOQ) Discrepancies'
] as const;

const RFI_DISCIPLINES = [
  'Structures & Bridges',
  'Highway Alignment & Geometry',
  'Drainage & Culverts',
  'Geotechnical & Earthworks',
  'Pavement & Materials',
  'Traffic & Road Safety',
  'Right-of-Way & Utilities',
  'General & Specifications'
] as const;

export default function RfiLogComponent({
  project,
  consultant,
  allSubmittals,
  onUpdateSubmittals,
  isReadonly = false,
  currentUserObj,
  targetOverrides = {}
}: RfiLogComponentProps) {
  // Check if current user has contractor credentials
  const isContractorUser = Boolean(
    (currentUserObj?.role as string) === 'contractor_editor' ||
    (currentUserObj?.role as string) === 'contractor' ||
    (typeof currentUserObj?.role === 'string' && currentUserObj.role.toLowerCase().includes('contractor')) ||
    (typeof currentUserObj?.username === 'string' && currentUserObj.username.toLowerCase().includes('contractor'))
  );

  const canContractorAddOrEdit = useMemo(() => {
    const r = (currentUserObj?.role as string) || '';
    return r === 'contractor_editor' || r === 'contractor' || r.toLowerCase().includes('contractor');
  }, [currentUserObj]);

  // Check if user has Supervision Consultant Approver authority
  const isSupervisionConsultantApprover = useMemo(() => {
    if (!currentUserObj) return false;
    const r = (currentUserObj.role || '').toLowerCase();
    const u = (currentUserObj.username || '').toLowerCase();
    return (
      r === 'consultant_approver' ||
      r === 'approver' ||
      r === 'era_approver' ||
      r === 'master_admin' ||
      r === 'cpm_admin' ||
      r === 'admin' ||
      r === 'director_general' ||
      r === 'department_head' ||
      currentUserObj.hasApprovalCredential === true ||
      r.includes('consultant_approver') ||
      u.includes('consultant_approver')
    );
  }, [currentUserObj]);

  // Extract all RFI items from submittals
  const rfiItems = useMemo(() => {
    return allSubmittals.filter(item => item.type === 'RFI');
  }, [allSubmittals]);

  // Filtering & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'submittalNo' | 'submittedDate' | 'respondedDate' | 'actualDays' | 'priority' | 'status' | 'attachmentsCount'>('submittedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');

  // Multi-select & Bulk Operations State (for Consultant Approver)
  const [selectedRfiIds, setSelectedRfiIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('Approved');
  const [bulkDirectiveNote, setBulkDirectiveNote] = useState<string>('');
  const [bulkCostImpact, setBulkCostImpact] = useState<string>('keep');
  const [bulkScheduleImpact, setBulkScheduleImpact] = useState<string>('keep');
  const [isBulkActionMenuOpen, setIsBulkActionMenuOpen] = useState(false);

  // Interactive Drawer / Modal state for detailed correspondence
  const [activeRfi, setActiveRfi] = useState<ConsultantSubmittalKpi | null>(null);
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);

  // PDF Attachment Management Modal & Preview Modal
  const [activeAttachmentModalRfi, setActiveAttachmentModalRfi] = useState<ConsultantSubmittalKpi | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>('');

  const handleViewPdf = (url: string, name: string) => {
    setPdfPreviewUrl(url);
    setPdfPreviewTitle(name);
  };

  // New RFI Modal state
  const [isNewRfiModalOpen, setIsNewRfiModalOpen] = useState(false);
  const [newRfiForm, setNewRfiForm] = useState<Partial<ConsultantSubmittalKpi>>({
    submittalNo: `RFI-0${rfiItems.length + 14 < 10 ? '0' + (rfiItems.length + 14) : rfiItems.length + 14}`,
    type: 'RFI',
    title: '',
    discipline: RFI_INSPECTION_CATEGORIES[0],
    stationKm: '',
    drawingRef: '',
    specificationRef: '',
    contractorContact: '',
    contractorInquiry: '',
    submittedDate: new Date().toISOString().split('T')[0],
    targetDays: 7,
    priority: 'High',
    status: 'Under Review',
    rfiStatus: 'Awaiting Consultant Response',
    costImpact: 'None',
    scheduleImpact: 'None',
    assignedEngineer: consultant.residentEngineerName || 'Resident Engineer',
    attachmentsCount: 0,
    attachments: []
  });

  // Respond / Issue Clarification Modal state
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [respondingRfi, setRespondingRfi] = useState<ConsultantSubmittalKpi | null>(null);
  const [responseForm, setResponseForm] = useState({
    responderName: consultant.residentEngineerName || 'Resident Engineer',
    respondedDate: new Date().toISOString().split('T')[0],
    consultantResponse: '',
    newStatus: 'Approved / Closed',
    newRfiStatus: 'Clarification Issued',
    costImpact: 'None',
    scheduleImpact: 'None'
  });

  // Edit RFI Modal state
  const [isEditRfiModalOpen, setIsEditRfiModalOpen] = useState(false);
  const [editingRfiDraft, setEditingRfiDraft] = useState<ConsultantSubmittalKpi | null>(null);

  // Correspondence reply form inside active thread
  const [replyMessage, setReplyMessage] = useState('');
  const [replySender, setReplySender] = useState<'Contractor' | 'Consultant' | 'Employer / ERA'>('Consultant');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyRole, setReplyRole] = useState('');
  const [replyStatusUpdate, setReplyStatusUpdate] = useState<string>('no_change');

  // Process PDF files helper
  const processPdfFiles = (files: FileList | null): File[] => {
    if (!files || files.length === 0) return [];
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        valid.push(file);
      } else {
        alert(`File "${file.name}" is not a PDF document. Please upload PDF files only.`);
      }
    }
    return valid;
  };

  // Direct PDF upload for an RFI from the table or modal
  const handleDirectPdfUpload = (targetRfi: ConsultantSubmittalKpi, e: React.ChangeEvent<HTMLInputElement>) => {
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

    const existingAtts = targetRfi.attachments || [];
    const updatedAtts = [...existingAtts, ...newAttachments];

    const updatedRfi: ConsultantSubmittalKpi = {
      ...targetRfi,
      attachments: updatedAtts,
      attachmentsCount: updatedAtts.length
    };

    const updatedList = allSubmittals.map(s => s.id === updatedRfi.id ? updatedRfi : s);
    onUpdateSubmittals(updatedList, `Uploaded ${validPdfs.length} PDF attachment(s) to RFI ${targetRfi.submittalNo}`);

    if (activeRfi && activeRfi.id === targetRfi.id) {
      setActiveRfi(updatedRfi);
    }
    if (activeAttachmentModalRfi && activeAttachmentModalRfi.id === targetRfi.id) {
      setActiveAttachmentModalRfi(updatedRfi);
    }
    if (editingRfiDraft && editingRfiDraft.id === targetRfi.id) {
      setEditingRfiDraft(updatedRfi);
    }

    e.target.value = '';
  };

  // Remove attachment from an RFI
  const handleRemoveAttachment = (targetRfi: ConsultantSubmittalKpi, attachmentId: string) => {
    const existingAtts = targetRfi.attachments || [];
    const updatedAtts = existingAtts.filter(a => a.id !== attachmentId);

    const updatedRfi: ConsultantSubmittalKpi = {
      ...targetRfi,
      attachments: updatedAtts,
      attachmentsCount: updatedAtts.length
    };

    const updatedList = allSubmittals.map(s => s.id === updatedRfi.id ? updatedRfi : s);
    onUpdateSubmittals(updatedList, `Removed attachment from RFI ${targetRfi.submittalNo}`);

    if (activeRfi && activeRfi.id === targetRfi.id) {
      setActiveRfi(updatedRfi);
    }
    if (activeAttachmentModalRfi && activeAttachmentModalRfi.id === targetRfi.id) {
      setActiveAttachmentModalRfi(updatedRfi);
    }
    if (editingRfiDraft && editingRfiDraft.id === targetRfi.id) {
      setEditingRfiDraft(updatedRfi);
    }
  };

  // KPI calculations for RFIs
  const rfiMetrics = useMemo(() => {
    const total = rfiItems.length;
    let closedCount = 0;
    let awaitingResponseCount = 0;
    let underReviewCount = 0;
    let delayedCount = 0;
    let costImpactCount = 0;
    let scheduleImpactCount = 0;
    let totalElapsedDays = 0;
    let daysWithDuration = 0;

    rfiItems.forEach(rfi => {
      const isApprovedOrClosed =
        rfi.status === 'Approved' ||
        rfi.status === 'Approved / Closed' ||
        rfi.status === 'Approved with Comments' ||
        rfi.status === 'Approved with Comment' ||
        rfi.status === 'Closed' ||
        rfi.rfiStatus === 'Approved' ||
        rfi.rfiStatus === 'Approved with Comments' ||
        rfi.rfiStatus === 'Closed / Agreed';
      if (isApprovedOrClosed) {
        closedCount++;
      } else if (rfi.rfiStatus === 'Awaiting Consultant Response' || !rfi.respondedDate) {
        awaitingResponseCount++;
      } else {
        underReviewCount++;
      }

      const target = rfi.targetDays || targetOverrides['RFI'] || 7;
      const delayInfo = checkSubmittalDelay(rfi, target);
      if (delayInfo.isDelayed) {
        delayedCount++;
      }

      if (delayInfo.elapsedDays !== undefined && !isNaN(delayInfo.elapsedDays)) {
        totalElapsedDays += delayInfo.elapsedDays;
        daysWithDuration++;
      }

      if (rfi.costImpact && rfi.costImpact !== 'None' && rfi.costImpact !== 'Cost Saving') {
        costImpactCount++;
      }

      if (rfi.scheduleImpact && rfi.scheduleImpact !== 'None' && rfi.scheduleImpact !== 'Minor Float Used') {
        scheduleImpactCount++;
      }
    });

    const avgTurnaround = daysWithDuration > 0 ? (totalElapsedDays / daysWithDuration).toFixed(1) : '0.0';
    const onTimeCount = Math.max(0, total - delayedCount);
    const complianceRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;

    return {
      total,
      closedCount,
      awaitingResponseCount,
      underReviewCount,
      delayedCount,
      costImpactCount,
      scheduleImpactCount,
      avgTurnaround,
      complianceRate
    };
  }, [rfiItems, targetOverrides]);

  // Filtered and sorted RFIs
  const filteredRfis = useMemo(() => {
    return rfiItems.filter(rfi => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        rfi.submittalNo.toLowerCase().includes(q) ||
        rfi.title.toLowerCase().includes(q) ||
        (rfi.discipline && rfi.discipline.toLowerCase().includes(q)) ||
        (rfi.stationKm && rfi.stationKm.toLowerCase().includes(q)) ||
        (rfi.drawingRef && rfi.drawingRef.toLowerCase().includes(q)) ||
        (rfi.specificationRef && rfi.specificationRef.toLowerCase().includes(q)) ||
        (rfi.contractorInquiry && rfi.contractorInquiry.toLowerCase().includes(q)) ||
        (rfi.consultantResponse && rfi.consultantResponse.toLowerCase().includes(q)) ||
        (rfi.assignedEngineer && rfi.assignedEngineer.toLowerCase().includes(q)) ||
        (rfi.notes && rfi.notes.toLowerCase().includes(q));

      const matchesDiscipline = selectedDiscipline === 'ALL' || rfi.discipline === selectedDiscipline;
      
      const target = rfi.targetDays || targetOverrides['RFI'] || 7;
      const delayInfo = checkSubmittalDelay(rfi, target);
      
      let matchesStatus = true;
      if (selectedStatus === 'ALL') {
        matchesStatus = true;
      } else if (selectedStatus === 'PENDING' || selectedStatus === 'Pending') {
        matchesStatus = (
          rfi.status === 'Under Review' ||
          rfi.status === 'Pending' ||
          rfi.rfiStatus === 'Awaiting Consultant Response' ||
          rfi.rfiStatus === 'Under Technical Review' ||
          (!rfi.respondedDate && rfi.status !== 'Approved' && rfi.status !== 'Approved / Closed' && rfi.status !== 'Closed' && rfi.status !== 'Approved with Comments')
        );
      } else if (selectedStatus === 'Approved') {
        matchesStatus = rfi.status === 'Approved' || rfi.rfiStatus === 'Approved' || (rfi.status === 'Approved / Closed' && !rfi.rfiStatus?.includes('Comment'));
      } else if (selectedStatus === 'Approved with Comments') {
        matchesStatus = rfi.status === 'Approved with Comments' || rfi.status === 'Approved with Comment' || rfi.rfiStatus === 'Approved with Comments' || rfi.rfiStatus === 'Approved with Comment';
      } else if (selectedStatus === 'REJECTED' || selectedStatus === 'Rejected') {
        matchesStatus = (
          rfi.status === 'Rejected' ||
          rfi.status === 'Rejected / Resubmit' ||
          rfi.status === 'Resubmit' ||
          rfi.rfiStatus === 'Resubmit / Revision Required' ||
          rfi.rfiStatus === 'Rejected / Resubmit' ||
          (rfi.rfiStatus ? rfi.rfiStatus.toLowerCase().includes('resubmit') || rfi.rfiStatus.toLowerCase().includes('reject') : false)
        );
      } else if (selectedStatus === 'CLOSED' || selectedStatus === 'Closed') {
        matchesStatus = rfi.status === 'Approved / Closed' || rfi.status === 'Closed' || rfi.rfiStatus === 'Closed / Agreed';
      } else if (selectedStatus === 'Clarification Issued') {
        matchesStatus = rfi.rfiStatus === 'Clarification Issued' || rfi.status === 'Clarification Issued';
      } else if (selectedStatus === 'OVERDUE') {
        matchesStatus = delayInfo.isDelayed;
      } else if (selectedStatus !== 'ALL') {
        matchesStatus = rfi.rfiStatus === selectedStatus || rfi.status === selectedStatus;
      }

      const matchesPriority = selectedPriority === 'ALL' || rfi.priority === selectedPriority;

      let matchesImpact = true;
      if (selectedImpact === 'COST') {
        matchesImpact = Boolean(rfi.costImpact && rfi.costImpact !== 'None');
      } else if (selectedImpact === 'SCHEDULE') {
        matchesImpact = Boolean(rfi.scheduleImpact && rfi.scheduleImpact !== 'None');
      } else if (selectedImpact === 'NEUTRAL') {
        matchesImpact = (!rfi.costImpact || rfi.costImpact === 'None') && (!rfi.scheduleImpact || rfi.scheduleImpact === 'None');
      }

      return matchesSearch && matchesDiscipline && matchesStatus && matchesPriority && matchesImpact;
    });
  }, [rfiItems, searchTerm, selectedDiscipline, selectedStatus, selectedPriority, selectedImpact, targetOverrides]);

  const sortedRfis = useMemo(() => {
    return [...filteredRfis].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'submittalNo') {
        cmp = a.submittalNo.localeCompare(b.submittalNo, undefined, { numeric: true });
      } else if (sortField === 'submittedDate') {
        cmp = (a.submittedDate || '').localeCompare(b.submittedDate || '');
      } else if (sortField === 'respondedDate') {
        cmp = (a.respondedDate || '').localeCompare(b.respondedDate || '');
      } else if (sortField === 'actualDays') {
        const targetA = a.targetDays || 7;
        const delayA = checkSubmittalDelay(a, targetA).elapsedDays ?? 0;
        const targetB = b.targetDays || 7;
        const delayB = checkSubmittalDelay(b, targetB).elapsedDays ?? 0;
        cmp = delayA - delayB;
      } else if (sortField === 'priority') {
        const pOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        cmp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
      } else if (sortField === 'status') {
        cmp = (a.rfiStatus || a.status).localeCompare(b.rfiStatus || b.status);
      } else if (sortField === 'attachmentsCount') {
        const countA = a.attachmentsCount ?? a.attachments?.length ?? 0;
        const countB = b.attachmentsCount ?? b.attachments?.length ?? 0;
        cmp = countA - countB;
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRfis, sortField, sortDirection]);

  // Multi-select helper computed states
  const isAllSelected = useMemo(() => {
    if (sortedRfis.length === 0) return false;
    return sortedRfis.every(rfi => selectedRfiIds.includes(rfi.id));
  }, [sortedRfis, selectedRfiIds]);

  const isSomeSelected = useMemo(() => {
    if (sortedRfis.length === 0) return false;
    const count = sortedRfis.filter(rfi => selectedRfiIds.includes(rfi.id)).length;
    return count > 0 && count < sortedRfis.length;
  }, [sortedRfis, selectedRfiIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const visibleIdSet = new Set(sortedRfis.map(r => r.id));
      setSelectedRfiIds(prev => prev.filter(id => !visibleIdSet.has(id)));
    } else {
      const visibleIds = sortedRfis.map(r => r.id);
      setSelectedRfiIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectRfi = (id: string) => {
    setSelectedRfiIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedRfiIds([]);
    setIsBulkActionMenuOpen(false);
  };

  // Selected RFI objects for modal display
  const selectedRfiObjects = useMemo(() => {
    return allSubmittals.filter(s => selectedRfiIds.includes(s.id));
  }, [allSubmittals, selectedRfiIds]);

  // Execute Bulk Status Update
  const executeBulkStatusChange = (
    status: string,
    customNote?: string,
    cost?: string,
    sched?: string
  ) => {
    if (selectedRfiIds.length === 0) return;

    let overallStatus = 'Under Review';
    if (status === 'Approved') {
      overallStatus = 'Approved';
    } else if (status === 'Approved with Comments') {
      overallStatus = 'Approved with Comments';
    } else if (
      status === 'Clarification Issued' ||
      status === 'Closed / Agreed' ||
      status === 'Approved as Proposed'
    ) {
      overallStatus = 'Approved / Closed';
    } else if (status.includes('Resubmit') || status.includes('Revision')) {
      overallStatus = 'Rejected / Resubmit';
    } else if (status === 'Void / Withdrawn') {
      overallStatus = 'Closed';
    }

    const today = new Date().toISOString().split('T')[0];
    const responder =
      currentUserObj?.fullName ||
      currentUserObj?.username ||
      consultant.residentEngineerName ||
      'Resident Engineer';

    const shouldSetRespondedDate =
      status === 'Approved' ||
      status === 'Approved with Comments' ||
      status === 'Clarification Issued' ||
      status === 'Closed / Agreed';

    const updatedList = allSubmittals.map(item => {
      if (!selectedRfiIds.includes(item.id)) return item;

      let updatedThread = item.correspondenceThread ? [...item.correspondenceThread] : [];
      if (customNote && customNote.trim()) {
        const newMsg: RfiCorrespondenceMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: 'Consultant',
          authorName: responder,
          role: 'Supervision Consultant Approver',
          message: customNote.trim(),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        updatedThread = [...updatedThread, newMsg];
      }

      return {
        ...item,
        status: overallStatus,
        rfiStatus: status,
        respondedDate: shouldSetRespondedDate ? (item.respondedDate || today) : item.respondedDate,
        consultantResponder: item.consultantResponder || responder,
        consultantResponse:
          customNote && customNote.trim()
            ? customNote.trim()
            : item.consultantResponse || `Status certified to "${status}" by Approver`,
        costImpact: cost && cost !== 'keep' ? cost : item.costImpact,
        scheduleImpact: sched && sched !== 'keep' ? sched : item.scheduleImpact,
        correspondenceThread: updatedThread
      };
    });

    onUpdateSubmittals(
      updatedList,
      `Bulk updated ${selectedRfiIds.length} RFI(s) to status "${status}"`
    );

    setSelectedRfiIds([]);
    setIsBulkModalOpen(false);
    setBulkDirectiveNote('');
    setIsBulkActionMenuOpen(false);
  };

  // Open Detailed Correspondence Thread
  const handleOpenThread = (rfi: ConsultantSubmittalKpi) => {
    setActiveRfi(rfi);
    setReplyAuthor(consultant.residentEngineerName || 'Resident Engineer');
    setReplyRole('Resident Engineer');
    setReplySender('Consultant');
    setReplyMessage('');
    setReplyStatusUpdate('no_change');
    setIsThreadModalOpen(true);
  };

  // Add a new message / reply to the correspondence thread
  const handleAddThreadMessage = () => {
    if (!activeRfi || !replyMessage.trim()) return;

    const newMessage: RfiCorrespondenceMessage = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      sender: replySender,
      authorName: replyAuthor.trim() || (replySender === 'Contractor' ? 'Contractor Representative' : 'Supervision Consultant'),
      role: replyRole.trim() || undefined,
      message: replyMessage.trim()
    };

    const currentThread = activeRfi.correspondenceThread ? [...activeRfi.correspondenceThread] : [];
    const updatedThread = [...currentThread, newMessage];

    let updatedStatus = activeRfi.status;
    let updatedRfiStatus = activeRfi.rfiStatus;
    let updatedRespondedDate = activeRfi.respondedDate;
    let updatedConsultantResponse = activeRfi.consultantResponse;
    let updatedConsultantResponder = activeRfi.consultantResponder;

    if (replyStatusUpdate !== 'no_change') {
      if (replyStatusUpdate === 'Approved') {
        updatedStatus = 'Approved';
        updatedRfiStatus = 'Approved';
        if (!updatedRespondedDate) {
          updatedRespondedDate = new Date().toISOString().split('T')[0];
        }
        if (replySender === 'Consultant') {
          updatedConsultantResponse = replyMessage.trim() || 'Supervision Consultant certified RFI with formal Approval.';
          updatedConsultantResponder = replyAuthor.trim() || consultant.residentEngineerName;
        }
      } else if (replyStatusUpdate === 'Approved with Comments') {
        updatedStatus = 'Approved with Comments';
        updatedRfiStatus = 'Approved with Comments';
        if (!updatedRespondedDate) {
          updatedRespondedDate = new Date().toISOString().split('T')[0];
        }
        if (replySender === 'Consultant') {
          updatedConsultantResponse = replyMessage.trim() || 'Supervision Consultant certified RFI with Approval with Comments.';
          updatedConsultantResponder = replyAuthor.trim() || consultant.residentEngineerName;
        }
      } else if (replyStatusUpdate === 'Clarification Issued') {
        updatedStatus = 'Approved / Closed';
        updatedRfiStatus = 'Clarification Issued';
        if (!updatedRespondedDate) {
          updatedRespondedDate = new Date().toISOString().split('T')[0];
        }
        if (replySender === 'Consultant') {
          updatedConsultantResponse = replyMessage.trim();
          updatedConsultantResponder = replyAuthor.trim() || consultant.residentEngineerName;
        }
      } else if (replyStatusUpdate === 'Closed / Agreed') {
        updatedStatus = 'Approved / Closed';
        updatedRfiStatus = 'Closed / Agreed';
        if (!updatedRespondedDate) {
          updatedRespondedDate = new Date().toISOString().split('T')[0];
        }
      } else if (replyStatusUpdate === 'Under Technical Review') {
        updatedStatus = 'Under Review';
        updatedRfiStatus = 'Under Technical Review';
      } else if (replyStatusUpdate === 'Resubmit / Revision Required') {
        updatedStatus = 'Rejected / Resubmit';
        updatedRfiStatus = 'Resubmit / Revision Required';
      }
    } else if (replySender === 'Consultant' && !updatedConsultantResponse) {
      updatedConsultantResponse = replyMessage.trim();
      updatedConsultantResponder = replyAuthor.trim();
      if (!updatedRespondedDate) {
        updatedRespondedDate = new Date().toISOString().split('T')[0];
      }
    }

    let actualDays = activeRfi.actualDays;
    if (updatedRespondedDate && activeRfi.submittedDate) {
      const sTime = new Date(activeRfi.submittedDate).getTime();
      const rTime = new Date(updatedRespondedDate).getTime();
      if (!isNaN(sTime) && !isNaN(rTime) && rTime >= sTime) {
        actualDays = Math.round((rTime - sTime) / (1000 * 60 * 60 * 24));
      }
    }

    const updatedRfiObj: ConsultantSubmittalKpi = {
      ...activeRfi,
      correspondenceThread: updatedThread,
      status: updatedStatus,
      rfiStatus: updatedRfiStatus,
      respondedDate: updatedRespondedDate,
      actualDays,
      consultantResponse: updatedConsultantResponse,
      consultantResponder: updatedConsultantResponder
    };

    const updatedList = allSubmittals.map(item => item.id === updatedRfiObj.id ? updatedRfiObj : item);
    onUpdateSubmittals(updatedList, `Added correspondence entry to ${updatedRfiObj.submittalNo}`);
    setActiveRfi(updatedRfiObj);
    setReplyMessage('');
    setReplyStatusUpdate('no_change');
  };

  // Open Quick Respond / Clarification Modal
  const handleOpenRespondModal = (rfi: ConsultantSubmittalKpi) => {
    setRespondingRfi(rfi);
    setResponseForm({
      responderName: rfi.consultantResponder || consultant.residentEngineerName || 'Resident Engineer',
      respondedDate: rfi.respondedDate || new Date().toISOString().split('T')[0],
      consultantResponse: rfi.consultantResponse || '',
      newStatus: 'Approved / Closed',
      newRfiStatus: 'Clarification Issued',
      costImpact: rfi.costImpact || 'None',
      scheduleImpact: rfi.scheduleImpact || 'None'
    });
    setIsRespondModalOpen(true);
  };

  // Submit Formal Consultant Clarification Response
  const handleSubmitResponse = () => {
    if (!respondingRfi || !responseForm.consultantResponse.trim()) return;

    let actualDays = respondingRfi.actualDays;
    if (responseForm.respondedDate && respondingRfi.submittedDate) {
      const sTime = new Date(respondingRfi.submittedDate).getTime();
      const rTime = new Date(responseForm.respondedDate).getTime();
      if (!isNaN(sTime) && !isNaN(rTime) && rTime >= sTime) {
        actualDays = Math.round((rTime - sTime) / (1000 * 60 * 60 * 24));
      }
    }

    const responseMsg: RfiCorrespondenceMessage = {
      id: `msg_${Date.now()}`,
      timestamp: `${responseForm.respondedDate} 14:00`,
      sender: 'Consultant',
      authorName: responseForm.responderName,
      role: 'Supervision Consultant / Resident Engineer',
      message: `Formal Design Clarification Directive: ${responseForm.consultantResponse.trim()}`
    };

    const updatedThread = respondingRfi.correspondenceThread ? [...respondingRfi.correspondenceThread, responseMsg] : [responseMsg];

    const updatedRfiObj: ConsultantSubmittalKpi = {
      ...respondingRfi,
      respondedDate: responseForm.respondedDate,
      actualDays,
      consultantResponse: responseForm.consultantResponse.trim(),
      consultantResponder: responseForm.responderName,
      status: responseForm.newStatus,
      rfiStatus: responseForm.newRfiStatus,
      costImpact: responseForm.costImpact,
      scheduleImpact: responseForm.scheduleImpact,
      correspondenceThread: updatedThread
    };

    const updatedList = allSubmittals.map(item => item.id === updatedRfiObj.id ? updatedRfiObj : item);
    onUpdateSubmittals(updatedList, `Issued consultant design clarification response for ${updatedRfiObj.submittalNo}`);
    setIsRespondModalOpen(false);
    if (activeRfi && activeRfi.id === updatedRfiObj.id) {
      setActiveRfi(updatedRfiObj);
    }
  };

  // Save New RFI
  const handleSaveNewRfi = () => {
    if (!newRfiForm.submittalNo || !newRfiForm.title) return;

    const target = Number(newRfiForm.targetDays) || 7;
    const initialThread: RfiCorrespondenceMessage[] = [];

    if (newRfiForm.contractorInquiry) {
      initialThread.push({
        id: `msg_${Date.now()}`,
        timestamp: `${newRfiForm.submittedDate || new Date().toISOString().split('T')[0]} 09:00`,
        sender: 'Contractor',
        authorName: newRfiForm.contractorContact || `${project.contractor || 'Contractor'} Representative`,
        role: 'Contractor Technical Lead',
        message: newRfiForm.contractorInquiry
      });
    }

    const newRecord: ConsultantSubmittalKpi = {
      id: `rfi_${Date.now()}`,
      submittalNo: newRfiForm.submittalNo,
      type: 'RFI',
      title: newRfiForm.title,
      discipline: newRfiForm.discipline || 'Structures & Bridges',
      stationKm: newRfiForm.stationKm || undefined,
      drawingRef: newRfiForm.drawingRef || undefined,
      specificationRef: newRfiForm.specificationRef || undefined,
      contractorContact: newRfiForm.contractorContact || undefined,
      contractorCompany: project.contractor || undefined,
      contractorInquiry: newRfiForm.contractorInquiry || undefined,
      submittedDate: newRfiForm.submittedDate || new Date().toISOString().split('T')[0],
      targetDays: target,
      status: newRfiForm.status || 'Under Review',
      rfiStatus: newRfiForm.rfiStatus || 'Awaiting Consultant Response',
      priority: newRfiForm.priority || 'High',
      costImpact: newRfiForm.costImpact || 'None',
      scheduleImpact: newRfiForm.scheduleImpact || 'None',
      assignedEngineer: newRfiForm.assignedEngineer || consultant.residentEngineerName || '',
      notes: newRfiForm.notes || '',
      attachmentsCount: newRfiForm.attachments?.length || newRfiForm.attachmentsCount || 0,
      attachments: newRfiForm.attachments || [],
      correspondenceThread: initialThread
    };

    const updatedList = [newRecord, ...allSubmittals];
    onUpdateSubmittals(updatedList, `Created RFI ${newRecord.submittalNo} - ${newRecord.title}`);
    setIsNewRfiModalOpen(false);
  };

  // Open Edit RFI Modal
  const handleOpenEditModal = (rfi: ConsultantSubmittalKpi) => {
    setEditingRfiDraft({ ...rfi });
    setIsEditRfiModalOpen(true);
  };

  // Save Edit RFI Draft
  const handleSaveEditDraft = () => {
    if (!editingRfiDraft) return;

    let actualDays = editingRfiDraft.actualDays;
    if (editingRfiDraft.respondedDate && editingRfiDraft.submittedDate) {
      const sTime = new Date(editingRfiDraft.submittedDate).getTime();
      const rTime = new Date(editingRfiDraft.respondedDate).getTime();
      if (!isNaN(sTime) && !isNaN(rTime) && rTime >= sTime) {
        actualDays = Math.round((rTime - sTime) / (1000 * 60 * 60 * 24));
      }
    }

    const finalDraft: ConsultantSubmittalKpi = {
      ...editingRfiDraft,
      actualDays
    };

    const updatedList = allSubmittals.map(item => item.id === finalDraft.id ? finalDraft : item);
    onUpdateSubmittals(updatedList, `Updated RFI ${finalDraft.submittalNo}`);
    setIsEditRfiModalOpen(false);
    if (activeRfi && activeRfi.id === finalDraft.id) {
      setActiveRfi(finalDraft);
    }
  };

  // Delete RFI with admin guard
  const handleDeleteRfi = (rfi: ConsultantSubmittalKpi) => {
    const isApproved =
      rfi.status === 'Approved' ||
      rfi.status === 'Approved / Closed' ||
      rfi.status === 'Approved with Comments' ||
      rfi.status === 'Approved with Comment' ||
      rfi.status === 'Closed' ||
      rfi.rfiStatus === 'Approved' ||
      rfi.rfiStatus === 'Approved with Comments' ||
      rfi.rfiStatus === 'Closed / Agreed';
    const isAdminUser = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'cpm_admin';

    if (isApproved && !isAdminUser) {
      alert('Access Denied: Once an RFI clarification is closed or approved, only Administrator accounts can delete it.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete RFI record ${rfi.submittalNo} (${rfi.title})?`)) return;

    const updatedList = allSubmittals.filter(item => item.id !== rfi.id);
    onUpdateSubmittals(updatedList, `Deleted RFI ${rfi.submittalNo}`);
    if (activeRfi?.id === rfi.id) {
      setIsThreadModalOpen(false);
      setActiveRfi(null);
    }
  };

  // Export Filtered RFIs to CSV or Excel File for Professional Reporting
  const handleExportRfi = (format: 'csv' | 'excel' = 'csv') => {
    if (sortedRfis.length === 0) {
      alert('No RFI records match the current filter criteria to export.');
      return;
    }

    const exportDate = new Date().toISOString().split('T')[0];
    const projectTitle = project.name || 'Highway Project';
    const consultantName = consultant.firmName || 'Supervision Consultant';
    const contractorName = project.contractor || 'Main Contractor';

    if (format === 'excel') {
      // Professional HTML/XML based Excel Table report format
      const tableRowsHtml = sortedRfis.map((r, idx) => {
        const target = r.targetDays || targetOverrides['RFI'] || 7;
        const delayInfo = checkSubmittalDelay(r, target);
        const slaStatus = delayInfo.isDelayed ? 'Delayed (> SLA)' : delayInfo.isResolved ? 'Resolved On-Time' : 'Within SLA';
        const curStatus = r.rfiStatus || r.status;
        const pdfCount = r.attachmentsCount ?? r.attachments?.length ?? 0;
        const msgCount = r.correspondenceThread?.length || 0;

        return `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: bold;">${r.submittalNo}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.discipline || 'General'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 600;">${(r.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.stationKm || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.drawingRef || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.specificationRef || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${(r.contractorInquiry || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.submittedDate || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; color: #047857; font-weight: 500;">${(r.consultantResponse || 'Pending directive').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${r.consultantResponder || r.assignedEngineer || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.respondedDate || 'Pending'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${delayInfo.elapsedDays !== undefined ? delayInfo.elapsedDays : '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${target}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: ${delayInfo.isDelayed ? '#dc2626' : '#16a34a'};">${slaStatus}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${curStatus}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.priority}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.costImpact || 'None'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${r.scheduleImpact || 'None'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${pdfCount}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${msgCount}</td>
          </tr>
        `;
      }).join('');

      const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>RFI Register</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body style="font-family: Arial, sans-serif; font-size: 11px;">
          <h2 style="color: #1e3a8a; margin-bottom: 4px;">ETHIOPIAN ROADS ADMINISTRATION (ERA)</h2>
          <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 8px;">REQUEST FOR INFORMATION (RFI) &amp; DESIGN CLARIFICATION LOG</h3>
          <table style="margin-bottom: 12px; font-size: 11px;">
            <tr><td><strong>Project:</strong></td><td>${projectTitle}</td><td><strong>Export Date:</strong></td><td>${exportDate}</td></tr>
            <tr><td><strong>Supervision Consultant:</strong></td><td>${consultantName}</td><td><strong>Filtered Records:</strong></td><td>${sortedRfis.length} of ${rfiItems.length}</td></tr>
            <tr><td><strong>Contractor:</strong></td><td>${contractorName}</td><td><strong>Active Filters:</strong></td><td>Status: ${selectedStatus} | Discipline: ${selectedDiscipline} | Priority: ${selectedPriority}</td></tr>
          </table>
          <table style="border-collapse: collapse; width: 100%; font-size: 11px;">
            <thead>
              <tr style="background-color: #1e3a8a; color: #ffffff; text-align: left;">
                <th style="border: 1px solid #cbd5e1; padding: 8px;">RFI No</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Discipline</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Subject / Title</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Station / Location</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Drawing Ref</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Specification Ref</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Contractor Technical Inquiry</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Submitted Date</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Consultant Directive / Decision</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Consultant Responder</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Responded Date</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Turnaround (Days)</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Target SLA (Days)</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">SLA Compliance</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Current Status</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Priority</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Cost Impact</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Schedule Impact</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">PDFs</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Thread Messages</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RFI_Filtered_Log_${project.id || 'export'}_${exportDate}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Standard RFC-4180 CSV with UTF-8 BOM
    const headers = [
      'RFI No',
      'Discipline',
      'Subject / Title',
      'Station / Chainage Location',
      'Drawing Ref',
      'Specification Ref',
      'Contractor Technical Inquiry',
      'Submitted Date',
      'Consultant Directive / Decision',
      'Consultant Responder',
      'Responded Date',
      'SLA Turnaround (Days)',
      'Target SLA (Days)',
      'SLA Compliance',
      'Current Status',
      'Priority',
      'Cost Impact',
      'Schedule Impact',
      'PDF Attachments Count',
      'Correspondence Messages Count'
    ];

    const rows = sortedRfis.map(r => {
      const target = r.targetDays || targetOverrides['RFI'] || 7;
      const delayInfo = checkSubmittalDelay(r, target);
      const slaStatus = delayInfo.isDelayed ? 'Delayed (> SLA)' : delayInfo.isResolved ? 'Resolved On-Time' : 'Within SLA';

      return [
        `"${r.submittalNo}"`,
        `"${r.discipline || 'General'}"`,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.stationKm || '').replace(/"/g, '""')}"`,
        `"${(r.drawingRef || '').replace(/"/g, '""')}"`,
        `"${(r.specificationRef || '').replace(/"/g, '""')}"`,
        `"${(r.contractorInquiry || '').replace(/"/g, '""')}"`,
        `"${r.submittedDate || ''}"`,
        `"${(r.consultantResponse || '').replace(/"/g, '""')}"`,
        `"${(r.consultantResponder || r.assignedEngineer || '').replace(/"/g, '""')}"`,
        `"${r.respondedDate || ''}"`,
        delayInfo.elapsedDays !== undefined ? delayInfo.elapsedDays : '',
        target,
        `"${slaStatus}"`,
        `"${r.rfiStatus || r.status}"`,
        `"${r.priority}"`,
        `"${r.costImpact || 'None'}"`,
        `"${r.scheduleImpact || 'None'}"`,
        r.attachmentsCount ?? r.attachments?.length ?? 0,
        r.correspondenceThread?.length || 0
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RFI_Filtered_Log_${project.id || 'export'}_${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* RFI Operational Context & Alignment Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-400/30 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Technical RFI & Design Clarification Register
              </span>
              <span className="px-2.5 py-0.5 bg-white/10 text-white/90 rounded-full text-xs font-semibold border border-white/15">
                FIDIC Sub-Clause 1.5 & 3.3 Compliance
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-400/30 font-mono">
                {rfiItems.length} Total RFIs Logged
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              Contractor ⇄ Consultant Design Clarification Log
            </h2>


          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isReadonly && (
              <button
                onClick={() => setIsNewRfiModalOpen(true)}
                className="px-4 py-2.5 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit New RFI
              </button>
            )}
            <button
              onClick={() => handleExportRfi('csv')}
              className="px-4 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 flex items-center gap-2 transition cursor-pointer"
              title="Export all currently filtered RFI records to CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Register (CSV)
            </button>
          </div>
        </div>


      </div>

      {/* Live RFI KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Total RFIs</span>
            <FileText className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {rfiMetrics.total}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Design inquiries logged
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Awaiting Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
            {rfiMetrics.awaitingResponseCount}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            Pending consultant reply
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Clarified / Closed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {rfiMetrics.closedCount}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
            Directives finalized
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Overdue SLA</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${rfiMetrics.delayedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {rfiMetrics.delayedCount}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            &gt; 7 days turnaround
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Cost Impact</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
            {rfiMetrics.costImpactCount}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Potential variations
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Avg Turnaround</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
            {rfiMetrics.avgTurnaround} <span className="text-xs font-normal text-slate-400">d</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            {rfiMetrics.complianceRate}% SLA rate
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search RFI #, clarification subject, station Km, drawing #, inquiry or response..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Discipline Selector */}
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Disciplines</option>
            {RFI_DISCIPLINES.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending / Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Approved with Comments">Approved with Comments</option>
            <option value="REJECTED">Rejected / Resubmit Required</option>
            <option value="Clarification Issued">Clarification Issued</option>
            <option value="CLOSED">Closed / Agreed</option>
            <option value="OVERDUE">Overdue SLA</option>
          </select>

          {/* Priority Selector */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Impact Selector */}
          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Impacts</option>
            <option value="COST">Has Potential Cost Impact</option>
            <option value="SCHEDULE">Has Schedule Delay Risk</option>
            <option value="NEUTRAL">No Cost/Schedule Impact</option>
          </select>

          {/* Export Filtered Records (CSV & Excel) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExportRfi('csv')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={`Export ${sortedRfis.length} filtered RFI records to CSV for spreadsheet reporting`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
              <span className="px-1.5 py-0.2 bg-emerald-200/80 dark:bg-emerald-900 rounded-md text-[10px] font-mono font-bold">
                {sortedRfis.length}
              </span>
            </button>
            <button
              onClick={() => handleExportRfi('excel')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={`Export ${sortedRfis.length} filtered RFI records to professional formatted Excel report (.xls)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel Report</span>
            </button>
          </div>

          {/* View Toggle: Table vs Cards */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewLayout('table')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewLayout === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewLayout('cards')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewLayout === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* BULK ACTION BAR FOR SUPERVISION CONSULTANT APPROVER */}
      {isSupervisionConsultantApprover && selectedRfiIds.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-indigo-700/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm shadow-xs border border-indigo-400/40">
              {selectedRfiIds.length}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{selectedRfiIds.length} RFI{selectedRfiIds.length > 1 ? 's' : ''} Selected</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Consultant Approver Bulk Mode
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">
                Perform bulk approval certification or status directives
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Quick Bulk Approve */}
            <button
              onClick={() => executeBulkStatusChange('Approved')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Instantly bulk certify and approve all selected RFIs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Bulk Approve</span>
            </button>

            {/* Bulk Approve with Comments */}
            <button
              onClick={() => {
                setBulkTargetStatus('Approved with Comments');
                setIsBulkModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Approve with remarks or conditions"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Approve w/ Comments...</span>
            </button>

            {/* Action Menu Dropdown / Modal Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsBulkActionMenuOpen(prev => !prev)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Bulk Action Menu</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isBulkActionMenuOpen ? 'rotate-90' : ''}`} />
              </button>

              {isBulkActionMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-40 text-slate-800 dark:text-slate-200">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    Bulk Status Actions
                  </div>
                  <button
                    onClick={() => {
                      executeBulkStatusChange('Approved');
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Set Status: Approved</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkTargetStatus('Approved with Comments');
                      setIsBulkModalOpen(true);
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>📝 Set: Approved with Comments...</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkTargetStatus('Clarification Issued');
                      setIsBulkModalOpen(true);
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-cyan-50 dark:hover:bg-cyan-950/50 text-xs font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Set: Clarification Issued...</span>
                  </button>
                  <button
                    onClick={() => {
                      executeBulkStatusChange('Closed / Agreed');
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Set: Closed / Agreed</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkTargetStatus('Resubmit / Revision Required');
                      setIsBulkModalOpen(true);
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Set: Resubmit Required...</span>
                  </button>
                  <button
                    onClick={() => {
                      executeBulkStatusChange('Under Technical Review');
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Set: Under Technical Review</span>
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={() => {
                      setIsBulkModalOpen(true);
                      setIsBulkActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Bulk Directive Editor...</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clear Selection */}
            <button
              onClick={clearSelection}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RFI Table or Card View */}
      {viewLayout === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold select-none">
                <tr>
                  {isSupervisionConsultantApprover && (
                    <th className="p-3.5 w-10 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          title={isAllSelected ? "Deselect all visible RFIs" : "Select all visible RFIs"}
                        />
                      </div>
                    </th>
                  )}
                  <th className="p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60" onClick={() => { setSortField('submittalNo'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1">
                      <span>RFI #</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5">Discipline & Location</th>
                  <th className="p-3.5">Clarification Subject & Drawing Ref</th>
                  <th className="p-3.5">Contractor Inquiry / Technical Question</th>
                  <th className="p-3.5">Consultant Directive / Decision</th>
                  <th className="p-3.5 text-center">Submitted / Responded</th>
                  <th className="p-3.5 text-center">SLA Turnaround</th>
                  <th className="p-3.5 text-center">Impacts</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60" onClick={() => { setSortField('attachmentsCount'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center justify-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>PDFs</span>
                    </div>
                  </th>
                  <th className="p-3.5 text-center">Thread</th>
                  {isSupervisionConsultantApprover && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedRfis.length === 0 ? (
                  <tr>
                    <td colSpan={isSupervisionConsultantApprover ? 13 : 11} className="p-8 text-center text-slate-400">
                      No Request for Information (RFI) records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sortedRfis.map((rfi, idx) => {
                    const isSelected = selectedRfiIds.includes(rfi.id);
                    const target = rfi.targetDays || targetOverrides['RFI'] || 7;
                    const delayInfo = checkSubmittalDelay(rfi, target);
                    const msgCount = rfi.correspondenceThread?.length || 0;
                    const pdfCount = rfi.attachmentsCount ?? rfi.attachments?.length ?? 0;
                    const hasCost = rfi.costImpact && rfi.costImpact !== 'None';
                    const hasSched = rfi.scheduleImpact && rfi.scheduleImpact !== 'None';

                    return (
                      <tr
                        key={`rfi-row-${rfi.id}-${idx}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                        }`}
                      >
                        {/* Multi-Select Checkbox Column (Approvers only) */}
                        {isSupervisionConsultantApprover && (
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRfi(rfi.id)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                title={`Select ${rfi.submittalNo}`}
                              />
                            </div>
                          </td>
                        )}
                        {/* RFI No & Priority */}
                        <td className="p-3.5 font-mono font-bold">
                          <button
                            onClick={() => handleOpenThread(rfi)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold text-left cursor-pointer"
                          >
                            <span>{rfi.submittalNo}</span>
                          </button>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            rfi.priority === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            rfi.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {rfi.priority}
                          </span>
                        </td>

                        {/* Discipline & Station Location */}
                        <td className="p-3.5 max-w-[150px]">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold block truncate">
                            {rfi.discipline || 'General'}
                          </span>
                          {rfi.stationKm && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{rfi.stationKm}</span>
                            </div>
                          )}
                        </td>

                        {/* Subject & Drawing / Spec Ref */}
                        <td className="p-3.5 max-w-xs">
                          <div 
                            onClick={() => handleOpenThread(rfi)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer line-clamp-2"
                            title={rfi.title}
                          >
                            {rfi.title}
                          </div>
                          {(rfi.drawingRef || rfi.specificationRef) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                              {rfi.drawingRef && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate max-w-[140px]" title={rfi.drawingRef}>
                                  Dwg: {rfi.drawingRef}
                                </span>
                              )}
                              {rfi.specificationRef && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 truncate max-w-[140px]" title={rfi.specificationRef}>
                                  Spec: {rfi.specificationRef}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Contractor Inquiry Preview */}
                        <td className="p-3.5 max-w-[220px]">
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug" title={rfi.contractorInquiry || 'No inquiry text recorded'}>
                            {rfi.contractorInquiry ? `"${rfi.contractorInquiry}"` : <span className="text-slate-400 italic">Clarification inquiry recorded in submittal notes</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                            By: {rfi.contractorContact || project.contractor || 'Contractor'}
                          </div>
                        </td>

                        {/* Consultant Response / Directive */}
                        <td className="p-3.5 max-w-[220px]">
                          {rfi.consultantResponse ? (
                            <div>
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 line-clamp-2 leading-snug" title={rfi.consultantResponse}>
                                "{rfi.consultantResponse}"
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                                Eng: {rfi.consultantResponder || rfi.assignedEngineer || 'Resident Engineer'}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Clarification pending from Consultant</span>
                            </div>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                            Sub: {rfi.submittedDate}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {rfi.respondedDate ? `Res: ${rfi.respondedDate}` : 'Pending'}
                          </div>
                        </td>

                        {/* SLA Turnaround */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                              {delayInfo.elapsedDays !== undefined ? `${delayInfo.elapsedDays} d` : '-'}
                              <span className="text-[9px] text-slate-400 font-normal"> / {target}d SLA</span>
                            </span>
                            {delayInfo.isDelayed ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[9px] font-bold">
                                Delayed
                              </span>
                            ) : delayInfo.isResolved ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold">
                                On Time
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-bold">
                                Within SLA
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Impacts */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            {hasCost ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                                <DollarSign className="w-2.5 h-2.5" /> Variation Risk
                              </span>
                            ) : null}
                            {hasSched ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[9px] font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> EOT Risk
                              </span>
                            ) : null}
                            {!hasCost && !hasSched && (
                              <span className="text-[10px] text-slate-400">Neutral</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {(() => {
                            const curStatus = rfi.rfiStatus || rfi.status;
                            const isApprovedOnly = curStatus === 'Approved' || (rfi.status === 'Approved' && !curStatus.includes('Comment'));
                            const isApprovedWithComments = curStatus === 'Approved with Comments' || curStatus === 'Approved with Comment' || rfi.status === 'Approved with Comments' || rfi.status === 'Approved with Comment';
                            const isClosedOrAgreed = curStatus === 'Closed / Agreed' || rfi.status === 'Approved / Closed' || rfi.status === 'Closed';
                            const isClarification = curStatus === 'Clarification Issued';

                            if (isApprovedOnly) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  Approved
                                </span>
                              );
                            }
                            if (isApprovedWithComments) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800">
                                  <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  Approved w/ Comments
                                </span>
                              );
                            }
                            if (isClarification) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800">
                                  <Send className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                                  Clarification Issued
                                </span>
                              );
                            }
                            if (isClosedOrAgreed) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  Closed / Agreed
                                </span>
                              );
                            }
                            if (curStatus === 'Resubmit / Revision Required' || curStatus === 'Rejected / Resubmit') {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  Resubmit Required
                                </span>
                              );
                            }
                            if (delayInfo.isDelayed) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800">
                                  <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  Overdue SLA
                                </span>
                              );
                            }
                            return (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {curStatus}
                              </span>
                            );
                          })()}
                        </td>

                        {/* PDF Attachments */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {pdfCount > 0 ? (
                              <button
                                onClick={() => setActiveAttachmentModalRfi(rfi)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="View & Manage Attached PDF Documents"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-500" />
                                <span>{pdfCount}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                            )}

                            {!isReadonly && (!isContractorUser || canContractorAddOrEdit) && (
                              <label
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer transition inline-flex items-center justify-center"
                                title="Attach PDF file to this RFI"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  multiple
                                  onChange={(e) => handleDirectPdfUpload(rfi, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </td>

                        {/* Correspondence Thread Count */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenThread(rfi)}
                            className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                            title="Open Technical Correspondence Thread"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{msgCount}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        {isSupervisionConsultantApprover && (
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {!isReadonly && !rfi.consultantResponse && (
                                <button
                                  onClick={() => handleOpenRespondModal(rfi)}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg transition"
                                  title="Issue Consultant Clarification Directive"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenThread(rfi)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg transition"
                                title="View Full RFI Details & Thread"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {!isReadonly && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(rfi)}
                                    className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg transition"
                                    title="Edit RFI Record"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRfi(rfi)}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded-lg transition"
                                    title="Delete RFI"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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
        </div>
      ) : (
        /* Card Layout View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedRfis.map((rfi) => {
            const target = rfi.targetDays || 7;
            const delayInfo = checkSubmittalDelay(rfi, target);
            const msgCount = rfi.correspondenceThread?.length || 0;

            return (
              <div
                key={`rfi-card-${rfi.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                          {rfi.submittalNo}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                          {rfi.discipline || 'General'}
                        </span>
                      </div>
                      <h4 
                        onClick={() => handleOpenThread(rfi)}
                        className="text-sm font-bold text-slate-900 dark:text-white mt-1 cursor-pointer hover:text-indigo-600 transition"
                      >
                        {rfi.title}
                      </h4>
                    </div>

                    {(() => {
                      const curStatus = rfi.rfiStatus || rfi.status;
                      const isApprovedOnly = curStatus === 'Approved' || (rfi.status === 'Approved' && !curStatus.includes('Comment'));
                      const isApprovedWithComments = curStatus === 'Approved with Comments' || curStatus === 'Approved with Comment' || rfi.status === 'Approved with Comments' || rfi.status === 'Approved with Comment';

                      if (isApprovedOnly) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Approved
                          </span>
                        );
                      }
                      if (isApprovedWithComments) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Approved w/ Comments
                          </span>
                        );
                      }
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                          rfi.status === 'Approved / Closed' || rfi.rfiStatus === 'Closed / Agreed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {rfi.rfiStatus || rfi.status}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                    {rfi.stationKm && (
                      <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400" /> {rfi.stationKm}
                      </span>
                    )}
                    {rfi.drawingRef && (
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                        Dwg: {rfi.drawingRef}
                      </span>
                    )}
                  </div>

                  {/* Contractor Inquiry Box */}
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-xs space-y-1">
                    <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center justify-between">
                      <span>Contractor Inquiry</span>
                      <span>{rfi.submittedDate}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {rfi.contractorInquiry || rfi.notes || 'Technical design clarification inquiry.'}
                    </p>
                  </div>

                  {/* Consultant Response Box */}
                  {rfi.consultantResponse ? (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                        <span>Consultant Directive</span>
                        <span>{rfi.respondedDate || 'Issued'}</span>
                      </div>
                      <p className="text-emerald-950 dark:text-emerald-200 line-clamp-3 leading-relaxed font-medium">
                        {rfi.consultantResponse}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-dashed border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs flex items-center justify-between text-amber-700 dark:text-amber-400">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Consultant Clarification
                      </span>
                      {!isReadonly && (
                        <button
                          onClick={() => handleOpenRespondModal(rfi)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                        >
                          Respond Now
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenThread(rfi)}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{msgCount} Correspondence Messages</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenThread(rfi)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition"
                    >
                      View Thread
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED CORRESPONDENCE THREAD DRAWER / MODAL */}
      <AnimatePresence>
        {isThreadModalOpen && activeRfi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      {activeRfi.submittalNo}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {activeRfi.discipline || 'General'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      (activeRfi.status === 'Approved' || activeRfi.rfiStatus === 'Approved')
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800'
                        : (activeRfi.status === 'Approved with Comments' || activeRfi.status === 'Approved with Comment' || activeRfi.rfiStatus === 'Approved with Comments')
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800'
                        : (activeRfi.status === 'Approved / Closed' || activeRfi.rfiStatus === 'Closed / Agreed')
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {activeRfi.rfiStatus || activeRfi.status}
                    </span>
                    {activeRfi.priority && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {activeRfi.priority} Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeRfi.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                    {activeRfi.stationKm && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Station: {activeRfi.stationKm}
                      </span>
                    )}
                    {activeRfi.drawingRef && (
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 text-slate-400" /> Drawing: {activeRfi.drawingRef}
                      </span>
                    )}
                    {activeRfi.specificationRef && (
                      <span>Spec: {activeRfi.specificationRef}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsThreadModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Formal Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contractor Inquiry Card */}
                  <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" /> Contractor Clarification Request
                      </span>
                      <span className="font-mono text-[11px]">{activeRfi.submittedDate}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                      {activeRfi.contractorInquiry || 'No formal question text registered in initial submittal.'}
                    </p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                      <span>Submitted By: <strong>{activeRfi.contractorContact || project.contractor || 'Contractor'}</strong></span>
                    </div>
                  </div>

                  {/* Consultant Directive Card */}
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Consultant Technical Directive
                      </span>
                      <span className="font-mono text-[11px]">
                        {activeRfi.respondedDate || 'Awaiting Response'}
                      </span>
                    </div>
                    {activeRfi.consultantResponse ? (
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                        {activeRfi.consultantResponse}
                      </p>
                    ) : (
                      <div className="py-4 text-center space-y-2">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                          Formal technical clarification directive is pending from the Resident Engineer.
                        </p>
                        {!isReadonly && (
                          <button
                            onClick={() => {
                              setIsThreadModalOpen(false);
                              handleOpenRespondModal(activeRfi);
                            }}
                            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                          >
                            Draft Directive Now
                          </button>
                        )}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                      <span>Resident Engineer: <strong>{activeRfi.consultantResponder || activeRfi.assignedEngineer || consultant.residentEngineerName || 'Resident Engineer'}</strong></span>
                      {activeRfi.actualDays !== undefined && (
                        <span className="font-mono">Turnaround: {activeRfi.actualDays} days</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Impact Assessment Box */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Contractual Impacts:</span>
                    <span className={`px-2.5 py-1 rounded-lg font-bold ${
                      activeRfi.costImpact && activeRfi.costImpact !== 'None'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      💰 Cost: {activeRfi.costImpact || 'None'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-bold ${
                      activeRfi.scheduleImpact && activeRfi.scheduleImpact !== 'None'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      ⏱️ Schedule: {activeRfi.scheduleImpact || 'None'}
                    </span>
                  </div>

                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    SLA Target: {activeRfi.targetDays || 7} Days
                  </div>
                </div>

                {/* Attached Drawings & Documents */}
                {activeRfi.attachments && activeRfi.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Attached Reference Documents & Sketches ({activeRfi.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRfi.attachments.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                            {att.size && <p className="text-[10px] text-slate-400 font-mono">{att.size}</p>}
                          </div>
                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] flex items-center gap-1 ml-2 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correspondence Dialogue Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      Correspondence History & Clarification Dialogue
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      {activeRfi.correspondenceThread?.length || 0} Entries
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeRfi.correspondenceThread && activeRfi.correspondenceThread.length > 0 ? (
                      activeRfi.correspondenceThread.map((msg, mIdx) => {
                        const isContractor = msg.sender === 'Contractor';
                        const isConsultant = msg.sender === 'Consultant';

                        return (
                          <div
                            key={msg.id || `msg-${mIdx}`}
                            className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                              isContractor
                                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60 ml-0 mr-8'
                                : isConsultant
                                ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-900/60 ml-8 mr-0'
                                : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60 mx-4'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isContractor ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                  isConsultant ? 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                                  'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                                }`}>
                                  {msg.sender}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {msg.authorName}
                                </span>
                                {msg.role && (
                                  <span className="text-[10px] text-slate-400">
                                    ({msg.role})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {msg.timestamp}
                              </span>
                            </div>

                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                        No correspondence thread entries logged yet. Use the message form below to post a formal clarification inquiry or response.
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply / Add Correspondence Action Box */}
                {!isReadonly && (
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      Post Clarification Message or Engineering Directive
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Sender Party</label>
                        <select
                          value={replySender}
                          onChange={(e) => {
                            const s = e.target.value as any;
                            setReplySender(s);
                            if (s === 'Contractor') {
                              setReplyAuthor(activeRfi.contractorContact || 'Contractor Technical Lead');
                              setReplyRole('Contractor Technical Lead');
                            } else {
                              setReplyAuthor(consultant.residentEngineerName || 'Resident Engineer');
                              setReplyRole('Resident Engineer');
                            }
                          }}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="Consultant">Supervision Consultant</option>
                          <option value="Contractor">Works Contractor</option>
                          <option value="Employer / ERA">Employer / ERA</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Author Name</label>
                        <input
                          type="text"
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                          placeholder="e.g. Eng. Resident Engineer"
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Update Status (Optional)</label>
                          {isSupervisionConsultantApprover && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              👔 Approver
                            </span>
                          )}
                        </div>
                        <select
                          value={replyStatusUpdate}
                          onChange={(e) => setReplyStatusUpdate(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="no_change">Keep Current Status</option>
                          <optgroup label="Approval Statuses">
                            <option value="Approved">✓ Mark: Approved</option>
                            <option value="Approved with Comments">📝 Mark: Approved with Comments</option>
                          </optgroup>
                          <optgroup label="Consultant Clarification & Review">
                            <option value="Clarification Issued">Mark: Clarification Issued</option>
                            <option value="Closed / Agreed">Mark: Closed / Agreed</option>
                            <option value="Under Technical Review">Mark: Under Technical Review</option>
                            <option value="Resubmit / Revision Required">Mark: Resubmit Required</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type formal clarification instructions, engineering directive, design verification, or contractor reply..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleAddThreadMessage}
                        disabled={!replyMessage.trim()}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit Correspondence
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-mono">
                  RFI Log Tracking • Project: {project.name}
                </div>
                <button
                  onClick={() => setIsThreadModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW RFI SUBMISSION MODAL */}
      <AnimatePresence>
        {isNewRfiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Submit New Technical RFI
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Contractor Request for Information regarding design clarifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewRfiModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">RFI Reference Number *</label>
                  <input
                    type="text"
                    value={newRfiForm.submittalNo || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, submittalNo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Query / Inspection Category *</label>
                  <select
                    value={newRfiForm.discipline || RFI_INSPECTION_CATEGORIES[0]}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, discipline: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <optgroup label="Request for Inspection (RFI/IRB) Categories">
                      {RFI_INSPECTION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Request for Information (Material / Design Query)">
                      {RFI_INFORMATION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Standard Engineering Disciplines">
                      {RFI_DISCIPLINES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Clarification Subject / Title *</label>
                  <input
                    type="text"
                    value={newRfiForm.title || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, title: e.target.value })}
                    placeholder="e.g. Box Culvert Invert Level Elevation Conflict at Km 32+180"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Station / Chainage Location</label>
                  <input
                    type="text"
                    value={newRfiForm.stationKm || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, stationKm: e.target.value })}
                    placeholder="e.g. Km 18+450 or Km 24+100 - 25+300"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tender Drawing Reference</label>
                  <input
                    type="text"
                    value={newRfiForm.drawingRef || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, drawingRef: e.target.value })}
                    placeholder="e.g. DWG-STR-BC-08 Sheet 3"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Specification Clause Reference</label>
                  <input
                    type="text"
                    value={newRfiForm.specificationRef || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, specificationRef: e.target.value })}
                    placeholder="e.g. ERA Standard Specs Clause 3204"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contractor Submitter / Contact</label>
                  <input
                    type="text"
                    value={newRfiForm.contractorContact || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, contractorContact: e.target.value })}
                    placeholder="e.g. Eng. Mengistu Tadesse"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contractor's Detailed Technical Inquiry / Clarification Request *</label>
                  <textarea
                    rows={3}
                    value={newRfiForm.contractorInquiry || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, contractorInquiry: e.target.value })}
                    placeholder="Detail the ambiguity, discrepancy between drawings and site conditions, conflict with existing utilities, or requested engineering variation..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Submission Date</label>
                  <input
                    type="date"
                    value={newRfiForm.submittedDate || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, submittedDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target SLA (Days)</label>
                  <input
                    type="number"
                    value={newRfiForm.targetDays || 7}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, targetDays: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                  <select
                    value={newRfiForm.priority || 'High'}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, priority: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Critical">Critical (Work Stoppage Risk)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Consultant Engineer</label>
                  <input
                    type="text"
                    value={newRfiForm.assignedEngineer || ''}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, assignedEngineer: e.target.value })}
                    placeholder="e.g. Eng. Birhanu Kebede (Structural)"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Anticipated Cost Impact</label>
                  <select
                    value={newRfiForm.costImpact || 'None'}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, costImpact: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="None">None (Neutral)</option>
                    <option value="Potential Additional Cost">Potential Additional Cost / Variation</option>
                    <option value="Cost Saving">Cost Saving / Value Engineering</option>
                    <option value="Pending Assessment">Pending Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Anticipated Schedule Impact</label>
                  <select
                    value={newRfiForm.scheduleImpact || 'None'}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, scheduleImpact: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="None">None (Float Available)</option>
                    <option value="Potential Delay (Critical Path)">Potential Delay (Critical Path / EOT Risk)</option>
                    <option value="Minor Float Used">Minor Float Used</option>
                    <option value="Pending Assessment">Pending Assessment</option>
                  </select>
                </div>

                {/* PDF Attachments Uploader */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      Attach PDF Documents & Drawings ({newRfiForm.attachments?.length || 0})
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition">
                      <Upload className="w-3 h-3" />
                      <span>Select PDF File(s)</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={(e) => {
                          const files = processPdfFiles(e.target.files);
                          if (files.length === 0) return;
                          const newAtts = files.map(f => ({
                            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            name: f.name,
                            size: f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
                            url: URL.createObjectURL(f),
                            uploadedAt: new Date().toISOString().split('T')[0]
                          }));
                          setNewRfiForm(prev => ({
                            ...prev,
                            attachments: [...(prev.attachments || []), ...newAtts],
                            attachmentsCount: (prev.attachments?.length || 0) + newAtts.length
                          }));
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {newRfiForm.attachments && newRfiForm.attachments.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {newRfiForm.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewRfiForm(prev => {
                                const next = (prev.attachments || []).filter(a => a.id !== att.id);
                                return { ...prev, attachments: next, attachmentsCount: next.length };
                              });
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Optional: Attach technical drawings, inspection sketches, or specification excerpts (PDF format).</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsNewRfiModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewRfi}
                  disabled={!newRfiForm.title || !newRfiForm.submittalNo}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register RFI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK CONSULTANT RESPONSE / CLARIFICATION DIRECTIVE MODAL */}
      <AnimatePresence>
        {isRespondModalOpen && respondingRfi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Issue Engineering Clarification
                    </h3>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {respondingRfi.submittalNo} • {respondingRfi.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRespondModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contractor Question Summary */}
              {respondingRfi.contractorInquiry && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-xs">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block mb-1">Contractor's Inquiry:</span>
                  <p className="text-slate-700 dark:text-slate-300 line-clamp-3 italic">
                    "{respondingRfi.contractorInquiry}"
                  </p>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Consultant Responder</label>
                    <input
                      type="text"
                      value={responseForm.responderName}
                      onChange={(e) => setResponseForm({ ...responseForm, responderName: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Response Date</label>
                    <input
                      type="date"
                      value={responseForm.respondedDate}
                      onChange={(e) => setResponseForm({ ...responseForm, respondedDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Formal Clarification Directive *</label>
                  <textarea
                    rows={4}
                    value={responseForm.consultantResponse}
                    onChange={(e) => setResponseForm({ ...responseForm, consultantResponse: e.target.value })}
                    placeholder="Enter official engineering instruction, drawing resolution, or technical specification directive..."
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Clarification Outcome</label>
                    <select
                      value={responseForm.newRfiStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        let finalStatus = 'Approved / Closed';
                        if (val === 'Approved') finalStatus = 'Approved';
                        else if (val === 'Approved with Comments') finalStatus = 'Approved with Comments';
                        else if (val.includes('Resubmit')) finalStatus = 'Rejected / Resubmit';
                        setResponseForm({ ...responseForm, newRfiStatus: val, newStatus: finalStatus });
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <optgroup label="Approval Statuses">
                        <option value="Approved">✓ Approved</option>
                        <option value="Approved with Comments">📝 Approved with Comments</option>
                      </optgroup>
                      <optgroup label="Standard Clarifications & Outcomes">
                        <option value="Clarification Issued">Clarification Issued</option>
                        <option value="Closed / Agreed">Closed / Agreed</option>
                        <option value="Approved as Proposed">Approved as Proposed</option>
                        <option value="Resubmit / Revision Required">Resubmit Required</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Confirmed Cost Impact</label>
                    <select
                      value={responseForm.costImpact}
                      onChange={(e) => setResponseForm({ ...responseForm, costImpact: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="None">None</option>
                      <option value="Potential Additional Cost">Potential Additional Cost</option>
                      <option value="Cost Saving">Cost Saving</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsRespondModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={!responseForm.consultantResponse.trim()}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Issue Directive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT RFI MODAL */}
      <AnimatePresence>
        {isEditRfiModalOpen && editingRfiDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Edit RFI: {editingRfiDraft.submittalNo}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Update RFI details, technical directives, and formal status
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditRfiModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Supervision Consultant Approver Authority Banner */}
              {isSupervisionConsultantApprover && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        Supervision Consultant Approver Credentials
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Choose formal certification status for this RFI:
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setEditingRfiDraft(prev => prev ? ({
                          ...prev,
                          status: 'Approved',
                          rfiStatus: 'Approved',
                          respondedDate: prev.respondedDate || today,
                          consultantResponder: prev.consultantResponder || currentUserObj?.fullName || currentUserObj?.username || consultant.residentEngineerName || 'Resident Engineer'
                        }) : null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                        (editingRfiDraft.rfiStatus === 'Approved' || editingRfiDraft.status === 'Approved')
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200'
                      }`}
                      title="Set RFI status to Approved"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setEditingRfiDraft(prev => prev ? ({
                          ...prev,
                          status: 'Approved with Comments',
                          rfiStatus: 'Approved with Comments',
                          respondedDate: prev.respondedDate || today,
                          consultantResponder: prev.consultantResponder || currentUserObj?.fullName || currentUserObj?.username || consultant.residentEngineerName || 'Resident Engineer'
                        }) : null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                        (editingRfiDraft.rfiStatus === 'Approved with Comments' || editingRfiDraft.status === 'Approved with Comments')
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200'
                      }`}
                      title="Set RFI status to Approved with Comments"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Approve w/ Comments
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Subject / Title</label>
                  <input
                    type="text"
                    value={editingRfiDraft.title}
                    onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Query / Inspection Category</label>
                    <select
                      value={editingRfiDraft.discipline || '1.1 Structural Concrete Pre-Pour Inspection'}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, discipline: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <optgroup label="Request for Inspection (RFI/IRB) Categories">
                        {RFI_INSPECTION_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Request for Information (Material / Design Query)">
                        {RFI_INFORMATION_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Standard Engineering Disciplines">
                        {RFI_DISCIPLINES.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Station (Km)</label>
                    <input
                      type="text"
                      value={editingRfiDraft.stationKm || ''}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, stationKm: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Drawing Ref</label>
                    <input
                      type="text"
                      value={editingRfiDraft.drawingRef || ''}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, drawingRef: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Specification Ref</label>
                    <input
                      type="text"
                      value={editingRfiDraft.specificationRef || ''}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, specificationRef: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contractor Inquiry</label>
                  <textarea
                    rows={3}
                    value={editingRfiDraft.contractorInquiry || ''}
                    onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, contractorInquiry: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Consultant Clarification Directive</label>
                  <textarea
                    rows={3}
                    value={editingRfiDraft.consultantResponse || ''}
                    onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, consultantResponse: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Submitted Date</label>
                    <input
                      type="date"
                      value={editingRfiDraft.submittedDate}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, submittedDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Responded Date</label>
                    <input
                      type="date"
                      value={editingRfiDraft.respondedDate || ''}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, respondedDate: e.target.value || undefined })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                      {isSupervisionConsultantApprover && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                          Approver
                        </span>
                      )}
                    </div>
                    <select
                      value={editingRfiDraft.rfiStatus || editingRfiDraft.status}
                      onChange={(e) => {
                        const val = e.target.value;
                        let finalStatus = 'Under Review';
                        if (val === 'Approved') {
                          finalStatus = 'Approved';
                        } else if (val === 'Approved with Comments' || val === 'Approved with Comment') {
                          finalStatus = 'Approved with Comments';
                        } else if (val.includes('Closed') || val.includes('Issued') || val === 'Approved as Proposed') {
                          finalStatus = 'Approved / Closed';
                        } else if (val.includes('Resubmit') || val.includes('Revision')) {
                          finalStatus = 'Rejected / Resubmit';
                        }

                        const today = new Date().toISOString().split('T')[0];
                        const newRespondedDate = (val === 'Approved' || val === 'Approved with Comments' || val === 'Clarification Issued' || val === 'Closed / Agreed') && !editingRfiDraft.respondedDate
                          ? today
                          : editingRfiDraft.respondedDate;

                        setEditingRfiDraft({
                          ...editingRfiDraft,
                          rfiStatus: val,
                          status: finalStatus,
                          respondedDate: newRespondedDate,
                          consultantResponder: editingRfiDraft.consultantResponder || (isSupervisionConsultantApprover ? (currentUserObj?.fullName || currentUserObj?.username || consultant.residentEngineerName) : editingRfiDraft.consultantResponder)
                        });
                      }}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <optgroup label="Approval Statuses">
                        <option value="Approved">
                          ✓ Approved
                        </option>
                        <option value="Approved with Comments">
                          📝 Approved with Comments
                        </option>
                      </optgroup>
                      <optgroup label="Consultant Clarification & Directives">
                        <option value="Clarification Issued">Clarification Issued</option>
                        <option value="Closed / Agreed">Closed / Agreed</option>
                        <option value="Resubmit / Revision Required">Resubmit Required</option>
                      </optgroup>
                      <optgroup label="Workflow & Review Statuses">
                        <option value="Awaiting Consultant Response">Awaiting Consultant Response</option>
                        <option value="Under Technical Review">Under Technical Review</option>
                        <option value="Void / Withdrawn">Void / Withdrawn</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cost Impact</label>
                    <select
                      value={editingRfiDraft.costImpact || 'None'}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, costImpact: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="None">None</option>
                      <option value="Potential Additional Cost">Potential Additional Cost</option>
                      <option value="Cost Saving">Cost Saving</option>
                      <option value="Pending Assessment">Pending Assessment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Schedule Impact</label>
                    <select
                      value={editingRfiDraft.scheduleImpact || 'None'}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, scheduleImpact: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="None">None</option>
                      <option value="Potential Delay (Critical Path)">Critical Path Delay</option>
                      <option value="Minor Float Used">Minor Float Used</option>
                      <option value="Pending Assessment">Pending Assessment</option>
                    </select>
                  </div>
                </div>

                {/* PDF Attachments in Edit Modal */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      Attached Documents ({editingRfiDraft.attachments?.length || 0})
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition">
                      <Upload className="w-3 h-3" />
                      <span>Add PDF</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={(e) => {
                          const files = processPdfFiles(e.target.files);
                          if (files.length === 0) return;
                          const newAtts = files.map(f => ({
                            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            name: f.name,
                            size: f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
                            url: URL.createObjectURL(f),
                            uploadedAt: new Date().toISOString().split('T')[0]
                          }));
                          setEditingRfiDraft(prev => prev ? ({
                            ...prev,
                            attachments: [...(prev.attachments || []), ...newAtts],
                            attachmentsCount: (prev.attachments?.length || 0) + newAtts.length
                          }) : null);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {editingRfiDraft.attachments && editingRfiDraft.attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {editingRfiDraft.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {att.url && (
                              <button
                                type="button"
                                onClick={() => handleViewPdf(att.url, att.name)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 rounded-lg"
                                title="Preview PDF"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRfiDraft(prev => {
                                  if (!prev) return null;
                                  const next = (prev.attachments || []).filter(a => a.id !== att.id);
                                  return { ...prev, attachments: next, attachmentsCount: next.length };
                                });
                              }}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsEditRfiModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditDraft}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK STATUS UPDATE MODAL */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Bulk Update RFI Status
                    </h3>
                    <p className="text-xs text-slate-500">
                      Apply certification status & directive notes to {selectedRfiIds.length} selected RFI{selectedRfiIds.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selected RFIs Badge Strip */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Selected RFIs ({selectedRfiObjects.length})
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {selectedRfiObjects.map(item => (
                    <span
                      key={item.id}
                      className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{item.submittalNo}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectRfi(item.id)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Remove from batch"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Status Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  New Status for Selected RFIs
                </label>
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <optgroup label="Approval Statuses">
                    <option value="Approved">✓ Approved</option>
                    <option value="Approved with Comments">📝 Approved with Comments</option>
                  </optgroup>
                  <optgroup label="Clarification Directives">
                    <option value="Clarification Issued">Clarification Issued</option>
                    <option value="Closed / Agreed">Closed / Agreed</option>
                    <option value="Resubmit / Revision Required">Resubmit Required</option>
                  </optgroup>
                  <optgroup label="Workflow Statuses">
                    <option value="Under Technical Review">Under Technical Review</option>
                    <option value="Awaiting Consultant Response">Awaiting Consultant Response</option>
                    <option value="Void / Withdrawn">Void / Withdrawn</option>
                  </optgroup>
                </select>
              </div>

              {/* Directive / Remarks Note */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Bulk Consultant Directive / Remarks Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={bulkDirectiveNote}
                  onChange={(e) => setBulkDirectiveNote(e.target.value)}
                  placeholder="Enter common clarification remarks, directive instructions, or approval conditions to record for all selected RFIs..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Cost & Schedule Impact Overrides */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cost Impact</label>
                  <select
                    value={bulkCostImpact}
                    onChange={(e) => setBulkCostImpact(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                  >
                    <option value="keep">Keep Existing Impact</option>
                    <option value="None">None (No Cost)</option>
                    <option value="Potential Additional Cost">Potential Additional Cost</option>
                    <option value="Cost Saving">Cost Saving</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Schedule Impact</label>
                  <select
                    value={bulkScheduleImpact}
                    onChange={(e) => setBulkScheduleImpact(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium"
                  >
                    <option value="keep">Keep Existing Impact</option>
                    <option value="None">None (No Delay)</option>
                    <option value="Critical Path Delay Risk">Critical Path Delay Risk</option>
                    <option value="Minor Float Consumption">Minor Float Consumption</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeBulkStatusChange(bulkTargetStatus, bulkDirectiveNote, bulkCostImpact, bulkScheduleImpact)}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to {selectedRfiIds.length} RFI{selectedRfiIds.length > 1 ? 's' : ''}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEDICATED PDF ATTACHMENTS MANAGEMENT MODAL */}
      <AnimatePresence>
        {activeAttachmentModalRfi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-lg space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      RFI PDF Attachments
                    </h3>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {activeAttachmentModalRfi.submittalNo} • {activeAttachmentModalRfi.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAttachmentModalRfi(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Attachments List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeAttachmentModalRfi.attachments && activeAttachmentModalRfi.attachments.length > 0 ? (
                  activeAttachmentModalRfi.attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{att.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            {att.size && <span>{att.size}</span>}
                            {att.uploadedAt && <span>• {att.uploadedAt}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {att.url && (
                          <button
                            onClick={() => handleViewPdf(att.url, att.name)}
                            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs flex items-center gap-1 transition"
                            title="Preview PDF document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        )}
                        {!isReadonly && (!isContractorUser || canContractorAddOrEdit) && (
                          <button
                            onClick={() => handleRemoveAttachment(activeAttachmentModalRfi, att.id)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded-xl transition"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No PDF documents attached to this RFI yet.</p>
                  </div>
                )}
              </div>

              {/* Upload New PDF in Modal */}
              {!isReadonly && (!isContractorUser || canContractorAddOrEdit) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center justify-center gap-2 w-full p-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>Upload & Attach New PDF File</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      onChange={(e) => {
                        handleDirectPdfUpload(activeAttachmentModalRfi, e);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setActiveAttachmentModalRfi(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PDF PREVIEW MODAL */}
      <AnimatePresence>
        {pdfPreviewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 w-full max-w-4xl h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {pdfPreviewTitle || 'PDF Document Viewer'}
                    </h3>
                    <p className="text-[10px] text-slate-400">PDF Document Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Tab</span>
                  </a>
                  <button
                    onClick={() => {
                      setPdfPreviewUrl(null);
                      setPdfPreviewTitle('');
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 mt-3 bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <iframe
                  src={pdfPreviewUrl}
                  title={pdfPreviewTitle || 'PDF Preview'}
                  className="w-full h-full rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

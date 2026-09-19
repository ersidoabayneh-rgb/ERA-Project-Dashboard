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
  Upload
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
  const [sortField, setSortField] = useState<'submittalNo' | 'submittedDate' | 'respondedDate' | 'actualDays' | 'priority' | 'status'>('submittedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');

  // Interactive Drawer / Modal state for detailed correspondence
  const [activeRfi, setActiveRfi] = useState<ConsultantSubmittalKpi | null>(null);
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);

  // New RFI Modal state
  const [isNewRfiModalOpen, setIsNewRfiModalOpen] = useState(false);
  const [newRfiForm, setNewRfiForm] = useState<Partial<ConsultantSubmittalKpi>>({
    submittalNo: `RFI-0${rfiItems.length + 14 < 10 ? '0' + (rfiItems.length + 14) : rfiItems.length + 14}`,
    type: 'RFI',
    title: '',
    discipline: 'Structures & Bridges',
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
    assignedEngineer: consultant.residentEngineerName || 'Resident Engineer'
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
      const isClosed = rfi.status === 'Approved / Closed' || rfi.status === 'Closed' || rfi.rfiStatus === 'Closed / Agreed';
      if (isClosed) {
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
      if (selectedStatus === 'CLOSED') {
        matchesStatus = rfi.status === 'Approved / Closed' || rfi.status === 'Closed' || rfi.rfiStatus === 'Closed / Agreed';
      } else if (selectedStatus === 'AWAITING') {
        matchesStatus = rfi.rfiStatus === 'Awaiting Consultant Response' || (!rfi.respondedDate && rfi.status !== 'Approved / Closed');
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
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRfis, sortField, sortDirection]);

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
      if (replyStatusUpdate === 'Clarification Issued') {
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
      attachmentsCount: 0,
      attachments: [],
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
    const isApproved = rfi.status === 'Approved / Closed' || rfi.status === 'Closed' || rfi.rfiStatus === 'Closed / Agreed';
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

  // Export RFI CSV
  const handleExportRfiCsv = () => {
    const headers = [
      'RFI No',
      'Discipline',
      'Subject / Title',
      'Station / Chainage',
      'Drawing Ref',
      'Specification Ref',
      'Contractor Inquiry',
      'Submitted Date',
      'Consultant Clarification Directive',
      'Responded Date',
      'Target Days',
      'Actual Days',
      'Status',
      'Priority',
      'Cost Impact',
      'Schedule Impact',
      'Assigned Engineer',
      'Correspondence Messages Count'
    ];

    const rows = sortedRfis.map(r => [
      `"${r.submittalNo}"`,
      `"${r.discipline || 'General'}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.stationKm || '').replace(/"/g, '""')}"`,
      `"${(r.drawingRef || '').replace(/"/g, '""')}"`,
      `"${(r.specificationRef || '').replace(/"/g, '""')}"`,
      `"${(r.contractorInquiry || '').replace(/"/g, '""')}"`,
      `"${r.submittedDate}"`,
      `"${(r.consultantResponse || '').replace(/"/g, '""')}"`,
      `"${r.respondedDate || ''}"`,
      r.targetDays,
      r.actualDays !== undefined ? r.actualDays : '',
      `"${r.rfiStatus || r.status}"`,
      `"${r.priority}"`,
      `"${r.costImpact || 'None'}"`,
      `"${r.scheduleImpact || 'None'}"`,
      `"${(r.assignedEngineer || r.consultantResponder || '').replace(/"/g, '""')}"`,
      r.correspondenceThread?.length || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RFI_Design_Clarification_Log_${project.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

            <p className="text-xs text-indigo-200/80 max-w-3xl leading-relaxed">
              Formal technical correspondence tracking between Works Contractor <strong className="text-white font-bold">{project.contractor || 'Lead Contractor'}</strong> and Supervision Consultant <strong className="text-white font-bold">{consultant.firmName}</strong> for prompt resolution of drawing ambiguities, site discrepancies, structural details, and material specifications.
            </p>
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
              onClick={handleExportRfiCsv}
              className="px-4 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export RFI Register (CSV)
            </button>
          </div>
        </div>

        {/* Stakeholder Identity Strip */}
        <div className="mt-5 pt-4 border-t border-indigo-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-black/20 p-2.5 rounded-xl border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center font-black">
              C
            </div>
            <div>
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Originating Contractor</span>
              <span className="font-bold text-white truncate block">{project.contractor || 'Works Contractor JV'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-black/20 p-2.5 rounded-xl border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center font-black">
              E
            </div>
            <div>
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Supervising Consultant & Engineer</span>
              <span className="font-bold text-white truncate block">{consultant.firmName} ({consultant.residentEngineerName || 'Resident Engineer'})</span>
            </div>
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
            <option value="AWAITING">Awaiting Response</option>
            <option value="Under Technical Review">Under Review</option>
            <option value="Clarification Issued">Clarification Issued</option>
            <option value="CLOSED">Closed & Agreed</option>
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

      {/* RFI Table or Card View */}
      {viewLayout === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold select-none">
                <tr>
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
                  <th className="p-3.5 text-center">Thread</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedRfis.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      No Request for Information (RFI) records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sortedRfis.map((rfi, idx) => {
                    const target = rfi.targetDays || targetOverrides['RFI'] || 7;
                    const delayInfo = checkSubmittalDelay(rfi, target);
                    const msgCount = rfi.correspondenceThread?.length || 0;
                    const hasCost = rfi.costImpact && rfi.costImpact !== 'None';
                    const hasSched = rfi.scheduleImpact && rfi.scheduleImpact !== 'None';

                    return (
                      <tr
                        key={`rfi-row-${rfi.id}-${idx}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
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
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-block ${
                            (rfi.status === 'Approved / Closed' || rfi.rfiStatus === 'Closed / Agreed')
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : rfi.rfiStatus === 'Clarification Issued'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : delayInfo.isDelayed
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {rfi.rfiStatus || rfi.status}
                          </span>
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

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                      rfi.status === 'Approved / Closed' || rfi.rfiStatus === 'Closed / Agreed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {rfi.rfiStatus || rfi.status}
                    </span>
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
                      activeRfi.status === 'Approved / Closed' || activeRfi.rfiStatus === 'Closed / Agreed'
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
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Update Status (Optional)</label>
                        <select
                          value={replyStatusUpdate}
                          onChange={(e) => setReplyStatusUpdate(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="no_change">Keep Current Status</option>
                          <option value="Clarification Issued">Mark: Clarification Issued</option>
                          <option value="Closed / Agreed">Mark: Closed / Agreed</option>
                          <option value="Under Technical Review">Mark: Under Technical Review</option>
                          <option value="Resubmit / Revision Required">Mark: Resubmit Required</option>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Discipline *</label>
                  <select
                    value={newRfiForm.discipline || 'Structures & Bridges'}
                    onChange={(e) => setNewRfiForm({ ...newRfiForm, discipline: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    {RFI_DISCIPLINES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
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
                      onChange={(e) => setResponseForm({ ...responseForm, newRfiStatus: e.target.value, newStatus: 'Approved / Closed' })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="Clarification Issued">Clarification Issued</option>
                      <option value="Closed / Agreed">Closed / Agreed</option>
                      <option value="Approved as Proposed">Approved as Proposed</option>
                      <option value="Resubmit / Revision Required">Resubmit Required</option>
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit RFI: {editingRfiDraft.submittalNo}
                </h3>
                <button
                  onClick={() => setIsEditRfiModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

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
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Discipline</label>
                    <select
                      value={editingRfiDraft.discipline || 'Structures & Bridges'}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, discipline: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      {RFI_DISCIPLINES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                    <select
                      value={editingRfiDraft.rfiStatus || editingRfiDraft.status}
                      onChange={(e) => setEditingRfiDraft({ ...editingRfiDraft, rfiStatus: e.target.value, status: e.target.value.includes('Closed') || e.target.value.includes('Issued') ? 'Approved / Closed' : 'Under Review' })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="Awaiting Consultant Response">Awaiting Consultant Response</option>
                      <option value="Under Technical Review">Under Technical Review</option>
                      <option value="Clarification Issued">Clarification Issued</option>
                      <option value="Closed / Agreed">Closed / Agreed</option>
                      <option value="Resubmit / Revision Required">Resubmit Required</option>
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
    </div>
  );
}

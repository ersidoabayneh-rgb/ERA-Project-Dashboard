import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, ArrowRight, Clock, AlertTriangle, CheckCircle, Trash2,
  UserCheck, History, Printer, Search, Filter, RefreshCw, Layers, ShieldAlert, Edit2, ChevronRight, Download, FileSpreadsheet, FileCheck,
  TrendingUp, AlertOctagon, SlidersHorizontal, X, Calendar, Zap, CheckCircle2, BarChart3, BookOpen, Sparkles, User as UserIcon, MessageSquare, PenTool,
  ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, ListOrdered, Building2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { Project, IssueLogItem, IssueTransferRecord, IssueHistoryRecord, ResolutionStepRecord, DeptTimeRecord, IssueColumnChangeDetail, User, formatAccounting } from '../types';

interface IssueLogViewProps {
  project: Project;
  onProjectUpdate?: (updates: Partial<Project>, logMessage?: string) => void;
  isAdmin?: boolean;
  currentUserObj?: User | null;
}

const defaultSampleIssues: IssueLogItem[] = [
  {
    id: 'iss-1',
    issueCode: 'ERA-ISS-2026-001',
    title: 'Uncleared Right of Way (ROW) Obstruction at Ch 24+500 - Ch 31+200',
    category: 'Right of Way (ROW)',
    submittedDate: '2025-11-14',
    createdDate: '2025-11-14 09:30',
    lastUpdated: '2026-02-18 11:45',
    submittedBy: 'Contractor (China Communications Construction Co.)',
    submittedTo: 'Consultant Resident Engineer (Net Consulting Engineers)',
    clauseReference: 'FIDIC Sub-Clause 2.1 (Right of Access) & 8.4 (Extension of Time)',
    initialDescription: 'Contractor requested urgent possession of site between Ch 24+500 and Ch 31+200. High-voltage electric poles and 42 residential structures remain uncompensated and uncleared, completely halting subgrade excavation work.',
    financialImpactEtb: 14250000,
    timeImpactDays: 65,
    priority: 'Critical',
    currentStatus: 'Transferred / Escalated',
    currentStage: 'Stage 3: Directorate & Regional Authority Handover',
    latestProgressSummary: 'Consultant RE completed delay impact analysis confirming 48 critical path days lost. Issue was transferred from Resident Engineer team to ERA Central ROW Directorate and Local Woreda Administration for compensation disbursement.',
    currentBottleneck: 'Awaiting local Woreda compensation committee bank clearance and Ethio Telecom pole relocation schedule.',
    lessonsLearned: 'Right-of-Way valuation and utility relocation clearance with local Woreda administration must be finalized prior to issuing Site Access under FIDIC Clause 2.1. Establishing a joint ERA-Woreda taskforce reduced valuation dispute cycle time by 60%.',
    lessonsLearnedUpdatedBy: 'Eng. Solomon Tadesse (Senior RE)',
    lessonsLearnedUpdatedAt: '2026-02-20 14:30',
    history: [
      {
        id: 'hist-1',
        timestamp: '2025-11-14 09:30',
        user: 'Contractor (CCCC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission & Site Verification',
        changeType: 'Creation',
        notes: 'Initial ROW obstruction claim logged for Ch 24+500 - Ch 31+200.'
      },
      {
        id: 'hist-2',
        timestamp: '2025-12-02 14:15',
        user: 'Eng. Solomon Tadesse (Senior RE)',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'Transferred / Escalated',
        stage: 'Stage 3: Directorate & Regional Authority Handover',
        changeType: 'Transfer Handover',
        notes: 'Transferred to ERA Regional Directorate due to compensation amount exceeding site-level threshold.'
      },
      {
        id: 'hist-3',
        timestamp: '2026-02-18 11:45',
        user: 'Ato Kassahun Worku (Directorate Director)',
        previousStatus: 'Transferred / Escalated',
        newStatus: 'Transferred / Escalated',
        stage: 'Stage 3: ERA Contractual Claims & Steering Committee',
        changeType: 'Transfer Handover',
        notes: 'Notice of intention to claim evaluated. Interim EOT recommendation submitted to Steering Committee.'
      }
    ],
    transfers: [
      {
        id: 'tr-1',
        transferDate: '2025-12-02',
        transferredFrom: 'Consultant Resident Engineer (Site Team)',
        transferredTo: 'ERA Regional Directorate & ROW Valuation Team',
        transferReason: 'Local compensation negotiations exceeded site-level delegated authority limit (>5 Million ETB).',
        actionTakenByPreviousTeam: 'Issued formal site verification report confirming 6.7 Km obstruction; verified contractor equipment idle hours and established baseline critical path impact.',
        recommendedCourseOfAction: 'Release emergency compensation funds to Woreda account and issue formal request to Ethiopian Electric Utility (EEU) for immediate high-voltage line relocation.',
        transferredBy: 'Eng. Solomon Tadesse (Senior RE)'
      },
      {
        id: 'tr-2',
        transferDate: '2026-02-18',
        transferredFrom: 'ERA Regional Directorate',
        transferredTo: 'ERA Contractual Claims & Steering Committee',
        transferReason: 'Contractor submitted formal Notice of Intention to Claim for EOT (65 days) and Standby Cost (14.25M ETB).',
        actionTakenByPreviousTeam: 'Facilitated partial compensation payment for 28 PAPs (3.4 Km cleared). Handed over remaining dispute & claim evaluation to Steering Committee.',
        recommendedCourseOfAction: 'Review interim EOT grant of 35 days under FIDIC Clause 8.4 and approve EEU utility relocation budget authorization.',
        transferredBy: 'Ato Kassahun Worku (Directorate Director)'
      }
    ]
  },
  {
    id: 'iss-2',
    issueCode: 'ERA-ISS-2026-002',
    title: 'Foreign Exchange Allocation Delay for Bitumen & Spare Parts Import',
    category: 'Financial/Payment',
    submittedDate: '2026-01-10',
    createdDate: '2026-01-10 10:15',
    lastUpdated: '2026-01-28 16:20',
    submittedBy: 'Contractor (Sur Construction PLC)',
    submittedTo: 'Employer (Ethiopian Roads Administration - PMO)',
    clauseReference: 'FIDIC Sub-Clause 14.8 (Payment & FX Allocation)',
    initialDescription: 'Contractor submitted request for USD foreign currency allocation certificate for $1.8M USD to open Letter of Credit (LC) for 3,200 MT 60/70 Penetration Grade Bitumen.',
    financialImpactEtb: 0,
    timeImpactDays: 45,
    priority: 'High',
    currentStatus: 'In Progress / Evaluation',
    currentStage: 'Stage 2: Ministry of Finance & National Bank Review',
    latestProgressSummary: 'ERA Finance Directorate reviewed certification against IPC foreign currency ratio. Recommendation sent to National Bank of Ethiopia (NBE) for prioritized Forex release.',
    currentBottleneck: 'National Bank FX queue priority listing.',
    lessonsLearned: 'Centralizing foreign exchange allocation requests with National Bank under specialized infrastructure import quotas prevents asphalt supply chain stoppages during peak dry construction season.',
    lessonsLearnedUpdatedBy: 'W/ro Bethlehem Girma (Senior Finance Officer)',
    lessonsLearnedUpdatedAt: '2026-01-30 10:20',
    history: [
      {
        id: 'hist-201',
        timestamp: '2026-01-10 10:15',
        user: 'Contractor (Sur Construction PLC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission',
        changeType: 'Creation',
        notes: 'Forex allocation application submitted for 3,200 MT Bitumen.'
      },
      {
        id: 'hist-202',
        timestamp: '2026-01-28 16:20',
        user: 'W/ro Bethlehem Girma (Senior Finance Officer)',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'In Progress / Evaluation',
        stage: 'Stage 2: Ministry of Finance & National Bank Review',
        changeType: 'Status Change',
        notes: 'Audited past bitumen utilization; verified LC documentation and forwarded to National Bank.'
      }
    ],
    transfers: [
      {
        id: 'tr-1',
        transferDate: '2026-01-28',
        transferredFrom: 'ERA Finance & Procurement Directorate',
        transferredTo: 'National Bank of Ethiopia & Ministry of Finance',
        transferReason: 'FX allocation requires NBE central bank approval for priority infrastructure projects.',
        actionTakenByPreviousTeam: 'Verified contractor LC documentation, audited past bitumen utilization, and certified project priority status.',
        recommendedCourseOfAction: 'Authorize special FX allocation batch under ERA priority infrastructure window.',
        transferredBy: 'W/ro Bethlehem Girma (Senior Finance Officer)'
      }
    ]
  },
  {
    id: 'iss-3',
    issueCode: 'ERA-ISS-2025-003',
    title: 'Design Variation & Geotechnical Subsurface Soft Soil at Bridge Abutment Ch 48+200',
    category: 'Technical/Design',
    submittedDate: '2025-10-18',
    createdDate: '2025-10-18 11:00',
    lastUpdated: '2025-10-18 11:00',
    submittedBy: 'Consultant Resident Engineer',
    submittedTo: 'ERA Bridge & Structure Design Directorate',
    clauseReference: 'FIDIC Sub-Clause 4.12 (Unforeseeable Physical Conditions)',
    initialDescription: 'Trial pit soil borings revealed highly expansive clay and soft organic soil down to 14 meters depth, contradicting original tender borehole logs. Deep foundation piling design required.',
    financialImpactEtb: 22800000,
    timeImpactDays: 90,
    priority: 'Critical',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Submission & Geotechnical Soil Investigation Review',
    latestProgressSummary: 'Design review panel requested supplemental bored pile load tests and updated structural calculations from lead consultant.',
    currentBottleneck: 'Pending approval of revised bored pile foundation design drawing package from ERA Design Review Directorate.',
    history: [
      {
        id: 'hist-301',
        timestamp: '2025-10-18 11:00',
        user: 'Consultant Resident Engineer',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission',
        changeType: 'Creation',
        notes: 'Unforeseeable soft soil condition report submitted.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-4',
    issueCode: 'ERA-ISS-2025-004',
    title: 'Subbase Aggregate Quarry Abrasion Test Clearance Delay',
    category: 'Material Testing',
    submittedDate: '2025-12-05',
    createdDate: '2025-12-05 08:45',
    lastUpdated: '2025-12-28 11:00',
    submittedBy: 'Contractor (Sunshine Construction PLC)',
    submittedTo: 'Consultant Materials Engineer',
    clauseReference: 'FIDIC Sub-Clause 7.3 (Inspection & Testing)',
    initialDescription: 'Quarry site #3 Los Angeles Abrasion and Aggregate Crushing Value (ACV) samples sent to Central ERA Laboratory. Approval delayed beyond 21 days.',
    financialImpactEtb: 1800000,
    timeImpactDays: 14,
    priority: 'Medium',
    currentStatus: 'Resolved / Approved',
    resolvedDate: '2025-12-26',
    turnaroundDays: 21,
    currentStage: 'Stage 4: Approval Issued & Quarry Operation Cleared',
    latestProgressSummary: 'Central Lab released certified test certificate confirming LA Abrasion value of 26.4% (under 30% limit). Resident Engineer issued formal quarry clearance.',
    currentBottleneck: 'Resolved - No active bottleneck.',
    lessonsLearned: 'Establishing accredited mobile site testing facilities or expedited central lab service level agreements prevents quarry testing bottlenecks that impact subbase production schedules.',
    lessonsLearnedUpdatedBy: 'Ato Abebe Tessema (Materials Engineer)',
    lessonsLearnedUpdatedAt: '2025-12-28 11:00',
    resolutionStatus: 'Resolved / Approved',
    stepsTakenUntilResolved: 'Step 1: [2025-12-05] Quarry Site #3 aggregate samples collected and dispatched under FIDIC Clause 7.3 by Contractor (Sunshine Construction PLC). Status: Submitted / Under Review.\nStep 2: [2025-12-12] Joint laboratory log-in and test setup at ERA Central Materials Testing Directorate. Verified sample integrity and standard sieve sizing.\nStep 3: [2025-12-20] Los Angeles Abrasion and Aggregate Crushing Value (ACV) testing completed; test result verified at 26.4% abrasion loss (within standard <30% threshold).\nStep 4: [2025-12-26] Official Test Certificate issued by Central ERA Laboratory; Resident Engineer issued formal site clearance approving quarry operations. Status: Resolved / Approved.',
    resolutionSteps: [
      {
        id: 'step-4-1',
        stepNumber: 1,
        date: '2025-12-05',
        actionTaken: 'Aggregate sample collection and laboratory dispatch under Sub-Clause 7.3',
        performedBy: 'Contractor (Sunshine Construction PLC)',
        statusAtStep: 'Submitted / Under Review',
        stage: 'Stage 1: Sample Collection',
        notes: 'Quarry site #3 Los Angeles Abrasion and ACV samples submitted for compliance certification.'
      },
      {
        id: 'step-4-2',
        stepNumber: 2,
        date: '2025-12-12',
        actionTaken: 'Sample receipt verification and laboratory test bench allocation',
        performedBy: 'Eng. Worku Mengesha (Lab Tech Lead)',
        statusAtStep: 'In Progress / Evaluation',
        stage: 'Stage 2: Laboratory Testing Bench',
        notes: 'Sieve analysis verified; oven drying and mechanical abrasion drum sequence scheduled.'
      },
      {
        id: 'step-4-3',
        stepNumber: 3,
        date: '2025-12-20',
        actionTaken: 'Abrasion test computation & aggregate crushing value assessment',
        performedBy: 'Central ERA Laboratory',
        statusAtStep: 'In Progress / Evaluation',
        stage: 'Stage 3: Result Certification',
        notes: 'LA Abrasion recorded at 26.4% (specification requires <30%). ACV recorded at 18.2%.'
      },
      {
        id: 'step-4-4',
        stepNumber: 4,
        date: '2025-12-26',
        actionTaken: 'Certified test clearance issued and Quarry Site #3 approved for subbase processing',
        performedBy: 'Ato Abebe Tessema (Materials Engineer)',
        statusAtStep: 'Resolved / Approved',
        stage: 'Stage 4: Approval Issued & Quarry Operation Cleared',
        notes: 'Resident Engineer issued official letter permitting subbase production. Turnaround: 21 calendar days.'
      }
    ],
    history: [
      {
        id: 'hist-401',
        timestamp: '2025-12-05 08:45',
        user: 'Contractor (Sunshine Construction PLC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Sample Collection',
        changeType: 'Creation',
        notes: 'Aggregate samples dispatched to ERA Central Laboratory.'
      },
      {
        id: 'hist-402',
        timestamp: '2025-12-26 15:10',
        user: 'Central ERA Laboratory',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'Resolved / Approved',
        stage: 'Stage 4: Approval Issued & Quarry Operation Cleared',
        changeType: 'Status Change',
        notes: 'LA Abrasion certified at 26.4%. Quarry #3 officially cleared for subbase processing.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-5',
    issueCode: 'ERA-ISS-2026-005',
    title: 'IPC #14 Advance Payment Disbursement Delay beyond 56 Calendar Days',
    category: 'Financial/Payment',
    submittedDate: '2026-02-01',
    createdDate: '2026-02-01 14:00',
    lastUpdated: '2026-02-01 14:00',
    submittedBy: 'Contractor',
    submittedTo: 'ERA Finance Directorate',
    clauseReference: 'FIDIC Sub-Clause 14.7 (Payment Obligations)',
    initialDescription: 'Interim Payment Certificate #14 amounting to 38.6M ETB certified by RE on Dec 12, 2025 remains unpaid past the 56-day statutory payment window, incurring financing charges under Sub-Clause 14.8.',
    financialImpactEtb: 38600000,
    timeImpactDays: 28,
    priority: 'High',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Payment Audit & Treasury Release',
    latestProgressSummary: 'Audit verified certificate calculations. Treasury transfer queue currently processing budget disbursement batch.',
    currentBottleneck: 'Awaiting Ministry of Finance quarterly budget release transfer to ERA project account.',
    history: [
      {
        id: 'hist-501',
        timestamp: '2026-02-01 14:00',
        user: 'Contractor',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Payment Audit',
        changeType: 'Creation',
        notes: 'Payment delay notification submitted under FIDIC 14.7.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-6',
    issueCode: 'ERA-ISS-2026-006',
    title: 'Environmental Dust Suppression Non-Compliance Notice at Town Section Ch 12+000',
    category: 'Environmental/Safety',
    submittedDate: '2026-03-12',
    createdDate: '2026-03-12 16:30',
    lastUpdated: '2026-03-12 16:30',
    submittedBy: 'Consultant Environmental Specialist',
    submittedTo: 'Contractor Project Manager',
    clauseReference: 'FIDIC Sub-Clause 4.18 (Protection of Environment)',
    initialDescription: 'Excessive fugitive dust emissions in Alem Gena town section during subbase compaction. Local community submitted formal petition to Woreda Environmental Protection Office.',
    financialImpactEtb: 450000,
    timeImpactDays: 0,
    priority: 'Low',
    currentStatus: 'In Progress / Evaluation',
    currentStage: 'Stage 2: Corrective Action Implementation',
    latestProgressSummary: 'Contractor deployed two additional 15,000L water bowsers and scheduled twice-daily dust suppression sprays along town corridor.',
    currentBottleneck: 'Monitoring dust levels to verify full compliance ahead of Woreda inspection.',
    history: [
      {
        id: 'hist-601',
        timestamp: '2026-03-12 16:30',
        user: 'Consultant Environmental Specialist',
        previousStatus: 'None',
        newStatus: 'In Progress / Evaluation',
        stage: 'Stage 2: Corrective Action Implementation',
        changeType: 'Creation',
        notes: 'Dust suppression non-compliance notice logged.'
      }
    ],
    transfers: []
  }
];

export function getDepartmentTimeRecords(item: IssueLogItem): DeptTimeRecord[] {
  if (!item) return [];

  const records: DeptTimeRecord[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const isClosed = (item.currentStatus || '').toLowerCase().includes('resolved') || 
                   (item.currentStatus || '').toLowerCase().includes('approved') || 
                   (item.currentStatus || '').toLowerCase().includes('rejected') || 
                   (item.currentStatus || '').toLowerCase().includes('closed');

  const resolvedDate = item.resolvedDate || (isClosed ? todayStr : undefined);

  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getDiffDays = (startStr: string, endStr: string) => {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const diff = Math.max(0, end.getTime() - start.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const initialDept = (item.transfers && item.transfers.length > 0 && item.transfers[0].transferredFrom)
    ? item.transfers[0].transferredFrom
    : (item.submittedTo || 'Initial Reviewing Authority');
  const initialStartDate = item.submittedDate || todayStr;

  if (!item.transfers || item.transfers.length === 0) {
    const endDate = isClosed && resolvedDate ? resolvedDate : todayStr;
    const days = getDiffDays(initialStartDate, endDate);
    records.push({
      department: initialDept,
      startDate: initialStartDate,
      endDate: endDate,
      daysTaken: days,
      status: isClosed ? 'Resolved / Closed' : 'Active',
      actionBeforeTransferOrChange: isClosed 
        ? `Retained and finalized in this department until resolution (${days} days)` 
        : `Currently under active review in this department (${days} days)`
    });
  } else {
    // 1st department: from submittedDate to 1st transfer date
    const dept1EndDate = item.transfers[0].transferDate || initialStartDate;
    const dept1Days = getDiffDays(initialStartDate, dept1EndDate);
    records.push({
      department: initialDept,
      startDate: initialStartDate,
      endDate: dept1EndDate,
      daysTaken: dept1Days,
      status: 'Transferred',
      actionBeforeTransferOrChange: `Processed for ${dept1Days} days before transfer to [${item.transfers[0].transferredTo}]`
    });

    // Subsequent departments
    for (let i = 0; i < item.transfers.length; i++) {
      const tr = item.transfers[i];
      const deptName = tr.transferredTo || `Department #${i + 2}`;
      const startDate = tr.transferDate || initialStartDate;

      let endDate = todayStr;
      let status: 'Transferred' | 'Active' | 'Resolved / Closed' = 'Transferred';
      let actionDesc = '';

      if (i < item.transfers.length - 1) {
        endDate = item.transfers[i + 1].transferDate || startDate;
        status = 'Transferred';
        const days = getDiffDays(startDate, endDate);
        actionDesc = `Held for ${days} days before transfer to [${item.transfers[i + 1].transferredTo}]`;
      } else {
        endDate = isClosed && resolvedDate ? resolvedDate : todayStr;
        status = isClosed ? 'Resolved / Closed' : 'Active';
        const days = getDiffDays(startDate, endDate);
        actionDesc = isClosed 
          ? `Held for ${days} days before final resolution and closure` 
          : `Currently active in this department (${days} days)`;
      }

      const days = getDiffDays(startDate, endDate);
      records.push({
        department: deptName,
        startDate: startDate,
        endDate: endDate,
        daysTaken: days,
        status: status,
        actionBeforeTransferOrChange: actionDesc
      });
    }
  }

  return records;
}

export default function IssueLogView({ project, onProjectUpdate, isAdmin, currentUserObj }: IssueLogViewProps) {
  const issuesList = (project.issues !== undefined)
    ? project.issues
    : (project.id === 'proj_default' ? defaultSampleIssues : []);

  const currentUsername = currentUserObj?.username || 'ErsidoAbayneh';
  const effectiveIsAdmin = Boolean(
    isAdmin ||
    currentUserObj?.role === 'admin' ||
    currentUserObj?.username === 'ErsidoAbayneh' ||
    currentUserObj?.username === 'proj_1781786415663'
  );

  const [selectedIssueId, setSelectedIssueId] = useState<string>(issuesList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [submittedByFilter, setSubmittedByFilter] = useState('All');
  const [impactFilter, setImpactFilter] = useState('All');
  const [ageFilter, setAgeFilter] = useState('All');

  // Sorting Controls State
  const [sortColumn, setSortColumn] = useState<
    'submittedDate' | 'createdDate' | 'lastUpdated' | 'requiredDaysContract' | 'title' | 'currentStatus' | 'daysPending' | 'priority' | 'category' | 'financialImpactEtb' | 'timeImpactDays' | 'submittedBy'
  >('submittedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pendingDaysThreshold, setPendingDaysThreshold] = useState<number>(14);
  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  
  // Modals state
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [urgentNotificationFlag, setUrgentNotificationFlag] = useState<{ issueCode: string; title: string; priority: string } | null>(null);
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [retroTrackingIssueId, setRetroTrackingIssueId] = useState<string | null>(null);
  const [trackingModalTab, setTrackingModalTab] = useState<'journey' | 'history' | 'lessons'>('journey');
  const [sortHistoryAsc, setSortHistoryAsc] = useState<boolean>(true);

  // Lessons Learned & History Note Modals State
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [lessonsInput, setLessonsInput] = useState('');
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [stepsTakenInput, setStepsTakenInput] = useState('');
  const [resolutionStepsList, setResolutionStepsList] = useState<ResolutionStepRecord[]>([]);
  const [resolutionStatusInput, setResolutionStatusInput] = useState<string>('Resolved / Approved');
  const [lessonsModalTab, setLessonsModalTab] = useState<'steps' | 'changes' | 'departments' | 'lesson'>('steps');
  const [newStepDate, setNewStepDate] = useState('');
  const [newStepAction, setNewStepAction] = useState('');
  const [newStepPerformedBy, setNewStepPerformedBy] = useState('');
  const [newStepStatus, setNewStepStatus] = useState('In Progress / Evaluation');
  const [newStepCategory, setNewStepCategory] = useState('');
  const [newStepDepartment, setNewStepDepartment] = useState('');
  const [newStepDeptTime, setNewStepDeptTime] = useState<number | string>('');
  const [newStepOverallTime, setNewStepOverallTime] = useState<number | string>('');
  const [newStepChangedColumns, setNewStepChangedColumns] = useState('Current Status, Issue Category');
  const [newStepNotes, setNewStepNotes] = useState('');
  const [showAddStepForm, setShowAddStepForm] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyNoteInput, setHistoryNoteInput] = useState('');
  const [historyNewStatusInput, setHistoryNewStatusInput] = useState<string>('');

  const selectedIssue = issuesList.find(i => i.id === selectedIssueId) || issuesList[0];

  // Pending days and threshold calculation helpers
  const calculateDaysPending = (submittedDate: string) => {
    if (!submittedDate) return 0;
    const sub = new Date(submittedDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - sub.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTurnaroundDays = (submittedDate?: string, resolvedDate?: string) => {
    if (!submittedDate || !resolvedDate) return 0;
    const sub = new Date(submittedDate);
    const res = new Date(resolvedDate);
    if (isNaN(sub.getTime()) || isNaN(res.getTime())) return 0;
    const diffTime = res.getTime() - sub.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  const isPendingStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return !s.includes('resolved') && !s.includes('approved') && !s.includes('rejected') && !s.includes('closed');
  };

  const getIssueTurnaroundInfo = (item: IssueLogItem) => {
    const isResolved = !isPendingStatus(item.currentStatus);
    let resolvedDate = item.resolvedDate;
    
    if (!resolvedDate && item.history && item.history.length > 0) {
      const resHist = item.history.find(h => 
        h.newStatus === 'Resolved / Approved' || 
        h.newStatus === 'Rejected / Closed' ||
        (h.newStatus && (h.newStatus.toLowerCase().includes('resolved') || h.newStatus.toLowerCase().includes('approved') || h.newStatus.toLowerCase().includes('rejected') || h.newStatus.toLowerCase().includes('closed')))
      );
      if (resHist && resHist.timestamp) {
        resolvedDate = resHist.timestamp.split(' ')[0];
      }
    }

    let turnaroundDays = item.turnaroundDays;
    if ((turnaroundDays === undefined || turnaroundDays === null) && item.submittedDate && resolvedDate) {
      turnaroundDays = calculateTurnaroundDays(item.submittedDate, resolvedDate);
    }

    const daysPending = calculateDaysPending(item.submittedDate);
    const totalDaysTaken = isResolved ? (turnaroundDays !== undefined ? turnaroundDays : calculateTurnaroundDays(item.submittedDate, resolvedDate)) : daysPending;

    return {
      isResolved,
      resolvedDate,
      turnaroundDays: totalDaysTaken,
      daysPending,
      displayText: isResolved
        ? `${totalDaysTaken} Day${totalDaysTaken === 1 ? '' : 's'} (from ${item.submittedDate || 'Submission'} to ${resolvedDate || 'Resolution'})`
        : `${daysPending} Day${daysPending === 1 ? '' : 's'} (Open & Pending)`
    };
  };

  // Comprehensive Compiler: Extract and format all steps taken until resolved, all change dates, authors, and statuses
  const compileResolutionJourneyData = (issue: IssueLogItem) => {
    const turnaroundInfo = getIssueTurnaroundInfo(issue);
    const deptBreakdown = getDepartmentTimeRecords(issue);
    const subDate = issue.submittedDate || (issue.createdDate ? issue.createdDate.split(' ')[0] : 'N/A');

    const parseDateHelper = (dStr: string) => {
      if (!dStr || dStr === 'N/A') return new Date();
      const clean = dStr.split(' ')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const getDiffDays = (startStr: string, endStr: string) => {
      const start = parseDateHelper(startStr);
      const end = parseDateHelper(endStr);
      const diff = Math.max(0, end.getTime() - start.getTime());
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    // Helper to determine active department and department start date at a specific date
    const getActiveDeptInfoAtDate = (targetDateStr: string) => {
      const trs = issue.transfers || [];
      if (!trs.length) {
        return {
          department: issue.submittedTo || 'Initial Reviewing Authority',
          startDate: subDate
        };
      }
      if (targetDateStr <= (trs[0].transferDate || '')) {
        return {
          department: trs[0].transferredFrom || issue.submittedTo || 'Initial Reviewing Authority',
          startDate: subDate
        };
      }
      for (let i = trs.length - 1; i >= 0; i--) {
        if (targetDateStr >= (trs[i].transferDate || '')) {
          return {
            department: trs[i].transferredTo || 'Reviewing Team',
            startDate: trs[i].transferDate || subDate
          };
        }
      }
      return {
        department: trs[0].transferredFrom || issue.submittedTo || 'Initial Reviewing Authority',
        startDate: subDate
      };
    };

    const buildColumnSnapshot = (
      statusVal: string,
      categoryVal: string,
      deptVal: string,
      deptDaysVal: number,
      overallDaysVal: number,
      stageVal?: string
    ): IssueColumnChangeDetail => ({
      dateSubmitted: subDate,
      issueCategory: categoryVal,
      currentStatus: statusVal,
      departmentAndHandover: deptVal,
      deptTimeTakenDays: deptDaysVal,
      overallTimeTakenDays: overallDaysVal,
      financialExposureEtb: issue.financialImpactEtb,
      timeExposureDays: issue.timeImpactDays,
      priorityLevel: issue.priority,
      contractClauseRef: issue.clauseReference || 'General Conditions',
      milestoneStage: stageVal || issue.currentStage
    });

    const events: {
      id: string;
      date: string;
      timestamp: string;
      who: string;
      action: string;
      status: string;
      stage?: string;
      category: string;
      department: string;
      transferredFrom?: string;
      transferredTo?: string;
      transferDate?: string;
      departmentTimeTakenDays: number;
      overallTimeTakenDays: number;
      changedColumns: string[];
      columnSnapshots?: IssueColumnChangeDetail;
      notes?: string;
    }[] = [];

    // 1. Initial Notice & Lodging Event
    const initialColumns = [
      'Current Status',
      'Issue Category',
      'Submitted Date',
      'Submitted To (Department)',
      'Financial Exposure (ETB)',
      'Time Exposure (Days)',
      'Priority Level',
      'Contract Clause Ref',
      'Initial Description'
    ];
    events.push({
      id: `ev-initial-${issue.id}`,
      date: subDate,
      timestamp: issue.createdDate || `${subDate} 09:00`,
      who: issue.submittedBy || 'Contractor / Originator',
      action: `Initial Issue Lodged & Registered (Ref: ${issue.clauseReference || 'General Conditions'})`,
      status: 'Submitted / Under Review',
      stage: 'Stage 1: Initial Submission & Site Verification',
      category: issue.category,
      department: issue.submittedTo || 'Initial Reviewing Authority',
      departmentTimeTakenDays: 0,
      overallTimeTakenDays: 0,
      changedColumns: initialColumns,
      columnSnapshots: buildColumnSnapshot('Submitted / Under Review', issue.category, issue.submittedTo || 'Initial Reviewing Authority', 0, 0, 'Stage 1: Initial Submission & Site Verification'),
      notes: `Lodged and submitted to ${issue.submittedTo}. Priority: ${issue.priority}. Claim/Issue: ${issue.initialDescription} [Exposure: Br. ${(issue.financialImpactEtb || 0).toLocaleString()} • ${issue.timeImpactDays || 0} Days EOT]`
    });

    // 2. Department Handover / Transfer Events
    (issue.transfers || []).forEach((tr, tIdx) => {
      const prevTransfer = tIdx > 0 ? issue.transfers![tIdx - 1] : null;
      const deptStartDate = prevTransfer ? (prevTransfer.transferDate || subDate) : subDate;
      const tDate = tr.transferDate || subDate;
      const deptDays = getDiffDays(deptStartDate, tDate);
      const overallDays = getDiffDays(subDate, tDate);
      const transferChangedCols = [
        'Current Status',
        'Department Transferred From',
        'Department Transferred To',
        'Transfer Date',
        'Transfer Reason',
        'Action Taken by Previous Team',
        'Recommended Next Steps',
        'Department Time Taken (Days)',
        'Overall Time Taken (Days)'
      ];

      events.push({
        id: tr.id || `ev-tr-${tIdx}`,
        date: tDate,
        timestamp: `${tDate} 12:00`,
        who: tr.transferredBy || 'Reviewing Engineer',
        action: `Department Handover: Transferred from [${tr.transferredFrom}] to [${tr.transferredTo}]`,
        status: 'Transferred / Escalated',
        stage: `Transferred to: ${tr.transferredTo}`,
        category: issue.category,
        department: tr.transferredFrom,
        transferredFrom: tr.transferredFrom,
        transferredTo: tr.transferredTo,
        transferDate: tDate,
        departmentTimeTakenDays: deptDays,
        overallTimeTakenDays: overallDays,
        changedColumns: transferChangedCols,
        columnSnapshots: buildColumnSnapshot('Transferred / Escalated', issue.category, `${tr.transferredFrom} ➔ ${tr.transferredTo}`, deptDays, overallDays, `Transferred to: ${tr.transferredTo}`),
        notes: `Reason: ${tr.transferReason}. Action by previous team: ${tr.actionTakenByPreviousTeam}. Recommended: ${tr.recommendedCourseOfAction}. Time in [${tr.transferredFrom}] before handover: ${deptDays} calendar days.`
      });
    });

    // 3. Status History & Audit Log Records
    (issue.history || []).forEach((h, hIdx) => {
      if (h.changeType === 'Creation') return; // Handled by initial notice
      const hDate = h.timestamp ? h.timestamp.split(' ')[0] : subDate;
      const deptInfo = getActiveDeptInfoAtDate(hDate);
      const deptDays = h.daysInDepartmentBeforeTransferOrChange ?? getDiffDays(deptInfo.startDate, hDate);
      const overallDays = h.overallElapsedDays ?? getDiffDays(subDate, hDate);
      const eventCategory = h.category || issue.category;
      const eventDept = h.department || deptInfo.department;

      const dynamicChangedCols: string[] = [];
      if (h.previousStatus && h.previousStatus !== h.newStatus) dynamicChangedCols.push('Current Status');
      if (h.stage) dynamicChangedCols.push('Milestone Stage');
      if (h.category && h.category !== issue.category) dynamicChangedCols.push('Issue Category');
      dynamicChangedCols.push('Department Time Taken (Days)', 'Overall Time Taken (Days)', 'Audit Notes');

      events.push({
        id: h.id || `ev-hist-${hIdx}`,
        date: hDate,
        timestamp: h.timestamp || `${hDate} 10:00`,
        who: h.user || 'ERA Administrator',
        action: `${h.changeType || 'Status/Progress Update'}${h.previousStatus && h.previousStatus !== h.newStatus ? `: [${h.previousStatus}] ➔ [${h.newStatus}]` : ''}`,
        status: h.newStatus || issue.currentStatus,
        stage: h.stage || issue.currentStage,
        category: eventCategory,
        department: eventDept,
        departmentTimeTakenDays: deptDays,
        overallTimeTakenDays: overallDays,
        changedColumns: h.changedColumns || dynamicChangedCols,
        columnSnapshots: buildColumnSnapshot(h.newStatus || issue.currentStatus, eventCategory, eventDept, deptDays, overallDays, h.stage || issue.currentStage),
        notes: h.notes || 'Status and audit milestone updated'
      });
    });

    // 4. Final Resolution Event (if resolved)
    const isResolved = !isPendingStatus(issue.currentStatus) || issue.currentStatus === 'Resolved / Approved' || issue.currentStatus === 'Rejected / Closed';
    const resDate = issue.resolvedDate || turnaroundInfo.resolvedDate;
    if (isResolved && resDate) {
      const hasExistingResEvent = events.some(e => e.action.includes('Resolution') || e.status === 'Resolved / Approved' || e.status === 'Rejected / Closed');
      if (!hasExistingResEvent) {
        const lastDeptRecord = deptBreakdown.length > 0 ? deptBreakdown[deptBreakdown.length - 1] : null;
        const finalDept = lastDeptRecord ? lastDeptRecord.department : (issue.submittedTo || 'ERA Authority');
        const finalDeptDays = lastDeptRecord ? lastDeptRecord.daysTaken : getDiffDays(subDate, resDate);
        const finalChangedCols = [
          'Current Status',
          'Resolution Status',
          'Resolved Date',
          'Turnaround Days',
          'Department Time Taken (Days)',
          'Overall Time Taken (Days)',
          'Final Progress Summary'
        ];

        events.push({
          id: `ev-resolution-${issue.id}`,
          date: resDate,
          timestamp: `${resDate} 16:30`,
          who: issue.lessonsLearnedUpdatedBy || 'ERA Project Authority',
          action: `Final Resolution & Determination (${issue.currentStatus})`,
          status: issue.currentStatus,
          stage: issue.currentStage || 'Final Stage: Resolution',
          category: issue.category,
          department: finalDept,
          departmentTimeTakenDays: finalDeptDays,
          overallTimeTakenDays: turnaroundInfo.turnaroundDays,
          changedColumns: finalChangedCols,
          columnSnapshots: buildColumnSnapshot(issue.currentStatus, issue.category, finalDept, finalDeptDays, turnaroundInfo.turnaroundDays, issue.currentStage || 'Final Stage: Resolution'),
          notes: issue.latestProgressSummary || `Issue reached final determination in ${turnaroundInfo.turnaroundDays} calendar days.`
        });
      }
    }

    // Sort chronologically ascending
    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Map into structured steps
    const steps: ResolutionStepRecord[] = events.map((ev, idx) => ({
      id: `step-${idx + 1}-${issue.id}`,
      stepNumber: idx + 1,
      date: ev.date,
      actionTaken: ev.action,
      performedBy: ev.who,
      statusAtStep: ev.status,
      stage: ev.stage,
      category: ev.category,
      department: ev.department,
      transferredFrom: ev.transferredFrom,
      transferredTo: ev.transferredTo,
      transferDate: ev.transferDate,
      departmentTimeTakenDays: ev.departmentTimeTakenDays,
      overallTimeTakenDays: ev.overallTimeTakenDays,
      changedColumns: ev.changedColumns,
      columnSnapshots: ev.columnSnapshots,
      notes: ev.notes
    }));

    // Compile narrative text
    const narrativeLines: string[] = [];
    narrativeLines.push(`=== LESSONS LEARNED AUDIT RECORD & RESOLUTION DOSSIER ===`);
    narrativeLines.push(`• Issue Code: ${issue.issueCode} | Title: ${issue.title}`);
    narrativeLines.push(`• Issue Category: ${issue.category} | Current Status: ${issue.currentStatus}`);
    narrativeLines.push(`• Overall Time Taken: ${turnaroundInfo.turnaroundDays} Calendar Days (${turnaroundInfo.displayText})`);
    narrativeLines.push(`• Origin: Lodged on ${issue.submittedDate} by ${issue.submittedBy} to ${issue.submittedTo}`);
    if (resDate) {
      narrativeLines.push(`• Resolved / Closed Date: ${resDate} (${issue.currentStatus})`);
    }
    narrativeLines.push('');
    narrativeLines.push(`DEPARTMENT TIME TAKEN BREAKDOWN BEFORE TRANSFER OR CHANGE:`);
    deptBreakdown.forEach((dept, dIdx) => {
      narrativeLines.push(`  ${dIdx + 1}. [${dept.department}]`);
      narrativeLines.push(`     - Dates: ${dept.startDate} ➔ ${dept.endDate}`);
      narrativeLines.push(`     - Time Taken: ${dept.daysTaken} Calendar Days (${dept.status})`);
      if (dept.actionBeforeTransferOrChange) {
        narrativeLines.push(`     - Handover/Action: ${dept.actionBeforeTransferOrChange}`);
      }
    });
    narrativeLines.push('');
    narrativeLines.push(`CHRONOLOGICAL AUDIT OF ALL STEPS TAKEN, COLUMN CHANGES & HANDOVERS:`);

    steps.forEach(st => {
      narrativeLines.push(`Step ${st.stepNumber} [${st.date}]: ${st.actionTaken}`);
      narrativeLines.push(`  - Action Performed By: ${st.performedBy}`);
      narrativeLines.push(`  - Category: ${st.category || issue.category}`);
      narrativeLines.push(`  - Issue Status: ${st.statusAtStep}${st.stage ? ` (${st.stage})` : ''}`);
      narrativeLines.push(`  - Department / Handover: ${st.department || 'N/A'}${st.transferredTo ? ` ➔ Transferred to [${st.transferredTo}]` : ''}`);
      narrativeLines.push(`  - Department Time Taken: ${st.departmentTimeTakenDays !== undefined ? `${st.departmentTimeTakenDays} Days before transfer/change` : 'N/A'}`);
      narrativeLines.push(`  - Overall Time Taken: ${st.overallTimeTakenDays !== undefined ? `${st.overallTimeTakenDays} Days since submission` : 'N/A'}`);
      if (st.changedColumns && st.changedColumns.length > 0) {
        narrativeLines.push(`  - Changed Columns: ${st.changedColumns.join(', ')}`);
      }
      if (st.notes) {
        narrativeLines.push(`  - Technical Details & Interventions: ${st.notes}`);
      }
      narrativeLines.push('');
    });

    return {
      steps,
      stepsText: narrativeLines.join('\n'),
      changesLog: events,
      departmentTimeBreakdown: deptBreakdown,
      resolutionStatus: issue.resolutionStatus || issue.currentStatus,
      submittedDate: issue.submittedDate,
      resolvedDate: resDate,
      turnaroundDays: turnaroundInfo.turnaroundDays,
      overallTimeTakenDays: turnaroundInfo.turnaroundDays
    };
  };

  const openLessonsLearnedModal = (issue: IssueLogItem) => {
    setSelectedIssueId(issue.id);
    const compiled = compileResolutionJourneyData(issue);
    setLessonsInput(issue.lessonsLearned || '');
    setReviewNotesInput(issue.reviewNotes || '');
    setStepsTakenInput(issue.stepsTakenUntilResolved || compiled.stepsText);
    setResolutionStepsList(
      issue.resolutionSteps && issue.resolutionSteps.length > 0
        ? issue.resolutionSteps
        : compiled.steps
    );
    setResolutionStatusInput(issue.resolutionStatus || issue.currentStatus);
    setLessonsModalTab('steps');
    setShowAddStepForm(false);
    setNewStepDate(new Date().toISOString().split('T')[0]);
    setNewStepPerformedBy(currentUsername);
    setNewStepCategory(issue.category || '');
    const currentDept = issue.transfers && issue.transfers.length > 0 
      ? issue.transfers[issue.transfers.length - 1].transferredTo 
      : (issue.submittedTo || 'Reviewing Team');
    setNewStepDepartment(currentDept);
    setNewStepDeptTime('');
    setNewStepOverallTime('');
    setNewStepChangedColumns('Current Status, Issue Category');
    setNewStepAction('');
    setNewStepNotes('');
    setShowLessonsModal(true);
  };

  React.useEffect(() => {
    if (selectedIssue) {
      setLessonsInput(selectedIssue.lessonsLearned || '');
      setReviewNotesInput(selectedIssue.reviewNotes || '');
      const compiled = compileResolutionJourneyData(selectedIssue);
      setStepsTakenInput(selectedIssue.stepsTakenUntilResolved || compiled.stepsText);
      setResolutionStepsList(
        selectedIssue.resolutionSteps && selectedIssue.resolutionSteps.length > 0
          ? selectedIssue.resolutionSteps
          : compiled.steps
      );
      setResolutionStatusInput(selectedIssue.resolutionStatus || selectedIssue.currentStatus);
    }
  }, [selectedIssueId, selectedIssue?.lessonsLearned, selectedIssue?.reviewNotes, selectedIssue?.stepsTakenUntilResolved, selectedIssue?.resolutionStatus]);

  const isOverduePending = (item: IssueLogItem, threshold: number) => {
    return isPendingStatus(item.currentStatus) && calculateDaysPending(item.submittedDate) >= threshold;
  };

  // Trend Data for Visual Analysis Chart
  const trendData = React.useMemo(() => {
    const monthsMap: Record<string, { monthKey: string; monthLabel: string; Critical: number; High: number; Medium: number; Low: number; Total: number }> = {};

    issuesList.forEach(item => {
      if (!item.submittedDate) return;
      const d = new Date(item.submittedDate);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthsMap[key]) {
        monthsMap[key] = {
          monthKey: key,
          monthLabel: monthName,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          Total: 0
        };
      }

      const p = item.priority || 'Medium';
      if (p === 'Critical') monthsMap[key].Critical += 1;
      else if (p === 'High') monthsMap[key].High += 1;
      else if (p === 'Medium') monthsMap[key].Medium += 1;
      else if (p === 'Low') monthsMap[key].Low += 1;

      monthsMap[key].Total += 1;
    });

    return Object.values(monthsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [issuesList]);

  const peakMonth = React.useMemo(() => {
    if (!trendData.length) return { monthLabel: 'N/A', Total: 0 };
    return trendData.reduce((prev, curr) => (curr.Total > prev.Total ? curr : prev), trendData[0]);
  }, [trendData]);

  const criticalAndHighPercentage = React.useMemo(() => {
    if (!issuesList.length) return 0;
    const severeCount = issuesList.filter(i => i.priority === 'Critical' || i.priority === 'High').length;
    return Math.round((severeCount / issuesList.length) * 100);
  }, [issuesList]);

  const avgDaysPending = React.useMemo(() => {
    const pendingItems = issuesList.filter(i => isPendingStatus(i.currentStatus));
    if (!pendingItems.length) return 0;
    const totalDays = pendingItems.reduce((acc, curr) => acc + calculateDaysPending(curr.submittedDate), 0);
    return Math.round(totalDays / pendingItems.length);
  }, [issuesList]);

  // New Issue Form
  const [newIssue, setNewIssue] = useState<Partial<IssueLogItem>>({
    issueCode: `ERA-ISS-2026-${String(issuesList.length + 1).padStart(3, '0')}`,
    title: '',
    category: 'Contractual Claim',
    submittedDate: new Date().toISOString().split('T')[0],
    submittedBy: `${project.contractor || 'Contractor'}`,
    submittedTo: `${project.consultant || 'Consultant RE'}`,
    clauseReference: 'FIDIC Sub-Clause 20.1',
    initialDescription: '',
    financialImpactEtb: 0,
    timeImpactDays: 0,
    priority: 'High',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Submission & Site Verification',
    latestProgressSummary: 'Issue submitted and currently undergoing verification by Consultant team.',
    currentBottleneck: 'Pending preliminary verification report.'
  });

  // New Transfer Form
  const [newTransfer, setNewTransfer] = useState<Partial<IssueTransferRecord>>({
    transferDate: new Date().toISOString().split('T')[0],
    transferredFrom: '',
    transferredTo: '',
    transferReason: '',
    actionTakenByPreviousTeam: '',
    recommendedCourseOfAction: '',
    transferredBy: ''
  });

  // Helper to persist updates to project
  const saveIssues = (updatedList: IssueLogItem[], msg: string) => {
    if (onProjectUpdate) {
      onProjectUpdate({ issues: updatedList }, msg);
    }
  };

  const handleDeleteIssue = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    const updatedList = issuesList.filter(i => i.id !== id);
    saveIssues(updatedList, 'Issue deleted');
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.title) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const initialStatus = newIssue.currentStatus || 'Submitted / Under Review';
    const initialStage = newIssue.currentStage || 'Stage 1: Initial Review';

    const created: IssueLogItem = {
      id: `iss-${Date.now()}`,
      issueCode: newIssue.issueCode || `ERA-ISS-2026-${String(issuesList.length + 1).padStart(3, '0')}`,
      title: newIssue.title,
      category: newIssue.category || 'Contractual Claim',
      submittedDate: newIssue.submittedDate || new Date().toISOString().split('T')[0],
      createdDate: nowStr,
      lastUpdated: nowStr,
      submittedBy: newIssue.submittedBy || 'Contractor',
      submittedTo: newIssue.submittedTo || 'Consultant RE',
      clauseReference: newIssue.clauseReference || '',
      initialDescription: newIssue.initialDescription || '',
      financialImpactEtb: Number(newIssue.financialImpactEtb) || 0,
      timeImpactDays: Number(newIssue.timeImpactDays) || 0,
      priority: newIssue.priority || 'High',
      currentStatus: initialStatus,
      currentStage: initialStage,
      latestProgressSummary: newIssue.latestProgressSummary || 'Submitted.',
      currentBottleneck: newIssue.currentBottleneck || '',
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: nowStr,
          user: currentUsername,
          previousStatus: 'None',
          newStatus: initialStatus,
          stage: initialStage,
          changeType: 'Creation',
          notes: 'Initial issue entry registered in ERA system.'
        }
      ],
      transfers: []
    };

    const updated = [created, ...issuesList];
    saveIssues(updated, `New Issue Log entry created: ${created.issueCode}`);
    setSelectedIssueId(created.id);
    setShowNewIssueModal(false);

    // Trigger Admin Notification Flag for High or Critical priority issues
    if (created.priority === 'High' || created.priority === 'Critical') {
      setUrgentNotificationFlag({
        issueCode: created.issueCode,
        title: created.title,
        priority: created.priority
      });

      alert(`🚨 URGENT ADMIN NOTIFICATION TRIGGERED!\n\n` +
            `Attention Administrators:\n` +
            `A high-severity issue has been registered with priority '${created.priority}'.\n\n` +
            `• Issue Code: ${created.issueCode}\n` +
            `• Title: ${created.title}\n` +
            `• Priority: ${created.priority.toUpperCase()}\n` +
            `• Date Submitted: ${created.submittedDate}\n` +
            `• Created: ${created.createdDate}\n\n` +
            `An urgent notification flag has been dispatched in the system registry to alert project administrators immediately.`);
    }
  };

  const handleAddTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newTransfer.transferredTo) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const todayStr = newTransfer.transferDate || nowStr.split(' ')[0];
    const subDate = selectedIssue.submittedDate || todayStr;
    const transferUser = newTransfer.transferredBy || currentUsername;
    const fromDept = newTransfer.transferredFrom || 'Previous Reviewing Team';

    // Calculate department time before transfer:
    const lastTransfer = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
      : null;
    const deptStartDate = lastTransfer ? (lastTransfer.transferDate || subDate) : subDate;
    const daysInDeptBeforeTransfer = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(deptStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    const overallElapsed = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24)));

    const transferItem: IssueTransferRecord = {
      id: `tr-${Date.now()}`,
      transferDate: todayStr,
      transferredFrom: fromDept,
      transferredTo: newTransfer.transferredTo,
      transferReason: newTransfer.transferReason || 'Escalated for higher approval authority',
      actionTakenByPreviousTeam: newTransfer.actionTakenByPreviousTeam || 'Reviewed preliminary claim and verified factual documentation.',
      recommendedCourseOfAction: newTransfer.recommendedCourseOfAction || 'Next course of action as recommended.',
      transferredBy: transferUser
    };

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: transferUser,
      previousStatus: selectedIssue.currentStatus,
      newStatus: 'Transferred / Escalated',
      stage: `Transferred to: ${newTransfer.transferredTo}`,
      changeType: 'Transfer Handover',
      category: selectedIssue.category,
      department: fromDept,
      daysInDepartmentBeforeTransferOrChange: daysInDeptBeforeTransfer,
      overallElapsedDays: overallElapsed,
      changedColumns: [
        'Current Status',
        'Milestone Stage',
        'Department Transferred From',
        'Department Transferred To',
        'Transfer Date',
        'Transfer Reason',
        'Action Taken by Previous Team',
        'Recommended Next Steps',
        'Department Time Taken (Days)',
        'Overall Time Taken (Days)'
      ],
      notes: `Transferred from [${fromDept}] to [${newTransfer.transferredTo}]. Time in [${fromDept}] before transfer: ${daysInDeptBeforeTransfer} calendar days. Overall time: ${overallElapsed} days. Reason: ${newTransfer.transferReason || 'Escalated'}. Action: ${newTransfer.actionTakenByPreviousTeam || 'Reviewed'}. Recommended: ${newTransfer.recommendedCourseOfAction || 'See notes'}`
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      lastUpdated: nowStr,
      currentStatus: 'Transferred / Escalated',
      currentStage: `Transferred to: ${newTransfer.transferredTo}`,
      latestProgressSummary: `Issue transferred from [${transferItem.transferredFrom}] to [${transferItem.transferredTo}]. Recommended Course: ${transferItem.recommendedCourseOfAction}`,
      history: [historyRecord, ...(selectedIssue.history || [])],
      transfers: [...selectedIssue.transfers, transferItem]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Transfer record added to issue ${selectedIssue.issueCode}`);
    setShowAddTransferModal(false);
    
    // reset transfer form
    setNewTransfer({
      transferDate: new Date().toISOString().split('T')[0],
      transferredFrom: '',
      transferredTo: '',
      transferReason: '',
      actionTakenByPreviousTeam: '',
      recommendedCourseOfAction: '',
      transferredBy: ''
    });
  };

  const handleUpdateIssueDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const todayStr = nowStr.split(' ')[0];
    const subDate = selectedIssue.submittedDate || todayStr;
    const currentDept = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1].transferredTo
      : (selectedIssue.submittedTo || 'Reviewing Team');
    const lastTransfer = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
      : null;
    const deptStartDate = lastTransfer ? (lastTransfer.transferDate || subDate) : subDate;
    const daysInDept = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(deptStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    const overallElapsed = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24)));

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: selectedIssue.currentStatus,
      stage: selectedIssue.currentStage,
      changeType: 'Details Edit',
      category: selectedIssue.category,
      department: currentDept,
      daysInDepartmentBeforeTransferOrChange: daysInDept,
      overallElapsedDays: overallElapsed,
      changedColumns: [
        'Issue Category',
        'Priority Level',
        'Financial Exposure (ETB)',
        'Time Exposure (Days)',
        'Contract Clause Ref',
        'Current Bottleneck',
        'Department Time Taken (Days)',
        'Overall Time Taken (Days)'
      ],
      notes: `Issue details & category audited by ${currentUsername}. Active department: [${currentDept}] (${daysInDept} days spent before change). Overall duration: ${overallElapsed} days. Summary: ${selectedIssue.latestProgressSummary || 'Details revised'}`
    };

    const updatedIssueWithHistory: IssueLogItem = {
      ...selectedIssue,
      lastUpdated: nowStr,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssueWithHistory : item);
    saveIssues(updatedList, `Issue ${selectedIssue.issueCode} details updated`);
    setShowEditIssueModal(false);
  };

  const handleAddResolutionStep = () => {
    if (!newStepAction.trim() || !selectedIssue) return;
    const stepNum = resolutionStepsList.length + 1;
    const stepDate = newStepDate || new Date().toISOString().split('T')[0];
    const subDate = selectedIssue.submittedDate || stepDate;
    const currentDept = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1].transferredTo
      : (selectedIssue.submittedTo || 'Reviewing Authority');
    const stepDept = (newStepDepartment || '').trim() || currentDept;
    const stepCategory = (newStepCategory || '').trim() || selectedIssue.category;

    const lastTransfer = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
      : null;
    const deptStartDate = lastTransfer ? (lastTransfer.transferDate || subDate) : subDate;
    const autoDeptDays = Math.max(0, Math.floor((new Date(stepDate).getTime() - new Date(deptStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    const autoOverallDays = Math.max(0, Math.floor((new Date(stepDate).getTime() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24)));

    const finalDeptDays = newStepDeptTime !== '' ? Number(newStepDeptTime) : autoDeptDays;
    const finalOverallDays = newStepOverallTime !== '' ? Number(newStepOverallTime) : autoOverallDays;
    const parsedCols = (newStepChangedColumns || '').split(',').map(s => s.trim()).filter(Boolean);
    const finalChangedCols = parsedCols.length > 0 ? parsedCols : ['Current Status', 'Issue Category', 'Department Time Taken (Days)', 'Overall Time Taken (Days)'];

    const newStepItem: ResolutionStepRecord = {
      id: `step-${Date.now()}`,
      stepNumber: stepNum,
      date: stepDate,
      actionTaken: newStepAction.trim(),
      performedBy: newStepPerformedBy.trim() || currentUsername,
      statusAtStep: newStepStatus,
      stage: selectedIssue.currentStage,
      category: stepCategory,
      department: stepDept,
      departmentTimeTakenDays: finalDeptDays,
      overallTimeTakenDays: finalOverallDays,
      changedColumns: finalChangedCols,
      notes: newStepNotes.trim() || undefined
    };
    const updated = [...resolutionStepsList, newStepItem];
    setResolutionStepsList(updated);

    // Append to narrative text
    const appendedLine = `\nStep ${stepNum} [${newStepItem.date}]: ${newStepItem.actionTaken}\n  - Performed By: ${newStepItem.performedBy}\n  - Category: ${newStepItem.category}\n  - Issue Status: ${newStepItem.statusAtStep}\n  - Department: ${newStepItem.department}\n  - Dept Time Taken: ${newStepItem.departmentTimeTakenDays} Days before transfer/change\n  - Overall Time Taken: ${newStepItem.overallTimeTakenDays} Days since submission\n  - Changed Columns: ${newStepItem.changedColumns?.join(', ')}${newStepItem.notes ? `\n  - Technical Notes: ${newStepItem.notes}` : ''}\n`;
    setStepsTakenInput(prev => (prev ? prev + '\n' + appendedLine : appendedLine));

    // Reset step form
    setNewStepAction('');
    setNewStepNotes('');
    setNewStepDeptTime('');
    setNewStepOverallTime('');
    setShowAddStepForm(false);
  };

  const handleRemoveResolutionStep = (stepId: string) => {
    const filtered = resolutionStepsList.filter(s => s.id !== stepId).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));
    setResolutionStepsList(filtered);
  };

  const handleSaveLessonsLearned = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const todayDate = nowStr.split(' ')[0];
    const subDate = selectedIssue.submittedDate || todayDate;
    const targetStatus = (resolutionStatusInput || selectedIssue.currentStatus) as IssueLogItem['currentStatus'];
    const isNowResolved = !isPendingStatus(targetStatus);
    const resolvedDate = isNowResolved ? (selectedIssue.resolvedDate || todayDate) : undefined;
    const turnaroundDays = isNowResolved ? (selectedIssue.turnaroundDays ?? calculateTurnaroundDays(selectedIssue.submittedDate, resolvedDate)) : undefined;

    const currentDept = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1].transferredTo
      : (selectedIssue.submittedTo || 'Reviewing Authority');
    const lastTransfer = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
      : null;
    const deptStartDate = lastTransfer ? (lastTransfer.transferDate || subDate) : subDate;
    const daysInDept = Math.max(0, Math.floor((new Date(todayDate).getTime() - new Date(deptStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    const overallElapsed = turnaroundDays ?? Math.max(0, Math.floor((new Date(todayDate).getTime() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24)));

    const changedCols = [
      'Current Status',
      'Resolution Status',
      'Lessons Learned',
      'Review Notes',
      'Steps Taken Until Resolved',
      'Resolution Steps',
      'Department Time Taken (Days)',
      'Overall Time Taken (Days)',
      ...(isNowResolved ? ['Resolved Date', 'Turnaround Days'] : [])
    ];

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: targetStatus,
      stage: selectedIssue.currentStage,
      changeType: 'Lessons Learned Review',
      category: selectedIssue.category,
      department: currentDept,
      daysInDepartmentBeforeTransferOrChange: daysInDept,
      overallElapsedDays: overallElapsed,
      changedColumns: changedCols,
      notes: `Institutional lessons learned recorded by ${currentUsername}. Status set to "${targetStatus}". Resolution steps logged: ${resolutionStepsList.length} step(s). Department time in [${currentDept}] before update: ${daysInDept} days. Overall turnaround recorded: ${overallElapsed} days.`
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      lastUpdated: nowStr,
      currentStatus: targetStatus,
      resolutionStatus: targetStatus,
      stepsTakenUntilResolved: stepsTakenInput,
      resolutionSteps: resolutionStepsList,
      lessonsLearned: lessonsInput,
      reviewNotes: reviewNotesInput,
      lessonsLearnedUpdatedBy: currentUsername,
      lessonsLearnedUpdatedAt: nowStr,
      resolvedDate: resolvedDate,
      turnaroundDays: turnaroundDays,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Lessons learned & resolution steps recorded for issue ${selectedIssue.issueCode}`);
    setShowLessonsModal(false);
  };

  const handleDeleteLessonsLearned = (issueIdToTarget?: string) => {
    const targetId = issueIdToTarget || selectedIssue?.id;
    if (!targetId) return;
    const targetIssue = issuesList.find(i => i.id === targetId);
    if (!targetIssue) return;

    if (!window.confirm(`Are you sure you want to permanently delete the lesson learned for Issue ${targetIssue.issueCode}? This will clear the lesson narrative, resolution steps, review notes, and author attributions.`)) {
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: targetIssue.currentStatus,
      newStatus: targetIssue.currentStatus,
      stage: targetIssue.currentStage,
      changeType: 'Lessons Learned Deleted',
      category: targetIssue.category,
      department: targetIssue.submittedTo || 'Reviewing Authority',
      notes: `Lesson learned & resolution dossier deleted by administrator ${currentUsername}. (Previous lesson: "${(targetIssue.lessonsLearned || '').substring(0, 60)}...")`
    };

    const updatedIssue: IssueLogItem = {
      ...targetIssue,
      lastUpdated: nowStr,
      lessonsLearned: undefined,
      reviewNotes: undefined,
      lessonsLearnedUpdatedBy: undefined,
      lessonsLearnedUpdatedAt: undefined,
      stepsTakenUntilResolved: undefined,
      resolutionSteps: undefined,
      resolutionStatus: undefined,
      history: [historyRecord, ...(targetIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === targetId ? updatedIssue : item);
    saveIssues(updatedList, `Lesson learned deleted for issue ${targetIssue.issueCode}`);
    setLessonsInput('');
    setReviewNotesInput('');
    setStepsTakenInput('');
    setResolutionStepsList([]);
    setShowLessonsModal(false);
  };

  const handleAddManualHistoryNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !historyNoteInput) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const todayStr = nowStr.split(' ')[0];
    const subDate = selectedIssue.submittedDate || todayStr;
    const currentDept = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1].transferredTo
      : (selectedIssue.submittedTo || 'Reviewing Authority');
    const lastTransfer = selectedIssue.transfers && selectedIssue.transfers.length > 0
      ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
      : null;
    const deptStartDate = lastTransfer ? (lastTransfer.transferDate || subDate) : subDate;
    const daysInDeptBeforeChange = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(deptStartDate).getTime()) / (1000 * 60 * 60 * 24)));
    const overallElapsed = Math.max(0, Math.floor((new Date(todayStr).getTime() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24)));

    const targetStatus = (historyNewStatusInput || selectedIssue.currentStatus) as IssueLogItem['currentStatus'];
    const isBecomingResolved = targetStatus === 'Resolved / Approved' || targetStatus === 'Rejected / Closed';
    const resolutionDate = isBecomingResolved ? todayStr : undefined;
    const turnaround = isBecomingResolved ? calculateTurnaroundDays(selectedIssue.submittedDate, resolutionDate) : overallElapsed;

    const changedCols: string[] = [];
    if (targetStatus !== selectedIssue.currentStatus) changedCols.push('Current Status');
    changedCols.push('Audit Note / History', 'Department Time Taken (Days)', 'Overall Time Taken (Days)');
    if (isBecomingResolved) changedCols.push('Resolved Date', 'Turnaround Days', 'Resolution Status');

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: targetStatus,
      stage: selectedIssue.currentStage,
      changeType: targetStatus !== selectedIssue.currentStatus ? 'Status Change' : 'Audit Note',
      category: selectedIssue.category,
      department: currentDept,
      daysInDepartmentBeforeTransferOrChange: daysInDeptBeforeChange,
      overallElapsedDays: turnaround,
      changedColumns: changedCols,
      notes: isBecomingResolved && turnaround !== undefined 
        ? `${historyNoteInput} [Department Time in ${currentDept} before change: ${daysInDeptBeforeChange} Days • Resolution Turnaround: ${turnaround} Days from submission on ${selectedIssue.submittedDate}]`
        : `${historyNoteInput} [Department Time in ${currentDept} before change: ${daysInDeptBeforeChange} Days • Overall Time: ${overallElapsed} Days]`
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      lastUpdated: nowStr,
      currentStatus: targetStatus,
      resolvedDate: isBecomingResolved ? (selectedIssue.resolvedDate || resolutionDate) : undefined,
      turnaroundDays: isBecomingResolved ? (selectedIssue.turnaroundDays ?? turnaround) : undefined,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Status change / audit note logged by ${currentUsername}`);
    setShowHistoryModal(false);
    setHistoryNoteInput('');
    setHistoryNewStatusInput('');
  };

  // Structured PDF Export for Single Issue Dossier
  const handleExportSingleIssuePdf = (issueToExport?: IssueLogItem) => {
    const item = issueToExport || selectedIssue;
    if (!item) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);
    let curY = 40;

    let pageCount = 0;
    const drawPageDecorations = () => {
      pageCount++;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, 20, contentWidth, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);

      doc.text(
        `ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL CONTRACTUAL ISSUE DOSSIER • REF: ${item.issueCode}`,
        margin,
        pageHeight - 22
      );
      doc.text(
        `CONFIDENTIAL • Page ${pageCount}`,
        pageWidth - margin,
        pageHeight - 22,
        { align: 'right' }
      );
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 50) {
        doc.addPage();
        curY = 45;
        drawPageDecorations();
      }
    };

    const drawSectionHeader = (title: string, color = [37, 99, 235]) => {
      checkSpace(35);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin, curY - 9, 4, 12, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 9, curY);
      curY += 18;
    };

    drawPageDecorations();

    // Document Header & ERA Logo Emblem
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, curY, 36, 36, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text("E.R.A", margin + 18, curY + 18, { align: 'center' });
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.text("ROADS", margin + 18, curY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 46, curY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("PROJECT ISSUE ESCALATION & TEAM TRANSFER DOSSIER", margin + 46, curY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`DOSSIER NO: ${item.issueCode}   •   GENERATED: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, margin + 46, curY + 34);

    curY += 46;

    // Project Info Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 34, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`PROJECT: ${project.name}`, margin + 10, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contractor: ${project.contractor || 'N/A'}   |   Consultant: ${project.consultant || 'N/A'}   |   Type: ${project.contractType}`, margin + 10, curY + 26);

    curY += 44;

    // Issue Title Banner
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, curY, contentWidth, 38, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 27, 75);
    const titleLines = doc.splitTextToSize(`ISSUE: ${item.title}`, contentWidth - 20);
    doc.text(titleLines.slice(0, 2), margin + 10, curY + 16);

    curY += 48;

    // 1. Key Particulars
    drawSectionHeader("1. Key Particulars & Financial/Time Impact");

    const colWidth = (contentWidth - 15) / 4;
    const keyBoxes = [
      { label: "ISSUE CODE", val: item.issueCode, color: [37, 99, 235] },
      { label: "CATEGORY", val: item.category, color: [15, 23, 42] },
      { label: "PRIORITY LEVEL", val: item.priority, color: item.priority === 'Critical' ? [225, 29, 72] : [217, 119, 6] },
      { label: "CLAUSE REF", val: item.clauseReference || 'N/A', color: [15, 23, 42] },
    ];

    keyBoxes.forEach((box, i) => {
      const x = margin + i * (colWidth + 5);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, curY, colWidth, 32, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(box.label, x + 8, curY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(box.color[0], box.color[1], box.color[2]);
      const splitVal = doc.splitTextToSize(box.val, colWidth - 12);
      doc.text(splitVal[0], x + 8, curY + 23);
    });

    curY += 38;

    // Impact Row
    const halfWidth = (contentWidth - 8) / 2;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, curY, halfWidth, 32, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(153, 27, 27);
    doc.text("CLAIMED FINANCIAL EXPOSURE (ETB)", margin + 10, curY + 11);
    doc.setFontSize(9);
    doc.text(formatAccounting(item.financialImpactEtb || 0, 'ETB'), margin + 10, curY + 24);

    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin + halfWidth + 8, curY, halfWidth, 32, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text("CLAIMED EXTENSION OF TIME (EOT)", margin + halfWidth + 18, curY + 11);
    doc.setFontSize(9);
    doc.text(item.timeImpactDays ? `${item.timeImpactDays} Calendar Days` : '0 Days (No EOT Claimed)', margin + halfWidth + 18, curY + 24);

    curY += 42;

    // 2. Initial Description
    drawSectionHeader("2. Initial Issue Description & Context");

    const descLines = doc.splitTextToSize(item.initialDescription || 'No initial description provided.', contentWidth - 20);
    const descBoxHeight = Math.max(40, (descLines.length * 10) + 26);

    checkSpace(descBoxHeight + 10);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, descBoxHeight, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date Submitted: ${item.submittedDate}   |   Created: ${item.createdDate || item.submittedDate}   |   Last Updated: ${item.lastUpdated || item.submittedDate}   |   By: ${item.submittedBy}`, margin + 10, curY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, margin + 10, curY + 25);

    curY += descBoxHeight + 14;

    // 3. Current Stage & Bottleneck
    drawSectionHeader("3. Current Milestone Stage & Active Bottlenecks", [16, 185, 129]);

    checkSpace(55);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, curY, contentWidth, 50, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(`Current Status: ${item.currentStatus}   |   Stage: ${item.currentStage}`, margin + 10, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const progressLines = doc.splitTextToSize(`Progress Summary: ${item.latestProgressSummary || 'N/A'}`, contentWidth - 20);
    doc.text(progressLines.slice(0, 2), margin + 10, curY + 26);

    if (item.currentBottleneck) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      const bottleLines = doc.splitTextToSize(`Bottleneck: ${item.currentBottleneck}`, contentWidth - 20);
      doc.text(bottleLines[0], margin + 10, curY + 41);
    }

    curY += 62;

    // 4. Team Transfer Log
    drawSectionHeader("4. Chronological Team Transfer & Handover Audit Log", [147, 51, 234]);

    if (item.transfers && item.transfers.length > 0) {
      item.transfers.forEach((tr, index) => {
        const trReasonLines = doc.splitTextToSize(`Reason: ${tr.transferReason}`, contentWidth - 24);
        const trActionLines = doc.splitTextToSize(`Actions Taken: ${tr.actionTakenByPreviousTeam}`, contentWidth - 24);
        const trRecLines = doc.splitTextToSize(`Recommended Course: ${tr.recommendedCourseOfAction}`, contentWidth - 24);

        const blockHeight = 35 + (trReasonLines.length * 9) + (trActionLines.length * 9) + (trRecLines.length * 9);
        checkSpace(blockHeight + 10);

        doc.setFillColor(250, 245, 255);
        doc.setDrawColor(233, 213, 255);
        doc.roundedRect(margin, curY, contentWidth, blockHeight, 4, 4, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(107, 33, 168);
        const deptRecs = getDepartmentTimeRecords(item);
        const stepRec = deptRecs[index];
        const daysText = stepRec ? `  •  TIME IN DEPT: ${stepRec.daysTaken} Days (${stepRec.startDate} → ${stepRec.endDate})` : '';

        doc.text(`TRANSFER STEP #${index + 1}   •   DATE: ${tr.transferDate}${daysText}`, margin + 10, curY + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`FROM: ${tr.transferredFrom}    --->    TO: ${tr.transferredTo}`, margin + 10, curY + 24);

        let innerY = curY + 35;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(trReasonLines, margin + 10, innerY);
        innerY += (trReasonLines.length * 9);

        doc.text(trActionLines, margin + 10, innerY);
        innerY += (trActionLines.length * 9);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(126, 34, 206);
        doc.text(trRecLines, margin + 10, innerY);

        curY += blockHeight + 10;
      });
    } else {
      checkSpace(30);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 26, 4, 4, 'DF');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No official team transfers recorded yet. Issue remains under initial reviewing authority.", margin + 10, curY + 16);
      curY += 36;
    }

    // 5. Lessons Learned & Retrospective Review
    drawSectionHeader("5. Lessons Learned & Retrospective Review", [13, 148, 136]);
    const turnaroundInfo = getIssueTurnaroundInfo(item);
    const turnaroundDurationText = `Total Issue Turnaround: ${turnaroundInfo.turnaroundDays} Calendar Days (${turnaroundInfo.displayText})`;
    const lessonsText = item.lessonsLearned 
      ? `[${turnaroundDurationText}]\n\n${item.lessonsLearned}`
      : `[${turnaroundDurationText}]\n\nNo explicit lesson learned or retrospective review logged for this issue entry yet.`;
    const lessonsLines = doc.splitTextToSize(lessonsText, contentWidth - 24);
    const lessonsBoxHeight = Math.max(36, (lessonsLines.length * 9) + 22);

    checkSpace(lessonsBoxHeight + 10);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, curY, contentWidth, lessonsBoxHeight, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 118, 110);
    const lessonAuthorText = item.lessonsLearnedUpdatedBy ? `   (Recorded by: ${item.lessonsLearnedUpdatedBy} on ${item.lessonsLearnedUpdatedAt || ''})` : '';
    doc.text(`KEY LESSON & STRATEGIC RECOMMENDATION${lessonAuthorText}`, margin + 10, curY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(lessonsLines, margin + 10, curY + 24);

    curY += lessonsBoxHeight + 12;

    // 6. Complete Status History & User Audit Log
    drawSectionHeader("6. Status History & User Audit Log Trail", [37, 99, 235]);
    if (item.history && item.history.length > 0) {
      item.history.forEach((hist, hIdx) => {
        const histNotes = doc.splitTextToSize(`Notes: ${hist.notes}`, contentWidth - 24);
        const histBoxHeight = Math.max(28, (histNotes.length * 8) + 20);

        checkSpace(histBoxHeight + 6);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentWidth, histBoxHeight, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(`[${hist.timestamp}]  ${hist.user}  •  Type: ${hist.changeType}  •  Status: ${hist.previousStatus} ---> ${hist.newStatus}`, margin + 8, curY + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(histNotes, margin + 8, curY + 20);

        curY += histBoxHeight + 6;
      });
    } else {
      checkSpace(24);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 20, 3, 3, 'DF');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Initial submission audit history record auto-logged.", margin + 8, curY + 13);
      curY += 26;
    }

    curY += 8;

    const filename = `${item.issueCode.replace(/[^a-zA-Z0-9-]/g, '_')}_Dossier_Report.pdf`;
    doc.save(filename);
  };

  // Export Issue Log Registry to CSV / Excel
  const handleExportCsv = () => {
    if (!issuesList.length) return;
    const headers = ["Issue Code", "Category", "Title", "Date Submitted", "Created Date", "Last Updated", "Date Resolved / Approved", "Turnaround Duration (Days)", "Submitted By", "Submitted To", "Priority", "Status", "Contract Ref", "Financial Exposure (ETB)", "Time Exposure (Days)", "Lessons Learned"];
    const rows = issuesList.map(item => {
      const turnaroundInfo = getIssueTurnaroundInfo(item);
      return [
        `"${item.issueCode || ''}"`,
        `"${(item.category || '').replace(/"/g, '""')}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${item.submittedDate || ''}"`,
        `"${item.createdDate || item.submittedDate || ''}"`,
        `"${item.lastUpdated || item.submittedDate || ''}"`,
        `"${item.resolvedDate || turnaroundInfo.resolvedDate || ''}"`,
        `"${turnaroundInfo.turnaroundDays ?? ''}"`,
        `"${(item.submittedBy || '').replace(/"/g, '""')}"`,
        `"${(item.submittedTo || '').replace(/"/g, '""')}"`,
        `"${item.priority || ''}"`,
        `"${item.currentStatus || ''}"`,
        `"${(item.clauseReference || '').replace(/"/g, '""')}"`,
        `"${item.financialImpactEtb || 0}"`,
        `"${item.timeImpactDays || 0}"`,
        `"${(item.lessonsLearned || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Issue_Log_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Structured PDF Export for Master Issue Registry Report
  const handleExportFullRegistryPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);
    let curY = 40;

    let pageCount = 0;
    const drawPageDecorations = () => {
      pageCount++;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, 20, contentWidth, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);

      doc.text(
        `ETHIOPIAN ROADS ADMINISTRATION • MASTER ISSUE REGISTRY REPORT • ${project.name}`,
        margin,
        pageHeight - 22
      );
      doc.text(
        `CONFIDENTIAL • Page ${pageCount}`,
        pageWidth - margin,
        pageHeight - 22,
        { align: 'right' }
      );
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 50) {
        doc.addPage();
        curY = 45;
        drawPageDecorations();
      }
    };

    drawPageDecorations();

    // Header Logo & Branding
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, curY, 36, 36, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text("E.R.A", margin + 18, curY + 18, { align: 'center' });
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.text("ROADS", margin + 18, curY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 46, curY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("MASTER PROJECT ISSUE REGISTRY & CLAIMS MONITORING REPORT", margin + 46, curY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`PROJECT: ${project.name}   •   DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 46, curY + 34);

    curY += 48;

    // Executive Summary Box
    const totalFinancial = filteredIssues.reduce((acc, curr) => acc + (curr.financialImpactEtb || 0), 0);
    const totalDays = filteredIssues.reduce((acc, curr) => acc + (curr.timeImpactDays || 0), 0);
    const activeCount = filteredIssues.filter(i => !i.currentStatus.includes('Resolved') && !i.currentStatus.includes('Rejected')).length;
    const transferredCount = filteredIssues.filter(i => i.currentStatus.includes('Transferred') || i.currentStatus.includes('Escalated')).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 42, 4, 4, 'DF');

    const kpiWidth = contentWidth / 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL LOGGED ISSUES", margin + 10, curY + 13);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${filteredIssues.length} Items`, margin + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("ACTIVE / ESCALATED", margin + kpiWidth + 10, curY + 13);
    doc.setFontSize(10);
    doc.setTextColor(147, 51, 234);
    doc.text(`${activeCount} Active (${transferredCount} Escalated)`, margin + kpiWidth + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL FINANCIAL EXPOSURE", margin + (kpiWidth * 2) + 10, curY + 13);
    doc.setFontSize(10);
    doc.setTextColor(225, 29, 72);
    doc.text(formatAccounting(totalFinancial, 'ETB'), margin + (kpiWidth * 2) + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL TIME IMPACT (EOT)", margin + (kpiWidth * 3) + 10, curY + 13);
    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text(`${totalDays} Days`, margin + (kpiWidth * 3) + 10, curY + 28);

    curY += 54;

    // Issue Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Comprehensive Issue Log Registry Table", margin, curY);
    curY += 12;

    const tableCols = [
      { title: "Code", width: 85 },
      { title: "Category & Description", width: 175 },
      { title: "Clause", width: 60 },
      { title: "Financial (ETB)", width: 80 },
      { title: "EOT", width: 45 },
      { title: "Priority / Status", width: 78 }
    ];

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, curY, contentWidth, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let tx = margin + 5;
    tableCols.forEach(col => {
      doc.text(col.title, tx, curY + 12);
      tx += col.width;
    });

    curY += 18;

    filteredIssues.forEach((issue, idx) => {
      const titleLines = doc.splitTextToSize(issue.title, 165);
      const rowHeight = Math.max(26, (titleLines.length * 9) + 14);

      checkSpace(rowHeight + 5);

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);

      let rx = margin + 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(issue.issueCode, rx, curY + 12);
      rx += tableCols[0].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines.slice(0, 2), rx, curY + 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`[${issue.category}]`, rx, curY + 12 + (Math.min(2, titleLines.length) * 8.5));
      rx += tableCols[1].width;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(issue.clauseReference || 'N/A', rx, curY + 12);
      rx += tableCols[2].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(225, 29, 72);
      doc.text(formatAccounting(issue.financialImpactEtb || 0, ''), rx, curY + 12);
      rx += tableCols[3].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(217, 119, 6);
      doc.text(issue.timeImpactDays ? `${issue.timeImpactDays} d` : '0 d', rx, curY + 12);
      rx += tableCols[4].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      if (issue.priority === 'Critical') doc.setTextColor(225, 29, 72);
      else if (issue.priority === 'High') doc.setTextColor(217, 119, 6);
      else doc.setTextColor(37, 99, 235);
      doc.text(`${issue.priority}`, rx, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      const statusSplit = doc.splitTextToSize(issue.currentStatus, tableCols[5].width - 5);
      doc.text(statusSplit[0], rx, curY + 21);

      curY += rowHeight;
    });

    curY += 18;

    // Detailed Bottlenecks
    checkSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Active Bottlenecks & Escalation Summaries", margin, curY);
    curY += 14;

    filteredIssues.forEach((issue) => {
      if (!issue.currentBottleneck && issue.transfers.length === 0) return;

      checkSpace(38);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 32, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`[${issue.issueCode}] ${issue.title.substring(0, 65)}${issue.title.length > 65 ? '...' : ''}`, margin + 8, curY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const btext = issue.currentBottleneck ? `Bottleneck: ${issue.currentBottleneck}` : `Latest Stage: ${issue.currentStage}`;
      const bLines = doc.splitTextToSize(btext, contentWidth - 16);
      doc.text(bLines[0], margin + 8, curY + 24);

      curY += 38;
    });

    curY += 10;

    // Sign-off
    checkSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Official Registry Verification & Report Approval", margin, curY);
    curY += 14;

    const sigWidth = (contentWidth - 20) / 3;
    const sigTitles = [
      "Prepared By: Resident Engineer",
      "Reviewed By: ERA Directorate Director",
      "Approved By: PMO & Claims Committee"
    ];

    sigTitles.forEach((stitle, sIdx) => {
      const sx = margin + sIdx * (sigWidth + 10);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(sx, curY, sigWidth, 50, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(stitle, sx + 6, curY + 12);

      doc.setDrawColor(226, 232, 240);
      doc.line(sx + 6, curY + 36, sx + sigWidth - 6, curY + 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature & Official Stamp", sx + 6, curY + 44);
    });

    const filename = `ERA_${project.name.replace(/[^a-zA-Z0-9-]/g, '_')}_Master_Issue_Registry.pdf`;
    doc.save(filename);
  };

  const categoriesList = Array.from(new Set(issuesList.map(i => i.category))).filter(Boolean);
  const submittedByList = Array.from(new Set(issuesList.map(i => i.submittedBy))).filter(Boolean);

  const isResolvedStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('resolved') || s.includes('approved') || s.includes('closed') || s.includes('rejected');
  };

  const filteredIssues = React.useMemo(() => {
    let list = issuesList.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.issueCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.submittedBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.submittedTo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.lessonsLearned || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'Active') {
        matchesStatus = !isResolvedStatus(item.currentStatus);
      } else if (statusFilter === 'Overdue Pending') {
        matchesStatus = isOverduePending(item, pendingDaysThreshold);
      } else if (statusFilter === 'Resolved / Approved' || statusFilter === 'Resolved Archive') {
        matchesStatus = isResolvedStatus(item.currentStatus);
      } else if (statusFilter !== 'All' && statusFilter !== 'All Records') {
        matchesStatus = item.currentStatus === statusFilter;
      }

      const matchesPriority = priorityFilter === 'All' || item.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSubmittedBy = submittedByFilter === 'All' || item.submittedBy === submittedByFilter;

      let matchesImpact = true;
      if (impactFilter === 'financial') {
        matchesImpact = (item.financialImpactEtb || 0) > 0;
      } else if (impactFilter === 'majorFinancial') {
        matchesImpact = (item.financialImpactEtb || 0) >= 5000000;
      } else if (impactFilter === 'eot') {
        matchesImpact = (item.timeImpactDays || 0) > 0;
      } else if (impactFilter === 'majorEot') {
        matchesImpact = (item.timeImpactDays || 0) >= 30;
      }

      let matchesAge = true;
      const daysPending = calculateDaysPending(item.submittedDate);
      if (ageFilter === 'overdue') {
        matchesAge = isOverduePending(item, pendingDaysThreshold);
      } else if (ageFilter === 'under15') {
        matchesAge = daysPending < 15;
      } else if (ageFilter === '15to30') {
        matchesAge = daysPending >= 15 && daysPending <= 30;
      } else if (ageFilter === 'over30') {
        matchesAge = daysPending > 30;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesSubmittedBy && matchesImpact && matchesAge;
    });

    return list.sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'currentStatus') {
        // Status-based risk severity sorting: Overdue -> Submitted -> In Progress -> Transferred -> Resolved -> Closed
        const getStatusRank = (item: IssueLogItem) => {
          if (isOverduePending(item, pendingDaysThreshold)) return 1;
          const s = (item.currentStatus || '').toLowerCase();
          if (s.includes('submitted')) return 2;
          if (s.includes('progress') || s.includes('evaluation')) return 3;
          if (s.includes('transferred') || s.includes('escalated')) return 4;
          if (s.includes('resolved') || s.includes('approved')) return 5;
          if (s.includes('rejected') || s.includes('closed')) return 6;
          return 7;
        };
        const rankA = getStatusRank(a);
        const rankB = getStatusRank(b);
        comparison = rankA - rankB;
        if (comparison === 0) {
          comparison = (a.currentStatus || '').localeCompare(b.currentStatus || '');
        }
      } else if (sortColumn === 'priority') {
        const priorityMap: Record<string, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
        const rankA = priorityMap[a.priority] || 5;
        const rankB = priorityMap[b.priority] || 5;
        comparison = rankA - rankB;
      } else if (sortColumn === 'submittedDate') {
        const dateA = new Date(a.submittedDate || 0).getTime();
        const dateB = new Date(b.submittedDate || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortColumn === 'createdDate') {
        const dateA = new Date(a.createdDate || a.submittedDate || 0).getTime();
        const dateB = new Date(b.createdDate || b.submittedDate || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortColumn === 'lastUpdated') {
        const dateA = new Date(a.lastUpdated || a.submittedDate || 0).getTime();
        const dateB = new Date(b.lastUpdated || b.submittedDate || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortColumn === 'requiredDaysContract') {
        const daysA = a.requiredDaysContract || 0;
        const daysB = b.requiredDaysContract || 0;
        comparison = daysA - daysB;
      } else if (sortColumn === 'financialImpactEtb') {
        const valA = a.financialImpactEtb || 0;
        const valB = b.financialImpactEtb || 0;
        comparison = valA - valB;
      } else if (sortColumn === 'timeImpactDays') {
        const valA = a.timeImpactDays || 0;
        const valB = b.timeImpactDays || 0;
        comparison = valA - valB;
      } else if (sortColumn === 'daysPending') {
        const daysA = calculateDaysPending(a.submittedDate);
        const daysB = calculateDaysPending(b.submittedDate);
        comparison = daysA - daysB;
      } else if (sortColumn === 'submittedBy') {
        comparison = (a.submittedBy || '').localeCompare(b.submittedBy || '');
      } else if (sortColumn === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortColumn === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [issuesList, searchQuery, statusFilter, priorityFilter, categoryFilter, submittedByFilter, impactFilter, ageFilter, sortColumn, sortDirection, pendingDaysThreshold]);

  const handleSortToggle = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection(col === 'title' || col === 'category' ? 'asc' : 'desc');
    }
  };

  const hasActiveColumnFilters = statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || submittedByFilter !== 'All' || impactFilter !== 'All' || ageFilter !== 'All' || searchQuery !== '';

  const handleResetFiltersAndSort = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
    setSubmittedByFilter('All');
    setImpactFilter('All');
    setAgeFilter('All');
    setSortColumn('submittedDate');
    setSortDirection('desc');
  };

  const renderSortableHeader = (
    label: string, 
    columnKey: typeof sortColumn, 
    className: string = ''
  ) => {
    const isSorted = sortColumn === columnKey;
    return (
      <th 
        onClick={() => handleSortToggle(columnKey)}
        className={`p-3 cursor-pointer select-none transition-colors hover:bg-slate-200/80 dark:hover:bg-slate-800/80 ${
          isSorted ? 'bg-blue-100/70 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : ''
        } ${className}`}
        title={`Click to sort by ${label} (${isSorted ? (sortDirection === 'asc' ? 'Ascending' : 'Descending') : 'Sort'})`}
      >
        <div className="flex items-center gap-1 font-extrabold uppercase tracking-wider text-[11px]">
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
          )}
        </div>
      </th>
    );
  };

  const activeIssuesCount = issuesList.filter(item => !isResolvedStatus(item.currentStatus)).length;
  const resolvedIssuesList = issuesList.filter(item => isResolvedStatus(item.currentStatus) || Boolean(item.lessonsLearned && item.lessonsLearned.trim().length > 0));
  const overduePendingCount = issuesList.filter(item => isOverduePending(item, pendingDaysThreshold)).length;

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'High': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    if (s.includes('Transferred') || s.includes('Escalated')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    if (s.includes('Resolved') || s.includes('Approved')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('Progress') || s.includes('Evaluation')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  };

  return (
    <div className="space-y-5">
      {/* Printable styles setup */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #one-page-issue-sheet, #one-page-issue-sheet * {
            visibility: visible;
          }
          #one-page-issue-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Overdue Pending Critical Warning Action Banner */}
      {overduePendingCount > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print border border-rose-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl animate-bounce shrink-0">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                ⚠️ Critical Action Alert: {overduePendingCount} Issue(s) Pending Beyond {pendingDaysThreshold}-Day Review Limit
              </h4>
              <p className="text-2xs text-rose-100 mt-0.5">
                Submitted issues exceeding {pendingDaysThreshold} calendar days without team resolution or transfer require immediate escalation to prevent extension-of-time (EOT) claims.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('Overdue Pending')}
            className="bg-white text-rose-700 hover:bg-rose-50 text-2xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer shrink-0"
          >
            View Overdue Issues ({overduePendingCount})
          </button>
        </div>
      )}

      {/* High / Critical Priority Admin Notification Flag Banner */}
      {urgentNotificationFlag && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 no-print border border-red-400/40 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-rose-600 rounded-xl font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded border border-white/30">
                  🚨 URGENT ADMIN NOTIFICATION FLAG ACTIVE
                </span>
                <span className="text-2xs font-mono font-bold text-rose-100">
                  [{urgentNotificationFlag.priority.toUpperCase()} PRIORITY]
                </span>
              </div>
              <p className="text-xs font-extrabold mt-0.5 text-white">
                New Issue Registered: {urgentNotificationFlag.issueCode} — "{urgentNotificationFlag.title}"
              </p>
              <p className="text-2xs text-rose-100">
                Project administrators have been alerted for immediate prompt escalation and evaluation.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUrgentNotificationFlag(null)}
            className="bg-white/20 hover:bg-white/30 text-white text-2xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer border border-white/30 shrink-0"
          >
            Dismiss Flag
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">
              Issue Log
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete contractual tracking sheet recording when the issue was submitted, the current progress stage reached, and team transfer handovers with recommended courses of action.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowArchiveModal(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Lessons Learned & Resolved Archive ({resolvedIssuesList.length})
          </button>
          <button
            onClick={() => setShowNewIssueModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log New Issue
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Issues Log</span>
          <span className="text-xl font-extrabold text-slate-800 dark:text-white font-mono mt-0.5 block">
            {activeIssuesCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Pending / Under Review</span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
            {issuesList.filter(i => isPendingStatus(i.currentStatus)).length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Overdue Pending ({pendingDaysThreshold}d+ Limit)</span>
          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
            {overduePendingCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">Resolved / Archived Records</span>
          <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
            {resolvedIssuesList.length}
          </span>
        </div>
      </div>

      {/* Structured Issue Log Master Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Structured Issue Log Table
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active project issues registry. Approved and resolved issues are archived for historical records & lessons learned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-teal-600" />
              Lessons Learned Repository ({resolvedIssuesList.length})
            </button>
            <button
              onClick={() => setShowNewIssueModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Issue
            </button>
          </div>
        </div>

        {/* Search, Column Filters & Status-Based Sorting Toolbar */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs">
          {/* Search Box & Quick Status Tabs */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues by title, code, category, party, or lesson learned..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { label: 'Active Issues', value: 'Active', count: activeIssuesCount },
                { label: 'Submitted', value: 'Submitted / Under Review' },
                { label: 'In Progress', value: 'In Progress / Evaluation' },
                { label: 'Transferred', value: 'Transferred / Escalated' },
                { label: 'Overdue', value: 'Overdue Pending', count: overduePendingCount },
                { label: 'Resolved Archive', value: 'Resolved / Approved', count: resolvedIssuesList.length },
                { label: 'All Records', value: 'All' }
              ].map((tab) => {
                const isActive = statusFilter === tab.value;
                const isOverdue = tab.value === 'Overdue Pending';
                const isResolved = tab.value === 'Resolved / Approved';

                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-2xs font-extrabold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? isOverdue
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : isResolved
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-blue-600 text-white shadow-2xs'
                        : isOverdue
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isResolved
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column-Based Filters & Risk Sorting Controls Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
            {/* Category Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-500" /> Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Priority Level
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">🔴 Critical</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🔵 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>

            {/* Submitted By / Party Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-purple-500" /> Originating Party
              </label>
              <select
                value={submittedByFilter}
                onChange={(e) => setSubmittedByFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
              >
                <option value="All">All Originators</option>
                {submittedByList.map(party => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>

            {/* Financial & Time Impact Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-rose-500" /> Impact Level
              </label>
              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">All Impact Levels</option>
                <option value="financial">💰 Financial Exposure (&gt;0 ETB)</option>
                <option value="majorFinancial">🚨 Major Cost (&gt;5M ETB)</option>
                <option value="eot">⏱ Has EOT Delay (&gt;0 Days)</option>
                <option value="majorEot">⏳ Major EOT (&gt;30 Days)</option>
              </select>
            </div>

            {/* Pending Age / Overdue Filter */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" /> Days Pending / Age
              </label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">All Pending Ages</option>
                <option value="overdue">⚠ Overdue Pending (&gt;={pendingDaysThreshold}d)</option>
                <option value="under15">⚡ &lt; 15 Days</option>
                <option value="15to30">📅 15 – 30 Days</option>
                <option value="over30">⏳ &gt; 30 Days</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-500" /> Sort Controls
              </label>
              <div className="flex items-center gap-1">
                <select
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value as any)}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="currentStatus">Status Risk Severity</option>
                  <option value="submittedDate">Date Submitted</option>
                  <option value="createdDate">Created Date (Audit Timestamp)</option>
                  <option value="lastUpdated">Last Updated (Audit Timestamp)</option>
                  <option value="priority">Priority Level</option>
                  <option value="financialImpactEtb">Financial Impact (ETB)</option>
                  <option value="timeImpactDays">EOT Delay Impact (Days)</option>
                  <option value="daysPending">Days Pending / Age</option>
                  <option value="requiredDaysContract">Required Contract Days</option>
                  <option value="submittedBy">Originating Party</option>
                  <option value="category">Category</option>
                  <option value="title">Issue Title</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
                  title={`Toggle Sort Direction (${sortDirection.toUpperCase()})`}
                >
                  {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Pill Bar & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Active Filters:
              </span>

              {statusFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              {categoryFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              {priorityFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800">
                  Priority: {priorityFilter}
                  <button onClick={() => setPriorityFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              {submittedByFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-200 dark:border-teal-800">
                  Originator: {submittedByFilter}
                  <button onClick={() => setSubmittedByFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              {impactFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-200 dark:border-rose-800">
                  Impact: {impactFilter}
                  <button onClick={() => setImpactFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              {ageFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">
                  Age: {ageFilter}
                  <button onClick={() => setAgeFilter('All')} className="hover:text-rose-600 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}

              <span className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                Sort: {sortColumn} ({sortDirection.toUpperCase()})
              </span>

              {hasActiveColumnFilters && (
                <button
                  onClick={handleResetFiltersAndSort}
                  className="ml-1 text-rose-600 dark:text-rose-400 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>

            <div className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Showing <span className="text-blue-600 dark:text-blue-400 font-extrabold">{filteredIssues.length}</span> of {issuesList.length} Risk Entries
            </div>
          </div>
        </div>

        {/* Structured Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                {renderSortableHeader('Date Submitted', 'submittedDate', 'w-32')}
                {renderSortableHeader('Required Days (Contract)', 'requiredDaysContract', 'w-28 text-center')}
                {renderSortableHeader('Issue Description & Category', 'title', 'min-w-[260px]')}
                {renderSortableHeader('Current Status (Risk)', 'currentStatus', 'w-40')}
                {renderSortableHeader('Action & Exposure', 'financialImpactEtb', 'min-w-[200px]')}
                {renderSortableHeader('Transferred To / Originator', 'submittedBy', 'w-40')}
                {renderSortableHeader('Dept Time Taken (Days)', 'daysPending', 'min-w-[240px]')}
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                    No matching issues found in the registry. Click "Add New Issue" above to create one.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((item) => {
                  const isSelected = item.id === selectedIssue?.id;
                  const overdue = isOverduePending(item, pendingDaysThreshold);
                  const daysPending = calculateDaysPending(item.submittedDate);
                  const lastTransfer = item.transfers.length > 0 ? item.transfers[item.transfers.length - 1] : null;
                  const actionRequired = item.currentBottleneck || item.latestProgressSummary || (lastTransfer ? lastTransfer.recommendedCourseOfAction : 'Pending review');
                  const transferredTo = lastTransfer ? lastTransfer.transferredTo : item.submittedTo || 'N/A';

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedIssueId(item.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 font-medium' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                      }`}
                    >
                      {/* Date Submitted & Audit Timestamps */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1" title={`Date Submitted: ${item.submittedDate}`}>
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {item.submittedDate}
                          </span>
                          {(item.createdDate || item.lastUpdated) && (
                            <div className="flex flex-col gap-0.5 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              {item.createdDate && (
                                <span className="flex items-center gap-1" title={`Audit Created Timestamp: ${item.createdDate}`}>
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span>Created: {item.createdDate.split(' ')[0]}</span>
                                </span>
                              )}
                              {item.lastUpdated && item.lastUpdated !== item.createdDate && (
                                <span className="flex items-center gap-1 text-blue-600/80 dark:text-blue-400/80" title={`Audit Last Updated Timestamp: ${item.lastUpdated}`}>
                                  <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                                  <span>Updated: {item.lastUpdated.split(' ')[0]}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {overdue && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded w-max border border-rose-300 dark:border-rose-800">
                              <AlertOctagon className="w-2.5 h-2.5" /> Overdue ({daysPending}d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Required Days (Contract) */}
                      <td className="p-3 align-top text-center">
                        <span className="font-mono font-extrabold text-[11px] text-slate-800 dark:text-zinc-200">
                          {item.requiredDaysContract ? `${item.requiredDaysContract}d` : 'N/A'}
                        </span>
                      </td>

                      {/* Issue Description */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {item.issueCode}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(item.priority)}`}>
                              {item.priority} Priority
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight">
                            {item.initialDescription}
                          </p>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(item.currentStatus)}`}>
                            {item.currentStatus}
                          </span>
                          {item.currentStage && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {item.currentStage}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action Required */}
                      <td className="p-3 align-top">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300">
                          <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Bottleneck / Action:</span>
                          <p className="line-clamp-2 leading-tight">
                            {actionRequired}
                          </p>
                        </div>
                      </td>

                      {/* Transferred To */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="line-clamp-2">{transferredTo}</span>
                          </div>
                          {item.transfers.length > 0 ? (
                            <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                              <History className="w-2.5 h-2.5" /> Transfer #{item.transfers.length}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic block">
                              Initial Submission
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department Time Taken */}
                      <td className="p-3 align-top">
                        {(() => {
                          const deptRecords = getDepartmentTimeRecords(item);
                          const totalDays = deptRecords.reduce((sum, r) => sum + r.daysTaken, 0);

                          return (
                            <div className="space-y-1.5 min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-1">
                                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                                  {deptRecords.length} Dept Stage{deptRecords.length > 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  Total: {totalDays}d
                                </span>
                              </div>

                              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {deptRecords.map((rec, rIdx) => (
                                  <div 
                                    key={rIdx}
                                    className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[10px] flex items-center justify-between gap-1.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[10.5px]">
                                        {rec.department}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono block">
                                        {rec.startDate} → {rec.endDate}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`font-mono font-black block text-[11px] ${
                                        rec.status === 'Active' 
                                          ? 'text-amber-600 dark:text-amber-400' 
                                          : rec.status === 'Resolved / Closed' 
                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                            : 'text-purple-600 dark:text-purple-400'
                                      }`}>
                                        {rec.daysTaken}d
                                      </span>
                                      <span className="text-[8px] font-extrabold uppercase tracking-wide text-slate-400">
                                        {rec.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 transition cursor-pointer border border-blue-200 dark:border-blue-800"
                            title="Log Status Change & User History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput(item.lessonsLearned || '');
                              setReviewNotesInput(item.reviewNotes || '');
                              setShowLessonsModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 transition cursor-pointer border border-teal-200 dark:border-teal-800"
                            title="Record / Review Lessons Learned"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setRetroTrackingIssueId(item.id);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 transition cursor-pointer border border-emerald-200 dark:border-emerald-800"
                            title="View Detailed Lifecycle Journey & History (Inception ➔ Lessons Learned)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowEditIssueModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 transition cursor-pointer"
                            title="Update Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowAddTransferModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-300 transition cursor-pointer"
                            title="Record Team Transfer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteIssue(item.id)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                              title="Delete Issue"
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

        {/* Action Toolbar Below Table (Export Only) */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV / Excel
            </button>
            <button
              onClick={() => selectedIssue && handleExportSingleIssuePdf(selectedIssue)}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              <Download className="w-4 h-4 text-rose-600" />
              Export PDF Dossier
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar selector & 1-Page Log Sheet */}
      <div className="hidden">
        
        {/* Left Column: Issue List & Multi-Filter Controls */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Project Issue Registry
            </span>
            <span className="text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {filteredIssues.length} Listed
            </span>
          </div>

          {/* Filtering Controls */}
          <div className="space-y-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, title, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Status Pills with Overdue Filter Badge */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Filter</span>
              <div className="flex items-center gap-1.5 text-2xs overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Submitted / Under Review', 'In Progress / Evaluation', 'Transferred / Escalated', 'Resolved / Approved', 'Overdue Pending'].map((st) => {
                  const isSelected = statusFilter === st;
                  const isOverdueTab = st === 'Overdue Pending';
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-1 rounded-lg whitespace-nowrap font-bold transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? isOverdueTab ? 'bg-rose-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
                          : isOverdueTab
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isOverdueTab && <AlertOctagon className="w-3 h-3 text-rose-500" />}
                      {st === 'All' ? 'All Statuses' : st === 'Overdue Pending' ? `Overdue (${overduePendingCount})` : st.split('/')[0].trim()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity / Priority & Category Filter Row */}
            <div className="grid grid-cols-2 gap-2 text-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority / Severity</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">🔴 Critical</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🔵 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pending SLA Threshold & Reset */}
            <div className="flex items-center justify-between text-2xs pt-1.5 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-bold">Pending Warning Limit:</span>
                <select
                  value={pendingDaysThreshold}
                  onChange={(e) => setPendingDaysThreshold(Number(e.target.value))}
                  className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 text-2xs outline-none cursor-pointer"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>

              {(statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setCategoryFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                No matching issues found for selected filter criteria.
              </div>
            ) : (
              filteredIssues.map((item) => {
                const isSelected = item.id === selectedIssue?.id;
                const overdue = isOverduePending(item, pendingDaysThreshold);
                const daysPending = calculateDaysPending(item.submittedDate);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIssueId(item.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? overdue
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-xs'
                          : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 shadow-xs'
                        : overdue
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/60 dark:border-rose-800/50 hover:bg-rose-100/60'
                          : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono font-extrabold text-blue-600 dark:text-blue-400">
                        {item.issueCode}
                      </span>
                      <div className="flex items-center gap-1">
                        {overdue && (
                          <span className="text-[9px] font-black text-white bg-rose-600 dark:bg-rose-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse shadow-2xs">
                            <AlertOctagon className="w-2.5 h-2.5" /> OVERDUE ({daysPending}d)
                          </span>
                        )}
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mt-1">
                      {item.title}
                    </h4>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span>{item.category}</span>
                      <span className="font-mono">{item.submittedDate}</span>
                    </div>

                    <div className="flex justify-between items-center mt-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClass(item.currentStatus)}`}>
                        {item.currentStatus}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.transfers.length > 0 && (
                          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <History className="w-2.5 h-2.5" /> {item.transfers.length} Transfers
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleIssuePdf(item);
                          }}
                          className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                          title="Export PDF Dossier"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Pristine ISSUE LOG SHEET */}
        <div className="lg:col-span-8">
          {selectedIssue ? (
            <div 
              id="one-page-issue-sheet" 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-md space-y-6 text-slate-800 dark:text-slate-100"
            >
              {/* Overdue Warning Callout Box for Inspected Issue */}
              {isOverduePending(selectedIssue, pendingDaysThreshold) && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500/80 p-4 rounded-xl flex items-start gap-3 shadow-xs no-print">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-800 dark:text-rose-200 tracking-wider">
                      🚨 ACTION REQUIRED: Issue Pending Resolution for {calculateDaysPending(selectedIssue.submittedDate)} Days (Exceeds {pendingDaysThreshold}-Day Limit)
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                      This issue was submitted on <strong>{selectedIssue.submittedDate}</strong> and remains un-resolved at stage <strong>"{selectedIssue.currentStage}"</strong>. Because it exceeds the designated {pendingDaysThreshold}-day resolution threshold, immediate team transfer handover or executive steering escalation is required.
                    </p>
                  </div>
                </div>
              )}

              {/* Official Sheet Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      ETHIOPIAN ROADS ADMINISTRATION • CONTRACTUAL & PROJECT ISSUE ESCALATION SHEET
                    </span>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
                      {selectedIssue.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <span><strong>Project:</strong> {project.name}</span>
                      <span>•</span>
                      <span><strong>Contract Type:</strong> {project.contractType}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-sm font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      {selectedIssue.issueCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs font-extrabold px-2 py-0.5 rounded border ${getPriorityBadgeClass(selectedIssue.priority)}`}>
                        {selectedIssue.priority} Priority
                      </span>
                      <span className={`text-2xs font-extrabold px-2 py-0.5 rounded border ${getStatusBadgeClass(selectedIssue.currentStatus)}`}>
                        {selectedIssue.currentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Single-Button Action Toolbar */}
                <div className="no-print pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setHistoryNewStatusInput(selectedIssue.currentStatus);
                        setShowHistoryModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      Log Status Change / Note
                    </button>

                    <button
                      onClick={() => {
                        setLessonsInput(selectedIssue.lessonsLearned || '');
                        setReviewNotesInput(selectedIssue.reviewNotes || '');
                        setShowLessonsModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Record Lessons Learned
                    </button>

                    <button
                      onClick={() => setShowAddTransferModal(true)}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Transfer Handover
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSingleIssuePdf(selectedIssue)}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-2xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Dossier
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-2xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Sheet
                    </button>
                  </div>
                </div>
              </div>

              {/* PART 1: ISSUE DETAILS WHEN SUBMITTED */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-blue-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    PART 1: Initial Issue Submission Record (When Submitted)
                  </h3>
                  <div className="no-print flex items-center gap-2">
                    <button
                      onClick={() => setShowEditIssueModal(true)}
                      className="text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Entry
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Date Submitted</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Created Timestamp</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      {selectedIssue.createdDate || selectedIssue.submittedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Updated</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-blue-500 shrink-0" />
                      {selectedIssue.lastUpdated || selectedIssue.submittedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Submitted By</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Submitted To</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedTo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Clause / Standard Ref</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedIssue.clauseReference || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/60 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Original Issue Statement & Description</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      {selectedIssue.initialDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Financial Exposure Submitted:</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatAccounting(selectedIssue.financialImpactEtb || 0, 'ETB')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Time Extension Exposure:</span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                        {selectedIssue.timeImpactDays ? `${selectedIssue.timeImpactDays} Calendar Days` : 'No EOT claimed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PART 2: WHERE THE ISSUE REACHED (CURRENT STATUS & STAGE) */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-emerald-600">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    PART 2: Current Status & Progress Stage (Where the Issue Reached)
                  </h3>
                </div>

                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 block">Current Reached Milestone Stage</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {selectedIssue.currentStage}
                      </span>
                    </div>
                    <span className={`self-start sm:self-auto text-2xs font-extrabold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(selectedIssue.currentStatus)}`}>
                      {selectedIssue.currentStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Latest Progress Summary & Evaluation Findings</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans font-medium">
                      {selectedIssue.latestProgressSummary}
                    </p>
                  </div>

                  {selectedIssue.currentBottleneck && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-800 dark:text-amber-300 block text-[10px] uppercase">Active Bottleneck / Pending Action Item</span>
                        <span className="text-amber-900 dark:text-amber-200 font-medium">{selectedIssue.currentBottleneck}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PART 3: TEAM TRANSFER RECORD & COURSE OF ACTION HISTORY */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-purple-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    PART 3: Team Transfer & Handover Trail (Previous Team Action & Next Course)
                  </h3>
                </div>

                {selectedIssue.transfers.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No team transfers recorded yet. The issue is currently managed by the initial receiving team ({selectedIssue.submittedTo}).
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-purple-200 dark:before:bg-purple-900/60 before:z-0">
                    {selectedIssue.transfers.map((tr, index) => (
                      <div 
                        key={tr.id || index} 
                        className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xs space-y-2 ml-7"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                          {index + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 flex-wrap">
                            <span className="text-slate-500 font-normal">From:</span>
                            <span className="text-slate-900 dark:text-white font-extrabold">{tr.transferredFrom}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-slate-500 font-normal">To:</span>
                            <span className="text-purple-700 dark:text-purple-300 font-extrabold">{tr.transferredTo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const deptRecords = getDepartmentTimeRecords(selectedIssue);
                              const stepRec = deptRecords[index];
                              if (!stepRec) return null;
                              return (
                                <span className="text-[10px] font-mono font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                                  Time in Dept: {stepRec.daysTaken}d ({stepRec.startDate} → {stepRec.endDate})
                                </span>
                              );
                            })()}
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                              Transfer Date: {tr.transferDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Trigger / Reason for Transfer</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-normal">{tr.transferReason}</p>
                          </div>
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Action Taken by Previous Team</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-normal">{tr.actionTakenByPreviousTeam}</p>
                          </div>
                        </div>

                        <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40 text-xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 block flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 text-purple-600" /> Next Course of Action Recommended
                          </span>
                          <p className="text-purple-950 dark:text-purple-100 font-semibold leading-relaxed">
                            {tr.recommendedCourseOfAction}
                          </p>
                          {tr.transferredBy && (
                            <span className="text-[10px] text-purple-500 dark:text-purple-400 block pt-1 font-mono text-right">
                              Transferred By: {tr.transferredBy}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PART 4: STATUS HISTORY & USER TRACKER AUDIT TRAIL */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-blue-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    PART 4: Status History & User Tracker Audit Trail
                  </h3>
                  <button
                    onClick={() => {
                      setHistoryNewStatusInput(selectedIssue.currentStatus);
                      setShowHistoryModal(true);
                    }}
                    className="no-print text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Log Status Update / Change Note
                  </button>
                </div>

                {(!selectedIssue.history || selectedIssue.history.length === 0) ? (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No status updates logged yet. Initial submission recorded on {selectedIssue.submittedDate} by {selectedIssue.submittedBy}.
                  </div>
                ) : (
                  <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900/60 before:z-0">
                    {selectedIssue.history.map((hist, hIdx) => (
                      <div
                        key={hist.id || hIdx}
                        className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xs text-xs space-y-1.5 ml-7"
                      >
                        <div className="absolute -left-[31px] top-3.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                          {selectedIssue.history.length - hIdx}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              <UserIcon className="w-3 h-3 text-blue-600" />
                              {hist.user}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {hist.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                              {hist.changeType || 'Status Change'}
                            </span>
                            {hist.previousStatus !== hist.newStatus && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {hist.previousStatus} → {hist.newStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                          {hist.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PART 5: LESSONS LEARNED & RETROSPECTIVE REVIEW */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    PART 5: Lessons Learned & Retrospective Review
                  </h3>
                  <div className="flex items-center gap-2">
                    {effectiveIsAdmin && selectedIssue.lessonsLearned && (
                      <button
                        onClick={() => handleDeleteLessonsLearned(selectedIssue.id)}
                        className="no-print text-2xs font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 cursor-pointer transition hover:bg-rose-100 dark:hover:bg-rose-900/60"
                        title="Delete this lesson learned entry (Admin Only)"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Delete Lesson
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRetroTrackingIssueId(selectedIssue.id)}
                      className="no-print text-2xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 cursor-pointer transition hover:bg-teal-100 dark:hover:bg-teal-900/80"
                      title="View detailed lifecycle history and track issue through until lesson learned"
                    >
                      <History className="w-3 h-3 text-teal-600 dark:text-teal-400" /> View Detailed History & Journey
                    </button>
                    <button
                      onClick={() => openLessonsLearnedModal(selectedIssue)}
                      className="no-print text-2xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 cursor-pointer transition hover:bg-teal-100 dark:hover:bg-teal-900/80"
                    >
                      <PenTool className="w-3 h-3" /> Record / Edit Lessons Learned & Resolution Dossier
                    </button>
                  </div>
                </div>

                {/* Resolution & Turnaround Duration Bar */}
                {(() => {
                  const info = getIssueTurnaroundInfo(selectedIssue);
                  return (
                    <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-teal-50/40 dark:from-teal-950/30 dark:via-slate-900/40 dark:to-teal-950/20 p-3 rounded-xl border border-teal-200/80 dark:border-teal-800/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-teal-600 text-white rounded-lg shadow-xs shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-black tracking-wider text-teal-800 dark:text-teal-300">
                            {info.isResolved ? 'Total Issue Lifecycle Turnaround' : 'Active Duration (Open / In-Progress)'}
                          </div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-teal-700 dark:text-teal-300">{info.turnaroundDays} Calendar Days</span>
                            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              ({info.isResolved ? `Submitted: ${selectedIssue.submittedDate || 'N/A'} → Determined / Closed: ${info.resolvedDate || 'N/A'}` : `Submitted on: ${selectedIssue.submittedDate || 'N/A'}`})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-2xs font-extrabold border ${
                          selectedIssue.currentStatus === 'Resolved / Approved'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : selectedIssue.currentStatus === 'Rejected / Closed'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}>
                          {selectedIssue.currentStatus}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {selectedIssue.lessonsLearned ? (
                  <div className="bg-gradient-to-br from-teal-50/60 to-emerald-50/40 dark:from-teal-950/30 dark:to-emerald-950/20 p-4 rounded-xl border border-teal-200/80 dark:border-teal-800/50 space-y-3">
                    <div className="flex flex-wrap justify-between items-center border-b border-teal-200/60 dark:border-teal-800/40 pb-2 gap-2">
                      <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 text-xs font-black uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        Key Lesson & Strategic Risk Prevention Takeaway
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedIssue.lessonsLearnedUpdatedBy && (
                          <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                            Logged By: {selectedIssue.lessonsLearnedUpdatedBy} {selectedIssue.lessonsLearnedUpdatedAt ? `(${selectedIssue.lessonsLearnedUpdatedAt})` : ''}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setRetroTrackingIssueId(selectedIssue.id)}
                          className="no-print text-2xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer bg-white/80 dark:bg-slate-900/70 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 transition hover:bg-white dark:hover:bg-slate-900"
                          title="Track this issue through until it became part of lesson learned"
                        >
                          <History className="w-3 h-3 text-teal-600" /> View Detailed Journey ➜
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans font-medium italic bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-teal-100 dark:border-teal-900/40">
                      "{selectedIssue.lessonsLearned}"
                    </p>

                    {/* Display Resolution Steps Record if present */}
                    {selectedIssue.resolutionSteps && selectedIssue.resolutionSteps.length > 0 && (
                      <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/40 space-y-2">
                        <div className="flex items-center justify-between text-2xs font-bold uppercase text-teal-900 dark:text-teal-300">
                          <span className="flex items-center gap-1">
                            <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                            Codified Steps Taken Until Resolved ({selectedIssue.resolutionSteps.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {selectedIssue.resolutionSteps.map((st, sIdx) => (
                            <div key={st.id || `st-${sIdx}`} className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/40 text-2xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded text-[10px]">
                                    Step {st.stepNumber || sIdx + 1}
                                  </span>
                                  <span className="text-slate-500 font-mono">{st.date}</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <UserIcon className="w-2.5 h-2.5 text-teal-600" />
                                    {st.performedBy}
                                  </span>
                                </div>
                                <span className="font-bold text-[10px] text-teal-800 dark:text-teal-300">
                                  {st.statusAtStep}
                                </span>
                              </div>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {st.actionTaken}
                              </div>
                              {st.notes && (
                                <p className="text-slate-500 dark:text-slate-400 italic">
                                  {st.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback steps text if present */}
                    {(!selectedIssue.resolutionSteps || selectedIssue.resolutionSteps.length === 0) && selectedIssue.stepsTakenUntilResolved && (
                      <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/40 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300 flex items-center gap-1">
                          <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                          Steps Taken Until Resolved
                        </span>
                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/40 text-2xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                          {selectedIssue.stepsTakenUntilResolved}
                        </div>
                      </div>
                    )}

                    {selectedIssue.reviewNotes && (
                      <div className="pt-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                          Additional Case Review Notes & Recommendations
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-normal">
                          {selectedIssue.reviewNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-dashed border-teal-300 dark:border-teal-800/60 text-center space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No explicit lesson learned recorded for this issue yet. Recording lessons learned allows future project managers to review resolved challenges and avoid repeating contractual or technical errors.
                    </p>
                    <button
                      onClick={() => openLessonsLearnedModal(selectedIssue)}
                      className="no-print inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Record Lessons Learned Now
                    </button>
                  </div>
                )}
              </div>

              {/* Sheet Footer Signatures */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4 text-center text-xs text-slate-500 dark:text-slate-400">
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Submitted / Verified By</span>
                  <span className="text-[10px]">Resident Engineer / Representative</span>
                </div>
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Transfer Handover By</span>
                  <span className="text-[10px]">Previous Team Lead</span>
                </div>
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Received & Endorsed By</span>
                  <span className="text-[10px]">ERA Directorate / Steering Committee</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 rounded-2xl text-center text-slate-400">
              Select or create an issue to view its 1-Page Log Sheet.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW ISSUE ENTRY */}
      <AnimatePresence>
        {showNewIssueModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Plus className="w-5 h-5 text-blue-500" /> Log New Contractual / Project Issue
                </h3>
                <button
                  onClick={() => setShowNewIssueModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Automatic Timestamp & User Tracker Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-extrabold text-blue-900 dark:text-blue-200 block">Automatic Timestamp Tracking</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300">
                      Captured Time: <strong className="font-mono font-bold">{new Date().toISOString().replace('T', ' ').substring(0, 16)}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">System Logger</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-blue-600" /> {currentUsername}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Issue Reference Code <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={newIssue.issueCode}
                      onChange={(e) => setNewIssue({ ...newIssue, issueCode: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Category</label>
                    <select
                      value={newIssue.category}
                      onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    >
                      <option value="Contractual Claim">Contractual Claim</option>
                      <option value="Right of Way (ROW)">Right of Way (ROW)</option>
                      <option value="Design Revision">Design Revision</option>
                      <option value="Financial/Payment">Financial/Payment</option>
                      <option value="EOT Request">EOT Request</option>
                      <option value="Technical/Quality">Technical/Quality</option>
                      <option value="Safety/Environmental">Safety/Environmental</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Issue Title / Subject <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Brief descriptive title..."
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Date Submitted</label>
                    <input
                      type="date"
                      value={newIssue.submittedDate}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Reporter / Submitted By <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Name or role of reporter..."
                      value={newIssue.submittedBy || currentUsername}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Submitted To</label>
                    <input
                      type="text"
                      value={newIssue.submittedTo}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedTo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Contract / Clause Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. FIDIC 8.4"
                      value={newIssue.clauseReference}
                      onChange={(e) => setNewIssue({ ...newIssue, clauseReference: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Required Days (Contract)</label>
                    <input
                      type="number"
                      placeholder="e.g. 14"
                      value={newIssue.requiredDaysContract || ''}
                      onChange={(e) => setNewIssue({ ...newIssue, requiredDaysContract: parseInt(e.target.value) || undefined })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Financial Exposure</label>
                    <input
                      type="number"
                      value={newIssue.financialImpactEtb}
                      onChange={(e) => setNewIssue({ ...newIssue, financialImpactEtb: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Time Exposure (Days)</label>
                    <input
                      type="number"
                      value={newIssue.timeImpactDays}
                      onChange={(e) => setNewIssue({ ...newIssue, timeImpactDays: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Issue Description / Original Problem Statement <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide a detailed description of the issue, site conditions, contract impact, or cause when submitted..."
                    value={newIssue.initialDescription}
                    onChange={(e) => setNewIssue({ ...newIssue, initialDescription: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Priority Level <span className="text-rose-500">*</span></label>
                    <select
                      value={newIssue.priority}
                      onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Current Milestone Stage</label>
                    <input
                      type="text"
                      value={newIssue.currentStage}
                      onChange={(e) => setNewIssue({ ...newIssue, currentStage: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-900 dark:text-blue-200">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    <strong>Automatic Audit Logging:</strong> <code>Created Date</code> and <code>Last Updated</code> timestamps will be automatically captured and maintained without requiring manual data entry.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowNewIssueModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Create Issue Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECORD TEAM TRANSFER */}
      <AnimatePresence>
        {showAddTransferModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <History className="w-5 h-5" /> Record Team Transfer / Escalation Handover
                </h3>
                <button
                  onClick={() => setShowAddTransferModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 text-xs space-y-1">
                <span className="font-bold text-purple-900 dark:text-purple-200 block">Issue: {selectedIssue.issueCode}</span>
                <span className="text-purple-700 dark:text-purple-300 truncate block">{selectedIssue.title}</span>
                {(() => {
                  const lastTr = selectedIssue.transfers && selectedIssue.transfers.length > 0
                    ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
                    : null;
                  const prevStartDate = lastTr ? lastTr.transferDate : selectedIssue.submittedDate;
                  const prevDept = lastTr ? lastTr.transferredTo : (selectedIssue.submittedTo || 'Initial Reviewer');

                  const start = new Date(prevStartDate);
                  const end = new Date(newTransfer.transferDate || new Date());
                  const diffDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div className="pt-1.5 border-t border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-purple-800 dark:text-purple-300 font-medium">
                        Handling time in current team (<strong className="font-bold">{prevDept}</strong>):
                      </span>
                      <span className="font-mono font-extrabold text-purple-900 dark:text-purple-100 bg-purple-100 dark:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-700">
                        {diffDays} Calendar Days ({prevStartDate} → {newTransfer.transferDate || 'Today'})
                      </span>
                    </div>
                  );
                })()}
              </div>

              <form onSubmit={handleAddTransfer} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Transfer Date</label>
                    <input
                      type="date"
                      required
                      value={newTransfer.transferDate}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Transferred By (Officer)</label>
                    <input
                      type="text"
                      placeholder="e.g. Eng. Solomon Tadesse"
                      value={newTransfer.transferredBy}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Transferred From (Previous Team)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Resident Engineer Site Team"
                      value={newTransfer.transferredFrom}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredFrom: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Transferred To (Next Authority)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ERA Steering Committee"
                      value={newTransfer.transferredTo}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredTo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Reason / Trigger for Transfer</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Exceeded delegated financial approval limit..."
                    value={newTransfer.transferReason}
                    onChange={(e) => setNewTransfer({ ...newTransfer, transferReason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Action Taken by Previous Team Prior to Handover</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Details of verification, impact calculations, or site visits completed before transfer..."
                    value={newTransfer.actionTakenByPreviousTeam}
                    onChange={(e) => setNewTransfer({ ...newTransfer, actionTakenByPreviousTeam: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Recommended Next Course of Action</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Clear recommended decision, authorization, or legal step for the receiving team..."
                    value={newTransfer.recommendedCourseOfAction}
                    onChange={(e) => setNewTransfer({ ...newTransfer, recommendedCourseOfAction: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAddTransferModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Record & Hand Over
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDIT ISSUE STATUS / STAGE */}
      <AnimatePresence>
        {showEditIssueModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Edit2 className="w-5 h-5 text-blue-500" /> Update Current Issue Status & Progress
                </h3>
                <button
                  onClick={() => setShowEditIssueModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateIssueDetails} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Current Status</label>
                    <select
                      value={selectedIssue.currentStatus}
                      onChange={(e) => {
                        const newSt = e.target.value as any;
                        const isResolved = newSt === 'Resolved / Approved' || newSt === 'Rejected / Closed';
                        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
                        const resDate = isResolved ? (selectedIssue.resolvedDate || nowStr.split(' ')[0]) : undefined;
                        const tDays = isResolved ? (selectedIssue.turnaroundDays ?? calculateTurnaroundDays(selectedIssue.submittedDate, resDate)) : undefined;

                        const historyRecord: IssueHistoryRecord = {
                          id: `hist-${Date.now()}`,
                          timestamp: nowStr,
                          user: currentUsername,
                          previousStatus: selectedIssue.currentStatus,
                          newStatus: newSt,
                          stage: selectedIssue.currentStage,
                          changeType: 'Status Change',
                          notes: `Issue status transitioned from "${selectedIssue.currentStatus}" to "${newSt}" by ${currentUsername}.`
                        };

                        const updated = issuesList.map(item => item.id === selectedIssue.id ? { 
                          ...item, 
                          currentStatus: newSt,
                          resolvedDate: resDate,
                          turnaroundDays: tDays,
                          lastUpdated: nowStr,
                          history: [historyRecord, ...(item.history || [])]
                        } : item);
                        saveIssues(updated, `Status updated to ${newSt}`);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    >
                      <option value="Submitted / Under Review">Submitted / Under Review</option>
                      <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                      <option value="Transferred / Escalated">Transferred / Escalated</option>
                      <option value="Resolved / Approved">Resolved / Approved</option>
                      <option value="Rejected / Closed">Rejected / Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Current Milestone Stage Name</label>
                    <input
                      type="text"
                      value={selectedIssue.currentStage}
                      onChange={(e) => {
                        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
                        const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, currentStage: e.target.value, lastUpdated: nowStr } : item);
                        saveIssues(updated, 'Stage updated');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Latest Progress Summary (Where the issue reached)</label>
                  <textarea
                    rows={3}
                    value={selectedIssue.latestProgressSummary}
                    onChange={(e) => {
                      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
                      const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, latestProgressSummary: e.target.value, lastUpdated: nowStr } : item);
                      saveIssues(updated, 'Summary updated');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Active Bottleneck / Blockers</label>
                  <input
                    type="text"
                    value={selectedIssue.currentBottleneck || ''}
                    onChange={(e) => {
                      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
                      const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, currentBottleneck: e.target.value, lastUpdated: nowStr } : item);
                      saveIssues(updated, 'Bottleneck updated');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowEditIssueModal(false)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Done
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: RECORD / EDIT LESSONS LEARNED & RESOLUTION DOSSIER */}
      <AnimatePresence>
        {showLessonsModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Record Institutional Lessons Learned & Resolution Dossier
                    </h3>
                    <p className="text-2xs text-slate-500 dark:text-slate-400">
                      Record all steps taken until resolved, all change dates, authors, and issue status for {selectedIssue.issueCode}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLessonsModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  ✕
                </button>
              </div>

              {/* Context Strip with Status Selector */}
              {(() => {
                const info = getIssueTurnaroundInfo(selectedIssue);
                const compiledData = compileResolutionJourneyData(selectedIssue);
                return (
                  <div className="px-6 py-3 bg-gradient-to-r from-teal-50/80 via-slate-50 to-emerald-50/60 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-emerald-950/30 border-b border-teal-200/60 dark:border-teal-900/40 text-xs shrink-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-teal-950 dark:text-teal-200 text-sm">
                            {selectedIssue.issueCode}
                          </span>
                          <span className="text-2xs font-mono bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                            {selectedIssue.clauseReference || 'General Conditions'}
                          </span>
                        </div>
                        <div className="font-medium text-slate-700 dark:text-slate-300 text-xs truncate max-w-xl">
                          {selectedIssue.title}
                        </div>
                      </div>

                      {/* Status Selector in Modal Context */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                            Issue Status:
                          </label>
                          <select
                            value={resolutionStatusInput}
                            onChange={(e) => setResolutionStatusInput(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg px-2.5 py-1 text-xs font-bold text-teal-900 dark:text-teal-200 focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
                          >
                            <option value="Resolved / Approved">Resolved / Approved</option>
                            <option value="Rejected / Closed">Rejected / Closed</option>
                            <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                            <option value="Transferred / Escalated">Transferred / Escalated</option>
                            <option value="Submitted / Under Review">Submitted / Under Review</option>
                          </select>
                        </div>

                        <div className="text-right pl-3 border-l border-teal-200 dark:border-teal-800">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                            Turnaround Duration:
                          </span>
                          <span className="font-extrabold text-teal-800 dark:text-teal-300 text-xs">
                            {info.turnaroundDays} Calendar Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-600 dark:text-slate-400 pt-1.5 border-t border-teal-200/50 dark:border-teal-900/30">
                      <span>Submitted: <strong>{selectedIssue.submittedDate || 'N/A'}</strong> by <strong>{selectedIssue.submittedBy}</strong></span>
                      <span>Resolved Date: <strong>{selectedIssue.resolvedDate || (resolutionStatusInput === 'Resolved / Approved' || resolutionStatusInput === 'Rejected / Closed' ? 'Recorded upon save' : 'In Progress')}</strong></span>
                      <span>Dossier Recorded By: <strong className="text-teal-700 dark:text-teal-300">{currentUsername}</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Tabs */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-6 bg-slate-50 dark:bg-slate-900/50 shrink-0 text-xs gap-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setLessonsModalTab('steps')}
                  className={`py-3 border-b-2 font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    lessonsModalTab === 'steps'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>1. Steps Taken Until Resolved ({resolutionStepsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLessonsModalTab('changes')}
                  className={`py-3 border-b-2 font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    lessonsModalTab === 'changes'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>2. All Column Changes & Handovers ({compileResolutionJourneyData(selectedIssue).changesLog.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLessonsModalTab('departments')}
                  className={`py-3 border-b-2 font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    lessonsModalTab === 'departments'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>3. Department Time Analysis ({compileResolutionJourneyData(selectedIssue).departmentTimeBreakdown.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLessonsModalTab('lesson')}
                  className={`py-3 border-b-2 font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    lessonsModalTab === 'lesson'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>4. Key Lesson Learned & Takeaways</span>
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <form onSubmit={handleSaveLessonsLearned} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
                  
                  {/* TAB 1: STEPS TAKEN UNTIL RESOLVED */}
                  {lessonsModalTab === 'steps' && (
                    <div className="space-y-4">
                      {/* Action Tools Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200/80 dark:border-teal-800/50">
                        <div>
                          <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                            <ListOrdered className="w-4 h-4 text-teal-600" />
                            <span>Detailed Steps Taken Until Resolved</span>
                          </div>
                          <p className="text-2xs text-teal-700 dark:text-teal-300">
                            Document each technical inspection, contractor submission, site testing, and department handover step executed until resolution.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const compiled = compileResolutionJourneyData(selectedIssue);
                              setResolutionStepsList(compiled.steps);
                              setStepsTakenInput(compiled.stepsText);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-2xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                            title="Auto-extract and sync steps from submission, department handovers, and status history logs"
                          >
                            <Zap className="w-3.5 h-3.5" /> Auto-Compile Steps from History
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddStepForm(!showAddStepForm)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-2xs flex items-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-teal-600" /> {showAddStepForm ? 'Close Step Form' : 'Add Manual Step'}
                          </button>
                        </div>
                      </div>

                      {/* Add Manual Step Inline Form */}
                      {showAddStepForm && (
                        <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-teal-300 dark:border-teal-700 space-y-3">
                          <div className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5 text-teal-600" /> Insert Step {resolutionStepsList.length + 1}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Step Date</label>
                              <input
                                type="date"
                                value={newStepDate}
                                onChange={(e) => setNewStepDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Action Performed By</label>
                              <input
                                type="text"
                                placeholder="Engineer / Committee"
                                value={newStepPerformedBy}
                                onChange={(e) => setNewStepPerformedBy(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Issue Category</label>
                              <input
                                type="text"
                                placeholder="e.g. Contractual Claim"
                                value={newStepCategory}
                                onChange={(e) => setNewStepCategory(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Issue Status at Step</label>
                              <select
                                value={newStepStatus}
                                onChange={(e) => setNewStepStatus(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold"
                              >
                                <option value="Submitted / Under Review">Submitted / Under Review</option>
                                <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                                <option value="Transferred / Escalated">Transferred / Escalated</option>
                                <option value="Resolved / Approved">Resolved / Approved</option>
                                <option value="Rejected / Closed">Rejected / Closed</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Department / Authority</label>
                              <input
                                type="text"
                                placeholder="e.g. Design Review Directorate"
                                value={newStepDepartment}
                                onChange={(e) => setNewStepDepartment(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Dept Time Taken Before Transfer (Days)</label>
                              <input
                                type="number"
                                placeholder="Auto-calculated if blank"
                                value={newStepDeptTime}
                                onChange={(e) => setNewStepDeptTime(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1 text-[11px]">Overall Time Taken for Issue (Days)</label>
                              <input
                                type="number"
                                placeholder="Auto-calculated if blank"
                                value={newStepOverallTime}
                                onChange={(e) => setNewStepOverallTime(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="font-bold block mb-1 text-[11px]">Changed Columns Detail</label>
                            <input
                              type="text"
                              placeholder="e.g. Current Status, Issue Category, Department Time Taken (Days)"
                              value={newStepChangedColumns}
                              onChange={(e) => setNewStepChangedColumns(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="font-bold block mb-1 text-[11px]">Action Taken / Intervention <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              placeholder="e.g. Conducted joint quarry inspection and confirmed aggregate grading curve..."
                              value={newStepAction}
                              onChange={(e) => setNewStepAction(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
                            />
                          </div>

                          <div>
                            <label className="font-bold block mb-1 text-[11px]">Technical Notes / Interventions</label>
                            <textarea
                              rows={2}
                              placeholder="Key test figures, agreement notes, or contractor undertakings..."
                              value={newStepNotes}
                              onChange={(e) => setNewStepNotes(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-sans"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddStepForm(false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddResolutionStep}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Insert Step
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Structured Steps Sequence */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-2xs font-bold uppercase text-slate-500 dark:text-slate-400">
                          <span>Recorded Resolution Steps ({resolutionStepsList.length})</span>
                          <span>Chronological Sequence</span>
                        </div>

                        {resolutionStepsList.length > 0 ? (
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {resolutionStepsList.map((step, sIdx) => (
                              <div
                                key={step.id || `step-${sIdx}`}
                                className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-2 relative group hover:border-teal-400 dark:hover:border-teal-700 transition"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-extrabold text-[10px] font-mono">
                                      Step {step.stepNumber || sIdx + 1}
                                    </span>
                                    <span className="font-mono text-2xs text-slate-500 dark:text-slate-400">
                                      {step.date}
                                    </span>
                                    <span className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                      <UserIcon className="w-3 h-3 text-teal-600" />
                                      {step.performedBy}
                                    </span>
                                    {step.category && (
                                      <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                        📁 {step.category}
                                      </span>
                                    )}
                                    {step.department && (
                                      <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                        🏢 {step.department}{step.transferredTo ? ` ➔ ${step.transferredTo}` : ''}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      step.statusAtStep === 'Resolved / Approved'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                        : step.statusAtStep === 'Rejected / Closed'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                    }`}>
                                      {step.statusAtStep}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveResolutionStep(step.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"
                                      title="Remove this step"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                  {step.actionTaken}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                                  {step.departmentTimeTakenDays !== undefined && (
                                    <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800 font-bold">
                                      ⏱️ Dept Time: {step.departmentTimeTakenDays} Days before transfer/change
                                    </span>
                                  )}
                                  {step.overallTimeTakenDays !== undefined && (
                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 font-bold">
                                      🏁 Overall Time: {step.overallTimeTakenDays} Days
                                    </span>
                                  )}
                                </div>

                                {step.changedColumns && step.changedColumns.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 text-[9px]">
                                    <span className="font-bold text-slate-400 uppercase">Changed Columns:</span>
                                    {step.changedColumns.map((col, cIdx) => (
                                      <span key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                                        {col}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {step.notes && (
                                  <p className="text-2xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 font-sans">
                                    {step.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              No resolution steps recorded yet.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const compiled = compileResolutionJourneyData(selectedIssue);
                                setResolutionStepsList(compiled.steps);
                                setStepsTakenInput(compiled.stepsText);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-2xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" /> Auto-Compile Steps from Issue History
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Detailed Narrative Textarea */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="font-bold block text-slate-800 dark:text-slate-200 text-xs">
                            Complete Chronological Narrative of Steps Taken (Editable Full Record)
                          </label>
                          <span className="text-2xs text-slate-400">Preserved in issue dossier</span>
                        </div>
                        <textarea
                          rows={5}
                          placeholder="Detailed chronological sequence of steps taken until this issue was resolved..."
                          value={stepsTakenInput}
                          onChange={(e) => setStepsTakenInput(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 font-mono text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AUDIT TRAIL OF ALL COLUMN CHANGES & HANDOVERS */}
                  {lessonsModalTab === 'changes' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/50">
                        <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-blue-600" />
                          <span>Audit Trail of All Column Changes, Issue Category, Handovers & Time Taken Metrics</span>
                        </div>
                        <p className="text-2xs text-blue-700 dark:text-blue-300">
                          Records all changes occurred on the issue until resolved or closed: column changes, category transitions, change/transfer dates, department time taken before transfer, and overall issue time.
                        </p>
                      </div>

                      {/* Chronological Changes List */}
                      {(() => {
                        const compiled = compileResolutionJourneyData(selectedIssue);
                        const changes = compiled.changesLog;
                        return (
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {changes.map((ev, idx) => (
                              <div
                                key={ev.id || `change-${idx}`}
                                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition"
                              >
                                {/* Change Event Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-2xs font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      📅 {ev.timestamp}
                                    </span>
                                    <span className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                      <UserIcon className="w-3 h-3 text-blue-600" />
                                      {ev.who}
                                    </span>
                                    <span className="text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                      📁 Category: {ev.category}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Status:</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      ev.status === 'Resolved / Approved'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                        : ev.status === 'Rejected / Closed'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                        : ev.status === 'Transferred / Escalated'
                                        ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                        : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                    }`}>
                                      {ev.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Main Action & Handover */}
                                <div className="space-y-1">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                    {ev.action}
                                  </div>
                                  {ev.department && (
                                    <div className="text-2xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                      <span>🏢 Department / Holding Authority:</span>
                                      <span className="bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                        {ev.department}{ev.transferredTo ? ` ➔ Transferred to [${ev.transferredTo}]` : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Key Time Metrics & Changed Columns */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-2xs font-mono">
                                  <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                                    <span><strong>Dept Time Before Transfer/Change:</strong> {ev.departmentTimeTakenDays} Calendar Days</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span><strong>Overall Time Taken for Issue:</strong> {ev.overallTimeTakenDays} Calendar Days</span>
                                  </div>
                                </div>

                                {/* Changed Columns Tags */}
                                {ev.changedColumns && ev.changedColumns.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                                      Columns Changed at this Event ({ev.changedColumns.length}):
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {ev.changedColumns.map((col, cIdx) => (
                                        <span key={cIdx} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[10px]">
                                          ✓ {col}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Column Snapshot Grid */}
                                {ev.columnSnapshots && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                      Column Snapshot Record:
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono bg-slate-100/70 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                      <div><span className="text-slate-400 block">Category:</span><strong>{ev.columnSnapshots.issueCategory}</strong></div>
                                      <div><span className="text-slate-400 block">Status:</span><strong>{ev.columnSnapshots.currentStatus}</strong></div>
                                      <div><span className="text-slate-400 block">Dept Time:</span><strong>{ev.columnSnapshots.deptTimeTakenDays} Days</strong></div>
                                      <div><span className="text-slate-400 block">Overall Time:</span><strong>{ev.columnSnapshots.overallTimeTakenDays} Days</strong></div>
                                      <div><span className="text-slate-400 block">Dept Handover:</span><strong className="truncate block">{ev.columnSnapshots.departmentAndHandover}</strong></div>
                                      <div><span className="text-slate-400 block">Financial:</span><strong>Br. {(ev.columnSnapshots.financialExposureEtb || 0).toLocaleString()}</strong></div>
                                      <div><span className="text-slate-400 block">Time Impact:</span><strong>{ev.columnSnapshots.timeImpactDays || 0} Days</strong></div>
                                      <div><span className="text-slate-400 block">Clause Ref:</span><strong>{ev.columnSnapshots.clauseReference || 'N/A'}</strong></div>
                                    </div>
                                  </div>
                                )}

                                {ev.notes && (
                                  <p className="text-2xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {ev.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 3: DEPARTMENT TIME ANALYSIS & HANDOVER BREAKDOWN */}
                  {lessonsModalTab === 'departments' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-800/50">
                        <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span>Department Time Taken & Authority Handover Audit</span>
                        </div>
                        <p className="text-2xs text-purple-700 dark:text-purple-300">
                          Tracks the exact calendar days spent by each department or reviewing team before transfer or resolution.
                        </p>
                      </div>

                      {(() => {
                        const depts = compileResolutionJourneyData(selectedIssue).departmentTimeBreakdown;
                        const totalDays = getIssueTurnaroundInfo(selectedIssue).turnaroundDays;
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-800 text-center">
                                <span className="text-[10px] text-slate-400 uppercase block font-bold">Overall Issue Duration</span>
                                <span className="font-black text-purple-700 dark:text-purple-300 text-sm">{totalDays} Calendar Days</span>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-800 text-center">
                                <span className="text-[10px] text-slate-400 uppercase block font-bold">Departments Involved</span>
                                <span className="font-black text-purple-700 dark:text-purple-300 text-sm">{depts.length} Directorate / Teams</span>
                              </div>
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-800 text-center">
                                <span className="text-[10px] text-slate-400 uppercase block font-bold">Active Holding Authority</span>
                                <span className="font-bold text-purple-800 dark:text-purple-200 text-xs truncate block">
                                  {depts.length > 0 ? depts[depts.length - 1].department : 'Site RE'}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                              {depts.map((d, dIdx) => (
                                <div key={dIdx} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-2xs flex items-center justify-center font-mono">
                                        {dIdx + 1}
                                      </span>
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        {d.department}
                                      </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      d.status.includes('Active')
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                        : d.status.includes('Resolved') || d.status.includes('Closed')
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                    }`}>
                                      {d.status}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs font-mono">
                                    <div>
                                      <span className="text-slate-400 block">Holding Date Range:</span>
                                      <strong>{d.startDate} ➔ {d.endDate}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Department Time Taken Before Transfer/Change:</span>
                                      <strong className="text-purple-700 dark:text-purple-300 text-xs">{d.daysTaken} Calendar Days</strong>
                                    </div>
                                  </div>

                                  {d.actionBeforeTransferOrChange && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-2xs text-slate-700 dark:text-slate-300">
                                      <strong>Handover Action / Decision Notes:</strong> {d.actionBeforeTransferOrChange}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 4: KEY LESSON LEARNED & DIRECTIVES */}
                  {lessonsModalTab === 'lesson' && (
                    <div className="space-y-4">
                      <div>
                        <label className="font-bold block mb-1.5 text-slate-800 dark:text-slate-200">
                          Key Lesson Learned & Risk Prevention Takeaway <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Document root cause insights, procedural improvements, FIDIC clause interpretations, or contract management strategies learned from handling this issue..."
                          value={lessonsInput}
                          onChange={(e) => setLessonsInput(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 font-sans leading-relaxed text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold block mb-1.5 text-slate-800 dark:text-slate-200">
                          Additional Case Review Notes & Management Recommendations
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide recommendations for future project stages, standard operating procedures, or steering committee policy changes..."
                          value={reviewNotesInput}
                          onChange={(e) => setReviewNotesInput(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 font-sans text-xs"
                        />
                      </div>

                      {/* Contractual Prevention Guidance */}
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                          Contractual & Operational Prevention Directives:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-2xs text-slate-600 dark:text-slate-300">
                          <li>Review contract dossier specifications and ensure SLA enforcement under {selectedIssue.clauseReference || 'General Conditions of Contract'}.</li>
                          <li>Incorporate proactive risk assessments and utility coordination prior to site handover.</li>
                          <li>Archive this dossier in the ERA Central Lessons Learned Repository for cross-project reference.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                  {effectiveIsAdmin && selectedIssue.lessonsLearned ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteLessonsLearned(selectedIssue.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold flex items-center gap-1.5 cursor-pointer text-xs transition"
                      title="Permanently remove recorded lesson learned (Admin Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Delete Lesson Learned
                    </button>
                  ) : (
                    <span className="text-2xs text-slate-400 font-mono">
                      {resolutionStepsList.length} step(s) ready to codify
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLessonsModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-xs transition"
                    >
                      <BookOpen className="w-4 h-4" /> Save Lessons Learned & Resolution Dossier
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: LOG STATUS UPDATE / AUDIT NOTE */}
      <AnimatePresence>
        {showHistoryModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <History className="w-5 h-5 text-blue-600" /> Log Status Update & Audit Trail
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-200 block">Issue Code: {selectedIssue.issueCode}</span>
                <span className="text-blue-800 dark:text-blue-300 font-medium truncate block">{selectedIssue.title}</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block pt-1">
                  User User Tracker: <strong className="font-bold">{currentUsername}</strong>
                </span>
              </div>

              <form onSubmit={handleAddManualHistoryNote} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">New Issue Status (Optional Update)</label>
                  <select
                    value={historyNewStatusInput || selectedIssue.currentStatus}
                    onChange={(e) => setHistoryNewStatusInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    <option value="Submitted / Under Review">Submitted / Under Review</option>
                    <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                    <option value="Transferred / Escalated">Transferred / Escalated</option>
                    <option value="Resolved / Approved">Resolved / Approved</option>
                    <option value="Rejected / Closed">Rejected / Closed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">
                    Status Change Reason / Progress Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter audit trail comments, action items completed, meeting outcomes, or status update explanations..."
                    value={historyNoteInput}
                    onChange={(e) => setHistoryNoteInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-4 h-4" /> Log History Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: LESSONS LEARNED & RESOLVED ISSUES ARCHIVE REPOSITORY */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 text-teal-700 dark:text-teal-400">
                    <BookOpen className="w-5 h-5 text-teal-600" /> Resolved Issue Records & Lessons Learned Repository
                  </h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Archived resolved and approved project issues stored for institutional knowledge, risk mitigation, and future contract reference.
                  </p>
                </div>
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Archive Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter archived issues or search lessons learned keywords..."
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Archived Issues List */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {(() => {
                  const filteredArchive = resolvedIssuesList.filter(item => 
                    (item.title || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.issueCode || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.lessonsLearned || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.category || '').toLowerCase().includes(archiveSearchQuery.toLowerCase())
                  );

                  if (filteredArchive.length === 0) {
                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400">No Resolved Issues or Lessons Learned Found</h4>
                        <p className="text-2xs text-slate-400 max-w-md mx-auto">
                          When project issues are marked as "Resolved / Approved" or "Rejected / Closed", they are automatically removed from the active log table and stored here for long-term records and lessons learned.
                        </p>
                      </div>
                    );
                  }

                  return filteredArchive.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 p-4 rounded-xl space-y-2.5 transition hover:border-teal-300 dark:hover:border-teal-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            {item.issueCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                            {item.currentStatus}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-2xs text-slate-500 font-mono">
                          <span>Submitted: {item.submittedDate}</span>
                          {(() => {
                            const info = getIssueTurnaroundInfo(item);
                            return (
                              <span className="flex items-center gap-1 bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                                <Clock className="w-3 h-3" />
                                Turnaround: {info.turnaroundDays} Days
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.title}</h4>
                        <p className="text-2xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{item.initialDescription}</p>
                      </div>

                      {item.lessonsLearned ? (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 p-3 rounded-lg border border-teal-200/60 dark:border-teal-800/40 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Recorded Lesson Learned
                            </span>
                            {item.lessonsLearnedUpdatedBy && (
                              <span className="font-mono text-teal-600 dark:text-teal-400">By {item.lessonsLearnedUpdatedBy}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic">
                            "{item.lessonsLearned}"
                          </p>
                          {item.reviewNotes && (
                            <p className="text-2xs text-slate-600 dark:text-slate-400 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                              <strong>Review Notes:</strong> {item.reviewNotes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-2xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <span>No explicit lesson learned narrative recorded for this resolved issue yet.</span>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput('');
                              setReviewNotesInput('');
                              setShowLessonsModal(true);
                            }}
                            className="text-2xs font-bold text-teal-700 dark:text-teal-300 underline cursor-pointer"
                          >
                            Add Lesson Learned Now
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 text-2xs">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono">
                          <span>Financial: Br. {(item.financialImpactEtb || 0).toLocaleString()}</span>
                          <span>Time: {item.timeImpactDays || 0} Days</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {effectiveIsAdmin && item.lessonsLearned && (
                            <button
                              onClick={() => handleDeleteLessonsLearned(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1 cursor-pointer transition"
                              title="Permanently remove recorded lesson learned (Admin Only)"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Delete Lesson
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput(item.lessonsLearned || '');
                              setReviewNotesInput(item.reviewNotes || '');
                              setShowLessonsModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold hover:bg-teal-100 cursor-pointer"
                          >
                            Edit Lessons Learned
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setRetroTrackingIssueId(item.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5 text-xs"
                            title="View detailed history and trace how this issue became a lesson learned"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>View Detailed History ➜</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                <span className="text-slate-400 text-2xs">Total Archived Records: {resolvedIssuesList.length}</span>
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Close Repository
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: DETAILED ISSUE LIFECYCLE & LESSONS LEARNED JOURNEY TRACKER */}
      <AnimatePresence>
        {retroTrackingIssueId && (() => {
          const trackingIssue = issuesList.find(i => i.id === retroTrackingIssueId);
          if (!trackingIssue) return null;
          const turnaroundInfo = getIssueTurnaroundInfo(trackingIssue);
          const sortedHistory = [...(trackingIssue.history || [])].sort((a, b) => {
            const tA = new Date(a.timestamp || 0).getTime();
            const tB = new Date(b.timestamp || 0).getTime();
            return tA - tB;
          });

          return (
            <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded font-mono font-bold text-2xs border border-teal-300 dark:border-teal-800">
                        {trackingIssue.issueCode}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-2xs font-semibold">
                        {trackingIssue.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-2xs font-extrabold border ${
                        trackingIssue.priority === 'Critical'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300'
                          : trackingIssue.priority === 'High'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300'
                      }`}>
                        {trackingIssue.priority} Priority
                      </span>
                      <span className={`px-2 py-0.5 rounded text-2xs font-extrabold border ${
                        trackingIssue.currentStatus === 'Resolved / Approved'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          : trackingIssue.currentStatus === 'Rejected / Closed'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300'
                      }`}>
                        {trackingIssue.currentStatus}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {trackingIssue.title}
                    </h2>
                    <p className="text-2xs text-slate-500 dark:text-slate-400">
                      End-to-end journey tracking this issue from initial contract notice through department handovers and final resolution into institutional lessons learned.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExportSingleIssuePdf(trackingIssue)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      title="Export complete dossier as official PDF"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIssueId(trackingIssue.id);
                        setRetroTrackingIssueId(null);
                        setShowArchiveModal(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 cursor-pointer transition"
                      title="Open in 1-Page Official Issue Log Sheet"
                    >
                      <FileText className="w-3.5 h-3.5" /> Open in Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setRetroTrackingIssueId(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quick Metrics KPI Bar */}
                <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Turnaround Duration</span>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300 text-sm">
                      {turnaroundInfo.turnaroundDays} Days
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {turnaroundInfo.isResolved ? 'Submission ➔ Resolution' : 'Days Pending Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Financial Exposure</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      Br. {(trackingIssue.financialImpactEtb || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Claimed / Evaluated</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Time Impact</span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">
                      {trackingIssue.timeImpactDays || 0} Days EOT
                    </span>
                    <span className="text-[10px] text-slate-400 block">Req: {trackingIssue.requiredDaysContract || 28}d SLA</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Handovers & Audits</span>
                    <span className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                      {(trackingIssue.transfers?.length || 0)} Transfers
                    </span>
                    <span className="text-[10px] text-slate-400 block">{(trackingIssue.history?.length || 0)} Audit Milestones</span>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-5 bg-white dark:bg-slate-800 shrink-0 gap-6 text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setTrackingModalTab('journey')}
                    className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      trackingModalTab === 'journey'
                        ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Full Issue Journey (Inception ➔ Lesson Learned)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackingModalTab('history')}
                    className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      trackingModalTab === 'history'
                        ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Audit Trail & Handover Log ({sortedHistory.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackingModalTab('lessons')}
                    className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      trackingModalTab === 'lessons'
                        ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Codified Lesson Learned & Prevention</span>
                  </button>
                </div>

                {/* Body Content - Scrollable */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1 text-xs">
                  {trackingModalTab === 'journey' && (
                    <div className="space-y-6">
                      {/* Visual Stepper Timeline */}
                      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-purple-500 before:via-emerald-500 before:to-teal-500">
                        
                        {/* PHASE 1: INCEPTION & LODGING */}
                        <div className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-800 font-bold text-2xs">
                            1
                          </div>
                          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 dark:border-blue-800/40 pb-2">
                              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                                <AlertTriangle className="w-4 h-4 text-blue-600" />
                                <span>Phase 1: Claim Lodging & Initial Notice</span>
                              </div>
                              <span className="text-2xs font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                                {trackingIssue.submittedDate || 'Initial Submission'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs pt-1">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Originator / Lodged By:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{trackingIssue.submittedBy}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Official Recipient:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{trackingIssue.submittedTo}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Contract / FIDIC Clause:</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200">{trackingIssue.clauseReference || 'General Conditions'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Initial Claimed Exposure:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Br. {(trackingIssue.financialImpactEtb || 0).toLocaleString()} • {trackingIssue.timeImpactDays || 0} Days EOT
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30">
                              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Initial Ground & Cause:</span>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                                {trackingIssue.initialDescription}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PHASE 2: EVALUATION, TRANSFERS & ESCALATION */}
                        <div className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-800 font-bold text-2xs">
                            2
                          </div>
                          <div className="bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/40 pb-2">
                              <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                                <Layers className="w-4 h-4 text-purple-600" />
                                <span>Phase 2: Technical Evaluation, Escalations & Department Transfers</span>
                              </div>
                              <span className="text-2xs font-mono bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                                {trackingIssue.transfers?.length || 0} Inter-Department Handover{(trackingIssue.transfers?.length === 1 ? '' : 's')}
                              </span>
                            </div>

                            {/* Department Transfers Cards */}
                            {trackingIssue.transfers && trackingIssue.transfers.length > 0 ? (
                              <div className="space-y-2.5">
                                <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300 block">Department Transfer Chain:</span>
                                {trackingIssue.transfers.map((tr, tIdx) => (
                                  <div key={tr.id || tIdx} className="bg-white/80 dark:bg-slate-900/60 border border-purple-200/80 dark:border-purple-800/50 p-3 rounded-lg space-y-2">
                                    <div className="flex flex-wrap items-center justify-between text-2xs font-bold gap-2">
                                      <span className="text-purple-800 dark:text-purple-300 flex items-center gap-1">
                                        <span>Transfer #{tIdx + 1}:</span>
                                        <span className="text-slate-800 dark:text-slate-200">{tr.transferredFrom}</span>
                                        <ArrowRight className="w-3 h-3 text-purple-600" />
                                        <span className="text-purple-700 dark:text-purple-300">{tr.transferredTo}</span>
                                      </span>
                                      <span className="font-mono text-slate-500 dark:text-slate-400">{tr.transferDate}</span>
                                    </div>
                                    <p className="text-2xs text-slate-700 dark:text-slate-300">
                                      <strong>Reason for Handover:</strong> {tr.transferReason}
                                    </p>
                                    {tr.actionTakenByPreviousTeam && (
                                      <p className="text-2xs text-slate-600 dark:text-slate-400">
                                        <strong>Action Taken by Handing-over Team:</strong> {tr.actionTakenByPreviousTeam}
                                      </p>
                                    )}
                                    {tr.recommendedCourseOfAction && (
                                      <p className="text-2xs text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/40 p-1.5 rounded border border-purple-100 dark:border-purple-900/30">
                                        <strong>Recommended Next Steps:</strong> {tr.recommendedCourseOfAction}
                                      </p>
                                    )}
                                    {tr.transferredBy && (
                                      <div className="text-[10px] text-slate-400 text-right italic font-mono">
                                        Authorized By: {tr.transferredBy}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-dashed border-purple-200 dark:border-purple-800/50 text-2xs text-slate-500">
                                Handled directly within originating project Directorate without external inter-agency transfers.
                              </div>
                            )}

                            {/* Current Stage & Bottlenecks */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100 dark:border-purple-900/30">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Stage Reached:</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-2xs bg-white/70 dark:bg-slate-900/50 p-2 rounded border border-purple-100 dark:border-purple-900/30">
                                  {trackingIssue.currentStage}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Bottlenecks Flagged During Processing:</span>
                                <p className="text-2xs text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded border border-amber-200/60 dark:border-amber-800/40">
                                  {trackingIssue.currentBottleneck || 'No pending bottlenecks.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PHASE 3: DETERMINATION & FORMAL RESOLUTION */}
                        <div className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-800 font-bold text-2xs">
                            3
                          </div>
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Phase 3: Formal Resolution & Determination</span>
                              </div>
                              <span className="text-2xs font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                {turnaroundInfo.isResolved ? `Resolved on ${turnaroundInfo.resolvedDate}` : 'Processing Concluded'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                              <div className="bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Determination Outcome:</span>
                                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
                                  {trackingIssue.currentStatus}
                                </span>
                              </div>
                              <div className="bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 font-mono">
                                <span className="text-slate-500 dark:text-slate-400 block font-semibold font-sans">Turnaround Time Taken:</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                  {turnaroundInfo.turnaroundDays} Calendar Days
                                </span>
                                <span className="text-slate-400 text-[10px] ml-1.5 font-sans">
                                  ({trackingIssue.submittedDate} ➔ {turnaroundInfo.resolvedDate || 'Present'})
                                </span>
                              </div>
                            </div>

                            {trackingIssue.latestProgressSummary && (
                              <div className="pt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Final Resolution Action / Findings:</span>
                                <p className="text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 leading-relaxed">
                                  {trackingIssue.latestProgressSummary}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PHASE 4: HOW & WHY THIS BECAME A LESSON LEARNED */}
                        <div className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-800 font-bold text-2xs">
                            4
                          </div>
                          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/70 dark:from-teal-950/40 dark:to-emerald-950/30 border-2 border-teal-300 dark:border-teal-700 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/80 dark:border-teal-800 pb-2.5">
                              <div className="flex items-center gap-2 font-black text-teal-900 dark:text-teal-200 text-xs uppercase tracking-wide">
                                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Phase 4: Transformation into Codified Institutional Lesson Learned</span>
                              </div>
                              {trackingIssue.lessonsLearnedUpdatedAt && (
                                <span className="text-2xs font-mono bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-bold border border-teal-200 dark:border-teal-800">
                                  Codified on {trackingIssue.lessonsLearnedUpdatedAt}
                                </span>
                              )}
                            </div>

                            {/* Institutional Retrospective Rationale */}
                            <div className="bg-white/80 dark:bg-slate-900/70 p-3 rounded-lg border border-teal-200/60 dark:border-teal-800/40 space-y-1">
                              <span className="text-[10px] uppercase font-black text-teal-800 dark:text-teal-300 tracking-wider flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-teal-600" /> Institutional Retrospective & Prevention Rationale
                              </span>
                              <p className="text-2xs text-slate-600 dark:text-slate-300 leading-normal">
                                This issue was elevated into the ERA institutional knowledge repository because the root causes (uncoordinated utility relocation, delayed currency allocation, or centralized testing bottlenecks) repeatedly cause critical path delays and multi-million ETB claims across federal road contracts. Documenting the resolution trajectory provides binding risk mitigation directives for future tenders and supervision teams.
                              </p>
                            </div>

                            {/* The Actual Lesson Learned */}
                            {trackingIssue.lessonsLearned ? (
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-teal-300/80 dark:border-teal-700/80 space-y-2 shadow-xs">
                                <div className="flex justify-between items-center text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                  <span>Key Lesson & Strategic Risk Prevention Takeaway</span>
                                  {trackingIssue.lessonsLearnedUpdatedBy && (
                                    <span className="font-mono text-slate-500 dark:text-slate-400">
                                      Logged By: <strong>{trackingIssue.lessonsLearnedUpdatedBy}</strong>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-900 dark:text-slate-100 font-serif italic leading-relaxed pl-3 border-l-4 border-teal-500">
                                  "{trackingIssue.lessonsLearned}"
                                </p>

                                {trackingIssue.reviewNotes && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                                      Practical Case Implementation Directives:
                                    </span>
                                    <p className="text-2xs text-slate-700 dark:text-slate-300">
                                      {trackingIssue.reviewNotes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 text-center space-y-2">
                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                  No explicit lesson learned text has been recorded for this issue yet.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => openLessonsLearnedModal(trackingIssue)}
                                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                                >
                                  <PenTool className="w-3.5 h-3.5" /> Record Lesson Learned & Resolution Dossier
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {trackingModalTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <History className="w-4 h-4 text-blue-600" /> Complete Chronological Audit Trail & Status History Log
                          </h3>
                          <p className="text-2xs text-slate-500 dark:text-slate-400">
                            Every recorded status change, team transfer, and review milestone logged for {trackingIssue.issueCode}.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSortHistoryAsc(!sortHistoryAsc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-2xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          <span>{sortHistoryAsc ? 'Oldest First (Inception ➔ Current)' : 'Latest First'}</span>
                        </button>
                      </div>

                      {/* History List */}
                      {sortedHistory.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                          No status history records logged yet for this issue.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {(sortHistoryAsc ? sortedHistory : [...sortedHistory].reverse()).map((hist, hIdx) => {
                            const stepNum = sortHistoryAsc ? hIdx + 1 : sortedHistory.length - hIdx;
                            return (
                              <div
                                key={hist.id || hIdx}
                                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl space-y-2 transition hover:border-teal-300 dark:hover:border-teal-700"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                                      {stepNum}
                                    </span>
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                      {hist.changeType || 'Status Update'}
                                    </span>
                                    <span className="text-2xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                                      {hist.newStatus}
                                    </span>
                                  </div>
                                  <span className="font-mono text-2xs text-slate-500 dark:text-slate-400">
                                    {hist.timestamp}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-slate-600 dark:text-slate-400">
                                  <div>
                                    <strong>Action Logged By:</strong> {hist.user}
                                  </div>
                                  {hist.stage && (
                                    <div>
                                      <strong>Stage:</strong> {hist.stage}
                                    </div>
                                  )}
                                  {hist.previousStatus && hist.previousStatus !== 'None' && (
                                    <div>
                                      <strong>Previous Status:</strong> {hist.previousStatus}
                                    </div>
                                  )}
                                  {hist.bottleneck && (
                                    <div className="text-amber-700 dark:text-amber-400">
                                      <strong>Bottleneck Noted:</strong> {hist.bottleneck}
                                    </div>
                                  )}
                                </div>

                                {hist.notes && (
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 text-2xs text-slate-800 dark:text-slate-200">
                                    <span className="text-slate-400 font-bold uppercase text-[9px] block mb-0.5">Audit Note:</span>
                                    {hist.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {trackingModalTab === 'lessons' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 p-5 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-4">
                        <div className="flex justify-between items-center border-b border-teal-200 dark:border-teal-800 pb-3">
                          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-black text-sm uppercase">
                            <Sparkles className="w-5 h-5 text-teal-600" />
                            <span>Codified Institutional Lesson Learned & Resolution Dossier</span>
                          </div>
                          {effectiveIsAdmin && (
                            <button
                              type="button"
                              onClick={() => openLessonsLearnedModal(trackingIssue)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
                            >
                              <PenTool className="w-3.5 h-3.5" /> Edit Lessons & Dossier
                            </button>
                          )}
                        </div>

                        {trackingIssue.lessonsLearned ? (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-900 dark:text-white font-serif italic leading-relaxed bg-white/90 dark:bg-slate-900/80 p-4 rounded-xl border border-teal-200 dark:border-teal-800 shadow-xs">
                              "{trackingIssue.lessonsLearned}"
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                              <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-lg border border-teal-100 dark:border-teal-900/40">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Recorded / Reviewed By:</span>
                                <span className="font-bold text-teal-800 dark:text-teal-300">
                                  {trackingIssue.lessonsLearnedUpdatedBy || 'ERA Project Team'}
                                </span>
                              </div>
                              <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-lg border border-teal-100 dark:border-teal-900/40">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Codification Timestamp:</span>
                                <span className="font-mono text-teal-800 dark:text-teal-300">
                                  {trackingIssue.lessonsLearnedUpdatedAt || 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Display Resolution Steps Record if present in Tracking Modal */}
                            {trackingIssue.resolutionSteps && trackingIssue.resolutionSteps.length > 0 && (
                              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-teal-200/70 dark:border-teal-900/40 space-y-2">
                                <div className="flex items-center justify-between text-2xs font-bold uppercase text-teal-900 dark:text-teal-300">
                                  <span className="flex items-center gap-1">
                                    <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                                    Steps Taken Until Resolved ({trackingIssue.resolutionSteps.length} recorded steps)
                                  </span>
                                </div>
                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                  {trackingIssue.resolutionSteps.map((st, sIdx) => (
                                    <div key={st.id || `st-trk-${sIdx}`} className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-2xs space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded text-[10px]">
                                            Step {st.stepNumber || sIdx + 1}
                                          </span>
                                          <span className="text-slate-500 font-mono">{st.date}</span>
                                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <UserIcon className="w-2.5 h-2.5 text-teal-600" />
                                            {st.performedBy}
                                          </span>
                                        </div>
                                        <span className="font-bold text-[10px] text-teal-800 dark:text-teal-300">
                                          {st.statusAtStep}
                                        </span>
                                      </div>
                                      <div className="font-medium text-slate-800 dark:text-slate-200">
                                        {st.actionTaken}
                                      </div>
                                      {st.notes && (
                                        <p className="text-slate-500 dark:text-slate-400 italic">
                                          {st.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Fallback steps text if present */}
                            {(!trackingIssue.resolutionSteps || trackingIssue.resolutionSteps.length === 0) && trackingIssue.stepsTakenUntilResolved && (
                              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-teal-200/70 dark:border-teal-900/40 space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300 flex items-center gap-1">
                                  <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                                  Steps Taken Until Resolved
                                </span>
                                <div className="text-2xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                  {trackingIssue.stepsTakenUntilResolved}
                                </div>
                              </div>
                            )}

                            {trackingIssue.reviewNotes && (
                              <div className="bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-lg border border-teal-100 dark:border-teal-900/40 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                                  Additional Case Review Notes & Strategic Directives:
                                </span>
                                <p className="text-2xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                  {trackingIssue.reviewNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-white/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-teal-300 dark:border-teal-800 space-y-2">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              No narrative recorded yet. Click below to add institutional lessons learned for {trackingIssue.issueCode}.
                            </p>
                            <button
                              type="button"
                              onClick={() => openLessonsLearnedModal(trackingIssue)}
                              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                            >
                              <PenTool className="w-4 h-4" /> Record Lesson Learned
                            </button>
                          </div>
                        )}

                        {/* Future Contract Clause Recommendations */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                            Contractual & Operational Prevention Guidance:
                          </span>
                          <ul className="list-disc pl-4 space-y-1 text-2xs text-slate-600 dark:text-slate-300">
                            <li>Ensure strict SLA enforcement under {trackingIssue.clauseReference || 'General Conditions of Contract'}.</li>
                            <li>Incorporate proactive risk assessments during the pre-construction handover phase.</li>
                            <li>Cross-reference this case during periodic Directorate progress audits to prevent repeat occurrences.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
                  <div className="text-2xs text-slate-400 font-mono">
                    Issue ID: {trackingIssue.id} • {turnaroundInfo.displayText}
                  </div>
                  <div className="flex items-center gap-2">
                    {trackingIssue.lessonsLearned && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIssueId(trackingIssue.id);
                          setLessonsInput(trackingIssue.lessonsLearned || '');
                          setReviewNotesInput(trackingIssue.reviewNotes || '');
                          setShowLessonsModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold hover:bg-teal-100 cursor-pointer text-xs flex items-center gap-1"
                      >
                        <PenTool className="w-3.5 h-3.5" /> Edit Lesson Learned
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRetroTrackingIssueId(null)}
                      className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-slate-800 dark:text-slate-200 cursor-pointer text-xs"
                    >
                      Close Journey
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

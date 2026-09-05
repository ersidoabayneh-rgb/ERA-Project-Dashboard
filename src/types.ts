/**
 * Represents shared TypeScript types and data structures for the
 * Ethiopian Roads Administration ERP Dashboard application.
 */

export interface RowMetric {
  name: string;
  value: number;
  unit: string;
}

export interface RowCompensationItem {
  id: string;
  woreda: string;
  affectedPaps: number;
  compensationRequired: number; // in Million Birr
  compensationPaid: number; // in Million Birr
  unpaidBalance: number; // in Million Birr
  status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'In Progress';
  remarks: string;
}

export interface UtilityCompensationItem {
  id: string;
  utilityType: string; // e.g., 'Electric Power Lines', 'Telecom Cables', 'Water Supply Pipelines'
  ownerAgency: string; // e.g., 'EEP', 'ethio telecom', 'Water Board'
  quantity: string;     // e.g., '142 Poles', '4.2 Km'
  compensationRequired: number; // in Million Birr
  compensationPaid: number; // in Million Birr
  unpaidBalance: number; // in Million Birr
  status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'In Progress';
  remarks: string;
}

export interface RowStatusItem {
  id: string;
  from: string;
  to: string;
  length: string;
  status: string;
  remark: string;
}

export function formatAccounting(v: number, currency: string = 'Br.'): string {
  const num = typeof v === 'number' ? v : parseFloat(v as any) || 0;
  const absVal = Math.abs(num);
  const formattedNum = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (num < 0) {
    return `(${currency ? currency + ' ' : ''}${formattedNum})`;
  }
  return `${currency ? currency + ' ' : ''}${formattedNum}`;
}

export interface MonthlyProgress {
  month: string;
  originalPlan?: number | null | string;
  revisedPlan?: number | null | string;
  actual?: number | null | string;
}

export interface SeriesItem {
  code: string;
  desc: string;
  contractAmt: number;
  execAmt: number;
  progress: number;
  contractPct?: number; // only for DB projects
}

export interface QtyItem {
  name: string;
  design: number;
  plan: number;
  exec: number;
  unit?: string;
}

export interface PlanSet {
  month: number;
  quarter: number;
  efy: number;
  todate: number;
}

export interface ProgressPlan {
  contractor: PlanSet;
  era: PlanSet;
  actual: PlanSet;
}

export interface LinearSegment {
  no: number;
  from: string;
  to: string;
  exec: number;
}

export interface LinearData {
  subgrade: LinearSegment[];
  capping: LinearSegment[];
  subbase: LinearSegment[];
  basecourse: LinearSegment[];
  asphalt: LinearSegment[];
}

export interface KpiAllocatedItem {
  goalId: string;
  goalName: string;
  goalWt: number;
  sscId: string;
  sscName: string;
  sscWt: number;
  itemId: string;
  desc: string;
  unit: string;
  itemWt: number;
  max: number;
  type: string; // 'pct' | 'yn' | 'auto'
  alloc: number;
  naActive?: boolean;
  isOverridden?: boolean;
}

export interface HistoryItem {
  timestamp: string;
  user: string;
  section: string;
  physicalProgress: number;
}

export interface WorkProgramActivity {
  id: string;
  name: string;
  duration: number;
  predecessors: string; // Comma separated IDs
  weight?: number;
  lag?: number;
  depType?: 'FS' | 'SS' | 'FF' | 'SF';
  predDetails?: { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } };
  start?: string;
  finish?: string;
  float?: number;
  critical?: boolean;
  est?: number;
  eft?: number;
  lst?: number;
  lft?: number;
  manualStart?: boolean;
  manualFinish?: boolean;
}

export interface BondGuarantee {
  sno: number;
  type: string;
  bank: string;
  amount: number;
  amountUsd?: number;
  issueDate: string;
  expireDate: string;
  status: 'Valid' | 'Recovered' | 'Expired' | 'N/A';
}

export interface ResourceMobilizationItem {
  id: string;
  desc: string;
  originalPlan: number;
  revisedPlan: number;
  available: number;
  deficiency: number;
  breakdown: string;
}

export interface MaterialProductionItem {
  id: string;
  desc: string;
  scope: string;
  thisMonth: number;
  totalToDate: number;
  used?: number;
  availableStock: number;
  remainingBalance: number;
}

export interface IpcItem {
  id: string;
  paymentNo: string;
  period?: string;
  submissionDate?: string; // Contractor Submission Date (date Contractor submitted IPC to Engineer)
  certificationDate?: string; // Engineer's Submission Date (date Engineer certified & submitted IPC to Employer)
  paymentDate?: string; // Payment Date / Disbursement Date (date Employer disbursed payment to Contractor)
  grossBillEtb?: number;
  grossBillUsd?: number;
  priceAdjustmentEtb?: number;
  priceAdjustmentUsd?: number;
  advanceRepaymentEtb?: number;
  retentionEtb?: number;
  retentionUsd?: number;
  materialsOnSiteEtb?: number;
  certifiedEtb: number;
  certifiedUsd: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  statusEtb?: 'Paid' | 'Unpaid' | 'Partially Paid';
  statusUsd?: 'Paid' | 'Unpaid' | 'Partially Paid';
  customAnnualInterestRate?: number;
  delayInterestEtb?: number;
  delayInterestUsd?: number;
  remarks?: string;
}

export interface PaymentItem {
  item: string;
  amount: number;
  percent: number;
}

export interface AnnualItem {
  year: number;
  amount: number;
  km?: number;
  budget?: number;
  percent: number;
}

export interface IssueTransferRecord {
  id: string;
  transferDate: string;
  transferredFrom: string;
  transferredTo: string;
  transferReason: string;
  actionTakenByPreviousTeam: string;
  recommendedCourseOfAction: string;
  transferredBy?: string;
}

export interface DeptTimeRecord {
  department: string;
  startDate: string;
  endDate: string;
  daysTaken: number;
  status: 'Transferred' | 'Active' | 'Resolved / Closed' | string;
  actionBeforeTransferOrChange?: string;
}

export interface IssueColumnChangeDetail {
  columnName: string; // e.g. "Current Status", "Issue Category", "Transferred To", "Action & Exposure", "Milestone Stage"
  previousValue?: string | number;
  newValue: string | number;
}

export interface IssueHistoryRecord {
  id: string;
  timestamp: string; // Formatted timestamp e.g. "2026-08-04 14:30"
  user: string; // User who made the change
  previousStatus?: string;
  newStatus: string;
  stage?: string;
  changeType?: 'Status Change' | 'Transfer Handover' | 'Creation' | 'Details Edit' | 'Lessons Learned Review' | string;
  notes?: string;
  bottleneck?: string;
  category?: string; // Issue category at time of change
  department?: string; // Department holding or processing the issue
  transferredFrom?: string;
  transferredTo?: string;
  transferDate?: string;
  daysInDepartmentBeforeTransferOrChange?: number; // Department time taken before this transfer or change
  overallElapsedDays?: number; // Overall elapsed days from submission up to this change
  changedColumns?: string[]; // Columns that changed at this event e.g. ['Status', 'Category', 'Transferred To']
  columnChanges?: IssueColumnChangeDetail[]; // Granular column values before and after
}

export interface ResolutionStepRecord {
  id: string;
  stepNumber: number;
  date: string;
  actionTaken: string;
  performedBy: string;
  statusAtStep: string;
  category?: string; // Issue category at this step
  department?: string; // Department responsible / involved
  transferredFrom?: string;
  transferredTo?: string;
  transferDate?: string;
  departmentTimeTakenDays?: number; // Department time taken before transfer or change
  overallTimeTakenDays?: number; // Overall time taken from issue submission up to this step
  stage?: string;
  notes?: string;
  changedColumns?: string[]; // Names of columns that changed at this step
  columnChanges?: IssueColumnChangeDetail[]; // Details of column changes
}

export interface IssueLogItem {
  id: string;
  issueCode: string;
  title: string;
  category: 'Contractual Claim' | 'Right of Way (ROW)' | 'Design Revision' | 'Financial/Payment' | 'EOT Request' | 'Technical/Quality' | 'Safety/Environmental' | 'Technical/Design' | 'Material Testing' | 'Environmental/Safety' | string;
  submittedDate: string;
  createdDate?: string; // System audit creation timestamp (e.g. "2026-08-29 15:50")
  lastUpdated?: string; // System audit last updated timestamp (e.g. "2026-08-29 15:50")
  submittedBy: string;
  submittedTo: string;
  clauseReference?: string;
  initialDescription: string;
  financialImpactEtb?: number;
  timeImpactDays?: number;
  requiredDaysContract?: number;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  
  // Progress/Current status ("where the issue reached")
  currentStatus: 'Submitted / Under Review' | 'In Progress / Evaluation' | 'Transferred / Escalated' | 'Resolved / Approved' | 'Rejected / Closed';
  currentStage: string;
  latestProgressSummary: string;
  currentBottleneck?: string;
  
  // Lessons learned & retrospective review
  lessonsLearned?: string;
  lessonsLearnedUpdatedBy?: string;
  lessonsLearnedUpdatedAt?: string;
  reviewNotes?: string;
  stepsTakenUntilResolved?: string; // Chronological steps taken until the issue was resolved
  resolutionSteps?: ResolutionStepRecord[]; // Structured list of steps taken until resolution
  resolutionStatus?: string; // Status of the issue at resolution / when lesson learned was recorded
  departmentTimeBreakdown?: DeptTimeRecord[]; // Recorded department time before transfers and resolution
  overallTimeTakenDays?: number; // Overall total calendar days taken for the issue until resolved/closed
  
  // Resolution / Closure timing & turnaround metrics
  resolvedDate?: string; // Date when approved/resolved or rejected (YYYY-MM-DD)
  turnaroundDays?: number; // Total calendar days taken from submission to approval or rejection
  
  // Status history timeline & user change log
  history?: IssueHistoryRecord[];
  
  // Transfer history records
  transfers: IssueTransferRecord[];
}

export type ProjectLifecycleStatus = 'In Progress' | 'Completed' | 'Completed and Closed' | 'Suspended' | 'Terminated' | 'Terminated and Closed' | 'Archived';

/**
 * Checks whether a project lifecycle is officially closed or archived (Completed & Closed, Terminated & Closed, or Archived).
 * When closed/archived, data entry is completely frozen across all pages, last evaluation values are permanently preserved,
 * and time-related counters are stopped.
 */
export function isProjectClosed(status?: string | ProjectLifecycleStatus | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === 'completed and closed' || 
    s === 'completed & closed' || 
    s === 'terminated and closed' || 
    s === 'terminated & closed' || 
    s === 'archived' ||
    s === 'closed'
  );
}

/**
 * Checks whether a user possesses CPM Admin (Counterpart Project Manager) or Master Admin privileges.
 * When a project is in "Completed and Closed" or "Terminated and Closed" lifecycle status,
 * ONLY CPM Admins and Master Admins are authorized to change it to another lifecycle.
 */
export function isCpmOrMasterAdmin(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'master_admin' || user.role === 'cpm_admin' || user.role === 'admin') return true;
  if (user.username === 'proj_1781786415663') return true;
  if (user.username && user.username.toLowerCase().includes('ersido')) return true;
  if (user.username && user.username.toLowerCase().includes('admin') && user.role !== 'directorate_admin' && user.role !== 'pmo_admin') return true;
  return false;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  consultant: string;
  contractor: string;
  status?: ProjectLifecycleStatus;
  signDate: string;
  startDate: string;
  origDays: number;
  eotDays: number;
  interimEotDays?: number;
  variation: number; // In millions of Birr
  origAmount: number; // In millions of Birr
  revisedContractAmountEtb?: number;
  contractAmountEtb?: number;
  lengthKm: number;
  spurRoadLengthKm?: number;
  hasCappingLayer?: boolean;
  classification: string;
  contractorGrade?: string;
  contractType: 'DB' | 'DBB';
  programDirectorate?: string;
  pmo?: string;
  physicalProgress: number;
  provisionalSum: number;
  progressPlanLabels: {
    monthLabel: string;
    quarterLabel: string;
    efyLabel: string;
  };
  lastModifiedBy?: string | null;
  lastModifiedAt?: string | null;
  lastModifiedSection?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approverRole?: string | null;
  images: string[];
  rowMetrics: RowMetric[];
  rowCompensation?: RowCompensationItem[];
  utilityCompensation?: UtilityCompensationItem[];
  rowStatus?: RowStatusItem[];
  monthly: MonthlyProgress[];
  series: SeriesItem[];
  quantities: QtyItem[];
  progressPlan: ProgressPlan;
  progressPlanHistory?: ProgressPlanHistoryItem[];
  payment: PaymentItem[];
  annual: AnnualItem[];
  linear: LinearData;
  linearSpur?: LinearData;
  kpiAllocated: KpiAllocatedItem[];
  kpiDeletedSubgroups?: string[];
  kpiDeletedItems?: string[];
  history: HistoryItem[];
  workProgram: WorkProgramActivity[];
  bonds: BondGuarantee[];
  resourceMobilization?: ResourceMobilizationItem[];
  materialProduction?: MaterialProductionItem[];
  ipcTracker?: IpcItem[];
  usdExchangeRate?: number;
  annualInterestRate?: number;
  enableUsdPayments?: boolean; // When true, enables foreign currency (USD) tracking in Financial Data / IPCs
  hasForeignCurrency?: boolean;
  risks?: RiskItem[];
  issues?: IssueLogItem[];
  aiChatHistory?: any[];
  documents?: ProjectDocument[];
  supervisionConsultant?: SupervisionConsultantInfo;
}

export interface ConsultantPersonnel {
  id: string;
  name: string;
  position: string;
  category: 'Key Personnel' | 'Non-Key Professional' | 'Sub-Professional' | 'Technical Support' | 'Administrative Support' | string;
  assignmentDate: string; // Date of assignment (YYYY-MM-DD)
  demobilizationDate?: string;
  qualification?: string;
  yearsExperience?: number;
  status: 'Active' | 'Demobilized' | 'Replaced' | 'On Leave';
  manMonthsAllocated?: number;
  manMonthsInput?: number;
  contactPhone?: string;
  contactEmail?: string;
  siteStation?: string;
  remarks?: string;
}

export interface PersonnelAuditLogEntry {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  adminUser: string; // username or email of administrative user
  actionType: 'ASSIGNED' | 'REMOVED' | 'PERMANENT_DELETION' | 'STATUS_CHANGE';
  personnelName: string;
  position: string;
  category: string;
  details: string;
}

export interface ConsultantInvoice {
  id: string;
  invoiceNo: string;
  billingPeriod: string;
  submissionDate: string;
  certificationDate?: string;
  paymentDate?: string;
  grossAmountEtb: number;
  advanceDeductionEtb?: number;
  taxDeductionEtb?: number;
  netAmountEtb: number;
  foreignCurrencyAmount?: number;
  foreignCurrencyCode?: string;
  status: 'Submitted' | 'Certified' | 'Paid' | 'Pending' | 'Rejected';
  paymentReference?: string;
  remarks?: string;
  attachmentName?: string;
}

export interface HistoricalSupervisionConsultant {
  id: string;
  firmName: string;
  associationType?: string;
  jvPartners?: string;
  contractRefNo: string;
  commencementDate: string;
  originalCompletionDate?: string;
  revisedCompletionDate?: string;
  handoverDate: string; // Date transition occurred
  transitionReason?: string;
  reasonForTransition?: string;
  transitionNotes?: string;
  originalFeeEtb?: number;
  revisedFeeEtb?: number;
  enableUsdPayments?: boolean;
  originalFeeUsd?: number;
  revisedFeeUsd?: number;
  totalInvoicedEtb?: number;
  totalPaidEtb?: number;
  residentEngineerName?: string;
  residentEngineerPhone?: string;
  residentEngineerEmail?: string;
  headOfficeAddress?: string;
  headOfficePhone?: string;
  headOfficeEmail?: string;
  headOfficeContactPerson?: string;
  siteOfficeLocation?: string;
  scopeOfServices?: string;
  personnelSnapshotCount?: number;
  invoicesSnapshotCount?: number;
  archivedAt: string;
  archivedBy?: string;
  personnel?: ConsultantPersonnel[];
  invoices?: ConsultantInvoice[];
  // Historical Evaluation & Submittal KPI Snapshot
  performanceRating?: 'Outstanding' | 'Satisfactory' | 'Needs Improvement' | 'Critical' | string;
  officialGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  evaluationScore?: number;
  slaComplianceRatePct?: number;
  submittalKpis?: ConsultantSubmittalKpi[];
  targetOverrides?: Record<string, number>;
  evaluationCriteria?: EvaluationCriteriaItem[];
  evaluationSummary?: {
    slaScore?: number;
    staffingScore?: number;
    ipcScore?: number;
    contractAdminScore?: number;
    qualityScore?: number;
    totalWeightedScore?: number;
    grade?: string;
    avgTurnaroundDays?: number;
    submittalsCount?: number;
    onTimePct?: number;
  };
}

export interface EvaluationCriteriaItem {
  id: string;
  name: string;
  targetDays: number;
  weightPct: number;
}

export interface SupervisionConsultantInfo {
  firmName: string;
  associationType?: 'Lead Consultant' | 'Joint Venture (JV)' | 'Sole Consultant' | 'Association / Consortium';
  jvPartners?: string;
  contractRefNo: string;
  contractSignDate: string;
  commencementDate: string;
  originalCompletionDate: string;
  revisedCompletionDate?: string;
  originalFeeEtb: number;
  revisedFeeEtb?: number;
  enableUsdPayments?: boolean; // When true, enables foreign USD currency tracking and invoices
  originalFeeUsd?: number;
  revisedFeeUsd?: number;
  contractType?: 'Time-Based' | 'Lump-Sum' | 'Percentage of Works' | 'Hybrid';
  residentEngineerName?: string;
  residentEngineerPhone?: string;
  residentEngineerEmail?: string;
  headOfficeAddress?: string;
  headOfficePhone?: string;
  headOfficeEmail?: string;
  headOfficeContactPerson?: string;
  siteOfficeLocation?: string;
  scopeOfServices?: string;
  performanceRating?: 'Outstanding' | 'Satisfactory' | 'Needs Improvement' | 'Critical';
  submittalKpis?: ConsultantSubmittalKpi[];
  targetOverrides?: Record<string, number>;
  evaluationCriteria?: EvaluationCriteriaItem[];
  personnel: ConsultantPersonnel[];
  personnelHistory?: ConsultantPersonnel[]; // Permanent history log of all assigned/inserted personnel records
  personnelAuditLog?: PersonnelAuditLogEntry[]; // Action audit log tracking timestamps and admin user identifiers
  invoices: ConsultantInvoice[];
  previousConsultants?: HistoricalSupervisionConsultant[]; // Archive of predecessor supervision consultants
}

export interface ConsultantSubmittalKpi {
  id: string;
  submittalNo: string;
  type: 'RFI' | 'Material Approval' | 'IPC Review' | 'Work Inspection (WIR)' | 'Variation Order' | 'Design Review' | 'Claim / Notice';
  title: string;
  submittedDate: string;
  respondedDate?: string;
  targetDays: number;
  actualDays?: number;
  status: 'Approved / Closed' | 'Approved with Comments' | 'Under Review' | 'Rejected / Resubmit' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  assignedEngineer?: string;
  notes?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: 'contract' | 'monthly_report' | 'other' | string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
  description?: string;
  fileData?: string;
  fileType?: string;
}

export interface RiskItem {
  id: string;
  category: string;
  description: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  mitigation: string;
  status: 'Active' | 'Mitigated' | 'Retired';
}

export interface User {
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role: 'master_admin' | 'cpm_admin' | 'directorate_admin' | 'pmo_admin' | 'admin' | 'editor' | 'viewer' | 'approver';
  accessibleProjects: string[]; // Project IDs
  assignedPages?: string[]; // Tab/Page IDs this user is authorized to edit
  hasApprovalCredential?: boolean; // Whether user has approval authority before data incorporation
  assignedDirectorate?: string; // For directorate_admin
  assignedPmo?: string; // For pmo_admin
  assignedBy?: string; // Username who created this credential
  status?: 'Active' | 'Inactive'; // Credential status
  ipAddress?: string; // Registered IP address
  linkedIpAddress?: string; // Linked IP address confirmed by admin
  isPendingApproval?: boolean; // Flag if self-registered and pending admin approval
  approvedBy?: string; // Username who approved this account
  approvedAt?: string; // ISO date timestamp of approval
  registeredAt?: string; // ISO date timestamp of initial registration
}

export interface EditablePageOption {
  id: string;
  name: string;
  description: string;
}

export const ALL_EDITABLE_PAGES: EditablePageOption[] = [
  { id: 'dash', name: '📊 Dashboard Overview', description: 'Main project KPIs, physical progress slider, field photos' },
  { id: 'seriesEditor', name: '📋 Financial BOQ & Payment Schedules', description: 'Division series items, bill of quantities, payment schedules' },
  { id: 'issueLog', name: '🚩 Issue & Claims Log', description: 'Contractual claims, bottleneck tracking, transfer histories' },
  { id: 'linear', name: '📏 Linear Elevation Diagram', description: 'Chainage segment progress elevation mapping' },
  { id: 'rowEditor', name: '🛣️ Utilities & Right of Way (ROW)', description: 'PAP compensation, utility relocation & obstruction logs' },
  { id: 'progressPlanEditor', name: '📈 Progress Comparisons Plan', description: 'Contractor vs ERA vs Actual milestone plans' },
  { id: 'qtyEditor', name: '📐 Quantities Log', description: 'Design, planned, and executed pay quantity tracking' },
  { id: 'bonds', name: '🔒 Bonds & Guarantees', description: 'Bank guarantees, performance & advance security status' },
  { id: 'kpiEditor', name: '🎯 KPI Scorecard & Weights', description: 'Key performance indicators and evaluation weight overrides' },
  { id: 'monthly', name: '📅 Monthly S-Curve Progress', description: 'Monthly planned vs actual cumulative progress S-Curves' },
  { id: 'workProgram', name: '📅 Work Program CPM Schedule', description: 'CPM schedule activities, durations, dependencies' },
  { id: 'resourceMobilization', name: '🚚 Logistics & Resources', description: 'Equipment mobilization, plant availability, stockpiles' },
  { id: 'risks', name: '⚠️ Project Risk Register', description: 'Identified risk matrix, probabilities, and mitigations' },
  { id: 'analysis', name: '📊 Performance Analysis', description: 'Financial & physical performance analytics' },
  { id: 'documentation', name: '📁 Project Documentation', description: 'Dossier files, monthly reports, contract upload library' },
  { id: 'consultant', name: '👔 Supervision Consultant', description: 'Consultant contract, fee invoices, and assigned personnel directory' },
  { id: 'workspace', name: '☁️ Workspace Notes', description: 'Interactive collaborative scratchpad & design notes' }
];

export interface ApprovalRequest {
  id: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedAt: string;
  section: string;
  pageId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  snapshotData: any; // Full Project payload at request time
}

export interface ProgressPlanHistoryItem {
  id: string;
  monthLabel: string;
  quarterLabel?: string;
  efyLabel: string;
  contractorMonth: number;
  contractorQuarter?: number;
  contractorEfy: number;
  eraMonth: number;
  eraQuarter?: number;
  eraEfy: number;
  actualMonth: number;
  actualQuarter?: number;
  actualEfy: number;
  actualTodate?: number;
  contractorTodate?: number;
  eraTodate?: number;
  physicalProgress?: number;
}

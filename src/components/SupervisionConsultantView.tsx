import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Users, 
  Receipt, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Briefcase, 
  UserCheck, 
  UserX, 
  FileCheck, 
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  Info,
  Layers,
  Check,
  X,
  Printer,
  BarChart3,
  ArrowRightLeft,
  History,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Calculator,
  Table,
  ArrowUpDown,
  Coins
} from 'lucide-react';
import { 
  Project, 
  SupervisionConsultantInfo, 
  ConsultantPersonnel, 
  ConsultantInvoice, 
  HistoricalSupervisionConsultant,
  PersonnelAuditLogEntry,
  formatAccounting,
  User,
  RegisteredFirm,
  ContractCondition1Data
} from '../types';
import jsPDF from 'jspdf';
import { drawEraLogo } from '../lib/pdfReportEngine';
import { DEFAULT_REGISTERED_FIRMS } from '../data/defaultFirms';
import { 
  DEFAULT_CONDITION_1_DATA, 
  DEFAULT_CONDITION_1_STAFF, 
  DEFAULT_CONDITION_1_REIMBURSABLES 
} from '../data/defaultContractAmount';
import WorkloadReportModal from './WorkloadReportModal';
import ConsultantPerformanceKpiWidget, { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS } from './ConsultantPerformanceKpiWidget';
import ConsultantPerformanceMiniChart from './ConsultantPerformanceMiniChart';
import { parseJvEntities, evaluateQualitativeGrade } from '../data/consultantEvaluationMatrix';
import { MonthlyInvoiceCalculationTable, OFFICIAL_DKS_STAFF_POSITIONS_DEFAULT as OFFICIAL_DKS_STAFF_POSITIONS } from './MonthlyInvoiceCalculationTable';
import { ContractAmountTab } from './ContractAmountTab';

export const DEFAULT_OFFICIAL_DKS_INVOICE: ConsultantInvoice = {
  id: 'inv_dks_01',
  invoiceNo: 'INV-DKS-01',
  billingPeriod: 'October.14 2020 - October.31 2020',
  submissionDate: '2020-10-31',
  certificationDate: '2020-12-28',
  grossAmountEtb: 438775.00,
  vatAmountEtb: 65816.25,
  advanceDeductionEtb: 0,
  taxDeductionEtb: 0,
  netAmountEtb: 504591.25,
  totalDueEtb: 504591.25,
  feesAmountEtb: 21725.00,
  reimbursableAmountEtb: 417050.00,
  status: 'Submitted',
  paymentReference: 'CBE-FT-1000001814226',
  remarks: 'Official Ethiopian Roads Authority Supervision Fee Invoice computed from Personnel Attendance Record (Resident Engineer Mulualem Ergogo 17 Days = 0.55 MM) × Contract Rates + Reimbursables + 15% VAT per PDF format.',
  attachmentName: 'INV-DKS-01_Certified_Breakdown.pdf',
  attendanceRecords: [
    { id: 'pos_1', daysWorked: 17, name: 'Mulualem Ergogo', position: 'Resident Engineer', rate: 39500.00 }
  ],
  reimbursableRecords: [
    { id: 'reimb_1', thisInvoiceQty: 0.55, thisInvoiceAmount: 10450.00 },
    { id: 'reimb_2', thisInvoiceQty: 0.55, thisInvoiceAmount: 6600.00 },
    { id: 'reimb_3', thisInvoiceQty: 1.00, thisInvoiceAmount: 400000.00 }
  ]
};

interface SupervisionConsultantViewProps {
  project: Project;
  projects?: Project[];
  onUpdateProject?: (updates: Partial<Project>, section?: string) => void;
  isReadonly?: boolean;
  currentUser?: User | null;
}

export default function SupervisionConsultantView({
  project,
  projects = [],
  onUpdateProject,
  isReadonly = false,
  currentUser
}: SupervisionConsultantViewProps) {
  // Check whether current user is an Admin
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === 'master_admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'directorate_admin' ||
      currentUser.role === 'pmo_admin' ||
      currentUser.username === 'proj_1781786415663' ||
      Boolean(currentUser.username && currentUser.username.toLowerCase().includes('ersido'))
    );
  }, [currentUser]);

  // Check whether current user is an ERA Editor or Approver
  const isEraUser = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    return r === 'era_editor' || r === 'era_approver' || r === 'era editor' || r === 'era approver';
  }, [currentUser]);

  // Check whether current user is Master Admin
  const isMasterAdmin = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase().trim();
    return (
      r === 'master_admin' ||
      r === 'master admin' ||
      (r === 'admin' && !r.includes('cpm') && !r.includes('pmo') && !r.includes('directorate')) ||
      currentUser.username === 'proj_1781786415663' ||
      Boolean(currentUser.username && currentUser.username.toLowerCase().includes('ersido'))
    );
  }, [currentUser]);

  // Master Director and CPM Admin role verification
  const isMasterDirectorOrCpmAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase().trim();
    const username = (currentUser.username || '').toLowerCase().trim();
    const email = (currentUser.email || '').toLowerCase().trim();
    return (
      role === 'master_admin' ||
      role === 'master admin' ||
      role === 'cpm_admin' ||
      role === 'cpm admin' ||
      role === 'director_general' ||
      role === 'directorgeneral' ||
      username === 'proj_1781786415663' ||
      username.includes('ersido') ||
      email.includes('ersido')
    );
  }, [currentUser]);

  // Extract or initialize supervision consultant data (bidirectionally linked with project.consultant)
  const consultant: SupervisionConsultantInfo = useMemo(() => {
    const linkedFirmName = project.supervisionConsultant?.firmName || project.consultant || 'Supervision Consultant JV';
    if (project.supervisionConsultant) {
      return {
        ...project.supervisionConsultant,
        firmName: linkedFirmName,
        enableUsdPayments: project.supervisionConsultant.enableUsdPayments !== undefined 
          ? project.supervisionConsultant.enableUsdPayments 
          : (project.enableUsdPayments !== undefined
              ? project.enableUsdPayments
              : false),
        headOfficeAddress: project.supervisionConsultant.headOfficeAddress || '',
        headOfficePhone: project.supervisionConsultant.headOfficePhone || '',
        headOfficeEmail: project.supervisionConsultant.headOfficeEmail || '',
        headOfficeContactPerson: project.supervisionConsultant.headOfficeContactPerson || '',
        personnel: project.supervisionConsultant.personnel || [],
        personnelHistory: project.supervisionConsultant.personnelHistory || project.supervisionConsultant.personnel || [],
        invoices: (project.supervisionConsultant.invoices && project.supervisionConsultant.invoices.length > 0)
          ? project.supervisionConsultant.invoices
          : [DEFAULT_OFFICIAL_DKS_INVOICE],
        previousConsultants: project.supervisionConsultant.previousConsultants || [],
        submittalKpis: project.supervisionConsultant.submittalKpis !== undefined 
          ? project.supervisionConsultant.submittalKpis 
          : (project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : []),
        targetOverrides: project.supervisionConsultant.targetOverrides || {}
      };
    }
    return {
      firmName: project.consultant || 'Supervision Consultant JV',
      associationType: 'Joint Venture (JV)',
      jvPartners: '',
      contractRefNo: `ERA/SC/${project.id || '01'}/2020`,
      contractSignDate: project.signDate || '',
      commencementDate: project.startDate || '',
      originalCompletionDate: '',
      revisedCompletionDate: '',
      originalFeeEtb: 45000000,
      revisedFeeEtb: 55000000,
      enableUsdPayments: false,
      originalFeeUsd: 0,
      revisedFeeUsd: 0,
      contractType: 'Time-Based',
      residentEngineerName: '',
      residentEngineerPhone: '',
      residentEngineerEmail: '',
      headOfficeAddress: '',
      headOfficePhone: '',
      headOfficeEmail: '',
      headOfficeContactPerson: '',
      siteOfficeLocation: '',
      scopeOfServices: 'Full construction supervision, quality control, materials testing, and measurement of works.',
      performanceRating: 'Satisfactory',
      personnel: [],
      invoices: [DEFAULT_OFFICIAL_DKS_INVOICE],
      previousConsultants: [],
      submittalKpis: project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : [],
      targetOverrides: {}
    };
  }, [project.supervisionConsultant, project.consultant, project.signDate, project.startDate, project.id]);

  // Active view subtab - Defaults to Contract Data (merged baseline & profile)
  const [activeTab, setActiveTab] = useState<'contract_data' | 'personnel' | 'invoices' | 'kpis' | 'history' | 'personnel_audit'>('contract_data');

  // JV Partner Individual Performance Toggle State
  const [isJvPerformanceExpanded, setIsJvPerformanceExpanded] = useState<boolean>(true);

  // Global Real-Time Currency Toggle (USD / ETB)
  const [viewCurrency, setViewCurrency] = useState<'ETB' | 'USD'>('ETB');

  // Real-Time Exchange Rate Setting (persisted in consultant or project)
  const activeExchangeRate = consultant.exchangeRate || project.usdExchangeRate || 125.0;
  const [exchangeRateInput, setExchangeRateInput] = useState<number>(activeExchangeRate);
  const [isQuickRateEditOpen, setIsQuickRateEditOpen] = useState<boolean>(false);

  // In-App Toast & Floating Notification Banner
  const [inAppNotification, setInAppNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Sync exchange rate input when consultant updates
  useEffect(() => {
    if (consultant.exchangeRate && consultant.exchangeRate > 0) {
      setExchangeRateInput(consultant.exchangeRate);
    }
  }, [consultant.exchangeRate]);

  // Save exchange rate to consultant & project
  const handleSaveExchangeRate = (newRate: number) => {
    if (newRate <= 0) return;
    setExchangeRateInput(newRate);
    saveConsultantData({
      ...consultant,
      exchangeRate: newRate
    }, `Updated operational exchange rate to 1 USD = ${newRate.toFixed(2)} ETB`);
    setIsQuickRateEditOpen(false);
    setInAppNotification({
      type: 'success',
      message: `Operational exchange rate updated to 1 USD = ${newRate.toFixed(2)} ETB! All calculations updated.`
    });
  };

  // Currency Conversion Helpers
  const convertCurrency = useCallback((amountInEtb: number | undefined): number => {
    if (amountInEtb === undefined || isNaN(amountInEtb)) return 0;
    if (viewCurrency === 'USD') {
      return activeExchangeRate > 0 ? amountInEtb / activeExchangeRate : 0;
    }
    return amountInEtb;
  }, [viewCurrency, activeExchangeRate]);

  const formatViewCurrency = useCallback((amountInEtb: number | undefined, decimals = 2): string => {
    const val = convertCurrency(amountInEtb);
    const symbol = viewCurrency === 'USD' ? '$' : '';
    const unit = viewCurrency === 'USD' ? ' USD' : ' ETB';
    return `${symbol}${formatAccounting(val, '')}${unit}`;
  }, [convertCurrency, viewCurrency]);

  // Personnel Sorting and View Mode States
  const [personnelSortField, setPersonnelSortField] = useState<'name' | 'position' | 'assignmentDate' | 'manMonthsInput' | 'status'>('name');
  const [personnelSortOrder, setPersonnelSortOrder] = useState<'asc' | 'desc'>('asc');
  const [personnelViewMode, setPersonnelViewMode] = useState<'table' | 'cards'>('table');

  // Invoice Sorting State
  const [invoiceSortField, setInvoiceSortField] = useState<'invoiceNo' | 'submissionDate' | 'grossAmountEtb' | 'netAmountEtb' | 'status'>('submissionDate');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');

  // Automatically dismiss in-app notification after 5 seconds
  useEffect(() => {
    if (inAppNotification) {
      const timer = setTimeout(() => setInAppNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [inAppNotification]);

  const isConsultantUser = currentUser?.role === 'consultant_approver' || currentUser?.role === 'consultant_editor';

  useEffect(() => {
    const canAccessKpis = isAdmin || isEraUser;
    if ((!canAccessKpis || isConsultantUser) && (activeTab === 'personnel_audit' || activeTab === 'kpis' || activeTab === 'history')) {
      setActiveTab('personnel');
    }
  }, [isAdmin, isEraUser, isConsultantUser, activeTab]);

  // Search & Filter States for Personnel
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelCategoryFilter, setPersonnelCategoryFilter] = useState('ALL');
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState('ALL');

  // Search & Filter States for Invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [invoiceDatePreset, setInvoiceDatePreset] = useState<'ALL' | 'THIS_YEAR' | 'LAST_6_MONTHS' | 'THIS_QUARTER' | 'CUSTOM'>('ALL');

  const handleSelectDatePreset = (preset: 'ALL' | 'THIS_YEAR' | 'LAST_6_MONTHS' | 'THIS_QUARTER' | 'CUSTOM') => {
    setInvoiceDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    if (preset === 'ALL') {
      setInvoiceStartDate('');
      setInvoiceEndDate('');
    } else if (preset === 'THIS_YEAR') {
      setInvoiceStartDate(`${y}-01-01`);
      setInvoiceEndDate(`${y}-12-31`);
    } else if (preset === 'LAST_6_MONTHS') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      setInvoiceStartDate(sixMonthsAgo.toISOString().split('T')[0]);
      setInvoiceEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'THIS_QUARTER') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const qStartMonth = String(currentQuarter * 3 + 1).padStart(2, '0');
      const qEndMonth = String(currentQuarter * 3 + 3).padStart(2, '0');
      const lastDayOfQ = new Date(y, currentQuarter * 3 + 3, 0).getDate();
      setInvoiceStartDate(`${y}-${qStartMonth}-01`);
      setInvoiceEndDate(`${y}-${qEndMonth}-${lastDayOfQ}`);
    }
  };

  // Search & Filter States for Personnel Action Audit Log
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  const filteredAuditLogs = useMemo(() => {
    return (consultant.personnelAuditLog || []).filter(log => {
      const matchesSearch = 
        !auditSearchQuery ||
        log.adminUser.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.personnelName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.position.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.category.toLowerCase().includes(auditSearchQuery.toLowerCase());
      
      const matchesAction = auditActionFilter === 'ALL' || log.actionType === auditActionFilter;

      let matchesDate = true;
      if (auditStartDate) {
        const logDateOnly = log.timestamp.substring(0, 10);
        if (logDateOnly < auditStartDate) matchesDate = false;
      }
      if (auditEndDate) {
        const logDateOnly = log.timestamp.substring(0, 10);
        if (logDateOnly > auditEndDate) matchesDate = false;
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [consultant.personnelAuditLog, auditSearchQuery, auditActionFilter, auditStartDate, auditEndDate]);

  // Modals state
  const [isEditConsultantOpen, setIsEditConsultantOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isWorkloadReportOpen, setIsWorkloadReportOpen] = useState(false);
  const [isAssignNewConsultantOpen, setIsAssignNewConsultantOpen] = useState(false);
  const [isEditHeadOfficeQuickOpen, setIsEditHeadOfficeQuickOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<ConsultantPersonnel | null>(null);
  const [personnelToReplace, setPersonnelToReplace] = useState<ConsultantPersonnel | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ConsultantInvoice | null>(null);
  const [viewDetailPersonnel, setViewDetailPersonnel] = useState<ConsultantPersonnel | null>(null);
  const [selectedHistoricalConsultant, setSelectedHistoricalConsultant] = useState<HistoricalSupervisionConsultant | null>(null);
  const [invoiceViewMode, setInvoiceViewMode] = useState<'table' | 'cards' | 'calculationTables'>('table');
  const [selectedInvoiceForPdfModal, setSelectedInvoiceForPdfModal] = useState<ConsultantInvoice | null>(null);
  const [isInlineTableEdit, setIsInlineTableEdit] = useState<boolean>(false);

  // Form state for Replacing Personnel with a Successor
  const [replaceForm, setReplaceForm] = useState({
    replacementDate: new Date().toISOString().split('T')[0],
    reason: 'Contractual personnel replacement and site demobilization approved by Employer',
    successorName: '',
    successorPosition: '',
    successorCategory: 'Key Personnel',
    successorQualification: '',
    successorExperience: 10,
    successorAllocatedMM: 24,
    successorInputMM: 0,
    successorPhone: '',
    successorEmail: '',
    successorSiteStation: '',
    successorRemarks: ''
  });

  // Automatically pulls sub-table totals and populates fields in Table 1.1 — Summary of Contract Price
  const syncTable11SummaryAndSubTables = (scheduleData: ContractCondition1Data): ContractCondition1Data => {
    const fees = (scheduleData.staffFees || []).reduce((sum, r) => sum + (Number(r.totalEtb) || 0), 0);
    const reimb = scheduleData.reimbursableTotal ?? 9246789.75;
    const contingencyPct = Number(scheduleData.contingencyPct ?? 15);
    const vatPct = Number(scheduleData.vatPct ?? 15);

    const contingency = (fees + reimb) * (contingencyPct / 100);
    const baseBeforeVat = fees + reimb + contingency;
    const vat = baseBeforeVat * (vatPct / 100);
    const grandTotal = baseBeforeVat + vat;
    const totalManMonths = (scheduleData.staffFees || []).reduce((sum, r) => sum + (Number(r.totalMm) || 0), 0);

    return {
      ...scheduleData,
      totalManMonths,
      feesTimeBased: fees,
      reimbursableTotal: reimb,
      summary: {
        fees,
        reimbursableExpenses: reimb,
        contingency,
        vat,
        subTotal: grandTotal
      }
    };
  };

  // Dedicated ref to track sub-table totals fingerprint and prevent unnecessary re-renders
  const lastSyncedScheduleRef = useRef<string>('');

  // Dedicated memoized sync function watching sub-table totals and updating parent state only when values actually change
  const syncSubTableTotalsIfChanged = useCallback((scheduleData: ContractCondition1Data | undefined) => {
    if (!scheduleData) return;
    const fees = (scheduleData.staffFees || []).reduce((sum, r) => sum + (Number(r.totalEtb) || 0), 0);
    const mm = (scheduleData.staffFees || []).reduce((sum, r) => sum + (Number(r.totalMm) || 0), 0);
    const dlpMm = (scheduleData.staffFees || []).reduce((sum, r) => sum + (Number(r.mmDlp) || 0), 0);
    const reimb = scheduleData.reimbursableTotal ?? 0;
    const fingerprint = `${fees}|${mm}|${dlpMm}|${reimb}|${scheduleData.contingencyPct}|${scheduleData.vatPct}`;

    if (fingerprint !== lastSyncedScheduleRef.current) {
      lastSyncedScheduleRef.current = fingerprint;
      if (onUpdateProject && consultant) {
        const syncedSchedule = syncTable11SummaryAndSubTables(scheduleData);
        onUpdateProject({
          supervisionConsultant: {
            ...consultant,
            contractAmountSchedule: {
              ...consultant.contractAmountSchedule,
              condition1: syncedSchedule
            }
          }
        }, 'contract_amount_sync');
      }
    }
  }, [consultant, onUpdateProject]);

  useEffect(() => {
    if (consultant.contractAmountSchedule?.condition1) {
      syncSubTableTotalsIfChanged(consultant.contractAmountSchedule.condition1);
    }
  }, [consultant.contractAmountSchedule?.condition1, syncSubTableTotalsIfChanged]);

  // Form states for Consultant Profile
  const [consultantForm, setConsultantForm] = useState<SupervisionConsultantInfo>(consultant);
  const [editModalSection, setEditModalSection] = useState<'all' | 'firm' | 'financial' | 'dates' | 'headOffice' | 'residentEngineer' | 'scope'>('all');

  // Form state for Quick Head Office Edit
  const [headOfficeForm, setHeadOfficeForm] = useState({
    headOfficeAddress: consultant.headOfficeAddress || '',
    headOfficePhone: consultant.headOfficePhone || '',
    headOfficeEmail: consultant.headOfficeEmail || '',
    headOfficeContactPerson: consultant.headOfficeContactPerson || ''
  });

  // Keep consultantForm and headOfficeForm responsive to external updates (e.g. from Project Dossier edits)
  useEffect(() => {
    setConsultantForm(consultant);
    setHeadOfficeForm({
      headOfficeAddress: consultant.headOfficeAddress || '',
      headOfficePhone: consultant.headOfficePhone || '',
      headOfficeEmail: consultant.headOfficeEmail || '',
      headOfficeContactPerson: consultant.headOfficeContactPerson || ''
    });
  }, [consultant, project.id]);

  // Form state for Assigning New Consultant (Continuation of Service)
  const [newConsultantForm, setNewConsultantForm] = useState<{
    firmName: string;
    associationType: string;
    jvPartners: string;
    contractRefNo: string;
    contractSignDate: string;
    commencementDate: string;
    originalCompletionDate: string;
    revisedCompletionDate: string;
    originalFeeEtb: number;
    revisedFeeEtb: number;
    enableUsdPayments: boolean;
    originalFeeUsd: number;
    revisedFeeUsd: number;
    contractType: string;
    residentEngineerName: string;
    residentEngineerPhone: string;
    residentEngineerEmail: string;
    headOfficeAddress: string;
    headOfficePhone: string;
    headOfficeEmail: string;
    headOfficeContactPerson: string;
    siteOfficeLocation: string;
    scopeOfServices: string;
    handoverDate: string;
    transitionReason: string;
    transitionNotes: string;
    retainPersonnelMode: 'all' | 'key_only' | 'none';
  }>({
    firmName: '',
    associationType: 'Joint Venture (JV)',
    jvPartners: '',
    contractRefNo: `ERA/SC/${project.id || '01'}/PHASE-2`,
    contractSignDate: new Date().toISOString().split('T')[0],
    commencementDate: new Date().toISOString().split('T')[0],
    originalCompletionDate: '',
    revisedCompletionDate: '',
    originalFeeEtb: consultant.revisedFeeEtb || consultant.originalFeeEtb || 45000000,
    revisedFeeEtb: consultant.revisedFeeEtb || consultant.originalFeeEtb || 45000000,
    enableUsdPayments: Boolean(consultant.enableUsdPayments),
    originalFeeUsd: consultant.revisedFeeUsd || consultant.originalFeeUsd || 0,
    revisedFeeUsd: consultant.revisedFeeUsd || consultant.originalFeeUsd || 0,
    contractType: consultant.contractType || 'Time-Based',
    residentEngineerName: consultant.residentEngineerName || '',
    residentEngineerPhone: consultant.residentEngineerPhone || '',
    residentEngineerEmail: consultant.residentEngineerEmail || '',
    headOfficeAddress: '',
    headOfficePhone: '',
    headOfficeEmail: '',
    headOfficeContactPerson: '',
    siteOfficeLocation: consultant.siteOfficeLocation || 'Main Project Camp',
    scopeOfServices: consultant.scopeOfServices || 'Continuous engineering construction supervision and contract administration.',
    handoverDate: new Date().toISOString().split('T')[0],
    transitionReason: 'Completion of Assigned Service Duration (including approved extensions)',
    transitionNotes: 'Continuation of supervision services under new consultant agreement upon expiration of previous contract duration.',
    retainPersonnelMode: 'key_only'
  });

  // Form states for Personnel
  const [personnelForm, setPersonnelForm] = useState<Partial<ConsultantPersonnel>>({
    name: '',
    position: '',
    category: 'Key Personnel',
    assignmentDate: new Date().toISOString().split('T')[0],
    qualification: '',
    yearsExperience: 10,
    status: 'Active',
    manMonthsAllocated: 36,
    manMonthsInput: 0,
    contactPhone: '',
    contactEmail: '',
    siteStation: '',
    remarks: ''
  });

  // Form states for Invoice
  const [invoiceForm, setInvoiceForm] = useState<Partial<ConsultantInvoice>>({
    invoiceNo: `CON-INV-${String((consultant.invoices?.length || 0) + 1).padStart(2, '0')}`,
    billingPeriod: '',
    submissionDate: new Date().toISOString().split('T')[0],
    certificationDate: '',
    paymentDate: '',
    grossAmountEtb: 0,
    advanceDeductionEtb: 0,
    taxDeductionEtb: 0,
    netAmountEtb: 0,
    foreignCurrencyAmount: 0,
    foreignCurrencyCode: 'USD',
    status: 'Submitted',
    paymentReference: '',
    remarks: '',
    attachmentName: ''
  });

  // Schedule & Time Completion Tracking (Including Approved Extensions)
  const scheduleStatus = useMemo(() => {
    const effectiveCompletionDate = consultant.revisedCompletionDate || consultant.originalCompletionDate || '';
    let isTimeExpired = false;
    let daysRemaining = 0;
    let daysOverdue = 0;
    let timeElapsedPct = 0;
    let totalContractDays = 0;
    let elapsedDays = 0;

    if (consultant.commencementDate && effectiveCompletionDate) {
      const start = new Date(consultant.commencementDate).getTime();
      const end = new Date(effectiveCompletionDate).getTime();
      const now = new Date().getTime();

      if (!isNaN(start) && !isNaN(end) && end > start) {
        totalContractDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        elapsedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
        timeElapsedPct = Math.min(150, Math.max(0, (elapsedDays / totalContractDays) * 100));
        
        if (now > end) {
          isTimeExpired = true;
          daysOverdue = Math.ceil((now - end) / (1000 * 60 * 60 * 24));
          daysRemaining = 0;
        } else {
          daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        }
      }
    }

    return {
      effectiveCompletionDate,
      isTimeExpired,
      daysRemaining,
      daysOverdue,
      timeElapsedPct,
      totalContractDays,
      elapsedDays
    };
  }, [consultant.commencementDate, consultant.originalCompletionDate, consultant.revisedCompletionDate]);

  // Determine whether USD payments are active on this contract (centralized on Contract & Scope Profile)
  const hasUsdPayments = useMemo(() => {
    return project.enableUsdPayments === true || consultant.enableUsdPayments === true;
  }, [project.enableUsdPayments, consultant.enableUsdPayments]);

  // Calculations for Financials
  const financialSummary = useMemo(() => {
    const invoices = consultant.invoices || [];
    const totalGrossInvoiced = invoices.reduce((acc, inv) => acc + (inv.grossAmountEtb || 0), 0);
    const totalGrossInvoicedUsd = hasUsdPayments ? invoices.reduce((acc, inv) => acc + (inv.grossAmountUsd || 0), 0) : 0;
    const totalNetInvoiced = invoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalNetInvoicedUsd = hasUsdPayments ? invoices.reduce((acc, inv) => acc + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;
    const totalAdvanceDeducted = invoices.reduce((acc, inv) => acc + (inv.advanceDeductionEtb || 0), 0);
    const totalTaxesDeducted = invoices.reduce((acc, inv) => acc + (inv.taxDeductionEtb || 0), 0);
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const totalPaidEtb = paidInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalPaidUsd = hasUsdPayments ? paidInvoices.reduce((acc, inv) => acc + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;

    const certifiedInvoices = invoices.filter(inv => inv.status === 'Certified');
    const totalCertifiedPendingEtb = certifiedInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalCertifiedPendingUsd = hasUsdPayments ? certifiedInvoices.reduce((acc, inv) => acc + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;

    const submittedInvoices = invoices.filter(inv => inv.status === 'Submitted' || inv.status === 'Pending');
    const totalSubmittedPendingEtb = submittedInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalSubmittedPendingUsd = hasUsdPayments ? submittedInvoices.reduce((acc, inv) => acc + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;

    // Matured Overdue (>56 days) Fee Invoices
    const today = new Date();
    const maturedInvoices = invoices.filter(inv => {
      const isUnpaid = inv.status !== 'Paid' && inv.status !== 'Rejected';
      const refDateStr = inv.submissionDate || inv.certificationDate;
      if (refDateStr && isUnpaid) {
        const d = new Date(refDateStr);
        if (!isNaN(d.getTime())) {
          const days = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          return days > 56;
        }
      }
      return false;
    });
    const maturedInvoicesCount = maturedInvoices.length;
    const maturedPendingEtb = maturedInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const maturedPendingUsd = hasUsdPayments ? maturedInvoices.reduce((acc, inv) => acc + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;

    const totalOutstandingEtb = totalGrossInvoiced - totalPaidEtb;
    const contractBudgetEtb = consultant.revisedFeeEtb || consultant.originalFeeEtb || 1;
    const contractBudgetUsd = consultant.revisedFeeUsd || consultant.originalFeeUsd || 0;
    const financialUtilizationPct = (totalGrossInvoiced / contractBudgetEtb) * 100;
    const paymentDisbursementPct = totalGrossInvoiced > 0 ? (totalPaidEtb / totalNetInvoiced) * 100 : 0;

    return {
      totalGrossInvoiced,
      totalGrossInvoicedUsd,
      totalNetInvoiced,
      totalNetInvoicedUsd,
      totalAdvanceDeducted,
      totalTaxesDeducted,
      totalPaidEtb,
      totalPaidUsd,
      totalCertifiedPendingEtb,
      totalCertifiedPendingUsd,
      totalSubmittedPendingEtb,
      totalSubmittedPendingUsd,
      maturedInvoicesCount,
      maturedPendingEtb,
      maturedPendingUsd,
      totalOutstandingEtb,
      contractBudgetEtb,
      contractBudgetUsd,
      financialUtilizationPct,
      paymentDisbursementPct
    };
  }, [consultant, hasUsdPayments]);

  const invoiceTotals = useMemo(() => {
    const invs = consultant.invoices || [];
    const totalFees = invs.reduce((sum, inv) => sum + (inv.feesAmountEtb || 0), 0);
    const totalReimbursables = invs.reduce((sum, inv) => sum + (inv.reimbursableAmountEtb || 0), 0);
    const totalGross = invs.reduce((sum, inv) => sum + (inv.grossAmountEtb || ((inv.feesAmountEtb || 0) + (inv.reimbursableAmountEtb || 0))), 0);
    const totalDeductions = invs.reduce((sum, inv) => sum + ((inv.advanceDeductionEtb || 0) + (inv.taxDeductionEtb || 0)), 0);
    const totalNet = invs.reduce((sum, inv) => sum + (inv.netAmountEtb || 0), 0);
    const totalGrossUsd = hasUsdPayments ? invs.reduce((sum, inv) => sum + (inv.grossAmountUsd || 0), 0) : 0;
    const totalDeductionsUsd = hasUsdPayments ? invs.reduce((sum, inv) => sum + ((inv.advanceDeductionUsd || 0) + (inv.taxDeductionUsd || 0)), 0) : 0;
    const totalNetUsd = hasUsdPayments ? invs.reduce((sum, inv) => sum + (inv.netAmountUsd || inv.foreignCurrencyAmount || 0), 0) : 0;
    const totalUsd = totalNetUsd;
    const contractFee = consultant.revisedFeeEtb || consultant.originalFeeEtb || 0;
    const contractFeeUsd = consultant.revisedFeeUsd || consultant.originalFeeUsd || 0;
    const utilization = contractFee > 0 ? (totalGross / contractFee) * 100 : 0;
    return { totalFees, totalReimbursables, totalGross, totalDeductions, totalNet, totalGrossUsd, totalDeductionsUsd, totalNetUsd, totalUsd, contractFee, contractFeeUsd, utilization };
  }, [consultant.invoices, consultant.revisedFeeEtb, consultant.originalFeeEtb, consultant.revisedFeeUsd, consultant.originalFeeUsd, hasUsdPayments]);

  // Calculations for Personnel
  const personnelSummary = useMemo(() => {
    const list = consultant.personnel || [];
    const totalCount = list.length;
    const activeCount = list.filter(p => p.status === 'Active').length;
    const demobilizedCount = list.filter(p => p.status === 'Demobilized').length;
    const keyStaffCount = list.filter(p => p.category === 'Key Personnel').length;
    const totalAllocatedMM = list.reduce((acc, p) => acc + (p.manMonthsAllocated || 0), 0);
    const totalInputMM = list.reduce((acc, p) => acc + (p.manMonthsInput || 0), 0);
    const mmUtilizationPct = totalAllocatedMM > 0 ? (totalInputMM / totalAllocatedMM) * 100 : 0;

    return {
      totalCount,
      activeCount,
      demobilizedCount,
      keyStaffCount,
      totalAllocatedMM,
      totalInputMM,
      mmUtilizationPct
    };
  }, [consultant.personnel]);

  // Cross-module link: Staff presence in monthly invoices
  const staffAttendanceStats = useMemo(() => {
    const stats: Record<string, { count: number; totalMM: number; latestInvoice: string }> = {};
    (consultant.invoices || []).forEach(inv => {
      (inv.attendanceRecords || []).forEach((rec: any) => {
        const mm = rec.thisInvoiceQty !== undefined 
          ? Number(rec.thisInvoiceQty) 
          : ((Number(rec.daysWorked || rec.days || 0)) / 30);
        const keys = [rec.personnelId, rec.id, rec.name?.toLowerCase().trim()].filter(Boolean);
        keys.forEach(k => {
          if (!stats[k]) {
            stats[k] = { count: 1, totalMM: mm, latestInvoice: inv.invoiceNo };
          } else {
            stats[k].count += 1;
            stats[k].totalMM += mm;
            stats[k].latestInvoice = inv.invoiceNo;
          }
        });
      });
    });
    return stats;
  }, [consultant.invoices]);

  // Cross-module link: Contract rates mapped from Condition 1 Schedule
  const contractRatesMap = useMemo(() => {
    const map: Record<string, number> = {};
    const savedC1 = consultant.contractAmountSchedule?.condition1;
    const staffList = savedC1?.staffFees && savedC1.staffFees.length > 0
      ? savedC1.staffFees
      : DEFAULT_CONDITION_1_STAFF;

    staffList.forEach(s => {
      const rate = Number(s.rateEtb) || 0;
      if (s.position) map[s.position.toLowerCase().trim()] = rate;
      if (s.name && s.name !== 'To be nominated' && s.name !== 'TBN') {
        map[s.name.toLowerCase().trim()] = rate;
      }
    });
    return map;
  }, [consultant.contractAmountSchedule]);

  // Cross-module link: Contract USD rates mapped from Condition 1 / Condition 2 Schedule
  const contractRatesUsdMap = useMemo(() => {
    const map: Record<string, number> = {};
    const savedC1 = consultant.contractAmountSchedule?.condition1;
    const staffList = savedC1?.staffFees && savedC1.staffFees.length > 0
      ? savedC1.staffFees
      : DEFAULT_CONDITION_1_STAFF;

    staffList.forEach(s => {
      const rateUsd = Number(s.rateUsd) || (s.fixedUsdRate ? Number(s.fixedUsdRate) : 0);
      if (rateUsd > 0) {
        if (s.position) map[s.position.toLowerCase().trim()] = rateUsd;
        if (s.name && s.name !== 'To be nominated' && s.name !== 'TBN') {
          map[s.name.toLowerCase().trim()] = rateUsd;
        }
      }
    });

    // Also check Condition 2 foreign rates if present
    const savedC2 = consultant.contractAmountSchedule?.condition2;
    if (savedC2?.staffFees) {
      savedC2.staffFees.forEach(s => {
        const rateUsd = Number(s.rateUsd) || 0;
        if (rateUsd > 0) {
          if (s.position) map[s.position.toLowerCase().trim()] = rateUsd;
          if (s.name && s.name !== 'To be nominated' && s.name !== 'TBN') {
            map[s.name.toLowerCase().trim()] = rateUsd;
          }
        }
      });
    }

    return map;
  }, [consultant.contractAmountSchedule]);

  // Comprehensive Cross-Module Contract Schedule & Overall Cost Calculation
  const contractScheduleSummary = useMemo(() => {
    const savedC1 = consultant.contractAmountSchedule?.condition1;
    const c1 = savedC1 || DEFAULT_CONDITION_1_DATA;
    const staffList = savedC1?.staffFees && savedC1.staffFees.length > 0
      ? savedC1.staffFees
      : DEFAULT_CONDITION_1_STAFF;
    const reimbList = savedC1?.reimbursableList && savedC1.reimbursableList.length > 0
      ? savedC1.reimbursableList
      : DEFAULT_CONDITION_1_REIMBURSABLES;

    // Baseline calculation
    const baselineStaffFees = staffList.reduce((acc, s) => acc + ((Number(s.totalMm) || (Number(s.mmConstr || 0) + Number(s.mmDlp || 0))) * (Number(s.rateEtb) || 0)), 0);
    const baselineReimb = reimbList.reduce((acc, r) => acc + (Number(r.amountEtb) || 0), 0);
    const baselineDirect = baselineStaffFees + baselineReimb;
    const contPct = Number(c1.contingencyPct ?? 15);
    const vatPct = Number(c1.vatPct ?? 15);
    const baselineCont = baselineDirect * (contPct / 100);
    const baselineBase = baselineDirect + baselineCont;
    const baselineVat = baselineBase * (vatPct / 100);
    const baselineOverall = baselineBase + baselineVat;

    // Incurred overall cost derived dynamically from invoice monthly man-month inputs
    const invoices = consultant.invoices || [];
    let staffExpendedFees = 0;
    let totalExpendedMM = 0;
    let reimbExpended = 0;

    invoices.forEach(inv => {
      (inv.attendanceRecords || []).forEach((rec: any) => {
        const qty = rec.thisInvoiceQty !== undefined 
          ? Number(rec.thisInvoiceQty) 
          : ((Number(rec.daysWorked || rec.days || 0)) / 30);
        const rate = Number(rec.rate) || 0;
        const amount = rec.thisInvoiceAmount !== undefined ? Number(rec.thisInvoiceAmount) : (qty * rate);
        staffExpendedFees += amount;
        totalExpendedMM += qty;
      });

      if (inv.reimbursableRecords && inv.reimbursableRecords.length > 0) {
        inv.reimbursableRecords.forEach((r: any) => {
          reimbExpended += Number(r.thisInvoiceAmount || 0);
        });
      } else if (inv.reimbursableAmountEtb) {
        reimbExpended += Number(inv.reimbursableAmountEtb || 0);
      }
    });

    const effectiveReimb = reimbExpended > 0 ? reimbExpended : (invoices.length > 0 ? (baselineReimb * Math.min(1, totalExpendedMM / 820)) : 0);
    const incurredDirect = staffExpendedFees + effectiveReimb;
    const incurredCont = incurredDirect * (contPct / 100);
    const incurredBase = incurredDirect + incurredCont;
    const incurredVat = incurredBase * (vatPct / 100);
    const incurredOverall = incurredBase + incurredVat;

    return {
      baselineStaffFees,
      baselineReimb,
      baselineOverall,
      reimbSubItemsCount: reimbList.length,
      staffExpendedFees,
      totalExpendedMM,
      effectiveReimb,
      incurredOverall,
      invoicesCount: invoices.length,
      remainingBalance: Math.max(0, baselineOverall - incurredOverall),
      utilizationPct: baselineOverall > 0 ? Math.min(100, (incurredOverall / baselineOverall) * 100) : 0
    };
  }, [consultant.contractAmountSchedule, consultant.invoices]);

  // Filtered Personnel List with interactive sorting
  const filteredPersonnel = useMemo(() => {
    let list = [...(consultant.personnel || [])];
    if (personnelCategoryFilter !== 'ALL') {
      list = list.filter(p => p.category === personnelCategoryFilter);
    }
    if (personnelStatusFilter !== 'ALL') {
      list = list.filter(p => p.status === personnelStatusFilter);
    }
    if (personnelSearch.trim()) {
      const q = personnelSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        (p.qualification && p.qualification.toLowerCase().includes(q)) ||
        (p.siteStation && p.siteStation.toLowerCase().includes(q)) ||
        (p.contactEmail && p.contactEmail.toLowerCase().includes(q)) ||
        (p.contactPhone && p.contactPhone.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      // Demobilized & Replaced taken to bottom unless specifically sorting
      const isInactiveA = a.status === 'Demobilized' || a.status === 'Replaced';
      const isInactiveB = b.status === 'Demobilized' || b.status === 'Replaced';

      if (!isInactiveA && isInactiveB) return -1;
      if (isInactiveA && !isInactiveB) return 1;

      let cmp = 0;
      if (personnelSortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (personnelSortField === 'position') {
        cmp = (a.position || '').localeCompare(b.position || '');
      } else if (personnelSortField === 'assignmentDate') {
        cmp = (a.assignmentDate || '').localeCompare(b.assignmentDate || '');
      } else if (personnelSortField === 'manMonthsInput') {
        cmp = (Number(a.manMonthsInput) || 0) - (Number(b.manMonthsInput) || 0);
      } else if (personnelSortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return personnelSortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [consultant.personnel, personnelCategoryFilter, personnelStatusFilter, personnelSearch, personnelSortField, personnelSortOrder]);

  // Filtered Invoices List (Search, Status & Date Range Reporting Periods) with interactive sorting
  const filteredInvoices = useMemo(() => {
    let list = consultant.invoices || [];
    if (invoiceStatusFilter !== 'ALL') {
      list = list.filter(inv => inv.status === invoiceStatusFilter);
    }
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase();
      list = list.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.billingPeriod.toLowerCase().includes(q) ||
        (inv.paymentReference && inv.paymentReference.toLowerCase().includes(q)) ||
        (inv.remarks && inv.remarks.toLowerCase().includes(q))
      );
    }
    if (invoiceStartDate) {
      list = list.filter(inv => {
        const d = inv.submissionDate || inv.paymentDate || inv.certificationDate || '';
        if (d) {
          return d.substring(0, 10) >= invoiceStartDate;
        }
        return true;
      });
    }
    if (invoiceEndDate) {
      list = list.filter(inv => {
        const d = inv.submissionDate || inv.paymentDate || inv.certificationDate || '';
        if (d) {
          return d.substring(0, 10) <= invoiceEndDate;
        }
        return true;
      });
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (invoiceSortField === 'invoiceNo') {
        cmp = (a.invoiceNo || '').localeCompare(b.invoiceNo || '');
      } else if (invoiceSortField === 'submissionDate') {
        const da = a.submissionDate || a.certificationDate || '';
        const db = b.submissionDate || b.certificationDate || '';
        cmp = da.localeCompare(db);
      } else if (invoiceSortField === 'grossAmountEtb') {
        cmp = (a.grossAmountEtb || 0) - (b.grossAmountEtb || 0);
      } else if (invoiceSortField === 'netAmountEtb') {
        cmp = (a.netAmountEtb || 0) - (b.netAmountEtb || 0);
      } else if ((invoiceSortField as string) === 'foreignCurrencyAmount') {
        cmp = (a.foreignCurrencyAmount || 0) - (b.foreignCurrencyAmount || 0);
      } else if (invoiceSortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return invoiceSortOrder === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [consultant.invoices, invoiceStatusFilter, invoiceSearch, invoiceStartDate, invoiceEndDate, invoiceSortField, invoiceSortOrder]);

  // RFI performance KPI summary for executive card
  const rfiKpiSummary = useMemo(() => {
    const list = consultant.submittalKpis !== undefined 
      ? consultant.submittalKpis 
      : (project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : []);
    const rfis = list.filter(s => s.type === 'RFI' && s.actualDays !== undefined);
    const target = (consultant.targetOverrides && consultant.targetOverrides['RFI']) || 7;
    const avgDays = rfis.length > 0
      ? parseFloat((rfis.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / rfis.length).toFixed(1))
      : 0;
    const isFaster = avgDays <= target;
    const pctDiff = Math.abs(((target - avgDays) / target) * 100).toFixed(0);
    return { avgDays, target, isFaster, pctDiff, totalCount: list.length };
  }, [consultant.submittalKpis, consultant.targetOverrides, project.id]);

  // Check if current contract is a Joint Venture
  const isJvContract = consultant.associationType !== 'Sole Consultant';

  // JV entities and Share Percentages
  const parsedJv = useMemo(() => {
    return parseJvEntities(consultant.firmName, consultant.jvPartners, consultant.associationType);
  }, [consultant.firmName, consultant.jvPartners, consultant.associationType]);

  const leadSharePct = consultant.leadSharePct || 60;
  const partnerSharePct = consultant.partnerSharePct || 40;

  // Likert ratings per dimension
  const leadLikertRatings = useMemo(() => {
    const defaultRatings = { A: 4, B: 4, C: 4, D: 4, E: 4 };
    const stored = consultant.partnerLikertRatings?.leadFirm;
    if (stored) return { ...defaultRatings, ...stored };

    const evs = consultant.jvLeadEvaluations || {};
    return {
      A: evs['A1.1']?.score || 4,
      B: evs['B1.1']?.score || 4,
      C: evs['C1.1']?.score || 4,
      D: evs['D1.1']?.score || 4,
      E: evs['E1.1']?.score || 4,
    };
  }, [consultant.partnerLikertRatings?.leadFirm, consultant.jvLeadEvaluations]);

  const partnerLikertRatings = useMemo(() => {
    const defaultRatings = { A: 4, B: 4, C: 4, D: 4, E: 4 };
    const stored = consultant.partnerLikertRatings?.partnerFirm;
    if (stored) return { ...defaultRatings, ...stored };

    const evs = consultant.jvPartnerEvaluations || {};
    return {
      A: evs['A1.1']?.score || 4,
      B: evs['B1.1']?.score || 4,
      C: evs['C1.1']?.score || 4,
      D: evs['D1.1']?.score || 4,
      E: evs['E1.1']?.score || 4,
    };
  }, [consultant.partnerLikertRatings?.partnerFirm, consultant.jvPartnerEvaluations]);

  // Derived JV Scores
  const jvScoreSummary = useMemo(() => {
    const leadSum = Object.values(leadLikertRatings).reduce<number>((a, b) => a + Number(b), 0);
    const partnerSum = Object.values(partnerLikertRatings).reduce<number>((a, b) => a + Number(b), 0);

    const leadScore = Number(((leadSum / 25) * 100).toFixed(1));
    const partnerScore = Number(((partnerSum / 25) * 100).toFixed(1));

    const leadGrade = evaluateQualitativeGrade(leadScore).grade.replace('Grade ', '').trim();
    const partnerGrade = evaluateQualitativeGrade(partnerScore).grade.replace('Grade ', '').trim();

    const weightedJvScore = Number(((leadScore * (leadSharePct / 100)) + (partnerScore * (partnerSharePct / 100))).toFixed(1));
    const weightedGrade = evaluateQualitativeGrade(weightedJvScore).grade.replace('Grade ', '').trim();

    return {
      leadScore: consultant.leadFirmScore !== undefined ? consultant.leadFirmScore : leadScore,
      leadGrade: consultant.leadFirmGrade || leadGrade,
      partnerScore: consultant.partnerFirmScore !== undefined ? consultant.partnerFirmScore : partnerScore,
      partnerGrade: consultant.partnerFirmGrade || partnerGrade,
      weightedJvScore: consultant.overallEvaluationScore !== undefined ? consultant.overallEvaluationScore : weightedJvScore,
      weightedJvGrade: consultant.officialEvaluationGrade ? consultant.officialEvaluationGrade.replace('Grade ', '').trim() : weightedGrade,
      calcLeadScore: leadScore,
      calcPartnerScore: partnerScore,
      calcWeightedJvScore: weightedJvScore,
    };
  }, [leadLikertRatings, partnerLikertRatings, leadSharePct, partnerSharePct, consultant.leadFirmScore, consultant.leadFirmGrade, consultant.partnerFirmScore, consultant.partnerFirmGrade, consultant.overallEvaluationScore, consultant.officialEvaluationGrade]);

  // Handler for setting Likert scale rating (1-5) for a dimension
  const handleSetJvLikertRating = (entity: 'lead' | 'partner', dimKey: string, ratingVal: number) => {
    if (isReadonly || !isAdmin) return;
    const nowIso = new Date().toISOString();

    const nextLeadLikert = { ...leadLikertRatings, ...(entity === 'lead' ? { [dimKey]: ratingVal } : {}) };
    const nextPartnerLikert = { ...partnerLikertRatings, ...(entity === 'partner' ? { [dimKey]: ratingVal } : {}) };

    const leadSum = Object.values(nextLeadLikert).reduce<number>((a, b) => a + Number(b), 0);
    const partnerSum = Object.values(nextPartnerLikert).reduce<number>((a, b) => a + Number(b), 0);

    const newLeadScore = Number(((leadSum / 25) * 100).toFixed(1));
    const newPartnerScore = Number(((partnerSum / 25) * 100).toFixed(1));

    const newLeadGrade = evaluateQualitativeGrade(newLeadScore).grade.replace('Grade ', '').trim();
    const newPartnerGrade = evaluateQualitativeGrade(newPartnerScore).grade.replace('Grade ', '').trim();

    const newWeightedJvScore = Number(((newLeadScore * (leadSharePct / 100)) + (newPartnerScore * (partnerSharePct / 100))).toFixed(1));
    const newWeightedGrade = evaluateQualitativeGrade(newWeightedJvScore).grade.replace('Grade ', '').trim();

    const updatedJvLeadEvals = { ...(consultant.jvLeadEvaluations || {}) };
    const updatedJvPartnerEvals = { ...(consultant.jvPartnerEvaluations || {}) };

    ['A', 'B', 'C', 'D', 'E'].forEach(d => {
      const code = `${d}1.1`;
      updatedJvLeadEvals[code] = { score: Number(nextLeadLikert[d as keyof typeof nextLeadLikert]), evaluatedAt: nowIso };
      updatedJvPartnerEvals[code] = { score: Number(nextPartnerLikert[d as keyof typeof nextPartnerLikert]), evaluatedAt: nowIso };
    });

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      leadSharePct,
      partnerSharePct,
      leadFirmName: parsedJv.leadName,
      partnerFirmName: parsedJv.partnerName,
      leadFirmScore: newLeadScore,
      leadFirmGrade: newLeadGrade,
      partnerFirmScore: newPartnerScore,
      partnerFirmGrade: newPartnerGrade,
      overallEvaluationScore: newWeightedJvScore,
      officialEvaluationGrade: `Grade ${newWeightedGrade}` as any,
      performanceRating: (newWeightedJvScore >= 80 ? 'Outstanding' : newWeightedJvScore >= 70 ? 'Satisfactory' : newWeightedJvScore >= 60 ? 'Needs Improvement' : 'Critical') as any,
      jvLeadEvaluations: updatedJvLeadEvals,
      jvPartnerEvaluations: updatedJvPartnerEvals,
      partnerLikertRatings: {
        leadFirm: nextLeadLikert,
        partnerFirm: nextPartnerLikert
      },
      individualFirmScores: {
        leadFirm: { name: parsedJv.leadName, score: newLeadScore, grade: newLeadGrade, evaluatedAt: nowIso },
        partnerFirm: { name: parsedJv.partnerName, score: newPartnerScore, grade: newPartnerGrade, evaluatedAt: nowIso }
      }
    };

    saveConsultantData(updatedConsultant, `Updated JV Partner Likert Rating for Dim ${dimKey} (${entity.toUpperCase()})`);
  };

  // Handler for updating JV Partner Share Percentages with 100% total validation rule
  const handleUpdateJvSharePct = (entity: 'lead' | 'partner', val: number) => {
    if (isReadonly || !isAdmin) return;
    const sanitizedVal = Math.max(1, Math.min(99, val));
    const newLeadShare = entity === 'lead' ? sanitizedVal : 100 - sanitizedVal;
    const newPartnerShare = entity === 'partner' ? sanitizedVal : 100 - sanitizedVal;

    const newWeightedJvScore = Number(((jvScoreSummary.calcLeadScore * (newLeadShare / 100)) + (jvScoreSummary.calcPartnerScore * (newPartnerShare / 100))).toFixed(1));
    const newWeightedGrade = evaluateQualitativeGrade(newWeightedJvScore).grade.replace('Grade ', '').trim();

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      leadSharePct: newLeadShare,
      partnerSharePct: newPartnerShare,
      overallEvaluationScore: newWeightedJvScore,
      officialEvaluationGrade: `Grade ${newWeightedGrade}` as any,
    };

    saveConsultantData(updatedConsultant, `Updated JV Share percentages (Lead: ${newLeadShare}%, Associate: ${newPartnerShare}%)`);
  };

  // Helper to commit consultant changes to project
  const saveConsultantData = (updatedConsultant: SupervisionConsultantInfo, actionDescription: string) => {
    if (!onUpdateProject) return;
    const cleanFirmName = (updatedConsultant.firmName || '').trim();
    onUpdateProject({
      supervisionConsultant: {
        ...updatedConsultant,
        firmName: cleanFirmName
      },
      consultant: cleanFirmName // Keep backward compatibility & synchronize with Project Information
    }, `Supervision Consultant: ${actionDescription}`);
  };

  // Handler for saving Consultant General Profile
  const handleSaveConsultantProfile = () => {
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      ...consultantForm,
      jvPartners: consultantForm.associationType === 'Sole Consultant' ? '' : consultantForm.jvPartners,
      originalFeeEtb: Number(consultantForm.originalFeeEtb) || 0,
      revisedFeeEtb: Number(consultantForm.revisedFeeEtb) || Number(consultantForm.originalFeeEtb) || 0,
      enableUsdPayments: Boolean(consultantForm.enableUsdPayments),
      originalFeeUsd: consultantForm.enableUsdPayments ? Number(consultantForm.originalFeeUsd) || 0 : 0,
      revisedFeeUsd: consultantForm.enableUsdPayments ? Number(consultantForm.revisedFeeUsd) || Number(consultantForm.originalFeeUsd) || 0 : 0,
    };
    saveConsultantData(updatedConsultant, 'Updated supervision consultant contract details & specifications');
    setHeadOfficeForm({
      headOfficeAddress: updatedConsultant.headOfficeAddress || '',
      headOfficePhone: updatedConsultant.headOfficePhone || '',
      headOfficeEmail: updatedConsultant.headOfficeEmail || '',
      headOfficeContactPerson: updatedConsultant.headOfficeContactPerson || ''
    });
    setIsEditConsultantOpen(false);
  };

  // Quick Head Office Save Handler
  const handleSaveHeadOfficeQuick = () => {
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      headOfficeAddress: headOfficeForm.headOfficeAddress,
      headOfficePhone: headOfficeForm.headOfficePhone,
      headOfficeEmail: headOfficeForm.headOfficeEmail,
      headOfficeContactPerson: headOfficeForm.headOfficeContactPerson
    };
    saveConsultantData(updatedConsultant, 'Updated head office contact & address information');
    setIsEditHeadOfficeQuickOpen(false);
  };

  // Handler for Opening Assign New Consultant Modal
  const handleOpenAssignNewConsultant = () => {
    const defaultCommence = scheduleStatus.effectiveCompletionDate 
      ? new Date(new Date(scheduleStatus.effectiveCompletionDate).getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const prevCount = (consultant.previousConsultants?.length || 0) + 2;

    setNewConsultantForm({
      firmName: '',
      associationType: 'Joint Venture (JV)',
      jvPartners: '',
      contractRefNo: `ERA/SC/${project.id || '01'}/PHASE-${prevCount}`,
      contractSignDate: new Date().toISOString().split('T')[0],
      commencementDate: defaultCommence,
      originalCompletionDate: '',
      revisedCompletionDate: '',
      originalFeeEtb: consultant.revisedFeeEtb || consultant.originalFeeEtb || 45000000,
      revisedFeeEtb: consultant.revisedFeeEtb || consultant.originalFeeEtb || 45000000,
      enableUsdPayments: Boolean(consultant.enableUsdPayments),
      originalFeeUsd: consultant.revisedFeeUsd || consultant.originalFeeUsd || 0,
      revisedFeeUsd: consultant.revisedFeeUsd || consultant.originalFeeUsd || 0,
      contractType: consultant.contractType || 'Time-Based',
      residentEngineerName: consultant.residentEngineerName || '',
      residentEngineerPhone: consultant.residentEngineerPhone || '',
      residentEngineerEmail: consultant.residentEngineerEmail || '',
      headOfficeAddress: '',
      headOfficePhone: '',
      headOfficeEmail: '',
      headOfficeContactPerson: '',
      siteOfficeLocation: consultant.siteOfficeLocation || 'Main Project Camp',
      scopeOfServices: consultant.scopeOfServices || 'Continuous engineering construction supervision and contract administration.',
      handoverDate: new Date().toISOString().split('T')[0],
      transitionReason: scheduleStatus.isTimeExpired 
        ? 'Completion of Assigned Service Duration (including approved extensions)' 
        : 'Contract Continuation & Re-assignment of Supervision Services',
      transitionNotes: 'Continuation of supervision services under new consultant agreement upon completion of predecessor contract tenure.',
      retainPersonnelMode: 'key_only'
    });
    setIsAssignNewConsultantOpen(true);
  };

  // Handler for Confirming New Consultant Service Continuation
  const handleConfirmAssignNewConsultant = () => {
    if (!newConsultantForm.firmName?.trim()) {
      alert('Please enter the new consulting firm / JV name.');
      return;
    }
    if (!newConsultantForm.contractRefNo?.trim()) {
      alert('Please enter the new supervision contract reference number.');
      return;
    }
    if (!newConsultantForm.commencementDate) {
      alert('Please enter the commencement date for the new consultant service.');
      return;
    }

    // Calculate outgoing consultant's evaluation metrics for snapshot
    const currentSubmittals = consultant.submittalKpis !== undefined 
      ? consultant.submittalKpis 
      : (project.id === 'proj_default' ? DEFAULT_SUBMITTAL_KPIS : []);
    
    const resolvedSubmittals = currentSubmittals.filter(s => s.actualDays !== undefined && s.actualDays !== null);
    const targetMap = { ...DEFAULT_SLA_TARGETS, ...(consultant.targetOverrides || {}) };
    const onTimeCount = resolvedSubmittals.filter(s => {
      const target = targetMap[s.type] || s.targetDays || 7;
      return (s.actualDays || 0) <= target;
    }).length;
    const slaRate = resolvedSubmittals.length > 0 ? Math.round((onTimeCount / resolvedSubmittals.length) * 100) : 90;
    const avgTurnaround = resolvedSubmittals.length > 0
      ? Number((resolvedSubmittals.reduce((sum, s) => sum + (s.actualDays || 0), 0) / resolvedSubmittals.length).toFixed(1))
      : 5.0;

    let evalGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
    let evalScore = 80;
    if (slaRate >= 90) { evalGrade = 'A'; evalScore = 92; }
    else if (slaRate >= 75) { evalGrade = 'B'; evalScore = 82; }
    else if (slaRate >= 60) { evalGrade = 'C'; evalScore = 68; }
    else { evalGrade = 'D'; evalScore = 52; }

    // Snapshot outgoing consultant into previousConsultants archive
    const archivedPredecessor: HistoricalSupervisionConsultant = {
      id: 'hist_sc_' + Date.now(),
      firmName: consultant.firmName,
      associationType: consultant.associationType,
      jvPartners: consultant.jvPartners,
      contractRefNo: consultant.contractRefNo,
      commencementDate: consultant.commencementDate,
      originalCompletionDate: consultant.originalCompletionDate,
      revisedCompletionDate: consultant.revisedCompletionDate,
      handoverDate: newConsultantForm.handoverDate || new Date().toISOString().split('T')[0],
      transitionReason: newConsultantForm.transitionReason,
      transitionNotes: newConsultantForm.transitionNotes,
      originalFeeEtb: consultant.originalFeeEtb,
      revisedFeeEtb: consultant.revisedFeeEtb,
      enableUsdPayments: consultant.enableUsdPayments,
      originalFeeUsd: consultant.originalFeeUsd,
      revisedFeeUsd: consultant.revisedFeeUsd,
      totalInvoicedEtb: financialSummary.totalGrossInvoiced,
      totalPaidEtb: financialSummary.totalPaidEtb,
      residentEngineerName: consultant.residentEngineerName,
      residentEngineerPhone: consultant.residentEngineerPhone,
      residentEngineerEmail: consultant.residentEngineerEmail,
      headOfficeAddress: consultant.headOfficeAddress,
      headOfficePhone: consultant.headOfficePhone,
      headOfficeEmail: consultant.headOfficeEmail,
      headOfficeContactPerson: consultant.headOfficeContactPerson,
      siteOfficeLocation: consultant.siteOfficeLocation,
      scopeOfServices: consultant.scopeOfServices,
      personnelSnapshotCount: (consultant.personnel || []).length,
      invoicesSnapshotCount: (consultant.invoices || []).length,
      archivedAt: new Date().toISOString(),
      archivedBy: currentUser?.username || 'ERA Project Admin',
      personnel: [...(consultant.personnel || [])],
      invoices: [...(consultant.invoices || [])],
      contractAmountSchedule: consultant.contractAmountSchedule ? JSON.parse(JSON.stringify(consultant.contractAmountSchedule)) : undefined,
      isContractLocked: Boolean(consultant.isContractLocked || project.isAmountLocked || consultant.contractAmountSchedule?.condition1?.isLocked),
      // Evaluation snapshot
      performanceRating: consultant.performanceRating || (evalScore >= 85 ? 'Outstanding' : 'Satisfactory'),
      officialGrade: evalGrade,
      evaluationScore: evalScore,
      slaComplianceRatePct: slaRate,
      submittalKpis: [...currentSubmittals],
      targetOverrides: consultant.targetOverrides ? { ...consultant.targetOverrides } : undefined,
      evaluationCriteria: consultant.evaluationCriteria ? [...consultant.evaluationCriteria] : undefined,
      evaluationSummary: {
        slaScore: slaRate, // Submittal log SLA score = evaluation score of Submittal log & operational SLA turnaround
        staffingScore: 16,
        ipcScore: 18,
        contractAdminScore: 18,
        qualityScore: 13,
        totalWeightedScore: evalScore,
        grade: `Grade ${evalGrade}`,
        avgTurnaroundDays: avgTurnaround,
        submittalsCount: currentSubmittals.length,
        onTimePct: slaRate
      }
    };

    // Personnel handling based on retain mode
    let newPersonnelList: ConsultantPersonnel[] = [];
    if (newConsultantForm.retainPersonnelMode === 'all') {
      newPersonnelList = (consultant.personnel || []).map(p => ({
        ...p,
        id: 'pers_' + Math.random().toString(36).substring(2, 9),
        assignmentDate: newConsultantForm.commencementDate,
        status: 'Active' as const,
        manMonthsInput: 0
      }));
    } else if (newConsultantForm.retainPersonnelMode === 'key_only') {
      newPersonnelList = (consultant.personnel || [])
        .filter(p => p.category === 'Key Personnel')
        .map(p => ({
          ...p,
          id: 'pers_' + Math.random().toString(36).substring(2, 9),
          assignmentDate: newConsultantForm.commencementDate,
          status: 'Active' as const,
          manMonthsInput: 0
        }));
    }

    const updatedConsultantInfo: SupervisionConsultantInfo = {
      firmName: newConsultantForm.firmName.trim(),
      associationType: newConsultantForm.associationType as any || 'Joint Venture (JV)',
      jvPartners: newConsultantForm.jvPartners || '',
      contractRefNo: newConsultantForm.contractRefNo.trim(),
      contractSignDate: newConsultantForm.contractSignDate || new Date().toISOString().split('T')[0],
      commencementDate: newConsultantForm.commencementDate,
      originalCompletionDate: newConsultantForm.originalCompletionDate || '',
      revisedCompletionDate: newConsultantForm.revisedCompletionDate || '',
      originalFeeEtb: Number(newConsultantForm.originalFeeEtb) || 0,
      revisedFeeEtb: Number(newConsultantForm.revisedFeeEtb) || Number(newConsultantForm.originalFeeEtb) || 0,
      enableUsdPayments: Boolean(newConsultantForm.enableUsdPayments),
      originalFeeUsd: newConsultantForm.enableUsdPayments ? Number(newConsultantForm.originalFeeUsd) || 0 : 0,
      revisedFeeUsd: newConsultantForm.enableUsdPayments ? Number(newConsultantForm.revisedFeeUsd) || Number(newConsultantForm.originalFeeUsd) || 0 : 0,
      contractType: newConsultantForm.contractType as any || 'Time-Based',
      residentEngineerName: newConsultantForm.residentEngineerName || '',
      residentEngineerPhone: newConsultantForm.residentEngineerPhone || '',
      residentEngineerEmail: newConsultantForm.residentEngineerEmail || '',
      headOfficeAddress: newConsultantForm.headOfficeAddress || '',
      headOfficePhone: newConsultantForm.headOfficePhone || '',
      headOfficeEmail: newConsultantForm.headOfficeEmail || '',
      headOfficeContactPerson: newConsultantForm.headOfficeContactPerson || '',
      siteOfficeLocation: newConsultantForm.siteOfficeLocation || 'Main Project Camp',
      scopeOfServices: newConsultantForm.scopeOfServices || 'Continuous engineering construction supervision and contract administration.',
      performanceRating: 'Satisfactory',
      personnel: newPersonnelList,
      invoices: [], // Start clean invoice register for new consultant
      submittalKpis: [], // Start clean submittals register from commencement date
      isContractLocked: false,
      isAmountLocked: false,
      contractAmountSchedule: {
        condition1: {
          ...DEFAULT_CONDITION_1_DATA,
          contingencyPct: 10,
          isLocked: false
        }
      },
      previousConsultants: [archivedPredecessor, ...(consultant.previousConsultants || [])]
    };

    if (onUpdateProject) {
      onUpdateProject({
        supervisionConsultant: updatedConsultantInfo,
        consultant: updatedConsultantInfo.firmName,
        isAmountLocked: false
      }, `Assigned new supervision consultant: ${updatedConsultantInfo.firmName} (Continuation of Service)`);
    } else {
      saveConsultantData(updatedConsultantInfo, `Assigned new supervision consultant: ${updatedConsultantInfo.firmName} (Continuation of Service)`);
    }
    setIsAssignNewConsultantOpen(false);
    setActiveTab('contract_data');
    setInAppNotification({
      type: 'success',
      message: `Assigned new consultant ${updatedConsultantInfo.firmName}. Predecessor records are fully booked under Service History, and Contract Data is now unlocked.`
    });
  };

  // Handler for Add/Edit Personnel
  const handleOpenAddPersonnel = () => {
    setPersonnelForm({
      name: '',
      position: '',
      category: 'Key Personnel',
      assignmentDate: new Date().toISOString().split('T')[0],
      qualification: '',
      yearsExperience: 10,
      status: 'Active',
      manMonthsAllocated: 36,
      manMonthsInput: 0,
      contactPhone: '',
      contactEmail: '',
      siteStation: 'Main Camp',
      remarks: ''
    });
    setSelectedPersonnel(null);
    setIsPersonnelModalOpen(true);
  };

  const handleOpenEditPersonnel = (p: ConsultantPersonnel) => {
    setPersonnelForm(p);
    setSelectedPersonnel(p);
    setIsPersonnelModalOpen(true);
  };

  // Helper to record personnel action audit log entry
  const recordPersonnelAuditLog = (
    currentLog: PersonnelAuditLogEntry[] = [],
    actionType: 'ASSIGNED' | 'REMOVED' | 'PERMANENT_DELETION' | 'STATUS_CHANGE',
    personnelName: string,
    position: string,
    category: string,
    details: string
  ): PersonnelAuditLogEntry[] => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const adminUser = currentUser?.username || 'ERA System Administrator';
    const entry: PersonnelAuditLogEntry = {
      id: 'paudit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp,
      adminUser,
      actionType,
      personnelName,
      position,
      category,
      details
    };
    return [entry, ...currentLog];
  };

  const handleSavePersonnel = () => {
    if (!personnelForm.name?.trim() || !personnelForm.position?.trim()) {
      alert('Please enter both the personnel name and specific position.');
      return;
    }
    if (!personnelForm.assignmentDate) {
      alert('Please specify the date of assignment.');
      return;
    }

    const currentList = consultant.personnel || [];
    const currentHistory = consultant.personnelHistory || currentList;
    const currentAuditLog = consultant.personnelAuditLog || [];
    let updatedList: ConsultantPersonnel[];
    let updatedHistory: ConsultantPersonnel[];

    const isDemobOrReplaced = personnelForm.status === 'Demobilized' || personnelForm.status === 'Replaced';
    const todayDate = new Date().toISOString().split('T')[0];
    const effectiveDemobDate = isDemobOrReplaced
      ? (personnelForm.demobilizationDate || todayDate)
      : (personnelForm.demobilizationDate || '');

    const resolvedPersonnelForm = {
      ...personnelForm,
      demobilizationDate: effectiveDemobDate
    };

    const actionDesc = selectedPersonnel 
      ? `Updated staff assignment record for ${resolvedPersonnelForm.name} (${resolvedPersonnelForm.position})${isDemobOrReplaced ? ` (Commitment completion date set to ${effectiveDemobDate})` : ''}` 
      : `Assigned new staff member ${resolvedPersonnelForm.name} as ${resolvedPersonnelForm.position}`;
    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      isDemobOrReplaced ? 'STATUS_CHANGE' : 'ASSIGNED',
      resolvedPersonnelForm.name || '',
      resolvedPersonnelForm.position || '',
      resolvedPersonnelForm.category || 'Key Personnel',
      actionDesc
    );

    if (selectedPersonnel) {
      // Edit
      updatedList = currentList.map(item => 
        item.id === selectedPersonnel.id ? { ...item, ...resolvedPersonnelForm } as ConsultantPersonnel : item
      );
      updatedHistory = currentHistory.map(item =>
        item.id === selectedPersonnel.id ? { ...item, ...resolvedPersonnelForm } as ConsultantPersonnel : item
      );
    } else {
      // Add new / insert assignment
      const newItem: ConsultantPersonnel = {
        id: 'pers_' + Date.now(),
        name: resolvedPersonnelForm.name || '',
        position: resolvedPersonnelForm.position || '',
        category: resolvedPersonnelForm.category || 'Key Personnel',
        assignmentDate: resolvedPersonnelForm.assignmentDate || todayDate,
        demobilizationDate: resolvedPersonnelForm.demobilizationDate || '',
        qualification: resolvedPersonnelForm.qualification || '',
        yearsExperience: Number(resolvedPersonnelForm.yearsExperience) || 0,
        status: resolvedPersonnelForm.status as any || 'Active',
        manMonthsAllocated: Number(resolvedPersonnelForm.manMonthsAllocated) || 0,
        manMonthsInput: Number(resolvedPersonnelForm.manMonthsInput) || 0,
        contactPhone: resolvedPersonnelForm.contactPhone || '',
        contactEmail: resolvedPersonnelForm.contactEmail || '',
        siteStation: resolvedPersonnelForm.siteStation || '',
        remarks: resolvedPersonnelForm.remarks || ''
      };
      updatedList = [newItem, ...currentList];
      // Permanently preserve historical record in personnelHistory ensuring it remains even if deleted
      updatedHistory = [newItem, ...currentHistory.filter(h => h.id !== newItem.id)];
    }

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnel: updatedList,
      personnelHistory: updatedHistory,
      personnelAuditLog: updatedAuditLog
    };

    saveConsultantData(updatedConsultant, selectedPersonnel ? `Updated staff: ${personnelForm.name}` : `Assigned new staff: ${personnelForm.name}`);
    setIsPersonnelModalOpen(false);
  };

  const handleDeletePersonnel = (pId: string, pName: string) => {
    if (!isAdmin) {
      alert('Access Denied: Only administrators have the permission to delete assigned personnel.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${pName}" from the assigned personnel register?`)) {
      return;
    }
    const targetP = (consultant.personnel || []).find(item => item.id === pId);
    const currentAuditLog = consultant.personnelAuditLog || [];
    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      'REMOVED',
      pName,
      targetP?.position || 'Staff Member',
      targetP?.category || 'Personnel',
      `Removed staff member "${pName}" from active project register`
    );
    const updatedList = (consultant.personnel || []).filter(item => item.id !== pId);
    saveConsultantData({ 
      ...consultant, 
      personnel: updatedList,
      personnelAuditLog: updatedAuditLog
    }, `Removed staff: ${pName}`);
  };

  const handleDeletePersonnelHistory = (pId: string, pName: string) => {
    if (!isMasterAdmin) {
      alert('Access Denied: Only Master Administrators have permission to permanently delete historical personnel assignment records.');
      return;
    }
    if (!window.confirm(`[MASTER ADMIN] Are you sure you want to PERMANENTLY DELETE historical personnel record for "${pName}" from the system database audit trail? This action cannot be undone.`)) {
      return;
    }
    const currentAuditLog = consultant.personnelAuditLog || [];
    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      'PERMANENT_DELETION',
      pName,
      'Historical Record',
      'Audit Trail',
      `Permanently purged historical personnel record for "${pName}" from system database audit trail`
    );
    const updatedHistory = (consultant.personnelHistory || []).filter(item => item.id !== pId);
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnelHistory: updatedHistory,
      personnelAuditLog: updatedAuditLog
    };
    saveConsultantData(updatedConsultant, `Permanently deleted historical staff record: ${pName}`);
  };

  const handleDeletePersonnelAuditLog = (logId: string) => {
    if (!isMasterAdmin) {
      alert('Access Denied: Only Master Administrators have permission to delete Personnel Action Audit Log entries.');
      return;
    }
    const targetLog = (consultant.personnelAuditLog || []).find(l => l.id === logId);
    const confirmMessage = targetLog 
      ? `[MASTER ADMIN ONLY] Are you sure you want to permanently delete the audit log for "${targetLog.personnelName}" (${targetLog.actionType}) dated ${targetLog.timestamp}? This action cannot be undone.`
      : `[MASTER ADMIN ONLY] Are you sure you want to permanently delete this audit log entry?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const updatedAuditLog = (consultant.personnelAuditLog || []).filter(l => l.id !== logId);
    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnelAuditLog: updatedAuditLog
    };

    saveConsultantData(updatedConsultant, `[Master Admin] Deleted personnel audit log entry`);
  };

  const handleClearAllAuditLogs = () => {
    if (!isMasterAdmin) {
      alert('Access Denied: Only Master Administrators have permission to purge Personnel Action Audit Logs.');
      return;
    }
    const logCount = consultant.personnelAuditLog?.length || 0;
    if (logCount === 0) return;

    if (!window.confirm(`[MASTER ADMIN PRIVILEGE]\n\nWARNING: You are about to permanently purge ALL ${logCount} Personnel Action Audit Log records from this project's database.\n\nAre you sure you want to permanently delete all logs? This cannot be undone.`)) {
      return;
    }

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnelAuditLog: []
    };

    saveConsultantData(updatedConsultant, `[Master Admin] Cleared all ${logCount} personnel audit log records`);
  };

  const handleDeleteHistoricalPersonnelFromDossier = (histArchivedAt: string, pId: string, pName: string) => {
    if (!isMasterAdmin) {
      alert('Access Denied: Only Master Administrators have permission to permanently delete personnel from historical dossiers.');
      return;
    }
    if (!window.confirm(`[MASTER ADMIN] Are you sure you want to permanently delete staff member "${pName}" from this historical consultant dossier?`)) {
      return;
    }
    const currentAuditLog = consultant.personnelAuditLog || [];
    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      'PERMANENT_DELETION',
      pName,
      'Dossier Archive',
      'Predecessor Dossier',
      `Permanently deleted staff member "${pName}" from archived predecessor dossier (${histArchivedAt})`
    );

    const updatedPrevious = (consultant.previousConsultants || []).map(prev => {
      if (prev.archivedAt === histArchivedAt) {
        return {
          ...prev,
          personnel: (prev.personnel || []).filter(p => p.id !== pId)
        };
      }
      return prev;
    });

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      previousConsultants: updatedPrevious,
      personnelAuditLog: updatedAuditLog
    };

    saveConsultantData(updatedConsultant, `Permanently deleted historical personnel ${pName} from archived dossier`);
    if (selectedHistoricalConsultant && selectedHistoricalConsultant.archivedAt === histArchivedAt) {
      setSelectedHistoricalConsultant({
        ...selectedHistoricalConsultant,
        personnel: (selectedHistoricalConsultant.personnel || []).filter(p => p.id !== pId)
      });
    }
  };

  const handleTogglePersonnelStatus = (p: ConsultantPersonnel) => {
    const newStatus: 'Active' | 'Demobilized' = p.status === 'Active' ? 'Demobilized' : 'Active';
    const todayDate = new Date().toISOString().split('T')[0];
    const demobDate = newStatus === 'Demobilized' ? (p.demobilizationDate || todayDate) : '';

    const currentAuditLog = consultant.personnelAuditLog || [];
    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      'STATUS_CHANGE',
      p.name,
      p.position,
      p.category,
      `Changed employment status of "${p.name}" from ${p.status} to ${newStatus}${newStatus === 'Demobilized' ? ` (commitment completion date instantly recorded as ${demobDate}, moved to bottom of active roster, record preserved in history)` : ''}`
    );

    const updatedItem: ConsultantPersonnel = {
      ...p,
      status: newStatus,
      demobilizationDate: demobDate
    };

    const updatedList = (consultant.personnel || []).map(item => 
      item.id === p.id ? updatedItem : item
    );

    const currentHistory = consultant.personnelHistory || consultant.personnel || [];
    const historyExists = currentHistory.some(h => h.id === p.id);
    const updatedHistory = historyExists
      ? currentHistory.map(h => h.id === p.id ? updatedItem : h)
      : [updatedItem, ...currentHistory];

    saveConsultantData({ 
      ...consultant, 
      personnel: updatedList,
      personnelHistory: updatedHistory,
      personnelAuditLog: updatedAuditLog
    }, `Changed status of ${p.name} to ${newStatus}${newStatus === 'Demobilized' ? ` (Completion date: ${demobDate})` : ''}`);
  };

  const handleOpenReplacePersonnel = (p: ConsultantPersonnel) => {
    setPersonnelToReplace(p);
    const remainingMM = Math.max(0, (p.manMonthsAllocated || 0) - (p.manMonthsInput || 0));
    setReplaceForm({
      replacementDate: new Date().toISOString().split('T')[0],
      reason: 'Contractual personnel replacement and site demobilization approved by Employer',
      successorName: '',
      successorPosition: p.position || '',
      successorCategory: p.category || 'Key Personnel',
      successorQualification: '',
      successorExperience: p.yearsExperience || 10,
      successorAllocatedMM: remainingMM > 0 ? remainingMM : (p.manMonthsAllocated || 24),
      successorInputMM: 0,
      successorPhone: '',
      successorEmail: '',
      successorSiteStation: p.siteStation || '',
      successorRemarks: `Replacement successor for ${p.name} (${p.position}) effective from assignment date.`
    });
    setIsReplaceModalOpen(true);
  };

  const handleConfirmReplacePersonnel = () => {
    if (!personnelToReplace) return;
    if (!replaceForm.successorName?.trim()) {
      alert('Please enter the incoming replacement personnel full name.');
      return;
    }
    if (!replaceForm.replacementDate) {
      alert('Please specify the effective replacement / handover date.');
      return;
    }

    const currentList = consultant.personnel || [];
    const currentHistory = consultant.personnelHistory || currentList;
    const currentAuditLog = consultant.personnelAuditLog || [];

    const successorId = 'pers_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Outgoing personnel: marked as Replaced, demobilizationDate recorded, notes and successor linkage appended
    const updatedOutgoing: ConsultantPersonnel = {
      ...personnelToReplace,
      status: 'Replaced',
      demobilizationDate: replaceForm.replacementDate,
      replacedById: successorId,
      replacedByName: replaceForm.successorName.trim(),
      replacementDate: replaceForm.replacementDate,
      remarks: `${personnelToReplace.remarks ? personnelToReplace.remarks + ' | ' : ''}Replaced by ${replaceForm.successorName.trim()} on ${replaceForm.replacementDate}. Reason: ${replaceForm.reason}`
    };

    // Incoming new personnel: marked Active, assignmentDate set, predecessor linked
    const newSuccessor: ConsultantPersonnel = {
      id: successorId,
      name: replaceForm.successorName.trim(),
      position: replaceForm.successorPosition.trim() || personnelToReplace.position,
      category: replaceForm.successorCategory || personnelToReplace.category,
      assignmentDate: replaceForm.replacementDate,
      demobilizationDate: '',
      qualification: replaceForm.successorQualification.trim() || '',
      yearsExperience: Number(replaceForm.successorExperience) || 0,
      status: 'Active',
      manMonthsAllocated: Number(replaceForm.successorAllocatedMM) || 0,
      manMonthsInput: Number(replaceForm.successorInputMM) || 0,
      monthlyBillingRate: personnelToReplace.monthlyBillingRate,
      dailyReimbursableRate: personnelToReplace.dailyReimbursableRate,
      predecessorId: personnelToReplace.id,
      predecessorName: personnelToReplace.name,
      replacementDate: replaceForm.replacementDate,
      contactPhone: replaceForm.successorPhone.trim() || '',
      contactEmail: replaceForm.successorEmail.trim() || '',
      siteStation: replaceForm.successorSiteStation.trim() || personnelToReplace.siteStation || '',
      remarks: replaceForm.successorRemarks.trim() || `Successor replacing ${personnelToReplace.name} (${personnelToReplace.position})`
    };

    // Update list: outgoing is updated (which drops to bottom of table immediately) + incoming is added (active at top)
    const updatedList = [
      newSuccessor,
      ...currentList.map(item => item.id === personnelToReplace.id ? updatedOutgoing : item)
    ];

    // Keep both permanently in personnelHistory
    const updatedHistory = [
      newSuccessor,
      updatedOutgoing,
      ...currentHistory.filter(h => h.id !== personnelToReplace.id && h.id !== newSuccessor.id)
    ];

    const updatedAuditLog = recordPersonnelAuditLog(
      currentAuditLog,
      'STATUS_CHANGE',
      personnelToReplace.name,
      personnelToReplace.position,
      personnelToReplace.category,
      `Replaced staff "${personnelToReplace.name}" with incoming successor "${newSuccessor.name}" as ${newSuccessor.position} (Effective: ${replaceForm.replacementDate}). Predecessor demobilized to bottom of roster; record preserved in permanent history.`
    );

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnel: updatedList,
      personnelHistory: updatedHistory,
      personnelAuditLog: updatedAuditLog
    };

    saveConsultantData(updatedConsultant, `Replaced staff: ${personnelToReplace.name} with ${newSuccessor.name}`);
    setIsReplaceModalOpen(false);
    setPersonnelToReplace(null);
  };

  // Unified Handler for Add/Edit Invoice (Routes to interactive ERA / DKS Monthly Invoice Calculation Tables)
  const handleOpenAddInvoice = () => {
    setSelectedInvoiceForPdfModal(null);
    setInvoiceViewMode('calculationTables');
  };

  const handleOpenEditInvoice = (inv: ConsultantInvoice) => {
    setSelectedInvoiceForPdfModal(inv);
    setInvoiceViewMode('calculationTables');
  };

  // Immediate Inline Table Field Updation & Persistence
  const handleUpdateInlineInvoiceField = (invId: string, field: keyof ConsultantInvoice, value: any) => {
    const currentList = consultant.invoices || [];
    const updatedList = currentList.map(inv => {
      if (inv.id === invId) {
        const updated = { ...inv, [field]: value };
        // If status marked as Paid, lock the payment amount so no changes occur
        if (field === 'status' && value === 'Paid') {
          updated.isPaymentSaved = true;
          updated.paymentLocked = true;
          updated.savedPaymentAmount = inv.savedPaymentAmount ?? inv.netAmountEtb;
        }

        // If payment is saved/locked, no change on the payment amount
        if (inv.isPaymentSaved || inv.paymentLocked || inv.status === 'Paid') {
          updated.netAmountEtb = inv.savedPaymentAmount ?? inv.netAmountEtb;
          updated.totalDueEtb = updated.netAmountEtb;
        } else if (field === 'feesAmountEtb' || field === 'reimbursableAmountEtb' || field === 'feesAmountUsd' || field === 'reimbursableAmountUsd') {
          const feesEtb = field === 'feesAmountEtb' ? Number(value) || 0 : (inv.feesAmountEtb || 0);
          const reimbEtb = field === 'reimbursableAmountEtb' ? Number(value) || 0 : (inv.reimbursableAmountEtb || 0);
          const feesUsd = field === 'feesAmountUsd' ? Number(value) || 0 : (inv.feesAmountUsd || 0);
          const reimbUsd = field === 'reimbursableAmountUsd' ? Number(value) || 0 : (inv.reimbursableAmountUsd || 0);
          
          const baseSubtotalEtb = feesEtb + reimbEtb;
          const baseSubtotalUsd = feesUsd + reimbUsd;
          
          updated.grossAmountEtb = Math.round(baseSubtotalEtb * 1.15 * 100) / 100;
          updated.grossAmountUsd = Math.round(baseSubtotalUsd * 1.15 * 100) / 100;
          
          const advEtb = inv.advanceDeductionEtb || 0;
          const taxEtb = inv.taxDeductionEtb || 0;
          const advUsd = inv.advanceDeductionUsd || 0;
          const taxUsd = inv.taxDeductionUsd || 0;
          
          updated.netAmountEtb = Math.max(0, baseSubtotalEtb - (advEtb + taxEtb));
          updated.netAmountUsd = Math.max(0, baseSubtotalUsd - (advUsd + taxUsd));
          
          updated.totalDueEtb = updated.netAmountEtb;
          updated.totalDueUsd = updated.netAmountUsd;
        } else if (field === 'grossAmountEtb' || field === 'advanceDeductionEtb' || field === 'taxDeductionEtb' || field === 'grossAmountUsd' || field === 'advanceDeductionUsd' || field === 'taxDeductionUsd') {
          // Recalculate Net Payable if gross or deductions are updated (MINUS VAT)
          const grossEtb = field === 'grossAmountEtb' ? Number(value) || 0 : (inv.grossAmountEtb || 0);
          const advEtb = field === 'advanceDeductionEtb' ? Number(value) || 0 : (inv.advanceDeductionEtb || 0);
          const taxEtb = field === 'taxDeductionEtb' ? Number(value) || 0 : (inv.taxDeductionEtb || 0);
          
          const grossUsd = field === 'grossAmountUsd' ? Number(value) || 0 : (inv.grossAmountUsd || 0);
          const advUsd = field === 'advanceDeductionUsd' ? Number(value) || 0 : (inv.advanceDeductionUsd || 0);
          const taxUsd = field === 'taxDeductionUsd' ? Number(value) || 0 : (inv.taxDeductionUsd || 0);
          
          // Net Payable is MINUS VAT (Gross Claim minus 15% VAT, minus contractual deductions)
          const baseSubtotalEtb = inv.feesAmountEtb !== undefined && inv.reimbursableAmountEtb !== undefined 
            ? ((inv.feesAmountEtb || 0) + (inv.reimbursableAmountEtb || 0))
            : (grossEtb / 1.15);
          const baseSubtotalUsd = inv.feesAmountUsd !== undefined && inv.reimbursableAmountUsd !== undefined 
            ? ((inv.feesAmountUsd || 0) + (inv.reimbursableAmountUsd || 0))
            : (grossUsd / 1.15);
            
          updated.netAmountEtb = Math.max(0, baseSubtotalEtb - (advEtb + taxEtb));
          updated.netAmountUsd = Math.max(0, baseSubtotalUsd - (advUsd + taxUsd));
          updated.totalDueEtb = updated.netAmountEtb;
          updated.totalDueUsd = updated.netAmountUsd;
        }
        return updated;
      }
      return inv;
    });
    saveConsultantData({ ...consultant, invoices: updatedList }, `Updated invoice ${invId} via inline table edit`);
  };

  // Calculate assigned personnel man-month inputs from latest invoice total to-date man-months
  const handleRecalculateAllPersonnelMMFromInvoices = () => {
    const invoices = consultant.invoices || [];
    if (invoices.length === 0) {
      setInAppNotification({
        type: 'warning',
        message: 'No supervision invoices recorded yet to calculate man-months from.'
      });
      return;
    }
    // Find latest invoice by period or submission
    const sorted = [...invoices].sort((a, b) => new Date(a.submissionDate || '').getTime() - new Date(b.submissionDate || '').getTime());
    const latestInv = sorted[sorted.length - 1];
    
    const toDateMMMap: Record<string, number> = {};
    if (latestInv.attendanceRecords && latestInv.attendanceRecords.length > 0) {
      latestInv.attendanceRecords.forEach((rec: any) => {
        const id = rec.personnelId || rec.id;
        const toDate = rec.toDateQty !== undefined 
          ? rec.toDateQty 
          : ((rec.precedingQty || 0) + (rec.thisInvoiceQty || ((rec.daysWorked || rec.days || 0) / 30)));
        if (id) toDateMMMap[id] = Number(toDate.toFixed(2));
        if (rec.name) toDateMMMap[rec.name.toLowerCase().trim()] = Number(toDate.toFixed(2));
      });
    }

    let calculatedCount = 0;
    const updatedPersonnel = (consultant.personnel || []).map(p => {
      const matchMM = toDateMMMap[p.id] ?? toDateMMMap[p.name.toLowerCase().trim()];
      if (matchMM !== undefined) {
        calculatedCount++;
        return {
          ...p,
          manMonthsInput: matchMM
        };
      }
      return p;
    });

    saveConsultantData({
      ...consultant,
      personnel: updatedPersonnel
    }, `Calculated ${calculatedCount} assigned personnel man-month inputs from latest invoice ${latestInv.invoiceNo} total to-date man-months`);
    
    setInAppNotification({
      type: 'success',
      message: `Successfully calculated ${calculatedCount} assigned personnel man-month inputs from invoice ${latestInv.invoiceNo} (${latestInv.billingPeriod})!`
    });
  };

  // -------------------------------------------------------------
  // CROSS-MODULE REAL-TIME DATA SYNCHRONIZATION
  // -------------------------------------------------------------
  const handleCrossModuleSyncAll = () => {
    const invoices = consultant.invoices || [];
    const personnel = consultant.personnel || [];
    const savedC1 = consultant.contractAmountSchedule?.condition1;
    const staffSchedule = savedC1?.staffFees && savedC1.staffFees.length > 0 
      ? savedC1.staffFees 
      : DEFAULT_CONDITION_1_STAFF;

    // 1. Calculate to-date man-months from all invoice attendance records
    const toDateMMMap: Record<string, number> = {};
    const invoicePresenceMap: Record<string, number> = {};

    invoices.forEach(inv => {
      (inv.attendanceRecords || []).forEach((rec: any) => {
        const id = rec.personnelId || rec.id;
        const mm = rec.thisInvoiceQty !== undefined 
          ? Number(rec.thisInvoiceQty) 
          : ((Number(rec.daysWorked || rec.days || 0)) / 30);
        if (id) {
          toDateMMMap[id] = (toDateMMMap[id] || 0) + mm;
          invoicePresenceMap[id] = (invoicePresenceMap[id] || 0) + 1;
        }
        if (rec.name) {
          const key = rec.name.toLowerCase().trim();
          toDateMMMap[key] = (toDateMMMap[key] || 0) + mm;
          invoicePresenceMap[key] = (invoicePresenceMap[key] || 0) + 1;
        }
      });
    });

    // 2. Map contract rates from Condition 1 staffFees (Table 2 & Table 3)
    const rateMap: Record<string, number> = {};
    staffSchedule.forEach((sf: any) => {
      if (sf.position) rateMap[sf.position.toLowerCase().trim()] = Number(sf.rateEtb) || 0;
      if (sf.name && sf.name !== 'To be nominated' && sf.name !== 'TBN') {
        rateMap[sf.name.toLowerCase().trim()] = Number(sf.rateEtb) || 0;
      }
    });

    let updatedMMCount = 0;
    let verifiedRateCount = 0;

    const updatedPersonnel = personnel.map(p => {
      const calcMM = toDateMMMap[p.id] ?? toDateMMMap[p.name.toLowerCase().trim()];
      const contractRate = rateMap[p.position.toLowerCase().trim()] ?? rateMap[p.name.toLowerCase().trim()];
      
      let updated = { ...p };
      if (calcMM !== undefined) {
        updated.manMonthsInput = Number(calcMM.toFixed(2));
        updatedMMCount++;
      }
      if (contractRate !== undefined && contractRate > 0) {
        (updated as any).rateEtb = contractRate;
        verifiedRateCount++;
      }
      return updated;
    });

    saveConsultantData({
      ...consultant,
      personnel: updatedPersonnel
    }, `Cross-synced ${updatedMMCount} staff man-month inputs and verified ${verifiedRateCount} contractual rates`);

    setInAppNotification({
      type: 'success',
      message: `Cross-Module Synchronization Completed: Updated ${updatedMMCount} staff man-month inputs from invoice attendance records and verified ${verifiedRateCount} contractual rates with Condition 1 schedule!`
    });
  };

  const handleDeleteInvoice = (invId: string, invNo: string) => {
    if (!isAdmin) {
      alert('Access Denied: Only administrators have the permission to delete invoices.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete invoice "${invNo}"?`)) {
      return;
    }
    const updatedList = (consultant.invoices || []).filter(item => item.id !== invId);
    saveConsultantData({ ...consultant, invoices: updatedList }, `Deleted invoice ${invNo}`);
  };

  // Helper to calculate elapsed time on site
  const getAssignmentDuration = (assignmentDateStr: string, demobDateStr?: string) => {
    if (!assignmentDateStr) return 'N/A';
    const start = new Date(assignmentDateStr);
    const end = demobDateStr ? new Date(demobDateStr) : new Date();
    if (isNaN(start.getTime())) return assignmentDateStr;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30.4);
    const years = (months / 12).toFixed(1);

    if (months < 1) return `${diffDays} days`;
    if (months < 12) return `${months} months`;
    return `${years} yrs (${months} mos)`;
  };

  // Export Staffing & Invoice Report to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12.7; // Standard border padding (12.7 mm / 36 pt)
      const contentWidth = pageWidth - (margin * 2);
      let pageNum = 1;

      const drawPageFrame = (currPage: number) => {
        // Standard Page border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 2, 2, 'S');

        // Running Footer
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 2, pageHeight - margin - 8, pageWidth - margin - 2, pageHeight - margin - 8);
        doc.text(`ETHIOPIAN ROADS ADMINISTRATION • SUPERVISION CONSULTANT AUDIT • ${project.name || 'Project'}`, margin + 2, pageHeight - margin - 3);
        doc.text(`Page ${currPage}`, pageWidth - margin - 2, pageHeight - margin - 3, { align: 'right' });
      };

      drawPageFrame(pageNum);

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin + 2, margin + 2, contentWidth - 4, 22, 2, 2, 'F');
      
      drawEraLogo(doc, margin + 4, margin + 3.5, 19, {
        withContainer: true,
        containerBg: [255, 255, 255],
        containerBorder: [226, 232, 240],
        borderRadius: 2
      });

      // Official Date Stamp (Top-Right, aligned with ERA Logo)
      const dsWidth = 38;
      const dsX = pageWidth - margin - dsWidth - 4;
      doc.setFillColor(30, 41, 59); // slate-800
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.3);
      doc.roundedRect(dsX, margin + 3.5, dsWidth, 19, 2, 2, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text("OFFICIAL DATE STAMP", dsX + 3, margin + 7.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      const dsStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(dsStr, dsX + 3, margin + 12.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(203, 213, 225);
      doc.text("STATUS: OFFICIAL DOSSIER", dsX + 3, margin + 18);

      // Title & Subtitle aligned between ERA Logo and Date Stamp
      const titleStart = margin + 26;
      const titleMaxW = dsX - titleStart - 3;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('ETHIOPIAN ROADS ADMINISTRATION (ERA)', titleStart, margin + 8.5);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 158, 11); // Amber
      const titleLines = doc.splitTextToSize("SUPERVISION CONSULTANT & STAFFING DOSSIER", titleMaxW);
      doc.text(titleLines[0], titleStart, margin + 13.5);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      const projSub = doc.splitTextToSize(`PROJECT: ${(project.name || 'Project').slice(0, 35)} • FIRM: ${(consultant.firmName || 'Consultant').slice(0, 25)}`, titleMaxW);
      doc.text(projSub[0], titleStart, margin + 18.5);

      let y = margin + 28;

      // Consultant Basic Details Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(consultant.firmName || 'Supervision Consultant', margin + 4, y + 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Contract Ref: ${consultant.contractRefNo || 'N/A'}`, margin + 4, y + 13);
      doc.text(`Type: ${consultant.associationType || 'Joint Venture'} (${consultant.contractType || 'Time-Based'})`, margin + 4, y + 18);
      doc.text(`Commencement Date: ${consultant.commencementDate || 'N/A'}`, margin + 4, y + 23);

      doc.text(`Resident Engineer: ${consultant.residentEngineerName || 'N/A'}`, margin + 75, y + 13);
      doc.text(`Site Camp: ${consultant.siteOfficeLocation || 'N/A'}`, margin + 75, y + 18);
      doc.text(`Original Fee: ETB ${formatAccounting(consultant.originalFeeEtb || 0, '')}`, margin + 75, y + 23);

      y += 36;

      // Section: Assigned Personnel
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`ASSIGNED SUPERVISION PERSONNEL (${(consultant.personnel || []).length} Staff Members)`, margin, y);
      y += 5;

      // Personnel Table Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('#', margin + 2, y + 5);
      doc.text('Personnel Name', margin + 8, y + 5);
      doc.text('Specific Position', margin + 45, y + 5);
      doc.text('Date of Assignment', margin + 85, y + 5);
      doc.text('Qualifications / Role', margin + 115, y + 5);
      doc.text('Status', margin + 145, y + 5);
      y += 8;

      // Personnel Table Rows
      doc.setFont('helvetica', 'normal');
      (consultant.personnel || []).forEach((p, idx) => {
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          pageNum++;
          drawPageFrame(pageNum);
          y = margin + 10;
        }
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text(String(idx + 1), margin + 2, y + 4);
        doc.text(p.name || '-', margin + 8, y + 4);
        doc.text(p.position || '-', margin + 45, y + 4);
        doc.text(p.assignmentDate || '-', margin + 85, y + 4);
        doc.text((p.qualification || p.category || '-').substring(0, 20), margin + 115, y + 4);
        doc.text(p.status || 'Active', margin + 145, y + 4);

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 6, pageWidth - margin, y + 6);
        y += 6;
      });

      y += 8;
      if (y > pageHeight - margin - 35) {
        doc.addPage();
        pageNum++;
        drawPageFrame(pageNum);
        y = margin + 10;
      }

      // Section: Consultant Invoices
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`CONSULTANT INVOICES & FEE CERTIFICATES (${(consultant.invoices || []).length} Invoices)`, margin, y);
      y += 5;

      // Invoice Table Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Invoice #', margin + 2, y + 5);
      doc.text('Period', margin + 24, y + 5);
      doc.text('Submission', margin + 46, y + 5);
      if (hasUsdPayments) {
        doc.text('Gross Amount (ETB)', margin + 68, y + 5);
        doc.text('Net Payable (ETB)', margin + 98, y + 5);
        doc.text('USD', margin + 128, y + 5);
        doc.text('Status', margin + 144, y + 5);
      } else {
        doc.text('Gross Amount (ETB)', margin + 70, y + 5);
        doc.text('Net Payable (ETB)', margin + 104, y + 5);
        doc.text('Status', margin + 138, y + 5);
      }
      y += 8;

      // Invoice Table Rows
      doc.setFont('helvetica', 'normal');
      (consultant.invoices || []).forEach((inv) => {
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          pageNum++;
          drawPageFrame(pageNum);
          y = margin + 10;
        }
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text(inv.invoiceNo || '-', margin + 2, y + 4);
        doc.text(inv.billingPeriod || '-', margin + 24, y + 4);
        doc.text(inv.submissionDate || '-', margin + 46, y + 4);
        if (hasUsdPayments) {
          doc.text(formatAccounting(inv.grossAmountEtb || 0, ''), margin + 68, y + 4);
          doc.text(formatAccounting(inv.netAmountEtb || 0, ''), margin + 98, y + 4);
          doc.text(`$${formatAccounting(inv.foreignCurrencyAmount || 0, '')}`, margin + 128, y + 4);
          doc.text(inv.status || 'Submitted', margin + 144, y + 4);
        } else {
          doc.text(formatAccounting(inv.grossAmountEtb || 0, ''), margin + 70, y + 4);
          doc.text(formatAccounting(inv.netAmountEtb || 0, ''), margin + 104, y + 4);
          doc.text(inv.status || 'Submitted', margin + 138, y + 4);
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 6, pageWidth - margin, y + 6);
        y += 6;
      });

      doc.save(`Supervision_Consultant_Report_${(project.name || 'Project').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not export PDF. Please verify browser permissions.');
    }
  };

  // Export Fee Invoices & Payments as a Formatted PDF Report for Financial Auditing and Documentation
  const handleExportInvoicesAuditPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      let pageNum = 1;

      // Draw header and border frame
      const drawFrame = (pNum: number) => {
        // Outer border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 4, 4, 'S');

        // Top accent line
        doc.setFillColor(194, 120, 3); // ERA Gold
        doc.rect(margin + 2, margin + 1, pageWidth - margin * 2 - 4, 2.5, 'F');

        // Logo
        drawEraLogo(doc, margin + 6, margin + 6, 32);

        // Date stamp container
        const stampW = 120;
        const stampX = pageWidth - margin - stampW - 6;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(stampX, margin + 6, stampW, 32, 4, 4, 'DF');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("FINANCIAL AUDIT STAMP", stampX + 6, margin + 14);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), stampX + 6, margin + 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        doc.text(`REF: ${consultant.contractRefNo || 'ERA-SUPERVISION'}`, stampX + 6, margin + 31);

        // Institution & Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 44, margin + 16);

        doc.setFontSize(9);
        doc.setTextColor(30, 64, 175);
        doc.text("SUPERVISION CONSULTANT FEE INVOICES & FINANCIAL AUDIT LEDGER", margin + 44, margin + 27);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        const dateRangeLabel = invoiceStartDate || invoiceEndDate
          ? `Reporting Period Filter: ${invoiceStartDate || 'Earliest'} to ${invoiceEndDate || 'Latest'}`
          : 'Reporting Period: All Cumulative Billing Periods';
        doc.text(`${project.name || 'Road Construction Project'} • ${consultant.firmName || 'Supervision Consultant'} • ${dateRangeLabel}`, margin + 44, margin + 36);

        // Dividing line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 2, margin + 44, pageWidth - margin - 2, margin + 44);

        // Footer
        const footerY = pageHeight - margin - 12;
        doc.line(margin + 2, footerY - 6, pageWidth - margin - 2, footerY - 6);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("CONFIDENTIAL & PROPRIETARY — FOR OFFICIAL FINANCIAL AUDIT & VALUATION PURPOSES ONLY", margin + 8, footerY + 2);
        doc.text(`Page ${pNum}`, pageWidth - margin - 40, footerY + 2);
      };

      drawFrame(pageNum);
      let y = margin + 52;

      // Executive Financial KPI Summary Box
      const contentWidth = pageWidth - margin * 2;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 6, y, contentWidth - 12, 38, 4, 4, 'DF');

      const colW = (contentWidth - 12) / 4;
      // Col 1: Total Gross Invoiced
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL GROSS INVOICED (PERIOD)", margin + 14, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      const periodGross = filteredInvoices.reduce((s, i) => s + (i.grossAmountEtb || 0), 0);
      doc.text(`${formatAccounting(periodGross, '')} ETB`, margin + 14, y + 26);

      // Col 2: Total Disbursed / Paid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("DISBURSED / PAID (PERIOD)", margin + 14 + colW, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 149, 114);
      const periodPaid = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.netAmountEtb || 0), 0);
      doc.text(`${formatAccounting(periodPaid, '')} ETB`, margin + 14 + colW, y + 26);

      // Col 3: Pending Net Amount
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PENDING / CERTIFIED UNPAID", margin + 14 + colW * 2, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(217, 119, 6);
      const periodPending = filteredInvoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.netAmountEtb || 0), 0);
      doc.text(`${formatAccounting(periodPending, '')} ETB`, margin + 14 + colW * 2, y + 26);

      // Col 4: Invoices Count & Utilization
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("RECORDS & BUDGET UTILIZATION", margin + 14 + colW * 3, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${filteredInvoices.length} Invoices (${financialSummary.financialUtilizationPct.toFixed(1)}% of Budget)`, margin + 14 + colW * 3, y + 26);

      y += 46;

      // Table Header for Invoice Audit Ledger
      const headers = [
        { title: 'No', width: 24, align: 'center' },
        { title: 'Invoice No.', width: 66, align: 'left' },
        { title: 'Billing Period', width: 90, align: 'left' },
        { title: 'Submission', width: 62, align: 'left' },
        { title: 'Payment Date', width: 62, align: 'left' },
        { title: 'Gross Claim (ETB)', width: 85, align: 'right' },
        { title: 'Deductions (ETB)', width: 75, align: 'right' },
        { title: '15% VAT (ETB)', width: 70, align: 'right' },
        { title: 'Net Payable (ETB)', width: 85, align: 'right' },
        { title: 'Status', width: 55, align: 'center' },
        { title: 'Payment Ref / Notes', width: 95, align: 'left' }
      ];

      const drawTableHeader = (curY: number) => {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(margin + 6, curY, contentWidth - 12, 18, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);

        let hX = margin + 8;
        headers.forEach(h => {
          if (h.align === 'right') {
            doc.text(h.title, hX + h.width - 2, curY + 11, { align: 'right' });
          } else if (h.align === 'center') {
            doc.text(h.title, hX + h.width / 2, curY + 11, { align: 'center' });
          } else {
            doc.text(h.title, hX + 2, curY + 11);
          }
          hX += h.width;
        });
      };

      drawTableHeader(y);
      y += 20;

      // Table Rows
      let totalGross = 0;
      let totalDeductions = 0;
      let totalVat = 0;
      let totalNet = 0;

      filteredInvoices.forEach((inv, idx) => {
        if (y > pageHeight - margin - 60) {
          doc.addPage();
          pageNum++;
          drawFrame(pageNum);
          y = margin + 52;
          drawTableHeader(y);
          y += 20;
        }

        const gross = inv.grossAmountEtb || 0;
        const ded = (inv.advanceDeductionEtb || 0) + (inv.taxDeductionEtb || 0) + (inv.overtimeDeductionEtb || 0);
        const vat = inv.vatAmountEtb || Number((gross * 0.15 / 1.15).toFixed(2));
        const net = inv.netAmountEtb || Math.max(0, gross - ded);

        totalGross += gross;
        totalDeductions += ded;
        totalVat += vat;
        totalNet += net;

        // Alternating row background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, 14, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);

        let rX = margin + 8;
        // No
        doc.text(String(idx + 1), rX + 12, y + 9.5, { align: 'center' });
        rX += 24;

        // Invoice No
        doc.setFont('helvetica', 'bold');
        doc.text(inv.invoiceNo || '-', rX + 2, y + 9.5);
        doc.setFont('helvetica', 'normal');
        rX += 66;

        // Billing Period
        doc.text(inv.billingPeriod || '-', rX + 2, y + 9.5);
        rX += 90;

        // Submission
        doc.text(inv.submissionDate || '-', rX + 2, y + 9.5);
        rX += 62;

        // Payment Date
        doc.text(inv.paymentDate || inv.certificationDate || '-', rX + 2, y + 9.5);
        rX += 62;

        // Gross Claim
        doc.text(formatAccounting(gross, ''), rX + 85 - 2, y + 9.5, { align: 'right' });
        rX += 85;

        // Deductions
        doc.text(ded > 0 ? `-${formatAccounting(ded, '')}` : '-', rX + 75 - 2, y + 9.5, { align: 'right' });
        rX += 75;

        // VAT
        doc.text(formatAccounting(vat, ''), rX + 70 - 2, y + 9.5, { align: 'right' });
        rX += 70;

        // Net Payable
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 149, 114);
        doc.text(formatAccounting(net, ''), rX + 85 - 2, y + 9.5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        rX += 85;

        // Status badge
        doc.text(inv.status || 'Submitted', rX + 27, y + 9.5, { align: 'center' });
        rX += 55;

        // Ref / Remarks
        const refNote = inv.paymentReference || inv.remarks || '-';
        doc.text(refNote.length > 20 ? `${refNote.substring(0, 18)}...` : refNote, rX + 2, y + 9.5);

        // Row dividing line
        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + 14, margin + contentWidth - 6, y + 14);
        y += 14;
      });

      // Total Summary Row
      if (y > pageHeight - margin - 70) {
        doc.addPage();
        pageNum++;
        drawFrame(pageNum);
        y = margin + 52;
      }

      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin + 6, y, contentWidth - 12, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text("PERIOD TOTALS:", margin + 14, y + 11);

      let tX = margin + 8 + 24 + 66 + 90 + 62 + 62;
      doc.text(formatAccounting(totalGross, ''), tX + 85 - 2, y + 11, { align: 'right' });
      tX += 85;
      doc.text(formatAccounting(totalDeductions, ''), tX + 75 - 2, y + 11, { align: 'right' });
      tX += 75;
      doc.text(formatAccounting(totalVat, ''), tX + 70 - 2, y + 11, { align: 'right' });
      tX += 70;
      doc.setTextColor(16, 149, 114);
      doc.text(formatAccounting(totalNet, ''), tX + 85 - 2, y + 11, { align: 'right' });

      y += 24;

      // Official Sign-Off Certification Block
      if (y > pageHeight - margin - 60) {
        doc.addPage();
        pageNum++;
        drawFrame(pageNum);
        y = margin + 52;
      }

      const signW = (contentWidth - 12) / 4;
      const signY = Math.min(y + 8, pageHeight - margin - 50);

      const roles = [
        { title: 'PREPARED BY', name: 'Resident Engineer', sub: 'Supervision Consultant' },
        { title: 'CHECKED BY', name: 'Valuation & Payment Officer', sub: 'ERA Financial Directorate' },
        { title: 'REVIEWED BY', name: 'Lead Supervision Engineer', sub: 'ERA Directorate' },
        { title: 'CERTIFIED & APPROVED', name: 'Project Director', sub: 'Ethiopian Roads Admin' }
      ];

      roles.forEach((r, idx) => {
        const sX = margin + 6 + idx * signW;
        doc.setDrawColor(203, 213, 225);
        doc.line(sX + 6, signY + 22, sX + signW - 12, signY + 22);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(r.title, sX + 6, signY + 6);

        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(r.name, sX + 6, signY + 30);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(r.sub, sX + 6, signY + 37);
      });

      const dateStr = (invoiceStartDate || invoiceEndDate) 
        ? `${invoiceStartDate || 'Start'}_to_${invoiceEndDate || 'End'}`
        : 'All_Periods';
      const cleanProj = (project.name || 'Project').replace(/\s+/g, '_').substring(0, 20);
      doc.save(`Fee_Invoices_Financial_Audit_${cleanProj}_${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export Financial Audit PDF. Please check console for details.");
    }
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const staffHeaders = ['Name', 'Position', 'Category', 'Date of Assignment', 'Status', 'Qualification', 'Experience (Yrs)', 'Man-Months Allocated', 'Man-Months Input', 'Site Station', 'Phone', 'Email'];
    const staffRows = (consultant.personnel || []).map(p => [
      `"${p.name || ''}"`,
      `"${p.position || ''}"`,
      `"${p.category || ''}"`,
      `"${p.assignmentDate || ''}"`,
      `"${p.status || ''}"`,
      `"${p.qualification || ''}"`,
      p.yearsExperience || 0,
      p.manMonthsAllocated || 0,
      p.manMonthsInput || 0,
      `"${p.siteStation || ''}"`,
      `"${p.contactPhone || ''}"`,
      `"${p.contactEmail || ''}"`
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '--- SUPERVISION CONSULTANT PERSONNEL DIRECTORY ---\n';
    csvContent += staffHeaders.join(',') + '\n';
    staffRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    csvContent += '\n\n--- CONSULTANT INVOICES & FEE CLAIMS ---\n';
    const invHeaders = [
      'Invoice No', 
      'Billing Period', 
      'Submission Date', 
      'Certification Date', 
      'Payment Date', 
      'Gross Amount ETB', 
      'Advance Deduction ETB', 
      'Tax Deduction ETB', 
      'Net Payable ETB', 
      ...(hasUsdPayments ? ['Foreign Currency USD'] : []),
      'Status', 
      'Payment Ref', 
      'Remarks'
    ];
    const invRows = (consultant.invoices || []).map(inv => [
      `"${inv.invoiceNo || ''}"`,
      `"${inv.billingPeriod || ''}"`,
      `"${inv.submissionDate || ''}"`,
      `"${inv.certificationDate || ''}"`,
      `"${inv.paymentDate || ''}"`,
      inv.grossAmountEtb || 0,
      inv.advanceDeductionEtb || 0,
      inv.taxDeductionEtb || 0,
      inv.netAmountEtb || 0,
      ...(hasUsdPayments ? [inv.foreignCurrencyAmount || 0] : []),
      `"${inv.status || ''}"`,
      `"${inv.paymentReference || ''}"`,
      `"${inv.remarks || ''}"`
    ]);
    csvContent += invHeaders.join(',') + '\n';
    invRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Consultant_Staffing_Invoices_${(project.name || 'Project').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Building2 className="w-3.5 h-3.5" />
                Supervision Consultant Portal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {consultant.associationType || 'Joint Venture'}
              </span>
              {consultant.performanceRating && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3 h-3" />
                  {consultant.performanceRating} Performance
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {consultant.firmName || 'Supervision Consultant Information'}
            </h1>
          </div>

          {/* Right Header Area: Utility Group */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsWorkloadReportOpen(true)}
              title="Print Workload Report"
                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
              >
                <Table className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleExportPDF}
                title="Export Project PDF"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Printer className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleExportCSV}
                title="Export Excel/CSV"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Supervision Time Assigned Completed / Expiration Alert Banner */}
        {scheduleStatus.effectiveCompletionDate && (scheduleStatus.isTimeExpired || scheduleStatus.daysRemaining <= 180) && (
          <div className={`mt-5 p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            scheduleStatus.isTimeExpired 
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                scheduleStatus.isTimeExpired ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">
                    {scheduleStatus.isTimeExpired 
                      ? 'Supervision Service Period Completed (Including All Extensions)' 
                      : `Supervision Contract Concluding Soon (Less than Six Months Remaining: ${scheduleStatus.daysRemaining} Days)`}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    scheduleStatus.isTimeExpired ? 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100' : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100'
                  }`}>
                    End Date: {scheduleStatus.effectiveCompletionDate}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed max-w-3xl">
                  {scheduleStatus.isTimeExpired
                    ? `The allocated contract duration for ${consultant.firmName} has reached its completion date (${scheduleStatus.daysOverdue} days past effective completion). You can archive this consultant's record and seamlessly assign a new consultant firm as continuation of supervision services.`
                    : `⚠️ ATTENTION: Less than six months remain for the Revised / Approved Completion Date of the consultancy services for ${consultant.firmName}. Procurement actions or contract assignments must be initiated immediately to select/change the consultant and ensure continuous supervision coverage.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IN-APP FLOATING NOTIFICATION TOAST */}
      {inAppNotification && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 max-w-md animate-in slide-in-from-top duration-300 ${
          inAppNotification.type === 'success'
            ? 'bg-emerald-950 text-emerald-100 border-emerald-500/50'
            : inAppNotification.type === 'warning'
            ? 'bg-amber-950 text-amber-100 border-amber-500/50'
            : 'bg-blue-950 text-blue-100 border-blue-500/50'
        }`}>
          {inAppNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : inAppNotification.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <div className="text-xs font-semibold flex-1 leading-snug">
            {inAppNotification.message}
          </div>
          <button
            type="button"
            onClick={() => setInAppNotification(null)}
            className="text-white/60 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Internal Navigation Subtabs - Interlinked primary workflows first */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('contract_data')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'contract_data'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Contract Data
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Fee Invoices & Payments
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
            activeTab === 'invoices' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {consultant.invoices?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('personnel')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'personnel'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Assigned Personnel Directory
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
            activeTab === 'personnel' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {consultant.personnel?.length || 0}
          </span>
        </button>

        {(isAdmin || isEraUser) && !isConsultantUser && (
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'kpis'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Evaluation (Section 2 Matrix)
          </button>
        )}

        {!isConsultantUser && (
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Service History
            {(consultant.previousConsultants?.length || 0) > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeTab === 'history' ? 'bg-amber-700 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold'
              }`}>
                {consultant.previousConsultants?.length}
              </span>
            )}
          </button>
        )}

        {isAdmin && !isConsultantUser && (
          <button
            onClick={() => setActiveTab('personnel_audit')}
            className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'personnel_audit'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Personnel Action Audit Log
            {(consultant.personnelAuditLog?.length || 0) > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeTab === 'personnel_audit' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold'
              }`}>
                {consultant.personnelAuditLog?.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB: CONTRACT DATA (MERGED CONTRACT PROFILE & FINANCIAL REMUNERATION BASELINE) */}
      {activeTab === 'contract_data' && (
        <div className="space-y-6">
          {/* Prominent Admin Lock Status Banner */}
          {Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>Contract Data Permanently Locked by Directorate / Master Admin</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold uppercase">Policy Enforced</span>
                  </div>
                  <div className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    No change can be made to the contract profile, remuneration terms, staff fees, or reimbursables until a new assignment of Supervision Consultant is recorded.
                  </div>
                </div>
              </div>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={handleOpenAssignNewConsultant}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Assign New Supervision Consultant
                </button>
              )}
            </div>
          )}

          {/* Section 1: Supervision Contract & Scope Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Contract Details Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Supervision Agreement & Contractual Terms
                    </h3>
                    <span className="text-xs text-slate-400">Official consultancy parameters and remuneration structure</span>
                  </div>
                  {!isReadonly && !Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
                    <button
                      onClick={() => {
                        setConsultantForm(consultant);
                        setEditModalSection('all');
                        setIsEditConsultantOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Contract
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Consulting Firm</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm mt-1 flex flex-wrap items-center gap-2">
                      <span>{consultant.firmName || '-'}</span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800" title="Bidirectionally linked with Supervising Consultant on Project Information">
                        🔗 Linked to Project Info
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                      {consultant.associationType === 'Sole Consultant' ? 'Engagement / Consultancy Model' : 'Association / JV Arrangement'}
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                      {consultant.associationType || 'Sole Consultant'}
                    </div>
                    {consultant.associationType !== 'Sole Consultant' && consultant.jvPartners && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Partners: {consultant.jvPartners}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Agreement Reference</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                      {consultant.contractRefNo || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Remuneration Type</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                      {consultant.contractType || 'Time-Based (Man-Months + Reimbursables)'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Signing Date</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {consultant.contractSignDate || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Supervision Commencement Date</span>
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {consultant.commencementDate || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Original Completion Date</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {consultant.originalCompletionDate || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Revised / Approved Completion Date</span>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {consultant.revisedCompletionDate || consultant.originalCompletionDate || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Currency & View Settings: Centralized Control */}
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Coins className="w-4 h-4 text-purple-600" />
                        Currency & View Configuration
                      </h4>
                      <p className="text-xs text-slate-500">Configure how financial data is calculated and displayed across all modules.</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* View Currency Toggle (Global for this view) */}
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setViewCurrency('ETB')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            viewCurrency === 'ETB'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewCurrency('USD')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            viewCurrency === 'USD'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          USD
                        </button>
                      </div>

                      {!isReadonly && !Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      )}

                      {!isReadonly && !Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !hasUsdPayments;
                            saveConsultantData({
                              ...consultant,
                              enableUsdPayments: nextVal
                            }, `${nextVal ? 'Enabled' : 'Disabled'} USD foreign currency remuneration option`);
                            setInAppNotification({
                              type: 'success',
                              message: nextVal 
                                ? 'USD Option selected! The Fee Invoices table now displays the dedicated USD Certificate column like an IPC table.'
                                : 'USD Option turned off. Fee Invoices table is now showing local ETB currency.'
                            });
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border ${
                            hasUsdPayments
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <ShieldCheck className={`w-3.5 h-3.5 ${hasUsdPayments ? 'text-purple-600' : 'text-slate-400'}`} />
                          {hasUsdPayments ? 'USD Contract Active' : 'Enable USD Option'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    {/* Exchange Rate Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Exchange Rate</span>
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-500">1 USD =</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadonly || Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked)}
                            value={exchangeRateInput}
                            onChange={(e) => setExchangeRateInput(parseFloat(e.target.value) || 0)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono font-black text-slate-900 dark:text-white p-0"
                          />
                          <span className="text-xs font-bold text-slate-500">ETB</span>
                        </div>
                        {!isReadonly && !Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
                          <button
                            type="button"
                            onClick={() => handleSaveExchangeRate(exchangeRateInput)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">This rate is used to convert ETB values to USD for real-time reporting and dashboard analysis.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Continuation & Handover Management Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Service Continuation & Successor Assignment
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    scheduleStatus.isTimeExpired ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {scheduleStatus.isTimeExpired ? 'Time Expired' : 'Active Contract'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  When the time assigned for the supervision consultant is completed (including all approved contract time extensions), or if a contract transition is necessary, you can assign a new consulting firm as continuation of service. The current consultant's historical invoices, personnel records, and baseline financial schedule are fully archived in the project service history.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500">
                    <span>Archived Predecessors: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{consultant.previousConsultants?.length || 0} firms on record</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View Service History</span>
                    </button>
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={handleOpenAssignNewConsultant}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Assign Continuation</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Head Office & Resident Engineer Profile Cards */}
            <div className="space-y-6">
              {/* Head Office Details Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">
                        Head Office & Corporate Contacts
                      </h4>
                      <span className="text-[10px] text-slate-400 block">Consultant Headquarters</span>
                    </div>
                  </div>

                  {!isReadonly && !Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked) && (
                    <button
                      onClick={() => {
                        setHeadOfficeForm({
                          headOfficeAddress: consultant.headOfficeAddress || '',
                          headOfficePhone: consultant.headOfficePhone || '',
                          headOfficeEmail: consultant.headOfficeEmail || '',
                          headOfficeContactPerson: consultant.headOfficeContactPerson || ''
                        });
                        setIsEditHeadOfficeQuickOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Physical Address</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{consultant.headOfficeAddress || 'Head Office Address not specified'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Contact Person / Authorized Representative</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {consultant.headOfficeContactPerson || 'Managing Director / Corporate Liaison'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                      <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{consultant.headOfficePhone || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Corporate Email</span>
                      <div className="text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{consultant.headOfficeEmail || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resident Engineer Profile Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                    RE
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Resident Engineer</span>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">
                      {consultant.residentEngineerName || 'Eng. Girma Bekele'}
                    </h4>
                    <span className="text-xs text-slate-400">Team Leader / Project Director</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {consultant.residentEngineerPhone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-mono">{consultant.residentEngineerPhone}</span>
                    </div>
                  )}

                  {consultant.residentEngineerEmail && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{consultant.residentEngineerEmail}</span>
                    </div>
                  )}

                  {consultant.siteOfficeLocation && (
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{consultant.siteOfficeLocation}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Assurance Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consultant Compliance</span>
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-black text-lg text-white">
                  FIDIC Engineer Obligations
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The supervision team operates under delegated authority from the Ethiopian Roads Administration to administer the civil works contract impartially and enforce high standards of quality assurance.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Contract Financial Remuneration & Fees Baseline Schedule */}
          <div className="pt-2">
            <ContractAmountTab
              project={project}
              consultant={consultant}
              isReadonly={isReadonly || Boolean(project.isAmountLocked || consultant.isContractLocked || consultant.contractAmountSchedule?.condition1?.isLocked)}
              currentUser={currentUser}
              onUpdateProject={onUpdateProject}
              viewCurrency={viewCurrency}
              exchangeRate={activeExchangeRate}
              onCurrencyToggle={setViewCurrency}
              onNavigateToInvoices={() => {
                setActiveTab('invoices');
                setInvoiceViewMode('table');
              }}
              onNavigateToPersonnel={() => {
                setActiveTab('personnel');
              }}
              onNavigateToHistory={() => {
                setActiveTab('history');
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 1: ASSIGNED PERSONNEL DIRECTORY */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          {/* Quick Status Filter Chips & Metric Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-400 text-[11px] mr-1 uppercase tracking-wider">Quick Filter:</span>
              <button
                type="button"
                onClick={() => setPersonnelStatusFilter('ALL')}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  personnelStatusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                All Staff ({personnelSummary.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setPersonnelStatusFilter('Active')}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  personnelStatusFilter === 'Active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Active ({personnelSummary.activeCount})
              </button>
              <button
                type="button"
                onClick={() => setPersonnelCategoryFilter(personnelCategoryFilter === 'Key Personnel' ? 'ALL' : 'Key Personnel')}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  personnelCategoryFilter === 'Key Personnel'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Key Experts ({personnelSummary.keyStaffCount})
              </button>
              <button
                type="button"
                onClick={() => setPersonnelStatusFilter('Demobilized')}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  personnelStatusFilter === 'Demobilized'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Demobilized ({personnelSummary.demobilizedCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCrossModuleSyncAll}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cross-reference all personnel rates with Contract Schedule and calculate to-date man-months from invoices"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Sync Rates & Man-Months</span>
              </button>

              {/* View Switcher: Table vs Cards */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPersonnelViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    personnelViewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Table View"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersonnelViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    personnelViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Card Cards View"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, specific position, qualifications, station, or email..."
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Category:
              </div>
              <select
                value={personnelCategoryFilter}
                onChange={(e) => setPersonnelCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="ALL">All Categories</option>
                <option value="Key Personnel">Key Personnel</option>
                <option value="Non-Key Professional">Non-Key Professional</option>
                <option value="Sub-Professional">Sub-Professional</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Administrative Support">Administrative Support</option>
              </select>

              <select
                value={personnelStatusFilter}
                onChange={(e) => setPersonnelStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Demobilized">Demobilized</option>
                <option value="On Leave">On Leave</option>
                <option value="Replaced">Replaced</option>
              </select>

              {!isReadonly && (
                <button
                  type="button"
                  onClick={handleOpenAddPersonnel}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Staff
                </button>
              )}
            </div>
          </div>

          {/* Personnel Content: Table View vs Cards View */}
          {personnelViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPersonnel.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No assigned personnel matching your criteria.</p>
                </div>
              ) : (
                filteredPersonnel.map((p, idx) => {
                  const durationStr = getAssignmentDuration(p.assignmentDate, p.demobilizationDate);
                  const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
                  const isActive = p.status === 'Active';
                  const rate = p.rateEtb || contractRatesMap[p.position?.toLowerCase().trim()] || contractRatesMap[p.name?.toLowerCase().trim()] || 0;
                  const rateUsd = p.rateUsd || contractRatesUsdMap[p.position?.toLowerCase().trim()] || contractRatesUsdMap[p.name?.toLowerCase().trim()] || 0;
                  const invStat = staffAttendanceStats[p.id] || staffAttendanceStats[p.name?.toLowerCase().trim()];
                  const mmPct = p.manMonthsAllocated ? Math.min(100, ((p.manMonthsInput || 0) / p.manMonthsAllocated) * 100) : 0;

                  return (
                    <div
                      key={p.id ? `${p.id}_${idx}` : `pers_card_${idx}`}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">#{idx + 1} {p.category}</span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                              {p.name}
                            </h4>
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{p.position}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200'
                          }`}>
                            {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {p.status}
                          </span>
                        </div>

                        {/* Contract Schedule Linkage & Rate (ETB) */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-slate-500 text-[11px] font-medium">Contract Rate (ETB):</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('contract_amount')}
                            className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Inspect in Table 2 / Table 3 of Contract Amount"
                          >
                            <span>{rate > 0 ? `${formatAccounting(rate, '')} ETB/mo` : 'Set Rate in Table 2'}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        </div>

                        {/* Contract Schedule Linkage & Rate (USD) */}
                        {hasUsdPayments && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs">
                            <span className="text-purple-700 dark:text-purple-300 text-[11px] font-semibold">Contract Rate (USD):</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('contract_amount')}
                              className="font-mono font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Inspect in USD Split Settings of Contract Amount"
                            >
                              <span>{rateUsd > 0 ? `$${formatAccounting(rateUsd, '')}/mo` : 'Set in Split Settings'}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                            </button>
                          </div>
                        )}

                        {/* Invoice Attendance Presence */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs">
                          <span className="text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-blue-500" />
                            Fee Invoices Billed:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('invoices');
                              setInvoiceSearch(p.name);
                              setInvoiceViewMode('table');
                            }}
                            className="font-mono font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title={`Filter fee invoices for ${p.name}`}
                          >
                            <span>{invStat ? `${invStat.count} invoice(s)` : '0 recorded'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Man-Months Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-500">MM Input / Allocated:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {Number(p.manMonthsInput || 0).toFixed(2)} / {Number(p.manMonthsAllocated || 0).toFixed(2)} MM
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                mmPct >= 100 ? 'bg-purple-600' : mmPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, mmPct)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('invoices');
                            setInvoiceSearch(p.name);
                            setInvoiceViewMode('table');
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>View Invoices</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewDetailPersonnel(p)}
                            title="View Staff Profile"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {!isReadonly && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPersonnel(p)}
                                title="Edit Staff"
                                className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTogglePersonnelStatus(p)}
                                title={isActive ? 'Demobilize staff' : 'Reactivate staff'}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  isActive ? 'hover:bg-rose-100 text-rose-600' : 'hover:bg-emerald-100 text-emerald-600'
                                }`}
                              >
                                {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Personnel Table View with Interactive Headers */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto scroll-smooth">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-2xs">
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th
                        onClick={() => {
                          if (personnelSortField === 'name') {
                            setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPersonnelSortField('name');
                            setPersonnelSortOrder('asc');
                          }
                        }}
                        className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Assigned Personnel Name</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => {
                          if (personnelSortField === 'position') {
                            setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPersonnelSortField('position');
                            setPersonnelSortOrder('asc');
                          }
                        }}
                        className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Specific Position / Role</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-right">
                        <span>Contract Rate (ETB)</span>
                      </th>
                      {hasUsdPayments && (
                        <th className="py-3 px-3 text-right text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30">
                          <span>Contract Rate (USD)</span>
                        </th>
                      )}
                      <th
                        onClick={() => {
                          if (personnelSortField === 'assignmentDate') {
                            setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPersonnelSortField('assignmentDate');
                            setPersonnelSortOrder('asc');
                          }
                        }}
                        className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 font-black"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Assignment Dates</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-center">
                        <span>Invoices Attendance</span>
                      </th>
                      <th
                        onClick={() => {
                          if (personnelSortField === 'manMonthsInput') {
                            setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPersonnelSortField('manMonthsInput');
                            setPersonnelSortOrder('desc');
                          }
                        }}
                        className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Man-Months</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => {
                          if (personnelSortField === 'status') {
                            setPersonnelSortOrder(personnelSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPersonnelSortField('status');
                            setPersonnelSortOrder('asc');
                          }
                        }}
                        className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPersonnel.length === 0 ? (
                      <tr>
                        <td colSpan={hasUsdPayments ? 11 : 10} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold">No assigned personnel matching your criteria.</p>
                          <p className="text-xs text-slate-400 mt-1">Click "New Staff" to register supervision staff members.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPersonnel.map((p, idx) => {
                        const durationStr = getAssignmentDuration(p.assignmentDate, p.demobilizationDate);
                        const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
                        const isActive = p.status === 'Active';
                        const isDemobOrReplaced = p.status === 'Demobilized' || p.status === 'Replaced';
                        const rate = p.rateEtb || contractRatesMap[p.position?.toLowerCase().trim()] || contractRatesMap[p.name?.toLowerCase().trim()] || 0;
                        const rateUsd = p.rateUsd || contractRatesUsdMap[p.position?.toLowerCase().trim()] || contractRatesUsdMap[p.name?.toLowerCase().trim()] || 0;
                        const invStat = staffAttendanceStats[p.id] || staffAttendanceStats[p.name?.toLowerCase().trim()];
                        const mmPct = p.manMonthsAllocated ? Math.min(100, ((p.manMonthsInput || 0) / p.manMonthsAllocated) * 100) : 0;

                        return (
                          <tr 
                            key={p.id ? `${p.id}_${idx}` : `pers_${idx}`}
                            className={`transition duration-150 ${
                              isDemobOrReplaced 
                                ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-75 hover:opacity-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-l-2 border-l-slate-300 dark:border-l-slate-600' 
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {p.name}
                                {p.status === 'Replaced' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                                    Replaced
                                  </span>
                                )}
                                {p.status === 'Demobilized' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200">
                                    Demobilized
                                  </span>
                                )}
                              </div>
                              {(p.contactPhone || p.contactEmail) && (
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  {p.contactPhone && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                                      {p.contactPhone}
                                    </span>
                                  )}
                                  {p.contactEmail && (
                                    <span className="flex items-center gap-0.5 truncate max-w-[140px]" title={p.contactEmail}>
                                      <Mail className="w-2.5 h-2.5 text-slate-400" />
                                      {p.contactEmail}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className={`font-bold ${isDemobOrReplaced ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                                {p.position}
                              </div>
                              {p.siteStation && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                  {p.siteStation}
                                </div>
                              )}
                            </td>

                            {/* Contract Rate ETB Column */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setActiveTab('contract_amount')}
                                className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                title="Inspect in Table 2 / Table 3 of Contract Amount"
                              >
                                {rate > 0 ? `${formatAccounting(rate, '')} ETB` : '-'}
                              </button>
                            </td>

                            {/* Contract Rate USD Column (simultaneous when USD enabled) */}
                            {hasUsdPayments && (
                              <td className="py-3 px-3 text-right bg-purple-50/20 dark:bg-purple-950/10">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('contract_amount')}
                                  className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                  title="Inspect in USD Split Settings of Contract Amount"
                                >
                                  {rateUsd > 0 ? `$${formatAccounting(rateUsd, '')}` : '-'}
                                </button>
                              </td>
                            )}

                            <td className="py-3 px-4 bg-indigo-50/30 dark:bg-indigo-950/10">
                              <div className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span title="Assignment Date">{p.assignmentDate || 'Not set'}</span>
                              </div>
                              {p.demobilizationDate ? (
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 font-mono flex items-center gap-1">
                                  <span>{p.status === 'Replaced' ? 'Replaced End:' : 'Completion / Demob:'}</span>
                                  <strong>{p.demobilizationDate}</strong>
                                </div>
                              ) : (
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 font-mono">
                                  On site: {durationStr}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isKey
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {p.category}
                              </span>
                            </td>

                            {/* Invoices Attendance Column */}
                            <td className="py-3 px-3 text-center">
                              {invStat ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('invoices');
                                    setInvoiceSearch(p.name);
                                    setInvoiceViewMode('table');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 transition cursor-pointer text-[10px]"
                                  title={`Click to filter Fee Invoices ledger for ${p.name}`}
                                >
                                  <Receipt className="w-2.5 h-2.5 text-blue-500" />
                                  <span>{invStat.count} inv ({invStat.totalMM.toFixed(2)} MM)</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-mono">No billings</span>
                              )}
                            </td>

                            {/* Man-Months Column */}
                            <td className="py-3 px-4 text-center font-mono">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {Number(p.manMonthsInput || 0).toFixed(2)} / {Number(p.manMonthsAllocated || 0).toFixed(2)}
                              </div>
                              <div className="w-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    mmPct >= 100 ? 'bg-purple-600' : mmPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, mmPct)}%` }}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : p.status === 'Replaced'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {isActive ? <UserCheck className="w-3 h-3" /> : p.status === 'Replaced' ? <ArrowRightLeft className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                {p.status}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewDetailPersonnel(p)}
                                  title="View details"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>


                                {!isReadonly && (
                                  <>
                                    {isActive && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReplacePersonnel(p)}
                                        title="Replace staff with incoming successor"
                                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                                      >
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleTogglePersonnelStatus(p)}
                                      title={isActive ? 'Demobilize staff' : 'Reactivate staff'}
                                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                                        isActive 
                                          ? 'hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600' 
                                          : 'hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-600'
                                      }`}
                                    >
                                      {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPersonnel(p)}
                                      title="Edit personnel"
                                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeletePersonnel(p.id, p.name)}
                                      title="Delete staff"
                                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition cursor-pointer"
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
          )}
        </div>
      )}

      {/* TAB 2: CONSULTANT INVOICES & FEE CLAIMS */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice Filter, Date Range Picker and Export Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoices by invoice number, billing period, payment ref, or notes..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Filter className="w-3.5 h-3.5" />
                  Status:
                </div>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Certified">Certified</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {/* Export Formatted PDF Report Button */}
                <button
                  type="button"
                  onClick={handleExportInvoicesAuditPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="Export displayed Fee Invoices & Payment Ledger as a formatted PDF report for financial auditing and documentation"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Financial Audit PDF</span>
                </button>

                {!isReadonly && (
                  <button
                    type="button"
                    onClick={handleOpenAddInvoice}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Compute monthly supervision invoice based on staff attendance, rate multiplication, reimbursables, and 15% VAT table formats"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Calculate Monthly Invoice</span>
                  </button>
                )}
              </div>
            </div>

            {/* DATE RANGE PICKER COMPONENT (Reporting Period Filtering) */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Reporting Period:</span>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleSelectDatePreset('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      invoiceDatePreset === 'ALL' && !invoiceStartDate && !invoiceEndDate
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDatePreset('THIS_YEAR')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      invoiceDatePreset === 'THIS_YEAR'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDatePreset('LAST_6_MONTHS')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      invoiceDatePreset === 'LAST_6_MONTHS'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Last 6 Mos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDatePreset('THIS_QUARTER')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      invoiceDatePreset === 'THIS_QUARTER'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    This Qtr
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
                  <input
                    type="date"
                    value={invoiceStartDate}
                    onChange={(e) => {
                      setInvoiceStartDate(e.target.value);
                      setInvoiceDatePreset('CUSTOM');
                    }}
                    className="bg-transparent font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    title="Start of reporting period"
                  />
                  <span className="text-slate-400 text-xs">→</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">To</span>
                  <input
                    type="date"
                    value={invoiceEndDate}
                    onChange={(e) => {
                      setInvoiceEndDate(e.target.value);
                      setInvoiceDatePreset('CUSTOM');
                    }}
                    className="bg-transparent font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    title="End of reporting period"
                  />
                  {(invoiceStartDate || invoiceEndDate) && (
                    <button
                      type="button"
                      onClick={() => handleSelectDatePreset('ALL')}
                      className="text-slate-400 hover:text-rose-500 font-bold px-1 transition cursor-pointer"
                      title="Clear date range filter"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Period Badge */}
              <div className="flex items-center gap-2">
                {(invoiceStartDate || invoiceEndDate) ? (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <span>Filtered: {invoiceStartDate || 'Earliest'} to {invoiceEndDate || 'Latest'} ({filteredInvoices.length} invoices)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Showing all {filteredInvoices.length} historical invoices
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View Mode Selector: Table vs Calculation Tables vs IPC Picture Cards */}
          <div className="flex flex-wrap items-center justify-between px-2 pt-1 gap-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-500" />
              <span>Supervision Fee Invoices & Payment Ledger</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                ({filteredInvoices.length} {filteredInvoices.length === 1 ? 'record' : 'records'})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    invoiceViewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  Ledger Table
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('calculationTables')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    invoiceViewMode === 'calculationTables'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Open interactive 5-table invoice calculation engine"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calculation Tables
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('cards')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    invoiceViewMode === 'cards'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  IPC Picture Cards
                </button>
              </div>
            </div>
          </div>

          {isInlineTableEdit && invoiceViewMode === 'table' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span className="font-bold">Live In-Table Editing Active:</span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Modify Invoice #, Billing Period, Dates, Gross, Deductions, Status, or Ref directly below. Changes persist immediately.
                </span>
              </div>
              <button
                onClick={() => setIsInlineTableEdit(false)}
                className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-lg font-bold text-[11px] hover:bg-amber-300 transition cursor-pointer"
              >
                Close Edit Mode
              </button>
            </div>
          )}

          {invoiceViewMode === 'calculationTables' ? (
            <MonthlyInvoiceCalculationTable
              project={project}
              consultant={consultant}
              activeInvoice={selectedInvoiceForPdfModal}
              viewCurrency={viewCurrency}
              onSaveInvoice={(computedInvoice) => {
                const currentList = consultant.invoices || [];
                const existingIdx = currentList.findIndex(i => i.invoiceNo === computedInvoice.invoiceNo || i.id === computedInvoice.id);
                let updatedList: ConsultantInvoice[];
                if (existingIdx >= 0) {
                  updatedList = currentList.map((item, idx) => idx === existingIdx ? computedInvoice : item);
                } else {
                  updatedList = [computedInvoice, ...currentList];
                }
                saveConsultantData({
                  ...consultant,
                  invoices: updatedList
                }, `Saved Monthly Supervision Invoice ${computedInvoice.invoiceNo} calculated from Attendance & Multiplication Tables`);
                setSelectedInvoiceForPdfModal(computedInvoice);
              }}
              onUpdateConsultantPersonnel={(updatedPersonnel) => {
                saveConsultantData({
                  ...consultant,
                  personnel: updatedPersonnel
                }, 'Calculated assigned personnel man-month inputs from monthly invoice total to-date man-months');
              }}
              onUpdateContractReimbursables={(reimbursables) => {
                const c1 = consultant.contractAmountSchedule?.condition1;
                const newTotal = reimbursables.reduce((s, r) => s + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);
                const updatedC1 = {
                  ...(c1 || {}),
                  reimbursableList: reimbursables,
                  reimbursableTotal: newTotal,
                  summary: {
                    ...(c1?.summary || {}),
                    reimbursableExpenses: newTotal
                  }
                };
                saveConsultantData({
                  ...consultant,
                  contractAmountSchedule: {
                    ...consultant.contractAmountSchedule,
                    condition1: updatedC1 as any
                  }
                }, 'Synced reimbursables from invoice calculation table to Contract Amount Table B');
              }}
              onBackToLedger={() => setInvoiceViewMode('table')}
              onSelectInvoice={(inv) => setSelectedInvoiceForPdfModal(inv)}
              onNavigateToContractAmount={() => setActiveTab('contract_amount')}
            />
          ) : invoiceViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No invoices recorded yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add / Calculate Invoice" to compute and record a supervision fee claim.</p>
                </div>
              ) : (
                filteredInvoices.map((inv) => {
                  const totalDeductions = (inv.advanceDeductionEtb || 0) + (inv.taxDeductionEtb || 0);
                  const isUnpaid = inv.status !== 'Paid' && inv.status !== 'Rejected';
                  let ageDays = 0;
                  let isMaturedOverdue = false;
                  const refDateStr = inv.submissionDate || inv.certificationDate;
                  if (refDateStr && isUnpaid) {
                    const d = new Date(refDateStr);
                    if (!isNaN(d.getTime())) {
                      ageDays = Math.max(0, Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
                      if (ageDays > 56) isMaturedOverdue = true;
                    }
                  }

                  return (
                    <div 
                      key={inv.id}
                      className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs transition flex flex-col justify-between gap-4 ${
                        isMaturedOverdue ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-blue-500" />
                            {inv.invoiceNo}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200' :
                            inv.status === 'Certified' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200' :
                            isMaturedOverdue ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 animate-pulse' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200'
                          }`}>
                            {isMaturedOverdue ? `Matured Overdue (${ageDays}d)` : inv.status}
                          </span>
                        </div>

                        {/* Visual Document Calculation Tables Thumbnail */}
                        <div 
                          onClick={() => handleOpenEditInvoice(inv)}
                          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-blue-400 transition"
                          title="Click to calculate and view invoice tables"
                        >
                          <div className="w-10 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
                            <Table className="w-5 h-5" />
                            <span className="text-[8px] font-mono font-bold">TABLES</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                              <span>{inv.invoiceNo} — Calculation Tables</span>
                              <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Period: {inv.billingPeriod} • Sub: {inv.submissionDate || '-'}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Claim</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatAccounting(inv.grossAmountEtb || 0, 'ETB')}
                            </span>
                          </div>
                          <div className="bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Payable</span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                              {formatAccounting(inv.netAmountEtb || 0, 'ETB')}
                            </span>
                          </div>
                        </div>

                        {totalDeductions > 0 && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono flex justify-between">
                            <span>Deductions (Adv + Tax):</span>
                            <span>-{formatAccounting(totalDeductions, 'ETB')}</span>
                          </div>
                        )}

                        {hasUsdPayments && inv.foreignCurrencyAmount ? (
                          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono flex justify-between">
                            <span>USD Foreign Portion:</span>
                            <span>${formatAccounting(inv.foreignCurrencyAmount, '')}</span>
                          </div>
                        ) : null}

                        {inv.paymentReference && (
                          <div className="text-[11px] text-slate-500 font-mono truncate" title={inv.paymentReference}>
                            Ref: {inv.paymentReference} {inv.paymentDate ? `(${inv.paymentDate})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleOpenEditInvoice(inv)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Calculate & Edit Tables
                        </button>

                        {!isReadonly && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}
                              title="Delete invoice"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[540px] overflow-y-auto scroll-smooth">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-2xs">
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th 
                        onClick={() => {
                          if (invoiceSortField === 'invoiceNo') {
                            setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setInvoiceSortField('invoiceNo');
                            setInvoiceSortOrder('asc');
                          }
                        }}
                        className="py-3 px-3 min-w-[130px] cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>IPC / Invoice #</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 min-w-[160px]">Billing Period</th>
                      <th 
                        onClick={() => {
                          if (invoiceSortField === 'submissionDate') {
                            setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setInvoiceSortField('submissionDate');
                            setInvoiceSortOrder('desc');
                          }
                        }}
                        className="py-3 px-3 min-w-[130px] cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Submission Date</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-2 text-center min-w-[140px]" title="FIDIC Sub-Clause 14.7 56-Day Payment Maturation Period">
                        <span>56-Day Maturation</span>
                      </th>
                      <th 
                        onClick={() => {
                          if (invoiceSortField === 'grossAmountEtb') {
                            setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setInvoiceSortField('grossAmountEtb');
                            setInvoiceSortOrder('desc');
                          }
                        }}
                        className="py-3 px-3 text-right min-w-[130px] cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Gross Claim (ETB)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      {hasUsdPayments && <th className="py-3 px-3 text-right text-purple-700 min-w-[130px]">Gross Claim (USD)</th>}
                      <th className="py-3 px-3 text-right min-w-[120px]">Deductions (ETB)</th>
                      {hasUsdPayments && <th className="py-3 px-3 text-right text-purple-700 min-w-[120px]">Deductions (USD)</th>}
                      <th 
                        onClick={() => {
                          if (invoiceSortField === 'netAmountEtb') {
                            setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setInvoiceSortField('netAmountEtb');
                            setInvoiceSortOrder('desc');
                          }
                        }}
                        className="py-3 px-3 text-right font-black text-slate-900 dark:text-white min-w-[140px] cursor-pointer hover:text-blue-600 select-none"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Net Payable (ETB)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      {hasUsdPayments && (
                        <th 
                          onClick={() => {
                            if ((invoiceSortField as string) === 'foreignCurrencyAmount') {
                              setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setInvoiceSortField('foreignCurrencyAmount' as any);
                              setInvoiceSortOrder('desc');
                            }
                          }}
                          className="py-3 px-3 text-right min-w-[130px] font-black text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer hover:text-purple-900 select-none border-x border-purple-200/60 dark:border-purple-800/40"
                          title="Net Certified / Payable in Foreign Currency (USD) — selected on Contract & Scope Profile"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Net Payable (USD)</span>
                            <ArrowUpDown className="w-3 h-3 text-purple-400" />
                          </div>
                        </th>
                      )}
                      <th 
                        onClick={() => {
                          if (invoiceSortField === 'status') {
                            setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setInvoiceSortField('status');
                            setInvoiceSortOrder('asc');
                          }
                        }}
                        className="py-3 px-3 text-center min-w-[110px] cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 min-w-[160px]">Payment Ref & Date</th>
                      <th className="py-3 px-3 text-right min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={hasUsdPayments ? 13 : 10} className="py-12 text-center text-slate-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-semibold">No invoices recorded yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Click "Calculate Monthly Invoice" to log a supervision consultant fee claim.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const totalDeductions = (inv.advanceDeductionEtb || 0) + (inv.taxDeductionEtb || 0);
                        const isUnpaid = inv.status !== 'Paid' && inv.status !== 'Rejected';
                        const refDateStr = inv.submissionDate || inv.certificationDate;
                        let ageDays = 0;
                        let dueDateStr = '';
                        let isMaturedOverdue = false;

                        if (refDateStr) {
                          const d = new Date(refDateStr);
                          if (!isNaN(d.getTime())) {
                            ageDays = Math.max(0, Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
                            const due = new Date(d.getTime() + 56 * 24 * 60 * 60 * 1000);
                            dueDateStr = due.toISOString().split('T')[0];
                            if (ageDays > 56 && isUnpaid) {
                              isMaturedOverdue = true;
                            }
                          }
                        }

                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {inv.status}
                          </span>
                        );

                        let maturationBadge = (
                          <span className="text-slate-400 text-[10px]">-</span>
                        );

                        if (inv.status === 'Paid') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid
                            </span>
                          );
                          maturationBadge = (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                              </span>
                              {inv.paymentDate && (
                                <span className="text-[9px] text-slate-400 font-mono">{inv.paymentDate}</span>
                              )}
                            </div>
                          );
                        } else if (isMaturedOverdue) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse" title={`FIDIC Sub-Clause 14.7 56-day maturation breached by ${ageDays - 56} days (${ageDays}d elapsed)`}>
                              <AlertTriangle className="w-3 h-3 text-red-600 dark:text-rose-400" />
                              Matured Overdue
                            </span>
                          );
                          maturationBadge = (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> +{ageDays - 56}d Overdue
                              </span>
                              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-mono font-bold">Due: {dueDateStr}</span>
                            </div>
                          );
                        } else if (inv.status === 'Certified') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <FileCheck className="w-3 h-3" />
                              Certified
                            </span>
                          );
                          maturationBadge = (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                <Clock className="w-2.5 h-2.5" /> {56 - ageDays > 0 ? `${56 - ageDays}d left` : 'Due today'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">Due: {dueDateStr}</span>
                            </div>
                          );
                        } else if (inv.status === 'Submitted') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              <Clock className="w-3 h-3" />
                              Submitted
                            </span>
                          );
                          maturationBadge = (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
                                {ageDays}d of 56d
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">Due: {dueDateStr}</span>
                            </div>
                          );
                        }

                        // INLINE EDITABLE ROW
                        if (isInlineTableEdit && !isReadonly) {
                          return (
                            <tr key={inv.id} className="bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 transition">
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={inv.invoiceNo}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'invoiceNo', e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={inv.billingPeriod}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'billingPeriod', e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-sans text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={inv.submissionDate || ''}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'submissionDate', e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                                {dueDateStr ? `Due: ${dueDateStr}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  value={inv.grossAmountEtb || 0}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'grossAmountEtb', parseFloat(e.target.value) || 0)}
                                  className="w-28 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs"
                                />
                              </td>
                              {hasUsdPayments && (
                                <td className="py-2.5 px-3 text-right bg-purple-50/20 dark:bg-purple-950/20">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={inv.grossAmountUsd || 0}
                                    onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'grossAmountUsd', parseFloat(e.target.value) || 0)}
                                    className="w-24 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg font-mono text-purple-700 dark:text-purple-300 font-bold text-xs"
                                    placeholder="0.00 USD"
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  value={inv.advanceDeductionEtb || 0}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'advanceDeductionEtb', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-rose-600 text-xs"
                                />
                              </td>
                              {hasUsdPayments && (
                                <td className="py-2.5 px-3 text-right bg-purple-50/20 dark:bg-purple-950/20">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={inv.advanceDeductionUsd || 0}
                                    onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'advanceDeductionUsd', parseFloat(e.target.value) || 0)}
                                    className="w-24 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg font-mono text-rose-600 text-xs"
                                    placeholder="0.00 USD"
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  value={inv.netAmountEtb || 0}
                                  disabled={Boolean(inv.isPaymentSaved || inv.paymentLocked || inv.status === 'Paid')}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'netAmountEtb', parseFloat(e.target.value) || 0)}
                                  title={inv.isPaymentSaved || inv.paymentLocked || inv.status === 'Paid' ? "Payment saved: no change permitted on payment amount" : "Net amount payable (minus VAT)"}
                                  className={`w-28 text-right px-2 py-1 rounded-lg font-mono font-black text-xs ${
                                    inv.isPaymentSaved || inv.paymentLocked || inv.status === 'Paid'
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-75 border border-slate-200 dark:border-slate-700'
                                      : 'bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-600'
                                  }`}
                                />
                              </td>
                              {hasUsdPayments && (
                                <td className="py-2.5 px-3 text-right bg-purple-50/20 dark:bg-purple-950/20 border-x border-purple-100 dark:border-purple-900/30">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={inv.netAmountUsd || inv.foreignCurrencyAmount || 0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      handleUpdateInlineInvoiceField(inv.id, 'netAmountUsd', val);
                                      handleUpdateInlineInvoiceField(inv.id, 'foreignCurrencyAmount', val);
                                    }}
                                    className="w-24 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg font-mono text-purple-600 dark:text-purple-300 font-bold text-xs"
                                    placeholder="0.00 USD"
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-center">
                                <select
                                  value={inv.status}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'status', e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-xs"
                                >
                                  <option value="Submitted">Submitted</option>
                                  <option value="Certified">Certified</option>
                                  <option value="Paid">Paid</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={inv.paymentReference || ''}
                                  onChange={(e) => handleUpdateInlineInvoiceField(inv.id, 'paymentReference', e.target.value)}
                                  placeholder="Payment Ref"
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditInvoice(inv)}
                                    title="Open interactive calculation tables"
                                    className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Calculator className="w-3 h-3" />
                                    Tables
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}
                                    title="Delete invoice"
                                    className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // STANDARD ROW VIEW (IPC Table Style)
                        return (
                          <tr 
                            key={inv.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 ${
                              isMaturedOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                            }`}
                          >
                            <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                              <span 
                                onClick={() => handleOpenEditInvoice(inv)}
                                className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-black px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60"
                                title="Click to calculate and view invoice tables"
                              >
                                {inv.invoiceNo}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                              <div>{inv.billingPeriod}</div>
                              {inv.attendanceRecords && inv.attendanceRecords.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('personnel')}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition cursor-pointer"
                                  title="View staff directory in personnel tab"
                                >
                                  <Users className="w-2.5 h-2.5" />
                                  <span>{inv.attendanceRecords.length} staff</span>
                                </button>
                              )}
                            </td>

                            <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 font-mono">
                              <div>{inv.submissionDate || '-'}</div>
                              {isUnpaid && ageDays > 0 && (
                                <div className={`text-[10px] font-mono ${isMaturedOverdue ? 'text-red-600 dark:text-rose-400 font-black' : 'text-slate-400'}`}>
                                  {ageDays}d elapsed
                                </div>
                              )}
                            </td>

                            {/* 56-Day Maturation Status Badge */}
                            <td className="py-3.5 px-2 text-center">
                              {maturationBadge}
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {formatAccounting(inv.grossAmountEtb || 0, '')}
                            </td>
                            {hasUsdPayments && <td className="py-3.5 px-3 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20">{formatAccounting(inv.grossAmountUsd || 0, '')}</td>}

                            <td className="py-3.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 text-[11px]">
                              {totalDeductions > 0 ? `-${formatAccounting(totalDeductions, '')}` : '-'}
                            </td>
                            {hasUsdPayments && <td className="py-3.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 text-[11px] bg-purple-50/20">{inv.advanceDeductionUsd || inv.taxDeductionUsd ? `-${formatAccounting((inv.advanceDeductionUsd || 0) + (inv.taxDeductionUsd || 0), '')}` : '-'}</td>}

                            <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                              {formatAccounting(inv.netAmountEtb || 0, '')}
                            </td>
                            {hasUsdPayments && (
                              <td className="py-3.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/20 border-x border-purple-100 dark:border-purple-900/30">
                                {formatAccounting(inv.netAmountUsd || 0, '')}
                              </td>
                            )}

                            <td className="py-3.5 px-3 text-center">
                              {statusBadge}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[150px]" title={inv.paymentReference || ''}>
                                {inv.paymentReference || '-'}
                              </div>
                              {inv.paymentDate && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Paid: {inv.paymentDate}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              {!isReadonly ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleOpenEditInvoice(inv)}
                                    title="Calculate and view invoice tables"
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}
                                    title="Delete invoice"
                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800/95 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono">
                    <tr>
                      <td colSpan={4} className="py-3.5 px-4 font-sans text-right uppercase tracking-wider text-[11px] font-bold">
                        Summary (Total Todate Certified IPC / Invoices):
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                        {formatAccounting(invoiceTotals.totalGross, '')} ETB
                      </td>
                      {hasUsdPayments && (
                        <td className="py-3.5 px-3 text-right font-black font-mono text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60">
                          ${formatAccounting(invoiceTotals.totalGrossUsd, '')} USD
                        </td>
                      )}
                      <td className="py-3.5 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                        -{formatAccounting(invoiceTotals.totalDeductions, '')} ETB
                      </td>
                      {hasUsdPayments && (
                        <td className="py-3.5 px-3 text-right font-black font-mono text-rose-600 dark:text-rose-400 bg-purple-100/60 dark:bg-purple-950/60">
                          {invoiceTotals.totalDeductionsUsd > 0 ? `-$${formatAccounting(invoiceTotals.totalDeductionsUsd, '')}` : '-'}
                        </td>
                      )}
                      <td className="py-3.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatAccounting(invoiceTotals.totalNet, '')} ETB
                      </td>
                      {hasUsdPayments && (
                        <td className="py-3.5 px-3 text-right font-black font-mono text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60 border-x border-purple-200 dark:border-purple-800">
                          ${formatAccounting(invoiceTotals.totalNetUsd, '')} USD
                        </td>
                      )}
                      <td colSpan={3} className="py-3.5 px-4 text-left font-sans text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Contract Fee: <span className="font-mono font-bold text-slate-900 dark:text-white">{formatAccounting(invoiceTotals.contractFee, 'ETB')}</span>
                        {hasUsdPayments && invoiceTotals.contractFeeUsd > 0 && (
                          <span className="ml-1 text-purple-700 dark:text-purple-300 font-mono font-bold"> + ${formatAccounting(invoiceTotals.contractFeeUsd, '')} USD</span>
                        )}
                        <span className="text-[10px] text-blue-600 font-semibold ml-1.5">({invoiceTotals.utilization.toFixed(1)}% Utilized)</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PERFORMANCE KPIS & RFI SLA EVALUATION (ADMIN & ERA ROLES) */}
      {(isAdmin || isEraUser) && activeTab === 'kpis' && (
        <ConsultantPerformanceKpiWidget
          project={project}
          consultant={consultant}
          onUpdateConsultant={saveConsultantData}
          isReadonly={isReadonly}
          isAdmin={isAdmin || isEraUser}
          isMasterAdmin={isMasterAdmin}
          currentUser={currentUser}
        />
      )}



      {/* TAB 4: SERVICE HISTORY & PREDECESSORS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  Supervision Service History & Predecessors Archive
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audit trail of all previous supervision consultant engagements and continuity transitions for this project.
                </p>
              </div>

              {!isReadonly && (
                <button
                  onClick={handleOpenAssignNewConsultant}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Assign Continuation Consultant
                </button>
              )}
            </div>

            {(!consultant.previousConsultants || consultant.previousConsultants.length === 0) ? (
              <div className="py-12 text-center text-slate-400">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Original Consultant Currently Serving
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  <strong>{consultant.firmName}</strong> is the initial supervision consultant for this contract. When their term is completed or extended service is transitioned, previous contract archives will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-4">
                {consultant.previousConsultants.map((hist, idx) => (
                  <div key={hist.archivedAt || idx} className="py-5 first:pt-2 last:pb-0">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold font-mono">
                            Term #{consultant.previousConsultants.length - idx}
                          </span>
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {hist.firmName}
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">({hist.associationType || 'Sole Consultant'})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Contract Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{hist.contractRefNo || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Commenced: <strong className="font-mono text-slate-700 dark:text-slate-300">{hist.commencementDate || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Handover / Archived: <strong className="font-mono text-amber-600 dark:text-amber-400">{hist.handoverDate || hist.archivedAt?.slice(0, 10)}</strong></span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 max-w-2xl mt-1">
                          <span className="font-bold text-slate-500 text-[10px] uppercase block">Transition Reason</span>
                          {hist.transitionReason || hist.reasonForTransition || 'Service duration completed and continuation consultant assigned.'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">Archived Records</span>
                          <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {hist.personnel?.length || 0} Staff • {hist.invoices?.length || 0} Invoices
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedHistoricalConsultant(hist)}
                          className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition"
                        >
                          View Dossier
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permanent Personnel Assignment History Audit Log (Master Admin feature) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Permanent Personnel Assignment History Audit Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audit trail of all assigned and inserted personnel records. Master Administrators can permanently purge historical assignment records from the system database if required.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl font-mono text-xs font-bold">
                Total History Records: {consultant.personnelHistory?.length || 0}
              </span>
            </div>

            {(!consultant.personnelHistory || consultant.personnelHistory.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No historical personnel assignment logs found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-4">
                {consultant.personnelHistory.map((histP, hIdx) => (
                  <div key={histP.id || hIdx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                        {histP.name}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {histP.position}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Category: <strong>{histP.category}</strong></span>
                        <span>•</span>
                        <span>Assigned: <strong className="font-mono">{histP.assignmentDate || 'N/A'}</strong></span>
                        {histP.demobilizationDate && (
                          <>
                            <span>•</span>
                            <span>Demobilized: <strong className="font-mono text-rose-600 dark:text-rose-400">{histP.demobilizationDate}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Status: <strong className={histP.status === 'Active' ? 'text-emerald-600' : histP.status === 'Replaced' ? 'text-amber-600' : 'text-slate-400'}>{histP.status}</strong></span>
                      </div>
                      {histP.remarks && (
                        <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 max-w-xl">
                          {histP.remarks}
                        </div>
                      )}
                    </div>

                    {isMasterAdmin && (
                      <button
                        onClick={() => handleDeletePersonnelHistory(histP.id, histP.name)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-center shadow-xs"
                        title="Permanently purge historical personnel record from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Permanently Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PERSONNEL ACTION AUDIT LOG */}
      {isAdmin && activeTab === 'personnel_audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  Personnel Action Audit Log & System Traceability
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete immutable audit trail tracking exact timestamps, administrative user identifiers, and action categories (Assignments, Removals, Status Updates, and Permanent Deletions) across the project supervision lifecycle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl font-mono text-xs font-bold">
                  Showing {filteredAuditLogs.length} of {consultant.personnelAuditLog?.length || 0} Events
                </span>
                {isMasterAdmin && (consultant.personnelAuditLog?.length || 0) > 0 && (
                  <button
                    onClick={handleClearAllAuditLogs}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                    title="[Master Admin Only] Purge all personnel audit logs from system database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge All Logs
                  </button>
                )}
                {!isMasterAdmin && (
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700/60" title="Deletion privilege is restricted to Master Administrators only">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Read-Only Trail
                  </span>
                )}
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search admin user, personnel name, position, details..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ALL">All Action Types</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="STATUS_CHANGE">Status Change</option>
                  <option value="REMOVED">Removed</option>
                  <option value="PERMANENT_DELETION">Permanent Deletion</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => setAuditStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  title="Filter Start Date"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => setAuditEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  title="Filter End Date"
                />
                {(auditSearchQuery || auditActionFilter !== 'ALL' || auditStartDate || auditEndDate) && (
                  <button
                    onClick={() => {
                      setAuditSearchQuery('');
                      setAuditActionFilter('ALL');
                      setAuditStartDate('');
                      setAuditEndDate('');
                    }}
                    className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 transition shrink-0"
                    title="Clear Filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {(!consultant.personnelAuditLog || consultant.personnelAuditLog.length === 0) ? (
              <div className="py-16 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-rose-500" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  No Personnel Action Audit Logs Recorded Yet
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Every staff assignment, position update, status toggle, removal, or permanent database deletion is automatically recorded here with timestamp and administrative user signatures.
                </p>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                <h5 className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  No matching audit log entries found
                </h5>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try adjusting your search terms, action type filter, or date range.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-4 rounded-xl border border-slate-200 dark:border-slate-800 scroll-smooth">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-2xs">
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4">Administrative User</th>
                      <th className="py-3 px-4">Personnel Name & Position</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Traceability Notes / Details</th>
                      {isMasterAdmin && <th className="py-3 px-4 text-center w-16">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredAuditLogs.map((log) => {
                      const badgeColor = 
                        log.actionType === 'ASSIGNED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                        log.actionType === 'STATUS_CHANGE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        log.actionType === 'REMOVED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
                      
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {log.timestamp}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase font-mono ${badgeColor}`}>
                              {log.actionType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            {log.adminUser}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {log.personnelName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {log.position}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {log.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {log.details}
                          </td>
                          {isMasterAdmin && (
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeletePersonnelAuditLog(log.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="[Master Admin Only] Delete this audit log entry permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CONSULTANT GENERAL CONTRACT DETAILS */}
      <AnimatePresence>
        {isEditConsultantOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Sticky Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-md shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Edit Supervision Consultant Contract Details
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {consultantForm.contractRefNo || 'Contract Profile'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Update consulting entity particulars, remuneration structures, milestone dates, headquarters liaison, and site representatives.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditConsultantOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Section Quick Filter / Navigation Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 shrink-0">
                    Jump to:
                  </span>
                  {[
                    { id: 'all', label: 'All Sections (6)' },
                    { id: 'firm', label: consultantForm.associationType === 'Sole Consultant' ? '1. Consulting Firm' : '1. Firm & JV' },
                    { id: 'financial', label: '2. Remuneration' },
                    { id: 'dates', label: '3. Timeline & Dates' },
                    { id: 'headOffice', label: '4. Head Office' },
                    { id: 'residentEngineer', label: '5. Resident Engineer' },
                    { id: 'scope', label: '6. Scope of Services' }
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setEditModalSection(sec.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all text-xs flex items-center gap-1.5 ${
                        editModalSection === sec.id
                          ? 'bg-blue-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs custom-scrollbar">
                
                {/* SECTION 1: FIRM IDENTIFICATION & ASSOCIATION */}
                {(editModalSection === 'all' || editModalSection === 'firm') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {consultantForm.associationType === 'Sole Consultant'
                            ? 'Section 1: Consulting Entity Particulars'
                            : 'Section 1: Consulting Entity & Association Structure'}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {consultantForm.associationType || 'Sole Consultant'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Pre-Registered Firm Directory Selector */}
                      <div className="sm:col-span-2 p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300">
                            🏛️ Choose from Registered Firms Directory (Auto-Fill)
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            Auto-populates TIN, License, Country & Head Office
                          </span>
                        </div>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            try {
                              const saved = localStorage.getItem('era_registered_firms_v1');
                              const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                              const selected = allFirms.find(f => (f.id === val || f.firmName === val) && f.firmType === 'Consultant');
                              if (selected) {
                                setConsultantForm(prev => ({
                                  ...prev,
                                  firmName: selected.firmName,
                                  tinNumber: selected.tinNumber || prev.tinNumber,
                                  countryOfOrigin: selected.countryOfOrigin || prev.countryOfOrigin || 'Ethiopia',
                                  constructionLicenseNo: selected.constructionLicenseNo || prev.constructionLicenseNo,
                                  headOfficeAddress: selected.address || prev.headOfficeAddress,
                                  headOfficePhone: selected.phone || prev.headOfficePhone,
                                  headOfficeEmail: selected.email || prev.headOfficeEmail,
                                  headOfficeContactPerson: selected.contactPerson || prev.headOfficeContactPerson
                                }));
                              }
                            } catch (err) {
                              console.warn('Firm select error', err);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-slate-800 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select a Registered Consultant Firm to Auto-Fill --</option>
                          {(() => {
                            try {
                              const saved = localStorage.getItem('era_registered_firms_v1');
                              const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                              const consultantOnlyFirms = allFirms.filter(f => f.firmType === 'Consultant');
                              return consultantOnlyFirms.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.firmName} (TIN: {f.tinNumber} • {f.countryOfOrigin})
                                </option>
                              ));
                            } catch {
                              return DEFAULT_REGISTERED_FIRMS.filter(f => f.firmType === 'Consultant').map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.firmName} (TIN: {f.tinNumber} • {f.countryOfOrigin})
                                </option>
                              ));
                            }
                          })()}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700 dark:text-slate-300">
                            {consultantForm.associationType === 'Sole Consultant'
                              ? 'Consulting Firm Name'
                              : 'Consulting Firm / Lead Partner Name'} <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            🔗 Syncs with Project Information Supervising Consultant
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={consultantForm.firmName}
                          onChange={(e) => setConsultantForm({ ...consultantForm, firmName: e.target.value })}
                          placeholder={consultantForm.associationType === 'Sole Consultant'
                            ? "e.g. Associated Engineering Consultants"
                            : "e.g. Associated Engineering Consultants in JV with Ethio-Roads Consulting"}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          TIN Number
                        </label>
                        <input
                          type="text"
                          value={consultantForm.tinNumber || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, tinNumber: e.target.value })}
                          placeholder="e.g. 0090262271"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Country of Origin
                        </label>
                        <input
                          type="text"
                          value={consultantForm.countryOfOrigin || 'Ethiopia'}
                          onChange={(e) => setConsultantForm({ ...consultantForm, countryOfOrigin: e.target.value })}
                          placeholder="e.g. Ethiopia, India, Italy..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Construction / Professional License No
                        </label>
                        <input
                          type="text"
                          value={consultantForm.constructionLicenseNo || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, constructionLicenseNo: e.target.value })}
                          placeholder="e.g. CHB/415, AWM-07"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {consultantForm.associationType === 'Sole Consultant' ? 'Consultancy Engagement Model' : 'Association Type'}
                        </label>
                        <select
                          value={consultantForm.associationType || 'Joint Venture (JV)'}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            setConsultantForm({
                              ...consultantForm,
                              associationType: newType,
                              jvPartners: newType === 'Sole Consultant' ? '' : consultantForm.jvPartners
                            });
                          }}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs font-medium"
                        >
                          <option value="Sole Consultant">Sole Consultant</option>
                          <option value="Joint Venture (JV)">Joint Venture (JV)</option>
                          <option value="Lead Consultant">Lead Consultant</option>
                          <option value="Association / Consortium">Association / Consortium</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Contract Agreement Reference Number
                        </label>
                        <input
                          type="text"
                          value={consultantForm.contractRefNo || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, contractRefNo: e.target.value })}
                          placeholder="e.g. ERA/CS/CONT/2026/01"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Contract Remuneration Model
                        </label>
                        <select
                          value={consultantForm.contractType || 'Time-Based'}
                          onChange={(e) => setConsultantForm({ ...consultantForm, contractType: e.target.value as any })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs font-medium"
                        >
                          <option value="Time-Based">Time-Based (Man-Months & Reimbursables)</option>
                          <option value="Lump-Sum">Lump-Sum Fixed Fee</option>
                          <option value="Percentage of Works">Percentage of Civil Works</option>
                          <option value="Hybrid">Hybrid (Time-Based + Milestone Fees)</option>
                        </select>
                      </div>

                      {consultantForm.associationType !== 'Sole Consultant' && (
                        <div className="sm:col-span-2 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300">
                              🤝 Joint Venture (JV) Consortium Firm Selection (From Registry)
                            </label>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              Select Lead Firm & Associate Partner from Firm Registry
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Lead Firm Selector from Registry */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                👑 Lead Firm Name <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={consultantForm.leadFirmName || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  try {
                                    const saved = localStorage.getItem('era_registered_firms_v1');
                                    const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                                    const lead = allFirms.find(f => f.firmName === val || f.id === val);
                                    if (lead) {
                                      const leadName = lead.firmName;
                                      const partnerName = consultantForm.partnerFirmName || '';
                                      const combinedName = partnerName ? `${leadName} in JV with ${partnerName}` : leadName;
                                      const jvDetails = partnerName 
                                        ? `Lead Partner: ${leadName} (${lead.countryOfOrigin || 'Ethiopia'}, TIN: ${lead.tinNumber || 'N/A'}) & Associate Partner: ${partnerName}`
                                        : `Lead Partner: ${leadName} (${lead.countryOfOrigin || 'Ethiopia'}, TIN: ${lead.tinNumber || 'N/A'})`;
                                      
                                      setConsultantForm(prev => ({
                                        ...prev,
                                        leadFirmName: leadName,
                                        firmName: combinedName,
                                        tinNumber: lead.tinNumber || prev.tinNumber,
                                        countryOfOrigin: lead.countryOfOrigin || prev.countryOfOrigin,
                                        constructionLicenseNo: lead.constructionLicenseNo || prev.constructionLicenseNo,
                                        jvPartners: jvDetails
                                      }));
                                    } else {
                                      setConsultantForm(prev => ({ ...prev, leadFirmName: val }));
                                    }
                                  } catch (err) {
                                    setConsultantForm(prev => ({ ...prev, leadFirmName: val }));
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">-- Choose Lead Firm from Registry --</option>
                                {(() => {
                                  try {
                                    const saved = localStorage.getItem('era_registered_firms_v1');
                                    const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                                    return allFirms.filter(f => f.firmType === 'Consultant').map(f => (
                                      <option key={f.id} value={f.firmName}>
                                        {f.firmName} ({f.countryOfOrigin || 'Ethiopia'})
                                      </option>
                                    ));
                                  } catch {
                                    return DEFAULT_REGISTERED_FIRMS.filter(f => f.firmType === 'Consultant').map(f => (
                                      <option key={f.id} value={f.firmName}>
                                        {f.firmName} ({f.countryOfOrigin || 'Ethiopia'})
                                      </option>
                                    ));
                                  }
                                })()}
                              </select>
                            </div>

                            {/* JV Partner Selector from Registry (Distinct from Lead Firm) */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                🤛 JV Partner / Associate Firm <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={consultantForm.partnerFirmName || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  try {
                                    const saved = localStorage.getItem('era_registered_firms_v1');
                                    const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                                    const partner = allFirms.find(f => f.firmName === val || f.id === val);
                                    if (partner) {
                                      const partnerName = partner.firmName;
                                      const leadName = consultantForm.leadFirmName || consultantForm.firmName.split(' in JV')[0] || '';
                                      const combinedName = leadName ? `${leadName} in JV with ${partnerName}` : partnerName;
                                      const jvDetails = leadName 
                                        ? `Lead Partner: ${leadName} & Associate Partner: ${partnerName} (${partner.countryOfOrigin || 'Ethiopia'}, TIN: ${partner.tinNumber || 'N/A'})`
                                        : `Associate Partner: ${partnerName} (${partner.countryOfOrigin || 'Ethiopia'}, TIN: ${partner.tinNumber || 'N/A'})`;

                                      setConsultantForm(prev => ({
                                        ...prev,
                                        partnerFirmName: partnerName,
                                        firmName: combinedName,
                                        jvPartners: jvDetails
                                      }));
                                    } else {
                                      setConsultantForm(prev => ({ ...prev, partnerFirmName: val }));
                                    }
                                  } catch (err) {
                                    setConsultantForm(prev => ({ ...prev, partnerFirmName: val }));
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">-- Choose JV Partner Firm (Different from Lead) --</option>
                                {(() => {
                                  try {
                                    const saved = localStorage.getItem('era_registered_firms_v1');
                                    const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                                    // Exclude Lead Firm so JV Partner is DIFFERENT from Lead Firm!
                                    return allFirms
                                      .filter(f => f.firmType === 'Consultant' && f.firmName !== consultantForm.leadFirmName)
                                      .map(f => (
                                        <option key={f.id} value={f.firmName}>
                                          {f.firmName} ({f.countryOfOrigin || 'Ethiopia'})
                                        </option>
                                      ));
                                  } catch {
                                    return DEFAULT_REGISTERED_FIRMS
                                      .filter(f => f.firmType === 'Consultant' && f.firmName !== consultantForm.leadFirmName)
                                      .map(f => (
                                        <option key={f.id} value={f.firmName}>
                                          {f.firmName} ({f.countryOfOrigin || 'Ethiopia'})
                                        </option>
                                      ));
                                  }
                                })()}
                              </select>
                            </div>
                          </div>

                          {/* Partner Share Percentages (% Weighting for JV Score Calculation) */}
                          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                👑 Lead Firm Share Percentage (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={consultantForm.leadSharePct !== undefined ? consultantForm.leadSharePct : 60}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(99, Number(e.target.value) || 60));
                                    setConsultantForm(prev => ({
                                      ...prev,
                                      leadSharePct: val,
                                      partnerSharePct: 100 - val
                                    }));
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-white"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                🤛 Associate Partner Share Percentage (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={consultantForm.partnerSharePct !== undefined ? consultantForm.partnerSharePct : 40}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(99, Number(e.target.value) || 40));
                                    setConsultantForm(prev => ({
                                      ...prev,
                                      partnerSharePct: val,
                                      leadSharePct: 100 - val
                                    }));
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-white"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 2: FINANCIAL REMUNERATION & CURRENCY OUTLAY */}
                {(editModalSection === 'all' || editModalSection === 'financial') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Section 2: Contract Financial Remuneration & Fees
                        </h4>
                      </div>

                      {/* Foreign Currency USD Toggle */}
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!consultantForm.enableUsdPayments}
                          onChange={(e) => setConsultantForm({ ...consultantForm, enableUsdPayments: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span>Enable Foreign Currency (USD) Remuneration</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Original Contract Fee (ETB) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={consultantForm.originalFeeEtb || 0}
                            onChange={(e) => setConsultantForm({ ...consultantForm, originalFeeEtb: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-12 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white font-bold shadow-xs"
                          />
                          <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono text-[11px]">
                            ETB
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Revised / Approved Contract Fee (ETB) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={consultantForm.revisedFeeEtb || 0}
                            onChange={(e) => setConsultantForm({ ...consultantForm, revisedFeeEtb: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-12 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white font-bold shadow-xs"
                          />
                          <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono text-[11px]">
                            ETB
                          </span>
                        </div>
                      </div>

                      {consultantForm.enableUsdPayments ? (
                        <>
                          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1 sm:col-span-1">
                            <label className="block font-bold text-purple-700 dark:text-purple-300 mb-1">
                              Original Foreign Fee (USD)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={consultantForm.originalFeeUsd || 0}
                                onChange={(e) => setConsultantForm({ ...consultantForm, originalFeeUsd: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-12 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                              />
                              <span className="absolute left-3 top-2 font-bold text-purple-400 font-mono text-[11px]">
                                USD $
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1 sm:col-span-1">
                            <label className="block font-bold text-purple-700 dark:text-purple-300 mb-1">
                              Revised Foreign Fee (USD)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={consultantForm.revisedFeeUsd || 0}
                                onChange={(e) => setConsultantForm({ ...consultantForm, revisedFeeUsd: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-12 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                              />
                              <span className="absolute left-3 top-2 font-bold text-purple-400 font-mono text-[11px]">
                                USD $
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-2 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                          <Info className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            Foreign currency (USD) payments are currently <strong>disabled</strong>. Check the toggle above to enable dual-currency billing (ETB + USD).
                          </span>
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Consultant Performance & Quality Evaluation Rating
                        </label>
                        <select
                          value={consultantForm.performanceRating || 'Satisfactory'}
                          onChange={(e) => setConsultantForm({ ...consultantForm, performanceRating: e.target.value as any })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium shadow-xs"
                        >
                          <option value="Outstanding">Outstanding (Exceeding FIDIC & Client Milestones)</option>
                          <option value="Satisfactory">Satisfactory (Meeting All Quality & Schedule Deliverables)</option>
                          <option value="Needs Improvement">Needs Improvement (Delayed Reviews or Staffing Gaps)</option>
                          <option value="Critical">Critical (Significant Non-Compliance / Formal Warning)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: KEY DATES, TIMELINE & SERVICE PERIOD */}
                {(editModalSection === 'all' || editModalSection === 'dates') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Section 3: Key Contractual Dates & Timeline Milestones
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                        {consultantForm.commencementDate ? `Commenced: ${consultantForm.commencementDate}` : 'Commencement Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Contract Signing Date
                        </label>
                        <input
                          type="date"
                          value={consultantForm.contractSignDate || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, contractSignDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Supervision Commencement Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={consultantForm.commencementDate || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, commencementDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Original Contract Completion Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={consultantForm.originalCompletionDate || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, originalCompletionDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Revised / Approved Completion Date (EOT)
                        </label>
                        <input
                          type="date"
                          value={consultantForm.revisedCompletionDate || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, revisedCompletionDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs font-bold text-amber-600 dark:text-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: HEAD OFFICE & CORPORATE HEADQUARTERS DETAILS */}
                {(editModalSection === 'all' || editModalSection === 'headOffice') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Section 4: Head Office & Corporate Liaison
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        HQ Communications & Official Notices
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Head Office Physical Address
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Bole Sub-City, Woreda 03, House #412, Addis Ababa, Ethiopia"
                          value={consultantForm.headOfficeAddress || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, headOfficeAddress: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Authorized Representative / Contact Person
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. Eng. Tamrat Haile (Managing Director)"
                          value={consultantForm.headOfficeContactPerson || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, headOfficeContactPerson: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Corporate Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="+251 11 661 2345"
                          value={consultantForm.headOfficePhone || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, headOfficePhone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Corporate Official Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="contact@consultingfirm.com"
                          value={consultantForm.headOfficeEmail || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, headOfficeEmail: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 5: RESIDENT ENGINEER & SITE SUPERVISION */}
                {(editModalSection === 'all' || editModalSection === 'residentEngineer') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Section 5: Resident Engineer & Site Supervision (FIDIC Representative)
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Engineer's Representative on Site
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Resident Engineer / Team Leader Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Eng. Yohannes Bekele"
                          value={consultantForm.residentEngineerName || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Site Camp / Base Office Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Station Km 42+000 Camp, Robe Base"
                          value={consultantForm.siteOfficeLocation || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, siteOfficeLocation: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Resident Engineer Direct Phone
                        </label>
                        <input
                          type="text"
                          placeholder="+251 91 123 4567"
                          value={consultantForm.residentEngineerPhone || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerPhone: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Resident Engineer Official Email
                        </label>
                        <input
                          type="email"
                          placeholder="re.site@consultingfirm.com"
                          value={consultantForm.residentEngineerEmail || ''}
                          onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerEmail: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 6: SCOPE OF SERVICES & CONTRACTUAL SUMMARY */}
                {(editModalSection === 'all' || editModalSection === 'scope') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Section 6: Scope of Services & FIDIC Contractual Obligations
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Terms of Reference Summary
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Scope of Consultancy Services & Key Obligations
                      </label>
                      <textarea
                        rows={4}
                        value={consultantForm.scopeOfServices || ''}
                        onChange={(e) => setConsultantForm({ ...consultantForm, scopeOfServices: e.target.value })}
                        placeholder="Detailed terms of reference: Construction supervision, quality assurance, materials testing, IPC certification, environmental and social compliance monitoring, and final as-built review."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-xs leading-relaxed"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 text-xs">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 font-medium">Total Fee (ETB):</span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {formatAccounting(consultantForm.revisedFeeEtb || consultantForm.originalFeeEtb || 0, 'ETB')}
                    </strong>
                  </div>
                  {consultantForm.enableUsdPayments && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-medium">
                      <span>USD:</span>
                      <strong className="font-mono">
                        {formatAccounting(consultantForm.revisedFeeUsd || consultantForm.originalFeeUsd || 0, 'USD')}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditConsultantOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConsultantProfile}
                    className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save Contract Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT PERSONNEL */}
      <AnimatePresence>
        {isPersonnelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  {selectedPersonnel ? 'Edit Assigned Personnel' : 'Assign New Consultant Personnel'}
                </h3>
                <button
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    Personnel Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eng. Yohannes Tadesse"
                    value={personnelForm.name || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    Specific Position / Key Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Highway / Pavement Engineer, Structural Engineer, Materials Engineer"
                    value={personnelForm.position || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Staff Category</label>
                  <select
                    value={personnelForm.category || 'Key Personnel'}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Key Personnel">Key Personnel</option>
                    <option value="Non-Key Professional">Non-Key Professional</option>
                    <option value="Sub-Professional">Sub-Professional</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Administrative Support">Administrative Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-indigo-600 dark:text-indigo-400 font-black mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Date of Assignment <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={personnelForm.assignmentDate || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, assignmentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Deployment Status</label>
                  <select
                    value={personnelForm.status || 'Active'}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      const todayStr = new Date().toISOString().split('T')[0];
                      let nextDemobDate = personnelForm.demobilizationDate;
                      if ((newStatus === 'Demobilized' || newStatus === 'Replaced') && !nextDemobDate) {
                        nextDemobDate = todayStr;
                      } else if (newStatus === 'Active' && nextDemobDate === todayStr) {
                        nextDemobDate = '';
                      }
                      setPersonnelForm({ 
                        ...personnelForm, 
                        status: newStatus,
                        demobilizationDate: nextDemobDate
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Demobilized">Demobilized</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Replaced">Replaced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Completion / Demobilization Date {(personnelForm.status === 'Demobilized' || personnelForm.status === 'Replaced') ? '(Instantly Set for Project Commitment)' : '(if applicable)'}
                  </label>
                  <input
                    type="date"
                    value={personnelForm.demobilizationDate || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, demobilizationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                  {(personnelForm.status === 'Demobilized' || personnelForm.status === 'Replaced') && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5">
                      Marked as the exact completion date of commitment for this project.
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Academic & Professional Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g. MSc Highway Engineering, BSc Civil Eng (PE)"
                    value={personnelForm.qualification || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={personnelForm.yearsExperience || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, yearsExperience: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Site Station / Assigned Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Daye Main Camp, Section 1 (KM 0-35)"
                    value={personnelForm.siteStation || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, siteStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Man-Months Allocated</label>
                  <input
                    type="number"
                    step="0.5"
                    value={personnelForm.manMonthsAllocated || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, manMonthsAllocated: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Man-Months Expended / Input to Date</label>
                  <input
                    type="number"
                    step="0.5"
                    value={personnelForm.manMonthsInput || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, manMonthsInput: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251 91 234 5678"
                    value={personnelForm.contactPhone || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="personnel@consultant.com"
                    value={personnelForm.contactEmail || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Remarks & Key Scope Responsibilities</label>
                  <textarea
                    rows={2}
                    placeholder="Specific site duties, design review scope, test witnessing, or delegation notes..."
                    value={personnelForm.remarks || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersonnel}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {selectedPersonnel ? 'Save Personnel' : 'Confirm Assignment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: VIEW PERSONNEL DETAIL CARD */}
      <AnimatePresence>
        {viewDetailPersonnel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {viewDetailPersonnel.name}
                    </h3>
                    <span className="text-xs text-indigo-600 font-bold">{viewDetailPersonnel.position}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewDetailPersonnel(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Date of Assignment</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {viewDetailPersonnel.assignmentDate}
                    </span>
                  </div>
                  {viewDetailPersonnel.demobilizationDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">
                        {viewDetailPersonnel.status === 'Replaced' ? 'Replacement & Completion Date' : 'Demobilization & Completion Date'}
                      </span>
                      <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                        {viewDetailPersonnel.demobilizationDate}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Duration on Project</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {getAssignmentDuration(viewDetailPersonnel.assignmentDate, viewDetailPersonnel.demobilizationDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Category & Status</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {viewDetailPersonnel.category} • {viewDetailPersonnel.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Man-Months</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {viewDetailPersonnel.manMonthsInput || 0} expended / {viewDetailPersonnel.manMonthsAllocated || 0} allocated
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Qualifications & Experience</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewDetailPersonnel.qualification || 'N/A'} ({viewDetailPersonnel.yearsExperience || 0} years experience)
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Site Station & Location</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewDetailPersonnel.siteStation || 'Main Site Camp'}
                  </div>
                </div>

                {viewDetailPersonnel.remarks && (
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Assigned Scope / Remarks</span>
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {viewDetailPersonnel.remarks}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setViewDetailPersonnel(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: QUICK EDIT HEAD OFFICE */}
      <AnimatePresence>
        {isEditHeadOfficeQuickOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Edit Consultant Head Office Details
                </h3>
                <button
                  onClick={() => setIsEditHeadOfficeQuickOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Head Office Physical Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Bole Sub-City, Woreda 03, House #412, Addis Ababa, Ethiopia"
                    value={headOfficeForm.headOfficeAddress}
                    onChange={(e) => setHeadOfficeForm({ ...headOfficeForm, headOfficeAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contact Person / Authorized Representative</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Eng. Tamrat Haile (Managing Director)"
                    value={headOfficeForm.headOfficeContactPerson}
                    onChange={(e) => setHeadOfficeForm({ ...headOfficeForm, headOfficeContactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Corporate Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251 11 661 2345"
                    value={headOfficeForm.headOfficePhone}
                    onChange={(e) => setHeadOfficeForm({ ...headOfficeForm, headOfficePhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Corporate Email Address</label>
                  <input
                    type="email"
                    placeholder="info@consultingfirm.com"
                    value={headOfficeForm.headOfficeEmail}
                    onChange={(e) => setHeadOfficeForm({ ...headOfficeForm, headOfficeEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsEditHeadOfficeQuickOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHeadOfficeQuick}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Update Head Office
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: ASSIGN SUCCESSOR CONSULTANT (CONTINUATION OF SERVICE) */}
      <AnimatePresence>
        {isAssignNewConsultantOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                    Assign Successor Consultant (Continuation of Service)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transition supervision to a new consulting firm while archiving the outgoing consultant's service record.
                  </p>
                </div>
                <button
                  onClick={() => setIsAssignNewConsultantOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Consultant Summary Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                    Outgoing Consultant Being Archived
                  </span>
                  <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">
                    {consultant.contractRefNo || 'No Ref'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {consultant.firmName}
                </div>
                <div className="text-slate-600 dark:text-slate-300 text-[11px] flex flex-wrap gap-x-4">
                  <span>Commenced: <strong>{consultant.commencementDate || 'N/A'}</strong></span>
                  <span>Approved Completion: <strong>{consultant.revisedCompletionDate || consultant.originalCompletionDate || 'N/A'}</strong></span>
                  <span>Invoices on Record: <strong>{consultant.invoices?.length || 0}</strong></span>
                </div>
              </div>

              {/* Transition Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Reason for Contract Transition *</label>
                  <select
                    value={newConsultantForm.transitionReason}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, transitionReason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Time assigned completed (contract & extension expired)">Time assigned completed (contract & extension expired)</option>
                    <option value="Contract termination & re-tendering">Contract termination & re-tendering</option>
                    <option value="Mutual agreement & administrative transition">Mutual agreement & administrative transition</option>
                    {consultant.associationType !== 'Sole Consultant' && (
                      <option value="Joint venture restructuring / substitution">Joint venture restructuring / substitution</option>
                    )}
                    <option value="Continuation of service under fresh engagement">Continuation of service under fresh engagement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Handover / Effective Transition Date *</label>
                  <input
                    type="date"
                    required
                    value={newConsultantForm.handoverDate}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, handoverDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newConsultantForm.retainPersonnelMode === 'all'}
                      onChange={(e) => setNewConsultantForm({ ...newConsultantForm, retainPersonnelMode: e.target.checked ? 'all' : 'none' })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span>Retain existing active site personnel roster for the new consultant</span>
                  </label>
                </div>

                {/* New Consultant Details Section */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    New Successor Consultant Profile
                  </span>
                  
                  {/* Select Pre-Registered Consultant */}
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1">
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      👔 Select from Registered Consultant Directory
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const saved = localStorage.getItem('era_registered_firms_v1');
                          const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                          const selected = allFirms.find(f => (f.id === val || f.firmName === val) && f.firmType === 'Consultant');
                          if (selected) {
                            setNewConsultantForm(prev => ({
                              ...prev,
                              firmName: selected.firmName
                            }));
                          }
                        } catch (err) {
                          console.warn('Successor firm select error', err);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-800 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Choose Registered Consultant Entity --</option>
                      {(() => {
                        try {
                          const saved = localStorage.getItem('era_registered_firms_v1');
                          const allFirms: RegisteredFirm[] = saved ? JSON.parse(saved) : DEFAULT_REGISTERED_FIRMS;
                          const consultantOnlyFirms = allFirms.filter(f => f.firmType === 'Consultant');
                          return consultantOnlyFirms.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.firmName} (TIN: {f.tinNumber} • {f.countryOfOrigin})
                            </option>
                          ));
                        } catch {
                          return DEFAULT_REGISTERED_FIRMS.filter(f => f.firmType === 'Consultant').map(f => (
                            <option key={f.id} value={f.id}>
                              {f.firmName} (TIN: {f.tinNumber} • {f.countryOfOrigin})
                            </option>
                          ));
                        }
                      })()}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    {newConsultantForm.associationType === 'Sole Consultant' ? 'New Consulting Firm Name *' : 'New Consulting Firm / Lead Partner *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newConsultantForm.associationType === 'Sole Consultant' ? "e.g. Associated Engineering Consultants" : "e.g. Associated Engineering Consultants in JV with Ethio-Roads Consulting"}
                    value={newConsultantForm.firmName}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, firmName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Association Type</label>
                  <select
                    value={newConsultantForm.associationType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setNewConsultantForm({ 
                        ...newConsultantForm, 
                        associationType: newType,
                        jvPartners: newType === 'Sole Consultant' ? '' : newConsultantForm.jvPartners
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Sole Consultant">Sole Consultant</option>
                    <option value="Joint Venture (JV)">Joint Venture (JV)</option>
                    <option value="Lead Consultant">Lead Consultant</option>
                    <option value="Association / Consortium">Association / Consortium</option>
                  </select>
                </div>



                <div>
                  <label className="block text-slate-500 font-semibold mb-1">New Contract Reference No</label>
                  <input
                    type="text"
                    placeholder="e.g. ERA/CS/CONT/2026/02"
                    value={newConsultantForm.contractRefNo}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, contractRefNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">New Contract Fee (ETB)</label>
                  <input
                    type="number"
                    value={newConsultantForm.originalFeeEtb}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, originalFeeEtb: parseFloat(e.target.value) || 0, revisedFeeEtb: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>

                {/* Optional USD Payments Toggle */}
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                    <input
                      type="checkbox"
                      checked={newConsultantForm.enableUsdPayments}
                      onChange={(e) => setNewConsultantForm({ ...newConsultantForm, enableUsdPayments: e.target.checked })}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Enable Foreign Currency (USD) Remuneration for this New Consultant</span>
                  </label>
                </div>

                {newConsultantForm.enableUsdPayments && (
                  <div>
                    <label className="block text-purple-600 dark:text-purple-400 font-bold mb-1">New Foreign Fee (USD)</label>
                    <input
                      type="number"
                      value={newConsultantForm.originalFeeUsd}
                      onChange={(e) => setNewConsultantForm({ ...newConsultantForm, originalFeeUsd: parseFloat(e.target.value) || 0, revisedFeeUsd: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl font-mono text-purple-700 dark:text-purple-300 font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">New Commencement Date</label>
                  <input
                    type="date"
                    value={newConsultantForm.commencementDate}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, commencementDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">New Completion Date</label>
                  <input
                    type="date"
                    value={newConsultantForm.originalCompletionDate}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, originalCompletionDate: e.target.value, revisedCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Resident Engineer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Eng. Dawit Kassa"
                    value={newConsultantForm.residentEngineerName}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, residentEngineerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Head Office Address</label>
                  <input
                    type="text"
                    placeholder="Head Office location of new consultant"
                    value={newConsultantForm.headOfficeAddress}
                    onChange={(e) => setNewConsultantForm({ ...newConsultantForm, headOfficeAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsAssignNewConsultantOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignNewConsultant}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Confirm & Archive Predecessor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: VIEW HISTORICAL CONSULTANT DOSSIER */}
      <AnimatePresence>
        {selectedHistoricalConsultant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 font-bold">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {selectedHistoricalConsultant.firmName}
                    </h3>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                      Archived Supervision Consultant Dossier
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHistoricalConsultant(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Contract Reference</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {selectedHistoricalConsultant.contractRefNo || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Service Period</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedHistoricalConsultant.commencementDate || 'N/A'} — {selectedHistoricalConsultant.handoverDate || 'Archived'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Contract Fee (ETB)</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatAccounting(selectedHistoricalConsultant.revisedFeeEtb || selectedHistoricalConsultant.originalFeeEtb || 0, 'ETB')}
                    </span>
                  </div>
                  {selectedHistoricalConsultant.enableUsdPayments && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Foreign Fee (USD)</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        ${formatAccounting(selectedHistoricalConsultant.revisedFeeUsd || selectedHistoricalConsultant.originalFeeUsd || 0, '')}
                      </span>
                    </div>
                  )}
                  {selectedHistoricalConsultant.headOfficeAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Head Office</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-xs truncate">
                        {selectedHistoricalConsultant.headOfficeAddress}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Transition Note</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
                    {selectedHistoricalConsultant.reasonForTransition || 'Service tenure concluded.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Evaluation Score</span>
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1.5">
                      <span>{selectedHistoricalConsultant.evaluationScore || 80}%</span>
                      {isMasterDirectorOrCpmAdmin && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200">
                          Grade {selectedHistoricalConsultant.officialGrade || 'B'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">SLA Compliance</span>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedHistoricalConsultant.slaComplianceRatePct || 90}% On-Time
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Archived Staff</span>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedHistoricalConsultant.personnel?.length || 0} Personnel
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Archived Invoices</span>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedHistoricalConsultant.invoices?.length || 0} Invoices
                    </div>
                  </div>
                </div>

                {/* Archived Contract Baseline & Remuneration Schedule (Fully Booked) */}
                {selectedHistoricalConsultant.contractAmountSchedule?.condition1 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                        Archived Contract Baseline Schedule (Fully Booked)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                        Archived Record
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Staff Fees</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatAccounting(selectedHistoricalConsultant.contractAmountSchedule.condition1.feesTimeBased || selectedHistoricalConsultant.contractAmountSchedule.condition1.summary?.fees || 0, 'ETB')}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Reimbursables</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatAccounting(selectedHistoricalConsultant.contractAmountSchedule.condition1.reimbursableTotal || selectedHistoricalConsultant.contractAmountSchedule.condition1.summary?.reimbursableExpenses || 0, 'ETB')}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">10% Cont. + 15% VAT</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatAccounting((selectedHistoricalConsultant.contractAmountSchedule.condition1.summary?.contingency || 0) + (selectedHistoricalConsultant.contractAmountSchedule.condition1.summary?.vat || 0), 'ETB')}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Baseline</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {formatAccounting(selectedHistoricalConsultant.contractAmountSchedule.condition1.summary?.subTotal || selectedHistoricalConsultant.revisedFeeEtb || selectedHistoricalConsultant.originalFeeEtb || 0, 'ETB')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historical Submittals Log / KPI Summary (Admin Only) */}
                {isAdmin && selectedHistoricalConsultant.submittalKpis && selectedHistoricalConsultant.submittalKpis.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        Archived Submittals & SLA Log ({selectedHistoricalConsultant.submittalKpis.length} Items)
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Avg Turnaround: {selectedHistoricalConsultant.evaluationSummary?.avgTurnaroundDays || 5.0} days
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedHistoricalConsultant.submittalKpis.slice(0, 10).map((sub, sIdx) => (
                        <div key={sub.id || `sub_${sIdx}`} className="pt-1.5 first:pt-0 flex items-center justify-between text-[10.5px]">
                          <div className="truncate max-w-[320px]">
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{sub.submittalNo}:</span>{' '}
                            <span className="text-slate-600 dark:text-slate-400">{sub.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-slate-500">{sub.actualDays !== undefined ? `${sub.actualDays}d` : 'Pending'}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              (sub.actualDays !== undefined && sub.actualDays <= sub.targetDays)
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {(sub.actualDays !== undefined && sub.actualDays <= sub.targetDays) ? 'Complied' : 'Delayed'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recorded Personnel List in Dossier */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Recorded Personnel Roster ({selectedHistoricalConsultant.personnel?.length || 0})
                  </h4>

                  {(!selectedHistoricalConsultant.personnel || selectedHistoricalConsultant.personnel.length === 0) ? (
                    <div className="py-4 text-center text-slate-400 text-[11px] bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      No personnel records attached to this historical dossier.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedHistoricalConsultant.personnel.map((p) => (
                        <div key={p.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                              {p.name}
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {p.position}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Category: <strong>{p.category}</strong></span>
                              <span>•</span>
                              <span>Status: <strong className={p.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}>{p.status}</strong></span>
                            </div>
                          </div>

                          {isMasterAdmin && (
                            <button
                              onClick={() => handleDeleteHistoricalPersonnelFromDossier(selectedHistoricalConsultant.archivedAt, p.id, p.name)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg font-bold text-[10px] flex items-center gap-1 transition shrink-0 shadow-xs"
                              title="Permanently delete staff member from historical dossier"
                            >
                              <Trash2 className="w-3 h-3" />
                              Permanently Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedHistoricalConsultant(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REPLACE PERSONNEL WITH SUCCESSOR */}
      <AnimatePresence>
        {isReplaceModalOpen && personnelToReplace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 font-bold">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Replace Assigned Personnel
                    </h3>
                    <p className="text-xs text-slate-400">
                      Mobilize incoming successor and demobilize predecessor to archive (record preserved in history).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsReplaceModalOpen(false); setPersonnelToReplace(null); }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Outgoing Predecessor Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Outgoing Predecessor (To be Demobilized & Moved to Bottom of Table)
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {personnelToReplace.name}
                    </div>
                    <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {personnelToReplace.position} ({personnelToReplace.category})
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    <div>Assigned: <strong>{personnelToReplace.assignmentDate || 'N/A'}</strong></div>
                    <div>MM Input: <strong>{personnelToReplace.manMonthsInput || 0} / {personnelToReplace.manMonthsAllocated || 0}</strong></div>
                  </div>
                </div>
              </div>

              {/* Handover & Replacement Transition Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Effective Handover / Replacement Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={replaceForm.replacementDate}
                    onChange={(e) => setReplaceForm({ ...replaceForm, replacementDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Replacement Reason / Approval Basis
                  </label>
                  <input
                    type="text"
                    value={replaceForm.reason}
                    onChange={(e) => setReplaceForm({ ...replaceForm, reason: e.target.value })}
                    placeholder="e.g. Contractual substitution approved by Employer"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {/* Successor Form Header */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Incoming Successor Personnel Details (Active at Top)
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    Successor Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eng. Dawit Kebede"
                    value={replaceForm.successorName}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorName: e.target.value })}
                    className="w-full px-3 py-2 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Specific Position / Role *</label>
                  <input
                    type="text"
                    required
                    value={replaceForm.successorPosition}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorPosition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Category</label>
                  <select
                    value={replaceForm.successorCategory}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorCategory: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Key Personnel">Key Personnel</option>
                    <option value="Non-Key Personnel">Non-Key Personnel</option>
                    <option value="Sub-Professional Staff">Sub-Professional Staff</option>
                    <option value="Support Staff">Support Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Qualifications / Education</label>
                  <input
                    type="text"
                    placeholder="e.g. MSc in Highway Engineering, BSc Civil Eng."
                    value={replaceForm.successorQualification}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorQualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={replaceForm.successorExperience}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorExperience: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Allocated Man-Months (MM)</label>
                  <input
                    type="number"
                    value={replaceForm.successorAllocatedMM}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorAllocatedMM: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Initial Expended Man-Months</label>
                  <input
                    type="number"
                    value={replaceForm.successorInputMM}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorInputMM: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+251 9..."
                    value={replaceForm.successorPhone}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="engineer@consultant.com"
                    value={replaceForm.successorEmail}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Site Station / Assigned Base</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Camp KM 42+000 / Bridge Site 2"
                    value={replaceForm.successorSiteStation}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorSiteStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Handover & Substitution Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Notes regarding handover of duties, timesheet reconciliation, or approvals..."
                    value={replaceForm.successorRemarks}
                    onChange={(e) => setReplaceForm({ ...replaceForm, successorRemarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 max-w-xs">
                  The predecessor will be marked as <strong className="text-amber-600">Replaced</strong> and moved immediately to the bottom of the table.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsReplaceModalOpen(false); setPersonnelToReplace(null); }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReplacePersonnel}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Confirm Replacement
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Cross-Project Supervision Personnel Workload Report Modal */}
      <WorkloadReportModal
        isOpen={isWorkloadReportOpen}
        onClose={() => setIsWorkloadReportOpen(false)}
        projects={projects && projects.length > 0 ? projects : [project]}
        currentProject={project}
        currentUser={currentUser}
        title="Supervision Personnel Workload & Project Commitments Report"
      />
    </div>
  );
}


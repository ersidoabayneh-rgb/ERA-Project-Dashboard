import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Calendar, 
  Save, 
  RefreshCw, 
  Users, 
  Table, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  DollarSign, 
  Building2, 
  Landmark, 
  Clock, 
  Layers, 
  Receipt,
  ArrowLeft,
  ChevronRight,
  Info,
  ArrowRightLeft,
  History,
  UserCheck,
  UserX,
  FastForward,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Percent,
  SlidersHorizontal,
  ShieldAlert,
  Lock,
  Unlock,
  ExternalLink,
  Download,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import { drawEraLogo } from '../lib/pdfReportEngine';
import { Project, SupervisionConsultantInfo, ConsultantInvoice, ConsultantPersonnel, ContractReimbursableCondition1 } from '../types';
import { DEFAULT_CONDITION_1_STAFF } from '../data/defaultContractAmount';
import { numberToWords } from '../lib/numberToWords';

export interface EditableStaffRow {
  id: string;
  no?: string;
  personnelId?: string;
  position: string;
  name: string;
  unit: string;
  rate: number;
  rateUsd?: number;
  originalRate?: number;
  effectiveRate?: number;
  isReduced?: boolean;
  contractQty: number;
  contractAmount: number;
  contractAmountUsd?: number;
  mmConstr?: number;
  mmDlp?: number;
  totalMm?: number;
  daysWorked: number;
  precedingQty: number;
  precedingAmount: number;
  precedingAmountUsd?: number;
  thisInvoiceAmount?: number;
  dailyReimbursableRate?: number;
  // Directory Linkage & Replacement Tracking
  status?: 'Active' | 'Demobilized' | 'Replaced' | 'On Leave' | string;
  category?: string;
  assignmentDate?: string;
  demobilizationDate?: string;
  replacementDate?: string;
  predecessorId?: string;
  predecessorName?: string;
  replacedById?: string;
  replacedByName?: string;
  isHistoricalPredecessor?: boolean;
}

export interface EditableReimbursableRow {
  id: string;
  no?: string;
  description: string;
  basis?: string;
  unit: string;
  rate: number;
  rateUsd?: number;
  effectiveRate?: number;
  isReduced?: boolean;
  contractQty: number;
  contractAmount: number;
  contractAmountUsd?: number;
  thisInvoiceQty: number;
  thisInvoiceAmount: number;
  thisInvoiceAmountUsd?: number;
  precedingQty: number;
  precedingAmount: number;
  precedingAmountUsd?: number;
}

export interface EditableDefectLiabilityRow {
  id: string;
  position: string;
  name?: string;
  unit: string;
  rate: number;
  rateUsd?: number;
  contractQty: number;
  contractAmount: number;
  contractAmountUsd?: number;
  thisInvoiceQty: number;
  thisInvoiceAmount: number;
  thisInvoiceAmountUsd?: number;
  precedingQty?: number;
  precedingAmount?: number;
  precedingAmountUsd?: number;
}

export const OFFICIAL_DKS_REIMBURSABLE_DEFAULT: EditableReimbursableRow[] = [
  { id: 'reimb_1', description: 'Head office Support', unit: 'Month', rate: 19000.00, contractQty: 36, contractAmount: 684000.00, thisInvoiceQty: 0.55, thisInvoiceAmount: 10450.00, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_2', description: 'Communication Cost', unit: 'Month', rate: 12000.00, contractQty: 36, contractAmount: 432000.00, thisInvoiceQty: 0.55, thisInvoiceAmount: 6600.00, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_3', description: 'Insurance cost', unit: 'LS', rate: 400000.00, contractQty: 1, contractAmount: 400000.00, thisInvoiceQty: 1.00, thisInvoiceAmount: 400000.00, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_4', description: "Accommodation - Engineer's Key Staffs", unit: 'MM', rate: 30000.00, contractQty: 36, contractAmount: 1080000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_5', description: "Accommodation - Engineer's Intermediate Staffs", unit: 'MM', rate: 24000.00, contractQty: 42, contractAmount: 1008000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_6', description: "Accommodation - Engineer's Support Staffs", unit: 'MM', rate: 22500.00, contractQty: 30, contractAmount: 675000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_7', description: "Surveying Equipment For the Engineer's Staffs", unit: 'Month', rate: 85000.00, contractQty: 6, contractAmount: 510000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_8', description: 'Production Of Report', unit: 'Month', rate: 15000.00, contractQty: 36, contractAmount: 540000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_9', description: 'Vehicle Rental & Operation', unit: 'Month', rate: 75000.00, contractQty: 36, contractAmount: 2700000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 },
  { id: 'reimb_10', description: 'Materials Testing & Quality Laboratory Operations', unit: 'LS', rate: 350000.00, contractQty: 1, contractAmount: 350000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0, precedingQty: 0, precedingAmount: 0 }
];

export const OFFICIAL_DKS_DEFECT_LIABILITY_DEFAULT: EditableDefectLiabilityRow[] = [
  { id: 'dl_1', position: 'Resident Engineer (2 Months)', unit: 'Month', rate: 39500.00, contractQty: 2, contractAmount: 79000.00, thisInvoiceQty: 0, thisInvoiceAmount: 0 },
  { id: 'dl_2', position: 'Senior Quantity Surveyor (1 Month)', unit: 'Month', rate: 31630.00, contractQty: 1, contractAmount: 31630.00, thisInvoiceQty: 0, thisInvoiceAmount: 0 },
  { id: 'dl_3', position: 'Senior Surveyor (1 Month)', unit: 'Month', rate: 28467.00, contractQty: 1, contractAmount: 28467.00, thisInvoiceQty: 0, thisInvoiceAmount: 0 },
];

export const OFFICIAL_DKS_STAFF_POSITIONS_DEFAULT: EditableStaffRow[] = [];

// Helper to calculate next calendar month and next invoice number
function computeNextBillingPeriod(currentPeriod: string): { nextPeriodStr: string; nextDaysInMonth: number; nextMonthName: string } {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const lower = (currentPeriod || '').toLowerCase();
  let foundMonthIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (lower.includes(monthNames[i].toLowerCase()) || lower.includes(monthAbbrs[i].toLowerCase())) {
      foundMonthIdx = i;
      break;
    }
  }

  const yearMatch = currentPeriod.match(/20\d{2}/);
  let year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

  if (foundMonthIdx === -1) {
    foundMonthIdx = new Date().getMonth();
  }

  let nextMonthIdx = foundMonthIdx + 1;
  let nextYear = year;
  if (nextMonthIdx >= 12) {
    nextMonthIdx = 0;
    nextYear = year + 1;
  }

  const nextMonthName = monthNames[nextMonthIdx];
  const nextDaysInMonth = new Date(nextYear, nextMonthIdx + 1, 0).getDate();
  const nextPeriodStr = `${nextMonthName}.01 ${nextYear} - ${nextMonthName}.${nextDaysInMonth} ${nextYear}`;

  return { nextPeriodStr, nextDaysInMonth, nextMonthName };
}

function computeNextInvoiceNumber(currentInvNo: string): string {
  if (!currentInvNo) return 'INV-DKS-02';
  const match = currentInvNo.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    const padded = String(num).padStart(match[2].length, '0');
    return `${prefix}${padded}`;
  }
  return `${currentInvNo}-02`;
}

interface MonthlyInvoiceCalculationTableProps {
  project: Project;
  consultant: SupervisionConsultantInfo;
  activeInvoice?: ConsultantInvoice | null;
  onSaveInvoice: (computedInvoice: ConsultantInvoice) => void;
  onBackToLedger?: () => void;
  onSelectInvoice?: (inv: ConsultantInvoice) => void;
  onUpdateConsultantPersonnel?: (updatedPersonnel: ConsultantPersonnel[]) => void;
  onNavigateToContractAmount?: () => void;
  onUpdateContractReimbursables?: (reimbursables: ContractReimbursableCondition1[]) => void;
  viewCurrency?: 'ETB' | 'USD';
  exchangeRate?: number;
  onProceedToNextMonth?: (currentLockedInvoice: ConsultantInvoice, newMonthInvoice: ConsultantInvoice) => void;
}

export const MonthlyInvoiceCalculationTable: React.FC<MonthlyInvoiceCalculationTableProps> = ({
  project,
  consultant,
  activeInvoice,
  onSaveInvoice,
  onBackToLedger,
  onSelectInvoice,
  onUpdateConsultantPersonnel,
  onNavigateToContractAmount,
  onUpdateContractReimbursables,
  onProceedToNextMonth,
  viewCurrency = 'ETB',
  exchangeRate = 125.0
}) => {
  // Navigation tabs for the tables
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'attendance' | 'reimbursables' | 'dlp' | 'summary'>('all');

  // Staff Directory Filter (All Assigned, Active Only, Replaced History)
  const [personnelFilter, setPersonnelFilter] = useState<'all' | 'active_only' | 'replaced_only'>('all');

  // USD Billing Toggle State
  const [usdBillingEnabled, setUsdBillingEnabled] = useState<boolean>(
    Boolean(project.enableUsdPayments === true || consultant.enableUsdPayments === true)
  );

  // Metadata
  const [invoiceNo, setInvoiceNo] = useState<string>('INV-DKS-01');
  const [billingMonth, setBillingMonth] = useState<string>('October');
  const [billingYear, setBillingYear] = useState<number>(2020);
  const [submissionDate, setSubmissionDate] = useState<string>('2020-10-31');
  const [invoiceDate, setInvoiceDate] = useState<string>('December 28, 2020');
  const [totalDaysInMonth, setTotalDaysInMonth] = useState<number>(31);

  const [clientName, setClientName] = useState<string>('The Director General, Ethiopian Roads Administration');
  const [clientAddress, setClientAddress] = useState<string>('P.O.Box 1770, Addis Ababa');
  const [consultantFirm, setConsultantFirm] = useState<string>(consultant.firmName || 'Associated Engineering Consultants');
  const [bankName, setBankName] = useState<string>('Commercial Bank Of Ethiopia');
  const [bankBranch, setBankBranch] = useState<string>('Finfine Branch');
  const [bankAccountNo, setBankAccountNo] = useState<string>('1000001814226');
  const [projectContractNo, setProjectContractNo] = useState<string>(project.contractNo || 'S/71/NCB/RP/GOE/2012');

  // Workflow / Payment fields
  const [status, setStatus] = useState<ConsultantInvoice['status']>('Submitted');
  const [paymentReference, setPaymentReference] = useState<string>('Pending Transfer (CBE)');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isPrecedingBreakdownOpen, setIsPrecedingBreakdownOpen] = useState<boolean>(false);
  const [reimbSyncFeedback, setReimbSyncFeedback] = useState<{
    status: 'synced' | 'error' | 'syncing';
    message?: string;
    invalidRowId?: string;
  }>({
    status: 'synced',
    message: 'Sub Total 2 synchronized with Contract Table B'
  });

  // Saved Payment Immutability (Once saved, no change on the amount of the payment)
  const [isPaymentSaved, setIsPaymentSaved] = useState<boolean>(false);
  const [savedPaymentAmount, setSavedPaymentAmount] = useState<number | null>(null);
  const [allowAdminUnlock, setAllowAdminUnlock] = useState<boolean>(false);

  // Editable lists
  const [staffRows, setStaffRows] = useState<EditableStaffRow[]>([]);
  const [reimbursableRows, setReimbursableRows] = useState<EditableReimbursableRow[]>(() => {
    const list = consultant.contractAmountSchedule?.condition1?.reimbursableList;
    const hasOldPlaceholder = list && list.length === 3 && list[0].item === 'Per diem';
    const sourceList = (list && list.length > 0 && !hasOldPlaceholder)
      ? list
      : OFFICIAL_DKS_REIMBURSABLE_DEFAULT.map(d => ({
          id: d.id,
          no: d.no,
          item: d.description,
          description: d.description,
          unit: d.unit,
          rate: d.rate,
          contractQty: d.contractQty,
          amountEtb: d.contractAmount,
          contractAmount: d.contractAmount,
          basis: d.basis || ''
        }));

    return sourceList.map((item, idx) => {
      const qty = item.contractQty !== undefined ? item.contractQty : 1;
      const rate = item.rate !== undefined ? item.rate : (qty > 0 ? Number(((item.amountEtb ?? 0) / qty).toFixed(2)) : (item.amountEtb ?? 0));
      const amt = item.amountEtb !== undefined ? item.amountEtb : (item.contractAmount !== undefined ? item.contractAmount : (rate * qty));
      return {
        id: item.id || `reimb_${idx + 1}`,
        no: item.no || String(idx + 1),
        description: item.description || item.item || `Item ${idx + 1}`,
        basis: item.basis || '',
        unit: item.unit || 'Month',
        rate,
        rateUsd: item.rateUsd || (item.amountUsd && qty > 0 ? Number((item.amountUsd / qty).toFixed(2)) : 0),
        contractQty: qty,
        contractAmount: amt,
        contractAmountUsd: item.amountUsd || 0,
        thisInvoiceQty: 0,
        thisInvoiceAmount: 0,
        precedingQty: 0,
        precedingAmount: 0
      };
    });
  });
  const [defectRows, setDefectRows] = useState<EditableDefectLiabilityRow[]>(OFFICIAL_DKS_DEFECT_LIABILITY_DEFAULT);

  // Directorate Admin 10% Contract Reduction Mode
  const [directorateReductionMode, setDirectorateReductionMode] = useState<boolean>(false);
  const [reducedPositionIds, setReducedPositionIds] = useState<Record<string, boolean>>({});
  const [reducedReimbursableIds, setReducedReimbursableIds] = useState<Record<string, boolean>>({});

  // Staff Replacement Modal & Turnover Tracking State
  const [replacementModalStaff, setReplacementModalStaff] = useState<EditableStaffRow | null>(null);
  const [replacementNewName, setReplacementNewName] = useState<string>('');
  const [replacementDateInput, setReplacementDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [replacementRemarks, setReplacementRemarks] = useState<string>('');

  // Contingency % is derived directly from Contract Amount Schedule & locked
  // "and the Contingency amount and % should be similar in both page and once set on the contract amount page don't change it"
  const contractContingencyPct = useMemo(() => {
    if (consultant.contractAmountSchedule?.condition1?.contingencyPct !== undefined) {
      return Number(consultant.contractAmountSchedule.condition1.contingencyPct);
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`era_contract_contingency_${project.id}`);
        if (cached) {
          const parsed = parseFloat(cached);
          if (!isNaN(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return 15.0; // Official default ERA standard
  }, [consultant.contractAmountSchedule?.condition1?.contingencyPct, project.id]);

  const contingencyRatePct = contractContingencyPct;
  const [contingencyThisInvoiceClaim, setContingencyThisInvoiceClaim] = useState<number>(0);
  const [contingencyThisInvoiceClaimUsd, setContingencyThisInvoiceClaimUsd] = useState<number>(0);
  const [contingencyToDateEtb, setContingencyToDateEtb] = useState<number>(0);
  const [contingencyToDateUsd, setContingencyToDateUsd] = useState<number>(0);
  const [vatRatePct, setVatRatePct] = useState<number>(15.0);
  const [advanceDeductionEtb, setAdvanceDeductionEtb] = useState<number>(0);
  const [taxDeductionEtb, setTaxDeductionEtb] = useState<number>(0);
  const [overtimeEtb, setOvertimeEtb] = useState<number>(0);
  const [overtimeDeductionEtb, setOvertimeDeductionEtb] = useState<number>(0);
  const [retentionDeductionEtb, setRetentionDeductionEtb] = useState<number>(0);

  // Signatures
  const [preparedBy, setPreparedBy] = useState<string>(consultant.residentEngineerName || 'Resident Engineer Mulualem Ergogo (Team Leader)');
  const [checkedBy, setCheckedBy] = useState<string>('Counterpart Engineer / Payment Officer');
  const [reviewedBy, setReviewedBy] = useState<string>('Senior / Lead Supervision Engineer');
  const [recommendedBy, setRecommendedBy] = useState<string>('Supervision Directorate Director / Team Leader');
  const [approvedBy, setApprovedBy] = useState<string>('Director General / Project Director (ERA South Region)');

  // Policy Rule: Once invoice is saved and synchronized with ledger and requested to process next month,
  // no changes or updates are permitted across all previous month invoices.
  const isPreviousInvoiceFrozen = useMemo(() => {
    if (!activeInvoice) return false;
    if (activeInvoice.isPreviousInvoiceLocked) return true;
    const allInvoices = consultant.invoices || [];
    if (allInvoices.length > 0) {
      const sorted = [...allInvoices].sort((a, b) => {
        const numA = parseInt((a.invoiceNo || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.invoiceNo || '').replace(/\D/g, '') || '0', 10);
        if (numA !== numB) return numA - numB;
        return (a.submissionDate || '').localeCompare(b.submissionDate || '');
      });
      const curIdx = sorted.findIndex(i => i.id === activeInvoice.id || i.invoiceNo === activeInvoice.invoiceNo);
      // If any subsequent invoice exists in the chronological ledger
      if (curIdx >= 0 && curIdx < sorted.length - 1) {
        return true;
      }
    }
    if (activeInvoice.isPaymentSaved && (activeInvoice.paymentLocked || Boolean(activeInvoice.savedPaymentAmount))) {
      const hasSubsequent = (consultant.invoices || []).some(
        other => other.id !== activeInvoice.id && other.invoiceNo !== activeInvoice.invoiceNo &&
        ((other.submissionDate || '') > (activeInvoice.submissionDate || '') || other.invoiceNo > activeInvoice.invoiceNo)
      );
      if (hasSubsequent) return true;
    }
    return false;
  }, [activeInvoice, consultant.invoices]);

  // Helper: Standard billing rate estimator linked directly with Contract Amount Schedule (Condition 1 / Condition 2)
  const getStandardRateForPosition = (position: string, category?: string, staffName?: string): number => {
    const pos = (position || '').toLowerCase().trim();
    const name = (staffName || '').toLowerCase().trim();

    // 1. Check Condition 2 if USD/ETB payments enabled
    if (consultant.enableUsdPayments && consultant.contractAmountSchedule?.condition2?.staffFees) {
      const exchangeRate = consultant.contractAmountSchedule.condition2.exchangeRate || 35;
      const c2Staff = consultant.contractAmountSchedule.condition2.staffFees;
      const matched = c2Staff.find(s => 
        (name && s.name && s.name.toLowerCase().trim() === name) ||
        (s.position && s.position.toLowerCase().trim() === pos) ||
        (s.position && pos.includes(s.position.toLowerCase().trim())) ||
        (s.position && s.position.toLowerCase().trim().includes(pos))
      );
      if (matched) {
        if (matched.origin === 'Foreign' && matched.rateUsd) {
          return matched.rateUsd * exchangeRate;
        }
        if (matched.rateEtb) return matched.rateEtb;
      }
    }

    // 2. Check Condition 1 schedule
    if (consultant.contractAmountSchedule?.condition1?.staffFees) {
      const c1Staff = consultant.contractAmountSchedule.condition1.staffFees;
      const matched = c1Staff.find(s => 
        (name && s.name && s.name !== 'To be nominated' && s.name !== 'TBN' && s.name.toLowerCase().trim() === name) ||
        (s.position && s.position.toLowerCase().trim() === pos) ||
        (s.position && pos.includes(s.position.toLowerCase().trim())) ||
        (s.position && s.position.toLowerCase().trim().includes(pos))
      );
      if (matched && matched.rateEtb) return matched.rateEtb;
    }

    // 3. Official FIDIC & ERA Condition 1 schedule baseline rates:
    if (pos.includes('resident engineer') && !pos.includes('deputy')) return 37500.00;
    if (pos.includes('deputy resident') || pos.includes('deputy')) return 28500.00;
    if (pos.includes('pavement') || pos.includes('materials')) return 30000.00;
    if (pos.includes('structural') && !pos.includes('inspector')) return 15000.00;
    if (pos.includes('geotechnical')) return 15000.00;
    if (pos.includes('highway') && !pos.includes('inspector')) return 15000.00;
    if (pos.includes('quantity surveyor') && (pos.includes('senior') || pos.includes('sr'))) return 18500.00;
    if (pos.includes('surveyor') && (pos.includes('senior') || pos.includes('sr'))) return 18500.00;
    if (pos.includes('claims')) return 15000.00;
    if (pos.includes('environment')) return 15000.00;
    if (pos.includes('hydrolog') || pos.includes('hydraulic')) return 15000.00;
    if (pos.includes('safety') || pos.includes('audit')) return 15000.00;
    if (pos.includes('right of way') || pos.includes('row')) return 15000.00;
    if (pos.includes('gender')) return 15000.00;
    if (pos.includes('intermediate')) return 6000.00;
    if (pos.includes('soil lab') || pos.includes('lab technician')) return 12000.00;
    if (pos.includes('material inspector') || pos.includes('materials inspector')) return 12000.00;
    if (pos.includes('structural inspector')) return 12000.00;
    if (pos.includes('inspector of work') || pos.includes('inspector')) return 12000.00;
    if (pos.includes('draft') || pos.includes('draftsperson')) return 6000.00;
    if (pos.includes('surveyor')) return 8000.00;
    if (pos.includes('secretary')) return 6000.00;
    if (pos.includes('chainman') || pos.includes('chainmen')) return 6000.00;
    if (pos.includes('lab assistant') || pos.includes('laboratory assistant')) return 6000.00;
    if (pos.includes('project coordinator')) return 12500.00;
    if (pos.includes('quality audit') || pos.includes('head office')) return 50000.00;

    return 20000.00;
  };

  const getStandardDailyReimbRate = (position: string): number => {
    const pos = (position || '').toLowerCase();
    if (pos.includes('resident')) return 250.00;
    if (pos.includes('senior') || pos.includes('lead') || pos.includes('highway') || pos.includes('structural')) return 220.00;
    if (pos.includes('survey') || pos.includes('quantity')) return 200.00;
    return 140.00;
  };

  const allInvoices = useMemo(() => {
    return [...(consultant.invoices || [])].sort((a, b) => {
      const getPeriodDate = (p: string) => {
        const start = (p || '').split(' - ')[0].replace('.', ' ');
        return new Date(start).getTime();
      };
      return getPeriodDate(a.billingPeriod) - getPeriodDate(b.billingPeriod);
    });
  }, [consultant.invoices]);

  // Build staff rows LINKED directly to assigned personnel directory (consultant.personnel)
  const syncStaffRowsFromAssignedPersonnel = () => {
    const assignedPersonnel: ConsultantPersonnel[] = consultant.personnel || [];
    
    // Sum cumulative inputs from all previous invoices chronologically by month succession
    const cumulativeInputs: Record<string, { qty: number, amount: number }> = {};
    const cumulativeReimbInputs: Record<string, { qty: number, amount: number }> = {};

    console.log("All invoices for calculation (month succession):", allInvoices.map(i => ({ no: i.invoiceNo, period: i.billingPeriod })));
    
    allInvoices.forEach(inv => {
      // Only sum invoices *before* the current active one
      if (activeInvoice && inv.id === activeInvoice.id) return;
      
      (inv.attendanceRecords || []).forEach(record => {
        const pId = record.personnelId || record.id;
        if (!cumulativeInputs[pId]) cumulativeInputs[pId] = { qty: 0, amount: 0 };
        const qtyToAdd = (record.thisInvoiceQty || record.daysWorked || 0) / (record.contractQty || 36);
        cumulativeInputs[pId].qty += qtyToAdd;
        cumulativeInputs[pId].amount += (record.thisInvoiceAmount || 0);
      });

      (inv.reimbursableRecords || []).forEach(record => {
        const rId = record.id || record.description;
        if (!cumulativeReimbInputs[rId]) cumulativeReimbInputs[rId] = { qty: 0, amount: 0 };
        cumulativeReimbInputs[rId].qty += (record.thisInvoiceQty || record.thisQty || 0);
        cumulativeReimbInputs[rId].amount += (record.thisInvoiceAmount || 0);
      });
    });

    const c1ScheduleStaff = (consultant.contractAmountSchedule?.condition1?.staffFees && consultant.contractAmountSchedule.condition1.staffFees.length > 0)
      ? consultant.contractAmountSchedule.condition1.staffFees
      : DEFAULT_CONDITION_1_STAFF;

    // Directly derive rows from c1ScheduleStaff to guarantee exact identical rows and sequence with Contract Data Table 2
    const rows: EditableStaffRow[] = c1ScheduleStaff.map((s, idx) => {
      const sPosLower = (s.position || '').toLowerCase().trim();
      const sNameLower = (s.name || '').toLowerCase().trim();

      // Find matching personnel from assigned personnel directory if available
      const matchedPersonnel = assignedPersonnel.find(p => {
        const pPosLower = (p.position || '').toLowerCase().trim();
        const pNameLower = (p.name || '').toLowerCase().trim();
        return p.id === s.id ||
          (sNameLower && sNameLower !== 'to be nominated' && sNameLower !== 'tbn' && pNameLower === sNameLower) ||
          (pPosLower && (pPosLower === sPosLower || pPosLower.includes(sPosLower) || sPosLower.includes(pPosLower)));
      });

      // Find saved attendance record in activeInvoice
      const matchedSaved = activeInvoice?.attendanceRecords?.find(r =>
        r.id === s.id ||
        r.personnelId === s.id ||
        (matchedPersonnel && (r.id === matchedPersonnel.id || r.personnelId === matchedPersonnel.id)) ||
        (r.position && r.position.toLowerCase().trim() === sPosLower) ||
        (sNameLower && sNameLower !== 'to be nominated' && sNameLower !== 'tbn' && r.name && r.name.toLowerCase().trim() === sNameLower)
      );

      // Match cumulative preceding values
      const pId = matchedPersonnel?.id || s.id;
      const cumulative = cumulativeInputs[s.id] || (matchedPersonnel ? cumulativeInputs[matchedPersonnel.id] : undefined) || cumulativeInputs[pId] || { qty: 0, amount: 0 };

      const staffName = (matchedPersonnel?.name && matchedPersonnel.name !== 'To be nominated' && matchedPersonnel.name !== 'TBN')
        ? matchedPersonnel.name
        : (s.name || 'To be nominated');

      const standardRate = s.rateEtb || matchedPersonnel?.monthlyBillingRate || getStandardRateForPosition(s.position, s.category, staffName);
      const standardRateUsd = s.rateUsd || 0;
      const standardDaily = matchedPersonnel?.dailyReimbursableRate || getStandardDailyReimbRate(s.position);

      const mmConstr = Number(s.mmConstr) || Number(s.totalMm) || 0;
      const allocatedMM = mmConstr;

      let days = 0;
      if (matchedSaved && matchedSaved.daysWorked !== undefined) {
        days = matchedSaved.daysWorked;
      } else if (matchedSaved && matchedSaved.days !== undefined) {
        days = matchedSaved.days;
      }

      const isReplaced = matchedPersonnel?.status === 'Replaced';
      const precQty = cumulative.qty;
      const precAmt = cumulative.amount;
      const rate = matchedSaved?.rate !== undefined ? matchedSaved.rate : standardRate;
      const rateUsd = matchedSaved?.rateUsd !== undefined ? matchedSaved.rateUsd : standardRateUsd;
      const contractAmount = (s.totalEtb !== undefined && s.totalEtb > 0) ? s.totalEtb : (allocatedMM * rate);

      return {
        id: s.id || `c1_staff_${idx + 1}`,
        no: s.no || `${idx + 1}`,
        personnelId: matchedPersonnel?.id || s.id,
        position: s.position,
        name: staffName,
        category: s.category || 'Key Professional',
        status: matchedPersonnel?.status || 'Active',
        unit: s.unit || 'Month',
        rate,
        rateUsd,
        contractQty: allocatedMM,
        contractAmount,
        mmConstr: s.mmConstr,
        mmDlp: s.mmDlp,
        totalMm: s.totalMm,
        daysWorked: days,
        precedingQty: precQty,
        precedingAmount: precAmt,
        dailyReimbursableRate: matchedSaved?.dailyReimbursableRate || standardDaily,
        assignmentDate: matchedPersonnel?.assignmentDate || project.startDate || '2020-10-01',
        demobilizationDate: matchedPersonnel?.demobilizationDate,
        replacementDate: matchedPersonnel?.replacementDate,
        predecessorId: matchedPersonnel?.predecessorId,
        predecessorName: matchedPersonnel?.predecessorName,
        replacedById: matchedPersonnel?.replacedById,
        replacedByName: matchedPersonnel?.replacedByName,
        isHistoricalPredecessor: isReplaced
      };
    });

    setStaffRows(rows);

    // Also update reimbursable rows with cumulative preceding values from previous invoices
    // and synchronize contract reimbursable items from Table 1.2
    const c1ReimbList = consultant.contractAmountSchedule?.condition1?.reimbursableList || [];
    setReimbursableRows(prev => {
      if (c1ReimbList.length > 0) {
        return c1ReimbList.map((c, idx) => {
          const matchedPrev = prev.find(r => 
            r.id === c.id || 
            (r.no && c.no && r.no.trim() === c.no.trim()) ||
            (r.description && c.item && r.description.toLowerCase().trim() === c.item.toLowerCase().trim()) ||
            (r.description && c.description && r.description.toLowerCase().trim() === c.description.toLowerCase().trim()) ||
            (c.item && r.description && c.item.toLowerCase().includes(r.description.toLowerCase())) ||
            (r.description && c.item && r.description.toLowerCase().includes(c.item.toLowerCase()))
          );
          const cum = cumulativeReimbInputs[c.id || ''] || cumulativeReimbInputs[c.item] || (matchedPrev ? cumulativeReimbInputs[matchedPrev.id] : { qty: 0, amount: 0 }) || { qty: 0, amount: 0 };
          const matchedInv = activeInvoice?.reimbursableRecords?.find((s: any) => 
            s.id === c.id || s.description === c.item || (matchedPrev && s.id === matchedPrev.id)
          );

          const contractQty = c.contractQty !== undefined ? c.contractQty : (matchedPrev?.contractQty ?? 1);
          const contractAmount = c.amountEtb !== undefined ? c.amountEtb : (c.contractAmount !== undefined ? c.contractAmount : (matchedPrev?.contractAmount ?? 0));
          const rate = c.rate !== undefined ? c.rate : (matchedPrev?.rate ?? (contractQty > 0 ? Number((contractAmount / contractQty).toFixed(2)) : contractAmount));
          const unit = c.unit || matchedPrev?.unit || 'Month';
          const rateUsd = c.rateUsd !== undefined ? c.rateUsd : (c.amountUsd && contractQty > 0 ? Number((c.amountUsd / contractQty).toFixed(2)) : (matchedPrev?.rateUsd || 0));
          const contractAmountUsd = c.amountUsd !== undefined ? c.amountUsd : (matchedPrev?.contractAmountUsd ?? 0);

          return {
            id: c.id || matchedPrev?.id || `reimb_${idx + 1}`,
            no: c.no || String(idx + 1),
            description: c.item || c.description || matchedPrev?.description || '',
            basis: c.basis || matchedPrev?.basis || '',
            unit: unit,
            rate: rate,
            rateUsd: rateUsd,
            contractQty: contractQty,
            contractAmount: contractAmount,
            contractAmountUsd: contractAmountUsd,
            precedingQty: cum.qty,
            precedingAmount: cum.amount,
            thisInvoiceQty: matchedInv?.thisInvoiceQty !== undefined ? matchedInv.thisInvoiceQty : (matchedPrev?.thisInvoiceQty || 0),
            thisInvoiceAmount: matchedInv?.thisInvoiceAmount !== undefined ? matchedInv.thisInvoiceAmount : (matchedPrev?.thisInvoiceAmount || 0),
            thisInvoiceAmountUsd: matchedInv?.thisInvoiceAmountUsd !== undefined ? matchedInv.thisInvoiceAmountUsd : (matchedPrev?.thisInvoiceAmountUsd || 0)
          };
        });
      }

      const updated = prev.map(r => {
        const cum = cumulativeReimbInputs[r.id] || cumulativeReimbInputs[r.description] || { qty: 0, amount: 0 };
        const matched = activeInvoice?.reimbursableRecords?.find((s: any) => s.id === r.id || s.description === r.description);

        return {
          ...r,
          precedingQty: cum.qty,
          precedingAmount: cum.amount,
          thisInvoiceQty: matched?.thisInvoiceQty !== undefined ? matched.thisInvoiceQty : (matched?.thisQty !== undefined ? matched.thisQty : r.thisInvoiceQty),
          thisInvoiceAmount: matched?.thisInvoiceAmount !== undefined ? matched.thisInvoiceAmount : r.thisInvoiceAmount,
          rate: matched?.rate !== undefined ? matched.rate : r.rate
        };
      });

      return updated;
    });

    // Synchronize Defect Liability Period (DLP) rows directly from Contract Amount Schedule Table 3
    // Filter out Head Office staff from DLP as requested
    const c1DlpSource = (consultant.contractAmountSchedule?.condition1?.dlpStaffFees && consultant.contractAmountSchedule.condition1.dlpStaffFees.length > 0)
      ? consultant.contractAmountSchedule.condition1.dlpStaffFees
      : c1ScheduleStaff.filter(s => (Number(s.mmDlp) || 0) > 0);

    const c1DlpStaff = c1DlpSource.filter(s => 
      s.category !== 'Head Office' && 
      !s.position?.toLowerCase().includes('project coordinator')
    );

    if (c1DlpStaff.length > 0) {
      setDefectRows(prev => {
        return c1DlpStaff.map((s, idx) => {
          const matched = activeInvoice?.defectLiabilityRecords?.find((d: any) => d.id === s.id || (d.position && d.position.toLowerCase().trim().startsWith(s.position.toLowerCase().trim())))
            || prev.find(p => p.id === s.id || (p.position && p.position.toLowerCase().trim().startsWith(s.position.toLowerCase().trim())));
          
          const dlpMm = Number(s.mmDlp) || Number(s.totalMm) || 0;
          const rate = Number(s.rateEtb) || 0;
          const contractAmount = dlpMm * rate;
          const nameSuffix = s.name && s.name !== 'To be nominated' && s.name !== 'TBN' ? ` (${s.name})` : '';
          const posLabel = `${s.position}${nameSuffix}`;

          return {
            id: s.id || `dl_${idx + 1}`,
            position: posLabel,
            unit: 'Month',
            category: s.category, // Preserve category for logic but we won't use it for grouping in UI
            rate,
            contractQty: dlpMm,
            contractAmount,
            thisInvoiceQty: matched?.thisInvoiceQty !== undefined ? matched.thisInvoiceQty : 0,
            thisInvoiceAmount: (matched?.thisInvoiceQty !== undefined ? matched.thisInvoiceQty : 0) * rate
          };
        });
      });
    }
  };


  const getDaysInMonthFromPeriod = (periodStr: string): number => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lower = (periodStr || '').toLowerCase();
    let monthIdx = -1;
    for (let i = 0; i < 12; i++) {
        if (lower.includes(monthNames[i].toLowerCase()) || lower.includes(monthAbbrs[i].toLowerCase())) {
            monthIdx = i;
            break;
        }
    }
    const yearMatch = periodStr.match(/20\d{2}/);
    let year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
    if (monthIdx === -1) monthIdx = new Date().getMonth();
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  // Initialize or re-populate when activeInvoice changes or consultant.personnel updates
  useEffect(() => {
    if (activeInvoice) {
      setInvoiceNo(activeInvoice.invoiceNo || 'INV-01');
      const periodParts = (activeInvoice.billingPeriod || 'October 2020').split(' ');
      setBillingMonth(periodParts[0] || 'October');
      setBillingYear(parseInt(periodParts[1] || '2020', 10));
      setSubmissionDate(activeInvoice.submissionDate || new Date().toISOString().split('T')[0]);
      setInvoiceDate(activeInvoice.certificationDate || 'December 28, 2020');
      setStatus(activeInvoice.status || 'Submitted');
      setPaymentReference(activeInvoice.paymentReference || '');
      setPaymentDate(activeInvoice.paymentDate || '');
      setRemarks(activeInvoice.remarks || '');
      setAdvanceDeductionEtb(activeInvoice.advanceDeductionEtb || 0);
      setTaxDeductionEtb(activeInvoice.taxDeductionEtb || 0);
      setOvertimeEtb(activeInvoice.overtimeEtb || 0);
      setOvertimeDeductionEtb(activeInvoice.overtimeDeductionEtb || 0);

      if (activeInvoice.clientName) setClientName(activeInvoice.clientName);
      if (activeInvoice.consultantFirmName) setConsultantFirm(activeInvoice.consultantFirmName);
      if (activeInvoice.vatRate !== undefined) setVatRatePct(activeInvoice.vatRate);
      if (activeInvoice.contingencyThisInvoiceClaim !== undefined) {
        setContingencyThisInvoiceClaim(activeInvoice.contingencyThisInvoiceClaim);
      }
      if (activeInvoice.contingencyThisInvoiceClaimUsd !== undefined) {
        setContingencyThisInvoiceClaimUsd(activeInvoice.contingencyThisInvoiceClaimUsd);
      }
      if (activeInvoice.contingencyToDateEtb !== undefined) {
        setContingencyToDateEtb(activeInvoice.contingencyToDateEtb);
      }
      if (activeInvoice.contingencyToDateUsd !== undefined) {
        setContingencyToDateUsd(activeInvoice.contingencyToDateUsd);
      }
      if (activeInvoice.bankDetails) {
        if (activeInvoice.bankDetails.bankName) setBankName(activeInvoice.bankDetails.bankName);
        if (activeInvoice.bankDetails.branch) setBankBranch(activeInvoice.bankDetails.branch);
        if (activeInvoice.bankDetails.accountNo) setBankAccountNo(activeInvoice.bankDetails.accountNo);
      }

      // Restore reimbursable records if available
      if (activeInvoice.reimbursableRecords && Array.isArray(activeInvoice.reimbursableRecords) && activeInvoice.reimbursableRecords.length > 0) {
        const savedReimb = activeInvoice.reimbursableRecords;
        setReimbursableRows(prev => prev.map(r => {
          const matched = savedReimb.find((s: any) => s.id === r.id || s.description === r.description);
          if (matched) {
            return {
              ...r,
              rate: matched.rate !== undefined ? matched.rate : r.rate,
              thisInvoiceQty: matched.thisInvoiceQty !== undefined ? matched.thisInvoiceQty : (matched.thisQty !== undefined ? matched.thisQty : r.thisInvoiceQty),
              thisInvoiceAmount: matched.thisInvoiceAmount !== undefined ? matched.thisInvoiceAmount : r.thisInvoiceAmount,
              precedingQty: matched.precedingQty !== undefined ? matched.precedingQty : r.precedingQty,
              precedingAmount: matched.precedingAmount !== undefined ? matched.precedingAmount : r.precedingAmount,
            };
          }
          return r;
        }));
      }

      // Restore defect liability records if available
      if (activeInvoice.defectLiabilityRecords && Array.isArray(activeInvoice.defectLiabilityRecords) && activeInvoice.defectLiabilityRecords.length > 0) {
        const savedDefect = activeInvoice.defectLiabilityRecords;
        setDefectRows(prev => prev.map(d => {
          const matched = savedDefect.find((s: any) => s.id === d.id || s.position === d.position);
          if (matched) {
            return {
              ...d,
              rate: matched.rate !== undefined ? matched.rate : d.rate,
              thisInvoiceQty: matched.thisInvoiceQty !== undefined ? matched.thisInvoiceQty : d.thisInvoiceQty,
              thisInvoiceAmount: matched.thisInvoiceAmount !== undefined ? matched.thisInvoiceAmount : d.thisInvoiceAmount
            };
          }
          return d;
        }));
      }
      if (activeInvoice.preparedBy) setPreparedBy(activeInvoice.preparedBy);
      if (activeInvoice.checkedBy) setCheckedBy(activeInvoice.checkedBy);
      if (activeInvoice.reviewedBy) setReviewedBy(activeInvoice.reviewedBy);
      if (activeInvoice.recommendedBy) setRecommendedBy(activeInvoice.recommendedBy);
      if (activeInvoice.approvedBy) setApprovedBy(activeInvoice.approvedBy);

      if (activeInvoice.isPreviousInvoiceLocked || activeInvoice.isPaymentSaved || activeInvoice.paymentLocked || (activeInvoice.savedPaymentAmount !== undefined && activeInvoice.savedPaymentAmount > 0) || (activeInvoice.netAmountEtb !== undefined && activeInvoice.netAmountEtb > 0 && (activeInvoice.status === 'Paid' || activeInvoice.status === 'Certified'))) {
        setIsPaymentSaved(true);
        setSavedPaymentAmount(activeInvoice.savedPaymentAmount ?? activeInvoice.netAmountEtb);
        setAllowAdminUnlock(false);
      } else {
        setIsPaymentSaved(false);
        setSavedPaymentAmount(null);
        setAllowAdminUnlock(false);
      }
      setTotalDaysInMonth(new Date(parseInt(periodParts[1] || '2020', 10), new Date(`${periodParts[0]} 1, ${periodParts[1]}`).getMonth() + 1, 0).getDate());
    } else {
      // Default baseline values
      const nextNum = (consultant.invoices?.length || 0) + 1;
      setInvoiceNo(`INV-DKS-0${nextNum}`);
      setBillingMonth('October');
      setBillingYear(2020);
      setTotalDaysInMonth(31);
      setSubmissionDate(new Date().toISOString().split('T')[0]);
      setStatus('Submitted');
      setIsPaymentSaved(false);
      setSavedPaymentAmount(null);
      setAllowAdminUnlock(false);
    }

    // Always link staff rows from assigned personnel directory
    syncStaffRowsFromAssignedPersonnel();
  }, [activeInvoice, consultant.personnel, consultant.firmName, consultant.residentEngineerName, project.contractNo]);

  useEffect(() => {
    setTotalDaysInMonth(new Date(billingYear, new Date(`${billingMonth} 1, ${billingYear}`).getMonth() + 1, 0).getDate());
  }, [billingMonth, billingYear]);

  // Real-time synchronization: when Table B rows or rates change in Contract Amount, update Sub Total 2 immediately
  useEffect(() => {
    const c1ReimbList = consultant.contractAmountSchedule?.condition1?.reimbursableList;
    if (c1ReimbList && c1ReimbList.length > 0) {
      setReimbursableRows(prev => {
        return c1ReimbList.map((c, idx) => {
          const matchedPrev = prev.find(r => 
            r.id === c.id || 
            (r.no && c.no && r.no.trim() === c.no.trim()) ||
            (r.description && c.item && r.description.toLowerCase().trim() === c.item.toLowerCase().trim()) ||
            (r.description && c.description && r.description.toLowerCase().trim() === c.description.toLowerCase().trim()) ||
            (c.item && r.description && c.item.toLowerCase().includes(r.description.toLowerCase())) ||
            (r.description && c.item && r.description.toLowerCase().includes(c.item.toLowerCase()))
          );

          const contractQty = c.contractQty !== undefined ? c.contractQty : (matchedPrev?.contractQty ?? 1);
          const contractAmount = c.amountEtb !== undefined ? c.amountEtb : (c.contractAmount !== undefined ? c.contractAmount : (matchedPrev?.contractAmount ?? 0));
          const rate = c.rate !== undefined ? c.rate : (contractQty > 0 ? Number((contractAmount / contractQty).toFixed(2)) : (matchedPrev?.rate ?? 0));
          const rateUsd = c.rateUsd !== undefined ? c.rateUsd : (c.amountUsd && contractQty > 0 ? Number((c.amountUsd / contractQty).toFixed(2)) : (matchedPrev?.rateUsd || 0));

          return {
            id: c.id || matchedPrev?.id || `reimb_${idx + 1}`,
            no: c.no || String(idx + 1),
            description: c.item || c.description || matchedPrev?.description || '',
            basis: c.basis || matchedPrev?.basis || '',
            unit: c.unit || matchedPrev?.unit || 'Month',
            rate,
            rateUsd,
            contractQty,
            contractAmount,
            contractAmountUsd: c.amountUsd || matchedPrev?.contractAmountUsd || 0,
            precedingQty: matchedPrev?.precedingQty ?? 0,
            precedingAmount: matchedPrev?.precedingAmount ?? 0,
            thisInvoiceQty: matchedPrev?.thisInvoiceQty ?? 0,
            thisInvoiceAmount: matchedPrev?.thisInvoiceAmount ?? 0,
            thisInvoiceAmountUsd: matchedPrev?.thisInvoiceAmountUsd ?? 0
          };
        });
      });
    }
  }, [consultant.contractAmountSchedule?.condition1?.reimbursableList]);


  // Format currency helper
  const fmt = (val: number | undefined, decimals = 2) => {
    if (val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  // Convert numbers to text words with currency support (ETB & USD)
  const numberToWordsCurrency = (num: number, currency: 'ETB' | 'USD' = 'ETB'): string => {
    if (num === 0) return currency === 'USD' ? 'Zero US Dollars Only' : 'Zero Birr Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numStr = num.toFixed(2);
    const [wholePartStr, decimalPartStr] = numStr.split('.');
    let n = parseInt(wholePartStr, 10);

    const inWords = (n: number): string => {
      let str = '';
      if (n >= 1000000000) {
        str += inWords(Math.floor(n / 1000000000)) + 'Billion ';
        n %= 1000000000;
      }
      if (n >= 1000000) {
        str += inWords(Math.floor(n / 1000000)) + 'Million ';
        n %= 1000000;
      }
      if (n >= 1000) {
        str += inWords(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (n >= 100) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (n < 20) str += a[n];
        else {
          str += b[Math.floor(n / 10)];
          if (n % 10 > 0) str += '-' + a[n % 10].trim() + ' ';
          else str += ' ';
        }
      }
      return str;
    };

    const wholeWords = inWords(n).trim();
    const cents = parseInt(decimalPartStr, 10);
    if (currency === 'USD') {
      const centsWords = cents > 0 ? ` and ${inWords(cents).trim()} Cents` : ' and Zero Cents';
      return `${wholeWords} US Dollars${centsWords} Only`;
    }
    const centsWords = cents > 0 ? ` and ${inWords(cents).trim()} Cents` : ' and Zero Cents';
    return `${wholeWords} Birr${centsWords} Only`;
  };

  const numberToWords = (num: number): string => numberToWordsCurrency(num, 'ETB');

  // Personnel count metrics
  const activeStaffCount = useMemo(() => staffRows.filter(r => r.status === 'Active').length, [staffRows]);
  const replacedStaffCount = useMemo(() => staffRows.filter(r => r.status === 'Replaced').length, [staffRows]);

  // Filtered staff rows according to personnelFilter
  const displayStaffRows = useMemo(() => {
    if (personnelFilter === 'active_only') {
      return staffRows.filter(r => r.status === 'Active');
    }
    if (personnelFilter === 'replaced_only') {
      return staffRows.filter(r => r.status === 'Replaced');
    }
    return staffRows;
  }, [staffRows, personnelFilter]);

  // Count reduced positions
  const reducedPositionsCount = useMemo(() => {
    if (!directorateReductionMode) return 0;
    return staffRows.filter(r => Boolean(reducedPositionIds[r.id])).length;
  }, [directorateReductionMode, staffRows, reducedPositionIds]);

  // --- Dynamic Computations for Table 1 & 2 (Fees) with Directorate 10% Reduction ---
  const feeRowsComputed = staffRows.map(row => {
    const isReduced = directorateReductionMode && Boolean(reducedPositionIds[row.id]);
    const effectiveRate = isReduced ? Number((row.rate * 0.9).toFixed(2)) : row.rate;
    const contractAmount = Number((row.contractQty * effectiveRate).toFixed(2));
    const qty = row.daysWorked > 0 ? Number((row.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
    const thisAmount = row.thisInvoiceAmount !== undefined && row.thisInvoiceAmount > 0
      ? row.thisInvoiceAmount
      : Number((qty * effectiveRate).toFixed(2));
    const precAmount = row.precedingAmount !== undefined && row.precedingAmount > 0
      ? row.precedingAmount
      : Number((row.precedingQty * effectiveRate).toFixed(2));
    const toDateQty = Number((row.precedingQty + qty).toFixed(2));
    const toDateAmount = Number((precAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

    // USD computations
    const rateUsd = row.rateUsd || 0;
    const contractAmountUsd = Number(((row.contractQty || 0) * rateUsd).toFixed(2));
    const precAmountUsd = row.precedingAmountUsd !== undefined && row.precedingAmountUsd > 0
      ? row.precedingAmountUsd
      : Number(((row.precedingQty || 0) * rateUsd).toFixed(2));
    const thisAmountUsd = row.thisInvoiceAmountUsd !== undefined && row.thisInvoiceAmountUsd > 0
      ? row.thisInvoiceAmountUsd
      : Number((qty * rateUsd).toFixed(2));
    const toDateAmountUsd = Number((precAmountUsd + thisAmountUsd).toFixed(2));
    const remainingAmountUsd = Math.max(0, Number((contractAmountUsd - toDateAmountUsd).toFixed(2)));

    return {
      ...row,
      isReduced,
      effectiveRate,
      contractAmount,
      thisInvoiceQty: qty,
      thisInvoiceAmount: thisAmount,
      precedingAmount: precAmount,
      toDateQty,
      toDateAmount,
      remainingQty,
      remainingAmount,
      rateUsd,
      contractAmountUsd,
      precedingAmountUsd: precAmountUsd,
      thisInvoiceAmountUsd: thisAmountUsd,
      toDateAmountUsd,
      remainingAmountUsd
    };
  });

  const displayFeeRowsComputed = feeRowsComputed.filter(r => {
    if (personnelFilter === 'active_only') return r.status === 'Active';
    if (personnelFilter === 'replaced_only') return r.status === 'Replaced';
    return true;
  });

  const subTotal1Contract = feeRowsComputed.reduce((sum, r) => sum + (r.contractAmount || 0), 0);
  const subTotal1Preceding = feeRowsComputed.reduce((sum, r) => sum + (r.precedingAmount || 0), 0);
  const subTotal1ThisInvoice = feeRowsComputed.reduce((sum, r) => sum + (r.thisInvoiceAmount || 0), 0);
  const subTotal1ToDate = feeRowsComputed.reduce((sum, r) => sum + (r.toDateAmount || 0), 0);
  const subTotal1Remaining = feeRowsComputed.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);

  // Category grouped rows matching Contract Amount Table 2 categories & sub-totals
  const groupedFeeRows = useMemo(() => {
    const list = displayFeeRowsComputed;
    const defaultCats = ['Key Professional', 'Intermediate', 'Support', 'Head Office'];
    const set = new Set<string>(defaultCats);
    list.forEach(r => {
      if (r.category) set.add(r.category);
    });

    const cats = Array.from(set);
    return cats.map(cat => {
      const rows = list.filter(r => {
        if (r.category === cat) return true;
        if (!r.category) {
          if (cat === 'Key Professional' && r.no?.startsWith('1.')) return true;
          if (cat === 'Intermediate' && r.no?.startsWith('2.')) return true;
          if (cat === 'Support' && r.no?.startsWith('3.')) return true;
          if (cat === 'Head Office' && r.no?.startsWith('4.')) return true;
          const p = (r.position || '').toLowerCase();
          if (cat === 'Key Professional' && (p.includes('engineer') || p.includes('leader') || p.includes('manager') || p.includes('specialist'))) return true;
          if (cat === 'Intermediate' && (p.includes('inspector') || p.includes('surveyor') || p.includes('quantity'))) return true;
          if (cat === 'Support' && (p.includes('laboratory') || p.includes('technician') || p.includes('cad') || p.includes('driver') || p.includes('clerk'))) return true;
          if (cat === 'Head Office' && (p.includes('head') || p.includes('office') || p.includes('director') || p.includes('coordinator'))) return true;
        }
        return false;
      });

      const contractAmount = rows.reduce((s, r) => s + (r.contractAmount || 0), 0);
      const contractAmountUsd = rows.reduce((s, r) => s + (r.contractAmountUsd || 0), 0);
      const contractQty = rows.reduce((s, r) => s + (r.contractQty || 0), 0);
      const precedingQty = rows.reduce((s, r) => s + (r.precedingQty || 0), 0);
      const precedingAmount = rows.reduce((s, r) => s + (r.precedingAmount || 0), 0);
      const precedingAmountUsd = rows.reduce((s, r) => s + (r.precedingAmountUsd || 0), 0);
      const thisInvoiceQty = rows.reduce((s, r) => s + (r.thisInvoiceQty || 0), 0);
      const thisInvoiceAmount = rows.reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
      const thisInvoiceAmountUsd = rows.reduce((s, r) => s + (r.thisInvoiceAmountUsd || 0), 0);
      const toDateQty = rows.reduce((s, r) => s + (r.toDateQty || 0), 0);
      const toDateAmount = rows.reduce((s, r) => s + (r.toDateAmount || 0), 0);
      const toDateAmountUsd = rows.reduce((s, r) => s + (r.toDateAmountUsd || 0), 0);
      const remainingQty = rows.reduce((s, r) => s + (r.remainingQty || 0), 0);
      const remainingAmount = rows.reduce((s, r) => s + (r.remainingAmount || 0), 0);
      const remainingAmountUsd = rows.reduce((s, r) => s + (r.remainingAmountUsd || 0), 0);

      let label = cat;
      if (cat === 'Key Professional') label = '1. Key Professional Staff (Supervision & Management)';
      else if (cat === 'Intermediate') label = '2. Intermediate Technical Staff';
      else if (cat === 'Support') label = '3. Field & Laboratory Support Personnel';
      else if (cat === 'Head Office') label = '4. Head Office Support';

      return {
        categoryKey: cat,
        label,
        rows,
        contractQty,
        contractAmount,
        contractAmountUsd,
        precedingQty,
        precedingAmount,
        precedingAmountUsd,
        thisInvoiceQty,
        thisInvoiceAmount,
        thisInvoiceAmountUsd,
        toDateQty,
        toDateAmount,
        toDateAmountUsd,
        remainingQty,
        remainingAmount,
        remainingAmountUsd
      };
    }).filter(g => g.rows.length > 0 || defaultCats.includes(g.categoryKey));
  }, [displayFeeRowsComputed]);

  // --- Dynamic Computations for Table 3 (Reimbursable) with Directorate 10% Reduction ---
  const reimbursableRowsComputed = reimbursableRows.map(row => {
    const isReduced = directorateReductionMode && Boolean(reducedReimbursableIds[row.id]);
    const effectiveRate = isReduced ? Number((row.rate * 0.9).toFixed(2)) : row.rate;
    const contractAmount = Number((row.contractQty * effectiveRate).toFixed(2));
    const thisAmount = row.thisInvoiceAmount !== undefined && row.thisInvoiceAmount !== 0 && !isReduced
      ? row.thisInvoiceAmount
      : Number((row.thisInvoiceQty * effectiveRate).toFixed(2));
    const precAmount = row.precedingAmount !== undefined && row.precedingAmount > 0
      ? row.precedingAmount
      : Number((row.precedingQty * effectiveRate).toFixed(2));
    const toDateQty = Number((row.precedingQty + row.thisInvoiceQty).toFixed(2));
    const toDateAmount = Number((precAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

    // USD computations
    const rateUsd = row.rateUsd || 0;
    const contractAmountUsd = row.contractAmountUsd !== undefined && row.contractAmountUsd > 0
      ? row.contractAmountUsd
      : Number(((row.contractQty || 0) * rateUsd).toFixed(2));
    const precAmountUsd = row.precedingAmountUsd !== undefined && row.precedingAmountUsd > 0
      ? row.precedingAmountUsd
      : Number(((row.precedingQty || 0) * rateUsd).toFixed(2));
    const thisAmountUsd = row.thisInvoiceAmountUsd !== undefined && row.thisInvoiceAmountUsd > 0
      ? row.thisInvoiceAmountUsd
      : Number(((row.thisInvoiceQty || 0) * rateUsd).toFixed(2));
    const toDateAmountUsd = Number((precAmountUsd + thisAmountUsd).toFixed(2));
    const remainingAmountUsd = Math.max(0, Number((contractAmountUsd - toDateAmountUsd).toFixed(2)));

    return {
      ...row,
      isReduced,
      effectiveRate,
      contractAmount,
      computedThisAmount: thisAmount,
      precedingAmount: precAmount,
      toDateQty,
      toDateAmount,
      remainingQty,
      remainingAmount,
      rateUsd,
      contractAmountUsd,
      precedingAmountUsd: precAmountUsd,
      thisInvoiceAmountUsd: thisAmountUsd,
      toDateAmountUsd,
      remainingAmountUsd
    };
  });

  const subTotal2Contract = reimbursableRowsComputed.reduce((sum, r) => sum + (r.contractAmount || 0), 0);
  const subTotal2Preceding = reimbursableRowsComputed.reduce((sum, r) => sum + (r.precedingAmount || 0), 0);
  const subTotal2ThisInvoice = reimbursableRowsComputed.reduce((sum, r) => sum + (r.computedThisAmount || 0), 0);
  const subTotal2ToDate = reimbursableRowsComputed.reduce((sum, r) => sum + (r.toDateAmount || 0), 0);
  const subTotal2Remaining = reimbursableRowsComputed.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);

  // Staff replacement logic: Changing a staff member's name strictly maintains the existing contract rate and historical data records
  const handleConfirmStaffReplacement = () => {
    if (!replacementModalStaff || !replacementNewName.trim()) return;

    const oldStaff = replacementModalStaff;
    const oldName = oldStaff.name;
    const newName = replacementNewName.trim();
    const effectiveDate = replacementDateInput || new Date().toISOString().split('T')[0];

    setStaffRows(prev => prev.map(item => {
      if (item.id === oldStaff.id) {
        return {
          ...item,
          name: newName,
          // CONTRACT RATE IS STRICTLY MAINTAINED
          rate: item.rate,
          contractAmount: item.contractAmount,
          contractQty: item.contractQty,
          // HISTORICAL DATA RECORDS ARE MAINTAINED
          precedingQty: item.precedingQty,
          precedingAmount: item.precedingAmount,
          status: 'Active',
          predecessorId: oldStaff.personnelId || oldStaff.id,
          predecessorName: oldName,
          replacementDate: effectiveDate,
          isHistoricalPredecessor: false
        };
      }
      return item;
    }));

    if (onUpdateConsultantPersonnel) {
      const currentDir = consultant.personnel || [];
      const updatedDir = currentDir.map(p => {
        if (p.id === oldStaff.personnelId || p.id === oldStaff.id || p.name === oldName) {
          return {
            ...p,
            name: newName,
            status: 'Active' as const,
            predecessorName: oldName,
            replacementDate: effectiveDate,
            remarks: `Replaced ${oldName} on ${effectiveDate}. Position contract rate preserved.`
          };
        }
        return p;
      });
      onUpdateConsultantPersonnel(updatedDir);
    }

    setSaveSuccessMsg(`Personnel turnover recorded: Position '${oldStaff.position}' assigned to '${newName}'. Contract rate (${fmt(oldStaff.rate)} ETB) & historical records preserved!`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
    setReplacementModalStaff(null);
    setReplacementNewName('');
  };

  const handleStaffNameChange = (id: string, newName: string) => {
    setStaffRows(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name: newName,
          // Contract rate and historical data records are preserved
          rate: item.rate,
          contractAmount: item.contractAmount,
          precedingQty: item.precedingQty,
          precedingAmount: item.precedingAmount
        };
      }
      return item;
    }));
  };

  const handleTogglePositionReduction = (id: string) => {
    setReducedPositionIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleReimbursableReduction = (id: string) => {
    setReducedReimbursableIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAllPositionReductions = (enable: boolean) => {
    const nextMap: Record<string, boolean> = {};
    staffRows.forEach(r => {
      nextMap[r.id] = enable;
    });
    setReducedPositionIds(nextMap);
  };

  // --- Dynamic Computations for Defect Liability (Sub Total 3) ---
  const defectRowsComputed = defectRows.map(row => {
    const precQty = Number(row.precedingQty || 0);
    const precAmount = row.precedingAmount !== undefined && row.precedingAmount > 0
      ? row.precedingAmount
      : Number((precQty * row.rate).toFixed(2));
    const thisQty = Number(row.thisInvoiceQty || 0);
    const thisAmount = row.thisInvoiceAmount !== undefined && row.thisInvoiceAmount > 0
      ? Number(row.thisInvoiceAmount)
      : Number((thisQty * row.rate).toFixed(2));
    const toDateQty = Number((precQty + thisQty).toFixed(2));
    const toDateAmount = Number((precAmount + thisAmount).toFixed(2));
    const contractQty = Number(row.contractQty || 0);
    const contractAmount = row.contractAmount || Number((contractQty * row.rate).toFixed(2));
    const remainingQty = Math.max(0, Number((contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

    // USD computations
    const rateUsd = row.rateUsd || 0;
    const contractAmountUsd = row.contractAmountUsd !== undefined && row.contractAmountUsd > 0
      ? row.contractAmountUsd
      : Number((contractQty * rateUsd).toFixed(2));
    const precAmountUsd = row.precedingAmountUsd !== undefined && row.precedingAmountUsd > 0
      ? row.precedingAmountUsd
      : Number((precQty * rateUsd).toFixed(2));
    const thisAmountUsd = row.thisInvoiceAmountUsd !== undefined && row.thisInvoiceAmountUsd > 0
      ? row.thisInvoiceAmountUsd
      : Number((thisQty * rateUsd).toFixed(2));
    const toDateAmountUsd = Number((precAmountUsd + thisAmountUsd).toFixed(2));
    const remainingAmountUsd = Math.max(0, Number((contractAmountUsd - toDateAmountUsd).toFixed(2)));

    return {
      ...row,
      contractAmount,
      contractQty,
      computedThisAmount: thisAmount,
      precedingQty: precQty,
      precedingAmount: precAmount,
      toDateQty,
      toDateAmount,
      remainingQty,
      remainingAmount,
      rateUsd,
      contractAmountUsd,
      precedingAmountUsd: precAmountUsd,
      thisInvoiceAmountUsd: thisAmountUsd,
      toDateAmountUsd,
      remainingAmountUsd
    };
  });

  // Category grouped rows matching Contract Amount Table 3 categories & sub-totals
  const groupedDlpRows = useMemo(() => {
    const list = defectRowsComputed;
    const defaultCats = ['Key Professional', 'Intermediate', 'Support', 'Head Office'];
    const set = new Set<string>(defaultCats);
    list.forEach(r => {
      if (r.category) set.add(r.category);
    });

    return Array.from(set).map(cat => {
      const rows = list.filter(r => {
        if (r.category === cat) return true;
        if (!r.category) {
          const p = (r.position || '').toLowerCase();
          if (cat === 'Key Professional' && (p.includes('engineer') || p.includes('leader') || p.includes('manager') || p.includes('specialist'))) return true;
          if (cat === 'Intermediate' && (p.includes('inspector') || p.includes('surveyor') || p.includes('quantity'))) return true;
          if (cat === 'Support' && (p.includes('laboratory') || p.includes('technician') || p.includes('cad') || p.includes('driver') || p.includes('clerk'))) return true;
          if (cat === 'Head Office' && (p.includes('head') || p.includes('office') || p.includes('director') || p.includes('coordinator'))) return true;
        }
        return false;
      });

      const contractAmount = rows.reduce((s, r) => s + (r.contractAmount || 0), 0);
      const contractQty = rows.reduce((s, r) => s + (r.contractQty || 0), 0);
      const thisInvoiceAmount = rows.reduce((s, r) => s + (r.computedThisAmount || 0), 0);
      const thisInvoiceQty = rows.reduce((s, r) => s + (r.thisInvoiceQty || 0), 0);
      const precedingAmount = rows.reduce((s, r) => s + (r.precedingAmount || 0), 0);
      const toDateAmount = rows.reduce((s, r) => s + (r.toDateAmount || 0), 0);
      const remainingAmount = rows.reduce((s, r) => s + (r.remainingAmount || 0), 0);

      let label = cat;
      if (cat === 'Key Professional') label = '1. Key Professional Staff (DLP Supervision)';
      else if (cat === 'Intermediate') label = '2. Intermediate Technical Staff';
      else if (cat === 'Support') label = '3. Field & Laboratory Support Personnel';
      else if (cat === 'Head Office') label = '4. Head Office Support';

      return {
        categoryKey: cat,
        label,
        rows,
        contractQty,
        contractAmount,
        thisInvoiceQty,
        thisInvoiceAmount,
        precedingAmount,
        toDateAmount,
        remainingAmount
      };
    }).filter(g => g.rows.length > 0 || defaultCats.includes(g.categoryKey));
  }, [defectRowsComputed]);

  const subTotal3Contract = defectRowsComputed.reduce((sum, r) => sum + (r.contractAmount || 0), 0);
  const subTotal3Preceding = defectRowsComputed.reduce((sum, r) => sum + (r.precedingAmount || 0), 0);
  const subTotal3ThisInvoice = defectRowsComputed.reduce((sum, r) => sum + (r.computedThisAmount || 0), 0);
  const subTotal3ToDate = defectRowsComputed.reduce((sum, r) => sum + (r.toDateAmount || 0), 0);
  const subTotal3Remaining = defectRowsComputed.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);

  // --- Dynamic Grand Invoice Summary (Table 5) Linked with Contract Amount Table 1 ---
  const c1StaffFees = consultant.contractAmountSchedule?.condition1?.staffFees || DEFAULT_CONDITION_1_STAFF;
  const feesConstructionContract = useMemo(() => {
    return c1StaffFees.reduce((sum, r) => sum + ((Number(r.mmConstr) || 0) * (Number(r.rateEtb) || 0)), 0);
  }, [c1StaffFees]);

  const feesDlpContract = useMemo(() => {
    if (subTotal3Contract > 0) return subTotal3Contract;
    return c1StaffFees.reduce((sum, r) => sum + ((Number(r.mmDlp) || 0) * (Number(r.rateEtb) || 0)), 0);
  }, [c1StaffFees, subTotal3Contract]);

  const c1Summary = consultant.contractAmountSchedule?.condition1?.summary;
  const linkedFeesContract = feesConstructionContract > 0 ? feesConstructionContract : (c1Summary?.fees ?? subTotal1Contract);
  const linkedReimbContract = subTotal2Contract > 0 ? subTotal2Contract : (consultant.contractAmountSchedule?.condition1?.reimbursableTotal ?? c1Summary?.reimbursableExpenses ?? subTotal2Contract);
  const linkedSubTotalDirect = linkedFeesContract + linkedReimbContract + subTotal3Contract;

  const totalBaseContract = linkedSubTotalDirect;
  // Contingency Contract Provision: identical to Contract Amount Schedule (once set on contract amount page don't change it)
  const contingencyContract = useMemo(() => {
    if (consultant.contractAmountSchedule?.condition1?.summary?.contingency !== undefined && consultant.contractAmountSchedule.condition1.summary.contingency > 0) {
      return consultant.contractAmountSchedule.condition1.summary.contingency;
    }
    return Number((totalBaseContract * (contingencyRatePct / 100)).toFixed(2));
  }, [consultant.contractAmountSchedule?.condition1?.summary?.contingency, totalBaseContract, contingencyRatePct]);

  const grandContractWithContingency = totalBaseContract + contingencyContract;
  const vatContract = Number((grandContractWithContingency * (vatRatePct / 100)).toFixed(2));
  const totalContractDue = grandContractWithContingency + vatContract;
  // Contract Net Baseline (Contract Amount Minus VAT)
  const contractNetAmount = grandContractWithContingency;

  // This Invoice Grand Totals
  const totalSubtotalThisInvoice = subTotal1ThisInvoice + subTotal2ThisInvoice + subTotal3ThisInvoice;
  // User-assigned contingency claim for this invoice
  const contingencyThisInvoice = Number((contingencyThisInvoiceClaim || 0).toFixed(2));
  // Total To-Date Contingency: defaults to contract contingency baseline if not set explicitly
  const contingencyToDate = contingencyToDateEtb > 0 ? contingencyToDateEtb : contingencyContract;
  // Previous month amount (Preceding Claim) computed dynamically: Preceding ETB = To-Date ETB - This Month ETB
  const contingencyPrecedingClaim = Math.max(0, Number((contingencyToDate - contingencyThisInvoice).toFixed(2)));
  const subtotalWithContingencyThisInvoice = totalSubtotalThisInvoice + contingencyThisInvoice;
  const vatThisInvoice = Number((subtotalWithContingencyThisInvoice * (vatRatePct / 100)).toFixed(2));
  const grossPayableBase = subtotalWithContingencyThisInvoice + vatThisInvoice;
  
  const totalDeductionsThisInvoice = (advanceDeductionEtb || 0) + (taxDeductionEtb || 0) + (retentionDeductionEtb || 0) + (overtimeDeductionEtb || 0);

  // TOTAL NET AMOUNT PAYABLE TO CONSULTANT (ETB) IS MINUS VAT
  // In Ethiopian road supervision contracts, net payment certificate is net of 15% VAT (VAT is remitted separately)
  const calculatedNetDueThisInvoice = Math.max(0, (grossPayableBase - vatThisInvoice) + (overtimeEtb || 0) - totalDeductionsThisInvoice);

  // Once the payment is saved, no change on the amount of the payment unless explicitly unlocked by admin.
  // ERA Policy Rule: If this invoice is a previous month invoice rolled forward to next month, it is permanently frozen with no change permitted.
  const isPaymentLocked = isPreviousInvoiceFrozen ? true : (isPaymentSaved && !allowAdminUnlock && savedPaymentAmount !== null);
  const netDueThisInvoice = isPaymentLocked ? (savedPaymentAmount as number) : calculatedNetDueThisInvoice;

  // Preceding Invoice Grand Totals (Minus VAT)
  const totalSubtotalPreceding = subTotal1Preceding + subTotal2Preceding + subTotal3Preceding;
  const subtotalWithContingencyPreceding = totalSubtotalPreceding + (contingencyPrecedingClaim || 0);
  const vatPreceding = Number((subtotalWithContingencyPreceding * (vatRatePct / 100)).toFixed(2));
  const grossPreceding = subtotalWithContingencyPreceding + vatPreceding;
  const netPreceding = subtotalWithContingencyPreceding;

  // To-Date Cumulative (Minus VAT)
  const totalSubtotalToDate = subTotal1ToDate + subTotal2ToDate + subTotal3ToDate;
  const subtotalWithContingencyToDate = totalSubtotalToDate + contingencyToDate;
  const vatToDate = Number((subtotalWithContingencyToDate * (vatRatePct / 100)).toFixed(2));
  const grossToDate = subtotalWithContingencyToDate + vatToDate;
  const netToDate = Math.max(0, subtotalWithContingencyToDate + (overtimeEtb || 0) - totalDeductionsThisInvoice);

  // USD Mode Active: Controlled by usdBillingEnabled toggle state
  const isUsdModeActive = usdBillingEnabled;

  // USD Contract and Invoice Totals for Table 5 and Sub Tables
  const linkedFeesContractUsd = consultant.contractAmountSchedule?.condition1?.summary?.feesUsd ?? 0;
  const linkedReimbContractUsd = consultant.contractAmountSchedule?.condition1?.summary?.reimbursableUsd ?? 0;

  const subTotal1ContractUsd = useMemo(() => {
    const computed = feeRowsComputed.reduce((s, r) => s + (r.contractAmountUsd || 0), 0);
    return computed > 0 ? computed : linkedFeesContractUsd;
  }, [feeRowsComputed, linkedFeesContractUsd]);

  const subTotal1PrecedingUsd = useMemo(() => {
    return feeRowsComputed.reduce((s, r) => s + (r.precedingAmountUsd || 0), 0);
  }, [feeRowsComputed]);

  const subTotal1ThisInvoiceUsd = useMemo(() => {
    return feeRowsComputed.reduce((s, r) => s + (r.thisInvoiceAmountUsd || 0), 0);
  }, [feeRowsComputed]);

  const subTotal1ToDateUsd = useMemo(() => {
    return Number((subTotal1PrecedingUsd + subTotal1ThisInvoiceUsd).toFixed(2));
  }, [subTotal1PrecedingUsd, subTotal1ThisInvoiceUsd]);

  const subTotal1RemainingUsd = useMemo(() => {
    return Math.max(0, Number((subTotal1ContractUsd - subTotal1ToDateUsd).toFixed(2)));
  }, [subTotal1ContractUsd, subTotal1ToDateUsd]);

  const subTotal2ContractUsd = useMemo(() => {
    const computed = reimbursableRowsComputed.reduce((s, r) => s + (r.contractAmountUsd || 0), 0);
    return computed > 0 ? computed : linkedReimbContractUsd;
  }, [reimbursableRowsComputed, linkedReimbContractUsd]);

  const subTotal2PrecedingUsd = useMemo(() => {
    return reimbursableRowsComputed.reduce((s, r) => s + (r.precedingAmountUsd || 0), 0);
  }, [reimbursableRowsComputed]);

  const subTotal2ThisInvoiceUsd = useMemo(() => {
    return reimbursableRowsComputed.reduce((s, r) => s + (r.thisInvoiceAmountUsd || 0), 0);
  }, [reimbursableRowsComputed]);

  const subTotal2ToDateUsd = useMemo(() => {
    return Number((subTotal2PrecedingUsd + subTotal2ThisInvoiceUsd).toFixed(2));
  }, [subTotal2PrecedingUsd, subTotal2ThisInvoiceUsd]);

  const subTotal2RemainingUsd = useMemo(() => {
    return Math.max(0, Number((subTotal2ContractUsd - subTotal2ToDateUsd).toFixed(2)));
  }, [subTotal2ContractUsd, subTotal2ToDateUsd]);

  const subTotal3ContractUsd = useMemo(() => {
    return defectRowsComputed.reduce((s, r) => s + (r.contractAmountUsd || 0), 0);
  }, [defectRowsComputed]);

  const subTotal3PrecedingUsd = useMemo(() => {
    return defectRowsComputed.reduce((s, r) => s + (r.precedingAmountUsd || 0), 0);
  }, [defectRowsComputed]);

  const subTotal3ThisInvoiceUsd = useMemo(() => {
    return defectRowsComputed.reduce((s, r) => s + (r.thisInvoiceAmountUsd || 0), 0);
  }, [defectRowsComputed]);

  const subTotal3ToDateUsd = useMemo(() => {
    return Number((subTotal3PrecedingUsd + subTotal3ThisInvoiceUsd).toFixed(2));
  }, [subTotal3PrecedingUsd, subTotal3ThisInvoiceUsd]);

  const subTotal3RemainingUsd = useMemo(() => {
    return Math.max(0, Number((subTotal3ContractUsd - subTotal3ToDateUsd).toFixed(2)));
  }, [subTotal3ContractUsd, subTotal3ToDateUsd]);

  const totalBaseContractUsd = subTotal1ContractUsd + subTotal2ContractUsd + subTotal3ContractUsd;
  const totalSubtotalPrecedingUsd = subTotal1PrecedingUsd + subTotal2PrecedingUsd + subTotal3PrecedingUsd;
  const totalSubtotalThisInvoiceUsd = subTotal1ThisInvoiceUsd + subTotal2ThisInvoiceUsd + subTotal3ThisInvoiceUsd;
  const totalSubtotalToDateUsd = subTotal1ToDateUsd + subTotal2ToDateUsd + subTotal3ToDateUsd;
  const totalSubtotalRemainingUsd = Math.max(0, Number((totalBaseContractUsd - totalSubtotalToDateUsd).toFixed(2)));

  const contingencyContractUsd = Number((totalBaseContractUsd * (contingencyRatePct / 100)).toFixed(2));
  const contingencyThisInvoiceUsd = Number((contingencyThisInvoiceClaimUsd || 0).toFixed(2));
  const contingencyToDateUsdValue = contingencyToDateUsd > 0 ? contingencyToDateUsd : contingencyContractUsd;
  const contingencyPrecedingClaimUsd = Math.max(0, Number((contingencyToDateUsdValue - contingencyThisInvoiceUsd).toFixed(2)));
  const contingencyRemainingUsd = Math.max(0, Number((contingencyContractUsd - contingencyToDateUsdValue).toFixed(2)));

  const subtotalWithContingencyPrecedingUsd = totalSubtotalPrecedingUsd + contingencyPrecedingClaimUsd;
  const subtotalWithContingencyThisInvoiceUsd = totalSubtotalThisInvoiceUsd + contingencyThisInvoiceUsd;
  const subtotalWithContingencyToDateUsd = totalSubtotalToDateUsd + contingencyToDateUsdValue;

  const grandContractWithContingencyUsd = totalBaseContractUsd + contingencyContractUsd;
  const vatContractUsd = Number((grandContractWithContingencyUsd * (vatRatePct / 100)).toFixed(2));
  const vatPrecedingUsd = Number((subtotalWithContingencyPrecedingUsd * (vatRatePct / 100)).toFixed(2));
  const vatThisInvoiceUsd = Number((subtotalWithContingencyThisInvoiceUsd * (vatRatePct / 100)).toFixed(2));
  const vatToDateUsd = Number((subtotalWithContingencyToDateUsd * (vatRatePct / 100)).toFixed(2));
  const vatRemainingUsd = Math.max(0, Number((vatContractUsd - vatToDateUsd).toFixed(2)));

  const totalContractDueUsd = totalBaseContractUsd + contingencyContractUsd + vatContractUsd;
  const grossPrecedingUsd = subtotalWithContingencyPrecedingUsd + vatPrecedingUsd;
  const grossPayableBaseUsd = subtotalWithContingencyThisInvoiceUsd + vatThisInvoiceUsd;
  const grossToDateUsd = subtotalWithContingencyToDateUsd + vatToDateUsd;
  const grossRemainingUsd = Math.max(0, Number((totalContractDueUsd - grossToDateUsd).toFixed(2)));

  // Handlers for Staff Rows Editing
  const handleUpdateStaff = (id: string, updates: Partial<EditableStaffRow>) => {
    setStaffRows(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.rate !== undefined || updates.contractQty !== undefined) {
          updated.contractAmount = Number(((updated.rate || 0) * (updated.contractQty || 0)).toFixed(2));
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteStaff = (id: string) => {
    if (staffRows.length <= 1) return;
    setStaffRows(prev => prev.filter(item => item.id !== id));
  };

  // At the end of each month calculate the assigned personnel man month input from the invoice total to-date man month
  const handleCalculatePersonnelMMFromInvoice = (showNotification = true): ConsultantPersonnel[] | undefined => {
    if (!onUpdateConsultantPersonnel) return;
    const currentDirectory = consultant.personnel || [];
    let updatedCount = 0;

    const updatedDirectory: ConsultantPersonnel[] = currentDirectory.map(p => {
      // Find matching staff row in feeRowsComputed
      const match = feeRowsComputed.find(f => 
        f.id === p.id || 
        f.personnelId === p.id || 
        (f.name && p.name && f.name.trim().toLowerCase() === p.name.trim().toLowerCase()) ||
        (f.position && p.position && f.position.trim().toLowerCase() === p.position.trim().toLowerCase())
      );

      if (match) {
        updatedCount++;
        // Calculate assigned personnel man-month input from the invoice total to-date man month
        const toDateMM = Number(match.toDateQty.toFixed(2));
        return {
          ...p,
          manMonthsInput: toDateMM,
          monthlyBillingRate: match.rate,
          dailyReimbursableRate: match.dailyReimbursableRate || p.dailyReimbursableRate,
          manMonthsAllocated: match.contractQty || p.manMonthsAllocated,
          remarks: p.remarks || `MM Input calculated to ${toDateMM} from ${invoiceNo}`
        };
      }
      return p;
    });

    onUpdateConsultantPersonnel(updatedDirectory);
    if (showNotification) {
      setSaveSuccessMsg(`Calculated ${updatedCount} assigned personnel man-month inputs directly from invoice to-date man-months!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    }
    return updatedDirectory;
  };

  // Synchronize modified rates and calculate MM inputs back to the Assigned Personnel Directory
  const handleSyncRatesToDirectory = () => {
    handleCalculatePersonnelMMFromInvoice(true);
  };

  // Synchronize Reimbursable rows back to Contract Amount Table B (Condition 1) with validation check
  const syncReimbursablesToContractBaseline = (rows: EditableReimbursableRow[]): boolean => {
    // 1. Validation check across reimbursable rows
    const invalidRow = rows.find(r => 
      (r.rate !== undefined && (isNaN(r.rate) || r.rate < 0)) ||
      (r.contractQty !== undefined && (isNaN(r.contractQty) || r.contractQty < 0)) ||
      (r.rateUsd !== undefined && (isNaN(r.rateUsd) || r.rateUsd < 0)) ||
      (r.thisInvoiceQty !== undefined && (isNaN(r.thisInvoiceQty) || r.thisInvoiceQty < 0)) ||
      (r.thisInvoiceAmount !== undefined && (isNaN(r.thisInvoiceAmount) || r.thisInvoiceAmount < 0)) ||
      !r.description?.trim()
    );

    if (invalidRow) {
      const reason = !invalidRow.description?.trim()
        ? 'Item description cannot be empty'
        : 'Rate, Quantity, and Claim amounts must be valid non-negative numbers';
      setReimbSyncFeedback({
        status: 'error',
        message: `Validation Error on Item "${invalidRow.description || 'Unnamed'}": ${reason}. Sub Total 2 synchronization halted.`,
        invalidRowId: invalidRow.id
      });
      return false;
    }

    if (!onUpdateContractReimbursables) {
      setReimbSyncFeedback({
        status: 'error',
        message: 'Contract reimbursables synchronization handler is not connected.',
        invalidRowId: undefined
      });
      return false;
    }

    try {
      const c1ReimbList: ContractReimbursableCondition1[] = rows.map((r, idx) => {
        const contractAmount = Number(((r.rate || 0) * (r.contractQty || 1)).toFixed(2));
        return {
          id: r.id,
          no: r.no || String(idx + 1),
          item: r.description,
          description: r.description,
          basis: r.basis || '',
          unit: r.unit || 'Month',
          rate: r.rate || 0,
          rateUsd: r.rateUsd,
          contractQty: r.contractQty || 1,
          amountEtb: contractAmount,
          contractAmount: contractAmount,
          amountUsd: r.rateUsd ? Number((r.rateUsd * (r.contractQty || 1)).toFixed(2)) : undefined,
          splitType: r.rateUsd && r.rateUsd > 0 ? 'rate_split' : 'etb_only'
        };
      });

      onUpdateContractReimbursables(c1ReimbList);
      const newContractTotal = rows.reduce((s, r) => s + (Number(r.contractAmount) || 0), 0);
      setReimbSyncFeedback({
        status: 'synced',
        message: `Sub Total 2 recalculated (${fmt(newContractTotal)} ETB) and synchronized with Contract Table B.`,
        invalidRowId: undefined
      });
      return true;
    } catch (err: any) {
      setReimbSyncFeedback({
        status: 'error',
        message: `Sub Total 2 synchronization failed: ${err?.message || 'Update failed'}`,
        invalidRowId: undefined
      });
      return false;
    }
  };

  // Reimbursables Editing
  const handleUpdateReimbursable = (id: string, updates: Partial<EditableReimbursableRow>) => {
    // Check for inline validation errors on numeric fields
    let validationError: string | null = null;
    if (updates.rate !== undefined && (isNaN(updates.rate) || updates.rate < 0)) {
      validationError = 'Unit Rate must be a non-negative number';
    } else if (updates.contractQty !== undefined && (isNaN(updates.contractQty) || updates.contractQty < 0)) {
      validationError = 'Contract Quantity must be a non-negative number';
    } else if (updates.thisInvoiceQty !== undefined && (isNaN(updates.thisInvoiceQty) || updates.thisInvoiceQty < 0)) {
      validationError = 'Invoice Claim Quantity must be a non-negative number';
    } else if (updates.thisInvoiceAmount !== undefined && (isNaN(updates.thisInvoiceAmount) || updates.thisInvoiceAmount < 0)) {
      validationError = 'Invoice Claim Amount must be a non-negative number';
    } else if (updates.description !== undefined && !updates.description.trim()) {
      validationError = 'Item description cannot be empty';
    }

    if (validationError) {
      setReimbSyncFeedback({
        status: 'error',
        message: `Validation Error on Item: ${validationError}. Sub Total 2 recalculation halted.`,
        invalidRowId: id
      });
    }

    setReimbursableRows(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          if (updates.rate !== undefined || updates.contractQty !== undefined) {
            updated.contractAmount = Number(((updated.rate || 0) * (updated.contractQty || 0)).toFixed(2));
          }
          if (updates.thisInvoiceQty !== undefined && updates.thisInvoiceAmount === undefined) {
            updated.thisInvoiceAmount = Number(((updates.thisInvoiceQty || 0) * updated.rate).toFixed(2));
          }
          if (updates.thisInvoiceAmount !== undefined && updates.thisInvoiceQty === undefined && updated.rate > 0) {
            updated.thisInvoiceQty = Number((updates.thisInvoiceAmount / updated.rate).toFixed(2));
          }
          return updated;
        }
        return item;
      });

      if (!validationError) {
        const isContractField = updates.rate !== undefined || 
          updates.contractQty !== undefined || 
          updates.description !== undefined || 
          updates.unit !== undefined || 
          updates.no !== undefined || 
          updates.basis !== undefined || 
          updates.rateUsd !== undefined;
        
        if (isContractField) {
          syncReimbursablesToContractBaseline(next);
        }
      }

      return next;
    });
  };

  const handleAddReimbursable = () => {
    const newId = `reimb_custom_${Date.now()}`;
    const newRow: EditableReimbursableRow = {
      id: newId,
      no: String(reimbursableRows.length + 1),
      description: 'Additional Direct Field Expense',
      basis: 'Actual expenditure certified with receipts',
      unit: 'Month',
      rate: 15000.00,
      contractQty: 12,
      contractAmount: 180000.00,
      thisInvoiceQty: 0,
      thisInvoiceAmount: 0,
      precedingQty: 0,
      precedingAmount: 0
    };
    const next = [...reimbursableRows, newRow];
    setReimbursableRows(next);
    syncReimbursablesToContractBaseline(next);
  };

  const handleDeleteReimbursable = (id: string) => {
    if (reimbursableRows.length <= 1) return;
    const next = reimbursableRows.filter(item => item.id !== id);
    setReimbursableRows(next);
    syncReimbursablesToContractBaseline(next);
  };

  // Defect Liability Staff Allocation Editing (Sub Total 3)
  const handleUpdateDefectRow = (id: string, updates: Partial<EditableDefectLiabilityRow>) => {
    setDefectRows(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.rate !== undefined || updates.contractQty !== undefined) {
          const rate = updates.rate !== undefined ? Number(updates.rate) || 0 : item.rate;
          const qty = updates.contractQty !== undefined ? Number(updates.contractQty) || 0 : item.contractQty;
          updated.contractAmount = Number((rate * qty).toFixed(2));
        }
        if (updates.thisInvoiceQty !== undefined && updates.thisInvoiceAmount === undefined) {
          const qty = Number(updates.thisInvoiceQty) || 0;
          updated.thisInvoiceAmount = Number((qty * (updated.rate || item.rate)).toFixed(2));
        }
        if (updates.thisInvoiceAmount !== undefined && updates.thisInvoiceQty === undefined && updated.rate > 0) {
          updated.thisInvoiceQty = Number((updates.thisInvoiceAmount / updated.rate).toFixed(2));
        }
        return updated;
      }
      return item;
    }));
  };

  const handleAddDefectRow = () => {
    const newId = `dl_custom_${Date.now()}`;
    const newRow: EditableDefectLiabilityRow = {
      id: newId,
      position: 'Additional Defect Liability Expert',
      name: 'To be nominated',
      unit: 'Month',
      rate: 18500.00,
      contractQty: 1.0,
      contractAmount: 18500.00,
      thisInvoiceQty: 0,
      thisInvoiceAmount: 0,
      precedingQty: 0,
      precedingAmount: 0
    };
    setDefectRows(prev => [...prev, newRow]);
  };

  const handleDeleteDefectRow = (id: string) => {
    if (defectRows.length <= 1) return;
    setDefectRows(prev => prev.filter(item => item.id !== id));
  };

  // =========================================================================
  // PROCEED TO NEXT MONTH (ROLL FORWARD)
  // Preserves replaced predecessor records, rolls cumulative amounts to preceding,
  // advances billing period, and prepares active replacement staff for the new month.
  // =========================================================================
  const handleProceedToNextMonth = () => {
    if (isPreviousInvoiceFrozen) {
      alert('🔒 Billing Process Restriction: This invoice is a historical previous month invoice that has already been rolled forward and synchronized with the ledger. Progression to next month can only be initiated from the current active invoice.');
      return;
    }

    const { nextPeriodStr, nextDaysInMonth, nextMonthName } = computeNextBillingPeriod(`${billingMonth} ${billingYear}`);
    const nextInvNo = computeNextInvoiceNumber(invoiceNo);

    const confirmMsg = `Proceed and roll forward invoice to next month?\n\n` +
      `• New Billing Period: ${nextPeriodStr}\n` +
      `• New Invoice No: ${nextInvNo}\n` +
      `• Permanent Lock Rule: Current invoice (${invoiceNo}) and all previous month invoices will be permanently frozen with no changes or updates permitted.\n` +
      `• Roll Forward Rule: Current 'To-Date' amounts will lock into 'Preceding' history.\n` +
      `• Replaced Personnel: Predecessor records are permanently preserved in historical audit.\n` +
      `• Active Successors: Days worked resets to 0 for ${nextMonthName} attendance logging.`;

    if (!window.confirm(confirmMsg)) return;

    // Calculate USD amounts if USD payments enabled
    let feesAmountUsd = 0;
    let reimbursableAmountUsd = 0;
    let grossAmountUsd = 0;
    let netAmountUsd = 0;

    if (consultant.enableUsdPayments) {
      const c1 = consultant.contractAmountSchedule?.condition1;
      const c1ExchangeRate = Number(c1?.currencySplitExchangeRate || c1?.exchangeRate || 120);

      staffRows.forEach(s => {
        const qty = s.daysWorked > 0 ? Number((s.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
        const matchedC1 = (c1?.staffFees || []).find(
          f => f.id === s.id || (f.name && f.name.toLowerCase().trim() === s.name.toLowerCase().trim()) || (f.position && f.position.toLowerCase().trim() === s.position.toLowerCase().trim())
        );
        let usdRateForStaff = 0;
        if (matchedC1) {
          if (matchedC1.splitType === 'fixed_amount' && matchedC1.fixedUsdRate !== undefined) {
            usdRateForStaff = Number(matchedC1.fixedUsdRate) || 0;
          } else if (matchedC1.usdPercentage && matchedC1.usdPercentage > 0) {
            usdRateForStaff = Number(((s.rate * matchedC1.usdPercentage / 100) / (c1ExchangeRate || 120)).toFixed(2));
          } else if (matchedC1.rateUsd) {
            usdRateForStaff = Number(matchedC1.rateUsd) || 0;
          }
        }
        feesAmountUsd += Number((qty * usdRateForStaff).toFixed(2));
      });

      reimbursableRows.forEach(r => {
        const matchedReimb = (c1?.reimbursableList || []).find(
          item => item.id === r.id || (item.item && item.item.toLowerCase().trim() === r.description.toLowerCase().trim())
        );
        let usdAmount = 0;
        if (matchedReimb) {
          if (matchedReimb.splitType === 'fixed_amount' && matchedReimb.fixedUsdAmount !== undefined) {
            const ratio = (Number(matchedReimb.amountEtb) || 1) > 0 ? (r.thisInvoiceAmount / Number(matchedReimb.amountEtb)) : 1;
            usdAmount = Number((matchedReimb.fixedUsdAmount * ratio).toFixed(2));
          } else if (matchedReimb.usdPercentage && matchedReimb.usdPercentage > 0) {
            usdAmount = Number(((r.thisInvoiceAmount * matchedReimb.usdPercentage / 100) / (c1ExchangeRate || 120)).toFixed(2));
          } else if (matchedReimb.amountUsd) {
            const ratio = (Number(matchedReimb.amountEtb) || 1) > 0 ? (r.thisInvoiceAmount / Number(matchedReimb.amountEtb)) : 1;
            usdAmount = Number((matchedReimb.amountUsd * ratio).toFixed(2));
          }
        }
        reimbursableAmountUsd += usdAmount;
      });

      grossAmountUsd = Number((feesAmountUsd + reimbursableAmountUsd).toFixed(2));
      const advanceDeductionUsd = activeInvoice?.advanceDeductionUsd || 0;
      const taxDeductionUsd = activeInvoice?.taxDeductionUsd || 0;
      netAmountUsd = Number((grossAmountUsd - advanceDeductionUsd - taxDeductionUsd).toFixed(2));
    }

    const currentFinalPayment = (isPaymentLocked && savedPaymentAmount !== null) ? savedPaymentAmount : calculatedNetDueThisInvoice;

    // 1. Build finalized outgoing current month invoice (permanently locked into ledger)
    const finalizedCurrentInvoice: ConsultantInvoice = {
      id: activeInvoice?.id || `inv_${Date.now()}`,
      invoiceNo: invoiceNo.trim() || 'INV-01',
      billingPeriod: `${billingMonth} ${billingYear}`.trim(),
      submissionDate: submissionDate || new Date().toISOString().split('T')[0],
      certificationDate: invoiceDate,
      grossAmountEtb: grossPayableBase,
      netAmountEtb: currentFinalPayment,
      totalDueEtb: currentFinalPayment,
      savedPaymentAmount: currentFinalPayment,
      isPaymentSaved: true,
      paymentLocked: true,
      isPreviousInvoiceLocked: true,
      vatAmountEtb: vatThisInvoice,
      feesAmountEtb: subTotal1ThisInvoice,
      reimbursableAmountEtb: subTotal2ThisInvoice,
      advanceDeductionEtb: advanceDeductionEtb || 0,
      taxDeductionEtb: taxDeductionEtb || 0,
      overtimeEtb: overtimeEtb || 0,
      overtimeDeductionEtb: overtimeDeductionEtb || 0,
      grossAmountUsd: consultant.enableUsdPayments ? grossAmountUsd : undefined,
      netAmountUsd: consultant.enableUsdPayments ? netAmountUsd : undefined,
      foreignCurrencyAmount: consultant.enableUsdPayments ? netAmountUsd : undefined,
      foreignCurrencyCode: consultant.enableUsdPayments ? 'USD' : undefined,
      feesAmountUsd: consultant.enableUsdPayments ? feesAmountUsd : undefined,
      reimbursableAmountUsd: consultant.enableUsdPayments ? reimbursableAmountUsd : undefined,
      status: (status === 'Submitted' ? 'Certified' : status) as any,
      paymentReference: paymentReference || undefined,
      paymentDate: paymentDate || undefined,
      remarks: remarks || `Computed from Attendance × Rate Tables. Synchronized with ledger and locked upon rolling forward to next month.`,
      attendanceRecords: staffRows.map(s => {
        const qty = s.daysWorked > 0 ? Number((s.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
        const thisAmount = Number((qty * s.rate).toFixed(2));
        return {
          id: s.id,
          personnelId: s.id,
          position: s.position,
          name: s.name,
          days: s.daysWorked,
          daysWorked: s.daysWorked,
          thisInvoiceQty: qty,
          derivedMmInput: qty,
          thisInvoiceAmount: thisAmount,
          rate: s.rate,
          contractQty: s.contractQty,
          contractAmount: s.contractAmount,
          precedingQty: s.precedingQty,
          precedingAmount: s.precedingAmount,
        };
      }),
      reimbursableRecords: reimbursableRows.map(r => ({
        id: r.id,
        description: r.description,
        rate: r.rate,
        thisInvoiceQty: r.thisInvoiceQty,
        thisInvoiceAmount: r.thisInvoiceAmount,
        precedingQty: r.precedingQty,
        precedingAmount: r.precedingAmount,
      })),
      defectLiabilityRecords: defectRowsComputed.map(d => ({
        id: d.id,
        position: d.position,
        unit: d.unit,
        rate: d.rate,
        contractQty: d.contractQty,
        contractAmount: d.contractAmount,
        thisInvoiceQty: d.thisInvoiceQty,
        thisInvoiceAmount: d.computedThisAmount,
        precedingQty: d.precedingQty,
        precedingAmount: d.precedingAmount
      })),
      vatRate: vatRatePct,
      contingencyRate: contingencyRatePct,
      contingencyThisInvoiceClaim: contingencyThisInvoiceClaim,
      contingencyThisInvoiceClaimUsd: contingencyThisInvoiceClaimUsd,
      contingencyToDateEtb: contingencyToDate,
      contingencyToDateUsd: contingencyToDateUsdValue,
      clientName: clientName,
      consultantFirmName: consultantFirm,
      preparedBy,
      checkedBy,
      reviewedBy,
      recommendedBy,
      approvedBy,
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    // Roll forward staff rows
    const rolledStaffRows: EditableStaffRow[] = feeRowsComputed.map(r => ({
      ...r,
      daysWorked: 0, // Fresh month attendance
      precedingQty: r.toDateQty,
      precedingAmount: r.toDateAmount,
    }));

    // Roll forward reimbursable rows
    const rolledReimbursables: EditableReimbursableRow[] = reimbursableRowsComputed.map(r => ({
      ...r,
      thisInvoiceQty: 0,
      thisInvoiceAmount: 0,
      precedingQty: r.toDateQty,
      precedingAmount: r.toDateAmount
    }));

    // Roll forward defect liability rows
    const rolledDefectRows: EditableDefectLiabilityRow[] = defectRowsComputed.map(d => ({
      ...d,
      thisInvoiceQty: 0,
      thisInvoiceAmount: 0,
      precedingQty: d.toDateQty,
      precedingAmount: d.toDateAmount
    }));

    // Update local state
    setInvoiceNo(nextInvNo);
    setBillingMonth(nextMonthName);
    const yearMatch = nextPeriodStr.match(/20\d{2}/);
    if (yearMatch) setBillingYear(parseInt(yearMatch[0], 10));
    setTotalDaysInMonth(nextDaysInMonth);
    setStaffRows(rolledStaffRows);
    setReimbursableRows(rolledReimbursables);
    setDefectRows(rolledDefectRows);
    setContingencyToDateEtb(contingencyToDate);
    setContingencyToDateUsd(contingencyToDateUsdValue);
    setContingencyThisInvoiceClaim(0);
    setContingencyThisInvoiceClaimUsd(0);
    setStatus('Submitted');
    setPaymentReference('');
    setPaymentDate('');
    setRemarks(`Monthly Fee Claim for ${nextPeriodStr} rolled forward from ${invoiceNo}. Preceding historical inputs locked.`);
    setIsPaymentSaved(false);
    setSavedPaymentAmount(null);
    setAllowAdminUnlock(false);

    // At end of month: calculate assigned personnel man month input from invoice total to-date man month
    handleCalculatePersonnelMMFromInvoice(false);

    // 2. Build new month invoice
    const newMonthInvoice: ConsultantInvoice = {
      id: `inv_${Date.now() + 1}`,
      invoiceNo: nextInvNo,
      billingPeriod: nextPeriodStr,
      submissionDate: new Date().toISOString().split('T')[0],
      certificationDate: undefined,
      grossAmountEtb: 0,
      netAmountEtb: 0,
      totalDueEtb: 0,
      vatAmountEtb: 0,
      feesAmountEtb: 0,
      reimbursableAmountEtb: 0,
      advanceDeductionEtb: 0,
      taxDeductionEtb: 0,
      status: 'Submitted',
      isPaymentSaved: false,
      paymentLocked: false,
      isPreviousInvoiceLocked: false,
      remarks: `Rolled forward to ${nextPeriodStr}. Preceding cumulative records locked; active assigned personnel ready for attendance.`,
      attendanceRecords: rolledStaffRows.map(s => ({
        id: s.id,
        personnelId: s.id,
        position: s.position,
        name: s.name,
        days: 0,
        daysWorked: 0,
        rate: s.rate,
        contractQty: s.contractQty,
        contractAmount: s.contractAmount,
        precedingQty: s.precedingQty,
        precedingAmount: s.precedingAmount,
      })),
      reimbursableRecords: rolledReimbursables.map(r => ({
        id: r.id,
        description: r.description,
        rate: r.rate,
        thisInvoiceQty: 0,
        thisInvoiceAmount: 0,
        precedingQty: r.precedingQty,
        precedingAmount: r.precedingAmount,
      })),
      defectLiabilityRecords: rolledDefectRows.map(d => ({
        id: d.id,
        position: d.position,
        unit: d.unit,
        rate: d.rate,
        contractQty: d.contractQty,
        contractAmount: d.contractAmount,
        thisInvoiceQty: 0,
        thisInvoiceAmount: 0,
        precedingQty: d.precedingQty,
        precedingAmount: d.precedingAmount
      })),
      vatRate: vatRatePct,
      contingencyRate: contingencyRatePct,
      contingencyThisInvoiceClaim: 0,
      contingencyThisInvoiceClaimUsd: 0,
      contingencyToDateEtb: contingencyToDate,
      contingencyToDateUsd: contingencyToDateUsdValue,
      clientName: clientName,
      consultantFirmName: consultantFirm,
      preparedBy,
      checkedBy,
      reviewedBy,
      recommendedBy,
      approvedBy,
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    if (onProceedToNextMonth) {
      onProceedToNextMonth(finalizedCurrentInvoice, newMonthInvoice);
    } else {
      onSaveInvoice(finalizedCurrentInvoice);
      onSaveInvoice(newMonthInvoice);
    }

    setSaveSuccessMsg(`Proceeded to ${nextMonthName}! New invoice ${nextInvNo} created. Preceding invoice ${invoiceNo} permanently locked into ledger.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Validation function that runs before report generation or passing data to the Invoice page.
  // Verifies that no rows labeled 'VAT' exist in the data set being passed to the Invoice page.
  // Provides a clear error alert if inconsistencies are found.
  const validateNoVatRowsBeforeInvoiceSync = (invoice: ConsultantInvoice): boolean => {
    const checkText = (txt: string | undefined): boolean => {
      if (!txt || typeof txt !== 'string') return false;
      const upper = txt.toUpperCase();
      return upper.includes('VAT') || upper.includes('VALUE ADDED TAX');
    };

    if (checkText(invoice.invoiceNo)) {
      const msg = `Validation Error: Invoice number contains prohibited 'VAT' reference: ${invoice.invoiceNo}`;
      alert(msg);
      throw new Error(msg);
    }

    if (Array.isArray(invoice.attendanceRecords)) {
      for (const rec of invoice.attendanceRecords) {
        if (checkText(rec.position) || checkText(rec.name)) {
          const msg = `Validation Error: Staff attendance record contains prohibited 'VAT' row/label: position='${rec.position}', name='${rec.name}'`;
          alert(msg);
          throw new Error(msg);
        }
      }
    }

    if (Array.isArray(invoice.reimbursableRecords)) {
      for (const rec of invoice.reimbursableRecords) {
        if (checkText(rec.description)) {
          const msg = `Validation Error: Reimbursable item contains prohibited 'VAT' row/label: description='${rec.description}'`;
          alert(msg);
          throw new Error(msg);
        }
      }
    }

    return true;
  };

  // Synchronize and Save to Invoices Register
  const handleSaveAndSync = () => {
    if (isPreviousInvoiceFrozen) {
      alert('🔒 Invoice Frozen: Once an invoice is saved, synchronized with the ledger, and rolled forward to process next month, no changes or updates are permitted across all previous month invoices.');
      return;
    }

    // At the end of each month calculate the assigned personnel man month input from the invoice total to-date man month
    handleCalculatePersonnelMMFromInvoice(false);

    // Once payment is saved, lock the payment amount so no change occurs
    const finalPaymentAmount = (isPaymentLocked && savedPaymentAmount !== null) ? savedPaymentAmount : calculatedNetDueThisInvoice;
    setIsPaymentSaved(true);
    setSavedPaymentAmount(finalPaymentAmount);
    setAllowAdminUnlock(false);

    // Calculate USD amounts if USD payments enabled
    let feesAmountUsd = 0;
    let reimbursableAmountUsd = 0;
    let grossAmountUsd = 0;
    let netAmountUsd = 0;

    if (consultant.enableUsdPayments) {
      const c1 = consultant.contractAmountSchedule?.condition1;
      const c1ExchangeRate = Number(c1?.currencySplitExchangeRate || c1?.exchangeRate || 120);

      // 1. Staff fees USD portion
      staffRows.forEach(s => {
        const qty = s.daysWorked > 0 ? Number((s.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
        const matchedC1 = (c1?.staffFees || []).find(
          f => f.id === s.id || (f.name && f.name.toLowerCase().trim() === s.name.toLowerCase().trim()) || (f.position && f.position.toLowerCase().trim() === s.position.toLowerCase().trim())
        );

        let usdRateForStaff = 0;
        if (matchedC1) {
          if (matchedC1.splitType === 'fixed_amount' && matchedC1.fixedUsdRate !== undefined) {
            usdRateForStaff = Number(matchedC1.fixedUsdRate) || 0;
          } else if (matchedC1.usdPercentage && matchedC1.usdPercentage > 0) {
            usdRateForStaff = Number(((s.rate * matchedC1.usdPercentage / 100) / (c1ExchangeRate || 120)).toFixed(2));
          } else if (matchedC1.rateUsd) {
            usdRateForStaff = Number(matchedC1.rateUsd) || 0;
          }
        } else {
          // Check Condition 2 foreign staff
          const matchedC2 = (consultant.contractAmountSchedule?.condition2?.staffFees || []).find(
            f => (f.name && f.name.toLowerCase().trim() === s.name.toLowerCase().trim()) || (f.position && f.position.toLowerCase().trim() === s.position.toLowerCase().trim())
          );
          if (matchedC2 && matchedC2.rateUsd) {
            usdRateForStaff = Number(matchedC2.rateUsd) || 0;
          }
        }
        feesAmountUsd += Number((qty * usdRateForStaff).toFixed(2));
      });

      // 2. Reimbursables USD portion
      reimbursableRows.forEach(r => {
        const matchedReimb = (c1?.reimbursableList || []).find(
          item => item.id === r.id || (item.item && item.item.toLowerCase().trim() === r.description.toLowerCase().trim())
        );
        let usdAmount = 0;
        if (matchedReimb) {
          if (matchedReimb.splitType === 'fixed_amount' && matchedReimb.fixedUsdAmount !== undefined) {
            const ratio = (Number(matchedReimb.amountEtb) || 1) > 0 ? (r.thisInvoiceAmount / Number(matchedReimb.amountEtb)) : 1;
            usdAmount = Number((matchedReimb.fixedUsdAmount * ratio).toFixed(2));
          } else if (matchedReimb.usdPercentage && matchedReimb.usdPercentage > 0) {
            usdAmount = Number(((r.thisInvoiceAmount * matchedReimb.usdPercentage / 100) / (c1ExchangeRate || 120)).toFixed(2));
          } else if (matchedReimb.amountUsd) {
            const ratio = (Number(matchedReimb.amountEtb) || 1) > 0 ? (r.thisInvoiceAmount / Number(matchedReimb.amountEtb)) : 1;
            usdAmount = Number((matchedReimb.amountUsd * ratio).toFixed(2));
          }
        }
        reimbursableAmountUsd += usdAmount;
      });

      if (feesAmountUsd === 0 && reimbursableAmountUsd === 0 && (activeInvoice?.grossAmountUsd || activeInvoice?.foreignCurrencyAmount)) {
        grossAmountUsd = activeInvoice.grossAmountUsd || activeInvoice.foreignCurrencyAmount || 0;
        netAmountUsd = activeInvoice.netAmountUsd || activeInvoice.foreignCurrencyAmount || 0;
      } else {
        grossAmountUsd = Number((feesAmountUsd + reimbursableAmountUsd).toFixed(2));
        const advanceDeductionUsd = activeInvoice?.advanceDeductionUsd || 0;
        const taxDeductionUsd = activeInvoice?.taxDeductionUsd || 0;
        netAmountUsd = Number((grossAmountUsd - advanceDeductionUsd - taxDeductionUsd).toFixed(2));
      }
    }

    const computedInvoice: ConsultantInvoice = {
      id: activeInvoice?.id || `inv_${Date.now()}`,
      invoiceNo: invoiceNo.trim() || 'INV-01',
      billingPeriod: `${billingMonth} ${billingYear}`.trim(),
      submissionDate: submissionDate || new Date().toISOString().split('T')[0],
      certificationDate: invoiceDate,
      grossAmountEtb: grossPayableBase,
      netAmountEtb: finalPaymentAmount,
      totalDueEtb: finalPaymentAmount,
      savedPaymentAmount: finalPaymentAmount,
      isPaymentSaved: true,
      paymentLocked: true,
      vatAmountEtb: vatThisInvoice,
      feesAmountEtb: subTotal1ThisInvoice,
      reimbursableAmountEtb: subTotal2ThisInvoice,
      advanceDeductionEtb: advanceDeductionEtb || 0,
      taxDeductionEtb: taxDeductionEtb || 0,
      overtimeEtb: overtimeEtb || 0,
      overtimeDeductionEtb: overtimeDeductionEtb || 0,
      grossAmountUsd: consultant.enableUsdPayments ? grossAmountUsd : undefined,
      netAmountUsd: consultant.enableUsdPayments ? netAmountUsd : undefined,
      foreignCurrencyAmount: consultant.enableUsdPayments ? netAmountUsd : undefined,
      foreignCurrencyCode: consultant.enableUsdPayments ? 'USD' : undefined,
      feesAmountUsd: consultant.enableUsdPayments ? feesAmountUsd : undefined,
      reimbursableAmountUsd: consultant.enableUsdPayments ? reimbursableAmountUsd : undefined,
      status: status,
      paymentReference: paymentReference || undefined,
      paymentDate: paymentDate || undefined,
      remarks: remarks || `Computed from Attendance × Rate Tables (Subtotal 1: ${fmt(subTotal1ThisInvoice)} + Subtotal 2: ${fmt(subTotal2ThisInvoice)} minus 15% VAT)${consultant.enableUsdPayments ? ` [USD Portion: Gross $${fmt(grossAmountUsd)}, Net $${fmt(netAmountUsd)}]` : ''}.`,
      attendanceRecords: staffRows.map(s => {
        const qty = s.daysWorked > 0 ? Number((s.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
        const thisAmount = Number((qty * s.rate).toFixed(2));
        return {
          id: s.id,
          personnelId: s.id,
          position: s.position,
          name: s.name,
          days: s.daysWorked,
          daysWorked: s.daysWorked,
          thisInvoiceQty: qty,
          derivedMmInput: qty,
          thisInvoiceAmount: thisAmount,
          rate: s.rate,
          contractQty: s.contractQty,
          contractAmount: s.contractAmount,
          precedingQty: s.precedingQty,
          precedingAmount: s.precedingAmount,
        };
      }),
      reimbursableRecords: reimbursableRows.map(r => ({
        id: r.id,
        description: r.description,
        rate: r.rate,
        thisInvoiceQty: r.thisInvoiceQty,
        thisInvoiceAmount: r.thisInvoiceAmount,
        precedingQty: r.precedingQty,
        precedingAmount: r.precedingAmount,
      })),
      defectLiabilityRecords: defectRowsComputed.map(d => ({
        id: d.id,
        position: d.position,
        unit: d.unit,
        rate: d.rate,
        contractQty: d.contractQty,
        contractAmount: d.contractAmount,
        thisInvoiceQty: d.thisInvoiceQty,
        thisInvoiceAmount: d.computedThisAmount,
        precedingQty: d.precedingQty,
        precedingAmount: d.precedingAmount
      })),
      vatRate: vatRatePct,
      contingencyRate: contingencyRatePct,
      contingencyThisInvoiceClaim: contingencyThisInvoiceClaim,
      contingencyThisInvoiceClaimUsd: contingencyThisInvoiceClaimUsd,
      contingencyToDateEtb: contingencyToDate,
      contingencyToDateUsd: contingencyToDateUsdValue,
      clientName: clientName,
      consultantFirmName: consultantFirm,
      preparedBy,
      checkedBy,
      reviewedBy,
      recommendedBy,
      approvedBy,
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    // Run validation before passing data to the Invoice page / report generation
    try {
      validateNoVatRowsBeforeInvoiceSync(computedInvoice);
    } catch (err) {
      console.error("VAT validation failed:", err);
      return;
    }

    onSaveInvoice(computedInvoice);
    setSaveSuccessMsg(`Successfully saved invoice ${invoiceNo}! Payment amount (${fmt(finalPaymentAmount)} ETB, minus VAT) is locked with no change allowed, and assigned personnel man-month inputs calculated.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Explicit Synchronization with Contract Amount Schedule (Table 1.2 & 1.3)
  const handleSyncFromContractSchedule = () => {
    syncStaffRowsFromAssignedPersonnel();
    setSaveSuccessMsg('Monthly invoice tables successfully synchronized with Contract Amount Schedule (Table 1.2 & Table 1.3)!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Compact PDF Export Mode Toggle
  const [isCompactPdfMode, setIsCompactPdfMode] = useState<boolean>(false);

  // Export Monthly Invoice Tables (Table 1, Sub Total 2, Sub Total 3, & Table 5) as a Formatted PDF Report
  const handleExportMonthlyInvoicePDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;
      const totalPages = 6;

      // Compact Mode Dynamic Formatting Parameters
      const fontSizeData = isCompactPdfMode ? 5.5 : 6;
      const fontSizeHeader = isCompactPdfMode ? 5.5 : 6;
      const lineStep = isCompactPdfMode ? 6.5 : 7.5;
      const minRowH = isCompactPdfMode ? 9.5 : 12;

      const drawPageHeader = (pNum: number, tableTitle: string) => {
        // Outer border frame
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 4, 4, 'S');

        // Top accent line
        doc.setFillColor(194, 120, 3); // ERA Gold
        doc.rect(margin + 2, margin + 1, pageWidth - margin * 2 - 4, 2.5, 'F');

        // Logo
        drawEraLogo(doc, margin + 6, margin + 6, 32);

        // Date stamp
        const stampW = 120;
        const stampX = pageWidth - margin - stampW - 6;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(stampX, margin + 6, stampW, 32, 4, 4, 'DF');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("OFFICIAL INVOICE STAMP", stampX + 6, margin + 14);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(submissionDate || new Date().toISOString().split('T')[0], stampX + 6, margin + 23);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        doc.text(`INVOICE: ${invoiceNo}${isCompactPdfMode ? ' [COMPACT]' : ''}`, stampX + 6, margin + 31);

        // Titles
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 44, margin + 16);

        doc.setFontSize(9);
        doc.setTextColor(30, 64, 175);
        doc.text(`MONTHLY SUPERVISION FEE INVOICE — ${tableTitle.toUpperCase()}`, margin + 44, margin + 27);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`${project.name || 'Road Construction Project'} • Billing Period: ${billingMonth} ${billingYear} • Consultant: ${consultantFirm || consultant.firmName}`, margin + 44, margin + 36);

        // Line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 2, margin + 44, pageWidth - margin - 2, margin + 44);

        // Footer
        const footerY = pageHeight - margin - 12;
        doc.line(margin + 2, footerY - 6, pageWidth - margin - 2, footerY - 6);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL SUPERVISION VALUATION & INVOICE CERTIFICATE${isCompactPdfMode ? ' (COMPACT LAYOUT MODE)' : ''}`, margin + 8, footerY + 2);
        doc.text(`Page ${pNum} of ${totalPages}`, pageWidth - margin - 60, footerY + 2);
      };

      // =========================================================================
      // PAGE 1: TABLE 1 — PERSONNEL ATTENDANCE RECORD & MAN-MONTH ALLOCATION
      // (Category, Days Worked, Month Days, Derived MM columns removed as requested)
      // =========================================================================
      drawPageHeader(1, "Table 1: Personnel Allocation & Man-Month Tracking Record");
      let y = margin + 52;

      // Formula / description box
      const boxH = isCompactPdfMode ? 16 : 20;
      doc.setFillColor(239, 246, 255); // blue-50
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(margin + 6, y, contentWidth - 12, boxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6.5 : 7);
      doc.setTextColor(30, 64, 175);
      doc.text("Supervisory Personnel Allocation Ledger:", margin + 14, y + (boxH * 0.65));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Supervision Staff Deployment & Man-Month (MM) Inputs • Cumulative Inputs Linked to Contract Table 1.3 Baseline`, margin + 175, y + (boxH * 0.65));

      y += boxH + (isCompactPdfMode ? 4 : 6);

      // Table 1 Headers without Category, Days Worked, Month Days, Derived MM
      const t1Headers = isUsdModeActive ? [
        { title: 'No', width: 24, align: 'center' },
        { title: 'Supervisory Position', width: 175, align: 'left' },
        { title: 'Assigned Personnel Name', width: 160, align: 'left' },
        { title: 'Unit', width: 36, align: 'center' },
        { title: 'Unit Price (ETB)', width: 75, align: 'right' },
        { title: 'Unit Price (USD)', width: 65, align: 'right' },
        { title: 'Contr. MM', width: 50, align: 'right' },
        { title: 'Preceding MM', width: 55, align: 'right' },
        { title: 'This Month MM', width: 55, align: 'right' },
        { title: 'To-Date MM', width: 55, align: 'right' }
      ] : [
        { title: 'No', width: 26, align: 'center' },
        { title: 'Supervisory Position', width: 195, align: 'left' },
        { title: 'Assigned Personnel Name', width: 175, align: 'left' },
        { title: 'Unit', width: 40, align: 'center' },
        { title: 'Unit Price (ETB)', width: 85, align: 'right' },
        { title: 'Contr. MM', width: 55, align: 'right' },
        { title: 'Preceding MM', width: 60, align: 'right' },
        { title: 'This Month MM', width: 60, align: 'right' },
        { title: 'To-Date MM', width: 60, align: 'right' }
      ];

      const headerBoxH = isCompactPdfMode ? 14 : 16;
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let curX = margin + 8;
      t1Headers.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, curX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, curX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, curX + 2, y + (headerBoxH * 0.65));
        }
        curX += h.width;
      });

      y += headerBoxH + 2;

      // Table 1 Rows with Word-Wrapping
      displayFeeRowsComputed.forEach((row, idx) => {
        if (y > pageHeight - margin - 35) return;

        const posWidth = isUsdModeActive ? 175 : 195;
        const nameWidth = isUsdModeActive ? 160 : 175;
        const posLines = doc.splitTextToSize(row.position || '', posWidth - 4);
        const nameLines = doc.splitTextToSize(row.name || '', nameWidth - 4);
        const maxLines = Math.max(posLines.length, nameLines.length, 1);
        const rowH = Math.max(maxLines * lineStep + (isCompactPdfMode ? 2 : 4), minRowH);

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSizeData);
        doc.setTextColor(30, 41, 59);

        let rX = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        // No
        const noW = isUsdModeActive ? 24 : 26;
        doc.text(String(idx + 1), rX + (noW / 2), y + textYOffset, { align: 'center' });
        rX += noW;

        // Position (Wrapped)
        doc.setFont('helvetica', 'bold');
        posLines.forEach((line: string, lIdx: number) => {
          doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
        });
        doc.setFont('helvetica', 'normal');
        rX += posWidth;

        // Name (Wrapped)
        nameLines.forEach((line: string, lIdx: number) => {
          doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
        });
        rX += nameWidth;

        // Unit
        const unitW = isUsdModeActive ? 36 : 40;
        doc.text(row.unit || 'Month', rX + (unitW / 2), y + textYOffset, { align: 'center' });
        rX += unitW;

        // Unit Price (ETB)
        const rateEtbW = isUsdModeActive ? 75 : 85;
        doc.text(fmt(row.effectiveRate || row.rate), rX + rateEtbW - 2, y + textYOffset, { align: 'right' });
        rX += rateEtbW;

        // Unit Price (USD) if USD active
        if (isUsdModeActive) {
          const rateUsdW = 65;
          doc.text(row.rateUsd ? `$${fmt(row.rateUsd)}` : '$0.00', rX + rateUsdW - 2, y + textYOffset, { align: 'right' });
          rX += rateUsdW;
        }

        // Contract MM
        const contrMmW = isUsdModeActive ? 50 : 55;
        doc.text(row.contractQty.toFixed(2), rX + contrMmW - 2, y + textYOffset, { align: 'right' });
        rX += contrMmW;

        // Preceding MM
        const precMmW = isUsdModeActive ? 55 : 60;
        doc.text(row.precedingQty.toFixed(2), rX + precMmW - 2, y + textYOffset, { align: 'right' });
        rX += precMmW;

        // This Month MM
        const thisMmW = isUsdModeActive ? 55 : 60;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(row.thisInvoiceQty.toFixed(2), rX + thisMmW - 2, y + textYOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        rX += thisMmW;

        // To-Date MM
        const toDateMmW = isUsdModeActive ? 55 : 60;
        doc.setFont('helvetica', 'bold');
        doc.text(row.toDateQty.toFixed(2), rX + toDateMmW - 2, y + textYOffset, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // Table 1 Totals Row
      const totalsBoxH = isCompactPdfMode ? 14 : 16;
      doc.setFillColor(238, 242, 255);
      doc.rect(margin + 6, y, contentWidth - 12, totalsBoxH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("TOTAL SUPERVISORY PERSONNEL MAN-MONTH ALLOCATION:", margin + 14, y + (totalsBoxH * 0.65));

      const totContrMM = displayFeeRowsComputed.reduce((s, r) => s + r.contractQty, 0).toFixed(2);
      const totPrecedingMM = displayFeeRowsComputed.reduce((s, r) => s + r.precedingQty, 0).toFixed(2);
      const totThisMonthMM = displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceQty, 0).toFixed(2);
      const totToDateMMVal = displayFeeRowsComputed.reduce((s, r) => s + r.toDateQty, 0).toFixed(2);

      let t1X = margin + 8 + (isUsdModeActive ? 24 + 175 + 160 + 36 + 75 + 65 : 26 + 195 + 175 + 40 + 85);
      const contrTotW = isUsdModeActive ? 50 : 55;
      const precTotW = isUsdModeActive ? 55 : 60;
      const thisTotW = isUsdModeActive ? 55 : 60;
      const toDateTotW = isUsdModeActive ? 55 : 60;

      doc.text(`${totContrMM} MM`, t1X + contrTotW - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t1X += contrTotW;
      doc.text(`${totPrecedingMM} MM`, t1X + precTotW - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t1X += precTotW;
      doc.text(`${totThisMonthMM} MM`, t1X + thisTotW - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t1X += thisTotW;
      doc.text(`${totToDateMMVal} MM`, t1X + toDateTotW - 2, y + (totalsBoxH * 0.65), { align: 'right' });

      // =========================================================================
      // PAGE 2: TABLE 2 — CONSTRUCTION SUPERVISORY STAFF FEES CALCULATION
      // =========================================================================
      doc.addPage();
      drawPageHeader(2, "Table 2: Construction Supervisory Staff Fees Calculation");
      y = margin + 52;

      // Table 2 Notice Box
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(margin + 6, y, contentWidth - 12, boxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6.5 : 7);
      doc.setTextColor(6, 95, 70);
      doc.text("Construction Staff Fees Remuneration Schedule (Sub-Total 1):", margin + 14, y + (boxH * 0.65));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        isUsdModeActive
          ? "Fee Computation = Billed MM × Contract Rates (ETB & USD) • Preceding, This Month & To-Date Complete Remuneration"
          : "Fee Computation = Billed Man-Months (Table 1) × Contract Unit Price • Preceding & To-Date Remuneration History",
        margin + 230,
        y + (boxH * 0.65)
      );

      y += boxH + (isCompactPdfMode ? 4 : 6);

      // Table 2 Headers: Include USD columns when isUsdModeActive is true
      const t2Headers = isUsdModeActive ? [
        { title: 'Item', width: 18, align: 'center' },
        { title: 'Supervisory Staff Position & Name', width: 130, align: 'left' },
        { title: 'Unit', width: 24, align: 'center' },
        { title: 'Rate (ETB)', width: 48, align: 'right' },
        { title: 'Rate (USD)', width: 42, align: 'right' },
        { title: 'Contr. MM', width: 32, align: 'right' },
        { title: 'Contr. (ETB)', width: 52, align: 'right' },
        { title: 'Contr. (USD)', width: 42, align: 'right' },
        { title: 'Prec. MM', width: 32, align: 'right' },
        { title: 'Prec. (ETB)', width: 50, align: 'right' },
        { title: 'Prec. (USD)', width: 42, align: 'right' },
        { title: 'This MM', width: 32, align: 'right' },
        { title: 'This (ETB)', width: 50, align: 'right' },
        { title: 'This (USD)', width: 42, align: 'right' },
        { title: 'To-Date MM', width: 32, align: 'right' },
        { title: 'To-Date (ETB)', width: 52, align: 'right' },
        { title: 'To-Date (USD)', width: 44, align: 'right' }
      ] : [
        { title: 'Item', width: 22, align: 'center' },
        { title: 'Supervisory Staff Position & Name', width: 165, align: 'left' },
        { title: 'Unit', width: 34, align: 'center' },
        { title: 'Unit Price (ETB)', width: 68, align: 'right' },
        { title: 'Contr. MM', width: 44, align: 'right' },
        { title: 'Contract Amt (ETB)', width: 75, align: 'right' },
        { title: 'Prec. MM', width: 42, align: 'right' },
        { title: 'Prec. Amt (ETB)', width: 70, align: 'right' },
        { title: 'This MM', width: 42, align: 'right' },
        { title: 'This Fee (ETB)', width: 75, align: 'right' },
        { title: 'To-Date MM', width: 42, align: 'right' },
        { title: 'To-Date Amt (ETB)', width: 75, align: 'right' }
      ];

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let t2CurX = margin + 8;
      t2Headers.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, t2CurX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, t2CurX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, t2CurX + 2, y + (headerBoxH * 0.65));
        }
        t2CurX += h.width;
      });

      y += headerBoxH + 2;

      // Table 2 Rows
      displayFeeRowsComputed.forEach((row, idx) => {
        if (y > pageHeight - margin - 35) return;

        const staffLabel = row.name && row.name !== 'To be nominated'
          ? `${row.position} — ${row.name}`
          : row.position;
        const nameColW = isUsdModeActive ? 130 : 165;
        const staffLines = doc.splitTextToSize(staffLabel, nameColW - 4);
        const rowH = Math.max(staffLines.length * lineStep + (isCompactPdfMode ? 2 : 4), minRowH);

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSizeData);
        doc.setTextColor(30, 41, 59);

        let rX = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        if (isUsdModeActive) {
          // Item No (18)
          doc.text(String(idx + 1), rX + 9, y + textYOffset, { align: 'center' });
          rX += 18;

          // Position & Name (130)
          doc.setFont('helvetica', 'bold');
          staffLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 130;

          // Unit (24)
          doc.text(row.unit || 'Month', rX + 12, y + textYOffset, { align: 'center' });
          rX += 24;

          // Rate ETB (48)
          doc.text(fmt(row.effectiveRate || row.rate), rX + 48 - 2, y + textYOffset, { align: 'right' });
          rX += 48;

          // Rate USD (42)
          doc.text(row.rateUsd ? `$${fmt(row.rateUsd)}` : '$0.00', rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Contract MM (32)
          doc.text(row.contractQty.toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Contract Amt ETB (52)
          doc.text(fmt(row.contractAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          rX += 52;

          // Contract Amt USD (42)
          doc.text(`$${fmt(row.contractAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Preceding MM (32)
          doc.text(row.precedingQty.toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Preceding Amt ETB (50)
          doc.text(fmt(row.precedingAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          rX += 50;

          // Preceding Amt USD (42)
          doc.text(`$${fmt(row.precedingAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // This MM (32)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(row.thisInvoiceQty.toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 32;

          // This Fee ETB (50)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.thisInvoiceAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 50;

          // This Fee USD (42)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.thisInvoiceAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 42;

          // To-Date MM (32)
          doc.text(row.toDateQty.toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // To-Date Amt ETB (52)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 52;

          // To-Date Amt USD (44)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.toDateAmountUsd || 0)}`, rX + 44 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
        } else {
          // Item No
          doc.text(String(idx + 1), rX + 11, y + textYOffset, { align: 'center' });
          rX += 22;

          // Position & Name
          doc.setFont('helvetica', 'bold');
          staffLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 165;

          // Unit
          doc.text(row.unit || 'Month', rX + 17, y + textYOffset, { align: 'center' });
          rX += 34;

          // Unit Price (ETB)
          doc.text(fmt(row.effectiveRate || row.rate), rX + 68 - 2, y + textYOffset, { align: 'right' });
          rX += 68;

          // Contract MM
          doc.text(row.contractQty.toFixed(2), rX + 44 - 2, y + textYOffset, { align: 'right' });
          rX += 44;

          // Contract Amount
          doc.text(fmt(row.contractAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          rX += 75;

          // Preceding MM
          doc.text(row.precedingQty.toFixed(2), rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Preceding Amount
          doc.text(fmt(row.precedingAmount), rX + 70 - 2, y + textYOffset, { align: 'right' });
          rX += 70;

          // This MM
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(row.thisInvoiceQty.toFixed(2), rX + 42 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 42;

          // This Fee
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.thisInvoiceAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 75;

          // To-Date MM
          doc.text(row.toDateQty.toFixed(2), rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // To-Date Amount
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // Table 2 Totals Row
      doc.setFillColor(238, 242, 255);
      doc.rect(margin + 6, y, contentWidth - 12, totalsBoxH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("TOTAL SUB-TOTAL 1 (CONSTRUCTION SUPERVISORY STAFF FEES CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      const totContrAmtT2 = displayFeeRowsComputed.reduce((s, r) => s + r.contractAmount, 0);

      if (isUsdModeActive) {
        let t2TotX = margin + 8 + 18 + 130 + 24 + 48 + 42;
        // Contr. MM
        doc.text(`${totContrMM}`, t2TotX + 32 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 32;
        // Contr. ETB
        doc.text(`${fmt(totContrAmtT2)}`, t2TotX + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 52;
        // Contr. USD
        doc.text(`$${fmt(subTotal1ContractUsd)}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        // Prec. MM
        doc.text(`${totPrecedingMM}`, t2TotX + 32 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 32;
        // Prec. ETB
        doc.text(`${fmt(subTotal1Preceding)}`, t2TotX + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 50;
        // Prec. USD
        doc.text(`$${fmt(subTotal1PrecedingUsd)}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        // This MM
        doc.text(`${totThisMonthMM}`, t2TotX + 32 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 32;
        // This ETB
        doc.text(`${fmt(subTotal1ThisInvoice)}`, t2TotX + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 50;
        // This USD
        doc.text(`$${fmt(subTotal1ThisInvoiceUsd)}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        // ToDate MM
        doc.text(`${totToDateMMVal}`, t2TotX + 32 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 32;
        // ToDate ETB
        doc.text(`${fmt(subTotal1ToDate)}`, t2TotX + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 52;
        // ToDate USD
        doc.text(`$${fmt(subTotal1ToDateUsd)}`, t2TotX + 44 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      } else {
        let t2TotX = margin + 8 + 22 + 165 + 34 + 68;
        doc.text(`${totContrMM}`, t2TotX + 44 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 44;
        doc.text(`${fmt(totContrAmtT2)}`, t2TotX + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 75;
        doc.text(`${totPrecedingMM}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        doc.text(`${fmt(subTotal1Preceding)}`, t2TotX + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 70;
        doc.text(`${totThisMonthMM}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        doc.text(`${fmt(subTotal1ThisInvoice)} ETB`, t2TotX + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 75;
        doc.text(`${totToDateMMVal}`, t2TotX + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2TotX += 42;
        doc.text(`${fmt(subTotal1ToDate)} ETB`, t2TotX + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      }

      // =========================================================================
      // PAGE 3: SUB TOTAL 2 — REIMBURSABLE DIRECT OPERATING EXPENSES SCHEDULE
      // =========================================================================
      doc.addPage();
      drawPageHeader(3, "Sub Total 2: Reimbursable Direct Operating Expenses Schedule");
      y = margin + 52;

      // Table B Reimbursable Headers: Include USD columns when isUsdModeActive is true
      const reimbHeaders = isUsdModeActive ? [
        { title: 'Item', width: 20, align: 'center' },
        { title: 'Description of Direct Expenses', width: 140, align: 'left' },
        { title: 'Unit', width: 26, align: 'center' },
        { title: 'Rate (ETB)', width: 48, align: 'right' },
        { title: 'Rate (USD)', width: 42, align: 'right' },
        { title: 'Contr. Qty', width: 32, align: 'right' },
        { title: 'Contr. (ETB)', width: 52, align: 'right' },
        { title: 'Contr. (USD)', width: 42, align: 'right' },
        { title: 'Prec. Qty', width: 32, align: 'right' },
        { title: 'Prec. (ETB)', width: 50, align: 'right' },
        { title: 'Prec. (USD)', width: 42, align: 'right' },
        { title: 'This Qty', width: 32, align: 'right' },
        { title: 'This (ETB)', width: 50, align: 'right' },
        { title: 'This (USD)', width: 42, align: 'right' },
        { title: 'To-Date Qty', width: 32, align: 'right' },
        { title: 'To-Date (ETB)', width: 52, align: 'right' },
        { title: 'To-Date (USD)', width: 44, align: 'right' }
      ] : [
        { title: 'Item', width: 24, align: 'center' },
        { title: 'Description of Direct Expenses', width: 180, align: 'left' },
        { title: 'Unit', width: 36, align: 'center' },
        { title: 'Unit Price (ETB)', width: 65, align: 'right' },
        { title: 'Contract Qty', width: 40, align: 'right' },
        { title: 'Contract Amt (ETB)', width: 75, align: 'right' },
        { title: 'Preceding Qty', width: 40, align: 'right' },
        { title: 'Preceding Amt (ETB)', width: 70, align: 'right' },
        { title: 'This Qty', width: 45, align: 'right' },
        { title: 'This Amt (ETB)', width: 75, align: 'right' },
        { title: 'To-Date Qty', width: 36, align: 'right' },
        { title: 'To-Date Amt (ETB)', width: 70, align: 'right' }
      ];

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let t2cX = margin + 8;
      reimbHeaders.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, t2cX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, t2cX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, t2cX + 2, y + (headerBoxH * 0.65));
        }
        t2cX += h.width;
      });

      y += headerBoxH + 2;

      reimbursableRowsComputed.forEach((row, idx) => {
        if (y > pageHeight - margin - 35) return;

        const descColW = isUsdModeActive ? 140 : 180;
        const descLines = doc.splitTextToSize(row.description || '', descColW - 4);
        const rowH = Math.max(descLines.length * lineStep + (isCompactPdfMode ? 2 : 4), minRowH);

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSizeData);
        doc.setTextColor(30, 41, 59);

        let rX = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        if (isUsdModeActive) {
          // Item No (20)
          doc.text(String(row.no || (idx + 1)), rX + 10, y + textYOffset, { align: 'center' });
          rX += 20;

          // Description (140)
          doc.setFont('helvetica', 'bold');
          descLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 140;

          // Unit (26)
          doc.text(row.unit || 'Month', rX + 13, y + textYOffset, { align: 'center' });
          rX += 26;

          // Rate ETB (48)
          doc.text(fmt(row.effectiveRate || row.rate), rX + 48 - 2, y + textYOffset, { align: 'right' });
          rX += 48;

          // Rate USD (42)
          doc.text(row.rateUsd ? `$${fmt(row.rateUsd)}` : '$0.00', rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Contr Qty (32)
          doc.text(String(row.contractQty || 0), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Contr Amt ETB (52)
          doc.text(fmt(row.contractAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          rX += 52;

          // Contr Amt USD (42)
          doc.text(`$${fmt(row.contractAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Preceding Qty (32)
          doc.text((row.precedingQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Preceding Amt ETB (50)
          doc.text(fmt(row.precedingAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          rX += 50;

          // Preceding Amt USD (42)
          doc.text(`$${fmt(row.precedingAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // This Qty (32)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text((row.thisInvoiceQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 32;

          // This Amt ETB (50)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.computedThisAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 50;

          // This Amt USD (42)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.thisInvoiceAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 42;

          // To-Date Qty (32)
          doc.text((row.toDateQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // To-Date Amt ETB (52)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 52;

          // To-Date Amt USD (44)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.toDateAmountUsd || 0)}`, rX + 44 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
        } else {
          // Item No
          doc.text(String(row.no || (idx + 1)), rX + 12, y + textYOffset, { align: 'center' });
          rX += 24;

          // Description (Wrapped)
          doc.setFont('helvetica', 'bold');
          descLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 180;

          // Unit
          doc.text(row.unit || 'Month', rX + 18, y + textYOffset, { align: 'center' });
          rX += 36;

          // Contract Rate
          doc.text(fmt(row.effectiveRate || row.rate), rX + 65 - 2, y + textYOffset, { align: 'right' });
          rX += 65;

          // Contract Qty
          doc.text(String(row.contractQty || 0), rX + 40 - 2, y + textYOffset, { align: 'right' });
          rX += 40;

          // Contract Amount
          doc.text(fmt(row.contractAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          rX += 75;

          // Preceding Qty
          doc.text((row.precedingQty || 0).toFixed(2), rX + 40 - 2, y + textYOffset, { align: 'right' });
          rX += 40;

          // Preceding Amount
          doc.text(fmt(row.precedingAmount), rX + 70 - 2, y + textYOffset, { align: 'right' });
          rX += 70;

          // This Invoice Qty
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text((row.thisInvoiceQty || 0).toFixed(2), rX + 45 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 45;

          // This Invoice Amount
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.computedThisAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 75;

          // To-Date Qty
          doc.text((row.toDateQty || 0).toFixed(2), rX + 36 - 2, y + textYOffset, { align: 'right' });
          rX += 36;

          // To-Date Amount
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 70 - 2, y + textYOffset, { align: 'right' });
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // Table 2 Totals Row (Sub Total 2)
      doc.setFillColor(238, 242, 255);
      doc.rect(margin + 6, y, contentWidth - 12, totalsBoxH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("SUB TOTAL 2 (REIMBURSABLE DIRECT OPERATING EXPENSES CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      if (isUsdModeActive) {
        let t2x = margin + 8 + 20 + 140 + 26 + 48 + 42 + 32;
        // Contr ETB
        doc.text(`${fmt(subTotal2Contract)}`, t2x + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 52;
        // Contr USD
        doc.text(`$${fmt(subTotal2ContractUsd)}`, t2x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 42 + 32;
        // Prec ETB
        doc.text(fmt(subTotal2Preceding), t2x + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 50;
        // Prec USD
        doc.text(`$${fmt(subTotal2PrecedingUsd)}`, t2x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 42 + 32;
        // This ETB
        doc.text(`${fmt(subTotal2ThisInvoice)}`, t2x + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 50;
        // This USD
        doc.text(`$${fmt(subTotal2ThisInvoiceUsd)}`, t2x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 42 + 32;
        // ToDate ETB
        doc.text(fmt(subTotal2ToDate), t2x + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 52;
        // ToDate USD
        doc.text(`$${fmt(subTotal2ToDateUsd)}`, t2x + 44 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      } else {
        let t2x = margin + 8 + 24 + 180 + 36 + 65 + 40;
        doc.text(`${fmt(subTotal2Contract)} ETB`, t2x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 75 + 40;
        doc.text(fmt(subTotal2Preceding), t2x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 70 + 45;
        doc.text(`${fmt(subTotal2ThisInvoice)} ETB`, t2x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t2x += 75 + 36;
        doc.text(fmt(subTotal2ToDate), t2x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      }

      // =========================================================================
      // PAGE 4: SUB TOTAL 3 — DEFECT LIABILITY PERIOD STAFF REMUNERATION SCHEDULE
      // =========================================================================
      doc.addPage();
      drawPageHeader(4, "Sub Total 3: Defect Liability Period Staff Remuneration Schedule");
      y = margin + 52;

      // Table 3 Headers: Include USD columns when isUsdModeActive is true
      const t3Headers = isUsdModeActive ? [
        { title: 'Item', width: 20, align: 'center' },
        { title: 'Defect Liability Supervisory Position & Staff', width: 140, align: 'left' },
        { title: 'Unit', width: 26, align: 'center' },
        { title: 'Rate (ETB)', width: 48, align: 'right' },
        { title: 'Rate (USD)', width: 42, align: 'right' },
        { title: 'Contr. MM', width: 32, align: 'right' },
        { title: 'Contr. (ETB)', width: 52, align: 'right' },
        { title: 'Contr. (USD)', width: 42, align: 'right' },
        { title: 'Prec. MM', width: 32, align: 'right' },
        { title: 'Prec. (ETB)', width: 50, align: 'right' },
        { title: 'Prec. (USD)', width: 42, align: 'right' },
        { title: 'This MM', width: 32, align: 'right' },
        { title: 'This (ETB)', width: 50, align: 'right' },
        { title: 'This (USD)', width: 42, align: 'right' },
        { title: 'To-Date MM', width: 32, align: 'right' },
        { title: 'To-Date (ETB)', width: 52, align: 'right' },
        { title: 'To-Date (USD)', width: 44, align: 'right' }
      ] : [
        { title: 'Item', width: 24, align: 'center' },
        { title: 'Defect Liability Supervisory Position & Staff', width: 180, align: 'left' },
        { title: 'Unit', width: 36, align: 'center' },
        { title: 'Unit Price (ETB)', width: 65, align: 'right' },
        { title: 'Contract Qty', width: 40, align: 'right' },
        { title: 'Contract Amt (ETB)', width: 75, align: 'right' },
        { title: 'Preceding Qty', width: 40, align: 'right' },
        { title: 'Preceding Amt (ETB)', width: 70, align: 'right' },
        { title: 'This Qty', width: 45, align: 'right' },
        { title: 'This Amt (ETB)', width: 75, align: 'right' },
        { title: 'To-Date Qty', width: 36, align: 'right' },
        { title: 'To-Date Amt (ETB)', width: 70, align: 'right' }
      ];

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let t3cX = margin + 8;
      t3Headers.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, t3cX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, t3cX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, t3cX + 2, y + (headerBoxH * 0.65));
        }
        t3cX += h.width;
      });

      y += headerBoxH + 2;

      defectRowsComputed.forEach((row, idx) => {
        if (y > pageHeight - margin - 35) return;

        const posColW = isUsdModeActive ? 140 : 180;
        const posLines = doc.splitTextToSize(row.position || '', posColW - 4);
        const rowH = Math.max(posLines.length * lineStep + (isCompactPdfMode ? 2 : 4), minRowH);

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSizeData);
        doc.setTextColor(30, 41, 59);

        let rX = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        if (isUsdModeActive) {
          // Item No (20)
          doc.text(String(idx + 1), rX + 10, y + textYOffset, { align: 'center' });
          rX += 20;

          // Position (140)
          doc.setFont('helvetica', 'bold');
          posLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 140;

          // Unit (26)
          doc.text(row.unit || 'Month', rX + 13, y + textYOffset, { align: 'center' });
          rX += 26;

          // Rate ETB (48)
          doc.text(fmt(row.rate), rX + 48 - 2, y + textYOffset, { align: 'right' });
          rX += 48;

          // Rate USD (42)
          doc.text(row.rateUsd ? `$${fmt(row.rateUsd)}` : '$0.00', rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Contr Qty (32)
          doc.text(String(row.contractQty || 0), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Contr Amt ETB (52)
          doc.text(fmt(row.contractAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          rX += 52;

          // Contr Amt USD (42)
          doc.text(`$${fmt(row.contractAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // Preceding Qty (32)
          doc.text((row.precedingQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // Preceding Amt ETB (50)
          doc.text(fmt(row.precedingAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          rX += 50;

          // Preceding Amt USD (42)
          doc.text(`$${fmt(row.precedingAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          rX += 42;

          // This Qty (32)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text((row.thisInvoiceQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 32;

          // This Amt ETB (50)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.computedThisAmount), rX + 50 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 50;

          // This Amt USD (42)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.thisInvoiceAmountUsd || 0)}`, rX + 42 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 42;

          // To-Date Qty (32)
          doc.text((row.toDateQty || 0).toFixed(2), rX + 32 - 2, y + textYOffset, { align: 'right' });
          rX += 32;

          // To-Date Amt ETB (52)
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 52 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 52;

          // To-Date Amt USD (44)
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(109, 40, 217);
          doc.text(`$${fmt(row.toDateAmountUsd || 0)}`, rX + 44 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
        } else {
          // Item No
          doc.text(String(idx + 1), rX + 12, y + textYOffset, { align: 'center' });
          rX += 24;

          // Position (Wrapped)
          doc.setFont('helvetica', 'bold');
          posLines.forEach((line: string, lIdx: number) => {
            doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
          });
          doc.setFont('helvetica', 'normal');
          rX += 180;

          // Unit
          doc.text(row.unit || 'Month', rX + 18, y + textYOffset, { align: 'center' });
          rX += 36;

          // Contract Rate
          doc.text(fmt(row.rate), rX + 65 - 2, y + textYOffset, { align: 'right' });
          rX += 65;

          // Contract Qty
          doc.text(String(row.contractQty || 0), rX + 40 - 2, y + textYOffset, { align: 'right' });
          rX += 40;

          // Contract Amount
          doc.text(fmt(row.contractAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          rX += 75;

          // Preceding Qty
          doc.text((row.precedingQty || 0).toFixed(2), rX + 40 - 2, y + textYOffset, { align: 'right' });
          rX += 40;

          // Preceding Amount
          doc.text(fmt(row.precedingAmount), rX + 70 - 2, y + textYOffset, { align: 'right' });
          rX += 70;

          // This Invoice Qty
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text((row.thisInvoiceQty || 0).toFixed(2), rX + 45 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          rX += 45;

          // This Invoice Amount
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.computedThisAmount), rX + 75 - 2, y + textYOffset, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          rX += 75;

          // To-Date Qty
          doc.text((row.toDateQty || 0).toFixed(2), rX + 36 - 2, y + textYOffset, { align: 'right' });
          rX += 36;

          // To-Date Amount
          doc.setFont('helvetica', 'bold');
          doc.text(fmt(row.toDateAmount), rX + 70 - 2, y + textYOffset, { align: 'right' });
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // Table 3 Totals Row (Sub Total 3)
      doc.setFillColor(238, 242, 255);
      doc.rect(margin + 6, y, contentWidth - 12, totalsBoxH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("SUB TOTAL 3 (DEFECT LIABILITY PERSONNEL ALLOCATION CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      if (isUsdModeActive) {
        let t3x = margin + 8 + 20 + 140 + 26 + 48 + 42 + 32;
        // Contr ETB
        doc.text(`${fmt(subTotal3Contract)}`, t3x + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 52;
        // Contr USD
        doc.text(`$${fmt(subTotal3ContractUsd)}`, t3x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 42 + 32;
        // Prec ETB
        doc.text(fmt(subTotal3Preceding), t3x + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 50;
        // Prec USD
        doc.text(`$${fmt(subTotal3PrecedingUsd)}`, t3x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 42 + 32;
        // This ETB
        doc.text(`${fmt(subTotal3ThisInvoice)}`, t3x + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 50;
        // This USD
        doc.text(`$${fmt(subTotal3ThisInvoiceUsd)}`, t3x + 42 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 42 + 32;
        // ToDate ETB
        doc.text(fmt(subTotal3ToDate), t3x + 52 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 52;
        // ToDate USD
        doc.text(`$${fmt(subTotal3ToDateUsd)}`, t3x + 44 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      } else {
        let t3x = margin + 8 + 24 + 180 + 36 + 65 + 40;
        doc.text(`${fmt(subTotal3Contract)} ETB`, t3x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 75 + 40;
        doc.text(fmt(subTotal3Preceding), t3x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 70 + 45;
        doc.text(`${fmt(subTotal3ThisInvoice)} ETB`, t3x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
        t3x += 75 + 36;
        doc.text(fmt(subTotal3ToDate), t3x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      }

      // =========================================================================
      // PAGE 5: TABLE 3 — SUMMARY OF TOTAL FEES
      // =========================================================================
      doc.addPage();
      drawPageHeader(5, "Table 3: Summary of Total Fees");
      y = margin + 52;

      // Notice box
      doc.setFillColor(254, 243, 199); // amber-50
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(margin + 6, y, contentWidth - 12, boxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6.5 : 7);
      doc.setTextColor(180, 83, 9);
      doc.text("Summary of Total Fees & Aggregated Master Schedule:", margin + 14, y + (boxH * 0.65));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("Aggregated Master Summary for Construction Supervision Fees, Reimbursable Expenses & Total Invoice Claim", margin + 220, y + (boxH * 0.65));

      y += boxH + (isCompactPdfMode ? 4 : 6);

      const t3SummaryHeaders = isUsdModeActive ? [
        { title: 'Item', width: 30, align: 'center' },
        { title: 'Fee Component Description', width: 220, align: 'left' },
        { title: 'Contract (ETB / USD)', width: 120, align: 'right' },
        { title: 'Preceding (ETB / USD)', width: 120, align: 'right' },
        { title: 'This Month (ETB / USD)', width: 120, align: 'right' },
        { title: 'To-Date (ETB / USD)', width: 129, align: 'right' }
      ] : [
        { title: 'Item', width: 40, align: 'center' },
        { title: 'Fee Component Description', width: 280, align: 'left' },
        { title: 'Contract Amount (ETB)', width: 145, align: 'right' },
        { title: 'Preceding Claim (ETB)', width: 145, align: 'right' },
        { title: 'This Month Claim (ETB)', width: 145, align: 'right' },
        { title: 'To-Date Claim (ETB)', width: 144, align: 'right' }
      ];

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let t3SumX = margin + 8;
      t3SummaryHeaders.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, t3SumX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, t3SumX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, t3SumX + 2, y + (headerBoxH * 0.65));
        }
        t3SumX += h.width;
      });

      y += headerBoxH + 2;

      const summaryRows = [
        {
          no: '1',
          desc: 'Construction Supervision Fees (Sub Total 1)',
          contract: isUsdModeActive ? `${fmt(subTotal1Contract)}\n($${fmt(subTotal1ContractUsd)})` : fmt(subTotal1Contract),
          preceding: isUsdModeActive ? `${fmt(subTotal1Preceding)}\n($${fmt(subTotal1PrecedingUsd)})` : fmt(subTotal1Preceding),
          thisMonth: isUsdModeActive ? `${fmt(subTotal1ThisInvoice)}\n($${fmt(subTotal1ThisInvoiceUsd)})` : fmt(subTotal1ThisInvoice),
          toDate: isUsdModeActive ? `${fmt(subTotal1ToDate)}\n($${fmt(subTotal1ToDateUsd)})` : fmt(subTotal1ToDate)
        },
        {
          no: '2',
          desc: 'Reimbursable Expenses (Sub Total 2)',
          contract: isUsdModeActive ? `${fmt(linkedReimbContract)}\n($${fmt(linkedReimbContractUsd)})` : fmt(linkedReimbContract),
          preceding: isUsdModeActive ? `${fmt(subTotal2Preceding)}\n($${fmt(subTotal2PrecedingUsd)})` : fmt(subTotal2Preceding),
          thisMonth: isUsdModeActive ? `${fmt(subTotal2ThisInvoice)}\n($${fmt(subTotal2ThisInvoiceUsd)})` : fmt(subTotal2ThisInvoice),
          toDate: isUsdModeActive ? `${fmt(subTotal2ToDate)}\n($${fmt(subTotal2ToDateUsd)})` : fmt(subTotal2ToDate)
        },
        {
          no: '3',
          desc: 'Defect Liability Period Personnel (Sub Total 3)',
          contract: isUsdModeActive ? `${fmt(subTotal3Contract)}\n($${fmt(subTotal3ContractUsd)})` : fmt(subTotal3Contract),
          preceding: isUsdModeActive ? `${fmt(subTotal3Preceding)}\n($${fmt(subTotal3PrecedingUsd)})` : fmt(subTotal3Preceding),
          thisMonth: isUsdModeActive ? `${fmt(subTotal3ThisInvoice)}\n($${fmt(subTotal3ThisInvoiceUsd)})` : fmt(subTotal3ThisInvoice),
          toDate: isUsdModeActive ? `${fmt(subTotal3ToDate)}\n($${fmt(subTotal3ToDateUsd)})` : fmt(subTotal3ToDate)
        },
        {
          no: 'TOTAL',
          desc: 'TOTAL INVOICE AMOUNT (AGGREGATED FEES & DIRECT EXPENSES)',
          contract: isUsdModeActive ? `${fmt(totalBaseContract)}\n($${fmt(totalBaseContractUsd)})` : fmt(totalBaseContract),
          preceding: isUsdModeActive ? `${fmt(totalSubtotalPreceding)}\n($${fmt(totalSubtotalPrecedingUsd)})` : fmt(totalSubtotalPreceding),
          thisMonth: isUsdModeActive ? `${fmt(totalSubtotalThisInvoice)}\n($${fmt(totalSubtotalThisInvoiceUsd)})` : fmt(totalSubtotalThisInvoice),
          toDate: isUsdModeActive ? `${fmt(totalSubtotalToDate)}\n($${fmt(totalSubtotalToDateUsd)})` : fmt(totalSubtotalToDate),
          isBold: true
        }
      ];

      summaryRows.forEach((sRow, idx) => {
        const rowH = minRowH * (isUsdModeActive ? 1.6 : 1.2);
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
        }
        if (sRow.isBold) {
          doc.setFillColor(238, 242, 255);
          doc.rect(margin + 6, y, contentWidth - 12, rowH, 'F');
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(fontSizeData);
        doc.setTextColor(30, 41, 59);

        let rx = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        // Item
        doc.text(sRow.no, rx + (isUsdModeActive ? 15 : 20), y + textYOffset, { align: 'center' });
        rx += isUsdModeActive ? 30 : 40;

        // Desc
        doc.text(sRow.desc, rx + 2, y + textYOffset);
        rx += isUsdModeActive ? 220 : 280;

        // Contract
        doc.text(sRow.contract, rx + (isUsdModeActive ? 120 : 145) - 2, y + textYOffset, { align: 'right' });
        rx += isUsdModeActive ? 120 : 145;

        // Preceding
        doc.text(sRow.preceding, rx + (isUsdModeActive ? 120 : 145) - 2, y + textYOffset, { align: 'right' });
        rx += isUsdModeActive ? 120 : 145;

        // This Month
        doc.text(sRow.thisMonth, rx + (isUsdModeActive ? 120 : 145) - 2, y + textYOffset, { align: 'right' });
        rx += isUsdModeActive ? 120 : 145;

        // To-Date
        doc.text(sRow.toDate, rx + (isUsdModeActive ? 129 : 144) - 2, y + textYOffset, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // =========================================================================
      // PAGE 6: TABLE 5 — CONSOLIDATED SUMMARY & NET PAYMENT COMPUTATION
      // =========================================================================
      doc.addPage();
      drawPageHeader(6, "Table 5: Consolidated Summary & Net Payment Computation");
      y = margin + 52;

      // Table 5 Headers (Total width = 756 pt)
      const t5Headers = [
        { title: 'Item', width: 28, align: 'center' },
        { title: 'Claim Component Description', width: 220, align: 'left' },
        { title: `Contract Baseline (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 108, align: 'right' },
        { title: `Preceding Claim (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 95, align: 'right' },
        { title: `This Month (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 110, align: 'right' },
        { title: `To-Date Claim (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 100, align: 'right' },
        { title: `Remaining Balance (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 95, align: 'right' }
      ];

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 6, y, contentWidth - 12, headerBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizeHeader);
      doc.setTextColor(255, 255, 255);

      let cX = margin + 8;
      t5Headers.forEach(h => {
        if (h.align === 'right') {
          doc.text(h.title, cX + h.width - 2, y + (headerBoxH * 0.65), { align: 'right' });
        } else if (h.align === 'center') {
          doc.text(h.title, cX + h.width / 2, y + (headerBoxH * 0.65), { align: 'center' });
        } else {
          doc.text(h.title, cX + 2, y + (headerBoxH * 0.65));
        }
        cX += h.width;
      });

      y += headerBoxH + 2;

      const t5Rows = [
        {
          item: '1',
          desc: 'Sub Total 1 (Remuneration of Construction Supervisory Staff)',
          contract: isUsdModeActive && linkedFeesContractUsd > 0 ? `${fmt(linkedFeesContract)}\n($${fmt(linkedFeesContractUsd)})` : fmt(linkedFeesContract),
          thisMonth: isUsdModeActive && subTotal1ThisInvoiceUsd > 0 ? `${fmt(subTotal1ThisInvoice)}\n($${fmt(subTotal1ThisInvoiceUsd)})` : fmt(subTotal1ThisInvoice),
          preceding: isUsdModeActive && subTotal1PrecedingUsd > 0 ? `${fmt(subTotal1Preceding)}\n($${fmt(subTotal1PrecedingUsd)})` : fmt(subTotal1Preceding),
          toDate: isUsdModeActive && subTotal1ToDateUsd > 0 ? `${fmt(subTotal1ToDate)}\n($${fmt(subTotal1ToDateUsd)})` : fmt(subTotal1ToDate),
          remaining: isUsdModeActive && subTotal1RemainingUsd > 0 ? `${fmt(subTotal1Remaining)}\n($${fmt(subTotal1RemainingUsd)})` : fmt(subTotal1Remaining)
        },
        {
          item: '2',
          desc: 'Sub Total 2 (Reimbursable Operating Direct Costs — Per Diem, Transport, Communication)',
          contract: isUsdModeActive && linkedReimbContractUsd > 0 ? `${fmt(linkedReimbContract)}\n($${fmt(linkedReimbContractUsd)})` : fmt(linkedReimbContract),
          thisMonth: isUsdModeActive && subTotal2ThisInvoiceUsd > 0 ? `${fmt(subTotal2ThisInvoice)}\n($${fmt(subTotal2ThisInvoiceUsd)})` : fmt(subTotal2ThisInvoice),
          preceding: isUsdModeActive && subTotal2PrecedingUsd > 0 ? `${fmt(subTotal2Preceding)}\n($${fmt(subTotal2PrecedingUsd)})` : fmt(subTotal2Preceding),
          toDate: isUsdModeActive && subTotal2ToDateUsd > 0 ? `${fmt(subTotal2ToDate)}\n($${fmt(subTotal2ToDateUsd)})` : fmt(subTotal2ToDate),
          remaining: isUsdModeActive && subTotal2RemainingUsd > 0 ? `${fmt(subTotal2Remaining)}\n($${fmt(subTotal2RemainingUsd)})` : fmt(subTotal2Remaining)
        },
        {
          item: '3',
          desc: 'Sub Total 3 (Defect Liability Personnel Allocation)',
          contract: isUsdModeActive && subTotal3ContractUsd > 0 ? `${fmt(subTotal3Contract)}\n($${fmt(subTotal3ContractUsd)})` : fmt(subTotal3Contract),
          thisMonth: isUsdModeActive && subTotal3ThisInvoiceUsd > 0 ? `${fmt(subTotal3ThisInvoice)}\n($${fmt(subTotal3ThisInvoiceUsd)})` : fmt(subTotal3ThisInvoice),
          preceding: isUsdModeActive && subTotal3PrecedingUsd > 0 ? `${fmt(subTotal3Preceding)}\n($${fmt(subTotal3PrecedingUsd)})` : (subTotal3Preceding > 0 ? fmt(subTotal3Preceding) : '-'),
          toDate: isUsdModeActive && subTotal3ToDateUsd > 0 ? `${fmt(subTotal3ToDate)}\n($${fmt(subTotal3ToDateUsd)})` : fmt(subTotal3ToDate),
          remaining: isUsdModeActive && subTotal3RemainingUsd > 0 ? `${fmt(subTotal3Remaining)}\n($${fmt(subTotal3RemainingUsd)})` : fmt(subTotal3Remaining)
        },
        {
          item: 'A+B',
          desc: 'SUBTOTAL DIRECT SERVICES & EXPENSES (1 + 2 + 3)',
          contract: isUsdModeActive && totalBaseContractUsd > 0 ? `${fmt(totalBaseContract)}\n($${fmt(totalBaseContractUsd)})` : fmt(totalBaseContract),
          thisMonth: isUsdModeActive && totalSubtotalThisInvoiceUsd > 0 ? `${fmt(totalSubtotalThisInvoice)}\n($${fmt(totalSubtotalThisInvoiceUsd)})` : fmt(totalSubtotalThisInvoice),
          preceding: isUsdModeActive && totalSubtotalPrecedingUsd > 0 ? `${fmt(totalSubtotalPreceding)}\n($${fmt(totalSubtotalPrecedingUsd)})` : fmt(totalSubtotalPreceding),
          toDate: isUsdModeActive && totalSubtotalToDateUsd > 0 ? `${fmt(totalSubtotalToDate)}\n($${fmt(totalSubtotalToDateUsd)})` : fmt(totalSubtotalToDate),
          remaining: isUsdModeActive && totalSubtotalRemainingUsd > 0 ? `${fmt(Math.max(0, totalBaseContract - totalSubtotalToDate))}\n($${fmt(totalSubtotalRemainingUsd)})` : fmt(Math.max(0, totalBaseContract - totalSubtotalToDate)),
          isBold: true
        },
        {
          item: '4',
          desc: `Contingency Provision (${contingencyRatePct}% Contract Ceiling)`,
          contract: isUsdModeActive && contingencyContractUsd > 0 ? `${fmt(contingencyContract)}\n($${fmt(contingencyContractUsd)})` : fmt(contingencyContract),
          thisMonth: isUsdModeActive && contingencyThisInvoiceUsd > 0 ? `${fmt(contingencyThisInvoice)}\n($${fmt(contingencyThisInvoiceUsd)})` : fmt(contingencyThisInvoice),
          preceding: isUsdModeActive && contingencyPrecedingClaimUsd > 0 ? `${fmt(contingencyPrecedingClaim)}\n($${fmt(contingencyPrecedingClaimUsd)})` : fmt(contingencyPrecedingClaim),
          toDate: isUsdModeActive && contingencyToDateUsdValue > 0 ? `${fmt(contingencyToDate)}\n($${fmt(contingencyToDateUsdValue)})` : fmt(contingencyToDate),
          remaining: isUsdModeActive && contingencyRemainingUsd > 0 ? `${fmt(Math.max(0, contingencyContract - contingencyToDate))}\n($${fmt(contingencyRemainingUsd)})` : fmt(Math.max(0, contingencyContract - contingencyToDate))
        },
        {
          item: '5',
          desc: `Value Added Tax (${vatRatePct}% VAT)`,
          contract: isUsdModeActive && vatContractUsd > 0 ? `${fmt(vatContract)}\n($${fmt(vatContractUsd)})` : fmt(vatContract),
          thisMonth: isUsdModeActive && vatThisInvoiceUsd > 0 ? `${fmt(vatThisInvoice)}\n($${fmt(vatThisInvoiceUsd)})` : fmt(vatThisInvoice),
          preceding: isUsdModeActive && vatPrecedingUsd > 0 ? `${fmt(vatPreceding)}\n($${fmt(vatPrecedingUsd)})` : fmt(vatPreceding),
          toDate: isUsdModeActive && vatToDateUsd > 0 ? `${fmt(vatToDate)}\n($${fmt(vatToDateUsd)})` : fmt(vatToDate),
          remaining: isUsdModeActive && vatRemainingUsd > 0 ? `${fmt(Math.max(0, vatContract - vatToDate))}\n($${fmt(vatRemainingUsd)})` : fmt(Math.max(0, vatContract - vatToDate))
        },
        {
          item: '6',
          desc: 'GROSS INVOICE CLAIM AMOUNT (ETB)',
          contract: isUsdModeActive && totalContractDueUsd > 0 ? `${fmt(totalContractDue)}\n($${fmt(totalContractDueUsd)})` : fmt(totalContractDue),
          thisMonth: isUsdModeActive && grossPayableBaseUsd > 0 ? `${fmt(grossPayableBase)}\n($${fmt(grossPayableBaseUsd)})` : fmt(grossPayableBase),
          preceding: isUsdModeActive && grossPrecedingUsd > 0 ? `${fmt(grossPreceding)}\n($${fmt(grossPrecedingUsd)})` : fmt(grossPreceding),
          toDate: isUsdModeActive && grossToDateUsd > 0 ? `${fmt(grossToDate)}\n($${fmt(grossToDateUsd)})` : fmt(grossToDate),
          remaining: isUsdModeActive && grossRemainingUsd > 0 ? `${fmt(Math.max(0, totalContractDue - grossToDate))}\n($${fmt(grossRemainingUsd)})` : fmt(Math.max(0, totalContractDue - grossToDate)),
          isHeader: true
        },
        {
          item: '5a',
          desc: 'Add: Overtime Claim (ETB)',
          contract: '-',
          thisMonth: overtimeEtb > 0 ? fmt(overtimeEtb) : '0.00',
          preceding: '-',
          toDate: overtimeEtb > 0 ? fmt(overtimeEtb) : '0.00',
          remaining: '-'
        },
        {
          item: '7a',
          desc: 'Less: Advance Payment Recovery Deduction (ETB)',
          contract: '-',
          thisMonth: advanceDeductionEtb > 0 ? `-${fmt(advanceDeductionEtb)}` : '0.00',
          preceding: '-',
          toDate: advanceDeductionEtb > 0 ? `-${fmt(advanceDeductionEtb)}` : '0.00',
          remaining: '-'
        },
        {
          item: '7b',
          desc: 'Less: Withholding / Statutory Tax Deduction (2%)',
          contract: '-',
          thisMonth: taxDeductionEtb > 0 ? `-${fmt(taxDeductionEtb)}` : '0.00',
          preceding: '-',
          toDate: taxDeductionEtb > 0 ? `-${fmt(taxDeductionEtb)}` : '0.00',
          remaining: '-'
        },
        {
          item: '7c',
          desc: 'Less: Overtime Deduction from Contractor (ETB)',
          contract: '-',
          thisMonth: overtimeDeductionEtb > 0 ? `-${fmt(overtimeDeductionEtb)}` : '0.00',
          preceding: '-',
          toDate: overtimeDeductionEtb > 0 ? `-${fmt(overtimeDeductionEtb)}` : '0.00',
          remaining: '-'
        },
        {
          item: '8',
          desc: 'TOTAL NET AMOUNT PAYABLE TO CONSULTANT (ETB) — MINUS VAT',
          contract: fmt(contractNetAmount),
          thisMonth: `${fmt(netDueThisInvoice)} ETB`,
          preceding: fmt(netPreceding),
          toDate: `${fmt(netToDate)} ETB`,
          remaining: '-',
          isNetPayable: true
        }
      ];

      t5Rows.forEach((r, idx) => {
        const descLines = doc.splitTextToSize(r.desc, 220 - 4);
        const contractLines = r.contract.split('\n');
        const thisMonthLines = r.thisMonth.split('\n');
        const precedingLines = r.preceding.split('\n');
        const toDateLines = r.toDate.split('\n');
        const remainingLines = r.remaining.split('\n');
        const maxLines = Math.max(descLines.length, contractLines.length, thisMonthLines.length, precedingLines.length, toDateLines.length, remainingLines.length, 1);
        const rowHeight = Math.max(maxLines * lineStep + (isCompactPdfMode ? 2 : 4), r.isNetPayable ? (isCompactPdfMode ? 14 : 16) : (isCompactPdfMode ? 10.5 : 13));

        if (r.isNetPayable) {
          doc.setFillColor(209, 250, 229); // emerald-100
          doc.rect(margin + 6, y, contentWidth - 12, rowHeight, 'F');
        } else if (r.isHeader) {
          doc.setFillColor(241, 245, 249); // slate-100
          doc.rect(margin + 6, y, contentWidth - 12, rowHeight, 'F');
        } else if (r.isBold) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 6, y, contentWidth - 12, rowHeight, 'F');
        } else if (idx % 2 === 1) {
          doc.setFillColor(255, 255, 255);
        }

        doc.setFont('helvetica', (r.isNetPayable || r.isHeader || r.isBold) ? 'bold' : 'normal');
        doc.setFontSize(r.isNetPayable ? (isCompactPdfMode ? 7 : 7.5) : (isCompactPdfMode ? 6 : 6.5));
        doc.setTextColor(
          r.isNetPayable ? 6 : (r.isHeader ? 15 : 30),
          r.isNetPayable ? 95 : (r.isHeader ? 23 : 41),
          r.isNetPayable ? 70 : (r.isHeader ? 42 : 59)
        );

        let roX = margin + 8;
        const textYOffset = isCompactPdfMode ? 6.5 : 8;

        // Item
        doc.text(r.item, roX + 14, y + (rowHeight * 0.5) + 2, { align: 'center' });
        roX += 28;

        // Desc (Wrapped)
        descLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 2, y + textYOffset + (lIdx * lineStep));
        });
        roX += 220;

        // Contract Baseline
        contractLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 108 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });
        roX += 108;

        // Preceding
        precedingLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 95 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });
        roX += 95;

        // This Month
        if (r.isNetPayable) doc.setTextColor(5, 150, 105);
        thisMonthLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 110 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });
        if (r.isNetPayable) doc.setTextColor(6, 95, 70);
        roX += 110;

        // To-Date
        toDateLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 100 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });
        roX += 100;

        // Remaining
        remainingLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 95 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });

        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 6, y + rowHeight, margin + contentWidth - 6, y + rowHeight);
        y += rowHeight;
      });

      y += isCompactPdfMode ? 4 : 6;

      // Net Amount in Words Box
      const netDueThisInvoiceUsd = Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd);
      const etbWording = `"${numberToWordsCurrency(netDueThisInvoice, 'ETB')}"`;
      const usdWording = (isUsdModeActive && netDueThisInvoiceUsd > 0)
        ? `   •   USD Portion: "${numberToWordsCurrency(netDueThisInvoiceUsd, 'USD')}"`
        : '';
      const fullWordsText = `${etbWording}${usdWording}`;
      const wordsLines = doc.splitTextToSize(fullWordsText, contentWidth - 28);
      const wordsBoxH = Math.max(wordsLines.length * (isCompactPdfMode ? 7.5 : 8.5) + (isCompactPdfMode ? 8 : 12), isCompactPdfMode ? 18 : 22);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 6, y, contentWidth - 12, wordsBoxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        (isUsdModeActive && netDueThisInvoiceUsd > 0)
          ? "NET AMOUNT PAYABLE IN BIRR & US DOLLAR WORDS:"
          : "NET AMOUNT PAYABLE IN ETHIOPIAN BIRR WORDS:",
        margin + 14,
        y + (isCompactPdfMode ? 8 : 9)
      );
      doc.setFont('times', 'italic');
      doc.setFontSize(isCompactPdfMode ? 6.5 : 7.5);
      doc.setTextColor(15, 23, 42);
      wordsLines.forEach((line: string, lIdx: number) => {
        doc.text(line, margin + 14, y + (isCompactPdfMode ? 15 : 17) + (lIdx * (isCompactPdfMode ? 7.5 : 8.5)));
      });

      y += wordsBoxH + (isCompactPdfMode ? 3 : 4);

      // Bank Transfer Particulars Box
      const bankBoxH = isCompactPdfMode ? 15 : 18;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 6, y, contentWidth - 12, bankBoxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("CONSULTANT WIRE TRANSFER & BANK DETAILS:", margin + 14, y + (bankBoxH * 0.65));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Bank: ${bankName || 'Commercial Bank of Ethiopia'}   •   Branch: ${bankBranch || 'Main Branch'}   •   Account No: ${bankAccountNo || '1000123456789'}`, margin + 200, y + (bankBoxH * 0.65));

      y += bankBoxH + (isCompactPdfMode ? 3 : 4);

      // Official 5 Sign-Off Signatures Block
      const signW = (contentWidth - 12) / 5;
      const signY = y + (isCompactPdfMode ? 1 : 2);

      const signees = [
        { title: 'PREPARED BY', name: preparedBy || 'Resident Engineer', role: 'Resident Engineer / Team Leader' },
        { title: 'CHECKED BY', name: checkedBy || 'Payment Officer', role: 'Payment & Valuation Officer' },
        { title: 'REVIEWED BY', name: reviewedBy || 'Lead Engineer', role: 'Lead Supervision Engineer' },
        { title: 'RECOMMENDED BY', name: recommendedBy || 'Directorate Director', role: 'Supervision Directorate Director' },
        { title: 'CERTIFIED & APPROVED', name: approvedBy || 'Project Director', role: 'Director General / Project Director (ERA)' }
      ];

      signees.forEach((s, idx) => {
        const sX = margin + 6 + idx * signW;
        doc.setDrawColor(203, 213, 225);
        doc.line(sX + 6, signY + (isCompactPdfMode ? 16 : 20), sX + signW - 12, signY + (isCompactPdfMode ? 16 : 20));

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isCompactPdfMode ? 5.5 : 6);
        doc.setTextColor(100, 116, 139);
        doc.text(s.title, sX + 6, signY + 5);

        doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(s.name, sX + 6, signY + (isCompactPdfMode ? 23 : 28));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(s.role, sX + 6, signY + (isCompactPdfMode ? 29 : 35));
      });

      const cleanInv = invoiceNo.replace(/[^a-zA-Z0-9-_]/g, '_');
      doc.save(`Monthly_Invoice_${cleanInv}_${billingMonth}_${billingYear}${isCompactPdfMode ? '_Compact' : ''}.pdf`);
    } catch (err) {
      console.error("Failed to export Monthly Invoice PDF:", err);
      alert("Failed to export Monthly Invoice PDF. Please check browser permissions.");
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Historical Previous Month Invoice Lock Notice Banner */}
      {isPreviousInvoiceFrozen && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Previous Month Invoice Permanently Frozen</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold uppercase">Ledger Synchronized</span>
              </div>
              <div className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                Invoice <strong>{invoiceNo}</strong> ({billingMonth} {billingYear}) has been saved, synchronized with the financial ledger, and rolled forward to subsequent billing periods. In accordance with ERA contract administration regulations, no changes or updates are permitted across all previous month invoices.
              </div>
            </div>
          </div>
          {onBackToLedger && (
            <button
              type="button"
              onClick={onBackToLedger}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              Back to Invoices Ledger
            </button>
          )}
        </div>
      )}

      {/* Top Banner & Header Information Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* PROCEED TO NEXT MONTH BUTTON */}
          <button
            type="button"
            onClick={() => setIsPrecedingBreakdownOpen(true)}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            View Preceding Breakdown
          </button>
          <button
            type="button"
            onClick={handleProceedToNextMonth}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Roll forward current cumulative amounts into preceding history and advance billing period to next month"
          >
            <FastForward className="w-4 h-4" />
            Proceed to Next Month (Roll Forward)
          </button>

          {/* USD BILLING TOGGLE */}
          <button
            type="button"
            onClick={() => setUsdBillingEnabled(!usdBillingEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              usdBillingEnabled
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-400/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle USD billing mode: When enabled, all payment tables automatically add columns for Preceding USD and To Date USD"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>USD Billing: {usdBillingEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </button>

          {/* COMPACT PDF REPORT MODE TOGGLE */}
          <button
            type="button"
            onClick={() => setIsCompactPdfMode(!isCompactPdfMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              isCompactPdfMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle compact PDF report mode: Reduces table row padding and font sizing to maximize single-page row density"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Compact PDF: {isCompactPdfMode ? 'ON (Dense)' : 'OFF (Standard)'}</span>
          </button>

          {/* EXPORT FORMATTED PDF REPORT BUTTON */}
          <button
            type="button"
            onClick={handleExportMonthlyInvoicePDF}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Export Tables 1, 2, 3, & 5 as an official formatted Ethiopian Roads Administration monthly certificate PDF report"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Invoice PDF (Tables 1-5)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndSync}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save & Synchronize Invoice
          </button>
        </div>

        {saveSuccessMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Contract Baseline Table */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3">
            Contract Baseline Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Client Name</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Client Address</label>
              <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full text-xs text-slate-700 dark:text-slate-300 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Consultant Firm</label>
              <input type="text" value={consultantFirm} onChange={(e) => setConsultantFirm(e.target.value)} className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Bank Name</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full text-xs text-slate-700 dark:text-slate-300 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Bank Branch / Account</label>
              <div className="flex gap-2">
                <input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className="flex-1 text-xs text-slate-700 dark:text-slate-300 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" placeholder="Branch" />
                <input type="text" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="flex-1 text-xs font-mono font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" placeholder="Account No" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Contract Reference</label>
              <input type="text" value={projectContractNo} onChange={(e) => setProjectContractNo(e.target.value)} className="w-full text-xs font-mono font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none py-1" />
            </div>
          </div>
        </div>

        {/* Directorate Admin Settings: 10% Contract Reduction Mode */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Directorate Admin: 10% Contract Reduction Mode
                  </h4>
                  {directorateReductionMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                      ACTIVE ({reducedPositionsCount} Positions Reduced)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Allows Directorate Administration to toggle a 10% rate reduction for specific supervisory position rates. All associated fee amounts, contract amounts, and cumulative balances recalculate automatically.
                </p>
              </div>
            </div>

            {/* Master Toggle */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={directorateReductionMode}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setDirectorateReductionMode(enabled);
                  if (enabled && Object.keys(reducedPositionIds).length === 0) {
                    const initial: Record<string, boolean> = {};
                    staffRows.forEach((r, i) => {
                      if (i < 4) initial[r.id] = true;
                    });
                    setReducedPositionIds(initial);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
              <span className="ml-2.5 text-xs font-black text-slate-800 dark:text-slate-200">
                {directorateReductionMode ? 'Mode Active' : 'Mode Inactive'}
              </span>
            </label>
          </div>

          {/* Expanded controls when active */}
          {directorateReductionMode && (
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/40 space-y-2.5 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                  Select Specific Supervisory Positions for 10% Contract Rate Deduction:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllPositionReductions(true)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Select All ({staffRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPositionReductions(false)}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Checkboxes grid for positions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-amber-200 dark:border-amber-900/50">
                {staffRows.map(row => {
                  const isChecked = Boolean(reducedPositionIds[row.id]);
                  const originalRate = row.rate;
                  const discountedRate = Number((originalRate * 0.9).toFixed(2));

                  return (
                    <label
                      key={row.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
                          : 'bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePositionReduction(row.id)}
                        className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate" title={row.position}>
                          {row.position}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{row.name}</div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {isChecked ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              {fmt(discountedRate)} ETB <span className="text-[9px] line-through text-slate-400 font-normal">({fmt(originalRate)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 font-semibold">{fmt(originalRate)} ETB</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Metadata Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs pt-1">
          {/* Invoice Selector */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Invoice to Calculate / Edit
            </label>
            <select
              value={activeInvoice?.id || 'new'}
              onChange={(e) => {
                const targetId = e.target.value;
                if (targetId === 'new') {
                  if (onSelectInvoice) onSelectInvoice(null as any);
                } else {
                  const targetInv = (consultant.invoices || []).find(i => i.id === targetId);
                  if (targetInv && onSelectInvoice) {
                    onSelectInvoice(targetInv);
                  }
                }
              }}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
            >
              <option value="new">+ Start New Invoice Calculation</option>
              {(consultant.invoices || []).map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} — {inv.billingPeriod} ({inv.status} • {fmt(inv.netAmountEtb || 0)} ETB)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-xs text-blue-600 dark:text-blue-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Billing Month / Year
            </label>
            <div className="flex gap-2">
                <select 
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <input 
                    type="number"
                    value={billingYear}
                    onChange={(e) => setBillingYear(parseInt(e.target.value, 10))}
                    className="w-16 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                />
            </div>
          </div>


          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Submission Date
            </label>
            <input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs"
            >
              <option value="Submitted">Submitted</option>
              <option value="Certified">Certified</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Live Calculation KPI summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Sub-Total 1 (Staff Fees)</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {fmt(subTotal1ThisInvoice)} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
            </span>
          </div>

          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Sub-Total 2 (Reimbursable)</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {fmt(subTotal2ThisInvoice)} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
            </span>
          </div>

          <div className="bg-purple-50/60 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Gross Claim (+15% VAT)</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
              {fmt(grossPayableBase)} <span className="text-[10px] text-slate-400 font-normal">ETB</span>
            </span>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Net Payable (Minus VAT)</span>
              {isPaymentLocked && (
                <span className="text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Payment saved and locked: no change allowed">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </div>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {fmt(netDueThisInvoice)} <span className="text-[10px] font-normal">ETB</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table Type Sub-Navigation Tabs & Personnel Directory Status Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTableTab('all')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Complete View (All Tables)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('attendance')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Table 1: Staff Attendance (Sub Total 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('reimbursables')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'reimbursables'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sub Total 2: Reimbursables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('dlp')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'dlp'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sub Total 3: Defect Liability</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('summary')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'summary'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Table 5: Consolidated Summary</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToContractAmount && (
            <button
              type="button"
              onClick={onNavigateToContractAmount}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 cursor-pointer shadow-xs"
              title="Go to Master Contract Amount & Remuneration Schedules"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Go to Contract Amount</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Assigned Staff Filter Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setPersonnelFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition ${
              personnelFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show all assigned personnel, including replaced staff records"
          >
            All Assigned ({staffRows.length})
          </button>
          <button
            type="button"
            onClick={() => setPersonnelFilter('active_only')}
            className={`px-2.5 py-1 rounded-lg transition ${
              personnelFilter === 'active_only' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show only active staff currently mobilized"
          >
            Active Mobilized ({activeStaffCount})
          </button>
          {replacedStaffCount > 0 && (
            <button
              type="button"
              onClick={() => setPersonnelFilter('replaced_only')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                personnelFilter === 'replaced_only' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
              }`}
              title="View permanent historical records of replaced predecessors"
            >
              <History className="w-3 h-3" />
              Replaced Records ({replacedStaffCount})
            </button>
          )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABLE 1: STAFF ATTENDANCE RECORD TABLE                                   */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'attendance') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-mono">1</span>
                Table 1: Monthly Personnel Attendance Record & Input Derivation
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Directly linked to Assigned Personnel Directory. Derived MM Input = <span className="font-mono font-bold text-blue-600">Days Worked ÷ {totalDaysInMonth} Days</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-semibold">Month Length:</span>
                <input
                  type="number"
                  min="28"
                  max="31"
                  value={totalDaysInMonth}
                  onChange={(e) => setTotalDaysInMonth(Math.max(28, Math.min(31, parseInt(e.target.value) || 31)))}
                  className="w-12 text-center font-mono font-bold text-blue-600 focus:outline-none"
                />
                <span className="text-slate-400">days</span>
              </div>

              {onUpdateConsultantPersonnel && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCalculatePersonnelMMFromInvoice(true)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="At end of month: calculate assigned personnel man-month input from invoice total to-date man month"
                  >
                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                    Calculate Personnel MM from To-Date MM
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncRatesToDirectory}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Synchronize rates & to-date man-months into Assigned Personnel Directory"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Rates & MM
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto px-4 pb-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2 px-2 w-10 text-center">S.N</th>
                  <th className="py-2 px-3 min-w-[170px]">Position / Role</th>
                  <th className="py-2 px-3 min-w-[200px]">Assigned Personnel (Editable / Turnover)</th>
                  <th className="py-2 px-2 text-center w-14">Unit</th>
                  <th className="py-2 px-2 text-right min-w-[90px]">Unit Price (ETB)</th>
                  {isUsdModeActive && <th className="py-2 px-2 text-right min-w-[85px] text-purple-700 dark:text-purple-300">Unit Price (USD)</th>}
                  <th className="py-2 px-2 text-right min-w-[70px]">Contr. MM</th>
                  <th className="py-2 px-2 text-right min-w-[90px]">Days Worked</th>
                  <th className="py-2 px-2 text-center w-14">Divisor</th>
                  <th className="py-2 px-2 text-right min-w-[80px] text-blue-600">Current MM</th>
                  <th className="py-2 px-2 text-right min-w-[90px] text-indigo-600">Prev. Mo. MM</th>
                  <th className="py-2 px-2 text-right min-w-[100px] font-black text-emerald-600 dark:text-emerald-400">Total MM</th>
                  <th className="py-2 px-2 text-center w-20">Turnover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {displayStaffRows.length === 0 ? (
                  <tr>
                    <td colSpan={isUsdModeActive ? 13 : 12} className="py-8 text-center text-slate-400">
                      <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <p className="font-semibold text-xs">No personnel match current directory filter.</p>
                    </td>
                  </tr>
                ) : (
                  displayStaffRows.map((row, idx) => {
                    const derivedMM = row.daysWorked > 0 ? Number((row.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
                    const totalMM = Number(((row.precedingQty || 0) + derivedMM).toFixed(2));
                    const isReplaced = row.status === 'Replaced';
                    const isSuccessor = Boolean(row.predecessorName);
                    const computedRow = feeRowsComputed.find(f => f.id === row.id);
                    const isReduced = Boolean(computedRow?.isReduced);
                    const contractAmt = computedRow?.contractAmount ?? (row.contractQty * row.rate);

                    return (
                      <tr 
                        key={row.id} 
                        className={`transition ${
                          isReplaced 
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50' 
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {row.position}
                            </span>
                            {isReduced && (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-100 dark:bg-rose-950 px-1 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                                -10% Cut
                              </span>
                            )}
                          </div>
                          {row.category && (
                            <span className="text-[10px] text-slate-400 font-normal block">
                              {row.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleStaffNameChange(row.id, e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-blue-400 rounded font-bold text-slate-900 dark:text-white text-xs transition"
                              title="Edit name directly - maintains contract rate and historical records"
                            />
                            
                            {/* Replacement / Successor Badges */}
                            {isReplaced ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-full w-fit">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                Replaced on {row.demobilizationDate || row.replacementDate || 'Handover'} (Historical Record)
                              </span>
                            ) : isSuccessor ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full w-fit">
                                <UserCheck className="w-2.5 h-2.5" />
                                Successor (Replaced {row.predecessorName})
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Mobilized
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500">Days</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {fmt(row.effectiveRate || row.rate)}
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-2 text-right font-mono font-semibold text-purple-700 dark:text-purple-300">
                            {row.rateUsd ? `$${fmt(row.rateUsd)}` : '-'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                          {row.contractQty.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max={totalDaysInMonth}
                            value={row.daysWorked}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateStaff(row.id, { daysWorked: Math.max(0, parseInt(e.target.value) || 0) })}
                            title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted unless unlocked by Directorate Admin)" : "Days worked in current month"}
                            className={`w-18 text-right px-2 py-1 rounded-lg font-mono font-bold text-xs border ${
                              isPaymentLocked
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                                : row.daysWorked > 0 
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' 
                                : 'bg-transparent text-slate-400 border-transparent hover:border-slate-200'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-400">{totalDaysInMonth}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                          {derivedMM.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {(row.precedingQty || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                          {totalMM.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReplacementModalStaff(row);
                              setReplacementNewName('');
                              setReplacementDateInput(new Date().toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                            title="Replace personnel while maintaining position contract rate and historical records"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            Replace
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={isUsdModeActive ? 6 : 5} className="py-2.5 px-3 text-slate-700 dark:text-slate-200 uppercase text-[10px]">
                    Sub-Total 1 (Attendance & Contract Baseline):
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {displayFeeRowsComputed.reduce((s, r) => s + r.contractQty, 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-blue-600">
                    {displayStaffRows.reduce((sum, r) => sum + r.daysWorked, 0)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400"></td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                    {displayFeeRowsComputed.reduce((sum, r) => sum + r.thisInvoiceQty, 0).toFixed(2)} MM
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {displayFeeRowsComputed.reduce((sum, r) => sum + r.precedingQty, 0).toFixed(2)} MM
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {displayFeeRowsComputed.reduce((sum, r) => sum + r.toDateQty, 0).toFixed(2)} MM
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 2: CONSTRUCTION SUPERVISORY STAFF FEES COMPUTATION                 */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'attendance') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3 mt-6">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono font-bold">2</span>
                  Table 2: Construction Supervisory Staff Fees Calculation
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span>🔗 Linked to Attendance Table 1 & Contract Table 2</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl text-xs border border-emerald-200 dark:border-emerald-800">
                Sub-Total 1: <span className="font-mono">{fmt(subTotal1ThisInvoice)} ETB</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Position & Assigned Name</th>
                  <th className="py-2.5 px-2 text-center w-14">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[95px]">Unit Price (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-2 text-right min-w-[95px] text-purple-700 dark:text-purple-300">Unit Price (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[70px]">Contr. MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[105px] font-bold">Contr. Amount (ETB)</th>
                  <th className="py-2.5 px-2 text-right min-w-[70px]">Preceding MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[95px]">Preceding (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[95px] text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/40 font-bold">Preceding (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[70px] text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30">This Inv MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[105px] text-blue-700 dark:text-blue-300 font-bold bg-blue-50/40 dark:bg-blue-950/30">This Inv (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[95px] text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/40 font-bold">This Inv (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[70px]">To-Date MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">To-Date (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/40 font-bold">To-Date (USD)</th>}
                  <th className="py-2.5 px-3 text-right min-w-[105px] text-slate-500">Remaining (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">Remaining (USD)</th>}
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {groupedFeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={isUsdModeActive ? 19 : 14} className="py-8 text-center text-slate-400 font-medium">
                      No staff fee records available. Update Table 1 to generate fee rows.
                    </td>
                  </tr>
                ) : (
                  groupedFeeRows.map((group) => (
                    <React.Fragment key={group.categoryKey}>
                      <tr className="bg-slate-100/90 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-b border-slate-200 dark:border-slate-700">
                        <td className="py-2.5 px-3 text-left uppercase tracking-wider text-xs" colSpan={isUsdModeActive ? 19 : 14}>
                          {group.label}
                        </td>
                      </tr>
                      {group.rows.map((row, idx) => {
                        const derivedMM = row.thisInvoiceQty;
                        return (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                              {row.no || `${idx + 1}`}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-0.5">
                                <input
                                  type="text"
                                  value={row.position}
                                  disabled={isPaymentLocked}
                                  onChange={(e) => handleUpdateStaff(row.id, { position: e.target.value })}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-bold"
                                />
                                <input
                                  type="text"
                                  value={row.name}
                                  disabled={isPaymentLocked}
                                  onChange={(e) => handleUpdateStaff(row.id, { name: e.target.value })}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-400 focus:outline-none text-[10px] text-slate-500 font-bold italic"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              <input
                                type="text"
                                value={row.unit || 'Month'}
                                disabled={isPaymentLocked}
                                onChange={(e) => handleUpdateStaff(row.id, { unit: e.target.value })}
                                className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              <input
                                type="number"
                                step="any"
                                value={row.rate}
                                disabled={isPaymentLocked}
                                onChange={(e) => handleUpdateStaff(row.id, { rate: parseFloat(e.target.value) || 0 })}
                                className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono font-semibold"
                              />
                            </td>
                            {isUsdModeActive && (
                              <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                                <input
                                  type="number"
                                  step="any"
                                  value={row.rateUsd || 0}
                                  disabled={isPaymentLocked}
                                  onChange={(e) => handleUpdateStaff(row.id, { rateUsd: parseFloat(e.target.value) || 0 })}
                                  className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                                />
                              </td>
                            )}
                            <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                              <input
                                type="number"
                                step="any"
                                value={row.contractQty}
                                disabled={isPaymentLocked}
                                onChange={(e) => handleUpdateStaff(row.id, { contractQty: parseFloat(e.target.value) || 0 })}
                                className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                              {fmt(row.contractAmount)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                              {(row.precedingQty || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {fmt(row.precedingAmount || 0)}
                            </td>
                            {isUsdModeActive && (
                              <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-semibold">
                                ${(row.precedingAmountUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-2 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/20">
                              {derivedMM.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-950/20">
                              {fmt(row.thisInvoiceAmount)}
                            </td>
                            {isUsdModeActive && (
                              <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20 dark:bg-purple-950/20">
                                ${(row.thisInvoiceAmountUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-2 px-2 text-right font-mono font-semibold">
                              {(row.toDateQty || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {fmt(row.toDateAmount)}
                            </td>
                            {isUsdModeActive && (
                              <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20 dark:bg-purple-950/20">
                                ${(row.toDateAmountUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {fmt(row.remainingAmount)}
                            </td>
                            {isUsdModeActive && (
                              <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400 bg-purple-50/20 font-semibold">
                                ${(row.remainingAmountUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(row.id)}
                                disabled={isPaymentLocked}
                                className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                                title="Remove staff row from invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-b border-emerald-200 dark:border-emerald-800/60 text-xs">
                        <td className="py-2 px-3 font-bold" colSpan={3}>Sub-total ({group.categoryKey})</td>
                        <td className="py-2 px-2 text-right">—</td>
                        {isUsdModeActive && <td className="py-2 px-2 text-right">—</td>}
                        <td className="py-2 px-2 text-right font-mono">{fmt(group.contractQty, 2)}</td>
                        <td className="py-2 px-3 text-right font-mono">{fmt(group.contractAmount)}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(group.precedingQty, 2)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(group.precedingAmount)}</td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300 font-bold">
                            ${fmt(group.precedingAmountUsd)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{fmt(group.thisInvoiceQty, 2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300">{fmt(group.thisInvoiceAmount)}</td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                            ${fmt(group.thisInvoiceAmountUsd)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono font-semibold">{fmt(group.toDateQty, 2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{fmt(group.toDateAmount)}</td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                            ${fmt(group.toDateAmountUsd)}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{fmt(group.remainingAmount)}</td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                            ${fmt(group.remainingAmountUsd)}
                          </td>
                        )}
                        <td></td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100/80 dark:bg-slate-800 text-xs">
                <tr className="uppercase tracking-tight">
                  <td colSpan={3} className="py-3 px-3 font-black text-slate-900 dark:text-white">Sub-Total 1 Construction Fees:</td>
                  <td className="py-3 px-2 text-right">—</td>
                  {isUsdModeActive && <td className="py-3 px-2 text-right">—</td>}
                  <td className="py-3 px-2 text-right font-mono font-bold">{displayFeeRowsComputed.reduce((s, r) => s + r.contractQty, 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">{fmt(subTotal1Contract)}</td>
                  <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-400">{displayFeeRowsComputed.reduce((s, r) => s + r.precedingQty, 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(subTotal1Preceding)}</td>
                  {isUsdModeActive && (
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal1PrecedingUsd)} USD
                    </td>
                  )}
                  <td className="py-3 px-2 text-right font-mono font-black text-blue-600 dark:text-blue-400">{displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceQty, 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-blue-700 dark:text-blue-300">{fmt(subTotal1ThisInvoice)} ETB</td>
                  {isUsdModeActive && (
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal1ThisInvoiceUsd)} USD
                    </td>
                  )}
                  <td className="py-3 px-2 text-right font-mono font-bold">{displayFeeRowsComputed.reduce((s, r) => s + r.toDateQty, 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">{fmt(subTotal1ToDate)} ETB</td>
                  {isUsdModeActive && (
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal1ToDateUsd)} USD
                    </td>
                  )}
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400">{fmt(subTotal1Remaining)} ETB</td>
                  {isUsdModeActive && (
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal1RemainingUsd)} USD
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TOTAL 2: REIMBURSABLE OPERATING DIRECT COSTS COMPUTATION             */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'reimbursables') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs flex items-center justify-center font-mono font-bold">2</span>
                  Sub Total 2: Reimbursable Operating Direct Costs Calculation
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <span>Linked to Contract Table 1 Item B / Table B</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs font-mono">
                <span>Sub-Total 2 Contract: <strong>{fmt(subTotal2Contract)} ETB</strong></span>
              </span>

              {/* Real-time Sub Total 2 recalculation & sync status visual feedback */}
              {reimbSyncFeedback.status === 'synced' ? (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs" title="Sub Total 2 recalculated and synchronized with Contract Baseline Table B">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Sub Total 2 Synced & Verified</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-400 dark:border-rose-700 flex items-center gap-1.5 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Sync Failed: Sub Total 2 Error</span>
                </span>
              )}

              {!isPaymentLocked && (
                <button
                  type="button"
                  onClick={handleAddReimbursable}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Expense Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Immediate Visual Alert if Row Validation or Synchronization Fails */}
          {reimbSyncFeedback.status === 'error' && (
            <div className="mx-4 mt-2 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-200 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-black">Sub Total 2 Recalculation / Row Sync Failure: </span>
                  <span className="font-medium">{reimbSyncFeedback.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => syncReimbursablesToContractBaseline(reimbursableRows)}
                className="px-3 py-1 bg-rose-200 hover:bg-rose-300 dark:bg-rose-900 text-rose-900 dark:text-rose-100 rounded-xl font-bold text-[11px] transition cursor-pointer self-start sm:self-center"
              >
                Re-validate & Sync Now
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[95px]">Unit Price (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-2 text-right min-w-[90px] text-purple-700 dark:text-purple-300">Unit Price (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[80px]">Contract Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">Contract Amount (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[105px] text-purple-700 dark:text-purple-300">Contract Amount (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Preceding</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[95px] text-purple-700 dark:text-purple-300 bg-purple-100/40 font-bold">Preceding (USD)</th>}
                  <th className="py-2.5 px-2 text-center min-w-[90px] bg-amber-100/50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">This Inv Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[115px] bg-amber-100/50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">This Inv (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[105px] text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/40">This Inv (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[80px]">To-Date Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">To-Date (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-700 dark:text-purple-300 bg-purple-100/40 font-bold">To-Date (USD)</th>}
                  <th className="py-2.5 px-3 text-right min-w-[110px] text-emerald-700 dark:text-emerald-400">Remaining (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">Remaining (USD)</th>}
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {reimbursableRowsComputed.length === 0 ? (
                  <tr>
                    <td colSpan={isUsdModeActive ? 19 : 13} className="py-8 text-center text-slate-400">
                      No reimbursable operating expenses defined in Contract Baseline. Click "+ Add Expense Item" to add.
                    </td>
                  </tr>
                ) : (
                  reimbursableRowsComputed.map((row, idx) => {
                    const isRowInError = reimbSyncFeedback.invalidRowId === row.id ||
                      (row.rate !== undefined && (isNaN(row.rate) || row.rate < 0)) ||
                      (row.contractQty !== undefined && (isNaN(row.contractQty) || row.contractQty < 0)) ||
                      (row.thisInvoiceQty !== undefined && (isNaN(row.thisInvoiceQty) || row.thisInvoiceQty < 0)) ||
                      (row.thisInvoiceAmount !== undefined && (isNaN(row.thisInvoiceAmount) || row.thisInvoiceAmount < 0)) ||
                      !row.description?.trim();

                    return (
                    <tr 
                      key={row.id} 
                      className={`transition ${
                        isRowInError 
                          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-l-4 border-l-rose-500' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">
                        <input
                          type="text"
                          value={row.no || String(idx + 1)}
                          disabled={isPaymentLocked}
                          onChange={(e) => handleUpdateReimbursable(row.id, { no: e.target.value })}
                          className="w-10 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="text"
                            value={row.description}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { description: e.target.value })}
                            className={`w-full bg-transparent border-b text-xs font-bold focus:outline-none ${
                              !row.description?.trim() 
                                ? 'border-rose-500 bg-rose-100/50 text-rose-800' 
                                : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Contractual basis / justification"
                            value={row.basis || ''}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { basis: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-amber-400 focus:outline-none text-[10px] text-slate-400 italic"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500">
                        <input
                          type="text"
                          value={row.unit}
                          disabled={isPaymentLocked}
                          onChange={(e) => handleUpdateReimbursable(row.id, { unit: e.target.value })}
                          className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        <input
                          type="number"
                          step="any"
                          value={row.rate}
                          disabled={isPaymentLocked}
                          onChange={(e) => handleUpdateReimbursable(row.id, { rate: parseFloat(e.target.value) })}
                          className={`w-24 text-right bg-transparent border-b text-xs font-mono focus:outline-none ${
                            row.rate !== undefined && (isNaN(row.rate) || row.rate < 0)
                              ? 'border-rose-500 bg-rose-100/50 text-rose-800 font-bold'
                              : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                          }`}
                        />
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                          <input
                            type="number"
                            step="any"
                            value={row.rateUsd || 0}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { rateUsd: parseFloat(e.target.value) })}
                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        <input
                          type="number"
                          step="any"
                          value={row.contractQty}
                          disabled={isPaymentLocked}
                          onChange={(e) => handleUpdateReimbursable(row.id, { contractQty: parseFloat(e.target.value) })}
                          className={`w-16 text-right bg-transparent border-b text-xs font-mono focus:outline-none ${
                            row.contractQty !== undefined && (isNaN(row.contractQty) || row.contractQty < 0)
                              ? 'border-rose-500 bg-rose-100/50 text-rose-800 font-bold'
                              : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {fmt(row.contractAmount)}
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300">
                          ${fmt(row.contractAmountUsd || 0)}
                        </td>
                      )}
                      <td className="py-2 px-2 text-right font-mono text-slate-500">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="any"
                            value={row.precedingQty}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { precedingQty: parseFloat(e.target.value) || 0 })}
                            className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-[10px] font-mono"
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="Prev. Amt"
                            value={row.precedingAmount}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { precedingAmount: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-[9px] font-mono text-slate-400"
                          />
                        </div>
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-semibold">
                          ${fmt(row.precedingAmountUsd || 0)}
                        </td>
                      )}
                      <td className="py-2 px-2 text-center bg-amber-50/30 dark:bg-amber-950/20">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.thisInvoiceQty}
                          disabled={isPaymentLocked}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            handleUpdateReimbursable(row.id, { 
                              thisInvoiceQty: qty,
                              thisInvoiceAmount: Number((qty * row.rate).toFixed(2)),
                              thisInvoiceAmountUsd: isUsdModeActive ? Number((qty * (row.rateUsd || 0)).toFixed(2)) : 0
                            });
                          }}
                          className={`w-20 text-center px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                            isPaymentLocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                              : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-700 focus:ring-1 focus:ring-amber-500 shadow-xs'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right bg-amber-50/40 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="any"
                            value={row.thisInvoiceAmount}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateReimbursable(row.id, { thisInvoiceAmount: parseFloat(e.target.value) || 0 })}
                            className={`w-28 text-right px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                              isPaymentLocked
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                                : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-200 focus:ring-1 focus:ring-amber-500 shadow-xs'
                            }`}
                          />
                          <span className="text-[9px] opacity-50 uppercase tracking-tighter">Amount Override</span>
                        </div>
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-3 text-right font-mono font-bold bg-purple-50/20 text-purple-700 dark:text-purple-300">
                          ${fmt(row.thisInvoiceAmountUsd || (row.thisInvoiceQty * (row.rateUsd || 0)))}
                        </td>
                      )}
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        {row.toDateQty.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {fmt(row.toDateAmount)}
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">
                          ${fmt(row.toDateAmountUsd || 0)}
                        </td>
                      )}
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(Math.max(0, row.contractAmount - row.toDateAmount))}
                      </td>
                      {isUsdModeActive && (
                        <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400 bg-purple-50/20 font-semibold">
                          ${fmt(row.remainingAmountUsd || 0)}
                        </td>
                      )}
                      <td className="py-2 px-2 text-center">
                        {!isPaymentLocked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReimbursable(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                            title="Delete Reimbursable Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-amber-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={isUsdModeActive ? 6 : 5} className="py-2.5 px-3 text-amber-900 dark:text-amber-200 uppercase text-[10px] font-black">
                    Sub-Total 2 (Reimbursable Direct Operating Costs):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white font-black">
                    {fmt(subTotal2Contract)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal2ContractUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                    {fmt(subTotal2Preceding)}
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal2PrecedingUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center font-mono text-amber-700 dark:text-amber-300 bg-amber-100/30">
                    -
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 dark:text-amber-200 bg-amber-100/30 font-black">
                    {fmt(subTotal2ThisInvoice)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-100/20">
                      ${fmt(subTotal2ThisInvoiceUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                    -
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white font-black">
                    {fmt(subTotal2ToDate)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal2ToDateUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {fmt(subTotal2Remaining)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal2RemainingUsd)} USD
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TOTAL 3: DEFECT LIABILITY PERSONNEL ALLOCATION COMPUTATION           */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'dlp') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-mono font-bold">3</span>
                  Sub Total 3: Defect Liability Period (DLP) Personnel Allocation
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                  <span>Linked to Contract Table 3 (DLP Remuneration Schedule)</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">DLP Personnel Position & Name</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[105px]">Unit Price (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-2 text-right min-w-[100px] text-purple-700 dark:text-purple-300">Unit Price (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[85px]">Contract MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">Contract Amount (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[105px] text-purple-700 dark:text-purple-300">Contract Amount (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Preceding</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[95px] text-purple-700 dark:text-purple-300 bg-purple-100/40 font-bold">Preceding (USD)</th>}
                  <th className="py-2.5 px-2 text-center min-w-[90px] bg-indigo-100/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200">This Inv MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[115px] bg-indigo-100/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200">This Inv (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[105px] text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/40">This Inv (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[80px]">To-Date MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">To-Date (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-700 dark:text-purple-300 bg-purple-100/40 font-bold">To-Date (USD)</th>}
                  <th className="py-2.5 px-3 text-right min-w-[110px] text-emerald-700 dark:text-emerald-400">Remaining (ETB)</th>
                  {isUsdModeActive && <th className="py-2.5 px-3 text-right min-w-[100px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">Remaining (USD)</th>}
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {defectRowsComputed.length === 0 ? (
                  <tr>
                    <td colSpan={isUsdModeActive ? 19 : 13} className="py-8 text-center text-slate-400">
                      No DLP personnel allocation rows defined in Contract Baseline.
                    </td>
                  </tr>
                ) : (
                  defectRowsComputed.map((row, idx) => {
                    const thisInvoiceAmountUsd = isUsdModeActive ? (row.thisInvoiceQty * (row.rateUsd || 0)) : 0;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          <input
                            type="text"
                            value={row.position}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateDefectRow(row.id, { position: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-medium"
                          />
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500">
                          <input
                            type="text"
                            value={row.unit || 'Month'}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateDefectRow(row.id, { unit: e.target.value })}
                            className="w-16 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          <input
                            type="number"
                            step="any"
                            value={row.rate}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateDefectRow(row.id, { rate: parseFloat(e.target.value) || 0 })}
                            className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                          />
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                            <input
                              type="number"
                              step="any"
                              value={row.rateUsd || 0}
                              disabled={isPaymentLocked}
                              onChange={(e) => handleUpdateDefectRow(row.id, { rateUsd: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                            />
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                          <input
                            type="number"
                            step="any"
                            value={row.contractQty}
                            disabled={isPaymentLocked}
                            onChange={(e) => handleUpdateDefectRow(row.id, { contractQty: parseFloat(e.target.value) || 0 })}
                            className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {fmt(row.contractAmount)}
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300">
                            ${fmt(row.contractAmountUsd || 0)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              step="any"
                              value={row.precedingQty}
                              disabled={isPaymentLocked}
                              onChange={(e) => handleUpdateDefectRow(row.id, { precedingQty: parseFloat(e.target.value) || 0 })}
                              className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[10px] font-mono"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="Prev. Amt"
                              value={row.precedingAmount}
                              disabled={isPaymentLocked}
                              onChange={(e) => handleUpdateDefectRow(row.id, { precedingAmount: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[9px] font-mono text-slate-400"
                            />
                          </div>
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-semibold">
                            ${fmt(row.precedingAmountUsd || 0)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center bg-indigo-50/30 dark:bg-indigo-950/20">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={row.contractQty || 12}
                            value={row.thisInvoiceQty}
                            disabled={isPaymentLocked}
                            onChange={(e) => {
                              const mm = parseFloat(e.target.value) || 0;
                              handleUpdateDefectRow(row.id, { 
                                thisInvoiceQty: mm,
                                thisInvoiceAmount: Number((mm * row.rate).toFixed(2)),
                                thisInvoiceAmountUsd: isUsdModeActive ? Number((mm * (row.rateUsd || 0)).toFixed(2)) : 0
                              });
                            }}
                            className={`w-20 text-center px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                              isPaymentLocked
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                                : 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              step="any"
                              value={row.computedThisAmount}
                              disabled={isPaymentLocked}
                              onChange={(e) => handleUpdateDefectRow(row.id, { thisInvoiceAmount: parseFloat(e.target.value) || 0 })}
                              className={`w-28 text-right px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                                isPaymentLocked
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                                  : 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500 shadow-xs'
                              }`}
                            />
                            <span className="text-[9px] opacity-50 uppercase tracking-tighter">Amount Override</span>
                          </div>
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono font-bold bg-purple-50/20 text-purple-700 dark:text-purple-300">
                            ${fmt(row.thisInvoiceAmountUsd || (row.thisInvoiceQty * (row.rateUsd || 0)))}
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          {row.toDateQty.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {fmt(row.toDateAmount)}
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">
                            ${fmt(row.toDateAmountUsd || 0)}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {fmt(row.remainingAmount)}
                        </td>
                        {isUsdModeActive && (
                          <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400 bg-purple-50/20 font-semibold">
                            ${fmt(row.remainingAmountUsd || 0)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center">
                          {/* Row deletion disabled for invoice synchronization */}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-indigo-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={isUsdModeActive ? 6 : 5} className="py-2.5 px-3 text-indigo-900 dark:text-indigo-200 uppercase text-[10px] font-black">
                    Sub-Total 3 (Defect Liability Personnel Allocation):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {fmt(subTotal3Contract)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal3ContractUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                    {subTotal3Preceding > 0 ? `${fmt(subTotal3Preceding)} ETB` : '-'}
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal3PrecedingUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                    -
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-800 dark:text-indigo-200 font-black">
                    {fmt(subTotal3ThisInvoice)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal3ThisInvoiceUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                    -
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white font-black">
                    {fmt(subTotal3ToDate)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal3ToDateUsd)} USD
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {fmt(subTotal3Remaining)} ETB
                  </td>
                  {isUsdModeActive && (
                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-700 dark:text-purple-300">
                      ${fmt(subTotal3RemainingUsd)} USD
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 5: CONSOLIDATED SUMMARY & DEDUCTION COMPUTATION                    */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'summary') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono">5</span>
                  Table 5: Consolidated Summary & Net Payment Computation Table
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span>🔗 Master Baseline Linked to Contract Amount Table 1</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl text-xs">
                Net Claim: {fmt(netDueThisInvoice)} ETB
              </span>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-4">
            {/* The Main Computation Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 w-12 text-center">Item</th>
                    <th className="py-2.5 px-4 min-w-[280px]">Summary Claim Component</th>
                    <th className="py-2.5 px-4 text-right min-w-[130px]">Contract Baseline (ETB)</th>
                    {isUsdModeActive && <th className="py-2.5 px-4 text-right min-w-[130px] text-purple-700 dark:text-purple-300 bg-purple-50/40">Contract Baseline (USD)</th>}
                    <th className="py-2.5 px-4 text-right min-w-[140px] font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                      This Month Claim (ETB)
                    </th>
                    {isUsdModeActive && <th className="py-2.5 px-4 text-right min-w-[140px] font-black text-purple-700 dark:text-purple-300 bg-purple-50/40">This Month Claim (USD)</th>}
                    <th className="py-2.5 px-4 text-right min-w-[130px]">Preceding Claim (ETB)</th>
                    {isUsdModeActive && <th className="py-2.5 px-4 text-right min-w-[130px] text-purple-700 dark:text-purple-300 bg-purple-50/40">Preceding Claim (USD)</th>}
                    <th className="py-2.5 px-4 text-right min-w-[130px] font-bold">To-Date Claim (ETB)</th>
                    {isUsdModeActive && <th className="py-2.5 px-4 text-right min-w-[130px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50/40">To-Date Claim (USD)</th>}
                    <th className="py-2.5 px-4 text-right min-w-[130px] font-bold text-slate-600 dark:text-slate-400">Remaining Balance (ETB)</th>
                    {isUsdModeActive && <th className="py-2.5 px-4 text-right min-w-[130px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50/40">Remaining Balance (USD)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                  {/* Row 1: Sub Total 1 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">1</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Sub Total 1 (Remuneration of Construction Supervisory Staff)
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">Linked to Contract Table 2 (Construction Schedule)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(linkedFeesContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(linkedFeesContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal1ThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal1ThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(subTotal1Preceding)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal1PrecedingUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal1ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal1ToDateUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, linkedFeesContract - subTotal1ToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/20">${fmt(subTotal1RemainingUsd)}</td>}
                  </tr>

                  {/* Row 2: Sub Total 2 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">2</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Sub Total 2 (Reimbursable Operating Direct Costs)
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">Linked to Contract Table 1 Item B</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(linkedReimbContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(linkedReimbContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal2ThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal2ThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(subTotal2Preceding)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal2PrecedingUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal2ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal2ToDateUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, linkedReimbContract - subTotal2ToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/20">${fmt(subTotal2RemainingUsd)}</td>}
                  </tr>

                  {/* Row 3: Sub Total 3 Defect */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">3</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Sub Total 3 (Defect Liability Personnel Allocation)
                      </div>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-mono">Linked to Contract Table 3 (DLP Remuneration Schedule)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{fmt(subTotal3Contract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal3ContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal3ThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal3ThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{subTotal3Preceding > 0 ? fmt(subTotal3Preceding) : '-'}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal3PrecedingUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(subTotal3ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal3ToDateUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(subTotal3Remaining)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/20">${fmt(subTotal3RemainingUsd)}</td>}
                  </tr>

                  {/* Direct Sum (1 + 2 + 3) */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/60 font-bold border-t border-b border-slate-300 dark:border-slate-700">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500"></td>
                    <td className="py-2.5 px-4 uppercase text-slate-700 dark:text-slate-300">
                      Subtotal Direct Services & Expenses (1 + 2 + 3)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(totalBaseContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalBaseContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white bg-blue-50/30 dark:bg-blue-950/20">
                      {fmt(totalSubtotalThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalSubtotalThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(totalSubtotalPreceding)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalSubtotalPrecedingUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black">{fmt(totalSubtotalToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalSubtotalToDateUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {fmt(Math.max(0, totalBaseContract - totalSubtotalToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalSubtotalRemainingUsd)}</td>}
                  </tr>

                  {/* Contingency */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">4</td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Contingency Provision</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                            User-Assigned Claim
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span>Contract Provision Baseline:</span>
                          <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title="Contingency % is set on Contract Amount Schedule and locked">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{contingencyRatePct}% of Direct Services (A+B)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({fmt(contingencyContract)} ETB Contract Total)</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{fmt(contingencyContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(contingencyContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right bg-blue-50/20 dark:bg-blue-950/10">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={contingencyThisInvoiceClaim}
                          disabled={isPaymentLocked}
                          onChange={(e) => setContingencyThisInvoiceClaim(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Assign this month's contingency claim (ETB)"}
                          className={`w-32 text-right px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                            isPaymentLocked 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                              : 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-blue-500 shadow-xs'
                          }`}
                        />
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">ETB Claim</span>
                      </div>
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right bg-purple-50/20 dark:bg-purple-950/10">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={contingencyThisInvoiceClaimUsd}
                            disabled={isPaymentLocked}
                            onChange={(e) => setContingencyThisInvoiceClaimUsd(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Assign this month's contingency claim (USD)"}
                            className={`w-28 text-right px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                              isPaymentLocked 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                                : 'border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-purple-500 shadow-xs'
                            }`}
                          />
                          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">USD Claim</span>
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {fmt(contingencyPrecedingClaim)}
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">
                        ${fmt(contingencyPrecedingClaimUsd)}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-right bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={contingencyToDate}
                          disabled={isPaymentLocked}
                          onChange={(e) => setContingencyToDateEtb(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          title={isPaymentLocked ? "Payment amount is saved and locked" : "Assign total to-date contingency claim (ETB)"}
                          className={`w-32 text-right px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                            isPaymentLocked 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                              : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 shadow-xs'
                          }`}
                        />
                        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-tight">To-Date (ETB)</span>
                      </div>
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right bg-purple-50/10 dark:bg-purple-900/10">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={contingencyToDateUsdValue}
                            disabled={isPaymentLocked}
                            onChange={(e) => setContingencyToDateUsd(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            title={isPaymentLocked ? "Payment amount is saved and locked" : "Assign total to-date contingency claim (USD)"}
                            className={`w-28 text-right px-2 py-1 rounded-lg border font-mono font-bold text-xs ${
                              isPaymentLocked 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                                : 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-purple-500 shadow-xs'
                            }`}
                          />
                          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-tight">To-Date (USD)</span>
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, contingencyContract - contingencyToDate))}
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">
                        ${fmt(Math.max(0, contingencyContractUsd - contingencyToDateUsdValue))}
                      </td>
                    )}
                  </tr>

                  {/* 15% VAT */}
                  <tr className="bg-purple-50/30 dark:bg-purple-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-600">5</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-900 dark:text-purple-300">Value Added Tax (15% VAT)</span>
                        <div className="flex items-center gap-1 font-mono text-xs bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200">
                          <input
                            type="number"
                            step="0.5"
                            value={vatRatePct}
                            disabled={isPaymentLocked}
                            onChange={(e) => setVatRatePct(parseFloat(e.target.value) || 0)}
                            className="w-10 text-center bg-transparent focus:outline-none font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-purple-600/80 block font-mono">Linked to Contract Table 1 Item D</span>
                      <div className="mt-1 text-[11px] font-semibold text-purple-900 dark:text-purple-200 bg-purple-100/70 dark:bg-purple-900/50 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                        <span className="font-bold">VAT Amount in Words:</span> {numberToWords(vatThisInvoice)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300">{fmt(vatContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/30">
                      {fmt(vatThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-purple-600/80">{fmt(vatPreceding)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatPrecedingUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300">{fmt(vatToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatToDateUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      {fmt(Math.max(0, vatContract - vatToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">${fmt(vatRemainingUsd)}</td>}
                  </tr>

                  {/* GROSS CLAIM TOTAL */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-sm border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-3 px-3 text-center font-mono">6</td>
                    <td className="py-3 px-4 uppercase text-slate-900 dark:text-white">
                      GROSS INVOICE CLAIM AMOUNT (Birr)
                      <span className="text-[10px] text-slate-400 lowercase font-normal block">Total contract price ceiling (mirrors Table 1 Item E)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white font-black">{fmt(totalContractDue)}</td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 font-black bg-purple-50/20">${fmt(totalContractDueUsd)}</td>}
                    <td className="py-3 px-4 text-right font-mono text-blue-600 dark:text-blue-400 bg-blue-100/40 dark:bg-blue-950/40">
                      {fmt(grossPayableBase)}
                    </td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 font-black bg-purple-50/20">${fmt(grossPayableBaseUsd)}</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(grossPreceding)}</td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-bold">${fmt(grossPrecedingUsd)}</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">{fmt(grossToDate)}</td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 font-black bg-purple-50/20">${fmt(grossToDateUsd)}</td>}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {fmt(Math.max(0, totalContractDue - grossToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(grossRemainingUsd)}</td>}
                  </tr>

                  {/* Overtime Row */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">5a</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Overtime</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right bg-blue-50/20 dark:bg-blue-950/10">
                      <input
                        type="number"
                        value={overtimeEtb}
                        disabled={isPaymentLocked}
                        onChange={(e) => setOvertimeEtb(parseFloat(e.target.value) || 0)}
                        title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Overtime amount"}
                        className={`w-28 text-right px-2 py-0.5 rounded border font-mono font-bold text-xs ${
                          isPaymentLocked 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                            : 'border-blue-300 dark:border-blue-800 text-blue-600 bg-white dark:bg-slate-900'
                        }`}
                      />
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">{fmt(overtimeEtb)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                  </tr>

                  {/* DEDUCTIONS SECTION */}
                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7a</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Advance Payment Recovery (Birr)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={advanceDeductionEtb}
                        disabled={isPaymentLocked}
                        onChange={(e) => setAdvanceDeductionEtb(parseFloat(e.target.value) || 0)}
                        title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Advance payment recovery"}
                        className={`w-28 text-right px-2 py-0.5 rounded border font-mono font-bold text-xs ${
                          isPaymentLocked 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                            : 'border-rose-300 dark:border-rose-800 text-rose-600 bg-white dark:bg-slate-900'
                        }`}
                      />
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(advanceDeductionEtb)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                  </tr>

                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7b</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Withholding / Statutory Tax Deduction (2%)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={taxDeductionEtb}
                        disabled={isPaymentLocked}
                        onChange={(e) => setTaxDeductionEtb(parseFloat(e.target.value) || 0)}
                        title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Statutory tax deduction"}
                        className={`w-28 text-right px-2 py-0.5 rounded border font-mono font-bold text-xs ${
                          isPaymentLocked 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                            : 'border-rose-300 dark:border-rose-800 text-rose-600 bg-white dark:bg-slate-900'
                        }`}
                      />
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(taxDeductionEtb)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                  </tr>

                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7c</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Overtime Deduction from Contractor</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={overtimeDeductionEtb}
                        disabled={isPaymentLocked}
                        onChange={(e) => setOvertimeDeductionEtb(parseFloat(e.target.value) || 0)}
                        title={isPaymentLocked ? "Payment amount is saved and locked (no change permitted)" : "Overtime deduction"}
                        className={`w-28 text-right px-2 py-0.5 rounded border font-mono font-bold text-xs ${
                          isPaymentLocked 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                            : 'border-rose-300 dark:border-rose-800 text-rose-600 bg-white dark:bg-slate-900'
                        }`}
                      />
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(overtimeDeductionEtb)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>}
                  </tr>



                  {/* FINAL NET PAYABLE */}
                  <tr className="bg-emerald-100 dark:bg-emerald-950/60 font-black text-sm border-t-2 border-emerald-500">
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-800 dark:text-emerald-300">8</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="uppercase text-emerald-950 dark:text-emerald-100 font-black">
                            TOTAL NET AMOUNT PAYABLE TO CONSULTANT (ETB)
                          </span>
                          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-black px-2 py-0.5 rounded-full">
                            MINUS VAT
                          </span>
                          {isPaymentLocked && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-black px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                              <Lock className="w-2.5 h-2.5" />
                              PAYMENT SAVED & LOCKED (NO CHANGE)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-normal block">
                          Official ERA Net Payment Certificate: Gross Invoice Claim minus 15% VAT, minus contractual deductions, plus overtime.
                        </span>
                        <div className="mt-1 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-200/60 dark:bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                          <span className="font-bold">Net Payable Amount in Words:</span> {numberToWords(netDueThisInvoice)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-bold">{fmt(contractNetAmount)}</td>
                    {isUsdModeActive && <td className="py-3.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-50/20">${fmt(grandContractWithContingencyUsd)}</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-700 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-900/40">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-lg">
                          {fmt(netDueThisInvoice)} ETB
                        </span>
                        {isPaymentLocked && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Amount Locked
                          </span>
                        )}
                      </div>
                    </td>
                    {isUsdModeActive && (
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-black text-base">
                        ${fmt(Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd))}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 font-bold">{fmt(netPreceding)}</td>
                    {isUsdModeActive && (
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-black text-base">
                        ${fmt(Math.max(0, grossPrecedingUsd - vatPrecedingUsd))}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-800 dark:text-emerald-200 font-black">
                      {fmt(netToDate)} ETB
                    </td>
                    {isUsdModeActive && (
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-black text-base">
                        ${fmt(Math.max(0, grossToDateUsd - vatToDateUsd))}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Saved & Locked Status Control Bar */}
            {isPaymentSaved && (
              <div className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span>Payment Amount Saved & Locked: {fmt(savedPaymentAmount || netDueThisInvoice)} ETB (Minus VAT)</span>
                      {isPaymentLocked && (
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold">
                          Fixed
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      Once saved, no change is allowed on the payment amount. All financial records and attendance inputs for this invoice are locked.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allowAdminUnlock ? (
                    <button
                      type="button"
                      onClick={() => setAllowAdminUnlock(false)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Re-Lock Payment
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Directorate Admin: Are you sure you want to unlock this saved payment and permit recalculation of the amount?")) {
                          setAllowAdminUnlock(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Directorate Admin override: allow recalculation of saved payment"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unlock Payment (Admin)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Net Amount in Words Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isUsdModeActive && Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd) > 0
                  ? 'Net Payable Amount in Birr & US Dollar Words:'
                  : 'Net Payable Amount in Ethiopian Birr Words:'}
              </span>
              <div className="text-sm font-serif italic text-slate-900 dark:text-white font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>"{numberToWordsCurrency(netDueThisInvoice, 'ETB')}"</span>
                {isUsdModeActive && Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd) > 0 && (
                  <span className="text-purple-700 dark:text-purple-300 font-bold not-italic font-sans text-xs">
                    • USD Portion: "{numberToWordsCurrency(Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd), 'USD')}"
                  </span>
                )}
              </div>
            </div>

            {/* Consultant Bank Account Details */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                <Landmark className="w-4 h-4 text-blue-500" />
                <span>Consultant Electronic Wire Transfer & Bank Details (Editable)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Branch</label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Project Verification & Certification Sign-Offs (Table 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Prepared By:</span>
                <input
                  type="text"
                  value={preparedBy}
                  disabled={isPaymentLocked}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500 block">Resident Engineer / Team Leader</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Checked By:</span>
                <input
                  type="text"
                  value={checkedBy}
                  disabled={isPaymentLocked}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500 block">Payment & Valuation Officer</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Reviewed By:</span>
                <input
                  type="text"
                  value={reviewedBy}
                  disabled={isPaymentLocked}
                  onChange={(e) => setReviewedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500 block">Lead Supervision Engineer</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recommended By:</span>
                <input
                  type="text"
                  value={recommendedBy}
                  disabled={isPaymentLocked}
                  onChange={(e) => setRecommendedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500 block">Supervision Directorate Director / Team Leader</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Certified & Approved By:</span>
                <input
                  type="text"
                  value={approvedBy}
                  disabled={isPaymentLocked}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500 block">Director General / Project Director (ERA)</span>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  {isPreviousInvoiceFrozen 
                    ? "This previous month invoice is synchronized with the ledger and permanently frozen (no modifications permitted)."
                    : "Saving updates the project's Supervision Invoices register and synchronizes with the financial ledger."}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onBackToLedger && (
                  <button
                    type="button"
                    onClick={onBackToLedger}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back to Invoices Ledger
                  </button>
                )}

                {isPreviousInvoiceFrozen ? (
                  <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Preceding Month (Rolled Forward)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToNextMonth}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                    title="Proceed to next month, carry forward cumulative inputs into preceding totals, and preserve predecessor records"
                  >
                    <FastForward className="w-4 h-4" />
                    Proceed to Next Month
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportMonthlyInvoicePDF}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Export Tables 1 & 5 as an official formatted Ethiopian Roads Administration monthly certificate PDF report"
                >
                  <FileDown className="w-4 h-4" />
                  Export Invoice PDF
                </button>

                {isPreviousInvoiceFrozen ? (
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                    title="Previous month invoice is frozen and synchronized with the ledger. Audit policy prohibits changes to preceding billing periods."
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Previous Month Locked (Read-Only)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAndSync}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save & Synchronize Invoice with Ledger
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preceding Invoices Breakdown Modal (Month Succession) */}
      {isPrecedingBreakdownOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Cumulative Preceding Invoices Breakdown (Month Succession)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing all saved invoices preceding {invoiceNo} ordered chronologically by month succession.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrecedingBreakdownOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1 font-sans">
              {allInvoices.filter(inv => !activeInvoice || inv.id !== activeInvoice.id).length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Info className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-sm font-semibold">No preceding invoices saved yet.</p>
                  <p className="text-xs">This is the first billing period or no prior invoices have been saved.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-3 px-4">Month</th>
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4 text-right">Fees (ETB)</th>
                          {isUsdModeActive && <th className="py-3 px-4 text-right">Fees (USD)</th>}
                          <th className="py-3 px-4 text-right">Reimb. (ETB)</th>
                          {isUsdModeActive && <th className="py-3 px-4 text-right">Reimb. (USD)</th>}
                          <th className="py-3 px-4 text-right">Gross (ETB)</th>
                          {isUsdModeActive && <th className="py-3 px-4 text-right">Gross (USD)</th>}
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {allInvoices
                          .filter(inv => !activeInvoice || inv.id !== activeInvoice.id)
                          .map((inv, idx) => {
                            const feeAmtEtb = inv.feesAmountEtb || (inv.attendanceRecords || []).reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
                            const reimbAmtEtb = inv.reimbursableAmountEtb || (inv.reimbursableRecords || []).reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
                            const grossEtb = inv.grossAmountEtb || (feeAmtEtb + reimbAmtEtb);
                            
                            const feeAmtUsd = inv.feesAmountUsd || 0; // Assuming USD fields exist on ConsultantInvoice
                            const reimbAmtUsd = inv.reimbursableAmountUsd || 0;
                            const grossUsd = inv.grossAmountUsd || (feeAmtUsd + reimbAmtUsd);

                            return (
                              <tr key={inv.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-4 font-bold font-sans text-indigo-600 dark:text-indigo-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4 font-bold">{inv.invoiceNo}</td>
                                <td className="py-3 px-4 font-sans">{inv.billingPeriod}</td>
                                <td className="py-3 px-4 text-right">{fmt(feeAmtEtb)}</td>
                                {isUsdModeActive && <td className="py-3 px-4 text-right text-purple-600 font-bold">{fmt(feeAmtUsd)}</td>}
                                <td className="py-3 px-4 text-right">{fmt(reimbAmtEtb)}</td>
                                {isUsdModeActive && <td className="py-3 px-4 text-right text-purple-600 font-bold">{fmt(reimbAmtUsd)}</td>}
                                <td className="py-3 px-4 text-right font-black">{fmt(grossEtb)}</td>
                                {isUsdModeActive && <td className="py-3 px-4 text-right font-black text-purple-600">{fmt(grossUsd)}</td>}
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                    inv.status === 'Certified' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}>
                                    {inv.status || 'Submitted'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                    <span>Total Cumulative Preceding Amount:</span>
                    <div className="flex gap-4">
                      <span className="font-mono font-black text-sm">
                        {fmt(
                          allInvoices
                            .filter(inv => !activeInvoice || inv.id !== activeInvoice.id)
                            .reduce((sum, inv) => sum + (inv.grossAmountEtb || (inv.feesAmountEtb || 0) + (inv.reimbursableAmountEtb || 0)), 0)
                        )} ETB
                      </span>
                      {isUsdModeActive && (
                        <span className="font-mono font-black text-sm text-purple-700">
                          {fmt(
                            allInvoices
                              .filter(inv => !activeInvoice || inv.id !== activeInvoice.id)
                              .reduce((sum, inv) => sum + (inv.grossAmountUsd || (inv.feesAmountUsd || 0) + (inv.reimbursableAmountUsd || 0)), 0)
                          )} USD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrecedingBreakdownOpen(false)}
                className="px-5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Replacement & Personnel Turnover Modal */}
      {replacementModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center shadow-xs">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    Personnel Replacement & Turnover Record
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Replace staff member while strictly preserving position contract rate & historical records.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Contract Position:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{replacementModalStaff.position}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Outgoing Staff (Predecessor):</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{replacementModalStaff.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Contract Billing Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {fmt(replacementModalStaff.rate)} ETB
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black">
                      RATE LOCKED
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Historical Preceding Input:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {(replacementModalStaff.precedingQty || 0).toFixed(2)} MM ({fmt(replacementModalStaff.precedingAmount || 0)} ETB)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Contract Allocation:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {replacementModalStaff.contractQty.toFixed(2)} MM ({fmt(replacementModalStaff.contractAmount || 0)} ETB)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  New Staff Member Name (Successor / Replacement) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eng. Yohannes Haile"
                  value={replacementNewName}
                  onChange={(e) => setReplacementNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Turnover / Handover Effective Date
                </label>
                <input
                  type="date"
                  value={replacementDateInput}
                  onChange={(e) => setReplacementDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span>
                  <strong>Contract Data Integrity Guaranteed:</strong> Only the assigned staff member's name changes. The contract position rate ({fmt(replacementModalStaff.rate)} ETB) and all historical to-date attendance/financial records remain permanent and intact.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReplacementModalStaff(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replacementNewName.trim()}
                onClick={handleConfirmStaffReplacement}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                Confirm Staff Replacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

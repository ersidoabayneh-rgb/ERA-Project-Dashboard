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
import { Project, SupervisionConsultantInfo, ConsultantInvoice, ConsultantPersonnel } from '../types';
import { DEFAULT_CONDITION_1_STAFF } from '../data/defaultContractAmount';

export interface EditableStaffRow {
  id: string;
  personnelId?: string;
  position: string;
  name: string;
  unit: string;
  rate: number;
  originalRate?: number;
  effectiveRate?: number;
  isReduced?: boolean;
  contractQty: number;
  contractAmount: number;
  mmConstr?: number;
  mmDlp?: number;
  totalMm?: number;
  daysWorked: number;
  precedingQty: number;
  precedingAmount: number;
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
  effectiveRate?: number;
  isReduced?: boolean;
  contractQty: number;
  contractAmount: number;
  thisInvoiceQty: number;
  thisInvoiceAmount: number;
  precedingQty: number;
  precedingAmount: number;
}

export interface EditableDefectLiabilityRow {
  id: string;
  position: string;
  name?: string;
  unit: string;
  rate: number;
  contractQty: number;
  contractAmount: number;
  thisInvoiceQty: number;
  thisInvoiceAmount: number;
  precedingQty?: number;
  precedingAmount?: number;
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
  viewCurrency?: 'ETB' | 'USD';
  exchangeRate?: number;
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
  viewCurrency = 'ETB',
  exchangeRate = 125.0
}) => {
  // Navigation tabs for the tables
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'attendance' | 'reimbursables' | 'dlp' | 'summary'>('all');

  // Staff Directory Filter (All Assigned, Active Only, Replaced History)
  const [personnelFilter, setPersonnelFilter] = useState<'all' | 'active_only' | 'replaced_only'>('all');

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

  // Saved Payment Immutability (Once saved, no change on the amount of the payment)
  const [isPaymentSaved, setIsPaymentSaved] = useState<boolean>(false);
  const [savedPaymentAmount, setSavedPaymentAmount] = useState<number | null>(null);
  const [allowAdminUnlock, setAllowAdminUnlock] = useState<boolean>(false);

  // Editable lists
  const [staffRows, setStaffRows] = useState<EditableStaffRow[]>([]);
  const [reimbursableRows, setReimbursableRows] = useState<EditableReimbursableRow[]>(OFFICIAL_DKS_REIMBURSABLE_DEFAULT);
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
  const [approvedBy, setApprovedBy] = useState<string>('Director General / Project Director (ERA South Region)');

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
    const assignedPosSet = new Set(assignedPersonnel.map(p => (p.position || '').toLowerCase().trim()));
    const missingFromPersonnel: ConsultantPersonnel[] = [];
    
    c1ScheduleStaff.forEach(s => {
      const posKey = (s.position || '').toLowerCase().trim();
      if (!assignedPosSet.has(posKey)) {
        missingFromPersonnel.push({
          id: s.id || `pos_${(s.no || 'item').replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: s.name || 'To be nominated',
          position: s.position,
          category: s.category || 'Key Personnel',
          assignmentDate: project.startDate || '2020-10-01',
          status: 'Active',
          manMonthsAllocated: s.totalMm || 24,
          monthlyBillingRate: s.rateEtb || 15000,
          manMonthsInput: 0
        });
      }
    });

    const effectivePersonnel = [...assignedPersonnel, ...missingFromPersonnel];

    const rows: EditableStaffRow[] = effectivePersonnel.map(p => {
      const cumulative = cumulativeInputs[p.id] || { qty: 0, amount: 0 };
      const matchedSaved = activeInvoice?.attendanceRecords?.find(s => s.id === p.id || s.personnelId === p.id || s.name === p.name || s.position === p.position);

      const pPosLower = (p.position || '').toLowerCase().trim();
      const pNameLower = (p.name || '').toLowerCase().trim();

      const matchedContract = c1ScheduleStaff.find(s => 
        (pNameLower && s.name && s.name !== 'To be nominated' && s.name !== 'TBN' && s.name.toLowerCase().trim() === pNameLower) ||
        (pPosLower && s.position && (
          s.position.toLowerCase().trim() === pPosLower ||
          s.position.toLowerCase().includes(pPosLower) ||
          pPosLower.includes(s.position.toLowerCase().trim())
        ))
      );

      const standardRate = matchedContract?.rateEtb || p.monthlyBillingRate || getStandardRateForPosition(p.position, p.category, p.name);
      const standardDaily = p.dailyReimbursableRate || getStandardDailyReimbRate(p.position);
      
      const mmConstr = matchedContract?.mmConstr;
      const mmDlp = matchedContract?.mmDlp;
      const totalMm = matchedContract?.totalMm ?? (p.manMonthsAllocated || 36);
      const allocatedMM = totalMm;

      let days = 0;
      if (matchedSaved && matchedSaved.daysWorked !== undefined) {
        days = matchedSaved.daysWorked;
      } else if (matchedSaved && matchedSaved.days !== undefined) {
        days = matchedSaved.days;
      }

      const isReplaced = p.status === 'Replaced';
      const precQty = cumulative.qty;
      const precAmt = cumulative.amount;
      const rate = matchedSaved?.rate !== undefined ? matchedSaved.rate : standardRate;
      const contractAmount = matchedContract?.totalEtb ?? (allocatedMM * rate);

      return {
        id: p.id,
        personnelId: p.id,
        position: p.position,
        name: p.name,
        category: p.category,
        status: p.status,
        unit: 'Month',
        rate,
        contractQty: allocatedMM,
        contractAmount,
        mmConstr,
        mmDlp,
        totalMm,
        daysWorked: days,
        precedingQty: precQty,
        precedingAmount: precAmt,
        dailyReimbursableRate: matchedSaved?.dailyReimbursableRate || standardDaily,
        assignmentDate: p.assignmentDate,
        demobilizationDate: p.demobilizationDate,
        replacementDate: p.replacementDate,
        predecessorId: p.predecessorId,
        predecessorName: p.predecessorName,
        replacedById: p.replacedById,
        replacedByName: p.replacedByName,
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
            r.description.toLowerCase().trim() === c.item.toLowerCase().trim() ||
            c.item.toLowerCase().includes(r.description.toLowerCase()) ||
            r.description.toLowerCase().includes(c.item.toLowerCase())
          );
          const cum = cumulativeReimbInputs[c.id || ''] || cumulativeReimbInputs[c.item] || (matchedPrev ? cumulativeReimbInputs[matchedPrev.id] : { qty: 0, amount: 0 }) || { qty: 0, amount: 0 };
          const matchedInv = activeInvoice?.reimbursableRecords?.find((s: any) => 
            s.id === c.id || s.description === c.item || (matchedPrev && s.id === matchedPrev.id)
          );

          const contractAmount = c.amountEtb !== undefined ? c.amountEtb : (matchedPrev?.contractAmount ?? 0);
          const contractQty = matchedPrev?.contractQty ?? 1;
          const rate = matchedPrev?.rate ?? (contractQty > 0 ? Number((contractAmount / contractQty).toFixed(2)) : contractAmount);

          return {
            id: c.id || matchedPrev?.id || `reimb_${idx + 1}`,
            no: c.no || String(idx + 1),
            description: c.item,
            basis: c.basis || matchedPrev?.basis || '',
            unit: matchedPrev?.unit || 'LS',
            rate: rate,
            contractQty: contractQty,
            contractAmount: contractAmount,
            precedingQty: cum.qty,
            precedingAmount: cum.amount,
            thisInvoiceQty: matchedInv?.thisInvoiceQty !== undefined ? matchedInv.thisInvoiceQty : (matchedPrev?.thisInvoiceQty || 0),
            thisInvoiceAmount: matchedInv?.thisInvoiceAmount !== undefined ? matchedInv.thisInvoiceAmount : (matchedPrev?.thisInvoiceAmount || 0)
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
    const c1DlpStaff = c1ScheduleStaff.filter(s => (Number(s.mmDlp) || 0) > 0);
    if (c1DlpStaff.length > 0) {
      setDefectRows(prev => {
        return c1DlpStaff.map((s, idx) => {
          const matched = activeInvoice?.defectLiabilityRecords?.find((d: any) => d.id === s.id || (d.position && d.position.toLowerCase().trim().startsWith(s.position.toLowerCase().trim())))
            || prev.find(p => p.id === s.id || (p.position && p.position.toLowerCase().trim().startsWith(s.position.toLowerCase().trim())));
          
          const dlpMm = Number(s.mmDlp) || 0;
          const rate = Number(s.rateEtb) || 0;
          const contractAmount = dlpMm * rate;
          const nameSuffix = s.name && s.name !== 'To be nominated' ? ` (${s.name})` : '';
          const posLabel = `${s.position}${nameSuffix}`;

          return {
            id: s.id || `dl_${idx + 1}`,
            position: posLabel,
            unit: 'Month',
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
      if (activeInvoice.isPaymentSaved || activeInvoice.paymentLocked || (activeInvoice.savedPaymentAmount !== undefined && activeInvoice.savedPaymentAmount > 0) || (activeInvoice.netAmountEtb !== undefined && activeInvoice.netAmountEtb > 0 && (activeInvoice.status === 'Paid' || activeInvoice.status === 'Certified'))) {
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


  // Format currency helper
  const fmt = (val: number) => {
    return (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const thisAmount = Number((qty * effectiveRate).toFixed(2));
    const precAmount = Number((row.precedingQty * effectiveRate).toFixed(2));
    const toDateQty = Number((row.precedingQty + qty).toFixed(2));
    const toDateAmount = Number((precAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

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
      remainingAmount
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
      const thisInvoiceAmount = rows.reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
      const thisInvoiceQty = rows.reduce((s, r) => s + (r.thisInvoiceQty || 0), 0);
      const precedingAmount = rows.reduce((s, r) => s + (r.precedingAmount || 0), 0);
      const toDateAmount = rows.reduce((s, r) => s + (r.toDateAmount || 0), 0);
      const remainingAmount = rows.reduce((s, r) => s + (r.remainingAmount || 0), 0);

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
        thisInvoiceQty,
        thisInvoiceAmount,
        precedingAmount,
        toDateAmount,
        remainingAmount
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
    const precAmount = Number((row.precedingQty * effectiveRate).toFixed(2));
    const toDateQty = Number((row.precedingQty + row.thisInvoiceQty).toFixed(2));
    const toDateAmount = Number((precAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

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
      remainingAmount
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
    const precAmt = row.precedingAmount !== undefined ? Number(row.precedingAmount) || 0 : Number((precQty * row.rate).toFixed(2));
    const thisQty = Number(row.thisInvoiceQty || 0);
    const thisAmount = row.thisInvoiceAmount !== undefined && row.thisInvoiceAmount > 0
      ? Number(row.thisInvoiceAmount)
      : Number((thisQty * row.rate).toFixed(2));
    const toDateQty = Number((precQty + thisQty).toFixed(2));
    const toDateAmount = Number((precAmt + thisAmount).toFixed(2));
    const contractQty = Number(row.contractQty || 0);
    const contractAmount = row.contractAmount || Number((contractQty * row.rate).toFixed(2));
    const remainingQty = Math.max(0, Number((contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((contractAmount - toDateAmount).toFixed(2)));

    return {
      ...row,
      contractAmount,
      contractQty,
      computedThisAmount: thisAmount,
      precedingQty: precQty,
      precedingAmount: precAmt,
      toDateQty,
      toDateAmount,
      remainingQty,
      remainingAmount
    };
  });

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

  // Once the payment is saved, no change on the amount of the payment unless explicitly unlocked by admin
  const isPaymentLocked = isPaymentSaved && !allowAdminUnlock && savedPaymentAmount !== null;
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

  // USD Mode Active (when enableUsdPayments is on, or project.enableUsdPayments, or advancedSplitMode is enabled)
  const isUsdModeActive = Boolean(
    consultant.enableUsdPayments ||
    project.enableUsdPayments ||
    consultant.advancedSplitMode ||
    viewCurrency === 'USD' ||
    (consultant.originalFeeUsd && consultant.originalFeeUsd > 0) ||
    (consultant.contractAmountSchedule?.condition1?.summary?.feesUsd && consultant.contractAmountSchedule.condition1.summary.feesUsd > 0)
  );

  // USD Contract and Invoice Totals for Table 5
  const linkedFeesContractUsd = consultant.contractAmountSchedule?.condition1?.summary?.feesUsd ?? 0;
  const linkedReimbContractUsd = consultant.contractAmountSchedule?.condition1?.summary?.reimbursableUsd ?? 0;
  const subTotal3ContractUsd = 0;
  const totalBaseContractUsd = linkedFeesContractUsd + linkedReimbContractUsd + subTotal3ContractUsd;
  const contingencyContractUsd = Number((totalBaseContractUsd * (contingencyRatePct / 100)).toFixed(2));
  const grandContractWithContingencyUsd = totalBaseContractUsd + contingencyContractUsd;
  const vatContractUsd = Number((grandContractWithContingencyUsd * (vatRatePct / 100)).toFixed(2));
  const totalContractDueUsd = grandContractWithContingencyUsd + vatContractUsd;

  const subTotal1ThisInvoiceUsd = useMemo(() => {
    if (!isUsdModeActive) return 0;
    const c1 = consultant.contractAmountSchedule?.condition1;
    const c1ExchangeRate = Number(c1?.currencySplitExchangeRate || c1?.exchangeRate || 120);
    let total = 0;
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
        const matchedC2 = (consultant.contractAmountSchedule?.condition2?.staffFees || []).find(
          f => (f.name && f.name.toLowerCase().trim() === s.name.toLowerCase().trim()) || (f.position && f.position.toLowerCase().trim() === s.position.toLowerCase().trim())
        );
        if (matchedC2 && matchedC2.rateUsd) {
          usdRateForStaff = Number(matchedC2.rateUsd) || 0;
        }
      }
      total += Number((qty * usdRateForStaff).toFixed(2));
    });
    return total;
  }, [staffRows, consultant, totalDaysInMonth]);

  const subTotal2ThisInvoiceUsd = useMemo(() => {
    if (!isUsdModeActive) return 0;
    const c1 = consultant.contractAmountSchedule?.condition1;
    const c1ExchangeRate = Number(c1?.currencySplitExchangeRate || c1?.exchangeRate || 120);
    let total = 0;
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
      total += usdAmount;
    });
    return total;
  }, [reimbursableRows, consultant]);

  const subTotal3ThisInvoiceUsd = 0;
  const totalSubtotalThisInvoiceUsd = subTotal1ThisInvoiceUsd + subTotal2ThisInvoiceUsd + subTotal3ThisInvoiceUsd;
  const contingencyThisInvoiceUsd = Number((contingencyThisInvoiceClaimUsd || 0).toFixed(2));
  const contingencyToDateUsdValue = contingencyToDateUsd > 0 ? contingencyToDateUsd : contingencyContractUsd;
  // Previous month amount (Preceding Claim USD) computed dynamically: Preceding USD = To-Date USD - This Month USD
  const contingencyPrecedingClaimUsd = Math.max(0, Number((contingencyToDateUsdValue - contingencyThisInvoiceUsd).toFixed(2)));
  const subtotalWithContingencyThisInvoiceUsd = totalSubtotalThisInvoiceUsd + contingencyThisInvoiceUsd;
  const vatThisInvoiceUsd = Number((subtotalWithContingencyThisInvoiceUsd * (vatRatePct / 100)).toFixed(2));
  const grossPayableBaseUsd = subtotalWithContingencyThisInvoiceUsd + vatThisInvoiceUsd;

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

  // Reimbursables Editing
  const handleUpdateReimbursable = (id: string, updates: Partial<EditableReimbursableRow>) => {
    setReimbursableRows(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.rate !== undefined || updates.contractQty !== undefined) {
          updated.contractAmount = Number(((updated.rate || 0) * (updated.contractQty || 0)).toFixed(2));
        }
        if (updates.thisInvoiceQty !== undefined && updates.thisInvoiceAmount === undefined) {
          updated.thisInvoiceAmount = Number(((updates.thisInvoiceQty || 0) * updated.rate).toFixed(2));
        }
        return updated;
      }
      return item;
    }));
  };

  const handleAddReimbursable = () => {
    const newId = `reimb_custom_${Date.now()}`;
    const newRow: EditableReimbursableRow = {
      id: newId,
      description: 'Additional Direct Field Expense',
      unit: 'Month',
      rate: 15000.00,
      contractQty: 12,
      contractAmount: 180000.00,
      thisInvoiceQty: 0,
      thisInvoiceAmount: 0,
      precedingQty: 0,
      precedingAmount: 0
    };
    setReimbursableRows(prev => [...prev, newRow]);
  };

  const handleDeleteReimbursable = (id: string) => {
    if (reimbursableRows.length <= 1) return;
    setReimbursableRows(prev => prev.filter(item => item.id !== id));
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
        if (updates.thisInvoiceQty !== undefined) {
          const qty = Number(updates.thisInvoiceQty) || 0;
          updated.thisInvoiceAmount = Number((qty * (updated.rate || item.rate)).toFixed(2));
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
    const { nextPeriodStr, nextDaysInMonth, nextMonthName } = computeNextBillingPeriod(`${billingMonth} ${billingYear}`);
    const nextInvNo = computeNextInvoiceNumber(invoiceNo);

    const confirmMsg = `Proceed and roll forward invoice to next month?\n\n` +
      `• New Billing Period: ${nextPeriodStr}\n` +
      `• New Invoice No: ${nextInvNo}\n` +
      `• Roll Forward Rule: Current 'To-Date' amounts will lock into 'Preceding' history.\n` +
      `• Replaced Personnel: Predecessor records are permanently preserved in historical audit.\n` +
      `• Active Successors: Days worked resets to 0 for ${nextMonthName} attendance logging.`;

    if (!window.confirm(confirmMsg)) return;

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

    // Build and automatically save the new month invoice
    const newMonthInvoice: ConsultantInvoice = {
      id: `inv_${Date.now()}`,
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
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    onSaveInvoice(newMonthInvoice);
    setSaveSuccessMsg(`Proceeded to ${nextMonthName}! New invoice ${nextInvNo} created. Assigned personnel MM inputs updated.`);
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
      const totalPages = 4;

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
      // PAGE 1: TABLE 1 — MONTHLY PERSONNEL ATTENDANCE RECORD & INPUT DERIVATION
      // =========================================================================
      drawPageHeader(1, "Table 1: Personnel Attendance Record & Input Derivation");
      let y = margin + 52;

      // Formula notification box
      const boxH = isCompactPdfMode ? 16 : 20;
      doc.setFillColor(239, 246, 255); // blue-50
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(margin + 6, y, contentWidth - 12, boxH, 3, 3, 'DF');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6.5 : 7);
      doc.setTextColor(30, 64, 175);
      doc.text("Derived Man-Month (MM) Formula:", margin + 14, y + (boxH * 0.65));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Derived MM Input = Days Worked ÷ Month Length (${totalDaysInMonth} Days) • Contract Staff Rates Linked to Contract Table 1.3`, margin + 142, y + (boxH * 0.65));

      y += boxH + (isCompactPdfMode ? 4 : 6);

      // Table 1 Headers (Total width = 756 pt)
      const t1Headers = [
        { title: 'No', width: 24, align: 'center' },
        { title: 'Supervisory Position', width: 130, align: 'left' },
        { title: 'Assigned Personnel Name', width: 115, align: 'left' },
        { title: 'Category', width: 70, align: 'left' },
        { title: 'Days Worked', width: 50, align: 'right' },
        { title: 'Month Days', width: 50, align: 'right' },
        { title: 'Derived MM', width: 55, align: 'right' },
        { title: 'Contract Rate (ETB)', width: 80, align: 'right' },
        { title: 'This Month (ETB)', width: 82, align: 'right' },
        { title: 'Preceding MM', width: 50, align: 'right' },
        { title: 'To-Date MM', width: 50, align: 'right' }
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
        if (y > pageHeight - margin - 35) return; // stay within page height

        // Word-wrap long strings
        const posLines = doc.splitTextToSize(row.position || '', 130 - 4);
        const nameLines = doc.splitTextToSize(row.name || '', 115 - 4);
        const catLines = doc.splitTextToSize(row.category || 'Professional', 70 - 4);
        const maxLines = Math.max(posLines.length, nameLines.length, catLines.length, 1);
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
        doc.text(String(idx + 1), rX + 12, y + textYOffset, { align: 'center' });
        rX += 24;

        // Position (Wrapped)
        doc.setFont('helvetica', 'bold');
        posLines.forEach((line: string, lIdx: number) => {
          doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
        });
        doc.setFont('helvetica', 'normal');
        rX += 130;

        // Name (Wrapped)
        nameLines.forEach((line: string, lIdx: number) => {
          doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
        });
        rX += 115;

        // Category (Wrapped)
        catLines.forEach((line: string, lIdx: number) => {
          doc.text(line, rX + 2, y + textYOffset + (lIdx * lineStep));
        });
        rX += 70;

        // Days Worked
        doc.text(String(row.daysWorked || 0), rX + 50 - 2, y + textYOffset, { align: 'right' });
        rX += 50;

        // Month Days
        doc.text(String(totalDaysInMonth), rX + 50 - 2, y + textYOffset, { align: 'right' });
        rX += 50;

        // Derived MM
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(row.thisInvoiceQty.toFixed(2), rX + 55 - 2, y + textYOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        rX += 55;

        // Rate
        doc.text(fmt(row.effectiveRate || row.rate), rX + 80 - 2, y + textYOffset, { align: 'right' });
        rX += 80;

        // This Month Amount
        doc.setFont('helvetica', 'bold');
        doc.text(fmt(row.thisInvoiceAmount), rX + 82 - 2, y + textYOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        rX += 82;

        // Preceding MM
        doc.text(row.precedingQty.toFixed(2), rX + 50 - 2, y + textYOffset, { align: 'right' });
        rX += 50;

        // To-Date MM
        doc.setFont('helvetica', 'bold');
        doc.text(row.toDateQty.toFixed(2), rX + 50 - 2, y + textYOffset, { align: 'right' });

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
      doc.text("TOTAL SUB-TOTAL 1 (SUPERVISORY PERSONNEL REMUNERATION CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      const totDerivedMM = displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceQty, 0).toFixed(2);
      const totThisMonthClaim = displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceAmount, 0);
      const totToDateMM = displayFeeRowsComputed.reduce((s, r) => s + r.toDateQty, 0).toFixed(2);

      let t1X = margin + 8 + 24 + 130 + 115 + 70 + 50 + 50;
      doc.text(`${totDerivedMM} MM`, t1X + 55 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t1X += 55 + 80;
      doc.text(`${fmt(totThisMonthClaim)} ETB`, t1X + 82 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t1X += 82 + 50;
      doc.text(`${totToDateMM} MM`, t1X + 50 - 2, y + (totalsBoxH * 0.65), { align: 'right' });

      // =========================================================================
      // PAGE 2: SUB TOTAL 2 — REIMBURSABLE DIRECT OPERATING EXPENSES SCHEDULE
      // =========================================================================
      doc.addPage();
      drawPageHeader(2, "Sub Total 2: Reimbursable Direct Operating Expenses Schedule");
      y = margin + 52;

      // Table 2 Headers (Total width = 756 pt)
      const t2Headers = [
        { title: 'Item', width: 24, align: 'center' },
        { title: 'Description of Direct Expenses', width: 180, align: 'left' },
        { title: 'Unit', width: 36, align: 'center' },
        { title: 'Contract Rate', width: 65, align: 'right' },
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
      t2Headers.forEach(h => {
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

        const descLines = doc.splitTextToSize(row.description || '', 180 - 4);
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
      doc.text("SUB TOTAL 2 (REIMBURSABLE DIRECT OPERATING EXPENSES CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      let t2x = margin + 8 + 24 + 180 + 36 + 65 + 40;
      doc.text(`${fmt(subTotal2Contract)} ETB`, t2x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t2x += 75 + 40;
      doc.text(fmt(subTotal2Preceding), t2x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t2x += 70 + 45;
      doc.text(`${fmt(subTotal2ThisInvoice)} ETB`, t2x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t2x += 75 + 36;
      doc.text(fmt(subTotal2ToDate), t2x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });

      // =========================================================================
      // PAGE 3: SUB TOTAL 3 — DEFECT LIABILITY PERIOD STAFF REMUNERATION SCHEDULE
      // =========================================================================
      doc.addPage();
      drawPageHeader(3, "Sub Total 3: Defect Liability Period Staff Remuneration Schedule");
      y = margin + 52;

      // Table 3 Headers (Total width = 756 pt)
      const t3Headers = [
        { title: 'Item', width: 24, align: 'center' },
        { title: 'Defect Liability Supervisory Position & Staff', width: 180, align: 'left' },
        { title: 'Unit', width: 36, align: 'center' },
        { title: 'Contract Rate', width: 65, align: 'right' },
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

        const posLines = doc.splitTextToSize(row.position || '', 180 - 4);
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

        doc.setDrawColor(241, 245, 249);
        doc.line(margin + 6, y + rowH, margin + contentWidth - 6, y + rowH);
        y += rowH;
      });

      // Table 3 Totals Row
      doc.setFillColor(238, 242, 255);
      doc.rect(margin + 6, y, contentWidth - 12, totalsBoxH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompactPdfMode ? 6 : 6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("SUB TOTAL 3 (DEFECT LIABILITY PERSONNEL ALLOCATION CLAIM):", margin + 14, y + (totalsBoxH * 0.65));

      let t3x = margin + 8 + 24 + 180 + 36 + 65 + 40;
      doc.text(`${fmt(subTotal3Contract)} ETB`, t3x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t3x += 75 + 40;
      doc.text(fmt(subTotal3Preceding), t3x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t3x += 70 + 45;
      doc.text(`${fmt(subTotal3ThisInvoice)} ETB`, t3x + 75 - 2, y + (totalsBoxH * 0.65), { align: 'right' });
      t3x += 75 + 36;
      doc.text(fmt(subTotal3ToDate), t3x + 70 - 2, y + (totalsBoxH * 0.65), { align: 'right' });

      // =========================================================================
      // PAGE 4: TABLE 5 — CONSOLIDATED SUMMARY & NET PAYMENT COMPUTATION
      // =========================================================================
      doc.addPage();
      drawPageHeader(4, "Table 5: Consolidated Summary & Net Payment Computation");
      y = margin + 52;

      // Table 5 Headers (Total width = 756 pt)
      const t5Headers = [
        { title: 'Item', width: 28, align: 'center' },
        { title: 'Claim Component Description', width: 220, align: 'left' },
        { title: `Contract Baseline (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 108, align: 'right' },
        { title: 'Preceding Claim (ETB)', width: 95, align: 'right' },
        { title: `This Month (${isUsdModeActive ? 'ETB / USD' : 'ETB'})`, width: 110, align: 'right' },
        { title: 'To-Date Claim (ETB)', width: 100, align: 'right' },
        { title: 'Remaining Balance (ETB)', width: 95, align: 'right' }
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
          preceding: fmt(subTotal1Preceding),
          toDate: fmt(subTotal1ToDate),
          remaining: fmt(Math.max(0, linkedFeesContract - subTotal1ToDate))
        },
        {
          item: '2',
          desc: 'Sub Total 2 (Reimbursable Operating Direct Costs — Per Diem, Transport, Communication)',
          contract: isUsdModeActive && linkedReimbContractUsd > 0 ? `${fmt(linkedReimbContract)}\n($${fmt(linkedReimbContractUsd)})` : fmt(linkedReimbContract),
          thisMonth: isUsdModeActive && subTotal2ThisInvoiceUsd > 0 ? `${fmt(subTotal2ThisInvoice)}\n($${fmt(subTotal2ThisInvoiceUsd)})` : fmt(subTotal2ThisInvoice),
          preceding: fmt(subTotal2Preceding),
          toDate: fmt(subTotal2ToDate),
          remaining: fmt(Math.max(0, linkedReimbContract - subTotal2ToDate))
        },
        {
          item: '3',
          desc: 'Sub Total 3 (Defect Liability Personnel Allocation)',
          contract: fmt(subTotal3Contract),
          thisMonth: fmt(subTotal3ThisInvoice),
          preceding: subTotal3Preceding > 0 ? fmt(subTotal3Preceding) : '-',
          toDate: fmt(subTotal3ToDate),
          remaining: fmt(subTotal3Remaining)
        },
        {
          item: 'A+B',
          desc: 'SUBTOTAL DIRECT SERVICES & EXPENSES (1 + 2 + 3)',
          contract: isUsdModeActive && totalBaseContractUsd > 0 ? `${fmt(totalBaseContract)}\n($${fmt(totalBaseContractUsd)})` : fmt(totalBaseContract),
          thisMonth: isUsdModeActive && totalSubtotalThisInvoiceUsd > 0 ? `${fmt(totalSubtotalThisInvoice)}\n($${fmt(totalSubtotalThisInvoiceUsd)})` : fmt(totalSubtotalThisInvoice),
          preceding: fmt(totalSubtotalPreceding),
          toDate: fmt(totalSubtotalToDate),
          remaining: fmt(Math.max(0, totalBaseContract - totalSubtotalToDate)),
          isBold: true
        },
        {
          item: '4',
          desc: `Contingency Provision (${contingencyRatePct}% Contract Ceiling)`,
          contract: isUsdModeActive && contingencyContractUsd > 0 ? `${fmt(contingencyContract)}\n($${fmt(contingencyContractUsd)})` : fmt(contingencyContract),
          thisMonth: isUsdModeActive && contingencyThisInvoiceUsd > 0 ? `${fmt(contingencyThisInvoice)}\n($${fmt(contingencyThisInvoiceUsd)})` : fmt(contingencyThisInvoice),
          preceding: isUsdModeActive && contingencyPrecedingClaimUsd > 0 ? `${fmt(contingencyPrecedingClaim)}\n($${fmt(contingencyPrecedingClaimUsd)})` : fmt(contingencyPrecedingClaim),
          toDate: isUsdModeActive && contingencyToDateUsdValue > 0 ? `${fmt(contingencyToDate)}\n($${fmt(contingencyToDateUsdValue)})` : fmt(contingencyToDate),
          remaining: isUsdModeActive && Math.max(0, contingencyContractUsd - contingencyToDateUsdValue) > 0 ? `${fmt(Math.max(0, contingencyContract - contingencyToDate))}\n($${fmt(Math.max(0, contingencyContractUsd - contingencyToDateUsdValue))})` : fmt(Math.max(0, contingencyContract - contingencyToDate))
        },
        {
          item: '5',
          desc: `Value Added Tax (${vatRatePct}% VAT)`,
          contract: isUsdModeActive && vatContractUsd > 0 ? `${fmt(vatContract)}\n($${fmt(vatContractUsd)})` : fmt(vatContract),
          thisMonth: isUsdModeActive && vatThisInvoiceUsd > 0 ? `${fmt(vatThisInvoice)}\n($${fmt(vatThisInvoiceUsd)})` : fmt(vatThisInvoice),
          preceding: fmt(vatPreceding),
          toDate: fmt(vatToDate),
          remaining: fmt(Math.max(0, vatContract - vatToDate))
        },
        {
          item: '6',
          desc: 'GROSS INVOICE CLAIM AMOUNT (ETB)',
          contract: isUsdModeActive && totalContractDueUsd > 0 ? `${fmt(totalContractDue)}\n($${fmt(totalContractDueUsd)})` : fmt(totalContractDue),
          thisMonth: isUsdModeActive && grossPayableBaseUsd > 0 ? `${fmt(grossPayableBase)}\n($${fmt(grossPayableBaseUsd)})` : fmt(grossPayableBase),
          preceding: fmt(grossPreceding),
          toDate: fmt(grossToDate),
          remaining: fmt(Math.max(0, totalContractDue - grossToDate)),
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
        const maxLines = Math.max(descLines.length, contractLines.length, thisMonthLines.length, 1);
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
        doc.text(r.preceding, roX + 95 - 2, y + textYOffset, { align: 'right' });
        roX += 95;

        // This Month
        if (r.isNetPayable) doc.setTextColor(5, 150, 105);
        thisMonthLines.forEach((line: string, lIdx: number) => {
          doc.text(line, roX + 110 - 2, y + textYOffset + (lIdx * lineStep), { align: 'right' });
        });
        if (r.isNetPayable) doc.setTextColor(6, 95, 70);
        roX += 110;

        // To-Date
        doc.text(r.toDate, roX + 100 - 2, y + textYOffset, { align: 'right' });
        roX += 100;

        // Remaining
        doc.text(r.remaining, roX + 95 - 2, y + textYOffset, { align: 'right' });

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

      // Official 4 Sign-Off Signatures Block
      const signW = (contentWidth - 12) / 4;
      const signY = y + (isCompactPdfMode ? 1 : 2);

      const signees = [
        { title: 'PREPARED BY', name: preparedBy || 'Resident Engineer', role: 'Resident Engineer / Team Leader' },
        { title: 'CHECKED BY', name: checkedBy || 'Payment Officer', role: 'Payment & Valuation Officer' },
        { title: 'REVIEWED BY', name: reviewedBy || 'Lead Engineer', role: 'Lead Supervision Engineer' },
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
      {/* Top Banner & Header Information Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                  Monthly Supervision Fee Invoice Calculation Tables
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200">
                  Linked to Contract Amount Schedule
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>Staff list & billing rates linked directly to Contract Amount (Table 1.3).</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBackToLedger && (
              <button
                type="button"
                onClick={onBackToLedger}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Invoices Ledger
              </button>
            )}

            {/* NAVIGATE TO CONTRACT AMOUNT */}
            {onNavigateToContractAmount && (
              <button
                type="button"
                onClick={onNavigateToContractAmount}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="View & Edit Master Contract Price, Construction Remuneration, and DLP Schedules"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Go to Contract Amount</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {/* SYNC WITH CONTRACT AMOUNT SCHEDULE */}
            <button
              type="button"
              onClick={handleSyncFromContractSchedule}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Refresh staff rates, reimbursables, and DLP allocations from Contract Amount Schedule"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              Sync from Contract Schedule
            </button>

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
                    <td colSpan={11} className="py-8 text-center text-slate-400">
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
                  <td colSpan={4} className="py-2.5 px-3 text-slate-700 dark:text-slate-200 uppercase text-[10px]">
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
              <p className="text-xs text-slate-500 mt-0.5">
                Direct field operating expenses (per diem, transport, communications, reports). Enter claimed quantity or claim amount for this period to compute Sub Total 2 before Table 5.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold rounded-xl text-xs border border-amber-200 dark:border-amber-800">
                This Month Claim: <span className="font-mono">{fmt(subTotal2ThisInvoice)} ETB</span>
              </span>
              <button
                type="button"
                onClick={handleAddReimbursable}
                disabled={isPaymentLocked}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reimbursable</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Rate (ETB)</th>
                  <th className="py-2.5 px-2 text-right min-w-[80px]">Contract Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">Contract Amount</th>
                  <th className="py-2.5 px-2 text-right min-w-[80px]">Preceding Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[105px]">Preceding Amount</th>
                  <th className="py-2.5 px-2 text-center min-w-[100px] bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 font-black">
                    This Month Claim Qty
                  </th>
                  <th className="py-2.5 px-3 text-right min-w-[125px] bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-black">
                    This Month Claim (ETB)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[80px]">To-Date Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">To-Date Amount</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] text-emerald-600 font-bold">Remaining Balance</th>
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {reimbursableRowsComputed.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-400">
                      No reimbursable operating expenses defined. Click "+ Add Reimbursable" to add.
                    </td>
                  </tr>
                ) : (
                  reimbursableRowsComputed.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
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
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-bold"
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
                      <td className="py-2 px-2 text-center font-mono">
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
                          onChange={(e) => handleUpdateReimbursable(row.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        <input
                          type="number"
                          step="any"
                          value={row.contractQty}
                          disabled={isPaymentLocked}
                          onChange={(e) => handleUpdateReimbursable(row.id, { contractQty: parseFloat(e.target.value) || 0 })}
                          className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {fmt(row.contractAmount)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-500">
                        {(row.precedingQty || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {fmt(row.precedingAmount || 0)}
                      </td>
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
                              thisInvoiceAmount: Number((qty * row.rate).toFixed(2))
                            });
                          }}
                          className={`w-20 text-center px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                            isPaymentLocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                              : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold bg-amber-50/40 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.computedThisAmount}
                          disabled={isPaymentLocked}
                          onChange={(e) => {
                            const amt = parseFloat(e.target.value) || 0;
                            handleUpdateReimbursable(row.id, { 
                              thisInvoiceAmount: amt,
                              thisInvoiceQty: row.rate > 0 ? Number((amt / row.rate).toFixed(2)) : row.thisInvoiceQty
                            });
                          }}
                          className={`w-28 text-right px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                            isPaymentLocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                              : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        {row.toDateQty.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {fmt(row.toDateAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(row.remainingAmount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteReimbursable(row.id)}
                          disabled={isPaymentLocked}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded transition cursor-pointer"
                          title="Delete reimbursable line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-amber-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-amber-900 dark:text-amber-200 uppercase text-[10px] font-black">
                    Sub-Total 2 (Reimbursable Direct Operating Costs):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {fmt(subTotal2Contract)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {fmt(subTotal2Preceding)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 dark:text-amber-300">
                    {fmt(subTotal2ThisInvoice)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">
                    {fmt(subTotal2ToDate)} ETB
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {fmt(subTotal2Remaining)} ETB
                  </td>
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
              <p className="text-xs text-slate-500 mt-0.5">
                Defect Liability Period supervisory personnel allocation. Enter man-months expended for this billing period to compute Sub Total 3 before Table 5.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold rounded-xl text-xs border border-indigo-200 dark:border-indigo-800">
                This Month Claim: <span className="font-mono">{fmt(subTotal3ThisInvoice)} ETB</span>
              </span>
              <button
                type="button"
                onClick={handleAddDefectRow}
                disabled={isPaymentLocked}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add DLP Position</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">DLP Personnel Position & Name</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[105px]">Monthly Rate (ETB)</th>
                  <th className="py-2.5 px-2 text-right min-w-[90px]">Contract MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">Contract Amount</th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]">Preceding MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[105px]">Preceding Claim</th>
                  <th className="py-2.5 px-2 text-center min-w-[100px] bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-black">
                    This Month MM Input
                  </th>
                  <th className="py-2.5 px-3 text-right min-w-[125px] bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-black">
                    This Month Claim (ETB)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]">To-Date MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">To-Date Claim</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] text-emerald-600 font-bold">Remaining Balance</th>
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {defectRowsComputed.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-400">
                      No DLP personnel allocation rows defined. Click "+ Add DLP Position" to add.
                    </td>
                  </tr>
                ) : (
                  defectRowsComputed.map((row, idx) => (
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
                      <td className="py-2 px-2 text-right font-mono text-slate-500">
                        {(row.precedingQty || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {fmt(row.precedingAmount || 0)}
                      </td>
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
                              thisInvoiceAmount: Number((mm * row.rate).toFixed(2))
                            });
                          }}
                          className={`w-20 text-center px-1.5 py-1 rounded border font-mono font-bold text-xs ${
                            isPaymentLocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                              : 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                        {fmt(row.computedThisAmount)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        {row.toDateQty.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {fmt(row.toDateAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(row.remainingAmount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteDefectRow(row.id)}
                          disabled={isPaymentLocked}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded transition cursor-pointer"
                          title="Delete DLP position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-indigo-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-indigo-900 dark:text-indigo-200 uppercase text-[10px] font-black">
                    Sub-Total 3 (Defect Liability Personnel Allocation):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {fmt(subTotal3Contract)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {fmt(subTotal3Preceding)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-700 dark:text-indigo-300">
                    {fmt(subTotal3ThisInvoice)} ETB
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">
                    {fmt(subTotal3ToDate)} ETB
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {fmt(subTotal3Remaining)} ETB
                  </td>
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
              <p className="text-xs text-slate-500 mt-0.5">
                Official Ethiopian Roads Administration summary sheet with 15% VAT, contractual deductions, and net payable in Ethiopian Birr.
              </p>
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
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal1ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal1ThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, linkedFeesContract - subTotal1ToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">${fmt(Math.max(0, linkedFeesContractUsd - subTotal1ThisInvoiceUsd))}</td>}
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
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal2ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(subTotal2ThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, linkedReimbContract - subTotal2ToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">${fmt(Math.max(0, linkedReimbContractUsd - subTotal2ThisInvoiceUsd))}</td>}
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
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/20">$0.00</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal3ThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">$0.00</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{subTotal3Preceding > 0 ? fmt(subTotal3Preceding) : '-'}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(subTotal3ToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">$0.00</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(subTotal3Remaining)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">$0.00</td>}
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
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black">{fmt(totalSubtotalToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(totalSubtotalThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {fmt(Math.max(0, totalBaseContract - totalSubtotalToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(Math.max(0, totalBaseContractUsd - totalSubtotalThisInvoiceUsd))}</td>}
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
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {fmt(contingencyToDate)}
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20">
                        ${fmt(contingencyToDateUsdValue)}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {fmt(Math.max(0, contingencyContract - contingencyToDate))}
                    </td>
                    {isUsdModeActive && (
                      <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">
                        ${fmt(Math.max(0, contingencyContractUsd - contingencyThisInvoiceUsd))}
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
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300">{fmt(vatContract)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatContractUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/30">
                      {fmt(vatThisInvoice)}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-purple-600/80">{fmt(vatPreceding)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300">{fmt(vatToDate)}</td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(vatThisInvoiceUsd)}</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      {fmt(Math.max(0, vatContract - vatToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-2.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-50/20">${fmt(Math.max(0, vatContractUsd - vatThisInvoiceUsd))}</td>}
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
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">{fmt(grossToDate)}</td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 font-black bg-purple-50/20">${fmt(grossPayableBaseUsd)}</td>}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {fmt(Math.max(0, totalContractDue - grossToDate))}
                    </td>
                    {isUsdModeActive && <td className="py-3 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50/20">${fmt(Math.max(0, totalContractDueUsd - grossPayableBaseUsd))}</td>}
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
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-normal">
                          Official ERA Net Payment Certificate: Gross Invoice Claim minus 15% VAT, minus contractual deductions, plus overtime.
                        </span>
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
                    {isUsdModeActive && <td className="py-3.5 px-4 text-right font-mono text-purple-600/80 bg-purple-50/20">-</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-800 dark:text-emerald-200 font-black">
                      {fmt(netToDate)} ETB
                    </td>
                    {isUsdModeActive && (
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/20 font-black text-base">
                        ${fmt(Math.max(0, grossPayableBaseUsd - vatThisInvoiceUsd))}
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

            {/* Project Verification & Certification Sign-Offs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Prepared By:</span>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 block">Resident Engineer / Team Leader</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Checked By:</span>
                <input
                  type="text"
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 block">Payment & Valuation Officer</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Reviewed By:</span>
                <input
                  type="text"
                  value={reviewedBy}
                  onChange={(e) => setReviewedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 block">Lead Supervision Engineer</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Certified & Approved By:</span>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                />
                <span className="text-[10px] text-slate-500 block">Director General / Project Director (ERA)</span>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Saving updates the project's Supervision Invoices register and synchronizes with the financial ledger.</span>
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

                <button
                  type="button"
                  onClick={handleProceedToNextMonth}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Proceed to next month, carry forward cumulative inputs into preceding totals, and preserve predecessor records"
                >
                  <FastForward className="w-4 h-4" />
                  Proceed to Next Month
                </button>

                <button
                  type="button"
                  onClick={handleExportMonthlyInvoicePDF}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Export Tables 1 & 5 as an official formatted Ethiopian Roads Administration monthly certificate PDF report"
                >
                  <FileDown className="w-4 h-4" />
                  Export Invoice PDF
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save & Synchronize Invoice with Ledger
                </button>
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

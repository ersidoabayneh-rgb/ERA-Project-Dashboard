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
  ArrowLeft,
  ChevronRight,
  Info,
  ArrowRightLeft,
  History,
  UserCheck,
  UserX,
  FastForward,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Project, SupervisionConsultantInfo, ConsultantInvoice, ConsultantPersonnel } from '../types';

export interface EditableStaffRow {
  id: string;
  personnelId?: string;
  position: string;
  name: string;
  unit: string;
  rate: number;
  contractQty: number;
  contractAmount: number;
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
  description: string;
  unit: string;
  rate: number;
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
  unit: string;
  rate: number;
  contractQty: number;
  contractAmount: number;
  thisInvoiceQty: number;
  thisInvoiceAmount: number;
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
}

export const MonthlyInvoiceCalculationTable: React.FC<MonthlyInvoiceCalculationTableProps> = ({
  project,
  consultant,
  activeInvoice,
  onSaveInvoice,
  onBackToLedger,
  onSelectInvoice,
  onUpdateConsultantPersonnel
}) => {
  // Navigation tabs for the tables
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'attendance' | 'feeBreakdown' | 'reimbursable' | 'defectLiability' | 'summary'>('all');

  // Staff Directory Filter (All Assigned, Active Only, Replaced History)
  const [personnelFilter, setPersonnelFilter] = useState<'all' | 'active_only' | 'replaced_only'>('all');

  // Metadata
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

  // Editable lists
  const [staffRows, setStaffRows] = useState<EditableStaffRow[]>([]);
  const [reimbursableRows, setReimbursableRows] = useState<EditableReimbursableRow[]>(OFFICIAL_DKS_REIMBURSABLE_DEFAULT);
  const [defectRows, setDefectRows] = useState<EditableDefectLiabilityRow[]>(OFFICIAL_DKS_DEFECT_LIABILITY_DEFAULT);

  // Financial percentages and deductions
  const [contingencyRatePct, setContingencyRatePct] = useState<number>(5.0);
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

  // Helper: Standard billing rate estimator based on supervisory position and category
  const getStandardRateForPosition = (position: string, category?: string): number => {
    const pos = (position || '').toLowerCase();
    if (pos.includes('resident engineer') || pos.includes('team leader')) return 39500.00;
    if (pos.includes('highway') || pos.includes('pavement')) return 31630.00;
    if (pos.includes('structural') || pos.includes('bridge')) return 31630.00;
    if (pos.includes('material') || pos.includes('geotechnical')) return 31630.00;
    if (pos.includes('quantity surveyor') || pos.includes('contract') || pos.includes('claim')) return 31630.00;
    if (pos.includes('hydrologist') || pos.includes('drainage')) return 31630.00;
    if (pos.includes('surveyor') && pos.includes('senior')) return 28467.00;
    if (pos.includes('environmental') || pos.includes('sociolog')) return 28467.00;
    if (pos.includes('safety') || pos.includes('ohs') || pos.includes('health')) return 28467.00;
    if (pos.includes('support') && pos.includes('engineer')) return 22000.00;
    if (pos.includes('junior')) return 20500.00;
    if (pos.includes('surveyor')) return 17630.00;
    if (pos.includes('laboratory') || pos.includes('technician')) return 17630.00;
    if (pos.includes('inspector')) return 17630.00;
    if (pos.includes('draft')) return 17630.00;
    if (pos.includes('secretary')) return 17630.00;
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

    const rows: EditableStaffRow[] = assignedPersonnel.map(p => {
      const cumulative = cumulativeInputs[p.id] || { qty: 0, amount: 0 };
      const matchedSaved = activeInvoice?.attendanceRecords?.find(s => s.id === p.id || s.personnelId === p.id || s.name === p.name || s.position === p.position);

      const standardRate = p.monthlyBillingRate || getStandardRateForPosition(p.position, p.category);
      const standardDaily = p.dailyReimbursableRate || getStandardDailyReimbRate(p.position);
      const allocatedMM = p.manMonthsAllocated || 36;

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
        contractAmount: allocatedMM * rate,
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
    setReimbursableRows(prev => prev.map(r => {
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
    }));
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
      if (activeInvoice.contingencyRate !== undefined) setContingencyRatePct(activeInvoice.contingencyRate);
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

  // Convert numbers to text words
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Birr Only';
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
    const centsWords = cents > 0 ? ` and ${inWords(cents).trim()} Cents` : ' and Zero Cents';
    return `${wholeWords} Birr${centsWords} Only`;
  };

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

  // --- Dynamic Computations for Table 1 & 2 (Fees) ---
  const feeRowsComputed = staffRows.map(row => {
    const qty = row.daysWorked > 0 ? Number((row.daysWorked / totalDaysInMonth).toFixed(2)) : 0;
    const thisAmount = Number((qty * row.rate).toFixed(2));
    const toDateQty = Number((row.precedingQty + qty).toFixed(2));
    const toDateAmount = Number((row.precedingAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((row.contractAmount - toDateAmount).toFixed(2)));

    return {
      ...row,
      thisInvoiceQty: qty,
      thisInvoiceAmount: thisAmount,
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

  // --- Dynamic Computations for Table 3 (Reimbursable) ---
  const reimbursableRowsComputed = reimbursableRows.map(row => {
    const thisAmount = row.thisInvoiceAmount !== undefined && row.thisInvoiceAmount !== 0
      ? row.thisInvoiceAmount
      : Number((row.thisInvoiceQty * row.rate).toFixed(2));
    const toDateQty = Number((row.precedingQty + row.thisInvoiceQty).toFixed(2));
    const toDateAmount = Number((row.precedingAmount + thisAmount).toFixed(2));
    const remainingQty = Math.max(0, Number((row.contractQty - toDateQty).toFixed(2)));
    const remainingAmount = Math.max(0, Number((row.contractAmount - toDateAmount).toFixed(2)));

    return {
      ...row,
      computedThisAmount: thisAmount,
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

  // --- Dynamic Computations for Table 4 (Defect Liability) ---
  const defectRowsComputed = defectRows.map(row => {
    const thisAmount = Number((row.thisInvoiceQty * row.rate).toFixed(2));
    return {
      ...row,
      computedThisAmount: thisAmount
    };
  });
  const subTotal3Contract = defectRowsComputed.reduce((sum, r) => sum + (r.contractAmount || 0), 0);
  const subTotal3ThisInvoice = defectRowsComputed.reduce((sum, r) => sum + (r.computedThisAmount || 0), 0);

  // --- Dynamic Grand Invoice Summary (Table 5) ---
  const totalBaseContract = subTotal1Contract + subTotal2Contract + subTotal3Contract;
  const contingencyContract = Number((totalBaseContract * (contingencyRatePct / 100)).toFixed(2));
  const grandContractWithContingency = totalBaseContract + contingencyContract;
  const vatContract = Number((grandContractWithContingency * (vatRatePct / 100)).toFixed(2));
  const totalContractDue = grandContractWithContingency + vatContract;

  // This Invoice Grand Totals
  const totalSubtotalThisInvoice = subTotal1ThisInvoice + subTotal2ThisInvoice + subTotal3ThisInvoice;
  const contingencyThisInvoice = Number((totalSubtotalThisInvoice * (contingencyRatePct / 100)).toFixed(2));
  const subtotalWithContingencyThisInvoice = totalSubtotalThisInvoice + contingencyThisInvoice;
  const vatThisInvoice = Number((subtotalWithContingencyThisInvoice * (vatRatePct / 100)).toFixed(2));
  const grossPayableBase = subtotalWithContingencyThisInvoice + vatThisInvoice;
  
  const totalDeductionsThisInvoice = (advanceDeductionEtb || 0) + (taxDeductionEtb || 0) + (retentionDeductionEtb || 0) + (overtimeDeductionEtb || 0);
  const netDueThisInvoice = Math.max(0, grossPayableBase + (overtimeEtb || 0) - totalDeductionsThisInvoice);

  // Preceding Invoice Grand Totals
  const totalSubtotalPreceding = subTotal1Preceding + subTotal2Preceding;
  const vatPreceding = Number((totalSubtotalPreceding * (vatRatePct / 100)).toFixed(2));
  const grossPreceding = totalSubtotalPreceding + vatPreceding;

  // To-Date Cumulative
  const totalSubtotalToDate = subTotal1ToDate + subTotal2ToDate;
  const vatToDate = Number((totalSubtotalToDate * (vatRatePct / 100)).toFixed(2));
  const grossToDate = totalSubtotalToDate + vatToDate;

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

  // Synchronize modified rates back to the Assigned Personnel Directory
  const handleSyncRatesToDirectory = () => {
    if (!onUpdateConsultantPersonnel) return;
    const currentDirectory = consultant.personnel || [];
    const updatedDirectory = currentDirectory.map(p => {
      const match = staffRows.find(s => s.id === p.id);
      if (match) {
        return {
          ...p,
          monthlyBillingRate: match.rate,
          dailyReimbursableRate: match.dailyReimbursableRate,
          manMonthsAllocated: match.contractQty
        };
      }
      return p;
    });

    onUpdateConsultantPersonnel(updatedDirectory);
    setSaveSuccessMsg('Contract billing rates successfully synchronized to Assigned Personnel Directory!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
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

    // Update local state
    setInvoiceNo(nextInvNo);
    setBillingMonth(nextMonthName);
    const yearMatch = nextPeriodStr.match(/20\d{2}/);
    if (yearMatch) setBillingYear(parseInt(yearMatch[0], 10));
    setTotalDaysInMonth(nextDaysInMonth);
    setStaffRows(rolledStaffRows);
    setReimbursableRows(rolledReimbursables);
    setStatus('Submitted');
    setPaymentReference('');
    setPaymentDate('');
    setRemarks(`Monthly Fee Claim for ${nextPeriodStr} rolled forward from ${invoiceNo}. Preceding historical inputs locked.`);

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
      vatRate: vatRatePct,
      contingencyRate: contingencyRatePct,
      clientName: clientName,
      consultantFirmName: consultantFirm,
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    onSaveInvoice(newMonthInvoice);
    setSaveSuccessMsg(`Proceeded to ${nextMonthName}! New invoice ${nextInvNo} created. Predecessor records preserved.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Synchronize and Save to Invoices Register
  const handleSaveAndSync = () => {
    const computedInvoice: ConsultantInvoice = {
      id: activeInvoice?.id || `inv_${Date.now()}`,
      invoiceNo: invoiceNo.trim() || 'INV-01',
      billingPeriod: `${billingMonth} ${billingYear}`.trim(),
      submissionDate: submissionDate || new Date().toISOString().split('T')[0],
      certificationDate: invoiceDate,
      grossAmountEtb: grossPayableBase,
      netAmountEtb: netDueThisInvoice,
      totalDueEtb: netDueThisInvoice,
      vatAmountEtb: vatThisInvoice,
      feesAmountEtb: subTotal1ThisInvoice,
      reimbursableAmountEtb: subTotal2ThisInvoice,
      advanceDeductionEtb: advanceDeductionEtb || 0,
      taxDeductionEtb: taxDeductionEtb || 0,
      overtimeEtb: overtimeEtb || 0,
      overtimeDeductionEtb: overtimeDeductionEtb || 0,
      status: status,
      paymentReference: paymentReference || undefined,
      paymentDate: paymentDate || undefined,
      remarks: remarks || `Computed from Attendance × Rate Tables (Subtotal 1: ${fmt(subTotal1ThisInvoice)} + Subtotal 2: ${fmt(subTotal2ThisInvoice)} + 15% VAT).`,
      attendanceRecords: staffRows.map(s => ({
        id: s.id,
        personnelId: s.id,
        position: s.position,
        name: s.name,
        days: s.daysWorked,
        daysWorked: s.daysWorked,
        rate: s.rate,
        contractQty: s.contractQty,
        contractAmount: s.contractAmount,
        precedingQty: s.precedingQty,
        precedingAmount: s.precedingAmount,
      })),
      reimbursableRecords: reimbursableRows.map(r => ({
        id: r.id,
        description: r.description,
        rate: r.rate,
        thisInvoiceQty: r.thisInvoiceQty,
        thisInvoiceAmount: r.thisInvoiceAmount,
        precedingQty: r.precedingQty,
        precedingAmount: r.precedingAmount,
      })),
      vatRate: vatRatePct,
      contingencyRate: contingencyRatePct,
      clientName: clientName,
      consultantFirmName: consultantFirm,
      bankDetails: {
        bankName,
        branch: bankBranch,
        accountNo: bankAccountNo,
      }
    };

    onSaveInvoice(computedInvoice);
    setSaveSuccessMsg(`Successfully saved & synchronized invoice ${invoiceNo} with the main ledger!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
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
                  Linked to Assigned Personnel Directory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>Staff list synchronized with Assigned Personnel ({staffRows.length} total • {activeStaffCount} active • {replacedStaffCount} replaced records preserved).</span>
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
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Net Payable to Consultant</span>
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
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Complete 5-Table Consolidated View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Table 1: Staff Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('feeBreakdown')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'feeBreakdown'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table 2: Rate Multiplier (Sub-Total 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('reimbursable')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'reimbursable'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Table 3: Reimbursables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('defectLiability')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'defectLiability'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Table 4: Defect Liability</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'summary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Table 5: Summary & Deductions</span>
          </button>
        </div>

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
                <button
                  type="button"
                  onClick={handleSyncRatesToDirectory}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Push billing rate modifications back into the Assigned Personnel Directory"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Rates to Directory
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto px-4 pb-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">S.N</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Position / Role</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Name of Personnel & Assignment Status</th>
                  <th className="py-2.5 px-3 text-center w-20">Unit</th>
                  <th className="py-2.5 px-3 text-right min-w-[130px]">Days Worked (Input)</th>
                  <th className="py-2.5 px-3 text-center min-w-[110px]">Month Divisor</th>
                  <th className="py-2.5 px-3 text-right min-w-[130px] font-black text-blue-600 dark:text-blue-400">Derived MM Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {displayStaffRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <p className="font-semibold text-xs">No personnel match current directory filter.</p>
                    </td>
                  </tr>
                ) : (
                  displayStaffRows.map((row, idx) => {
                    const derivedMM = row.daysWorked > 0 ? (row.daysWorked / totalDaysInMonth).toFixed(2) : '0.00';
                    const isReplaced = row.status === 'Replaced';
                    const isSuccessor = Boolean(row.predecessorName);

                    return (
                      <tr 
                        key={row.id} 
                        className={`transition ${
                          isReplaced 
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50' 
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {row.position}
                          </div>
                          {row.category && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {row.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {row.name}
                            </span>
                            
                            {/* Replacement / Successor Badges */}
                            {isReplaced ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-full w-fit">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                Replaced on {row.demobilizationDate || row.replacementDate || 'Handover'} (Record Preserved)
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
                        <td className="py-2 px-3 text-center font-mono text-slate-500">Days</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={totalDaysInMonth}
                            value={row.daysWorked}
                            onChange={(e) => handleUpdateStaff(row.id, { daysWorked: Math.max(0, parseInt(e.target.value) || 0) })}
                            className={`w-20 text-right px-2 py-1 rounded-lg font-mono font-bold text-xs border ${
                              row.daysWorked > 0 
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' 
                                : 'bg-transparent text-slate-400 border-transparent hover:border-slate-200'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{totalDaysInMonth}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                          {derivedMM} MM
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-slate-700 dark:text-slate-200 uppercase text-[11px]">
                    Total Personnel Mobilization & Input Derived:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-600">
                    {displayStaffRows.reduce((sum, r) => sum + r.daysWorked, 0)} Days
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                    {displayFeeRowsComputed.reduce((sum, r) => sum + r.thisInvoiceQty, 0).toFixed(2)} MM
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 2: ATTENDANCE × RATE MULTIPLICATION & FEE BREAKDOWN                */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'feeBreakdown') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-mono">2</span>
                Table 2: Attendance × Rate Multiplication Table (Sub-Total 1: Fees)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Multiplies MM input from Table 1 by Contract Rate. Tracks preceding cumulative inputs and preserves historical predecessor records across months.
              </p>
            </div>

            <div className="text-right font-mono">
              <span className="text-[11px] text-slate-400 block">Sub-Total 1 (This Month)</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                {fmt(subTotal1ThisInvoice)} ETB
              </span>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-2 px-2 text-center">S.N</th>
                    <th className="py-2 px-3 min-w-[180px]">Key Personnel Position</th>
                    <th className="py-2 px-3 min-w-[160px]">Staff Name & Status</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2 text-right">Contr. MM</th>
                    <th className="py-2 px-3 text-right min-w-[100px]">Rate (ETB)</th>
                    <th className="py-2 px-3 text-right min-w-[120px]">Contract Amt (ETB)</th>
                    <th className="py-2 px-2 text-right font-black text-blue-600 bg-blue-50/40 dark:bg-blue-950/20">This Mo. MM</th>
                    <th className="py-2 px-3 text-right font-black text-blue-600 bg-blue-50/40 dark:bg-blue-950/20 min-w-[120px]">This Mo. Fee (ETB)</th>
                    <th className="py-2 px-2 text-right">Prec. MM</th>
                    <th className="py-2 px-3 text-right min-w-[110px]">Prec. Fee (ETB)</th>
                    <th className="py-2 px-2 text-right">To-Date MM</th>
                    <th className="py-2 px-3 text-right min-w-[120px]">To-Date Fee (ETB)</th>
                    <th className="py-2 px-2 text-right text-slate-400">Bal. MM</th>
                    <th className="py-2 px-3 text-right text-slate-400 min-w-[110px]">Bal. Amt (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {displayFeeRowsComputed.map((r, idx) => (
                    <tr 
                      key={r.id} 
                      className={`transition ${
                        r.status === 'Replaced' 
                          ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50' 
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 px-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">{r.position}</td>
                      <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">
                        <div>{r.name}</div>
                        {r.status === 'Replaced' ? <div className="text-[10px] text-amber-600 font-bold">Replaced Predecessor</div> : null}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500">Month</td>
                      <td className="py-2 px-2 text-right">{r.contractQty}</td>
                      <td className="py-2 px-3 text-right">{fmt(r.rate)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300">{fmt(r.contractAmount)}</td>
                      <td className="py-2 px-2 text-right font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                        {r.thisInvoiceQty.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                        {fmt(r.thisInvoiceAmount)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={r.precedingQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateStaff(r.id, { precedingQty: val, precedingAmount: val * r.rate });
                          }}
                          className="w-14 text-right px-1 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-slate-300 rounded font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{fmt(r.precedingAmount)}</td>
                      <td className="py-2 px-2 text-right font-bold">{r.toDateQty.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(r.toDateAmount)}</td>
                      <td className="py-2 px-2 text-right text-slate-400">{r.remainingQty.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-400">{fmt(r.remainingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase text-slate-800 dark:text-white font-sans">
                      Sub-Total:
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                      {displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceQty, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                      {fmt(displayFeeRowsComputed.reduce((s, r) => s + r.thisInvoiceAmount, 0))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">{displayFeeRowsComputed.reduce((s, r) => s + r.precedingQty, 0).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono">{fmt(displayFeeRowsComputed.reduce((s, r) => s + r.precedingAmount, 0))}</td>
                    <td className="py-3 px-2 text-right font-mono">{displayFeeRowsComputed.reduce((s, r) => s + r.toDateQty, 0).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black">{fmt(displayFeeRowsComputed.reduce((s, r) => s + r.toDateAmount, 0))}</td>
                    <td className="py-3 px-2 text-right font-mono text-slate-400">{displayFeeRowsComputed.reduce((s, r) => s + r.remainingQty, 0).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{fmt(displayFeeRowsComputed.reduce((s, r) => s + r.remainingAmount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 3: REIMBURSABLE EXPENSES BREAKDOWN                                 */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'reimbursable') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-mono">3</span>
                Table 3: Reimbursable Operating Expenses Breakdown (Sub-Total 2)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct project expenditures for Head Office Support, Communications, Insurance, Housing Accommodation, Surveying, and Vehicle Rentals.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-[11px] text-slate-400 block">Sub-Total 2 (This Month)</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {fmt(subTotal2ThisInvoice)} ETB
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddReimbursable}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Reimbursable
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-2 px-2 text-center">S.N</th>
                    <th className="py-2 px-3 min-w-[180px]">Description</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2 text-right">Contr. Qty</th>
                    <th className="py-2 px-3 text-right">Rate (ETB)</th>
                    <th className="py-2 px-3 text-right min-w-[120px]">Contr. Amt (ETB)</th>
                    <th className="py-2 px-2 text-right font-black text-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20">This Mo. Qty</th>
                    <th className="py-2 px-3 text-right font-black text-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 min-w-[120px]">This Mo. Claim (ETB)</th>
                    <th className="py-2 px-2 text-right">Prec. Qty</th>
                    <th className="py-2 px-3 text-right min-w-[110px]">Prec. Amt (ETB)</th>
                    <th className="py-2 px-2 text-right">To-Date Qty</th>
                    <th className="py-2 px-3 text-right min-w-[120px]">To-Date Amt (ETB)</th>
                    <th className="py-2 px-3 text-right text-slate-400 min-w-[110px]">Bal. Amt (ETB)</th>
                    <th className="py-2 px-2 text-center w-10">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {reimbursableRowsComputed.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans">
                        <input
                          type="text"
                          value={r.description}
                          onChange={(e) => handleUpdateReimbursable(r.id, { description: e.target.value })}
                          className="w-full px-1.5 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-slate-300 rounded font-semibold text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500">{r.unit}</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={r.contractQty}
                          onChange={(e) => handleUpdateReimbursable(r.id, { contractQty: parseFloat(e.target.value) || 0 })}
                          className="w-14 text-right px-1 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-slate-300 rounded font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={r.rate}
                          onChange={(e) => handleUpdateReimbursable(r.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right px-1 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-slate-300 rounded font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300">{fmt(r.contractAmount)}</td>
                      <td className="py-2 px-2 text-right bg-indigo-50/30 dark:bg-indigo-950/20">
                        <input
                          type="number"
                          step="0.01"
                          value={r.thisInvoiceQty}
                          onChange={(e) => handleUpdateReimbursable(r.id, { thisInvoiceQty: parseFloat(e.target.value) || 0 })}
                          className="w-16 text-right px-1 py-0.5 rounded font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                        <input
                          type="number"
                          value={r.computedThisAmount}
                          onChange={(e) => handleUpdateReimbursable(r.id, { thisInvoiceAmount: parseFloat(e.target.value) || 0 })}
                          className="w-24 text-right px-1 py-0.5 rounded font-mono font-black text-indigo-600 dark:text-indigo-400 border border-transparent hover:border-slate-300 bg-transparent text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={r.precedingQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateReimbursable(r.id, { precedingQty: val, precedingAmount: val * r.rate });
                          }}
                          className="w-14 text-right px-1 py-0.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-slate-300 rounded font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{fmt(r.precedingAmount)}</td>
                      <td className="py-2 px-2 text-right font-bold">{r.toDateQty.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(r.toDateAmount)}</td>
                      <td className="py-2 px-3 text-right text-slate-400">{fmt(r.remainingAmount)}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteReimbursable(r.id)}
                          className="text-slate-300 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase text-slate-800 dark:text-white font-sans">
                      Sub-Total:
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono">{fmt(subTotal2Contract)}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {fmt(subTotal2ThisInvoice)}
                    </td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono">{fmt(subTotal2Preceding)}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono font-black">{fmt(subTotal2ToDate)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{fmt(subTotal2Remaining)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 4: DEFECT LIABILITY PERIOD SERVICES                                */}
      {/* ========================================================================= */}
      {(activeTableTab === 'all' || activeTableTab === 'defectLiability') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-3">
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700 text-white text-xs flex items-center justify-center font-mono">4</span>
                Table 4: Defect Liability Period Supervisory Personnel Allocation
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff allocations for the post-completion maintenance and guarantee period (Resident Engineer, Senior QS, Senior Surveyor).
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-[11px] text-slate-400 block">Sub-Total 3 (This Month)</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {fmt(subTotal3ThisInvoice)} ETB
              </span>
            </div>
          </div>

          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2 px-3 w-12 text-center">S.N</th>
                  <th className="py-2 px-4 min-w-[260px]">Role / Position</th>
                  <th className="py-2 px-3 text-center">Unit</th>
                  <th className="py-2 px-3 text-right">Contract MM</th>
                  <th className="py-2 px-4 text-right">Rate (ETB)</th>
                  <th className="py-2 px-4 text-right font-bold">Contract Amount (ETB)</th>
                  <th className="py-2 px-3 text-right">This Month MM</th>
                  <th className="py-2 px-4 text-right font-bold text-blue-600">This Month Fee (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {defectRowsComputed.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200">{r.position}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{r.unit}</td>
                    <td className="py-2.5 px-3 text-right">{r.contractQty}</td>
                    <td className="py-2.5 px-4 text-right">{fmt(r.rate)}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{fmt(r.contractAmount)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        value={r.thisInvoiceQty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDefectRows(prev => prev.map(d => d.id === r.id ? { ...d, thisInvoiceQty: val, thisInvoiceAmount: val * d.rate } : d));
                        }}
                        className="w-16 text-right px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-600">{fmt(r.computedThisAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800">
                <tr>
                  <td colSpan={5} className="py-2.5 px-4 uppercase text-slate-700 dark:text-slate-300 font-sans">
                    Sub-Total 3 (Defect Liability Allocation):
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{fmt(subTotal3Contract)}</td>
                  <td></td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">{fmt(subTotal3ThisInvoice)}</td>
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
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono">5</span>
                Table 5: Consolidated Summary & Net Payment Computation Table
              </h4>
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
                    <th className="py-2.5 px-4 text-right min-w-[130px]">Contract Amount (ETB)</th>
                    <th className="py-2.5 px-4 text-right min-w-[140px] font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                      This Month Claim (ETB)
                    </th>
                    <th className="py-2.5 px-4 text-right min-w-[130px]">Preceding Claim (ETB)</th>
                    <th className="py-2.5 px-4 text-right min-w-[130px] font-bold">To-Date Claim (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                  {/* Row 1: Sub Total 1 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">1</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      Sub Total 1 (Remuneration of Consultant Staff)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(subTotal1Contract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal1ThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(subTotal1Preceding)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal1ToDate)}</td>
                  </tr>

                  {/* Row 2: Sub Total 2 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">2</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      Sub Total 2 (Reimbursable Direct Costs)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(subTotal2Contract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal2ThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">{fmt(subTotal2Preceding)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal2ToDate)}</td>
                  </tr>

                  {/* Row 3: Sub Total 3 Defect */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">3</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      Sub Total 3 (Defect Liability Personnel Allocation)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(subTotal3Contract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold bg-blue-50/20 dark:bg-blue-950/10">
                      {fmt(subTotal3ThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(subTotal3ThisInvoice)}</td>
                  </tr>

                  {/* Direct Sum (1 + 2 + 3) */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/60 font-bold">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500"></td>
                    <td className="py-2.5 px-4 uppercase text-slate-700 dark:text-slate-300">
                      Subtotal Direct Fees & Reimbursables (1 + 2 + 3)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(totalBaseContract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white bg-blue-50/30 dark:bg-blue-950/20">
                      {fmt(totalSubtotalThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(totalSubtotalPreceding)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black">{fmt(totalSubtotalToDate)}</td>
                  </tr>

                  {/* Contingency */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">4</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Contingency Provision</span>
                        <div className="flex items-center gap-1 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                          <input
                            type="number"
                            step="0.5"
                            value={contingencyRatePct}
                            onChange={(e) => setContingencyRatePct(parseFloat(e.target.value) || 0)}
                            className="w-12 text-center bg-transparent focus:outline-none font-bold text-slate-800 dark:text-white"
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">{fmt(contingencyContract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold bg-blue-50/20 dark:bg-blue-950/10 text-slate-700 dark:text-slate-300">
                      {fmt(contingencyThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{fmt(contingencyThisInvoice)}</td>
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
                            onChange={(e) => setVatRatePct(parseFloat(e.target.value) || 0)}
                            className="w-10 text-center bg-transparent focus:outline-none font-bold"
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-700 dark:text-purple-300">{fmt(vatContract)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-100/40 dark:bg-purple-950/30">
                      {fmt(vatThisInvoice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-600/80">{fmt(vatPreceding)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-700 dark:text-purple-300">{fmt(vatToDate)}</td>
                  </tr>

                  {/* GROSS CLAIM TOTAL */}
                  <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-sm border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-3 px-3 text-center font-mono">6</td>
                    <td className="py-3 px-4 uppercase text-slate-900 dark:text-white">
                      GROSS INVOICE CLAIM AMOUNT (Birr)
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(totalContractDue)}</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-600 dark:text-blue-400 bg-blue-100/40 dark:bg-blue-950/40">
                      {fmt(grossPayableBase)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(grossPreceding)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">{fmt(grossToDate)}</td>
                  </tr>

                  {/* Overtime Row */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">5a</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Overtime</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right bg-blue-50/20 dark:bg-blue-950/10">
                      <input
                        type="number"
                        value={overtimeEtb}
                        onChange={(e) => setOvertimeEtb(parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800 font-mono font-bold text-blue-600 text-xs bg-white dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">{fmt(overtimeEtb)}</td>
                  </tr>

                  {/* DEDUCTIONS SECTION */}
                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7a</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Advance Payment Recovery (Birr)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={advanceDeductionEtb}
                        onChange={(e) => setAdvanceDeductionEtb(parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 font-mono font-bold text-rose-600 text-xs bg-white dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(advanceDeductionEtb)}</td>
                  </tr>

                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7b</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Withholding / Statutory Tax Deduction (2%)</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={taxDeductionEtb}
                        onChange={(e) => setTaxDeductionEtb(parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 font-mono font-bold text-rose-600 text-xs bg-white dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(taxDeductionEtb)}</td>
                  </tr>

                  <tr className="bg-rose-50/40 dark:bg-rose-950/10">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">7c</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">Less: Overtime Deduction from Contractor</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right bg-rose-50/50 dark:bg-rose-950/20">
                      <input
                        type="number"
                        value={overtimeDeductionEtb}
                        onChange={(e) => setOvertimeDeductionEtb(parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 font-mono font-bold text-rose-600 text-xs bg-white dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">-{fmt(overtimeDeductionEtb)}</td>
                  </tr>

                  {/* FINAL NET PAYABLE */}
                  <tr className="bg-emerald-100 dark:bg-emerald-950/60 font-black text-sm border-t-2 border-emerald-500">
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-800 dark:text-emerald-300">8</td>
                    <td className="py-3.5 px-4 uppercase text-emerald-950 dark:text-emerald-100">
                      TOTAL NET AMOUNT PAYABLE TO CONSULTANT (ETB)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(totalContractDue)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-700 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-900/40">
                      {fmt(netDueThisInvoice)} ETB
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(grossPreceding)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-800 dark:text-emerald-200">
                      {fmt(Math.max(0, grossToDate - totalDeductionsThisInvoice))} ETB
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Amount in Words Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Net Payable Amount in Ethiopian Birr Words:
              </span>
              <p className="text-sm font-serif italic text-slate-900 dark:text-white font-semibold">
                "{numberToWords(netDueThisInvoice)}"
              </p>
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
                          <th className="py-3 px-4">Month Succession</th>
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Billing Period</th>
                          <th className="py-3 px-4 text-right">Fees (ETB)</th>
                          <th className="py-3 px-4 text-right">Reimbursables (ETB)</th>
                          <th className="py-3 px-4 text-right">Gross Claim (ETB)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {allInvoices
                          .filter(inv => !activeInvoice || inv.id !== activeInvoice.id)
                          .map((inv, idx) => {
                            const feeAmt = inv.feesAmountEtb || (inv.attendanceRecords || []).reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
                            const reimbAmt = inv.reimbursableAmountEtb || (inv.reimbursableRecords || []).reduce((s, r) => s + (r.thisInvoiceAmount || 0), 0);
                            const gross = inv.grossAmountEtb || (feeAmt + reimbAmt);
                            return (
                              <tr key={inv.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-4 font-bold font-sans text-indigo-600 dark:text-indigo-400">
                                  Month {idx + 1}
                                </td>
                                <td className="py-3 px-4 font-bold">{inv.invoiceNo}</td>
                                <td className="py-3 px-4 font-sans">{inv.billingPeriod}</td>
                                <td className="py-3 px-4 text-right">{fmt(feeAmt)}</td>
                                <td className="py-3 px-4 text-right">{fmt(reimbAmt)}</td>
                                <td className="py-3 px-4 text-right font-black">{fmt(gross)}</td>
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
                    <span>Total Cumulative Preceding Amount (Fees + Reimbursables):</span>
                    <span className="font-mono font-black text-sm">
                      {fmt(
                        allInvoices
                          .filter(inv => !activeInvoice || inv.id !== activeInvoice.id)
                          .reduce((sum, inv) => sum + (inv.grossAmountEtb || (inv.feesAmountEtb || 0) + (inv.reimbursableAmountEtb || 0)), 0)
                      )} ETB
                    </span>
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
    </div>
  );
};

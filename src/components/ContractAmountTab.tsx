import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Table, 
  FileSpreadsheet, 
  ExternalLink,
  ShieldCheck,
  Receipt,
  Users,
  Calculator,
  TrendingUp,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  Project, 
  SupervisionConsultantInfo, 
  ContractCondition1Data, 
  ContractStaffRateCondition1, 
  ContractReimbursableCondition1,
  ConsultantPersonnel
} from '../types';
import { 
  DEFAULT_CONDITION_1_DATA, 
  DEFAULT_CONDITION_1_STAFF,
  DEFAULT_CONDITION_1_REIMBURSABLES
} from '../data/defaultContractAmount';

interface Props {
  project: Project;
  consultant?: SupervisionConsultantInfo;
  isReadonly?: boolean;
  onUpdateProject?: (updates: Partial<Project>, section?: string) => void;
  onNavigateToInvoices?: () => void;
  onNavigateToPersonnel?: () => void;
  viewCurrency?: 'ETB' | 'USD';
  exchangeRate?: number;
  onCurrencyToggle?: (newCurrency: 'ETB' | 'USD') => void;
}

export const ContractAmountTab: React.FC<Props> = ({ 
  project, 
  consultant: propConsultant, 
  isReadonly = false,
  onUpdateProject,
  onNavigateToInvoices,
  onNavigateToPersonnel,
  viewCurrency = 'ETB',
  exchangeRate,
  onCurrencyToggle
}) => {
  if (!project) return <div className="p-8 text-center text-slate-500 font-medium">Loading project contract data...</div>;

  const consultant = propConsultant || project.supervisionConsultant || {
    firmName: project.consultant || 'Supervision Consultant',
    enableUsdPayments: false,
    personnel: [],
    invoices: [],
    contractRefNo: project.contractNo || 'ERA/SC/01',
    contractSignDate: project.signDate || '',
    commencementDate: project.startDate || '',
    originalCompletionDate: '',
    originalFeeEtb: 24844868.19
  };

  const savedSchedule = consultant.contractAmountSchedule?.condition1;

  // Initialize Condition 1 State (ETB Only)
  const [c1Data, setC1Data] = useState<ContractCondition1Data>(() => {
    if (savedSchedule) {
      const reimbList = savedSchedule.reimbursableList && savedSchedule.reimbursableList.length > 0
        ? savedSchedule.reimbursableList
        : DEFAULT_CONDITION_1_REIMBURSABLES;
      
      const staffList = savedSchedule.staffFees && savedSchedule.staffFees.length > 0
        ? savedSchedule.staffFees
        : DEFAULT_CONDITION_1_STAFF;

      return {
        ...DEFAULT_CONDITION_1_DATA,
        ...savedSchedule,
        reimbursableList: reimbList,
        staffFees: staffList
      };
    }
    return {
      ...DEFAULT_CONDITION_1_DATA,
      reimbursableList: DEFAULT_CONDITION_1_REIMBURSABLES,
      staffFees: DEFAULT_CONDITION_1_STAFF
    };
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'summary' | 'construction' | 'dlp' | 'reimbursable' | 'condition2'>('all');
  // Table 4 is visible and available only if user chooses to add/manage reimbursables
  const [isTable4Visible, setIsTable4Visible] = useState(false);
  // Overall Cost calculation source: invoice monthly man-month inputs vs contract baseline
  const [costCalculationMode, setCostCalculationMode] = useState<'invoice_monthly_mm' | 'contract_baseline'>('invoice_monthly_mm');

  // Modal state for adding a new staff position
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffCategory, setNewStaffCategory] = useState<'Key Professional' | 'Intermediate' | 'Support' | 'Head Office'>('Key Professional');
  const [newStaffNo, setNewStaffNo] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState('');
  const [newStaffName, setNewStaffName] = useState('To be nominated');
  const [newStaffMmConstr, setNewStaffMmConstr] = useState<number>(24);
  const [newStaffMmDlp, setNewStaffMmDlp] = useState<number>(0);
  const [newStaffRateEtb, setNewStaffRateEtb] = useState<number>(15000);
  const [addMode, setAddMode] = useState<'staff' | 'subtable'>('staff');
  const [newSubTableTitle, setNewSubTableTitle] = useState('');


  // -------------------------------------------------------------
  // COMPUTED STAFF BREAKDOWNS & SUB-TOTALS (DYNAMIC SUB-TABLES SUPPORT)
  // -------------------------------------------------------------
  const staffSubtotals = useMemo(() => {
    const list = c1Data.staffFees || [];
    const defaultCats = ['Key Professional', 'Intermediate', 'Support', 'Head Office'];
    const set = new Set<string>(defaultCats);
    list.forEach(s => {
      if (s.category) set.add(s.category);
    });

    const cats = Array.from(set);
    const groups = cats.map(cat => {
      const rows = list.filter(s => {
        if (s.category === cat) return true;
        if (!s.category) {
          if (cat === 'Key Professional' && s.no?.startsWith('1.')) return true;
          if (cat === 'Intermediate' && s.no?.startsWith('2.')) return true;
          if (cat === 'Support' && s.no?.startsWith('3.')) return true;
          if (cat === 'Head Office' && s.no?.startsWith('4.')) return true;
        }
        return false;
      });
      const constrMm = rows.reduce((s, r) => s + (Number(r.mmConstr) || 0), 0);
      const dlpMm = rows.reduce((s, r) => s + (Number(r.mmDlp) || 0), 0);
      const totalMm = rows.reduce((s, r) => s + (Number(r.totalMm) || 0), 0);
      const constrEtb = rows.reduce((s, r) => s + ((Number(r.mmConstr) || 0) * (Number(r.rateEtb) || 0)), 0);
      const constrUsd = rows.reduce((s, r) => s + ((Number(r.mmConstr) || 0) * (Number(r.rateUsd) || 0)), 0);
      const dlpEtb = rows.reduce((s, r) => s + ((Number(r.mmDlp) || 0) * (Number(r.rateEtb) || 0)), 0);
      const dlpUsd = rows.reduce((s, r) => s + ((Number(r.mmDlp) || 0) * (Number(r.rateUsd) || 0)), 0);
      const totalEtb = rows.reduce((s, r) => s + (Number(r.totalEtb) || 0), 0);
      const totalUsd = rows.reduce((s, r) => s + (Number(r.totalUsd) || 0), 0);

      let label = cat;
      if (cat === 'Key Professional') label = '1. Key Professional Staff (Supervision & Management)';
      else if (cat === 'Intermediate') label = '2. Intermediate Technical Staff';
      else if (cat === 'Support') label = '3. Field & Laboratory Support Personnel';
      else if (cat === 'Head Office') label = '4. Head Office Support';

      return {
        categoryKey: cat,
        label,
        rows,
        constrMm,
        dlpMm,
        totalMm,
        constrEtb,
        constrUsd,
        dlpEtb,
        dlpUsd,
        totalEtb,
        totalUsd
      };
    }).filter(g => g.rows.length > 0 || defaultCats.includes(g.categoryKey));

    const totalConstrMm = groups.reduce((s, g) => s + g.constrMm, 0);
    const totalDlpMm = groups.reduce((s, g) => s + g.dlpMm, 0);
    const grandTotalMm = groups.reduce((s, g) => s + g.totalMm, 0);
    const grandTotalFeesEtb = groups.reduce((s, g) => s + g.totalEtb, 0);
    const grandTotalFeesUsd = groups.reduce((s, g) => s + g.totalUsd, 0);

    return {
      groups,
      totalConstrMm,
      totalDlpMm,
      grandTotalMm,
      grandTotalFeesEtb,
      grandTotalFeesUsd
    };
  }, [c1Data.staffFees]);

  // -------------------------------------------------------------
  // COMPUTED REIMBURSABLE EXPENSES TOTAL (SUM OF REIMBURSABLE ITEMS)
  // -------------------------------------------------------------
  const reimbursableTotal = useMemo(() => {
    const list = c1Data.reimbursableList;
    if (list && list.length > 0) {
      return list.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
    }
    return c1Data.reimbursableTotal ?? c1Data.summary?.reimbursableExpenses ?? 9246789.75;
  }, [c1Data.reimbursableList, c1Data.reimbursableTotal, c1Data.summary?.reimbursableExpenses]);

  const handleUpdateReimbursableItem = (id: string, field: 'item' | 'basis' | 'amountEtb', value: any) => {
    setC1Data(prev => {
      const updatedList = (prev.reimbursableList || []).map(r => {
        if (r.id === id) {
          return {
            ...r,
            [field]: field === 'amountEtb' ? (parseFloat(value) || 0) : value
          };
        }
        return r;
      });
      const newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });
  };

  const handleAddReimbursableItem = () => {
    const list = c1Data.reimbursableList || [];
    const newNo = String(list.length + 1);
    const newItem = {
      id: `reimb_${Date.now()}`,
      no: newNo,
      item: 'New Reimbursable Direct Expense Sub-Item',
      basis: 'Actual site expenditure & approved vouchers',
      amountEtb: 0
    };
    setC1Data(prev => {
      const updatedList = [...(prev.reimbursableList || []), newItem];
      const newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });
  };

  const handleDeleteReimbursableItem = (id: string) => {
    setC1Data(prev => {
      const updatedList = (prev.reimbursableList || []).filter(r => r.id !== id);
      const newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });
  };

  // -------------------------------------------------------------
  // DYNAMIC OVERALL COST DERIVED FROM INVOICE PAGE MONTHLY MAN-MONTH INPUTS
  // -------------------------------------------------------------
  const invoiceManMonthCosts = useMemo(() => {
    const personnelDir = consultant.personnel || [];
    const invoices = consultant.invoices || [];

    // Calculate staff expended cost based on invoice page monthly MM inputs
    let staffExpendedFees = 0;
    let totalExpendedMM = 0;
    let staffConstructionFees = 0;
    let staffDlpFees = 0;
    let constructionExpendedMM = 0;
    let dlpExpendedMM = 0;

    const staffBreakdown = (c1Data.staffFees || []).map(staff => {
      const matchedPerson = personnelDir.find(p => 
        p.id === staff.id ||
        (p.name && staff.name && p.name.trim().toLowerCase() === staff.name.trim().toLowerCase() && staff.name !== 'To be nominated' && staff.name !== 'TBN') ||
        (p.position && staff.position && p.position.trim().toLowerCase() === staff.position.trim().toLowerCase())
      );

      let actualMM = 0;
      let actualCost = 0;

      if (invoices.length > 0) {
        invoices.forEach(inv => {
          const rec = (inv.attendanceRecords || []).find((r: any) => 
            r.id === staff.id || 
            r.personnelId === staff.id ||
            (r.name && staff.name && r.name.trim().toLowerCase() === staff.name.trim().toLowerCase() && staff.name !== 'To be nominated' && staff.name !== 'TBN') ||
            (r.position && staff.position && r.position.trim().toLowerCase() === staff.position.trim().toLowerCase())
          );
          if (rec) {
            const mm = rec.thisInvoiceQty !== undefined && rec.thisInvoiceQty !== null
              ? Number(rec.thisInvoiceQty)
              : (rec.daysWorked ? Number(rec.daysWorked) / 31 : (rec.days ? Number(rec.days) / 31 : 0));
            const rate = Number(rec.rate) || Number(staff.rateEtb) || 0;
            const amt = rec.thisInvoiceAmount ? Number(rec.thisInvoiceAmount) : mm * rate;
            actualMM += mm;
            actualCost += amt;
          }
        });
      }

      if (actualMM === 0 && matchedPerson && matchedPerson.manMonthsInput) {
        actualMM = Number(matchedPerson.manMonthsInput) || 0;
        actualCost = actualMM * (Number(staff.rateEtb) || 0);
      }

      const rate = Number(staff.rateEtb) || 0;
      if (actualCost === 0 && actualMM > 0) {
        actualCost = actualMM * rate;
      }

      staffExpendedFees += actualCost;
      totalExpendedMM += actualMM;

      const isDlp = (staff.category && staff.category.toLowerCase().includes('dlp')) || (Number(staff.mmDlp) > 0 && Number(staff.mmConstr) === 0);
      if (isDlp) {
        staffDlpFees += actualCost;
        dlpExpendedMM += actualMM;
      } else {
        staffConstructionFees += actualCost;
        constructionExpendedMM += actualMM;
      }

      return {
        id: staff.id,
        position: staff.position,
        name: staff.name,
        category: staff.category,
        rateEtb: rate,
        plannedMm: staff.totalMm,
        expendedMm: actualMM,
        expendedCost: actualCost
      };
    });

    const invoiceReimbTotal = invoices.reduce((sum, inv) => sum + (Number(inv.reimbursableAmountEtb) || 0), 0);
    const reimbursableExpended = invoiceReimbTotal > 0 ? invoiceReimbTotal : reimbursableTotal;
    
    const directServicesExpended = staffExpendedFees + reimbursableExpended;
    const contingencyPct = Number(c1Data.contingencyPct ?? 15);
    const vatPct = Number(c1Data.vatPct ?? 15);
    const contingency = directServicesExpended * (contingencyPct / 100);
    const baseBeforeVat = directServicesExpended + contingency;
    const vat = baseBeforeVat * (vatPct / 100);
    const overallCost = baseBeforeVat + vat;

    const overallGrossInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.grossAmountEtb) || 0), 0) || overallCost;
    const overallNetPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (Number(inv.netAmountEtb) || 0), 0);

    return {
      totalExpendedMM,
      constructionExpendedMM,
      dlpExpendedMM,
      staffExpendedFees,
      staffConstructionFees,
      staffDlpFees,
      reimbursableExpended,
      directServicesExpended,
      contingencyPct,
      contingency,
      baseBeforeVat,
      vatPct,
      vat,
      overallCost,
      overallGrossInvoiced,
      overallNetPaid,
      invoicesCount: invoices.length,
      staffBreakdown
    };
  }, [consultant.personnel, consultant.invoices, c1Data.staffFees, c1Data.contingencyPct, c1Data.vatPct, reimbursableTotal]);

  // -------------------------------------------------------------
  // COMPUTED SUMMARY OF CONTRACT PRICE (TABLE 1.1 BASELINE)
  // -------------------------------------------------------------
  const summaryPrice = useMemo(() => {
    const feesConstruction = staffSubtotals.groups.reduce((s, g) => s + g.constrEtb, 0);
    const feesDlp = staffSubtotals.groups.reduce((s, g) => s + g.dlpEtb, 0);
    const fees = feesConstruction + feesDlp;
    const reimb = reimbursableTotal;
    const directSubTotal = fees + reimb;
    const contingencyPct = Number(c1Data.contingencyPct ?? 15);
    const vatPct = Number(c1Data.vatPct ?? 15);

    // C. Contingency (15% of A+B)
    const contingency = directSubTotal * (contingencyPct / 100);
    
    // Base before VAT (A + B + C)
    const baseBeforeVat = directSubTotal + contingency;

    // D. VAT (15% of A+B+C)
    const vat = baseBeforeVat * (vatPct / 100);

    // E. Sub-total (Total Contract Price)
    const grandTotal = baseBeforeVat + vat;

    return {
      feesConstruction,
      feesDlp,
      fees,
      reimb,
      directSubTotal,
      contingencyPct,
      contingency,
      baseBeforeVat,
      vatPct,
      vat,
      grandTotal
    };
  }, [staffSubtotals.groups, reimbursableTotal, c1Data.contingencyPct, c1Data.vatPct]);

  // -------------------------------------------------------------
  // ACTIVE SUMMARY DERIVED BASED ON USER SELECTION (INVOICE MM INPUTS OR BASELINE)
  // -------------------------------------------------------------
  const activeSummaryPrice = useMemo(() => {
    if (costCalculationMode === 'invoice_monthly_mm') {
      const fees = invoiceManMonthCosts.staffExpendedFees;
      const feesConstruction = invoiceManMonthCosts.staffConstructionFees > 0 ? invoiceManMonthCosts.staffConstructionFees : fees;
      const feesDlp = invoiceManMonthCosts.staffDlpFees;
      const reimb = invoiceManMonthCosts.reimbursableExpended > 0 ? invoiceManMonthCosts.reimbursableExpended : reimbursableTotal;
      const directSubTotal = fees + reimb;
      const contingencyPct = Number(c1Data.contingencyPct ?? 15);
      const vatPct = Number(c1Data.vatPct ?? 15);

      const contingency = directSubTotal * (contingencyPct / 100);
      const baseBeforeVat = directSubTotal + contingency;
      const vat = baseBeforeVat * (vatPct / 100);
      const grandTotal = baseBeforeVat + vat;

      return {
        feesConstruction,
        feesDlp,
        fees,
        reimb,
        directSubTotal,
        contingencyPct,
        contingency,
        baseBeforeVat,
        vatPct,
        vat,
        grandTotal,
        isDerivedFromInvoices: true,
        expendedMm: invoiceManMonthCosts.totalExpendedMM
      };
    }

    return {
      ...summaryPrice,
      isDerivedFromInvoices: false,
      expendedMm: staffSubtotals.grandTotalMm
    };
  }, [costCalculationMode, invoiceManMonthCosts, reimbursableTotal, c1Data.contingencyPct, c1Data.vatPct, summaryPrice, staffSubtotals.grandTotalMm]);

  // -------------------------------------------------------------
  // ROW EDITING, ADDING & DELETING HANDLERS
  // -------------------------------------------------------------
  const handleUpdateStaffRow = (id: string, field: keyof ContractStaffRateCondition1, value: any) => {
    setC1Data(prev => {
      const updated = (prev.staffFees || []).map(row => {
        if (row.id === id) {
          const newRow = { ...row, [field]: value };
          if (field === 'mmConstr' || field === 'mmDlp') {
            const constr = field === 'mmConstr' ? Number(value) || 0 : Number(row.mmConstr) || 0;
            const dlp = field === 'mmDlp' ? Number(value) || 0 : Number(row.mmDlp) || 0;
            newRow.totalMm = constr + dlp;
            newRow.totalEtb = newRow.totalMm * (Number(row.rateEtb) || 0);
          } else if (field === 'totalMm') {
            const mm = Number(value) || 0;
            newRow.totalEtb = mm * (Number(row.rateEtb) || 0);
          } else if (field === 'rateEtb') {
            const rate = Number(value) || 0;
            newRow.totalEtb = (Number(newRow.totalMm) || 0) * rate;
          }
          return newRow;
        }
        return row;
      });
      return { ...prev, staffFees: updated };
    });
  };

  const handleDeleteStaffRow = (id: string, positionName: string) => {
    if (!window.confirm(`Are you sure you want to delete row "${positionName}" from the staff remuneration schedule?`)) {
      return;
    }
    setC1Data(prev => ({
      ...prev,
      staffFees: (prev.staffFees || []).filter(row => row.id !== id)
    }));
  };

  const handleAddStaffRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffPosition.trim()) return;

    const constrNum = Number(newStaffMmConstr);
    const dlpNum = Number(newStaffMmDlp);
    const rateNum = Number(newStaffRateEtb);

    if (isNaN(constrNum) || constrNum < 0 || isNaN(dlpNum) || dlpNum < 0 || isNaN(rateNum) || rateNum < 0) {
      alert('Validation Error: Construction MM, DLP MM, and Rate (ETB) must be valid non-negative numbers.');
      return;
    }

    const categoryName = addMode === 'subtable' ? (newSubTableTitle.trim() || 'Custom Sub-Table') : newStaffCategory;
    const totalMm = constrNum + dlpNum;
    const totalEtb = totalMm * rateNum;

    const newRow: ContractStaffRateCondition1 = {
      id: `c1_staff_${Date.now()}`,
      no: newStaffNo.trim() || (addMode === 'subtable' ? '5.1' : '1.X'),
      position: newStaffPosition.trim(),
      name: newStaffName.trim() || 'To be nominated',
      category: categoryName,
      mmConstr: constrNum,
      mmDlp: dlpNum,
      totalMm,
      rateEtb: rateNum,
      totalEtb
    };

    setC1Data(prev => ({
      ...prev,
      staffFees: [...(prev.staffFees || []), newRow]
    }));

    setIsAddStaffOpen(false);
    setAddMode('staff');
    setNewSubTableTitle('');
    setNewStaffPosition('');
    setNewStaffNo('');
    setNewStaffName('To be nominated');
  };

  // -------------------------------------------------------------
  // SAVE & BIDIRECTIONAL LINK WITH INVOICE TABLES
  // -------------------------------------------------------------
  const handleSaveAndSyncContract = () => {
    if (!onUpdateProject) return;

    const currentPersonnel: ConsultantPersonnel[] = consultant.personnel || [];

    // Map of rates by normalized position & name from Table 1.3
    const rateMapByPosition: Record<string, number> = {};
    const rateMapByName: Record<string, number> = {};
    const mmMapByPosition: Record<string, number> = {};

    (c1Data.staffFees || []).forEach(s => {
      const posKey = (s.position || '').toLowerCase().trim();
      const nameKey = (s.name || '').toLowerCase().trim();
      if (s.rateEtb) {
        rateMapByPosition[posKey] = s.rateEtb;
        mmMapByPosition[posKey] = s.totalMm;
        if (s.name && s.name !== 'To be nominated' && s.name !== 'TBN') {
          rateMapByName[nameKey] = s.rateEtb;
        }
      }
    });

    // Synchronize current personnel with newly updated rates
    const updatedPersonnel = currentPersonnel.map(p => {
      const pName = (p.name || '').toLowerCase().trim();
      const pPos = (p.position || '').toLowerCase().trim();
      const matchedRate = rateMapByName[pName] ?? rateMapByPosition[pPos];
      const matchedMm = mmMapByPosition[pPos];

      return {
        ...p,
        monthlyBillingRate: matchedRate !== undefined ? matchedRate : p.monthlyBillingRate,
        manMonthsAllocated: matchedMm !== undefined ? matchedMm : p.manMonthsAllocated
      };
    });

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      enableUsdPayments: false, // Strictly ETB only
      originalFeeEtb: summaryPrice.grandTotal,
      revisedFeeEtb: summaryPrice.grandTotal,
      originalFeeUsd: 0,
      revisedFeeUsd: 0,
      personnel: updatedPersonnel,
      contractAmountSchedule: {
        condition1: {
          ...c1Data,
          totalManMonths: staffSubtotals.grandTotalMm,
          feesTimeBased: summaryPrice.fees,
          reimbursableTotal: summaryPrice.reimb,
          summary: {
            fees: summaryPrice.fees,
            reimbursableExpenses: summaryPrice.reimb,
            contingency: summaryPrice.contingency,
            vat: summaryPrice.vat,
            subTotal: summaryPrice.grandTotal
          },
          staffFees: c1Data.staffFees
        }
      }
    };

    onUpdateProject({ 
      supervisionConsultant: updatedConsultant,
      enableUsdPayments: false
    }, 'contract_amount');

    setSaveSuccessMessage('Contract tables successfully saved! Rates and reimbursable expenses are linked with the Monthly Invoice Calculation Table.');
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all values to the official standard baseline (820 MM Stadia Project schedule)?')) {
      return;
    }
    setC1Data({
      ...DEFAULT_CONDITION_1_DATA,
      reimbursableList: DEFAULT_CONDITION_1_REIMBURSABLES,
      staffFees: DEFAULT_CONDITION_1_STAFF
    });
    setSaveSuccessMessage('Values restored to standard baseline contract figures.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const isUsd = viewCurrency === 'USD';
  const effRate = exchangeRate && exchangeRate > 0 ? exchangeRate : (consultant.exchangeRate || project.exchangeRate || 125.0);
  const currencyUnit = isUsd ? 'USD' : 'ETB';
  const currencySymbol = isUsd ? '$' : '';

  const convertAmount = (val: number | undefined): number => {
    if (val === undefined || isNaN(val)) return 0;
    if (isUsd) {
      return effRate > 0 ? val / effRate : 0;
    }
    return val;
  };

  const fmt = (val: number | undefined, decimals = 2): string => {
    if (val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const fmtCurrency = (val: number | undefined, decimals = 2): string => {
    return fmt(convertAmount(val), decimals);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner: Dual Currency Real-time Switchable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`p-2.5 rounded-2xl ${isUsd ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'}`}>
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                  isUsd ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                }`}>
                  Condition 1 ({currencyUnit})
                </span>
                
                {/* Real-Time Currency Switcher Switch */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => onCurrencyToggle && onCurrencyToggle('ETB')}
                    className={`px-2.5 py-0.5 rounded-lg transition cursor-pointer ${
                      !isUsd ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ETB
                  </button>
                  <button
                    type="button"
                    onClick={() => onCurrencyToggle && onCurrencyToggle('USD')}
                    className={`px-2.5 py-0.5 rounded-lg transition cursor-pointer ${
                      isUsd ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    USD
                  </button>
                </div>

                {isUsd && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-mono font-bold border border-purple-200 dark:border-purple-800">
                    1 USD = {effRate.toFixed(2)} ETB
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
                Supervision Consultant Contract Amount & Remuneration
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Scope: Construction supervision plus DLP. Total 820 man-months.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isReadonly && (
            <>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Reset to default baseline figures"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveAndSyncContract}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Save contract schedule and link staff rates directly to monthly invoice calculation engine"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Link to Invoices
              </button>
            </>
          )}

          {onNavigateToPersonnel && (
            <button
              type="button"
              onClick={onNavigateToPersonnel}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Go to Personnel Directory</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          )}

          {onNavigateToInvoices && (
            <button
              type="button"
              onClick={onNavigateToInvoices}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-500" />
              <span>Go to Monthly Invoices</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Quick Summary Metric Cards & Calculation Mode Switch */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Calculator className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Contract Cost Calculation Source:
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  costCalculationMode === 'invoice_monthly_mm'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                }`}>
                  {costCalculationMode === 'invoice_monthly_mm' ? '⚡ Calculated from Invoice Monthly Man-Month Inputs' : 'Planned Contract Budget Schedule'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {costCalculationMode === 'invoice_monthly_mm'
                  ? `Overall cost is dynamically computed based on ${invoiceManMonthCosts.invoicesCount} monthly fee invoice(s) personnel attendance inputs (${fmt(invoiceManMonthCosts.totalExpendedMM, 2)} MM).`
                  : 'Displaying original master contract price schedule (820 planned man-months).'}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-bold shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setCostCalculationMode('invoice_monthly_mm')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                costCalculationMode === 'invoice_monthly_mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚡ Invoice Monthly MM Inputs</span>
            </button>
            <button
              type="button"
              onClick={() => setCostCalculationMode('contract_baseline')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                costCalculationMode === 'contract_baseline'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Contract Baseline (820 MM)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fees (Time-Based)</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {currencySymbol}{fmtCurrency(activeSummaryPrice.fees)} <span className="text-xs text-slate-400">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {fmt(activeSummaryPrice.expendedMm, 1)} MM ({costCalculationMode === 'invoice_monthly_mm' ? 'Expended from Invoices' : 'Planned Baseline'})
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reimbursables (Table 4)</span>
              <button
                type="button"
                onClick={() => {
                  setIsTable4Visible(true);
                  setActiveTableTab('all');
                }}
                className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                title="Open Table 4 to add or manage reimbursables"
              >
                + Add / View
              </button>
            </div>
            <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
              {currencySymbol}{fmtCurrency(activeSummaryPrice.reimb)} <span className="text-xs text-slate-400">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sum of {(c1Data.reimbursableList || []).length} user sub-items
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contingency & VAT (15%)</div>
            <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {currencySymbol}{fmtCurrency(activeSummaryPrice.contingency + activeSummaryPrice.vat)} <span className="text-xs text-slate-400">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">15% Contingency + 15% VAT</div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-xs ${
            isUsd 
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
          }`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${
              isUsd ? 'text-purple-800 dark:text-purple-300' : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              {costCalculationMode === 'invoice_monthly_mm' ? 'Overall Cost (From Invoices)' : 'Total Contract Price (E)'}
            </div>
            <div className={`text-xl font-black font-mono mt-1 ${
              isUsd ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              {currencySymbol}{fmtCurrency(activeSummaryPrice.grandTotal)} <span className="text-xs opacity-75">{currencyUnit}</span>
            </div>
            <div className="text-[11px] opacity-80 font-semibold mt-0.5">
              {costCalculationMode === 'invoice_monthly_mm' 
                ? 'Derived from Monthly MM Inputs' 
                : isUsd ? `Converted @ 1 USD = ${effRate.toFixed(2)} ETB` : '100% Local Currency ETB'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs matching Fee Invoices */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTableTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>All Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'summary'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">1</span>
            <span>Table 1: Summary of Contract Price</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('construction')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'construction'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">2</span>
            <span>Table 2: Construction Remuneration</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('dlp')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'dlp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">3</span>
            <span>Table 3: Defect Liability (DLP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableTab('condition2')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'condition2'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">C2</span>
            <span>Condition 2</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTableTab('reimbursable');
              setIsTable4Visible(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'reimbursable'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">4</span>
            <span>Table 4: Reimbursables {isTable4Visible ? '(Open)' : '(Click to Add)'}</span>
          </button>
        </div>

        {onNavigateToInvoices && (
          <button
            type="button"
            onClick={onNavigateToInvoices}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer self-end sm:self-auto shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Go to Fee Invoices</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* TABLE 1 — SUMMARY OF CONTRACT PRICE (ETB) */}
      {(activeTableTab === 'all' || activeTableTab === 'summary') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono font-bold">1</span>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Table 1 — Summary of Contract Price ({currencyUnit})
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Consolidated master summary derived from sub-tables (Table 2 Construction, Table 3 DLP, Reimbursables, Contingency & VAT).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <span>🔗 Mirrors Invoice Table 5 (Consolidated Summary)</span>
              </span>
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5 text-left font-bold w-16">Item</th>
                <th className="p-3.5 text-left font-bold">Description & Breakdown</th>
                <th className="p-3.5 text-right font-bold w-64">Amount ({currencyUnit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {/* Item A Header */}
              <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                <td className="p-3 font-bold text-slate-900 dark:text-white">A.</td>
                <td className="p-3 font-sans font-bold text-slate-900 dark:text-white" colSpan={2}>
                  Professional Staff Remuneration (Time-Based)
                </td>
              </tr>

              {/* Item A.1: Construction Staff */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="py-2.5 px-3.5 pl-6 text-slate-500 font-bold">A.1</td>
                <td className="py-2.5 px-3.5 pl-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Construction Supervisory Personnel Remuneration (Table 2)</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({fmt(costCalculationMode === 'invoice_monthly_mm' ? invoiceManMonthCosts.constructionExpendedMM : staffSubtotals.totalConstrMm, 1)} MM {costCalculationMode === 'invoice_monthly_mm' ? 'Expended' : 'Planned'})
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.feesConstruction)}
                </td>
              </tr>

              {/* Item A.2: DLP Staff */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="py-2.5 px-3.5 pl-6 text-slate-500 font-bold">A.2</td>
                <td className="py-2.5 px-3.5 pl-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Defect Liability Period (DLP) Personnel Remuneration (Table 3)</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({fmt(costCalculationMode === 'invoice_monthly_mm' ? invoiceManMonthCosts.dlpExpendedMM : staffSubtotals.totalDlpMm, 1)} MM {costCalculationMode === 'invoice_monthly_mm' ? 'Expended' : 'Planned'})
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.feesDlp)}
                </td>
              </tr>

              {/* Subtotal A */}
              <tr className="bg-slate-100/60 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-700">
                <td className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Sub-Total A</td>
                <td className="py-2.5 px-3.5 font-sans text-slate-800 dark:text-slate-200">
                  Total Professional Staff Fees (A.1 + A.2)
                </td>
                <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.fees)}
                </td>
              </tr>

              {/* Item B: Reimbursables */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">B.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span>Reimbursable Direct Costs (Operating & Logistical Expenses)</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 block font-normal mt-0.5">
                        Sum of {(c1Data.reimbursableList || []).length} user-added reimbursable sub-items (Per Diem, Communications, Insurance, etc.)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTable4Visible(prev => !prev);
                        if (!isTable4Visible) setActiveTableTab('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                        isTable4Visible 
                          ? 'bg-amber-600 text-white border-amber-700' 
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      }`}
                      title="Table 4 is visible and available only if you want to add or manage reimbursables"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isTable4Visible ? 'Hide Table 4 (Done)' : '+ Add / Manage Reimbursables (Table 4)'}</span>
                    </button>
                  </div>
                </td>
                <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white font-mono text-base">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.reimb)}
                </td>
              </tr>

              {/* Direct Subtotal (A + B) */}
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-b border-slate-300 dark:border-slate-700">
                <td className="py-2.5 px-3.5"></td>
                <td className="py-2.5 px-3.5 uppercase font-sans text-xs text-slate-700 dark:text-slate-300">
                  Sub-Total Direct Services & Expenses (A + B)
                </td>
                <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.directSubTotal)}
                </td>
              </tr>

              {/* Item C: Contingency */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">C.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Contingency Provision (</span>
                  <input
                    type="number"
                    step="any"
                    disabled={isReadonly}
                    value={c1Data.contingencyPct ?? 15}
                    onChange={(e) => setC1Data(prev => ({ ...prev, contingencyPct: parseFloat(e.target.value) || 0 }))}
                    className="w-12 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 outline-none"
                  />
                  <span>% of A+B)</span>
                </td>
                <td className="p-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.contingency)}
                </td>
              </tr>

              {/* Base before VAT */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <td className="py-2 px-3.5"></td>
                <td className="py-2 px-3.5 font-sans">
                  Base Amount Before VAT (A + B + C)
                </td>
                <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.baseBeforeVat)}
                </td>
              </tr>

              {/* Item D: VAT */}
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">D.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Value Added Tax (</span>
                  <input
                    type="number"
                    step="any"
                    disabled={isReadonly}
                    value={c1Data.vatPct ?? 15}
                    onChange={(e) => setC1Data(prev => ({ ...prev, vatPct: parseFloat(e.target.value) || 0 }))}
                    className="w-12 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 outline-none"
                  />
                  <span>% VAT on A+B+C)</span>
                </td>
                <td className="p-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.vat)}
                </td>
              </tr>

              {/* Item E: Total */}
              <tr className="bg-emerald-50/75 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold border-t-2 border-emerald-300 dark:border-emerald-700">
                <td className="p-3.5 text-base">E.</td>
                <td className="p-3.5 font-sans text-base flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>
                    Sub-total ({costCalculationMode === 'invoice_monthly_mm' ? 'Overall Cost Calculated from Invoice Monthly MM Inputs' : 'Total Planned Contract Price'})
                  </span>
                  {costCalculationMode === 'invoice_monthly_mm' && (
                    <span className="text-xs font-mono font-normal text-emerald-700 dark:text-emerald-300">
                      ⚡ Live derived from {invoiceManMonthCosts.invoicesCount} monthly invoice attendance records
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-right text-base text-emerald-700 dark:text-emerald-300 font-black">
                  {currencySymbol}{fmtCurrency(activeSummaryPrice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* OVERALL COST VS BASELINE RECONCILIATION & AUDIT TABLE */}
      {(activeTableTab === 'all' || activeTableTab === 'summary') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Overall Cost Audit & Financial Reconciliation (Invoice Inputs vs Contract Baseline)
                </h5>
                <p className="text-[11px] text-slate-500">
                  Comprehensive audit comparison comparing 820 planned MM baseline budget with actual man-month inputs recorded on the monthly invoice page.
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Invoices Tracked: <span className="font-mono text-blue-600 dark:text-blue-400 font-black">{invoiceManMonthCosts.invoicesCount}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-2.5 text-left">Cost Component</th>
                  <th className="p-2.5 text-right">Contract Baseline (820 MM) ({currencyUnit})</th>
                  <th className="p-2.5 text-right text-blue-600 dark:text-blue-400">Incurred (From Monthly MM Inputs) ({currencyUnit})</th>
                  <th className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">Remaining Balance ({currencyUnit})</th>
                  <th className="p-2.5 text-right w-24">Utilization %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                    Item A: Staff Remuneration (Time-Based)
                  </td>
                  <td className="p-2.5 text-right">{currencySymbol}{fmtCurrency(summaryPrice.fees)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">
                    {currencySymbol}{fmtCurrency(invoiceManMonthCosts.staffExpendedFees)} {currencyUnit}
                    <span className="text-[10px] text-slate-400 block font-normal font-sans">
                      ({fmt(invoiceManMonthCosts.totalExpendedMM, 2)} MM / 820 MM)
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{fmtCurrency(Math.max(0, summaryPrice.fees - invoiceManMonthCosts.staffExpendedFees))} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right font-bold">
                    {summaryPrice.fees > 0 ? ((invoiceManMonthCosts.staffExpendedFees / summaryPrice.fees) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                    Item B: Reimbursable Direct Operating Expenses (Table 4)
                  </td>
                  <td className="p-2.5 text-right">{currencySymbol}{fmtCurrency(reimbursableTotal)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">
                    {currencySymbol}{fmtCurrency(invoiceManMonthCosts.reimbursableExpended)} {currencyUnit}
                    <span className="text-[10px] text-slate-400 block font-normal font-sans">
                      ({(c1Data.reimbursableList || []).length} sub-items)
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{fmtCurrency(Math.max(0, reimbursableTotal - invoiceManMonthCosts.reimbursableExpended))} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right font-bold">
                    {reimbursableTotal > 0 ? ((invoiceManMonthCosts.reimbursableExpended / reimbursableTotal) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                    Item C: Contingency Provision (15%)
                  </td>
                  <td className="p-2.5 text-right">{currencySymbol}{fmtCurrency(summaryPrice.contingency)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{currencySymbol}{fmtCurrency(invoiceManMonthCosts.contingency)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{fmtCurrency(Math.max(0, summaryPrice.contingency - invoiceManMonthCosts.contingency))} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right font-bold">
                    {summaryPrice.contingency > 0 ? ((invoiceManMonthCosts.contingency / summaryPrice.contingency) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                    Item D: Value Added Tax (15%)
                  </td>
                  <td className="p-2.5 text-right">{currencySymbol}{fmtCurrency(summaryPrice.vat)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{currencySymbol}{fmtCurrency(invoiceManMonthCosts.vat)} {currencyUnit}</td>
                  <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{fmtCurrency(Math.max(0, summaryPrice.vat - invoiceManMonthCosts.vat))} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right font-bold">
                    {summaryPrice.vat > 0 ? ((invoiceManMonthCosts.vat / summaryPrice.vat) * 100).toFixed(1) : 0}%
                  </td>
                </tr>

                <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-black border-t-2 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white">
                  <td className="p-2.5 font-sans">
                    TOTAL OVERALL COST (Item E)
                  </td>
                  <td className="p-2.5 text-right">{currencySymbol}{fmtCurrency(summaryPrice.grandTotal)} {currencyUnit}</td>
                  <td className="p-2.5 text-right text-indigo-700 dark:text-indigo-300 font-black">
                    {currencySymbol}{fmtCurrency(invoiceManMonthCosts.overallCost)} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-300 font-black">
                    {currencySymbol}{fmtCurrency(Math.max(0, summaryPrice.grandTotal - invoiceManMonthCosts.overallCost))} {currencyUnit}
                  </td>
                  <td className="p-2.5 text-right font-black text-indigo-700 dark:text-indigo-300">
                    {summaryPrice.grandTotal > 0 ? ((invoiceManMonthCosts.overallCost / summaryPrice.grandTotal) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 4 COLLAPSED BANNER: Available only if user wants to add/manage reimbursables */}
      {!isTable4Visible && activeTableTab !== 'reimbursable' && (
        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">4</span>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Table 4 — Reimbursable Direct Operating Expenses Schedule (ETB)
                </h5>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                  Available Only When Adding
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Table 4 is hidden by default. The total of <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{fmt(reimbursableTotal)} ETB</span> is the exact sum of {(c1Data.reimbursableList || []).length} user-added sub-items and feeds directly into Table 1 Item B. Click below if you want to add or configure reimbursables.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsTable4Visible(true);
              setActiveTableTab('all');
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Reimbursable Direct Operating Expenses</span>
          </button>
        </div>
      )}

      {/* TABLE 2 — CONSTRUCTION STAFF REMUNERATION SCHEDULE (ETB) */}
      {(activeTableTab === 'all' || activeTableTab === 'construction') && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden mt-6">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono font-bold">2</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Table 2 — Construction Staff Remuneration Schedule ({currencyUnit})
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
              <span>🔗 Mirrors Invoice Table 2 (Construction Fees)</span>
            </span>
            {!isReadonly && (
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Staff Position
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-left font-bold w-14">No.</th>
                <th className="p-3 text-left font-bold min-w-[190px]">Position</th>
                <th className="p-3 text-left font-bold min-w-[160px]">Nominated Staff Name</th>
                <th className="p-3 text-right font-bold w-28">MM (Constr.)</th>
                <th className="p-3 text-right font-bold w-32">Rate ({currencyUnit})</th>
                <th className="p-3 text-right font-bold w-36">Constr. Total ({currencyUnit})</th>
                {consultant.enableUsdPayments && (
                  <>
                    <th className="p-3 text-right font-bold w-32">Rate (USD)</th>
                    <th className="p-3 text-right font-bold w-36">Constr. Total (USD)</th>
                  </>
                )}
                {!isReadonly && <th className="p-3 text-center font-bold w-14">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {staffSubtotals.groups.map((group) => (
                <React.Fragment key={group.categoryKey}>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                    <td className="p-3 text-left" colSpan={!isReadonly ? 7 : 6}>
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const constrTotalEtb = (Number(row.mmConstr) || 0) * (Number(row.rateEtb) || 0);
                    const constrTotalUsd = (Number(row.mmConstr) || 0) * (Number(row.rateUsd) || 0);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 text-slate-500 font-bold">{row.no}</td>
                        <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                          <input
                            type="text"
                            disabled={isReadonly}
                            value={row.position}
                            onChange={(e) => handleUpdateStaffRow(row.id!, 'position', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3 font-sans text-slate-600 dark:text-slate-300">
                          <input
                            type="text"
                            disabled={isReadonly}
                            value={row.name}
                            onChange={(e) => handleUpdateStaffRow(row.id!, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={isReadonly}
                            value={row.mmConstr}
                            onChange={(e) => handleUpdateStaffRow(row.id!, 'mmConstr', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={isReadonly}
                            value={row.rateEtb}
                            onChange={(e) => handleUpdateStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-emerald-600"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {currencySymbol}{fmtCurrency(constrTotalEtb)}
                        </td>
                        {consultant.enableUsdPayments && (
                          <>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="any"
                                disabled={isReadonly}
                                value={row.rateUsd || 0}
                                onChange={(e) => handleUpdateStaffRow(row.id!, 'rateUsd', parseFloat(e.target.value) || 0)}
                                className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-purple-600"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                              {'$'}{fmtCurrency(constrTotalUsd)}
                            </td>
                          </>
                        )}
                        {!isReadonly && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffRow(row.id!, row.position)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                              title="Delete position"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                    <td className="p-3" colSpan={3}>Sub-total ({group.categoryKey})</td>
                    <td className="p-3 text-right">{fmt(group.constrMm, 1)}</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{currencySymbol}{fmtCurrency(group.constrEtb)}</td>
                    {!isReadonly && <td></td>}
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-emerald-100 dark:bg-emerald-900/60 font-black text-slate-900 dark:text-white text-sm border-t-2 border-emerald-400 dark:border-emerald-600">
                <td className="p-3.5" colSpan={3}>TOTAL CONSTRUCTION REMUNERATION</td>
                <td className="p-3.5 text-right">{fmt(staffSubtotals.totalConstrMm, 1)}</td>
                <td className="p-3.5 text-right">—</td>
                <td className="p-3.5 text-right text-emerald-800 dark:text-emerald-200">
                  {currencySymbol}{fmtCurrency(staffSubtotals.groups.reduce((s, g) => s + g.constrEtb, 0))}
                </td>
                {!isReadonly && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* TABLE 3 — DEFECT LIABILITY PERIOD (DLP) STAFF REMUNERATION SCHEDULE (ETB) */}
      {(activeTableTab === 'all' || activeTableTab === 'dlp') && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden mt-6">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-mono font-bold">3</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Table 3 — Defect Liability Period (DLP) Staff Remuneration Schedule ({currencyUnit})
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
              <span>🔗 Mirrors Invoice Table 4 (DLP Claim)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-left font-bold w-14">No.</th>
                <th className="p-3 text-left font-bold min-w-[190px]">Position</th>
                <th className="p-3 text-left font-bold min-w-[160px]">Nominated Staff Name</th>
                <th className="p-3 text-right font-bold w-28">MM (DLP)</th>
                <th className="p-3 text-right font-bold w-32">Rate ({currencyUnit})</th>
                <th className="p-3 text-right font-bold w-36">DLP Total ({currencyUnit})</th>
                {!isReadonly && <th className="p-3 text-center font-bold w-14">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {staffSubtotals.groups.map((group) => (
                <React.Fragment key={`dlp_${group.categoryKey}`}>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                    <td className="p-3 text-left" colSpan={!isReadonly ? 7 : 6}>
                      {group.label} (DLP Period)
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const dlpTotal = (Number(row.mmDlp) || 0) * (Number(row.rateEtb) || 0);
                    return (
                      <tr key={`dlp_row_${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 text-slate-500 font-bold">{row.no}</td>
                        <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">{row.position}</td>
                        <td className="p-3 font-sans text-slate-600 dark:text-slate-300">{row.name}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            step="any"
                            disabled={isReadonly}
                            value={row.mmDlp}
                            onChange={(e) => handleUpdateStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {currencySymbol}{fmtCurrency(row.rateEtb)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {currencySymbol}{fmtCurrency(dlpTotal)}
                        </td>
                        {!isReadonly && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffRow(row.id!, row.position)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                              title="Delete position"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                    <td className="p-3" colSpan={3}>Sub-total DLP ({group.categoryKey})</td>
                    <td className="p-3 text-right">{fmt(group.dlpMm, 1)}</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right text-indigo-700 dark:text-indigo-300">{currencySymbol}{fmtCurrency(group.dlpEtb)}</td>
                    {!isReadonly && <td></td>}
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-indigo-100 dark:bg-indigo-900/60 font-black text-slate-900 dark:text-white text-sm border-t-2 border-indigo-400 dark:border-indigo-600">
                <td className="p-3.5" colSpan={3}>TOTAL DLP REMUNERATION (Table 3)</td>
                <td className="p-3.5 text-right">{fmt(staffSubtotals.totalDlpMm, 1)}</td>
                <td className="p-3.5 text-right">—</td>
                <td className="p-3.5 text-right text-indigo-800 dark:text-indigo-200">
                  {currencySymbol}{fmtCurrency(staffSubtotals.groups.reduce((s, g) => s + g.dlpEtb, 0))}
                </td>
                {!isReadonly && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* TABLE 4 — REIMBURSABLE DIRECT OPERATING EXPENSES SCHEDULE */}
      {(activeTableTab === 'reimbursable' || isTable4Visible) && (
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 rounded-3xl shadow-md overflow-hidden mt-6 animate-in fade-in duration-200">
        <div className="px-6 py-4 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-600 text-white text-xs flex items-center justify-center font-mono font-bold shadow-xs">4</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Table 4 — Reimbursable Direct Operating Expenses Schedule ({currencyUnit})
                </h4>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                  User Configurable Sub-Items
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                The total is dynamically calculated as the exact sum of all user-added sub-items and feeds directly into Table 1 Item B.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isReadonly && (
              <button
                type="button"
                onClick={handleAddReimbursableItem}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Add a new reimbursable expense sub-item row"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Sub-Item</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsTable4Visible(false);
                if (activeTableTab === 'reimbursable') setActiveTableTab('all');
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              title="Close or collapse Table 4"
            >
              Done / Hide Table 4
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 text-left font-bold w-14">No.</th>
                <th className="p-3 text-left font-bold min-w-[240px]">Expense Description / Sub-Item Name</th>
                <th className="p-3 text-left font-bold min-w-[220px]">Basis / Allocation Method</th>
                <th className="p-3 text-right font-bold w-48">Amount (ETB)</th>
                {consultant.enableUsdPayments && <th className="p-3 text-right font-bold w-48">Amount (USD)</th>}
                {!isReadonly && <th className="p-3 text-center font-bold w-16">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {(c1Data.reimbursableList || []).length === 0 ? (
                <tr>
                  <td colSpan={!isReadonly ? 5 : 4} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-xs">No reimbursable sub-items added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddReimbursableItem}
                      className="mt-2 text-xs text-amber-600 font-bold hover:underline"
                    >
                      + Add First Reimbursable Sub-Item
                    </button>
                  </td>
                </tr>
              ) : (
                (c1Data.reimbursableList || []).map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 text-slate-500 font-bold">{r.no || idx + 1}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                      <input
                        type="text"
                        disabled={isReadonly}
                        value={r.item}
                        onChange={(e) => handleUpdateReimbursableItem(r.id, 'item', e.target.value)}
                        placeholder="e.g. Per diem allowance, Communication, Site vehicle..."
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 font-semibold text-slate-900 dark:text-white outline-none px-1 py-0.5"
                      />
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-300 text-xs">
                      <input
                        type="text"
                        disabled={isReadonly}
                        value={r.basis}
                        onChange={(e) => handleUpdateReimbursableItem(r.id, 'basis', e.target.value)}
                        placeholder="e.g. Daily rate × days, monthly allowance, lump sum..."
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 text-slate-600 dark:text-slate-400 outline-none px-1 py-0.5"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="any"
                        disabled={isReadonly}
                        value={r.amountEtb}
                        onChange={(e) => handleUpdateReimbursableItem(r.id, 'amountEtb', e.target.value)}
                        className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-amber-500 focus:border-amber-500 outline-none font-bold text-amber-700 dark:text-amber-400 font-mono text-sm"
                      />
                    </td>
                    {consultant.enableUsdPayments && (
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={isReadonly}
                          value={r.amountUsd || 0}
                          onChange={(e) => handleUpdateReimbursableItem(r.id, 'amountUsd', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-amber-500 focus:border-amber-500 outline-none font-bold text-purple-700 dark:text-purple-400 font-mono text-sm"
                        />
                      </td>
                    )}
                    {!isReadonly && (
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteReimbursableItem(r.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                          title="Delete this reimbursable sub-item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              <tr className="bg-amber-100 dark:bg-amber-900/60 font-black text-slate-900 dark:text-white text-sm border-t-2 border-amber-400 dark:border-amber-600">
                <td className="p-3.5" colSpan={3}>
                  <div className="flex items-center justify-between">
                    <span>TOTAL REIMBURSABLE EXPENSES (Sum of Sub-Items → Table 1 Item B)</span>
                    <span className="text-xs font-normal text-amber-800 dark:text-amber-200 font-sans">
                      ({(c1Data.reimbursableList || []).length} sub-items configured)
                    </span>
                  </div>
                </td>
                <td className="p-3.5 text-right text-amber-800 dark:text-amber-200 font-mono font-black text-base">
                  {currencySymbol}{fmtCurrency(reimbursableTotal)} {currencyUnit}
                </td>
                {!isReadonly && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* CONDITION 2 VIEW */}
      {(activeTableTab === 'all' || activeTableTab === 'condition2') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mt-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
            Condition 2: Contractual Remuneration (Foreign/Local)
          </h4>
          <div className="text-xs text-slate-500 italic">
            Condition 2 implementation is available for detailed staff and reimbursable scheduling.
          </div>
        </div>
      )}
      
      {/* MODAL: ADD STAFF POSITION OR SUB-TABLE */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {addMode === 'staff' ? 'Add Staff Position to Schedule' : 'Add New Sub-Table / Section'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMode('staff')}
                className={`flex-1 py-2 rounded-lg transition ${addMode === 'staff' ? 'bg-white dark:bg-slate-900 shadow text-emerald-600' : 'text-slate-500'}`}
              >
                Add Staff Position
              </button>
              <button
                type="button"
                onClick={() => setAddMode('subtable')}
                className={`flex-1 py-2 rounded-lg transition ${addMode === 'subtable' ? 'bg-white dark:bg-slate-900 shadow text-emerald-600' : 'text-slate-500'}`}
              >
                Add New Sub-Table / Section
              </button>
            </div>

            <form onSubmit={handleAddStaffRowSubmit} className="space-y-4 text-xs">
              {addMode === 'subtable' ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Sub-Table / Section Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5. Specialized Environmental & Geotechnical Staff"
                    value={newSubTableTitle}
                    onChange={(e) => setNewSubTableTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newStaffCategory}
                      onChange={(e: any) => setNewStaffCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="Key Professional">1. Key Professional</option>
                      <option value="Intermediate">2. Intermediate Technical</option>
                      <option value="Support">3. Support Personnel</option>
                      <option value="Head Office">4. Head Office Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Item / Schedule No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1.15 or 3.10"
                      value={newStaffNo}
                      onChange={(e) => setNewStaffNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Bridge Engineer"
                  value={newStaffPosition}
                  onChange={(e) => setNewStaffPosition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominated Person Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Haile Tesfaye or To be nominated"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Constr. MM
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newStaffMmConstr}
                    onChange={(e) => setNewStaffMmConstr(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    DLP MM
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newStaffMmDlp}
                    onChange={(e) => setNewStaffMmDlp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rate (ETB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newStaffRateEtb}
                    onChange={(e) => setNewStaffRateEtb(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {addMode === 'staff' ? 'Add Position' : 'Create Sub-Table & Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REIMBURSABLE EXPENSE */}

    </div>
  );
};

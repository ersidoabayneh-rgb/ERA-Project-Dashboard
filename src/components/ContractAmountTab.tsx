import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Table, 
  ExternalLink,
  Receipt,
  Users,
  Calculator,
  Sliders,
  AlertTriangle
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
  DEFAULT_CONDITION_1_DLP_STAFF,
  DEFAULT_CONDITION_1_REIMBURSABLES
} from '../data/defaultContractAmount';
import { ContractCurrencySplitSettingsPanel } from './ContractCurrencySplitSettingsPanel';

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

  // Initialize Condition 1 State with independent Construction and DLP staff schedules
  const [c1Data, setC1Data] = useState<ContractCondition1Data>(() => {
    let cachedContingency: number | undefined;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`era_contract_contingency_${project.id}`);
        if (stored) {
          const parsed = parseFloat(stored);
          if (!isNaN(parsed)) cachedContingency = parsed;
        }
      } catch (e) {}
    }

    if (savedSchedule) {
      const hasOldPlaceholder = savedSchedule.reimbursableList && savedSchedule.reimbursableList.length === 3 && savedSchedule.reimbursableList[0].item === 'Per diem';
      const reimbList = savedSchedule.reimbursableList && savedSchedule.reimbursableList.length > 0 && !hasOldPlaceholder
        ? savedSchedule.reimbursableList.map(r => ({
            ...r,
            description: r.description || r.item,
            item: r.item || r.description || '',
            amountEtb: r.amountEtb ?? r.contractAmount ?? 0,
            contractAmount: r.amountEtb ?? r.contractAmount ?? 0
          }))
        : DEFAULT_CONDITION_1_REIMBURSABLES;
      
      const staffList = savedSchedule.staffFees && savedSchedule.staffFees.length > 0
        ? savedSchedule.staffFees
        : DEFAULT_CONDITION_1_STAFF;

      const dlpStaffList = savedSchedule.dlpStaffFees && savedSchedule.dlpStaffFees.length > 0
        ? savedSchedule.dlpStaffFees
        : (savedSchedule.staffFees && savedSchedule.staffFees.some(s => (s.mmDlp || 0) > 0))
          ? savedSchedule.staffFees.filter(s => (s.mmDlp || 0) > 0).map(s => ({
              ...s,
              id: s.id?.startsWith('dlp_') ? s.id : `dlp_${s.id}`,
              mmConstr: 0,
              totalMm: s.mmDlp,
              totalEtb: (Number(s.mmDlp) || 0) * (Number(s.rateEtb) || 0),
              totalUsd: (Number(s.mmDlp) || 0) * (Number(s.rateUsd) || 0)
            }))
          : DEFAULT_CONDITION_1_DLP_STAFF;

      return {
        ...DEFAULT_CONDITION_1_DATA,
        ...savedSchedule,
        contingencyPct: savedSchedule.contingencyPct ?? cachedContingency ?? 15,
        reimbursableList: reimbList,
        staffFees: staffList,
        dlpStaffFees: dlpStaffList
      };
    }
    return {
      ...DEFAULT_CONDITION_1_DATA,
      contingencyPct: cachedContingency ?? DEFAULT_CONDITION_1_DATA.contingencyPct ?? 15,
      reimbursableList: DEFAULT_CONDITION_1_REIMBURSABLES,
      staffFees: DEFAULT_CONDITION_1_STAFF,
      dlpStaffFees: DEFAULT_CONDITION_1_DLP_STAFF
    };
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [reimbSyncStatus, setReimbSyncStatus] = useState<{
    status: 'synced' | 'error' | 'syncing';
    message?: string;
    invalidRowId?: string;
    lastRecalculatedAt?: string;
  }>({
    status: 'synced',
    message: 'Sub Total 2 synchronized with Fee Invoices'
  });
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'summary' | 'construction' | 'dlp' | 'reimbursable' | 'currency_split'>('all');
  const [isSplitSettingsOpen, setIsSplitSettingsOpen] = useState(false);

  // Modal state for adding a new staff position (supports independent Table 2 Construction and Table 3 DLP)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [addStaffTargetTable, setAddStaffTargetTable] = useState<'construction' | 'dlp'>('construction');
  const [newStaffCategory, setNewStaffCategory] = useState<'Key Professional' | 'Intermediate' | 'Support' | 'Head Office'>('Key Professional');
  const [newStaffNo, setNewStaffNo] = useState('');
  const [newStaffPosition, setNewStaffPosition] = useState('');
  const [newStaffName, setNewStaffName] = useState('To be nominated');
  const [newStaffMmConstr, setNewStaffMmConstr] = useState<number>(24);
  const [newStaffMmDlp, setNewStaffMmDlp] = useState<number>(1);
  const [newStaffRateEtb, setNewStaffRateEtb] = useState<number>(15000);
  const [newStaffRateUsd, setNewStaffRateUsd] = useState<number>(0);
  const [addMode, setAddMode] = useState<'staff' | 'subtable'>('staff');
  const [newSubTableTitle, setNewSubTableTitle] = useState('');

  const isUsd = viewCurrency === 'USD';
  // Show USD features strictly when the USD currency toggle option is active
  const isUsdEnabled = isUsd;
  const effRate = exchangeRate && exchangeRate > 0 ? exchangeRate : (consultant.exchangeRate || project.exchangeRate || 125.0);
  const currencyUnit = isUsdEnabled ? 'USD' : 'ETB';
  const currencySymbol = isUsdEnabled ? '$' : '';

  // -------------------------------------------------------------
  // TABLE 2: COMPUTED CONSTRUCTION STAFF BREAKDOWNS & SUB-TOTALS
  // -------------------------------------------------------------
  const constructionSubtotals = useMemo(() => {
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
      const constrEtb = rows.reduce((s, r) => s + ((Number(r.mmConstr) || 0) * (Number(r.rateEtb) || 0)), 0);
      const constrUsd = rows.reduce((s, r) => s + ((Number(r.mmConstr) || 0) * (Number(r.rateUsd) || 0)), 0);

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
        constrEtb,
        constrUsd
      };
    }).filter(g => g.rows.length > 0 || defaultCats.includes(g.categoryKey));

    const totalConstrMm = groups.reduce((s, g) => s + g.constrMm, 0);
    const totalConstrEtb = groups.reduce((s, g) => s + g.constrEtb, 0);
    const totalConstrUsd = groups.reduce((s, g) => s + (g.constrUsd || 0), 0);

    return {
      groups,
      totalConstrMm,
      totalConstrEtb,
      totalConstrUsd
    };
  }, [c1Data.staffFees]);

  // -------------------------------------------------------------
  // TABLE 3: COMPUTED DLP STAFF BREAKDOWNS & SUB-TOTALS
  // -------------------------------------------------------------
  const dlpSubtotals = useMemo(() => {
    // Filter out Head Office staff from DLP as requested
    const list = (c1Data.dlpStaffFees || []).filter(s => 
      s.category !== 'Head Office' && 
      !s.position?.toLowerCase().includes('project coordinator')
    );
    
    const defaultCats = ['Key Professional', 'Intermediate', 'Support'];
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
        }
        return false;
      });
      const dlpMm = rows.reduce((s, r) => s + (Number(r.mmDlp) || 0), 0);
      const dlpEtb = rows.reduce((s, r) => s + ((Number(r.mmDlp) || 0) * (Number(r.rateEtb) || 0)), 0);
      const dlpUsd = rows.reduce((s, r) => s + ((Number(r.mmDlp) || 0) * (Number(r.rateUsd) || 0)), 0);

      let label = cat;
      if (cat === 'Key Professional') label = '1. Key Professional Staff (DLP Supervision)';
      else if (cat === 'Intermediate') label = '2. Intermediate Technical Staff';
      else if (cat === 'Support') label = '3. Field & Laboratory Support Personnel';

      return {
        categoryKey: cat,
        label,
        rows,
        dlpMm,
        dlpEtb,
        dlpUsd
      };
    }).filter(g => g.rows.length > 0); // Only keep groups with actual rows for Table 3

    const totalDlpMm = groups.reduce((s, g) => s + g.dlpMm, 0);
    const totalDlpEtb = groups.reduce((s, g) => s + g.dlpEtb, 0);
    const totalDlpUsd = groups.reduce((s, g) => s + (g.dlpUsd || 0), 0);

    return {
      groups,
      totalDlpMm,
      totalDlpEtb,
      totalDlpUsd
    };
  }, [c1Data.dlpStaffFees]);

  // Combined staff totals
  const staffSubtotals = useMemo(() => {
    const totalConstrMm = constructionSubtotals.totalConstrMm;
    const totalDlpMm = dlpSubtotals.totalDlpMm;
    const grandTotalMm = totalConstrMm + totalDlpMm;
    const grandTotalFeesEtb = constructionSubtotals.totalConstrEtb + dlpSubtotals.totalDlpEtb;
    const grandTotalFeesUsd = constructionSubtotals.totalConstrUsd + dlpSubtotals.totalDlpUsd;

    return {
      groups: constructionSubtotals.groups,
      dlpGroups: dlpSubtotals.groups,
      totalConstrMm,
      totalDlpMm,
      grandTotalMm,
      grandTotalFeesEtb,
      grandTotalFeesUsd
    };
  }, [constructionSubtotals, dlpSubtotals]);

  // -------------------------------------------------------------
  // COMPUTED REIMBURSABLE EXPENSES TOTAL
  // -------------------------------------------------------------
  const reimbursableTotal = useMemo(() => {
    const list = c1Data.reimbursableList;
    if (list && list.length > 0) {
      return list.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
    }
    return c1Data.reimbursableTotal ?? c1Data.summary?.reimbursableExpenses ?? 9246789.75;
  }, [c1Data.reimbursableList, c1Data.reimbursableTotal, c1Data.summary?.reimbursableExpenses]);

  const reimbursableTotalUsd = useMemo(() => {
    const list = c1Data.reimbursableList;
    if (list && list.length > 0) {
      return list.reduce((sum, r) => sum + (Number(r.amountUsd) || 0), 0);
    }
    return 0;
  }, [c1Data.reimbursableList]);

  // Real-time synchronization helper to project state with strict validation check
  const syncReimbursableListToProject = (updatedList: ContractReimbursableCondition1[], newTotal: number): boolean => {
    // 1. Validation check across all reimbursable rows
    const invalidRow = updatedList.find(r => 
      (r.rate !== undefined && (isNaN(r.rate) || r.rate < 0)) ||
      (r.contractQty !== undefined && (isNaN(r.contractQty) || r.contractQty < 0)) ||
      (r.rateUsd !== undefined && (isNaN(r.rateUsd) || r.rateUsd < 0)) ||
      (r.amountEtb !== undefined && (isNaN(r.amountEtb) || r.amountEtb < 0)) ||
      !(r.item || r.description)?.trim()
    );

    if (invalidRow) {
      const reason = !(invalidRow.item || invalidRow.description)?.trim()
        ? 'Item description cannot be blank'
        : 'Unit Rate, Contract Quantity, and Amount must be valid non-negative numbers';
      
      setReimbSyncStatus({
        status: 'error',
        message: `Validation Error on Item #${invalidRow.no || '?'}: ${reason}. Sub Total 2 synchronization halted.`,
        invalidRowId: invalidRow.id
      });
      return false;
    }

    if (!onUpdateProject) {
      setReimbSyncStatus({
        status: 'error',
        message: 'Project persistence handler is not connected. Sub Total 2 row synchronization failed.',
        invalidRowId: undefined
      });
      return false;
    }

    try {
      const currentSchedule = consultant.contractAmountSchedule?.condition1 || DEFAULT_CONDITION_1_DATA;
      const updatedCondition1: ContractCondition1Data = {
        ...currentSchedule,
        ...c1Data,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal,
        summary: {
          ...(currentSchedule.summary || {}),
          reimbursableExpenses: newTotal
        }
      };

      onUpdateProject({
        supervisionConsultant: {
          ...consultant,
          contractAmountSchedule: {
            ...consultant.contractAmountSchedule,
            condition1: updatedCondition1
          }
        }
      }, 'contract_amount');

      setReimbSyncStatus({
        status: 'synced',
        message: `Sub Total 2 recalculated (${fmt(newTotal)} ETB) and synchronized with Fee Invoices.`,
        lastRecalculatedAt: new Date().toLocaleTimeString(),
        invalidRowId: undefined
      });
      return true;
    } catch (err: any) {
      setReimbSyncStatus({
        status: 'error',
        message: `Sub Total 2 synchronization failed: ${err?.message || 'Database update error'}`,
        invalidRowId: undefined
      });
      return false;
    }
  };

  const handleUpdateReimbursableItem = (id: string, field: keyof ContractReimbursableCondition1, value: any) => {
    let isRowInvalid = false;
    let rowValidationMsg = '';
    let updatedList: ContractReimbursableCondition1[] = [];
    let newTotal = 0;

    setC1Data(prev => {
      updatedList = (prev.reimbursableList || []).map(r => {
        if (r.id === id) {
          const parsedVal = (field === 'amountEtb' || field === 'amountUsd' || field === 'rate' || field === 'rateUsd' || field === 'contractQty' || field === 'contractAmount') 
            ? (value === '' ? 0 : parseFloat(value)) 
            : value;

          if (typeof parsedVal === 'number' && (isNaN(parsedVal) || parsedVal < 0)) {
            isRowInvalid = true;
            rowValidationMsg = `${String(field)} must be a positive number`;
          }

          const updated: ContractReimbursableCondition1 = {
            ...r,
            [field]: isNaN(parsedVal) ? 0 : parsedVal
          };
          
          if (field === 'item') {
            updated.description = value;
          } else if (field === 'description') {
            updated.item = value;
          }

          if (field === 'rate' || field === 'contractQty') {
            const rate = field === 'rate' ? (parseFloat(value) || 0) : (r.rate || 0);
            const qty = field === 'contractQty' ? (parseFloat(value) || 0) : (r.contractQty || 0);
            updated.amountEtb = Number((rate * qty).toFixed(2));
            updated.contractAmount = updated.amountEtb;
          }
          if (field === 'amountEtb' || field === 'contractAmount') {
            const amt = parseFloat(value) || 0;
            updated.amountEtb = amt;
            updated.contractAmount = amt;
          }
          if (field === 'rateUsd' || field === 'contractQty') {
            const rateUsd = field === 'rateUsd' ? (parseFloat(value) || 0) : (r.rateUsd || 0);
            const qty = field === 'contractQty' ? (parseFloat(value) || 0) : (r.contractQty || 0);
            if (rateUsd > 0) {
              updated.amountUsd = Number((rateUsd * qty).toFixed(2));
            }
          }
          
          return updated;
        }
        return r;
      });

      newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);

      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });

    if (isRowInvalid) {
      setReimbSyncStatus({
        status: 'error',
        message: `Validation Error on Item: ${rowValidationMsg}. Recalculation halted.`,
        invalidRowId: id
      });
    } else {
      setTimeout(() => {
        syncReimbursableListToProject(updatedList, newTotal);
      }, 0);
    }
  };

  const handleAddReimbursableItem = () => {
    const list = c1Data.reimbursableList || [];
    const newNo = String(list.length + 1);
    const newItem: ContractReimbursableCondition1 = {
      id: `reimb_${Date.now()}`,
      no: newNo,
      item: 'New Reimbursable Direct Expense Sub-Item',
      description: 'New Reimbursable Direct Expense Sub-Item',
      basis: 'Actual site expenditure & approved vouchers',
      unit: 'Month',
      rate: 15000,
      contractQty: 12,
      amountEtb: 180000,
      contractAmount: 180000
    };
    let updatedList: ContractReimbursableCondition1[] = [];
    let newTotal = 0;
    setC1Data(prev => {
      updatedList = [...(prev.reimbursableList || []), newItem];
      newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);
      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });
    setTimeout(() => {
      syncReimbursableListToProject(updatedList, newTotal);
    }, 0);
  };

  const handleDeleteReimbursableItem = (id: string) => {
    let updatedList: ContractReimbursableCondition1[] = [];
    let newTotal = 0;
    setC1Data(prev => {
      updatedList = (prev.reimbursableList || []).filter(r => r.id !== id);
      newTotal = updatedList.reduce((sum, r) => sum + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);
      return {
        ...prev,
        reimbursableList: updatedList,
        reimbursableTotal: newTotal
      };
    });
    setTimeout(() => {
      syncReimbursableListToProject(updatedList, newTotal);
    }, 0);
  };

  const handleResetToOfficialReimbursables = () => {
    if (!window.confirm('Reset Table B back to the official 10 DKS Reimbursable Direct Operating Cost items from Fee Invoices Sub Total 2?')) {
      return;
    }
    const officialRows = DEFAULT_CONDITION_1_REIMBURSABLES;
    const newTotal = officialRows.reduce((sum, r) => sum + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);
    setC1Data(prev => ({
      ...prev,
      reimbursableList: officialRows,
      reimbursableTotal: newTotal
    }));
    setTimeout(() => {
      syncReimbursableListToProject(officialRows, newTotal);
    }, 0);
  };

  // -------------------------------------------------------------
  // COMPUTED SUMMARY OF CONTRACT PRICE (TABLE 1 BASELINE)
  // -------------------------------------------------------------
  const summaryPrice = useMemo(() => {
    const feesConstruction = constructionSubtotals.totalConstrEtb;
    const feesConstructionUsd = constructionSubtotals.totalConstrUsd;
    const feesDlp = dlpSubtotals.totalDlpEtb;
    const feesDlpUsd = dlpSubtotals.totalDlpUsd;
    const fees = feesConstruction + feesDlp;
    const feesUsd = feesConstructionUsd + feesDlpUsd;
    const reimb = reimbursableTotal;
    const reimbUsd = reimbursableTotalUsd;
    const directSubTotal = fees + reimb;
    const directSubTotalUsd = feesUsd + reimbUsd;
    const contingencyPct = Number(c1Data.contingencyPct ?? 15);
    const vatPct = Number(c1Data.vatPct ?? 15);

    const contingency = directSubTotal * (contingencyPct / 100);
    const contingencyUsd = directSubTotalUsd * (contingencyPct / 100);
    
    const baseBeforeVat = directSubTotal + contingency;
    const baseBeforeVatUsd = directSubTotalUsd + contingencyUsd;

    const vat = baseBeforeVat * (vatPct / 100);
    const vatUsd = baseBeforeVatUsd * (vatPct / 100);

    const grandTotal = baseBeforeVat + vat;
    const grandTotalUsd = baseBeforeVatUsd + vatUsd;

    return {
      feesConstruction,
      feesConstructionUsd,
      feesDlp,
      feesDlpUsd,
      fees,
      feesUsd,
      reimb,
      reimbUsd,
      directSubTotal,
      directSubTotalUsd,
      contingencyPct,
      contingency,
      contingencyUsd,
      baseBeforeVat,
      baseBeforeVatUsd,
      vatPct,
      vat,
      vatUsd,
      grandTotal,
      grandTotalUsd
    };
  }, [constructionSubtotals, dlpSubtotals, reimbursableTotal, reimbursableTotalUsd, c1Data.contingencyPct, c1Data.vatPct]);

  const activeSummaryPrice = useMemo(() => {
    return {
      ...summaryPrice,
      isDerivedFromInvoices: false,
      expendedMm: staffSubtotals.grandTotalMm
    };
  }, [summaryPrice, staffSubtotals.grandTotalMm]);

  // -------------------------------------------------------------
  // TABLE 2 (CONSTRUCTION) ROW EDITING
  // -------------------------------------------------------------
  const handleUpdateConstructionStaffRow = (id: string, field: keyof ContractStaffRateCondition1, value: any) => {
    setC1Data(prev => {
      const updatedConstruction = (prev.staffFees || []).map(row => {
        if (row.id === id) {
          const newRow = { ...row, [field]: value };
          if (field === 'mmConstr' || field === 'rateEtb') {
            const mm = field === 'mmConstr' ? (Number(value) || 0) : (Number(row.mmConstr) || 0);
            const rate = field === 'rateEtb' ? (Number(value) || 0) : (Number(row.rateEtb) || 0);
            newRow.totalMm = mm;
            newRow.totalEtb = mm * rate;
          }
          if (field === 'mmConstr' || field === 'rateUsd') {
            const mm = field === 'mmConstr' ? (Number(value) || 0) : (Number(row.mmConstr) || 0);
            const rateUsd = field === 'rateUsd' ? (Number(value) || 0) : (Number(row.rateUsd) || 0);
            newRow.totalUsd = mm * rateUsd;
          }
          return newRow;
        }
        return row;
      });

      return { ...prev, staffFees: updatedConstruction };
    });
  };

  const handleDeleteConstructionStaffRow = (id: string, positionName: string) => {
    if (!window.confirm(`Are you sure you want to delete row "${positionName}" from Table 2 (Construction Schedule)?`)) {
      return;
    }
    setC1Data(prev => ({
      ...prev,
      staffFees: (prev.staffFees || []).filter(row => row.id !== id)
    }));
  };

  // -------------------------------------------------------------
  // TABLE 3 (DLP) ROW EDITING
  // -------------------------------------------------------------
  const handleUpdateDlpStaffRow = (id: string, field: keyof ContractStaffRateCondition1, value: any) => {
    setC1Data(prev => {
      const updatedDlp = (prev.dlpStaffFees || []).map(row => {
        if (row.id === id) {
          const newRow = { ...row, [field]: value };
          if (field === 'mmDlp' || field === 'rateEtb') {
            const mm = field === 'mmDlp' ? (Number(value) || 0) : (Number(row.mmDlp) || 0);
            const rate = field === 'rateEtb' ? (Number(value) || 0) : (Number(row.rateEtb) || 0);
            newRow.totalMm = mm;
            newRow.totalEtb = mm * rate;
          }
          if (field === 'mmDlp' || field === 'rateUsd') {
            const mm = field === 'mmDlp' ? (Number(value) || 0) : (Number(row.mmDlp) || 0);
            const rateUsd = field === 'rateUsd' ? (Number(value) || 0) : (Number(row.rateUsd) || 0);
            newRow.totalUsd = mm * rateUsd;
          }
          return newRow;
        }
        return row;
      });

      return { ...prev, dlpStaffFees: updatedDlp };
    });
  };

  const handleDeleteDlpStaffRow = (id: string, positionName: string) => {
    if (!window.confirm(`Are you sure you want to delete row "${positionName}" from Table 3 (DLP Schedule)?`)) {
      return;
    }
    setC1Data(prev => ({
      ...prev,
      dlpStaffFees: (prev.dlpStaffFees || []).filter(row => row.id !== id)
    }));
  };

  const handleAddStaffRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffPosition.trim()) return;

    const rateNum = Number(newStaffRateEtb);
    const rateUsdNum = Number(newStaffRateUsd) || 0;
    const categoryName = addMode === 'subtable' ? (newSubTableTitle.trim() || 'Custom Sub-Table') : newStaffCategory;

    if (addStaffTargetTable === 'construction') {
      const constrNum = Number(newStaffMmConstr);
      if (isNaN(constrNum) || constrNum < 0 || isNaN(rateNum) || rateNum < 0) {
        alert('Validation Error: Construction MM and Rate (ETB) must be valid non-negative numbers.');
        return;
      }
      const newRow: ContractStaffRateCondition1 = {
        id: `c1_constr_${Date.now()}`,
        no: newStaffNo.trim() || (addMode === 'subtable' ? '5.1' : '1.X'),
        position: newStaffPosition.trim(),
        name: newStaffName.trim() || 'To be nominated',
        category: categoryName,
        mmConstr: constrNum,
        mmDlp: 0,
        totalMm: constrNum,
        rateEtb: rateNum,
        rateUsd: rateUsdNum,
        totalEtb: constrNum * rateNum,
        totalUsd: constrNum * rateUsdNum
      };

      setC1Data(prev => ({
        ...prev,
        staffFees: [...(prev.staffFees || []), newRow]
      }));
    } else {
      const dlpNum = Number(newStaffMmDlp);
      if (isNaN(dlpNum) || dlpNum < 0 || isNaN(rateNum) || rateNum < 0) {
        alert('Validation Error: DLP MM and Rate (ETB) must be valid non-negative numbers.');
        return;
      }
      const newRow: ContractStaffRateCondition1 = {
        id: `c1_dlp_${Date.now()}`,
        no: newStaffNo.trim() || (addMode === 'subtable' ? '5.1' : '1.X'),
        position: newStaffPosition.trim(),
        name: newStaffName.trim() || 'To be nominated',
        category: categoryName,
        mmConstr: 0,
        mmDlp: dlpNum,
        totalMm: dlpNum,
        rateEtb: rateNum,
        rateUsd: rateUsdNum,
        totalEtb: dlpNum * rateNum,
        totalUsd: dlpNum * rateUsdNum
      };

      setC1Data(prev => ({
        ...prev,
        dlpStaffFees: [...(prev.dlpStaffFees || []), newRow]
      }));
    }

    setIsAddStaffOpen(false);
    setAddMode('staff');
    setNewSubTableTitle('');
    setNewStaffPosition('');
    setNewStaffNo('');
    setNewStaffName('To be nominated');
  };

  // -------------------------------------------------------------
  // SAVE & LINK WITH INVOICE TABLES
  // -------------------------------------------------------------
  const handleSaveAndSyncContract = () => {
    if (!onUpdateProject) return;

    const currentPersonnel: ConsultantPersonnel[] = consultant.personnel || [];

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
      enableUsdPayments: isUsdEnabled,
      originalFeeEtb: summaryPrice.grandTotal,
      revisedFeeEtb: summaryPrice.grandTotal,
      originalFeeUsd: summaryPrice.grandTotalUsd || consultant.originalFeeUsd || 0,
      revisedFeeUsd: summaryPrice.grandTotalUsd || consultant.revisedFeeUsd || 0,
      exchangeRate: effRate,
      personnel: updatedPersonnel,
      contractAmountSchedule: {
        ...consultant.contractAmountSchedule,
        condition1: {
          ...c1Data,
          totalManMonths: staffSubtotals.grandTotalMm,
          feesTimeBased: summaryPrice.fees,
          reimbursableTotal: summaryPrice.reimb,
          summary: {
            fees: summaryPrice.fees,
            feesUsd: summaryPrice.feesUsd,
            feesConstruction: summaryPrice.feesConstruction,
            feesConstructionUsd: summaryPrice.feesConstructionUsd,
            feesDlp: summaryPrice.feesDlp,
            feesDlpUsd: summaryPrice.feesDlpUsd,
            reimbursableExpenses: summaryPrice.reimb,
            reimbursableUsd: summaryPrice.reimbUsd,
            contingency: summaryPrice.contingency,
            contingencyUsd: summaryPrice.contingencyUsd,
            vat: summaryPrice.vat,
            vatUsd: summaryPrice.vatUsd,
            subTotal: summaryPrice.grandTotal,
            subTotalUsd: summaryPrice.grandTotalUsd
          },
          staffFees: c1Data.staffFees,
          dlpStaffFees: c1Data.dlpStaffFees
        }
      }
    };

    onUpdateProject({ 
      supervisionConsultant: updatedConsultant,
      enableUsdPayments: isUsdEnabled
    }, 'contract_amount');

    setSaveSuccessMessage('Contract tables successfully saved! Figures are linked directly with the Monthly Invoice Calculation Table.');
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleApplySplits = (
    updatedStaff: ContractStaffRateCondition1[],
    updatedReimbursables: ContractReimbursableCondition1[],
    newExchangeRate: number,
    advancedSplitMode?: boolean
  ) => {
    const newReimbTotalEtb = updatedReimbursables.reduce((s, r) => s + (Number(r.amountEtb) || 0), 0);
    const newStaffFeesEtb = updatedStaff.reduce((s, r) => s + (Number(r.totalEtb) || 0), 0);
    const newStaffFeesUsd = updatedStaff.reduce((s, r) => s + (Number(r.totalUsd) || 0), 0);
    const newReimbTotalUsd = updatedReimbursables.reduce((s, r) => s + (Number(r.amountUsd) || 0), 0);

    const directEtb = newStaffFeesEtb + newReimbTotalEtb;
    const directUsd = newStaffFeesUsd + newReimbTotalUsd;
    const contEtb = directEtb * (Number(c1Data.contingencyPct ?? 15) / 100);
    const contUsd = directUsd * (Number(c1Data.contingencyPct ?? 15) / 100);
    const vatEtb = (directEtb + contEtb) * (Number(c1Data.vatPct ?? 15) / 100);
    const vatUsd = (directUsd + contUsd) * (Number(c1Data.vatPct ?? 15) / 100);
    const grandEtb = directEtb + contEtb + vatEtb;
    const grandUsd = directUsd + contUsd + vatUsd;

    const updatedC1: ContractCondition1Data = {
      ...c1Data,
      staffFees: updatedStaff,
      reimbursableList: updatedReimbursables,
      reimbursableTotal: newReimbTotalEtb,
      currencySplitSettings: {
        enabled: true,
        exchangeRate: newExchangeRate,
        lastAppliedAt: new Date().toISOString()
      }
    };

    setC1Data(updatedC1);

    if (onUpdateProject) {
      const updatedConsultant: SupervisionConsultantInfo = {
        ...consultant,
        enableUsdPayments: true,
        advancedSplitMode: advancedSplitMode !== undefined ? advancedSplitMode : consultant.advancedSplitMode,
        exchangeRate: newExchangeRate,
        originalFeeEtb: grandEtb,
        revisedFeeEtb: grandEtb,
        originalFeeUsd: grandUsd,
        revisedFeeUsd: grandUsd,
        contractAmountSchedule: {
          ...consultant.contractAmountSchedule,
          condition1: updatedC1
        }
      };

      onUpdateProject({
        supervisionConsultant: updatedConsultant,
        enableUsdPayments: true,
        exchangeRate: newExchangeRate
      }, 'currency_split');
    }

    setIsSplitSettingsOpen(false);
    setActiveTableTab('all');
    setSaveSuccessMessage(`USD / ETB splits successfully applied!`);
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all values to the official standard baseline schedule?')) {
      return;
    }
    setC1Data({
      ...DEFAULT_CONDITION_1_DATA,
      reimbursableList: DEFAULT_CONDITION_1_REIMBURSABLES,
      staffFees: DEFAULT_CONDITION_1_STAFF,
      dlpStaffFees: DEFAULT_CONDITION_1_DLP_STAFF
    });
    setSaveSuccessMessage('Values restored to standard baseline contract figures.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

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

  const isInvalidValue = (val: any) => val === '' || isNaN(Number(val)) || Number(val) < 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner: Dual Currency Switchable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`p-2.5 rounded-2xl ${isUsdEnabled ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'}`}>
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                  isUsdEnabled ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                }`}>
                  Condition 1 {isUsdEnabled ? '(Dual USD & ETB Mode)' : '(ETB)'}
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

                {isUsdEnabled && (
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
                onClick={() => {
                  setIsSplitSettingsOpen(prev => !prev);
                  if (!isSplitSettingsOpen) setActiveTableTab('currency_split');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs border cursor-pointer ${
                  isSplitSettingsOpen || activeTableTab === 'currency_split'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                    : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                }`}
                title="Configure USD & ETB percentage or fixed split for individual staff and reimbursable items"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>USD/ETB Split Settings</span>
              </button>
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

      {/* Quick Summary Metric Cards */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Calculator className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Contract Cost Calculation Source:
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                  Planned Contract Baseline Schedule (820 Planned MM)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Displaying official master contract price schedule (820 planned man-months baseline).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fees (Time-Based)</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {currencySymbol}{fmtCurrency(activeSummaryPrice.fees)} <span className="text-xs text-slate-400">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {fmt(activeSummaryPrice.expendedMm, 1)} MM (Planned Baseline)
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Direct Reimbursables</span>
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
              Total Contract Price (E)
            </div>
            <div className={`text-xl font-black font-mono mt-1 ${
              isUsd ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-400'
            }`}>
              {currencySymbol}{fmtCurrency(activeSummaryPrice.grandTotal)} <span className="text-xs opacity-75">{currencyUnit}</span>
            </div>
            <div className="text-[11px] opacity-80 font-semibold mt-0.5">
              {isUsd ? `Converted @ 1 USD = ${effRate.toFixed(2)} ETB` : '100% Local Currency ETB'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
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
            onClick={() => setActiveTableTab('reimbursable')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'reimbursable'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-mono">B</span>
            <span>Table B: Reimbursables</span>
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
            onClick={() => {
              setActiveTableTab('currency_split');
              setIsSplitSettingsOpen(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTableTab === 'currency_split' || isSplitSettingsOpen
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>⚙️ USD/ETB Split Settings</span>
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

      {/* USD / ETB CURRENCY SPLIT SETTINGS PANEL */}
      {(activeTableTab === 'currency_split' || isSplitSettingsOpen) && (
        <ContractCurrencySplitSettingsPanel
          staffFees={c1Data.staffFees || []}
          reimbursableList={c1Data.reimbursableList || []}
          contingencyPct={Number(c1Data.contingencyPct ?? 15)}
          vatPct={Number(c1Data.vatPct ?? 15)}
          initialExchangeRate={effRate}
          initialAdvancedSplitMode={Boolean(consultant.advancedSplitMode)}
          isReadonly={isReadonly}
          onApplySplits={handleApplySplits}
          onClose={() => {
            setIsSplitSettingsOpen(false);
            if (activeTableTab === 'currency_split') setActiveTableTab('all');
          }}
        />
      )}

      {/* TABLE 1 — SUMMARY OF CONTRACT PRICE */}
      {(activeTableTab === 'all' || activeTableTab === 'summary') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono font-bold">1</span>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Table 1 — Summary of Contract Price {isUsdEnabled ? '(ETB & USD Combined)' : '(ETB)'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Consolidated master summary derived from sub-tables (Table 2 Construction, Table B Reimbursables, Table 3 DLP, Contingency & VAT).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isUsdEnabled && (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-300 dark:border-purple-800">
                  Dual Currency Active: ETB + USD
                </span>
              )}
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
                  <th className="p-3.5 text-right font-bold w-48 text-emerald-800 dark:text-emerald-300">Amount (ETB)</th>
                  {isUsdEnabled && (
                    <th className="p-3.5 text-right font-bold w-48 text-purple-700 dark:text-purple-300">Amount (USD)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                {/* Item A Header */}
                <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">A.</td>
                  <td className="p-3 font-sans font-bold text-slate-900 dark:text-white" colSpan={isUsdEnabled ? 3 : 2}>
                    Professional Staff Remuneration (Time-Based)
                  </td>
                </tr>

                {/* Item A.1: Construction Staff */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3.5 pl-6 text-slate-500 font-bold">A.1</td>
                  <td className="py-2.5 px-3.5 pl-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Construction Supervisory Personnel Remuneration (Table 2)</span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({fmt(staffSubtotals.totalConstrMm, 1)} MM Planned)
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(activeSummaryPrice.feesConstruction)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.feesConstructionUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Item A.2: DLP Staff */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3.5 pl-6 text-slate-500 font-bold">A.2</td>
                  <td className="py-2.5 px-3.5 pl-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Defect Liability Period (DLP) Personnel Remuneration (Table 3)</span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({fmt(staffSubtotals.totalDlpMm, 1)} MM Planned)
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    {fmt(activeSummaryPrice.feesDlp)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.feesDlpUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Subtotal A */}
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-3.5 font-bold text-slate-700 dark:text-slate-300">Sub-Total A</td>
                  <td className="py-2.5 px-3.5 font-sans text-slate-800 dark:text-slate-200">
                    Total Professional Staff Fees (A.1 + A.2)
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(activeSummaryPrice.fees)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.feesUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Item B: Reimbursable Direct Operating Expenses */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3.5 pl-6 text-slate-500 font-bold">B.</td>
                  <td className="py-2.5 px-3.5 pl-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Reimbursable Direct Operating Expenses (Table B)</span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({(c1Data.reimbursableList || []).length} approved sub-items)
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    {fmt(activeSummaryPrice.reimb)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.reimbUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Direct Subtotal (A + B) */}
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-b border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-3.5"></td>
                  <td className="py-2.5 px-3.5 uppercase font-sans text-xs text-slate-700 dark:text-slate-300">
                    Sub-Total Direct Services & Expenses (A + B)
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(activeSummaryPrice.directSubTotal)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.directSubTotalUsd)} USD
                    </td>
                  )}
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
                      onChange={(e) => {
                        const newPct = parseFloat(e.target.value) || 0;
                        setC1Data(prev => ({ ...prev, contingencyPct: newPct }));
                        if (typeof window !== 'undefined') {
                          try {
                            localStorage.setItem(`era_contract_contingency_${project.id}`, String(newPct));
                          } catch (err) {}
                        }
                        if (onUpdateProject) {
                          onUpdateProject({
                            supervisionConsultant: {
                              ...consultant,
                              contractAmountSchedule: {
                                ...consultant.contractAmountSchedule,
                                condition1: {
                                  ...(consultant.contractAmountSchedule?.condition1 || c1Data),
                                  contingencyPct: newPct
                                }
                              }
                            }
                          }, 'contract_contingency');
                        }
                      }}
                      className="w-14 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span>% of A+B)</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    {fmt(activeSummaryPrice.contingency)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="p-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.contingencyUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Base before VAT */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <td className="py-2 px-3.5"></td>
                  <td className="py-2 px-3.5 font-sans">
                    Base Amount Before VAT (A + B + C)
                  </td>
                  <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {fmt(activeSummaryPrice.baseBeforeVat)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.baseBeforeVatUsd)} USD
                    </td>
                  )}
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
                    {fmt(activeSummaryPrice.vat)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="p-3.5 text-right font-bold text-purple-700 dark:text-purple-300">
                      ${fmt(activeSummaryPrice.vatUsd)} USD
                    </td>
                  )}
                </tr>

                {/* Item E: Total */}
                <tr className="bg-emerald-50/75 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold border-t-2 border-emerald-300 dark:border-emerald-700">
                  <td className="p-3.5 text-base">E.</td>
                  <td className="p-3.5 font-sans text-base">
                    Sub-total (Total Planned Contract Price)
                  </td>
                  <td className="p-3.5 text-right text-base text-emerald-700 dark:text-emerald-300 font-black font-mono">
                    {fmt(activeSummaryPrice.grandTotal)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="p-3.5 text-right text-base text-purple-700 dark:text-purple-300 font-black font-mono">
                      ${fmt(activeSummaryPrice.grandTotalUsd)} USD
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 2 — CONSTRUCTION STAFF REMUNERATION SCHEDULE */}
      {(activeTableTab === 'all' || activeTableTab === 'construction') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden mt-6">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-mono font-bold">2</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Table 2 — Construction Staff Remuneration Schedule
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <span>🔗 Mirrors Invoice Table 2 (Construction Fees)</span>
              </span>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    setAddStaffTargetTable('construction');
                    setIsAddStaffOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Staff Position
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Position & Assigned Name</th>
                  <th className="py-2.5 px-2 text-center w-14">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Rate (ETB)</th>
                  {isUsdEnabled && <th className="py-2.5 px-2 text-right min-w-[100px] text-purple-700 dark:text-purple-300">Rate (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[70px]">Contr. MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">Total Fee (ETB)</th>
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {staffSubtotals.groups.map((group) => (
                  <React.Fragment key={group.categoryKey}>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                      <td className="py-2 px-3 text-left" colSpan={isUsdEnabled ? 8 : 7}>
                        {group.label}
                      </td>
                    </tr>
                    {group.rows.map((row, idx) => {
                      const totalAmount = (Number(row.rateEtb) || 0) * (Number(row.mmConstr) || 0);
                      const totalAmountUsd = (Number(row.rateUsd) || 0) * (Number(row.mmConstr) || 0);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col gap-0.5">
                              <input
                                type="text"
                                value={row.position}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'position', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={row.name}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'name', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-400 focus:outline-none text-[10px] text-slate-500 font-bold italic"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500">
                            <input
                              type="text"
                              value={row.unit || 'Month'}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'unit' as any, e.target.value)}
                              className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              step="any"
                              value={row.rateEtb}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                              className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono"
                            />
                          </td>
                          {isUsdEnabled && (
                            <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                              <input
                                type="number"
                                step="any"
                                value={row.rateUsd || 0}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'rateUsd', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                          )}
                          <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            <input
                              type="number"
                              step="any"
                              value={row.mmConstr}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateConstructionStaffRow(row.id!, 'mmConstr', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{fmt(totalAmount)}</td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddStaffTargetTable('construction');
                                  setIsAddStaffOpen(true);
                                }}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="Add Row Below"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteConstructionStaffRow(row.id!, row.position)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 text-[10px]">
                      <td className="py-2 px-3" colSpan={3}>Sub-total ({group.categoryKey})</td>
                      <td className="py-2 px-2 text-right">—</td>
                      {isUsdEnabled && <td className="py-2 px-2 text-right">—</td>}
                      <td className="py-2 px-2 text-right font-mono">{fmt(group.constrMm, 1)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(group.constrEtb)}</td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800 text-[10px]">
                <tr className="uppercase tracking-tight">
                  <td colSpan={3} className="py-2.5 px-3">Sub-Total 1 Construction Fees:</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  {isUsdEnabled && <td className="py-2.5 px-2 text-right">—</td>}
                  <td className="py-2.5 px-2 text-right font-mono">{fmt(staffSubtotals.totalConstrMm, 1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">{fmt(staffSubtotals.totalConstrEtb)} ETB</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TABLE B — REIMBURSABLE DIRECT EXPENSES SCHEDULE */}
      {(activeTableTab === 'all' || activeTableTab === 'reimbursable') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden mt-6">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs flex items-center justify-center font-mono font-bold">2</span>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Table B — Reimbursable Direct Expenses Schedule (Sub Total 2)
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <span>🔗 Linked to Fee Invoices Sub Total 2</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {(c1Data.reimbursableList || []).length} items
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct field operating expenses (Head office support, communication, insurance, accommodation, surveying equipment, reports, vehicles, laboratory). Any changes here instantly synchronize with Sub Total 2 on the Fee Invoices & Payments page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs font-mono">
                <span>Sub-Total 2: <strong>{fmt(reimbursableTotal)} ETB</strong></span>
                {isUsdEnabled && reimbursableTotalUsd > 0 && (
                  <span className="text-purple-700 dark:text-purple-300 font-bold">(${fmt(reimbursableTotalUsd)} USD)</span>
                )}
              </span>

              {/* Real-time Sub Total 2 recalculation & sync status visual feedback */}
              {reimbSyncStatus.status === 'synced' ? (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs" title={`Recalculated & Synced at ${reimbSyncStatus.lastRecalculatedAt || 'live'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Sub Total 2 Synced ({fmt(reimbursableTotal)} ETB)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-400 dark:border-rose-700 flex items-center gap-1.5 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Sync Failed: Sub Total 2 Error</span>
                </span>
              )}

              {!isReadonly && (
                <>
                  <button
                    type="button"
                    onClick={handleResetToOfficialReimbursables}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs"
                    title="Reset to the 10 official DKS reimbursable rows"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Standard 10 Items
                  </button>
                  <button
                    type="button"
                    onClick={handleAddReimbursableItem}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Expense Item
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Immediate Visual Alert if Row Validation or Synchronization Fails */}
          {reimbSyncStatus.status === 'error' && (
            <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-200 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-black">Sub Total 2 Recalculation / Row Sync Failure: </span>
                  <span className="font-medium">{reimbSyncStatus.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newTotal = (c1Data.reimbursableList || []).reduce((sum, r) => sum + (Number(r.amountEtb ?? r.contractAmount) || 0), 0);
                  syncReimbursableListToProject(c1Data.reimbursableList || [], newTotal);
                }}
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
                  <th className="py-2.5 px-3 min-w-[240px]">Item Description</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[105px]">Rate (ETB)</th>
                  {isUsdEnabled && <th className="py-2.5 px-2 text-right min-w-[100px] text-purple-700 dark:text-purple-300">Rate (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[85px]">Contract Qty</th>
                  <th className="py-2.5 px-3 text-right min-w-[120px]">Contract Amount (ETB)</th>
                  {isUsdEnabled && <th className="py-2.5 px-3 text-right min-w-[110px] text-purple-700 dark:text-purple-300">Amount (USD)</th>}
                  <th className="py-2.5 px-2 text-center w-14">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs text-slate-800 dark:text-slate-200">
                {(c1Data.reimbursableList || []).length === 0 ? (
                  <tr>
                    <td colSpan={isUsdEnabled ? 9 : 8} className="py-8 text-center text-slate-400">
                      No reimbursable operating expenses defined. Click "+ Add Expense Item" to add.
                    </td>
                  </tr>
                ) : (
                  (c1Data.reimbursableList || []).map((row, idx) => {
                    const contractAmount = (Number(row.amountEtb ?? row.contractAmount) || 0);
                    const contractAmountUsd = (Number(row.amountUsd) || 0);
                    const isRowInError = reimbSyncStatus.invalidRowId === row.id ||
                      (row.rate !== undefined && (isNaN(row.rate) || row.rate < 0)) ||
                      (row.contractQty !== undefined && (isNaN(row.contractQty) || row.contractQty < 0)) ||
                      !(row.item || row.description)?.trim();

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
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateReimbursableItem(row.id, 'no', e.target.value)}
                            className="w-10 text-center bg-transparent border-b border-transparent hover:border-amber-300 focus:border-amber-500 focus:outline-none text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex flex-col gap-0.5">
                            <input
                              type="text"
                              value={row.item || row.description || ''}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateReimbursableItem(row.id, 'item', e.target.value)}
                              className={`w-full bg-transparent border-b text-xs font-bold focus:outline-none ${
                                !row.item?.trim() 
                                  ? 'border-rose-500 bg-rose-100/50 text-rose-800' 
                                  : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                              }`}
                            />
                            <input
                              type="text"
                              placeholder="Contractual basis / justification"
                              value={row.basis || ''}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateReimbursableItem(row.id, 'basis', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-amber-400 focus:outline-none text-[10px] text-slate-400 italic"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500">
                          <input
                            type="text"
                            value={row.unit || 'Month'}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateReimbursableItem(row.id, 'unit', e.target.value)}
                            className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          <input
                            type="number"
                            step="any"
                            value={row.rate || 0}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateReimbursableItem(row.id, 'rate', parseFloat(e.target.value))}
                            className={`w-24 text-right bg-transparent border-b text-xs font-mono focus:outline-none ${
                              row.rate !== undefined && (isNaN(row.rate) || row.rate < 0)
                                ? 'border-rose-500 bg-rose-100/50 text-rose-800 font-bold'
                                : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                            }`}
                          />
                        </td>
                        {isUsdEnabled && (
                          <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                            <input
                              type="number"
                              step="any"
                              value={row.rateUsd || (row.contractQty ? Number(((row.amountUsd || 0) / row.contractQty).toFixed(2)) : 0)}
                              disabled={isReadonly}
                              onChange={(e) => handleUpdateReimbursableItem(row.id, 'rateUsd', parseFloat(e.target.value))}
                              className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                            />
                          </td>
                        )}
                        <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                          <input
                            type="number"
                            step="any"
                            value={row.contractQty || 1}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateReimbursableItem(row.id, 'contractQty', parseFloat(e.target.value))}
                            className={`w-16 text-right bg-transparent border-b text-xs font-mono focus:outline-none ${
                              row.contractQty !== undefined && (isNaN(row.contractQty) || row.contractQty < 0)
                                ? 'border-rose-500 bg-rose-100/50 text-rose-800 font-bold'
                                : 'border-transparent hover:border-slate-300 focus:border-amber-500'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {fmt(contractAmount)}
                        </td>
                        {isUsdEnabled && (
                          <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
                            ${fmt(contractAmountUsd)}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={handleAddReimbursableItem}
                              className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Add Row Below"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReimbursableItem(row.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-amber-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={isUsdEnabled ? 6 : 5} className="py-2.5 px-3 text-amber-900 dark:text-amber-200 uppercase text-[10px] font-black">
                    Sub-Total 2 (Reimbursable Direct Operating Costs):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white font-black">
                    {fmt(reimbursableTotal)} ETB
                  </td>
                  {isUsdEnabled && (
                    <td className="py-2.5 px-3 text-right font-mono text-purple-700 dark:text-purple-300 font-black">
                      ${fmt(reimbursableTotalUsd)} USD
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 3 — DEFECT LIABILITY PERIOD (DLP) STAFF REMUNERATION SCHEDULE */}
      {(activeTableTab === 'all' || activeTableTab === 'dlp') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden mt-6">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-mono font-bold">3</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Table 3 — Defect Liability Period (DLP) Staff Remuneration Schedule
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                <span>🔗 Mirrors Invoice Table 4 (DLP Claim)</span>
              </span>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    setAddStaffTargetTable('dlp');
                    setIsAddStaffOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">DLP Personnel Position & Name</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-right min-w-[105px]">Monthly Rate (ETB)</th>
                  {isUsdEnabled && <th className="py-2.5 px-2 text-right min-w-[100px] text-purple-700 dark:text-purple-300">Rate (USD)</th>}
                  <th className="py-2.5 px-2 text-right min-w-[90px]">Contract MM</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">Contract Amount</th>
                  <th className="py-2.5 px-2 text-center w-12">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {staffSubtotals.dlpGroups.length === 0 ? (
                  <tr>
                    <td colSpan={isUsdEnabled ? 8 : 7} className="py-8 text-center text-slate-400">
                      No DLP personnel allocation rows defined. Click "+ Add Staff Position" to add.
                    </td>
                  </tr>
                ) : (
                  staffSubtotals.dlpGroups.flatMap(g => g.rows).map((row, idx) => {
                    const totalAmount = (Number(row.rateEtb) || 0) * (Number(row.mmDlp) || 0);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              <div className="flex flex-col gap-0.5">
                                <input
                                  type="text"
                                  value={row.position}
                                  disabled={isReadonly}
                                  onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'position', e.target.value)}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-bold"
                                />
                                <input
                                  type="text"
                                  value={row.name}
                                  disabled={isReadonly}
                                  onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'name', e.target.value)}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none text-[10px] text-slate-500 font-bold italic"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              <input
                                type="text"
                                value={row.unit || 'Month'}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'unit' as any, e.target.value)}
                                className="w-16 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              <input
                                type="number"
                                step="any"
                                value={row.rateEtb}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                            {isUsdEnabled && (
                              <td className="py-2 px-2 text-right font-mono text-purple-700 dark:text-purple-300">
                                <input
                                  type="number"
                                  step="any"
                                  value={row.rateUsd || 0}
                                  disabled={isReadonly}
                                  onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'rateUsd', parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-xs font-mono"
                                />
                              </td>
                            )}
                            <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                              <input
                                type="number"
                                step="any"
                                value={row.mmDlp}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateDlpStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                                className="w-16 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {fmt(totalAmount)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddStaffTargetTable('dlp');
                                    setIsAddStaffOpen(true);
                                  }}
                                  className="p-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                                  title="Add Row Below"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDlpStaffRow(row.id!, row.position)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-indigo-50/50 dark:bg-slate-800 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-indigo-900 dark:text-indigo-200 uppercase text-[10px] font-black">
                    Sub-Total 3 (DLP Staff Remuneration):
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-900 dark:text-white">
                    {fmt(staffSubtotals.totalDlpMm, 1)} MM
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-700 dark:text-indigo-300">
                    {fmt(staffSubtotals.totalDlpEtb)} ETB
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ADD STAFF POSITION MODAL */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Staff Position ({addStaffTargetTable === 'construction' ? 'Table 2 — Construction' : 'Table 3 — Defect Liability DLP'})
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaffRowSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Category / Group
                </label>
                <select
                  value={newStaffCategory}
                  onChange={(e) => setNewStaffCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                >
                  <option value="Key Professional">1. Key Professional Staff</option>
                  <option value="Intermediate">2. Intermediate Technical Staff</option>
                  <option value="Support">3. Field & Laboratory Support Personnel</option>
                  {addStaffTargetTable === 'construction' && (
                    <option value="Head Office">4. Head Office Support</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Position Ref / No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.15"
                    value={newStaffNo}
                    onChange={(e) => setNewStaffNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designated Position Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Bridge Engineer"
                  value={newStaffPosition}
                  onChange={(e) => setNewStaffPosition(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {addStaffTargetTable === 'construction' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Construction MM
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newStaffMmConstr}
                      onChange={(e) => setNewStaffMmConstr(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      DLP MM
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newStaffMmDlp}
                      onChange={(e) => setNewStaffMmDlp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rate (ETB)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newStaffRateEtb}
                    onChange={(e) => setNewStaffRateEtb(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              {isUsdEnabled && (
                <div>
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                    Monthly Rate (USD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newStaffRateUsd}
                    onChange={(e) => setNewStaffRateUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl p-2.5 text-xs font-mono font-bold text-purple-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
                >
                  Add Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

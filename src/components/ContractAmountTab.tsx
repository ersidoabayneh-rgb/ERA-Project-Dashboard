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
  Users
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
}

export const ContractAmountTab: React.FC<Props> = ({ 
  project, 
  consultant: propConsultant, 
  isReadonly = false,
  onUpdateProject,
  onNavigateToInvoices
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
      const totalEtb = rows.reduce((s, r) => s + (Number(r.totalEtb) || 0), 0);

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
        totalEtb
      };
    }).filter(g => g.rows.length > 0 || defaultCats.includes(g.categoryKey));

    const totalConstrMm = groups.reduce((s, g) => s + g.constrMm, 0);
    const totalDlpMm = groups.reduce((s, g) => s + g.dlpMm, 0);
    const grandTotalMm = groups.reduce((s, g) => s + g.totalMm, 0);
    const grandTotalFeesEtb = groups.reduce((s, g) => s + g.totalEtb, 0);

    return {
      groups,
      totalConstrMm,
      totalDlpMm,
      grandTotalMm,
      grandTotalFeesEtb
    };
  }, [c1Data.staffFees]);

  // -------------------------------------------------------------
  // COMPUTED REIMBURSABLE EXPENSES TOTAL
  // -------------------------------------------------------------
  const reimbursableTotal = useMemo(() => {
    return c1Data.reimbursableTotal ?? c1Data.summary?.reimbursableExpenses ?? 9246789.75;
  }, [c1Data.reimbursableTotal, c1Data.summary?.reimbursableExpenses]);

  // -------------------------------------------------------------
  // COMPUTED SUMMARY OF CONTRACT PRICE (TABLE 1.1)
  // -------------------------------------------------------------
  const summaryPrice = useMemo(() => {
    const fees = staffSubtotals.grandTotalFeesEtb;
    const reimb = reimbursableTotal;
    const contingencyPct = Number(c1Data.contingencyPct ?? 15);
    const vatPct = Number(c1Data.vatPct ?? 15);

    // C. Contingency (15% of A+B)
    const contingency = (fees + reimb) * (contingencyPct / 100);
    
    // Base before VAT (A + B + C)
    const baseBeforeVat = fees + reimb + contingency;

    // D. VAT (15% of A+B+C)
    const vat = baseBeforeVat * (vatPct / 100);

    // E. Sub-total
    const grandTotal = baseBeforeVat + vat;

    return {
      fees,
      reimb,
      contingencyPct,
      contingency,
      vatPct,
      vat,
      grandTotal
    };
  }, [staffSubtotals.grandTotalFeesEtb, reimbursableTotal, c1Data.contingencyPct, c1Data.vatPct]);

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

    const categoryName = addMode === 'subtable' ? (newSubTableTitle.trim() || 'Custom Sub-Table') : newStaffCategory;
    const totalMm = Number(newStaffMmConstr || 0) + Number(newStaffMmDlp || 0);
    const totalEtb = totalMm * Number(newStaffRateEtb || 0);

    const newRow: ContractStaffRateCondition1 = {
      id: `c1_staff_${Date.now()}`,
      no: newStaffNo.trim() || (addMode === 'subtable' ? '5.1' : '1.X'),
      position: newStaffPosition.trim(),
      name: newStaffName.trim() || 'To be nominated',
      category: categoryName,
      mmConstr: Number(newStaffMmConstr) || 0,
      mmDlp: Number(newStaffMmDlp) || 0,
      totalMm,
      rateEtb: Number(newStaffRateEtb) || 0,
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

  const fmt = (val: number | undefined, decimals = 2): string => {
    if (val === undefined || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner: Strictly ETB Only */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-xs font-bold rounded-lg uppercase tracking-wider">
                  Condition 1 (ETB Only)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Local Currency Only: ETB Remuneration (USD Disabled)
                </span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fees (Time-Based)</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {fmt(summaryPrice.fees)} <span className="text-xs text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{staffSubtotals.grandTotalMm} Total Man-Months</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reimbursable Expenses</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {fmt(summaryPrice.reimb)} <span className="text-xs text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Section 2 Item B Summary</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contingency & VAT (15%)</div>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {fmt(summaryPrice.contingency + summaryPrice.vat)} <span className="text-xs text-slate-400">ETB</span>
          </div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">15% Contingency + 15% VAT</div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total Contract Price (E)</div>
          <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {fmt(summaryPrice.grandTotal)} <span className="text-xs text-emerald-600/70">ETB</span>
          </div>
          <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-semibold mt-0.5">100% Local Currency ETB</div>
        </div>
      </div>

      {/* TABLE 1.1 — SUMMARY OF CONTRACT PRICE (ETB) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Table 1.1 — Summary of Contract Price (ETB)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">FIDIC / ERA Standard Summary</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5 text-left font-bold w-16">Item</th>
                <th className="p-3.5 text-left font-bold">Description</th>
                <th className="p-3.5 text-right font-bold w-64">Amount (ETB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">A.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white">Fees (time-based)</td>
                <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                  {fmt(summaryPrice.fees)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">B.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white">Reimbursable expenses</td>
                <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                  <input
                    type="number"
                    step="any"
                    disabled={isReadonly}
                    value={c1Data.reimbursableTotal ?? c1Data.summary?.reimbursableExpenses ?? 9246789.75}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setC1Data(prev => ({
                        ...prev,
                        reimbursableTotal: val,
                        summary: {
                          ...(prev.summary || {
                            fees: summaryPrice.fees,
                            reimbursableExpenses: 9246789.75,
                            contingency: 0,
                            vat: 0,
                            subTotal: 0
                          }),
                          reimbursableExpenses: val
                        }
                      }));
                    }}
                    className="w-48 text-right font-mono font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 px-1 py-0.5 outline-none text-slate-900 dark:text-white"
                  />
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">C.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Contingency (</span>
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
                  {fmt(summaryPrice.contingency)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">D.</td>
                <td className="p-3.5 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>VAT (</span>
                  <input
                    type="number"
                    step="any"
                    disabled={isReadonly}
                    value={c1Data.vatPct ?? 15}
                    onChange={(e) => setC1Data(prev => ({ ...prev, vatPct: parseFloat(e.target.value) || 0 }))}
                    className="w-12 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 outline-none"
                  />
                  <span>% of A+B+C)</span>
                </td>
                <td className="p-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {fmt(summaryPrice.vat)}
                </td>
              </tr>

              <tr className="bg-emerald-50/75 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold border-t-2 border-emerald-300 dark:border-emerald-700">
                <td className="p-3.5 text-base">E.</td>
                <td className="p-3.5 font-sans text-base">Sub-total (Total Contract Price)</td>
                <td className="p-3.5 text-right text-base text-emerald-700 dark:text-emerald-300 font-black">
                  {fmt(summaryPrice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 1.3 — STAFF REMUNERATION SCHEDULE (ETB) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Table 1.3 — Staff Remuneration Schedule (ETB)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg">
              Linked to Monthly Invoices
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
                <th className="p-3 text-right font-bold w-24">MM (Constr.)</th>
                <th className="p-3 text-right font-bold w-20">MM (DLP)</th>
                <th className="p-3 text-right font-bold w-24">Total MM</th>
                <th className="p-3 text-right font-bold w-28">Rate (ETB)</th>
                <th className="p-3 text-right font-bold w-32">Total (ETB)</th>
                {!isReadonly && <th className="p-3 text-center font-bold w-14">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {/* SUB-TOTAL 1: KEY PROFESSIONAL */}
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                <td className="p-3 text-left" colSpan={!isReadonly ? 9 : 8}>
                  1. Key Professional Staff (Supervision & Management)
                </td>
              </tr>
              {staffSubtotals.keyStaff.map((row) => (
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
                      value={row.mmDlp}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalMm, 1)}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      disabled={isReadonly}
                      value={row.rateEtb}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalEtb)}
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
              ))}
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                <td className="p-3" colSpan={3}>Sub-total 1 (Key Professional)</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.keyConstrMm, 1)}</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.keyDlpMm, 1)}</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.keyTotalMm, 1)}</td>
                <td className="p-3 text-right">—</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.keyTotalEtb)}</td>
                {!isReadonly && <td></td>}
              </tr>

              {/* SUB-TOTAL 2: INTERMEDIATE STAFF */}
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                <td className="p-3 text-left" colSpan={!isReadonly ? 9 : 8}>
                  2. Intermediate Technical Staff
                </td>
              </tr>
              {staffSubtotals.intermediateStaff.map((row) => (
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
                      value={row.mmDlp}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalMm, 1)}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      disabled={isReadonly}
                      value={row.rateEtb}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalEtb)}
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
              ))}
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                <td className="p-3" colSpan={3}>Sub-total 2 (Intermediate staff)</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.intConstrMm, 1)}</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.intDlpMm, 1)}</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.intTotalMm, 1)}</td>
                <td className="p-3 text-right">—</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.intTotalEtb)}</td>
                {!isReadonly && <td></td>}
              </tr>

              {/* SUB-TOTAL 3: SUPPORT STAFF */}
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                <td className="p-3 text-left" colSpan={!isReadonly ? 9 : 8}>
                  3. Field & Laboratory Support Personnel
                </td>
              </tr>
              {staffSubtotals.supportStaff.map((row) => (
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
                      value={row.mmDlp}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalMm, 1)}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      disabled={isReadonly}
                      value={row.rateEtb}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalEtb)}
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
              ))}
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                <td className="p-3" colSpan={3}>Sub-total 3 (Support)</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.supConstrMm, 1)}</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.supDlpMm, 1)}</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.supTotalMm, 1)}</td>
                <td className="p-3 text-right">—</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.supTotalEtb)}</td>
                {!isReadonly && <td></td>}
              </tr>

              {/* SUB-TOTAL 4: HEAD OFFICE */}
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white">
                <td className="p-3 text-left" colSpan={!isReadonly ? 9 : 8}>
                  4. Head Office Technical & Administrative Support
                </td>
              </tr>
              {staffSubtotals.hoStaff.map((row) => (
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
                      value={row.mmDlp}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'mmDlp', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalMm, 1)}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      disabled={isReadonly}
                      value={row.rateEtb}
                      onChange={(e) => handleUpdateStaffRow(row.id!, 'rateEtb', parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 outline-none font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {fmt(row.totalEtb)}
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
              ))}
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-700">
                <td className="p-3" colSpan={3}>Sub-total 4 (Head Office)</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.hoConstrMm, 1)}</td>
                <td className="p-3 text-right">{fmt(staffSubtotals.hoDlpMm, 1)}</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.hoTotalMm, 1)}</td>
                <td className="p-3 text-right">—</td>
                <td className="p-3 text-right text-emerald-700 dark:text-emerald-300">{fmt(staffSubtotals.hoTotalEtb)}</td>
                {!isReadonly && <td></td>}
              </tr>

              {/* TOTAL REMUNERATION FEES */}
              <tr className="bg-emerald-100 dark:bg-emerald-900/60 font-black text-slate-900 dark:text-white text-sm border-t-2 border-emerald-400 dark:border-emerald-600">
                <td className="p-3.5" colSpan={3}>TOTAL FEES (Table 1.3 Staff Remuneration)</td>
                <td className="p-3.5 text-right">{fmt(staffSubtotals.totalConstrMm, 1)}</td>
                <td className="p-3.5 text-right">{fmt(staffSubtotals.totalDlpMm, 1)}</td>
                <td className="p-3.5 text-right text-emerald-800 dark:text-emerald-200">{fmt(staffSubtotals.grandTotalMm, 1)}</td>
                <td className="p-3.5 text-right">—</td>
                <td className="p-3.5 text-right text-emerald-800 dark:text-emerald-200">{fmt(staffSubtotals.grandTotalFeesEtb)}</td>
                {!isReadonly && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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

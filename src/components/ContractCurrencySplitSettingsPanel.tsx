import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  DollarSign, 
  Coins, 
  CheckCircle2, 
  Sparkles, 
  Percent, 
  Layers, 
  Calculator, 
  Users, 
  Receipt, 
  RotateCcw,
  Info,
  HelpCircle
} from 'lucide-react';
import { 
  ContractStaffRateCondition1, 
  ContractReimbursableCondition1 
} from '../types';

interface Props {
  staffFees: ContractStaffRateCondition1[];
  reimbursableList: ContractReimbursableCondition1[];
  contingencyPct: number;
  vatPct: number;
  initialExchangeRate?: number;
  isReadonly?: boolean;
  onApplySplits: (
    updatedStaff: ContractStaffRateCondition1[],
    updatedReimbursables: ContractReimbursableCondition1[],
    exchangeRate: number
  ) => void;
  onClose?: () => void;
}

export const ContractCurrencySplitSettingsPanel: React.FC<Props> = ({
  staffFees,
  reimbursableList,
  contingencyPct,
  vatPct,
  initialExchangeRate = 125.0,
  isReadonly = false,
  onApplySplits,
  onClose
}) => {
  const [exchangeRate, setExchangeRate] = useState<number>(initialExchangeRate > 0 ? initialExchangeRate : 125.0);
  const [advancedSplitMode, setAdvancedSplitMode] = useState<boolean>(false);
  const [activeSubSection, setActiveSubSection] = useState<'all' | 'staff' | 'reimbursables'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local editable draft state for staff
  const [localStaff, setLocalStaff] = useState<ContractStaffRateCondition1[]>(() => {
    return staffFees.map(s => {
      const baseRate = s.baseRateEtb || s.rateEtb || 0;
      const splitType = s.splitType || (s.rateUsd && s.rateUsd > 0 ? 'percentage' : 'percentage');
      let usdPct = s.usdPercentage;
      let etbPct = s.etbPercentage;

      if (usdPct === undefined) {
        if (s.rateUsd && s.rateUsd > 0 && baseRate > 0) {
          const usdInEtb = s.rateUsd * initialExchangeRate;
          usdPct = Math.min(100, Math.max(0, Math.round((usdInEtb / (s.rateEtb + usdInEtb)) * 100)));
          etbPct = 100 - usdPct;
        } else {
          usdPct = 0;
          etbPct = 100;
        }
      } else {
        etbPct = 100 - (usdPct || 0);
      }

      return {
        ...s,
        baseRateEtb: baseRate,
        splitType,
        usdPercentage: usdPct,
        etbPercentage: etbPct,
        rateEtb: s.rateEtb || baseRate,
        rateUsd: s.rateUsd || 0,
        totalEtb: s.totalEtb || (s.totalMm * (s.rateEtb || baseRate)),
        totalUsd: s.totalUsd || (s.totalMm * (s.rateUsd || 0))
      };
    });
  });

  // Local editable draft state for reimbursables
  const [localReimb, setLocalReimb] = useState<ContractReimbursableCondition1[]>(() => {
    return reimbursableList.map(r => {
      const baseAmount = r.baseAmountEtb || r.amountEtb || 0;
      const splitType = r.splitType || (r.amountUsd && r.amountUsd > 0 ? 'percentage' : 'percentage');
      let usdPct = r.usdPercentage;
      let etbPct = r.etbPercentage;

      if (usdPct === undefined) {
        if (r.amountUsd && r.amountUsd > 0 && baseAmount > 0) {
          const usdInEtb = r.amountUsd * initialExchangeRate;
          usdPct = Math.min(100, Math.max(0, Math.round((usdInEtb / (r.amountEtb + usdInEtb)) * 100)));
          etbPct = 100 - usdPct;
        } else {
          usdPct = 0;
          etbPct = 100;
        }
      } else {
        etbPct = 100 - (usdPct || 0);
      }

      return {
        ...r,
        baseAmountEtb: baseAmount,
        splitType,
        usdPercentage: usdPct,
        etbPercentage: etbPct,
        amountEtb: r.amountEtb || baseAmount,
        amountUsd: r.amountUsd || 0
      };
    });
  });

  // Handlers for Staff Split Adjustments
  const handleStaffSplitTypeChange = (id: string | undefined, newType: 'percentage' | 'fixed') => {
    if (!id) return;
    setLocalStaff(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        splitType: newType
      };
    }));
  };

  const handleStaffPercentageChange = (id: string | undefined, usdPercentage: number) => {
    if (!id) return;
    const clampedUsdPct = Math.max(0, Math.min(100, usdPercentage));
    const clampedEtbPct = 100 - clampedUsdPct;

    setLocalStaff(prev => prev.map(s => {
      if (s.id !== id) return s;
      const base = s.baseRateEtb || (s.rateEtb + ((s.rateUsd || 0) * exchangeRate)) || 15000;
      
      const newRateEtb = Number(((base * clampedEtbPct) / 100).toFixed(2));
      const newRateUsd = exchangeRate > 0 
        ? Number(((base * clampedUsdPct) / (100 * exchangeRate)).toFixed(2)) 
        : 0;

      const totalMm = Number(s.totalMm) || (Number(s.mmConstr) || 0) + (Number(s.mmDlp) || 0);
      const newTotalEtb = Number((newRateEtb * totalMm).toFixed(2));
      const newTotalUsd = Number((newRateUsd * totalMm).toFixed(2));

      return {
        ...s,
        baseRateEtb: base,
        splitType: 'percentage',
        usdPercentage: clampedUsdPct,
        etbPercentage: clampedEtbPct,
        rateEtb: newRateEtb,
        rateUsd: newRateUsd,
        totalEtb: newTotalEtb,
        totalUsd: newTotalUsd
      };
    }));
  };

  const handleStaffFixedRateChange = (id: string | undefined, currency: 'ETB' | 'USD', val: number) => {
    if (!id) return;
    setLocalStaff(prev => prev.map(s => {
      if (s.id !== id) return s;
      const totalMm = Number(s.totalMm) || (Number(s.mmConstr) || 0) + (Number(s.mmDlp) || 0);

      const newRateEtb = currency === 'ETB' ? Math.max(0, val) : (s.rateEtb || 0);
      const newRateUsd = currency === 'USD' ? Math.max(0, val) : (s.rateUsd || 0);

      const newTotalEtb = Number((newRateEtb * totalMm).toFixed(2));
      const newTotalUsd = Number((newRateUsd * totalMm).toFixed(2));

      const totalValueInEtb = newRateEtb + (newRateUsd * exchangeRate);
      const calculatedUsdPct = totalValueInEtb > 0 
        ? Math.round(((newRateUsd * exchangeRate) / totalValueInEtb) * 100) 
        : 0;

      return {
        ...s,
        splitType: 'fixed',
        rateEtb: newRateEtb,
        rateUsd: newRateUsd,
        totalEtb: newTotalEtb,
        totalUsd: newTotalUsd,
        usdPercentage: calculatedUsdPct,
        etbPercentage: 100 - calculatedUsdPct
      };
    }));
  };

  // Handlers for Reimbursable Split Adjustments
  const handleReimbSplitTypeChange = (id: string, newType: 'percentage' | 'fixed') => {
    setLocalReimb(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        splitType: newType
      };
    }));
  };

  const handleReimbPercentageChange = (id: string, usdPercentage: number) => {
    const clampedUsdPct = Math.max(0, Math.min(100, usdPercentage));
    const clampedEtbPct = 100 - clampedUsdPct;

    setLocalReimb(prev => prev.map(r => {
      if (r.id !== id) return r;
      const base = r.baseAmountEtb || (r.amountEtb + ((r.amountUsd || 0) * exchangeRate)) || 100000;

      const newAmountEtb = Number(((base * clampedEtbPct) / 100).toFixed(2));
      const newAmountUsd = exchangeRate > 0 
        ? Number(((base * clampedUsdPct) / (100 * exchangeRate)).toFixed(2)) 
        : 0;

      return {
        ...r,
        baseAmountEtb: base,
        splitType: 'percentage',
        usdPercentage: clampedUsdPct,
        etbPercentage: clampedEtbPct,
        amountEtb: newAmountEtb,
        amountUsd: newAmountUsd
      };
    }));
  };

  const handleReimbFixedAmountChange = (id: string, currency: 'ETB' | 'USD', val: number) => {
    setLocalReimb(prev => prev.map(r => {
      if (r.id !== id) return r;
      const newAmountEtb = currency === 'ETB' ? Math.max(0, val) : (r.amountEtb || 0);
      const newAmountUsd = currency === 'USD' ? Math.max(0, val) : (r.amountUsd || 0);

      const totalValInEtb = newAmountEtb + (newAmountUsd * exchangeRate);
      const calculatedUsdPct = totalValInEtb > 0
        ? Math.round(((newAmountUsd * exchangeRate) / totalValInEtb) * 100)
        : 0;

      return {
        ...r,
        splitType: 'fixed',
        amountEtb: newAmountEtb,
        amountUsd: newAmountUsd,
        usdPercentage: calculatedUsdPct,
        etbPercentage: 100 - calculatedUsdPct
      };
    }));
  };

  // Bulk Preset Actions
  const applyPresetToAll = (usdPct: number, target: 'all' | 'key' | 'reimb') => {
    if (target === 'all' || target === 'key') {
      setLocalStaff(prev => prev.map(s => {
        if (target === 'key' && s.category !== 'Key Professional' && !s.no?.startsWith('1.')) {
          return s;
        }
        const base = s.baseRateEtb || (s.rateEtb + ((s.rateUsd || 0) * exchangeRate)) || 15000;
        const clampedUsd = Math.max(0, Math.min(100, usdPct));
        const clampedEtb = 100 - clampedUsd;
        const newRateEtb = Number(((base * clampedEtb) / 100).toFixed(2));
        const newRateUsd = exchangeRate > 0 ? Number(((base * clampedUsd) / (100 * exchangeRate)).toFixed(2)) : 0;
        const totalMm = Number(s.totalMm) || (Number(s.mmConstr) || 0) + (Number(s.mmDlp) || 0);

        return {
          ...s,
          baseRateEtb: base,
          splitType: 'percentage',
          usdPercentage: clampedUsd,
          etbPercentage: clampedEtb,
          rateEtb: newRateEtb,
          rateUsd: newRateUsd,
          totalEtb: Number((newRateEtb * totalMm).toFixed(2)),
          totalUsd: Number((newRateUsd * totalMm).toFixed(2))
        };
      }));
    }

    if (target === 'all' || target === 'reimb') {
      setLocalReimb(prev => prev.map(r => {
        const base = r.baseAmountEtb || (r.amountEtb + ((r.amountUsd || 0) * exchangeRate)) || 100000;
        const clampedUsd = Math.max(0, Math.min(100, usdPct));
        const clampedEtb = 100 - clampedUsd;
        const newAmountEtb = Number(((base * clampedEtb) / 100).toFixed(2));
        const newAmountUsd = exchangeRate > 0 ? Number(((base * clampedUsd) / (100 * exchangeRate)).toFixed(2)) : 0;

        return {
          ...r,
          baseAmountEtb: base,
          splitType: 'percentage',
          usdPercentage: clampedUsd,
          etbPercentage: clampedEtb,
          amountEtb: newAmountEtb,
          amountUsd: newAmountUsd
        };
      }));
    }
  };

  // Recalculate across the board when exchange rate changes
  const handleExchangeRateChange = (newRate: number) => {
    const validRate = Math.max(0.01, newRate);
    setExchangeRate(validRate);

    // Recompute percentage-based items with the new rate
    setLocalStaff(prev => prev.map(s => {
      if (s.splitType === 'percentage' && (s.usdPercentage || 0) > 0) {
        const base = s.baseRateEtb || (s.rateEtb + ((s.rateUsd || 0) * validRate));
        const newRateUsd = Number(((base * (s.usdPercentage || 0)) / (100 * validRate)).toFixed(2));
        const totalMm = Number(s.totalMm) || 0;
        return {
          ...s,
          rateUsd: newRateUsd,
          totalUsd: Number((newRateUsd * totalMm).toFixed(2))
        };
      }
      return s;
    }));

    setLocalReimb(prev => prev.map(r => {
      if (r.splitType === 'percentage' && (r.usdPercentage || 0) > 0) {
        const base = r.baseAmountEtb || (r.amountEtb + ((r.amountUsd || 0) * validRate));
        const newAmountUsd = Number(((base * (r.usdPercentage || 0)) / (100 * validRate)).toFixed(2));
        return {
          ...r,
          amountUsd: newAmountUsd
        };
      }
      return r;
    }));
  };

  // Aggregated Summary of the split configuration
  const splitSummary = useMemo(() => {
    const totalStaffFeesEtb = localStaff.reduce((sum, s) => sum + (Number(s.totalEtb) || 0), 0);
    const totalStaffFeesUsd = localStaff.reduce((sum, s) => sum + (Number(s.totalUsd) || 0), 0);

    const totalReimbEtb = localReimb.reduce((sum, r) => sum + (Number(r.amountEtb) || 0), 0);
    const totalReimbUsd = localReimb.reduce((sum, r) => sum + (Number(r.amountUsd) || 0), 0);

    const directSubtotalEtb = totalStaffFeesEtb + totalReimbEtb;
    const directSubtotalUsd = totalStaffFeesUsd + totalReimbUsd;

    const contingencyEtb = directSubtotalEtb * (contingencyPct / 100);
    const contingencyUsd = directSubtotalUsd * (contingencyPct / 100);

    const baseEtb = directSubtotalEtb + contingencyEtb;
    const baseUsd = directSubtotalUsd + contingencyUsd;

    const vatEtb = baseEtb * (vatPct / 100);
    const vatUsd = baseUsd * (vatPct / 100);

    const grandTotalEtb = baseEtb + vatEtb;
    const grandTotalUsd = baseUsd + vatUsd;

    const overallEquivalentInEtb = grandTotalEtb + (grandTotalUsd * exchangeRate);
    const overallUsdSharePct = overallEquivalentInEtb > 0 
      ? ((grandTotalUsd * exchangeRate) / overallEquivalentInEtb) * 100 
      : 0;

    return {
      totalStaffFeesEtb,
      totalStaffFeesUsd,
      totalReimbEtb,
      totalReimbUsd,
      directSubtotalEtb,
      directSubtotalUsd,
      contingencyEtb,
      contingencyUsd,
      vatEtb,
      vatUsd,
      grandTotalEtb,
      grandTotalUsd,
      overallEquivalentInEtb,
      overallUsdSharePct
    };
  }, [localStaff, localReimb, contingencyPct, vatPct, exchangeRate]);

  // Filtering Staff
  const filteredStaff = useMemo(() => {
    return localStaff.filter(s => {
      const matchesSearch = !searchQuery || 
        s.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.no.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || 
        (s.category && s.category.toLowerCase().includes(filterCategory.toLowerCase()));

      return matchesSearch && matchesCategory;
    });
  }, [localStaff, searchQuery, filterCategory]);

  const fmt = (num: number | undefined, decimals = 2) => {
    if (num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const handleApply = () => {
    onApplySplits(localStaff, localReimb, exchangeRate);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-purple-300 dark:border-purple-800 rounded-3xl shadow-lg overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl">
            <Sliders className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase tracking-wider">
                Financial Split Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Mixed Currency (ETB & USD)
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight mt-1">
              USD / ETB Remuneration & Expense Split Settings
            </h3>
            <p className="text-xs text-purple-200/80 mt-0.5 max-w-2xl">
              Configure precise percentage splits or individual fixed remuneration amounts between USD and ETB for supervisory staff positions and reimbursable expense items.
            </p>
          </div>
        </div>

        {/* Operational Exchange Rate Input & Quick Save */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">Operational Rate:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-sm bg-black/30 px-2 py-1 rounded-lg border border-purple-300/30">
              <span className="text-xs text-purple-300">1 USD =</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={exchangeRate}
                onChange={(e) => handleExchangeRateChange(parseFloat(e.target.value) || 125.0)}
                className="w-16 text-right bg-transparent text-emerald-300 focus:outline-none focus:ring-1 focus:ring-purple-400 rounded px-1"
                title="Operational exchange rate used for percentage split conversion"
              />
              <span className="text-xs text-purple-300">ETB</span>
            </div>
          </div>

          {!isReadonly && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Splits to Contract Schedule</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              Close Panel
            </button>
          )}
        </div>
      </div>

      {/* Live Financial Split Impact Summary Strip */}
      <div className="px-6 py-4 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800/60">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Staff Remuneration</span>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {fmt(splitSummary.totalStaffFeesEtb)} ETB
            </div>
            <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-300 mt-0.5">
              ${fmt(splitSummary.totalStaffFeesUsd)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Reimbursables (Table 4)</span>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {fmt(splitSummary.totalReimbEtb)} ETB
            </div>
            <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-300 mt-0.5">
              ${fmt(splitSummary.totalReimbUsd)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Direct Subtotal (A+B)</span>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">
              {fmt(splitSummary.directSubtotalEtb)} ETB
            </div>
            <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-300 mt-0.5">
              ${fmt(splitSummary.directSubtotalUsd)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Contingency ({contingencyPct}%)</span>
            <div className="text-xs font-mono font-semibold text-amber-600 mt-1">
              +{fmt(splitSummary.contingencyEtb)} ETB
            </div>
            <div className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-300 mt-0.5">
              +${fmt(splitSummary.contingencyUsd)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/40 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">VAT ({vatPct}%)</span>
            <div className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
              +{fmt(splitSummary.vatEtb)} ETB
            </div>
            <div className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-300 mt-0.5">
              +${fmt(splitSummary.vatUsd)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-xs">
            <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider block">Total Contract Price</span>
            <div className="text-xs font-mono font-black mt-1">
              {fmt(splitSummary.grandTotalEtb)} ETB
            </div>
            <div className="text-xs font-mono font-black text-purple-200 mt-0.5">
              ${fmt(splitSummary.grandTotalUsd)} USD
            </div>
            <div className="text-[9px] font-semibold text-purple-200/80 mt-1 border-t border-purple-400/40 pt-0.5">
              Foreign Share: {splitSummary.overallUsdSharePct.toFixed(1)}% USD
            </div>
          </div>
        </div>
      </div>

      {/* Quick Global Presets & Sub-Navigation */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Quick Presets:
          </span>
          <button
            type="button"
            disabled={isReadonly}
            onClick={() => applyPresetToAll(50, 'all')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition cursor-pointer"
          >
            50% USD / 50% ETB All
          </button>
          <button
            type="button"
            disabled={isReadonly}
            onClick={() => applyPresetToAll(30, 'all')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition cursor-pointer"
          >
            30% USD / 70% ETB All
          </button>
          <button
            type="button"
            disabled={isReadonly}
            onClick={() => applyPresetToAll(40, 'key')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
          >
            40% USD Key Personnel Only
          </button>
          <button
            type="button"
            disabled={isReadonly}
            onClick={() => applyPresetToAll(0, 'all')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
          >
            100% ETB (Reset USD)
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubSection('all')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeSubSection === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            All Items ({localStaff.length + localReimb.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubSection('staff')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeSubSection === 'staff'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Staff Positions ({localStaff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubSection('reimbursables')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeSubSection === 'reimbursables'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Reimbursables ({localReimb.length})
          </button>
        </div>
      </div>

      {/* DEDICATED EXCHANGE RATE MANAGEMENT TOOL & ADVANCED SPLIT-EDITING TOGGLE */}
      <div className="px-6 py-4 bg-purple-100/50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <span>Exchange Rate Management & Cascade Tool</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-mono">
                1 USD = {exchangeRate} ETB
              </span>
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Update exchange rate and trigger cascade recalculation across all dashboard tables and USD payments.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Advanced Split-Editing Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 shadow-2xs">
            <input
              type="checkbox"
              checked={advancedSplitMode}
              onChange={(e) => setAdvancedSplitMode(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-xs font-black text-purple-900 dark:text-purple-200">
              Advanced Split-Editing Mode (Simultaneous ETB & USD Inputs)
            </span>
          </label>

          {!isReadonly && (
            <button
              type="button"
              onClick={() => {
                handleExchangeRateChange(exchangeRate);
                handleApply();
              }}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="Recalculate all USD splits and cascade updates across all dashboard contract & invoice tables"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>⚡ Trigger Cascade Update of All USD Payments</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* SECTION 1: STAFF REMUNERATION SPLIT */}
        {(activeSubSection === 'all' || activeSubSection === 'staff') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Staff Remuneration Split (Table 2 Construction & Table 3 DLP)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Define individual percentage splits or assign fixed monthly rates in ETB and USD.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search position or staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="all">All Categories</option>
                  <option value="Key Professional">Key Professional</option>
                  <option value="Intermediate">Intermediate Staff</option>
                  <option value="Support">Support Staff</option>
                  <option value="Head Office">Head Office</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3 w-12 text-center">No.</th>
                    <th className="py-3 px-4 min-w-[200px]">Position & Nominated Staff</th>
                    <th className="py-3 px-3 text-center w-20">Alloc. MM</th>
                    <th className="py-3 px-3 min-w-[130px] text-center">Split Mode</th>
                    <th className="py-3 px-4 min-w-[240px]">Currency Split Assignment</th>
                    <th className="py-3 px-4 text-right min-w-[140px] text-emerald-700 dark:text-emerald-400">Rate & Total (ETB)</th>
                    <th className="py-3 px-4 text-right min-w-[140px] text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/20">Rate & Total (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No staff positions match the search or category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => {
                      const totalMm = Number(staff.totalMm) || (Number(staff.mmConstr) || 0) + (Number(staff.mmDlp) || 0);
                      const baseRate = staff.baseRateEtb || (staff.rateEtb + ((staff.rateUsd || 0) * exchangeRate)) || 15000;
                      const isPct = staff.splitType !== 'fixed';

                      return (
                        <tr key={staff.id || staff.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                            {staff.no}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {staff.position}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{staff.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                {staff.category || 'General Staff'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <div>{fmt(totalMm, 1)} MM</div>
                            <span className="text-[9px] text-slate-400 font-normal">
                              ({staff.mmConstr}c + {staff.mmDlp}d)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                              <button
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleStaffSplitTypeChange(staff.id, 'percentage')}
                                className={`px-2 py-0.5 rounded-md transition ${
                                  isPct 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                              >
                                % Pct
                              </button>
                              <button
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleStaffSplitTypeChange(staff.id, 'fixed')}
                                className={`px-2 py-0.5 rounded-md transition ${
                                  !isPct 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                              >
                                Fixed
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {advancedSplitMode ? (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-purple-50/70 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-300 dark:border-purple-700">
                                <div>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">Rate (ETB):</span>
                                  <input
                                    type="number"
                                    step="100"
                                    disabled={isReadonly}
                                    value={staff.rateEtb || 0}
                                    onChange={(e) => handleStaffFixedRateChange(staff.id, 'ETB', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-600 rounded-lg font-bold text-emerald-700 dark:text-emerald-300 text-right text-xs"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">Rate (USD):</span>
                                  <input
                                    type="number"
                                    step="10"
                                    disabled={isReadonly}
                                    value={staff.rateUsd || 0}
                                    onChange={(e) => handleStaffFixedRateChange(staff.id, 'USD', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-purple-400 dark:border-purple-600 rounded-lg font-bold text-purple-700 dark:text-purple-300 text-right text-xs"
                                  />
                                </div>
                              </div>
                            ) : isPct ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    ETB: {staff.etbPercentage ?? (100 - (staff.usdPercentage || 0))}%
                                  </span>
                                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                                    USD: {staff.usdPercentage || 0}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    disabled={isReadonly}
                                    value={staff.usdPercentage || 0}
                                    onChange={(e) => handleStaffPercentageChange(staff.id, parseInt(e.target.value) || 0)}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                  />
                                  <div className="flex items-center gap-0.5 font-mono text-xs">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      disabled={isReadonly}
                                      value={staff.usdPercentage || 0}
                                      onChange={(e) => handleStaffPercentageChange(staff.id, parseInt(e.target.value) || 0)}
                                      className="w-12 text-center bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded px-1 py-0.5 font-bold text-purple-600"
                                    />
                                    <span className="text-[10px] text-purple-400">%</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Baseline: {fmt(baseRate)} ETB/mo
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-[10px] text-emerald-600 font-bold block">Rate (ETB):</span>
                                  <input
                                    type="number"
                                    step="100"
                                    disabled={isReadonly}
                                    value={staff.rateEtb || 0}
                                    onChange={(e) => handleStaffFixedRateChange(staff.id, 'ETB', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-emerald-700 dark:text-emerald-400 text-right"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-purple-600 font-bold block">Rate (USD):</span>
                                  <input
                                    type="number"
                                    step="10"
                                    disabled={isReadonly}
                                    value={staff.rateUsd || 0}
                                    onChange={(e) => handleStaffFixedRateChange(staff.id, 'USD', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg font-bold text-purple-700 dark:text-purple-300 text-right"
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {fmt(staff.rateEtb)} ETB/mo
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              Total: {fmt(staff.totalEtb)} ETB
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono bg-purple-50/20 dark:bg-purple-950/10">
                            <div className="font-bold text-purple-700 dark:text-purple-300">
                              ${fmt(staff.rateUsd)}/mo
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                              Total: ${fmt(staff.totalUsd)}
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

        {/* SECTION 2: REIMBURSABLE EXPENSES SPLIT */}
        {(activeSubSection === 'all' || activeSubSection === 'reimbursables') && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Reimbursable Operating Expenses Split (Table 4)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Define percentage or fixed splits for direct operational and logistical costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3 w-12 text-center">No.</th>
                    <th className="py-3 px-4 min-w-[220px]">Reimbursable Sub-Item & Basis</th>
                    <th className="py-3 px-3 min-w-[130px] text-center">Split Mode</th>
                    <th className="py-3 px-4 min-w-[240px]">Currency Split Assignment</th>
                    <th className="py-3 px-4 text-right min-w-[140px] text-emerald-700 dark:text-emerald-400">Amount (ETB)</th>
                    <th className="py-3 px-4 text-right min-w-[140px] text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/20">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {localReimb.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No reimbursable items available in schedule.
                      </td>
                    </tr>
                  ) : (
                    localReimb.map((reimb) => {
                      const isPct = reimb.splitType !== 'fixed';
                      const baseAmt = reimb.baseAmountEtb || (reimb.amountEtb + ((reimb.amountUsd || 0) * exchangeRate)) || 100000;

                      return (
                        <tr key={reimb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                            {reimb.no}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {reimb.item}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              {reimb.basis || 'Actual site expenditure vouchers'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                              <button
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleReimbSplitTypeChange(reimb.id, 'percentage')}
                                className={`px-2 py-0.5 rounded-md transition ${
                                  isPct 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                              >
                                % Pct
                              </button>
                              <button
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleReimbSplitTypeChange(reimb.id, 'fixed')}
                                className={`px-2 py-0.5 rounded-md transition ${
                                  !isPct 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                }`}
                              >
                                Fixed
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {advancedSplitMode ? (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-purple-50/70 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-300 dark:border-purple-700">
                                <div>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">Amount (ETB):</span>
                                  <input
                                    type="number"
                                    step="1000"
                                    disabled={isReadonly}
                                    value={reimb.amountEtb || 0}
                                    onChange={(e) => handleReimbFixedAmountChange(reimb.id, 'ETB', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-600 rounded-lg font-bold text-emerald-700 dark:text-emerald-300 text-right text-xs"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">Amount (USD):</span>
                                  <input
                                    type="number"
                                    step="100"
                                    disabled={isReadonly}
                                    value={reimb.amountUsd || 0}
                                    onChange={(e) => handleReimbFixedAmountChange(reimb.id, 'USD', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-purple-400 dark:border-purple-600 rounded-lg font-bold text-purple-700 dark:text-purple-300 text-right text-xs"
                                  />
                                </div>
                              </div>
                            ) : isPct ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    ETB: {reimb.etbPercentage ?? (100 - (reimb.usdPercentage || 0))}%
                                  </span>
                                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                                    USD: {reimb.usdPercentage || 0}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    disabled={isReadonly}
                                    value={reimb.usdPercentage || 0}
                                    onChange={(e) => handleReimbPercentageChange(reimb.id, parseInt(e.target.value) || 0)}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                  />
                                  <div className="flex items-center gap-0.5 font-mono text-xs">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      disabled={isReadonly}
                                      value={reimb.usdPercentage || 0}
                                      onChange={(e) => handleReimbPercentageChange(reimb.id, parseInt(e.target.value) || 0)}
                                      className="w-12 text-center bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded px-1 py-0.5 font-bold text-purple-600"
                                    />
                                    <span className="text-[10px] text-purple-400">%</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Baseline: {fmt(baseAmt)} ETB
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-[10px] text-emerald-600 font-bold block">Amount (ETB):</span>
                                  <input
                                    type="number"
                                    step="1000"
                                    disabled={isReadonly}
                                    value={reimb.amountEtb || 0}
                                    onChange={(e) => handleReimbFixedAmountChange(reimb.id, 'ETB', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-emerald-700 dark:text-emerald-400 text-right"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-purple-600 font-bold block">Amount (USD):</span>
                                  <input
                                    type="number"
                                    step="100"
                                    disabled={isReadonly}
                                    value={reimb.amountUsd || 0}
                                    onChange={(e) => handleReimbFixedAmountChange(reimb.id, 'USD', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg font-bold text-purple-700 dark:text-purple-300 text-right"
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {fmt(reimb.amountEtb)} ETB
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20 dark:bg-purple-950/10">
                            ${fmt(reimb.amountUsd)} USD
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

        {/* Action Button Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-purple-500 shrink-0" />
            <span>
              Applying splits automatically updates Table 1 Summary, Table 2 Construction, Table 3 DLP, and Table 4 Reimbursables, enabling dual-currency tracking across all consultant tables.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                Back to Schedules
              </button>
            )}

            {!isReadonly && (
              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Splits & Update Contract Schedule</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

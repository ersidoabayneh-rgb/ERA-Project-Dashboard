import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Calculator,
  Coins,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  Percent,
  ShieldAlert,
  Info,
  Scale
} from 'lucide-react';
import { Project, IpcItem, formatAccounting } from '../types';
import { calculateIpcMaturation, calculateProjectIpcSummary } from '../lib/ipcCalculations';

interface AmountInputProps {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

function AmountInput({ value, onChange, readOnly = false, className = '', placeholder = '0.00' }: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState('');

  const numVal = typeof value === 'number' ? value : parseFloat(value as any) || 0;

  React.useEffect(() => {
    if (!isFocused) {
      setLocalVal(numVal === 0 ? '' : numVal.toFixed(2));
    }
  }, [numVal, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    onChange(isNaN(parsed) ? 0 : Number(parsed.toFixed(2)));
  };

  const handleFocus = () => {
    if (readOnly) return;
    setIsFocused(true);
    setLocalVal(numVal === 0 ? '' : numVal.toFixed(2));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
    const parsed = parseFloat(e.target.value);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  if (!isFocused) {
    return (
      <input
        type="text"
        value={numVal === 0 ? '-' : formatAccounting(numVal, '')}
        onFocus={handleFocus}
        readOnly
        placeholder={placeholder}
        className={`${className} cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/50 rounded px-1.5 py-0.5 transition outline-none`}
      />
    );
  }

  return (
    <input
      type="number"
      step="0.01"
      autoFocus
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${className} focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none`}
    />
  );
}

interface MonthlyPaymentIpcSummaryTableProps {
  project: Project;
  onUpdateIpcTracker: (ipcTracker: IpcItem[], exchangeRate?: number, annualInterestRate?: number) => void;
  onProjectUpdate?: (updates: Partial<Project>, desc: string) => void;
}

export default function MonthlyPaymentIpcSummaryTable({
  project,
  onUpdateIpcTracker,
  onProjectUpdate,
}: MonthlyPaymentIpcSummaryTableProps) {
  const ipcTracker = project.ipcTracker || [];
  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;
  const annualInterestRate = project.annualInterestRate !== undefined ? project.annualInterestRate : 16.50;

  const [expandedIpcId, setExpandedIpcId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Unpaid' | 'Partially Paid' | 'Matured Overdue'>('All');
  const [interestRateInput, setInterestRateInput] = useState<number>(annualInterestRate);

  React.useEffect(() => {
    setInterestRateInput(annualInterestRate);
  }, [annualInterestRate]);

  const handleFieldChange = (idx: number, field: keyof IpcItem, value: any) => {
    const updated = ipcTracker.map((item, i) => {
      if (i === idx) {
        const draft = {
          ...item,
          [field]: value,
        };

        if (field === 'status') {
          draft.statusEtb = value;
          draft.statusUsd = value;
        }

        // Keep status synchronized if statusEtb or statusUsd is updated
        if (field === 'statusEtb' || field === 'statusUsd') {
          const etb = field === 'statusEtb' ? value : (draft.statusEtb || draft.status || 'Unpaid');
          const usd = field === 'statusUsd' ? value : (draft.statusUsd || draft.status || 'Unpaid');
          if (etb === usd) {
            draft.status = etb;
          } else {
            draft.status = 'Partially Paid';
          }
        }

        return draft;
      }
      return item;
    });

    onUpdateIpcTracker(updated, exchangeRate, annualInterestRate);
  };

  const handleExchangeRateChange = (newRate: number) => {
    onUpdateIpcTracker(ipcTracker, newRate, annualInterestRate);
  };

  const handleInterestRateChange = (newRate: number) => {
    setInterestRateInput(newRate);
    onUpdateIpcTracker(ipcTracker, exchangeRate, newRate);
  };

  const handleAddIpcRow = () => {
    const nextNo = ipcTracker.length + 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const newItem: IpcItem = {
      id: 'ipc_' + Date.now(),
      paymentNo: `IPC No. ${nextNo}`,
      period: todayStr,
      grossBillEtb: 0,
      grossBillUsd: 0,
      priceAdjustmentEtb: 0,
      advanceRepaymentEtb: 0,
      retentionEtb: 0,
      certifiedEtb: 0,
      certifiedUsd: 0,
      status: 'Unpaid',
      statusEtb: 'Unpaid',
      statusUsd: 'Unpaid',
      submissionDate: todayStr,
      remarks: 'Monthly Payment Bill Summary entry.'
    };
    const updated = [...ipcTracker, newItem];
    onUpdateIpcTracker(updated, exchangeRate, annualInterestRate);
    setExpandedIpcId(newItem.id);
  };

  const handleRemoveIpcRow = (idx: number) => {
    const updated = ipcTracker.filter((_, i) => i !== idx);
    onUpdateIpcTracker(updated, exchangeRate, annualInterestRate);
  };

  const formatMoney = (v: number, currency: string = '') => formatAccounting(v, currency);

  // Aggregated summary statistics
  const totalGrossEtb = ipcTracker.reduce((sum, item) => sum + (item.grossBillEtb || 0), 0);
  const totalPriceAdjustmentEtb = ipcTracker.reduce((sum, item) => sum + (item.priceAdjustmentEtb || 0), 0);
  const totalAdvanceRepaymentEtb = ipcTracker.reduce((sum, item) => sum + (item.advanceRepaymentEtb || 0), 0);
  const totalRetentionEtb = ipcTracker.reduce((sum, item) => sum + (item.retentionEtb || 0), 0);
  const totalCertifiedEtb = ipcTracker.reduce((sum, item) => sum + (item.certifiedEtb || 0), 0);
  const totalCertifiedUsd = ipcTracker.reduce((sum, item) => sum + (item.certifiedUsd || 0), 0);

  // Computed maturation summary
  const summary = calculateProjectIpcSummary(project);

  const filteredIpcs = ipcTracker.filter((item) => {
    const maturation = calculateIpcMaturation(item, annualInterestRate, exchangeRate);
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Matured Overdue') {
      return maturation.isOverdue;
    }
    const etbSt = item.statusEtb || item.status || 'Unpaid';
    const usdSt = item.statusUsd || item.status || 'Unpaid';

    if (filterStatus === 'Paid') {
      return etbSt === 'Paid' && usdSt === 'Paid';
    }
    if (filterStatus === 'Unpaid') {
      return etbSt === 'Unpaid' || usdSt === 'Unpaid';
    }
    if (filterStatus === 'Partially Paid') {
      return etbSt === 'Partially Paid' || usdSt === 'Partially Paid' || (etbSt === 'Paid' && usdSt === 'Unpaid') || (etbSt === 'Unpaid' && usdSt === 'Paid');
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                Monthly Payment Bill Summary, IPC Maturation & Interest Ledger
                <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                  FIDIC Cl. 14.7 & 14.8
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks 56-day statutory payment maturation from submission date & applies financing charges / delay interest for overdue certificates
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Parameters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* USD Rate Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">USD Rate:</span>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => handleExchangeRateChange(parseFloat(e.target.value) || 0)}
              className="w-14 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-right outline-none text-slate-800 dark:text-zinc-100"
            />
            <span className="text-[10px] font-mono font-bold text-slate-400">ETB</span>
          </div>

          {/* Annual Financing Charge Rate Input */}
          <div className="flex items-center gap-1.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 px-2.5 py-1 rounded-xl text-xs" title="FIDIC Sub-Clause 14.8 / Commercial Bank Annual Interest Rate for delayed payments">
            <Percent className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">FIDIC 14.8 Rate:</span>
            <input
              type="number"
              step="0.1"
              value={interestRateInput}
              onChange={(e) => handleInterestRateChange(parseFloat(e.target.value) || 0)}
              className="w-14 font-mono font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded px-1 py-0.5 text-right outline-none text-slate-800 dark:text-zinc-100"
            />
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">% p.a.</span>
          </div>

          <button
            onClick={handleAddIpcRow}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add IPC Entry
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Gross Work */}
        <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>Bill Summary Work</span>
            <Calculator className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-extrabold font-mono text-slate-800 dark:text-zinc-100 mt-1">
            {formatMoney(totalGrossEtb, 'Br.')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {ipcTracker.length} certificates total
          </div>
        </div>

        {/* Total Price Adjustment */}
        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
            <span>Price Escalation</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatMoney(totalPriceAdjustmentEtb, 'Br.')}
          </div>
          <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
            FIDIC Sub-clause 13.8
          </div>
        </div>

        {/* Total Net Certified */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
            <span>Net Certified (Eqv)</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-300 mt-1">
            {formatMoney(summary.totalCertifiedEqvEtb, 'Br.')}
          </div>
          <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">
            Paid: {formatMoney(summary.totalPaidEqvEtb, 'Br.')}
          </div>
        </div>

        {/* Matured Overdue IPCs (>56 Days) */}
        <div className={`rounded-xl p-3 border transition ${
          summary.maturedOverdueIpcCount > 0 
            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60' 
            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={summary.maturedOverdueIpcCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
              Matured Overdue (&gt;56d)
            </span>
            <Clock className={`w-3.5 h-3.5 ${summary.maturedOverdueIpcCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-base font-extrabold font-mono mt-1 ${summary.maturedOverdueIpcCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-zinc-100'}`}>
            {formatMoney(summary.totalMaturedPrincipalEqvEtb, 'Br.')}
          </div>
          <div className={`text-[10px] mt-0.5 font-semibold ${summary.maturedOverdueIpcCount > 0 ? 'text-rose-600/90 dark:text-rose-400/90' : 'text-slate-400'}`}>
            {summary.maturedOverdueIpcCount > 0 ? `⚠️ ${summary.maturedOverdueIpcCount} IPCs breach 56-day window` : 'All certificates within window'}
          </div>
        </div>

        {/* Accrued Delayed Payment Interest */}
        <div className={`rounded-xl p-3 border transition ${
          summary.totalAccruedInterestEqvEtb > 0 
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60' 
            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
            <span className={summary.totalAccruedInterestEqvEtb > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}>
              Accrued Delay Interest
            </span>
            <Scale className={`w-3.5 h-3.5 ${summary.totalAccruedInterestEqvEtb > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-base font-extrabold font-mono mt-1 ${summary.totalAccruedInterestEqvEtb > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-zinc-100'}`}>
            {formatMoney(summary.totalAccruedInterestEqvEtb, 'Br.')}
          </div>
          <div className={`text-[10px] mt-0.5 ${summary.totalAccruedInterestEqvEtb > 0 ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-slate-400'}`}>
            FIDIC 14.8 Financing Charges ({annualInterestRate}% p.a.)
          </div>
        </div>
      </div>

      {/* Filter Tabs & Maturation Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div className="flex items-center gap-1 font-semibold flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 mr-1 text-[11px]">Filter:</span>
          {(['All', 'Paid', 'Unpaid', 'Partially Paid', 'Matured Overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1 ${
                filterStatus === st
                  ? st === 'Matured Overdue'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                  : st === 'Matured Overdue'
                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'Matured Overdue' && <AlertTriangle className="w-3 h-3" />}
              {st}
              {st === 'Matured Overdue' && summary.maturedOverdueIpcCount > 0 && (
                <span className="ml-0.5 px-1 py-0.2 bg-rose-500 text-white text-[9px] rounded-full font-mono">
                  {summary.maturedOverdueIpcCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Showing {filteredIpcs.length} of {ipcTracker.length} certificates
        </span>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-700/60 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 px-3 w-32">IPC / Certificate</th>
              <th className="py-3 px-2 w-28">Submission & Age</th>
              <th className="py-3 px-2 w-36 text-center">56-Day Maturation</th>
              <th className="py-3 px-2 text-right">Bill Summary (ETB)</th>
              <th className="py-3 px-2 text-right text-emerald-700 dark:text-emerald-400">Price Adj. (ETB)</th>
              <th className="py-3 px-2 text-right text-indigo-500 dark:text-indigo-400">Advance Repay.</th>
              <th className="py-3 px-2 text-right text-rose-600 dark:text-rose-400">Retention</th>
              <th className="py-3 px-2 text-center w-32">Net Certified (ETB)</th>
              <th className="py-3 px-2 text-center w-32">Certified (USD)</th>
              <th className="py-3 px-2 text-right font-extrabold text-amber-700 dark:text-amber-400">Delay Interest</th>
              <th className="py-3 px-2 text-right font-extrabold text-slate-800 dark:text-zinc-100">Total Claimable</th>
              <th className="py-3 px-2 text-center w-14">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {filteredIpcs.map((item, idx) => {
              const originalIndex = ipcTracker.findIndex((x) => x.id === item.id);
              const realIdx = originalIndex >= 0 ? originalIndex : idx;

              const maturation = calculateIpcMaturation(item, annualInterestRate, exchangeRate);
              const isExpanded = expandedIpcId === item.id;

              return (
                <React.Fragment key={item.id || idx}>
                  <tr className={`transition duration-100 ${
                    maturation.isOverdue 
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60 dark:hover:bg-rose-950/20' 
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50'
                  }`}>
                    {/* IPC No */}
                    <td className="py-2.5 px-3 font-bold">
                      <input
                        type="text"
                        value={item.paymentNo}
                        onChange={(e) => handleFieldChange(realIdx, 'paymentNo', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 font-bold text-slate-800 dark:text-zinc-100 outline-none"
                      />
                      <div className="text-[10px] text-slate-400 px-1 font-normal">
                        Period: {item.period || 'N/A'}
                      </div>
                    </td>

                    {/* Submission Date & Elapsed Calendar Days */}
                    <td className="py-2.5 px-2">
                      <input
                        type="date"
                        value={item.submissionDate || ''}
                        onChange={(e) => handleFieldChange(realIdx, 'submissionDate', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 font-mono text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                        title="Contractor IPC Submission Date"
                      />
                      <div className="text-[10px] font-mono px-1 font-medium text-slate-500 dark:text-slate-400">
                        {item.submissionDate ? `${maturation.daysElapsed} days elapsed` : 'No date'}
                      </div>
                    </td>

                    {/* 56-Day Maturation Status Badge */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${maturation.statusBadge.bgClass} ${maturation.statusBadge.textClass} ${maturation.statusBadge.borderClass}`}>
                          {maturation.statusBadge.label}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                          {maturation.dueDate ? `Due: ${maturation.dueDate}` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Gross Bill ETB */}
                    <td className="py-2.5 px-2 text-right">
                      <AmountInput
                        value={item.grossBillEtb || 0}
                        onChange={(val) => handleFieldChange(realIdx, 'grossBillEtb', val)}
                        className="bg-transparent text-right font-mono font-semibold text-slate-700 dark:text-slate-200 border-none w-full outline-none"
                      />
                    </td>

                    {/* Price Adjustment Entry ETB */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <AmountInput
                        value={item.priceAdjustmentEtb || 0}
                        onChange={(val) => handleFieldChange(realIdx, 'priceAdjustmentEtb', val)}
                        className="bg-transparent text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-none w-full outline-none"
                      />
                    </td>

                    {/* Advance Repayment ETB */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-indigo-500 dark:text-indigo-400">
                      <AmountInput
                        value={item.advanceRepaymentEtb || 0}
                        onChange={(val) => handleFieldChange(realIdx, 'advanceRepaymentEtb', val)}
                        className="bg-transparent text-right font-mono font-bold text-indigo-500 dark:text-indigo-400 border-none w-full outline-none"
                      />
                    </td>

                    {/* Retention Money ETB */}
                    <td className="py-2.5 px-2 text-right font-mono text-rose-600 dark:text-rose-400">
                      <AmountInput
                        value={item.retentionEtb || 0}
                        onChange={(val) => handleFieldChange(realIdx, 'retentionEtb', val)}
                        className="bg-transparent text-right font-mono text-rose-600 dark:text-rose-400 border-none w-full outline-none"
                      />
                    </td>

                    {/* Net Certified ETB with Paid/Unpaid/Partially Paid selection */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-zinc-100">
                      <AmountInput
                        value={item.certifiedEtb}
                        onChange={(val) => handleFieldChange(realIdx, 'certifiedEtb', val)}
                        className="bg-transparent text-right font-mono font-bold border-none w-full outline-none text-slate-800 dark:text-zinc-100"
                      />
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <select
                          value={item.statusEtb || item.status || 'Unpaid'}
                          onChange={(e) => handleFieldChange(realIdx, 'statusEtb', e.target.value)}
                          className={`text-[10px] font-extrabold py-0.5 px-1.5 rounded border cursor-pointer outline-none transition w-full text-center ${
                            (item.statusEtb || item.status) === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : (item.statusEtb || item.status) === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </select>
                      </div>
                    </td>

                    {/* Certified USD with Paid/Unpaid/Partially Paid selection */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-zinc-100">
                      <AmountInput
                        value={item.certifiedUsd}
                        onChange={(val) => handleFieldChange(realIdx, 'certifiedUsd', val)}
                        className="bg-transparent text-right font-mono font-bold border-none w-full outline-none"
                      />
                      <div className="mt-1">
                        <select
                          value={item.statusUsd || item.status || 'Unpaid'}
                          onChange={(e) => handleFieldChange(realIdx, 'statusUsd', e.target.value)}
                          className={`text-[10px] font-extrabold py-0.5 px-1.5 rounded border cursor-pointer outline-none transition w-full text-center ${
                            (item.statusUsd || item.status) === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : (item.statusUsd || item.status) === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </select>
                      </div>
                    </td>

                    {/* FIDIC 14.8 Accrued Delayed Interest Reflection */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      {maturation.accruedInterestEqvEtb > 0 ? (
                        <div className="text-amber-600 dark:text-amber-400 font-extrabold">
                          +{formatMoney(maturation.accruedInterestEqvEtb, 'Br.')}
                          <div className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-normal">
                            +{maturation.overdueDays}d @ {maturation.annualInterestRate}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          {maturation.isFullyPaid ? 'Settled' : '0.00'}
                        </span>
                      )}
                    </td>

                    {/* Total Claimable Exposure (Principal + Delayed Interest) */}
                    <td className="py-2.5 px-2 text-right font-mono font-extrabold">
                      <div className="text-indigo-600 dark:text-indigo-400">
                        {formatMoney(
                          maturation.isFullyPaid 
                            ? (item.certifiedEtb || 0) + (exchangeRate * (item.certifiedUsd || 0))
                            : maturation.totalClaimableEqvEtb, 
                          'Br.'
                        )}
                      </div>
                      {!maturation.isFullyPaid && maturation.accruedInterestEqvEtb > 0 && (
                        <div className="text-[9px] text-rose-500 dark:text-rose-400 font-semibold">
                          Incl. Interest
                        </div>
                      )}
                    </td>

                    {/* Toggle expand & action buttons */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setExpandedIpcId(isExpanded ? null : item.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Toggle Maturation & Calculation Details"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveIpcRow(realIdx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Delete IPC Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded IPC Detail Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
                      <td colSpan={12} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">

                          {/* 56-Day Maturation & Delay Analysis Box */}
                          <div className={`space-y-2 p-3 rounded-xl border ${
                            maturation.isOverdue
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                              : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700'
                          }`}>
                            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase">
                              <ShieldAlert className={`w-3.5 h-3.5 ${maturation.isOverdue ? 'text-rose-600' : 'text-blue-500'}`} />
                              FIDIC Cl. 14.7 Maturation & Delay Breakdown
                            </span>
                            
                            <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Submission Date:</span>
                                <span className="font-bold">{item.submissionDate || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">56-Day Maturation Due Date:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{maturation.dueDate || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Elapsed Calendar Days:</span>
                                <span className="font-bold">{maturation.daysElapsed} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Overdue Days (&gt;56d):</span>
                                <span className={`font-bold ${maturation.overdueDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {maturation.overdueDays > 0 ? `+${maturation.overdueDays} days overdue` : '0 days (Compliant)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Interest Reflection & Financing Charges Box */}
                          <div className="space-y-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase">
                              <Percent className="w-3.5 h-3.5 text-amber-500" />
                              FIDIC Cl. 14.8 Delayed Interest Reflection
                            </span>

                            <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-sans">Applicable Annual Rate:</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.customAnnualInterestRate !== undefined ? item.customAnnualInterestRate : annualInterestRate}
                                    onChange={(e) => handleFieldChange(realIdx, 'customAnnualInterestRate', parseFloat(e.target.value) || 0)}
                                    className="w-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-right font-bold text-slate-800 dark:text-zinc-100 outline-none text-xs"
                                  />
                                  <span className="text-[10px]">%</span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Unpaid ETB Principal:</span>
                                <span>{formatMoney(maturation.unpaidCertifiedEtb, 'Br.')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Accrued Delay Interest (ETB):</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {formatMoney(maturation.accruedInterestEtb, 'Br.')}
                                </span>
                              </div>
                              {maturation.unpaidCertifiedUsd > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-sans">Accrued Delay Interest (USD):</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {formatMoney(maturation.accruedInterestUsd, '$')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1">
                                <span className="text-slate-500 dark:text-slate-400 font-bold font-sans">Total Claimable Exposure:</span>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {formatMoney(maturation.totalClaimableEqvEtb, 'Br.')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Key Dates & Certificate Notes */}
                          <div className="space-y-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Milestone Dates & Remarks
                            </span>
                            <div className="space-y-1.5 pt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 block font-semibold">Certification Date:</label>
                                  <input
                                    type="date"
                                    value={item.certificationDate || ''}
                                    onChange={(e) => handleFieldChange(realIdx, 'certificationDate', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-zinc-100 font-mono text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block font-semibold">Disbursement Date:</label>
                                  <input
                                    type="date"
                                    value={item.paymentDate || ''}
                                    onChange={(e) => handleFieldChange(realIdx, 'paymentDate', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-zinc-100 font-mono text-xs outline-none"
                                    title="Actual payment disbursement date"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block font-semibold">Certificate Remarks / Escalation Reason:</label>
                                <textarea
                                  rows={2}
                                  value={item.remarks || ''}
                                  onChange={(e) => handleFieldChange(realIdx, 'remarks', e.target.value)}
                                  placeholder="Notes on statutory payment delay notification, NBE forex approval, or interest compounding..."
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-800 dark:text-zinc-100 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredIpcs.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No monthly payment certificates found matching current filter. Click "+ Add IPC Entry" to record interim payment statements.
                </td>
              </tr>
            )}
          </tbody>

          {/* Grand Totals Footer */}
          {filteredIpcs.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                <td className="py-3 px-3 text-slate-800 dark:text-zinc-100 font-extrabold" colSpan={3}>
                  Total Cumulative Ledger:
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-900 dark:text-zinc-100 font-extrabold">
                  {formatMoney(totalGrossEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                  +{formatMoney(totalPriceAdjustmentEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-indigo-500 dark:text-indigo-400 font-extrabold">
                  {formatMoney(totalAdvanceRepaymentEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-rose-600 dark:text-rose-400 font-extrabold">
                  {formatMoney(totalRetentionEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-center font-mono text-slate-900 dark:text-zinc-100 font-extrabold">
                  {formatMoney(totalCertifiedEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-center font-mono text-slate-900 dark:text-zinc-100 font-extrabold">
                  {formatMoney(totalCertifiedUsd, '$')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-amber-600 dark:text-amber-400 font-black">
                  +{formatMoney(summary.totalAccruedInterestEqvEtb, 'Br.')}
                </td>
                <td className="py-3 px-2 text-right font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">
                  {formatMoney(summary.totalClaimableExposureEqvEtb, 'Br.')}
                </td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

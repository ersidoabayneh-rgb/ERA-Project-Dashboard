import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Activity, 
  Landmark, 
  ArrowUpRight, 
  Sparkles
} from 'lucide-react';
import { PaymentInstruction, TreasuryBankAccount } from '../../types/treasury';

interface TreasuryKpiCardsProps {
  payments: PaymentInstruction[];
  accounts: TreasuryBankAccount[];
  onOpenSimulator: () => void;
  onOpenWebhookLogs: () => void;
}

export const TreasuryKpiCards: React.FC<TreasuryKpiCardsProps> = ({
  payments,
  accounts,
  onOpenSimulator,
  onOpenWebhookLogs,
}) => {
  // Disbursed (Paid)
  const paidPayments = payments.filter(p => p.status === 'Paid');
  const paidEtb = paidPayments
    .filter(p => p.currency === 'ETB')
    .reduce((sum, p) => sum + p.amount, 0);
  const paidUsd = paidPayments
    .filter(p => p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);

  // Pending
  const pendingPayments = payments.filter(p => p.status === 'Pending');
  const pendingValueEtb = pendingPayments
    .filter(p => p.currency === 'ETB')
    .reduce((sum, p) => sum + p.amount, 0);

  // Processing
  const processingPayments = payments.filter(p => p.status === 'Processing');
  const processingValueEtb = processingPayments
    .filter(p => p.currency === 'ETB')
    .reduce((sum, p) => sum + p.amount, 0);

  // Total Liquid Treasury Reserves (ETB Accounts)
  const totalLiquidEtb = accounts
    .filter(a => !a.isFx)
    .reduce((sum, a) => sum + a.availableBalance, 0);
  const totalLiquidUsd = accounts
    .filter(a => a.isFx)
    .reduce((sum, a) => sum + a.availableBalance, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* KPI 1: Total Disbursed (Paid) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Disbursed (Settled)
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ETB {(paidEtb / 1_000_000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">Million</span>
          </div>
          {paidUsd > 0 && (
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              + USD {(paidUsd / 1_000_000).toFixed(2)} M <span className="text-[10px] text-slate-400 font-normal">(FX Desk)</span>
            </div>
          )}
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{paidPayments.length} Settled Instructions</span>
          <button 
            onClick={onOpenWebhookLogs}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            200 OK Logs <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* KPI 2: Pending Approval */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending Authorization
          </span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ETB {(pendingValueEtb / 1_000_000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">Million</span>
          </div>
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {pendingPayments.length} payment voucher{pendingPayments.length === 1 ? '' : 's'} awaiting audit
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Requires Financial Director Action</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">Audit Tier 1</span>
        </div>
      </div>

      {/* KPI 3: Gateway Processing & Live Sync */}
      <div className="bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between ring-1 ring-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Gateway Processing
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ETB {(processingValueEtb / 1_000_000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">Million</span>
          </div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {processingPayments.length} instruction{processingPayments.length === 1 ? '' : 's'} in bank transit
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Awaiting Webhook Callback</span>
          <button
            onClick={onOpenSimulator}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Simulate 200 OK
          </button>
        </div>
      </div>

      {/* KPI 4: Liquid Bank Treasury Reserves */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Available Treasury Pool
          </span>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
            <Landmark className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ETB {(totalLiquidEtb / 1_000_000_000).toFixed(2)} <span className="text-xs font-semibold text-slate-500">Billion</span>
          </div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
            + USD {(totalLiquidUsd / 1_000_000).toFixed(1)} M FX Reserves
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Across 4 Linked Banks (CBE/Dashen/Awash/Citi)</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Auto-Deducted</span>
        </div>
      </div>

    </div>
  );
};

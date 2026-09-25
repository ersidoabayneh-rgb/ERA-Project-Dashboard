import React from 'react';
import { Landmark, ArrowDownRight, ShieldCheck, Globe2 } from 'lucide-react';
import { TreasuryBankAccount } from '../../types/treasury';

interface BankTreasuryAccountsWidgetProps {
  accounts: TreasuryBankAccount[];
}

export const BankTreasuryAccountsWidget: React.FC<BankTreasuryAccountsWidgetProps> = ({ accounts }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>Linked Treasury Bank Accounts & Liquid Settlement Pools</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 uppercase">
                Real-Time Auto-Deduction
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Clear balances automatically debited in real time upon receiving Webhook 200 OK callbacks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Core Banking API Linked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const usagePercent = Math.min(100, Math.round((acc.reservedCommitments / acc.clearedBalance) * 100)) || 0;

          return (
            <div 
              key={acc.id} 
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[10px] font-black font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      {acc.bankName}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {acc.accountName}
                    </h4>
                  </div>
                  {acc.isFx ? (
                    <span className="p-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300" title="Foreign Currency Allocation">
                      <Globe2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      ETB
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                  <span>Acc: {acc.accountNumber}</span>
                  <span className="font-bold text-slate-400">SWIFT: {acc.swiftBic}</span>
                </div>

                {/* Available Balance Big Figure */}
                <div className="space-y-0.5 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available Liquid Balance
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {acc.currency} {acc.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Commitments Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Reserved for Pending/Processing:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {acc.currency} {acc.reservedCommitments.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                <span>{acc.branch}</span>
                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ArrowDownRight className="w-3 h-3" /> Auto-Debit
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

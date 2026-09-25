import React from 'react';
import { ShieldCheck, UserCheck, Key, ArrowRightLeft, FileCheck2 } from 'lucide-react';
import { ActiveRole } from '../../types/treasury';

interface RoleSwitcherRibbonProps {
  activeRole: ActiveRole;
  onRoleChange: (role: ActiveRole) => void;
  pendingCount: number;
}

export const RoleSwitcherRibbon: React.FC<RoleSwitcherRibbonProps> = ({
  activeRole,
  onRoleChange,
  pendingCount,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-md border border-indigo-900/60 mb-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Left: Role and Authority Context */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                Three-Tier Governance Authority
              </span>
              <span className="text-xs text-slate-300 font-medium">
                ERA Financial Governance Directive #FD-2026-04
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
              <span>Real-Time Bank Gateway & Treasury Disbursement</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Webhook 200 OK Auto-Sync Active
              </span>
            </h2>
          </div>
        </div>

        {/* Right: Interactive Role Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 self-center sm:self-auto">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            Active Authority:
          </span>

          <div className="inline-flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 flex-wrap gap-1">
            {/* Department Head Button */}
            <button
              type="button"
              onClick={() => onRoleChange('DEPARTMENT_HEAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRole === 'DEPARTMENT_HEAD'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Switch to Department Head (Engineering & Technical Verifier)"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Dept Head</span>
              <span className="text-[10px] opacity-80 font-normal hidden lg:inline">(Verifier)</span>
            </button>

            {/* Financial Management Director Button */}
            <button
              type="button"
              onClick={() => onRoleChange('FINANCIAL_DIRECTOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                activeRole === 'FINANCIAL_DIRECTOR'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Switch to Financial Management Director (Approver & Executor)"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Finance Director</span>
              <span className="text-[10px] opacity-80 font-normal hidden lg:inline">(Approver & Executor)</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Director General Button */}
            <button
              type="button"
              onClick={() => onRoleChange('DIRECTOR_GENERAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRole === 'DIRECTOR_GENERAL'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Switch to Director General (Mandate Submitter & Accounting Officer)"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Director General</span>
              <span className="text-[10px] opacity-80 font-normal hidden lg:inline">(Executive)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Role Description Bar */}
      <div className="mt-3 pt-2.5 border-t border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-indigo-300">Active Mode:</span>
          {activeRole === 'DIRECTOR_GENERAL' ? (
            <span className="text-blue-200">
              <strong className="text-white">Director General:</strong> Authorized to create and submit payment instructions, adjust amounts/currencies, and sign executive disbursement mandates.
            </span>
          ) : activeRole === 'DEPARTMENT_HEAD' ? (
            <span className="text-teal-200">
              <strong className="text-white">Department Head:</strong> Authorized to inspect technical IPC valuations, verify supporting vouchers and tax clearances, and review signature hierarchy chains.
            </span>
          ) : (
            <span className="text-emerald-200">
              <strong className="text-white">Financial Management Director:</strong> Authorized to audit payment vouchers, approve/reject with mandatory commentary, and dispatch transfers to the bank gateway.
            </span>
          )}
        </div>
        <div className="text-slate-400 text-[10px] font-mono shrink-0">
          TLS 1.3 / ISO 20022 Compliant
        </div>
      </div>
    </div>
  );
};

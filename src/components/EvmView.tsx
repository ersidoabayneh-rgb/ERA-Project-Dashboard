import React, { useState, useMemo, useEffect } from 'react';
import { Activity, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Project, formatAccounting } from '../types';
import { calculateProjectEvm, EacScenarioId } from '../lib/evmCalculations';
import EacScenariosPanel from './EacScenariosPanel';
import TcpiAnalysisPanel from './TcpiAnalysisPanel';

interface EvmViewProps {
  project: Project;
  onUpdateProject?: (updatedProject: Partial<Project>, actionDescription?: string) => void;
  isReadonly?: boolean;
  tcpiAlertThreshold?: number;
}

export default function EvmView({
  project,
  onUpdateProject,
  isReadonly = false,
  tcpiAlertThreshold = 1.05,
}: EvmViewProps) {
  // Active EAC Scenario & Manual Bottom-up ETC state (synced with project persistence)
  const baseEvmSnapshot = useMemo(() => calculateProjectEvm(project), [project]);
  const [selectedEacScenario, setSelectedEacScenario] = useState<EacScenarioId>(
    () => project.eacScenario ?? 'cpi_continues'
  );
  const [bottomUpEtc, setBottomUpEtc] = useState<number>(
    () => project.bottomUpEtcEtb ?? baseEvmSnapshot.remainingWork
  );

  useEffect(() => {
    setSelectedEacScenario(project.eacScenario ?? 'cpi_continues');
    setBottomUpEtc(project.bottomUpEtcEtb ?? baseEvmSnapshot.remainingWork);
  }, [project.id, project.eacScenario, project.bottomUpEtcEtb, baseEvmSnapshot.remainingWork]);

  const handleSelectEacScenario = (scenario: EacScenarioId) => {
    setSelectedEacScenario(scenario);
    if (!isReadonly && onUpdateProject) {
      onUpdateProject({ eacScenario: scenario }, `Selected EAC Forecast Scenario: ${scenario}`);
    }
  };

  const handleBottomUpEtcChange = (val: number, persist = false) => {
    setBottomUpEtc(val);
    if (persist && !isReadonly && onUpdateProject) {
      onUpdateProject({ bottomUpEtcEtb: val }, `Updated Bottom-up ETC (${formatAccounting(val, 'Br.')})`);
    }
  };

  // Unified EVM metrics calculation with active EAC scenario
  const evm = useMemo(
    () =>
      calculateProjectEvm(project, {
        eacScenario: selectedEacScenario,
        bottomUpEtcEtb: bottomUpEtc,
      }),
    [project, selectedEacScenario, bottomUpEtc]
  );

  const {
    BAC,
    AC,
    EV,
    PV,
    CPI,
    SPI,
    CV,
    SV,
    EAC,
    ETC,
    VAC,
    tcpiBac,
    tcpiEac,
    budgetThreshold,
    budgetThresholdAllowance,
    isOriginalBudgetExhausted,
    isBudgetThresholdExceeded,
    remainingFundsThreshold,
    thresholdVac,
    tcpiThreshold,
  } = evm;
  const activeScenarioDetail = evm.eacScenarios.find(s => s.id === selectedEacScenario) || evm.eacScenarios[0];
  const thresholdUsedPct = budgetThreshold > 0 ? (AC / budgetThreshold) * 100 : 0;

  const getIndexColor = (v: number) => {
    if (v >= 1.0) return 'text-emerald-600 dark:text-emerald-400';
    if (v >= 0.90) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getStatusDesc = (c: number, s: number) => {
    if (isOriginalBudgetExhausted) {
      if (isBudgetThresholdExceeded) {
        return {
          label: '120% Threshold Breached · Cost Freeze',
          color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        };
      }
      if (EAC > budgetThreshold) {
        return {
          label: 'BAC Exhausted · Strict Cost Control',
          color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
        };
      }
      return {
        label: 'BAC Exhausted · Monitor 120% Ceiling',
        color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      };
    }
    if (c >= 1.0 && s >= 1.0) {
      return {
        label: 'Excellent Conformance',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
      };
    }
    if (c >= 0.90 && s >= 0.90) {
      return {
        label: 'Moderate Caution',
        color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      };
    }
    return {
      label: 'Critical Variance Notice',
      color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    };
  };

  const statusFlag = getStatusDesc(CPI, SPI);
  const formatBr = (v: number) => formatAccounting(v, 'Br.');

  return (
    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
      {/* Strict Cost Monitoring & 120% Budget Threshold Governance Banner (when Original BAC is Exhausted) */}
      {isOriginalBudgetExhausted && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3.5 ${
            isBudgetThresholdExceeded
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
              : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl border shrink-0 ${
                  isBudgetThresholdExceeded
                    ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                }`}
              >
                {isBudgetThresholdExceeded ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  {isBudgetThresholdExceeded
                    ? '120% Budget Threshold Breached — Emergency Cost Freeze & Strict Cost Control'
                    : 'Original Budget Exhausted — Strict Cost Monitoring & 120% Threshold Control Active'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                  Actual Cost ({formatBr(AC)}) has exhausted the Original Contract Amount ({formatBr(BAC)}). Project governance is locked to{' '}
                  <strong>strict cost monitoring and efficient project cost control</strong> with the{' '}
                  <strong>Budget Threshold capped at Original Contract + 20% ({formatBr(budgetThreshold)})</strong>.
                </p>
              </div>
            </div>
            <div className="text-left lg:text-right font-mono tabular-nums shrink-0">
              <div className="text-[11px] font-sans font-semibold opacity-80">Threshold Utilization</div>
              <div className={`text-lg font-bold ${isBudgetThresholdExceeded ? 'text-rose-700 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>
                {thresholdUsedPct.toFixed(1)}% of 120% Cap
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-black/10 dark:border-white/10">
              <div className="text-[11px] font-semibold opacity-75">Original Contract (BAC)</div>
              <div className="text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5">{formatBr(BAC)}</div>
              <div className="text-[10.5px] text-rose-600 dark:text-rose-400 font-semibold">
                Exhausted (+{formatBr(AC - BAC)})
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-black/10 dark:border-white/10">
              <div className="text-[11px] font-semibold opacity-75">+20% Cost Control Allowance</div>
              <div className="text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5">{formatBr(budgetThresholdAllowance)}</div>
              <div className="text-[10.5px] opacity-75">Maximum statutory margin</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-black/10 dark:border-white/10">
              <div className="text-[11px] font-semibold opacity-75">Budget Threshold (120%)</div>
              <div className="text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5">{formatBr(budgetThreshold)}</div>
              <div className="text-[10.5px] opacity-75">Original Contract + 20%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-black/10 dark:border-white/10">
              <div className="text-[11px] font-semibold opacity-75">
                {remainingFundsThreshold >= 0 ? 'Remaining Threshold Headroom' : 'Over-Threshold Excess'}
              </div>
              <div
                className={`text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5 ${
                  remainingFundsThreshold > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatBr(remainingFundsThreshold)}
              </div>
              <div className="text-[10.5px] opacity-75">
                {remainingFundsThreshold > 0 ? 'Protected by strict cost control' : 'Immediate containment required'}
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11.5px]">
            <span className="font-semibold">
              Mandatory Cost Control Directives: (1) Freeze unapproved variations &amp; non-essential dayworks · (2) Audit every IPC quantity &amp; unit rate · (3) Enforce efficient resource &amp; site cost control to hold total spend &le; {formatBr(budgetThreshold)}.
            </span>
          </div>
        </div>
      )}

      {/* Overview EVM Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Callout */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted ? 'Cost Control & Threshold Health' : 'Earned Value Project Health'}
          </span>
          <div className="my-2">
            <span className={`inline-block text-sm sm:text-base font-bold tracking-tight px-3 py-1 rounded-xl border ${statusFlag.color}`}>
              {statusFlag.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted ? (
              <>
                Original budget is exhausted. Strict cost monitoring is enforced against the{' '}
                <strong className="text-slate-700 dark:text-slate-200">120% Budget Threshold ({formatBr(budgetThreshold)})</strong>{' '}
                with {formatBr(Math.max(0, remainingFundsThreshold))} remaining headroom ({evm.actualPct.toFixed(1)}% actual vs {evm.plannedPct.toFixed(1)}% {evm.planLabel || 'Original Plan'}).
              </>
            ) : (
              <>
                EVM indices update dynamically from Financial Data certified IPCs and Monthly Cumulative S-Curve progress ({evm.actualPct.toFixed(1)}% actual vs {evm.plannedPct.toFixed(1)}% {evm.planLabel || 'Original Plan'}).
              </>
            )}
          </p>
        </div>

        {/* CPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Cost Performance Index (CPI = EV / AC)
          </span>
          <div className="my-1.5 flex items-baseline gap-2.5">
            <span className={`text-3xl font-bold font-mono tabular-nums ${getIndexColor(CPI)}`}>
              {CPI.toFixed(3)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">
              {isOriginalBudgetExhausted
                ? isBudgetThresholdExceeded
                  ? 'Threshold Breached · Freeze Spend'
                  : 'Strict Cost Control Active'
                : CPI >= 1.0
                ? 'Under Budget'
                : CPI >= 0.90
                ? 'Borderline'
                : 'Overspending'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted
              ? `For every Br 1.00 certified, Br ${CPI.toFixed(2)} of baseline value is earned. Enforce rigorous IPC verification, variation restraint, and cost efficiency to stay under the ${formatBr(budgetThreshold)} (120%) ceiling.`
              : `For every Br 1.00 certified, the project earns Br ${CPI.toFixed(2)} of baseline progress value (${evm.cpiStatus.description}).`}
          </p>
        </div>

        {/* SPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Schedule Performance Index (SPI = EV / PV)
          </span>
          <div className="my-1.5 flex items-baseline gap-2.5">
            <span className={`text-3xl font-bold font-mono tabular-nums ${getIndexColor(SPI)}`}>
              {SPI.toFixed(3)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">
              {SPI >= 1.0 ? 'Ahead / On Track' : SPI >= 0.90 ? 'Minor Lag' : 'Delayed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted
              ? `Physical output is ${Math.round(SPI * 100)}% of target schedule. Prioritize cost-efficient work sequencing and avoid costly acceleration or claims that threaten the 120% Budget Threshold.`
              : `Physical achievements match ${Math.round(SPI * 100)}% of target schedules (${evm.spiStatus.description}).`}
          </p>
        </div>
      </div>

      {/* EVM Metric Computations Table (Birr) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50 font-bold flex items-center justify-between gap-2 text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>EVM Metric Computations Table (Birr)</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums font-normal text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted
              ? `120% Budget Threshold: ${formatBr(budgetThreshold)} · Active Model: Scenario ${activeScenarioDetail.number}`
              : `Active EAC Model: Scenario ${activeScenarioDetail.number} · ${activeScenarioDetail.formula}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                <th className="p-2.5">EVM Factor Definition</th>
                <th className="p-2.5 text-center w-28">Acronym</th>
                <th className="p-2.5 text-right w-52">Value (Birr / Index)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium tabular-nums">
              <tr>
                <td className="p-2.5">
                  <div>Budget At Completion (Original Contract Amount)</div>
                  {isOriginalBudgetExhausted && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Original budget exhausted — strict cost monitoring shifted to 120% Budget Threshold
                    </div>
                  )}
                </td>
                <td className="p-2.5 text-center font-mono font-bold">BAC</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(BAC)}</td>
              </tr>
              {isOriginalBudgetExhausted && (
                <>
                  <tr className="bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 font-semibold">
                    <td className="p-2.5">
                      <div>Budget Threshold (Original Contract Amount + 20%)</div>
                      <div className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                        Hard cost-control ceiling ({formatBr(BAC)} + {formatBr(budgetThresholdAllowance)})
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">CAP (120%)</td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                      {formatBr(budgetThreshold)}
                    </td>
                  </tr>
                  <tr className={remainingFundsThreshold > 0 ? 'bg-slate-50/70 dark:bg-slate-900/40' : 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100'}>
                    <td className="p-2.5">
                      <div>Remaining Threshold Funds (120% Threshold &minus; AC)</div>
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                        {remainingFundsThreshold > 0
                          ? 'Available cost-control headroom before exceeding Original Contract + 20%'
                          : '120% Budget Threshold exhausted — emergency cost freeze required'}
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">REM (120%)</td>
                    <td className={`p-2.5 text-right font-mono font-bold ${remainingFundsThreshold > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatBr(remainingFundsThreshold)}
                    </td>
                  </tr>
                </>
              )}
              <tr>
                <td className="p-2.5">Planned Value</td>
                <td className="p-2.5 text-center font-mono font-bold">PV</td>
                <td className="p-2.5 text-right font-mono">{formatBr(PV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Earned Value</td>
                <td className="p-2.5 text-center font-mono font-bold">EV</td>
                <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBr(EV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Actual Cost</td>
                <td className="p-2.5 text-center font-mono font-bold">AC</td>
                <td className="p-2.5 text-right font-mono font-semibold">{formatBr(AC)}</td>
              </tr>
              <tr className={CV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Cost Variance (EV &minus; AC)</td>
                <td className="p-2.5 text-center font-mono font-bold">CV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(CV)}</td>
              </tr>
              <tr className={SV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Schedule Variance (EV &minus; PV)</td>
                <td className="p-2.5 text-center font-mono font-bold">SV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(SV)}</td>
              </tr>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                <td className="p-2.5">
                  <div>Estimate To Complete — Scenario {activeScenarioDetail.number} ({activeScenarioDetail.title})</div>
                  {isOriginalBudgetExhausted && ETC > Math.max(0, remainingFundsThreshold) && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Exceeds remaining 120% threshold headroom ({formatBr(Math.max(0, remainingFundsThreshold))}) — strict cost reduction required
                    </div>
                  )}
                </td>
                <td className="p-2.5 text-center font-mono font-bold">ETC</td>
                <td className="p-2.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">{formatBr(ETC)}</td>
              </tr>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                <td className="p-2.5">
                  <div>Estimate At Completion — Scenario {activeScenarioDetail.number} ({activeScenarioDetail.formula})</div>
                  {isOriginalBudgetExhausted && (
                    <div className={`text-[11px] font-semibold mt-0.5 ${EAC > budgetThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {EAC > budgetThreshold
                        ? `Breaches 120% Budget Threshold by +${formatBr(EAC - budgetThreshold)} — reduce via strict cost control`
                        : `Within 120% Budget Threshold (${formatBr(budgetThreshold)}) with ${formatBr(thresholdVac)} margin`}
                    </div>
                  )}
                </td>
                <td className="p-2.5 text-center font-mono font-bold">EAC</td>
                <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{formatBr(EAC)}</td>
              </tr>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                <td className="p-2.5">Variance At Completion (BAC &minus; EAC)</td>
                <td className="p-2.5 text-center font-mono font-bold">VAC</td>
                <td className={`p-2.5 text-right font-mono font-bold ${VAC >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatBr(VAC)}
                </td>
              </tr>
              {isOriginalBudgetExhausted && (
                <tr className={thresholdVac >= 0 ? 'bg-emerald-500/5 text-emerald-900 dark:text-emerald-200' : 'bg-rose-500/10 text-rose-900 dark:text-rose-200'}>
                  <td className="p-2.5">
                    <div>Threshold Variance At Completion (120% Threshold &minus; EAC)</div>
                    <div className="text-[11px] font-normal opacity-80 mt-0.5">
                      {thresholdVac >= 0
                        ? 'Forecast finishes within Original Contract + 20% under strict cost monitoring'
                        : 'Forecast exceeds Original Contract + 20% — enforce immediate cost containment'}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold">VAC (120%)</td>
                  <td className={`p-2.5 text-right font-mono font-bold ${thresholdVac >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatBr(thresholdVac)}
                  </td>
                </tr>
              )}
              <tr
                className={
                  tcpiBac === null || tcpiBac > tcpiAlertThreshold
                    ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 font-semibold'
                    : 'bg-slate-50/70 dark:bg-slate-900/40'
                }
              >
                <td className="p-2.5">
                  <div>To-Complete Performance Index — Original Budget (BAC)</div>
                  {isOriginalBudgetExhausted ? (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Original BAC exhausted — cost control governed by 120% Budget Threshold (Original Contract + 20%)
                    </div>
                  ) : (
                    (tcpiBac === null || tcpiBac > tcpiAlertThreshold) && (
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        Exceeds Custom TCPI Alert Threshold (&gt; {tcpiAlertThreshold.toFixed(2)})
                      </div>
                    )
                  )}
                </td>
                <td className="p-2.5 text-center font-mono font-bold">TCPI (BAC)</td>
                <td className={`p-2.5 text-right font-mono font-bold ${
                  tcpiBac === null || tcpiBac > tcpiAlertThreshold
                    ? 'text-rose-600 dark:text-rose-400'
                    : tcpiBac > 1.0
                    ? 'text-amber-600 dark:text-amber-400'
                    : tcpiBac < 1.0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {tcpiBac !== null ? tcpiBac.toFixed(3) : 'N/A (Exhausted)'}
                </td>
              </tr>
              {isOriginalBudgetExhausted && (
                <tr
                  className={
                    tcpiThreshold === null || tcpiThreshold > tcpiAlertThreshold
                      ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 font-semibold'
                      : 'bg-amber-50/50 dark:bg-amber-950/20'
                  }
                >
                  <td className="p-2.5">
                    <div>To-Complete Performance Index — 120% Budget Threshold (Original + 20%)</div>
                    <div className="text-[11px] font-semibold mt-0.5 text-slate-600 dark:text-slate-300">
                      {tcpiThreshold === null
                        ? '120% Budget Threshold exhausted — enforce immediate cost freeze and claim/variation controls'
                        : tcpiThreshold > tcpiAlertThreshold
                        ? `Requires strict cost efficiency (${tcpiThreshold.toFixed(3)} > ${tcpiAlertThreshold.toFixed(2)}) to avoid breaching 120% threshold`
                        : 'Required cost efficiency on remaining work to finish within Original Contract + 20%'}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold">TCPI (120%)</td>
                  <td className={`p-2.5 text-right font-mono font-bold ${
                    tcpiThreshold === null || tcpiThreshold > tcpiAlertThreshold
                      ? 'text-rose-600 dark:text-rose-400'
                      : tcpiThreshold > 1.0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {tcpiThreshold !== null ? tcpiThreshold.toFixed(3) : 'N/A (Cap Breached)'}
                  </td>
                </tr>
              )}
              <tr
                className={
                  tcpiEac === null || tcpiEac > tcpiAlertThreshold
                    ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 font-semibold'
                    : 'bg-slate-50/70 dark:bg-slate-900/40'
                }
              >
                <td className="p-2.5">
                  <div>To-Complete Performance Index — Revised Forecast (EAC)</div>
                  {isOriginalBudgetExhausted && EAC > budgetThreshold ? (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Forecast EAC exceeds 120% Budget Threshold — enforce strict cost control to reduce ETC
                    </div>
                  ) : (
                    (tcpiEac === null || tcpiEac > tcpiAlertThreshold) && (
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        Exceeds Custom TCPI Alert Threshold (&gt; {tcpiAlertThreshold.toFixed(2)})
                      </div>
                    )
                  )}
                </td>
                <td className="p-2.5 text-center font-mono font-bold">TCPI (EAC)</td>
                <td className={`p-2.5 text-right font-mono font-bold ${
                  tcpiEac === null || tcpiEac > tcpiAlertThreshold
                    ? 'text-rose-600 dark:text-rose-400'
                    : tcpiEac > 1.0
                    ? 'text-amber-600 dark:text-amber-400'
                    : tcpiEac < 1.0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {tcpiEac !== null ? tcpiEac.toFixed(3) : 'N/A (Exhausted)'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* 4-Scenario Estimate at Completion (EAC) Calculator & Selector */}
      <EacScenariosPanel
        evm={evm}
        activeScenario={selectedEacScenario}
        bottomUpEtcValue={bottomUpEtc}
        onSelectScenario={handleSelectEacScenario}
        onBottomUpEtcChange={handleBottomUpEtcChange}
        canPersist={!isReadonly && Boolean(onUpdateProject)}
        tcpiAlertThreshold={tcpiAlertThreshold}
        formatBr={formatBr}
      />

      {/* Dedicated TCPI Diagnostic & Cost Efficiency Judgment Section */}
      <TcpiAnalysisPanel
        project={project}
        evm={evm}
        activeScenario={selectedEacScenario}
        onSelectScenario={handleSelectEacScenario}
        formatBr={formatBr}
      />
    </div>
  );
}

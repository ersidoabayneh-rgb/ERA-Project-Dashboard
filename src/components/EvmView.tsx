import React, { useState, useMemo, useEffect } from 'react';
import { Activity } from 'lucide-react';
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

  const { BAC, AC, EV, PV, CPI, SPI, CV, SV, EAC, ETC, VAC, tcpiBac, tcpiEac } = evm;
  const activeScenarioDetail = evm.eacScenarios.find(s => s.id === selectedEacScenario) || evm.eacScenarios[0];

  const getIndexColor = (v: number) => {
    if (v >= 1.0) return 'text-emerald-600 dark:text-emerald-400';
    if (v >= 0.90) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getStatusDesc = (c: number, s: number) => {
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
      {/* Overview EVM Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Callout */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Earned Value Project Health
          </span>
          <div className="my-2">
            <span className={`inline-block text-base font-bold tracking-tight px-3 py-1 rounded-xl border ${statusFlag.color}`}>
              {statusFlag.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            EVM indices update dynamically from Financial Data certified IPCs and Monthly Cumulative S-Curve progress ({evm.actualPct.toFixed(1)}% actual vs {evm.plannedPct.toFixed(1)}% {evm.planLabel || 'Original Plan'}).
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
              {CPI >= 1.0 ? 'Under Budget' : CPI >= 0.90 ? 'Borderline' : 'Overspending'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For every Br 1.00 certified, the project earns Br {CPI.toFixed(2)} of baseline progress value ({evm.cpiStatus.description}).
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
            Physical achievements match {Math.round(SPI * 100)}% of target schedules ({evm.spiStatus.description}).
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
            Active EAC Model: Scenario {activeScenarioDetail.number} · {activeScenarioDetail.formula}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                <th className="p-2.5">EVM Factor Definition</th>
                <th className="p-2.5 text-center w-24">Acronym</th>
                <th className="p-2.5 text-right w-48">Value (Birr / Index)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium tabular-nums">
              <tr>
                <td className="p-2.5">Budget At Completion</td>
                <td className="p-2.5 text-center font-mono font-bold">BAC</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(BAC)}</td>
              </tr>
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
                <td className="p-2.5">Estimate To Complete — Scenario {activeScenarioDetail.number} ({activeScenarioDetail.title})</td>
                <td className="p-2.5 text-center font-mono font-bold">ETC</td>
                <td className="p-2.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">{formatBr(ETC)}</td>
              </tr>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                <td className="p-2.5">Estimate At Completion — Scenario {activeScenarioDetail.number} ({activeScenarioDetail.formula})</td>
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
              <tr
                className={
                  tcpiBac === null || tcpiBac > tcpiAlertThreshold
                    ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 font-semibold'
                    : 'bg-slate-50/70 dark:bg-slate-900/40'
                }
              >
                <td className="p-2.5">
                  <div>To-Complete Performance Index — Original Budget (BAC)</div>
                  {(tcpiBac === null || tcpiBac > tcpiAlertThreshold) && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Exceeds Custom TCPI Alert Threshold (&gt; {tcpiAlertThreshold.toFixed(2)})
                    </div>
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
              <tr
                className={
                  tcpiEac === null || tcpiEac > tcpiAlertThreshold
                    ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 font-semibold'
                    : 'bg-slate-50/70 dark:bg-slate-900/40'
                }
              >
                <td className="p-2.5">
                  <div>To-Complete Performance Index — Revised Forecast (EAC)</div>
                  {(tcpiEac === null || tcpiEac > tcpiAlertThreshold) && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                      Exceeds Custom TCPI Alert Threshold (&gt; {tcpiAlertThreshold.toFixed(2)})
                    </div>
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

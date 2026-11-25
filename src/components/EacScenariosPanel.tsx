import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, Info } from 'lucide-react';
import { EacScenarioId, EvmMetrics } from '../lib/evmCalculations';

interface EacScenariosPanelProps {
  evm: EvmMetrics;
  activeScenario: EacScenarioId;
  bottomUpEtcValue: number;
  onSelectScenario: (scenario: EacScenarioId) => void;
  onBottomUpEtcChange: (value: number, persist?: boolean) => void;
  canPersist?: boolean;
  tcpiAlertThreshold?: number;
  formatBr: (v: number) => string;
}

export default function EacScenariosPanel({
  evm,
  activeScenario,
  bottomUpEtcValue,
  onSelectScenario,
  onBottomUpEtcChange,
  canPersist = false,
  tcpiAlertThreshold = 1.05,
  formatBr,
}: EacScenariosPanelProps) {
  const { BAC, AC, EV, PV, CPI, SPI, eacScenarios } = evm;

  const [etcDraft, setEtcDraft] = useState<string>(() => Math.round(bottomUpEtcValue).toString());

  useEffect(() => {
    setEtcDraft(Math.round(bottomUpEtcValue).toString());
  }, [bottomUpEtcValue]);

  const handleEtcInput = (raw: string) => {
    setEtcDraft(raw);
    const parsed = Number(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onBottomUpEtcChange(parsed, false);
    }
  };

  const commitEtcPersist = () => {
    const parsed = Number(etcDraft);
    const safeVal = !isNaN(parsed) && parsed >= 0 ? parsed : Math.max(0, BAC - EV);
    setEtcDraft(Math.round(safeVal).toString());
    onBottomUpEtcChange(safeVal, true);
  };

  const activeObj = eacScenarios.find(s => s.id === activeScenario) || eacScenarios[0];

  // Auto-recommend the most realistic scenario based on CPI & SPI telemetry
  const recommendedScenarioId: EacScenarioId =
    SPI < 0.92 && CPI < 0.95
      ? 'cost_and_schedule'
      : CPI < 0.98 || CPI > 1.05
      ? 'cpi_continues'
      : 'original_plan_resumes';

  return (
    <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3.5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Estimate at Completion (EAC) Scenarios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculated using the four standard earned value management formulas depending on how future project costs are expected to behave. Select a scenario to update active EAC, VAC, and TCPI (EAC).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums self-start lg:self-auto">
          <span className="text-slate-500 dark:text-slate-400 font-sans">Active Model:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            Scenario {activeObj.number} · {formatBr(activeObj.eac)}
          </span>
        </div>
      </div>

      {/* Key Variables Reference Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">BAC</div>
          <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
            {formatBr(BAC)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Total approved budget</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">AC</div>
          <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
            {formatBr(AC)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Money spent so far</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">EV</div>
          <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
            {formatBr(EV)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Value completed</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">CPI (EV / AC)</div>
          <div className={`text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5 ${CPI >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : CPI >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {CPI.toFixed(3)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Cost efficiency to date</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">SPI (EV / PV)</div>
          <div className={`text-xs sm:text-sm font-bold font-mono tabular-nums mt-0.5 ${SPI >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : SPI >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {SPI.toFixed(3)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">PV: {formatBr(PV)}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active ETC</div>
          <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">
            {formatBr(activeObj.etc)}
          </div>
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Expected cost to finish</div>
        </div>
      </div>

      {/* EAC Formulas by Scenario Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/70">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 w-12 text-center">Use</th>
              <th className="p-3 min-w-[200px]">Scenario</th>
              <th className="p-3 min-w-[190px]">Formula</th>
              <th className="p-3 min-w-[240px]">When to Use</th>
              <th className="p-3 text-right min-w-[140px]">ETC (Remaining)</th>
              <th className="p-3 text-right min-w-[155px]">EAC (Forecast Total)</th>
              <th className="p-3 text-right min-w-[135px]">VAC (BAC &minus; EAC)</th>
              <th className="p-3 text-right min-w-[100px]">TCPI (EAC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {eacScenarios.map((sc) => {
              const isSelected = sc.id === activeScenario;
              const isRecommended = sc.id === recommendedScenarioId;
              const isBottomUp = sc.id === 'bottom_up_etc';
              const exceedsAlert = sc.tcpiEac === null || sc.tcpiEac > tcpiAlertThreshold;

              return (
                <tr
                  key={sc.id}
                  onClick={() => onSelectScenario(sc.id)}
                  className={`transition-colors cursor-pointer ${
                    exceedsAlert
                      ? 'bg-rose-50/90 dark:bg-rose-950/45 text-rose-950 dark:text-rose-100 hover:bg-rose-100/80 dark:hover:bg-rose-950/60'
                      : isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/35'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <td className="p-3 text-center align-top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScenario(sc.id);
                      }}
                      aria-label={`Select Scenario ${sc.number}: ${sc.title}`}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="p-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {sc.number}. {sc.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      {isSelected && (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Active Forecast</span>
                      )}
                      {isSelected && isRecommended && <span aria-hidden="true">·</span>}
                      {isRecommended && (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Suggested by CPI/SPI
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 align-top font-mono text-[11.5px] font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                    {sc.formula}
                  </td>

                  <td className="p-3 align-top text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sc.whenToUse}
                  </td>

                  <td
                    className="p-3 align-top text-right font-mono tabular-nums text-slate-700 dark:text-slate-200"
                    onClick={(e) => {
                      if (isBottomUp) e.stopPropagation();
                    }}
                  >
                    {isBottomUp ? (
                      <div className="inline-flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={100000}
                            value={etcDraft}
                            onChange={(e) => handleEtcInput(e.target.value)}
                            onBlur={commitEtcPersist}
                            aria-label="Manual Bottom-up ETC in Birr"
                            className="w-36 px-2 py-1 text-right text-xs font-mono tabular-nums rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                          />
                          {canPersist && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectScenario('bottom_up_etc');
                                commitEtcPersist();
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          {formatBr(sc.etc)}
                        </span>
                      </div>
                    ) : (
                      formatBr(sc.etc)
                    )}
                  </td>

                  <td className="p-3 align-top text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatBr(sc.eac)}
                  </td>

                  <td
                    className={`p-3 align-top text-right font-mono tabular-nums font-semibold ${
                      sc.vac >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatBr(sc.vac)}
                  </td>

                  <td
                    className={`p-3 align-top text-right font-mono tabular-nums font-bold ${
                      exceedsAlert
                        ? 'text-rose-600 dark:text-rose-400'
                        : sc.tcpiEac !== null && sc.tcpiEac > 1.0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <div>{sc.tcpiEac !== null ? sc.tcpiEac.toFixed(3) : 'N/A'}</div>
                    {exceedsAlert && (
                      <div className="text-[10px] font-sans font-semibold text-rose-600 dark:text-rose-400 mt-0.5 whitespace-nowrap">
                        Alert (&gt; {tcpiAlertThreshold.toFixed(2)})
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contextual guidance note */}
      <div className="flex items-start gap-2 text-[11.5px] text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-800 dark:text-slate-100">Scenario Guidance:</strong> When SPI ({SPI.toFixed(3)}) and CPI ({CPI.toFixed(3)}) are both below 1.000 under a strict completion deadline, Scenario 3 (<span className="font-mono">AC + (BAC &minus; EV)/(CPI &times; SPI)</span>) captures schedule-driven acceleration costs; if baseline assumptions are obsolete, enter a revised manual Bottom-up ETC in Scenario 4.
        </span>
      </div>
    </section>
  );
}

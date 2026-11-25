import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Project } from '../types';
import { EvmMetrics } from '../lib/evmCalculations';
import { parseMonthKey } from '../lib/monthlySync';
import { parseLocalDate } from '../lib/dateUtils';

interface TcpiTrajectoryChartProps {
  project: Project;
  evm: EvmMetrics;
  tcpiAlertThreshold: number;
  formatBr: (v: number) => string;
}

interface TrajectoryPoint {
  period: string;
  actualPct: number;
  ev: number;
  ac: number;
  cpi: number;
  tcpiBac: number | null;
  tcpiEac: number | null;
  thresholdOne: number;
  alertThreshold: number;
  isCurrent: boolean;
}

const CustomTrajectoryTooltip = ({
  active,
  payload,
  label,
  tcpiAlertThreshold,
  formatBr,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  tcpiAlertThreshold: number;
  formatBr: (v: number) => string;
}) => {
  if (!active || !payload || !payload.length) return null;
  const pt: TrajectoryPoint = payload[0].payload;
  const exceedsAlert = pt.tcpiBac !== null && pt.tcpiBac > tcpiAlertThreshold;
  const aboveOne = pt.tcpiBac !== null && pt.tcpiBac > 1.005;

  return (
    <div className="bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-bold text-white">{label}</span>
        <span className="font-mono text-[11px] text-slate-300 tabular-nums">
          {pt.actualPct.toFixed(1)}% Physical
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px] tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400 font-sans">Earned Value (EV):</span>
          <span className="font-semibold text-blue-300">{formatBr(pt.ev)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400 font-sans">Actual Cost (AC):</span>
          <span className="font-semibold text-slate-200">{formatBr(pt.ac)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
          <span className="text-slate-300 font-sans">TCPI (to BAC):</span>
          <span
            className={`font-bold ${
              pt.tcpiBac === null || exceedsAlert
                ? 'text-rose-400'
                : aboveOne
                ? 'text-amber-300'
                : 'text-emerald-400'
            }`}
          >
            {pt.tcpiBac !== null ? pt.tcpiBac.toFixed(3) : 'Budget Exhausted'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300 font-sans">TCPI (to Active EAC):</span>
          <span className="font-bold text-indigo-300">
            {pt.tcpiEac !== null ? pt.tcpiEac.toFixed(3) : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300 font-sans">Cumulative CPI:</span>
          <span className="font-bold text-teal-300">{pt.cpi.toFixed(3)}</span>
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800 text-[10.5px]">
        {pt.tcpiBac === null ? (
          <span className="text-rose-400 font-semibold">BAC funds exhausted; cost control correction required.</span>
        ) : exceedsAlert ? (
          <span className="text-rose-400 font-semibold">
            Exceeds alert threshold ({tcpiAlertThreshold.toFixed(2)}) — correction required.
          </span>
        ) : aboveOne ? (
          <span className="text-amber-300 font-semibold">
            Above 1.000 target — tighter cost efficiency required.
          </span>
        ) : (
          <span className="text-emerald-400 font-semibold">
            Within 1.000 baseline — cost efficiency on track.
          </span>
        )}
      </div>
    </div>
  );
};

export default function TcpiTrajectoryChart({
  project,
  evm,
  tcpiAlertThreshold,
  formatBr,
}: TcpiTrajectoryChartProps) {
  const { BAC, AC, EV, EAC, CPI, tcpiBac, tcpiEac } = evm;
  const [showCpiLine, setShowCpiLine] = useState<boolean>(true);
  const [showEacLine, setShowEacLine] = useState<boolean>(true);

  const trajectoryData: TrajectoryPoint[] = useMemo(() => {
    const rateIpc = project.usdExchangeRate || 57.5;
    const ipcEntries = (project.ipcTracker || []).map((item) => {
      const parsedPeriod = parseMonthKey(item.period);
      const fallbackDate = parseLocalDate(item.certificationDate || item.submissionDate);
      const serial = parsedPeriod
        ? parsedPeriod.year * 12 + parsedPeriod.monthIndex
        : fallbackDate
        ? fallbackDate.getFullYear() * 12 + fallbackDate.getMonth()
        : null;
      const amt = (item.certifiedEtb || 0) + (item.certifiedUsd || 0) * rateIpc;
      return { serial, amt };
    });

    const datedIpcTotal = ipcEntries.reduce((s, x) => s + (x.serial !== null ? x.amt : 0), 0);
    const hasDatedIpcs = datedIpcTotal > 0;

    // Parse monthly actuals sorted chronologically
    const monthlyParsed = (project.monthly || [])
      .map((m) => {
        const p = parseMonthKey(m.month);
        if (!p) return null;
        const hasActual =
          m.actual !== undefined && m.actual !== null && m.actual !== '' && !isNaN(Number(m.actual));
        const actualVal = hasActual ? Number(m.actual) : null;
        return {
          key: p.key,
          raw: m.month,
          serial: p.year * 12 + p.monthIndex,
          actual: actualVal,
        };
      })
      .filter((x): x is { key: string; raw: string; serial: number; actual: number | null } => x !== null)
      .sort((a, b) => a.serial - b.serial);

    // Determine cutoff at kpiActiveMonth or latest reported actual
    let cutoffIdx = -1;
    if (project.kpiActiveMonth) {
      cutoffIdx = monthlyParsed.findIndex(
        (m) => m.raw.toLowerCase().trim() === project.kpiActiveMonth?.toLowerCase().trim()
      );
    }
    if (cutoffIdx === -1) {
      for (let i = monthlyParsed.length - 1; i >= 0; i--) {
        if (monthlyParsed[i].actual !== null && monthlyParsed[i].actual! > 0) {
          cutoffIdx = i;
          break;
        }
      }
    }

    const activeMonths =
      cutoffIdx >= 0
        ? monthlyParsed.slice(0, cutoffIdx + 1).filter((m) => m.actual !== null)
        : monthlyParsed.filter((m) => m.actual !== null);

    if (activeMonths.length === 0) {
      return [
        {
          period: 'Baseline Start',
          actualPct: 0,
          ev: 0,
          ac: 0,
          cpi: 1.0,
          tcpiBac: 1.0,
          tcpiEac: EAC > 0 ? BAC / EAC : 1.0,
          thresholdOne: 1.0,
          alertThreshold: tcpiAlertThreshold,
          isCurrent: false,
        },
        {
          period: 'Current Status',
          actualPct: evm.actualPct,
          ev: EV,
          ac: AC,
          cpi: CPI,
          tcpiBac,
          tcpiEac,
          thresholdOne: 1.0,
          alertThreshold: tcpiAlertThreshold,
          isCurrent: true,
        },
      ];
    }

    const latestActual = Math.max(0.01, activeMonths[activeMonths.length - 1].actual || evm.actualPct || 1);
    const points: TrajectoryPoint[] = [];

    // Add initial baseline anchor at 1.000 if first logged month already has progress > 0
    if ((activeMonths[0].actual || 0) > 0) {
      points.push({
        period: 'Baseline',
        actualPct: 0,
        ev: 0,
        ac: 0,
        cpi: 1.0,
        tcpiBac: 1.0,
        tcpiEac: EAC > 0 ? BAC / EAC : 1.0,
        thresholdOne: 1.0,
        alertThreshold: tcpiAlertThreshold,
        isCurrent: false,
      });
    }

    activeMonths.forEach((m, idx) => {
      const isLast = idx === activeMonths.length - 1;
      const pct = Math.max(0, Math.min(100, m.actual || 0));
      const pointEv = isLast ? EV : BAC * (pct / 100);

      let pointAc = 0;
      if (isLast) {
        pointAc = AC;
      } else if (hasDatedIpcs) {
        const cumToMonth = ipcEntries.reduce(
          (s, e) => s + (e.serial !== null && e.serial <= m.serial ? e.amt : 0),
          0
        );
        pointAc = datedIpcTotal > 0 ? AC * (cumToMonth / datedIpcTotal) : 0;
      } else {
        pointAc = AC * (pct / latestActual);
      }

      const remWork = Math.max(0, BAC - pointEv);
      const remFundsBac = BAC - pointAc;
      const remFundsEac = EAC - pointAc;
      const pointTcpiBac = isLast
        ? tcpiBac
        : remWork <= 0
        ? 0
        : remFundsBac > 0
        ? remWork / remFundsBac
        : null;
      const pointTcpiEac = isLast
        ? tcpiEac
        : remWork <= 0
        ? 0
        : remFundsEac > 0
        ? remWork / remFundsEac
        : null;
      const pointCpi = isLast ? CPI : pointAc > 0 ? pointEv / pointAc : 1.0;

      points.push({
        period: m.key,
        actualPct: pct,
        ev: pointEv,
        ac: pointAc,
        cpi: pointCpi,
        tcpiBac: pointTcpiBac,
        tcpiEac: pointTcpiEac,
        thresholdOne: 1.0,
        alertThreshold: tcpiAlertThreshold,
        isCurrent: isLast,
      });
    });

    return points;
  }, [project.monthly, project.ipcTracker, project.usdExchangeRate, project.kpiActiveMonth, BAC, AC, EV, EAC, CPI, tcpiBac, tcpiEac, evm.actualPct, tcpiAlertThreshold]);

  const yDomainMax = useMemo(() => {
    const vals: number[] = [1.2, tcpiAlertThreshold + 0.15];
    trajectoryData.forEach((pt) => {
      if (pt.tcpiBac !== null && pt.tcpiBac < 5) vals.push(pt.tcpiBac);
      if (showEacLine && pt.tcpiEac !== null && pt.tcpiEac < 5) vals.push(pt.tcpiEac);
      if (showCpiLine && pt.cpi < 5) vals.push(pt.cpi);
    });
    return Number(Math.min(3.5, Math.max(1.3, Math.max(...vals) * 1.1)).toFixed(2));
  }, [trajectoryData, tcpiAlertThreshold, showEacLine, showCpiLine]);

  const isAlertBreached = tcpiBac === null || tcpiBac > tcpiAlertThreshold;
  const requiresCorrection = tcpiBac === null || tcpiBac > 1.005;

  const renderTcpiDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || payload.tcpiBac === null) return null;
    const val = payload.tcpiBac;
    const fill =
      val > tcpiAlertThreshold ? '#dc2626' : val > 1.005 ? '#d97706' : '#16a34a';
    return (
      <circle
        key={`tcpi-dot-${payload.period}`}
        cx={cx}
        cy={cy}
        r={payload.isCurrent ? 5.5 : 4}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3.5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              TCPI Trajectory vs. 1.000 Efficiency Threshold
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks how required future cost efficiency (TCPI) evolves over reporting months relative to the 1.000 baseline and your custom alert ceiling ({tcpiAlertThreshold.toFixed(2)}).
            </p>
          </div>
        </div>

        {/* Series Visibility Controls */}
        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setShowEacLine(!showEacLine)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showEacLine
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            TCPI (EAC)
          </button>
          <button
            type="button"
            onClick={() => setShowCpiLine(!showCpiLine)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showCpiLine
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            Cumulative CPI
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          isAlertBreached
            ? 'bg-rose-50/80 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200'
            : requiresCorrection
            ? 'bg-amber-50/80 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          {isAlertBreached || requiresCorrection ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>
            {tcpiBac === null
              ? 'Correction Required: Original BAC budget is exhausted (TCPI exceeds ceiling).'
              : isAlertBreached
              ? `Alert Threshold Exceeded: Current TCPI (${tcpiBac.toFixed(3)}) exceeds configured limit (${tcpiAlertThreshold.toFixed(2)}). Cost correction required.`
              : requiresCorrection
              ? `Above Planned Efficiency: Current TCPI (${tcpiBac.toFixed(3)}) exceeds 1.000 baseline but stays below alert threshold (${tcpiAlertThreshold.toFixed(2)}).`
              : `Cost Efficiency Healthy: Current TCPI (${tcpiBac.toFixed(3)}) is at or below the 1.000 threshold.`}
          </span>
        </div>
        <div className="font-mono text-[11px] tabular-nums shrink-0">
          Target: 1.000 · Alert: &gt; {tcpiAlertThreshold.toFixed(2)}
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trajectoryData} margin={{ top: 14, right: 24, left: 4, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.45} />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              domain={[0, yDomainMax]}
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(val) => Number(val).toFixed(2)}
            />
            <RechartsTooltip
              content={
                <CustomTrajectoryTooltip
                  tcpiAlertThreshold={tcpiAlertThreshold}
                  formatBr={formatBr}
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {/* Subtle shaded alert zone above custom threshold */}
            {tcpiAlertThreshold < yDomainMax && (
              <ReferenceArea
                y1={tcpiAlertThreshold}
                y2={yDomainMax}
                fill="rgba(220, 38, 38, 0.08)"
              />
            )}

            {/* Reference Line: Project Efficiency Threshold = 1.0 */}
            <ReferenceLine
              y={1.0}
              stroke="#0f172a"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: 'Threshold 1.00',
                position: 'insideTopLeft',
                fill: '#475569',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            {/* Reference Line: User-defined Custom Alert Threshold */}
            {Math.abs(tcpiAlertThreshold - 1.0) > 0.005 && (
              <ReferenceLine
                y={tcpiAlertThreshold}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `Alert > ${tcpiAlertThreshold.toFixed(2)}`,
                  position: 'insideTopRight',
                  fill: '#dc2626',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="tcpiBac"
              name="TCPI Trajectory (to BAC)"
              stroke="#2563eb"
              strokeWidth={3}
              connectNulls={false}
              dot={renderTcpiDot}
              activeDot={{ r: 6.5 }}
            />

            {showEacLine && (
              <Line
                type="monotone"
                dataKey="tcpiEac"
                name="TCPI (to Active EAC)"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 3"
                connectNulls={false}
                dot={{ r: 3.5, fill: '#6366f1' }}
              />
            )}

            {showCpiLine && (
              <Line
                type="monotone"
                dataKey="cpi"
                name="Cumulative CPI"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#14b8a6' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

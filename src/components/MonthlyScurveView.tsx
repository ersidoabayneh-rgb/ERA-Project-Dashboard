import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus, Trash2, TrendingUp, Info, Activity, ArrowUpToLine, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Project, MonthlyProgress } from '../types';
import { 
  resolveCurrentMonthKey, 
  isSameMonth, 
  ensureLiveRowForActual, 
  insertMonthAboveLiveRow, 
  parseMonthKey, 
  MONTH_NAMES,
  getPreviousColumnValue,
  validateMonthlyCellUpdate,
  findActualsExceedingLive,
  clampActualsToLiveValue
} from '../lib/monthlySync';

interface MonthlyScurveViewProps {
  project: Project;
  onUpdateMonthly: (monthly: MonthlyProgress[]) => void;
}

export default function MonthlyScurveView({ project, onUpdateMonthly }: MonthlyScurveViewProps) {
  const currentMonthKey = resolveCurrentMonthKey(project);
  const [tableError, setTableError] = useState<string | null>(null);
  const [months, setMonths] = useState<MonthlyProgress[]>(() => {
    return ensureLiveRowForActual(project.monthly || [], currentMonthKey, project.physicalProgress);
  });

  React.useEffect(() => {
    const ensured = ensureLiveRowForActual(project.monthly || [], currentMonthKey, project.physicalProgress);
    setMonths(ensured);
  }, [project.id, project.monthly, currentMonthKey, project.physicalProgress]);

  // Check for any actuals in previous rows that exceed the live month's value
  const exceedingActuals = findActualsExceedingLive(months, currentMonthKey);

  const handleAdjustExceedingActuals = () => {
    const adjusted = clampActualsToLiveValue(months, currentMonthKey);
    const finalEnsured = ensureLiveRowForActual(adjusted, currentMonthKey);
    setMonths(finalEnsured);
    onUpdateMonthly(finalEnsured);
    setTableError(null);
  };

  // Auto-dismiss table error after 6 seconds
  React.useEffect(() => {
    if (tableError) {
      const timer = setTimeout(() => setTableError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [tableError]);

  const convertToInputMonthFormat = (monthStr: string): string => {
    try {
      const parts = monthStr.split('-');
      if (parts.length === 2) {
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = monthsList.indexOf(parts[0]);
        let year = parseInt(parts[1], 10);
        if (isNaN(year)) return '';
        if (year < 100) {
          year = year + 2000;
        }
        if (mIdx !== -1) {
          const monthNum = (mIdx + 1).toString().padStart(2, '0');
          return `${year}-${monthNum}`;
        }
      }
    } catch (e) {}
    return '';
  };

  const formatFromInputMonth = (inputVal: string): string => {
    try {
      const parts = inputVal.split('-');
      if (parts.length === 2) {
        const year = parts[0].slice(-2);
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (mIdx >= 0 && mIdx < 12) {
          return `${monthsList[mIdx]}-${year}`;
        }
      }
    } catch (e) {}
    return inputVal;
  };

  const handleFieldChange = (idx: number, field: keyof MonthlyProgress, value: any) => {
    const liveIdx = months.findIndex(m => isSameMonth(m.month, currentMonthKey));
    const isFutureRow = liveIdx !== -1 && idx > liveIdx;

    // Prevent entering actuals on future months
    if (field === 'actual' && isFutureRow) {
      return;
    }

    if (field !== 'month') {
      // If a previous row reached 100%, do not allow changes
      const isColDisabled = idx > 0 && months.slice(0, idx).some(m => {
        const val = m[field];
        return (val !== '' && val !== null && val !== undefined && !isNaN(Number(val)) && Number(val) >= 100);
      });
      if (isColDisabled) return;
    }

    let parsedVal: any = value;
    if (field !== 'month') {
      if (value === '' || value === null || value === undefined) {
        parsedVal = ''; // Leave it empty when user deletes/leaves blank - NEVER fill with zero
      } else {
        const num = parseFloat(value);
        if (isNaN(num)) {
          parsedVal = '';
        } else {
          parsedVal = Math.min(100, Math.max(0, num));
        }
      }
    }

    // Monotonic validation rule: Live month (and cumulative entries) must always be >= previous row in that column
    if (field !== 'month' && parsedVal !== '') {
      const validation = validateMonthlyCellUpdate(
        months,
        idx,
        field as 'originalPlan' | 'revisedPlan' | 'actual',
        parsedVal,
        currentMonthKey
      );

      if (!validation.isValid) {
        setTableError(validation.error || 'Value must be greater than or equal to the previous row.');
        return;
      }
    }

    setTableError(null);

    let updated = months.map((m, i) => {
      if (i === idx) {
        return {
          ...m,
          [field]: parsedVal
        };
      }
      return m;
    });

    // Ensure the live row always remains the last row for the Actual column only
    updated = ensureLiveRowForActual(
      updated, 
      currentMonthKey, 
      idx === liveIdx && field === 'actual' && parsedVal !== '' ? parsedVal : undefined
    );

    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleAddRow = () => {
    // Determine the reference row to calculate the next month name
    const liveIdx = months.findIndex(m => isSameMonth(m.month, currentMonthKey));
    let refRow: MonthlyProgress | null = null;

    if (liveIdx !== -1) {
      if (liveIdx > 0) {
        // Use the row directly before the live row as the reference
        refRow = months[liveIdx - 1];
      } else {
        refRow = months[liveIdx];
      }
    } else if (months.length > 0) {
      refRow = months[months.length - 1];
    }

    let nextName = 'New Month';
    if (refRow && refRow.month) {
      const parsed = parseMonthKey(refRow.month);
      if (parsed) {
        const nextMIdx = (parsed.monthIndex + 1) % 12;
        const nextYear = nextMIdx === 0 ? parsed.year + 1 : parsed.year;
        nextName = `${MONTH_NAMES[nextMIdx]}-${(nextYear % 100).toString().padStart(2, '0')}`;
      }
    }

    const newRow: MonthlyProgress = { month: nextName, originalPlan: '', revisedPlan: '', actual: '' };
    // Insert new row directly above the live row
    const updated = insertMonthAboveLiveRow(months, currentMonthKey, newRow);
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleAddFuturePlanRow = () => {
    // Add a future month row at the very end of the schedule (for Original/Revised Plan %)
    let nextName = 'New Month';
    if (months.length > 0 && months[months.length - 1]?.month) {
      const parsed = parseMonthKey(months[months.length - 1].month);
      if (parsed) {
        const nextMIdx = (parsed.monthIndex + 1) % 12;
        const nextYear = nextMIdx === 0 ? parsed.year + 1 : parsed.year;
        nextName = `${MONTH_NAMES[nextMIdx]}-${(nextYear % 100).toString().padStart(2, '0')}`;
      }
    }

    const newRow: MonthlyProgress = { month: nextName, originalPlan: '', revisedPlan: '', actual: '' };
    const updated = ensureLiveRowForActual([...months, newRow], currentMonthKey);
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleInsertAboveRow = (idx: number) => {
    let nextName = 'New Month';
    if (idx > 0 && months[idx - 1]?.month) {
      const parsed = parseMonthKey(months[idx - 1].month);
      if (parsed) {
        const nextMIdx = (parsed.monthIndex + 1) % 12;
        const nextYear = nextMIdx === 0 ? parsed.year + 1 : parsed.year;
        nextName = `${MONTH_NAMES[nextMIdx]}-${(nextYear % 100).toString().padStart(2, '0')}`;
      }
    } else if (months[idx]?.month) {
      const parsed = parseMonthKey(months[idx].month);
      if (parsed) {
        const prevMIdx = (parsed.monthIndex + 11) % 12;
        const prevYear = prevMIdx === 11 ? parsed.year - 1 : parsed.year;
        nextName = `${MONTH_NAMES[prevMIdx]}-${(prevYear % 100).toString().padStart(2, '0')}`;
      }
    }

    const newRow: MonthlyProgress = { month: nextName, originalPlan: '', revisedPlan: '', actual: '' };
    const copy = [...months];
    copy.splice(idx, 0, newRow);
    const updated = ensureLiveRowForActual(copy, currentMonthKey);
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleRemoveRow = () => {
    if (months.length === 0) return;
    const liveIdx = months.findIndex(m => isSameMonth(m.month, currentMonthKey));
    let updated: MonthlyProgress[];
    if (liveIdx !== -1 && liveIdx < months.length - 1) {
      // If there are future plan rows at the end, remove the last future plan row
      updated = months.slice(0, -1);
    } else if (liveIdx > 0) {
      // Remove the row immediately above the live row
      const copy = [...months];
      copy.splice(liveIdx - 1, 1);
      updated = copy;
    } else {
      updated = months.slice(0, -1);
    }
    const finalUpdated = ensureLiveRowForActual(updated, currentMonthKey);
    setMonths(finalUpdated);
    onUpdateMonthly(finalUpdated);
  };

  const handleDeleteRow = (idx: number) => {
    if (months.length <= 1) return;
    const copy = months.filter((_, i) => i !== idx);
    const updated = ensureLiveRowForActual(copy, currentMonthKey);
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  // Convert for Recharts presentation - STOP drawing the line once 100% is reached
  let origStop = false;
  let revStop = false;
  let actStop = false;

  const chartData = months.map((m, idx) => {
    // 1. Original Plan: Stop after reaching 100%
    let orig: number | null = null;
    if (!origStop) {
      const raw = m.originalPlan;
      if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
        const num = Number(raw);
        if (num >= 100) {
          orig = 100;
          origStop = true; // Stop drawing subsequent points
        } else if (num >= 0) {
          orig = num;
        }
      }
    }

    // 2. Revised Plan: Stop after reaching 100%
    let rev: number | null = null;
    if (!revStop) {
      const raw = m.revisedPlan;
      if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
        const num = Number(raw);
        if (num >= 100) {
          rev = 100;
          revStop = true; // Stop drawing subsequent points
        } else if (num >= 0) {
          rev = num;
        }
      }
    }

    // 3. To-Date Actual: Stop after reaching 100%
    let act: number | null = null;
    if (!actStop) {
      const raw = m.actual;
      if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
        const num = Number(raw);
        if (num >= 100) {
          act = 100;
          actStop = true; // Stop drawing subsequent points
        } else if (num > 0 || (idx === 0 && num === 0)) {
          act = num;
        }
      }
    }

    return {
      name: m.month,
      'Original Plan (%)': orig,
      'Revised Plan (%)': rev,
      'To-Date Actual (%)': act
    };
  });

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-500" />
            S‑Curve Analysis (Monthly Cumulative %)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Any month added to the cumulative table is placed above the live row. The last row with an Actual value is always the live row; Plan columns can extend into future months.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={handleAddRow}
            title="Add a month row directly above the live tracking row"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Month Above Live
          </button>
          <button
            onClick={handleAddFuturePlanRow}
            title="Add a future planning month at the end of the schedule (for Original & Revised Plan %)"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Future Plan Month
          </button>
          <button
            onClick={handleRemoveRow}
            title="Remove month row"
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200/60 dark:border-rose-900/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Month
          </button>
        </div>
      </div>

      {/* S-Curve Interactive Graph Visualization Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">Cumulative S-Curve Performance Preview</span>
            <span className="text-[10px] text-slate-400">Live physical progress trajectory (lines terminate immediately upon reaching 100%)</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-500 font-medium text-[11px]">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block border-b border-dashed border-amber-500" /> Original Plan
            </span>
            <span className="flex items-center gap-1 text-blue-500 font-medium text-[11px]">
              <span className="w-2.5 h-0.5 bg-blue-500 inline-block border-b border-dashed border-blue-500" /> Revised Plan
            </span>
            <span className="flex items-center gap-1 text-emerald-500 font-medium text-[11px]">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> To-Date Actual
            </span>
          </div>
        </div>

        <div className="h-72 w-full min-w-0">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center p-6 space-y-2">
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-60" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Monthly Baseline Curve Points Defined</p>
              <p className="text-[11px] text-slate-500 max-w-sm">Monthly physical progress targets will populate here automatically once entered below.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" width={45} domain={[0, 100]} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [val !== null && val !== undefined ? `${Number(val).toFixed(2)}%` : 'N/A']}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                <Line 
                  name="Original Plan (%)"
                  type="monotone" 
                  dataKey="Original Plan (%)" 
                  stroke="#f59e0b" 
                  strokeDasharray="5 5"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                />
                <Line 
                  name="Revised Plan (%)"
                  type="monotone" 
                  dataKey="Revised Plan (%)" 
                  stroke="#2563eb" 
                  strokeDasharray="3 3"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 2, fill: '#2563eb' }}
                />
                <Line 
                  name="To-Date Actual (%)"
                  type="monotone" 
                  dataKey="To-Date Actual (%)" 
                  stroke="#10b981" 
                  strokeWidth={3.5} 
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alert notification when any preceding actual value exceeds the live value */}
      {exceedingActuals.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-800 dark:text-rose-200 uppercase tracking-wide mb-0.5">
                Actual Progress Exceeds Live Month — Adjustment Required
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {exceedingActuals.map(item => (
                  <span key={item.rowIndex} className="inline-block mr-3">
                    • <strong>{item.month}</strong> Actual is <strong>{item.actualValue}%</strong>, which is greater than the live month (<strong>{item.liveMonth}</strong>, <strong>{item.liveActualValue}%</strong>).
                  </span>
                ))}
                In cumulative S-Curve tracking, historical progress cannot exceed the live tracking month. Please adjust the highlighted cell(s) or auto-clamp to the live value.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdjustExceedingActuals}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer self-start md:self-center"
            title={`Clamp all preceding actuals exceeding ${exceedingActuals[0]?.liveActualValue}%`}
          >
            <Activity className="w-3.5 h-3.5" />
            Auto-Adjust Cells to Live Value ({exceedingActuals[0]?.liveActualValue}%)
          </button>
        </motion.div>
      )}

      {/* Validation Error Alert Banner */}
      {tableError && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-4 rounded-2xl flex items-start justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-0.5">
                Cumulative Progression Rule
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {tableError}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setTableError(null)}
            className="p-1 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Raw spreadsheet fields table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-96 md:max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold sticky top-0 z-10">
                <th className="p-3 w-16 text-center">Row</th>
                <th className="p-3 md:w-80">Month-Year (Text & Calendar Picker)</th>
                <th className="p-3 w-32 text-center">Original Plan %</th>
                <th className="p-3 w-32 text-center">Revised Plan %</th>
                <th className="p-3 w-32 text-center">Actual %</th>
                <th className="p-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
              {months.map((m, idx) => {
                const liveIdx = months.findIndex(item => isSameMonth(item.month, currentMonthKey));
                const isCurrentMonthRow = isSameMonth(m.month, currentMonthKey);
                const isFutureRow = liveIdx !== -1 && idx > liveIdx;

                const isExceedingLive = exceedingActuals.some(item => item.rowIndex === idx);
                const exceedingItem = exceedingActuals.find(item => item.rowIndex === idx);

                const prevOrig = getPreviousColumnValue(months, idx, 'originalPlan');
                const prevRev = getPreviousColumnValue(months, idx, 'revisedPlan');
                const prevAct = getPreviousColumnValue(months, idx, 'actual');

                const isOrigDisabled = idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.originalPlan;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                });
                const isRevDisabled = idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.revisedPlan;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                });
                const isActDisabled = isFutureRow || (idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.actual;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                }));

                return (
                  <tr 
                    key={idx} 
                    className={`border-b transition-colors ${
                      isCurrentMonthRow 
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40' 
                        : isFutureRow
                        ? 'bg-slate-50/30 dark:bg-slate-900/5 hover:bg-slate-50/60 border-slate-100 dark:border-slate-800'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{idx + 1}</span>
                        {isCurrentMonthRow ? (
                          <span className="text-[8px] bg-blue-500 text-white font-bold px-1 py-0.2 rounded leading-tight" title="Live tracking month (Last row for Actual progress)">
                            LIVE
                          </span>
                        ) : isFutureRow ? (
                          <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium px-1 py-0.2 rounded leading-tight" title="Future schedule plan month">
                            PLAN
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Text editing field */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={m.month || ''}
                            onChange={(e) => handleFieldChange(idx, 'month', e.target.value)}
                            className={`w-full bg-slate-50 dark:bg-slate-900/60 border text-xs text-slate-850 dark:text-zinc-50 pl-2.5 pr-8 py-1 rounded-lg outline-none focus:ring-2 transition-all duration-150 h-8 ${
                              isCurrentMonthRow 
                                ? 'border-blue-300 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500/20 font-bold' 
                                : 'border-slate-350 dark:border-slate-755 focus:border-blue-500 focus:ring-blue-500/20'
                            }`}
                            placeholder="Dec-20"
                            title="Format: Month-Year (e.g., Dec-20)"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <CalendarRange className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Calendar Dropdown / Picker */}
                        <div className="flex items-center gap-1">
                          {/* Desktop wide calendar picker displaying month with a dropdown arrow */}
                          <div className="relative hidden md:flex items-center">
                            <input
                              type="month"
                              value={convertToInputMonthFormat(m.month || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const formatted = formatFromInputMonth(val);
                                  handleFieldChange(idx, 'month', formatted);
                                }
                              }}
                              className="w-40 h-8 px-2 pl-8 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/65 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 text-blue-700 dark:text-blue-300 font-medium text-xs transition-all relative z-10"
                              title="Choose month/year from calendar dropdown"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 pointer-events-none z-20">
                              <CalendarRange className="w-4 h-4" />
                            </div>
                            {/* Dropdown caret/indicator indicating it's a calendar dropdown */}
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-blue-400 z-20">
                              <span className="text-[10px]">▼</span>
                            </div>
                          </div>

                          {/* Mobile compact calendar picker */}
                          <div className="relative block md:hidden">
                            <input
                              type="month"
                              value={convertToInputMonthFormat(m.month || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const formatted = formatFromInputMonth(val);
                                  handleFieldChange(idx, 'month', formatted);
                                }
                              }}
                              className="w-9 h-8 p-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/65 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 text-center text-blue-600 dark:text-blue-400 font-bold text-xs"
                              title="Choose month/year from calendar"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        min={prevOrig.prevValue !== null ? prevOrig.prevValue : 0}
                        max={100}
                        value={m.originalPlan === null || m.originalPlan === undefined ? '' : m.originalPlan}
                        disabled={isOrigDisabled}
                        onChange={(e) => handleFieldChange(idx, 'originalPlan', e.target.value)}
                        placeholder={isOrigDisabled ? '-' : prevOrig.prevValue !== null && isCurrentMonthRow ? `≥${prevOrig.prevValue}%` : ''}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isOrigDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={
                          isOrigDisabled 
                            ? "Column locked: a previous row reached 100%" 
                            : prevOrig.prevValue !== null 
                            ? isCurrentMonthRow 
                              ? `Live Month Original Plan: Must be ≥ ${prevOrig.prevValue}% (${prevOrig.prevMonth})` 
                              : `Must be ≥ ${prevOrig.prevValue}% (${prevOrig.prevMonth})` 
                            : "Original cumulative plan %"
                        }
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        min={prevRev.prevValue !== null ? prevRev.prevValue : 0}
                        max={100}
                        value={m.revisedPlan === null || m.revisedPlan === undefined ? '' : m.revisedPlan}
                        disabled={isRevDisabled}
                        onChange={(e) => handleFieldChange(idx, 'revisedPlan', e.target.value)}
                        placeholder={isRevDisabled ? '-' : prevRev.prevValue !== null && isCurrentMonthRow ? `≥${prevRev.prevValue}%` : ''}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isRevDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={
                          isRevDisabled 
                            ? "Column locked: a previous row reached 100%" 
                            : prevRev.prevValue !== null 
                            ? isCurrentMonthRow 
                              ? `Live Month Revised Plan: Must be ≥ ${prevRev.prevValue}% (${prevRev.prevMonth})` 
                              : `Must be ≥ ${prevRev.prevValue}% (${prevRev.prevMonth})` 
                            : "Revised cumulative plan %"
                        }
                      />
                    </td>
                    <td className="p-3">
                      {isFutureRow ? (
                        <div 
                          className="w-full text-center font-mono text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 select-none h-7 flex items-center justify-center cursor-not-allowed"
                          title="Actual progress is only recorded up to the current live tracking month"
                        >
                          —
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center">
                          <input
                            type="number"
                            step="0.01"
                            min={prevAct.prevValue !== null ? prevAct.prevValue : 0}
                            max={100}
                            value={m.actual === null || m.actual === undefined ? '' : m.actual}
                            disabled={isActDisabled}
                            onChange={(e) => handleFieldChange(idx, 'actual', e.target.value)}
                            placeholder={isActDisabled ? '-' : prevAct.prevValue !== null && isCurrentMonthRow ? `≥${prevAct.prevValue}%` : ''}
                            className={`w-full text-center font-mono font-black text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                              isExceedingLive
                                ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 dark:border-rose-400 text-rose-700 dark:text-rose-200 ring-2 ring-rose-400/40 focus:ring-rose-500 shadow-sm animate-pulse'
                                : isActDisabled 
                                ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                                : isCurrentMonthRow
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-blue-700 dark:text-blue-300 font-extrabold'
                                : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-blue-600 dark:text-blue-400'
                            }`}
                            title={
                              isExceedingLive && exceedingItem
                                ? `⚠️ ADJUSTMENT REQUIRED: Actual progress (${m.actual}%) is greater than the live month progress (${exceedingItem.liveActualValue}% in ${exceedingItem.liveMonth}). Please adjust this cell to be ≤ ${exceedingItem.liveActualValue}%.`
                                : isActDisabled 
                                ? "Column locked: a previous row reached 100%" 
                                : isCurrentMonthRow 
                                ? prevAct.prevValue !== null 
                                  ? `Live project actual progress: Must be ≥ ${prevAct.prevValue}% (${prevAct.prevMonth})` 
                                  : "Live project actual progress"
                                : prevAct.prevValue !== null
                                ? `Must be ≥ ${prevAct.prevValue}% (${prevAct.prevMonth})`
                                : "Actual cumulative progress %"
                            }
                          />
                          {isExceedingLive && exceedingItem && (
                            <button
                              type="button"
                              onClick={() => handleFieldChange(idx, 'actual', exceedingItem.liveActualValue)}
                              className="flex items-center justify-center gap-1 text-[9px] font-black text-rose-600 dark:text-rose-400 mt-1 cursor-pointer hover:underline whitespace-nowrap bg-rose-100/80 dark:bg-rose-900/50 px-1.5 py-0.5 rounded"
                              title={`Click to auto-clamp this cell to live value (${exceedingItem.liveActualValue}%)`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                              <span>Exceeds Live ({exceedingItem.liveActualValue}%)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleInsertAboveRow(idx)}
                          title="Insert a new month above this row"
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md transition cursor-pointer"
                        >
                          <ArrowUpToLine className="w-3.5 h-3.5" />
                        </button>
                        {!isCurrentMonthRow ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete this month row"
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 dark:text-rose-400 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded" title="Live row is the active tracking period for Actual progress">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

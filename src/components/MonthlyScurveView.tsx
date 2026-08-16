import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus, Trash2, TrendingUp, Info, Activity } from 'lucide-react';
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

interface MonthlyScurveViewProps {
  project: Project;
  onUpdateMonthly: (monthly: MonthlyProgress[]) => void;
}

export default function MonthlyScurveView({ project, onUpdateMonthly }: MonthlyScurveViewProps) {
  const [months, setMonths] = useState<MonthlyProgress[]>(project.monthly || []);

  React.useEffect(() => {
    setMonths(project.monthly || []);
  }, [project.id]);

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

    const updated = months.map((m, i) => {
      if (i === idx) {
        return {
          ...m,
          [field]: parsedVal
        };
      }
      return m;
    });

    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleAddRow = () => {
    // deduce a default name for the next month
    let nextName = 'New Month';
    if (months.length > 0) {
      const last = months[months.length - 1].month;
      const parts = last.split('-');
      if (parts.length === 2) {
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = monthsList.indexOf(parts[0]);
        let year = parseInt(parts[1], 10);
        if (mIdx !== -1) {
          const nextMIdx = (mIdx + 1) % 12;
          if (nextMIdx === 0) year += 1;
          nextName = `${monthsList[nextMIdx]}-${year.toString().slice(-2)}`;
        }
      }
    }

    // Do NOT fill with zero - leave fields empty
    const updated = [...months, { month: nextName, originalPlan: '', revisedPlan: '', actual: '' }];
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleRemoveRow = () => {
    if (months.length > 0) {
      const updated = months.slice(0, -1);
      setMonths(updated);
      onUpdateMonthly(updated);
    }
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
            Enter monthly cumulative targets. Graphs automatically stop plotting once a series reaches 100%. Unentered cells remain clean and empty.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={handleAddRow}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Month
          </button>
          <button
            onClick={handleRemoveRow}
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
                  activeDot={{ r: 5, fill: '#2563eb' }}
                />
                <Line 
                  name="To-Date Actual (%)"
                  type="monotone" 
                  dataKey="To-Date Actual (%)" 
                  stroke="#10b981" 
                  strokeWidth={3.5} 
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
              {months.map((m, idx) => {
                const isOrigDisabled = idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.originalPlan;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                });
                const isRevDisabled = idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.revisedPlan;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                });
                const isActDisabled = idx > 0 && months.slice(0, idx).some(prev => {
                  const v = prev.actual;
                  return (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 100);
                });

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Text editing field */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={m.month || ''}
                            onChange={(e) => handleFieldChange(idx, 'month', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-xs text-slate-850 dark:text-zinc-50 pl-2.5 pr-8 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-8"
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
                        value={m.originalPlan === null || m.originalPlan === undefined ? '' : m.originalPlan}
                        disabled={isOrigDisabled}
                        onChange={(e) => handleFieldChange(idx, 'originalPlan', e.target.value)}
                        placeholder={isOrigDisabled ? '-' : ''}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isOrigDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={isOrigDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={m.revisedPlan === null || m.revisedPlan === undefined ? '' : m.revisedPlan}
                        disabled={isRevDisabled}
                        onChange={(e) => handleFieldChange(idx, 'revisedPlan', e.target.value)}
                        placeholder={isRevDisabled ? '-' : ''}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isRevDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={isRevDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={m.actual === null || m.actual === undefined ? '' : m.actual}
                        disabled={isActDisabled}
                        onChange={(e) => handleFieldChange(idx, 'actual', e.target.value)}
                        placeholder={isActDisabled ? '-' : ''}
                        className={`w-full text-center font-mono font-black text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isActDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-blue-600 dark:text-blue-400'
                        }`}
                        title={isActDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
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

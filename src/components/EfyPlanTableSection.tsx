import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, DownloadCloud, Link2, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { EfyAnnualLayerPlan, Project } from '../types';
import {
  buildEfyPlansFromProgressPlan,
  createEmpty12,
  normalize12,
  normalizeEfyYearPlan,
  resolveEfySlot
} from '../lib/efyPlanSync';

const EFY_MONTH_SHORT = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

type EfyPlanFieldKey =
  | 'physicalContractorPlan'
  | 'physicalEraPlan'
  | 'subBasePlan'
  | 'subBaseActual'
  | 'baseCoursePlan'
  | 'baseCourseActual'
  | 'asphaltPlan'
  | 'asphaltActual';

interface EfyPlanBlockConfig {
  id: string;
  titleSuffix: string;
  rows: Array<{
    field: EfyPlanFieldKey;
    label: string;
  }>;
}

const EFY_PLAN_BLOCKS: EfyPlanBlockConfig[] = [
  {
    id: 'physical',
    titleSuffix: 'EFY Physical Plan',
    rows: [
      { field: 'physicalContractorPlan', label: 'Contractor Plan (Km)' },
      { field: 'physicalEraPlan', label: 'ERA Plan (Km)' }
    ]
  },
  {
    id: 'subbase',
    titleSuffix: 'EFY Sub Base PLAN',
    rows: [
      { field: 'subBasePlan', label: 'Plan (Km)' },
      { field: 'subBaseActual', label: 'Actual (Km)' }
    ]
  },
  {
    id: 'basecourse',
    titleSuffix: 'EFY Base Course PLAN',
    rows: [
      { field: 'baseCoursePlan', label: 'Plan (Km)' },
      { field: 'baseCourseActual', label: 'Actual (Km)' }
    ]
  },
  {
    id: 'asphalt',
    titleSuffix: 'EFY Asphalt PLAN',
    rows: [
      { field: 'asphaltPlan', label: 'Plan (Km)' },
      { field: 'asphaltActual', label: 'Actual (Km)' }
    ]
  }
];

function createEmptyEfyPlan(efyYear: string): EfyAnnualLayerPlan {
  return {
    efyYear,
    physicalContractorPlan: createEmpty12(),
    physicalEraPlan: createEmpty12(),
    subBasePlan: createEmpty12(),
    subBaseActual: createEmpty12(),
    baseCoursePlan: createEmpty12(),
    baseCourseActual: createEmpty12(),
    asphaltPlan: createEmpty12(),
    asphaltActual: createEmpty12()
  };
}

function normalizeEfyPlan(efyYear: string, raw?: Partial<EfyAnnualLayerPlan>): EfyAnnualLayerPlan {
  return normalizeEfyYearPlan(efyYear, raw);
}

export function getEfyMonthHeaders(efyYearStr: string): string[] {
  const efyNum = parseInt(efyYearStr, 10);
  if (isNaN(efyNum)) {
    return EFY_MONTH_SHORT;
  }
  const startGregorianYear = efyNum + 7; // e.g., 2017 EFY -> Jul-24..Dec-24, Jan-25..Jun-25
  const yyStart = String(startGregorianYear % 100).padStart(2, '0');
  const yyEnd = String((startGregorianYear + 1) % 100).padStart(2, '0');
  return EFY_MONTH_SHORT.map((m, idx) => `${m}-${idx < 6 ? yyStart : yyEnd}`);
}

function resolveInitialEfyYear(project: Project): string {
  const existingKeys = Object.keys(project.efyPlans || {}).filter(k => /^\d{4}$/.test(k));
  if (existingKeys.length > 0) {
    return existingKeys.sort((a, b) => Number(b) - Number(a))[0];
  }
  const labelMatch = (project.progressPlanLabels?.efyLabel || '').match(/(\d{4})/);
  if (labelMatch) {
    return labelMatch[1];
  }
  const now = new Date();
  const gYear = now.getFullYear();
  const gMonth = now.getMonth(); // 0-11 (Jul = 6)
  // Jul-Dec of 2024 falls in 2017 EFY (gYear - 7); Jan-Jun of 2025 falls in 2017 EFY (gYear - 8)
  const currentEfy = gMonth >= 6 ? gYear - 7 : gYear - 8;
  return String(currentEfy);
}

interface EfyCellInputProps {
  value: number | null;
  disabled?: boolean;
  ariaLabel: string;
  onCommit: (nextVal: number | null) => void;
}

const EfyCellInput: React.FC<EfyCellInputProps> = ({ value, disabled, ariaLabel, onCommit }) => {
  const formatVal = (v: number | null) => (v === null || v === undefined ? '' : String(v));
  const [text, setText] = useState<string>(() => formatVal(value));
  const [focused, setFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!focused) {
      setText(formatVal(value));
    }
  }, [value, focused]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setText(formatVal(value));
      return;
    }
    const rounded = Math.round(parsed * 1000) / 1000;
    onCommit(rounded);
  };

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      disabled={disabled}
      value={text}
      aria-label={ariaLabel}
      onFocus={e => {
        setFocused(true);
        e.target.select();
      }}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setText(formatVal(value));
          setFocused(false);
          e.currentTarget.blur();
        }
      }}
      className="w-full h-7 px-1 text-center text-[11px] font-mono tabular-nums bg-transparent text-slate-900 dark:text-slate-100 outline-none focus:bg-blue-50/70 dark:focus:bg-blue-950/40 disabled:opacity-60"
    />
  );
};

interface EfyPlanTableSectionProps {
  project: Project;
  isReadonly?: boolean;
  onSaveEfyPlans?: (efyPlans: Record<string, EfyAnnualLayerPlan>, actionDesc: string) => void;
}

export const EfyPlanTableSection: React.FC<EfyPlanTableSectionProps> = ({
  project,
  isReadonly = false,
  onSaveEfyPlans
}) => {
  const [selectedEfyYear, setSelectedEfyYear] = useState<string>(() => resolveInitialEfyYear(project));
  const [showAddYear, setShowAddYear] = useState<boolean>(false);
  const [customYearInput, setCustomYearInput] = useState<string>('');
  const [confirmClearYear, setConfirmClearYear] = useState<boolean>(false);

  useEffect(() => {
    setSelectedEfyYear(resolveInitialEfyYear(project));
    setConfirmClearYear(false);
  }, [project.id]);

  const activeProgressSlot = useMemo(
    () => resolveEfySlot(project.progressPlanLabels?.monthLabel, project.progressPlanLabels?.efyLabel),
    [project.progressPlanLabels?.monthLabel, project.progressPlanLabels?.efyLabel]
  );

  const availableYears = useMemo(() => {
    const defaults = ['2015', '2016', '2017', '2018', '2019', '2020', '2021'];
    const existing = Object.keys(project.efyPlans || {}).filter(k => /^\d{4}$/.test(k));
    const merged = Array.from(new Set([...defaults, ...existing, selectedEfyYear, activeProgressSlot.efyYear]));
    return merged.sort((a, b) => Number(a) - Number(b));
  }, [project.efyPlans, selectedEfyYear, activeProgressSlot.efyYear]);

  const activePlan = useMemo(
    () => normalizeEfyPlan(selectedEfyYear, project.efyPlans?.[selectedEfyYear]),
    [project.efyPlans, selectedEfyYear]
  );

  const monthHeaders = useMemo(
    () => getEfyMonthHeaders(selectedEfyYear),
    [selectedEfyYear]
  );

  const handlePullFromProgressComparisons = () => {
    if (isReadonly || !onSaveEfyPlans) return;
    const activeMonthLabel = project.progressPlanLabels?.monthLabel || activeProgressSlot.gregorianMonthLabel;
    const activeEfyLabel = project.progressPlanLabels?.efyLabel || `EFY ${activeProgressSlot.efyYear}`;
    const contractorMonth = Number(project.progressPlan?.contractor?.month ?? 0);
    const eraMonth = Number(project.progressPlan?.era?.month ?? 0);
    const { nextEfyPlans, slot } = buildEfyPlansFromProgressPlan(
      project.efyPlans,
      activeMonthLabel,
      activeEfyLabel,
      contractorMonth,
      eraMonth
    );
    setSelectedEfyYear(slot.efyYear);
    onSaveEfyPlans(
      nextEfyPlans,
      `Synced ${slot.efyYear} EFY Physical Plan (${slot.gregorianMonthLabel}) from Progress Comparisons`
    );
  };

  const handleCellCommit = (field: EfyPlanFieldKey, monthIdx: number, nextVal: number | null) => {
    if (isReadonly || !onSaveEfyPlans) return;
    const currentArr = normalize12(activePlan[field]);
    if (currentArr[monthIdx] === nextVal) return;

    const updatedArr = [...currentArr];
    updatedArr[monthIdx] = nextVal;

    const updatedYearPlan: EfyAnnualLayerPlan = {
      ...activePlan,
      [field]: updatedArr,
      updatedAt: new Date().toISOString()
    };

    const nextPlans: Record<string, EfyAnnualLayerPlan> = {
      ...(project.efyPlans || {}),
      [selectedEfyYear]: updatedYearPlan
    };

    onSaveEfyPlans(
      nextPlans,
      `Updated ${selectedEfyYear} EFY Plan (${field}, ${monthHeaders[monthIdx]})`
    );
  };

  const handleClearYear = () => {
    if (isReadonly || !onSaveEfyPlans) return;
    const nextPlans: Record<string, EfyAnnualLayerPlan> = {
      ...(project.efyPlans || {}),
      [selectedEfyYear]: {
        ...createEmptyEfyPlan(selectedEfyYear),
        updatedAt: new Date().toISOString()
      }
    };
    onSaveEfyPlans(nextPlans, `Cleared ${selectedEfyYear} EFY Plan entries`);
    setConfirmClearYear(false);
  };

  const handleAddYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customYearInput.trim().replace(/[^0-9]/g, '');
    if (cleaned.length !== 4) return;
    setSelectedEfyYear(cleaned);
    setCustomYearInput('');
    setShowAddYear(false);
    setConfirmClearYear(false);
  };

  const handleExportCsv = () => {
    const headerCols = ['Category / Row', ...monthHeaders, 'Total (Km)'];
    const lines: string[] = [headerCols.join(',')];

    EFY_PLAN_BLOCKS.forEach(block => {
      lines.push(`"${selectedEfyYear} ${block.titleSuffix}",${monthHeaders.map(() => '').join(',')},`);
      block.rows.forEach(r => {
        const vals = activePlan[r.field];
        const sum = vals.reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
        const cells = vals.map(v => (typeof v === 'number' ? String(v) : ''));
        lines.push(`"${r.label}",${cells.join(',')},${sum.toFixed(2)}`);
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeProj = (project.name || 'Project').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
    a.download = `${safeProj}_${selectedEfyYear}_EFY_Plan.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasAnyValueInYear = useMemo(() => {
    return EFY_PLAN_BLOCKS.some(b =>
      b.rows.some(r => activePlan[r.field].some(v => typeof v === 'number'))
    );
  }, [activePlan]);

  return (
    <section
      aria-label="EFY Annual Plan Table"
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Card Header */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarRange className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {selectedEfyYear} EFY Plan &amp; Pavement Progress Schedule (Km)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>
                Record monthly Contractor/ERA Physical Plan and Sub Base, Base Course, and Asphalt Plan vs. Actual in Km ({monthHeaders[0]} – {monthHeaders[11]}).
              </span>
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <Link2 className="w-3 h-3 shrink-0" />
                <span>
                  Auto-linked to Progress Comparisons ({project.progressPlanLabels?.monthLabel || activeProgressSlot.gregorianMonthLabel} · {activeProgressSlot.efyYear} EFY)
                </span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>EFY Year:</span>
            <select
              value={selectedEfyYear}
              onChange={e => {
                setSelectedEfyYear(e.target.value);
                setConfirmClearYear(false);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
              aria-label="Select Ethiopian Fiscal Year"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr} EFY
                </option>
              ))}
            </select>
          </label>

          {showAddYear ? (
            <form onSubmit={handleAddYearSubmit} className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={customYearInput}
                onChange={e => setCustomYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 2023"
                className="w-20 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500"
                aria-label="Enter 4-digit EFY year"
              />
              <button
                type="submit"
                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddYear(false);
                  setCustomYearInput('');
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddYear(true)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>EFY Year</span>
            </button>
          )}

          {!isReadonly && onSaveEfyPlans && (
            <button
              type="button"
              onClick={handlePullFromProgressComparisons}
              className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              title={`Import Contractor (${(project.progressPlan?.contractor?.month ?? 0).toFixed(2)} Km) & ERA (${(project.progressPlan?.era?.month ?? 0).toFixed(2)} Km) for ${project.progressPlanLabels?.monthLabel || activeProgressSlot.gregorianMonthLabel} into ${activeProgressSlot.efyYear} EFY Plan`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Pull Active Month ({activeProgressSlot.gregorianMonthLabel})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title={`Export ${selectedEfyYear} EFY Plan as CSV`}
          >
            <DownloadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {!isReadonly && hasAnyValueInYear && (
            confirmClearYear ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearYear}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearYear(false)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearYear(true)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                title={`Clear all entries for ${selectedEfyYear} EFY`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear {selectedEfyYear}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 4 Stacked EFY Plan Tables matching reference format */}
      <div className="p-3.5 space-y-4 overflow-x-auto">
        {EFY_PLAN_BLOCKS.map(block => (
          <div key={block.id} className="min-w-[880px]">
            <table className="w-full border-collapse text-xs text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/70">
                  <th
                    rowSpan={2}
                    className="w-44 min-w-[165px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    aria-label={`${selectedEfyYear} ${block.titleSuffix} row labels`}
                  />
                  <th
                    colSpan={12}
                    className="py-1.5 px-2 text-center font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
                  >
                    {selectedEfyYear} {block.titleSuffix}
                  </th>
                  <th
                    rowSpan={2}
                    className="w-20 min-w-[76px] py-1 px-2 text-center font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70"
                  >
                    Total (Km)
                  </th>
                </tr>
                <tr className="bg-white dark:bg-slate-800/90">
                  {monthHeaders.map(mLabel => (
                    <th
                      key={`${block.id}-${mLabel}`}
                      className="py-1 px-1 text-center font-medium text-[11px] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 w-[5.5%] min-w-[54px] tabular-nums"
                    >
                      {mLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map(row => {
                  const rowValues = activePlan[row.field];
                  const hasValues = rowValues.some(v => typeof v === 'number');
                  const rowTotal = rowValues.reduce<number>(
                    (sum, v) => sum + (typeof v === 'number' ? v : 0),
                    0
                  );
                  return (
                    <tr
                      key={`${block.id}-${row.field}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <th
                        scope="row"
                        className="py-1 px-2.5 text-left font-medium text-[11px] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 whitespace-nowrap"
                      >
                        {row.label}
                      </th>
                      {monthHeaders.map((mLabel, mIdx) => {
                        const isLinkedCell =
                          block.id === 'physical' &&
                          selectedEfyYear === activeProgressSlot.efyYear &&
                          mIdx === activeProgressSlot.monthIndex;
                        return (
                          <td
                            key={`${block.id}-${row.field}-${mIdx}`}
                            className={`p-0 border border-slate-300 dark:border-slate-700 ${
                              isLinkedCell
                                ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-inset ring-blue-400/70 dark:ring-blue-600/70'
                                : ''
                            }`}
                            title={
                              isLinkedCell
                                ? `Linked with Progress Comparisons Monthly Status Report (${project.progressPlanLabels?.monthLabel || mLabel})`
                                : undefined
                            }
                          >
                            <EfyCellInput
                              value={rowValues[mIdx] ?? null}
                              disabled={isReadonly}
                              ariaLabel={`${selectedEfyYear} ${block.titleSuffix} - ${row.label} - ${mLabel}`}
                              onCommit={val => handleCellCommit(row.field, mIdx, val)}
                            />
                          </td>
                        );
                      })}
                      <td className="py-1 px-2 text-right font-mono font-semibold text-[11px] tabular-nums text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                        {hasValues ? rowTotal.toFixed(2) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
};

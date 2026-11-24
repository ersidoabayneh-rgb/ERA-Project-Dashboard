import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Printer,
  Layers,
  CheckCircle2,
  Filter,
  Search,
  X,
  RotateCcw
} from 'lucide-react';
import { DailyActivityRecord, Project, User } from '../types';
import {
  ACTIVITY_CATEGORIES,
  ActivityCategoryId,
  computeDailyActivitySummary,
  computeMonthlyActivitySummary,
  computeUnitTotals,
  downloadMonthlyActivitiesSummaryPdf,
  formatQtyNumber,
  SummarySectionDef
} from '../lib/monthlyActivitiesPdfGenerator';

interface DailyActivitiesSummaryDashboardProps {
  project: Project;
  activities: DailyActivityRecord[];
  selectedDate: string;
  sections: SummarySectionDef[];
  getDefaultUnit: (sectionId: string) => string;
  currentUserObj?: User | null;
}

type DashboardMode = 'daily' | 'monthly';

export const DailyActivitiesSummaryDashboard: React.FC<DailyActivitiesSummaryDashboardProps> = ({
  project,
  activities,
  selectedDate,
  sections,
  getDefaultUnit,
  currentUserObj
}) => {
  const [mode, setMode] = useState<DashboardMode>('daily');
  const [targetMonth, setTargetMonth] = useState<string>(() =>
    selectedDate && selectedDate.length >= 7 ? selectedDate.slice(0, 7) : new Date().toISOString().slice(0, 7)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategoryId>('all');
  const [showAllSections, setShowAllSections] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate && selectedDate.length >= 7) {
      setTargetMonth(selectedDate.slice(0, 7));
    }
  }, [selectedDate]);

  const dailySummary = useMemo(
    () => computeDailyActivitySummary(activities, selectedDate, sections, getDefaultUnit),
    [activities, selectedDate, sections, getDefaultUnit]
  );

  const projectWithLiveActivities = useMemo<Project>(
    () => ({
      ...project,
      dailyActivities: activities
    }),
    [project, activities]
  );

  const monthlySummary = useMemo(
    () => computeMonthlyActivitySummary(projectWithLiveActivities, targetMonth, sections, getDefaultUnit),
    [projectWithLiveActivities, targetMonth, sections, getDefaultUnit]
  );

  const activeRows = mode === 'daily' ? dailySummary.rows : monthlySummary.rows;

  const availableCategories = useMemo(() => {
    const presentIds = new Set(activeRows.map(r => r.categoryId));
    return ACTIVITY_CATEGORIES.filter(cat => cat.id === 'all' || presentIds.has(cat.id));
  }, [activeRows]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeRows.length };
    activeRows.forEach(r => {
      counts[r.categoryId] = (counts[r.categoryId] || 0) + 1;
    });
    return counts;
  }, [activeRows]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const isFilterActive = normalizedSearch.length > 0 || selectedCategory !== 'all';

  const matchedBySearchAndCategory = useMemo(() => {
    return activeRows.filter(r => {
      if (selectedCategory !== 'all' && r.categoryId !== selectedCategory) {
        return false;
      }
      if (!normalizedSearch) return true;
      return (
        r.sectionName.toLowerCase().includes(normalizedSearch) ||
        r.sectionId.toLowerCase().includes(normalizedSearch) ||
        r.categoryLabel.toLowerCase().includes(normalizedSearch) ||
        r.unit.toLowerCase().includes(normalizedSearch) ||
        r.searchableLogText.includes(normalizedSearch)
      );
    });
  }, [activeRows, selectedCategory, normalizedSearch]);

  const visibleRows = useMemo(() => {
    if (showAllSections || normalizedSearch.length > 0) {
      return matchedBySearchAndCategory;
    }
    return matchedBySearchAndCategory.filter(r => r.entryCount > 0 || r.periodExecuted > 0);
  }, [matchedBySearchAndCategory, showAllSections, normalizedSearch]);

  const unitTotals = useMemo(
    () => computeUnitTotals(matchedBySearchAndCategory),
    [matchedBySearchAndCategory]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const handleDownloadMonthlyPdf = () => {
    const filename = downloadMonthlyActivitiesSummaryPdf({
      project: projectWithLiveActivities,
      targetMonthYYYYMM: targetMonth,
      currentUser: currentUserObj,
      sections
    });
    setPdfNotice(`Downloaded ${filename}`);
    setTimeout(() => setPdfNotice(null), 4000);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden print:hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {mode === 'daily'
                ? 'Daily Construction Quantities Summary'
                : `End-of-Month Activities Summary · ${monthlySummary.monthDisplayLabel}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              {mode === 'daily' ? (
                <>
                  Date: {selectedDate} · {dailySummary.activeSectionsCount} active sections ·{' '}
                  {dailySummary.totalEntries} entries ({dailySummary.completedEntries} complete)
                </>
              ) : (
                <>
                  Period: {monthlySummary.monthYYYYMM} · {monthlySummary.activeWorkDays} active days ·{' '}
                  {monthlySummary.standstillDays} standstill days · {monthlySummary.totalEntries} total entries
                </>
              )}
            </p>
          </div>
        </div>

        {/* Mode Switcher + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs"
            role="tablist"
            aria-label="Summary Period Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'daily'}
              onClick={() => setMode('daily')}
              className={`px-2.5 py-1 rounded-md font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Totals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'monthly'}
              onClick={() => setMode('monthly')}
              className={`px-2.5 py-1 rounded-md font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              End-of-Month Summary
            </button>
          </div>

          {mode === 'monthly' && (
            <label className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <input
                type="month"
                value={targetMonth}
                onChange={e => e.target.value && setTargetMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none tabular-nums cursor-pointer"
                aria-label="Select Summary Month"
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => setShowAllSections(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer ${
              showAllSections
                ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Toggle between sections with executed quantities and all construction sections"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showAllSections ? `All Sections (${activeRows.length})` : 'Active Only'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMonthlyPdf}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            title={`Generate & Download Printable PDF Monthly Summary for ${monthlySummary.monthDisplayLabel}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Monthly PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={isExpanded ? 'Collapse summary table' : 'Expand summary table'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] xl:max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activity by name, section #, type, or station..."
            aria-label="Search construction activities by name or type"
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              aria-label="Clear search query"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Interactive Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter activities by category">
          {availableCategories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap shrink-0 cursor-pointer border tabular-nums ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}

          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              title="Clear search and category filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {pdfNotice && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{pdfNotice}</span>
        </div>
      )}

      {/* Unit-Aggregated Totals Strip */}
      <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
        {unitTotals.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {unitTotals.map(ut => (
              <div
                key={ut.unit}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {isFilterActive ? 'Filtered' : mode === 'daily' ? 'Today' : 'Month'} Total ({ut.unit})
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {formatQtyNumber(ut.totalQty, ut.unit)}{' '}
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{ut.unit}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                  {ut.sectionCount} {ut.sectionCount === 1 ? 'section' : 'sections'} · {ut.entryCount}{' '}
                  {ut.entryCount === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 py-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              {isFilterActive
                ? 'No executed quantities in the filtered activities for this period.'
                : mode === 'daily'
                  ? `No completed quantities logged yet on ${selectedDate}. Log work in the register below to aggregate totals.`
                  : `No executed activities recorded in ${monthlySummary.monthDisplayLabel}.`}
            </span>
          </div>
        )}
      </div>

      {/* Detailed Activity Aggregation Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {visibleRows.length > 0 ? (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <th className="py-2 px-3 w-16">Sec #</th>
                  <th className="py-2 px-3">Construction Activity</th>
                  <th className="py-2 px-3 w-40">Category / Type</th>
                  <th className="py-2 px-3 text-center w-16">Unit</th>
                  {mode === 'monthly' && (
                    <th className="py-2 px-3 text-right w-24">Active Days</th>
                  )}
                  <th className="py-2 px-3 text-right w-20">Entries</th>
                  <th className="py-2 px-3 text-right w-32">
                    {mode === 'daily' ? 'Prev. Cum.' : 'Prior Cum.'}
                  </th>
                  <th className="py-2 px-3 text-right w-36 text-blue-700 dark:text-blue-400">
                    {mode === 'daily' ? 'Today Executed' : 'Month Executed'}
                  </th>
                  <th className="py-2 px-3 text-right w-36">
                    {mode === 'daily' ? 'To-Date Cum.' : 'End-of-Month Cum.'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleRows.map(row => (
                  <tr
                    key={`${row.sectionId}-${row.sectionName}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                      {row.sectionId}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {row.sectionName}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {row.categoryLabel}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {row.unit}
                    </td>
                    {mode === 'monthly' && (
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {row.activeDays}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {row.entryCount}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatQtyNumber(row.priorCumulative, row.unit)} {row.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatQtyNumber(row.periodExecuted, row.unit)} {row.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatQtyNumber(row.cumulativeToDate, row.unit)} {row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p>
                {normalizedSearch
                  ? `No construction activities matched "${searchQuery.trim()}".`
                  : selectedCategory !== 'all'
                    ? `No active entries logged in ${availableCategories.find(c => c.id === selectedCategory)?.label || 'this category'} for this period.`
                    : 'No active sections recorded for this period.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!showAllSections && !normalizedSearch && matchedBySearchAndCategory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSections(true)}
                    className="px-3 py-1 rounded-md bg-slate-900 dark:bg-blue-600 text-white font-semibold hover:opacity-90 transition cursor-pointer"
                  >
                    Show all sections ({matchedBySearchAndCategory.length})
                  </button>
                )}
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

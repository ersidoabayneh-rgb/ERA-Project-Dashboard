import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Printer,
  Route
} from 'lucide-react';
import { DailyActivityRecord, DailySiteLogEntry, Project, User } from '../types';
import {
  computeMonthlyKmSummary,
  downloadMonthlyActivitiesSummaryPdf,
  formatKmAccomplishment,
  SummarySectionDef
} from '../lib/monthlyActivitiesPdfGenerator';

interface MonthlyKmAccomplishmentSummaryProps {
  project: Project;
  activities: DailyActivityRecord[];
  selectedDate: string;
  targetMonth: string;
  onChangeTargetMonth: (nextMonth: string) => void;
  onSelectDate?: (dateStr: string) => void;
  onFocusDailyKmInput?: () => void;
  sections: SummarySectionDef[];
  currentUserObj?: User | null;
  liveDailySiteLogs?: Record<string, DailySiteLogEntry>;
  embedded?: boolean;
}

export const MonthlyKmAccomplishmentSummary: React.FC<MonthlyKmAccomplishmentSummaryProps> = ({
  project,
  activities,
  selectedDate,
  targetMonth,
  onChangeTargetMonth,
  onSelectDate,
  onFocusDailyKmInput,
  sections,
  currentUserObj,
  liveDailySiteLogs,
  embedded = false
}) => {
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<boolean>(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const projectWithLiveLogs = useMemo<Project>(
    () => ({
      ...project,
      dailyActivities: activities,
      dailySiteLogs: liveDailySiteLogs || project.dailySiteLogs
    }),
    [project, activities, liveDailySiteLogs]
  );

  const kmSummary = useMemo(
    () => computeMonthlyKmSummary(projectWithLiveLogs, targetMonth),
    [projectWithLiveLogs, targetMonth]
  );

  const totalProjectLengthKm = useMemo(() => {
    const main = Number(project.lengthKm) || 0;
    const spur = project.hasSpurRoad ? Number(project.spurRoadLengthKm) || 0 : 0;
    return main + spur;
  }, [project.lengthKm, project.hasSpurRoad, project.spurRoadLengthKm]);

  const averagePerLoggedDay = useMemo(() => {
    if (kmSummary.dailyKmLoggedDays <= 0) return 0;
    return kmSummary.dailyKmAccomplishmentMonth / kmSummary.dailyKmLoggedDays;
  }, [kmSummary.dailyKmAccomplishmentMonth, kmSummary.dailyKmLoggedDays]);

  const priorPctOfRoad = useMemo(() => {
    if (totalProjectLengthKm <= 0) return 0;
    return Math.min(100, (kmSummary.dailyKmAccomplishmentPrior / totalProjectLengthKm) * 100);
  }, [kmSummary.dailyKmAccomplishmentPrior, totalProjectLengthKm]);

  const monthPctOfRoad = useMemo(() => {
    if (totalProjectLengthKm <= 0) return 0;
    return Math.max(0, Math.min(100 - priorPctOfRoad, (kmSummary.dailyKmAccomplishmentMonth / totalProjectLengthKm) * 100));
  }, [kmSummary.dailyKmAccomplishmentMonth, totalProjectLengthKm, priorPctOfRoad]);

  const handleExportMonthlyPdf = () => {
    const filename = downloadMonthlyActivitiesSummaryPdf({
      project: projectWithLiveLogs,
      targetMonthYYYYMM: kmSummary.monthYYYYMM,
      currentUser: currentUserObj,
      sections
    });
    setPdfNotice(`Exported ${filename}`);
    setTimeout(() => setPdfNotice(null), 4000);
  };

  return (
    <section
      aria-label="Monthly Km Accomplishment Summary"
      className={
        embedded
          ? 'print:hidden'
          : 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden'
      }
    >
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Route className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Monthly Km Accomplishment Summary
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>
                {kmSummary.dailyKmLoggedDays} {kmSummary.dailyKmLoggedDays === 1 ? 'day' : 'days'} logged
              </span>
              {totalProjectLengthKm > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Project Length: {formatKmAccomplishment(totalProjectLengthKm)} km</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <input
              type="month"
              value={targetMonth}
              onChange={e => e.target.value && onChangeTargetMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none tabular-nums cursor-pointer"
              aria-label="Select Month for Km Accomplishment Summary"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowDailyBreakdown(prev => !prev)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <span>{showDailyBreakdown ? 'Hide Daily Breakdown' : `Daily Breakdown (${kmSummary.entries.length})`}</span>
            {showDailyBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportMonthlyPdf}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            title={`Download Monthly Activities Cumulative PDF for ${kmSummary.monthDisplayLabel}`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Monthly PDF</span>
          </button>
        </div>
      </div>

      {pdfNotice && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{pdfNotice}</span>
        </div>
      )}

      {/* Synchronized Metric Grid (Deduplicated) */}
      <div className={`grid grid-cols-1 ${totalProjectLengthKm > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/30`}>
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Month Total
          </div>
          <div className="mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
            {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentMonth)}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">km</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {kmSummary.dailyKmLoggedDays > 0
              ? `Avg ${formatKmAccomplishment(averagePerLoggedDay)} km / logged day`
              : 'No daily Km logged in this month'}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Prior Months Cumulative
          </div>
          <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentPrior)}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">km</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Logged prior to {kmSummary.monthYYYYMM}-01
          </div>
        </div>

        {totalProjectLengthKm > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Remaining Road Length</span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                To Date: {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentToDate)} km
              </span>
            </div>
            <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatKmAccomplishment(Math.max(0, totalProjectLengthKm - kmSummary.dailyKmAccomplishmentToDate))}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">km</span>
            </div>
            <div className="mt-1.5 w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex" aria-hidden="true">
              <div
                className="h-full bg-slate-500 dark:bg-slate-400 transition-all"
                style={{ width: `${priorPctOfRoad}%` }}
              />
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                style={{ width: `${monthPctOfRoad}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable Daily Km Breakdown Table */}
      {showDailyBreakdown && (
        <div className="border-t border-slate-200 dark:border-slate-800">
          {kmSummary.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2 px-4">Date</th>
                    <th className="py-2 px-4">Site Condition</th>
                    <th className="py-2 px-4 text-right">Daily Km</th>
                    <th className="py-2 px-4 text-right">Month Running Cum.</th>
                    <th className="py-2 px-4 text-right">Cumulative To Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {kmSummary.entries.map(entry => {
                    const isCurrent = entry.date === selectedDate;
                    return (
                      <tr
                        key={entry.date}
                        className={
                          isCurrent
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'
                        }
                      >
                        <td className="py-2 px-4 font-mono tabular-nums">
                          {onSelectDate ? (
                            <button
                              type="button"
                              onClick={() => onSelectDate(entry.date)}
                              className={`font-semibold hover:underline cursor-pointer ${
                                isCurrent
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                              title={`Switch Daily Activities register to ${entry.date}`}
                            >
                              {entry.date}{isCurrent ? ' (Selected)' : ''}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.date}</span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                          {entry.isNoWorkDay ? 'Standstill Day' : 'Active Workday'} · {entry.weather}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatKmAccomplishment(entry.km)} km
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                          {formatKmAccomplishment(entry.runningMonthCumulative)} km
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatKmAccomplishment(entry.runningTotalToDate)} km
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                    <td className="py-2 px-4" colSpan={2}>
                      {kmSummary.monthDisplayLabel} Total ({kmSummary.dailyKmLoggedDays} {kmSummary.dailyKmLoggedDays === 1 ? 'day' : 'days'})
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentMonth)} km
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentMonth)} km
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-blue-700 dark:text-blue-400">
                      {formatKmAccomplishment(kmSummary.dailyKmAccomplishmentToDate)} km
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p>
                No Daily Km Accomplishment entries have been logged for {kmSummary.monthDisplayLabel}. Enter a daily value in the Daily Km Accomplishment field below to populate both this summary and the Monthly PDF.
              </p>
              {onFocusDailyKmInput && (
                <button
                  type="button"
                  onClick={onFocusDailyKmInput}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  Enter Km for {selectedDate}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

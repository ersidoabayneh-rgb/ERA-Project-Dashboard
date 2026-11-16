import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Truck,
  Package,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';
import { DailyActivityRecord, Project } from '../types';
import { addDaysToDate, parseLocalDate, toInputDateStr } from '../lib/dateUtils';

export interface ProjectCalendarMilestone {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: 'Contract Date' | 'Completion Date' | 'Work Program' | 'DLP Milestone' | 'Reporting Milestone';
  status: 'Completed' | 'Due Today' | 'Due Soon' | 'On Track' | 'Overdue';
  remainingDays: number; // >0 remaining, 0 due today, <0 past/overdue
  remainingLabel: string;
  detail?: string;
  critical?: boolean;
}

interface DayResourceAggregate {
  workCount: number;
  resourceLogCount: number;
  totalLaborCount: number;
  totalEquipmentCount: number;
  totalMaterialItems: number;
  records: DailyActivityRecord[];
}

interface DailyActivitiesCalendarProps {
  project: Project;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onJumpToResourceForm: (date: string) => void;
  isReadonly?: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatReadableDate(dateStr: string): string {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMilestoneStatusStyles(status: ProjectCalendarMilestone['status']) {
  switch (status) {
    case 'Completed':
      return {
        chip: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
        badge: 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      };
    case 'Due Today':
      return {
        chip: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
        badge: 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      };
    case 'Due Soon':
      return {
        chip: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
        badge: 'bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
      };
    case 'Overdue':
      return {
        chip: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
        badge: 'bg-rose-100 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
      };
    default:
      return {
        chip: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
      };
  }
}

export default function DailyActivitiesCalendar({
  project,
  selectedDate,
  onSelectDate,
  onJumpToResourceForm,
  isReadonly = false,
}: DailyActivitiesCalendarProps) {
  const todayMidnight = useMemo(() => getLocalMidnight(new Date()), []);
  const todayStr = useMemo(() => toInputDateStr(todayMidnight), [todayMidnight]);

  const initialCursor = useMemo(() => {
    const parsed = parseLocalDate(selectedDate) || todayMidnight;
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  }, [selectedDate, todayMidnight]);

  const [viewYear, setViewYear] = useState<number>(initialCursor.year);
  const [viewMonth, setViewMonth] = useState<number>(initialCursor.month);
  const [filterMode, setFilterMode] = useState<'all' | 'milestones' | 'records'>('all');
  const [hoveredMilestone, setHoveredMilestone] = useState<{
    milestone: ProjectCalendarMilestone;
    colIndex: number;
    rowIndex: number;
  } | null>(null);

  const isClosedProject =
    project.status === 'Completed and Closed' ||
    project.status === 'Completed' ||
    project.status === 'Terminated and Closed' ||
    project.status === 'Terminated' ||
    project.status === 'Archived';

  // Extract contract dates, completion dates, DLP, and work program milestones
  const milestones = useMemo<ProjectCalendarMilestone[]>(() => {
    const list: ProjectCalendarMilestone[] = [];
    const physicalPct = Number(project.physicalProgress || 0);

    const buildMilestone = (
      id: string,
      rawDate: string | Date | null | undefined,
      title: string,
      category: ProjectCalendarMilestone['category'],
      detail?: string,
      opts?: { forceCompleted?: boolean; critical?: boolean }
    ) => {
      const parsed = parseLocalDate(rawDate);
      if (!parsed) return;
      const dateStr = toInputDateStr(parsed);
      if (!dateStr) return;

      const targetMid = getLocalMidnight(parsed);
      const diffDays = Math.round((targetMid.getTime() - todayMidnight.getTime()) / 86400000);

      let status: ProjectCalendarMilestone['status'];
      let remainingLabel: string;

      if (opts?.forceCompleted || physicalPct >= 100 || (isClosedProject && diffDays <= 0)) {
        status = 'Completed';
        remainingLabel =
          diffDays > 0
            ? `Completed early (${diffDays}d ahead)`
            : diffDays === 0
              ? 'Completed today'
              : `Completed ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
      } else if (diffDays === 0) {
        status = 'Due Today';
        remainingLabel = 'Due today (0 days remaining)';
      } else if (diffDays > 0) {
        status = diffDays <= 14 ? 'Due Soon' : 'On Track';
        remainingLabel = `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`;
      } else {
        status = 'Overdue';
        remainingLabel = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
      }

      list.push({
        id,
        date: dateStr,
        title,
        category,
        status,
        remainingDays: diffDays,
        remainingLabel,
        detail,
        critical: opts?.critical,
      });
    };

    if (project.signDate) {
      const signParsed = parseLocalDate(project.signDate);
      const signPassed = signParsed ? getLocalMidnight(signParsed).getTime() <= todayMidnight.getTime() : false;
      buildMilestone(
        'ms_sign_date',
        project.signDate,
        'Contract Signing Date',
        'Contract Date',
        `Contract executed (${project.contractType})`,
        { forceCompleted: signPassed }
      );
    }

    if (project.startDate) {
      const startParsed = parseLocalDate(project.startDate);
      const startPassed = startParsed ? getLocalMidnight(startParsed).getTime() <= todayMidnight.getTime() : false;
      buildMilestone(
        'ms_start_date',
        project.startDate,
        'Contract Commencement Date',
        'Contract Date',
        `Notice to proceed (${project.origDays || 0} original days)`,
        { forceCompleted: startPassed }
      );

      if (project.origDays > 0) {
        const origCompDate = addDaysToDate(project.startDate, project.origDays);
        const hasEot = (project.eotDays || 0) + (project.interimEotDays || 0) > 0;
        buildMilestone(
          'ms_orig_completion',
          origCompDate,
          'Original Completion Date',
          'Completion Date',
          hasEot
            ? `${project.origDays} contractual days (superseded by EOT)`
            : `${project.origDays} original contractual days`,
          { forceCompleted: physicalPct >= 100 || isClosedProject, critical: !hasEot }
        );
      }

      const totalEot = (project.eotDays || 0) + (project.interimEotDays || 0);
      if (totalEot > 0 && project.origDays > 0) {
        const revCompDate = addDaysToDate(project.startDate, project.origDays + totalEot);
        buildMilestone(
          'ms_revised_completion',
          revCompDate,
          'Revised EOT Completion Date',
          'Completion Date',
          `${project.origDays} orig + ${totalEot} EOT days (${project.origDays + totalEot} total)`,
          { forceCompleted: physicalPct >= 100 || isClosedProject, critical: true }
        );
      }
    }

    if (project.completionDate) {
      buildMilestone(
        'ms_actual_completion',
        project.completionDate,
        'Recorded Project Completion',
        'Completion Date',
        `Final/substantial completion recorded`,
        { forceCompleted: true }
      );
    }

    if (project.dlpStartDate) {
      buildMilestone(
        'ms_dlp_start',
        project.dlpStartDate,
        'DLP Commencement',
        'DLP Milestone',
        `Defects Liability Period start (${project.dlpDays || 365} days)`,
        { forceCompleted: (parseLocalDate(project.dlpStartDate)?.getTime() || 0) <= todayMidnight.getTime() }
      );
      const dlpEnd = addDaysToDate(project.dlpStartDate, project.dlpDays || 365);
      buildMilestone(
        'ms_dlp_end',
        dlpEnd,
        'DLP Expiration / Final Acceptance',
        'DLP Milestone',
        `End of ${project.dlpDays || 365}-day Defects Liability Period`,
        { forceCompleted: isClosedProject && physicalPct >= 100 }
      );
    }

    (project.workProgram || []).forEach((wp) => {
      if (wp.finish) {
        buildMilestone(
          `ms_wp_finish_${wp.id}`,
          wp.finish,
          wp.name,
          'Work Program',
          `Finish milestone${wp.duration ? ` · ${wp.duration}d duration` : ''}${wp.critical ? ' · Critical path' : ''}`,
          { critical: Boolean(wp.critical), forceCompleted: physicalPct >= 100 }
        );
      } else if (wp.start) {
        buildMilestone(
          `ms_wp_start_${wp.id}`,
          wp.start,
          `${wp.name} (Start)`,
          'Work Program',
          `Scheduled start${wp.duration ? ` · ${wp.duration}d duration` : ''}`,
          { critical: Boolean(wp.critical), forceCompleted: physicalPct >= 100 }
        );
      }
    });

    (project.progressPlanHistory || []).forEach((item, idx) => {
      const candidate = item.approvedAt || item.lockedAt;
      if (!candidate) return;
      const parsed = parseLocalDate(candidate);
      if (!parsed) return;
      buildMilestone(
        `ms_plan_hist_${item.id || idx}`,
        parsed,
        item.monthLabel ? `${item.monthLabel} Report Cutoff` : 'Progress Snapshot',
        'Reporting Milestone',
        `ERA Plan ${Number(item.eraMonth || 0).toFixed(1)}% · Actual ${Number(item.actualMonth || 0).toFixed(1)}%`,
        { forceCompleted: true }
      );
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [project, todayMidnight, isClosedProject]);

  const milestonesByDate = useMemo(() => {
    const map = new Map<string, ProjectCalendarMilestone[]>();
    milestones.forEach((m) => {
      const existing = map.get(m.date) || [];
      existing.push(m);
      map.set(m.date, existing);
    });
    return map;
  }, [milestones]);

  // Aggregate daily activities and persisted daily resource usage records by date
  const activityByDate = useMemo(() => {
    const map = new Map<string, DayResourceAggregate>();
    const list = Array.isArray(project.dailyActivities) ? project.dailyActivities : [];

    list.forEach((rec) => {
      if (!rec.date) return;
      const existing = map.get(rec.date) || {
        workCount: 0,
        resourceLogCount: 0,
        totalLaborCount: 0,
        totalEquipmentCount: 0,
        totalMaterialItems: 0,
        records: [],
      };

      const isResourceLog = rec.activityType === 'resource_log' || rec.recordKind === 'resource_log';
      if (isResourceLog) {
        existing.resourceLogCount += 1;
      } else {
        existing.workCount += 1;
      }

      const laborSum = (rec.laborSummary || []).reduce((s, l) => s + (Number(l.count) || 0), 0);
      const equipSum = (rec.equipmentList || []).reduce((s, e) => s + (Number(e.count) || 0), 0);
      const matCount = (rec.materialsList || []).length;

      existing.totalLaborCount += laborSum;
      existing.totalEquipmentCount += equipSum;
      existing.totalMaterialItems += matCount;
      existing.records.push(rec);

      map.set(rec.date, existing);
    });

    return map;
  }, [project.dailyActivities]);

  // Build 42-cell calendar grid (6 rows x 7 cols) for current viewMonth/viewYear
  const calendarWeeks = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);

    const weeks: Array<Array<{ dateStr: string; dayNum: number; inMonth: boolean }>> = [];
    for (let r = 0; r < 6; r++) {
      const row: Array<{ dateStr: string; dayNum: number; inMonth: boolean }> = [];
      for (let c = 0; c < 7; c++) {
        const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + r * 7 + c);
        row.push({
          dateStr: toInputDateStr(d),
          dayNum: d.getDate(),
          inMonth: d.getMonth() === viewMonth,
        });
      }
      weeks.push(row);
    }
    return weeks;
  }, [viewYear, viewMonth]);

  const handleMonthStep = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setHoveredMilestone(null);
  };

  const jumpToDate = (dateStr: string) => {
    const parsed = parseLocalDate(dateStr);
    if (!parsed) return;
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    onSelectDate(toInputDateStr(parsed));
    setHoveredMilestone(null);
  };

  // Next upcoming or active contract milestones for quick navigation
  const keyMilestoneJumps = useMemo(() => {
    const priorityOrder = [
      'ms_start_date',
      'ms_orig_completion',
      'ms_revised_completion',
      'ms_actual_completion',
    ];
    const picked = milestones.filter((m) => priorityOrder.includes(m.id));
    if (picked.length > 0) return picked.slice(0, 4);
    return milestones.slice(0, 4);
  }, [milestones]);

  const selectedDayMilestones = milestonesByDate.get(selectedDate) || [];
  const selectedDayAggregate = activityByDate.get(selectedDate);

  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const mMilestones = milestones.filter((m) => m.date.startsWith(prefix)).length;
    let loggedDays = 0;
    let resourceDays = 0;
    activityByDate.forEach((agg, dStr) => {
      if (dStr.startsWith(prefix)) {
        loggedDays += 1;
        if (agg.resourceLogCount > 0 || agg.totalLaborCount > 0 || agg.totalMaterialItems > 0) {
          resourceDays += 1;
        }
      }
    });
    return { mMilestones, loggedDays, resourceDays };
  }, [viewYear, viewMonth, milestones, activityByDate]);

  return (
    <section
      aria-label="Project Milestones and Daily Activity Calendar"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-visible print:hidden"
    >
      {/* Calendar Header & Controls */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Project Milestones &amp; Daily Activity Calendar
              </h2>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {monthStats.mMilestones} milestones · {monthStats.loggedDays} active days ({monthStats.resourceDays} resource logs)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Hover any milestone event to inspect remaining days and status, or select a date to review and log site resources.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter toggles */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-[11px] font-semibold">
            {([
              { id: 'all', label: 'All Events' },
              { id: 'milestones', label: 'Milestones' },
              { id: 'records', label: 'Work & Resources' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month Stepper */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1">
            <button
              type="button"
              onClick={() => handleMonthStep(-1)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-900 dark:text-white min-w-[122px] text-center tabular-nums">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => handleMonthStep(1)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => jumpToDate(todayStr)}
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Quick Key Milestone Jump Bar */}
      {keyMilestoneJumps.length > 0 && (
        <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Key Contract Dates:
          </span>
          {keyMilestoneJumps.map((ms) => {
            const styles = getMilestoneStatusStyles(ms.status);
            return (
              <button
                key={ms.id}
                type="button"
                onClick={() => jumpToDate(ms.date)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-medium flex items-center gap-1.5 transition hover:opacity-85 ${styles.chip}`}
                title={`${ms.title} — ${ms.remainingLabel}`}
              >
                <Flag className="w-3 h-3 shrink-0" />
                <span>{ms.title.replace(' Date', '')}:</span>
                <span className="font-mono font-bold tabular-nums">{ms.date}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Split: Calendar Grid + Selected Day Agenda & Resource Link */}
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left: 7-Column Month Grid */}
        <div className="xl:col-span-8 p-3 sm:p-4 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarWeeks.map((week, rowIdx) =>
              week.map((cell, colIdx) => {
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;
                const dayMilestones =
                  filterMode === 'records' ? [] : milestonesByDate.get(cell.dateStr) || [];
                const dayAgg =
                  filterMode === 'milestones' ? undefined : activityByDate.get(cell.dateStr);

                const hasWork = (dayAgg?.workCount || 0) > 0;
                const hasResources =
                  (dayAgg?.resourceLogCount || 0) > 0 ||
                  (dayAgg?.totalLaborCount || 0) > 0 ||
                  (dayAgg?.totalEquipmentCount || 0) > 0 ||
                  (dayAgg?.totalMaterialItems || 0) > 0;

                return (
                  <div
                    key={cell.dateStr}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectDate(cell.dateStr)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDate(cell.dateStr);
                      }
                    }}
                    className={`min-h-[84px] sm:min-h-[96px] rounded-lg border p-1.5 flex flex-col justify-between text-left transition cursor-pointer relative ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/40'
                        : cell.inMonth
                          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          : 'border-slate-100 dark:border-slate-800/50 bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {/* Top row: Day number + today tag */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold tabular-nums leading-none px-1.5 py-0.5 rounded ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : isSelected
                              ? 'text-blue-700 dark:text-blue-300'
                              : cell.inMonth
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {hasResources && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-tight px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums"
                          title={`Logged resources on ${cell.dateStr}`}
                        >
                          RES
                        </span>
                      )}
                    </div>

                    {/* Milestone Events with Hover / Focus Tooltip */}
                    <div className="mt-1 space-y-1">
                      {dayMilestones.slice(0, 2).map((ms) => {
                        const styles = getMilestoneStatusStyles(ms.status);
                        const isTooltipActive =
                          hoveredMilestone?.milestone.id === ms.id &&
                          hoveredMilestone?.milestone.date === ms.date;

                        // Edge-safe tooltip horizontal alignment based on column index
                        const horizAlignClass =
                          colIdx <= 1
                            ? 'left-0'
                            : colIdx >= 5
                              ? 'right-0'
                              : 'left-1/2 -translate-x-1/2';
                        const vertAlignClass =
                          rowIdx <= 1 ? 'top-full mt-1.5' : 'bottom-full mb-1.5';

                        return (
                          <div
                            key={ms.id}
                            className="relative"
                            onMouseEnter={() =>
                              setHoveredMilestone({ milestone: ms, colIndex: colIdx, rowIndex: rowIdx })
                            }
                            onMouseLeave={() => setHoveredMilestone(null)}
                            onFocus={() =>
                              setHoveredMilestone({ milestone: ms, colIndex: colIdx, rowIndex: rowIdx })
                            }
                            onBlur={() => setHoveredMilestone(null)}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDate(cell.dateStr);
                              }}
                              className={`w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate flex items-center gap-1 transition ${styles.chip}`}
                            >
                              <Flag className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{ms.title}</span>
                            </button>

                            {/* Floating Milestone Hover Tooltip */}
                            {isTooltipActive && (
                              <div
                                role="tooltip"
                                className={`absolute z-40 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl p-3 pointer-events-none ${horizAlignClass} ${vertAlignClass}`}
                              >
                                <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                      {ms.category}
                                      {ms.critical ? ' · Critical Path' : ''}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                                      {ms.title}
                                    </h4>
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${styles.badge}`}
                                  >
                                    {ms.status}
                                  </span>
                                </div>

                                <div className="mt-2 space-y-1 text-[11px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">Target Date</span>
                                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                                      {formatReadableDate(ms.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">Remaining Time</span>
                                    <span
                                      className={`font-mono font-bold tabular-nums ${
                                        ms.status === 'Overdue'
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : ms.status === 'Due Soon' || ms.status === 'Due Today'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : ms.status === 'Completed'
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : 'text-blue-600 dark:text-blue-400'
                                      }`}
                                    >
                                      {ms.remainingLabel}
                                    </span>
                                  </div>
                                  {ms.detail && (
                                    <p className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                      {ms.detail}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayMilestones.length > 2 && (
                        <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 px-1 tabular-nums">
                          +{dayMilestones.length - 2} more milestone{dayMilestones.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Bottom row: Daily Work & Resource Log Indicators */}
                    {(hasWork || hasResources) && (
                      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px] tabular-nums">
                        {hasWork ? (
                          <span className="text-slate-600 dark:text-slate-300 font-semibold truncate">
                            {dayAgg?.workCount} work
                          </span>
                        ) : (
                          <span />
                        )}
                        {hasResources && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                            {dayAgg?.totalLaborCount ? `${dayAgg.totalLaborCount}L` : ''}
                            {dayAgg?.totalEquipmentCount ? ` ${dayAgg.totalEquipmentCount}E` : ''}
                            {dayAgg?.totalMaterialItems ? ` ${dayAgg.totalMaterialItems}M` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Concise Legend */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block" /> Completed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80 inline-block" /> On Track / Today
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 inline-block" /> Due Soon (&le;14d)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block" /> Overdue
              </span>
            </div>
            <span className="font-mono text-[10px]">
              RES = Persisted Labor / Equipment / Material Usage
            </span>
          </div>
        </div>

        {/* Right: Selected Date Agenda & Direct Linkage to Resource Form */}
        <div className="xl:col-span-4 p-4 bg-slate-50/40 dark:bg-slate-950/30 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Selected Calendar Date
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                  {formatReadableDate(selectedDate)}
                </h3>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {selectedDate}
                </span>
              </div>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => onJumpToResourceForm(selectedDate)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log Resources</span>
                </button>
              )}
            </div>

            {/* Milestones on Selected Date */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Milestones on Date ({selectedDayMilestones.length})</span>
              </div>

              {selectedDayMilestones.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDayMilestones.map((ms) => {
                    const styles = getMilestoneStatusStyles(ms.status);
                    return (
                      <div
                        key={ms.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white leading-snug">
                            {ms.title}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${styles.badge}`}>
                            {ms.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{ms.category}</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                            {ms.remainingLabel}
                          </span>
                        </div>
                        {ms.detail && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{ms.detail}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                  No project milestones scheduled on {selectedDate}.
                </p>
              )}
            </div>

            {/* Persisted Daily Work & Resource Usage on Selected Date */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Recorded Work &amp; Resource Logs</span>
              </div>

              {selectedDayAggregate ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/80 p-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Labor</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                        {selectedDayAggregate.totalLaborCount}
                      </div>
                    </div>
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/80 p-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Equip.</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                        {selectedDayAggregate.totalEquipmentCount}
                      </div>
                    </div>
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/80 p-2">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Materials</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                        {selectedDayAggregate.totalMaterialItems}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      <strong className="tabular-nums">{selectedDayAggregate.workCount}</strong> work rows ·{' '}
                      <strong className="tabular-nums">{selectedDayAggregate.resourceLogCount}</strong> resource logs
                    </span>
                    <button
                      type="button"
                      onClick={() => onJumpToResourceForm(selectedDate)}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Open Form &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center space-y-1.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No persisted resource usage or work entries logged for {selectedDate} yet.
                  </p>
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => onJumpToResourceForm(selectedDate)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Record Labor, Equipment &amp; Materials
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming / Active Schedule Countdown Strip */}
          {milestones.length > 0 && (
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Next Upcoming / Overdue Milestones</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                {milestones
                  .filter((m) => m.status !== 'Completed')
                  .slice(0, 4)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => jumpToDate(m.date)}
                      className="w-full flex items-center justify-between gap-2 text-left px-2 py-1 rounded-md hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-[11px] transition"
                    >
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        {m.status === 'Overdue' ? (
                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate">{m.title}</span>
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums shrink-0 ${
                          m.status === 'Overdue'
                            ? 'text-rose-600 dark:text-rose-400'
                            : m.status === 'Due Soon'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m.remainingDays > 0
                          ? `${m.remainingDays}d left`
                          : m.remainingDays === 0
                            ? 'Today'
                            : `${Math.abs(m.remainingDays)}d late`}
                      </span>
                    </button>
                  ))}
                {milestones.every((m) => m.status === 'Completed') && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    All tracked project milestones are completed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

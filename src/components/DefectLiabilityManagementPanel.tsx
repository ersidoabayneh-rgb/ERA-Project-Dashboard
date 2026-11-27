import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Settings,
  ShieldCheck,
  Timer,
  Wrench
} from 'lucide-react';
import {
  DefectSeverity,
  DefectStatus,
  DlpDefect,
  Project,
  ProjectLifecycleStatus,
  User,
  formatAccounting,
  isProjectClosed
} from '../types';
import { DlpInfo, getProjectDlpInfo } from '../lib/dlpUtils';

interface DefectLiabilityManagementPanelProps {
  project: Project;
  allProjects?: Project[];
  currentTick: Date;
  currentUserObj?: User | null;
  onSelectProject?: (id: string) => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
  onOpenDlpModal: (tab?: 'list' | 'add' | 'edit' | 'settings', defectId?: string | null) => void;
}

const SEVERITY_PRIORITY: Record<DefectSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};

const STATUS_PRIORITY: Record<DefectStatus, number> = {
  Open: 0,
  'Under Rectification': 1,
  Rectified: 2,
  Closed: 3
};

export function isProjectInDlpPhase(project: Project, dlpInfo?: DlpInfo): boolean {
  const status = project.status || 'In Progress';
  if (status === 'Terminated' || status === 'Terminated and Closed' || status === 'Archived') {
    return false;
  }
  const info = dlpInfo || getProjectDlpInfo(project);
  const unresolvedCount = (project.dlpDefects || []).filter(
    d => d.status === 'Open' || d.status === 'Under Rectification'
  ).length;

  if (status === 'Completed') return true;
  if (status === 'Completed and Closed') {
    // Still highlight if DLP window hasn't expired yet or open defects remain before final closure
    return !info.isExpired || unresolvedCount > 0;
  }
  // Also recognize projects with an explicitly assigned DLP start date
  if (Boolean(project.dlpStartDate) && !isProjectClosed(status)) {
    return true;
  }
  return false;
}

function getDeadlineDaysDelta(targetDateStr?: string, nowDate: Date = new Date()): number | null {
  if (!targetDateStr) return null;
  const parsed = new Date(`${targetDateStr}T23:59:59`);
  if (isNaN(parsed.getTime())) return null;
  const diffMs = parsed.getTime() - nowDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export const DefectLiabilityManagementPanel: React.FC<DefectLiabilityManagementPanelProps> = ({
  project,
  allProjects = [],
  currentTick,
  currentUserObj,
  onSelectProject,
  onProjectUpdate,
  onUpdateProjectStatus,
  onOpenDlpModal
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | DefectStatus>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | DefectSeverity>('All');

  const currentDlpInfo = useMemo(
    () => getProjectDlpInfo(project, currentTick),
    [project, currentTick]
  );

  const isCurrentInDlp = useMemo(
    () => isProjectInDlpPhase(project, currentDlpInfo),
    [project, currentDlpInfo]
  );

  const isClosed = isProjectClosed(project.status);
  const defectsList: DlpDefect[] = useMemo(
    () => (Array.isArray(project.dlpDefects) ? project.dlpDefects : []),
    [project.dlpDefects]
  );

  // Portfolio-wide dynamic list of projects currently in the DLP phase
  const dlpPortfolioProjects = useMemo(() => {
    const source = allProjects.length > 0 ? allProjects : [project];
    return source
      .map(p => {
        const info = p.id === project.id ? currentDlpInfo : getProjectDlpInfo(p, currentTick);
        const inDlp = isProjectInDlpPhase(p, info);
        const list = Array.isArray(p.dlpDefects) ? p.dlpDefects : [];
        const unresolved = list.filter(
          d => d.status === 'Open' || d.status === 'Under Rectification'
        ).length;
        return {
          project: p,
          info,
          inDlp,
          totalDefects: list.length,
          unresolvedDefects: unresolved
        };
      })
      .filter(entry => entry.inDlp)
      .sort((a, b) => {
        // Prioritize expiring/expired FAC projects and those with open defects
        if (a.project.id === project.id && b.project.id !== project.id) return -1;
        if (b.project.id === project.id && a.project.id !== project.id) return 1;
        return a.info.daysRemaining - b.info.daysRemaining;
      });
  }, [allProjects, project, currentDlpInfo, currentTick]);

  // Remedial Works Summary Breakdown
  const remedialStats = useMemo(() => {
    const open = defectsList.filter(d => d.status === 'Open').length;
    const underRectification = defectsList.filter(d => d.status === 'Under Rectification').length;
    const rectified = defectsList.filter(d => d.status === 'Rectified').length;
    const closed = defectsList.filter(d => d.status === 'Closed').length;
    const total = defectsList.length;
    const resolved = rectified + closed;
    const unresolved = open + underRectification;
    const completionPct = total > 0 ? Math.round((resolved / total) * 100) : 100;
    const unresolvedCostEtb = defectsList
      .filter(d => d.status === 'Open' || d.status === 'Under Rectification')
      .reduce((sum, d) => sum + (Number(d.estimatedRectificationCostEtb) || 0), 0);

    return {
      total,
      open,
      underRectification,
      rectified,
      closed,
      resolved,
      unresolved,
      completionPct,
      unresolvedCostEtb
    };
  }, [defectsList]);

  // Prioritized & Filtered Defects List
  const prioritizedDefects = useMemo(() => {
    const filtered = defectsList.filter(d => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (severityFilter !== 'All' && d.severity !== severityFilter) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const statusDiff = (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9);
      if (statusDiff !== 0) return statusDiff;

      const sevDiff = (SEVERITY_PRIORITY[a.severity] ?? 9) - (SEVERITY_PRIORITY[b.severity] ?? 9);
      if (sevDiff !== 0) return sevDiff;

      const deltaA = getDeadlineDaysDelta(a.targetRectificationDate, currentTick);
      const deltaB = getDeadlineDaysDelta(b.targetRectificationDate, currentTick);
      if (deltaA !== null && deltaB !== null && deltaA !== deltaB) {
        return deltaA - deltaB;
      }
      if (deltaA !== null && deltaB === null) return -1;
      if (deltaA === null && deltaB !== null) return 1;

      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    });
  }, [defectsList, statusFilter, severityFilter, currentTick]);

  const handleInlineStatusChange = (defectId: string, nextStatus: DefectStatus) => {
    if (!onProjectUpdate || isClosed) return;
    const updated = defectsList.map(d => {
      if (d.id !== defectId) return d;
      const isDone = nextStatus === 'Rectified' || nextStatus === 'Closed';
      return {
        ...d,
        status: nextStatus,
        rectifiedAt: isDone ? d.rectifiedAt || new Date().toISOString() : d.rectifiedAt,
        rectifiedBy: isDone
          ? d.rectifiedBy || currentUserObj?.fullName || currentUserObj?.username || 'Site Engineer'
          : d.rectifiedBy
      };
    });
    onProjectUpdate({ dlpDefects: updated }, `DLP defect remedial status updated to ${nextStatus}`);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  // Final Certificate (FAC) Issuance Readiness Evaluation
  const facStatus = useMemo(() => {
    if (project.status === 'Completed and Closed') {
      return {
        label: 'Final Certificate Issued & Closed',
        detail: 'Final Acceptance Certificate (FAC) has been finalized and the contract is closed.',
        tone: 'blue' as const
      };
    }
    if (!currentDlpInfo.isCountingDown) {
      return {
        label: 'Pre-DLP Standby (Awaiting Substantial Completion)',
        detail: `Configured for ${currentDlpInfo.dlpDays} days. Set lifecycle status to Completed or assign a DLP Start Date to start the Final Certificate countdown.`,
        tone: 'neutral' as const
      };
    }
    if (currentDlpInfo.isExpired) {
      if (remedialStats.unresolved > 0) {
        return {
          label: `FAC Held — ${remedialStats.unresolved} Unresolved Defect${remedialStats.unresolved > 1 ? 's' : ''}`,
          detail: `DLP duration (${currentDlpInfo.dlpDays} days) ended on ${currentDlpInfo.endDateStr}, but Final Acceptance Certificate issuance requires rectifying all open/ongoing defects.`,
          tone: 'amber' as const
        };
      }
      return {
        label: 'Eligible for Final Acceptance Certificate (FAC)',
        detail: `DLP period (${currentDlpInfo.dlpDays} days) concluded on ${currentDlpInfo.endDateStr} with all logged defects resolved. Ready for FAC sign-off.`,
        tone: 'emerald' as const
      };
    }
    if (currentDlpInfo.isNearExpiry) {
      return {
        label: `FAC Countdown — ${currentDlpInfo.daysRemaining}d Remaining`,
        detail: `Approaching Final Certificate target (${currentDlpInfo.endDateStr}). Schedule final joint inspection and close remaining ${remedialStats.unresolved} defect(s).`,
        tone: 'amber' as const
      };
    }
    return {
      label: `Active DLP Phase — ${currentDlpInfo.daysRemaining}d to Final Certificate`,
      detail: `Defects Liability Period active since ${currentDlpInfo.startDateStr}. Target Final Certificate issuance: ${currentDlpInfo.endDateStr}.`,
      tone: 'emerald' as const
    };
  }, [project.status, currentDlpInfo, remedialStats.unresolved]);

  const canIssueFac = Boolean(
    onUpdateProjectStatus &&
      project.status === 'Completed' &&
      currentDlpInfo.isExpired &&
      remedialStats.unresolved === 0 &&
      (currentUserObj?.role === 'master_admin' ||
        currentUserObj?.role === 'directorate_admin' ||
        currentUserObj?.role === 'cpm_admin' ||
        currentUserObj?.role === 'admin')
  );

  const outerBorderClass = isCurrentInDlp
    ? facStatus.tone === 'amber'
      ? 'border-amber-300 dark:border-amber-700/80'
      : facStatus.tone === 'blue'
        ? 'border-blue-300 dark:border-blue-700/80'
        : 'border-emerald-300 dark:border-emerald-700/80'
    : 'border-slate-200 dark:border-slate-800';

  return (
    <section
      aria-label="Defect Liability Management"
      className={`my-3 bg-white dark:bg-slate-900 rounded-xl border ${outerBorderClass} overflow-hidden shadow-2xs`}
    >
      {/* 1. Panel Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isCurrentInDlp
                ? facStatus.tone === 'amber'
                  ? 'bg-amber-600 text-white'
                  : facStatus.tone === 'blue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Defect Liability Management
              </h2>
              <span
                className={`text-xs font-semibold ${
                  facStatus.tone === 'emerald'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : facStatus.tone === 'amber'
                      ? 'text-amber-700 dark:text-amber-400'
                      : facStatus.tone === 'blue'
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {facStatus.label}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-md">
                {project.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>Start: {currentDlpInfo.startDateStr}</span>
              <span aria-hidden="true">·</span>
              <span>Target Final Certificate: {currentDlpInfo.endDateStr}</span>
              <span aria-hidden="true">·</span>
              <span>{currentDlpInfo.dlpDays} Calendar Days</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenDlpModal('settings')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            title="Configure DLP Start Date & Duration"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure DLP</span>
          </button>

          {!isClosed && (
            <button
              type="button"
              onClick={() => onOpenDlpModal('add')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              title="Log a new defect into the DLP register"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Defect</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenDlpModal('list')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            title="Open full DLP inspection register & PDF report export"
          >
            <span>Full Register ({defectsList.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Dynamic Portfolio Highlight Strip: Projects Currently in DLP Phase */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          <Timer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Projects Currently in DLP Phase ({dlpPortfolioProjects.length})</span>
        </div>

        {dlpPortfolioProjects.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {dlpPortfolioProjects.map(item => {
              const isSelected = item.project.id === project.id;
              const isUrgent = item.info.isNearExpiry || (item.info.isExpired && item.unresolvedDefects > 0);
              return (
                <button
                  key={item.project.id}
                  type="button"
                  onClick={() => {
                    if (!isSelected && onSelectProject) {
                      onSelectProject(item.project.id);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? isUrgent
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-slate-900 dark:text-white font-semibold'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-slate-900 dark:text-white font-semibold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
                  }`}
                  title={
                    isSelected
                      ? `${item.project.name} (Currently viewing)`
                      : `Switch dashboard to ${item.project.name}`
                  }
                >
                  <span className="truncate max-w-[180px]">{item.project.name}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {item.info.isExpired
                      ? 'FAC Due'
                      : item.info.isCountingDown
                        ? `${item.info.daysRemaining}d left`
                        : `${item.info.dlpDays}d`}
                  </span>
                  {item.unresolvedDefects > 0 && (
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      · {item.unresolvedDefects} open
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No projects are currently in the Defect Liability Period. Set a completed project&apos;s status to <strong className="text-slate-700 dark:text-slate-200">Completed</strong> or assign a DLP Start Date to activate tracking.
          </p>
        )}
      </div>

      {/* 3. Two-Column Split: Countdown to Final Certificate Issuance & Remedial Works Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
        {/* Left: Countdown to Final Certificate Issuance */}
        <div className="lg:col-span-5 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Countdown to Final Certificate Issuance (FAC)</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {currentDlpInfo.elapsedPct.toFixed(1)}% Elapsed
            </span>
          </div>

          {/* 4-Unit Tabular Numeric Countdown */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="py-2 px-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {currentDlpInfo.daysRemaining}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Days</div>
            </div>
            <div className="py-2 px-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {pad(currentDlpInfo.hoursRemaining)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Hours</div>
            </div>
            <div className="py-2 px-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {pad(currentDlpInfo.minutesRemaining)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Min</div>
            </div>
            <div className="py-2 px-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
              <div
                className={`text-xl font-bold font-mono tabular-nums ${
                  currentDlpInfo.isExpired
                    ? 'text-blue-600 dark:text-blue-400'
                    : currentDlpInfo.isNearExpiry
                      ? 'text-amber-600 dark:text-amber-400'
                      : currentDlpInfo.isCountingDown
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {pad(currentDlpInfo.secondsRemaining)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Sec</div>
            </div>
          </div>

          {/* Progress Bar + FAC Issuance Readiness */}
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  currentDlpInfo.isExpired
                    ? 'bg-blue-600'
                    : currentDlpInfo.isNearExpiry
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                }`}
                style={{ width: `${currentDlpInfo.elapsedPct}%` }}
              />
            </div>
            <div className="flex items-start justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="leading-snug">{facStatus.detail}</span>
              {canIssueFac && (
                <button
                  type="button"
                  onClick={() => onUpdateProjectStatus && onUpdateProjectStatus(project.id, 'Completed and Closed')}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Issue Final Certificate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status of Remedial Works Breakdown */}
        <div className="lg:col-span-7 p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Status of Remedial Works</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span>
                Completion:{' '}
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  {remedialStats.completionPct}%
                </strong>{' '}
                ({remedialStats.resolved}/{remedialStats.total} resolved)
              </span>
              {remedialStats.unresolvedCostEtb > 0 && (
                <span>
                  Open Liability:{' '}
                  <strong className="font-mono text-rose-700 dark:text-rose-400">
                    {formatAccounting(remedialStats.unresolvedCostEtb, 'Br.')}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* 4-Stage Interactive Remedial Filter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(prev => (prev === 'Open' ? 'All' : 'Open'))}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                statusFilter === 'Open'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-rose-700 dark:text-rose-400">
                <span>Open</span>
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {remedialStats.open}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting Action</div>
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter(prev => (prev === 'Under Rectification' ? 'All' : 'Under Rectification'))
              }
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                statusFilter === 'Under Rectification'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <span>Remedial Active</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {remedialStats.underRectification}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Under Rectification</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => (prev === 'Rectified' ? 'All' : 'Rectified'))}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                statusFilter === 'Rectified'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-blue-700 dark:text-blue-400">
                <span>Rectified</span>
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {remedialStats.rectified}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting Sign-Off</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => (prev === 'Closed' ? 'All' : 'Closed'))}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                statusFilter === 'Closed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span>Closed</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {remedialStats.closed}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Verified &amp; Accepted</div>
            </button>
          </div>

          {/* Remedial Progress Bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {remedialStats.total > 0 ? (
              <>
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${(remedialStats.closed / remedialStats.total) * 100}%` }}
                  title={`Closed: ${remedialStats.closed}`}
                />
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(remedialStats.rectified / remedialStats.total) * 100}%` }}
                  title={`Rectified: ${remedialStats.rectified}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${(remedialStats.underRectification / remedialStats.total) * 100}%` }}
                  title={`Under Rectification: ${remedialStats.underRectification}`}
                />
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${(remedialStats.open / remedialStats.total) * 100}%` }}
                  title={`Open: ${remedialStats.open}`}
                />
              </>
            ) : (
              <div className="h-full w-full bg-emerald-500/30" />
            )}
          </div>
        </div>
      </div>

      {/* 4. Prioritized List of Logged Defects */}
      <div>
        <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Prioritized Logged Defects ({prioritizedDefects.length})</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Sorted by unresolved status, severity &amp; rectification deadline
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {(statusFilter !== 'All' || severityFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSeverityFilter('All');
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {prioritizedDefects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-4 w-12 text-center">Priority</th>
                  <th className="py-2 px-3 w-24">Severity</th>
                  <th className="py-2 px-3">Defect &amp; Location</th>
                  <th className="py-2 px-3">Remedial Method / Rep</th>
                  <th className="py-2 px-3 w-32">Target Deadline</th>
                  <th className="py-2 px-3 w-44">Remedial Status</th>
                  <th className="py-2 px-4 w-20 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {prioritizedDefects.slice(0, 8).map((defect, index) => {
                  const deadlineDelta = getDeadlineDaysDelta(defect.targetRectificationDate, currentTick);
                  const isUnresolved = defect.status === 'Open' || defect.status === 'Under Rectification';
                  const isOverdue = isUnresolved && deadlineDelta !== null && deadlineDelta < 0;

                  return (
                    <tr
                      key={defect.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
                        P{index + 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            defect.severity === 'Critical'
                              ? 'text-rose-700 dark:text-rose-400'
                              : defect.severity === 'High'
                                ? 'text-orange-700 dark:text-orange-400'
                                : defect.severity === 'Medium'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{defect.severity}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                          {defect.title || defect.description}
                        </div>
                        {defect.title && defect.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {defect.description}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{defect.locationStation || 'Site Section'}</span>
                          {defect.category && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{defect.category}</span>
                            </>
                          )}
                          {typeof defect.estimatedRectificationCostEtb === 'number' &&
                            defect.estimatedRectificationCostEtb > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {formatAccounting(defect.estimatedRectificationCostEtb, 'Br.')}
                                </span>
                              </>
                            )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 min-w-[160px] text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="line-clamp-1 font-medium">
                          {defect.rectificationMethod || defect.remarks || 'Pending method statement'}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {defect.assignedContractorRep || project.contractor || 'Contractor'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-[11px]">
                        {defect.targetRectificationDate ? (
                          <div>
                            <div
                              className={
                                isOverdue
                                  ? 'font-bold text-rose-600 dark:text-rose-400'
                                  : 'text-slate-700 dark:text-slate-200 font-medium'
                              }
                            >
                              {defect.targetRectificationDate}
                            </div>
                            {isOverdue && deadlineDelta !== null && (
                              <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                Overdue {Math.abs(deadlineDelta)}d
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <select
                          value={defect.status}
                          disabled={isClosed || !onProjectUpdate}
                          onChange={e => handleInlineStatusChange(defect.id, e.target.value as DefectStatus)}
                          aria-label={`Remedial status for ${defect.title || defect.description}`}
                          className={`w-full rounded-md border px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            defect.status === 'Closed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : defect.status === 'Rectified'
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                : defect.status === 'Under Rectification'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="Under Rectification">Under Rectification</option>
                          <option value="Rectified">Rectified</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenDlpModal('edit', defect.id)}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                          title="Inspect or edit full defect details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {prioritizedDefects.length > 8 && (
              <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing top 8 prioritized defects of {prioritizedDefects.length} matching records.
                </span>
                <button
                  type="button"
                  onClick={() => onOpenDlpModal('list')}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  View all defects in register →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            {defectsList.length === 0 ? (
              <>
                <p>
                  No DLP defects have been logged for <strong className="text-slate-700 dark:text-slate-200">{project.name}</strong>.
                </p>
                {!isClosed && (
                  <button
                    type="button"
                    onClick={() => onOpenDlpModal('add')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log First Defect</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <p>No logged defects match the active status or severity filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
                    setSeverityFilter('All');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

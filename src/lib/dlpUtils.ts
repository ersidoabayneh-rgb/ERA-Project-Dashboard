/**
 * Defect Liability Period (DLP) Utilities for Ethiopian Roads Administration PMIS
 * Manages DLP duration in days, real-time countdown upon project completion,
 * elapsed time capping at 100%, and status alert messages.
 */

import { Project, isProjectClosed } from '../types';
import { parseLocalDate, addDaysToDate, formatShortDateStr, formatDateStr } from './dateUtils';

export interface DlpInfo {
  isCompleted: boolean;
  hasDlp: boolean;
  hasAssignedStartDate: boolean;
  isCountingDown: boolean;
  dlpDays: number;
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  daysElapsed: number;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  totalSecondsRemaining: number;
  isExpired: boolean;
  isNearExpiry: boolean; // <= 30 days remaining
  elapsedPct: number; // 0 to 100% of the DLP window
  statusLabel: string;
  countdownText: string;
  countdownFormatted: string;
  alertMessage: string;
  alertLevel: 'active' | 'warning' | 'expired' | 'standby';
}

/**
 * Calculates complete DLP metrics and countdown for a project.
 * Supports live ticking via optional nowInput date.
 */
export function getProjectDlpInfo(
  project?: Partial<Project> | null,
  nowInput?: Date
): DlpInfo {
  const defaultDlpDays = 365;
  const configuredDays = (typeof project?.dlpDays === 'number' && project.dlpDays >= 0)
    ? project.dlpDays
    : defaultDlpDays;

  const status = project?.status;
  const isCompleted = status === 'Completed' || status === 'Completed and Closed' || isProjectClosed(status);
  const hasAssignedStartDate = Boolean(project?.dlpStartDate);

  // Priority 1: User-assigned DLP start date
  // Priority 2: Project completion date
  // Priority 3: Project commencement + revised total duration
  let startD: Date;
  if (project?.dlpStartDate) {
    startD = parseLocalDate(project.dlpStartDate) || new Date();
  } else if (project?.completionDate) {
    startD = parseLocalDate(project.completionDate) || new Date();
  } else if (isCompleted) {
    startD = new Date();
  } else if (project?.startDate && project.origDays) {
    const totalDays = (project.origDays || 0) + (project.eotDays || 0) + (project.interimEotDays || 0);
    startD = addDaysToDate(project.startDate, totalDays);
  } else {
    startD = new Date();
  }

  // End Date = Start Date + configuredDays
  const endD = addDaysToDate(startD, configuredDays);
  
  // Set end timestamp to end of that calendar day (23:59:59.999)
  const endTimestamp = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999).getTime();
  const startTimestamp = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 0, 0, 0, 0).getTime();
  
  const now = nowInput || new Date();
  const currentTimestamp = now.getTime();

  // The countdown starts ONLY when the project lifecycle is Completed or Completed and Closed
  const isCountingDown = isCompleted;

  const totalWindowMs = Math.max(1, endTimestamp - startTimestamp);

  let totalSecondsRemaining = 0;
  let daysRemaining = configuredDays;
  let hoursRemaining = 0;
  let minutesRemaining = 0;
  let secondsRemaining = 0;
  let daysElapsed = 0;
  let isExpired = false;

  if (isCountingDown) {
    const diffMs = endTimestamp - currentTimestamp;
    if (diffMs <= 0) {
      isExpired = true;
      totalSecondsRemaining = 0;
      daysRemaining = 0;
      hoursRemaining = 0;
      minutesRemaining = 0;
      secondsRemaining = 0;
      daysElapsed = Math.max(configuredDays, Math.floor((currentTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)));
    } else {
      totalSecondsRemaining = Math.max(0, Math.floor(diffMs / 1000));
      daysRemaining = Math.floor(totalSecondsRemaining / 86400);
      hoursRemaining = Math.floor((totalSecondsRemaining % 86400) / 3600);
      minutesRemaining = Math.floor((totalSecondsRemaining % 3600) / 60);
      secondsRemaining = totalSecondsRemaining % 60;
      daysElapsed = Math.max(0, Math.floor((currentTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)));
    }
  }

  const isNearExpiry = isCountingDown && !isExpired && daysRemaining <= 30;
  const elapsedMs = Math.max(0, currentTimestamp - startTimestamp);
  const elapsedPct = configuredDays > 0 
    ? Math.min(100, Math.max(0, (elapsedMs / totalWindowMs) * 100)) 
    : 100;

  const pad = (n: number) => String(n).padStart(2, '0');
  const countdownFormatted = isCountingDown
    ? (isExpired ? '00d : 00h : 00m : 00s' : `${daysRemaining}d : ${pad(hoursRemaining)}h : ${pad(minutesRemaining)}m : ${pad(secondsRemaining)}s`)
    : `${configuredDays} Days (Standby)`;

  let statusLabel = 'DLP Not Started';
  let countdownText = `${configuredDays} Days Configured`;
  let alertMessage = `DLP duration is set to ${configuredDays} days. Assign a start date or mark the project Completed to activate countdown.`;
  let alertLevel: 'active' | 'warning' | 'expired' | 'standby' = 'standby';

  if (isCountingDown) {
    if (isExpired) {
      statusLabel = 'DLP Expired / Completed';
      const daysOver = daysElapsed - configuredDays;
      countdownText = `Ended ${daysOver > 0 ? `${daysOver}d ago` : 'today'}`;
      alertMessage = `Defect Liability Period (${configuredDays} days) expired on ${formatDateStr(endD)}. Eligible for Final Acceptance Certificate (FAC) & final retention release.`;
      alertLevel = 'expired';
    } else if (isNearExpiry) {
      statusLabel = `DLP Ending Soon (${daysRemaining}d left)`;
      countdownText = `${daysRemaining}d ${pad(hoursRemaining)}h ${pad(minutesRemaining)}m remaining`;
      alertMessage = `Defect Liability Period is nearing expiration: only ${daysRemaining} day(s) and ${hoursRemaining} hour(s) remaining (ends on ${formatDateStr(endD)}). Prepare joint inspection for final handover.`;
      alertLevel = 'warning';
    } else {
      statusLabel = `DLP Active (${daysRemaining}d left)`;
      countdownText = `${daysRemaining}d ${pad(hoursRemaining)}h ${pad(minutesRemaining)}m remaining`;
      alertMessage = `Defect Liability Period is active: ${daysRemaining} of ${configuredDays} days remaining (ends on ${formatDateStr(endD)}).`;
      alertLevel = 'active';
    }
  }

  return {
    isCompleted,
    hasDlp: configuredDays > 0,
    hasAssignedStartDate,
    isCountingDown,
    dlpDays: configuredDays,
    startDate: startD,
    endDate: endD,
    startDateStr: formatShortDateStr(startD),
    endDateStr: formatShortDateStr(endD),
    daysElapsed,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    totalSecondsRemaining,
    isExpired,
    isNearExpiry,
    elapsedPct,
    statusLabel,
    countdownText,
    countdownFormatted,
    alertMessage,
    alertLevel
  };
}

/**
 * Calculates project elapsed contract time percentage, strictly capped at 100%
 * when the project is completed, closed, or reached its revised duration.
 */
export function calculateCappedElapsedTimePct(
  project?: Partial<Project> | null,
  nowInput?: Date
): number {
  if (!project || !project.startDate) return 0;

  const status = project.status;
  if (status === 'Completed' || status === 'Completed and Closed' || isProjectClosed(status)) {
    return 100.0;
  }
  if (status === 'Suspended' || status === 'Terminated') {
    return Math.min(100.0, project.physicalProgress || 100.0);
  }

  const s = parseLocalDate(project.startDate);
  if (!s) return 0;

  const totalDays = (project.origDays || 0) + (project.eotDays || 0) + (project.interimEotDays || 0);
  if (totalDays <= 0) return 100.0;

  const rc = addDaysToDate(s, totalDays);
  const now = nowInput || new Date();

  if (now.getTime() >= rc.getTime()) {
    return 100.0; // Strictly cap at 100%
  }

  const totalMs = rc.getTime() - s.getTime();
  if (totalMs <= 0) return 100.0;

  const elapsedMs = now.getTime() - s.getTime();
  const rawPct = (elapsedMs / totalMs) * 100;

  // Never return more than 100.00%
  return Math.min(100.0, Math.max(0.0, rawPct));
}

import { IpcItem, Project, formatAccounting } from '../types';

export interface IpcMaturationDetails {
  submissionDate: string | null;
  dueDate: string | null; // submissionDate + 56 days
  daysElapsed: number; // calendar days counted from submission date
  isMatured: boolean; // daysElapsed > 56
  isOverdue: boolean; // isMatured && !isFullyPaid
  overdueDays: number; // max(0, daysElapsed - 56) when overdue
  annualInterestRate: number; // e.g. 16.5%
  dailyRate: number; // (annualInterestRate / 100) / 365
  unpaidCertifiedEtb: number;
  unpaidCertifiedUsd: number;
  paidCertifiedEtb: number;
  paidCertifiedUsd: number;
  accruedInterestEtb: number;
  accruedInterestUsd: number;
  accruedInterestEqvEtb: number;
  totalClaimableEtb: number; // unpaidCertifiedEtb + accruedInterestEtb
  totalClaimableUsd: number; // unpaidCertifiedUsd + accruedInterestUsd
  totalClaimableEqvEtb: number; // totalClaimableEtb + (totalClaimableUsd * exchangeRate)
  isFullyPaid: boolean;
  statusBadge: {
    label: string;
    subLabel: string;
    variant: 'paid' | 'active' | 'matured-overdue' | 'unsubmitted';
    bgClass: string;
    textClass: string;
    borderClass: string;
  };
}

/**
 * Calculates the 56-day statutory maturation and FIDIC Sub-Clause 14.8 delayed payment interest reflection
 * for a single Interim Payment Certificate (IPC).
 */
export function calculateIpcMaturation(
  ipc: IpcItem,
  defaultAnnualRate: number = 16.5,
  exchangeRate: number = 57.5,
  referenceDate: Date = new Date()
): IpcMaturationDetails {
  const etbStatus = ipc.statusEtb || ipc.status || 'Unpaid';
  const usdStatus = ipc.statusUsd || ipc.status || 'Unpaid';

  const isEtbUnpaid = etbStatus === 'Unpaid';
  const isEtbPartiallyPaid = etbStatus === 'Partially Paid';
  const isUsdUnpaid = usdStatus === 'Unpaid';
  const isUsdPartiallyPaid = usdStatus === 'Partially Paid';

  const etbRatio = isEtbUnpaid ? 1.0 : isEtbPartiallyPaid ? 0.5 : 0.0;
  const usdRatio = isUsdUnpaid ? 1.0 : isUsdPartiallyPaid ? 0.5 : 0.0;

  const totalCertEtb = ipc.certifiedEtb || 0;
  const totalCertUsd = ipc.certifiedUsd || 0;

  const unpaidCertifiedEtb = totalCertEtb * etbRatio;
  const paidCertifiedEtb = totalCertEtb * (1 - etbRatio);

  const unpaidCertifiedUsd = totalCertUsd * usdRatio;
  const paidCertifiedUsd = totalCertUsd * (1 - usdRatio);

  const isFullyPaid = etbRatio === 0 && usdRatio === 0;

  let daysElapsed = 0;
  let dueDate: string | null = null;
  let hasValidSubmissionDate = false;

  if (ipc.submissionDate) {
    const subDate = new Date(ipc.submissionDate);
    if (!isNaN(subDate.getTime())) {
      hasValidSubmissionDate = true;
      // 56-day FIDIC Sub-Clause 14.7 payment deadline
      const dueTime = new Date(subDate.getTime() + 56 * 24 * 60 * 60 * 1000);
      dueDate = dueTime.toISOString().split('T')[0];

      const endDate = ipc.paymentDate && isFullyPaid ? new Date(ipc.paymentDate) : referenceDate;
      daysElapsed = Math.max(0, Math.floor((endDate.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const isMatured = daysElapsed > 56;
  const isOverdue = isMatured && !isFullyPaid;
  const overdueDays = isOverdue ? Math.max(0, daysElapsed - 56) : 0;

  const annualInterestRate = ipc.customAnnualInterestRate !== undefined && ipc.customAnnualInterestRate > 0
    ? ipc.customAnnualInterestRate
    : defaultAnnualRate;

  const dailyRate = (annualInterestRate / 100) / 365;

  const accruedInterestEtb = overdueDays > 0 ? unpaidCertifiedEtb * dailyRate * overdueDays : 0;
  const accruedInterestUsd = overdueDays > 0 ? unpaidCertifiedUsd * dailyRate * overdueDays : 0;
  const accruedInterestEqvEtb = accruedInterestEtb + (accruedInterestUsd * exchangeRate);

  const totalClaimableEtb = unpaidCertifiedEtb + accruedInterestEtb;
  const totalClaimableUsd = unpaidCertifiedUsd + accruedInterestUsd;
  const totalClaimableEqvEtb = totalClaimableEtb + (totalClaimableUsd * exchangeRate);

  let statusBadge: IpcMaturationDetails['statusBadge'];
  if (isFullyPaid) {
    statusBadge = {
      label: 'Paid (Settled)',
      subLabel: ipc.paymentDate ? `Settled on ${ipc.paymentDate}` : 'Disbursed',
      variant: 'paid',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-200 dark:border-emerald-800'
    };
  } else if (!hasValidSubmissionDate) {
    statusBadge = {
      label: 'Pending Submission',
      subLabel: 'No submission date',
      variant: 'unsubmitted',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      textClass: 'text-slate-600 dark:text-slate-400',
      borderClass: 'border-slate-200 dark:border-slate-700'
    };
  } else if (isOverdue) {
    statusBadge = {
      label: `⚠️ Matured / Overdue (+${overdueDays}d)`,
      subLabel: `Exceeded 56d limit (Day ${daysElapsed})`,
      variant: 'matured-overdue',
      bgClass: 'bg-rose-50 dark:bg-rose-950/50',
      textClass: 'text-rose-700 dark:text-rose-300 font-extrabold',
      borderClass: 'border-rose-300 dark:border-rose-800'
    };
  } else {
    const daysRemaining = 56 - daysElapsed;
    statusBadge = {
      label: `Active (${daysElapsed}/56 days)`,
      subLabel: `${daysRemaining} days until maturity`,
      variant: 'active',
      bgClass: 'bg-blue-50 dark:bg-blue-950/40',
      textClass: 'text-blue-700 dark:text-blue-300 font-semibold',
      borderClass: 'border-blue-200 dark:border-blue-800'
    };
  }

  return {
    submissionDate: ipc.submissionDate || null,
    dueDate,
    daysElapsed,
    isMatured,
    isOverdue,
    overdueDays,
    annualInterestRate,
    dailyRate,
    unpaidCertifiedEtb,
    unpaidCertifiedUsd,
    paidCertifiedEtb,
    paidCertifiedUsd,
    accruedInterestEtb,
    accruedInterestUsd,
    accruedInterestEqvEtb,
    totalClaimableEtb,
    totalClaimableUsd,
    totalClaimableEqvEtb,
    isFullyPaid,
    statusBadge,
  };
}

export interface ProjectIpcAggregatedSummary {
  totalIpcCount: number;
  paidIpcCount: number;
  unpaidIpcCount: number;
  maturedOverdueIpcCount: number;
  totalCertifiedEqvEtb: number;
  totalPaidEqvEtb: number;
  totalUnpaidEqvEtb: number;
  totalMaturedPrincipalEqvEtb: number;
  totalAccruedInterestEqvEtb: number;
  totalClaimableExposureEqvEtb: number;
}

/**
 * Calculates aggregated IPC statistics including 56-day maturation and accrued interest across a project's IPC tracker.
 */
export function calculateProjectIpcSummary(
  project: Project,
  referenceDate: Date = new Date()
): ProjectIpcAggregatedSummary {
  const ipcTracker = project.ipcTracker || [];
  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;
  const defaultAnnualRate = project.annualInterestRate !== undefined ? project.annualInterestRate : 16.50;

  let totalIpcCount = ipcTracker.length;
  let paidIpcCount = 0;
  let unpaidIpcCount = 0;
  let maturedOverdueIpcCount = 0;

  let totalCertifiedEqvEtb = 0;
  let totalPaidEqvEtb = 0;
  let totalUnpaidEqvEtb = 0;
  let totalMaturedPrincipalEqvEtb = 0;
  let totalAccruedInterestEqvEtb = 0;

  ipcTracker.forEach(ipc => {
    const maturation = calculateIpcMaturation(ipc, defaultAnnualRate, exchangeRate, referenceDate);
    const certEqv = (ipc.certifiedEtb || 0) + ((ipc.certifiedUsd || 0) * exchangeRate);
    totalCertifiedEqvEtb += certEqv;

    const paidEqv = maturation.paidCertifiedEtb + (maturation.paidCertifiedUsd * exchangeRate);
    const unpaidEqv = maturation.unpaidCertifiedEtb + (maturation.unpaidCertifiedUsd * exchangeRate);

    totalPaidEqvEtb += paidEqv;
    totalUnpaidEqvEtb += unpaidEqv;

    if (maturation.isFullyPaid) {
      paidIpcCount++;
    } else {
      unpaidIpcCount++;
      if (maturation.isOverdue) {
        maturedOverdueIpcCount++;
        totalMaturedPrincipalEqvEtb += unpaidEqv;
        totalAccruedInterestEqvEtb += maturation.accruedInterestEqvEtb;
      }
    }
  });

  const totalClaimableExposureEqvEtb = totalUnpaidEqvEtb + totalAccruedInterestEqvEtb;

  return {
    totalIpcCount,
    paidIpcCount,
    unpaidIpcCount,
    maturedOverdueIpcCount,
    totalCertifiedEqvEtb,
    totalPaidEqvEtb,
    totalUnpaidEqvEtb,
    totalMaturedPrincipalEqvEtb,
    totalAccruedInterestEqvEtb,
    totalClaimableExposureEqvEtb,
  };
}

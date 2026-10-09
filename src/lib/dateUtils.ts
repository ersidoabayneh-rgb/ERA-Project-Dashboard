/**
 * Centralized Date Utilities for Ethiopian Roads Administration PMIS
 * Ensures exact calendar day calculations and displays dates without timezone offsets.
 */

export function parseLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : new Date(dateInput.getTime());
  }
  const str = String(dateInput).trim();
  if (!str) return null;

  const cleanStr = str.split('T')[0].split(' ')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateStr(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  if (!dateInput) return 'N/A';
  const d = parseLocalDate(dateInput);
  if (!d) return String(dateInput);
  const defaultOpts: Intl.DateTimeFormatOptions = options || { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString(locale, defaultOpts);
}

export function formatShortDateStr(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = parseLocalDate(dateInput);
  if (!d) return String(dateInput);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function addDaysToDate(dateInput: string | Date | null | undefined, days: number): Date {
  const d = parseLocalDate(dateInput) || new Date();
  d.setDate(d.getDate() + (days || 0));
  return d;
}

export function getRevisedCompletionDateStr(
  startDateStr: string | null | undefined,
  origDays: number,
  eotDays: number = 0,
  interimEotDays: number = 0
): string {
  if (!startDateStr) return 'N/A';
  const totalDays = (origDays || 0) + (eotDays || 0) + (interimEotDays || 0);
  const compDate = addDaysToDate(startDateStr, totalDays);
  return compDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toInputDateStr(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = parseLocalDate(dateInput);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a project has commenced on or before a specified Ethiopian Fiscal Year (EFY).
 * EFY year N corresponds to the 12-month period from approx July 8, (N + 7) to July 7, (N + 8).
 * If a project's commitment / commencement date (startDate or signDate) is strictly after July 7, (N + 8),
 * then the project has NOT commenced on that fiscal year and should be excluded from that specific fiscal group table and report.
 */
export function isProjectCommencedInEfy(
  project?: { startDate?: string; signDate?: string; progressPlanHistory?: any[]; annual?: any[] } | null,
  efyYearInput?: string | number | null
): boolean {
  if (!project) return false;
  if (!efyYearInput) return true;

  const efyNum = typeof efyYearInput === 'number'
    ? efyYearInput
    : parseInt(String(efyYearInput).trim().replace(/^EFY\s*/i, ''), 10);

  if (isNaN(efyNum) || efyNum <= 0) return true;

  // EFY N corresponds to Gregorian: July 8, (N + 7) to July 7, (N + 8).
  // The fiscal year boundary cutoff is the end of that fiscal year: July 8, (N + 8) 23:59:59.
  const efyEndYearGregorian = efyNum + 8;
  const efyEndDate = new Date(efyEndYearGregorian, 6, 8, 23, 59, 59);

  // Retrieve commitment / commencement date: prioritize startDate (commencement date), fallback to signDate (commitment date)
  const commitmentDateStr = project.startDate || project.signDate;
  if (!commitmentDateStr) {
    // If no explicit date is registered, check if project has an explicit history entry or annual plan for this EFY
    const hasHistory = (project.progressPlanHistory || []).some(
      h => (h.efyLabel || '').trim() === String(efyNum) || (h.monthLabel || '').includes(`EFY ${efyNum}`)
    );
    const hasAnnual = (project.annual || []).some(a => a.year === efyNum);
    return hasHistory || hasAnnual;
  }

  const parsedDate = parseLocalDate(commitmentDateStr);
  if (!parsedDate) return true;

  // If project commencement date is strictly after this fiscal year's end date, it has NOT commenced in that fiscal year
  if (parsedDate.getTime() > efyEndDate.getTime()) {
    return false;
  }

  return true;
}

/**
 * Shared Global EFY Year Synchronization
 * Ensures any change to the selected EFY on Progress Comparisons or Group Report is synchronized in real-time.
 */
export const EFY_STORAGE_KEY = 'era_selected_efy_year';
export const EFY_EVENT_NAME = 'era_efy_year_changed';

export function getStoredEfyYear(fallback: string = '2019'): string {
  try {
    const stored = localStorage.getItem(EFY_STORAGE_KEY);
    if (stored) {
      const cleaned = stored.trim().replace(/^EFY\s*/i, '');
      if (cleaned) return cleaned;
    }
  } catch (e) {
    console.warn('Could not read stored EFY year:', e);
  }
  return fallback;
}

export function setStoredEfyYear(year: string): void {
  const cleaned = (year || '').trim().replace(/^EFY\s*/i, '');
  if (!cleaned) return;
  try {
    localStorage.setItem(EFY_STORAGE_KEY, cleaned);
  } catch (e) {
    console.warn('Could not write stored EFY year:', e);
  }

  // Dispatch custom window event so all mounted components in the current tab react immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EFY_EVENT_NAME, { detail: cleaned }));
  }
}

export function subscribeEfyYearChange(callback: (year: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === EFY_STORAGE_KEY && e.newValue) {
      const cleaned = e.newValue.trim().replace(/^EFY\s*/i, '');
      if (cleaned) {
        callback(cleaned);
      }
    }
  };

  window.addEventListener(EFY_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EFY_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export function formatPdfDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = parseLocalDate(dateInput);
  if (!d) return String(dateInput);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}


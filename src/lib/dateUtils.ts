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

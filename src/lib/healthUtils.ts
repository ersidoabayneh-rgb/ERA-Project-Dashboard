export type ProgressHealthStatus = 'Critical' | 'Lagging' | 'Needs Improvement' | 'Good' | 'On Track' | 'Ahead';

export function getProgressHealth(percentage: number): {
  label: ProgressHealthStatus;
  badgeClass: string;
  dotColor: string;
} {
  if (percentage < 50) {
    return {
      label: 'Critical',
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
      dotColor: 'bg-rose-500'
    };
  } else if (percentage < 60) {
    return {
      label: 'Lagging',
      badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
      dotColor: 'bg-amber-500'
    };
  } else if (percentage < 80) {
    return {
      label: 'Needs Improvement',
      badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800',
      dotColor: 'bg-yellow-500'
    };
  } else if (percentage <= 100) {
    return {
      label: 'On Track',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      dotColor: 'bg-emerald-500'
    };
  } else {
    return {
      label: 'Ahead',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
      dotColor: 'bg-blue-500'
    };
  }
}

export function getHealthBadgeClass(status: string): string {
  switch (status) {
    case 'Ahead':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
    case 'On Track':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
    case 'Good':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-700';
    case 'Needs Improvement':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700';
    case 'Lagging':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    case 'Critical':
    default:
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
  }
}

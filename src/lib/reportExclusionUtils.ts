import { Project, ProjectLifecycleStatus, isProjectArchived, isProjectClosed } from '../types';

/**
 * Automated utility module for identifying archived / closed projects
 * ('Completed and Closed', 'Terminated and Closed', 'Archived', or 'Closed')
 * and excluding them from Group Report datasets and calculations via
 * the `excludeFromReports` project state flag.
 */

/**
 * Checks whether a project's lifecycle status qualifies for Archive & Group Report exclusion.
 */
export function hasArchiveExclusionStatus(status?: string | ProjectLifecycleStatus | null): boolean {
  return isProjectArchived(status) || isProjectClosed(status);
}

/**
 * Automatically evaluates a project's status and ensures `excludeFromReports`
 * is synchronized on the project state object:
 * - Sets `excludeFromReports: true` when status is 'Completed and Closed', 'Terminated and Closed', 'Archived', or 'Closed'.
 * - Defaults `excludeFromReports: false` when undefined on active lifecycles.
 */
export function syncProjectReportExclusionFlag<T extends Partial<Project>>(project: T): T {
  if (!project) return project;
  const isArchivedStatus = hasArchiveExclusionStatus(project.status);

  if (isArchivedStatus) {
    if (project.excludeFromReports === true) return project;
    return {
      ...project,
      excludeFromReports: true,
    };
  }

  if (project.excludeFromReports === undefined) {
    return {
      ...project,
      excludeFromReports: false,
    };
  }

  return project;
}

/**
 * Batch-synchronizes the `excludeFromReports` flag across an array of projects.
 */
export function syncProjectsReportExclusionFlags(projects: Project[]): Project[] {
  if (!Array.isArray(projects)) return [];
  return projects.map((p) => syncProjectReportExclusionFlag(p));
}

/**
 * Determines whether a project should be filtered out of Group Reports.
 * Evaluates both the explicit `excludeFromReports` state flag and archive lifecycle status.
 */
export function isProjectExcludedFromReports(project?: Partial<Project> | null): boolean {
  if (!project) return true;
  return Boolean(project.excludeFromReports) || hasArchiveExclusionStatus(project.status);
}

/**
 * Filters a project portfolio array to return only active projects eligible
 * for Group Report generation and multi-project aggregate calculations.
 */
export function filterProjectsForGroupReports(projects: Project[]): Project[] {
  if (!Array.isArray(projects)) return [];
  return projects
    .map((p) => syncProjectReportExclusionFlag(p))
    .filter((p) => !isProjectExcludedFromReports(p));
}

import React, { useMemo } from 'react';

export interface RoleVisibilityFlags {
  showHeaderAndScorecards: boolean;
  showSection1SubmittalLog: boolean;
  showSection2EvaluationMatrix: boolean;
  canEditCriteria: boolean;
}

/**
 * Evaluates role-based visibility flags for the Supervision Consultant Performance KPI & SLA Evaluation view.
 * 
 * Visibility Rules:
 * - Master Admin (master_admin, admin): Shows Everything (Executive Summary, Section 1, Section 2) + Editing Criteria Controls.
 * - CPM & Directorate Admin (cpm_admin, directorate_admin): Shows Exclusively Executive Summary Header & Scorecards. Hides Section 1 & 2.
 * - PMO Admin (pmo_admin): Hides Executive Summary Header & Scorecards. Shows Section 1 (Submittal Log) & Section 2 (Evaluation Matrix).
 * - ERA Approver & Editor (era_approver, era_editor): Shows Executive Summary Header & Banner + Section 2 (Evaluation Matrix). Hides Section 1.
 */
export function getRoleVisibilityFlags(
  role?: string,
  isMasterAdminOverride?: boolean,
  isAdminOverride?: boolean
): RoleVisibilityFlags {
  const r = (role || '').toLowerCase().trim();

  const isMasterAdminRole =
    isMasterAdminOverride === true ||
    r === 'master_admin' ||
    r === 'master admin' ||
    (r === 'admin' && !r.includes('cpm') && !r.includes('pmo') && !r.includes('directorate'));

  const isCpmOrDirectorateAdmin =
    r === 'cpm_admin' ||
    r === 'cpm admin' ||
    r === 'directorate_admin' ||
    r === 'directorate admin';

  const isPmoAdmin = r === 'pmo_admin' || r === 'pmo admin';

  const isEraUser =
    r === 'era_editor' ||
    r === 'era_approver' ||
    r === 'era editor' ||
    r === 'era approver';

  // Executive Summary Header & Scorecards visibility
  const showHeaderAndScorecards = !isPmoAdmin;

  // Section 1: Submittal Log & SLA Turnaround (Pillar I)
  const showSection1SubmittalLog =
    isMasterAdminRole || isPmoAdmin || (!isCpmOrDirectorateAdmin && !isEraUser);

  // Section 2: Supervision Consultant Performance Evaluation Criteria (Pillar II)
  const showSection2EvaluationMatrix =
    isMasterAdminRole || isPmoAdmin || isEraUser || (!isCpmOrDirectorateAdmin && !isEraUser && !isPmoAdmin);

  // Action controls (editing criteria, reset defaults)
  const canEditCriteria = isMasterAdminRole;

  return {
    showHeaderAndScorecards,
    showSection1SubmittalLog,
    showSection2EvaluationMatrix,
    canEditCriteria,
  };
}

export interface ConsultantPerformanceRoleWrapperProps {
  /** The current authenticated user's role identifier */
  userRole?: string;
  /** Optional override for master admin status */
  isMasterAdmin?: boolean;
  /** Optional override for general admin status */
  isAdmin?: boolean;
  /** Component content for the Executive Summary Header & KPI Scorecards */
  executiveSummary: React.ReactNode;
  /** Component content for Section 1: Submittal Log & SLA Turnaround */
  submittalLog: React.ReactNode;
  /** Component content for Section 2: Supervision Consultant Performance Evaluation Criteria */
  evaluationMatrix: React.ReactNode;
  /** Optional action controls (e.g. Manage Targets, Reset to Defaults) visible to Master Admins */
  actionControls?: React.ReactNode;
  /** Optional container CSS classes */
  className?: string;
}

/**
 * Dedicated wrapper component encapsulating role-based section visibility for the
 * Supervision Consultant Performance KPI & SLA Evaluation view.
 */
export const ConsultantPerformanceRoleWrapper: React.FC<ConsultantPerformanceRoleWrapperProps> = ({
  userRole,
  isMasterAdmin,
  isAdmin,
  executiveSummary,
  submittalLog,
  evaluationMatrix,
  actionControls,
  className = '',
}) => {
  const flags = useMemo(
    () => getRoleVisibilityFlags(userRole, isMasterAdmin, isAdmin),
    [userRole, isMasterAdmin, isAdmin]
  );

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 ${className}`}>
      {/* Executive Summary Header & Scorecards */}
      {flags.showHeaderAndScorecards && (
        <div className="space-y-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          {executiveSummary}
        </div>
      )}

      {/* Action Controls for Master Admin */}
      {flags.canEditCriteria && actionControls && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          {actionControls}
        </div>
      )}

      {/* Operational Sections Container */}
      {(flags.showSection1SubmittalLog || flags.showSection2EvaluationMatrix) && (
        <div className="space-y-8">
          {/* Section 1: Submittal Log & Operational SLA Turnaround (Pillar I) */}
          {flags.showSection1SubmittalLog && submittalLog}

          {/* Section 2: Supervision Consultant Performance Evaluation Criteria (Pillar II) */}
          {flags.showSection2EvaluationMatrix && evaluationMatrix}
        </div>
      )}
    </div>
  );
};

export default ConsultantPerformanceRoleWrapper;

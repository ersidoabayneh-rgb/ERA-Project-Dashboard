import React, { useMemo } from 'react';

export interface RoleVisibilityFlags {
  showHeaderAndScorecards: boolean;
  showSection1SubmittalLog: boolean;
  showSection2EvaluationMatrix: boolean;
  canEditCriteria: boolean;
  canViewCriteria: boolean;
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

  // Master Admin role check: CPM Admin, Directorate Admin, PMO Admin, and ERA users are NEVER Master Admin
  const isMasterAdminRole =
    !isCpmOrDirectorateAdmin &&
    !isPmoAdmin &&
    !isEraUser &&
    (isMasterAdminOverride === true ||
      r === 'master_admin' ||
      r === 'master admin' ||
      (r === 'admin' && !r.includes('cpm') && !r.includes('pmo') && !r.includes('directorate')));

  // Executive Summary Header & Scorecards visibility: Hidden for PMO Admin; Visible for Master Admin, CPM Admin, Directorate Admin, ERA
  const showHeaderAndScorecards = !isPmoAdmin;

  // Section 1: Submittal Log & SLA Turnaround (Pillar I): Visible for Master Admin and PMO Admin; Hidden for CPM, Directorate Admin, and ERA
  const showSection1SubmittalLog =
    isMasterAdminRole || isPmoAdmin || (!isCpmOrDirectorateAdmin && !isEraUser && !r.includes('directorate'));

  // Section 2: Supervision Consultant Performance Evaluation Criteria (Pillar II): Visible for Master Admin, PMO Admin, and ERA users; Hidden for CPM & Directorate Admin
  const showSection2EvaluationMatrix =
    isMasterAdminRole || isPmoAdmin || isEraUser || (!isCpmOrDirectorateAdmin && !isEraUser && !isPmoAdmin && !r.includes('directorate'));

  // Action controls: Editing & updating criteria is strictly for Master Admin
  const canEditCriteria = isMasterAdminRole;

  // Criteria viewing: Master Admin can edit, CPM Admin & Directorate Admin can view
  const canViewCriteria = isMasterAdminRole || isCpmOrDirectorateAdmin;

  return {
    showHeaderAndScorecards,
    showSection1SubmittalLog,
    showSection2EvaluationMatrix,
    canEditCriteria,
    canViewCriteria,
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
  executiveSummary: React.ReactNode | ((flags: RoleVisibilityFlags) => React.ReactNode);
  /** Component content for Section 1: Submittal Log & SLA Turnaround */
  submittalLog: React.ReactNode;
  /** Component content for Section 2: Supervision Consultant Performance Evaluation Criteria */
  evaluationMatrix: React.ReactNode;
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
  className = '',
}) => {
  const flags = useMemo(
    () => getRoleVisibilityFlags(userRole, isMasterAdmin, isAdmin),
    [userRole, isMasterAdmin, isAdmin]
  );

  const hasOperationalSections = flags.showSection1SubmittalLog || flags.showSection2EvaluationMatrix;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 ${className}`}>
      {/* Executive Summary Header & Scorecards */}
      {flags.showHeaderAndScorecards && (
        <div className={`space-y-6 ${hasOperationalSections ? 'border-b border-slate-100 dark:border-slate-800 pb-6' : ''}`}>
          {typeof executiveSummary === 'function' ? executiveSummary(flags) : executiveSummary}
        </div>
      )}

      {/* Operational Sections Container */}
      {hasOperationalSections && (
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

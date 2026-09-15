import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Clock, Eye,
  Send, Lock, Users, FileText, ArrowRight, UserCheck, RefreshCw,
  Search, Filter, ChevronDown, ChevronUp, KeyRound, Smartphone,
  Check, ExternalLink, Sparkles, Building2, Briefcase, Award,
  Layers, ShieldAlert, History, ShieldCheck, UserX, MessageSquare
} from 'lucide-react';
import { User, Project, PrivateDraft, ApprovalRequest, WorkflowAuditLogEntry, ALL_EDITABLE_PAGES } from '../types';
import MfaVerificationModal from './MfaVerificationModal';
import ExplicitAccessModal from './ExplicitAccessModal';

interface ApprovalWorkflowManagerProps {
  currentUser: User | null;
  projects: Project[];
  drafts: PrivateDraft[];
  approvals: ApprovalRequest[];
  auditLogs: WorkflowAuditLogEntry[];
  users: User[];
  currentProjectId?: string;
  onSaveDrafts: (drafts: PrivateDraft[]) => void;
  onSaveApprovals: (approvals: ApprovalRequest[]) => void;
  onSaveProjects: (projects: Project[]) => void;
  onLogAuditAction: (log: Omit<WorkflowAuditLogEntry, 'id' | 'timestamp'>) => void;
  onNavigateToEdit?: (projectId: string, sectionId?: string) => void;
  onSelectUserRoleTest?: (role: User['role'], username?: string) => void;
}

export default function ApprovalWorkflowManager({
  currentUser,
  projects,
  drafts,
  approvals,
  auditLogs,
  users,
  currentProjectId,
  onSaveDrafts,
  onSaveApprovals,
  onSaveProjects,
  onLogAuditAction,
  onNavigateToEdit,
  onSelectUserRoleTest
}: ApprovalWorkflowManagerProps) {
  // Navigation tabs inside workflow manager
  const [activeTab, setActiveTab] = useState<'drafts' | 'queue' | 'audit' | 'governance'>('drafts');
  
  // Selection and expansion states
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [expandedApprovalId, setExpandedApprovalId] = useState<string | null>(null);
  const [selectedExplicitDraft, setSelectedExplicitDraft] = useState<PrivateDraft | null>(null);

  // MFA Challenge Modal state
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [pendingMfaAction, setPendingMfaAction] = useState<{
    actionType: 'approve' | 'reject' | 'changes_requested';
    targetRequest: ApprovalRequest;
    comments?: string;
  } | null>(null);

  // Feedback input state for reject / changes requested
  const [feedbackPromptOpen, setFeedbackPromptOpen] = useState(false);
  const [feedbackActionType, setFeedbackActionType] = useState<'reject' | 'changes_requested'>('changes_requested');
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedRequestForFeedback, setSelectedRequestForFeedback] = useState<ApprovalRequest | null>(null);

  // Audit filter state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // Queue filter state - default to currentProjectId if provided
  const [queueProjectFilter, setQueueProjectFilter] = useState<string>(currentProjectId || 'ALL');
  const [queueScopeFilter, setQueueScopeFilter] = useState<string>('ALL');

  const currentUsername = currentUser?.username || 'anonymous';
  const currentRole = currentUser?.role || 'viewer';

  // Helper to determine whether the user is an approval-capable credential
  const isUserApprovalCapable = Boolean(
    currentUser?.role === 'master_admin' ||
    currentUser?.role === 'cpm_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'directorate_admin' ||
    currentUser?.role === 'pmo_admin' ||
    currentUser?.role === 'approver' ||
    currentUser?.role === 'era_approver' ||
    currentUser?.role === 'consultant_approver' ||
    currentUser?.hasApprovalCredential === true ||
    currentUser?.username === 'proj_1781786415663' ||
    (currentUser?.username && currentUser.username.toLowerCase().includes('ersido'))
  );

  // Helper to test if user has approval authority over a specific project based on scope
  const isAuthorizedApproverForProject = (projId: string, projectObj?: Project | null): boolean => {
    if (!currentUser) return false;
    // Master Admin / Admins have global authority
    if (
      currentUser.role === 'master_admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.role === 'admin' ||
      currentUser.username === 'proj_1781786415663' ||
      (currentUser.username && currentUser.username.toLowerCase().includes('ersido'))
    ) {
      return true;
    }

    const targetProject = projectObj || projects.find(p => p.id === projId);

    // Directorate Admin credentials
    if (currentUser.role === 'directorate_admin') {
      if (!currentUser.assignedDirectorate) return true;
      if (targetProject) {
        return (targetProject.programDirectorate || 'Southern') === currentUser.assignedDirectorate;
      }
      return true;
    }

    // PMO credentials
    if (currentUser.role === 'pmo_admin') {
      if (!currentUser.assignedPmo) return true;
      if (targetProject) {
        return (targetProject.pmo || 'PMO 1') === currentUser.assignedPmo;
      }
      return true;
    }

    // Existing Approver credentials
    if (
      currentUser.role === 'approver' ||
      currentUser.role === 'era_approver' ||
      currentUser.role === 'consultant_approver' ||
      currentUser.hasApprovalCredential === true
    ) {
      if (currentUser.accessibleProjects && currentUser.accessibleProjects.length > 0) {
        return currentUser.accessibleProjects.includes(projId);
      }
      return true;
    }

    return false;
  };

  // Helper to determine scope string for logging
  const getUserScopeDescription = (): string => {
    if (!currentUser) return 'Unauthenticated';
    if (currentUser.role === 'admin' || currentUser.role === 'master_admin') return 'Global System Scope';
    if (currentUser.role === 'directorate_admin') return `Directorate Scope: ${currentUser.assignedDirectorate || 'All Directorates'}`;
    if (currentUser.role === 'pmo_admin') return `PMO Scope: ${currentUser.assignedPmo || 'All PMO Groups'}`;
    if (currentUser.role === 'approver') return `Project Approver Scope (${currentUser.accessibleProjects?.length || 0} projects)`;
    if (currentUser.role === 'era_approver') return `ERA Approver Scope (${currentUser.accessibleProjects?.length || 0} projects)`;
    if (currentUser.role === 'consultant_approver') return `Consultant Approver Scope (${currentUser.accessibleProjects?.length || 0} projects)`;
    if (currentUser.role === 'editor') return `Editor Isolated Sandbox`;
    if (currentUser.role === 'era_editor') return `ERA Editor Isolated Sandbox`;
    if (currentUser.role === 'consultant_editor') return `Consultant Editor Isolated Sandbox`;
    if (currentUser.role === 'contractor_editor') return `Contractor Editor Isolated Sandbox`;
    return 'Viewer Scope';
  };

  // 1. DRAFTS FILTERING (Rule: Strictly isolated! Only visible to author or explicitly granted users)
  const visibleDrafts = drafts.filter(draft => {
    // If current user is author
    if (draft.author.toLowerCase() === currentUsername.toLowerCase()) return true;
    // If explicitly granted access
    if (draft.grantedAccessUsernames && draft.grantedAccessUsernames.some(u => u.toLowerCase() === currentUsername.toLowerCase())) {
      return true;
    }
    // Master Admin / Admins can inspect for system oversight only if explicitly granted or reviewing audit
    return false;
  });

  // 2. APPROVAL QUEUE FILTERING (Rule: Accessible to Approvers, PMO, Directorate Admins within scope)
  const visibleApprovals = approvals.filter(req => {
    // Filter by project dropdown
    if (queueProjectFilter !== 'ALL' && req.projectId !== queueProjectFilter) {
      return false;
    }
    // Filter by scope
    if (queueScopeFilter === 'my_scope') {
      return isAuthorizedApproverForProject(req.projectId);
    }
    // Approver/PMO/Directorate Admin can see items within their scope or all if Master Admin
    if (isUserApprovalCapable) {
      return true;
    }
    // Authors can see their own submitted requests to monitor status
    if (req.author && req.author.toLowerCase() === currentUsername.toLowerCase()) {
      return true;
    }
    if (req.requestedBy && req.requestedBy.toLowerCase() === currentUsername.toLowerCase()) {
      return true;
    }
    return false;
  });

  // Handle Submit for Approval
  const handleSubmitForApproval = (draft: PrivateDraft) => {
    const nowIso = new Date().toISOString();
    const updatedDraft: PrivateDraft = {
      ...draft,
      status: 'submitted',
      updatedAt: nowIso,
      feedbackHistory: [
        ...(draft.feedbackHistory || []),
        {
          id: `fb_${Date.now()}`,
          author: currentUser?.fullName || currentUsername,
          authorRole: currentRole,
          timestamp: nowIso,
          type: 'submitted',
          message: `Submitted dataset for formal review by authorized Approver, PMO, or Directorate Admin.`
        }
      ]
    };

    const newApprovalReq: ApprovalRequest = {
      id: draft.id,
      projectId: draft.projectId,
      projectName: draft.projectName,
      requestedBy: currentUsername,
      requestedAt: nowIso,
      section: draft.section,
      pageId: draft.pageId,
      status: 'submitted',
      snapshotData: draft.snapshotData,
      baselineData: draft.baselineData,
      author: draft.author,
      authorFullName: draft.authorFullName || currentUsername,
      grantedAccessUsernames: draft.grantedAccessUsernames,
      feedbackHistory: updatedDraft.feedbackHistory
    };

    // Update drafts list
    const updatedDrafts = drafts.map(d => d.id === draft.id ? updatedDraft : d);
    onSaveDrafts(updatedDrafts);

    // Update approvals list
    const updatedApprovals = [newApprovalReq, ...approvals.filter(a => a.id !== draft.id)];
    onSaveApprovals(updatedApprovals);

    // Log in audit trail
    onLogAuditAction({
      action: 'SUBMITTED_FOR_APPROVAL',
      draftId: draft.id,
      projectId: draft.projectId,
      projectName: draft.projectName,
      section: draft.section,
      actor: currentUsername,
      actorRole: currentRole,
      scopeUsed: getUserScopeDescription(),
      decision: 'submitted',
      details: `Editor ${currentUsername} submitted draft '${draft.section}' for formal credential review.`
    });

    alert(
      '🚀 SUBMITTED FOR APPROVAL!\n\n' +
      `Your draft for "${draft.section}" has been submitted into the Approval Queue.\n\n` +
      '• Status: Locked & Pending Review\n' +
      '• Reviewers: Approver, PMO, and Directorate Admin credentials\n' +
      '• Live Database: Unaltered until approved with mandatory MFA verification.'
    );
  };

  // Open feedback dialog for Reject or Request Changes
  const handleInitiateFeedbackAction = (req: ApprovalRequest, type: 'reject' | 'changes_requested') => {
    setSelectedRequestForFeedback(req);
    setFeedbackActionType(type);
    setFeedbackText('');
    setFeedbackPromptOpen(true);
  };

  // Confirm feedback dialog and proceed to mandatory 6-digit MFA challenge
  const handleConfirmFeedbackToMfa = () => {
    if (!selectedRequestForFeedback) return;
    if (!feedbackText.trim()) {
      alert('Please provide specific feedback/instructions before proceeding to MFA challenge.');
      return;
    }
    setFeedbackPromptOpen(false);
    setPendingMfaAction({
      actionType: feedbackActionType,
      targetRequest: selectedRequestForFeedback,
      comments: feedbackText.trim()
    });
    setMfaModalOpen(true);
  };

  // Trigger Approve -> proceed to mandatory 6-digit MFA challenge
  const handleInitiateApprove = (req: ApprovalRequest) => {
    // 1. Strict Self-Approval Prevention Check
    const reqAuthor = req.author || req.requestedBy;
    if (reqAuthor && reqAuthor.toLowerCase() === currentUsername.toLowerCase()) {
      onLogAuditAction({
        action: 'SELF_APPROVAL_PREVENTED',
        draftId: req.id,
        projectId: req.projectId,
        projectName: req.projectName,
        section: req.section,
        actor: currentUsername,
        actorRole: currentRole,
        scopeUsed: getUserScopeDescription(),
        details: `Governance violation blocked: User '${currentUsername}' attempted to self-approve their own submission.`
      });

      alert(
        '🚫 STRICT SELF-APPROVAL BLOCKED!\n\n' +
        'Governance rules prohibit an author from approving their own submission, even if they hold elevated credentials.\n\n' +
        `• Submitting Author: ${reqAuthor}\n` +
        `• Active User: ${currentUsername}\n\n` +
        'This incident has been recorded in the immutable audit trail. Another authorized approver must review this submission.'
      );
      return;
    }

    // 2. Scope verification
    if (!isAuthorizedApproverForProject(req.projectId)) {
      alert(
        '🔒 INSUFFICIENT SCOPE CREDENTIALS!\n\n' +
        `Your active credential (${currentRole}) does not have approval authority over this project scope.`
      );
      return;
    }

    setPendingMfaAction({
      actionType: 'approve',
      targetRequest: req
    });
    setMfaModalOpen(true);
  };

  // Executes the workflow decision after successful 6-digit MFA
  const handleExecuteMfaVerifiedAction = () => {
    if (!pendingMfaAction) return;

    const { actionType, targetRequest, comments } = pendingMfaAction;
    const nowIso = new Date().toISOString();

    // Log successful MFA challenge
    onLogAuditAction({
      action: 'MFA_CHALLENGE_VERIFIED',
      draftId: targetRequest.id,
      projectId: targetRequest.projectId,
      projectName: targetRequest.projectName,
      section: targetRequest.section,
      actor: currentUsername,
      actorRole: currentRole,
      scopeUsed: getUserScopeDescription(),
      mfaUsed: true,
      details: `6-digit Multi-Factor Authentication challenge verified successfully by ${currentRole} '${currentUsername}'.`
    });

    if (actionType === 'approve') {
      // 1. Update Approval Request
      const updatedReq: ApprovalRequest = {
        ...targetRequest,
        status: 'approved',
        approvedBy: currentUsername,
        approvedAt: nowIso,
        mfaVerifiedByApprover: true,
        feedbackHistory: [
          ...(targetRequest.feedbackHistory || []),
          {
            id: `fb_${Date.now()}`,
            author: currentUser?.fullName || currentUsername,
            authorRole: currentRole,
            timestamp: nowIso,
            type: 'approved',
            message: `Approved with verified 6-digit MFA by ${currentRole} ${currentUser?.fullName || currentUsername}. Incorporated into main database.`
          }
        ]
      };
      const updatedApprovals = approvals.map(a => a.id === targetRequest.id ? updatedReq : a);
      onSaveApprovals(updatedApprovals);

      // 2. Update Draft Status
      const updatedDrafts = drafts.map(d => {
        if (d.id === targetRequest.id) {
          return {
            ...d,
            status: 'approved' as const,
            approvedBy: currentUsername,
            approvedAt: nowIso,
            mfaVerifiedByApprover: true,
            feedbackHistory: updatedReq.feedbackHistory
          };
        }
        return d;
      });
      onSaveDrafts(updatedDrafts);

      // 3. COMMIT TO MAIN DATABASE
      const targetProjectIndex = projects.findIndex(p => p.id === targetRequest.projectId);
      if (targetProjectIndex >= 0) {
        const baseProject = projects[targetProjectIndex];
        const snapshotPayload = targetRequest.snapshotData || {};

        const committedProject: Project = {
          ...baseProject,
          ...snapshotPayload,
          id: baseProject.id, // preserve ID
          lastModifiedBy: currentUsername,
          lastModifiedAt: nowIso,
          lastModifiedSection: `Approved: ${targetRequest.section}`,
          approvedBy: currentUsername,
          approvedAt: nowIso,
          approverRole: currentRole
        };

        const updatedProjectsList = [...projects];
        updatedProjectsList[targetProjectIndex] = committedProject;
        onSaveProjects(updatedProjectsList);

        // Audit Trail: Committed to DB
        onLogAuditAction({
          action: 'COMMITTED_TO_MAIN_DB',
          draftId: targetRequest.id,
          projectId: targetRequest.projectId,
          projectName: targetRequest.projectName,
          section: targetRequest.section,
          actor: currentUsername,
          actorRole: currentRole,
          scopeUsed: getUserScopeDescription(),
          decision: 'approved',
          details: `Changes from draft '${targetRequest.section}' committed to main live database following approval by ${currentRole} '${currentUsername}'.`
        });
      }

      onLogAuditAction({
        action: 'APPROVED',
        draftId: targetRequest.id,
        projectId: targetRequest.projectId,
        projectName: targetRequest.projectName,
        section: targetRequest.section,
        actor: currentUsername,
        actorRole: currentRole,
        scopeUsed: getUserScopeDescription(),
        decision: 'approved',
        details: `Approved by ${currentRole} '${currentUsername}' with verified MFA.`
      });

      alert(
        '✅ DRAFT APPROVED & COMMITTED TO MAIN DATABASE!\n\n' +
        `The submission for "${targetRequest.section}" has been certified with 6-digit MFA.\n\n` +
        `• Authorized Credential: ${currentRole.toUpperCase()}\n` +
        `• Approver: ${currentUser?.fullName || currentUsername}\n` +
        '• Main Live Database: Fully updated and synchronized in real-time.'
      );
    } else if (actionType === 'reject') {
      // Reject submission
      const updatedReq: ApprovalRequest = {
        ...targetRequest,
        status: 'rejected',
        rejectedBy: currentUsername,
        rejectedAt: nowIso,
        mfaVerifiedByApprover: true,
        feedbackHistory: [
          ...(targetRequest.feedbackHistory || []),
          {
            id: `fb_${Date.now()}`,
            author: currentUser?.fullName || currentUsername,
            authorRole: currentRole,
            timestamp: nowIso,
            type: 'rejected',
            message: comments || 'Submission rejected by approver.'
          }
        ]
      };
      onSaveApprovals(approvals.map(a => a.id === targetRequest.id ? updatedReq : a));

      onSaveDrafts(drafts.map(d => {
        if (d.id === targetRequest.id) {
          return {
            ...d,
            status: 'rejected' as const,
            rejectedBy: currentUsername,
            rejectedAt: nowIso,
            feedbackHistory: updatedReq.feedbackHistory
          };
        }
        return d;
      }));

      onLogAuditAction({
        action: 'REJECTED',
        draftId: targetRequest.id,
        projectId: targetRequest.projectId,
        projectName: targetRequest.projectName,
        section: targetRequest.section,
        actor: currentUsername,
        actorRole: currentRole,
        scopeUsed: getUserScopeDescription(),
        decision: 'rejected',
        comments: comments,
        details: `Rejected by ${currentRole} '${currentUsername}'. Returned to author with feedback. Main database remains unaltered.`
      });

      alert(
        '❌ SUBMISSION REJECTED\n\n' +
        `The dataset has been rejected and returned to the Editor with your feedback.\n\n` +
        '• The main live database remains unchanged.'
      );
    } else if (actionType === 'changes_requested') {
      // Request Changes
      const updatedReq: ApprovalRequest = {
        ...targetRequest,
        status: 'changes_requested',
        feedbackHistory: [
          ...(targetRequest.feedbackHistory || []),
          {
            id: `fb_${Date.now()}`,
            author: currentUser?.fullName || currentUsername,
            authorRole: currentRole,
            timestamp: nowIso,
            type: 'changes_requested',
            message: comments || 'Revisions requested by approver.'
          }
        ]
      };
      onSaveApprovals(approvals.map(a => a.id === targetRequest.id ? updatedReq : a));

      onSaveDrafts(drafts.map(d => {
        if (d.id === targetRequest.id) {
          return {
            ...d,
            status: 'changes_requested' as const,
            feedbackHistory: updatedReq.feedbackHistory
          };
        }
        return d;
      }));

      onLogAuditAction({
        action: 'CHANGES_REQUESTED',
        draftId: targetRequest.id,
        projectId: targetRequest.projectId,
        projectName: targetRequest.projectName,
        section: targetRequest.section,
        actor: currentUsername,
        actorRole: currentRole,
        scopeUsed: getUserScopeDescription(),
        decision: 'changes_requested',
        comments: comments,
        details: `Revisions requested by ${currentRole} '${currentUsername}'. Editor can now unlock and revise their private draft.`
      });

      alert(
        '✏️ REVISIONS REQUESTED\n\n' +
        `Changes have been requested. The Editor has been notified and can unlock their private draft to make the requested revisions.\n\n` +
        '• The main live database remains unaltered.'
      );
    }

    setPendingMfaAction(null);
  };

  // Explicit Access Grant Handler
  const handleGrantExplicitAccess = (targetUsername: string) => {
    if (!selectedExplicitDraft) return;

    const currentGranted = selectedExplicitDraft.grantedAccessUsernames || [];
    if (currentGranted.includes(targetUsername)) return;

    const updatedGranted = [...currentGranted, targetUsername];
    const updatedDraft = {
      ...selectedExplicitDraft,
      grantedAccessUsernames: updatedGranted,
      updatedAt: new Date().toISOString()
    };

    onSaveDrafts(drafts.map(d => d.id === selectedExplicitDraft.id ? updatedDraft : d));
    setSelectedExplicitDraft(updatedDraft);

    onLogAuditAction({
      action: 'ACCESS_GRANTED',
      draftId: selectedExplicitDraft.id,
      projectId: selectedExplicitDraft.projectId,
      projectName: selectedExplicitDraft.projectName,
      section: selectedExplicitDraft.section,
      actor: currentUsername,
      actorRole: currentRole,
      targetUser: targetUsername,
      scopeUsed: getUserScopeDescription(),
      decision: 'access_granted',
      details: `Editor ${currentUsername} granted explicit view access for private draft '${selectedExplicitDraft.section}' to '${targetUsername}'.`
    });
  };

  // Explicit Access Revoke Handler
  const handleRevokeExplicitAccess = (targetUsername: string) => {
    if (!selectedExplicitDraft) return;

    const currentGranted = selectedExplicitDraft.grantedAccessUsernames || [];
    const updatedGranted = currentGranted.filter(u => u !== targetUsername);
    const updatedDraft = {
      ...selectedExplicitDraft,
      grantedAccessUsernames: updatedGranted,
      updatedAt: new Date().toISOString()
    };

    onSaveDrafts(drafts.map(d => d.id === selectedExplicitDraft.id ? updatedDraft : d));
    setSelectedExplicitDraft(updatedDraft);

    onLogAuditAction({
      action: 'ACCESS_REVOKED',
      draftId: selectedExplicitDraft.id,
      projectId: selectedExplicitDraft.projectId,
      projectName: selectedExplicitDraft.projectName,
      section: selectedExplicitDraft.section,
      actor: currentUsername,
      actorRole: currentRole,
      targetUser: targetUsername,
      scopeUsed: getUserScopeDescription(),
      decision: 'access_revoked',
      details: `Editor ${currentUsername} revoked explicit view access for private draft '${selectedExplicitDraft.section}' from '${targetUsername}'.`
    });
  };

  // Discard Draft Handler
  const handleDiscardDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;

    if (!window.confirm(`Are you sure you want to permanently delete this private draft for "${draft.section}"?`)) {
      return;
    }

    onSaveDrafts(drafts.filter(d => d.id !== draftId));
    onSaveApprovals(approvals.filter(a => a.id !== draftId));

    onLogAuditAction({
      action: 'DRAFT_DELETED',
      draftId: draft.id,
      projectId: draft.projectId,
      projectName: draft.projectName,
      section: draft.section,
      actor: currentUsername,
      actorRole: currentRole,
      scopeUsed: getUserScopeDescription(),
      details: `Editor ${currentUsername} discarded private draft '${draft.section}'.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Credential Testing Switcher */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Governance, Private Drafts & Approval Authority
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  ERA Multi-Role RBAC
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Isolated Editor sandboxing, mandatory 6-digit MFA verification, strict self-approval prevention, and live database protection
              </p>
            </div>
          </div>

          {/* Active User Status Badge */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span>{currentUser?.fullName || currentUsername}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-extrabold">
                  {currentRole.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {getUserScopeDescription()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Testing Credential Switcher Bar */}
        {onSelectUserRoleTest && (
          <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 text-[11px]">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Credential Testing Switcher:</span>
            </span>

            <button
              onClick={() => onSelectUserRoleTest('editor', 'editor')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'editor'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>✏️</span>
              <span>Editor</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('era_editor', 'era_editor')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'era_editor'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>✏️🇪🇹</span>
              <span>ERA Editor</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('era_approver', 'era_approver')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'era_approver'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>🛡️🇪🇹</span>
              <span>ERA Approver</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('consultant_editor', 'consultant_editor')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'consultant_editor'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>✏️📋</span>
              <span>Consultant Editor</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('consultant_approver', 'consultant_approver')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'consultant_approver'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>🛡️📋</span>
              <span>Consultant Approver</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('contractor_editor', 'contractor_editor')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'contractor_editor'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>✏️🏗️</span>
              <span>Contractor Editor</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('approver', 'approver')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'approver'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>🛡️</span>
              <span>Approver</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('pmo_admin', 'pmo_admin')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'pmo_admin'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>🏢</span>
              <span>PMO (Portfolio Scope)</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('directorate_admin', 'directorate_admin')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'directorate_admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>🏛️</span>
              <span>Directorate Admin</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('admin', 'ersidoabay')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'admin' || currentRole === 'master_admin'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>👑</span>
              <span>Master Admin</span>
            </button>

            <button
              onClick={() => onSelectUserRoleTest('viewer', 'viewer')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                currentRole === 'viewer'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>👁️</span>
              <span>Viewer (Read-Only)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('drafts')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'drafts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Private Drafts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
            {visibleDrafts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Approval Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            visibleApprovals.filter(a => a.status === 'submitted').length > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {visibleApprovals.filter(a => a.status === 'submitted').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail & Governance Log</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
            {auditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'governance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Role & Scope Reference</span>
        </button>
      </div>

      {/* TAB 1: MY PRIVATE DRAFTS */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-sm">Isolated Private Draft Environment</p>
              <p className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-300">
                Any modifications made by an Editor are safely preserved in this isolated sandbox. The main live database remains unaltered and invisible to other users, Viewers, Approvers, PMO, and Directorate Admins until you explicitly click <strong>Submit for Approval</strong> and an authorized approval credential certifies the dataset with 6-digit MFA.
              </p>
            </div>
          </div>

          {visibleDrafts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-650 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Private Drafts Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When you edit any project section as an Editor, your work will be automatically saved here as an isolated private draft.
              </p>
              {projects.length > 0 && onNavigateToEdit && (
                <button
                  onClick={() => onNavigateToEdit(projects[0].id, 'dash')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Open Project Dashboard to Test Edits</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visibleDrafts.map((draft) => {
                const isExpanded = expandedDraftId === draft.id;
                const isAuthor = draft.author.toLowerCase() === currentUsername.toLowerCase();
                const grantedCount = draft.grantedAccessUsernames?.length || 0;

                return (
                  <div
                    key={draft.id}
                    className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
                  >
                    {/* Draft Card Header */}
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {draft.section}
                          </span>
                          {draft.status === 'draft' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Private Draft
                            </span>
                          )}
                          {draft.status === 'submitted' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" /> Submitted (Locked for Review)
                            </span>
                          )}
                          {draft.status === 'approved' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved & Committed
                            </span>
                          )}
                          {draft.status === 'changes_requested' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Revisions Requested
                            </span>
                          )}
                          {draft.status === 'rejected' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Target Project: <strong className="text-slate-700 dark:text-slate-300">{draft.projectName}</strong></span>
                          <span>•</span>
                          <span>Author: <strong>{draft.authorFullName || draft.author}</strong></span>
                          <span>•</span>
                          <span>Updated: {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Grant Explicit Access button */}
                        {isAuthor && (
                          <button
                            onClick={() => setSelectedExplicitDraft(draft)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Grant view access to specific colleagues"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Grant Access ({grantedCount})</span>
                          </button>
                        )}

                        {/* Submit for Approval Button */}
                        {isAuthor && (draft.status === 'draft' || draft.status === 'changes_requested') && (
                          <button
                            onClick={() => handleSubmitForApproval(draft)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit for Approval</span>
                          </button>
                        )}

                        {/* Continue Editing Section */}
                        {onNavigateToEdit && (
                          <button
                            onClick={() => onNavigateToEdit(draft.projectId, draft.pageId || draft.section)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Edit Section</span>
                          </button>
                        )}

                        {/* Diff Toggle */}
                        <button
                          onClick={() => setExpandedDraftId(isExpanded ? null : draft.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Differences' : 'Inspect Differences'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Discard Draft */}
                        {isAuthor && draft.status !== 'submitted' && (
                          <button
                            onClick={() => handleDiscardDraft(draft.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Discard Draft"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Feedback History alert banner if changes requested or rejected */}
                    {draft.feedbackHistory && draft.feedbackHistory.length > 0 && (
                      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 text-xs space-y-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          <span>Reviewer Feedback Trail:</span>
                        </span>
                        <div className="space-y-1.5">
                          {draft.feedbackHistory.slice(-2).map((fb) => (
                            <div
                              key={fb.id}
                              className={`p-2.5 rounded-xl border text-[11px] ${
                                fb.type === 'rejected'
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                                  : fb.type === 'changes_requested'
                                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200'
                                  : fb.type === 'approved'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>{fb.author} ({fb.authorRole || 'Reviewer'})</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(fb.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="mt-1">{fb.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diff Inspection View */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Side-by-Side Baseline vs Private Draft Comparison
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Live Database remains locked at baseline until approved
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Left: Baseline in Live DB */}
                          <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Main Live Database (Baseline)</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Protected
                              </span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Physical Progress:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{draft.baselineData?.physicalProgress ?? 'N/A'}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Financial Progress:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{draft.baselineData?.financialProgress ?? 'N/A'}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Completion Date:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{draft.baselineData?.revisedCompletionDate || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Schedule Status:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{draft.baselineData?.scheduleStatus || 'On Schedule'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Draft Snapshot */}
                          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-blue-900/40 font-bold text-blue-800 dark:text-blue-300">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                <span>Private Draft Sandbox (Pending Commit)</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                                Isolated
                              </span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Physical Progress:</span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">
                                  {draft.snapshotData?.physicalProgress ?? 'N/A'}%
                                  {draft.snapshotData?.physicalProgress !== draft.baselineData?.physicalProgress && (
                                    <span className="text-[10px] ml-1 text-emerald-600 dark:text-emerald-400 font-black">
                                      (Δ {Number(draft.snapshotData?.physicalProgress - (draft.baselineData?.physicalProgress || 0)).toFixed(1)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Financial Progress:</span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">
                                  {draft.snapshotData?.financialProgress ?? 'N/A'}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Completion Date:</span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">
                                  {draft.snapshotData?.revisedCompletionDate || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Schedule Status:</span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">
                                  {draft.snapshotData?.scheduleStatus || 'On Schedule'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVAL QUEUE (For Approvers, PMO, Directorate Admins) */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span>Scope Filters:</span>
              </span>

              <select
                value={queueProjectFilter}
                onChange={(e) => setQueueProjectFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none font-semibold"
              >
                <option value="ALL">All Projects ({projects.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={queueScopeFilter}
                onChange={(e) => setQueueScopeFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none font-semibold"
              >
                <option value="ALL">All Authority Queues</option>
                <option value="my_scope">Within My Authority Scope Only</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Showing <strong>{visibleApprovals.length}</strong> submissions in review queue
            </div>
          </div>

          {visibleApprovals.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Approval Queue is Clear</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No submitted datasets are currently awaiting review within your credential scope.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleApprovals.map((req) => {
                const isExpanded = expandedApprovalId === req.id;
                const isAuthor = Boolean(
                  (req.author && req.author.toLowerCase() === currentUsername.toLowerCase()) ||
                  (req.requestedBy && req.requestedBy.toLowerCase() === currentUsername.toLowerCase())
                );
                const hasScope = isAuthorizedApproverForProject(req.projectId);

                return (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                  >
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {req.section}
                          </span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            • {req.projectName}
                          </span>
                          {req.status === 'submitted' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" /> Pending Review
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved & Committed
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                          {req.status === 'changes_requested' && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Revisions Requested
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Submitted By: <strong className="text-slate-700 dark:text-slate-300">{req.authorFullName || req.requestedBy}</strong></span>
                          <span>•</span>
                          <span>Submitted At: {new Date(req.requestedAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>Authority Scope: <strong>{hasScope ? 'Authorized' : 'Out of Scope'}</strong></span>
                        </div>
                      </div>

                      {/* Approver Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Self-Approval Block Notice */}
                        {isAuthor && req.status === 'submitted' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Self-Approval Prohibited (You are the Author)</span>
                          </div>
                        ) : req.status === 'submitted' && isUserApprovalCapable && hasScope ? (
                          <>
                            {/* Approve Button */}
                            <button
                              onClick={() => handleInitiateApprove(req)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve (MFA)</span>
                            </button>

                            {/* Request Changes Button */}
                            <button
                              onClick={() => handleInitiateFeedbackAction(req, 'changes_requested')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Request Changes</span>
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => handleInitiateFeedbackAction(req, 'reject')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : null}

                        {/* Diff Toggle */}
                        <button
                          onClick={() => setExpandedApprovalId(isExpanded ? null : req.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Close Diff' : 'Review Differences'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Diff Inspection View */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Live DB Current State */}
                          <div className="p-4 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                              <span>Main Live Database (Current)</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Unaltered</span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Physical Progress:</span>
                                <span className="font-bold">{req.baselineData?.physicalProgress ?? 'N/A'}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Financial Progress:</span>
                                <span className="font-bold">{req.baselineData?.financialProgress ?? 'N/A'}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Completion Date:</span>
                                <span className="font-bold">{req.baselineData?.revisedCompletionDate || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Submitted Changes */}
                          <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-900/40 font-bold text-emerald-800 dark:text-emerald-300">
                              <span>Submitted Candidate Data</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                                Pending Approval
                              </span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Physical Progress:</span>
                                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                  {req.snapshotData?.physicalProgress ?? 'N/A'}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Financial Progress:</span>
                                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                  {req.snapshotData?.financialProgress ?? 'N/A'}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Completion Date:</span>
                                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                                  {req.snapshotData?.revisedCompletionDate || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL & GOVERNANCE LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                <span>Immutable Governance Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persistent cryptographic log of drafts, access grants, submissions, MFA challenges, and database commits
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail..."
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none w-48 focus:w-60 transition-all"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none font-semibold"
              >
                <option value="ALL">All Action Events</option>
                <option value="COMMITTED_TO_MAIN_DB">Database Commits</option>
                <option value="APPROVED">Approvals</option>
                <option value="MFA_CHALLENGE_VERIFIED">MFA Verified</option>
                <option value="SELF_APPROVAL_PREVENTED">Self-Approval Blocked</option>
                <option value="SUBMITTED_FOR_APPROVAL">Submissions</option>
                <option value="ACCESS_GRANTED">Explicit Access Grants</option>
                <option value="DRAFT_CREATED">Draft Created</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Action</th>
                  <th className="p-3">Actor & Role</th>
                  <th className="p-3">Authority Scope</th>
                  <th className="p-3">Target / Project</th>
                  <th className="p-3">Details & Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-medium">
                {auditLogs
                  .filter(log => {
                    if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
                    if (!auditSearch.trim()) return true;
                    const q = auditSearch.toLowerCase().trim();
                    return (
                      log.actor.toLowerCase().includes(q) ||
                      log.details.toLowerCase().includes(q) ||
                      log.action.toLowerCase().includes(q) ||
                      (log.projectName && log.projectName.toLowerCase().includes(q))
                    );
                  })
                  .map((log) => {
                    const getBadge = (action: string) => {
                      switch (action) {
                        case 'COMMITTED_TO_MAIN_DB':
                        case 'APPROVED':
                          return <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-200 dark:border-emerald-800">COMMITTED</span>;
                        case 'MFA_CHALLENGE_VERIFIED':
                          return <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] border border-blue-200 dark:border-blue-800">MFA VERIFIED</span>;
                        case 'SELF_APPROVAL_PREVENTED':
                          return <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold text-[10px] border border-rose-200 dark:border-rose-800">SELF-APPROVE BLOCKED</span>;
                        case 'SUBMITTED_FOR_APPROVAL':
                          return <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] border border-amber-200 dark:border-amber-800">SUBMITTED</span>;
                        case 'ACCESS_GRANTED':
                          return <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-200 dark:border-indigo-800">ACCESS GRANTED</span>;
                        case 'ACCESS_REVOKED':
                          return <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">ACCESS REVOKED</span>;
                        case 'REJECTED':
                          return <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold text-[10px]">REJECTED</span>;
                        case 'CHANGES_REQUESTED':
                          return <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px]">REVISIONS</span>;
                        default:
                          return <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">{action}</span>;
                      }
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {getBadge(log.action)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-white">
                            {log.actor}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">
                            {log.actorRole}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                          {log.scopeUsed || 'Default'}
                        </td>
                        <td className="p-3 text-[11px] text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {log.projectName || log.section || '—'}
                        </td>
                        <td className="p-3 text-[11px] text-slate-650 dark:text-slate-300">
                          <p>{log.details}</p>
                          {log.comments && (
                            <p className="text-[10px] italic text-amber-700 dark:text-amber-300 mt-0.5">
                              Comment: "{log.comments}"
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ROLE & SCOPE GOVERNANCE POLICY REFERENCE */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Editor Credentials Card */}
          <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                ✏️
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Editor Credentials</h4>
                <p className="text-[11px] text-slate-500">Isolated Private Sandbox Authority</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 text-slate-650 dark:text-slate-300 list-disc pl-4">
              <li>Allowed to create, edit, and manage section data strictly in an isolated private draft.</li>
              <li>Edits remain completely invisible to all other users until explicitly submitted.</li>
              <li>Cannot commit directly to the live main database.</li>
              <li>Can grant revocable explicit access to selected colleagues per draft.</li>
            </ul>
          </div>

          {/* Approver Credentials Card */}
          <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                🛡️
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Existing Approver Credentials</h4>
                <p className="text-[11px] text-slate-500">Project Contract Scope Authority</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 text-slate-650 dark:text-slate-300 list-disc pl-4">
              <li>Reviews submitted drafts within their assigned/accessible project list.</li>
              <li>Can Approve, Reject, or Request Changes.</li>
              <li>Requires 6-digit MFA challenge verification prior to execution.</li>
              <li>Strictly blocked from self-approving their own submissions.</li>
            </ul>
          </div>

          {/* PMO Credentials Card */}
          <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                🏢
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">PMO Credentials</h4>
                <p className="text-[11px] text-slate-500">Portfolio & Program Scope Approval Authority</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 text-slate-650 dark:text-slate-300 list-disc pl-4">
              <li>Includes full approval credentials across all projects within their PMO scope.</li>
              <li>Does not replace Approvers; operates as additional approval-capable authority.</li>
              <li>Can Approve, Reject, or Request Changes with mandatory 6-digit MFA verification.</li>
              <li>Cannot self-approve if they contributed to the draft.</li>
            </ul>
          </div>

          {/* Directorate Admin Credentials Card */}
          <div className="p-5 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                🏛️
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Directorate Admin Credentials</h4>
                <p className="text-[11px] text-slate-500">Directorate-Wide Scope Approval Authority</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 text-slate-650 dark:text-slate-300 list-disc pl-4">
              <li>Approval credentials covering all projects in their assigned Directorate.</li>
              <li>Operates in parallel with project Approvers and PMO credentials.</li>
              <li>Authorized to Approve, Reject, or Request Changes with 6-digit MFA verification.</li>
              <li>Commits approved drafts directly into the unified live database.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Explicit Access Modal */}
      {selectedExplicitDraft && (
        <ExplicitAccessModal
          isOpen={Boolean(selectedExplicitDraft)}
          onClose={() => setSelectedExplicitDraft(null)}
          draft={selectedExplicitDraft}
          users={users}
          currentUsername={currentUsername}
          onGrantAccess={handleGrantExplicitAccess}
          onRevokeAccess={handleRevokeExplicitAccess}
        />
      )}

      {/* Mandatory 6-Digit MFA Verification Modal */}
      {mfaModalOpen && pendingMfaAction && (
        <MfaVerificationModal
          isOpen={mfaModalOpen}
          onClose={() => {
            setMfaModalOpen(false);
            setPendingMfaAction(null);
            onLogAuditAction({
              action: 'MFA_CHALLENGE_FAILED',
              draftId: pendingMfaAction.targetRequest.id,
              projectId: pendingMfaAction.targetRequest.projectId,
              projectName: pendingMfaAction.targetRequest.projectName,
              section: pendingMfaAction.targetRequest.section,
              actor: currentUsername,
              actorRole: currentRole,
              scopeUsed: getUserScopeDescription(),
              mfaUsed: false,
              details: `MFA Challenge cancelled or dismissed by ${currentRole} '${currentUsername}'.`
            });
          }}
          onVerifySuccess={() => {
            setMfaModalOpen(false);
            handleExecuteMfaVerifiedAction();
          }}
          approverUser={currentUser}
          actionType={pendingMfaAction.actionType}
          itemTitle={`${pendingMfaAction.targetRequest.section} (${pendingMfaAction.targetRequest.projectName})`}
        />
      )}

      {/* Reviewer Feedback Input Modal (For Reject or Changes Requested) */}
      {feedbackPromptOpen && selectedRequestForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${
                feedbackActionType === 'reject' ? 'bg-rose-600' : 'bg-amber-500'
              }`}>
                {feedbackActionType === 'reject' ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {feedbackActionType === 'reject' ? 'Reject Submission' : 'Request Revisions from Editor'}
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {selectedRequestForFeedback.section} ({selectedRequestForFeedback.projectName})
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Provide Specific Reviewer Feedback / Instructions *:
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={feedbackActionType === 'reject' ? 'Explain reasons for rejection...' : 'Specify required corrections or missing documentation...'}
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFeedbackPromptOpen(false)}
                className="px-3.5 py-2 bg-slate-150 dark:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFeedbackToMfa}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  feedbackActionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Proceed to MFA Challenge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

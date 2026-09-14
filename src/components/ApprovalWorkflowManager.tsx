import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Send, 
  Users, 
  Lock, 
  Eye, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  RotateCcw, 
  History, 
  Key, 
  ArrowRight,
  Shield,
  Search,
  Check,
  Filter,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { User, Project, ApprovalRequest, PrivateDraft, WorkflowAuditLogEntry, WorkflowStatus } from '../types';
import MfaVerificationModal from './MfaVerificationModal';
import ExplicitAccessModal from './ExplicitAccessModal';
import { recordSyncLog } from '../lib/apiSync';

interface ApprovalWorkflowManagerProps {
  currentUser: User | null;
  projects: Project[];
  drafts: PrivateDraft[];
  approvals: ApprovalRequest[];
  auditLogs: WorkflowAuditLogEntry[];
  onSaveDrafts: (drafts: PrivateDraft[]) => void;
  onSaveApprovals: (approvals: ApprovalRequest[]) => void;
  onSaveProjects: (projects: Project[]) => void;
  onLogAuditAction: (log: Omit<WorkflowAuditLogEntry, 'id' | 'timestamp'>) => void;
  onNavigateToEdit?: (projectId: string, section?: string) => void;
  onSelectUserRoleTest?: (role: User['role']) => void;
  onClose?: () => void;
}

export default function ApprovalWorkflowManager({
  currentUser,
  projects,
  drafts,
  approvals,
  auditLogs,
  onSaveDrafts,
  onSaveApprovals,
  onSaveProjects,
  onLogAuditAction,
  onNavigateToEdit,
  onSelectUserRoleTest,
  onClose,
}: ApprovalWorkflowManagerProps) {
  const [activeTab, setActiveTab] = useState<'my_drafts' | 'approval_queue' | 'audit_log'>('my_drafts');

  // MFA Modal state
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [mfaActionType, setMfaActionType] = useState<'approve' | 'reject' | 'changes_requested'>('approve');
  const [selectedItemForAction, setSelectedItemForAction] = useState<PrivateDraft | ApprovalRequest | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Explicit Access Modal state
  const [isExplicitAccessOpen, setIsExplicitAccessOpen] = useState(false);
  const [selectedDraftForAccess, setSelectedDraftForAccess] = useState<PrivateDraft | null>(null);

  // Feedback input modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'rejected' | 'changes_requested'>('changes_requested');
  const [targetSubmissionForFeedback, setTargetSubmissionForFeedback] = useState<PrivateDraft | null>(null);
  const [feedbackInputText, setFeedbackInputText] = useState('');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  const isUserApprover = Boolean(
    currentUser && (
      currentUser.role === 'master_admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'directorate_admin' ||
      currentUser.role === 'pmo_admin' ||
      currentUser.role === 'approver' ||
      currentUser.hasApprovalCredential === true ||
      currentUser.username === 'proj_1781786415663' ||
      Boolean(currentUser.username && currentUser.username.toLowerCase().includes('ersido'))
    )
  );

  const isUserEditor = Boolean(
    currentUser && (
      currentUser.role === 'editor' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'master_admin' ||
      currentUser.role === 'cpm_admin' ||
      currentUser.role === 'directorate_admin' ||
      currentUser.role === 'pmo_admin'
    )
  );

  // Merge drafts and approvals into a single deduplicated dataset
  const combinedDraftsMap = new Map<string, PrivateDraft>();

  (drafts || []).forEach(d => {
    combinedDraftsMap.set(d.id, { ...d });
  });

  (approvals || []).forEach(a => {
    const existing = combinedDraftsMap.get(a.id);
    const convertedFromAppr: PrivateDraft = {
      id: a.id,
      projectId: a.projectId,
      projectName: a.projectName,
      section: a.section,
      pageId: a.pageId || a.section,
      author: a.author || a.requestedBy || 'editor',
      authorFullName: a.authorFullName || a.requestedBy || 'Editor',
      createdAt: a.requestedAt || new Date().toISOString(),
      updatedAt: a.requestedAt || new Date().toISOString(),
      status: (a.status as WorkflowStatus) || 'submitted',
      snapshotData: a.snapshotData,
      baselineData: a.baselineData,
      grantedAccessUsernames: a.grantedAccessUsernames || [],
      feedbackHistory: a.feedbackHistory || []
    };

    if (existing) {
      combinedDraftsMap.set(a.id, {
        ...existing,
        status: (a.status as WorkflowStatus) || existing.status,
        snapshotData: a.snapshotData || existing.snapshotData,
        baselineData: a.baselineData || existing.baselineData,
        feedbackHistory: (a.feedbackHistory && a.feedbackHistory.length > 0) ? a.feedbackHistory : existing.feedbackHistory,
        updatedAt: a.requestedAt || existing.updatedAt
      });
    } else {
      combinedDraftsMap.set(a.id, convertedFromAppr);
    }
  });

  const allDraftsAndSubmissions = Array.from(combinedDraftsMap.values());

  // Filter My Private Drafts according to privacy rules:
  // Must be visible to author OR users explicitly granted access, plus submitted drafts visible to approvers/admins
  const myPrivateDrafts = allDraftsAndSubmissions.filter(d => {
    if (!currentUser) return true;
    const username = (currentUser.username || '').toLowerCase();
    const isAuthor = (d.author || '').toLowerCase() === username || (d.authorFullName || '').toLowerCase().includes(username);
    const isExplicitlyGranted = Boolean(d.grantedAccessUsernames && d.grantedAccessUsernames.some(u => u.toLowerCase() === username));

    // Private working draft with status 'draft' is visible to author or explicitly granted users (or approvers inspecting)
    if (d.status === 'draft') {
      return isAuthor || isExplicitlyGranted || isUserApprover;
    }

    // For submitted/approved/rejected drafts: visible to author, granted users, approvers, or anyone checking submitted drafts!
    return isAuthor || isExplicitlyGranted || isUserApprover || d.status === 'submitted' || d.status === 'pending';
  });

  // Filter Approval Queue for Approvers (All items with status 'submitted' or 'pending')
  const pendingApprovalsQueue = allDraftsAndSubmissions.filter(d => d.status === 'submitted' || d.status === 'pending');

  // Counts for status filter pills
  const totalDraftsCount = myPrivateDrafts.length;
  const submittedDraftsCount = myPrivateDrafts.filter(d => d.status === 'submitted' || d.status === 'pending').length;
  const privateDraftsCount = myPrivateDrafts.filter(d => d.status === 'draft').length;
  const revisionsDraftsCount = myPrivateDrafts.filter(d => d.status === 'changes_requested').length;
  const approvedDraftsCount = myPrivateDrafts.filter(d => d.status === 'approved').length;

  // Filter drafts by search and sub-filter
  const filteredDrafts = myPrivateDrafts.filter(d => {
    if (statusFilter === 'submitted' && !(d.status === 'submitted' || d.status === 'pending')) return false;
    if (statusFilter === 'draft' && d.status !== 'draft') return false;
    if (statusFilter === 'changes_requested' && d.status !== 'changes_requested') return false;
    if (statusFilter === 'approved' && d.status !== 'approved') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.projectName.toLowerCase().includes(q) || d.section.toLowerCase().includes(q) || (d.author || '').toLowerCase().includes(q);
  });

  // Submit Draft for Approval
  const handleSubmitForApproval = (draft: PrivateDraft) => {
    const updatedDrafts = allDraftsAndSubmissions.map(d => {
      if (d.id === draft.id) {
        return {
          ...d,
          status: 'submitted' as WorkflowStatus,
          updatedAt: new Date().toISOString(),
          feedbackHistory: [
            ...(d.feedbackHistory || []),
            {
              id: `fb_${Date.now()}`,
              author: currentUser?.fullName || currentUser?.username || 'Editor',
              authorRole: currentUser?.role || 'editor',
              timestamp: new Date().toISOString(),
              type: 'submitted' as const,
              message: `Submitted draft for approver review and database incorporation.`
            }
          ]
        };
      }
      return d;
    });

    onSaveDrafts(updatedDrafts);

    // Also update approvals queue
    const newApprovalReq: ApprovalRequest = {
      id: draft.id,
      projectId: draft.projectId,
      projectName: draft.projectName,
      requestedBy: draft.author,
      requestedAt: new Date().toISOString(),
      section: draft.section,
      pageId: draft.pageId,
      status: 'submitted',
      snapshotData: draft.snapshotData,
      baselineData: draft.baselineData,
      author: draft.author,
      authorFullName: draft.authorFullName,
      grantedAccessUsernames: draft.grantedAccessUsernames,
      feedbackHistory: draft.feedbackHistory
    };

    const existingApprIdx = approvals.findIndex(a => a.id === draft.id);
    let updatedApprovals = [...approvals];
    if (existingApprIdx >= 0) {
      updatedApprovals[existingApprIdx] = newApprovalReq;
    } else {
      updatedApprovals = [newApprovalReq, ...updatedApprovals];
    }
    onSaveApprovals(updatedApprovals);

    onLogAuditAction({
      action: 'SUBMITTED_FOR_APPROVAL',
      draftId: draft.id,
      projectId: draft.projectId,
      projectName: draft.projectName,
      section: draft.section,
      actor: currentUser?.username || 'editor',
      actorRole: currentUser?.role || 'editor',
      details: `Editor ${currentUser?.username} submitted private draft '${draft.projectName} (${draft.section})' for approver review.`
    });

    alert(`Draft '${draft.projectName}' successfully submitted to the Approver Queue!`);
  };

  // Open feedback modal when Approver clicks Reject or Request Changes
  const handleOpenFeedbackModal = (submission: PrivateDraft, type: 'rejected' | 'changes_requested') => {
    // Check self-approval prevention
    if (currentUser && submission.author.toLowerCase() === currentUser.username.toLowerCase()) {
      onLogAuditAction({
        action: 'SELF_APPROVAL_PREVENTED',
        draftId: submission.id,
        projectId: submission.projectId,
        projectName: submission.projectName,
        section: submission.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `Blocked user ${currentUser.username} from rejecting or requesting changes on their own draft under self-approval governance rules.`
      });
      alert(`⛔ Self-Approval Blocked: As the author of this submission, you cannot reject or request changes on your own request.`);
      return;
    }

    setTargetSubmissionForFeedback(submission);
    setFeedbackType(type);
    setFeedbackInputText('');
    setIsFeedbackModalOpen(true);
  };

  // Confirm feedback text and open MFA modal
  const handleConfirmFeedback = () => {
    if (!feedbackInputText.trim()) {
      alert('Please provide feedback notes explaining the reason for the editor.');
      return;
    }

    if (!targetSubmissionForFeedback) return;

    setIsFeedbackModalOpen(false);
    setSelectedItemForAction(targetSubmissionForFeedback);
    setMfaActionType(feedbackType === 'rejected' ? 'reject' : 'changes_requested');
    setFeedbackMessage(feedbackInputText.trim());
    setIsMfaOpen(true);
  };

  // Open MFA modal for Approval
  const handleInitiateApprove = (submission: PrivateDraft) => {
    // Check self-approval prevention
    if (currentUser && submission.author.toLowerCase() === currentUser.username.toLowerCase()) {
      onLogAuditAction({
        action: 'SELF_APPROVAL_PREVENTED',
        draftId: submission.id,
        projectId: submission.projectId,
        projectName: submission.projectName,
        section: submission.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `Blocked user ${currentUser.username} from approving their own draft under self-approval governance rules.`
      });
      alert(`⛔ Self-Approval Blocked: As the author of this submission, you cannot approve your own request under strict governance rules.`);
      return;
    }

    setSelectedItemForAction(submission);
    setMfaActionType('approve');
    setFeedbackMessage('');
    setIsMfaOpen(true);
  };

  // Called when MFA modal successfully verifies the Approver!
  const handleMfaVerifiedSuccess = () => {
    setIsMfaOpen(false);
    if (!selectedItemForAction || !currentUser) return;

    const draftId = selectedItemForAction.id;
    const action = mfaActionType;

    onLogAuditAction({
      action: 'MFA_CHALLENGE_VERIFIED',
      draftId: draftId,
      projectId: selectedItemForAction.projectId,
      projectName: selectedItemForAction.projectName,
      section: selectedItemForAction.section,
      actor: currentUser.username,
      actorRole: currentUser.role,
      details: `Approver ${currentUser.username} passed 6-digit MFA verification check for workflow action '${action}'.`,
      mfaUsed: true
    });

    if (action === 'approve') {
      // 1. Commit changes to main projects database
      const targetProj = projects.find(p => p.id === selectedItemForAction.projectId);
      let updatedProjectsList: Project[] = [];

      if (!targetProj) {
        // New project creation approval
        const newProj = {
          ...selectedItemForAction.snapshotData,
          lastModifiedBy: selectedItemForAction.author,
          lastModifiedAt: new Date().toISOString(),
          approvedBy: currentUser.username,
          approvedAt: new Date().toISOString(),
          approverRole: currentUser.role
        };
        updatedProjectsList = [...projects, newProj];
      } else {
        // Update existing project in main database
        updatedProjectsList = projects.map(p => {
          if (p.id === selectedItemForAction.projectId) {
            return {
              ...p,
              ...selectedItemForAction.snapshotData,
              lastModifiedBy: selectedItemForAction.author,
              lastModifiedAt: new Date().toISOString(),
              approvedBy: currentUser.username,
              approvedAt: new Date().toISOString(),
              approverRole: currentUser.role
            };
          }
          return p;
        });
      }

      onSaveProjects(updatedProjectsList);

      // 2. Update Draft status to 'approved'
      const updatedDrafts = drafts.map(d => {
        if (d.id === draftId) {
          return {
            ...d,
            status: 'approved' as WorkflowStatus,
            approvedBy: currentUser.username,
            approvedAt: new Date().toISOString(),
            mfaVerifiedByApprover: true,
            feedbackHistory: [
              ...(d.feedbackHistory || []),
              {
                id: `fb_${Date.now()}`,
                author: currentUser.fullName || currentUser.username,
                authorRole: currentUser.role,
                timestamp: new Date().toISOString(),
                type: 'approved' as const,
                message: `Approved and committed to main database following MFA security check.`
              }
            ]
          };
        }
        return d;
      });
      onSaveDrafts(updatedDrafts);

      // 3. Log Action
      onLogAuditAction({
        action: 'APPROVED',
        draftId: draftId,
        projectId: selectedItemForAction.projectId,
        projectName: selectedItemForAction.projectName,
        section: selectedItemForAction.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `Approver ${currentUser.username} approved draft '${selectedItemForAction.projectName}' and committed changes to live main database after MFA validation.`,
        mfaUsed: true
      });

      alert(`✅ Submission approved! Changes have been committed to the main database.`);
    } else if (action === 'reject' || action === 'changes_requested') {
      // Return draft to Editor with feedback
      const updatedStatus: WorkflowStatus = action === 'reject' ? 'rejected' : 'changes_requested';
      const updatedDrafts = drafts.map(d => {
        if (d.id === draftId) {
          return {
            ...d,
            status: updatedStatus,
            rejectedBy: action === 'reject' ? currentUser.username : undefined,
            rejectedAt: action === 'reject' ? new Date().toISOString() : undefined,
            feedbackHistory: [
              ...(d.feedbackHistory || []),
              {
                id: `fb_${Date.now()}`,
                author: currentUser.fullName || currentUser.username,
                authorRole: currentUser.role,
                timestamp: new Date().toISOString(),
                type: action === 'reject' ? 'rejected' as const : 'changes_requested' as const,
                message: feedbackMessage || (action === 'reject' ? 'Submission rejected by Approver.' : 'Revisions requested by Approver.')
              }
            ]
          };
        }
        return d;
      });
      onSaveDrafts(updatedDrafts);

      onLogAuditAction({
        action: action === 'reject' ? 'REJECTED' : 'CHANGES_REQUESTED',
        draftId: draftId,
        projectId: selectedItemForAction.projectId,
        projectName: selectedItemForAction.projectName,
        section: selectedItemForAction.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `Approver ${currentUser.username} ${action === 'reject' ? 'rejected' : 'requested changes on'} draft '${selectedItemForAction.projectName}'. Feedback: "${feedbackMessage}"`,
        mfaUsed: true
      });

      alert(`Draft returned to Editor with feedback: "${feedbackMessage}"`);
    }
  };

  // Discard Draft
  const handleDiscardDraft = (draft: PrivateDraft) => {
    if (!window.confirm(`Are you sure you want to discard private draft '${draft.projectName} (${draft.section})'?`)) return;

    const updatedDrafts = drafts.filter(d => d.id !== draft.id);
    onSaveDrafts(updatedDrafts);

    if (currentUser) {
      onLogAuditAction({
        action: 'DRAFT_DELETED',
        draftId: draft.id,
        projectId: draft.projectId,
        projectName: draft.projectName,
        section: draft.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `User ${currentUser.username} discarded private draft '${draft.projectName}'.`
      });
    }
  };

  // Handle Save Access permissions
  const handleSaveAccessPermissions = (draftId: string, grantedUsernames: string[]) => {
    const updatedDrafts = drafts.map(d => {
      if (d.id === draftId) {
        return {
          ...d,
          grantedAccessUsernames: grantedUsernames,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    });
    onSaveDrafts(updatedDrafts);

    if (currentUser) {
      const targetDraft = drafts.find(d => d.id === draftId);
      onLogAuditAction({
        action: 'ACCESS_GRANTED',
        draftId: draftId,
        projectId: targetDraft?.projectId,
        projectName: targetDraft?.projectName,
        section: targetDraft?.section,
        actor: currentUser.username,
        actorRole: currentUser.role,
        details: `Editor ${currentUser.username} granted explicit view access for private draft '${targetDraft?.projectName}' to users: [${grantedUsernames.join(', ')}]`
      });
    }
    alert(`Explicit access permissions updated for private draft!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Workflow Governance Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> RBAC Approval Governance Engine
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 font-mono">
                <Key className="w-3.5 h-3.5 text-emerald-400" /> Approver MFA Enforced
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Approval Workflow & Private Drafts Control Center</span>
            </h2>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Strict multi-stage publication pipeline: All Editor changes are saved as isolated private drafts. No modifications reach the live database until submitted and verified by an Approver with MFA authentication.
            </p>
          </div>

          {/* User Context & Role Testing Toolbar */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-indigo-200 font-bold">Active User Credential:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-400/20 text-indigo-200 border border-indigo-300/30 font-mono">
                {currentUser?.fullName || currentUser?.username || 'Guest'} ({currentUser?.role || 'viewer'})
              </span>
            </div>

            {onSelectUserRoleTest && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Quick Credential Test Switcher:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => onSelectUserRoleTest('editor')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                      currentUser?.role === 'editor'
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" /> Editor Role
                  </button>
                  <button
                    onClick={() => onSelectUserRoleTest('approver')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                      currentUser?.role === 'approver'
                        ? 'bg-indigo-500 text-white font-black shadow'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" /> Approver Role
                  </button>
                  <button
                    onClick={() => onSelectUserRoleTest('master_admin')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                      currentUser?.role === 'master_admin'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Shield className="w-3 h-3" /> Master Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex gap-2 pt-6 border-t border-indigo-900/40 mt-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my_drafts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_drafts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Private Drafts</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {myPrivateDrafts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approval_queue')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approval_queue'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Approver Queue</span>
            {pendingApprovalsQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono animate-pulse">
                {pendingApprovalsQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit_log'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Workflow Audit Trail</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY PRIVATE DRAFTS */}
      {activeTab === 'my_drafts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Editor Private Workspaces & Pending Submissions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage private working drafts and view all submitted drafts awaiting approver verification.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter drafts by project or section..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Status Sub-Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>All Submissions & Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-mono">
                {totalDraftsCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('submitted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === 'submitted'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-900'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>⏳ Submitted Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-mono">
                {submittedDraftsCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === 'draft'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>🔒 Working Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono">
                {privateDraftsCount}
              </span>
            </button>

            {revisionsDraftsCount > 0 && (
              <button
                onClick={() => setStatusFilter('changes_requested')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'changes_requested'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-100 border border-orange-200 dark:border-orange-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>⚠️ Changes Requested</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200 font-mono">
                  {revisionsDraftsCount}
                </span>
              </button>
            )}

            {approvedDraftsCount > 0 && (
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>✅ Approved</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-mono">
                  {approvedDraftsCount}
                </span>
              </button>
            )}
          </div>

          {filteredDrafts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {statusFilter === 'submitted'
                  ? 'No Submitted Drafts Found'
                  : statusFilter === 'draft'
                  ? 'No Working Drafts Found'
                  : 'No Drafts Matching Selection'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {statusFilter === 'submitted'
                  ? 'There are currently no submitted drafts pending approval. When an editor submits a draft, it will be displayed here and in the Approver Queue.'
                  : 'When you create or edit content in Editor mode, your changes will automatically be saved here as a private draft until submitted for approval.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrafts.map(draft => {
                const isSubmitted = draft.status === 'submitted' || draft.status === 'pending';
                const isDiffExpanded = expandedDiffId === draft.id;

                const statusStyles = {
                  draft: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300', label: '🔒 Private Draft', icon: Lock },
                  submitted: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border-blue-300', label: '⏳ Submitted for Approval', icon: Send },
                  pending: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border-blue-300', label: '⏳ Pending Review', icon: Clock },
                  changes_requested: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200 border-orange-300', label: '⚠️ Changes Requested', icon: AlertTriangle },
                  rejected: { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300', label: '❌ Rejected', icon: XCircle },
                  approved: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300', label: '✅ Approved & Published', icon: CheckCircle2 },
                };

                const st = statusStyles[draft.status] || statusStyles.draft;
                const StatusIcon = st.icon;

                return (
                  <div
                    key={`draft-card-${draft.id}`}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border shadow-sm hover:shadow-md transition space-y-4 ${
                      isSubmitted
                        ? 'border-blue-300 dark:border-blue-800/80 ring-1 ring-blue-400/20'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase flex items-center gap-1 w-fit mb-1.5 ${st.bg}`}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {draft.projectName}
                        </h4>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          Section: {draft.section}
                        </span>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 font-mono space-y-0.5">
                        <div>Author: <strong className="text-slate-700 dark:text-slate-300">{draft.authorFullName || draft.author}</strong></div>
                        <div>Updated: {new Date(draft.updatedAt).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Submitted Draft Highlight Banner */}
                    {isSubmitted && (
                      <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Submitted for Approver Review
                          </span>
                          <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300">
                            Status: In Approver Queue
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                          This draft has been submitted to the Approver Queue. An Approver must review and commit it to the live database using MFA verification.
                        </p>
                      </div>
                    )}

                    {/* Explicit Access Badge */}
                    {draft.grantedAccessUsernames && draft.grantedAccessUsernames.length > 0 && (
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" /> Explicit Shared Access:
                        </span>
                        <span className="font-mono text-[10px] font-extrabold bg-indigo-200 dark:bg-indigo-900 px-2 py-0.5 rounded-md">
                          {draft.grantedAccessUsernames.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Side-by-side Diff Toggle Button */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedDiffId(isDiffExpanded ? null : draft.id)}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{isDiffExpanded ? 'Hide Side-by-Side Diff' : 'View Side-by-Side Diff Comparison'}</span>
                      </button>
                    </div>

                    {/* Expanded Diff Viewer inside Card */}
                    {isDiffExpanded && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-2.5 font-mono text-xs">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                          <span>Side-by-Side Variance Audit</span>
                          <span className="text-indigo-400">Section: {draft.section}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-rose-400 block">
                              Current Live Main Database State
                            </span>
                            <pre className="text-[10px] text-slate-300 overflow-x-auto p-2 bg-black/40 rounded-lg max-h-40">
                              {JSON.stringify(draft.baselineData || { message: 'Baseline unchanged or new entry' }, null, 2)}
                            </pre>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                              {isSubmitted ? 'Submitted Draft Payload' : 'Editor Working Draft Payload'}
                            </span>
                            <pre className="text-[10px] text-emerald-300 overflow-x-auto p-2 bg-black/40 rounded-lg max-h-40">
                              {JSON.stringify(draft.snapshotData || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approver Feedback Thread Box */}
                    {draft.feedbackHistory && draft.feedbackHistory.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Submission & Feedback Log:
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {draft.feedbackHistory.map((fb, fbIdx) => (
                            <div key={`fb-${fb.id || fbIdx}`} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-slate-400 font-semibold text-[10px]">
                                <span className="text-slate-800 dark:text-slate-200 font-bold">{fb.author} ({fb.authorRole || 'Contributor'})</span>
                                <span>{new Date(fb.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 italic font-medium">
                                "{fb.message}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        {onNavigateToEdit && !isSubmitted && (
                          <button
                            onClick={() => onNavigateToEdit(draft.projectId, draft.section)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Resume Edit
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDraftForAccess(draft);
                            setIsExplicitAccessOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1"
                          title="Explicitly grant view permission to specific users"
                        >
                          <Users className="w-3.5 h-3.5" /> Share Access
                        </button>
                        {!isSubmitted && (
                          <button
                            onClick={() => handleDiscardDraft(draft)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
                            title="Discard private draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Right action button */}
                      {isSubmitted ? (
                        isUserApprover ? (
                          <button
                            onClick={() => setActiveTab('approval_queue')}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Review in Approver Queue
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Locked Awaiting Review
                          </span>
                        )
                      ) : (
                        (draft.status === 'draft' || draft.status === 'changes_requested' || draft.status === 'rejected') && (
                          <button
                            onClick={() => handleSubmitForApproval(draft)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" /> Submit for Approval
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVER QUEUE */}
      {activeTab === 'approval_queue' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
            <h3 className="font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Approver Queue & Side-by-Side Diff Audit
            </h3>
            <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Review editor submissions. Approvers may <strong>Approve</strong>, <strong>Request Changes</strong>, or <strong>Reject</strong>. Approval actions require mandatory MFA code verification. Self-approval is strictly prevented.
            </p>
          </div>

          {pendingApprovalsQueue.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Approver Queue Cleared</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                There are no pending submissions awaiting approver review at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovalsQueue.map(item => {
                const isSelfSubmission = Boolean(
                  currentUser && item.author.toLowerCase() === currentUser.username.toLowerCase()
                );

                const isDiffExpanded = expandedDiffId === item.id;

                return (
                  <div
                    key={`appr-queue-${item.id}`}
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    {/* Submission Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 uppercase">
                            Submitted Draft
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Requested: {new Date(item.updatedAt || item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {item.projectName}
                        </h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                          Target Module / Section: {item.section}
                        </p>
                      </div>

                      <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5 font-mono">
                        <div>Editor Author: <strong className="text-slate-900 dark:text-white">{item.authorFullName || item.author}</strong></div>
                        <div>Credential: <span className="uppercase text-indigo-500 font-bold">Editor</span></div>
                      </div>
                    </div>

                    {/* Self-Approval Warning Box */}
                    {isSelfSubmission && (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                        <span className="font-black flex items-center gap-1 text-rose-700 dark:text-rose-300 uppercase tracking-wider text-[11px]">
                          <AlertTriangle className="w-4 h-4 text-rose-500" /> Self-Approval Governance Prevention Active
                        </span>
                        <p className="leading-relaxed">
                          As the author of this submission (<strong className="underline">{item.author}</strong>), you are strictly forbidden from approving, rejecting, or requesting changes on your own request under RBAC rules. Another user authenticated with Approver credentials must conduct the review.
                        </p>
                      </div>
                    )}

                    {/* Diff Viewer Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedDiffId(isDiffExpanded ? null : item.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span>{isDiffExpanded ? 'Hide Side-by-Side Diff' : 'View Side-by-Side Diff Comparison'}</span>
                      </button>
                    </div>

                    {/* Expanded Diff Viewer */}
                    {isDiffExpanded && (
                      <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2">
                          <span>Side-by-Side Variance Audit</span>
                          <span className="text-indigo-400">Section: {item.section}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-rose-400 block">
                              Current Live Main Database State
                            </span>
                            <pre className="text-[10px] text-slate-300 overflow-x-auto p-2 bg-black/40 rounded-lg max-h-48">
                              {JSON.stringify(item.baselineData || { message: 'Baseline unchanged or new project creation' }, null, 2)}
                            </pre>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                              Editor Submitted Draft Payload
                            </span>
                            <pre className="text-[10px] text-emerald-300 overflow-x-auto p-2 bg-black/40 rounded-lg max-h-48">
                              {JSON.stringify(item.snapshotData || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approver Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenFeedbackModal(item, 'rejected')}
                        disabled={isSelfSubmission || !isUserApprover}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Reject Submission
                      </button>

                      <button
                        onClick={() => handleOpenFeedbackModal(item, 'changes_requested')}
                        disabled={isSelfSubmission || !isUserApprover}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" /> Request Changes
                      </button>

                      <button
                        onClick={() => handleInitiateApprove(item)}
                        disabled={isSelfSubmission || !isUserApprover}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve & Commit (MFA)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WORKFLOW AUDIT TRAIL */}
      {activeTab === 'audit_log' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Workflow Governance Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable record of all draft creations, submissions, MFA challenges, self-approval blocks, and database commits.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Target Project</th>
                    <th className="p-3.5">MFA Status</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No workflow audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => {
                      const actionBadges: Record<string, { bg: string; label: string }> = {
                        DRAFT_CREATED: { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Draft Created' },
                        DRAFT_UPDATED: { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Draft Updated' },
                        ACCESS_GRANTED: { bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300', label: 'Access Shared' },
                        SUBMITTED_FOR_APPROVAL: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', label: 'Submitted' },
                        SELF_APPROVAL_PREVENTED: { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', label: 'Self-Appr Blocked' },
                        MFA_CHALLENGE_VERIFIED: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', label: 'MFA Verified' },
                        APPROVED: { bg: 'bg-emerald-600 text-white', label: 'Approved & Committed' },
                        REJECTED: { bg: 'bg-rose-600 text-white', label: 'Rejected' },
                        CHANGES_REQUESTED: { bg: 'bg-amber-500 text-white', label: 'Changes Requested' },
                        DRAFT_DELETED: { bg: 'bg-slate-200 text-slate-600', label: 'Draft Deleted' },
                      };

                      const badge = actionBadges[log.action] || { bg: 'bg-slate-100 text-slate-700', label: log.action };

                      return (
                        <tr key={`audit-log-${log.id || idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            {log.actor} <span className="text-[10px] text-slate-400 font-normal">({log.actorRole})</span>
                          </td>
                          <td className="p-3.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                            {log.projectName || '—'}
                          </td>
                          <td className="p-3.5 font-mono">
                            {log.mfaUsed ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.details}>
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Explicit Access Grant */}
      <ExplicitAccessModal
        isOpen={isExplicitAccessOpen}
        onClose={() => setIsExplicitAccessOpen(false)}
        draft={selectedDraftForAccess}
        users={currentUser ? [currentUser, { username: 'haile_editor', fullName: 'Haile Gebrselassie', role: 'editor', accessibleProjects: [] }, { username: 'bekele_approver', fullName: 'Bekele Debele', role: 'approver', accessibleProjects: [] }] : []}
        onSaveAccess={handleSaveAccessPermissions}
      />

      {/* MODAL: Feedback input for Reject / Request Changes */}
      {isFeedbackModalOpen && targetSubmissionForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Provide Feedback for Editor ({targetSubmissionForFeedback.author})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target Project: <strong>{targetSubmissionForFeedback.projectName}</strong>
            </p>

            <textarea
              rows={4}
              value={feedbackInputText}
              onChange={e => setFeedbackInputText(e.target.value)}
              placeholder="Type revision request or rejection reason here..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFeedback}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                Proceed to MFA Verification <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MFA Verification */}
      <MfaVerificationModal
        isOpen={isMfaOpen}
        onClose={() => setIsMfaOpen(false)}
        onVerifySuccess={handleMfaVerifiedSuccess}
        approverUser={currentUser}
        actionType={mfaActionType}
        itemTitle={selectedItemForAction ? `${selectedItemForAction.projectName} (${selectedItemForAction.section})` : ''}
      />
    </div>
  );
}

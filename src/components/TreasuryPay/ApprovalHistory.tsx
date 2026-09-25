import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  User, 
  Calendar, 
  History, 
  Sparkles, 
  Filter, 
  Search, 
  ArrowUpDown, 
  Copy, 
  Check, 
  FileText, 
  SendHorizontal, 
  Landmark, 
  ShieldAlert, 
  MessageSquare,
  RefreshCw,
  Tag,
  CheckCheck
} from 'lucide-react';
import { PaymentInstruction, PaymentStatus, ReviewHistoryEntry, EditHistoryEntry, AuditEntry } from '../../types/treasury';
import { TransferAccountRouteCard } from './TransferAccountRouteCard';

export interface ApprovalHistoryProps {
  payment: PaymentInstruction;
  className?: string;
  isCompact?: boolean;
}

export type HistoryEventType = 
  | 'INITIAL_CREATION'
  | 'REVIEW_APPROVAL'
  | 'REVIEW_REJECTION'
  | 'STATE_CHANGE'
  | 'GATEWAY_DISPATCH'
  | 'SETTLEMENT_WEBHOOK'
  | 'DG_REVISION'
  | 'AUDIT_LOG';

export interface NormalizedHistoryEvent {
  id: string;
  timestamp: string;
  dateObj: Date;
  eventType: HistoryEventType;
  actionTitle: string;
  actorName: string;
  actorRole: string;
  previousStatus?: PaymentStatus | 'Draft' | null;
  newStatus?: PaymentStatus;
  reviewerCommentary?: string;
  notes?: string;
  justification?: string;
  decision?: 'APPROVED' | 'REJECTED';
  metadata?: {
    amount?: number;
    currency?: string;
    previousAmount?: number;
    newAmount?: number;
    previousCurrency?: string;
    newCurrency?: string;
    gatewayPlatform?: string;
    gatewayTxId?: string;
    actionTaken?: string;
  };
}

// Utility to render color-coded state badges
export const renderStatusBadge = (status: PaymentStatus | 'Draft') => {
  switch (status) {
    case 'Paid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCheck className="w-3 h-3" />
          Paid
        </span>
      );
    case 'Processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
          Processing
        </span>
      );
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    case 'Failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
          <XCircle className="w-3 h-3" />
          Rejected / Failed
        </span>
      );
    case 'Pending':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          Pending Review
        </span>
      );
  }
};

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({
  payment,
  className = '',
  isCompact = false,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'REVIEWS' | 'STATE_CHANGES' | 'DG_REVISIONS' | 'GATEWAY'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  // Compile and normalize all chronological events
  const allEvents = useMemo(() => {
    const events: NormalizedHistoryEvent[] = [];
    const seenIds = new Set<string>();

    // 1. Initial Creation Event
    if (payment.createdAt) {
      events.push({
        id: `event-creation-${payment.id}`,
        timestamp: payment.createdAt,
        dateObj: new Date(payment.createdAt),
        eventType: 'INITIAL_CREATION',
        actionTitle: 'Payment Instruction Created & Submitted',
        actorName: payment.createdByName || 'Eng. Habtamu Tegegne (Director General)',
        actorRole: 'Director General',
        previousStatus: 'Draft',
        newStatus: 'Pending',
        notes: `Initial instruction submitted for ${payment.currency} ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} under project ${payment.projectReference}. Beneficiary: ${payment.payee.name}.`,
        metadata: {
          amount: payment.amount,
          currency: payment.currency,
        }
      });
      seenIds.add(`event-creation-${payment.id}`);
    }

    // 2. Director General Edit / Revision Events
    if (payment.editHistory && payment.editHistory.length > 0) {
      payment.editHistory.forEach((edit, idx) => {
        const id = edit.id || `edit-${idx}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          events.push({
            id,
            timestamp: edit.timestamp,
            dateObj: new Date(edit.timestamp),
            eventType: 'DG_REVISION',
            actionTitle: edit.actionTaken ? `Terms Revision: ${edit.actionTaken.replace(/_/g, ' ')}` : 'Director General Revision',
            actorName: edit.editorName || 'Eng. Habtamu Tegegne',
            actorRole: edit.editorRole || 'Director General',
            previousStatus: edit.previousStatus,
            newStatus: edit.newStatus,
            justification: edit.justification,
            notes: `Terms modified: ${edit.previousCurrency} ${edit.previousAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} → ${edit.newCurrency} ${edit.newAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Justification: "${edit.justification}"`,
            metadata: {
              previousAmount: edit.previousAmount,
              newAmount: edit.newAmount,
              previousCurrency: edit.previousCurrency,
              newCurrency: edit.newCurrency,
              actionTaken: edit.actionTaken
            }
          });
        }
      });
    }

    // 3. Review History Entries (Mandatory Reviewer Commentary & Formal Decision)
    if (payment.reviewHistory && payment.reviewHistory.length > 0) {
      payment.reviewHistory.forEach((rev, idx) => {
        const id = rev.id || `rev-${idx}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          events.push({
            id,
            timestamp: rev.timestamp,
            dateObj: new Date(rev.timestamp),
            eventType: rev.decision === 'APPROVED' ? 'REVIEW_APPROVAL' : 'REVIEW_REJECTION',
            actionTitle: rev.decision === 'APPROVED' 
              ? 'Payment Instruction Authorized by Financial Director' 
              : 'Payment Instruction Rejected by Financial Director',
            actorName: rev.reviewerName || 'Ato Berhanu Zeleke',
            actorRole: rev.reviewerRole || 'Financial Management Director',
            decision: rev.decision,
            previousStatus: rev.previousStatus || 'Pending',
            newStatus: rev.newStatus,
            reviewerCommentary: rev.reviewerCommentary,
            notes: rev.reviewerCommentary
          });
        }
      });
    } else {
      // Legacy fallback for records with approvedAt or rejectedAt
      if (payment.approvedAt && (payment.reviewerCommentary || payment.approvalNotes)) {
        events.push({
          id: `legacy-appr-${payment.id}`,
          timestamp: payment.approvedAt,
          dateObj: new Date(payment.approvedAt),
          eventType: 'REVIEW_APPROVAL',
          actionTitle: 'Payment Instruction Authorized by Financial Director',
          actorName: payment.approvedByName || 'Ato Berhanu Zeleke (Financial Director)',
          actorRole: payment.approvedByRole || 'Financial Management Director',
          decision: 'APPROVED',
          previousStatus: 'Pending',
          newStatus: 'Approved',
          reviewerCommentary: payment.reviewerCommentary || payment.approvalNotes || 'Authorized against verified IPC documentation.',
          notes: payment.reviewerCommentary || payment.approvalNotes
        });
      } else if (payment.rejectedAt && (payment.reviewerCommentary || payment.rejectionReason)) {
        events.push({
          id: `legacy-rej-${payment.id}`,
          timestamp: payment.rejectedAt,
          dateObj: new Date(payment.rejectedAt),
          eventType: 'REVIEW_REJECTION',
          actionTitle: 'Payment Instruction Rejected by Financial Director',
          actorName: 'Ato Berhanu Zeleke (Financial Director)',
          actorRole: 'Financial Management Director',
          decision: 'REJECTED',
          previousStatus: 'Pending',
          newStatus: 'Failed',
          reviewerCommentary: payment.reviewerCommentary || payment.rejectionReason || 'Compliance validation failed.',
          notes: payment.reviewerCommentary || payment.rejectionReason
        });
      }
    }

    // 4. Gateway Dispatch (Dispatched to Bank Transfer Gateway)
    if (payment.executedAt || (payment.gatewayTransactionId && payment.status !== 'Pending')) {
      const execTime = payment.executedAt || payment.approvedAt || payment.createdAt;
      events.push({
        id: `gateway-dispatch-${payment.id}`,
        timestamp: execTime,
        dateObj: new Date(execTime),
        eventType: 'GATEWAY_DISPATCH',
        actionTitle: `Dispatched to Bank Gateway (${payment.gatewayPlatform || 'Adyen BalancePlatform'})`,
        actorName: payment.approvedByName || 'Ato Berhanu Zeleke',
        actorRole: 'Financial Management Director',
        previousStatus: 'Approved',
        newStatus: 'Processing',
        notes: `Instruction transferred to ${payment.gatewayPlatform || 'Adyen BalancePlatform'}. Assigned Gateway Tx ID: ${payment.gatewayTransactionId || 'ADY-TRF-PENDING'}. Awaiting 200 OK webhook acknowledgement.`,
        metadata: {
          gatewayPlatform: payment.gatewayPlatform || 'Adyen BalancePlatform',
          gatewayTxId: payment.gatewayTransactionId
        }
      });
    }

    // 5. Settlement via Webhook (Paid in Bank)
    if (payment.paidAt || payment.status === 'Paid') {
      const paidTime = payment.paidAt || (payment.executedAt ? new Date(new Date(payment.executedAt).getTime() + 180000).toISOString() : new Date().toISOString());
      events.push({
        id: `webhook-settle-${payment.id}`,
        timestamp: paidTime,
        dateObj: new Date(paidTime),
        eventType: 'SETTLEMENT_WEBHOOK',
        actionTitle: 'Disbursement Settled via 200 OK Bank Webhook',
        actorName: `${payment.gatewayPlatform || 'Adyen BalancePlatform'} Webhook Engine`,
        actorRole: 'Automated Settlement Gateway',
        previousStatus: 'Processing',
        newStatus: 'Paid',
        notes: `Bank confirmed final fund transfer into ${payment.destinationBank.bankName} Account ${payment.destinationBank.accountNumber}. Webhook Event ID: ${payment.webhookEventId || 'whk-200-ok'}. Status set to Settled/Paid.`,
        metadata: {
          gatewayPlatform: payment.gatewayPlatform,
          gatewayTxId: payment.gatewayTransactionId
        }
      });
    }

    // 6. Additional Audit Trail entries (deduplicate if already captured above)
    if (payment.auditTrail && payment.auditTrail.length > 0) {
      payment.auditTrail.forEach((audit) => {
        // Skip if exact same action and timestamp within 5 seconds already in events
        const isDuplicate = events.some(e => {
          const timeDiff = Math.abs(e.dateObj.getTime() - new Date(audit.timestamp).getTime());
          return timeDiff < 5000 && (
            (audit.action === 'INSTRUCTION_CREATED' && e.eventType === 'INITIAL_CREATION') ||
            (audit.action === 'INSTRUCTION_APPROVED' && e.eventType === 'REVIEW_APPROVAL') ||
            (audit.action === 'INSTRUCTION_REJECTED' && e.eventType === 'REVIEW_REJECTION') ||
            (audit.action === 'GATEWAY_DISPATCHED' && e.eventType === 'GATEWAY_DISPATCH') ||
            (audit.action === 'DG_EDIT' && e.eventType === 'DG_REVISION')
          );
        });

        if (!isDuplicate && !seenIds.has(audit.id)) {
          seenIds.add(audit.id);
          events.push({
            id: audit.id,
            timestamp: audit.timestamp,
            dateObj: new Date(audit.timestamp),
            eventType: 'AUDIT_LOG',
            actionTitle: audit.action.replace(/_/g, ' '),
            actorName: audit.actor,
            actorRole: audit.role,
            notes: audit.notes
          });
        }
      });
    }

    return events;
  }, [payment]);

  // Filtered and Sorted Events
  const displayedEvents = useMemo(() => {
    return allEvents
      .filter((ev) => {
        // Category filter
        if (filterType === 'REVIEWS') {
          if (ev.eventType !== 'REVIEW_APPROVAL' && ev.eventType !== 'REVIEW_REJECTION') return false;
        } else if (filterType === 'STATE_CHANGES') {
          if (!ev.newStatus) return false;
        } else if (filterType === 'DG_REVISIONS') {
          if (ev.eventType !== 'DG_REVISION') return false;
        } else if (filterType === 'GATEWAY') {
          if (ev.eventType !== 'GATEWAY_DISPATCH' && ev.eventType !== 'SETTLEMENT_WEBHOOK') return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = ev.actionTitle.toLowerCase().includes(q);
          const matchActor = ev.actorName.toLowerCase().includes(q) || ev.actorRole.toLowerCase().includes(q);
          const matchComment = ev.reviewerCommentary?.toLowerCase().includes(q) || false;
          const matchNotes = ev.notes?.toLowerCase().includes(q) || false;
          const matchJustification = ev.justification?.toLowerCase().includes(q) || false;
          return matchTitle || matchActor || matchComment || matchNotes || matchJustification;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.dateObj.getTime();
        const timeB = b.dateObj.getTime();
        return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
      });
  }, [allEvents, filterType, sortOrder, searchQuery]);

  // Copy plain-text audit summary to clipboard
  const handleCopyAuditSummary = () => {
    const summaryLines = [
      `=============================================================`,
      `ETHIOPIAN ROADS ADMINISTRATION - APPROVAL & AUDIT HISTORY LOG`,
      `Payment Instruction ID: ${payment.id}`,
      `Project Reference: ${payment.projectReference} (${payment.projectName})`,
      `Current Status: ${payment.status} | Total Amount: ${payment.currency} ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Generated At: ${new Date().toISOString()}`,
      `=============================================================`,
      ``
    ];

    displayedEvents.forEach((ev, idx) => {
      summaryLines.push(
        `[#${idx + 1}] ${ev.dateObj.toLocaleString()} | ${ev.actionTitle}`,
        `    Actor: ${ev.actorName} (${ev.actorRole})`,
        ev.previousStatus && ev.newStatus ? `    State Change: ${ev.previousStatus} -> ${ev.newStatus}` : '',
        ev.reviewerCommentary ? `    Reviewer Commentary: "${ev.reviewerCommentary}"` : '',
        ev.justification ? `    DG Justification: "${ev.justification}"` : '',
        ev.notes && ev.notes !== ev.reviewerCommentary ? `    Notes: ${ev.notes}` : '',
        `-------------------------------------------------------------`
      );
    });

    const textToCopy = summaryLines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Metrics for header
  const reviewCount = allEvents.filter(e => e.eventType === 'REVIEW_APPROVAL' || e.eventType === 'REVIEW_REJECTION').length;
  const stateChangeCount = allEvents.filter(e => Boolean(e.newStatus)).length;
  const dgRevisionCount = allEvents.filter(e => e.eventType === 'DG_REVISION').length;
  const gatewayCount = allEvents.filter(e => e.eventType === 'GATEWAY_DISPATCH' || e.eventType === 'SETTLEMENT_WEBHOOK').length;

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Component Header & Stats Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Approval & State Change History
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {allEvents.length} Lifecycle Events
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chronological audit log tracking state transitions, reviewer comments, and authorized users.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyAuditSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              title="Copy formatted approval log to clipboard"
            >
              {hasCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Audit Log</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Current State
            </span>
            <div className="mt-1">
              {renderStatusBadge(payment.status)}
            </div>
          </div>

          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Reviewer Decisions
            </span>
            <div className="mt-1 font-mono font-extrabold text-blue-300">
              {reviewCount} {reviewCount === 1 ? 'Recorded Review' : 'Recorded Reviews'}
            </div>
          </div>

          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              State Transitions
            </span>
            <div className="mt-1 font-mono font-extrabold text-emerald-300">
              {stateChangeCount} Status Changes
            </div>
          </div>

          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              DG Revisions
            </span>
            <div className="mt-1 font-mono font-extrabold text-amber-300">
              {dgRevisionCount} {dgRevisionCount === 1 ? 'Term Modification' : 'Term Modifications'}
            </div>
          </div>
        </div>

        {/* Surface Verified FROM and TO Account details & IBANs in Approval History */}
        <TransferAccountRouteCard 
          payment={payment} 
          variant="approval_banner" 
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer comments, actor name, or action..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All ({allEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('REVIEWS')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              filterType === 'REVIEWS'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Reviews & Comments ({reviewCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('STATE_CHANGES')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              filterType === 'STATE_CHANGES'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            State Changes ({stateChangeCount})
          </button>
          {dgRevisionCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('DG_REVISIONS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                filterType === 'DG_REVISIONS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              DG Revisions ({dgRevisionCount})
            </button>
          )}
          {gatewayCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('GATEWAY')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                filterType === 'GATEWAY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Gateway & Webhooks ({gatewayCount})
            </button>
          )}
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Toggle chronological sorting"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
        </button>

      </div>

      {/* Main Chronological Timeline */}
      {displayedEvents.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {displayedEvents.map((event, index) => {
            const isApproved = event.eventType === 'REVIEW_APPROVAL';
            const isRejected = event.eventType === 'REVIEW_REJECTION';
            const isCreation = event.eventType === 'INITIAL_CREATION';
            const isRevision = event.eventType === 'DG_REVISION';
            const isGateway = event.eventType === 'GATEWAY_DISPATCH';
            const isSettlement = event.eventType === 'SETTLEMENT_WEBHOOK';

            return (
              <div 
                key={event.id}
                className="relative group animate-in fade-in slide-in-from-left-2 duration-150"
              >
                {/* Timeline Node Dot */}
                <div className={`absolute -left-6 sm:-left-8 top-3.5 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-xs z-10 ${
                  isApproved 
                    ? 'bg-emerald-500 border-white dark:border-slate-900 text-white' 
                    : isRejected 
                    ? 'bg-rose-500 border-white dark:border-slate-900 text-white'
                    : isRevision
                    ? 'bg-amber-500 border-white dark:border-slate-900 text-white'
                    : isGateway
                    ? 'bg-indigo-500 border-white dark:border-slate-900 text-white'
                    : isSettlement
                    ? 'bg-teal-500 border-white dark:border-slate-900 text-white'
                    : isCreation
                    ? 'bg-blue-500 border-white dark:border-slate-900 text-white'
                    : 'bg-slate-500 border-white dark:border-slate-900 text-white'
                }`}>
                  {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isRejected && <XCircle className="w-3.5 h-3.5" />}
                  {isRevision && <History className="w-3.5 h-3.5" />}
                  {isGateway && <SendHorizontal className="w-3 h-3" />}
                  {isSettlement && <CheckCheck className="w-3.5 h-3.5" />}
                  {isCreation && <FileText className="w-3.5 h-3.5" />}
                  {!isApproved && !isRejected && !isRevision && !isGateway && !isSettlement && !isCreation && (
                    <Clock className="w-3 h-3" />
                  )}
                </div>

                {/* Event Card Container */}
                <div className={`p-4 rounded-2xl border transition shadow-xs ${
                  isApproved
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                    : isRejected
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : isRevision
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                  
                  {/* Card Header: Action Title, State Change Badge, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2.5 mb-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Event Category Tag */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                          isApproved ? 'bg-emerald-600 text-white' :
                          isRejected ? 'bg-rose-600 text-white' :
                          isRevision ? 'bg-amber-600 text-white' :
                          isGateway ? 'bg-indigo-600 text-white' :
                          isSettlement ? 'bg-teal-600 text-white' :
                          isCreation ? 'bg-blue-600 text-white' :
                          'bg-slate-600 text-white'
                        }`}>
                          {event.eventType.replace(/_/g, ' ')}
                        </span>

                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {event.actionTitle}
                        </span>
                      </div>

                      {/* State Change Transition Indicator */}
                      {event.newStatus && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span className="text-slate-400 font-bold uppercase text-[9.5px]">
                            Status Transition:
                          </span>
                          {event.previousStatus && (
                            <>
                              <span className="text-slate-500 font-semibold">
                                {event.previousStatus}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </>
                          )}
                          <span className="font-black text-slate-900 dark:text-white">
                            {renderStatusBadge(event.newStatus)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right sm:shrink-0">
                      <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 sm:justify-end">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {event.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="opacity-70 font-normal">
                          {event.dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Log Entry #{sortOrder === 'DESC' ? displayedEvents.length - index : index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: User Who Performed the Action */}
                  <div className="flex items-center justify-between gap-3 text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                          Action Performed By
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {event.actorName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {event.actorRole}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reviewer Commentary (Prominent Required Callout) */}
                  {event.reviewerCommentary && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/80 shadow-xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Mandatory Reviewer Commentary</span>
                        <span className="text-slate-400 font-normal ml-auto">
                          Financial Governance Audit Trail
                        </span>
                      </div>
                      <p className="text-xs italic text-slate-800 dark:text-slate-200 leading-relaxed pl-2 border-l-2 border-blue-500">
                        "{event.reviewerCommentary}"
                      </p>
                    </div>
                  )}

                  {/* DG Terms Revision Diff (Amount / Currency / Justification) */}
                  {isRevision && event.metadata && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 line-through">
                          {event.metadata.previousCurrency} {event.metadata.previousAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-black text-slate-900 dark:text-white">
                          {event.metadata.newCurrency} {event.metadata.newAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {event.metadata.actionTaken && (
                          <span className="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {event.metadata.actionTaken}
                          </span>
                        )}
                      </div>

                      {event.justification && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                          <strong>DG Justification:</strong> "{event.justification}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Gateway Technical Details */}
                  {(isGateway || isSettlement) && event.metadata?.gatewayTxId && (
                    <div className="mt-2 flex items-center gap-2 text-[10.5px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Landmark className="w-3 h-3 text-indigo-500" />
                      <span>Platform: <strong>{event.metadata.gatewayPlatform}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span>Tx ID: <strong className="text-indigo-600 dark:text-indigo-400">{event.metadata.gatewayTxId}</strong></span>
                    </div>
                  )}

                  {/* General Event Notes (if not already displayed as reviewerCommentary) */}
                  {event.notes && !event.reviewerCommentary && !isRevision && (
                    <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                      {event.notes}
                    </p>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
          <Clock className="w-8 h-8 mx-auto opacity-50 text-slate-400" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            No approval history events match your filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterType('ALL');
              setSearchQuery('');
            }}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Footer Audit Integrity Watermark */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-500">
        <span className="flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Immutable Ethiopian Roads Administration Treasury Audit Ledger
        </span>
        <span className="font-mono text-slate-400">
          Record ID: {payment.id} • Security Stamp: Verified
        </span>
      </div>

    </div>
  );
};

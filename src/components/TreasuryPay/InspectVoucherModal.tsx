import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  SendHorizontal, 
  FileText, 
  AlertTriangle, 
  Sparkles, 
  Landmark, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  History, 
  ShieldCheck, 
  User, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  Edit3,
  MessageSquare,
  ShieldAlert,
  QrCode,
  HelpCircle
} from 'lucide-react';
import { PaymentInstruction, ActiveRole } from '../../types/treasury';
import { requestClarificationOnInstruction } from '../../lib/treasuryApi';
import { ApprovalHistory } from './ApprovalHistory';
import { ApprovalHierarchy } from './ApprovalHierarchy';
import { TransferAccountRouteCard } from './TransferAccountRouteCard';
import { PaymentQrCodeModal } from './PaymentQrCodeModal';

interface InspectVoucherModalProps {
  payment: PaymentInstruction | null;
  isOpen: boolean;
  onClose: () => void;
  activeRole: ActiveRole;
  onApprove: (id: string, notes: string) => Promise<void> | void;
  onReject: (id: string, reason: string) => Promise<void> | void;
  onExecuteTransfer: (
    id: string, 
    gatewayPlatform: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway'
  ) => Promise<void> | void;
  onOpenSimulatorForPayment: (payment: PaymentInstruction) => void;
  onOpenWebhookLog: (logId?: string) => void;
  onOpenEditModal?: (payment: PaymentInstruction) => void;
  onOpenEditHistoryModal?: (payment: PaymentInstruction) => void;
  initialTab?: 'dossier' | 'approval_history';
}

export const InspectVoucherModal: React.FC<InspectVoucherModalProps> = ({
  payment,
  isOpen,
  onClose,
  activeRole,
  onApprove,
  onReject,
  onExecuteTransfer,
  onOpenSimulatorForPayment,
  onOpenWebhookLog,
  onOpenEditModal,
  onOpenEditHistoryModal,
  initialTab = 'dossier',
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'approval_history'>(initialTab);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Required Reviewer Commentary state
  const [reviewDecision, setReviewDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewerCommentary, setReviewerCommentary] = useState('');
  const [commentaryError, setCommentaryError] = useState<string | null>(null);

  const [selectedGateway, setSelectedGateway] = useState<'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway'>(
    'Adyen BalancePlatform'
  );
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Clarification request state
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);
  const [clarificationTargetRole, setClarificationTargetRole] = useState<'DEPARTMENT_HEAD' | 'FINANCIAL_DIRECTOR'>('DEPARTMENT_HEAD');
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [clarificationError, setClarificationError] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const handleStartClarification = (targetRole: 'DEPARTMENT_HEAD' | 'FINANCIAL_DIRECTOR') => {
    setClarificationTargetRole(targetRole);
    setClarificationQuestion('');
    setClarificationError(null);
    setIsClarificationOpen(true);
    setReviewDecision(null);
  };

  const handleSubmitClarification = async () => {
    const trimmed = clarificationQuestion.trim();
    if (!trimmed) {
      setClarificationError('Please enter the clarification query or information requested.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await requestClarificationOnInstruction(payment.id, clarificationTargetRole, trimmed, activeRole);
      setIsClarificationOpen(false);
      setClarificationQuestion('');
      onClose();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleStartReview = (decision: 'APPROVE' | 'REJECT') => {
    setReviewDecision(decision);
    setCommentaryError(null);
    if (!reviewerCommentary) {
      if (decision === 'APPROVE') {
        setReviewerCommentary('Verified against certified IPC valuation and valid MoR tax clearance. Authorized for treasury gateway transfer.');
      } else {
        setReviewerCommentary('Payment instruction rejected: statutory withholding tax or supporting voucher verification failed.');
      }
    }
  };

  const handleCancelReview = () => {
    setReviewDecision(null);
    setCommentaryError(null);
  };

  const handleSubmitReviewDecision = async () => {
    const trimmed = reviewerCommentary.trim();
    if (!trimmed) {
      setCommentaryError('Reviewer Commentary is required by financial governance policy to finalize this decision.');
      return;
    }

    setIsProcessingAction(true);
    try {
      if (reviewDecision === 'APPROVE') {
        await onApprove(payment.id, trimmed);
      } else if (reviewDecision === 'REJECT') {
        await onReject(payment.id, trimmed);
      }
      setReviewDecision(null);
      onClose();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExecute = async () => {
    setIsProcessingAction(true);
    try {
      await onExecuteTransfer(payment.id, selectedGateway);
      onClose();
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Compile review history list
  const reviews = payment.reviewHistory && payment.reviewHistory.length > 0 
    ? payment.reviewHistory 
    : (payment.reviewerCommentary || payment.approvalNotes || payment.rejectionReason)
      ? [{
          id: 'rev-legacy-1',
          timestamp: payment.approvedAt || payment.rejectedAt || payment.createdAt,
          reviewerName: payment.approvedByName || 'Financial Management Director',
          reviewerRole: 'Financial Management Director',
          decision: (payment.status === 'Approved' || payment.status === 'Paid' || payment.status === 'Processing') 
            ? ('APPROVED' as const) 
            : ('REJECTED' as const),
          reviewerCommentary: payment.reviewerCommentary || payment.approvalNotes || payment.rejectionReason || 'Mandatory review notes recorded.',
          newStatus: payment.status
        }]
      : [];

  const editHistory = payment.editHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-md font-mono text-indigo-300 border border-slate-700">
                  {payment.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Ref: {payment.projectReference}
                </span>
                {editHistory.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {editHistory.length} DG Revisions
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Payment Voucher & Bank Gateway Inspection Dossier
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 px-5 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl font-bold transition cursor-pointer border-t-2 ${
              activeTab === 'dossier'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Voucher & Banking Dossier</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approval_history')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl font-bold transition cursor-pointer border-t-2 ${
              activeTab === 'approval_history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approval History & State Changes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {reviews.length + (payment.auditTrail?.length || 0)} Events
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          
          {activeTab === 'approval_history' ? (
            /* Dedicated Approval History View */
            <div className="space-y-6">
              <ApprovalHierarchy payment={payment} />
              <ApprovalHistory payment={payment} />
            </div>
          ) : (
            /* Standard Dossier View */
            <>
              {/* Top Key Info Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Authorized Disbursement Amount
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-2">
                    <span>{payment.currency}</span>
                    <span>{payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-mono font-normal text-slate-500">
                      via {payment.linkedBankAccountId.replace('acc_', '').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition cursor-pointer shadow-2xs"
                      title="Generate Mobile Banking Payment QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Generate Payment QR Code</span>
                    </button>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border uppercase tracking-wider ${
                      payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                      payment.status === 'Processing' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300' :
                      payment.status === 'Approved' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' :
                      payment.status === 'Failed' ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300' :
                      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {payment.status === 'Processing' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      )}
                      {payment.status === 'Paid' && <Check className="w-3.5 h-3.5" />}
                      {payment.status}
                    </span>
                  </div>

                  {payment.gatewayTransactionId && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Gateway Tx: <strong>{payment.gatewayTransactionId}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Approval Hierarchy & Signature Flow Pipeline */}
              <ApprovalHierarchy payment={payment} />

              {/* Transfer Account Route: FROM Treasury Account ➔ TO Beneficiary Account */}
              <TransferAccountRouteCard 
                payment={payment} 
                variant="detailed" 
                onGenerateQr={() => setIsQrModalOpen(true)}
              />

              {/* Project & Purpose Mandate */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Contractual Purpose & Project Allocation
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  {payment.projectName}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  {payment.purpose}
                </p>
              </div>

              {/* Attached Supporting Documents */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Attached Payment Documents & Verification Vouchers ({payment.supportingDocuments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {payment.supportingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                            {doc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {doc.type} • {doc.fileSize} • Ref: {doc.referenceCode}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {doc.verificationStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Integrated Approval History Component */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Chronological Approval & State Change Log
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('approval_history')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Focus Mode & Advanced Filters <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ApprovalHistory payment={payment} />
              </div>

              {/* SECTION: Director General Edit History Log */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Director General Edit History Log ({editHistory.length} {editHistory.length === 1 ? 'Revision' : 'Revisions'})
                  </span>
                  {editHistory.length > 0 && onOpenEditHistoryModal && (
                    <button
                      type="button"
                      onClick={() => onOpenEditHistoryModal(payment)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Expand Full Log Modal <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {editHistory.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-hidden text-xs">
                    {editHistory.map((entry, idx) => (
                      <div key={entry.id || idx} className="p-3 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {entry.actionTaken.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {entry.editorName} ({entry.editorRole})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 line-through">
                            {entry.previousCurrency} {entry.previousAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {entry.newCurrency} {entry.newAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 ml-auto text-[10px]">
                            Status: {entry.previousStatus} → <strong>{entry.newStatus}</strong>
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          Reason: "{entry.justification}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                    <span>Original payment terms intact. No Director General edits have been logged for this instruction.</span>
                    {activeRole === 'DIRECTOR_GENERAL' && payment.status !== 'Paid' && onOpenEditModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEditModal(payment);
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Edit Amount & Currency
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* FINANCIAL DIRECTOR REVIEW DECISION PROMPT (WHEN APPROVING/REJECTING PENDING INSTRUCTION) */}
        {activeRole === 'FINANCIAL_DIRECTOR' && payment.status === 'Pending' && reviewDecision && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-amber-50/70 dark:bg-slate-850 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black uppercase tracking-wider ${
                  reviewDecision === 'APPROVE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {reviewDecision === 'APPROVE' ? 'Approving Payment' : 'Rejecting Payment'}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Required Reviewer Commentary & Account Verification
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReview}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                Cancel Decision
              </button>
            </div>

            {/* PROMINENT ACCOUNT VERIFICATION CARD SURFACED DIRECTLY IN APPROVAL FLOW */}
            <TransferAccountRouteCard 
              payment={payment} 
              variant="approval_banner" 
              highlightForApproval={true} 
              onGenerateQr={() => setIsQrModalOpen(true)}
            />

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mandatory Reviewer Commentary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reviewerCommentary}
                onChange={(e) => {
                  setReviewerCommentary(e.target.value);
                  if (commentaryError && e.target.value.trim()) setCommentaryError(null);
                }}
                placeholder={reviewDecision === 'APPROVE' 
                  ? 'Enter mandatory commentary verifying IPC calculation, bank coordinates, and statutory tax clearances...' 
                  : 'Enter mandatory commentary specifying reasons for rejection, missing compliance vouchers, or invoice errors...'
                }
                className={`w-full p-3 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition ${
                  commentaryError 
                    ? 'border-rose-500 ring-2 ring-rose-500/20' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              {commentaryError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {commentaryError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelReview}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleSubmitReviewDecision}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer ${
                  reviewDecision === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {reviewDecision === 'APPROVE' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Recommend & Save Commentary</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Rejection & Save Commentary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CLARIFICATION REQUEST PROMPT CARD */}
        {isClarificationOpen && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-slate-850 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Request Clarification from {clarificationTargetRole.replace('_', ' ')}
              </span>
              <button
                type="button"
                onClick={() => setIsClarificationOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Clarification Notes & Specific Information Requested <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={clarificationQuestion}
                onChange={(e) => {
                  setClarificationQuestion(e.target.value);
                  if (clarificationError && e.target.value.trim()) setClarificationError(null);
                }}
                placeholder={`Enter specific questions or documentation requests for ${clarificationTargetRole.replace('_', ' ')}...`}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              {clarificationError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {clarificationError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClarificationOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleSubmitClarification}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Submit Clarification Request</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer / Role Action Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="text-xs text-slate-500">
            {payment.status === 'Processing' && (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                In Bank Transit. Webhook callback will update status to Paid automatically.
              </span>
            )}
            {payment.status === 'Paid' && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Settled in Bank. 200 OK webhook acknowledged.
              </span>
            )}
            {payment.status === 'Pending' && activeRole === 'FINANCIAL_DIRECTOR' && !reviewDecision && !isClarificationOpen && (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Check, Edit, Recommend for DG authorization, Reject, or Request Clarification.
              </span>
            )}
            {activeRole === 'DIRECTOR_GENERAL' && payment.status === 'Approved' && !isClarificationOpen && (
              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Recommended by Financial Directorate. Ready for DG Final Payment Approval & Disbursal.
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            {/* Generate Mobile Payment QR Code Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs"
              title="Generate Scannable Mobile Banking QR Code (ISO 20022 / EthSwitch)"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Payment QR Code</span>
            </button>

            {/* Quick Webhook 200 OK Log Button */}
            {payment.status === 'Paid' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWebhookLog(payment.webhookEventId);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer"
              >
                Inspect 200 OK Webhook Log
              </button>
            )}

            {/* Quick Webhook Simulator Button if Processing */}
            {payment.status === 'Processing' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSimulatorForPayment(payment);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Simulate Webhook Callback (200 OK)
              </button>
            )}

            {/* View Edit History Button */}
            {editHistory.length > 0 && onOpenEditHistoryModal && (
              <button
                type="button"
                onClick={() => onOpenEditHistoryModal(payment)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Edit History ({editHistory.length})</span>
              </button>
            )}

            {/* FINANCIAL DIRECTOR ACTIONS */}
            {activeRole === 'FINANCIAL_DIRECTOR' && payment.status === 'Pending' && !reviewDecision && !isClarificationOpen && (
              <>
                {onOpenEditModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditModal(payment);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 transition cursor-pointer"
                    title="Check and edit payment request details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Check & Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStartClarification('DEPARTMENT_HEAD')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 transition cursor-pointer"
                  title="Request clarification from Department Head"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Request Clarification</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartReview('REJECT')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleStartReview('APPROVE')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Recommend to Director General</span>
                </button>
              </>
            )}

            {/* DIRECTOR GENERAL ACTIONS */}
            {activeRole === 'DIRECTOR_GENERAL' && payment.status !== 'Paid' && !isClarificationOpen && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditModal?.(payment);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 transition cursor-pointer"
                  title="Edit payment terms"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartClarification('FINANCIAL_DIRECTOR')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 transition cursor-pointer"
                  title="Request clarification from Financial Directorate"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Request Clarification</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartReview('REJECT')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                >
                  Reject
                </button>
                {payment.status === 'Approved' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedGateway}
                      onChange={(e) => setSelectedGateway(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="Adyen BalancePlatform">Adyen BalancePlatform</option>
                      <option value="Yapily ISO 20022">Yapily ISO 20022 Open Banking</option>
                      <option value="CBE RTGS Gateway">CBE RTGS National Payment Gateway</option>
                    </select>
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={handleExecute}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
                      title="Director General Final Payment Approval & Disbursal"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      <span>Final Payment Approval & Disburse</span>
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>

      </div>

      {/* Scannable Mobile Banking QR Code Modal */}
      <PaymentQrCodeModal
        payment={payment}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};

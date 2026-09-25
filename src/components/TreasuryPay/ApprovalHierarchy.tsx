import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  User, 
  ShieldCheck, 
  FileText, 
  Landmark, 
  Check, 
  Calendar, 
  Building2, 
  BadgeCheck, 
  ChevronDown, 
  ChevronUp, 
  FileCheck2, 
  SendHorizontal, 
  Sparkles, 
  Copy,
  Info
} from 'lucide-react';
import { PaymentInstruction, PaymentStatus } from '../../types/treasury';

export interface ApprovalHierarchyProps {
  payment: PaymentInstruction;
  className?: string;
  isCompact?: boolean;
}

export type StepState = 'COMPLETED' | 'IN_PROGRESS' | 'REJECTED' | 'WAITING';

export interface HierarchyStep {
  id: string;
  stepNumber: number;
  roleTitle: string;
  entityDepartment: string;
  signatoryName: string;
  signatoryTitle: string;
  statusLabel: string;
  stepState: StepState;
  timestamp?: string;
  commentsOrNotes?: string;
  mandateCode?: string;
  iconType: 'DEPT_HEAD' | 'FINANCE_DIRECTOR' | 'DIRECTOR_GENERAL' | 'SETTLEMENT_GATEWAY';
}

export const ApprovalHierarchy: React.FC<ApprovalHierarchyProps> = ({
  payment,
  className = '',
  isCompact = false,
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [hasCopiedChain, setHasCopiedChain] = useState(false);

  // Compute status for each tier in the signature hierarchy chain
  const hierarchySteps: HierarchyStep[] = React.useMemo(() => {
    // -------------------------------------------------------------
    // Step 1: Department Head / Supervising Engineer
    // -------------------------------------------------------------
    const docVerifiedCount = payment.supportingDocuments.filter(d => d.verificationStatus === 'Verified').length;
    const isDocVerified = docVerifiedCount > 0;
    const step1: HierarchyStep = {
      id: 'step-1-dept-head',
      stepNumber: 1,
      roleTitle: 'Department Head & Supervising Engineer',
      entityDepartment: 'Civil Works Engineering & Contract Administration',
      signatoryName: 'Scott Wilson JV / Resident Engineer',
      signatoryTitle: 'Supervising Engineer & Department Head',
      statusLabel: isDocVerified ? 'VERIFIED & ENDORSED' : 'PENDING VERIFICATION',
      stepState: isDocVerified ? 'COMPLETED' : 'IN_PROGRESS',
      timestamp: payment.createdAt,
      commentsOrNotes: `Technical IPC valuation certificate certified. ${docVerifiedCount} of ${payment.supportingDocuments.length} supporting compliance documents verified.`,
      mandateCode: payment.supportingDocuments[0]?.referenceCode || `ERA-VAL-${payment.id.split('-').pop()}`,
      iconType: 'DEPT_HEAD'
    };

    // -------------------------------------------------------------
    // Step 2: Financial Management Director
    // -------------------------------------------------------------
    let step2State: StepState = 'WAITING';
    let step2StatusLabel = 'AWAITING AUDIT';
    let step2Timestamp = payment.approvedAt || payment.rejectedAt;
    let step2Comments = payment.reviewerCommentary || payment.approvalNotes || payment.rejectionReason;

    if (payment.status === 'Approved' || payment.status === 'Processing' || payment.status === 'Paid') {
      step2State = 'COMPLETED';
      step2StatusLabel = 'CLEARED & AUTHORIZED';
      step2Comments = payment.reviewerCommentary || payment.approvalNotes || 'Authorized against verified IPC calculation, tax clearance, and budget code allocation.';
    } else if (payment.status === 'Failed') {
      step2State = 'REJECTED';
      step2StatusLabel = 'REJECTED WITH COMMENTARY';
      step2Comments = payment.reviewerCommentary || payment.rejectionReason || 'Rejected during financial compliance review.';
    } else if (payment.status === 'Pending') {
      step2State = 'IN_PROGRESS';
      step2StatusLabel = 'IN AUDIT REVIEW';
      step2Comments = 'Awaiting formal financial review and mandatory Reviewer Commentary.';
    }

    const step2: HierarchyStep = {
      id: 'step-2-finance-director',
      stepNumber: 2,
      roleTitle: 'Financial Management Director',
      entityDepartment: 'Treasury & Financial Management Directorate',
      signatoryName: payment.approvedByName || 'Ato Berhanu Zeleke',
      signatoryTitle: 'Director of Financial Management',
      statusLabel: step2StatusLabel,
      stepState: step2State,
      timestamp: step2Timestamp,
      commentsOrNotes: step2Comments,
      mandateCode: `FMD-AUTH-${payment.id.replace('PAY-', '')}`,
      iconType: 'FINANCE_DIRECTOR'
    };

    // -------------------------------------------------------------
    // Step 3: Director General & Accounting Officer
    // -------------------------------------------------------------
    let step3State: StepState = 'WAITING';
    let step3StatusLabel = 'AWAITING SIGN-OFF';
    let step3Comments = 'Executive disbursement mandate pending Financial Director clearance.';
    let step3Timestamp: string | undefined = undefined;

    const hasDgEdits = payment.editHistory && payment.editHistory.length > 0;

    if (payment.status === 'Paid') {
      step3State = 'COMPLETED';
      step3StatusLabel = 'MANDATE RELEASED';
      step3Comments = 'Executive disbursement mandate fully executed. Settled in beneficiary account.';
      step3Timestamp = payment.paidAt || payment.executedAt || payment.approvedAt;
    } else if (payment.status === 'Processing') {
      step3State = 'COMPLETED';
      step3StatusLabel = 'TRANSFER ORDER RELEASED';
      step3Comments = 'Disbursement order released and signed for automated bank gateway transfer.';
      step3Timestamp = payment.executedAt || payment.approvedAt;
    } else if (payment.status === 'Approved') {
      step3State = 'COMPLETED';
      step3StatusLabel = 'EXECUTIVE SIGNED';
      step3Comments = 'Terms confirmed. Ready for gateway dispatch by Treasury Desk.';
      step3Timestamp = payment.approvedAt;
    } else if (payment.status === 'Pending') {
      if (hasDgEdits) {
        step3State = 'IN_PROGRESS';
        step3StatusLabel = 'TERMS REVISED BY DG';
        step3Comments = `Director General updated terms: ${payment.editHistory![0].actionTaken.replace(/_/g, ' ')}. Justification: "${payment.editHistory![0].justification}".`;
        step3Timestamp = payment.editHistory![0].timestamp;
      } else {
        step3State = 'IN_PROGRESS';
        step3StatusLabel = 'MANDATE INITIATED';
        step3Comments = 'Disbursement instruction submitted. Queued for Financial Director audit.';
        step3Timestamp = payment.createdAt;
      }
    } else if (payment.status === 'Failed') {
      step3State = 'REJECTED';
      step3StatusLabel = 'VOIDED / HELD';
      step3Comments = 'Payment instruction held and voided due to failed statutory review.';
      step3Timestamp = payment.rejectedAt;
    }

    const step3: HierarchyStep = {
      id: 'step-3-director-general',
      stepNumber: 3,
      roleTitle: 'Director General & Accounting Officer',
      entityDepartment: 'Executive Directorate & Chief Accounting Office',
      signatoryName: payment.createdByName || 'Eng. Habtamu Tegegne',
      signatoryTitle: 'Director General (ERA Accounting Officer)',
      statusLabel: step3StatusLabel,
      stepState: step3State,
      timestamp: step3Timestamp,
      commentsOrNotes: step3Comments,
      mandateCode: `DG-MANDATE-2026-${payment.id.split('-').pop()}`,
      iconType: 'DIRECTOR_GENERAL'
    };

    // -------------------------------------------------------------
    // Step 4: Bank Treasury & Settlement Gateway
    // -------------------------------------------------------------
    let step4State: StepState = 'WAITING';
    let step4StatusLabel = 'QUEUED IN SETTLEMENT POOL';
    let step4Comments = 'Awaiting upstream signature clearance before bank execution.';
    let step4Timestamp: string | undefined = undefined;

    if (payment.status === 'Paid') {
      step4State = 'COMPLETED';
      step4StatusLabel = 'SETTLED (200 OK)';
      step4Comments = `Disbursement successfully settled in ${payment.destinationBank.bankName} Account ${payment.destinationBank.accountNumber}. Webhook acknowledged.`;
      step4Timestamp = payment.paidAt || payment.executedAt;
    } else if (payment.status === 'Processing') {
      step4State = 'IN_PROGRESS';
      step4StatusLabel = 'IN TRANSIT (ISO 20022)';
      step4Comments = `Dispatched to ${payment.gatewayPlatform || 'Adyen BalancePlatform'} with Tx ID ${payment.gatewayTransactionId}. Awaiting settlement webhook.`;
      step4Timestamp = payment.executedAt;
    } else if (payment.status === 'Approved') {
      step4State = 'WAITING';
      step4StatusLabel = 'AWAITING GATEWAY DISPATCH';
      step4Comments = 'Cleared for bank transfer. Awaiting operator dispatch execution.';
    } else if (payment.status === 'Failed') {
      step4State = 'REJECTED';
      step4StatusLabel = 'DISBURSEMENT CANCELLED';
      step4Comments = 'Settlement gateway execution aborted.';
    }

    const step4: HierarchyStep = {
      id: 'step-4-gateway',
      stepNumber: 4,
      roleTitle: 'National Bank & Settlement Gateway',
      entityDepartment: 'Interbank Settlement Network (CBE RTGS / Adyen)',
      signatoryName: `${payment.gatewayPlatform || 'Adyen BalancePlatform'} Engine`,
      signatoryTitle: 'Automated Gateway Protocol',
      statusLabel: step4StatusLabel,
      stepState: step4State,
      timestamp: step4Timestamp,
      commentsOrNotes: step4Comments,
      mandateCode: payment.gatewayTransactionId || `GW-TX-PENDING`,
      iconType: 'SETTLEMENT_GATEWAY'
    };

    return [step1, step2, step3, step4];
  }, [payment]);

  // Overall Completion Progress
  const completedCount = hierarchySteps.filter(s => s.stepState === 'COMPLETED').length;
  const isRejected = hierarchySteps.some(s => s.stepState === 'REJECTED');
  const progressPercent = Math.round((completedCount / hierarchySteps.length) * 100);

  const handleCopyChainSummary = () => {
    const lines = [
      `=============================================================`,
      `ETHIOPIAN ROADS ADMINISTRATION - APPROVAL HIERARCHY CHAIN`,
      `Payment Instruction: ${payment.id} (${payment.projectReference})`,
      `Amount: ${payment.currency} ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Beneficiary: ${payment.payee.name}`,
      `Current Overall Status: ${payment.status}`,
      `=============================================================`,
      ``
    ];

    hierarchySteps.forEach((s) => {
      lines.push(
        `[Level ${s.stepNumber}] ${s.roleTitle}`,
        `    Signatory: ${s.signatoryName} (${s.signatoryTitle})`,
        `    Department: ${s.entityDepartment}`,
        `    Status: ${s.statusLabel} [${s.stepState}]`,
        s.timestamp ? `    Timestamp: ${new Date(s.timestamp).toLocaleString()}` : '    Timestamp: Pending',
        s.mandateCode ? `    Mandate Code: ${s.mandateCode}` : '',
        s.commentsOrNotes ? `    Comments: "${s.commentsOrNotes}"` : '',
        `-------------------------------------------------------------`
      );
    });

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setHasCopiedChain(true);
    setTimeout(() => setHasCopiedChain(false), 2000);
  };

  const getStepIcon = (iconType: HierarchyStep['iconType'], stepState: StepState) => {
    switch (iconType) {
      case 'DEPT_HEAD':
        return <FileCheck2 className="w-4 h-4" />;
      case 'FINANCE_DIRECTOR':
        return <ShieldCheck className="w-4 h-4" />;
      case 'DIRECTOR_GENERAL':
        return <BadgeCheck className="w-4 h-4" />;
      case 'SETTLEMENT_GATEWAY':
        return <Landmark className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      
      {/* Header & Flow Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Approval Hierarchy & Signature Flow
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isRejected
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : progressPercent === 100
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}>
                {isRejected ? 'Chain Interrupted' : `${completedCount} of 4 Signed (${progressPercent}%)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Department Head ➔ Finance Director ➔ Director General ➔ Treasury Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyChainSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Copy approval chain report to clipboard"
          >
            {hasCopiedChain ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Chain Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Hierarchy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isRejected 
              ? 'bg-rose-500' 
              : progressPercent === 100 
              ? 'bg-emerald-500' 
              : 'bg-indigo-600'
          }`}
          style={{ width: `${isRejected ? 50 : progressPercent}%` }}
        />
      </div>

      {/* Pipeline Stepper Visualization (Horizontal Grid on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {hierarchySteps.map((step, idx) => {
          const isCompleted = step.stepState === 'COMPLETED';
          const isInProgress = step.stepState === 'IN_PROGRESS';
          const isStepRejected = step.stepState === 'REJECTED';
          const isWaiting = step.stepState === 'WAITING';
          const isExpanded = expandedStepId === step.id;

          return (
            <div 
              key={step.id}
              className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between ${
                isCompleted
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : isStepRejected
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : isInProgress
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-2 ring-amber-400/20'
                  : 'bg-slate-50/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-80'
              }`}
            >
              {/* Step Top Bar: Level, Node Icon & Directional Arrow */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black font-mono flex items-center justify-center shrink-0 ${
                      isCompleted ? 'bg-emerald-600 text-white' :
                      isStepRejected ? 'bg-rose-600 text-white' :
                      isInProgress ? 'bg-amber-600 text-white' :
                      'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {step.stepNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                      Level {step.stepNumber}
                    </span>
                  </div>

                  {/* Flow Arrow to next node (Desktop only, except last node) */}
                  {idx < hierarchySteps.length - 1 && (
                    <div className="hidden md:flex items-center text-slate-300 dark:text-slate-600">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Role Title & Icon */}
                <div className="flex items-start gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' :
                    isStepRejected ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' :
                    isInProgress ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse' :
                    'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {getStepIcon(step.iconType, step.stepState)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug">
                      {step.roleTitle}
                    </h5>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {step.entityDepartment}
                    </span>
                  </div>
                </div>

                {/* Signatory Coordinates */}
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5 mb-2.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{step.signatoryName}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 truncate pl-4">
                    {step.signatoryTitle}
                  </div>
                </div>
              </div>

              {/* Step Status Badge & Timestamp */}
              <div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase tracking-wider ${
                      isCompleted ? 'bg-emerald-600 text-white' :
                      isStepRejected ? 'bg-rose-600 text-white' :
                      isInProgress ? 'bg-amber-600 text-white' :
                      'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {step.statusLabel}
                    </span>

                    {/* Expand/Collapse details button */}
                    <button
                      type="button"
                      onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {step.timestamp && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(step.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Expanded Card Details (Notes, Mandate Code, Seals) */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/5 space-y-1.5 text-[10.5px] animate-in fade-in slide-in-from-top-1 duration-150">
                    {step.mandateCode && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Mandate Ref:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{step.mandateCode}</strong>
                      </div>
                    )}
                    {step.commentsOrNotes && (
                      <p className="italic text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-black/5 dark:border-white/5">
                        "{step.commentsOrNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Signature Policy Governance Footnote */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Compliant with Ministry of Finance & ERA Statutory Delegation of Authority
        </span>
        <span className="text-slate-400">
          Four-Tier Sequential Sign-Off Protocol
        </span>
      </div>

    </div>
  );
};

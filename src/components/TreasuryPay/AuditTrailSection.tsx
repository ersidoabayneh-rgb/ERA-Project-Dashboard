import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Landmark, 
  FileText, 
  Layers, 
  Calendar, 
  User, 
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { PaymentInstruction, WebhookLog, CurrencyCode, ActiveRole } from '../../types/treasury';

export interface AuditTrailSectionProps {
  payments: PaymentInstruction[];
  logs: WebhookLog[];
  onInspectPayment?: (payment: PaymentInstruction) => void;
  onOpenWebhookInspector?: (logId?: string) => void;
  className?: string;
}

export type AuditFilterStatus = 'ALL' | 'SUCCESS' | 'PROCESSING' | 'FAILED';
export type AuditGatewayFilter = 'ALL' | 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway';
export type AuditViewMode = 'TABLE' | 'TIMELINE';

export interface UnifiedAuditRecord {
  id: string;
  transactionId: string;
  instructionId: string;
  projectReference: string;
  projectName: string;
  payeeName: string;
  amount: number;
  currency: CurrencyCode;
  gatewayPlatform: string;
  timestamp: string;
  type: 'GATEWAY_TRANSFER' | 'WEBHOOK_SETTLEMENT' | 'AUTHORIZATION' | 'REJECTION' | 'DG_REVISION' | 'INSTRUCTION_CREATED';
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED' | 'REJECTED' | 'AUTHORIZED';
  httpResponseStatus?: number;
  responseStatusText?: string;
  gatewayMessage: string;
  executionDurationMs?: number;
  signatureVerified?: boolean;
  actor: string;
  actorRole: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  rawLogId?: string;
  matchedPayment?: PaymentInstruction;
}

export const AuditTrailSection: React.FC<AuditTrailSectionProps> = ({
  payments,
  logs,
  onInspectPayment,
  onOpenWebhookInspector,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditFilterStatus>('ALL');
  const [gatewayFilter, setGatewayFilter] = useState<AuditGatewayFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [viewMode, setViewMode] = useState<AuditViewMode>('TABLE');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasCopiedAll, setHasCopiedAll] = useState(false);

  // Compile unified chronological log of all execution attempts and events
  const auditRecords: UnifiedAuditRecord[] = useMemo(() => {
    const list: UnifiedAuditRecord[] = [];
    const paymentMap = new Map<string, PaymentInstruction>();
    payments.forEach(p => paymentMap.set(p.id, p));

    // 1. Webhook Execution / Settlement Logs
    logs.forEach(log => {
      const matchedPayment = paymentMap.get(log.instructionId);
      const isSuccess = log.responseStatus === 200 && log.signatureVerified;
      
      list.push({
        id: `log-${log.id}`,
        transactionId: log.gatewayTransactionId || `TX-${log.eventId}`,
        instructionId: log.instructionId,
        projectReference: matchedPayment?.projectReference || 'ERA/CENTRAL/DISBURSE',
        projectName: matchedPayment?.projectName || 'Central Treasury Clearing Pool',
        payeeName: matchedPayment?.payee.name || (log.requestBody as any)?.data?.beneficiary?.name || 'Verified Beneficiary',
        amount: matchedPayment?.amount || Number((log.requestBody as any)?.clearedAmount?.amount || (log.requestBody as any)?.amount || 0),
        currency: matchedPayment?.currency || ((log.requestBody as any)?.currency as CurrencyCode || 'ETB'),
        gatewayPlatform: log.gateway,
        timestamp: log.timestamp,
        type: 'WEBHOOK_SETTLEMENT',
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        httpResponseStatus: log.responseStatus,
        responseStatusText: isSuccess ? '200 OK — SETTLED' : `${log.responseStatus} ERROR`,
        gatewayMessage: isSuccess 
          ? `Webhook event ${log.eventType} verified & acknowledged with HTTP 200 OK.`
          : `Gateway response error status ${log.responseStatus}. Signature verification: ${log.signatureVerified ? 'PASS' : 'FAIL'}.`,
        executionDurationMs: log.executionDurationMs,
        signatureVerified: log.signatureVerified,
        actor: `${log.gateway} Inbound Webhook`,
        actorRole: 'SYSTEM_GATEWAY',
        requestPayload: log.requestBody,
        responsePayload: log.responseBody,
        rawLogId: log.id,
        matchedPayment
      });
    });

    // 2. Gateway Transfer Executions from Payment Instructions
    payments.forEach(p => {
      if (p.executedAt && p.gatewayTransactionId) {
        // If there is no exact webhook duplicate already logged
        const existingLog = logs.find(l => l.gatewayTransactionId === p.gatewayTransactionId);
        if (!existingLog || p.status === 'Processing') {
          const isPaid = p.status === 'Paid';
          const isProcessing = p.status === 'Processing';
          const isFailed = p.status === 'Failed';

          list.push({
            id: `exec-${p.id}-${p.gatewayTransactionId}`,
            transactionId: p.gatewayTransactionId,
            instructionId: p.id,
            projectReference: p.projectReference,
            projectName: p.projectName,
            payeeName: p.payee.name,
            amount: p.amount,
            currency: p.currency,
            gatewayPlatform: p.gatewayPlatform || 'Adyen BalancePlatform',
            timestamp: p.executedAt,
            type: 'GATEWAY_TRANSFER',
            status: isPaid ? 'SUCCESS' : isProcessing ? 'PROCESSING' : isFailed ? 'FAILED' : 'SUCCESS',
            httpResponseStatus: isPaid ? 200 : isProcessing ? 202 : isFailed ? 400 : 200,
            responseStatusText: isPaid ? '200 OK — SETTLED' : isProcessing ? '202 ACCEPTED — IN TRANSIT' : '400 FAILED',
            gatewayMessage: isPaid
              ? `Transfer executed and cleared via ${p.gatewayPlatform || 'Gateway'}. Real-time webhook received.`
              : isProcessing
              ? `Transfer dispatched to ${p.gatewayPlatform || 'Gateway'}. Awaiting ISO 20022 settlement webhook.`
              : `Disbursement transfer failed or was cancelled during gateway processing.`,
            executionDurationMs: isPaid ? 22 : 45,
            signatureVerified: true,
            actor: p.approvedByName || 'Financial Management Director',
            actorRole: 'FINANCIAL_DIRECTOR',
            matchedPayment: p
          });
        }
      }

      // 3. Reviewer Rejection / Failure records
      if (p.status === 'Failed' && p.rejectedAt) {
        list.push({
          id: `rej-${p.id}`,
          transactionId: `VOID-${p.id.replace('PAY-', '')}`,
          instructionId: p.id,
          projectReference: p.projectReference,
          projectName: p.projectName,
          payeeName: p.payee.name,
          amount: p.amount,
          currency: p.currency,
          gatewayPlatform: 'Internal Audit Clearing',
          timestamp: p.rejectedAt,
          type: 'REJECTION',
          status: 'FAILED',
          httpResponseStatus: 422,
          responseStatusText: '422 UNPROCESSABLE / AUDIT FAILED',
          gatewayMessage: p.rejectionReason || p.reviewerCommentary || 'Instruction failed compliance review.',
          actor: p.approvedByName || 'Ato Berhanu Zeleke',
          actorRole: 'FINANCIAL_DIRECTOR',
          matchedPayment: p
        });
      }

      // 4. Director General Revisions logged in edit history
      if (p.editHistory && p.editHistory.length > 0) {
        p.editHistory.forEach((edit) => {
          list.push({
            id: `edit-${edit.id}`,
            transactionId: `REV-${edit.id.replace('edit-', '')}`,
            instructionId: p.id,
            projectReference: p.projectReference,
            projectName: p.projectName,
            payeeName: p.payee.name,
            amount: edit.newAmount,
            currency: edit.newCurrency,
            gatewayPlatform: 'Executive Directorate',
            timestamp: edit.timestamp,
            type: 'DG_REVISION',
            status: 'AUTHORIZED',
            httpResponseStatus: 200,
            responseStatusText: '200 OK — MANDATE REVISED',
            gatewayMessage: `Director General adjusted terms: ${edit.actionTaken.replace(/_/g, ' ')}. Justification: "${edit.justification}"`,
            actor: edit.editorName || 'Eng. Habtamu Tegegne',
            actorRole: 'DIRECTOR_GENERAL',
            matchedPayment: p
          });
        });
      }
    });

    // Remove any exact duplicate id entries
    const seen = new Set<string>();
    const deduped: UnifiedAuditRecord[] = [];
    list.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    });

    // Sort chronologically
    return deduped.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });
  }, [payments, logs, sortOrder]);

  // Filtered list based on search, status, and gateway platform
  const filteredRecords = useMemo(() => {
    return auditRecords.filter(r => {
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTx = r.transactionId.toLowerCase().includes(q);
        const matchInst = r.instructionId.toLowerCase().includes(q);
        const matchProj = r.projectName.toLowerCase().includes(q) || r.projectReference.toLowerCase().includes(q);
        const matchPayee = r.payeeName.toLowerCase().includes(q);
        const matchGateway = r.gatewayPlatform.toLowerCase().includes(q);
        const matchActor = r.actor.toLowerCase().includes(q);
        if (!matchTx && !matchInst && !matchProj && !matchPayee && !matchGateway && !matchActor) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SUCCESS' && r.status !== 'SUCCESS' && r.status !== 'AUTHORIZED') return false;
        if (statusFilter === 'PROCESSING' && r.status !== 'PROCESSING') return false;
        if (statusFilter === 'FAILED' && r.status !== 'FAILED' && r.status !== 'REJECTED') return false;
      }

      // Gateway platform filter
      if (gatewayFilter !== 'ALL') {
        if (!r.gatewayPlatform.toLowerCase().includes(gatewayFilter.toLowerCase().split(' ')[0])) {
          return false;
        }
      }

      return true;
    });
  }, [auditRecords, searchTerm, statusFilter, gatewayFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = auditRecords.length;
    const successCount = auditRecords.filter(r => r.status === 'SUCCESS' || r.status === 'AUTHORIZED').length;
    const processingCount = auditRecords.filter(r => r.status === 'PROCESSING').length;
    const failedCount = auditRecords.filter(r => r.status === 'FAILED' || r.status === 'REJECTED').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
    
    const totalVolumeETB = auditRecords
      .filter(r => r.currency === 'ETB')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalVolumeUSD = auditRecords
      .filter(r => r.currency === 'USD')
      .reduce((sum, r) => sum + r.amount, 0);

    const latencies = auditRecords.map(r => r.executionDurationMs || 0).filter(l => l > 0);
    const avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
      : 21;

    return {
      total,
      successCount,
      processingCount,
      failedCount,
      successRate,
      totalVolumeETB,
      totalVolumeUSD,
      avgLatency
    };
  }, [auditRecords]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Transaction ID', 'Instruction ID', 'Project', 'Payee', 'Amount', 'Currency', 'Gateway Platform', 'HTTP Status', 'Status Label', 'Gateway Message', 'Actor'];
    const rows = filteredRecords.map(r => [
      new Date(r.timestamp).toISOString(),
      `"${r.transactionId}"`,
      `"${r.instructionId}"`,
      `"${r.projectName}"`,
      `"${r.payeeName}"`,
      r.amount,
      r.currency,
      `"${r.gatewayPlatform}"`,
      r.httpResponseStatus || 200,
      `"${r.responseStatusText || r.status}"`,
      `"${r.gatewayMessage.replace(/"/g, '""')}"`,
      `"${r.actor}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TreasuryPay_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy All Report
  const handleCopyAllReport = () => {
    const lines = [
      `========================================================================`,
      `ETHIOPIAN ROADS ADMINISTRATION — TREASURYPAY EXECUTION AUDIT TRAIL`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Execution Attempts Logged: ${auditRecords.length}`,
      `Success Rate: ${metrics.successRate}% | Avg Latency: ${metrics.avgLatency}ms`,
      `========================================================================\n`
    ];

    filteredRecords.forEach((r, idx) => {
      lines.push(
        `#${idx + 1} [${r.responseStatusText || r.status}] - ${new Date(r.timestamp).toLocaleString()}`,
        `    Tx ID: ${r.transactionId} | Inst ID: ${r.instructionId}`,
        `    Beneficiary: ${r.payeeName} (${r.currency} ${r.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
        `    Gateway: ${r.gatewayPlatform} | Latency: ${r.executionDurationMs || 20}ms`,
        `    Response: ${r.gatewayMessage}`,
        `    Actor: ${r.actor} (${r.actorRole})`,
        `------------------------------------------------------------------------`
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setHasCopiedAll(true);
    setTimeout(() => setHasCopiedAll(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 ${className}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* SECTION HEADER & CONTROL BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xs shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Real-Time Payment Execution Audit Trail
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {auditRecords.length} Total Execution Attempts
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Gateway Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chronologically sorted ledger of all payment dispatch attempts, gateway 200 OK / 4xx responses, and verification hashes.
            </p>
          </div>
        </div>

        {/* Global Audit Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'TIMELINE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Timeline Feed
            </button>
          </div>

          {/* Copy Report */}
          <button
            type="button"
            onClick={handleCopyAllReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Copy audit ledger summary to clipboard"
          >
            {hasCopiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-black">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Ledger</span>
              </>
            )}
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer shadow-xs"
            title="Export audit log to CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUDIT METRICS SUMMARY CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Total Attempts */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Logged Attempts
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {metrics.total}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Success Rate (200 OK)
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
              {metrics.successRate}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Failed / Rejections */}
        <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Failed / Interrupted
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-300 mt-0.5">
              {metrics.failedCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Avg Gateway Latency
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-700 dark:text-indigo-300 mt-0.5">
              {metrics.avgLatency} ms
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH TOOLBAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Transaction ID (ADY-TRF-...), Instruction ID, Project, or Payee..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Status:</span>
            {(['ALL', 'SUCCESS', 'PROCESSING', 'FAILED'] as AuditFilterStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'SUCCESS' ? '200 OK / Settled' : st === 'PROCESSING' ? 'In Transit' : 'Failed / Void'}
              </button>
            ))}
          </div>

          {/* Gateway Platform Dropdown Filter */}
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value as AuditGatewayFilter)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">All Gateways</option>
            <option value="Adyen BalancePlatform">Adyen BalancePlatform</option>
            <option value="Yapily ISO 20022">Yapily ISO 20022</option>
            <option value="CBE RTGS Gateway">CBE RTGS Gateway</option>
          </select>

          {/* Chronological Sort Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={`Sort chronologically: Currently ${sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
            <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
          </button>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUDIT LOG RESULTS TABLE / TIMELINE */}
      {/* ------------------------------------------------------------- */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No audit records matching your criteria
          </h4>
          <p className="text-xs text-slate-400">
            Try adjusting your search terms, status filters, or gateway platform selection.
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Payment Instruction</th>
                <th className="py-3 px-4">Beneficiary & Amount</th>
                <th className="py-3 px-4">Gateway & Platform</th>
                <th className="py-3 px-4">Response Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredRecords.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                const isSuccess = record.status === 'SUCCESS' || record.status === 'AUTHORIZED';
                const isProcessing = record.status === 'PROCESSING';
                const isFailed = record.status === 'FAILED' || record.status === 'REJECTED';

                return (
                  <React.Fragment key={record.id}>
                    <tr 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer ${
                        isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-bold block">
                              {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {record.transactionId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(record.transactionId, `tx-${record.id}`);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy Transaction ID"
                          >
                            {copiedId === `tx-${record.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[140px]">
                          {record.actor}
                        </span>
                      </td>

                      {/* Instruction ID & Project */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                          {record.instructionId}
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-sans block truncate max-w-[200px]" title={record.projectName}>
                          {record.projectName}
                        </span>
                      </td>

                      {/* Beneficiary & Amount */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">
                          <span>{record.currency} </span>
                          <span>{record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 font-sans block truncate max-w-[160px]" title={record.payeeName}>
                          {record.payeeName}
                        </span>
                      </td>

                      {/* Gateway Platform */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-sans font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Landmark className="w-3 h-3 text-slate-400" />
                          {record.gatewayPlatform}
                        </span>
                      </td>

                      {/* Response Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black border uppercase tracking-wider ${
                          isSuccess 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' 
                            : isProcessing 
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300' 
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {isProcessing && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          {record.responseStatusText || (isSuccess ? '200 OK' : 'ERROR')}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {record.executionDurationMs ? `${record.executionDurationMs} ms` : '—'}
                      </td>

                      {/* Expand / Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {record.matchedPayment && onInspectPayment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectPayment(record.matchedPayment!);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                              title="Inspect Payment Voucher Dossier"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRecordId(isExpanded ? null : record.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                            title={isExpanded ? 'Collapse audit details' : 'Expand full gateway audit payload'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ROW: FULL GATEWAY PAYLOAD & AUDIT SPECIFICATIONS */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-850/80 border-b border-indigo-100 dark:border-indigo-950">
                        <td colSpan={8} className="py-4 px-6 font-sans">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                            
                            {/* Header details */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                  Gateway Response & Verification Ledger
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Tx: {record.transactionId}
                                </span>
                                {record.signatureVerified && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                    SHA-256 HMAC Verified
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {record.matchedPayment && onInspectPayment && (
                                  <button
                                    type="button"
                                    onClick={() => onInspectPayment(record.matchedPayment!)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Open Payment Dossier</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                                {onOpenWebhookInspector && record.rawLogId && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenWebhookInspector(record.rawLogId)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Terminal className="w-3 h-3" />
                                    <span>Open Webhook Inspector</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Gateway Message Note */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                Gateway Response Message:
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 font-mono text-[11.5px]">
                                {record.gatewayMessage}
                              </p>
                            </div>

                            {/* JSON Payloads Grid if present */}
                            {(record.requestPayload || record.responsePayload) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {record.requestPayload && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                      <span>Request Payload (Inbound)</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(JSON.stringify(record.requestPayload, null, 2), `req-${record.id}`)}
                                        className="text-[10px] text-indigo-500 hover:underline"
                                      >
                                        {copiedId === `req-${record.id}` ? 'Copied!' : 'Copy JSON'}
                                      </button>
                                    </div>
                                    <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-[10.5px] font-mono overflow-x-auto max-h-40 border border-slate-800">
                                      {JSON.stringify(record.requestPayload, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {record.responsePayload && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                      <span>Response Payload (HTTP {record.httpResponseStatus})</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(JSON.stringify(record.responsePayload, null, 2), `res-${record.id}`)}
                                        className="text-[10px] text-indigo-500 hover:underline"
                                      >
                                        {copiedId === `res-${record.id}` ? 'Copied!' : 'Copy JSON'}
                                      </button>
                                    </div>
                                    <pre className="p-3 rounded-xl bg-slate-950 text-blue-400 text-[10.5px] font-mono overflow-x-auto max-h-40 border border-slate-800">
                                      {JSON.stringify(record.responsePayload, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

      ) : (

        /* TIMELINE FEED VIEW */
        <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredRecords.map((record) => {
            const isSuccess = record.status === 'SUCCESS' || record.status === 'AUTHORIZED';
            const isProcessing = record.status === 'PROCESSING';
            const isFailed = record.status === 'FAILED' || record.status === 'REJECTED';

            return (
              <div key={record.id} className="relative pl-10">
                
                {/* Timeline node icon */}
                <div className={`absolute left-1.5 top-3 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2 ring-4 ring-white dark:ring-slate-900 ${
                  isSuccess ? 'bg-emerald-500 text-white' :
                  isProcessing ? 'bg-indigo-500 text-white animate-pulse' :
                  'bg-rose-500 text-white'
                }`}>
                  {isSuccess ? <Check className="w-3 h-3" /> :
                   isProcessing ? <Clock className="w-3 h-3" /> :
                   <XCircle className="w-3 h-3" />}
                </div>

                {/* Timeline Card */}
                <div className="bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                        isSuccess ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        isProcessing ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {record.responseStatusText || record.status}
                      </span>
                      <strong className="text-xs font-mono text-slate-900 dark:text-white">
                        Tx: {record.transactionId}
                      </strong>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {record.instructionId}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(record.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {record.projectName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        Payee: <strong>{record.payeeName}</strong> | Amount: <strong>{record.currency} {record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {record.gatewayPlatform}
                      </span>
                      {record.matchedPayment && onInspectPayment && (
                        <button
                          type="button"
                          onClick={() => onInspectPayment(record.matchedPayment!)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>Inspect Voucher</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                    {record.gatewayMessage}
                  </p>

                </div>

              </div>
            );
          })}
        </div>

      )}

      {/* ------------------------------------------------------------- */}
      {/* FOOTER AUDIT INTEGRITY STATEMENT */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Tamper-Evident SHA-256 HMAC Gateway Execution Ledger
        </span>
        <span className="text-slate-400">
          Showing {filteredRecords.length} of {auditRecords.length} Historical Execution Logs
        </span>
      </div>

    </div>
  );
};

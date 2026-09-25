import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Activity, 
  XCircle, 
  Sparkles,
  ArrowUpRight,
  SendHorizontal,
  Landmark,
  FileSpreadsheet,
  Edit3,
  History,
  ChevronDown,
  ChevronRight,
  User,
  ArrowRight,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  X,
  QrCode
} from 'lucide-react';
import { 
  PaymentInstruction, 
  PaymentStatus, 
  CurrencyCode, 
  PaymentCategory,
  ActiveRole 
} from '../../types/treasury';
import { ApprovalHierarchy } from './ApprovalHierarchy';
import { TransferAccountRouteCard, resolveSourceTreasuryAccount, resolveDestinationBankDetails } from './TransferAccountRouteCard';
import { PaymentQrCodeModal } from './PaymentQrCodeModal';

interface TreasuryFinancialTableProps {
  payments: PaymentInstruction[];
  activeRole: ActiveRole;
  onInspect: (payment: PaymentInstruction) => void;
  onInspectApprovalHistory?: (payment: PaymentInstruction) => void;
  onOpenSimulatorForPayment: (payment: PaymentInstruction) => void;
  onOpenWebhookLog: (logId?: string) => void;
  onQuickApprove: (id: string, commentary: string) => Promise<void> | void;
  onQuickExecute: (id: string) => void;
  onEditPayment?: (payment: PaymentInstruction) => void;
  onOpenEditHistory?: (payment: PaymentInstruction) => void;
}

export const TreasuryFinancialTable: React.FC<TreasuryFinancialTableProps> = ({
  payments,
  activeRole,
  onInspect,
  onInspectApprovalHistory,
  onOpenSimulatorForPayment,
  onOpenWebhookLog,
  onQuickApprove,
  onQuickExecute,
  onEditPayment,
  onOpenEditHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | CurrencyCode>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PaymentCategory>('ALL');
  
  // Expandable row tracking for Edit History
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Quick Review Modal State for Financial Director (Mandatory Commentary)
  const [reviewModalPayment, setReviewModalPayment] = useState<PaymentInstruction | null>(null);
  const [quickCommentary, setQuickCommentary] = useState('');
  const [quickCommentaryError, setQuickCommentaryError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedQrPayment, setSelectedQrPayment] = useState<PaymentInstruction | null>(null);

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenQuickApprove = (payment: PaymentInstruction) => {
    setReviewModalPayment(payment);
    setQuickCommentary('Verified against approved Engineer IPC Certificate and statutory tax clearances. Budget code 4102 cleared.');
    setQuickCommentaryError(null);
  };

  const handleConfirmQuickApprove = async () => {
    if (!reviewModalPayment) return;
    const trimmed = quickCommentary.trim();
    if (!trimmed) {
      setQuickCommentaryError('Reviewer commentary is strictly required to authorize payment.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await onQuickApprove(reviewModalPayment.id, trimmed);
      setReviewModalPayment(null);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const searchMatch = !searchTerm.trim() || (
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.payee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.destinationBank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.destinationBank.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.gatewayTransactionId && p.gatewayTransactionId.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;
      const currencyMatch = currencyFilter === 'ALL' || p.currency === currencyFilter;
      const categoryMatch = categoryFilter === 'ALL' || p.category === categoryFilter;

      return searchMatch && statusMatch && currencyMatch && categoryMatch;
    });
  }, [payments, searchTerm, statusFilter, currencyFilter, categoryFilter]);

  // One-Click CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Instruction ID',
      'Status',
      'Payee Name',
      'Payee TIN',
      'Payee Type',
      'Bank Name',
      'Account / IBAN',
      'SWIFT Code',
      'Amount',
      'Currency',
      'Category',
      'Project Reference',
      'Project Name',
      'Purpose',
      'Reviewer Commentary',
      'DG Revisions Count',
      'Gateway Transaction ID',
      'Gateway Platform',
      'Created At',
      'Approved At',
      'Executed At',
      'Paid At',
      'Webhook Event ID'
    ];

    const rows = filteredPayments.map(p => [
      p.id,
      p.status,
      `"${p.payee.name.replace(/"/g, '""')}"`,
      p.payee.tin,
      p.payee.entityType,
      `"${p.destinationBank.bankName.replace(/"/g, '""')}"`,
      p.destinationBank.accountNumber,
      p.destinationBank.swiftBic,
      p.amount,
      p.currency,
      p.category,
      `"${p.projectReference.replace(/"/g, '""')}"`,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.purpose.replace(/"/g, '""')}"`,
      `"${(p.reviewerCommentary || p.approvalNotes || '').replace(/"/g, '""')}"`,
      p.editHistory?.length || 0,
      p.gatewayTransactionId || '',
      p.gatewayPlatform || '',
      p.createdAt || '',
      p.approvedAt || '',
      p.executedAt || '',
      p.paidAt || '',
      p.webhookEventId || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TreasuryPay_Financial_Disbursements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      
      {/* Table Action Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Payee, Instruction ID (PAY-...), Bank, or Tx Ref..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Controls & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Audit</option>
            <option value="Approved">Approved</option>
            <option value="Processing">Processing (Gateway)</option>
            <option value="Paid">Paid (Settled)</option>
            <option value="Failed">Failed / Rejected</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="ALL">All Currencies</option>
            <option value="ETB">ETB Only</option>
            <option value="USD">USD Only (FX)</option>
            <option value="EUR">EUR Only</option>
            <option value="GBP">GBP Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hidden sm:inline-block"
          >
            <option value="ALL">All Categories</option>
            <option value="IPC_VALUATION">IPC Valuation</option>
            <option value="ADVANCE_MOBILIZATION">Advance Payment</option>
            <option value="ROW_COMPENSATION">ROW Compensation</option>
            <option value="CONSULTANT_FEES">Consultant Fees</option>
            <option value="RETENTION_RELEASE">Retention Release</option>
            <option value="TAX_SETTLEMENT">Tax Settlement</option>
          </select>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Export filtered records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700/80 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-10 text-center">Log</th>
              <th className="py-3 px-3">Instruction & Date</th>
              <th className="py-3 px-3">Payee / Beneficiary</th>
              <th className="py-3 px-3">Transfer Route (From ➔ To)</th>
              <th className="py-3 px-3 text-right">Amount & Currency</th>
              <th className="py-3 px-3">Contractual Purpose</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3">Gateway Tx & Sync</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((p) => {
                const isExpanded = expandedRows.has(p.id);
                const hasEdits = Boolean(p.editHistory && p.editHistory.length > 0);
                const hasReviews = Boolean(p.reviewHistory && p.reviewHistory.length > 0);

                return (
                  <React.Fragment key={p.id}>
                    <tr 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition ${
                        isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Expandable Row Toggle Button */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRowExpand(p.id)}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            isExpanded 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' 
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={isExpanded ? 'Collapse Edit History Log' : 'Expand Director General Edit History Log'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      
                      {/* Instruction ID & Date */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {p.id}
                          </span>
                          {hasEdits && (
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(p.id)}
                              className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-0.5 cursor-pointer hover:bg-amber-200"
                              title="Click to view Director General revision log"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{p.editHistory!.length} Rev{p.editHistory!.length > 1 ? 's' : ''}</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Payee */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-850 dark:text-white leading-tight">
                          {p.payee.name}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          TIN: <span className="font-mono">{p.payee.tin}</span> • {p.payee.entityType}
                        </div>
                      </td>

                      {/* Transfer Route: FROM Treasury Account ➔ TO Beneficiary Account */}
                      <td className="py-3.5 px-3 min-w-[210px]">
                        {(() => {
                          const srcAcc = resolveSourceTreasuryAccount(p);
                          const destAcc = resolveDestinationBankDetails(p);
                          return (
                            <div className="space-y-1 font-mono text-[11px]">
                              {/* FROM row */}
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                  From
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={`${srcAcc.bankName} - ${srcAcc.accountName}`}>
                                  {srcAcc.bankName.split(' ')[0]}
                                </span>
                                <span className="text-slate-500 font-bold">
                                  {srcAcc.accountNumber}
                                </span>
                              </div>

                              {/* TO row */}
                              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                                <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  To
                                </span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[150px]" title={`${destAcc.bankName} - ${destAcc.payeeName}`}>
                                  {destAcc.bankName.split(' ')[0]}
                                </span>
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  {destAcc.accountNumber}
                                </span>
                              </div>

                              {/* IBAN details footnote */}
                              <div className="text-[9.5px] text-slate-400 font-sans flex items-center gap-1 truncate" title={`Dest IBAN: ${destAcc.iban} | SWIFT: ${destAcc.swiftBic}`}>
                                <span>IBAN:</span>
                                <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{destAcc.iban}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Amount & Currency */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-black font-mono text-slate-900 dark:text-white text-xs">
                          {p.currency} {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase">
                          {p.linkedBankAccountId.replace('acc_', '').toUpperCase()}
                        </span>
                      </td>

                      {/* Purpose & Category */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {p.purpose}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.projectReference} • <span className="font-semibold text-indigo-500">{p.category.replace('_', ' ')}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border uppercase tracking-wider ${
                          p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                          p.status === 'Processing' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                          p.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                          p.status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' :
                          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}>
                          {p.status === 'Processing' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                          )}
                          {p.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {p.status}
                        </span>
                      </td>

                      {/* Gateway Tx ID & Webhook 200 OK link */}
                      <td className="py-3.5 px-3">
                        {p.gatewayTransactionId ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block">
                              {p.gatewayTransactionId}
                            </span>
                            {p.status === 'Paid' ? (
                              <button
                                type="button"
                                onClick={() => onOpenWebhookLog(p.webhookEventId)}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                200 OK Log <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : p.status === 'Processing' ? (
                              <button
                                type="button"
                                onClick={() => onOpenSimulatorForPayment(p)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                Simulate Webhook
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            Awaiting Transfer
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Inspect Voucher Dossier */}
                          <button
                            type="button"
                            onClick={() => onInspect(p)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Inspect Payment Voucher & Review History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Dedicated Approval History & State Log Button */}
                          <button
                            type="button"
                            onClick={() => onInspectApprovalHistory ? onInspectApprovalHistory(p) : onInspect(p)}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                            title="View Chronological Approval History & State Changes"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          {/* Dedicated Edit History Modal Opener */}
                          {hasEdits && (
                            <button
                              type="button"
                              onClick={() => onOpenEditHistory?.(p)}
                              className="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition cursor-pointer"
                              title="Open Director General Edit History Log Modal"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}

                          {/* Director General & Finance Director Edit Button */}
                          {(activeRole === 'DIRECTOR_GENERAL' || activeRole === 'FINANCIAL_DIRECTOR') && p.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => onEditPayment?.(p)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-xs transition cursor-pointer"
                              title="Check & Edit Payment Request"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Finance Director: Recommend for DG Approval */}
                          {activeRole === 'FINANCIAL_DIRECTOR' && p.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickApprove(p)}
                              className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-1"
                              title="Recommend payment request for Director General final authorization"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Recommend</span>
                            </button>
                          )}

                          {/* Director General: Final Payment Disbursal if Recommended / Approved */}
                          {activeRole === 'DIRECTOR_GENERAL' && p.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => onQuickExecute(p.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs transition cursor-pointer"
                              title="Final Payment Approval & Disbursal (Director General)"
                            >
                              <SendHorizontal className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Scannable Mobile Banking QR Code Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedQrPayment(p)}
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                            title="Generate Scannable Mobile Payment QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Simulate callback if processing */}
                          {p.status === 'Processing' && (
                            <button
                              type="button"
                              onClick={() => onOpenSimulatorForPayment(p)}
                              className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                              title="Trigger Real-Time Webhook Callback"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>

                    {/* EXPANDABLE ROW: DIRECTOR GENERAL EDIT HISTORY LOG */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-850/80 border-b border-indigo-100 dark:border-indigo-950">
                        <td colSpan={9} className="py-4 px-6">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                            
                            {/* Expandable Row Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                  <History className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  Director General Edit History Log for {p.id}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {p.editHistory?.length || 0} Total Logged Revisions
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onInspectApprovalHistory ? onInspectApprovalHistory(p) : onInspect(p)}
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Approval & State Log</span>
                                </button>
                                {onOpenEditHistory && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditHistory(p)}
                                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Open In Dedicated Modal</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpand(p.id)}
                                  className="text-[10.5px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  Hide Log
                                </button>
                              </div>
                            </div>

                            {/* Transfer Route: FROM Treasury Account ➔ TO Beneficiary Account */}
                            <TransferAccountRouteCard 
                              payment={p} 
                              variant="detailed" 
                              onGenerateQr={() => setSelectedQrPayment(p)}
                            />

                            {/* Approval Hierarchy Signature Flow Tracking */}
                            <ApprovalHierarchy payment={p} />

                            {/* Revision Entries */}
                            {hasEdits ? (
                              <div className="space-y-2.5">
                                {p.editHistory!.map((entry, idx) => (
                                  <div 
                                    key={entry.id || idx}
                                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1.5"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                          {entry.actionTaken.replace(/_/g, ' ')}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                          <User className="w-3 h-3 text-slate-400" />
                                          {entry.editorName} ({entry.editorRole})
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(entry.timestamp).toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Delta */}
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                      <span className="text-slate-400 line-through">
                                        {entry.previousCurrency} {entry.previousAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span className="font-extrabold text-slate-900 dark:text-white">
                                        {entry.newCurrency} {entry.newAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-slate-400 text-[10px] ml-auto">
                                        Status: {entry.previousStatus} → <strong>{entry.newStatus}</strong>
                                      </span>
                                    </div>

                                    {/* Justification */}
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      Justification: "{entry.justification}"
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-400 italic">
                                No Director General revisions have been made to {p.id}. Current figures represent original instruction terms.
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No payment instructions match the selected filters or search keyword.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
        <span>Showing <strong>{filteredPayments.length}</strong> of <strong>{payments.length}</strong> total payment instructions</span>
        <span className="font-mono text-[11px] text-slate-400">Real-time status sync via Server-Sent Events (SSE)</span>
      </div>

      {/* QUICK APPROVE MODAL (MANDATORY REVIEWER COMMENTARY) */}
      {reviewModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Financial Director Authorization
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {reviewModalPayment.id} • {reviewModalPayment.currency} {reviewModalPayment.amount.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReviewModalPayment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominently surface 'From' and 'To' Account Numbers and IBANs in Approval Workflow */}
            <TransferAccountRouteCard 
              payment={reviewModalPayment} 
              variant="approval_banner" 
              highlightForApproval={true} 
              onGenerateQr={() => setSelectedQrPayment(reviewModalPayment)}
            />

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Required Reviewer Commentary <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Governance Policy Compliance</span>
              </label>
              <textarea
                rows={3}
                value={quickCommentary}
                onChange={(e) => {
                  setQuickCommentary(e.target.value);
                  if (quickCommentaryError && e.target.value.trim()) setQuickCommentaryError(null);
                }}
                placeholder="Enter mandatory reviewer commentary explaining verification of IPC, tax clearances, and budget code clearance..."
                className={`w-full p-3 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition ${
                  quickCommentaryError 
                    ? 'border-rose-500 ring-2 ring-rose-500/20' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                }`}
              />
              {quickCommentaryError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {quickCommentaryError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalPayment(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleConfirmQuickApprove}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Authorize</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Scannable Mobile Banking QR Code Modal */}
      <PaymentQrCodeModal
        payment={selectedQrPayment}
        isOpen={!!selectedQrPayment}
        onClose={() => setSelectedQrPayment(null)}
      />

    </div>
  );
};

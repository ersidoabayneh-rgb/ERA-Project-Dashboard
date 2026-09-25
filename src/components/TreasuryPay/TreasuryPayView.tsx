import React, { useState, useEffect, useCallback } from 'react';
import { 
  Landmark, 
  Plus, 
  Terminal, 
  X, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle2, 
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Bell
} from 'lucide-react';
import { 
  PaymentInstruction, 
  TreasuryBankAccount, 
  WebhookLog, 
  ActiveRole,
  PaymentCategory,
  CurrencyCode 
} from '../../types/treasury';
import { 
  fetchPayments, 
  fetchAccounts, 
  fetchWebhookLogs, 
  submitPaymentInstruction,
  approvePaymentInstruction,
  rejectPaymentInstruction,
  executeBankTransfer,
  editPaymentByDirectorGeneral,
  sendWebhookCallback,
  getStoredRole,
  setStoredRole,
  initSseListener
} from '../../lib/treasuryApi';
import { RoleSwitcherRibbon } from './RoleSwitcherRibbon';
import { TreasuryKpiCards } from './TreasuryKpiCards';
import { BankTreasuryAccountsWidget } from './BankTreasuryAccountsWidget';
import { TreasuryFinancialTable } from './TreasuryFinancialTable';
import { CreatePaymentModal } from './CreatePaymentModal';
import { InspectVoucherModal } from './InspectVoucherModal';
import { EditPaymentModal } from './EditPaymentModal';
import { EditHistoryModal } from './EditHistoryModal';
import { WebhookInspectorModal } from './WebhookInspectorModal';
import { AuditTrailSection } from './AuditTrailSection';
import { User as UserType } from '../../types';

interface TreasuryPayViewProps {
  onClose: () => void;
  currentUser?: UserType | null;
}

export const TreasuryPayView: React.FC<TreasuryPayViewProps> = ({ onClose, currentUser }) => {
  const getInitialRole = (): ActiveRole => {
    if (currentUser) {
      const role = (currentUser.role || '').toLowerCase();
      const uname = (currentUser.username || '').toLowerCase();
      if (role === 'director_general' || uname.includes('director_general') || uname.includes('directorgeneral')) {
        return 'DIRECTOR_GENERAL';
      }
      if (role === 'department_head' || uname.includes('dept_head') || uname.includes('depthead') || uname.includes('department_head')) {
        return 'DEPARTMENT_HEAD';
      }
      if (role === 'finance_director' || uname.includes('finance_director') || uname.includes('financedirector')) {
        return 'FINANCIAL_DIRECTOR';
      }
    }
    return getStoredRole();
  };

  const [activeRole, setActiveRole] = useState<ActiveRole>(getInitialRole);
  const [payments, setPayments] = useState<PaymentInstruction[]>([]);
  const [accounts, setAccounts] = useState<TreasuryBankAccount[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectingPayment, setInspectingPayment] = useState<PaymentInstruction | null>(null);
  const [inspectingTab, setInspectingTab] = useState<'dossier' | 'approval_history'>('dossier');
  const [editingPayment, setEditingPayment] = useState<PaymentInstruction | null>(null);
  const [viewingEditHistoryPayment, setViewingEditHistoryPayment] = useState<PaymentInstruction | null>(null);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [simTargetPayment, setSimTargetPayment] = useState<PaymentInstruction | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | undefined>(undefined);
  const [mainTab, setMainTab] = useState<'ALL' | 'PAYMENTS' | 'AUDIT_TRAIL'>('ALL');

  // Real-time toast
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setLiveToast({ message, type });
    setTimeout(() => {
      setLiveToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Initialize and load
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPayments, fetchedAccounts, fetchedLogs] = await Promise.all([
        fetchPayments(),
        fetchAccounts(),
        fetchWebhookLogs(),
      ]);
      setPayments(fetchedPayments);
      setAccounts(fetchedAccounts);
      setLogs(fetchedLogs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveRole(getStoredRole());
    loadData();
  }, [loadData]);

  // Real-Time Event Sync via SSE & Local Broadcaster
  useEffect(() => {
    const cleanup = initSseListener(
      (updatedPayment) => {
        setPayments(prev => {
          const index = prev.findIndex(p => p.id === updatedPayment.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = updatedPayment;
            return next;
          }
          return [updatedPayment, ...prev];
        });

        if (updatedPayment.status === 'Paid') {
          showToast(`⚡ Webhook 200 OK Auto-Sync: Payment ${updatedPayment.id} settled as PAID!`, 'success');
        } else if (updatedPayment.status === 'Processing') {
          showToast(`Bank transfer dispatched for ${updatedPayment.id}. Awaiting gateway webhook.`, 'info');
        }
      },
      (updatedAccounts) => {
        setAccounts(updatedAccounts);
      },
      (newLog) => {
        setLogs(prev => [newLog, ...prev.filter(l => l.id !== newLog.id)]);
      }
    );

    return cleanup;
  }, [showToast]);

  const handleRoleChange = (role: ActiveRole) => {
    setActiveRole(role);
    setStoredRole(role);
    showToast(
      role === 'DIRECTOR_GENERAL'
        ? 'Switched to Director General (Payment Submitter) authority mode.'
        : 'Switched to Financial Management Director (Approver & Executor) authority mode.',
      'info'
    );
  };

  // Submit payment instruction
  const handleCreateSubmit = async (data: {
    projectReference: string;
    projectName: string;
    category: PaymentCategory;
    purpose: string;
    amount: number;
    currency: CurrencyCode;
    payeeName: string;
    payeeTin: string;
    payeeEntityType: 'Contractor' | 'Consultant' | 'PAP' | 'Authority';
    payeeEmail: string;
    payeePhone: string;
    bankName: string;
    accountNumber: string;
    iban?: string;
    swiftBic: string;
    branchName?: string;
    supportingDocumentName?: string;
    supportingDocumentRef?: string;
  }) => {
    const created = await submitPaymentInstruction(data);
    setPayments(prev => [created, ...prev]);
    showToast(`Payment instruction ${created.id} submitted successfully! Awaiting Financial Director audit.`, 'success');
  };

  // Approver Actions
  const handleApprove = async (id: string, notes: string) => {
    const updated = await approvePaymentInstruction(id, notes);
    setPayments(prev => prev.map(p => p.id === id ? updated : p));
    showToast(`Instruction ${id} approved by Financial Director. Ready for bank transfer execution.`, 'success');
  };

  const handleReject = async (id: string, reason: string) => {
    const updated = await rejectPaymentInstruction(id, reason);
    setPayments(prev => prev.map(p => p.id === id ? updated : p));
    showToast(`Instruction ${id} rejected with mandatory reason logged.`, 'warning');
  };

  const handleExecuteTransfer = async (
    id: string, 
    gatewayPlatform: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway'
  ) => {
    const updated = await executeBankTransfer(id, gatewayPlatform);
    setPayments(prev => prev.map(p => p.id === id ? updated : p));
    showToast(`Transfer dispatched to ${gatewayPlatform} with Tx ID ${updated.gatewayTransactionId}. Status is now Processing.`, 'info');
  };

  // Director General Admin Edit Action
  const handleDgEditPayment = async (
    id: string,
    updates: {
      amount: number;
      currency: CurrencyCode;
      actionType: 'RESUBMIT_FOR_AUDIT' | 'SAVE_CHANGES' | 'CANCEL_INSTRUCTION';
      justification: string;
    }
  ) => {
    const updated = await editPaymentByDirectorGeneral(id, updates);
    setPayments(prev => prev.map(p => p.id === id ? updated : p));
    if (inspectingPayment?.id === id) {
      setInspectingPayment(updated);
    }
    const actionLabel = updates.actionType === 'RESUBMIT_FOR_AUDIT' ? 'Resubmitted for Audit' :
                        updates.actionType === 'CANCEL_INSTRUCTION' ? 'Cancelled / Voided' : 'Terms Updated';
    showToast(`Payment ${id} revised by Director General: ${updates.currency} ${updates.amount.toLocaleString('en-US')} (${actionLabel})`, 'success');
  };

  // Dispatch Webhook (Simulator)
  const handleDispatchWebhook = async (payload: Record<string, unknown>) => {
    const result = await sendWebhookCallback(payload);
    // Reload freshly updated data
    await loadData();
    showToast(`Webhook callback processed (HTTP 200 OK). Records synced in real time!`, 'success');
    return result;
  };

  const pendingCount = payments.filter(p => p.status === 'Pending').length;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 p-3 sm:p-6 space-y-6">
      
      {/* Live Floating Notification Toast */}
      {liveToast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`p-3.5 px-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
            liveToast.type === 'success' 
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50 backdrop-blur-md' 
              : liveToast.type === 'warning'
              ? 'bg-rose-900/90 text-rose-100 border-rose-500/50 backdrop-blur-md'
              : 'bg-indigo-900/90 text-indigo-100 border-indigo-500/50 backdrop-blur-md'
          }`}>
            <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{liveToast.message}</span>
            <button 
              onClick={() => setLiveToast(null)} 
              className="text-white/60 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Application Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
            title="Return to Projects Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                TreasuryPay Real-Time Gateway & Financial Management
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 uppercase">
                Enterprise Treasury v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contractor IPC Disbursals, Dual Role Authorization & Live Bank Webhook Auto-Sync
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Audit Trail Quick Access Button */}
          <button
            type="button"
            onClick={() => {
              setMainTab('AUDIT_TRAIL');
              const el = document.getElementById('audit-trail-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition cursor-pointer"
            title="Inspect Chronological Payment Execution Audit Trail"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Audit Trail ({logs.length + payments.filter(p => p.executedAt).length})</span>
          </button>

          {/* Webhook Inspector & Simulator Modal Button */}
          <button
            type="button"
            onClick={() => {
              setSimTargetPayment(null);
              setSelectedLogId(undefined);
              setIsWebhookModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Inspect 200 OK Webhook Logs or Simulate Bank Callbacks"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Webhook Inspector (200 OK)</span>
          </button>

          {/* New Instruction Button (Prominent for Director General) */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition cursor-pointer"
            title="Create and Submit Payment Instruction"
          >
            <Plus className="w-4 h-4" />
            <span>New Payment Instruction</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Close view */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
            title="Close TreasuryPay"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Role Switcher Ribbon */}
      <RoleSwitcherRibbon
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        pendingCount={pendingCount}
      />

      {/* Executive KPI Cards */}
      <TreasuryKpiCards
        payments={payments}
        accounts={accounts}
        onOpenSimulator={() => {
          const proc = payments.find(p => p.status === 'Processing') || payments[0];
          setSimTargetPayment(proc);
          setIsWebhookModalOpen(true);
        }}
        onOpenWebhookLogs={() => {
          setIsWebhookModalOpen(true);
        }}
      />

      {/* Linked Treasury Bank Accounts Widget */}
      <BankTreasuryAccountsWidget
        accounts={accounts}
      />

      {/* View Section Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setMainTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mainTab === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Modules Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('PAYMENTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mainTab === 'PAYMENTS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Payment Instructions Ledger ({payments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('AUDIT_TRAIL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mainTab === 'AUDIT_TRAIL'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs'
                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail & Gateway Ledger</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400 px-2">
          {mainTab === 'ALL' ? 'Showing All Sections' : mainTab === 'PAYMENTS' ? 'Active: Instructions View' : 'Active: Audit Trail View'}
        </span>
      </div>

      {/* Comprehensive Financial Data Table */}
      {(mainTab === 'ALL' || mainTab === 'PAYMENTS') && (
        <TreasuryFinancialTable
          payments={payments}
          activeRole={activeRole}
          onInspect={(payment) => {
            setInspectingPayment(payment);
            setInspectingTab('dossier');
          }}
          onInspectApprovalHistory={(payment) => {
            setInspectingPayment(payment);
            setInspectingTab('approval_history');
          }}
          onEditPayment={(payment) => setEditingPayment(payment)}
          onOpenEditHistory={(payment) => setViewingEditHistoryPayment(payment)}
          onOpenSimulatorForPayment={(payment) => {
            setSimTargetPayment(payment);
            setIsWebhookModalOpen(true);
          }}
          onOpenWebhookLog={(logId) => {
            setSelectedLogId(logId);
            setIsWebhookModalOpen(true);
          }}
          onQuickApprove={(id, commentary) => handleApprove(id, commentary)}
          onQuickExecute={(id) => handleExecuteTransfer(id, 'Adyen BalancePlatform')}
        />
      )}

      {/* Real-Time Payment Execution Audit Trail Section */}
      {(mainTab === 'ALL' || mainTab === 'AUDIT_TRAIL') && (
        <div id="audit-trail-section">
          <AuditTrailSection
            payments={payments}
            logs={logs}
            onInspectPayment={(p) => {
              setInspectingPayment(p);
              setInspectingTab('dossier');
            }}
            onOpenWebhookInspector={(logId) => {
              setSelectedLogId(logId);
              setIsWebhookModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Modals */}
      <CreatePaymentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        activeRole={activeRole}
        onSubmit={handleCreateSubmit}
      />

      <InspectVoucherModal
        payment={inspectingPayment}
        isOpen={Boolean(inspectingPayment)}
        initialTab={inspectingTab}
        onClose={() => setInspectingPayment(null)}
        activeRole={activeRole}
        onApprove={handleApprove}
        onReject={handleReject}
        onExecuteTransfer={handleExecuteTransfer}
        onOpenSimulatorForPayment={(p) => {
          setSimTargetPayment(p);
          setIsWebhookModalOpen(true);
        }}
        onOpenWebhookLog={(logId) => {
          setSelectedLogId(logId);
          setIsWebhookModalOpen(true);
        }}
        onOpenEditModal={(p) => setEditingPayment(p)}
        onOpenEditHistoryModal={(p) => setViewingEditHistoryPayment(p)}
      />

      {/* Director General Edit Modal */}
      <EditPaymentModal
        payment={editingPayment}
        isOpen={Boolean(editingPayment)}
        onClose={() => setEditingPayment(null)}
        onSubmit={handleDgEditPayment}
      />

      {/* Director General Edit History Dossier Modal */}
      <EditHistoryModal
        payment={viewingEditHistoryPayment}
        isOpen={Boolean(viewingEditHistoryPayment)}
        onClose={() => setViewingEditHistoryPayment(null)}
      />

      <WebhookInspectorModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        logs={logs}
        payments={payments}
        targetPayment={simTargetPayment}
        selectedLogId={selectedLogId}
        onDispatchWebhook={handleDispatchWebhook}
      />

    </div>
  );
};

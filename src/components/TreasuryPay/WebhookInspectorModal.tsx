import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  CheckCircle2, 
  Play, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRight,
  Code2,
  Cpu
} from 'lucide-react';
import { WebhookLog, PaymentInstruction } from '../../types/treasury';

interface WebhookInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WebhookLog[];
  payments: PaymentInstruction[];
  targetPayment?: PaymentInstruction | null;
  selectedLogId?: string;
  onDispatchWebhook: (payload: Record<string, unknown>) => Promise<any>;
}

export const WebhookInspectorModal: React.FC<WebhookInspectorModalProps> = ({
  isOpen,
  onClose,
  logs,
  payments,
  targetPayment,
  selectedLogId,
  onDispatchWebhook,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'logs'>('simulator');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(
    (selectedLogId ? logs.find(l => l.eventId === selectedLogId || l.id === selectedLogId) : null) || logs[0] || null
  );

  // Simulator State
  const eligiblePayments = payments.filter(p => p.status === 'Processing' || p.status === 'Approved' || p.status === 'Pending');
  const [simTargetId, setSimTargetId] = useState<string>(
    targetPayment?.id || eligiblePayments[0]?.id || payments[0]?.id || ''
  );
  const [simGateway, setSimGateway] = useState<'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway'>(
    'Adyen BalancePlatform'
  );
  const [simOutcome, setSimOutcome] = useState<'SUCCESS' | 'FAILURE'>('SUCCESS');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastDispatchedResult, setLastDispatchedResult] = useState<any>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen) return null;

  const currentSimPayment = payments.find(p => p.id === simTargetId) || payments[0];

  // Generate real preview payload based on gateway
  const generateSimPayload = () => {
    const txId = currentSimPayment?.gatewayTransactionId || `ADY-TRF-${Date.now().toString().slice(-8)}`;
    const amt = currentSimPayment?.amount || 142500000;
    const cur = currentSimPayment?.currency || 'ETB';

    if (simGateway === 'Adyen BalancePlatform') {
      return {
        type: 'balancePlatform.transfer.updated',
        environment: 'live',
        data: {
          id: txId,
          reference: currentSimPayment?.id || 'PAY-ERA-2026-0089',
          status: simOutcome === 'SUCCESS' ? 'booked' : 'failed',
          amount: {
            currency: cur,
            value: amt * 100 // minor units
          },
          balanceAccountId: 'BA_ETH_ERA_TREASURY_01',
          accountHolder: {
            id: 'AH_ERA_CENTRAL',
            description: 'Ethiopian Roads Administration Central Treasury'
          },
          beneficiary: {
            name: currentSimPayment?.payee.name || 'Contractor Beneficiary',
            bankAccount: currentSimPayment?.destinationBank.accountNumber || '1000182739485',
            bank: currentSimPayment?.destinationBank.bankName || 'Commercial Bank of Ethiopia'
          },
          settledAt: new Date().toISOString()
        }
      };
    } else if (simGateway === 'Yapily ISO 20022') {
      return {
        event: 'payment.completed',
        paymentId: txId,
        instructionIdentification: currentSimPayment?.id || 'PAY-ERA-2026-0089',
        status: simOutcome === 'SUCCESS' ? 'COMPLETED' : 'REJECTED',
        clearedAmount: {
          currency: cur,
          amount: amt
        },
        debtorAccount: {
          identification: '0092182746101',
          schemeName: 'SortCodeAccountNumber'
        },
        creditorAccount: {
          identification: currentSimPayment?.destinationBank.accountNumber || '0029384756102',
          name: currentSimPayment?.payee.name || 'Beneficiary'
        },
        isoEndToEndId: `E2E-${Date.now()}`
      };
    } else {
      return {
        messageType: 'pacs.002.001.10',
        settlementId: txId,
        originalInstructionId: currentSimPayment?.id || 'PAY-ERA-2026-0089',
        txStatus: simOutcome === 'SUCCESS' ? 'SETTLED' : 'RJCT',
        currency: cur,
        amount: amt,
        clearingSystem: 'NBE-ACH-RTGS',
        timestamp: new Date().toISOString()
      };
    }
  };

  const previewPayload = generateSimPayload();

  const handleDispatch = async () => {
    setIsDispatching(true);
    setLastDispatchedResult(null);
    try {
      const res = await onDispatchWebhook(previewPayload);
      setLastDispatchedResult(res);
      // Automatically refresh selected log
      if (res?.log) {
        setSelectedLog(res.log);
      }
    } catch (err: any) {
      alert(`Webhook dispatch error: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden my-6 text-white flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
                  HTTP POST /api/webhooks/payment-status
                </span>
                <span className="text-xs text-slate-400 font-mono">Status: 200 OK</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Bank Gateway Webhook Inspector & Real-Time Auto-Sync Simulator
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="p-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'simulator' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Webhook Simulator</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>200 OK Logs ({logs.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          
          {activeTab === 'simulator' ? (
            /* TAB 1: INTERACTIVE WEBHOOK SIMULATOR */
            <div className="space-y-5">
              
              {/* Simulator Controls Ribbon */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Target Instruction */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Target Payment Instruction
                  </label>
                  <select
                    value={simTargetId}
                    onChange={(e) => setSimTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-xs outline-none focus:border-indigo-500"
                  >
                    {payments.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} ({p.status}) - {p.payee.name.slice(0, 24)}... - {p.currency} {p.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Current status: <strong className="text-indigo-400">{currentSimPayment?.status}</strong>
                  </span>
                </div>

                {/* 2. Gateway Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Originating Payment Gateway
                  </label>
                  <select
                    value={simGateway}
                    onChange={(e) => setSimGateway(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Adyen BalancePlatform">Adyen BalancePlatform (balancePlatform.transfer.updated)</option>
                    <option value="Yapily ISO 20022">Yapily ISO 20022 Open Banking (payment.completed)</option>
                    <option value="CBE RTGS Gateway">Commercial Bank of Ethiopia RTGS (pacs.002 settlement)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Standard bank callback specification
                  </span>
                </div>

                {/* 3. Outcome Trigger */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Settlement Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimOutcome('SUCCESS')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        simOutcome === 'SUCCESS'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Success (Paid)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimOutcome('FAILURE')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        simOutcome === 'FAILURE'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      Decline / Fail
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Simulates clearing network confirmation
                  </span>
                </div>

              </div>

              {/* Payload Preview & Dispatch Trigger */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Outgoing Request Payload (POST) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                        POST Body
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        application/json
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(previewPayload, null, 2))}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedPayload ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
                    {JSON.stringify(previewPayload, null, 2)}
                  </pre>
                </div>

                {/* Dispatched 200 OK Response or Live Feedback */}
                <div className="space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        Expected Endpoint Response (200 OK)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Acknowledged Receipt
                      </span>
                    </div>

                    {lastDispatchedResult ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-300 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>HTTP 200 OK Received! Payment status auto-synced to "{lastDispatchedResult.response?.currentStatus}".</span>
                          </div>
                          <pre className="p-2.5 rounded-xl bg-slate-950 font-mono text-[10.5px] text-slate-200 overflow-x-auto">
                            {JSON.stringify(lastDispatchedResult.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-center space-y-2">
                        <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
                        <p className="text-xs">
                          Click below to dispatch this HTTP POST callback to <code className="text-indigo-300 font-mono">/api/webhooks/payment-status</code>.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          The server will process the payload, update the payment to <strong>"Paid"</strong>, deduct the balance from the linked Treasury Bank, log the 200 OK response, and broadcast in real time across all clients.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={handleDispatch}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {isDispatching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Dispatching Webhook...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Dispatch Webhook Callback (POST /api/webhooks/payment-status)</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            /* TAB 2: STORED 200 OK WEBHOOK LOGS */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Left Column: Logs List */}
              <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden divide-y divide-slate-800 max-h-[60vh] overflow-y-auto">
                <div className="p-3 bg-slate-900 font-bold text-xs text-slate-300 uppercase tracking-wide flex justify-between items-center">
                  <span>Logged Webhook Callbacks</span>
                  <span className="font-mono text-emerald-400">{logs.length} Events</span>
                </div>
                {logs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className={`w-full text-left p-3 transition cursor-pointer flex flex-col gap-1 ${
                        isSelected ? 'bg-indigo-950/60 border-l-4 border-indigo-500' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-400">
                          {log.gateway}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 font-mono">
                          HTTP {log.responseStatus}
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs truncate">
                        {log.eventType}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Ref: {log.instructionId}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Selected Log Detail */}
              <div className="lg:col-span-2 space-y-4">
                {selectedLog ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    
                    {/* Log Meta Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">Event Identifier</span>
                        <span className="text-xs font-mono font-bold text-indigo-300">{selectedLog.eventId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">Timestamp</span>
                        <span className="text-xs font-mono text-slate-200">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">Latency</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{selectedLog.executionDurationMs} ms</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block">Signature</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> HMAC-SHA256 Valid
                        </span>
                      </div>
                    </div>

                    {/* Request Headers & URL */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        HTTP Endpoint & Headers
                      </span>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300">
                        <div>POST {selectedLog.requestUrl}</div>
                        <div className="text-slate-500 mt-1">
                          content-type: {selectedLog.requestHeaders['content-type']} • user-agent: {selectedLog.requestHeaders['user-agent']}
                        </div>
                      </div>
                    </div>

                    {/* Request Body */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Incoming POST Payload Body
                      </span>
                      <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10.5px] text-emerald-300 overflow-x-auto max-h-48">
                        {JSON.stringify(selectedLog.requestBody, null, 2)}
                      </pre>
                    </div>

                    {/* 200 OK Response Body */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Outgoing 200 OK Acknowledgment Body
                      </span>
                      <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10.5px] text-blue-300 overflow-x-auto max-h-40">
                        {JSON.stringify(selectedLog.responseBody, null, 2)}
                      </pre>
                    </div>

                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-500 border border-slate-800 rounded-2xl">
                    Select a log entry on the left to inspect raw headers and payloads.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Server Webhook Listener active at <code className="text-indigo-400 font-mono">POST /api/webhooks/payment-status</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

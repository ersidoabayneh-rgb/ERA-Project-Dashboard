import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Edit3, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  RotateCcw, 
  Ban, 
  Coins, 
  Send
} from 'lucide-react';
import { PaymentInstruction, CurrencyCode } from '../../types/treasury';
import { TransferAccountRouteCard } from './TransferAccountRouteCard';

interface EditPaymentModalProps {
  payment: PaymentInstruction | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: {
    amount: number;
    currency: CurrencyCode;
    actionType: 'RESUBMIT_FOR_AUDIT' | 'SAVE_CHANGES' | 'CANCEL_INSTRUCTION';
    justification: string;
  }) => Promise<void>;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('ETB');
  const [actionType, setActionType] = useState<'RESUBMIT_FOR_AUDIT' | 'SAVE_CHANGES' | 'CANCEL_INSTRUCTION'>('RESUBMIT_FOR_AUDIT');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount);
      setCurrency(payment.currency);
      // If previous status was Failed/Rejected, default to Resubmit
      if (payment.status === 'Failed') {
        setActionType('RESUBMIT_FOR_AUDIT');
        setJustification('Revised valuation and tax clearance re-attached for audit re-evaluation.');
      } else {
        setActionType('RESUBMIT_FOR_AUDIT');
        setJustification('Amount and currency terms adjusted per revised IPC schedule.');
      }
      setErrorMsg('');
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const parsedAmount = parseFloat(String(amount)) || 0;
  const originalAmount = payment.amount;
  const isAmountChanged = parsedAmount !== originalAmount;
  const isCurrencyChanged = currency !== payment.currency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please specify a valid payment amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payment.id, {
        amount: parsedAmount,
        currency,
        actionType,
        justification: justification.trim() || 'Terms updated by Director General administrative decision.'
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update payment instruction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Edit3 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/30 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Director General Authority
                </span>
                <span className="text-xs text-blue-200 font-mono">{payment.id}</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Edit Payment Amount, Currency & Action
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Prominently surface 'From' and 'To' Account Numbers and IBANs */}
          <TransferAccountRouteCard 
            payment={payment} 
            variant="approval_banner" 
          />

          {/* Edit Amount & Currency Fields */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-500" />
              <span>1. Revised Amount & Settlement Currency</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                  placeholder="0.00"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Original amount: <strong className="font-mono">{payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="ETB">ETB (Ethiopian Birr)</option>
                  <option value="USD">USD (US Dollar - FX)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Original: <strong className="font-mono">{payment.currency}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>2. Executive Action Upon Update</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Option A: Resubmit for Audit */}
              <button
                type="button"
                onClick={() => setActionType('RESUBMIT_FOR_AUDIT')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  actionType === 'RESUBMIT_FOR_AUDIT'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-xs">Resubmit for Audit</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  Sets status to <strong>Pending</strong> for Financial Director re-audit and approval.
                </p>
              </button>

              {/* Option B: Save Changes */}
              <button
                type="button"
                onClick={() => setActionType('SAVE_CHANGES')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  actionType === 'SAVE_CHANGES'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-xs">Save Terms</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  Updates amount and currency while keeping current status ({payment.status}).
                </p>
              </button>

              {/* Option C: Cancel Instruction */}
              <button
                type="button"
                onClick={() => setActionType('CANCEL_INSTRUCTION')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  actionType === 'CANCEL_INSTRUCTION'
                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-xs">Cancel / Void</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  Marks instruction as <strong>Failed / Voided</strong> with administrative reason.
                </p>
              </button>

            </div>
          </div>

          {/* Justification / Note */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Revision Justification & Executive Note *
            </label>
            <textarea
              rows={2}
              required
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Revised IPC certificate received with 2% withholding correction. Re-submitted for clearance."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          {/* Live Preview Delta */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Before:</span>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-semibold uppercase">After Revision:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currency} {parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Resulting Status:</span>
              <span className={`font-mono font-bold text-xs ${
                actionType === 'RESUBMIT_FOR_AUDIT' ? 'text-amber-600 dark:text-amber-400' :
                actionType === 'CANCEL_INSTRUCTION' ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                {actionType === 'RESUBMIT_FOR_AUDIT' ? 'Pending Audit' : actionType === 'CANCEL_INSTRUCTION' ? 'Cancelled / Failed' : payment.status}
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>Saving Revisions...</>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Apply DG Revision</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

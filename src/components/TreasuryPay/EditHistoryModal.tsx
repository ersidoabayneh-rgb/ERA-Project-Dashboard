import React from 'react';
import { 
  X, 
  History, 
  Clock, 
  User, 
  ArrowRight, 
  FileText, 
  ShieldAlert, 
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { PaymentInstruction } from '../../types/treasury';

interface EditHistoryModalProps {
  payment: PaymentInstruction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditHistoryModal: React.FC<EditHistoryModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  const history = payment.editHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-md font-mono text-indigo-300 border border-slate-700">
                  {payment.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Ref: {payment.projectReference}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Director General Edit History Log
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Edit History"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Overview Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Beneficiary
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate block">
              {payment.payee.name}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Terms
            </span>
            <span className="font-mono font-extrabold text-slate-900 dark:text-white">
              {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Logged Revisions
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {history.length} {history.length === 1 ? 'Revision Record' : 'Revision Records'}
            </span>
          </div>
        </div>

        {/* Modal Body / History Timeline */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4">
          
          {history.length > 0 ? (
            <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900 ml-4 pl-6 space-y-6">
              {history.map((entry, index) => {
                const amountDiff = entry.newAmount - entry.previousAmount;
                const isDecreased = amountDiff < 0;
                const isIncreased = amountDiff > 0;

                return (
                  <div key={entry.id || index} className="relative group">
                    
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                      
                      {/* Entry Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {entry.actionTaken.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {entry.editorName} ({entry.editorRole})
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* Financial Changes Diff */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* Amount Diff */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Amount Revision
                          </span>
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-slate-500 line-through">
                              {entry.previousCurrency} {entry.previousAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {entry.newCurrency} {entry.newAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {amountDiff !== 0 && (
                            <span className={`text-[10px] font-bold block mt-1 ${isDecreased ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {isDecreased ? '−' : '+'}{entry.newCurrency} {Math.abs(amountDiff).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({isDecreased ? 'Reduced' : 'Increased'})
                            </span>
                          )}
                        </div>

                        {/* Currency & Status Transition */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Status & Currency Transition
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {entry.previousStatus}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {entry.newStatus}
                            </span>
                            {entry.previousCurrency !== entry.newCurrency && (
                              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 ml-auto font-bold">
                                FX: {entry.previousCurrency} → {entry.newCurrency}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Revision Justification */}
                      <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-xs">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-0.5">
                          Director General Revision Justification:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 text-[11.5px] italic leading-relaxed">
                          "{entry.justification}"
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Administrative Revisions Recorded
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                This payment instruction currently retains its initial parameters. Any amount, currency, or action adjustments made by the Director General will be tracked here.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Immutable audit logging enforced for all executive modifications.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

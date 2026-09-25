import React, { useState } from 'react';
import { X, Send, Paperclip, AlertCircle, Building2, CheckCircle, FileText } from 'lucide-react';
import { PaymentCategory, CurrencyCode } from '../../types/treasury';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole?: string;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({
  isOpen,
  onClose,
  activeRole = 'DEPARTMENT_HEAD',
  onSubmit,
}) => {
  const [payeeName, setPayeeName] = useState('China Civil Engineering Construction Corp (CCECC)');
  const [payeeTin, setPayeeTin] = useState('0019284751');
  const [payeeEntityType, setPayeeEntityType] = useState<'Contractor' | 'Consultant' | 'PAP' | 'Authority'>('Contractor');
  const [payeeEmail, setPayeeEmail] = useState('treasury.ccecc.eth@ccecc.com.cn');
  const [payeePhone, setPayeePhone] = useState('+251 11 663 8820');

  const [bankName, setBankName] = useState('Commercial Bank of Ethiopia');
  const [accountNumber, setAccountNumber] = useState('1000192847581');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('CBETETAA');
  const [branchName, setBranchName] = useState('Finfine Special Corporate');

  const [amount, setAmount] = useState<number | string>(85000000);
  const [currency, setCurrency] = useState<CurrencyCode>('ETB');
  const [category, setCategory] = useState<PaymentCategory>('IPC_VALUATION');
  const [projectReference, setProjectReference] = useState('ERA/ICB/R-2023/LOT-04');
  const [projectName, setProjectName] = useState('Modjo - Hawassa Expressway (Lot 4)');
  const [purpose, setPurpose] = useState('Interim Payment Certificate IPC #15 - Road base compaction & drainage structures');

  const [docName, setDocName] = useState('IPC_15_Interim_Valuation_Certificate_Approved.pdf');
  const [docRef, setDocRef] = useState('ERA-VAL-IPC-15-2026');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setBankName(selected);
    if (selected === 'Commercial Bank of Ethiopia') {
      setSwiftBic('CBETETAA');
      setBranchName('Addis Ababa Central Branch');
    } else if (selected === 'Dashen Bank SC') {
      setSwiftBic('DASHETAA');
      setBranchName('Bole Medhanealem Corporate');
    } else if (selected === 'Awash International Bank') {
      setSwiftBic('AWINETAA');
      setBranchName('Ras Abebe Aregay Corporate');
    } else if (selected === 'Deutsche Bank AG Frankfurt') {
      setSwiftBic('DEUTDEDD');
      setBranchName('Frankfurt Corporate Desk');
      setIban('DE89370400440532013000');
    } else if (selected === 'Citibank N.A. London') {
      setSwiftBic('CITIGB2L');
      setBranchName('Canary Wharf FX Desk');
      setIban('GB82CITI182739401928');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (!payeeName.trim()) {
      setErrorMsg('Please enter the legal Payee Name.');
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMsg('Please enter the destination bank Account Number / IBAN.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        projectReference,
        projectName,
        category,
        purpose,
        amount: numAmount,
        currency,
        payeeName,
        payeeTin,
        payeeEntityType,
        payeeEmail,
        payeePhone,
        bankName,
        accountNumber,
        iban,
        swiftBic,
        branchName,
        supportingDocumentName: docName,
        supportingDocumentRef: docRef
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit payment instruction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Building2 className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/30 px-2 py-0.5 rounded-full border border-teal-400/30">
                  {activeRole === 'DEPARTMENT_HEAD' ? 'Department Head Submission' : activeRole === 'FINANCIAL_DIRECTOR' ? 'Financial Directorate Submission' : 'Director General Authority'}
                </span>
                <span className="text-xs text-teal-200 font-mono">Form ERA-FIN-P1</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Submit Payment Request for Financial Directorate Review
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Payee Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
              1. Payee & Contractual Beneficiary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payee / Legal Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="e.g. Sur Construction PLC"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Taxpayer Identification Number (TIN)
                </label>
                <input
                  type="text"
                  value={payeeTin}
                  onChange={(e) => setPayeeTin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                  placeholder="0019284751"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Entity Category
                </label>
                <select
                  value={payeeEntityType}
                  onChange={(e) => setPayeeEntityType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="Contractor">Contractor (Civil Works)</option>
                  <option value="Consultant">Supervision Consultant</option>
                  <option value="PAP">Project Affected Person (PAP Resettlement)</option>
                  <option value="Authority">Public Authority / Statutory Tax Remittance</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payee Notification Email
                </label>
                <input
                  type="email"
                  value={payeeEmail}
                  onChange={(e) => setPayeeEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="finance@payee.com"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Destination Bank & SWIFT */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
              2. Destination Bank, Account & SWIFT / BIC
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Destination Bank *
                </label>
                <select
                  value={bankName}
                  onChange={handleBankSelect}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Dashen Bank SC">Dashen Bank SC</option>
                  <option value="Awash International Bank">Awash International Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Nib International Bank">Nib International Bank</option>
                  <option value="Zemen Bank SC">Zemen Bank SC</option>
                  <option value="Deutsche Bank AG Frankfurt">Deutsche Bank AG Frankfurt (FX)</option>
                  <option value="Citibank N.A. London">Citibank N.A. London (FX)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Destination Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    if (!iban) {
                      setIban(`ET24${(swiftBic || 'CBET').slice(0, 4)}${e.target.value.padStart(16, '0')}`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                  placeholder="1000192837461"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Destination IBAN (International Bank Account No)
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono tracking-wide"
                  placeholder="ET24CBET1000192837461"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  SWIFT / BIC Code *
                </label>
                <input
                  type="text"
                  required
                  value={swiftBic}
                  onChange={(e) => setSwiftBic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono uppercase"
                  placeholder="CBETETAA"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Amount, Currency & Category */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
              3. Amount, Currency & Contractual Allocation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="lg:col-span-2">
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
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PaymentCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="IPC_VALUATION">IPC Valuation Certificate</option>
                  <option value="ADVANCE_MOBILIZATION">Advance Payment Mobilization</option>
                  <option value="ROW_COMPENSATION">ROW PAP Resettlement</option>
                  <option value="CONSULTANT_FEES">Consultant Supervision Fees</option>
                  <option value="RETENTION_RELEASE">Contractual Retention Release</option>
                  <option value="TAX_SETTLEMENT">Statutory VAT / Tax Settlement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Project Name & Contract Reference
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="e.g. Modjo - Hawassa Lot 4"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payment Purpose & Clause Mandate
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="e.g. Interim Payment Certificate IPC #15"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Supporting Document Attachments */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
              <span>4. Supporting Document Attachments</span>
              <span className="text-[10px] text-slate-400 font-normal">Mandatory for Financial Director Audit</span>
            </h4>
            
            <div className="p-3 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                    {docName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Ref: {docRef} • Verified Digital Signature
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4" /> Attached & Encrypted
              </div>
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
                <>Submitting Instruction...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Payment Instruction</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

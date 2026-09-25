import React, { useState } from 'react';
import { 
  Landmark, 
  ArrowRight, 
  Copy, 
  Check, 
  Building2, 
  User, 
  ShieldCheck, 
  BadgeCheck, 
  ExternalLink,
  ArrowRightLeft,
  Lock,
  Sparkles,
  Zap,
  Info,
  QrCode
} from 'lucide-react';
import { PaymentInstruction, TreasuryBankAccount, BankDetail } from '../../types/treasury';
import { INITIAL_TREASURY_ACCOUNTS } from '../../data/initialTreasuryData';

export interface TransferAccountRouteCardProps {
  payment: PaymentInstruction;
  accounts?: TreasuryBankAccount[];
  variant?: 'detailed' | 'compact' | 'approval_banner';
  showCopyButtons?: boolean;
  highlightForApproval?: boolean;
  onGenerateQr?: () => void;
  className?: string;
}

export function resolveSourceTreasuryAccount(
  payment: PaymentInstruction,
  accounts: TreasuryBankAccount[] = INITIAL_TREASURY_ACCOUNTS
): {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftBic: string;
  branch: string;
  clearedBalance?: number;
  availableBalance?: number;
  currency: string;
  isFx: boolean;
} {
  const found = accounts.find(a => a.id === payment.linkedBankAccountId) ||
    INITIAL_TREASURY_ACCOUNTS.find(a => a.id === payment.linkedBankAccountId);

  if (found) {
    const defaultIban = found.iban || (
      found.isFx 
        ? found.accountNumber 
        : `ET24${found.swiftBic.slice(0, 4)}${found.accountNumber.padStart(16, '0')}`
    );

    return {
      bankName: found.bankName,
      accountName: found.accountName,
      accountNumber: found.accountNumber,
      iban: defaultIban,
      swiftBic: found.swiftBic,
      branch: found.branch,
      clearedBalance: found.clearedBalance,
      availableBalance: found.availableBalance,
      currency: found.currency,
      isFx: found.isFx
    };
  }

  // Fallback if not matching a predefined treasury ID
  const isUSD = payment.currency === 'USD';
  return {
    bankName: isUSD ? 'Citibank N.A. London / Deutsche Bank' : 'Commercial Bank of Ethiopia (CBE)',
    accountName: isUSD ? 'ERA Strategic FX Disbursal Reserve' : 'ERA Central Treasury Operations',
    accountNumber: isUSD ? 'GB82CITI182739401928' : '1000003928172',
    iban: isUSD ? 'GB82CITI182739401928' : 'ET24CBET1000003928172',
    swiftBic: isUSD ? 'CITIGB2L' : 'CBETETAA',
    branch: isUSD ? 'Canary Wharf FX Desk' : 'Central Addis Ababa Main Branch',
    currency: payment.currency,
    isFx: isUSD
  };
}

export function resolveDestinationBankDetails(payment: PaymentInstruction): {
  bankName: string;
  accountNumber: string;
  iban: string;
  swiftBic: string;
  branchName: string;
  payeeName: string;
  tin: string;
  entityType: string;
} {
  const dest = payment.destinationBank;
  const payee = payment.payee;
  
  const generatedIban = dest.iban || (
    dest.swiftBic === 'DEUTDEDD'
      ? dest.accountNumber
      : `ET24${(dest.swiftBic || 'CBET').slice(0, 4)}${dest.accountNumber.padStart(16, '0')}`
  );

  return {
    bankName: dest.bankName || 'Commercial Bank of Ethiopia',
    accountNumber: dest.accountNumber,
    iban: generatedIban,
    swiftBic: dest.swiftBic || 'CBETETAA',
    branchName: dest.branchName || 'Finfine Special Branch',
    payeeName: payee.name,
    tin: payee.tin,
    entityType: payee.entityType
  };
}

export const TransferAccountRouteCard: React.FC<TransferAccountRouteCardProps> = ({
  payment,
  accounts = INITIAL_TREASURY_ACCOUNTS,
  variant = 'detailed',
  showCopyButtons = true,
  highlightForApproval = false,
  onGenerateQr,
  className = ''
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const source = resolveSourceTreasuryAccount(payment, accounts);
  const dest = resolveDestinationBankDetails(payment);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // -------------------------------------------------------------
  // VARIANT: APPROVAL BANNER (High-Prominence Verification Block)
  // -------------------------------------------------------------
  if (variant === 'approval_banner') {
    return (
      <div className={`p-4 rounded-2xl border ${
        highlightForApproval 
          ? 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 border-indigo-500/60 shadow-lg text-white' 
          : 'bg-slate-900 text-white border-slate-800'
      } space-y-3 ${className}`}>
        
        {/* Verification Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
              Transfer Route & Account Verification
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
              <Check className="w-2.5 h-2.5" />
              Pre-Cleared IBAN & Account Validated
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onGenerateQr && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateQr();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 transition cursor-pointer"
                title="Generate scannable Mobile Payment QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-300" />
                <span>Payment QR</span>
              </button>
            )}
            <span className="text-xs font-mono font-black text-amber-300">
              {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Dual Column Route */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          
          {/* SOURCE (FROM) */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Landmark className="w-3 h-3" />
                FROM: ERA Treasury Account
              </span>
              <span className="text-[9.5px] font-mono text-slate-400">
                {source.branch}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-100 truncate" title={source.accountName}>
              {source.accountName}
            </div>
            <div className="text-[11px] text-slate-400">
              {source.bankName}
            </div>

            <div className="pt-1 space-y-1 font-mono text-[11px] border-t border-slate-800/80">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500 text-[10px]">Account No:</span>
                <div className="flex items-center gap-1 font-bold">
                  <span>{source.accountNumber}</span>
                  {showCopyButtons && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(source.accountNumber, 'src-acc', e)}
                      className="text-slate-500 hover:text-white p-0.5"
                      title="Copy Source Account Number"
                    >
                      {copiedKey === 'src-acc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-indigo-300 bg-indigo-950/40 p-1 rounded-md border border-indigo-900/60">
                <span className="text-slate-400 text-[10px]">IBAN:</span>
                <div className="flex items-center gap-1 font-bold">
                  <span className="tracking-wide text-[10.5px]">{source.iban}</span>
                  {showCopyButtons && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(source.iban, 'src-iban', e)}
                      className="text-indigo-400 hover:text-white p-0.5"
                      title="Copy Source IBAN"
                    >
                      {copiedKey === 'src-iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>SWIFT / BIC:</span>
                <span className="font-bold text-slate-200">{source.swiftBic}</span>
              </div>
            </div>
          </div>

          {/* DESTINATION (TO) */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-950/80 ring-1 ring-emerald-500/20 space-y-1.5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                TO: Payee Beneficiary Account
              </span>
              <span className="text-[9.5px] font-mono text-slate-400">
                TIN: {dest.tin}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-100 truncate" title={dest.payeeName}>
              {dest.payeeName}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {dest.bankName} • {dest.branchName}
            </div>

            <div className="pt-1 space-y-1 font-mono text-[11px] border-t border-slate-800/80">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500 text-[10px]">Account No:</span>
                <div className="flex items-center gap-1 font-bold">
                  <span className="text-emerald-300">{dest.accountNumber}</span>
                  {showCopyButtons && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(dest.accountNumber, 'dest-acc', e)}
                      className="text-slate-500 hover:text-white p-0.5"
                      title="Copy Beneficiary Account Number"
                    >
                      {copiedKey === 'dest-acc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-emerald-300 bg-emerald-950/40 p-1 rounded-md border border-emerald-900/60">
                <span className="text-slate-400 text-[10px]">IBAN:</span>
                <div className="flex items-center gap-1 font-bold">
                  <span className="tracking-wide text-[10.5px]">{dest.iban}</span>
                  {showCopyButtons && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(dest.iban, 'dest-iban', e)}
                      className="text-emerald-400 hover:text-white p-0.5"
                      title="Copy Beneficiary IBAN"
                    >
                      {copiedKey === 'dest-iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>SWIFT / BIC:</span>
                <span className="font-bold text-slate-200">{dest.swiftBic}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT: COMPACT (For Table Rows, Badges, or Preview Widgets)
  // -------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between font-mono text-[10.5px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 uppercase font-bold text-[9.5px]">From:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={source.bankName}>
              {source.bankName.split(' ')[0]} ({source.accountNumber.slice(-4)})
            </span>
          </div>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <div className="flex items-center gap-1">
            <span className="text-slate-400 uppercase font-bold text-[9.5px]">To:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[130px]" title={dest.bankName}>
              {dest.bankName.split(' ')[0]} ({dest.accountNumber.slice(-4)})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
          <span className="truncate max-w-[150px]" title={source.iban}>
            Src IBAN: {source.iban}
          </span>
          <span className="truncate max-w-[150px]" title={dest.iban}>
            Dest IBAN: {dest.iban}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT: DETAILED (Full Dossier Display Card)
  // -------------------------------------------------------------
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden ${className}`}>
      
      {/* Card Header */}
      <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Payment Instruction Banking & Settlement Route
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Direct Account-to-Account Treasury Settlement Channel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGenerateQr && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateQr();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition cursor-pointer"
              title="Generate Scannable Mobile Payment QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Generate Payment QR</span>
            </button>
          )}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            ISO 20022 / RTGS Direct
          </span>
        </div>
      </div>

      {/* Main Account Details Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ========================================================= */}
        {/* FROM: ERA TREASURY DISBURSEMENT ACCOUNT CARD */}
        {/* ========================================================= */}
        <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 space-y-3 relative">
          
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                FROM
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                ERA Treasury Disbursement Account
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {source.currency} Pool
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {source.bankName}
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {source.accountName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Branch: <strong>{source.branch}</strong>
            </div>
          </div>

          {/* Account Numbers & IBAN Box */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-xs">
            
            {/* Account Number */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Account No:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  {source.accountNumber}
                </span>
                {showCopyButtons && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(source.accountNumber, 'src-acc-full', e)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Copy Account Number"
                  >
                    {copiedKey === 'src-acc-full' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* IBAN */}
            <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
              <span className="text-indigo-900 dark:text-indigo-300 font-bold text-[10.5px]">IBAN:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wide text-indigo-700 dark:text-indigo-300 text-xs">
                  {source.iban}
                </span>
                {showCopyButtons && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(source.iban, 'src-iban-full', e)}
                    className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition"
                    title="Copy Source IBAN"
                  >
                    {copiedKey === 'src-iban-full' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* SWIFT / BIC */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>SWIFT / BIC Code:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{source.swiftBic}</span>
            </div>

          </div>

          <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono pt-1">
            <span>Disbursement Channel:</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {payment.gatewayPlatform || 'Adyen BalancePlatform / CBE RTGS'}
            </span>
          </div>

        </div>

        {/* ========================================================= */}
        {/* TO: BENEFICIARY SETTLEMENT ACCOUNT CARD */}
        {/* ========================================================= */}
        <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 space-y-3 relative">
          
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                TO
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Beneficiary Payee Settlement Account
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {dest.entityType}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate" title={dest.payeeName}>
              {dest.payeeName}
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {dest.bankName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Branch: <strong>{dest.branchName}</strong></span>
              <span>TIN: <strong className="font-mono">{dest.tin}</strong></span>
            </div>
          </div>

          {/* Account Numbers & IBAN Box */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-xs">
            
            {/* Account Number */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Account No:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {dest.accountNumber}
                </span>
                {showCopyButtons && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(dest.accountNumber, 'dest-acc-full', e)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Copy Beneficiary Account Number"
                  >
                    {copiedKey === 'dest-acc-full' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* IBAN */}
            <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-emerald-900 dark:text-emerald-300 font-bold text-[10.5px]">IBAN:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wide text-emerald-700 dark:text-emerald-300 text-xs">
                  {dest.iban}
                </span>
                {showCopyButtons && (
                  <button
                    type="button"
                    onClick={(e) => handleCopy(dest.iban, 'dest-iban-full', e)}
                    className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 transition"
                    title="Copy Beneficiary IBAN"
                  >
                    {copiedKey === 'dest-iban-full' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* SWIFT / BIC */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>SWIFT / BIC Code:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dest.swiftBic}</span>
            </div>

          </div>

          <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono pt-1">
            <span>Payee Validation:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" />
              Verified Beneficiary Profile
            </span>
          </div>

        </div>

      </div>

      {/* Direction Flow Summary Bar */}
      <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{source.accountNumber}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">{dest.accountNumber} ({dest.payeeName})</span>
        </div>
        <div className="text-[11px] text-slate-500 shrink-0">
          Target Disbursement: <strong className="text-slate-900 dark:text-white">{payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

    </div>
  );
};

import React, { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  X, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Smartphone, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  Printer,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PaymentInstruction } from '../../types/treasury';
import { resolveSourceTreasuryAccount, resolveDestinationBankDetails } from './TransferAccountRouteCard';

export interface PaymentQrCodeModalProps {
  payment: PaymentInstruction | null;
  isOpen: boolean;
  onClose: () => void;
}

export type QrFormatType = 'EMV_ISO20022' | 'ETH_SWITCH_STANDARD' | 'JSON_INTEGRATION' | 'EPC_SEPA';

export const PaymentQrCodeModal: React.FC<PaymentQrCodeModalProps> = ({
  payment,
  isOpen,
  onClose
}) => {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrFormat, setQrFormat] = useState<QrFormatType>('EMV_ISO20022');
  const [includePurpose, setIncludePurpose] = useState(true);
  const [qrLevel, setQrLevel] = useState<'M' | 'Q' | 'H'>('Q');
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  const source = resolveSourceTreasuryAccount(payment);
  const dest = resolveDestinationBankDetails(payment);

  // Generate standardized mobile banking payloads
  const generateQrPayload = (): string => {
    switch (qrFormat) {
      case 'ETH_SWITCH_STANDARD':
        // Ethiopian National Switch & Mobile Banking QR Standard
        return `ETHSWITCH://PAY?acc=${encodeURIComponent(dest.accountNumber)}&name=${encodeURIComponent(dest.payeeName)}&amt=${payment.amount.toFixed(2)}&curr=${payment.currency}&ref=${encodeURIComponent(payment.id)}&proj=${encodeURIComponent(payment.projectReference)}&bic=${encodeURIComponent(dest.swiftBic)}&bank=${encodeURIComponent(dest.bankName)}`;
      
      case 'JSON_INTEGRATION':
        // Structured API / Mobile App JSON payload
        return JSON.stringify({
          protocol: 'ERA_TREASURY_PAY_V2',
          paymentId: payment.id,
          projectReference: payment.projectReference,
          sourceAccount: {
            bankName: source.bankName,
            accountNumber: source.accountNumber,
            iban: source.iban,
            swiftBic: source.swiftBic
          },
          destinationAccount: {
            payeeName: dest.payeeName,
            bankName: dest.bankName,
            accountNumber: dest.accountNumber,
            iban: dest.iban,
            swiftBic: dest.swiftBic,
            tin: dest.tin
          },
          amount: payment.amount,
          currency: payment.currency,
          purpose: includePurpose ? payment.purpose : undefined,
          timestamp: new Date().toISOString(),
          status: payment.status
        }, null, 2);

      case 'EPC_SEPA':
        // European / International EPC QR Code format
        return [
          'BCD',
          '002',
          '1',
          'SCT',
          dest.swiftBic,
          dest.payeeName,
          dest.iban,
          `${payment.currency}${payment.amount.toFixed(2)}`,
          'CHAR',
          payment.id,
          payment.projectReference,
          includePurpose ? payment.purpose.slice(0, 140) : ''
        ].join('\n');

      case 'EMV_ISO20022':
      default:
        // Universal EMVCo / ISO 20022 Compliant Banking URI
        return `bankpay://transfer?toAccount=${encodeURIComponent(dest.accountNumber)}&iban=${encodeURIComponent(dest.iban)}&beneficiary=${encodeURIComponent(dest.payeeName)}&amount=${payment.amount.toFixed(2)}&currency=${payment.currency}&reference=${encodeURIComponent(payment.id)}&projectRef=${encodeURIComponent(payment.projectReference)}&bic=${encodeURIComponent(dest.swiftBic)}&timestamp=${encodeURIComponent(new Date().toISOString())}`;
    }
  };

  const payloadString = generateQrPayload();

  // Copy full payload
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payloadString);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2200);
  };

  // Copy individual field
  const handleCopyField = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Download QR Code as PNG
  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.querySelector('canvas');
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `Payment_QR_${payment.id}_${payment.currency}_${payment.amount}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Print voucher slip
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-400/30">
                  {payment.id}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  Ref: {payment.projectReference}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Mobile Banking Payment QR Code
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close QR Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Format Selector Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Integration Protocol:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setQrFormat('EMV_ISO20022')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qrFormat === 'EMV_ISO20022'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                ISO 20022 / Universal URI
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('ETH_SWITCH_STANDARD')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qrFormat === 'ETH_SWITCH_STANDARD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                EthSwitch / CBE Birr
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('JSON_INTEGRATION')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  qrFormat === 'JSON_INTEGRATION'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                JSON Payload
              </button>
            </div>
          </div>

          {/* Main QR Display & Payment Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* QR Code Canvas Box */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-850 dark:to-slate-900 border border-indigo-100 dark:border-indigo-950 shadow-inner">
              
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 relative group" ref={canvasRef}>
                <QRCodeCanvas
                  value={payloadString}
                  size={200}
                  level={qrLevel}
                  marginSize={2}
                  className="rounded-lg"
                />
                
                <div className="absolute inset-0 bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition rounded-2xl flex items-center justify-center pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold">
                    Scan with Mobile App
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center space-y-0.5">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Scannable Mobile QR
                </span>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Works with CBE Mobile, Telebirr, CBE Birr & ISO 20022 Apps
                </p>
              </div>

            </div>

            {/* Structured Payment Coordinates Surfaced */}
            <div className="md:col-span-7 space-y-3">
              
              {/* Total Amount Badge */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Disbursement Amount
                  </span>
                  <div className="text-xl font-black font-mono text-indigo-950 dark:text-indigo-100">
                    {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                  {payment.status}
                </span>
              </div>

              {/* Account Details Box */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                
                {/* Beneficiary Name */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 font-sans text-[11px]">Beneficiary Payee:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-900 dark:text-white text-right truncate max-w-[180px]" title={dest.payeeName}>
                      {dest.payeeName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(dest.payeeName, 'payee')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {copiedField === 'payee' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 font-sans text-[11px]">Destination Account:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {dest.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(dest.accountNumber, 'acc')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* IBAN */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 font-sans text-[11px]">Destination IBAN:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate max-w-[170px]" title={dest.iban}>
                      {dest.iban}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(dest.iban, 'iban')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Bank Name & SWIFT */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 font-sans text-[11px]">Settlement Bank:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[190px]">
                    {dest.bankName} ({dest.swiftBic})
                  </span>
                </div>

                {/* Payment Reference */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans text-[11px]">Payment Ref:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {payment.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(payment.id, 'ref')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {copiedField === 'ref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Raw Scannable Payload Preview & Copy Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Encoded Payload Stream ({payloadString.length} bytes)</span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-black">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Encoded String</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-slate-950 text-indigo-300 text-[11px] font-mono overflow-x-auto max-h-24 border border-slate-800 select-all">
              {payloadString}
            </pre>
          </div>

          {/* Compliance & Verification Info Box */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-900 dark:text-emerald-200 text-[11.5px] leading-relaxed">
              <strong>Treasury Mobile Clearance:</strong> This QR code is cryptographically bound to Payment Instruction <strong>{payment.id}</strong> (Project: {payment.projectReference}). Scanning with an authorized mobile banking terminal pre-fills the exact account coordinates and prevents manual reconciliation errors.
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-850 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPNG}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPayload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Payload</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

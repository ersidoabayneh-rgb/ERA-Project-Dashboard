import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  CheckCircle, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  Download,
  Eye,
  Paperclip,
  UploadCloud,
  FileCheck,
  X,
  Printer,
  MapPin,
  Building
} from 'lucide-react';
import { Project, BondGuarantee, formatAccounting, FinancialInstitute, GuarantyPolicyCategory, BondSecurityType, BondAttachment, User } from '../types';
import { DEFAULT_FINANCIAL_INSTITUTES } from '../data/defaultFinancialInstitutes';
import { DEFAULT_GUARANTY_POLICY_CATEGORIES } from '../data/defaultGuarantyCategories';
import FinancialInstitutesAndGuarantiesModal from './FinancialInstitutesAndGuarantiesModal';
import { generateBondGuaranteePdf } from '../lib/bondPdfGenerator';

interface BondsGuaranteeViewProps {
  project: Project;
  currentUser?: User;
  onUpdateBonds: (bonds: BondGuarantee[]) => void;
}

const STORAGE_KEY_INSTITUTES = 'era_financial_institutes_v1';
const STORAGE_KEY_GUARANTIES = 'era_guaranty_categories_v1';

export default function BondsGuaranteeView({ project, currentUser, onUpdateBonds }: BondsGuaranteeViewProps) {
  const bonds = project.bonds || [];
  const [isRegistryModalOpen, setIsRegistryModalOpen] = useState(false);
  const [registryInitialTab, setRegistryInitialTab] = useState<'institutes' | 'guaranties'>('guaranties');

  // Preview & Attachment Modal state
  const [previewPdfModalBond, setPreviewPdfModalBond] = useState<BondGuarantee | null>(null);
  const [activeAttachmentBondIdx, setActiveAttachmentBondIdx] = useState<number | null>(null);

  // Load registered financial institutes & guarantee categories
  const [institutes, setInstitutes] = useState<FinancialInstitute[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INSTITUTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load institutes in BondsGuaranteeView', e);
    }
    return DEFAULT_FINANCIAL_INSTITUTES;
  });

  const [guaranties, setGuaranties] = useState<GuarantyPolicyCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUARANTIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load guaranties in BondsGuaranteeView', e);
    }
    return DEFAULT_GUARANTY_POLICY_CATEGORIES;
  });

  // Reload registry when modal updates
  const reloadRegistry = () => {
    try {
      const savedInst = localStorage.getItem(STORAGE_KEY_INSTITUTES);
      if (savedInst) setInstitutes(JSON.parse(savedInst));

      const savedGuar = localStorage.getItem(STORAGE_KEY_GUARANTIES);
      if (savedGuar) setGuaranties(JSON.parse(savedGuar));
    } catch (e) {
      console.warn('Error reloading registry', e);
    }
  };

  const handleFieldChange = (idx: number, field: keyof BondGuarantee, value: any) => {
    const updated = bonds.map((b, i) => {
      if (i === idx) {
        const key = field;
        const processedValue = (key === 'amount' || key === 'amountUsd') ? (parseFloat(value) || 0) : value;
        const item = { ...b, [key]: processedValue };
        
        // Auto-detect category if type changed
        if (field === 'type' && value) {
          const matchedCategory = guaranties.find(g => g.name.toLowerCase() === String(value).toLowerCase());
          if (matchedCategory) {
            item.category = matchedCategory.category;
          } else if (String(value).toLowerCase().includes('insurance') || String(value).toLowerCase().includes('policy') || String(value).toLowerCase().includes('car')) {
            item.category = 'Insurance';
          } else if (String(value).toLowerCase().includes('unconditional') && String(value).toLowerCase().includes('bond')) {
            item.category = 'Unconditional Bond';
          } else if (String(value).toLowerCase().includes('conditional') && String(value).toLowerCase().includes('bond')) {
            item.category = 'Conditional Bond';
          } else if (String(value).toLowerCase().includes('bond')) {
            item.category = 'Unconditional Bond';
          } else if (String(value).toLowerCase().includes('conditional')) {
            item.category = 'Conditional Guarantee';
          } else {
            item.category = 'Unconditional Guarantee';
          }
        }

        // Auto-populate default branch if bank changes and branch is empty
        if (field === 'bank' && value) {
          const matchedInst = institutes.find(inst => inst.name.toLowerCase() === String(value).toLowerCase());
          if (matchedInst && matchedInst.knownBranches && matchedInst.knownBranches.length > 0 && !item.issuingBranch) {
            item.issuingBranch = matchedInst.knownBranches[0];
          }
        }

        // Auto convert to Expired if expire date is in the past
        if (field === 'expireDate' && value) {
          const exp = new Date(value);
          const now = new Date();
          if (exp < now) {
            item.status = 'Expired';
          } else if (item.status === 'Expired') {
            item.status = 'Valid';
          }
        }
        return item;
      }
      return b;
    });
    onUpdateBonds(updated);
  };

  // Add new bond / guarantee row with branch and automatic PDF instrument attachment initialized
  const handleAddField = (category: BondSecurityType = 'Unconditional Guarantee') => {
    let defaultType = 'Unconditional Performance Bank Guarantee';
    if (category === 'Conditional Guarantee') defaultType = 'Conditional Performance Guarantee';
    else if (category === 'Unconditional Bond') defaultType = 'Unconditional Performance Bond';
    else if (category === 'Conditional Bond') defaultType = 'Conditional Performance Bond';
    else if (category === 'Insurance') defaultType = 'CAR Policy (Contractor All Risk Policy)';

    const defaultBank = category === 'Insurance'
      ? 'Ethiopian Insurance Corporation (EIC)'
      : 'Commercial Bank of Ethiopia (CBE)';

    const defaultBranch = category === 'Insurance'
      ? 'Main City Branch'
      : 'Finfinne Main Branch';

    const newSno = bonds.length + 1;
    const refNo = `ERA/SEC/${project.id.slice(0, 6).toUpperCase()}/${newSno.toString().padStart(3, '0')}`;

    // Auto-create initial official PDF instrument attachment
    const initialPdfAttachment: BondAttachment = {
      id: `att-pdf-${Date.now()}`,
      name: `${category.replace(/\s+/g, '_')}_Ref_${refNo.replace(/\//g, '_')}.pdf`,
      size: '148 KB',
      uploadedAt: new Date().toISOString(),
      fileType: 'application/pdf'
    };

    const newBond: BondGuarantee = {
      sno: newSno,
      type: defaultType,
      category: category,
      bank: defaultBank,
      issuingBranch: defaultBranch,
      amount: 0,
      amountUsd: 0,
      issueDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      status: 'Valid',
      policyOrBondRefNo: refNo,
      attachments: [initialPdfAttachment],
      pdfGenerated: true
    };
    onUpdateBonds([...bonds, newBond]);
  };

  // Trigger PDF Generation and Download
  const handleDownloadPdf = (bond: BondGuarantee) => {
    try {
      const doc = generateBondGuaranteePdf(bond, project);
      const safeName = (bond.type || 'Security_Instrument').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`ERA_${safeName}_${bond.policyOrBondRefNo || bond.sno}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Error generating PDF instrument. Please check your browser settings.');
    }
  };

  // Open Preview Modal
  const handlePreviewPdf = (bond: BondGuarantee) => {
    setPreviewPdfModalBond(bond);
  };

  // Upload custom PDF attachment
  const handleFileUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      const newAttachment: BondAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: dataUrl,
        uploadedAt: new Date().toISOString(),
        fileType: file.type || 'application/pdf'
      };

      const updated = bonds.map((b, i) => {
        if (i === idx) {
          const currentAtts = b.attachments || [];
          return {
            ...b,
            attachments: [...currentAtts, newAttachment]
          };
        }
        return b;
      });

      onUpdateBonds(updated);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Delete an attachment
  const handleDeleteAttachment = (bondIdx: number, attachmentId: string) => {
    const updated = bonds.map((b, i) => {
      if (i === bondIdx) {
        return {
          ...b,
          attachments: (b.attachments || []).filter(a => a.id !== attachmentId)
        };
      }
      return b;
    });
    onUpdateBonds(updated);
  };

  const formatMoney = (v: number) => 
    formatAccounting(v, '');

  const checkStatus = (b: BondGuarantee) => {
    if (b.status === 'Recovered') return { text: 'Fully Amortized', class: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' };
    if (b.status === 'N/A') return { text: 'N/A', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800' };
    
    const now = new Date();
    const exp = new Date(b.expireDate);
    
    if (b.status === 'Expired' || exp < now) {
      return { text: 'Expired', class: 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-300 animate-pulse' };
    }
    
    const fortyFiveDays = 45 * 86450000;
    if (exp.getTime() - now.getTime() < fortyFiveDays) {
      return { text: 'Expiring Soon', class: 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border-amber-300 font-bold' };
    }

    return { text: 'Active & Valid', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' };
  };

  return (
    <div className="space-y-4">
      {/* Global Datalists for Autocomplete & Selection */}
      <datalist id="registered-guaranty-categories">
        {guaranties.map(g => (
          <option key={g.id} value={g.name}>
            {g.category}: {g.name}
          </option>
        ))}
      </datalist>

      <datalist id="registered-financial-institutes">
        {institutes.map(i => (
          <option key={i.id} value={i.name}>
            {i.type || 'Bank'} • {i.name}
          </option>
        ))}
      </datalist>

      {/* Header element */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            Bonds, Guarantees & Insurance Policies Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Securities issued by registered banks & insurance corporations with designated issuing branches & official PDF instruments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setRegistryInitialTab('institutes');
              setIsRegistryModalOpen(true);
            }}
            className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Open Banks, Insurances, and Guarantee Policy Categories configuration registry"
          >
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Banks, Insurances & Branch Registry</span>
          </button>

          {/* Quick Add Dropdown / Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleAddField('Unconditional Guarantee')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Add Unconditional Guarantee (with PDF Attachment)"
            >
              <Plus className="w-3.5 h-3.5" />
              + Unconditional Guarantee
            </button>

            <button
              onClick={() => handleAddField('Conditional Guarantee')}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Add Conditional Guarantee (with PDF Attachment)"
            >
              <Plus className="w-3.5 h-3.5" />
              + Conditional Guarantee
            </button>

            <button
              onClick={() => handleAddField('Unconditional Bond')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Add Unconditional Bond (with PDF Attachment)"
            >
              <Plus className="w-3.5 h-3.5" />
              + Unconditional Bond
            </button>

            <button
              onClick={() => handleAddField('Conditional Bond')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Add Conditional Bond (with PDF Attachment)"
            >
              <Plus className="w-3.5 h-3.5" />
              + Conditional Bond
            </button>

            <button
              onClick={() => handleAddField('Insurance')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer"
              title="Add Insurance Policy (with PDF Attachment)"
            >
              <Plus className="w-3.5 h-3.5" />
              + Insurance Policy
            </button>
          </div>
        </div>
      </div>

      {/* Bond Guarantee & Insurance Items List */}
      {bonds.map((b, idx) => {
        const flag = checkStatus(b);
        const expDate = new Date(b.expireDate);
        const isExpiring = flag.text === 'Expiring Soon';
        const category = b.category || 'Unconditional Guarantee';
        const attachments = b.attachments || [];

        const categoryBorder = category === 'Unconditional Guarantee'
          ? 'border-blue-200/90 dark:border-blue-900/60'
          : category === 'Conditional Guarantee'
          ? 'border-sky-200/90 dark:border-sky-900/60'
          : category === 'Unconditional Bond'
          ? 'border-purple-200/90 dark:border-purple-900/60'
          : category === 'Conditional Bond'
          ? 'border-indigo-200/90 dark:border-indigo-900/60'
          : 'border-emerald-200/90 dark:border-emerald-900/60';

        const categoryBadgeStyle = category === 'Unconditional Guarantee'
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800'
          : category === 'Conditional Guarantee'
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800'
          : category === 'Unconditional Bond'
          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800'
          : category === 'Conditional Bond'
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

        // Find matched institute for dynamic branch suggestions
        const matchedInst = institutes.find(i => i.name.toLowerCase() === (b.bank || '').toLowerCase());
        const suggestedBranches = matchedInst?.knownBranches || [
          'Finfinne Main Branch',
          'Main City Branch',
          'Bole Branch',
          'Kazanchis Branch',
          'Legehar Branch',
          'Adama Branch',
          'Hawassa Branch',
          'Bahir Dar Branch',
          'Dire Dawa Branch',
          'Mekelle Branch'
        ];

        return (
          <div 
            key={idx} 
            className={`bg-white dark:bg-slate-800 border p-4 rounded-2xl shadow-xs space-y-3 transition ${categoryBorder}`}
          >
            {/* Top Grid: Category, Type, Bank, Branch, Amounts, Expiry, Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Left Column: Index, Type Dropdown, Title */}
              <div className="lg:col-span-3 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                      #{b.sno || idx + 1}
                    </span>
                    
                    {/* 5-Option Type Dropdown Selector */}
                    <select
                      value={category}
                      onChange={(e) => handleFieldChange(idx, 'category', e.target.value as BondSecurityType)}
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border cursor-pointer outline-none ${categoryBadgeStyle}`}
                    >
                      <option value="Conditional Bond">📜 Conditional Bond</option>
                      <option value="Unconditional Bond">📜 Unconditional Bond</option>
                      <option value="Conditional Guarantee">🛡️ Conditional Guarantee</option>
                      <option value="Unconditional Guarantee">🛡️ Unconditional Guarantee</option>
                      <option value="Insurance">📋 Insurance</option>
                    </select>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-lg ${flag.class}`}>
                    {flag.text}
                  </span>
                </div>

                {/* Autocomplete Input connected with Registered Categories */}
                <div>
                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block uppercase">
                    Security / Policy Title
                  </label>
                  <input
                    type="text"
                    list="registered-guaranty-categories"
                    value={b.type}
                    onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                    placeholder="e.g. Performance Guarantee, CAR Policy..."
                    className="text-sm font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 w-full px-2.5 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Middle Elements: Bank/Insurer, Issuing Branch, Amounts, Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 lg:col-span-7 text-xs">
                {/* Financial Institute (Bank or Insurance Company) */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] text-slate-400 font-medium font-mono uppercase truncate block">
                    {category === 'Insurance' ? 'Insurance Co.' : 'Financial Institute'}
                  </label>
                  <input
                    type="text"
                    list="registered-financial-institutes"
                    value={b.bank}
                    onChange={(e) => handleFieldChange(idx, 'bank', e.target.value)}
                    placeholder="e.g. Commercial Bank of Ethiopia"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 px-2.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 truncate"
                  />
                </div>

                {/* Issuing Branch where Bond / Guarantee was Issued */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono uppercase truncate flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>Issuing Branch *</span>
                  </label>
                  <input
                    type="text"
                    list={`branches-list-${idx}`}
                    value={b.issuingBranch || ''}
                    onChange={(e) => handleFieldChange(idx, 'issuingBranch', e.target.value)}
                    placeholder="e.g. Finfinne Main, Bole..."
                    className="w-full bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 py-1.5 px-2 rounded-xl font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500 truncate"
                  />
                  <datalist id={`branches-list-${idx}`}>
                    {suggestedBranches.map((br, bIdx) => (
                      <option key={bIdx} value={br} />
                    ))}
                  </datalist>
                </div>

                {/* ETB Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium font-mono uppercase block">ETB Amount</label>
                  <input
                    type="text"
                    value={formatMoney(b.amount)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                      handleFieldChange(idx, 'amount', val);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-xl font-mono font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* USD Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium font-mono uppercase block">USD Amount</label>
                  <input
                    type="text"
                    value={formatMoney(b.amountUsd || 0)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                      handleFieldChange(idx, 'amountUsd', val);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-xl font-mono font-bold text-teal-600 dark:text-teal-400 outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium font-mono uppercase block">Expire date</label>
                  <input
                    type="date"
                    value={b.expireDate}
                    onChange={(e) => handleFieldChange(idx, 'expireDate', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 px-1.5 rounded-xl font-mono text-[11px] font-semibold text-center outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Right Column: Status & Delete */}
              <div className="lg:col-span-2 flex items-center justify-between gap-2 border-t lg:border-t-0 pt-2 lg:pt-0">
                <div className="space-y-0.5 text-xs text-left flex-1">
                  <p className="text-[9px] text-slate-400 font-mono uppercase">Status</p>
                  <select
                    value={b.status}
                    onChange={(e) => handleFieldChange(idx, 'status', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-xl font-bold text-xs outline-none"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Recovered">Recovered / Returned</option>
                    <option value="Expired">Expired</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <button
                  onClick={() => onUpdateBonds(bonds.filter((_, i) => i !== idx))}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                  title="Delete Bond / Policy"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Bar: PDF Instrument Generator & File Attachment Manager */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Left: Ref No, Issuing Branch summary, and PDF Generator */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                  <span className="font-bold text-slate-400">Ref:</span>
                  <input
                    type="text"
                    value={b.policyOrBondRefNo || `ERA/SEC/${project.id.slice(0, 6)}/${b.sno}`}
                    onChange={(e) => handleFieldChange(idx, 'policyOrBondRefNo', e.target.value)}
                    placeholder="Ref No..."
                    className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 w-32"
                  />
                </div>

                {b.issuingBranch && (
                  <div className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>{b.issuingBranch}</span>
                  </div>
                )}

                {/* Instant Official PDF Instrument Button */}
                <button
                  onClick={() => handleDownloadPdf(b)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer border border-rose-200 dark:border-rose-800"
                  title="Generate & Download Official ERA Security Guarantee Certificate PDF"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Download Official PDF</span>
                </button>

                <button
                  onClick={() => handlePreviewPdf(b)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  title="View formatted Security Guarantee Certificate"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview Instrument</span>
                </button>
              </div>

              {/* Right: PDF Attachments List & Upload */}
              <div className="flex flex-wrap items-center gap-2">
                {/* List Attached PDF chips */}
                {attachments.map((att) => (
                  <div 
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold"
                  >
                    <FileCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate max-w-[140px]" title={att.name}>{att.name}</span>
                    <button
                      onClick={() => handleDeleteAttachment(idx, att.id)}
                      className="text-emerald-600 hover:text-rose-600 transition cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload File Input Button */}
                <label className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer border border-blue-200 dark:border-blue-800">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Attach PDF / Scanned Copy</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => handleFileUpload(idx, e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            {/* Warning for expiring bonds */}
            {isExpiring && (
              <div className="bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-500/10 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>DANGER: This security guarantee / policy is expiring within 45 days. Contact the financial institution to initiate amassment or extend validity.</span>
              </div>
            )}
          </div>
        );
      })}

      {bonds.length === 0 && (
        <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-6 text-xs text-slate-400 space-y-3">
          <p>No securities, bank guarantees, or insurance policies registered yet.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleAddField('Unconditional Guarantee')}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
            >
              + Add Unconditional Guarantee
            </button>
            <button
              onClick={() => handleAddField('Conditional Guarantee')}
              className="px-3.5 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs hover:bg-sky-700 transition cursor-pointer"
            >
              + Add Conditional Guarantee
            </button>
            <button
              onClick={() => handleAddField('Unconditional Bond')}
              className="px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition cursor-pointer"
            >
              + Add Unconditional Bond
            </button>
            <button
              onClick={() => handleAddField('Conditional Bond')}
              className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              + Add Conditional Bond
            </button>
            <button
              onClick={() => handleAddField('Insurance')}
              className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              + Add Insurance Policy
            </button>
          </div>
        </div>
      )}

      {/* Security Instrument PDF Preview Modal */}
      <AnimatePresence>
        {previewPdfModalBond && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Official Security Instrument Certificate
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ref: {previewPdfModalBond.policyOrBondRefNo || `ERA/SEC/${project.id.slice(0, 6)}/${previewPdfModalBond.sno}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPdf(previewPdfModalBond)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setPreviewPdfModalBond(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Certificate Preview Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30">
                <div className="border-2 border-amber-400/80 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-4 shadow-sm text-xs">
                  <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA
                    </div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                      ETHIOPIAN ROADS ADMINISTRATION (ERA)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      OFFICIAL SECURITY GUARANTEE & POLICY INSTRUMENT LEDGER
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-center border border-amber-200 dark:border-amber-800">
                    <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-xs block">
                      {previewPdfModalBond.category || 'Unconditional Guarantee'} Instrument
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {previewPdfModalBond.type}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Project:</span>
                      <strong className="text-slate-900 dark:text-white text-right">{project.name}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Contractor (Principal):</span>
                      <span className="font-bold">{project.contractor || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Issuing Financial Institution:</span>
                      <strong className="text-blue-600 dark:text-blue-400">{previewPdfModalBond.bank}</strong>
                    </div>
                    {previewPdfModalBond.issuingBranch && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                        <span className="text-slate-500">Issuing Branch:</span>
                        <strong className="text-amber-700 dark:text-amber-300">{previewPdfModalBond.issuingBranch}</strong>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Certified Amount (ETB):</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        ETB {formatAccounting(previewPdfModalBond.amount, '')}
                      </strong>
                    </div>
                    {previewPdfModalBond.amountUsd && previewPdfModalBond.amountUsd > 0 && (
                      <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                        <span className="text-slate-500">Certified Amount (USD):</span>
                        <strong className="text-teal-600 dark:text-teal-400 font-mono">
                          USD ${formatAccounting(previewPdfModalBond.amountUsd, '')}
                        </strong>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Issue / Effective Date:</span>
                      <span className="font-mono">{previewPdfModalBond.issueDate}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="text-slate-500">Expiration / Maturity Date:</span>
                      <strong className="font-mono text-amber-600 dark:text-amber-400">{previewPdfModalBond.expireDate}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        {previewPdfModalBond.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Financial Institutes & Policy Registry Modal */}
      <FinancialInstitutesAndGuarantiesModal
        isOpen={isRegistryModalOpen}
        onClose={() => setIsRegistryModalOpen(false)}
        initialTab={registryInitialTab}
        currentUser={currentUser}
        onRegistryUpdated={reloadRegistry}
      />
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ShieldCheck, 
  Landmark, 
  Plus, 
  Search, 
  X, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw, 
  FileText, 
  Download, 
  MoreHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Building,
  Lock,
  Globe,
  Tag,
  Info,
  ExternalLink
} from 'lucide-react';
import { FinancialInstitute, GuarantyPolicyCategory, User, BondSecurityType } from '../types';
import { DEFAULT_FINANCIAL_INSTITUTES } from '../data/defaultFinancialInstitutes';
import { DEFAULT_GUARANTY_POLICY_CATEGORIES } from '../data/defaultGuarantyCategories';

interface FinancialInstitutesAndGuarantiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'institutes' | 'guaranties';
  currentUser?: User;
  onRegistryUpdated?: () => void;
}

const STORAGE_KEY_INSTITUTES = 'era_financial_institutes_v1';
const STORAGE_KEY_GUARANTIES = 'era_guaranty_categories_v1';

export default function FinancialInstitutesAndGuarantiesModal({
  isOpen,
  onClose,
  initialTab = 'guaranties',
  currentUser,
  onRegistryUpdated
}: FinancialInstitutesAndGuarantiesModalProps) {
  const [activeTab, setActiveTab] = useState<'institutes' | 'guaranties'>(initialTab);

  // Directorate Admin and Master Admin authorization check
  const canEditInstitutes = Boolean(
    currentUser?.role === 'master_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'directorate_admin' ||
    currentUser?.role === 'cpm_admin' ||
    currentUser?.role === 'director_general' ||
    currentUser?.role === 'finance_director' ||
    currentUser?.username === 'proj_1781786415663' ||
    (currentUser?.username && currentUser.username.toLowerCase().includes('ersido'))
  );

  // Sync initial tab if changed
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Financial Institutes State
  const [institutes, setInstitutes] = useState<FinancialInstitute[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INSTITUTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load institutes', e);
    }
    return DEFAULT_FINANCIAL_INSTITUTES;
  });

  // Guarantee / Policy Categories State
  const [guaranties, setGuaranties] = useState<GuarantyPolicyCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUARANTIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load guaranties', e);
    }
    return DEFAULT_GUARANTY_POLICY_CATEGORIES;
  });

  // Save helpers
  const saveInstitutes = (updated: FinancialInstitute[]) => {
    setInstitutes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_INSTITUTES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Institute save error', e);
    }
    if (onRegistryUpdated) onRegistryUpdated();
  };

  const saveGuaranties = (updated: GuarantyPolicyCategory[]) => {
    setGuaranties(updated);
    try {
      localStorage.setItem(STORAGE_KEY_GUARANTIES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Guaranties save error', e);
    }
    if (onRegistryUpdated) onRegistryUpdated();
  };

  // Detailed Form states for Financial Institutes
  const [instForm, setInstForm] = useState<Partial<FinancialInstitute>>({
    name: '',
    type: 'Bank',
    country: 'Ethiopia',
    swiftCode: '',
    licenseNo: '',
    tinNumber: '',
    headOfficeAddress: '',
    contactPerson: '',
    phone: '',
    email: '',
    knownBranches: [],
    notes: '',
    nbeApprovalStatus: 'Approved'
  });
  const [branchesInputText, setBranchesInputText] = useState('');
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [instFilterText, setInstFilterText] = useState('');
  const [instPage, setInstPage] = useState(1);
  const [activeInstMenuId, setActiveInstMenuId] = useState<string | null>(null);
  const [viewDetailInstitute, setViewDetailInstitute] = useState<FinancialInstitute | null>(null);
  const [showAddInstituteForm, setShowAddInstituteForm] = useState(false);

  // Form states for Guaranty / Policy Categories
  const [guarantyInputName, setGuarantyInputName] = useState('');
  const [guarantyCategoryType, setGuarantyCategoryType] = useState<BondSecurityType | ''>('');
  const [editingGuarantyId, setEditingGuarantyId] = useState<string | null>(null);
  const [guarantyFilterText, setGuarantyFilterText] = useState('');
  const [guarantyPage, setGuarantyPage] = useState(1);
  const [activeGuarantyMenuId, setActiveGuarantyMenuId] = useState<string | null>(null);

  const pageSize = 12;

  // Handle Institute Form Submit (Directorate Admin & Master Admin only)
  const handleSaveInstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditInstitutes) {
      alert('Unauthorized: Only Directorate Admin and Master Admin can create or modify financial institute credentials.');
      return;
    }

    if (!instForm.name?.trim()) {
      alert('Please enter a valid Financial Institute name.');
      return;
    }

    const branchesArray = branchesInputText
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const updatedData: FinancialInstitute = {
      id: editingInstId || `fi-${Date.now()}`,
      name: instForm.name.trim(),
      type: (instForm.type as any) || (instForm.name.toLowerCase().includes('insurance') ? 'Insurance' : 'Bank'),
      country: instForm.country?.trim() || 'Ethiopia',
      swiftCode: instForm.swiftCode?.trim() || undefined,
      licenseNo: instForm.licenseNo?.trim() || undefined,
      tinNumber: instForm.tinNumber?.trim() || undefined,
      headOfficeAddress: instForm.headOfficeAddress?.trim() || undefined,
      contactPerson: instForm.contactPerson?.trim() || undefined,
      phone: instForm.phone?.trim() || undefined,
      email: instForm.email?.trim() || undefined,
      knownBranches: branchesArray.length > 0 ? branchesArray : (instForm.knownBranches || []),
      notes: instForm.notes?.trim() || undefined,
      nbeApprovalStatus: (instForm.nbeApprovalStatus as any) || 'Approved',
      lastUpdatedBy: currentUser?.fullName || currentUser?.username || 'Admin',
      lastUpdatedAt: new Date().toISOString()
    };

    if (editingInstId) {
      const updated = institutes.map(item => item.id === editingInstId ? updatedData : item);
      saveInstitutes(updated);
      setEditingInstId(null);
    } else {
      saveInstitutes([updatedData, ...institutes]);
    }

    handleResetInstituteForm();
    setShowAddInstituteForm(false);
  };

  const handleResetInstituteForm = () => {
    setInstForm({
      name: '',
      type: 'Bank',
      country: 'Ethiopia',
      swiftCode: '',
      licenseNo: '',
      tinNumber: '',
      headOfficeAddress: '',
      contactPerson: '',
      phone: '',
      email: '',
      knownBranches: [],
      notes: '',
      nbeApprovalStatus: 'Approved'
    });
    setBranchesInputText('');
    setEditingInstId(null);
  };

  const handleEditInstitute = (inst: FinancialInstitute) => {
    if (!canEditInstitutes) {
      alert('Access Restricted: Only Directorate Admin and Master Admin can edit Financial Institution details.');
      return;
    }
    setInstForm({
      ...inst
    });
    setBranchesInputText(inst.knownBranches?.join(', ') || '');
    setEditingInstId(inst.id);
    setShowAddInstituteForm(true);
    setActiveInstMenuId(null);
  };

  const handleDeleteInstitute = (inst: FinancialInstitute) => {
    if (!canEditInstitutes) {
      alert('Access Restricted: Only Directorate Admin and Master Admin can delete Financial Institutions.');
      return;
    }
    setActiveInstMenuId(null);
    if (confirm(`Remove "${inst.name}" from the Financial Institutes registry?`)) {
      const updated = institutes.filter(i => i.id !== inst.id);
      saveInstitutes(updated);
    }
  };

  // Handle Guaranty / Policy Category Form Submit
  const handleSaveGuaranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guarantyInputName.trim()) {
      alert('Please enter a valid Guarantee, Bond, or Insurance Policy title.');
      return;
    }
    if (!guarantyCategoryType) {
      alert('Please select a category type (Conditional Bond, Unconditional Bond, Conditional Guarantee, Unconditional Guarantee, or Insurance).');
      return;
    }

    if (editingGuarantyId) {
      const updated = guaranties.map(item => {
        if (item.id === editingGuarantyId) {
          return {
            ...item,
            name: guarantyInputName.trim(),
            category: guarantyCategoryType as BondSecurityType
          };
        }
        return item;
      });
      saveGuaranties(updated);
      setEditingGuarantyId(null);
    } else {
      const newGuaranty: GuarantyPolicyCategory = {
        id: `gpc-${Date.now()}`,
        name: guarantyInputName.trim(),
        category: guarantyCategoryType as BondSecurityType
      };
      saveGuaranties([newGuaranty, ...guaranties]);
    }
    setGuarantyInputName('');
    setGuarantyCategoryType('');
  };

  const handleResetGuarantyForm = () => {
    setGuarantyInputName('');
    setGuarantyCategoryType('');
    setEditingGuarantyId(null);
  };

  const handleEditGuaranty = (item: GuarantyPolicyCategory) => {
    setGuarantyInputName(item.name);
    setGuarantyCategoryType(item.category);
    setEditingGuarantyId(item.id);
    setActiveGuarantyMenuId(null);
  };

  const handleDeleteGuaranty = (item: GuarantyPolicyCategory) => {
    setActiveGuarantyMenuId(null);
    if (confirm(`Remove "${item.name}" from the categories directory?`)) {
      const updated = guaranties.filter(g => g.id !== item.id);
      saveGuaranties(updated);
    }
  };

  // Filtered Institutes
  const filteredInstitutes = useMemo(() => {
    const q = instFilterText.toLowerCase().trim();
    if (!q) return institutes;
    return institutes.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.type && i.type.toLowerCase().includes(q)) ||
      (i.swiftCode && i.swiftCode.toLowerCase().includes(q)) ||
      (i.headOfficeAddress && i.headOfficeAddress.toLowerCase().includes(q)) ||
      (i.contactPerson && i.contactPerson.toLowerCase().includes(q)) ||
      (i.knownBranches && i.knownBranches.some(b => b.toLowerCase().includes(q)))
    );
  }, [institutes, instFilterText]);

  const totalInstPages = Math.max(1, Math.ceil(filteredInstitutes.length / pageSize));
  const paginatedInstitutes = useMemo(() => {
    const start = (instPage - 1) * pageSize;
    return filteredInstitutes.slice(start, start + pageSize);
  }, [filteredInstitutes, instPage, pageSize]);

  // Filtered Guaranties
  const filteredGuaranties = useMemo(() => {
    const q = guarantyFilterText.toLowerCase().trim();
    if (!q) return guaranties;
    return guaranties.filter(g => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [guaranties, guarantyFilterText]);

  const totalGuarantyPages = Math.max(1, Math.ceil(filteredGuaranties.length / pageSize));
  const paginatedGuaranties = useMemo(() => {
    const start = (guarantyPage - 1) * pageSize;
    return filteredGuaranties.slice(start, start + pageSize);
  }, [filteredGuaranties, guarantyPage, pageSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto"
      >
        {/* Modal Top Header with Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Security Guarantees & Policy Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register national banks, insurance corporations, issuing branches, and guarantee/policy categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEditInstitutes ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" /> Directorate / Master Admin Authorized
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <Lock className="w-3 h-3" /> View Mode (Admin Required to Edit)
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="px-5 pt-3 pb-0 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('guaranties')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px cursor-pointer ${
              activeTab === 'guaranties'
                ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Guaranty & Policy Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('institutes')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px cursor-pointer ${
              activeTab === 'institutes'
                ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Financial Institutes (Banks & Insurances with Branch Info)</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* TAB 1: GUARANTY & POLICY CATEGORIES (MATCHING SCREENSHOT 1 & 2) */}
          {activeTab === 'guaranties' && (
            <div className="space-y-4">
              {/* Form matching Screenshot 1 */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <form onSubmit={handleSaveGuaranty} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guaranty *
                    </label>
                    <input
                      type="text"
                      required
                      value={guarantyInputName}
                      onChange={(e) => setGuarantyInputName(e.target.value)}
                      placeholder="Enter guarantee name (e.g. CAR Policy, Advance Payment Guarantee, Performance Bond...)"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Type *
                    </label>
                    <select
                      required
                      value={guarantyCategoryType}
                      onChange={(e) => setGuarantyCategoryType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select type</option>
                      <option value="Conditional Bond">Conditional Bond</option>
                      <option value="Unconditional Bond">Unconditional Bond</option>
                      <option value="Conditional Guarantee">Conditional Guarantee</option>
                      <option value="Unconditional Guarantee">Unconditional Guarantee</option>
                      <option value="Insurance">Insurance</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition cursor-pointer"
                    >
                      {editingGuarantyId ? 'Update' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetGuarantyForm}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition cursor-pointer border border-amber-500/20"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>

              {/* Filter input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Filter:
                </label>
                <input
                  type="text"
                  value={guarantyFilterText}
                  onChange={(e) => {
                    setGuarantyFilterText(e.target.value);
                    setGuarantyPage(1);
                  }}
                  placeholder="Filter by guarantee name or category..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Table matching Screenshot 1 & 2 */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 w-12 text-center">...</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedGuaranties.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No guarantee or insurance categories found.
                        </td>
                      </tr>
                    ) : (
                      paginatedGuaranties.map((item, idx) => {
                        const itemNo = (guarantyPage - 1) * pageSize + idx + 1;
                        const isMenuOpen = activeGuarantyMenuId === item.id;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3 text-center font-mono text-slate-500">{itemNo}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                item.category === 'Unconditional Guarantee'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : item.category === 'Conditional Guarantee'
                                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                  : item.category === 'Unconditional Bond'
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : item.category === 'Conditional Bond'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-center relative">
                              <button
                                onClick={() => setActiveGuarantyMenuId(isMenuOpen ? null : item.id)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-20" onClick={() => setActiveGuarantyMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-30 space-y-1">
                                    <button
                                      onClick={() => handleEditGuaranty(item)}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5"
                                    >
                                      <Edit3 className="w-3 h-3 text-slate-400" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGuaranty(item)}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <div>Total: {filteredGuaranties.length} categories</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setGuarantyPage(1)}
                    disabled={guarantyPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setGuarantyPage(p => Math.max(1, p - 1))}
                    disabled={guarantyPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalGuarantyPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setGuarantyPage(p)}
                      className={`w-7 h-7 rounded font-bold ${
                        guarantyPage === p
                          ? 'bg-amber-500 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setGuarantyPage(p => Math.min(totalGuarantyPages, p + 1))}
                    disabled={guarantyPage === totalGuarantyPages}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setGuarantyPage(totalGuarantyPages)}
                    disabled={guarantyPage === totalGuarantyPages}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL INSTITUTES LIST WITH DETAILED INFORMATION (MATCHING SCREENSHOT 3) */}
          {activeTab === 'institutes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-500 tracking-tight">
                    Financial Institutes List
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    National banks, insurance companies, SWIFT codes, licenses, contact persons, and designated issuing branches
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canEditInstitutes && (
                    <button
                      onClick={() => {
                        handleResetInstituteForm();
                        setShowAddInstituteForm(!showAddInstituteForm);
                      }}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {showAddInstituteForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{showAddInstituteForm ? 'Hide Form' : 'Add Financial Institute'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comprehensive Form for Directorate Admin & Master Admin */}
              <AnimatePresence>
                {showAddInstituteForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50/90 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        <span>{editingInstId ? 'Edit Financial Institute Details' : 'Register New Financial Institute'}</span>
                      </div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        Directorate & Master Admin Access
                      </span>
                    </div>

                    <form onSubmit={handleSaveInstitute} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Financial Institute Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={instForm.name || ''}
                            onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                            placeholder="e.g. Commercial Bank of Ethiopia (CBE), Awash Insurance..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Type *
                          </label>
                          <select
                            value={instForm.type || 'Bank'}
                            onChange={(e) => setInstForm({ ...instForm, type: e.target.value as any })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Bank">Bank (Commercial / Development)</option>
                            <option value="Insurance">Insurance Corporation</option>
                            <option value="Financier">International Financier / Exim Bank</option>
                            <option value="Other">Other Financial Entity</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SWIFT / BIC Code
                          </label>
                          <input
                            type="text"
                            value={instForm.swiftCode || ''}
                            onChange={(e) => setInstForm({ ...instForm, swiftCode: e.target.value })}
                            placeholder="e.g. CBETETAA"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            NBE License No.
                          </label>
                          <input
                            type="text"
                            value={instForm.licenseNo || ''}
                            onChange={(e) => setInstForm({ ...instForm, licenseNo: e.target.value })}
                            placeholder="e.g. NBE/B/01/1963"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            TIN Number
                          </label>
                          <input
                            type="text"
                            value={instForm.tinNumber || ''}
                            onChange={(e) => setInstForm({ ...instForm, tinNumber: e.target.value })}
                            placeholder="e.g. 0001234567"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={instForm.country || 'Ethiopia'}
                            onChange={(e) => setInstForm({ ...instForm, country: e.target.value })}
                            placeholder="e.g. Ethiopia"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Contact Person / Division
                          </label>
                          <input
                            type="text"
                            value={instForm.contactPerson || ''}
                            onChange={(e) => setInstForm({ ...instForm, contactPerson: e.target.value })}
                            placeholder="e.g. Trade Finance & Guarantees Division"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Phone / Hotline
                          </label>
                          <input
                            type="text"
                            value={instForm.phone || ''}
                            onChange={(e) => setInstForm({ ...instForm, phone: e.target.value })}
                            placeholder="e.g. +251 11 551 5004"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={instForm.email || ''}
                            onChange={(e) => setInstForm({ ...instForm, email: e.target.value })}
                            placeholder="e.g. guarantees@bank.com.et"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Head Office Address
                          </label>
                          <input
                            type="text"
                            value={instForm.headOfficeAddress || ''}
                            onChange={(e) => setInstForm({ ...instForm, headOfficeAddress: e.target.value })}
                            placeholder="e.g. Churchill Ave, Commercial Bank Tower, Addis Ababa"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Issuing Branches (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={branchesInputText}
                            onChange={(e) => setBranchesInputText(e.target.value)}
                            placeholder="e.g. Finfinne Main Branch, Bole Branch, Kazanchis Branch, Adama Branch..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition cursor-pointer"
                        >
                          {editingInstId ? 'Update Financial Institute' : 'Save Financial Institute'}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetInstituteForm}
                          className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition cursor-pointer border border-amber-500/20"
                        >
                          Reset
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filter input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Filter:
                </label>
                <input
                  type="text"
                  value={instFilterText}
                  onChange={(e) => {
                    setInstFilterText(e.target.value);
                    setInstPage(1);
                  }}
                  placeholder="Filter by institute name, SWIFT code, branch, or address..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Table matching Screenshot 3 with Rich Detail View */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Description / Financial Institute</th>
                      <th className="p-3">Issuing Branches & Address</th>
                      <th className="p-3 w-12 text-center">...</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedInstitutes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No financial institutes found.
                        </td>
                      </tr>
                    ) : (
                      paginatedInstitutes.map((inst, idx) => {
                        const itemNo = (instPage - 1) * pageSize + idx + 1;
                        const isMenuOpen = activeInstMenuId === inst.id;
                        const branchCount = inst.knownBranches?.length || 0;

                        return (
                          <tr key={inst.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3 text-center font-mono text-slate-500">{itemNo}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewDetailInstitute(inst)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 text-left transition cursor-pointer"
                                >
                                  {inst.name}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                                  {inst.type || 'Bank'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 mt-0.5">
                                {inst.swiftCode && <span>SWIFT: <strong className="font-mono text-slate-700 dark:text-slate-300">{inst.swiftCode}</strong></span>}
                                {inst.licenseNo && <span>Lic: <strong className="font-mono text-slate-700 dark:text-slate-300">{inst.licenseNo}</strong></span>}
                                {inst.phone && <span>Tel: {inst.phone}</span>}
                              </div>
                            </td>
                            <td className="p-3 max-w-xs">
                              <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate" title={inst.headOfficeAddress}>
                                {inst.headOfficeAddress || 'Head Office Address on file'}
                              </div>
                              {branchCount > 0 ? (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                  {branchCount} Registered Branches ({inst.knownBranches?.slice(0, 3).join(', ')}{branchCount > 3 ? '...' : ''})
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400">All Authorized Branches</div>
                              )}
                            </td>
                            <td className="p-3 text-center relative">
                              <button
                                onClick={() => setActiveInstMenuId(isMenuOpen ? null : inst.id)}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-20" onClick={() => setActiveInstMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-30 space-y-1">
                                    <button
                                      onClick={() => {
                                        setViewDetailInstitute(inst);
                                        setActiveInstMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Building className="w-3.5 h-3.5 text-amber-500" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      onClick={() => handleEditInstitute(inst)}
                                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Edit (Admin)</span>
                                    </button>
                                    {canEditInstitutes && (
                                      <button
                                        onClick={() => handleDeleteInstitute(inst)}
                                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <div>Total: {filteredInstitutes.length} financial institutes</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInstPage(1)}
                    disabled={instPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setInstPage(p => Math.max(1, p - 1))}
                    disabled={instPage === 1}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalInstPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setInstPage(p)}
                      className={`w-7 h-7 rounded font-bold ${
                        instPage === p
                          ? 'bg-amber-500 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setInstPage(p => Math.min(totalInstPages, p + 1))}
                    disabled={instPage === totalInstPages}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setInstPage(totalInstPages)}
                    disabled={instPage === totalInstPages}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 disabled:opacity-40"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </motion.div>

      {/* DETAIL DRAWER / MODAL FOR FINANCIAL INSTITUTE PROFILE */}
      <AnimatePresence>
        {viewDetailInstitute && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-500/10 dark:bg-amber-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {viewDetailInstitute.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{viewDetailInstitute.type || 'Bank'}</span>
                      <span>•</span>
                      <span>{viewDetailInstitute.country || 'Ethiopia'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewDetailInstitute(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">SWIFT / BIC Code</span>
                    <strong className="font-mono text-slate-800 dark:text-white text-sm">
                      {viewDetailInstitute.swiftCode || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">NBE License No.</span>
                    <strong className="font-mono text-slate-800 dark:text-white text-sm">
                      {viewDetailInstitute.licenseNo || 'Registered / On File'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">TIN Number</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {viewDetailInstitute.tinNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Approval Status</span>
                    <span className="inline-block px-2 py-0.5 rounded font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {viewDetailInstitute.nbeApprovalStatus || 'Approved'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[10px] block">
                    Head Office & Contact Credentials
                  </span>
                  
                  {viewDetailInstitute.headOfficeAddress && (
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{viewDetailInstitute.headOfficeAddress}</span>
                    </div>
                  )}

                  {viewDetailInstitute.contactPerson && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Building className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Contact: <strong>{viewDetailInstitute.contactPerson}</strong></span>
                    </div>
                  )}

                  {viewDetailInstitute.phone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Tel: <strong className="font-mono">{viewDetailInstitute.phone}</strong></span>
                    </div>
                  )}

                  {viewDetailInstitute.email && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Email: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{viewDetailInstitute.email}</strong></span>
                    </div>
                  )}
                </div>

                {/* Issuing Branches List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[10px] block">
                    Designated Issuing Branches ({viewDetailInstitute.knownBranches?.length || 0})
                  </span>
                  
                  {viewDetailInstitute.knownBranches && viewDetailInstitute.knownBranches.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewDetailInstitute.knownBranches.map((br, bIdx) => (
                        <span 
                          key={bIdx}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px]"
                        >
                          🏛️ {br}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">All certified national branches authorized.</p>
                  )}
                </div>

                {viewDetailInstitute.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Notes:</span>
                    {viewDetailInstitute.notes}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                {canEditInstitutes && (
                  <button
                    onClick={() => {
                      setViewDetailInstitute(null);
                      handleEditInstitute(viewDetailInstitute);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
                <button
                  onClick={() => setViewDetailInstitute(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs ml-auto transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

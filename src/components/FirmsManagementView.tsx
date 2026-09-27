import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Search, 
  X, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Link as LinkIcon, 
  ShieldCheck, 
  Building, 
  FileText, 
  Download, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Calendar, 
  User as UserIcon, 
  CheckCircle2, 
  SlidersHorizontal,
  Layers,
  MoreHorizontal
} from 'lucide-react';
import { RegisteredFirm, Project, SupervisionConsultantInfo, User, formatAccounting } from '../types';
import { DEFAULT_REGISTERED_FIRMS } from '../data/defaultFirms';

interface FirmsManagementViewProps {
  projects: Project[];
  currentUserObj?: User;
  onUpdateProject?: (project: Project, sectionName: string) => void;
  onSelectProject?: (projectId: string, autoOpenApprovals?: boolean, initialTab?: string) => void;
  onClose?: () => void;
}

const STORAGE_KEY = 'era_registered_firms_v1';

export default function FirmsManagementView({
  projects,
  currentUserObj,
  onUpdateProject,
  onSelectProject,
  onClose
}: FirmsManagementViewProps) {
  // State for registered firms
  const [firms, setFirms] = useState<RegisteredFirm[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load registered firms from storage', e);
    }
    return DEFAULT_REGISTERED_FIRMS;
  });

  // Automatically harvest any unregistered firms from projects on first load
  useEffect(() => {
    const existingNames = new Set(firms.map(f => f.firmName.trim().toLowerCase()));
    const newFirms: RegisteredFirm[] = [];

    projects.forEach(p => {
      // Check project consultant
      const consName = p.supervisionConsultant?.firmName || p.consultant;
      if (consName && consName.trim() && !existingNames.has(consName.trim().toLowerCase())) {
        existingNames.add(consName.trim().toLowerCase());
        newFirms.push({
          id: `firm-auto-cons-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          firmName: consName.trim(),
          tinNumber: p.supervisionConsultant?.tinNumber || '00' + Math.floor(10000000 + Math.random() * 90000000),
          firmType: 'Consultant',
          countryOfOrigin: p.supervisionConsultant?.countryOfOrigin || 'Ethiopia',
          constructionLicenseNo: p.supervisionConsultant?.constructionLicenseNo || 'CONS/' + Math.floor(100 + Math.random() * 900),
          categoryOrGrade: 'Category-1 Supervision Consultant',
          contactPerson: p.supervisionConsultant?.headOfficeContactPerson || p.supervisionConsultant?.residentEngineerName || '',
          email: p.supervisionConsultant?.headOfficeEmail || '',
          phone: p.supervisionConsultant?.headOfficePhone || '',
          address: p.supervisionConsultant?.headOfficeAddress || '',
          registeredDate: new Date().toISOString().split('T')[0],
          associatedProjects: [p.id]
        });
      }

      // Check project contractor
      if (p.contractor && p.contractor.trim() && !existingNames.has(p.contractor.trim().toLowerCase())) {
        existingNames.add(p.contractor.trim().toLowerCase());
        newFirms.push({
          id: `firm-auto-cont-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          firmName: p.contractor.trim(),
          tinNumber: '00' + Math.floor(10000000 + Math.random() * 90000000),
          firmType: 'Contractor',
          countryOfOrigin: 'Ethiopia',
          constructionLicenseNo: 'RC-1/' + Math.floor(100 + Math.random() * 900),
          categoryOrGrade: 'Grade 1 Road Contractor (RC-1)',
          registeredDate: new Date().toISOString().split('T')[0],
          associatedProjects: [p.id]
        });
      }
    });

    if (newFirms.length > 0) {
      setFirms(prev => {
        const combined = [...prev, ...newFirms];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
        } catch (err) {
          console.warn('Storage save warning', err);
        }
        return combined;
      });
    }
  }, [projects]);

  // Persist firms on change
  const saveFirms = (updated: RegisteredFirm[]) => {
    setFirms(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save firms to storage', e);
    }
  };

  // Filter & Search state
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Consultant' | 'Contractor'>('All');
  const [filterCountry, setFilterCountry] = useState('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Active Action Menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState<RegisteredFirm | null>(null);

  // Supervision Consultant Contract Details Linking Modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractModalFirm, setContractModalFirm] = useState<RegisteredFirm | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [contractForm, setContractForm] = useState<SupervisionConsultantInfo>({
    firmName: '',
    tinNumber: '',
    countryOfOrigin: 'Ethiopia',
    constructionLicenseNo: '',
    associationType: 'Sole Consultant',
    jvPartners: '',
    contractRefNo: '',
    contractSignDate: '',
    commencementDate: '',
    originalCompletionDate: '',
    revisedCompletionDate: '',
    originalFeeEtb: 45000000,
    revisedFeeEtb: 45000000,
    enableUsdPayments: false,
    originalFeeUsd: 0,
    revisedFeeUsd: 0,
    contractType: 'Time-Based',
    residentEngineerName: '',
    residentEngineerPhone: '',
    residentEngineerEmail: '',
    headOfficeAddress: '',
    headOfficePhone: '',
    headOfficeEmail: '',
    headOfficeContactPerson: '',
    siteOfficeLocation: '',
    scopeOfServices: '',
    personnel: [],
    invoices: []
  });

  // Form state for Firm registration / edit
  const [firmForm, setFirmForm] = useState<Partial<RegisteredFirm>>({
    firmName: '',
    tinNumber: '',
    firmType: 'Consultant',
    countryOfOrigin: 'Ethiopia',
    constructionLicenseNo: '',
    categoryOrGrade: 'Category-1 Highway Consultant',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: ''
  });

  // Countries list
  const countries = useMemo(() => {
    const list = new Set(firms.map(f => f.countryOfOrigin || 'Ethiopia'));
    return ['All', ...Array.from(list).sort()];
  }, [firms]);

  // Filtered firms
  const filteredFirms = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    return firms.filter(f => {
      const matchesSearch = !q || (
        f.firmName.toLowerCase().includes(q) ||
        f.tinNumber.toLowerCase().includes(q) ||
        f.firmType.toLowerCase().includes(q) ||
        f.countryOfOrigin.toLowerCase().includes(q) ||
        f.constructionLicenseNo.toLowerCase().includes(q) ||
        (f.contactPerson && f.contactPerson.toLowerCase().includes(q)) ||
        (f.categoryOrGrade && f.categoryOrGrade.toLowerCase().includes(q))
      );

      const matchesType = filterType === 'All' || f.firmType === filterType;
      const matchesCountry = filterCountry === 'All' || f.countryOfOrigin === filterCountry;

      return matchesSearch && matchesType && matchesCountry;
    });
  }, [firms, filterText, filterType, filterCountry]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredFirms.length / pageSize));

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Paginated items
  const paginatedFirms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFirms.slice(start, start + pageSize);
  }, [filteredFirms, currentPage, pageSize]);

  // Open Firm Register / Edit Modal
  const handleOpenRegisterModal = (firm?: RegisteredFirm) => {
    setActiveMenuId(null);
    if (firm) {
      setEditingFirm(firm);
      setFirmForm({ ...firm });
    } else {
      setEditingFirm(null);
      setFirmForm({
        firmName: '',
        tinNumber: '',
        firmType: 'Consultant',
        countryOfOrigin: 'Ethiopia',
        constructionLicenseNo: '',
        categoryOrGrade: 'Category-1 Highway Design & Supervision Consultant',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        notes: ''
      });
    }
    setIsRegisterModalOpen(true);
  };

  // Save Firm
  const handleSaveFirm = (e: React.FormEvent) => {
    e.preventDefault();
    const nameInput = firmForm.firmName?.trim();
    const tinInput = firmForm.tinNumber?.trim();

    if (!nameInput) {
      alert('Please provide a valid Firm Name.');
      return;
    }
    if (!tinInput) {
      alert('Please provide the TIN Number.');
      return;
    }

    // Check for duplicate firm name or TIN number
    const duplicateMatch = firms.find(f => {
      if (editingFirm && f.id === editingFirm.id) return false; // Ignore current firm being edited
      const sameName = f.firmName.trim().toLowerCase() === nameInput.toLowerCase();
      const sameTin = tinInput !== '00000000' && f.tinNumber.trim() === tinInput;
      return sameName || sameTin;
    });

    if (duplicateMatch) {
      alert(`⚠️ Duplicate Firm Registration Prohibited:\nA firm with name "${duplicateMatch.firmName}" or TIN "${duplicateMatch.tinNumber}" is already registered in the system.`);
      return;
    }

    if (editingFirm) {
      // Update existing
      const updated = firms.map(f => {
        if (f.id === editingFirm.id) {
          return {
            ...f,
            ...firmForm,
            firmName: firmForm.firmName!.trim(),
            tinNumber: firmForm.tinNumber!.trim(),
            firmType: (firmForm.firmType as any) || 'Consultant',
            countryOfOrigin: firmForm.countryOfOrigin?.trim() || 'Ethiopia',
            constructionLicenseNo: firmForm.constructionLicenseNo?.trim() || 'NO LICENSE'
          } as RegisteredFirm;
        }
        return f;
      });
      saveFirms(updated);
    } else {
      // Create new
      const newFirm: RegisteredFirm = {
        id: `firm-${Date.now()}`,
        firmName: firmForm.firmName!.trim(),
        tinNumber: firmForm.tinNumber!.trim(),
        firmType: (firmForm.firmType as any) || 'Consultant',
        countryOfOrigin: firmForm.countryOfOrigin?.trim() || 'Ethiopia',
        constructionLicenseNo: firmForm.constructionLicenseNo?.trim() || 'NO LICENSE',
        categoryOrGrade: firmForm.categoryOrGrade?.trim() || '',
        contactPerson: firmForm.contactPerson?.trim() || '',
        email: firmForm.email?.trim() || '',
        phone: firmForm.phone?.trim() || '',
        address: firmForm.address?.trim() || '',
        website: firmForm.website?.trim() || '',
        registeredDate: new Date().toISOString().split('T')[0],
        notes: firmForm.notes?.trim() || ''
      };
      saveFirms([newFirm, ...firms]);
    }
    setIsRegisterModalOpen(false);
  };

  // Delete firm
  const handleDeleteFirm = (firm: RegisteredFirm) => {
    setActiveMenuId(null);
    if (confirm(`Are you sure you want to delete "${firm.firmName}" from the registered firms directory?`)) {
      const updated = firms.filter(f => f.id !== firm.id);
      saveFirms(updated);
    }
  };

  // Open Contract Linking Modal
  const handleOpenContractModal = (firm: RegisteredFirm, targetProjId?: string) => {
    setActiveMenuId(null);
    setContractModalFirm(firm);
    const projId = targetProjId || selectedProjectId || projects[0]?.id || '';
    setSelectedProjectId(projId);

    const targetProject = projects.find(p => p.id === projId);
    const existingSc = targetProject?.supervisionConsultant;

    setContractForm({
      firmName: firm.firmName,
      tinNumber: firm.tinNumber || existingSc?.tinNumber || '',
      countryOfOrigin: firm.countryOfOrigin || existingSc?.countryOfOrigin || 'Ethiopia',
      constructionLicenseNo: firm.constructionLicenseNo || existingSc?.constructionLicenseNo || '',
      associationType: existingSc?.associationType || 'Sole Consultant',
      jvPartners: existingSc?.jvPartners || '',
      contractRefNo: existingSc?.contractRefNo || `ERA/SC/${projId}/2024`,
      contractSignDate: existingSc?.contractSignDate || targetProject?.signDate || new Date().toISOString().split('T')[0],
      commencementDate: existingSc?.commencementDate || targetProject?.startDate || new Date().toISOString().split('T')[0],
      originalCompletionDate: existingSc?.originalCompletionDate || '',
      revisedCompletionDate: existingSc?.revisedCompletionDate || '',
      originalFeeEtb: existingSc?.originalFeeEtb || 45000000,
      revisedFeeEtb: existingSc?.revisedFeeEtb || existingSc?.originalFeeEtb || 45000000,
      enableUsdPayments: Boolean(existingSc?.enableUsdPayments),
      originalFeeUsd: existingSc?.originalFeeUsd || 0,
      revisedFeeUsd: existingSc?.revisedFeeUsd || 0,
      contractType: existingSc?.contractType || 'Time-Based',
      residentEngineerName: existingSc?.residentEngineerName || '',
      residentEngineerPhone: existingSc?.residentEngineerPhone || '',
      residentEngineerEmail: existingSc?.residentEngineerEmail || '',
      headOfficeAddress: firm.address || existingSc?.headOfficeAddress || '',
      headOfficePhone: firm.phone || existingSc?.headOfficePhone || '',
      headOfficeEmail: firm.email || existingSc?.headOfficeEmail || '',
      headOfficeContactPerson: firm.contactPerson || existingSc?.headOfficeContactPerson || '',
      siteOfficeLocation: existingSc?.siteOfficeLocation || targetProject?.name || '',
      scopeOfServices: existingSc?.scopeOfServices || 'Comprehensive construction supervision, contract administration (FIDIC Red Book), quality assurance, materials verification, and environmental & social compliance oversight.',
      personnel: existingSc?.personnel || [],
      invoices: existingSc?.invoices || []
    });

    setIsContractModalOpen(true);
  };

  // When project selector changes inside contract modal
  const handleProjectSelectChange = (newProjId: string) => {
    setSelectedProjectId(newProjId);
    const targetProject = projects.find(p => p.id === newProjId);
    const existingSc = targetProject?.supervisionConsultant;

    if (contractModalFirm) {
      setContractForm(prev => ({
        ...prev,
        tinNumber: contractModalFirm.tinNumber || existingSc?.tinNumber || prev.tinNumber,
        countryOfOrigin: contractModalFirm.countryOfOrigin || existingSc?.countryOfOrigin || prev.countryOfOrigin,
        constructionLicenseNo: contractModalFirm.constructionLicenseNo || existingSc?.constructionLicenseNo || prev.constructionLicenseNo,
        contractRefNo: existingSc?.contractRefNo || `ERA/SC/${newProjId}/2024`,
        contractSignDate: existingSc?.contractSignDate || targetProject?.signDate || prev.contractSignDate,
        commencementDate: existingSc?.commencementDate || targetProject?.startDate || prev.commencementDate,
        originalCompletionDate: existingSc?.originalCompletionDate || prev.originalCompletionDate,
        revisedCompletionDate: existingSc?.revisedCompletionDate || prev.revisedCompletionDate,
        originalFeeEtb: existingSc?.originalFeeEtb || prev.originalFeeEtb,
        revisedFeeEtb: existingSc?.revisedFeeEtb || prev.revisedFeeEtb,
        siteOfficeLocation: existingSc?.siteOfficeLocation || targetProject?.name || prev.siteOfficeLocation
      }));
    }
  };

  // Save Supervision Consultant Contract Details to Project
  const handleSaveContractDetails = (goToProject: boolean = false) => {
    const targetProj = projects.find(p => p.id === selectedProjectId);
    if (!targetProj) {
      alert('Please select an active ERA Highway Project.');
      return;
    }

    const updatedConsultantInfo: SupervisionConsultantInfo = {
      ...(targetProj.supervisionConsultant || {}),
      ...contractForm,
      firmName: contractModalFirm?.firmName || contractForm.firmName,
      tinNumber: contractForm.tinNumber,
      countryOfOrigin: contractForm.countryOfOrigin,
      constructionLicenseNo: contractForm.constructionLicenseNo,
      originalFeeEtb: Number(contractForm.originalFeeEtb) || 0,
      revisedFeeEtb: Number(contractForm.revisedFeeEtb) || Number(contractForm.originalFeeEtb) || 0,
      originalFeeUsd: contractForm.enableUsdPayments ? Number(contractForm.originalFeeUsd) || 0 : 0,
      revisedFeeUsd: contractForm.enableUsdPayments ? Number(contractForm.revisedFeeUsd) || Number(contractForm.originalFeeUsd) || 0 : 0
    };

    const updatedProject: Project = {
      ...targetProj,
      consultant: updatedConsultantInfo.firmName,
      supervisionConsultant: updatedConsultantInfo,
      lastModifiedBy: currentUserObj?.username || 'Supervision Authority',
      lastModifiedAt: new Date().toISOString(),
      lastModifiedSection: 'Supervision Consultant Contract Details & Terms'
    };

    // If update project callback exists
    if (onUpdateProject) {
      onUpdateProject(updatedProject, 'Supervision Consultant Contract Details');
    } else {
      // Local fallback
      try {
        const savedProjectsStr = localStorage.getItem('era_proj_v28') || '[]';
        const parsed: Project[] = JSON.parse(savedProjectsStr);
        const updatedList = parsed.map(p => p.id === updatedProject.id ? updatedProject : p);
        localStorage.setItem('era_proj_v28', JSON.stringify(updatedList));
      } catch (err) {
        console.warn('Local update error', err);
      }
    }

    // Also update associated project list on the firm
    if (contractModalFirm) {
      const currentAssociated = contractModalFirm.associatedProjects || [];
      if (!currentAssociated.includes(selectedProjectId)) {
        const updatedFirms = firms.map(f => {
          if (f.id === contractModalFirm.id) {
            return {
              ...f,
              associatedProjects: [...currentAssociated, selectedProjectId]
            };
          }
          return f;
        });
        saveFirms(updatedFirms);
      }
    }

    alert(`✓ Successfully linked "${updatedConsultantInfo.firmName}" and committed contract details to project "${targetProj.name}"!`);
    setIsContractModalOpen(false);

    if (goToProject && onSelectProject) {
      if (onClose) onClose();
      onSelectProject(selectedProjectId, false, 'consultant');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['#', 'Firm Name', 'TIN Number', 'Firm Type', 'Country of Origin', 'Construction License No', 'Category / Grade', 'Contact Person', 'Email', 'Phone', 'Address'];
    const rows = filteredFirms.map((f, i) => [
      i + 1,
      `"${f.firmName.replace(/"/g, '""')}"`,
      `"${f.tinNumber}"`,
      `"${f.firmType}"`,
      `"${f.countryOfOrigin}"`,
      `"${f.constructionLicenseNo}"`,
      `"${(f.categoryOrGrade || '').replace(/"/g, '""')}"`,
      `"${(f.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(f.email || '').replace(/"/g, '""')}"`,
      `"${(f.phone || '').replace(/"/g, '""')}"`,
      `"${(f.address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Registered_Firms_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Main Header matching screenshot style */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        
        {/* Title & Plus Button in Orange/Amber */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight flex items-center gap-2.5">
              <span>Firms</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              National & International Highway Supervision Consultants and General Road Contractors Registry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Export Registered Firms Directory to CSV"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => handleOpenRegisterModal()}
              id="btn-register-new-firm"
              className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center font-bold shadow-md hover:shadow-amber-500/20 transition cursor-pointer"
              title="Register New Consultant or Contractor Firm"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Filter Input matching the user's screenshot layout */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
            Filter:
          </label>
          <div className="relative">
            <input
              type="text"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by firm name, TIN, country, license..."
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white transition"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Type & Country Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Type:</span>
            {(['All', 'Consultant', 'Contractor'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  filterType === type
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Origin:</span>
            <select
              value={filterCountry}
              onChange={(e) => {
                setFilterCountry(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
            >
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Firms Table matching screenshot columns */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5">Firm Name</th>
                <th className="p-3.5">Tin Number</th>
                <th className="p-3.5">Firm Type</th>
                <th className="p-3.5">Country of Origin</th>
                <th className="p-3.5">Construction License No</th>
                <th className="p-3.5 text-center w-12">...</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedFirms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold">No registered firms found matching your filter criteria.</p>
                    <button
                      onClick={() => handleOpenRegisterModal()}
                      className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition"
                    >
                      + Register First Firm
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedFirms.map((firm, idx) => {
                  const itemNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isMenuOpen = activeMenuId === firm.id;
                  const linkedProjects = projects.filter(p => 
                    (p.supervisionConsultant?.firmName && p.supervisionConsultant.firmName.toLowerCase() === firm.firmName.toLowerCase()) ||
                    (p.consultant && p.consultant.toLowerCase() === firm.firmName.toLowerCase()) ||
                    (p.contractor && p.contractor.toLowerCase() === firm.firmName.toLowerCase()) ||
                    (firm.associatedProjects && firm.associatedProjects.includes(p.id))
                  );

                  return (
                    <tr 
                      key={firm.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* # Number */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {itemNumber}
                      </td>

                      {/* Firm Name */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {firm.firmName}
                        </div>
                        {linkedProjects.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {linkedProjects.map(lp => (
                              <button
                                key={lp.id}
                                onClick={() => {
                                  if (onSelectProject) {
                                    if (onClose) onClose();
                                    onSelectProject(lp.id, false, firm.firmType === 'Consultant' ? 'consultant' : 'overview');
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200 dark:border-blue-900 hover:underline flex items-center gap-1"
                                title={`Linked to ${lp.name}. Click to view project`}
                              >
                                <span>{lp.id}:</span>
                                <span className="truncate max-w-[140px]">{lp.name}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Tin Number */}
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {firm.tinNumber || '-'}
                      </td>

                      {/* Firm Type */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          firm.firmType === 'Consultant'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          <Building className="w-3 h-3" />
                          {firm.firmType}
                        </span>
                      </td>

                      {/* Country of Origin */}
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {firm.countryOfOrigin || 'Ethiopia'}
                      </td>

                      {/* Construction License No */}
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        <span className={firm.constructionLicenseNo === 'NO LICENSE' ? 'text-rose-500 font-bold text-[11px]' : ''}>
                          {firm.constructionLicenseNo || 'NO LICENSE'}
                        </span>
                      </td>

                      {/* Actions (...) */}
                      <td className="p-3.5 text-center relative">
                        <button
                          onClick={() => setActiveMenuId(isMenuOpen ? null : firm.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-bold"
                          title="Actions menu"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Action Menu */}
                        {isMenuOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-30 text-left space-y-1 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                                {firm.firmName}
                              </div>

                              {/* Action 1: Edit Supervision Consultant Contract Details (if consultant) */}
                              <button
                                onClick={() => handleOpenContractModal(firm)}
                                className="w-full px-3 py-2 text-left rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-2 transition"
                              >
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Edit Supervision Consultant Contract Details</span>
                              </button>

                              {/* Action 2: Link / Assign to Project */}
                              <button
                                onClick={() => handleOpenContractModal(firm)}
                                className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-2 transition"
                              >
                                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>Link / Assign to Project</span>
                              </button>

                              {/* Action 3: Edit Firm Record */}
                              <button
                                onClick={() => handleOpenRegisterModal(firm)}
                                className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-2 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span>Edit Firm Particulars</span>
                              </button>

                              {/* Action 4: Delete Firm */}
                              <button
                                onClick={() => handleDeleteFirm(firm)}
                                className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Delete Firm from Directory</span>
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

        {/* Pagination Bar matching the user's screenshot */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredFirms.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredFirms.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredFirms.length}</strong> registered firms
          </div>

          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium disabled:opacity-40 disabled:pointer-events-none transition"
            >
              First
            </button>

            {/* Previous */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium disabled:opacity-40 disabled:pointer-events-none transition"
            >
              Previous
            </button>

            {/* Page number buttons 1..totalPages */}
            {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 10) {
                if (currentPage > 6) {
                  pageNum = Math.min(totalPages, currentPage - 5 + i);
                }
              }
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium disabled:opacity-40 disabled:pointer-events-none transition"
            >
              Next
            </button>

            {/* Last */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium disabled:opacity-40 disabled:pointer-events-none transition"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Register or Edit Firm Particulars */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingFirm ? 'Edit Firm Particulars' : 'Register New Firm'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      National Highway Engineering Consultants & General Road Contractors Registry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFirm} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firmForm.firmName || ''}
                    onChange={(e) => setFirmForm({ ...firmForm, firmName: e.target.value })}
                    placeholder="e.g. Moringa Environmental and Social Assessment PLC"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Firm Type *
                    </label>
                    <select
                      value={firmForm.firmType || 'Consultant'}
                      onChange={(e) => setFirmForm({ ...firmForm, firmType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Consultant">Supervision Consultant</option>
                      <option value="Contractor">General Road Contractor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TIN Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={firmForm.tinNumber || ''}
                      onChange={(e) => setFirmForm({ ...firmForm, tinNumber: e.target.value })}
                      placeholder="e.g. 0090262271"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Country of Origin *
                    </label>
                    <input
                      type="text"
                      required
                      value={firmForm.countryOfOrigin || 'Ethiopia'}
                      onChange={(e) => setFirmForm({ ...firmForm, countryOfOrigin: e.target.value })}
                      placeholder="e.g. Ethiopia, India, China, Italy..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Construction / Professional License No
                    </label>
                    <input
                      type="text"
                      value={firmForm.constructionLicenseNo || ''}
                      onChange={(e) => setFirmForm({ ...firmForm, constructionLicenseNo: e.target.value })}
                      placeholder="e.g. AWM-07, CHB/415, RC-1/001"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Grade / Classification Category
                  </label>
                  <input
                    type="text"
                    value={firmForm.categoryOrGrade || ''}
                    onChange={(e) => setFirmForm({ ...firmForm, categoryOrGrade: e.target.value })}
                    placeholder="e.g. Category-1 Highway Consultant, Grade 1 RC"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={firmForm.contactPerson || ''}
                      onChange={(e) => setFirmForm({ ...firmForm, contactPerson: e.target.value })}
                      placeholder="e.g. Eng. Solomon Worku"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={firmForm.email || ''}
                      onChange={(e) => setFirmForm({ ...firmForm, email: e.target.value })}
                      placeholder="info@firm.et"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={firmForm.phone || ''}
                      onChange={(e) => setFirmForm({ ...firmForm, phone: e.target.value })}
                      placeholder="+251 11 662 3400"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Head Office Physical Address
                  </label>
                  <input
                    type="text"
                    value={firmForm.address || ''}
                    onChange={(e) => setFirmForm({ ...firmForm, address: e.target.value })}
                    placeholder="e.g. Bole Sub-City, Woreda 03, Addis Ababa"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition cursor-pointer"
                  >
                    {editingFirm ? 'Save Firm Changes' : 'Register Firm in Directory'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit Supervision Consultant Contract Details & Linking */}
      <AnimatePresence>
        {isContractModalOpen && contractModalFirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Edit Supervision Consultant Contract Details
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {contractModalFirm.firmName}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Link firm particulars with project-level supervision agreements, contract terms, remuneration, and resident engineers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsContractModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                
                {/* 1. Target Project Selector */}
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl space-y-2">
                  <label className="block font-bold text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Target Highway Project Assignment
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectSelectChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id}: {p.name} ({p.programDirectorate || 'ERA'} | {p.pmo || 'PMO'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                    Saving will sync <strong>{contractModalFirm.firmName}</strong> as the official Supervising Consultant for this highway project.
                  </p>
                </div>

                {/* 2. Firm & Association Particulars */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                    1. Consulting Entity & Association Structure
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Firm Name
                      </label>
                      <input
                        type="text"
                        value={contractForm.firmName}
                        onChange={(e) => setContractForm({ ...contractForm, firmName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Association Type
                      </label>
                      <select
                        value={contractForm.associationType || 'Sole Consultant'}
                        onChange={(e) => {
                          const newType = e.target.value as any;
                          setContractForm({
                            ...contractForm,
                            associationType: newType,
                            jvPartners: newType === 'Sole Consultant' ? '' : contractForm.jvPartners
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Sole Consultant">Sole Consultant</option>
                        <option value="Lead Consultant">Lead Consultant</option>
                        <option value="Joint Venture (JV)">Joint Venture (JV)</option>
                        <option value="Association / Consortium">Association / Consortium</option>
                      </select>
                    </div>
                    {contractForm.associationType !== 'Sole Consultant' ? (
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          JV / Consortium Partners
                        </label>
                        <input
                          type="text"
                          value={contractForm.jvPartners || ''}
                          onChange={(e) => setContractForm({ ...contractForm, jvPartners: e.target.value })}
                          placeholder="e.g. in JV with Core Consulting PLC"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span><strong>Sole Consultant:</strong> Single entity contract. Joint venture partner fields hidden.</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        TIN Number
                      </label>
                      <input
                        type="text"
                        value={contractForm.tinNumber || ''}
                        onChange={(e) => setContractForm({ ...contractForm, tinNumber: e.target.value })}
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Country of Origin
                      </label>
                      <input
                        type="text"
                        value={contractForm.countryOfOrigin || 'Ethiopia'}
                        onChange={(e) => setContractForm({ ...contractForm, countryOfOrigin: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Construction License No
                      </label>
                      <input
                        type="text"
                        value={contractForm.constructionLicenseNo || ''}
                        onChange={(e) => setContractForm({ ...contractForm, constructionLicenseNo: e.target.value })}
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Contractual Dates & Agreement Reference */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    2. Contract Agreement & Key Dates
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Contract Reference No *
                      </label>
                      <input
                        type="text"
                        value={contractForm.contractRefNo}
                        onChange={(e) => setContractForm({ ...contractForm, contractRefNo: e.target.value })}
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Contract Type
                      </label>
                      <select
                        value={contractForm.contractType || 'Time-Based'}
                        onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Time-Based">Time-Based (FIDIC Standard)</option>
                        <option value="Lump-Sum">Lump-Sum Fixed Price</option>
                        <option value="Percentage of Works">Percentage of Works</option>
                        <option value="Hybrid">Hybrid Agreement</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Sign Date
                      </label>
                      <input
                        type="date"
                        value={contractForm.contractSignDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, contractSignDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Commencement Date
                      </label>
                      <input
                        type="date"
                        value={contractForm.commencementDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, commencementDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Original Completion
                      </label>
                      <input
                        type="date"
                        value={contractForm.originalCompletionDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, originalCompletionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Revised Completion
                      </label>
                      <input
                        type="date"
                        value={contractForm.revisedCompletionDate || ''}
                        onChange={(e) => setContractForm({ ...contractForm, revisedCompletionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Remuneration & Fees */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    3. Consulting Remuneration & Currency Terms
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Original Contract Fee (ETB)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={contractForm.originalFeeEtb || 0}
                        onChange={(e) => setContractForm({ ...contractForm, originalFeeEtb: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Revised Contract Fee (ETB)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={contractForm.revisedFeeEtb || 0}
                        onChange={(e) => setContractForm({ ...contractForm, revisedFeeEtb: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="chk-enable-usd-firm"
                      checked={Boolean(contractForm.enableUsdPayments)}
                      onChange={(e) => setContractForm({ ...contractForm, enableUsdPayments: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="chk-enable-usd-firm" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Enable Foreign Currency (USD) Invoicing & Contract Fees
                    </label>
                  </div>

                  {contractForm.enableUsdPayments && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
                      <div>
                        <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                          Original Fee (USD $)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={contractForm.originalFeeUsd || 0}
                          onChange={(e) => setContractForm({ ...contractForm, originalFeeUsd: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                          Revised Fee (USD $)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={contractForm.revisedFeeUsd || 0}
                          onChange={(e) => setContractForm({ ...contractForm, revisedFeeUsd: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Resident Engineer & Head Office Contact */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                    4. Key Site Personnel & Head Office Contacts
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Resident Engineer (RE)
                      </label>
                      <input
                        type="text"
                        value={contractForm.residentEngineerName || ''}
                        onChange={(e) => setContractForm({ ...contractForm, residentEngineerName: e.target.value })}
                        placeholder="e.g. Eng. Yohannes Assefa"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        RE Phone
                      </label>
                      <input
                        type="tel"
                        value={contractForm.residentEngineerPhone || ''}
                        onChange={(e) => setContractForm({ ...contractForm, residentEngineerPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        RE Email
                      </label>
                      <input
                        type="email"
                        value={contractForm.residentEngineerEmail || ''}
                        onChange={(e) => setContractForm({ ...contractForm, residentEngineerEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        HQ Contact Person
                      </label>
                      <input
                        type="text"
                        value={contractForm.headOfficeContactPerson || ''}
                        onChange={(e) => setContractForm({ ...contractForm, headOfficeContactPerson: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        HQ Phone
                      </label>
                      <input
                        type="tel"
                        value={contractForm.headOfficePhone || ''}
                        onChange={(e) => setContractForm({ ...contractForm, headOfficePhone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        HQ Email
                      </label>
                      <input
                        type="email"
                        value={contractForm.headOfficeEmail || ''}
                        onChange={(e) => setContractForm({ ...contractForm, headOfficeEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      HQ Physical Address
                    </label>
                    <input
                      type="text"
                      value={contractForm.headOfficeAddress || ''}
                      onChange={(e) => setContractForm({ ...contractForm, headOfficeAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsContractModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveContractDetails(false)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Save & Commit Contract Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveContractDetails(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Save & Open Supervision Page</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

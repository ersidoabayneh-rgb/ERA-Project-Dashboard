import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Users, 
  Receipt, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Briefcase, 
  UserCheck, 
  UserX, 
  FileCheck, 
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  Info,
  Layers,
  Check,
  X,
  Printer,
  BarChart3
} from 'lucide-react';
import { 
  Project, 
  SupervisionConsultantInfo, 
  ConsultantPersonnel, 
  ConsultantInvoice, 
  formatAccounting,
  User 
} from '../types';
import jsPDF from 'jspdf';
import WorkloadReportModal from './WorkloadReportModal';

interface SupervisionConsultantViewProps {
  project: Project;
  projects?: Project[];
  onUpdateProject?: (updates: Partial<Project>, section?: string) => void;
  isReadonly?: boolean;
  currentUser?: User | null;
}

export default function SupervisionConsultantView({
  project,
  projects = [],
  onUpdateProject,
  isReadonly = false,
  currentUser
}: SupervisionConsultantViewProps) {
  // Extract or initialize supervision consultant data
  const consultant: SupervisionConsultantInfo = useMemo(() => {
    if (project.supervisionConsultant) {
      return {
        ...project.supervisionConsultant,
        firmName: project.supervisionConsultant.firmName || project.consultant || 'Supervision Consultant JV',
        personnel: project.supervisionConsultant.personnel || [],
        invoices: project.supervisionConsultant.invoices || []
      };
    }
    return {
      firmName: project.consultant || 'Supervision Consultant JV',
      associationType: 'Joint Venture (JV)',
      jvPartners: '',
      contractRefNo: `ERA/SC/${project.id || '01'}/2020`,
      contractSignDate: project.signDate || '',
      commencementDate: project.startDate || '',
      originalCompletionDate: '',
      revisedCompletionDate: '',
      originalFeeEtb: 45000000,
      revisedFeeEtb: 55000000,
      originalFeeUsd: 800000,
      revisedFeeUsd: 950000,
      contractType: 'Time-Based',
      residentEngineerName: '',
      residentEngineerPhone: '',
      residentEngineerEmail: '',
      headOfficeAddress: '',
      siteOfficeLocation: '',
      scopeOfServices: 'Full construction supervision, quality control, materials testing, and measurement of works.',
      performanceRating: 'Satisfactory',
      personnel: [],
      invoices: []
    };
  }, [project.supervisionConsultant, project.consultant, project.signDate, project.startDate, project.id]);

  // Active view subtab
  const [activeTab, setActiveTab] = useState<'personnel' | 'invoices' | 'profile'>('personnel');

  // Search & Filter States for Personnel
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelCategoryFilter, setPersonnelCategoryFilter] = useState('ALL');
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState('ALL');

  // Search & Filter States for Invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');

  // Modals state
  const [isEditConsultantOpen, setIsEditConsultantOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isWorkloadReportOpen, setIsWorkloadReportOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<ConsultantPersonnel | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ConsultantInvoice | null>(null);
  const [viewDetailPersonnel, setViewDetailPersonnel] = useState<ConsultantPersonnel | null>(null);

  // Form states for Consultant Profile
  const [consultantForm, setConsultantForm] = useState<SupervisionConsultantInfo>(consultant);

  // Form states for Personnel
  const [personnelForm, setPersonnelForm] = useState<Partial<ConsultantPersonnel>>({
    name: '',
    position: '',
    category: 'Key Personnel',
    assignmentDate: new Date().toISOString().split('T')[0],
    qualification: '',
    yearsExperience: 10,
    status: 'Active',
    manMonthsAllocated: 36,
    manMonthsInput: 0,
    contactPhone: '',
    contactEmail: '',
    siteStation: '',
    remarks: ''
  });

  // Form states for Invoice
  const [invoiceForm, setInvoiceForm] = useState<Partial<ConsultantInvoice>>({
    invoiceNo: `CON-INV-${String((consultant.invoices?.length || 0) + 1).padStart(2, '0')}`,
    billingPeriod: '',
    submissionDate: new Date().toISOString().split('T')[0],
    certificationDate: '',
    paymentDate: '',
    grossAmountEtb: 0,
    advanceDeductionEtb: 0,
    taxDeductionEtb: 0,
    netAmountEtb: 0,
    foreignCurrencyAmount: 0,
    foreignCurrencyCode: 'USD',
    status: 'Submitted',
    paymentReference: '',
    remarks: '',
    attachmentName: ''
  });

  // Calculations for Financials
  const financialSummary = useMemo(() => {
    const invoices = consultant.invoices || [];
    const totalGrossInvoiced = invoices.reduce((acc, inv) => acc + (inv.grossAmountEtb || 0), 0);
    const totalNetInvoiced = invoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalAdvanceDeducted = invoices.reduce((acc, inv) => acc + (inv.advanceDeductionEtb || 0), 0);
    const totalTaxesDeducted = invoices.reduce((acc, inv) => acc + (inv.taxDeductionEtb || 0), 0);
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const totalPaidEtb = paidInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);
    const totalPaidUsd = paidInvoices.reduce((acc, inv) => acc + (inv.foreignCurrencyAmount || 0), 0);

    const certifiedInvoices = invoices.filter(inv => inv.status === 'Certified');
    const totalCertifiedPendingEtb = certifiedInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);

    const submittedInvoices = invoices.filter(inv => inv.status === 'Submitted' || inv.status === 'Pending');
    const totalSubmittedPendingEtb = submittedInvoices.reduce((acc, inv) => acc + (inv.netAmountEtb || 0), 0);

    const totalOutstandingEtb = totalGrossInvoiced - totalPaidEtb;
    const contractBudgetEtb = consultant.revisedFeeEtb || consultant.originalFeeEtb || 1;
    const financialUtilizationPct = (totalGrossInvoiced / contractBudgetEtb) * 100;
    const paymentDisbursementPct = totalGrossInvoiced > 0 ? (totalPaidEtb / totalNetInvoiced) * 100 : 0;

    return {
      totalGrossInvoiced,
      totalNetInvoiced,
      totalAdvanceDeducted,
      totalTaxesDeducted,
      totalPaidEtb,
      totalPaidUsd,
      totalCertifiedPendingEtb,
      totalSubmittedPendingEtb,
      totalOutstandingEtb,
      contractBudgetEtb,
      financialUtilizationPct,
      paymentDisbursementPct
    };
  }, [consultant]);

  // Calculations for Personnel
  const personnelSummary = useMemo(() => {
    const list = consultant.personnel || [];
    const totalCount = list.length;
    const activeCount = list.filter(p => p.status === 'Active').length;
    const demobilizedCount = list.filter(p => p.status === 'Demobilized').length;
    const keyStaffCount = list.filter(p => p.category === 'Key Personnel').length;
    const totalAllocatedMM = list.reduce((acc, p) => acc + (p.manMonthsAllocated || 0), 0);
    const totalInputMM = list.reduce((acc, p) => acc + (p.manMonthsInput || 0), 0);
    const mmUtilizationPct = totalAllocatedMM > 0 ? (totalInputMM / totalAllocatedMM) * 100 : 0;

    return {
      totalCount,
      activeCount,
      demobilizedCount,
      keyStaffCount,
      totalAllocatedMM,
      totalInputMM,
      mmUtilizationPct
    };
  }, [consultant.personnel]);

  // Filtered Personnel List
  const filteredPersonnel = useMemo(() => {
    let list = consultant.personnel || [];
    if (personnelCategoryFilter !== 'ALL') {
      list = list.filter(p => p.category === personnelCategoryFilter);
    }
    if (personnelStatusFilter !== 'ALL') {
      list = list.filter(p => p.status === personnelStatusFilter);
    }
    if (personnelSearch.trim()) {
      const q = personnelSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        (p.qualification && p.qualification.toLowerCase().includes(q)) ||
        (p.siteStation && p.siteStation.toLowerCase().includes(q)) ||
        (p.contactEmail && p.contactEmail.toLowerCase().includes(q)) ||
        (p.contactPhone && p.contactPhone.toLowerCase().includes(q))
      );
    }
    return list;
  }, [consultant.personnel, personnelCategoryFilter, personnelStatusFilter, personnelSearch]);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    let list = consultant.invoices || [];
    if (invoiceStatusFilter !== 'ALL') {
      list = list.filter(inv => inv.status === invoiceStatusFilter);
    }
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase();
      list = list.filter(inv => 
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.billingPeriod.toLowerCase().includes(q) ||
        (inv.paymentReference && inv.paymentReference.toLowerCase().includes(q)) ||
        (inv.remarks && inv.remarks.toLowerCase().includes(q))
      );
    }
    return list;
  }, [consultant.invoices, invoiceStatusFilter, invoiceSearch]);

  // Helper to commit consultant changes to project
  const saveConsultantData = (updatedConsultant: SupervisionConsultantInfo, actionDescription: string) => {
    if (!onUpdateProject) return;
    onUpdateProject({
      supervisionConsultant: updatedConsultant,
      consultant: updatedConsultant.firmName // Keep backward compatibility
    }, `Supervision Consultant: ${actionDescription}`);
  };

  // Handler for saving Consultant General Profile
  const handleSaveConsultantProfile = () => {
    saveConsultantData(consultantForm, 'Updated consultant contract & profile');
    setIsEditConsultantOpen(false);
  };

  // Handler for Add/Edit Personnel
  const handleOpenAddPersonnel = () => {
    setPersonnelForm({
      name: '',
      position: '',
      category: 'Key Personnel',
      assignmentDate: new Date().toISOString().split('T')[0],
      qualification: '',
      yearsExperience: 10,
      status: 'Active',
      manMonthsAllocated: 36,
      manMonthsInput: 0,
      contactPhone: '',
      contactEmail: '',
      siteStation: 'Main Camp',
      remarks: ''
    });
    setSelectedPersonnel(null);
    setIsPersonnelModalOpen(true);
  };

  const handleOpenEditPersonnel = (p: ConsultantPersonnel) => {
    setPersonnelForm(p);
    setSelectedPersonnel(p);
    setIsPersonnelModalOpen(true);
  };

  const handleSavePersonnel = () => {
    if (!personnelForm.name?.trim() || !personnelForm.position?.trim()) {
      alert('Please enter both the personnel name and specific position.');
      return;
    }
    if (!personnelForm.assignmentDate) {
      alert('Please specify the date of assignment.');
      return;
    }

    const currentList = consultant.personnel || [];
    let updatedList: ConsultantPersonnel[];

    if (selectedPersonnel) {
      // Edit
      updatedList = currentList.map(item => 
        item.id === selectedPersonnel.id ? { ...item, ...personnelForm } as ConsultantPersonnel : item
      );
    } else {
      // Add new
      const newItem: ConsultantPersonnel = {
        id: 'pers_' + Date.now(),
        name: personnelForm.name || '',
        position: personnelForm.position || '',
        category: personnelForm.category || 'Key Personnel',
        assignmentDate: personnelForm.assignmentDate || new Date().toISOString().split('T')[0],
        demobilizationDate: personnelForm.demobilizationDate || '',
        qualification: personnelForm.qualification || '',
        yearsExperience: Number(personnelForm.yearsExperience) || 0,
        status: personnelForm.status as any || 'Active',
        manMonthsAllocated: Number(personnelForm.manMonthsAllocated) || 0,
        manMonthsInput: Number(personnelForm.manMonthsInput) || 0,
        contactPhone: personnelForm.contactPhone || '',
        contactEmail: personnelForm.contactEmail || '',
        siteStation: personnelForm.siteStation || '',
        remarks: personnelForm.remarks || ''
      };
      updatedList = [newItem, ...currentList];
    }

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      personnel: updatedList
    };

    saveConsultantData(updatedConsultant, selectedPersonnel ? `Updated staff: ${personnelForm.name}` : `Assigned new staff: ${personnelForm.name}`);
    setIsPersonnelModalOpen(false);
  };

  const handleDeletePersonnel = (pId: string, pName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${pName}" from the assigned personnel register?`)) {
      return;
    }
    const updatedList = (consultant.personnel || []).filter(item => item.id !== pId);
    saveConsultantData({ ...consultant, personnel: updatedList }, `Removed staff: ${pName}`);
  };

  const handleTogglePersonnelStatus = (p: ConsultantPersonnel) => {
    const newStatus = p.status === 'Active' ? 'Demobilized' : 'Active';
    const updatedList = (consultant.personnel || []).map(item => 
      item.id === p.id 
        ? { 
            ...item, 
            status: newStatus as any,
            demobilizationDate: newStatus === 'Demobilized' ? new Date().toISOString().split('T')[0] : ''
          } 
        : item
    );
    saveConsultantData({ ...consultant, personnel: updatedList }, `Changed status of ${p.name} to ${newStatus}`);
  };

  // Handler for Add/Edit Invoice
  const handleOpenAddInvoice = () => {
    const nextNo = `CON-INV-${String((consultant.invoices?.length || 0) + 1).padStart(2, '0')}`;
    setInvoiceForm({
      invoiceNo: nextNo,
      billingPeriod: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
      submissionDate: new Date().toISOString().split('T')[0],
      certificationDate: '',
      paymentDate: '',
      grossAmountEtb: 1800000,
      advanceDeductionEtb: 180000,
      taxDeductionEtb: 90000,
      netAmountEtb: 1530000,
      foreignCurrencyAmount: 25000,
      foreignCurrencyCode: 'USD',
      status: 'Submitted',
      paymentReference: '',
      remarks: '',
      attachmentName: ''
    });
    setSelectedInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: ConsultantInvoice) => {
    setInvoiceForm(inv);
    setSelectedInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceAmountChange = (field: 'grossAmountEtb' | 'advanceDeductionEtb' | 'taxDeductionEtb', val: number) => {
    const currentGross = field === 'grossAmountEtb' ? val : (Number(invoiceForm.grossAmountEtb) || 0);
    const currentAdv = field === 'advanceDeductionEtb' ? val : (Number(invoiceForm.advanceDeductionEtb) || 0);
    const currentTax = field === 'taxDeductionEtb' ? val : (Number(invoiceForm.taxDeductionEtb) || 0);
    const calculatedNet = Math.max(0, currentGross - currentAdv - currentTax);

    setInvoiceForm(prev => ({
      ...prev,
      [field]: val,
      netAmountEtb: calculatedNet
    }));
  };

  const handleSaveInvoice = () => {
    if (!invoiceForm.invoiceNo?.trim() || !invoiceForm.billingPeriod?.trim()) {
      alert('Please provide the invoice number and billing period.');
      return;
    }
    if (!invoiceForm.grossAmountEtb || invoiceForm.grossAmountEtb <= 0) {
      alert('Please provide a valid gross invoice amount.');
      return;
    }

    const currentList = consultant.invoices || [];
    let updatedList: ConsultantInvoice[];

    const gross = Number(invoiceForm.grossAmountEtb) || 0;
    const adv = Number(invoiceForm.advanceDeductionEtb) || 0;
    const tax = Number(invoiceForm.taxDeductionEtb) || 0;
    const net = invoiceForm.netAmountEtb !== undefined ? Number(invoiceForm.netAmountEtb) : Math.max(0, gross - adv - tax);

    if (selectedInvoice) {
      // Edit
      updatedList = currentList.map(item => 
        item.id === selectedInvoice.id ? { 
          ...item, 
          ...invoiceForm,
          grossAmountEtb: gross,
          advanceDeductionEtb: adv,
          taxDeductionEtb: tax,
          netAmountEtb: net,
          foreignCurrencyAmount: Number(invoiceForm.foreignCurrencyAmount) || 0
        } as ConsultantInvoice : item
      );
    } else {
      // Add new
      const newItem: ConsultantInvoice = {
        id: 'cinv_' + Date.now(),
        invoiceNo: invoiceForm.invoiceNo || '',
        billingPeriod: invoiceForm.billingPeriod || '',
        submissionDate: invoiceForm.submissionDate || new Date().toISOString().split('T')[0],
        certificationDate: invoiceForm.certificationDate || '',
        paymentDate: invoiceForm.paymentDate || '',
        grossAmountEtb: gross,
        advanceDeductionEtb: adv,
        taxDeductionEtb: tax,
        netAmountEtb: net,
        foreignCurrencyAmount: Number(invoiceForm.foreignCurrencyAmount) || 0,
        foreignCurrencyCode: invoiceForm.foreignCurrencyCode || 'USD',
        status: invoiceForm.status as any || 'Submitted',
        paymentReference: invoiceForm.paymentReference || '',
        remarks: invoiceForm.remarks || '',
        attachmentName: invoiceForm.attachmentName || ''
      };
      updatedList = [newItem, ...currentList];
    }

    const updatedConsultant: SupervisionConsultantInfo = {
      ...consultant,
      invoices: updatedList
    };

    saveConsultantData(updatedConsultant, selectedInvoice ? `Updated invoice ${invoiceForm.invoiceNo}` : `Added invoice ${invoiceForm.invoiceNo}`);
    setIsInvoiceModalOpen(false);
  };

  const handleDeleteInvoice = (invId: string, invNo: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice "${invNo}"?`)) {
      return;
    }
    const updatedList = (consultant.invoices || []).filter(item => item.id !== invId);
    saveConsultantData({ ...consultant, invoices: updatedList }, `Deleted invoice ${invNo}`);
  };

  // Helper to calculate elapsed time on site
  const getAssignmentDuration = (assignmentDateStr: string, demobDateStr?: string) => {
    if (!assignmentDateStr) return 'N/A';
    const start = new Date(assignmentDateStr);
    const end = demobDateStr ? new Date(demobDateStr) : new Date();
    if (isNaN(start.getTime())) return assignmentDateStr;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30.4);
    const years = (months / 12).toFixed(1);

    if (months < 1) return `${diffDays} days`;
    if (months < 12) return `${months} months`;
    return `${years} yrs (${months} mos)`;
  };

  // Export Staffing & Invoice Report to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 16;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 26, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ETHIOPIAN ROADS ADMINISTRATION', margin, 11);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`SUPERVISION CONSULTANT & STAFFING DOSSIER | ${project.name || 'Project'}`, margin, 18);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, 18);

      y = 34;

      // Consultant Basic Details Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), 32, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(consultant.firmName || 'Supervision Consultant', margin + 4, y + 7);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Contract Ref: ${consultant.contractRefNo || 'N/A'}`, margin + 4, y + 14);
      doc.text(`Type: ${consultant.associationType || 'Joint Venture'} (${consultant.contractType || 'Time-Based'})`, margin + 4, y + 19);
      doc.text(`Commencement Date: ${consultant.commencementDate || 'N/A'}`, margin + 4, y + 24);

      doc.text(`Resident Engineer: ${consultant.residentEngineerName || 'N/A'}`, margin + 85, y + 14);
      doc.text(`Site Camp: ${consultant.siteOfficeLocation || 'N/A'}`, margin + 85, y + 19);
      doc.text(`Original Fee: ETB ${formatAccounting(consultant.originalFeeEtb || 0, '')}`, margin + 85, y + 24);

      y += 40;

      // Section: Assigned Personnel
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`ASSIGNED SUPERVISION PERSONNEL (${(consultant.personnel || []).length} Staff Members)`, margin, y);
      y += 5;

      // Personnel Table Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('#', margin + 2, y + 5);
      doc.text('Personnel Name', margin + 8, y + 5);
      doc.text('Specific Position', margin + 50, y + 5);
      doc.text('Date of Assignment', margin + 98, y + 5);
      doc.text('Qualifications / Role', margin + 130, y + 5);
      doc.text('Status', margin + 168, y + 5);
      y += 8;

      // Personnel Table Rows
      doc.setFont('helvetica', 'normal');
      (consultant.personnel || []).forEach((p, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(String(idx + 1), margin + 2, y + 4);
        doc.text(p.name || '-', margin + 8, y + 4);
        doc.text(p.position || '-', margin + 50, y + 4);
        doc.text(p.assignmentDate || '-', margin + 98, y + 4);
        doc.text((p.qualification || p.category || '-').substring(0, 24), margin + 130, y + 4);
        doc.text(p.status || 'Active', margin + 168, y + 4);

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 6, pageWidth - margin, y + 6);
        y += 6;
      });

      y += 8;
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      // Section: Consultant Invoices
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`CONSULTANT INVOICES & FEE CERTIFICATES (${(consultant.invoices || []).length} Invoices)`, margin, y);
      y += 5;

      // Invoice Table Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Invoice #', margin + 2, y + 5);
      doc.text('Period', margin + 28, y + 5);
      doc.text('Submission', margin + 52, y + 5);
      doc.text('Gross Amount (ETB)', margin + 78, y + 5);
      doc.text('Net Payable (ETB)', margin + 115, y + 5);
      doc.text('USD', margin + 150, y + 5);
      doc.text('Status', margin + 168, y + 5);
      y += 8;

      // Invoice Table Rows
      doc.setFont('helvetica', 'normal');
      (consultant.invoices || []).forEach((inv) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(inv.invoiceNo || '-', margin + 2, y + 4);
        doc.text(inv.billingPeriod || '-', margin + 28, y + 4);
        doc.text(inv.submissionDate || '-', margin + 52, y + 4);
        doc.text(formatAccounting(inv.grossAmountEtb || 0, ''), margin + 78, y + 4);
        doc.text(formatAccounting(inv.netAmountEtb || 0, ''), margin + 115, y + 4);
        doc.text(`$${formatAccounting(inv.foreignCurrencyAmount || 0, '')}`, margin + 150, y + 4);
        doc.text(inv.status || 'Submitted', margin + 168, y + 4);

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 6, pageWidth - margin, y + 6);
        y += 6;
      });

      doc.save(`Supervision_Consultant_Report_${(project.name || 'Project').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not export PDF. Please verify browser permissions.');
    }
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const staffHeaders = ['Name', 'Position', 'Category', 'Date of Assignment', 'Status', 'Qualification', 'Experience (Yrs)', 'Man-Months Allocated', 'Man-Months Input', 'Site Station', 'Phone', 'Email'];
    const staffRows = (consultant.personnel || []).map(p => [
      `"${p.name || ''}"`,
      `"${p.position || ''}"`,
      `"${p.category || ''}"`,
      `"${p.assignmentDate || ''}"`,
      `"${p.status || ''}"`,
      `"${p.qualification || ''}"`,
      p.yearsExperience || 0,
      p.manMonthsAllocated || 0,
      p.manMonthsInput || 0,
      `"${p.siteStation || ''}"`,
      `"${p.contactPhone || ''}"`,
      `"${p.contactEmail || ''}"`
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '--- SUPERVISION CONSULTANT PERSONNEL DIRECTORY ---\n';
    csvContent += staffHeaders.join(',') + '\n';
    staffRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    csvContent += '\n\n--- CONSULTANT INVOICES & FEE CLAIMS ---\n';
    const invHeaders = ['Invoice No', 'Billing Period', 'Submission Date', 'Certification Date', 'Payment Date', 'Gross Amount ETB', 'Advance Deduction ETB', 'Tax Deduction ETB', 'Net Payable ETB', 'Foreign Currency USD', 'Status', 'Payment Ref', 'Remarks'];
    const invRows = (consultant.invoices || []).map(inv => [
      `"${inv.invoiceNo || ''}"`,
      `"${inv.billingPeriod || ''}"`,
      `"${inv.submissionDate || ''}"`,
      `"${inv.certificationDate || ''}"`,
      `"${inv.paymentDate || ''}"`,
      inv.grossAmountEtb || 0,
      inv.advanceDeductionEtb || 0,
      inv.taxDeductionEtb || 0,
      inv.netAmountEtb || 0,
      inv.foreignCurrencyAmount || 0,
      `"${inv.status || ''}"`,
      `"${inv.paymentReference || ''}"`,
      `"${inv.remarks || ''}"`
    ]);
    csvContent += invHeaders.join(',') + '\n';
    invRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Consultant_Staffing_Invoices_${(project.name || 'Project').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Building2 className="w-3.5 h-3.5" />
                Supervision Consultant Portal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {consultant.associationType || 'Joint Venture'}
              </span>
              {consultant.performanceRating && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Award className="w-3 h-3" />
                  {consultant.performanceRating} Performance
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {consultant.firmName || 'Supervision Consultant Information'}
            </h1>
            <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400 max-w-3xl">
              Resident Engineer administration, assigned personnel staffing directory with specific roles and dates of assignment, and supervision fee invoices tracking.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isReadonly && (
              <>
                <button
                  onClick={() => {
                    setConsultantForm(consultant);
                    setIsEditConsultantOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Contract Details
                </button>

                <button
                  onClick={handleOpenAddPersonnel}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition shadow-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  Assign Personnel
                </button>

                <button
                  onClick={handleOpenAddInvoice}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Invoice
                </button>
              </>
            )}

            <button
              onClick={() => setIsWorkloadReportOpen(true)}
              id="btn-supervision-print-workload-report"
              className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Print Workload Report
            </button>

            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
              <button
                onClick={handleExportPDF}
                title="Export Single Project PDF Report"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={handleExportCSV}
                title="Export Excel/CSV"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Executive KPI Metric Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Supervision Fee</span>
            <div className="text-base md:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {formatAccounting((consultant.revisedFeeEtb || consultant.originalFeeEtb || 0) / 1_000_000, '')} M
            </div>
            <span className="text-[10px] text-slate-400 font-mono">ETB Contract Budget</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Invoiced</span>
            <div className="text-base md:text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {formatAccounting(financialSummary.totalGrossInvoiced / 1_000_000, '')} M
            </div>
            <span className="text-[10px] text-blue-500 font-semibold font-mono">
              {financialSummary.financialUtilizationPct.toFixed(1)}% Utilized
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Paid (ETB)</span>
            <div className="text-base md:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {formatAccounting(financialSummary.totalPaidEtb / 1_000_000, '')} M
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold font-mono">
              {financialSummary.paymentDisbursementPct.toFixed(1)}% Settled
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Foreign Fee (USD)</span>
            <div className="text-base md:text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
              ${formatAccounting((consultant.revisedFeeUsd || consultant.originalFeeUsd || 0) / 1_000, '')} k
            </div>
            <span className="text-[10px] text-purple-500 font-semibold font-mono">
              ${formatAccounting(financialSummary.totalPaidUsd / 1_000, '')} k Paid
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Personnel</span>
            <div className="text-base md:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {personnelSummary.activeCount} <span className="text-xs text-slate-400 font-normal">/ {personnelSummary.totalCount}</span>
            </div>
            <span className="text-[10px] text-indigo-500 font-semibold">
              {personnelSummary.keyStaffCount} Key Experts
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Man-Months Input</span>
            <div className="text-base md:text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {personnelSummary.totalInputMM.toFixed(1)} <span className="text-xs text-slate-400 font-normal">MM</span>
            </div>
            <span className="text-[10px] text-amber-500 font-semibold font-mono">
              {personnelSummary.mmUtilizationPct.toFixed(1)}% of {personnelSummary.totalAllocatedMM} MM
            </span>
          </div>
        </div>
      </div>

      {/* Internal Navigation Subtabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('personnel')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'personnel'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Assigned Personnel Directory
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
            activeTab === 'personnel' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {consultant.personnel?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Fee Invoices & Payments
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
            activeTab === 'invoices' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}>
            {consultant.invoices?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'profile'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Contract & Scope Profile
        </button>
      </div>

      {/* TAB 1: ASSIGNED PERSONNEL DIRECTORY */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, specific position, qualifications, station, or email..."
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Category:
              </div>
              <select
                value={personnelCategoryFilter}
                onChange={(e) => setPersonnelCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="ALL">All Categories</option>
                <option value="Key Personnel">Key Personnel</option>
                <option value="Non-Key Professional">Non-Key Professional</option>
                <option value="Sub-Professional">Sub-Professional</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Administrative Support">Administrative Support</option>
              </select>

              <select
                value={personnelStatusFilter}
                onChange={(e) => setPersonnelStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Demobilized">Demobilized</option>
                <option value="On Leave">On Leave</option>
                <option value="Replaced">Replaced</option>
              </select>

              {!isReadonly && (
                <button
                  onClick={handleOpenAddPersonnel}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Staff
                </button>
              )}
            </div>
          </div>

          {/* Personnel Table View */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Assigned Personnel Name</th>
                    <th className="py-3 px-4">Specific Position / Role</th>
                    <th className="py-3 px-4 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300 font-black">
                      Date of Assignment
                    </th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Qualifications</th>
                    <th className="py-3 px-4 text-center">Man-Months</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No assigned personnel matching your criteria.</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Assign Personnel" to register supervision staff members.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPersonnel.map((p, idx) => {
                      const durationStr = getAssignmentDuration(p.assignmentDate, p.demobilizationDate);
                      const isKey = p.category === 'Key Personnel';
                      const isActive = p.status === 'Active';

                      return (
                        <tr 
                          key={p.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150"
                        >
                          <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {p.name}
                            </div>
                            {(p.contactPhone || p.contactEmail) && (
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                {p.contactPhone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                    {p.contactPhone}
                                  </span>
                                )}
                                {p.contactEmail && (
                                  <span className="flex items-center gap-0.5 truncate max-w-[140px]" title={p.contactEmail}>
                                    <Mail className="w-2.5 h-2.5 text-slate-400" />
                                    {p.contactEmail}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-indigo-700 dark:text-indigo-400">
                              {p.position}
                            </div>
                            {p.siteStation && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {p.siteStation}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 bg-indigo-50/30 dark:bg-indigo-950/10">
                            <div className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              {p.assignmentDate || 'Not set'}
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 font-mono">
                              On site: {durationStr}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isKey
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {p.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1" title={p.qualification}>
                              {p.qualification || '-'}
                            </div>
                            {p.yearsExperience ? (
                              <div className="text-[10px] text-slate-400">
                                {p.yearsExperience} yrs experience
                              </div>
                            ) : null}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {p.manMonthsInput || 0} / {p.manMonthsAllocated || 0}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              MM Input
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewDetailPersonnel(p)}
                                title="View details"
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {!isReadonly && (
                                <>
                                  <button
                                    onClick={() => handleTogglePersonnelStatus(p)}
                                    title={isActive ? 'Demobilize staff' : 'Reactivate staff'}
                                    className={`p-1.5 rounded-lg transition ${
                                      isActive 
                                        ? 'hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600' 
                                        : 'hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-600'
                                    }`}
                                  >
                                    {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditPersonnel(p)}
                                    title="Edit personnel"
                                    className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 transition"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeletePersonnel(p.id, p.name)}
                                    title="Delete staff"
                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSULTANT INVOICES & FEE CLAIMS */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Gross Invoiced</span>
                <Receipt className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatAccounting(financialSummary.totalGrossInvoiced, 'ETB')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {(consultant.invoices || []).length} billings submitted
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Net Disbursed / Paid</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatAccounting(financialSummary.totalPaidEtb, 'ETB')}
              </div>
              <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                Plus ${formatAccounting(financialSummary.totalPaidUsd, '')} USD foreign fee
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Certified & In Process</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                {formatAccounting(financialSummary.totalCertifiedPendingEtb, 'ETB')}
              </div>
              <div className="text-[10px] text-amber-500 font-semibold mt-0.5">
                Approved, awaiting treasury transfer
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Contract Budget Balance</span>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                {formatAccounting(Math.max(0, financialSummary.contractBudgetEtb - financialSummary.totalGrossInvoiced), 'ETB')}
              </div>
              <div className="text-[10px] text-purple-500 font-semibold mt-0.5">
                {(100 - financialSummary.financialUtilizationPct).toFixed(1)}% remaining budget
              </div>
            </div>
          </div>

          {/* Invoice Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoices by invoice number, billing period, payment ref, or notes..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Status:
              </div>
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Certified">Certified</option>
                <option value="Submitted">Submitted</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>

              {!isReadonly && (
                <button
                  onClick={handleOpenAddInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Invoice
                </button>
              )}
            </div>
          </div>

          {/* Invoice Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4 text-right">Gross Claim (ETB)</th>
                    <th className="py-3 px-4 text-right">Deductions (ETB)</th>
                    <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Net Payable (ETB)</th>
                    <th className="py-3 px-4 text-right">USD Portion</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No invoices recorded yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add Invoice" to log a supervision consultant fee claim.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const totalDeductions = (inv.advanceDeductionEtb || 0) + (inv.taxDeductionEtb || 0);

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {inv.status}
                        </span>
                      );

                      if (inv.status === 'Paid') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        );
                      } else if (inv.status === 'Certified') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <FileCheck className="w-3 h-3" />
                            Certified
                          </span>
                        );
                      } else if (inv.status === 'Submitted') {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3 h-3" />
                            Submitted
                          </span>
                        );
                      }

                      return (
                        <tr 
                          key={inv.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {inv.invoiceNo}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {inv.billingPeriod}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                            {inv.submissionDate || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatAccounting(inv.grossAmountEtb || 0, '')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400 text-[11px]">
                            {totalDeductions > 0 ? `-${formatAccounting(totalDeductions, '')}` : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                            {formatAccounting(inv.netAmountEtb || 0, '')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400">
                            {inv.foreignCurrencyAmount ? `$${formatAccounting(inv.foreignCurrencyAmount, '')}` : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {statusBadge}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[150px]" title={inv.paymentReference || ''}>
                              {inv.paymentReference || '-'}
                            </div>
                            {inv.paymentDate && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Paid: {inv.paymentDate}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {!isReadonly ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditInvoice(inv)}
                                  title="Edit invoice"
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}
                                  title="Delete invoice"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACT & SCOPE PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contract Details Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Supervision Agreement & Contractual Terms
                </h3>
                {!isReadonly && (
                  <button
                    onClick={() => {
                      setConsultantForm(consultant);
                      setIsEditConsultantOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Modify
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Consulting Firm</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {consultant.firmName || '-'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Association / JV Arrangement</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                    {consultant.associationType || 'Joint Venture'}
                  </div>
                  {consultant.jvPartners && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Partners: {consultant.jvPartners}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Agreement Reference</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                    {consultant.contractRefNo || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Remuneration Type</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                    {consultant.contractType || 'Time-Based (Man-Months + Reimbursables)'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Contract Signing Date</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {consultant.contractSignDate || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Supervision Commencement Date</span>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {consultant.commencementDate || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Original Completion Date</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {consultant.originalCompletionDate || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Revised / Approved Completion Date</span>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {consultant.revisedCompletionDate || consultant.originalCompletionDate || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Scope of Services */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">Consultancy Scope of Services</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {consultant.scopeOfServices || 'Full engineering construction supervision, alignment design review, material testing & quality assurance, day-to-day work inspections, measurement & IPC valuation, claims review, and environmental compliance monitoring under standard ERA FIDIC Conditions of Contract.'}
                </p>
              </div>
            </div>
          </div>

          {/* Resident Engineer Profile Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                  RE
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Resident Engineer</span>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    {consultant.residentEngineerName || 'Eng. Girma Bekele'}
                  </h4>
                  <span className="text-xs text-slate-400">Team Leader / Project Director</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {consultant.residentEngineerPhone && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{consultant.residentEngineerPhone}</span>
                  </div>
                )}

                {consultant.residentEngineerEmail && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{consultant.residentEngineerEmail}</span>
                  </div>
                )}

                {consultant.siteOfficeLocation && (
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{consultant.siteOfficeLocation}</span>
                  </div>
                )}

                {consultant.headOfficeAddress && (
                  <div className="flex items-start gap-2 text-slate-500 text-[11px]">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>Head Office: {consultant.headOfficeAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Assurance Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consultant Compliance</span>
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="font-black text-lg text-white">
                FIDIC Engineer Obligations
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                The supervision team operates under delegated authority from the Ethiopian Roads Administration to administer the civil works contract impartially and enforce high standards of quality assurance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CONSULTANT GENERAL INFO */}
      <AnimatePresence>
        {isEditConsultantOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Edit Supervision Consultant Contract Details
                </h3>
                <button
                  onClick={() => setIsEditConsultantOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Consulting Firm / Lead JV Name</label>
                  <input
                    type="text"
                    value={consultantForm.firmName}
                    onChange={(e) => setConsultantForm({ ...consultantForm, firmName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Association Type</label>
                  <select
                    value={consultantForm.associationType || 'Joint Venture (JV)'}
                    onChange={(e) => setConsultantForm({ ...consultantForm, associationType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Joint Venture (JV)">Joint Venture (JV)</option>
                    <option value="Lead Consultant">Lead Consultant</option>
                    <option value="Sole Consultant">Sole Consultant</option>
                    <option value="Association / Consortium">Association / Consortium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Contract Reference Number</label>
                  <input
                    type="text"
                    value={consultantForm.contractRefNo}
                    onChange={(e) => setConsultantForm({ ...consultantForm, contractRefNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">JV Partners & Local Associate Details</label>
                  <input
                    type="text"
                    value={consultantForm.jvPartners || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, jvPartners: e.target.value })}
                    placeholder="e.g. Lead Firm (India) & Local Engineering Partner (Ethiopia)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Original Contract Fee (ETB)</label>
                  <input
                    type="number"
                    value={consultantForm.originalFeeEtb || 0}
                    onChange={(e) => setConsultantForm({ ...consultantForm, originalFeeEtb: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Revised Contract Fee (ETB)</label>
                  <input
                    type="number"
                    value={consultantForm.revisedFeeEtb || 0}
                    onChange={(e) => setConsultantForm({ ...consultantForm, revisedFeeEtb: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Foreign Fee Portion (USD)</label>
                  <input
                    type="number"
                    value={consultantForm.revisedFeeUsd || consultantForm.originalFeeUsd || 0}
                    onChange={(e) => setConsultantForm({ ...consultantForm, revisedFeeUsd: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Performance Rating</label>
                  <select
                    value={consultantForm.performanceRating || 'Satisfactory'}
                    onChange={(e) => setConsultantForm({ ...consultantForm, performanceRating: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Outstanding">Outstanding</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Signing Date</label>
                  <input
                    type="date"
                    value={consultantForm.contractSignDate || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, contractSignDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Commencement Date</label>
                  <input
                    type="date"
                    value={consultantForm.commencementDate || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, commencementDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Original Completion Date</label>
                  <input
                    type="date"
                    value={consultantForm.originalCompletionDate || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, originalCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Revised Completion Date</label>
                  <input
                    type="date"
                    value={consultantForm.revisedCompletionDate || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, revisedCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Resident Engineer Profile Fields */}
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Resident Engineer Name</label>
                  <input
                    type="text"
                    value={consultantForm.residentEngineerName || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Resident Engineer Phone</label>
                  <input
                    type="text"
                    value={consultantForm.residentEngineerPhone || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Resident Engineer Email</label>
                  <input
                    type="email"
                    value={consultantForm.residentEngineerEmail || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, residentEngineerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Site Camp / Office Location</label>
                  <input
                    type="text"
                    value={consultantForm.siteOfficeLocation || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, siteOfficeLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Scope of Services Summary</label>
                  <textarea
                    rows={2}
                    value={consultantForm.scopeOfServices || ''}
                    onChange={(e) => setConsultantForm({ ...consultantForm, scopeOfServices: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsEditConsultantOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConsultantProfile}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Save Contract Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT PERSONNEL */}
      <AnimatePresence>
        {isPersonnelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  {selectedPersonnel ? 'Edit Assigned Personnel' : 'Assign New Consultant Personnel'}
                </h3>
                <button
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    Personnel Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eng. Yohannes Tadesse"
                    value={personnelForm.name || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">
                    Specific Position / Key Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Highway / Pavement Engineer, Structural Engineer, Materials Engineer"
                    value={personnelForm.position || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Staff Category</label>
                  <select
                    value={personnelForm.category || 'Key Personnel'}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Key Personnel">Key Personnel</option>
                    <option value="Non-Key Professional">Non-Key Professional</option>
                    <option value="Sub-Professional">Sub-Professional</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Administrative Support">Administrative Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-indigo-600 dark:text-indigo-400 font-black mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Date of Assignment <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={personnelForm.assignmentDate || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, assignmentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Deployment Status</label>
                  <select
                    value={personnelForm.status || 'Active'}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Demobilized">Demobilized</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Replaced">Replaced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Date of Demobilization (if applicable)</label>
                  <input
                    type="date"
                    value={personnelForm.demobilizationDate || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, demobilizationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Academic & Professional Qualifications</label>
                  <input
                    type="text"
                    placeholder="e.g. MSc Highway Engineering, BSc Civil Eng (PE)"
                    value={personnelForm.qualification || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={personnelForm.yearsExperience || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, yearsExperience: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Site Station / Assigned Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Daye Main Camp, Section 1 (KM 0-35)"
                    value={personnelForm.siteStation || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, siteStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Man-Months Allocated</label>
                  <input
                    type="number"
                    step="0.5"
                    value={personnelForm.manMonthsAllocated || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, manMonthsAllocated: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Man-Months Expended / Input to Date</label>
                  <input
                    type="number"
                    step="0.5"
                    value={personnelForm.manMonthsInput || 0}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, manMonthsInput: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+251 91 234 5678"
                    value={personnelForm.contactPhone || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="personnel@consultant.com"
                    value={personnelForm.contactEmail || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Remarks & Key Scope Responsibilities</label>
                  <textarea
                    rows={2}
                    placeholder="Specific site duties, design review scope, test witnessing, or delegation notes..."
                    value={personnelForm.remarks || ''}
                    onChange={(e) => setPersonnelForm({ ...personnelForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersonnel}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {selectedPersonnel ? 'Save Personnel' : 'Confirm Assignment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD / EDIT CONSULTANT INVOICE */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-xl my-8 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  {selectedInvoice ? 'Edit Consultant Invoice' : 'Add Supervision Fee Invoice'}
                </h3>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Invoice Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CON-INV-06"
                    value={invoiceForm.invoiceNo || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    Billing Period <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Feb 2026 or 01/02/2026 - 28/02/2026"
                    value={invoiceForm.billingPeriod || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, billingPeriod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={invoiceForm.submissionDate || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, submissionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Certification Date</label>
                  <input
                    type="date"
                    value={invoiceForm.certificationDate || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, certificationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-blue-600 dark:text-blue-400 font-bold mb-1">
                    Gross Invoice Fee (ETB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.grossAmountEtb || 0}
                    onChange={(e) => handleInvoiceAmountChange('grossAmountEtb', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Advance Fee Deduction (ETB)</label>
                  <input
                    type="number"
                    value={invoiceForm.advanceDeductionEtb || 0}
                    onChange={(e) => handleInvoiceAmountChange('advanceDeductionEtb', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Taxes / Withholding / VAT (ETB)</label>
                  <input
                    type="number"
                    value={invoiceForm.taxDeductionEtb || 0}
                    onChange={(e) => handleInvoiceAmountChange('taxDeductionEtb', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                    Net Payable Amount (ETB)
                  </label>
                  <input
                    type="number"
                    value={invoiceForm.netAmountEtb || 0}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, netAmountEtb: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono font-black text-emerald-700 dark:text-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-purple-600 dark:text-purple-400 font-semibold mb-1">Foreign Currency Fee (USD)</label>
                  <input
                    type="number"
                    value={invoiceForm.foreignCurrencyAmount || 0}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, foreignCurrencyAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl font-mono text-purple-700 dark:text-purple-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Payment Status</label>
                  <select
                    value={invoiceForm.status || 'Submitted'}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Certified">Certified by Client</option>
                    <option value="Paid">Paid / Disbursed</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Payment Date (if settled)</label>
                  <input
                    type="date"
                    value={invoiceForm.paymentDate || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Payment Voucher / Transfer Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. CBE-FT-20260210 or ERA-PV-881"
                    value={invoiceForm.paymentReference || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentReference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Attached Document Reference / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Consultant_Invoice_Feb2026_Certified.pdf - Staff fee & field mileage breakdown"
                    value={invoiceForm.remarks || ''}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInvoice}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {selectedInvoice ? 'Save Invoice' : 'Submit Invoice'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: VIEW PERSONNEL DETAIL CARD */}
      <AnimatePresence>
        {viewDetailPersonnel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {viewDetailPersonnel.name}
                    </h3>
                    <span className="text-xs text-indigo-600 font-bold">{viewDetailPersonnel.position}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewDetailPersonnel(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Date of Assignment</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {viewDetailPersonnel.assignmentDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Duration on Project</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {getAssignmentDuration(viewDetailPersonnel.assignmentDate, viewDetailPersonnel.demobilizationDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Category & Status</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {viewDetailPersonnel.category} • {viewDetailPersonnel.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Man-Months</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {viewDetailPersonnel.manMonthsInput || 0} expended / {viewDetailPersonnel.manMonthsAllocated || 0} allocated
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Qualifications & Experience</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewDetailPersonnel.qualification || 'N/A'} ({viewDetailPersonnel.yearsExperience || 0} years experience)
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Site Station & Location</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewDetailPersonnel.siteStation || 'Main Site Camp'}
                  </div>
                </div>

                {viewDetailPersonnel.remarks && (
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Assigned Scope / Remarks</span>
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {viewDetailPersonnel.remarks}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setViewDetailPersonnel(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cross-Project Supervision Personnel Workload Report Modal */}
      <WorkloadReportModal
        isOpen={isWorkloadReportOpen}
        onClose={() => setIsWorkloadReportOpen(false)}
        projects={projects && projects.length > 0 ? projects : [project]}
        currentProject={project}
        currentUser={currentUser}
        title="Supervision Personnel Workload & Project Commitments Report"
      />
    </div>
  );
}

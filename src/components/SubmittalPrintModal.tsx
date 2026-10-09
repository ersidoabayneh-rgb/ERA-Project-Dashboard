import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Download,
  Layers,
  ChevronDown,
  Building2,
  Eye,
  UserCheck,
  PenTool,
  CheckSquare,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawStandardDocumentHeader, STRICT_1_INCH_MARGIN, drawDocumentWatermark } from '../lib/pdfReportEngine';
import { ConsultantSubmittalKpi, Project, SupervisionConsultantInfo } from '../types';

export interface SignatureRoleItem {
  key: string;
  roleTitle: string; // Official capitalized title in PDF, e.g. 'SENIOR SURVEYER'
  displayName: string; // UI label
  name: string; // Signee name
  date: string; // Sign date
  enabled: boolean;
}

export interface SubmittalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  consultant: SupervisionConsultantInfo;
  allSubmittals: ConsultantSubmittalKpi[];
  selectedSubmittalNos?: string[];
  selectedRfiIds?: string[];
  initialScope?: 'all' | 'selected' | 'technical' | 'rfi';
  targetOverrides?: Record<string, number>;
  watermark?: 'NONE' | 'DRAFT' | 'CONFIDENTIAL';
  onWatermarkChange?: (w: 'NONE' | 'DRAFT' | 'CONFIDENTIAL') => void;
}

export default function SubmittalPrintModal({
  isOpen,
  onClose,
  project,
  consultant,
  allSubmittals,
  selectedSubmittalNos = [],
  selectedRfiIds = [],
  initialScope,
  targetOverrides = {},
  watermark: watermarkProp,
  onWatermarkChange
}: SubmittalPrintModalProps) {
  // Determine default scope
  const hasSelectedItems = selectedSubmittalNos.length > 0 || selectedRfiIds.length > 0;
  
  const [scope, setScope] = useState<'all' | 'selected' | 'technical' | 'rfi'>(() => {
    if (initialScope) return initialScope;
    if (hasSelectedItems) return 'selected';
    return 'all';
  });

  // Watermark state ('NONE' | 'DRAFT' | 'CONFIDENTIAL')
  const [internalWatermark, setInternalWatermark] = useState<'NONE' | 'DRAFT' | 'CONFIDENTIAL'>(() => watermarkProp || 'NONE');

  React.useEffect(() => {
    if (watermarkProp !== undefined) {
      setInternalWatermark(watermarkProp);
    }
  }, [watermarkProp]);

  const activeWatermark = watermarkProp !== undefined ? watermarkProp : internalWatermark;
  const handleSetWatermark = (w: 'NONE' | 'DRAFT' | 'CONFIDENTIAL') => {
    setInternalWatermark(w);
    if (onWatermarkChange) onWatermarkChange(w);
  };

  // Date/Month Filtering Mode
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'by_month' | 'by_range'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Grouping and Sorting
  const [groupByMonth, setGroupByMonth] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [previewTab, setPreviewTab] = useState<'options' | 'signatures' | 'preview'>('options');

  // Signatures State (Requested 5 Roles: Senior Surveyer, Quantity Surveyor, Material Engineer, Assisstance Resident Engineer, Resident Engineer)
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [signaturePlacement, setSignaturePlacement] = useState<'every_page' | 'last_page'>('every_page');

  // Auto-discover personnel from project if present
  const defaultPersonnel = useMemo(() => {
    const list = project.supervisionConsultant?.personnel || [];
    const findPerson = (keywords: string[]) => {
      const match = list.find(p => {
        const pos = (p.position || '').toLowerCase();
        return keywords.some(k => pos.includes(k.toLowerCase()));
      });
      return match?.name || '';
    };

    return {
      surveyer: findPerson(['surveyer', 'surveyor']),
      qs: findPerson(['quantity surveyor', 'quantity', 'qs']),
      material: findPerson(['material', 'laboratory']),
      are: findPerson(['assistant resident', 'are', 'assistant re', 'assisstance']),
      re: consultant.residentEngineerName || findPerson(['resident engineer', 'team leader', 're']) || ''
    };
  }, [project, consultant]);

  const [signatures, setSignatures] = useState<SignatureRoleItem[]>([
    {
      key: 'senior_surveyer',
      roleTitle: 'SENIOR SURVEYER',
      displayName: 'Senior Surveyer',
      name: '',
      date: '',
      enabled: true
    },
    {
      key: 'quantity_surveyor',
      roleTitle: 'QUANTITY SURVEYOR',
      displayName: 'Quantity Surveyor',
      name: '',
      date: '',
      enabled: true
    },
    {
      key: 'material_engineer',
      roleTitle: 'MATERIAL ENGINEER',
      displayName: 'Material Engineer',
      name: '',
      date: '',
      enabled: true
    },
    {
      key: 'assistant_resident_engineer',
      roleTitle: 'ASSISSTANCE RESIDENT ENGINEER',
      displayName: 'Assisstance Resident Engineer',
      name: '',
      date: '',
      enabled: true
    },
    {
      key: 'resident_engineer',
      roleTitle: 'RESIDENT ENGINEER',
      displayName: 'Resident Engineer',
      name: consultant.residentEngineerName || '',
      date: '',
      enabled: true
    }
  ]);

  // Sync defaults on modal open
  React.useEffect(() => {
    if (isOpen) {
      setSignatures(prev => prev.map(s => {
        if (s.name) return s;
        if (s.key === 'senior_surveyer' && defaultPersonnel.surveyer) return { ...s, name: defaultPersonnel.surveyer };
        if (s.key === 'quantity_surveyor' && defaultPersonnel.qs) return { ...s, name: defaultPersonnel.qs };
        if (s.key === 'material_engineer' && defaultPersonnel.material) return { ...s, name: defaultPersonnel.material };
        if (s.key === 'assistant_resident_engineer' && defaultPersonnel.are) return { ...s, name: defaultPersonnel.are };
        if (s.key === 'resident_engineer' && defaultPersonnel.re) return { ...s, name: defaultPersonnel.re };
        return s;
      }));
    }
  }, [isOpen, defaultPersonnel]);

  // Quick signature helpers
  const handleToggleSignature = (key: string) => {
    setSignatures(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };

  const handleUpdateSignatureName = (key: string, name: string) => {
    setSignatures(prev => prev.map(s => s.key === key ? { ...s, name } : s));
  };

  const handleUpdateSignatureDate = (key: string, date: string) => {
    setSignatures(prev => prev.map(s => s.key === key ? { ...s, date } : s));
  };

  const handleFillAllTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setSignatures(prev => prev.map(s => ({ ...s, date: today })));
  };

  const handleClearAllDates = () => {
    setSignatures(prev => prev.map(s => ({ ...s, date: '' })));
  };

  const handleSelectAllSignatures = () => {
    setSignatures(prev => prev.map(s => ({ ...s, enabled: true })));
  };

  const handleResetToPersonnelDefaults = () => {
    setSignatures([
      {
        key: 'senior_surveyer',
        roleTitle: 'SENIOR SURVEYER',
        displayName: 'Senior Surveyer',
        name: defaultPersonnel.surveyer || '',
        date: '',
        enabled: true
      },
      {
        key: 'quantity_surveyor',
        roleTitle: 'QUANTITY SURVEYOR',
        displayName: 'Quantity Surveyor',
        name: defaultPersonnel.qs || '',
        date: '',
        enabled: true
      },
      {
        key: 'material_engineer',
        roleTitle: 'MATERIAL ENGINEER',
        displayName: 'Material Engineer',
        name: defaultPersonnel.material || '',
        date: '',
        enabled: true
      },
      {
        key: 'assistant_resident_engineer',
        roleTitle: 'ASSISSTANCE RESIDENT ENGINEER',
        displayName: 'Assisstance Resident Engineer',
        name: defaultPersonnel.are || '',
        date: '',
        enabled: true
      },
      {
        key: 'resident_engineer',
        roleTitle: 'RESIDENT ENGINEER',
        displayName: 'Resident Engineer',
        name: defaultPersonnel.re || consultant.residentEngineerName || '',
        date: '',
        enabled: true
      }
    ]);
  };

  // Derive unique months list from data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    allSubmittals.forEach(s => {
      const d = s.submittedDate || '';
      if (d && d.length >= 7) {
        const ym = d.substring(0, 7); // YYYY-MM
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthSet.add(ym);
        }
      }
    });

    return Array.from(monthSet).sort().reverse().map(ym => {
      const [year, month] = ym.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const count = allSubmittals.filter(s => (s.submittedDate || '').startsWith(ym)).length;
      return { value: ym, label: `${label} (${count} records)` };
    });
  }, [allSubmittals]);

  // Set default month and scope if available
  React.useEffect(() => {
    if (isOpen) {
      if (initialScope) {
        setScope(initialScope);
      } else if (selectedSubmittalNos.length > 0 || selectedRfiIds.length > 0) {
        setScope('selected');
      }
    }
  }, [isOpen, initialScope, selectedSubmittalNos, selectedRfiIds]);

  // Quick Date Range Helpers
  const handleSetDatePreset = (preset: 'this_month' | 'last_month' | 'last_30' | 'ytd' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateFilterMode('all');
      setSelectedMonth('ALL');
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'this_month') {
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setDateFilterMode('by_month');
      setSelectedMonth(ym);
      return;
    }

    if (preset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      setDateFilterMode('by_month');
      setSelectedMonth(ym);
      return;
    }

    if (preset === 'last_30') {
      setDateFilterMode('by_range');
      const past = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'ytd') {
      setDateFilterMode('by_range');
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(now.toISOString().split('T')[0]);
      return;
    }
  };

  // Filter records based on active configuration
  const filteredRecords = useMemo(() => {
    let pool = [...allSubmittals];

    // 1. Filter by Scope
    if (scope === 'selected') {
      pool = pool.filter(s => {
        const matchSub = s.submittalNo && selectedSubmittalNos.includes(s.submittalNo);
        const matchId = s.id && (selectedRfiIds.includes(s.id) || selectedSubmittalNos.includes(s.id));
        return matchSub || matchId;
      });
    } else if (scope === 'technical') {
      pool = pool.filter(s => s.type !== 'RFI');
    } else if (scope === 'rfi') {
      pool = pool.filter(s => s.type === 'RFI');
    }

    // 2. Filter by Status
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'APPROVED_CLOSED') {
        pool = pool.filter(s => 
          s.status === 'Approved' || 
          s.status === 'Approved / Closed' || 
          s.status === 'Closed' || 
          s.status === 'Closed / Agreed'
        );
      } else if (statusFilter === 'UNDER_REVIEW') {
        pool = pool.filter(s => 
          s.status === 'Under Review' || 
          s.status === 'Pending' || 
          s.status === 'Pending ERA Review'
        );
      } else if (statusFilter === 'OVERDUE') {
        pool = pool.filter(s => {
          const tgt = s.targetDays || targetOverrides[s.type] || 7;
          const act = s.actualDays ?? 0;
          return act > tgt || s.status === 'Overdue';
        });
      }
    }

    // 3. Filter by Date / Month
    if (dateFilterMode === 'by_month' && selectedMonth !== 'ALL') {
      pool = pool.filter(s => (s.submittedDate || '').startsWith(selectedMonth));
    } else if (dateFilterMode === 'by_range') {
      if (startDate) {
        pool = pool.filter(s => (s.submittedDate || '') >= startDate);
      }
      if (endDate) {
        pool = pool.filter(s => (s.submittedDate || '') <= endDate);
      }
    }

    // 4. Sort Records
    pool.sort((a, b) => {
      const timeA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const timeB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return (a.submittalNo || '').localeCompare(b.submittalNo || '', undefined, { numeric: true });
    });

    return pool;
  }, [
    allSubmittals,
    scope,
    selectedSubmittalNos,
    selectedRfiIds,
    statusFilter,
    dateFilterMode,
    selectedMonth,
    startDate,
    endDate,
    sortOrder,
    targetOverrides
  ]);

  // Breakdown statistics for filtered records
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const technical = filteredRecords.filter(s => s.type !== 'RFI').length;
    const rfis = filteredRecords.filter(s => s.type === 'RFI').length;
    const closed = filteredRecords.filter(s => 
      s.status === 'Approved' || 
      s.status === 'Approved / Closed' || 
      s.status === 'Closed' || 
      s.status === 'Closed / Agreed'
    ).length;
    const pending = total - closed;
    return { total, technical, rfis, closed, pending };
  }, [filteredRecords]);

  // Group records by Month if requested
  const monthGroups = useMemo(() => {
    if (!groupByMonth) {
      return [{ groupKey: 'All Records', monthLabel: 'All Records', items: filteredRecords }];
    }

    const groupsMap = new Map<string, ConsultantSubmittalKpi[]>();
    filteredRecords.forEach(item => {
      const d = item.submittedDate || '';
      const key = d.length >= 7 && /^\d{4}-\d{2}/.test(d) ? d.substring(0, 7) : 'Unspecified Date';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(item);
    });

    const entries = Array.from(groupsMap.entries());
    entries.sort((a, b) => {
      if (a[0] === 'Unspecified Date') return 1;
      if (b[0] === 'Unspecified Date') return -1;
      return sortOrder === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
    });

    return entries.map(([key, items]) => {
      let label = key;
      if (key !== 'Unspecified Date' && /^\d{4}-\d{2}$/.test(key)) {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
      return {
        groupKey: key,
        monthLabel: label,
        items
      };
    });
  }, [filteredRecords, groupByMonth, sortOrder]);

  if (!isOpen) return null;

  // Generate & Download Formatted PDF via jsPDF
  const handleDownloadPdf = () => {
    if (filteredRecords.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 595.28 pt
    const margin = STRICT_1_INCH_MARGIN; // 36 pt
    const contentWidth = pageWidth - (margin * 2);
    let curY = margin + 14;
    let pageCount = 0;

    const drawSignatureBlocksOnPage = () => {
      if (!includeSignatures) return;
      const activeSigs = signatures.filter(s => s.enabled);
      if (activeSigs.length === 0) return;

      const sigBoxY = pageHeight - margin - 56;
      const sigBoxH = 38;

      // Card container for signatures at bottom of each page
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.6);
      doc.roundedRect(margin + 2, sigBoxY, contentWidth - 4, sigBoxH, 2, 2, 'DF');

      const colW = (contentWidth - 4) / activeSigs.length;

      activeSigs.forEach((sig, idx) => {
        const rx = margin + 2 + (idx * colW);

        // Vertical divider between signature columns
        if (idx > 0) {
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.5);
          doc.line(rx, sigBoxY, rx, sigBoxY + sigBoxH);
        }

        // Role title header strip
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(rx + 0.5, sigBoxY + 0.5, colW - 1, 9.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(activeSigs.length > 4 ? 5.5 : 6);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(sig.roleTitle, rx + (colW / 2), sigBoxY + 7, { align: 'center' });

        // Name, Sign, Date lines
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(100, 116, 139); // slate-500

        // Name
        doc.text("Name:", rx + 3, sigBoxY + 16.5);
        if (sig.name && sig.name.trim()) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(sig.name.trim().substring(0, 24), rx + 22, sigBoxY + 16.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
        } else {
          doc.setDrawColor(203, 213, 225);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(rx + 22, sigBoxY + 16.5, rx + colW - 4, sigBoxY + 16.5);
        }

        // Sign
        doc.text("Sign:", rx + 3, sigBoxY + 24.5);
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(rx + 20, sigBoxY + 24.5, rx + colW - 4, sigBoxY + 24.5);

        // Date
        doc.text("Date:", rx + 3, sigBoxY + 32.5);
        if (sig.date && sig.date.trim()) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(sig.date.trim(), rx + 20, sigBoxY + 32.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
        } else {
          doc.setDrawColor(203, 213, 225);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(rx + 20, sigBoxY + 32.5, rx + colW - 4, sigBoxY + 32.5);
        }

        doc.setLineDashPattern([], 0); // reset dash pattern
      });
    };

    const drawPageDecorations = () => {
      pageCount++;
      // Outer frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 4, 4, 'S');

      // Top colored border strip (Indigo)
      doc.setFillColor(79, 70, 229);
      doc.rect(margin + 2, margin + 1, contentWidth - 4, 3, 'F');

      // Semi-transparent background watermark (DRAFT / CONFIDENTIAL) if configured in settings
      if (activeWatermark !== 'NONE') {
        drawDocumentWatermark(doc, activeWatermark);
      }

      // 5 Mandatory Engineering Signatures at bottom of EACH page (when enabled)
      if (includeSignatures && signaturePlacement === 'every_page') {
        drawSignatureBlocksOnPage();
      }

      // Bottom footer line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 2, pageHeight - margin - 15, pageWidth - margin - 2, pageHeight - margin - 15);

      // Footer texts with safe width to avoid text overlap
      const dateSubtitle = dateFilterMode === 'by_month' && selectedMonth !== 'ALL'
        ? `Month: ${selectedMonth}`
        : (dateFilterMode === 'by_range' && (startDate || endDate) ? `Dates: ${startDate || 'Start'} to ${endDate || 'Present'}` : 'All Timeline');
      const leftFooter = `ETHIOPIAN ROADS ADMINISTRATION • SUBMITTAL & RFI REGISTER • ${project.name || 'ERA PROJECT'} • ${dateSubtitle}`;
      const splitLeftFooter = doc.splitTextToSize(leftFooter, contentWidth - 140);
      doc.text(
        splitLeftFooter[0] || leftFooter,
        margin + 6,
        pageHeight - margin - 6
      );
      doc.text(
        `OFFICIAL PROJECT DOCUMENTATION • Page ${pageCount}`,
        pageWidth - margin - 6,
        pageHeight - margin - 6,
        { align: 'right' }
      );
    };

    let drawTableHeader = () => {};

    const bottomLimit = (includeSignatures && signaturePlacement === 'every_page')
      ? (pageHeight - margin - 62)
      : (pageHeight - margin - 26);

    const checkSpace = (needed: number, isTableContext: boolean = false) => {
      if (curY + needed > bottomLimit) {
        doc.addPage();
        curY = margin + 16;
        drawPageDecorations();
        if (isTableContext) {
          drawTableHeader();
        }
      }
    };

    drawPageDecorations();

    // Standard Document Header
    const subtitleScope = scope === 'selected' 
      ? `SELECTED RECORDS ONLY (${filteredRecords.length} ITEMS)` 
      : (scope === 'technical' ? 'TECHNICAL SUBMITTALS ONLY' : (scope === 'rfi' ? 'RFIs ONLY' : 'ALL TECHNICAL SUBMITTALS & RFIs'));
    const subtitleDate = dateFilterMode === 'by_month' && selectedMonth !== 'ALL'
      ? `• MONTH: ${selectedMonth}`
      : (dateFilterMode === 'by_range' && (startDate || endDate) ? `• DATES: ${startDate || 'Start'} TO ${endDate || 'Now'}` : '');

    const supervisionConsultantName = project.supervisionConsultant?.firmName || consultant?.firmName || project.consultant || 'N/A';
    const contractorName = project.contractor || 'N/A';

    curY = drawStandardDocumentHeader(doc, {
      margin,
      curY,
      contentWidth,
      documentTitle: "OFFICIAL TECHNICAL SUBMITTAL & RFI CORRESPONDENCE REGISTER",
      projectName: project.name || 'CURRENT PROJECT',
      consultantName: supervisionConsultantName,
      contractorName: contractorName,
      scopeText: `${subtitleScope} ${subtitleDate}`.trim(),
      titleColor: [79, 70, 229],
      referenceNo: project.id || 'SUBMITTAL-RFI-LOG',
      statusBadge: 'OFFICIAL REGISTER'
    });

    // Executive Summary Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 32, 4, 4, 'DF');

    const colW = contentWidth / 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL RECORDS", margin + 10, curY + 11);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.total} Records`, margin + 10, curY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TECHNICAL SUBMITTALS", margin + colW + 10, curY + 11);
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${stats.technical} Submittals`, margin + colW + 10, curY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("REQUESTS FOR INFO (RFIs)", margin + (colW * 2) + 10, curY + 11);
    doc.setFontSize(9);
    doc.setTextColor(147, 51, 234);
    doc.text(`${stats.rfis} RFIs`, margin + (colW * 2) + 10, curY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("APPROVED / CLOSED", margin + (colW * 3) + 10, curY + 11);
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`${stats.closed} Records`, margin + (colW * 3) + 10, curY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("UNDER ACTIVE REVIEW", margin + (colW * 4) + 10, curY + 11);
    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11);
    doc.text(`${stats.pending} Records`, margin + (colW * 4) + 10, curY + 23);

    curY += 42;

    // Table Column Widths (Assigned RE removed as requested)
    const baseTableCols = [
      { id: 'subNo', title: "SUBMITTAL / RFI #", width: 85 },
      { id: 'category', title: "TYPE / DISCIPLINE", width: 105 },
      { id: 'title', title: "SUBJECT / DESCRIPTION", width: 260 },
      { id: 'submitted', title: "SUBMITTED", width: 75 },
      { id: 'responded', title: "RESPONDED", width: 75 },
      { id: 'sla', title: "SLA (DAYS)", width: 65 },
      { id: 'status', title: "STATUS", width: 104 }
    ];
    const totalBaseColWidth = baseTableCols.reduce((sum, c) => sum + c.width, 0);
    const tableCols = baseTableCols.map(c => ({
      ...c,
      width: (c.width / totalBaseColWidth) * contentWidth
    }));

    drawTableHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, curY, contentWidth, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      let tx = margin;
      tableCols.forEach((col, cIdx) => {
        doc.text(col.title, tx + 4, curY + 12);
        tx += col.width;
        if (cIdx < tableCols.length - 1) {
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.5);
          doc.line(tx, curY, tx, curY + 18);
        }
      });

      doc.setDrawColor(15, 23, 42);
      doc.rect(margin, curY, contentWidth, 18, 'S');
      curY += 18;
    };

    drawTableHeader();

    // Iterate through groups
    monthGroups.forEach(group => {
      if (groupByMonth) {
        checkSpace(24, false);
        // Group Month Banner
        doc.setFillColor(238, 242, 255); // Indigo-50
        doc.setDrawColor(199, 210, 254);
        doc.rect(margin, curY, contentWidth, 16, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(67, 56, 202); // Indigo-700
        doc.text(`MONTH: ${group.monthLabel.toUpperCase()} (${group.items.length} RECORDS)`, margin + 8, curY + 11);
        curY += 16;
      }

      // Render items
      group.items.forEach((item, index) => {
        const subNoLines = doc.splitTextToSize(item.submittalNo || item.id || '-', tableCols[0].width - 8);
        const catLines = doc.splitTextToSize(item.type || '-', tableCols[1].width - 8);
        const titleLines = doc.splitTextToSize(item.title || '-', tableCols[2].width - 8);
        const subDateLines = doc.splitTextToSize(item.submittedDate || '-', tableCols[3].width - 8);
        const respDateLines = doc.splitTextToSize(item.respondedDate || 'Awaiting', tableCols[4].width - 8);

        const targetDays = item.targetDays || targetOverrides[item.type] || 7;
        const actualStr = item.actualDays !== undefined ? `${item.actualDays}d` : '-';
        const slaLines = doc.splitTextToSize(`${targetDays}d / ${actualStr}`, tableCols[5].width - 8);

        const statusLines = doc.splitTextToSize(item.status || '-', tableCols[6].width - 12);

        const maxLines = Math.max(
          subNoLines.length,
          catLines.length,
          titleLines.length,
          subDateLines.length,
          respDateLines.length,
          slaLines.length,
          statusLines.length
        );
        const rowHeight = Math.max(20, (maxLines * 8.5) + 6);

        checkSpace(rowHeight + 2, true);

        // Row background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(margin, curY, contentWidth, rowHeight, 'F');

        // Grid lines
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);
        doc.line(margin, curY, margin, curY + rowHeight);
        doc.line(margin + contentWidth, curY, margin + contentWidth, curY + rowHeight);

        let divX = margin;
        tableCols.slice(0, -1).forEach(col => {
          divX += col.width;
          doc.line(divX, curY, divX, curY + rowHeight);
        });

        let rx = margin;

        // Submittal / RFI #
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(item.type === 'RFI' ? 147 : 15, item.type === 'RFI' ? 51 : 23, item.type === 'RFI' ? 234 : 42);
        subNoLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[0].width;

        // Category
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        catLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[1].width;

        // Subject / Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        titleLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[2].width;

        // Submitted Date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        subDateLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[3].width;

        // Responded Date
        respDateLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[4].width;

        // SLA
        slaLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });
        rx += tableCols[5].width;

        // Status badge
        const lowerStatus = (item.status || '').toLowerCase();
        let badgeColor = { r: 100, g: 116, b: 139 };
        let badgeBg = { r: 241, g: 245, b: 249 };
        if (lowerStatus.includes('approved') || lowerStatus.includes('closed')) {
          badgeColor = { r: 16, g: 124, b: 65 };
          badgeBg = { r: 209, g: 250, b: 229 };
        } else if (lowerStatus.includes('review') || lowerStatus.includes('pending')) {
          badgeColor = { r: 180, g: 83, b: 9 };
          badgeBg = { r: 254, g: 243, b: 199 };
        } else if (lowerStatus.includes('reject') || lowerStatus.includes('resubmit')) {
          badgeColor = { r: 190, g: 24, b: 74 };
          badgeBg = { r: 255, g: 228, b: 230 };
        }

        const badgeBoxH = Math.max(13, (statusLines.length * 8) + 4);
        doc.setFillColor(badgeBg.r, badgeBg.g, badgeBg.b);
        doc.roundedRect(rx + 4, curY + 3, tableCols[6].width - 8, badgeBoxH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(badgeColor.r, badgeColor.g, badgeColor.b);
        statusLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 7, curY + 10 + (li * 8));
        });
        rx += tableCols[6].width;

        curY += rowHeight;
      });
    });

    // If last_page placement is selected, render on the final page
    if (includeSignatures && signaturePlacement === 'last_page') {
      if (curY > pageHeight - margin - 62) {
        doc.addPage();
        drawPageDecorations();
      }
      drawSignatureBlocksOnPage();
    }

    const filename = `ERA_Submittal_RFI_Register_${scope}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  // Browser Print Document Handler
  const handleBrowserPrint = () => {
    // Print window using standard browser print
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Print Submittals & RFI Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print selected RFIs and technical submittals organized by date and month
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setPreviewTab('options')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              previewTab === 'options'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Print Settings & Scope</span>
          </button>
          <button
            onClick={() => setPreviewTab('signatures')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              previewTab === 'signatures'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Signature Options ({signatures.filter(s => s.enabled).length}/5 Roles)</span>
          </button>
          <button
            onClick={() => setPreviewTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              previewTab === 'preview'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview & Endorsements ({filteredRecords.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {previewTab === 'options' ? (
            <div className="space-y-5">
              {/* 1. Scope / Record Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  1. Select Records Scope
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('selected')}
                    disabled={!hasSelectedItems}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      scope === 'selected'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                        : hasSelectedItems
                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Selected Only</div>
                    <div className="text-xs font-black mt-0.5">Selected Records</div>
                    <div className="text-[11px] font-mono mt-1 text-purple-600 dark:text-purple-400 font-bold">
                      {selectedSubmittalNos.length + selectedRfiIds.length} items selected
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      scope === 'all'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Comprehensive</div>
                    <div className="text-xs font-black mt-0.5">All Submittals & RFIs</div>
                    <div className="text-[11px] font-mono mt-1 text-slate-500 font-bold">
                      {allSubmittals.length} total records
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('technical')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      scope === 'technical'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Technical Only</div>
                    <div className="text-xs font-black mt-0.5">Technical Submittals</div>
                    <div className="text-[11px] font-mono mt-1 text-blue-600 dark:text-blue-400 font-bold">
                      {allSubmittals.filter(s => s.type !== 'RFI').length} submittals
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('rfi')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      scope === 'rfi'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Inquiries Only</div>
                    <div className="text-xs font-black mt-0.5">RFIs & Clarifications</div>
                    <div className="text-[11px] font-mono mt-1 text-purple-600 dark:text-purple-400 font-bold">
                      {allSubmittals.filter(s => s.type === 'RFI').length} RFIs
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Date and Month Filters ("by date by month as per the user") */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      2. Filter by Date or by Month
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Choose to print by a specific month, custom date range, or all available dates
                    </p>
                  </div>

                  {/* Mode selector pills */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start">
                    <button
                      type="button"
                      onClick={() => setDateFilterMode('by_month')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilterMode === 'by_month'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      By Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilterMode('by_range')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilterMode === 'by_range'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      By Date Range
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilterMode('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilterMode === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      All Dates
                    </button>
                  </div>
                </div>

                {/* Sub-controls based on mode */}
                {dateFilterMode === 'by_month' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Select Specific Calendar Month
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="ALL">All Available Months</option>
                          {availableMonths.map(m => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-4 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleSetDatePreset('this_month')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          This Month
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDatePreset('last_month')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          Last Month
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMonth('ALL')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          All Months
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {dateFilterMode === 'by_range' && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          From Submitted Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          To Submitted Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleSetDatePreset('last_30')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDatePreset('ytd')}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Year to Date
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Clear Range
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Layout, Grouping & Sort Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Grouping Structure
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={groupByMonth}
                      onChange={(e) => setGroupByMonth(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                    />
                    <span className="font-bold">Group Sections by Month</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Prints individual monthly tables with subtotal counts
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Sorting Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="asc">Chronological (Oldest First)</option>
                    <option value="desc">Reverse (Newest First)</option>
                  </select>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED_CLOSED">Approved / Closed Only</option>
                    <option value="UNDER_REVIEW">Under Review Only</option>
                    <option value="OVERDUE">Overdue / Delayed Only</option>
                  </select>
                </div>
              </div>

              {/* 4. Signature Endorsement Summary in Options */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-purple-600" />
                      4. Signatures on Bottom of Each PDF Page
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sign-off endorsements by Senior Surveyer, Quantity Surveyor, Material Engineer, Assisstance Resident Engineer & Resident Engineer
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('signatures')}
                    className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5 self-start cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Configure 5 Roles →</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                    />
                    <span>Include Signature Section on Each PDF Page</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Placement:</span>
                    <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setSignaturePlacement('every_page')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          signaturePlacement === 'every_page'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Bottom of Every Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignaturePlacement('last_page')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          signaturePlacement === 'last_page'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Last Page Only
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {signatures.map(s => (
                    <span
                      key={s.key}
                      onClick={() => handleToggleSignature(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
                        s.enabled
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 line-through'
                      }`}
                    >
                      <span>{s.displayName}</span>
                      {s.name && <span className="opacity-75 font-normal">({s.name.split(' ')[0]})</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* 5. Document Watermark (DRAFT / CONFIDENTIAL) */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-purple-600" />
                      5. PDF Watermark & Classification
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Optionally apply a semi-transparent 'DRAFT' or 'CONFIDENTIAL' watermark across all exported pages
                    </p>
                  </div>
                  {activeWatermark !== 'NONE' && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      activeWatermark === 'DRAFT'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                    }`}>
                      Watermark: {activeWatermark}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSetWatermark('NONE')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      activeWatermark === 'NONE'
                        ? 'bg-white dark:bg-slate-800 border-purple-500 text-purple-900 dark:text-purple-200 shadow-2xs'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">No Watermark</div>
                      <div className="text-[10px] text-slate-400">Standard official layout</div>
                    </div>
                    {activeWatermark === 'NONE' && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetWatermark('DRAFT')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      activeWatermark === 'DRAFT'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 shadow-2xs'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <span>DRAFT Watermark</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Preliminary / Working draft copy</div>
                    </div>
                    {activeWatermark === 'DRAFT' && <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetWatermark('CONFIDENTIAL')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      activeWatermark === 'CONFIDENTIAL'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <span>CONFIDENTIAL Watermark</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Restricted distribution copy</div>
                    </div>
                    {activeWatermark === 'CONFIDENTIAL' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Ready Summary Banner */}
              <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Ready for Printing & Official PDF Export</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>{filteredRecords.length} records</strong> match your active filters (
                    {stats.technical} Technical Submittals, {stats.rfis} RFIs, {signatures.filter(s => s.enabled).length} signatures enabled).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Records & Signatures</span>
                </button>
              </div>
            </div>
          ) : previewTab === 'signatures' ? (
            /* Dedicated Signatures Configuration Tab */
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-purple-600" />
                    <span>Official PDF Page-Bottom Signature Endorsements</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure names and sign-offs for the 5 official engineering roles at the bottom of each PDF page
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSignatures}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Select All 5
                  </button>
                  <button
                    type="button"
                    onClick={handleFillAllTodayDate}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Today's Date
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllDates}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Clear Dates
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToPersonnelDefaults}
                    className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 cursor-pointer flex items-center gap-1"
                    title="Auto-fill names from project consultant personnel roster"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Team</span>
                  </button>
                </div>
              </div>

              {/* Master Settings */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                  />
                  <span>Render Engineering Signature Blocks on Document</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Positioning:</span>
                  <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setSignaturePlacement('every_page')}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        signaturePlacement === 'every_page'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Bottom of Every Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignaturePlacement('last_page')}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        signaturePlacement === 'last_page'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Last Page Only
                    </button>
                  </div>
                </div>
              </div>

              {/* The 5 Signature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {signatures.map((sig, idx) => (
                  <div
                    key={sig.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      sig.enabled
                        ? 'bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800/80 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sig.enabled}
                          onChange={() => handleToggleSignature(sig.key)}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer accent-purple-600"
                        />
                        <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                          {idx + 1}. {sig.displayName}
                        </span>
                      </label>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {sig.roleTitle}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Signee Full Name
                        </label>
                        <input
                          type="text"
                          value={sig.name}
                          onChange={(e) => handleUpdateSignatureName(sig.key, e.target.value)}
                          disabled={!sig.enabled}
                          placeholder={
                            sig.key === 'senior_surveyer'
                              ? 'e.g. Ato Daniel Haile'
                              : sig.key === 'quantity_surveyor'
                              ? 'e.g. W/ro Selamawit Alemu'
                              : sig.key === 'material_engineer'
                              ? 'e.g. Materials Engineer'
                              : sig.key === 'assistant_resident_engineer'
                              ? 'e.g. Assistant RE'
                              : 'e.g. Resident Engineer / TL'
                          }
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Leave empty to provide dotted line for handwritten signature
                        </p>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                          Date Endorsement
                        </label>
                        <input
                          type="date"
                          value={sig.date}
                          onChange={(e) => handleUpdateSignatureDate(sig.key, e.target.value)}
                          disabled={!sig.enabled}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Official Signature Block Preview ({signaturePlacement === 'every_page' ? 'Appears on Every Page' : 'Appears on Last Page'})
                  </span>
                  <span className="text-[10px] text-slate-400">Exact layout printed on bottom margin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {signatures.filter(s => s.enabled).map(sig => (
                    <div key={sig.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                      <div className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center truncate">
                        {sig.roleTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Name:</span>
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-[90px]">{sig.name || '_______________'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Sign:</span>
                        <span className="text-slate-400">...................</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Date:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{sig.date || '____/____/____'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Records Preview Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Filtered Records Preview ({filteredRecords.length} Items)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live layout of items that will appear on the printed document & PDF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeWatermark !== 'NONE' && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      activeWatermark === 'DRAFT'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                    }`}>
                      Watermark: {activeWatermark}
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewTab('options')}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    ← Back to Settings
                  </button>
                </div>
              </div>

              {/* Official Document Header Information Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>PROJECT: {project.name || 'CURRENT PROJECT'}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    ERA OFFICIAL EXPORT
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">Supervision Consultant:</span>
                    <span className="truncate" title={project.supervisionConsultant?.firmName || consultant?.firmName || project.consultant || 'N/A'}>
                      {project.supervisionConsultant?.firmName || consultant?.firmName || project.consultant || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">Contractor:</span>
                    <span className="truncate" title={project.contractor || 'N/A'}>
                      {project.contractor || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                  No submittal or RFI records found matching your selected date/month criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {monthGroups.map(group => (
                    <div key={group.groupKey} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                      {groupByMonth && (
                        <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                            {group.monthLabel}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            {group.items.length} records
                          </span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                              <th className="p-2.5">Submittal / RFI #</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Title / Subject</th>
                              <th className="p-2.5">Submitted</th>
                              <th className="p-2.5">Responded</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Engineer</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {group.items.map(item => (
                              <tr key={item.id || item.submittalNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                                <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                  {item.submittalNo || item.id}
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    item.type === 'RFI'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}>
                                    {item.type}
                                  </span>
                                </td>
                                <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                                  {item.title}
                                </td>
                                <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                  {item.submittedDate || '-'}
                                </td>
                                <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                  {item.respondedDate || 'Pending'}
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {item.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                                  {item.assignedEngineer || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Live Endorsement Signature Strip on Preview */}
                  {includeSignatures && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 uppercase tracking-wide">
                          <PenTool className="w-3.5 h-3.5 text-purple-600" />
                          Official Page Bottom Signature Blocks ({signaturePlacement === 'every_page' ? 'Appears on Every Page' : 'Appears on Last Page'})
                        </span>
                        <span className="text-[11px] text-purple-600 font-normal">
                          Senior Surveyer • Quantity Surveyor • Material Engineer • Assisstance Resident Engineer • Resident Engineer
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                        {signatures.filter(s => s.enabled).map(sig => (
                          <div key={sig.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                            <div className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-center truncate">
                              {sig.roleTitle}
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between">
                              <span>Name:</span>
                              <span className="font-bold text-slate-800 dark:text-white truncate max-w-[90px]">{sig.name || '_______________'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between">
                              <span>Sign:</span>
                              <span className="text-slate-400">...................</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between">
                              <span>Date:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{sig.date || '____/____/____'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Ready to generate: </span>
            <strong className="text-slate-800 dark:text-white">{filteredRecords.length} records</strong>
            {groupByMonth && <span> across {monthGroups.length} monthly groups</span>}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex-1 sm:flex-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBrowserPrint}
              disabled={filteredRecords.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs flex-1 sm:flex-none cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Document</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={filteredRecords.length === 0}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs flex-1 sm:flex-none cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-purple-200" />
              <span>Export Official PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

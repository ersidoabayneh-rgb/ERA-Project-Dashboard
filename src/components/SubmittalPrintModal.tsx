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
  Eye
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawStandardDocumentHeader, STRICT_1_INCH_MARGIN } from '../lib/pdfReportEngine';
import { ConsultantSubmittalKpi, Project, SupervisionConsultantInfo } from '../types';

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
  targetOverrides = {}
}: SubmittalPrintModalProps) {
  // Determine default scope
  const hasSelectedItems = selectedSubmittalNos.length > 0 || selectedRfiIds.length > 0;
  
  const [scope, setScope] = useState<'all' | 'selected' | 'technical' | 'rfi'>(() => {
    if (initialScope) return initialScope;
    if (hasSelectedItems) return 'selected';
    return 'all';
  });

  // Date/Month Filtering Mode
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'by_month' | 'by_range'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Grouping and Sorting
  const [groupByMonth, setGroupByMonth] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [previewTab, setPreviewTab] = useState<'options' | 'preview'>('options');

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

  // Set default month if available
  React.useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === 'ALL') {
      // Keep 'ALL' as default or user can select specific
    }
  }, [availableMonths]);

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

    const drawPageDecorations = () => {
      pageCount++;
      // Outer frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 4, 4, 'S');

      // Top colored border strip (Indigo)
      doc.setFillColor(79, 70, 229);
      doc.rect(margin + 2, margin + 1, contentWidth - 4, 3, 'F');

      // Bottom footer line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 2, pageHeight - margin - 20, pageWidth - margin - 2, pageHeight - margin - 20);

      // Footer texts
      const dateSubtitle = dateFilterMode === 'by_month' && selectedMonth !== 'ALL'
        ? `Month: ${selectedMonth}`
        : (dateFilterMode === 'by_range' && (startDate || endDate) ? `Dates: ${startDate || 'Start'} to ${endDate || 'Present'}` : 'All Timeline');
      doc.text(
        `ETHIOPIAN ROADS ADMINISTRATION • SUBMITTAL & RFI REGISTER • ${project.name || 'ERA PROJECT'} • ${dateSubtitle}`,
        margin + 6,
        pageHeight - margin - 9
      );
      doc.text(
        `Page ${pageCount}`,
        pageWidth - margin - 6,
        pageHeight - margin - 9,
        { align: 'right' }
      );
    };

    let drawTableHeader = () => {};

    const checkSpace = (needed: number, isTableContext: boolean = false) => {
      if (curY + needed > pageHeight - margin - 26) {
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

    curY = drawStandardDocumentHeader(doc, {
      margin,
      curY,
      contentWidth,
      documentTitle: "OFFICIAL TECHNICAL SUBMITTAL & RFI CORRESPONDENCE REGISTER",
      subtitle: `PROJECT: ${project.name || 'CURRENT PROJECT'} • ${subtitleScope} ${subtitleDate}`,
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

    // Table Column Widths
    const baseTableCols = [
      { id: 'subNo', title: "SUBMITTAL / RFI #", width: 78 },
      { id: 'category', title: "TYPE / DISCIPLINE", width: 92 },
      { id: 'title', title: "SUBJECT / DESCRIPTION", width: 200 },
      { id: 'submitted', title: "SUBMITTED", width: 62 },
      { id: 'responded', title: "RESPONDED", width: 62 },
      { id: 'sla', title: "SLA (DAYS)", width: 56 },
      { id: 'status', title: "STATUS", width: 95 },
      { id: 'engineer', title: "ASSIGNED RE", width: 110 }
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
        const engLines = doc.splitTextToSize(item.assignedEngineer || '-', tableCols[7].width - 8);

        const maxLines = Math.max(
          subNoLines.length,
          catLines.length,
          titleLines.length,
          subDateLines.length,
          respDateLines.length,
          slaLines.length,
          statusLines.length,
          engLines.length
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

        // Assigned Engineer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        engLines.forEach((line: string, li: number) => {
          doc.text(line, rx + 4, curY + 10 + (li * 8.5));
        });

        curY += rowHeight;
      });
    });

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
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900">
          <button
            onClick={() => setPreviewTab('options')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              previewTab === 'options'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Print Settings & Filters</span>
          </button>
          <button
            onClick={() => setPreviewTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              previewTab === 'preview'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Records Preview ({filteredRecords.length})</span>
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

              {/* Ready Summary Banner */}
              <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Ready for Printing & Official PDF Export</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>{filteredRecords.length} records</strong> match your active filters (
                    {stats.technical} Technical Submittals, {stats.rfis} RFIs, {monthGroups.length} monthly sections).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Records Table</span>
                </button>
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
                <button
                  onClick={() => setPreviewTab('options')}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  ← Back to Settings
                </button>
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

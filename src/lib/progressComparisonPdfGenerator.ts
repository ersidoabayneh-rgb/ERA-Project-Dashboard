import { jsPDF } from 'jspdf';
import { Project, User, ProgressPlan, ProgressPlanHistoryItem } from '../types';
import { 
  drawStandardPdfPageFrame, 
  drawSafeTable, 
  getCredentialSignatures 
} from './pdfReportEngine';

export interface ProgressComparisonPdfOptions {
  project: Project;
  currentUser?: User | null;
  activePlan: ProgressPlan;
  monthLabel: string;
  quarterLabel: string;
  efyLabel: string;
  historyList: ProgressPlanHistoryItem[];
  includeHistoryTable?: boolean;
  includeVerificationStamps?: boolean;
}

export function generateProgressComparisonPdf({
  project,
  currentUser,
  activePlan,
  monthLabel,
  quarterLabel,
  efyLabel,
  historyList,
  includeHistoryTable = true,
  includeVerificationStamps = true
}: ProgressComparisonPdfOptions): jsPDF {
  // Landscape A4 orientation: 841.89 pt width x 595.28 pt height
  const doc = new jsPDF('l', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);
  const totalLength = project.lengthKm || 65.0;

  // Helper for percentage formatting
  const toPct = (km: number) => {
    if (!totalLength || totalLength <= 0) return '0.00%';
    return `${((km / totalLength) * 100).toFixed(2)}%`;
  };

  let pageNumber = 1;
  const totalPagesEstimate = includeHistoryTable && historyList.length > 5 ? 2 : 1;

  // Draw Page 1 Frame & Header
  const frame = drawStandardPdfPageFrame(doc, pageNumber, totalPagesEstimate, {
    margin,
    title: "PROGRESS PLAN & MILEAGE COMPARISONS (KM) AUDIT REPORT",
    subtitle: `PROJECT: ${(project.name || '').toUpperCase()} • TRACKING PERIOD: ${monthLabel.toUpperCase()} (${quarterLabel.toUpperCase()} • ${efyLabel.toUpperCase()})`,
    projectCode: `ERA-PMO-PPR-${project.id.slice(0, 8).toUpperCase()}`,
    footerText: "CONFIDENTIAL • ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL EXECUTIVE MILEAGE AUDIT RECORD"
  });

  let curY = frame.contentY;

  // Project & Milestone Information Summary Ribbon
  const ribbonHeight = 32;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY, contentWidth, ribbonHeight, 4, 4, 'FD');

  const halfWidth = (contentWidth - 24) / 2;

  // Left column: Project Name & Directorate/PMO Scope
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const projNameText = `PROJECT: ${(project.name || '').toUpperCase()}`;
  const wrappedProj = doc.splitTextToSize(projNameText, halfWidth);
  doc.text(wrappedProj[0] || projNameText, margin + 10, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const scopeText = `Total Length: ${totalLength} Km  |  Directorate: ${project.programDirectorate || 'Southern'}  |  PMO: ${project.pmo || 'PMO 1'}`;
  const wrappedScope = doc.splitTextToSize(scopeText, halfWidth);
  doc.text(wrappedScope[0] || scopeText, margin + 10, curY + 23);

  // Right column: Milestone Period & Road Accomplishment
  const rightX = margin + (contentWidth / 2) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const milestoneText = `TARGET MILESTONE: ${monthLabel.toUpperCase()} (${quarterLabel.toUpperCase()})`;
  const wrappedMilestone = doc.splitTextToSize(milestoneText, halfWidth);
  doc.text(wrappedMilestone[0] || milestoneText, rightX, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const perfText = `Fiscal Year: EFY ${efyLabel}  |  Road Completed: ${activePlan.actual.todate.toFixed(2)} Km (${toPct(activePlan.actual.todate)})`;
  const wrappedPerf = doc.splitTextToSize(perfText, halfWidth);
  doc.text(wrappedPerf[0] || perfText, rightX, curY + 23);

  curY += ribbonHeight + 12;

  // Section 1: Active Milestone Mileage Comparisons (Km)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("1. MILEAGE COMPARISONS MATRIX (CONTRACTOR vs ERA vs ACTUAL)", margin, curY);

  curY += 8;

  const fmtVal = (km: number) => `${km.toFixed(2)} Km (${toPct(km)})`;

  const comparisonRows = [
    {
      category: "Contractor Program Schedule",
      month: fmtVal(activePlan.contractor.month),
      quarter: fmtVal(activePlan.contractor.quarter),
      efy: fmtVal(activePlan.contractor.efy),
      todate: fmtVal(activePlan.contractor.todate)
    },
    {
      category: "ERA Approved Milestone Plan",
      month: fmtVal(activePlan.era.month),
      quarter: fmtVal(activePlan.era.quarter),
      efy: fmtVal(activePlan.era.efy),
      todate: fmtVal(activePlan.era.todate)
    },
    {
      category: "Actual Road Completed (Km)",
      month: fmtVal(activePlan.actual.month),
      quarter: fmtVal(activePlan.actual.quarter),
      efy: fmtVal(activePlan.actual.efy),
      todate: fmtVal(activePlan.actual.todate)
    },
    {
      category: "% of Actual Divided by ERA Plan",
      month: activePlan.era.month > 0 ? `${((activePlan.actual.month / activePlan.era.month) * 100).toFixed(2)}%` : '0.00%',
      quarter: activePlan.era.quarter > 0 ? `${((activePlan.actual.quarter / activePlan.era.quarter) * 100).toFixed(2)}%` : '0.00%',
      efy: activePlan.era.efy > 0 ? `${((activePlan.actual.efy / activePlan.era.efy) * 100).toFixed(2)}%` : '0.00%',
      todate: activePlan.era.todate > 0 ? `${((activePlan.actual.todate / activePlan.era.todate) * 100).toFixed(2)}%` : '0.00%'
    }
  ];

  curY = drawSafeTable(doc, {
    startY: curY,
    margin,
    maxWidth: contentWidth,
    headerBgColor: [15, 23, 42],
    headerTextColor: [255, 255, 255],
    headerFontSize: 7.5,
    fontSize: 7,
    rowPadding: 3.5,
    columns: [
      { header: "Progress Plan Category", dataKey: "category", widthPercent: 28, align: "left" },
      { header: `Current Month (${monthLabel})`, dataKey: "month", widthPercent: 18, align: "center" },
      { header: `Current Quarter (${quarterLabel})`, dataKey: "quarter", widthPercent: 18, align: "center" },
      { header: `Current EFY (${efyLabel})`, dataKey: "efy", widthPercent: 18, align: "center" },
      { header: `Cumulative To Date (${totalLength} Km)`, dataKey: "todate", widthPercent: 18, align: "center" }
    ],
    rows: comparisonRows
  });

  curY += 8;

  // Section 2: Complete Historical Milestone Snapshots Record
  if (includeHistoryTable && historyList.length > 0) {
    // If not enough room on page 1, add page 2
    if (curY + (historyList.length * 14) + 120 > pageHeight - 60) {
      doc.addPage();
      pageNumber++;
      drawStandardPdfPageFrame(doc, pageNumber, 2, {
        margin,
        title: "ETHIOPIAN ROADS ADMINISTRATION (ERA) • MILESTONE AUDIT TRAIL",
        subtitle: `PROJECT: ${(project.name || '').toUpperCase()}`,
        footerText: "CONFIDENTIAL • ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL EXECUTIVE MILEAGE AUDIT RECORD"
      });
      curY = margin + 35;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("2. ELAPSED MONTHS & EFY MILESTONE HISTORICAL AUDIT TRAIL", margin, curY);

    curY += 8;

    const historyRows = historyList.map(h => ({
      period: h.monthLabel,
      subperiod: `${h.quarterLabel || 'Q1'} | ${h.efyLabel}`,
      contractor: `${h.contractorMonth.toFixed(2)} Km  (Tot: ${(h.contractorTodate || 0).toFixed(1)} Km)`,
      era: `${h.eraMonth.toFixed(2)} Km  (Tot: ${(h.eraTodate || 0).toFixed(1)} Km)`,
      actual: `${h.actualMonth.toFixed(2)} Km  (Tot: ${(h.actualTodate || 0).toFixed(1)} Km)`,
      progress: h.physicalProgress !== undefined ? `${h.physicalProgress.toFixed(2)}%` : toPct(h.actualTodate || 0)
    }));

    curY = drawSafeTable(doc, {
      startY: curY,
      margin,
      maxWidth: contentWidth,
      headerBgColor: [30, 41, 59],
      headerTextColor: [255, 255, 255],
      headerFontSize: 7.5,
      fontSize: 6.8,
      rowPadding: 3,
      columns: [
        { header: "Milestone Month", dataKey: "period", widthPercent: 16, align: "left" },
        { header: "Quarter & EFY Scope", dataKey: "subperiod", widthPercent: 20, align: "left" },
        { header: "Contractor (Month / Cumul)", dataKey: "contractor", widthPercent: 20, align: "center" },
        { header: "ERA Plan (Month / Cumul)", dataKey: "era", widthPercent: 20, align: "center" },
        { header: "Actual Executed (Month / Cumul)", dataKey: "actual", widthPercent: 16, align: "center" },
        { header: "Physical Progress", dataKey: "progress", widthPercent: 8, align: "center" }
      ],
      rows: historyRows
    });

    curY += 10;
  }

  // Section 3: Necessary Verification & Approval Views on the PDF
  if (includeVerificationStamps) {
    const requiredStampHeight = 90;
    if (curY + requiredStampHeight > pageHeight - 45) {
      doc.addPage();
      pageNumber++;
      drawStandardPdfPageFrame(doc, pageNumber, pageNumber, {
        margin,
        title: "ETHIOPIAN ROADS ADMINISTRATION (ERA) • REVIEW & SIGN-OFF",
        subtitle: `PROJECT: ${(project.name || '').toUpperCase()}`,
        footerText: "CONFIDENTIAL • ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL EXECUTIVE MILEAGE AUDIT RECORD"
      });
      curY = margin + 35;
    }

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(1);
    doc.line(margin, curY, margin + contentWidth, curY);

    curY += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("3. STATUTORY VERIFICATION & EXECUTIVE APPROVAL AUDIT STAMPS", margin, curY);

    curY += 10;

    // 3 Formal Verification & Approval Boxes
    const boxWidth = (contentWidth - 20) / 3;
    const boxHeight = 72;

    const sigs = getCredentialSignatures(currentUser);

    // Box 1: Prepared / Printed By
    const b1X = margin;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.roundedRect(b1X, curY, boxWidth, boxHeight, 4, 4, 'FD');

    // Header strip
    doc.setFillColor(241, 245, 249);
    doc.rect(b1X, curY, boxWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text("1. PREPARED & REGISTERED", b1X + 8, curY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(sigs.printedBy, b1X + 8, curY + 28);
    doc.text(`Official System User: ${currentUser?.username || 'Authorized Stakeholder'}`, b1X + 8, curY + 38);
    doc.text(`Recorded Date: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`, b1X + 8, curY + 48);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(b1X + 8, curY + 62, b1X + boxWidth - 8, curY + 62);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("System Digital Signature & Timestamp", b1X + 8, curY + 69);

    // Box 2: Verified By Verification View & Stamp
    const b2X = b1X + boxWidth + 10;
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(147, 197, 253); // blue-300
    doc.setLineWidth(0.75);
    doc.roundedRect(b2X, curY, boxWidth, boxHeight, 4, 4, 'FD');

    doc.setFillColor(219, 234, 254); // blue-100
    doc.rect(b2X, curY, boxWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text("2. VERIFIED & AUDITED", b2X + 8, curY + 11);

    // Verification Stamp Badge on top right of box
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(b2X + boxWidth - 62, curY + 2.5, 58, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text("✓ VERIFIED AUDIT", b2X + boxWidth - 33, curY + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(sigs.verifiedBy, b2X + 8, curY + 28);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Conforms with site inspection & verified IPC records.", b2X + 8, curY + 38);

    doc.setDrawColor(96, 165, 250);
    doc.setLineWidth(0.5);
    doc.line(b2X + 8, curY + 62, b2X + boxWidth - 8, curY + 62);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Verification Signature & Date", b2X + 8, curY + 69);

    // Box 3: Approved By Approval View & Stamp
    const b3X = b2X + boxWidth + 10;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(134, 239, 172); // emerald-300
    doc.setLineWidth(0.75);
    doc.roundedRect(b3X, curY, boxWidth, boxHeight, 4, 4, 'FD');

    doc.setFillColor(220, 252, 231); // emerald-100
    doc.rect(b3X, curY, boxWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(21, 128, 61); // emerald-700
    doc.text("3. STATUTORY APPROVAL", b3X + 8, curY + 11);

    // Official Approval Stamp Badge on top right of box
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(b3X + boxWidth - 62, curY + 2.5, 58, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text("★ OFFICIALLY APPROVED", b3X + boxWidth - 33, curY + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(sigs.approvedBy, b3X + 8, curY + 28);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Approved for executive portfolio & statutory reporting.", b3X + 8, curY + 38);

    doc.setDrawColor(52, 211, 153);
    doc.setLineWidth(0.5);
    doc.line(b3X + 8, curY + 62, b3X + boxWidth - 8, curY + 62);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Executive Signature & Official Stamp Seal", b3X + 8, curY + 69);
  }

  return doc;
}

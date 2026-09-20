import { jsPDF } from 'jspdf';
import { ERA_LOGO_BASE64 } from '../assets/eraLogoBase64';

export interface PageLayoutConfig {
  margin?: number;
  orientation?: 'portrait' | 'landscape';
  unit?: 'pt' | 'mm';
  showPageBorder?: boolean;
  borderColor?: [number, number, number];
  accentColor?: [number, number, number];
  headerTitle?: string;
  headerSubtitle?: string;
  footerNotice?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number; // explicit width in points (or percentage if normalized)
  widthPercent?: number; // percentage of table width
  align?: 'left' | 'center' | 'right';
}

export interface SafeTableConfig {
  startY: number;
  columns: TableColumn[];
  rows: Record<string, any>[];
  margin?: number;
  maxWidth?: number;
  headerBgColor?: [number, number, number];
  headerTextColor?: [number, number, number];
  alternateRowBg?: boolean;
  rowPadding?: number;
  fontSize?: number;
  headerFontSize?: number;
  onPageBreak?: (newDoc: jsPDF, newY: number) => number;
}

/**
 * Draw the official ERA logo with a clean crisp frame, guaranteeing correct aspect ratio,
 * professional placement, and zero distortion or stretching.
 */
export function drawEraLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 32,
  options: {
    withContainer?: boolean;
    containerBg?: [number, number, number];
    containerBorder?: [number, number, number];
    borderRadius?: number;
  } = {}
): void {
  const {
    withContainer = true,
    containerBg = [255, 255, 255],
    containerBorder = [226, 232, 240], // slate-200
    borderRadius = 4,
  } = options;

  const padding = withContainer ? 2.5 : 0;
  const imgSize = withContainer ? Math.max(16, size - padding * 2) : size;

  if (withContainer) {
    // Draw crisp, elegant white container frame for the logo
    doc.setFillColor(containerBg[0], containerBg[1], containerBg[2]);
    doc.setDrawColor(containerBorder[0], containerBorder[1], containerBorder[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, size, size, borderRadius, borderRadius, 'FD');
  }

  try {
    const imgX = x + (size - imgSize) / 2;
    const imgY = y + (size - imgSize) / 2;
    doc.addImage(ERA_LOGO_BASE64, 'PNG', imgX, imgY, imgSize, imgSize);
  } catch (err) {
    console.warn("Failed to render ERA logo from base64:", err);
    // Fallback vector emblem ensuring text always stays within bounds
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(x, y, size, size, borderRadius, borderRadius, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.floor(size * 0.24)));
    doc.setTextColor(245, 158, 11); // Amber
    doc.text("E.R.A", x + size / 2, y + size * 0.52, { align: 'center' });
    doc.setFontSize(Math.max(4, Math.floor(size * 0.14)));
    doc.setTextColor(255, 255, 255);
    doc.text("ROADS", x + size / 2, y + size * 0.76, { align: 'center' });
  }
}

/**
 * Draws standard page borders and consistent top/bottom decorations according to ERA PDF rules:
 * - Clean, consistent outer margin and subtle inner border line
 * - Everything stays strictly inside page borders
 * - Top header with ERA logo, system title, and metadata
 * - Bottom footer with confidentiality notice and page number
 */
export function drawStandardPdfPageFrame(
  doc: jsPDF,
  pageNo: number,
  totalPages: number,
  options: {
    margin?: number;
    title?: string;
    subtitle?: string;
    projectCode?: string;
    showLogo?: boolean;
    headerHeight?: number;
    footerText?: string;
    accentColor?: [number, number, number];
  } = {}
): { contentX: number; contentY: number; contentWidth: number; contentBottom: number } {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options.margin || 36;
  const contentWidth = pageWidth - margin * 2;
  const accentColor = options.accentColor || [194, 120, 3]; // ERA Gold #c27803
  const headerHeight = options.headerHeight || 54;
  const footerY = pageHeight - 34;

  // 1. Professional Outer Border keeping all content safe and bounded
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(margin - 8, margin - 8, contentWidth + 16, pageHeight - (margin * 2) + 16, 4, 4, 'S');

  // 2. Top Accent Line
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, margin - 4, contentWidth, 2.5, 'F');

  // 3. Top Header with ERA Logo & Aligned Official Date Stamp
  const logoSize = 36;
  if (options.showLogo !== false) {
    drawEraLogo(doc, margin, margin + 4, logoSize, {
      withContainer: true,
      containerBg: [255, 255, 255],
      containerBorder: [226, 232, 240],
      borderRadius: 4
    });
  }

  // Official Date Stamp Container (Top-Right, aligned with ERA Logo)
  const dateStampWidth = 118;
  const dateStampHeight = 36;
  const dateStampX = pageWidth - margin - dateStampWidth;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(dateStampX, margin + 4, dateStampWidth, dateStampHeight, 4, 4, 'DF');

  // Date Stamp details
  const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("OFFICIAL DATE STAMP", dateStampX + 8, margin + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(dateStr, dateStampX + 8, margin + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  const stampFooter = options.projectCode ? `REF: ${options.projectCode}` : `${timeStr} • ERA RECORD`;
  const wrappedStampFooter = doc.splitTextToSize(stampFooter, dateStampWidth - 14);
  doc.text(wrappedStampFooter[0], dateStampX + 8, margin + 33);

  // Center Header: Institution & Standard Document Title (wrapped strictly before Date Stamp)
  const textStartX = options.showLogo !== false ? margin + logoSize + 10 : margin;
  const textMaxWidth = dateStampX - textStartX - 10;

  // Organization Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", textStartX, margin + 16);

  // Standard Document Title
  const titleText = options.title || "CONTRACT MONITORING & EXECUTIVE PERFORMANCE AUDIT";
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175); // blue-800
  const wrappedTitle = doc.splitTextToSize(titleText, textMaxWidth);
  doc.text(wrappedTitle[0] || titleText, textStartX, margin + 27);

  if (options.subtitle || wrappedTitle.length > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    const subText = wrappedTitle.length > 1 ? wrappedTitle[1] : (options.subtitle || '');
    const wrappedSub = doc.splitTextToSize(subText, textMaxWidth);
    doc.text(wrappedSub[0] || subText, textStartX, margin + 37);
  }

  // Header bottom dividing line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(margin, margin + headerHeight, pageWidth - margin, margin + headerHeight);

  // 4. Bottom Footer with page numbers and confidentiality clause
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  const footerNotice = options.footerText || "CONFIDENTIAL • ETHIOPIAN ROADS ADMINISTRATION • FOR AUTHORIZED PROJECT STAKEHOLDERS ONLY";
  const wrappedFooter = doc.splitTextToSize(footerNotice, contentWidth - 80);
  doc.text(wrappedFooter[0] || footerNotice, margin, footerY + 13);

  const pageStr = totalPages > 0 ? `Page ${pageNo} of ${totalPages}` : `Page ${pageNo}`;
  doc.setFont('helvetica', 'bold');
  doc.text(pageStr, pageWidth - margin, footerY + 13, { align: 'right' });

  return {
    contentX: margin,
    contentY: margin + headerHeight + 12,
    contentWidth,
    contentBottom: footerY - 10,
  };
}

export interface StandardDocumentHeaderConfig {
  margin?: number;
  curY: number;
  contentWidth: number;
  documentTitle: string;
  subtitle?: string;
  referenceNo?: string;
  statusBadge?: string;
  dateStamp?: Date | string;
  titleColor?: [number, number, number];
  headerHeight?: number;
}

/**
 * Draws an official standardized PDF header with:
 * - ERA Logo in crisp container on the left
 * - Institutional name and standard document title in the center (multi-line safe wrapping)
 * - Official Date Stamp badge on the right, horizontally and vertically aligned with the logo
 * - Bottom dividing boundary line separating header from tables and content
 * Returns the Y coordinate where the following content should start.
 */
export function drawStandardDocumentHeader(
  doc: jsPDF,
  options: StandardDocumentHeaderConfig
): number {
  const margin = options.margin || 36;
  const curY = options.curY;
  const contentWidth = options.contentWidth;
  const logoSize = 36;
  const dateStampWidth = 118;
  const dateStampHeight = 36;
  const dateStampX = margin + contentWidth - dateStampWidth;

  // 1. Official ERA Logo on the left
  drawEraLogo(doc, margin, curY, logoSize, {
    withContainer: true,
    containerBg: [255, 255, 255],
    containerBorder: [226, 232, 240],
    borderRadius: 4
  });

  // 2. Official Date Stamp Container on the right (aligned with ERA logo)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(dateStampX, curY, dateStampWidth, dateStampHeight, 4, 4, 'DF');

  // Date Stamp details
  const d = options.dateStamp instanceof Date
    ? options.dateStamp
    : (typeof options.dateStamp === 'string' && options.dateStamp ? new Date(options.dateStamp) : new Date());

  const formattedDate = !isNaN(d.getTime())
    ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(options.dateStamp || 'OFFICIAL DATE');

  const formattedTime = !isNaN(d.getTime())
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'OFFICIAL RECORD';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("OFFICIAL DATE STAMP", dateStampX + 8, curY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(formattedDate, dateStampX + 8, curY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  const stampFooter = options.referenceNo
    ? `REF: ${options.referenceNo}`
    : (options.statusBadge || `${formattedTime} • ERA RECORD`);
  const wrappedStampFooter = doc.splitTextToSize(stampFooter, dateStampWidth - 14);
  doc.text(wrappedStampFooter[0], dateStampX + 8, curY + 29);

  // 3. Institution & Standard Document Title in the center (wrapped strictly)
  const textStartX = margin + logoSize + 10;
  const maxTitleWidth = dateStampX - textStartX - 10;

  // Institution title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", textStartX, curY + 11);

  // Standard Document Title
  const titleColor = options.titleColor || [30, 64, 175]; // blue-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
  const wrappedTitle = doc.splitTextToSize(options.documentTitle, maxTitleWidth);
  doc.text(wrappedTitle[0] || options.documentTitle, textStartX, curY + 22);

  // Subtitle / Reference / Project info
  let subY = curY + 32;
  if (wrappedTitle.length > 1) {
    doc.text(wrappedTitle[1], textStartX, curY + 31);
    subY = curY + 40;
  }

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const wrappedSub = doc.splitTextToSize(options.subtitle, maxTitleWidth);
    doc.text(wrappedSub[0] || options.subtitle, textStartX, subY);
  }

  // Header bottom boundary divider line
  const neededHeight = wrappedTitle.length > 1 ? 52 : (options.headerHeight || 44);
  const dividerY = curY + neededHeight;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(margin, dividerY, margin + contentWidth, dividerY);

  return dividerY + 12; // safe next content Y position
}

/**
 * Text renderer that strictly wraps text within bounds, never allowing any words or lines
 * to cross page borders or table borders.
 */
export function drawSafeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    textColor?: [number, number, number];
    lineHeight?: number;
    align?: 'left' | 'center' | 'right';
  } = {}
): number {
  if (!text) return y;

  const {
    fontSize = 8.5,
    fontStyle = 'normal',
    textColor = [30, 41, 59],
    lineHeight = fontSize * 1.35,
    align = 'left',
  } = options;

  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const lines = doc.splitTextToSize(String(text), Math.max(20, maxWidth));
  lines.forEach((line: string, idx: number) => {
    doc.text(line, x, y + (idx * lineHeight), { align });
  });

  return y + (lines.length * lineHeight);
}

/**
 * Formats and draws a table that strictly respects page borders, auto-wraps all cell content,
 * provides readable row heights, column widths, padding, and high-contrast styling.
 */
export function drawSafeTable(
  doc: jsPDF,
  config: SafeTableConfig
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = config.margin || 36;
  const contentWidth = config.maxWidth || (pageWidth - margin * 2);
  let curY = config.startY;

  const headerBg = config.headerBgColor || [15, 23, 42]; // slate-900
  const headerText = config.headerTextColor || [255, 255, 255];
  const padding = config.rowPadding || 4;
  const fontSize = config.fontSize || 7.5;
  const headerFontSize = config.headerFontSize || 8;
  const footerSafeLimit = pageHeight - margin - 25;

  // Calculate column widths
  let colsWithWidth = config.columns.map(col => {
    let w = col.width || 0;
    if (!w && col.widthPercent) {
      w = (contentWidth * col.widthPercent) / 100;
    }
    return { ...col, width: w };
  });

  const totalAssignedWidth = colsWithWidth.reduce((sum, c) => sum + (c.width || 0), 0);
  const unassignedCols = colsWithWidth.filter(c => !c.width || c.width <= 0);

  if (unassignedCols.length > 0) {
    const remainingWidth = Math.max(0, contentWidth - totalAssignedWidth);
    const perCol = remainingWidth / unassignedCols.length;
    colsWithWidth = colsWithWidth.map(c => {
      if (!c.width || c.width <= 0) return { ...c, width: perCol };
      return c;
    });
  } else if (totalAssignedWidth > contentWidth) {
    // Proportionally shrink to fit inside borders strictly
    const ratio = contentWidth / totalAssignedWidth;
    colsWithWidth = colsWithWidth.map(c => ({ ...c, width: (c.width || 0) * ratio }));
  }

  const drawTableHeader = (y: number): number => {
    const headerHeight = headerFontSize + padding * 2.2;
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(margin, y, contentWidth, headerHeight, 'F');
    doc.setDrawColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.setLineWidth(0.5);

    let colX = margin;
    colsWithWidth.forEach(col => {
      const colW = col.width || 50;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(headerText[0], headerText[1], headerText[2]);

      const cellText = String(col.header || '');
      const maxTextW = colW - (padding * 2);
      const wrapped = doc.splitTextToSize(cellText, Math.max(10, maxTextW));
      
      const align = col.align || 'left';
      const textX = align === 'right' ? colX + colW - padding : (align === 'center' ? colX + colW / 2 : colX + padding);
      doc.text(wrapped[0] || cellText, textX, y + headerFontSize + padding * 0.7, { align });

      // Subtle column separator
      doc.setDrawColor(51, 65, 85); // slate-700
      doc.line(colX + colW, y, colX + colW, y + headerHeight);

      colX += colW;
    });

    return y + headerHeight;
  };

  curY = drawTableHeader(curY);

  // Draw rows
  config.rows.forEach((row, rowIdx) => {
    // 1. Calculate max lines for this row across all columns to set dynamic height
    let maxLines = 1;
    colsWithWidth.forEach(col => {
      const colW = col.width || 50;
      const cellVal = row[col.dataKey] !== undefined && row[col.dataKey] !== null ? String(row[col.dataKey]) : '-';
      const maxTextW = colW - (padding * 2);
      const lines = doc.splitTextToSize(cellVal, Math.max(10, maxTextW));
      if (lines.length > maxLines) maxLines = lines.length;
    });

    const rowHeight = Math.max(14, (maxLines * (fontSize * 1.25)) + (padding * 2));

    // Page break check
    if (curY + rowHeight > footerSafeLimit) {
      doc.addPage();
      curY = margin + 45;
      if (config.onPageBreak) {
        curY = config.onPageBreak(doc, curY);
      }
      curY = drawTableHeader(curY);
    }

    // Row Background
    if (config.alternateRowBg !== false && rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    }

    // Cell content & vertical lines
    let colX = margin;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);

    colsWithWidth.forEach(col => {
      const colW = col.width || 50;
      const cellVal = row[col.dataKey] !== undefined && row[col.dataKey] !== null ? String(row[col.dataKey]) : '-';
      const maxTextW = colW - (padding * 2);
      const lines = doc.splitTextToSize(cellVal, Math.max(10, maxTextW));

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(30, 41, 59); // slate-800

      const align = col.align || 'left';
      const textX = align === 'right' ? colX + colW - padding : (align === 'center' ? colX + colW / 2 : colX + padding);
      
      lines.forEach((line: string, lIdx: number) => {
        doc.text(line, textX, curY + padding + fontSize + (lIdx * fontSize * 1.25), { align });
      });

      // Right border of cell
      doc.line(colX + colW, curY, colX + colW, curY + rowHeight);
      colX += colW;
    });

    // Left border of cell
    doc.line(margin, curY, margin, curY + rowHeight);
    // Bottom border of row
    doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);

    curY += rowHeight;
  });

  return curY + 8;
}

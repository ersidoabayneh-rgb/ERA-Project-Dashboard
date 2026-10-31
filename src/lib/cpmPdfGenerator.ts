import jsPDF from 'jspdf';
import { Project, WorkProgramActivity } from '../types';
import { drawEraLogo, enforceArchivedProjectDataSource } from './pdfReportEngine';

export function generateCpmPdfReport(rawProject: Project, activities: WorkProgramActivity[]) {
  const project = enforceArchivedProjectDataSource(rawProject, () => rawProject);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const margin = 28;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - (margin * 2);

  let currentPage = 1;

  const drawHeader = (title: string) => {
    drawEraLogo(doc, margin + 6, margin + 4, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('ETHIOPIAN ROADS ADMINISTRATION (ERA)', margin + 50, margin + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Project: ${project.name} | Code: ${project.id}`, margin + 50, margin + 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, pageW - margin - 10, margin + 16, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, margin + 32, pageW - margin, margin + 32);

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })} | ERA Integrated Infrastructure System`, margin, pageH - 12);
    doc.text(`Page ${currentPage}`, pageW - margin, pageH - 12, { align: 'right' });
  };

  // PAGE 1: CPM Executive Summary & Logic Matrix
  drawHeader('CRITICAL PATH METHOD (CPM) & WORK PROGRAM');

  let y = margin + 45;

  // Key KPI Cards
  const critCount = activities.filter(a => a.critical).length;
  const maxDur = activities.reduce((max, a) => Math.max(max, a.eft || 0), 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentW, 45, 3, 3, 'DF');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('WORK PROGRAM CPM STATISTICAL HIGHLIGHTS', margin + 12, y + 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Activities: ${activities.length}`, margin + 12, y + 32);
  doc.text(`Critical Activities: ${critCount}`, margin + 180, y + 32);
  doc.text(`Overall Project Duration: ${maxDur} Days`, margin + 360, y + 32);
  doc.text(`Commencement Date: ${project.startDate || 'N/A'}`, margin + 540, y + 32);

  y += 55;

  // Section 1: Critical Path Activities List
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(185, 28, 28);
  doc.text('1. CRITICAL PATH ACTIVITIES (Zero Float Sequence)', margin, y);

  y += 12;

interface ColDef {
  title: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

  // Table headers for Critical Path
  const rawCritCols: ColDef[] = [
    { title: 'ID', width: 35 },
    { title: 'Activity Name', width: 220 },
    { title: 'Dur (Days)', width: 60, align: 'right' },
    { title: 'Predecessors', width: 90 },
    { title: 'Early Start', width: 75, align: 'right' },
    { title: 'Early Finish', width: 75, align: 'right' },
    { title: 'Late Start', width: 75, align: 'right' },
    { title: 'Late Finish', width: 75, align: 'right' },
    { title: 'Float', width: 45, align: 'right' }
  ];
  const critSum = rawCritCols.reduce((sum, c) => sum + c.width, 0);
  const critCols: ColDef[] = rawCritCols.map(c => ({
    ...c,
    width: (c.width / critSum) * contentW
  }));

  const headerH = 16;
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, y, contentW, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let x = margin;
  critCols.forEach(col => {
    if (col.align === 'right') {
      doc.text(col.title, x + col.width - 4, y + 11, { align: 'right' });
    } else {
      doc.text(col.title, x + 4, y + 11);
    }
    x += col.width;
  });

  y += headerH;

  const criticalActs = activities.filter(a => a.critical);
  criticalActs.forEach((act, idx) => {
    const idLines = doc.splitTextToSize(act.id || '-', critCols[0].width - 6);
    const nameLines = doc.splitTextToSize(act.name || '-', critCols[1].width - 6);
    const predLines = doc.splitTextToSize(act.predecessors || '-', critCols[3].width - 6);
    const maxLines = Math.max(idLines.length, nameLines.length, predLines.length, 1);
    const rowH = Math.max(14, maxLines * 8 + 4);

    if (y + rowH > pageH - 40) {
      doc.addPage();
      currentPage++;
      drawHeader('CRITICAL PATH METHOD (CPM) - Continued');
      y = margin + 45;

      // Repeat header
      doc.setFillColor(220, 38, 38);
      doc.rect(margin, y, contentW, headerH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let hX = margin;
      critCols.forEach(col => {
        if (col.align === 'right') {
          doc.text(col.title, hX + col.width - 4, y + 11, { align: 'right' });
        } else {
          doc.text(col.title, hX + 4, y + 11);
        }
        hX += col.width;
      });
      y += headerH;
    }

    doc.setFillColor(idx % 2 === 1 ? 254 : 255, idx % 2 === 1 ? 242 : 255, idx % 2 === 1 ? 242 : 255);
    doc.rect(margin, y, contentW, rowH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);

    let rowX = margin;

    // ID
    idLines.forEach((l: string, li: number) => {
      doc.text(l, rowX + 4, y + 9 + li * 8);
    });
    rowX += critCols[0].width;

    // Name
    nameLines.forEach((l: string, li: number) => {
      doc.text(l, rowX + 4, y + 9 + li * 8);
    });
    rowX += critCols[1].width;

    // Duration
    doc.text(String(act.duration), rowX + critCols[2].width - 4, y + 9, { align: 'right' });
    rowX += critCols[2].width;

    // Predecessors
    predLines.forEach((l: string, li: number) => {
      doc.text(l, rowX + 4, y + 9 + li * 8);
    });
    rowX += critCols[3].width;

    // ES
    doc.text(String(act.est ?? 0), rowX + critCols[4].width - 4, y + 9, { align: 'right' });
    rowX += critCols[4].width;

    // EF
    doc.text(String(act.eft ?? 0), rowX + critCols[5].width - 4, y + 9, { align: 'right' });
    rowX += critCols[5].width;

    // LS
    doc.text(String(act.lst ?? 0), rowX + critCols[6].width - 4, y + 9, { align: 'right' });
    rowX += critCols[6].width;

    // LF
    doc.text(String(act.lft ?? 0), rowX + critCols[7].width - 4, y + 9, { align: 'right' });
    rowX += critCols[7].width;

    // Float
    doc.text('0', rowX + critCols[8].width - 4, y + 9, { align: 'right' });

    // Cell borders
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);
    doc.line(margin, y, margin, y + rowH);
    doc.line(margin + contentW, y, margin + contentW, y + rowH);

    let divX = margin;
    critCols.slice(0, -1).forEach(col => {
      divX += col.width;
      doc.line(divX, y, divX, y + rowH);
    });

    y += rowH;
  });

  // PAGE 2: FULL WORK PROGRAM ACTIVITY SCHEDULE & CPM LOGIC MATRIX
  doc.addPage();
  currentPage++;
  drawHeader('2. COMPREHENSIVE WORK PROGRAM & CPM LOGIC SCHEDULE');

  y = margin + 45;

  const rawFullCols: ColDef[] = [
    { title: 'ID', width: 35 },
    { title: 'Work Activity Description', width: 210 },
    { title: 'Dur', width: 40, align: 'right' },
    { title: 'Pred.', width: 75 },
    { title: 'Dep Type', width: 50, align: 'center' },
    { title: 'Start Date', width: 65, align: 'right' },
    { title: 'Finish Date', width: 65, align: 'right' },
    { title: 'ES', width: 40, align: 'right' },
    { title: 'EF', width: 40, align: 'right' },
    { title: 'LS', width: 40, align: 'right' },
    { title: 'LF', width: 40, align: 'right' },
    { title: 'Float', width: 45, align: 'right' },
    { title: 'Status', width: 55, align: 'center' }
  ];
  const fullSum = rawFullCols.reduce((sum, c) => sum + c.width, 0);
  const fullCols: ColDef[] = rawFullCols.map(c => ({
    ...c,
    width: (c.width / fullSum) * contentW
  }));

  const drawFullTableHeader = (curY: number) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, curY, contentW, headerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let fX = margin;
    fullCols.forEach(col => {
      if (col.align === 'right') {
        doc.text(col.title, fX + col.width - 4, curY + 11, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(col.title, fX + (col.width / 2), curY + 11, { align: 'center' });
      } else {
        doc.text(col.title, fX + 4, curY + 11);
      }
      fX += col.width;
    });
  };

  drawFullTableHeader(y);
  y += headerH;

  activities.forEach((act, idx) => {
    const idLines = doc.splitTextToSize(act.id || '-', fullCols[0].width - 6);
    const nameLines = doc.splitTextToSize(act.name || '-', fullCols[1].width - 6);
    const predLines = doc.splitTextToSize(act.predecessors || '-', fullCols[3].width - 6);
    const maxLines = Math.max(idLines.length, nameLines.length, predLines.length, 1);
    const rowH = Math.max(14, maxLines * 8 + 4);

    if (y + rowH > pageH - 40) {
      doc.addPage();
      currentPage++;
      drawHeader('COMPREHENSIVE WORK PROGRAM - Continued');
      y = margin + 45;
      drawFullTableHeader(y);
      y += headerH;
    }

    if (act.critical) {
      doc.setFillColor(254, 242, 242);
    } else if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y, contentW, rowH, 'F');

    doc.setFont('helvetica', act.critical ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(act.critical ? 185 : 30, act.critical ? 28 : 41, act.critical ? 28 : 59);

    let rX = margin;

    // ID
    idLines.forEach((l: string, li: number) => {
      doc.text(l, rX + 4, y + 9 + li * 8);
    });
    rX += fullCols[0].width;

    // Name
    nameLines.forEach((l: string, li: number) => {
      doc.text(l, rX + 4, y + 9 + li * 8);
    });
    rX += fullCols[1].width;

    // Duration
    doc.text(String(act.duration), rX + fullCols[2].width - 4, y + 9, { align: 'right' });
    rX += fullCols[2].width;

    // Predecessors
    predLines.forEach((l: string, li: number) => {
      doc.text(l, rX + 4, y + 9 + li * 8);
    });
    rX += fullCols[3].width;

    // Dep Type
    doc.text(act.depType || 'FS', rX + fullCols[4].width / 2, y + 9, { align: 'center' });
    rX += fullCols[4].width;

    // Start
    doc.text(act.start || '-', rX + fullCols[5].width - 4, y + 9, { align: 'right' });
    rX += fullCols[5].width;

    // Finish
    doc.text(act.finish || '-', rX + fullCols[6].width - 4, y + 9, { align: 'right' });
    rX += fullCols[6].width;

    // ES
    doc.text(String(act.est ?? 0), rX + fullCols[7].width - 4, y + 9, { align: 'right' });
    rX += fullCols[7].width;

    // EF
    doc.text(String(act.eft ?? 0), rX + fullCols[8].width - 4, y + 9, { align: 'right' });
    rX += fullCols[8].width;

    // LS
    doc.text(String(act.lst ?? 0), rX + fullCols[9].width - 4, y + 9, { align: 'right' });
    rX += fullCols[9].width;

    // LF
    doc.text(String(act.lft ?? 0), rX + fullCols[10].width - 4, y + 9, { align: 'right' });
    rX += fullCols[10].width;

    // Float
    doc.text(String(act.float ?? 0), rX + fullCols[11].width - 4, y + 9, { align: 'right' });
    rX += fullCols[11].width;

    // Status
    doc.text(act.critical ? 'CRITICAL' : 'Normal', rX + fullCols[12].width / 2, y + 9, { align: 'center' });

    // Cell borders
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);
    doc.line(margin, y, margin, y + rowH);
    doc.line(margin + contentW, y, margin + contentW, y + rowH);

    let divX = margin;
    fullCols.slice(0, -1).forEach(col => {
      divX += col.width;
      doc.line(divX, y, divX, y + rowH);
    });

    y += rowH;
  });

  doc.save(`ERA_WorkProgram_CPM_Report_${project.id}.pdf`);
}

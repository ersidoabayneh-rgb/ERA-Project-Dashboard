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

  // Table headers for Critical Path
  const critCols = [
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
    if (y > pageH - 40) {
      doc.addPage();
      currentPage++;
      drawHeader('CRITICAL PATH METHOD (CPM) - Continued');
      y = margin + 45;
    }

    doc.setFillColor(idx % 2 === 1 ? 254 : 255, idx % 2 === 1 ? 242 : 255, idx % 2 === 1 ? 242 : 255);
    doc.rect(margin, y, contentW, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);

    let rowX = margin;

    // ID
    doc.text(act.id, rowX + 4, y + 10);
    rowX += 35;

    // Name
    const nameStr = act.name.length > 40 ? act.name.substring(0, 38) + '..' : act.name;
    doc.text(nameStr, rowX + 4, y + 10);
    rowX += 220;

    // Duration
    doc.text(String(act.duration), rowX + 60 - 4, y + 10, { align: 'right' });
    rowX += 60;

    // Predecessors
    doc.text(act.predecessors || '-', rowX + 4, y + 10);
    rowX += 90;

    // ES
    doc.text(String(act.est ?? 0), rowX + 75 - 4, y + 10, { align: 'right' });
    rowX += 75;

    // EF
    doc.text(String(act.eft ?? 0), rowX + 75 - 4, y + 10, { align: 'right' });
    rowX += 75;

    // LS
    doc.text(String(act.lst ?? 0), rowX + 75 - 4, y + 10, { align: 'right' });
    rowX += 75;

    // LF
    doc.text(String(act.lft ?? 0), rowX + 75 - 4, y + 10, { align: 'right' });
    rowX += 75;

    // Float
    doc.text('0', rowX + 45 - 4, y + 10, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 14, pageW - margin, y + 14);

    y += 14;
  });

  // PAGE 2: FULL WORK PROGRAM ACTIVITY SCHEDULE & CPM LOGIC MATRIX
  doc.addPage();
  currentPage++;
  drawHeader('2. COMPREHENSIVE WORK PROGRAM & CPM LOGIC SCHEDULE');

  y = margin + 45;

  const fullCols = [
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

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentW, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let fX = margin;
  fullCols.forEach(col => {
    if (col.align === 'right') {
      doc.text(col.title, fX + col.width - 4, y + 11, { align: 'right' });
    } else if (col.align === 'center') {
      doc.text(col.title, fX + (col.width / 2), y + 11, { align: 'center' });
    } else {
      doc.text(col.title, fX + 4, y + 11);
    }
    fX += col.width;
  });

  y += headerH;

  activities.forEach((act, idx) => {
    if (y > pageH - 40) {
      doc.addPage();
      currentPage++;
      drawHeader('COMPREHENSIVE WORK PROGRAM - Continued');
      y = margin + 45;

      // Repeat header
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, contentW, headerH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let hX = margin;
      fullCols.forEach(col => {
        if (col.align === 'right') {
          doc.text(col.title, hX + col.width - 4, y + 11, { align: 'right' });
        } else if (col.align === 'center') {
          doc.text(col.title, hX + (col.width / 2), y + 11, { align: 'center' });
        } else {
          doc.text(col.title, hX + 4, y + 11);
        }
        hX += col.width;
      });
      y += headerH;
    }

    if (act.critical) {
      doc.setFillColor(254, 242, 242);
    } else if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y, contentW, 14, 'F');

    doc.setFont('helvetica', act.critical ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(act.critical ? 185 : 30, act.critical ? 28 : 41, act.critical ? 28 : 59);

    let rX = margin;

    // ID
    doc.text(act.id, rX + 4, y + 10);
    rX += 35;

    // Name
    const nameStr = act.name.length > 38 ? act.name.substring(0, 36) + '..' : act.name;
    doc.text(nameStr, rX + 4, y + 10);
    rX += 210;

    // Duration
    doc.text(String(act.duration), rX + 40 - 4, y + 10, { align: 'right' });
    rX += 40;

    // Predecessors
    doc.text(act.predecessors || '-', rX + 4, y + 10);
    rX += 75;

    // Dep Type
    doc.text(act.depType || 'FS', rX + 25, y + 10, { align: 'center' });
    rX += 50;

    // Start
    doc.text(act.start || '-', rX + 65 - 4, y + 10, { align: 'right' });
    rX += 65;

    // Finish
    doc.text(act.finish || '-', rX + 65 - 4, y + 10, { align: 'right' });
    rX += 65;

    // ES
    doc.text(String(act.est ?? 0), rX + 40 - 4, y + 10, { align: 'right' });
    rX += 40;

    // EF
    doc.text(String(act.eft ?? 0), rX + 40 - 4, y + 10, { align: 'right' });
    rX += 40;

    // LS
    doc.text(String(act.lst ?? 0), rX + 40 - 4, y + 10, { align: 'right' });
    rX += 40;

    // LF
    doc.text(String(act.lft ?? 0), rX + 40 - 4, y + 10, { align: 'right' });
    rX += 40;

    // Float
    doc.text(String(act.float ?? 0), rX + 45 - 4, y + 10, { align: 'right' });
    rX += 45;

    // Status
    doc.text(act.critical ? 'CRITICAL' : 'Normal', rX + 27, y + 10, { align: 'center' });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 14, pageW - margin, y + 14);

    y += 14;
  });

  doc.save(`ERA_WorkProgram_CPM_Report_${project.id}.pdf`);
}

import { Project, ConsultantPersonnel } from '../types';

export interface EnrichedStaffCommitment {
  person: ConsultantPersonnel;
  projectId: string;
  projectName: string;
  programDirectorate: string;
  pmo: string;
  consultantFirm: string;
  residentEngineer: string;
  expendedMM: number;
  allocatedMM: number;
  remainingMM: number;
  workloadPct: number;
}

export interface ProjectSupervisionSummary {
  projectId: string;
  projectName: string;
  programDirectorate: string;
  pmo: string;
  consultantFirm: string;
  residentEngineer: string;
  contractRef: string;
  totalStaff: number;
  activeStaff: number;
  keyStaff: number;
  allocatedMM: number;
  expendedMM: number;
  workloadPct: number;
  statusLabel: string;
}

export interface WorkloadReportData {
  allStaff: EnrichedStaffCommitment[];
  projectsSummary: ProjectSupervisionSummary[];
  totalProjects: number;
  totalAssignedPersonnel: number;
  activePersonnel: number;
  keyPersonnel: number;
  totalAllocatedMM: number;
  totalExpendedMM: number;
  overallWorkloadPct: number;
  mobilizationRatePct: number;
}

export function compileWorkloadReportData(projects: Project[]): WorkloadReportData {
  const allStaff: EnrichedStaffCommitment[] = [];
  const projectsSummary: ProjectSupervisionSummary[] = [];

  let totalAllocatedMM = 0;
  let totalExpendedMM = 0;
  let activePersonnel = 0;
  let keyPersonnel = 0;

  projects.forEach((p) => {
    const sc = p.supervisionConsultant;
    const firmName = sc?.firmName || p.consultant || 'Supervision Consultant JV';
    const reName = sc?.residentEngineerName || 'N/A';
    const contractRef = sc?.contractRefNo || 'Standard Contract';
    const personnel = sc?.personnel || [];

    let pAllocatedMM = 0;
    let pExpendedMM = 0;
    let pActiveStaff = 0;
    let pKeyStaff = 0;

    personnel.forEach((person) => {
      const allocated = person.manMonthsAllocated || 0;
      const expended = person.manMonthsInput ?? (person as any).manMonthsExpended ?? 0;
      const remaining = Math.max(0, allocated - expended);
      const workloadPct = allocated > 0 ? (expended / allocated) * 100 : 0;
      const isActive = (person.status || 'Active') === 'Active';
      const isKey = person.category === 'Key Personnel' || (person.category as any) === 'Key';

      if (isActive) {
        activePersonnel++;
        pActiveStaff++;
      }
      if (isKey) {
        keyPersonnel++;
        pKeyStaff++;
      }

      totalAllocatedMM += allocated;
      totalExpendedMM += expended;
      pAllocatedMM += allocated;
      pExpendedMM += expended;

      allStaff.push({
        person,
        projectId: p.id,
        projectName: p.name || 'Untitled Project',
        programDirectorate: p.programDirectorate || 'Southern',
        pmo: p.pmo || 'PMO 1',
        consultantFirm: firmName,
        residentEngineer: reName,
        allocatedMM: allocated,
        expendedMM: expended,
        remainingMM: remaining,
        workloadPct
      });
    });

    const pTotalStaff = personnel.length;
    const pWorkloadPct = pAllocatedMM > 0 ? (pExpendedMM / pAllocatedMM) * 100 : 0;

    let statusLabel = 'Fully Mobilized';
    if (pTotalStaff === 0) {
      statusLabel = 'No Staff Assigned';
    } else if (pActiveStaff === 0) {
      statusLabel = 'Demobilized';
    } else if (pKeyStaff === 0) {
      statusLabel = 'Staffing Gaps';
    } else if (pActiveStaff < pTotalStaff) {
      statusLabel = 'Partial Mobilization';
    }

    projectsSummary.push({
      projectId: p.id,
      projectName: p.name || 'Untitled Project',
      programDirectorate: p.programDirectorate || 'Southern',
      pmo: p.pmo || 'PMO 1',
      consultantFirm: firmName,
      residentEngineer: reName,
      contractRef,
      totalStaff: pTotalStaff,
      activeStaff: pActiveStaff,
      keyStaff: pKeyStaff,
      allocatedMM: pAllocatedMM,
      expendedMM: pExpendedMM,
      workloadPct: pWorkloadPct,
      statusLabel
    });
  });

  const totalAssignedPersonnel = allStaff.length;
  const overallWorkloadPct = totalAllocatedMM > 0 ? (totalExpendedMM / totalAllocatedMM) * 100 : 0;
  const mobilizationRatePct = totalAssignedPersonnel > 0 ? (activePersonnel / totalAssignedPersonnel) * 100 : 0;

  return {
    allStaff,
    projectsSummary,
    totalProjects: projects.length,
    totalAssignedPersonnel,
    activePersonnel,
    keyPersonnel,
    totalAllocatedMM,
    totalExpendedMM,
    overallWorkloadPct,
    mobilizationRatePct
  };
}

export function generateWorkloadReportHtml({
  projects,
  reportTitle = 'SUPERVISION CONSULTANT PERSONNEL WORKLOAD & PROJECT COMMITMENTS REPORT',
  subtitle = 'ALL PROJECTS SUMMARY & STAFF ROSTER MATRIX',
  auditorName = 'ERA AUDITOR'
}: {
  projects: Project[];
  reportTitle?: string;
  subtitle?: string;
  auditorName?: string;
}): string {
  const data = compileWorkloadReportData(projects);
  const nowStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `
    <div class="report-container">
      <header class="report-header">
        <div class="header-top">
          <div>
            <div class="org-title">ETHIOPIAN ROADS ADMINISTRATION (ERA)</div>
            <div class="report-main-title">${reportTitle}</div>
            <div class="report-subtitle">${subtitle} • AUDITOR: ${auditorName.toUpperCase()}</div>
          </div>
          <div class="header-meta">
            <div><strong>Date:</strong> ${nowStr}</div>
            <div><strong>Total Projects:</strong> ${data.totalProjects}</div>
            <div><strong>Total Staff Assigned:</strong> ${data.totalAssignedPersonnel}</div>
          </div>
        </div>
      </header>

      <!-- Executive KPI Cards -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">TOTAL ASSIGNED STAFF</div>
          <div class="kpi-value">${data.totalAssignedPersonnel}</div>
          <div class="kpi-sub">${data.activePersonnel} Active (${data.mobilizationRatePct.toFixed(0)}% Mobilized)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">KEY EXPERTS & REs</div>
          <div class="kpi-value" style="color: #7c3aed;">${data.keyPersonnel}</div>
          <div class="kpi-sub">Key Personnel Assigned</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">TOTAL ALLOCATED MM</div>
          <div class="kpi-value" style="color: #0284c7;">${data.totalAllocatedMM.toFixed(1)} MM</div>
          <div class="kpi-sub">Contracted Budgeted Input</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">TOTAL EXPENDED MM</div>
          <div class="kpi-value" style="color: #16a34a;">${data.totalExpendedMM.toFixed(1)} MM</div>
          <div class="kpi-sub">${(data.totalAllocatedMM - data.totalExpendedMM).toFixed(1)} MM Remaining</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">WORKLOAD UTILIZATION</div>
          <div class="kpi-value" style="color: ${data.overallWorkloadPct > 90 ? '#e11d48' : '#4f46e5'};">${data.overallWorkloadPct.toFixed(1)}%</div>
          <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, data.overallWorkloadPct)}%;"></div></div>
        </div>
      </section>

      <!-- Section 1: All Projects Summary -->
      <section class="report-section">
        <h2 class="section-title">1. ALL PROJECTS SUPERVISION & CONSULTANT SUMMARY (${data.projectsSummary.length} Contracts)</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Project Name & ID</th>
              <th>Directorate / PMO</th>
              <th>Supervision Consultant Firm</th>
              <th>Resident Engineer</th>
              <th style="text-align: center;">Staff (Act/Tot)</th>
              <th style="text-align: center;">Key Staff</th>
              <th style="text-align: right;">Allocated MM</th>
              <th style="text-align: right;">Expended MM</th>
              <th style="text-align: right;">Workload %</th>
              <th style="text-align: center;">Mobilization Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.projectsSummary.map((ps, idx) => `
              <tr>
                <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                <td>
                  <strong>${ps.projectName}</strong>
                  <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">ID: ${ps.projectId}</div>
                </td>
                <td>
                  <span class="badge badge-dir">${ps.programDirectorate}</span>
                  <div style="font-size: 8.5px; color: #64748b;">${ps.pmo}</div>
                </td>
                <td>${ps.consultantFirm}</td>
                <td><strong>${ps.residentEngineer}</strong></td>
                <td style="text-align: center; font-weight: bold;">
                  <span style="color: #16a34a;">${ps.activeStaff}</span> / ${ps.totalStaff}
                </td>
                <td style="text-align: center; font-weight: bold; color: #7c3aed;">${ps.keyStaff}</td>
                <td style="text-align: right; font-family: monospace;">${ps.allocatedMM.toFixed(1)}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: #0284c7;">${ps.expendedMM.toFixed(1)}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">
                  ${ps.workloadPct.toFixed(1)}%
                </td>
                <td style="text-align: center;">
                  <span class="badge ${
                    ps.statusLabel === 'Fully Mobilized' ? 'badge-active' :
                    ps.statusLabel === 'Staffing Gaps' ? 'badge-warn' :
                    ps.statusLabel === 'Demobilized' ? 'badge-demob' : 'badge-neutral'
                  }">${ps.statusLabel}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <!-- Section 2: Master Personnel Roster & Project Commitments Matrix -->
      <section class="report-section" style="margin-top: 24px;">
        <h2 class="section-title">2. MASTER ASSIGNED PERSONNEL & CURRENT PROJECT COMMITMENTS (${data.allStaff.length} Total Assigned Staff)</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Personnel Full Name</th>
              <th>Specific Position / Role</th>
              <th>Category</th>
              <th>Assigned Project & Directorate</th>
              <th>Assignment Date</th>
              <th>Station / Camp</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: right;">Allocated MM</th>
              <th style="text-align: right;">Expended MM</th>
              <th style="text-align: right;">Rem. MM</th>
              <th style="text-align: right;">Workload Util.</th>
              <th>Qualifications / Contacts</th>
            </tr>
          </thead>
          <tbody>
            ${data.allStaff.length === 0 ? `
              <tr>
                <td colspan="13" style="text-align: center; padding: 20px; color: #64748b;">
                  No supervision personnel registered across the selected projects.
                </td>
              </tr>
            ` : data.allStaff.map((item, idx) => {
              const p = item.person;
              const isActive = (p.status || 'Active') === 'Active';
              const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
              return `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td>
                    <strong>${p.name}</strong>
                    ${isKey ? '<span class="badge badge-key" style="margin-left: 4px;">KEY EXPERT</span>' : ''}
                  </td>
                  <td><strong style="color: #4338ca;">${p.position}</strong></td>
                  <td>${p.category || 'Key Personnel'}</td>
                  <td>
                    <strong>${item.projectName}</strong>
                    <div style="font-size: 8.5px; color: #64748b;">${item.programDirectorate} • ${item.pmo}</div>
                  </td>
                  <td style="font-family: monospace;">${p.assignmentDate || 'N/A'}</td>
                  <td>${p.siteStation || 'Site'}</td>
                  <td style="text-align: center;">
                    <span class="badge ${isActive ? 'badge-active' : 'badge-demob'}">${p.status || 'Active'}</span>
                  </td>
                  <td style="text-align: right; font-family: monospace;">${item.allocatedMM.toFixed(1)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #0284c7;">${item.expendedMM.toFixed(1)}</td>
                  <td style="text-align: right; font-family: monospace;">${item.remainingMM.toFixed(1)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold;">
                    ${item.workloadPct.toFixed(1)}%
                  </td>
                  <td style="font-size: 8.5px; color: #475569;">
                    <div>${p.qualification ? `🎓 ${p.qualification}` : ''}</div>
                    <div>${p.contactPhone || p.contactEmail ? `📞 ${p.contactPhone || ''} ${p.contactEmail ? `| ${p.contactEmail}` : ''}` : ''}</div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </section>

      <footer class="report-footer">
        <div>ETHIOPIAN ROADS ADMINISTRATION • SUPERVISION CONSULTANCY AUDIT DIVISION</div>
        <div>CONFIDENTIAL REPORT • GENERATED AUTOMATICALLY BY ERA ROAD CMS</div>
      </footer>
    </div>
  `;
}

export function printWorkloadReportDocument(options: {
  projects: Project[];
  reportTitle?: string;
  subtitle?: string;
  auditorName?: string;
}) {
  const contentHtml = generateWorkloadReportHtml(options);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>ERA - Supervision Personnel Workload & Project Commitments Report</title>
        <style>
          @page {
            size: landscape A4;
            margin: 10mm 8mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 9.5px;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-container {
            max-width: 100%;
          }
          .report-header {
            border-bottom: 2.5px solid #4f46e5;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .org-title {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .report-main-title {
            font-size: 11px;
            font-weight: 800;
            color: #4338ca;
            margin-top: 2px;
          }
          .report-subtitle {
            font-size: 8.5px;
            color: #64748b;
            font-weight: 600;
            margin-top: 1px;
          }
          .header-meta {
            text-align: right;
            font-size: 8.5px;
            color: #475569;
            line-height: 1.3;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 6px;
            padding: 6px 8px;
          }
          .kpi-label {
            font-size: 7.5px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-value {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            font-family: monospace;
            margin-top: 2px;
          }
          .kpi-sub {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 1px;
          }
          .progress-track {
            background: #e2e8f0;
            height: 4px;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 4px;
          }
          .progress-fill {
            background: #4f46e5;
            height: 100%;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 6px 0;
            padding-bottom: 3px;
            border-bottom: 1px solid #e2e8f0;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
            page-break-inside: auto;
          }
          .data-table thead {
            display: table-header-group;
          }
          .data-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .data-table th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
          }
          .data-table td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            vertical-align: middle;
          }
          .data-table tr:nth-child(even) {
            background-color: #fafbfc;
          }
          .badge {
            display: inline-block;
            padding: 1.5px 4px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .badge-active {
            background: #dcfce7;
            color: #15803d;
            border: 0.5px solid #86efac;
          }
          .badge-demob {
            background: #f1f5f9;
            color: #64748b;
            border: 0.5px solid #cbd5e1;
          }
          .badge-key {
            background: #f3e8ff;
            color: #7e22ce;
            border: 0.5px solid #d8b4fe;
          }
          .badge-warn {
            background: #fef3c7;
            color: #b45309;
            border: 0.5px solid #fde68a;
          }
          .badge-dir {
            background: #e0e7ff;
            color: #3730a3;
            font-weight: 700;
          }
          .badge-neutral {
            background: #f8fafc;
            color: #475569;
          }
          .report-footer {
            margin-top: 14px;
            padding-top: 6px;
            border-top: 0.5px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 7.5px;
            color: #94a3b8;
            font-weight: 600;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
}

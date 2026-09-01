import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Download, 
  X, 
  Search, 
  Filter, 
  Users, 
  Briefcase, 
  Award, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { Project, formatAccounting, User, ConsultantPersonnel } from '../types';
import { 
  compileWorkloadReportData, 
  printWorkloadReportDocument, 
  EnrichedStaffCommitment,
  calculateProjectCompletionDate
} from '../lib/workloadReportPrinter';

interface WorkloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentUser?: User | null;
  currentProject?: Project;
  title?: string;
}

export default function WorkloadReportModal({
  isOpen,
  onClose,
  projects,
  currentUser,
  currentProject,
  title = 'Supervision Personnel Workload & Project Commitments Summary'
}: WorkloadReportModalProps) {
  const [activeView, setActiveView] = useState<'allStaff' | 'projectsSummary'>('allStaff');
  const [searchQuery, setSearchQuery] = useState('');
  const [directorateFilter, setDirectorateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [projectScope, setProjectScope] = useState<'all' | 'current'>('all');
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<any | null>(null);

  // Filter projects based on scope selection
  const selectedProjects = useMemo(() => {
    if (projectScope === 'current' && currentProject) {
      return [currentProject];
    }
    return projects;
  }, [projectScope, currentProject, projects]);

  const reportData = useMemo(() => {
    return compileWorkloadReportData(selectedProjects);
  }, [selectedProjects]);

  // Extract unique directorates for filtering
  const directorates = useMemo(() => {
    const set = new Set<string>();
    selectedProjects.forEach(p => {
      if (p.programDirectorate) set.add(p.programDirectorate);
    });
    return Array.from(set);
  }, [selectedProjects]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const list = reportData.allStaff.filter(item => {
      const p = item.person;
      if (directorateFilter !== 'ALL' && item.programDirectorate !== directorateFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && (p.status || 'Active') !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL') {
        const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
        if (categoryFilter === 'KEY' && !isKey) return false;
        if (categoryFilter === 'NON_KEY' && isKey) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPos = p.position.toLowerCase().includes(q);
        const matchesProj = item.projectName.toLowerCase().includes(q);
        const matchesFirm = item.consultantFirm.toLowerCase().includes(q);
        const matchesQual = p.qualification && p.qualification.toLowerCase().includes(q);
        const matchesStation = p.siteStation && p.siteStation.toLowerCase().includes(q);
        return matchesName || matchesPos || matchesProj || matchesFirm || matchesQual || matchesStation;
      }
      return true;
    });

    list.sort((a, b) => {
      const isInactiveA = a.person.status === 'Demobilized' || a.person.status === 'Replaced';
      const isInactiveB = b.person.status === 'Demobilized' || b.person.status === 'Replaced';
      if (!isInactiveA && isInactiveB) return -1;
      if (isInactiveA && !isInactiveB) return 1;

      const isLeaderA = (a.person.position || '').toLowerCase().includes('resident engineer') || (a.person.position || '').toLowerCase().includes('team leader');
      const isLeaderB = (b.person.position || '').toLowerCase().includes('resident engineer') || (b.person.position || '').toLowerCase().includes('team leader');
      if (isLeaderA && !isLeaderB) return -1;
      if (!isLeaderA && isLeaderB) return 1;

      const isKeyA = a.person.category === 'Key Personnel' || (a.person.category as any) === 'Key';
      const isKeyB = b.person.category === 'Key Personnel' || (b.person.category as any) === 'Key';
      if (isKeyA && !isKeyB) return -1;
      if (!isKeyA && isKeyB) return 1;

      if (isInactiveA && isInactiveB) {
        const dateA = a.person.demobilizationDate || a.person.assignmentDate || '';
        const dateB = b.person.demobilizationDate || b.person.assignmentDate || '';
        return dateB.localeCompare(dateA);
      }

      return (a.person.name || '').localeCompare(b.person.name || '');
    });

    return list;
  }, [reportData.allStaff, directorateFilter, statusFilter, categoryFilter, searchQuery]);

  // Filtered projects summary list
  const filteredProjectsSummary = useMemo(() => {
    return reportData.projectsSummary.filter(ps => {
      if (directorateFilter !== 'ALL' && ps.programDirectorate !== directorateFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ps.projectName.toLowerCase().includes(q) ||
               ps.consultantFirm.toLowerCase().includes(q) ||
               ps.residentEngineer.toLowerCase().includes(q) ||
               ps.projectId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reportData.projectsSummary, directorateFilter, searchQuery]);

  const handlePrint = () => {
    printWorkloadReportDocument({
      projects: selectedProjects,
      reportTitle: 'SUPERVISION CONSULTANT PERSONNEL WORKLOAD & PROJECT COMMITMENTS REPORT',
      subtitle: projectScope === 'current' && currentProject 
        ? `PROJECT: ${(currentProject.name || 'CURRENT PROJECT').toUpperCase()}` 
        : 'ALL PROJECTS SUPERVISION DIRECTORY & COMMITMENTS SUMMARY',
      auditorName: currentUser?.username || 'ERA AUDITOR'
    });
  };

  const handleExportCSV = () => {
    const headers = [
      '#',
      'Staff Name',
      'Position',
      'Category',
      'Project ID',
      'Project Name',
      'Program Directorate',
      'PMO',
      'Supervision Consultant Firm',
      'Resident Engineer',
      'Date of Assignment',
      'Personnel Demobilization Date',
      'Project / Contract Target Completion Date',
      'Status',
      'Station',
      'Man-Months Allocated',
      'Man-Months Expended',
      'Remaining Man-Months',
      'Workload %',
      'Qualification',
      'Phone',
      'Email'
    ];

    const rows = filteredStaff.map((item, idx) => [
      idx + 1,
      `"${item.person.name || ''}"`,
      `"${item.person.position || ''}"`,
      `"${item.person.category || 'Key Personnel'}"`,
      `"${item.projectId}"`,
      `"${item.projectName}"`,
      `"${item.programDirectorate}"`,
      `"${item.pmo}"`,
      `"${item.consultantFirm}"`,
      `"${item.residentEngineer}"`,
      `"${item.person.assignmentDate || 'N/A'}"`,
      `"${item.person.demobilizationDate || 'Ongoing'}"`,
      `"${item.projectCompletionDate || item.contractCompletionDate || 'N/A'}"`,
      `"${item.person.status || 'Active'}"`,
      `"${item.person.siteStation || ''}"`,
      item.allocatedMM,
      item.expendedMM,
      item.remainingMM,
      `"${item.workloadPct.toFixed(1)}%"`,
      `"${item.person.qualification || ''}"`,
      `"${item.person.contactPhone || ''}"`,
      `"${item.person.contactEmail || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Supervision_Personnel_Workload_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Printer className="w-3.5 h-3.5" />
                  Printable Workload Report
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ethiopian Roads Administration
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive directory of all assigned supervision personnel, man-month workload input, and project commitments across ERA contracts.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrint}
                id="btn-modal-print-workload"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Workload Report
              </button>
              <button
                onClick={handleExportCSV}
                id="btn-modal-csv-workload"
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                CSV Sheet
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Staff</span>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {reportData.totalAssignedPersonnel}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {reportData.activePersonnel} Active ({reportData.mobilizationRatePct.toFixed(0)}%)
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Experts</span>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {reportData.keyPersonnel}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Resident Engineers & Leads</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated Workload</span>
              <div className="text-lg font-black text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                {reportData.totalAllocatedMM.toFixed(1)} MM
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Total Contracted Budget</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expended Input</span>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                {reportData.totalExpendedMM.toFixed(1)} MM
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                {(reportData.totalAllocatedMM - reportData.totalExpendedMM).toFixed(1)} MM Remaining
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MM Utilization</span>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {reportData.overallWorkloadPct.toFixed(1)}%
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-indigo-600 h-full rounded-full" 
                  style={{ width: `${Math.min(100, reportData.overallWorkloadPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Filters & View Toggle */}
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, position, project, firm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Directorate Filter */}
              <select
                value={directorateFilter}
                onChange={(e) => setDirectorateFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="ALL">All Directorates</option>
                {directorates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Demobilized">Demobilized</option>
                <option value="Replaced">Replaced</option>
                <option value="On Leave">On Leave</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="KEY">Key Experts Only</option>
                <option value="NON_KEY">Non-Key / Sub-Prof.</option>
              </select>
            </div>

            {/* Scope & Tab Toggles */}
            <div className="flex items-center gap-2">
              {currentProject && (
                <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs">
                  <button
                    onClick={() => setProjectScope('all')}
                    className={`px-3 py-1 rounded-lg font-extrabold transition ${
                      projectScope === 'all' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    All Projects ({projects.length})
                  </button>
                  <button
                    onClick={() => setProjectScope('current')}
                    className={`px-3 py-1 rounded-lg font-extrabold transition ${
                      projectScope === 'current' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    This Project Only
                  </button>
                </div>
              )}

              <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setActiveView('allStaff')}
                  className={`px-3 py-1 rounded-lg font-extrabold transition flex items-center gap-1 ${
                    activeView === 'allStaff' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Assigned Personnel ({filteredStaff.length})
                </button>
                <button
                  onClick={() => setActiveView('projectsSummary')}
                  className={`px-3 py-1 rounded-lg font-extrabold transition flex items-center gap-1 ${
                    activeView === 'projectsSummary' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Projects Summary ({filteredProjectsSummary.length})
                </button>
              </div>
            </div>
          </div>

          {/* Table Body Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeView === 'allStaff' ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">Personnel Name & Role</th>
                      <th className="py-3 px-3">Project Commitment</th>
                      <th className="py-3 px-3">Directorate / PMO</th>
                      <th className="py-3 px-3">Assignment & Completion Dates</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Workload Input</th>
                      <th className="py-3 px-3">Qualifications & Station</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No supervision personnel matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((item, idx) => {
                        const p = item.person;
                        const isActive = (p.status || 'Active') === 'Active';
                        const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
                        const completionDate = p.demobilizationDate || item.projectCompletionDate || item.contractCompletionDate || 'Ongoing';

                        return (
                          <tr 
                            key={`${item.projectId}_${p.id || 'pers'}_${p.name || 'n'}_${idx}`} 
                            onClick={() => setSelectedStaffForDetail(item)}
                            className="hover:bg-indigo-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
                            title="Click to view complete personnel history, project commitments, assignment dates, qualifications & roles"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {p.name}
                                </span>
                                {isKey && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    Key Expert
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                                {p.position}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {item.projectName}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Firm: {item.consultantFirm}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {item.programDirectorate}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                {item.pmo}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-[10px]">Assigned:</span>
                                <span className="font-semibold">{p.assignmentDate || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-slate-400 text-[10px]">Completion:</span>
                                {p.demobilizationDate ? (
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                    {p.status === 'Replaced' ? 'Replaced:' : 'Demob:'} {p.demobilizationDate}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-600 dark:text-slate-400">{completionDate}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                {p.status || 'Active'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                                {item.expendedMM.toFixed(1)} / {item.allocatedMM.toFixed(1)} MM
                              </div>
                              <div className="w-20 bg-slate-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden ml-auto mt-1">
                                <div 
                                  className={`h-full ${
                                    item.workloadPct > 100 ? 'bg-rose-500' :
                                    item.workloadPct > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, item.workloadPct)}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                {item.workloadPct.toFixed(0)}% Utilized
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[10.5px]">
                              {p.qualification && (
                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                  🎓 {p.qualification}
                                </div>
                              )}
                              <div className="text-slate-400 text-[10px] mt-0.5">
                                📍 {p.siteStation || 'Site Camp'}
                                {p.contactPhone && ` • 📞 ${p.contactPhone}`}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">Project Details</th>
                      <th className="py-3 px-3">Directorate & PMO</th>
                      <th className="py-3 px-3">Supervision Consultant</th>
                      <th className="py-3 px-3">Resident Engineer</th>
                      <th className="py-3 px-3">Supervision Timeline</th>
                      <th className="py-3 px-3 text-center">Staff Count</th>
                      <th className="py-3 px-3 text-right">Workload Input (MM)</th>
                      <th className="py-3 px-3 text-center">Mobilization Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {filteredProjectsSummary.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No project supervision records found.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectsSummary.map((ps, idx) => (
                        <tr 
                          key={`${ps.projectId}_${idx}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-slate-900 dark:text-white block">
                              {ps.projectName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {ps.projectId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {ps.programDirectorate}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                              {ps.pmo}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {ps.consultantFirm}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ref: {ps.contractRef}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                            {ps.residentEngineer}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10.5px]">
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400 text-[9.5px]">Start:</span> {ps.commencementDate || 'N/A'}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                              <span className="text-slate-400 text-[9.5px]">End:</span> {ps.completionDate || 'N/A'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">{ps.activeStaff}</span> / {ps.totalStaff} Total
                            </div>
                            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold block">
                              {ps.keyStaff} Key Staff
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {ps.expendedMM.toFixed(1)} / {ps.allocatedMM.toFixed(1)} MM
                            </div>
                            <div className="w-20 bg-slate-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden ml-auto mt-1">
                              <div 
                                className="bg-indigo-600 h-full rounded-full" 
                                style={{ width: `${Math.min(100, ps.workloadPct)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {ps.workloadPct.toFixed(0)}% Utilized
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                              ps.statusLabel === 'Fully Mobilized'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : ps.statusLabel === 'Staffing Gaps'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : ps.statusLabel === 'Demobilized'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                : 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-150 dark:border-slate-700'
                            }`}>
                              ● {ps.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <div>
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredStaff.length}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200">{reportData.totalAssignedPersonnel}</strong> assigned personnel across{' '}
              <strong className="text-slate-800 dark:text-slate-200">{selectedProjects.length}</strong> project contracts.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Workload Report
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Personnel Detailed History & Project Commitments Modal */}
      {selectedStaffForDetail && (
        <PersonnelDetailModal
          isOpen={!!selectedStaffForDetail}
          onClose={() => setSelectedStaffForDetail(null)}
          staffItem={selectedStaffForDetail}
          allProjects={projects}
        />
      )}
    </AnimatePresence>
  );
}

function PersonnelDetailModal({
  isOpen,
  onClose,
  staffItem,
  allProjects
}: {
  isOpen: boolean;
  onClose: () => void;
  staffItem: EnrichedStaffCommitment | null;
  allProjects: Project[];
}) {
  if (!isOpen || !staffItem) return null;

  const staffName = staffItem.person.name;
  
  // Aggregate all assignments across all projects for this staff member
  const allAssignments = useMemo(() => {
    const results: {
      projectId: string;
      projectName: string;
      consultantFirm: string;
      programDirectorate: string;
      pmo: string;
      person: ConsultantPersonnel;
      allocatedMM: number;
      expendedMM: number;
      remainingMM: number;
      workloadPct: number;
      commencementDate: string;
      projectCompletionDate: string;
      contractCompletionDate: string;
    }[] = [];

    allProjects.forEach(p => {
      const personnelList = p.supervisionConsultant?.personnel || [];
      const projectCompletion = calculateProjectCompletionDate(p);
      const contractCompletion = p.supervisionConsultant?.revisedCompletionDate || p.supervisionConsultant?.originalCompletionDate || '';
      const commencement = p.supervisionConsultant?.commencementDate || p.startDate || '';

      personnelList.forEach(pers => {
        if (pers.name.trim().toLowerCase() === staffName.trim().toLowerCase()) {
          const allocated = pers.manMonthsAllocated || 0;
          const expended = pers.manMonthsInput ?? (pers as any).manMonthsExpended ?? 0;
          const remaining = Math.max(0, allocated - expended);
          const workloadPct = allocated > 0 ? (expended / allocated) * 100 : 0;
          results.push({
            projectId: p.id,
            projectName: p.name || 'Untitled Project',
            consultantFirm: p.supervisionConsultant?.firmName || p.consultant || 'Supervision Consultant',
            programDirectorate: p.programDirectorate || 'Southern',
            pmo: p.pmo || 'PMO 1',
            person: pers,
            allocatedMM: allocated,
            expendedMM: expended,
            remainingMM: remaining,
            workloadPct,
            commencementDate: commencement,
            projectCompletionDate: projectCompletion,
            contractCompletionDate: contractCompletion
          });
        }
      });
    });

    return results;
  }, [staffName, allProjects]);

  const totalAllocated = allAssignments.reduce((acc, curr) => acc + curr.allocatedMM, 0);
  const totalExpended = allAssignments.reduce((acc, curr) => acc + curr.expendedMM, 0);
  const overallWorkloadPct = totalAllocated > 0 ? (totalExpended / totalAllocated) * 100 : 0;

  const p = staffItem.person;
  const isActive = (p.status || 'Active') === 'Active';
  const isKey = p.category === 'Key Personnel' || (p.category as any) === 'Key';
  const currentCompletionDate = p.demobilizationDate || staffItem.projectCompletionDate || staffItem.contractCompletionDate || 'Ongoing';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg">
                {p.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {p.name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {p.status || 'Active'}
                  </span>
                  {isKey && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      Key Expert
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Position / Role: {p.position}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Bio, Timeline & Workload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Professional Qualification & Station
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {p.qualification || 'Not Specified'}
                </p>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  📍 {p.siteStation || 'Site Camp'}
                </div>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                  {p.contactPhone || 'No Phone'} {p.contactEmail ? `• ${p.contactEmail}` : ''}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Assignment Timeline
                </span>
                <div className="space-y-1 mt-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 text-[10px]">Assigned Date:</span>
                    <span className="font-semibold">{p.assignmentDate || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 text-[10px]">Completion Date:</span>
                    <span className={p.demobilizationDate ? "font-bold text-rose-500" : "font-semibold"}>
                      {p.demobilizationDate ? `${p.status === 'Replaced' ? 'Replaced' : 'Demob'}: ${p.demobilizationDate}` : currentCompletionDate}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Total System Workload
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100">
                    {totalExpended.toFixed(1)} / {totalAllocated.toFixed(1)} MM
                  </span>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {overallWorkloadPct.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-indigo-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, overallWorkloadPct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Assignments & History Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Project Assignments & Commitments History ({allAssignments.length} Projects Assigned)
              </h3>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3">Project Name & Firm</th>
                      <th className="py-3 px-3">Directorate & PMO</th>
                      <th className="py-3 px-3">Specific Role / Position</th>
                      <th className="py-3 px-3">Assignment Date</th>
                      <th className="py-3 px-3">Completion Date</th>
                      <th className="py-3 px-3 text-right">Workload Input (MM)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {allAssignments.map((assign, aIdx) => {
                      const pers = assign.person;
                      const aActive = (pers.status || 'Active') === 'Active';
                      const completion = pers.demobilizationDate || assign.projectCompletionDate || assign.contractCompletionDate || 'Ongoing';

                      return (
                        <tr key={`${assign.projectId}_${assign.person.id || 'pers'}_${aIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900 dark:text-white block">
                              {assign.projectName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Firm: {assign.consultantFirm}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {assign.programDirectorate}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                              {assign.pmo}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                            {pers.position}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-500" />
                              <span>{pers.assignmentDate || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            {pers.demobilizationDate ? (
                              <div className="text-rose-600 dark:text-rose-400 font-bold">
                                {pers.status === 'Replaced' ? 'Replaced:' : 'Demob:'} {pers.demobilizationDate}
                              </div>
                            ) : (
                              <div className="text-slate-600 dark:text-slate-300">
                                {completion}
                              </div>
                            )}
                            {assign.contractCompletionDate && !pers.demobilizationDate && (
                              <div className="text-[9.5px] text-slate-400">
                                Target: {assign.contractCompletionDate}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                              {assign.expendedMM.toFixed(1)} / {assign.allocatedMM.toFixed(1)} MM
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">
                              {assign.workloadPct.toFixed(0)}% Utilized
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              aActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${aActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {pers.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Personnel Dossier generated from ERA Supervision & Contract Management Database
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              Close Dossier
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

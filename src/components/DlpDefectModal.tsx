import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Timer, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  X, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Clock, 
  Trash2, 
  Camera, 
  FileText, 
  Settings, 
  Check, 
  Filter, 
  Search,
  Building,
  Wrench,
  Sparkles,
  Download
} from 'lucide-react';
import { Project, DlpDefect, User, ProjectLifecycleStatus } from '../types';
import { getProjectDlpInfo } from '../lib/dlpUtils';
import { formatDateStr } from '../lib/dateUtils';
import { drawEraLogo, drawSafeTable, drawUniversalSignatureBlock, STRICT_1_INCH_MARGIN } from '../lib/pdfReportEngine';

interface DlpDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUserObj?: User | null;
  onUpdateProject?: (fields: Partial<Project>, sectionName: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
}

export default function DlpDefectModal({
  isOpen,
  onClose,
  project,
  currentUserObj,
  onUpdateProject,
  onUpdateProjectStatus
}: DlpDefectModalProps) {
  // Real-time ticking automated countdown state (updates every second)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const dlpInfo = getProjectDlpInfo(project, now);
  const defectsList: DlpDefect[] = project.dlpDefects || [];

  // Active view tab: 'list' | 'add' | 'settings'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'settings'>('list');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Under Rectification' | 'Rectified'>('All');

  // 'Add Defect' Form State
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [newLocation, setNewLocation] = useState('');
  const [newReporter, setNewReporter] = useState(
    currentUserObj?.fullName || currentUserObj?.username || 'Resident Engineer Inspector'
  );
  const [newTimestamp, setNewTimestamp] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [newRemarks, setNewRemarks] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // DLP Settings Form State inside Modal
  const [editDlpStartDate, setEditDlpStartDate] = useState(project.dlpStartDate || project.completionDate || '');
  const [editDlpDays, setEditDlpDays] = useState(project.dlpDays !== undefined ? project.dlpDays : 365);
  const [markLifecycleCompleted, setMarkLifecycleCompleted] = useState(false);

  // Sync edit states when project changes
  useEffect(() => {
    setEditDlpStartDate(project.dlpStartDate || project.completionDate || '');
    setEditDlpDays(project.dlpDays !== undefined ? project.dlpDays : 365);
    setNewReporter(currentUserObj?.fullName || currentUserObj?.username || 'Resident Engineer Inspector');
  }, [project, currentUserObj]);

  if (!isOpen) return null;

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Defect
  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    setIsSubmitting(true);
    const newDefect: DlpDefect = {
      id: `defect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description: newDesc.trim(),
      severity: newSeverity,
      locationStation: newLocation.trim() || undefined,
      reportedBy: newReporter.trim() || 'RE Inspector',
      reportedAt: newTimestamp ? new Date(newTimestamp).toISOString() : new Date().toISOString(),
      status: 'Open',
      photoUrl: newPhotoUrl || undefined,
      remarks: newRemarks.trim() || undefined
    };

    const updatedDefects = [newDefect, ...defectsList];

    if (onUpdateProject) {
      onUpdateProject(
        { dlpDefects: updatedDefects },
        `Defect Logged for DLP: ${newSeverity} severity at ${newLocation || 'Site'}`
      );
    }

    setIsSubmitting(false);
    setFormSuccess('Defect successfully logged into DLP register!');
    
    // Reset form fields
    setNewDesc('');
    setNewLocation('');
    setNewRemarks('');
    setNewPhotoUrl('');
    setNewSeverity('Medium');

    setTimeout(() => {
      setFormSuccess(null);
      setActiveTab('list');
    }, 1200);
  };

  // Toggle Defect Status (e.g., Open -> Under Rectification -> Rectified -> Open)
  const handleUpdateDefectStatus = (defectId: string, nextStatus: 'Open' | 'Under Rectification' | 'Rectified' | 'Closed') => {
    const updated = defectsList.map(d => {
      if (d.id === defectId) {
        return {
          ...d,
          status: nextStatus,
          rectifiedAt: (nextStatus === 'Rectified' || nextStatus === 'Closed') ? new Date().toISOString() : d.rectifiedAt,
          rectifiedBy: (nextStatus === 'Rectified' || nextStatus === 'Closed') ? (currentUserObj?.username || 'Inspector') : d.rectifiedBy
        };
      }
      return d;
    });

    if (onUpdateProject) {
      onUpdateProject({ dlpDefects: updated }, `DLP Defect status updated to ${nextStatus}`);
    }
  };

  // Delete Defect
  const handleDeleteDefect = (defectId: string) => {
    if (!window.confirm('Are you sure you want to delete this defect record?')) return;
    const updated = defectsList.filter(d => d.id !== defectId);
    if (onUpdateProject) {
      onUpdateProject({ dlpDefects: updated }, 'DLP Defect record removed');
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    if (onUpdateProject) {
      onUpdateProject(
        {
          dlpStartDate: editDlpStartDate.trim() ? editDlpStartDate.trim() : undefined,
          dlpDays: editDlpDays
        },
        'Defect Liability Period (DLP) configuration updated'
      );
    }
    if (markLifecycleCompleted && onUpdateProjectStatus && project.status !== 'Completed' && project.status !== 'Completed and Closed') {
      onUpdateProjectStatus(project.id, 'Completed');
    }
    setActiveTab('list');
  };

  // Filtered defects
  const filteredDefects = defectsList.filter(d => {
    const matchesSearch = 
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.locationStation && d.locationStation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'All' || d.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const openCount = defectsList.filter(d => d.status === 'Open' || d.status === 'Under Rectification').length;
  const rectifiedCount = defectsList.filter(d => d.status === 'Rectified' || d.status === 'Closed').length;

  const pad = (n: number) => String(n).padStart(2, '0');

  // Generate & Download PDF Summary Report of all defects logged for this project
  const handleDownloadDlpReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
    const margin = STRICT_1_INCH_MARGIN; // Strict 1-inch border padding (72 pt)
    const contentWidth = pageWidth - margin * 2; // 451.28 pt

    // 1. Header & ERA Logo
    drawEraLogo(doc, margin + 4, margin + 4, 36, {
      withContainer: true,
      containerBg: [255, 255, 255],
      containerBorder: [16, 185, 129]
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("ETHIOPIAN ROADS ADMINISTRATION", margin + 48, margin + 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("DEFECT LIABILITY PERIOD (DLP) REGISTER & INSPECTION REPORT", margin + 48, margin + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Doc Ref: ERA/DLP/${project.id.slice(-8)}/${Date.now().toString().slice(-6)} • Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, margin + 48, margin + 38);

    // Divider line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.25);
    doc.line(margin + 2, margin + 46, margin + contentWidth - 2, margin + 46);

    let curY = margin + 54;

    // 2. Project Metadata Summary Card Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, curY, contentWidth, 80, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`PROJECT: ${project.name.toUpperCase()}`, margin + 10, curY + 16, { maxWidth: contentWidth - 20 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const halfW = (contentWidth - 20) / 2;
    const col2X = margin + halfW + 10;

    // Line 1: Employer & Contractor
    doc.text(`Employer: Ethiopian Roads Administration (ERA)`, margin + 10, curY + 30);
    doc.text(`Contractor: ${project.contractor || 'N/A'}`, col2X, curY + 30, { maxWidth: halfW });

    // Line 2: Consultant & Start Date
    doc.text(`Supervision Consultant: ${project.consultant || 'N/A'}`, margin + 10, curY + 43, { maxWidth: halfW - 10 });
    doc.text(`DLP Start Date: ${dlpInfo.startDateStr}`, col2X, curY + 43);

    // Line 3: Expiry & Time Remaining
    doc.text(`DLP Expiry Target: ${dlpInfo.endDateStr} (${dlpInfo.dlpDays} Days)`, margin + 10, curY + 56);
    doc.text(`Remaining: ${dlpInfo.daysRemaining} Days (${dlpInfo.elapsedPct.toFixed(1)}% Elapsed)`, col2X, curY + 56);

    // Line 4: Defects Summary
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`Defects Register: ${defectsList.length} Total (${openCount} Open, ${rectifiedCount} Rectified)`, margin + 10, curY + 69);

    curY += 90;

    // 3. Defects Register Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("REGISTERED DEFECTS & SITE DISTRESS LOG", margin, curY);

    curY += 8;

    // Prepare table data
    const tableRows = defectsList.map((d, idx) => ({
      no: String(idx + 1),
      location: d.locationStation || 'Site Section',
      severity: d.severity,
      description: `${d.description}${d.remarks ? '\nAction: ' + d.remarks : ''}`,
      reportedBy: `${d.reportedBy}\n${new Date(d.reportedAt).toLocaleDateString()} ${new Date(d.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: d.status
    }));

    if (tableRows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No defects currently logged for this project's Defect Liability Period.", margin, curY + 20);
      curY += 40;
    } else {
      curY = drawSafeTable(doc, {
        startY: curY,
        margin,
        maxWidth: contentWidth,
        headerBgColor: [15, 23, 42],
        headerTextColor: [255, 255, 255],
        columns: [
          { header: '#', dataKey: 'no', widthPercent: 6, align: 'center' },
          { header: 'Location / Station', dataKey: 'location', widthPercent: 18, align: 'left' },
          { header: 'Severity', dataKey: 'severity', widthPercent: 12, align: 'center' },
          { header: 'Defect Description & Contractor Action Required', dataKey: 'description', widthPercent: 40, align: 'left' },
          { header: 'Reported By & Timestamp', dataKey: 'reportedBy', widthPercent: 14, align: 'left' },
          { header: 'Status', dataKey: 'status', widthPercent: 10, align: 'center' },
        ],
        rows: tableRows,
        fontSize: 6.5,
        headerFontSize: 7,
        rowPadding: 3
      });
    }

    // 4. Executive Signatures
    drawUniversalSignatureBlock(doc, currentUserObj, {
      y: Math.max(curY + 10, pageHeight - margin - 75),
      margin,
      contentWidth
    });

    // 5. Post-processing Loop: Draw Strict 1-inch Page Borders and Footers across ALL pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Strict 1-inch Outer Page Border Frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 4, 4, 'S');

      // Top green accent bar
      doc.setFillColor(16, 185, 129);
      doc.rect(margin + 2, margin + 1, contentWidth - 4, 3, 'F');

      // Bottom footer line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 2, pageHeight - margin - 20, pageWidth - margin - 2, pageHeight - margin - 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Ethiopian Roads Administration PMIS • DLP Defect Summary Report • ${project.name}`,
        margin + 6,
        pageHeight - margin - 8
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin - 6,
        pageHeight - margin - 8,
        { align: 'right' }
      );
    }

    // Save PDF
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`ERA_DLP_Defects_Report_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Top Modal Header Banner */}
          <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white transition-all ${
            dlpInfo.isExpired
              ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-blue-500/30'
              : dlpInfo.isNearExpiry
                ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-500/40'
                : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                dlpInfo.isExpired 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : dlpInfo.isNearExpiry 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    Defect Liability Period (DLP) Dashboard & Defect Log
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1 ${
                    dlpInfo.isExpired
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : dlpInfo.isNearExpiry
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      dlpInfo.isExpired ? 'bg-blue-400' : dlpInfo.isNearExpiry ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                    }`} />
                    {dlpInfo.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mt-0.5 truncate max-w-xl">
                  {project.name} • <span className="text-slate-400">{project.contractor || 'Contractor'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleDownloadDlpReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 border border-emerald-400/30"
                title="Generate and download summary PDF report of all defects logged for this project"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report (PDF)</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Real-time Ticking Countdown Banner */}
          <div className="bg-slate-900 text-white p-3 sm:p-4 border-b border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {dlpInfo.daysRemaining}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Days Remaining</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {pad(dlpInfo.hoursRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Hours</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {pad(dlpInfo.minutesRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Minutes</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className={`text-xl sm:text-2xl font-black font-mono block ${
                  dlpInfo.isExpired ? 'text-blue-400' : dlpInfo.isNearExpiry ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {pad(dlpInfo.secondsRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Seconds (Live)</span>
              </div>
            </div>

            {/* Metrics & Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap justify-between items-center text-[10.5px] font-mono text-slate-300">
                <span>Start: <strong className="text-white">{dlpInfo.startDateStr}</strong></span>
                <span>Expiry Date: <strong className="text-white">{dlpInfo.endDateStr}</strong></span>
                <span>Duration: <strong className="text-white">{dlpInfo.dlpDays} Days</strong></span>
                <span>Elapsed: <strong className="text-white">{dlpInfo.daysElapsed}d ({dlpInfo.elapsedPct.toFixed(1)}%)</strong></span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    dlpInfo.isExpired 
                      ? 'bg-blue-500' 
                      : dlpInfo.isNearExpiry 
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${dlpInfo.elapsedPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Defects Register</span>
                <span className={`ml-1 px-1.5 py-0.2 text-[9.5px] rounded-full font-mono font-extrabold ${
                  openCount > 0 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {defectsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('add')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'add'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Report New Defect</span>
              </button>
            </div>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Configure DLP Settings & Dates"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DLP Settings</span>
            </button>
          </div>

          {/* Modal Main Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* TAB 1: REPORTED DEFECTS LIST */}
            {activeTab === 'list' && (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Logged</span>
                    <span className="font-extrabold text-slate-800 dark:text-white text-sm">{defectsList.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] uppercase font-bold block">Open / Pending</span>
                    <span className="font-extrabold text-rose-700 dark:text-rose-300 text-sm">{openCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold block">Rectified / Closed</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">{rectifiedCount}</span>
                  </div>
                </div>

                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search defects by description, station, or reporter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Severity:
                    </span>
                    {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                          severityFilter === sev
                            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Defects Cards List */}
                {filteredDefects.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {defectsList.length === 0 
                        ? "No defects currently flagged for this Defect Liability Period." 
                        : "No defects match the selected filters."}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Use the "+ Report New Defect" button above to log any road surface distress, structural cracks, or drainage issues discovered during inspections.
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log First Defect Record</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDefects.map((defect) => {
                      const isCritical = defect.severity === 'Critical';
                      const isHigh = defect.severity === 'High';
                      const isMedium = defect.severity === 'Medium';
                      const isClosed = defect.status === 'Rectified' || defect.status === 'Closed';

                      return (
                        <div
                          key={defect.id}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            isClosed
                              ? 'bg-slate-50/80 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 opacity-80'
                              : isCritical
                                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-xs'
                                : isHigh
                                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              {/* Severity Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase border flex items-center gap-1 shrink-0 ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                  : isHigh
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                    : isMedium
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                              }`}>
                                {isCritical && <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />}
                                {defect.severity} Severity
                              </span>

                              {defect.locationStation && (
                                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  {defect.locationStation}
                                </span>
                              )}
                            </div>

                            {/* Status controls */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isClosed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : defect.status === 'Under Rectification'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}>
                                {defect.status}
                              </span>

                              {!isClosed ? (
                                <button
                                  onClick={() => handleUpdateDefectStatus(defect.id, 'Rectified')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Mark defect as rectified by contractor"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Mark Rectified</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateDefectStatus(defect.id, 'Open')}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Re-open defect"
                                >
                                  Re-open
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteDefect(defect.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                                title="Delete defect record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Description & Photo */}
                          <div className="mt-2.5 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1.5">
                              <p className="text-xs font-bold text-slate-850 dark:text-slate-100 leading-relaxed">
                                {defect.description}
                              </p>

                              {defect.remarks && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <strong>Contractor Action / Remarks:</strong> {defect.remarks}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 text-slate-400" />
                                  Logged by: {defect.reportedBy}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Timestamp: {formatDateStr(defect.reportedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Photo thumbnail if uploaded */}
                            {defect.photoUrl && (
                              <div className="shrink-0">
                                <a
                                  href={defect.photoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition"
                                >
                                  <img src={defect.photoUrl} alt="Defect" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded font-mono">
                                    Photo
                                  </span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 'ADD DEFECT' FORM COMPONENT */}
            {activeTab === 'add' && (
              <form onSubmit={handleAddDefect} className="space-y-4 max-w-2xl mx-auto bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white">
                      Report / Flag New Defect
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">DLP Inspection Form</span>
                </div>

                {formSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* 1. Defect Description */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Defect Description <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] font-normal text-slate-400">Specify distress details</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Severe pavement rutting (depth > 25mm) and raveling observed along outer lane wheel paths..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* 2. Severity & Station/Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Severity */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Severity Level <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['Low', 'Medium', 'High', 'Critical'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setNewSeverity(sev)}
                          className={`py-1.5 px-1 rounded-lg text-[10.5px] font-extrabold uppercase border transition cursor-pointer text-center ${
                            newSeverity === sev
                              ? (sev === 'Critical'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : sev === 'High'
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : sev === 'Medium'
                                      ? 'bg-yellow-500 text-slate-950 border-yellow-500 font-black'
                                      : 'bg-blue-600 text-white border-blue-600')
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location / Station */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Location / Chainage / Structure
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g. Km 24+150 or Abay Bridge Pier 2"
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Reporter & Timestamp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Reported By (Inspector Name)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={newReporter}
                        onChange={(e) => setNewReporter(e.target.value)}
                        placeholder="Inspector or RE Name"
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Log Timestamp
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={newTimestamp}
                        onChange={(e) => setNewTimestamp(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Action Required / Remarks */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Required Contractor Action / Remarks
                  </label>
                  <input
                    type="text"
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    placeholder="e.g. Contractor ordered to saw-cut, patch with hot-mix asphalt within 7 calendar days."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* 5. Photo Attachment */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Photo Evidence Attachment (Optional)</span>
                    <span className="text-[10px] text-slate-400">Upload site photo</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>{newPhotoUrl ? 'Change Site Photo' : 'Upload Inspection Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {newPhotoUrl && (
                      <div className="flex items-center gap-2">
                        <img src={newPhotoUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                        <button
                          type="button"
                          onClick={() => setNewPhotoUrl('')}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newDesc.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log & Save Defect</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: DLP SETTINGS */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white">
                    Configure DLP Dates & Duration
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                      ASSIGN DLP START DATE
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editDlpStartDate}
                        onChange={(e) => setEditDlpStartDate(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditDlpStartDate(new Date().toISOString().split('T')[0])}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Today
                      </button>
                      {project.completionDate && (
                        <button
                          type="button"
                          onClick={() => setEditDlpStartDate(project.completionDate || '')}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Use Comp Date
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                      DLP DURATION (CALENDAR DAYS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editDlpDays}
                      onChange={(e) => setEditDlpDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-1.5 pt-1">
                      {[365, 730, 1095, 548].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditDlpDays(d)}
                          className={`text-[10px] font-mono px-2 py-1 rounded-lg border cursor-pointer ${
                            editDlpDays === d
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  {project.status !== 'Completed' && project.status !== 'Completed and Closed' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={markLifecycleCompleted}
                          onChange={(e) => setMarkLifecycleCompleted(e.target.checked)}
                          className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-blue-950 dark:text-blue-200">
                          Transition Project Lifecycle to "Completed"
                        </span>
                      </label>
                      <p className="text-[10px] text-blue-800 dark:text-blue-300 pl-6">
                        Automatically stops elapsed contract duration count at 100% and activates DLP countdown.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Save DLP Settings
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-2xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ethiopian Roads Administration PMIS • Defect Liability Period Register</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDlpReport}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-2xs transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3 h-3" />
                <span>Download Report (PDF)</span>
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg font-bold cursor-pointer transition text-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

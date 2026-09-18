import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  Search,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Download,
  X,
  Check,
  Building2,
  Paperclip,
  Send,
  MessageSquare,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Compass,
  FileCheck2,
  UserCheck
} from 'lucide-react';
import { Project, RfiItem, User } from '../types';

interface RfiLogViewProps {
  project: Project;
  projects?: Project[];
  onSelectProject?: (proj: Project) => void;
  onProjectUpdate?: (updatedFields: Partial<Project>, actionDescription?: string) => void;
  isReadonly?: boolean;
  currentUserObj?: User | null;
}

const RFI_CATEGORIES = [
  'Design Clarification',
  'Drawing Discrepancy',
  'Specification Query',
  'Constructability',
  'Site Condition',
  'Material & Testing',
  'Variation Request'
];

const RFI_DISCIPLINES = [
  'Highways & Alignment',
  'Bridges & Structures',
  'Geotechnical & Soils',
  'Hydraulics & Drainage',
  'Pavement & Materials',
  'Utilities & ROW',
  'General'
];

export default function RfiLogView({
  project,
  projects = [],
  onSelectProject,
  onProjectUpdate,
  isReadonly = false,
  currentUserObj
}: RfiLogViewProps) {
  const rfisList: RfiItem[] = useMemo(() => {
    return project.rfis || [];
  }, [project.rfis]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRfiId, setExpandedRfiId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<RfiItem | null>(null);
  const [answeringRfi, setAnsweringRfi] = useState<RfiItem | null>(null);

  // Form State for New/Edit RFI
  const [formData, setFormData] = useState<Partial<RfiItem>>({
    rfiNo: `RFI-CON-${String((rfisList.length || 0) + 1).padStart(3, '0')}`,
    subject: '',
    category: 'Design Clarification',
    discipline: 'Bridges & Structures',
    contractorRef: '',
    dateSubmitted: new Date().toISOString().split('T')[0],
    drawingRefNo: '',
    stationKm: '',
    priority: 'Medium',
    impactOnCost: false,
    impactOnSchedule: false,
    estimatedDelayDays: 0,
    contractorQuery: '',
    slaDaysAllowed: 7,
    status: 'Submitted'
  });

  // Form State for Answer
  const [answerData, setAnswerData] = useState<{
    consultantResponse: string;
    consultantResponder: string;
    responseDate: string;
    status: RfiItem['status'];
  }>({
    consultantResponse: '',
    consultantResponder: currentUserObj?.fullName || project.consultant || 'Resident Engineer',
    responseDate: new Date().toISOString().split('T')[0],
    status: 'Answered / Clarified'
  });

  // Calculate elapsed days
  const getElapsedDays = (dateSubmittedStr: string, responseDateStr?: string) => {
    const start = new Date(dateSubmittedStr).getTime();
    const end = responseDateStr ? new Date(responseDateStr).getTime() : new Date().getTime();
    const diffTime = end - start;
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Summary Metrics
  const stats = useMemo(() => {
    const total = rfisList.length;
    const pending = rfisList.filter(r => r.status === 'Submitted' || r.status === 'Under Review' || r.status === 'Pending Revision').length;
    const answered = rfisList.filter(r => r.status === 'Answered / Clarified' || r.status === 'Closed').length;
    
    let overdueCount = 0;
    rfisList.forEach(r => {
      const elapsed = getElapsedDays(r.dateSubmitted, r.responseDate);
      if ((r.status === 'Submitted' || r.status === 'Under Review') && elapsed > r.slaDaysAllowed) {
        overdueCount++;
      }
    });

    const costImpactCount = rfisList.filter(r => r.impactOnCost).length;
    const scheduleImpactCount = rfisList.filter(r => r.impactOnSchedule).length;

    return { total, pending, answered, overdueCount, costImpactCount, scheduleImpactCount };
  }, [rfisList]);

  // Filtered RFI List
  const filteredRfis = useMemo(() => {
    return rfisList.filter(rfi => {
      const matchesSearch =
        searchQuery === '' ||
        rfi.rfiNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfi.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rfi.contractorRef && rfi.contractorRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rfi.stationKm && rfi.stationKm.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rfi.drawingRefNo && rfi.drawingRefNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        rfi.contractorQuery.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'pending' && (rfi.status === 'Submitted' || rfi.status === 'Under Review' || rfi.status === 'Pending Revision')) ||
        (selectedStatus === 'answered' && (rfi.status === 'Answered / Clarified' || rfi.status === 'Closed')) ||
        rfi.status === selectedStatus;

      const matchesPriority = selectedPriority === 'all' || rfi.priority === selectedPriority;
      const matchesDiscipline = selectedDiscipline === 'all' || rfi.discipline === selectedDiscipline;
      const matchesCategory = selectedCategory === 'all' || rfi.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesPriority && matchesDiscipline && matchesCategory;
    });
  }, [rfisList, searchQuery, selectedStatus, selectedPriority, selectedDiscipline, selectedCategory]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditingRfi(null);
    setFormData({
      rfiNo: `RFI-CON-${String((rfisList.length || 0) + 1).padStart(3, '0')}`,
      subject: '',
      category: 'Design Clarification',
      discipline: 'Bridges & Structures',
      contractorRef: '',
      dateSubmitted: new Date().toISOString().split('T')[0],
      drawingRefNo: '',
      stationKm: '',
      priority: 'Medium',
      impactOnCost: false,
      impactOnSchedule: false,
      estimatedDelayDays: 0,
      contractorQuery: '',
      slaDaysAllowed: 7,
      status: 'Submitted'
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rfi: RfiItem) => {
    setEditingRfi(rfi);
    setFormData({ ...rfi });
    setIsAddModalOpen(true);
  };

  // Open Answer Modal
  const handleOpenAnswerModal = (rfi: RfiItem) => {
    setAnsweringRfi(rfi);
    setAnswerData({
      consultantResponse: rfi.consultantResponse || '',
      consultantResponder: rfi.consultantResponder || currentUserObj?.fullName || project.consultant || 'Resident Engineer',
      responseDate: rfi.responseDate || new Date().toISOString().split('T')[0],
      status: 'Answered / Clarified'
    });
    setIsAnswerModalOpen(true);
  };

  // Save RFI Submit
  const handleSaveRfi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.contractorQuery) {
      alert('Please fill in the required subject and query fields.');
      return;
    }

    let updatedList: RfiItem[] = [];

    if (editingRfi) {
      updatedList = rfisList.map(r => (r.id === editingRfi.id ? ({ ...r, ...formData } as RfiItem) : r));
    } else {
      const newRfi: RfiItem = {
        id: `rfi_${Date.now()}`,
        rfiNo: formData.rfiNo || `RFI-CON-${String(rfisList.length + 1).padStart(3, '0')}`,
        subject: formData.subject || '',
        category: formData.category || 'Design Clarification',
        discipline: formData.discipline || 'General',
        contractorRef: formData.contractorRef,
        dateSubmitted: formData.dateSubmitted || new Date().toISOString().split('T')[0],
        drawingRefNo: formData.drawingRefNo,
        stationKm: formData.stationKm,
        priority: formData.priority as RfiItem['priority'] || 'Medium',
        impactOnCost: !!formData.impactOnCost,
        impactOnSchedule: !!formData.impactOnSchedule,
        estimatedDelayDays: Number(formData.estimatedDelayDays || 0),
        contractorQuery: formData.contractorQuery || '',
        status: (formData.status as RfiItem['status']) || 'Submitted',
        slaDaysAllowed: Number(formData.slaDaysAllowed || 7)
      };
      updatedList = [newRfi, ...rfisList];
    }

    if (onProjectUpdate) {
      onProjectUpdate(
        { rfis: updatedList },
        editingRfi ? `Updated RFI ${formData.rfiNo}` : `Submitted new RFI ${formData.rfiNo}`
      );
    }

    setIsAddModalOpen(false);
  };

  // Save Answer
  const handleSaveAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringRfi) return;

    const updatedList = rfisList.map(r => {
      if (r.id === answeringRfi.id) {
        return {
          ...r,
          consultantResponse: answerData.consultantResponse,
          consultantResponder: answerData.consultantResponder,
          responseDate: answerData.responseDate,
          status: answerData.status
        };
      }
      return r;
    });

    if (onProjectUpdate) {
      onProjectUpdate(
        { rfis: updatedList },
        `Responded to RFI ${answeringRfi.rfiNo} (${answerData.status})`
      );
    }

    setIsAnswerModalOpen(false);
    setAnsweringRfi(null);
  };

  // Delete RFI
  const handleDeleteRfi = (id: string, rfiNo: string) => {
    if (!confirm(`Are you sure you want to delete RFI ${rfiNo}?`)) return;

    const updatedList = rfisList.filter(r => r.id !== id);
    if (onProjectUpdate) {
      onProjectUpdate({ rfis: updatedList }, `Deleted RFI ${rfiNo}`);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (rfisList.length === 0) {
      alert('No RFI data available to export.');
      return;
    }

    const headers = [
      'RFI No',
      'Subject',
      'Category',
      'Discipline',
      'Contractor Ref',
      'Date Submitted',
      'Drawing Ref',
      'Station KM',
      'Priority',
      'Status',
      'Cost Impact',
      'Schedule Impact',
      'Contractor Query',
      'Consultant Response',
      'Response Date',
      'Responder'
    ];

    const rows = rfisList.map(r => [
      `"${r.rfiNo}"`,
      `"${r.subject.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.discipline}"`,
      `"${r.contractorRef || ''}"`,
      `"${r.dateSubmitted}"`,
      `"${r.drawingRefNo || ''}"`,
      `"${r.stationKm || ''}"`,
      `"${r.priority}"`,
      `"${r.status}"`,
      `"${r.impactOnCost ? 'Yes' : 'No'}"`,
      `"${r.impactOnSchedule ? 'Yes' : 'No'}"`,
      `"${r.contractorQuery.replace(/"/g, '""')}"`,
      `"${(r.consultantResponse || '').replace(/"/g, '""')}"`,
      `"${r.responseDate || ''}"`,
      `"${r.consultantResponder || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_RFI_Log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Banner & Title Section */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-linear-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-md shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Request for Information (RFI) Register
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Design Clarifications & Field Instructions
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tracks formal technical queries, drawing discrepancies, constructability clarifications, and consultant SLA turnaround times between Contractor and Resident Engineer.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Download full RFI log as CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {!isReadonly && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New RFI</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Analytics Metric Cards */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total RFIs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total RFIs</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {project.name}
          </div>
        </div>

        {/* Pending Clarifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Pending RE Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.pending}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-semibold">
            Active Queries
          </div>
        </div>

        {/* Answered / Clarified */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Clarified / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.answered}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-semibold">
            {stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}% Resolution Rate
          </div>
        </div>

        {/* Overdue SLA Responses */}
        <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-2xs ${
          stats.overdueCount > 0 ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Overdue SLA</span>
            <AlertTriangle className={`w-4 h-4 ${stats.overdueCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${stats.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {stats.overdueCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Turnaround Target Breach
          </div>
        </div>

        {/* Cost Impact RFIs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Cost Impact</span>
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.costImpactCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Potential Variations
          </div>
        </div>

        {/* Schedule Impact RFIs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Schedule Impact</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {stats.scheduleImpactCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Critical Path Alerts
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Search & Filter Controls */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search RFI No, subject, station, drawing..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-bold font-mono">
            {[
              { id: 'all', label: 'All RFIs' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'answered', label: 'Clarified / Closed' },
              { id: 'Critical / Work Stop', label: '🚨 Work Stop' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Priority */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Priority Level
            </label>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Priorities</option>
              <option value="Critical / Work Stop">Critical / Work Stop</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Discipline */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Engineering Discipline
            </label>
            <select
              value={selectedDiscipline}
              onChange={e => setSelectedDiscipline(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Disciplines</option>
              {RFI_DISCIPLINES.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Query Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              {RFI_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSelectedDiscipline('all');
                setSelectedCategory('all');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RFI Log Data Table */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredRfis.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <HelpCircle className="w-12 h-12 text-blue-500/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              No Request for Information Logs Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No design clarification requests match your current search criteria or project records.
            </p>
            {!isReadonly && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Submit First RFI</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-mono font-extrabold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">RFI No / Ref</th>
                  <th className="py-3 px-4">Subject & Location</th>
                  <th className="py-3 px-4">Discipline & Category</th>
                  <th className="py-3 px-4">Priority & SLA</th>
                  <th className="py-3 px-4">Impacts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredRfis.map(rfi => {
                  const elapsedDays = getElapsedDays(rfi.dateSubmitted, rfi.responseDate);
                  const isOverdue =
                    (rfi.status === 'Submitted' || rfi.status === 'Under Review') &&
                    elapsedDays > rfi.slaDaysAllowed;
                  const isExpanded = expandedRfiId === rfi.id;

                  return (
                    <React.Fragment key={rfi.id}>
                      <tr
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition cursor-pointer ${
                          isExpanded ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                        onClick={() => setExpandedRfiId(isExpanded ? null : rfi.id)}
                      >
                        {/* RFI No */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{rfi.rfiNo}</span>
                            {rfi.priority === 'Critical / Work Stop' && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            )}
                          </div>
                          {rfi.contractorRef && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {rfi.contractorRef}
                            </div>
                          )}
                        </td>

                        {/* Subject & Station */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {rfi.subject}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                            {rfi.stationKm && (
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                {rfi.stationKm}
                              </span>
                            )}
                            {rfi.drawingRefNo && (
                              <span className="truncate max-w-[140px]">
                                Dwg: {rfi.drawingRefNo}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Discipline & Category */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {rfi.discipline}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {rfi.category}
                          </div>
                        </td>

                        {/* Priority & SLA */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                rfi.priority === 'Critical / Work Stop'
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  : rfi.priority === 'High'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {rfi.priority}
                            </span>
                          </div>
                          <div className="text-[10px] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'}>
                              {elapsedDays}d / {rfi.slaDaysAllowed}d SLA
                            </span>
                          </div>
                        </td>

                        {/* Impacts */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {rfi.impactOnCost && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-extrabold">
                                💰 Cost
                              </span>
                            )}
                            {rfi.impactOnSchedule && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[9px] font-extrabold">
                                ⏳ Schedule
                              </span>
                            )}
                            {!rfi.impactOnCost && !rfi.impactOnSchedule && (
                              <span className="text-[10px] text-slate-400">None</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                              rfi.status === 'Answered / Clarified' || rfi.status === 'Closed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : rfi.status === 'Under Review'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {rfi.status === 'Answered / Clarified' || rfi.status === 'Closed' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{rfi.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReadonly && (
                              <button
                                onClick={() => handleOpenAnswerModal(rfi)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Provide or edit consultant answer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Answer</span>
                              </button>
                            )}

                            {!isReadonly && (
                              <button
                                onClick={() => handleOpenEditModal(rfi)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit RFI details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!isReadonly && (
                              <button
                                onClick={() => handleDeleteRfi(rfi.id, rfi.rfiNo)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Delete RFI record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedRfiId(isExpanded ? null : rfi.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={7} className="p-4 sm:p-6 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Contractor Query Box */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-blue-500" />
                                    <span>Contractor Query & Technical Problem Statement</span>
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Submitted: {rfi.dateSubmitted}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {rfi.contractorQuery}
                                </p>
                                {rfi.attachments && rfi.attachments.length > 0 && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" /> Attachments:
                                    </span>
                                    {rfi.attachments.map((att, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                                      >
                                        {att}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Resident Engineer Response Box */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-emerald-500" />
                                    <span>Supervision Consultant Technical Instruction</span>
                                  </h4>
                                  {rfi.responseDate && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                      Responded: {rfi.responseDate}
                                    </span>
                                  )}
                                </div>
                                {rfi.consultantResponse ? (
                                  <>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                      {rfi.consultantResponse}
                                    </p>
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                                      <span>Engineer: <strong>{rfi.consultantResponder || 'Resident Engineer'}</strong></span>
                                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                        Turnaround: {elapsedDays} days
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="py-6 text-center text-slate-400">
                                    <Clock className="w-6 h-6 text-amber-500/60 mx-auto mb-1" />
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                      Awaiting Resident Engineer / Consultant Formal Response
                                    </p>
                                    {!isReadonly && (
                                      <button
                                        onClick={() => handleOpenAnswerModal(rfi)}
                                        className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Provide Answer Now</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Modal: Submit / Edit RFI */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">
                      {editingRfi ? `Edit RFI: ${editingRfi.rfiNo}` : 'Submit New Request for Information (RFI)'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Formal correspondence from Contractor to Supervision Consultant regarding design clarification.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveRfi} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* RFI No */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      RFI Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.rfiNo || ''}
                      onChange={e => setFormData({ ...formData, rfiNo: e.target.value })}
                      placeholder="e.g. RFI-CON-005"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  {/* Contractor Memo Ref */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contractor Letter / Memo Ref
                    </label>
                    <input
                      type="text"
                      value={formData.contractorRef || ''}
                      onChange={e => setFormData({ ...formData, contractorRef: e.target.value })}
                      placeholder="e.g. CTR/MEMO/2024/180"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Design Clarification Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject || ''}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Abutment A2 Rebar Spacing & Pile Depth Discrepancy"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Query Category
                    </label>
                    <select
                      value={formData.category || 'Design Clarification'}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                    >
                      {RFI_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Discipline */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Engineering Discipline
                    </label>
                    <select
                      value={formData.discipline || 'Bridges & Structures'}
                      onChange={e => setFormData({ ...formData, discipline: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                    >
                      {RFI_DISCIPLINES.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formData.priority || 'Medium'}
                      onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                    >
                      <option value="Critical / Work Stop">🚨 Critical / Work Stop</option>
                      <option value="High">⚠️ High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Station KM */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Station / Location (Km)
                    </label>
                    <input
                      type="text"
                      value={formData.stationKm || ''}
                      onChange={e => setFormData({ ...formData, stationKm: e.target.value })}
                      placeholder="e.g. Km 14+250"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Drawing Reference */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Drawing Ref No.
                    </label>
                    <input
                      type="text"
                      value={formData.drawingRefNo || ''}
                      onChange={e => setFormData({ ...formData, drawingRefNo: e.target.value })}
                      placeholder="e.g. DWG-BR-004 Rev A"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Submission Date */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Submission Date
                    </label>
                    <input
                      type="date"
                      value={formData.dateSubmitted || ''}
                      onChange={e => setFormData({ ...formData, dateSubmitted: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Impacts */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.impactOnCost || false}
                        onChange={e => setFormData({ ...formData, impactOnCost: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        💰 Impact on Cost / Variation
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.impactOnSchedule || false}
                        onChange={e => setFormData({ ...formData, impactOnSchedule: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ⏳ Impact on Schedule / EOT
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold">SLA Allowed:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.slaDaysAllowed || 7}
                      onChange={e => setFormData({ ...formData, slaDaysAllowed: Number(e.target.value) })}
                      className="w-16 p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-bold"
                    />
                    <span className="text-slate-400">days</span>
                  </div>
                </div>

                {/* Contractor Query Description */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contractor Query & Design Clarification Request Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.contractorQuery || ''}
                    onChange={e => setFormData({ ...formData, contractorQuery: e.target.value })}
                    placeholder="Describe the technical query, site condition mismatch, or drawing discrepancy clearly..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingRfi ? 'Save Changes' : 'Submit RFI Log'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* Modal: Answer RFI (Consultant / Resident Engineer Response) */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isAnswerModalOpen && answeringRfi && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">
                      Respond to RFI: {answeringRfi.rfiNo}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Issue formal Engineer technical response and design instruction.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAnswerModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveAnswer} className="p-6 space-y-4 text-xs">
                {/* Query Summary Card */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {answeringRfi.subject}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {answeringRfi.contractorQuery}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Responding Engineer */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resident Engineer / Specialist Name
                    </label>
                    <input
                      type="text"
                      required
                      value={answerData.consultantResponder}
                      onChange={e => setAnswerData({ ...answerData, consultantResponder: e.target.value })}
                      placeholder="e.g. Eng. Yohannes Worku (Resident Engineer)"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  {/* Response Date */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Response Date
                    </label>
                    <input
                      type="date"
                      required
                      value={answerData.responseDate}
                      onChange={e => setAnswerData({ ...answerData, responseDate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Updated RFI Status
                  </label>
                  <select
                    value={answerData.status}
                    onChange={e => setAnswerData({ ...answerData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-extrabold"
                  >
                    <option value="Answered / Clarified">✅ Answered / Clarified</option>
                    <option value="Under Review">⏳ Under Review / Technical Evaluation</option>
                    <option value="Pending Revision">⚠️ Pending Revision from Contractor</option>
                    <option value="Closed">🔒 Closed</option>
                  </select>
                </div>

                {/* Technical Response / Instruction */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Consultant Technical Response & Field Instruction <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={answerData.consultantResponse}
                    onChange={e => setAnswerData({ ...answerData, consultantResponse: e.target.value })}
                    placeholder="Provide formal technical clarification, drawing references, or site instructions..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-sans"
                  />
                </div>

                {/* Save Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAnswerModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Technical Response</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

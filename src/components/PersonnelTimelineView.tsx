import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Users,
  Award,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Info,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Layers,
  Sparkles,
  Download,
  CalendarRange,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ConsultantPersonnel, SupervisionConsultantInfo, formatAccounting } from '../types';

interface PersonnelTimelineViewProps {
  personnel: ConsultantPersonnel[];
  consultant?: SupervisionConsultantInfo;
  projectStartDate?: string;
  projectCompletionDate?: string;
  onSelectPersonnel?: (personnel: ConsultantPersonnel) => void;
  onEditPersonnel?: (personnel: ConsultantPersonnel) => void;
  isReadonly?: boolean;
}

export default function PersonnelTimelineView({
  personnel = [],
  consultant,
  projectStartDate,
  projectCompletionDate,
  onSelectPersonnel,
  onEditPersonnel,
  isReadonly = false
}: PersonnelTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [zoomLevel, setZoomLevel] = useState<'months' | 'quarters' | 'years'>('months');
  const [sortBy, setSortBy] = useState<'assignmentDate' | 'name' | 'position' | 'status'>('assignmentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Today reference date (capped at realistic date)
  const today = useMemo(() => new Date(), []);

  // Compute overall timeline bounds
  const timelineBounds = useMemo(() => {
    let minDate = projectStartDate ? new Date(projectStartDate) : null;
    let maxDate = projectCompletionDate ? new Date(projectCompletionDate) : null;

    if (!minDate || isNaN(minDate.getTime())) {
      minDate = new Date(today.getFullYear() - 2, 0, 1);
    }
    if (!maxDate || isNaN(maxDate.getTime())) {
      maxDate = new Date(today.getFullYear() + 2, 11, 31);
    }

    // Expand bounds with all personnel dates
    personnel.forEach((p) => {
      if (p.assignmentDate) {
        const d = new Date(p.assignmentDate);
        if (!isNaN(d.getTime())) {
          if (d < minDate!) minDate = d;
          if (d > maxDate!) maxDate = d;
        }
      }
      if (p.demobilizationDate) {
        const d = new Date(p.demobilizationDate);
        if (!isNaN(d.getTime())) {
          if (d > maxDate!) maxDate = d;
        }
      }
    });

    // Ensure min is start of that month and max is end of that month
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const totalDays = Math.max(30, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      startDate: start,
      endDate: end,
      totalDays,
      startYear: start.getFullYear(),
      endYear: end.getFullYear()
    };
  }, [personnel, projectStartDate, projectCompletionDate, today]);

  // Generate monthly/quarterly/yearly tick intervals
  const timelineTicks = useMemo(() => {
    const ticks: { label: string; subLabel?: string; date: Date; leftPct: number; widthPct: number; isMajor?: boolean }[] = [];
    const { startDate, endDate, totalDays } = timelineBounds;

    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    if (zoomLevel === 'months') {
      while (current <= endDate) {
        const monthStart = new Date(current);
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        const monthDays = Math.min(
          totalDays,
          (Math.min(nextMonth.getTime(), endDate.getTime()) - monthStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        const leftDays = (monthStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const leftPct = Math.max(0, Math.min(100, (leftDays / totalDays) * 100));
        const widthPct = Math.max(0, (monthDays / totalDays) * 100);

        ticks.push({
          label: monthStart.toLocaleString('default', { month: 'short' }),
          subLabel: String(monthStart.getFullYear()).slice(-2),
          date: monthStart,
          leftPct,
          widthPct,
          isMajor: monthStart.getMonth() === 0
        });

        current.setMonth(current.getMonth() + 1);
      }
    } else if (zoomLevel === 'quarters') {
      while (current <= endDate) {
        const qStart = new Date(current);
        const qNum = Math.floor(qStart.getMonth() / 3) + 1;
        const nextQuarter = new Date(current.getFullYear(), (qNum) * 3, 1);
        const qDays = (Math.min(nextQuarter.getTime(), endDate.getTime()) - qStart.getTime()) / (1000 * 60 * 60 * 24);

        const leftDays = (qStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const leftPct = Math.max(0, Math.min(100, (leftDays / totalDays) * 100));
        const widthPct = Math.max(0, (qDays / totalDays) * 100);

        ticks.push({
          label: `Q${qNum} '${String(qStart.getFullYear()).slice(-2)}`,
          date: qStart,
          leftPct,
          widthPct,
          isMajor: qNum === 1
        });

        current.setMonth(qNum * 3);
      }
    } else {
      // Yearly
      while (current <= endDate) {
        const yStart = new Date(current.getFullYear(), 0, 1);
        const nextYear = new Date(current.getFullYear() + 1, 0, 1);
        const yDays = (Math.min(nextYear.getTime(), endDate.getTime()) - Math.max(yStart.getTime(), startDate.getTime())) / (1000 * 60 * 60 * 24);

        const leftDays = (Math.max(yStart.getTime(), startDate.getTime()) - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const leftPct = Math.max(0, Math.min(100, (leftDays / totalDays) * 100));
        const widthPct = Math.max(0, (yDays / totalDays) * 100);

        ticks.push({
          label: `${current.getFullYear()}`,
          date: yStart,
          leftPct,
          widthPct,
          isMajor: true
        });

        current.setFullYear(current.getFullYear() + 1);
      }
    }

    return ticks;
  }, [timelineBounds, zoomLevel]);

  // Today marker percentage position
  const todayPositionPct = useMemo(() => {
    const { startDate, totalDays } = timelineBounds;
    const diff = today.getTime() - startDate.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    const pct = (days / totalDays) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [timelineBounds, today]);

  // Calculate duration string helper
  const getTenureString = (startDateStr: string, endDateStr?: string) => {
    if (!startDateStr) return 'N/A';
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : today;
    if (isNaN(start.getTime())) return startDateStr;

    const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const months = Math.floor(diffDays / 30.43);
    const years = (months / 12).toFixed(1);

    if (months < 1) return `${diffDays} days`;
    if (months < 12) return `${months} mos (${diffDays}d)`;
    return `${years} yrs (${months} mos)`;
  };

  // Helper to compute individual personnel bar geometry
  const getPersonnelBarGeometry = (p: ConsultantPersonnel) => {
    const { startDate, endDate, totalDays } = timelineBounds;

    const assignDate = p.assignmentDate ? new Date(p.assignmentDate) : startDate;
    const isAssignValid = !isNaN(assignDate.getTime());
    const validAssignDate = isAssignValid ? assignDate : startDate;

    let finishDate = today;
    if (p.status === 'Demobilized' && p.demobilizationDate) {
      const d = new Date(p.demobilizationDate);
      if (!isNaN(d.getTime())) finishDate = d;
    } else if (p.status === 'Active' || p.status === 'On Leave') {
      finishDate = today;
    }

    const startOffsetDays = Math.max(0, (validAssignDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(7, (finishDate.getTime() - validAssignDate.getTime()) / (1000 * 60 * 60 * 24));

    const leftPct = Math.max(0, Math.min(99, (startOffsetDays / totalDays) * 100));
    const widthPct = Math.max(1.5, Math.min(100 - leftPct, (durationDays / totalDays) * 100));

    // Man-months utilization percentage for bar progress stripe
    const allocated = p.manMonthsAllocated || 0;
    const input = p.manMonthsInput || 0;
    const mmPct = allocated > 0 ? Math.min(100, (input / allocated) * 100) : 0;

    return {
      leftPct,
      widthPct,
      durationDays,
      mmPct
    };
  };

  // Filtered and Sorted Personnel
  const filteredPersonnel = useMemo(() => {
    return personnel
      .filter((p) => {
        const matchesSearch =
          !searchQuery.trim() ||
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.qualification?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.siteStation?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'assignmentDate') {
          const dateA = a.assignmentDate ? new Date(a.assignmentDate).getTime() : 0;
          const dateB = b.assignmentDate ? new Date(b.assignmentDate).getTime() : 0;
          comp = dateA - dateB;
        } else if (sortBy === 'name') {
          comp = (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'position') {
          comp = (a.position || '').localeCompare(b.position || '');
        } else if (sortBy === 'status') {
          comp = (a.status || '').localeCompare(b.status || '');
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [personnel, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Grouped personnel by category
  const groupedPersonnel = useMemo(() => {
    if (!groupByCategory) {
      return [{ category: 'All Personnel', items: filteredPersonnel }];
    }

    const categories = ['Key Personnel', 'Non-Key Professional', 'Technical Support', 'Sub-Professional', 'Administrative Support'];
    const groups: { category: string; items: ConsultantPersonnel[] }[] = [];

    categories.forEach((cat) => {
      const items = filteredPersonnel.filter((p) => p.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    });

    // Other categories if any
    const otherItems = filteredPersonnel.filter((p) => !categories.includes(p.category || ''));
    if (otherItems.length > 0) {
      groups.push({ category: 'Other Staff', items: otherItems });
    }

    return groups;
  }, [filteredPersonnel, groupByCategory]);

  // Executive summary numbers
  const stats = useMemo(() => {
    const total = personnel.length;
    const active = personnel.filter((p) => p.status === 'Active').length;
    const demobilized = personnel.filter((p) => p.status === 'Demobilized').length;
    const onLeave = personnel.filter((p) => p.status === 'On Leave').length;
    const keyStaff = personnel.filter((p) => p.category === 'Key Personnel' && p.status === 'Active').length;

    const totalAllocatedMM = personnel.reduce((sum, p) => sum + (p.manMonthsAllocated || 0), 0);
    const totalInputMM = personnel.reduce((sum, p) => sum + (p.manMonthsInput || 0), 0);

    return {
      total,
      active,
      demobilized,
      onLeave,
      keyStaff,
      activeRate: total > 0 ? (active / total) * 100 : 0,
      totalAllocatedMM,
      totalInputMM,
      mmUtilization: totalAllocatedMM > 0 ? (totalInputMM / totalAllocatedMM) * 100 : 0
    };
  }, [personnel]);

  return (
    <div className="space-y-6">
      {/* Executive Staffing Timeline Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</span>
            <Users className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Assigned Mobilizations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 p-3.5 rounded-2xl shadow-xs bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active on Site</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {stats.active} <span className="text-xs text-slate-400 font-normal">({stats.activeRate.toFixed(0)}%)</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">Currently Deployed</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-950/60 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Active Key Experts</span>
            <Award className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
            {stats.keyStaff}
          </div>
          <span className="text-[10px] text-indigo-500 font-medium">Core Technical Team</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demobilized</span>
            <UserX className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-600 dark:text-slate-400 font-mono mt-1">
            {stats.demobilized}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Completed Assignments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/60 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">On Leave / Rot.</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
            {stats.onLeave}
          </div>
          <span className="text-[10px] text-amber-500 font-medium">Temporary Absence</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-950/60 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">MM Expended</span>
            <Activity className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
            {stats.totalInputMM.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ {stats.totalAllocatedMM} MM</span>
          </div>
          <span className="text-[10px] text-blue-500 font-semibold font-mono">{stats.mmUtilization.toFixed(1)}% Utilized</span>
        </div>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search timeline by staff name, specific role, station, qualification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Right: Filtering & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter personnel by category"
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Key Personnel">Key Personnel</option>
            <option value="Non-Key Professional">Non-Key Professional</option>
            <option value="Technical Support">Technical Support</option>
            <option value="Sub-Professional">Sub-Professional</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter personnel by status"
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">🟢 Active Only</option>
            <option value="Demobilized">⚪ Demobilized</option>
            <option value="On Leave">🟡 On Leave</option>
          </select>

          {/* Zoom Level Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setZoomLevel('months')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                zoomLevel === 'months'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setZoomLevel('quarters')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                zoomLevel === 'quarters'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setZoomLevel('years')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                zoomLevel === 'years'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Grouping Toggle */}
          <button
            onClick={() => setGroupByCategory(!groupByCategory)}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition border ${
              groupByCategory
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {groupByCategory ? 'Grouped by Role' : 'Flat List'}
          </button>
        </div>
      </div>

      {/* TIMELINE VISUALIZATION CANVAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Timeline Header with Legend */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs md:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Supervision Personnel Deployment Timeline & Active Tenure
            </h2>
          </div>

          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-900" />
              <span>Active on Site</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>Demobilized / Replaced</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span>On Leave</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-3 h-0.5 bg-rose-500 dashed border-t-2 border-rose-500" />
              <span>Current Date Line</span>
            </div>
          </div>
        </div>

        {/* The Scrollable Gantt/Timeline Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Timeline Column Headers Row */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 sticky top-0 z-20">
              {/* Left Column: Personnel Identity (Fixed 320px) */}
              <div className="w-80 flex-shrink-0 p-3 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span>Assigned Staff & Specific Position</span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">({filteredPersonnel.length} shown)</span>
              </div>

              {/* Right Column: Time Scale Axis */}
              <div className="flex-1 relative h-10 flex items-center">
                {timelineTicks.map((tick, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 flex flex-col justify-center px-1 text-[10px] font-mono border-l transition ${
                      tick.isMajor
                        ? 'border-slate-300 dark:border-slate-600 font-bold text-slate-800 dark:text-slate-200 bg-slate-200/40 dark:bg-slate-700/30'
                        : 'border-slate-200/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
                    }`}
                    style={{ left: `${tick.leftPct}%`, width: `${tick.widthPct}%` }}
                  >
                    <span className="truncate">{tick.label}</span>
                    {tick.subLabel && zoomLevel === 'months' && (
                      <span className="text-[8.5px] text-slate-400 dark:text-slate-500">{tick.subLabel}</span>
                    )}
                  </div>
                ))}

                {/* Today Marker on Header */}
                <div
                  className="absolute top-0 bottom-0 z-30 flex flex-col items-center pointer-events-none"
                  style={{ left: `${todayPositionPct}%` }}
                >
                  <div className="w-0.5 h-full bg-rose-500" />
                  <span className="absolute -top-1 px-1 py-0.2 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-tighter shadow-xs">
                    Today
                  </span>
                </div>
              </div>
            </div>

            {/* Personnel List Body */}
            {filteredPersonnel.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold">No supervision personnel match the current criteria.</p>
                <p className="text-xs text-slate-400">Try adjusting your search keywords or filter status.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {groupedPersonnel.map((group, groupIdx) => (
                  <div key={groupIdx} className="relative">
                    {/* Category Group Header if groupByCategory */}
                    {groupByCategory && (
                      <div className="bg-slate-50/90 dark:bg-slate-800/40 px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 border-y border-slate-200/60 dark:border-slate-800 flex items-center justify-between sticky left-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="uppercase tracking-wider">{group.category}</span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                          {group.items.length} Experts
                        </span>
                      </div>
                    )}

                    {/* Rows for this group */}
                    {group.items.map((person, personIdx) => {
                      const geom = getPersonnelBarGeometry(person);
                      const tenure = getTenureString(person.assignmentDate, person.demobilizationDate);
                      const isActive = person.status === 'Active';
                      const isDemob = person.status === 'Demobilized';
                      const isOnLeave = person.status === 'On Leave';

                      return (
                        <div
                          key={person.id ? `${person.id}_${groupIdx}_${personIdx}` : `pers_${groupIdx}_${personIdx}`}
                          className="flex items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                        >
                          {/* Left Details Card (320px) */}
                          <div className="w-80 flex-shrink-0 p-3.5 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isActive ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-950" />
                                ) : isDemob ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 flex-shrink-0" />
                                ) : (
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                                )}
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {person.name || 'Unnamed Expert'}
                                </span>
                              </div>

                              {/* Status Tag */}
                              <span
                                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight flex-shrink-0 ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : isDemob
                                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {person.status}
                              </span>
                            </div>

                            {/* Position & Role */}
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                              <Briefcase className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{person.position || 'Specialist'}</span>
                            </div>

                            {/* Assignment Date & Tenure */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Assigned: {person.assignmentDate || 'N/A'}
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{tenure}</span>
                            </div>
                          </div>

                          {/* Right Timeline Gantt Track */}
                          <div className="flex-1 relative h-16 flex items-center px-1 overflow-hidden">
                            {/* Grid vertical lines */}
                            {timelineTicks.map((tick, tIdx) => (
                              <div
                                key={tIdx}
                                className={`absolute top-0 bottom-0 border-l ${
                                  tick.isMajor
                                    ? 'border-slate-200 dark:border-slate-700'
                                    : 'border-slate-100 dark:border-slate-800/40'
                                }`}
                                style={{ left: `${tick.leftPct}%` }}
                              />
                            ))}

                            {/* Today Vertical Line */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-rose-500/60 z-10 pointer-events-none"
                              style={{ left: `${todayPositionPct}%` }}
                            />

                            {/* The Personnel Timeline Bar */}
                            <motion.div
                              initial={{ opacity: 0, scaleX: 0.8 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              transition={{ duration: 0.3 }}
                              onMouseEnter={() => setActiveTooltipId(person.id)}
                              onMouseLeave={() => setActiveTooltipId(null)}
                              onClick={() => onSelectPersonnel && onSelectPersonnel(person)}
                              className={`absolute h-8 rounded-xl cursor-pointer transition-all duration-200 z-10 flex items-center px-2.5 justify-between group/bar shadow-sm ${
                                isActive
                                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-emerald-500/20 hover:ring-2 hover:ring-emerald-400'
                                  : isDemob
                                  ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white hover:ring-2 hover:ring-slate-300 dark:from-slate-700 dark:to-slate-600'
                                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 hover:ring-2 hover:ring-amber-300'
                              }`}
                              style={{
                                left: `${geom.leftPct}%`,
                                width: `${geom.widthPct}%`,
                                minWidth: '42px'
                              }}
                            >
                              {/* Left Marker & Role Text */}
                              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                <span className="text-[10px] font-black truncate drop-shadow-xs">
                                  {person.position}
                                </span>
                              </div>

                              {/* Right duration/MM badge inside bar */}
                              <div className="hidden sm:flex items-center gap-1 text-[9px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                <span>{person.manMonthsInput || 0} MM</span>
                              </div>

                              {/* Interactive Hover Tooltip */}
                              {activeTooltipId === person.id && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl z-50 text-xs space-y-2 pointer-events-none border border-slate-700">
                                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                                    <span className="font-bold text-emerald-400">{person.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                      {person.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] space-y-1 text-slate-300">
                                    <p className="text-white font-medium">{person.position}</p>
                                    <p className="text-[10px] text-slate-400">Category: {person.category}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      Assignment Date: <span className="text-emerald-300 font-bold">{person.assignmentDate || 'N/A'}</span>
                                    </p>
                                    {person.demobilizationDate && (
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        Demobilization: <span className="text-slate-200">{person.demobilizationDate}</span>
                                      </p>
                                    )}
                                    <p className="text-[10px] text-slate-400">
                                      Tenure: <span className="text-white font-semibold">{tenure}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      Man-Months: {person.manMonthsInput || 0} expended / {person.manMonthsAllocated || 0} allocated
                                    </p>
                                    {person.siteStation && (
                                      <p className="text-[10px] text-slate-400">
                                        Station: <span className="text-indigo-300">{person.siteStation}</span>
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800">
                                    Click bar to view full personnel profile
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Notes & Summary */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Timeline bars depict continuous mobilization period from official date of assignment to current date or approved demobilization.
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {stats.active} of {stats.total} staff currently deployed
          </span>
        </div>
      </div>
    </div>
  );
}

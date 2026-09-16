import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitMerge, 
  Layers, 
  TrendingUp, 
  Clock, 
  Activity, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  HelpCircle,
  Network,
  FileSpreadsheet,
  Table,
  Download,
  CheckCircle2,
  CalendarRange,
  Eye,
  Filter
} from 'lucide-react';
import { Project, WorkProgramActivity } from '../types';
import { parseAnyDate, formatDateString } from '../lib/mppParser';

interface CPMChartProps {
  project: Project;
  activities: WorkProgramActivity[];
  activeFileName?: string;
  isHighlighted?: boolean;
}

export default function CPMChart({ project, activities, activeFileName, isHighlighted }: CPMChartProps) {
  const [activeTab, setActiveTab] = useState<'gantt' | 'network' | 'matrix'>('gantt');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [showDatesOnBars, setShowDatesOnBars] = useState(true);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);

  // Calculate project statistics with 100% exact date retention
  const { totalDuration, criticalActivities, firstStartDate, projectEndDateStr, projectStartDateStr } = useMemo(() => {
    let maxEft = 0;
    const criticalList: WorkProgramActivity[] = [];
    
    activities.forEach(a => {
      if ((a.eft || 0) > maxEft) maxEft = a.eft || 0;
      if (a.critical) criticalList.push(a);
    });

    // Detect earliest date among activities
    let startDate: Date | null = null;
    if (project.startDate) {
      const d = parseAnyDate(project.startDate);
      if (d && !isNaN(d.getTime())) startDate = d;
    }
    if (!startDate) {
      for (const a of activities) {
        if (a.start) {
          const d = parseAnyDate(a.start);
          if (d && !isNaN(d.getTime())) {
            if (!startDate || d.getTime() < startDate.getTime()) {
              startDate = d;
            }
          }
        }
      }
    }
    const effectiveStart = startDate || new Date();

    const effectiveEnd = new Date(effectiveStart);
    effectiveEnd.setDate(effectiveEnd.getDate() + maxEft);

    return {
      totalDuration: maxEft,
      criticalActivities: criticalList,
      firstStartDate: effectiveStart,
      projectStartDateStr: effectiveStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      projectEndDateStr: effectiveEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [activities, project.startDate]);

  // Handle Gantt Bar scale ticks
  const timelineTicks = useMemo(() => {
    if (totalDuration <= 0) return [];
    
    let interval = 5;
    if (totalDuration > 150) interval = 30;
    else if (totalDuration > 80) interval = 15;
    else if (totalDuration > 40) interval = 10;
    else if (totalDuration < 15) interval = 2;

    const ticks = [];
    for (let i = 0; i <= totalDuration + 5; i += interval) {
      ticks.push(i);
    }
    return ticks;
  }, [totalDuration]);

  // Compute topological layers/levels for Network Diagram (AON Layout)
  const networkLevels = useMemo(() => {
    if (activities.length === 0) return [];

    const levelsMap: { [key: string]: number } = {};
    const visited = new Set<string>();

    const getLevel = (actId: string): number => {
      if (levelsMap[actId] !== undefined) return levelsMap[actId];
      if (visited.has(actId)) return 0;
      visited.add(actId);

      const act = activities.find(x => x.id === actId);
      if (!act) return 0;

      const preds = act.predecessors 
        ? act.predecessors.split(',').map(s => s.trim()).filter(Boolean) 
        : [];

      if (preds.length === 0) {
        levelsMap[actId] = 0;
        visited.delete(actId);
        return 0;
      }

      let maxP = 0;
      preds.forEach(p => {
        maxP = Math.max(maxP, getLevel(p) + 1);
      });

      levelsMap[actId] = maxP;
      visited.delete(actId);
      return maxP;
    };

    activities.forEach(a => getLevel(a.id));

    const grouped: { [level: number]: WorkProgramActivity[] } = {};
    activities.forEach(a => {
      const lvl = levelsMap[a.id] || 0;
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(a);
    });

    const sortedLevels = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedLevels.map(lvl => ({
      level: lvl,
      nodes: grouped[lvl],
    }));
  }, [activities]);

  // Filter activities for search & critical path toggle
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesSearch = 
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.predecessors && a.predecessors.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.start && a.start.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.finish && a.finish.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterCriticalOnly) {
        return matchesSearch && a.critical;
      }
      return matchesSearch;
    });
  }, [activities, searchQuery, filterCriticalOnly]);

  // Calculate pixel bounds or percentage width
  const getRelativePosition = (days: number) => {
    if (totalDuration === 0) return 0;
    return (days / (totalDuration + 5)) * 100;
  };

  const formatOffsetDate = (offsetDays: number) => {
    const d = new Date(firstStartDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Export exact CPM table data to CSV
  const exportToCsv = () => {
    if (activities.length === 0) return;
    const headers = [
      'Activity ID',
      'Activity Description',
      'Duration (Days)',
      'Predecessors',
      'Sequence Type',
      'Lag (Days)',
      'Exact Start Date',
      'Exact Finish Date',
      'Early Start (Day)',
      'Early Finish (Day)',
      'Late Start (Day)',
      'Late Finish (Day)',
      'Total Float (Days)',
      'Critical Path'
    ];

    const rows = activities.map(a => [
      `"${a.id}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      a.duration,
      `"${a.predecessors || ''}"`,
      `"${a.depType || 'FS'}"`,
      a.lag || 0,
      `"${a.start || ''}"`,
      `"${a.finish || ''}"`,
      a.est || 0,
      a.eft || 0,
      a.lst || 0,
      a.lft || 0,
      a.float || 0,
      a.critical ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeFileName ? activeFileName.replace(/\.[^/.]+$/, "") : 'CPM_Schedule'}_Exact_Data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (activities.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 p-8 rounded-2xl text-center shadow-xs">
        <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-bounce" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">No Program CPM Data Loaded</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Add visual schedule activities below or upload an MPP, XML, or CSV schedule to visualize the exact Critical Path timeline.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 border transition-all duration-500 rounded-2xl shadow-sm overflow-hidden p-5 space-y-5 ${
      isHighlighted 
        ? 'border-blue-500 ring-4 ring-blue-500/30 dark:ring-blue-400/40 shadow-lg' 
        : 'border-slate-150 dark:border-slate-700/60'
    }`}>
      {/* Visual Header & Summary Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-150 dark:border-slate-700/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Critical Path Method (CPM) & Program Work Plan
            </h3>
            {activeFileName && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-lg shadow-2xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold">Exact File Data:</span> {activeFileName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Exact activity schedules, calendar milestones, dependency links, and 0-float critical paths.</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded">
              <CalendarRange className="w-3 h-3 text-blue-500" />
              Span: {projectStartDateStr} &rarr; {projectEndDateStr}
            </span>
          </p>
        </div>

        {/* View Selection Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('gantt')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'gantt'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Gantt Timeline
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'network'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            CPM Network (AON)
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'matrix'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Exact Data Matrix
          </button>
        </div>
      </div>

      {/* Overview Analytics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-150/50 dark:border-slate-750">
        <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Work Duration</span>
          <span className="text-xl font-black text-slate-800 dark:text-zinc-100 font-mono">
            {totalDuration} <span className="text-xs font-bold text-slate-400">working days</span>
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Critical Path Nodes</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-500 font-mono">
              {criticalActivities.length}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({activities.length > 0 ? Math.round((criticalActivities.length / activities.length) * 100) : 0}% of schedule)
            </span>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Imported Tasks</span>
          <span className="text-xl font-black text-blue-500 font-mono">
            {activities.length} <span className="text-xs font-bold text-slate-400">activities</span>
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-xl shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Data Fidelity Status</span>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            EXACT SYNC ACTIVE
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'gantt' && (
          <motion.div
            key="gantt-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Controls banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, date, or predecessor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-end w-full sm:w-auto">
                <button
                  onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition ${
                    filterCriticalOnly 
                      ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400' 
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Critical Path Only
                </button>

                <button
                  onClick={() => setShowDatesOnBars(!showDatesOnBars)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition ${
                    showDatesOnBars 
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-600 dark:text-blue-400' 
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                  title="Toggle display of calendar date range badges on timeline bars"
                >
                  <Calendar className="w-3 h-3" />
                  {showDatesOnBars ? 'Hide Bar Dates' : 'Show Bar Dates'}
                </button>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400">Zoom:</span>
                  <button
                    onClick={() => setZoomScale(s => Math.max(0.6, s - 0.2))}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-3xs transition"
                    title="Zoom Out Scale"
                  >
                    <ZoomOut className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                  </button>
                  <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-zinc-200 min-w-[36px] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(s => Math.min(2.0, s + 0.2))}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-3xs transition"
                    title="Zoom In Scale"
                  >
                    <ZoomIn className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Interactive Scroll Canvas */}
            <div className="border border-slate-150 dark:border-slate-750 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto select-none">
                <div 
                  className="min-w-[900px] divide-y divide-slate-100 dark:divide-slate-750"
                  style={{ width: `${100 * zoomScale}%` }}
                >
                  {/* Timeline Day Metrics Header */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-750">
                    <div className="w-80 p-3 border-r border-slate-150 dark:border-slate-750 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 dark:bg-slate-900 flex justify-between items-center">
                      <span>Schedule Activity & Date Bounds</span>
                      <span>Dur</span>
                    </div>
                    {/* SVG timeline ticks */}
                    <div className="flex-1 relative h-11">
                      {timelineTicks.map((tick) => {
                        const pctLeft = getRelativePosition(tick);
                        return (
                          <div 
                            key={tick}
                            className="absolute top-0 bottom-0 border-l border-slate-200/80 dark:border-slate-750 flex flex-col justify-between pl-1"
                            style={{ left: `${pctLeft}%` }}
                          >
                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                              Day {tick}
                            </span>
                            <span className="text-[8px] font-semibold text-slate-400 block mb-0.5 font-mono">
                              {formatOffsetDate(tick)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity Schedules Bars */}
                  {filteredActivities.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      No schedule activities match your filter criteria.
                    </div>
                  ) : (
                    filteredActivities.map((item, itemIdx) => {
                      const est = item.est || 0;
                      const duration = item.duration || 0;
                      const eft = item.eft || 0;
                      const float = item.float || 0;
                      const lft = item.lft || 0;

                      const startPct = getRelativePosition(est);
                      const durPct = getRelativePosition(duration);
                      const floatPct = getRelativePosition(float);

                      const isCritical = item.critical;
                      const isMilestone = duration === 0;
                      const hasHover = hoveredActivityId === item.id;
                      const predsList = item.predecessors ? item.predecessors.split(',').map(s => s.trim()).filter(Boolean) : [];

                      return (
                        <div 
                          key={`cpm-gantt-${item.id || itemIdx}-${itemIdx}`}
                          className={`flex items-center transition-colors duration-150 hover:bg-slate-50/70 dark:hover:bg-slate-900/20 ${
                            isCritical ? 'bg-rose-500/5 dark:bg-rose-950/10' : ''
                          }`}
                          onMouseEnter={() => setHoveredActivityId(item.id)}
                          onMouseLeave={() => setHoveredActivityId(null)}
                        >
                          {/* Activity Description & Meta Info Left Column */}
                          <div className="w-80 p-2.5 border-r border-slate-150 dark:border-slate-750 flex items-center justify-between gap-2 shrink-0 bg-white/50 dark:bg-slate-850/50">
                            <div className="flex items-start gap-2 truncate flex-1">
                              {/* Glowing ID tag */}
                              <span className={`w-7 h-7 items-center justify-center flex font-black font-mono text-[10px] rounded-lg tracking-tight shadow-3xs shrink-0 mt-0.5 ${
                                isCritical 
                                  ? 'bg-rose-550 border border-rose-500 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-zinc-200 border border-slate-250 dark:border-slate-700'
                              }`}>
                                {item.id}
                              </span>
                              <div className="truncate flex flex-col flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                  {isMilestone && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded">
                                      MILESTONE
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                    {item.start || '-'} &rarr; {item.finish || '-'}
                                  </span>
                                  {predsList.length > 0 && (
                                    <span className="text-slate-400 truncate">
                                      &bull; Preds: {predsList.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-black shrink-0 ${
                              isMilestone 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' 
                                : isCritical 
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                            }`}>
                              {isMilestone ? '0d' : `${duration}d`}
                            </span>
                          </div>

                          {/* Graphical Timeline Row Track */}
                          <div className="flex-1 relative h-11 flex items-center">
                            {/* Grid vertical reference guides */}
                            {timelineTicks.map((tick) => (
                              <div 
                                key={`tick-guide-${tick}`}
                                className="absolute top-0 bottom-0 border-l border-slate-150/50 dark:border-slate-800/40 touch-none pointer-events-none"
                                style={{ left: `${getRelativePosition(tick)}%` }}
                              />
                            ))}

                            {/* Milestone Marker or Solid Work Duration Bar */}
                            {isMilestone ? (
                              <div 
                                className="absolute flex items-center justify-center cursor-pointer z-20 group"
                                style={{ 
                                  left: `${startPct}%`,
                                  transform: 'translateX(-50%)'
                                }}
                                title={`[Milestone ${item.id}] ${item.name} on ${item.start || formatOffsetDate(est)}`}
                              >
                                <div className={`w-4 h-4 rotate-45 border-2 shadow-md transition transform group-hover:scale-125 ${
                                  isCritical 
                                    ? 'bg-rose-500 border-white ring-2 ring-rose-500/50 animate-pulse' 
                                    : 'bg-purple-600 border-white ring-2 ring-purple-500/50'
                                }`} />
                                <span className="absolute left-5 text-[9px] font-mono font-bold whitespace-nowrap bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-zinc-200 shadow-2xs">
                                  ({item.id}) {item.name} &bull; {item.start || formatOffsetDate(est)}
                                </span>
                              </div>
                            ) : (
                              <div 
                                className={`absolute h-6 rounded-lg flex items-center px-2 cursor-pointer shadow-3xs transition-all duration-200 group ${
                                  isCritical 
                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 border border-red-400 text-white font-extrabold' 
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400 text-white font-semibold'
                                } ${
                                  hasHover ? 'brightness-110 shadow-md ring-2 ring-blue-400/60 scale-[1.01] z-10' : ''
                                }`}
                                style={{ 
                                  left: `${startPct}%`, 
                                  width: `max(24px, calc(${durPct}% - 2px))` 
                                }}
                                title={`[Activity ${item.id}] ${item.name} (${duration} Days, ${item.start} - ${item.finish}, Float: ${float} Days)`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[9px] font-mono select-none drop-shadow-md truncate text-white block">
                                    ({item.id}) {item.name}
                                  </span>
                                  {showDatesOnBars && (
                                    <span className="text-[8px] font-mono text-white/85 bg-black/20 px-1 rounded truncate shrink-0">
                                      {item.start || formatOffsetDate(est)} &rarr; {item.finish || formatOffsetDate(eft)}
                                    </span>
                                  )}
                                </div>
                                
                                {isCritical && (
                                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5 align-middle select-none">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-100 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-200"></span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Float Bar extension (Buffer zone) */}
                            {float > 0 && !isMilestone && (
                              <div 
                                className="absolute h-4.5 border-y border-r border-dashed border-amber-500/70 dark:border-amber-400 bg-amber-500/15 dark:bg-amber-950/30 rounded-r-lg flex items-center justify-end px-1.5 cursor-help"
                                style={{ 
                                  left: `${getRelativePosition(eft)}%`, 
                                  width: `${floatPct}%` 
                                }}
                                title={`Float buffer for Activity ${item.id}: Extra ${float} days can slip without affecting project completion.`}
                              >
                                <span className="text-[8px] font-mono text-amber-700 dark:text-amber-300 font-extrabold select-none">
                                  +{float}d float
                                </span>
                              </div>
                            )}

                            {/* Hover Details Panel tooltips overlay */}
                            {hasHover && (
                              <div 
                                className="absolute left-3 bottom-9 bg-slate-900 border border-slate-700 text-zinc-100 p-3 rounded-xl shadow-2xl z-50 text-[11px] w-64 flex flex-col gap-1.5 text-left select-text"
                                style={{ left: `calc(${startPct}% + 10px)` }}
                                onMouseEnter={(e) => e.stopPropagation()}
                              >
                                <div className="border-b border-slate-700/80 pb-1.5 flex justify-between items-center">
                                  <span className="font-extrabold text-blue-400 font-mono">[{item.id}] Activity Metadata</span>
                                  <span className={`px-1.5 py-0.5 uppercase text-[8px] rounded font-black ${
                                    isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-750 text-slate-350'
                                  }`}>
                                    {isCritical ? 'CRITICAL (0 Float)' : 'SUBCRITICAL'}
                                  </span>
                                </div>
                                <p className="font-bold text-xs text-white leading-snug">{item.name}</p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 font-mono text-[10px] text-slate-300">
                                  <span>Work Duration:</span> <span className="text-white font-bold">{duration} Days</span>
                                  <span>Calendar Start:</span> <span className="text-white font-bold">{item.start || '-'}</span>
                                  <span>Calendar Finish:</span> <span className="text-white font-bold">{item.finish || '-'}</span>
                                  <span>Early Start/End:</span> <span className="text-slate-300">D{est} &rarr; D{eft}</span>
                                  <span>Late Start/End:</span> <span className="text-slate-400">D{item.lst || 0} &rarr; D{lft}</span>
                                  <span>Total Float:</span> <span className={`${isCritical ? 'text-rose-400' : 'text-amber-400'} font-bold`}>{float} Days</span>
                                  {item.predecessors && (
                                    <>
                                      <span>Predecessors:</span> <span className="text-slate-200">{item.predecessors}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Informative Visual Legend */}
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-t border-slate-150 dark:border-slate-750 text-xs flex flex-wrap gap-4 text-slate-500 dark:text-slate-400 justify-between items-center">
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Legend:</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3.5 bg-gradient-to-r from-red-500 to-rose-650 border border-red-500 rounded-sm inline-block" />
                    Critical Path (Zero Float)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400 rounded-sm inline-block" />
                    Standard / Subcritical Activity
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rotate-45 bg-purple-600 border border-white inline-block" />
                    Milestone (0 Duration)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-4 h-2 bg-amber-500/15 border-y border-dashed border-amber-500 rounded-xs inline-block" />
                    Float Buffer Allowance
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  * Hover over any Gantt item to view detailed early/late scheduling calculations.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'network' && (
          <motion.div
            key="network-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Legend guide banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-750 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  <strong>AON (Activity-on-Node) CPM Network Diagram:</strong> Displaying standard 6-box topological CPM nodes grouped by dependency level.
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-500/20 border-2 border-red-500 rounded-sm inline-block" />
                  Critical Task
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-500/20 border-2 border-blue-500 rounded-sm inline-block" />
                  Standard Task
                </span>
              </div>
            </div>

            {/* Grid Network level streams */}
            <div className="overflow-x-auto p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-750">
              <div className="min-w-[950px] flex gap-12 py-4 px-2 items-start justify-between relative">
                {networkLevels.map((lvl) => (
                  <div key={lvl.level} className="flex-1 flex flex-col gap-6 relative items-center">
                    {/* Level Column Identifier Stream Header */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 mb-2 shadow-3xs">
                      Dependency Level {lvl.level}
                    </div>

                    <div className="w-full flex flex-col gap-4">
                      {lvl.nodes.map((node, nodeIdx) => {
                        const isCritical = node.critical;
                        const float = node.float || 0;
                        const isHovered = hoveredActivityId === node.id;
                        
                        const isRelatedPredecessor = hoveredActivityId ? 
                          (node.predecessors ? node.predecessors.split(',').map(s=>s.trim()).includes(hoveredActivityId) : false) : false;
                        
                        const currentHoverObj = hoveredActivityId ? activities.find(x => x.id === hoveredActivityId) : null;
                        const isRelatedSuccessor = currentHoverObj ? 
                          (currentHoverObj.predecessors ? currentHoverObj.predecessors.split(',').map(s=>s.trim()).includes(node.id) : false) : false;

                        return (
                          <div
                            key={`cpm-net-${node.id || nodeIdx}-${nodeIdx}`}
                            className={`transition-all duration-200 relative select-text text-left ${
                              isHovered ? 'scale-105 z-10' : ''
                            }`}
                            onMouseEnter={() => setHoveredActivityId(node.id)}
                            onMouseLeave={() => setHoveredActivityId(null)}
                          >
                            {/* AON Structured Visual Card */}
                            <div className={`rounded-xl overflow-hidden border shadow-sm ${
                              isCritical 
                                ? (isHovered ? 'border-red-500 shadow-red-500/20 bg-rose-500/10' : 'border-red-400 dark:border-red-500/70 bg-rose-500/5')
                                : (isHovered ? 'border-blue-500 shadow-blue-500/20 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80')
                            } ${
                              isRelatedPredecessor ? 'ring-2 ring-amber-400/80 ring-offset-1 dark:ring-offset-slate-900 border-amber-400' : ''
                            } ${
                              isRelatedSuccessor ? 'ring-2 ring-emerald-500/80 ring-offset-1 dark:ring-offset-slate-900 border-emerald-500' : ''
                            }`}>
                              
                              {/* Row 1: ES | Dur | EF */}
                              <div className="grid grid-cols-3 text-[10px] font-mono border-b border-slate-200 dark:border-slate-700/60 divide-x divide-slate-150 dark:divide-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-center text-slate-500 dark:text-slate-400 font-bold">
                                <div className="py-1 px-1" title="Early Start day">
                                  ES: <span className="text-slate-800 dark:text-zinc-200">{node.est}</span>
                                </div>
                                <div className="py-1 px-1 font-extrabold text-blue-600 dark:text-blue-400" title="Duration in Days">
                                  D: {node.duration}d
                                </div>
                                <div className="py-1 px-1" title="Early Finish day">
                                  EF: <span className="text-slate-800 dark:text-zinc-200">{node.eft}</span>
                                </div>
                              </div>

                              {/* Row 2: Code - Name */}
                              <div className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                  <span className={`inline-block font-black font-mono text-[11px] rounded px-1.5 py-0.5 text-white ${
                                    isCritical ? 'bg-gradient-to-r from-red-500 to-rose-650' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                  }`}>
                                    {node.id}
                                  </span>
                                  {isCritical && (
                                    <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 uppercase bg-rose-100 dark:bg-rose-950/40 px-1 rounded">
                                      CRITICAL
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 leading-tight block">
                                  {node.name}
                                </span>
                                {(node.start || node.finish) && (
                                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block mt-1">
                                    {node.start || '-'} &rarr; {node.finish || '-'}
                                  </span>
                                )}
                              </div>

                              {/* Row 3: LS | Float | LF */}
                              <div className="grid grid-cols-3 text-[9px] font-mono border-t border-slate-200 dark:border-slate-700/60 divide-x divide-slate-150 dark:divide-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-center text-slate-500 dark:text-slate-400 font-semibold">
                                <div className="py-1 px-1" title="Late Start day">
                                  LS: <span className="text-slate-700 dark:text-slate-300">{node.lst}</span>
                                </div>
                                <div className={`py-1 px-1 font-bold ${isCritical ? 'text-rose-500' : 'text-amber-500'}`} title="Float buffer days">
                                  TF: {float}d
                                </div>
                                <div className="py-1 px-1" title="Late Finish day">
                                  LF: <span className="text-slate-700 dark:text-slate-300">{node.lft}</span>
                                </div>
                              </div>
                            </div>

                            {/* Node relation stream badges on hover */}
                            {isHovered && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-950 text-white p-2.5 rounded-xl text-[10px] w-60 z-30 shadow-xl text-center leading-normal no-print">
                                <span className="font-extrabold uppercase text-blue-400 block border-b border-slate-800 pb-1 mb-1">
                                  Dependency Constraints & Linkages
                                </span>
                                {node.predecessors ? (
                                  <p className="mb-0.5 text-slate-300">
                                    Predecessors: <strong className="text-amber-400 font-extrabold">{node.predecessors}</strong>
                                  </p>
                                ) : (
                                  <p className="mb-0.5 text-slate-400 italic">No predecessors (Schedule Root Node)</p>
                                )}
                                <p className="text-slate-400 text-[9px] mt-1">
                                  Dates: {node.start || '-'} to {node.finish || '-'}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'matrix' && (
          <motion.div
            key="matrix-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Header / Export Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter schedule records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredActivities.length} of {activities.length} rows
                </span>
                <button
                  onClick={exportToCsv}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Exact CSV
                </button>
              </div>
            </div>

            {/* Exact Data Table */}
            <div className="border border-slate-150 dark:border-slate-750 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-3 w-14 text-center">ID</th>
                      <th className="p-3 min-w-[200px]">Activity Description</th>
                      <th className="p-3 w-24 text-center">Duration</th>
                      <th className="p-3 w-28 text-center">Predecessors</th>
                      <th className="p-3 w-24 text-center">Sequence</th>
                      <th className="p-3 w-20 text-center">Lag</th>
                      <th className="p-3 w-28 text-center">Exact Start Date</th>
                      <th className="p-3 w-28 text-center">Exact Finish Date</th>
                      <th className="p-3 w-24 text-center">ES / EF (Day)</th>
                      <th className="p-3 w-24 text-center">LS / LF (Day)</th>
                      <th className="p-3 w-20 text-center">Float</th>
                      <th className="p-3 w-28 text-center">CPM Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-700/60 font-mono">
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 font-sans">
                          No schedule activities found.
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((a, idx) => (
                        <tr 
                          key={`matrix-row-${a.id || idx}`}
                          className={`transition hover:bg-slate-50 dark:hover:bg-slate-900/30 ${
                            a.critical ? 'bg-rose-500/5 dark:bg-rose-950/15' : ''
                          }`}
                        >
                          <td className="p-3 text-center font-bold font-mono">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                              a.critical ? 'bg-rose-500 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-200'
                            }`}>
                              {a.id}
                            </span>
                          </td>
                          <td className="p-3 font-sans font-bold text-slate-800 dark:text-zinc-100">
                            {a.name}
                            {a.duration === 0 && (
                              <span className="ml-2 text-[9px] font-mono uppercase bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1 py-0.2 rounded">
                                Milestone
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800 dark:text-zinc-200">
                            {a.duration} d
                          </td>
                          <td className="p-3 text-center text-slate-600 dark:text-slate-300">
                            {a.predecessors || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {a.depType || 'FS'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-500 dark:text-slate-400">
                            {a.lag ? `+${a.lag}d` : '0d'}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700 dark:text-zinc-200">
                            {a.start || '-'}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700 dark:text-zinc-200">
                            {a.finish || '-'}
                          </td>
                          <td className="p-3 text-center text-[11px] text-slate-600 dark:text-slate-300">
                            D{a.est || 0} &rarr; D{a.eft || 0}
                          </td>
                          <td className="p-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
                            D{a.lst || 0} &rarr; D{a.lft || 0}
                          </td>
                          <td className="p-3 text-center font-black">
                            <span className={a.critical ? 'text-rose-500' : (a.float !== undefined && a.float < 15 ? 'text-amber-500' : 'text-slate-400')}>
                              {a.float || 0} d
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            {a.critical ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md animate-pulse">
                                CRITICAL PATH
                              </span>
                            ) : (
                              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                a.float !== undefined && a.float < 15
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-750 dark:text-slate-400'
                              }`}>
                                {a.float !== undefined && a.float < 15 ? 'Near-Critical' : 'Subcritical'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

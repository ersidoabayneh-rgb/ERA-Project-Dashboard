import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, CheckCircle, Scale, BookOpen, AlertCircle, HardHat, Compass, Landmark, Filter,
  ClipboardList, Users, Truck, Package, MessageSquare, Factory, Search
} from 'lucide-react';
import { Project, formatAccounting } from '../types';
import { calculateProjectEvm } from '../lib/evmCalculations';
import { 
  getFidicContractInfo, 
  generateFidicContractualAnalysis
} from '../lib/fidicClauseEngine';
import { computeComprehensiveDailyOperationsSummary } from '../lib/dailyActivitiesSync';
import CpmLinearComparison from './CpmLinearComparison';
import YearlyCostForecastSection from './YearlyCostForecastSection';
import DataIntegrityDashboard from './DataIntegrityDashboard';

interface ComprehensiveAnalysisViewProps {
  project: Project;
  onUpdateProject?: (updatedProject: Partial<Project>, actionDescription?: string) => void;
  isReadonly?: boolean;
}

export default function ComprehensiveAnalysisView({ 
  project,
  onUpdateProject,
  isReadonly = false
}: ComprehensiveAnalysisViewProps) {
  // Provide baseline BAC and EV values for Yearly Cost Forecast section (EVM analytics reside on dedicated EVM page)
  const { BAC, EV } = useMemo(() => calculateProjectEvm(project), [project]);

  // FIDIC Clause Engine Analysis
  const fidicInfo = getFidicContractInfo(project);
  const fidicAnalysis = generateFidicContractualAnalysis(project);

  // Filter State for 3-Party Breach Analysis Matrix
  const [selectedParty, setSelectedParty] = useState<'All' | 'Contractor' | 'Supervision Consultant' | 'Employer (Client)'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Critical Risk' | 'Action Required' | 'Caution' | 'Compliant'>('All');

  // Party Counts
  const contractorCount = fidicAnalysis.filter(a => a.responsibleParty === 'Contractor').length;
  const consultantCount = fidicAnalysis.filter(a => a.responsibleParty === 'Supervision Consultant').length;
  const employerCount = fidicAnalysis.filter(a => a.responsibleParty === 'Employer (Client)').length;

  // Filtered Analysis List
  const filteredAnalysis = fidicAnalysis.filter(item => {
    const matchesParty = selectedParty === 'All' || item.responsibleParty === selectedParty;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesParty && matchesStatus;
  });

  // Daily Activities & Field Operations Live Sync Summary
  const [notesSearch, setNotesSearch] = useState('');
  const [showAllDailyLogs, setShowAllDailyLogs] = useState(false);
  const [syncPulseTick, setSyncPulseTick] = useState(0);

  useEffect(() => {
    const onDailySync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.projectId || detail.projectId === project.id) {
        setSyncPulseTick(t => t + 1);
      }
    };
    window.addEventListener('era_daily_activities_synced', onDailySync);
    let bc: BroadcastChannel | null = null;
    if (typeof window.BroadcastChannel === 'function') {
      try {
        bc = new BroadcastChannel('era_broadcast_channel');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'DAILY_ACTIVITIES_SYNCED' && (!ev.data.projectId || ev.data.projectId === project.id)) {
            setSyncPulseTick(t => t + 1);
          }
        };
      } catch {}
    }
    return () => {
      window.removeEventListener('era_daily_activities_synced', onDailySync);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [project.id]);

  const dailyOps = useMemo(
    () => computeComprehensiveDailyOperationsSummary(project),
    [project.dailyActivities, project.dailySiteLogs, project.lastModifiedAt, syncPulseTick]
  );

  const filteredDailyDays = useMemo(() => {
    const q = notesSearch.trim().toLowerCase();
    const list = dailyOps.days.filter(d => {
      if (!q) return true;
      const noteMatch = d.dailyNotes.toLowerCase().includes(q);
      const dateMatch = d.date.toLowerCase().includes(q);
      const weatherMatch = d.weather.toLowerCase().includes(q);
      const equipMatch = d.equipmentFleet.some(eq => eq.name.toLowerCase().includes(q));
      const matMatch = d.materialsList.some(m => m.material.toLowerCase().includes(q));
      const actMatch = d.activities.some(a => (a.description || a.activityName || '').toLowerCase().includes(q));
      return noteMatch || dateMatch || weatherMatch || equipMatch || matMatch || actMatch;
    });
    return showAllDailyLogs ? list : list.slice(0, 6);
  }, [dailyOps.days, notesSearch, showAllDailyLogs]);

  const formatBr = (v: number) => formatAccounting(v, 'Br.');

  return (
    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">

      {/* Live Daily Activities, Resource Utilization & Manager Daily Notes Panel */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                Live Daily Field Operations &amp; Construction Manager Notes
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time rollup from Daily Activities: workforce crew, fleet hours, materials, plant output, and manager Daily Notes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
              {dailyOps.totalLoggedDays} Logged Days · {dailyOps.totalNotesLogged} Daily Notes
            </span>
            {dailyOps.latestUpdatedAt && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Synced {new Date(dailyOps.latestUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 space-y-3.5">
          {/* 4 Resource & Execution Telemetry KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Logged Field Days</span>
                <Activity className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {dailyOps.totalLoggedDays} days
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {dailyOps.activeWorkDays} active · {dailyOps.standstillDays} standstill · {dailyOps.totalActivitiesLogged} tasks
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Labor Deployed</span>
                <Users className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {dailyOps.totalLaborDeployments.toLocaleString()} crew-days
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Avg {dailyOps.avgCrewPerDay} personnel/day · {dailyOps.laborByCategory.length} roles
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Fleet Utilization</span>
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {dailyOps.equipmentUtilizationPct}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {dailyOps.operatingUnits}/{dailyOps.totalEquipmentUnits} operating · {dailyOps.totalEquipmentHours} hrs
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <span>Materials &amp; Plant Output</span>
                <Factory className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                {dailyOps.totalMaterialsUsed.toLocaleString()} used
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {dailyOps.totalMaterialsReceived.toLocaleString()} recv · Plant eff: {dailyOps.plantOutputEfficiencyPct}%
              </div>
            </div>
          </div>

          {/* Operational Signals + Role/Material Summary */}
          {dailyOps.totalLoggedDays > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Operational Signals */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Daily Operational Signals &amp; Executed Output ({dailyOps.totalExecutedKm} km · {dailyOps.totalExecutedM3} m³)
                </div>
                <div className="space-y-1.5">
                  {dailyOps.operationalSignals.map((sig, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-2 rounded-lg border text-[11px] ${
                        sig.severity === 'risk'
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                          : sig.severity === 'caution'
                          ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      <div className="font-bold">{sig.title}</div>
                      <div className="opacity-90 mt-0.5">{sig.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Material Net Consumption & Workforce Role Breakdown */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Aggregated Field Materials &amp; Workforce Roles</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    Net Balance: {dailyOps.materialNetBalance >= 0 ? `+${dailyOps.materialNetBalance.toLocaleString()}` : dailyOps.materialNetBalance.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Top Workforce Roles</div>
                    {dailyOps.laborByCategory.length > 0 ? dailyOps.laborByCategory.slice(0, 5).map((l) => (
                      <div key={l.category} className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-700/40">
                        <span className="truncate pr-2 text-slate-700 dark:text-slate-300">{l.category}</span>
                        <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{l.totalCount}</span>
                      </div>
                    )) : (
                      <div className="text-slate-400 italic">No labor headcounts logged yet</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Top Materials Used</div>
                    {dailyOps.aggregatedMaterials.length > 0 ? dailyOps.aggregatedMaterials.slice(0, 5).map((m) => (
                      <div key={m.material} className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-700/40">
                        <span className="truncate pr-2 text-slate-700 dark:text-slate-300">{m.material}</span>
                        <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {m.used.toLocaleString()} / {m.received.toLocaleString()}
                        </span>
                      </div>
                    )) : (
                      <div className="text-slate-400 italic">No material logs synced yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Construction Manager Daily Notes & Linked Resource Context Timeline */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Construction Manager Daily Notes &amp; Resource Context Log
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={notesSearch}
                  onChange={e => setNotesSearch(e.target.value)}
                  placeholder="Filter notes, dates, equipment, material..."
                  className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 w-64"
                />
              </div>
            </div>

            {filteredDailyDays.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {dailyOps.totalLoggedDays === 0
                  ? 'No daily logs saved yet. Save activities, resources, or Daily Notes in the Daily Activities view to see them synced here immediately.'
                  : 'No daily logs match your search filter.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredDailyDays.map(day => (
                  <div key={day.date} className="p-3.5 space-y-2 hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {day.date}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          day.isNoWorkDay
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {day.isNoWorkDay ? `Standstill (${day.noWorkReason || 'Halt'})` : 'Active Workday'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {day.weather} · {day.shift.replace(' (Standard)', '')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Users className="w-3 h-3 inline mr-1 text-indigo-500" />
                          Labor: {day.totalLabor}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Truck className="w-3 h-3 inline mr-1 text-emerald-500" />
                          Equip: {day.operatingEquipment}/{day.totalEquipmentUnits}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Package className="w-3 h-3 inline mr-1 text-amber-500" />
                          Mat: {day.totalMaterialUsed}/{day.totalMaterialReceived}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          Tasks: {day.activities.length}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-2">
                      {day.dailyNotes ? (
                        <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                          {day.dailyNotes}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No Daily Notes added for {day.date} — resource quantities recorded above.
                        </p>
                      )}
                      {(day.updatedBy || day.updatedAt) && (
                        <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Logged by: {day.updatedBy || 'Site Manager'}</span>
                          {day.updatedAt && <span>Updated {new Date(day.updatedAt).toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dailyOps.days.length > 6 && !notesSearch.trim() && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700/50 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllDailyLogs(!showAllDailyLogs)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {showAllDailyLogs ? 'Show Latest 6 Days Only' : `Show All ${dailyOps.days.length} Logged Days`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Multi-Year Fiscal Year Cost Forecast & Price Escalation Modeler */}
      <YearlyCostForecastSection
        project={project}
        BAC={BAC}
        EV={EV}
        formatBr={formatBr}
      />

      {/* Integrated CPM vs. Linear Progress Scheduling Analysis */}
      <CpmLinearComparison project={project} />

      {/* Automated Data Integrity Dashboard Widget */}
      <DataIntegrityDashboard
        project={project}
        onUpdateProject={onUpdateProject}
        isReadonly={isReadonly}
      />

      {/* FIDIC Contract & Delivery Method Header Banner */}
      <div className="p-4 bg-white dark:bg-slate-800 text-slate-850 dark:text-zinc-100 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-850 dark:text-zinc-100 flex items-center gap-2">
                FIDIC Contract & Delivery Method Framework
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                  {fidicInfo.contractType}
                </span>
              </h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Grounding project EVM, claims, variations, and performance analysis in exact FIDIC Conditions of Contract and delivery responsibilities.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-2xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700/60">
              Edition: <strong className="text-slate-900 dark:text-white">{fidicInfo.fidicName}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700/60">
              Delivery: <strong className="text-slate-900 dark:text-white">{fidicInfo.deliveryMethodName}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-2xs pt-1">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold block uppercase tracking-wider text-[9px]">Design Responsibility</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium block mt-0.5">{fidicInfo.designResponsibility}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold block uppercase tracking-wider text-[9px]">Engineer Authority & Role</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium block mt-0.5">{fidicInfo.engineerRole}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold block uppercase tracking-wider text-[9px]">Governing Law & Jurisdiction</span>
            <span className="text-slate-100 font-medium block mt-0.5">{fidicInfo.governingLaw}</span>
          </div>
        </div>
      </div>


      {/* Unified 3-Party Contractual Breach & Compliance Analysis Matrix */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Matrix Header & Stakeholder Filter Tabs */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                3-Party Contractual Breach & Compliance Matrix ({fidicInfo.fidicName})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {filteredAnalysis.length} / {fidicAnalysis.length} Categories Analyzed
            </span>
          </div>

          {/* Stakeholder Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedParty('All')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'All'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>All Stakeholders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {fidicAnalysis.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Contractor')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Contractor'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60'
                }`}
              >
                <HardHat className="w-3.5 h-3.5 shrink-0" />
                <span>Contractor Breaches</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                  {contractorCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Supervision Consultant')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Supervision Consultant'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Consultant Defaults</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                  {consultantCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Employer (Client)')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Employer (Client)'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800/60'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 shrink-0" />
                <span>Employer / Client Liabilities</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100">
                  {employerCount}
                </span>
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400 mr-0.5" />
              {(['All', 'Critical Risk', 'Action Required', 'Caution', 'Compliant'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Matrix Grid Cards */}
        <div className="p-3.5 space-y-3">
          {filteredAnalysis.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No breach records found matching the selected filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAnalysis.map((item, idx) => {
                const isContractor = item.responsibleParty === 'Contractor';
                const isConsultant = item.responsibleParty === 'Supervision Consultant';

                const partyBadge = isContractor
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
                  : isConsultant
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-200 dark:border-purple-800'
                  : 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-200 border-teal-200 dark:border-teal-800';

                const statusBg = item.status === 'Critical Risk' 
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                  : item.status === 'Action Required'
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : item.status === 'Caution'
                  ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20';

                const badgeColor = item.status === 'Critical Risk' 
                  ? 'bg-rose-600 text-white font-extrabold'
                  : item.status === 'Action Required'
                  ? 'bg-amber-600 text-white font-extrabold'
                  : item.status === 'Caution'
                  ? 'bg-blue-600 text-white font-extrabold'
                  : 'bg-emerald-600 text-white font-extrabold';

                return (
                  <div key={idx} className={`p-3.5 rounded-xl border ${statusBg} space-y-2.5 transition-all hover:shadow-xs`}>
                    
                    {/* Header: Party Tag, Title & Status */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[9px] border uppercase ${partyBadge}`}>
                            {isContractor ? '👷 Contractor' : isConsultant ? '📐 Supervision Consultant' : '🏛️ Client (Employer)'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {item.fidicSubClause}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mt-0.5">
                          {item.category}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shrink-0 ${badgeColor}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Content: Finding & Legal Impact */}
                    <div className="space-y-1.5 text-2xs text-slate-600 dark:text-slate-300">
                      <p>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">Audit Finding & Breach: </strong>
                        {item.findings}
                      </p>
                      <p>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">Legal / Contractual Exposure: </strong>
                        {item.contractualImpact}
                      </p>
                    </div>

                    {/* Actionable Directive Box */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-2xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] font-extrabold block">
                          Remedial Directive / Action:
                        </span>
                        <span>{item.recommendedAction}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

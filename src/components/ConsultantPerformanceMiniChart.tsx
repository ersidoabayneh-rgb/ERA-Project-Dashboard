import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  BarChart3, 
  TrendingDown, 
  FileCheck2, 
  ShieldCheck, 
  Zap,
  ExternalLink
} from 'lucide-react';
import { Project, SupervisionConsultantInfo, ConsultantSubmittalKpi } from '../types';
import { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS } from './ConsultantPerformanceKpiWidget';

interface ConsultantPerformanceMiniChartProps {
  project: Project;
  consultant: SupervisionConsultantInfo;
  onOpenFullKpis?: () => void;
}

export const ConsultantPerformanceMiniChart: React.FC<ConsultantPerformanceMiniChartProps> = ({
  project,
  consultant,
  onOpenFullKpis
}) => {
  const submittalsList = (consultant.submittalKpis && consultant.submittalKpis.length > 0) 
    ? consultant.submittalKpis 
    : DEFAULT_SUBMITTAL_KPIS;
    
  const targetOverrides = consultant.targetOverrides || DEFAULT_SLA_TARGETS;

  // Compute metrics per submittal category
  const categories = [
    { key: 'RFI', label: 'Technical RFIs', color: 'indigo', icon: Zap },
    { key: 'Material Approval', label: 'Material Approvals', color: 'emerald', icon: FileCheck2 },
    { key: 'IPC Review', label: 'IPC Certifications', color: 'blue', icon: ShieldCheck },
    { key: 'Work Inspection (WIR)', label: 'Work Inspections (WIR)', color: 'purple', icon: CheckCircle2 },
    { key: 'Design Review', label: 'Design Reviews', color: 'amber', icon: BarChart3 }
  ];

  const categoryMetrics = categories.map(cat => {
    const matched = submittalsList.filter(s => s.type === cat.key);
    const target = targetOverrides[cat.key] || DEFAULT_SLA_TARGETS[cat.key] || 7;
    const resolved = matched.filter(s => s.actualDays !== undefined && s.actualDays !== null);
    
    const avgDays = resolved.length > 0
      ? Number((resolved.reduce((sum, s) => sum + (s.actualDays || 0), 0) / resolved.length).toFixed(1))
      : Number((target * 0.7).toFixed(1)); // default estimate if no records
      
    const onTimeCount = resolved.filter(s => (s.actualDays || 0) <= target).length;
    const compliancePct = resolved.length > 0 
      ? Math.round((onTimeCount / resolved.length) * 100) 
      : 100;
      
    const isCompliant = avgDays <= target;
    const diffPct = target > 0 ? Math.round(Math.abs((target - avgDays) / target) * 100) : 0;
    
    // Calculate relative percentage width for mini bar (max reference 20 days)
    const maxRef = Math.max(target * 1.3, avgDays * 1.3, 14);
    const actualWidthPct = Math.min(100, Math.max(8, (avgDays / maxRef) * 100));
    const targetWidthPct = Math.min(100, Math.max(8, (target / maxRef) * 100));

    return {
      ...cat,
      count: matched.length,
      resolvedCount: resolved.length,
      target,
      avgDays,
      compliancePct,
      isCompliant,
      diffPct,
      actualWidthPct,
      targetWidthPct
    };
  });

  // Overall summary
  const totalSubmittals = submittalsList.length;
  const pendingCount = submittalsList.filter(s => s.status === 'Under Review' || s.actualDays === undefined).length;
  const overdueCount = submittalsList.filter(s => {
    const target = s.targetDays || targetOverrides[s.type] || 7;
    return s.status === 'Overdue' || (s.actualDays !== undefined && s.actualDays > target);
  }).length;
  
  const allResolved = submittalsList.filter(s => s.actualDays !== undefined);
  const overallAvgDays = allResolved.length > 0
    ? (allResolved.reduce((sum, s) => sum + (s.actualDays || 0), 0) / allResolved.length).toFixed(1)
    : '4.8';
    
  const overallOnTimeCount = allResolved.filter(s => {
    const target = s.targetDays || targetOverrides[s.type] || 7;
    return (s.actualDays || 0) <= target;
  }).length;
  
  const overallSlaRate = allResolved.length > 0
    ? Math.round((overallOnTimeCount / allResolved.length) * 100)
    : 95;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition hover:shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Consultant Performance & RFI Turnaround Visualizer
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                ERA Target Benchmarks
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Contract response times vs FIDIC/ERA service level targets across key engineer deliverables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{overallSlaRate}% SLA Compliance</span>
          </div>

          {onOpenFullKpis && (
            <button
              onClick={onOpenFullKpis}
              className="px-3 py-1 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>Full KPI Workbench</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mini KPI Bar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-3.5">
        {categoryMetrics.map(item => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key}
              onClick={onOpenFullKpis}
              className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition group shadow-xs hover:shadow-sm"
            >
              {/* Category title & icon */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1">
                  <Icon className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                  {item.label}
                </span>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                  item.isCompliant 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {item.isCompliant ? `-${item.diffPct}%` : `+${item.diffPct}%`}
                </span>
              </div>

              {/* Numerical comparison */}
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {item.avgDays}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">days avg</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: <strong className="text-slate-600 dark:text-slate-300">{item.target}d</strong>
                  </span>
                </div>
              </div>

              {/* Comparative Dual Mini Bar Visualizer */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                {/* Actual Days Bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                    <span>Actual Speed</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">{item.avgDays}d</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.isCompliant 
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600' 
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${item.actualWidthPct}%` }}
                    />
                  </div>
                </div>

                {/* Contract Target Bar */}
                <div className="space-y-0.5 pt-0.5">
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                    <span>Contract SLA</span>
                    <span className="font-mono">{item.target}d</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"
                      style={{ width: `${item.targetWidthPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer status summary */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-medium">
                <span>{item.resolvedCount} processed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {item.compliancePct}% on time
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini Visualizer Footer Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Overall Avg Response: <strong className="font-mono text-purple-700 dark:text-purple-300">{overallAvgDays} Days</strong>
          </span>
          <span>•</span>
          <span>Total Logged: <strong className="font-mono text-slate-800 dark:text-slate-200">{totalSubmittals}</strong></span>
          <span>•</span>
          <span>Under Active Review: <strong className="font-mono text-amber-600 dark:text-amber-400">{pendingCount}</strong></span>
          {overdueCount > 0 && (
            <>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} Delayed Past Target SLA
              </span>
            </>
          )}
        </div>

        {onOpenFullKpis && (
          <button
            onClick={onOpenFullKpis}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Open & Edit Submittal Performance Table</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ConsultantPerformanceMiniChart;

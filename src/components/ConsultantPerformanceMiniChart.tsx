import React, { useMemo } from 'react';
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
import { DEFAULT_SUBMITTAL_KPIS, DEFAULT_SLA_TARGETS, checkSubmittalDelay } from './ConsultantPerformanceKpiWidget';

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
  const targetOverrides = useMemo(() => {
    return {
      ...DEFAULT_SLA_TARGETS,
      ...(consultant.targetOverrides || {})
    };
  }, [consultant.targetOverrides]);

  // Merge consultant submittals with live IPC tracker items from financial data page (Monthly Payment Bill Summary, IPC Maturation & Interest Ledger)
  const submittalsList: ConsultantSubmittalKpi[] = useMemo(() => {
    let baseList: ConsultantSubmittalKpi[] = [];
    if (consultant.submittalKpis && consultant.submittalKpis.length > 0) {
      baseList = [...consultant.submittalKpis];
    } else if (project.id === 'proj_default') {
      baseList = [...DEFAULT_SUBMITTAL_KPIS];
    }

    if (project.ipcTracker && project.ipcTracker.length > 0) {
      const ipcSubmittals: ConsultantSubmittalKpi[] = project.ipcTracker
        .filter(ipc => ipc.submissionDate)
        .map(ipc => {
          let actualDays: number | undefined = undefined;
          if (ipc.submissionDate && ipc.certificationDate) {
            const subTime = new Date(ipc.submissionDate).getTime();
            const certTime = new Date(ipc.certificationDate).getTime();
            if (!isNaN(subTime) && !isNaN(certTime) && certTime >= subTime) {
              actualDays = Math.max(0, Math.round((certTime - subTime) / (1000 * 60 * 60 * 24)));
            }
          }
          const target = targetOverrides['IPC Review'] || DEFAULT_SLA_TARGETS['IPC Review'] || 7;
          return {
            id: `ipc_kpi_${ipc.id}`,
            submittalNo: ipc.paymentNo || 'IPC',
            type: 'IPC Review',
            title: `Interim Payment Certificate (${ipc.paymentNo || 'IPC'}) - Period: ${ipc.period || 'Monthly'}`,
            submittedDate: ipc.submissionDate || '',
            respondedDate: ipc.certificationDate || undefined,
            targetDays: target,
            actualDays: actualDays,
            status: ipc.certificationDate ? 'Approved / Closed' : 'Under Review',
            priority: 'High',
            assignedEngineer: consultant.residentEngineerName || 'Resident Engineer / Quantity Surveyor',
            notes: ipc.remarks || `Financial IPC submitted by Contractor on ${ipc.submissionDate || 'N/A'}${ipc.certificationDate ? ` and Engineer submitted to Employer on ${ipc.certificationDate} (${actualDays} days)` : ' (pending Engineer certification)'}.`
          };
        });

      const nonIpcItems = baseList.filter(s => s.type !== 'IPC Review' && !s.id.startsWith('ipc_kpi_'));
      return [...nonIpcItems, ...ipcSubmittals];
    }

    return baseList;
  }, [consultant.submittalKpis, project.id, project.ipcTracker, consultant.residentEngineerName, targetOverrides]);

  // Compute metrics per submittal category
  const categories = [
    { key: 'RFI', label: 'Technical RFIs', color: 'indigo', icon: Zap },
    { key: 'Material Approval', label: 'Material Approvals', color: 'emerald', icon: FileCheck2 },
    { key: 'IPC Review', label: 'IPC Certifications', color: 'blue', icon: ShieldCheck },
    { key: 'Work Inspection (WIR)', label: 'Work Inspections (WIR)', color: 'purple', icon: CheckCircle2 },
    { key: 'Design Review', label: 'Design Reviews', color: 'amber', icon: BarChart3 }
  ];

  const categoryMetrics = useMemo(() => {
    return categories.map(cat => {
      const matched = submittalsList.filter(s => s.type === cat.key || s.type.toLowerCase() === cat.key.toLowerCase());
      const target = targetOverrides[cat.key] || DEFAULT_SLA_TARGETS[cat.key] || 7;
      const resolved = matched.filter(s => s.actualDays !== undefined && s.actualDays !== null);
      
      const avgDays = resolved.length > 0
        ? Number((resolved.reduce((sum, s) => sum + (s.actualDays || 0), 0) / resolved.length).toFixed(1))
        : 0;
        
      const onTimeCount = resolved.filter(s => (s.actualDays || 0) <= target).length;
      const compliancePct = resolved.length > 0 
        ? Math.round((onTimeCount / resolved.length) * 100) 
        : 100;
        
      const isCompliant = resolved.length > 0 ? avgDays <= target : true;
      const diffPct = (resolved.length > 0 && target > 0) ? Math.round(Math.abs((target - avgDays) / target) * 100) : 0;
      
      // Calculate relative percentage width for mini bar (max reference 20 days)
      const maxRef = Math.max(target * 1.3, avgDays * 1.3, 14);
      const actualWidthPct = resolved.length > 0 ? Math.min(100, Math.max(8, (avgDays / maxRef) * 100)) : 0;
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
  }, [submittalsList, targetOverrides]);

  // Overall summary
  const totalSubmittals = submittalsList.length;
  const evaluatedSubmittals = useMemo(() => {
    return submittalsList.map(s => {
      const target = s.targetDays || targetOverrides[s.type] || 7;
      return { ...s, ...checkSubmittalDelay(s, target) };
    });
  }, [submittalsList, targetOverrides]);

  const pendingCount = evaluatedSubmittals.filter(s => s.isPending).length;
  const overdueCount = evaluatedSubmittals.filter(s => s.isOverdue).length;
  const pendingOverdueCount = evaluatedSubmittals.filter(s => s.isPending && s.isOverdue).length;
  
  const allResolved = useMemo(() => evaluatedSubmittals.filter(s => s.isResolved), [evaluatedSubmittals]);
  const overallAvgDays = allResolved.length > 0
    ? (allResolved.reduce((sum, s) => sum + (s.actualDays || 0), 0) / allResolved.length).toFixed(1)
    : '0.0';
    
  const overallOnTimeCount = evaluatedSubmittals.filter(s => !s.isOverdue).length;
  
  const overallSlaRate = totalSubmittals > 0
    ? Math.round((overallOnTimeCount / totalSubmittals) * 100)
    : 100;

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

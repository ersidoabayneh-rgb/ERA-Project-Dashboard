import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Target,
  Activity,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  BarChart2,
  Filter,
  Grid,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Project, MonthlyProgress } from '../types';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';

interface KpiProgressTrendsChartProps {
  project: Project;
  selectedGroupId?: string;
  onSelectGroupId?: (groupId: string) => void;
  hierarchy?: Array<{ id: string; name: string; wt: number; sscs: any[] }>;
  getGoalScore?: (goalId: string) => number;
}

export interface ProgressTrendPoint {
  month: string;
  target: number;
  actual: number | null;
  targetInc: number;
  actualInc: number | null;
  variance: number | null;
  varianceInc: number | null;
  spi: number | null;
  status: 'Satisfactory' | 'Moderate' | 'Critical' | 'Ahead' | 'On Track' | 'Minor Lag' | 'Critical Lag' | 'Projected';
  isCurrent?: boolean;
}

const GROUP_COLORS: Record<string, string> = {
  all: '#3b82f6',
  G1: '#10b981',
  G2: '#8b5cf6',
  G3: '#f59e0b',
  G4: '#06b6d4',
  G5: '#ec4899',
  G6: '#6366f1',
  G7: '#f97316',
  G8: '#ef4444',
  G9: '#14b8a6',
  G10: '#84cc16',
  G11: '#a855f7',
  G12: '#64748b',
  G13: '#0ea5e9',
  G14: '#d946ef'
};

export default function KpiProgressTrendsChart({
  project,
  selectedGroupId: externalGroupId,
  onSelectGroupId: externalOnSelectGroup,
  hierarchy: externalHierarchy,
  getGoalScore: externalGetGoalScore
}: KpiProgressTrendsChartProps) {
  // Local state for internal group selection if not externally controlled
  const [internalGroupId, setInternalGroupId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cumulative' | 'incremental' | 'comparison'>('cumulative');
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [isDisplayVisible, setIsDisplayVisible] = useState<boolean>(true);

  // Active selected group ID
  const activeGroupId = externalGroupId !== undefined ? externalGroupId : internalGroupId;
  const handleGroupSelect = (groupId: string) => {
    if (externalOnSelectGroup) {
      externalOnSelectGroup(groupId);
    } else {
      setInternalGroupId(groupId);
    }
  };

  // Resolved hierarchy list
  const hierarchy = useMemo(() => {
    if (externalHierarchy && externalHierarchy.length > 0) return externalHierarchy;
    return buildKpiHierarchy(project.contractType || 'DBB', project);
  }, [externalHierarchy, project.contractType, project.id, project.kpiAllocated?.length]);

  // Integrated KPI scores evaluator
  const computeGoalScore = useMemo(() => {
    if (externalGetGoalScore) return externalGetGoalScore;

    const integratedKpis = getIntegratedKpiAllocated(project);
    return (goalId: string): number => {
      const goal = hierarchy.find((g) => g.id === goalId);
      if (!goal) return 0;
      let earnedSum = 0;
      let maxPossibleSum = 0;

      goal.sscs.forEach((ssc) => {
        let earned = 0;
        let maxPossible = 0;
        integratedKpis.forEach((k) => {
          if (k.sscId === ssc.id) {
            if (k.naActive) return;
            const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
            const wt = k.itemWt;
            earned += val * (wt / 100);
            maxPossible += k.max * (wt / 100);
          }
        });
        const sscScore = maxPossible > 0 ? (earned / maxPossible) * 100 : -1;
        if (sscScore >= 0) {
          earnedSum += sscScore * (ssc.wt / 100);
          maxPossibleSum += 100 * (ssc.wt / 100);
        }
      });

      return maxPossibleSum > 0 ? (earnedSum / maxPossibleSum) * 100 : 0;
    };
  }, [externalGetGoalScore, project, hierarchy]);

  // Base raw 6-month monthly slice
  const rawMonthsSlice = useMemo(() => {
    const monthlyList: MonthlyProgress[] = project.monthly || [];
    if (monthlyList.length > 0) {
      let lastActualIdx = -1;
      for (let i = monthlyList.length - 1; i >= 0; i--) {
        const actVal = monthlyList[i].actual;
        if (actVal !== null && actVal !== undefined && actVal !== '' && !isNaN(Number(actVal))) {
          lastActualIdx = i;
          break;
        }
      }
      const targetEndIdx = lastActualIdx !== -1 ? lastActualIdx : Math.min(5, monthlyList.length - 1);
      const startIdx = Math.max(0, targetEndIdx - 5);
      const endIdx = targetEndIdx + 1;
      return {
        slice: monthlyList.slice(startIdx, endIdx),
        startIdx,
        targetEndIdx,
        fullList: monthlyList
      };
    }

    // Fallback: Check progressPlanHistory
    const historyList = project.progressPlanHistory || [];
    if (historyList.length > 0) {
      const recentHistory = [...historyList].slice(-6);
      const syntheticList: MonthlyProgress[] = recentHistory.map((h, i) => ({
        month: h.monthLabel,
        originalPlan: h.eraTodate ?? h.contractorTodate ?? 0,
        revisedPlan: h.eraTodate ?? h.contractorTodate ?? 0,
        actual: h.actualTodate ?? 0
      }));
      return {
        slice: syntheticList,
        startIdx: 0,
        targetEndIdx: syntheticList.length - 1,
        fullList: syntheticList
      };
    }

    // Default synthetic 6 months
    const currentActual = project.physicalProgress || 40.73;
    const currentTarget = project.progressPlan?.era?.todate || (currentActual + 1.5);
    const months = ['Month -5', 'Month -4', 'Month -3', 'Month -2', 'Month -1', 'Current Month'];
    const syntheticList: MonthlyProgress[] = months.map((m, idx) => {
      const step = 5 - idx;
      return {
        month: m,
        originalPlan: Math.max(0, currentTarget - step * 2.2),
        revisedPlan: Math.max(0, currentTarget - step * 2.2),
        actual: Math.max(0, currentActual - step * 2.0)
      };
    });

    return {
      slice: syntheticList,
      startIdx: 0,
      targetEndIdx: 5,
      fullList: syntheticList
    };
  }, [project.monthly, project.progressPlanHistory, project.physicalProgress, project.progressPlan]);

  // Generate 6-month trend points for a given group or overall
  const getTrendDataForGroup = (groupId: string): ProgressTrendPoint[] => {
    const { slice, startIdx, targetEndIdx, fullList } = rawMonthsSlice;
    const currentGoalScore = groupId !== 'all' ? computeGoalScore(groupId) : (project.physicalProgress || 40.73);

    return slice.map((item, idx) => {
      const fullIdx = startIdx + idx;
      const isLatest = fullIdx === targetEndIdx;
      const stepFromLatest = (slice.length - 1) - idx;

      let targetVal = 0;
      let actualVal: number | null = null;
      let targetInc = 0;
      let actualInc: number | null = null;

      if (groupId === 'all') {
        // Physical Progress & Overall Contract Timeline (Baseline Original S-Curve Plan)
        const rawTarget = item.originalPlan ?? item.revisedPlan ?? 0;
        targetVal = Number(rawTarget) || 0;
        const hasAct = item.actual !== null && item.actual !== undefined && item.actual !== '' && !isNaN(Number(item.actual));
        actualVal = hasAct ? Number(item.actual) : null;

        let prevTarget = 0;
        let prevActual: number | null = 0;
        if (fullIdx > 0 && fullList[fullIdx - 1]) {
          const prevItem = fullList[fullIdx - 1];
          prevTarget = Number(prevItem.originalPlan ?? prevItem.revisedPlan ?? 0) || 0;
          const prevHasAct = prevItem.actual !== null && prevItem.actual !== undefined && prevItem.actual !== '' && !isNaN(Number(prevItem.actual));
          prevActual = prevHasAct ? Number(prevItem.actual) : null;
        }

        targetInc = Math.max(0, Number((targetVal - prevTarget).toFixed(2)));
        actualInc = actualVal !== null && prevActual !== null
          ? Math.max(0, Number((actualVal - prevActual).toFixed(2)))
          : actualVal;
      } else if (groupId === 'G2') {
        // G2: Progress vs Elapsed Time / Schedule Efficiency Ratio
        targetVal = 100.0;
        const rawActual = item.actual !== null && !isNaN(Number(item.actual)) ? Number(item.actual) : null;
        const rawTarget = Number(item.revisedPlan ?? item.originalPlan ?? 1) || 1;
        
        if (rawActual !== null && rawTarget > 0) {
          actualVal = Number(Math.min(125, Math.max(0, (rawActual / rawTarget) * 100)).toFixed(2));
        } else {
          actualVal = isLatest ? currentGoalScore : Math.max(0, currentGoalScore - stepFromLatest * 1.8);
        }

        targetInc = 0;
        actualInc = idx > 0 && actualVal !== null ? Number((actualVal - (currentGoalScore - (stepFromLatest + 1) * 1.8)).toFixed(2)) : 0;
      } else {
        // Group-specific KPI performance trajectory (G1, G3 to G14+)
        targetVal = 100.0;
        const growthStep = 1.2 + (parseInt(groupId.replace(/\D/g, '') || '1', 10) % 3) * 0.4;
        const historicalActual = Math.max(0, Math.min(100, currentGoalScore - stepFromLatest * growthStep));
        actualVal = Number(historicalActual.toFixed(2));

        targetInc = 0;
        actualInc = Number(growthStep.toFixed(2));
      }

      const variance = actualVal !== null ? Number((actualVal - targetVal).toFixed(2)) : null;
      const varianceInc = actualInc !== null ? Number((actualInc - targetInc).toFixed(2)) : null;
      const spi = actualVal !== null && targetVal > 0 ? Number((actualVal / targetVal).toFixed(2)) : actualVal !== null && targetVal === 0 ? 1.0 : null;

      let status: ProgressTrendPoint['status'] = 'Projected';
      if (actualVal !== null) {
        // Status threshold:
        // For Risk (G8) reversed: <= 50% -> Satisfactory (Green), 50% to 75% -> Moderate (Yellow), > 75% -> Critical (Red)
        // For standard KPIs: >= 75% -> Satisfactory (Green), 50% to 75% -> Moderate (Yellow), < 50% -> Critical (Red)
        const evalVal = (targetVal > 0 && targetVal !== 100) ? (actualVal / targetVal) * 100 : actualVal;
        const isRiskGroup = groupId === 'G8';
        if (isRiskGroup) {
          if (evalVal <= 50) status = 'Satisfactory';
          else if (evalVal <= 75) status = 'Moderate';
          else status = 'Critical';
        } else {
          if (evalVal >= 75) status = 'Satisfactory';
          else if (evalVal >= 50) status = 'Moderate';
          else status = 'Critical';
        }
      }

      return {
        month: item.month,
        target: Number(targetVal.toFixed(2)),
        actual: actualVal !== null ? Number(actualVal.toFixed(2)) : null,
        targetInc,
        actualInc,
        variance,
        varianceInc,
        spi,
        status,
        isCurrent: isLatest
      };
    });
  };

  // Active trend dataset for the chosen single group (or overall)
  const currentGroupTrendData = useMemo<ProgressTrendPoint[]>(() => {
    return getTrendDataForGroup(activeGroupId);
  }, [activeGroupId, rawMonthsSlice, computeGoalScore]);

  // Aggregate statistics for the selected group
  const activeStats = useMemo(() => {
    if (currentGroupTrendData.length === 0) {
      return {
        latestMonth: 'N/A',
        latestTarget: 0,
        latestActual: 0,
        latestVariance: 0,
        latestSpi: 1.0,
        sixMonthGainTarget: 0,
        sixMonthGainActual: 0,
        avgMonthlyRate: 0,
        avgTargetRate: 0,
        status: 'On Track' as const
      };
    }

    const latest = currentGroupTrendData[currentGroupTrendData.length - 1];
    const first = currentGroupTrendData[0];

    const latestTarget = latest.target;
    const latestActual = latest.actual ?? latest.target;
    const latestVariance = latest.variance ?? Number((latestActual - latestTarget).toFixed(2));
    const latestSpi = latest.spi ?? (latestTarget > 0 ? latestActual / latestTarget : 1.0);

    const firstActual = first.actual ?? first.target;
    const sixMonthGainActual = Number(Math.max(0, latestActual - firstActual).toFixed(2));
    const sixMonthGainTarget = Number(Math.max(0, latestTarget - first.target).toFixed(2));

    const count = currentGroupTrendData.length;
    const avgMonthlyRate = count > 1 ? Number((sixMonthGainActual / (count - 1)).toFixed(2)) : sixMonthGainActual;
    const avgTargetRate = count > 1 ? Number((sixMonthGainTarget / (count - 1)).toFixed(2)) : sixMonthGainTarget;

    let overallStatus: 'Satisfactory' | 'Moderate' | 'Critical' = 'Satisfactory';
    const evalLatest = (latestTarget > 0 && latestTarget !== 100) ? (latestActual / latestTarget) * 100 : latestActual;
    const isRiskGroup = activeGroupId === 'G8';
    if (isRiskGroup) {
      if (evalLatest <= 50) overallStatus = 'Satisfactory';
      else if (evalLatest <= 75) overallStatus = 'Moderate';
      else overallStatus = 'Critical';
    } else {
      if (evalLatest >= 75) overallStatus = 'Satisfactory';
      else if (evalLatest >= 50) overallStatus = 'Moderate';
      else overallStatus = 'Critical';
    }

    return {
      latestMonth: latest.month,
      latestTarget,
      latestActual,
      latestVariance,
      latestSpi: Number(latestSpi.toFixed(2)),
      sixMonthGainTarget,
      sixMonthGainActual,
      avgMonthlyRate,
      avgTargetRate,
      status: overallStatus
    };
  }, [currentGroupTrendData]);

  // Chart series data for Single Group View
  const singleChartPoints = useMemo(() => {
    return currentGroupTrendData.map((d) => {
      if (viewMode === 'incremental') {
        return {
          month: d.month,
          'Target Rate (%)': d.targetInc,
          'Actual Rate (%)': d.actualInc,
          Variance: d.varianceInc,
          raw: d
        };
      }
      return {
        month: d.month,
        'Target Progress (%)': d.target,
        'Actual Progress (%)': d.actual,
        Variance: d.variance,
        raw: d
      };
    });
  }, [currentGroupTrendData, viewMode]);

  // Chart series data for Multi-Group Comparison View
  const comparisonChartPoints = useMemo(() => {
    const months = rawMonthsSlice.slice.map((m) => m.month);
    return months.map((monthStr, idx) => {
      const row: Record<string, any> = { month: monthStr };
      
      // Overall
      const overallData = getTrendDataForGroup('all');
      row['Overall Physical (%)'] = overallData[idx]?.actual ?? 0;

      // Each Group in hierarchy
      hierarchy.forEach((g) => {
        const groupData = getTrendDataForGroup(g.id);
        const groupKey = `${g.id}: ${g.name.split(' ')[0]} (%)`;
        row[groupKey] = groupData[idx]?.actual ?? 0;
      });

      return row;
    });
  }, [rawMonthsSlice, hierarchy]);

  // Group metadata display helpers
  const selectedGroupObj = useMemo(() => {
    if (activeGroupId === 'all') {
      return {
        id: 'all',
        name: 'Overall Project Performance',
        wt: 100,
        score: project.physicalProgress || 40.73,
        color: GROUP_COLORS.all
      };
    }
    const found = hierarchy.find((g) => g.id === activeGroupId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        wt: found.wt,
        score: computeGoalScore(found.id),
        color: GROUP_COLORS[found.id] || '#3b82f6'
      };
    }
    return {
      id: activeGroupId,
      name: `Group ${activeGroupId}`,
      wt: 100,
      score: computeGoalScore(activeGroupId),
      color: '#3b82f6'
    };
  }, [activeGroupId, hierarchy, computeGoalScore, project.physicalProgress]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="p-1.5 rounded-xl text-white shadow-3xs"
              style={{ backgroundColor: selectedGroupObj.color }}
            >
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              Target vs Actual Progress Trends
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                Last 6 Months
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>Evaluating trajectory for:</span>
            <span className="font-bold text-slate-700 dark:text-zinc-200 underline decoration-blue-400 underline-offset-2">
              {activeGroupId === 'all' ? 'Overall Project (All KPI Groups)' : `${selectedGroupObj.id}: ${selectedGroupObj.name}`}
            </span>
            <span className="font-mono text-2xs px-1.5 py-0.25 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-zinc-300 font-bold">
              Current Score: {selectedGroupObj.score.toFixed(2)}%
            </span>
          </p>
        </div>

        {/* View Mode Switcher and Table Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-2xs font-bold">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Cumulative (%)
            </button>
            <button
              onClick={() => setViewMode('incremental')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'incremental'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Monthly Rate (%)
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'comparison'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Grid className="w-3 h-3" />
              All Groups Matrix
            </button>
          </div>

          <button
            onClick={() => setShowDataTable(!showDataTable)}
            className="px-2.5 py-1.5 text-2xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition flex items-center gap-1 cursor-pointer"
          >
            {showDataTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showDataTable ? 'Hide Data' : 'View Data'}</span>
          </button>

          {/* Hide/Show Whole Display Button */}
          <button
            onClick={() => setIsDisplayVisible(!isDisplayVisible)}
            className="px-3 py-1.5 text-2xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title={isDisplayVisible ? "Hide Target vs Actual Progress Trends display" : "Show Target vs Actual Progress Trends display"}
          >
            {isDisplayVisible ? <EyeOff className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-blue-500" />}
            <span>{isDisplayVisible ? 'Hide Display' : 'Show Display'}</span>
          </button>
        </div>
      </div>

      {isDisplayVisible && (
        <>

      {/* Interactive Scope & KPI Category Group Selector Bar */}
      <div className="bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/70 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-500" /> Select KPI Trend Scope
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {hierarchy.length} Category Groups Available
          </span>
        </div>

        {/* Scrollable Group Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {/* Overall Button */}
          <button
            onClick={() => handleGroupSelect('all')}
            className={`px-3 py-1.5 rounded-xl text-2xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeGroupId === 'all'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Overall Project</span>
            <span
              className={`text-[9px] px-1.5 py-0.25 rounded font-mono ${
                activeGroupId === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-zinc-300'
              }`}
            >
              {(project.physicalProgress || 40.73).toFixed(2)}%
            </span>
          </button>

          {/* Individual Hierarchy Groups */}
          {hierarchy.map((goal) => {
            const score = computeGoalScore(goal.id);
            const isSelected = activeGroupId === goal.id;
            const groupColor = GROUP_COLORS[goal.id] || '#3b82f6';

            return (
              <button
                key={goal.id}
                onClick={() => handleGroupSelect(goal.id)}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs ring-2 ring-blue-500/30 font-extrabold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
                <span>{goal.id}: {goal.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.25 rounded font-mono ${
                    isSelected
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  {score.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Telemetry Metric Cards for Active Selected Scope */}
      {viewMode !== 'comparison' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Planned Target */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <Target className="w-3 h-3 text-blue-500" /> Planned Target
              </span>
              <span className="font-mono text-[9px] text-slate-400">{activeStats.latestMonth}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
              {activeStats.latestTarget.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Target 6-mo gain: +{activeStats.sixMonthGainTarget.toFixed(2)}%
            </div>
          </div>

          {/* Card 2: Executed Actual / Score */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Executed Actual
              </span>
              <span className="font-mono text-[9px] text-slate-400">{activeStats.latestMonth}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {activeStats.latestActual.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Actual 6-mo gain: +{activeStats.sixMonthGainActual.toFixed(2)}%
            </div>
          </div>

          {/* Card 3: Progress Variance / Slippage */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <Activity className="w-3 h-3 text-amber-500" /> Score Variance
              </span>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded ${
                  activeStats.latestVariance >= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                {activeStats.latestVariance >= 0 ? 'Ahead' : 'Behind'}
              </span>
            </div>
            <div
              className={`text-base sm:text-lg font-black font-mono ${
                activeStats.latestVariance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {activeStats.latestVariance >= 0 ? `+${activeStats.latestVariance.toFixed(2)}%` : `${activeStats.latestVariance.toFixed(2)}%`}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Avg Velocity: {activeStats.avgMonthlyRate.toFixed(2)}%/mo
            </div>
          </div>

          {/* Card 4: Schedule / Efficiency Performance Index (SPI) */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <TrendingUp className="w-3 h-3 text-indigo-500" /> 6-Mo SPI Ratio
              </span>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.25 rounded ${
                  activeStats.latestSpi >= 1.0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : activeStats.latestSpi >= 0.9
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                {activeStats.latestSpi >= 1.0 ? 'On Track' : activeStats.latestSpi >= 0.9 ? 'Moderate' : 'Critical'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
              {activeStats.latestSpi.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Weight Contribution: {selectedGroupObj.wt}%
            </div>
          </div>
        </div>
      )}

      {/* Main Line Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'comparison' ? (
            <LineChart data={comparisonChartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={42}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[220px]">
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-700">
                          <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {label} (All KPI Groups)
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] font-mono max-h-48 overflow-y-auto pr-1">
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between items-center gap-2">
                              <span className="font-sans text-slate-300 truncate flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                {entry.name.replace(' (%)', '')}:
                              </span>
                              <span className="font-bold shrink-0" style={{ color: entry.color }}>
                                {Number(entry.value).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: '6px' }}
              />
              {/* Overall Line */}
              <Line
                name="Overall Physical (%)"
                type="monotone"
                dataKey="Overall Physical (%)"
                stroke={GROUP_COLORS.all}
                strokeWidth={3}
                dot={{ r: 4, fill: GROUP_COLORS.all, strokeWidth: 1.5, stroke: '#fff' }}
              />
              {/* Individual Group Lines */}
              {hierarchy.slice(0, 6).map((g) => {
                const groupKey = `${g.id}: ${g.name.split(' ')[0]} (%)`;
                const color = GROUP_COLORS[g.id] || '#64748b';
                return (
                  <Line
                    key={g.id}
                    name={groupKey}
                    type="monotone"
                    dataKey={groupKey}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={g.id === 'G2' || g.id === 'G3' ? '3 3' : undefined}
                    dot={{ r: 3, fill: color }}
                  />
                );
              })}
            </LineChart>
          ) : (
            <LineChart data={singleChartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={42}
                unit="%"
                domain={viewMode === 'cumulative' ? [0, 'auto'] : ['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload.raw as ProgressTrendPoint;
                    return (
                      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[210px]">
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-700">
                          <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {label}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.25 rounded uppercase tracking-wider ${
                              dataPoint.status === 'Satisfactory' || dataPoint.status === 'Ahead' || dataPoint.status === 'On Track'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : dataPoint.status === 'Moderate' || dataPoint.status === 'Minor Lag'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : dataPoint.status === 'Critical' || dataPoint.status === 'Critical Lag'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                            }`}
                          >
                            {dataPoint.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] font-mono">
                          <div className="text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                            Scope: <span className="text-slate-200 font-bold">{selectedGroupObj.id === 'all' ? 'Overall Project' : `${selectedGroupObj.id} - ${selectedGroupObj.name}`}</span>
                          </div>
                          <div className="flex justify-between items-center text-blue-400">
                            <span className="font-sans text-slate-400">Target {viewMode === 'cumulative' ? 'Plan' : 'Rate'}:</span>
                            <span className="font-bold">
                              {viewMode === 'cumulative' ? `${dataPoint.target.toFixed(2)}%` : `+${dataPoint.targetInc.toFixed(2)}%`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400">
                            <span className="font-sans text-slate-400">Actual {viewMode === 'cumulative' ? 'Executed' : 'Rate'}:</span>
                            <span className="font-bold">
                              {dataPoint.actual !== null
                                ? viewMode === 'cumulative'
                                  ? `${dataPoint.actual.toFixed(2)}%`
                                  : `+${(dataPoint.actualInc || 0).toFixed(2)}%`
                                : 'Not Logged'}
                            </span>
                          </div>
                          {dataPoint.variance !== null && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                              <span className="font-sans text-slate-400">Variance:</span>
                              <span
                                className={`font-bold ${
                                  (viewMode === 'cumulative' ? dataPoint.variance : dataPoint.varianceInc || 0) >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {(viewMode === 'cumulative' ? dataPoint.variance : dataPoint.varianceInc || 0) >= 0 ? '+' : ''}
                                {(viewMode === 'cumulative' ? dataPoint.variance : dataPoint.varianceInc || 0).toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {dataPoint.spi !== null && (
                            <div className="flex justify-between items-center text-indigo-300">
                              <span className="font-sans text-slate-400">SPI Efficiency:</span>
                              <span className="font-bold">{dataPoint.spi.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '6px' }}
              />
              {viewMode === 'incremental' && (
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              )}
              <Line
                name={viewMode === 'cumulative' ? 'Target Plan (%)' : 'Target Rate (%)'}
                type="monotone"
                dataKey={viewMode === 'cumulative' ? 'Target Progress (%)' : 'Target Rate (%)'}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              />
              <Line
                name={viewMode === 'cumulative' ? 'Actual Executed (%)' : 'Actual Rate (%)'}
                type="monotone"
                dataKey={viewMode === 'cumulative' ? 'Actual Progress (%)' : 'Actual Rate (%)'}
                stroke={selectedGroupObj.color || '#10b981'}
                strokeWidth={3}
                dot={{ r: 4.5, fill: selectedGroupObj.color || '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 7, fill: selectedGroupObj.color || '#059669', strokeWidth: 2, stroke: '#fff' }}
                connectNulls={true}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Collapsible 6-Month Data Breakdown Table */}
      {showDataTable && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto"
        >
          <table className="w-full text-left text-2xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/60 dark:border-slate-800">
                <th className="p-2">Month Period</th>
                <th className="p-2">Scope</th>
                <th className="p-2">Target Plan (%)</th>
                <th className="p-2">Actual Exec (%)</th>
                <th className="p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentGroupTrendData.map((row, idx) => (
                <tr
                  key={row.month || idx}
                  className={`hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition ${
                    row.isCurrent ? 'bg-blue-50/30 dark:bg-blue-950/20 font-bold' : ''
                  }`}
                >
                  <td className="p-2 font-mono text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                    {row.month}
                    {row.isCurrent && (
                      <span className="text-[8px] uppercase px-1 py-0.25 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        Latest
                      </span>
                    )}
                  </td>
                  <td className="p-2 font-medium text-slate-600 dark:text-slate-400">
                    {selectedGroupObj.id === 'all' ? 'Overall' : selectedGroupObj.id}
                  </td>
                  <td className="p-2 font-mono text-blue-600 dark:text-blue-400">
                    {row.target.toFixed(2)}%
                  </td>
                  <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400">
                    {row.actual !== null ? `${row.actual.toFixed(2)}%` : '-'}
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`inline-block text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                        row.status === 'Satisfactory' || row.status === 'Ahead' || row.status === 'On Track'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                          : row.status === 'Moderate' || row.status === 'Minor Lag'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                          : row.status === 'Critical' || row.status === 'Critical Lag'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* KPI Automation Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 text-2xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            <strong>Scope Telemetry Integration:</strong> Selected scope <strong>{selectedGroupObj.id === 'all' ? 'Overall Contract Matrix' : `${selectedGroupObj.id}: ${selectedGroupObj.name}`}</strong> is continuously updated from monthly milestones & ERA evaluation criteria.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
          <span className="text-blue-600 dark:text-blue-400 font-bold">Planned Target: {activeStats.latestTarget.toFixed(2)}%</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Executed Score: {activeStats.latestActual.toFixed(2)}%</span>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

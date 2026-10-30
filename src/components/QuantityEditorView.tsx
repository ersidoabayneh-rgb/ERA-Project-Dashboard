import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Sliders, CheckSquare, Activity, AlertCircle, Link2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Project, QtyItem } from '../types';
import { matchPavementLayer, syncQuantitiesWithLinear, PAVEMENT_LAYERS, getLinearLayerTotals } from '../utils/quantityLinearSync';

interface CriticalQtyAnalysis {
  name: string;
  unit: string;
  designValue: number;
  plannedValue: number;
  actualValue: number;
  execRatio: number; // actual / design %
  planRatio: number; // plan / design %
  variance: number; // actual - plan
  criticalFinding: string;
}

function evaluateEngineeringQuantities(quantities: QtyItem[]): {
  items: CriticalQtyAnalysis[];
  summaryNarrative: string;
} {
  const analysisItems: CriticalQtyAnalysis[] = [];
  let totalsCount = 0;
  let behindCount = 0;
  let aheadCount = 0;
  let severeSlippageCount = 0;

  (quantities || []).forEach(q => {
    // Extract UoM (unit of measurement) from parentheses
    const match = q.name.match(/^(.*?)\s*\((.*?)\)$/);
    const displayName = match ? match[1].trim() : q.name;
    const unit = match ? match[2].trim() : 'Units';

    const design = q.design || 0;
    const plan = q.plan || 0;
    const actual = q.exec || 0;

    const execRatio = design > 0 ? (actual / design) * 100 : 0;
    const planRatio = design > 0 ? (plan / design) * 100 : 0;
    const variance = actual - plan;
    const varianceRatio = plan > 0 ? (variance / plan) * 100 : 0;

    let finding = '';
    if (plan === 0 && actual === 0) {
      finding = `No activity recorded for this ${unit}-measured scope.`;
    } else if (variance < 0) {
      behindCount++;
      if (varianceRatio < -20) {
        severeSlippageCount++;
        finding = `Severe deficit of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% slippage) vs work program plan. Urgent mobilization required.`;
      } else {
        finding = `Moderate lag of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% variance). Target for acceleration.`;
      }
    } else {
      aheadCount++;
      if (varianceRatio > 20) {
        finding = `Aggressive progress exceeding plan by ${variance.toFixed(2)} ${unit} (+${varianceRatio.toFixed(2)}%). Review quality control of quick output.`;
      } else {
        finding = `Healthy progress alignment. Executed ${actual.toFixed(2)} of ${plan.toFixed(2)} planned ${unit}.`;
      }
    }

    analysisItems.push({
      name: displayName,
      unit,
      designValue: design,
      plannedValue: plan,
      actualValue: actual,
      execRatio,
      planRatio,
      variance,
      criticalFinding: finding
    });
    totalsCount++;
  });

  // Synthesize a detailed diagnostic narrative
  let summaryNarrative = '';
  if (totalsCount === 0) {
    summaryNarrative = "No engineering quantities registry was found. Unit of measurement critical evaluation is inconclusive.";
  } else {
    summaryNarrative = `A comprehensive audit was performed across ${totalsCount} key physical deliverables. `;
    if (severeSlippageCount > 0) {
      summaryNarrative += `Critical concern: ${severeSlippageCount} scope items exhibit severe execution deficits exceeding 20% of their planned volumes. `;
    }
    summaryNarrative += `Analysis shows ${aheadCount} items are meeting or exceeding scheduled targets, while ${behindCount} items are lagging. `;
    
    // Check specific units
    const kmItems = analysisItems.filter(i => i.unit.toLowerCase() === 'km');
    const kmLagging = kmItems.filter(i => i.variance < 0);
    if (kmLagging.length > 0) {
      summaryNarrative += `Linear layer completion (measured in Km) shows a critical bottleneck. Out of ${kmItems.length} linear layers, ${kmLagging.length} are currently lagging behind plan, which indicates subgrade, basecourse, or asphalt paving speed constraints. `;
    }

    const m3Items = analysisItems.filter(i => i.unit.toLowerCase() === 'm3');
    const m3Lagging = m3Items.filter(i => i.variance < 0);
    if (m3Lagging.length > 0) {
      summaryNarrative += `Earthwork and bulk material processing (measured in M3) is lagging by a cumulative total of ${m3Lagging.reduce((sum, item) => sum + Math.abs(item.variance), 0).toFixed(0)} M3. This lag is indicative of equipment bottlenecks or suboptimal material extraction rates. `;
    } else if (m3Items.length > 0) {
      summaryNarrative += `Earthwork extraction and filling operations (measured in M3) show satisfactory volume execution rates. `;
    }
    
    summaryNarrative += `Auditorial recommendation: Re-align equipment rosters to mitigate the ${behindCount} lagging indicators and optimize site clearing (Ha) or structural culvert (No.) mobilization.`;
  }

  return {
    items: analysisItems,
    summaryNarrative
  };
}

interface QuantityEditorViewProps {
  project: Project;
  onUpdateQuantities: (quantities: QtyItem[]) => void;
  onUpdateProject?: (project: Project, sectionName: string) => void;
}

export default function QuantityEditorView({ project, onUpdateQuantities, onUpdateProject }: QuantityEditorViewProps) {
  const quantities = project.quantities || [];
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleFieldChange = (idx: number, field: keyof QtyItem, value: any) => {
    const updated = quantities.map((q, i) => {
      if (i === idx) {
        return {
          ...q,
          [field]: field === 'name' ? value : (parseFloat(value.toString().replace(/,/g, '')) || 0)
        };
      }
      return q;
    });
    onUpdateQuantities(updated);
  };

  const handleManualSyncWithLinear = () => {
    const synced = syncQuantitiesWithLinear(project);
    onUpdateQuantities(synced);
    setSyncFeedback('Pavement quantities synchronized with Linear Diagram baseline & actuals');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleAddQtyRow = () => {
    const newQty: QtyItem = {
      name: 'New Work Quantity Item',
      design: 0,
      plan: 0,
      exec: 0
    };
    onUpdateQuantities([...quantities, newQty]);
  };

  const handleRemoveLastRow = () => {
    if (quantities.length > 0) {
      onUpdateQuantities(quantities.slice(0, -1));
    }
  };

  const formatMoney = (v: number) => 
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);

  return (
    <div className="space-y-4">
      {/* Header element */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            Engineering Quantities & Construction Conformance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define design volumes vs planned scheduling, against actually completed milestones. This data correlates directly with the dashboard charts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={handleManualSyncWithLinear}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
            title="Explicitly synchronize Subgrade, Capping, Sub-base, Base-Course, and Asphalt Concrete with Linear Diagram"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync with Linear Diagram
          </button>
          <button
            onClick={handleAddQtyRow}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Qty Row
          </button>
          <button
            onClick={handleRemoveLastRow}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Last
          </button>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncFeedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Dynamic Linking Information Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            <strong className="text-indigo-700 dark:text-indigo-300">Bidirectional Alignment Active:</strong> Subgrade, Capping, Sub-base, Base-Course, and Asphalt Concrete Program Scheduled Plans and Actual Progress are dynamically linked with the Linear Diagram page.
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-bold bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
          5 Layers Aligned
        </div>
      </div>

      {/* Spreadsheet Tables */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold sticky top-0 z-10">
                <th className="p-3 w-16 text-center">Row</th>
                <th className="p-3">Quantified Engineering Item Description</th>
                <th className="p-3 w-32 text-right">Design Drawings Qty</th>
                <th className="p-3 w-32 text-right">Program Scheduled Plan</th>
                <th className="p-3 w-32 text-right">To-Date Contractor Executed</th>
                <th className="p-3 w-28 text-center">% Plan Conformance</th>
                <th className="p-3 w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
              {quantities.map((q, idx) => {
                const layerKey = matchPavementLayer(q.name);
                const isLinkedLayer = Boolean(layerKey);

                const planPct = q.plan > 0 ? (q.exec / q.plan) * 100 : 0;
                let pctColor = 'text-slate-500';
                if (planPct >= 95) {
                  pctColor = 'text-emerald-600 dark:text-emerald-400 font-black';
                } else if (planPct >= 75) {
                  pctColor = 'text-amber-500 font-bold';
                } else {
                  pctColor = 'text-rose-500 font-bold';
                }

                return (
                  <tr key={idx} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 ${isLinkedLayer ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={q.name}
                            onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold px-2.5 py-1 rounded-lg text-slate-800 dark:text-slate-100"
                          />
                          {isLinkedLayer && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap"
                              title="Dynamically synchronized with Linear Diagram baseline plan and actual progress"
                            >
                              <Link2 className="w-3 h-3" />
                              Linked to Linear Diagram
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="text"
                        value={formatMoney(q.design)}
                        onChange={(e) => handleFieldChange(idx, 'design', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right font-mono text-xs px-2.5 py-1 rounded-lg"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="relative">
                        <input
                          type="text"
                          value={formatMoney(q.plan)}
                          onChange={(e) => handleFieldChange(idx, 'plan', e.target.value)}
                          className={`w-full bg-slate-50 dark:bg-slate-900 border ${isLinkedLayer ? 'border-amber-300 dark:border-amber-700 font-bold' : 'border-slate-200 dark:border-slate-700'} text-right font-mono text-xs px-2.5 py-1 rounded-lg text-amber-600 dark:text-amber-400`}
                          title={isLinkedLayer ? 'Program Scheduled Plan (Updates Linear Diagram Plan Baseline)' : 'Program Scheduled Plan'}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="relative">
                        <input
                          type="text"
                          value={formatMoney(q.exec)}
                          onChange={(e) => handleFieldChange(idx, 'exec', e.target.value)}
                          className={`w-full bg-slate-50 dark:bg-slate-900 border ${isLinkedLayer ? 'border-blue-300 dark:border-blue-700 font-bold' : 'border-slate-200 dark:border-slate-700'} text-right font-mono text-blue-600 dark:text-blue-400 font-bold text-xs px-2.5 py-1 rounded-lg`}
                          title={isLinkedLayer ? 'To-Date Contractor Executed (Updates Linear Diagram Actual Progress)' : 'To-Date Contractor Executed'}
                        />
                      </div>
                    </td>
                    <td className={`p-3 text-center font-mono ${pctColor}`}>
                      {planPct.toFixed(2)}%
                    </td>
                    <td className="p-3 text-center animate-pulse">
                      <button
                        onClick={() => onUpdateQuantities(quantities.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

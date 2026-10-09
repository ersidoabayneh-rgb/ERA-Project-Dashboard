import React, { useState } from 'react';
import { 
  Ruler, 
  Navigation, 
  Plus, 
  Trash2, 
  Link2, 
  Calculator, 
  Sliders, 
  Sparkles,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Info
} from 'lucide-react';
import { Project, LinearData, LinearPlanData, LinearLayerPlan } from '../types';
import { 
  parseStation, 
  generateLinearData, 
  generateSpurLinearData, 
  generateEmptyLinearData,
  generateLinearPlanData,
  generateSpurLinearPlanData
} from '../data/defaultProject';

interface LinearDiagramViewProps {
  project: Project;
  onUpdateLinear: (linear: LinearData) => void;
  onUpdateLinearSpur?: (linearSpur: LinearData) => void;
  onUpdateLinearPlan?: (linearPlan: LinearPlanData) => void;
  onUpdateLinearPlanSpur?: (linearPlanSpur: LinearPlanData) => void;
  onUpdateSpurLength?: (spurRoadLengthKm: number) => void;
  onUpdateMainLength?: (mainRoadLengthKm: number) => void;
  onUpdateProjectLength?: (lengthKm: number) => void;
  onToggleCappingLayer?: (hasCappingLayer: boolean) => void;
}

export function formatStation(km: number): string {
  if (isNaN(km) || km < 0) return 'Km 00+000';
  const kmPart = Math.floor(km);
  const mPart = Math.round((km - kmPart) * 1000);
  return `Km ${String(kmPart).padStart(2, '0')}+${String(mPart).padStart(3, '0')}`;
}

export default function LinearDiagramView({
  project,
  onUpdateLinear,
  onUpdateLinearSpur,
  onUpdateLinearPlan,
  onUpdateLinearPlanSpur,
  onUpdateSpurLength,
  onUpdateMainLength,
  onUpdateProjectLength,
  onToggleCappingLayer
}: LinearDiagramViewProps) {
  // Road & View State
  const [roadType, setRoadType] = useState<'main' | 'spur'>('main');
  const [activeTab, setActiveTab] = useState<'segments' | 'planSettings'>('segments');

  // Existing Linear Execution Data
  const mainLinear = project.linear || (project.id === 'proj_default' ? generateLinearData() : generateEmptyLinearData());
  const spurLinear = project.linearSpur || (project.id === 'proj_default' ? generateSpurLinearData() : generateEmptyLinearData());

  // Existing or Default Linear Progress Plans
  const mainLinearPlan = project.linearPlan || (project.id === 'proj_default' ? generateLinearPlanData() : {
    baselineName: 'Approved Initial Baseline Program',
    baselineDate: new Date().toISOString().split('T')[0],
    subgrade: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    capping: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    subbase: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    basecourse: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    asphalt: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
  });

  const spurLinearPlan = project.linearPlanSpur || (project.id === 'proj_default' ? generateSpurLinearPlanData() : {
    baselineName: 'Spur Road Approved Baseline Program',
    baselineDate: new Date().toISOString().split('T')[0],
    subgrade: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    capping: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    subbase: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    basecourse: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
    asphalt: { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' },
  });

  // Interconnected Project Lengths
  const totalProjectKm = project.lengthKm ?? (project.id === 'proj_default' ? 65 : 0);
  const spurRoadTargetKm = project.spurRoadLengthKm ?? (project.id === 'proj_default' ? 8.8 : 0);
  const mainRoadTargetKm = Math.max(0, Number((totalProjectKm - spurRoadTargetKm).toFixed(2)));

  const activeLinear = roadType === 'main' ? mainLinear : spurLinear;
  const activePlan = roadType === 'main' ? mainLinearPlan : spurLinearPlan;
  const activeTargetKm = roadType === 'main' ? mainRoadTargetKm : spurRoadTargetKm;

  // Sections definitions
  const sections: { id: keyof LinearData; name: string; color: string; hex: string; bgSoft: string; border: string; layerNo: number }[] = [
    { id: 'subgrade', name: 'Sub-Grade', color: 'bg-amber-800', hex: '#92400e', bgSoft: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/40', layerNo: 1 },
    ...(project.hasCappingLayer !== false ? [{ id: 'capping' as keyof LinearData, name: 'Capping Layers', color: 'bg-yellow-700', hex: '#a16207', bgSoft: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800/40', layerNo: 2 }] : []),
    { id: 'subbase', name: 'Sub-Base', color: 'bg-zinc-500', hex: '#71717a', bgSoft: 'bg-zinc-100 dark:bg-zinc-900', border: 'border-zinc-300 dark:border-zinc-700', layerNo: 3 },
    { id: 'basecourse', name: 'Base-Course', color: 'bg-slate-600', hex: '#475569', bgSoft: 'bg-slate-100 dark:bg-slate-900', border: 'border-slate-300 dark:border-slate-700', layerNo: 4 },
    { id: 'asphalt', name: 'Asphalt Concrete (AC)', color: 'bg-indigo-950', hex: '#1e1b4b', bgSoft: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800/40', layerNo: 5 }
  ];

  // Helper to update linear progress plan
  const handleUpdatePlanLayer = (layer: keyof LinearData, field: keyof LinearLayerPlan, value: any) => {
    const currentLayerPlan = activePlan[layer] || { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' };
    let parsedVal = value;

    if (field === 'plannedKm') {
      const rawNum = parseFloat(value) || 0;
      // Plan cannot be greater than project length (activeTargetKm)
      let clamped = Math.min(activeTargetKm, Math.max(0, rawNum));

      // Once a plan is entered, the next plan should be greater than or equal to the previous plan
      const secIdx = sections.findIndex(s => s.id === layer);
      if (secIdx > 0) {
        const prevSecId = sections[secIdx - 1].id;
        const prevKm = activePlan[prevSecId]?.plannedKm || 0;
        if (clamped < prevKm) {
          clamped = prevKm;
        }
      }
      parsedVal = clamped;
    }

    const updatedLayerPlan: LinearLayerPlan = {
      ...currentLayerPlan,
      [field]: parsedVal
    };

    if (field === 'plannedKm') {
      updatedLayerPlan.toStation = formatStation(Number(parsedVal));
    }

    const updatedPlan: LinearPlanData = {
      ...activePlan,
      [layer]: updatedLayerPlan
    };

    if (roadType === 'main') {
      if (onUpdateLinearPlan) onUpdateLinearPlan(updatedPlan);
    } else {
      if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updatedPlan);
    }
  };

  // Auto-calculate realistic linear baseline plan from project planned progress
  const handleAutoCalculatePlan = () => {
    const plannedPct = project.progressPlan?.contractor?.todate ?? project.progressPlan?.era?.todate ?? 45;
    const targetLength = activeTargetKm;

    // Highway construction layer sequencing percentages
    const subgradePlanKm = Number(Math.min(targetLength, targetLength * Math.min(1, (plannedPct * 1.3) / 100)).toFixed(2));
    const cappingPlanKm = Number(Math.min(targetLength, targetLength * Math.min(1, (plannedPct * 1.15) / 100)).toFixed(2));
    const subbasePlanKm = Number(Math.min(targetLength, targetLength * Math.min(1, (plannedPct * 1.0) / 100)).toFixed(2));
    const basecoursePlanKm = Number(Math.min(targetLength, targetLength * Math.max(0, (plannedPct - 8) / 100)).toFixed(2));
    const asphaltPlanKm = Number(Math.min(targetLength, targetLength * Math.max(0, (plannedPct - 18) / 100)).toFixed(2));

    const updatedPlan: LinearPlanData = {
      ...activePlan,
      baselineName: `Auto-Derived from Project Baseline (${plannedPct.toFixed(1)}%)`,
      baselineDate: new Date().toISOString().split('T')[0],
      subgrade: { plannedKm: subgradePlanKm, fromStation: 'Km 00+000', toStation: formatStation(subgradePlanKm), notes: 'Sequenced from master CPM schedule' },
      capping: { plannedKm: cappingPlanKm, fromStation: 'Km 00+000', toStation: formatStation(cappingPlanKm), notes: 'Sequenced from master CPM schedule' },
      subbase: { plannedKm: subbasePlanKm, fromStation: 'Km 00+000', toStation: formatStation(subbasePlanKm), notes: 'Sequenced from master CPM schedule' },
      basecourse: { plannedKm: basecoursePlanKm, fromStation: 'Km 00+000', toStation: formatStation(basecoursePlanKm), notes: 'Sequenced from master CPM schedule' },
      asphalt: { plannedKm: asphaltPlanKm, fromStation: 'Km 00+000', toStation: formatStation(asphaltPlanKm), notes: 'Sequenced from master CPM schedule' },
      auditorNotes: `Baseline synchronized with overall project schedule (${plannedPct.toFixed(1)}% target).`,
      auditDirective: 'Maintain minimum 2.0 Km structural buffer between asphalt paver and preceding basecourse layer.'
    };

    if (roadType === 'main') {
      if (onUpdateLinearPlan) onUpdateLinearPlan(updatedPlan);
    } else {
      if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updatedPlan);
    }
  };

  // Auto-calculate realistic linear baseline plan for BOTH Main and Spur roads
  const handleAutoCalculateBothPlans = () => {
    const plannedPct = project.progressPlan?.contractor?.todate ?? project.progressPlan?.era?.todate ?? 45;

    // Main road calculation
    const mainLength = mainRoadTargetKm;
    const mainSubgrade = Number(Math.min(mainLength, mainLength * Math.min(1, (plannedPct * 1.3) / 100)).toFixed(2));
    const mainCapping = Number(Math.min(mainLength, mainLength * Math.min(1, (plannedPct * 1.15) / 100)).toFixed(2));
    const mainSubbase = Number(Math.min(mainLength, mainLength * Math.min(1, (plannedPct * 1.0) / 100)).toFixed(2));
    const mainBasecourse = Number(Math.min(mainLength, mainLength * Math.max(0, (plannedPct - 8) / 100)).toFixed(2));
    const mainAsphalt = Number(Math.min(mainLength, mainLength * Math.max(0, (plannedPct - 18) / 100)).toFixed(2));

    const updatedMainPlan: LinearPlanData = {
      ...mainLinearPlan,
      baselineName: `Main Road Approved Baseline Program (${plannedPct.toFixed(1)}%)`,
      baselineDate: new Date().toISOString().split('T')[0],
      subgrade: { plannedKm: mainSubgrade, fromStation: 'Km 00+000', toStation: formatStation(mainSubgrade), notes: 'Sequenced from master CPM schedule' },
      capping: { plannedKm: mainCapping, fromStation: 'Km 00+000', toStation: formatStation(mainCapping), notes: 'Sequenced from master CPM schedule' },
      subbase: { plannedKm: mainSubbase, fromStation: 'Km 00+000', toStation: formatStation(mainSubbase), notes: 'Sequenced from master CPM schedule' },
      basecourse: { plannedKm: mainBasecourse, fromStation: 'Km 00+000', toStation: formatStation(mainBasecourse), notes: 'Sequenced from master CPM schedule' },
      asphalt: { plannedKm: mainAsphalt, fromStation: 'Km 00+000', toStation: formatStation(mainAsphalt), notes: 'Sequenced from master CPM schedule' },
      auditorNotes: `Main road baseline synchronized with overall project schedule (${plannedPct.toFixed(1)}% target).`,
      auditDirective: 'Maintain minimum 2.0 Km structural buffer between asphalt paver and preceding basecourse layer.'
    };

    // Spur road calculation
    const spurLength = spurRoadTargetKm;
    const spurSubgrade = Number(Math.min(spurLength, spurLength * Math.min(1, (plannedPct * 1.3) / 100)).toFixed(2));
    const spurCapping = Number(Math.min(spurLength, spurLength * Math.min(1, (plannedPct * 1.15) / 100)).toFixed(2));
    const spurSubbase = Number(Math.min(spurLength, spurLength * Math.min(1, (plannedPct * 1.0) / 100)).toFixed(2));
    const spurBasecourse = Number(Math.min(spurLength, spurLength * Math.max(0, (plannedPct - 8) / 100)).toFixed(2));
    const spurAsphalt = Number(Math.min(spurLength, spurLength * Math.max(0, (plannedPct - 18) / 100)).toFixed(2));

    const updatedSpurPlan: LinearPlanData = {
      ...spurLinearPlan,
      baselineName: `Spur Road Approved Baseline Program (${plannedPct.toFixed(1)}%)`,
      baselineDate: new Date().toISOString().split('T')[0],
      subgrade: { plannedKm: spurSubgrade, fromStation: 'Km 00+000', toStation: formatStation(spurSubgrade), notes: 'Sequenced from master CPM schedule' },
      capping: { plannedKm: spurCapping, fromStation: 'Km 00+000', toStation: formatStation(spurCapping), notes: 'Sequenced from master CPM schedule' },
      subbase: { plannedKm: spurSubbase, fromStation: 'Km 00+000', toStation: formatStation(spurSubbase), notes: 'Sequenced from master CPM schedule' },
      basecourse: { plannedKm: spurBasecourse, fromStation: 'Km 00+000', toStation: formatStation(spurBasecourse), notes: 'Sequenced from master CPM schedule' },
      asphalt: { plannedKm: spurAsphalt, fromStation: 'Km 00+000', toStation: formatStation(spurAsphalt), notes: 'Sequenced from master CPM schedule' },
      auditorNotes: `Spur road baseline synchronized with overall project schedule (${plannedPct.toFixed(1)}% target).`,
      auditDirective: 'Maintain minimum buffer on spur road link.'
    };

    if (onUpdateLinearPlan) onUpdateLinearPlan(updatedMainPlan);
    if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updatedSpurPlan);
  };

  // Handle station segments edit
  const handleFieldChange = (section: keyof LinearData, idx: number, field: 'from' | 'to', value: string) => {
    const sectionData = [...(activeLinear[section] || [])];
    if (sectionData[idx]) {
      const item = { ...sectionData[idx], [field]: value };
      const fVal = field === 'from' ? value : item.from;
      const tVal = field === 'to' ? value : item.to;
      item.exec = Math.max(0, parseStation(tVal) - parseStation(fVal));
      sectionData[idx] = item;
      
      const updatedLinear = {
        ...activeLinear,
        [section]: sectionData
      };

      if (roadType === 'main') {
        onUpdateLinear(updatedLinear);
      } else if (onUpdateLinearSpur) {
        onUpdateLinearSpur(updatedLinear);
      } else {
        onUpdateLinear(updatedLinear);
      }
    }
  };

  const handleAddRow = (section: keyof LinearData) => {
    const sectionData = [...(activeLinear[section] || [])];
    const newNo = sectionData.length + 1;
    const lastRow = sectionData[sectionData.length - 1];
    const defaultFrom = lastRow ? lastRow.to : 'Km 00+000';
    const defaultTo = lastRow ? `Km ${String(Math.floor(parseStation(lastRow.to) + 1)).padStart(2, '0')}+000` : 'Km 01+000';
    
    sectionData.push({
      no: newNo,
      from: defaultFrom,
      to: defaultTo,
      exec: Math.max(0, parseStation(defaultTo) - parseStation(defaultFrom))
    });

    const updatedLinear = {
      ...activeLinear,
      [section]: sectionData
    };

    if (roadType === 'main') {
      onUpdateLinear(updatedLinear);
    } else if (onUpdateLinearSpur) {
      onUpdateLinearSpur(updatedLinear);
    } else {
      onUpdateLinear(updatedLinear);
    }
  };

  const handleRemoveRow = (section: keyof LinearData, idx: number) => {
    const sectionData = (activeLinear[section] || []).filter((_, i) => i !== idx).map((item, i) => ({ ...item, no: i + 1 }));
    const updatedLinear = {
      ...activeLinear,
      [section]: sectionData
    };

    if (roadType === 'main') {
      onUpdateLinear(updatedLinear);
    } else if (onUpdateLinearSpur) {
      onUpdateLinearSpur(updatedLinear);
    } else {
      onUpdateLinear(updatedLinear);
    }
  };

  return (
    <div className="space-y-5">
      {/* Interconnected Project Length Linker Banner */}
      <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-zinc-100 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-850 dark:text-zinc-100 flex items-center gap-2">
                Project Length Interconnection & Linear Progress Baseline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Contract Length is dynamically divided into Main Road and Spur Road sections.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shrink-0">
            <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              Main ({mainRoadTargetKm} Km) + Spur ({spurRoadTargetKm} Km) = {totalProjectKm} Km Total
            </span>
          </div>
        </div>

        {/* Dynamic Road Length Breakdown Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Project Length</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={totalProjectKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateProjectLength) {
                      onUpdateProjectLength(val);
                    }
                  }}
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  title="Update Total Contract Length"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40">
              Contract Total
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Main Road Target</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={totalProjectKm}
                  value={mainRoadTargetKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateMainLength) {
                      onUpdateMainLength(Math.min(totalProjectKm, Math.max(0, val)));
                    }
                  }}
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:border-blue-500"
                  title="Update Main Road target length"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">
              {((mainRoadTargetKm / (totalProjectKm || 1)) * 100).toFixed(1)}% Share
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Spur Road Target</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={totalProjectKm}
                  value={spurRoadTargetKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateSpurLength) {
                      onUpdateSpurLength(Math.min(totalProjectKm, Math.max(0, val)));
                    }
                  }}
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-emerald-500"
                  title="Adjust Spur Road target length"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              {((spurRoadTargetKm / (totalProjectKm || 1)) * 100).toFixed(1)}% Share
            </span>
          </div>
        </div>
      </div>

      {/* Main Controls: Road Selection & View Navigation */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-3 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Road Type Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRoadType('main')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              roadType === 'main'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Main Road ({mainRoadTargetKm} Km)
          </button>
          <button
            type="button"
            onClick={() => setRoadType('spur')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              roadType === 'spur'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 rotate-45" />
            Spur Road ({spurRoadTargetKm} Km)
          </button>
        </div>

        {/* View Tabs: Station Segments and Plan Baseline */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('segments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'segments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            Station Segments
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('planSettings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'planSettings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
            }`}
            title="Configure Linear Progress Plan Baseline"
          >
            <Sliders className="w-3.5 h-3.5" />
            Plan Baseline
          </button>
        </div>
      </div>

      {/* VIEW: EDITABLE STATION SEGMENTS TABLE */}
      {activeTab === 'segments' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                  {roadType === 'main' ? `Main Road (${mainRoadTargetKm} Km)` : `Spur Road (${spurRoadTargetKm} Km)`} Physical Station Segments
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter continuous or discrete station chainages. The actual accomplished length automatically recalculates and syncs with the compliance audit.
                </p>
              </div>
            </div>

            {/* Capping toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={project.hasCappingLayer !== false}
                onChange={(e) => {
                  if (onToggleCappingLayer) {
                    onToggleCappingLayer(e.target.checked);
                  }
                }}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {project.hasCappingLayer !== false ? 'Capping Enabled' : 'Capping Disabled'}
              </span>
            </label>
          </div>

          {/* SpreadSheet Scroller Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.map((sec) => {
              const list = activeLinear[sec.id] || [];
              const totalExec = list.reduce((sum, r) => sum + r.exec, 0);

              return (
                <div 
                  key={sec.id} 
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Header Box */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <span className={`w-2.5 h-2.5 rounded-xs ${sec.color}`} />
                      {sec.name} ({roadType === 'main' ? 'Main' : 'Spur'})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                        Total: {totalExec.toFixed(2)} Km
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddRow(sec.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        title="Add new station segment"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>

                  {/* SpreadSheet Scroller */}
                  <div className="overflow-auto max-h-56">
                    <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
                      <thead>
                        <tr className="bg-slate-100/60 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold sticky top-0">
                          <th className="p-2 w-10 text-center">No.</th>
                          <th className="p-2">From Station</th>
                          <th className="p-2">To Station</th>
                          <th className="p-2 w-20 text-center">Net (Km)</th>
                          <th className="p-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {list.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                              No station segments recorded yet. Click "+ Add" above to insert chainages.
                            </td>
                          </tr>
                        ) : (
                          list.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-2 text-center text-slate-400 font-bold font-mono">{r.no}</td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={r.from}
                                  placeholder="Km 00+000"
                                  onChange={(e) => handleFieldChange(sec.id, rIdx, 'from', e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center text-xs py-0.5 rounded-md w-full focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={r.to}
                                  placeholder="Km 00+000"
                                  onChange={(e) => handleFieldChange(sec.id, rIdx, 'to', e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center text-xs py-0.5 rounded-md w-full focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-300 font-mono">
                                {r.exec.toFixed(2)}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(sec.id, rIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                                  title="Delete segment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: BASELINE PLAN MANAGEMENT & SETTINGS */}
      {activeTab === 'planSettings' && (() => {
        // Overall Plan during Contractor Evaluation = Main Road Plan + Spur Road Plan
        const overallLayerAudit = sections.map((sec) => {
          const mainPlanKm = mainLinearPlan[sec.id]?.plannedKm || 0;
          const spurPlanKm = spurLinearPlan[sec.id]?.plannedKm || 0;
          const overallPlanKm = Number((mainPlanKm + spurPlanKm).toFixed(2));
          const mainPct = mainRoadTargetKm > 0 ? Number(((mainPlanKm / mainRoadTargetKm) * 100).toFixed(1)) : 0;
          const spurPct = spurRoadTargetKm > 0 ? Number(((spurPlanKm / spurRoadTargetKm) * 100).toFixed(1)) : 0;
          const overallPct = totalProjectKm > 0 ? Number(((overallPlanKm / totalProjectKm) * 100).toFixed(1)) : 0;

          const mainExecKm = (mainLinear[sec.id] || []).reduce((sum, r) => sum + (r.exec || 0), 0);
          const spurExecKm = (spurLinear[sec.id] || []).reduce((sum, r) => sum + (r.exec || 0), 0);
          const overallExecKm = Number((mainExecKm + spurExecKm).toFixed(2));
          const overallExecPct = totalProjectKm > 0 ? Number(((overallExecKm / totalProjectKm) * 100).toFixed(1)) : 0;

          const varKm = Number((overallExecKm - overallPlanKm).toFixed(2));
          const ratio = overallPlanKm > 0 ? Math.round((overallExecKm / overallPlanKm) * 100) : (overallExecKm > 0 ? 100 : 0);
          const status: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = ratio >= 80 ? 'Compliant' : (ratio >= 65 ? 'Minor Deficiency' : 'Critical Breach');

          return {
            sec,
            mainPlanKm,
            spurPlanKm,
            overallPlanKm,
            mainPct,
            spurPct,
            overallPct,
            mainExecKm,
            spurExecKm,
            overallExecKm,
            overallExecPct,
            varKm,
            ratio,
            status
          };
        });

        return (
          <div className="space-y-4">
            {/* OVERALL PLAN DURING CONTRACTOR EVALUATION BANNER & MATRIX (SUM OF MAIN ROAD + SPUR ROAD) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                      Evaluation Dimension 5 Benchmark
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                      Main ({mainRoadTargetKm} Km) + Spur ({spurRoadTargetKm} Km) = {totalProjectKm} Km Total
                    </span>
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-850 dark:text-zinc-100 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Contractor Evaluation Overall Baseline Plan (Sum of Main Road & Spur Road)
                  </h3>
                </div>

                {/* Auto-Derive Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAutoCalculateBothPlans}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Derive baseline plans for BOTH Main Road and Spur Road simultaneously"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    Auto-Derive Both (Main + Spur)
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoCalculatePlan}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Derive baseline plan for currently selected road only"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    Auto-Derive {roadType === 'main' ? 'Main Road' : 'Spur Road'} Only
                  </button>
                </div>
              </div>

              {/* Itemized Overall Plan (Main Road + Spur Road) Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Pavement Layer</th>
                        <th className="py-2.5 px-3 text-center">Main Road Plan ({mainRoadTargetKm} Km)</th>
                        <th className="py-2.5 px-3 text-center">Spur Road Plan ({spurRoadTargetKm} Km)</th>
                        <th className="py-2.5 px-3 text-center bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                          Overall Plan (Main + Spur)
                        </th>
                        <th className="py-2.5 px-3 text-center">Accomplished (Main + Spur)</th>
                        <th className="py-2.5 px-3 text-center">Audit Variance</th>
                        <th className="py-2.5 px-3 text-center">Evaluation Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {overallLayerAudit.map((l) => (
                        <tr key={l.sec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-850 dark:text-zinc-100 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${l.sec.color}`} />
                            <span>{l.sec.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{l.mainPlanKm.toFixed(1)} Km</span>
                            <span className="text-[10px] text-slate-400 block">({l.mainPct}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{l.spurPlanKm.toFixed(1)} Km</span>
                            <span className="text-[10px] text-slate-400 block">({l.spurPct}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono bg-indigo-50/40 dark:bg-indigo-950/20">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-black">
                              <span>{l.overallPlanKm.toFixed(1)} Km</span>
                              <span className="text-[10px] opacity-80">({l.overallPct}%)</span>
                            </div>
                            <span className="text-[9px] text-indigo-500 dark:text-indigo-400 block font-sans">
                              Main {l.mainPlanKm.toFixed(1)}k + Spur {l.spurPlanKm.toFixed(1)}k
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{l.overallExecKm.toFixed(1)} Km</span>
                            <span className="text-[9px] text-slate-400 block">
                              (M: {l.mainExecKm.toFixed(1)}k + S: {l.spurExecKm.toFixed(1)}k)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <span className={l.varKm >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {l.varKm >= 0 ? '+' : ''}{l.varKm.toFixed(1)} Km
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'Compliant'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : (l.status === 'Minor Deficiency'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300')
                            }`}>
                              {l.status === 'Compliant' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                              {l.status !== 'Compliant' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                              <span>{l.ratio}% {l.status}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ALIGNMENT SPECIFIC BASELINE PLAN EDITOR */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      roadType === 'main' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      Editing: {roadType === 'main' ? `Main Road (${mainRoadTargetKm} Km)` : `Spur Road (${spurRoadTargetKm} Km)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoadType(roadType === 'main' ? 'spur' : 'main')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Switch to {roadType === 'main' ? 'Spur Road' : 'Main Road'}
                    </button>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100 flex items-center gap-2 mt-1">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    {roadType === 'main' ? 'Main Road' : 'Spur Road'} Baseline Layer Targets
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modifying planned Km here directly updates the Overall Evaluation Plan (sum of Main road and spur road) above.
                  </p>
                </div>

                {/* Auto-calculate button */}
                <button
                  type="button"
                  onClick={handleAutoCalculatePlan}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Auto-Derive {roadType === 'main' ? 'Main' : 'Spur'} ({Number(project.progressPlan?.contractor?.todate ?? project.progressPlan?.era?.todate ?? 45).toFixed(1)}%)
                </button>
              </div>

              {/* Baseline Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    {roadType === 'main' ? 'Main Road' : 'Spur Road'} Baseline Reference Program
                  </label>
                  <input
                    type="text"
                    value={activePlan.baselineName || ''}
                    placeholder="e.g. Approved Baseline Work Program Rev.02"
                    onChange={(e) => {
                      const updated = { ...activePlan, baselineName: e.target.value };
                      if (roadType === 'main') {
                        if (onUpdateLinearPlan) onUpdateLinearPlan(updated);
                      } else {
                        if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updated);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Baseline Approval Date
                  </label>
                  <input
                    type="date"
                    value={activePlan.baselineDate || ''}
                    onChange={(e) => {
                      const updated = { ...activePlan, baselineDate: e.target.value };
                      if (roadType === 'main') {
                        if (onUpdateLinearPlan) onUpdateLinearPlan(updated);
                      } else {
                        if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updated);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Layer Target Km Inputs with Dynamic Overall Plan Calculation */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Target Planned Km by Pavement Layer ({roadType === 'main' ? `Main Road: Max ${mainRoadTargetKm} Km` : `Spur Road: Max ${spurRoadTargetKm} Km`})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {sections.map((sec) => {
                    const planLayer = activePlan[sec.id] || { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' };
                    const plannedKm = planLayer.plannedKm || 0;
                    const plannedPct = activeTargetKm > 0 ? ((plannedKm / activeTargetKm) * 100).toFixed(1) : 0;
                    
                    const otherRoadPlanKm = roadType === 'main' 
                      ? (spurLinearPlan[sec.id]?.plannedKm || 0) 
                      : (mainLinearPlan[sec.id]?.plannedKm || 0);
                    const combinedSumKm = Number((plannedKm + otherRoadPlanKm).toFixed(2));
                    const combinedPct = totalProjectKm > 0 ? ((combinedSumKm / totalProjectKm) * 100).toFixed(1) : 0;

                    return (
                      <div 
                        key={sec.id}
                        className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-2.5 h-2.5 rounded-xs ${sec.color}`} />
                            <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 truncate">
                              {sec.name}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>{roadType === 'main' ? 'Main' : 'Spur'} Plan</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{plannedPct}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={activeTargetKm}
                              value={plannedKm}
                              onChange={(e) => handleUpdatePlanLayer(sec.id, 'plannedKm', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-xs font-mono text-slate-400">Km</span>
                          </div>
                        </div>

                        {/* Combined Overall Plan Indicator */}
                        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200/60 dark:border-indigo-800/40 text-[9px] space-y-1">
                          <div className="flex justify-between text-indigo-900 dark:text-indigo-200 font-bold">
                            <span>Overall Plan (Sum):</span>
                            <span className="font-mono text-indigo-700 dark:text-indigo-300">{combinedSumKm} Km</span>
                          </div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[8.5px]">
                            <span>{roadType === 'main' ? 'Spur' : 'Main'}: {otherRoadPlanKm}k</span>
                            <span>{combinedPct}% of {totalProjectKm}k</span>
                          </div>
                        </div>


                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auditor Directive & Technical Remarks */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-slate-500 block">
                  Auditor Standing Guidance & Contractual Notice Notes
                </label>
                <textarea
                  rows={2}
                  value={activePlan.auditDirective || ''}
                  placeholder="Enter technical audit guidance (e.g. minimum buffer requirements between layers or equipment shifts)..."
                  onChange={(e) => {
                    const updated = { ...activePlan, auditDirective: e.target.value };
                    if (roadType === 'main') {
                      if (onUpdateLinearPlan) onUpdateLinearPlan(updated);
                    } else {
                      if (onUpdateLinearPlanSpur) onUpdateLinearPlanSpur(updated);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

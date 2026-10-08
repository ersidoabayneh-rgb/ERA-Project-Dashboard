import React, { useState } from 'react';
import { 
  Ruler, 
  Navigation, 
  Plus, 
  Trash2, 
  Link2, 
  Calculator, 
  Sliders, 
  Sparkles
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
    const updatedLayerPlan: LinearLayerPlan = {
      ...currentLayerPlan,
      [field]: field === 'plannedKm' ? Math.max(0, parseFloat(value) || 0) : value
    };

    if (field === 'plannedKm') {
      const pKm = Math.max(0, parseFloat(value) || 0);
      updatedLayerPlan.toStation = formatStation(pKm);
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
      {activeTab === 'planSettings' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Linear Progress Baseline Plan Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set planned target completion Km for each pavement layer used in Contractor Compliance & Performance Audits.
                </p>
              </div>

              {/* Auto-calculate button */}
              <button
                type="button"
                onClick={handleAutoCalculatePlan}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Auto-Derive from Project Schedule ({Number(project.progressPlan?.contractor?.todate ?? project.progressPlan?.era?.todate ?? 45).toFixed(1)}%)
              </button>
            </div>

            {/* Baseline Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Baseline Program Reference Name
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

            {/* Layer Target Km Inputs */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Target Planned Km by Pavement Layer ({roadType === 'main' ? `Max ${mainRoadTargetKm} Km` : `Max ${spurRoadTargetKm} Km`})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {sections.map((sec) => {
                  const planLayer = activePlan[sec.id] || { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' };
                  const plannedKm = planLayer.plannedKm || 0;
                  const plannedPct = activeTargetKm > 0 ? ((plannedKm / activeTargetKm) * 100).toFixed(1) : 0;

                  return (
                    <div 
                      key={sec.id}
                      className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-xs ${sec.color}`} />
                        <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 truncate">
                          {sec.name}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Planned Target</span>
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

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Planned End Station</span>
                        <input
                          type="text"
                          value={planLayer.toStation || formatStation(plannedKm)}
                          onChange={(e) => handleUpdatePlanLayer(sec.id, 'toStation', e.target.value)}
                          placeholder="Km 00+000"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none"
                        />
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
      )}
    </div>
  );
}

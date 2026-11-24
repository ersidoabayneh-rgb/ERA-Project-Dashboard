import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Truck, Trash2, DownloadCloud, X, Eye, EyeOff,
  Activity, Sun, AlertTriangle, ClipboardList,
  Calendar, Factory, CheckSquare, Square, Sliders, RefreshCw,
  Check, Printer, RotateCcw, Layers, Filter, FileText, Search, Users, Save, MessageSquare, Link2
} from 'lucide-react';
import {
  Project,
  DailyActivityRecord,
  User,
  DailyProductionItem,
  QtyItem,
  DailySiteLogEntry,
  DailyActivityLaborItem,
  DailyEquipmentFleetItem,
  DailyMaterialItem,
  DailyTomorrowPlanItem
} from '../types';
import {
  createDefaultLaborSummary,
  createDefaultProductionList,
  createDefaultEquipmentFleet,
  createDefaultMaterialsList,
  createDefaultSiteChallenges,
  createDefaultTomorrowPlans,
  broadcastDailyActivitiesSync,
  resolveLogisticsProductionContext,
  buildProductionListFromLogistics,
  reconcileProductionListWithLogistics,
  syncDailyProductionToLogistics,
  createLogisticsProductionItemFromDaily,
  extractUnitFromLogisticsItem
} from '../lib/dailyActivitiesSync';
import eraLogo from '../assets/logo.png';
import { SpecialStructuresStandaloneTables } from './SpecialStructuresStandaloneTables';

interface DailyActivitiesViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Partial<Project>, actionDesc: string) => void;
  isReadonly?: boolean;
  currentUserObj?: User | null;
}

export interface WorkRegisterSectionDef {
  id: string;
  name: string;
  metrics: string[];
  parent?: string;
  isSpecial?: boolean;
  customLabel?: string;
  isCustom?: boolean;
}

export type EquipmentFleetItem = DailyEquipmentFleetItem;

export const MEASUREMENT_UNITS = [
  'km',
  'm',
  'm³',
  'm²',
  'pcs',
  'Tons',
  '%',
  'Units',
  'No.',
  'Trip'
];

export const PIPE_CONSTRUCTION_STAGES = [
  'Excavation',
  'Masonry inlet/outlet',
  'Paved Water way',
  'Pipe Installation',
  'Back fill'
] as const;

export type PipeConstructionStage = typeof PIPE_CONSTRUCTION_STAGES[number];

export const PRESET_PIPE_LOCATIONS = [
 
];

export const SAMPLE_ERA_PIPE_RECORDS: Partial<DailyActivityRecord>[] = [];

// BRIDGE CONSTRUCTION STAGES & PRESETS
export const BRIDGE_CONSTRUCTION_STAGES = [
  'Foundation',
  'Abutment',
  'Pier',
  'Box girder / T-girder',
  'Slab',
  'Approach & Bearings'
] as const;

export type BridgeConstructionStage = typeof BRIDGE_CONSTRUCTION_STAGES[number];

export const PRESET_BRIDGE_LOCATIONS = [
  
];

export const SAMPLE_ERA_BRIDGE_RECORDS: Partial<DailyActivityRecord>[] = [
 
];

// BOX CULVERT CONSTRUCTION STAGES & PRESETS
export const BOX_CULVERT_STAGES = [
  'Excavation & Blinding',
  'Bottom Slab',
  'Walls & Stem',
  'Top Slab',
  'Wingwalls & Apron',
  'Backfill'
] as const;

export type BoxCulvertStage = typeof BOX_CULVERT_STAGES[number];

export const PRESET_BOX_CULVERT_LOCATIONS = [
  
];

export const SAMPLE_ERA_BOX_CULVERT_RECORDS: Partial<DailyActivityRecord>[] = [
  
];

// SLAB CULVERT CONSTRUCTION STAGES & PRESETS
export const SLAB_CULVERT_STAGES = [
  'Excavation & Footing',
  'Abutment Walls',
  'RC Deck Slab',
  'Wingwalls & Parapet',
  'Bed Pitching',
  'Backfill'
] as const;

export type SlabCulvertStage = typeof SLAB_CULVERT_STAGES[number];

export const PRESET_SLAB_CULVERT_LOCATIONS = [
  
];

export const SAMPLE_ERA_SLAB_CULVERT_RECORDS: Partial<DailyActivityRecord>[] = [
  
];

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  activities: Partial<DailyActivityRecord>[];
}

export const DEFAULT_ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'tpl_standard_pipes',
    name: 'Standard 15 RCP Pipe Culverts Package',
    description: 'Pre-fills the 15 standard ERA reinforced concrete pipe culverts with standard excavation, masonry, and installation stages.',
    activities: SAMPLE_ERA_PIPE_RECORDS.map(r => ({ ...r, activityType: '14', activityName: 'RCP Pipe Construction', unit: 'No.' }))
  },
  {
    id: 'tpl_standard_bridges',
    name: 'Major River Bridges Package',
    description: 'Pre-fills major river bridges (Dermi, Chiri, Nansebo, Wabe) with foundation, abutment, and girder stages.',
    activities: SAMPLE_ERA_BRIDGE_RECORDS.map(r => ({ ...r, activityType: '17', activityName: 'Bridge Construction', unit: 'No.' }))
  },
  {
    id: 'tpl_standard_culverts',
    name: 'Standard Box & Slab Culverts Package',
    description: 'Pre-fills standard RC box culverts and slab culverts along the project alignment.',
    activities: [
      ...SAMPLE_ERA_BOX_CULVERT_RECORDS.map(r => ({ ...r, activityType: '15', activityName: 'Box Culvert Construction', unit: 'No.' })),
      ...SAMPLE_ERA_SLAB_CULVERT_RECORDS.map(r => ({ ...r, activityType: '16', activityName: 'Slab Culvert Construction', unit: 'No.' }))
    ]
  }
];

export function getDefaultUnit(sectionId: string): string {
  if (['1', '2', '10', '11', '12'].includes(sectionId)) return 'km';
  if (['3.1', '3.2', '4', '5'].includes(sectionId)) return 'm³';
  if (['6', '7', '8', '9', '18'].includes(sectionId)) return 'm';
  if (sectionId === '13') return 'pcs';
  if (['14', '14.1', '14.2', '15', '16', '17'].includes(sectionId)) return 'No.';
  return 'km';
}

export function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export interface BoqVarianceInfo {
  hasBoq: boolean;
  boqItemName?: string;
  boqDesignQty?: number;
  boqUnit?: string;
  exceedsVariance: boolean;
  variancePct: number;
  warningMessage?: string;
}

export function checkBoqQuantityVariance(
  activityType: string,
  activityName: string,
  enteredQty: number,
  quantities?: QtyItem[]
): BoqVarianceInfo {
  if (!quantities || quantities.length === 0 || !enteredQty || enteredQty <= 0) {
    return { hasBoq: false, exceedsVariance: false, variancePct: 0 };
  }

  const matched = quantities.find(q => {
    const qName = q.name.toLowerCase();
    const aType = activityType.toLowerCase();
    const aName = (activityName || '').toLowerCase();

    if (aType === '1' || aName.includes('clearing')) return qName.includes('clearing') || qName.includes('site clearing');
    if (aType === '2' || aName.includes('road bed')) return qName.includes('excavation') || qName.includes('earthwork');
    if (aType === '3.1' || aName.includes('undercut excavation')) return qName.includes('common excavation') || qName.includes('rock excavation');
    if (aType === '3.2' || aType === '5' || aName.includes('embankment') || aName.includes('fill')) return qName.includes('embankment') || qName.includes('fill');
    if (aType === '4' || aName.includes('cut to spoil')) return qName.includes('common excavation') || qName.includes('rock excavation');
    if (aType === '6' || aName.includes('capping')) return qName.includes('capping');
    if (aType === '7' || aName.includes('subgrade')) return qName.includes('subgrade') || qName.includes('common excavation');
    if (aType === '8' || aName.includes('sub-base') || aName.includes('subbase')) return qName.includes('sub base') || qName.includes('sub-base') || qName.includes('subbase');
    if (aType === '9' || aName.includes('base course') || aName.includes('basecourse')) return qName.includes('base course') || qName.includes('basecourse');
    if (aType === '10' || aName.includes('prime')) return qName.includes('prime');
    if (aType === '11' || aName.includes('ac') || aName.includes('asphalt')) return qName.includes('asphalt');
    if (aType === '14' || aName.includes('pipe')) return qName.includes('pipe culvert') || qName.includes('pipe');
    if (aType === '15' || aName.includes('box culvert')) return qName.includes('box culvert');
    if (aType === '16' || aName.includes('slab culvert')) return qName.includes('slab culvert');
    if (aType === '17' || aName.includes('bridge')) return qName.includes('bridge');
    if (aType === '18' || aName.includes('ditch')) return qName.includes('retaining wall') || qName.includes('drainage') || qName.includes('ditch');
    return qName.includes(aName) || aName.includes(qName);
  });

  if (!matched || !matched.design || matched.design <= 0) {
    return { hasBoq: false, exceedsVariance: false, variancePct: 0 };
  }

  const variancePct = ((enteredQty - matched.design) / matched.design) * 100;
  const exceedsVariance = variancePct > 20;

  return {
    hasBoq: true,
    boqItemName: matched.name,
    boqDesignQty: matched.design,
    boqUnit: matched.unit || '',
    exceedsVariance,
    variancePct: Number(variancePct.toFixed(1)),
    warningMessage: exceedsVariance
      ? `Actual Quantity (${enteredQty}) exceeds BOQ Quantity (${matched.design} ${matched.unit || ''}) by ${variancePct.toFixed(1)}% (exceeds allowable 20% variance threshold).`
      : undefined
  };
}

export const WORK_SECTIONS: WorkRegisterSectionDef[] = [
  { id: '1', name: 'Clearing and Grubbing', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Progress', 'Daily Executed (km)', 'Net Daily Executed (km)'] },
  { id: '2', name: 'Road bed', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Progress', 'Daily Executed (km)', 'Net Daily Executed (km)'] },
  { id: '3.1', name: 'undercut Excavation', parent: '3', metrics: ['Description of Work', 'Station of Work', 'Side', 'Progress', 'Daily Executed(m³)', 'Daily Executed (km)'] },
  { id: '3.2', name: 'undercut Replacement Fill', parent: '3', metrics: ['Description of Work', 'Station of Work', 'Side', 'Layer Progress', 'Volume(m³)', 'Daily Executed (km)'] },
  { id: '4', name: 'Cut to Spoil/Stock', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Progress', 'Daily Executed(m³)', 'Net Daily Executed (km)'] },
  { id: '5', name: 'Embankment Construction', metrics: ['Description of Work', 'Station of Work', 'Side', 'Layer Progress', 'Volume(m³)', 'Net Daily Executed (km)'] },
  { id: '6', name: 'Capping layer', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Volume(m³)', 'Daily Executed (km)'] },
  { id: '7', name: 'Subgrade', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Daily Executed(m³)', 'Net Daily Executed (km)'] },
  { id: '8', name: 'Sub-Base', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Volume(m³)', 'Net Daily Executed (km)'] },
  { id: '9', name: 'Base course', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Volume(m³)', 'Net Daily Executed (km)'] },
  { id: '10', name: 'Prime and Tack Coat', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Daily Executed (km)', 'Daily Executed (km)'] },
  { id: '11', name: 'AC', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Daily Executed (km)', 'Daily Executed (km)'] },
  { id: '12', name: 'Shoulder DBST', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed (m)', 'Daily Executed (km)', 'Daily Executed (km)'] },
  { id: '13', name: 'RCP Production', metrics: ['Description of Work', 'Station of Work', 'This day', 'Previous', 'To date'] },
  { id: '18', name: 'Ditch Construction', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed Stretch (m)', 'Volume(m³)', 'Net Daily Executed (km)'] },
  { id: '14', name: 'RCP Pipe Construction', isSpecial: true, metrics: [] },
  { id: '15', name: 'Box Culvert Construction', isSpecial: true, metrics: [] },
  { id: '16', name: 'Slab Culvert Construction', isSpecial: true, metrics: [] },
  { id: '17', name: 'Bridge Construction', isSpecial: true, metrics: [] }
];

export function deduplicateSections(list: WorkRegisterSectionDef[]): WorkRegisterSectionDef[] {
  const seen = new Set<string>();
  return list.filter(item => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function loadActiveSectionsForProject(projectId: string): WorkRegisterSectionDef[] {
  try {
    const stored = localStorage.getItem(`era_active_sections_${projectId}`);
    const migratedKey = `era_sections_v18_migrated_${projectId}`;
    if (stored) {
      const parsed = deduplicateSections(JSON.parse(stored));
      const isAlreadyMigrated = localStorage.getItem(migratedKey) === '1';
      const hasLegacySubIds = parsed.some(s => s.id === '14.1' || s.id === '14.2');
      if (hasLegacySubIds || (!isAlreadyMigrated && (!parsed.some(s => s.id === '15' && s.name.includes('Box')) || !parsed.some(s => s.id === '16' && s.name.includes('Slab')) || !parsed.some(s => s.id === '17') || !parsed.some(s => s.id === '18')))) {
        localStorage.setItem(`era_active_sections_${projectId}`, JSON.stringify(WORK_SECTIONS));
        localStorage.setItem(migratedKey, '1');
        return WORK_SECTIONS;
      }
      if (!isAlreadyMigrated) {
        localStorage.setItem(migratedKey, '1');
      }
      localStorage.setItem(`era_active_sections_${projectId}`, JSON.stringify(parsed));
      return parsed;
    }
    localStorage.setItem(migratedKey, '1');
  } catch {}
  return WORK_SECTIONS;
}

export const STANDSTILL_REASONS = [
  'Inclement Weather / Heavy Rain',
  'Mechanical Fleet Breakdown',
  'Material Shortage (Cement / Bitumen / Fuel)',
  'Right-of-Way (ROW) / Land Dispute Access Halt',
  'Public Holiday / Scheduled Sunday Rest Day',
  'Safety Standstill / Security Restriction',
  'Other / Custom Reason'
];

export const PRESET_MATERIALS = [
  'Portland Cement (42.5N Grade)',
  'Rebar High-Yield Steel (Fe-500)',
  'Crushed Base Aggregate (0-31.5mm)',
  'Natural River Sand (Masonry)',
  'Asphalt Bitumen (60/70 Penetration)',
  'Concrete Drainage Pipes (Ø1000mm)',
  'Diesel Fuel (Gasoline / Gasoil)',
  'Subbase Material (GAB/GS)'
];

type ProductionColKey =
  | 'facilityName'
  | 'itemProduced'
  | 'unit'
  | 'targetOutput'
  | 'actualOutput'
  | 'previousCumulative'
  | 'cumulativeToDate'
  | 'logisticsLink'
  | 'operatingHours'
  | 'remarks';

const DEFAULT_PRODUCTION_COL_WIDTHS: Record<ProductionColKey, number> = {
  facilityName: 200,
  itemProduced: 200,
  unit: 76,
  targetOutput: 88,
  actualOutput: 96,
  previousCumulative: 104,
  cumulativeToDate: 118,
  logisticsLink: 210,
  operatingHours: 76,
  remarks: 160
};

const PRODUCTION_COL_META: Array<{ key: ProductionColKey; label: string; min: number; max: number }> = [
  { key: 'facilityName', label: 'Facility / Plant Name', min: 110, max: 460 },
  { key: 'itemProduced', label: 'Material / Item', min: 110, max: 460 },
  { key: 'unit', label: 'Unit', min: 56, max: 160 },
  { key: 'targetOutput', label: 'Target', min: 64, max: 200 },
  { key: 'actualOutput', label: 'Actual Today', min: 72, max: 220 },
  { key: 'previousCumulative', label: 'Previous Total', min: 76, max: 240 },
  { key: 'cumulativeToDate', label: 'Cumulative To Date', min: 88, max: 260 },
  { key: 'logisticsLink', label: 'Logistics & Resources Link', min: 140, max: 460 },
  { key: 'operatingHours', label: 'Hours', min: 56, max: 160 },
  { key: 'remarks', label: 'Remarks', min: 96, max: 480 }
];

type WorkRegColKey =
  | 'section'
  | 'description'
  | 'station'
  | 'side'
  | 'unit'
  | 'dailyQty'
  | 'previousTotal'
  | 'dailyExecuted'
  | 'cumulative'
  | 'remarks'
  | 'status';

const DEFAULT_WORK_REG_COL_WIDTHS: Record<WorkRegColKey, number> = {
  section: 192,
  description: 240,
  station: 112,
  side: 68,
  unit: 80,
  dailyQty: 96,
  previousTotal: 104,
  dailyExecuted: 108,
  cumulative: 118,
  remarks: 160,
  status: 96
};

const WORK_REG_COL_META: Array<{ key: WorkRegColKey; label: string; min: number; max: number }> = [
  { key: 'section', label: 'Activity Section', min: 110, max: 420 },
  { key: 'description', label: 'Description of Work', min: 120, max: 520 },
  { key: 'station', label: 'Station', min: 72, max: 240 },
  { key: 'side', label: 'Side', min: 52, max: 140 },
  { key: 'unit', label: 'Unit', min: 60, max: 160 },
  { key: 'dailyQty', label: 'Daily Qty', min: 68, max: 200 },
  { key: 'previousTotal', label: 'Previous Total', min: 76, max: 220 },
  { key: 'dailyExecuted', label: 'Daily Executed', min: 76, max: 220 },
  { key: 'cumulative', label: 'Cumulative (To Date)', min: 88, max: 240 },
  { key: 'remarks', label: 'Remarks & Observations', min: 96, max: 480 },
  { key: 'status', label: 'Status', min: 76, max: 200 }
];

type SubTableKey = 'pipe' | 'box' | 'slab' | 'bridge';

interface SubTableColDef {
  key: string;
  label: string;
  defaultWidth: number;
  headerClass: string;
}

const SUB_TABLE_COLS: Record<SubTableKey, SubTableColDef[]> = {
  pipe: [
    { key: 'location', label: 'Pipe Location', defaultWidth: 128, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-blue-100/70 text-blue-900' },
    { key: 'excavation', label: 'Excavation', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'masonry', label: 'Masonry inlet/outlet', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'pavedWaterway', label: 'Paved Water way', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'installation', label: 'Pipe Installation', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'backfill', label: 'Back fill', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-blue-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 76, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 104, headerClass: 'text-center' }
  ],
  box: [
    { key: 'location', label: 'Box Culvert Location', defaultWidth: 176, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-emerald-100/80 text-emerald-950 font-bold' },
    { key: 'excavation', label: 'Excavation & Blinding', defaultWidth: 100, headerClass: 'text-center' },
    { key: 'bottomSlab', label: 'Bottom Slab', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'walls', label: 'Walls & Stem', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'topSlab', label: 'Top Slab', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'wingwalls', label: 'Wingwalls & Apron', defaultWidth: 100, headerClass: 'text-center' },
    { key: 'backfill', label: 'Backfill', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-emerald-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 76, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 104, headerClass: 'text-center' }
  ],
  slab: [
    { key: 'location', label: 'Slab Culvert Location', defaultWidth: 176, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-indigo-100/80 text-indigo-950 font-bold' },
    { key: 'excavation', label: 'Excavation & Footing', defaultWidth: 100, headerClass: 'text-center' },
    { key: 'abutment', label: 'Abutment Walls', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'deckSlab', label: 'RC Deck Slab', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'wingwalls', label: 'Wingwalls & Parapet', defaultWidth: 100, headerClass: 'text-center' },
    { key: 'pitching', label: 'Bed Pitching', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'backfill', label: 'Backfill', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-indigo-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 76, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 104, headerClass: 'text-center' }
  ],
  bridge: [
    { key: 'location', label: 'Bridge Location', defaultWidth: 192, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-amber-100/80 text-amber-950 font-bold' },
    { key: 'foundation', label: 'Foundation', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'abutment', label: 'Abutment', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'pier', label: 'Pier', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'girder', label: 'Box girder / T-girder', defaultWidth: 112, headerClass: 'text-center' },
    { key: 'slab', label: 'Slab', defaultWidth: 84, headerClass: 'text-center' },
    { key: 'approach', label: 'Approach & Bearings', defaultWidth: 112, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-amber-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 76, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 104, headerClass: 'text-center' }
  ]
};

const getDefaultSubTableColWidths = (): Record<SubTableKey, Record<string, number>> => ({
  pipe: Object.fromEntries(SUB_TABLE_COLS.pipe.map(c => [c.key, c.defaultWidth])),
  box: Object.fromEntries(SUB_TABLE_COLS.box.map(c => [c.key, c.defaultWidth])),
  slab: Object.fromEntries(SUB_TABLE_COLS.slab.map(c => [c.key, c.defaultWidth])),
  bridge: Object.fromEntries(SUB_TABLE_COLS.bridge.map(c => [c.key, c.defaultWidth]))
});

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored) as T;
  } catch {}
  return fallback;
}

function hydrateDayFieldsFromProject(proj: Project, dateStr: string) {
  const explicitLog: Partial<DailySiteLogEntry> | undefined = proj.dailySiteLogs?.[dateStr];
  const dayActs = (Array.isArray(proj.dailyActivities) ? proj.dailyActivities : []).filter(a => a.date === dateStr);

  // Resolve Daily Notes
  const actNotes = dayActs.map(a => (a.dailyNotes || '').trim()).filter(Boolean).join('\n');
  let dailyNotes = '';
  if (explicitLog && typeof explicitLog.dailyNotes === 'string') {
    dailyNotes = explicitLog.dailyNotes;
  } else if (actNotes) {
    dailyNotes = actNotes;
  } else {
    dailyNotes = readLocalJson<string>(`era_daily_notes_${proj.id}_${dateStr}`, '');
  }

  // Resolve Labor Summary
  let laborSummary: DailyActivityLaborItem[] = [];
  if (explicitLog && Array.isArray(explicitLog.laborSummary) && explicitLog.laborSummary.length > 0) {
    laborSummary = explicitLog.laborSummary.map(l => ({ category: l.category, count: Number(l.count) || 0 }));
  } else {
    const actLaborMap = new Map<string, number>();
    dayActs.forEach(a => {
      (a.laborSummary || []).forEach(l => {
        if (l?.category) {
          actLaborMap.set(l.category, (actLaborMap.get(l.category) || 0) + (Number(l.count) || 0));
        }
      });
    });
    if (actLaborMap.size > 0) {
      const defaults = createDefaultLaborSummary();
      const extra = Array.from(actLaborMap.entries())
        .filter(([cat]) => !defaults.some(d => d.category === cat))
        .map(([category, count]) => ({ category, count }));
      laborSummary = [
        ...defaults.map(d => ({ category: d.category, count: actLaborMap.get(d.category) || 0 })),
        ...extra
      ];
    } else {
      laborSummary = readLocalJson<DailyActivityLaborItem[]>(
        `era_labor_${proj.id}_${dateStr}`,
        createDefaultLaborSummary()
      );
    }
  }

  const weather = explicitLog?.weather || dayActs[0]?.weatherCondition || 'Sunny';
  const shift = explicitLog?.shift || dayActs[0]?.shift || 'Day Shift (Standard)';
  const isNoWorkDay = explicitLog?.isNoWorkDay !== undefined
    ? Boolean(explicitLog.isNoWorkDay)
    : readLocalJson<boolean>(`era_no_work_${proj.id}_${dateStr}`, false);
  const noWorkReason = explicitLog?.noWorkReason || readLocalJson<string>(`era_no_work_reason_${proj.id}_${dateStr}`, STANDSTILL_REASONS[0]);
  const noWorkNotes = explicitLog?.noWorkNotes !== undefined
    ? explicitLog.noWorkNotes
    : readLocalJson<string>(`era_no_work_notes_${proj.id}_${dateStr}`, '');

  const logisticsCtx = resolveLogisticsProductionContext(proj, dateStr);
  let productionList: DailyProductionItem[];
  if (explicitLog?.productionList && Array.isArray(explicitLog.productionList)) {
    productionList = reconcileProductionListWithLogistics(explicitLog.productionList, proj, dateStr);
  } else if (logisticsCtx.productionItems.length > 0) {
    productionList = buildProductionListFromLogistics(proj, dateStr);
  } else {
    productionList = readLocalJson<DailyProductionItem[]>(
      `era_production_${proj.id}_${dateStr}`,
      createDefaultProductionList()
    );
  }

  let equipmentFleet: EquipmentFleetItem[];
  if (explicitLog?.equipmentFleet && Array.isArray(explicitLog.equipmentFleet)) {
    equipmentFleet = explicitLog.equipmentFleet;
  } else {
    const storedEq = readLocalJson<EquipmentFleetItem[] | null>(`era_equipment_${proj.id}_${dateStr}`, null);
    if (storedEq) {
      equipmentFleet = storedEq;
    } else {
      const actEq: EquipmentFleetItem[] = [];
      dayActs.forEach(a => {
        (a.equipmentList || []).forEach((eq, idx) => {
          actEq.push({
            id: eq.id || `${a.id}_eq_${idx}`,
            name: eq.name,
            typeCapacity: a.activityName || `Sec ${a.activityType}`,
            status: eq.status,
            workingHours: Number(a.workingHours) || 8,
            remarks: a.startStationKm ? `Stn ${a.startStationKm}` : 'Site assignment'
          });
        });
      });
      equipmentFleet = actEq.length > 0 ? actEq : createDefaultEquipmentFleet();
    }
  }

  const materialsList = explicitLog?.materialsList && Array.isArray(explicitLog.materialsList)
    ? explicitLog.materialsList
    : readLocalJson<DailyMaterialItem[]>(`era_materials_${proj.id}_${dateStr}`, createDefaultMaterialsList());

  const siteChallenges = explicitLog?.siteChallenges && Array.isArray(explicitLog.siteChallenges)
    ? explicitLog.siteChallenges
    : readLocalJson<string[]>(`era_challenges_${proj.id}_${dateStr}`, createDefaultSiteChallenges());

  const tomorrowPlans = explicitLog?.tomorrowPlans && Array.isArray(explicitLog.tomorrowPlans)
    ? explicitLog.tomorrowPlans
    : readLocalJson<DailyTomorrowPlanItem[]>(`era_plans_${proj.id}_${dateStr}`, createDefaultTomorrowPlans());

  return {
    dailyNotes,
    laborSummary,
    weather,
    shift,
    isNoWorkDay,
    noWorkReason,
    noWorkNotes,
    productionList,
    equipmentFleet,
    materialsList,
    siteChallenges,
    tomorrowPlans,
    updatedAt: explicitLog?.updatedAt || null
  };
}

export default function DailyActivitiesView({
  project,
  onUpdateProject,
  isReadonly = false,
  currentUserObj = null,
}: DailyActivitiesViewProps) {
  // Activities state
  const activities = useMemo(() => Array.isArray(project.dailyActivities) ? project.dailyActivities : [], [project.dailyActivities]);

  // View States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const initialHydration = useMemo(() => hydrateDayFieldsFromProject(project, selectedDate), []);

  const [weather, setWeather] = useState<string>(initialHydration.weather);
  const [shift, setShift] = useState<string>(initialHydration.shift);
  const [dailyNotes, setDailyNotes] = useState<string>(initialHydration.dailyNotes);
  const [laborSummary, setLaborSummary] = useState<DailyActivityLaborItem[]>(initialHydration.laborSummary);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialHydration.updatedAt);

  const [activeTab, setActiveTab] = useState<'register' | 'production' | 'resources' | 'challenges' | 'all'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workRegisterActivityFilter, setWorkRegisterActivityFilter] = useState<string>('ALL');
  const [workRegisterStatusFilter, setWorkRegisterStatusFilter] = useState<string>('ALL');
  const [showPartyEditor, setShowPartyEditor] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // Quick-Add Work Entry States
  const [quickSectionId, setQuickSectionId] = useState<string>('1');
  const [quickDesc, setQuickDesc] = useState<string>('');
  const [quickStation, setQuickStation] = useState<string>('');
  const [quickQty, setQuickQty] = useState<string>('');
  const [quickSide, setQuickSide] = useState<string>('BHS');

  // Real-time Sync Status: 'saved' | 'saving' | 'idle'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPendingDirtyRef = useRef<boolean>(false);
  const pendingActionDescRef = useRef<string>('Synchronized Daily Site Log & Notes');
  const pendingActivitiesRef = useRef<DailyActivityRecord[] | undefined>(undefined);
  const lastLocalCommitAtRef = useRef<string>('');
  const lastHydratedKeyRef = useRef<string>(`${project.id}_${selectedDate}_${initialHydration.updatedAt || ''}`);

  // Print Specific Day Modal States
  const [isPrintSpecificDayOpen, setIsPrintSpecificDayOpen] = useState(false);
  const [printTargetDate, setPrintTargetDate] = useState(selectedDate);

  // Bulk Edit Mode States
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('Approved');
  const [bulkSideValue, setBulkSideValue] = useState<string>('BHS');
  const [bulkUnitValue, setBulkUnitValue] = useState<string>('km');
  const [bulkQuantityValue, setBulkQuantityValue] = useState<string>('');

  // Pipe Construction Quick Selection & Stage Filter States
  const [selectedPipeLocation, setSelectedPipeLocation] = useState<string>('200+313');
  const [customPipeLocation, setCustomPipeLocation] = useState<string>('');
  const [selectedPipeStage, setSelectedPipeStage] = useState<PipeConstructionStage>('Excavation');
  const [selectedPipeStagePct, setSelectedPipeStagePct] = useState<number>(100);
  const [selectedPipeStageKm, setSelectedPipeStageKm] = useState<number>(0.0);
  const [pipeFilterStage, setPipeFilterStage] = useState<string>('ALL');
  const [isPipeScrollEnabled, setIsPipeScrollEnabled] = useState<boolean>(true);
  const pipeTableScrollRef = useRef<HTMLDivElement | null>(null);
  const workRegScrollRef = useRef<HTMLDivElement | null>(null);

  // Bridge Construction Quick Selection & Stage Filter States
  const [selectedBridgeLocation, setSelectedBridgeLocation] = useState<string>('Bridge @ Km 198+450 (River Dermi)');
  const [customBridgeLocation, setCustomBridgeLocation] = useState<string>('');
  const [selectedBridgeStage, setSelectedBridgeStage] = useState<BridgeConstructionStage>('Foundation');
  const [selectedPipeStagePctBridge] = useState<number>(100);
  void selectedPipeStagePctBridge;
  const [selectedBridgeStagePct, setSelectedBridgeStagePct] = useState<number>(100);
  const [selectedBridgeStageKm, setSelectedBridgeStageKm] = useState<number>(0.02);
  const [bridgeFilterStage, setBridgeFilterStage] = useState<string>('ALL');

  // Box Culvert Construction Quick Selection & Stage Filter States
  const [selectedBoxLocation, setSelectedBoxLocation] = useState<string>('Box Culvert @ Km 195+600 (2x2m)');
  const [customBoxLocation, setCustomBoxLocation] = useState<string>('');
  const [selectedBoxStage, setSelectedBoxStage] = useState<BoxCulvertStage>('Excavation & Blinding');
  const [selectedBoxStagePct, setSelectedBoxStagePct] = useState<number>(100);
  const [selectedBoxStageKm, setSelectedBoxStageKm] = useState<number>(0.015);
  const [boxFilterStage, setBoxFilterStage] = useState<string>('ALL');

  // Slab Culvert Construction Quick Selection & Stage Filter States
  const [selectedSlabLocation, setSelectedSlabLocation] = useState<string>('Slab Culvert @ Km 197+200 (Span 4m)');
  const [customSlabLocation, setCustomSlabLocation] = useState<string>('');
  const [selectedSlabStage, setSelectedSlabStage] = useState<SlabCulvertStage>('Excavation & Footing');
  const [selectedSlabStagePct, setSelectedSlabStagePct] = useState<number>(100);
  const [selectedSlabStageKm, setSelectedSlabStageKm] = useState<number>(0.01);
  const [slabFilterStage, setSlabFilterStage] = useState<string>('ALL');

  // Activity Templates State
  const [templates, setTemplates] = useState<ActivityTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(`era_activity_templates_${project.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_ACTIVITY_TEMPLATES;
  });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // Dynamic Activity Sections List (Allows deleting from activities and re-adding)
  const [sections, setSections] = useState<WorkRegisterSectionDef[]>(() => loadActiveSectionsForProject(project.id));

  useEffect(() => {
    setSections(loadActiveSectionsForProject(project.id));
  }, [project.id]);

  // Structure Views Visibility (Hide / Show) for Pipe, Box Culvert, Slab Culvert, Bridge
  const [hiddenStructureViews, setHiddenStructureViews] = useState<{
    pipe: boolean;
    box: boolean;
    slab: boolean;
    bridge: boolean;
  }>(() => {
    try {
      const stored = localStorage.getItem(`era_hidden_structures_${project.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return { pipe: false, box: false, slab: false, bridge: false };
  });

  const toggleStructureVisibility = (type: 'pipe' | 'box' | 'slab' | 'bridge') => {
    setHiddenStructureViews(prev => {
      const updated = { ...prev, [type]: !prev[type] };
      try {
        localStorage.setItem(`era_hidden_structures_${project.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleAllStructuresVisibility = (hideAll: boolean) => {
    const updated = { pipe: hideAll, box: hideAll, slab: hideAll, bridge: hideAll };
    setHiddenStructureViews(updated);
    try {
      localStorage.setItem(`era_hidden_structures_${project.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Modal States
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DailyActivityRecord | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionCode, setNewSectionCode] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  // Standstill / No Work Day State
  const [isNoWorkDay, setIsNoWorkDay] = useState<boolean>(initialHydration.isNoWorkDay);
  const [noWorkReason, setNoWorkReason] = useState<string>(initialHydration.noWorkReason);
  const [noWorkNotes, setNoWorkNotes] = useState<string>(initialHydration.noWorkNotes);

  // Production Table State & Column Width Arrangement
  const [productionList, setProductionList] = useState<DailyProductionItem[]>(initialHydration.productionList);
  const [prodColWidths, setProdColWidths] = useState<Record<ProductionColKey, number>>(() => ({
    ...DEFAULT_PRODUCTION_COL_WIDTHS,
    ...readLocalJson<Partial<Record<ProductionColKey, number>>>(`era_prod_col_widths_${project.id}`, {})
  }));
  const [resizingProdCol, setResizingProdCol] = useState<ProductionColKey | null>(null);
  const prodResizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setProdColWidths({
      ...DEFAULT_PRODUCTION_COL_WIDTHS,
      ...readLocalJson<Partial<Record<ProductionColKey, number>>>(`era_prod_col_widths_${project.id}`, {})
    });
  }, [project.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`era_prod_col_widths_${project.id}`, JSON.stringify(prodColWidths));
    } catch {}
  }, [prodColWidths, project.id]);

  useEffect(() => {
    return () => {
      prodResizeCleanupRef.current?.();
    };
  }, []);

  const updateProdColWidth = useCallback((colKey: ProductionColKey, nextWidth: number) => {
    const meta = PRODUCTION_COL_META.find(m => m.key === colKey);
    const minW = meta?.min ?? 60;
    const maxW = meta?.max ?? 480;
    const clamped = Math.round(Math.min(maxW, Math.max(minW, nextWidth)));
    setProdColWidths(prev => (prev[colKey] === clamped ? prev : { ...prev, [colKey]: clamped }));
  }, []);

  const startProdColResize = useCallback((colKey: ProductionColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    prodResizeCleanupRef.current?.();

    const startX = e.clientX;
    const initialWidth = prodColWidths[colKey] || DEFAULT_PRODUCTION_COL_WIDTHS[colKey];
    const meta = PRODUCTION_COL_META.find(m => m.key === colKey);
    const minW = meta?.min ?? 60;
    const maxW = meta?.max ?? 480;

    setResizingProdCol(colKey);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const clamped = Math.round(Math.min(maxW, Math.max(minW, initialWidth + deltaX)));
      setProdColWidths(prev => (prev[colKey] === clamped ? prev : { ...prev, [colKey]: clamped }));
    };

    const onMouseUp = () => {
      setResizingProdCol(null);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      prodResizeCleanupRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    prodResizeCleanupRef.current = cleanup;
  }, [prodColWidths]);

  const totalProdTableWidth = useMemo(() => {
    const dataSum = PRODUCTION_COL_META.reduce((sum, col) => sum + (prodColWidths[col.key] || DEFAULT_PRODUCTION_COL_WIDTHS[col.key]), 0);
    return dataSum + (!isReadonly ? 48 : 0);
  }, [prodColWidths, isReadonly]);

  // Work Register Table Column Width Arrangement State
  const [workRegColWidths, setWorkRegColWidths] = useState<Record<WorkRegColKey, number>>(() => ({
    ...DEFAULT_WORK_REG_COL_WIDTHS,
    ...readLocalJson<Partial<Record<WorkRegColKey, number>>>(`era_work_reg_col_widths_${project.id}`, {})
  }));
  const [resizingRegCol, setResizingRegCol] = useState<WorkRegColKey | null>(null);
  const regResizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setWorkRegColWidths({
      ...DEFAULT_WORK_REG_COL_WIDTHS,
      ...readLocalJson<Partial<Record<WorkRegColKey, number>>>(`era_work_reg_col_widths_${project.id}`, {})
    });
  }, [project.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`era_work_reg_col_widths_${project.id}`, JSON.stringify(workRegColWidths));
    } catch {}
  }, [workRegColWidths, project.id]);

  useEffect(() => {
    return () => {
      regResizeCleanupRef.current?.();
    };
  }, []);

  const updateRegColWidth = useCallback((colKey: WorkRegColKey, nextWidth: number) => {
    const meta = WORK_REG_COL_META.find(m => m.key === colKey);
    const minW = meta?.min ?? 56;
    const maxW = meta?.max ?? 520;
    const clamped = Math.round(Math.min(maxW, Math.max(minW, nextWidth)));
    setWorkRegColWidths(prev => (prev[colKey] === clamped ? prev : { ...prev, [colKey]: clamped }));
  }, []);

  const startRegColResize = useCallback((colKey: WorkRegColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    regResizeCleanupRef.current?.();

    const startX = e.clientX;
    const initialWidth = workRegColWidths[colKey] || DEFAULT_WORK_REG_COL_WIDTHS[colKey];
    const meta = WORK_REG_COL_META.find(m => m.key === colKey);
    const minW = meta?.min ?? 56;
    const maxW = meta?.max ?? 520;

    setResizingRegCol(colKey);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const clamped = Math.round(Math.min(maxW, Math.max(minW, initialWidth + deltaX)));
      setWorkRegColWidths(prev => (prev[colKey] === clamped ? prev : { ...prev, [colKey]: clamped }));
    };

    const onMouseUp = () => {
      setResizingRegCol(null);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      regResizeCleanupRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    regResizeCleanupRef.current = cleanup;
  }, [workRegColWidths]);

  const totalWorkRegTableWidth = useMemo(() => {
    const dataSum = WORK_REG_COL_META.reduce((sum, col) => sum + (workRegColWidths[col.key] || DEFAULT_WORK_REG_COL_WIDTHS[col.key]), 0);
    return dataSum + (isBulkEditMode ? 40 : 0) + (!isReadonly ? 80 : 0);
  }, [workRegColWidths, isBulkEditMode, isReadonly]);

  // Sub-row Structure Tables (Pipe, Box, Slab, Bridge) Column Width Arrangement
  const [subTableColWidths, setSubTableColWidths] = useState<Record<SubTableKey, Record<string, number>>>(() => {
    const defaults = getDefaultSubTableColWidths();
    const stored = readLocalJson<Partial<Record<SubTableKey, Record<string, number>>>>(`era_work_subtable_col_widths_${project.id}`, {});
    return {
      pipe: { ...defaults.pipe, ...(stored.pipe || {}) },
      box: { ...defaults.box, ...(stored.box || {}) },
      slab: { ...defaults.slab, ...(stored.slab || {}) },
      bridge: { ...defaults.bridge, ...(stored.bridge || {}) }
    };
  });
  const [resizingSubCol, setResizingSubCol] = useState<{ table: SubTableKey; col: string } | null>(null);
  const subResizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const defaults = getDefaultSubTableColWidths();
    const stored = readLocalJson<Partial<Record<SubTableKey, Record<string, number>>>>(`era_work_subtable_col_widths_${project.id}`, {});
    setSubTableColWidths({
      pipe: { ...defaults.pipe, ...(stored.pipe || {}) },
      box: { ...defaults.box, ...(stored.box || {}) },
      slab: { ...defaults.slab, ...(stored.slab || {}) },
      bridge: { ...defaults.bridge, ...(stored.bridge || {}) }
    });
  }, [project.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`era_work_subtable_col_widths_${project.id}`, JSON.stringify(subTableColWidths));
    } catch {}
  }, [subTableColWidths, project.id]);

  useEffect(() => {
    return () => {
      subResizeCleanupRef.current?.();
    };
  }, []);

  const resetSubColWidth = useCallback((tableKey: SubTableKey, colKey: string) => {
    const def = SUB_TABLE_COLS[tableKey].find(c => c.key === colKey);
    const defaultW = def?.defaultWidth ?? 96;
    setSubTableColWidths(prev => ({
      ...prev,
      [tableKey]: { ...prev[tableKey], [colKey]: defaultW }
    }));
  }, []);

  const startSubColResize = useCallback((tableKey: SubTableKey, colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    subResizeCleanupRef.current?.();

    const startX = e.clientX;
    const def = SUB_TABLE_COLS[tableKey].find(c => c.key === colKey);
    const initialWidth = subTableColWidths[tableKey]?.[colKey] || def?.defaultWidth || 96;
    const minW = 52;
    const maxW = 460;

    setResizingSubCol({ table: tableKey, col: colKey });

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const clamped = Math.round(Math.min(maxW, Math.max(minW, initialWidth + deltaX)));
      setSubTableColWidths(prev => {
        if (prev[tableKey]?.[colKey] === clamped) return prev;
        return {
          ...prev,
          [tableKey]: { ...prev[tableKey], [colKey]: clamped }
        };
      });
    };

    const onMouseUp = () => {
      setResizingSubCol(null);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      subResizeCleanupRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    subResizeCleanupRef.current = cleanup;
  }, [subTableColWidths]);

  const getSubTableTotalWidth = useCallback((tableKey: SubTableKey) => {
    const sum = SUB_TABLE_COLS[tableKey].reduce(
      (acc, col) => acc + (subTableColWidths[tableKey]?.[col.key] || col.defaultWidth),
      0
    );
    return sum + (isBulkEditMode ? 32 : 0) + (!isReadonly ? 56 : 0);
  }, [subTableColWidths, isBulkEditMode, isReadonly]);

  // Equipment Fleet Deployment State
  const [equipmentFleet, setEquipmentFleet] = useState<EquipmentFleetItem[]>(initialHydration.equipmentFleet);

  // Materials Tracker
  const [materialsList, setMaterialsList] = useState<DailyMaterialItem[]>(initialHydration.materialsList);

  // Site Challenges & Obstructions
  const [siteChallenges, setSiteChallenges] = useState<string[]>(initialHydration.siteChallenges);

  // Tomorrow Work Plan
  const [tomorrowPlans, setTomorrowPlans] = useState<DailyTomorrowPlanItem[]>(initialHydration.tomorrowPlans);

  // Keep a mutable ref to latest values so debounced saves, date-switches, and unmount flushes never capture stale closures
  const latestStateRef = useRef({
    project,
    selectedDate,
    activities,
    weather,
    shift,
    dailyNotes,
    laborSummary,
    isNoWorkDay,
    noWorkReason,
    noWorkNotes,
    productionList,
    equipmentFleet,
    materialsList,
    siteChallenges,
    tomorrowPlans,
    currentUserObj,
    isReadonly
  });

  latestStateRef.current = {
    project,
    selectedDate,
    activities,
    weather,
    shift,
    dailyNotes,
    laborSummary,
    isNoWorkDay,
    noWorkReason,
    noWorkNotes,
    productionList,
    equipmentFleet,
    materialsList,
    siteChallenges,
    tomorrowPlans,
    currentUserObj,
    isReadonly
  };

  // Consultant label based on DB vs DBB
  const consultantRoleLabel = project.contractType === 'DBB'
    ? 'Supervision Consultant'
    : "Employer's Representative";

  const commitDailySync = useCallback((
    overrideState?: Partial<typeof latestStateRef.current>,
    overrideActivities?: DailyActivityRecord[],
    actionDesc = 'Synchronized Daily Site Log & Notes'
  ) => {
    const s = { ...latestStateRef.current, ...(overrideState || {}) };
    if (s.isReadonly) {
      hasPendingDirtyRef.current = false;
      setSaveStatus('saved');
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    hasPendingDirtyRef.current = false;
    pendingActivitiesRef.current = undefined;

    const nowIso = new Date().toISOString();
    lastLocalCommitAtRef.current = nowIso;

    const entry: DailySiteLogEntry = {
      date: s.selectedDate,
      weather: s.weather,
      shift: s.shift,
      dailyNotes: s.dailyNotes,
      isNoWorkDay: s.isNoWorkDay,
      noWorkReason: s.noWorkReason,
      noWorkNotes: s.noWorkNotes,
      laborSummary: (s.laborSummary || []).map(l => ({ category: l.category, count: Number(l.count) || 0 })),
      equipmentFleet: s.equipmentFleet || [],
      materialsList: s.materialsList || [],
      productionList: s.productionList || [],
      siteChallenges: s.siteChallenges || [],
      tomorrowPlans: s.tomorrowPlans || [],
      updatedAt: nowIso,
      updatedBy: s.currentUserObj?.username || s.currentUserObj?.name || 'Construction Manager'
    };

    const prevDayProductionList = s.project.dailySiteLogs?.[s.selectedDate]?.productionList || [];
    const logisticsSyncPatch = syncDailyProductionToLogistics(
      s.project,
      s.selectedDate,
      prevDayProductionList,
      s.productionList || [],
      s.currentUserObj?.email || s.currentUserObj?.username
    );

    const nextSiteLogs: Record<string, DailySiteLogEntry> = {
      ...(s.project.dailySiteLogs || {}),
      [s.selectedDate]: entry
    };

    const baseActivities = overrideActivities !== undefined ? overrideActivities : s.activities;
    const syncedActivities = baseActivities.map(act => {
      if (act.date === s.selectedDate) {
        return {
          ...act,
          weatherCondition: s.weather,
          shift: s.shift,
          dailyNotes: s.dailyNotes,
          updatedAt: act.updatedAt || nowIso
        };
      }
      return act;
    });

    onUpdateProject(
      {
        dailyActivities: syncedActivities,
        dailySiteLogs: nextSiteLogs,
        ...(logisticsSyncPatch || {})
      },
      actionDesc
    );

    broadcastDailyActivitiesSync(s.project.id, s.selectedDate, nowIso);
    lastHydratedKeyRef.current = `${s.project.id}_${s.selectedDate}_${nowIso}`;
    setLastSyncedAt(nowIso);
    setSaveStatus('saved');
  }, [onUpdateProject]);

  // Flush any pending unsaved changes cleanly on unmount so tab-switching to Comprehensive Analysis or Monthly Cumulative reflects latest inputs immediately
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (hasPendingDirtyRef.current && !latestStateRef.current.isReadonly) {
        commitDailySync(undefined, pendingActivitiesRef.current, pendingActionDescRef.current);
      }
    };
  }, [commitDailySync]);

  // Schedule unified real-time sync for resource / Daily Notes / weather / shift changes
  const scheduleResourceSync = useCallback((
    partialState: Partial<typeof latestStateRef.current>,
    actionDesc: string,
    overrideActivities?: DailyActivityRecord[]
  ) => {
    // Update ref synchronously so fast typing followed immediately by Save or Tab Switch always sees latest values
    latestStateRef.current = { ...latestStateRef.current, ...partialState };
    if (latestStateRef.current.isReadonly) return;

    setSaveStatus('saving');
    hasPendingDirtyRef.current = true;
    pendingActionDescRef.current = actionDesc;
    if (overrideActivities !== undefined) {
      pendingActivitiesRef.current = overrideActivities;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      commitDailySync(undefined, pendingActivitiesRef.current, pendingActionDescRef.current);
    }, 450);
  }, [commitDailySync]);

  // Unified debounced save helper used by all Work Register activity mutations
  const triggerDebouncedSave = (updatedActivities: DailyActivityRecord[], actionDesc: string) => {
    scheduleResourceSync({ activities: updatedActivities }, actionDesc, updatedActivities);
  };

  // Explicit Save & Sync trigger for immediate commit into Comprehensive Analysis & Monthly Cumulative
  const handleSaveAndSyncNow = () => {
    if (isReadonly) return;
    commitDailySync(undefined, pendingActivitiesRef.current, `Saved Daily Site Log & Notes for ${selectedDate}`);
    setFeedbackNotice({
      type: 'success',
      text: `Daily Activities, Labor, Materials & Daily Notes for ${selectedDate} saved and synced to Comprehensive Analysis and Monthly Cumulative.`
    });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Switch selected date while flushing pending edits from previous date first
  const handleSelectDate = (nextDate: string) => {
    if (!nextDate || nextDate === selectedDate) return;
    if (hasPendingDirtyRef.current && !latestStateRef.current.isReadonly) {
      commitDailySync(undefined, pendingActivitiesRef.current, 'Auto-saved Daily Site Log prior to date switch');
    }
    setSelectedDate(nextDate);
  };

  // Re-hydrate whenever project, selectedDate, or remote dailySiteLogs timestamp changes
  const remoteLogUpdatedAt = project.dailySiteLogs?.[selectedDate]?.updatedAt || '';
  useEffect(() => {
    const syncKey = `${project.id}_${selectedDate}_${remoteLogUpdatedAt}`;
    if (remoteLogUpdatedAt && remoteLogUpdatedAt === lastLocalCommitAtRef.current) {
      lastHydratedKeyRef.current = syncKey;
      return;
    }
    if (hasPendingDirtyRef.current && lastHydratedKeyRef.current === syncKey) {
      return;
    }

    const hydrated = hydrateDayFieldsFromProject(project, selectedDate);
    setDailyNotes(hydrated.dailyNotes);
    setLaborSummary(hydrated.laborSummary);
    setWeather(hydrated.weather);
    setShift(hydrated.shift);
    setIsNoWorkDay(hydrated.isNoWorkDay);
    setNoWorkReason(hydrated.noWorkReason);
    setNoWorkNotes(hydrated.noWorkNotes);
    setProductionList(hydrated.productionList);
    setEquipmentFleet(hydrated.equipmentFleet);
    setMaterialsList(hydrated.materialsList);
    setSiteChallenges(hydrated.siteChallenges);
    setTomorrowPlans(hydrated.tomorrowPlans);
    setLastSyncedAt(hydrated.updatedAt);
    setSelectedRowIds([]);
    setPrintTargetDate(selectedDate);
    lastHydratedKeyRef.current = syncKey;
  }, [selectedDate, project.id, remoteLogUpdatedAt]);

  // Live Logistics & Resources Production Context for the active date/month
  const logisticsProductionContext = useMemo(
    () => resolveLogisticsProductionContext(project, selectedDate),
    [project, selectedDate]
  );

  const logisticsSignature = useMemo(
    () => JSON.stringify(
      logisticsProductionContext.allItems.map(m => [
        m.id,
        m.desc,
        m.scope,
        m.monthlyTarget,
        m.previousMonthTotal,
        m.thisMonth,
        m.totalToDate,
        m.availableStock,
        m.category
      ])
    ),
    [logisticsProductionContext.allItems]
  );

  // Reconcile Site & Industrial Production Table whenever Logistics & Resources values update
  useEffect(() => {
    if (hasPendingDirtyRef.current) return;
    const hasExplicit = Boolean(project.dailySiteLogs?.[selectedDate]?.productionList);
    const sourceList = hasExplicit
      ? project.dailySiteLogs![selectedDate].productionList
      : (logisticsProductionContext.productionItems.length > 0
          ? buildProductionListFromLogistics(project, selectedDate)
          : latestStateRef.current.productionList);
    const reconciled = reconcileProductionListWithLogistics(sourceList, project, selectedDate);
    if (JSON.stringify(reconciled) !== JSON.stringify(latestStateRef.current.productionList)) {
      setProductionList(reconciled);
    }
  }, [logisticsSignature, selectedDate, project.id]);

  // Persist local cache mirror per date (reclaim cleanly if quota tight)
  useEffect(() => {
    const entries: Array<[string, unknown]> = [
      [`era_daily_notes_${project.id}_${selectedDate}`, dailyNotes],
      [`era_labor_${project.id}_${selectedDate}`, laborSummary],
      [`era_no_work_${project.id}_${selectedDate}`, isNoWorkDay],
      [`era_no_work_reason_${project.id}_${selectedDate}`, noWorkReason],
      [`era_no_work_notes_${project.id}_${selectedDate}`, noWorkNotes],
      [`era_production_${project.id}_${selectedDate}`, productionList],
      [`era_equipment_${project.id}_${selectedDate}`, equipmentFleet],
      [`era_challenges_${project.id}_${selectedDate}`, siteChallenges],
      [`era_plans_${project.id}_${selectedDate}`, tomorrowPlans],
      [`era_active_sections_${project.id}`, sections],
    ];
    try {
      localStorage.removeItem(`era_materials_${project.id}_${selectedDate}`);
      for (const [k, v] of entries) {
        localStorage.setItem(k, JSON.stringify(v));
      }
    } catch {
      // Primary persistence lives in project.dailySiteLogs & Firestore; skip mirror on tight quota
    }
  }, [dailyNotes, laborSummary, isNoWorkDay, noWorkReason, noWorkNotes, productionList, equipmentFleet, siteChallenges, tomorrowPlans, sections, project.id, selectedDate]);

  // Navigate date with Previous/Next buttons
  const handleDateNav = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + offset);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    handleSelectDate(`${newY}-${newM}-${newD}`);
  };

  // Day's activities
  const currentActivities = useMemo(() => {
    return activities.filter(a => a.date === selectedDate);
  }, [activities, selectedDate]);

  // Recent dates that have recorded daily activities or daily site logs
  const loggedDatesSummary = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach(a => {
      if (!a.date) return;
      counts.set(a.date, (counts.get(a.date) || 0) + 1);
    });
    if (project.dailySiteLogs) {
      Object.keys(project.dailySiteLogs).forEach(d => {
        if (!counts.has(d)) counts.set(d, 0);
      });
    }
    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activities, project.dailySiteLogs]);

  // Summary aggregation
  const summaryStats = useMemo(() => {
    const activeEquipment = equipmentFleet.filter(eq => eq.status === 'Operating').length;
    const standbyEquipment = equipmentFleet.filter(eq => eq.status === 'Standby').length;
    const breakdownEquipment = equipmentFleet.filter(eq => eq.status === 'Breakdown' || eq.status === 'Maintenance').length;
    const activeSectionsToday = new Set(currentActivities.map(a => a.activityType)).size;
    const totalPlantActual = productionList.reduce((acc, p) => acc + (Number(p.actualOutput) || 0), 0);
    const totalLaborCount = laborSummary.reduce((acc, l) => acc + (Number(l.count) || 0), 0);
    const totalMaterialUsed = materialsList.reduce((acc, m) => acc + (Number(m.used) || 0), 0);
    const totalMaterialReceived = materialsList.reduce((acc, m) => acc + (Number(m.received) || 0), 0);

    return {
      activeEquipment,
      standbyEquipment,
      breakdownEquipment,
      totalFleet: equipmentFleet.length,
      totalActivities: currentActivities.length,
      activeSectionsToday,
      totalProductionUnits: productionList.length,
      totalPlantActual,
      totalLaborCount,
      totalMaterialUsed,
      totalMaterialReceived
    };
  }, [equipmentFleet, currentActivities, productionList, laborSummary, materialsList]);

  // Check activities exceeding BOQ quantity threshold (> 20% variance)
  const activitiesExceedingBoq = useMemo(() => {
    if (!project.quantities || project.quantities.length === 0) return [];
    return currentActivities.map(act => {
      const secTarget = sections.find(s => s.id === act.activityType);
      const secName = secTarget?.name || act.activityName || '';
      const qty = Number(act.quantityExecuted ?? act.metricKm ?? act.metricM3 ?? act.pcsThisDay ?? 0);
      const boqInfo = checkBoqQuantityVariance(act.activityType, secName, qty, project.quantities);
      return {
        act,
        secName,
        qty,
        boqInfo
      };
    }).filter(item => item.boqInfo.exceedsVariance);
  }, [currentActivities, sections, project.quantities]);

  // Available Standard 16 Activities not currently in the active sections list
  const removedStandardSections = useMemo(() => {
    const activeIds = new Set(sections.map(s => s.id));
    return WORK_SECTIONS.filter(s => !activeIds.has(s.id));
  }, [sections]);

  // Section cumulative calculations
  const getSectionCumulativeTotals = (sectionId: string) => {
    const curActs = activities.filter(a => a.date === selectedDate && a.activityType === sectionId);
    const prevActs = activities.filter(a => a.date < selectedDate && a.activityType === sectionId);

    let prevVal = 0;
    let curVal = 0;

    curActs.forEach(a => {
      if (['1','2','6','7','8','9','10','11','12','18'].includes(sectionId)) {
        curVal += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        curVal += Number(a.metricM3) || Number(a.metricKm) || 0;
      } else if (sectionId === '13') {
        curVal += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '17') {
        curVal += Number(a.bridgeDailyProgress) || 0;
      } else {
        curVal += Number(a.metricKm) || 0;
      }
    });

    prevActs.forEach(a => {
      if (['1','2','6','7','8','9','10','11','12','18'].includes(sectionId)) {
        prevVal += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        prevVal += Number(a.metricM3) || Number(a.metricKm) || 0;
      } else if (sectionId === '13') {
        prevVal += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '17') {
        prevVal += Number(a.bridgeDailyProgress) || 0;
      } else {
        prevVal += Number(a.metricKm) || 0;
      }
    });

    return {
      previous: prevVal,
      current: curVal,
      cumulative: prevVal + curVal
    };
  };

  // Handlers for activity rows
  // Handlers for activity rows
  const handleAddRowAt = (sectionId: string, locationPreset?: string) => {
    const defaultUnit = getDefaultUnit(sectionId);
    let loc = locationPreset || '';
    let actName = '';
    let desc = '';
    let stage: string | undefined = undefined;

    const isPipe = sectionId === '14';
    const isBox = sectionId === '15' || sectionId === '14.1';
    const isSlab = sectionId === '16' || sectionId === '14.2';
    const isBridge = sectionId === '17';

    if (isPipe) {
      loc = locationPreset || (customPipeLocation || selectedPipeLocation || '200+313');
      actName = 'RCP Pipe Construction';
      desc = `RCP Culvert at Stn ${loc} - ${selectedPipeStage}`;
      stage = selectedPipeStage;
    } else if (isBox) {
      loc = locationPreset || (customBoxLocation || selectedBoxLocation || 'Box Culvert @ Km 195+600 (2x2m)');
      actName = 'Box Culvert Construction';
      desc = `Box Culvert at ${loc} - ${selectedBoxStage}`;
      stage = selectedBoxStage;
    } else if (isSlab) {
      loc = locationPreset || (customSlabLocation || selectedSlabLocation || 'Slab Culvert @ Km 197+200 (Span 4m)');
      actName = 'Slab Culvert Construction';
      desc = `Slab Culvert at ${loc} - ${selectedSlabStage}`;
      stage = selectedSlabStage;
    } else if (isBridge) {
      loc = locationPreset || (customBridgeLocation || selectedBridgeLocation || 'Bridge @ Km 198+450 (River Dermi)');
      actName = 'Bridge Construction';
      desc = `${loc} - ${selectedBridgeStage}`;
      stage = selectedBridgeStage;
    }

    const newAct: DailyActivityRecord = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      activityType: sectionId,
      activityName: actName,
      description: desc,
      startStationKm: loc,
      // Pipe fields
      pipeLocation: isPipe ? loc : undefined,
      pipeSelectedStage: isPipe ? stage : undefined,
      pipeExcavationPct: isPipe ? 100 : undefined,
      pipeMasonryPct: isPipe ? 100 : undefined,
      pipePavedWaterwayPct: isPipe ? 100 : undefined,
      pipeInstallationPct: isPipe ? 100 : undefined,
      pipeBackfillPct: isPipe ? 100 : undefined,
      pipePreviousPct: (isPipe || isBox || isSlab) ? 100 : undefined,
      pipeDailyProgressPct: (isPipe || isBox || isSlab) ? 0 : undefined,
      pipeToDatePct: (isPipe || isBox || isSlab) ? 100 : undefined,
      // Box Culvert fields
      boxCulvertLocation: isBox ? loc : undefined,
      boxCulvertSelectedStage: isBox ? stage : undefined,
      boxExcavationPct: isBox ? 100 : undefined,
      boxBottomSlabPct: isBox ? 100 : undefined,
      boxWallsPct: isBox ? 100 : undefined,
      boxTopSlabPct: isBox ? 100 : undefined,
      boxWingwallsPct: isBox ? 100 : undefined,
      boxBackfillPct: isBox ? 100 : undefined,
      // Slab Culvert fields
      slabCulvertLocation: isSlab ? loc : undefined,
      slabCulvertSelectedStage: isSlab ? stage : undefined,
      slabExcavationPct: isSlab ? 100 : undefined,
      slabAbutmentPct: isSlab ? 100 : undefined,
      slabDeckPct: isSlab ? 100 : undefined,
      slabWingwallsPct: isSlab ? 100 : undefined,
      slabPitchingPct: isSlab ? 100 : undefined,
      slabBackfillPct: isSlab ? 100 : undefined,
      // Bridge fields
      bridgeLocation: isBridge ? loc : undefined,
      bridgeSelectedStage: isBridge ? stage : undefined,
      bridgeFoundationPct: isBridge ? 100 : undefined,
      bridgeAbutmentPct: isBridge ? 100 : undefined,
      bridgePierPct: isBridge ? 100 : undefined,
      bridgeGirderPct: isBridge ? 100 : undefined,
      bridgeSlabPct: isBridge ? 100 : undefined,
      bridgeApproachPct: isBridge ? 100 : undefined,
      bridgePrevious: isBridge ? 100 : undefined,
      bridgeDailyProgress: isBridge ? 0 : undefined,
      bridgeToDate: isBridge ? 100 : undefined,
      side: 'BHS',
      unit: (isPipe || isBox || isSlab || isBridge) ? 'No.' : defaultUnit,
      qcStatus: 'Approved',
      status: 'Draft',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString(),
      equipmentList: [
        { id: 'eq_1', name: 'Heavy Machinery Unit', count: 1, status: 'Operating' }
      ]
    };

    const updatedList = [...activities, newAct];
    if (isNoWorkDay) setIsNoWorkDay(false);
    triggerDebouncedSave(updatedList, `Added row to section ${sectionId}`);
  };

  // APPLY / UPDATE SELECTED PIPE STAGE FOR SPECIFIC LOCATION
  const handleApplyPipeStageUpdate = () => {
    const loc = (customPipeLocation.trim() || selectedPipeLocation).trim();
    if (!loc) return;

    const existingIdx = activities.findIndex(a => 
      a.date === selectedDate && 
      a.activityType === '14' && 
      (a.pipeLocation === loc || a.startStationKm === loc)
    );

    let updatedList = [...activities];

    if (existingIdx > -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.pipeSelectedStage = selectedPipeStage;
      if (selectedPipeStage === 'Excavation') existing.pipeExcavationPct = selectedPipeStagePct;
      else if (selectedPipeStage === 'Masonry inlet/outlet') existing.pipeMasonryPct = selectedPipeStagePct;
      else if (selectedPipeStage === 'Paved Water way') existing.pipePavedWaterwayPct = selectedPipeStagePct;
      else if (selectedPipeStage === 'Pipe Installation') existing.pipeInstallationPct = selectedPipeStagePct;
      else if (selectedPipeStage === 'Back fill') existing.pipeBackfillPct = selectedPipeStagePct;

      const exc = existing.pipeExcavationPct ?? 100;
      const mas = existing.pipeMasonryPct ?? 100;
      const paw = existing.pipePavedWaterwayPct ?? 100;
      const ins = existing.pipeInstallationPct ?? 100;
      const bck = existing.pipeBackfillPct ?? 100;
      existing.pipeToDatePct = Math.round((exc * 0.20) + (mas * 0.20) + (paw * 0.20) + (ins * 0.20) + (bck * 0.20));
      const toDateNo = existing.pipeToDatePct / 100;
      const prevNo = (existing.pipePreviousPct ?? 0) / 100;
      existing.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      existing.pipeDailyProgressPct = Math.max(0, existing.pipeToDatePct - (existing.pipePreviousPct ?? 0));
      existing.metricKm = existing.quantityExecuted;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const newAct: DailyActivityRecord = {
        id: 'act_pipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '14',
        activityName: 'RCP Pipe Construction',
        description: `RCP Culvert at Stn ${loc} - ${selectedPipeStage}`,
        startStationKm: loc,
        pipeLocation: loc,
        pipeSelectedStage: selectedPipeStage,
        pipeExcavationPct: selectedPipeStage === 'Excavation' ? selectedPipeStagePct : 100,
        pipeMasonryPct: selectedPipeStage === 'Masonry inlet/outlet' ? selectedPipeStagePct : 100,
        pipePavedWaterwayPct: selectedPipeStage === 'Paved Water way' ? selectedPipeStagePct : 100,
        pipeInstallationPct: selectedPipeStage === 'Pipe Installation' ? selectedPipeStagePct : 100,
        pipeBackfillPct: selectedPipeStage === 'Back fill' ? selectedPipeStagePct : 100,
        pipePreviousPct: 90,
        pipeDailyProgressPct: 0,
        pipeToDatePct: selectedPipeStagePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: 0,
        quantityExecuted: 0,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: weather,
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      const exc = newAct.pipeExcavationPct ?? 100;
      const mas = newAct.pipeMasonryPct ?? 100;
      const paw = newAct.pipePavedWaterwayPct ?? 100;
      const ins = newAct.pipeInstallationPct ?? 100;
      const bck = newAct.pipeBackfillPct ?? 100;
      newAct.pipeToDatePct = Math.round((exc * 0.20) + (mas * 0.20) + (paw * 0.20) + (ins * 0.20) + (bck * 0.20));
      const toDateNo = newAct.pipeToDatePct / 100;
      const prevNo = (newAct.pipePreviousPct ?? 0) / 100;
      newAct.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      newAct.metricKm = newAct.quantityExecuted;
      newAct.pipeDailyProgressPct = Math.max(0, newAct.pipeToDatePct - (newAct.pipePreviousPct ?? 0));
      updatedList.push(newAct);
    }

    if (customPipeLocation) setCustomPipeLocation('');
    triggerDebouncedSave(updatedList, `Updated ${selectedPipeStage} at ${loc}`);
  };

  // POPULATE 15 STANDARD ERA PIPE LOCATIONS
  const handlePopulateEraPipeLocations = () => {
    if (!confirm('Populate the 15 standard ERA pipe culvert locations from the official report format?')) return;
    const nonPipeActivities = activities.filter(a => !(a.date === selectedDate && a.activityType === '14'));
    const newPipeActs: DailyActivityRecord[] = SAMPLE_ERA_PIPE_RECORDS.map((item, idx) => ({
      id: 'act_pipe_era_' + Date.now() + '_' + idx,
      date: selectedDate,
      activityType: '14',
      activityName: 'RCP Pipe Construction',
      description: `RCP Culvert at ${item.pipeLocation} - ${item.pipeSelectedStage}`,
      startStationKm: item.pipeLocation || '',
      pipeLocation: item.pipeLocation,
      pipeSelectedStage: item.pipeSelectedStage,
      pipeExcavationPct: item.pipeExcavationPct,
      pipeMasonryPct: item.pipeMasonryPct,
      pipePavedWaterwayPct: item.pipePavedWaterwayPct,
      pipeInstallationPct: item.pipeInstallationPct,
      pipeBackfillPct: item.pipeBackfillPct,
      pipePreviousPct: item.pipePreviousPct,
      pipeDailyProgressPct: item.pipeDailyProgressPct,
      pipeToDatePct: item.pipeToDatePct,
      metricKm: item.metricKm || 0,
      quantityExecuted: item.metricKm || 0,
      side: 'BHS',
      unit: 'No.',
      qcStatus: 'Approved',
      status: 'Approved',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString()
    }));

    triggerDebouncedSave([...nonPipeActivities, ...newPipeActs], 'Populated standard ERA pipe culverts');
  };

  // UPDATE INDIVIDUAL PIPE STAGE PERCENTAGE AND AUTO-RECALCULATE TO DATE %
  const handleUpdatePipeStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: value, unit: 'No.', updatedAt: new Date().toISOString() };
        const exc = stageField === 'pipeExcavationPct' ? value : (copy.pipeExcavationPct ?? 100);
        const mas = stageField === 'pipeMasonryPct' ? value : (copy.pipeMasonryPct ?? 100);
        const paw = stageField === 'pipePavedWaterwayPct' ? value : (copy.pipePavedWaterwayPct ?? 100);
        const ins = stageField === 'pipeInstallationPct' ? value : (copy.pipeInstallationPct ?? 100);
        const bck = stageField === 'pipeBackfillPct' ? value : (copy.pipeBackfillPct ?? 100);
        copy.pipeToDatePct = Math.round((exc * 0.20) + (mas * 0.20) + (paw * 0.20) + (ins * 0.20) + (bck * 0.20));
        const toDateNo = copy.pipeToDatePct / 100;
        const prevNo = (copy.pipePreviousPct ?? 0) / 100;
        copy.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
        copy.pipeDailyProgressPct = Math.max(0, copy.pipeToDatePct - (copy.pipePreviousPct ?? 0));
        copy.metricKm = copy.quantityExecuted;
        return copy;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${String(stageField)}`);
  };

  // ==================== BRIDGE CONSTRUCTION HANDLERS ====================
  const handleApplyBridgeStageUpdate = () => {
    const loc = (customBridgeLocation.trim() || selectedBridgeLocation).trim();
    if (!loc) return;

    const existingIdx = activities.findIndex(a => 
      a.date === selectedDate && 
      (a.activityType === '17' || a.activityType === '15') && 
      (a.bridgeLocation === loc || a.startStationKm === loc)
    );

    let updatedList = [...activities];

    if (existingIdx > -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.activityType = '17';
      existing.bridgeSelectedStage = selectedBridgeStage;
      if (selectedBridgeStage === 'Foundation') existing.bridgeFoundationPct = selectedBridgeStagePct;
      else if (selectedBridgeStage === 'Abutment') existing.bridgeAbutmentPct = selectedBridgeStagePct;
      else if (selectedBridgeStage === 'Pier') existing.bridgePierPct = selectedBridgeStagePct;
      else if (selectedBridgeStage === 'Box girder / T-girder') existing.bridgeGirderPct = selectedBridgeStagePct;
      else if (selectedBridgeStage === 'Slab') existing.bridgeSlabPct = selectedBridgeStagePct;
      else if (selectedBridgeStage === 'Approach & Bearings') existing.bridgeApproachPct = selectedBridgeStagePct;

      const fnd = existing.bridgeFoundationPct ?? 100;
      const abt = existing.bridgeAbutmentPct ?? 100;
      const per = existing.bridgePierPct ?? 100;
      const gdr = existing.bridgeGirderPct ?? 100;
      const slb = existing.bridgeSlabPct ?? 100;
      const app = existing.bridgeApproachPct ?? 100;
      existing.bridgeToDate = Math.round((fnd + abt + per + gdr + slb + app) / 6);
      const toDateNo = existing.bridgeToDate / 100;
      const prevNo = (existing.bridgePrevious ?? 0) / 100;
      existing.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      existing.bridgeDailyProgress = existing.quantityExecuted;
      existing.metricKm = existing.quantityExecuted;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const newAct: DailyActivityRecord = {
        id: 'act_bridge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '17',
        activityName: 'Bridge Construction',
        description: `${loc} - ${selectedBridgeStage}`,
        startStationKm: loc,
        bridgeLocation: loc,
        bridgeSelectedStage: selectedBridgeStage,
        bridgeFoundationPct: selectedBridgeStage === 'Foundation' ? selectedBridgeStagePct : 100,
        bridgeAbutmentPct: selectedBridgeStage === 'Abutment' ? selectedBridgeStagePct : 100,
        bridgePierPct: selectedBridgeStage === 'Pier' ? selectedBridgeStagePct : 100,
        bridgeGirderPct: selectedBridgeStage === 'Box girder / T-girder' ? selectedBridgeStagePct : 100,
        bridgeSlabPct: selectedBridgeStage === 'Slab' ? selectedBridgeStagePct : 100,
        bridgeApproachPct: selectedBridgeStage === 'Approach & Bearings' ? selectedBridgeStagePct : 100,
        bridgePrevious: 60,
        bridgeDailyProgress: 0,
        bridgeToDate: selectedBridgeStagePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: 0,
        quantityExecuted: 0,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: weather,
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      const fnd = newAct.bridgeFoundationPct ?? 100;
      const abt = newAct.bridgeAbutmentPct ?? 100;
      const per = newAct.bridgePierPct ?? 100;
      const gdr = newAct.bridgeGirderPct ?? 100;
      const slb = newAct.bridgeSlabPct ?? 100;
      const app = newAct.bridgeApproachPct ?? 100;
      newAct.bridgeToDate = Math.round((fnd + abt + per + gdr + slb + app) / 6);
      const toDateNo = newAct.bridgeToDate / 100;
      const prevNo = (newAct.bridgePrevious ?? 0) / 100;
      newAct.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      newAct.bridgeDailyProgress = newAct.quantityExecuted;
      newAct.metricKm = newAct.quantityExecuted;
      updatedList.push(newAct);
    }

    if (customBridgeLocation) setCustomBridgeLocation('');
    triggerDebouncedSave(updatedList, `Updated ${selectedBridgeStage} at ${loc}`);
  };

  const handlePopulateEraBridgeLocations = () => {
    if (!confirm('Populate standard ERA bridge structures with their component stage progress?')) return;
    const nonBridgeActivities = activities.filter(a => !(a.date === selectedDate && (a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage)))));
    const newBridgeActs: DailyActivityRecord[] = SAMPLE_ERA_BRIDGE_RECORDS.map((item, idx) => ({
      id: 'act_bridge_era_' + Date.now() + '_' + idx,
      date: selectedDate,
      activityType: '17',
      activityName: 'Bridge Construction',
      description: `${item.bridgeLocation} - ${item.bridgeSelectedStage}`,
      startStationKm: item.bridgeLocation || '',
      bridgeLocation: item.bridgeLocation,
      bridgeSelectedStage: item.bridgeSelectedStage,
      bridgeFoundationPct: item.bridgeFoundationPct,
      bridgeAbutmentPct: item.bridgeAbutmentPct,
      bridgePierPct: item.bridgePierPct,
      bridgeGirderPct: item.bridgeGirderPct,
      bridgeSlabPct: item.bridgeSlabPct,
      bridgeApproachPct: item.bridgeApproachPct,
      bridgePrevious: item.bridgePrevious,
      bridgeDailyProgress: item.bridgeDailyProgress,
      bridgeToDate: item.bridgeToDate,
      metricKm: item.metricKm || 0,
      quantityExecuted: item.metricKm || 0,
      side: 'BHS',
      unit: 'No.',
      qcStatus: 'Approved',
      status: 'Approved',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString()
    }));

    triggerDebouncedSave([...nonBridgeActivities, ...newBridgeActs], 'Populated standard ERA bridge structures');
  };

  const handleUpdateBridgeStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: value, unit: 'No.', updatedAt: new Date().toISOString() };
        const fnd = stageField === 'bridgeFoundationPct' ? value : (copy.bridgeFoundationPct ?? 100);
        const abt = stageField === 'bridgeAbutmentPct' ? value : (copy.bridgeAbutmentPct ?? 100);
        const per = stageField === 'bridgePierPct' ? value : (copy.bridgePierPct ?? 100);
        const gdr = stageField === 'bridgeGirderPct' ? value : (copy.bridgeGirderPct ?? 100);
        const slb = stageField === 'bridgeSlabPct' ? value : (copy.bridgeSlabPct ?? 100);
        const app = stageField === 'bridgeApproachPct' ? value : (copy.bridgeApproachPct ?? 100);
        copy.bridgeToDate = Math.round((fnd + abt + per + gdr + slb + app) / 6);
        const toDateNo = copy.bridgeToDate / 100;
        const prevNo = (copy.bridgePrevious ?? 0) / 100;
        const dailyExecNo = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
        copy.quantityExecuted = dailyExecNo;
        copy.bridgeDailyProgress = dailyExecNo;
        copy.metricKm = dailyExecNo;
        return copy;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${String(stageField)}`);
  };

  // ==================== BOX CULVERT CONSTRUCTION HANDLERS ====================
  const handleApplyBoxStageUpdate = () => {
    const loc = (customBoxLocation.trim() || selectedBoxLocation).trim();
    if (!loc) return;

    const existingIdx = activities.findIndex(a => 
      a.date === selectedDate && 
      (a.activityType === '15' || a.activityType === '14.1') && 
      (a.boxCulvertLocation === loc || a.startStationKm === loc)
    );

    let updatedList = [...activities];

    if (existingIdx > -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.activityType = '15';
      existing.boxCulvertSelectedStage = selectedBoxStage;
      if (selectedBoxStage === 'Excavation & Blinding') existing.boxExcavationPct = selectedBoxStagePct;
      else if (selectedBoxStage === 'Bottom Slab') existing.boxBottomSlabPct = selectedBoxStagePct;
      else if (selectedBoxStage === 'Walls & Stem') existing.boxWallsPct = selectedBoxStagePct;
      else if (selectedBoxStage === 'Top Slab') existing.boxTopSlabPct = selectedBoxStagePct;
      else if (selectedBoxStage === 'Wingwalls & Apron') existing.boxWingwallsPct = selectedBoxStagePct;
      else if (selectedBoxStage === 'Backfill') existing.boxBackfillPct = selectedBoxStagePct;

      const exc = existing.boxExcavationPct ?? 100;
      const btm = existing.boxBottomSlabPct ?? 100;
      const wll = existing.boxWallsPct ?? 100;
      const top = existing.boxTopSlabPct ?? 100;
      const wng = existing.boxWingwallsPct ?? 100;
      const bck = existing.boxBackfillPct ?? 100;
      existing.pipeToDatePct = Math.round((exc + btm + wll + top + wng + bck) / 6);
      const toDateNo = existing.pipeToDatePct / 100;
      const prevNo = (existing.pipePreviousPct ?? 0) / 100;
      existing.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      existing.pipeDailyProgressPct = Math.max(0, existing.pipeToDatePct - (existing.pipePreviousPct ?? 0));
      existing.metricKm = existing.quantityExecuted;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const newAct: DailyActivityRecord = {
        id: 'act_box_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '15',
        activityName: 'Box Culvert Construction',
        description: `Box Culvert at ${loc} - ${selectedBoxStage}`,
        startStationKm: loc,
        boxCulvertLocation: loc,
        boxCulvertSelectedStage: selectedBoxStage,
        boxExcavationPct: selectedBoxStage === 'Excavation & Blinding' ? selectedBoxStagePct : 100,
        boxBottomSlabPct: selectedBoxStage === 'Bottom Slab' ? selectedBoxStagePct : 100,
        boxWallsPct: selectedBoxStage === 'Walls & Stem' ? selectedBoxStagePct : 100,
        boxTopSlabPct: selectedBoxStage === 'Top Slab' ? selectedBoxStagePct : 100,
        boxWingwallsPct: selectedBoxStage === 'Wingwalls & Apron' ? selectedBoxStagePct : 100,
        boxBackfillPct: selectedBoxStage === 'Backfill' ? selectedBoxStagePct : 100,
        pipePreviousPct: 50,
        pipeDailyProgressPct: 0,
        pipeToDatePct: selectedBoxStagePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: 0,
        quantityExecuted: 0,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: weather,
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      const exc = newAct.boxExcavationPct ?? 100;
      const btm = newAct.boxBottomSlabPct ?? 100;
      const wll = newAct.boxWallsPct ?? 100;
      const top = newAct.boxTopSlabPct ?? 100;
      const wng = newAct.boxWingwallsPct ?? 100;
      const bck = newAct.boxBackfillPct ?? 100;
      newAct.pipeToDatePct = Math.round((exc + btm + wll + top + wng + bck) / 6);
      const toDateNo = newAct.pipeToDatePct / 100;
      const prevNo = (newAct.pipePreviousPct ?? 0) / 100;
      newAct.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      newAct.pipeDailyProgressPct = Math.max(0, newAct.pipeToDatePct - (newAct.pipePreviousPct ?? 0));
      newAct.metricKm = newAct.quantityExecuted;
      updatedList.push(newAct);
    }

    if (customBoxLocation) setCustomBoxLocation('');
    triggerDebouncedSave(updatedList, `Updated ${selectedBoxStage} at ${loc}`);
  };

  const handlePopulateEraBoxLocations = () => {
    if (!confirm('Populate standard ERA box culvert locations with their component progress?')) return;
    const nonBoxActivities = activities.filter(a => !(a.date === selectedDate && (a.activityType === '15' || a.activityType === '14.1') && Boolean(a.boxCulvertLocation)));
    const newBoxActs: DailyActivityRecord[] = SAMPLE_ERA_BOX_CULVERT_RECORDS.map((item, idx) => ({
      id: 'act_box_era_' + Date.now() + '_' + idx,
      date: selectedDate,
      activityType: '15',
      activityName: 'Box Culvert Construction',
      description: `Box Culvert at ${item.boxCulvertLocation} - ${item.boxCulvertSelectedStage}`,
      startStationKm: item.boxCulvertLocation || '',
      boxCulvertLocation: item.boxCulvertLocation,
      boxCulvertSelectedStage: item.boxCulvertSelectedStage,
      boxExcavationPct: item.boxExcavationPct,
      boxBottomSlabPct: item.boxBottomSlabPct,
      boxWallsPct: item.boxWallsPct,
      boxTopSlabPct: item.boxTopSlabPct,
      boxWingwallsPct: item.boxWingwallsPct,
      boxBackfillPct: item.boxBackfillPct,
      pipePreviousPct: item.pipePreviousPct,
      pipeDailyProgressPct: item.pipeDailyProgressPct,
      pipeToDatePct: item.pipeToDatePct,
      metricKm: item.metricKm || 0,
      quantityExecuted: item.metricKm || 0,
      side: 'BHS',
      unit: 'No.',
      qcStatus: 'Approved',
      status: 'Approved',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString()
    }));

    triggerDebouncedSave([...nonBoxActivities, ...newBoxActs], 'Populated standard ERA box culverts');
  };

  const handleUpdateBoxStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: value, unit: 'No.', updatedAt: new Date().toISOString() };
        const exc = stageField === 'boxExcavationPct' ? value : (copy.boxExcavationPct ?? 100);
        const btm = stageField === 'boxBottomSlabPct' ? value : (copy.boxBottomSlabPct ?? 100);
        const wll = stageField === 'boxWallsPct' ? value : (copy.boxWallsPct ?? 100);
        const top = stageField === 'boxTopSlabPct' ? value : (copy.boxTopSlabPct ?? 100);
        const wng = stageField === 'boxWingwallsPct' ? value : (copy.boxWingwallsPct ?? 100);
        const bck = stageField === 'boxBackfillPct' ? value : (copy.boxBackfillPct ?? 100);
        copy.pipeToDatePct = Math.round((exc + btm + wll + top + wng + bck) / 6);
        const toDateNo = copy.pipeToDatePct / 100;
        const prevNo = (copy.pipePreviousPct ?? 0) / 100;
        const dailyExecNo = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
        copy.quantityExecuted = dailyExecNo;
        copy.pipeDailyProgressPct = Math.max(0, copy.pipeToDatePct - (copy.pipePreviousPct ?? 0));
        copy.metricKm = dailyExecNo;
        return copy;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${String(stageField)}`);
  };

  // ==================== SLAB CULVERT CONSTRUCTION HANDLERS ====================
  const handleApplySlabStageUpdate = () => {
    const loc = (customSlabLocation.trim() || selectedSlabLocation).trim();
    if (!loc) return;

    const existingIdx = activities.findIndex(a => 
      a.date === selectedDate && 
      (a.activityType === '16' || a.activityType === '14.2') && 
      (a.slabCulvertLocation === loc || a.startStationKm === loc)
    );

    let updatedList = [...activities];

    if (existingIdx > -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.activityType = '16';
      existing.slabCulvertSelectedStage = selectedSlabStage;
      if (selectedSlabStage === 'Excavation & Footing') existing.slabExcavationPct = selectedSlabStagePct;
      else if (selectedSlabStage === 'Abutment Walls') existing.slabAbutmentPct = selectedSlabStagePct;
      else if (selectedSlabStage === 'RC Deck Slab') existing.slabDeckPct = selectedSlabStagePct;
      else if (selectedSlabStage === 'Wingwalls & Parapet') existing.slabWingwallsPct = selectedSlabStagePct;
      else if (selectedSlabStage === 'Bed Pitching') existing.slabPitchingPct = selectedSlabStagePct;
      else if (selectedSlabStage === 'Backfill') existing.slabBackfillPct = selectedSlabStagePct;

      const exc = existing.slabExcavationPct ?? 100;
      const abt = existing.slabAbutmentPct ?? 100;
      const dck = existing.slabDeckPct ?? 100;
      const wng = existing.slabWingwallsPct ?? 100;
      const ptc = existing.slabPitchingPct ?? 100;
      const bck = existing.slabBackfillPct ?? 100;
      existing.pipeToDatePct = Math.round((exc + abt + dck + wng + ptc + bck) / 6);
      const toDateNo = existing.pipeToDatePct / 100;
      const prevNo = (existing.pipePreviousPct ?? 0) / 100;
      existing.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      existing.pipeDailyProgressPct = Math.max(0, existing.pipeToDatePct - (existing.pipePreviousPct ?? 0));
      existing.metricKm = existing.quantityExecuted;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const newAct: DailyActivityRecord = {
        id: 'act_slab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '16',
        activityName: 'Slab Culvert Construction',
        description: `Slab Culvert at ${loc} - ${selectedSlabStage}`,
        startStationKm: loc,
        slabCulvertLocation: loc,
        slabCulvertSelectedStage: selectedSlabStage,
        slabExcavationPct: selectedSlabStage === 'Excavation & Footing' ? selectedSlabStagePct : 100,
        slabAbutmentPct: selectedSlabStage === 'Abutment Walls' ? selectedSlabStagePct : 100,
        slabDeckPct: selectedSlabStage === 'RC Deck Slab' ? selectedSlabStagePct : 100,
        slabWingwallsPct: selectedSlabStage === 'Wingwalls & Parapet' ? selectedSlabStagePct : 100,
        slabPitchingPct: selectedSlabStage === 'Bed Pitching' ? selectedSlabStagePct : 100,
        slabBackfillPct: selectedSlabStage === 'Backfill' ? selectedSlabStagePct : 100,
        pipePreviousPct: 50,
        pipeDailyProgressPct: 0,
        pipeToDatePct: selectedSlabStagePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: 0,
        quantityExecuted: 0,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: weather,
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      const exc = newAct.slabExcavationPct ?? 100;
      const abt = newAct.slabAbutmentPct ?? 100;
      const dck = newAct.slabDeckPct ?? 100;
      const wng = newAct.slabWingwallsPct ?? 100;
      const ptc = newAct.slabPitchingPct ?? 100;
      const bck = newAct.slabBackfillPct ?? 100;
      newAct.pipeToDatePct = Math.round((exc + abt + dck + wng + ptc + bck) / 6);
      const toDateNo = newAct.pipeToDatePct / 100;
      const prevNo = (newAct.pipePreviousPct ?? 0) / 100;
      newAct.quantityExecuted = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
      newAct.pipeDailyProgressPct = Math.max(0, newAct.pipeToDatePct - (newAct.pipePreviousPct ?? 0));
      newAct.metricKm = newAct.quantityExecuted;
      updatedList.push(newAct);
    }

    if (customSlabLocation) setCustomSlabLocation('');
    triggerDebouncedSave(updatedList, `Updated ${selectedSlabStage} at ${loc}`);
  };

  const handlePopulateEraSlabLocations = () => {
    if (!confirm('Populate standard ERA slab culvert locations with their component progress?')) return;
    const nonSlabActivities = activities.filter(a => !(a.date === selectedDate && (a.activityType === '16' || a.activityType === '14.2') && Boolean(a.slabCulvertLocation)));
    const newSlabActs: DailyActivityRecord[] = SAMPLE_ERA_SLAB_CULVERT_RECORDS.map((item, idx) => ({
      id: 'act_slab_era_' + Date.now() + '_' + idx,
      date: selectedDate,
      activityType: '16',
      activityName: 'Slab Culvert Construction',
      description: `Slab Culvert at ${item.slabCulvertLocation} - ${item.slabCulvertSelectedStage}`,
      startStationKm: item.slabCulvertLocation || '',
      slabCulvertLocation: item.slabCulvertLocation,
      slabCulvertSelectedStage: item.slabCulvertSelectedStage,
      slabExcavationPct: item.slabExcavationPct,
      slabAbutmentPct: item.slabAbutmentPct,
      slabDeckPct: item.slabDeckPct,
      slabWingwallsPct: item.slabWingwallsPct,
      slabPitchingPct: item.slabPitchingPct,
      slabBackfillPct: item.slabBackfillPct,
      pipePreviousPct: item.pipePreviousPct,
      pipeDailyProgressPct: item.pipeDailyProgressPct,
      pipeToDatePct: item.pipeToDatePct,
      metricKm: item.metricKm || 0,
      quantityExecuted: item.metricKm || 0,
      side: 'BHS',
      unit: 'No.',
      qcStatus: 'Approved',
      status: 'Approved',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString()
    }));

    triggerDebouncedSave([...nonSlabActivities, ...newSlabActs], 'Populated standard ERA slab culverts');
  };

  const handleUpdateSlabStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: value, unit: 'No.', updatedAt: new Date().toISOString() };
        const exc = stageField === 'slabExcavationPct' ? value : (copy.slabExcavationPct ?? 100);
        const abt = stageField === 'slabAbutmentPct' ? value : (copy.slabAbutmentPct ?? 100);
        const dck = stageField === 'slabDeckPct' ? value : (copy.slabDeckPct ?? 100);
        const wng = stageField === 'slabWingwallsPct' ? value : (copy.slabWingwallsPct ?? 100);
        const ptc = stageField === 'slabPitchingPct' ? value : (copy.slabPitchingPct ?? 100);
        const bck = stageField === 'slabBackfillPct' ? value : (copy.slabBackfillPct ?? 100);
        copy.pipeToDatePct = Math.round((exc + abt + dck + wng + ptc + bck) / 6);
        const toDateNo = copy.pipeToDatePct / 100;
        const prevNo = (copy.pipePreviousPct ?? 0) / 100;
        const dailyExecNo = Math.max(0, Number((toDateNo - prevNo).toFixed(3)));
        copy.quantityExecuted = dailyExecNo;
        copy.pipeDailyProgressPct = Math.max(0, copy.pipeToDatePct - (copy.pipePreviousPct ?? 0));
        copy.metricKm = dailyExecNo;
        return copy;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${String(stageField)}`);
  };

  const handleDeleteRow = (id: string) => {
    if (!confirm('Delete this record?')) return;
    const updated = activities.filter(a => a.id !== id);
    setSelectedRowIds(prev => prev.filter(rId => rId !== id));
    triggerDebouncedSave(updated, 'Deleted activity record');
  };

  // DELETE ANY ACTIVITY SECTION (FROM 16 STANDARD OR CUSTOM)
  const handleDeleteSection = (sectionId: string) => {
    const target = sections.find(s => s.id === sectionId);
    const title = target?.name || sectionId;
    if (!confirm(`Delete activity "${title}" (Section ${sectionId}) from your daily register? You can add it back anytime.`)) return;
    
    const updatedActivities = activities.filter(a => a.activityType !== sectionId);
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    triggerDebouncedSave(updatedActivities, `Deleted section ${sectionId} (${title})`);
  };

  // ADD BACK AN ACTIVITY FROM THE EXISTING STANDARD ACTIVITIES
  const handleAddBackStandardSection = (sec: WorkRegisterSectionDef) => {
    const updated = deduplicateSections([...sections, sec]).sort((a, b) => {
      const idxA = WORK_SECTIONS.findIndex(s => s.id === a.id);
      const idxB = WORK_SECTIONS.findIndex(s => s.id === b.id);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });
    setSections(updated);
    handleAddRowAt(sec.id);
  };

  // RESTORE ALL 16 STANDARD ACTIVITIES
  const handleRestoreAllStandardSections = () => {
    if (!confirm('Restore all 16 standard ERA activities to the register?')) return;
    setSections(WORK_SECTIONS);
    try {
      localStorage.setItem(`era_active_sections_${project.id}`, JSON.stringify(WORK_SECTIONS));
    } catch {}
    setIsAddSectionOpen(false);
  };

  const handleMoveSectionUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSections(updated);
    try {
      localStorage.setItem(`era_active_sections_${project.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleMoveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSections(updated);
    try {
      localStorage.setItem(`era_active_sections_${project.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleClearSectionEntries = (sectionId: string) => {
    if (!confirm(`Clear all entries for section ${sectionId} on ${selectedDate}?`)) return;
    const updated = activities.filter(a => !(a.date === selectedDate && a.activityType === sectionId));
    triggerDebouncedSave(updated, `Cleared entries for section ${sectionId}`);
  };

  // Cell Update with Debounced Auto-Save
  const handleCellUpdate = (id: string, field: keyof DailyActivityRecord, value: any) => {
    const updated = activities.map(a => {
      if (a.id === id) {
        const newAct = { ...a, [field]: value, updatedAt: new Date().toISOString() };
        if (field === 'metricM' && (['1', '2', '6', '7', '8', '9', '10', '11', '12', '18'].includes(a.activityType))) {
           newAct.metricKm = (parseFloat(value) || 0) / 1000;
        }
        if (field === 'metricKm' && (['1', '2', '10', '11', '12'].includes(a.activityType))) {
           newAct.metricM = (parseFloat(value) || 0) * 1000;
        }
        if (field === 'metricKm' && (['3.1', '3.2', '4', '5'].includes(a.activityType))) {
           newAct.metricM3 = parseFloat(value) || 0;
        }
        return newAct;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${field}`);
  };

  // Quick-add a daily work row directly from the top of the Work Register
  const handleQuickAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSec = sections.find(s => s.id === quickSectionId) || sections[0];
    if (!targetSec) return;
    const qtyNum = parseFloat(quickQty) || 0;
    const defaultUnit = getDefaultUnit(targetSec.id);
    const isVol = ['3.1', '3.2', '4', '5'].includes(targetSec.id);
    const isLengthKm = ['1', '2', '6', '7', '8', '9', '10', '11', '12', '18'].includes(targetSec.id);

    const newAct: DailyActivityRecord = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      activityType: targetSec.id,
      activityName: targetSec.name,
      description: quickDesc.trim() || targetSec.name,
      startStationKm: quickStation.trim(),
      side: quickSide,
      unit: defaultUnit,
      metricKm: qtyNum,
      metricM3: isVol ? qtyNum : undefined,
      metricM: isLengthKm ? qtyNum * 1000 : qtyNum,
      pcsThisDay: targetSec.id === '13' ? qtyNum : undefined,
      quantityExecuted: qtyNum,
      qcStatus: 'Approved',
      status: 'Draft',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString(),
      equipmentList: [{ id: 'eq_1', name: 'Heavy Machinery Unit', count: 1, status: 'Operating' }]
    };

    const updatedList = [...activities, newAct];
    if (isNoWorkDay) setIsNoWorkDay(false);
    triggerDebouncedSave(updatedList, `Logged work in ${targetSec.id}. ${targetSec.name}`);
    setQuickDesc('');
    setQuickStation('');
    setQuickQty('');
    setFeedbackNotice({ type: 'success', text: `Logged "${newAct.description}" under ${targetSec.id}. ${targetSec.name}` });
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleAddCustomSection = () => {
    if (!newSectionName.trim()) return;
    let code = newSectionCode.trim();
    if (!code) {
      let nextNum = sections.length + 1;
      while (sections.some(s => s.id === String(nextNum))) {
        nextNum += 1;
      }
      code = String(nextNum);
    } else if (sections.some(s => s.id === code)) {
      let suffix = 2;
      while (sections.some(s => s.id === `${code}.${suffix}`)) {
        suffix += 1;
      }
      code = `${code}.${suffix}`;
    }
    const newSec: WorkRegisterSectionDef = {
      id: code,
      name: newSectionName.trim(),
      metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Progress', 'Daily Executed (m)', 'Net Daily Executed (km)'],
      isCustom: true
    };
    setSections(deduplicateSections([...sections, newSec]));
    setNewSectionName('');
    setNewSectionCode('');
    setIsAddSectionOpen(false);
    handleAddRowAt(code);
  };

  // Bulk Edit Handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === currentActivities.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(currentActivities.map(a => a.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const handleApplyBulkStatus = () => {
    if (selectedRowIds.length === 0) return;
    const updated = activities.map(a => {
      if (selectedRowIds.includes(a.id)) {
        return { ...a, qcStatus: bulkStatusValue, updatedAt: new Date().toISOString() };
      }
      return a;
    });
    triggerDebouncedSave(updated, `Bulk updated status to ${bulkStatusValue}`);
  };

  const handleApplyBulkSide = () => {
    if (selectedRowIds.length === 0) return;
    const updated = activities.map(a => {
      if (selectedRowIds.includes(a.id)) {
        return { ...a, side: bulkSideValue, updatedAt: new Date().toISOString() };
      }
      return a;
    });
    triggerDebouncedSave(updated, `Bulk updated side to ${bulkSideValue}`);
  };

  const handleApplyBulkUnit = () => {
    if (selectedRowIds.length === 0) return;
    const updated = activities.map(a => {
      if (selectedRowIds.includes(a.id)) {
        return { ...a, unit: bulkUnitValue, updatedAt: new Date().toISOString() };
      }
      return a;
    });
    triggerDebouncedSave(updated, `Bulk updated unit to ${bulkUnitValue}`);
  };

  const handleApplyBulkQuantity = () => {
    const val = parseFloat(bulkQuantityValue);
    if (isNaN(val) || selectedRowIds.length === 0) return;
    const updated = activities.map(a => {
      if (selectedRowIds.includes(a.id)) {
        let newAct = { ...a, metricKm: val, metricM: val * 1000, metricM3: val, updatedAt: new Date().toISOString() };
        return newAct;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Bulk updated quantity to ${val}`);
    setBulkQuantityValue('');
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Delete all ${selectedRowIds.length} selected activity rows?`)) return;
    const updated = activities.filter(a => !selectedRowIds.includes(a.id));
    setSelectedRowIds([]);
    triggerDebouncedSave(updated, 'Bulk deleted activity records');
  };

  // Handler to Print for Specific Day
  const handleExecutePrintForDate = (dateToPrint: string) => {
    handleSelectDate(dateToPrint);
    setIsPrintSpecificDayOpen(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleExportCSV = () => {
    const headers = ['Section ID', 'Activity Name', 'Description', 'Station / Location', 'Side', 'Unit', 'Daily Qty', 'Previous Total', 'Daily Executed', 'To Date Progress (%)', 'Remarks & Observations', 'Completion Status', 'QC Status'];
    const rows = currentActivities.map(a => {
      let toDate = 0;
      if (a.activityType === '14') {
        const exc = a.pipeExcavationPct ?? 100;
        const mas = a.pipeMasonryPct ?? 100;
        const paw = a.pipePavedWaterwayPct ?? 100;
        const ins = a.pipeInstallationPct ?? 100;
        const bck = a.pipeBackfillPct ?? 100;
        toDate = Math.round((exc + mas + paw + ins + bck) / 5);
      } else if (a.activityType === '15') {
        const exc = a.boxExcavationPct ?? 100;
        const btm = a.boxBottomSlabPct ?? 100;
        const wll = a.boxWallsPct ?? 100;
        const top = a.boxTopSlabPct ?? 100;
        const wng = a.boxWingwallsPct ?? 100;
        const bck = a.boxBackfillPct ?? 100;
        toDate = Math.round((exc + btm + wll + top + wng + bck) / 6);
      } else if (a.activityType === '16') {
        const exc = a.slabExcavationPct ?? 100;
        const abt = a.slabAbutmentPct ?? 100;
        const dck = a.slabDeckPct ?? 100;
        const wng = a.slabWingwallsPct ?? 100;
        const ptc = a.slabPitchingPct ?? 100;
        const bck = a.slabBackfillPct ?? 100;
        toDate = Math.round((exc + abt + dck + wng + ptc + bck) / 6);
      } else if (a.activityType === '17') {
        const fnd = a.bridgeFoundationPct ?? 100;
        const abt = a.bridgeAbutmentPct ?? 100;
        const per = a.bridgePierPct ?? 100;
        const gdr = a.bridgeGirderPct ?? 100;
        const slb = a.bridgeSlabPct ?? 100;
        const app = a.bridgeApproachPct ?? 100;
        toDate = Math.round((fnd + abt + per + gdr + slb + app) / 6);
      } else {
        toDate = a.pipeToDatePct || 0;
      }

      return [
        `"${a.activityType || ''}"`,
        `"${a.activityName || ''}"`,
        `"${(a.description || '').replace(/"/g, '""')}"`,
        `"${a.startStationKm || a.pipeLocation || a.boxCulvertLocation || a.slabCulvertLocation || a.bridgeLocation || ''}"`,
        `"${a.side || 'BHS'}"`,
        `"${a.unit || 'No.'}"`,
        a.metricKm ?? a.metricM3 ?? 0,
        a.pipePreviousPct || 0,
        a.pipeDailyProgressPct || 0,
        toDate,
        `"${(a.remarks || '').replace(/"/g, '""')}"`,
        `"${a.isComplete ? 'Complete' : 'Pending'}"`,
        `"${a.qcStatus || 'Approved'}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ERA_Daily_Progress_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleLoadTemplate = (tpl: ActivityTemplate) => {
    if (!confirm(`Load template "${tpl.name}" into date ${selectedDate}? This will add its activities to your daily register.`)) return;
    const tplActivities: DailyActivityRecord[] = tpl.activities.map((item, idx) => ({
      id: 'tpl_act_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      activityType: item.activityType || '14',
      activityName: item.activityName || 'Construction Activity',
      description: item.description || tpl.name,
      startStationKm: item.startStationKm || item.pipeLocation || item.boxCulvertLocation || item.slabCulvertLocation || item.bridgeLocation || '200+000',
      pipeLocation: item.pipeLocation,
      pipeSelectedStage: item.pipeSelectedStage,
      pipeExcavationPct: item.pipeExcavationPct ?? 100,
      pipeMasonryPct: item.pipeMasonryPct ?? 100,
      pipePavedWaterwayPct: item.pipePavedWaterwayPct ?? 100,
      pipeInstallationPct: item.pipeInstallationPct ?? 100,
      pipeBackfillPct: item.pipeBackfillPct ?? 100,
      boxCulvertLocation: item.boxCulvertLocation,
      boxCulvertSelectedStage: item.boxCulvertSelectedStage,
      boxExcavationPct: item.boxExcavationPct ?? 100,
      boxBottomSlabPct: item.boxBottomSlabPct ?? 100,
      boxWallsPct: item.boxWallsPct ?? 100,
      boxTopSlabPct: item.boxTopSlabPct ?? 100,
      boxWingwallsPct: item.boxWingwallsPct ?? 100,
      boxBackfillPct: item.boxBackfillPct ?? 100,
      slabCulvertLocation: item.slabCulvertLocation,
      slabCulvertSelectedStage: item.slabCulvertSelectedStage,
      slabExcavationPct: item.slabExcavationPct ?? 100,
      slabAbutmentPct: item.slabAbutmentPct ?? 100,
      slabDeckPct: item.slabDeckPct ?? 100,
      slabWingwallsPct: item.slabWingwallsPct ?? 100,
      slabPitchingPct: item.slabPitchingPct ?? 100,
      slabBackfillPct: item.slabBackfillPct ?? 100,
      bridgeLocation: item.bridgeLocation,
      bridgeSelectedStage: item.bridgeSelectedStage,
      bridgeFoundationPct: item.bridgeFoundationPct ?? 100,
      bridgeAbutmentPct: item.bridgeAbutmentPct ?? 100,
      bridgePierPct: item.bridgePierPct ?? 100,
      bridgeGirderPct: item.bridgeGirderPct ?? 100,
      bridgeSlabPct: item.bridgeSlabPct ?? 100,
      bridgeApproachPct: item.bridgeApproachPct ?? 100,
      pipePreviousPct: item.pipePreviousPct ?? 100,
      pipeDailyProgressPct: item.pipeDailyProgressPct ?? 0,
      pipeToDatePct: item.pipeToDatePct ?? 100,
      side: item.side || 'BHS',
      unit: item.unit || 'No.',
      metricKm: item.metricKm || 0,
      qcStatus: 'Approved',
      status: 'Approved',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString()
    }));

    const existingOtherDate = activities.filter(a => a.date !== selectedDate);
    const updatedList = [...existingOtherDate, ...tplActivities];
    setIsNoWorkDay(false);
    triggerDebouncedSave(updatedList, `Loaded template "${tpl.name}"`);
    setIsTemplateModalOpen(false);
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) return;
    if (currentActivities.length === 0) {
      setFeedbackNotice({ type: 'warning', text: 'No activities recorded on this date to save as a template.' });
      setTimeout(() => setFeedbackNotice(null), 4000);
      return;
    }
    const newTpl: ActivityTemplate = {
      id: 'tpl_custom_' + Date.now(),
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || `Custom template saved from ${selectedDate}`,
      activities: currentActivities.map(a => ({ ...a, id: undefined }))
    };
    const updatedTemplates = [...templates, newTpl];
    setTemplates(updatedTemplates);
    try {
      localStorage.setItem(`era_activity_templates_${project.id}`, JSON.stringify(updatedTemplates));
    } catch {}
    setNewTemplateName('');
    setNewTemplateDesc('');
    setFeedbackNotice({ type: 'success', text: `Template "${newTpl.name}" saved for reuse.` });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleDeleteTemplate = (tplId: string) => {
    if (!confirm('Delete this template?')) return;
    const updated = templates.filter(t => t.id !== tplId);
    setTemplates(updated);
    try {
      localStorage.setItem(`era_activity_templates_${project.id}`, JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans p-3 md:p-6 print:p-0 print:bg-white print:text-slate-900 relative">

      {/* SUBTLE CORNER AUTO-SAVE INDICATOR */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 print:hidden pointer-events-none">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/95 backdrop-blur border border-amber-300 px-3 py-1.5 rounded-lg shadow-lg font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Saving changes...</span>
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-4">

        {/* PRINT-ONLY OFFICIAL HEADER WITH MINIMIZED LOGO (ON HEADER ONLY) */}
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3 print:break-inside-avoid">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-white border border-slate-300 p-0.5 flex items-center justify-center shrink-0 print-logo-container">
                <img
                  src={eraLogo}
                  alt="Ethiopian Roads Administration Logo"
                  className="w-10 h-10 object-contain print-logo-min"
                  style={{ width: '40px', height: '40px', maxWidth: '40px', maxHeight: '40px' }}
                />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide leading-tight">
                  ETHIOPIAN ROADS ADMINISTRATION
                </h2>
                <p className="text-[10px] font-bold text-slate-700">
                  Daily Project Progress Report (DPR) • {formatDisplayDate(selectedDate)}
                </p>
                <div className="text-[8.5px] text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                  <span>Directorate: <strong>{project.programDirectorate || 'Southern'}</strong></span>
                  <span>•</span>
                  <span>PMO: <strong>{project.pmo || 'PMO 1'}</strong></span>
                  {weather && (
                    <>
                      <span>•</span>
                      <span>Weather: <strong>{weather}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-700 space-y-0.5 font-medium">
              <div>Project: <strong className="text-slate-900 font-bold">{project.name}</strong></div>
              <div>Contractor: <strong>{project.contractor || 'N/A'}</strong></div>
              <div>Consultant: <strong>{project.supervisionConsultant?.firmName || project.consultant || 'N/A'}</strong></div>
              <div className="text-slate-500 font-mono text-[8px] pt-0.5">
                Target Date: {selectedDate} • Official Daily Register
              </div>
            </div>
          </div>
        </div>

        {/* CLEAN TOP HEADER & ACTION BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Daily Activities &amp; Site Log
                </h1>
                {saveStatus === 'saving' ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {project.name || 'Road Project'} · {formatDisplayDate(selectedDate)}
              </p>
            </div>
          </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
            {!isReadonly && (
              <button
                type="button"
                onClick={handleSaveAndSyncNow}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-1.5 transition"
                title="Save Daily Site Log & Daily Notes and sync immediately to Comprehensive Analysis & Monthly Cumulative"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Sync</span>
              </button>
            )}

            <button
              onClick={() => {
                setPrintTargetDate(selectedDate);
                setIsPrintSpecificDayOpen(true);
              }}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5 transition"
              title="Select and Print a Specific Day"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Print Day</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5 transition"
              title="Export Current Day Activities as CSV"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5 transition"
              title="Save and Load Daily Activity Templates"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Templates ({templates.length})</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-1.5 transition"
              title="Print / Export Current DPR as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF DPR</span>
            </button>
          </div>
        </div>

        {/* 4-CARD SIMPLE DAILY SNAPSHOT */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Work Logged Today</span>
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {summaryStats.totalActivities} {summaryStats.totalActivities === 1 ? 'entry' : 'entries'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              Across {summaryStats.activeSectionsToday} active work sections
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Labor &amp; Fleet</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {summaryStats.totalLaborCount} crew · {summaryStats.activeEquipment}/{summaryStats.totalFleet} equip
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {summaryStats.standbyEquipment} standby · {summaryStats.breakdownEquipment} maint.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Site Plant Production</span>
              <Factory className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {summaryStats.totalPlantActual.toLocaleString()} units
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {summaryStats.totalProductionUnits} plant units active
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Site Status &amp; Note</span>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
              {isNoWorkDay ? 'Standstill Day' : 'Active Workday'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {weather} · {dailyNotes.trim() ? 'Daily Note Linked' : 'No Daily Note Yet'}
            </div>
          </div>
        </div>

        {/* INLINE FEEDBACK NOTICE (REPLACES BLOCKING ALERTS) */}
        {feedbackNotice && (
          <div className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 print:hidden ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          }`}>
            <span className="font-medium">{feedbackNotice.text}</span>
            <button onClick={() => setFeedbackNotice(null)} className="p-0.5 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* DATE NAVIGATOR + RECENT LOGGED DATES STRIP */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-2.5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => handleDateNav(-1)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
              title="Switch to Previous Day"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Previous Day</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                    {formatDisplayDate(selectedDate)}
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => handleSelectDate(e.target.value)}
                    className="text-xs font-bold text-slate-900 dark:text-white bg-transparent outline-none cursor-pointer tabular-nums"
                    title="Click to open calendar date picker"
                  />
                </div>
              </div>

              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <button
                  onClick={() => handleSelectDate(new Date().toISOString().split('T')[0])}
                  className="text-xs bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-lg font-semibold transition"
                  title="Jump directly to today's date"
                >
                  Today
                </button>
              )}

              <button
                onClick={() => {
                  const next = !isNoWorkDay;
                  setIsNoWorkDay(next);
                  scheduleResourceSync({ isNoWorkDay: next }, next ? 'Marked Standstill Day' : 'Resumed Active Workday');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition border ${
                  isNoWorkDay
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {isNoWorkDay ? 'Standstill Day (Click to Resume)' : 'Active Workday'}
              </button>
            </div>

            <button
              onClick={() => handleDateNav(1)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
              title="Switch to Next Day"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {loggedDatesSummary.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                Recent Logged Dates:
              </span>
              {loggedDatesSummary.slice(0, 8).map(item => {
                const isSelected = item.date === selectedDate;
                return (
                  <button
                    key={item.date}
                    onClick={() => handleSelectDate(item.date)}
                    className={`px-2.5 py-1 rounded-md border font-medium tabular-nums shrink-0 transition ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.date} ({item.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COMPACT PROJECT PARTIES, WEATHER & SHIFT BAR (COLLAPSIBLE PARTY INPUTS) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300 min-w-0">
              <span className="truncate">
                <strong className="text-slate-900 dark:text-white">{project.name || 'Road Project'}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <span className="truncate">
                Contractor: <strong className="text-slate-800 dark:text-slate-100">{project.contractor || '—'}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
              <span className="truncate hidden md:inline">
                {consultantRoleLabel}: <strong className="text-slate-800 dark:text-slate-100">{project.consultant || project.supervisionConsultant?.firmName || '—'}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={weather}
                  onChange={e => {
                    const val = e.target.value;
                    setWeather(val);
                    scheduleResourceSync({ weather: val }, `Updated site weather to ${val}`);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-xs"
                  aria-label="Site Weather"
                >
                  <option value="Sunny">Sunny</option>
                  <option value="Sunny & Cloudy">Sunny &amp; Cloudy</option>
                  <option value="Rainy">Rainy / Wet</option>
                  <option value="Overcast">Overcast</option>
                </select>
              </div>

              <select
                value={shift}
                onChange={e => {
                  const val = e.target.value;
                  setShift(val);
                  scheduleResourceSync({ shift: val }, `Updated site shift to ${val}`);
                }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer text-xs"
                aria-label="Work Shift"
              >
                <option value="Day Shift (Standard)">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
                <option value="Extended / Overtime">Overtime</option>
              </select>

              <button
                type="button"
                onClick={() => setShowPartyEditor(!showPartyEditor)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>{showPartyEditor ? 'Hide Parties' : 'Edit Parties'}</span>
                {showPartyEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className={`${showPartyEditor ? 'grid' : 'hidden print:grid'} p-3 bg-slate-50/70 dark:bg-slate-800/50 grid-cols-1 md:grid-cols-2 gap-3 text-xs`}>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 w-36 font-medium text-[11px]">Employer / Client:</span>
                <input
                  value={project.client || ''}
                  onChange={e => onUpdateProject({ client: e.target.value }, 'Updated Client')}
                  placeholder="Ethiopian Road Administration (ERA)"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-100 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 w-36 font-medium text-[11px]">{consultantRoleLabel}:</span>
                <input
                  value={project.consultant || project.supervisionConsultant?.firmName || ''}
                  onChange={e => onUpdateProject({
                    consultant: e.target.value,
                    supervisionConsultant: project.supervisionConsultant ? { ...project.supervisionConsultant, firmName: e.target.value } : undefined
                  }, 'Updated Consultant')}
                  placeholder="Supervision Consultant Firm"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-100 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 w-28 font-medium text-[11px]">Contractor:</span>
                <input
                  value={project.contractor || ''}
                  onChange={e => onUpdateProject({ contractor: e.target.value }, 'Updated Contractor')}
                  placeholder="Contractor Name"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-100 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 w-28 font-medium text-[11px]">Project Name:</span>
                <input
                  value={project.name || ''}
                  onChange={e => onUpdateProject({ name: e.target.value }, 'Updated Project Name')}
                  placeholder="Road Project Name"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* STANDSTILL / NO WORK DAY BANNER IF TOGGLED */}
        {isNoWorkDay && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    No Construction Activity Recorded for {formatDisplayDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Cumulative totals are preserved to date without daily increment.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsNoWorkDay(false);
                  scheduleResourceSync({ isNoWorkDay: false }, 'Switched to Active Workday');
                }}
                className="text-xs bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 px-3 py-1.5 rounded-lg font-medium transition self-start md:self-auto"
              >
                Switch to Active Workday
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1">Reason for No Activity / Standstill:</label>
                <select
                  value={noWorkReason}
                  onChange={e => {
                    const val = e.target.value;
                    setNoWorkReason(val);
                    scheduleResourceSync({ noWorkReason: val }, 'Updated standstill reason');
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg p-1.5 font-medium text-slate-800 dark:text-slate-100 outline-none"
                >
                  {STANDSTILL_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1">Observations &amp; Site Notes:</label>
                <input
                  value={noWorkNotes}
                  onChange={e => {
                    const val = e.target.value;
                    setNoWorkNotes(val);
                    scheduleResourceSync({ noWorkNotes: val }, 'Updated standstill notes');
                  }}
                  placeholder="Enter notes (e.g. 45mm rain recorded, site flooded)..."
                  className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg p-1.5 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONSTRUCTION MANAGER DAILY NOTES & REAL-TIME SYNC PANEL */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Daily Notes — Construction Manager Field Context
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add textual context for today&apos;s labor and material inputs. Synced in real time to Comprehensive Analysis &amp; Monthly Cumulative.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums print:hidden">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Labor: {summaryStats.totalLaborCount}
              </span>
              {lastSyncedAt && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                  Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 space-y-2.5">
            <label htmlFor="daily-manager-notes-input" className="sr-only">
              Construction Manager Daily Notes for {selectedDate}
            </label>
            <textarea
              id="daily-manager-notes-input"
              rows={3}
              disabled={isReadonly}
              value={dailyNotes}
              onChange={e => {
                const val = e.target.value;
                setDailyNotes(val);
                scheduleResourceSync({ dailyNotes: val }, `Updated Daily Notes for ${selectedDate}`);
              }}
              placeholder="Summarize today's crew allocation, equipment bottlenecks, quarry/batching throughput, material deliveries, QA inspections, or schedule mitigation actions..."
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-y disabled:opacity-70"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] print:hidden">
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {dailyNotes.length} characters · Linked to date <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedDate}</strong>
              </span>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={handleSaveAndSyncNow}
                  className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Sync to Analysis &amp; Monthly</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS & WORKSPACE CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'all' ? 'bg-slate-900 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition tabular-nums ${
                activeTab === 'register' ? 'bg-slate-900 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Work Register · {currentActivities.length}
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition tabular-nums ${
                activeTab === 'production' ? 'bg-slate-900 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Plant Production · {productionList.length}
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition tabular-nums ${
                activeTab === 'resources' ? 'bg-slate-900 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Labor &amp; Materials · {summaryStats.totalLaborCount} crew
            </button>
            <button
              onClick={() => setActiveTab('challenges')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition tabular-nums ${
                activeTab === 'challenges' ? 'bg-slate-900 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Challenges &amp; Plan · {siteChallenges.length + tomorrowPlans.length}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(activeTab === 'all' || activeTab === 'register') && (
              <button
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                  showActiveOnly
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {showActiveOnly ? 'Showing Active Today Only' : 'Show Active Today Only'}
              </button>
            )}

            <button
              onClick={() => {
                setIsBulkEditMode(!isBulkEditMode);
                if (isBulkEditMode) setSelectedRowIds([]);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                isBulkEditMode
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isBulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}</span>
            </button>

            {!isReadonly && (
              <button
                onClick={() => setIsAddSectionOpen(true)}
                className="text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Sections</span>
              </button>
            )}
          </div>
        </div>

        {/* BULK EDIT ACTION BAR (WHEN BULK EDIT MODE ACTIVE) */}
        {isBulkEditMode && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 shadow-md space-y-2 print:hidden animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>Bulk Editing Controls</span>
                </span>
                <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                  {selectedRowIds.length} of {currentActivities.length} rows selected
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button 
                  onClick={handleToggleSelectAll}
                  className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1 rounded font-medium transition flex items-center gap-1"
                >
                  {selectedRowIds.length === currentActivities.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{selectedRowIds.length === currentActivities.length ? 'Deselect All' : 'Select All Rows'}</span>
                </button>
                <button 
                  onClick={() => setIsBulkEditMode(false)}
                  className="text-amber-800 hover:text-amber-950 font-bold px-2 py-1"
                >
                  Done
                </button>
              </div>
            </div>

            {selectedRowIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
                {/* Bulk Status Update */}
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2 py-1">
                  <span className="text-slate-500 text-[11px] font-medium">Status:</span>
                  <select 
                    value={bulkStatusValue} 
                    onChange={e => setBulkStatusValue(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Inspected / Verified">Inspected</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button 
                    onClick={handleApplyBulkStatus}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded text-[11px] font-bold transition ml-1"
                  >
                    Apply
                  </button>
                </div>

                {/* Bulk Side Update */}
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2 py-1">
                  <span className="text-slate-500 text-[11px] font-medium">Side:</span>
                  <select 
                    value={bulkSideValue} 
                    onChange={e => setBulkSideValue(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                  >
                    <option value="BHS">BHS (Both)</option>
                    <option value="LHS">LHS (Left)</option>
                    <option value="RHS">RHS (Right)</option>
                    <option value="CL">CL (Center)</option>
                  </select>
                  <button 
                    onClick={handleApplyBulkSide}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded text-[11px] font-bold transition ml-1"
                  >
                    Apply
                  </button>
                </div>

                {/* Bulk Unit Update */}
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2 py-1">
                  <span className="text-slate-500 text-[11px] font-medium">Unit:</span>
                  <select 
                    value={bulkUnitValue} 
                    onChange={e => setBulkUnitValue(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                  >
                    {MEASUREMENT_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleApplyBulkUnit}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded text-[11px] font-bold transition ml-1"
                  >
                    Apply Unit
                  </button>
                </div>

                {/* Bulk Set Quantity / Daily Value */}
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2 py-1">
                  <span className="text-slate-500 text-[11px] font-medium">Output:</span>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.25"
                    value={bulkQuantityValue}
                    onChange={e => setBulkQuantityValue(e.target.value)}
                    className="w-16 bg-transparent outline-none font-bold text-blue-700 px-1"
                  />
                  <button 
                    onClick={handleApplyBulkQuantity}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-[11px] font-bold transition"
                  >
                    Apply Qty
                  </button>
                </div>

                {/* Bulk Delete Selected */}
                <button 
                  onClick={handleBulkDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.length})</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-800 italic">
                Check boxes in the table rows below to apply changes across multiple activities at once.
              </p>
            )}
          </div>
        )}

        {/* 1. WORK REGISTER TABLE (SEARCH + QUICK LOG + STRUCTURED SUMMARY) */}
        {(activeTab === 'all' || activeTab === 'register') && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  1. Work Register &amp; Daily Execution Summary
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {sections.length} sections · {currentActivities.length} logged today
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {/* Filter by Activity */}
                <select
                  value={workRegisterActivityFilter}
                  onChange={e => setWorkRegisterActivityFilter(e.target.value)}
                  className="py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
                  aria-label="Filter by Work Activity"
                >
                  <option value="ALL">All Activities</option>
                  {sections.map(s => (
                    <option key={`act-filter-${s.id}`} value={s.id}>
                      {s.customLabel || s.id}. {s.name}
                    </option>
                  ))}
                </select>

                {/* Filter by Status */}
                <select
                  value={workRegisterStatusFilter}
                  onChange={e => setWorkRegisterStatusFilter(e.target.value)}
                  className="py-1 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
                  aria-label="Filter by Status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                </select>

                {/* Search Work Register */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter section, station, work..."
                    className="pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 w-44"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {!isReadonly && (
                  <button
                    onClick={() => setIsAddSectionOpen(true)}
                    className="text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800"
                    title="Add from 16 activities or create custom"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                )}

                {!isReadonly && currentActivities.length > 0 && (
                  <button
                    onClick={() => {
                      if (!confirm(`Clear all activities recorded on ${selectedDate}?`)) return;
                      const updated = activities.filter(a => a.date !== selectedDate);
                      triggerDebouncedSave(updated, 'Cleared all activities for the day');
                    }}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Day
                  </button>
                )}
              </div>
            </div>

            {/* QUICK-ADD WORK ENTRY BAR */}
            {!isReadonly && (
              <form
                onSubmit={handleQuickAddActivity}
                className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center print:hidden"
              >
                <div className="sm:col-span-3">
                  <select
                    value={quickSectionId}
                    onChange={e => setQuickSectionId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
                    aria-label="Select Work Section"
                  >
                    {sections.filter(s => !s.isSpecial).map((s, sIdx) => (
                      <option key={`quick-sec-${s.id}-${sIdx}`} value={s.id}>
                        {s.customLabel || s.id}. {s.name} ({getDefaultUnit(s.id)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={quickDesc}
                    onChange={e => setQuickDesc(e.target.value)}
                    placeholder="Quick log description (e.g. Sub-base placement & rolling)..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={quickStation}
                    onChange={e => setQuickStation(e.target.value)}
                    placeholder="Station (e.g. Km 210+200)"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <select
                    value={quickSide}
                    onChange={e => setQuickSide(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    aria-label="Road Side"
                  >
                    <option value="BHS">BHS</option>
                    <option value="LHS">LHS</option>
                    <option value="RHS">RHS</option>
                    <option value="CL">CL</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <input
                    type="number"
                    step="0.01"
                    value={quickQty}
                    onChange={e => setQuickQty(e.target.value)}
                    placeholder="Qty"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 text-center tabular-nums"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="submit"
                    className="w-full px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log</span>
                  </button>
                </div>
              </form>
            )}

            {/* BOQ Quantity Variance Warning Alert Banner */}
            {activitiesExceedingBoq.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black uppercase tracking-wide text-amber-950">
                      BOQ Quantity Variance Warning ({activitiesExceedingBoq.length} item{activitiesExceedingBoq.length > 1 ? 's' : ''}):
                    </span>
                    <span className="text-[11px] text-amber-800">
                      The entered actual quantity exceeds the project's Bill of Quantities (BOQ) design quantity by more than the allowable 20% variance threshold:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activitiesExceedingBoq.map((item, idx) => (
                      <span key={idx} className="bg-white border border-amber-300 rounded px-2 py-0.5 font-mono text-[11px] text-amber-900 shadow-2xs">
                        <strong>{item.secName || item.act.activityType}:</strong> Entered {item.qty} {item.act.unit || ''} vs BOQ {item.boqInfo.boqDesignQty} {item.boqInfo.boqUnit} (
                        <span className="font-bold text-rose-700">+{item.boqInfo.variancePct}%</span>)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Structure Views Hide / Show Visibility Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Structure Tables:
                </span>

                {/* 14. Pipe Culvert Toggle */}
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('pipe')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 border ${!hiddenStructureViews.pipe ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  title={hiddenStructureViews.pipe ? 'Click to Show 14. Pipe Culvert Table' : 'Click to Hide 14. Pipe Culvert Table'}
                >
                  {hiddenStructureViews.pipe ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3" />}
                  <span>14. Pipe Culvert</span>
                  <span className={`text-[10px] px-1 rounded ${!hiddenStructureViews.pipe ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600 font-normal'}`}>
                    {currentActivities.filter(a => a.activityType === '14' || Boolean(a.pipeLocation && !a.boxCulvertLocation && !a.slabCulvertLocation && !a.bridgeLocation)).length}
                  </span>
                </button>

                {/* 15. Box Culvert Toggle */}
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('box')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 border ${!hiddenStructureViews.box ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  title={hiddenStructureViews.box ? 'Click to Show 15. Box Culvert Table' : 'Click to Hide 15. Box Culvert Table'}
                >
                  {hiddenStructureViews.box ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3" />}
                  <span>15. Box Culvert</span>
                  <span className={`text-[10px] px-1 rounded ${!hiddenStructureViews.box ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600 font-normal'}`}>
                    {currentActivities.filter(a => a.activityType === '15' || a.activityType === '14.1' || Boolean(a.boxCulvertLocation && !a.bridgeLocation)).length}
                  </span>
                </button>

                {/* 16. Slab Culvert Toggle */}
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('slab')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 border ${!hiddenStructureViews.slab ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  title={hiddenStructureViews.slab ? 'Click to Show 16. Slab Culvert Table' : 'Click to Hide 16. Slab Culvert Table'}
                >
                  {hiddenStructureViews.slab ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3" />}
                  <span>16. Slab Culvert</span>
                  <span className={`text-[10px] px-1 rounded ${!hiddenStructureViews.slab ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600 font-normal'}`}>
                    {currentActivities.filter(a => a.activityType === '16' || a.activityType === '14.2' || Boolean(a.slabCulvertLocation)).length}
                  </span>
                </button>

                {/* 17. Bridge Toggle */}
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('bridge')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 border ${!hiddenStructureViews.bridge ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                  title={hiddenStructureViews.bridge ? 'Click to Show 17. Bridge Table' : 'Click to Hide 17. Bridge Table'}
                >
                  {hiddenStructureViews.bridge ? <EyeOff className="w-3 h-3 text-slate-400" /> : <Eye className="w-3 h-3" />}
                  <span>17. Bridge</span>
                  <span className={`text-[10px] px-1 rounded ${!hiddenStructureViews.bridge ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600 font-normal'}`}>
                    {currentActivities.filter(a => a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage))).length}
                  </span>
                </button>
              </div>

              {/* Quick Global Collapse/Expand */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => toggleAllStructuresVisibility(false)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded hover:bg-blue-50 border border-blue-200 transition"
                  title="Expand and display all structure tables"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllStructuresVisibility(true)}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-200 border border-slate-300 transition"
                  title="Hide / collapse all structure tables"
                >
                  Hide All
                </button>
              </div>
            </div>

            <div ref={workRegScrollRef} className="overflow-x-auto">
              <table
                className="min-w-full table-fixed text-xs text-left border-collapse"
                style={{ width: `${totalWorkRegTableWidth}px` }}
              >
                <colgroup>
                  {isBulkEditMode && <col style={{ width: '40px' }} />}
                  {WORK_REG_COL_META.map(col => (
                    <col key={col.key} style={{ width: `${workRegColWidths[col.key]}px` }} />
                  ))}
                  {!isReadonly && <col style={{ width: '80px' }} />}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    {isBulkEditMode && (
                      <th className="p-2.5 text-center border-r border-slate-200 print:hidden">
                        <input 
                          type="checkbox"
                          checked={selectedRowIds.length > 0 && selectedRowIds.length === currentActivities.length}
                          onChange={handleToggleSelectAll}
                          className="rounded cursor-pointer"
                        />
                      </th>
                    )}
                    {[
                      { key: 'section' as WorkRegColKey, label: 'Activity Section', align: 'text-left' },
                      { key: 'description' as WorkRegColKey, label: 'Description of Work', align: 'text-left' },
                      { key: 'station' as WorkRegColKey, label: 'Station', align: 'text-center' },
                      { key: 'side' as WorkRegColKey, label: 'Side', align: 'text-center' },
                      { key: 'unit' as WorkRegColKey, label: 'Unit', align: 'text-center text-purple-700 font-bold' },
                      { key: 'dailyQty' as WorkRegColKey, label: 'Daily Qty', align: 'text-center' },
                      { key: 'previousTotal' as WorkRegColKey, label: 'Previous Total', align: 'text-center text-slate-500' },
                      { key: 'dailyExecuted' as WorkRegColKey, label: 'Daily Executed', align: 'text-center text-blue-700' },
                      { key: 'cumulative' as WorkRegColKey, label: 'Cumulative (To Date)', align: 'text-center text-rose-600 font-bold' },
                      { key: 'remarks' as WorkRegColKey, label: 'Remarks & Observations', align: 'text-left text-slate-700 font-bold' },
                      { key: 'status' as WorkRegColKey, label: 'Status', align: 'text-center text-emerald-700 font-bold' }
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`p-2.5 border-r border-slate-200 relative group/col select-none ${col.align}`}
                      >
                        <span className="block truncate pr-1.5" title={col.label}>
                          {col.label}
                        </span>
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          title="Drag to resize column (double-click to reset)"
                          onMouseDown={e => startRegColResize(col.key, e)}
                          onDoubleClick={() => updateRegColWidth(col.key, DEFAULT_WORK_REG_COL_WIDTHS[col.key])}
                          className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                            resizingRegCol === col.key
                              ? 'bg-blue-500/30'
                              : 'hover:bg-blue-400/20'
                          }`}
                        >
                          <span
                            className={`w-[2px] h-4 rounded-full transition-colors ${
                              resizingRegCol === col.key
                                ? 'bg-blue-600 h-full'
                                : 'bg-transparent group-hover/col:bg-blue-400/80'
                            }`}
                          />
                        </div>
                      </th>
                    ))}
                    {!isReadonly && <th className="p-2.5 text-center print:hidden">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.filter(sec => !sec.isSpecial && !['14', '15', '16', '17', '14.1', '14.2'].includes(sec.id)).length > 0 ? sections.filter(sec => !sec.isSpecial && !['14', '15', '16', '17', '14.1', '14.2'].includes(sec.id)).map((sec, secIdx) => {
                    if (workRegisterActivityFilter !== 'ALL' && sec.id !== workRegisterActivityFilter) {
                      return null;
                    }

                    const rawSecActivities = currentActivities.filter(a => {
                      if (sec.id === '14') {
                        return a.activityType === '14' || Boolean(a.pipeLocation && !a.boxCulvertLocation && !a.slabCulvertLocation && !a.bridgeLocation);
                      }
                      if (sec.id === '15' || sec.id === '14.1') {
                        return a.activityType === '15' || a.activityType === '14.1' || Boolean(a.boxCulvertLocation && !a.bridgeLocation);
                      }
                      if (sec.id === '16' || sec.id === '14.2') {
                        return a.activityType === '16' || a.activityType === '14.2' || Boolean(a.slabCulvertLocation);
                      }
                      if (sec.id === '17' || (sec.id === '15' && sec.name.includes('Bridge'))) {
                        return a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage));
                      }
                      if (sec.id === '18') {
                        return a.activityType === '18' || (a.activityType === '16' && !a.slabCulvertLocation);
                      }
                      return a.activityType === sec.id;
                    });

                    const secActivities = rawSecActivities.filter(a => {
                      if (workRegisterStatusFilter === 'ALL') return true;
                      const st = a.status || a.qcStatus || 'Draft';
                      return st === workRegisterStatusFilter;
                    });
                    const totals = getSectionCumulativeTotals(sec.id);
                    const defaultUnit = getDefaultUnit(sec.id);

                    if (showActiveOnly && secActivities.length === 0) return null;

                    const normalizedSearch = searchQuery.trim().toLowerCase();
                    if (normalizedSearch) {
                      const matchesSection =
                        sec.id.toLowerCase().includes(normalizedSearch) ||
                        sec.name.toLowerCase().includes(normalizedSearch);
                      const matchesEntry = secActivities.some(a =>
                        (a.description || '').toLowerCase().includes(normalizedSearch) ||
                        (a.startStationKm || '').toLowerCase().includes(normalizedSearch) ||
                        (a.pipeLocation || '').toLowerCase().includes(normalizedSearch) ||
                        (a.boxCulvertLocation || '').toLowerCase().includes(normalizedSearch) ||
                        (a.slabCulvertLocation || '').toLowerCase().includes(normalizedSearch) ||
                        (a.bridgeLocation || '').toLowerCase().includes(normalizedSearch)
                      );
                      if (!matchesSection && !matchesEntry) return null;
                    }

                    // SPECIALIZED RENDERING FOR SECTION 14: RCP PIPE CONSTRUCTION
                    if (sec.id === '14') {
                      const pipeActivities = secActivities.filter(a => {
                        if (pipeFilterStage === 'ALL') return true;
                        return a.pipeSelectedStage === pipeFilterStage;
                      });

                      const count = secActivities.length;
                      const avgExc = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgMas = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeMasonryPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgPaw = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipePavedWaterwayPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgIns = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeInstallationPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgBck = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgToDate = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const totalKm = secActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

                      return (
                        <tr key={`sec_14_${secIdx}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? (isReadonly ? 12 : 13) : (isReadonly ? 11 : 12)} className="p-0">
                            <div className="bg-white border-y-2 border-blue-600/30">
                              
                              {/* 14. RCP Construction Section Title Header */}
                              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900 text-white p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="bg-blue-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                                    ERA Special Sub-Register
                                  </span>
                                  <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                                    <span>14. RCP Pipe Construction (Reinforced Concrete Pipe Culverts)</span>
                                  </h4>
                                  <span className="text-blue-200 text-xs font-normal">
                                    ({secActivities.length} culvert locations active)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 print:hidden">
                                  {/* Hide/Show View Toggle */}
                                  <button
                                    onClick={() => toggleStructureVisibility('pipe')}
                                    className="bg-blue-800/90 hover:bg-blue-700 text-blue-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-blue-600/60 shadow-xs transition"
                                    title={hiddenStructureViews.pipe ? "Expand Pipe Culvert View" : "Hide Pipe Culvert View"}
                                  >
                                    {hiddenStructureViews.pipe ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    <span>{hiddenStructureViews.pipe ? "Show View" : "Hide View"}</span>
                                    {hiddenStructureViews.pipe ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                  </button>

                                  {!isReadonly && (
                                    <>
                                      <button
                                        onClick={() => handleAddRowAt('14')}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                        title="Add new culvert station location"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Location</span>
                                      </button>

                                      <button
                                        onClick={handlePopulateEraPipeLocations}
                                        className="bg-blue-800 hover:bg-blue-700 text-blue-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-blue-700 transition"
                                        title="Load the 15 standard culvert stations from the official ERA report"
                                      >
                                        <RotateCcw className="w-3 h-3 text-blue-300" />
                                        <span>Populate 15 Standard Stations</span>
                                      </button>

                                      <button 
                                        onClick={() => handleDeleteSection('14')}
                                        className="text-blue-300 hover:text-rose-300 p-1 rounded"
                                        title="Delete Section 14 from daily register"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* If Hidden: Compact Collapsible Summary Bar */}
                              {hiddenStructureViews.pipe ? (
                                <div 
                                  onClick={() => toggleStructureVisibility('pipe')}
                                  className="bg-blue-50/70 hover:bg-blue-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-blue-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                    <span className="text-xs font-bold text-blue-950">
                                      RCP Pipe View Hidden ({secActivities.length} Locations)
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-blue-800">
                                        Avg To-Date: {avgToDate}%
                                      </span>
                                      <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                                        Total Extent: {totalKm.toFixed(3)} km
                                      </span>
                                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                                        [ Exc: {avgExc}% | Mas: {avgMas}% | Paw: {avgPaw}% | Inst: {avgIns}% | Backfill: {avgBck}% ]
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-blue-700 font-semibold flex items-center gap-1 print:hidden">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Click to Expand Table</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* DEDICATED QUICK STAGE SELECTION & UPDATE BAR */}
                                  <div className="bg-slate-100/90 border-b border-slate-300 p-3 print:hidden">
                                <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-xs space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                      <span className="text-xs font-bold text-slate-900">
                                        Select Specific Location & Construction Stage:
                                      </span>
                                      <span className="text-[11px] text-blue-700 font-semibold">
                                        [ Excavation, Masonry inlet/outlet, Paved Water way, Pipe Installation, Back fill ]
                                      </span>
                                    </div>

                                    {/* Stage Filter Pills */}
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Filter:
                                      </span>
                                      <button
                                        onClick={() => setPipeFilterStage('ALL')}
                                        className={`px-2 py-0.5 rounded font-medium transition ${pipeFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      >
                                        All ({secActivities.length})
                                      </button>
                                      {PIPE_CONSTRUCTION_STAGES.map(st => {
                                        const stCount = secActivities.filter(a => a.pipeSelectedStage === st).length;
                                        return (
                                          <button
                                            key={st}
                                            onClick={() => setPipeFilterStage(st)}
                                            className={`px-2 py-0.5 rounded font-medium transition ${pipeFilterStage === st ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                          >
                                            {st} {stCount > 0 ? `(${stCount})` : ''}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Quick Action Input Row */}
                                  {!isReadonly && (
                                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                      {/* 1. Pipe Location Selector / Input */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Station:</span>
                                        <select
                                          value={selectedPipeLocation}
                                          onChange={e => {
                                            setSelectedPipeLocation(e.target.value);
                                            setCustomPipeLocation('');
                                          }}
                                          className="bg-transparent font-mono font-bold text-slate-900 outline-none text-xs cursor-pointer"
                                        >
                                          {Array.from(new Set([...PRESET_PIPE_LOCATIONS, ...secActivities.map(a => a.pipeLocation || a.startStationKm).filter(Boolean)])).map(loc => (
                                            <option key={loc} value={loc}>Stn {loc}</option>
                                          ))}
                                        </select>
                                        <input
                                          value={customPipeLocation}
                                          onChange={e => setCustomPipeLocation(e.target.value)}
                                          placeholder="or custom km..."
                                          className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-blue-500"
                                        />
                                      </div>

                                      {/* 2. Select Pipe Construction Stage */}
                                      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-blue-900 uppercase">Stage:</span>
                                        <select
                                          value={selectedPipeStage}
                                          onChange={e => setSelectedPipeStage(e.target.value as PipeConstructionStage)}
                                          className="bg-transparent font-bold text-blue-800 outline-none text-xs cursor-pointer"
                                        >
                                          {PIPE_CONSTRUCTION_STAGES.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* 3. Stage Progress % Selector */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Progress:</span>
                                        <div className="flex items-center gap-1">
                                          {[50, 70, 85, 95, 100].map(val => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setSelectedPipeStagePct(val)}
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${selectedPipeStagePct === val ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                            >
                                              {val}%
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={selectedPipeStagePct}
                                          onChange={e => setSelectedPipeStagePct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                          className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-blue-700 outline-none"
                                        />
                                        <span className="font-bold text-slate-600">%</span>
                                      </div>

                                      {/* 4. Daily Executed (No.) */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={selectedPipeStageKm}
                                          onChange={e => setSelectedPipeStageKm(parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                                        />
                                        <span className="text-slate-500 text-[10px]">No.</span>
                                      </div>

                                      {/* Apply Button */}
                                      <button
                                        onClick={handleApplyPipeStageUpdate}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1 ml-auto"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Record / Update Stage</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* DEDICATED ERA PIPE CONSTRUCTION TABLE SCROLL CONTROLS */}
                              <div className="bg-blue-50/70 border-b border-blue-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] print:hidden">
                                <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                                  <span>Scroll Option ({pipeActivities.length} pipe rows):</span>
                                  <button
                                    type="button"
                                    onClick={() => setIsPipeScrollEnabled(prev => !prev)}
                                    className={`px-2 py-0.5 rounded border font-bold transition cursor-pointer ${
                                      isPipeScrollEnabled
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-100'
                                    }`}
                                    title={isPipeScrollEnabled ? 'Switch to Full Table Height' : 'Enable Compact Scrollable Viewport (420px)'}
                                  >
                                    {isPipeScrollEnabled ? 'Scroll View: ON (Max 420px)' : 'Scroll View: OFF (Full Height)'}
                                  </button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inner = pipeTableScrollRef.current;
                                      const outer = workRegScrollRef.current;
                                      const target = (inner && inner.scrollWidth > inner.clientWidth + 2) ? inner : outer;
                                      target?.scrollBy({ left: -240, behavior: 'smooth' });
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                    title="Scroll Pipe table left"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Left</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inner = pipeTableScrollRef.current;
                                      const outer = workRegScrollRef.current;
                                      const target = (inner && inner.scrollWidth > inner.clientWidth + 2) ? inner : outer;
                                      target?.scrollBy({ left: 240, behavior: 'smooth' });
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                    title="Scroll Pipe table right"
                                  >
                                    <span>Right</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  {isPipeScrollEnabled && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => pipeTableScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                        title="Scroll to top of Pipe table"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        <span>Top</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const el = pipeTableScrollRef.current;
                                          if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                                        }}
                                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                        title="Scroll to bottom of Pipe table"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        <span>Bottom</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* DEDICATED ERA PIPE CONSTRUCTION TABLE */}
                              <div
                                ref={pipeTableScrollRef}
                                className={
                                  isPipeScrollEnabled
                                    ? 'w-full max-w-full overflow-x-auto overflow-y-auto max-h-[420px] print:max-h-none print:overflow-visible'
                                    : 'w-full max-w-full overflow-x-auto print:overflow-visible'
                                }
                              >
                                <table
                                  className="min-w-full table-fixed text-xs text-left border-collapse"
                                  style={{ width: `${getSubTableTotalWidth('pipe')}px` }}
                                >
                                  <colgroup>
                                    {isBulkEditMode && <col style={{ width: '32px' }} />}
                                    {SUB_TABLE_COLS.pipe.map(col => (
                                      <col key={col.key} style={{ width: `${subTableColWidths.pipe[col.key] || col.defaultWidth}px` }} />
                                    ))}
                                    {!isReadonly && <col style={{ width: '56px' }} />}
                                  </colgroup>
                                  <thead className="sticky top-0 z-20 shadow-xs">
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden">✓</th>}
                                      {SUB_TABLE_COLS.pipe.map(col => {
                                        const isResizingThis = resizingSubCol?.table === 'pipe' && resizingSubCol?.col === col.key;
                                        return (
                                          <th
                                            key={col.key}
                                            className={`p-2 border-r border-slate-300 relative group/subcol select-none ${col.headerClass}`}
                                          >
                                            <span className="block truncate pr-1" title={col.label}>
                                              {col.label}
                                            </span>
                                            <div
                                              role="separator"
                                              aria-orientation="vertical"
                                              title="Drag to resize column (double-click to reset)"
                                              onMouseDown={e => startSubColResize('pipe', col.key, e)}
                                              onDoubleClick={() => resetSubColWidth('pipe', col.key)}
                                              className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                                                isResizingThis ? 'bg-blue-500/30' : 'hover:bg-blue-400/20'
                                              }`}
                                            >
                                              <span
                                                className={`w-[2px] h-3.5 rounded-full transition-colors ${
                                                  isResizingThis ? 'bg-blue-600 h-full' : 'bg-transparent group-hover/subcol:bg-blue-400/80'
                                                }`}
                                              />
                                            </div>
                                          </th>
                                        );
                                      })}
                                      {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {pipeActivities.length > 0 ? (
                                      pipeActivities.map((act, actIdx) => {
                                        const loc = act.pipeLocation || act.startStationKm || '200+000';
                                        const activeStage = act.pipeSelectedStage || 'Excavation';
                                        const exc = act.pipeExcavationPct ?? 100;
                                        const mas = act.pipeMasonryPct ?? 100;
                                        const paw = act.pipePavedWaterwayPct ?? 100;
                                        const ins = act.pipeInstallationPct ?? 100;
                                        const bck = act.pipeBackfillPct ?? 100;
                                        const toDateCalculated = Math.round((exc + mas + paw + ins + bck) / 5);
                                        const toDateVal = act.pipeToDatePct !== undefined ? act.pipeToDatePct : toDateCalculated;

                                        return (
                                          <tr key={`pipe-${act.id}-${actIdx}`} className="hover:bg-slate-50 transition border-b border-slate-200 text-xs text-slate-800">
                                            {isBulkEditMode && (
                                              <td className="p-1.5 text-center border-r border-slate-200 print:hidden">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedRowIds.includes(act.id)}
                                                  onChange={() => handleToggleSelectRow(act.id)}
                                                  className="rounded cursor-pointer"
                                                />
                                              </td>
                                            )}

                                            {/* 1. Pipe Location */}
                                            <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                                              <input
                                                value={loc}
                                                onChange={e => {
                                                  handleCellUpdate(act.id, 'pipeLocation', e.target.value);
                                                  handleCellUpdate(act.id, 'startStationKm', e.target.value);
                                                }}
                                                className="w-full text-center bg-transparent font-mono font-bold outline-none"
                                                placeholder="200+313"
                                              />
                                            </td>

                                            {/* 2. OPTION TO SELECT FOR SPECIFIC LOCATION: Excavation, Masonry inlet/outlet, Paved Water way, Pipe Installation, Back fill */}
                                            <td className="p-1.5 border-r border-slate-200 text-center bg-blue-50/40">
                                              <select
                                                value={activeStage}
                                                onChange={e => handleCellUpdate(act.id, 'pipeSelectedStage', e.target.value)}
                                                className="w-full bg-white border border-blue-300 text-blue-900 font-bold rounded px-1.5 py-1 text-xs outline-none cursor-pointer shadow-2xs hover:border-blue-500"
                                                title="Select Pipe Construction Stage for this location"
                                              >
                                                {PIPE_CONSTRUCTION_STAGES.map(st => (
                                                  <option key={st} value={st}>{st}</option>
                                                ))}
                                                <option value="All Stages">All Stages</option>
                                              </select>
                                            </td>

                                            {/* 3. Excavation */}
                                            <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Excavation' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300 inset-0' : ''}`}>
                                              <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={exc}
                                                  onChange={e => handleUpdatePipeStageCell(act.id, 'pipeExcavationPct', parseFloat(e.target.value) || 0)}
                                                  className="w-10 text-center bg-transparent font-medium outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                              </div>
                                            </td>

                                            {/* 4. Masonry inlet/outlet */}
                                            <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Masonry inlet/outlet' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300 inset-0' : ''}`}>
                                              <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={mas}
                                                  onChange={e => handleUpdatePipeStageCell(act.id, 'pipeMasonryPct', parseFloat(e.target.value) || 0)}
                                                  className="w-10 text-center bg-transparent font-medium outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                              </div>
                                            </td>

                                            {/* 5. Paved Water way */}
                                            <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Paved Water way' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300 inset-0' : ''}`}>
                                              <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={paw}
                                                  onChange={e => handleUpdatePipeStageCell(act.id, 'pipePavedWaterwayPct', parseFloat(e.target.value) || 0)}
                                                  className="w-10 text-center bg-transparent font-medium outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                              </div>
                                            </td>

                                            {/* 6. Pipe Installation */}
                                            <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Pipe Installation' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300 inset-0' : ''}`}>
                                              <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={ins}
                                                  onChange={e => handleUpdatePipeStageCell(act.id, 'pipeInstallationPct', parseFloat(e.target.value) || 0)}
                                                  className="w-10 text-center bg-transparent font-medium outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                              </div>
                                            </td>

                                            {/* 7. Back fill */}
                                            <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Back fill' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300 inset-0' : ''}`}>
                                              <div className="flex items-center justify-center gap-0.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={bck}
                                                  onChange={e => handleUpdatePipeStageCell(act.id, 'pipeBackfillPct', parseFloat(e.target.value) || 0)}
                                                  className="w-10 text-center bg-transparent font-medium outline-none"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                              </div>
                                            </td>

                                            {/* 8. Previous % */}
                                            <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={act.pipePreviousPct ?? toDateVal}
                                                onChange={e => handleCellUpdate(act.id, 'pipePreviousPct', parseFloat(e.target.value) || 0)}
                                                className="w-10 text-center bg-transparent outline-none"
                                              />
                                              <span className="text-[10px] text-slate-400">%</span>
                                            </td>

                                            {/* 9. Daily Progress % */}
                                            <td className="p-1 border-r border-slate-200 text-center text-blue-700 font-bold">
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={act.pipeDailyProgressPct ?? 0}
                                                onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value) || 0)}
                                                className="w-10 text-center bg-transparent text-blue-700 font-bold outline-none"
                                              />
                                              <span className="text-[10px] text-blue-400">%</span>
                                            </td>

                                            {/* 10. To date % */}
                                            <td className="p-1 border-r border-slate-200 text-center text-rose-600 font-bold">
                                              <span>{toDateVal}%</span>
                                            </td>

                                            {/* 11. Daily Executed (No.) */}
                                            <td className="p-1 border-r border-slate-200 text-center font-mono">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm ?? 0)}
                                                onChange={e => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  handleCellUpdate(act.id, 'quantityExecuted', val);
                                                  handleCellUpdate(act.id, 'metricKm', val);
                                                }}
                                                className="w-14 text-center bg-transparent font-mono font-bold outline-none"
                                              />
                                            </td>

                                            {/* Actions */}
                                            {!isReadonly && (
                                              <td className="p-1.5 text-center print:hidden">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button
                                                    onClick={() => {
                                                      setEditingActivity({ ...act });
                                                      setIsResourceModalOpen(true);
                                                    }}
                                                    className="text-slate-400 hover:text-blue-600 p-1 rounded"
                                                    title="Manage assigned plant/equipment"
                                                  >
                                                    <Truck className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteRow(act.id)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                                    title="Delete pipe location"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={isBulkEditMode ? 13 : 12} className="p-4 text-center text-slate-500 bg-slate-50/50 space-y-2">
                                          <p className="text-xs">
                                            {pipeFilterStage !== 'ALL'
                                              ? `No culvert locations currently marked with stage "${pipeFilterStage}".`
                                              : 'No pipe culvert construction locations recorded for today.'}
                                          </p>
                                          {!isReadonly && (
                                            <div className="flex items-center justify-center gap-2">
                                              <button
                                                onClick={() => handleAddRowAt('14')}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                              >
                                                + Add First Location
                                              </button>
                                              <button
                                                onClick={handlePopulateEraPipeLocations}
                                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition"
                                              >
                                                Populate 15 Standard ERA Culverts
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}

                                    {/* SECTION 14 TOTAL ROW (MATCHING ERA PHOTO) */}
                                    {secActivities.length > 0 && (
                                      <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                                        {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                                        <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                                          Total ({secActivities.length} No.)
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-normal">
                                          Averages:
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgExc}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgMas}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgPaw}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgIns}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgBck}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-semibold">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-blue-700 font-bold">0.00%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-rose-700 font-black">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                                          {totalKm.toFixed(3)} No.
                                        </td>
                                        {!isReadonly && (
                                          <td className="p-1.5 text-center print:hidden">
                                            <button
                                              onClick={() => handleClearSectionEntries('14')}
                                              className="text-[10px] text-rose-500 hover:text-rose-700 font-normal underline"
                                            >
                                              Clear
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // SPECIALIZED RENDERING FOR SECTION 15: BOX CULVERT CONSTRUCTION
                    if ((sec.id === '15' && !sec.name.toLowerCase().includes('bridge')) || sec.id === '14.1' || (sec.name.toLowerCase().includes('box') && !sec.name.toLowerCase().includes('bridge'))) {
                      const boxActivities = secActivities.filter(a => {
                        if (boxFilterStage === 'ALL') return true;
                        return a.boxCulvertSelectedStage === boxFilterStage;
                      });

                      const count = secActivities.length;
                      const avgExc = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgBtm = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxBottomSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgWll = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxWallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgTop = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxTopSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgWng = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxWingwallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgBck = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.boxBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgToDate = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const totalKm = secActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

                      return (
                        <tr key={`sec_box_${sec.id}_${secIdx}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? (isReadonly ? 12 : 13) : (isReadonly ? 11 : 12)} className="p-0">
                            <div className="bg-white border-y-2 border-emerald-600/30">
                              
                              {/* 15. Box Culvert Header */}
                              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-900 text-white p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="bg-emerald-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                                    RC Box Culvert Structure
                                  </span>
                                  <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                                    <span>15. Box Culvert Construction (Reinforced Concrete Box Culverts)</span>
                                  </h4>
                                  <span className="text-emerald-200 text-xs font-normal">
                                    ({secActivities.length} box culverts active)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 print:hidden">
                                  {/* Hide/Show View Toggle */}
                                  <button
                                    onClick={() => toggleStructureVisibility('box')}
                                    className="bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-600/60 shadow-xs transition"
                                    title={hiddenStructureViews.box ? "Expand Box Culvert View" : "Hide Box Culvert View"}
                                  >
                                    {hiddenStructureViews.box ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    <span>{hiddenStructureViews.box ? "Show View" : "Hide View"}</span>
                                    {hiddenStructureViews.box ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                  </button>

                                  {!isReadonly && (
                                    <>
                                      <button
                                        onClick={() => handleAddRowAt(sec.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                        title="Add new box culvert structure"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Box Culvert</span>
                                      </button>

                                      <button
                                        onClick={handlePopulateEraBoxLocations}
                                        className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-emerald-700 transition"
                                        title="Load standard ERA box culvert structures"
                                      >
                                        <RotateCcw className="w-3 h-3 text-emerald-300" />
                                        <span>Populate Standard Box Culverts</span>
                                      </button>

                                      <button 
                                        onClick={() => handleDeleteSection(sec.id)}
                                        className="text-emerald-300 hover:text-rose-300 p-1 rounded"
                                        title="Delete Box Culvert Section"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* If Hidden: Compact Collapsible Summary Bar */}
                              {hiddenStructureViews.box ? (
                                <div 
                                  onClick={() => toggleStructureVisibility('box')}
                                  className="bg-emerald-50/70 hover:bg-emerald-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs font-bold text-emerald-950">
                                      Box Culvert View Hidden ({secActivities.length} Structures)
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-emerald-800">
                                        Avg To-Date: {avgToDate}%
                                      </span>
                                      <span className="bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                                        Total Extent: {totalKm.toFixed(3)} km
                                      </span>
                                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                                        [ Exc: {avgExc}% | Btm: {avgBtm}% | Wall: {avgWll}% | Top: {avgTop}% | Wing: {avgWng}% | Backfill: {avgBck}% ]
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 print:hidden">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Click to Expand Table</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* STAGE SELECTION TOOLBAR FOR BOX CULVERTS */}
                                  <div className="bg-emerald-50/70 border-b border-emerald-200 p-3 print:hidden">
                                <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                      <span className="text-xs font-bold text-slate-900">
                                        Select Box Culvert Location & Specific Construction Stage:
                                      </span>
                                      <span className="text-[11px] text-emerald-800 font-semibold">
                                        [ Excavation & Blinding, Bottom Slab, Walls & Stem, Top Slab, Wingwalls & Apron, Backfill ]
                                      </span>
                                    </div>

                                    {/* Stage Filter Pills */}
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Filter:
                                      </span>
                                      <button
                                        onClick={() => setBoxFilterStage('ALL')}
                                        className={`px-2 py-0.5 rounded font-medium transition ${boxFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      >
                                        All ({secActivities.length})
                                      </button>
                                      {BOX_CULVERT_STAGES.map(st => {
                                        const stCount = secActivities.filter(a => a.boxCulvertSelectedStage === st).length;
                                        return (
                                          <button
                                            key={st}
                                            onClick={() => setBoxFilterStage(st)}
                                            className={`px-2 py-0.5 rounded font-medium transition ${boxFilterStage === st ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                          >
                                            {st} {stCount > 0 ? `(${stCount})` : ''}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Quick Action Input Row */}
                                  {!isReadonly && (
                                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                      {/* Location Selector */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Location:</span>
                                        <select
                                          value={selectedBoxLocation}
                                          onChange={e => {
                                            setSelectedBoxLocation(e.target.value);
                                            setCustomBoxLocation('');
                                          }}
                                          className="bg-transparent font-medium text-slate-900 outline-none text-xs cursor-pointer max-w-xs truncate"
                                        >
                                          {Array.from(new Set([...PRESET_BOX_CULVERT_LOCATIONS, ...secActivities.map(a => a.boxCulvertLocation || a.startStationKm).filter(Boolean)])).map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                          ))}
                                        </select>
                                        <input
                                          value={customBoxLocation}
                                          onChange={e => setCustomBoxLocation(e.target.value)}
                                          placeholder="or custom km..."
                                          className="w-28 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-emerald-500"
                                        />
                                      </div>

                                      {/* Stage Selector */}
                                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-emerald-900 uppercase">Stage:</span>
                                        <select
                                          value={selectedBoxStage}
                                          onChange={e => setSelectedBoxStage(e.target.value as BoxCulvertStage)}
                                          className="bg-transparent font-bold text-emerald-800 outline-none text-xs cursor-pointer"
                                        >
                                          {BOX_CULVERT_STAGES.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Stage Progress % */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Progress:</span>
                                        <div className="flex items-center gap-1">
                                          {[50, 70, 85, 95, 100].map(val => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setSelectedBoxStagePct(val)}
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${selectedBoxStagePct === val ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                            >
                                              {val}%
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={selectedBoxStagePct}
                                          onChange={e => setSelectedBoxStagePct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                          className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-emerald-700 outline-none"
                                        />
                                        <span className="font-bold text-slate-600">%</span>
                                      </div>

                                      {/* Daily Executed (No.) */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={selectedBoxStageKm}
                                          onChange={e => setSelectedBoxStageKm(parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                                        />
                                        <span className="text-slate-500 text-[10px]">No.</span>
                                      </div>

                                      {/* Apply Button */}
                                      <button
                                        onClick={handleApplyBoxStageUpdate}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1 ml-auto"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Record / Update Stage</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* DEDICATED BOX CULVERT TABLE */}
                              <div className="overflow-x-auto">
                                <table
                                  className="min-w-full table-fixed text-xs text-left border-collapse"
                                  style={{ width: `${getSubTableTotalWidth('box')}px` }}
                                >
                                  <colgroup>
                                    {isBulkEditMode && <col style={{ width: '32px' }} />}
                                    {SUB_TABLE_COLS.box.map(col => (
                                      <col key={col.key} style={{ width: `${subTableColWidths.box[col.key] || col.defaultWidth}px` }} />
                                    ))}
                                    {!isReadonly && <col style={{ width: '56px' }} />}
                                  </colgroup>
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden">✓</th>}
                                      {SUB_TABLE_COLS.box.map(col => {
                                        const isResizingThis = resizingSubCol?.table === 'box' && resizingSubCol?.col === col.key;
                                        return (
                                          <th
                                            key={col.key}
                                            className={`p-2 border-r border-slate-300 relative group/subcol select-none ${col.headerClass}`}
                                          >
                                            <span className="block truncate pr-1" title={col.label}>
                                              {col.label}
                                            </span>
                                            <div
                                              role="separator"
                                              aria-orientation="vertical"
                                              title="Drag to resize column (double-click to reset)"
                                              onMouseDown={e => startSubColResize('box', col.key, e)}
                                              onDoubleClick={() => resetSubColWidth('box', col.key)}
                                              className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                                                isResizingThis ? 'bg-emerald-500/30' : 'hover:bg-emerald-400/20'
                                              }`}
                                            >
                                              <span
                                                className={`w-[2px] h-3.5 rounded-full transition-colors ${
                                                  isResizingThis ? 'bg-emerald-600 h-full' : 'bg-transparent group-hover/subcol:bg-emerald-500/80'
                                                }`}
                                              />
                                            </div>
                                          </th>
                                        );
                                      })}
                                      {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {boxActivities.length > 0 ? (
                                      boxActivities.map((act, actIdx) => {
                                        const loc = act.boxCulvertLocation || act.startStationKm || 'Km 195+600';
                                        const activeStage = act.boxCulvertSelectedStage || 'Excavation & Blinding';
                                        const exc = act.boxExcavationPct ?? 100;
                                        const btm = act.boxBottomSlabPct ?? 100;
                                        const wll = act.boxWallsPct ?? 100;
                                        const top = act.boxTopSlabPct ?? 100;
                                        const wng = act.boxWingwallsPct ?? 100;
                                        const bck = act.boxBackfillPct ?? 100;
                                        const toDateCalculated = Math.round((exc + btm + wll + top + wng + bck) / 6);
                                        const toDateVal = act.pipeToDatePct !== undefined ? act.pipeToDatePct : toDateCalculated;

                                        return (
                                          <tr key={`box-${act.id}-${actIdx}`} className="hover:bg-emerald-50/30 transition border-b border-slate-200 text-xs text-slate-800">
                                            {isBulkEditMode && (
                                              <td className="p-1.5 text-center border-r border-slate-200 print:hidden">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedRowIds.includes(act.id)}
                                                  onChange={() => handleToggleSelectRow(act.id)}
                                                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                              </td>
                                            )}

                                            {/* Location */}
                                            <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-900 bg-slate-50/50">
                                              <input
                                                value={act.boxCulvertLocation || loc}
                                                onChange={e => handleCellUpdate(act.id, 'boxCulvertLocation', e.target.value)}
                                                className="w-full bg-transparent font-medium text-slate-900 outline-none hover:bg-white focus:bg-white rounded px-1 transition"
                                              />
                                            </td>

                                            {/* Selected Stage (Today) Dropdown */}
                                            <td className="p-1 border-r border-slate-200 bg-emerald-50/60 text-center">
                                              <select
                                                value={activeStage}
                                                onChange={e => {
                                                  const newStg = e.target.value as BoxCulvertStage;
                                                  handleCellUpdate(act.id, 'boxCulvertSelectedStage', newStg);
                                                }}
                                                className="w-full bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-emerald-900 shadow-xs cursor-pointer focus:outline-emerald-500"
                                              >
                                                {BOX_CULVERT_STAGES.map(st => (
                                                  <option key={st} value={st}>{st}</option>
                                                ))}
                                              </select>
                                            </td>

                                            {/* 1. Excavation & Blinding */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Excavation & Blinding' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={exc}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxExcavationPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 2. Bottom Slab */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Bottom Slab' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={btm}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxBottomSlabPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 3. Walls & Stem */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Walls & Stem' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={wll}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxWallsPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 4. Top Slab */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Top Slab' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={top}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxTopSlabPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 5. Wingwalls & Apron */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Wingwalls & Apron' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={wng}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxWingwallsPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 6. Backfill */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Backfill' ? 'bg-emerald-100/70 ring-1 ring-emerald-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={bck}
                                                onChange={e => handleUpdateBoxStageCell(act.id, 'boxBackfillPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* Previous */}
                                            <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                              <input
                                                type="number"
                                                value={act.pipePreviousPct ?? 50}
                                                onChange={e => handleCellUpdate(act.id, 'pipePreviousPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-slate-500 font-medium outline-none"
                                              />%
                                            </td>

                                            {/* Daily Progress */}
                                            <td className="p-1 border-r border-slate-200 text-center text-emerald-700 font-bold">
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={act.pipeDailyProgressPct ?? 0}
                                                onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-emerald-700 font-bold outline-none"
                                              />%
                                            </td>

                                            {/* To Date */}
                                            <td className="p-1 border-r border-slate-200 text-center text-rose-700 font-black bg-rose-50/30">
                                              {toDateVal}%
                                            </td>

                                            {/* Daily Executed (No.) */}
                                            <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm || '')}
                                                onChange={e => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  handleCellUpdate(act.id, 'quantityExecuted', val);
                                                  handleCellUpdate(act.id, 'metricKm', val);
                                                }}
                                                placeholder="0.00"
                                                className="w-14 text-center bg-transparent font-mono font-bold text-slate-900 outline-none"
                                              />
                                            </td>

                                            {/* Delete Action */}
                                            {!isReadonly && (
                                              <td className="p-1 text-center print:hidden">
                                                <button
                                                  onClick={() => handleDeleteRow(act.id)}
                                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                                                  title="Delete this box culvert row"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                                          No box culvert records for {boxFilterStage === 'ALL' ? 'this date' : `stage: ${boxFilterStage}`}. Use the bar above to record progress or click "Populate Standard Box Culverts".
                                        </td>
                                      </tr>
                                    )}

                                    {/* Subtotal / Summary Row */}
                                    {secActivities.length > 0 && (
                                      <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                                        {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                                        <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                                          Total ({secActivities.length} Structures)
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-normal">
                                          Averages:
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgExc}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgBtm}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgWll}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgTop}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgWng}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgBck}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-semibold">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-emerald-700 font-bold">0.00%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-rose-700 font-black">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                                          {totalKm.toFixed(3)} No.
                                        </td>
                                        {!isReadonly && (
                                          <td className="p-1.5 text-center print:hidden">
                                            <button
                                              onClick={() => handleClearSectionEntries(sec.id)}
                                              className="text-[10px] text-rose-500 hover:text-rose-700 font-normal underline"
                                            >
                                              Clear
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // SPECIALIZED RENDERING FOR SECTION 16: SLAB CULVERT CONSTRUCTION
                    if (sec.id === '16' || sec.id === '14.2' || (sec.name.toLowerCase().includes('slab') && !sec.name.toLowerCase().includes('bridge'))) {
                      const slabActivities = secActivities.filter(a => {
                        if (slabFilterStage === 'ALL') return true;
                        return a.slabCulvertSelectedStage === slabFilterStage;
                      });

                      const count = secActivities.length;
                      const avgExc = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgAbt = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabAbutmentPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgDck = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabDeckPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgWng = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabWingwallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgPtc = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabPitchingPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgBck = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.slabBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgToDate = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const totalKm = secActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

                      return (
                        <tr key={`sec_slab_${sec.id}_${secIdx}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? (isReadonly ? 12 : 13) : (isReadonly ? 11 : 12)} className="p-0">
                            <div className="bg-white border-y-2 border-indigo-600/30">
                              
                              {/* 16. Slab Culvert Header */}
                              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="bg-indigo-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                                    RC Slab Culvert Structure
                                  </span>
                                  <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                                    <span>16. Slab Culvert Construction (Reinforced Concrete Slab Culverts)</span>
                                  </h4>
                                  <span className="text-indigo-200 text-xs font-normal">
                                    ({secActivities.length} slab culverts active)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 print:hidden">
                                  {/* Hide/Show View Toggle */}
                                  <button
                                    onClick={() => toggleStructureVisibility('slab')}
                                    className="bg-indigo-800/90 hover:bg-indigo-700 text-indigo-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-600/60 shadow-xs transition"
                                    title={hiddenStructureViews.slab ? "Expand Slab Culvert View" : "Hide Slab Culvert View"}
                                  >
                                    {hiddenStructureViews.slab ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    <span>{hiddenStructureViews.slab ? "Show View" : "Hide View"}</span>
                                    {hiddenStructureViews.slab ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                  </button>

                                  {!isReadonly && (
                                    <>
                                      <button
                                        onClick={() => handleAddRowAt(sec.id)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                        title="Add new slab culvert structure"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Slab Culvert</span>
                                      </button>

                                      <button
                                        onClick={handlePopulateEraSlabLocations}
                                        className="bg-indigo-800 hover:bg-indigo-700 text-indigo-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-indigo-700 transition"
                                        title="Load standard ERA slab culvert structures"
                                      >
                                        <RotateCcw className="w-3 h-3 text-indigo-300" />
                                        <span>Populate Standard Slab Culverts</span>
                                      </button>

                                      <button 
                                        onClick={() => handleDeleteSection(sec.id)}
                                        className="text-indigo-300 hover:text-rose-300 p-1 rounded"
                                        title="Delete Slab Culvert Section"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* If Hidden: Compact Collapsible Summary Bar */}
                              {hiddenStructureViews.slab ? (
                                <div 
                                  onClick={() => toggleStructureVisibility('slab')}
                                  className="bg-indigo-50/70 hover:bg-indigo-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-indigo-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs font-bold text-indigo-950">
                                      Slab Culvert View Hidden ({secActivities.length} Structures)
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="bg-white border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-indigo-800">
                                        Avg To-Date: {avgToDate}%
                                      </span>
                                      <span className="bg-white border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                                        Total Extent: {totalKm.toFixed(3)} km
                                      </span>
                                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                                        [ Exc: {avgExc}% | Abt: {avgAbt}% | Deck: {avgDck}% | Wing: {avgWng}% | Pitch: {avgPtc}% | Backfill: {avgBck}% ]
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1 print:hidden">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Click to Expand Table</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* STAGE SELECTION TOOLBAR FOR SLAB CULVERTS */}
                                  <div className="bg-indigo-50/70 border-b border-indigo-200 p-3 print:hidden">
                                <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-xs space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                                      <span className="text-xs font-bold text-slate-900">
                                        Select Slab Culvert Location & Specific Construction Stage:
                                      </span>
                                      <span className="text-[11px] text-indigo-800 font-semibold">
                                        [ Excavation & Footing, Abutment Walls, RC Deck Slab, Wingwalls & Parapet, Bed Pitching, Backfill ]
                                      </span>
                                    </div>

                                    {/* Stage Filter Pills */}
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Filter:
                                      </span>
                                      <button
                                        onClick={() => setSlabFilterStage('ALL')}
                                        className={`px-2 py-0.5 rounded font-medium transition ${slabFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      >
                                        All ({secActivities.length})
                                      </button>
                                      {SLAB_CULVERT_STAGES.map(st => {
                                        const stCount = secActivities.filter(a => a.slabCulvertSelectedStage === st).length;
                                        return (
                                          <button
                                            key={st}
                                            onClick={() => setSlabFilterStage(st)}
                                            className={`px-2 py-0.5 rounded font-medium transition ${slabFilterStage === st ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                          >
                                            {st} {stCount > 0 ? `(${stCount})` : ''}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Quick Action Input Row */}
                                  {!isReadonly && (
                                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                      {/* Location Selector */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Location:</span>
                                        <select
                                          value={selectedSlabLocation}
                                          onChange={e => {
                                            setSelectedSlabLocation(e.target.value);
                                            setCustomSlabLocation('');
                                          }}
                                          className="bg-transparent font-medium text-slate-900 outline-none text-xs cursor-pointer max-w-xs truncate"
                                        >
                                          {Array.from(new Set([...PRESET_SLAB_CULVERT_LOCATIONS, ...secActivities.map(a => a.slabCulvertLocation || a.startStationKm).filter(Boolean)])).map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                          ))}
                                        </select>
                                        <input
                                          value={customSlabLocation}
                                          onChange={e => setCustomSlabLocation(e.target.value)}
                                          placeholder="or custom km..."
                                          className="w-28 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-indigo-500"
                                        />
                                      </div>

                                      {/* Stage Selector */}
                                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-indigo-900 uppercase">Stage:</span>
                                        <select
                                          value={selectedSlabStage}
                                          onChange={e => setSelectedSlabStage(e.target.value as SlabCulvertStage)}
                                          className="bg-transparent font-bold text-indigo-800 outline-none text-xs cursor-pointer"
                                        >
                                          {SLAB_CULVERT_STAGES.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Stage Progress % */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Progress:</span>
                                        <div className="flex items-center gap-1">
                                          {[50, 70, 85, 95, 100].map(val => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setSelectedSlabStagePct(val)}
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${selectedSlabStagePct === val ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                            >
                                              {val}%
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={selectedSlabStagePct}
                                          onChange={e => setSelectedSlabStagePct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                          className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-indigo-700 outline-none"
                                        />
                                        <span className="font-bold text-slate-600">%</span>
                                      </div>

                                      {/* Daily Executed (No.) */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={selectedSlabStageKm}
                                          onChange={e => setSelectedSlabStageKm(parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                                        />
                                        <span className="text-slate-500 text-[10px]">No.</span>
                                      </div>

                                      {/* Apply Button */}
                                      <button
                                        onClick={handleApplySlabStageUpdate}
                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1 ml-auto"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Record / Update Stage</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* DEDICATED SLAB CULVERT TABLE */}
                              <div className="overflow-x-auto">
                                <table
                                  className="min-w-full table-fixed text-xs text-left border-collapse"
                                  style={{ width: `${getSubTableTotalWidth('slab')}px` }}
                                >
                                  <colgroup>
                                    {isBulkEditMode && <col style={{ width: '32px' }} />}
                                    {SUB_TABLE_COLS.slab.map(col => (
                                      <col key={col.key} style={{ width: `${subTableColWidths.slab[col.key] || col.defaultWidth}px` }} />
                                    ))}
                                    {!isReadonly && <col style={{ width: '56px' }} />}
                                  </colgroup>
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden">✓</th>}
                                      {SUB_TABLE_COLS.slab.map(col => {
                                        const isResizingThis = resizingSubCol?.table === 'slab' && resizingSubCol?.col === col.key;
                                        return (
                                          <th
                                            key={col.key}
                                            className={`p-2 border-r border-slate-300 relative group/subcol select-none ${col.headerClass}`}
                                          >
                                            <span className="block truncate pr-1" title={col.label}>
                                              {col.label}
                                            </span>
                                            <div
                                              role="separator"
                                              aria-orientation="vertical"
                                              title="Drag to resize column (double-click to reset)"
                                              onMouseDown={e => startSubColResize('slab', col.key, e)}
                                              onDoubleClick={() => resetSubColWidth('slab', col.key)}
                                              className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                                                isResizingThis ? 'bg-indigo-500/30' : 'hover:bg-indigo-400/20'
                                              }`}
                                            >
                                              <span
                                                className={`w-[2px] h-3.5 rounded-full transition-colors ${
                                                  isResizingThis ? 'bg-indigo-600 h-full' : 'bg-transparent group-hover/subcol:bg-indigo-500/80'
                                                }`}
                                              />
                                            </div>
                                          </th>
                                        );
                                      })}
                                      {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {slabActivities.length > 0 ? (
                                      slabActivities.map((act, actIdx) => {
                                        const loc = act.slabCulvertLocation || act.startStationKm || 'Km 197+200';
                                        const activeStage = act.slabCulvertSelectedStage || 'Excavation & Footing';
                                        const exc = act.slabExcavationPct ?? 100;
                                        const abt = act.slabAbutmentPct ?? 100;
                                        const dck = act.slabDeckPct ?? 100;
                                        const wng = act.slabWingwallsPct ?? 100;
                                        const ptc = act.slabPitchingPct ?? 100;
                                        const bck = act.slabBackfillPct ?? 100;
                                        const toDateCalculated = Math.round((exc + abt + dck + wng + ptc + bck) / 6);
                                        const toDateVal = act.pipeToDatePct !== undefined ? act.pipeToDatePct : toDateCalculated;

                                        return (
                                          <tr key={`slab-${act.id}-${actIdx}`} className="hover:bg-indigo-50/30 transition border-b border-slate-200 text-xs text-slate-800">
                                            {isBulkEditMode && (
                                              <td className="p-1.5 text-center border-r border-slate-200 print:hidden">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedRowIds.includes(act.id)}
                                                  onChange={() => handleToggleSelectRow(act.id)}
                                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                              </td>
                                            )}

                                            {/* Location */}
                                            <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-900 bg-slate-50/50">
                                              <input
                                                value={act.slabCulvertLocation || loc}
                                                onChange={e => handleCellUpdate(act.id, 'slabCulvertLocation', e.target.value)}
                                                className="w-full bg-transparent font-medium text-slate-900 outline-none hover:bg-white focus:bg-white rounded px-1 transition"
                                              />
                                            </td>

                                            {/* Selected Stage (Today) Dropdown */}
                                            <td className="p-1 border-r border-slate-200 bg-indigo-50/60 text-center">
                                              <select
                                                value={activeStage}
                                                onChange={e => {
                                                  const newStg = e.target.value as SlabCulvertStage;
                                                  handleCellUpdate(act.id, 'slabCulvertSelectedStage', newStg);
                                                }}
                                                className="w-full bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-900 shadow-xs cursor-pointer focus:outline-indigo-500"
                                              >
                                                {SLAB_CULVERT_STAGES.map(st => (
                                                  <option key={st} value={st}>{st}</option>
                                                ))}
                                              </select>
                                            </td>

                                            {/* 1. Excavation & Footing */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Excavation & Footing' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={exc}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabExcavationPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 2. Abutment Walls */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Abutment Walls' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={abt}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabAbutmentPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 3. RC Deck Slab */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'RC Deck Slab' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={dck}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabDeckPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 4. Wingwalls & Parapet */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Wingwalls & Parapet' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={wng}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabWingwallsPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 5. Bed Pitching */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Bed Pitching' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={ptc}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabPitchingPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 6. Backfill */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Backfill' ? 'bg-indigo-100/70 ring-1 ring-indigo-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={bck}
                                                onChange={e => handleUpdateSlabStageCell(act.id, 'slabBackfillPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* Previous */}
                                            <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                              <input
                                                type="number"
                                                value={act.pipePreviousPct ?? 50}
                                                onChange={e => handleCellUpdate(act.id, 'pipePreviousPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-slate-500 font-medium outline-none"
                                              />%
                                            </td>

                                            {/* Daily Progress */}
                                            <td className="p-1 border-r border-slate-200 text-center text-indigo-700 font-bold">
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={act.pipeDailyProgressPct ?? 0}
                                                onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-indigo-700 font-bold outline-none"
                                              />%
                                            </td>

                                            {/* To Date */}
                                            <td className="p-1 border-r border-slate-200 text-center text-rose-700 font-black bg-rose-50/30">
                                              {toDateVal}%
                                            </td>

                                            {/* Daily Executed (No.) */}
                                            <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm || '')}
                                                onChange={e => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  handleCellUpdate(act.id, 'quantityExecuted', val);
                                                  handleCellUpdate(act.id, 'metricKm', val);
                                                }}
                                                placeholder="0.00"
                                                className="w-14 text-center bg-transparent font-mono font-bold text-slate-900 outline-none"
                                              />
                                            </td>

                                            {/* Delete Action */}
                                            {!isReadonly && (
                                              <td className="p-1 text-center print:hidden">
                                                <button
                                                  onClick={() => handleDeleteRow(act.id)}
                                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                                                  title="Delete this slab culvert row"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                                          No slab culvert records for {slabFilterStage === 'ALL' ? 'this date' : `stage: ${slabFilterStage}`}. Use the bar above to record progress or click "Populate Standard Slab Culverts".
                                        </td>
                                      </tr>
                                    )}

                                    {/* Subtotal / Summary Row */}
                                    {secActivities.length > 0 && (
                                      <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                                        {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                                        <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                                          Total ({secActivities.length} Structures)
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-normal">
                                          Averages:
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgExc}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgAbt}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgDck}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgWng}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgPtc}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgBck}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-semibold">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-indigo-700 font-bold">0.00%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-rose-700 font-black">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                                          {totalKm.toFixed(3)} No.
                                        </td>
                                        {!isReadonly && (
                                          <td className="p-1.5 text-center print:hidden">
                                            <button
                                              onClick={() => handleClearSectionEntries(sec.id)}
                                              className="text-[10px] text-rose-500 hover:text-rose-700 font-normal underline"
                                            >
                                              Clear
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // SPECIALIZED RENDERING FOR SECTION 17: BRIDGE CONSTRUCTION
                    if (sec.id === '17' || (sec.id === '15' && (sec.name.toLowerCase().includes('bridge') || !sec.name.toLowerCase().includes('box'))) || (sec.name.toLowerCase().includes('bridge') && !sec.name.toLowerCase().includes('culvert'))) {
                      const bridgeActivities = secActivities.filter(a => {
                        if (bridgeFilterStage === 'ALL') return true;
                        return a.bridgeSelectedStage === bridgeFilterStage;
                      });

                      const count = secActivities.length;
                      const avgFnd = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeFoundationPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgAbt = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeAbutmentPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgPer = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgePierPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgGdr = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeGirderPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgSlb = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgApp = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeApproachPct ?? 100), 0) / count).toFixed(1) : '0.0';
                      const avgToDate = count > 0 ? (secActivities.reduce((acc, a) => acc + (a.bridgeToDate ?? 100), 0) / count).toFixed(1) : '0.0';
                      const totalKm = secActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

                      return (
                        <tr key={`sec_bridge_${sec.id}_${secIdx}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? (isReadonly ? 12 : 13) : (isReadonly ? 11 : 12)} className="p-0">
                            <div className="bg-white border-y-2 border-amber-600/30">
                              
                              {/* 17. Bridge Construction Header */}
                              <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="bg-amber-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                                    Bridge Structures Sub-Register
                                  </span>
                                  <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                                    <span>17. Bridge Construction (Major Crossings & River Overpasses)</span>
                                  </h4>
                                  <span className="text-amber-200 text-xs font-normal">
                                    ({secActivities.length} bridge structures active)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 print:hidden">
                                  {/* Hide/Show View Toggle */}
                                  <button
                                    onClick={() => toggleStructureVisibility('bridge')}
                                    className="bg-amber-800/90 hover:bg-amber-700 text-amber-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-amber-600/60 shadow-xs transition"
                                    title={hiddenStructureViews.bridge ? "Expand Bridge Construction View" : "Hide Bridge Construction View"}
                                  >
                                    {hiddenStructureViews.bridge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    <span>{hiddenStructureViews.bridge ? "Show View" : "Hide View"}</span>
                                    {hiddenStructureViews.bridge ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                  </button>

                                  {!isReadonly && (
                                    <>
                                      <button
                                        onClick={() => handleAddRowAt(sec.id)}
                                        className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                        title="Add new bridge structure"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add Bridge</span>
                                      </button>

                                      <button
                                        onClick={handlePopulateEraBridgeLocations}
                                        className="bg-amber-800 hover:bg-amber-700 text-amber-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-amber-700 transition"
                                        title="Load standard ERA bridge structures"
                                      >
                                        <RotateCcw className="w-3 h-3 text-amber-300" />
                                        <span>Populate Standard Bridges</span>
                                      </button>

                                      <button 
                                        onClick={() => handleDeleteSection(sec.id)}
                                        className="text-amber-300 hover:text-rose-300 p-1 rounded"
                                        title="Delete Bridge Construction Section"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* If Hidden: Compact Collapsible Summary Bar */}
                              {hiddenStructureViews.bridge ? (
                                <div 
                                  onClick={() => toggleStructureVisibility('bridge')}
                                  className="bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-amber-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    <span className="text-xs font-bold text-amber-950">
                                      Bridge View Hidden ({secActivities.length} Structures)
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="bg-white border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-amber-800">
                                        Avg To-Date: {avgToDate}%
                                      </span>
                                      <span className="bg-white border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                                        Total Extent: {totalKm.toFixed(3)} km
                                      </span>
                                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                                        [ Fnd: {avgFnd}% | Abt: {avgAbt}% | Pier: {avgPer}% | Girder: {avgGdr}% | Slab: {avgSlb}% | Approach: {avgApp}% ]
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-amber-700 font-semibold flex items-center gap-1 print:hidden">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Click to Expand Table</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* STAGE SELECTION TOOLBAR FOR BRIDGES */}
                                  <div className="bg-amber-50/70 border-b border-amber-200 p-3 print:hidden">
                                <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-xs space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                                      <span className="text-xs font-bold text-slate-900">
                                        Select Bridge Location & Specific Construction Stage:
                                      </span>
                                      <span className="text-[11px] text-amber-900 font-semibold">
                                        [ Foundation, Abutment, Pier, Box girder / T-girder, Slab, Approach & Bearings ]
                                      </span>
                                    </div>

                                    {/* Stage Filter Pills */}
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3" /> Filter:
                                      </span>
                                      <button
                                        onClick={() => setBridgeFilterStage('ALL')}
                                        className={`px-2 py-0.5 rounded font-medium transition ${bridgeFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      >
                                        All ({secActivities.length})
                                      </button>
                                      {BRIDGE_CONSTRUCTION_STAGES.map(st => {
                                        const stCount = secActivities.filter(a => a.bridgeSelectedStage === st).length;
                                        return (
                                          <button
                                            key={st}
                                            onClick={() => setBridgeFilterStage(st)}
                                            className={`px-2 py-0.5 rounded font-medium transition ${bridgeFilterStage === st ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                          >
                                            {st} {stCount > 0 ? `(${stCount})` : ''}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Quick Action Input Row */}
                                  {!isReadonly && (
                                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                      {/* Location Selector */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Bridge Location:</span>
                                        <select
                                          value={selectedBridgeLocation}
                                          onChange={e => {
                                            setSelectedBridgeLocation(e.target.value);
                                            setCustomBridgeLocation('');
                                          }}
                                          className="bg-transparent font-medium text-slate-900 outline-none text-xs cursor-pointer max-w-xs truncate"
                                        >
                                          {Array.from(new Set([...PRESET_BRIDGE_LOCATIONS, ...secActivities.map(a => a.bridgeLocation || a.startStationKm).filter(Boolean)])).map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                          ))}
                                        </select>
                                        <input
                                          value={customBridgeLocation}
                                          onChange={e => setCustomBridgeLocation(e.target.value)}
                                          placeholder="or custom km..."
                                          className="w-28 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-amber-500"
                                        />
                                      </div>

                                      {/* Stage Selector */}
                                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-amber-900 uppercase">Stage:</span>
                                        <select
                                          value={selectedBridgeStage}
                                          onChange={e => setSelectedBridgeStage(e.target.value as BridgeConstructionStage)}
                                          className="bg-transparent font-bold text-amber-900 outline-none text-xs cursor-pointer"
                                        >
                                          {BRIDGE_CONSTRUCTION_STAGES.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Stage Progress % */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Progress:</span>
                                        <div className="flex items-center gap-1">
                                          {[25, 50, 75, 90, 100].map(val => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setSelectedBridgeStagePct(val)}
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${selectedBridgeStagePct === val ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                            >
                                              {val}%
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={selectedBridgeStagePct}
                                          onChange={e => setSelectedBridgeStagePct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                          className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-amber-800 outline-none"
                                        />
                                        <span className="font-bold text-slate-600">%</span>
                                      </div>

                                      {/* Daily Executed (No.) */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={selectedBridgeStageKm}
                                          onChange={e => setSelectedBridgeStageKm(parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                                        />
                                        <span className="text-slate-500 text-[10px]">No.</span>
                                      </div>

                                      {/* Apply Button */}
                                      <button
                                        onClick={handleApplyBridgeStageUpdate}
                                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1 ml-auto"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Record / Update Stage</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* DEDICATED BRIDGE TABLE */}
                              <div className="overflow-x-auto">
                                <table
                                  className="min-w-full table-fixed text-xs text-left border-collapse"
                                  style={{ width: `${getSubTableTotalWidth('bridge')}px` }}
                                >
                                  <colgroup>
                                    {isBulkEditMode && <col style={{ width: '32px' }} />}
                                    {SUB_TABLE_COLS.bridge.map(col => (
                                      <col key={col.key} style={{ width: `${subTableColWidths.bridge[col.key] || col.defaultWidth}px` }} />
                                    ))}
                                    {!isReadonly && <col style={{ width: '56px' }} />}
                                  </colgroup>
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden">✓</th>}
                                      {SUB_TABLE_COLS.bridge.map(col => {
                                        const isResizingThis = resizingSubCol?.table === 'bridge' && resizingSubCol?.col === col.key;
                                        return (
                                          <th
                                            key={col.key}
                                            className={`p-2 border-r border-slate-300 relative group/subcol select-none ${col.headerClass}`}
                                          >
                                            <span className="block truncate pr-1" title={col.label}>
                                              {col.label}
                                            </span>
                                            <div
                                              role="separator"
                                              aria-orientation="vertical"
                                              title="Drag to resize column (double-click to reset)"
                                              onMouseDown={e => startSubColResize('bridge', col.key, e)}
                                              onDoubleClick={() => resetSubColWidth('bridge', col.key)}
                                              className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                                                isResizingThis ? 'bg-amber-500/30' : 'hover:bg-amber-400/20'
                                              }`}
                                            >
                                              <span
                                                className={`w-[2px] h-3.5 rounded-full transition-colors ${
                                                  isResizingThis ? 'bg-amber-600 h-full' : 'bg-transparent group-hover/subcol:bg-amber-500/80'
                                                }`}
                                              />
                                            </div>
                                          </th>
                                        );
                                      })}
                                      {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {bridgeActivities.length > 0 ? (
                                      bridgeActivities.map((act, actIdx) => {
                                        const loc = act.bridgeLocation || act.startStationKm || 'Bridge Structure';
                                        const activeStage = act.bridgeSelectedStage || 'Foundation';
                                        const fnd = act.bridgeFoundationPct ?? 100;
                                        const abt = act.bridgeAbutmentPct ?? 100;
                                        const per = act.bridgePierPct ?? 100;
                                        const gdr = act.bridgeGirderPct ?? 100;
                                        const slb = act.bridgeSlabPct ?? 100;
                                        const app = act.bridgeApproachPct ?? 100;
                                        const toDateCalculated = Math.round((fnd + abt + per + gdr + slb + app) / 6);
                                        const toDateVal = act.bridgeToDate !== undefined ? act.bridgeToDate : toDateCalculated;

                                        return (
                                          <tr key={`bridge-${act.id}-${actIdx}`} className="hover:bg-amber-50/30 transition border-b border-slate-200 text-xs text-slate-800">
                                            {isBulkEditMode && (
                                              <td className="p-1.5 text-center border-r border-slate-200 print:hidden">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedRowIds.includes(act.id)}
                                                  onChange={() => handleToggleSelectRow(act.id)}
                                                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                />
                                              </td>
                                            )}

                                            {/* Location */}
                                            <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-900 bg-slate-50/50">
                                              <input
                                                value={act.bridgeLocation || loc}
                                                onChange={e => handleCellUpdate(act.id, 'bridgeLocation', e.target.value)}
                                                className="w-full bg-transparent font-medium text-slate-900 outline-none hover:bg-white focus:bg-white rounded px-1 transition"
                                              />
                                            </td>

                                            {/* Selected Stage (Today) Dropdown */}
                                            <td className="p-1 border-r border-slate-200 bg-amber-50/60 text-center">
                                              <select
                                                value={activeStage}
                                                onChange={e => {
                                                  const newStg = e.target.value as BridgeConstructionStage;
                                                  handleCellUpdate(act.id, 'bridgeSelectedStage', newStg);
                                                }}
                                                className="w-full bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-xs cursor-pointer focus:outline-amber-500"
                                              >
                                                {BRIDGE_CONSTRUCTION_STAGES.map(st => (
                                                  <option key={st} value={st}>{st}</option>
                                                ))}
                                              </select>
                                            </td>

                                            {/* 1. Foundation */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Foundation' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={fnd}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeFoundationPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 2. Abutment */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Abutment' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={abt}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeAbutmentPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 3. Pier */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Pier' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={per}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgePierPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 4. Box girder / T-girder */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Box girder / T-girder' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={gdr}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeGirderPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 5. Slab */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Slab' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={slb}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeSlabPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* 6. Approach & Bearings */}
                                            <td className={`p-1 border-r border-slate-200 text-center transition ${activeStage === 'Approach & Bearings' ? 'bg-amber-100/70 ring-1 ring-amber-300 font-bold' : ''}`}>
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={app}
                                                onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeApproachPct', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none focus:bg-white"
                                              />%
                                            </td>

                                            {/* Previous */}
                                            <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                              <input
                                                type="number"
                                                value={act.bridgePrevious ?? 60}
                                                onChange={e => handleCellUpdate(act.id, 'bridgePrevious', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-slate-500 font-medium outline-none"
                                              />%
                                            </td>

                                            {/* Daily Progress */}
                                            <td className="p-1 border-r border-slate-200 text-center text-amber-700 font-bold">
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={act.bridgeDailyProgress ?? 0}
                                                onChange={e => handleCellUpdate(act.id, 'bridgeDailyProgress', parseFloat(e.target.value) || 0)}
                                                className="w-12 text-center bg-transparent text-amber-700 font-bold outline-none"
                                              />%
                                            </td>

                                            {/* To Date */}
                                            <td className="p-1 border-r border-slate-200 text-center text-rose-700 font-black bg-rose-50/30">
                                              {toDateVal}%
                                            </td>

                                            {/* Daily Executed (No.) */}
                                            <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm || '')}
                                                onChange={e => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  handleCellUpdate(act.id, 'quantityExecuted', val);
                                                  handleCellUpdate(act.id, 'metricKm', val);
                                                }}
                                                placeholder="0.00"
                                                className="w-14 text-center bg-transparent font-mono font-bold text-slate-900 outline-none"
                                              />
                                            </td>

                                            {/* Delete Action */}
                                            {!isReadonly && (
                                              <td className="p-1 text-center print:hidden">
                                                <button
                                                  onClick={() => handleDeleteRow(act.id)}
                                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                                                  title="Delete this bridge row"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                                          No bridge records for {bridgeFilterStage === 'ALL' ? 'this date' : `stage: ${bridgeFilterStage}`}. Use the bar above to record progress or click "Populate Standard Bridges".
                                        </td>
                                      </tr>
                                    )}

                                    {/* Subtotal / Summary Row */}
                                    {secActivities.length > 0 && (
                                      <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                                        {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                                        <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                                          Total ({secActivities.length} Structures)
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-normal">
                                          Averages:
                                        </td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgFnd}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgAbt}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgPer}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgGdr}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgSlb}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-700">{avgApp}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-500 font-semibold">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-amber-700 font-bold">0.00%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center text-rose-700 font-black">{avgToDate}%</td>
                                        <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                                          {totalKm.toFixed(3)} No.
                                        </td>
                                        {!isReadonly && (
                                          <td className="p-1.5 text-center print:hidden">
                                            <button
                                              onClick={() => handleClearSectionEntries(sec.id)}
                                              className="text-[10px] text-rose-500 hover:text-rose-700 font-normal underline"
                                            >
                                              Clear
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={`sec_${sec.id}_${secIdx}`}>
                        {/* Section Header Row with DELETE & ADD ENTRY controls */}
                        <tr className="bg-slate-50/70 hover:bg-slate-100/50 transition font-medium group">
                          {isBulkEditMode && <td className="p-2 border-r border-slate-200 print:hidden"></td>}
                          <td className="p-2 border-r border-slate-200 text-slate-900 font-bold" colSpan={secActivities.length > 0 ? 1 : 5}>
                            <div className="flex items-center justify-between">
                              <span className="truncate">{sec.customLabel || sec.id}. {sec.name}</span>
                              {!isReadonly && (
                                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition print:hidden">
                                  {/* Add row to this section */}
                                  <button 
                                    onClick={() => handleAddRowAt(sec.id)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-blue-50 border border-blue-200"
                                    title="Add work row to this section"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>

                                  {/* DELETE THIS ACTIVITY (AVAILABLE FOR ALL 16 AND CUSTOM) */}
                                  <button 
                                    onClick={() => handleDeleteSection(sec.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                    title={`Delete activity "${sec.name}" from report`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {secActivities.length === 0 ? (
                            <>
                              <td className="p-2 text-center text-slate-400 italic" colSpan={6}>
                                No work executed today
                              </td>
                              {!isReadonly && <td className="p-2 border-l border-slate-200 print:hidden"></td>}
                            </>
                          ) : (
                            <td colSpan={isReadonly ? 10 : 11} className="p-0"></td>
                          )}
                        </tr>

                        {/* Section Entry Rows */}
                        {secActivities.map((act, actIdx) => {
                          const currentUnit = act.unit || defaultUnit;
                          return (
                            <tr key={`act-${sec.id}-${act.id}-${actIdx}`} className={`hover:bg-slate-50 transition text-slate-800 ${selectedRowIds.includes(act.id) ? 'bg-amber-50/60' : ''}`}>
                              {isBulkEditMode && (
                                <td className="p-2 text-center border-r border-slate-200 print:hidden">
                                  <input 
                                    type="checkbox"
                                    checked={selectedRowIds.includes(act.id)}
                                    onChange={() => handleToggleSelectRow(act.id)}
                                    className="rounded cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="p-2 border-r border-slate-200 text-slate-400 text-[10px] pl-4">
                                ↳ Entry
                              </td>
                              <td className="p-1.5 border-r border-slate-200">
                                <input 
                                  value={act.description || ''} 
                                  onChange={e => handleCellUpdate(act.id, 'description', e.target.value)}
                                  placeholder="Work scope & execution description..."
                                  className="w-full bg-transparent px-1.5 py-0.5 text-xs outline-none focus:bg-white rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-200">
                                <input 
                                  value={act.startStationKm || ''} 
                                  onChange={e => handleCellUpdate(act.id, 'startStationKm', e.target.value)}
                                  placeholder="Km 210+000"
                                  className="w-full text-center bg-transparent px-1 py-0.5 text-xs font-mono outline-none focus:bg-white rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-200">
                                <select 
                                  value={act.side || 'BHS'}
                                  onChange={e => handleCellUpdate(act.id, 'side', e.target.value)}
                                  className="w-full text-center bg-transparent text-xs font-semibold outline-none cursor-pointer"
                                >
                                  <option value="BHS">BHS</option>
                                  <option value="LHS">LHS</option>
                                  <option value="RHS">RHS</option>
                                  <option value="CL">CL</option>
                                </select>
                              </td>

                              {/* SELECTABLE MEASUREMENT UNIT DROPDOWN */}
                              <td className="p-1.5 border-r border-slate-200 text-center">
                                <select 
                                  value={currentUnit}
                                  onChange={e => handleCellUpdate(act.id, 'unit', e.target.value)}
                                  className="w-full text-center bg-purple-50 text-purple-900 border border-purple-200 rounded px-1 py-0.5 font-bold text-xs outline-none cursor-pointer"
                                  title="Select Measurement Unit"
                                >
                                  {MEASUREMENT_UNITS.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-1.5 border-r border-slate-200 text-center">
                                <input 
                                  type="number"
                                  value={act.metricM || act.layerProgress || act.pcsThisDay || 0}
                                  onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value) || 0)}
                                  className="w-full text-center bg-transparent px-1 py-0.5 text-xs font-semibold outline-none focus:bg-white rounded"
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center font-medium text-slate-500">
                                {totals.previous.toFixed(2)} {currentUnit}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 text-center text-blue-700 font-bold">
                                <div className="flex items-center justify-center gap-1">
                                  <input 
                                    type="number"
                                    value={act.metricKm || act.metricM3 || act.bridgeDailyProgress || 0}
                                    onChange={e => handleCellUpdate(act.id, 'metricKm', parseFloat(e.target.value) || 0)}
                                    className="w-full min-w-0 flex-1 text-center bg-transparent px-1 py-0.5 text-xs font-bold text-blue-700 outline-none focus:bg-white rounded"
                                  />
                                  <span className="text-[10px] text-slate-400 font-normal">{currentUnit}</span>
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-600">
                                {(totals.previous + (Number(act.metricKm) || Number(act.metricM3) || 0)).toFixed(2)} {currentUnit}
                              </td>

                              {/* REMARKS & OBSERVATIONS INPUT CELL */}
                              <td className="p-1.5 border-r border-slate-200">
                                <input 
                                  value={act.remarks || ''} 
                                  onChange={e => handleCellUpdate(act.id, 'remarks', e.target.value)}
                                  placeholder="Specific remarks, notes or observations..."
                                  className="w-full bg-transparent px-1.5 py-0.5 text-xs outline-none focus:bg-white rounded text-slate-700 dark:text-slate-200"
                                />
                              </td>

                              {/* COMPLETE TOGGLE / CHECKBOX */}
                              <td className="p-2 border-r border-slate-200 text-center align-middle">
                                {(() => {
                                  const isComplete = Boolean(act.isComplete);
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleCellUpdate(act.id, 'isComplete', !isComplete)}
                                      title={isComplete ? "Marked as Complete. Click to set Pending." : "Click to mark activity as Complete"}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs ${
                                        isComplete
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                                      }`}
                                    >
                                      {isComplete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
                                      <span>{isComplete ? 'Complete' : 'Pending'}</span>
                                    </button>
                                  );
                                })()}
                              </td>

                              {!isReadonly && (
                                <td className="p-1.5 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      onClick={() => {
                                        setEditingActivity({ ...act });
                                        setIsResourceModalOpen(true);
                                      }}
                                      title="Manage Equipment"
                                      className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRow(act.id)}
                                      title="Delete Row"
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Section Total Row if entries exist */}
                        {secActivities.length > 0 && (
                          <tr className="bg-slate-50/80 font-semibold text-[11px] text-slate-700 border-b border-slate-200">
                            {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                            <td colSpan={6} className="p-1.5 pl-4 border-r border-slate-200 uppercase text-[10px] text-slate-500">
                              <div className="flex items-center justify-between">
                                <span>Total {sec.name} (Previous + Current Date)</span>
                                {!isReadonly && (
                                  <button 
                                    onClick={() => handleClearSectionEntries(sec.id)}
                                    className="text-[10px] text-rose-500 hover:text-rose-700 font-normal hover:underline print:hidden"
                                  >
                                    Clear section rows
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 text-center border-r border-slate-200 text-slate-600">
                              {totals.previous.toFixed(2)} {defaultUnit}
                            </td>
                            <td className="p-1.5 text-center border-r border-slate-200 text-blue-700 font-bold">
                              {totals.current.toFixed(2)} {defaultUnit}
                            </td>
                            <td className="p-1.5 text-center border-r border-slate-200 text-rose-600 font-bold">
                              {totals.cumulative.toFixed(2)} {defaultUnit}
                            </td>
                            {!isReadonly && <td className="p-1.5 print:hidden"></td>}
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-slate-500 space-y-2">
                        <p className="font-semibold text-xs">All activity sections have been deleted.</p>
                        <button 
                          onClick={handleRestoreAllStandardSections}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore All 16 Standard ERA Activities</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEPARATE STRUCTURE SUB-REGISTER TABLES (14. RCP Pipe, 15. Box Culvert, 16. Slab Culvert, 17. Bridge) */}
        {(activeTab === 'all' || activeTab === 'register') && (
          <SpecialStructuresStandaloneTables
            project={project}
            selectedDate={selectedDate}
            activities={activities}
            currentActivities={currentActivities}
            sections={sections}
            isReadonly={isReadonly}
            isBulkEditMode={isBulkEditMode}
            selectedRowIds={selectedRowIds}
            handleToggleSelectRow={handleToggleSelectRow}
            handleCellUpdate={handleCellUpdate}
            handleDeleteRow={handleDeleteRow}
            handleAddRowAt={handleAddRowAt}
            handleDeleteSection={handleDeleteSection}
            handleClearSectionEntries={handleClearSectionEntries}
            setEditingActivity={setEditingActivity}
            setIsResourceModalOpen={setIsResourceModalOpen}
            triggerDebouncedSave={triggerDebouncedSave}
            workRegisterActivityFilter={workRegisterActivityFilter}
            workRegisterStatusFilter={workRegisterStatusFilter}
            searchQuery={searchQuery}
            showActiveOnly={showActiveOnly}
            hiddenStructureViews={hiddenStructureViews}
            toggleStructureVisibility={toggleStructureVisibility}
            toggleAllStructuresVisibility={toggleAllStructuresVisibility}
          />
        )}

        {/* 2. PRODUCTION TABLE (PLANT & QUARRY OUTPUT - LINKED WITH LOGISTICS & RESOURCES) */}
        {(activeTab === 'all' || activeTab === 'production') && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Factory className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  2. Site & Industrial Production Table (Batching, Crushing & Precast Plants)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                  <Link2 className="w-3 h-3" />
                  Linked: Logistics & Resources ({logisticsProductionContext.targetRecord?.monthName || logisticsProductionContext.monthKey})
                </span>
              </div>
              {!isReadonly && (
                <div className="flex items-center gap-2 flex-wrap print:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      const synced = reconcileProductionListWithLogistics(productionList, project, selectedDate, { appendMissingLogisticsProduction: true });
                      setProductionList(synced);
                      scheduleResourceSync({ productionList: synced }, 'Synced Site & Industrial Production Table from Logistics & Resources');
                      setFeedbackNotice({
                        type: 'success',
                        text: `Site & Industrial Production Table synced with Logistics & Resources (${logisticsProductionContext.productionItems.length} production plants).`
                      });
                      setTimeout(() => setFeedbackNotice(null), 3500);
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                    title="Pull and synchronize production items, targets, and cumulative totals from Logistics & Resources"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sync from Logistics
                  </button>
                  <button 
                    onClick={() => {
                      const next = [...productionList, { id: 'p_' + Date.now(), facilityName: 'New Processing Unit', itemProduced: 'Aggregate / Concrete', unit: 'm³', targetOutput: 200, actualOutput: 0, previousCumulative: 0, operatingHours: 8.0, remarks: 'Active' }];
                      setProductionList(next);
                      scheduleResourceSync({ productionList: next }, 'Added plant production unit');
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 border border-purple-200 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Plant Row
                  </button>
                  {productionList.length > 0 && (
                    <button 
                      onClick={() => {
                        if (!confirm('Clear all production units from this daily table?')) return;
                        setProductionList([]);
                        scheduleResourceSync({ productionList: [] }, 'Cleared plant production table');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 cursor-pointer"
                      title="Delete all production rows"
                    >
                      Clear Table
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table
                className="min-w-full table-fixed text-xs text-left border-collapse"
                style={{ width: `${totalProdTableWidth}px` }}
              >
                <colgroup>
                  {PRODUCTION_COL_META.map(col => (
                    <col key={col.key} style={{ width: `${prodColWidths[col.key]}px` }} />
                  ))}
                  {!isReadonly && <col style={{ width: '48px' }} />}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    {[
                      { key: 'facilityName' as ProductionColKey, label: 'Facility / Plant Name', align: 'text-left' },
                      { key: 'itemProduced' as ProductionColKey, label: 'Material / Item', align: 'text-left' },
                      { key: 'unit' as ProductionColKey, label: 'Unit', align: 'text-center' },
                      { key: 'targetOutput' as ProductionColKey, label: 'Target', align: 'text-center' },
                      { key: 'actualOutput' as ProductionColKey, label: 'Actual Today', align: 'text-center text-blue-700 dark:text-blue-400' },
                      { key: 'previousCumulative' as ProductionColKey, label: 'Previous Total', align: 'text-center text-slate-500' },
                      { key: 'cumulativeToDate' as ProductionColKey, label: 'Cumulative To Date', align: 'text-center text-rose-600 font-bold' },
                      { key: 'logisticsLink' as ProductionColKey, label: 'Logistics & Resources Link', align: 'text-left text-emerald-700 dark:text-emerald-400' },
                      { key: 'operatingHours' as ProductionColKey, label: 'Hours', align: 'text-center' },
                      { key: 'remarks' as ProductionColKey, label: 'Remarks', align: 'text-left' }
                    ].map(col => (
                      <th
                        key={col.key}
                        className={`p-2.5 border-r border-slate-200 dark:border-slate-700 relative group/col select-none ${col.align}`}
                      >
                        <span className="block truncate pr-1.5" title={col.label}>
                          {col.label}
                        </span>
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          title="Drag to resize column (double-click to reset)"
                          onMouseDown={e => startProdColResize(col.key, e)}
                          onDoubleClick={() => updateProdColWidth(col.key, DEFAULT_PRODUCTION_COL_WIDTHS[col.key])}
                          className={`print:hidden absolute top-0 right-0 h-full w-2 -mr-1 cursor-col-resize z-10 flex items-center justify-center transition-colors ${
                            resizingProdCol === col.key
                              ? 'bg-indigo-500/30'
                              : 'hover:bg-indigo-400/20'
                          }`}
                        >
                          <span
                            className={`w-[2px] h-4 rounded-full transition-colors ${
                              resizingProdCol === col.key
                                ? 'bg-indigo-600 dark:bg-indigo-400 h-full'
                                : 'bg-transparent group-hover/col:bg-indigo-400/80'
                            }`}
                          />
                        </div>
                      </th>
                    ))}
                    {!isReadonly && <th className="p-2.5 text-center print:hidden">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productionList.length > 0 ? productionList.map((prod, idx) => {
                    const cumTotal = (prod.previousCumulative || 0) + (prod.actualOutput || 0);
                    const linkedLogisticsItem = prod.linkedLogisticsId
                      ? logisticsProductionContext.allItems.find(m => m.id === prod.linkedLogisticsId)
                      : undefined;
                    return (
                      <tr key={prod.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-slate-800 dark:text-slate-100">
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-medium">
                          <input 
                            value={prod.facilityName}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, facilityName: e.target.value } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant production unit');
                            }}
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded font-medium"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700">
                          <input 
                            value={prod.itemProduced}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, itemProduced: e.target.value } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant item produced');
                            }}
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center">
                          <select 
                            value={prod.unit}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, unit: e.target.value } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant unit');
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none font-bold text-xs cursor-pointer"
                          >
                            {!MEASUREMENT_UNITS.includes(prod.unit) && prod.unit && (
                              <option value={prod.unit}>{prod.unit}</option>
                            )}
                            {MEASUREMENT_UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center">
                          <input 
                            type="number"
                            value={prod.targetOutput}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, targetOutput: parseFloat(e.target.value) || 0 } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant target output');
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center text-blue-700 dark:text-blue-400 font-bold">
                          <input 
                            type="number"
                            value={prod.actualOutput}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, actualOutput: parseFloat(e.target.value) || 0 } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant actual output');
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded font-bold text-blue-700 dark:text-blue-400 tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center">
                          <input 
                            type="number"
                            value={prod.previousCumulative || 0}
                            disabled={isReadonly || Boolean(linkedLogisticsItem)}
                            title={linkedLogisticsItem ? 'Auto-synced with Logistics & Resources Total To Date' : 'Previous cumulative output'}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, previousCumulative: parseFloat(e.target.value) || 0 } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant previous cumulative');
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded text-slate-500 font-medium tabular-nums disabled:opacity-80"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-600 tabular-nums">
                          {cumTotal.toLocaleString()} {prod.unit}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-[10px]">
                          <div className="space-y-1">
                            <select
                              value={linkedLogisticsItem?.id || ''}
                              disabled={isReadonly}
                              onChange={e => {
                                const selectedId = e.target.value;
                                if (!selectedId) {
                                  const list = productionList.map((item, i) =>
                                    i === idx ? { ...item, linkedLogisticsId: '__unlinked__', linkedLogisticsCategory: undefined } : item
                                  );
                                  setProductionList(list);
                                  scheduleResourceSync({ productionList: list }, 'Unlinked plant row from Logistics & Resources');
                                  return;
                                }
                                const chosen = logisticsProductionContext.allItems.find(m => m.id === selectedId);
                                if (!chosen) return;
                                const curActual = Number(prod.actualOutput) || 0;
                                const list = productionList.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        linkedLogisticsId: chosen.id,
                                        linkedLogisticsCategory: chosen.category || 'Production',
                                        itemProduced: chosen.desc,
                                        unit: extractUnitFromLogisticsItem(chosen),
                                        targetOutput: item.targetOutput > 0 ? item.targetOutput : (chosen.monthlyTarget ? Math.max(1, Math.round(chosen.monthlyTarget / 26)) : 0),
                                        previousCumulative: Math.max(0, Number(((chosen.totalToDate || 0) - curActual).toFixed(2)))
                                      }
                                    : item
                                );
                                setProductionList(list);
                                scheduleResourceSync({ productionList: list }, `Linked plant row to Logistics item: ${chosen.desc}`);
                              }}
                              className={`w-full rounded px-1.5 py-0.5 text-[10px] font-semibold border outline-none cursor-pointer ${
                                linkedLogisticsItem
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <option value="">— Unlinked (Select Logistics Item) —</option>
                              {logisticsProductionContext.productionItems.length > 0 && (
                                <optgroup label="Own Material Production (Logistics)">
                                  {logisticsProductionContext.productionItems.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.desc} ({(m.totalToDate || 0).toLocaleString()} {extractUnitFromLogisticsItem(m)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {logisticsProductionContext.supplyItems.length > 0 && (
                                <optgroup label="Material Supply Logistics">
                                  {logisticsProductionContext.supplyItems.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.desc} ({(m.totalToDate || 0).toLocaleString()})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            {linkedLogisticsItem ? (
                              <div className="flex items-center justify-between gap-1 text-[9px] font-mono text-emerald-700 dark:text-emerald-400 px-0.5">
                                <span>Mo: {(linkedLogisticsItem.thisMonth || 0).toLocaleString()}/{(linkedLogisticsItem.monthlyTarget || 0).toLocaleString()}</span>
                                <span>Bal: {(linkedLogisticsItem.remainingBalance || 0).toLocaleString()}</span>
                              </div>
                            ) : (
                              !isReadonly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const created = createLogisticsProductionItemFromDaily(
                                      project,
                                      selectedDate,
                                      prod,
                                      currentUserObj?.email || currentUserObj?.username
                                    );
                                    const list = productionList.map((item, i) =>
                                      i === idx ? { ...item, linkedLogisticsId: created.newLogisticsId, linkedLogisticsCategory: 'Production' } : item
                                    );
                                    setProductionList(list);
                                    latestStateRef.current = { ...latestStateRef.current, productionList: list };
                                    const nowIso = new Date().toISOString();
                                    const entry = {
                                      date: selectedDate,
                                      weather,
                                      shift,
                                      dailyNotes,
                                      isNoWorkDay,
                                      noWorkReason,
                                      noWorkNotes,
                                      laborSummary: laborSummary.map(l => ({ category: l.category, count: Number(l.count) || 0 })),
                                      equipmentFleet,
                                      materialsList,
                                      productionList: list,
                                      siteChallenges,
                                      tomorrowPlans,
                                      updatedAt: nowIso,
                                      updatedBy: currentUserObj?.username || currentUserObj?.email || 'Construction Manager'
                                    };
                                    onUpdateProject(
                                      {
                                        dailySiteLogs: { ...(project.dailySiteLogs || {}), [selectedDate]: entry },
                                        monthlyResourceRecords: created.monthlyResourceRecords,
                                        materialProduction: created.materialProduction
                                      },
                                      `Created and linked Logistics production item for ${prod.itemProduced || prod.facilityName}`
                                    );
                                  }}
                                  className="text-[9px] font-bold text-purple-700 dark:text-purple-300 hover:underline px-0.5 cursor-pointer"
                                >
                                  + Push to Logistics & Resources
                                </button>
                              )
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center">
                          <input 
                            type="number"
                            value={prod.operatingHours || 8}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, operatingHours: parseFloat(e.target.value) || 0 } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant operating hours');
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700">
                          <input 
                            value={prod.remarks || ''}
                            disabled={isReadonly}
                            onChange={e => {
                              const list = productionList.map((item, i) => i === idx ? { ...item, remarks: e.target.value } : item);
                              setProductionList(list);
                              scheduleResourceSync({ productionList: list }, 'Updated plant remarks');
                            }}
                            placeholder="Remarks..."
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded text-slate-600 dark:text-slate-300"
                          />
                        </td>
                        {!isReadonly && (
                          <td className="p-1.5 text-center print:hidden">
                            <button 
                              onClick={() => {
                                const list = productionList.filter((_, i) => i !== idx);
                                setProductionList(list);
                                scheduleResourceSync({ productionList: list }, 'Removed plant production row');
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={11} className="p-3 text-center text-slate-400 italic">
                        No production units currently recorded. Click "Sync from Logistics" or "+ Add Plant Row" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SITE RESOURCES (LABOR ROSTER + EQUIPMENT FLEET + MATERIAL TRACKER - REAL-TIME SYNCED) */}
        {(activeTab === 'all' || activeTab === 'resources') && (
          <div className="space-y-4">
            {/* 3.0 Daily Labor Deployment Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">
                    3.0 Daily Labor Deployment (Site Workforce Roster)
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded tabular-nums">
                    Total Crew: {summaryStats.totalLaborCount}
                  </span>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...laborSummary, { category: 'Specialty Subcontractor Crew', count: 0 }];
                        setLaborSummary(list);
                        scheduleResourceSync({ laborSummary: list }, 'Added labor role category');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
                    >
                      + Add Role
                    </button>
                    {laborSummary.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const cleared = createDefaultLaborSummary();
                          setLaborSummary(cleared);
                          scheduleResourceSync({ laborSummary: cleared }, 'Reset daily labor headcounts to zero');
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700"
                        title="Reset labor counts"
                      >
                        Reset Counts
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Workforce Role / Category</th>
                      <th className="p-2 w-28 text-center border-r border-slate-200 dark:border-slate-700">Headcount</th>
                      <th className="p-2 w-24 text-center border-r border-slate-200 dark:border-slate-700">Share (%)</th>
                      {!isReadonly && <th className="p-2 w-10 text-center print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {laborSummary.map((lab, idx) => {
                      const pct = summaryStats.totalLaborCount > 0
                        ? Math.round(((Number(lab.count) || 0) / summaryStats.totalLaborCount) * 100)
                        : 0;
                      return (
                        <tr key={`${lab.category}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 font-medium">
                            <input
                              value={lab.category}
                              disabled={isReadonly}
                              onChange={e => {
                                const list = laborSummary.map((item, i) => i === idx ? { ...item, category: e.target.value } : item);
                                setLaborSummary(list);
                                scheduleResourceSync({ laborSummary: list }, 'Updated labor role name');
                              }}
                              className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white dark:focus:bg-slate-900 rounded text-slate-800 dark:text-slate-100 font-medium"
                            />
                          </td>
                          <td className="p-1.5 text-center border-r border-slate-200 dark:border-slate-700">
                            <input
                              type="number"
                              min={0}
                              disabled={isReadonly}
                              value={lab.count}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                const list = laborSummary.map((item, i) => i === idx ? { ...item, count: val } : item);
                                setLaborSummary(list);
                                scheduleResourceSync({ laborSummary: list }, 'Updated daily labor deployment');
                              }}
                              className="w-full text-center bg-transparent px-1 py-0.5 outline-none font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-300"
                            />
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {pct}%
                          </td>
                          {!isReadonly && (
                            <td className="p-1 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const list = laborSummary.filter((_, i) => i !== idx);
                                  setLaborSummary(list);
                                  scheduleResourceSync({ laborSummary: list }, 'Removed labor role');
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                                title="Remove role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100">
                      <td className="p-2 border-r border-slate-200 dark:border-slate-700">Total Daily Personnel on Site</td>
                      <td className="p-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
                        {summaryStats.totalLaborCount}
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono tabular-nums">
                        {summaryStats.totalLaborCount > 0 ? '100%' : '0%'}
                      </td>
                      {!isReadonly && <td className="print:hidden"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. SITE CHALLENGES & WORK PLAN FOR TOMORROW (FULLY EDITABLE & DELETABLE) */}
        {(activeTab === 'all' || activeTab === 'challenges') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Problems & Field Challenges */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">4.1 Problems &amp; Field Challenges</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => {
                        const updated = [...siteChallenges, 'New site issue or delay remark...'];
                        setSiteChallenges(updated);
                        scheduleResourceSync({ siteChallenges: updated }, 'Added site challenge');
                      }}
                      className="text-xs text-amber-800 dark:text-amber-300 hover:text-amber-950 font-medium"
                    >
                      + Add Issue
                    </button>
                    {siteChallenges.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all problems & challenges?')) return;
                          setSiteChallenges([]);
                          scheduleResourceSync({ siteChallenges: [] }, 'Cleared site challenges');
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                {siteChallenges.length > 0 ? siteChallenges.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-amber-700 w-4">{idx + 1}.</span>
                    <input 
                      value={item}
                      onChange={e => {
                        const updated = siteChallenges.map((c, i) => i === idx ? e.target.value : c);
                        setSiteChallenges(updated);
                        scheduleResourceSync({ siteChallenges: updated }, 'Updated site challenge');
                      }}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                    />
                    {!isReadonly && (
                      <button 
                        onClick={() => {
                          const updated = siteChallenges.filter((_, i) => i !== idx);
                          setSiteChallenges(updated);
                          scheduleResourceSync({ siteChallenges: updated }, 'Removed site challenge');
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded print:hidden"
                        title="Delete challenge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No field issues recorded. Site operating normally.
                  </p>
                )}
              </div>
            </div>

            {/* Work Plan for Tomorrow */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">4.2 Work Plan for Tomorrow</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => {
                        const list = [...tomorrowPlans, { id: 'pl_' + Date.now(), area: 'Km 210+000', description: 'Next scheduled activity', unit: 'm³', target: 200, remarks: 'Normal' }];
                        setTomorrowPlans(list);
                        scheduleResourceSync({ tomorrowPlans: list }, 'Added tomorrow work plan');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Plan
                    </button>
                    {tomorrowPlans.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all plans for tomorrow?')) return;
                          setTomorrowPlans([]);
                          scheduleResourceSync({ tomorrowPlans: [] }, 'Cleared tomorrow work plan');
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                {tomorrowPlans.length > 0 ? tomorrowPlans.map((pl, idx) => (
                  <div key={pl.id || idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <input 
                      value={pl.area}
                      onChange={e => {
                        const list = tomorrowPlans.map((item, i) => i === idx ? { ...item, area: e.target.value } : item);
                        setTomorrowPlans(list);
                        scheduleResourceSync({ tomorrowPlans: list }, 'Updated tomorrow plan location');
                      }}
                      placeholder="Location..."
                      className="col-span-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-800 dark:text-slate-100 font-mono text-[11px]"
                    />
                    <input 
                      value={pl.description}
                      onChange={e => {
                        const list = tomorrowPlans.map((item, i) => i === idx ? { ...item, description: e.target.value } : item);
                        setTomorrowPlans(list);
                        scheduleResourceSync({ tomorrowPlans: list }, 'Updated tomorrow plan description');
                      }}
                      placeholder="Planned work..."
                      className="col-span-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-800 dark:text-slate-100"
                    />
                    <input 
                      type="number"
                      value={pl.target}
                      onChange={e => {
                        const list = tomorrowPlans.map((item, i) => i === idx ? { ...item, target: parseFloat(e.target.value) || 0 } : item);
                        setTomorrowPlans(list);
                        scheduleResourceSync({ tomorrowPlans: list }, 'Updated tomorrow plan target');
                      }}
                      className="col-span-2 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 outline-none font-bold text-blue-700 dark:text-blue-400 tabular-nums"
                    />
                    {!isReadonly && (
                      <button 
                        onClick={() => {
                          const list = tomorrowPlans.filter((_, i) => i !== idx);
                          setTomorrowPlans(list);
                          scheduleResourceSync({ tomorrowPlans: list }, 'Removed tomorrow plan item');
                        }}
                        className="col-span-1 text-slate-400 hover:text-rose-600 p-1 rounded print:hidden"
                        title="Delete plan item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No work plans scheduled for tomorrow. Click "+ Add Plan" above.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. SIGNATURES & ENDORSEMENT */}
        <div className="grid grid-cols-2 gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs">
          <div className="space-y-2">
            <span className="text-slate-500 font-medium uppercase text-[11px] block">Prepared By:</span>
            <div className="font-bold text-slate-900">Site Engineer / Contractor Representative</div>
            <div className="text-[11px] text-slate-400">Welabu Construction SC · Verified on site</div>
          </div>
          <div className="space-y-2">
            <span className="text-slate-500 font-medium uppercase text-[11px] block">Checked & Endorsed By:</span>
            <div className="font-bold text-slate-900">{consultantRoleLabel}</div>
            <div className="text-[11px] text-slate-400">{project.consultant || 'Supervision Consultant'} · Approved</div>
          </div>
        </div>

      </div>

      {/* MODAL 1: PRINT SPECIFIC DAY DIALOG */}
      {isPrintSpecificDayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Print Daily Activities for Specific Day</h3>
              </div>
              <button onClick={() => setIsPrintSpecificDayOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Target Date to Print:</label>
                <input 
                  type="date"
                  value={printTargetDate}
                  onChange={e => setPrintTargetDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick shortcut buttons */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Quick Jump:</span>
                <button 
                  onClick={() => setPrintTargetDate(new Date().toISOString().split('T')[0])}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                >
                  Today
                </button>
                <button 
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setPrintTargetDate(d.toISOString().split('T')[0]);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                >
                  Yesterday
                </button>
                <button 
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setPrintTargetDate(d.toISOString().split('T')[0]);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                >
                  7 Days Ago
                </button>
              </div>

              {/* Target Date Snapshot */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Report Snapshot for {formatDisplayDate(printTargetDate)}:</span>
                  <span className="text-blue-600 font-mono">
                    {activities.filter(a => a.date === printTargetDate).length} Activities
                  </span>
                </div>
                <p className="text-slate-500">
                  This will generate and format the official ERA Daily Progress Report for {printTargetDate} with all recorded tasks, cumulative totals, industrial production, site fleet deployment, and signature blocks.
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 text-xs">
              <button 
                onClick={() => setIsPrintSpecificDayOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleExecutePrintForDate(printTargetDate)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report for {printTargetDate}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / MANAGE ACTIVITIES (ADD FROM 16 OR CUSTOM) */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" /> Add & Manage Activity Sections
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Add from the 16 standard ERA activities or create a custom section</p>
              </div>
              <button onClick={() => setIsAddSectionOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
              
              {/* Section 1: Reorder Active Sections */}
              <div>
                <span className="font-bold text-slate-800 uppercase text-[11px] block mb-2">
                  1. Reorder Active Sections (Move Up / Down)
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {sections.map((s, idx) => (
                    <div key={`reorder-sec-${s.id}-${idx}`} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[280px]">
                        {s.id}. {s.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveSectionUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSectionDown(idx)}
                          disabled={idx === sections.length - 1}
                          className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Standard ERA Activities Catalog */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                    <span>2. Standard ERA Activities</span>
                    {removedStandardSections.length > 0 && (
                      <span className="text-blue-600 font-semibold lowercase text-[10px]">({removedStandardSections.length} available to add)</span>
                    )}
                  </span>
                  {sections.length < WORK_SECTIONS.length && (
                    <button 
                      onClick={handleRestoreAllStandardSections}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore All ({WORK_SECTIONS.length})
                    </button>
                  )}
                </div>

                {removedStandardSections.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {removedStandardSections.map((s, sIdx) => (
                      <div key={`removed-sec-${s.id}-${sIdx}`} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/50 transition">
                        <span className="font-medium text-slate-800 truncate text-[11px]">{s.id}. {s.name}</span>
                        <button 
                          onClick={() => handleAddBackStandardSection(s)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shrink-0 ml-2 shadow-xs transition"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-800 text-[11px] flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All {WORK_SECTIONS.length} standard ERA activities are currently active in your register. You can delete any from the table header.</span>
                  </div>
                )}
              </div>

              {/* Section 3: Create Custom Activity Section */}
              <div className="border-t border-slate-200 pt-4">
                <span className="font-bold text-slate-800 uppercase text-[11px] block mb-2">
                  3. Create Custom Activity Section
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-0.5">Code / No:</label>
                    <input 
                      value={newSectionCode}
                      onChange={e => setNewSectionCode(e.target.value)}
                      placeholder={`e.g. ${sections.length + 1}`}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-0.5">Activity Title:</label>
                    <input 
                      value={newSectionName}
                      onChange={e => setNewSectionName(e.target.value)}
                      placeholder="e.g. Gabion & Retaining Wall"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex justify-end">
                  <button 
                    onClick={handleAddCustomSection}
                    disabled={!newSectionName.trim()}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs transition"
                  >
                    + Create Custom Section
                  </button>
                </div>
              </div>

            </div>

            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsAddSectionOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ROW EQUIPMENT RESOURCE MANAGER */}
      {isResourceModalOpen && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400" /> Row Resource Assignment
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Section {editingActivity.activityType} · Date: {selectedDate}</p>
              </div>
              <button onClick={() => setIsResourceModalOpen(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">Assigned Equipment:</span>
                  <button 
                    onClick={() => {
                      const list = [...(editingActivity.equipmentList || [])];
                      list.push({ id: Date.now().toString(), name: 'Excavator / Dozer', count: 1, status: 'Operating' });
                      setEditingActivity({ ...editingActivity, equipmentList: list });
                    }}
                    className="text-blue-600 font-medium"
                  >
                    + Add Equipment
                  </button>
                </div>
                <div className="space-y-2">
                  {editingActivity.equipmentList?.map((eq, i) => (
                    <div key={eq.id || i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input 
                        value={eq.name} 
                        onChange={e => {
                          const list = [...(editingActivity.equipmentList || [])];
                          list[i].name = e.target.value;
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }}
                        placeholder="Equipment name..."
                        className="flex-1 bg-white border border-slate-200 rounded px-2 py-1"
                      />
                      <input 
                        type="number"
                        value={eq.count} 
                        onChange={e => {
                          const list = [...(editingActivity.equipmentList || [])];
                          list[i].count = parseInt(e.target.value) || 0;
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }}
                        className="w-14 text-center bg-white border border-slate-200 rounded px-1 py-1 font-bold"
                      />
                      <select 
                        value={eq.status}
                        onChange={e => {
                          const list = [...(editingActivity.equipmentList || [])];
                          list[i].status = e.target.value as any;
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }}
                        className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                      >
                        <option value="Operating">Operating</option>
                        <option value="Standby">Standby</option>
                        <option value="Breakdown">Breakdown</option>
                      </select>
                      <button 
                        onClick={() => {
                          const list = editingActivity.equipmentList?.filter((_, idx) => idx !== i);
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setIsResourceModalOpen(false)} className="px-4 py-1.5 text-slate-600 font-medium">Cancel</button>
              <button 
                onClick={() => {
                  let updatedList = [...activities];
                  const idx = updatedList.findIndex(a => a.id === editingActivity.id);
                  if (idx > -1) {
                    updatedList[idx] = { ...editingActivity, updatedAt: new Date().toISOString() };
                  }
                  triggerDebouncedSave(updatedList, 'Updated resources');
                  setIsResourceModalOpen(false);
                }} 
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAILY ACTIVITY TEMPLATES */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" /> Daily Activity Templates (RCP Pipe, Box, Slab & Bridge)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Pre-fill common construction activities or save your current day's layout</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
              
              {/* Load Template Section */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2.5">
                  1. Load Activity Template into {formatDisplayDate(selectedDate)}
                </h4>
                <div className="space-y-2.5">
                  {templates.map((tpl, tplIdx) => (
                    <div key={`tpl-${tpl.id}-${tplIdx}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{tpl.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</div>
                        <div className="text-[10px] text-blue-600 font-semibold mt-1">
                          Contains {tpl.activities.length} activity items
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleLoadTemplate(tpl)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                        >
                          Load Template
                        </button>
                        {tpl.id.startsWith('tpl_custom_') && (
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete custom template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Current Day as Template Section */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2.5">
                  2. Save Current Day ({currentActivities.length} Activities) as New Template
                </h4>
                <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Template Name:</label>
                    <input
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Km 200-215 Full Structure Package"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Description / Notes:</label>
                    <input
                      value={newTemplateDesc}
                      onChange={e => setNewTemplateDesc(e.target.value)}
                      placeholder="Brief description of activities included..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveCurrentAsTemplate}
                      disabled={!newTemplateName.trim() || currentActivities.length === 0}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Current as Template</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-3 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

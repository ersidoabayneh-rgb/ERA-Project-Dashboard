import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Truck, Trash2, DownloadCloud, X, Eye, EyeOff,
  Activity, Sun, AlertTriangle, Package, ClipboardList,
  Calendar, Factory, CheckSquare, Square, Sliders, RefreshCw,
  Check, Printer, RotateCcw, Layers, Filter, CheckCircle2, FileText
} from 'lucide-react';
import {
  Project, DailyActivityRecord, User, DailyProductionItem, QtyItem
} from '../types';
import eraLogo from '../assets/logo.png';

interface DailyActivitiesViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project, actionDesc: string) => void;
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

export interface EquipmentFleetItem {
  id: string;
  name: string;
  typeCapacity: string;
  status: 'Operating' | 'Standby' | 'Breakdown' | 'Maintenance';
  workingHours: number;
  remarks: string;
}

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
  '199+700',
  '200+313',
  '200+940',
  '201+610',
  '205+702',
  '208+646',
  '209+185',
  '210+200',
  '211+101',
  '211+827',
  '212+198',
  '212+647',
  '214+297',
  '216+750',
  '217+415'
];

export const SAMPLE_ERA_PIPE_RECORDS: Partial<DailyActivityRecord>[] = [
  { pipeLocation: '199+700', pipeSelectedStage: 'Paved Water way', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 50, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 93, pipeDailyProgressPct: 0, pipeToDatePct: 93, metricKm: 0.05 },
  { pipeLocation: '200+313', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '200+940', pipeSelectedStage: 'Paved Water way', pipeExcavationPct: 100, pipeMasonryPct: 85, pipePavedWaterwayPct: 60, pipeInstallationPct: 100, pipeBackfillPct: 95, pipePreviousPct: 89, pipeDailyProgressPct: 0, pipeToDatePct: 89, metricKm: 0.0 },
  { pipeLocation: '201+610', pipeSelectedStage: 'Masonry inlet/outlet', pipeExcavationPct: 100, pipeMasonryPct: 70, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 95, pipePreviousPct: 95, pipeDailyProgressPct: 0, pipeToDatePct: 95, metricKm: 0.0 },
  { pipeLocation: '205+702', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '208+646', pipeSelectedStage: 'Pipe Installation', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '209+185', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '210+200', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '211+101', pipeSelectedStage: 'Masonry inlet/outlet', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 85, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 98, pipeDailyProgressPct: 0, pipeToDatePct: 98, metricKm: 0.0 },
  { pipeLocation: '211+827', pipeSelectedStage: 'Masonry inlet/outlet', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 85, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 98, pipeDailyProgressPct: 0, pipeToDatePct: 98, metricKm: 0.0 },
  { pipeLocation: '212+198', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '212+647', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 },
  { pipeLocation: '214+297', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 85, pipePreviousPct: 99, pipeDailyProgressPct: 0, pipeToDatePct: 99, metricKm: 0.0 },
  { pipeLocation: '216+750', pipeSelectedStage: 'Back fill', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 10, pipePreviousPct: 91, pipeDailyProgressPct: 0, pipeToDatePct: 91, metricKm: 0.0 },
  { pipeLocation: '217+415', pipeSelectedStage: 'Pipe Installation', pipeExcavationPct: 100, pipeMasonryPct: 100, pipePavedWaterwayPct: 100, pipeInstallationPct: 100, pipeBackfillPct: 100, pipePreviousPct: 100, pipeDailyProgressPct: 0, pipeToDatePct: 100, metricKm: 0.0 }
];

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
  'Bridge @ Km 198+450 (River Dermi)',
  'Bridge @ Km 204+120 (Chiri River)',
  'Bridge @ Km 215+800 (Nansebo River)',
  'Bridge @ Km 221+300 (Wabe River)'
];

export const SAMPLE_ERA_BRIDGE_RECORDS: Partial<DailyActivityRecord>[] = [
  { bridgeLocation: 'Bridge @ Km 198+450 (River Dermi)', bridgeSelectedStage: 'Box girder / T-girder', bridgeFoundationPct: 100, bridgeAbutmentPct: 100, bridgePierPct: 100, bridgeGirderPct: 75, bridgeSlabPct: 40, bridgeApproachPct: 20, bridgePrevious: 72, bridgeDailyProgress: 0.5, bridgeToDate: 72.5, metricKm: 0.02 },
  { bridgeLocation: 'Bridge @ Km 204+120 (Chiri River)', bridgeSelectedStage: 'Pier', bridgeFoundationPct: 100, bridgeAbutmentPct: 85, bridgePierPct: 60, bridgeGirderPct: 0, bridgeSlabPct: 0, bridgeApproachPct: 0, bridgePrevious: 40, bridgeDailyProgress: 0.8, bridgeToDate: 40.8, metricKm: 0.01 },
  { bridgeLocation: 'Bridge @ Km 215+800 (Nansebo River)', bridgeSelectedStage: 'Foundation', bridgeFoundationPct: 65, bridgeAbutmentPct: 0, bridgePierPct: 0, bridgeGirderPct: 0, bridgeSlabPct: 0, bridgeApproachPct: 0, bridgePrevious: 10, bridgeDailyProgress: 0.8, bridgeToDate: 10.8, metricKm: 0.0 }
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
  'Box Culvert @ Km 195+600 (2x2m)',
  'Box Culvert @ Km 202+340 (Double Cell 3x2.5m)',
  'Box Culvert @ Km 207+850 (3x3m)',
  'Box Culvert @ Km 213+420 (Triple Cell 2.5x2m)'
];

export const SAMPLE_ERA_BOX_CULVERT_RECORDS: Partial<DailyActivityRecord>[] = [
  { boxCulvertLocation: 'Box Culvert @ Km 195+600 (2x2m)', boxCulvertSelectedStage: 'Top Slab', boxExcavationPct: 100, boxBottomSlabPct: 100, boxWallsPct: 100, boxTopSlabPct: 80, boxWingwallsPct: 60, boxBackfillPct: 30, pipePreviousPct: 78, pipeDailyProgressPct: 0, pipeToDatePct: 78.3, metricKm: 0.015 },
  { boxCulvertLocation: 'Box Culvert @ Km 202+340 (Double Cell 3x2.5m)', boxCulvertSelectedStage: 'Walls & Stem', boxExcavationPct: 100, boxBottomSlabPct: 100, boxWallsPct: 70, boxTopSlabPct: 0, boxWingwallsPct: 0, boxBackfillPct: 0, pipePreviousPct: 45, pipeDailyProgressPct: 0, pipeToDatePct: 45.0, metricKm: 0.01 },
  { boxCulvertLocation: 'Box Culvert @ Km 207+850 (3x3m)', boxCulvertSelectedStage: 'Bottom Slab', boxExcavationPct: 100, boxBottomSlabPct: 85, boxWallsPct: 0, boxTopSlabPct: 0, boxWingwallsPct: 0, boxBackfillPct: 0, pipePreviousPct: 30, pipeDailyProgressPct: 0, pipeToDatePct: 30.8, metricKm: 0.0 }
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
  'Slab Culvert @ Km 197+200 (Span 4m)',
  'Slab Culvert @ Km 206+500 (Span 6m)',
  'Slab Culvert @ Km 211+350 (Span 5m)',
  'Slab Culvert @ Km 218+100 (Span 4m)'
];

export const SAMPLE_ERA_SLAB_CULVERT_RECORDS: Partial<DailyActivityRecord>[] = [
  { slabCulvertLocation: 'Slab Culvert @ Km 197+200 (Span 4m)', slabCulvertSelectedStage: 'RC Deck Slab', slabExcavationPct: 100, slabAbutmentPct: 100, slabDeckPct: 80, slabWingwallsPct: 50, slabPitchingPct: 30, slabBackfillPct: 20, pipePreviousPct: 63, pipeDailyProgressPct: 0, pipeToDatePct: 63.3, metricKm: 0.01 },
  { slabCulvertLocation: 'Slab Culvert @ Km 206+500 (Span 6m)', slabCulvertSelectedStage: 'Abutment Walls', slabExcavationPct: 100, slabAbutmentPct: 75, slabDeckPct: 0, slabWingwallsPct: 0, slabPitchingPct: 0, slabBackfillPct: 0, pipePreviousPct: 29, pipeDailyProgressPct: 0, pipeToDatePct: 29.2, metricKm: 0.005 }
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
  { id: '14', name: 'RCP Pipe Construction', isSpecial: true, metrics: [] },
  { id: '15', name: 'Box Culvert Construction', isSpecial: true, metrics: [] },
  { id: '16', name: 'Slab Culvert Construction', isSpecial: true, metrics: [] },
  { id: '17', name: 'Bridge Construction', isSpecial: true, metrics: [] },
  { id: '18', name: 'Ditch Construction', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed Stretch (m)', 'Volume(m³)', 'Net Daily Executed (km)'] }
];

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

export default function DailyActivitiesView({
  project,
  onUpdateProject,
  isReadonly = false,
}: DailyActivitiesViewProps) {
  // Activities state
  const activities = useMemo(() => Array.isArray(project.dailyActivities) ? project.dailyActivities : [], [project.dailyActivities]);

  // View States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Sunny');
  const [shift, setShift] = useState('Day Shift (Standard)');
  const [activeTab, setActiveTab] = useState<'register' | 'production' | 'resources' | 'challenges' | 'all'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Auto-Save Status: 'saved' | 'saving' | 'idle'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Bridge Construction Quick Selection & Stage Filter States
  const [selectedBridgeLocation, setSelectedBridgeLocation] = useState<string>('Bridge @ Km 198+450 (River Dermi)');
  const [customBridgeLocation, setCustomBridgeLocation] = useState<string>('');
  const [selectedBridgeStage, setSelectedBridgeStage] = useState<BridgeConstructionStage>('Foundation');
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
  const [sections, setSections] = useState<WorkRegisterSectionDef[]>(() => {
    try {
      const stored = localStorage.getItem(`era_active_sections_${project.id}`);
      if (stored) {
        const parsed: WorkRegisterSectionDef[] = JSON.parse(stored);
        const hasBox = parsed.some(s => s.id === '15' && s.name.includes('Box'));
        const hasSlab = parsed.some(s => s.id === '16' && s.name.includes('Slab'));
        const hasBridge = parsed.some(s => s.id === '17');
        if (!hasBox || !hasSlab || !hasBridge || parsed.some(s => s.id === '14.1' || s.id === '14.2')) {
          localStorage.setItem(`era_active_sections_${project.id}`, JSON.stringify(WORK_SECTIONS));
          return WORK_SECTIONS;
        }
        return parsed;
      }
    } catch {}
    return WORK_SECTIONS;
  });

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
  const [isNoWorkDay, setIsNoWorkDay] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return false;
  });

  const [noWorkReason, setNoWorkReason] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_reason_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return STANDSTILL_REASONS[0];
  });

  const [noWorkNotes, setNoWorkNotes] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_notes_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return '';
  });

  // Production Table State (Updatable, Editable, Totally Deletable)
  const [productionList, setProductionList] = useState<DailyProductionItem[]>(() => {
    try {
      const stored = localStorage.getItem(`era_production_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'p1', facilityName: 'Asphalt Plant @ Ch. 203+400', itemProduced: 'Asphalt Concrete AC 60/70', unit: 'Tons', targetOutput: 450, actualOutput: 380, previousCumulative: 14200, operatingHours: 7.5, remarks: 'Continuous run' },
      { id: 'p2', facilityName: 'Concrete Batching Plant #1', itemProduced: 'C-30 Concrete', unit: 'm³', targetOutput: 120, actualOutput: 95, previousCumulative: 3100, operatingHours: 6.0, remarks: 'Structure pour' },
      { id: 'p3', facilityName: 'Primary Stone Crusher', itemProduced: 'Crushed Base Aggregate', unit: 'm³', targetOutput: 800, actualOutput: 720, previousCumulative: 42500, operatingHours: 8.0, remarks: 'Quarry B' },
      { id: 'p4', facilityName: 'Precast RCP Yard', itemProduced: 'RCP Ø1000mm Pipes', unit: 'Pcs', targetOutput: 40, actualOutput: 35, previousCumulative: 890, operatingHours: 8.0, remarks: 'Curing chamber' },
    ];
  });

  // Equipment Fleet Deployment State (Updatable, Editable, Totally Deletable)
  const [equipmentFleet, setEquipmentFleet] = useState<EquipmentFleetItem[]>(() => {
    try {
      const stored = localStorage.getItem(`era_equipment_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'eq1', name: 'Bulldozer CAT D8R', typeCapacity: 'Heavy Earthmoving', status: 'Operating', workingHours: 8.0, remarks: 'Subgrade excavation km 213+860' },
      { id: 'eq2', name: 'Motor Grader 140K', typeCapacity: 'Blade 14ft', status: 'Operating', workingHours: 7.5, remarks: 'Base course levelling km 209' },
      { id: 'eq3', name: 'Vibratory Roller 15T', typeCapacity: 'Compaction 15 Ton', status: 'Operating', workingHours: 8.0, remarks: 'Sub-base rolling' },
      { id: 'eq4', name: 'Water Truck 18,000L', typeCapacity: '18,000 Liters', status: 'Standby', workingHours: 4.0, remarks: 'Station Camp 203+400' }
    ];
  });

  // Materials Tracker (Updatable, Editable, Totally Deletable)
  const [materialsList, setMaterialsList] = useState<Array<{ id: string; material: string; received: number; used: number; remarks: string }>>(() => {
    try {
      const stored = localStorage.getItem(`era_materials_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'm1', material: 'Portland Cement (42.5N Grade)', received: 150, used: 85, remarks: 'Messobo cement' },
      { id: 'm2', material: 'Crushed Base Aggregate (0-31.5mm)', received: 500, used: 320, remarks: 'Quarry #2' },
      { id: 'm3', material: 'Asphalt Bitumen (60/70 Penetration)', received: 40, used: 25, remarks: 'Bitumen tanks full' }
    ];
  });

  // Site Challenges & Obstructions (Updatable, Editable, Totally Deletable)
  const [siteChallenges, setSiteChallenges] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`era_challenges_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      'Traffic management & dust control along active detour km 210',
      'Shortage of water trucks hinders earthwork compaction'
    ];
  });

  // Tomorrow Work Plan (Updatable, Editable, Totally Deletable)
  const [tomorrowPlans, setTomorrowPlans] = useState<Array<{ id: string; area: string; description: string; unit: string; target: number; remarks: string }>>(() => {
    try {
      const stored = localStorage.getItem(`era_plans_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'pl1', area: 'Km 209+880 - 210+080', description: 'Mixing, Placing & Rolling Sub-Base', unit: 'm³', target: 460, remarks: '2 rollers active' },
      { id: 'pl2', area: 'Km 200+313', description: 'Pipe Installation and Backfill', unit: 'm', target: 25, remarks: 'Crane assigned' }
    ];
  });

  // Consultant label based on DB vs DBB
  const consultantRoleLabel = project.contractType === 'DBB'
    ? 'Supervision Consultant'
    : "Employer's Representative";

  // Clean up auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Debounced auto-save function
  const triggerDebouncedSave = (updatedActivities: DailyActivityRecord[], actionDesc: string) => {
    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      onUpdateProject({ ...project, dailyActivities: updatedActivities }, actionDesc);
      setSaveStatus('saved');
    }, 750);
  };

  // Date change sync
  useEffect(() => {
    try {
      const storedNoWork = localStorage.getItem(`era_no_work_${project.id}_${selectedDate}`);
      setIsNoWorkDay(storedNoWork ? JSON.parse(storedNoWork) : false);

      const storedReason = localStorage.getItem(`era_no_work_reason_${project.id}_${selectedDate}`);
      if (storedReason) setNoWorkReason(JSON.parse(storedReason));

      const storedNotes = localStorage.getItem(`era_no_work_notes_${project.id}_${selectedDate}`);
      if (storedNotes) setNoWorkNotes(JSON.parse(storedNotes));

      const storedProd = localStorage.getItem(`era_production_${project.id}_${selectedDate}`);
      if (storedProd) setProductionList(JSON.parse(storedProd));

      const storedEq = localStorage.getItem(`era_equipment_${project.id}_${selectedDate}`);
      if (storedEq) setEquipmentFleet(JSON.parse(storedEq));

      const storedMat = localStorage.getItem(`era_materials_${project.id}_${selectedDate}`);
      if (storedMat) setMaterialsList(JSON.parse(storedMat));

      const storedChall = localStorage.getItem(`era_challenges_${project.id}_${selectedDate}`);
      if (storedChall) setSiteChallenges(JSON.parse(storedChall));

      const storedPl = localStorage.getItem(`era_plans_${project.id}_${selectedDate}`);
      if (storedPl) setTomorrowPlans(JSON.parse(storedPl));

      setSelectedRowIds([]);
      setPrintTargetDate(selectedDate);
    } catch {}
  }, [selectedDate, project.id]);

  // Persist local state updates
  useEffect(() => {
    try {
      localStorage.setItem(`era_no_work_${project.id}_${selectedDate}`, JSON.stringify(isNoWorkDay));
      localStorage.setItem(`era_no_work_reason_${project.id}_${selectedDate}`, JSON.stringify(noWorkReason));
      localStorage.setItem(`era_no_work_notes_${project.id}_${selectedDate}`, JSON.stringify(noWorkNotes));
      localStorage.setItem(`era_production_${project.id}_${selectedDate}`, JSON.stringify(productionList));
      localStorage.setItem(`era_equipment_${project.id}_${selectedDate}`, JSON.stringify(equipmentFleet));
      localStorage.setItem(`era_materials_${project.id}_${selectedDate}`, JSON.stringify(materialsList));
      localStorage.setItem(`era_challenges_${project.id}_${selectedDate}`, JSON.stringify(siteChallenges));
      localStorage.setItem(`era_plans_${project.id}_${selectedDate}`, JSON.stringify(tomorrowPlans));
      localStorage.setItem(`era_active_sections_${project.id}`, JSON.stringify(sections));
    } catch {}
  }, [isNoWorkDay, noWorkReason, noWorkNotes, productionList, equipmentFleet, materialsList, siteChallenges, tomorrowPlans, sections, project.id, selectedDate]);

  // Navigate date with Previous/Next buttons
  const handleDateNav = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + offset);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  // Day's activities
  const currentActivities = useMemo(() => {
    return activities.filter(a => a.date === selectedDate);
  }, [activities, selectedDate]);

  // Summary aggregation
  const summaryStats = useMemo(() => {
    let activeEquipment = equipmentFleet.filter(eq => eq.status === 'Operating').length;
    let standbyEquipment = equipmentFleet.filter(eq => eq.status === 'Standby').length;
    let breakdownEquipment = equipmentFleet.filter(eq => eq.status === 'Breakdown' || eq.status === 'Maintenance').length;

    return {
      activeEquipment,
      standbyEquipment,
      breakdownEquipment,
      totalFleet: equipmentFleet.length,
      totalActivities: currentActivities.length,
      totalProductionUnits: productionList.length
    };
  }, [equipmentFleet, currentActivities, productionList]);

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
      if (['1','2','6','7','8','9','10','11','12','16'].includes(sectionId)) {
        curVal += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        curVal += Number(a.metricM3) || 0;
      } else if (sectionId === '13') {
        curVal += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '15') {
        curVal += Number(a.bridgeDailyProgress) || 0;
      } else {
        curVal += Number(a.metricKm) || 0;
      }
    });

    prevActs.forEach(a => {
      if (['1','2','6','7','8','9','10','11','12','16'].includes(sectionId)) {
        prevVal += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        prevVal += Number(a.metricM3) || 0;
      } else if (sectionId === '13') {
        prevVal += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '15') {
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

  // ADD BACK AN ACTIVITY FROM THE EXISTING 16 STANDARD ACTIVITIES
  const handleAddBackStandardSection = (sec: WorkRegisterSectionDef) => {
    const updated = [...sections, sec].sort((a, b) => {
      const numA = parseFloat(a.id) || 99;
      const numB = parseFloat(b.id) || 99;
      return numA - numB;
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

  const handleClearSectionEntries = (sectionId: string) => {
    if (!confirm(`Clear all entries for section ${sectionId} on ${selectedDate}?`)) return;
    const updated = activities.filter(a => !(a.date === selectedDate && a.activityType === sectionId));
    triggerDebouncedSave(updated, `Cleared entries for section ${sectionId}`);
  };

  // Cell Update with Debounced Auto-Save
  const handleCellUpdate = (id: string, field: keyof DailyActivityRecord, value: any) => {
    const updated = activities.map(a => {
      if (a.id === id) {
        let newAct = { ...a, [field]: value, updatedAt: new Date().toISOString() };
        if (field === 'metricM' && (['1', '2', '6', '7', '8', '9', '10', '11', '12', '16'].includes(a.activityType))) {
           newAct.metricKm = (parseFloat(value) || 0) / 1000;
        }
        if (field === 'metricKm' && (['1', '2', '10', '11', '12'].includes(a.activityType))) {
           newAct.metricM = (parseFloat(value) || 0) * 1000;
        }
        return newAct;
      }
      return a;
    });
    triggerDebouncedSave(updated, `Updated ${field}`);
  };

  const handleAddCustomSection = () => {
    if (!newSectionName.trim()) return;
    const code = newSectionCode.trim() || `${sections.length + 1}`;
    const newSec: WorkRegisterSectionDef = {
      id: code,
      name: newSectionName.trim(),
      metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Progress', 'Daily Executed (m)', 'Net Daily Executed (km)'],
      isCustom: true
    };
    setSections([...sections, newSec]);
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
    setSelectedDate(dateToPrint);
    setIsPrintSpecificDayOpen(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleExportCSV = () => {
    const headers = ['Section ID', 'Activity Name', 'Description', 'Station / Location', 'Side', 'Unit', 'Daily Qty', 'Previous Total', 'Daily Executed', 'To Date Progress (%)', 'Status'];
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
      alert('No activities recorded on this date to save as a template.');
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
    alert(`Template "${newTpl.name}" successfully saved!`);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-3 md:p-6 print:p-0 print:bg-white relative">
      
      {/* SUBTLE CORNER AUTO-SAVE INDICATOR */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 print:hidden pointer-events-none">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/95 backdrop-blur border border-amber-300 px-3 py-1.5 rounded-full shadow-lg font-medium animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Saving changes...</span>
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/95 backdrop-blur border border-emerald-300 px-3 py-1.5 rounded-full shadow-lg font-medium transition-all duration-300">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saved</span>
          </span>
        )}
      </div>

      <div className="max-w-[1180px] mx-auto space-y-4">
        
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

        {/* SIMPLE TOP NAV & SUMMARY BAR */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black shrink-0 shadow-sm">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  Daily Project Progress Report
                </h1>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold border border-slate-200">
                  ERA Standard
                </span>
                {saveStatus === 'saving' ? (
                  <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3 text-emerald-600" /> Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Unified Daily Work Register, Plant Production & Site Operations</p>
            </div>
          </div>

          {/* SIMPLIFIED KPI METRIC PILLS & PRINT OPTIONS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-slate-500 text-[10px] block leading-none">Active Fleet</span>
                <span className="font-bold text-slate-900">{summaryStats.activeEquipment} / {summaryStats.totalFleet} operating</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Factory className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-slate-500 text-[10px] block leading-none">Production Units</span>
                <span className="font-bold text-slate-900">{summaryStats.totalProductionUnits} active</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-slate-500 text-[10px] block leading-none">Active Activities</span>
                <span className="font-bold text-slate-900">{sections.length} sections</span>
              </div>
            </div>

            {/* PRINT SPECIFIC DAY BUTTON */}
            <button 
              onClick={() => {
                setPrintTargetDate(selectedDate);
                setIsPrintSpecificDayOpen(true);
              }}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 text-xs transition shadow-sm"
              title="Select and Print a Specific Day"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print Specific Day</span>
            </button>

            {/* EXPORT CSV REPORT BUTTON */}
            <button 
              onClick={handleExportCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 text-xs transition shadow-sm"
              title="Export Current Weightage Progress Data as CSV"
            >
              <DownloadCloud className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {/* EXPORT PDF REPORT BUTTON */}
            <button 
              onClick={handleExportPDF}
              className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 text-xs transition shadow-sm"
              title="Export Current Progress as Formatted PDF Report"
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span>Export PDF Report</span>
            </button>

            {/* TEMPLATES BUTTON */}
            <button 
              onClick={() => setIsTemplateModalOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 text-xs transition shadow-sm"
              title="Save and Load Daily Activity Templates"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Templates ({templates.length})</span>
            </button>

            {/* VISIBLE PRINT STATUS INDICATOR */}
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg px-3 py-2 flex items-center gap-1.5 text-xs font-bold shadow-2xs" title="Verified: Tables and columns auto-scale to fit A4 page margins">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Print Status: Fit to Page (A4 Margins OK)</span>
            </div>

            {/* QUICK PRINT CURRENT DATE BUTTON */}
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-2 font-medium flex items-center gap-1.5 text-xs transition shadow-sm"
              title="Print Current Selected Date"
            >
              <DownloadCloud className="w-4 h-4 text-slate-300" />
              <span>Print DPR</span>
            </button>
          </div>
        </div>

        {/* PROMINENT CALENDAR DATE NAVIGATOR WITH PREVIOUS & NEXT BUTTONS (NO DROPDOWN NEEDED) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Previous Day Navigation Button */}
          <button 
            onClick={() => handleDateNav(-1)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 border border-slate-200"
            title="Switch to Previous Day"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>Previous Day</span>
          </button>

          {/* Center Calendar Picker with Formatted Day & Visual Date Input */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl px-3.5 py-1.5 shadow-inner transition cursor-pointer">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">
                  {formatDisplayDate(selectedDate)}
                </span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                  title="Click to open calendar date picker"
                />
              </div>
            </div>

            {/* Jump to Today shortcut */}
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                title="Jump directly to today's date"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>
            )}

            {/* Day Status Pill */}
            <button 
              onClick={() => setIsNoWorkDay(!isNoWorkDay)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition border shadow-xs ${
                isNoWorkDay 
                  ? 'bg-amber-50 text-amber-800 border-amber-300' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {isNoWorkDay ? '⚠️ Standstill Day' : '🟢 Active Work Day'}
            </button>
          </div>

          {/* Next Day Navigation Button */}
          <button 
            onClick={() => handleDateNav(1)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 border border-slate-200"
            title="Switch to Next Day"
          >
            <span>Next Day</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* EDITABLE PROJECT & CONTRACT HEADER (PRINTABLE) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-36 font-medium text-[11px]">Employer / Client:</span>
                <input 
                  value={project.client || ''} 
                  onChange={e => onUpdateProject({ ...project, client: e.target.value }, 'Updated Client')}
                  placeholder="Ethiopian Road Administration (ERA)"
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-36 font-medium text-[11px]">{consultantRoleLabel}:</span>
                <input 
                  value={project.consultant || project.supervisionConsultant?.firmName || ''} 
                  onChange={e => onUpdateProject({ 
                    ...project, 
                    consultant: e.target.value,
                    supervisionConsultant: project.supervisionConsultant ? { ...project.supervisionConsultant, firmName: e.target.value } : undefined 
                  }, 'Updated Consultant')}
                  placeholder="Associated Engineering Consultants (AEC)"
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-28 font-medium text-[11px]">Contractor:</span>
                <input 
                  value={project.contractor || ''} 
                  onChange={e => onUpdateProject({ ...project, contractor: e.target.value }, 'Updated Contractor')}
                  placeholder="Welabu Construction SC"
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-28 font-medium text-[11px]">Project Name:</span>
                <input 
                  value={project.name || ''} 
                  onChange={e => onUpdateProject({ ...project, name: e.target.value }, 'Updated Project Name')}
                  placeholder="Daye-Chiri-Nansebo Road Project"
                  className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-bold text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* WEATHER & SHIFT CONTROLS */}
          <div className="p-2.5 bg-white flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-500 font-medium">Weather:</span>
                <select 
                  value={weather} 
                  onChange={e => setWeather(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Sunny">☀️ Sunny</option>
                  <option value="Sunny & Cloudy">🌤️ Sunny & Cloudy</option>
                  <option value="Rainy">🌧️ Rainy / Wet</option>
                  <option value="Overcast">☁️ Overcast</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Shift:</span>
                <select 
                  value={shift} 
                  onChange={e => setShift(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Day Shift (Standard)">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="Extended / Overtime">Overtime</option>
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Report Date: <strong className="text-slate-900">{formatDisplayDate(selectedDate)}</strong>
            </div>
          </div>
        </div>

        {/* STANDSTILL / NO WORK DAY BANNER IF TOGGLED */}
        {isNoWorkDay && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">
                    No Construction Activity Recorded for {formatDisplayDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-amber-700">Cumulative totals are preserved to date without daily increment.</p>
                </div>
              </div>

              <button 
                onClick={() => setIsNoWorkDay(false)}
                className="text-xs bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/50 px-3 py-1.5 rounded-lg font-medium transition self-start md:self-auto"
              >
                Switch to Active Work Day
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-medium text-amber-900 mb-1">Reason for No Activity / Standstill:</label>
                <select 
                  value={noWorkReason}
                  onChange={e => setNoWorkReason(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 font-medium text-slate-800 outline-none"
                >
                  {STANDSTILL_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-900 mb-1">Observations & Site Notes:</label>
                <input 
                  value={noWorkNotes}
                  onChange={e => setNoWorkNotes(e.target.value)}
                  placeholder="Enter notes (e.g. 45mm rain recorded, site flooded)..."
                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS & BULK EDIT TRIGGER */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1 print:hidden">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Sections
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'register' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Work Register ({sections.length})
            </button>
            <button 
              onClick={() => setActiveTab('production')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'production' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Plant Production
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'resources' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Equipment & Material Fleet
            </button>
            <button 
              onClick={() => setActiveTab('challenges')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'challenges' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Site Challenges & Plan
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* BULK EDIT MODE TOGGLE BUTTON */}
            <button 
              onClick={() => {
                setIsBulkEditMode(!isBulkEditMode);
                if (isBulkEditMode) setSelectedRowIds([]);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition shadow-sm ${
                isBulkEditMode 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isBulkEditMode ? 'Exit Bulk Edit' : '⚡ Bulk Edit Mode'}</span>
            </button>

            {(activeTab === 'all' || activeTab === 'register') && (
              <button 
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                  showActiveOnly ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {showActiveOnly ? 'Active Only' : 'All Sections'}
              </button>
            )}

            {/* ADD / MANAGE ACTIVITIES FROM 16 STANDARD BUTTON */}
            {!isReadonly && (
              <button 
                onClick={() => setIsAddSectionOpen(true)}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Manage Activities</span>
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

        {/* 1. WORK REGISTER TABLE (WITH OPTION TO DELETE & ADD FROM 16 ACTIVITIES) */}
        {(activeTab === 'all' || activeTab === 'register') && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  1. ERA Work Register & Execution Summary
                </h3>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({sections.length} active activities, {currentActivities.length} recorded today)
                </span>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                {!isReadonly && (
                  <button 
                    onClick={() => setIsAddSectionOpen(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 border border-blue-200"
                    title="Add from 16 activities or create custom"
                  >
                    <Plus className="w-3 h-3" /> Add Activity
                  </button>
                )}

                {!isReadonly && currentActivities.length > 0 && (
                  <button 
                    onClick={() => {
                      if (!confirm(`Clear all activities recorded on ${selectedDate}?`)) return;
                      const updated = activities.filter(a => a.date !== selectedDate);
                      triggerDebouncedSave(updated, 'Cleared all activities for the day');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Today's Rows
                  </button>
                )}
              </div>
            </div>

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

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    {isBulkEditMode && (
                      <th className="p-2.5 w-10 text-center border-r border-slate-200 print:hidden">
                        <input 
                          type="checkbox"
                          checked={selectedRowIds.length > 0 && selectedRowIds.length === currentActivities.length}
                          onChange={handleToggleSelectAll}
                          className="rounded cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-2.5 w-48 border-r border-slate-200">Activity Section</th>
                    <th className="p-2.5 border-r border-slate-200">Description of Work</th>
                    <th className="p-2.5 w-28 text-center border-r border-slate-200">Station</th>
                    <th className="p-2.5 w-16 text-center border-r border-slate-200">Side</th>
                    <th className="p-2.5 w-20 text-center border-r border-slate-200 text-purple-700 font-bold">Unit</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200">Daily Qty</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200 text-slate-500">Previous Total</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200 text-blue-700">Daily Executed</th>
                    <th className="p-2.5 w-28 text-center border-r border-slate-200 text-rose-600 font-bold">Cumulative (To Date)</th>
                    {!isReadonly && <th className="p-2.5 w-20 text-center print:hidden">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.length > 0 ? sections.map(sec => {
                    const secActivities = currentActivities.filter(a => {
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
                    const totals = getSectionCumulativeTotals(sec.id);
                    const defaultUnit = getDefaultUnit(sec.id);

                    if (showActiveOnly && secActivities.length === 0) return null;

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
                        <tr key="sec_14" className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? 11 : 10} className="p-0">
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

                              {/* DEDICATED ERA PIPE CONSTRUCTION TABLE */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden w-8">✓</th>}
                                      <th className="p-2 border-r border-slate-300 w-28 text-center bg-slate-100">Pipe Location</th>
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-blue-100/70 text-blue-900">
                                        Selected Stage (Today)
                                      </th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Excavation</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Masonry inlet/outlet</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Paved Water way</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Pipe Installation</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Back fill</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-slate-600">Previous</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-blue-700">Daily Progress</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-rose-700">To Date</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Daily Executed (No.)</th>
                                      {!isReadonly && <th className="p-2 text-center w-14 print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {pipeActivities.length > 0 ? (
                                      pipeActivities.map(act => {
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
                                          <tr key={act.id} className="hover:bg-slate-50 transition border-b border-slate-200 text-xs text-slate-800">
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
                        <tr key={`sec_box_${sec.id}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? 11 : 10} className="p-0">
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
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden w-8">✓</th>}
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-slate-100">Box Culvert Location</th>
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-emerald-100/80 text-emerald-950 font-bold">
                                        Selected Stage (Today)
                                      </th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Excavation & Blinding</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Bottom Slab</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Walls & Stem</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Top Slab</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Wingwalls & Apron</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Backfill</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-slate-600">Previous</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-emerald-700">Daily Progress</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-rose-700">To Date</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Daily Executed (No.)</th>
                                      {!isReadonly && <th className="p-2 text-center w-14 print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {boxActivities.length > 0 ? (
                                      boxActivities.map(act => {
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
                                          <tr key={act.id} className="hover:bg-emerald-50/30 transition border-b border-slate-200 text-xs text-slate-800">
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
                        <tr key={`sec_slab_${sec.id}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? 11 : 10} className="p-0">
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
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden w-8">✓</th>}
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-slate-100">Slab Culvert Location</th>
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-indigo-100/80 text-indigo-950 font-bold">
                                        Selected Stage (Today)
                                      </th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Excavation & Footing</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Abutment Walls</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">RC Deck Slab</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Wingwalls & Parapet</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Bed Pitching</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Backfill</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-slate-600">Previous</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-indigo-700">Daily Progress</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-rose-700">To Date</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Daily Executed (No.)</th>
                                      {!isReadonly && <th className="p-2 text-center w-14 print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {slabActivities.length > 0 ? (
                                      slabActivities.map(act => {
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
                                          <tr key={act.id} className="hover:bg-indigo-50/30 transition border-b border-slate-200 text-xs text-slate-800">
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
                        <tr key={`sec_bridge_${sec.id}`} className="border-b-2 border-slate-300">
                          <td colSpan={isBulkEditMode ? 11 : 10} className="p-0">
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
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                                      {isBulkEditMode && <th className="p-2 text-center border-r border-slate-300 print:hidden w-8">✓</th>}
                                      <th className="p-2 border-r border-slate-300 w-48 text-center bg-slate-100">Bridge Location</th>
                                      <th className="p-2 border-r border-slate-300 w-44 text-center bg-amber-100/80 text-amber-950 font-bold">
                                        Selected Stage (Today)
                                      </th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Foundation</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Abutment</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Pier</th>
                                      <th className="p-2 border-r border-slate-300 w-28 text-center">Box girder / T-girder</th>
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Slab</th>
                                      <th className="p-2 border-r border-slate-300 w-28 text-center">Approach & Bearings</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-slate-600">Previous</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-amber-700">Daily Progress</th>
                                      <th className="p-2 border-r border-slate-300 w-16 text-center text-rose-700">To Date</th>
                                      <th className="p-2 border-r border-slate-300 w-24 text-center">Daily Executed (No.)</th>
                                      {!isReadonly && <th className="p-2 text-center w-14 print:hidden">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {bridgeActivities.length > 0 ? (
                                      bridgeActivities.map(act => {
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
                                          <tr key={act.id} className="hover:bg-amber-50/30 transition border-b border-slate-200 text-xs text-slate-800">
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
                      <React.Fragment key={sec.id}>
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
                              <td className="p-2 text-center text-slate-400 italic" colSpan={4}>
                                No work executed today
                              </td>
                              {!isReadonly && <td className="p-2 border-l border-slate-200 print:hidden"></td>}
                            </>
                          ) : (
                            <td colSpan={9} className="p-0"></td>
                          )}
                        </tr>

                        {/* Section Entry Rows */}
                        {secActivities.map(act => {
                          const currentUnit = act.unit || defaultUnit;
                          return (
                            <tr key={act.id} className={`hover:bg-slate-50 transition text-slate-800 ${selectedRowIds.includes(act.id) ? 'bg-amber-50/60' : ''}`}>
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
                                    className="w-16 text-center bg-transparent px-1 py-0.5 text-xs font-bold text-blue-700 outline-none focus:bg-white rounded"
                                  />
                                  <span className="text-[10px] text-slate-400 font-normal">{currentUnit}</span>
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-600">
                                {(totals.previous + (Number(act.metricKm) || Number(act.metricM3) || 0)).toFixed(2)} {currentUnit}
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

        {/* 2. PRODUCTION TABLE (PLANT & QUARRY OUTPUT - FULLY EDITABLE & DELETABLE) */}
        {(activeTab === 'all' || activeTab === 'production') && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  2. Site & Industrial Production Table (Batching, Crushing & Precast Plants)
                </h3>
              </div>
              {!isReadonly && (
                <div className="flex items-center gap-2 print:hidden">
                  <button 
                    onClick={() => setProductionList([...productionList, { id: 'p_' + Date.now(), facilityName: 'New Processing Unit', itemProduced: 'Aggregate / Concrete', unit: 'm³', targetOutput: 200, actualOutput: 150, previousCumulative: 0, operatingHours: 8.0, remarks: 'Active' }])}
                    className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 border border-purple-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Plant Row
                  </button>
                  {productionList.length > 0 && (
                    <button 
                      onClick={() => {
                        if (!confirm('Clear all production units from the table?')) return;
                        setProductionList([]);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
                      title="Delete all production rows"
                    >
                      Clear Table
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="p-2.5 border-r border-slate-200">Facility / Plant Name</th>
                    <th className="p-2.5 border-r border-slate-200">Material / Item</th>
                    <th className="p-2.5 w-20 text-center border-r border-slate-200">Unit</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200">Target</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200 text-blue-700">Actual Today</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200 text-slate-500">Previous Total</th>
                    <th className="p-2.5 w-28 text-center border-r border-slate-200 text-rose-600 font-bold">Cumulative To Date</th>
                    <th className="p-2.5 w-20 text-center border-r border-slate-200">Hours</th>
                    <th className="p-2.5 border-r border-slate-200">Remarks</th>
                    {!isReadonly && <th className="p-2.5 w-12 text-center print:hidden">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productionList.length > 0 ? productionList.map((prod, idx) => {
                    const cumTotal = (prod.previousCumulative || 0) + (prod.actualOutput || 0);
                    return (
                      <tr key={prod.id || idx} className="hover:bg-slate-50 transition text-slate-800">
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          <input 
                            value={prod.facilityName}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].facilityName = e.target.value;
                              setProductionList(list);
                            }}
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white rounded font-medium"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input 
                            value={prod.itemProduced}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].itemProduced = e.target.value;
                              setProductionList(list);
                            }}
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <select 
                            value={prod.unit}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].unit = e.target.value;
                              setProductionList(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none font-bold text-xs cursor-pointer"
                          >
                            {MEASUREMENT_UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <input 
                            type="number"
                            value={prod.targetOutput}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].targetOutput = parseFloat(e.target.value) || 0;
                              setProductionList(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center text-blue-700 font-bold">
                          <input 
                            type="number"
                            value={prod.actualOutput}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].actualOutput = parseFloat(e.target.value) || 0;
                              setProductionList(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white rounded font-bold text-blue-700"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <input 
                            type="number"
                            value={prod.previousCumulative || 0}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].previousCumulative = parseFloat(e.target.value) || 0;
                              setProductionList(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white rounded text-slate-500 font-medium"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-600">
                          {cumTotal.toLocaleString()} {prod.unit}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          <input 
                            type="number"
                            value={prod.operatingHours || 8}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].operatingHours = parseFloat(e.target.value) || 0;
                              setProductionList(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none focus:bg-white rounded"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input 
                            value={prod.remarks || ''}
                            onChange={e => {
                              const list = [...productionList];
                              list[idx].remarks = e.target.value;
                              setProductionList(list);
                            }}
                            placeholder="Remarks..."
                            className="w-full bg-transparent px-1.5 py-0.5 outline-none focus:bg-white rounded text-slate-600"
                          />
                        </td>
                        {!isReadonly && (
                          <td className="p-1.5 text-center print:hidden">
                            <button 
                              onClick={() => setProductionList(productionList.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
                      <td colSpan={10} className="p-3 text-center text-slate-400 italic">
                        No production units currently recorded. Click "+ Add Plant Row" above to add asphalt or concrete plants.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SITE RESOURCES (EQUIPMENT FLEET & MATERIAL TRACKER - FULLY EDITABLE & DELETABLE) */}
        {(activeTab === 'all' || activeTab === 'resources') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment Fleet Deployment Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase">3.1 Equipment / Machinery Fleet Deployment</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => setEquipmentFleet([...equipmentFleet, { id: 'eq_' + Date.now(), name: 'New Equipment Unit', typeCapacity: 'Standard Capacity', status: 'Operating', workingHours: 8.0, remarks: 'On active section' }])}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Fleet
                    </button>
                    {equipmentFleet.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all equipment from this list?')) return;
                          setEquipmentFleet([]);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700"
                        title="Clear all fleet items"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                      <th className="p-2 border-r border-slate-200">Equipment Name</th>
                      <th className="p-2 w-24 border-r border-slate-200">Status</th>
                      <th className="p-2 w-16 text-center border-r border-slate-200">Hours</th>
                      <th className="p-2 border-r border-slate-200">Location & Remarks</th>
                      {!isReadonly && <th className="p-2 w-8 text-center print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipmentFleet.length > 0 ? equipmentFleet.map((eq, idx) => (
                      <tr key={eq.id || idx} className="hover:bg-slate-50 transition">
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          <input 
                            value={eq.name} 
                            onChange={e => {
                              const list = [...equipmentFleet];
                              list[idx].name = e.target.value;
                              setEquipmentFleet(list);
                            }}
                            className="w-full bg-transparent px-1 py-0.5 outline-none focus:bg-white rounded font-medium text-slate-800"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <select 
                            value={eq.status}
                            onChange={e => {
                              const list = [...equipmentFleet];
                              list[idx].status = e.target.value as any;
                              setEquipmentFleet(list);
                            }}
                            className="w-full bg-transparent text-[11px] font-bold outline-none cursor-pointer"
                          >
                            <option value="Operating">🟢 Operating</option>
                            <option value="Standby">🟡 Standby</option>
                            <option value="Breakdown">🔴 Breakdown</option>
                            <option value="Maintenance">🔧 Maint.</option>
                          </select>
                        </td>
                        <td className="p-1.5 text-center border-r border-slate-200">
                          <input 
                            type="number"
                            value={eq.workingHours}
                            onChange={e => {
                              const list = [...equipmentFleet];
                              list[idx].workingHours = parseFloat(e.target.value) || 0;
                              setEquipmentFleet(list);
                            }}
                            className="w-full text-center bg-transparent px-1 py-0.5 outline-none font-medium"
                          />
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input 
                            value={eq.remarks}
                            onChange={e => {
                              const list = [...equipmentFleet];
                              list[idx].remarks = e.target.value;
                              setEquipmentFleet(list);
                            }}
                            className="w-full bg-transparent px-1 py-0.5 outline-none text-slate-600"
                            placeholder="Assignment..."
                          />
                        </td>
                        {!isReadonly && (
                          <td className="p-1 text-center print:hidden">
                            <button 
                              onClick={() => setEquipmentFleet(equipmentFleet.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400 italic">
                          No fleet equipment listed. Click "+ Add Fleet" above to add bulldozers, rollers, or trucks.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Received / Used Tracker */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase">3.2 Material Received / Used Tracker</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => setMaterialsList([...materialsList, { id: 'm_' + Date.now(), material: PRESET_MATERIALS[0], received: 100, used: 40, remarks: 'On site' }])}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      + Add Material
                    </button>
                    {materialsList.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all materials from this list?')) return;
                          setMaterialsList([]);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700"
                        title="Clear all materials"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                      <th className="p-2 border-r border-slate-200">Material</th>
                      <th className="p-2 w-16 text-center border-r border-slate-200">Received</th>
                      <th className="p-2 w-16 text-center border-r border-slate-200">Used</th>
                      <th className="p-2 w-16 text-center border-r border-slate-200 text-blue-700 font-bold">Balance</th>
                      <th className="p-2 border-r border-slate-200">Remarks</th>
                      {!isReadonly && <th className="p-2 w-8 text-center print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materialsList.length > 0 ? materialsList.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50 transition">
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          <input 
                            value={m.material}
                            onChange={e => {
                              const list = [...materialsList];
                              list[idx].material = e.target.value;
                              setMaterialsList(list);
                            }}
                            className="w-full bg-transparent px-1 py-0.5 outline-none text-slate-800 font-medium"
                          />
                        </td>
                        <td className="p-1.5 text-center border-r border-slate-200">
                          <input 
                            type="number"
                            value={m.received}
                            onChange={e => {
                              const list = [...materialsList];
                              list[idx].received = parseFloat(e.target.value) || 0;
                              setMaterialsList(list);
                            }}
                            className="w-full text-center bg-transparent outline-none font-medium"
                          />
                        </td>
                        <td className="p-1.5 text-center border-r border-slate-200">
                          <input 
                            type="number"
                            value={m.used}
                            onChange={e => {
                              const list = [...materialsList];
                              list[idx].used = parseFloat(e.target.value) || 0;
                              setMaterialsList(list);
                            }}
                            className="w-full text-center bg-transparent outline-none text-rose-600 font-medium"
                          />
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 font-bold text-blue-700">
                          {m.received - m.used}
                        </td>
                        <td className="p-1.5 border-r border-slate-200">
                          <input 
                            value={m.remarks}
                            onChange={e => {
                              const list = [...materialsList];
                              list[idx].remarks = e.target.value;
                              setMaterialsList(list);
                            }}
                            className="w-full bg-transparent outline-none text-slate-600"
                          />
                        </td>
                        {!isReadonly && (
                          <td className="p-1 text-center print:hidden">
                            <button 
                              onClick={() => setMaterialsList(materialsList.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                          No materials recorded. Click "+ Add Material" above to track cement, bitumen, or rebar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. SITE CHALLENGES & WORK PLAN FOR TOMORROW (FULLY EDITABLE & DELETABLE) */}
        {(activeTab === 'all' || activeTab === 'challenges') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Problems & Field Challenges */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-amber-50/80 border-b border-amber-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold text-amber-900 uppercase">4.1 Problems & Field Challenges</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => setSiteChallenges([...siteChallenges, 'New site issue or delay remark...'])}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium"
                    >
                      + Add Issue
                    </button>
                    {siteChallenges.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all problems & challenges?')) return;
                          setSiteChallenges([]);
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
                        const updated = [...siteChallenges];
                        updated[idx] = e.target.value;
                        setSiteChallenges(updated);
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-amber-500"
                    />
                    {!isReadonly && (
                      <button 
                        onClick={() => setSiteChallenges(siteChallenges.filter((_, i) => i !== idx))}
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase">4.2 Work Plan for Tomorrow</h3>
                </div>
                {!isReadonly && (
                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => setTomorrowPlans([...tomorrowPlans, { id: 'pl_' + Date.now(), area: 'Km 210+000', description: 'Next scheduled activity', unit: 'm³', target: 200, remarks: 'Normal' }])}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Plan
                    </button>
                    {tomorrowPlans.length > 0 && (
                      <button 
                        onClick={() => {
                          if (!confirm('Clear all plans for tomorrow?')) return;
                          setTomorrowPlans([]);
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
                        const list = [...tomorrowPlans];
                        list[idx].area = e.target.value;
                        setTomorrowPlans(list);
                      }}
                      placeholder="Location..."
                      className="col-span-4 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-800 font-mono text-[11px]"
                    />
                    <input 
                      value={pl.description}
                      onChange={e => {
                        const list = [...tomorrowPlans];
                        list[idx].description = e.target.value;
                        setTomorrowPlans(list);
                      }}
                      placeholder="Planned work..."
                      className="col-span-5 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-800"
                    />
                    <input 
                      type="number"
                      value={pl.target}
                      onChange={e => {
                        const list = [...tomorrowPlans];
                        list[idx].target = parseFloat(e.target.value) || 0;
                        setTomorrowPlans(list);
                      }}
                      className="col-span-2 text-center bg-slate-50 border border-slate-200 rounded px-1 py-1 outline-none font-bold text-blue-700"
                    />
                    {!isReadonly && (
                      <button 
                        onClick={() => setTomorrowPlans(tomorrowPlans.filter((_, i) => i !== idx))}
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
              
              {/* Section 1: Standard 16 Activities Catalog */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                    <span>1. Standard 16 ERA Activities</span>
                    {removedStandardSections.length > 0 && (
                      <span className="text-blue-600 font-semibold lowercase text-[10px]">({removedStandardSections.length} available to add)</span>
                    )}
                  </span>
                  {sections.length < WORK_SECTIONS.length && (
                    <button 
                      onClick={handleRestoreAllStandardSections}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore All 16
                    </button>
                  )}
                </div>

                {removedStandardSections.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {removedStandardSections.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/50 transition">
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
                    <span>All 16 standard ERA activities are currently active in your register. You can delete any from the table header.</span>
                  </div>
                )}
              </div>

              {/* Section 2: Create Custom Activity Section */}
              <div className="border-t border-slate-200 pt-4">
                <span className="font-bold text-slate-800 uppercase text-[11px] block mb-2">
                  2. Create Custom Activity Section
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
                  {templates.map(tpl => (
                    <div key={tpl.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

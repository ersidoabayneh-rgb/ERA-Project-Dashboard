import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Eye, EyeOff, Plus, RotateCcw, Trash2, Filter, Check,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Truck, Layers
} from 'lucide-react';
import { Project, DailyActivityRecord } from '../types';
import { WorkRegisterSectionDef } from './DailyActivitiesView';

export const PIPE_CONSTRUCTION_STAGES = [
  'Excavation',
  'Masonry inlet/outlet',
  'Paved Water way',
  'Pipe Installation',
  'Back fill'
] as const;
export type PipeConstructionStage = typeof PIPE_CONSTRUCTION_STAGES[number];

export const BOX_CULVERT_STAGES = [
  'Excavation & Blinding',
  'Bottom Slab',
  'Walls & Stem',
  'Top Slab',
  'Wingwalls & Apron',
  'Backfill'
] as const;
export type BoxCulvertStage = typeof BOX_CULVERT_STAGES[number];

export const SLAB_CULVERT_STAGES = [
  'Excavation & Footing',
  'Abutment Walls',
  'RC Deck Slab',
  'Wingwalls & Parapet',
  'Bed Pitching',
  'Backfill'
] as const;
export type SlabCulvertStage = typeof SLAB_CULVERT_STAGES[number];

export const BRIDGE_CONSTRUCTION_STAGES = [
  'Foundation',
  'Abutment',
  'Pier',
  'Box girder / T-girder',
  'Slab',
  'Approach & Bearings'
] as const;
export type BridgeConstructionStage = typeof BRIDGE_CONSTRUCTION_STAGES[number];

export const PRESET_PIPE_LOCATIONS: string[] = [];

export const PRESET_BOX_CULVERT_LOCATIONS: string[] = [];

export const PRESET_SLAB_CULVERT_LOCATIONS: string[] = [];

export const PRESET_BRIDGE_LOCATIONS: string[] = [];

export type SubTableKey = 'pipe' | 'box' | 'slab' | 'bridge';

export interface SubTableColDef {
  key: string;
  label: string;
  defaultWidth: number;
  headerClass: string;
}

export const SUB_TABLE_COLS: Record<SubTableKey, SubTableColDef[]> = {
  pipe: [
    { key: 'location', label: 'Pipe Location', defaultWidth: 128, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-blue-100/70 text-blue-900' },
    { key: 'excavation', label: 'Excavation (20%)', defaultWidth: 92, headerClass: 'text-center' },
    { key: 'masonry', label: 'Masonry (20%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'pavedWaterway', label: 'Paved Waterway (20%)', defaultWidth: 104, headerClass: 'text-center' },
    { key: 'installation', label: 'Pipe Installation (20%)', defaultWidth: 104, headerClass: 'text-center' },
    { key: 'backfill', label: 'Backfill (20%)', defaultWidth: 88, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-blue-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 80, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 112, headerClass: 'text-center' }
  ],
  box: [
    { key: 'location', label: 'Box Culvert Location', defaultWidth: 176, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-emerald-100/80 text-emerald-950 font-bold' },
    { key: 'excavation', label: 'Excavation & Blinding (16.7%)', defaultWidth: 114, headerClass: 'text-center' },
    { key: 'bottomSlab', label: 'Bottom Slab (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'walls', label: 'Walls & Stem (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'topSlab', label: 'Top Slab (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'wingwalls', label: 'Wingwalls & Apron (16.7%)', defaultWidth: 114, headerClass: 'text-center' },
    { key: 'backfill', label: 'Backfill (16.7%)', defaultWidth: 92, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-emerald-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 80, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 112, headerClass: 'text-center' }
  ],
  slab: [
    { key: 'location', label: 'Slab Culvert Location', defaultWidth: 176, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-indigo-100/80 text-indigo-950 font-bold' },
    { key: 'excavation', label: 'Excavation & Footing (16.7%)', defaultWidth: 114, headerClass: 'text-center' },
    { key: 'abutment', label: 'Abutment Walls (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'deckSlab', label: 'RC Deck Slab (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'wingwalls', label: 'Wingwalls & Parapet (16.7%)', defaultWidth: 114, headerClass: 'text-center' },
    { key: 'pitching', label: 'Bed Pitching (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'backfill', label: 'Backfill (16.7%)', defaultWidth: 92, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-indigo-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 80, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 112, headerClass: 'text-center' }
  ],
  bridge: [
    { key: 'location', label: 'Bridge Location', defaultWidth: 176, headerClass: 'text-center bg-slate-100' },
    { key: 'selectedStage', label: 'Selected Stage (Today)', defaultWidth: 176, headerClass: 'text-center bg-amber-100/80 text-amber-950 font-bold' },
    { key: 'foundation', label: 'Foundation (16.7%)', defaultWidth: 100, headerClass: 'text-center' },
    { key: 'abutment', label: 'Abutment (16.7%)', defaultWidth: 96, headerClass: 'text-center' },
    { key: 'pier', label: 'Pier (16.7%)', defaultWidth: 92, headerClass: 'text-center' },
    { key: 'girder', label: 'Box / T-girder (16.7%)', defaultWidth: 104, headerClass: 'text-center' },
    { key: 'slab', label: 'Slab (16.7%)', defaultWidth: 92, headerClass: 'text-center' },
    { key: 'approach', label: 'Approach & Bearings (16.7%)', defaultWidth: 118, headerClass: 'text-center' },
    { key: 'previous', label: 'Previous', defaultWidth: 76, headerClass: 'text-center text-slate-600' },
    { key: 'dailyProgress', label: 'Daily Progress', defaultWidth: 84, headerClass: 'text-center text-amber-700' },
    { key: 'toDate', label: 'To Date', defaultWidth: 80, headerClass: 'text-center text-rose-700' },
    { key: 'dailyExecuted', label: 'Daily Executed (No.)', defaultWidth: 112, headerClass: 'text-center' }
  ]
};

export interface StructureStageMetrics {
  stageWeight: number;
  stageWeightPct: number;
  weightedStageFractions: number[];
  toDatePct: number;
  toDateNo: number;
  previousPct: number;
  previousNo: number;
  dailyProgressPct: number;
  dailyExecutedNo: number;
}

export function computeStructureStageMetrics(
  structType: 'pipe' | 'box' | 'slab' | 'bridge',
  stages: number[],
  previousPctFallback: number = 0,
  priorRecord?: DailyActivityRecord
): StructureStageMetrics {
  const n = stages.length;
  const stageWeight = 1 / n;
  const stageWeightPct = 100 / n;

  // Each stage percentage P_i in [0, 100] is multiplied by its equal weight (1/n)
  // Stage fraction out of 1.0: (1/n) * (P_i / 100)
  const weightedStageFractions = stages.map(p => (Math.min(100, Math.max(0, p)) / 100) * stageWeight);
  const sumFractions = weightedStageFractions.reduce((acc, v) => acc + v, 0);
  const toDateNo = Math.min(1, Math.max(0, parseFloat(sumFractions.toFixed(4))));
  const toDatePct = Math.min(100, Math.max(0, Math.round((stages.reduce((acc, v) => acc + Math.min(100, Math.max(0, v)), 0)) / n)));

  let previousPct = Math.min(100, Math.max(0, previousPctFallback));
  if (priorRecord) {
    if (structType === 'pipe') {
      const pExc = priorRecord.pipeExcavationPct ?? 0;
      const pMas = priorRecord.pipeMasonryPct ?? 0;
      const pPaw = priorRecord.pipePavedWaterwayPct ?? 0;
      const pIns = priorRecord.pipeInstallationPct ?? 0;
      const pBck = priorRecord.pipeBackfillPct ?? 0;
      previousPct = priorRecord.pipeToDatePct !== undefined
        ? priorRecord.pipeToDatePct
        : Math.round((pExc + pMas + pPaw + pIns + pBck) / 5);
    } else if (structType === 'box') {
      const pExc = priorRecord.boxExcavationPct ?? 0;
      const pBtm = priorRecord.boxBottomSlabPct ?? 0;
      const pWll = priorRecord.boxWallsPct ?? 0;
      const pTop = priorRecord.boxTopSlabPct ?? 0;
      const pWng = priorRecord.boxWingwallsPct ?? 0;
      const pBck = priorRecord.boxBackfillPct ?? 0;
      previousPct = priorRecord.pipeToDatePct !== undefined
        ? priorRecord.pipeToDatePct
        : Math.round((pExc + pBtm + pWll + pTop + pWng + pBck) / 6);
    } else if (structType === 'slab') {
      const pExc = priorRecord.slabExcavationPct ?? 0;
      const pAbt = priorRecord.slabAbutmentPct ?? 0;
      const pDck = priorRecord.slabDeckPct ?? 0;
      const pWng = priorRecord.slabWingwallsPct ?? 0;
      const pPtc = priorRecord.slabPitchingPct ?? 0;
      const pBck = priorRecord.slabBackfillPct ?? 0;
      previousPct = priorRecord.pipeToDatePct !== undefined
        ? priorRecord.pipeToDatePct
        : Math.round((pExc + pAbt + pDck + pWng + pPtc + pBck) / 6);
    } else if (structType === 'bridge') {
      const pFnd = priorRecord.bridgeFoundationPct ?? 0;
      const pAbt = priorRecord.bridgeAbutmentPct ?? 0;
      const pPer = priorRecord.bridgePierPct ?? 0;
      const pGdr = priorRecord.bridgeGirderPct ?? 0;
      const pSlb = priorRecord.bridgeSlabPct ?? 0;
      const pApp = priorRecord.bridgeApproachPct ?? 0;
      previousPct = priorRecord.bridgeToDate !== undefined
        ? priorRecord.bridgeToDate
        : Math.round((pFnd + pAbt + pPer + pGdr + pSlb + pApp) / 6);
    }
  }

  const previousNo = Math.min(1, Math.max(0, parseFloat((previousPct / 100).toFixed(4))));
  const dailyProgressPct = Math.max(0, toDatePct - previousPct);
  const dailyExecutedNo = Math.max(0, parseFloat((toDateNo - previousNo).toFixed(4)));

  return {
    stageWeight,
    stageWeightPct,
    weightedStageFractions,
    toDatePct,
    toDateNo,
    previousPct,
    previousNo,
    dailyProgressPct,
    dailyExecutedNo
  };
}

export function getPreviousRecordForLocation(
  allActivities: DailyActivityRecord[],
  structType: 'pipe' | 'box' | 'slab' | 'bridge',
  location: string,
  currentDate: string
): DailyActivityRecord | undefined {
  const normLoc = (location || '').trim().toLowerCase();
  if (!normLoc) return undefined;

  const matching = allActivities.filter(a => {
    if (a.date >= currentDate) return false;
    if (structType === 'pipe') {
      if (a.activityType !== '14' && !(a.pipeLocation && !a.boxCulvertLocation && !a.slabCulvertLocation && !a.bridgeLocation)) return false;
      const l = (a.pipeLocation || a.startStationKm || '').trim().toLowerCase();
      return l === normLoc;
    }
    if (structType === 'box') {
      if (a.activityType !== '15' && a.activityType !== '14.1' && !(a.boxCulvertLocation && !a.bridgeLocation)) return false;
      const l = (a.boxCulvertLocation || a.startStationKm || '').trim().toLowerCase();
      return l === normLoc;
    }
    if (structType === 'slab') {
      if (a.activityType !== '16' && a.activityType !== '14.2' && !a.slabCulvertLocation) return false;
      const l = (a.slabCulvertLocation || a.startStationKm || '').trim().toLowerCase();
      return l === normLoc;
    }
    if (structType === 'bridge') {
      if (a.activityType !== '17' && !(a.activityType === '15' && (a.bridgeLocation || a.bridgeSelectedStage))) return false;
      const l = (a.bridgeLocation || a.startStationKm || '').trim().toLowerCase();
      return l === normLoc;
    }
    return false;
  });

  matching.sort((a, b) => b.date.localeCompare(a.date));
  return matching[0];
}

export function syncFutureDates(
  structType: 'pipe' | 'box' | 'slab' | 'bridge',
  location: string,
  fromDate: string,
  allActs: DailyActivityRecord[]
) {
  const normLoc = (location || '').trim().toLowerCase();
  if (!normLoc) return;

  const futureIndices: number[] = [];
  for (let i = 0; i < allActs.length; i++) {
    const a = allActs[i];
    if (a.date <= fromDate) continue;
    let match = false;
    if (structType === 'pipe') {
      match = (a.activityType === '14' || Boolean(a.pipeLocation && !a.boxCulvertLocation && !a.slabCulvertLocation && !a.bridgeLocation)) &&
        (a.pipeLocation || a.startStationKm || '').trim().toLowerCase() === normLoc;
    } else if (structType === 'box') {
      match = (a.activityType === '15' || a.activityType === '14.1' || Boolean(a.boxCulvertLocation && !a.bridgeLocation)) &&
        (a.boxCulvertLocation || a.startStationKm || '').trim().toLowerCase() === normLoc;
    } else if (structType === 'slab') {
      match = (a.activityType === '16' || a.activityType === '14.2' || Boolean(a.slabCulvertLocation)) &&
        (a.slabCulvertLocation || a.startStationKm || '').trim().toLowerCase() === normLoc;
    } else if (structType === 'bridge') {
      match = (a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage))) &&
        (a.bridgeLocation || a.startStationKm || '').trim().toLowerCase() === normLoc;
    }
    if (match) futureIndices.push(i);
  }

  futureIndices.sort((i1, i2) => allActs[i1].date.localeCompare(allActs[i2].date));

  for (const idx of futureIndices) {
    const curr = allActs[idx];
    const prior = getPreviousRecordForLocation(allActs, structType, location, curr.date);
    if (structType === 'pipe') {
      const exc = curr.pipeExcavationPct ?? 0;
      const mas = curr.pipeMasonryPct ?? 0;
      const paw = curr.pipePavedWaterwayPct ?? 0;
      const ins = curr.pipeInstallationPct ?? 0;
      const bck = curr.pipeBackfillPct ?? 0;
      const m = computeStructureStageMetrics('pipe', [exc, mas, paw, ins, bck], curr.pipePreviousPct ?? 0, prior);
      curr.pipePreviousPct = m.previousPct;
      curr.pipeDailyProgressPct = m.dailyProgressPct;
      curr.pipeToDatePct = m.toDatePct;
      curr.quantityExecuted = m.dailyExecutedNo;
      curr.metricKm = m.dailyExecutedNo;
    } else if (structType === 'box') {
      const exc = curr.boxExcavationPct ?? 0;
      const btm = curr.boxBottomSlabPct ?? 0;
      const wll = curr.boxWallsPct ?? 0;
      const top = curr.boxTopSlabPct ?? 0;
      const wng = curr.boxWingwallsPct ?? 0;
      const bck = curr.boxBackfillPct ?? 0;
      const m = computeStructureStageMetrics('box', [exc, btm, wll, top, wng, bck], curr.pipePreviousPct ?? 0, prior);
      curr.pipePreviousPct = m.previousPct;
      curr.pipeDailyProgressPct = m.dailyProgressPct;
      curr.pipeToDatePct = m.toDatePct;
      curr.quantityExecuted = m.dailyExecutedNo;
      curr.metricKm = m.dailyExecutedNo;
    } else if (structType === 'slab') {
      const exc = curr.slabExcavationPct ?? 0;
      const abt = curr.slabAbutmentPct ?? 0;
      const dck = curr.slabDeckPct ?? 0;
      const wng = curr.slabWingwallsPct ?? 0;
      const ptc = curr.slabPitchingPct ?? 0;
      const bck = curr.slabBackfillPct ?? 0;
      const m = computeStructureStageMetrics('slab', [exc, abt, dck, wng, ptc, bck], curr.pipePreviousPct ?? 0, prior);
      curr.pipePreviousPct = m.previousPct;
      curr.pipeDailyProgressPct = m.dailyProgressPct;
      curr.pipeToDatePct = m.toDatePct;
      curr.quantityExecuted = m.dailyExecutedNo;
      curr.metricKm = m.dailyExecutedNo;
    } else if (structType === 'bridge') {
      const fnd = curr.bridgeFoundationPct ?? 0;
      const abt = curr.bridgeAbutmentPct ?? 0;
      const per = curr.bridgePierPct ?? 0;
      const gdr = curr.bridgeGirderPct ?? 0;
      const slb = curr.bridgeSlabPct ?? 0;
      const app = curr.bridgeApproachPct ?? 0;
      const m = computeStructureStageMetrics('bridge', [fnd, abt, per, gdr, slb, app], curr.bridgePrevious ?? 0, prior);
      curr.bridgePrevious = m.previousPct;
      curr.bridgeDailyProgress = m.dailyProgressPct;
      curr.bridgeToDate = m.toDatePct;
      curr.quantityExecuted = m.dailyExecutedNo;
      curr.metricKm = m.dailyExecutedNo;
    }
  }
}

export interface SpecialStructuresStandaloneTablesProps {
  project: Project;
  selectedDate: string;
  activities: DailyActivityRecord[];
  currentActivities: DailyActivityRecord[];
  sections: WorkRegisterSectionDef[];
  isReadonly?: boolean;
  isBulkEditMode?: boolean;
  selectedRowIds: string[];
  handleToggleSelectRow: (id: string) => void;
  handleCellUpdate: (id: string, field: keyof DailyActivityRecord, value: any) => void;
  handleDeleteRow: (id: string) => void;
  handleAddRowAt: (secId: string) => void;
  handleDeleteSection: (secId: string) => void;
  handleClearSectionEntries: (secId: string) => void;
  setEditingActivity: (act: DailyActivityRecord) => void;
  setIsResourceModalOpen: (open: boolean) => void;
  triggerDebouncedSave: (updated: DailyActivityRecord[], desc: string) => void;
  workRegisterActivityFilter: string;
  workRegisterStatusFilter: string;
  searchQuery: string;
  showActiveOnly: boolean;
  hiddenStructureViews: { pipe: boolean; box: boolean; slab: boolean; bridge: boolean };
  toggleStructureVisibility: (type: 'pipe' | 'box' | 'slab' | 'bridge') => void;
  toggleAllStructuresVisibility: (hideAll: boolean) => void;
}

export const SpecialStructuresStandaloneTables: React.FC<SpecialStructuresStandaloneTablesProps> = ({
  project,
  selectedDate,
  activities,
  currentActivities,
  sections,
  isReadonly = false,
  isBulkEditMode = false,
  selectedRowIds,
  handleToggleSelectRow,
  handleCellUpdate,
  handleDeleteRow,
  handleAddRowAt,
  handleDeleteSection,
  handleClearSectionEntries,
  setEditingActivity,
  setIsResourceModalOpen,
  triggerDebouncedSave,
  workRegisterActivityFilter,
  workRegisterStatusFilter,
  searchQuery,
  showActiveOnly,
  hiddenStructureViews,
  toggleStructureVisibility,
  toggleAllStructuresVisibility
}) => {
  // Column Width Management for Sub-tables
  const [subTableColWidths, setSubTableColWidths] = useState<Record<SubTableKey, Record<string, number>>>(() => {
    try {
      const stored = localStorage.getItem(`era_work_subtable_col_widths_${project.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      pipe: Object.fromEntries(SUB_TABLE_COLS.pipe.map(c => [c.key, c.defaultWidth])),
      box: Object.fromEntries(SUB_TABLE_COLS.box.map(c => [c.key, c.defaultWidth])),
      slab: Object.fromEntries(SUB_TABLE_COLS.slab.map(c => [c.key, c.defaultWidth])),
      bridge: Object.fromEntries(SUB_TABLE_COLS.bridge.map(c => [c.key, c.defaultWidth]))
    };
  });
  const [resizingSubCol, setResizingSubCol] = useState<{ table: SubTableKey; col: string } | null>(null);
  const subResizeCleanupRef = useRef<(() => void) | null>(null);

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

  // Section 14 Pipe States
  const [pipeFilterStage, setPipeFilterStage] = useState<string>('ALL');
  const [selectedPipeLocation, setSelectedPipeLocation] = useState<string>('200+313');
  const [customPipeLocation, setCustomPipeLocation] = useState<string>('');
  const [selectedPipeStage, setSelectedPipeStage] = useState<PipeConstructionStage>('Excavation');
  const [selectedPipeStagePct, setSelectedPipeStagePct] = useState<number>(100);
  const [selectedPipeStageKm, setSelectedPipeStageKm] = useState<number>(0.20);
  const [isPipeScrollEnabled, setIsPipeScrollEnabled] = useState<boolean>(true);
  const pipeTableScrollRef = useRef<HTMLDivElement | null>(null);

  // Section 15 Box Culvert States
  const [boxFilterStage, setBoxFilterStage] = useState<string>('ALL');
  const [selectedBoxLocation, setSelectedBoxLocation] = useState<string>('Box Culvert @ Km 195+600 (2x2m)');
  const [customBoxLocation, setCustomBoxLocation] = useState<string>('');
  const [selectedBoxStage, setSelectedBoxStage] = useState<BoxCulvertStage>('Excavation & Blinding');
  const [selectedBoxStagePct, setSelectedBoxStagePct] = useState<number>(100);
  const [selectedBoxStageKm, setSelectedBoxStageKm] = useState<number>(0.1667);

  // Section 16 Slab Culvert States
  const [slabFilterStage, setSlabFilterStage] = useState<string>('ALL');
  const [selectedSlabLocation, setSelectedSlabLocation] = useState<string>('Slab Culvert @ Km 197+200 (Span 4m)');
  const [customSlabLocation, setCustomSlabLocation] = useState<string>('');
  const [selectedSlabStage, setSelectedSlabStage] = useState<SlabCulvertStage>('Excavation & Footing');
  const [selectedSlabStagePct, setSelectedSlabStagePct] = useState<number>(100);
  const [selectedSlabStageKm, setSelectedSlabStageKm] = useState<number>(0.1667);

  // Section 17 Bridge States
  const [bridgeFilterStage, setBridgeFilterStage] = useState<string>('ALL');
  const [selectedBridgeLocation, setSelectedBridgeLocation] = useState<string>('Dermi River Bridge (Km 196+400, 3-Span)');
  const [customBridgeLocation, setCustomBridgeLocation] = useState<string>('');
  const [selectedBridgeStage, setSelectedBridgeStage] = useState<BridgeConstructionStage>('Foundation');
  const [selectedBridgeStagePct, setSelectedBridgeStagePct] = useState<number>(100);
  const [selectedBridgeStageKm, setSelectedBridgeStageKm] = useState<number>(0.1667);

  // Reactive change calculations for quick toolbars:
  // Each stage has equal weightage summing to 1.000 No.; change between current day and previous is added.
  useEffect(() => {
    const loc = customPipeLocation.trim() || selectedPipeLocation || '200+313';
    const prior = getPreviousRecordForLocation(activities, 'pipe', loc, selectedDate);
    const existing = activities.find(a => a.date === selectedDate && a.activityType === '14' && (a.pipeLocation === loc || a.startStationKm === loc));
    const curExc = selectedPipeStage === 'Excavation' ? selectedPipeStagePct : (existing?.pipeExcavationPct ?? prior?.pipeExcavationPct ?? 0);
    const curMas = selectedPipeStage === 'Masonry inlet/outlet' ? selectedPipeStagePct : (existing?.pipeMasonryPct ?? prior?.pipeMasonryPct ?? 0);
    const curPaw = selectedPipeStage === 'Paved Water way' ? selectedPipeStagePct : (existing?.pipePavedWaterwayPct ?? prior?.pipePavedWaterwayPct ?? 0);
    const curIns = selectedPipeStage === 'Pipe Installation' ? selectedPipeStagePct : (existing?.pipeInstallationPct ?? prior?.pipeInstallationPct ?? 0);
    const curBck = selectedPipeStage === 'Back fill' ? selectedPipeStagePct : (existing?.pipeBackfillPct ?? prior?.pipeBackfillPct ?? 0);
    const m = computeStructureStageMetrics('pipe', [curExc, curMas, curPaw, curIns, curBck], existing?.pipePreviousPct ?? 0, prior);
    setSelectedPipeStageKm(m.dailyExecutedNo);
  }, [selectedPipeLocation, customPipeLocation, selectedPipeStage, selectedPipeStagePct, selectedDate, activities]);

  useEffect(() => {
    const loc = customBoxLocation.trim() || selectedBoxLocation || 'Box Culvert @ Km 195+600 (2x2m)';
    const prior = getPreviousRecordForLocation(activities, 'box', loc, selectedDate);
    const existing = activities.find(a => a.date === selectedDate && (a.activityType === '15' || a.activityType === '14.1') && (a.boxCulvertLocation === loc || a.startStationKm === loc));
    const curExc = selectedBoxStage === 'Excavation & Blinding' ? selectedBoxStagePct : (existing?.boxExcavationPct ?? prior?.boxExcavationPct ?? 0);
    const curBtm = selectedBoxStage === 'Bottom Slab' ? selectedBoxStagePct : (existing?.boxBottomSlabPct ?? prior?.boxBottomSlabPct ?? 0);
    const curWll = selectedBoxStage === 'Walls & Stem' ? selectedBoxStagePct : (existing?.boxWallsPct ?? prior?.boxWallsPct ?? 0);
    const curTop = selectedBoxStage === 'Top Slab' ? selectedBoxStagePct : (existing?.boxTopSlabPct ?? prior?.boxTopSlabPct ?? 0);
    const curWng = selectedBoxStage === 'Wingwalls & Apron' ? selectedBoxStagePct : (existing?.boxWingwallsPct ?? prior?.boxWingwallsPct ?? 0);
    const curBck = selectedBoxStage === 'Backfill' ? selectedBoxStagePct : (existing?.boxBackfillPct ?? prior?.boxBackfillPct ?? 0);
    const m = computeStructureStageMetrics('box', [curExc, curBtm, curWll, curTop, curWng, curBck], existing?.pipePreviousPct ?? 0, prior);
    setSelectedBoxStageKm(m.dailyExecutedNo);
  }, [selectedBoxLocation, customBoxLocation, selectedBoxStage, selectedBoxStagePct, selectedDate, activities]);

  useEffect(() => {
    const loc = customSlabLocation.trim() || selectedSlabLocation || 'Slab Culvert @ Km 197+200 (Span 4m)';
    const prior = getPreviousRecordForLocation(activities, 'slab', loc, selectedDate);
    const existing = activities.find(a => a.date === selectedDate && (a.activityType === '16' || a.activityType === '14.2') && (a.slabCulvertLocation === loc || a.startStationKm === loc));
    const curExc = selectedSlabStage === 'Excavation & Footing' ? selectedSlabStagePct : (existing?.slabExcavationPct ?? prior?.slabExcavationPct ?? 0);
    const curAbt = selectedSlabStage === 'Abutment Walls' ? selectedSlabStagePct : (existing?.slabAbutmentPct ?? prior?.slabAbutmentPct ?? 0);
    const curDck = selectedSlabStage === 'RC Deck Slab' ? selectedSlabStagePct : (existing?.slabDeckPct ?? prior?.slabDeckPct ?? 0);
    const curWng = selectedSlabStage === 'Wingwalls & Parapet' ? selectedSlabStagePct : (existing?.slabWingwallsPct ?? prior?.slabWingwallsPct ?? 0);
    const curPtc = selectedSlabStage === 'Bed Pitching' ? selectedSlabStagePct : (existing?.slabPitchingPct ?? prior?.slabPitchingPct ?? 0);
    const curBck = selectedSlabStage === 'Backfill' ? selectedSlabStagePct : (existing?.slabBackfillPct ?? prior?.slabBackfillPct ?? 0);
    const m = computeStructureStageMetrics('slab', [curExc, curAbt, curDck, curWng, curPtc, curBck], existing?.pipePreviousPct ?? 0, prior);
    setSelectedSlabStageKm(m.dailyExecutedNo);
  }, [selectedSlabLocation, customSlabLocation, selectedSlabStage, selectedSlabStagePct, selectedDate, activities]);

  useEffect(() => {
    const loc = customBridgeLocation.trim() || selectedBridgeLocation || 'Dermi River Bridge (Km 196+400, 3-Span)';
    const prior = getPreviousRecordForLocation(activities, 'bridge', loc, selectedDate);
    const existing = activities.find(a => a.date === selectedDate && (a.activityType === '17' || (a.activityType === '15' && (a.bridgeLocation || a.bridgeSelectedStage))) && (a.bridgeLocation === loc || a.startStationKm === loc));
    const curFnd = selectedBridgeStage === 'Foundation' ? selectedBridgeStagePct : (existing?.bridgeFoundationPct ?? prior?.bridgeFoundationPct ?? 0);
    const curAbt = selectedBridgeStage === 'Abutment' ? selectedBridgeStagePct : (existing?.bridgeAbutmentPct ?? prior?.bridgeAbutmentPct ?? 0);
    const curPer = selectedBridgeStage === 'Pier' ? selectedBridgeStagePct : (existing?.bridgePierPct ?? prior?.bridgePierPct ?? 0);
    const curGdr = selectedBridgeStage === 'Box girder / T-girder' ? selectedBridgeStagePct : (existing?.bridgeGirderPct ?? prior?.bridgeGirderPct ?? 0);
    const curSlb = selectedBridgeStage === 'Slab' ? selectedBridgeStagePct : (existing?.bridgeSlabPct ?? prior?.bridgeSlabPct ?? 0);
    const curApp = selectedBridgeStage === 'Approach & Bearings' ? selectedBridgeStagePct : (existing?.bridgeApproachPct ?? prior?.bridgeApproachPct ?? 0);
    const m = computeStructureStageMetrics('bridge', [curFnd, curAbt, curPer, curGdr, curSlb, curApp], existing?.bridgePrevious ?? 0, prior);
    setSelectedBridgeStageKm(m.dailyExecutedNo);
  }, [selectedBridgeLocation, customBridgeLocation, selectedBridgeStage, selectedBridgeStagePct, selectedDate, activities]);

  // Apply Pipe Stage Update: Equal weightage (20% each) summing to 1.000 No. Total
  const handleApplyPipeStageUpdate = () => {
    const loc = customPipeLocation.trim() || selectedPipeLocation || '200+313';
    const prior = getPreviousRecordForLocation(activities, 'pipe', loc, selectedDate);
    const existingIdx = activities.findIndex(a =>
      a.date === selectedDate && a.activityType === '14' && (a.pipeLocation === loc || a.startStationKm === loc)
    );
    const updatedList = [...activities];

    if (existingIdx !== -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.pipeSelectedStage = selectedPipeStage;
      if (selectedPipeStage === 'Excavation') existing.pipeExcavationPct = selectedPipeStagePct;
      if (selectedPipeStage === 'Masonry inlet/outlet') existing.pipeMasonryPct = selectedPipeStagePct;
      if (selectedPipeStage === 'Paved Water way') existing.pipePavedWaterwayPct = selectedPipeStagePct;
      if (selectedPipeStage === 'Pipe Installation') existing.pipeInstallationPct = selectedPipeStagePct;
      if (selectedPipeStage === 'Back fill') existing.pipeBackfillPct = selectedPipeStagePct;

      const exc = existing.pipeExcavationPct ?? 0;
      const mas = existing.pipeMasonryPct ?? 0;
      const paw = existing.pipePavedWaterwayPct ?? 0;
      const ins = existing.pipeInstallationPct ?? 0;
      const bck = existing.pipeBackfillPct ?? 0;

      const m = computeStructureStageMetrics('pipe', [exc, mas, paw, ins, bck], existing.pipePreviousPct ?? 0, prior);
      existing.pipePreviousPct = m.previousPct;
      existing.pipeDailyProgressPct = m.dailyProgressPct;
      existing.pipeToDatePct = m.toDatePct;
      existing.quantityExecuted = m.dailyExecutedNo;
      existing.metricKm = m.dailyExecutedNo;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const prevExc = prior?.pipeExcavationPct ?? 0;
      const prevMas = prior?.pipeMasonryPct ?? 0;
      const prevPaw = prior?.pipePavedWaterwayPct ?? 0;
      const prevIns = prior?.pipeInstallationPct ?? 0;
      const prevBck = prior?.pipeBackfillPct ?? 0;

      const newExc = selectedPipeStage === 'Excavation' ? selectedPipeStagePct : prevExc;
      const newMas = selectedPipeStage === 'Masonry inlet/outlet' ? selectedPipeStagePct : prevMas;
      const newPaw = selectedPipeStage === 'Paved Water way' ? selectedPipeStagePct : prevPaw;
      const newIns = selectedPipeStage === 'Pipe Installation' ? selectedPipeStagePct : prevIns;
      const newBck = selectedPipeStage === 'Back fill' ? selectedPipeStagePct : prevBck;

      const m = computeStructureStageMetrics('pipe', [newExc, newMas, newPaw, newIns, newBck], 0, prior);

      const newAct: DailyActivityRecord = {
        id: 'act_pipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '14',
        activityName: 'RCP Pipe Construction',
        description: `RCP Culvert at Stn ${loc} - ${selectedPipeStage}`,
        startStationKm: loc,
        pipeLocation: loc,
        pipeSelectedStage: selectedPipeStage,
        pipeExcavationPct: newExc,
        pipeMasonryPct: newMas,
        pipePavedWaterwayPct: newPaw,
        pipeInstallationPct: newIns,
        pipeBackfillPct: newBck,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: m.toDatePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      updatedList.push(newAct);
    }
    syncFutureDates('pipe', loc, selectedDate, updatedList);
    triggerDebouncedSave(updatedList, `Updated ${selectedPipeStage} at Stn ${loc}`);
  };

  const handleUpdatePipeStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const clampedVal = Math.min(100, Math.max(0, value));
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: clampedVal, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.pipeLocation || copy.startStationKm || '200+313';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'pipe', loc, copy.date);
        const exc = stageField === 'pipeExcavationPct' ? clampedVal : (copy.pipeExcavationPct ?? 0);
        const mas = stageField === 'pipeMasonryPct' ? clampedVal : (copy.pipeMasonryPct ?? 0);
        const paw = stageField === 'pipePavedWaterwayPct' ? clampedVal : (copy.pipePavedWaterwayPct ?? 0);
        const ins = stageField === 'pipeInstallationPct' ? clampedVal : (copy.pipeInstallationPct ?? 0);
        const bck = stageField === 'pipeBackfillPct' ? clampedVal : (copy.pipeBackfillPct ?? 0);

        const m = computeStructureStageMetrics('pipe', [exc, mas, paw, ins, bck], copy.pipePreviousPct ?? 0, prior);
        copy.pipePreviousPct = m.previousPct;
        copy.pipeDailyProgressPct = m.dailyProgressPct;
        copy.pipeToDatePct = m.toDatePct;
        copy.quantityExecuted = m.dailyExecutedNo;
        copy.metricKm = m.dailyExecutedNo;
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('pipe', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, 'Updated Pipe Culvert stage progress');
  };

  const handleUpdatePipeProgressFields = (actId: string, field: 'previous' | 'daily' | 'executed', val: number) => {
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.pipeLocation || copy.startStationKm || '200+313';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'pipe', loc, copy.date);
        const exc = copy.pipeExcavationPct ?? 100;
        const mas = copy.pipeMasonryPct ?? 100;
        const paw = copy.pipePavedWaterwayPct ?? 100;
        const ins = copy.pipeInstallationPct ?? 100;
        const bck = copy.pipeBackfillPct ?? 100;
        const m = computeStructureStageMetrics('pipe', [exc, mas, paw, ins, bck], copy.pipePreviousPct ?? 0, prior);

        if (field === 'previous') {
          const newPrev = Math.min(100, Math.max(0, val));
          copy.pipePreviousPct = newPrev;
          copy.pipeDailyProgressPct = Math.max(0, m.toDatePct - newPrev);
          const newPrevNo = newPrev / 100;
          const newExec = Math.max(0, parseFloat((m.toDateNo - newPrevNo).toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
        } else if (field === 'daily') {
          const newDaily = Math.min(100, Math.max(0, val));
          copy.pipeDailyProgressPct = newDaily;
          const newExec = parseFloat((newDaily / 100).toFixed(4));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        } else if (field === 'executed') {
          const newExec = Math.max(0, parseFloat(val.toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          const newDaily = Math.min(100, parseFloat((newExec * 100).toFixed(2)));
          copy.pipeDailyProgressPct = newDaily;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        }
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('pipe', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, `Updated Pipe Culvert ${field} progress`);
  };

  const handlePopulateStandardPipes = () => {
    if (!confirm('Populate the 15 standard ERA pipe culvert locations?')) return;
    const nonPipe = activities.filter(a => !(a.date === selectedDate && a.activityType === '14'));
    const newActs: DailyActivityRecord[] = PRESET_PIPE_LOCATIONS.map((loc, idx) => {
      const prior = getPreviousRecordForLocation(activities, 'pipe', loc, selectedDate);
      const m = computeStructureStageMetrics('pipe', [100, 100, 100, 100, 100], 0, prior);
      return {
        id: 'act_pipe_era_' + Date.now() + '_' + idx,
        date: selectedDate,
        activityType: '14',
        activityName: 'RCP Pipe Construction',
        description: `RCP Culvert at Stn ${loc} - Full Pipeline`,
        startStationKm: loc,
        pipeLocation: loc,
        pipeSelectedStage: 'Pipe Installation',
        pipeExcavationPct: 100,
        pipeMasonryPct: 100,
        pipePavedWaterwayPct: 100,
        pipeInstallationPct: 100,
        pipeBackfillPct: 100,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: 100,
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        side: 'BHS',
        unit: 'No.',
        qcStatus: 'Approved',
        status: 'Approved',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
    });
    triggerDebouncedSave([...nonPipe, ...newActs], 'Populated standard ERA pipe culverts');
  };

  // Box Culvert Handlers: Equal weightage (16.67% / (1/6) each) summing to 1.000 No. Total
  const handleApplyBoxStageUpdate = () => {
    const loc = customBoxLocation.trim() || selectedBoxLocation || 'Box Culvert @ Km 195+600 (2x2m)';
    const prior = getPreviousRecordForLocation(activities, 'box', loc, selectedDate);
    const existingIdx = activities.findIndex(a =>
      a.date === selectedDate && (a.activityType === '15' || a.activityType === '14.1') && (a.boxCulvertLocation === loc || a.startStationKm === loc)
    );
    const updatedList = [...activities];

    if (existingIdx !== -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.boxCulvertSelectedStage = selectedBoxStage;
      if (selectedBoxStage === 'Excavation & Blinding') existing.boxExcavationPct = selectedBoxStagePct;
      if (selectedBoxStage === 'Bottom Slab') existing.boxBottomSlabPct = selectedBoxStagePct;
      if (selectedBoxStage === 'Walls & Stem') existing.boxWallsPct = selectedBoxStagePct;
      if (selectedBoxStage === 'Top Slab') existing.boxTopSlabPct = selectedBoxStagePct;
      if (selectedBoxStage === 'Wingwalls & Apron') existing.boxWingwallsPct = selectedBoxStagePct;
      if (selectedBoxStage === 'Backfill') existing.boxBackfillPct = selectedBoxStagePct;

      const exc = existing.boxExcavationPct ?? 0;
      const btm = existing.boxBottomSlabPct ?? 0;
      const wll = existing.boxWallsPct ?? 0;
      const top = existing.boxTopSlabPct ?? 0;
      const wng = existing.boxWingwallsPct ?? 0;
      const bck = existing.boxBackfillPct ?? 0;

      const m = computeStructureStageMetrics('box', [exc, btm, wll, top, wng, bck], existing.pipePreviousPct ?? 0, prior);
      existing.pipePreviousPct = m.previousPct;
      existing.pipeDailyProgressPct = m.dailyProgressPct;
      existing.pipeToDatePct = m.toDatePct;
      existing.quantityExecuted = m.dailyExecutedNo;
      existing.metricKm = m.dailyExecutedNo;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const prevExc = prior?.boxExcavationPct ?? 0;
      const prevBtm = prior?.boxBottomSlabPct ?? 0;
      const prevWll = prior?.boxWallsPct ?? 0;
      const prevTop = prior?.boxTopSlabPct ?? 0;
      const prevWng = prior?.boxWingwallsPct ?? 0;
      const prevBck = prior?.boxBackfillPct ?? 0;

      const newExc = selectedBoxStage === 'Excavation & Blinding' ? selectedBoxStagePct : prevExc;
      const newBtm = selectedBoxStage === 'Bottom Slab' ? selectedBoxStagePct : prevBtm;
      const newWll = selectedBoxStage === 'Walls & Stem' ? selectedBoxStagePct : prevWll;
      const newTop = selectedBoxStage === 'Top Slab' ? selectedBoxStagePct : prevTop;
      const newWng = selectedBoxStage === 'Wingwalls & Apron' ? selectedBoxStagePct : prevWng;
      const newBck = selectedBoxStage === 'Backfill' ? selectedBoxStagePct : prevBck;

      const m = computeStructureStageMetrics('box', [newExc, newBtm, newWll, newTop, newWng, newBck], 0, prior);

      const newAct: DailyActivityRecord = {
        id: 'act_box_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '15',
        activityName: 'Box Culvert Construction',
        description: `Box Culvert at ${loc} - ${selectedBoxStage}`,
        startStationKm: loc,
        boxCulvertLocation: loc,
        boxCulvertSelectedStage: selectedBoxStage,
        boxExcavationPct: newExc,
        boxBottomSlabPct: newBtm,
        boxWallsPct: newWll,
        boxTopSlabPct: newTop,
        boxWingwallsPct: newWng,
        boxBackfillPct: newBck,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: m.toDatePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      updatedList.push(newAct);
    }
    syncFutureDates('box', loc, selectedDate, updatedList);
    triggerDebouncedSave(updatedList, `Updated Box Culvert ${selectedBoxStage} at ${loc}`);
  };

  const handleUpdateBoxStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const clampedVal = Math.min(100, Math.max(0, value));
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: clampedVal, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.boxCulvertLocation || copy.startStationKm || 'Km 195+600';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'box', loc, copy.date);
        const exc = stageField === 'boxExcavationPct' ? clampedVal : (copy.boxExcavationPct ?? 0);
        const btm = stageField === 'boxBottomSlabPct' ? clampedVal : (copy.boxBottomSlabPct ?? 0);
        const wll = stageField === 'boxWallsPct' ? clampedVal : (copy.boxWallsPct ?? 0);
        const top = stageField === 'boxTopSlabPct' ? clampedVal : (copy.boxTopSlabPct ?? 0);
        const wng = stageField === 'boxWingwallsPct' ? clampedVal : (copy.boxWingwallsPct ?? 0);
        const bck = stageField === 'boxBackfillPct' ? clampedVal : (copy.boxBackfillPct ?? 0);

        const m = computeStructureStageMetrics('box', [exc, btm, wll, top, wng, bck], copy.pipePreviousPct ?? 0, prior);
        copy.pipePreviousPct = m.previousPct;
        copy.pipeDailyProgressPct = m.dailyProgressPct;
        copy.pipeToDatePct = m.toDatePct;
        copy.quantityExecuted = m.dailyExecutedNo;
        copy.metricKm = m.dailyExecutedNo;
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('box', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, 'Updated Box Culvert stage progress');
  };

  const handleUpdateBoxProgressFields = (actId: string, field: 'previous' | 'daily' | 'executed', val: number) => {
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.boxCulvertLocation || copy.startStationKm || 'Box Culvert';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'box', loc, copy.date);
        const exc = copy.boxExcavationPct ?? 100;
        const btm = copy.boxBottomSlabPct ?? 100;
        const wll = copy.boxWallsPct ?? 100;
        const top = copy.boxTopSlabPct ?? 100;
        const wng = copy.boxWingwallsPct ?? 100;
        const bck = copy.boxBackfillPct ?? 100;
        const m = computeStructureStageMetrics('box', [exc, btm, wll, top, wng, bck], copy.pipePreviousPct ?? 0, prior);

        if (field === 'previous') {
          const newPrev = Math.min(100, Math.max(0, val));
          copy.pipePreviousPct = newPrev;
          copy.pipeDailyProgressPct = Math.max(0, m.toDatePct - newPrev);
          const newPrevNo = newPrev / 100;
          const newExec = Math.max(0, parseFloat((m.toDateNo - newPrevNo).toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
        } else if (field === 'daily') {
          const newDaily = Math.min(100, Math.max(0, val));
          copy.pipeDailyProgressPct = newDaily;
          const newExec = parseFloat((newDaily / 100).toFixed(4));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        } else if (field === 'executed') {
          const newExec = Math.max(0, parseFloat(val.toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          const newDaily = Math.min(100, parseFloat((newExec * 100).toFixed(2)));
          copy.pipeDailyProgressPct = newDaily;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        }
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('box', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, `Updated Box Culvert ${field} progress`);
  };

  const handlePopulateStandardBoxes = () => {
    if (!confirm('Populate standard ERA box culvert structures?')) return;
    const nonBox = activities.filter(a => !(a.date === selectedDate && (a.activityType === '15' || a.activityType === '14.1')));
    const newActs: DailyActivityRecord[] = PRESET_BOX_CULVERT_LOCATIONS.map((loc, idx) => {
      const prior = getPreviousRecordForLocation(activities, 'box', loc, selectedDate);
      const m = computeStructureStageMetrics('box', [100, 100, 100, 100, 100, 100], 0, prior);
      return {
        id: 'act_box_era_' + Date.now() + '_' + idx,
        date: selectedDate,
        activityType: '15',
        activityName: 'Box Culvert Construction',
        description: `${loc} - Full Structure`,
        startStationKm: loc,
        boxCulvertLocation: loc,
        boxCulvertSelectedStage: 'Top Slab',
        boxExcavationPct: 100,
        boxBottomSlabPct: 100,
        boxWallsPct: 100,
        boxTopSlabPct: 100,
        boxWingwallsPct: 100,
        boxBackfillPct: 100,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: 100,
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        side: 'BHS',
        unit: 'No.',
        qcStatus: 'Approved',
        status: 'Approved',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
    });
    triggerDebouncedSave([...nonBox, ...newActs], 'Populated standard ERA box culverts');
  };

  // Slab Culvert Handlers: Equal weightage (16.67% / (1/6) each) summing to 1.000 No. Total
  const handleApplySlabStageUpdate = () => {
    const loc = customSlabLocation.trim() || selectedSlabLocation || 'Slab Culvert @ Km 197+200 (Span 4m)';
    const prior = getPreviousRecordForLocation(activities, 'slab', loc, selectedDate);
    const existingIdx = activities.findIndex(a =>
      a.date === selectedDate && (a.activityType === '16' || a.activityType === '14.2') && (a.slabCulvertLocation === loc || a.startStationKm === loc)
    );
    const updatedList = [...activities];

    if (existingIdx !== -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.slabCulvertSelectedStage = selectedSlabStage;
      if (selectedSlabStage === 'Excavation & Footing') existing.slabExcavationPct = selectedSlabStagePct;
      if (selectedSlabStage === 'Abutment Walls') existing.slabAbutmentPct = selectedSlabStagePct;
      if (selectedSlabStage === 'RC Deck Slab') existing.slabDeckPct = selectedSlabStagePct;
      if (selectedSlabStage === 'Wingwalls & Parapet') existing.slabWingwallsPct = selectedSlabStagePct;
      if (selectedSlabStage === 'Bed Pitching') existing.slabPitchingPct = selectedSlabStagePct;
      if (selectedSlabStage === 'Backfill') existing.slabBackfillPct = selectedSlabStagePct;

      const exc = existing.slabExcavationPct ?? 0;
      const abt = existing.slabAbutmentPct ?? 0;
      const dck = existing.slabDeckPct ?? 0;
      const wng = existing.slabWingwallsPct ?? 0;
      const ptc = existing.slabPitchingPct ?? 0;
      const bck = existing.slabBackfillPct ?? 0;

      const m = computeStructureStageMetrics('slab', [exc, abt, dck, wng, ptc, bck], existing.pipePreviousPct ?? 0, prior);
      existing.pipePreviousPct = m.previousPct;
      existing.pipeDailyProgressPct = m.dailyProgressPct;
      existing.pipeToDatePct = m.toDatePct;
      existing.quantityExecuted = m.dailyExecutedNo;
      existing.metricKm = m.dailyExecutedNo;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const prevExc = prior?.slabExcavationPct ?? 0;
      const prevAbt = prior?.slabAbutmentPct ?? 0;
      const prevDck = prior?.slabDeckPct ?? 0;
      const prevWng = prior?.slabWingwallsPct ?? 0;
      const prevPtc = prior?.slabPitchingPct ?? 0;
      const prevBck = prior?.slabBackfillPct ?? 0;

      const newExc = selectedSlabStage === 'Excavation & Footing' ? selectedSlabStagePct : prevExc;
      const newAbt = selectedSlabStage === 'Abutment Walls' ? selectedSlabStagePct : prevAbt;
      const newDck = selectedSlabStage === 'RC Deck Slab' ? selectedSlabStagePct : prevDck;
      const newWng = selectedSlabStage === 'Wingwalls & Parapet' ? selectedSlabStagePct : prevWng;
      const newPtc = selectedSlabStage === 'Bed Pitching' ? selectedSlabStagePct : prevPtc;
      const newBck = selectedSlabStage === 'Backfill' ? selectedSlabStagePct : prevBck;

      const m = computeStructureStageMetrics('slab', [newExc, newAbt, newDck, newWng, newPtc, newBck], 0, prior);

      const newAct: DailyActivityRecord = {
        id: 'act_slab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '16',
        activityName: 'Slab Culvert Construction',
        description: `Slab Culvert at ${loc} - ${selectedSlabStage}`,
        startStationKm: loc,
        slabCulvertLocation: loc,
        slabCulvertSelectedStage: selectedSlabStage,
        slabExcavationPct: newExc,
        slabAbutmentPct: newAbt,
        slabDeckPct: newDck,
        slabWingwallsPct: newWng,
        slabPitchingPct: newPtc,
        slabBackfillPct: newBck,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: m.toDatePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      updatedList.push(newAct);
    }
    syncFutureDates('slab', loc, selectedDate, updatedList);
    triggerDebouncedSave(updatedList, `Updated Slab Culvert ${selectedSlabStage} at ${loc}`);
  };

  const handleUpdateSlabStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const clampedVal = Math.min(100, Math.max(0, value));
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: clampedVal, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.slabCulvertLocation || copy.startStationKm || 'Km 197+200';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'slab', loc, copy.date);
        const exc = stageField === 'slabExcavationPct' ? clampedVal : (copy.slabExcavationPct ?? 0);
        const abt = stageField === 'slabAbutmentPct' ? clampedVal : (copy.slabAbutmentPct ?? 0);
        const dck = stageField === 'slabDeckPct' ? clampedVal : (copy.slabDeckPct ?? 0);
        const wng = stageField === 'slabWingwallsPct' ? clampedVal : (copy.slabWingwallsPct ?? 0);
        const ptc = stageField === 'slabPitchingPct' ? clampedVal : (copy.slabPitchingPct ?? 0);
        const bck = stageField === 'slabBackfillPct' ? clampedVal : (copy.slabBackfillPct ?? 0);

        const m = computeStructureStageMetrics('slab', [exc, abt, dck, wng, ptc, bck], copy.pipePreviousPct ?? 0, prior);
        copy.pipePreviousPct = m.previousPct;
        copy.pipeDailyProgressPct = m.dailyProgressPct;
        copy.pipeToDatePct = m.toDatePct;
        copy.quantityExecuted = m.dailyExecutedNo;
        copy.metricKm = m.dailyExecutedNo;
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('slab', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, 'Updated Slab Culvert stage progress');
  };

  const handleUpdateSlabProgressFields = (actId: string, field: 'previous' | 'daily' | 'executed', val: number) => {
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.slabCulvertLocation || copy.startStationKm || 'Slab Culvert';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'slab', loc, copy.date);
        const exc = copy.slabExcavationPct ?? 100;
        const abt = copy.slabAbutmentPct ?? 100;
        const dck = copy.slabDeckPct ?? 100;
        const wng = copy.slabWingwallsPct ?? 100;
        const ptc = copy.slabPitchingPct ?? 100;
        const bck = copy.slabBackfillPct ?? 100;
        const m = computeStructureStageMetrics('slab', [exc, abt, dck, wng, ptc, bck], copy.pipePreviousPct ?? 0, prior);

        if (field === 'previous') {
          const newPrev = Math.min(100, Math.max(0, val));
          copy.pipePreviousPct = newPrev;
          copy.pipeDailyProgressPct = Math.max(0, m.toDatePct - newPrev);
          const newPrevNo = newPrev / 100;
          const newExec = Math.max(0, parseFloat((m.toDateNo - newPrevNo).toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
        } else if (field === 'daily') {
          const newDaily = Math.min(100, Math.max(0, val));
          copy.pipeDailyProgressPct = newDaily;
          const newExec = parseFloat((newDaily / 100).toFixed(4));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        } else if (field === 'executed') {
          const newExec = Math.max(0, parseFloat(val.toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          const newDaily = Math.min(100, parseFloat((newExec * 100).toFixed(2)));
          copy.pipeDailyProgressPct = newDaily;
          copy.pipePreviousPct = Math.max(0, m.toDatePct - newDaily);
        }
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('slab', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, `Updated Slab Culvert ${field} progress`);
  };

  const handlePopulateStandardSlabs = () => {
    if (!confirm('Populate standard ERA slab culvert structures?')) return;
    const nonSlab = activities.filter(a => !(a.date === selectedDate && (a.activityType === '16' || a.activityType === '14.2')));
    const newActs: DailyActivityRecord[] = PRESET_SLAB_CULVERT_LOCATIONS.map((loc, idx) => {
      const prior = getPreviousRecordForLocation(activities, 'slab', loc, selectedDate);
      const m = computeStructureStageMetrics('slab', [100, 100, 100, 100, 100, 100], 0, prior);
      return {
        id: 'act_slab_era_' + Date.now() + '_' + idx,
        date: selectedDate,
        activityType: '16',
        activityName: 'Slab Culvert Construction',
        description: `${loc} - Full Slab Structure`,
        startStationKm: loc,
        slabCulvertLocation: loc,
        slabCulvertSelectedStage: 'RC Deck Slab',
        slabExcavationPct: 100,
        slabAbutmentPct: 100,
        slabDeckPct: 100,
        slabWingwallsPct: 100,
        slabPitchingPct: 100,
        slabBackfillPct: 100,
        pipePreviousPct: m.previousPct,
        pipeDailyProgressPct: m.dailyProgressPct,
        pipeToDatePct: 100,
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        side: 'BHS',
        unit: 'No.',
        qcStatus: 'Approved',
        status: 'Approved',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
    });
    triggerDebouncedSave([...nonSlab, ...newActs], 'Populated standard ERA slab culverts');
  };

  // Bridge Handlers: Equal weightage (16.67% / (1/6) each) summing to 1.000 No. Total
  const handleApplyBridgeStageUpdate = () => {
    const loc = customBridgeLocation.trim() || selectedBridgeLocation || 'Dermi River Bridge (Km 196+400, 3-Span)';
    const prior = getPreviousRecordForLocation(activities, 'bridge', loc, selectedDate);
    const existingIdx = activities.findIndex(a =>
      a.date === selectedDate && (a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage))) && (a.bridgeLocation === loc || a.startStationKm === loc)
    );
    const updatedList = [...activities];

    if (existingIdx !== -1) {
      const existing = { ...updatedList[existingIdx] };
      existing.bridgeSelectedStage = selectedBridgeStage;
      if (selectedBridgeStage === 'Foundation') existing.bridgeFoundationPct = selectedBridgeStagePct;
      if (selectedBridgeStage === 'Abutment') existing.bridgeAbutmentPct = selectedBridgeStagePct;
      if (selectedBridgeStage === 'Pier') existing.bridgePierPct = selectedBridgeStagePct;
      if (selectedBridgeStage === 'Box girder / T-girder') existing.bridgeGirderPct = selectedBridgeStagePct;
      if (selectedBridgeStage === 'Slab') existing.bridgeSlabPct = selectedBridgeStagePct;
      if (selectedBridgeStage === 'Approach & Bearings') existing.bridgeApproachPct = selectedBridgeStagePct;

      const fnd = existing.bridgeFoundationPct ?? 0;
      const abt = existing.bridgeAbutmentPct ?? 0;
      const per = existing.bridgePierPct ?? 0;
      const gdr = existing.bridgeGirderPct ?? 0;
      const slb = existing.bridgeSlabPct ?? 0;
      const app = existing.bridgeApproachPct ?? 0;

      const m = computeStructureStageMetrics('bridge', [fnd, abt, per, gdr, slb, app], existing.bridgePrevious ?? 0, prior);
      existing.bridgePrevious = m.previousPct;
      existing.bridgeDailyProgress = m.dailyProgressPct;
      existing.bridgeToDate = m.toDatePct;
      existing.quantityExecuted = m.dailyExecutedNo;
      existing.metricKm = m.dailyExecutedNo;
      existing.unit = 'No.';
      existing.updatedAt = new Date().toISOString();
      updatedList[existingIdx] = existing;
    } else {
      const prevFnd = prior?.bridgeFoundationPct ?? 0;
      const prevAbt = prior?.bridgeAbutmentPct ?? 0;
      const prevPer = prior?.bridgePierPct ?? 0;
      const prevGdr = prior?.bridgeGirderPct ?? 0;
      const prevSlb = prior?.bridgeSlabPct ?? 0;
      const prevApp = prior?.bridgeApproachPct ?? 0;

      const newFnd = selectedBridgeStage === 'Foundation' ? selectedBridgeStagePct : prevFnd;
      const newAbt = selectedBridgeStage === 'Abutment' ? selectedBridgeStagePct : prevAbt;
      const newPer = selectedBridgeStage === 'Pier' ? selectedBridgeStagePct : prevPer;
      const newGdr = selectedBridgeStage === 'Box girder / T-girder' ? selectedBridgeStagePct : prevGdr;
      const newSlb = selectedBridgeStage === 'Slab' ? selectedBridgeStagePct : prevSlb;
      const newApp = selectedBridgeStage === 'Approach & Bearings' ? selectedBridgeStagePct : prevApp;

      const m = computeStructureStageMetrics('bridge', [newFnd, newAbt, newPer, newGdr, newSlb, newApp], 0, prior);

      const newAct: DailyActivityRecord = {
        id: 'act_bridge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: selectedDate,
        activityType: '17',
        activityName: 'Bridge Construction',
        description: `${loc} - ${selectedBridgeStage}`,
        startStationKm: loc,
        bridgeLocation: loc,
        bridgeSelectedStage: selectedBridgeStage,
        bridgeFoundationPct: newFnd,
        bridgeAbutmentPct: newAbt,
        bridgePierPct: newPer,
        bridgeGirderPct: newGdr,
        bridgeSlabPct: newSlb,
        bridgeApproachPct: newApp,
        bridgePrevious: m.previousPct,
        bridgeDailyProgress: m.dailyProgressPct,
        bridgeToDate: m.toDatePct,
        side: 'BHS',
        unit: 'No.',
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        qcStatus: 'Approved',
        status: 'Draft',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
      updatedList.push(newAct);
    }
    syncFutureDates('bridge', loc, selectedDate, updatedList);
    triggerDebouncedSave(updatedList, `Updated Bridge ${selectedBridgeStage} at ${loc}`);
  };

  const handleUpdateBridgeStageCell = (actId: string, stageField: keyof DailyActivityRecord, value: number) => {
    const clampedVal = Math.min(100, Math.max(0, value));
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, [stageField]: clampedVal, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.bridgeLocation || copy.startStationKm || 'Km 196+400';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'bridge', loc, copy.date);
        const fnd = stageField === 'bridgeFoundationPct' ? clampedVal : (copy.bridgeFoundationPct ?? 0);
        const abt = stageField === 'bridgeAbutmentPct' ? clampedVal : (copy.bridgeAbutmentPct ?? 0);
        const per = stageField === 'bridgePierPct' ? clampedVal : (copy.bridgePierPct ?? 0);
        const gdr = stageField === 'bridgeGirderPct' ? clampedVal : (copy.bridgeGirderPct ?? 0);
        const slb = stageField === 'bridgeSlabPct' ? clampedVal : (copy.bridgeSlabPct ?? 0);
        const app = stageField === 'bridgeApproachPct' ? clampedVal : (copy.bridgeApproachPct ?? 0);

        const m = computeStructureStageMetrics('bridge', [fnd, abt, per, gdr, slb, app], copy.bridgePrevious ?? 0, prior);
        copy.bridgePrevious = m.previousPct;
        copy.bridgeDailyProgress = m.dailyProgressPct;
        copy.bridgeToDate = m.toDatePct;
        copy.quantityExecuted = m.dailyExecutedNo;
        copy.metricKm = m.dailyExecutedNo;
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('bridge', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, 'Updated Bridge stage progress');
  };

  const handleUpdateBridgeProgressFields = (actId: string, field: 'previous' | 'daily' | 'executed', val: number) => {
    let targetLoc = '';
    const updated = activities.map(a => {
      if (a.id === actId) {
        const copy = { ...a, unit: 'No.', updatedAt: new Date().toISOString() };
        const loc = copy.bridgeLocation || copy.startStationKm || 'Bridge Structure';
        targetLoc = loc;
        const prior = getPreviousRecordForLocation(activities, 'bridge', loc, copy.date);
        const fnd = copy.bridgeFoundationPct ?? 100;
        const abt = copy.bridgeAbutmentPct ?? 100;
        const per = copy.bridgePierPct ?? 100;
        const gdr = copy.bridgeGirderPct ?? 100;
        const slb = copy.bridgeSlabPct ?? 100;
        const app = copy.bridgeApproachPct ?? 100;
        const m = computeStructureStageMetrics('bridge', [fnd, abt, per, gdr, slb, app], copy.bridgePrevious ?? 0, prior);

        if (field === 'previous') {
          const newPrev = Math.min(100, Math.max(0, val));
          copy.bridgePrevious = newPrev;
          copy.bridgeDailyProgress = Math.max(0, m.toDatePct - newPrev);
          const newPrevNo = newPrev / 100;
          const newExec = Math.max(0, parseFloat((m.toDateNo - newPrevNo).toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
        } else if (field === 'daily') {
          const newDaily = Math.min(100, Math.max(0, val));
          copy.bridgeDailyProgress = newDaily;
          const newExec = parseFloat((newDaily / 100).toFixed(4));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          copy.bridgePrevious = Math.max(0, m.toDatePct - newDaily);
        } else if (field === 'executed') {
          const newExec = Math.max(0, parseFloat(val.toFixed(4)));
          copy.quantityExecuted = newExec;
          copy.metricKm = newExec;
          const newDaily = Math.min(100, parseFloat((newExec * 100).toFixed(2)));
          copy.bridgeDailyProgress = newDaily;
          copy.bridgePrevious = Math.max(0, m.toDatePct - newDaily);
        }
        return copy;
      }
      return a;
    });
    if (targetLoc) {
      syncFutureDates('bridge', targetLoc, selectedDate, updated);
    }
    triggerDebouncedSave(updated, `Updated Bridge ${field} progress`);
  };

  const handlePopulateStandardBridges = () => {
    if (!confirm('Populate standard ERA bridge structures?')) return;
    const nonBridge = activities.filter(a => !(a.date === selectedDate && (a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage)))));
    const newActs: DailyActivityRecord[] = PRESET_BRIDGE_LOCATIONS.map((loc, idx) => {
      const prior = getPreviousRecordForLocation(activities, 'bridge', loc, selectedDate);
      const m = computeStructureStageMetrics('bridge', [100, 100, 100, 100, 100, 100], 0, prior);
      return {
        id: 'act_bridge_era_' + Date.now() + '_' + idx,
        date: selectedDate,
        activityType: '17',
        activityName: 'Bridge Construction',
        description: `${loc} - Full Bridge Structure`,
        startStationKm: loc,
        bridgeLocation: loc,
        bridgeSelectedStage: 'Slab',
        bridgeFoundationPct: 100,
        bridgeAbutmentPct: 100,
        bridgePierPct: 100,
        bridgeGirderPct: 100,
        bridgeSlabPct: 100,
        bridgeApproachPct: 100,
        bridgePrevious: m.previousPct,
        bridgeDailyProgress: m.dailyProgressPct,
        bridgeToDate: 100,
        metricKm: m.dailyExecutedNo,
        quantityExecuted: m.dailyExecutedNo,
        side: 'BHS',
        unit: 'No.',
        qcStatus: 'Approved',
        status: 'Approved',
        weatherCondition: 'Sunny',
        workingHours: 8.0,
        createdAt: new Date().toISOString()
      };
    });
    triggerDebouncedSave([...nonBridge, ...newActs], 'Populated standard ERA bridge structures');
  };

  // Filter raw activities for each structure
  const rawPipeActs = currentActivities.filter(a =>
    a.activityType === '14' || Boolean(a.pipeLocation && !a.boxCulvertLocation && !a.slabCulvertLocation && !a.bridgeLocation)
  );
  const pipeActivities = rawPipeActs.filter(a => {
    if (workRegisterStatusFilter !== 'ALL') {
      const st = a.status || a.qcStatus || 'Draft';
      if (st !== workRegisterStatusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const m = (a.description || '').toLowerCase().includes(q) || (a.startStationKm || '').toLowerCase().includes(q) || (a.pipeLocation || '').toLowerCase().includes(q);
      if (!m) return false;
    }
    return true;
  });

  const rawBoxActs = currentActivities.filter(a =>
    a.activityType === '15' || a.activityType === '14.1' || Boolean(a.boxCulvertLocation && !a.bridgeLocation)
  );
  const boxActivities = rawBoxActs.filter(a => {
    if (workRegisterStatusFilter !== 'ALL') {
      const st = a.status || a.qcStatus || 'Draft';
      if (st !== workRegisterStatusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const m = (a.description || '').toLowerCase().includes(q) || (a.startStationKm || '').toLowerCase().includes(q) || (a.boxCulvertLocation || '').toLowerCase().includes(q);
      if (!m) return false;
    }
    return true;
  });

  const rawSlabActs = currentActivities.filter(a =>
    a.activityType === '16' || a.activityType === '14.2' || Boolean(a.slabCulvertLocation)
  );
  const slabActivities = rawSlabActs.filter(a => {
    if (workRegisterStatusFilter !== 'ALL') {
      const st = a.status || a.qcStatus || 'Draft';
      if (st !== workRegisterStatusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const m = (a.description || '').toLowerCase().includes(q) || (a.startStationKm || '').toLowerCase().includes(q) || (a.slabCulvertLocation || '').toLowerCase().includes(q);
      if (!m) return false;
    }
    return true;
  });

  const rawBridgeActs = currentActivities.filter(a =>
    a.activityType === '17' || (a.activityType === '15' && Boolean(a.bridgeLocation || a.bridgeSelectedStage))
  );
  const bridgeActivities = rawBridgeActs.filter(a => {
    if (workRegisterStatusFilter !== 'ALL') {
      const st = a.status || a.qcStatus || 'Draft';
      if (st !== workRegisterStatusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const m = (a.description || '').toLowerCase().includes(q) || (a.startStationKm || '').toLowerCase().includes(q) || (a.bridgeLocation || '').toLowerCase().includes(q);
      if (!m) return false;
    }
    return true;
  });

  const hasSpecialInSections = sections.some(s => s.id === '14' || s.id === '15' || s.id === '16' || s.id === '17');
  const showPipe = (workRegisterActivityFilter === 'ALL' || workRegisterActivityFilter === '14') && (!hasSpecialInSections || sections.some(s => s.id === '14') || pipeActivities.length > 0);
  const showBox = (workRegisterActivityFilter === 'ALL' || workRegisterActivityFilter === '15' || workRegisterActivityFilter === '14.1') && (!hasSpecialInSections || sections.some(s => s.id === '15' || s.id === '14.1') || boxActivities.length > 0);
  const showSlab = (workRegisterActivityFilter === 'ALL' || workRegisterActivityFilter === '16' || workRegisterActivityFilter === '14.2') && (!hasSpecialInSections || sections.some(s => s.id === '16' || s.id === '14.2') || slabActivities.length > 0);
  const showBridge = (workRegisterActivityFilter === 'ALL' || workRegisterActivityFilter === '17') && (!hasSpecialInSections || sections.some(s => s.id === '17') || bridgeActivities.length > 0);

  return (
    <div className="mt-6 space-y-6 print:space-y-6">
      {/* SECTION HEADER & EXPAND/COLLAPSE CONTROLS */}
      <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wide">
              ERA Special Sub-Registers &amp; Culvert/Bridge Construction Tables (Standalone)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dedicated standalone tracking registers for RCP Pipe Culverts (14), Box Culverts (15), Slab Culverts (16), and Major Bridge Crossings (17).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => toggleAllStructuresVisibility(false)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
          >
            Expand All Tables
          </button>
          <button
            type="button"
            onClick={() => toggleAllStructuresVisibility(true)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
          >
            Hide All Tables
          </button>
        </div>
      </div>

      {/* 14. RCP PIPE CONSTRUCTION STANDALONE TABLE */}
      {showPipe && (!showActiveOnly || pipeActivities.length > 0) && (() => {
        const displayedPipeActs = pipeActivities.filter(a => {
          if (pipeFilterStage === 'ALL') return true;
          return a.pipeSelectedStage === pipeFilterStage;
        });
        const count = pipeActivities.length;
        const avgExc = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipeExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgMas = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipeMasonryPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgPaw = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipePavedWaterwayPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgIns = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipeInstallationPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgBck = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipeBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgToDate = count > 0 ? (pipeActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
        const totalKm = pipeActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="bg-blue-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                  ERA Special Sub-Register
                </span>
                <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>14. RCP Pipe Construction (Reinforced Concrete Pipe Culverts)</span>
                </h4>
                <span className="text-blue-200 text-xs font-normal">
                  ({pipeActivities.length} culvert locations active)
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('pipe')}
                  className="bg-blue-800/90 hover:bg-blue-700 text-blue-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-blue-600/60 shadow-xs transition"
                >
                  {hiddenStructureViews.pipe ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hiddenStructureViews.pipe ? "Show View" : "Hide View"}</span>
                  {hiddenStructureViews.pipe ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                {!isReadonly && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddRowAt('14')}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Location</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePopulateStandardPipes}
                      className="bg-blue-800 hover:bg-blue-700 text-blue-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-blue-700 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-blue-300" />
                      <span>Populate 15 Standard Stations</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection('14')}
                      className="text-blue-300 hover:text-rose-300 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* If Hidden */}
            {hiddenStructureViews.pipe ? (
              <div
                onClick={() => toggleStructureVisibility('pipe')}
                className="bg-blue-50/70 hover:bg-blue-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-bold text-blue-950">
                    RCP Pipe View Hidden ({pipeActivities.length} Locations)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-blue-800">
                      Avg To-Date: {avgToDate}%
                    </span>
                    <span className="bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                      Total Extent: {totalKm.toFixed(3)} No.
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
                {/* Stage Selection & Update Bar */}
                <div className="bg-slate-100/90 border-b border-slate-300 p-3 print:hidden">
                  <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-900">
                          Select Specific Location &amp; Construction Stage:
                        </span>
                        <span className="text-[11px] text-blue-700 font-semibold">
                          [ Excavation, Masonry inlet/outlet, Paved Water way, Pipe Installation, Back fill ]
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setPipeFilterStage('ALL')}
                          className={`px-2 py-0.5 rounded font-medium transition ${pipeFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          All ({pipeActivities.length})
                        </button>
                        {PIPE_CONSTRUCTION_STAGES.map(st => {
                          const stCount = pipeActivities.filter(a => a.pipeSelectedStage === st).length;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setPipeFilterStage(st)}
                              className={`px-2 py-0.5 rounded font-medium transition ${pipeFilterStage === st ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {st} {stCount > 0 ? `(${stCount})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!isReadonly && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                            {Array.from(new Set([...PRESET_PIPE_LOCATIONS, ...pipeActivities.map(a => a.pipeLocation || a.startStationKm).filter(Boolean)])).map(loc => (
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

                        <button
                          type="button"
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

                {/* Scroll View Controls */}
                <div className="bg-blue-50/70 border-b border-blue-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] print:hidden">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                    <span>Scroll Option ({displayedPipeActs.length} pipe rows):</span>
                    <button
                      type="button"
                      onClick={() => setIsPipeScrollEnabled(prev => !prev)}
                      className={`px-2 py-0.5 rounded border font-bold transition cursor-pointer ${
                        isPipeScrollEnabled
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      {isPipeScrollEnabled ? 'Scroll View: ON (Max 420px)' : 'Scroll View: OFF (Full Height)'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => pipeTableScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                      className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => pipeTableScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                      className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-slate-700 border border-slate-300 font-medium flex items-center gap-0.5 cursor-pointer"
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
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Bottom</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Table */}
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
                              <span className="block truncate pr-1" title={col.label}>{col.label}</span>
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
                                <span className={`w-[2px] h-3.5 rounded-full transition-colors ${isResizingThis ? 'bg-blue-600 h-full' : 'bg-transparent group-hover/subcol:bg-blue-400/80'}`} />
                              </div>
                            </th>
                          );
                        })}
                        {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedPipeActs.length > 0 ? (
                        displayedPipeActs.map((act, actIdx) => {
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
                              <td className="p-1.5 border-r border-slate-200 text-center bg-blue-50/40">
                                <select
                                  value={activeStage}
                                  onChange={e => handleCellUpdate(act.id, 'pipeSelectedStage', e.target.value)}
                                  className="w-full bg-white border border-blue-300 text-blue-900 font-bold rounded px-1.5 py-1 text-xs outline-none cursor-pointer shadow-2xs hover:border-blue-500"
                                >
                                  {PIPE_CONSTRUCTION_STAGES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                  <option value="All Stages">All Stages</option>
                                </select>
                              </td>
                              <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Excavation' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300' : ''}`}>
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
                              <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Masonry inlet/outlet' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300' : ''}`}>
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
                              <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Paved Water way' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300' : ''}`}>
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
                              <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Pipe Installation' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300' : ''}`}>
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
                              <td className={`p-1 border-r border-slate-200 text-center ${activeStage === 'Back fill' ? 'bg-amber-100/70 font-bold ring-1 ring-amber-300' : ''}`}>
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
                              <td className="p-1 border-r border-slate-200 text-center text-rose-600 font-bold">
                                <span>{toDateVal}%</span>
                              </td>
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
                              {!isReadonly && (
                                <td className="p-1.5 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingActivity({ ...act });
                                        setIsResourceModalOpen(true);
                                      }}
                                      className="text-slate-400 hover:text-blue-600 p-1 rounded"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(act.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
                                  type="button"
                                  onClick={() => handleAddRowAt('14')}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                >
                                  + Add First Location
                                </button>
                                <button
                                  type="button"
                                  onClick={handlePopulateStandardPipes}
                                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition"
                                >
                                  Populate 15 Standard ERA Culverts
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {pipeActivities.length > 0 && (
                        <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                          {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                          <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                            Total ({pipeActivities.length} No.)
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
                                type="button"
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
        );
      })()}

      {/* 15. BOX CULVERT CONSTRUCTION STANDALONE TABLE */}
      {showBox && (!showActiveOnly || boxActivities.length > 0) && (() => {
        const displayedBoxActs = boxActivities.filter(a => {
          if (boxFilterStage === 'ALL') return true;
          return a.boxCulvertSelectedStage === boxFilterStage;
        });
        const count = boxActivities.length;
        const avgExc = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgBtm = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxBottomSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgWll = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxWallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgTop = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxTopSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgWng = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxWingwallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgBck = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.boxBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgToDate = count > 0 ? (boxActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
        const totalKm = boxActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="bg-emerald-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                  RC Box Culvert Structure
                </span>
                <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>15. Box Culvert Construction (Reinforced Concrete Box Culverts)</span>
                </h4>
                <span className="text-emerald-200 text-xs font-normal">
                  ({boxActivities.length} box culverts active)
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('box')}
                  className="bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-600/60 shadow-xs transition"
                >
                  {hiddenStructureViews.box ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hiddenStructureViews.box ? "Show View" : "Hide View"}</span>
                  {hiddenStructureViews.box ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                {!isReadonly && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddRowAt('15')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Box Culvert</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePopulateStandardBoxes}
                      className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-emerald-700 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-300" />
                      <span>Populate Standard Box Culverts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection('15')}
                      className="text-emerald-300 hover:text-rose-300 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {hiddenStructureViews.box ? (
              <div
                onClick={() => toggleStructureVisibility('box')}
                className="bg-emerald-50/70 hover:bg-emerald-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-emerald-950">
                    Box Culvert View Hidden ({boxActivities.length} Structures)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-emerald-800">
                      Avg To-Date: {avgToDate}%
                    </span>
                    <span className="bg-white border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                      Total Extent: {totalKm.toFixed(3)} No.
                    </span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      [ Exc: {avgExc}% | Btm: {avgBtm}% | Walls: {avgWll}% | Top: {avgTop}% | Wing: {avgWng}% | Backfill: {avgBck}% ]
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
                <div className="bg-slate-100/90 border-b border-slate-300 p-3 print:hidden">
                  <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-900">
                          Select Box Culvert Location &amp; Specific Construction Stage:
                        </span>
                        <span className="text-[11px] text-emerald-800 font-semibold">
                          [ Excavation &amp; Blinding, Bottom Slab, Walls &amp; Stem, Top Slab, Wingwalls &amp; Apron, Backfill ]
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setBoxFilterStage('ALL')}
                          className={`px-2 py-0.5 rounded font-medium transition ${boxFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          All ({boxActivities.length})
                        </button>
                        {BOX_CULVERT_STAGES.map(st => {
                          const stCount = boxActivities.filter(a => a.boxCulvertSelectedStage === st).length;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setBoxFilterStage(st)}
                              className={`px-2 py-0.5 rounded font-medium transition ${boxFilterStage === st ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {st} {stCount > 0 ? `(${stCount})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!isReadonly && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                            {Array.from(new Set([...PRESET_BOX_CULVERT_LOCATIONS, ...boxActivities.map(a => a.boxCulvertLocation || a.startStationKm).filter(Boolean)])).map(loc => (
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
                            className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-emerald-800 outline-none"
                          />
                          <span className="font-bold text-slate-600">%</span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                          <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                          <input
                            type="number"
                            step="0.001"
                            value={selectedBoxStageKm}
                            onChange={e => setSelectedBoxStageKm(parseFloat(e.target.value) || 0)}
                            placeholder="0.000"
                            className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                          />
                          <span className="text-slate-500 text-[10px]">No.</span>
                        </div>

                        <button
                          type="button"
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
                              <span className="block truncate pr-1" title={col.label}>{col.label}</span>
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
                                <span className={`w-[2px] h-3.5 rounded-full transition-colors ${isResizingThis ? 'bg-emerald-600 h-full' : 'bg-transparent group-hover/subcol:bg-emerald-400/80'}`} />
                              </div>
                            </th>
                          );
                        })}
                        {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedBoxActs.length > 0 ? (
                        displayedBoxActs.map((act, actIdx) => {
                          const loc = act.boxCulvertLocation || act.startStationKm || 'Box Culvert';
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
                            <tr key={`box-${act.id}-${actIdx}`} className="hover:bg-slate-50 transition border-b border-slate-200 text-xs text-slate-800">
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
                              <td className="p-1.5 border-r border-slate-200 text-center font-semibold text-slate-900 bg-slate-50/50">
                                <input
                                  value={loc}
                                  onChange={e => handleCellUpdate(act.id, 'boxCulvertLocation', e.target.value)}
                                  className="w-full text-center bg-transparent font-medium outline-none"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-200 text-center bg-emerald-50/40">
                                <select
                                  value={activeStage}
                                  onChange={e => handleCellUpdate(act.id, 'boxCulvertSelectedStage', e.target.value)}
                                  className="w-full bg-white border border-emerald-300 text-emerald-950 font-bold rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
                                >
                                  {BOX_CULVERT_STAGES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={exc}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxExcavationPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={btm}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxBottomSlabPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={wll}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxWallsPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={top}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxTopSlabPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={wng}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxWingwallsPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={bck}
                                  onChange={e => handleUpdateBoxStageCell(act.id, 'boxBackfillPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                <input
                                  type="number"
                                  value={act.pipePreviousPct ?? toDateVal}
                                  onChange={e => handleCellUpdate(act.id, 'pipePreviousPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-emerald-700 font-bold">
                                <input
                                  type="number"
                                  value={act.pipeDailyProgressPct ?? 0}
                                  onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent text-emerald-700 font-bold outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-rose-600 font-bold">
                                {toDateVal}%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center font-mono">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm ?? 0)}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleCellUpdate(act.id, 'quantityExecuted', val);
                                    handleCellUpdate(act.id, 'metricKm', val);
                                  }}
                                  className="w-14 text-center bg-transparent font-mono font-bold outline-none"
                                />
                              </td>
                              {!isReadonly && (
                                <td className="p-1.5 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingActivity({ ...act });
                                        setIsResourceModalOpen(true);
                                      }}
                                      className="text-slate-400 hover:text-emerald-600 p-1 rounded"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(act.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
                          <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                            No box culvert records for this date. Use the bar above to record progress or click "Populate Standard Box Culverts".
                          </td>
                        </tr>
                      )}

                      {boxActivities.length > 0 && (
                        <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                          {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                          <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                            Total ({boxActivities.length} Structures)
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
                                type="button"
                                onClick={() => handleClearSectionEntries('15')}
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
        );
      })()}

      {/* 16. SLAB CULVERT CONSTRUCTION STANDALONE TABLE */}
      {showSlab && (!showActiveOnly || slabActivities.length > 0) && (() => {
        const displayedSlabActs = slabActivities.filter(a => {
          if (slabFilterStage === 'ALL') return true;
          return a.slabCulvertSelectedStage === slabFilterStage;
        });
        const count = slabActivities.length;
        const avgExc = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabExcavationPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgAbt = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabAbutmentPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgDck = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabDeckPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgWng = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabWingwallsPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgPtc = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabPitchingPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgBck = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.slabBackfillPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgToDate = count > 0 ? (slabActivities.reduce((acc, a) => acc + (a.pipeToDatePct ?? 100), 0) / count).toFixed(1) : '0.0';
        const totalKm = slabActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="bg-indigo-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                  RC Slab Culvert Structure
                </span>
                <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>16. Slab Culvert Construction (Reinforced Concrete Slab Culverts)</span>
                </h4>
                <span className="text-indigo-200 text-xs font-normal">
                  ({slabActivities.length} slab culverts active)
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('slab')}
                  className="bg-indigo-800/90 hover:bg-indigo-700 text-indigo-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-600/60 shadow-xs transition"
                >
                  {hiddenStructureViews.slab ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hiddenStructureViews.slab ? "Show View" : "Hide View"}</span>
                  {hiddenStructureViews.slab ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                {!isReadonly && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddRowAt('16')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Slab Culvert</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePopulateStandardSlabs}
                      className="bg-indigo-800 hover:bg-indigo-700 text-indigo-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-indigo-700 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-indigo-300" />
                      <span>Populate Standard Slab Culverts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection('16')}
                      className="text-indigo-300 hover:text-rose-300 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {hiddenStructureViews.slab ? (
              <div
                onClick={() => toggleStructureVisibility('slab')}
                className="bg-indigo-50/70 hover:bg-indigo-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span className="text-xs font-bold text-indigo-950">
                    Slab Culvert View Hidden ({slabActivities.length} Structures)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-white border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-indigo-800">
                      Avg To-Date: {avgToDate}%
                    </span>
                    <span className="bg-white border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                      Total Extent: {totalKm.toFixed(3)} No.
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
                <div className="bg-slate-100/90 border-b border-slate-300 p-3 print:hidden">
                  <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-900">
                          Select Slab Culvert Location &amp; Specific Construction Stage:
                        </span>
                        <span className="text-[11px] text-indigo-900 font-semibold">
                          [ Excavation &amp; Footing, Abutment Walls, RC Deck Slab, Wingwalls &amp; Parapet, Bed Pitching, Backfill ]
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSlabFilterStage('ALL')}
                          className={`px-2 py-0.5 rounded font-medium transition ${slabFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          All ({slabActivities.length})
                        </button>
                        {SLAB_CULVERT_STAGES.map(st => {
                          const stCount = slabActivities.filter(a => a.slabCulvertSelectedStage === st).length;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setSlabFilterStage(st)}
                              className={`px-2 py-0.5 rounded font-medium transition ${slabFilterStage === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {st} {stCount > 0 ? `(${stCount})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!isReadonly && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                            {Array.from(new Set([...PRESET_SLAB_CULVERT_LOCATIONS, ...slabActivities.map(a => a.slabCulvertLocation || a.startStationKm).filter(Boolean)])).map(loc => (
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

                        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-300 rounded-lg p-1.5">
                          <span className="text-[11px] font-bold text-indigo-900 uppercase">Stage:</span>
                          <select
                            value={selectedSlabStage}
                            onChange={e => setSelectedSlabStage(e.target.value as SlabCulvertStage)}
                            className="bg-transparent font-bold text-indigo-900 outline-none text-xs cursor-pointer"
                          >
                            {SLAB_CULVERT_STAGES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

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
                            className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-indigo-900 outline-none"
                          />
                          <span className="font-bold text-slate-600">%</span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                          <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                          <input
                            type="number"
                            step="0.001"
                            value={selectedSlabStageKm}
                            onChange={e => setSelectedSlabStageKm(parseFloat(e.target.value) || 0)}
                            placeholder="0.000"
                            className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                          />
                          <span className="text-slate-500 text-[10px]">No.</span>
                        </div>

                        <button
                          type="button"
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
                              <span className="block truncate pr-1" title={col.label}>{col.label}</span>
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
                                <span className={`w-[2px] h-3.5 rounded-full transition-colors ${isResizingThis ? 'bg-indigo-600 h-full' : 'bg-transparent group-hover/subcol:bg-indigo-400/80'}`} />
                              </div>
                            </th>
                          );
                        })}
                        {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedSlabActs.length > 0 ? (
                        displayedSlabActs.map((act, actIdx) => {
                          const loc = act.slabCulvertLocation || act.startStationKm || 'Slab Culvert';
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
                            <tr key={`slab-${act.id}-${actIdx}`} className="hover:bg-slate-50 transition border-b border-slate-200 text-xs text-slate-800">
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
                              <td className="p-1.5 border-r border-slate-200 text-center font-semibold text-slate-900 bg-slate-50/50">
                                <input
                                  value={loc}
                                  onChange={e => handleCellUpdate(act.id, 'slabCulvertLocation', e.target.value)}
                                  className="w-full text-center bg-transparent font-medium outline-none"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-200 text-center bg-indigo-50/40">
                                <select
                                  value={activeStage}
                                  onChange={e => handleCellUpdate(act.id, 'slabCulvertSelectedStage', e.target.value)}
                                  className="w-full bg-white border border-indigo-300 text-indigo-950 font-bold rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
                                >
                                  {SLAB_CULVERT_STAGES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={exc}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabExcavationPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={abt}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabAbutmentPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={dck}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabDeckPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={wng}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabWingwallsPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={ptc}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabPitchingPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={bck}
                                  onChange={e => handleUpdateSlabStageCell(act.id, 'slabBackfillPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                <input
                                  type="number"
                                  value={act.pipePreviousPct ?? toDateVal}
                                  onChange={e => handleCellUpdate(act.id, 'pipePreviousPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-indigo-700 font-bold">
                                <input
                                  type="number"
                                  value={act.pipeDailyProgressPct ?? 0}
                                  onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-transparent text-indigo-700 font-bold outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-rose-600 font-bold">
                                {toDateVal}%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center font-mono">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={act.quantityExecuted !== undefined ? act.quantityExecuted : (act.metricKm ?? 0)}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleCellUpdate(act.id, 'quantityExecuted', val);
                                    handleCellUpdate(act.id, 'metricKm', val);
                                  }}
                                  className="w-14 text-center bg-transparent font-mono font-bold outline-none"
                                />
                              </td>
                              {!isReadonly && (
                                <td className="p-1.5 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingActivity({ ...act });
                                        setIsResourceModalOpen(true);
                                      }}
                                      className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(act.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
                          <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                            No slab culvert records for this date. Use the bar above to record progress or click "Populate Standard Slab Culverts".
                          </td>
                        </tr>
                      )}

                      {slabActivities.length > 0 && (
                        <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                          {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                          <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                            Total ({slabActivities.length} Structures)
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
                                type="button"
                                onClick={() => handleClearSectionEntries('16')}
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
        );
      })()}

      {/* 17. BRIDGE CONSTRUCTION STANDALONE TABLE */}
      {showBridge && (!showActiveOnly || bridgeActivities.length > 0) && (() => {
        const displayedBridgeActs = bridgeActivities.filter(a => {
          if (bridgeFilterStage === 'ALL') return true;
          return a.bridgeSelectedStage === bridgeFilterStage;
        });
        const count = bridgeActivities.length;
        const avgFnd = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeFoundationPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgAbt = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeAbutmentPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgPer = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgePierPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgGdr = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeGirderPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgSlb = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeSlabPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgApp = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeApproachPct ?? 100), 0) / count).toFixed(1) : '0.0';
        const avgToDate = count > 0 ? (bridgeActivities.reduce((acc, a) => acc + (a.bridgeToDate ?? 100), 0) / count).toFixed(1) : '0.0';
        const totalKm = bridgeActivities.reduce((acc, a) => acc + (Number(a.metricKm) || 0), 0);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="bg-amber-600 text-white text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                  Bridge Structures Sub-Register
                </span>
                <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>17. Bridge Construction (Major Crossings &amp; River Overpasses)</span>
                </h4>
                <span className="text-amber-200 text-xs font-normal">
                  ({bridgeActivities.length} bridge structures active)
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => toggleStructureVisibility('bridge')}
                  className="bg-amber-800/90 hover:bg-amber-700 text-amber-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-amber-600/60 shadow-xs transition"
                >
                  {hiddenStructureViews.bridge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hiddenStructureViews.bridge ? "Show View" : "Hide View"}</span>
                  {hiddenStructureViews.bridge ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
                {!isReadonly && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddRowAt('17')}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Bridge</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePopulateStandardBridges}
                      className="bg-amber-800 hover:bg-amber-700 text-amber-100 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-amber-700 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-300" />
                      <span>Populate Standard Bridges</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection('17')}
                      className="text-amber-300 hover:text-rose-300 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {hiddenStructureViews.bridge ? (
              <div
                onClick={() => toggleStructureVisibility('bridge')}
                className="bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer p-3.5 transition flex flex-wrap items-center justify-between gap-3 border-b border-amber-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-amber-950">
                    Bridge View Hidden ({bridgeActivities.length} Structures)
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-white border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-amber-800">
                      Avg To-Date: {avgToDate}%
                    </span>
                    <span className="bg-white border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-800">
                      Total Extent: {totalKm.toFixed(3)} No.
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
                <div className="bg-amber-50/70 border-b border-amber-200 p-3 print:hidden">
                  <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-900">
                          Select Bridge Location &amp; Specific Construction Stage:
                        </span>
                        <span className="text-[11px] text-amber-900 font-semibold">
                          [ Foundation, Abutment, Pier, Box girder / T-girder, Slab, Approach &amp; Bearings ]
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Filter:
                        </span>
                        <button
                          type="button"
                          onClick={() => setBridgeFilterStage('ALL')}
                          className={`px-2 py-0.5 rounded font-medium transition ${bridgeFilterStage === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          All ({bridgeActivities.length})
                        </button>
                        {BRIDGE_CONSTRUCTION_STAGES.map(st => {
                          const stCount = bridgeActivities.filter(a => a.bridgeSelectedStage === st).length;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setBridgeFilterStage(st)}
                              className={`px-2 py-0.5 rounded font-medium transition ${bridgeFilterStage === st ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {st} {stCount > 0 ? `(${stCount})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!isReadonly && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                            {Array.from(new Set([...PRESET_BRIDGE_LOCATIONS, ...bridgeActivities.map(a => a.bridgeLocation || a.startStationKm).filter(Boolean)])).map(loc => (
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

                        <button
                          type="button"
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
                              <span className="block truncate pr-1" title={col.label}>{col.label}</span>
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
                                <span className={`w-[2px] h-3.5 rounded-full transition-colors ${isResizingThis ? 'bg-amber-600 h-full' : 'bg-transparent group-hover/subcol:bg-amber-500/80'}`} />
                              </div>
                            </th>
                          );
                        })}
                        {!isReadonly && <th className="p-2 text-center print:hidden">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedBridgeActs.length > 0 ? (
                        displayedBridgeActs.map((act, actIdx) => {
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
                              <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-900 bg-slate-50/50">
                                <input
                                  value={act.bridgeLocation || loc}
                                  onChange={e => handleCellUpdate(act.id, 'bridgeLocation', e.target.value)}
                                  className="w-full bg-transparent font-medium text-slate-900 outline-none hover:bg-white focus:bg-white rounded px-1 transition"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-200 bg-amber-50/60 text-center">
                                <select
                                  value={activeStage}
                                  onChange={e => handleCellUpdate(act.id, 'bridgeSelectedStage', e.target.value as BridgeConstructionStage)}
                                  className="w-full bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-amber-900 shadow-xs cursor-pointer focus:outline-amber-500"
                                >
                                  {BRIDGE_CONSTRUCTION_STAGES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={fnd}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeFoundationPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={abt}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeAbutmentPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={per}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgePierPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={gdr}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeGirderPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={slb}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeSlabPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={app}
                                  onChange={e => handleUpdateBridgeStageCell(act.id, 'bridgeApproachPct', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent rounded font-bold text-slate-800 outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-medium">
                                <input
                                  type="number"
                                  value={act.bridgePrevious ?? 60}
                                  onChange={e => handleCellUpdate(act.id, 'bridgePrevious', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent text-slate-500 font-medium outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-amber-700 font-bold">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={act.bridgeDailyProgress ?? 0}
                                  onChange={e => handleCellUpdate(act.id, 'bridgeDailyProgress', parseFloat(e.target.value) || 0)}
                                  className="w-12 text-center bg-transparent text-amber-700 font-bold outline-none"
                                />%
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center text-rose-700 font-black bg-rose-50/30">
                                {toDateVal}%
                              </td>
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
                              {!isReadonly && (
                                <td className="p-1 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingActivity({ ...act });
                                        setIsResourceModalOpen(true);
                                      }}
                                      className="text-slate-400 hover:text-amber-600 p-1 rounded"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(act.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
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
                          <td colSpan={13} className="p-4 text-center text-slate-400 italic">
                            No bridge records for this date. Use the bar above to record progress or click "Populate Standard Bridges".
                          </td>
                        </tr>
                      )}

                      {bridgeActivities.length > 0 && (
                        <tr className="bg-slate-100 font-bold text-[10px] text-slate-900 border-b-2 border-slate-300">
                          {isBulkEditMode && <td className="p-1.5 border-r border-slate-200 print:hidden"></td>}
                          <td className="p-1.5 border-r border-slate-300 text-center uppercase tracking-wider text-slate-600 font-bold">
                            Total ({bridgeActivities.length} Structures)
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
                                type="button"
                                onClick={() => handleClearSectionEntries('17')}
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
        );
      })()}
    </div>
  );
};

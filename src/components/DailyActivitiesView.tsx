import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, ChevronLeft, ChevronRight,
  Truck, Trash2, DownloadCloud, X,
  Activity, Sun, AlertTriangle, Package, ClipboardList,
  Calendar, Factory, CheckSquare, Square, Sliders, RefreshCw,
  Check, Printer, RotateCcw, Layers, Filter, CheckCircle2
} from 'lucide-react';
import {
  Project, DailyActivityRecord, User, DailyProductionItem
} from '../types';

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

export function getDefaultUnit(sectionId: string): string {
  if (['1', '2', '10', '11', '12'].includes(sectionId)) return 'km';
  if (['3.1', '3.2', '4', '5'].includes(sectionId)) return 'm³';
  if (['6', '7', '8', '9', '16'].includes(sectionId)) return 'm';
  if (sectionId === '13') return 'pcs';
  if (sectionId === '14') return '%';
  if (sectionId === '15') return 'km';
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
  { id: '14', name: 'RCP Construction', isSpecial: true, metrics: [] },
  { id: '15', name: 'Bridge', metrics: ['Description of Work', 'Station of Work', 'Previous', 'Daily Progress', 'To date', 'Daily Executed (km)'], customLabel: '15' },
  { id: '16', name: 'Ditch Construction', metrics: ['Description of Work', 'Station of Work', 'Side', 'Daily Executed Stretch (m)', 'Volume(m³)', 'Net Daily Executed (km)'], customLabel: '15. Ditch' }
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

  // Dynamic Activity Sections List (Allows deleting from 16 and re-adding)
  const [sections, setSections] = useState<WorkRegisterSectionDef[]>(() => {
    try {
      const stored = localStorage.getItem(`era_active_sections_${project.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return WORK_SECTIONS;
  });

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
  const handleAddRowAt = (sectionId: string, pipeLocationPreset?: string) => {
    const defaultUnit = getDefaultUnit(sectionId);
    const loc = pipeLocationPreset || (sectionId === '14' ? (customPipeLocation || selectedPipeLocation || '200+313') : '');
    const newAct: DailyActivityRecord = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: selectedDate,
      activityType: sectionId,
      activityName: sectionId === '14' ? 'RCP Pipe Construction' : '',
      description: sectionId === '14' ? `RCP Culvert at Stn ${loc} - ${selectedPipeStage}` : '',
      startStationKm: loc,
      pipeLocation: sectionId === '14' ? loc : undefined,
      pipeSelectedStage: sectionId === '14' ? selectedPipeStage : undefined,
      pipeExcavationPct: sectionId === '14' ? 100 : undefined,
      pipeMasonryPct: sectionId === '14' ? 100 : undefined,
      pipePavedWaterwayPct: sectionId === '14' ? 100 : undefined,
      pipeInstallationPct: sectionId === '14' ? 100 : undefined,
      pipeBackfillPct: sectionId === '14' ? 100 : undefined,
      pipePreviousPct: sectionId === '14' ? 100 : undefined,
      pipeDailyProgressPct: sectionId === '14' ? 0 : undefined,
      pipeToDatePct: sectionId === '14' ? 100 : undefined,
      side: 'BHS',
      unit: defaultUnit,
      qcStatus: 'Approved',
      status: 'Draft',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString(),
      equipmentList: [
        { id: 'eq_1', name: 'Equipment Unit', count: 1, status: 'Operating' }
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
      existing.pipeToDatePct = Math.round((exc + mas + paw + ins + bck) / 5);
      if (selectedPipeStageKm > 0) existing.metricKm = selectedPipeStageKm;
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
        unit: '%',
        metricKm: selectedPipeStageKm,
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
      newAct.pipeToDatePct = Math.round((exc + mas + paw + ins + bck) / 5);
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
      side: 'BHS',
      unit: '%',
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
        const copy = { ...a, [stageField]: value, updatedAt: new Date().toISOString() };
        const exc = stageField === 'pipeExcavationPct' ? value : (copy.pipeExcavationPct ?? 100);
        const mas = stageField === 'pipeMasonryPct' ? value : (copy.pipeMasonryPct ?? 100);
        const paw = stageField === 'pipePavedWaterwayPct' ? value : (copy.pipePavedWaterwayPct ?? 100);
        const ins = stageField === 'pipeInstallationPct' ? value : (copy.pipeInstallationPct ?? 100);
        const bck = stageField === 'pipeBackfillPct' ? value : (copy.pipeBackfillPct ?? 100);
        copy.pipeToDatePct = Math.round((exc + mas + paw + ins + bck) / 5);
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
                    const secActivities = currentActivities.filter(a => a.activityType === sec.id);
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
                                    <span>14. RCP Construction (Reinforced Concrete Pipe Culverts)</span>
                                  </h4>
                                  <span className="text-blue-200 text-xs font-normal">
                                    ({secActivities.length} culvert locations active)
                                  </span>
                                </div>

                                {!isReadonly && (
                                  <div className="flex items-center gap-2 print:hidden">
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
                                  </div>
                                )}
                              </div>

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

                                      {/* 4. Daily Executed (km) */}
                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg p-1.5">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">Executed:</span>
                                        <input
                                          type="number"
                                          step="0.005"
                                          value={selectedPipeStageKm}
                                          onChange={e => setSelectedPipeStageKm(parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-bold text-slate-800 outline-none"
                                        />
                                        <span className="text-slate-500 text-[10px]">km</span>
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
                                      <th className="p-2 border-r border-slate-300 w-20 text-center">Daily Executed (km)</th>
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

                                            {/* 11. Daily Executed (km) */}
                                            <td className="p-1 border-r border-slate-200 text-center font-mono">
                                              <input
                                                type="number"
                                                step="0.005"
                                                value={act.metricKm ?? 0}
                                                onChange={e => handleCellUpdate(act.id, 'metricKm', parseFloat(e.target.value) || 0)}
                                                className="w-14 text-center bg-transparent font-mono outline-none"
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
                                          Total ({secActivities.length} Pcs)
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
                                          {totalKm.toFixed(3)} km
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
    </div>
  );
}

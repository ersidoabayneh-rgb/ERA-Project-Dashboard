import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, ChevronLeft, ChevronRight,
  Truck, Users, Trash2,
  DownloadCloud, X, GripVertical, Activity, HardHat,
  Sun, CheckCircle2, AlertTriangle, Package, ClipboardList,
  Calendar, Factory, Flame, ShieldAlert,
  Layers, ChevronDown, RefreshCw, FileX, Sliders
} from 'lucide-react';

// Drag & Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

export const INITIAL_WORK_REGISTER_SECTIONS: WorkRegisterSectionDef[] = [
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

export const PRESET_SITE_CHALLENGES = [
  '1. Traffic management problem, dust arousal along active section',
  '2. Shortage of Equipment / Machinery / Cement on site',
  '3. Shortage of Water Trucks hinders the Earthwork activity',
  '4. Inspection is facing serious difficulty due to vehicle shortage',
  '5. Right-of-Way (ROW) obstruction at Station 210+400',
  '6. Heavy afternoon rainfall delayed asphalt laying operations'
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

export const NO_WORK_REASONS = [
  '🌧️ Inclement Weather / Heavy Rain / Site Inundation',
  '🚜 Mechanical Fleet Breakdown / Equipment Maintenance',
  '🛑 Material Supply Shortage (Cement / Bitumen / Fuel)',
  '🚧 Right-of-Way (ROW) / Land Dispute Access Blockage',
  '🏛️ Public Holiday / Scheduled Sunday Rest Day',
  '⚠️ Safety Halt / Security Restriction / Force Majeure',
  '📝 Custom Reason (Specify in notes)'
];

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  isReadonly?: boolean;
  key?: React.Key;
}

function SortableRow({ id, children, isReadonly }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="text-[10px] text-center border-b border-slate-900 bg-white hover:bg-slate-50 text-slate-900 transition-colors">
      {!isReadonly && (
        <td className="p-1 border-r border-slate-900 bg-slate-100/60 w-6 print:hidden">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 transition p-0.5"
            title="Drag to reorder"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        </td>
      )}
      {children}
    </tr>
  );
}

export default function DailyActivitiesView({
  project,
  onUpdateProject,
  isReadonly = false,
}: DailyActivitiesViewProps) {
  // Derived state
  const activities = useMemo(() => Array.isArray(project.dailyActivities) ? project.dailyActivities : [], [project.dailyActivities]);

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // View States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Sunny');
  const [shift, setShift] = useState('Day Shift (Standard)');

  // Dynamic Custom Sections
  const [sections, setSections] = useState<WorkRegisterSectionDef[]>(() => {
    try {
      const stored = localStorage.getItem(`era_custom_sections_${project.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_WORK_REGISTER_SECTIONS;
  });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DailyActivityRecord | null>(null);
  
  // Custom Section Modal
  const [isCustomSectionModalOpen, setIsCustomSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionCode, setNewSectionCode] = useState('');

  // No Work / Standstill Day State
  const [isNoWorkDay, setIsNoWorkDay] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_day_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return false;
  });

  const [standstillReason, setStandstillReason] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_reason_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return NO_WORK_REASONS[0];
  });

  const [standstillNotes, setStandstillNotes] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`era_no_work_notes_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return '';
  });

  // Consultant label logic based on Contract Type (DB vs DBB)
  const consultantRoleLabel = project.contractType === 'DBB'
    ? 'Supervision Consultant'
    : "Employer's Representative";

  // Production Table Storage
  const [productionList, setProductionList] = useState<DailyProductionItem[]>(() => {
    try {
      const stored = localStorage.getItem(`era_site_production_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'p1', facilityName: 'Asphalt Batching Plant @ Ch. 203+400', itemProduced: 'Asphalt Concrete AC 60/70', unit: 'Tons', targetOutput: 450, actualOutput: 380, previousCumulative: 14200, operatingHours: 7.5, efficiencyPct: 84.4, remarks: 'Continuous operation' },
      { id: 'p2', facilityName: 'Concrete Batching Plant #1', itemProduced: 'C-30 Structure / Culvert Concrete', unit: 'm³', targetOutput: 120, actualOutput: 95, previousCumulative: 3100, operatingHours: 6.0, efficiencyPct: 79.2, remarks: 'Poured at Bridge #2' },
      { id: 'p3', facilityName: 'Primary Stone Crusher Unit', itemProduced: 'Crushed Base Aggregate (0-31.5mm)', unit: 'm³', targetOutput: 800, actualOutput: 720, previousCumulative: 42500, operatingHours: 8.0, efficiencyPct: 90.0, remarks: 'Quarry Station B' },
      { id: 'p4', facilityName: 'Precast RCP Yard', itemProduced: 'Precast RCP Ø1000mm Pipes', unit: 'Pcs', targetOutput: 40, actualOutput: 35, previousCumulative: 890, operatingHours: 8.0, efficiencyPct: 87.5, remarks: 'Curing chamber 2' },
    ];
  });

  // Problems & Challenges Log State
  const [siteChallenges, setSiteChallenges] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`era_site_challenges_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [...PRESET_SITE_CHALLENGES.slice(0, 4)];
  });

  // Material Tracker Local Storage
  const [materialsList, setMaterialsList] = useState<Array<{ id: string; material: string; received: number; used: number; remarks: string }>>(() => {
    try {
      const stored = localStorage.getItem(`era_site_materials_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'm1', material: 'Portland Cement (42.5N Grade)', received: 150, used: 85, remarks: 'Delivered from Messobo' },
      { id: 'm2', material: 'Crushed Base Aggregate (0-31.5mm)', received: 500, used: 320, remarks: 'From Quarry #2' },
      { id: 'm3', material: 'Asphalt Bitumen (60/70 Penetration)', received: 40, used: 25, remarks: 'Heating plant active' }
    ];
  });

  // Tomorrow Work Plan Storage
  const [tomorrowPlans, setTomorrowPlans] = useState<Array<{ id: string; area: string; description: string; unit: string; target: number; remarks: string }>>(() => {
    try {
      const stored = localStorage.getItem(`era_tomorrow_plans_${project.id}_${selectedDate}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'p1', area: 'Km 209+880 - 210+080', description: 'Mixing, Placing & Rolling of Sub-Base', unit: 'm³', target: 460, remarks: 'Requires 2 rollers' },
      { id: 'p2', area: 'Km 200+313', description: 'Pipe Installation and Backfill', unit: 'm', target: 25, remarks: 'Crane assigned' }
    ];
  });

  // Load date specific data when selectedDate changes
  useEffect(() => {
    try {
      const storedNoWork = localStorage.getItem(`era_no_work_day_${project.id}_${selectedDate}`);
      setIsNoWorkDay(storedNoWork ? JSON.parse(storedNoWork) : false);

      const storedReason = localStorage.getItem(`era_no_work_reason_${project.id}_${selectedDate}`);
      if (storedReason) setStandstillReason(JSON.parse(storedReason));

      const storedNotes = localStorage.getItem(`era_no_work_notes_${project.id}_${selectedDate}`);
      if (storedNotes) setStandstillNotes(JSON.parse(storedNotes));

      const storedProd = localStorage.getItem(`era_site_production_${project.id}_${selectedDate}`);
      if (storedProd) setProductionList(JSON.parse(storedProd));

      const storedChallenges = localStorage.getItem(`era_site_challenges_${project.id}_${selectedDate}`);
      if (storedChallenges) setSiteChallenges(JSON.parse(storedChallenges));

      const storedMaterials = localStorage.getItem(`era_site_materials_${project.id}_${selectedDate}`);
      if (storedMaterials) setMaterialsList(JSON.parse(storedMaterials));

      const storedPlans = localStorage.getItem(`era_tomorrow_plans_${project.id}_${selectedDate}`);
      if (storedPlans) setTomorrowPlans(JSON.parse(storedPlans));
    } catch {}
  }, [selectedDate, project.id]);

  // Persist local states
  useEffect(() => {
    try {
      localStorage.setItem(`era_no_work_day_${project.id}_${selectedDate}`, JSON.stringify(isNoWorkDay));
      localStorage.setItem(`era_no_work_reason_${project.id}_${selectedDate}`, JSON.stringify(standstillReason));
      localStorage.setItem(`era_no_work_notes_${project.id}_${selectedDate}`, JSON.stringify(standstillNotes));
      localStorage.setItem(`era_site_production_${project.id}_${selectedDate}`, JSON.stringify(productionList));
      localStorage.setItem(`era_site_challenges_${project.id}_${selectedDate}`, JSON.stringify(siteChallenges));
      localStorage.setItem(`era_site_materials_${project.id}_${selectedDate}`, JSON.stringify(materialsList));
      localStorage.setItem(`era_tomorrow_plans_${project.id}_${selectedDate}`, JSON.stringify(tomorrowPlans));
      localStorage.setItem(`era_custom_sections_${project.id}`, JSON.stringify(sections));
    } catch {}
  }, [isNoWorkDay, standstillReason, standstillNotes, productionList, siteChallenges, materialsList, tomorrowPlans, sections, project.id, selectedDate]);

  /**
   * ARCHIVE LOGIC
   * Automatically archive records from previous days that are still in 'Draft' status.
   */
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const needsArchiving = activities.some(a => a.date < today && (!a.status || a.status === 'Draft'));
    
    if (needsArchiving) {
      const archived = activities.map(a => 
        (a.date < today && (!a.status || a.status === 'Draft')) 
          ? { ...a, status: 'Archived', updatedAt: new Date().toISOString() } 
          : a
      );
      onUpdateProject({ ...project, dailyActivities: archived }, 'Auto-archived previous daily logs');
    }
  }, [activities, project, onUpdateProject]);

  const handleDateNav = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Dynamic Summary Aggregation for Selected Date
  const dailySummaryStats = useMemo(() => {
    const currentActivities = activities.filter(a => a.date === selectedDate);
    
    let activeEquipment = 0;
    let standbyEquipment = 0;
    let breakdownEquipment = 0;
    let totalEquipment = 0;
    let totalPersonnel = 0;

    currentActivities.forEach(act => {
      if (Array.isArray(act.equipmentList)) {
        act.equipmentList.forEach(eq => {
          const count = Number(eq.count) || 0;
          totalEquipment += count;
          if (eq.status === 'Operating' || !eq.status) {
            activeEquipment += count;
          } else if (eq.status === 'Standby') {
            standbyEquipment += count;
          } else if (eq.status === 'Breakdown' || eq.status === 'Maintenance') {
            breakdownEquipment += count;
          }
        });
      }

      if (Array.isArray(act.laborSummary)) {
        act.laborSummary.forEach(lab => {
          totalPersonnel += Number(lab.count) || 0;
        });
      }
    });

    return {
      activeEquipment,
      standbyEquipment,
      breakdownEquipment,
      totalEquipment,
      totalPersonnel,
      totalActivities: currentActivities.length
    };
  }, [activities, selectedDate]);

  // Aggregations for Previous Totals (RCP Production & Bridge)
  const aggregations = useMemo(() => {
    const prevActivities = activities.filter(a => a.date < selectedDate);
    
    const rcpProductionPrev = prevActivities
      .filter(a => a.activityType === '13')
      .reduce((sum, a) => sum + (Number(a.pcsThisDay) || 0), 0);

    const bridgePrev = prevActivities
      .filter(a => a.activityType === '15')
      .reduce((sum, a) => sum + (Number(a.bridgeDailyProgress) || 0), 0);

    return { rcpProductionPrev, bridgePrev };
  }, [activities, selectedDate]);

  // Handlers
  const handleAddRowAt = (sectionId: string, index?: number) => {
    const newAct: DailyActivityRecord = {
      id: 'act_' + Date.now(),
      date: selectedDate,
      activityType: sectionId,
      activityName: '',
      description: '',
      startStationKm: '',
      side: 'BHS',
      qcStatus: 'Pending',
      status: 'Draft',
      weatherCondition: weather,
      workingHours: 8.0,
      createdAt: new Date().toISOString(),
      equipmentList: [
        { id: 'eq_1', name: 'Bulldozer / Excavator', count: 1, status: 'Operating' }
      ],
      laborSummary: [
        { category: 'Unskilled Labor / Flagmen', count: 2 }
      ]
    };

    let updatedList = [...activities];
    if (typeof index === 'number') {
      updatedList.splice(index, 0, newAct);
    } else {
      const lastIdx = activities.map((a, i) => a.activityType === sectionId ? i : -1).reduce((a, b) => Math.max(a, b), -1);
      if (lastIdx > -1) {
        updatedList.splice(lastIdx + 1, 0, newAct);
      } else {
        updatedList.push(newAct);
      }
    }
    
    // Auto turn off no-work day if adding a row
    if (isNoWorkDay) setIsNoWorkDay(false);

    onUpdateProject({ ...project, dailyActivities: updatedList }, `Added row to section ${sectionId}`);
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

    const updatedSecs = [...sections, newSec];
    setSections(updatedSecs);
    setNewSectionName('');
    setNewSectionCode('');
    setIsCustomSectionModalOpen(false);
    
    // Add initial row to custom section
    handleAddRowAt(code);
  };

  const handleEditRowResources = (act: DailyActivityRecord) => {
    setEditingActivity({ ...act });
    setIsEditModalOpen(true);
  };

  const handleDeleteRow = (id: string) => {
    if (!confirm('Delete this record?')) return;
    const updated = activities.filter(a => a.id !== id);
    onUpdateProject({ ...project, dailyActivities: updated }, 'Deleted activity record');
  };

  const handleSaveModal = () => {
    if (!editingActivity) return;
    let updatedList = [...activities];
    const existingIndex = updatedList.findIndex(a => a.id === editingActivity.id);
    if (existingIndex > -1) {
      updatedList[existingIndex] = { ...editingActivity, updatedAt: new Date().toISOString() };
    } else {
      updatedList.push(editingActivity);
    }
    onUpdateProject({ ...project, dailyActivities: updatedList }, `Saved resource deployment for section ${editingActivity.activityType}`);
    setIsEditModalOpen(false);
  };

  const handleCellUpdate = (id: string, field: keyof DailyActivityRecord, value: any) => {
    const updated = activities.map(a => {
      if (a.id === id) {
        let newAct = { ...a, [field]: value, updatedAt: new Date().toISOString() };
        
        // Auto-conversions for m/km
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
    onUpdateProject({ ...project, dailyActivities: updated }, `Updated ${field}`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex(a => a.id === active.id);
    const newIndex = activities.findIndex(a => a.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const updated = arrayMove(activities, oldIndex, newIndex) as DailyActivityRecord[];
      onUpdateProject({ ...project, dailyActivities: updated }, 'Reordered activities');
    }
  };

  // Cumulative Totals Calculation: Sum of Previous Daily Activities + Current Date for each section
  const getSectionCumulativeTotals = (sectionId: string) => {
    const currentActivities = activities.filter(a => a.date === selectedDate && a.activityType === sectionId);
    const previousActivities = activities.filter(a => a.date < selectedDate && a.activityType === sectionId);

    let previousMetric1 = 0;
    let previousMetric2 = 0;
    let currentMetric1 = 0;
    let currentMetric2 = 0;

    currentActivities.forEach(a => {
      if (['1','2','6','7','8','9','10','11','12','16'].includes(sectionId)) {
        currentMetric1 += Number(a.metricM) || 0;
        currentMetric2 += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        currentMetric1 += Number(a.layerProgress) || Number(a.layerNr) || 0;
        currentMetric2 += Number(a.metricM3) || 0;
      } else if (sectionId === '13') {
        currentMetric1 += Number(a.pcsThisDay) || 0;
        currentMetric2 += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '15') {
        currentMetric2 += Number(a.bridgeDailyProgress) || 0;
      } else {
        // Custom sections
        currentMetric1 += Number(a.metricM) || 0;
        currentMetric2 += Number(a.metricKm) || 0;
      }
    });

    previousActivities.forEach(a => {
      if (['1','2','6','7','8','9','10','11','12','16'].includes(sectionId)) {
        previousMetric1 += Number(a.metricM) || 0;
        previousMetric2 += Number(a.metricKm) || Number(a.metricM3) || 0;
      } else if (['3.1','3.2','4','5'].includes(sectionId)) {
        previousMetric1 += Number(a.layerProgress) || Number(a.layerNr) || 0;
        previousMetric2 += Number(a.metricM3) || 0;
      } else if (sectionId === '13') {
        previousMetric1 += Number(a.pcsThisDay) || 0;
        previousMetric2 += Number(a.pcsThisDay) || 0;
      } else if (sectionId === '15') {
        previousMetric2 += Number(a.bridgeDailyProgress) || 0;
      } else {
        // Custom sections
        previousMetric1 += Number(a.metricM) || 0;
        previousMetric2 += Number(a.metricKm) || 0;
      }
    });

    return {
      previousMetric1,
      previousMetric2,
      currentMetric1,
      currentMetric2,
      cumulativeMetric1: previousMetric1 + currentMetric1,
      cumulativeMetric2: previousMetric2 + currentMetric2
    };
  };

  // Helper function to count resources on a row
  const getRowResourceCounts = (act: DailyActivityRecord) => {
    const eqCount = Array.isArray(act.equipmentList) 
      ? act.equipmentList.reduce((acc, eq) => acc + (Number(eq.count) || 0), 0) 
      : 0;
    const laborCount = Array.isArray(act.laborSummary) 
      ? act.laborSummary.reduce((acc, lab) => acc + (Number(lab.count) || 0), 0) 
      : 0;
    return { eqCount, laborCount };
  };

  // Rendering Helper for Rows
  const renderSectionRows = (section: WorkRegisterSectionDef) => {
    const sectionActivities = activities.filter(a => a.date === selectedDate && a.activityType === section.id);
    const totals = getSectionCumulativeTotals(section.id);

    if (section.isSpecial && section.id === '14') {
      const totalPrevious = sectionActivities.reduce((sum, act) => {
         const pipePrevProgress = activities
           .filter(a => a.date < selectedDate && a.activityType === '14' && a.pipeLocation === act.pipeLocation)
           .reduce((s, a) => s + (Number(a.pipeDailyProgressPct) || 0), 0);
         return sum + pipePrevProgress;
      }, 0);
      const totalDaily = sectionActivities.reduce((sum, a) => sum + (Number(a.pipeDailyProgressPct) || 0), 0);

      return (
        <SortableContext items={sectionActivities.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <tr className="bg-slate-100 font-bold text-[10px] text-center border-b border-slate-900">
            {!isReadonly && <th className="border-r border-slate-900 w-6 print:hidden"></th>}
            <th className="border-r border-slate-900 p-2 w-[15%]">Pipe Location</th>
            <th className="border-r border-slate-900 p-2">Excavation</th>
            <th className="border-r border-slate-900 p-2">Masonry inlet/outlet</th>
            <th className="border-r border-slate-900 p-2">Paved Water way</th>
            <th className="border-r border-slate-900 p-2">Pipe Installation</th>
            <th className="border-r border-slate-900 p-2">Back fill</th>
            <th className="border-r border-slate-900 p-2 text-slate-600">Previous Total</th>
            <th className="border-r border-slate-900 p-2 text-blue-700">Daily Progress</th>
            <th className="p-2 text-rose-600 font-black">Cumulative Total (To date)</th>
            {!isReadonly && <th className="border-l border-slate-900 w-24 print:hidden"></th>}
          </tr>
          {sectionActivities.map((act) => {
            const pipePrevProgress = activities
              .filter(a => a.date < selectedDate && a.activityType === '14' && a.pipeLocation === act.pipeLocation)
              .reduce((sum, a) => sum + (Number(a.pipeDailyProgressPct) || 0), 0);
            
            const { eqCount, laborCount } = getRowResourceCounts(act);

            return (
              <SortableRow key={act.id} id={act.id} isReadonly={isReadonly}>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" value={act.pipeLocation || ''} placeholder="Station Km..." onChange={e => handleCellUpdate(act.id, 'pipeLocation', e.target.value)} /></td>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" placeholder="%" type="number" value={act.pipeExcavationPct || 0} onChange={e => handleCellUpdate(act.id, 'pipeExcavationPct', parseFloat(e.target.value))} /></td>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" placeholder="%" type="number" value={act.pipeMasonryPct || 0} onChange={e => handleCellUpdate(act.id, 'pipeMasonryPct', parseFloat(e.target.value))} /></td>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" placeholder="%" type="number" value={act.pipePavedWaterwayPct || 0} onChange={e => handleCellUpdate(act.id, 'pipePavedWaterwayPct', parseFloat(e.target.value))} /></td>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" placeholder="%" type="number" value={act.pipeInstallationPct || 0} onChange={e => handleCellUpdate(act.id, 'pipeInstallationPct', parseFloat(e.target.value))} /></td>
                <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" placeholder="%" type="number" value={act.pipeBackfillPct || 0} onChange={e => handleCellUpdate(act.id, 'pipeBackfillPct', parseFloat(e.target.value))} /></td>
                <td className="border-r border-slate-900 p-1 font-bold text-slate-500">{pipePrevProgress.toFixed(1)}%</td>
                <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.pipeDailyProgressPct || 0} onChange={e => handleCellUpdate(act.id, 'pipeDailyProgressPct', parseFloat(e.target.value))} /></td>
                <td className="p-1 text-rose-600 font-black">{(pipePrevProgress + (act.pipeDailyProgressPct || 0)).toFixed(1)}%</td>
                {!isReadonly && (
                  <td className="border-l border-slate-900 p-1 print:hidden">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleEditRowResources(act)} 
                        title="Manage Deployed Resources" 
                        className="flex items-center gap-0.5 text-[8px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-1 py-0.5 rounded font-black transition"
                      >
                        <Truck className="w-2.5 h-2.5" />
                        <span>{eqCount}</span>
                        <Users className="w-2.5 h-2.5 ml-0.5" />
                        <span>{laborCount}</span>
                      </button>
                      <button onClick={() => handleAddRowAt(section.id, activities.findIndex(a => a.id === act.id) + 1)} title="Insert Below" className="text-emerald-600 hover:bg-emerald-50 p-0.5 rounded transition"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => handleDeleteRow(act.id)} title="Delete Row" className="text-rose-400 hover:text-rose-600 p-0.5 rounded transition"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                )}
              </SortableRow>
            );
          })}
          {/* Section 14 Totals */}
          <tr className="bg-slate-100 font-black text-[10px] text-center border-b border-slate-900">
             <td className="border-r border-slate-900 p-1 uppercase" colSpan={isReadonly ? 6 : 7}>Total (Previous + Current Date)</td>
             <td className="border-r border-slate-900 p-1 text-slate-600">{totalPrevious.toFixed(2)}%</td>
             <td className="border-r border-slate-900 p-1 text-blue-700">{totalDaily.toFixed(2)}%</td>
             <td className="p-1 text-rose-600 font-black">{(totalPrevious + totalDaily).toFixed(2)}%</td>
             {!isReadonly && <td className="border-l border-slate-900 print:hidden"></td>}
          </tr>
          {!isReadonly && (
            <tr className="print:hidden">
              <td colSpan={isReadonly ? 10 : 11} className="p-1 text-center bg-slate-50/20 border-b border-slate-900">
                <button onClick={() => handleAddRowAt(section.id)} className="text-[9px] text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto py-0.5">
                  <Plus className="w-3 h-3" /> Append Row to Section {section.id}
                </button>
              </td>
            </tr>
          )}
        </SortableContext>
      );
    }

    return (
      <SortableContext items={sectionActivities.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <tr className="bg-slate-100 font-bold text-[10px] text-center border-b border-slate-900">
          {!isReadonly && <th className="border-r border-slate-900 w-6 print:hidden"></th>}
          {section.metrics.map((m: string, i: number) => (
            <th key={i} className={`p-2 border-r border-slate-900 last:border-r-0 ${i === 0 ? 'w-[35%]' : ''}`}>{m}</th>
          ))}
          {!isReadonly && <th className="border-l border-slate-900 w-24 print:hidden"></th>}
        </tr>
        {sectionActivities.length > 0 ? sectionActivities.map((act) => {
          const { eqCount, laborCount } = getRowResourceCounts(act);

          return (
            <SortableRow key={act.id} id={act.id} isReadonly={isReadonly}>
              <td className="border-r border-slate-900 p-1"><input className="w-full bg-transparent outline-none font-medium" value={act.description || ''} placeholder="Work description..." onChange={e => handleCellUpdate(act.id, 'description', e.target.value)} /></td>
              <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent font-mono outline-none font-medium" placeholder="0+000" value={act.startStationKm || ''} onChange={e => handleCellUpdate(act.id, 'startStationKm', e.target.value)} /></td>
              <td className="border-r border-slate-900 p-1">
                <select 
                  value={act.side || 'BHS'} 
                  onChange={e => handleCellUpdate(act.id, 'side', e.target.value)}
                  className="w-full text-center bg-transparent outline-none font-bold text-[9px] cursor-pointer"
                >
                  <option value="BHS">BHS (Both)</option>
                  <option value="LHS">LHS (Left)</option>
                  <option value="RHS">RHS (Right)</option>
                  <option value="CL">CL (Center)</option>
                </select>
              </td>
              
              {section.id === '1' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.metricM || 0} onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                   <td className="p-1 text-rose-600 font-bold">{((act.metricKm || 0) * 0.5).toFixed(2)}</td>
                 </>
              )}
              {section.id === '2' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent font-bold text-blue-600 outline-none" type="number" value={act.metricM || 0} onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {section.id === '3.1' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" value={act.remarks || ''} placeholder="Progress..." onChange={e => handleCellUpdate(act.id, 'remarks', e.target.value)} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {section.id === '3.2' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.layerNr || 0} onChange={e => handleCellUpdate(act.id, 'layerNr', parseInt(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {section.id === '4' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" value={act.remarks || ''} placeholder="Progress..." onChange={e => handleCellUpdate(act.id, 'remarks', e.target.value)} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {section.id === '5' && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.layerProgress || 0} onChange={e => handleCellUpdate(act.id, 'layerProgress', parseInt(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {(['6','7','8','9','16'].includes(section.id)) && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.metricM || 0} onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {(['10','11','12'].includes(section.id)) && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.metricM || 0} onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricKm || 0} onChange={e => handleCellUpdate(act.id, 'metricKm', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              {section.id === '13' && (
                 <>
                   <td className="border-r border-slate-900 p-1 font-bold text-blue-600"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.pcsThisDay || 0} onChange={e => handleCellUpdate(act.id, 'pcsThisDay', parseInt(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 font-bold text-slate-500">{aggregations.rcpProductionPrev}</td>
                   <td className="p-1 text-rose-600 font-bold">{(act.pcsThisDay || 0) + aggregations.rcpProductionPrev} pcs</td>
                 </>
              )}
              {section.id === '15' && (
                 <>
                   <td className="border-r border-slate-900 p-1 font-bold text-slate-500">{aggregations.bridgePrev.toFixed(2)}</td>
                   <td className="border-r border-slate-900 p-1 text-blue-600 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.bridgeDailyProgress || 0} onChange={e => handleCellUpdate(act.id, 'bridgeDailyProgress', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(aggregations.bridgePrev + (act.bridgeDailyProgress || 0)).toFixed(2)}</td>
                 </>
              )}
              {section.isCustom && (
                 <>
                   <td className="border-r border-slate-900 p-1"><input className="w-full text-center bg-transparent outline-none font-medium" type="number" value={act.metricM || 0} onChange={e => handleCellUpdate(act.id, 'metricM', parseFloat(e.target.value))} /></td>
                   <td className="border-r border-slate-900 p-1 text-blue-700 font-bold"><input className="w-full text-center bg-transparent outline-none font-bold" type="number" value={act.metricM3 || 0} onChange={e => handleCellUpdate(act.id, 'metricM3', parseFloat(e.target.value))} /></td>
                   <td className="p-1 text-rose-600 font-bold">{(act.metricKm || 0).toFixed(2)}</td>
                 </>
              )}
              
              {!isReadonly && (
                <td className="border-l border-slate-900 p-1 print:hidden">
                   <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => handleEditRowResources(act)} 
                      title="Manage Deployed Resources" 
                      className="flex items-center gap-0.5 text-[8px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-1 py-0.5 rounded font-black transition"
                    >
                      <Truck className="w-2.5 h-2.5" />
                      <span>{eqCount}</span>
                      <Users className="w-2.5 h-2.5 ml-0.5" />
                      <span>{laborCount}</span>
                    </button>
                    <button onClick={() => handleAddRowAt(section.id, activities.findIndex(a => a.id === act.id) + 1)} title="Insert Row Below" className="text-emerald-600 hover:bg-emerald-50 p-0.5 rounded transition"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => handleDeleteRow(act.id)} title="Delete Row" className="text-rose-400 hover:text-rose-600 p-0.5 rounded transition"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              )}
            </SortableRow>
          );
        }) : (
          <tr className="text-[10px] text-center italic text-slate-400">
            <td colSpan={section.metrics.length + (isReadonly ? 1 : 2)} className="p-2 border-b border-slate-900">
              <span>No entries for this section</span>
              {!isReadonly && (
                <button onClick={() => handleAddRowAt(section.id)} className="ml-2 text-blue-600 underline font-bold not-italic print:hidden">
                  + Add Entry
                </button>
              )}
            </td>
          </tr>
        )}

        {/* Section Totals: Sum of Previous + Current Date */}
        {sectionActivities.length > 0 && (
           <tr className="text-[10px] text-center border-b border-slate-900 bg-slate-100 font-black">
              <td className="border-r border-slate-900 uppercase p-1" colSpan={isReadonly ? 3 : 4}>Total (Previous + Current Date)</td>
              <td className="border-r border-slate-900 p-1 text-slate-600">
                {totals.previousMetric2 > 0 ? (section.id === '13' ? `${totals.previousMetric2} pcs` : totals.previousMetric2.toFixed(section.id === '15' ? 2 : 2)) : '0.00'}
              </td>
              <td className="border-r border-slate-900 p-1 text-blue-700">
                {totals.currentMetric2 > 0 ? (section.id === '13' ? `${totals.currentMetric2} pcs` : totals.currentMetric2.toFixed(section.id === '15' ? 2 : 2)) : '0.00'}
              </td>
              <td className="p-1 text-rose-600 font-black">
                {totals.cumulativeMetric2 > 0 ? (section.id === '13' ? `${totals.cumulativeMetric2} pcs` : totals.cumulativeMetric2.toFixed(section.id === '15' ? 2 : 2)) : '0.00'}
              </td>
              {!isReadonly && <td className="border-l border-slate-900 print:hidden"></td>}
           </tr>
        )}

        {!isReadonly && (
          <tr className="print:hidden">
            <td colSpan={section.metrics.length + 2} className="p-1 text-center bg-slate-50/20 border-b border-slate-900">
              <button onClick={() => handleAddRowAt(section.id)} className="text-[9px] text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto py-0.5">
                <Plus className="w-3 h-3" /> Append Row to Section {section.id}
              </button>
            </td>
          </tr>
        )}
      </SortableContext>
    );
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen p-4 md:p-6 font-sans text-slate-900 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] bg-[#f1f5f9] dark:bg-slate-950 transition-colors">
        <div className="max-w-[1120px] mx-auto space-y-4">
          
          {/* ATTRACTIVE HERO HEADER BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-2xl border border-slate-700/60 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <span>UNIFIED DAILY PROJECT PROGRESS REPORT</span>
                  </h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    ERA Civil Standard
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Merged ERA Work Register, Plant Production & Site Engineer Operational System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {!isReadonly && (
                <button 
                  onClick={() => setIsCustomSectionModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-blue-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>INSERT CUSTOM SECTION</span>
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>EXPORT / PRINT DPR</span>
              </button>
            </div>
          </div>

          {/* TOP SUMMARY KPI STRIP - Aggregates Active Equipment, Personnel & Operational Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 print:hidden">
            {/* Active Equipment KPI Card */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-blue-400 text-[10px] uppercase font-black tracking-wider">
                  <Truck className="w-3.5 h-3.5" /> Active Equipment
                </div>
                <div className="text-2xl font-black mt-1 tracking-tight text-white flex items-baseline gap-2">
                  <span>{dailySummaryStats.activeEquipment}</span>
                  <span className="text-[10px] font-semibold text-slate-400">units operating</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                  {dailySummaryStats.standbyEquipment > 0 && `${dailySummaryStats.standbyEquipment} standby · `}
                  {dailySummaryStats.breakdownEquipment > 0 ? `${dailySummaryStats.breakdownEquipment} down` : '100% operational'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Total Personnel KPI Card */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase font-black tracking-wider">
                  <Users className="w-3.5 h-3.5" /> Total Personnel
                </div>
                <div className="text-2xl font-black mt-1 tracking-tight text-white flex items-baseline gap-2">
                  <span>{dailySummaryStats.totalPersonnel}</span>
                  <span className="text-[10px] font-semibold text-slate-400">on site today</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Engineers, Foremen & Crew</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
            </div>

            {/* Production Plants KPI Card */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-lg flex items-center justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-purple-400 text-[10px] uppercase font-black tracking-wider">
                  <Factory className="w-3.5 h-3.5" /> Production Facilities
                </div>
                <div className="text-2xl font-black mt-1 tracking-tight text-white flex items-baseline gap-2">
                  <span>{productionList.length}</span>
                  <span className="text-[10px] font-semibold text-slate-400">plants tracked</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Asphalt, Batching & Crusher Plants</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            {/* Weather, Date & Day Status Controls */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-amber-400">
                <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5" /> Date & Day Mode</span>
                <button 
                  onClick={() => setIsNoWorkDay(!isNoWorkDay)}
                  className={`text-[8px] border px-2 py-0.5 rounded font-black uppercase transition ${
                    isNoWorkDay ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {isNoWorkDay ? '⚠️ Standstill Day' : '🟢 Work Active'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <button onClick={() => handleDateNav(-1)} className="p-1 hover:bg-slate-800 rounded transition text-slate-300" title="Previous Day"><ChevronLeft className="w-4 h-4" /></button>
                <div className="text-center">
                  <div className="text-xs font-black text-white">{selectedDate}</div>
                  <select 
                    value={weather} 
                    onChange={e => setWeather(e.target.value)}
                    className="text-[9px] font-bold text-amber-400 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="Sunny" className="bg-slate-900 text-amber-400">☀️ Sunny</option>
                    <option value="Sunny & Cloudy" className="bg-slate-900 text-amber-400">🌤️ Sunny & Cloudy</option>
                    <option value="Rainy" className="bg-slate-900 text-blue-400">🌧️ Heavy Rain</option>
                    <option value="Overcast" className="bg-slate-900 text-slate-300">☁️ Overcast</option>
                    <option value="Windy" className="bg-slate-900 text-amber-200">💨 Windy / Dusty</option>
                  </select>
                </div>
                <button onClick={() => handleDateNav(1)} className="p-1 hover:bg-slate-800 rounded transition text-slate-300" title="Next Day"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* STANDSTILL DAY BANNER IF TOGGLED OR NO ACTIVITY RECORDED */}
          {isNoWorkDay && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-sm space-y-3"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 font-black">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-tight flex items-center gap-2">
                      <span>NO CONSTRUCTION ACTIVITY RECORDED FOR THIS DAY</span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-black">Site Standstill</span>
                    </h3>
                    <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                      Date: {selectedDate} · All previous cumulative progress values are preserved without increment.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsNoWorkDay(false)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resume Recording Work</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    Select Standstill Reason / Cause:
                  </label>
                  <select 
                    value={standstillReason}
                    onChange={e => setStandstillReason(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 font-bold text-amber-900 outline-none focus:border-amber-600 transition"
                  >
                    {NO_WORK_REASONS.map((r, ri) => (
                      <option key={ri} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    Site Conditions & Observations:
                  </label>
                  <input 
                    value={standstillNotes}
                    onChange={e => setStandstillNotes(e.target.value)}
                    placeholder="Enter detailed site engineer observations regarding standstill..."
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 font-medium text-slate-800 outline-none focus:border-amber-600 transition text-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* MAIN UNIFIED SINGLE PAGE PAPER CONTAINER */}
          <div className="bg-white shadow-2xl border border-slate-300 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
            
            {/* 1. EDITABLE HEADER BRANDING - Dynamic with Project Info Page */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-black uppercase">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 min-w-[130px]">Employer / Client:</span>
                  <input 
                    value={project.client || ''} 
                    onChange={e => onUpdateProject({ ...project, client: e.target.value }, 'Updated Client')}
                    placeholder="Ethiopian Roads Administration (ERA)"
                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-blue-900 font-bold outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-rose-600 min-w-[130px]">{consultantRoleLabel}:</span>
                  <input 
                    value={project.consultant || project.supervisionConsultant?.firmName || ''} 
                    onChange={e => onUpdateProject({ 
                      ...project, 
                      consultant: e.target.value,
                      supervisionConsultant: project.supervisionConsultant ? { ...project.supervisionConsultant, firmName: e.target.value } : undefined 
                    }, 'Updated Consultant')}
                    placeholder="Associated Engineering Consultants (AEC)"
                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-emerald-800 font-bold outline-none focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 min-w-[100px]">Contractor:</span>
                  <input 
                    value={project.contractor || ''} 
                    onChange={e => onUpdateProject({ ...project, contractor: e.target.value }, 'Updated Contractor')}
                    placeholder="Welabu Construction SC"
                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-900 font-bold outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 min-w-[100px]">Project Name:</span>
                  <input 
                    value={project.name || ''} 
                    onChange={e => onUpdateProject({ ...project, name: e.target.value }, 'Updated Project Name')}
                    placeholder="Daye-Chiri-Nansebo Road Project"
                    className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-900 font-black outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* REGISTER TITLE */}
            <div className="bg-slate-300 text-center py-1.5 border-y border-slate-900 text-[12px] font-black tracking-widest uppercase flex justify-between items-center px-4">
              <span>DAILY WORK REGISTER & SITE ENGINEER REPORT</span>
              <span className="text-[10px] text-slate-700 font-bold">{selectedDate}</span>
            </div>

            {/* DATE, SHIFT & WEATHER ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-900">
              <div className="flex items-center gap-2 p-1.5 bg-yellow-400 border-b md:border-b-0 md:border-r border-slate-900">
                <span className="text-[10px] font-black uppercase pl-2">Date:</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDateNav(-1)} className="p-1 hover:bg-black/10 rounded transition print:hidden"><ChevronLeft className="w-4 h-4" /></button>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    className="text-[11px] font-black bg-transparent outline-none w-28 cursor-pointer"
                  />
                  <button onClick={() => handleDateNav(1)} className="p-1 hover:bg-black/10 rounded transition print:hidden"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 pl-4 border-b md:border-b-0 md:border-r border-slate-900">
                <span className="text-[10px] font-black uppercase">Weather Conditions:</span>
                <select 
                  value={weather} 
                  onChange={e => setWeather(e.target.value)}
                  className="text-[11px] font-black text-rose-600 bg-transparent outline-none flex-1 cursor-pointer"
                >
                  <option value="Sunny">Sunny</option>
                  <option value="Sunny & Cloudy">Sunny & Cloudy</option>
                  <option value="Rainy">Heavy Rain</option>
                  <option value="Overcast">Overcast</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-1.5 pl-4 bg-slate-50">
                <span className="text-[10px] font-black uppercase text-slate-600">Shift Mode:</span>
                <select 
                  value={shift} 
                  onChange={e => setShift(e.target.value)}
                  className="text-[11px] font-black text-blue-700 bg-transparent outline-none flex-1 cursor-pointer"
                >
                  <option value="Day Shift (Standard)">Day Shift (Standard)</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="Extended / Overtime">Extended / Overtime</option>
                </select>
              </div>
            </div>

            {/* 2. UNIFIED WORK REGISTER TABLE (Sections 1-16 + Custom Sections) */}
            <div className="border-b border-slate-900">
              <div className="bg-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-900 flex justify-between items-center">
                <span>SECTION 1. WORK PROGRESS / ACTIVITIES DONE TODAY (ERA WORK REGISTER)</span>
                <div className="flex items-center gap-2">
                  {!isReadonly && (
                    <button 
                      onClick={() => setIsCustomSectionModalOpen(true)}
                      className="text-[9px] font-black text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded transition print:hidden"
                    >
                      + Insert Custom Activity
                    </button>
                  )}
                  <span className="text-[9px] text-slate-600 font-semibold">{sections.length} Activity Sections</span>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900">
                    <th className="border-r border-slate-900 p-2 text-center text-[10px] font-black w-32">ACTIVITY</th>
                    <th className="p-0"></th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section) => {
                    const isSub = section.id.includes('.');
                    if (isSub) return null; 

                    return (
                      <React.Fragment key={section.id}>
                        <tr>
                          <td className="border-r border-b border-slate-900 p-2 text-[10px] font-black bg-white align-top relative group">
                            <div className="flex justify-between items-start">
                              <span>{section.customLabel || section.id}. {section.name}</span>
                              {!isReadonly && (
                                <button 
                                  onClick={() => handleAddRowAt(section.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-blue-600 transition print:hidden"
                                  title="Add Row to this section"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-0 border-b border-slate-900">
                            <table className="w-full border-collapse">
                              <tbody>
                                {renderSectionRows(section)}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        {/* Subsections rendering logic */}
                        {sections.filter(s => s.parent === section.id).map(sub => (
                           <tr key={sub.id}>
                             <td className="border-r border-b border-slate-900 p-2 text-[10px] font-black bg-slate-50 align-top pl-4 relative group">
                                <div className="flex justify-between items-start">
                                  <span>{sub.id} {sub.name}</span>
                                  {!isReadonly && (
                                    <button 
                                      onClick={() => handleAddRowAt(sub.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-blue-600 transition print:hidden"
                                      title="Add Row to this subsection"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                             </td>
                             <td className="p-0 border-b border-slate-900">
                               <table className="w-full border-collapse">
                                 <tbody>
                                   {renderSectionRows(sub)}
                                 </tbody>
                               </table>
                             </td>
                           </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3. PRODUCTION TABLE SECTION (ASPHALT BATCHING, CONCRETE BATCHING, CRUSHER, PRECAST) */}
            <div className="p-4 space-y-4 bg-purple-50/20 border-b border-slate-900">
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-purple-400" />
                  <span>SECTION 2. SITE & INDUSTRIAL PRODUCTION TABLE (PLANT & QUARRY OUTPUT)</span>
                </span>
                {!isReadonly && (
                  <button 
                    onClick={() => setProductionList([...productionList, { id: 'p_' + Date.now(), facilityName: 'New Processing Unit', itemProduced: 'Aggregate / Concrete', unit: 'm³', targetOutput: 200, actualOutput: 150, previousCumulative: 0, operatingHours: 8.0, efficiencyPct: 85, remarks: 'Active' }])}
                    className="text-[9px] font-bold bg-purple-600 text-white hover:bg-purple-500 px-2 py-0.5 rounded transition print:hidden"
                  >
                    + Add Production Unit
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-900 font-black text-center">
                      <th className="border-r border-slate-900 p-2 text-left w-56">Facility / Plant Name</th>
                      <th className="border-r border-slate-900 p-2 text-left">Material / Item Produced</th>
                      <th className="border-r border-slate-900 p-2 w-16">Unit</th>
                      <th className="border-r border-slate-900 p-2 w-24">Target Output</th>
                      <th className="border-r border-slate-900 p-2 w-24 text-blue-700">Actual Today</th>
                      <th className="border-r border-slate-900 p-2 w-24 text-slate-600">Previous Total</th>
                      <th className="border-r border-slate-900 p-2 w-28 text-rose-600 font-black">Cumulative (To Date)</th>
                      <th className="border-r border-slate-900 p-2 w-20">Hours / Eff %</th>
                      <th className="p-2 text-left">Remarks & Quality Notes</th>
                      {!isReadonly && <th className="border-l border-slate-900 w-12 print:hidden"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {productionList.map((prod, idx) => {
                      const cumToDate = (prod.previousCumulative || 0) + (prod.actualOutput || 0);
                      return (
                        <tr key={prod.id || idx} className="border-b border-slate-900 hover:bg-slate-50 transition-colors">
                          <td className="border-r border-slate-900 p-1 font-bold text-slate-900">
                            <input 
                              value={prod.facilityName} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].facilityName = e.target.value;
                                setProductionList(list);
                              }}
                              className="w-full bg-transparent outline-none font-bold"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1 font-medium">
                            <input 
                              value={prod.itemProduced} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].itemProduced = e.target.value;
                                setProductionList(list);
                              }}
                              className="w-full bg-transparent outline-none font-medium"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold">
                            <input 
                              value={prod.unit} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].unit = e.target.value;
                                setProductionList(list);
                              }}
                              className="w-full text-center bg-transparent outline-none font-bold"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold">
                            <input 
                              type="number"
                              value={prod.targetOutput} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].targetOutput = parseFloat(e.target.value) || 0;
                                setProductionList(list);
                              }}
                              className="w-full text-center bg-transparent outline-none font-bold"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-black text-blue-700">
                            <input 
                              type="number"
                              value={prod.actualOutput} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].actualOutput = parseFloat(e.target.value) || 0;
                                setProductionList(list);
                              }}
                              className="w-full text-center bg-transparent outline-none font-black text-blue-700"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold text-slate-500">
                            {(prod.previousCumulative || 0).toLocaleString()} {prod.unit}
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-black text-rose-600">
                            {cumToDate.toLocaleString()} {prod.unit}
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center font-medium">
                            <input 
                              type="number"
                              value={prod.operatingHours || 8} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].operatingHours = parseFloat(e.target.value) || 0;
                                setProductionList(list);
                              }}
                              className="w-full text-center bg-transparent outline-none font-medium"
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              value={prod.remarks || ''} 
                              onChange={e => {
                                const list = [...productionList];
                                list[idx].remarks = e.target.value;
                                setProductionList(list);
                              }}
                              className="w-full bg-transparent outline-none text-slate-600"
                              placeholder="Remarks..."
                            />
                          </td>
                          {!isReadonly && (
                            <td className="border-l border-slate-900 p-1 text-center print:hidden">
                              <button 
                                onClick={() => setProductionList(productionList.filter((_, i) => i !== idx))}
                                className="text-rose-400 hover:text-rose-600 p-0.5 rounded transition"
                                title="Delete row"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. SITE RESOURCES & OPERATIONS (MERGED FROM SITE ENGINEER REPORT) */}
            <div className="p-4 space-y-6 bg-slate-50/50">
              
              {/* SECTION HEADER BAR */}
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex justify-between items-center">
                <span className="flex items-center gap-2"><HardHat className="w-4 h-4 text-amber-400" /> SECTION 3. SITE RESOURCES, MATERIAL & EQUIPMENT OPERATIONS</span>
                <span className="text-[10px] text-slate-400">Daily Site Deployment</span>
              </div>

              {/* GRID: MANPOWER & MATERIAL TRACKER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 3.1 MANPOWER DEPLOYMENT */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                  <h4 className="text-xs font-black uppercase text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>3.1 Manpower Deployment</span>
                  </h4>

                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-900 font-black">
                        <th className="border-r border-slate-900 p-1.5 text-left">Category</th>
                        <th className="border-r border-slate-900 p-1.5 w-14">Skilled</th>
                        <th className="border-r border-slate-900 p-1.5 w-16">Semi-Skilled</th>
                        <th className="border-r border-slate-900 p-1.5 w-14">Unskilled</th>
                        <th className="p-1.5 w-14 text-emerald-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { cat: 'Project Manager & Engineers', skilled: 4, semi: 2, unskilled: 0 },
                        { cat: 'Site Foremen & Supervisors', skilled: 6, semi: 3, unskilled: 0 },
                        { cat: 'Heavy Equipment Operators', skilled: 12, semi: 5, unskilled: 0 },
                        { cat: 'Skilled Labor & Masons', skilled: 15, semi: 8, unskilled: 0 },
                        { cat: 'Unskilled Labor & Flagmen', skilled: 0, semi: 0, unskilled: 35 }
                      ].map((m, idx) => (
                        <tr key={idx} className="border-b border-slate-900 hover:bg-slate-50">
                          <td className="border-r border-slate-900 p-1 font-medium">{m.cat}</td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold">{m.skilled}</td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold">{m.semi}</td>
                          <td className="border-r border-slate-900 p-1 text-center font-bold">{m.unskilled}</td>
                          <td className="p-1 text-center font-black text-emerald-700">{m.skilled + m.semi + m.unskilled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 3.2 MATERIAL RECEIVED / USED TRACKER */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>3.2 Material Received / Used Tracker</span>
                    </h4>
                    {!isReadonly && (
                      <button 
                        onClick={() => setMaterialsList([...materialsList, { id: 'm_' + Date.now(), material: PRESET_MATERIALS[0], received: 100, used: 40, remarks: 'On site' }])}
                        className="text-[9px] font-bold text-blue-600 hover:underline print:hidden"
                      >
                        + Add Material
                      </button>
                    )}
                  </div>

                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-900 font-black">
                        <th className="border-r border-slate-900 p-1.5 text-left">Material</th>
                        <th className="border-r border-slate-900 p-1.5 w-16">Received</th>
                        <th className="border-r border-slate-900 p-1.5 w-16">Used</th>
                        <th className="border-r border-slate-900 p-1.5 w-16 text-blue-700">Balance</th>
                        <th className="p-1.5 w-24">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialsList.map((m, idx) => (
                        <tr key={m.id || idx} className="border-b border-slate-900 hover:bg-slate-50">
                          <td className="border-r border-slate-900 p-1">
                            <select 
                              value={m.material} 
                              onChange={e => {
                                const list = [...materialsList];
                                list[idx].material = e.target.value;
                                setMaterialsList(list);
                              }}
                              className="w-full text-[9px] font-medium bg-transparent outline-none cursor-pointer"
                            >
                              {PRESET_MATERIALS.map((p, pi) => <option key={pi} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="border-r border-slate-900 p-1 text-center"><input className="w-full text-center bg-transparent font-bold outline-none" type="number" value={m.received} onChange={e => {
                            const list = [...materialsList];
                            list[idx].received = parseFloat(e.target.value) || 0;
                            setMaterialsList(list);
                          }} /></td>
                          <td className="border-r border-slate-900 p-1 text-center"><input className="w-full text-center bg-transparent font-bold text-rose-600 outline-none" type="number" value={m.used} onChange={e => {
                            const list = [...materialsList];
                            list[idx].used = parseFloat(e.target.value) || 0;
                            setMaterialsList(list);
                          }} /></td>
                          <td className="border-r border-slate-900 p-1 text-center font-black text-blue-700">{m.received - m.used}</td>
                          <td className="p-1"><input className="w-full bg-transparent outline-none text-slate-600" value={m.remarks} onChange={e => {
                            const list = [...materialsList];
                            list[idx].remarks = e.target.value;
                            setMaterialsList(list);
                          }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3.3 EQUIPMENT & MACHINERY USED */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                <h4 className="text-xs font-black uppercase text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>3.3 Equipment / Machinery Fleet Deployment</span>
                </h4>

                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-900 font-black">
                      <th className="border-r border-slate-900 p-1.5 text-left">Equipment Name</th>
                      <th className="border-r border-slate-900 p-1.5 w-28">Status</th>
                      <th className="border-r border-slate-900 p-1.5 w-20">Working Hours</th>
                      <th className="p-1.5">Site Location & Assignment Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Bulldozer CAT D8R', status: 'Operating', hrs: 8.0, remark: 'Subgrade excavation at Km 213+860' },
                      { name: 'Motor Grader 140K', status: 'Operating', hrs: 7.5, remark: 'Base course levelling at Km 209+880' },
                      { name: 'Vibratory Roller 15T', status: 'Operating', hrs: 8.0, remark: 'Sub-Base compaction' },
                      { name: 'Water Truck 18,000L', status: 'Standby', hrs: 4.0, remark: 'Refilling at Station Camp 203+400' }
                    ].map((eq, idx) => (
                      <tr key={idx} className="border-b border-slate-900 hover:bg-slate-50">
                        <td className="border-r border-slate-900 p-1 font-bold text-slate-800">{eq.name}</td>
                        <td className="border-r border-slate-900 p-1 text-center">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            eq.status === 'Operating' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {eq.status}
                          </span>
                        </td>
                        <td className="border-r border-slate-900 p-1 text-center font-bold">{eq.hrs} hrs</td>
                        <td className="p-1 text-slate-600">{eq.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 4: PROBLEMS, CHALLENGES & OBSTRUCTIONS (YELLOW BOX FROM ERA REGISTER) */}
              <div className="bg-yellow-200 border-2 border-slate-900 p-3 rounded-xl space-y-2 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <h4 className="text-[11px] font-black text-rose-700 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    <span>SECTION 4. PROBLEMS, CHALLENGES & FIELD OBSTRUCTIONS</span>
                  </h4>
                  {!isReadonly && (
                    <button 
                      onClick={() => setSiteChallenges([...siteChallenges, `${siteChallenges.length + 1}. New site challenge or obstruction...`])}
                      className="text-[9px] font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 px-2 py-0.5 rounded transition print:hidden"
                    >
                      + Add Challenge
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {siteChallenges.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <span className="text-[10px] font-black text-rose-700 w-4 shrink-0">{idx + 1}.</span>
                      <input 
                        value={item.replace(/^\d+\.\s*/, '')} 
                        onChange={e => {
                          const updated = [...siteChallenges];
                          updated[idx] = `${idx + 1}. ${e.target.value}`;
                          setSiteChallenges(updated);
                        }}
                        className="flex-1 bg-yellow-100 text-rose-700 font-bold text-[10px] border-b border-rose-300 focus:border-rose-600 outline-none px-1 py-0.5"
                        placeholder="Describe field challenge or remark..."
                      />
                      {!isReadonly && (
                        <button 
                          onClick={() => setSiteChallenges(siteChallenges.filter((_, i) => i !== idx))}
                          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 rounded print:hidden"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: WORK PLAN FOR TOMORROW */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>SECTION 5. WORK PLAN FOR TOMORROW</span>
                  </h4>
                  {!isReadonly && (
                    <button 
                      onClick={() => setTomorrowPlans([...tomorrowPlans, { id: 'p_' + Date.now(), area: 'Km 210+100', description: 'Embankment Fill Layer 2', unit: 'm³', target: 300, remarks: 'Standard' }])}
                      className="text-[9px] font-bold text-blue-600 hover:underline print:hidden"
                    >
                      + Add Plan Item
                    </button>
                  )}
                </div>

                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-900 font-black">
                      <th className="border-r border-slate-900 p-1.5 w-10">S.No</th>
                      <th className="border-r border-slate-900 p-1.5 w-36">Location / Area</th>
                      <th className="border-r border-slate-900 p-1.5">Description of Work</th>
                      <th className="border-r border-slate-900 p-1.5 w-16">Unit</th>
                      <th className="border-r border-slate-900 p-1.5 w-28">Target (Planned)</th>
                      <th className="p-1.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tomorrowPlans.map((plan, idx) => (
                      <tr key={plan.id || idx} className="border-b border-slate-900 hover:bg-slate-50">
                        <td className="border-r border-slate-900 p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border-r border-slate-900 p-1 font-mono"><input className="w-full bg-transparent outline-none font-bold" value={plan.area} onChange={e => {
                          const list = [...tomorrowPlans];
                          list[idx].area = e.target.value;
                          setTomorrowPlans(list);
                        }} /></td>
                        <td className="border-r border-slate-900 p-1"><input className="w-full bg-transparent outline-none font-medium" value={plan.description} onChange={e => {
                          const list = [...tomorrowPlans];
                          list[idx].description = e.target.value;
                          setTomorrowPlans(list);
                        }} /></td>
                        <td className="border-r border-slate-900 p-1 text-center"><input className="w-full text-center bg-transparent outline-none font-bold" value={plan.unit} onChange={e => {
                          const list = [...tomorrowPlans];
                          list[idx].unit = e.target.value;
                          setTomorrowPlans(list);
                        }} /></td>
                        <td className="border-r border-slate-900 p-1 text-center"><input className="w-full text-center bg-transparent outline-none font-bold text-blue-700" type="number" value={plan.target} onChange={e => {
                          const list = [...tomorrowPlans];
                          list[idx].target = parseFloat(e.target.value) || 0;
                          setTomorrowPlans(list);
                        }} /></td>
                        <td className="p-1"><input className="w-full bg-transparent outline-none text-slate-600" value={plan.remarks} onChange={e => {
                          const list = [...tomorrowPlans];
                          list[idx].remarks = e.target.value;
                          setTomorrowPlans(list);
                        }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 6: NOTES & SIGNATURES */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-900">
                <div className="border border-slate-900 p-3 rounded bg-white text-[10px]">
                  <span className="font-bold text-slate-500 uppercase block mb-1">Prepared By:</span>
                  <div className="font-black text-slate-900 text-xs">Site Engineer</div>
                </div>
                <div className="border border-slate-900 p-3 rounded bg-white text-[10px]">
                  <span className="font-bold text-slate-500 uppercase block mb-1">Checked By:</span>
                  <div className="font-black text-slate-900 text-xs">{consultantRoleLabel}</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* FLOATING PRINT / DOWNLOAD BUTTON */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 print:hidden z-40">
           <button 
             onClick={() => window.print()}
             className="p-3 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition transform hover:scale-105 flex items-center gap-2 px-4 border border-slate-700"
             title="Print or Export Register"
           >
             <DownloadCloud className="w-5 h-5 text-blue-400" />
             <span className="text-xs font-black uppercase">Print DPR</span>
           </button>
        </div>
      </div>

      {/* MODAL 1: EDIT EQUIPMENT & LABOR RESOURCES */}
      <AnimatePresence>
        {isEditModalOpen && editingActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-400" /> Resource Deployment Manager
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Section {editingActivity.activityType} · Date: {selectedDate}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black uppercase flex items-center gap-2 text-slate-800">
                      <Truck className="w-4 h-4 text-blue-600" /> Equipment Deployed
                    </h4>
                    <button 
                      onClick={() => {
                        const list = [...(editingActivity.equipmentList || [])];
                        list.push({ id: Date.now().toString(), name: 'Excavator / Dozer', count: 1, status: 'Operating' });
                        setEditingActivity({ ...editingActivity, equipmentList: list });
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition"
                    >
                      + Add Equipment
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingActivity.equipmentList?.map((eq, idx) => (
                      <div key={eq.id || idx} className="grid grid-cols-6 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input className="col-span-3 text-xs p-1 bg-[#ffffff] border border-slate-200 rounded font-medium focus:outline-none focus:border-blue-500" placeholder="Equipment name..." value={eq.name} onChange={e => {
                          const list = [...(editingActivity.equipmentList || [])];
                          list[idx].name = e.target.value;
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }} />
                        <div className="col-span-1 flex items-center justify-center">
                          <input className="w-full text-xs p-1 bg-[#ffffff] border border-slate-200 rounded text-center font-bold" type="number" min="0" value={eq.count} onChange={e => {
                            const list = [...(editingActivity.equipmentList || [])];
                            list[idx].count = parseInt(e.target.value) || 0;
                            setEditingActivity({ ...editingActivity, equipmentList: list });
                          }} />
                        </div>
                        <select className="col-span-2 text-[10px] font-bold bg-[#ffffff] border border-slate-200 rounded p-1" value={eq.status} onChange={e => {
                          const list = [...(editingActivity.equipmentList || [])];
                          list[idx].status = e.target.value as any;
                          setEditingActivity({ ...editingActivity, equipmentList: list });
                        }}>
                          <option value="Operating">🟢 Operating</option>
                          <option value="Standby">🟡 Standby</option>
                          <option value="Breakdown">🔴 Breakdown</option>
                          <option value="Maintenance">🔧 Maintenance</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black uppercase flex items-center gap-2 text-slate-800">
                      <Users className="w-4 h-4 text-emerald-600" /> Labor / Personnel
                    </h4>
                    <button 
                      onClick={() => {
                        const list = [...(editingActivity.laborSummary || [])];
                        list.push({ category: 'Unskilled Labor / Flagmen', count: 1 });
                        setEditingActivity({ ...editingActivity, laborSummary: list });
                      }}
                      className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition"
                    >
                      + Add Personnel
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingActivity.laborSummary?.map((lab, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <select className="col-span-3 text-xs bg-[#ffffff] border border-slate-200 rounded p-1 font-medium" value={lab.category} onChange={e => {
                          const list = [...(editingActivity.laborSummary || [])];
                          list[idx].category = e.target.value;
                          setEditingActivity({ ...editingActivity, laborSummary: list });
                        }}>
                          <option>Project Manager / Engineers</option>
                          <option>Site Foremen / Supervisors</option>
                          <option>Heavy Equipment Operators</option>
                          <option>Skilled Labor / Masons</option>
                          <option>Unskilled Labor / Flagmen</option>
                          <option>Surveyors / QC Technicians</option>
                        </select>
                        <input className="col-span-1 text-xs p-1 bg-[#ffffff] border border-slate-200 rounded text-center font-bold" type="number" min="0" value={lab.count} onChange={e => {
                          const list = [...(editingActivity.laborSummary || [])];
                          list[idx].count = parseInt(e.target.value) || 0;
                          setEditingActivity({ ...editingActivity, laborSummary: list });
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">Cancel</button>
                <button onClick={handleSaveModal} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-slate-800 transition">Save Resources</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INSERT CUSTOM WORK SECTION / ACTIVITY */}
      <AnimatePresence>
        {isCustomSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-400" /> Insert Custom Activity Section
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Define a new work register section for road activities</p>
                </div>
                <button onClick={() => setIsCustomSectionModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">Section Code / Number:</label>
                  <input 
                    value={newSectionCode}
                    onChange={e => setNewSectionCode(e.target.value)}
                    placeholder={`e.g., ${sections.length + 1}`}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-xs font-bold outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">Activity Section Title:</label>
                  <input 
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    placeholder="e.g., Gabion & Retaining Wall Construction"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="p-5 border-t bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsCustomSectionModalOpen(false)} className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">Cancel</button>
                <button onClick={handleAddCustomSection} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-blue-500 transition">Insert Section</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DndContext>
  );
}

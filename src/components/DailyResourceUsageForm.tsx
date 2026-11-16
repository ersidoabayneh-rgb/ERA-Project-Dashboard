import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Truck,
  Package,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Calendar as CalendarIcon,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import {
  DailyActivityEquipmentItem,
  DailyActivityLaborItem,
  DailyActivityMaterialItem,
  DailyActivityRecord,
  Project,
  User,
} from '../types';
import { toInputDateStr } from '../lib/dateUtils';

interface DailyResourceUsageFormProps {
  project: Project;
  selectedDate: string;
  weather: string;
  shift: string;
  isReadonly?: boolean;
  currentUserObj?: User | null;
  presetMaterials: string[];
  onSelectDate: (date: string) => void;
  onSaveResourceRecord: (record: DailyActivityRecord, isUpdate: boolean) => void;
  onDeleteResourceRecord: (recordId: string) => void;
}

const LABOR_CATEGORIES = [
  'Project Manager / Engineers',
  'Site Foremen / Supervisors',
  'Heavy Equipment Operators',
  'Skilled Labor / Masons',
  'Unskilled Labor / Flagmen',
  'Survey & Lab Technicians',
];

const EQUIPMENT_PRESETS = [
  'Bulldozer CAT D8R',
  'Hydraulic Excavator 320D',
  'Motor Grader 140K',
  'Vibratory Roller 15T',
  'Dump Truck 16m³',
  'Water Truck 18,000L',
  'Wheel Loader 950H',
  'Asphalt Paver',
];

const MATERIAL_UNITS = ['Tons', 'm³', 'Bags', 'Liters', 'kg', 'pcs', 'm'];

function createDefaultLaborRows(): DailyActivityLaborItem[] {
  return [
    { category: 'Site Foremen / Supervisors', count: 2 },
    { category: 'Heavy Equipment Operators', count: 6 },
    { category: 'Skilled Labor / Masons', count: 10 },
    { category: 'Unskilled Labor / Flagmen', count: 18 },
  ];
}

function createDefaultEquipmentRows(): DailyActivityEquipmentItem[] {
  return [
    { id: `eq_${Date.now()}_1`, name: 'Bulldozer CAT D8R', count: 1, status: 'Operating' },
    { id: `eq_${Date.now()}_2`, name: 'Motor Grader 140K', count: 1, status: 'Operating' },
    { id: `eq_${Date.now()}_3`, name: 'Dump Truck 16m³', count: 3, status: 'Operating' },
  ];
}

function createDefaultMaterialRows(presetMaterials: string[]): DailyActivityMaterialItem[] {
  return [
    {
      id: `mat_${Date.now()}_1`,
      material: presetMaterials[0] || 'Portland Cement (42.5N Grade)',
      unit: 'Bags',
      received: 0,
      used: 0,
      balance: 0,
      remarks: '',
    },
    {
      id: `mat_${Date.now()}_2`,
      material: presetMaterials[6] || 'Diesel Fuel (Gasoline / Gasoil)',
      unit: 'Liters',
      received: 0,
      used: 0,
      balance: 0,
      remarks: '',
    },
  ];
}

export default function DailyResourceUsageForm({
  project,
  selectedDate,
  weather,
  shift,
  isReadonly = false,
  currentUserObj,
  presetMaterials,
  onSelectDate,
  onSaveResourceRecord,
  onDeleteResourceRecord,
}: DailyResourceUsageFormProps) {
  const todayStr = useMemo(() => toInputDateStr(new Date()), []);

  const allResourceLogs = useMemo(() => {
    const list = Array.isArray(project.dailyActivities) ? project.dailyActivities : [];
    return list
      .filter((a) => a.activityType === 'resource_log' || a.recordKind === 'resource_log')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [project.dailyActivities]);

  const logsForSelectedDate = useMemo(
    () => allResourceLogs.filter((a) => a.date === selectedDate),
    [allResourceLogs, selectedDate]
  );

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [zoneStation, setZoneStation] = useState<string>('Site-wide');
  const [formShift, setFormShift] = useState<string>(shift || 'Day Shift (Standard)');
  const [formWeather, setFormWeather] = useState<string>(weather || 'Sunny');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [laborRows, setLaborRows] = useState<DailyActivityLaborItem[]>(() => createDefaultLaborRows());
  const [equipmentRows, setEquipmentRows] = useState<DailyActivityEquipmentItem[]>(() => createDefaultEquipmentRows());
  const [materialRows, setMaterialRows] = useState<DailyActivityMaterialItem[]>(() =>
    createDefaultMaterialRows(presetMaterials)
  );
  const [historyScope, setHistoryScope] = useState<'date' | 'all'>('date');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const loadRecordIntoForm = (rec: DailyActivityRecord) => {
    setEditingRecordId(rec.id);
    setZoneStation(rec.startStationKm || 'Site-wide');
    setFormShift(rec.shift || shift || 'Day Shift (Standard)');
    setFormWeather(rec.weatherCondition || weather || 'Sunny');
    setFormRemarks(rec.remarks || '');
    setLaborRows(
      rec.laborSummary && rec.laborSummary.length > 0
        ? rec.laborSummary.map((l) => ({ ...l }))
        : createDefaultLaborRows()
    );
    setEquipmentRows(
      rec.equipmentList && rec.equipmentList.length > 0
        ? rec.equipmentList.map((e) => ({ ...e }))
        : createDefaultEquipmentRows()
    );
    setMaterialRows(
      rec.materialsList && rec.materialsList.length > 0
        ? rec.materialsList.map((m) => ({ ...m }))
        : createDefaultMaterialRows(presetMaterials)
    );
  };

  const resetToFreshForm = () => {
    setEditingRecordId(null);
    setZoneStation('Site-wide');
    setFormShift(shift || 'Day Shift (Standard)');
    setFormWeather(weather || 'Sunny');
    setFormRemarks('');
    setLaborRows(createDefaultLaborRows());
    setEquipmentRows(createDefaultEquipmentRows());
    setMaterialRows(createDefaultMaterialRows(presetMaterials));
  };

  // Sync form when selectedDate or saved logs for selectedDate change
  useEffect(() => {
    const firstLog = logsForSelectedDate[0];
    if (firstLog) {
      loadRecordIntoForm(firstLog);
    } else {
      setEditingRecordId(null);
      setZoneStation('Site-wide');
      setFormShift(shift || 'Day Shift (Standard)');
      setFormWeather(weather || 'Sunny');
      setFormRemarks('');
      setLaborRows(createDefaultLaborRows());
      setEquipmentRows(createDefaultEquipmentRows());
      setMaterialRows(createDefaultMaterialRows(presetMaterials));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, logsForSelectedDate.length]);

  const totals = useMemo(() => {
    const totalLabor = laborRows.reduce((s, r) => s + (Number(r.count) || 0), 0);
    const totalEquipUnits = equipmentRows.reduce((s, r) => s + (Number(r.count) || 0), 0);
    const operatingEquipUnits = equipmentRows
      .filter((r) => r.status === 'Operating')
      .reduce((s, r) => s + (Number(r.count) || 0), 0);
    const totalMaterialUsed = materialRows.reduce((s, r) => s + (Number(r.used) || 0), 0);
    const activeMaterialsCount = materialRows.filter((r) => r.material.trim().length > 0).length;
    return {
      totalLabor,
      totalEquipUnits,
      operatingEquipUnits,
      totalMaterialUsed,
      activeMaterialsCount,
    };
  }, [laborRows, equipmentRows, materialRows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadonly) return;

    const cleanLabor = laborRows
      .filter((l) => l.category.trim().length > 0)
      .map((l) => ({
        category: l.category.trim(),
        count: Math.max(0, Number(l.count) || 0),
      }));

    const cleanEquipment = equipmentRows
      .filter((eq) => eq.name.trim().length > 0)
      .map((eq, idx) => ({
        id: eq.id || `eq_${Date.now()}_${idx}`,
        name: eq.name.trim(),
        count: Math.max(0, Number(eq.count) || 0),
        status: eq.status || 'Operating',
      }));

    const cleanMaterials = materialRows
      .filter((m) => m.material.trim().length > 0)
      .map((m, idx) => {
        const recQty = Math.max(0, Number(m.received) || 0);
        const usedQty = Math.max(0, Number(m.used) || 0);
        return {
          id: m.id || `mat_${Date.now()}_${idx}`,
          material: m.material.trim(),
          unit: m.unit || 'Tons',
          received: recQty,
          used: usedQty,
          balance: recQty - usedQty,
          remarks: m.remarks || '',
        };
      });

    const laborCount = cleanLabor.reduce((s, l) => s + l.count, 0);
    const equipCount = cleanEquipment.reduce((s, eq) => s + eq.count, 0);
    const nowIso = new Date().toISOString();

    const existing = editingRecordId
      ? allResourceLogs.find((r) => r.id === editingRecordId)
      : undefined;

    const record: DailyActivityRecord = {
      id: existing ? existing.id : `reslog_${selectedDate}_${Date.now()}`,
      date: selectedDate,
      recordKind: 'resource_log',
      activityType: 'resource_log',
      activityName: 'Daily Resource Usage (Labor, Equipment & Materials)',
      description: `Manpower: ${laborCount} workers · Equipment: ${equipCount} units · Materials: ${cleanMaterials.length} items`,
      startStationKm: zoneStation.trim() || 'Site-wide',
      side: 'BHS',
      shift: formShift,
      weatherCondition: formWeather,
      workingHours: 8.0,
      qcStatus: '',
      status: 'Approved',
      laborSummary: cleanLabor,
      equipmentList: cleanEquipment,
      materialsList: cleanMaterials,
      remarks: formRemarks.trim(),
      recordedBy: currentUserObj?.fullName || currentUserObj?.username || 'Site Engineer',
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSaveResourceRecord(record, Boolean(existing));
    setEditingRecordId(record.id);
    setSavedBanner(
      `Saved ${selectedDate} resource log (${laborCount} labor, ${equipCount} equipment, ${cleanMaterials.length} materials) and linked to project calendar.`
    );
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const displayedHistory = historyScope === 'date' ? logsForSelectedDate : allResourceLogs;

  return (
    <section
      id="daily-resource-usage-form"
      aria-label="Daily Labor, Equipment and Material Usage Form"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Daily Resource Usage Entry (Labor, Equipment &amp; Materials)
            </h2>
            {editingRecordId && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Editing Saved Log
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Record daily site manpower, machinery deployment, and material consumption. Entries save directly to project records and appear on the calendar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 dark:text-white outline-none text-xs tabular-nums"
              aria-label="Resource log date"
            />
          </div>
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
            >
              Today ({todayStr})
            </button>
          )}
          {!isReadonly && editingRecordId && (
            <button
              type="button"
              onClick={resetToFreshForm}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Shift Log</span>
            </button>
          )}
        </div>
      </div>

      {savedBanner && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Top Metadata Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Work Zone / Station
            </label>
            <input
              type="text"
              value={zoneStation}
              disabled={isReadonly}
              onChange={(e) => setZoneStation(e.target.value)}
              placeholder="e.g. Km 205+000 - 210+500"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Shift
            </label>
            <select
              value={formShift}
              disabled={isReadonly}
              onChange={(e) => setFormShift(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              <option value="Day Shift (Standard)">Day Shift (Standard)</option>
              <option value="Night Shift">Night Shift</option>
              <option value="Extended / Overtime">Extended / Overtime</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Weather Condition
            </label>
            <select
              value={formWeather}
              disabled={isReadonly}
              onChange={(e) => setFormWeather(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              <option value="Sunny">Sunny</option>
              <option value="Sunny & Cloudy">Sunny &amp; Cloudy</option>
              <option value="Overcast">Overcast</option>
              <option value="Rainy">Rainy / Wet</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Site Supervisor Notes
            </label>
            <input
              type="text"
              value={formRemarks}
              disabled={isReadonly}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Summary remarks for this shift..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 3 Resource Grids: Labor, Equipment, Material */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. LABOR USAGE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    1. Labor Usage
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Total Manpower: <strong className="text-slate-900 dark:text-white">{totals.totalLabor}</strong> workers
                  </span>
                </div>
              </div>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() =>
                    setLaborRows([...laborRows, { category: 'Skilled Labor / Masons', count: 1 }])
                  }
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            <div className="p-2.5 space-y-2 flex-1">
              {laborRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs"
                >
                  <input
                    list="era-labor-categories"
                    value={row.category}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const next = [...laborRows];
                      next[idx] = { ...next[idx], category: e.target.value };
                      setLaborRows(next);
                    }}
                    placeholder="Trade / Role..."
                    className="flex-1 min-w-0 bg-transparent px-1.5 py-0.5 text-slate-900 dark:text-white font-medium outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.count}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const next = [...laborRows];
                      next[idx] = { ...next[idx], count: Math.max(0, parseInt(e.target.value, 10) || 0) };
                      setLaborRows(next);
                    }}
                    aria-label="Worker headcount"
                    className="w-16 text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums outline-none"
                  />
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => setLaborRows(laborRows.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                      title="Remove labor row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {laborRows.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3 italic">No labor rows added.</p>
              )}
              <datalist id="era-labor-categories">
                {LABOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 2. EQUIPMENT USAGE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    2. Equipment Usage
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Operating: <strong className="text-slate-900 dark:text-white">{totals.operatingEquipUnits}</strong> / {totals.totalEquipUnits} units
                  </span>
                </div>
              </div>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() =>
                    setEquipmentRows([
                      ...equipmentRows,
                      { id: `eq_${Date.now()}`, name: 'Hydraulic Excavator 320D', count: 1, status: 'Operating' },
                    ])
                  }
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            <div className="p-2.5 space-y-2 flex-1">
              {equipmentRows.map((row, idx) => (
                <div
                  key={row.id || idx}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs"
                >
                  <input
                    list="era-equipment-presets"
                    value={row.name}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const next = [...equipmentRows];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setEquipmentRows(next);
                    }}
                    placeholder="Equipment name..."
                    className="flex-1 min-w-0 bg-transparent px-1.5 py-0.5 text-slate-900 dark:text-white font-medium outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.count}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const next = [...equipmentRows];
                      next[idx] = { ...next[idx], count: Math.max(0, parseInt(e.target.value, 10) || 0) };
                      setEquipmentRows(next);
                    }}
                    aria-label="Equipment unit count"
                    className="w-12 text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 font-mono font-bold text-slate-900 dark:text-white tabular-nums outline-none"
                  />
                  <select
                    value={row.status}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const next = [...equipmentRows];
                      next[idx] = {
                        ...next[idx],
                        status: e.target.value as DailyActivityEquipmentItem['status'],
                      };
                      setEquipmentRows(next);
                    }}
                    aria-label="Equipment operational status"
                    className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Operating">Operating</option>
                    <option value="Standby">Standby</option>
                    <option value="Breakdown">Breakdown</option>
                    <option value="Maintenance">Maint.</option>
                  </select>
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => setEquipmentRows(equipmentRows.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                      title="Remove equipment row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {equipmentRows.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3 italic">No equipment rows added.</p>
              )}
              <datalist id="era-equipment-presets">
                {EQUIPMENT_PRESETS.map((eq) => (
                  <option key={eq} value={eq} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 3. MATERIAL USAGE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    3. Material Usage
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Tracked: <strong className="text-slate-900 dark:text-white">{totals.activeMaterialsCount}</strong> materials ({totals.totalMaterialUsed.toLocaleString()} used)
                  </span>
                </div>
              </div>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() =>
                    setMaterialRows([
                      ...materialRows,
                      {
                        id: `mat_${Date.now()}`,
                        material: presetMaterials[2] || 'Crushed Base Aggregate (0-31.5mm)',
                        unit: 'm³',
                        received: 0,
                        used: 0,
                        balance: 0,
                        remarks: '',
                      },
                    ])
                  }
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            <div className="p-2.5 space-y-2 flex-1">
              {materialRows.map((row, idx) => (
                <div
                  key={row.id || idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      list="era-material-presets"
                      value={row.material}
                      disabled={isReadonly}
                      onChange={(e) => {
                        const next = [...materialRows];
                        next[idx] = { ...next[idx], material: e.target.value };
                        setMaterialRows(next);
                      }}
                      placeholder="Material name..."
                      className="flex-1 min-w-0 bg-transparent px-1 py-0.5 text-slate-900 dark:text-white font-medium outline-none"
                    />
                    <select
                      value={row.unit || 'Tons'}
                      disabled={isReadonly}
                      onChange={(e) => {
                        const next = [...materialRows];
                        next[idx] = { ...next[idx], unit: e.target.value };
                        setMaterialRows(next);
                      }}
                      aria-label="Material unit"
                      className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      {MATERIAL_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={() => setMaterialRows(materialRows.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                        title="Remove material row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <label className="flex items-center justify-between gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5">
                      <span className="text-slate-500 dark:text-slate-400">Rcvd:</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.received ?? 0}
                        disabled={isReadonly}
                        onChange={(e) => {
                          const next = [...materialRows];
                          const received = Math.max(0, parseFloat(e.target.value) || 0);
                          next[idx] = { ...next[idx], received, balance: received - (next[idx].used || 0) };
                          setMaterialRows(next);
                        }}
                        className="w-12 text-right bg-transparent font-mono font-semibold text-slate-900 dark:text-white outline-none tabular-nums"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5">
                      <span className="text-slate-500 dark:text-slate-400">Used:</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.used}
                        disabled={isReadonly}
                        onChange={(e) => {
                          const next = [...materialRows];
                          const used = Math.max(0, parseFloat(e.target.value) || 0);
                          next[idx] = { ...next[idx], used, balance: (next[idx].received || 0) - used };
                          setMaterialRows(next);
                        }}
                        className="w-12 text-right bg-transparent font-mono font-bold text-rose-600 dark:text-rose-400 outline-none tabular-nums"
                      />
                    </label>

                    <div className="flex items-center justify-between gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 py-0.5">
                      <span className="text-slate-500 dark:text-slate-400">Net:</span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                        {((row.received || 0) - (row.used || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {materialRows.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3 italic">No material rows added.</p>
              )}
              <datalist id="era-material-presets">
                {presetMaterials.map((mat) => (
                  <option key={mat} value={mat} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="text-slate-600 dark:text-slate-300 tabular-nums">
            Ready to record for <strong className="font-mono text-slate-900 dark:text-white">{selectedDate}</strong>:{' '}
            <strong>{totals.totalLabor}</strong> workers · <strong>{totals.totalEquipUnits}</strong> equipment units ·{' '}
            <strong>{totals.activeMaterialsCount}</strong> material entries
          </div>

          {!isReadonly && (
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{editingRecordId ? 'Update Daily Resource Record' : 'Save Daily Resource Record'}</span>
            </button>
          )}
        </div>
      </form>

      {/* Persisted Daily Resource Logs Ledger (Linked with Calendar) */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide tabular-nums">
            Persisted Project Resource Usage Records ({displayedHistory.length})
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setHistoryScope('date')}
              className={`px-2.5 py-0.5 rounded-md transition tabular-nums ${
                historyScope === 'date'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Selected Date ({logsForSelectedDate.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryScope('all')}
              className={`px-2.5 py-0.5 rounded-md transition tabular-nums ${
                historyScope === 'all'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Project Dates ({allResourceLogs.length})
            </button>
          </div>
        </div>

        {displayedHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Zone / Shift</th>
                  <th className="py-2 px-3">Labor</th>
                  <th className="py-2 px-3">Equipment</th>
                  <th className="py-2 px-3">Materials Used</th>
                  <th className="py-2 px-3">Recorded By</th>
                  {!isReadonly && <th className="py-2 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedHistory.map((rec) => {
                  const laborSum = (rec.laborSummary || []).reduce((s, l) => s + (l.count || 0), 0);
                  const equipSum = (rec.equipmentList || []).reduce((s, eq) => s + (eq.count || 0), 0);
                  const matCount = (rec.materialsList || []).length;
                  const matPreview = (rec.materialsList || [])
                    .slice(0, 2)
                    .map((m) => `${m.material}: ${m.used} ${m.unit || ''}`.trim())
                    .join(' · ');

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        editingRecordId === rec.id ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDate(rec.date);
                            loadRecordIntoForm(rec);
                          }}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline tabular-nums"
                          title="Jump calendar & form to this date"
                        >
                          {rec.date}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-200">
                        <div className="font-medium">{rec.startStationKm || 'Site-wide'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {rec.shift || 'Day Shift'} · {rec.weatherCondition || 'Sunny'}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {laborSum} workers
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {equipSum} units
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold tabular-nums">{matCount} items</span>
                        {matPreview && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                            {matPreview}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                        {rec.recordedBy || 'Site Engineer'}
                      </td>
                      {!isReadonly && (
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectDate(rec.date);
                                loadRecordIntoForm(rec);
                              }}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium inline-flex items-center gap-1"
                              title="Edit record"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            {confirmDeleteId === rec.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteResourceRecord(rec.id);
                                  setConfirmDeleteId(null);
                                  if (editingRecordId === rec.id) resetToFreshForm();
                                }}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rec.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                                title="Delete resource record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2">
            No persisted daily resource usage logs {historyScope === 'date' ? `on ${selectedDate}` : 'recorded yet'}. Use the form above to save labor, equipment, and material usage.
          </p>
        )}
      </div>
    </section>
  );
}

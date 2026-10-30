import { Project, QtyItem, LinearData, LinearPlanData, LinearSegment, LinearLayerPlan } from '../types';

export type PavementLayerKey = 'subgrade' | 'capping' | 'subbase' | 'basecourse' | 'asphalt';

export interface PavementLayerConfig {
  key: PavementLayerKey;
  label: string;
  qtyDisplayName: string;
  defaultUnit: string;
}

export const PAVEMENT_LAYERS: PavementLayerConfig[] = [
  { key: 'subgrade', label: 'Sub-Grade', qtyDisplayName: 'Subgrade (Km)', defaultUnit: 'Km' },
  { key: 'capping', label: 'Capping Layers', qtyDisplayName: 'Capping (Km)', defaultUnit: 'Km' },
  { key: 'subbase', label: 'Sub-Base', qtyDisplayName: 'Sub Base (Km)', defaultUnit: 'Km' },
  { key: 'basecourse', label: 'Base-Course', qtyDisplayName: 'Base Course (Km)', defaultUnit: 'Km' },
  { key: 'asphalt', label: 'Asphalt Concrete (AC)', qtyDisplayName: 'Asphalt Concrete (Km)', defaultUnit: 'Km' }
];

export function matchPavementLayer(name: string): PavementLayerKey | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (n.includes('asphalt') || n.includes('wearing course') || n.includes('ac (km)')) return 'asphalt';
  if (n.includes('base course') || n.includes('base-course') || n.includes('basecourse') || n.includes('aggregate base')) return 'basecourse';
  if (n.includes('sub base') || n.includes('sub-base') || n.includes('subbase')) return 'subbase';
  if (n.includes('capping')) return 'capping';
  if (n.includes('subgrade') || n.includes('sub-grade') || n.includes('sub grade')) return 'subgrade';
  return null;
}

export function formatStation(km: number): string {
  if (isNaN(km) || km < 0) return 'Km 00+000';
  const kmPart = Math.floor(km);
  const mPart = Math.round((km - kmPart) * 1000);
  return `Km ${String(kmPart).padStart(2, '0')}+${String(mPart).padStart(3, '0')}`;
}

export function parseStation(st: string): number {
  if (!st) return 0;
  const cleaned = st.replace(/[^\d+.]/g, '');
  const parts = cleaned.split('+');
  if (parts.length === 2) {
    const km = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    return km + m / 1000;
  }
  return parseFloat(cleaned) || 0;
}

/**
 * Calculates planned and executed Km totals for a pavement layer from linear diagram data
 */
export function getLinearLayerTotals(project: Project, layer: PavementLayerKey): {
  plannedKm: number;
  executedKm: number;
  mainPlannedKm: number;
  spurPlannedKm: number;
  mainExecutedKm: number;
  spurExecutedKm: number;
} {
  const hasSpur = project.hasSpurRoad !== false;
  const mainPlan = project.linearPlan?.[layer]?.plannedKm || 0;
  const spurPlan = hasSpur ? (project.linearPlanSpur?.[layer]?.plannedKm || 0) : 0;
  const plannedKm = Number((mainPlan + spurPlan).toFixed(2));

  const mainExec = (project.linear?.[layer] || []).reduce((sum, r) => sum + (r.exec || 0), 0);
  const spurExec = hasSpur ? ((project.linearSpur?.[layer] || []).reduce((sum, r) => sum + (r.exec || 0), 0)) : 0;
  const executedKm = Number((mainExec + spurExec).toFixed(2));

  return {
    plannedKm,
    executedKm,
    mainPlannedKm: Number(mainPlan.toFixed(2)),
    spurPlannedKm: Number(spurPlan.toFixed(2)),
    mainExecutedKm: Number(mainExec.toFixed(2)),
    spurExecutedKm: Number(spurExec.toFixed(2))
  };
}

/**
 * Updates project.quantities from Linear Diagram planned values and actual executed progress
 */
export function syncQuantitiesWithLinear(project: Project): QtyItem[] {
  const currentQuantities = [...(project.quantities || [])];
  const totalLength = project.lengthKm || 65;

  PAVEMENT_LAYERS.forEach(cfg => {
    // If capping is disabled on the project, we skip syncing capping if not already present
    if (cfg.key === 'capping' && project.hasCappingLayer === false) {
      return;
    }

    const totals = getLinearLayerTotals(project, cfg.key);
    const existingIndex = currentQuantities.findIndex(q => matchPavementLayer(q.name) === cfg.key);

    if (existingIndex >= 0) {
      const existing = currentQuantities[existingIndex];
      currentQuantities[existingIndex] = {
        ...existing,
        plan: totals.plannedKm,
        exec: totals.executedKm,
        design: existing.design && existing.design > 0 ? existing.design : totalLength
      };
    } else {
      // If not present in the list, insert it
      currentQuantities.push({
        name: cfg.qtyDisplayName,
        design: totalLength,
        plan: totals.plannedKm,
        exec: totals.executedKm
      });
    }
  });

  return currentQuantities;
}

/**
 * Updates Linear Diagram baseline plan and segments when a user edits quantities on the Quantity Page
 */
export function syncLinearFromQuantities(quantities: QtyItem[], project: Project): {
  linear: LinearData;
  linearSpur?: LinearData;
  linearPlan: LinearPlanData;
  linearPlanSpur?: LinearPlanData;
} {
  const hasSpur = project.hasSpurRoad !== false;
  const totalLength = project.lengthKm || 65;
  const spurTarget = hasSpur ? (project.spurRoadLengthKm || 0) : 0;
  const mainTarget = Math.max(0, Number((totalLength - spurTarget).toFixed(2)));

  const updatedLinear: LinearData = {
    subgrade: [...(project.linear?.subgrade || [])],
    capping: [...(project.linear?.capping || [])],
    subbase: [...(project.linear?.subbase || [])],
    basecourse: [...(project.linear?.basecourse || [])],
    asphalt: [...(project.linear?.asphalt || [])]
  };

  const updatedLinearSpur: LinearData = {
    subgrade: [...(project.linearSpur?.subgrade || [])],
    capping: [...(project.linearSpur?.capping || [])],
    subbase: [...(project.linearSpur?.subbase || [])],
    basecourse: [...(project.linearSpur?.basecourse || [])],
    asphalt: [...(project.linearSpur?.asphalt || [])]
  };

  const updatedLinearPlan: LinearPlanData = {
    ...(project.linearPlan || {
      baselineName: 'Approved Baseline Program',
      baselineDate: new Date().toISOString().split('T')[0]
    })
  };

  const updatedLinearPlanSpur: LinearPlanData = {
    ...(project.linearPlanSpur || {
      baselineName: 'Spur Road Approved Baseline Program',
      baselineDate: new Date().toISOString().split('T')[0]
    })
  };

  quantities.forEach(q => {
    const layerKey = matchPavementLayer(q.name);
    if (!layerKey) return;

    // 1. Sync Baseline Plan
    const newPlanVal = Math.max(0, q.plan || 0);
    let mainPlanVal = newPlanVal;
    let spurPlanVal = 0;

    if (hasSpur && spurTarget > 0) {
      mainPlanVal = Math.min(mainTarget, newPlanVal);
      spurPlanVal = Math.min(spurTarget, Math.max(0, Number((newPlanVal - mainPlanVal).toFixed(2))));
    }

    const currentMainPlanLayer = updatedLinearPlan[layerKey] || { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' };
    updatedLinearPlan[layerKey] = {
      ...currentMainPlanLayer,
      plannedKm: Number(mainPlanVal.toFixed(2)),
      toStation: formatStation(mainPlanVal)
    };

    if (hasSpur) {
      const currentSpurPlanLayer = updatedLinearPlanSpur[layerKey] || { plannedKm: 0, fromStation: 'Km 00+000', toStation: 'Km 00+000' };
      updatedLinearPlanSpur[layerKey] = {
        ...currentSpurPlanLayer,
        plannedKm: Number(spurPlanVal.toFixed(2)),
        toStation: formatStation(spurPlanVal)
      };
    }

    // 2. Sync Actual Progress (Segments)
    const newExecVal = Math.max(0, q.exec || 0);
    let mainExecVal = newExecVal;
    let spurExecVal = 0;

    if (hasSpur && spurTarget > 0) {
      mainExecVal = Math.min(mainTarget, newExecVal);
      spurExecVal = Math.min(spurTarget, Math.max(0, Number((newExecVal - mainExecVal).toFixed(2))));
    }

    // Adjust main linear segments to match mainExecVal
    if (mainExecVal > 0) {
      updatedLinear[layerKey] = [
        {
          no: 1,
          from: 'Km 00+000',
          to: formatStation(mainExecVal),
          exec: Number(mainExecVal.toFixed(2))
        }
      ];
    } else {
      updatedLinear[layerKey] = [];
    }

    // Adjust spur linear segments to match spurExecVal
    if (hasSpur) {
      if (spurExecVal > 0) {
        updatedLinearSpur[layerKey] = [
          {
            no: 1,
            from: 'Km 00+000',
            to: formatStation(spurExecVal),
            exec: Number(spurExecVal.toFixed(2))
          }
        ];
      } else {
        updatedLinearSpur[layerKey] = [];
      }
    }
  });

  return {
    linear: updatedLinear,
    linearSpur: hasSpur ? updatedLinearSpur : undefined,
    linearPlan: updatedLinearPlan,
    linearPlanSpur: hasSpur ? updatedLinearPlanSpur : undefined
  };
}

/**
 * Universal synchronization handler for handleProjectUpdate.
 * Ensures any change to quantities or linear data is immediately bidirectional and consistent.
 */
export function syncProjectQuantitiesAndLinear(
  project: Project,
  changes: Partial<Project>
): Partial<Project> {
  // If quantities were modified
  if (changes.quantities !== undefined) {
    const linearSyncResult = syncLinearFromQuantities(changes.quantities, {
      ...project,
      ...changes
    });
    return {
      ...changes,
      linear: linearSyncResult.linear,
      linearPlan: linearSyncResult.linearPlan,
      ...(linearSyncResult.linearSpur ? { linearSpur: linearSyncResult.linearSpur } : {}),
      ...(linearSyncResult.linearPlanSpur ? { linearPlanSpur: linearSyncResult.linearPlanSpur } : {})
    };
  }

  // If linear or linear plan data was modified
  if (
    changes.linear !== undefined ||
    changes.linearSpur !== undefined ||
    changes.linearPlan !== undefined ||
    changes.linearPlanSpur !== undefined ||
    changes.hasSpurRoad !== undefined ||
    changes.hasCappingLayer !== undefined
  ) {
    const updatedMergedProject: Project = {
      ...project,
      ...changes
    };
    const syncedQuantities = syncQuantitiesWithLinear(updatedMergedProject);
    return {
      ...changes,
      quantities: syncedQuantities
    };
  }

  return changes;
}

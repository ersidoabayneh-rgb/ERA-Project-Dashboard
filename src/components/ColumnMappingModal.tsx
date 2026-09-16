import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Clock,
  GitCommit,
  Calendar,
  Settings2,
  Table as TableIcon,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { Project, WorkProgramActivity } from '../types';
import {
  ColumnMappingConfig,
  RawFilePreview,
  applyColumnMapping,
  detectColumnMapping
} from '../lib/columnMapper';

interface ColumnMappingModalProps {
  previewData: RawFilePreview;
  project: Project;
  onApply: (activities: WorkProgramActivity[], mapping: ColumnMappingConfig) => void;
  onClose: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  previewData,
  project,
  onApply,
  onClose
}) => {
  const [mapping, setMapping] = useState<ColumnMappingConfig>(() => ({
    ...previewData.detectedMapping
  }));

  const [activeTab, setActiveTab] = useState<'mapping' | 'raw'>('mapping');

  // Preview the first 10 rows transformed with current mapping
  const sampleActivities = useMemo(() => {
    const rowsToPreview = previewData.rawRows.slice(0, 8);
    return applyColumnMapping(rowsToPreview, mapping, project.startDate);
  }, [previewData.rawRows, mapping, project.startDate]);

  // Overall calculated metrics preview on full dataset
  const fullStatsPreview = useMemo(() => {
    const allParsed = applyColumnMapping(previewData.rawRows, mapping, project.startDate);
    const criticalCount = allParsed.filter(a => a.critical).length;
    const totalDuration = allParsed.reduce((max, a) => Math.max(max, a.eft || 0), 0);
    return {
      totalTasks: allParsed.length,
      criticalCount,
      totalDuration,
      activities: allParsed
    };
  }, [previewData.rawRows, mapping, project.startDate]);

  const handleColumnChange = (field: keyof ColumnMappingConfig, colIdx: number) => {
    setMapping(prev => ({
      ...prev,
      [field]: colIdx
    }));
  };

  const handleResetAutoDetect = () => {
    const redetected = detectColumnMapping(previewData.headers, previewData.rawRows[0]);
    setMapping(redetected);
  };

  const handleConfirmImport = () => {
    onApply(fullStatsPreview.activities, mapping);
  };

  // Helper to render sample value for a column index
  const getSampleValue = (colIdx: number): string => {
    if (colIdx < 0 || colIdx >= previewData.headers.length) return '';
    const sample = previewData.rawRows[0]?.[colIdx];
    return sample !== undefined ? ` (e.g. "${sample.length > 25 ? sample.slice(0, 22) + '...' : sample}")` : '';
  };

  // Target system fields definitions
  const systemFields = [
    {
      key: 'idCol' as const,
      label: 'Activity ID',
      desc: 'Unique identifier or code for each task (e.g. 1, 2, ACT-101, A, B)',
      required: true,
      icon: <Layers className="w-4 h-4 text-blue-500" />,
      tag: 'Required'
    },
    {
      key: 'nameCol' as const,
      label: 'Activity Name',
      desc: 'Task title or work breakdown item description',
      required: true,
      icon: <TableIcon className="w-4 h-4 text-emerald-500" />,
      tag: 'Required'
    },
    {
      key: 'durationCol' as const,
      label: 'Duration (Days)',
      desc: 'Task work duration in working days, hours, or calendar days',
      required: true,
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      tag: 'Required'
    },
    {
      key: 'predecessorCol' as const,
      label: 'Predecessors',
      desc: 'Comma-separated predecessor task IDs driving the CPM sequence (e.g. "1, 2" or "A, B")',
      required: true,
      icon: <GitCommit className="w-4 h-4 text-purple-500" />,
      tag: 'CPM Logic'
    },
    {
      key: 'lagCol' as const,
      label: 'Lag (Days)',
      desc: 'Lead or lag offset delay days applied to the predecessor link',
      required: false,
      icon: <ArrowUpRight className="w-4 h-4 text-cyan-500" />,
      tag: 'Optional'
    },
    {
      key: 'seqTypeCol' as const,
      label: 'Sequence Type',
      desc: 'Relationship link constraint: FS (Finish-to-Start), SS, FF, or SF',
      required: false,
      icon: <Settings2 className="w-4 h-4 text-indigo-500" />,
      tag: 'Optional'
    },
    {
      key: 'startCol' as const,
      label: 'Start Date',
      desc: 'Explicit baseline or planned start date (e.g. "Oct 15, 2025" or "2025-10-15")',
      required: false,
      icon: <Calendar className="w-4 h-4 text-blue-400" />,
      tag: 'Calendar'
    },
    {
      key: 'finishCol' as const,
      label: 'Finish Date',
      desc: 'Explicit baseline or planned finish date for milestone tracking',
      required: false,
      icon: <Calendar className="w-4 h-4 text-emerald-400" />,
      tag: 'Calendar'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-150 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                  Custom Column Mapping Interface
                </h3>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {previewData.fileType}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  • {previewData.fileName} ({(previewData.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Map custom columns from your uploaded file to standard CPM fields (<code className="font-mono text-[11px] bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded">ID, Name, Duration, Predecessors, Lag, Sequence Type</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAutoDetect}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition"
              title="Re-run intelligent column detection"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Detection</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Metrics Header Chip Bar */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 px-5 py-2.5 flex items-center justify-between flex-wrap gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Detected Rows:</span>
              <strong className="text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {previewData.totalRows} Activities
              </strong>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Critical Path:</span>
              <strong className="text-rose-600 dark:text-rose-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                {fullStatsPreview.criticalCount} Tasks (0 Float)
              </strong>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Total Project Duration:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                {fullStatsPreview.totalDuration} Days
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('mapping')}
              className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                activeTab === 'mapping'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Column Configuration
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 rounded-md font-bold text-xs transition ${
                activeTab === 'raw'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Raw File Preview
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {previewData.warnings && previewData.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Import Notice</p>
                <p className="text-[11px] mt-0.5">{previewData.warnings.join(' ')}</p>
              </div>
            </div>
          )}

          {activeTab === 'mapping' ? (
            <>
              {/* Mapping Controls Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    Target System Fields &amp; Source CSV Mapping
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Matches are pre-selected using intelligent header recognition
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {systemFields.map(field => {
                    const selectedIdx = mapping[field.key];
                    const isMapped = selectedIdx !== -1;

                    return (
                      <div
                        key={field.key}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isMapped
                            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                            : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                              {field.icon}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-zinc-100">
                                {field.label}
                              </span>
                              <span
                                className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  field.required
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {field.tag}
                              </span>
                            </div>
                          </div>

                          {isMapped ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Mapped
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Unmapped / Auto
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                          {field.desc}
                        </p>

                        <div className="flex items-center gap-2">
                          <select
                            value={selectedIdx}
                            onChange={(e) => handleColumnChange(field.key, parseInt(e.target.value, 10))}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value={-1}>-- Unmapped / Auto-Calculate --</option>
                            {previewData.headers.map((hdr, idx) => (
                              <option key={idx} value={idx}>
                                Col {idx + 1}: {hdr}{getSampleValue(idx)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Default Fallback Settings */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <h5 className="font-bold text-slate-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                  Default Fallback Values (for missing or empty column entries)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Default Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={mapping.defaultDuration}
                      onChange={(e) => setMapping(prev => ({ ...prev, defaultDuration: parseInt(e.target.value, 10) || 10 }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Default Sequence Type
                    </label>
                    <select
                      value={mapping.defaultSeqType}
                      onChange={(e) => setMapping(prev => ({ ...prev, defaultSeqType: e.target.value as any }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200"
                    >
                      <option value="FS">FS (Finish-to-Start)</option>
                      <option value="SS">SS (Start-to-Start)</option>
                      <option value="FF">FF (Finish-to-Finish)</option>
                      <option value="SF">SF (Start-to-Finish)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Default Lag (Days)
                    </label>
                    <input
                      type="number"
                      value={mapping.defaultLag}
                      onChange={(e) => setMapping(prev => ({ ...prev, defaultLag: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Live Transformed Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-emerald-500" />
                    Live Transformed Data Preview (First {sampleActivities.length} Activities)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Real-time CPM logic calculation based on selected column mappings
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5 min-w-[200px]">Activity Name</th>
                        <th className="p-2.5 text-center">Duration</th>
                        <th className="p-2.5">Predecessors</th>
                        <th className="p-2.5 text-center">Lag</th>
                        <th className="p-2.5 text-center">Seq Type</th>
                        <th className="p-2.5">Start Date</th>
                        <th className="p-2.5">Finish Date</th>
                        <th className="p-2.5 text-center">CPM Float</th>
                        <th className="p-2.5 text-center">Critical</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-zinc-200">
                      {sampleActivities.map((act, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                            act.critical ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-2.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                            {act.id}
                          </td>
                          <td className="p-2.5 font-medium">
                            {act.name}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">
                            {act.duration}d
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {act.predecessors || '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {act.lag || 0}d
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {act.depType || 'FS'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {act.start || '—'}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {act.finish || '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            <span className={act.float === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {act.float}d
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {act.critical ? (
                              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                                CRITICAL
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Non-crit</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Raw File Preview Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs">
                  Raw File Columns and Rows (First 15 Rows)
                </h4>
                <span className="text-[11px] text-slate-400">
                  {previewData.headers.length} columns detected in {previewData.fileName}
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-96 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center bg-slate-200 dark:bg-slate-750">#</th>
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="p-2.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-mono">Col {i + 1}</span>
                            <span>{h}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-zinc-200">
                    {previewData.rawRows.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 text-center text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/40">
                          {rIdx + 1}
                        </td>
                        {previewData.headers.map((_, cIdx) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                            {row[cIdx] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Synchronizing will immediately plot <strong>{fullStatsPreview.totalTasks} activities</strong> onto the interactive Gantt &amp; CPM Network diagram.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmImport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-md hover:shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply Mapping &amp; Import ({fullStatsPreview.totalTasks} Tasks)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

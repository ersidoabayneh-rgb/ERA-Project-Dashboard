import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  User, 
  Clock, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  SlidersHorizontal,
  ChevronsUpDown,
  Maximize2,
  Minimize2,
  Trash2,
  Download
} from 'lucide-react';
import { HistoryItem, HistoryChangeDetail, formatAccounting } from '../types';

interface ChangelogAuditHistoryProps {
  history: HistoryItem[];
  onClearHistory?: () => void;
  canClear?: boolean;
}

export default function ChangelogAuditHistory({
  history = [],
  onClearHistory,
  canClear = false
}: ChangelogAuditHistoryProps) {
  // Main section collapse state (defaults to open)
  const [isSectionOpen, setIsSectionOpen] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');

  // Set of individual item IDs/indices that have their detailed diffs expanded
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  // Pagination or items limit
  const [displayLimit, setDisplayLimit] = useState(50);

  // Extract unique sections and users for filter dropdowns
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    history.forEach(h => {
      if (h.section) set.add(h.section);
    });
    return Array.from(set).sort();
  }, [history]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    history.forEach(h => {
      if (h.user) set.add(h.user);
    });
    return Array.from(set).sort();
  }, [history]);

  // Filter history items
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Section filter
      if (selectedSectionFilter !== 'ALL' && item.section !== selectedSectionFilter) {
        return false;
      }

      // User filter
      if (selectedUserFilter !== 'ALL' && item.user !== selectedUserFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const userMatch = (item.user || '').toLowerCase().includes(query);
        const sectionMatch = (item.section || '').toLowerCase().includes(query);
        const detailsMatch = (item.details || '').toLowerCase().includes(query);
        const timeMatch = (item.timestamp || '').toLowerCase().includes(query);
        const changesMatch = (item.changes || []).some(
          c =>
            (c.field || '').toLowerCase().includes(query) ||
            (c.label || '').toLowerCase().includes(query) ||
            String(c.oldVal || '').toLowerCase().includes(query) ||
            String(c.newVal || '').toLowerCase().includes(query) ||
            (c.description || '').toLowerCase().includes(query)
        );

        return userMatch || sectionMatch || detailsMatch || timeMatch || changesMatch;
      }

      return true;
    });
  }, [history, selectedSectionFilter, selectedUserFilter, searchQuery]);

  const toggleItemExpansion = (key: string) => {
    setExpandedItemIds(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleToggleAllItems = () => {
    if (allExpanded) {
      setExpandedItemIds({});
      setAllExpanded(false);
    } else {
      const next: Record<string, boolean> = {};
      filteredHistory.forEach((_, idx) => {
        next[`item_${idx}`] = true;
      });
      setExpandedItemIds(next);
      setAllExpanded(true);
    }
  };

  const exportChangelogCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['#', 'Timestamp', 'User', 'Role', 'Section', 'Physical Progress (%)', 'Details / Changes'];
    const rows = filteredHistory.map((h, i) => {
      const hProg = typeof h?.physicalProgress === 'number'
        ? h.physicalProgress
        : (parseFloat(String(h?.physicalProgress || 0)) || 0);
      const changesText = (h.changes && h.changes.length > 0)
        ? h.changes.map(c => `${c.label || c.field}: ${c.oldVal ?? ''} -> ${c.newVal ?? ''}`).join(' | ')
        : (h.details || '');

      return [
        i + 1,
        `"${h.timestamp || ''}"`,
        `"${h.user || ''}"`,
        `"${h.role || ''}"`,
        `"${h.section || ''}"`,
        hProg.toFixed(2),
        `"${changesText.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Changelog_Audit_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print">
      {/* Collapsible Section Header */}
      <div 
        onClick={() => setIsSectionOpen(!isSectionOpen)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight">
                Changelog Audit History
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50">
                {history.length} {history.length === 1 ? 'Record' : 'Records'} (Retains 100+)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
              Comprehensive chronological record of user modifications, field-level before/after diffs, and audit snapshots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            title={isSectionOpen ? 'Collapse Changelog Section' : 'Expand Changelog Section'}
          >
            {isSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content Area */}
      <AnimatePresence initial={false}>
        {isSectionOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* Controls Toolbar: Search, Filters & Actions */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-150 dark:border-slate-800/70">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search user, section, field changed, or before/after values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns & Toolbar Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Section Filter */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedSectionFilter}
                      onChange={(e) => setSelectedSectionFilter(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                    >
                      <option value="ALL">All Sections ({uniqueSections.length})</option>
                      {uniqueSections.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>

                  {/* User Filter */}
                  {uniqueUsers.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={selectedUserFilter}
                        onChange={(e) => setSelectedUserFilter(e.target.value)}
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="ALL">All Users ({uniqueUsers.length})</option>
                        {uniqueUsers.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Expand/Collapse All Items Button */}
                  {filteredHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllItems}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      title={allExpanded ? "Collapse all detailed field changes" : "Expand all detailed field changes"}
                    >
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                      <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
                    </button>
                  )}

                  {/* Export CSV Button */}
                  {filteredHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={exportChangelogCsv}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      title="Export Changelog to CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>
                  )}

                  {/* Clear History Button (if permitted) */}
                  {canClear && onClearHistory && history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear the audit changelog history for this project?')) {
                          onClearHistory();
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors flex items-center gap-1"
                      title="Clear changelog history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status counter bar */}
              <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  Showing <strong>{Math.min(filteredHistory.length, displayLimit)}</strong> of <strong>{filteredHistory.length}</strong> changelog entries
                  {(selectedSectionFilter !== 'ALL' || selectedUserFilter !== 'ALL' || searchQuery) && ' (Filtered)'}
                </span>
                <span>Max retention: 100+ audit logs</span>
              </div>

              {/* Changelog Entries List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredHistory.slice(0, displayLimit).map((h, i) => {
                  const itemKey = `item_${i}`;
                  const isItemExpanded = !!expandedItemIds[itemKey] || allExpanded;
                  const hasStructuredChanges = Array.isArray(h.changes) && h.changes.length > 0;
                  
                  const hProg = typeof h?.physicalProgress === 'number'
                    ? h.physicalProgress
                    : (parseFloat(String(h?.physicalProgress || 0)) || 0);

                  return (
                    <div 
                      key={h.id || i}
                      className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-2.5 text-xs transition-shadow hover:shadow-xs"
                    >
                      {/* Entry Header: Serial, Timestamp, User, Section & Progress */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            #{filteredHistory.length - i}
                          </span>
                          
                          <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {h.timestamp}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{h.user || 'Unknown User'}</span>
                            {h.role && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 border-l border-slate-300 dark:border-slate-700 pl-1 ml-0.5">
                                {h.role}
                              </span>
                            )}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                            <Layers className="w-3 h-3 text-blue-400" />
                            <span>{h.section || 'General'}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            {hProg.toFixed(2)}% Progress
                          </span>

                          {hasStructuredChanges && (
                            <button
                              type="button"
                              onClick={() => toggleItemExpansion(itemKey)}
                              className="px-2 py-0.5 rounded text-2xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                            >
                              <span>{h.changes!.length} {h.changes!.length === 1 ? 'Change' : 'Changes'}</span>
                              {isItemExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Change Description Summary */}
                      {h.details && (
                        <div className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed text-xs">
                          {h.details}
                        </div>
                      )}

                      {/* Detailed Before/After Field Diff Table (Collapsible) */}
                      {hasStructuredChanges && isItemExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5"
                        >
                          <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            Field-Level Audit Breakdown:
                          </div>
                          
                          <div className="grid grid-cols-1 gap-1.5">
                            {h.changes!.map((change, cIdx) => (
                              <div 
                                key={cIdx}
                                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs"
                              >
                                <div className="font-semibold text-slate-800 dark:text-slate-200 min-w-36">
                                  {change.label || change.field}
                                </div>

                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                  {change.oldVal !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 line-through opacity-85">
                                      {String(change.oldVal)}
                                    </span>
                                  )}
                                  {change.oldVal !== undefined && change.newVal !== undefined && (
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  )}
                                  {change.newVal !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 font-medium">
                                      {String(change.newVal)}
                                    </span>
                                  )}
                                </div>

                                {change.description && (
                                  <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                                    {change.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}

                {filteredHistory.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-medium text-xs space-y-1">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                    <div>No changelog entries match your criteria.</div>
                    {(selectedSectionFilter !== 'ALL' || selectedUserFilter !== 'ALL' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedSectionFilter('ALL');
                          setSelectedUserFilter('ALL');
                        }}
                        className="text-xs text-blue-500 underline hover:text-blue-600 mt-1"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                )}

                {/* Show more button if filtered length > displayLimit */}
                {filteredHistory.length > displayLimit && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(prev => prev + 50)}
                      className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                    >
                      Load More History Records (+50)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

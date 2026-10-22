import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Key, 
  Download, 
  RefreshCw, 
  Clock, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Layers, 
  Eye, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database,
  Building,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { WorkflowAuditLogEntry, Project, User } from '../types';

interface SecurityAuditLogViewProps {
  auditLogs?: WorkflowAuditLogEntry[];
  projects?: Project[];
  currentUser?: User | null;
  onClearLogs?: () => void;
}

export const SecurityAuditLogView: React.FC<SecurityAuditLogViewProps> = ({
  auditLogs = [],
  projects = [],
  currentUser,
  onClearLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [contractFilter, setContractFilter] = useState<string>('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Derive unique actors from logs
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(log => {
      if (log.actor) set.add(log.actor);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Derive unique projects / contracts from logs and projects list
  const uniqueContracts = useMemo(() => {
    const map = new Map<string, string>();
    auditLogs.forEach(log => {
      if (log.projectId) {
        map.set(log.projectId, log.projectName || `Project #${log.projectId}`);
      }
    });
    projects.forEach(p => {
      if (!map.has(p.id)) {
        map.set(p.id, p.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [auditLogs, projects]);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return auditLogs.filter(log => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const actorMatch = log.actor?.toLowerCase().includes(query);
        const actionMatch = log.action?.toLowerCase().includes(query);
        const projectMatch = log.projectName?.toLowerCase().includes(query) || log.projectId?.toLowerCase().includes(query);
        const sectionMatch = log.section?.toLowerCase().includes(query);
        const detailsMatch = log.details?.toLowerCase().includes(query);
        const commentsMatch = log.comments?.toLowerCase().includes(query);
        if (!actorMatch && !actionMatch && !projectMatch && !sectionMatch && !detailsMatch && !commentsMatch) {
          return false;
        }
      }

      // Action type filter
      if (actionFilter !== 'ALL') {
        if (actionFilter === 'APPROVALS') {
          if (log.action !== 'APPROVED' && log.action !== 'COMMITTED_TO_MAIN_DB') return false;
        } else if (actionFilter === 'SUBMISSIONS') {
          if (log.action !== 'SUBMITTED_FOR_APPROVAL') return false;
        } else if (actionFilter === 'REJECTIONS') {
          if (log.action !== 'REJECTED' && log.action !== 'CHANGES_REQUESTED') return false;
        } else if (actionFilter === 'DRAFTS') {
          if (!log.action.startsWith('DRAFT_')) return false;
        } else if (actionFilter === 'SECURITY_MFA') {
          if (!log.action.includes('MFA') && !log.action.includes('ACCESS') && !log.action.includes('PREVENTED')) return false;
        } else if (log.action !== actionFilter) {
          return false;
        }
      }

      // Actor filter
      if (actorFilter !== 'ALL' && log.actor !== actorFilter) {
        return false;
      }

      // Contract filter
      if (contractFilter !== 'ALL' && log.projectId !== contractFilter) {
        return false;
      }

      // Time range filter
      if (timeRangeFilter !== 'ALL') {
        const logTime = new Date(log.timestamp).getTime();
        const diff = now - logTime;
        if (timeRangeFilter === 'TODAY' && diff > oneDay) return false;
        if (timeRangeFilter === 'WEEK' && diff > oneWeek) return false;
        if (timeRangeFilter === 'MONTH' && diff > oneMonth) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [auditLogs, searchTerm, actionFilter, actorFilter, contractFilter, timeRangeFilter, sortOrder]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let approvals = 0;
    let submissions = 0;
    let rejections = 0;
    let securityEvents = 0;

    auditLogs.forEach(l => {
      if (l.action === 'APPROVED' || l.action === 'COMMITTED_TO_MAIN_DB') approvals++;
      else if (l.action === 'SUBMITTED_FOR_APPROVAL') submissions++;
      else if (l.action === 'REJECTED' || l.action === 'CHANGES_REQUESTED') rejections++;
      else if (l.action.includes('MFA') || l.action.includes('ACCESS') || l.action.includes('PREVENTED')) securityEvents++;
    });

    return {
      total: auditLogs.length,
      approvals,
      submissions,
      rejections,
      securityEvents
    };
  }, [auditLogs]);

  // Format date and time
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVED':
      case 'COMMITTED_TO_MAIN_DB':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          label: action === 'COMMITTED_TO_MAIN_DB' ? 'Committed to Database' : 'Approved',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'SUBMITTED_FOR_APPROVAL':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
          label: 'Submitted for Approval',
          bgColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
          label: 'Rejected',
          bgColor: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        };
      case 'CHANGES_REQUESTED':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          label: 'Changes Requested',
          bgColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'MFA_CHALLENGE_VERIFIED':
      case 'ACCESS_GRANTED':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
          label: action === 'MFA_CHALLENGE_VERIFIED' ? 'MFA Verified' : 'Access Granted',
          bgColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'SELF_APPROVAL_PREVENTED':
      case 'MFA_CHALLENGE_FAILED':
      case 'ACCESS_REVOKED':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          label: action.replace(/_/g, ' '),
          bgColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
          label: action.replace(/_/g, ' '),
          bgColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    const headers = ['Log ID', 'Timestamp', 'Action Type', 'Actor', 'Actor Role', 'Project ID', 'Project / Contract Name', 'Section', 'Details', 'Comments'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.actor}"`,
      `"${l.actorRole || ''}"`,
      `"${l.projectId || ''}"`,
      `"${(l.projectName || '').replace(/"/g, '""')}"`,
      `"${(l.section || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.comments || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ERA_Security_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  Governance & Compliance
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Immutable Audit Trail
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Security & Workflow Audit Log
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive, tamper-resistant record of all critical editor submissions, approver determinations, MFA validations, and contract updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
              title="Export filtered audit logs as CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            {onClearLogs && (currentUser?.role === 'master_admin' || currentUser?.role === 'admin') && (
              <button
                type="button"
                onClick={onClearLogs}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-red-200 dark:border-red-800"
                title="Clear audit trail (Master Admin only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Aggregate KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Events</span>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {metrics.total}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">Approvals & Commits</span>
            <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
              {metrics.approvals}
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">Submissions</span>
            <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-300 mt-1">
              {metrics.submissions}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Rejections / Changes</span>
            <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-300 mt-1">
              {metrics.rejections}
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">Security / MFA</span>
            <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 mt-1">
              {metrics.securityEvents}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Multi-Filter Control Console */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by actor username, action type, contract name, section, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort order toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Action Type:
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Action Types</option>
              <option value="APPROVALS">Approvals & Commits (APPROVED)</option>
              <option value="SUBMISSIONS">Submissions (SUBMITTED)</option>
              <option value="REJECTIONS">Rejections & Changes (REJECTED)</option>
              <option value="DRAFTS">Draft Operations</option>
              <option value="SECURITY_MFA">MFA & Access Controls</option>
              <option value="DRAFT_CREATED">DRAFT_CREATED</option>
              <option value="DRAFT_UPDATED">DRAFT_UPDATED</option>
              <option value="SUBMITTED_FOR_APPROVAL">SUBMITTED_FOR_APPROVAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
              <option value="COMMITTED_TO_MAIN_DB">COMMITTED_TO_MAIN_DB</option>
              <option value="MFA_CHALLENGE_VERIFIED">MFA_CHALLENGE_VERIFIED</option>
              <option value="SELF_APPROVAL_PREVENTED">SELF_APPROVAL_PREVENTED</option>
            </select>
          </div>

          {/* Actor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Actor / User:
            </label>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Actors ({uniqueActors.length})</option>
              {uniqueActors.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </div>

          {/* Affected Contract Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Affected Contract:
            </label>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 outline-none truncate"
            >
              <option value="ALL">All Affected Contracts ({uniqueContracts.length})</option>
              {uniqueContracts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Time Range:
            </label>
            <select
              value={timeRangeFilter}
              onChange={(e: any) => setTimeRangeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Historical Records</option>
              <option value="TODAY">Today (Last 24 Hours)</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filter stats bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredLogs.length}</strong> of <strong className="text-slate-900 dark:text-white font-mono">{auditLogs.length}</strong> audit records</span>
          {(searchTerm || actionFilter !== 'ALL' || actorFilter !== 'ALL' || contractFilter !== 'ALL' || timeRangeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActionFilter('ALL');
                setActorFilter('ALL');
                setContractFilter('ALL');
                setTimeRangeFilter('ALL');
              }}
              className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No Matching Audit Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No audit actions match your selected search criteria. Try adjusting the action type, actor, or contract filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3.5 text-left w-48">Timestamp</th>
                  <th className="p-3.5 text-left min-w-[190px]">Action Type</th>
                  <th className="p-3.5 text-left min-w-[150px]">Actor & Role</th>
                  <th className="p-3.5 text-left min-w-[240px]">Affected Contract / Project</th>
                  <th className="p-3.5 text-left min-w-[260px]">Action Details & Audit Scope</th>
                  <th className="p-3.5 text-center w-16">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.map(log => {
                  const badge = getActionBadge(log.action);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedLogId(prev => prev === log.id ? null : log.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer ${
                          isExpanded ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                            {formatDateTime(log.timestamp)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </td>

                        {/* Action Type */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badge.bgColor}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* Actor & Role */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] uppercase font-mono font-bold text-slate-700 dark:text-slate-300">
                              {log.actor.slice(0, 2)}
                            </span>
                            <span>{log.actor}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 capitalize">
                            Role: {log.actorRole || 'Authorized User'}
                          </div>
                        </td>

                        {/* Affected Contract / Project */}
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1" title={log.projectName}>
                            {log.projectName || `Contract #${log.projectId || 'N/A'}`}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            {log.section && (
                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                                {log.section}
                              </span>
                            )}
                            {log.projectId && <span>ID: {log.projectId}</span>}
                          </div>
                        </td>

                        {/* Action Details */}
                        <td className="p-3.5">
                          <p className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2">
                            {log.details || log.comments || 'Action performed and logged to audit trail.'}
                          </p>
                        </td>

                        {/* Expand Icon */}
                        <td className="p-3.5 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 mx-auto text-blue-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mx-auto hover:text-slate-600" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Audit Metadata Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-850/80">
                          <td colSpan={6} className="p-4.5 border-b border-slate-200 dark:border-slate-750">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Database className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Full Audit Event Record Details</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Log ID: {log.id}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action Identifier</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Actor Account</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{log.actor} ({log.actorRole})</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Associated Draft ID</span>
                                  <span className="font-mono text-slate-700 dark:text-slate-300">{log.draftId || 'Direct Action'}</span>
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Execution Details</span>
                                <p className="text-xs font-mono bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                  {log.details}
                                </p>
                              </div>

                              {log.comments && (
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Approver / Reviewer Comments</span>
                                  <p className="text-xs italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                                    "{log.comments}"
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span>🔒 Compliance: Ethiopian Roads Administration Audit Standard</span>
                                {log.mfaUsed && (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    MFA Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

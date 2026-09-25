import React, { useState, useMemo } from 'react';
import { Search, X, FileText, Scale, CheckCircle, AlertTriangle, ShieldAlert, Sparkles, Filter, Tag, ArrowRight } from 'lucide-react';
import { Project } from '../types';
import { 
  searchFidicProjectDocuments, 
  getFidicContractInfo, 
  FidicProjectDocumentSearchResult 
} from '../lib/fidicClauseEngine';

interface FidicDocumentSearchBarProps {
  project: Project;
  title?: string;
  description?: string;
  defaultOpen?: boolean;
}

export default function FidicDocumentSearchBar({ 
  project, 
  title = "FIDIC Contract Clause & Document Search Engine",
  description = "Filter project documents by FIDIC clause numbers, keywords, and legal obligations grounded in the active FIDIC contract type and delivery method.",
  defaultOpen = true
}: FidicDocumentSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fidicInfo = useMemo(() => getFidicContractInfo(project), [project]);

  const searchResults = useMemo(() => {
    let results = searchFidicProjectDocuments(project, searchQuery);
    if (selectedCategory !== 'All') {
      results = results.filter(r => r.doc.documentType === selectedCategory);
    }
    return results;
  }, [project, searchQuery, selectedCategory]);

  const quickClauseChips = fidicInfo.editionYear === '1987' 
    ? [
        { label: 'Clause 42.1 [Site Access / ROW]', query: '42.1' },
        { label: 'Clause 44.1 [EOT Claims]', query: '44.1' },
        { label: 'Clause 46.1 [Rate of Progress]', query: '46.1' },
        { label: 'Clause 53.1 [28-Day Claim Bar]', query: '53.1' },
        { label: 'Clause 60.10 [Payment Interest]', query: '60.10' },
        { label: 'Clause 70.1 [Price Escalation]', query: '70.1' },
        { label: 'Clause 52.2 [BOQ Rate Fixing]', query: '52.2' },
        { label: 'Clause 67.1 [Dispute Decision]', query: '67.1' },
      ]
    : [
        { label: 'Sub-Clause 2.1 [ROW Access]', query: '2.1' },
        { label: 'Sub-Clause 4.2 [Bonds]', query: '4.2' },
        { label: 'Sub-Clause 5.2 [Design]', query: '5.2' },
        { label: 'Sub-Clause 8.4 / 8.5 [EOT Claims]', query: '8.4' },
        { label: 'Sub-Clause 8.6 / 8.8 [Progress Delay]', query: '8.6' },
        { label: 'Sub-Clause 13.8 / 13.7 [Price Adj]', query: '13.8' },
        { label: 'Sub-Clause 14.7 [Payment Cycle]', query: '14.7' },
        { label: 'Sub-Clause 20.1 / 20.2 [28-Day Bar]', query: '20.1' },
      ];

  const categoryOptions = [
    'All',
    'Contract Agreement',
    'Particular Conditions',
    'Work Program Submittal',
    'Financial IPC',
    'ROW Handover',
    'Security Bond',
    'Claim Notice',
    'Design Submittal',
    'Variation Order',
    'Quality & WIR'
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/10 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-white uppercase tracking-wide flex items-center gap-2 flex-wrap">
              {title}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-bold">
                {fidicInfo.fidicName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-bold">
                {project.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {searchResults.length} Documents Found
          </span>
        </div>
      </div>

      {/* Active FIDIC Edition & Exact Sub-Clause Mapping Summary */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl text-[10.5px] space-y-2 border border-indigo-900/60 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-800/40 pb-1.5">
          <span className="font-mono font-bold text-indigo-300 uppercase tracking-wider text-[9.5px] flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            Exact Clauses for {fidicInfo.fidicName} ({fidicInfo.deliveryMethodName})
          </span>
          <span className="text-[9.5px] font-mono text-indigo-200/80">
            Governing Law: Ethiopian Civil Code & ERA Manuals
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-0.5 text-[9.5px] font-mono">
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">EOT Claim</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.eot}>{fidicInfo.clauses.eot}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">Progress Delay</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.progressRate}>{fidicInfo.clauses.progressRate}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">Claims Notice</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.claims}>{fidicInfo.clauses.claims}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">Determination</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.engineerDetermination}>{fidicInfo.clauses.engineerDetermination}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">Payment Cycle</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.ipcPayment}>{fidicInfo.clauses.ipcPayment}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded border border-white/10">
            <span className="text-indigo-300 block font-bold">Price Adjustment</span>
            <span className="text-white font-semibold block truncate" title={fidicInfo.clauses.priceAdjustment}>{fidicInfo.clauses.priceAdjustment}</span>
          </div>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by FIDIC clause number (e.g. 8.4, 20.1, 14.7) or keywords (delay, EOT, IPC, ROW, bond, design)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Clause Chips & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-indigo-500" />
            Quick Clauses:
          </span>
          {quickClauseChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => setSearchQuery(chip.query)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer border ${
                searchQuery === chip.query
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}

          {/* Category Dropdown */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Doc Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-[10.5px] font-bold py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-indigo-500"
            >
              {categoryOptions.map((cat, cIdx) => (
                <option key={cIdx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Display */}
      <div className="space-y-3 pt-2">
        {searchResults.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No project documents matched your FIDIC query "{searchQuery}"
            </p>
            <p className="text-[10px] text-slate-400">
              Try searching for standard FIDIC Clause numbers such as <code className="font-mono font-bold text-indigo-500">1.9</code>, <code className="font-mono font-bold text-indigo-500">2.1</code>, <code className="font-mono font-bold text-indigo-500">8.4</code>, <code className="font-mono font-bold text-indigo-500">8.6</code>, <code className="font-mono font-bold text-indigo-500">13.8</code>, <code className="font-mono font-bold text-indigo-500">14.7</code>, or <code className="font-mono font-bold text-indigo-500">20.1</code>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {searchResults.map((res, rIdx) => {
              const { doc, matchedClause, matchedKeywords } = res;

              let statusBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
              let statusIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
              if (doc.status === 'Critical Risk' || doc.status === 'Action Required') {
                statusBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
                statusIcon = <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
              } else if (doc.status === 'Caution') {
                statusBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
              }

              return (
                <div 
                  key={doc.id || rIdx}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition-all space-y-3"
                >
                  {/* Result Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {doc.documentType}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${statusBadge}`}>
                          {statusIcon}
                          {doc.status}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 font-medium">
                          Logged: {doc.dateLogged}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug pt-1">
                        {doc.documentTitle}
                      </h4>
                    </div>

                    {/* Matched FIDIC Clause Badge */}
                    <div className="shrink-0 self-start sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white font-mono font-extrabold text-xs shadow-2xs">
                        <Scale className="w-3.5 h-3.5" />
                        {doc.fidicSubClause}
                      </span>
                    </div>
                  </div>

                  {/* Summary & Keywords Ribbon */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {doc.documentSummary}
                    </p>
                    {matchedKeywords.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[9.5px]">
                        <Tag className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="font-mono text-slate-400 font-bold">Matched Terms:</span>
                        {matchedKeywords.map((kw, kwIdx) => (
                          <span key={kwIdx} className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono font-bold">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FIDIC Legal Analysis & Recommendation Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[10.5px]">
                    <div className="p-3 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-750 rounded-lg space-y-1">
                      <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        FIDIC Clausal Legal Analysis ({fidicInfo.fidicName.split(' (')[0]})
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {doc.contractualAnalysis}
                      </p>
                    </div>

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg space-y-1">
                      <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Actionable Clausal Recommendation ({project.contractType === 'DB' ? 'Design-Build' : 'Design-Bid-Build'})
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                        {doc.analysisRecommendation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

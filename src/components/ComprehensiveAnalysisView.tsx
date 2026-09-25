import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldAlert, Award, TrendingUp, HelpCircle, FileText, CheckCircle, Clock, Scale, BookOpen, AlertCircle, ShieldCheck, UserCheck, HardHat, Compass, Landmark, Filter } from 'lucide-react';
import { Project, formatAccounting } from '../types';
import { calculateProjectEvm } from '../lib/evmCalculations';
import { 
  getFidicContractInfo, 
  generateFidicContractualAnalysis
} from '../lib/fidicClauseEngine';
import CpmLinearComparison from './CpmLinearComparison';

interface ComprehensiveAnalysisViewProps {
  project: Project;
}

export default function ComprehensiveAnalysisView({ project }: ComprehensiveAnalysisViewProps) {
  // Use centralized, unified EVM metrics calculation
  const evm = calculateProjectEvm(project);
  const { BAC, AC, EV, PV, CPI, SPI, CV, SV, EAC, VAC, TCPI } = evm;

  // FIDIC Clause Engine Analysis
  const fidicInfo = getFidicContractInfo(project);
  const fidicAnalysis = generateFidicContractualAnalysis(project);

  // Filter State for 3-Party Breach Analysis Matrix
  const [selectedParty, setSelectedParty] = useState<'All' | 'Contractor' | 'Supervision Consultant' | 'Employer (Client)'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Critical Risk' | 'Action Required' | 'Caution' | 'Compliant'>('All');

  // Party Counts
  const contractorCount = fidicAnalysis.filter(a => a.responsibleParty === 'Contractor').length;
  const consultantCount = fidicAnalysis.filter(a => a.responsibleParty === 'Supervision Consultant').length;
  const employerCount = fidicAnalysis.filter(a => a.responsibleParty === 'Employer (Client)').length;

  // Filtered Analysis List
  const filteredAnalysis = fidicAnalysis.filter(item => {
    const matchesParty = selectedParty === 'All' || item.responsibleParty === selectedParty;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesParty && matchesStatus;
  });

  // Tiers warnings
  const getIndexColor = (v: number) => {
    if (v >= 1.0) return 'text-emerald-500';
    if (v >= 0.90) return 'text-amber-500';
    return 'text-rose-500 font-extrabold';
  };

  const getStatusDesc = (c: number, s: number) => {
    if (c >= 1.0 && s >= 1.0) return { label: 'Excellent Conformance', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' };
    if (c >= 0.90 && s >= 0.90) return { label: 'Moderate Caution', color: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' };
    return { label: 'Critical Variance Notice', color: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 animate-pulse' };
  };

  const status_flag = getStatusDesc(CPI, SPI);

  const formatBr = (v: number) => formatAccounting(v, 'Br.');

  return (
    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
      
      {/* FIDIC Contract & Delivery Method Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-900/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/30">
              <BookOpen className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                FIDIC Contract & Delivery Method Framework
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {fidicInfo.contractType}
                </span>
              </h2>
              <p className="text-2xs text-indigo-200/80">
                Grounding project EVM, claims, variations, and performance analysis in exact FIDIC Conditions of Contract and delivery responsibilities.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-2xs">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-900/80 text-indigo-200 font-medium border border-indigo-700/50">
              Edition: <strong className="text-white">{fidicInfo.fidicName}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-900/80 text-indigo-200 font-medium border border-indigo-700/50">
              Delivery: <strong className="text-white">{fidicInfo.deliveryMethodName}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-2xs pt-1">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-indigo-300 font-semibold block uppercase tracking-wider text-[9px]">Design Responsibility</span>
            <span className="text-slate-100 font-medium block mt-0.5">{fidicInfo.designResponsibility}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-indigo-300 font-semibold block uppercase tracking-wider text-[9px]">Engineer Authority & Role</span>
            <span className="text-slate-100 font-medium block mt-0.5">{fidicInfo.engineerRole}</span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-indigo-300 font-semibold block uppercase tracking-wider text-[9px]">Governing Law & Jurisdiction</span>
            <span className="text-slate-100 font-medium block mt-0.5">{fidicInfo.governingLaw}</span>
          </div>
        </div>
      </div>

      {/* Overview EVM Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Callout */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Project Health Status
          </span>
          <div className="my-2">
            <span className={`text-base font-extrabold tracking-tight px-3 py-1 rounded-xl ${status_flag.color}`}>
              {status_flag.label}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            EVM indices are recalculated dynamically as editors commit certificates or update monthly progress.
          </p>
        </div>

        {/* CPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Cost Performance Index (CPI)
          </span>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${getIndexColor(CPI)}`}>
              {CPI.toFixed(3)}
            </span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase">
              {CPI >= 1.0 ? 'Under Budget' : CPI >= 0.90 ? 'Borderline' : 'Overspending'}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            A value of {CPI.toFixed(3)} signifies that for every Br 1.00 spent, the project earns Br {CPI.toFixed(2)} of progress value ({evm.cpiStatus.description}).
          </p>
        </div>

        {/* SPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Schedule Performance Index (SPI)
          </span>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${getIndexColor(SPI)}`}>
              {SPI.toFixed(3)}
            </span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase">
              {SPI >= 1.0 ? 'Ahead / On Track' : SPI >= 0.90 ? 'Minor Lag' : 'Delayed'}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            A value of {SPI.toFixed(3)} tells us construction achievements match {Math.round(SPI * 100)}% of target schedules ({evm.spiStatus.description}).
          </p>
        </div>
      </div>

      {/* Unified 3-Party Contractual Breach & Compliance Analysis Matrix */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Matrix Header & Stakeholder Filter Tabs */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                3-Party Contractual Breach & Compliance Matrix ({fidicInfo.fidicName})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {filteredAnalysis.length} / {fidicAnalysis.length} Categories Analyzed
            </span>
          </div>

          {/* Stakeholder Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedParty('All')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'All'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>All Stakeholders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {fidicAnalysis.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Contractor')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Contractor'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60'
                }`}
              >
                <HardHat className="w-3.5 h-3.5 shrink-0" />
                <span>Contractor Breaches</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                  {contractorCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Supervision Consultant')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Supervision Consultant'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Consultant Defaults</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                  {consultantCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedParty('Employer (Client)')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedParty === 'Employer (Client)'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800/60'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 shrink-0" />
                <span>Employer / Client Liabilities</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100">
                  {employerCount}
                </span>
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400 mr-0.5" />
              {(['All', 'Critical Risk', 'Action Required', 'Caution', 'Compliant'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Matrix Grid Cards */}
        <div className="p-3.5 space-y-3">
          {filteredAnalysis.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No breach records found matching the selected filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAnalysis.map((item, idx) => {
                const isContractor = item.responsibleParty === 'Contractor';
                const isConsultant = item.responsibleParty === 'Supervision Consultant';
                const isEmployer = item.responsibleParty === 'Employer (Client)';

                const partyBadge = isContractor
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
                  : isConsultant
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-200 dark:border-purple-800'
                  : 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-200 border-teal-200 dark:border-teal-800';

                const statusBg = item.status === 'Critical Risk' 
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                  : item.status === 'Action Required'
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : item.status === 'Caution'
                  ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20';

                const badgeColor = item.status === 'Critical Risk' 
                  ? 'bg-rose-600 text-white font-extrabold'
                  : item.status === 'Action Required'
                  ? 'bg-amber-600 text-white font-extrabold'
                  : item.status === 'Caution'
                  ? 'bg-blue-600 text-white font-extrabold'
                  : 'bg-emerald-600 text-white font-extrabold';

                return (
                  <div key={idx} className={`p-3.5 rounded-xl border ${statusBg} space-y-2.5 transition-all hover:shadow-xs`}>
                    
                    {/* Header: Party Tag, Title & Status */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[9px] border uppercase ${partyBadge}`}>
                            {isContractor ? '👷 Contractor' : isConsultant ? '📐 Supervision Consultant' : '🏛️ Client (Employer)'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {item.fidicSubClause}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs mt-0.5">
                          {item.category}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shrink-0 ${badgeColor}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Content: Finding & Legal Impact */}
                    <div className="space-y-1.5 text-2xs text-slate-600 dark:text-slate-300">
                      <p>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">Audit Finding & Breach: </strong>
                        {item.findings}
                      </p>
                      <p>
                        <strong className="text-slate-800 dark:text-slate-100 font-bold">Legal / Contractual Exposure: </strong>
                        {item.contractualImpact}
                      </p>
                    </div>

                    {/* Actionable Directive Box */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-2xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[9px] font-extrabold block">
                          Remedial Directive / Action:
                        </span>
                        <span>{item.recommendedAction}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EVM spreadsheet variables layout */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50 font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-100">
          <Activity className="w-4 h-4 text-blue-500" />
          EVM Metric Computations Table (Birr)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-100/30 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                <th className="p-2.5">EVM Factor Definition</th>
                <th className="p-2.5 text-center w-16">Acronym</th>
                <th className="p-2.5 text-right w-44">Value (Birr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-750/30 font-medium">
              <tr>
                <td className="p-2.5">Budget At Completion</td>
                <td className="p-2.5 text-center font-bold">BAC</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(BAC)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Planned Value</td>
                <td className="p-2.5 text-center font-bold">PV</td>
                <td className="p-2.5 text-right font-mono">{formatBr(PV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Earned Value</td>
                <td className="p-2.5 text-center font-bold">EV</td>
                <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBr(EV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Actual Cost</td>
                <td className="p-2.5 text-center font-bold">AC</td>
                <td className="p-2.5 text-right font-mono font-semibold">{formatBr(AC)}</td>
              </tr>
              <tr className={CV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Cost Variance</td>
                <td className="p-2.5 text-center font-bold">CV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(CV)}</td>
              </tr>
              <tr className={SV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Schedule Variance</td>
                <td className="p-2.5 text-center font-bold">SV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(SV)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">Estimate At Completion</td>
                <td className="p-2.5 text-center font-bold">EAC</td>
                <td className="p-2.5 text-right font-mono font-extrabold">{formatBr(EAC)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">Variance At Completion</td>
                <td className="p-2.5 text-center font-bold">VAC</td>
                <td className={`p-2.5 text-right font-mono font-bold ${VAC >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatBr(VAC)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">To-Complete Performance Index</td>
                <td className="p-2.5 text-center font-bold">TCPI</td>
                <td className="p-2.5 text-right font-mono font-black text-rose-500">{TCPI.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Integrated CPM vs. Linear Progress Scheduling Analysis */}
      <CpmLinearComparison project={project} />
    </div>
  );
}

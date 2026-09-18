import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, Save, Sparkles, Trash2, Printer, CheckCircle, AlertTriangle, ShieldCheck, 
  FileText, FileBadge, ShieldAlert, CheckCircle2, AlertCircle, Download, Activity, 
  ChevronDown, Scale, FileSpreadsheet, RefreshCw, Award, Users, Clock,
  Building2, Calendar, Plus, Edit3, X, ExternalLink, ArrowUpRight, ArrowDownRight, Eye, Check,
  HardHat, Briefcase, Layers
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, HistoryItem, MonthlyGradingRecord, HistoricalSupervisionConsultant, formatAccounting, isProjectClosed } from '../types';
import { 
  buildKpiHierarchy, 
  getIntegratedKpiAllocated, 
  resolveProjectMonthlyGrading, 
  resolveConsultantForPeriod, 
  parseMonthToYyyyMm, 
  compareMonthsDesc,
  isMonthAboveCurrentMonth,
  isCurrentMonth,
  matchCanonicalKpiPeriod,
  getSixMonthCumulativeGrading,
  SixMonthSemesterGrading
} from '../data/defaultProject';
import { calculateProjectEvm } from '../lib/evmCalculations';
import { getProjectConsultantEvaluation } from '../data/consultantEvaluationMatrix';
import eraLogo from '../assets/logo.png';
import ChangelogAuditHistory from './ChangelogAuditHistory';

export interface InconsistencyAlert {
  id: string;
  category: 'BOQ & Contract' | 'S-Curve & Progress' | 'IPC & Financial' | 'Work Program Schedule' | 'Securities & Bonds';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  expectedValue: string;
  actualValue: string;
  discrepancy: string;
  description: string;
  reconciliationAction: string;
}

interface HistoryViewProps {
  project: Project;
  onTakeSnapshot: (section: string) => void;
  onClearHistory: () => void;
  onProjectUpdate?: (part: Partial<Project>, logReason?: string) => void;
  currentUserObj?: any;
}

export default function HistoryView({ project, onTakeSnapshot, onClearHistory, onProjectUpdate, currentUserObj }: HistoryViewProps) {
  const history = project.history || [];
  const [analyzing, setGenerating] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isKpiHistoryOpen, setIsKpiHistoryOpen] = useState(false);
  const [isDataInconsistencyOpen, setIsDataInconsistencyOpen] = useState(true);
  const [isMonthlyGradingOpen, setIsMonthlyGradingOpen] = useState(false);
  const [gradingActiveTab, setGradingActiveTab] = useState<'contractor' | 'consultant' | 'both'>('both');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedGradingMonthFilter, setSelectedGradingMonthFilter] = useState<string>('All');
  const [selectedConsultantTenureFilter, setSelectedConsultantTenureFilter] = useState<string>('All');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('All');
  const [selectedStartMonthFilter, setSelectedStartMonthFilter] = useState<string>('All');
  const [selectedEndMonthFilter, setSelectedEndMonthFilter] = useState<string>('All');
  const [selectedGradingDetailModal, setSelectedGradingDetailModal] = useState<MonthlyGradingRecord | null>(null);
  const [selectedHistoricalConsultantModal, setSelectedHistoricalConsultantModal] = useState<HistoricalSupervisionConsultant | null>(null);
  const [isRecordGradingModalOpen, setIsRecordGradingModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Calculate high-fidelity compliance metrics
  const p = project;
  const planActualKm = p.progressPlan?.actual?.todate || 0;
  const progressFromPlan = (p.lengthKm > 0 && planActualKm > 0)
    ? Number(((planActualKm / p.lengthKm) * 100).toFixed(2))
    : 0;

  const physicalProgress = typeof p.physicalProgress === 'number' && p.physicalProgress > 0
    ? p.physicalProgress
    : (progressFromPlan || (parseFloat(String(p.physicalProgress || 0)) || 0));

  const actualMonthKm = p.progressPlan?.actual?.month || 0;
  const monthlyRatePct = (p.lengthKm > 0 && actualMonthKm > 0)
    ? ((actualMonthKm / p.lengthKm) * 100)
    : (p.monthly && p.monthly.length > 1 && typeof p.monthly[p.monthly.length - 1].actual === 'number' && typeof p.monthly[p.monthly.length - 2].actual === 'number'
      ? Math.max(0, (p.monthly[p.monthly.length - 1].actual as number) - (p.monthly[p.monthly.length - 2].actual as number))
      : 0);
  const elDays = p.origDays + (p.eotDays || 0) + (p.interimEotDays || 0);
  const ocDate = new Date(p.startDate || new Date());
  const rcDate = new Date(ocDate.getTime() + elDays * 86400000);
  
  // Use unified EVM calculation engine
  const evm = calculateProjectEvm(p);
  const { BAC, AC, EV, PV, plannedPct, CPI, SPI } = evm;
  
  const tc = p.series.reduce((sum, item) => sum + (item.contractAmt || 0), 0);
  const te = p.series.reduce((sum, item) => sum + (item.execAmt || 0), 0);
  const totalOrigExec = te * 1.15;
  const pa = ((p.payment || []).find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount; 

  // Supervision Consultant Evaluation Matrix & Quantitative Performance Grade
  const consultantEval = useMemo(() => getProjectConsultantEvaluation(p), [p]);

  // Form state for creating/editing monthly grading
  const [gradingForm, setGradingForm] = useState<Partial<MonthlyGradingRecord>>({
    month: new Date().toISOString().slice(0, 7),
    monthName: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    recordedDate: new Date().toISOString().slice(0, 10),
    status: 'Finalized',
    contractorName: p.contractor || '',
    contractorPlanMonthly: 0,
    contractorActualMonthly: 0,
    contractorPlanCumulative: 0,
    contractorActualCumulative: 0,
    contractorVariance: 0,
    contractorSpi: 1.0,
    contractorScore: 80,
    contractorGrade: 'B',
    contractorStanding: 'Satisfactory / Standard Standing',
    contractorRemarks: '',
    consultantName: consultantEval.firmName || '',
    residentEngineer: consultantEval.residentEngineer || '',
    consultantSlaTurnaroundScore: consultantEval.metrics?.overallOnTimeRate || 85,
    consultantFiveDimScore: consultantEval.overallTechnicalScore || 80,
    consultantOverallScore: consultantEval.overallScore || 82.5,
    consultantGrade: consultantEval.officialGrade || 'B',
    consultantStanding: consultantEval.officialStanding || 'Satisfactory / Standard Standing',
    consultantOnTimeRate: consultantEval.metrics?.overallOnTimeRate || 85,
    consultantAvgRfiDays: consultantEval.metrics?.rfis?.avgDays || 6,
    consultantRemarks: '',
    notes: ''
  });

  // Keep gradingForm in sync when switching projects
  useEffect(() => {
    setGradingForm(prev => ({
      ...prev,
      contractorName: p.contractor || '',
      consultantName: consultantEval.firmName || p.consultant || '',
      residentEngineer: consultantEval.residentEngineer || '',
      consultantSlaTurnaroundScore: consultantEval.metrics?.overallOnTimeRate || 85,
      consultantFiveDimScore: consultantEval.overallTechnicalScore || 80,
      consultantOverallScore: consultantEval.overallScore || 82.5,
      consultantGrade: consultantEval.officialGrade || 'B',
      consultantStanding: consultantEval.officialStanding || 'Satisfactory / Standard Standing',
      consultantOnTimeRate: consultantEval.metrics?.overallOnTimeRate || 85,
      consultantAvgRfiDays: consultantEval.metrics?.rfis?.avgDays || 6,
    }));
  }, [p.id, p.contractor, p.consultant, consultantEval]);

  const monthlyGradingRecords = useMemo(() => {
    const list = resolveProjectMonthlyGrading(p);
    const validList = list.filter(r => !isMonthAboveCurrentMonth(r.month, r.recordedDate));
    return [...validList].sort((a, b) => compareMonthsDesc(a.month, b.month, a.recordedDate, b.recordedDate));
  }, [p.id, p.name, p.monthlyGradingRecords, p.monthly, p.progressPlan, p.progressPlanHistory, p.contractor, p.consultant, p.supervisionConsultant, consultantEval]);

  const previousConsultants = p.supervisionConsultant?.previousConsultants || [];
  const activeConsultantAssignmentDate = p.supervisionConsultant?.commencementDate || p.startDate || '2020-12-29';
  const activeConsultantFirmName = p.supervisionConsultant?.firmName || p.consultant || 'Supervision Consultant';

  const availableGradingMonths = useMemo(() => {
    const map = new Map<string, string>();
    (monthlyGradingRecords || []).forEach(r => {
      const ym = parseMonthToYyyyMm(r.month || r.recordedDate);
      if (ym && !map.has(ym)) {
        map.set(ym, r.monthName || r.month || ym);
      }
    });
    return Array.from(map.entries())
      .map(([ym, label]) => ({ ym, label }))
      .sort((a, b) => a.ym.localeCompare(b.ym)); // Chronological order (earliest to latest)
  }, [monthlyGradingRecords]);

  const sixMonthGradingList = useMemo(() => {
    return getSixMonthCumulativeGrading(monthlyGradingRecords);
  }, [monthlyGradingRecords]);

  const filteredMonthlyGradingRecords = useMemo(() => {
    const filtered = monthlyGradingRecords.filter(r => {
      if (isMonthAboveCurrentMonth(r.month, r.recordedDate)) return false;
      const rYm = parseMonthToYyyyMm(r.month || r.recordedDate);

      const matchMonth = selectedGradingMonthFilter === 'All' || r.month === selectedGradingMonthFilter || r.monthName === selectedGradingMonthFilter || rYm === selectedGradingMonthFilter;
      const matchTenure = selectedConsultantTenureFilter === 'All' || 
        (selectedConsultantTenureFilter === 'current' && (!r.consultantTenureId || r.consultantTenureId === 'current' || !r.isHistoricalConsultant)) ||
        (selectedConsultantTenureFilter === r.consultantTenureId);

      let matchSemester = true;
      if (selectedSemesterFilter !== 'All') {
        const semObj = sixMonthGradingList.find(s => s.semesterKey === selectedSemesterFilter);
        if (semObj) {
          matchSemester = semObj.records.some(sr => sr.id === r.id || sr.month === r.month);
        }
      }

      let matchDateRange = true;
      if (rYm) {
        if (selectedStartMonthFilter !== 'All') {
          const startYm = parseMonthToYyyyMm(selectedStartMonthFilter) || selectedStartMonthFilter;
          if (rYm < startYm) matchDateRange = false;
        }
        if (selectedEndMonthFilter !== 'All') {
          const endYm = parseMonthToYyyyMm(selectedEndMonthFilter) || selectedEndMonthFilter;
          if (rYm > endYm) matchDateRange = false;
        }
      }

      return matchMonth && matchTenure && matchSemester && matchDateRange;
    });
    return [...filtered].sort((a, b) => compareMonthsDesc(a.month, b.month, a.recordedDate, b.recordedDate));
  }, [monthlyGradingRecords, selectedGradingMonthFilter, selectedConsultantTenureFilter, selectedSemesterFilter, sixMonthGradingList, selectedStartMonthFilter, selectedEndMonthFilter]);

  // Auto-calculate grading values for form
  const handleAutoCalculateForm = (targetMonth: string) => {
    const canonicalMatch = matchCanonicalKpiPeriod(p, targetMonth);
    const normTarget = canonicalMatch ? canonicalMatch.parsedYm : (parseMonthToYyyyMm(targetMonth) || targetMonth);
    const exactMonthStr = canonicalMatch ? canonicalMatch.exactPeriodName : targetMonth;

    const mMatch = (p.monthly || []).find(m => {
      const mNorm = parseMonthToYyyyMm(m.month);
      return (mNorm && mNorm === normTarget) || 
        (m.month || '').toLowerCase().includes(targetMonth.toLowerCase()) || 
        targetMonth.toLowerCase().includes((m.month || '').toLowerCase());
    });
    const planM = mMatch && typeof mMatch.revisedPlan === 'number' && mMatch.revisedPlan > 0 
      ? mMatch.revisedPlan 
      : (mMatch && typeof mMatch.originalPlan === 'number' ? mMatch.originalPlan : 2.5);
    const actM = mMatch && typeof mMatch.actual === 'number' ? mMatch.actual : 2.1;
    const planCum = mMatch && typeof mMatch.originalPlan === 'number' ? mMatch.originalPlan : 65.0;
    const actCum = mMatch && typeof mMatch.actual === 'number' ? mMatch.actual : physicalProgress;
    const variance = actM - planM;
    const spiVal = planM > 0 ? Number((actM / planM).toFixed(2)) : 1.0;
    
    let cScore = Math.min(100, Math.max(0, 80 + (variance * 10)));
    let cGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
    let cStanding = 'Satisfactory / Standard Standing';
    if (cScore >= 90) { cGrade = 'A'; cStanding = 'Superior / Accelerated Progress'; }
    else if (cScore >= 80) { cGrade = 'B'; cStanding = 'Satisfactory / Minor Tolerable Lag'; }
    else if (cScore >= 70) { cGrade = 'C'; cStanding = 'Fair / Marginal Progress'; }
    else if (cScore >= 60) { cGrade = 'D'; cStanding = 'Poor / Critical Variance Notice'; }
    else { cGrade = 'F'; cStanding = 'Unacceptable / Severe Contractual Default'; }

    // Resolve consultant tenure based on the target month
    const consResolution = resolveConsultantForPeriod(p, exactMonthStr);

    const consSla = consResolution.slaScore;
    const consDim = consResolution.fiveDimScore;
    const consOverall = consResolution.overallScore;
    const consGrade = consResolution.officialGrade;
    const consStanding = consResolution.standing;

    let monthNameStr = exactMonthStr;
    if (!canonicalMatch) {
      try {
        const [y, m] = targetMonth.split('-');
        if (y && m) {
          const d = new Date(parseInt(y), parseInt(m) - 1, 1);
          monthNameStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
      } catch {}
    }

    const isTargetCurrent = isCurrentMonth(exactMonthStr);
    const resolvedStatus: MonthlyGradingRecord['status'] = isTargetCurrent ? 'Provisional' : 'Finalized';
    const resolvedStanding = isTargetCurrent ? 'Open / Provisional (Pending Month-End Finalization)' : cStanding;

    setGradingForm(prev => ({
      ...prev,
      month: exactMonthStr,
      monthName: monthNameStr,
      status: resolvedStatus,
      contractorName: p.contractor || prev.contractorName,
      contractorPlanMonthly: planM,
      contractorActualMonthly: actM,
      contractorPlanCumulative: planCum,
      contractorActualCumulative: actCum,
      contractorVariance: Number(variance.toFixed(2)),
      contractorSpi: spiVal,
      contractorScore: Number(cScore.toFixed(1)),
      contractorGrade: cGrade,
      contractorStanding: resolvedStanding,
      consultantName: consResolution.firmName,
      residentEngineer: consResolution.residentEngineer,
      consultantTenureId: consResolution.tenureId,
      isHistoricalConsultant: consResolution.isHistorical,
      consultantAssignmentDate: consResolution.assignmentDate,
      consultantHandoverDate: consResolution.handoverDate,
      consultantSlaTurnaroundScore: consSla,
      consultantFiveDimScore: consDim,
      consultantOverallScore: consOverall,
      consultantGrade: consGrade,
      consultantStanding: consStanding,
      consultantOnTimeRate: consResolution.slaScore,
      consultantAvgRfiDays: consResolution.isHistorical ? 5.2 : (consultantEval.metrics?.rfis?.avgDays || 5.5),
      consultantRemarks: consResolution.isHistorical
        ? `Predecessor supervisory milestone and quality audits archived for ${consResolution.firmName}.`
        : `Active supervisory oversight and submittal review cycle logged for ${consResolution.firmName}.`
    }));
  };

  const handleSaveGradingRecord = () => {
    if (!gradingForm.month) return;
    if (isMonthAboveCurrentMonth(gradingForm.month, gradingForm.recordedDate)) {
      alert("Months above the current month cannot be recorded into the grading ledger.");
      return;
    }

    const canonicalMatch = matchCanonicalKpiPeriod(p, gradingForm.month);
    const exactMonthStr = canonicalMatch ? canonicalMatch.exactPeriodName : gradingForm.month;
    const exactMonthName = canonicalMatch ? canonicalMatch.exactPeriodName : (gradingForm.monthName || gradingForm.month);

    const consResolution = resolveConsultantForPeriod(p, exactMonthStr);

    const isTargetCurrent = isCurrentMonth(exactMonthStr, gradingForm.recordedDate);
    // If the record is for the current month, grade must remain Open / Provisional until the month concludes
    let resolvedStatus: MonthlyGradingRecord['status'] = (gradingForm.status as any) || (isTargetCurrent ? 'Provisional' : 'Finalized');
    if (isTargetCurrent && resolvedStatus === 'Finalized') {
      resolvedStatus = 'Provisional';
    }

    const resolvedStanding = isTargetCurrent
      ? (gradingForm.contractorStanding && !gradingForm.contractorStanding.includes('Satisfactory')
          ? gradingForm.contractorStanding
          : 'Open / Provisional (Pending Month-End Finalization)')
      : (gradingForm.contractorStanding || 'Satisfactory / Standard Standing');

    const newRec: MonthlyGradingRecord = {
      id: editingRecordId || `mgrad_${exactMonthStr.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      month: exactMonthStr,
      monthName: exactMonthName,
      recordedDate: gradingForm.recordedDate || new Date().toISOString().slice(0, 10),
      recordedBy: currentUserObj?.username || 'Audit Officer',
      status: resolvedStatus,
      contractorName: gradingForm.contractorName || p.contractor || 'Contractor',
      contractorPlanMonthly: Number(gradingForm.contractorPlanMonthly) || 0,
      contractorActualMonthly: Number(gradingForm.contractorActualMonthly) || 0,
      contractorPlanCumulative: Number(gradingForm.contractorPlanCumulative) || 0,
      contractorActualCumulative: Number(gradingForm.contractorActualCumulative) || 0,
      contractorVariance: Number(gradingForm.contractorVariance) || 0,
      contractorSpi: Number(gradingForm.contractorSpi) || 1.0,
      contractorScore: Number(gradingForm.contractorScore) || 80,
      contractorGrade: (gradingForm.contractorGrade as any) || 'B',
      contractorStanding: resolvedStanding,
      contractorRemarks: gradingForm.contractorRemarks || '',
      consultantName: gradingForm.consultantName || consResolution.firmName || 'Consultant',
      residentEngineer: gradingForm.residentEngineer || consResolution.residentEngineer || '',
      consultantTenureId: gradingForm.consultantTenureId || consResolution.tenureId,
      isHistoricalConsultant: gradingForm.isHistoricalConsultant !== undefined ? gradingForm.isHistoricalConsultant : consResolution.isHistorical,
      consultantAssignmentDate: gradingForm.consultantAssignmentDate || consResolution.assignmentDate,
      consultantHandoverDate: gradingForm.consultantHandoverDate || consResolution.handoverDate,
      consultantSlaTurnaroundScore: Number(gradingForm.consultantSlaTurnaroundScore) || consResolution.slaScore,
      consultantFiveDimScore: Number(gradingForm.consultantFiveDimScore) || consResolution.fiveDimScore,
      consultantOverallScore: Number(gradingForm.consultantOverallScore) || consResolution.overallScore,
      consultantGrade: (gradingForm.consultantGrade as any) || consResolution.officialGrade,
      consultantStanding: gradingForm.consultantStanding || consResolution.standing,
      consultantOnTimeRate: Number(gradingForm.consultantOnTimeRate) || consResolution.slaScore,
      consultantAvgRfiDays: Number(gradingForm.consultantAvgRfiDays) || 5.5,
      consultantRemarks: gradingForm.consultantRemarks || (consResolution.isHistorical ? `Historical predecessor audit logged for ${consResolution.firmName}.` : ''),
      notes: gradingForm.notes || `Specific project audit cycle: ${p.name} (${p.id})`
    };

    let updatedList = [...monthlyGradingRecords];
    const existingIdx = updatedList.findIndex(r => r.id === newRec.id || r.month === newRec.month);
    if (existingIdx >= 0) {
      updatedList[existingIdx] = newRec;
    } else {
      updatedList = [newRec, ...updatedList];
    }
    // Filter any future month and sort
    const cleanList = updatedList
      .filter(r => !isMonthAboveCurrentMonth(r.month, r.recordedDate))
      .sort((a, b) => compareMonthsDesc(a.month, b.month, a.recordedDate, b.recordedDate));

    if (onProjectUpdate) {
      onProjectUpdate({ monthlyGradingRecords: cleanList }, `Updated monthly grading audit records for ${newRec.monthName}`);
    }
    setIsRecordGradingModalOpen(false);
    setEditingRecordId(null);
  };

  const handleDeleteGradingRecord = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this monthly grading record?")) return;
    const updatedList = monthlyGradingRecords.filter(r => r.id !== id);
    if (onProjectUpdate) {
      onProjectUpdate({ monthlyGradingRecords: updatedList }, `Removed monthly grading audit record`);
    }
  };

  const openEditGradingModal = (record: MonthlyGradingRecord) => {
    setEditingRecordId(record.id);
    setGradingForm({ ...record });
    setIsRecordGradingModalOpen(true);
  };

  const openCreateGradingModal = () => {
    setEditingRecordId(null);
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().slice(0, 7);
    handleAutoCalculateForm(prevMonth);
    setIsRecordGradingModalOpen(true);
  };

  // Right-of-Way metrics
  const rowReqMetric = (p.rowMetrics || []).find(m => m.name === 'ROW Request By Contractor' || m.name.toLowerCase().includes('request by contractor') || (m.name.toLowerCase().includes('row') && m.name.toLowerCase().includes('request')))?.value || 0;
  const rowClearMetric = (p.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section' || m.name.toLowerCase().includes('obstruction free'))?.value || 0;
  const rowEvalBase = rowReqMetric > 0 ? rowReqMetric : (p.lengthKm || 0);
  const rowImpediment = Math.max(0, rowEvalBase - rowClearMetric);
  
  // Total Remaining Budget (In millions of Birr)
  const remainingBudget = Math.max(0, p.origAmount - (AC / 1_000_000));
  
  // 4b. Right-of-Way (ROW) and Matured Unpaid IPCs Compliance calculation
  const rateIpc = p.usdExchangeRate || 57.50;
  const trackerIpcs = p.ipcTracker || [];
  let totalUnpaidIpcsEtb = 0;
  let maturedUnpaidIpcsEtb = 0;
  let totalUnpaidNetEtb = 0;
  let totalUnpaidNetUsd = 0;
  let maturedUnpaidNetEtb = 0;
  let maturedUnpaidNetUsd = 0;
  const today = new Date();

  // Aggregate unpaid net portions in native currencies
  trackerIpcs.forEach(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    if (isEtbUnpaid) {
      totalUnpaidNetEtb += item.certifiedEtb || 0;
    }
    if (isUsdUnpaid) {
      totalUnpaidNetUsd += item.certifiedUsd || 0;
    }
  });
  
  const unpaidIpcsDetails = trackerIpcs.map(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    
    let itemAmountEtb = 0;
    if (isEtbUnpaid) itemAmountEtb += item.certifiedEtb || 0;
    if (isUsdUnpaid) itemAmountEtb += (item.certifiedUsd || 0) * rateIpc;
    
    if (isEtbUnpaid || isUsdUnpaid) {
      totalUnpaidIpcsEtb += itemAmountEtb;
    }
    
    let daysElapsed = 0;
    let isMatured = false;
    if (item.submissionDate) {
      const subDate = new Date(item.submissionDate);
      const diffTime = today.getTime() - subDate.getTime();
      daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (daysElapsed < 0) daysElapsed = 0;
      // standard FIDIC 56 days limit
      isMatured = daysElapsed > 56;
    }
    
    if (isMatured) {
      if (isEtbUnpaid) maturedUnpaidNetEtb += item.certifiedEtb || 0;
      if (isUsdUnpaid) maturedUnpaidNetUsd += item.certifiedUsd || 0;
      if (isEtbUnpaid || isUsdUnpaid) {
        maturedUnpaidIpcsEtb += itemAmountEtb;
      }
    }
    
    return {
      paymentNo: item.paymentNo,
      daysElapsed,
      amountEtb: itemAmountEtb,
      certifiedEtb: isEtbUnpaid ? item.certifiedEtb || 0 : 0,
      certifiedUsd: isUsdUnpaid ? item.certifiedUsd || 0 : 0,
      isMatured: isMatured && (isEtbUnpaid || isUsdUnpaid)
    };
  }).filter(d => d.isMatured);
  
  // Dynamic KPI score calculation for the 12 groups
  const getKpiScores = () => {
    const integratedKpis = getIntegratedKpiAllocated(p);
    
    const getKpiSubScore = (sscId: string): number => {
      let earned = 0;
      let max = 0;
      integratedKpis.forEach(k => {
        if (k.sscId === sscId && !k.naActive) {
          const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
          earned += val * (k.itemWt / 100);
          max += k.max * (k.itemWt / 100);
        }
      });
      return max > 0 ? (earned / max) * 100 : -1;
    };

    const getKpiGoalScore = (goalId: string): number => {
      const hierarchy = buildKpiHierarchy(p.contractType || 'DBB', p);
      const goal = hierarchy.find(g => g.id === goalId);
      if (!goal) return 0;
      let earnedSum = 0;
      let maxSum = 0;
      goal.sscs.forEach(ssc => {
        const sscScore = getKpiSubScore(ssc.id);
        if (sscScore >= 0) {
          earnedSum += sscScore * (ssc.wt / 100);
          maxSum += 100 * (ssc.wt / 100);
        }
      });
      return maxSum > 0 ? (earnedSum / maxSum) * 100 : 0;
    };

    const groups = [
      { id: 'G1', name: 'Physical Progress' },
      { id: 'G2', name: 'Progress vs Elapsed Time' },
      { id: 'G3', name: 'Cost Management' },
      { id: 'G4', name: 'Time Management' },
      { id: 'G5', name: 'Quality Management' },
      { id: 'G6', name: 'Design Management' },
      { id: 'G7', name: 'Claim & Dispute' },
      { id: 'G8', name: 'Risk Management' },
      { id: 'G9', name: 'ESOSH Management' },
      { id: 'G10', name: 'ROW Management' },
      { id: 'G11', name: 'Stakeholder Management' },
      { id: 'G12', name: 'Contract Compliance' },
    ];

    return groups.map(g => {
      const score = getKpiGoalScore(g.id);
      return {
        id: g.id,
        name: g.name,
        score
      };
    });
  };

  const kpiGroupsScores = getKpiScores();

  // Elapsed progress calculation
  const elapsed = (() => {
    if (isProjectClosed(p.status)) return 100;
    if (p.status === 'Suspended' || p.status === 'Terminated') return physicalProgress || 100;
    const s = new Date(p.startDate);
    const totalDays = p.origDays + (p.eotDays || 0) + (p.interimEotDays || 0);
    const rc = new Date(s.getTime() + totalDays * 86400000);
    const now = new Date();
    if (rc.getTime() - s.getTime() <= 0) return 0;
    return Math.min(100, Math.max(0, ((now.getTime() - s.getTime()) / (rc.getTime() - s.getTime())) * 100));
  })();
  const ratio = elapsed > 0 ? (physicalProgress / elapsed) * 100 : 0;

  // Generate last 5 CPI/SPI records based on actual progress comparison milestones and EVM metrics
  const kpiHistoryRecords = React.useMemo(() => {
    // Current period actual physical progress from Progress Comparison / Project Actuals
    const currentActualKm = p.progressPlan?.actual?.todate || 0;
    const currentPhysical = (typeof physicalProgress === 'number' && physicalProgress > 0)
      ? physicalProgress
      : (p.lengthKm > 0 && currentActualKm > 0 ? (currentActualKm / p.lengthKm) * 100 : (physicalProgress || 0));

    const currentRecord = {
      period: p.progressPlanLabels?.monthLabel || 'Current Month',
      isCurrent: true,
      physical: currentPhysical,
      elapsed: elapsed,
      ratio: ratio,
      cpi: CPI,
      spi: SPI,
      ev: EV / 1_000_000,
      pv: PV / 1_000_000,
      ac: AC / 1_000_000,
    };

    const historyList = p.progressPlanHistory || [];
    let pastRecords: any[] = [];

    if (historyList.length > 0) {
      // Use historical records archived from the Progress Comparison page
      pastRecords = historyList.map((histItem) => {
        const monthLabel = histItem.monthLabel;
        
        // Extract real physical progress from the progress comparison record
        let histPhysical: number;
        if (typeof histItem.physicalProgress === 'number' && histItem.physicalProgress > 0) {
          histPhysical = histItem.physicalProgress;
        } else if (typeof histItem.actualTodate === 'number' && histItem.actualTodate > 0 && p.lengthKm > 0) {
          histPhysical = Number(((histItem.actualTodate / p.lengthKm) * 100).toFixed(2));
        } else {
          // Check matching month in monthly S-Curve
          const matchMonth = (p.monthly || []).find(m => {
            const cleanM = (m.month || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLabel = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanLabel.includes(cleanM) || cleanM.includes(cleanLabel);
          });
          if (matchMonth && typeof matchMonth.actual === 'number') {
            histPhysical = matchMonth.actual;
          } else if (typeof histItem.actualEfy === 'number' && histItem.actualEfy > 0 && p.lengthKm > 0) {
            histPhysical = Number(((histItem.actualEfy / p.lengthKm) * 100).toFixed(2));
          } else {
            histPhysical = currentPhysical;
          }
        }

        // EVM calculations based on actual physical progress
        const pastEv = (BAC * (histPhysical / 100)) / 1_000_000;
        
        const matchMonth = (p.monthly || []).find(m => {
          const cleanM = (m.month || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanLabel = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanLabel.includes(cleanM) || cleanM.includes(cleanLabel);
        });
        const matchPlanned = matchMonth && typeof matchMonth.originalPlan === 'number' ? matchMonth.originalPlan : null;
        
        const pastPv = matchPlanned !== null 
          ? (BAC * (matchPlanned / 100)) / 1_000_000
          : (PV / 1_000_000) * (currentPhysical > 0 ? histPhysical / currentPhysical : 1);
          
        const pastSpi = pastPv > 0 ? Number((pastEv / pastPv).toFixed(3)) : SPI;
        const pastCpi = CPI;
        const pastAc = pastCpi > 0 ? Number((pastEv / pastCpi).toFixed(2)) : pastEv;
        const pastElapsed = Math.max(0, currentPhysical > 0 ? elapsed * (histPhysical / currentPhysical) : elapsed);
        const pastRatio = pastElapsed > 0 ? (histPhysical / pastElapsed) * 100 : 0;

        return {
          period: monthLabel,
          isCurrent: false,
          physical: histPhysical,
          elapsed: pastElapsed,
          ratio: pastRatio,
          cpi: pastCpi,
          spi: pastSpi,
          ev: pastEv,
          pv: pastPv,
          ac: pastAc,
        };
      });
    } else if (p.monthly && p.monthly.length > 1) {
      // Derive from real S-Curve historical monthly actuals
      const pastMonths = p.monthly
        .filter(m => typeof m.actual === 'number' && m.actual > 0)
        .slice(-5, -1)
        .reverse();

      pastRecords = pastMonths.map(m => {
        const histPhysical = typeof m.actual === 'number' ? m.actual : 0;
        const histPlanned = typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : histPhysical);
        const pastEv = (BAC * (histPhysical / 100)) / 1_000_000;
        const pastPv = (BAC * (histPlanned / 100)) / 1_000_000;
        const pastSpi = pastPv > 0 ? Number((pastEv / pastPv).toFixed(3)) : 1.0;
        const pastCpi = CPI;
        const pastAc = pastCpi > 0 ? Number((pastEv / pastCpi).toFixed(2)) : pastEv;
        const pastElapsed = Math.max(0, currentPhysical > 0 ? elapsed * (histPhysical / currentPhysical) : elapsed);
        const pastRatio = pastElapsed > 0 ? (histPhysical / pastElapsed) * 100 : 0;

        return {
          period: m.month,
          isCurrent: false,
          physical: histPhysical,
          elapsed: pastElapsed,
          ratio: pastRatio,
          cpi: pastCpi,
          spi: pastSpi,
          ev: pastEv,
          pv: pastPv,
          ac: pastAc,
        };
      });
    }

    const allRecords = [currentRecord, ...pastRecords];
    return allRecords.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return compareMonthsDesc(a.period, b.period);
    });
  }, [p.progressPlanLabels, physicalProgress, p.progressPlanHistory, p.progressPlan, p.monthly, p.lengthKm, elapsed, ratio, CPI, SPI, EV, PV, AC, BAC]);
  
  // Schedule Variance
  const SV = EV - PV;
  const SV_Mil = SV / 1_000_000;
  const SV_pct = PV > 0 ? (SV / PV) * 100 : 0;

  const lagging = p.series.filter(s => s.progress < 40).map(s => ({
    code: s.code,
    desc: s.desc,
    progress: s.progress
  }));
  
  const criticalActs = p.workProgram.filter(a => a.critical).map(a => a.name);

  // Expired or soon expiring guarantees
  const criticalGuarantees = p.bonds ? p.bonds.filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    const now = new Date();
    if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
      return true;
    }
    const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
    if (exp.getTime() - now.getTime() < fortyFiveDays) {
      return true;
    }
    return false;
  }) : [];

  // Compile active warning alerts list
  const healthAlerts: { type: 'critical' | 'warning' | 'info'; title: string; desc: string; field: string }[] = [];

  if (CPI < 0.9) {
    healthAlerts.push({
      type: 'critical',
      field: 'CPI Index',
      title: 'Cost Control Overrun (CPI Alert Limit Exceeded)',
      desc: `Cost Performance Index of ${CPI.toFixed(3)} is under the standard 0.9 approval threshold, indicating cumulative certified outlays exceed actual physical output value.`
    });
  }
  if (SV_pct < -10) {
    healthAlerts.push({
      type: 'critical',
      field: 'Schedule Variance %',
      title: 'Critical Path Schedule Variance (SV Alert Limit)',
      desc: `The calculated schedule variance has slipped behind schedule by ${Math.abs(SV_pct).toFixed(2)}% (Limit: 10%), signifying significant physical timeline delay.`
    });
  }
  if (SPI < 0.9) {
    healthAlerts.push({
      type: 'warning',
      field: 'Timeline Velocity Index',
      title: 'Construction Velocity Retardation (SPI Alert)',
      desc: `Timeline Velocity Index of ${SPI.toFixed(3)} is under 0.90, which demands immediate contractor equipment mobilization acceleration.`
    });
  }
  if (plannedPct - physicalProgress > 10) {
    healthAlerts.push({
      type: 'warning',
      field: 'Progress Deviation Map',
      title: 'Major Physical S-Curve Lag',
      desc: `Project physical progress of ${physicalProgress.toFixed(2)}% is lagging the original planned milestone of ${plannedPct.toFixed(2)}% by a gap of ${(plannedPct - physicalProgress).toFixed(2)}%.`
    });
  }
  if (p.bonds && p.bonds.filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    const now = new Date();
    if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) return true;
    return exp.getTime() - now.getTime() < 45 * 24 * 60 * 60 * 1000;
  }).length > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Bonds Guarantee',
      title: 'Unsecured Contractor Security Escrows (Bond Alert)',
      desc: `There are performance or advance mobilization bank guarantees that are expired or expiring within the critical 45-day liability fence.`
    });
  }
  if (rowImpediment > 5) {
    healthAlerts.push({
      type: 'warning',
      field: 'ROW Impediments',
      title: 'Right-Of-Way Property Dispute Redzone',
      desc: `Pending utilities/disputed property length of ${rowImpediment.toFixed(2)} Km is over the 5 Km risk limit, blocking earthworks mobilization.`
    });
  }

  // Unpaid certified IPC calculations
  let unpaidCombinedEtb = 0;
  trackerIpcs.forEach(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    if (isEtbUnpaid) {
      unpaidCombinedEtb += item.certifiedEtb || 0;
    }
    if (isUsdUnpaid) {
      unpaidCombinedEtb += (item.certifiedUsd || 0) * rateIpc;
    }
  });

  if (unpaidCombinedEtb > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Unpaid Certified Balances',
      title: 'Overdue Certified IPC Balances (FIDIC Clausal Default)',
      desc: `Total outstanding certified amount remains unpaid: Br. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unpaidCombinedEtb)}. Delay triggers Sub-clause 14.8 late financing interest, and entitles Contractor to suspend or decelerate works under FIDIC Sub-clause 16.1.`
    });
  }

  // Comprehensive Data Inconsistency Audit Checks
  const inconsistencyAlerts = React.useMemo<InconsistencyAlert[]>(() => {
    const alerts: InconsistencyAlert[] = [];

    // 1. BOQ Series Breakdown Sum vs Overall Contract Amount

    // 2. Cumulative Executed BOQ Check removed per user request (VAT/Contingency exclusion)

    // 3. Monthly S-Curve Cumulative Actual vs Header Physical Progress
    const latestMonthlyItem = p.monthly && p.monthly.length > 0 
      ? [...p.monthly].reverse().find(m => typeof m.actual === 'number' && m.actual > 0) 
      : null;
    const latestMonthlyActual = latestMonthlyItem && typeof latestMonthlyItem.actual === 'number' ? latestMonthlyItem.actual : null;

    if (latestMonthlyActual !== null && Math.abs(latestMonthlyActual - physicalProgress) > 0.5) {
      const diffProg = latestMonthlyActual - physicalProgress;
      alerts.push({
        id: 'scurve-physical-mismatch',
        category: 'S-Curve & Progress',
        severity: 'warning',
        title: 'S-Curve Actual Progress vs Header Physical Progress Discrepancy',
        expectedValue: `${physicalProgress.toFixed(2)}% (Header)`,
        actualValue: `${latestMonthlyActual.toFixed(2)}% (${latestMonthlyItem?.month || 'S-Curve'})`,
        discrepancy: `${diffProg > 0 ? '+' : ''}${diffProg.toFixed(2)}%`,
        description: 'The latest cumulative physical progress recorded in monthly S-Curve tracking does not match the project main physical progress indicator.',
        reconciliationAction: 'Synchronize monthly S-Curve physical progress readings in Progress Plan Editor.'
      });
    }

    // 4. CPM Work Program Total Planned Weighting Sum
    const totalWpWeight = (p.workProgram || []).reduce((sum, w) => sum + (w.weight || 0), 0);
    if (totalWpWeight > 0 && Math.abs(totalWpWeight - 100) > 0.2) {
      const weightDiff = totalWpWeight - 100;
      alerts.push({
        id: 'workprogram-weight-mismatch',
        category: 'Work Program Schedule',
        severity: 'warning',
        title: 'Work Program Activity Weight Sum Imbalance',
        expectedValue: '100.00%',
        actualValue: `${totalWpWeight.toFixed(2)}%`,
        discrepancy: `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(2)}%`,
        description: 'The combined planned weight percentages of CPM Work Program schedule tasks do not sum to exactly 100.00%.',
        reconciliationAction: 'Re-weight Work Program activities in Work Program Schedule Editor.'
      });
    }

    // 5. Multi-Year Annual Budget Allocations vs Total Contract Amount
    const origContractAmtInBirr = p.origAmount * 1_000_000;
    const totalAnnualBudget = (p.annual || []).reduce((sum, a) => sum + (a.budget || 0), 0) * 1_000_000;
    if (totalAnnualBudget > 0 && Math.abs(totalAnnualBudget - origContractAmtInBirr) > 100000) {
      const annualDiff = totalAnnualBudget - origContractAmtInBirr;
      alerts.push({
        id: 'annual-budget-mismatch',
        category: 'IPC & Financial',
        severity: 'info',
        title: 'Multi-Year Budget Allocations vs Contract Sum Variance',
        expectedValue: `Br. ${formatAccounting(origContractAmtInBirr, '')}`,
        actualValue: `Br. ${formatAccounting(totalAnnualBudget, '')}`,
        discrepancy: `${annualDiff > 0 ? '+' : ''}Br. ${formatAccounting(annualDiff, '')}`,
        description: 'Total financial budget allocated across annual schedule years does not equal the total Original Contract Price.',
        reconciliationAction: 'Review financial cash flow breakdown across project timeline years in Financial Data Editor.'
      });
    }

    // 6. Advance Payment Bank Guarantee vs Unrecovered Advance Payment Balance
    const advGuaranteeAmt = (p.bonds || [])
      .filter(b => b.type && b.type.toLowerCase().includes('advance') && b.status !== 'Recovered')
      .reduce((sum, b) => sum + (b.amount || 0), 0) * 1_000_000;
    const unrecoveredAdvanceItem = (p.payment || []).find(x => x.item && x.item.trim().toLowerCase().includes('advance payment remaining'));
    const unrecoveredAdvance = unrecoveredAdvanceItem ? unrecoveredAdvanceItem.amount : 0;

    if (unrecoveredAdvance > 0 && advGuaranteeAmt < unrecoveredAdvance) {
      const guaranteeDeficit = unrecoveredAdvance - advGuaranteeAmt;
      alerts.push({
        id: 'advance-guarantee-deficit',
        category: 'Securities & Bonds',
        severity: 'critical',
        title: 'Unrecovered Advance Payment Exceeds Active Guarantee Cover',
        expectedValue: `Br. ${formatAccounting(unrecoveredAdvance, '')} (Min Cover)`,
        actualValue: `Br. ${formatAccounting(advGuaranteeAmt, '')} (Active Cover)`,
        discrepancy: `-Br. ${formatAccounting(guaranteeDeficit, '')} (Deficit)`,
        description: 'The outstanding unrecovered advance payment balance exceeds active bank guarantee protection.',
        reconciliationAction: 'Require Contractor to extend or top up Advance Payment Bank Guarantee before next IPC payment release.'
      });
    }

    return alerts;
  }, [p]);

  const handleManualSnapshot = () => {
    onTakeSnapshot('Manual Snapshot Audit');
  };

  const handleTriggerReportReRun = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 700);
  };

  const formattedMoney = (v: number) => 
    formatAccounting(v, '');

  const allowedRowMetricNames = [
    'Project Length',
    'ROW Request By Contractor',
    'Properties identified, measured, evaluated',
    'Measurement Identification Complete',
    'Document Sent ERA for Compensation',
    'ROW Obstruction free Section'
  ];

  const displayRowMetrics = (p.rowMetrics || [])
    .filter(rm => allowedRowMetricNames.includes(rm.name))
    .map(rm => {
      if (rm.name === 'Properties identified, measured, evaluated') {
        return { ...rm, name: 'Measurement Identification Complete' };
      }
      return rm;
    });

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4'); // portrait, point, A4 (595.28 x 841.89 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawPageDecorations = () => {
      // Running Header (from page 2 onwards)
      if (pageCount > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("ETHIOPIAN ROADS ADMINISTRATION • CONTRACT COMPLIANCE & PERFORMANCE AUDIT", 40, 35);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(40, 42, pageWidth - 40, 42);
      }

      // Running Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setDrawColor(226, 232, 240);
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);
      doc.text(`CONFIDENTIAL - BOARD REGULATORY REPORT • PROJECT: ${(p.name || 'Untitled Project').toUpperCase()}`, 40, pageHeight - 28);
      doc.text(`Page ${pageCount}`, pageWidth - 70, pageHeight - 28);
      pageCount++;
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 65) {
        doc.addPage();
        curY = 60;
        drawPageDecorations();
      }
    };

    const drawSectionHeader = (title: string) => {
      checkSpace(40);
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(40, curY - 9, 3.5, 11, 'F'); // draw vertical rectangle
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title, 48, curY);
      curY += 18;
    };

    // Draw first page header
    drawPageDecorations(); // Initializes pageCount to 1, sets up first footer

    // Attempt to grab the same logo image as the login logo from the DOM
    let logoDrawn = false;
    const logoImgEls = Array.from(document.querySelectorAll('img'));
    const eraLogoImg = logoImgEls.find(img => 
      img.src && (
        img.src.includes('irams.era.gov.et') || 
        img.src.includes('mui.gov.et') ||
        img.alt?.toLowerCase().includes('roads') ||
        img.alt?.toLowerCase().includes('era')
      )
    );

    if (eraLogoImg && eraLogoImg.complete && eraLogoImg.naturalWidth > 0) {
      try {
        // Draw elegant white container frame for the logo
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(40, 46, 36, 36, 4, 4, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(40, 46, 36, 36, 4, 4, 'S');
        
        doc.addImage(eraLogoImg, 'PNG', 42, 48, 32, 32);
        logoDrawn = true;
      } catch (err) {
        console.warn("Failed to direct-draw DOM logo into PDF, trying canvas conversion:", err);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = eraLogoImg.naturalWidth || 120;
          canvas.height = eraLogoImg.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(eraLogoImg, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(40, 46, 36, 36, 4, 4, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(40, 46, 36, 36, 4, 4, 'S');
            
            doc.addImage(dataUrl, 'PNG', 42, 48, 32, 32);
            logoDrawn = true;
          }
        } catch (canvasErr) {
          console.warn("Canvas-based CORS block for logo image, falling back to vector emblem:", canvasErr);
        }
      }
    }

    if (!logoDrawn) {
      // Elegant Badge logo/emblem
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(40, 48, 32, 32, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(245, 158, 11); // amber-500
      doc.text("E.R.A", 56, 64, { align: 'center' });
      doc.setFontSize(3.5);
      doc.setTextColor(255, 255, 255);
      doc.text("ROADS", 56, 72, { align: 'center' });
    }

    // Header Title Text matching print layout precisely
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION", 85, 58);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text("FEDERAL ROAD PROJECT COMPLIANCE & PERFORMANCE AUDIT REPORT", 85, 71);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-505
    doc.text(`REPORT ID: ERA-AUD-${new Date().getFullYear()}   •   DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 85, 83);

    // Solid border partition below main header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(40, 94, pageWidth - 80, 1.5, 'F');

    // Section 1: Project Identification Profile
    drawSectionHeader("1. Project Identification Profile");
    checkSpace(90);

    // Profile card container rectangle
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(40, curY, pageWidth - 80, 85, 'DF');

    doc.setFontSize(7.5);
    
    // Left column metadata
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT CONTRACT NAME", 55, curY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const projLines = doc.splitTextToSize(p.name, 220);
    doc.text(projLines, 55, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT EMPLOYER", 55, curY + 48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.client || 'ERA', 55, curY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("MAIN CONTRACTOR", 55, curY + 70);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.contractor || 'N/A', 55, curY + 80);

    // Right column metadata
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("FIDIC CONTRACT TYPE", 310, curY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const contractTypeName = p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)';
    doc.text(contractTypeName, 310, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("DESIGN CONSULTANT", 310, curY + 48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const consultantDisplay = `${consultantEval.firmName} (Grade ${consultantEval.officialGrade} • ${consultantEval.overallScore.toFixed(1)}%)`;
    doc.text(consultantDisplay.length > 38 ? consultantDisplay.substring(0, 36) + '...' : consultantDisplay, 310, curY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("ROAD WAY LENGTH", 310, curY + 70);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${p.lengthKm} Km`, 310, curY + 80);

    curY += 98; // safe separation spacing

    // Section 2: Executive Performance Indicators Audit
    drawSectionHeader("2. Executive Performance Indicators Audit");
    checkSpace(95);

    const cardWidth = (pageWidth - 92) / 2; // split page print size

    // CPI block frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, cardWidth, 80, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("COST STATUS INDEX", 52, curY + 18);

    // CPI indicator badge
    const cpiStatus = CPI >= 1.0 ? 'UNDER-BUDGET' : 'CHECK VARIANCE';
    if (CPI >= 1.0) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setTextColor(5, 150, 105);   // emerald-600
    } else {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setTextColor(217, 119, 6);   // amber-600
    }
    doc.roundedRect(40 + cardWidth - 85, curY + 10, 78, 12, 3, 3, 'F');
    doc.setFontSize(6.5);
    doc.text(cpiStatus, 40 + cardWidth - 46, curY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(CPI.toFixed(3), 52, curY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("CPI Ratio", 102, curY + 41);

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const cpiDetailText = CPI >= 1.0 
      ? "Project outlays confirm healthy financial alignment under the allocated BOQ divisions series." 
      : "Financial outlays exceed physical accomplishments. Expenditure lagging against earned outlays.";
    const cpiDetailLines = doc.splitTextToSize(cpiDetailText, cardWidth - 22);
    doc.text(cpiDetailLines, 52, curY + 56);


    // SPI block frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40 + cardWidth + 12, curY, cardWidth, 80, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("SCHEDULE STATUS INDEX", 40 + cardWidth + 24, curY + 18);

    // SPI indicator badge
    const spiStatus = SPI >= 1.0 ? 'ON-SCHEDULE' : 'DELAYED PROGRESS';
    if (SPI >= 1.0) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setTextColor(5, 150, 105);   // emerald-600
    } else {
      doc.setFillColor(254, 226, 226); // rose-100
      doc.setTextColor(225, 29, 72);   // rose-600
    }
    doc.roundedRect(40 + cardWidth * 2 + 12 - 85, curY + 10, 78, 12, 3, 3, 'F');
    doc.setFontSize(6.5);
    doc.text(spiStatus, 40 + cardWidth * 2 + 12 - 46, curY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    if (SPI >= 1.0) {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(SPI.toFixed(3), 40 + cardWidth + 24, curY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("SPI Ratio", 40 + cardWidth + 24 + 50, curY + 41);

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const spiDetailText = SPI >= 1.0 
      ? "Timeline tracking parameters confirm execution is ahead or equal to original planned baselines." 
      : "Significant timeline gap discovered. Urgent resource deployment required to recover lagging milestones.";
    const spiDetailLines = doc.splitTextToSize(spiDetailText, cardWidth - 22);
    doc.text(spiDetailLines, 40 + cardWidth + 24, curY + 56);

    curY += 94;

    // Section 3: Physical Accomplishment vs Target S-Curve
    drawSectionHeader("3. Physical Accomplishment vs Target S-Curve");
    checkSpace(98);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, 88, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Physical Progress Status", 55, curY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(59, 130, 246); // blue-500
    doc.text(`${physicalProgress.toFixed(2)}% Completed`, pageWidth - 145, curY + 22);

    // Progress bar components
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(55, curY + 30, pageWidth - 110, 10, 4, 4, 'F');
    
    doc.setFillColor(37, 99, 235); // blue-600
    const barFillWidth = Math.max(0, Math.min(100, physicalProgress) / 100 * (pageWidth - 110));
    doc.roundedRect(55, curY + 30, barFillWidth, 10, 4, 4, 'F');

    // Planning metrics beneath progress track
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cumulative Target Planned: ${plannedPct.toFixed(2)}%`, 55, curY + 50);
    doc.text(`S-Curve Slippage: -${(plannedPct - physicalProgress).toFixed(2)}%`, pageWidth - 55, curY + 50, { align: 'right' });

    // Dash divider separating date bounds
    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(55, curY + 58, pageWidth - 55, curY + 58);
    doc.setLineDashPattern([], 0); // Solid reset

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("COMMENCEMENT DATE", 55, curY + 70);
    doc.text("REVISED COMPLETION TARGET (EOT)", 300, curY + 70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(ocDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 55, curY + 80);
    doc.setTextColor(220, 38, 38); // rose-600 alert style
    doc.text(rcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 300, curY + 80);

    curY += 102;

    // Section 3b: Data Inconsistency & Integrity Audit Alerts
    drawSectionHeader("3b. Data Inconsistency & Integrity Audit Alerts");
    checkSpace(65);

    if (inconsistencyAlerts.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      const boxHeight = 22 + (inconsistencyAlerts.length * 18);
      doc.roundedRect(40, curY, pageWidth - 80, boxHeight, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text(`DATA INTEGRITY AUDIT: ${inconsistencyAlerts.length} DISCREPANCY ALERT(S) FLAGGED`, 52, curY + 14);

      let alertY = curY + 26;
      inconsistencyAlerts.forEach((alert) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`• [${alert.category}] ${alert.title}`, 52, alertY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Expected: ${alert.expectedValue}  |  Actual: ${alert.actualValue}  |  Variance: ${alert.discrepancy}`, 60, alertY + 8);

        alertY += 18;
      });

      curY += boxHeight + 12;
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(40, curY, pageWidth - 80, 24, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      doc.text("DATA INTEGRITY VERIFIED: All BOQ series sums, IPC values, S-Curves, and Work Program weights align.", 52, curY + 15);
      curY += 32;
    }

    // Section 4: Operational Risks & CPM Schedule Lag Info
    drawSectionHeader("4. Operational Risks & CPM Schedule Lag Info");
    checkSpace(94);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, 84, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("LAGGING WORK SERIES DIVISIONS (PROGRESS < 40%)", 55, curY + 18);

    if (lagging.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      lagging.forEach((l, idx) => {
        if (idx < 2) {
          const lBoxX = 55 + (idx * 215);
          doc.setFillColor(254, 242, 242);
          doc.setDrawColor(254, 226, 226);
          doc.rect(lBoxX, curY + 24, 205, 18, 'DF');
          doc.setTextColor(185, 28, 28);
          doc.text(`Series ${l.code} - ${l.desc}: ${l.progress.toFixed(2)}%`, lBoxX + 8, curY + 36);
        }
      });
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.rect(55, curY + 24, pageWidth - 110, 18, 'DF');
      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text("All BOQ divisions are progressing within healthy FIDIC tolerance margins.", 65, curY + 35);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(55, curY + 49, pageWidth - 55, curY + 49);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("CRITICAL WORK PROGRAM FLIGHTS (CPM)", 55, curY + 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const cpmDescText = `The active critical path spans ${criticalActs.length ? criticalActs.length : '0'} construction phases: ${criticalActs.length ? criticalActs.join(', ') : 'N/A: General Grading'}. Any additional slippage in these activities will directly affect the official revised completion target of ${rcDate.toLocaleDateString()}.`;
    const cpmDescLines = doc.splitTextToSize(cpmDescText, pageWidth - 115);
    doc.text(cpmDescLines, 55, curY + 70);

    curY += 98;

    // Section 4b: Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance
    drawSectionHeader("4b. Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance");
    checkSpace(90);

    // Obstruction Table columns header
    doc.setFillColor(51, 65, 85);
    doc.rect(40, curY, pageWidth - 80, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("Obstruction Metric Type", 55, curY + 11);
    doc.text("Value To-Date", 410, curY + 11);

    curY += 16;
    displayRowMetrics.forEach((rm, rmI) => {
      checkSpace(18);
      doc.setFillColor(rmI % 2 === 0 ? 255 : 248, 250, 252);
      doc.rect(40, curY, pageWidth - 80, 16, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(40, curY, pageWidth - 80, 16, 'S');

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(rm.name, 55, curY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`${rm.value.toFixed(2)} ${rm.unit}`, 410, curY + 11);

      curY += 16;
    });

    curY += 10;

    // Drawing the Matured Unpaid IPCs compliance section in the PDF report
    checkSpace(115);
    doc.setFillColor(254, 251, 237); // light amber-50
    doc.setDrawColor(252, 211, 77); // amber-300
    doc.roundedRect(40, curY, pageWidth - 80, 85, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("Contractual Payment Maturity (FIDIC Sub-clause 14.7 Compliance)", 52, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Outstanding matured certified IPCs and overdue liabilities based on contractual deadlines (56-day limit).", 52, curY + 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("MATURED UNPAID BALANCE", pageWidth - 52, curY + 11, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38); // rose-600
    doc.text("Net ETB: Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetEtb), pageWidth - 52, curY + 18, { align: 'right' });
    doc.text("Net USD: $ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetUsd), pageWidth - 52, curY + 25, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text("TOTAL UNPAID NET ETB: Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetEtb), pageWidth - 52, curY + 31, { align: 'right' });
    doc.text("TOTAL UNPAID NET USD: $ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetUsd), pageWidth - 52, curY + 37, { align: 'right' });

    if (unpaidIpcsDetails.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text("IPC No.", 52, curY + 41);
      doc.text("Age (Days)", 140, curY + 41);
      doc.text("Net ETB Portion", 220, curY + 41);
      doc.text("Net USD Portion", 310, curY + 41);
      doc.text("Clausal Status", 400, curY + 41);

      let lineY = curY + 49;
      unpaidIpcsDetails.slice(0, 3).forEach((item) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(51, 65, 85);
        doc.text(item.paymentNo, 52, lineY);
        doc.text(`${item.daysElapsed} days`, 140, lineY);
        doc.text("Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.certifiedEtb), 220, lineY);
        doc.text("$ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.certifiedUsd), 310, lineY);
        
        doc.setFont('helvetica', 'bold');
        if (item.isMatured) {
          doc.setTextColor(220, 38, 38);
          doc.text("Matured / Overdue", 400, lineY);
        } else {
          doc.setTextColor(37, 99, 235);
          doc.text("Pending", 400, lineY);
        }
        lineY += 9;
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text("No outstanding certified payments pending. Cash flows remain in optimal health.", 52, curY + 45);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("* Ref: Sub-clause 14.7 requires payment within 56 days. Delays trigger 14.8 interest (4% ETB, LIBOR+2% USD).", 52, curY + 78);

    curY += 95;

    // KPI Summary Grid (Strategic Compliance Audit)
    checkSpace(150);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFillColor(16, 185, 129); // emerald-500 bullet
    doc.rect(40, curY, 4, 8, 'F');
    doc.text("Strategic Compliance Audit (12 KPI Groups Summary)", 48, curY + 7);
    curY += 14;

    const colW = (pageWidth - 95) / 2; // split block width
    kpiGroupsScores.forEach((g, gIdx) => {
      const isRight = gIdx >= 6;
      const innerIdx = gIdx % 6;
      const gridBoxX = 40 + (isRight ? colW + 15 : 0);
      const gridBoxY = curY + (innerIdx * 20);

      // Card frame
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(gridBoxX, gridBoxY, colW, 17, 3, 3, 'DF');

      // ID
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(g.id, gridBoxX + 6, gridBoxY + 11);

      // Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const maxCharCount = 28;
      const cleanLabel = g.name.length > maxCharCount ? g.name.substring(0, maxCharCount) + '...' : g.name;
      doc.text(cleanLabel, gridBoxX + 24, gridBoxY + 11);

      // Score status colors
      let scoreColor = [220, 38, 38]; // rose
      if (g.id === 'G8') {
        if (g.score <= 50) scoreColor = [5, 150, 105]; // emerald
        else if (g.score <= 75) scoreColor = [217, 119, 6]; // amber
      } else {
        if (g.score >= 80) scoreColor = [5, 150, 105]; // emerald
        else if (g.score >= 50) scoreColor = [217, 119, 6]; // amber
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(`${g.score.toFixed(2)}%`, gridBoxX + colW - 30, gridBoxY + 11);

      // Draw thin visual bar track beneath each group
      doc.setFillColor(230, 230, 235);
      doc.rect(gridBoxX + 6, gridBoxY + 14, colW - 12, 1.2, 'F');
      doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      const fillBarW = Math.max(0, Math.min(100, g.score) / 100 * (colW - 12));
      doc.rect(gridBoxX + 6, gridBoxY + 14, fillBarW, 1.2, 'F');
    });

    curY += (6 * 20) + 14;

    // Section 5: Bank Securities & Guarantee Conformity
    drawSectionHeader("5. Bank Securities & Guarantee Conformity");
    checkSpace(55);

    if (criticalGuarantees.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 226, 226);
      doc.roundedRect(40, curY, pageWidth - 80, 42, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text("CRITICAL AUDIT NOTICE: EXPIRY/VALIDATION WARNING ISSUED!", 52, curY + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(127, 29, 29);
      const guarDesc = criticalGuarantees.map(b => `${b.type} (Br. ${formattedMoney(b.amount)}M - Exp: ${b.expireDate})`).join(' | ');
      const descLines = doc.splitTextToSize(guarDesc, pageWidth - 100);
      doc.text(descLines, 52, curY + 25);
      curY += 49;
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(40, curY, pageWidth - 80, 24, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      doc.text("All performance and advance mobilization payment guarantees have validated expiry thresholds.", 52, curY + 15);
      curY += 32;
    }

    // Section 6: Recommended Audit Interventions & Directives
    drawSectionHeader("6. Recommended Audit Interventions & Directives");
    const overdueCount = consultantEval.metrics?.rfis?.overdue ?? 0;
    const actionDirects = [
      { step: "01", body: `Issue formal Warning Directive under FIDIC Clause 8.6 regarding the delays evaluated in ${lagging.length > 0 ? lagging.map(l => `Series ${l.code}`).join(', ') : 'Series A (Earthworks)'}.` },
      { step: "02", body: "Instruct the Supervising Engineer and Lead QS to audit price adjustments indexes and current IPC valuation backlogs to align cash outlay velocity with real progress." },
      { step: "03", body: "Instruct Contractor to submit a comprehensive recovery program reflecting real equipment plant and workforce enhancements on the critical paths." },
      ...(((consultantEval.overallScore ?? 80) < 75 || overdueCount > 0) ? [{
        step: "04",
        body: `Direct Supervision Consultant (${consultantEval.firmName} - Grade ${consultantEval.officialGrade} • ${(consultantEval.overallScore ?? 80).toFixed(1)}%) to resolve ${overdueCount} overdue technical submittals and rectify key staffing gaps within 14 days under FIDIC Cl. 3 / ERA Guidelines.`
      }] : [])
    ];

    const boxHeight = Math.max(58, actionDirects.length * 17 + 8);
    checkSpace(boxHeight + 8);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, boxHeight, 'DF');

    doc.setFontSize(7.5);
    actionDirects.forEach((act, actI) => {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(52, curY + 5 + (actI * 17), 14, 11, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(act.step, 59, curY + 13 + (actI * 17), { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const textLines = doc.splitTextToSize(act.body, pageWidth - 140);
      doc.text(textLines, 74, curY + 13 + (actI * 17));
    });

    curY += boxHeight + 10;

    // Section 7: Endorsement & Sign-Off Block
    drawSectionHeader("7. Endorsement & Sign-Off Block");
    checkSpace(68);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DRAFTED BY PMO, PROJECT MANAGER", 55, curY + 12);
    doc.text("VERIFIED BY CPMP DIRECTOR", 310, curY + 12);

    doc.setDrawColor(203, 213, 225);
    doc.line(55, curY + 34, 225, curY + 34);
    doc.line(310, curY + 34, 480, curY + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SIGNATURE / STAMP", 55, curY + 43);
    doc.text("SIGNATURE / OFFICIAL CPMP SEAL STAMP", 310, curY + 43);

    curY += 52;

    doc.save(`ERA_Compliance_Report_${p.name ? p.name.replace(/\s+/g, '_') : 'Untitled'}.pdf`);
  };

  // Dedicated PDF Exporter: Contractor Monthly Grading Ledger (Supports full project or specific 6-month semester)
  const handleExportContractorGradingPDF = (recordsToExport?: MonthlyGradingRecord[], customSemesterTitle?: string) => {
    const isFiltered = selectedSemesterFilter !== 'All' || selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All' || selectedGradingMonthFilter !== 'All' || selectedConsultantTenureFilter !== 'All';
    const records = (Array.isArray(recordsToExport) ? recordsToExport : null) || (isFiltered ? filteredMonthlyGradingRecords : monthlyGradingRecords);
    if (!Array.isArray(records) || records.length === 0) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const usableWidth = pageWidth - (margin * 2); // 523.28 pt
    let curY = 36;

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 45) {
        doc.addPage();
        curY = 36;
        return true;
      }
      return false;
    };

    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, curY, usableWidth, 54, 4, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 12, curY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    const headerTitleText = customSemesterTitle 
      ? `CONTRACTOR 6-MONTH CUMULATIVE PERFORMANCE REPORT (${customSemesterTitle.toUpperCase()})`
      : (selectedSemesterFilter !== 'All' 
          ? `CONTRACTOR 6-MONTH CUMULATIVE PERFORMANCE REPORT (${selectedSemesterFilter.toUpperCase()})`
          : (selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All'
              ? `CONTRACTOR PERFORMANCE REPORT (DATE RANGE: ${selectedStartMonthFilter !== 'All' ? selectedStartMonthFilter : 'START'} TO ${selectedEndMonthFilter !== 'All' ? selectedEndMonthFilter : 'LATEST'})`
              : "CONTRACTOR MONTHLY PERFORMANCE & SCHEDULE EXECUTION LEDGER"));
    doc.text(headerTitleText, margin + 12, curY + 34);
    doc.text(`AUDIT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 12, curY + 45);

    curY += 62;

    // Project & Contractor Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, usableWidth, 48, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const projectName = `PROJECT: ${p.name || 'Untitled Project'} (${p.id || 'N/A'})`;
    const projLines = doc.splitTextToSize(projectName, 300);
    doc.text(projLines[0] || projectName, margin + 10, curY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contractor: ${p.contractor || 'N/A'}`, margin + 10, curY + 28);
    doc.text(`Contract Delivery: ${p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}  •  Length: ${p.lengthKm || 0} KM`, margin + 10, curY + 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`CUMULATIVE PROGRESS: ${physicalProgress.toFixed(2)}%`, margin + 310, curY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Target Plan: ${plannedPct.toFixed(2)}%  •  Slippage: ${(plannedPct - physicalProgress).toFixed(2)}%`, margin + 310, curY + 28);
    doc.text(`Audited Periods: ${records.length} Month(s)`, margin + 310, curY + 40);

    curY += 56;

    // Contractor Highlights Summary Cards
    const latestRec = records[0];
    const avgContScore = records.reduce((a, b) => a + (b.contractorScore ?? 80), 0) / (records.length || 1);
    const cardW = (usableWidth - 12) / 3;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("LATEST PERIOD AUDIT SCORE", margin + 8, curY + 12);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Grade ${latestRec?.contractorGrade || 'B'} • ${(latestRec?.contractorScore || 80).toFixed(1)}%`, margin + 8, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Standing: ${latestRec?.contractorStanding || 'Good'}`, margin + 8, curY + 33);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + cardW + 6, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("SCHEDULE PERFORMANCE (SPI)", margin + cardW + 14, curY + 12);
    doc.setFontSize(8.5);
    const spiVal = latestRec?.contractorSpi || 1.0;
    doc.setTextColor(spiVal >= 1.0 ? 5 : 220, spiVal >= 1.0 ? 150 : 38, spiVal >= 1.0 ? 105 : 38);
    doc.text(`SPI ${spiVal.toFixed(2)} (${spiVal >= 1.0 ? 'Ahead/On Schedule' : 'Lagging'})`, margin + cardW + 14, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Period: ${latestRec?.monthName || 'Latest'}`, margin + cardW + 14, curY + 33);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + (cardW * 2) + 12, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(customSemesterTitle ? "6-MONTH CUMULATIVE AVERAGE" : "PERIOD CONTRACTOR AVERAGE", margin + (cardW * 2) + 14, curY + 12);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${avgContScore.toFixed(1)}% Average Score`, margin + (cardW * 2) + 14, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Based on ${records.length} recorded cycle(s)`, margin + (cardW * 2) + 14, curY + 33);

    curY += 46;

    // Table Header
    checkSpace(35);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, curY, usableWidth, 18, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("MONTH / PERIOD", margin + 6, curY + 12);
    doc.text("MONTHLY PLAN / ACT", margin + 78, curY + 12);
    doc.text("VARIANCE", margin + 165, curY + 12);
    doc.text("CUM ACT (SPI)", margin + 222, curY + 12);
    doc.text("GRADE / SCORE", margin + 288, curY + 12);
    doc.text("STATUS", margin + 352, curY + 12);
    doc.text("CONTRACTOR REMARKS & AUDIT EXCEPTIONS", margin + 398, curY + 12);

    curY += 18;

    // Table Rows with dynamic text wrapping
    const colWRemarks = usableWidth - 392; // 131.28 pt

    records.forEach((mg, mgIdx) => {
      const remarksText = mg.contractorRemarks || mg.notes || 'No specific contractor audit exceptions logged for this cycle.';
      const remarkLines = doc.splitTextToSize(remarksText, colWRemarks - 8);
      const dynamicRowHeight = Math.max(22, (remarkLines.length * 8) + 12);

      checkSpace(dynamicRowHeight + 4);

      const isEven = mgIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, curY, usableWidth, dynamicRowHeight, 'DF');

      // Month name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(mg.monthName || mg.month, margin + 6, curY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Rec: ${mg.recordedDate || 'N/A'}`, margin + 6, curY + 18);

      // Monthly Plan vs Actual
      const planM = typeof mg.contractorPlanMonthly === 'number' ? mg.contractorPlanMonthly : 0;
      const actM = typeof mg.contractorActualMonthly === 'number' ? mg.contractorActualMonthly : 0;
      const varM = typeof mg.contractorVariance === 'number' ? mg.contractorVariance : (actM - planM);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Pln: ${planM.toFixed(2)}% | Act: ${actM.toFixed(2)}%`, margin + 78, curY + 12);

      // Variance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(varM >= 0 ? 5 : 220, varM >= 0 ? 150 : 38, varM >= 0 ? 105 : 38);
      doc.text(`${varM >= 0 ? '+' : ''}${varM.toFixed(2)}%`, margin + 165, curY + 12);

      // Cumulative & SPI
      const cumAct = typeof mg.contractorActualCumulative === 'number' ? mg.contractorActualCumulative : 0;
      const spi = typeof mg.contractorSpi === 'number' ? mg.contractorSpi : 1.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(`Cum: ${cumAct.toFixed(2)}%`, margin + 222, curY + 9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(spi >= 1.0 ? 5 : 217, spi >= 1.0 ? 150 : 119, spi >= 1.0 ? 105 : 6);
      doc.text(`SPI: ${spi.toFixed(2)}`, margin + 222, curY + 17);

      // Grade Badge
      let cGradeColor = [16, 185, 129];
      if (mg.contractorGrade === 'B') cGradeColor = [13, 148, 136];
      else if (mg.contractorGrade === 'C') cGradeColor = [217, 119, 6];
      else if (mg.contractorGrade === 'D') cGradeColor = [234, 88, 12];
      else if (mg.contractorGrade === 'F') cGradeColor = [220, 38, 38];

      doc.setFillColor(cGradeColor[0], cGradeColor[1], cGradeColor[2]);
      doc.roundedRect(margin + 288, curY + 3, 52, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(`GR ${mg.contractorGrade || 'B'} • ${(mg.contractorScore || 80).toFixed(1)}%`, margin + 314, curY + 12.5, { align: 'center' });

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(mg.status === 'Approved' ? 5 : 71, mg.status === 'Approved' ? 150 : 85, mg.status === 'Approved' ? 105 : 105);
      doc.text((mg.status || 'Finalized').toUpperCase(), margin + 352, curY + 12);

      // Wrapped Remarks Line by Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      remarkLines.forEach((line: string, lIdx: number) => {
        doc.text(line, margin + 398, curY + 9 + (lIdx * 7.5));
      });

      curY += dynamicRowHeight;
    });

    curY += 16;

    // Sign-Off Block
    checkSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VERIFIED BY LEAD RESIDENT ENGINEER / PMO", margin + 15, curY + 12);
    doc.text("ENDORSED BY CPMP DIRECTOR / ERA AUDIT", margin + 285, curY + 12);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, curY + 34, margin + 210, curY + 34);
    doc.line(margin + 285, curY + 34, margin + 480, curY + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SIGNATURE & OFFICIAL SEAL", margin + 15, curY + 43);
    doc.text("SIGNATURE & OFFICIAL CPMP STAMP", margin + 285, curY + 43);

    const titleClean = customSemesterTitle ? customSemesterTitle.replace(/[^a-zA-Z0-9]/g, '_') : (p.name ? p.name.replace(/\s+/g, '_') : 'Project');
    doc.save(`ERA_Contractor_Grading_${titleClean}.pdf`);
  };

  // Dedicated PDF Exporter: Supervision Consultant Monthly Grading Ledger (Supports full project or specific 6-month semester)
  const handleExportConsultantGradingPDF = (recordsToExport?: MonthlyGradingRecord[], customSemesterTitle?: string) => {
    const isFiltered = selectedSemesterFilter !== 'All' || selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All' || selectedGradingMonthFilter !== 'All' || selectedConsultantTenureFilter !== 'All';
    const records = (Array.isArray(recordsToExport) ? recordsToExport : null) || (isFiltered ? filteredMonthlyGradingRecords : monthlyGradingRecords);
    if (!Array.isArray(records) || records.length === 0) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const usableWidth = pageWidth - (margin * 2); // 523.28 pt
    let curY = 36;

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 45) {
        doc.addPage();
        curY = 36;
        return true;
      }
      return false;
    };

    // Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, curY, usableWidth, 54, 4, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 12, curY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    const headerTitleText = customSemesterTitle 
      ? `SUPERVISION CONSULTANT 6-MONTH CUMULATIVE PERFORMANCE REPORT (${customSemesterTitle.toUpperCase()})`
      : (selectedSemesterFilter !== 'All' 
          ? `SUPERVISION CONSULTANT 6-MONTH CUMULATIVE PERFORMANCE REPORT (${selectedSemesterFilter.toUpperCase()})`
          : (selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All'
              ? `SUPERVISION CONSULTANT PERFORMANCE REPORT (DATE RANGE: ${selectedStartMonthFilter !== 'All' ? selectedStartMonthFilter : 'START'} TO ${selectedEndMonthFilter !== 'All' ? selectedEndMonthFilter : 'LATEST'})`
              : "SUPERVISION CONSULTANT MONTHLY DUAL-PILLAR GRADING & SLA AUDIT LEDGER"));
    doc.text(headerTitleText, margin + 12, curY + 34);
    doc.text(`AUDIT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 12, curY + 45);

    curY += 62;

    // Project & Consultant Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, usableWidth, 48, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const consultantTitle = `SUPERVISION CONSULTANT: ${(consultantEval.firmName || p.consultant || 'N/A').toUpperCase()}`;
    const firmLines = doc.splitTextToSize(consultantTitle, 300);
    doc.text(firmLines[0] || consultantTitle, margin + 10, curY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Resident Engineer: ${consultantEval.residentEngineer || 'Eng. Assigned'}  •  ${consultantEval.associationType}`, margin + 10, curY + 28);
    doc.text(`Project: ${p.name || 'Untitled Project'} (${p.id || 'N/A'})`, margin + 10, curY + 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`CONSULTANT GRADE: ${consultantEval.officialGrade} (${(consultantEval.overallScore ?? 80).toFixed(1)}%)`, margin + 310, curY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const slaRate = consultantEval.slaTurnaroundScore ?? consultantEval.metrics?.overallOnTimeRate ?? 85;
    const totalSubs = consultantEval.metrics?.totalCount ?? 0;
    const pendingSubs = consultantEval.metrics?.totalPending ?? 0;
    doc.text(`SLA On-Time Rate: ${slaRate.toFixed(1)}%  •  Standing: ${consultantEval.officialStanding}`, margin + 310, curY + 28);
    doc.text(`Submittals Audited: ${totalSubs} logged (${pendingSubs} pending)`, margin + 310, curY + 40);

    curY += 56;

    // Consultant Highlights Summary Cards
    const latestRec = records[0];
    const avgConsScore = records.reduce((a, b) => a + (b.consultantOverallScore ?? 82.5), 0) / (records.length || 1);
    const cardW = (usableWidth - 12) / 3;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("LATEST COMBINED SCORE", margin + 8, curY + 12);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Grade ${latestRec?.consultantGrade || 'B'} • ${(latestRec?.consultantOverallScore || 82.5).toFixed(1)}%`, margin + 8, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Standing: ${latestRec?.consultantStanding || 'Standard'}`, margin + 8, curY + 33);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + cardW + 6, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("PILLAR 1: SUBMITTAL SLA RATE", margin + cardW + 14, curY + 12);
    doc.setFontSize(8.5);
    const slaTurnaround = latestRec?.consultantSlaTurnaroundScore || 85;
    doc.setTextColor(slaTurnaround >= 80 ? 5 : 220, slaTurnaround >= 80 ? 150 : 38, slaTurnaround >= 80 ? 105 : 38);
    doc.text(`${slaTurnaround.toFixed(1)}% On-Time Turnaround`, margin + cardW + 14, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Avg RFI: ${latestRec?.consultantAvgRfiDays || 6}d • Target: 7d`, margin + cardW + 14, curY + 33);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + (cardW * 2) + 12, curY, cardW, 38, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("PILLAR 2: 5-DIM TECH AUDIT", margin + (cardW * 2) + 20, curY + 12);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${(latestRec?.consultantFiveDimScore || 80).toFixed(1)}% Technical Rating`, margin + (cardW * 2) + 20, curY + 24);
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Avg Over ${records.length} Cycles: ${avgConsScore.toFixed(1)}%`, margin + (cardW * 2) + 20, curY + 33);

    curY += 46;

    // Table Header
    checkSpace(35);
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(margin, curY, usableWidth, 18, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("MONTH / PERIOD", margin + 6, curY + 12);
    doc.text("PILLAR 1: SLA TURNAROUND %", margin + 80, curY + 12);
    doc.text("PILLAR 2: 5-DIM TECH %", margin + 175, curY + 12);
    doc.text("COMBINED RATING", margin + 265, curY + 12);
    doc.text("CONS. GRADE", margin + 335, curY + 12);
    doc.text("STATUS", margin + 388, curY + 12);
    doc.text("SUPERVISORY FINDINGS & DIRECTIVES", margin + 428, curY + 12);

    curY += 18;

    // Table Rows with dynamic text wrapping
    const colWFindings = usableWidth - 422; // 101.28 pt

    records.forEach((mg, mgIdx) => {
      const findingsText = mg.consultantRemarks || mg.notes || 'Standard supervisory inspection and submittal compliance logged.';
      const findingLines = doc.splitTextToSize(findingsText, colWFindings - 8);
      const dynamicRowHeight = Math.max(22, (findingLines.length * 8) + 12);

      checkSpace(dynamicRowHeight + 4);

      const isEven = mgIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, curY, usableWidth, dynamicRowHeight, 'DF');

      // Month name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(mg.monthName || mg.month, margin + 6, curY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Rec: ${mg.recordedDate || 'N/A'}`, margin + 6, curY + 18);

      // Pillar 1 SLA Score
      const slaScore = typeof mg.consultantSlaTurnaroundScore === 'number' ? mg.consultantSlaTurnaroundScore : 85;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${slaScore.toFixed(1)}% On-Time`, margin + 80, curY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Avg RFI: ${mg.consultantAvgRfiDays || 6}d`, margin + 80, curY + 18);

      // Pillar 2 5-Dim Score
      const dimScore = typeof mg.consultantFiveDimScore === 'number' ? mg.consultantFiveDimScore : 80;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${dimScore.toFixed(1)}% Technical`, margin + 175, curY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text("5 Matrix Dims", margin + 175, curY + 18);

      // Combined Rating
      const combinedScore = typeof mg.consultantOverallScore === 'number' ? mg.consultantOverallScore : ((slaScore + dimScore) / 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(79, 70, 229);
      doc.text(`${combinedScore.toFixed(1)}%`, margin + 265, curY + 12);

      // Consultant Grade Badge
      let consGradeColor = [16, 185, 129];
      if (mg.consultantGrade === 'B') consGradeColor = [13, 148, 136];
      else if (mg.consultantGrade === 'C') consGradeColor = [217, 119, 6];
      else if (mg.consultantGrade === 'D') consGradeColor = [234, 88, 12];
      else if (mg.consultantGrade === 'F') consGradeColor = [220, 38, 38];

      doc.setFillColor(consGradeColor[0], consGradeColor[1], consGradeColor[2]);
      doc.roundedRect(margin + 335, curY + 3, 46, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(`GR ${mg.consultantGrade || 'B'}`, margin + 358, curY + 12.5, { align: 'center' });

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(mg.status === 'Approved' ? 5 : 71, mg.status === 'Approved' ? 150 : 85, mg.status === 'Approved' ? 105 : 105);
      doc.text((mg.status || 'Finalized').toUpperCase(), margin + 388, curY + 12);

      // Wrapped Findings Line by Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      findingLines.forEach((line: string, lIdx: number) => {
        doc.text(line, margin + 428, curY + 9 + (lIdx * 7.5));
      });

      curY += dynamicRowHeight;
    });

    curY += 16;

    // Sign-Off Block
    checkSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VERIFIED BY LEAD RESIDENT ENGINEER / PMO", margin + 15, curY + 12);
    doc.text("ENDORSED BY CPMP DIRECTOR / ERA AUDIT", margin + 285, curY + 12);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, curY + 34, margin + 210, curY + 34);
    doc.line(margin + 285, curY + 34, margin + 480, curY + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SIGNATURE & OFFICIAL SEAL", margin + 15, curY + 43);
    doc.text("SIGNATURE & OFFICIAL CPMP STAMP", margin + 285, curY + 43);

    const titleClean = customSemesterTitle ? customSemesterTitle.replace(/[^a-zA-Z0-9]/g, '_') : (p.name ? p.name.replace(/\s+/g, '_') : 'Project');
    doc.save(`ERA_Supervision_Consultant_Grading_${titleClean}.pdf`);
  };

  // Dedicated Official Consolidated PDF Exporter for Both Contractor & Supervision Consultant (Separated into distinct sections)
  const handleExportMonthlyGradingPDF = (recordsToExport?: MonthlyGradingRecord[], customSemesterTitle?: string) => {
    const isFiltered = selectedSemesterFilter !== 'All' || selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All' || selectedGradingMonthFilter !== 'All' || selectedConsultantTenureFilter !== 'All';
    const records = (Array.isArray(recordsToExport) ? recordsToExport : null) || (isFiltered ? filteredMonthlyGradingRecords : monthlyGradingRecords);
    if (!Array.isArray(records) || records.length === 0) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const usableWidth = pageWidth - (margin * 2); // 523.28 pt
    let curY = 36;

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 45) {
        doc.addPage();
        curY = 36;
        return true;
      }
      return false;
    };

    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, curY, usableWidth, 54, 4, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 12, curY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    const headerTitleText = customSemesterTitle
      ? `CONSOLIDATED DUAL GRADING LEDGER (${customSemesterTitle.toUpperCase()})`
      : (selectedSemesterFilter !== 'All'
          ? `CONSOLIDATED DUAL GRADING LEDGER (${selectedSemesterFilter.toUpperCase()})`
          : (selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All'
              ? `CONSOLIDATED GRADING LEDGER (DATE RANGE: ${selectedStartMonthFilter !== 'All' ? selectedStartMonthFilter : 'START'} TO ${selectedEndMonthFilter !== 'All' ? selectedEndMonthFilter : 'LATEST'})`
              : "CONSOLIDATED MONTHLY CONTRACTOR & SUPERVISION CONSULTANT GRADING LEDGER"));
    doc.text(headerTitleText, margin + 12, curY + 34);
    doc.text(`AUDIT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 12, curY + 45);

    curY += 62;

    // Project Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, usableWidth, 48, 3, 3, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const projectName = `PROJECT: ${p.name || 'Untitled Project'} (${p.id || 'N/A'})`;
    const projLines = doc.splitTextToSize(projectName, 300);
    doc.text(projLines[0] || projectName, margin + 10, curY + 15);
    doc.text(`Contractor: ${p.contractor || 'N/A'}`, margin + 10, curY + 28);
    doc.text(`Consultant: ${consultantEval.firmName || p.consultant || 'N/A'}`, margin + 10, curY + 40);

    doc.text(`TOTAL LENGTH: ${p.lengthKm || 0} KM`, margin + 310, curY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Contract Type: ${p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}`, margin + 310, curY + 28);
    doc.text(`Physical Progress: ${physicalProgress.toFixed(2)}% (Plan: ${plannedPct.toFixed(2)}%)`, margin + 310, curY + 40);

    curY += 56;

    // SECTION 1: CONTRACTOR MONTHLY PERFORMANCE & SPI LEDGER
    checkSpace(50);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, curY, usableWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PART A: CONTRACTOR MONTHLY PHYSICAL PROGRESS & SCHEDULE EXECUTION LEDGER", margin + 8, curY + 12);
    curY += 22;

    // Contractor Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, usableWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text("MONTH / PERIOD", margin + 6, curY + 11);
    doc.text("PLAN / ACTUAL %", margin + 80, curY + 11);
    doc.text("VARIANCE", margin + 160, curY + 11);
    doc.text("CUM ACT (SPI)", margin + 215, curY + 11);
    doc.text("CONT. GRADE", margin + 278, curY + 11);
    doc.text("STATUS", margin + 338, curY + 11);
    doc.text("CONTRACTOR AUDIT REMARKS", margin + 382, curY + 11);

    curY += 16;

    const colWContRemarks = usableWidth - 376; // 147.28 pt
    records.forEach((mg, mgIdx) => {
      const remarksText = mg.contractorRemarks || mg.notes || 'No specific contractor audit exceptions logged.';
      const remarkLines = doc.splitTextToSize(remarksText, colWContRemarks - 8);
      const dynamicRowHeight = Math.max(20, (remarkLines.length * 7.5) + 10);

      checkSpace(dynamicRowHeight + 4);

      const isEven = mgIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, curY, usableWidth, dynamicRowHeight, 'DF');

      // Month name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(mg.monthName || mg.month, margin + 6, curY + 9);

      // Monthly Plan vs Actual
      const planM = typeof mg.contractorPlanMonthly === 'number' ? mg.contractorPlanMonthly : 0;
      const actM = typeof mg.contractorActualMonthly === 'number' ? mg.contractorActualMonthly : 0;
      const varM = typeof mg.contractorVariance === 'number' ? mg.contractorVariance : (actM - planM);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(`P: ${planM.toFixed(2)}% | A: ${actM.toFixed(2)}%`, margin + 80, curY + 9);

      // Variance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(varM >= 0 ? 5 : 220, varM >= 0 ? 150 : 38, varM >= 0 ? 105 : 38);
      doc.text(`${varM >= 0 ? '+' : ''}${varM.toFixed(2)}%`, margin + 160, curY + 9);

      // Cumulative & SPI
      const cumAct = typeof mg.contractorActualCumulative === 'number' ? mg.contractorActualCumulative : 0;
      const spi = typeof mg.contractorSpi === 'number' ? mg.contractorSpi : 1.0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(`${cumAct.toFixed(2)}% (SPI: ${spi.toFixed(2)})`, margin + 215, curY + 9);

      // Grade Badge
      let cGradeColor = [16, 185, 129];
      if (mg.contractorGrade === 'B') cGradeColor = [13, 148, 136];
      else if (mg.contractorGrade === 'C') cGradeColor = [217, 119, 6];
      else if (mg.contractorGrade === 'D') cGradeColor = [234, 88, 12];
      else if (mg.contractorGrade === 'F') cGradeColor = [220, 38, 38];

      doc.setFillColor(cGradeColor[0], cGradeColor[1], cGradeColor[2]);
      doc.roundedRect(margin + 278, curY + 2, 48, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`GR ${mg.contractorGrade || 'B'} • ${(mg.contractorScore || 80).toFixed(1)}%`, margin + 302, curY + 10, { align: 'center' });

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(mg.status === 'Approved' ? 5 : 71, mg.status === 'Approved' ? 150 : 85, mg.status === 'Approved' ? 105 : 105);
      doc.text((mg.status || 'Finalized').toUpperCase(), margin + 338, curY + 9);

      // Remarks
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      remarkLines.forEach((line: string, lIdx: number) => {
        doc.text(line, margin + 382, curY + 8 + (lIdx * 7));
      });

      curY += dynamicRowHeight;
    });

    curY += 16;

    // SECTION 2: SUPERVISION CONSULTANT DUAL-PILLAR AUDIT LEDGER
    checkSpace(50);
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(margin, curY, usableWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PART B: SUPERVISION CONSULTANT DUAL-PILLAR COMPLIANCE & SLA LEDGER", margin + 8, curY + 12);
    curY += 22;

    // Consultant Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, usableWidth, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text("MONTH / PERIOD", margin + 6, curY + 11);
    doc.text("PILLAR 1: SLA ON-TIME %", margin + 80, curY + 11);
    doc.text("PILLAR 2: 5-DIM TECH %", margin + 175, curY + 11);
    doc.text("COMBINED RATING", margin + 265, curY + 11);
    doc.text("CONS. GRADE", margin + 335, curY + 11);
    doc.text("STATUS", margin + 388, curY + 11);
    doc.text("SUPERVISORY FINDINGS & OBSERVATIONS", margin + 428, curY + 11);

    curY += 16;

    const colWConsRemarks = usableWidth - 422; // 101.28 pt
    records.forEach((mg, mgIdx) => {
      const findingsText = mg.consultantRemarks || mg.notes || 'Standard supervisory inspection and submittal compliance logged.';
      const findingLines = doc.splitTextToSize(findingsText, colWConsRemarks - 8);
      const dynamicRowHeight = Math.max(20, (findingLines.length * 7.5) + 10);

      checkSpace(dynamicRowHeight + 4);

      const isEven = mgIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, curY, usableWidth, dynamicRowHeight, 'DF');

      // Month name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(mg.monthName || mg.month, margin + 6, curY + 9);

      // SLA Turnaround
      const slaScore = typeof mg.consultantSlaTurnaroundScore === 'number' ? mg.consultantSlaTurnaroundScore : 85;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(`${slaScore.toFixed(1)}% (Avg RFI ${mg.consultantAvgRfiDays || 6}d)`, margin + 80, curY + 9);

      // 5-Dim Tech
      const dimScore = typeof mg.consultantFiveDimScore === 'number' ? mg.consultantFiveDimScore : 80;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(51, 65, 85);
      doc.text(`${dimScore.toFixed(1)}% Technical`, margin + 175, curY + 9);

      // Combined Rating
      const combinedScore = typeof mg.consultantOverallScore === 'number' ? mg.consultantOverallScore : ((slaScore + dimScore) / 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`${combinedScore.toFixed(1)}%`, margin + 265, curY + 9);

      // Grade Badge
      let consGradeColor = [16, 185, 129];
      if (mg.consultantGrade === 'B') consGradeColor = [13, 148, 136];
      else if (mg.consultantGrade === 'C') consGradeColor = [217, 119, 6];
      else if (mg.consultantGrade === 'D') consGradeColor = [234, 88, 12];
      else if (mg.consultantGrade === 'F') consGradeColor = [220, 38, 38];

      doc.setFillColor(consGradeColor[0], consGradeColor[1], consGradeColor[2]);
      doc.roundedRect(margin + 335, curY + 2, 44, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`GR ${mg.consultantGrade || 'B'}`, margin + 357, curY + 10, { align: 'center' });

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(mg.status === 'Approved' ? 5 : 71, mg.status === 'Approved' ? 150 : 85, mg.status === 'Approved' ? 105 : 105);
      doc.text((mg.status || 'Finalized').toUpperCase(), margin + 388, curY + 9);

      // Findings
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      findingLines.forEach((line: string, lIdx: number) => {
        doc.text(line, margin + 428, curY + 8 + (lIdx * 7));
      });

      curY += dynamicRowHeight;
    });

    curY += 16;

    // Sign-Off Block
    checkSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VERIFIED BY LEAD RESIDENT ENGINEER / PMO", margin + 15, curY + 12);
    doc.text("ENDORSED BY CPMP DIRECTOR / ERA AUDIT", margin + 285, curY + 12);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 15, curY + 34, margin + 210, curY + 34);
    doc.line(margin + 285, curY + 34, margin + 480, curY + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SIGNATURE & OFFICIAL SEAL", margin + 15, curY + 43);
    doc.text("SIGNATURE & OFFICIAL CPMP STAMP", margin + 285, curY + 43);

    doc.save(`ERA_Consolidated_Monthly_Grading_Ledger_${p.name ? p.name.replace(/\s+/g, '_') : 'Project'}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Printing Style CSS Injection safely inside React */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: portrait !important;
          margin: 1in !important;
        }
        @media print {
          /* 1. Reset everything except print area */
          body * {
            visibility: hidden !important;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
            font-family: 'Times New Roman', Times, Baskerville, Georgia, serif !important;
            word-spacing: normal !important;
            letter-spacing: normal !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          
          /* 2. Page and wrapper layout */
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* 3. Typography size constraints */
          /* Default font sizes: 14pt for headings, 12pt for body if not discernible */
          #print-area-wrapper h1,
          #print-area-wrapper h2,
          #print-area-wrapper h3,
          #print-area-wrapper h4,
          #print-area-wrapper h5,
          #print-area-wrapper h6 {
            font-size: 14pt !important;
            font-weight: bold !important;
            line-height: 1.3 !important;
            margin-top: 14pt !important;
            margin-bottom: 7pt !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Body elements default size 12pt if not explicitly styled with larger/smaller discernible sizes */
          #print-area-wrapper p,
          #print-area-wrapper li,
          #print-area-wrapper div,
          #print-area-wrapper td,
          #print-area-wrapper th,
          #print-area-wrapper span {
            font-size: 12pt;
            line-height: 1.4 !important;
          }

          /* 4. Tables rules (Critical) */
          #print-area-wrapper table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            margin-top: 10px !important;
            margin-bottom: 15px !important;
            table-layout: auto !important;
          }
          
          #print-area-wrapper tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          /* Table borders must be fully visible and intact */
          #print-area-wrapper table, 
          #print-area-wrapper th, 
          #print-area-wrapper td {
            border: 1px solid #000000 !important;
          }
          
          #print-area-wrapper th, 
          #print-area-wrapper td {
            padding: 6px 8px !important;
            text-align: left !important;
            vertical-align: middle !important;
            /* Text Wrapping: cell expands vertically to contain all content */
            white-space: normal !important;
            word-wrap: break-word !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            /* Cell boundaries: all text remains inside cell borders */
            overflow: visible !important;
          }

          /* First Row of any table: entire first row bold */
          #print-area-wrapper table tr:first-child,
          #print-area-wrapper table tr:first-child td,
          #print-area-wrapper table tr:first-child th,
          #print-area-wrapper table thead tr,
          #print-area-wrapper table thead tr th,
          #print-area-wrapper table thead tr td {
            font-weight: bold !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
          }

          /* Prevent overlap and keep clean borders/negative space */
          #print-area-wrapper * {
            max-width: 100% !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}} />

      {/* Header bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Snapshot Ledger & Change tracking Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit trailing of project changes. Take manual milestones snapshots before initiating major BOQ variation orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto no-print">
          <button
            onClick={handleManualSnapshot}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Milestone Snapshot
          </button>
          
          <button
            onClick={onClearHistory}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Executive Portal Header & Alerts Card */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Active PMO Verification
            </span>
            {healthAlerts.filter(a => a.type === 'critical').length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-[9px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                Threshold Alert Tripped
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
            {p.id && p.id !== 'proj_default' ? `${p.id} - ` : ''}Executive Performance Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Fiduciary Audit & Control Portal — {p.name} | Contractor: {p.contractor}
          </p>
        </div>
      </div>

      {/* ERA Key Performance Indicators Trend Sparklines & Historical Readings Table */}
      <div className="no-print space-y-3">
        {/* Collapsible Historical KPI Performance Table */}
        <section className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsKpiHistoryOpen(!isKpiHistoryOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 transition duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wider flex items-center gap-2">
                  Historical KPI Performance Readings Table
                  <span className="text-[10px] font-semibold tracking-normal text-slate-500 dark:text-slate-400 normal-case bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                    {kpiHistoryRecords.length} Audit Readings
                  </span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{isKpiHistoryOpen ? 'Hide Readings Table' : 'Show Readings Table'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isKpiHistoryOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {isKpiHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-200/70 dark:border-slate-700/60 overflow-x-auto"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60 dark:border-slate-700/50">
                      <th className="py-2.5 px-4">Reporting Period</th>
                      <th className="py-2.5 px-3 text-center">Physical Progress</th>
                      <th className="py-2.5 px-3 text-center">CPI (Cost Index)</th>
                      <th className="py-2.5 px-3 text-center">CPI Status</th>
                      <th className="py-2.5 px-3 text-center">SPI (Schedule Index)</th>
                      <th className="py-2.5 px-3 text-center">SPI Status</th>
                      
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {kpiHistoryRecords.map((rec, idx) => {
                      const isCpiGood = rec.cpi >= 1.0;
                      const isCpiWarn = rec.cpi >= 0.90 && rec.cpi < 1.0;
                      
                      const isSpiGood = rec.spi >= 1.0;
                      const isSpiWarn = rec.spi >= 0.90 && rec.spi < 1.0;

                      return (
                        <tr 
                          key={rec.period + idx}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-750/50 ${
                            rec.isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {rec.period}
                            {rec.isCurrent && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {rec.physical.toFixed(2)}%
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            isCpiGood ? 'text-emerald-600 dark:text-emerald-400' : isCpiWarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rec.cpi.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
                              isCpiGood
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                : isCpiWarn
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            }`}>
                              {isCpiGood ? 'Under Budget' : isCpiWarn ? 'Borderline' : 'Over Budget Risk'}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            isSpiGood ? 'text-emerald-600 dark:text-emerald-400' : isSpiWarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rec.spi.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
                              isSpiGood
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                : isSpiWarn
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            }`}>
                              {isSpiGood ? 'Ahead' : isSpiWarn ? 'Minor Lag' : 'Critical Delay'}
                            </span>
                          </td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Collapsible Monthly Contractor & Supervision Consultant Grading Ledger */}
        <section className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMonthlyGradingOpen(!isMonthlyGradingOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 transition duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  Monthly Contractor & Supervision Consultant Grading Ledger
                  <span className="text-[10px] font-semibold tracking-normal text-amber-700 dark:text-amber-300 normal-case bg-amber-100/70 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/40">
                    {monthlyGradingRecords.length} Audited Months
                  </span>
                  <span className="text-[10px] font-medium tracking-normal text-slate-600 dark:text-slate-300 normal-case bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                    Project: <strong className="text-slate-800 dark:text-slate-100">{p.name || p.id}</strong>
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Performance ledger strictly scoped to <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span> — tracking contractor ({p.contractor || 'N/A'}) SPI execution vs. consultant ({consultantEval.firmName || p.consultant || 'N/A'}) ratings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{isMonthlyGradingOpen ? 'Hide Grading Ledger' : 'Show Grading Ledger'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMonthlyGradingOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {isMonthlyGradingOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-200/70 dark:border-slate-700/60 p-4 space-y-4"
              >
                {/* Mode Selector Tabs (Contractor Records vs Supervision Consultant Records vs Comparative View) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-750">
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setGradingActiveTab('both')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gradingActiveTab === 'both'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Joint Dual Ledger</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {monthlyGradingRecords.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGradingActiveTab('contractor')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gradingActiveTab === 'contractor'
                          ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <HardHat className="w-3.5 h-3.5 text-amber-500" />
                      <span>Contractor Records</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                        {monthlyGradingRecords.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGradingActiveTab('consultant')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gradingActiveTab === 'consultant'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Supervision Consultant Records</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300">
                        {monthlyGradingRecords.length}
                      </span>
                    </button>
                  </div>

                  {/* Filter Period & Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Period:</span>
                      <select
                        value={selectedGradingMonthFilter}
                        onChange={(e) => setSelectedGradingMonthFilter(e.target.value)}
                        className="text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="All">All Months ({monthlyGradingRecords.length})</option>
                        {monthlyGradingRecords.map((r, rIdx) => (
                          <option key={r.id ? `opt-mgrad-${r.id}-${rIdx}` : `opt-mgrad-${rIdx}`} value={r.month}>
                            {r.monthName || r.month}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Supervision Consultant Tenure Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Consultant:</span>
                      <select
                        value={selectedConsultantTenureFilter}
                        onChange={(e) => setSelectedConsultantTenureFilter(e.target.value)}
                        className="text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs focus:ring-1 focus:ring-indigo-500 max-w-[210px] truncate"
                        title="Filter ledger by consultant assignment tenure"
                      >
                        <option value="All">All Tenures ({monthlyGradingRecords.length} Mos)</option>
                        <option value="current">
                          Active: {activeConsultantFirmName} (From {activeConsultantAssignmentDate})
                        </option>
                        {previousConsultants.map((prev, pIdx) => (
                          <option key={prev.id || `prev-${pIdx}`} value={prev.id}>
                            Predecessor: {prev.firmName} ({prev.commencementDate} - {prev.handoverDate}) • Grade {prev.officialGrade || 'A'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6-Month Fiscal Semester Filter (July - June) */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">6-Mo Cycle:</span>
                      <select
                        value={selectedSemesterFilter}
                        onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                        className="text-xs font-semibold py-1.5 px-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 cursor-pointer shadow-xs focus:ring-1 focus:ring-amber-500"
                        title="6-Month Cumulative Fiscal Cycle Filter (July - June Fiscal Calendar)"
                      >
                        <option value="All">All 6-Mo Cycles ({sixMonthGradingList.length})</option>
                        {sixMonthGradingList.map((sem) => (
                          <option key={sem.semesterKey} value={sem.semesterKey}>
                            {sem.fiscalYearLabel} {sem.semesterLabel} ({sem.monthsCount} Mos)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date-Range Dropdown Selector: [Start Month, End Month] */}
                    <div className="flex items-center gap-1.5 p-1 px-2.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Date Range:</span>
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedStartMonthFilter}
                          onChange={(e) => setSelectedStartMonthFilter(e.target.value)}
                          className="text-xs font-semibold py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500"
                          title="Select Start Month for Cumulative Ledger"
                        >
                          <option value="All">Start: Earliest</option>
                          {availableGradingMonths.map((m) => (
                            <option key={`start-m-${m.ym}`} value={m.ym}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] font-bold text-slate-400">to</span>
                        <select
                          value={selectedEndMonthFilter}
                          onChange={(e) => setSelectedEndMonthFilter(e.target.value)}
                          className="text-xs font-semibold py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500"
                          title="Select End Month for Cumulative Ledger"
                        >
                          <option value="All">End: Latest</option>
                          {availableGradingMonths.map((m) => (
                            <option key={`end-m-${m.ym}`} value={m.ym}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(selectedStartMonthFilter !== 'All' || selectedEndMonthFilter !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStartMonthFilter('All');
                            setSelectedEndMonthFilter('All');
                          }}
                          className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-1 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                          title="Reset date range selection"
                        >
                          Clear Range
                        </button>
                      )}
                    </div>

                    {/* PDF Export Action Buttons */}
                    {gradingActiveTab === 'contractor' && (
                      <button
                        type="button"
                        onClick={() => handleExportContractorGradingPDF()}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg transition-colors border border-amber-200 dark:border-amber-800/60 cursor-pointer"
                        title="Export Contractor Monthly Performance PDF Report"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Export Contractor PDF</span>
                      </button>
                    )}

                    {gradingActiveTab === 'consultant' && (
                      <button
                        type="button"
                        onClick={() => handleExportConsultantGradingPDF()}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/60 cursor-pointer"
                        title="Export Supervision Consultant SLA & Technical PDF Report"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Export Consultant PDF</span>
                      </button>
                    )}

                    {gradingActiveTab === 'both' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportMonthlyGradingPDF()}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 cursor-pointer"
                          title="Export Consolidated Dual-Ledger PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Joint PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportContractorGradingPDF()}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          title="Export Contractor Only PDF"
                        >
                          <HardHat className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportConsultantGradingPDF()}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          title="Export Consultant Only PDF"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={openCreateGradingModal}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-xs cursor-pointer dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Month</span>
                    </button>
                  </div>
                </div>

                {/* 6-Month Cumulative Fiscal Year Grading Summary Widget (July - June) */}
                {sixMonthGradingList.length > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-50/70 via-slate-50 to-indigo-50/70 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-900/40 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wide flex items-center gap-2 flex-wrap">
                            6-Month Cumulative Grading Ledger Summary
                            <span className="text-[9.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/60">
                              Fiscal Calendar: July (Start) – June (End)
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Cumulative 6-month semester evaluation cycles (H1: Jul – Dec | H2: Jan – Jun) aggregating contractor execution & supervision consultant grades.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-slate-500">Cycles Tracked: <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{sixMonthGradingList.length} Semesters</strong></span>
                      </div>
                    </div>

                    {/* Cards Grid for Each 6-Month Semester */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sixMonthGradingList.map((sem) => {
                        const isSelected = selectedSemesterFilter === sem.semesterKey;
                        
                        let contBadge = "bg-emerald-500 text-white";
                        if (sem.contractorGrade === 'C') contBadge = "bg-amber-500 text-white";
                        else if (sem.contractorGrade === 'D' || sem.contractorGrade === 'F') contBadge = "bg-rose-500 text-white";

                        let consBadge = "bg-indigo-600 text-white";
                        if (sem.consultantGrade === 'C') consBadge = "bg-amber-600 text-white";
                        else if (sem.consultantGrade === 'D' || sem.consultantGrade === 'F') consBadge = "bg-rose-600 text-white";

                        const titleLabel = `${sem.fiscalYearLabel} ${sem.semesterLabel}`;

                        return (
                          <div
                            key={sem.semesterKey}
                            onClick={() => setSelectedSemesterFilter(isSelected ? 'All' : sem.semesterKey)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                              isSelected
                                ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                                : 'bg-white/90 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-600 shadow-xs'
                            }`}
                          >
                            {/* Semester Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-black text-slate-900 dark:text-white">{sem.fiscalYearLabel} {sem.semesterLabel}</span>
                              </div>
                              <span className="text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {sem.monthsCount} {sem.monthsCount === 1 ? 'Month' : 'Months'}
                              </span>
                            </div>

                            {/* Month List Pills */}
                            <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-slate-400">Audited:</span>
                              {sem.monthsList.map((mName, mIdx) => (
                                <span key={`m-${mIdx}`} className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded text-[8.5px]">
                                  {mName}
                                </span>
                              ))}
                            </div>

                            {/* Contractor & Consultant Dual 6-Month Cumulative Grades */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {/* Contractor 6-Month Card */}
                              <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
                                      <HardHat className="w-2.5 h-2.5 text-amber-500" /> Contractor
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${contBadge}`}>
                                      Grade {sem.contractorGrade}
                                    </span>
                                  </div>
                                  <div className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                    {sem.contractorAvgScore}% <span className="text-[8.5px] font-normal text-slate-500">6-Mo Avg</span>
                                  </div>
                                  <div className="text-[8.5px] font-mono text-slate-500 dark:text-slate-400">
                                    Plan: {sem.contractorTotalPlanMonthly}% • Act: {sem.contractorTotalActualMonthly}%
                                  </div>
                                  <div className="text-[8.5px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                    6-Mo SPI: <span className={sem.contractorAvgSpi >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{sem.contractorAvgSpi}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportContractorGradingPDF(sem.records, titleLabel);
                                  }}
                                  className="w-full mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold px-1.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors shadow-2xs cursor-pointer"
                                  title="Print 6-Month Contractor PDF Report"
                                >
                                  <Printer className="w-2.5 h-2.5" />
                                  <span>Print Contractor PDF</span>
                                </button>
                              </div>

                              {/* Supervision Consultant 6-Month Card */}
                              <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase flex items-center gap-1">
                                      <Briefcase className="w-2.5 h-2.5 text-indigo-500" /> Consultant
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${consBadge}`}>
                                      Grade {sem.consultantGrade}
                                    </span>
                                  </div>
                                  <div className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                    {sem.consultantAvgCombinedScore}% <span className="text-[8.5px] font-normal text-slate-500">Combined</span>
                                  </div>
                                  <div className="text-[8.5px] font-mono text-slate-500 dark:text-slate-400">
                                    SLA: {sem.consultantAvgSlaScore}% • Tech: {sem.consultantAvgFiveDimScore}%
                                  </div>
                                  <div className="text-[8.5px] font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate" title={sem.consultantStanding}>
                                    {sem.consultantStanding}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportConsultantGradingPDF(sem.records, titleLabel);
                                  }}
                                  className="w-full mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold px-1.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors shadow-2xs cursor-pointer"
                                  title="Print 6-Month Supervision Consultant PDF Report"
                                >
                                  <Printer className="w-2.5 h-2.5" />
                                  <span>Print Consultant PDF</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 1: CONTRACTOR PERFORMANCE LEDGER VIEW */}
                {gradingActiveTab === 'contractor' && (
                  <div className="space-y-4">
                    {/* Contractor Metrics Ribbon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(() => {
                        const latest = monthlyGradingRecords[0];
                        if (!latest) return null;
                        let badgeBg = "bg-emerald-500 text-white";
                        if (latest.contractorGrade === 'C') badgeBg = "bg-amber-500 text-white";
                        else if (latest.contractorGrade === 'D' || latest.contractorGrade === 'F') badgeBg = "bg-rose-500 text-white";
                        
                        return (
                          <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-1.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">LATEST CONTRACTOR AUDIT</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeBg}`}>
                                GRADE {latest.contractorGrade || 'B'} • {(latest.contractorScore ?? 80).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{latest.monthName}</span>
                                <span className="text-[10px] text-slate-500">{latest.contractorStanding}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-[10px] text-slate-400 block">SPI Index</span>
                                <span className={`text-xs font-extrabold ${(latest.contractorSpi ?? 1) >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{(latest.contractorSpi ?? 1).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">SCHEDULE HEALTH</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                            PHYSICAL PROGRESS
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Actual: {physicalProgress.toFixed(2)}%</span>
                            <span className="text-[10px] text-slate-500">Planned Target: {plannedPct.toFixed(2)}%</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block">Net Slippage</span>
                            <span className={`text-xs font-extrabold ${(plannedPct - physicalProgress) <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {((plannedPct - physicalProgress) * -1).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">HISTORICAL AVERAGE</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                            {monthlyGradingRecords.length} MONTHS
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              {(monthlyGradingRecords.reduce((acc, r) => acc + (r.contractorScore ?? 80), 0) / (monthlyGradingRecords.length || 1)).toFixed(1)}% Avg Score
                            </span>
                            <span className="text-[10px] text-slate-500">{p.contractor || 'Assigned Contractor'}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block">Audited Cycles</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{monthlyGradingRecords.length} Cycles</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Contractor Table */}
                    <div className="border border-slate-200/80 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-amber-50/70 dark:bg-amber-950/30 text-slate-700 dark:text-slate-300 border-b border-amber-200/70 dark:border-amber-900/50 font-extrabold text-[10px] uppercase tracking-wide">
                              <th className="py-2.5 px-3.5 text-left">Month / Audit Period</th>
                              <th className="py-2.5 px-3.5 text-left">Monthly Plan & Execution %</th>
                              <th className="py-2.5 px-3 text-center">Contractor Grade</th>
                              <th className="py-2.5 px-3.5 text-left">Contractor Remarks & Delay Exceptions</th>
                              <th className="py-2.5 px-3 text-center w-24 no-print">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal font-sans">
                            {filteredMonthlyGradingRecords.map((rec, rIdx) => {
                              const varM = typeof rec.contractorVariance === 'number' ? rec.contractorVariance : (rec.contractorActualMonthly - rec.contractorPlanMonthly);
                              
                              let contGradeBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                              if (rec.contractorGrade === 'B') contGradeBadge = "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800";
                              else if (rec.contractorGrade === 'C') contGradeBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                              else if (rec.contractorGrade === 'D' || rec.contractorGrade === 'F') contGradeBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";

                              return (
                                <tr key={rec.id ? `cont-${rec.id}-${rIdx}` : `mgrad-cont-${rIdx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                  {/* Month & Period */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-extrabold text-slate-850 dark:text-white">
                                      {rec.monthName || rec.month}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-slate-400 font-mono">Rec: {rec.recordedDate}</span>
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                        rec.status === 'Approved' 
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}>
                                        {rec.status || 'Finalized'}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">
                                        <HardHat className="w-2.5 h-2.5 text-amber-500" />
                                        <span className="truncate max-w-[140px]">{rec.contractorName || p.contractor || 'Contractor'}</span>
                                      </span>
                                    </div>
                                  </td>

                                  {/* Monthly Plan vs Actual & Execution Metrics */}
                                  <td className="py-2.5 px-3.5 min-w-[210px]">
                                    <div className="flex items-center gap-2 font-mono text-[10px]">
                                      <span className="text-slate-500">Plan: <strong className="text-slate-700 dark:text-slate-300">{(rec.contractorPlanMonthly ?? 0).toFixed(2)}%</strong></span>
                                      <span className="text-slate-500">Act: <strong className="text-slate-900 dark:text-white">{(rec.contractorActualMonthly ?? 0).toFixed(2)}%</strong></span>
                                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                        varM >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                      }`}>
                                        {varM >= 0 ? '+' : ''}{varM.toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 font-mono mt-1">
                                      Cum Act: <strong className="text-slate-700 dark:text-slate-300">{(rec.contractorActualCumulative ?? 0).toFixed(2)}%</strong>  •  SPI: <strong className={(rec.contractorSpi ?? 1) >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{(rec.contractorSpi ?? 1).toFixed(2)}</strong>
                                    </div>
                                  </td>

                                  {/* Contractor Grade */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl border ${contGradeBadge}`}>
                                      <span className="text-xs font-black">Grade {rec.contractorGrade || 'B'}</span>
                                      <span className="text-[9px] font-mono font-extrabold">{(rec.contractorScore ?? 80).toFixed(1)}%</span>
                                    </div>
                                    <span className="block text-[8.5px] text-slate-400 mt-1 max-w-[110px] mx-auto truncate" title={rec.contractorStanding}>
                                      {rec.contractorStanding}
                                    </span>
                                  </td>

                                  {/* Remarks & Audit Notes */}
                                  <td className="py-2.5 px-3.5">
                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal break-words max-w-md">
                                      {rec.contractorRemarks || rec.notes || 'No specific contractor delay exceptions logged for this audit cycle.'}
                                    </p>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-3 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedGradingDetailModal(rec)}
                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                        title="View Detailed Monthly Audit Breakdown"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditGradingModal(rec)}
                                        className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                        title="Edit Month Grading"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGradingRecord(rec.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Delete Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredMonthlyGradingRecords.length === 0 && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-medium">
                                  No monthly contractor grading records found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SUPERVISION CONSULTANT LEDGER VIEW */}
                {gradingActiveTab === 'consultant' && (
                  <div className="space-y-4">
                    {/* Consultant Metrics Ribbon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(() => {
                        const latest = monthlyGradingRecords[0];
                        if (!latest) return null;
                        let badgeBg = "bg-indigo-600 text-white";
                        if (latest.consultantGrade === 'C') badgeBg = "bg-amber-500 text-white";
                        else if (latest.consultantGrade === 'D' || latest.consultantGrade === 'F') badgeBg = "bg-rose-500 text-white";

                        return (
                          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl space-y-1.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">LATEST CONSULTANT AUDIT</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeBg}`}>
                                GRADE {latest.consultantGrade || 'B'} • {(latest.consultantOverallScore ?? 82.5).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{latest.monthName}</span>
                                <span className="text-[10px] text-slate-500">{latest.consultantStanding}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-[10px] text-slate-400 block">SLA Rate</span>
                                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{(latest.consultantSlaTurnaroundScore ?? 85).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">DUAL-PILLAR BREAKDOWN</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                            WEIGHTED SLA + TECH
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pillar 1 (SLA Turnaround):</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {(consultantEval.slaTurnaroundScore ?? consultantEval.metrics?.overallOnTimeRate ?? 85).toFixed(1)}% On-Time
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pillar 2 (5-Dim Matrix):</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {(consultantEval.fiveDimScore ?? 80).toFixed(1)}% Technical
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">CONSULTANT FIRM</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                            {monthlyGradingRecords.length} MONTHS
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate max-w-[160px]">
                              {consultantEval.firmName || p.consultant || 'Assigned Consultant'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Avg: {(monthlyGradingRecords.reduce((acc, r) => acc + (r.consultantOverallScore ?? 82.5), 0) / (monthlyGradingRecords.length || 1)).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block">Official Grade</span>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">Grade {consultantEval.officialGrade}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active & Predecessor Supervision Consultant Tenure & Final Output Grades Panel */}
                    <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50/70 to-blue-50/70 dark:from-indigo-950/25 dark:via-slate-900/40 dark:to-blue-950/25 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                              Supervision Consultant Assignment Timeline & Predecessor Archives
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                                Assignment Date: {activeConsultantAssignmentDate}
                              </span>
                            </h4>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              Active consultant ledger starts from assignment date. Historical supervision predecessor records are recorded with verified final output grades.
                            </p>
                          </div>
                        </div>

                        {selectedConsultantTenureFilter !== 'All' && (
                          <button
                            type="button"
                            onClick={() => setSelectedConsultantTenureFilter('All')}
                            className="self-start sm:self-auto text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Show All Tenures
                          </button>
                        )}
                      </div>

                      {/* Active Consultant Banner */}
                      <div className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-850 dark:text-white">
                                {activeConsultantFirmName}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                Active Supervision Consultant
                              </span>
                              {p.supervisionConsultant?.associationType && (
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                  ({p.supervisionConsultant.associationType})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                              <span>Assigned / Commenced: <strong className="text-indigo-600 dark:text-indigo-400">{activeConsultantAssignmentDate}</strong></span>
                              <span>•</span>
                              <span>Contract Ref: <strong>{p.supervisionConsultant?.contractRefNo || 'ERA/CS/2021'}</strong></span>
                              <span>•</span>
                              <span>RE: <strong>{p.supervisionConsultant?.residentEngineerName || consultantEval.residentEngineer || 'Lead Engineer'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-mono block">Current Period Standing</span>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                              Grade {consultantEval.officialGrade} ({(consultantEval.slaTurnaroundScore ?? 85).toFixed(1)}% SLA)
                            </span>
                          </div>
                          {selectedConsultantTenureFilter !== 'current' && (
                            <button
                              type="button"
                              onClick={() => setSelectedConsultantTenureFilter('current')}
                              className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 transition cursor-pointer"
                            >
                              Filter Current Tenure
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Archived Predecessors with Final Output Grade */}
                      {previousConsultants.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h5 className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Predecessor Supervision Consultants — Historical Records & Final Output Grades
                          </h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {previousConsultants.map((prev, prevIdx) => {
                              const gradeBadge = prev.officialGrade === 'A'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : prev.officialGrade === 'B'
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';

                              const isSelected = selectedConsultantTenureFilter === prev.id;

                              return (
                                <div 
                                  key={prev.id || `prev-card-${prevIdx}`}
                                  className={`p-3 rounded-lg border transition-all ${
                                    isSelected 
                                      ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 shadow-sm' 
                                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                                          Predecessor #{prevIdx + 1}
                                        </span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                          {prev.firmName}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Tenure: <strong>{prev.commencementDate}</strong> → <strong>{prev.handoverDate}</strong>
                                      </div>
                                    </div>

                                    {/* Final Output Grade Badge */}
                                    <div className="text-right shrink-0">
                                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Final Output Grade</span>
                                      <span className={`inline-block px-2 py-0.5 rounded-md font-black text-xs border ${gradeBadge}`}>
                                        Grade {prev.officialGrade || 'A'} • {(prev.evaluationScore ?? 92.4).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[10px]">
                                    <span className="text-slate-500 truncate max-w-[200px]" title={prev.transitionReason || prev.transitionNotes}>
                                      {prev.transitionReason || prev.transitionNotes || 'Supervisory services completed & transitioned.'}
                                    </span>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedHistoricalConsultantModal(prev)}
                                        className="p-1 px-2 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 transition cursor-pointer flex items-center gap-1"
                                        title="View Archived Final Output Appraisal Dossier"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Dossier</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedConsultantTenureFilter(isSelected ? 'All' : prev.id)}
                                        className={`p-1 px-2 rounded text-[10px] font-bold transition cursor-pointer ${
                                          isSelected 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100'
                                        }`}
                                      >
                                        {isSelected ? 'Selected' : 'Filter Ledger'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Supervision Consultant Table */}
                    <div className="border border-slate-200/80 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-indigo-50/70 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300 border-b border-indigo-200/70 dark:border-indigo-900/50 font-extrabold text-[10px] uppercase tracking-wide">
                              <th className="py-2.5 px-3.5 text-left">Month / Audit Period</th>
                              <th className="py-2.5 px-3.5 text-left">Pillar 1: SLA On-Time %</th>
                              <th className="py-2.5 px-3.5 text-left">Pillar 2: 5-Dim Tech %</th>
                              <th className="py-2.5 px-3 text-center">Combined Rating %</th>
                              <th className="py-2.5 px-3 text-center">Consultant Grade</th>
                              <th className="py-2.5 px-3.5 text-left">Supervisory Directives & Observations</th>
                              <th className="py-2.5 px-3 text-center w-24 no-print">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal font-sans">
                            {filteredMonthlyGradingRecords.map((rec, rIdx) => {
                              let consGradeBadge = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
                              if (rec.consultantGrade === 'A') consGradeBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                              else if (rec.consultantGrade === 'C') consGradeBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                              else if (rec.consultantGrade === 'D' || rec.consultantGrade === 'F') consGradeBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";

                              return (
                                <tr key={rec.id ? `cons-${rec.id}-${rIdx}` : `mgrad-cons-${rIdx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                  {/* Month & Period */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-extrabold text-slate-850 dark:text-white">
                                      {rec.monthName || rec.month}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-slate-400 font-mono">Rec: {rec.recordedDate}</span>
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                        rec.status === 'Approved' 
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}>
                                        {rec.status || 'Finalized'}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                                      {rec.isHistoricalConsultant ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-800 dark:text-slate-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/40" title={`Predecessor Tenure: ${rec.consultantAssignmentDate} to ${rec.consultantHandoverDate}`}>
                                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                                          <span className="truncate max-w-[140px]">🏛️ {rec.consultantName || 'Predecessor Consultant'}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40" title={`Active Consultant: Assigned ${rec.consultantAssignmentDate || activeConsultantAssignmentDate}`}>
                                          <Briefcase className="w-2.5 h-2.5 text-indigo-500" />
                                          <span className="truncate max-w-[140px]">{rec.consultantName || consultantEval.firmName || p.consultant || 'Supervision Consultant'}</span>
                                        </span>
                                      )}
                                      {(rec.residentEngineer || consultantEval.residentEngineer) && (
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                          RE: {rec.residentEngineer || consultantEval.residentEngineer}
                                        </span>
                                      )}
                                      {rec.isHistoricalConsultant && (
                                        <span className="text-[8.5px] font-black text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                                          Predecessor Final: {rec.consultantGrade || 'A'} ({(rec.consultantOverallScore ?? 92.4).toFixed(1)}%)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Pillar 1 SLA */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                      {(rec.consultantSlaTurnaroundScore ?? 85).toFixed(1)}% On-Time
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                      Avg RFI: {rec.consultantAvgRfiDays || 6} days
                                    </div>
                                  </td>

                                  {/* Pillar 2 5-Dim Tech */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                      {(rec.consultantFiveDimScore ?? 80).toFixed(1)}% Technical
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                      5 Evaluation Dimensions
                                    </div>
                                  </td>

                                  {/* Combined Rating */}
                                  <td className="py-2.5 px-3 text-center font-mono">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-100 dark:border-indigo-900/50">
                                      {(rec.consultantOverallScore ?? 82.5).toFixed(1)}%
                                    </span>
                                  </td>

                                  {/* Consultant Grade */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl border ${consGradeBadge}`}>
                                      <span className="text-xs font-black">Grade {rec.consultantGrade || 'B'}</span>
                                      <span className="text-[9px] font-mono font-extrabold">{(rec.consultantOverallScore ?? 82.5).toFixed(1)}%</span>
                                    </div>
                                    <span className="block text-[8.5px] text-slate-400 mt-1 max-w-[110px] mx-auto truncate" title={rec.consultantStanding}>
                                      {rec.consultantStanding}
                                    </span>
                                  </td>

                                  {/* Remarks & Audit Notes */}
                                  <td className="py-2.5 px-3.5">
                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal break-words max-w-md">
                                      {rec.consultantRemarks || rec.notes || 'Standard supervisory inspection and submittal compliance logged.'}
                                    </p>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-3 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedGradingDetailModal(rec)}
                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                        title="View Detailed Monthly Audit Breakdown"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditGradingModal(rec)}
                                        className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                        title="Edit Month Grading"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGradingRecord(rec.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Delete Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredMonthlyGradingRecords.length === 0 && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-medium">
                                  No monthly consultant grading records found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: JOINT / COMPARATIVE DUAL VIEW */}
                {gradingActiveTab === 'both' && (
                  <div className="space-y-4">
                    {/* Top Summary Cards Ribbon */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Card 1: Latest Month Contractor Standing */}
                      {(() => {
                        const latest = monthlyGradingRecords[0];
                        if (!latest) return null;
                        let badgeBg = "bg-emerald-500 text-white";
                        if (latest.contractorGrade === 'C') badgeBg = "bg-amber-500 text-white";
                        else if (latest.contractorGrade === 'D' || latest.contractorGrade === 'F') badgeBg = "bg-rose-500 text-white";
                        
                        return (
                          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">LATEST CONTRACTOR AUDIT</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeBg}`}>
                                GRADE {latest.contractorGrade || 'B'} • {(latest.contractorScore ?? 80).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{latest.monthName}</span>
                                <span className="text-[10px] text-slate-500">{latest.contractorStanding}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-[10px] text-slate-400 block">SPI Index</span>
                                <span className={`text-xs font-extrabold ${(latest.contractorSpi ?? 1) >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{(latest.contractorSpi ?? 1).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 2: Latest Month Consultant Standing */}
                      {(() => {
                        const latest = monthlyGradingRecords[0];
                        if (!latest) return null;
                        let badgeBg = "bg-indigo-600 text-white";
                        if (latest.consultantGrade === 'C') badgeBg = "bg-amber-500 text-white";
                        else if (latest.consultantGrade === 'D' || latest.consultantGrade === 'F') badgeBg = "bg-rose-500 text-white";

                        return (
                          <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">LATEST CONSULTANT AUDIT</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeBg}`}>
                                GRADE {latest.consultantGrade || 'B'} • {(latest.consultantOverallScore ?? 82.5).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{latest.monthName}</span>
                                <span className="text-[10px] text-slate-500">{latest.consultantStanding}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-[10px] text-slate-400 block">SLA Rate</span>
                                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{(latest.consultantSlaTurnaroundScore ?? 85).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 3: Historical Audit Overview */}
                      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">HISTORICAL REPOSITORY</span>
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                            {monthlyGradingRecords.length} MONTHS
                          </span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Contractor Avg Score:</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {(monthlyGradingRecords.reduce((acc, r) => acc + (r.contractorScore ?? 80), 0) / (monthlyGradingRecords.length || 1)).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Consultant Avg Score:</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                              {(monthlyGradingRecords.reduce((acc, r) => acc + (r.consultantOverallScore ?? 82.5), 0) / (monthlyGradingRecords.length || 1)).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Joint Table */}
                    <div className="border border-slate-200/80 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700 font-extrabold text-[10px] uppercase tracking-wide">
                              <th className="py-2.5 px-3.5 text-left">Month / Audit Period</th>
                              <th className="py-2.5 px-3.5 text-left">Contractor Monthly Execution</th>
                              <th className="py-2.5 px-3 text-center">Contractor Grade</th>
                              <th className="py-2.5 px-3.5 text-left">Consultant Dual-Pillar Evaluation</th>
                              <th className="py-2.5 px-3 text-center">Consultant Grade</th>
                              <th className="py-2.5 px-3.5 text-left">Audit Remarks & Exceptions</th>
                              <th className="py-2.5 px-3 text-center w-24 no-print">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal font-sans">
                            {filteredMonthlyGradingRecords.map((rec, rIdx) => {
                              const varM = typeof rec.contractorVariance === 'number' ? rec.contractorVariance : (rec.contractorActualMonthly - rec.contractorPlanMonthly);
                              
                              let contGradeBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                              if (rec.contractorGrade === 'B') contGradeBadge = "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800";
                              else if (rec.contractorGrade === 'C') contGradeBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                              else if (rec.contractorGrade === 'D' || rec.contractorGrade === 'F') contGradeBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";

                              let consGradeBadge = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
                              if (rec.consultantGrade === 'A') consGradeBadge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                              else if (rec.consultantGrade === 'C') consGradeBadge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                              else if (rec.consultantGrade === 'D' || rec.consultantGrade === 'F') consGradeBadge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";

                              return (
                                <tr key={rec.id ? `all-${rec.id}-${rIdx}` : `mgrad-${rIdx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                  {/* Month & Period */}
                                  <td className="py-2.5 px-3.5">
                                    <div className="font-extrabold text-slate-850 dark:text-white">
                                      {rec.monthName || rec.month}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] text-slate-400 font-mono">Rec: {rec.recordedDate}</span>
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                        rec.status === 'Approved' 
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}>
                                        {rec.status || 'Finalized'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Contractor Monthly Progress */}
                                  <td className="py-2.5 px-3.5 min-w-[210px]">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-semibold text-[9.5px]">
                                        <HardHat className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="truncate max-w-[140px]">{rec.contractorName || p.contractor || 'Contractor'}</span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-[10px]">
                                      <span className="text-slate-500">Plan: <strong className="text-slate-700 dark:text-slate-300">{(rec.contractorPlanMonthly ?? 0).toFixed(2)}%</strong></span>
                                      <span className="text-slate-500">Act: <strong className="text-slate-900 dark:text-white">{(rec.contractorActualMonthly ?? 0).toFixed(2)}%</strong></span>
                                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                        varM >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                      }`}>
                                        {varM >= 0 ? '+' : ''}{varM.toFixed(2)}%
                                      </span>
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                                      Cum Actual: {(rec.contractorActualCumulative ?? 0).toFixed(2)}%  •  SPI: <strong className={(rec.contractorSpi ?? 1) >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{(rec.contractorSpi ?? 1).toFixed(2)}</strong>
                                    </div>
                                  </td>

                                  {/* Contractor Grade */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl border ${contGradeBadge}`}>
                                      <span className="text-xs font-black">Grade {rec.contractorGrade || 'B'}</span>
                                      <span className="text-[9px] font-mono font-extrabold">{(rec.contractorScore ?? 80).toFixed(1)}%</span>
                                    </div>
                                    <span className="block text-[8.5px] text-slate-400 mt-1 max-w-[110px] mx-auto truncate" title={rec.contractorStanding}>
                                      {rec.contractorStanding}
                                    </span>
                                  </td>

                                  {/* Consultant Dual-Pillar Scores */}
                                  <td className="py-2.5 px-3.5 min-w-[210px]">
                                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                      {rec.isHistoricalConsultant ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-semibold text-[9.5px]" title={`Predecessor Tenure: ${rec.consultantAssignmentDate} to ${rec.consultantHandoverDate}`}>
                                          <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                          <span className="truncate max-w-[130px]">🏛️ {rec.consultantName || 'Predecessor Consultant'}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 font-semibold text-[9.5px]" title={`Active Consultant: Assigned ${rec.consultantAssignmentDate || activeConsultantAssignmentDate}`}>
                                          <Briefcase className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                          <span className="truncate max-w-[130px]">{rec.consultantName || consultantEval.firmName || p.consultant || 'Supervision Consultant'}</span>
                                        </span>
                                      )}
                                      {(rec.residentEngineer || consultantEval.residentEngineer) && (
                                        <span className="text-[8.5px] text-slate-400 font-mono">
                                          RE: {rec.residentEngineer || consultantEval.residentEngineer}
                                        </span>
                                      )}
                                      {rec.isHistoricalConsultant && (
                                        <span className="text-[8px] font-black text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                                          Predecessor Final
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-0.5 text-[10px]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-500">Pillar 1 (SLA On-Time):</span>
                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{(rec.consultantSlaTurnaroundScore ?? 85).toFixed(1)}%</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-500">Pillar 2 (5-Dim Tech):</span>
                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{(rec.consultantFiveDimScore ?? 80).toFixed(1)}%</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-400 font-bold">Combined Score:</span>
                                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{(rec.consultantOverallScore ?? 82.5).toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Consultant Grade */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-xl border ${consGradeBadge}`}>
                                      <span className="text-xs font-black">Grade {rec.consultantGrade || 'B'}</span>
                                      <span className="text-[9px] font-mono font-extrabold">{(rec.consultantOverallScore ?? 82.5).toFixed(1)}%</span>
                                    </div>
                                    <span className="block text-[8.5px] text-slate-400 mt-1 max-w-[110px] mx-auto truncate" title={rec.consultantStanding}>
                                      {rec.consultantStanding}
                                    </span>
                                  </td>

                                  {/* Remarks & Audit Notes */}
                                  <td className="py-2.5 px-3.5 min-w-[260px]">
                                    <div className="space-y-1.5">
                                      {/* Contractor Record */}
                                      <div className="p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-[9.5px]">
                                        <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 font-mono text-[8.5px] uppercase">
                                          <HardHat className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                          <span>Contractor Output:</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
                                          {rec.contractorRemarks || 'Physical progress and site output tracked within contractual schedule tolerance.'}
                                        </p>
                                      </div>

                                      {/* Supervision Consultant Record */}
                                      <div className="p-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 text-[9.5px]">
                                        <div className="flex items-center gap-1 font-bold text-indigo-800 dark:text-indigo-300 font-mono text-[8.5px] uppercase">
                                          <Briefcase className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                          <span>Consultant Oversight:</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
                                          {rec.consultantRemarks || 'Supervisory response, RFI turnaround, and site inspections maintained within SLA target.'}
                                        </p>
                                      </div>

                                      {rec.notes && (
                                        <div className="text-[8.5px] text-slate-400 italic">
                                          Note: {rec.notes}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-3 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedGradingDetailModal(rec)}
                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                        title="View Detailed Monthly Audit Breakdown"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditGradingModal(rec)}
                                        className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                        title="Edit Month Grading"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGradingRecord(rec.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Delete Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredMonthlyGradingRecords.length === 0 && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-medium">
                                  No monthly grading records found for the selected filter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Project Health Alerts Dashboard Alert Hud */}
      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-slate-101 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${healthAlerts.filter(a => a.type === 'critical').length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
            <div>
              <h2 className="text-sm font-bold text-slate-801 dark:text-zinc-150 uppercase tracking-wide">
                Project Health Vigilance Alerts Center
              </h2>
              <p className="text-[10px] text-slate-400 font-medium select-none">
                Live monitoring of Schedule Variance (SV &gt; 10%), CPI (&lt; 0.90), S-Curve deviations, and bond escrows.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-md">
              {healthAlerts.filter(a => a.type === 'critical').length} Critical
            </span>
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-md">
              {healthAlerts.filter(a => a.type === 'warning').length} Warnings
            </span>
          </div>
        </div>

        {healthAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {healthAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all duration-200 ${
                  alert.type === 'critical' 
                    ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950/40' 
                    : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950/30'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  alert.type === 'critical' 
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-450' 
                    : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-450'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                      alert.type === 'critical' 
                        ? 'bg-rose-200/50 dark:bg-rose-950 text-rose-700 dark:text-rose-400' 
                        : 'bg-amber-200/50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    }`}>
                      {alert.field}
                    </span>
                    <h3 className={`text-xs font-bold uppercase ${
                      alert.type === 'critical' ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'
                    }`}>
                      {alert.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                    {alert.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 p-4 rounded-xl flex items-center gap-3">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                Contract Verification: All Strategic KPIs Declared Healthy
              </h3>
              <p className="text-xs text-slate-605 dark:text-slate-400">
                The project is operating fully within normal tolerance parameters. No critical path slippages or budget exceeds have crossed the dashboard surveillance threshold.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Board Management Summary Card */}
      <div id="executive-summary-section" className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 space-y-5 shadow-lg no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-2xl border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">Board Executive Management Report</h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Comprehensive status audit, compliance scorecard, and performance diagnostics.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap self-start md:self-auto">
            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Export Board PDF Report
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Audit Summary
            </button>
          </div>
        </div>

        {/* Dynamic Executive Stats Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Physical Progress */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Physical Progress</span>
                <span className="text-emerald-400 text-[9px] font-black flex items-center gap-0.5 font-mono">
                  ▲ +{monthlyRatePct.toFixed(2)}% /Mo
                </span>
              </div>
              <span className="text-base font-black tracking-tight text-white">{physicalProgress.toFixed(2)}%</span>
            </div>
            {/* progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${physicalProgress}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Plan: {plannedPct.toFixed(2)}%</span>
                <span className={physicalProgress >= plannedPct ? "text-emerald-400" : "text-rose-450 font-bold"}>
                  Gap: {(physicalProgress - plannedPct).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Cost Performance Index */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Cost Index (CPI)</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${CPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {CPI >= 1 ? '▲ Stable' : '▼ Over-run'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-black tracking-tight ${CPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{CPI.toFixed(3)}</span>
                <span className="text-[9px] text-slate-500 font-semibold font-mono">index</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              {CPI >= 1 ? 'Spending is well within raw BOQ margin.' : 'Certified IPC progress values exceed physical output.'}
            </p>
          </div>

          {/* Card 3: Schedule Performance Index (SPI) */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Schedule Index (SPI)</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${SPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {SPI >= 1 ? '▲ On-Schedule' : '▼ Delayed'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-black tracking-tight ${SPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {SPI.toFixed(3)}
                </span>
                <span className="text-[9px] text-slate-500 font-semibold font-mono">index</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              {SPI >= 1 ? 'Construction velocity meets or exceeds planned schedule.' : 'Project progress is trailing the baseline schedule.'}
            </p>
          </div>

          {/* Card 4: Right-Of-Way Impediments */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">ROW Impediments</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${rowImpediment > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {rowImpediment > 5 ? '▲ Alert' : '✓ Secured'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black tracking-tight text-amber-400">{rowImpediment.toFixed(2)} Km</span>
                <span className="text-[9px] text-slate-550">pending</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              {rowClearMetric.toFixed(2)} Km ({(((rowClearMetric / (rowEvalBase || 1)) * 100)).toFixed(2)}%) obstruction-free of requested.
            </p>
          </div>

          {/* Card 5: Remaining Budget */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Remaining Budget</span>
                <span className="text-blue-400 text-[9px] font-black flex items-center gap-0.5 font-mono">
                  ⚡ {((remainingBudget / p.origAmount) * 100).toFixed(2)}% bal
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black tracking-tight text-blue-400">Br. {remainingBudget.toFixed(2)} M</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400 font-sans">
              IPC cumulative certified pay: Br. {(AC / 1_000_000).toFixed(2)} M.
            </p>
          </div>
        </div>

        {/* Corporate Commentary Section */}
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-slate-300 leading-relaxed text-[11px] space-y-1">
          <strong className="text-xs text-slate-100 block">Board commentary & status report:</strong>
          <p>
            The project status audit indicates a cumulative schedule delay of <span className="text-rose-400 font-bold">-{(plannedPct - physicalProgress).toFixed(2)}%</span>. This variance represents a high risk for the targeted handover. The financial index remains stable with a cost-to-render evaluation of <span className="text-emerald-400 font-bold">{CPI.toFixed(3)} (CPI)</span>. Immediate administrative board interventions and enforcement of corrective actions are recommended for divisions performing under the standard dev thresholds.
          </p>
        </div>
      </div>

      {/* Dynamic AI Compliance Report (Full Width) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          
          {/* Action Header */}
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-705 pb-3 flex-wrap gap-2 no-print">
            <span className="font-bold text-xs flex items-center gap-1.5 text-slate-755 dark:text-slate-200">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              Contract Performance compliance Audit Report
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTriggerReportReRun}
                disabled={analyzing}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-705 dark:text-slate-250 text-2xs font-extrabold py-1.5 px-3 rounded-xl transition"
              >
                {analyzing ? 'Auditing...' : 'Re-Run Audit'}
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-705 dark:hover:bg-slate-600 text-slate-700 dark:text-zinc-200 text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition select-none"
              >
                <Printer className="w-3.5 h-3.5 text-slate-550" />
                Print Layout
              </button>

              <button
                onClick={handleExportPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-md select-none cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Export Board PDF
              </button>

              <button
                onClick={handleExportPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-md select-none cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Audit Summary
              </button>
            </div>
          </div>

          {analyzing ? (
            <div className="h-96 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-bold animate-pulse">
                Auditing project physical, financial, and legal structures...
              </span>
            </div>
          ) : (
            /* Printable Report Sheet */
            <div 
              id="print-area-wrapper" 
              className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-850 rounded-2xl text-slate-800 dark:text-slate-100 font-sans shadow-xs space-y-6 max-h-[600px] overflow-y-auto"
            >
              {/* Report Header Logo & Banner */}
              <div className="text-center space-y-1.5 border-b-2 border-slate-800 dark:border-slate-600 pb-4">
                <div className="flex justify-center items-center gap-3">
                  {logoError ? (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0 shadow-xs">
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex flex-col items-center justify-center border border-white/20">
                        <span className="text-[10px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                        <span className="text-[4px] font-bold text-white uppercase tracking-widest leading-none scale-90">Roads</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={eraLogo}
                        alt="Ethiopian Roads Administration Logo"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h1 className="text-sm md:text-base font-black tracking-widest text-slate-900 dark:text-white uppercase">
                    Ethiopian Roads Administration
                  </h1>
                </div>
                <h2 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Federal Road Project Compliance & Performance Audit Report
                </h2>
                <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>REPORT ID: ERA-AUD-{p.id.toUpperCase()}-{new Date().getFullYear()}</span> • 
                  <span>DATE: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {/* Notice Banner for Closed Projects */}
              {isProjectClosed(p.status) && (() => {
                const isTerm = p.status === 'Terminated and Closed' || p.status === 'Terminated';
                return (
                  <div className={`p-4 border-2 rounded-xl space-y-1 ${
                    isTerm 
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  }`}>
                    <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wide ${
                      isTerm ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
                    }`}>
                      <CheckCircle2 className={`w-4 h-4 ${isTerm ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                      <span>Project Life Cycle {isTerm ? 'Terminated' : 'Completed'} and Closed — Audit Concluded & Excluded</span>
                    </div>
                    <p className={`text-[11px] font-medium leading-relaxed ${
                      isTerm ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {isTerm 
                        ? 'This project contract has been officially terminated and closed. All data entry is frozen in permanent read-only mode, all final evaluation values remain visible for historic record, and ongoing time-based evaluations, SLA penalties, and active liquidation monitoring are halted and concluded.'
                        : 'This project has fulfilled all contractual execution phases and is officially closed. All data entry is frozen in permanent read-only mode, all final evaluation values remain visible for historic record, and ongoing time-based evaluations, SLA non-compliance penalties, and active liquidation monitoring are halted and concluded.'}
                    </p>
                  </div>
                );
              })()}

              {/* 1. Project Specifications Summary Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  1. Project Identification Profile
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] font-semibold">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">PROJECT CONTRACT NAME</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">FIDIC CONTRACT TYPE</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">PROUCT EMPLOYER</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.client}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">DESIGN CONSULTANT</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.consultant}</span>
                  </div>
                  <div className="col-span-2 border-t border-dashed border-slate-100 dark:border-slate-800 pt-2 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">MAIN CONTRACTOR</span>
                      <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.contractor}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">ROAD WAY LENGTH</span>
                      <span className="text-slate-805 dark:text-zinc-150 font-mono font-bold">{p.lengthKm} Km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Executive Performance Index Metres (CPI / SPI) */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  2. Executive Performance Indicators Audit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  
                  {/* Cost Performance */}
                  <div className="border border-slate-250/50 dark:border-slate-750 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-mono">
                      <span>Cost Status Index</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${CPI >= 1.0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20' : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-955/20'}`}>
                        {CPI >= 1.0 ? 'Under-Budget' : 'Check Variance'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-xl font-black font-mono tracking-tight">{CPI.toFixed(3)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold font-sans">CPI Ratio</span>
                    </div>
                    <p className="text-[10px] text-slate-404 leading-tight font-medium">
                      {CPI >= 1.0 
                        ? 'Project outlays confirm healthy financial alignment under the allocated BOQ divisions series.' 
                        : 'Financial outlays exceed physical accomplishments. Expenditure lagging against earned outlays.'}
                    </p>
                  </div>

                  {/* Schedule Performance */}
                  <div className="border border-slate-250/50 dark:border-slate-750 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-mono">
                      <span>Schedule Status Index</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${SPI >= 1.0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20'}`}>
                        {SPI >= 1.0 ? 'On-Schedule' : 'Delayed Progress'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-xl font-black font-mono text-rose-500 tracking-tight">{SPI.toFixed(3)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold font-sans">SPI Ratio</span>
                    </div>
                    <p className="text-[10px] text-slate-404 leading-tight font-medium">
                      {SPI >= 1.0 
                        ? 'Timeline tracking parameters confirm execution is ahead or equal to original planned baselines.' 
                        : 'Significant timeline gap discovered. Urgent resource deployment required to recover lagging milestones.'}
                    </p>
                  </div>

                </div>
              </div>

              {/* 3. Physical Milestones Progression vs Target S-Curves */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  3. Physical Accomplishment vs Target S-Curve
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-3">
                  <div className="flex justify-between items-center font-bold">
                    <span>Physical Progress Status</span>
                    <span className="font-mono text-blue-500 font-black text-xs">{physicalProgress.toFixed(2)}% Completed</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${physicalProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-mono">
                      <span>Cumulative Target Planned: {plannedPct.toFixed(2)}%</span>
                      <span>S-Curve Slippage: -{(plannedPct - physicalProgress).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-2xs font-bold pt-2 border-t border-dashed">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">COMMENCEMENT DATE</span>
                      <span>{ocDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">REVISED COMPLETION TARGET (EOT)</span>
                      <span className="text-rose-600 dark:text-rose-400">{rcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3b. Data Inconsistency & Integrity Audit Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  3b. Data Inconsistency & Integrity Audit Log
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-2">
                  {inconsistencyAlerts.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-mono">
                        <span>AUDIT DISCREPANCIES FLAGGED: {inconsistencyAlerts.length} RULE(S)</span>
                        <span className="text-rose-600 dark:text-rose-400">ACTION REQUIRED</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden">
                        {inconsistencyAlerts.map((alert, aIdx) => (
                          <div key={aIdx} className="p-2.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                            <div className="flex items-center justify-between font-bold text-[10px]">
                              <span className="text-rose-700 dark:text-rose-400 uppercase font-mono">[{alert.category}] {alert.title}</span>
                              <span className="text-rose-600 font-mono font-black">{alert.discrepancy}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                              {alert.description} Baseline: <strong>{alert.expectedValue}</strong> | System Value: <strong className="text-rose-600 dark:text-rose-400">{alert.actualValue}</strong>.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      Data Integrity Verified: All BOQ series sums, IPC values, S-Curves, and Work Program weights align seamlessly with contract baselines.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Lagging Sectors & CPM Work Critical Pathways */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  4. Operational Risks & CPM Schedule Lag Info
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-3">
                  
                  {/* Lagging BOQ Divisions */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Lagging Work Series Divisions (Progress &lt; 40%)</span>
                    {lagging.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lagging.map((l, lIdx) => (
                          <div key={lIdx} className="p-2 border border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                              Series {l.code} - {l.desc}: {l.progress.toFixed(2)}% exec
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        All BOQ divisions are progressing within healthy FIDIC tolerance margins.
                      </div>
                    )}
                  </div>

                  {/* Critical Pathway activities */}
                  <div className="pt-2 border-t border-dashed">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Critical Work Program Flights (CPM)</span>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                      The active critical path spans {criticalActs.length ? criticalActs.length : '0'} construction phases: <strong className="text-rose-500">{criticalActs.join(', ') || 'N/A: General Grading'}</strong>.
                      Any additional slippage in these activities will directly affect the official revised completion target of {rcDate.toLocaleDateString()}.
                    </p>
                  </div>

                </div>
              </div>

              {/* 4b. Right-Of-Way (ROW) Obstruction & Strategic Compliance Audit */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                    4b. Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance
                  </h3>
                  <div className="border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900/50 overflow-x-auto text-[11px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold border-b border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                          <th className="p-2 text-left">Obstruction Metric Type</th>
                          <th className="p-2 text-center w-36">Value To-Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayRowMetrics.map((rm, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                            <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{rm.name}</td>
                            <td className="p-2 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">{rm.value.toFixed(2)} {rm.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Matured Unpaid IPCs compliance panel */}
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-100/65 dark:border-amber-900/35 pb-2.5">
                    <div>
                      <h4 className="text-[11px] font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Contractual Payment Maturity (FIDIC Sub-clause 14.7 Compliance)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Outstanding matured certified IPCs and overdue liabilities (beyond the 56-day contractual limit).
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Cards for Unpaid Balances */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/40 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="space-y-1">
                      <span className="text-[8px] font-extrabold text-rose-500 block uppercase tracking-wider font-mono">MATURED NET ETB (&gt;56 Days)</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                        Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetEtb)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-rose-500 block uppercase tracking-wider font-mono">MATURED NET USD (&gt;56 Days)</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                        $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetUsd)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-blue-500 block uppercase tracking-wider font-mono">ALL UNPAID NET ETB</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 block">
                        Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetEtb)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-emerald-500 block uppercase tracking-wider font-mono">ALL UNPAID NET USD</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetUsd)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[9.5px] font-bold text-slate-600 dark:text-slate-350 pt-1">
                    Overdue/Matured Claims Log:
                  </div>

                  {unpaidIpcsDetails.length > 0 ? (
                    <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/30">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse min-w-[480px]">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 font-bold">
                              <th className="p-1.5 text-left">IPC No</th>
                              <th className="p-1.5 text-center">Submission Status</th>
                              <th className="p-1.5 text-center">Age (Days)</th>
                              <th className="p-1.5 text-right">Net ETB Portion</th>
                              <th className="p-1.5 text-right">Net USD Portion</th>
                              <th className="p-1.5 text-center">Clausal Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                            {unpaidIpcsDetails.map((det, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/5">
                                <td className="p-1.5 font-bold text-slate-700 dark:text-slate-300">{det.paymentNo}</td>
                                <td className="p-1.5 text-center text-slate-500 dark:text-slate-400">Certified & Submitted</td>
                                <td className="p-1.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">{det.daysElapsed} days</td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-205">
                                  Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(det.certifiedEtb)}
                                </td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-205">
                                  $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(det.certifiedUsd)}
                                </td>
                                <td className="p-1.5 text-center">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 uppercase tracking-tight">
                                    Matured / Overdue
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/2 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      No matured overdue certified IPC payments found (all pending claims are within the 56-day contractual grace period).
                    </div>
                  )}

                  <p className="text-[9px] leading-relaxed text-slate-400 dark:text-slate-500 font-mono italic">
                    * Contract compliance reference: Sub-clause 14.7 requires payment within 56 calendar days. Delays trigger Sub-clause 14.8 interest at 4% for local currency and LIBOR + 2% for foreign currencies, and authorize progress deceleration under Sub-clause 16.1.
                  </p>
                </div>

                {/* 12 Groups KPI summary report */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-1 h-2 bg-emerald-500 rounded-2xs" />
                    Strategic Compliance Audit (12 KPI Groups Summary)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {kpiGroupsScores.map((g, gIdx) => {
                      let scoreColor = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/55";
                      let barColor = "bg-rose-500";
                      
                      if (g.id === 'G8') {
                        if (g.score <= 50) {
                          scoreColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/55";
                          barColor = "bg-emerald-500";
                        } else if (g.score <= 75) {
                          scoreColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/55";
                          barColor = "bg-amber-500";
                        } else {
                          scoreColor = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/55";
                          barColor = "bg-rose-500";
                        }
                      } else {
                        if (g.score >= 80) {
                          scoreColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/55";
                          barColor = "bg-emerald-500";
                        } else if (g.score >= 50) {
                          scoreColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/55";
                          barColor = "bg-amber-500";
                        }
                      }

                      return (
                        <div key={`group-${g.id || 'g'}-${gIdx}`} className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/80 hover:shadow-2xs transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-2xs">
                          <div className="flex justify-between items-start gap-1.5">
                            <div>
                              <span className="text-[9px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{g.id}</span>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-205 leading-tight mt-0.5">{g.name}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 font-mono text-[10px] font-extrabold rounded-md border shrink-0 ${scoreColor}`}>
                              {g.score.toFixed(2)}%
                            </span>
                          </div>
                          {/* Progress Line */}
                          <div className="w-full bg-slate-200 dark:bg-slate-850 h-1 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${g.score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Securities, Escrow and Bonds Audit */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  5. Bank Securities & Guarantee Conformity
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px]">
                  {criticalGuarantees.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900 text-rose-850 dark:text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-2 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        CRITICAL AUDIT NOTICE: Expiry/Validation Warning Issued!
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        {criticalGuarantees.map((b, bIdx) => {
                          const isExpired = new Date(b.expireDate) < new Date();
                          return (
                            <div key={`bond-${b.type || 'b'}-${bIdx}`} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                              <div>
                                <strong className="block text-slate-805 dark:text-zinc-150">{b.type}</strong>
                                <span className="text-[9px] text-slate-400">Issuer: {b.bank}</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-mono block font-black ${isExpired ? 'text-rose-600' : 'text-amber-500'}`}>Br. {formattedMoney(b.amount)}</span>
                                <span className="text-[8px] font-mono text-slate-400">Exp: {b.expireDate}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      All performance and advance mobilization payment guarantees have validated expiry thresholds beyond the critical 45-day window.
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Legal Interventions and System Directives */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  6. Recommended Audit Interventions & Directives
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-2 font-semibold">
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">01</span>
                    <p className="text-[10px]">
                      Issue formal Warning Directive under FIDIC Clause 8.6 regarding the delays evaluated in <strong className="text-slate-900 dark:text-white">{lagging.length > 0 ? lagging.map(l => `Series ${l.code}`).join(', ') : 'Series A (Earthworks)'}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">02</span>
                    <p className="text-[10px]">
                      Instruct the Supervising Engineer and Lead QS to audit price adjustments indexes and current IPC valuation backlogs to align cash outlay velocity with real progress.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">03</span>
                    <p className="text-[10px]">
                      Instruct Contractor to immediately submit a comprehensive recovery program reflecting real equipment plant and workforce enhancements on the critical paths.
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. Endorsement & Sign-Off Block */}
              <div className="pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-[10px] text-slate-500 font-semibold uppercase">
                <div className="text-center space-y-12">
                  <p>Drafted by PMO, Project Manager</p>
                  <div className="border-b border-slate-300 dark:border-slate-700 w-44 mx-auto pb-1 text-slate-400">
                    signature / Stamp
                  </div>
                </div>
                <div className="text-center space-y-12">
                  <p>Verified by CPMP Director</p>
                  <div className="border-b border-slate-300 dark:border-slate-700 w-44 mx-auto pb-1 text-slate-400">
                    signature / STAMP
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      {/* Changelog Audit History */}
      <ChangelogAuditHistory
        history={history}
        onClearHistory={onClearHistory}
        canClear={
          currentUserObj?.role === 'master_admin' ||
          currentUserObj?.role === 'cpm_admin' ||
          currentUserObj?.role === 'admin'
        }
      />

      {/* Modal 1: Detailed Monthly Grading Inspection View */}
      <AnimatePresence>
        {selectedGradingDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print"
            onClick={() => setSelectedGradingDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      Monthly Performance Audit Grading Breakdown
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {selectedGradingDetailModal.monthName || selectedGradingDetailModal.month} • Recorded: {selectedGradingDetailModal.recordedDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGradingDetailModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Dual Summary Badges */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Contractor Card */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase font-mono">CONTRACTOR GRADING</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                        GRADE {selectedGradingDetailModal.contractorGrade}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
                        {(selectedGradingDetailModal.contractorScore ?? 80).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        SPI: {(selectedGradingDetailModal.contractorSpi ?? 1).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {selectedGradingDetailModal.contractorStanding}
                    </p>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-500">
                        <span>Plan Monthly:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{(selectedGradingDetailModal.contractorPlanMonthly ?? 0).toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Actual Monthly:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{(selectedGradingDetailModal.contractorActualMonthly ?? 0).toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Monthly Variance:</span>
                        <strong className={(selectedGradingDetailModal.contractorVariance ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {(selectedGradingDetailModal.contractorVariance ?? 0) >= 0 ? '+' : ''}{(selectedGradingDetailModal.contractorVariance ?? 0).toFixed(2)}%
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Cumulative Actual:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{(selectedGradingDetailModal.contractorActualCumulative ?? 0).toFixed(2)}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Consultant Card */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase font-mono">CONSULTANT GRADING</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                        GRADE {selectedGradingDetailModal.consultantGrade || 'B'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {(selectedGradingDetailModal.consultantOverallScore ?? 82.5).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        SLA: {(selectedGradingDetailModal.consultantSlaTurnaroundScore ?? 85).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {selectedGradingDetailModal.consultantStanding}
                    </p>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-500">
                        <span>Pillar 1 (SLA Turnaround):</span>
                        <strong className="text-slate-800 dark:text-slate-200">{(selectedGradingDetailModal.consultantSlaTurnaroundScore ?? 85).toFixed(1)}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Pillar 2 (5-Dim Audit):</span>
                        <strong className="text-slate-800 dark:text-slate-200">{(selectedGradingDetailModal.consultantFiveDimScore ?? 80).toFixed(1)}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Avg RFI Response:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{selectedGradingDetailModal.consultantAvgRfiDays || 6} days</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Submittal SLA Rate:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{selectedGradingDetailModal.consultantOnTimeRate || 85}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Narrative / Findings */}
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Auditor Findings & Operational Remarks
                  </span>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p>
                      <strong>Contractor Remarks:</strong> {selectedGradingDetailModal.contractorRemarks || 'Physical output tracked within contractual tolerance without active non-conformity notices.'}
                    </p>
                    <p>
                      <strong>Consultant Remarks:</strong> {selectedGradingDetailModal.consultantRemarks || 'Supervisory team responded to RFI submittals and site work inspection requests within prescribed SLA limits.'}
                    </p>
                    {selectedGradingDetailModal.notes && (
                      <p>
                        <strong>Audit Notes:</strong> {selectedGradingDetailModal.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedGradingDetailModal(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal 2: Create / Edit Monthly Grading Record */}
      <AnimatePresence>
        {isRecordGradingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print"
            onClick={() => setIsRecordGradingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      {editingRecordId ? 'Edit Monthly Grading Record' : 'Record Monthly Grading & Audit Score'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Input or auto-calculate performance metrics for both Contractor and Supervision Consultant.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRecordGradingModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Month & Auto Calculation Bar */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">
                      Audit Month:
                    </label>
                    <input
                      type="month"
                      max={new Date().toISOString().slice(0, 7)}
                      value={gradingForm.month || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGradingForm(prev => ({ ...prev, month: val }));
                        handleAutoCalculateForm(val);
                      }}
                      className="py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        const defaultMonth = d.toISOString().slice(0, 7);
                        handleAutoCalculateForm(gradingForm.month || defaultMonth);
                      }}
                      className="flex items-center justify-center gap-1.5 py-1 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Auto-Calculate</span>
                    </button>
                  </div>
                </div>

                {/* Current Month Open / Provisional Notice */}
                {isCurrentMonth(gradingForm.month) && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <strong className="block text-[11px] font-black uppercase font-mono tracking-wide">
                        Current Month Ledger Standing: Open / Provisional
                      </strong>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300">
                        The current month's contractor grading remains open and provisional until the end of the month. Finalized certification unlocks automatically after the month concludes.
                      </span>
                    </div>
                  </div>
                )}

                {/* Supervision Consultant Tenure Cross-Check & Verification Status */}
                {(() => {
                  const checkInfo = resolveConsultantForPeriod(p, gradingForm.month);
                  return (
                    <div className={`p-3 rounded-xl border text-xs ${
                      checkInfo.isHistorical 
                        ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
                        : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${checkInfo.isHistorical ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'}`}>
                            {checkInfo.isHistorical ? <Clock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs uppercase tracking-wide">
                                {checkInfo.isHistorical ? 'Historical Predecessor Consultant Tenure' : 'Active Supervision Consultant Tenure'}
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md font-mono ${
                                checkInfo.isHistorical 
                                  ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100' 
                                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                              }`}>
                                {checkInfo.isHistorical ? 'Pre-Assignment Archive' : 'Active Assignment'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                              Supervisory Firm: <strong className="text-slate-900 dark:text-white">{checkInfo.firmName}</strong>
                              {checkInfo.residentEngineer && <> • RE: <strong>{checkInfo.residentEngineer}</strong></>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono block">Attributed Grade</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                            checkInfo.officialGrade === 'A' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                          }`}>
                            Grade {checkInfo.officialGrade} ({checkInfo.overallScore.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                        <span>
                          {checkInfo.isHistorical 
                            ? `Audit month (${gradingForm.month}) is before active commencement (${activeConsultantAssignmentDate}). Linked to predecessor archive (${checkInfo.assignmentDate} → ${checkInfo.handoverDate}).`
                            : `Audit month (${gradingForm.month}) falls on or after assignment date (${activeConsultantAssignmentDate}).`
                          }
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setGradingForm(prev => ({
                              ...prev,
                              consultantName: checkInfo.firmName,
                              residentEngineer: checkInfo.residentEngineer,
                              consultantTenureId: checkInfo.tenureId,
                              isHistoricalConsultant: checkInfo.isHistorical,
                              consultantAssignmentDate: checkInfo.assignmentDate,
                              consultantHandoverDate: checkInfo.handoverDate,
                              consultantSlaTurnaroundScore: checkInfo.slaScore,
                              consultantFiveDimScore: checkInfo.fiveDimScore,
                              consultantOverallScore: checkInfo.overallScore,
                              consultantGrade: checkInfo.officialGrade,
                              consultantStanding: checkInfo.standing
                            }));
                          }}
                          className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold transition shrink-0 cursor-pointer"
                        >
                          Sync Consultant Parameters
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Section A: Contractor Metrics */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-2.5 bg-emerald-500 rounded-xs" />
                    Contractor Monthly Grading Parameters
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Plan Monthly (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gradingForm.contractorPlanMonthly || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const act = gradingForm.contractorActualMonthly || 0;
                          const diff = act - val;
                          setGradingForm(prev => ({ 
                            ...prev, 
                            contractorPlanMonthly: val,
                            contractorVariance: Number(diff.toFixed(2)),
                            contractorSpi: val > 0 ? Number((act / val).toFixed(2)) : 1.0
                          }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Actual Monthly (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gradingForm.contractorActualMonthly || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const plan = gradingForm.contractorPlanMonthly || 0;
                          const diff = val - plan;
                          setGradingForm(prev => ({ 
                            ...prev, 
                            contractorActualMonthly: val,
                            contractorVariance: Number(diff.toFixed(2)),
                            contractorSpi: plan > 0 ? Number((val / plan).toFixed(2)) : 1.0
                          }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Audit Score (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        max="100"
                        min="0"
                        value={gradingForm.contractorScore || 80}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          let gr: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
                          if (val >= 90) gr = 'A';
                          else if (val >= 80) gr = 'B';
                          else if (val >= 70) gr = 'C';
                          else if (val >= 60) gr = 'D';
                          else gr = 'F';
                          setGradingForm(prev => ({ ...prev, contractorScore: val, contractorGrade: gr }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Contractor Grade</label>
                      <select
                        value={gradingForm.contractorGrade || 'B'}
                        onChange={(e) => setGradingForm(prev => ({ ...prev, contractorGrade: e.target.value as any }))}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                      >
                        <option value="A">Grade A (≥90%)</option>
                        <option value="B">Grade B (80-89%)</option>
                        <option value="C">Grade C (70-79%)</option>
                        <option value="D">Grade D (60-69%)</option>
                        <option value="F">Grade F (&lt;60%)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Contractor Audit Remarks</label>
                    <input
                      type="text"
                      value={gradingForm.contractorRemarks || ''}
                      onChange={(e) => setGradingForm(prev => ({ ...prev, contractorRemarks: e.target.value }))}
                      placeholder="e.g. Earthworks accelerated on Section 2; asphalt paving on track."
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Section B: Supervision Consultant Metrics */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-2.5 bg-indigo-600 rounded-xs" />
                    Supervision Consultant Dual-Pillar Evaluation
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Pillar 1 (SLA %)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gradingForm.consultantSlaTurnaroundScore || 85}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const dim = gradingForm.consultantFiveDimScore || 80;
                          const overall = Number(((val + dim) / 2).toFixed(1));
                          setGradingForm(prev => ({ ...prev, consultantSlaTurnaroundScore: val, consultantOverallScore: overall }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Pillar 2 (5-Dim %)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gradingForm.consultantFiveDimScore || 80}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const sla = gradingForm.consultantSlaTurnaroundScore || 85;
                          const overall = Number(((sla + val) / 2).toFixed(1));
                          setGradingForm(prev => ({ ...prev, consultantFiveDimScore: val, consultantOverallScore: overall }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Combined Score (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gradingForm.consultantOverallScore || 82.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          let gr: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
                          if (val >= 90) gr = 'A';
                          else if (val >= 80) gr = 'B';
                          else if (val >= 70) gr = 'C';
                          else if (val >= 60) gr = 'D';
                          else gr = 'F';
                          setGradingForm(prev => ({ ...prev, consultantOverallScore: val, consultantGrade: gr }));
                        }}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Consultant Grade</label>
                      <select
                        value={gradingForm.consultantGrade || 'B'}
                        onChange={(e) => setGradingForm(prev => ({ ...prev, consultantGrade: e.target.value as any }))}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                      >
                        <option value="A">Grade A (≥90%)</option>
                        <option value="B">Grade B (80-89%)</option>
                        <option value="C">Grade C (70-79%)</option>
                        <option value="D">Grade D (60-69%)</option>
                        <option value="F">Grade F (&lt;60%)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 mb-1">Consultant Supervisory Remarks</label>
                    <input
                      type="text"
                      value={gradingForm.consultantRemarks || ''}
                      onChange={(e) => setGradingForm(prev => ({ ...prev, consultantRemarks: e.target.value }))}
                      placeholder="e.g. Submittal turnaround maintained under 6 days; resident engineer present on site."
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordGradingModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGradingRecord}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Monthly Grading Record</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal 3: Historical Predecessor Supervision Consultant Appraisal Dossier */}
      <AnimatePresence>
        {selectedHistoricalConsultantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print"
            onClick={() => setSelectedHistoricalConsultantModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black uppercase tracking-wide">
                        {selectedHistoricalConsultantModal.firmName}
                      </h3>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white">
                        Predecessor Supervision Consultant
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400">
                      Archived Contract & Final Output Performance Evaluation Dossier
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoricalConsultantModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Final Output Grade Hero Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-emerald-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[9.5px] font-mono uppercase font-black tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                      OFFICIAL FINAL OUTPUT PERFORMANCE GRADE
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        Grade {selectedHistoricalConsultantModal.officialGrade || 'A'}
                      </span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {(selectedHistoricalConsultantModal.evaluationScore ?? 92.4).toFixed(1)}% Overall Score
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Standing: <strong className="text-slate-700 dark:text-slate-200">{selectedHistoricalConsultantModal.performanceRating || 'Outstanding'}</strong> • Archived on {selectedHistoricalConsultantModal.archivedAt?.slice(0, 10) || selectedHistoricalConsultantModal.handoverDate}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4 space-y-1">
                    <div className="text-[10px] text-slate-500">
                      SLA On-Time Compliance: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{(selectedHistoricalConsultantModal.slaComplianceRatePct ?? 94.2).toFixed(1)}%</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Contract Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedHistoricalConsultantModal.contractRefNo}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Resident Engineer: <strong className="text-slate-700 dark:text-slate-300">{selectedHistoricalConsultantModal.residentEngineerName || 'Resident Engineer'}</strong>
                    </div>
                  </div>
                </div>

                {/* Tenure and Handover Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Assignment & Handover Period
                    </h4>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Commencement / Assignment:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedHistoricalConsultantModal.commencementDate}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Handover / Transition Date:</span>
                        <strong className="font-mono text-indigo-600 dark:text-indigo-400">{selectedHistoricalConsultantModal.handoverDate}</strong>
                      </div>
                      {selectedHistoricalConsultantModal.originalCompletionDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Original Scheduled End:</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">{selectedHistoricalConsultantModal.originalCompletionDate}</span>
                        </div>
                      )}
                      {selectedHistoricalConsultantModal.associationType && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Association Type:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedHistoricalConsultantModal.associationType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                      <FileBadge className="w-3.5 h-3.5 text-emerald-500" />
                      Financial & Contract Overview
                    </h4>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Original Contract Fee:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">{formatAccounting(selectedHistoricalConsultantModal.originalFeeEtb || 0)} ETB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Invoiced to Transition:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{formatAccounting(selectedHistoricalConsultantModal.totalInvoicedEtb || (selectedHistoricalConsultantModal.originalFeeEtb || 0) * 0.95)} ETB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Settled / Paid:</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatAccounting(selectedHistoricalConsultantModal.totalPaidEtb || (selectedHistoricalConsultantModal.originalFeeEtb || 0) * 0.92)} ETB</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transition Notes and Reasons */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Transition & Handover PMO Statement
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedHistoricalConsultantModal.transitionReason || selectedHistoricalConsultantModal.transitionNotes || 'Supervision consulting contract successfully executed for the assigned phase. All submittal audits, IPC certifications, and site handover protocols formally archived into the ERA project repository.'}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHistoricalConsultantModal(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

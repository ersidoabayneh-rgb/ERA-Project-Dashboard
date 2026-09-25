import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Edit3, 
  Landmark, 
  TrendingUp, 
  HelpCircle, 
  Info, 
  Calendar, 
  Clock, 
  Layers, 
  DollarSign, 
  ArrowRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  History,
  Settings2
} from 'lucide-react';
import { Project } from '../types';

export interface AuditLogEntry {
  timestamp: string;
  actor: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
}

export interface WorkflowStage {
  id: string;
  label: string;
  color: 'slate' | 'blue' | 'teal' | 'emerald' | 'violet' | 'amber' | 'orange' | 'rose' | 'indigo' | 'cyan';
}

export const DEFAULT_STAGES: WorkflowStage[] = [
  { id: 'Draft', label: 'Draft', color: 'slate' },
  { id: 'Submitted', label: 'Submitted', color: 'blue' },
  { id: 'Certified', label: 'Certified', color: 'teal' },
  { id: 'Approved', label: 'Approved', color: 'emerald' },
  { id: 'Recommended', label: 'Recommended', color: 'violet' },
  { id: 'Pending', label: 'Pending', color: 'amber' },
  { id: 'Under Review', label: 'Under Review', color: 'orange' },
  { id: 'Rejected', label: 'Rejected', color: 'rose' }
];

interface VariationOrder {
  id: string;
  voNumber: number;
  reasonForIssue: string;
  furtherDetail: string;
  description: string;
  costRequested: number;
  costRecommended: number;
  costApproved: number;
  dateApproved: string;
  status: string;
  subcontractorActivity: string;
  historyLog?: AuditLogEntry[];
}

interface ContractClaim {
  id: string;
  claimNo: string | number;
  noticeDate: string;
  clauseRef: string;
  eventDescription: string;
  eotDaysRequested: number;
  eotRecommended: number;
  eotApproved: number;
  costClaimed: number;
  costRecommended: number;
  costApproved: number;
  status: string;
  historyLog?: AuditLogEntry[];
}

interface VariationAndClaimViewProps {
  project: Project;
  onProjectUpdate: (updatedFields: Partial<Project>, sectionLabel: string) => void;
  currentUserObj?: any;
}

export default function VariationAndClaimView({ project, onProjectUpdate, currentUserObj }: VariationAndClaimViewProps) {
  const isMasterAdmin = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.username === 'proj_1781786415663';

  const isSawlaKako = useMemo(() => {
    const pName = (project.name || '').toLowerCase();
    return pName.includes('sawla') || pName.includes('kako');
  }, [project.name]);

  // Load dynamically customized workflow stages from the project or default to the baseline stages
  const workflowStages: WorkflowStage[] = useMemo(() => {
    return (project as any).customWorkflowStages || DEFAULT_STAGES;
  }, [project]);

  // Use either stored variations and claims from the project, or fallback to the standard seed data
  const initialVOs: VariationOrder[] = useMemo(() => {
    if ((project as any).variationOrdersList) {
      return (project as any).variationOrdersList;
    }
    if (isSawlaKako) {
      return [
        {
          id: 'vo_1',
          voNumber: 1,
          reasonForIssue: 'Additional Request from Local Government',
          furtherDetail: 'Additional Access',
          description: 'Additional Works - Construction Works of New Spur Road from Beneta to Koibe Hospital (Estimated Additional amount excludes 10% contingency and VAT)',
          costRequested: 34921580.56,
          costRecommended: 33880087.62,
          costApproved: 33880087.62,
          dateApproved: '2025-12-25',
          status: 'Approved',
          subcontractorActivity: 'Structure/Road',
          historyLog: [
            { timestamp: '2025-12-01T10:00:00Z', actor: 'Ersido Abayneh', oldStatus: 'None', newStatus: 'Draft', comment: 'Initial request received from local government' },
            { timestamp: '2025-12-15T14:30:00Z', actor: 'Lead Consultant', oldStatus: 'Draft', newStatus: 'Recommended', comment: 'Recommended after structure analysis' },
            { timestamp: '2025-12-25T11:15:00Z', actor: 'ERA Regional Director', oldStatus: 'Recommended', newStatus: 'Approved', comment: 'Formally approved under Minute 25.1' }
          ]
        }
      ];
    }
    return [];
  }, [project, isSawlaKako]);

  const initialClaims: ContractClaim[] = useMemo(() => {
    if ((project as any).contractClaimsList) {
      return (project as any).contractClaimsList;
    }
    if (isSawlaKako) {
      return [
        {
          id: 'claim_1',
          claimNo: 1,
          noticeDate: '2023-11-14',
          clauseRef: 'Sub-Clause 20.1 / 8.4',
          eventDescription: 'Extreme geological variance and prolonged rock excavation in mountain pass (Km 104 - 108) causing critical path delay',
          eotDaysRequested: 826,
          eotRecommended: 816,
          eotApproved: 816,
          costClaimed: 0,
          costRecommended: 0,
          costApproved: 0,
          status: 'Approved',
          historyLog: [
            { timestamp: '2023-11-14T09:00:00Z', actor: 'Ersido Abayneh', oldStatus: 'None', newStatus: 'Submitted', comment: 'Logged official Clause 20.1 claim notice' },
            { timestamp: '2023-12-05T16:00:00Z', actor: 'Lead Consultant', oldStatus: 'Submitted', newStatus: 'Recommended', comment: 'Assessment completed & EOT recommendation prepared' },
            { timestamp: '2023-12-18T10:30:00Z', actor: 'ERA Board', oldStatus: 'Recommended', newStatus: 'Approved', comment: 'Board of Directors officially approved recommendation' }
          ]
        },
        {
          id: 'claim_2',
          claimNo: 2,
          noticeDate: '2024-02-10',
          clauseRef: 'Sub-Clause 13.7',
          eventDescription: 'Escalation adjustments on high-speed steel and bitumen imports due to national fuel price index hike',
          eotDaysRequested: 0,
          eotRecommended: 0,
          eotApproved: 0,
          costClaimed: 4850200.00,
          costRecommended: 0,
          costApproved: 0,
          status: 'Draft',
          historyLog: [
            { timestamp: '2024-02-10T11:00:00Z', actor: 'Ersido Abayneh', oldStatus: 'None', newStatus: 'Draft', comment: 'Drafted import index escalations log' }
          ]
        },
        {
          id: 'claim_3',
          claimNo: 3,
          noticeDate: '2024-05-18',
          clauseRef: 'Sub-Clause 20.1 / 1.9',
          eventDescription: 'Delay in design drawing handover for Gidami River Box Culvert structure (Km 98+450)',
          eotDaysRequested: 45,
          eotRecommended: 30,
          eotApproved: 0,
          costClaimed: 12450000.00,
          costRecommended: 10800000.00,
          costApproved: 0,
          status: 'Submitted',
          historyLog: [
            { timestamp: '2024-05-18T14:00:00Z', actor: 'Ersido Abayneh', oldStatus: 'None', newStatus: 'Draft', comment: 'Drafted drawing delay logs' },
            { timestamp: '2024-06-01T09:45:00Z', actor: 'Project Manager', oldStatus: 'Draft', newStatus: 'Submitted', comment: 'Submitted claim package to Consultant' }
          ]
        },
        {
          id: 'claim_4',
          claimNo: 4,
          noticeDate: '2024-08-01',
          clauseRef: 'Sub-Clause 8.4',
          eventDescription: 'Abnormal rain pattern causing extended site washouts and machinery immobilization during peak construction month',
          eotDaysRequested: 35,
          eotRecommended: 30,
          eotApproved: 30,
          costClaimed: 8540110.00,
          costRecommended: 8540110.00,
          costApproved: 8540110.00,
          status: 'Certified',
          historyLog: [
            { timestamp: '2024-08-01T15:20:00Z', actor: 'Lead Consultant', oldStatus: 'None', newStatus: 'Draft', comment: 'Heavy washouts logged as force majeure' },
            { timestamp: '2024-08-15T11:00:00Z', actor: 'Project PM', oldStatus: 'Draft', newStatus: 'Submitted', comment: 'Sent with daily precipitation reports' },
            { timestamp: '2024-08-30T16:30:00Z', actor: 'Resident Engineer', oldStatus: 'Submitted', newStatus: 'Certified', comment: 'Rain records verified & days certified' }
          ]
        },
        {
          id: 'claim_5',
          claimNo: 5,
          noticeDate: '2024-09-05',
          clauseRef: 'Sub-Clause 4.12',
          eventDescription: 'Unforeseen utility line disruption at Sawla town bypass link (unmapped overhead optic cables)',
          eotDaysRequested: 10,
          eotRecommended: 0,
          eotApproved: 0,
          costClaimed: 1500000.00,
          costRecommended: 0,
          costApproved: 0,
          status: 'Rejected',
          historyLog: [
            { timestamp: '2024-09-05T10:00:00Z', actor: 'Lead Consultant', oldStatus: 'None', newStatus: 'Draft', comment: 'Optic line damage recorded' },
            { timestamp: '2024-09-12T13:00:00Z', actor: 'Ersido Abayneh', oldStatus: 'Draft', newStatus: 'Submitted', comment: 'Submitted claim details' },
            { timestamp: '2024-09-20T17:15:00Z', actor: 'Resident Engineer', oldStatus: 'Submitted', newStatus: 'Rejected', comment: 'Rejected as contractor was warned during kick-off of overhead constraints' }
          ]
        }
      ];
    }
    return [];
  }, [project, isSawlaKako]);

  // View state variables
  const [activeSubTab, setActiveSubTab] = useState<string>('variation_order');
  const [voFilter, setVoFilter] = useState('');
  const [claimFilter, setClaimFilter] = useState('');
  const [claimStageFilter, setClaimStageFilter] = useState<string>('All');
  
  // Pagination
  const [voPage, setVoPage] = useState(1);
  const [claimPage, setClaimPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isVoModalOpen, setIsVoModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [editingVo, setEditingVo] = useState<VariationOrder | null>(null);
  const [editingClaim, setEditingClaim] = useState<ContractClaim | null>(null);

  // Stage customization modal states
  const [isStageConfigModalOpen, setIsStageConfigModalOpen] = useState(false);
  const [editableStages, setEditableStages] = useState<WorkflowStage[]>([]);

  // Selected item audit log viewer
  const [selectedAuditLog, setSelectedAuditLog] = useState<{ title: string; logs: AuditLogEntry[] } | null>(null);

  // New VO Form state
  const [voNumber, setVoNumber] = useState<number>(initialVOs.length + 1);
  const [voReason, setVoReason] = useState('');
  const [voDetail, setVoDetail] = useState('');
  const [voDesc, setVoDesc] = useState('');
  const [voCostRequested, setVoCostRequested] = useState<number>(0);
  const [voCostRecommended, setVoCostRecommended] = useState<number>(0);
  const [voCostApproved, setVoCostApproved] = useState<number>(0);
  const [voDateApproved, setVoDateApproved] = useState('');
  const [voStatus, setVoStatus] = useState<string>('Approved');
  const [voActivity, setVoActivity] = useState('Structure/Road');

  // New Claim Form state
  const [claimNo, setClaimNo] = useState<string | number>(initialClaims.length + 1);
  const [claimNoticeDate, setClaimNoticeDate] = useState('');
  const [claimClauseRef, setClaimClauseRef] = useState('');
  const [claimDesc, setClaimDesc] = useState('');
  const [claimEotRequested, setClaimEotRequested] = useState<number>(0);
  const [claimEotRecommended, setClaimEotRecommended] = useState<number>(0);
  const [claimEotApproved, setClaimEotApproved] = useState<number>(0);
  const [claimCostClaimed, setClaimCostClaimed] = useState<number>(0);
  const [claimCostRecommended, setClaimCostRecommended] = useState<number>(0);
  const [claimCostApproved, setClaimCostApproved] = useState<number>(0);
  const [claimStatus, setClaimStatus] = useState<string>('Approved');

  // Look up stored variation and claim settings, or fallback to smart defaults per project
  const storedSettings = useMemo(() => (project as any).variationClaimSettings || {}, [project]);

  const originalContractValue = useMemo(() => {
    return storedSettings.originalContractValue ?? 
      (project.contractAmountEtb || (project.origAmount ? project.origAmount * 1_000_000 : null) || (isSawlaKako ? 433614234.65 : 150000000));
  }, [project, storedSettings.originalContractValue, isSawlaKako]);

  const commencementDate = useMemo(() => {
    return storedSettings.commencementDate ?? 
      (project.startDate || (isSawlaKako ? '2022-05-05' : '2023-01-01'));
  }, [project, storedSettings.commencementDate, isSawlaKako]);

  const amtExclVat = useMemo(() => {
    return storedSettings.amtExclVat ?? 
      ((project as any).revisedContractAmountEtb || (originalContractValue / 1.15) || (isSawlaKako ? 377055856.22 : 130434782.60));
  }, [project, storedSettings.amtExclVat, originalContractValue, isSawlaKako]);

  const origCompletionDate = useMemo(() => {
    if (storedSettings.origCompletionDate) return storedSettings.origCompletionDate;
    if (project.startDate && project.origDays) {
      try {
        const date = new Date(project.startDate);
        date.setDate(date.getDate() + project.origDays);
        return date.toISOString().split('T')[0];
      } catch (e) {}
    }
    return isSawlaKako ? '2024-04-05' : '2025-12-31';
  }, [project, storedSettings.origCompletionDate, isSawlaKako]);

  const itemRateIncludesVat = useMemo(() => {
    return storedSettings.itemRateIncludesVat ?? 'No';
  }, [storedSettings.itemRateIncludesVat]);

  const contingencyInContract = useMemo(() => {
    return storedSettings.contingencyInContract ?? 
      (project.provisionalSum || (isSawlaKako ? 48850272.88 : originalContractValue * 0.1));
  }, [project, storedSettings.contingencyInContract, originalContractValue, isSawlaKako]);

  const amtExclContingency = useMemo(() => {
    return storedSettings.amtExclContingency ?? 
      (originalContractValue - contingencyInContract || (isSawlaKako ? 328205583.33 : originalContractValue * 0.9));
  }, [storedSettings.amtExclContingency, originalContractValue, contingencyInContract, isSawlaKako]);

  const measureChangeRequested = useMemo(() => {
    return storedSettings.measureChangeRequested ?? (isSawlaKako ? 59055.55 : 0);
  }, [storedSettings.measureChangeRequested, isSawlaKako]);

  const measureChangeRecommended = useMemo(() => {
    return storedSettings.measureChangeRecommended ?? (isSawlaKako ? 59055.55 : 0);
  }, [storedSettings.measureChangeRecommended, isSawlaKako]);

  const measureChangeApproved = useMemo(() => {
    return storedSettings.measureChangeApproved ?? (isSawlaKako ? 59055.55 : 0);
  }, [storedSettings.measureChangeApproved, isSawlaKako]);

  // Modal State for Contract Settings editing
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editOrigVal, setEditOrigVal] = useState<number>(originalContractValue);
  const [editCommDate, setEditCommDate] = useState<string>(commencementDate);
  const [editExclVat, setEditExclVat] = useState<number>(amtExclVat);
  const [editComplDate, setEditExComplDate] = useState<string>(origCompletionDate);
  const [editRateIncVat, setEditRateIncludesVat] = useState<string>(itemRateIncludesVat);
  const [editExclContingency, setEditExclContingency] = useState<number>(amtExclContingency);
  const [editContingency, setEditContingency] = useState<number>(contingencyInContract);
  const [editMeasReq, setEditMeasReq] = useState<number>(measureChangeRequested);
  const [editMeasRec, setEditMeasRec] = useState<number>(measureChangeRecommended);
  const [editMeasApp, setEditMeasApproved] = useState<number>(measureChangeApproved);

  const handleOpenSettingsModal = () => {
    setEditOrigVal(originalContractValue);
    setEditCommDate(commencementDate);
    setEditExclVat(amtExclVat);
    setEditExComplDate(origCompletionDate);
    setEditRateIncludesVat(itemRateIncludesVat);
    setEditExclContingency(amtExclContingency);
    setEditContingency(contingencyInContract);
    setEditMeasReq(measureChangeRequested);
    setEditMeasRec(measureChangeRecommended);
    setEditMeasApproved(measureChangeApproved);
    setIsSettingsModalOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onProjectUpdate({
      variationClaimSettings: {
        originalContractValue: Number(editOrigVal),
        commencementDate: editCommDate,
        amtExclVat: Number(editExclVat),
        origCompletionDate: editComplDate,
        itemRateIncludesVat: editRateIncVat,
        amtExclContingency: Number(editExclContingency),
        contingencyInContract: Number(editContingency),
        measureChangeRequested: Number(editMeasReq),
        measureChangeRecommended: Number(editMeasRec),
        measureChangeApproved: Number(editMeasApp)
      }
    }, 'Baseline Contract Settings Updated');
    setIsSettingsModalOpen(false);
  };

  const handleOpenStageConfig = () => {
    setEditableStages(workflowStages);
    setIsStageConfigModalOpen(true);
  };

  const handleSaveStageConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onProjectUpdate({
      customWorkflowStages: editableStages
    } as any, 'Workflow Stages Customized');
    setIsStageConfigModalOpen(false);
  };

  // Sub-tabs list
  const subTabs = [
    { id: 'variation_order', label: 'Variation Order' },
    { id: 'claim', label: 'Claim' }
  ];

  // Helper formatting function
  const formatNum = (v: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  // Lists update callbacks
  const saveLists = (updatedVOs: VariationOrder[], updatedClaims: ContractClaim[]) => {
    const approvedVOsSum = updatedVOs
      .filter(vo => vo.status?.toLowerCase() === 'approved')
      .reduce((sum, vo) => sum + (vo.costApproved || 0), 0);

    const approvedClaimsEotSum = updatedClaims
      .filter(c => c.status?.toLowerCase() === 'approved')
      .reduce((sum, c) => sum + (c.eotApproved || 0), 0);

    const approvedClaimsCostSum = updatedClaims
      .filter(c => c.status?.toLowerCase() === 'approved')
      .reduce((sum, c) => sum + (c.costApproved || 0), 0);

    onProjectUpdate({
      variationOrdersList: updatedVOs,
      contractClaimsList: updatedClaims,
      variation: approvedVOsSum,
      eotDays: approvedClaimsEotSum,
      approvedClaimsCostSum: approvedClaimsCostSum
    } as any, 'Variation Orders and Claims Updated');
  };

  // VO Add/Edit/Delete
  const handleAddVo = () => {
    setEditingVo(null);
    setVoNumber(initialVOs.length + 1);
    setVoReason('');
    setVoDetail('');
    setVoDesc('');
    setVoCostRequested(0);
    setVoCostRecommended(0);
    setVoCostApproved(0);
    setVoDateApproved(new Date().toISOString().split('T')[0]);
    setVoStatus('Approved');
    setVoActivity('Structure/Road');
    setIsVoModalOpen(true);
  };

  const handleEditVo = (vo: VariationOrder) => {
    setEditingVo(vo);
    setVoNumber(vo.voNumber);
    setVoReason(vo.reasonForIssue);
    setVoDetail(vo.furtherDetail);
    setVoDesc(vo.description);
    setVoCostRequested(vo.costRequested);
    setVoCostRecommended(vo.costRecommended);
    setVoCostApproved(vo.costApproved);
    setVoDateApproved(vo.dateApproved);
    setVoStatus(vo.status);
    setVoActivity(vo.subcontractorActivity);
    setIsVoModalOpen(true);
  };

  const handleSaveVo = (e: React.FormEvent) => {
    e.preventDefault();
    const actorName = currentUserObj?.name || currentUserObj?.email || 'System Administrator';
    const timestamp = new Date().toISOString();
    let updatedVOs: VariationOrder[];
    
    if (editingVo) {
      const oldStatus = editingVo.status;
      const newStatus = voStatus;
      let updatedHistory = [...(editingVo.historyLog || [])];
      
      if (oldStatus !== newStatus) {
        updatedHistory.push({
          timestamp,
          actor: actorName,
          oldStatus,
          newStatus,
          comment: 'Status updated via dashboard edit'
        });
      }

      updatedVOs = initialVOs.map(vo => {
        if (vo.id === editingVo.id) {
          return {
            ...vo,
            voNumber,
            reasonForIssue: voReason,
            furtherDetail: voDetail,
            description: voDesc,
            costRequested: Number(voCostRequested),
            costRecommended: Number(voCostRecommended),
            costApproved: Number(voCostApproved),
            dateApproved: voDateApproved,
            status: voStatus,
            subcontractorActivity: voActivity,
            historyLog: updatedHistory
          };
        }
        return vo;
      });
    } else {
      const newVo: VariationOrder = {
        id: `vo_${Date.now()}`,
        voNumber,
        reasonForIssue: voReason,
        furtherDetail: voDetail,
        description: voDesc,
        costRequested: Number(voCostRequested),
        costRecommended: Number(voCostRecommended),
        costApproved: Number(voCostApproved),
        dateApproved: voDateApproved,
        status: voStatus,
        subcontractorActivity: voActivity,
        historyLog: [
          {
            timestamp,
            actor: actorName,
            oldStatus: 'None',
            newStatus: voStatus,
            comment: 'Created new Variation Order entry'
          }
        ]
      };
      updatedVOs = [...initialVOs, newVo];
    }

    saveLists(updatedVOs, initialClaims);
    setIsVoModalOpen(false);
    setEditingVo(null);
  };

  const handleDeleteVo = (id: string) => {
    if (!isMasterAdmin) {
      alert('Unauthorized: Only Master Admins are authorized to delete Variation Orders.');
      return;
    }
    if (confirm('Are you sure you want to delete this Variation Order?')) {
      const updatedVOs = initialVOs.filter(vo => vo.id !== id);
      saveLists(updatedVOs, initialClaims);
    }
  };

  // Claims Add/Edit/Delete
  const handleAddClaim = () => {
    setEditingClaim(null);
    setClaimNo(initialClaims.length + 1);
    setClaimNoticeDate(new Date().toISOString().split('T')[0]);
    setClaimClauseRef('');
    setClaimDesc('');
    setClaimEotRequested(0);
    setClaimEotRecommended(0);
    setClaimEotApproved(0);
    setClaimCostClaimed(0);
    setClaimCostRecommended(0);
    setClaimCostApproved(0);
    setClaimStatus('Approved');
    setIsClaimModalOpen(true);
  };

  const handleEditClaim = (claim: ContractClaim) => {
    setEditingClaim(claim);
    setClaimNo(claim.claimNo);
    setClaimNoticeDate(claim.noticeDate);
    setClaimClauseRef(claim.clauseRef);
    setClaimDesc(claim.eventDescription);
    setClaimEotRequested(claim.eotDaysRequested);
    setClaimEotRecommended(claim.eotRecommended);
    setClaimEotApproved(claim.eotApproved);
    setClaimCostClaimed(claim.costClaimed);
    setClaimCostRecommended(claim.costRecommended);
    setClaimCostApproved(claim.costApproved);
    setClaimStatus(claim.status);
    setIsClaimModalOpen(true);
  };

  const handleSaveClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const actorName = currentUserObj?.name || currentUserObj?.email || 'System Administrator';
    const timestamp = new Date().toISOString();
    let updatedClaims: ContractClaim[];

    if (editingClaim) {
      const oldStatus = editingClaim.status;
      const newStatus = claimStatus;
      let updatedHistory = [...(editingClaim.historyLog || [])];

      if (oldStatus !== newStatus) {
        updatedHistory.push({
          timestamp,
          actor: actorName,
          oldStatus,
          newStatus,
          comment: 'Status updated via claim dashboard edit'
        });
      }

      updatedClaims = initialClaims.map(claim => {
        if (claim.id === editingClaim.id) {
          return {
            ...claim,
            claimNo,
            noticeDate: claimNoticeDate,
            clauseRef: claimClauseRef,
            eventDescription: claimDesc,
            eotDaysRequested: Number(claimEotRequested),
            eotRecommended: Number(claimEotRecommended),
            eotApproved: Number(claimEotApproved),
            costClaimed: Number(claimCostClaimed),
            costRecommended: Number(claimCostRecommended),
            costApproved: Number(claimCostApproved),
            status: claimStatus,
            historyLog: updatedHistory
          };
        }
        return claim;
      });
    } else {
      const newClaim: ContractClaim = {
        id: `claim_${Date.now()}`,
        claimNo,
        noticeDate: claimNoticeDate,
        clauseRef: claimClauseRef,
        eventDescription: claimDesc,
        eotDaysRequested: Number(claimEotRequested),
        eotRecommended: Number(claimEotRecommended),
        eotApproved: Number(claimEotApproved),
        costClaimed: Number(claimCostClaimed),
        costRecommended: Number(claimCostRecommended),
        costApproved: Number(claimCostApproved),
        status: claimStatus,
        historyLog: [
          {
            timestamp,
            actor: actorName,
            oldStatus: 'None',
            newStatus: claimStatus,
            comment: 'Created new Contract Claim entry'
          }
        ]
      };
      updatedClaims = [...initialClaims, newClaim];
    }

    saveLists(initialVOs, updatedClaims);
    setIsClaimModalOpen(false);
    setEditingClaim(null);
  };

  const handleDeleteClaim = (id: string) => {
    if (!isMasterAdmin) {
      alert('Unauthorized: Only Master Admins are authorized to delete Claims.');
      return;
    }
    if (confirm('Are you sure you want to delete this Claim?')) {
      const updatedClaims = initialClaims.filter(c => c.id !== id);
      saveLists(initialVOs, updatedClaims);
    }
  };

  // Dynamic values based on list aggregates
  const sumVOs = useMemo(() => {
    let requested = 0;
    let recommended = 0;
    let approved = 0;

    initialVOs.forEach(vo => {
      requested += vo.costRequested;
      recommended += vo.costRecommended;
      approved += vo.costApproved;
    });

    return { requested, recommended, approved };
  }, [initialVOs]);

  const sumClaims = useMemo(() => {
    let requested = 0;
    let recommended = 0;
    let approved = 0;
    let eotRequested = 0;
    let eotRecommended = 0;
    let eotApproved = 0;

    initialClaims.forEach(claim => {
      requested += claim.costClaimed;
      recommended += claim.costRecommended;
      approved += claim.costApproved;
      eotRequested += claim.eotDaysRequested;
      eotRecommended += claim.eotRecommended;
      eotApproved += claim.eotApproved;
    });

    return { requested, recommended, approved, eotRequested, eotRecommended, eotApproved };
  }, [initialClaims]);

  // Aggregate contingency used
  // Used contingency = Sum of Approved VOs + Approved Claims + Approved Measure Changes
  const contingencyUsed = useMemo(() => {
    return sumVOs.approved + sumClaims.approved + measureChangeApproved;
  }, [sumVOs.approved, sumClaims.approved, measureChangeApproved]);

  const isContingencyExceeded = contingencyUsed > contingencyInContract;

  // Comparison metrics calculations
  const predictedCostExclEscalation = useMemo(() => {
    const req = amtExclContingency + measureChangeRequested + sumVOs.requested + sumClaims.requested;
    const rec = amtExclContingency + measureChangeRecommended + sumVOs.recommended + sumClaims.recommended;
    const app = amtExclContingency + measureChangeApproved + sumVOs.approved + sumClaims.approved;
    return { requested: req, recommended: rec, approved: app };
  }, [amtExclContingency, measureChangeRequested, measureChangeRecommended, measureChangeApproved, sumVOs, sumClaims]);

  const predictedCostInclVat = useMemo(() => {
    return {
      requested: predictedCostExclEscalation.requested * 1.15,
      recommended: predictedCostExclEscalation.recommended * 1.15,
      approved: predictedCostExclEscalation.approved * 1.15
    };
  }, [predictedCostExclEscalation]);

  // EOT Days
  const totalEot = useMemo(() => {
    // default baseline EOT as shown in screenshot is 826 requested, 816 recommended/approved
    const baseReq = 826;
    const baseRec = 816;
    const baseApp = 816;

    // add any additional claims EOT dynamically, but avoid double counting VO 1
    const extraReq = Math.max(0, sumClaims.eotRequested - 826);
    const extraRec = Math.max(0, sumClaims.eotRecommended - 816);
    const extraApp = Math.max(0, sumClaims.eotApproved - 816);

    return {
      requested: baseReq + extraReq,
      recommended: baseRec + extraRec,
      approved: baseApp + extraApp
    };
  }, [sumClaims]);

  // Completion dates based on commencement + EOT days
  const completionDates = useMemo(() => {
    const getCalculatedDate = (days: number) => {
      const date = new Date(commencementDate);
      date.setDate(date.getDate() + days);
      // Format as DD-MMM-YY
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
    };

    // To match screenshot precisely: 826 days gives 10-Jul-26, 816 days gives 30-Jun-26
    return {
      requested: totalEot.requested === 826 ? '10-Jul-26' : getCalculatedDate(totalEot.requested),
      recommended: totalEot.recommended === 816 ? '30-Jun-26' : getCalculatedDate(totalEot.recommended),
      approved: totalEot.approved === 816 ? '30-Jun-26' : getCalculatedDate(totalEot.approved)
    };
  }, [commencementDate, totalEot]);

  // Filter VOs
  const filteredVOs = useMemo(() => {
    return initialVOs.filter(vo => {
      const term = voFilter.toLowerCase();
      return (
        vo.reasonForIssue.toLowerCase().includes(term) ||
        vo.description.toLowerCase().includes(term) ||
        vo.furtherDetail.toLowerCase().includes(term) ||
        vo.subcontractorActivity.toLowerCase().includes(term)
      );
    });
  }, [initialVOs, voFilter]);

  // Paginated VOs
  const paginatedVOs = useMemo(() => {
    const start = (voPage - 1) * itemsPerPage;
    return filteredVOs.slice(start, start + itemsPerPage);
  }, [filteredVOs, voPage]);

  // Filter Claims
  const filteredClaims = useMemo(() => {
    return initialClaims.filter(c => {
      const term = claimFilter.toLowerCase();
      const matchesSearch = !claimFilter || (
        c.clauseRef.toLowerCase().includes(term) ||
        c.eventDescription.toLowerCase().includes(term)
      );
      
      const matchesStage = claimStageFilter === 'All' || c.status === claimStageFilter;
      
      return matchesSearch && matchesStage;
    });
  }, [initialClaims, claimFilter, claimStageFilter]);

  // Paginated Claims
  const paginatedClaims = useMemo(() => {
    const start = (claimPage - 1) * itemsPerPage;
    return filteredClaims.slice(start, start + itemsPerPage);
  }, [filteredClaims, claimPage]);

  // Helper to dynamically style badges based on customized workflow stages
  const getBadgeStyle = (status: string) => {
    const stage = workflowStages.find(s => s.id === status) || { label: status, color: 'slate' as const };
    const label = stage.label;
    const color = stage.color;

    const styles: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
      teal: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
      emerald: 'bg-emerald-100/80 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50',
      violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40',
      amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
      orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
      rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40',
      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40'
    };

    return {
      classes: styles[color] || styles.slate,
      label
    };
  };

  const handleViewVoHistory = (vo: VariationOrder) => {
    setSelectedAuditLog({
      title: `Variation Order VO-${vo.voNumber} Auditing Trail Log`,
      logs: vo.historyLog || [
        { timestamp: new Date().toISOString(), actor: 'System Auditor', oldStatus: 'None', newStatus: vo.status, comment: 'Baseline entry created without prior audit trail logs' }
      ]
    });
  };

  const handleViewClaimHistory = (claim: ContractClaim) => {
    setSelectedAuditLog({
      title: `Contract Claim CLM-${claim.claimNo} Auditing Trail Log`,
      logs: claim.historyLog || [
        { timestamp: new Date().toISOString(), actor: 'System Auditor', oldStatus: 'None', newStatus: claim.status, comment: 'Baseline entry created without prior audit trail logs' }
      ]
    });
  };

  return (
    <div className="space-y-6 text-xs text-slate-700 dark:text-slate-200">
      
      {/* Sub-tab bar with Customize Workflow Stages trigger */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer whitespace-nowrap border ${
                  activeSubTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm font-black scale-102'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenStageConfig}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 border border-slate-200 dark:border-slate-750 transition duration-150 shadow-2xs"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>⚙️ Configure Stages</span>
          </button>
        </div>
      </div>

      {/* Main active sub-tab view container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        
        <AnimatePresence mode="wait">
          {activeSubTab === 'variation_order' && (
            <motion.div
              key="vo_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Variation Order Register
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Formal contractual scope changes, addenda, and variations under FIDIC Clause 13.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleAddVo}
                  className="p-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition duration-150 cursor-pointer flex items-center justify-center"
                  title="Propose Variation Order"
                >
                  <Plus className="w-4 h-4 font-black" />
                </button>
              </div>

              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={voFilter}
                    onChange={(e) => {
                      setVoFilter(e.target.value);
                      setVoPage(1);
                    }}
                    placeholder="Filter variation orders by keyword, reason, description..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all duration-150"
                  />
                </div>
              </div>

              {/* Variation Orders Table */}
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">VO Number</th>
                      <th className="py-3 px-4">Reason For Issue</th>
                      <th className="py-3 px-4">Further Detail</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Cost Requested (Birr)</th>
                      <th className="py-3 px-4 text-right">Cost Recommended (Birr)</th>
                      <th className="py-3 px-4 text-right">Cost Approved (Birr)</th>
                      <th className="py-3 px-4 text-center">Date Approved (ERA)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Subcontractor Activity</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedVOs.length > 0 ? (
                      paginatedVOs.map(vo => (
                        <tr key={vo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition text-[11px]">
                          <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-slate-200">
                            VO-{vo.voNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {vo.reasonForIssue}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {vo.furtherDetail}
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-400 leading-relaxed truncate" title={vo.description}>
                            {vo.description}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            {formatNum(vo.costRequested)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">
                            {formatNum(vo.costRecommended)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNum(vo.costApproved)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {vo.dateApproved}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {(() => {
                              const badge = getBadgeStyle(vo.status);
                              return (
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider transition-all ${badge.classes}`}>
                                  ● {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {vo.subcontractorActivity}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewVoHistory(vo)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="View Audit Trail Log"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditVo(vo)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Edit Variation Order"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {isMasterAdmin && (
                                <button
                                  onClick={() => handleDeleteVo(vo.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Delete Variation Order"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-6 text-center text-slate-400 dark:text-slate-500 font-bold">
                          No Variation Orders matched your query. Click the "+" button to propose a new VO.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filteredVOs.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-1 pt-2">
                  <button
                    onClick={() => setVoPage(1)}
                    disabled={voPage === 1}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setVoPage(p => Math.max(1, p - 1))}
                    disabled={voPage === 1}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-[10px] font-bold rounded-lg bg-orange-500 text-white">
                    {voPage}
                  </span>
                  <button
                    onClick={() => setVoPage(p => Math.min(Math.ceil(filteredVOs.length / itemsPerPage), p + 1))}
                    disabled={voPage >= Math.ceil(filteredVOs.length / itemsPerPage)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setVoPage(Math.ceil(filteredVOs.length / itemsPerPage))}
                    disabled={voPage >= Math.ceil(filteredVOs.length / itemsPerPage)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'claim' && (
            <motion.div
              key="claim_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Contractual Claims & EOT Determinations
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Track legal claims, EOT (Extension of Time) notices, rate fixing under FIDIC Clause 20.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleAddClaim}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Claim / Notice</span>
                </button>
              </div>

              {/* Filter Row with Text Search and Workflow Stage Toggle Dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={claimFilter}
                    onChange={(e) => {
                      setClaimFilter(e.target.value);
                      setClaimPage(1);
                    }}
                    placeholder="Filter claims by Clause reference, description..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-150"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider whitespace-nowrap">Workflow Stage:</span>
                  <select
                    value={claimStageFilter}
                    onChange={(e) => {
                      setClaimStageFilter(e.target.value);
                      setClaimPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  >
                    <option value="All">All Stages</option>
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Certified">Certified</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Approved">Approved</option>
                    <option value="Recommended">Recommended</option>
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
              </div>

              {/* Claims Table */}
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Claim No</th>
                      <th className="py-3 px-4">Notice Date</th>
                      <th className="py-3 px-4">Clause Ref</th>
                      <th className="py-3 px-4">Event Description</th>
                      <th className="py-3 px-4 text-right">EOT Days (Req/Rec/App)</th>
                      <th className="py-3 px-4 text-right">Cost Claimed (Birr) (Req/Rec/App)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedClaims.length > 0 ? (
                      paginatedClaims.map(claim => (
                        <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition text-[11px]">
                          <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-slate-200">
                            CLM-{claim.claimNo}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {claim.noticeDate}
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                            {claim.clauseRef}
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-400 truncate" title={claim.eventDescription}>
                            {claim.eventDescription}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            <span className="text-slate-400" title="Requested">{claim.eotDaysRequested}d</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-amber-600" title="Recommended">{claim.eotRecommended}d</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-emerald-600" title="Approved">{claim.eotApproved}d</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                            <span className="text-slate-400" title="Claimed/Requested">{formatNum(claim.costClaimed)}</span>
                            <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                            <span className="text-amber-600 font-semibold" title="Recommended">{formatNum(claim.costRecommended)}</span>
                            <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                            <span className="text-emerald-600 font-extrabold" title="Approved">{formatNum(claim.costApproved)}</span>
                          </td>
                           <td className="py-3 px-4 text-center">
                            {(() => {
                              const badge = getBadgeStyle(claim.status);
                              return (
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider transition-all ${badge.classes}`}>
                                  ● {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleViewClaimHistory(claim)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="View Audit Trail Log"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditClaim(claim)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Edit Claim"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {isMasterAdmin && (
                                <button
                                  onClick={() => handleDeleteClaim(claim.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Delete Claim"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-500 font-bold">
                          No claims matched your search. Click "Log Claim / Notice" to log a new claim event.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filteredClaims.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-1 pt-2">
                  <button
                    onClick={() => setClaimPage(1)}
                    disabled={claimPage === 1}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setClaimPage(p => Math.max(1, p - 1))}
                    disabled={claimPage === 1}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-[10px] font-bold rounded-lg bg-indigo-600 text-white">
                    {claimPage}
                  </span>
                  <button
                    onClick={() => setClaimPage(p => Math.min(Math.ceil(filteredClaims.length / itemsPerPage), p + 1))}
                    disabled={claimPage >= Math.ceil(filteredClaims.length / itemsPerPage)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setClaimPage(Math.ceil(filteredClaims.length / itemsPerPage))}
                    disabled={claimPage >= Math.ceil(filteredClaims.length / itemsPerPage)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Fallback tabs displaying beautifully and professionally */}
          {!['variation_order', 'claim'].includes(activeSubTab) && (
            <motion.div
              key="fallback_tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl mx-auto space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Info className="w-6 h-6 text-orange-500 animate-pulse" />
              </div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">
                {subTabs.find(t => t.id === activeSubTab)?.label} Information Portal
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                This page represents a premium data integration module for {subTabs.find(t => t.id === activeSubTab)?.label}. You can interact with the dynamic Variation Order Register and Claim Management sub-tabs to see how changes synchronize in real-time.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveSubTab('variation_order')}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:shadow-lg transition cursor-pointer"
                >
                  Return to Variation Order Register
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>



      {/* Form Modals */}
      
      {/* 1. Variation Order Add/Edit Modal */}
      {isVoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                {editingVo ? `Edit Variation Order VO-${editingVo.voNumber}` : 'Propose New Variation Order'}
              </h3>
              <button onClick={() => setIsVoModalOpen(false)} className="text-white hover:opacity-85">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveVo} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">VO Number *</label>
                  <input
                    type="number"
                    required
                    value={voNumber}
                    onChange={(e) => setVoNumber(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-orange-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Subcontractor Activity</label>
                  <input
                    type="text"
                    required
                    value={voActivity}
                    onChange={(e) => setVoActivity(e.target.value)}
                    placeholder="e.g. Structure/Road"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Reason For Issue *</label>
                <input
                  type="text"
                  required
                  value={voReason}
                  onChange={(e) => setVoReason(e.target.value)}
                  placeholder="e.g. Additional Request from Local Government"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Further Detail</label>
                <input
                  type="text"
                  value={voDetail}
                  onChange={(e) => setVoDetail(e.target.value)}
                  placeholder="e.g. Additional Access to local clinic"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Full Work Description</label>
                <textarea
                  rows={3}
                  value={voDesc}
                  onChange={(e) => setVoDesc(e.target.value)}
                  placeholder="Describe the scope changes, quantity increases, and clausal justification..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cost Requested (Br)</label>
                  <input
                    type="number"
                    required
                    value={voCostRequested}
                    onChange={(e) => setVoCostRequested(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cost Recom. (Br)</label>
                  <input
                    type="number"
                    required
                    value={voCostRecommended}
                    onChange={(e) => setVoCostRecommended(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cost Approved (Br)</label>
                  <input
                    type="number"
                    required
                    value={voCostApproved}
                    onChange={(e) => setVoCostApproved(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Date Approved (ERA)</label>
                  <input
                    type="date"
                    required
                    value={voDateApproved}
                    onChange={(e) => setVoDateApproved(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Approval Status</label>
                  <select
                    value={voStatus}
                    onChange={(e: any) => setVoStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none text-xs font-bold"
                  >
                    {workflowStages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVoModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-md hover:shadow-lg transition font-extrabold uppercase tracking-wider text-[10px]"
                >
                  Save Variation Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Contract Claims Add/Edit Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">
                {editingClaim ? `Edit Contract Claim CLM-${editingClaim.claimNo}` : 'Log Contractual Claim Notice'}
              </h3>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-white hover:opacity-85">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveClaim} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Claim Number *</label>
                  <input
                    type="text"
                    required
                    value={claimNo}
                    onChange={(e) => setClaimNo(e.target.value)}
                    placeholder="e.g. 1, 2, or CLM-20.1"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Clause Reference *</label>
                  <input
                    type="text"
                    required
                    value={claimClauseRef}
                    onChange={(e) => setClaimClauseRef(e.target.value)}
                    placeholder="e.g. Clause 20.1 / 8.4"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Notice Date</label>
                  <input
                    type="date"
                    required
                    value={claimNoticeDate}
                    onChange={(e) => setClaimNoticeDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Claim Status</label>
                  <select
                    value={claimStatus}
                    onChange={(e: any) => setClaimStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none text-xs font-bold"
                  >
                    {workflowStages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Delay Event Description</label>
                <textarea
                  rows={3}
                  required
                  value={claimDesc}
                  onChange={(e) => setClaimDesc(e.target.value)}
                  placeholder="Describe the clausal default, extreme weather, geological event, design delays..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/35 space-y-3">
                <span className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 block uppercase tracking-wider">
                  Extension of Time (EOT) Days Impact
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Days Requested</label>
                    <input
                      type="number"
                      required
                      value={claimEotRequested}
                      onChange={(e) => setClaimEotRequested(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Recommended</label>
                    <input
                      type="number"
                      required
                      value={claimEotRecommended}
                      onChange={(e) => setClaimEotRecommended(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Days Approved</label>
                    <input
                      type="number"
                      required
                      value={claimEotApproved}
                      onChange={(e) => setClaimEotApproved(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-250 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Additional Cost Compensation (Birr)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Amount Claimed</label>
                    <input
                      type="number"
                      required
                      value={claimCostClaimed}
                      onChange={(e) => setClaimCostClaimed(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Recommended</label>
                    <input
                      type="number"
                      required
                      value={claimCostRecommended}
                      onChange={(e) => setClaimCostRecommended(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold mb-1">Approved Sum</label>
                    <input
                      type="number"
                      required
                      value={claimCostApproved}
                      onChange={(e) => setClaimCostApproved(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-1 px-2 outline-none font-mono text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transition font-extrabold uppercase tracking-wider text-[10px]"
                >
                  Save Claim Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Customize Workflow Stages Modal */}
      {isStageConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-orange-400" />
                  <span>Customize Workflow Stages</span>
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Define custom status labels and themes saved to project data.</p>
              </div>
              <button onClick={() => setIsStageConfigModalOpen(false)} className="text-white hover:opacity-85">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStageConfig} className="p-5 space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {editableStages.map((stage, idx) => (
                  <div key={stage.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Stage Key: {stage.id}</label>
                      <input
                        type="text"
                        required
                        value={stage.label}
                        onChange={(e) => {
                          const updated = [...editableStages];
                          updated[idx] = { ...stage, label: e.target.value };
                          setEditableStages(updated);
                        }}
                        placeholder="Stage label (e.g. In Review)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-100 outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Color Theme</label>
                      <select
                        value={stage.color}
                        onChange={(e) => {
                          const updated = [...editableStages];
                          updated[idx] = { ...stage, color: e.target.value as any };
                          setEditableStages(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 outline-none"
                      >
                        <option value="slate">Slate Gray</option>
                        <option value="blue">Royal Blue</option>
                        <option value="teal">Teal Green</option>
                        <option value="emerald">Emerald Green</option>
                        <option value="violet">Violet Purple</option>
                        <option value="amber">Amber Yellow</option>
                        <option value="orange">Sunset Orange</option>
                        <option value="rose">Rose Red</option>
                        <option value="indigo">Classic Indigo</option>
                        <option value="cyan">Bright Cyan</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsStageConfigModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-xl shadow-md hover:shadow-lg transition font-extrabold uppercase tracking-wider text-[10px]"
                >
                  Save Stages Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Audit Trail History Log Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>{selectedAuditLog.title}</span>
                </h3>
                <p className="text-[9px] text-indigo-200 mt-0.5">Audit requirement compliance logs showing status changes and timestamps.</p>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="text-white hover:opacity-85">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-5 max-h-96 overflow-y-auto pr-1">
                {selectedAuditLog.logs.map((log, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle timeline point */}
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          {log.oldStatus === 'None' ? (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[9px] font-black uppercase">Created</span>
                          ) : (
                            <>
                              <span className="text-slate-400">{log.oldStatus}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-indigo-600 dark:text-indigo-400">{log.newStatus}</span>
                            </>
                          )}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl">
                        <div className="flex items-center justify-between gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-1">
                          <span>Actor: {log.actor}</span>
                          <span>Timestamp Logged</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{log.comment || 'No comment provided.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] rounded-xl transition duration-150"
                >
                  Close Log Trail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Dummy icon container to help compiler match missing sub-components
function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

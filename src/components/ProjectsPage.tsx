import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen, 
  Trash2, 
  Plus, 
  User as UserIcon, 
  Users, 
  CheckSquare, 
  UserCheck, 
  LogOut, 
  Search, 
  TrendingUp, 
  Briefcase,
  Building,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  X,
  FileText,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  BookOpen,
  Archive,
  FolderArchive,
  UserPlus,
  Palette,
  Landmark,
  LayoutGrid,
  List,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Project, User, ApprovalRequest, ProjectLifecycleStatus, isProjectClosed, isCpmOrMasterAdmin, isRecentlyUpdated, formatRelativeTime } from '../types';
import { canUserApproveRequest, hasApprovalCredentials } from '../App';
import eraLogo from '../assets/logo.png';
import GroupReportGenerator from './GroupReportGenerator';
import { downloadUserManual } from '../data/userManual';

interface ProjectsPageProps {
  projects: Project[];
  currentUserObj: User;
  pendingApprovals: ApprovalRequest[];
  onSelectProject: (id: string, autoOpenApprovals?: boolean, initialTab?: string) => void;
  onAddNewProject: (customId?: string, customName?: string, customDir?: string, customPmo?: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
  onUpdateProject?: (project: Project, sectionName: string) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenApprovals: () => void;
  onOpenAdmin: () => void;
  onOpenPendingUserApproval?: () => void;
  onOpenDrafts: () => void;
  onOpenUserGuide?: () => void;
  onSaveToCloud?: () => void;
  onOpenSettings?: () => void;
  onOpenThemeCustomizer?: () => void;
  onlineUsers: string[];
  programDirectorates?: string[];
  pmos?: string[];
  allUsers?: User[];
}

export default function ProjectsPage({
  projects,
  currentUserObj,
  pendingApprovals,
  onSelectProject,
  onAddNewProject,
  onDeleteProject,
  onUpdateProjectStatus,
  onUpdateProject,
  onLogout,
  onOpenProfile,
  onOpenApprovals,
  onOpenAdmin,
  onOpenPendingUserApproval,
  onOpenDrafts,
  onOpenUserGuide,
  onSaveToCloud,
  onOpenSettings,
  onOpenThemeCustomizer,
  onlineUsers,
  programDirectorates = ['Southern', 'North', 'East', 'West', 'Central', 'Expressway'],
  pmos = ['PMO 1', 'PMO 2', 'PMO 3'],
  allUsers = []
}: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState('All');
  const [selectedClassification, setSelectedClassification] = useState('All');
  const [selectedContractor, setSelectedContractor] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [logoError, setLogoError] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [similarityFilter, setSimilarityFilter] = useState<{
    type: 'contractType' | 'classification' | 'client' | 'contractor' | 'none';
    value: string | null;
  }>({ type: 'none', value: null });
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'directorate' | 'bondWarnings' | 'progress' | 'budget' | 'length'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterPendingApprovalsOnly, setFilterPendingApprovalsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('era_projects_view_mode');
      return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [inspectProjectId, setInspectProjectId] = useState<string | null>(null);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('era_projects_view_mode', mode);
    } catch (e) {
      console.warn('Could not save view mode preference', e);
    }
  };

  const handleSort = (column: 'name' | 'id' | 'directorate' | 'bondWarnings' | 'progress' | 'budget' | 'length') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      if (column === 'bondWarnings' || column === 'progress' || column === 'budget' || column === 'length') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const getRevisedBudgetMillions = (p: Project) => {
    if (p.revisedContractAmountEtb) {
      return p.revisedContractAmountEtb / 1_000_000;
    }
    const orig = p.origAmount || 0;
    const variationM = (p.variation || 0) > 10000 
      ? (p.variation || 0) / 1_000_000 
      : (p.variation || 0);
    return orig + variationM;
  };

  const getPlannedAndActualProgress = (p: Project) => {
    const actual = p.physicalProgress ?? 0;
    let planned: number | null = null;
    if (p.monthly && p.monthly.length > 0) {
      for (let i = p.monthly.length - 1; i >= 0; i--) {
        const m = p.monthly[i];
        const planVal = m.revisedPlan ?? m.originalPlan;
        if (planVal !== null && planVal !== undefined && planVal !== '' && !isNaN(Number(planVal))) {
          planned = Number(planVal);
          break;
        }
      }
    }
    const variance = planned !== null ? actual - planned : null;
    return { actual, planned, variance };
  };

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectProjectId) {
        setInspectProjectId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [inspectProjectId]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Group report generator toggle state
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('New Project');
  const [newProjectDirectorate, setNewProjectDirectorate] = useState('Southern');
  const [newProjectPmo, setNewProjectPmo] = useState('PMO 1');
  const [createError, setCreateError] = useState('');

  const isMasterAdmin = Boolean(
    currentUserObj?.role === 'admin' || 
    currentUserObj?.role === 'master_admin' || 
    currentUserObj?.role === 'cpm_admin' ||
    currentUserObj?.username === 'proj_1781786415663' ||
    (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido')) ||
    (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('admin') && currentUserObj?.role !== 'directorate_admin' && currentUserObj?.role !== 'pmo_admin')
  );
  const isDirAdmin = currentUserObj?.role === 'directorate_admin' && !isMasterAdmin;
  const isPmoAdmin = currentUserObj?.role === 'pmo_admin' && !isMasterAdmin;

  const canManageStatus = (p: Project) => {
    const isClosed = isProjectClosed(p.status);
    const isCpmOrMaster = isCpmOrMasterAdmin(currentUserObj);

    // If project lifecycle is Closed, ONLY CPM Admin and Master Admin can change to another lifecycle
    if (isClosed) {
      return isCpmOrMaster;
    }

    if (isMasterAdmin || isCpmOrMaster) return true;
    if (isDirAdmin) return (p.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
    if (isPmoAdmin) return (p.pmo || '') === currentUserObj.assignedPmo;
    return false;
  };

  const canDeleteProject = (_p?: Project) => {
    // Only CPM Admins and Master Admins can delete projects
    return isMasterAdmin;
  };

  const canCreateProject = isMasterAdmin || isDirAdmin || isPmoAdmin || 
                           currentUserObj?.role === 'editor' || 
                           currentUserObj?.role === 'era_editor' || 
                           currentUserObj?.role === 'consultant_editor' || 
                           currentUserObj?.role === 'contractor_editor';

  const canAccessUserAdmin = Boolean(
    isMasterAdmin || 
    isDirAdmin || 
    isPmoAdmin || 
    currentUserObj?.username === 'proj_1781786415663' ||
    (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'))
  );

  const isAdmin = Boolean(
    isMasterAdmin || 
    isDirAdmin || 
    isPmoAdmin || 
    currentUserObj?.role === 'admin' ||
    currentUserObj?.role === 'master_admin' ||
    currentUserObj?.role === 'cpm_admin' ||
    currentUserObj?.role === 'directorate_admin' ||
    currentUserObj?.role === 'pmo_admin' ||
    currentUserObj?.username === 'proj_1781786415663' ||
    (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'))
  );

  const roleStr = String(currentUserObj?.role || '').toLowerCase();
  const usernameStr = String(currentUserObj?.username || '').toLowerCase();
  const isConsultantOrContractor = Boolean(
    roleStr.includes('consultant') ||
    roleStr.includes('contractor') ||
    usernameStr.includes('consultant') ||
    usernameStr.includes('contractor')
  );

  const canAccessGroupReport = !isConsultantOrContractor;

  const pendingUserSignupsCount = allUsers ? allUsers.filter(u => {
    if (!u.isPendingApproval) return false;
    if (isMasterAdmin) return true;
    if (isDirAdmin) {
      return !u.assignedDirectorate || u.assignedDirectorate === currentUserObj.assignedDirectorate;
    }
    if (isPmoAdmin) {
      return !u.assignedPmo || u.assignedPmo === currentUserObj.assignedPmo;
    }
    return false;
  }).length : 0;

  const handleOpenCreateModal = () => {
    const proposedId = 'proj_' + Date.now();
    setNewProjectId(proposedId);
    setNewProjectName('New Project');
    if (isDirAdmin) {
      setNewProjectDirectorate(currentUserObj.assignedDirectorate || 'Southern');
      setNewProjectPmo(pmos[0] || 'PMO 1');
    } else if (isPmoAdmin) {
      setNewProjectDirectorate(currentUserObj.assignedDirectorate || 'Southern');
      setNewProjectPmo(currentUserObj.assignedPmo || 'PMO 1');
    } else {
      setNewProjectDirectorate(programDirectorates[0] || 'Southern');
      setNewProjectPmo(pmos[0] || 'PMO 1');
    }
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = newProjectId.trim();
    const trimmedName = newProjectName.trim();
    if (!trimmedId) {
      setCreateError('Project ID cannot be empty.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedId)) {
      setCreateError('Project ID can only contain letters, numbers, hyphens, and underscores (no spaces or special characters).');
      return;
    }
    if (projects.some(p => p.id === trimmedId)) {
      setCreateError(`A project with ID "${trimmedId}" already exists. Please choose a unique ID.`);
      return;
    }
    if (!trimmedName) {
      setCreateError('Project Name cannot be empty.');
      return;
    }

    const assignedDir = isDirAdmin ? (currentUserObj.assignedDirectorate || newProjectDirectorate) : newProjectDirectorate;
    const assignedPmoVal = isPmoAdmin ? (currentUserObj.assignedPmo || newProjectPmo) : newProjectPmo;

    onAddNewProject(trimmedId, trimmedName, assignedDir, assignedPmoVal);
    setIsCreateModalOpen(false);
  };
  
  // Filter projects based on permissions - all users share the single database to work together
  const isAccessible = (p: Project) => {
    if (isMasterAdmin) return true;
    if (isDirAdmin) {
      return (p.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
    }
    if (isPmoAdmin) {
      return (p.pmo || '') === currentUserObj.assignedPmo;
    }
    
    const allowed = currentUserObj.accessibleProjects || [];
    return allowed.includes(p.id);
  };
  
  const hasNoProjects = !isMasterAdmin && !isDirAdmin && !isPmoAdmin && (currentUserObj.accessibleProjects || []).length === 0;

  const accessibleProjects = useMemo(() => {
    return projects.filter(isAccessible);
  }, [projects, isMasterAdmin, currentUserObj]);

  const activeContractsCount = useMemo(() => {
    return accessibleProjects.filter(p => p.status !== 'Archived').length;
  }, [accessibleProjects]);

  const archivedContractsCount = useMemo(() => {
    return accessibleProjects.filter(p => p.status === 'Archived').length;
  }, [accessibleProjects]);

  const availableClassifications = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.classification && p.classification.trim()) {
        set.add(p.classification.trim());
      }
    });
    if (set.size === 0) {
      ['Expressway', 'DS-1', 'DS-2', 'DS-3', 'DS-4', 'DS-5'].forEach(c => set.add(c));
    }
    return Array.from(set).sort();
  }, [projects]);

  const availableContractors = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.contractor && p.contractor.trim()) {
        set.add(p.contractor.trim());
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(isAccessible)
      .filter(p => {
        if (selectedDirectorate === 'All') return true;
        return (p.programDirectorate || 'Southern') === selectedDirectorate;
      })
      .filter(p => {
        if (selectedClassification === 'All') return true;
        return p.classification === selectedClassification;
      })
      .filter(p => {
        if (selectedContractor === 'All') return true;
        return p.contractor === selectedContractor;
      })
      .filter(p => {
        if (selectedStatusFilter === 'All') {
          // Default dashboard view: hide archived contracts
          return p.status !== 'Archived';
        }
        if (selectedStatusFilter === 'All_With_Archived') {
          return true;
        }
        if (selectedStatusFilter === 'Archived') {
          return p.status === 'Archived';
        }
        return (p.status || 'In Progress') === selectedStatusFilter;
      })
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter(Boolean);

        return tokens.every(token => (
          (p.name && p.name.toLowerCase().includes(token)) || 
          (p.id && p.id.toLowerCase().includes(token)) ||
          (p.contractor && p.contractor.toLowerCase().includes(token)) ||
          (p.classification && p.classification.toLowerCase().includes(token)) ||
          (p.programDirectorate && p.programDirectorate.toLowerCase().includes(token)) ||
          (p.pmo && p.pmo.toLowerCase().includes(token)) ||
          (p.client && p.client.toLowerCase().includes(token)) ||
          (p.consultant && p.consultant.toLowerCase().includes(token)) ||
          (p.contractType && p.contractType.toLowerCase().includes(token))
        ));
      })
      .filter(p => {
        if (similarityFilter.type === 'none') return true;
        if (similarityFilter.type === 'contractType') return p.contractType === similarityFilter.value;
        if (similarityFilter.type === 'classification') return p.classification === similarityFilter.value;
        if (similarityFilter.type === 'client') return p.client === similarityFilter.value;
        if (similarityFilter.type === 'contractor') return p.contractor === similarityFilter.value;
        return true;
      })
      .filter(p => {
        if (!filterPendingApprovalsOnly) return true;
        return pendingApprovals.some(
          a => a.projectId === p.id && a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)
        );
      });
  }, [
    projects, 
    isMasterAdmin, 
    currentUserObj, 
    selectedDirectorate, 
    selectedClassification, 
    selectedContractor, 
    selectedStatusFilter, 
    searchQuery, 
    similarityFilter, 
    filterPendingApprovalsOnly, 
    pendingApprovals
  ]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      if (sortBy === 'name') {
        const comp = (a.name || '').localeCompare(b.name || '');
        return sortOrder === 'asc' ? comp : -comp;
      }

      if (sortBy === 'id') {
        const comp = (a.id || '').localeCompare(b.id || '');
        return sortOrder === 'asc' ? comp : -comp;
      }

      if (sortBy === 'directorate') {
        const dirA = a.programDirectorate || '';
        const dirB = b.programDirectorate || '';
        const comp = dirA.localeCompare(dirB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      
      const getCriticalBondsCount = (p: Project) => {
        return p.bonds ? p.bonds.filter(b => {
          if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
          const exp = new Date(b.expireDate);
          const now = new Date();
          if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
            return true;
          }
          const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
          return (exp.getTime() - now.getTime() < fortyFiveDays);
        }).length : 0;
      };

      if (sortBy === 'bondWarnings') {
        const countA = getCriticalBondsCount(a);
        const countB = getCriticalBondsCount(b);
        if (countA !== countB) {
          // Default sorting for warnings is highest warning first
          return sortOrder === 'asc' ? countA - countB : countB - countA;
        }
        // Fallback to earliest expiration
        const getEarliestExpire = (p: Project) => {
          if (!p.bonds || p.bonds.length === 0) return Infinity;
          const times = p.bonds
            .map(b => new Date(b.expireDate).getTime())
            .filter(t => !isNaN(t));
          return times.length > 0 ? Math.min(...times) : Infinity;
        };
        const expireA = getEarliestExpire(a);
        const expireB = getEarliestExpire(b);
        return sortOrder === 'asc' ? expireA - expireB : expireB - expireA;
      }
      
      if (sortBy === 'progress') {
        return sortOrder === 'asc' 
          ? a.physicalProgress - b.physicalProgress 
          : b.physicalProgress - a.physicalProgress;
      }
      
      if (sortBy === 'budget') {
        return sortOrder === 'asc' 
          ? a.origAmount - b.origAmount 
          : b.origAmount - a.origAmount;
      }

      if (sortBy === 'length') {
        return sortOrder === 'asc' 
          ? a.lengthKm - b.lengthKm 
          : b.lengthKm - a.lengthKm;
      }
      
      return 0;
    });
  }, [filteredProjects, sortBy, sortOrder]);

  const inspectProject = useMemo(() => {
    if (!inspectProjectId) return null;
    return projects.find(p => p.id === inspectProjectId) || null;
  }, [projects, inspectProjectId]);

  const portfolioTotals = useMemo(() => {
    const count = sortedProjects.length;
    const totalLength = sortedProjects.reduce((acc, p) => acc + (p.lengthKm || 0), 0);
    const totalBudget = sortedProjects.reduce((acc, p) => acc + getRevisedBudgetMillions(p), 0);
    const avgProgress = count > 0 
      ? sortedProjects.reduce((acc, p) => acc + (p.physicalProgress || 0), 0) / count 
      : 0;
    return { count, totalLength, totalBudget, avgProgress };
  }, [sortedProjects]);

  const handleExportProjectsCSV = () => {
    const headers = [
      'Project ID',
      'Project Name',
      'Status',
      'Directorate',
      'PMO',
      'Contractor',
      'Consultant',
      'Classification',
      'Contract Type',
      'Length (km)',
      'Original Budget (M ETB)',
      'Revised Budget (M ETB)',
      'Physical Progress (%)',
      'Health Status',
      'Health Reason',
      'Last Modified At',
      'Last Modified By'
    ];

    const rows = sortedProjects.map(p => {
      const status = p.status || 'In Progress';
      const statusInfo = getProjectStatus(p);
      const revBudget = getRevisedBudgetMillions(p);
      return [
        `"${(p.id || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${(p.programDirectorate || 'Southern').replace(/"/g, '""')}"`,
        `"${(p.pmo || 'PMO 1').replace(/"/g, '""')}"`,
        `"${(p.contractor || '').replace(/"/g, '""')}"`,
        `"${(p.consultant || '').replace(/"/g, '""')}"`,
        `"${(p.classification || '').replace(/"/g, '""')}"`,
        `"${(p.contractType || '').replace(/"/g, '""')}"`,
        p.lengthKm ?? 0,
        p.origAmount?.toFixed(2) ?? '0.00',
        revBudget.toFixed(2),
        p.physicalProgress?.toFixed(2) ?? '0.00',
        `"${statusInfo.level}"`,
        `"${statusInfo.reason.replace(/"/g, '""')}"`,
        `"${p.lastModifiedAt ? new Date(p.lastModifiedAt).toISOString() : ''}"`,
        `"${(p.lastModifiedBy || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ERA_Projects_Portfolio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress < 25) {
      return 'bg-red-500';
    }
    if (progress < 50) {
      return 'bg-amber-500';
    }
    if (progress < 75) {
      return 'bg-yellow-400';
    }
    return 'bg-emerald-500';
  };

  const getLifecycleStatusBadge = (status?: string) => {
    const s = status || 'In Progress';
    switch (s) {
      case 'Completed':
        return {
          label: 'Completed',
          icon: '✅',
          style: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        };
      case 'Completed and Closed':
        return {
          label: 'Completed & Closed',
          icon: '🔒',
          style: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
        };
      case 'Terminated and Closed':
        return {
          label: 'Terminated & Closed',
          icon: '🔒',
          style: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
        };
      case 'Suspended':
        return {
          label: 'Suspended',
          icon: '⏸️',
          style: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        };
      case 'Terminated':
        return {
          label: 'Terminated',
          icon: '🛑',
          style: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        };
      case 'Archived':
        return {
          label: 'Archived',
          icon: '📦',
          style: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
      case 'In Progress':
      default:
        return {
          label: 'In Progress',
          icon: '🟢',
          style: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        };
    }
  };

  const getProjectStatus = (p: Project) => {
    if (p.status === 'Archived') {
      return {
        level: 'Normal' as const,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        cardBorderClass: 'border-slate-200 dark:border-slate-700 shadow-slate-100/50 dark:shadow-none hover:border-slate-400 dark:hover:border-slate-600',
        icon: <Archive className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
        reason: 'Project Archived (Historical Record Preserved)'
      };
    }

    if (isProjectClosed(p.status)) {
      return {
        level: 'Normal' as const,
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
        cardBorderClass: 'border-purple-200 dark:border-purple-900/60 shadow-purple-50/30 dark:shadow-none hover:border-purple-400 dark:hover:border-purple-700',
        icon: <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
        reason: 'Project Lifecycle Completed & Closed (Data Frozen / Audits Concluded)'
      };
    }

    const today = new Date();
    
    // 1. Critical Bonds check
    const criticalBonds = p.bonds ? p.bonds.filter(b => {
      if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
      const exp = new Date(b.expireDate);
      if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < today) {
        return true;
      }
      const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
      return (exp.getTime() - today.getTime() < fortyFiveDays);
    }) : [];

    // 2. Matured Overdue Unpaid IPC claims (> 56 days) check
    const hasMaturedUnpaidIpc = p.ipcTracker ? p.ipcTracker.some(item => {
      const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
      const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
      if (!isEtbUnpaid && !isUsdUnpaid) return false;
      if (!item.submissionDate) return false;
      const subDate = new Date(item.submissionDate);
      if (isNaN(subDate.getTime())) return false;
      const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysElapsed > 56;
    }) : false;

    if (criticalBonds.length > 0 || hasMaturedUnpaidIpc) {
      let reason = 'Critical Security Bonds expired/near expiry';
      if (hasMaturedUnpaidIpc) {
        reason = 'Matured Certified IPC Overdue (>56 days)';
      }
      if (criticalBonds.length > 0 && hasMaturedUnpaidIpc) {
        reason = 'Critical Bonds & Overdue Unpaid IPCs';
      }
      return {
        level: 'Critical' as const,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
        cardBorderClass: 'border-rose-200 dark:border-rose-900/60 shadow-rose-50/50 dark:shadow-none hover:border-rose-400 dark:hover:border-rose-700',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />,
        reason
      };
    }

    // 3. Warning Bonds / Low Progress / Deficiency check
    const warningBonds = p.bonds ? p.bonds.filter(b => {
      if (b.status === 'Recovered' || b.status === 'N/A' || b.status === 'Expired' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
      const exp = new Date(b.expireDate);
      if (isNaN(exp.getTime()) || exp < today) return false;
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
      const diff = exp.getTime() - today.getTime();
      return diff >= fortyFiveDays && diff < ninetyDays;
    }) : [];

    const hasUnpaidIpc = p.ipcTracker ? p.ipcTracker.some(item => {
      const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
      const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
      return isEtbUnpaid || isUsdUnpaid;
    }) : false;

    const hasResourceDeficiency = p.resourceMobilization ? p.resourceMobilization.some(r => r.deficiency > 0) : false;

    const isLaggingProgress = p.physicalProgress < 15; // Low progress for a road project template

    if (warningBonds.length > 0 || hasUnpaidIpc || hasResourceDeficiency || isLaggingProgress) {
      let reason = 'Unpaid IPCs within Contractual Grace Period';
      if (warningBonds.length > 0) {
        reason = 'Bonds Expiring soon (<90 days)';
      } else if (hasResourceDeficiency) {
        reason = 'Contractor Resource Deficiency';
      } else if (isLaggingProgress) {
        reason = 'Physical progress is lagging (<15%)';
      }
      return {
        level: 'Warning' as const,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
        cardBorderClass: 'border-amber-250 dark:border-amber-900/30 shadow-amber-50/20 dark:shadow-none hover:border-amber-400 dark:hover:border-amber-600',
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
        reason
      };
    }

    return {
      level: 'Good' as const,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/20',
      cardBorderClass: 'border-slate-100 dark:border-slate-700/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/30',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
      reason: 'Bonds valid & progress compliant'
    };
  };

  const pendingCount = pendingApprovals.filter(a => a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)).length;

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;
    setInviteMessage(`Invitation code sent to user ${inviteName}!`);
    setInviteName('');
    setTimeout(() => setInviteMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 sm:p-4 md:p-5 transition-colors duration-300">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto space-y-2.5 sm:space-y-3">
        
        {/* Header/Controls */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-3.5 sm:p-4 rounded-2xl shadow-sm gap-3">
          <div className="flex items-center gap-3">
            {logoError ? (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0 shadow-xs">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex flex-col items-center justify-center border border-white/20">
                  <span className="text-[11px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                  <span className="text-[5px] font-bold text-white uppercase tracking-widest leading-none mt-0.5 scale-90">Roads</span>
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={eraLogo}
                  alt="Ethiopian Roads Administration Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Active Contracts</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button 
              onClick={onOpenProfile}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </button>
            {!hasNoProjects && (
              <button 
                onClick={() => setShowCollab(!showCollab)}
                className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                <Users className="w-3.5 h-3.5" />
                Collaborate
              </button>
            )}
            
            {!hasNoProjects && hasApprovalCredentials(currentUserObj) && pendingCount > 0 && (
              <button 
                onClick={() => setFilterPendingApprovalsOnly(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition relative cursor-pointer ${
                  filterPendingApprovalsOnly 
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/60' 
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
                title="Filter contracts with pending approval requests — open any contract to review and approve its specific workflow requests"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{filterPendingApprovalsOnly ? 'Showing Needing Approval' : 'Filter Needing Approval'}</span>
                <span className="bg-rose-600 text-white rounded-full text-[9px] px-1.5 py-0.2 font-black animate-pulse">
                  {pendingCount}
                </span>
              </button>
            )}

            {!hasNoProjects && (
              currentUserObj?.role === 'editor' || 
              currentUserObj?.role === 'era_editor' || 
              currentUserObj?.role === 'consultant_editor' || 
              currentUserObj?.role === 'contractor_editor'
            ) && (
              <button 
                onClick={onOpenApprovals}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition relative shadow-sm"
                title="Manage isolated private drafts and submit for approval"
              >
                <FileText className="w-3.5 h-3.5" />
                Private Drafts
              </button>
            )}

            {canAccessUserAdmin && (
              <button 
                onClick={onOpenAdmin}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition relative"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Admin
                {pendingUserSignupsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-rose-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center animate-pulse font-black">
                    {pendingUserSignupsCount}
                  </span>
                )}
              </button>
            )}

            {canAccessUserAdmin && pendingUserSignupsCount > 0 && (
              <button 
                onClick={() => {
                  if (onOpenPendingUserApproval) {
                    onOpenPendingUserApproval();
                  } else {
                    onOpenAdmin();
                  }
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition shadow-md shadow-amber-500/20 animate-pulse cursor-pointer shrink-0"
                title="Review and approve new user credentials immediately"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Approve Credentials ({pendingUserSignupsCount})</span>
              </button>
            )}

            {canAccessGroupReport && (
              <button 
                onClick={() => {
                  setShowReportGenerator(!showReportGenerator);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  showReportGenerator
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Group Reports
              </button>
            )}

            {/* Theme Settings button immediately next to Group Reports */}
            <button
              onClick={() => {
                if (onOpenThemeCustomizer) {
                  onOpenThemeCustomizer();
                } else if (onOpenSettings) {
                  onOpenSettings();
                }
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
              title="Customize Theme, Colors, and Background Wallpaper"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme Settings</span>
            </button>

            {!hasNoProjects && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Open Settings to change themes, colors, and background"
              >
                <Sliders className="w-3.5 h-3.5" />
                Settings
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenUserGuide) {
                  onOpenUserGuide();
                } else {
                  downloadUserManual();
                }
              }}
              title="Open Interactive ERA ERP User Manual & Guide"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              User Manual
            </button>

            <button 
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Prominent Admin Self-Registration Alert Banner */}
        {canAccessUserAdmin && pendingUserSignupsCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                👤
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  New User Sign-up Request Pending Approval
                  <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                    Action Required
                  </span>
                </h4>
                <p className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-normal max-w-2xl">
                  There are <strong>{pendingUserSignupsCount}</strong> pending user registration request(s) waiting for access configuration. You must assign their roles, authorize project access, map appropriate Directorates/PMOs, verify IP authorization, and approve their account to allow secure access.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => {
                  if (onOpenPendingUserApproval) {
                    onOpenPendingUserApproval();
                  } else {
                    onOpenAdmin();
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Review & Approve Credentials</span>
              </button>
              <button
                onClick={onOpenAdmin}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Full Admin</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Collaboration Invitation slide drawer panel */}
        <AnimatePresence>
          {showCollab && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 'auto', height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users className="w-4 h-4" /> Share Dashboard Workspace
              </h3>
              <p className="text-xs text-slate-400">
                Generate workspace permissions to collaborate synchronously across terminals. Enter peer username to invite:
              </p>
              <form onSubmit={handleSendInvite} className="flex gap-2 max-w-md">
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Target Username"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-blue-500"
                />
                <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold transition">
                  Invite
                </button>
              </form>
              {inviteMessage && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{inviteMessage}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Report Generator modular panel */}
        <AnimatePresence>
          {canAccessGroupReport && showReportGenerator && (
            <GroupReportGenerator
              projects={projects}
              currentUserObj={currentUserObj}
              programDirectorates={programDirectorates}
              pmos={pmos}
              onClose={() => setShowReportGenerator(false)}
              onSelectProject={onSelectProject}
              onUpdateProject={onUpdateProject}
            />
          )}
        </AnimatePresence>

        {/* Search & Sort & Directorate Panel */}
        {!hasNoProjects && (
          <div className="space-y-2">
            {/* Primary Search Bar */}
            <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects by name, contractor, classification (e.g. DS-4), ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-2.5 pl-11 pr-24 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition"
                />
                <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                  {searchQuery ? (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Clear search query"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-md select-none">
                      /
                    </kbd>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Classification Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-sm shrink-0">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pl-2 pr-0.5">
                    Class:
                  </span>
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="All">🛣️ All Classifications</option>
                    {availableClassifications.map((cls) => (
                      <option key={`filter-cls-${cls}`} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contractor Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-sm shrink-0">
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider pl-2 pr-0.5">
                    Contractor:
                  </span>
                  <select
                    value={selectedContractor}
                    onChange={(e) => setSelectedContractor(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-amber-500 transition cursor-pointer max-w-[170px] truncate"
                  >
                    <option value="All">🚜 All Contractors</option>
                    {availableContractors.map((cName) => (
                      <option key={`filter-contractor-${cName}`} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Directorate selector */}
                {isDirAdmin ? (
                  <div className="flex items-center gap-2 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded-2xl shadow-sm shrink-0">
                    <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Directorate:
                    </span>
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                      🏢 {currentUserObj.assignedDirectorate || 'Southern'}
                    </span>
                  </div>
                ) : isPmoAdmin ? (
                  <div className="flex items-center gap-2 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 rounded-2xl shadow-sm shrink-0">
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      PMO:
                    </span>
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                      📁 {currentUserObj.assignedPmo || 'PMO 1'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-sm shrink-0">
                    <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider pl-2 pr-0.5">
                      Directorate:
                    </span>
                    <select
                      value={selectedDirectorate}
                      onChange={(e) => setSelectedDirectorate(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="All">🌐 All Directorates</option>
                      {programDirectorates.map((pd, pdIdx) => (
                        <option key={`proj-dir-filter-${pd}-${pdIdx}`} value={pd}>🏢 {pd}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Portfolio / Archive Toggle Pills */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter('All')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedStatusFilter === 'All'
                        ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>💼 Active</span>
                    <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                      {activeContractsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter('Archived')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedStatusFilter === 'Archived'
                        ? 'bg-white dark:bg-slate-750 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>📦 Archived</span>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                      {archivedContractsCount}
                    </span>
                  </button>
                </div>

                {/* Status Filter selector */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-sm shrink-0">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider pl-2 pr-0.5">
                    Status:
                  </span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="All">🌐 Active Portfolio</option>
                    <option value="In Progress">🟢 In Progress</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="Completed and Closed">🔒 Completed & Closed</option>
                    <option value="Suspended">⏸️ Suspended</option>
                    <option value="Terminated">🛑 Terminated</option>
                    <option value="Terminated and Closed">🔒 Terminated & Closed</option>
                    <option value="Archived">📦 Archived</option>
                    <option value="All_With_Archived">📁 All (Incl. Archived)</option>
                  </select>
                </div>

                {/* Sort Panel */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-1.5 rounded-2xl shadow-sm shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2 pr-0.5">
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setSortBy(val);
                      if (val === 'bondWarnings' || val === 'progress' || val === 'budget') {
                        setSortOrder('desc');
                      } else {
                        setSortOrder('asc');
                      }
                    }}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="name">🔤 Name</option>
                    <option value="id">🆔 ID</option>
                    <option value="directorate">🏢 Directorate</option>
                    <option value="progress">📊 Progress</option>
                    <option value="budget">💰 Budget</option>
                    <option value="length">🛣️ Length</option>
                    <option value="bondWarnings">⚠️ Bond Warning</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-blue-600 dark:text-blue-400 transition flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Toggle sort direction asc / desc"
                  >
                    {sortOrder === 'asc' ? '▲' : '▼'}
                  </button>
                </div>

                {/* View Mode Switcher: Grid vs List */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('grid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Switch to Grid View (Card Overview)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('list')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Switch to List View (Compact Interactive Datatable)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Status & Count summary bar */}
            <div className="flex items-center justify-between text-xs px-2 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{sortedProjects.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-100">{projects.filter(isAccessible).length}</strong> contracts
                </span>
                {sortedProjects.filter(p => isRecentlyUpdated(p.lastModifiedAt)).length > 0 && (
                  <span 
                    className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1.5 shadow-2xs"
                    title={`${sortedProjects.filter(p => isRecentlyUpdated(p.lastModifiedAt)).length} contract(s) updated in the last 24 hours`}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
                    <span>{sortedProjects.filter(p => isRecentlyUpdated(p.lastModifiedAt)).length} Updated (&lt;24h)</span>
                  </span>
                )}
                {searchQuery && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {selectedClassification !== 'All' && (
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Classification: {selectedClassification}
                    <button onClick={() => setSelectedClassification('All')} className="hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {selectedContractor !== 'All' && (
                  <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Contractor: {selectedContractor}
                    <button onClick={() => setSelectedContractor('All')} className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {selectedDirectorate !== 'All' && (
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Directorate: {selectedDirectorate}
                    <button onClick={() => setSelectedDirectorate('All')} className="hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {selectedStatusFilter !== 'All' && (
                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Status: {selectedStatusFilter === 'All_With_Archived' ? 'All (Including Archived)' : selectedStatusFilter}
                    <button onClick={() => setSelectedStatusFilter('All')} className="hover:text-emerald-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {similarityFilter.type !== 'none' && (
                  <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    Filter: {similarityFilter.value}
                    <button onClick={() => setSimilarityFilter({ type: 'none', value: null })} className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
                {filterPendingApprovalsOnly && (
                  <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 px-2 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1">
                    <span>Pending Review ({pendingCount})</span>
                    <button onClick={() => setFilterPendingApprovalsOnly(false)} className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5">✕</button>
                  </span>
                )}
              </div>

              {(searchQuery || selectedClassification !== 'All' || selectedContractor !== 'All' || selectedDirectorate !== 'All' || selectedStatusFilter !== 'All' || similarityFilter.type !== 'none' || filterPendingApprovalsOnly) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedClassification('All');
                    setSelectedContractor('All');
                    setSelectedDirectorate('All');
                    setSelectedStatusFilter('All');
                    setSimilarityFilter({ type: 'none', value: null });
                    setFilterPendingApprovalsOnly(false);
                  }}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer transition shrink-0 ml-2"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Projects Grid / Restricted Alert Banner */}
        {hasNoProjects ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-8 rounded-2xl shadow-sm max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/25 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/30">
              <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              No Projects Assigned
            </h2>
            <div className="h-0.5 w-12 bg-amber-500 my-3 mx-auto" />
            <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
              Hello <strong className="text-slate-900 dark:text-white font-black">{currentUserObj.username}</strong>, your account is active, but you have not been assigned to any projects yet.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
              Please contact an Administrator or Coordinator to assign road projects to your profile. You will be able to access reports, dashboards, and KPI tracking once assigned.
            </p>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-8 rounded-2xl shadow-sm max-w-md mx-auto">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">No Matching Contracts Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No contracts matched your current search query or filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDirectorate('All');
                setSelectedStatusFilter('All');
                setSimilarityFilter({ type: 'none', value: null });
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Archived Repository Notice Banner */}
            {selectedStatusFilter === 'Archived' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Archived Projects Repository</span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                        {sortedProjects.length} {sortedProjects.length === 1 ? 'Contract' : 'Contracts'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Archived contracts are hidden from the primary active portfolio dashboard. All records and historical evaluations remain read-only and preserved for audit traceability.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('All')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>View Active Portfolio</span>
                  <span>➜</span>
                </button>
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-3 gap-y-2 sm:gap-y-2">
                <AnimatePresence>
                  {sortedProjects.map((p) => {
                    const criticalBonds = p.bonds ? p.bonds.filter(b => {
                      if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
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
                    const statusInfo = getProjectStatus(p);
                    const revBudget = getRevisedBudgetMillions(p);
                    const { actual, planned, variance } = getPlannedAndActualProgress(p);
                    const hasPendingChangesForApprover = pendingApprovals.some(a => a.projectId === p.id && a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects));
                    const mySubmittedPendingDraft = pendingApprovals.find(a => a.projectId === p.id && a.status === 'pending' && a.requestedBy === currentUserObj.username);

                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => onSelectProject(p.id)}
                        className={`bg-white dark:bg-slate-800 border p-2.5 sm:p-3 rounded-xl shadow-xs hover:shadow-md cursor-pointer relative group transition-all ${statusInfo.cardBorderClass}`}
                      >
                        <div className="space-y-1.5 sm:space-y-2">
                          {/* Badge & Type */}
                          <div className="flex items-center gap-1 justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSimilarityFilter({ type: 'contractType', value: p.contractType });
                                }}
                                className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border transition ${
                                  similarityFilter.type === 'contractType' && similarityFilter.value === p.contractType
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30'
                                }`}
                                title="Click to interlink contracts with the same Contract Type"
                              >
                                {p.contractType}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSimilarityFilter({ type: 'classification', value: p.classification });
                                }}
                                className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border transition ${
                                  similarityFilter.type === 'classification' && similarityFilter.value === p.classification
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30'
                                }`}
                                title="Click to interlink contracts with the same Classification"
                              >
                                {p.classification}
                              </button>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30">
                                🏢 {p.programDirectorate || 'Southern'}
                              </span>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30">
                                📦 {p.pmo || 'PMO 1'}
                              </span>
                              {isRecentlyUpdated(p.lastModifiedAt) && (
                                <span 
                                  className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/50 flex items-center gap-1 shadow-2xs animate-pulse"
                                  title={`Updated within the last 24 hours (${p.lastModifiedAt ? new Date(p.lastModifiedAt).toLocaleString() : ''})`}
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Updated {formatRelativeTime(p.lastModifiedAt)}</span>
                                </span>
                              )}
                              <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500">
                                ID: {p.id.substring(0, 10)}
                              </span>
                            </div>
                            
                            {/* Health Status & Quick Inspect */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectProjectId(p.id);
                                }}
                                className="p-0.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                                title="Quick inspect project details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <span className={`flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase tracking-tight ${statusInfo.badgeClass}`}>
                                {statusInfo.icon}
                                <span>{statusInfo.level}</span>
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                              {hasPendingChangesForApprover && (
                                <span className="relative flex h-2 w-2 shrink-0" title="This contract has pending, unapproved changes requiring your review as designated approver">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                              <span>{p.name}</span>
                              {hasPendingChangesForApprover && (
                                <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wider animate-pulse border border-amber-500/20 leading-none">
                                  Pending Approver Review
                                </span>
                              )}
                              {mySubmittedPendingDraft && !hasPendingChangesForApprover && (
                                <span className="text-[9px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded tracking-wider border border-blue-500/20 leading-none">
                                  Draft Submitted
                                </span>
                              )}
                              {isRecentlyUpdated(p.lastModifiedAt) && (
                                <span 
                                  className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded tracking-wider border border-emerald-500/30 leading-none flex items-center gap-1 shrink-0"
                                  title={`Updated in the last 24 hours (${p.lastModifiedAt ? new Date(p.lastModifiedAt).toLocaleString() : ''})`}
                                >
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                  <span>Updated</span>
                                </span>
                              )}
                            </h3>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                <Building className="w-2.5 h-2.5 text-slate-400" />
                                <span className="font-semibold text-slate-400 mr-0.5">Client:</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimilarityFilter({ type: 'client', value: p.client });
                                  }}
                                  className={`font-semibold underline ${
                                    similarityFilter.type === 'client' && similarityFilter.value === p.client
                                      ? 'text-blue-600 font-extrabold'
                                      : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                                  }`}
                                  title="Click to filter similar Client networks"
                                >
                                  {p.client}
                                </button>
                              </span>
                              <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-400 mr-0.5">Contractor:</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimilarityFilter({ type: 'contractor', value: p.contractor });
                                  }}
                                  className={`font-semibold underline ${
                                    similarityFilter.type === 'contractor' && similarityFilter.value === p.contractor
                                      ? 'text-amber-600 font-extrabold'
                                      : 'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
                                  }`}
                                  title="Click to filter similar Contractor networks"
                                >
                                  {p.contractor}
                                </button>
                              </span>
                            </div>
                          </div>

                          {/* Project Lifecycle Status Governance */}
                          <div 
                            className="flex items-center justify-between gap-1.5 pt-1 pb-0 border-t border-slate-100 dark:border-slate-700/50"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <span className="text-[9.5px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                              Lifecycle Status:
                            </span>

                            {canManageStatus(p) ? (
                              <div 
                                className="flex items-center gap-1" 
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <select
                                  value={p.status || 'In Progress'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newStatus = e.target.value as ProjectLifecycleStatus;
                                    if (onUpdateProjectStatus) {
                                      onUpdateProjectStatus(p.id, newStatus);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-lg border outline-none cursor-pointer transition shadow-2xs ${getLifecycleStatusBadge(p.status).style}`}
                                  title={isProjectClosed(p.status) ? "Project is closed. As CPM/Master Admin, you have privilege to change its lifecycle." : "Assigned by Directorate Admin / Administrator"}
                                >
                                  <option value="In Progress">🟢 In Progress</option>
                                  <option value="Completed">✅ Completed</option>
                                  <option value="Completed and Closed">🔒 Completed & Closed</option>
                                  <option value="Suspended">⏸️ Suspended</option>
                                  <option value="Terminated">🛑 Terminated</option>
                                  <option value="Terminated and Closed">🔒 Terminated & Closed</option>
                                  <option value="Archived">📦 Archived</option>
                                </select>
                              </div>
                            ) : (
                              <span 
                                className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-lg border flex items-center gap-1 ${getLifecycleStatusBadge(p.status).style}`}
                                title={isProjectClosed(p.status) ? "Project lifecycle is closed. Only the CPM Admin and Master Admin are authorized to change it to another lifecycle." : "Assigned by Directorate / System Administrator"}
                              >
                                <span>{getLifecycleStatusBadge(p.status).icon}</span>
                                <span>{getLifecycleStatusBadge(p.status).label}</span>
                              </span>
                            )}
                          </div>

                          {/* 3-Column Micro-Grid Specs Layout */}
                          <div className="grid grid-cols-3 gap-1 border-t border-slate-50 dark:border-slate-700/40 pt-1 text-center">
                            <div>
                              <p className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">Length</p>
                              <p className="text-xs font-bold font-mono tabular-nums flex items-center justify-center gap-0.5 mt-0.5 text-slate-800 dark:text-slate-100">
                                <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                                {p.lengthKm} <span className="text-[9.5px] font-normal text-slate-400">km</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">Revised Budget</p>
                              <p className="text-xs font-bold font-mono tabular-nums flex items-center justify-center gap-0.5 mt-0.5 text-slate-800 dark:text-slate-100">
                                <DollarSign className="w-2.5 h-2.5 text-slate-400" />
                                {revBudget.toFixed(2)} <span className="text-[9.5px] font-normal text-slate-400">M</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">Physical Progress</p>
                              <p className="text-xs font-bold font-mono tabular-nums flex items-center justify-center gap-0.5 mt-0.5 text-slate-800 dark:text-slate-100">
                                <TrendingUp className="w-2.5 h-2.5 text-slate-400" />
                                {actual.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Progress Dual Line */}
                          <div className="space-y-0.5">
                            <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden relative">
                              {planned !== null && (
                                <div 
                                  className="absolute top-0 bottom-0 bg-slate-300 dark:bg-slate-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, planned))}%` }}
                                  title={`Planned Progress Target: ${planned.toFixed(1)}%`}
                                />
                              )}
                              <div 
                                className={`h-full rounded-full transition-all duration-500 relative z-10 ${getProgressBarColor(actual)}`}
                                style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
                              />
                            </div>
                            {planned !== null && (
                              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                <span>Target: {planned.toFixed(1)}%</span>
                                <span className={variance !== null && variance >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                                  {variance !== null && (variance >= 0 ? `+${variance.toFixed(1)}% Ahead` : `${variance.toFixed(1)}% Lagging`)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Adaptive Project Health Warning / Condition Details Sign */}
                          {statusInfo.level === 'Critical' && (
                            <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-950/40 p-1.5 sm:p-2 rounded-lg space-y-0.5 mt-1">
                              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold text-[9.5px] uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 animate-bounce shrink-0" />
                                <span>{statusInfo.reason}</span>
                              </div>
                              {criticalBonds.length > 0 && (
                                <div className="text-[8.5px] space-y-0.5 text-rose-600/80 dark:text-rose-400/80">
                                  {criticalBonds.map((b, bIdx) => {
                                    const exp = new Date(b.expireDate);
                                    const isExpired = b.status === 'Expired' || exp < new Date();
                                    return (
                                      <div key={bIdx} className="flex justify-between items-center bg-white/45 dark:bg-black/20 px-1.5 py-0.5 rounded">
                                        <span className="font-semibold truncate max-w-[140px]">{b.type}</span>
                                        <span className="font-mono font-bold text-[8px] text-rose-700 dark:text-rose-300">
                                          {isExpired ? 'EXPIRED' : 'DUE <45d'}: {b.expireDate}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {statusInfo.level === 'Warning' && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-1.5 sm:p-2 rounded-lg space-y-0.5 mt-1">
                              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-[9.5px] uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{statusInfo.reason}</span>
                              </div>
                              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight">
                                This road project is functional but has unresolved pending liabilities or low progress rates.
                              </p>
                            </div>
                          )}

                          {statusInfo.level === 'Good' && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 p-1.5 sm:p-2 rounded-lg space-y-0.5 mt-1">
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[9.5px] uppercase tracking-wider">
                                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>On-Track & Fully Compliant</span>
                              </div>
                              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight">
                                Securities are valid, physical progress is compliant, and no matured overdue IPC claims are pending.
                              </p>
                            </div>
                          )}

                          {/* Last Modified Audit Footer */}
                          {p.lastModifiedAt && (
                            <div className="flex items-center justify-between text-[9.5px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/40 mt-1">
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-slate-400">Last Modified:</span>
                                <span className={`font-bold ${isRecentlyUpdated(p.lastModifiedAt) ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {formatRelativeTime(p.lastModifiedAt)}
                                </span>
                                <span className="text-[8.5px] text-slate-400">({new Date(p.lastModifiedAt).toLocaleDateString()})</span>
                              </span>
                              {p.lastModifiedBy && (
                                <span className="text-[8.5px] text-slate-400 truncate max-w-[120px]" title={`Modified by ${p.lastModifiedBy}`}>
                                  By: {p.lastModifiedBy}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Project Actions: Quick Inspect & Delete / Open */}
                          <div 
                            className="pt-1.5 flex justify-between items-center border-t border-slate-100 dark:border-slate-700/50 mt-1.5" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectProjectId(p.id);
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-750 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                              title="Inspect deep project data in slide-over drawer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Quick Inspect</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {canDeleteProject(p) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirm(`🛑 DELETE PROJECT CONFIRMATION\n\nAre you sure you want to permanently delete project "${p.name}" (ID: ${p.id}) from the system?\n\nThis action cannot be undone.`)) {
                                      onDeleteProject(p.id);
                                    }
                                  }}
                                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-all duration-200 shadow-2xs cursor-pointer"
                                  title="Permanently Delete Project"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProject(p.id);
                                }}
                                className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredProjects.length === 0 && (
                  <div className="col-span-1 md:col-span-2 text-center py-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                    <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-bounce" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No active contracts match your filters.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Try revising your query or request administrative permissions.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* High-Density Enterprise List / Datatable View */
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[750px] overflow-y-auto scroll-smooth">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px] select-none shadow-2xs">
                      <tr>
                        <th 
                          onClick={() => handleSort('name')} 
                          className="py-2 px-3.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[240px]"
                          title="Click to sort by Project Name"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Contract / Road Section</span>
                            {sortBy === 'name' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th className="py-2 px-3 min-w-[130px]">
                          <span>Lifecycle Status</span>
                        </th>
                        <th 
                          onClick={() => handleSort('directorate')} 
                          className="py-2 px-3 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[130px]"
                          title="Click to sort by Directorate"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Directorate / PMO</span>
                            {sortBy === 'directorate' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th className="py-2 px-3 min-w-[170px]">
                          <span>Contractor & Client</span>
                        </th>
                        <th className="py-2 px-2.5 min-w-[100px]">
                          <span>Class / Type</span>
                        </th>
                        <th 
                          onClick={() => handleSort('length')} 
                          className="py-2 px-3 text-right hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[95px]"
                          title="Click to sort by Length"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Length (km)</span>
                            {sortBy === 'length' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('budget')} 
                          className="py-2 px-3 text-right hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[125px]"
                          title="Click to sort by Revised Budget"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Rev. Budget (M)</span>
                            {sortBy === 'budget' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('progress')} 
                          className="py-2 px-3 text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[155px]"
                          title="Click to sort by Physical Progress"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Physical Progress</span>
                            {sortBy === 'progress' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('bondWarnings')} 
                          className="py-2 px-3 text-center hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition min-w-[115px]"
                          title="Click to sort by Risk / Health Warnings"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Health / Risk</span>
                            {sortBy === 'bondWarnings' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th className="py-2 px-3 text-center min-w-[125px]">
                          <span>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {sortedProjects.map((p) => {
                        const statusInfo = getProjectStatus(p);
                        const { actual, planned, variance } = getPlannedAndActualProgress(p);
                        const revBudget = getRevisedBudgetMillions(p);
                        const hasPendingChangesForApprover = pendingApprovals.some(
                          a => a.projectId === p.id && a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)
                        );
                        const mySubmittedPendingDraft = pendingApprovals.find(
                          a => a.projectId === p.id && a.status === 'pending' && a.requestedBy === currentUserObj.username
                        );

                        return (
                          <tr 
                            key={`tbl-row-${p.id}`}
                            onClick={() => onSelectProject(p.id)}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/25 transition-colors cursor-pointer group"
                          >
                            {/* Contract Name & Subtitle */}
                            <td className="py-2 px-3.5 align-middle">
                              <div className="flex items-center gap-2">
                                {hasPendingChangesForApprover && (
                                  <span className="relative flex h-2 w-2 shrink-0" title="Pending Approver Review">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    <span className="font-mono">{p.id.substring(0, 14)}</span>
                                    {isRecentlyUpdated(p.lastModifiedAt) && (
                                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-800">
                                        Updated
                                      </span>
                                    )}
                                    {hasPendingChangesForApprover && (
                                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200 dark:border-amber-800">
                                        Review Req.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                              {canManageStatus(p) ? (
                                <select
                                  value={p.status || 'In Progress'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newStatus = e.target.value as ProjectLifecycleStatus;
                                    if (onUpdateProjectStatus) {
                                      onUpdateProjectStatus(p.id, newStatus);
                                    }
                                  }}
                                  className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border outline-none cursor-pointer transition shadow-2xs ${getLifecycleStatusBadge(p.status).style}`}
                                >
                                  <option value="In Progress">🟢 In Progress</option>
                                  <option value="Completed">✅ Completed</option>
                                  <option value="Completed and Closed">🔒 Completed & Closed</option>
                                  <option value="Suspended">⏸️ Suspended</option>
                                  <option value="Terminated">🛑 Terminated</option>
                                  <option value="Terminated and Closed">🔒 Terminated & Closed</option>
                                  <option value="Archived">📦 Archived</option>
                                </select>
                              ) : (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${getLifecycleStatusBadge(p.status).style}`}>
                                  <span>{getLifecycleStatusBadge(p.status).icon}</span>
                                  <span>{getLifecycleStatusBadge(p.status).label}</span>
                                </span>
                              )}
                            </td>

                            {/* Directorate / PMO */}
                            <td className="py-2 px-3 align-middle">
                              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                🏢 {p.programDirectorate || 'Southern'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                📁 {p.pmo || 'PMO 1'}
                              </div>
                            </td>

                            {/* Contractor & Client */}
                            <td className="py-2 px-3 align-middle">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={p.contractor}>
                                {p.contractor || 'Unassigned'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]" title={p.client}>
                                Client: {p.client || 'ERA'}
                              </div>
                            </td>

                            {/* Class / Type */}
                            <td className="py-2 px-2.5 align-middle">
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mr-1">
                                {p.classification || 'DS-4'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {p.contractType || 'DBB'}
                              </span>
                            </td>

                            {/* Length */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums align-middle">
                              {p.lengthKm} <span className="text-[10px] font-normal text-slate-400">km</span>
                            </td>

                            {/* Revised Budget */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums align-middle">
                              <span className="text-[10px] font-normal text-slate-400 mr-0.5">Br.</span>
                              {revBudget.toFixed(2)}
                              <span className="text-[10px] font-normal text-slate-400 ml-0.5">M</span>
                            </td>

                            {/* Physical Progress */}
                            <td className="py-2 px-3 align-middle">
                              <div className="space-y-1 max-w-[140px]">
                                <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                                  <span className="text-slate-800 dark:text-slate-100 tabular-nums">
                                    {actual.toFixed(1)}%
                                  </span>
                                  {planned !== null && (
                                    <span className={`text-[9px] font-bold ${variance !== null && variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {variance !== null && (variance >= 0 ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`)}
                                    </span>
                                  )}
                                </div>
                                {/* Dual Progress Bar */}
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden relative">
                                  {planned !== null && (
                                    <div 
                                      className="absolute top-0 bottom-0 bg-slate-400/40 dark:bg-slate-500/40 rounded-full"
                                      style={{ width: `${Math.min(100, Math.max(0, planned))}%` }}
                                      title={`Planned Target: ${planned.toFixed(1)}%`}
                                    />
                                  )}
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 relative z-10 ${getProgressBarColor(actual)}`}
                                    style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Risk / Health */}
                            <td className="py-2 px-3 text-center align-middle">
                              <span 
                                className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-tight ${statusInfo.badgeClass}`}
                                title={statusInfo.reason}
                              >
                                {statusInfo.icon}
                                <span>{statusInfo.level}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectProjectId(p.id);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                                  title="Quick Inspect Project Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectProject(p.id);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                  title="Open Project Dashboard"
                                >
                                  <span>Open</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>

                                {canDeleteProject(p) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`🛑 DELETE PROJECT CONFIRMATION\n\nAre you sure you want to permanently delete project "${p.name}" (ID: ${p.id}) from the system?\n\nThis action cannot be undone.`)) {
                                        onDeleteProject(p.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                    title="Delete Project"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Table Footer with Summary Statistics */}
                    <tfoot className="bg-slate-50 dark:bg-slate-850 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="py-2 px-3.5" colSpan={4}>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500">
                              Portfolio Summary:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {portfolioTotals.count} {portfolioTotals.count === 1 ? 'Contract' : 'Contracts'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 text-[10px]">
                          Totals
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {portfolioTotals.totalLength.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">km</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                          <span className="text-[9px] font-normal text-slate-400 mr-0.5">Br.</span>
                          {portfolioTotals.totalBudget.toFixed(2)}
                          <span className="text-[9px] font-normal text-slate-400 ml-0.5">M</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                          Avg: {portfolioTotals.avgProgress.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-400" colSpan={2}>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
        </div>
        )}

        {/* Add Project trigger button for admin / directorate admin / pmo admin */}
        {canCreateProject && (
          <button
            onClick={handleOpenCreateModal}
            className="w-full py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800/80 dark:to-slate-800 dark:hover:from-slate-700 dark:hover:to-slate-750 border border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Issue New Road Construction Project Template
          </button>
        )}

      </div>

      {/* Create Project Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-150 dark:border-slate-700/60 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Issue New Project
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                  Project Identification Number (ID)
                </label>
                <input
                  type="text"
                  required
                  value={newProjectId}
                  onChange={(e) => {
                    setNewProjectId(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="e.g. proj_eastern_highway"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono font-bold text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[9px] text-slate-450 dark:text-slate-500">
                  Must be unique. No spaces. E.g. <code>proj_modjo_hawassa_3</code>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                  Contract / Road Section Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="e.g. Modjo - Hawassa Expressway"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-sans font-black text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                    Program Directorate
                  </label>
                  <select
                    value={isDirAdmin ? (currentUserObj.assignedDirectorate || newProjectDirectorate) : newProjectDirectorate}
                    disabled={isDirAdmin || isPmoAdmin}
                    onChange={(e) => setNewProjectDirectorate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {programDirectorates.map((pd, pdIdx) => (
                      <option key={`proj-dir-new-${pd}-${pdIdx}`} value={pd}>{pd}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                    PMO Group
                  </label>
                  <select
                    value={isPmoAdmin ? (currentUserObj.assignedPmo || newProjectPmo) : newProjectPmo}
                    disabled={isPmoAdmin}
                    onChange={(e) => setNewProjectPmo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {pmos.map((p, pIdx) => (
                      <option key={`proj-pmo-new-${p}-${pIdx}`} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {createError && (
                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-zinc-200 font-bold rounded-xl text-2xs transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-2xs transition cursor-pointer shadow-sm text-center"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Quick Slide-Over Drawer Panel */}
      <AnimatePresence>
        {inspectProject && (
          <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectProjectId(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-850/70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${getLifecycleStatusBadge(inspectProject.status).style}`}>
                        {getLifecycleStatusBadge(inspectProject.status).icon} {getLifecycleStatusBadge(inspectProject.status).label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {inspectProject.id}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {inspectProject.classification || 'DS-4'} · {inspectProject.contractType || 'DBB'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {inspectProject.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      🏢 {inspectProject.programDirectorate || 'Southern'} Directorate · 📁 {inspectProject.pmo || 'PMO 1'}
                    </p>
                  </div>

                  <button
                    onClick={() => setInspectProjectId(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
                    title="Close Drawer (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
                  {/* Quick Open Action Banner */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between gap-3 shadow-md shadow-blue-500/20">
                    <div>
                      <h4 className="font-extrabold text-sm">Full Project Dashboard</h4>
                      <p className="text-xs text-blue-100 mt-0.5">
                        Access S-Curves, Daily Submittals, Financial IPCs, and FIDIC Audits.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(inspectProject.id);
                        setInspectProjectId(null);
                      }}
                      className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 font-black rounded-xl text-xs transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <span>Open Project</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress & Milestone Overview */}
                  {(() => {
                    const { actual, planned, variance } = getPlannedAndActualProgress(inspectProject);
                    return (
                      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Physical Progress vs Target Schedule
                          </h4>
                          {variance !== null && (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              variance >= 0 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              {variance >= 0 ? `▲ ${variance.toFixed(2)}% Ahead` : `▼ ${Math.abs(variance).toFixed(2)}% Lagging`}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Actual Physical</div>
                            <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                              {actual.toFixed(2)}%
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Planned Target</div>
                            <div className="text-xl font-black font-mono text-slate-700 dark:text-slate-200 mt-0.5">
                              {planned !== null ? `${planned.toFixed(2)}%` : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Dual Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden relative">
                            {planned !== null && (
                              <div 
                                className="absolute top-0 bottom-0 bg-slate-400/50 dark:bg-slate-500/50 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, planned))}%` }}
                              />
                            )}
                            <div 
                              className={`h-full rounded-full transition-all duration-300 relative z-10 ${getProgressBarColor(actual)}`}
                              style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>0% (Commencement)</span>
                            <span>100% (Substantial Handover)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Financial Highlights */}
                  {(() => {
                    const revBudget = getRevisedBudgetMillions(inspectProject);
                    const origBudget = inspectProject.origAmount || 0;
                    const variationM = (inspectProject.variation || 0) > 10000 
                      ? (inspectProject.variation || 0) / 1_000_000 
                      : (inspectProject.variation || 0);

                    return (
                      <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Financial & Budget Audit (Millions ETB)
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block">Original Base</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                              Br. {origBudget.toFixed(2)} M
                            </span>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block">Variation Orders</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                              Br. {variationM.toFixed(2)} M
                            </span>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 block">Revised Total</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                              Br. {revBudget.toFixed(2)} M
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stakeholders & Engineering Supervision */}
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Key Project Stakeholders
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[11px] text-slate-400 font-semibold">Contractor:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-right">
                          {inspectProject.contractor || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[11px] text-slate-400 font-semibold">Consulting Engineer:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-right max-w-[260px] truncate" title={inspectProject.consultant}>
                          {inspectProject.consultant || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[11px] text-slate-400 font-semibold">Employer / Client:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {inspectProject.client || 'Ethiopian Roads Administration (ERA)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security & Performance Bonds */}
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Security & Performance Bonds Escrow
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {(inspectProject.bonds || []).length} registered
                      </span>
                    </div>
                    {(!inspectProject.bonds || inspectProject.bonds.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic">No securities recorded for this project.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {inspectProject.bonds.map((b, bIdx) => {
                          const exp = new Date(b.expireDate);
                          const now = new Date();
                          const isExp = b.status === 'Expired' || exp < now;
                          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={bIdx} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-[11px]">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{b.type}</span>
                                <span className="text-[10px] text-slate-400 ml-2">({b.issuer || 'Bank/Insurer'})</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                                  isExp 
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                                    : diffDays < 45 
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                  {isExp ? 'EXPIRED' : `${diffDays}d left`} ({b.expireDate})
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Audit & Modification Trail */}
                  {inspectProject.lastModifiedAt && (
                    <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center">
                      <span>Last Updated: {new Date(inspectProject.lastModifiedAt).toLocaleString()}</span>
                      {inspectProject.lastModifiedBy && <span>By: {inspectProject.lastModifiedBy}</span>}
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectProjectId(null)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectProject(inspectProject.id);
                      setInspectProjectId(null);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Launch Full Project Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

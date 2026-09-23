import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Search,
  Plus,
  Filter,
  Download,
  FileText,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Building2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Truck,
  Users,
  Check,
  RotateCcw,
  Copy,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  Compass,
  FileCode,
  HardHat,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Upload,
  Video,
  Smartphone,
  ZoomIn,
  DownloadCloud,
  FileImage,
  Square
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  Project,
  DailyActivityRecord,
  DailyActivityEquipmentItem,
  DailyActivityLaborItem,
  ConsultantSubmittalKpi,
  SupervisionConsultantInfo,
  User
} from '../types';

interface DailyActivitiesViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project, actionDesc: string) => void;
  isReadonly?: boolean;
  currentUserObj?: User | null;
}

export const ACTIVITY_CATEGORIES = [
  'Earthworks & Clearing',
  'Drainage & Culverts',
  'Pavement & Surfacing',
  'Structures & Bridges',
  'Materials & Quality Testing',
  'Right-of-Way & Utilities',
  'Traffic & Safety',
  'Environmental & Safety'
] as const;

export const LOCATION_SIDES = [
  'Full Width / Carriageway',
  'LHS (Left Hand Side)',
  'RHS (Right Hand Side)',
  'Median',
  'Cross Drainage',
  'Off-Site / Quarry / Plant'
] as const;

export const QC_STATUS_OPTIONS = [
  'Approved / Passed Inspection',
  'Approved with Comments',
  'Pending Consultant WIR Inspection',
  'Inspection Scheduled',
  'Punch List / Rectification',
  'Rejected / Re-work Required'
] as const;

export const WEATHER_CONDITIONS = [
  'Sunny / Dry',
  'Partly Cloudy',
  'Light Rain (Work Continued)',
  'Heavy Rain (Work Suspended)',
  'Flooding / Saturated Ground',
  'Dusty / High Winds'
] as const;

export const SHIFT_OPTIONS = [
  'Day Shift (Standard)',
  'Night Shift',
  'Extended / Overtime'
] as const;

export const QUANTITY_UNITS = [
  'm³',
  'm²',
  'lm',
  'ton',
  'No.',
  'pcs',
  'km',
  '%'
] as const;

export const DEFAULT_EQUIPMENT_OPTIONS = [
  'Motor Grader (Cat 140K/140M)',
  'Vibratory Single Drum Roller 15T-18T',
  'Pneumatic Tire Roller (PTR) 20T',
  'Heavy Tandem Steel Roller 10T-12T',
  'Hydraulic Excavator (Cat 320/330)',
  'Bulldozer (Cat D7/D8)',
  'Wheel Loader (Cat 950/966)',
  'Asphalt / Aggregate Paver',
  'Water Bowser (15,000L - 20,000L)',
  'Bitumen Distributor / Sprayer',
  'Dump Truck (16m³ - 22m³)',
  'Transit Concrete Mixer 6m³',
  'Mobile Crane (25T - 50T)',
  'Concrete Poker Vibrator',
  'Total Station & Topography Survey Kit'
];

export const DEFAULT_LABOR_CATEGORIES = [
  'Project Manager / Engineers',
  'Site Foremen / Supervisors',
  'Heavy Equipment Operators',
  'Skilled Labor / Masons',
  'Unskilled Labor / Flagmen'
];

// Helper to parse station format (e.g., '14+200' -> 14.2)
export function parseStationNumber(st: string): number {
  if (!st) return 0;
  const match = st.match(/(?:Km\s*)?(\d+)\+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10) + parseInt(match[2], 10) / 1000;
  }
  const numeric = parseFloat(st.replace(/[^0-9.]/g, ''));
  return isNaN(numeric) ? 0 : numeric;
}

// Helper to format station number (e.g., 14.2 -> 'Km 14+200')
export function formatStationKm(val: number | string): string {
  if (typeof val === 'string') {
    if (val.includes('+')) {
      return val.startsWith('Km') ? val : `Km ${val}`;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    val = num;
  }
  const km = Math.floor(val);
  const m = Math.round((val - km) * 1000);
  return `Km ${String(km).padStart(2, '0')}+${String(m).padStart(3, '0')}`;
}

export default function DailyActivitiesView({
  project,
  onUpdateProject,
  isReadonly = false,
  currentUserObj
}: DailyActivitiesViewProps) {
  const activities: DailyActivityRecord[] = useMemo(() => {
    return Array.isArray(project.dailyActivities) ? project.dailyActivities : [];
  }, [project.dailyActivities]);

  const submittalsList: ConsultantSubmittalKpi[] = useMemo(() => {
    return Array.isArray(project.supervisionConsultant?.submittalKpis)
      ? project.supervisionConsultant.submittalKpis
      : [];
  }, [project.supervisionConsultant?.submittalKpis]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedQcStatus, setSelectedQcStatus] = useState<string>('all');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [customDateVal, setCustomDateVal] = useState<string>('');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [selectedSubmittalFilter, setSelectedSubmittalFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showChainageMap, setShowChainageMap] = useState<boolean>(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DailyActivityRecord | null>(null);
  const [modalTab, setModalTab] = useState<'scope' | 'location' | 'submittal_link' | 'resources' | 'qc' | 'photos'>('scope');

  // Preview Linked Submittal Modal
  const [previewSubmittal, setPreviewSubmittal] = useState<ConsultantSubmittalKpi | null>(null);

  // Photo Gallery Lightbox & Camera States
  const [galleryActivity, setGalleryActivity] = useState<DailyActivityRecord | null>(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number>(0);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [liveStreamError, setLiveStreamError] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [targetActivityForQuickUpload, setTargetActivityForQuickUpload] = useState<DailyActivityRecord | null>(null);

  // Segment-specific notes and status state
  const [segStructures, setSegStructures] = useState<string>('');
  const [segStatus, setSegStatus] = useState<string>('Not Started');
  const [segNotes, setSegNotes] = useState<string>('');

  // Sync segment local states with selected segment
  React.useEffect(() => {
    if (selectedStationFilter && selectedStationFilter !== 'all') {
      const saved = project.segmentNotes?.[selectedStationFilter];
      setSegStructures(saved?.structures || '');
      setSegStatus(saved?.status || 'Not Started');
      setSegNotes(saved?.notes || '');
    } else {
      setSegStructures('');
      setSegStatus('Not Started');
      setSegNotes('');
    }
  }, [selectedStationFilter, project.segmentNotes]);

  // Hidden File & Camera Input Refs
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const quickCameraInputRef = React.useRef<HTMLInputElement>(null);
  const quickGalleryInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Quick WIR / RFI Creation Modal from Daily Activity
  const [isQuickWirModalOpen, setIsQuickWirModalOpen] = useState(false);
  const [targetActivityForWir, setTargetActivityForWir] = useState<DailyActivityRecord | null>(null);
  const [newWirType, setNewWirType] = useState<'Work Inspection (WIR)' | 'RFI' | 'Material Approval'>('Work Inspection (WIR)');
  const [newWirTitle, setNewWirTitle] = useState('');
  const [newWirSubmittalNo, setNewWirSubmittalNo] = useState('');
  const [newWirTargetDays, setNewWirTargetDays] = useState(3);
  const [newWirPriority, setNewWirPriority] = useState<'High' | 'Medium' | 'Low' | 'Critical'>('High');

  // Project Length for Chainage bar
  const totalLengthKm = project.lengthKm || 48.5;

  // Filtered activities
  const filteredActivities = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return activities.filter((act) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = act.activityName?.toLowerCase().includes(query);
        const matchesType = act.activityType?.toLowerCase().includes(query);
        const matchesStart = act.startStationKm?.toLowerCase().includes(query);
        const matchesEnd = act.endStationKm?.toLowerCase().includes(query);
        const matchesLocation = act.specificLocation?.toLowerCase().includes(query);
        const matchesInspector = act.inspectorName?.toLowerCase().includes(query);
        const matchesSubmittal = act.linkedSubmittalNo?.toLowerCase().includes(query) || act.linkedSubmittalTitle?.toLowerCase().includes(query);
        const matchesRfi = act.linkedRfiNo?.toLowerCase().includes(query) || act.linkedRfiSubject?.toLowerCase().includes(query);
        const matchesRemarks = act.remarks?.toLowerCase().includes(query) || act.delayOrObstructionNotes?.toLowerCase().includes(query);

        if (!matchesName && !matchesType && !matchesStart && !matchesEnd && !matchesLocation && !matchesInspector && !matchesSubmittal && !matchesRfi && !matchesRemarks) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'all' && act.activityType !== selectedCategory) {
        return false;
      }

      // QC Status
      if (selectedQcStatus !== 'all' && act.qcStatus !== selectedQcStatus) {
        return false;
      }

      // Side
      if (selectedSide !== 'all' && act.side !== selectedSide) {
        return false;
      }

      // Submittal link
      if (selectedSubmittalFilter === 'linked' && !act.linkedSubmittalNo && !act.linkedRfiNo) {
        return false;
      }
      if (selectedSubmittalFilter === 'unlinked' && (act.linkedSubmittalNo || act.linkedRfiNo)) {
        return false;
      }
      if (selectedSubmittalFilter === 'rfi_only' && !act.linkedRfiNo) {
        return false;
      }
      if (selectedSubmittalFilter === 'wir_only' && !act.linkedSubmittalNo) {
        return false;
      }

      // Date filter
      if (selectedDateFilter === 'today' && act.date !== todayStr) {
        return false;
      }
      if (selectedDateFilter === 'last7' && (act.date < sevenDaysAgo || act.date > todayStr)) {
        return false;
      }
      if (selectedDateFilter === 'last30' && (act.date < thirtyDaysAgo || act.date > todayStr)) {
        return false;
      }
      if (selectedDateFilter === 'custom' && customDateVal && act.date !== customDateVal) {
        return false;
      }

      // Station filter
      if (selectedStationFilter !== 'all') {
        const [minKm, maxKm] = selectedStationFilter.split('-').map(Number);
        const actStart = parseStationNumber(act.startStationKm);
        const actEnd = act.endStationKm ? parseStationNumber(act.endStationKm) : actStart;
        if (actStart > maxKm || actEnd < minKm) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Latest date first
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      // Then start station
      return parseStationNumber(a.startStationKm) - parseStationNumber(b.startStationKm);
    });
  }, [
    activities,
    searchTerm,
    selectedCategory,
    selectedQcStatus,
    selectedSide,
    selectedDateFilter,
    customDateVal,
    selectedStationFilter,
    selectedSubmittalFilter
  ]);

  // Key KPI metrics
  const stats = useMemo(() => {
    const totalCount = activities.length;
    const passedCount = activities.filter(a => a.qcStatus?.includes('Approved') || a.qcStatus?.includes('Passed')).length;
    const pendingCount = activities.filter(a => a.qcStatus?.includes('Pending') || a.qcStatus?.includes('Scheduled')).length;
    const linkedCount = activities.filter(a => a.linkedSubmittalNo || a.linkedRfiNo).length;
    const linkPct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const totalWorkingHours = activities.reduce((acc, a) => acc + (a.workingHours || 0), 0);
    const totalLostHours = activities.reduce((acc, a) => acc + (a.lostHoursRainOrObstruction || 0), 0);

    return {
      totalCount,
      passedCount,
      pendingCount,
      linkedCount,
      linkPct,
      passRate,
      totalWorkingHours,
      totalLostHours
    };
  }, [activities]);

  // Open modal for new activity
  const handleAddNewActivity = () => {
    const newAct: DailyActivityRecord = {
      id: 'act_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      shift: 'Day Shift (Standard)',
      activityType: 'Earthworks & Clearing',
      activityName: '',
      description: '',
      startStationKm: '00+000',
      endStationKm: '00+500',
      side: 'Full Width / Carriageway',
      specificLocation: '',
      sectionName: 'Lot 1',
      quantityExecuted: 0,
      unit: 'lm',
      qcStatus: 'Pending Consultant WIR Inspection',
      inspectorName: '',
      weatherCondition: 'Sunny / Dry',
      workingHours: 8.0,
      lostHoursRainOrObstruction: 0,
      equipmentList: [
        { id: 'eq_' + Date.now() + '_1', name: 'Motor Grader (Cat 140K/140M)', count: 2, status: 'Operating' },
        { id: 'eq_' + Date.now() + '_2', name: 'Vibratory Single Drum Roller 15T-18T', count: 2, status: 'Operating' },
        { id: 'eq_' + Date.now() + '_3', name: 'Dump Truck (16m³ - 22m³)', count: 4, status: 'Operating' }
      ],
      laborSummary: [
        { category: 'Project Manager / Engineers', count: 1 },
        { category: 'Site Foremen / Supervisors', count: 2 },
        { category: 'Heavy Equipment Operators', count: 8 },
        { category: 'Skilled Labor / Masons', count: 3 },
        { category: 'Unskilled Labor / Flagmen', count: 6 }
      ],
      remarks: '',
      contractorSiteAgent: project.contractor || '',
      consultantResidentEngineer: project.supervisionConsultant?.residentEngineerName || '',
      recordedBy: currentUserObj?.fullName || currentUserObj?.username || 'Site Engineer',
      createdAt: new Date().toISOString()
    };
    setEditingActivity(newAct);
    setModalTab('scope');
    setIsEditModalOpen(true);
  };

  // Open modal for edit
  const handleEditActivity = (act: DailyActivityRecord) => {
    setEditingActivity(JSON.parse(JSON.stringify(act)));
    setModalTab('scope');
    setIsEditModalOpen(true);
  };

  // Duplicate activity
  const handleDuplicateActivity = (act: DailyActivityRecord) => {
    const dup: DailyActivityRecord = {
      ...JSON.parse(JSON.stringify(act)),
      id: 'act_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      activityName: `${act.activityName} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: undefined
    };
    const updatedList = [dup, ...activities];
    const updatedProj: Project = {
      ...project,
      dailyActivities: updatedList,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };
    onUpdateProject(updatedProj, `Duplicated daily activity record: ${act.activityName}`);
  };

  // Delete activity
  const handleDeleteActivity = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete daily activity "${name}"?`)) return;
    const updatedList = activities.filter(a => a.id !== id);
    const updatedProj: Project = {
      ...project,
      dailyActivities: updatedList,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };
    onUpdateProject(updatedProj, `Deleted daily activity record: ${name}`);
  };

  // Save activity from modal
  const handleSaveModal = () => {
    if (!editingActivity) return;
    if (!editingActivity.activityName.trim()) {
      alert('Please enter an activity name or description.');
      return;
    }

    const isNew = !activities.some(a => a.id === editingActivity.id);
    let updatedList: DailyActivityRecord[];

    if (isNew) {
      updatedList = [editingActivity, ...activities];
    } else {
      updatedList = activities.map(a => a.id === editingActivity.id ? { ...editingActivity, updatedAt: new Date().toISOString() } : a);
    }

    const updatedProj: Project = {
      ...project,
      dailyActivities: updatedList,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };

    onUpdateProject(
      updatedProj,
      isNew
        ? `Logged new daily road activity: ${editingActivity.activityName} at ${editingActivity.startStationKm}`
        : `Updated daily road activity: ${editingActivity.activityName}`
    );

    setIsEditModalOpen(false);
    setEditingActivity(null);
  };

  // Quick log from Submittal or RFI selection
  const handleSelectSubmittalForActivity = (submittal: ConsultantSubmittalKpi) => {
    if (!editingActivity) return;

    const isRfi = submittal.type === 'RFI';
    setEditingActivity({
      ...editingActivity,
      linkedSubmittalId: submittal.id,
      linkedSubmittalNo: submittal.submittalNo,
      linkedSubmittalTitle: submittal.title,
      linkedSubmittalStatus: submittal.status,
      linkedRfiId: isRfi ? submittal.id : editingActivity.linkedRfiId,
      linkedRfiNo: isRfi ? submittal.submittalNo : editingActivity.linkedRfiNo,
      linkedRfiSubject: isRfi ? submittal.title : editingActivity.linkedRfiSubject,
      drawingRef: submittal.drawingRef || editingActivity.drawingRef,
      specificationRef: submittal.specificationRef || editingActivity.specificationRef,
      startStationKm: submittal.stationKm || editingActivity.startStationKm,
      activityName: editingActivity.activityName || submittal.title,
      description: editingActivity.description || submittal.contractorInquiry || submittal.notes || ''
    });
  };

  // Trigger quick WIR creation from an existing activity
  const handleOpenQuickWirModal = (act: DailyActivityRecord) => {
    setTargetActivityForWir(act);
    setNewWirType('Work Inspection (WIR)');
    setNewWirSubmittalNo(`WIR-${new Date().getFullYear()}-${String(submittalsList.length + 1).padStart(3, '0')}`);
    setNewWirTitle(`Inspection Request: ${act.activityName} (${act.startStationKm} - ${act.endStationKm || act.startStationKm})`);
    setNewWirTargetDays(3);
    setNewWirPriority('High');
    setIsQuickWirModalOpen(true);
  };

  // Submit new WIR/RFI into project.supervisionConsultant.submittalKpis
  const handleCreateWirFromActivity = () => {
    if (!targetActivityForWir || !newWirTitle.trim()) return;

    const newSubmittalItem: ConsultantSubmittalKpi = {
      id: 'sub_' + Date.now(),
      submittalNo: newWirSubmittalNo || `SUB-${Date.now().toString().slice(-4)}`,
      type: newWirType,
      title: newWirTitle,
      submittedDate: targetActivityForWir.date || new Date().toISOString().split('T')[0],
      targetDays: newWirTargetDays,
      status: 'Under Review',
      priority: newWirPriority,
      assignedEngineer: targetActivityForWir.inspectorName || project.supervisionConsultant?.residentEngineerName || '',
      discipline: targetActivityForWir.activityType?.includes('Structures') ? 'Structures & Bridges' : targetActivityForWir.activityType?.includes('Drainage') ? 'Drainage & Culverts' : 'Pavement & Materials',
      stationKm: `${targetActivityForWir.startStationKm} to ${targetActivityForWir.endStationKm || targetActivityForWir.startStationKm}`,
      drawingRef: targetActivityForWir.drawingRef || '',
      specificationRef: targetActivityForWir.specificationRef || '',
      contractorInquiry: `Formal inspection requested for daily activity executed on ${targetActivityForWir.date}. Scope: ${targetActivityForWir.activityName}. Quantity: ${targetActivityForWir.quantityExecuted} ${targetActivityForWir.unit}. Location: ${targetActivityForWir.side}.`,
      contractorCompany: project.contractor || '',
      rfiStatus: 'Awaiting Consultant Response',
      notes: `Generated from Daily Activity Log #${targetActivityForWir.id} by ${currentUserObj?.fullName || currentUserObj?.username || 'Site Quality Team'}`
    };

    const currentConsultant: SupervisionConsultantInfo = project.supervisionConsultant || {
      firmName: project.consultant || 'Supervision Consultant',
      associationType: 'Sole Consultant',
      jvPartners: '',
      contractRefNo: '',
      contractSignDate: '',
      commencementDate: '',
      originalCompletionDate: '',
      revisedCompletionDate: '',
      originalFeeEtb: 0,
      revisedFeeEtb: 0,
      contractType: 'Time-Based',
      personnel: [],
      invoices: [],
      submittalKpis: []
    };

    const updatedSubmittals = [newSubmittalItem, ...(currentConsultant.submittalKpis || [])];

    // Also link back to the target activity
    const updatedActivities = activities.map(a => {
      if (a.id === targetActivityForWir.id) {
        return {
          ...a,
          linkedSubmittalId: newSubmittalItem.id,
          linkedSubmittalNo: newSubmittalItem.submittalNo,
          linkedSubmittalTitle: newSubmittalItem.title,
          linkedSubmittalStatus: 'Under Review',
          wirReference: newSubmittalItem.submittalNo,
          qcStatus: 'Pending Consultant WIR Inspection'
        };
      }
      return a;
    });

    const updatedProj: Project = {
      ...project,
      dailyActivities: updatedActivities,
      supervisionConsultant: {
        ...currentConsultant,
        submittalKpis: updatedSubmittals
      },
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };

    onUpdateProject(updatedProj, `Created new ${newWirType} [${newSubmittalItem.submittalNo}] linked to daily activity at ${targetActivityForWir.startStationKm}`);
    setIsQuickWirModalOpen(false);
    setTargetActivityForWir(null);
  };

  // =========================================================================
  // CAMERA & PHOTO ATTACHMENT HANDLERS
  // =========================================================================

  // Client-side image resize & compression to ensure light payloads
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxWidth = 1280;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process incoming files from camera or file picker
  const handleProcessPhotoFiles = async (files: FileList | null, isQuickUpload = false) => {
    if (!files || files.length === 0) return;
    setIsCapturing(true);

    try {
      const newPhotos: Array<{
        id: string;
        caption: string;
        url: string;
        uploadedAt: string;
        stationKm?: string;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImage(file);
        const station = isQuickUpload
          ? (targetActivityForQuickUpload?.startStationKm || '')
          : (editingActivity?.startStationKm || '');

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        newPhotos.push({
          id: `photo_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          caption: cleanName.startsWith('image') || cleanName.startsWith('photo')
            ? `Site Inspection Photo @ ${station || 'Road Alignment'}`
            : `${cleanName} @ ${station || 'Road Alignment'}`,
          url: compressedBase64,
          uploadedAt: new Date().toISOString(),
          stationKm: station
        });
      }

      if (newPhotos.length === 0) return;

      if (isQuickUpload && targetActivityForQuickUpload) {
        // Direct quick upload onto the target activity
        const updatedActivities = activities.map(a => {
          if (a.id === targetActivityForQuickUpload.id) {
            return {
              ...a,
              photos: [...(a.photos || []), ...newPhotos]
            };
          }
          return a;
        });

        const updatedProj: Project = {
          ...project,
          dailyActivities: updatedActivities,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: currentUserObj?.username || 'User'
        };

        onUpdateProject(updatedProj, `Attached ${newPhotos.length} site photo(s) to activity: ${targetActivityForQuickUpload.activityName}`);
        
        // If gallery lightbox is currently open for this activity, update it
        if (galleryActivity && galleryActivity.id === targetActivityForQuickUpload.id) {
          setGalleryActivity({
            ...galleryActivity,
            photos: [...(galleryActivity.photos || []), ...newPhotos]
          });
        }
        setTargetActivityForQuickUpload(null);
      } else if (editingActivity) {
        setEditingActivity({
          ...editingActivity,
          photos: [...(editingActivity.photos || []), ...newPhotos]
        });
      }
    } catch (err) {
      console.error('Error attaching photo:', err);
      alert('Could not attach image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Live Camera viewfinder stream controls
  const startLiveCamera = async (newFacingMode = facingMode) => {
    setIsLiveCameraOpen(true);
    setLiveStreamError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Live camera error:', err);
      setLiveStreamError(err.message || 'Camera access not available on this device or permission was denied. You can still use the direct camera capture button.');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    const station = editingActivity?.startStationKm || galleryActivity?.startStationKm || 'Site';
    const newPhoto = {
      id: `photo_snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caption: `Live Camera Snapshot @ ${station} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      url: dataUrl,
      uploadedAt: new Date().toISOString(),
      stationKm: station
    };

    if (editingActivity) {
      setEditingActivity({
        ...editingActivity,
        photos: [...(editingActivity.photos || []), newPhoto]
      });
    } else if (galleryActivity) {
      const updatedActivities = activities.map(a => {
        if (a.id === galleryActivity.id) {
          return {
            ...a,
            photos: [...(a.photos || []), newPhoto]
          };
        }
        return a;
      });

      const updatedProj: Project = {
        ...project,
        dailyActivities: updatedActivities,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: currentUserObj?.username || 'User'
      };

      onUpdateProject(updatedProj, `Captured live camera photo for: ${galleryActivity.activityName}`);
      setGalleryActivity({
        ...galleryActivity,
        photos: [...(galleryActivity.photos || []), newPhoto]
      });
    }
  };

  // Quick camera upload trigger for an individual activity
  const triggerQuickCamera = (act: DailyActivityRecord) => {
    setTargetActivityForQuickUpload(act);
    if (quickCameraInputRef.current) {
      quickCameraInputRef.current.click();
    }
  };

  // Quick device gallery trigger
  const triggerQuickGallery = (act: DailyActivityRecord) => {
    setTargetActivityForQuickUpload(act);
    if (quickGalleryInputRef.current) {
      quickGalleryInputRef.current.click();
    }
  };

  // Download photo file
  const handleDownloadPhoto = (url: string, caption?: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERA_Site_Photo_${(caption || 'Inspection').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Delete photo from an activity
  const handleDeletePhotoFromGallery = (photoId: string) => {
    if (!galleryActivity) return;
    if (!window.confirm('Are you sure you want to remove this site photo?')) return;

    const remainingPhotos = (galleryActivity.photos || []).filter(p => p.id !== photoId);
    const updatedActivities = activities.map(a => {
      if (a.id === galleryActivity.id) {
        return {
          ...a,
          photos: remainingPhotos
        };
      }
      return a;
    });

    const updatedProj: Project = {
      ...project,
      dailyActivities: updatedActivities,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };

    onUpdateProject(updatedProj, `Deleted site photo from activity ${galleryActivity.activityName}`);
    setGalleryActivity({
      ...galleryActivity,
      photos: remainingPhotos
    });

    if (lightboxPhotoIndex >= remainingPhotos.length && remainingPhotos.length > 0) {
      setLightboxPhotoIndex(remainingPhotos.length - 1);
    }
  };

  // Save specific notes and structures for individual kilometer segments
  const handleSaveSegmentNotes = () => {
    if (!selectedStationFilter || selectedStationFilter === 'all') return;

    const updatedNotes = {
      ...(project.segmentNotes || {}),
      [selectedStationFilter]: {
        structures: segStructures,
        status: segStatus,
        notes: segNotes,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUserObj?.fullName || currentUserObj?.username || 'Site Engineer'
      }
    };

    const updatedProj: Project = {
      ...project,
      segmentNotes: updatedNotes,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };

    onUpdateProject(updatedProj, `Updated segment details & notes for segment: Km ${selectedStationFilter}`);
  };

  // Clear specific notes and structures for individual kilometer segments
  const handleClearSegmentNotes = () => {
    if (!selectedStationFilter || selectedStationFilter === 'all') return;
    if (!window.confirm(`Are you sure you want to clear all notes and status details for segment Km ${selectedStationFilter}?`)) return;

    const updatedNotes = { ...(project.segmentNotes || {}) };
    delete updatedNotes[selectedStationFilter];

    const updatedProj: Project = {
      ...project,
      segmentNotes: updatedNotes,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUserObj?.username || 'User'
    };

    onUpdateProject(updatedProj, `Cleared segment details & notes for segment: Km ${selectedStationFilter}`);
    setSegStructures('');
    setSegStatus('Not Started');
    setSegNotes('');
  };

  // Delete photo during modal editing
  const handleDeletePhotoInModal = (photoId: string) => {
    if (!editingActivity) return;
    setEditingActivity({
      ...editingActivity,
      photos: (editingActivity.photos || []).filter(p => p.id !== photoId)
    });
  };

  // Update photo caption or station during modal editing
  const handleUpdatePhotoInModal = (photoId: string, updates: Partial<{ caption: string; stationKm: string }>) => {
    if (!editingActivity) return;
    setEditingActivity({
      ...editingActivity,
      photos: (editingActivity.photos || []).map(p => {
        if (p.id === photoId) {
          return { ...p, ...updates };
        }
        return p;
      })
    });
  };
  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    let curY = 35;
    let pageCount = 0;

    const drawHeader = () => {
      pageCount++;
      // Top colored bar
      doc.setFillColor(30, 58, 138); // blue-900
      doc.rect(margin, 18, contentWidth, 4, 'F');

      // Outer border
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin - 8, 12, contentWidth + 16, pageHeight - 24, 3, 3, 'S');

      // Title & Emblem
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('ETHIOPIAN ROADS ADMINISTRATION (ERA)', margin, curY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('DAILY ROAD CONSTRUCTION ACTIVITIES & WIR INSPECTION REPORT', margin, curY + 14);

      // Meta box on right
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Project: ${project.name || 'ERA Road Project'}`, pageWidth - margin, curY, { align: 'right' });
      doc.text(`Contractor: ${project.contractor || 'N/A'} | Consultant: ${project.consultant || 'N/A'}`, pageWidth - margin, curY + 11, { align: 'right' });
      doc.text(`Total Length: ${totalLengthKm} Km | Export Date: ${new Date().toISOString().split('T')[0]}`, pageWidth - margin, curY + 22, { align: 'right' });

      curY += 34;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, curY, pageWidth - margin, curY);
      curY += 12;
    };

    const drawFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);
      doc.text(`ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL SITE DAILY RECORD • ${project.name}`, margin, pageHeight - 20);
      doc.text(`Page ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 55) {
        drawFooter();
        doc.addPage();
        curY = 35;
        drawHeader();
      }
    };

    drawHeader();

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, contentWidth, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    const cols = [
      { label: 'Date / Shift', x: margin + 6, w: 75 },
      { label: 'Activity Type & Scope', x: margin + 85, w: 165 },
      { label: 'Station Location / Side', x: margin + 255, w: 110 },
      { label: 'Executed Qty', x: margin + 370, w: 65 },
      { label: 'Submittal / RFI Link', x: margin + 440, w: 115 },
      { label: 'QC / WIR Status', x: margin + 560, w: 105 },
      { label: 'Inspector / Remarks', x: margin + 670, w: 90 }
    ];

    cols.forEach(c => {
      doc.text(c.label, c.x, curY + 13);
    });

    curY += 24;

    filteredActivities.forEach((act, idx) => {
      checkSpace(28);

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY - 10, contentWidth, 24, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      // Date & shift
      doc.text(`${act.date}\n${act.shift ? act.shift.split(' ')[0] : 'Day'}`, cols[0].x, curY - 1);

      // Activity Name
      doc.setFont('helvetica', 'bold');
      const actTitle = doc.splitTextToSize(act.activityName || act.activityType, cols[1].w - 10);
      doc.text(actTitle.slice(0, 2), cols[1].x, curY - 1);

      // Location
      doc.setFont('helvetica', 'normal');
      const locText = `${act.startStationKm}${act.endStationKm ? ' - ' + act.endStationKm : ''}\n${act.side || ''}`;
      doc.text(locText, cols[2].x, curY - 1);

      // Qty
      doc.text(`${act.quantityExecuted || 0} ${act.unit || ''}`, cols[3].x, curY + 3);

      // Submittal link
      const linkText = act.linkedSubmittalNo ? `[Sub] ${act.linkedSubmittalNo}` : act.linkedRfiNo ? `[RFI] ${act.linkedRfiNo}` : 'None';
      doc.text(linkText, cols[4].x, curY + 3);

      // QC Status
      doc.text(act.qcStatus || 'Pending', cols[5].x, curY + 3);

      // Inspector / Remarks
      const inspText = act.inspectorName || act.remarks || 'Site Team';
      const truncated = inspText.length > 22 ? inspText.substring(0, 20) + '...' : inspText;
      doc.text(truncated, cols[6].x, curY + 3);

      curY += 24;
    });

    // Approval Blocks
    checkSpace(75);
    curY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text('OFFICIAL SITE VERIFICATION & REPORT APPROVAL BLOCKS', margin, curY);
    curY += 12;

    const sigTitles = [
      'Reviewed By: PMO Project Manager',
      'Approved By: ERA Directorate Director'
    ];
    const sigGap = 20;
    const sigWidth = (contentWidth - sigGap) / 2;

    sigTitles.forEach((stitle, sIdx) => {
      const sx = margin + sIdx * (sigWidth + sigGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(sx, curY, sigWidth, 48, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(stitle, sx + 12, curY + 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature: ______________________   Date: ____________', sx + 12, curY + 36);
    });

    drawFooter();
    doc.save(`ERA_Daily_Activities_Report_${project.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Shift',
      'Activity Category',
      'Activity Name',
      'Description',
      'Start Station (Km)',
      'End Station (Km)',
      'Side',
      'Specific Location',
      'Section Name',
      'Quantity Executed',
      'Unit',
      'Linked Submittal No',
      'Linked Submittal Title',
      'Linked RFI No',
      'QC Inspection Status',
      'Inspector Name',
      'Drawing Ref',
      'Specification Ref',
      'Weather Condition',
      'Working Hours',
      'Lost Rain Hours',
      'Remarks',
      'Recorded By'
    ];

    const rows = filteredActivities.map(a => [
      a.date,
      a.shift || '',
      a.activityType,
      `"${(a.activityName || '').replace(/"/g, '""')}"`,
      `"${(a.description || '').replace(/"/g, '""')}"`,
      a.startStationKm,
      a.endStationKm || '',
      a.side || '',
      `"${(a.specificLocation || '').replace(/"/g, '""')}"`,
      a.sectionName || '',
      a.quantityExecuted || 0,
      a.unit || '',
      a.linkedSubmittalNo || '',
      `"${(a.linkedSubmittalTitle || '').replace(/"/g, '""')}"`,
      a.linkedRfiNo || '',
      a.qcStatus || '',
      a.inspectorName || '',
      a.drawingRef || '',
      a.specificationRef || '',
      a.weatherCondition || '',
      a.workingHours || 0,
      a.lostHoursRainOrObstruction || 0,
      `"${(a.remarks || '').replace(/"/g, '""')}"`,
      a.recordedBy || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Daily_Activities_${project.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Segments for Interactive Chainage Bar (e.g. 5km blocks)
  const chainageSegments = useMemo(() => {
    const step = 5;
    const count = Math.ceil(totalLengthKm / step);
    const segs = [];
    for (let i = 0; i < count; i++) {
      const start = i * step;
      const end = Math.min((i + 1) * step, totalLengthKm);
      const segKey = `${start}-${end}`;
      const actsInSeg = activities.filter(a => {
        const aStart = parseStationNumber(a.startStationKm);
        const aEnd = a.endStationKm ? parseStationNumber(a.endStationKm) : aStart;
        return aStart <= end && aEnd >= start;
      });
      segs.push({
        start,
        end,
        key: segKey,
        label: `Km ${start} - ${end}`,
        count: actsInSeg.length
      });
    }
    return segs;
  }, [totalLengthKm, activities]);

  return (
    <div className="space-y-6">
      {/* Hidden File & Camera Inputs for Capturing Photos */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => handleProcessPhotoFiles(e.target.files, false)}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        onChange={(e) => handleProcessPhotoFiles(e.target.files, false)}
        className="hidden"
      />
      <input
        type="file"
        ref={quickCameraInputRef}
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => handleProcessPhotoFiles(e.target.files, true)}
        className="hidden"
      />
      <input
        type="file"
        ref={quickGalleryInputRef}
        accept="image/*"
        multiple
        onChange={(e) => handleProcessPhotoFiles(e.target.files, true)}
        className="hidden"
      />

      {/* Top Banner & KPI Cards */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-blue-400" />
              Daily Construction Activities & Road Work Record
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl font-medium">
              Detailed daily site operations ledger with station chainage mapping, equipment deployment, labor allocation, and direct linkage to Supervision Consultant Submittals & RFIs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowChainageMap(!showChainageMap)}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                showChainageMap
                  ? 'bg-blue-900/60 hover:bg-blue-900 text-blue-200 border-blue-700/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={showChainageMap ? 'Hide Road Chainage Strip Map' : 'View Road Chainage Strip Map'}
            >
              {showChainageMap ? <EyeOff className="w-4 h-4 text-blue-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
              <span>{showChainageMap ? 'Hide Strip Map' : 'View Strip Map'}</span>
            </button>

            {!isReadonly && (
              <button
                onClick={handleAddNewActivity}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Log Daily Activity
              </button>
            )}
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Export Official ERA PDF"
            >
              <Download className="w-4 h-4 text-rose-400" />
              ERA PDF Report
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Export CSV Data"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              CSV Export
            </button>
          </div>
        </div>

        {/* 6 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Daily Records</div>
            <div className="text-xl font-black text-white mt-1">{stats.totalCount}</div>
            <div className="text-[10px] text-blue-400 mt-0.5">{filteredActivities.length} in current view</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">WIR Inspection Passed</div>
            <div className="text-xl font-black text-emerald-300 mt-1">{stats.passedCount}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{stats.passRate}% Pass Rate</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Pending WIR Review</div>
            <div className="text-xl font-black text-amber-300 mt-1">{stats.pendingCount}</div>
            <div className="text-[10px] text-amber-400 mt-0.5">Under consultant inspection</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">Submittal / RFI Links</div>
            <div className="text-xl font-black text-indigo-300 mt-1">{stats.linkedCount}</div>
            <div className="text-[10px] text-indigo-400 mt-0.5">{stats.linkPct}% Linkage Coverage</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Total Site Hours</div>
            <div className="text-xl font-black text-cyan-300 mt-1">{stats.totalWorkingHours.toFixed(1)} h</div>
            <div className="text-[10px] text-cyan-400 mt-0.5">Recorded equipment hours</div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Weather Rain Lost</div>
            <div className="text-xl font-black text-rose-300 mt-1">{stats.totalLostHours.toFixed(1)} h</div>
            <div className="text-[10px] text-rose-400 mt-0.5">Rain / bottleneck delay</div>
          </div>
        </div>
      </div>

      {/* Interactive Road Chainage Map / Strip Visualizer (Collapsible & Viewable with Button) */}
      {showChainageMap && (
        <div className="bg-white dark:bg-slate-850 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-all animate-fadeIn">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                Interactive Road Chainage Strip Map (Km 00+000 to Km {Math.floor(totalLengthKm)}+{Math.round((totalLengthKm % 1) * 1000)})
              </span>
              {selectedStationFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-lg shrink-0">
                  Filtered: {selectedStationFilter}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowChainageMap(false)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Hide Strip Map</span>
              </button>
            </div>
          </div>

          {/* Chainage Segments Grid */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] text-slate-500 font-medium">
              Click any station block below to filter activities by road chainage location:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
              <button
                onClick={() => setSelectedStationFilter('all')}
                className={`p-2 rounded-xl text-center text-xs font-bold transition cursor-pointer border ${
                  selectedStationFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>All Road</div>
                <div className="text-[10px] opacity-80">{activities.length} logs</div>
              </button>

              {chainageSegments.map(seg => {
                const segData = project.segmentNotes?.[seg.key];
                const hasNotes = !!(segData?.notes || segData?.structures || (segData?.status && segData?.status !== 'Not Started'));
                const segStatusValue = segData?.status || 'Not Started';

                return (
                  <button
                    key={seg.key}
                    onClick={() => setSelectedStationFilter(seg.key === selectedStationFilter ? 'all' : seg.key)}
                    className={`p-2 rounded-xl text-center text-xs font-bold transition cursor-pointer border relative flex flex-col justify-between min-h-[64px] ${
                      selectedStationFilter === seg.key
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : seg.count > 0
                        ? 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {hasNotes && (
                      <span 
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] text-white font-extrabold shadow-sm"
                        title={`Segment Notes: ${segData.notes || ''} ${segData.structures ? `| Structures: ${segData.structures}` : ''}`}
                      >
                        📝
                      </span>
                    )}

                    <div className="font-mono text-[11px] self-center">{seg.label}</div>
                    
                    <div className="text-[9px] mt-1 flex flex-col items-center justify-center gap-0.5 w-full">
                      <div className="opacity-80">
                        {seg.count > 0 ? (
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">{seg.count} logs</span>
                        ) : (
                          <span>0 logs</span>
                        )}
                      </div>

                      {segStatusValue !== 'Not Started' && (
                        <span className={`text-[8px] px-1 py-0.5 rounded-md font-sans font-bold leading-none scale-90 truncate max-w-full ${
                          segStatusValue === 'Completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                        }`}>
                          {segStatusValue}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segment-specific details panel shown when a segment is selected */}
          {selectedStationFilter !== 'all' && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="p-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg">📝</span>
                    Segment Km {selectedStationFilter} Construction details
                  </span>
                  {project.segmentNotes?.[selectedStationFilter]?.lastUpdated && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      (Last updated on {new Date(project.segmentNotes[selectedStationFilter].lastUpdated!).toLocaleDateString()} by {project.segmentNotes[selectedStationFilter].updatedBy})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  Active logs in this segment: {activities.filter(a => {
                    const [minKm, maxKm] = selectedStationFilter.split('-').map(Number);
                    const aStart = parseStationNumber(a.startStationKm);
                    const aEnd = a.endStationKm ? parseStationNumber(a.endStationKm) : aStart;
                    return aStart <= maxKm && aEnd >= minKm;
                  }).length} records
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Structures, Bridges & Drainage Details */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Bridges, Culverts &amp; Structures</label>
                  <input
                    type="text"
                    value={segStructures}
                    onChange={(e) => setSegStructures(e.target.value)}
                    disabled={isReadonly}
                    placeholder="e.g. Bridge at Km 12+400, Culvert completed..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white disabled:opacity-60"
                  />
                </div>

                {/* 2. Construction Status Layer select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Segment Layer Status</label>
                  <select
                    value={segStatus}
                    onChange={(e) => setSegStatus(e.target.value)}
                    disabled={isReadonly}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white disabled:opacity-60 cursor-pointer"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Clearing &amp; Earthworks">Clearing &amp; Earthworks</option>
                    <option value="Subgrade Leveling">Subgrade Leveling</option>
                    <option value="Subbase Layering">Subbase Layering</option>
                    <option value="Basecourse Layering">Basecourse Layering</option>
                    <option value="Asphalt Surfacing">Asphalt Surfacing</option>
                    <option value="Completed">Completed / Passed Inspection</option>
                  </select>
                </div>

                {/* 3. Detailed Supervision Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Supervision / Geo-Notes</label>
                  <textarea
                    rows={1}
                    value={segNotes}
                    onChange={(e) => setSegNotes(e.target.value)}
                    disabled={isReadonly}
                    placeholder="e.g. Soil tests passed, compaction at 98%..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white disabled:opacity-60 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons for Segment Details */}
              {!isReadonly && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                  <button
                    onClick={handleClearSegmentNotes}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Clear Notes
                  </button>
                  <button
                    onClick={handleSaveSegmentNotes}
                    className="px-4.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    Save Segment Details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter & Control Bar */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by activity name, station (e.g. 14+200), submittal #, inspector, drawing ref..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Site Cards
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Activity Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All Categories</option>
              {ACTIVITY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* QC Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">QC / WIR Status</label>
            <select
              value={selectedQcStatus}
              onChange={(e) => setSelectedQcStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All QC Statuses</option>
              {QC_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Submittal Link Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Submittal / RFI Link</label>
            <select
              value={selectedSubmittalFilter}
              onChange={(e) => setSelectedSubmittalFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All Records</option>
              <option value="linked">🔗 Linked to Submittal or RFI</option>
              <option value="wir_only">📋 Linked to WIR / Submittal</option>
              <option value="rfi_only">❓ Linked to Technical RFI</option>
              <option value="unlinked">Unlinked Records</option>
            </select>
          </div>

          {/* Side / Carriageway Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Side / Carriageway</label>
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All Sides</option>
              {LOCATION_SIDES.map((side) => (
                <option key={side} value={side}>{side}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date Period</label>
            <div className="flex gap-1.5">
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Specific Date</option>
              </select>
              {selectedDateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDateVal}
                  onChange={(e) => setCustomDateVal(e.target.value)}
                  className="w-28 px-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] dark:text-white"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Activities Content Area */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white dark:bg-slate-850 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            🚜
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">No Daily Activity Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No daily activities match your current search filters. Clear your filters or click "Log Daily Activity" to record a new site work entry.
            </p>
          </div>
          {!isReadonly && (
            <button
              onClick={handleAddNewActivity}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              Log First Activity
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed Table View */
        <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date / Shift</th>
                  <th className="py-3 px-4">Activity Category & Scope</th>
                  <th className="py-3 px-4">Road Location</th>
                  <th className="py-3 px-4">Executed Qty</th>
                  <th className="py-3 px-4">Submittal / RFI Link</th>
                  <th className="py-3 px-4">QC / WIR Status</th>
                  <th className="py-3 px-4">Resources</th>
                  <th className="py-3 px-4 text-center">Photos & Camera</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {filteredActivities.map((act) => {
                  const linkedSub = submittalsList.find(s => s.id === act.linkedSubmittalId || s.submittalNo === act.linkedSubmittalNo);
                  const linkedRfi = submittalsList.find(s => s.id === act.linkedRfiId || s.submittalNo === act.linkedRfiNo);

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition duration-150"
                    >
                      {/* Date / Shift */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {act.date}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {act.shift || 'Day Shift'}
                        </div>
                        {act.weatherCondition && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <Sun className="w-3 h-3" />
                            {act.weatherCondition.split(' ')[0]}
                          </div>
                        )}
                      </td>

                      {/* Activity Category & Name */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-md text-[10px] font-bold">
                          {act.activityType}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                          {act.activityName}
                        </div>
                        {act.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {act.description}
                          </div>
                        )}
                        {act.drawingRef && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            {act.drawingRef}
                          </div>
                        )}
                      </td>

                      {/* Road Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {formatStationKm(act.startStationKm)}
                          {act.endStationKm && ` → ${formatStationKm(act.endStationKm)}`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {act.side || 'Full Width'}
                        </div>
                        {act.specificLocation && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                            {act.specificLocation}
                          </div>
                        )}
                      </td>

                      {/* Executed Qty */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {act.quantityExecuted?.toLocaleString() || 0}{' '}
                          <span className="text-xs font-normal text-slate-500">{act.unit || 'lm'}</span>
                        </div>
                        {act.cumulativeQuantityToDate !== undefined && act.cumulativeQuantityToDate > 0 && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Cum: {act.cumulativeQuantityToDate.toLocaleString()} {act.unit}
                          </div>
                        )}
                      </td>

                      {/* Submittal / RFI Link */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {act.linkedSubmittalNo ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => linkedSub && setPreviewSubmittal(linkedSub)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] font-mono font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                              title="Click to view full submittal details"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {act.linkedSubmittalNo}
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            {act.linkedSubmittalTitle && (
                              <div className="text-[10px] text-slate-500 line-clamp-1">
                                {act.linkedSubmittalTitle}
                              </div>
                            )}
                          </div>
                        ) : act.linkedRfiNo ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => linkedRfi && setPreviewSubmittal(linkedRfi)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                              title="Click to view full RFI details"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {act.linkedRfiNo}
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            {act.linkedRfiSubject && (
                              <div className="text-[10px] text-slate-500 line-clamp-1">
                                {act.linkedRfiSubject}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenQuickWirModal(act)}
                            className="text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition font-bold"
                            title="Generate a new WIR or RFI from this activity"
                          >
                            <Plus className="w-3 h-3" />
                            Link / Create WIR
                          </button>
                        )}
                      </td>

                      {/* QC Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            act.qcStatus?.includes('Approved') || act.qcStatus?.includes('Passed')
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : act.qcStatus?.includes('Comments')
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : act.qcStatus?.includes('Pending') || act.qcStatus?.includes('Scheduled')
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {act.qcStatus?.includes('Approved') || act.qcStatus?.includes('Passed') ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : act.qcStatus?.includes('Pending') ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                          )}
                          {act.qcStatus || 'Pending'}
                        </span>
                        {act.inspectorName && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {act.inspectorName}
                          </div>
                        )}
                      </td>

                      {/* Resources (Equipment & Labor summary) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {act.equipmentList?.reduce((sum, e) => sum + (e.count || 0), 0) || 0} Plant units
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {act.laborSummary?.reduce((sum, l) => sum + (l.count || 0), 0) || 0} Manpower
                          </span>
                        </div>
                      </td>

                      {/* Photos & Camera Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {act.photos && act.photos.length > 0 ? (
                            <button
                              onClick={() => {
                                setGalleryActivity(act);
                                setLightboxPhotoIndex(0);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] font-bold transition cursor-pointer shadow-2xs"
                              title="View site inspection photos"
                            >
                              {act.photos[0].url ? (
                                <img
                                  src={act.photos[0].url}
                                  alt="Thumb"
                                  className="w-4 h-4 rounded-md object-cover border border-amber-300"
                                />
                              ) : (
                                <Camera className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              <span>{act.photos.length} Photo{act.photos.length > 1 ? 's' : ''}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No photos</span>
                          )}

                          {!isReadonly && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => triggerQuickCamera(act)}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Take photo with device camera"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => triggerQuickGallery(act)}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Upload photos from device files"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenQuickWirModal(act)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Generate WIR / RFI"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          {!isReadonly && (
                            <>
                              <button
                                onClick={() => handleDuplicateActivity(act)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Duplicate Activity"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditActivity(act)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id, act.activityName)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Site Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => {
            const linkedSub = submittalsList.find(s => s.id === act.linkedSubmittalId || s.submittalNo === act.linkedSubmittalNo);

            return (
              <div
                key={act.id}
                className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full text-[10px] font-bold">
                      {act.activityType}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {act.date}
                    </span>
                  </div>

                  {/* Activity Name & Description */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                      {act.activityName}
                    </h4>
                    {act.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                        {act.description}
                      </p>
                    )}
                  </div>

                  {/* Road Location Badge */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{formatStationKm(act.startStationKm)}</span>
                      {act.endStationKm && <span>→ {formatStationKm(act.endStationKm)}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Side: {act.side || 'Full Width'}</span>
                      {act.specificLocation && (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">{act.specificLocation}</span>
                      )}
                    </div>
                  </div>

                  {/* Executed Qty & QC status */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Executed Qty</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {act.quantityExecuted?.toLocaleString()} {act.unit}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">QC Inspection</div>
                      <div className="text-[11px] font-bold truncate text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {act.qcStatus?.split(' ')[0] || 'Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Linked Submittal / RFI */}
                  {act.linkedSubmittalNo ? (
                    <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Linked Submittal
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {act.linkedSubmittalNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                        {act.linkedSubmittalTitle || 'Inspection Request'}
                      </div>
                    </div>
                  ) : act.linkedRfiNo ? (
                    <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Linked RFI
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                          {act.linkedRfiNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                        {act.linkedRfiSubject || 'Technical Clarification'}
                      </div>
                    </div>
                  ) : null}

                  {/* Site Photos Gallery Strip */}
                  {act.photos && act.photos.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-amber-500" />
                          Site Photos ({act.photos.length})
                        </span>
                        <button
                          onClick={() => {
                            setGalleryActivity(act);
                            setLightboxPhotoIndex(0);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[10px] cursor-pointer"
                        >
                          View Full Gallery
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {act.photos.slice(0, 4).map((photo, pIdx) => (
                          <div
                            key={photo.id}
                            onClick={() => {
                              setGalleryActivity(act);
                              setLightboxPhotoIndex(pIdx);
                            }}
                            className="relative group shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 w-14 h-14 bg-slate-100 dark:bg-slate-800"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Site Photo'}
                              className="w-full h-full object-cover transition duration-200 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                        {act.photos.length > 4 && (
                          <button
                            onClick={() => {
                              setGalleryActivity(act);
                              setLightboxPhotoIndex(4);
                            }}
                            className="w-14 h-14 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                          >
                            <span>+{act.photos.length - 4}</span>
                            <span className="text-[9px] text-slate-400">more</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    !isReadonly && (
                      <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 opacity-60" />
                          No photos attached
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => triggerQuickCamera(act)}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <Camera className="w-3 h-3" />
                            Camera
                          </button>
                          <button
                            onClick={() => triggerQuickGallery(act)}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
                          >
                            Upload
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-400">
                    By: {act.recordedBy || 'Site Team'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenQuickWirModal(act)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Generate WIR"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    {!isReadonly && (
                      <>
                        <button
                          onClick={() => handleDuplicateActivity(act)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditActivity(act)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(act.id, act.activityName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT DAILY ACTIVITY MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditModalOpen && editingActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    ERA DAILY SITE OPERATION
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blue-500" />
                    {editingActivity.activityName ? `Edit: ${editingActivity.activityName}` : 'Log New Daily Road Activity'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900 px-6 gap-2 text-xs font-bold font-mono overflow-x-auto">
                {[
                  { id: 'scope', label: '1. Activity Scope & Date', icon: FileText },
                  { id: 'location', label: '2. Road Location & Chainage', icon: MapPin },
                  { id: 'submittal_link', label: '3. Submittal & RFI Link', icon: LinkIcon },
                  { id: 'resources', label: '4. Plant & Labor', icon: Truck },
                  { id: 'qc', label: '5. Quality & Sign-off', icon: CheckCircle2 },
                  { id: 'photos', label: `6. Site Photos (${(editingActivity.photos || []).length})`, icon: Camera }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setModalTab(t.id as any)}
                      className={`py-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        modalTab === t.id
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-850'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
                {/* Tab 1: Scope & Date */}
                {modalTab === 'scope' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Record Date *
                        </label>
                        <input
                          type="date"
                          value={editingActivity.date}
                          onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Work Shift
                        </label>
                        <select
                          value={editingActivity.shift || 'Day Shift (Standard)'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, shift: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          {SHIFT_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Weather Condition
                        </label>
                        <select
                          value={editingActivity.weatherCondition || 'Sunny / Dry'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, weatherCondition: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          {WEATHER_CONDITIONS.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Activity Category *
                        </label>
                        <select
                          value={editingActivity.activityType}
                          onChange={(e) => setEditingActivity({ ...editingActivity, activityType: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold text-blue-600 dark:text-blue-400"
                        >
                          {ACTIVITY_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Activity Specific Name / Title *
                        </label>
                        <input
                          type="text"
                          value={editingActivity.activityName}
                          onChange={(e) => setEditingActivity({ ...editingActivity, activityName: e.target.value })}
                          placeholder="e.g. Subgrade Compaction Layer 2, Box Culvert Cast-in-place..."
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Technical Scope & Execution Methodology Description
                      </label>
                      <textarea
                        rows={3}
                        value={editingActivity.description || ''}
                        onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                        placeholder="Provide details on layer thickness, compaction parameters, concrete mix grade, testing methods, etc..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Approved Drawing Reference
                        </label>
                        <input
                          type="text"
                          value={editingActivity.drawingRef || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, drawingRef: e.target.value })}
                          placeholder="e.g. ERA-DWG-RD-044-REV2"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Technical Specification Clause
                        </label>
                        <input
                          type="text"
                          value={editingActivity.specificationRef || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, specificationRef: e.target.value })}
                          placeholder="e.g. ERA Standard Technical Spec Section 2300"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Location & Quantities */}
                {modalTab === 'location' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Start Station / Chainage (Km) *
                        </label>
                        <input
                          type="text"
                          value={editingActivity.startStationKm}
                          onChange={(e) => setEditingActivity({ ...editingActivity, startStationKm: e.target.value })}
                          placeholder="e.g. 14+200 or Km 14+200"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          End Station / Chainage (Km) (Optional for spot structures)
                        </label>
                        <input
                          type="text"
                          value={editingActivity.endStationKm || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, endStationKm: e.target.value })}
                          placeholder="e.g. 14+800 or Km 14+800"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Side / Offset
                        </label>
                        <select
                          value={editingActivity.side || 'Full Width / Carriageway'}
                          onChange={(e) => setEditingActivity({ ...editingActivity, side: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                          {LOCATION_SIDES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Specific Structure / Node
                        </label>
                        <input
                          type="text"
                          value={editingActivity.specificLocation || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, specificLocation: e.target.value })}
                          placeholder="e.g. Culvert #18 @ Km 16+350, Bridge #2"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Section / Lot
                        </label>
                        <input
                          type="text"
                          value={editingActivity.sectionName || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, sectionName: e.target.value })}
                          placeholder="e.g. Lot 1 - Main Carriageway"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Quantities Section */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-500" />
                        Executed Work Quantities
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Executed Today / Shift *
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingActivity.quantityExecuted}
                            onChange={(e) => setEditingActivity({ ...editingActivity, quantityExecuted: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-black text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Measurement Unit
                          </label>
                          <select
                            value={editingActivity.unit}
                            onChange={(e) => setEditingActivity({ ...editingActivity, unit: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                          >
                            {QUANTITY_UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Cumulative to Date (Optional)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingActivity.cumulativeQuantityToDate || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, cumulativeQuantityToDate: parseFloat(e.target.value) || 0 })}
                            placeholder="Cumulative total"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Submittal & RFI Link */}
                {modalTab === 'submittal_link' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-xs">
                      <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Direct Linkage with Supervision Consultant Submittals & RFIs
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                        Select an existing WIR, Material Approval, Design Submittal, or RFI to link with this activity. Or select from the list below to auto-populate the record.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Linked Submittal Dropdown */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Select Project Submittal / WIR
                        </label>
                        <select
                          value={editingActivity.linkedSubmittalId || ''}
                          onChange={(e) => {
                            const found = submittalsList.find(s => s.id === e.target.value);
                            if (found) {
                              handleSelectSubmittalForActivity(found);
                            } else {
                              setEditingActivity({
                                ...editingActivity,
                                linkedSubmittalId: undefined,
                                linkedSubmittalNo: undefined,
                                linkedSubmittalTitle: undefined,
                                linkedSubmittalStatus: undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                        >
                          <option value="">-- No Submittal Linked --</option>
                          {submittalsList.map(s => (
                            <option key={s.id} value={s.id}>
                              [{s.submittalNo}] {s.type} - {s.title} ({s.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Linked RFI Dropdown */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Select Project Technical RFI
                        </label>
                        <select
                          value={editingActivity.linkedRfiId || ''}
                          onChange={(e) => {
                            const found = submittalsList.find(s => s.id === e.target.value);
                            if (found) {
                              setEditingActivity({
                                ...editingActivity,
                                linkedRfiId: found.id,
                                linkedRfiNo: found.submittalNo,
                                linkedRfiSubject: found.title
                              });
                            } else {
                              setEditingActivity({
                                ...editingActivity,
                                linkedRfiId: undefined,
                                linkedRfiNo: undefined,
                                linkedRfiSubject: undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                        >
                          <option value="">-- No RFI Linked --</option>
                          {submittalsList.filter(s => s.type === 'RFI').map(r => (
                            <option key={r.id} value={r.id}>
                              [{r.submittalNo}] {r.title} ({r.rfiStatus || r.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Manual Entry override */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Custom Submittal Reference No.
                        </label>
                        <input
                          type="text"
                          value={editingActivity.linkedSubmittalNo || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, linkedSubmittalNo: e.target.value })}
                          placeholder="e.g. WIR-2026-042"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Custom RFI Reference No.
                        </label>
                        <input
                          type="text"
                          value={editingActivity.linkedRfiNo || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, linkedRfiNo: e.target.value })}
                          placeholder="e.g. RFI-018"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        RFI Clarification or Consultant Review Notes
                      </label>
                      <textarea
                        rows={2}
                        value={editingActivity.rfiClarificationNote || ''}
                        onChange={(e) => setEditingActivity({ ...editingActivity, rfiClarificationNote: e.target.value })}
                        placeholder="Notes on consultant technical direction or approval conditions..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 4: Resources (Plant & Labor) */}
                {modalTab === 'resources' && (
                  <div className="space-y-4">
                    {/* Working Hours & Weather Lost */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Working Hours on Site
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingActivity.workingHours}
                          onChange={(e) => setEditingActivity({ ...editingActivity, workingHours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Lost Hours (Rain / Bottlenecks / Breakdowns)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingActivity.lostHoursRainOrObstruction || 0}
                          onChange={(e) => setEditingActivity({ ...editingActivity, lostHoursRainOrObstruction: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold text-rose-600"
                        />
                      </div>
                    </div>

                    {/* Plant & Machinery Section */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-500" />
                          Heavy Plant & Equipment Deployed
                        </div>
                        <button
                          onClick={() => {
                            const list = editingActivity.equipmentList || [];
                            setEditingActivity({
                              ...editingActivity,
                              equipmentList: [
                                ...list,
                                { id: 'eq_' + Date.now(), name: 'Hydraulic Excavator (Cat 320/330)', count: 1, status: 'Operating' }
                              ]
                            });
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Plant Item
                        </button>
                      </div>

                      {(editingActivity.equipmentList || []).map((eq, idx) => (
                        <div key={eq.id || idx} className="flex items-center gap-2">
                          <select
                            value={eq.name}
                            onChange={(e) => {
                              const list = [...(editingActivity.equipmentList || [])];
                              list[idx] = { ...list[idx], name: e.target.value };
                              setEditingActivity({ ...editingActivity, equipmentList: list });
                            }}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                          >
                            {DEFAULT_EQUIPMENT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            value={eq.count}
                            onChange={(e) => {
                              const list = [...(editingActivity.equipmentList || [])];
                              list[idx] = { ...list[idx], count: parseInt(e.target.value, 10) || 1 };
                              setEditingActivity({ ...editingActivity, equipmentList: list });
                            }}
                            className="w-16 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold dark:text-white text-center"
                          />

                          <select
                            value={eq.status}
                            onChange={(e) => {
                              const list = [...(editingActivity.equipmentList || [])];
                              list[idx] = { ...list[idx], status: e.target.value as any };
                              setEditingActivity({ ...editingActivity, equipmentList: list });
                            }}
                            className="w-28 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                          >
                            <option value="Operating">Operating</option>
                            <option value="Standby">Standby</option>
                            <option value="Breakdown">Breakdown</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>

                          <button
                            onClick={() => {
                              const list = (editingActivity.equipmentList || []).filter((_, i) => i !== idx);
                              setEditingActivity({ ...editingActivity, equipmentList: list });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Labor Summary */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Manpower & Personnel Allocation
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {DEFAULT_LABOR_CATEGORIES.map(cat => {
                          const item = (editingActivity.laborSummary || []).find(l => l.category === cat);
                          const currentCount = item ? item.count : 0;

                          return (
                            <div key={cat} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate pr-2">
                                {cat}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={currentCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  const list = [...(editingActivity.laborSummary || [])];
                                  const idx = list.findIndex(l => l.category === cat);
                                  if (idx >= 0) {
                                    list[idx] = { ...list[idx], count: val };
                                  } else {
                                    list.push({ category: cat, count: val });
                                  }
                                  setEditingActivity({ ...editingActivity, laborSummary: list });
                                }}
                                className="w-14 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center dark:text-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 5: QC & Sign-off */}
                {modalTab === 'qc' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Quality Inspection (QC / WIR) Status *
                        </label>
                        <select
                          value={editingActivity.qcStatus}
                          onChange={(e) => setEditingActivity({ ...editingActivity, qcStatus: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                        >
                          {QC_STATUS_OPTIONS.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Quality Inspector / Resident Engineer Name
                        </label>
                        <input
                          type="text"
                          value={editingActivity.inspectorName || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, inspectorName: e.target.value })}
                          placeholder="e.g. Eng. Solomon Haile (Materials Inspector)"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Contractor Site Agent Name
                        </label>
                        <input
                          type="text"
                          value={editingActivity.contractorSiteAgent || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, contractorSiteAgent: e.target.value })}
                          placeholder="e.g. Eng. Tesfaye Kebede"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Consultant Resident Engineer Name
                        </label>
                        <input
                          type="text"
                          value={editingActivity.consultantResidentEngineer || ''}
                          onChange={(e) => setEditingActivity({ ...editingActivity, consultantResidentEngineer: e.target.value })}
                          placeholder="e.g. Eng. Yohannes Bekele"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Site Remarks, Delays & Bottleneck Notes
                      </label>
                      <textarea
                        rows={3}
                        value={editingActivity.remarks || ''}
                        onChange={(e) => setEditingActivity({ ...editingActivity, remarks: e.target.value })}
                        placeholder="Record any contractor remarks, weather interruptions, ROW compensation clashes, or material supply notes..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 6: Photos & Inspection Snaps */}
                {modalTab === 'photos' && (
                  <div className="space-y-5">
                    {/* Upload / Capture Buttons Banner */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-sm">
                          <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Site Inspection Photos & Chainage Evidence
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                          Capture live images with your device camera or attach multiple site photos from your file system.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Device Camera Trigger */}
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs"
                          title="Open device camera"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Snap Photo
                        </button>

                        {/* Live Webcam Viewfinder Trigger */}
                        <button
                          type="button"
                          onClick={startLiveCamera}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs"
                          title="Open live webcam viewfinder"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                          Live Viewfinder
                        </button>

                        {/* File Upload Trigger */}
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs"
                          title="Select photos from device storage"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Attach Files
                        </button>
                      </div>
                    </div>

                    {/* Photos Grid List */}
                    {(!editingActivity.photos || editingActivity.photos.length === 0) ? (
                      <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            No site photos attached yet
                          </div>
                          <div className="text-slate-500 text-xs mt-1">
                            Click <strong className="text-amber-600">Snap Photo</strong> or <strong className="text-blue-600">Attach Files</strong> above to upload road construction progress photos.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editingActivity.photos.map((photo, pIdx) => (
                          <div
                            key={photo.id}
                            className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-3 group relative"
                          >
                            {/* Photo Thumbnail */}
                            <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 relative">
                              <img
                                src={photo.url}
                                alt={photo.caption || 'Site Photo'}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-mono text-white font-bold">
                                #{pIdx + 1}
                              </div>
                            </div>

                            {/* Photo Details & Editing Fields */}
                            <div className="flex-1 space-y-2 min-w-0">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                  Photo Caption / Description
                                </label>
                                <input
                                  type="text"
                                  value={photo.caption || ''}
                                  onChange={(e) => handleUpdatePhotoInModal(photo.id, { caption: e.target.value })}
                                  placeholder="e.g. Subgrade density test point..."
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white mt-0.5"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    Station Km
                                  </label>
                                  <input
                                    type="text"
                                    value={photo.stationKm || ''}
                                    onChange={(e) => handleUpdatePhotoInModal(photo.id, { stationKm: e.target.value })}
                                    placeholder="e.g. 14+300"
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono dark:text-white mt-0.5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    Captured At
                                  </label>
                                  <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                                    {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Site'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                {photo.url && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPhoto(photo.url!, `Site_Photo_${photo.id}.jpg`)}
                                    className="text-slate-500 hover:text-blue-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhotoInModal(photo.id)}
                                  className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModal}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Daily Activity Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* QUICK WIR / RFI CREATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isQuickWirModalOpen && targetActivityForWir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                    CONSULTANT LOG INTEGRATION
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Generate Submittal / RFI
                  </h3>
                </div>
                <button
                  onClick={() => setIsQuickWirModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Generate an official Work Inspection Request (WIR), Technical RFI, or Material Approval directly from activity <span className="font-bold text-slate-800 dark:text-slate-200">"{targetActivityForWir.activityName}"</span> at station <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetActivityForWir.startStationKm}</span>.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={newWirType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewWirType(t);
                      const prefix = t === 'RFI' ? 'RFI' : t === 'Material Approval' ? 'MAT' : 'WIR';
                      setNewWirSubmittalNo(`${prefix}-${new Date().getFullYear()}-${String(submittalsList.length + 1).padStart(3, '0')}`);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                  >
                    <option value="Work Inspection (WIR)">Work Inspection Request (WIR)</option>
                    <option value="RFI">Request for Information (RFI)</option>
                    <option value="Material Approval">Material Approval Submittal</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Submittal No.
                    </label>
                    <input
                      type="text"
                      value={newWirSubmittalNo}
                      onChange={(e) => setNewWirSubmittalNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority SLA
                    </label>
                    <select
                      value={newWirPriority}
                      onChange={(e) => setNewWirPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                      <option value="High">High (3 Days)</option>
                      <option value="Medium">Medium (7 Days)</option>
                      <option value="Low">Low (14 Days)</option>
                      <option value="Critical">Critical (24h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Title / Subject
                  </label>
                  <input
                    type="text"
                    value={newWirTitle}
                    onChange={(e) => setNewWirTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsQuickWirModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWirFromActivity}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Submit to Consultant Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PREVIEW LINKED SUBMITTAL / RFI DETAILS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewSubmittal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded-full text-[10px] font-mono font-bold">
                    {previewSubmittal.type} • {previewSubmittal.submittalNo}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {previewSubmittal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewSubmittal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{previewSubmittal.status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Submitted Date</div>
                    <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{previewSubmittal.submittedDate}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Target SLA</div>
                    <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{previewSubmittal.targetDays} Days</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Priority</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{previewSubmittal.priority}</div>
                  </div>
                </div>

                {previewSubmittal.stationKm && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-bold">Station:</span>
                    <span className="font-mono">{previewSubmittal.stationKm}</span>
                  </div>
                )}

                {previewSubmittal.contractorInquiry && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Contractor Submission Scope / Inquiry:</div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-medium">
                      {previewSubmittal.contractorInquiry}
                    </div>
                  </div>
                )}

                {previewSubmittal.consultantResponse && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Supervision Consultant Review & Response:</div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-slate-800 dark:text-slate-200 font-medium border border-indigo-100 dark:border-indigo-900/40">
                      {previewSubmittal.consultantResponse}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setPreviewSubmittal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* FULLSCREEN / LIGHTBOX SITE PHOTO GALLERY MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {galleryActivity && galleryActivity.photos && galleryActivity.photos.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden text-white"
            >
              {/* Gallery Header */}
              <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                    SITE PHOTO EVIDENCE
                  </span>
                  <span className="font-bold text-sm truncate max-w-sm text-slate-200">
                    {galleryActivity.activityName}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({lightboxPhotoIndex + 1} of {galleryActivity.photos.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadonly && (
                    <>
                      <button
                        onClick={() => triggerQuickCamera(galleryActivity)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Snap new photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Snap More
                      </button>
                      <button
                        onClick={() => triggerQuickGallery(galleryActivity)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Upload photos"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Attach
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setGalleryActivity(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Photo Viewport */}
              <div className="flex-1 bg-black/60 relative flex items-center justify-center min-h-[340px] max-h-[58vh] overflow-hidden p-4">
                {galleryActivity.photos[lightboxPhotoIndex]?.url ? (
                  <img
                    src={galleryActivity.photos[lightboxPhotoIndex].url}
                    alt={galleryActivity.photos[lightboxPhotoIndex].caption || 'Site Photo'}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="text-slate-500 text-sm">Image unavailable</div>
                )}

                {/* Left Navigation Chevron */}
                {galleryActivity.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setLightboxPhotoIndex((prev) => (prev > 0 ? prev - 1 : galleryActivity.photos!.length - 1))}
                      className="absolute left-4 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition cursor-pointer backdrop-blur-xs border border-white/10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setLightboxPhotoIndex((prev) => (prev < galleryActivity.photos!.length - 1 ? prev + 1 : 0))}
                      className="absolute right-4 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition cursor-pointer backdrop-blur-xs border border-white/10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Photo Caption & Info Strip */}
              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <span>{galleryActivity.photos[lightboxPhotoIndex]?.caption || 'Site inspection photo'}</span>
                    {galleryActivity.photos[lightboxPhotoIndex]?.stationKm && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-mono text-[10px]">
                        Km {galleryActivity.photos[lightboxPhotoIndex]?.stationKm}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                    <span>Captured: {galleryActivity.photos[lightboxPhotoIndex]?.uploadedAt ? new Date(galleryActivity.photos[lightboxPhotoIndex].uploadedAt!).toLocaleString() : galleryActivity.date}</span>
                    <span>• Road: {formatStationKm(galleryActivity.startStationKm)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {galleryActivity.photos[lightboxPhotoIndex]?.url && (
                    <button
                      onClick={() => handleDownloadPhoto(galleryActivity.photos![lightboxPhotoIndex].url!, `ERA_Site_Photo_${galleryActivity.photos![lightboxPhotoIndex].id}.jpg`)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                  {!isReadonly && (
                    <button
                      onClick={() => handleDeletePhotoFromGallery(galleryActivity.photos![lightboxPhotoIndex].id)}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnails Row */}
              {galleryActivity.photos.length > 1 && (
                <div className="px-6 py-2.5 bg-slate-900 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
                  {galleryActivity.photos.map((ph, idx) => (
                    <button
                      key={ph.id}
                      onClick={() => setLightboxPhotoIndex(idx)}
                      className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                        lightboxPhotoIndex === idx ? 'border-amber-400 scale-105' : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={ph.url} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* LIVE CAMERA VIEWFINDER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isLiveCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-800 space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono text-[10px] font-bold">
                    LIVE DEVICE CAMERA
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    Capture Site Inspection Photo
                  </h3>
                </div>
                <button
                  onClick={stopLiveCamera}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {liveStreamError ? (
                <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Camera Access Notice
                  </div>
                  <div>{liveStreamError}</div>
                  <div className="text-[11px] text-rose-400">
                    Tip: You can also click <strong>Snap Photo</strong> to use your standard mobile or laptop camera app.
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600/80 text-white font-mono text-[10px] font-bold rounded flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    REC / LIVE
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={stopLiveCamera}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      stopLiveCamera();
                      cameraInputRef.current?.click();
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Native Camera
                  </button>
                  <button
                    onClick={captureLiveSnapshot}
                    disabled={!!liveStreamError}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Snap Photo Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

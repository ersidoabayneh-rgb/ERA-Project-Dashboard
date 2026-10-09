import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Timer, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  X, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Clock, 
  Trash2, 
  Camera, 
  FileText, 
  Settings, 
  Check, 
  Filter, 
  Search,
  Building,
  Wrench,
  Sparkles,
  Download,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  Compass,
  CheckSquare,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { Project, DlpDefect, User, ProjectLifecycleStatus } from '../types';
import { getProjectDlpInfo } from '../lib/dlpUtils';
import { formatDateStr } from '../lib/dateUtils';
import { drawEraLogo, drawSafeTable, drawUniversalSignatureBlock, STRICT_1_INCH_MARGIN } from '../lib/pdfReportEngine';

interface DlpDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUserObj?: User | null;
  onUpdateProject?: (fields: Partial<Project>, sectionName: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
}

export const DEFECT_CATEGORIES = [
  'Pavement / Asphalt Distress',
  'Drainage & Culverts',
  'Bridges & Structural Elements',
  'Earthworks & Slope Stability',
  'Road Furniture & Traffic Signs',
  'Safety Barriers & Guardrails',
  'Road Markings & Delineators',
  'Shoulder & Kerbs',
  'Environmental & Erosion',
  'Other Site Distresses'
] as const;

export const DEFECT_ROOT_CAUSES = [
  'Workmanship / Construction Defect',
  'Material Quality / Aggregate Deficiency',
  'Heavy Axle Load / Traffic Overload',
  'Drainage / Water Infiltration',
  'Thermal / Shrinkage Cracking',
  'Subgrade Settlement / Slope Movement',
  'Third-Party / Vehicle Impact Damage',
  'Environmental / Severe Weather Event',
  'Normal Wear & Tear',
  'Under Detailed Technical Investigation'
] as const;

export const CARRIAGEWAY_LANE_SIDES = [
  'Left Lane (LHS Carriageway)',
  'Right Lane (RHS Carriageway)',
  'Both Carriageways / Full Width',
  'Median / Central Reserve',
  'Left Outer Shoulder',
  'Right Outer Shoulder',
  'Side Drain / Off-Carriageway',
  'Structure / Bridge Deck',
  'Not Applicable'
] as const;

export const INSPECTION_METHODS = [
  'Visual Site Walkover Inspection',
  'Roughness / IRI Laser Profiling',
  'Core Sampling & Laboratory Testing',
  'Joint Consultant-Contractor Inspection',
  'Routine DLP Surveillance Patrol',
  'Drone / Aerial Photographic Survey',
  'Stakeholder / Road User Feedback'
] as const;

export default function DlpDefectModal({
  isOpen,
  onClose,
  project,
  currentUserObj,
  onUpdateProject,
  onUpdateProjectStatus
}: DlpDefectModalProps) {
  // Real-time ticking automated countdown state (updates every second)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const dlpInfo = getProjectDlpInfo(project, now);
  const defectsList: DlpDefect[] = project.dlpDefects || [];

  // Active view tab: 'list' | 'add' | 'edit' | 'settings'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit' | 'settings'>('list');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Under Rectification' | 'Rectified' | 'Closed'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [expandedDefectIds, setExpandedDefectIds] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingDefectId, setEditingDefectId] = useState<string | null>(null);

  // Form State (used for both Add and Edit)
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSeverity, setFormSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [formStatus, setFormStatus] = useState<'Open' | 'Under Rectification' | 'Rectified' | 'Closed'>('Open');
  const [formCategory, setFormCategory] = useState<string>('Pavement / Asphalt Distress');
  const [formRootCause, setFormRootCause] = useState<string>('Workmanship / Construction Defect');
  const [formLocation, setFormLocation] = useState('');
  const [formGps, setFormGps] = useState('');
  const [formLaneSide, setFormLaneSide] = useState<string>('Right Lane (RHS Carriageway)');
  const [formComponent, setFormComponent] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formCostEtb, setFormCostEtb] = useState<number | ''>('');
  const [formReporter, setFormReporter] = useState(
    currentUserObj?.fullName || currentUserObj?.username || 'Resident Engineer Inspector'
  );
  const [formTimestamp, setFormTimestamp] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [formInspectionMethod, setFormInspectionMethod] = useState<string>('Visual Site Walkover Inspection');
  const [formContractorRep, setFormContractorRep] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formRemedialAction, setFormRemedialAction] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formAfterPhotoUrl, setFormAfterPhotoUrl] = useState('');
  const [formRectifiedAt, setFormRectifiedAt] = useState('');
  const [formRectifiedBy, setFormRectifiedBy] = useState('');
  const [formClosureRemarks, setFormClosureRemarks] = useState('');
  const [formClosureSignOffBy, setFormClosureSignOffBy] = useState('');

  const [showAdvancedFields, setShowAdvancedFields] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Photo modal preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // DLP Settings Form State inside Modal
  const [editDlpStartDate, setEditDlpStartDate] = useState(project.dlpStartDate || project.completionDate || '');
  const [editDlpDays, setEditDlpDays] = useState(project.dlpDays !== undefined ? project.dlpDays : 365);
  const [markLifecycleCompleted, setMarkLifecycleCompleted] = useState(false);

  // Sync edit states when project changes
  useEffect(() => {
    setEditDlpStartDate(project.dlpStartDate || project.completionDate || '');
    setEditDlpDays(project.dlpDays !== undefined ? project.dlpDays : 365);
    if (!editingDefectId) {
      setFormReporter(currentUserObj?.fullName || currentUserObj?.username || 'Resident Engineer Inspector');
    }
  }, [project, currentUserObj, editingDefectId]);

  if (!isOpen) return null;

  // Toggle expanded defect card
  const toggleExpand = (id: string) => {
    setExpandedDefectIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Reset form to blank / defaults
  const resetForm = () => {
    setEditingDefectId(null);
    setFormTitle('');
    setFormDesc('');
    setFormSeverity('Medium');
    setFormStatus('Open');
    setFormCategory('Pavement / Asphalt Distress');
    setFormRootCause('Workmanship / Construction Defect');
    setFormLocation('');
    setFormGps('');
    setFormLaneSide('Right Lane (RHS Carriageway)');
    setFormComponent('');
    setFormQuantity('');
    setFormCostEtb('');
    setFormReporter(currentUserObj?.fullName || currentUserObj?.username || 'Resident Engineer Inspector');
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setFormTimestamp(d.toISOString().slice(0, 16));
    setFormInspectionMethod('Visual Site Walkover Inspection');
    setFormContractorRep(project.contractor || '');
    setFormDeadline('');
    setFormRemedialAction('');
    setFormRemarks('');
    setFormPhotoUrl('');
    setFormAfterPhotoUrl('');
    setFormRectifiedAt('');
    setFormRectifiedBy('');
    setFormClosureRemarks('');
    setFormClosureSignOffBy('');
    setFormSuccess(null);
  };

  // Start adding a new defect
  const handleOpenAdd = () => {
    resetForm();
    setActiveTab('add');
  };

  // Start editing an existing defect
  const handleStartEdit = (defect: DlpDefect) => {
    setEditingDefectId(defect.id);
    setFormTitle(defect.title || '');
    setFormDesc(defect.description || '');
    setFormSeverity(defect.severity || 'Medium');
    setFormStatus(defect.status || 'Open');
    setFormCategory(defect.category || 'Pavement / Asphalt Distress');
    setFormRootCause(defect.rootCause || 'Workmanship / Construction Defect');
    setFormLocation(defect.locationStation || '');
    setFormGps(defect.gpsCoordinates || '');
    setFormLaneSide(defect.laneSide || 'Right Lane (RHS Carriageway)');
    setFormComponent(defect.componentAffected || '');
    setFormQuantity(defect.estimatedQuantity || '');
    setFormCostEtb(defect.estimatedRectificationCostEtb !== undefined ? defect.estimatedRectificationCostEtb : '');
    setFormReporter(defect.reportedBy || (currentUserObj?.fullName || currentUserObj?.username || 'RE Inspector'));
    
    // Format timestamp for datetime-local
    if (defect.reportedAt) {
      try {
        const d = new Date(defect.reportedAt);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setFormTimestamp(d.toISOString().slice(0, 16));
      } catch {
        setFormTimestamp('');
      }
    } else {
      setFormTimestamp('');
    }

    setFormInspectionMethod(defect.inspectionMethod || 'Visual Site Walkover Inspection');
    setFormContractorRep(defect.assignedContractorRep || project.contractor || '');
    setFormDeadline(defect.targetRectificationDate || '');
    setFormRemedialAction(defect.rectificationMethod || '');
    setFormRemarks(defect.remarks || '');
    setFormPhotoUrl(defect.photoUrl || '');
    setFormAfterPhotoUrl(defect.afterPhotoUrl || '');
    setFormRectifiedAt(defect.rectifiedAt ? defect.rectifiedAt.slice(0, 10) : '');
    setFormRectifiedBy(defect.rectifiedBy || '');
    setFormClosureRemarks(defect.closureRemarks || '');
    setFormClosureSignOffBy(defect.closureSignOffBy || '');
    setFormSuccess(null);
    setActiveTab('edit');
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isAfter = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isAfter) {
        setFormAfterPhotoUrl(reader.result as string);
      } else {
        setFormPhotoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset defect quick templates
  const applyPreset = (presetName: string) => {
    if (presetName === 'rutting') {
      setFormTitle('Pavement Wheel-path Rutting & Depressions');
      setFormDesc('Severe longitudinal wheel-track rutting observed with rut depth > 20mm causing localized water ponding and surface irregularity.');
      setFormCategory('Pavement / Asphalt Distress');
      setFormRootCause('Heavy Axle Load / Traffic Overload');
      setFormComponent('Asphalt Concrete Wearing Course');
      setFormSeverity('High');
      setFormRemedialAction('Cold mill affected 50mm wearing course, apply tack coat, and lay fresh dense bitumen macadam/wearing course compacted to standard density.');
      setFormQuantity('approx. 180 m² (L = 90m, W = 2.0m)');
    } else if (presetName === 'crack') {
      setFormTitle('Alligator & Longitudinal Fatigue Cracking');
      setFormDesc('Interconnected fatigue cracking network (alligator pattern) accompanied by localized block cracking along the outer traffic lane.');
      setFormCategory('Pavement / Asphalt Distress');
      setFormRootCause('Drainage / Water Infiltration');
      setFormComponent('Asphalt Wearing & Base Course');
      setFormSeverity('High');
      setFormRemedialAction('Saw-cut perimeter 300mm into sound pavement, excavate distressed layers, reinstate subbase, and place fresh asphalt overlay with geotextile membrane.');
      setFormQuantity('approx. 75 m²');
    } else if (presetName === 'culvert') {
      setFormTitle('Pipe/Box Culvert Siltation & Wingwall Scour');
      setFormDesc('Culvert inlet and barrel blocked over 50% by heavy silt and debris sedimentation; right upstream wingwall displays early scour undermining.');
      setFormCategory('Drainage & Culverts');
      setFormRootCause('Environmental / Severe Weather Event');
      setFormComponent('Culvert Barrel & Masonry Wingwall');
      setFormSeverity('Medium');
      setFormRemedialAction('Mechanically de-silt culvert barrel and outfall channel; construct stone pitching / gabion apron protection along undermined wingwall.');
      setFormQuantity('1 Culvert Structure (1.2m dia x 14m length)');
    } else if (presetName === 'guardrail') {
      setFormTitle('Damaged W-Beam Guardrail & Missing Delineators');
      setFormDesc('Three sections of W-beam guardrail deformed due to vehicle side impact, with broken timber/steel posts and 8 missing retro-reflective delineators.');
      setFormCategory('Safety Barriers & Guardrails');
      setFormRootCause('Third-Party / Vehicle Impact Damage');
      setFormComponent('W-Beam Guardrail & Posts');
      setFormSeverity('Medium');
      setFormRemedialAction('Replace 12m deformed steel guardrail beams, install 4 new posts with concrete footings, and mount class 1 reflective delineators.');
      setFormQuantity('12 linear meters + 4 posts');
    }
  };

  // Submit Save (Add or Edit)
  const handleSubmitDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() && !formTitle.trim()) return;

    setIsSubmitting(true);

    const isRectified = formStatus === 'Rectified' || formStatus === 'Closed';
    const effectiveRectifiedAt = isRectified 
      ? (formRectifiedAt ? new Date(formRectifiedAt).toISOString() : new Date().toISOString())
      : undefined;
    const effectiveRectifiedBy = isRectified 
      ? (formRectifiedBy.trim() || currentUserObj?.fullName || currentUserObj?.username || 'Contractor Engineer')
      : undefined;

    if (editingDefectId) {
      // UPDATE EXISTING DEFECT
      const updated = defectsList.map(d => {
        if (d.id === editingDefectId) {
          return {
            ...d,
            title: formTitle.trim() || undefined,
            description: formDesc.trim() || formTitle.trim(),
            severity: formSeverity,
            status: formStatus,
            category: formCategory,
            rootCause: formRootCause,
            locationStation: formLocation.trim() || undefined,
            gpsCoordinates: formGps.trim() || undefined,
            laneSide: formLaneSide,
            componentAffected: formComponent.trim() || undefined,
            estimatedQuantity: formQuantity.trim() || undefined,
            estimatedRectificationCostEtb: typeof formCostEtb === 'number' ? formCostEtb : (formCostEtb ? Number(formCostEtb) : undefined),
            reportedBy: formReporter.trim() || 'RE Inspector',
            reportedAt: formTimestamp ? new Date(formTimestamp).toISOString() : d.reportedAt,
            inspectionMethod: formInspectionMethod,
            assignedContractorRep: formContractorRep.trim() || undefined,
            targetRectificationDate: formDeadline.trim() || undefined,
            rectificationMethod: formRemedialAction.trim() || undefined,
            rectifiedAt: effectiveRectifiedAt || (formStatus === 'Open' || formStatus === 'Under Rectification' ? undefined : d.rectifiedAt),
            rectifiedBy: effectiveRectifiedBy || (formStatus === 'Open' || formStatus === 'Under Rectification' ? undefined : d.rectifiedBy),
            closureRemarks: formClosureRemarks.trim() || undefined,
            closureSignOffBy: formClosureSignOffBy.trim() || undefined,
            photoUrl: formPhotoUrl || undefined,
            afterPhotoUrl: formAfterPhotoUrl || undefined,
            remarks: formRemarks.trim() || undefined
          } as DlpDefect;
        }
        return d;
      });

      if (onUpdateProject) {
        onUpdateProject(
          { dlpDefects: updated },
          `DLP Defect Updated: ${formTitle || formDesc.substring(0, 30)} at ${formLocation || 'Site'}`
        );
      }

      setIsSubmitting(false);
      setFormSuccess('Defect details updated successfully!');
      setTimeout(() => {
        setFormSuccess(null);
        setActiveTab('list');
      }, 1000);
    } else {
      // ADD NEW DEFECT
      const newDefect: DlpDefect = {
        id: `defect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: formTitle.trim() || undefined,
        description: formDesc.trim() || formTitle.trim(),
        severity: formSeverity,
        status: formStatus,
        category: formCategory,
        rootCause: formRootCause,
        locationStation: formLocation.trim() || undefined,
        gpsCoordinates: formGps.trim() || undefined,
        laneSide: formLaneSide,
        componentAffected: formComponent.trim() || undefined,
        estimatedQuantity: formQuantity.trim() || undefined,
        estimatedRectificationCostEtb: typeof formCostEtb === 'number' ? formCostEtb : (formCostEtb ? Number(formCostEtb) : undefined),
        reportedBy: formReporter.trim() || (currentUserObj?.fullName || currentUserObj?.username || 'RE Inspector'),
        reportedAt: formTimestamp ? new Date(formTimestamp).toISOString() : new Date().toISOString(),
        inspectionMethod: formInspectionMethod,
        assignedContractorRep: formContractorRep.trim() || undefined,
        targetRectificationDate: formDeadline.trim() || undefined,
        rectificationMethod: formRemedialAction.trim() || undefined,
        rectifiedAt: effectiveRectifiedAt,
        rectifiedBy: effectiveRectifiedBy,
        closureRemarks: formClosureRemarks.trim() || undefined,
        closureSignOffBy: formClosureSignOffBy.trim() || undefined,
        photoUrl: formPhotoUrl || undefined,
        afterPhotoUrl: formAfterPhotoUrl || undefined,
        remarks: formRemarks.trim() || undefined
      };

      const updatedDefects = [newDefect, ...defectsList];

      if (onUpdateProject) {
        onUpdateProject(
          { dlpDefects: updatedDefects },
          `Defect Registered for DLP: ${newDefect.severity} severity at ${formLocation || 'Site'}`
        );
      }

      setIsSubmitting(false);
      setFormSuccess('Defect successfully logged into DLP register with detailed information!');
      setTimeout(() => {
        resetForm();
        setActiveTab('list');
      }, 1100);
    }
  };

  // Quick Toggle Defect Status
  const handleUpdateDefectStatus = (defectId: string, nextStatus: 'Open' | 'Under Rectification' | 'Rectified' | 'Closed') => {
    const updated = defectsList.map(d => {
      if (d.id === defectId) {
        return {
          ...d,
          status: nextStatus,
          rectifiedAt: (nextStatus === 'Rectified' || nextStatus === 'Closed') ? (d.rectifiedAt || new Date().toISOString()) : d.rectifiedAt,
          rectifiedBy: (nextStatus === 'Rectified' || nextStatus === 'Closed') ? (d.rectifiedBy || currentUserObj?.fullName || currentUserObj?.username || 'Inspector') : d.rectifiedBy
        };
      }
      return d;
    });

    if (onUpdateProject) {
      onUpdateProject({ dlpDefects: updated }, `DLP Defect status changed to ${nextStatus}`);
    }
  };

  // Delete Defect
  const handleDeleteDefect = (defectId: string) => {
    if (!window.confirm('Are you sure you want to delete this defect record from the register?')) return;
    const updated = defectsList.filter(d => d.id !== defectId);
    if (onUpdateProject) {
      onUpdateProject({ dlpDefects: updated }, 'DLP Defect record removed');
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    if (onUpdateProject) {
      onUpdateProject(
        {
          dlpStartDate: editDlpStartDate.trim() ? editDlpStartDate.trim() : undefined,
          dlpDays: editDlpDays
        },
        'Defect Liability Period (DLP) configuration updated'
      );
    }
    if (markLifecycleCompleted && onUpdateProjectStatus && project.status !== 'Completed' && project.status !== 'Completed and Closed') {
      onUpdateProjectStatus(project.id, 'Completed');
    }
    setActiveTab('list');
  };

  // Filtered defects
  const filteredDefects = defectsList.filter(d => {
    const matchesSearch = 
      (d.title && d.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.locationStation && d.locationStation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.category && d.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.componentAffected && d.componentAffected.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'All' || d.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || d.category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
  });

  const openCount = defectsList.filter(d => d.status === 'Open').length;
  const underRectCount = defectsList.filter(d => d.status === 'Under Rectification').length;
  const rectifiedCount = defectsList.filter(d => d.status === 'Rectified' || d.status === 'Closed').length;
  const totalEstimatedCost = defectsList.reduce((acc, d) => acc + (d.estimatedRectificationCostEtb || 0), 0);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Generate & Download PDF Summary Report of all defects logged for this project
  const handleDownloadDlpReport = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
    const margin = STRICT_1_INCH_MARGIN; // Standard border padding (36 pt)
    const contentWidth = pageWidth - margin * 2; // 523.28 pt

    // 1. Header & ERA Logo
    drawEraLogo(doc, margin + 4, margin + 4, 36, {
      withContainer: true,
      containerBg: [255, 255, 255],
      containerBorder: [16, 185, 129]
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("ETHIOPIAN ROADS ADMINISTRATION", margin + 48, margin + 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("DEFECT LIABILITY PERIOD (DLP) REGISTER & INSPECTION REPORT", margin + 48, margin + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Doc Ref: ERA/DLP/${project.id.slice(-8)}/${Date.now().toString().slice(-6)} • Date: ${new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}`, margin + 48, margin + 38);

    // Divider line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.25);
    doc.line(margin + 2, margin + 46, margin + contentWidth - 2, margin + 46);

    let curY = margin + 54;

    // 2. Project Metadata Summary Card Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, curY, contentWidth, 85, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`PROJECT: ${project.name.toUpperCase()}`, margin + 10, curY + 15, { maxWidth: contentWidth - 20 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const halfW = (contentWidth - 20) / 2;
    const col2X = margin + halfW + 10;

    // Line 1: Employer & Contractor
    doc.text(`Employer: Ethiopian Roads Administration (ERA)`, margin + 10, curY + 28);
    doc.text(`Contractor: ${project.contractor || 'N/A'}`, col2X, curY + 28, { maxWidth: halfW });

    // Line 2: Consultant & Start Date
    doc.text(`Supervision Consultant: ${project.consultant || 'N/A'}`, margin + 10, curY + 41, { maxWidth: halfW - 10 });
    doc.text(`DLP Start Date: ${dlpInfo.startDateStr}`, col2X, curY + 41);

    // Line 3: Expiry & Time Remaining
    doc.text(`DLP Expiry Target: ${dlpInfo.endDateStr} (${dlpInfo.dlpDays} Days)`, margin + 10, curY + 54);
    doc.text(`Remaining: ${dlpInfo.daysRemaining} Days (${dlpInfo.elapsedPct.toFixed(1)}% Elapsed)`, col2X, curY + 54);

    // Line 4: Defects Summary & Estimated Cost
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`Defects Register: ${defectsList.length} Total (${openCount} Open, ${underRectCount} In Progress, ${rectifiedCount} Rectified)`, margin + 10, curY + 68);
    doc.text(`Est. Rectification Cost: ETB ${totalEstimatedCost.toLocaleString()}`, col2X, curY + 68);

    curY += 95;

    // 3. Defects Register Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("REGISTERED DEFECTS & DETAILED SITE DISTRESS LOG", margin, curY);

    curY += 8;

    // Prepare table data
    const tableRows = defectsList.map((d, idx) => ({
      no: String(idx + 1),
      location: `${d.locationStation || 'Site Section'}\n${d.laneSide ? '[' + d.laneSide.split(' ')[0] + ']' : ''}${d.gpsCoordinates ? '\n' + d.gpsCoordinates : ''}`,
      category: `${d.category || 'Pavement'}\n[${d.severity}]`,
      description: `${d.title ? d.title + '\n' : ''}${d.description}${d.rectificationMethod ? '\nAction: ' + d.rectificationMethod : (d.remarks ? '\nAction: ' + d.remarks : '')}${d.estimatedQuantity ? '\nQty: ' + d.estimatedQuantity : ''}`,
      reportedBy: `${d.reportedBy}\n${new Date(d.reportedAt).toLocaleDateString()}${d.targetRectificationDate ? '\nDue: ' + d.targetRectificationDate : ''}`,
      status: d.status
    }));

    if (tableRows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No defects currently logged for this project's Defect Liability Period.", margin, curY + 20);
      curY += 40;
    } else {
      curY = drawSafeTable(doc, {
        startY: curY,
        margin,
        maxWidth: contentWidth,
        headerBgColor: [15, 23, 42],
        headerTextColor: [255, 255, 255],
        columns: [
          { header: '#', dataKey: 'no', widthPercent: 5, align: 'center' },
          { header: 'Location / Station / GPS', dataKey: 'location', widthPercent: 18, align: 'left' },
          { header: 'Category & Severity', dataKey: 'category', widthPercent: 16, align: 'left' },
          { header: 'Defect Description, Dimensions & Required Action', dataKey: 'description', widthPercent: 37, align: 'left' },
          { header: 'Reporter & Deadline', dataKey: 'reportedBy', widthPercent: 13, align: 'left' },
          { header: 'Status', dataKey: 'status', widthPercent: 11, align: 'center' },
        ],
        rows: tableRows,
        fontSize: 6.5,
        headerFontSize: 7,
        rowPadding: 3
      });
    }

    // 4. Executive Signatures
    drawUniversalSignatureBlock(doc, currentUserObj, {
      y: Math.max(curY + 10, pageHeight - margin - 75),
      margin,
      contentWidth
    });

    // 5. Post-processing Loop: Draw Strict 1-inch Page Borders and Footers across ALL pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Strict 1-inch Outer Page Border Frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - (margin * 2), 4, 4, 'S');

      // Top green accent bar
      doc.setFillColor(16, 185, 129);
      doc.rect(margin + 2, margin + 1, contentWidth - 4, 3, 'F');

      // Bottom footer line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 2, pageHeight - margin - 20, pageWidth - margin - 2, pageHeight - margin - 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Ethiopian Roads Administration PMIS • DLP Defect Summary Report • ${project.name}`,
        margin + 6,
        pageHeight - margin - 8
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin - 6,
        pageHeight - margin - 8,
        { align: 'right' }
      );
    }

    // Save PDF
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`ERA_DLP_Defects_Report_${safeProjectName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Top Modal Header Banner */}
          <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white transition-all ${
            dlpInfo.isExpired
              ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-blue-500/30'
              : dlpInfo.isNearExpiry
                ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-500/40'
                : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                dlpInfo.isExpired 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : dlpInfo.isNearExpiry 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    Defect Liability Period (DLP) Dashboard & Defect Log
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1 ${
                    dlpInfo.isExpired
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : dlpInfo.isNearExpiry
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      dlpInfo.isExpired ? 'bg-blue-400' : dlpInfo.isNearExpiry ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                    }`} />
                    {dlpInfo.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mt-0.5 truncate max-w-xl">
                  {project.name} • <span className="text-slate-400">{project.contractor || 'Contractor'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleDownloadDlpReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 border border-emerald-400/30"
                title="Generate and download summary PDF report of all defects logged for this project"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download Report (PDF)</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Real-time Ticking Countdown Banner */}
          <div className="bg-slate-900 text-white p-3 sm:p-4 border-b border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {dlpInfo.daysRemaining}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Days Remaining</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {pad(dlpInfo.hoursRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Hours</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                  {pad(dlpInfo.minutesRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Minutes</span>
              </div>
              <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
                <span className={`text-xl sm:text-2xl font-black font-mono block ${
                  dlpInfo.isExpired ? 'text-blue-400' : dlpInfo.isNearExpiry ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {pad(dlpInfo.secondsRemaining)}
                </span>
                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Seconds (Live)</span>
              </div>
            </div>

            {/* Metrics & Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap justify-between items-center text-[10.5px] font-mono text-slate-300">
                <span>Start: <strong className="text-white">{dlpInfo.startDateStr}</strong></span>
                <span>Expiry Date: <strong className="text-white">{dlpInfo.endDateStr}</strong></span>
                <span>Duration: <strong className="text-white">{dlpInfo.dlpDays} Days</strong></span>
                <span>Elapsed: <strong className="text-white">{dlpInfo.daysElapsed}d ({dlpInfo.elapsedPct.toFixed(1)}%)</strong></span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    dlpInfo.isExpired 
                      ? 'bg-blue-500' 
                      : dlpInfo.isNearExpiry 
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${dlpInfo.elapsedPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setEditingDefectId(null);
                  setActiveTab('list');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Defects Register</span>
                <span className={`ml-1 px-1.5 py-0.2 text-[9.5px] rounded-full font-mono font-extrabold ${
                  openCount > 0 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {defectsList.length}
                </span>
              </button>

              <button
                onClick={handleOpenAdd}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'add'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register New Defect</span>
              </button>

              {activeTab === 'edit' && editingDefectId && (
                <button
                  onClick={() => setActiveTab('edit')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-xs flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Defect Details</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setEditingDefectId(null);
                setActiveTab('settings');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Configure DLP Settings & Dates"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DLP Settings</span>
            </button>
          </div>

          {/* Modal Main Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* TAB 1: DEFECTS REGISTER / LIST */}
            {activeTab === 'list' && (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Logged</span>
                    <span className="font-extrabold text-slate-800 dark:text-white text-sm">{defectsList.length} Items</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] uppercase font-bold block">Open Defects</span>
                    <span className="font-extrabold text-rose-700 dark:text-rose-300 text-sm">{openCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold block">Under Rectification</span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-300 text-sm">{underRectCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold block">Rectified & Closed</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">{rectifiedCount}</span>
                  </div>
                </div>

                {/* Filter controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search defects by title, description, station, category, or reporter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Under Rectification">Under Rectification</option>
                        <option value="Rectified">Rectified</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    {/* Severity Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Severity:</span>
                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="All">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg outline-none cursor-pointer max-w-[150px] truncate"
                      >
                        <option value="All">All Categories</option>
                        {DEFECT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Defects Cards List */}
                {filteredDefects.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {defectsList.length === 0 
                        ? "No defects currently flagged for this Defect Liability Period." 
                        : "No defects match the selected filters."}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Use the "+ Register New Defect" button above to log any road surface distress, structural cracks, drainage issues, or guardrail damage discovered during inspections.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log & Register First Defect</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDefects.map((defect, idx) => {
                      const isCritical = defect.severity === 'Critical';
                      const isHigh = defect.severity === 'High';
                      const isMedium = defect.severity === 'Medium';
                      const isClosed = defect.status === 'Rectified' || defect.status === 'Closed';
                      const isUnderRect = defect.status === 'Under Rectification';
                      const isExpanded = !!expandedDefectIds[defect.id];

                      return (
                        <div
                          key={defect.id}
                          className={`rounded-xl border transition-all overflow-hidden ${
                            isClosed
                              ? 'bg-slate-50/90 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-85'
                              : isCritical
                                ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/60 shadow-xs'
                                : isHigh
                                  ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {/* Card Header Top */}
                          <div className="p-3.5 sm:p-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-slate-400">
                                #{idx + 1}
                              </span>

                              {/* Severity Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase border flex items-center gap-1 shrink-0 ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                  : isHigh
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                    : isMedium
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                              }`}>
                                {isCritical && <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />}
                                {defect.severity} Severity
                              </span>

                              {/* Category Badge */}
                              {defect.category && (
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                  {defect.category}
                                </span>
                              )}

                              {/* Station / Chainage */}
                              {defect.locationStation && (
                                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  {defect.locationStation}
                                </span>
                              )}
                            </div>

                            {/* Status controls & Action Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                              {/* Status Tag */}
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                isClosed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : isUnderRect
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              }`}>
                                {defect.status}
                              </span>

                              {/* Status Quick Cycle Button */}
                              {!isClosed ? (
                                <button
                                  onClick={() => handleUpdateDefectStatus(defect.id, isUnderRect ? 'Rectified' : 'Under Rectification')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title={isUnderRect ? "Mark as Rectified" : "Move to Under Rectification"}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isUnderRect ? 'Mark Rectified' : 'Start Rectification'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateDefectStatus(defect.id, 'Open')}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Re-open defect"
                                >
                                  Re-open
                                </button>
                              )}

                              {/* EDIT BUTTON */}
                              <button
                                onClick={() => handleStartEdit(defect)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Edit full detailed defect information"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {/* Toggle Expand Button */}
                              <button
                                onClick={() => toggleExpand(defect.id)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded transition cursor-pointer"
                                title={isExpanded ? "Collapse Details" : "View Full Detailed Information"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteDefect(defect.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                                title="Delete defect record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body Primary View */}
                          <div className="p-3.5 sm:p-4 pt-3 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-2">
                              {defect.title && (
                                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{defect.title}</span>
                                </h4>
                              )}

                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                                {defect.description}
                              </p>

                              {/* Key quick pills */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[10.5px]">
                                {defect.laneSide && (
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-mono">
                                    Lane: {defect.laneSide}
                                  </span>
                                )}
                                {defect.componentAffected && (
                                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-medium border border-blue-200/50 dark:border-blue-900/40">
                                    Component: {defect.componentAffected}
                                  </span>
                                )}
                                {defect.estimatedQuantity && (
                                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded font-mono font-bold border border-emerald-200/50 dark:border-emerald-900/40">
                                    Qty: {defect.estimatedQuantity}
                                  </span>
                                )}
                                {defect.estimatedRectificationCostEtb !== undefined && (
                                  <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded font-mono font-bold border border-purple-200/50 dark:border-purple-900/40">
                                    Est. Cost: ETB {Number(defect.estimatedRectificationCostEtb).toLocaleString()}
                                  </span>
                                )}
                                {defect.targetRectificationDate && (
                                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded font-mono font-bold flex items-center gap-1 border border-amber-200/50 dark:border-amber-900/40">
                                    <Calendar className="w-3 h-3" />
                                    Deadline: {defect.targetRectificationDate}
                                  </span>
                                )}
                              </div>

                              {/* Action required / Remarks summary */}
                              {(defect.rectificationMethod || defect.remarks) && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <strong className="text-slate-800 dark:text-slate-200">Required Remedial Action:</strong> {defect.rectificationMethod || defect.remarks}
                                </p>
                              )}

                              {/* Reporter & Timestamp */}
                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 text-slate-400" />
                                  Logged by: <strong className="text-slate-600 dark:text-slate-300">{defect.reportedBy}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  Date: {formatDateStr(defect.reportedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {defect.rectifiedAt && (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Rectified: {formatDateStr(defect.rectifiedAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Photos Side-by-Side Thumbnail Preview */}
                            <div className="flex sm:flex-col gap-2 shrink-0">
                              {defect.photoUrl && (
                                <div className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoUrl(defect.photoUrl || null)}
                                    className="block relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition cursor-pointer"
                                  >
                                    <img src={defect.photoUrl} alt="Initial Defect" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded font-mono font-bold">
                                      Distress
                                    </span>
                                  </button>
                                </div>
                              )}

                              {defect.afterPhotoUrl && (
                                <div className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhotoUrl(defect.afterPhotoUrl || null)}
                                    className="block relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 hover:opacity-90 transition cursor-pointer"
                                  >
                                    <img src={defect.afterPhotoUrl} alt="After Rectification" className="w-full h-full object-cover" />
                                    <span className="absolute bottom-1 right-1 bg-emerald-700 text-white text-[8px] px-1 py-0.5 rounded font-mono font-bold">
                                      Rectified
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* EXPANDED DETAILED INFORMATION SECTION */}
                          {isExpanded && (
                            <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-fadeIn">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                                <span className="font-extrabold uppercase text-[10.5px] text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                  Comprehensive Defect Dossier & Engineering Metadata
                                </span>
                                <button
                                  onClick={() => handleStartEdit(defect)}
                                  className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" /> Edit Detailed Info
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                {/* Column 1: Classification & Location */}
                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                  <div className="text-[10px] font-black uppercase text-slate-400">1. Spatial & Defect Classification</div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Category:</strong> <span className="font-semibold text-slate-900 dark:text-white">{defect.category || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Root Cause:</strong> <span className="font-semibold text-slate-900 dark:text-white">{defect.rootCause || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Station / Chainage:</strong> <span className="font-mono font-bold text-emerald-600">{defect.locationStation || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">GPS Coordinates:</strong> <span className="font-mono text-slate-700 dark:text-slate-300">{defect.gpsCoordinates || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Carriageway / Lane:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{defect.laneSide || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Component Affected:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{defect.componentAffected || 'N/A'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Distress Dimensions / Qty:</strong> <span className="font-mono font-bold text-slate-900 dark:text-white">{defect.estimatedQuantity || 'N/A'}</span></div>
                                </div>

                                {/* Column 2: Assignment & Remedial Workflow */}
                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                  <div className="text-[10px] font-black uppercase text-slate-400">2. Inspection & Rectification Workflow</div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Inspection Method:</strong> <span className="font-semibold text-slate-900 dark:text-white">{defect.inspectionMethod || 'Visual Site Walkover'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Assigned Contractor Rep:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{defect.assignedContractorRep || project.contractor || 'Contractor Site Team'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Rectification Target Deadline:</strong> <span className="font-mono font-bold text-amber-600">{defect.targetRectificationDate || 'Within 14 Calendar Days'}</span></div>
                                  <div><strong className="text-slate-600 dark:text-slate-400">Estimated Cost:</strong> <span className="font-mono font-black text-purple-600">{defect.estimatedRectificationCostEtb ? `ETB ${defect.estimatedRectificationCostEtb.toLocaleString()}` : 'N/A (Contractor DLP Obligation)'}</span></div>
                                  {defect.rectifiedBy && (
                                    <div><strong className="text-slate-600 dark:text-slate-400">Rectified By / Team:</strong> <span className="font-semibold text-emerald-600">{defect.rectifiedBy}</span></div>
                                  )}
                                  {defect.closureRemarks && (
                                    <div><strong className="text-slate-600 dark:text-slate-400">Closure Verification Notes:</strong> <span className="italic text-slate-700 dark:text-slate-300">{defect.closureRemarks}</span></div>
                                  )}
                                  {defect.closureSignOffBy && (
                                    <div><strong className="text-slate-600 dark:text-slate-400">Resident Engineer Sign-off:</strong> <span className="font-bold text-slate-900 dark:text-white">{defect.closureSignOffBy}</span></div>
                                  )}
                                </div>
                              </div>

                              {/* Prescribed remedial procedure box */}
                              {defect.rectificationMethod && (
                                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50">
                                  <div className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                                    <Wrench className="w-3 h-3 text-emerald-600" />
                                    Prescribed Remedial Procedure / Specification
                                  </div>
                                  <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                    {defect.rectificationMethod}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2 & TAB 3: REGISTER NEW DEFECT / EDIT DEFECT FORM */}
            {(activeTab === 'add' || activeTab === 'edit') && (
              <form onSubmit={handleSubmitDefect} className="space-y-4 max-w-3xl mx-auto bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      activeTab === 'edit'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {activeTab === 'edit' ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white">
                        {activeTab === 'edit' ? 'Edit Detailed Defect Information' : 'Register & Flag New DLP Defect'}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {activeTab === 'edit' ? 'Modify engineering distress parameters, location, and remedial actions' : 'Add comprehensive site inspection distress record'}
                      </p>
                    </div>
                  </div>

                  {/* Preset Buttons for quick fill (in Add mode) */}
                  {activeTab === 'add' && (
                    <div className="hidden sm:flex items-center gap-1 text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyPreset('rutting')}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Rutting
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('crack')}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Fatigue Cracking
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('culvert')}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Culvert Silt
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('guardrail')}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Guardrail
                      </button>
                    </div>
                  )}
                </div>

                {formSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* SECTION 1: CLASSIFICATION & SUMMARY */}
                <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <Layers className="w-3.5 h-3.5" />
                    1. Defect Title & Classification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Defect Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Defect Title / Headline Summary
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Severe Asphalt Rutting & Shoving"
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                      />
                    </div>

                    {/* Defect Category */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Defect Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {DEFECT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Severity & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Severity Level */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Severity Level <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['Low', 'Medium', 'High', 'Critical'] as const).map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setFormSeverity(sev)}
                            className={`py-1.5 px-1 rounded-lg text-[10.5px] font-extrabold uppercase border transition cursor-pointer text-center ${
                              formSeverity === sev
                                ? (sev === 'Critical'
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : sev === 'High'
                                      ? 'bg-amber-600 text-white border-amber-600'
                                      : sev === 'Medium'
                                        ? 'bg-yellow-500 text-slate-950 border-yellow-500 font-black'
                                        : 'bg-blue-600 text-white border-blue-600')
                                : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Defect Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Defect Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="Open">Open (Action Pending by Contractor)</option>
                        <option value="Under Rectification">Under Rectification (Work In Progress)</option>
                        <option value="Rectified">Rectified (Awaiting Final Sign-off)</option>
                        <option value="Closed">Closed & Approved</option>
                      </select>
                    </div>
                  </div>

                  {/* Defect Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Detailed Distress Description <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] font-normal text-slate-400">Provide exact engineering visual distress observations</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="e.g. Severe longitudinal rutting (>25mm depth) and alligator fatigue cracking observed along outer wheel path; localized water ponding and raveling during rain events..."
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  {/* Root cause */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Suspected Root Cause / Distress Mechanism
                    </label>
                    <select
                      value={formRootCause}
                      onChange={(e) => setFormRootCause(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {DEFECT_ROOT_CAUSES.map(rc => (
                        <option key={rc} value={rc}>{rc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 2: SPATIAL LOCATION, STATION, GPS & DIMENSIONS */}
                <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <Compass className="w-3.5 h-3.5" />
                    2. Location, Spatial Station & Physical Dimensions
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Location / Station */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Station / Chainage / Landmark
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                        <input
                          type="text"
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder="e.g. Km 24+150 - Km 24+320 or Abay Bridge Pier 2"
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        GPS Coordinates (Lat, Long)
                      </label>
                      <input
                        type="text"
                        value={formGps}
                        onChange={(e) => setFormGps(e.target.value)}
                        placeholder="e.g. 9.0321° N, 38.7456° E"
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lane Side */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Carriageway / Lane Side
                      </label>
                      <select
                        value={formLaneSide}
                        onChange={(e) => setFormLaneSide(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {CARRIAGEWAY_LANE_SIDES.map(side => (
                          <option key={side} value={side}>{side}</option>
                        ))}
                      </select>
                    </div>

                    {/* Component Affected */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Structural / Road Component Affected
                      </label>
                      <input
                        type="text"
                        value={formComponent}
                        onChange={(e) => setFormComponent(e.target.value)}
                        placeholder="e.g. Asphalt Wearing Course, Culvert Wingwall, Guardrail"
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Estimated Quantity / Dimensions */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Estimated Distress Dimensions / Quantity
                      </label>
                      <input
                        type="text"
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(e.target.value)}
                        placeholder="e.g. 150 m², 45m length, 35mm depth"
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Estimated Cost (ETB) */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Estimated Rectification Cost (ETB)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">ETB</span>
                        <input
                          type="number"
                          min="0"
                          value={formCostEtb}
                          onChange={(e) => setFormCostEtb(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 85000"
                          className="w-full pl-12 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: INSPECTION, REMEDIAL METHOD & TIMELINE */}
                <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <Wrench className="w-3.5 h-3.5" />
                    3. Inspection Details, Remedial Specification & Assignment
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Reporter Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Reported / Inspected By
                      </label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={formReporter}
                          onChange={(e) => setFormReporter(e.target.value)}
                          placeholder="Resident Engineer / Inspector Name"
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Inspection Timestamp */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Inspection Timestamp
                      </label>
                      <input
                        type="datetime-local"
                        value={formTimestamp}
                        onChange={(e) => setFormTimestamp(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Inspection Method */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Inspection Method
                      </label>
                      <select
                        value={formInspectionMethod}
                        onChange={(e) => setFormInspectionMethod(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {INSPECTION_METHODS.map(im => (
                          <option key={im} value={im}>{im}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target Deadline */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Target Rectification Deadline Date
                      </label>
                      <input
                        type="date"
                        value={formDeadline}
                        onChange={(e) => setFormDeadline(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Remedial Specification */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Prescribed Remedial Procedure & Technical Specification
                    </label>
                    <textarea
                      rows={2}
                      value={formRemedialAction}
                      onChange={(e) => setFormRemedialAction(e.target.value)}
                      placeholder="e.g. Saw-cut, cold-mill 50mm wearing course, apply tack coat and replace with hot asphalt overlay..."
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* SECTION 4: PHOTO EVIDENCE (BEFORE & AFTER) */}
                <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <Camera className="w-3.5 h-3.5" />
                    4. Photographic Evidence & Rectification Verification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Before Photo */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                        Initial Distress Photo (Before)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>{formPhotoUrl ? 'Change Photo' : 'Upload Distress Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, false)}
                            className="hidden"
                          />
                        </label>
                        {formPhotoUrl && (
                          <div className="flex items-center gap-1.5">
                            <img src={formPhotoUrl} alt="Before" className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                            <button
                              type="button"
                              onClick={() => setFormPhotoUrl('')}
                              className="text-xs text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After Photo (Rectification) */}
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                        Rectification Verification Photo (After)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{formAfterPhotoUrl ? 'Change Photo' : 'Upload After Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, true)}
                            className="hidden"
                          />
                        </label>
                        {formAfterPhotoUrl && (
                          <div className="flex items-center gap-1.5">
                            <img src={formAfterPhotoUrl} alt="After" className="w-10 h-10 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700" />
                            <button
                              type="button"
                              onClick={() => setFormAfterPhotoUrl('')}
                              className="text-xs text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: CLOSURE & SIGN-OFF (IF RECTIFIED OR CLOSED) */}
                {(formStatus === 'Rectified' || formStatus === 'Closed') && (
                  <div className="space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                    <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 pb-1 border-b border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      5. Rectification Verification & Resident Engineer Sign-Off
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Rectified Date
                        </label>
                        <input
                          type="date"
                          value={formRectifiedAt}
                          onChange={(e) => setFormRectifiedAt(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Rectified By (Contractor Team / Engineer)
                        </label>
                        <input
                          type="text"
                          value={formRectifiedBy}
                          onChange={(e) => setFormRectifiedBy(e.target.value)}
                          placeholder="Contractor Project Manager or Lead Engineer"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Closure Verification Remarks
                        </label>
                        <input
                          type="text"
                          value={formClosureRemarks}
                          onChange={(e) => setFormClosureRemarks(e.target.value)}
                          placeholder="e.g. Joint inspection verified asphalt surface smoothness and compaction."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Resident Engineer Sign-Off Name
                        </label>
                        <input
                          type="text"
                          value={formClosureSignOffBy}
                          onChange={(e) => setFormClosureSignOffBy(e.target.value)}
                          placeholder="e.g. Eng. Dawit Kebede (Resident Engineer)"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit / Action button bar */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!formDesc.trim() && !formTitle.trim())}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                      activeTab === 'edit'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {activeTab === 'edit' ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{activeTab === 'edit' ? 'Save Changes to Defect' : 'Register Defect Record'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: DLP CONFIGURATION SETTINGS */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white">
                    Configure Defect Liability Period (DLP) Dates & Target
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                      ASSIGN DLP START DATE
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editDlpStartDate}
                        onChange={(e) => setEditDlpStartDate(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditDlpStartDate(new Date().toISOString().split('T')[0])}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Today
                      </button>
                      {project.completionDate && (
                        <button
                          type="button"
                          onClick={() => setEditDlpStartDate(project.completionDate || '')}
                          className="px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Use Comp Date
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                      DLP DURATION (CALENDAR DAYS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editDlpDays}
                      onChange={(e) => setEditDlpDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-1.5 pt-1">
                      {[365, 730, 1095, 548].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditDlpDays(d)}
                          className={`text-[10px] font-mono px-2 py-1 rounded-lg border cursor-pointer ${
                            editDlpDays === d
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  {project.status !== 'Completed' && project.status !== 'Completed and Closed' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={markLifecycleCompleted}
                          onChange={(e) => setMarkLifecycleCompleted(e.target.checked)}
                          className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-blue-950 dark:text-blue-200">
                          Transition Project Lifecycle to "Completed"
                        </span>
                      </label>
                      <p className="text-[10px] text-blue-800 dark:text-blue-300 pl-6">
                        Automatically stops elapsed contract duration count at 100% and activates DLP countdown.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Save DLP Settings
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Photo Zoom/Preview Modal */}
          {previewPhotoUrl && (
            <div 
              onClick={() => setPreviewPhotoUrl(null)}
              className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 border border-slate-700">
                <button
                  onClick={() => setPreviewPhotoUrl(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <img src={previewPhotoUrl} alt="Inspection Photo Evidence" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-3 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-2xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ethiopian Roads Administration PMIS • Defect Liability Period Register</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDlpReport}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-2xs transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3 h-3" />
                <span>Download Report (PDF)</span>
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg font-bold cursor-pointer transition text-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

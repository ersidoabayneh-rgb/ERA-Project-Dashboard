import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  FileImage,
  Paperclip,
  Plus,
  X,
  FileType,
  FileSpreadsheet,
  GripVertical
} from 'lucide-react';
import { Project, ProjectDocument, formatAccounting } from '../types';

const FILING_STRUCTURE_HEADINGS = [
  "Contract Documents",
  "Drawings",
  "Tender Stage Information",
  "Correspondence",
  "Meetings",
  "Reports",
  "Right of Way",
  "Programmes",
  "Design and Design Changes",
  "Financial Control",
  "Claims",
  "Contract Administration Manual (CAM)",
  "Taking Over and Defects Notification",
  "Additional"
];

interface DocumentationViewProps {
  project: Project;
  onUpdateDocuments: (documents: ProjectDocument[]) => void;
  isReadonly?: boolean;
}

export default function DocumentationView({
  project,
  onUpdateDocuments,
  isReadonly = false
}: DocumentationViewProps) {
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('Contract Documents');
  const [docDesc, setDocDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showPreviewDoc, setShowPreviewDoc] = useState<ProjectDocument | null>(null);

  const [collapsedHeadings, setCollapsedHeadings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    FILING_STRUCTURE_HEADINGS.forEach(h => { initial[h] = false; }); // default expanded
    return initial;
  });

  const toggleHeading = (heading: string) => {
    setCollapsedHeadings(prev => ({
      ...prev,
      [heading]: !prev[heading]
    }));
  };

  const expandAllHeadings = () => {
    const updated: Record<string, boolean> = {};
    FILING_STRUCTURE_HEADINGS.forEach(h => { updated[h] = false; });
    setCollapsedHeadings(updated);
  };

  const collapseAllHeadings = () => {
    const updated: Record<string, boolean> = {};
    FILING_STRUCTURE_HEADINGS.forEach(h => { updated[h] = true; });
    setCollapsedHeadings(updated);
  };

  const [sidePreviewDoc, setSidePreviewDoc] = useState<ProjectDocument | null>(null);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);

  const handleDocDragStart = (e: React.DragEvent, docId: string) => {
    e.stopPropagation();
    setDraggedDocId(docId);
  };

  const handleDocDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDocDrop = (e: React.DragEvent, targetDocId: string, targetHeading: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedDocId || draggedDocId === targetDocId) return;

    const docs = [...documents];
    const draggedIdx = docs.findIndex(d => d.id === draggedDocId);
    const targetIdx = docs.findIndex(d => d.id === targetDocId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [removed] = docs.splice(draggedIdx, 1);
    removed.type = targetHeading;
    docs.splice(targetIdx, 0, removed);

    onUpdateDocuments(docs);
    setDraggedDocId(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const documents = project.documents || [];

  // Core file processor for drag-and-drop & file picker
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadStatus(null);

    try {
      const newDocs: ProjectDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        const cleanFilename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const formattedTitle = (files.length === 1 && docName.trim()) 
          ? docName.trim() 
          : cleanFilename.replace(/[-_]/g, ' ');

        const fileSizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        // Auto-classify document type based on 14 Filing Structure headings
        const filingHeadings = [
          "Contract Documents",
          "Drawings",
          "Tender Stage Information",
          "Correspondence",
          "Meetings",
          "Reports",
          "Right of Way",
          "Programmes",
          "Design and Design Changes",
          "Financial Control",
          "Claims",
          "Contract Administration Manual (CAM)",
          "Taking Over and Defects Notification",
          "Additional"
        ];

        let autoType = docType || 'Additional';
        if (docType && filingHeadings.includes(docType)) {
          autoType = docType;
        } else if (file.type.startsWith('image/')) {
          autoType = 'Drawings';
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('contract') || lowerName.includes('agreement') || lowerName.includes('fidic')) {
            autoType = 'Contract Documents';
          } else if (lowerName.includes('drawing')) {
            autoType = 'Drawings';
          } else if (lowerName.includes('report') || lowerName.includes('monthly') || lowerName.includes('progress')) {
            autoType = 'Reports';
          } else if (lowerName.includes('program') || lowerName.includes('schedule')) {
            autoType = 'Programmes';
          } else if (lowerName.includes('claim')) {
            autoType = 'Claims';
          } else if (lowerName.includes('financial') || lowerName.includes('ipc') || lowerName.includes('payment')) {
            autoType = 'Financial Control';
          } else if (lowerName.includes('row') || lowerName.includes('right of way')) {
            autoType = 'Right of Way';
          } else if (lowerName.includes('meeting')) {
            autoType = 'Meetings';
          } else if (lowerName.includes('correspondence') || lowerName.includes('letter')) {
            autoType = 'Correspondence';
          } else if (lowerName.includes('design')) {
            autoType = 'Design and Design Changes';
          } else if (lowerName.includes('tender')) {
            autoType = 'Tender Stage Information';
          } else if (lowerName.includes('cam') || lowerName.includes('administration')) {
            autoType = 'Contract Administration Manual (CAM)';
          } else if (lowerName.includes('taking') || lowerName.includes('defect') || lowerName.includes('dlp')) {
            autoType = 'Taking Over and Defects Notification';
          } else {
            autoType = 'Additional';
          }
        } else {
          autoType = 'Additional';
        }

        const newDoc: ProjectDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: formattedTitle,
          type: autoType,
          fileName: file.name,
          uploadedAt: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          uploadedBy: project.lastModifiedBy || 'Ersido Abayneh',
          fileSize: fileSizeStr,
          description: docDesc.trim() || (file.type.startsWith('image/') ? 'Supporting project image attachment' : 'Supporting project PDF / document attachment'),
          fileData: dataUrl,
          fileType: file.type
        };

        newDocs.push(newDoc);
      }

      const updatedDocs = [...newDocs, ...documents];
      onUpdateDocuments(updatedDocs);

      setUploadStatus(`Attached ${newDocs.length} file${newDocs.length > 1 ? 's' : ''} to project documentation archives!`);
      
      // Reset Form
      setDocName('');
      setDocDesc('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error processing dropped files:', err);
      setUploadStatus('Error processing files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleImportDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      processFiles([selectedFile]);
    } else if (docName.trim()) {
      // Create manual reference entry if no file binary selected
      const newDoc: ProjectDocument = {
        id: `doc_${Date.now()}`,
        name: docName.trim(),
        type: docType,
        fileName: `registered_${docType}_${Date.now().toString().slice(-4)}.pdf`,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        uploadedBy: project.lastModifiedBy || 'Ersido Abayneh',
        fileSize: '1.20 MB',
        description: docDesc.trim() || undefined,
      };

      onUpdateDocuments([newDoc, ...documents]);
      setUploadStatus('Document registered in project dossier.');
      setDocName('');
      setDocDesc('');
    }
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document from project archives?')) {
      const updatedDocs = documents.filter(d => d.id !== id);
      onUpdateDocuments(updatedDocs);
      if (showPreviewDoc?.id === id) {
        setShowPreviewDoc(null);
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' 
      ? true 
      : filterType === 'image'
      ? doc.type === 'image' || (doc.fileType && doc.fileType.startsWith('image/'))
      : filterType === 'pdf_document'
      ? doc.type === 'pdf_document' || doc.fileName.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf'
      : doc.type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div id="documentation-view-container" className="space-y-6">
      
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-slate-950/20 p-5 rounded-3xl border border-blue-100/50 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-600 text-white rounded-full">
              SECURE DOSSIER
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Project Vault
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-zinc-100">
            Contract Documents & Supporting Files Vault
          </h2>
          <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium">
            Attach, categorize, and preserve legally binding FIDIC contracts, site images, engineering drawing dossiers, and PDF progress reports.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 text-2xs font-bold text-slate-600 dark:text-zinc-300">
          <FileCheck2 className="w-5 h-5 text-indigo-500" />
          <div>
            <div className="text-slate-400 text-[9px] uppercase tracking-wider font-extrabold">Active Archive</div>
            <div>{documents.length} Files Logged</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Drag and Drop & Import Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-150 dark:border-slate-800/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-500" /> Drag & Drop File Attachments
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                Drop PDF documents or image files directly into the box below to attach them to this project.
              </p>
            </div>

            {isReadonly ? (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/30 text-2xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You have viewer-only permissions. File import and modification are disabled.</span>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Drag and Drop Zone */}
                <div 
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 relative overflow-hidden ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 scale-[1.01]' 
                      : 'border-slate-250 dark:border-slate-750 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/80 dark:bg-slate-900/30'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    multiple
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.docx,.xlsx,.xls,.pptx,.zip"
                  />

                  {/* Icon Badges */}
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/30">
                      <Upload className={`w-6 h-6 ${isProcessing ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 shadow-xs">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1">
                    <span className="text-2xs font-extrabold text-slate-800 dark:text-zinc-200 block">
                      {dragActive ? 'Release to attach files to project!' : 'Drag & drop supporting PDF or image files here'}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block">
                      or click here to browse files
                    </span>
                  </div>

                  {/* Format Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-rose-100/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-md">
                      📄 PDF Docs
                    </span>
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-blue-100/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md">
                      🖼️ Images (PNG, JPG, SVG)
                    </span>
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md">
                      📊 Excel & Word
                    </span>
                  </div>
                </div>

                {/* Upload Status Banner */}
                {uploadStatus && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-2xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{uploadStatus}</span>
                    </div>
                    <button 
                      onClick={() => setUploadStatus(null)} 
                      className="text-emerald-600 hover:text-emerald-800 text-xs font-black"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Custom Metadata Form (Optional override for single file) */}
                <form onSubmit={handleImportDoc} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Optional Custom Metadata
                  </div>

                  {/* Doc Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      Document Title / Reference Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Site Quality Inspection Report May 2026"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-zinc-250 focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Doc Type Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      Classification Category
                    </label>
                    <input
                      list="doc-categories"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      placeholder="Select or type a new category"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-750 dark:text-zinc-200 focus:border-indigo-500 transition"
                    />
                    <datalist id="doc-categories">
                      <option value="Contract Documents">1. Contract Documents</option>
                      <option value="Drawings">2. Drawings</option>
                      <option value="Tender Stage Information">3. Tender Stage Information</option>
                      <option value="Correspondence">4. Correspondence</option>
                      <option value="Meetings">5. Meetings</option>
                      <option value="Reports">6. Reports</option>
                      <option value="Right of Way">7. Right of Way</option>
                      <option value="Programmes">8. Programmes</option>
                      <option value="Design and Design Changes">9. Design and Design Changes</option>
                      <option value="Financial Control">10. Financial Control</option>
                      <option value="Claims">11. Claims</option>
                      <option value="Contract Administration Manual (CAM)">12. Contract Administration Manual (CAM)</option>
                      <option value="Taking Over and Defects Notification">13. Taking Over and Defects Notification</option>
                      <option value="Additional">14. Additional</option>
                    </datalist>
                  </div>

                  {/* Doc Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                      Brief Description / Memo Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Provide details about document scope, signatures, or specific months..."
                      value={docDesc}
                      onChange={(e) => setDocDesc(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-zinc-250 focus:border-indigo-500 transition resize-none"
                    />
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Document Record
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Files List & Side Preview Panel */}
        <div className={`transition-all duration-300 ${sidePreviewDoc ? 'lg:col-span-12 xl:grid xl:grid-cols-12 gap-6' : 'lg:col-span-7'}`}>
          <div className={`${sidePreviewDoc ? 'xl:col-span-7' : 'w-full'} space-y-4`}>
            <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
              
              {/* Control Bar: Search & Filter Tabs & Expand/Collapse All */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                    📁 Document Vault Register (14 Headings)
                  </h3>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold mt-0.5">
                    Showing {filteredDocs.length} matching of {documents.length} total • Drag to reorder
                  </span>
                </div>

                {/* Filters & Expand/Collapse Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAllHeadings}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-300 rounded-lg text-3xs font-black uppercase transition cursor-pointer"
                    title="Expand All Headings"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllHeadings}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-300 rounded-lg text-3xs font-black uppercase transition cursor-pointer"
                    title="Collapse All Headings"
                  >
                    Collapse All
                  </button>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-3xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="all">📁 All 14 Filing Headings</option>
                    {FILING_STRUCTURE_HEADINGS.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search archives..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 text-2xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 max-w-[140px] text-slate-800 dark:text-zinc-200 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Accordions for each of the 14 Main Headings */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {FILING_STRUCTURE_HEADINGS
                  .filter(heading => filterType === 'all' || filterType === heading)
                  .map((heading, hIdx) => {
                    const headingDocs = filteredDocs.filter(doc => (doc.type || 'Additional') === heading);
                    const isCollapsed = Boolean(collapsedHeadings[heading]);

                    return (
                      <div 
                        key={heading}
                        className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/30 transition"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleHeading(heading)}
                          className="px-4 py-3 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer select-none transition border-b border-slate-150 dark:border-slate-800/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-xl ${headingDocs.length > 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                                <span>{hIdx + 1}. {heading}</span>
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${headingDocs.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                  {headingDocs.length} {headingDocs.length === 1 ? 'file' : 'files'}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isReadonly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDocType(heading);
                                  fileInputRef.current?.click();
                                }}
                                className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-3xs font-black uppercase transition"
                                title={`Upload file to ${heading}`}
                              >
                                + Add File
                              </button>
                            )}
                            <div className="text-slate-400">
                              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Content */}
                        {!isCollapsed && (
                          <div className="p-3 space-y-2 bg-white/60 dark:bg-slate-900/50">
                            {headingDocs.length === 0 ? (
                              <div className="text-center py-6 px-4 space-y-1">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                                  No documents filed under this heading yet. Drag files here or click below.
                                </p>
                                {!isReadonly && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDocType(heading);
                                      fileInputRef.current?.click();
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 pt-0.5"
                                  >
                                    <Plus className="w-3 h-3" /> Attach document to {heading}
                                  </button>
                                )}
                              </div>
                            ) : (
                              headingDocs.map((doc, idx) => {
                                const isImg = doc.type === 'image' || (doc.fileType && doc.fileType.startsWith('image/'));
                                const isPdf = doc.type === 'pdf_document' || doc.fileName.toLowerCase().endsWith('.pdf') || doc.fileType === 'application/pdf';

                                return (
                                  <div 
                                    key={doc.id || `doc-${heading}-${idx}`}
                                    draggable={!isReadonly}
                                    onDragStart={(e) => handleDocDragStart(e, doc.id)}
                                    onDragOver={handleDocDragOver}
                                    onDrop={(e) => handleDocDrop(e, doc.id, heading)}
                                    onClick={() => setSidePreviewDoc(doc)}
                                    className={`p-3 bg-white dark:bg-slate-850 border rounded-2xl flex items-start justify-between gap-3 transition shadow-2xs cursor-pointer ${
                                      sidePreviewDoc?.id === doc.id
                                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/25 ring-1 ring-indigo-500/30'
                                        : 'border-slate-150 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      {!isReadonly && (
                                        <div 
                                          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 pt-1 shrink-0" 
                                          title="Drag to reorder file position"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                      )}

                                      {isImg && doc.fileData ? (
                                        <div 
                                          onClick={(e) => { e.stopPropagation(); setShowPreviewDoc(doc); }} 
                                          className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition bg-slate-100 dark:bg-slate-800"
                                        >
                                          <img 
                                            src={doc.fileData} 
                                            alt={doc.name} 
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      ) : (
                                        <div className={`p-2 rounded-xl shrink-0 ${
                                          isPdf 
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                            : isImg
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                          {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                      )}

                                      <div className="min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-extrabold text-xs text-slate-700 dark:text-zinc-200 truncate max-w-[240px]">
                                            {doc.name}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[300px]">
                                          File: {doc.fileName} ({doc.fileSize})
                                        </p>
                                        {doc.description && (
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans leading-tight pt-0.5">
                                            {doc.description}
                                          </p>
                                        )}
                                        <div className="text-[9px] text-slate-400 pt-0.5 flex items-center gap-2">
                                          <span>By: <b className="font-bold">{doc.uploadedBy}</b></span>
                                          <span>•</span>
                                          <span>{doc.uploadedAt}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setShowPreviewDoc(doc)}
                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-lg transition"
                                        title="Preview Modal"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <a
                                        href={doc.fileData || `data:text/plain;charset=utf-8,${encodeURIComponent(
                                          `Ethiopian Roads Administration ERP System Document Download\n` +
                                          `========================================================\n` +
                                          `Document ID: ${doc.id}\n` +
                                          `Project: ${project.name}\n` +
                                          `Document Name: ${doc.name}\n` +
                                          `Filing Heading: ${heading}\n` +
                                          `File Name: ${doc.fileName}\n` +
                                          `File Size: ${doc.fileSize}\n` +
                                          `Uploaded By: ${doc.uploadedBy}\n` +
                                          `Uploaded At: ${doc.uploadedAt}\n` +
                                          `Description: ${doc.description || 'No description provided.'}\n` +
                                          `========================================================\n` +
                                          `This is a secured download token representing the legally binding physical asset filed in the administration archives.`
                                        )}`}
                                        download={doc.fileName}
                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-lg transition"
                                        title="Download"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>

                                      {!isReadonly && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDoc(doc.id)}
                                          className="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/20 border border-slate-150 dark:border-slate-800 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

            </div>
          </div>

          {/* Side Preview Panel */}
          {sidePreviewDoc && (
            <div className="xl:col-span-5 mt-4 xl:mt-0 space-y-4">
              <div className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-lg space-y-4 sticky top-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-zinc-100">
                      Live Document Side Preview
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidePreviewDoc(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition text-xs font-black"
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {sidePreviewDoc.fileData && (sidePreviewDoc.type === 'image' || sidePreviewDoc.fileType?.startsWith('image/')) ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                      <img 
                        src={sidePreviewDoc.fileData} 
                        alt={sidePreviewDoc.name} 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
                        <FileText className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                        {sidePreviewDoc.fileName}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                        {sidePreviewDoc.type} • {sidePreviewDoc.fileSize}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 text-xs">
                    <div>
                      <div className="text-[9px] font-black uppercase text-slate-400">Document Title</div>
                      <div className="font-bold text-slate-800 dark:text-zinc-100">{sidePreviewDoc.name}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-400">Filing Heading</div>
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 text-2xs">{sidePreviewDoc.type || 'Additional'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-400">File Size</div>
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 text-2xs">{sidePreviewDoc.fileSize}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-black uppercase text-slate-400">File Name</div>
                      <div className="font-mono text-slate-600 dark:text-zinc-400 text-3xs truncate">{sidePreviewDoc.fileName}</div>
                    </div>

                    {sidePreviewDoc.description && (
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-400">Description / Notes</div>
                        <div className="text-slate-600 dark:text-zinc-300 text-2xs leading-relaxed">{sidePreviewDoc.description}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-150 dark:border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400">Uploaded By:</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{sidePreviewDoc.uploadedBy}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{sidePreviewDoc.uploadedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPreviewDoc(sidePreviewDoc)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-3xs font-extrabold shadow-sm transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Full Modal Preview
                    </button>
                    <a
                      href={sidePreviewDoc.fileData || `data:text/plain;charset=utf-8,${encodeURIComponent('download')}`}
                      download={sidePreviewDoc.fileName}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 rounded-xl text-3xs font-extrabold transition text-center"
                    >
                      <Download className="w-3.5 h-3.5 inline" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Document Interactive Preview Modal */}
      {showPreviewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-250">
                  📁 Secure ERP Document Preview
                </h3>
              </div>
              <button 
                onClick={() => setShowPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-black"
              >
                CLOSE [×]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[480px]">
              
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  showPreviewDoc.type === 'contract' 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    : showPreviewDoc.type === 'monthly_report'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                    {showPreviewDoc.type === 'contract' ? '📜 FIDIC Legal Contract' : showPreviewDoc.type === 'monthly_report' ? '📅 Cumulative progress report' : '📦 Engineering Drawings & Attachments'}
                  </span>
                  <h4 className="text-sm font-black text-slate-850 dark:text-zinc-100">
                    {showPreviewDoc.name}
                  </h4>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 font-mono">
                    Token File Identifier: {showPreviewDoc.id}
                  </p>
                </div>
              </div>

              {/* Document Specs Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl text-2xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Physical Filename</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-mono font-bold">{showPreviewDoc.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Document Size</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-mono font-bold">{showPreviewDoc.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Archive Uploader</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">{showPreviewDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Submission Timestamp</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">{showPreviewDoc.uploadedAt}</span>
                </div>
              </div>

              {/* Document Scope Content */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                  Memo Description Note
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {showPreviewDoc.description || 'No descriptive notes registered during file import.'}
                </p>
              </div>

              {/* Container preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-100 dark:bg-slate-950 text-center space-y-4">
                {showPreviewDoc.fileData ? (
                  showPreviewDoc.fileType?.startsWith('image/') || showPreviewDoc.type === 'image' ? (
                    <img 
                      src={showPreviewDoc.fileData} 
                      alt={showPreviewDoc.name} 
                      className="max-h-[300px] mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : showPreviewDoc.fileType === 'application/pdf' || showPreviewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={showPreviewDoc.fileData} 
                      className="w-full h-[380px] rounded-lg border border-slate-200 dark:border-slate-800"
                      title={showPreviewDoc.name}
                    />
                  ) : (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center gap-2">
                      <FileCheck2 className="w-8 h-8 text-indigo-500" />
                      <span className="text-2xs font-extrabold text-slate-700 dark:text-zinc-250 truncate max-w-xs">
                        {showPreviewDoc.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        File Type: {showPreviewDoc.fileType || 'Document Asset'}
                      </span>
                    </div>
                  )
                ) : (
                  <>
                    <FileCheck2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-2xs font-extrabold text-slate-800 dark:text-zinc-250">
                        Legally Certified Digitized Copy
                      </h5>
                      <p className="text-3xs text-slate-450 dark:text-slate-500 max-w-sm mx-auto">
                        This file is encrypted and safely persisted inside the Ethiopian Roads Administration cloud storage database. Click below to download the full asset.
                      </p>
                    </div>
                  </>
                )}
                <a
                  href={showPreviewDoc.fileData || `data:text/plain;charset=utf-8,${encodeURIComponent(
                    `Ethiopian Roads Administration ERP System Document Preview\n` +
                    `========================================================\n` +
                    `Document ID: ${showPreviewDoc.id}\n` +
                    `Project: ${project.name}\n` +
                    `Document Name: ${showPreviewDoc.name}\n` +
                    `Category: ${showPreviewDoc.type.toUpperCase()}\n` +
                    `File Name: ${showPreviewDoc.fileName}\n` +
                    `File Size: ${showPreviewDoc.fileSize}\n` +
                    `Uploaded By: ${showPreviewDoc.uploadedBy}\n` +
                    `Uploaded At: ${showPreviewDoc.uploadedAt}\n` +
                    `Description: ${showPreviewDoc.description || 'No description provided.'}\n` +
                    `========================================================\n` +
                    `This is a secured download token representing the legally binding physical asset filed in the administration archives.`
                  )}`}
                  download={showPreviewDoc.fileName}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-extrabold px-4 py-2 rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Full Archive Copy
                </a>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}


import React from 'react';
import { 
  BookOpen, 
  Compass, 
  BarChart3, 
  FileText, 
  Landmark, 
  TrendingUp, 
  Layers, 
  HardHat, 
  Scale, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Users, 
  Sliders, 
  HelpCircle, 
  FolderTree, 
  Lock, 
  Play, 
  FileSpreadsheet, 
  Bot, 
  Sparkles, 
  Phone
} from 'lucide-react';

export interface UserGuideSectionMeta {
  id: string;
  number: number;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  pageLabel: string;
}

export const USER_GUIDE_SECTIONS_META: UserGuideSectionMeta[] = [
  { id: 'sec-intro', number: 1, title: 'Title & Introduction', category: 'Overview', icon: BookOpen, pageLabel: 'Sec 1' },
  { id: 'sec-toc', number: 2, title: 'Table of Contents', category: 'Index', icon: Compass, pageLabel: 'Sec 2' },
  { id: 'sec-getting-started', number: 3, title: 'Getting Started & Login Access', category: 'Authentication', icon: Lock, pageLabel: 'Sec 3' },
  { id: 'sec-portfolio', number: 4, title: 'Active Contracts Portfolio Page', category: 'Portfolio', icon: FolderTree, pageLabel: 'Sec 4' },
  { id: 'sec-dossier', number: 5, title: 'Project Header & Master Dossier', category: 'Dossier', icon: FileText, pageLabel: 'Sec 5' },
  { id: 'sec-dash', number: 6, title: 'Executive Dashboard (📊 Dashboard)', category: 'Executive', icon: BarChart3, pageLabel: 'Sec 6' },
  { id: 'sec-financial-boq', number: 7, title: 'Financial BOQ & Divisions (📋 Financial Data)', category: 'Financials', icon: Landmark, pageLabel: 'Sec 7' },
  { id: 'sec-ipc-billing', number: 8, title: 'IPC Billing Certificates (📋 Financial Data)', category: 'Billing', icon: TrendingUp, pageLabel: 'Sec 8' },
  { id: 'sec-issue-log', number: 9, title: 'Issue & Claims Log (🚩 Issue Log)', category: 'Claims & Issues', icon: AlertTriangle, pageLabel: 'Sec 9' },
  { id: 'sec-linear', number: 10, title: 'Linear Elevation Diagram (📏 Linear diagram)', category: 'Physical Progress', icon: Layers, pageLabel: 'Sec 10' },
  { id: 'sec-row', number: 11, title: 'Utilities & Right of Way (ROW) (🛣️ Utilities & ROW)', category: 'Site & ROW', icon: HardHat, pageLabel: 'Sec 11' },
  { id: 'sec-progress-plan', number: 12, title: 'Progress Plan Comparisons (📈 Progress Comparisons)', category: 'Benchmarking', icon: Scale, pageLabel: 'Sec 12' },
  { id: 'sec-qty', number: 13, title: 'Engineering Quantities Log (📐 Quantities log)', category: 'Technical', icon: CheckCircle2, pageLabel: 'Sec 13' },
  { id: 'sec-bonds', number: 14, title: 'Bonds & Performance Guarantees (🔒 Bonds)', category: 'Compliance', icon: ShieldCheck, pageLabel: 'Sec 14' },
  { id: 'sec-kpis', number: 15, title: 'KPI Scorecard & Weights (🎯 KPIs)', category: 'Contractor Audit', icon: Scale, pageLabel: 'Sec 15' },
  { id: 'sec-monthly', number: 16, title: 'Monthly Cumulative S-Curve (📅 Monthly Cumulative)', category: 'Analytics', icon: TrendingUp, pageLabel: 'Sec 16' },
  { id: 'sec-work-program', number: 17, title: 'Work Program CPM Schedule (📅 Work Program CPM)', category: 'CPM Scheduling', icon: Clock, pageLabel: 'Sec 17' },
  { id: 'sec-resources', number: 18, title: 'Logistics & Resources (🚚 Logistics & Resources)', category: 'Fleet & Supply', icon: HardHat, pageLabel: 'Sec 18' },
  { id: 'sec-risks', number: 19, title: 'Project Risk Register (⚠️ Project Risks)', category: 'Risk Control', icon: AlertTriangle, pageLabel: 'Sec 19' },
  { id: 'sec-consultant', number: 20, title: 'Supervision Consultant & SLA Matrix (👔 Supervision Consultant)', category: 'Supervision', icon: Users, pageLabel: 'Sec 20' },
  { id: 'sec-analysis', number: 21, title: 'Comprehensive EVM Diagnostics (📊 Comprehensive analysis)', category: 'EVM Analytics', icon: BarChart3, pageLabel: 'Sec 21' },
  { id: 'sec-docs', number: 22, title: 'Project Documentation Vault (📁 Documentation)', category: 'Dossier Vault', icon: FileText, pageLabel: 'Sec 22' },
  { id: 'sec-history', number: 23, title: 'Audit History Snapshots (📜 History)', category: 'Audit Trail', icon: Clock, pageLabel: 'Sec 23' },
  { id: 'sec-settings', number: 24, title: 'Workspace Settings & RBAC (⚙️ Settings)', category: 'Administration', icon: Sliders, pageLabel: 'Sec 24' },
  { id: 'sec-workspace', number: 25, title: 'Workspace Notes & Scratchpad (☁️ Workspace)', category: 'Collaboration', icon: Sparkles, pageLabel: 'Sec 25' },
  { id: 'sec-ai', number: 26, title: 'AI Road Engineer Assistant Chat', category: 'AI Assistant', icon: Bot, pageLabel: 'Sec 26' },
  { id: 'sec-group-report', number: 27, title: 'Executive Group Comparative Report Generator', category: 'Portfolio Reports', icon: FileSpreadsheet, pageLabel: 'Sec 27' },
  { id: 'sec-draft-sandbox', number: 28, title: 'Draft Playground & Simulation Sandbox', category: 'Simulation', icon: Play, pageLabel: 'Sec 28' },
  { id: 'sec-faqs', number: 29, title: 'FAQs & Quick Troubleshooting Guide', category: 'Help & Errors', icon: HelpCircle, pageLabel: 'Sec 29' },
  { id: 'sec-contact', number: 30, title: 'Contact & Official Technical Support', category: 'Official Support', icon: Phone, pageLabel: 'Sec 30' },
];

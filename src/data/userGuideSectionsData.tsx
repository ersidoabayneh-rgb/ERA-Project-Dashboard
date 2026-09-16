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
  Phone,
  History
} from 'lucide-react';

export interface UserGuideSectionMeta {
  id: string;
  number: number;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  pageLabel: string;
  figLabel?: string;
}

export const USER_GUIDE_SECTIONS_META: UserGuideSectionMeta[] = [
  { id: 'sec-intro', number: 1, title: 'Introduction & Core Purpose of the ERA ERP System', category: 'Overview', icon: BookOpen, pageLabel: 'Page 3' },
  { id: 'sec-getting-started', number: 2, title: 'Getting Started: Authentication & Role-Based Access', category: 'Authentication', icon: Lock, pageLabel: 'Page 3-4' },
  { id: 'sec-portfolio', number: 3, title: 'Portfolio Overview & Active Contracts Selection', category: 'Portfolio', icon: FolderTree, pageLabel: 'Page 5-6', figLabel: 'Fig. 3.1' },
  { id: 'sec-dash', number: 4, title: 'Project Executive Dashboard (Gauges, Detail & KPI Gallery)', category: 'Executive', icon: BarChart3, pageLabel: 'Page 7-12', figLabel: 'Fig. 4.1-4.3' },
  { id: 'sec-financial-boq', number: 5, title: 'Financial Data, BOQ Divisions & IPC Tracker', category: 'Financials', icon: Landmark, pageLabel: 'Page 13-18', figLabel: 'Fig. 5.1-5.3' },
  { id: 'sec-issue-log', number: 6, title: 'Issue Log & Blocker Action Tracking', category: 'Claims & Issues', icon: AlertTriangle, pageLabel: 'Page 18-20', figLabel: 'Fig. 6.1' },
  { id: 'sec-linear', number: 7, title: 'Linear Diagram & Station Chainage Progress', category: 'Physical Progress', icon: Layers, pageLabel: 'Page 20-22', figLabel: 'Fig. 7.1' },
  { id: 'sec-row', number: 8, title: 'Utilities Relocation & Right-of-Way (ROW) Compensation', category: 'Site & ROW', icon: HardHat, pageLabel: 'Page 22-24', figLabel: 'Fig. 8.1' },
  { id: 'sec-progress-plan', number: 9, title: 'Progress Plan Mileage Comparisons (Km)', category: 'Benchmarking', icon: Scale, pageLabel: 'Page 24-26', figLabel: 'Fig. 9.1' },
  { id: 'sec-qty', number: 10, title: 'Engineering Quantities & Construction Conformance', category: 'Technical', icon: CheckCircle2, pageLabel: 'Page 26-28', figLabel: 'Fig. 10.1' },
  { id: 'sec-bonds', number: 11, title: 'Bonds & Performance Guarantees Audit', category: 'Compliance', icon: ShieldCheck, pageLabel: 'Page 28-30', figLabel: 'Fig. 11.1' },
  { id: 'sec-kpis', number: 12, title: 'ERA Contract Audit KPI Matrix', category: 'Audit Scorecard', icon: Scale, pageLabel: 'Page 30-32', figLabel: 'Fig. 12.1' },
  { id: 'sec-monthly', number: 13, title: 'S-Curve Analysis (Monthly Cumulative Progress)', category: 'Analytics', icon: TrendingUp, pageLabel: 'Page 32-34', figLabel: 'Fig. 13.1' },
  { id: 'sec-work-program', number: 14, title: 'Critical Path Method (CPM) Work Program', category: 'CPM Scheduling', icon: Clock, pageLabel: 'Page 34-36', figLabel: 'Fig. 14.1' },
  { id: 'sec-resources', number: 15, title: 'Logistics, Resource Mobilization & Heavy Equipment', category: 'Fleet & Supply', icon: HardHat, pageLabel: 'Page 36-38', figLabel: 'Fig. 15.1' },
  { id: 'sec-risks', number: 16, title: 'Project Risks & FIDIC Claims Management', category: 'Risk Control', icon: AlertTriangle, pageLabel: 'Page 38-40', figLabel: 'Fig. 16.1' },
  { id: 'sec-consultant', number: 17, title: 'Supervision Consultant Portal & SLA Matrix', category: 'Supervision', icon: Users, pageLabel: 'Page 40-42', figLabel: 'Fig. 17.1' },
  { id: 'sec-analysis', number: 18, title: 'Comprehensive Analysis & EVM Diagnostics', category: 'EVM Analytics', icon: BarChart3, pageLabel: 'Page 42-45', figLabel: 'Fig. 18.1-18.2' },
  { id: 'sec-docs', number: 19, title: 'Project Documentation Vault (Secure Dossier)', category: 'Dossier Vault', icon: FileText, pageLabel: 'Page 45-47', figLabel: 'Fig. 19.1' },
  { id: 'sec-history', number: 20, title: 'Audit History Snapshots & Activity Trail', category: 'Audit Trail', icon: History, pageLabel: 'Web App', figLabel: 'Fig. 20.1' },
  { id: 'sec-settings', number: 21, title: 'Workspace Settings, Multi-Device Telemetry & RBAC', category: 'Administration', icon: Sliders, pageLabel: 'Web App', figLabel: 'Fig. 21.1' },
  { id: 'sec-workspace', number: 22, title: 'Workspace Collaboration Notes & Scratchpad', category: 'Collaboration', icon: Sparkles, pageLabel: 'Web App', figLabel: 'Fig. 22.1' },
  { id: 'sec-ai', number: 23, title: 'AI Road Engineer Assistant Chat', category: 'AI Assistant', icon: Bot, pageLabel: 'Web App', figLabel: 'Fig. 23.1' },
  { id: 'sec-group-report', number: 24, title: 'Executive Group Comparative Portfolio Report', category: 'Portfolio Reports', icon: FileSpreadsheet, pageLabel: 'Web App', figLabel: 'Fig. 24.1' },
  { id: 'sec-draft-sandbox', number: 25, title: 'Draft Playground & Simulation Sandbox', category: 'Simulation', icon: Play, pageLabel: 'Web App', figLabel: 'Fig. 25.1' },
  { id: 'sec-faqs', number: 26, title: 'Troubleshooting Guide & Glossary of Key Terms', category: 'Help & Errors', icon: HelpCircle, pageLabel: 'Page 47-48' },
  { id: 'sec-contact', number: 27, title: 'Official Support Contacts & Document Control', category: 'Official Support', icon: Phone, pageLabel: 'Page 48-49' },
];

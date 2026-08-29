import React from 'react';
import ScreenMockup from './ScreenMockup';
import { 
  ShieldCheck, 
  BookOpen, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { USER_GUIDE_SECTIONS_META } from '../data/userGuideSectionsData';

interface UserGuideSectionsProps {
  onScrollToSection: (sectionId: string) => void;
  onDownloadPdf?: () => void;
}

export default function UserGuideSections({ onScrollToSection, onDownloadPdf }: UserGuideSectionsProps) {
  return (
    <div className="space-y-12">

      {/* =========================================================================
          SECTION 1: TITLE AND INTRODUCTION
      ========================================================================= */}
      <section id="sec-intro" className="space-y-6 scroll-mt-20">
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-2xs font-extrabold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Federal Democratic Republic of Ethiopia • Ethiopian Roads Administration
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              Ethiopian Roads Administration ERP
            </h1>
            <p className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide">
              Official Comprehensive Website User Guide Manual (v1.0)
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed font-medium">
            <p className="font-bold text-white text-sm">
              Welcome to the Ethiopian Roads Administration Construction Project Management ERP!
            </p>
            <p>
              This enterprise platform provides complete, real-time oversight of national highway contracts from tender award to final handover. The system integrates physical chainage tracking, financial billing (BOQ and IPC certificates), Critical Path Method (CPM) scheduling, contractor KPI audit scoring, risk management, and multi-tier approval governance.
            </p>
            <p>
              This guide gives you step-by-step instructions for all features across all 30 pages and modules of the system.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800/80 text-2xs">
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Target Role</span>
              <span className="font-extrabold text-white text-xs">All System Roles</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Client / Employer</span>
              <span className="font-bold text-slate-200">Ethiopian Roads Administration</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Total System Modules</span>
              <span className="font-bold text-emerald-400">30 Comprehensive Sections</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Official Support</span>
              <span className="font-bold text-amber-300">support.erp@era.gov.et</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: TABLE OF CONTENTS
      ========================================================================= */}
      <section id="sec-toc" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">2.0</span>
          <span>Table of Contents</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Table of Contents & Page Index</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Click any section link below to jump directly to its step-by-step instructions and screen preview:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {USER_GUIDE_SECTIONS_META.map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => onScrollToSection(sec.id)}
                className="p-3 bg-slate-50 dark:bg-slate-950 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Section {sec.number} • {sec.category}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {sec.title}
                    </span>
                  </div>
                </div>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 ml-2">
                  {sec.pageLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: GETTING STARTED & LOGIN ACCESS
      ========================================================================= */}
      <section id="sec-getting-started" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">3.0</span>
          <span>Getting Started</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Getting Started & Signing In</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Follow these clear steps to sign in, verify your credentials, and understand the basic layout of the application.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Login & Security Portal" 
          url="https://era-erp.gov.et/auth/login" 
          badge="Enterprise Authentication"
          badgeColor="bg-blue-600"
        >
          <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-center space-y-1">
              <span className="text-2xs font-extrabold text-blue-600 uppercase tracking-wider">ERA Central Authentication</span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Sign In to Your Account</h4>
            </div>
            <div className="space-y-2">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-2xs">
                <span className="text-slate-400 block">Username or Email</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ErsidoAbayneh@gmail.com</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-2xs">
                <span className="text-slate-400 block">Role Clearance</span>
                <span className="font-bold text-blue-600">Directorate Admin (Southern Region)</span>
              </div>
              <div className="p-2 bg-blue-600 text-white rounded-lg text-center font-bold text-2xs cursor-pointer">
                Sign In to ERA ERP Dashboard
              </div>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-800 dark:text-amber-300">
              🔒 <strong>Two-Factor & IP Security:</strong> Self-registered users require Administrator approval before accessing project contracts.
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> your assigned username or email address into the username field on the login screen.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> your secret account password into the password field.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>Sign In</strong> button to authenticate.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>New User Registration:</strong> If you do not have an account, <strong>Click</strong> <strong>Create an Account</strong>, select your role (e.g. <em>Directorate Admin</em>, <em>PMO Admin</em>, or <em>Editor</em>), and click <strong>Submit Registration</strong>. Your account will enter pending approval status until approved by a Master Administrator.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Basic Layout Overview:</strong> Once logged in, the application features three main areas:
                <br />1) <strong>Top Header Bar:</strong> Contains the current project name, user profile, <strong>Save to Database</strong> button, and logout control.
                <br />2) <strong>Project Summary Card:</strong> Displays key contract milestones, completion dates, and ETB/USD values.
                <br />3) <strong>Navigation Tabs Bar:</strong> An icon ribbon across the top that lets you switch between all project modules with one click.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: ACTIVE CONTRACTS PORTFOLIO PAGE
      ========================================================================= */}
      <section id="sec-portfolio" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">4.0</span>
          <span>Portfolio Management</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Active Contracts Portfolio Page</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The central landing page where users view all highway projects, filter by regional directorate, and generate portfolio-wide executive reports.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Active Projects Portfolio & Directorate Filters" 
          url="https://era-erp.gov.et/projects" 
          badge="Multi-Project Portfolio"
          badgeColor="bg-emerald-600"
        >
          <div className="space-y-3">
            {/* Search & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <div className="flex items-center gap-2 text-2xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">🔍 Search:</span>
                <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-slate-400">
                  "Daye-Girja" or "Tisiju"
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-2xs font-bold">
                  Directorate: Southern ▾
                </span>
                <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-2xs font-bold">
                  📄 Group Reports
                </span>
                <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-2xs font-bold">
                  📖 User Manual (PDF)
                </span>
              </div>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-blue-500 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-blue-600 dark:text-blue-400">Daye-Girja-Melka Desta & Mejo Spur</span>
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[9px] font-bold">
                    LAGGING (40.73%)
                  </span>
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Contractor: China Tisiju Civil Engineering Group</div>
                  <div>Contract Value: Br. 1,627,871,767.88 ETB (72.16M Variation)</div>
                  <div>Elapsed Time: 100.00% | Section Length: 65.00 Km + 8.80 Km Spur</div>
                </div>
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-center text-2xs font-bold">
                  Click Card to Open Project Workspace →
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Modjo - Hawassa Expressway Phase II</span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold">
                    ON SCHEDULE (82.40%)
                  </span>
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Contractor: Shandong Highway Engineering Group</div>
                  <div>Contract Value: Br. 4,250,000,000.00 ETB</div>
                  <div>Elapsed Time: 78.10% | Section Length: 92.00 Km Expressway</div>
                </div>
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-center text-2xs font-bold">
                  Click Card to Open Project Workspace →
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> your region using the <strong>Directorate</strong> dropdown (e.g., Southern, Northern, Eastern, Western, Central, or Expressway).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> keywords in the <strong>Search</strong> box to filter by project name, contractor firm, or contract code.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the health status badge on each project card: Green for <strong>ON SCHEDULE</strong>, Yellow for <strong>CAUTION</strong>, and Red for <strong>CRITICAL DELAY</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> on any project card to open its full dashboard workspace.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Project</strong> in the top corner to create a new road project dossier.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>📄 Group Reports</strong> to compile multi-project comparative executive summaries and audit PDFs.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: PROJECT HEADER & MASTER DOSSIER
      ========================================================================= */}
      <section id="sec-dossier" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">5.0</span>
          <span>Core Contract Dossier</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Header & Master Dossier</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The master contract dossier captures legal stakeholders, contract values, approved extensions of time (EOT), and the two-tier approval badge.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Project Header & Contract Details Dossier" 
          url="https://era-erp.gov.et/project/daye-girja/dossier" 
          badge="Master Contract Dossier"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <span className="text-2xs font-bold text-blue-600 uppercase">Contract Classification</span>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Daye-Girja-Melka Desta & Meleya-Mejo Spur Road Project
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-2xs font-bold">
                  ✓ Database Synchronized
                </span>
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-2xs font-bold">
                  Save to Database
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block font-bold">Original Amount</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">1,555,708,167.88 ETB</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block font-bold">Revised Amount</span>
                <span className="font-extrabold text-emerald-600">1,627,871,767.88 ETB</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block font-bold">Commencement Date</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">Dec 29, 2020</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block font-bold">Revised Completion Date</span>
                <span className="font-extrabold text-amber-600">Dec 28, 2025</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>SHOW DETAILS</strong> in the project header banner to expand the legal contract dossier.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the pencil edit icon to modify contract figures, contractor names, or consultant details.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the Approved Extension of Time (EOT in calendar days). The system automatically computes the <strong>Revised Completion Date</strong> using the formula: <em>Commencement Date + Original Duration + Approved EOT + Interim EOT</em>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> the contract delivery framework: <strong>Design-Bid-Build (DBB)</strong> or <strong>Design-Build (DB)</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to commit changes. If your account role requires approval, an automated approval ticket is routed to your designated Project Approver.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: EXECUTIVE DASHBOARD
      ========================================================================= */}
      <section id="sec-dash" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">6.0</span>
          <span>Executive Overview</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Executive Dashboard (📊 Dashboard)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The command center displaying key performance indicators, progress gauges, overdue payments, and field photo galleries.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Executive Dashboard Command Center" 
          url="https://era-erp.gov.et/project/daye-girja/dash" 
          badge="Real-Time KPIs"
          badgeColor="bg-amber-600"
        >
          <div className="space-y-3">
            {/* Warning Banner */}
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between text-2xs text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">CRITICAL WARNING: Physical Progress lag of 35.92% exceeds maximum allowable threshold!</span>
              </div>
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold">Action Required</span>
            </div>

            {/* 4 Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Physical Progress</span>
                <span className="text-sm font-black text-rose-600">40.73%</span>
                <span className="text-[10px] text-slate-400 block">Actual site completion</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Elapsed Contract Time</span>
                <span className="text-sm font-black text-amber-600">65.00%</span>
                <span className="text-[10px] text-slate-400 block">1,186 of 1,825 days</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Schedule Index (SPI)</span>
                <span className="text-sm font-black text-rose-600">0.63</span>
                <span className="text-[10px] text-rose-500 block">Significant delay</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Cost Index (CPI)</span>
                <span className="text-sm font-black text-emerald-600">1.00</span>
                <span className="text-[10px] text-emerald-500 block">Budget efficient</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the top <strong>Critical Alerts Banner</strong> for immediate warnings such as expiring bank guarantees or overdue IPC balances.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> the <strong>Physical Progress vs Elapsed Time</strong> gauge to see the progress deficit percentage.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the <strong>EVM Quick Tiles</strong>: CPI (Cost Performance Index) and SPI (Schedule Performance Index). Values under 1.0 indicate performance lag.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Check</strong> the <strong>Matured Overdue Payments</strong> box to audit certified certificates that have exceeded 56 days without payment.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Browse</strong> the <strong>Field Inspection Photo Gallery</strong>: <strong>Click</strong> any photo to zoom in, view station chainage coordinates, inspection dates, and captions. <strong>Click</strong> <strong>+ Upload Field Photo</strong> to add site inspection images.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: FINANCIAL DATA & BOQ SERIES
      ========================================================================= */}
      <section id="sec-financial-boq" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">7.0</span>
          <span>Financial Management</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Financial Data Management & BOQ Series (📋 Financial Data)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Manages Bill of Quantities (BOQ) division series (Code 1000 through Code 11000), variation orders, and cumulative expenditure.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Bill of Quantities (BOQ) Series Ledger" 
          url="https://era-erp.gov.et/project/daye-girja/financial-boq" 
          badge="BOQ Division Series"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="grid grid-cols-5 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>BOQ Code</span>
              <span className="col-span-2">Division Name</span>
              <span>Contract Sum (ETB)</span>
              <span>Executed to Date</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono font-bold text-blue-600">Series 1000</span>
              <span className="col-span-2 font-bold">General & Facilities</span>
              <span>120,500,000.00</span>
              <span className="text-emerald-600 font-bold">98,200,000.00 (81.5%)</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono font-bold text-blue-600">Series 4000</span>
              <span className="col-span-2 font-bold">Earthworks & Excavation</span>
              <span>380,400,000.00</span>
              <span className="text-emerald-600 font-bold">245,600,000.00 (64.6%)</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono font-bold text-blue-600">Series 6000</span>
              <span className="col-span-2 font-bold">Bituminous Surfacing</span>
              <span>490,200,000.00</span>
              <span className="text-amber-600 font-bold">120,400,000.00 (24.6%)</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📋 Financial Data</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> into any BOQ Division row (e.g. <em>Series 1000 General</em>, <em>Series 4000 Earthworks</em>, or <em>Series 6000 Bituminous Surfacing</em>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> certified executed figures directly into the <strong>To-Date Executed</strong> column.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the auto-calculated financial metrics: Net Base Amount, 10% Contingency additions, and Overall Execution %.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Item Code</strong> to append custom bill items or special provisional sums.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to synchronize financial progress.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: IPC CERTIFICATES & BILLING ANALYTICS
      ========================================================================= */}
      <section id="sec-ipc-billing" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">8.0</span>
          <span>Billing Analytics</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">IPC Billing Certificates & Payment Tracker (📋 Financial Data)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Tracks Interim Payment Certificates (IPCs), 10% retention money deductions, advance payment recovery amortization, and FIDIC Clause 13.8 price adjustments.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Interim Payment Certificate (IPC) Ledger" 
          url="https://era-erp.gov.et/project/daye-girja/ipc-ledger" 
          badge="IPC Certificate Ledger"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">Total Certified IPC Statements: 43</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded text-2xs font-bold">+ Add IPC Statement</span>
            </div>
            <div className="grid grid-cols-6 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>IPC No.</span>
              <span>Billing Period</span>
              <span>Gross Certified</span>
              <span>Retention (10%)</span>
              <span>Net Certified</span>
              <span>Status</span>
            </div>
            <div className="grid grid-cols-6 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-blue-600">IPC No. 42</span>
              <span>Oct 2025</span>
              <span>Br. 42,500,000</span>
              <span>Br. 4,250,000</span>
              <span className="font-bold text-emerald-600">Br. 38,250,000</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-center">PAID</span>
            </div>
            <div className="grid grid-cols-6 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-blue-600">IPC No. 43</span>
              <span>Nov 2025</span>
              <span>Br. 51,200,000</span>
              <span>Br. 5,120,000</span>
              <span className="font-bold text-rose-600">Br. 46,080,000</span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-center">UNPAID (&gt;56d)</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>IPC Certificates</strong> tab within Financial Data.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add IPC Statement</strong> to register a new payment certificate.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the Certificate Number, Billing Period, Gross Certified Amount, Price Adjustment sum, Advance Payment recovery deduction, and 10% Retention deduction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> the Payment Status: <strong>Paid</strong>, <strong>Unpaid</strong>, or <strong>Draft</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> payment maturity: Unpaid certificates exceeding 56 days are automatically highlighted with interest liability notices under FIDIC Clause 14.8.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to commit the new certificate.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: ISSUE & CLAIMS LOG
      ========================================================================= */}
      <section id="sec-issue-log" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">9.0</span>
          <span>Claims & Issues</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Issue & Claims Log (🚩 Issue Log)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Captures formal contractor claim notices under FIDIC Clause 20.1, delay events, site bottlenecks, Right of Way impediments, and engineer determinations.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Issue Log & Claims Determination Tracker" 
          url="https://era-erp.gov.et/project/daye-girja/issue-log" 
          badge="Claims & Delay Events"
          badgeColor="bg-rose-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">Active Contract Claims: 4 Registered</span>
              <span className="px-2.5 py-1 bg-rose-600 text-white rounded text-2xs font-bold">+ Register New Claim</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-900 dark:text-white">CLAIM-01: Delay in Electric Pole Relocation (Km 14+200 - 18+500)</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">CRITICAL SEVERITY</span>
              </div>
              <div className="text-slate-500">Category: Right of Way | Claimed EOT: 120 Days | Claimed Cost: Br. 42,000,000.00 ETB</div>
              <div className="flex items-center gap-2 pt-1 font-bold text-[10px]">
                <span className="text-blue-600">Status: Consultant Review</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Responsible: ERA ROW Dept / EEU</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>🚩 Issue Log</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Register New Claim</strong> to log an issue or contractual delay notice.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the claim reference title, detailed engineering narrative, and exact chainage stations impacted.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> the Category (e.g. <em>Right of Way</em>, <em>Geological</em>, <em>Utility Obstruction</em>, or <em>Design Revision</em>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> Severity Level: <strong>CRITICAL</strong>, <strong>HIGH</strong>, <strong>MEDIUM</strong>, or <strong>LOW</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the claimed Extension of Time (EOT in calendar days) and claimed financial cost in Birr.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Issue</strong> to record the claim into the project register.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: LINEAR ELEVATION DIAGRAM
      ========================================================================= */}
      <section id="sec-linear" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">10.0</span>
          <span>Physical Progress</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Linear Progress & Elevation Diagram (📏 Linear diagram)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Station-by-station chainage elevation mapping for road layers across both Main Road (56.20 Km) and Spur Road (8.80 Km) sections.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Linear Road Layer Elevation Diagram" 
          url="https://era-erp.gov.et/project/daye-girja/linear" 
          badge="Chainage Layer Progress"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold">Main Road (56.2 Km)</span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold">Spur Road (8.8 Km)</span>
              </div>
              <span className="text-slate-400">Capping Layer: ENABLED</span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <div className="flex justify-between font-bold">
                  <span>1. Earthwork / Subgrade</span>
                  <span className="text-emerald-600">56.20 Km / 56.20 Km (100%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-500 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold">
                  <span>2. Granular Sub-base</span>
                  <span className="text-blue-600">38.40 Km / 56.20 Km (68.3%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[68%] h-full bg-blue-600 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold">
                  <span>3. Asphalt Concrete Surfacing</span>
                  <span className="text-amber-600">22.80 Km / 56.20 Km (40.5%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[40%] h-full bg-amber-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📏 Linear diagram</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> the road alignment: <strong>Main Road</strong> or <strong>Spur Road</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Toggle</strong> the <strong>Capping Layers</strong> switch if capping is required in the design.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Chainage Interval</strong> next to any pavement layer (Subgrade, Capping, Sub-base, Base Course, Asphalt Surfacing, or Structures).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the <strong>From Station</strong> (e.g. <em>Km 0+000</em>) and <strong>To Station</strong> (e.g. <em>Km 24+500</em>). The system automatically calculates Net Length in kilometers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Hover</strong> over the interactive diagram to view station-specific layer coordinates.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to synchronize linear completion with dashboard progress gauges.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: UTILITIES & RIGHT OF WAY (ROW)
      ========================================================================= */}
      <section id="sec-row" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">11.0</span>
          <span>Site & Right of Way</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Utilities & Right of Way (ROW) (🛣️ Utilities & ROW)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Tracks the 11-parameter relocation summary, Project Affected Persons (PAP) compensation disbursement, and public utility clearances (electric poles, telecom lines, water pipes).
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Right-of-Way & Utility Relocation Audit" 
          url="https://era-erp.gov.et/project/daye-girja/row" 
          badge="ROW & PAP Ledger"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block">Total Corridor</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">65.00 Km</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block">Obstruction Free</span>
                <span className="font-extrabold text-emerald-600">53.23 Km (81.9%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <span className="text-slate-400 block">Unpaid Liability</span>
                <span className="font-extrabold text-rose-600">Br. 100,993.25 M</span>
              </div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded text-slate-700 dark:text-slate-300">
              ⚡ <strong>Electric Poles Handover:</strong> 466 Poles Requested | 298 Relocated | 168 Pending Relocation
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>🛣️ Utilities & ROW</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the <strong>11-Parameter Relocation Table</strong>: Total Length, Requested Corridor, Compensation Paid, and Pending Sections.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add PAP Record</strong> to record property valuation, landowner name, Kebele location, and compensation disbursement status.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Update</strong> utility counts: enter counts for relocated electric poles, telecom fiber cables, and water pipelines.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to commit updated right-of-way status.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 12: PROGRESS PLAN COMPARISONS
      ========================================================================= */}
      <section id="sec-progress-plan" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">12.0</span>
          <span>Benchmarking</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Progress Plan Comparisons (📈 Progress Comparisons)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Compares 1) Contractor Baseline Schedule, 2) ERA Internal Milestone Target, and 3) Actual Road Kilometers Completed across monthly and Ethiopian Fiscal Year (EFY) horizons.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Progress Plan Mileage Comparisons (Km) & Elapsed Horizon Records" 
          url="https://era-erp.gov.et/project/daye-girja/progress-plan" 
          badge="Plan vs Target vs Actual"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Mileage Horizon: Feb 2026 Monthly / EFY 2018</span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px]">Archive Elapsed Month</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>Schedule Tier</span>
              <span>Monthly Plan</span>
              <span>Quarterly Target</span>
              <span>Cumulative Km</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-blue-600">Contractor Baseline Program</span>
              <span>2.75 Km</span>
              <span>5.12 Km</span>
              <span className="font-bold text-blue-600">65.00 Km</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-purple-600">ERA Internal Target Plan</span>
              <span>1.50 Km</span>
              <span>3.00 Km</span>
              <span className="font-bold text-purple-600">34.50 Km</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-emerald-600">Actual Road Completed TODATE</span>
              <span className="text-emerald-600 font-bold">2.28 Km</span>
              <span className="text-emerald-600 font-bold">3.73 Km</span>
              <span className="text-emerald-600 font-bold">27.29 Km</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📈 Progress Comparisons</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Filter</strong> by time period: Monthly, Quarterly, or Ethiopian Fiscal Year (EFY).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> variance figures: compares contractor planned targets against actual site execution.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Keep Elapsed Record</strong> to snapshot the current month's accomplishments into the permanent audit ledger.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 13: ENGINEERING QUANTITIES LOG
      ========================================================================= */}
      <section id="sec-qty" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">13.0</span>
          <span>Technical Quantities</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Engineering Quantities Log (📐 Quantities log)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Correlates contract design volumes with scheduled plans and actual contractor execution with automated conformance percentage scoring.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Engineering Quantities & Construction Conformance Log" 
          url="https://era-erp.gov.et/project/daye-girja/qty" 
          badge="Quantities Conformance"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="grid grid-cols-5 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span className="col-span-2">Quantified Pay Item</span>
              <span>Design Qty</span>
              <span>Executed to Date</span>
              <span>% Conformance</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">Site Clearing (Ha)</span>
              <span>2,222 Ha</span>
              <span className="font-bold text-emerald-600">345,353 Ha</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-center">103.63% ✓</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">Common Excavation (M3)</span>
              <span>2,321,847 M3</span>
              <span className="font-bold text-emerald-600">2,493,000 M3</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-center">95.59% ✓</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">Crushed Base Course (Km)</span>
              <span>65.00 Km</span>
              <span className="font-bold text-amber-600">21.75 Km</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-center">56.39% ⚠</span>
            </div>
            <div className="grid grid-cols-5 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">Asphalt Concrete Surfacing (Km)</span>
              <span>65.00 Km</span>
              <span className="font-bold text-amber-600">20.75 Km</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-center">60.78% ⚠</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📐 Quantities log</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> certified field measurements into the <strong>To-Date Contractor Executed</strong> column for each pay item (e.g. Site Clearing, Common Excavation, Borrow Fill, Sub-base, Basecourse, Asphalt Surfacing).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the color-coded <strong>% Conformance</strong> badge: Green (&ge;100%), Yellow (85–99%), Red (&lt;85%).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Pay Item</strong> to append custom engineering items.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to update quantity records.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 14: BONDS & PERFORMANCE GUARANTEES
      ========================================================================= */}
      <section id="sec-bonds" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">14.0</span>
          <span>Compliance & Securities</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Bonds & Performance Guarantees (🔒 Bonds)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Manages all bank guarantees required under FIDIC conditions: Performance Guarantees, Advance Payment Bonds, and Retention Securities, with automated 45-day expiration warnings.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Bonds & Performance Guarantees Audit Register" 
          url="https://era-erp.gov.et/project/daye-girja/bonds" 
          badge="Guarantees & Securities"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Security Securities Register (3 Guarantees Logged)</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px]">+ Add Guarantee</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>1. Performance Guarantee (Commercial Bank of Ethiopia)</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px]">VALID (Exp: 12/31/2027)</span>
              </div>
              <div className="text-slate-500">Value: ETB 155,570,816.79 | USD $1,350,000.00</div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>2. Advance Payment Guarantee (Awash Bank S.C.)</span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px]">FULLY AMORTIZED / RETURNED</span>
              </div>
              <div className="text-slate-500">Value: ETB 242,100,998.82 | USD $2,100,000.00</div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>3. Retention Money Guarantee (Nib International Bank)</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px]">VALID (Exp: 01/15/2027)</span>
              </div>
              <div className="text-slate-500">Value: ETB 50,000,000.00 | USD $435,000.00</div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>🔒 Bonds</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> active securities, issuing banks, values in ETB/USD, and expiry dates.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> the <strong>Days Remaining</strong> countdown: bonds expiring within 45 days automatically trigger a red warning badge on the dashboard.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Guarantee</strong> or click edit on an existing guarantee.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> Guarantee Status: <strong>Active & Valid</strong>, <strong>Amortized / Recovered</strong>, or <strong>Under Renewal Extension</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Guarantee Details</strong> to commit.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 15: KPI SCORECARD & WEIGHT ALLOCATIONS
      ========================================================================= */}
      <section id="sec-kpis" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">15.0</span>
          <span>Contractor Audit</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">KPI Scorecard & Weights (🎯 KPIs)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Implements the official ERA Contract Audit KPI Matrix across 12 categories with automated 100% total weight sum verification.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="ERA Official Contractor Audit KPI Matrix & Weight Allocations" 
          url="https://era-erp.gov.et/project/daye-girja/kpis" 
          badge="12 Audit Categories"
          badgeColor="bg-purple-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Grade Profile: G1 Major Contractor</span>
              <span className="text-purple-600">Composite Score: 63.74% (Grade C - At Risk)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400 font-bold">Physical Progress</span>
                <span className="text-sm font-extrabold text-blue-600">84.93% (Weight 20%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400 font-bold">Equipment Mobilization</span>
                <span className="text-sm font-extrabold text-emerald-600">75.00% (Weight 15%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400 font-bold">Key Personnel Presence</span>
                <span className="text-sm font-extrabold text-purple-600">90.00% (Weight 10%)</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>🎯 KPIs</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> Contractor Grade Profile (e.g. <strong>G1 Contractor</strong>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> custom category weightings. Ensure the total sum equals exactly 100%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> composite sub-scores and the final weighted Goal Score.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save KPI Allocation</strong> to commit audit scores.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 16: MONTHLY CUMULATIVE S-CURVE
      ========================================================================= */}
      <section id="sec-monthly" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">16.0</span>
          <span>Analytics & S-Curve</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Monthly Cumulative S-Curve Progress (📅 Monthly Cumulative)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Renders cumulative Planned vs Actual S-Curve graphs, monthly bar charts, and spreadsheet-style progress entry tables with Excel export.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Monthly Cumulative Planned vs Actual S-Curve Graph & Data Matrix" 
          url="https://era-erp.gov.et/project/daye-girja/monthly" 
          badge="S-Curve Analytics"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-blue-600">📈 S-Curve Visualizer (Original Plan vs Revised vs Actual)</span>
              <span className="px-2 py-1 bg-emerald-600 text-white rounded font-bold">Export to Excel</span>
            </div>
            <div className="h-16 bg-slate-50 dark:bg-slate-950 rounded flex items-center justify-center font-bold text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800">
              [ Dynamic Cumulative S-Curve & Monthly Accomplishment Chart ]
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📅 Monthly Cumulative</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> the S-Curve graph: Original Plan (Blue), Revised Plan (Green), and Actual Progress (Red).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> monthly figures: Original Plan %, Revised Plan %, and To-Date Actual % in the table.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Export to Excel</strong> to download the spreadsheet data.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to synchronize S-Curve points with the dashboard.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 17: WORK PROGRAM CPM SCHEDULE
      ========================================================================= */}
      <section id="sec-work-program" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">17.0</span>
          <span>CPM Scheduling</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Work Program CPM Schedule (📅 Work Program CPM)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Enables Critical Path Method (CPM) scheduling, interactive Gantt charts, activity dependencies (predecessors), total float computation, and CSV imports from Primavera P6.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Work Program Critical Path Method (CPM) Schedule & Gantt Diagram" 
          url="https://era-erp.gov.et/project/daye-girja/work-program" 
          badge="CPM Critical Path"
          badgeColor="bg-red-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Schedule State: 8 Activities Loaded (7 Critical)</span>
              <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px]">Import Primavera CSV</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>Activity Name</span>
              <span>Duration</span>
              <span>Float</span>
              <span>Predecessors</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800 text-red-600 font-bold">
              <span>Site Clearing & Grubbing</span>
              <span>120 Days</span>
              <span>0 Days (Critical)</span>
              <span>None</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800 text-red-600 font-bold">
              <span>Subbase Construction</span>
              <span>180 Days</span>
              <span>0 Days (Critical)</span>
              <span>ACT-01</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📅 Work Program CPM</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the interactive Gantt chart: Red bars indicate zero-float Critical Path tasks.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Add Task</strong> to insert WBS activities, durations, and predecessor links.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Import Schedule (CSV)</strong> to upload schedules from Primavera P6 or Microsoft Project. CSV must include: <code>ID, Name, Duration, Predecessors, Lag, SequenceType</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Schedule</strong> to recalculate early/late dates and critical paths.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 18: LOGISTICS & RESOURCE MOBILIZATION
      ========================================================================= */}
      <section id="sec-resources" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">18.0</span>
          <span>Fleet & Supply</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Logistics & Resources (🚚 Logistics & Resources)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Audits contractor heavy equipment availability, machinery deficits, key personnel presence on site, and material stockpile buffer days.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Heavy Equipment Fleet, Personnel & Material Buffer Audit" 
          url="https://era-erp.gov.et/project/daye-girja/resources" 
          badge="Resource Fleet Audit"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="grid grid-cols-4 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>Machinery Type</span>
              <span>Contract Required</span>
              <span>Site Available</span>
              <span>Mobilization Deficit</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold">Asphalt Paver (Vögele)</span>
              <span>3 Units</span>
              <span className="font-bold text-emerald-600">2 Units</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">-1 Deficit ⚠</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold">Heavy Motor Grader</span>
              <span>10 Units</span>
              <span className="font-bold text-emerald-600">9 Units</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">-1 Deficit</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>🚚 Logistics & Resources</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> equipment fleets (Pavers, Graders, Excavators, Dump Trucks, Crushers): compares Required vs Available vs Deficit.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Check</strong> material stockpiles: aggregates, bitumen, cement, fuel, and rebar buffer days.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> key personnel directory (Project Manager, Resident Engineer, Highway Engineer).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> after updating mobilized resources.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 19: PROJECT RISK REGISTER
      ========================================================================= */}
      <section id="sec-risks" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">19.0</span>
          <span>Risk Control</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Risk Register (⚠️ Project Risks)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Quantitative hazard identification with 5x5 Probability/Impact risk heatmap, exposure index computation, and proactive mitigation plans.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Quantitative Risk Register & 5x5 Matrix Heatmap" 
          url="https://era-erp.gov.et/project/daye-girja/risks" 
          badge="Risk Exposure Index: 13.50"
          badgeColor="bg-red-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Active Threats Logged: 6 Critical & Moderate Risks</span>
              <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px]">+ Register New Risk</span>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-lg space-y-1 border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between font-bold text-red-700 dark:text-red-300">
                <span>R-01: Delay in Right-of-Way (ROW) Land Clearance</span>
                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px]">EXPOSURE 20 (HIGH)</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">Mitigation: Activate regional ERA ROW taskforce & fast-track compensation payments.</div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>⚠️ Project Risks</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> the <strong>5x5 Risk Heatmap</strong>: Low (1–7), Moderate (8–15), and Critical (16–25).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>+ Register New Risk</strong> to log a threat.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> Probability (1–5) and Impact (1–5).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> the mitigation strategy and designate a Risk Owner.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save to Database</strong> to update risk exposure.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 20: SUPERVISION CONSULTANT & SLA MATRIX
      ========================================================================= */}
      <section id="sec-consultant" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">20.0</span>
          <span>Supervision Oversight</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Supervision Consultant & SLA Matrix (👔 Supervision Consultant)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Manages the supervising engineering consultant contract, consultant fee invoices, Resident Engineer personnel directory, and the RFI/Submittal SLA Response Matrix with custom criteria and weightage controls.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Supervision Consultant & SLA Response Performance Matrix" 
          url="https://era-erp.gov.et/project/daye-girja/consultant" 
          badge="Consultant SLA Matrix"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Firm: LEA Associates South Asia JV</span>
              <span className="text-emerald-600">SLA Response Rating: 88.5% (High Compliance)</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
              <div className="flex justify-between font-bold">
                <span>RFI Response Time (&lt;7 Days Target)</span>
                <span className="text-blue-600">Avg 4.8 Days (Weight 25%)</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>IPC Certification Turnaround (&lt;14 Days)</span>
                <span className="text-blue-600">Avg 11.2 Days (Weight 30%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Criteria & Weights: 100% Balanced</span>
              <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold">Edit Criteria & Weights</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>👔 Supervision Consultant</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> consultant firm details, joint venture associations, and total fees in ETB and USD.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Audit</strong> the <strong>Consultant Fee Invoices Ledger</strong>: view submitted fee claims, withholding deductions, and payment certifications.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Manage</strong> the <strong>RFI & Submittal SLA Response Matrix</strong>:
                <br />1) <strong>Click</strong> <strong>Criteria & Weights</strong> to open the SLA configuration panel.
                <br />2) <strong>Click</strong> <strong>+ Add New Criteria</strong> to introduce customized review metrics (e.g. Design Check Turnaround).
                <br />3) <strong>Adjust</strong> weight percentage sliders for each criterion ensuring the total equals 100%.
                <br />4) <strong>Click</strong> the trash icon next to any obsolete metric to remove it.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Consultant Data</strong> to commit changes.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 21: COMPREHENSIVE ANALYSIS & EVM DIAGNOSTICS
      ========================================================================= */}
      <section id="sec-analysis" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">21.0</span>
          <span>EVM Analytics</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Comprehensive Analysis & EVM Diagnostics (📊 Comprehensive analysis)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Comprehensive Earned Value Management (EVM) computations: BAC, PV, EV, AC, Cost Variance (CV), Schedule Variance (SV), CPI, SPI, EAC, ETC, VAC, TCPI, and dual schedule vs linear progress audits.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Full Earned Value Management (EVM) Health & Performance Indices" 
          url="https://era-erp.gov.et/project/daye-girja/analysis" 
          badge="EVM Computations"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Cost Performance (CPI)</span>
                <span className="text-sm font-black text-emerald-600">1.213 (UNDER BUDGET)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Schedule Index (SPI)</span>
                <span className="text-sm font-black text-red-600">0.637 (SCHEDULE DELAY)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Cost Variance (CV)</span>
                <span className="text-sm font-black text-emerald-600">+ETB 173,803,130.00</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Estimate at Completion</span>
                <span className="text-sm font-black text-blue-600">ETB 1,282,529,403.80</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📊 Comprehensive analysis</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the EVM computations table: Budget at Completion (BAC), Planned Value (PV), Earned Value (EV), and Actual Cost (AC).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> efficiency indices: CPI &lt; 1.0 indicates cost overrun; SPI &lt; 1.0 indicates schedule delay.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> Estimate at Completion (EAC) and projected completion dates.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Inspect</strong> the <strong>Dual Schedule Audit</strong>: cross-references CPM schedule network logic against physical chainage pavement completion.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 22: PROJECT DOCUMENTATION VAULT
      ========================================================================= */}
      <section id="sec-docs" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">22.0</span>
          <span>Document Control</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Documentation Vault (📁 Documentation)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Secure central repository for contract agreements, engineering drawings, monthly progress reports, quality test certificates, and variation orders.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Project Central Document Control Repository & Vault" 
          url="https://era-erp.gov.et/project/daye-girja/documentation" 
          badge="Document Vault"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Categories: Contract & Legal, Drawings, Monthly Reports, Variation Orders</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded font-bold">+ Upload Document</span>
            </div>
            <div className="p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center text-slate-400 font-bold">
              Drag & Drop Project PDF, AutoCAD, Excel, or Zip Files Here
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📁 Documentation</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Browse</strong> files by category (Contract & Legal, Drawings, Monthly Reports, Variation Orders).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Upload New Document</strong> to attach files (PDF, Word, Excel, Images, ZIP).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the download icon to retrieve any stored document.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 23: AUDIT HISTORY SNAPSHOTS
      ========================================================================= */}
      <section id="sec-history" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">23.0</span>
          <span>Audit Trail</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Audit History Snapshots (📜 History)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Maintains an immutable ledger of project version snapshots, audit logs, rollback restore capabilities, and automated vigilance alerts.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Immutable Audit Version Snapshots & Point-In-Time Restoration" 
          url="https://era-erp.gov.et/project/daye-girja/history" 
          badge="Audit Trail Ledger"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Saved Milestones: 4 Audit Snapshots Stored</span>
              <span className="px-2.5 py-1 bg-indigo-600 text-white rounded font-bold">+ Save Milestone Snapshot</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded flex items-center justify-between">
              <div>
                <span className="font-bold block text-slate-800 dark:text-slate-200">Snapshot v2.4 (Pre-Revision Baseline)</span>
                <span className="text-slate-400">By Ersido Abayneh (Master Admin) • Feb 24, 2026</span>
              </div>
              <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold">Restore Version</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📜 History</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Milestone Snapshot</strong> to take an immutable point-in-time backup before major contract revisions.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> the snapshot log: view timestamp, author username, and contract completion figures.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>View Snapshot Diff</strong> to compare changes side-by-side.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Restore Snapshot</strong> (Master Admins only) to revert project data to a verified checkpoint.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 24: WORKSPACE SETTINGS & RBAC
      ========================================================================= */}
      <section id="sec-settings" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">24.0</span>
          <span>System Administration</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Workspace Settings & RBAC (⚙️ Settings)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          User account administration, Role-Based Access Control (RBAC), page-level editing permissions, approval authority delegation, and UI display themes.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="User Account Provisioning & Role-Based Access Control (RBAC)" 
          url="https://era-erp.gov.et/project/daye-girja/settings" 
          badge="System Administration"
          badgeColor="bg-purple-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Active Accounts: 7 Registered Users</span>
              <span className="px-2.5 py-1 bg-purple-600 text-white rounded font-bold">+ Add User Credential</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded">
              <span>Username</span>
              <span>Assigned Role</span>
              <span>Authorized Tabs</span>
              <span>Approval Power</span>
            </div>
            <div className="grid grid-cols-4 p-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold">Ersido Abayneh</span>
              <span className="text-purple-600 font-bold">Master Admin</span>
              <span>ALL PGL PAGES</span>
              <span className="text-emerald-600 font-bold">Full Authority ✓</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>⚙️ Settings</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Manage Users (Administrators):</strong>
                <br />1) <strong>Click</strong> <strong>+ Add User Credential</strong> to register project team members.
                <br />2) <strong>Select</strong> Role (<em>Master Admin</em>, <em>CPM Admin</em>, <em>Directorate Admin</em>, <em>PMO Admin</em>, <em>Editor</em>, <em>Viewer</em>, or <em>Approver</em>).
                <br />3) <strong>Check</strong> <strong>Authorized Pages</strong> to restrict editors to specific modules (e.g. only Financials or only Logistics).
                <br />4) <strong>Toggle</strong> <strong>Approval Authority</strong> to permit users to approve pending submissions.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> UI Theme: <strong>Dark UI</strong> or <strong>Light UI</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save System Settings</strong> to commit.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 25: WORKSPACE NOTES & COLLABORATION
      ========================================================================= */}
      <section id="sec-workspace" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">25.0</span>
          <span>Collaboration</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Workspace Notes & Scratchpad (☁️ Workspace)</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Interactive engineering scratchpad for real-time field meeting notes, quantity calculation drafts, and collaborative memos.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Cloud Synchronized Engineering Scratchpad & Field Notes" 
          url="https://era-erp.gov.et/project/daye-girja/workspace" 
          badge="Real-Time Workspace"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Cloud Sync State: Synced (Local + Firebase)</span>
              <span className="text-emerald-600">Auto-Saving Field Memo</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded text-slate-700 dark:text-slate-300 font-mono">
              [Site Meeting Notes: Joint survey completed at Km 34+500 with RE team. Verified ROW clearance progress...]
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>☁️ Workspace</strong> navigation tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> site inspection observations, meeting notes, or draft calculations into the text editor.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Save Field Notes</strong> to persist content to the cloud database for cross-device access.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 26: AI ROAD ENGINEER ASSISTANT
      ========================================================================= */}
      <section id="sec-ai" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">26.0</span>
          <span>AI Assistant</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">AI Road Engineer Assistant Chat</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          An intelligent conversational engineering advisor that queries real-time project metrics, explains FIDIC contractual clauses, and drafts executive delay diagnostics.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="AI Road Engineer Assistant Conversational Intelligence Window" 
          url="https://era-erp.gov.et/project/daye-girja/ai-assistant" 
          badge="Gemini AI Engineering Copilot"
          badgeColor="bg-indigo-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg space-y-1">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 block">🤖 ERA AI Assistant Response:</span>
              <p className="text-slate-700 dark:text-slate-300">
                The Daye-Girja road project is currently experiencing a 42.82% schedule delay variance (SPI: 0.637). The primary critical path delay stems from uncleared Right-of-Way (ROW) land between Km 24+000 and Km 38+200. FIDIC Clause 2.1 applies...
              </p>
            </div>
            <div className="p-2 border border-slate-200 dark:border-slate-800 rounded flex justify-between items-center text-slate-400">
              <span>Ask the AI Road Engineer a question about this contract...</span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold">Send</span>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the floating <strong>AI Assistant</strong> button in the bottom-right corner of any screen.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Type</strong> your question in plain English (e.g. <em>"Summarize our current schedule delay gap"</em> or <em>"What are the FIDIC Clause 14.8 interest implications for overdue IPCs?"</em>).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> any suggested prompt chip for instant project briefings.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 27: GROUP COMPARATIVE REPORT GENERATOR
      ========================================================================= */}
      <section id="sec-group-report" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">27.0</span>
          <span>Portfolio Reports</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Executive Group Comparative Report Generator</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Generates multi-project comparative executive reports, 5-dimension compliance evaluations, and vector PDF/Excel exports for directorate briefings.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Multi-Project Executive Group Comparative Report Modal" 
          url="https://era-erp.gov.et/portfolio/group-reports" 
          badge="Executive Report Engine"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Target Projects: 5 Road Projects Selected</span>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-red-600 text-white rounded font-bold">📄 Executive PDF (A4)</span>
                <span className="px-2 py-1 bg-emerald-600 text-white rounded font-bold">📊 Excel Data Matrix</span>
              </div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded font-bold text-slate-700 dark:text-slate-300">
              5-Dimension Model Weights: FIDIC (20%), Time (25%), EVM (25%), KPIs (15%), Civil Layers (15%) = 100% Balanced
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> the <strong>📄 Group Reports</strong> button on the Projects Portfolio page.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Select</strong> target projects or choose <strong>Select Entire Directorate</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Adjust</strong> the 5-dimension model weights (FIDIC, Time, EVM, KPIs, Civil Layers) ensuring they sum to 100%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>📄 Executive Summary PDF</strong> (A4) or <strong>📊 Full Group Audit PDF</strong> (A3 format).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>📊 Excel Data Matrix</strong> to export raw multi-project data.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 28: DRAFT PLAYGROUND & SIMULATION SANDBOX
      ========================================================================= */}
      <section id="sec-draft-sandbox" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">28.0</span>
          <span>Simulation</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Draft Playground & Simulation Sandbox</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          A sandboxed "what-if" modeling environment where engineers test variations, schedule revisions, and price escalations without altering live production data.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Sandboxed What-If Contract Simulation Environment" 
          url="https://era-erp.gov.et/project/daye-girja/draft-sandbox" 
          badge="Sandboxed Modeling"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-amber-600">⚠ Sandbox Mode Active (Production Data Unchanged)</span>
              <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-bold">Discard Simulation</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400">Time Extension (+Days)</span>
                <span className="font-bold text-amber-600">+90 Days Proposed</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400">Variation Amount</span>
                <span className="font-bold text-emerald-600">+ETB 45,000,000.00</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded">
                <span className="block text-slate-400">Projected EAC</span>
                <span className="font-bold text-blue-600">ETB 1,600,708,167.90</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Open Draft Playground</strong> from the project header options menu.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Adjust</strong> simulation sliders: test time extensions (+90 days), variation orders (+10%), or equipment increases.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Review</strong> projected outcomes: observe changes to completion dates, CPI, and EAC.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Click</strong> <strong>Discard Simulation</strong> to exit cleanly, or <strong>Submit Proposed Plan</strong> to initiate administrative review.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* =========================================================================
          SECTION 29: FAQS & QUICK TROUBLESHOOTING GUIDE
      ========================================================================= */}
      <section id="sec-faqs" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">29.0</span>
          <span>FAQs & Troubleshooting</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">FAQs (Frequently Asked Questions) & Troubleshooting</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Quick troubleshooting solutions for common questions, permission restrictions, database synchronization, and CSV imports.
        </p>

        <div className="space-y-3 text-xs font-medium">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-extrabold text-blue-600 dark:text-blue-400">
              Q1: Why are my edits not appearing on the Executive Dashboard?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Solution:</strong> Always click the blue <strong>Save to Database</strong> button in the header. If your user account requires approval, your edits are held in pending status until your designated Project Approver signs off.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-extrabold text-blue-600 dark:text-blue-400">
              Q2: Why do I see a lock icon (🔒) or "Page Restricted" on certain tabs?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Solution:</strong> Your administrator has configured role-based page permissions. Contact your Directorate Admin in <strong>Settings</strong> to request assigned editing authorization for that module.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-extrabold text-blue-600 dark:text-blue-400">
              Q3: How do I clear a Critical Bank Guarantee Warning after renewing our bond?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Solution:</strong> Navigate to the <strong>Bonds</strong> tab, click the edit icon on the guarantee, enter the new expiry date from the bank letter, and set Status to <strong>Active & Valid</strong>. The alert clears immediately.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-extrabold text-blue-600 dark:text-blue-400">
              Q4: Why does my Work Program CPM CSV file fail to import?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Solution:</strong> Ensure your CSV file uses standard comma delimiters and has the exact header row: <code>ID, Name, Duration, Predecessors, Lag, SequenceType</code>. Durations must be numeric values in days.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-extrabold text-blue-600 dark:text-blue-400">
              Q5: How can I download or print this complete user guide?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Solution:</strong> Click the <strong>Download PDF Manual</strong> button in the header bar above, or click <strong>Print / Save PDF</strong> to generate clean printer-friendly documentation.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 30: CONTACT & OFFICIAL TECHNICAL SUPPORT
      ========================================================================= */}
      <section id="sec-contact" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">30.0</span>
          <span>Contact & Support</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Contact & Official Technical Support</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          For technical assistance, user account provisioning, role clearance updates, or on-site training inquiries, contact the Ethiopian Roads Administration ERP Support Team:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                <Mail className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 text-2xs uppercase block font-bold">Email Support</span>
                <a href="mailto:support.erp@era.gov.et" className="font-bold text-blue-600 hover:underline">
                  support.erp@era.gov.et
                </a>
                <span className="text-slate-500 block text-2xs">Secondary: it.projects@era.gov.et</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                <Phone className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 text-2xs uppercase block font-bold">Telephone Helpline</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">+251 11 515 6071 / +251 11 515 3015</span>
                <span className="text-slate-500 block text-2xs">Direct ERP Support Line</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 text-2xs uppercase block font-bold">Headquarters Address</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Ethiopian Roads Administration Head Office
                </span>
                <span className="text-slate-500 block text-2xs">
                  Ras Abebe Aregay Street, P.O. Box 1770, Addis Ababa, Ethiopia
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 text-2xs uppercase block font-bold">Working Hours</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Monday – Friday: 8:30 AM – 5:30 PM (EAT, UTC+3)
                </span>
              </div>
            </div>
          </div>
        </div>

        {onDownloadPdf && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-blue-900 dark:text-blue-200 block">
                Looking for the Official 20-Page Vector PDF Documentation?
              </span>
              <span className="text-blue-700 dark:text-blue-300 text-2xs">
                Includes high-resolution browser screen diagrams, color-coded tables, and FIDIC compliance checklists.
              </span>
            </div>
            <button
              onClick={onDownloadPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Manual</span>
            </button>
          </div>
        )}

        <div className="text-center pt-8 text-2xs text-slate-400 font-mono">
          Ethiopian Roads Administration Construction Project Management ERP • Official User Guide Manual v1.0 • All Rights Reserved
        </div>
      </section>

    </div>
  );
}

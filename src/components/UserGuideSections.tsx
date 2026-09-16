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
          SECTION 1: INTRODUCTION AND CORE PURPOSE
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
            <p className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
              Infrastructure & PMO Directorate • Official ERP Website
            </p>
            <p className="text-base sm:text-lg font-black text-amber-400 uppercase tracking-wide">
              Detailed User Manual — Version 1.1 (Expanded Edition • August 2026)
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed font-medium">
            <p className="font-bold text-white text-sm">
              Comprehensive Step-by-Step Operational Guide for New Users with Page-by-Page Screen Diagrams and Annotated Screenshots
            </p>
            <p>
              The Ethiopian Roads Administration (ERA) Enterprise Resource Planning (ERP) Dashboard is a cloud-deployed, web-based platform designed to provide real-time portfolio oversight, FIDIC 2017-compliant contract management, financial valuation, civil engineering layer tracking, and multi-project executive reporting across all Directorates (Southern, Northern, Eastern, Western, Central and Expressway).
            </p>
            <p>
              The platform acts as a single source of truth that connects the ERA headquarters, supervising consultants, contractors, and directorate PMOs in one coherent data environment, replacing fragmented spreadsheets and email-based reporting with an auditable, role-controlled online system.
            </p>
          </div>

          {/* Reference Project Data Box matching Page 1 */}
          <div className="p-4 bg-amber-500/10 rounded-2xl border-2 border-amber-500/40 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <span className="font-black text-amber-400 uppercase tracking-wider text-2xs">
                Primary Reference Project Data
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                Contract Ref: W-43-NC-5 • DS-4 DBB
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-200 text-2xs leading-normal">
              <div><strong>Project Name:</strong> Daye-Girja-Melka Desta & Meleya-Mejo Spur Road Project</div>
              <div><strong>Client:</strong> Ethiopian Roads Administration (ERA) | <strong>Directorate:</strong> Southern | <strong>PMO:</strong> PMO 1</div>
              <div><strong>Consultant:</strong> LEA Associates South Asia JV | <strong>Contractor:</strong> China Tiesiju Civil Engineering Group</div>
              <div><strong>Contract Type:</strong> Design-Bid-Build (DBB) | <strong>Classification:</strong> DS-4 (Heavy Mountainous/Rolling)</div>
              <div><strong>Original Contract:</strong> Br. 1,555,708,167.88 | <strong>Variation:</strong> Br. 72,163,600.00 | <strong>Revised:</strong> Br. 1,627,871,767.88</div>
              <div><strong>Duration:</strong> 1,095 original + 730 EOT = 1,825 total days | <strong>Signed:</strong> 28 April 2020 | <strong>Revised Comp:</strong> 28 Dec 2025</div>
              <div><strong>Length:</strong> 65.00 km Main + 8.80 km Spur = 73.80 km Total | <strong>Physical Progress:</strong> 63.73% (Lagging)</div>
              <div><strong>EVM Baseline:</strong> CPI: 1.213 (Under Budget) | SPI: 0.637 (Critical Delay ~36.27% Lag)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-2xs">
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Target Audience</span>
              <span className="font-bold text-slate-200">Directorate Leads, Resident Engineers, PMO Staff, Financial Auditors</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Governance & Standards</span>
              <span className="font-bold text-slate-200">FIDIC 2017 Red/Yellow, EVM PMBOK 8th Ed, ERA Engineering Criteria</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[9px]">Live System Deployment</span>
              <span className="font-bold text-emerald-400 font-mono">https://eradashboard.com.et (or Cloud Run URL)</span>
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 text-2xs text-blue-200 flex items-start gap-2">
            <span className="text-blue-400 font-bold text-sm leading-none">ℹ</span>
            <span>
              <strong>Note on this edition:</strong> This Expanded Edition integrates 22+ live-system screenshots and UI diagrams captured from the production ERA ERP Dashboard. Each figure is accompanied by a detailed annotation explaining the visible UI elements, data fields, key metrics, color coding, and user actions available on that screen.
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: GETTING STARTED: AUTHENTICATION AND ROLE-BASED ACCESS
      ========================================================================= */}
      <section id="sec-getting-started" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">2.0</span>
          <span>Authentication & RBAC</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Getting Started: Authentication and Role-Based Access</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Access to the ERA ERP Dashboard is controlled by enterprise credentials and role-based access control (RBAC). Only authorized personnel may view or edit project data, and every action is logged against the authenticated user identity with full device, timezone, and client telemetry.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Login & Security Portal • Real-Time Client Telemetry" 
          url="https://eradashboard.com.et/login" 
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
                <span className="text-slate-400 block font-bold">Username or Email</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">ErsidoAbayneh@gmail.com</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-2xs">
                <span className="text-slate-400 block font-bold">Role Clearance</span>
                <span className="font-bold text-blue-600">Directorate Admin (Southern Region)</span>
              </div>
              <div className="p-2 bg-blue-600 text-white rounded-lg text-center font-bold text-2xs cursor-pointer shadow-sm">
                Sign In to ERA ERP Dashboard
              </div>
            </div>

            {/* Real-time Telemetry Card */}
            <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-1.5 text-[10px] text-amber-900 dark:text-amber-300 font-medium">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Multi-Device & Location Authorization Protocol:</span>
              </div>
              <p className="leading-snug">
                When signing in from a new device or external location, the portal automatically captures your client environment (e.g. <em>Windows PC • Chrome</em>) and timezone (e.g. <em>Africa/Addis_Ababa</em>) and transmits an immediate high-priority review notice directly to the Master Administrator screen for real-time activation.
              </p>
            </div>
          </div>
        </ScreenMockup>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            Step-by-Step System Access Procedure
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            <li><strong>Open the Application:</strong> Launch Google Chrome or Mozilla Firefox and navigate to the official deployment URL (<code>https://eradashboard.com.et</code> or the current Cloud Run address provided by the IT Directorate).</li>
            <li><strong>Enter Credentials:</strong> On the central login portal, enter your assigned Username (usually your official email address) and Password.</li>
            <li><strong>Select Role:</strong> Available roles include Master Admin, Directorate Admin (Southern, Northern, Eastern, Western, Central), PMO Lead, Resident Engineer, Auditor, and Contractor Representative. Select the role that matches your authorization.</li>
            <li><strong>Two-Factor Authentication (2FA):</strong> Enter the six-digit authentication code sent to your registered device or authenticator application.</li>
            <li><strong>Project Selection:</strong> From the Active Contracts portfolio screen (Section 3), locate and select the required project (for example, "Daye-Girja-Melka Desta & Meleya-Mejo Spur").</li>
            <li><strong>Cloud Persistence:</strong> All subsequent edits are saved immediately to the backend database and synchronize across connected devices. A blue "Save to Cloud Database" button appears only when offline mutations exist.</li>
          </ol>

          <div className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl text-amber-900 dark:text-amber-300 text-2xs leading-relaxed">
            <strong>Important:</strong> Page-editing rights are governed by your assigned role. Editors may modify data; Approvers must review and approve changes. View-only users can inspect all screens but cannot alter values. A yellow <em>"Page Editing Authorized — Edits routed to designated Project Approver for review"</em> banner appears on every editable screen, confirming that any change you make will be queued for approval.
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: PORTFOLIO OVERVIEW AND ACTIVE CONTRACTS SELECTION
      ========================================================================= */}
      <section id="sec-portfolio" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">3.0</span>
          <span>Portfolio Overview [Fig. 3.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Portfolio Overview and Active Contracts Selection</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The Portfolio (Active Contracts) screen is the primary command view upon logging in. It displays every road construction contract to which the user has clearance, grouped by Directorate and sorted by name, budget, or physical progress. Each contract is rendered as a card summarizing the project identity, stakeholders, lifecycle status, length, budget, physical progress percentage, and critical alerts.
        </p>

        {/* Screen Mockup: Figure 3.1 */}
        <ScreenMockup 
          title="Figure 3.1 — Active Contracts Portfolio screen" 
          url="https://eradashboard.com.et/portfolio" 
          badge="Figure 3.1"
          badgeColor="bg-blue-600"
        >
          <div className="space-y-3">
            {/* Filter & Global Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-2xs flex-1 max-w-sm">
                <span className="font-bold text-slate-500">🔍 Search:</span>
                <span className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-slate-400 text-2xs">
                  "Daye-Girja" or "China Tiesiju"
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-2xs font-bold text-slate-700 dark:text-slate-300">
                  Directorate: Southern ▾
                </span>
                <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-2xs font-bold text-slate-700 dark:text-slate-300">
                  Status: All Statuses ▾
                </span>
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-2xs font-bold shadow-xs">
                  + Issue New Road Construction Project Template
                </span>
              </div>
            </div>

            {/* 4 Cards Grid matching PDF Figure 3.1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Daye-Girja Reference Project */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border-2 border-blue-500 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-blue-400 font-mono font-bold block">W-43-NC-5 • DRB, DS-4</span>
                    <h4 className="font-black text-xs text-white truncate">Daye-Girja-Melka Desta & Meleya-Mejo Spur</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold shrink-0">
                    In Progress
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>Client: Ethiopian Roads Administration | Southern Directorate</div>
                  <div>Contractor: China Tiesiju Civil Engineering Group</div>
                  <div className="font-mono text-[10px] text-slate-400">Length: 73.80 km (65 km + 8.8 km Spur) | Budget: Br. 1,627.87M</div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300">
                    <span>Physical Progress</span>
                    <span className="text-amber-400">63.73%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '63.73%' }} />
                  </div>
                </div>
                <div className="p-1.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-[10px] font-bold flex items-center justify-between">
                  <span>⚠ Matured Certified IPC Overdue</span>
                  <span className="underline cursor-pointer">Open Workspace →</span>
                </div>
              </div>

              {/* Card 2: Dilla-Bule-Haro Wachu */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 font-mono font-bold block">W-41-NC-2 • DS-2</span>
                    <h4 className="font-black text-xs text-white truncate">Dilla -Bule -Haro Wachu Road Project</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold shrink-0">
                    In Progress
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>Client: Ethiopian Roads Administration</div>
                  <div>Contractor: China Railway First Group</div>
                  <div className="font-mono text-[10px] text-slate-400">Length: 68.70 km | Budget: Br. 2,247.77M</div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300">
                    <span>Physical Progress</span>
                    <span className="text-blue-400">58.20%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '58.2%' }} />
                  </div>
                </div>
                <div className="p-1.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-[10px] font-bold flex items-center justify-between">
                  <span>⚠ Critical Security Bonds Expired/Near Expiry</span>
                  <span className="underline cursor-pointer">Open Workspace →</span>
                </div>
              </div>

              {/* Card 3: Hawela-Tula */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 font-mono font-bold block">W-42-DB-1 • DS-3</span>
                    <h4 className="font-black text-xs text-white truncate">Hawela-Tula-Woteraresa-Yirga Road Project</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[9px] font-bold shrink-0">
                    In Progress
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>Contractor: Homa Construction Plc | Length: 45.4 km</div>
                  <div className="font-mono text-[10px] text-slate-400">Budget: Br. 1,850.40M | Progress: 35.40%</div>
                </div>
                <div className="p-1.5 bg-amber-950/80 border border-amber-800 rounded-lg text-amber-300 text-[10px] font-bold">
                  ⚡ Bonds Expiring Soon
                </div>
              </div>

              {/* Card 4: Sodo Junction */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 font-mono font-bold block">W-39-DB-4 • DS-4</span>
                    <h4 className="font-black text-xs text-white truncate">Sodo Junction (Dimtu) - Bilate Road Project</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold shrink-0">
                    In Progress
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div>Contractor: SUR Construction Plc | Length: 52.8 km</div>
                  <div className="font-mono text-[10px] text-slate-400">Budget: Br. 2,075.00M | Progress: 42.45%</div>
                </div>
                <div className="p-1.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-[10px] font-bold">
                  ⚠ Critical Security Bonds Expired/Near Expiry
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 3.1 — Active Contracts Portfolio screen:</strong> The Active Contracts portfolio lists every road project accessible to the signed-in user. Each card displays project ID, region tag, contractor, length, budget, physical progress bar, and a colour-coded alert banner.
        </p>

        {/* Key Interface Elements and How to Use Them */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            Key Interface Elements and How to Use Them
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            <li><strong>Global Search Bar:</strong> A wide input field at the top of the screen accepts any portion of the contract name, ID, Directorate, client, or contractor name. Results filter instantly as you type — for example typing "Daye" isolates the Daye-Girja-Melka Desta project among the cards.</li>
            <li><strong>Directorate Filter:</strong> Use the drop-down (default value "All Directorates") to restrict the view to Southern, Northern, Eastern, Western, Central, or Expressway Directorates.</li>
            <li><strong>Status Filter & Sort:</strong> Filter by lifecycle status (All Statuses, In Progress, Completed, Suspended) and sort ascending/descending by Contract Name, Budget, or Physical Progress. The screen header displays a live counter (for example, "Showing 4 of 4 contracts") that updates with each filter action.</li>
            <li><strong>Project Cards:</strong> Each card summarizes project ID (e.g. W-43-NC-5), region tag (DRB, DS-4), client (Ethiopian Roads Administration), contractor (China Tiesiju Civil Engineering Group), length in km, budget in million Birr, physical progress percentage with a blue horizontal progress bar, and a colored alert banner at the bottom. Click any card to open the full project workspace (Section 4).</li>
            <li><strong>Critical Alerts:</strong> Red banners indicate "Matured Certified IPC Overdue" or "Critical Security Bonds Expired/Near Expiry"; amber banners warn of "Bonds Expiring Soon". These alerts allow managers to triage at-risk contracts in seconds.</li>
            <li><strong>Issue New Project Template:</strong> Authorized Administrators may initiate a new road construction project by selecting the green "+ Issue New Road Construction Project Template" button at the bottom of the page.</li>
            <li><strong>User Manual & Group Reports:</strong> The top navigation bar provides direct access to this User Manual PDF (green button) and the multi-project Executive Group Report generator. Profile, Collaborate, and Logout controls sit to the right.</li>
          </ol>

          <div className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl text-amber-900 dark:text-amber-300 text-2xs leading-relaxed">
            <strong>Tip:</strong> Use the alert banner colour as a quick health-check before drilling into individual projects. A red banner on a card means the project needs immediate management attention — typically either an overdue IPC or an expiring bond.
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: PROJECT EXECUTIVE DASHBOARD
      ========================================================================= */}
      <section id="sec-dash" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">4.0</span>
          <span>Executive Dashboard [Fig. 4.1, 4.2, 4.3]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Executive Dashboard</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Once a project is selected from the portfolio, the Executive Dashboard becomes the central command view. It presents high-level performance indicators, contract financials, Earned Value Management (EVM) metrics, and critical alerts in a single consolidated screen. The dashboard supports multiple variants: a compact gauge view, an expanded detail view, and a KPI gallery view.
        </p>

        {/* Screen Mockup: Figure 4.1 Compact Gauge View */}
        <ScreenMockup 
          title="Figure 4.1 — Project Executive Dashboard (compact gauge view)" 
          url="https://eradashboard.com.et/project/daye-girja/dashboard?view=gauges" 
          badge="Figure 4.1"
          badgeColor="bg-amber-600"
        >
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            {/* Top Row: 3 Circular Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-amber-400 border-t-transparent flex items-center justify-center font-black text-sm text-amber-400">
                  63.73%
                </div>
                <span className="text-[11px] font-bold text-slate-300 mt-2 block">Project Progress</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-rose-500 flex items-center justify-center font-black text-sm text-rose-500">
                  100.00%
                </div>
                <span className="text-[11px] font-bold text-slate-300 mt-2 block">Elapsed Time</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-amber-400 border-b-transparent flex items-center justify-center font-black text-sm text-amber-400">
                  63.73%
                </div>
                <span className="text-[11px] font-bold text-slate-300 mt-2 block">Progress vs Elapsed Time</span>
              </div>
            </div>

            {/* Middle Row: CPI / SPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">CPI (Cost Performance Index)</span>
                  <span className="text-lg font-black text-emerald-400">1.213</span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                  UNDER BUDGET
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">SPI (Schedule Performance Index)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-rose-400">0.637</span>
                    <span className="text-2xs font-bold text-rose-400">~36.27% Lag</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase">
                  CRITICAL DELAY
                </span>
              </div>
            </div>

            {/* Bottom Row: 4 Financial Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-2xs">
              <div className="p-2.5 bg-rose-950/50 rounded-xl border border-rose-900/80 space-y-1">
                <span className="text-slate-400 block font-bold">Matured Overdue Payments</span>
                <span className="text-xs font-black text-rose-300 block">Br. 289,675,000.00</span>
                <span className="px-1.5 py-0.5 bg-rose-900 text-rose-200 rounded text-[9px] font-bold inline-block">2 IPC Overdue</span>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-bold">Within Maturity Window</span>
                <span className="text-xs font-black text-amber-300 block">Br. 0.00</span>
                <span className="px-1.5 py-0.5 bg-amber-900/60 text-amber-300 rounded text-[9px] font-bold inline-block">0 IPC Pending</span>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-bold">Total Outstanding Balance</span>
                <span className="text-xs font-black text-slate-200 block">Br. 289,675,000.00</span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-bold inline-block">2 / 4 Unpaid (35.43%)</span>
              </div>
              <div className="p-2.5 bg-emerald-950/50 rounded-xl border border-emerald-900/80 space-y-1">
                <span className="text-slate-400 block font-bold">Paid Certified Claims</span>
                <span className="text-xs font-black text-emerald-300 block">Br. 527,976,598.82</span>
                <span className="px-1.5 py-0.5 bg-emerald-900 text-emerald-200 rounded text-[9px] font-bold inline-block">2 IPC Paid (64.57%)</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 4.1 — Project Executive Dashboard (compact gauge view):</strong> Compact variant showing the three top-row gauges (Project Progress 63.73 %, Elapsed Time 100.00 %, Progress vs Elapsed Time 63.73 %), CPI/SPI index cards, and the four financial-status cards at the bottom.
        </p>

        {/* How to Read the Executive Dashboard */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Read the Executive Dashboard
          </h4>
          <ul className="space-y-1.5 list-disc list-inside">
            <li><strong>Project Progress Gauge:</strong> Circular indicator showing overall physical completion percentage (example: 63.73 %). A yellow arc indicates moderate progress; green indicates on-track or ahead.</li>
            <li><strong>Elapsed Time Gauge:</strong> Percentage of the revised contract duration that has already passed (example: 100 % shown in red, meaning the revised completion date has been reached).</li>
            <li><strong>Progress vs Elapsed Time:</strong> Combined ratio that immediately highlights schedule lag or advance. A value below 100 % (here 63.73 %) confirms the works are running behind the elapsed time budget.</li>
            <li><strong>CPI (Cost Performance Index):</strong> EV / AC. A value greater than 1.0 (here 1.213) indicates the project is under budget; the green "UNDER BUDGET" badge confirms cost efficiency. For every Br. 1.00 spent, Br. 1.21 of progress value has been earned.</li>
            <li><strong>SPI (Schedule Performance Index):</strong> EV / PV. A value less than 1.0 (here 0.637) indicates delay relative to the baseline S-curve. The red "CRITICAL DELAY" badge and "~36.27 % Lag" label quantify the schedule slippage.</li>
            <li><strong>Matured Overdue Payments:</strong> Br. 289,675,000.00 with "2 IPC Overdue" red badge. This card surfaces FIDIC Sub-clause 14.8 interest liabilities when Interim Payment Certificates remain unpaid beyond the contractual 56-day window.</li>
            <li><strong>Within Maturity Window:</strong> Br. 0.00 with "0 IPC Pending" yellow badge, meaning no certificate is currently inside the 56-day payment window.</li>
            <li><strong>Total Outstanding Balance:</strong> Br. 289,675,000.00 (35.43 % of total certified claims), with "2 / 4 Unpaid" grey badge.</li>
            <li><strong>Paid Certified Claims:</strong> Br. 527,976,598.82 (64.57 % of certified claims), with "2 IPC Paid" green badge.</li>
          </ul>
        </div>

        {/* Screen Mockup: Figure 4.2 Expanded Detail View */}
        <ScreenMockup 
          title="Figure 4.2 — Project Executive Dashboard (expanded detail view)" 
          url="https://eradashboard.com.et/project/daye-girja/dashboard?view=expanded" 
          badge="Figure 4.2"
          badgeColor="bg-blue-600"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600 uppercase text-[9px] block">Project Stakeholders</span>
              <div>Client: Ethiopian Roads Administration (ERA)</div>
              <div>Consultant: LEA Associates South Asia JV</div>
              <div>Main Contractor: China Tiesiju Civil Engineering Group</div>
              <div>Directorate: Southern | PMO: PMO 1</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-amber-600 uppercase text-[9px] block">Milestones & Durations</span>
              <div>Signed: April 28, 2020 | Commencement: Dec 29, 2020</div>
              <div>Original Duration: 1,095 Days | Approved EOT: <span className="text-amber-600 font-bold">+730 Days</span></div>
              <div>Revised Completion: <span className="text-rose-600 font-bold">Dec 28, 2025</span> (1,825 total days)</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-emerald-600 uppercase text-[9px] block">Financial Cost Outlay</span>
              <div>Original Contract: Br. 1,555,708,167.88</div>
              <div>Approved Variations: Br. 72,163,600.00</div>
              <div>Revised Contract: Br. 1,627,871,767.88</div>
              <div>Currency: <span className="font-bold text-purple-600">ETB Only</span> (Expenditure Reimbursement)</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[9px] block">Physical & Legal Framework</span>
              <div>Total Length: 73.80 km (65.00 km Main + 8.80 km Spur)</div>
              <div>Road Classification: DS-4 (Secondary Arterial)</div>
              <div>Delivery Method: Design-Bid-Build (DBB)</div>
              <div>Approval Status: <span className="text-emerald-600 font-bold">Approved with Timestamp</span></div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 4.2 — Project Executive Dashboard (expanded detail view):</strong> Expanded variant showing the project stakeholder card, milestones & durations card with EOT breakdown, financial cost outlay card, and physical & legal framework card alongside performance gauges and financial status cards.
        </p>

        {/* Screen Mockup: Figure 4.3 KPI Gallery View */}
        <ScreenMockup 
          title="Figure 4.3 — ERA Key Performance Indicators gallery view" 
          url="https://eradashboard.com.et/project/daye-girja/dashboard?view=kpi-gallery" 
          badge="Figure 4.3"
          badgeColor="bg-emerald-600"
        >
          <div className="space-y-3">
            {/* Live S-Curve Mini Chart */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold mb-2">
                <span>Cumulative Progress vs S-Curve (Jan-21 to Aug-26)</span>
                <span className="text-blue-400 underline cursor-pointer">LIVE S-CURVE MAP →</span>
              </div>
              <div className="h-16 flex items-end gap-1 px-2 border-b border-slate-800 pb-1">
                <div className="w-1/6 h-4 bg-amber-500/50 rounded-t" title="Original Plan" />
                <div className="w-1/6 h-7 bg-amber-500/70 rounded-t" />
                <div className="w-1/6 h-10 bg-blue-500/70 rounded-t" title="Revised Plan" />
                <div className="w-1/6 h-12 bg-blue-500 rounded-t" />
                <div className="w-1/6 h-8 bg-emerald-500 rounded-t" title="To-Date Actual (63.73%)" />
                <div className="w-1/6 h-10 bg-emerald-500 rounded-t" />
              </div>
            </div>

            {/* 10 Circular Gauges Grid matching PDF Figure 4.3 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-2xs">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600 block">4.94%</span>
                <span className="text-slate-400 text-[9px]">Cost Overrun</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-rose-600 block">63.56%</span>
                <span className="text-slate-400 text-[9px]">Time Overrun</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-500 block">70.05%</span>
                <span className="text-slate-400 text-[9px]">Quality Mgmt</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600 block">81.00%</span>
                <span className="text-slate-400 text-[9px]">Design Mgmt</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600 block">91.00%</span>
                <span className="text-slate-400 text-[9px]">Claim & Dispute</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-500 block">57.00%</span>
                <span className="text-slate-400 text-[9px]">Risk Mgmt</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-500 block">70.07%</span>
                <span className="text-slate-400 text-[9px]">ESOHS Mgmt</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600 block">77.09%</span>
                <span className="text-slate-400 text-[9px]">ROW Mgmt</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-500 block">70.05%</span>
                <span className="text-slate-400 text-[9px]">Stakeholder</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-amber-500 block">58.16%</span>
                <span className="text-slate-400 text-[9px]">Contract Compliance</span>
              </div>
            </div>

            {/* Field Image Gallery Upload Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center space-y-1">
              <span className="text-[10px] text-slate-400 block font-bold">Field Engineering Image Gallery</span>
              <p className="text-[9px] text-slate-500">Drag and drop site photos here or click to browse (JPG, PNG, WebP, HEIC up to 20MB)</p>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 4.3 — ERA Key Performance Indicators gallery view:</strong> KPI gallery variant showing the live S-Curve chart at the top, a grid of ten circular KPI gauges, and the Field Engineering Image Gallery with drag-and-drop upload zone.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            Navigation to Detailed Modules
          </h4>
          <p>
            The horizontal icon bar beneath the project header provides one-click access to every specialized module: <strong>Home</strong>, <strong>Documents</strong>, <strong>Financials</strong>, <strong>Physical Progress</strong>, <strong>Reports</strong>, <strong>Settings</strong>, and <strong>Help</strong>. The currently active module is highlighted in blue. Additional modules (Issue Log, Linear Diagram, Utilities & ROW, Progress Comparisons, Quantities Log, Bonds, KPIs, Monthly Cumulative, Work Program CPM, Logistics, Project Risks, Supervision Consultant, Comprehensive Analysis, Documentation) are reachable through the icon strip.
          </p>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FINANCIAL DATA, BOQ DIVISIONS AND IPC TRACKER
      ========================================================================= */}
      <section id="sec-financial-boq" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">5.0</span>
          <span>Financial Management [Fig. 5.1, 5.2, 5.3]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Financial Data, BOQ Divisions and IPC Tracker</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The Financial Data module provides comprehensive accounting control over the project's Bill of Quantities (BOQ), certified payment certificates, delay-interest liabilities under FIDIC Clause 14.8, and multi-year disbursement projections across Ethiopian Fiscal Years (EFY).
        </p>

        {/* Screen Mockup: Figure 5.1 Division Work Quantities & Financial Data */}
        <ScreenMockup 
          title="Figure 5.1 — Division Work Quantities & Financial Data table" 
          url="https://eradashboard.com.et/project/daye-girja/financial?tab=boq-divisions" 
          badge="Figure 5.1"
          badgeColor="bg-blue-600"
        >
          <div className="space-y-3 text-2xs">
            {/* Header / Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Total Revised Contract: <strong className="text-blue-600">Br. 1,627,871,767.88</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Executed To Date: <strong className="text-emerald-600">Br. 331,332,600.00</strong></span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-black">
                  20.35% Progress
                </span>
              </div>
            </div>

            {/* BOQ Divisions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">Division Code</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Original Amount (ETB)</th>
                    <th className="p-2 text-right">Revised Amount (ETB)</th>
                    <th className="p-2 text-right">Executed to Date</th>
                    <th className="p-2 text-right">% Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 1000</td>
                    <td className="p-2 font-medium">General / Facilities & Provisions</td>
                    <td className="p-2 text-right font-mono">115,200,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">120,500,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">98,200,000.00</td>
                    <td className="p-2 text-right font-bold text-emerald-600">81.49%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 2000</td>
                    <td className="p-2 font-medium">Site Clearance & Demolition</td>
                    <td className="p-2 text-right font-mono">42,800,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">45,100,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">38,700,000.00</td>
                    <td className="p-2 text-right font-bold text-emerald-600">85.81%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 3000</td>
                    <td className="p-2 font-medium">Drainage Structures & Culverts</td>
                    <td className="p-2 text-right font-mono">198,400,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">205,000,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">92,400,000.00</td>
                    <td className="p-2 text-right font-bold text-amber-600">45.07%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 4000</td>
                    <td className="p-2 font-medium">Earthworks & Subgrade Preparation</td>
                    <td className="p-2 text-right font-mono">365,000,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">380,400,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">245,600,000.00</td>
                    <td className="p-2 text-right font-bold text-emerald-600">64.56%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 5000</td>
                    <td className="p-2 font-medium">Sub-Base, Road Base & Shoulders</td>
                    <td className="p-2 text-right font-mono">295,000,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">310,000,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">42,100,000.00</td>
                    <td className="p-2 text-right font-bold text-rose-600">13.58%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">Series 6000</td>
                    <td className="p-2 font-medium">Bituminous Surfacing & Prime Coat</td>
                    <td className="p-2 text-right font-mono">465,000,000.00</td>
                    <td className="p-2 text-right font-mono font-bold">490,200,000.00</td>
                    <td className="p-2 text-right font-mono text-emerald-600 font-bold">0.00</td>
                    <td className="p-2 text-right font-bold text-slate-400">0.00%</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-black">
                    <td className="p-2" colSpan={2}>Total (Series 1000 - 11000)</td>
                    <td className="p-2 text-right font-mono">1,555,708,167.88</td>
                    <td className="p-2 text-right font-mono text-blue-600">1,627,871,767.88</td>
                    <td className="p-2 text-right font-mono text-emerald-600">331,332,600.00</td>
                    <td className="p-2 text-right text-emerald-600">20.35%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 5.1 — Division Work Quantities & Financial Data table:</strong> Shows the 11 Standard ERA BOQ divisions (Series 1000 to 11000) with Original Amount, Revised Amount, Executed to Date, and % Completed. Total contract value is Br. 1,627.87M, executed Br. 331.33M (20.35%).
        </p>

        {/* Step-by-Step Guidance for Financial Review */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            Step-by-Step Guidance for Financial Review
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Select the Financials Tab:</strong> Click the "Financials" icon on the sub-navigation bar to enter this module.</li>
            <li><strong>Review BOQ Divisions:</strong> Each row in the table corresponds to an ERA standard division (Series 1000 General to Series 11000 Dayworks/Tolerances). Verify that the Revised Amount reflects all approved variation orders.</li>
            <li><strong>Inspect Execution Rates:</strong> Check the "% Completed" column. Divisions with low completion rates relative to elapsed project time (e.g. Series 6000 Bituminous Surfacing at 0.00 % when elapsed time is 100 %) highlight operational bottlenecks that require immediate intervention.</li>
            <li><strong>Export Financial Data:</strong> Use the "Export CSV" or "Print Summary" controls at the top right of the table to produce audit documentation for ERA finance teams.</li>
          </ol>
        </div>

        {/* Screen Mockup: Figure 5.2 Payment Certificate Data & Annual Fund Distributions */}
        <ScreenMockup 
          title="Figure 5.2 — Payment Certificate Data & Annual Fund Distributions" 
          url="https://eradashboard.com.et/project/daye-girja/financial?tab=ipc-tracker" 
          badge="Figure 5.2"
          badgeColor="bg-emerald-600"
        >
          <div className="space-y-3 text-2xs">
            {/* Top Bar: Financial Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <div>
                <span className="text-slate-400 block font-bold">USD Exchange Rate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">57.50 ETB / USD</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Advance Payment Limit</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">30.00% (Br. 466.71M)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">FIDIC 14.8 Delay Rate</span>
                <span className="font-mono font-bold text-rose-600">4.00% p.a.</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Total Delay Interest</span>
                <span className="font-mono font-bold text-rose-600">Br. 2,623,939.73</span>
              </div>
            </div>

            {/* IPC Maturation & Delay Interest Ledger */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">IPC No.</th>
                    <th className="p-2">Certified Date</th>
                    <th className="p-2 text-right">Net Certified (ETB)</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Days Elapsed</th>
                    <th className="p-2 text-right">Delay Interest (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC No. 01</td>
                    <td className="p-2">2021-06-15</td>
                    <td className="p-2 text-right font-mono font-bold">256,120,400.00</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">PAID</span></td>
                    <td className="p-2 font-mono">42 Days</td>
                    <td className="p-2 text-right font-mono text-slate-400">0.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC No. 02</td>
                    <td className="p-2">2022-03-20</td>
                    <td className="p-2 text-right font-mono font-bold">271,856,198.82</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">PAID</span></td>
                    <td className="p-2 font-mono">51 Days</td>
                    <td className="p-2 text-right font-mono text-slate-400">0.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">IPC No. 03</td>
                    <td className="p-2">2023-11-10</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">142,500,000.00</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">OVERDUE</span></td>
                    <td className="p-2 font-mono font-bold text-rose-600">224 Days</td>
                    <td className="p-2 text-right font-mono text-rose-600 font-bold">1,568,432.88</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">IPC No. 04</td>
                    <td className="p-2">2024-04-18</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">147,175,000.00</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">OVERDUE</span></td>
                    <td className="p-2 font-mono font-bold text-rose-600">95 Days</td>
                    <td className="p-2 text-right font-mono text-rose-600 font-bold">1,055,506.85</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Annual Fund Distributions (EFY 2020 - 2024) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                Annual Fund Distributions Across Ethiopian Fiscal Years (EFY 2020 - 2024)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-bold">EFY 2020</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Br. 350.00M</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-bold">EFY 2021</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Br. 420.00M</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-bold">EFY 2022</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Br. 380.00M</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-bold">EFY 2023</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Br. 290.00M</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block font-bold">EFY 2024</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Br. 187.87M</span>
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 5.2 — Payment Certificate Data & Annual Fund Distributions:</strong> Payment milestones and annual fund allocations across EFY 2020-2024, followed by the Monthly Payment Bill Summary (IPC Maturation & Delay Interest Ledger) with USD Rate 57.5, FIDIC 14.8 Financing Rate 4% p.a., and accrued delay interest of Br. 2,623,939.73.
        </p>

        {/* FIDIC Compliance Callout */}
        <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-xl text-rose-950 dark:text-rose-300 text-2xs space-y-1">
          <strong className="block text-xs text-rose-700 dark:text-rose-400 font-bold">
            FIDIC Clause 14.8 Delayed Payment Compliance Notice:
          </strong>
          <p>
            Under FIDIC Red Book Sub-Clause 14.8, the Employer must pay the amount certified within 56 days after the Engineer receives the IPC statement. If payment is delayed, the Contractor is entitled to receive financing charges compounded monthly on the unpaid amount at an annual rate of 3% above the discount rate of the central bank (configured at 4.0% p.a.). The system automatically computes and audits accrued delay interest daily.
          </p>
        </div>

        {/* Screen Mockup: Figure 5.3 Financial Disbursement Baselines & Price Adjustment S-Curve */}
        <ScreenMockup 
          title="Figure 5.3 — Financial Disbursement Baselines & Price Adjustment S-Curve" 
          url="https://eradashboard.com.et/project/daye-girja/financial?tab=s-curve-disbursements" 
          badge="Figure 5.3"
          badgeColor="bg-purple-600"
        >
          <div className="space-y-3 text-2xs">
            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Cum. Bill Summary</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">Br. 633.40 M</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Cum. Price Adjustment</span>
                <span className="text-xs font-black text-purple-600">+Br. 41.50 M</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Cum. Price Adj %</span>
                <span className="text-xs font-black text-purple-600">6.55%</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Total Certificates</span>
                <span className="text-xs font-black text-blue-600">4 IPCs Logged</span>
              </div>
            </div>

            {/* S-Curve Chart Placeholder Representation */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-300 font-bold">
                <span>Disbursement S-Curve & Elevation Map (Baseline vs Actual)</span>
                <span className="text-emerald-400 text-[10px]">● Baseline Planned  ● Certified Payments</span>
              </div>
              <div className="h-20 flex items-end justify-between px-4 border-b border-slate-800 pb-2 text-[9px] text-slate-500 font-mono">
                <div>EFY 2020<br/><span className="text-amber-400">22%</span></div>
                <div>EFY 2021<br/><span className="text-amber-400">48%</span></div>
                <div>EFY 2022<br/><span className="text-amber-400">72%</span></div>
                <div>EFY 2023<br/><span className="text-rose-400">89%</span></div>
                <div>EFY 2024<br/><span className="text-blue-400">100%</span></div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 5.3 — Financial Disbursement Baselines & Price Adjustment S-Curve:</strong> Displays the cumulative billing total of Br. 633.40M alongside the cumulative price adjustment (+Br. 41.50M / 6.55%), 4 IPCs, and the financial elevation trajectory across the contract lifespan.
        </p>
      </section>

      {/* =========================================================================
          SECTION 6: PHYSICAL PROGRESS TRACKING AND CUMULATIVE ANALYSIS
      ========================================================================= */}
      <section id="sec-physical-progress" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">6.0</span>
          <span>Physical Progress [Fig. 6.1, 6.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Physical Progress Tracking and Cumulative Analysis</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Physical progress represents the ground-truth civil execution rate across all road works. It combines station-by-station chainage measurements, layer completion, structural works, and monthly cumulative outputs, comparing actual execution against both the Original Baseline and Approved Revised Work Programs.
        </p>

        {/* Screen Mockup: Figure 6.1 Scope Item Physical Measurement Framework */}
        <ScreenMockup 
          title="Figure 6.1 — Scope Item Physical Measurement Framework" 
          url="https://eradashboard.com.et/project/daye-girja/physical?tab=scope-items" 
          badge="Figure 6.1"
          badgeColor="bg-blue-600"
        >
          <div className="space-y-3 text-2xs">
            {/* Header / Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Total Corridor Scope: <strong className="text-blue-600">73.80 Km (65.00 Km Main + 8.80 Km Spur)</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Overall Weighted Physical: <strong className="text-amber-500 font-black">63.73%</strong></span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded font-black">
                  SPI: 0.637 (36.27% Lag)
                </span>
              </div>
            </div>

            {/* Scope Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">Major Civil Activity</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2 text-right">Contract Scope</th>
                    <th className="p-2 text-right">Executed to Date</th>
                    <th className="p-2 text-right">Scope Progress</th>
                    <th className="p-2 text-right">Target Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-medium">Site Clearing & Grubbing</td>
                    <td className="p-2 font-mono text-slate-400">Km</td>
                    <td className="p-2 text-right font-mono">73.80</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">73.80</td>
                    <td className="p-2 text-right font-bold text-emerald-600">100.00%</td>
                    <td className="p-2 text-right font-bold text-emerald-600">0.00%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Earthwork Excavation & Cut-to-Fill</td>
                    <td className="p-2 font-mono text-slate-400">m³</td>
                    <td className="p-2 text-right font-mono">1,850,000</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">1,720,500</td>
                    <td className="p-2 text-right font-bold text-emerald-600">93.00%</td>
                    <td className="p-2 text-right font-bold text-amber-600">-7.00%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Subgrade Preparation & Capping</td>
                    <td className="p-2 font-mono text-slate-400">Km</td>
                    <td className="p-2 text-right font-mono">73.80</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">65.00</td>
                    <td className="p-2 text-right font-bold text-emerald-600">88.08%</td>
                    <td className="p-2 text-right font-bold text-amber-600">-11.92%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Granular Sub-Base Construction</td>
                    <td className="p-2 font-mono text-slate-400">Km</td>
                    <td className="p-2 text-right font-mono">73.80</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">48.20</td>
                    <td className="p-2 text-right font-bold text-blue-600">65.31%</td>
                    <td className="p-2 text-right font-bold text-rose-600">-34.69%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Crushed Stone Base Course</td>
                    <td className="p-2 font-mono text-slate-400">Km</td>
                    <td className="p-2 text-right font-mono">73.80</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-500">32.40</td>
                    <td className="p-2 text-right font-bold text-amber-500">43.90%</td>
                    <td className="p-2 text-right font-bold text-rose-600">-56.10%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Asphalt Concrete Surfacing (50mm AC)</td>
                    <td className="p-2 font-mono text-slate-400">Km</td>
                    <td className="p-2 text-right font-mono">73.80</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">18.50</td>
                    <td className="p-2 text-right font-bold text-rose-600">25.07%</td>
                    <td className="p-2 text-right font-bold text-rose-600">-74.93%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Pipe Culverts & Slab Crossings</td>
                    <td className="p-2 font-mono text-slate-400">No.</td>
                    <td className="p-2 text-right font-mono">148</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">132</td>
                    <td className="p-2 text-right font-bold text-emerald-600">89.19%</td>
                    <td className="p-2 text-right font-bold text-amber-600">-10.81%</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Major Bridges & Box Culverts</td>
                    <td className="p-2 font-mono text-slate-400">No.</td>
                    <td className="p-2 text-right font-mono">6</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">4</td>
                    <td className="p-2 text-right font-bold text-blue-600">66.67%</td>
                    <td className="p-2 text-right font-bold text-amber-600">-33.33%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 6.1 — Scope Item Physical Measurement Framework:</strong> Major civil activities with contract scope quantities, executed quantities, scope completion percentage, and schedule variance against target milestones.
        </p>

        {/* Screen Mockup: Figure 6.2 S-Curve Tracking */}
        <ScreenMockup 
          title="Figure 6.2 — S-Curve Tracking: Planned vs Revised vs Actual" 
          url="https://eradashboard.com.et/project/daye-girja/physical?tab=s-curve" 
          badge="Figure 6.2"
          badgeColor="bg-amber-600"
        >
          <div className="space-y-3 text-2xs">
            {/* S-Curve Graphic Container */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-slate-300 font-bold">
                <span>Cumulative Physical S-Curve (Jan 2021 to Aug 2026)</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-amber-400 rounded-full inline-block"></span> Baseline Plan</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-blue-400 rounded-full inline-block"></span> Revised Plan</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-emerald-400 rounded-full inline-block"></span> Actual (63.73%)</span>
                </div>
              </div>

              {/* Graphical curve trajectory representation */}
              <div className="h-28 flex items-end justify-between px-3 border-b border-slate-800 pb-2 font-mono text-[9px] text-slate-400">
                <div className="text-center"><span className="text-slate-500 block">Jan-21</span>10%</div>
                <div className="text-center"><span className="text-slate-500 block">Jan-22</span>28%</div>
                <div className="text-center"><span className="text-slate-500 block">Jan-23</span>45%</div>
                <div className="text-center"><span className="text-slate-500 block">Jan-24</span>56%</div>
                <div className="text-center"><span className="text-emerald-400 font-bold block">Current</span><strong className="text-emerald-400 text-xs">63.73%</strong></div>
                <div className="text-center"><span className="text-blue-400 block">Dec-25 (Rev)</span>100%</div>
                <div className="text-center"><span className="text-slate-500 block">Aug-26</span>Defects</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-bold">Earned Value (EV)</span>
                  <span className="font-mono font-bold text-emerald-400">63.73%</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-bold">Planned Value (PV)</span>
                  <span className="font-mono font-bold text-blue-400">100.00%</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-bold">Schedule Variance (SV)</span>
                  <span className="font-mono font-bold text-rose-400">-36.27%</span>
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 6.2 — S-Curve Tracking: Planned vs Revised vs Actual:</strong> Shows the cumulative S-Curve trajectory from contract commencement to completion, plotting baseline milestones against the revised schedule and actual ground completion.
        </p>

        {/* Step-by-Step Guidance */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Update and Audit Physical Progress
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Navigate to Physical Progress:</strong> Click the "Physical Progress" tab on the sub-navigation strip.</li>
            <li><strong>Enter Executed Quantities:</strong> For each scope item, enter the certified monthly quantity approved by the Resident Engineer. The platform recalculates the activity percentage and overall project weighting instantly.</li>
            <li><strong>Inspect Schedule Lag:</strong> If the Schedule Performance Index (SPI = EV / PV) falls below 0.85, the platform flags the project with a high-priority caution tag and alerts the Directorate Director.</li>
            <li><strong>Commit to Database:</strong> Click "Save Progress" to write the updated completion values into the permanent audit ledger.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: ISSUE LOG, DELAY EVENTS AND CONTRACT CLAIMS
      ========================================================================= */}
      <section id="sec-issue-log" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">7.0</span>
          <span>Claims & Delay Events [Fig. 7.1, 7.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Issue Log, Delay Events and Contract Claims</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          The Issue and Claims module captures contractual delay events, contractor claims submitted under FIDIC Clause 20.1, site bottlenecks, and engineer determinations. It provides full transparency over Extension of Time (EOT) requests and financial prolongation claims.
        </p>

        {/* Screen Mockup: Figure 7.1 Active Claims Register */}
        <ScreenMockup 
          title="Figure 7.1 — Active Claims & Delay Event Register" 
          url="https://eradashboard.com.et/project/daye-girja/issues?tab=claims-register" 
          badge="Figure 7.1"
          badgeColor="bg-rose-600"
        >
          <div className="space-y-3 text-2xs">
            {/* Filter & Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Registered Contract Claims: <strong className="text-rose-600">4 Active Claims</strong>
              </span>
              <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-2xs font-bold shadow-xs">
                + Register New Claim Notice (FIDIC 20.1)
              </span>
            </div>

            {/* Claims Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">Claim ID</th>
                    <th className="p-2">Notice Date</th>
                    <th className="p-2">Event Description & Location</th>
                    <th className="p-2">Delay Category</th>
                    <th className="p-2 text-right">Claimed EOT</th>
                    <th className="p-2 text-right">Claimed Cost</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">CLAIM-01</td>
                    <td className="p-2">2021-04-12</td>
                    <td className="p-2 font-medium">Delay in EEU electric pole relocation (Km 14+200 - 18+500)</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Right of Way</span></td>
                    <td className="p-2 text-right font-mono font-bold">120 Days</td>
                    <td className="p-2 text-right font-mono">Br. 42,000,000</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Approved (+120d)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">CLAIM-02</td>
                    <td className="p-2">2022-01-18</td>
                    <td className="p-2 font-medium">Community compensation disputes at Meleya borrow pit #4</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Expropriation</span></td>
                    <td className="p-2 text-right font-mono font-bold">90 Days</td>
                    <td className="p-2 text-right font-mono">Br. 18,500,000</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Approved (+60d)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">CLAIM-03</td>
                    <td className="p-2">2023-08-05</td>
                    <td className="p-2 font-medium">Unseasonal heavy storm flood washing out culvert foundations</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">Force Majeure</span></td>
                    <td className="p-2 text-right font-mono font-bold">45 Days</td>
                    <td className="p-2 text-right font-mono">Br. 11,663,600</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Consultant Review</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-rose-600">CLAIM-04</td>
                    <td className="p-2">2024-02-10</td>
                    <td className="p-2 font-medium">Delayed issuance of revised bridge structural drawings (Km 42+100)</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Design Revision</span></td>
                    <td className="p-2 text-right font-mono font-bold">75 Days</td>
                    <td className="p-2 text-right font-mono">Br. 24,000,000</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Under Evaluation</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 7.1 — Active Claims & Delay Event Register:</strong> Captures formal contractor claim notices, event descriptions, delay categories, claimed Extension of Time (EOT in calendar days), claimed prolongation costs, and determination status.
        </p>

        {/* Screen Mockup: Figure 7.2 Claims Resolution Workflow */}
        <ScreenMockup 
          title="Figure 7.2 — Claims Resolution Workflow & EOT Determination Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/issues?tab=workflow" 
          badge="Figure 7.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
              FIDIC 20.1 Four-Stage Claim Resolution Procedure
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-mono font-bold text-blue-600 block">Stage 1: Notice</span>
                <p className="text-slate-500 text-[10px]">Within 28 days of event occurrence (FIDIC 20.1 mandatory deadline).</p>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px]">Contractor</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-mono font-bold text-blue-600 block">Stage 2: Particulars</span>
                <p className="text-slate-500 text-[10px]">Fully detailed claim particulars & contemporary records within 42 days.</p>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px]">Contractor</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-mono font-bold text-amber-600 block">Stage 3: Determination</span>
                <p className="text-slate-500 text-[10px]">Engineer evaluates contemporary site logs and issues determination.</p>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px]">Supervision Eng.</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-mono font-bold text-emerald-600 block">Stage 4: Addendum</span>
                <p className="text-slate-500 text-[10px]">ERA Approver issues contract amendment & updates revised completion date.</p>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">ERA Directorate</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 7.2 — Claims Resolution Workflow & EOT Determination Matrix:</strong> Displays the contractual timeline from initial Notice of Claim (28-day rule) through detailed particulars, Engineer determination, and Employer contract amendment.
        </p>
      </section>

      {/* =========================================================================
          SECTION 8: LINEAR PROGRESS & ALIGNMENT ELEVATION DIAGRAM
      ========================================================================= */}
      <section id="sec-linear" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">8.0</span>
          <span>Linear Progress [Fig. 8.1, 8.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Linear Progress & Alignment Elevation Diagram</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Station-by-station chainage elevation mapping for road layers across both Main Road (65.00 Km) and Spur Road (8.80 Km) sections. Visualizes civil stratigraphy from earthwork subgrade through granular sub-base, crushed rock base, and final asphalt concrete wearing course.
        </p>

        {/* Screen Mockup: Figure 8.1 Linear Road Layer Elevation Diagram */}
        <ScreenMockup 
          title="Figure 8.1 — Linear Road Layer Elevation Diagram" 
          url="https://eradashboard.com.et/project/daye-girja/linear?alignment=main-road" 
          badge="Figure 8.1"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold">Main Road (65.00 Km)</span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold">Spur Road (8.80 Km)</span>
              </div>
              <span className="text-slate-500 font-medium">Capping Layer Specification: <strong className="text-emerald-600 font-bold">ACTIVE</strong></span>
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>1. Earthwork / Subgrade Formation</span>
                  <span className="text-emerald-600">65.00 Km / 65.00 Km (100.00%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="w-full h-full bg-emerald-500 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>2. Granular Sub-base (200mm)</span>
                  <span className="text-blue-600">48.20 Km / 65.00 Km (74.15%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="w-[74.15%] h-full bg-blue-600 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>3. Crushed Stone Base Course (150mm)</span>
                  <span className="text-amber-600">32.40 Km / 65.00 Km (49.85%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="w-[49.85%] h-full bg-amber-500 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>4. Asphalt Concrete Surfacing (50mm AC)</span>
                  <span className="text-rose-600">18.50 Km / 65.00 Km (28.46%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className="w-[28.46%] h-full bg-rose-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 8.1 — Linear Road Layer Elevation Diagram:</strong> Layer stratigraphy along the road alignment, tracking continuous linear kilometer completion from earthwork subgrade to asphalt wearing course.
        </p>

        {/* Screen Mockup: Figure 8.2 Longitudinal Profile & Bottlenecks */}
        <ScreenMockup 
          title="Figure 8.2 — Longitudinal Profile & Bottleneck Visualization" 
          url="https://eradashboard.com.et/project/daye-girja/linear?view=longitudinal" 
          badge="Figure 8.2"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-2xs text-slate-300">
            <div className="flex justify-between items-center font-bold">
              <span>Longitudinal Elevation Profile (Km 0+000 to Km 65+000)</span>
              <span className="text-amber-400 font-mono text-[10px]">Elevation Range: 1,750m - 2,340m a.s.l.</span>
            </div>

            {/* Simulated chainage profile with highlighted bottlenecks */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>Km 0+000 (Daye Town)</span>
                <span className="text-rose-400 font-bold">Km 14+200 - 18+500 (EEU Poles Bottleneck)</span>
                <span className="text-amber-400 font-bold">Km 31+000 - 33+400 (Escarpment Cut)</span>
                <span className="text-blue-400 font-bold">Km 42+100 (Bridge Site)</span>
                <span>Km 65+000 (Girja Junction)</span>
              </div>
              <div className="h-12 w-full bg-gradient-to-r from-emerald-950 via-rose-950 to-blue-950 rounded-md border border-slate-700 flex items-center justify-between px-3 text-[10px] font-bold">
                <span className="text-emerald-400">Paved Asphalt (Km 0-18.5)</span>
                <span className="text-rose-400 animate-pulse">Obstruction Zone</span>
                <span className="text-amber-400">Base Course Complete</span>
                <span className="text-blue-400">Bridge Abutments</span>
                <span className="text-slate-400">Earthwork Done</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 8.2 — Longitudinal Profile & Bottleneck Visualization:</strong> Correlates topographic elevations with critical site bottlenecks, utility obstructions, and major river crossing structures.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Log Chainage Intervals
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Select Road Alignment:</strong> Click the toggle switch for <strong>Main Road</strong> (65.00 Km) or <strong>Spur Road</strong> (8.80 Km).</li>
            <li><strong>Click + Add Chainage Interval:</strong> Open the interval modal next to the target structural layer.</li>
            <li><strong>Input Stationing:</strong> Type the <em>From Station</em> (e.g., Km 18+500) and <em>To Station</em> (e.g., Km 24+200). The system computes net length and updates coverage bars automatically.</li>
            <li><strong>Commit Changes:</strong> Click "Save to Database" to synchronize layer lengths with global progress metrics.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: UTILITIES, RIGHT OF WAY (ROW) & OBSTRUCTIONS
      ========================================================================= */}
      <section id="sec-row" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">9.0</span>
          <span>Site & Right of Way [Fig. 9.1, 9.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Utilities, Right of Way (ROW) & Obstructions</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Tracks the comprehensive 11-parameter relocation summary, Project Affected Persons (PAP) compensation disbursement, and public utility clearances across Ethiopian Electric Utility (EEU) power poles, Ethio Telecom lines, and municipal water supply pipes.
        </p>

        {/* Screen Mockup: Figure 9.1 11-Parameter Utility Relocation */}
        <ScreenMockup 
          title="Figure 9.1 — 11-Parameter Utility Relocation Tracking" 
          url="https://eradashboard.com.et/project/daye-girja/row?view=11-parameters" 
          badge="Figure 9.1"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Total Corridor</span>
                <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">73.80 Km</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Obstruction Free</span>
                <span className="font-mono font-black text-emerald-600 text-sm">53.23 Km (72.1%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Compensation Paid</span>
                <span className="font-mono font-black text-blue-600 text-sm">Br. 142.50 M</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Unpaid Liability</span>
                <span className="font-mono font-black text-rose-600 text-sm">Br. 100,993.25 M</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">⚡ Utility Obstruction Ledger:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">EEU Electric Poles</span>
                  <span className="font-bold text-rose-600">466 Req / 298 Done / 168 Pending</span>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Ethio Telecom Cables</span>
                  <span className="font-bold text-emerald-600">14.2 Km Cleared / 0 Pending</span>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block">Water Supply Pipelines</span>
                  <span className="font-bold text-amber-600">8.4 Km Cleared / 2.1 Km Active</span>
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 9.1 — 11-Parameter Utility Relocation Tracking:</strong> Summarizes corridor handover status, utility obstruction counts, and financial compensation liabilities for road corridor liberation.
        </p>

        {/* Screen Mockup: Figure 9.2 PAP Compensation */}
        <ScreenMockup 
          title="Figure 9.2 — Project Affected Persons (PAP) Compensation Ledger" 
          url="https://eradashboard.com.et/project/daye-girja/row?view=pap-ledger" 
          badge="Figure 9.2"
          badgeColor="bg-blue-600"
        >
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2">PAP ID</th>
                  <th className="p-2">Owner Name</th>
                  <th className="p-2">Kebele / Woreda</th>
                  <th className="p-2">Property Type</th>
                  <th className="p-2 text-right">Valuation (Br.)</th>
                  <th className="p-2 text-right">Paid to Date</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2 font-mono font-bold text-blue-600">PAP-041</td>
                  <td className="p-2 font-medium">Ato Tadesse Bekele</td>
                  <td className="p-2">Daye Town, 02</td>
                  <td className="p-2">Residential House & Fence</td>
                  <td className="p-2 text-right font-mono">1,450,000.00</td>
                  <td className="p-2 text-right font-mono text-emerald-600 font-bold">1,450,000.00</td>
                  <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Cleared</span></td>
                </tr>
                <tr>
                  <td className="p-2 font-mono font-bold text-blue-600">PAP-089</td>
                  <td className="p-2 font-medium">W/ro Almaz Wolde</td>
                  <td className="p-2">Girja Woreda, Meleya</td>
                  <td className="p-2">Enset & Coffee Plantation</td>
                  <td className="p-2 text-right font-mono">820,000.00</td>
                  <td className="p-2 text-right font-mono text-emerald-600 font-bold">820,000.00</td>
                  <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Cleared</span></td>
                </tr>
                <tr>
                  <td className="p-2 font-mono font-bold text-blue-600">PAP-114</td>
                  <td className="p-2 font-medium">Ato Berhanu Lemma</td>
                  <td className="p-2">Bura Kebele</td>
                  <td className="p-2">Commercial Store & Land</td>
                  <td className="p-2 text-right font-mono">2,180,000.00</td>
                  <td className="p-2 text-right font-mono text-amber-600 font-bold">0.00</td>
                  <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">Dispute in Court</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 9.2 — Project Affected Persons (PAP) Compensation Ledger:</strong> Individual property valuation records, payment disbursements, and expropriation court dispute tracking.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Update Utility Relocations and PAP Records
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access the Module:</strong> Select "Utilities & ROW" on the project sub-navigation menu.</li>
            <li><strong>Audit Utility Poles:</strong> In the EEU section, enter verified pole counts moved by Ethiopian Electric Utility field crews.</li>
            <li><strong>Register PAP Disbarments:</strong> Click <strong>+ Add PAP Record</strong> to record property valuation, landowner name, Kebele location, and compensation status.</li>
            <li><strong>Sync Corridor Liberation:</strong> As segments are cleared, update the obstruction-free kilometer metric to refresh the portfolio dashboard.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: PROGRESS COMPARISONS & PLANNED VS ACTUAL S-CURVES
      ========================================================================= */}
      <section id="sec-progress-comparison" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">10.0</span>
          <span>Benchmarking [Fig. 10.1, 10.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Progress Comparisons & Planned vs Actual S-Curves</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Triangulates three distinct schedule benchmarks: 1) Contractor Approved Baseline Program, 2) ERA Internal Executive Target, and 3) Actual Verified Kilometers Completed. Tracks monthly execution rates, quarterly targets, and Ethiopian Fiscal Year (EFY) cumulative goals.
        </p>

        {/* Screen Mockup: Figure 10.1 Progress Comparison Mileage Horizons */}
        <ScreenMockup 
          title="Figure 10.1 — Multi-Schedule Triangulation & Mileage Horizon Table" 
          url="https://eradashboard.com.et/project/daye-girja/comparisons?view=mileage-horizons" 
          badge="Figure 10.1"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Active Horizon: Month 54 (EFY 2018 Mid-Year Audit)</span>
              <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px]">
                Archive Elapsed Month
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">Schedule Tier</th>
                    <th className="p-2 text-right">Monthly Plan</th>
                    <th className="p-2 text-right">Quarterly Target</th>
                    <th className="p-2 text-right">Cumulative Km</th>
                    <th className="p-2">Variance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-bold text-blue-600">1. Contractor Baseline Program</td>
                    <td className="p-2 text-right font-mono">2.75 Km</td>
                    <td className="p-2 text-right font-mono">5.12 Km</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">65.00 Km</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Contractual Basis</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-purple-600">2. ERA Internal Target Plan</td>
                    <td className="p-2 text-right font-mono">1.50 Km</td>
                    <td className="p-2 text-right font-mono">3.00 Km</td>
                    <td className="p-2 text-right font-mono font-bold text-purple-600">34.50 Km</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">Employer Benchmark</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-emerald-600">3. Actual Completed TODATE</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">2.28 Km</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">3.73 Km</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">27.29 Km</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">-7.21 Km vs Target</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 10.1 — Multi-Schedule Triangulation & Mileage Horizon Table:</strong> Compares planned vs target vs actual physical execution in both monthly increments and cumulative road kilometers.
        </p>

        {/* Screen Mockup: Figure 10.2 EFY Target Allocation */}
        <ScreenMockup 
          title="Figure 10.2 — Ethiopian Fiscal Year (EFY) Target Allocation vs Actual Execution" 
          url="https://eradashboard.com.et/project/daye-girja/comparisons?view=efy-targets" 
          badge="Figure 10.2"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <span className="font-bold text-slate-200 block">Ethiopian Fiscal Year Cumulative Deliverables (EFY 2014 to EFY 2018)</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block font-bold">EFY 2014</span>
                <span className="text-emerald-400 font-bold block">4.20 Km</span>
                <span className="text-[8px] text-slate-500">Achieved 100%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block font-bold">EFY 2015</span>
                <span className="text-emerald-400 font-bold block">8.50 Km</span>
                <span className="text-[8px] text-slate-500">Achieved 94%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block font-bold">EFY 2016</span>
                <span className="text-emerald-400 font-bold block">7.10 Km</span>
                <span className="text-[8px] text-slate-500">Achieved 82%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block font-bold">EFY 2017</span>
                <span className="text-amber-400 font-bold block">5.21 Km</span>
                <span className="text-[8px] text-slate-500">Achieved 68%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
                <span className="text-slate-400 block font-bold">EFY 2018 (Current)</span>
                <span className="text-blue-400 font-bold block">2.28 Km</span>
                <span className="text-[8px] text-blue-300">Target: 9.50 Km</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 10.2 — Ethiopian Fiscal Year (EFY) Target Allocation vs Actual Execution:</strong> Shows fiscal year annual road delivery targets matched against actual site handover kilometers.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Benchmark Progress Comparisons
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open Comparisons Tab:</strong> Click the "Progress Comparisons" link on the project navigation bar.</li>
            <li><strong>Select Schedule Horizon:</strong> Switch between Monthly, Quarterly, or Ethiopian Fiscal Year (EFY) scopes.</li>
            <li><strong>Audit Schedule Lag:</strong> Compare contractor planned output against actual site execution to assess potential critical path slippage.</li>
            <li><strong>Archive Elapsed Period:</strong> Click "Keep Elapsed Record" to lock the completed month's records into the immutable ERA audit archive.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: QUANTITIES LOG & BILL ITEM TRACKING
      ========================================================================= */}
      <section id="sec-quantities" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">11.0</span>
          <span>Technical Quantities [Fig. 11.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Quantities Log & Bill Item Tracking</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Maintains item-by-item engineering measurement sheets correlated with Contract Bill of Quantities (BoQ) item numbers. Calculates automated quantity overrun/underrun variances and conformance percentages against contract limits.
        </p>

        {/* Screen Mockup: Figure 11.1 Quantities Conformance Log */}
        <ScreenMockup 
          title="Figure 11.1 — Engineering Quantities Conformance & Overrun / Underrun Analysis" 
          url="https://eradashboard.com.et/project/daye-girja/quantities?tab=conformance" 
          badge="Figure 11.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">BoQ Item</th>
                    <th className="p-2">Pay Item Description</th>
                    <th className="p-2 text-right">Design Qty</th>
                    <th className="p-2 text-right">Executed to Date</th>
                    <th className="p-2 text-right">Variance</th>
                    <th className="p-2">Conformance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">1.02</td>
                    <td className="p-2 font-medium">Site Clearing & Grubbing (Ha)</td>
                    <td className="p-2 text-right font-mono">2,222.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">2,302.66</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">+3.63%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">103.63% (Normal)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">2.01</td>
                    <td className="p-2 font-medium">Roadway Common Excavation (m³)</td>
                    <td className="p-2 text-right font-mono">2,321,847.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">2,219,450.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">-4.41%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">95.59% (Normal)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">3.03</td>
                    <td className="p-2 font-medium">Crushed Stone Base Course (m³)</td>
                    <td className="p-2 text-right font-mono">145,200.00</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">81,878.00</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">-43.61%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">56.39% (Lagging)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">4.01</td>
                    <td className="p-2 font-medium">Asphalt Concrete Surfacing (m²)</td>
                    <td className="p-2 text-right font-mono">510,000.00</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">127,850.00</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">-74.93%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">25.07% (Critical Lag)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 11.1 — Engineering Quantities Conformance & Overrun / Underrun Analysis:</strong> Displays pay item numbers, unit quantities, certified executed quantities to date, and percentage conformance thresholds.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Log and Audit Quantities
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Quantities Log:</strong> Click the "Quantities Log" tab on the project navigation strip.</li>
            <li><strong>Enter Certified Quantities:</strong> For each BoQ pay item, input the joint measurement sheet volumes approved by the Resident Engineer.</li>
            <li><strong>Monitor Threshold Alerts:</strong> If an item exceeds 115% of contract volume, the platform flags a potential Variation Order threshold violation under PPA/FIDIC rules.</li>
            <li><strong>Save Measurements:</strong> Click "Save to Database" to sync revised quantities with IPC division valuations.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 12: SECURITIES, GUARANTEES AND INSURANCES
      ========================================================================= */}
      <section id="sec-bonds" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">12.0</span>
          <span>Compliance & Securities [Fig. 12.1, 12.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Securities, Guarantees and Insurances</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Manages all mandatory financial instruments under FIDIC Red Book conditions: Performance Security (10%), Advance Payment Guarantee with automatic monthly amortization deductions, Retention Money Securities, and Contractor's All Risks (CAR) / Third-Party Liability insurance policies.
        </p>

        {/* Screen Mockup: Figure 12.1 Bank Guarantee Register */}
        <ScreenMockup 
          title="Figure 12.1 — Bank Guarantee Register & 45-Day Expiry Countdown" 
          url="https://eradashboard.com.et/project/daye-girja/bonds?tab=guarantees" 
          badge="Figure 12.1"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Registered Securities: 4 Active Instruments</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] shadow-xs">
                + Register Bank Guarantee
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">1. Performance Security (Commercial Bank of Ethiopia)</div>
                  <div className="text-slate-500 font-mono text-[10px]">Ref: CBE/LG/2021/4891 | Value: Br. 155,570,816.79 (USD $1,350,000.00)</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] block">VALID (Exp: 31-Dec-2027)</span>
                  <span className="text-emerald-600 font-bold text-[10px]">678 Days Remaining</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">2. Advance Payment Guarantee (Awash Bank S.C.)</div>
                  <div className="text-slate-500 font-mono text-[10px]">Ref: AWB/APG/7782 | Value: Br. 242,100,998.82 | Amortized: Br. 242,100,998.82 (100%)</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[9px] block">FULLY AMORTIZED</span>
                  <span className="text-slate-400 font-bold text-[10px]">Returned to Contractor</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">3. Retention Money Guarantee (Nib International Bank)</div>
                  <div className="text-slate-500 font-mono text-[10px]">Ref: NIB/RET/2023/102 | Value: Br. 50,000,000.00 (USD $435,000.00)</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px] block">EXPIRING SOON (15-Apr-2026)</span>
                  <span className="text-amber-600 font-bold text-[10px]">38 Days Remaining ⚠</span>
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 12.1 — Bank Guarantee Register & 45-Day Expiry Countdown:</strong> Visualizes guarantee references, issuing commercial banks, dual ETB/USD valuations, expiration dates, and automated warning badges for bonds expiring within 45 days.
        </p>

        {/* Screen Mockup: Figure 12.2 Amortization & Insurance */}
        <ScreenMockup 
          title="Figure 12.2 — Advance Payment Amortization & Retention Release Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/bonds?tab=amortization" 
          badge="Figure 12.2"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Advance Payment Received</span>
                <span className="font-mono text-white font-bold text-sm">Br. 242.10 M</span>
                <span className="text-slate-500 text-[10px] block">30% Total Mobilization Advance</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Total Amortized via IPCs</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">Br. 242.10 M (100%)</span>
                <span className="text-emerald-500 text-[10px] block">Fully Recovered at IPC #4</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Retention Fund Held</span>
                <span className="font-mono text-amber-400 font-bold text-sm">Br. 31.67 M (5%)</span>
                <span className="text-amber-500 text-[10px] block">50% release at Substantial Completion</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 12.2 — Advance Payment Amortization & Retention Release Matrix:</strong> Monitors progressive deductions across IPC certificates and retention releases at Taking-Over vs Final Acceptance.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Register and Monitor Securities
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Securities Module:</strong> Click "Bonds & Securities" on the navigation bar.</li>
            <li><strong>Register New Guarantee:</strong> Click <strong>+ Add Guarantee</strong>. Enter issuing bank name, guarantee reference code, monetary values (ETB and foreign currency if applicable), and formal expiry date.</li>
            <li><strong>Automated Expiry Alerts:</strong> The platform initiates daily checks. Any guarantee within 45 days of expiration displays an amber warning tag and sends automated renewal notices to the Contractor and Resident Engineer.</li>
            <li><strong>Update Amortization:</strong> Upon verification of monthly IPC deductions, update the amortization status to reflect accurate remaining liability.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 13: ERA 10-AREA KPI PERFORMANCE EVALUATION
      ========================================================================= */}
      <section id="sec-kpi-detail" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">13.0</span>
          <span>Contractor Evaluation [Fig. 13.1, 13.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">ERA 10-Area KPI Performance Evaluation</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Implements the official ERA Standard Contractor Audit KPI Matrix across 10 distinct evaluation areas. Calculates weighted composite ratings, flags performance risks, and issues formal remedial notices.
        </p>

        {/* Screen Mockup: Figure 13.1 10-Area KPI Scorecard */}
        <ScreenMockup 
          title="Figure 13.1 — 10-Area Contractor KPI Scorecard & Weight Allocation" 
          url="https://eradashboard.com.et/project/daye-girja/kpi?view=scorecard" 
          badge="Figure 13.1"
          badgeColor="bg-purple-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Contractor Grade: G1 International Joint Venture</span>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-lg text-2xs font-black">
                Composite Rating: 63.74% (Grade C — At Risk)
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">#</th>
                    <th className="p-2">Evaluation Area</th>
                    <th className="p-2 text-right">Weight</th>
                    <th className="p-2 text-right">Raw Score</th>
                    <th className="p-2 text-right">Weighted Score</th>
                    <th className="p-2">Risk Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono">01</td>
                    <td className="p-2 font-medium">Physical Progress & Schedule Adherence</td>
                    <td className="p-2 text-right font-mono">20.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">63.73%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">12.75%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">High Risk</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">02</td>
                    <td className="p-2 font-medium">Equipment Mobilization & Availability</td>
                    <td className="p-2 text-right font-mono">15.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">75.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">11.25%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Moderate</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">03</td>
                    <td className="p-2 font-medium">Key Personnel & Project Management</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">90.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">9.00%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Low Risk</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">04</td>
                    <td className="p-2 font-medium">Quality Control & Laboratory Testing</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">82.50%</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">8.25%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Acceptable</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">05</td>
                    <td className="p-2 font-medium">Environmental & Social Management (ESMP)</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">70.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">7.00%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Moderate</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">06</td>
                    <td className="p-2 font-medium">Health, Safety & Traffic Management (HSE)</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">68.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">6.80%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Moderate</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">07</td>
                    <td className="p-2 font-medium">Financial Liquidity & Subcontractor Payments</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">55.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">5.50%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">High Risk</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">08</td>
                    <td className="p-2 font-medium">Right-of-Way Cooperation & Public Relations</td>
                    <td className="p-2 text-right font-mono">5.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">80.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">4.00%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">Acceptable</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">09</td>
                    <td className="p-2 font-medium">Material Procurement & Stockpiling</td>
                    <td className="p-2 text-right font-mono">5.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">50.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">2.50%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">Critical Deficit</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">10</td>
                    <td className="p-2 font-medium">Contractual Compliance & As-Built Documentation</td>
                    <td className="p-2 text-right font-mono">5.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">70.00%</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">3.50%</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Moderate</span></td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-950 font-bold">
                    <td colSpan={2} className="p-2 text-slate-900 dark:text-white">Total Composite Evaluation</td>
                    <td className="p-2 text-right font-mono">100.00%</td>
                    <td className="p-2 text-right font-mono">-</td>
                    <td className="p-2 text-right font-mono text-purple-600">63.74%</td>
                    <td className="p-2"><span className="px-2 py-0.5 bg-amber-500 text-white rounded font-black text-[9px]">GRADE C (63.74%)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 13.1 — 10-Area Contractor KPI Scorecard & Weight Allocation:</strong> Displays weight allocation across 10 evaluation categories, certified raw ratings, weighted composites, and Grade classification.
        </p>

        {/* Screen Mockup: Figure 13.2 Radar Chart & Risk Categorization */}
        <ScreenMockup 
          title="Figure 13.2 — Monthly KPI Historical Radar Chart & Risk Categorization" 
          url="https://eradashboard.com.et/project/daye-girja/kpi?view=radar" 
          badge="Figure 13.2"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="flex justify-between items-center font-bold">
              <span>Performance Radar Profile (10 Dimension Analysis)</span>
              <span className="text-purple-400 font-mono text-[10px]">Benchmark Threshold: 75.00%</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-around text-[10px]">
              <div className="text-center">
                <span className="text-emerald-400 font-bold block text-sm">90%</span>
                <span className="text-slate-400">Personnel</span>
              </div>
              <div className="text-center">
                <span className="text-blue-400 font-bold block text-sm">82%</span>
                <span className="text-slate-400">Quality</span>
              </div>
              <div className="text-center">
                <span className="text-amber-400 font-bold block text-sm">75%</span>
                <span className="text-slate-400">Equipment</span>
              </div>
              <div className="text-center">
                <span className="text-rose-400 font-bold block text-sm">63%</span>
                <span className="text-slate-400">Progress</span>
              </div>
              <div className="text-center">
                <span className="text-rose-500 font-bold block text-sm">50%</span>
                <span className="text-slate-400">Materials</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 13.2 — Monthly KPI Historical Radar Chart & Risk Categorization:</strong> Identifies lagging performance dimensions, comparing monthly scores against the minimum acceptable ERA threshold of 75%.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Conduct Monthly KPI Performance Audits
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access KPI Module:</strong> Navigate to "KPIs" on the project navigation sub-menu.</li>
            <li><strong>Select Evaluation Profile:</strong> Choose Contractor Grade profile (G1, G2, etc.). The system pre-loads standard ERA weight distributions.</li>
            <li><strong>Score Categories:</strong> Enter raw scores (0–100%) for each of the 10 evaluation categories based on joint consultant inspection logs.</li>
            <li><strong>Verify Total Weights:</strong> The platform validates that weights sum to exactly 100%.</li>
            <li><strong>Submit Evaluation:</strong> Click "Save KPI Allocation" to generate the official score certificate and composite grade rating.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 14: INTERIM PAYMENT CERTIFICATES (IPC) & FINANCIAL LEDGER
      ========================================================================= */}
      <section id="sec-payment-certificates" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">14.0</span>
          <span>Financial Disbursement [Fig. 14.1, 14.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Interim Payment Certificates (IPC) & Financial Ledger</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Comprehensive financial disbursement register tracking certified work values, advance mobilization amortizations, retention deductions, price adjustment indices, and net payable amounts across monthly IPC certificates.
        </p>

        {/* Screen Mockup: Figure 14.1 IPC Ledger */}
        <ScreenMockup 
          title="Figure 14.1 — Interim Payment Certificate (IPC) Disbursement Ledger" 
          url="https://eradashboard.com.et/project/daye-girja/financials?tab=ipc-ledger" 
          badge="Figure 14.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">IPC Record History: 5 Certified Certificates</span>
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] shadow-xs">
                + Process New IPC
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">IPC No.</th>
                    <th className="p-2">Submission Date</th>
                    <th className="p-2 text-right">Gross Certified (Br.)</th>
                    <th className="p-2 text-right">Deductions (Br.)</th>
                    <th className="p-2 text-right">Net Certified (Br.)</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC #01</td>
                    <td className="p-2 text-slate-500">15-Oct-2022</td>
                    <td className="p-2 text-right font-mono">145,210,000.00</td>
                    <td className="p-2 text-right font-mono text-rose-600">43,563,000.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">101,647,000.00</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Disbursed (MoF)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC #02</td>
                    <td className="p-2 text-slate-500">22-Mar-2023</td>
                    <td className="p-2 text-right font-mono">189,450,000.00</td>
                    <td className="p-2 text-right font-mono text-rose-600">56,835,000.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">132,615,000.00</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Disbursed (MoF)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC #03</td>
                    <td className="p-2 text-slate-500">18-Nov-2023</td>
                    <td className="p-2 text-right font-mono">152,800,000.00</td>
                    <td className="p-2 text-right font-mono text-rose-600">45,840,000.00</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">106,960,000.00</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Disbursed (MoF)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">IPC #04</td>
                    <td className="p-2 text-slate-500">10-Jun-2024</td>
                    <td className="p-2 text-right font-mono">145,887,600.00</td>
                    <td className="p-2 text-right font-mono text-rose-600">95,862,998.82</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">50,024,601.18</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Disbursed (MoF)</span></td>
                  </tr>
                  <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                    <td className="p-2 font-mono font-bold text-blue-600">IPC #05</td>
                    <td className="p-2 text-slate-500">02-Feb-2026</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">128,450,210.00</td>
                    <td className="p-2 text-right font-mono text-rose-600 font-bold">6,422,510.50</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">122,027,699.50</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Under Consultant Review</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 14.1 — Interim Payment Certificate (IPC) Disbursement Ledger:</strong> Displays gross valuations, statutory contract deductions (advance recovery, retention), net certified sums, and Ministry of Finance disbursement status.
        </p>

        {/* Screen Mockup: Figure 14.2 Deductions & Escalation Breakout */}
        <ScreenMockup 
          title="Figure 14.2 — Deductions, Retention & Escalation Price Index Breakdown" 
          url="https://eradashboard.com.et/project/daye-girja/financials?tab=escalation" 
          badge="Figure 14.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Advance Amortization (IPC #04)</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">Br. 242.10 M Total</span>
                <span className="text-emerald-500 text-[10px] block">100% Fully Recovered</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Retention Deduction (5%)</span>
                <span className="font-mono text-amber-400 font-bold text-sm">Br. 31,674,890.50</span>
                <span className="text-amber-500 text-[10px] block">Held in Escrow Trust</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Fuel/Cement Escalation Index</span>
                <span className="font-mono text-blue-400 font-bold text-sm">+18.42% Price Adj.</span>
                <span className="text-blue-400 text-[10px] block">PPA Formula Cl. 47</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 14.2 — Deductions, Retention & Escalation Price Index Breakdown:</strong> Tracks itemized statutory deductions and PPA Clause 47 price escalation coefficients against national indices.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Audit and Submit Payment Certificates
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Navigate to IPC Module:</strong> Open the "Interim Payment Certificates" ledger from the financial menu.</li>
            <li><strong>Create IPC Entry:</strong> Click <strong>+ Process New IPC</strong>. Input gross work measured by engineering division.</li>
            <li><strong>Auto-Calculate Deductions:</strong> The system automatically computes advance payment recovery (if balance remains) and 5% retention deductions.</li>
            <li><strong>Apply Escalation Indices:</strong> Input Ministry of Trade published consumer/fuel/cement price indices to derive PPA price adjustment factors.</li>
            <li><strong>Consultant Certification:</strong> Upload signed Resident Engineer IPC certification and route to ERA Finance Department for MoF payment voucher issuance.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 15: VARIATION ORDERS & SCOPE CHANGE MANAGEMENT
      ========================================================================= */}
      <section id="sec-variations" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">15.0</span>
          <span>Contract Variations [Fig. 15.1, 15.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Variation Orders & Scope Change Management</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Manages formal contractual Variation Orders (VOs) under FIDIC Clause 13. Tracks design modifications, quantity increases/decreases, new unit rate derivations, and Board of Directors contingency approvals.
        </p>

        {/* Screen Mockup: Figure 15.1 Variation Order Register */}
        <ScreenMockup 
          title="Figure 15.1 — Contract Variation Order (VO) Register & Financial Impact" 
          url="https://eradashboard.com.et/project/daye-girja/variations?view=register" 
          badge="Figure 15.1"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Logged Variation Orders: 3 Addenda Recorded</span>
              <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] shadow-xs">
                + Propose Variation Order
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">VO Ref.</th>
                    <th className="p-2">Scope Description</th>
                    <th className="p-2 text-right">Cost Impact (Br.)</th>
                    <th className="p-2 text-right">Time Extension</th>
                    <th className="p-2">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">VO #01</td>
                    <td className="p-2 font-medium">Bridge Span Extension at Ch. 34+200 due to hydraulic flood model update</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">+42,500,000.00</td>
                    <td className="p-2 text-right font-mono">+60 Cal. Days</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">ERA Board Approved</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">VO #02</td>
                    <td className="p-2 font-medium">Re-alignment through Girja Town to avoid deep utility demolition</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">-12,100,000.00</td>
                    <td className="p-2 text-right font-mono">0 Days</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">ERA Approved</span></td>
                  </tr>
                  <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                    <td className="p-2 font-mono font-bold text-blue-600">VO #03</td>
                    <td className="p-2 font-medium">Upgrading 12km subgrade with lime stabilization due to black cotton soil</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-600">+58,300,000.00</td>
                    <td className="p-2 text-right font-mono">+90 Cal. Days</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Under Technical Audit</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 15.1 — Contract Variation Order (VO) Register & Financial Impact:</strong> Tracks scope change descriptions, net monetary increments/decrements, time impacts, and formal approval states.
        </p>

        {/* Screen Mockup: Figure 15.2 Contingency Absorption */}
        <ScreenMockup 
          title="Figure 15.2 — Contract Contingency Absorption & PPA Threshold Analysis" 
          url="https://eradashboard.com.et/project/daye-girja/variations?view=thresholds" 
          badge="Figure 15.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="flex justify-between items-center font-bold">
              <span>Original Contingency Allocation: Br. 155,570,816.79 (10% of Contract)</span>
              <span className="text-amber-400 font-mono text-[10px]">PPA Limit: &le; 20% Net Increase</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Approved Variations</span>
                <span className="font-mono text-emerald-400 font-bold text-sm block">Br. 30.40 M</span>
                <span className="text-slate-500 text-[8px]">19.5% Contingency Used</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Pending Variations</span>
                <span className="font-mono text-amber-400 font-bold text-sm block">Br. 58.30 M</span>
                <span className="text-amber-300 text-[8px]">VO #03 Technical Review</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Total Projected Impact</span>
                <span className="font-mono text-blue-400 font-bold text-sm block">+5.70% Net</span>
                <span className="text-blue-300 text-[8px]">Within Authorized Limit</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 15.2 — Contract Contingency Absorption & PPA Threshold Analysis:</strong> Benchmarks total cumulative variation value against Ethiopian Federal Public Procurement Agency (PPA) 20% statutory limits.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Submit and Track Variation Orders
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Initiate VO Request:</strong> Click the "Variation Orders" menu option and select <strong>+ Propose Variation Order</strong>.</li>
            <li><strong>Provide Technical Justification:</strong> Detail engineering necessity (geotechnical change, hydraulic model update, community bypass request).</li>
            <li><strong>Derive BoQ Rates:</strong> Apply existing contract unit rates where applicable; for new work items, compile rate analysis sheets backed by equipment/material/labor market quotations.</li>
            <li><strong>Audit Threshold Compliance:</strong> Ensure combined financial variation does not breach the 20% PPA ceiling without Federal Board authorization.</li>
            <li><strong>Commit Official Approval:</strong> Record the formal ERA Contract Administration Directorate or Board resolution number.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 16: WORK PROGRAM & CRITICAL PATH METHOD (CPM) SCHEDULE
      ========================================================================= */}
      <section id="sec-work-program" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">16.0</span>
          <span>CPM Scheduling [Fig. 16.1, 16.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Work Program & Critical Path Method (CPM) Schedule</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Maintains full Primavera P6 / MS Project compatible Critical Path Method (CPM) networks. Computes early/late activity dates, total and free float, zero-float critical path sequences, and visualizes interactive Gantt charts.
        </p>

        {/* Screen Mockup: Figure 16.1 Gantt Chart */}
        <ScreenMockup 
          title="Figure 16.1 — Interactive CPM Gantt Chart & Zero-Float Critical Path" 
          url="https://eradashboard.com.et/project/daye-girja/schedule?view=gantt" 
          badge="Figure 16.1"
          badgeColor="bg-red-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">WBS State: 42 Work Activities (14 Critical Path Tasks)</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px]">Critical Float: 0 Days</span>
                <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px]">Import Primavera CSV</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">WBS Code</th>
                    <th className="p-2">Activity Description</th>
                    <th className="p-2 text-right">Duration</th>
                    <th className="p-2 text-right">Total Float</th>
                    <th className="p-2">Predecessors</th>
                    <th className="p-2">Criticality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-300 font-medium">
                    <td className="p-2 font-mono font-bold text-red-600">ACT-01</td>
                    <td className="p-2">Corridor Site Clearing & Topsoil Stripping</td>
                    <td className="p-2 text-right font-mono">120 d</td>
                    <td className="p-2 text-right font-mono font-bold text-red-600">0 d</td>
                    <td className="p-2 text-slate-500">None (Start)</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-red-600 text-white rounded font-bold text-[9px]">CRITICAL</span></td>
                  </tr>
                  <tr className="bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-300 font-medium">
                    <td className="p-2 font-mono font-bold text-red-600">ACT-04</td>
                    <td className="p-2">Granular Sub-base Course (Ch 0+000 - 35+000)</td>
                    <td className="p-2 text-right font-mono">180 d</td>
                    <td className="p-2 text-right font-mono font-bold text-red-600">0 d</td>
                    <td className="p-2 text-slate-500">ACT-01 FS</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-red-600 text-white rounded font-bold text-[9px]">CRITICAL</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono font-bold text-blue-600">ACT-08</td>
                    <td className="p-2">Precast Pipe Culvert Fabrication (Ch 12+400)</td>
                    <td className="p-2 text-right font-mono">45 d</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">28 d</td>
                    <td className="p-2 text-slate-500">ACT-01 SS+15</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">Non-Critical</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 16.1 — Interactive CPM Gantt Chart & Zero-Float Critical Path:</strong> Identifies driving path activities with zero total float, predecessor link dependencies, and automated duration calculations.
        </p>

        {/* Screen Mockup: Figure 16.2 Microsoft Project (.mpp / .xml) & CSV Importer */}
        <ScreenMockup 
          title="Figure 16.2 — Microsoft Project (.mpp, .xml) & CPM Schedule Importer" 
          url="https://eradashboard.com.et/project/daye-girja/schedule?tab=import" 
          badge="Figure 16.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <span className="font-bold text-slate-200 block">MS Project (.mpp / .xml) &amp; CSV CPM Schedule Importer</span>
            <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-emerald-400 overflow-x-auto">
              Format: ID, Name, Duration, Predecessors, Lag, Sequence Type<br />
              Supports: .mpp (Microsoft Project Native), .xml (MS Project XML), .mpx, .csv, .tsv, .txt<br />
              Example: RD-101, Roadway Excavation, 90, START, 0, FS<br />
              Example: BR-201, Girja River Bridge Abutments, 120, RD-101, 15, FS
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 16.2 — Microsoft Project (.mpp, .xml) &amp; CPM Schedule Importer:</strong> Accepts native Microsoft Project files (.mpp), MS Project XML (.xml), and standard CPM CSV spreadsheets to synchronize directly into Interactive CPM Analytics &amp; Gantt Chart.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Maintain &amp; Import CPM Work Programs
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Work Program:</strong> Navigate to &quot;Work Program CPM&quot; from the main navigation menu.</li>
            <li><strong>Import MS Project Schedule:</strong> Drag-and-drop or select your <strong>.mpp</strong> file prepared by Microsoft Project (or MS Project XML / CPM CSV).</li>
            <li><strong>Synchronize CPM Engine:</strong> Click <strong>Import &amp; Sync CPM</strong>. The engine automatically parses task durations, predecessors (FS, SS, FF, SF), lag offsets, performs forward and backward passes, and synchronizes the Gantt chart and AON network.</li>
            <li><strong>Review Gantt Bars &amp; Critical Path:</strong> Red horizontal bars and badges represent critical path items with zero float; subcritical bars display positive float buffers.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 17: EQUIPMENT MOBILIZATION & KEY PERSONNEL AUDIT
      ========================================================================= */}
      <section id="sec-equipment-personnel" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">17.0</span>
          <span>Resource Auditing [Fig. 17.1, 17.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Equipment Mobilization & Key Personnel Audit</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Conducts continuous physical audits of contractor heavy machinery fleets, operational vs breakdown statuses, and key personnel deployment ratios against contractual mobilization commitments.
        </p>

        {/* Screen Mockup: Figure 17.1 Heavy Equipment Fleet Audit */}
        <ScreenMockup 
          title="Figure 17.1 — Heavy Machinery Fleet Conformance & Operational Status" 
          url="https://eradashboard.com.et/project/daye-girja/resources?tab=equipment" 
          badge="Figure 17.1"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2">Equipment Category</th>
                    <th className="p-2 text-right">Contract Required</th>
                    <th className="p-2 text-right">Site Mobilized</th>
                    <th className="p-2 text-right">Operational</th>
                    <th className="p-2 text-right">Breakdown</th>
                    <th className="p-2">Deficit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2 font-bold text-slate-900 dark:text-white">Heavy Motor Grader (&ge;160 HP)</td>
                    <td className="p-2 text-right font-mono">10 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">9 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">8 Units</td>
                    <td className="p-2 text-right font-mono text-rose-600">1 Unit</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">-1 Unit (90%)</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-900 dark:text-white">Asphalt Paver (Sensor Controlled)</td>
                    <td className="p-2 text-right font-mono">3 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">2 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">2 Units</td>
                    <td className="p-2 text-right font-mono text-slate-400">0 Units</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">-1 Deficit ⚠</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-900 dark:text-white">Hydraulic Excavator (&ge;20 Ton)</td>
                    <td className="p-2 text-right font-mono">12 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-600">12 Units</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">10 Units</td>
                    <td className="p-2 text-right font-mono text-amber-600">2 Units</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">100% Mobilized ✓</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 17.1 — Heavy Machinery Fleet Conformance & Operational Status:</strong> Quantifies fleet requirements, active machines on site, repair down-time, and contractual deficiency penalties.
        </p>

        {/* Screen Mockup: Figure 17.2 Personnel Audit */}
        <ScreenMockup 
          title="Figure 17.2 — Key Personnel Staffing Roster & Expatriate Presence Ratio" 
          url="https://eradashboard.com.et/project/daye-girja/resources?tab=personnel" 
          badge="Figure 17.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Project Manager</span>
                <span className="text-emerald-400 font-bold block">Eng. Chen Wei</span>
                <span className="text-slate-500 text-[10px]">On Site (26/30 Days This Month)</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Chief Highway Engineer</span>
                <span className="text-emerald-400 font-bold block">Eng. Dawit Kebede</span>
                <span className="text-slate-500 text-[10px]">On Site (30/30 Days This Month)</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-bold">Materials Quality Manager</span>
                <span className="text-amber-400 font-bold block">Eng. Samuel Tadesse</span>
                <span className="text-amber-300 text-[10px]">Substitution Pending ERA Review</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 17.2 — Key Personnel Staffing Roster & Expatriate Presence Ratio:</strong> Monitors on-site attendance logs for certified key management professionals and flags unapproved personnel substitutions.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Log Equipment and Staffing Conformance
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Resource Register:</strong> Click the "Logistics & Resources" tab on the main bar.</li>
            <li><strong>Conduct Equipment Roll-Call:</strong> For each required machinery classification, enter counts for operational equipment and breakdown units currently in the site workshop.</li>
            <li><strong>Review Mobilization Scoring:</strong> Check if total fleet rating drops below 80%, which automatically triggers a contractual warning letter from the Resident Engineer.</li>
            <li><strong>Verify Key Personnel:</strong> Audit monthly presence and register any formal requests for personnel replacement pursuant to FIDIC General Conditions.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 18: MATERIAL PROCUREMENT, STOCKPILES & QUALITY TESTING
      ========================================================================= */}
      <section id="sec-materials" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">18.0</span>
          <span>Material Quality [Fig. 18.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Material Procurement, Stockpiles & Quality Testing</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Tracks strategic construction materials on site, buffer days against consumption rates, aggregate crushing output, laboratory soil and concrete compressive strength test registers, and material rejection logs.
        </p>

        {/* Screen Mockup: Figure 18.1 Material Buffer & Stockpiles */}
        <ScreenMockup 
          title="Figure 18.1 — Strategic Material Buffer Days & Laboratory Test Conformance" 
          url="https://eradashboard.com.et/project/daye-girja/materials?tab=stockpiles" 
          badge="Figure 18.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Bitumen (60/70 Pen)</span>
                <span className="font-mono text-emerald-600 font-bold text-sm block">420 Tons</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">28 Buffer Days ✓</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Portland Cement (42.5R)</span>
                <span className="font-mono text-emerald-600 font-bold text-sm block">1,850 Bags</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">34 Buffer Days ✓</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Diesel Fuel Reserves</span>
                <span className="font-mono text-amber-600 font-bold text-sm block">45,000 Liters</span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px]">12 Buffer Days ⚠</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Reinforcing Steel (Grade 60)</span>
                <span className="font-mono text-emerald-600 font-bold text-sm block">180 Tons</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">45 Buffer Days ✓</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 18.1 — Strategic Material Buffer Days & Laboratory Test Conformance:</strong> Displays active stockpile volumes on site, consumption runway in calendar days, and threshold warnings when fuel or binder supplies fall below minimum safety margins.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Monitor Materials and Testing Registers
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Audit Material Buffer:</strong> Open the "Materials & Quality" tab to inspect existing bulk stockpiles against current planned consumption rates.</li>
            <li><strong>Record Laboratory Test Results:</strong> Upload compaction field density tests (AASHTO T-191) and concrete cylinder compressive strength tests (7-day and 28-day breaks).</li>
            <li><strong>Manage Non-Conformance:</strong> If tests fail standard ERA specifications, log a Non-Conformance Report (NCR) requiring contractor removal and replacement.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 19: PROJECT RISK REGISTER & HEATMAP MATRIX
      ========================================================================= */}
      <section id="sec-risks" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">19.0</span>
          <span>Risk Control [Fig. 19.1, 19.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Risk Register & Heatmap Matrix</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Quantitative hazard identification system featuring a 5x5 Probability/Impact risk heatmap, exposure index computation (Probability &times; Impact), assigned risk ownership, and proactive mitigation actions.
        </p>

        {/* Screen Mockup: Figure 19.1 Risk Register */}
        <ScreenMockup 
          title="Figure 19.1 — Project Quantitative Risk Register & Hazard Evaluation" 
          url="https://eradashboard.com.et/project/daye-girja/risks?view=register" 
          badge="Figure 19.1"
          badgeColor="bg-red-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Active Threats Logged: 6 Critical & Moderate Hazards</span>
              <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px]">+ Register New Threat</span>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg space-y-1.5 border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between font-bold text-red-700 dark:text-red-300">
                <span>R-01: Delay in Right-of-Way (ROW) Land Clearance (Ch. 14+000 - 22+000)</span>
                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px] font-mono">EXPOSURE: 20 (CRITICAL)</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <strong>Mitigation Strategy:</strong> Coordinate with Hawassa Region Land Administration Bureau to expedite property compensation fund disbursements.
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-red-100 dark:border-red-900">
                <span>Probability: 4 (Likely) | Impact: 5 (Catastrophic)</span>
                <span>Assigned Owner: ERA ROW Taskforce</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 19.1 — Project Quantitative Risk Register & Hazard Evaluation:</strong> Logs categorized contractual, legal, geotechnical, and financial risks with exposure ratings and designated mitigators.
        </p>

        {/* Screen Mockup: Figure 19.2 5x5 Heatmap */}
        <ScreenMockup 
          title="Figure 19.2 — 5x5 Probability vs Severity Risk Heatmap Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/risks?tab=heatmap" 
          badge="Figure 19.2"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 bg-emerald-950/60 border border-emerald-800 rounded">
                <span className="text-emerald-400 font-bold block text-sm">2 Risks</span>
                <span className="text-slate-400 text-[10px]">Low (Score 1–6)</span>
              </div>
              <div className="p-2 bg-amber-950/60 border border-amber-800 rounded">
                <span className="text-amber-400 font-bold block text-sm">3 Risks</span>
                <span className="text-slate-400 text-[10px]">Moderate (Score 8–15)</span>
              </div>
              <div className="p-2 bg-rose-950/60 border border-rose-800 rounded">
                <span className="text-rose-400 font-bold block text-sm">1 Risk</span>
                <span className="text-slate-400 text-[10px]">Critical (Score 16–25)</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 19.2 — 5x5 Probability vs Severity Risk Heatmap Matrix:</strong> Visualizes project threat concentration zones across standard international risk quadrants.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Administer the Project Risk Register
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Risk Tab:</strong> Click the "Project Risks" tab on the main toolbar.</li>
            <li><strong>Add Risk Entry:</strong> Click <strong>+ Register New Threat</strong>. Define title, risk category, and narrative impact description.</li>
            <li><strong>Score Severity:</strong> Select Probability (1 to 5) and Consequence/Impact (1 to 5) to compute the Risk Exposure Index automatically.</li>
            <li><strong>Formulate Mitigation:</strong> Outline contingency steps, trigger dates, and assign an accountable Risk Owner.</li>
            <li><strong>Commit Changes:</strong> Click <strong>Save to Database</strong> to synchronize risk metrics with the Executive Summary Dashboard.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 20: SUPERVISION CONSULTANT OVERSIGHT & SLA MATRIX
      ========================================================================= */}
      <section id="sec-consultant" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">20.0</span>
          <span>Supervision Oversight [Fig. 20.1, 20.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Supervision Consultant Oversight & SLA Matrix</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Oversees the supervising engineering consultant contract, dual currency fee disbursements (ETB and USD), resident staff deployment logs, and Service Level Agreement (SLA) review turnaround matrices with customizable criteria and weights.
        </p>

        {/* Screen Mockup: Figure 20.1 Consultant Contract & Fee Register */}
        <ScreenMockup 
          title="Figure 20.1 — Supervising Engineering Consultant Contract & Fee Register" 
          url="https://eradashboard.com.et/project/daye-girja/consultant?tab=contract" 
          badge="Figure 20.1"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Firm: LEA Associates South Asia JV with PACE Consulting</span>
              <span className="text-emerald-600 font-bold">Composite Performance Rating: 88.5% (High Compliance)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Local Currency Portion</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">ETB 48,250,000.00</span>
                <span className="text-slate-500 text-[10px]">Certified to Date: ETB 31,400,000.00 (65.1%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">Foreign Currency Portion</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">USD 850,000.00</span>
                <span className="text-slate-500 text-[10px]">Disbursed to Date: USD 520,000.00 (61.2%)</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 20.1 — Supervising Engineering Consultant Contract & Fee Register:</strong> Details consultant joint venture entities, dual-currency contract values, withholding taxes, and monthly invoice certifications.
        </p>

        {/* Screen Mockup: Figure 20.2 SLA Matrix */}
        <ScreenMockup 
          title="Figure 20.2 — Consultant RFI / Submittal Turnaround SLA Response Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/consultant?tab=sla" 
          badge="Figure 20.2"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="flex justify-between items-center pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-200">SLA Performance Turnaround Benchmarks</span>
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold text-[10px]">Weight Total: 100%</span>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>RFI Engineering Review (&lt;7 Calendar Days)</span>
                <span className="text-emerald-400 font-bold">Avg 4.8 Days (Weight: 25% | Score: 92%)</span>
              </div>
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>IPC Payment Certification (&lt;14 Calendar Days)</span>
                <span className="text-emerald-400 font-bold">Avg 11.2 Days (Weight: 30% | Score: 89%)</span>
              </div>
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>Material Source Approval (&lt;10 Calendar Days)</span>
                <span className="text-amber-400 font-bold">Avg 9.5 Days (Weight: 25% | Score: 81%)</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 20.2 — Consultant RFI / Submittal Turnaround SLA Response Matrix:</strong> Audits turn-around times for Requests for Information (RFIs), submittals, and IPC certifications against contractual SLA benchmarks.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Monitor Supervision Performance
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Select Consultant Module:</strong> Click "Supervision Consultant" from the navigation tab bar.</li>
            <li><strong>Review Invoices:</strong> Inspect the monthly fee invoice table, verifying local ETB and foreign USD certification milestones.</li>
            <li><strong>Configure SLA Weights:</strong> Click <strong>Edit Criteria & Weights</strong> to modify KPI percentages ensuring the sum balances to exactly 100%.</li>
            <li><strong>Audit Resident Staff:</strong> Cross-check the on-site presence of Key Personnel (Resident Engineer, Structural Engineer, Pavement Specialist).</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 21: COMPREHENSIVE EVM DIAGNOSTICS & FORECASTING
      ========================================================================= */}
      <section id="sec-analysis" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">21.0</span>
          <span>EVM Analytics [Fig. 21.1, 21.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Comprehensive EVM Diagnostics & Forecasting</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Deep Earned Value Management (EVM) analytical engine computing Budget at Completion (BAC), Planned Value (PV), Earned Value (EV), Actual Cost (AC), Cost Variance (CV), Schedule Variance (SV), CPI, SPI, EAC, ETC, VAC, TCPI, and dual CPM vs linear chainage progress comparisons.
        </p>

        {/* Screen Mockup: Figure 21.1 EVM Diagnostics */}
        <ScreenMockup 
          title="Figure 21.1 — Full Earned Value Management (EVM) Analytical Dashboard" 
          url="https://eradashboard.com.et/project/daye-girja/analysis?tab=evm-core" 
          badge="Figure 21.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Cost Efficiency (CPI)</span>
                <span className="text-base font-black text-emerald-600 font-mono block">1.213</span>
                <span className="text-emerald-600 font-bold text-[10px]">UNDER BUDGET (+21.3%)</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Schedule Efficiency (SPI)</span>
                <span className="text-base font-black text-rose-600 font-mono block">0.637</span>
                <span className="text-rose-600 font-bold text-[10px]">SCHEDULE DELAY (-36.3%)</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Cost Variance (CV)</span>
                <span className="text-sm font-bold text-emerald-600 font-mono block">+ETB 173.80 M</span>
                <span className="text-slate-500 text-[10px]">EV &minus; AC Positive Delta</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block">Schedule Variance (SV)</span>
                <span className="text-sm font-bold text-rose-600 font-mono block">-ETB 562.15 M</span>
                <span className="text-slate-500 text-[10px]">EV &minus; PV Lag Deficit</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 21.1 — Full Earned Value Management (EVM) Analytical Dashboard:</strong> Compares planned commitments against earned accomplishments and actual expenditures to establish efficiency indices.
        </p>

        {/* Screen Mockup: Figure 21.2 Bottom-Line Forecasting */}
        <ScreenMockup 
          title="Figure 21.2 — Bottom-Line Completion Forecasting (EAC, ETC, VAC & TCPI)" 
          url="https://eradashboard.com.et/project/daye-girja/analysis?tab=forecasting" 
          badge="Figure 21.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">Estimate at Completion (EAC)</span>
                <span className="text-blue-400 font-bold text-sm block">Br. 1,282,529,403.80</span>
                <span className="text-slate-500 text-[9px]">BAC / CPI Cost Model</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">Variance at Completion (VAC)</span>
                <span className="text-emerald-400 font-bold text-sm block">+Br. 273,178,764.10</span>
                <span className="text-emerald-500 text-[9px]">Favorable Budget Surplus</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">To-Complete Index (TCPI)</span>
                <span className="text-amber-400 font-bold text-sm block">0.865</span>
                <span className="text-amber-300 text-[9px]">Target Efficiency Needed</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 21.2 — Bottom-Line Completion Forecasting (EAC, ETC, VAC & TCPI):</strong> Forecasts final project completion expenditure based on historical cost performance indexes.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Interpret and Report EVM Metrics
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open EVM Module:</strong> Select "Comprehensive analysis" from the main navigation menu.</li>
            <li><strong>Audit Core Metrics:</strong> Verify Budget at Completion (BAC), current Planned Value (PV), Earned Value (EV), and Actual Cost (AC).</li>
            <li><strong>Examine Efficiency Indices:</strong> A CPI &gt; 1.0 confirms expenditures are yielding more work value than budgeted; an SPI &lt; 1.0 identifies time slippage requiring schedule recovery.</li>
            <li><strong>Analyze Bottom-Line Forecast:</strong> Check EAC and VAC values to anticipate whether contingency reserves will absorb outstanding scopes.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 22: CONTRACTOR CLAIMS, DISPUTES & ADJUDICATION
      ========================================================================= */}
      <section id="sec-claims" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">22.0</span>
          <span>Claims & Disputes [Fig. 22.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Contractor Claims, Disputes & Adjudication</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Comprehensive claim tracking platform managing FIDIC Clause 20.1 28-day notice rules, contemporaneous event documentation, Extension of Time (EOT) requests, financial compensation claims, Engineer determinations, and Dispute Adjudication Board (DAB) rulings.
        </p>

        {/* Screen Mockup: Figure 22.1 Claims Ledger */}
        <ScreenMockup 
          title="Figure 22.1 — Contractor Claims, EOT Evaluations & Dispute Resolution Ledger" 
          url="https://eradashboard.com.et/project/daye-girja/claims?view=ledger" 
          badge="Figure 22.1"
          badgeColor="bg-amber-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Claims Filed: 4 Active Claims (Total Claimed: ETB 142,600,000.00 | 180 EOT Days)</span>
              <span className="px-2.5 py-1 bg-amber-600 text-white rounded text-[10px] font-bold">+ Log Contractor Claim</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg space-y-1.5 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                <span>CLM-002: Adverse Unforeseen Subsurface Soil Conditions (Km 18+200 - 24+000)</span>
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[9px]">ENGINEER REVIEW</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <strong>FIDIC Clause 4.12:</strong> Contractor submitted 28-day notice on Oct 14, 2024. Claiming 75 days EOT + ETB 48.5M for excessive rock excavation and subgrade replacement.
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-amber-100 dark:border-amber-900">
                <span>Engineer Recommendation: 38 Days EOT + ETB 22.1M Certified</span>
                <span>Status: Under Employer Review</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 22.1 — Contractor Claims, EOT Evaluations & Dispute Resolution Ledger:</strong> Tracks contractual notices, claimed financial additions, substantiated delay days, and final Engineer determinations.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Administer Contractor Claims
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Claims Register:</strong> Select "Contractor Claims" from the project sub-navigation menu.</li>
            <li><strong>Validate 28-Day Notice:</strong> Check that the contractor's initial notice complies with FIDIC Clause 20.1 time-bar boundaries.</li>
            <li><strong>Record Claim Details:</strong> Click <strong>+ Log Contractor Claim</strong> and record claim grounds, relevant contractual clauses, claimed EOT days, and claimed currency value.</li>
            <li><strong>Update Engineer's Assessment:</strong> Record the Resident Engineer's formal determination, recommended EOT days, and audited costs.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 23: RIGHT-OF-WAY (ROW) OBSTRUCTIONS & SITE HANDOVER
      ========================================================================= */}
      <section id="sec-right-of-way" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">23.0</span>
          <span>Right-of-Way [Fig. 23.1, 23.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Right-of-Way (ROW) Obstructions & Site Handover</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Linear km chainage tracking of expropriation corridors, compensation budget disbursements, power/telecom/water utility relocations, and legal site handover certificates.
        </p>

        {/* Screen Mockup: Figure 23.1 ROW Chainage Obstruction Matrix */}
        <ScreenMockup 
          title="Figure 23.1 — Linear Km Chainage Obstruction & Clearance Tracking Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/row?view=chainage" 
          badge="Figure 23.1"
          badgeColor="bg-rose-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Total Alignment: 67.00 Km | Cleared & Handed Over: 44.50 Km (66.4%)</span>
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-mono font-bold">22.50 Km ENCUMBERED</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold block text-slate-800 dark:text-slate-200">Ch. 24+200 - 31+800 (Girja Town Center)</span>
                <span className="text-rose-600 font-bold text-[10px]">OBSTRUCTION: 142 Residential Structures & Electric Poles</span>
                <span className="text-slate-500 text-[10px] block">Property Valuation: ETB 68,400,000 (Hawassa Woreda Land Board)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold block text-slate-800 dark:text-slate-200">Ch. 42+000 - 45+500 (Farmland & Crops)</span>
                <span className="text-amber-600 font-bold text-[10px]">STATUS: Compensation Fund Deposited in Escrow</span>
                <span className="text-slate-500 text-[10px] block">Expected Vacation Date: March 28, 2026</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 23.1 — Linear Km Chainage Obstruction & Clearance Tracking Matrix:</strong> Pinpoints bottlenecks along the corridor by chainage station, describing obstruction types, valuations, and clearance targets.
        </p>

        {/* Screen Mockup: Figure 23.2 Utility Relocation */}
        <ScreenMockup 
          title="Figure 23.2 — Utility Relocation Coordination (EEU Power, Ethio Telecom & Water)" 
          url="https://eradashboard.com.et/project/daye-girja/row?tab=utilities" 
          badge="Figure 23.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">EEU Power Poles</span>
                <span className="text-emerald-400 font-bold text-sm">84 / 112 Relocated</span>
                <span className="text-slate-500 text-[9px]">75% Completed</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">Ethio Telecom Fiber</span>
                <span className="text-amber-400 font-bold text-sm">6.2 / 9.8 Km Shifted</span>
                <span className="text-slate-500 text-[9px]">63% Completed</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block font-bold">Community Water Mains</span>
                <span className="text-emerald-400 font-bold text-sm">14 / 14 Crossings</span>
                <span className="text-emerald-500 text-[9px]">100% Cleared</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 23.2 — Utility Relocation Coordination:</strong> Monitors civil infrastructure shifts across Ethiopian Electric Utility (EEU), Ethio Telecom lines, and municipal water pipes.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Monitor and Update Right-of-Way Clearance
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open ROW Module:</strong> Select "Right-of-Way" from the project management tabs.</li>
            <li><strong>Update Section Status:</strong> Select the relevant chainage block (e.g. Km 24+000 - 31+000) and click <strong>Edit Corridor Status</strong>.</li>
            <li><strong>Record Compensation Payouts:</strong> Enter compensation amounts disbursed to affected persons through local Woreda administrations.</li>
            <li><strong>Log Utility Relocations:</strong> Update relocated pole counts and fiber cable trenching progress.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 24: ENVIRONMENTAL, HEALTH, SAFETY & SOCIAL (ESHS) MANAGEMENT
      ========================================================================= */}
      <section id="sec-environmental-social" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">24.0</span>
          <span>ESHS Compliance [Fig. 24.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Environmental, Health, Safety & Social (ESHS) Management</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Monitors environmental safeguards, quarry/borrow pit reinstatement, Lost Time Injury Frequency Rate (LTIFR), Grievance Redress Mechanism (GRM) community complaints, and Gender Action Plan (GAP) metrics.
        </p>

        {/* Screen Mockup: Figure 24.1 ESHS Dashboard */}
        <ScreenMockup 
          title="Figure 24.1 — Environmental, Health, Safety & Community Safeguards Monitor" 
          url="https://eradashboard.com.et/project/daye-girja/eshs" 
          badge="Figure 24.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="text-slate-400 font-bold block">LTIFR Metric</span>
                <span className="text-sm font-black text-emerald-600 font-mono">0.00</span>
                <span className="text-emerald-600 text-[9px] font-bold">Zero Lost Time Incidents</span>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800">
                <span className="text-slate-400 font-bold block">Local Employment</span>
                <span className="text-sm font-black text-blue-600 font-mono">72.4%</span>
                <span className="text-slate-500 text-[9px]">412 Local Community Hires</span>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800">
                <span className="text-slate-400 font-bold block">Quarry Rehabilitation</span>
                <span className="text-sm font-black text-amber-600 font-mono">3 / 7 Pits</span>
                <span className="text-slate-500 text-[9px]">43% Restored & Planted</span>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-800">
                <span className="text-slate-400 font-bold block">GRM Grievances</span>
                <span className="text-sm font-black text-purple-600 font-mono">18 / 21</span>
                <span className="text-purple-600 text-[9px] font-bold">85.7% Resolved</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 24.1 — Environmental, Health, Safety & Community Safeguards Monitor:</strong> Tracks occupational safety records, female employment ratios, reforestation, and resolution of community grievances.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Administer ESHS Safeguards
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Select ESHS Module:</strong> Navigate to the ESHS & Safeguards tab.</li>
            <li><strong>Log Safety Incidents:</strong> Record any near-misses, first-aid occurrences, or tool-box talk attendances.</li>
            <li><strong>Monitor Grievance Redress:</strong> Log community complaints (e.g. dust suppression or drainage access), track investigation status, and document formal resolution agreements.</li>
            <li><strong>Verify Environmental Restoration:</strong> Audit borrow pit reprofiling and native tree planting records prior to contractor demobilization.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 25: SUBCONTRACTOR MANAGEMENT & LOCAL SME PARTICIPATION
      ========================================================================= */}
      <section id="sec-subcontractors" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">25.0</span>
          <span>Subcontractors & SMEs [Fig. 25.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Subcontractor Management & Local SME Participation</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Guarantees enforcement of Ethiopia's 30% local subcontracting directive, tracking approved domestic contractors, assigned work packages, financial disbursement records, and technical knowledge transfer.
        </p>

        {/* Screen Mockup: Figure 25.1 Subcontractor Ledger */}
        <ScreenMockup 
          title="Figure 25.1 — Domestic Subcontractor Engagement & SME Participation Ledger" 
          url="https://eradashboard.com.et/project/daye-girja/subcontractors" 
          badge="Figure 25.1"
          badgeColor="bg-purple-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Local Subcontracting Share: 31.8% of Contract Value (Compliant with &ge;30% Mandate)</span>
              <span className="px-2.5 py-1 bg-purple-600 text-white rounded text-[10px] font-bold">+ Register Subcontractor</span>
            </div>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Abyssinia Structural Works Plc</span>
                  <span className="text-slate-400">Package: Concrete Box Culverts (Km 12+000 - 35+000)</span>
                </div>
                <div className="text-right">
                  <span className="text-purple-600 font-bold block">Br. 88,400,000.00</span>
                  <span className="text-emerald-600 text-[9px]">Certified: Br. 62,100,000 (70.2%)</span>
                </div>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 25.1 — Domestic Subcontractor Engagement & SME Participation Ledger:</strong> Records domestic enterprise contracts, scope packages, payment certifications, and regulatory percentage thresholds.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Manage Subcontractors
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open Subcontractor Roster:</strong> Select "Subcontractors & SMEs" from the project menu.</li>
            <li><strong>Verify Regulatory Ratio:</strong> Confirm the total sublet amount reaches at least 30% of main civil contract value as required by national road directives.</li>
            <li><strong>Register New SME:</strong> Click <strong>+ Register Subcontractor</strong>, enter business license details, trade certificate, and assigned scope.</li>
            <li><strong>Track Milestone Payments:</strong> Record monthly invoice settlements from the main contractor to ensure fair treatment of domestic small businesses.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 26: MULTI-YEAR FINANCIAL COMMITMENTS & FISCAL BUDGET ALLOCATION
      ========================================================================= */}
      <section id="sec-financial-commitments" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">26.0</span>
          <span>Fiscal Budgeting [Fig. 26.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Multi-Year Financial Commitments & Fiscal Budget Allocation</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Maps contractual outlays against Ethiopian Fiscal Year (EFY) budgetary envelopes, treasury disbursements, donor co-financing quotas (AfDB, World Bank, JICA), and multi-year commitment forecasts.
        </p>

        {/* Screen Mockup: Figure 26.1 Fiscal Allocation Matrix */}
        <ScreenMockup 
          title="Figure 26.1 — Multi-Year Ethiopian Fiscal Year (EFY) Budget Allocation Matrix" 
          url="https://eradashboard.com.et/project/daye-girja/financial-commitments" 
          badge="Figure 26.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">EFY 2016 Allocation</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">ETB 450,000,000</span>
                <span className="text-emerald-600 text-[10px] font-bold">100% Disbursed & Settled</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">EFY 2017 Allocation (Current)</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">ETB 620,000,000</span>
                <span className="text-blue-600 text-[10px] font-bold">ETB 482.5M Certified (77.8%)</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-bold">EFY 2018 Projected Envelope</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">ETB 485,700,000</span>
                <span className="text-slate-500 text-[10px]">Requested to Ministry of Finance</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 26.1 — Multi-Year Ethiopian Fiscal Year (EFY) Budget Allocation Matrix:</strong> Tracks state treasury allocations, co-financier drawdowns, and expenditure projections across Ethiopian fiscal cycles.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Monitor Multi-Year Fiscal Envelopes
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Navigate to Budgeting:</strong> Select "Financial Commitments & Fiscal Budget" from the finance menu.</li>
            <li><strong>Review EFY Envelopes:</strong> Verify government capital budget appropriations for the active Ethiopian Fiscal Year.</li>
            <li><strong>Forecast Cash Flows:</strong> Compare certified IPC trends with remaining fiscal appropriations to avoid mid-year payment suspensions.</li>
            <li><strong>Generate MOF Reports:</strong> Export consolidated fiscal compliance documentation for Ministry of Finance and donor audits.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 27: PROJECT DOCUMENTATION VAULT & DIGITAL ASSET REPOSITORY
      ========================================================================= */}
      <section id="sec-documents-vault" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">27.0</span>
          <span>Digital Document Vault [Fig. 27.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Documentation Vault & Digital Asset Repository</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Centralized electronic document management system (EDMS) for legal contract agreements, engineering design drawings, monthly progress reports, quality test certificates, and variation orders with metadata indexing and client-side validation.
        </p>

        {/* Screen Mockup: Figure 27.1 Document Vault */}
        <ScreenMockup 
          title="Figure 27.1 — Central Project Document Repository & Digital Asset Vault" 
          url="https://eradashboard.com.et/project/daye-girja/documentation?view=vault" 
          badge="Figure 27.1"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Classifications: Contract & Legal, Engineering Drawings, Monthly Reports, Test Certs</span>
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold">+ Upload Document</span>
            </div>
            <div className="p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-400 font-medium">
              Drag & Drop Project PDF, AutoCAD (DWG), Excel, or Archive Files (Max 50MB per file)
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Particular_Conditions_Contract_Signed.pdf</span>
                  <span className="text-slate-400">Uploaded by Ersido Abayneh (Master Admin) • 14.2 MB • MD5 Verified</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold">Download</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 27.1 — Central Project Document Repository & Digital Asset Vault:</strong> Provides secure categorized document archiving, automatic cryptographic checksums, author attribution, and revision histories.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Administer the Documentation Vault
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Access Documentation:</strong> Click the "Documentation" navigation tab from the project toolbar.</li>
            <li><strong>Select File Category:</strong> Choose from Contractual & Legal, Design Drawings, Monthly Progress Reports, or QA Test Certificates.</li>
            <li><strong>Upload Files:</strong> Click <strong>+ Upload Document</strong> or drag files into the active drop zone. Enter descriptive tags and document version numbers.</li>
            <li><strong>Download & Audit:</strong> Click the download link next to any record to inspect original deliverables.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 28: HISTORICAL SNAPSHOTS, AUDIT LOG & ROLLBACK RESTORATION
      ========================================================================= */}
      <section id="sec-audit-snapshots" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">28.0</span>
          <span>Audit Trail [Fig. 28.1]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Historical Snapshots, Audit Log & Rollback Restoration</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Immutable point-in-time state capture engine creating complete contract snapshots, visual diff comparisons between versions, automated user audit trails, and authorized instant rollbacks.
        </p>

        {/* Screen Mockup: Figure 28.1 Audit Snapshots */}
        <ScreenMockup 
          title="Figure 28.1 — Immutable Project Snapshot Ledger & Rollback Checkpoint Engine" 
          url="https://eradashboard.com.et/project/daye-girja/history?view=snapshots" 
          badge="Figure 28.1"
          badgeColor="bg-indigo-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Saved Historical Milestones: 4 Version Snapshots Stored</span>
              <span className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold">+ Capture Milestone Snapshot</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Snapshot v2.4 (Pre-Variation Order #02 Baseline)</span>
                  <span className="text-slate-400 text-[10px]">Created by Ersido Abayneh (Master Admin) • Feb 24, 2026, 14:15 EAT</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold">Inspect Diff</span>
                  <span className="px-2 py-1 bg-rose-600 text-white rounded font-bold">Restore Checkpoint</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Checksum: a7f89d3c2e1b • Contract Value: ETB 1.555B • Time Elapsed: 81.3% • CPI: 1.213
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 28.1 — Immutable Project Snapshot Ledger & Rollback Checkpoint Engine:</strong> Retains encrypted point-in-time captures before major contract updates, enabling comprehensive side-by-side variance analysis and disaster recovery.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Capture and Restore Snapshots
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open History Tab:</strong> Click the "History" tab in the main project navigation bar.</li>
            <li><strong>Create Checkpoint:</strong> Click <strong>+ Capture Milestone Snapshot</strong> prior to executing major variation orders or schedule logic updates.</li>
            <li><strong>Compare Historical Diffs:</strong> Select any two snapshots to visually compare modified quantities, financial balances, and CPM network dates.</li>
            <li><strong>Perform Emergency Rollback:</strong> Master Admins can click <strong>Restore Checkpoint</strong> to safely restore the project back to verified historical records.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 29: ROLE-BASED ACCESS CONTROL (RBAC) & MASTER ADMIN APPROVAL
      ========================================================================= */}
      <section id="sec-rbac-security" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">29.0</span>
          <span>RBAC & Security [Fig. 29.1, 29.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Role-Based Access Control (RBAC), Security & Master Admin Approval</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Enterprise security architecture governing 7 user role tiers, page and field level editing privileges, real-time cross-device login approval, and centralized user management.
        </p>

        {/* Screen Mockup: Figure 29.1 User Roster & RBAC */}
        <ScreenMockup 
          title="Figure 29.1 — User Account Provisioning & Role-Based Access Control (RBAC)" 
          url="https://eradashboard.com.et/project/daye-girja/settings?tab=users" 
          badge="Figure 29.1"
          badgeColor="bg-purple-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Enterprise User Directory: 7 Active Accounts</span>
              <span className="px-2.5 py-1 bg-purple-600 text-white rounded text-[10px] font-bold">+ Provision User Account</span>
            </div>
            <div className="grid grid-cols-4 p-2 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 rounded font-mono text-[10px]">
              <span>Username</span>
              <span>Assigned Role</span>
              <span>Authorized Tabs</span>
              <span>Approval Authority</span>
            </div>
            <div className="grid grid-cols-4 p-2 border-b border-slate-100 dark:border-slate-800 items-center font-mono text-[10px]">
              <span className="font-bold text-slate-900 dark:text-white">Ersido Abayneh</span>
              <span className="text-purple-600 font-bold">Master Admin</span>
              <span>ALL PGL PAGES</span>
              <span className="text-emerald-600 font-bold">Full Authority ✓</span>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 29.1 — User Account Provisioning & Role-Based Access Control (RBAC):</strong> Configures granular permissions across Master Admin, CPM Admin, Directorate Admin, PMO Admin, Editor, Approver, and Viewer roles.
        </p>

        {/* Screen Mockup: Figure 29.2 Real-time Sign-in Approval Notification */}
        <ScreenMockup 
          title="Figure 29.2 — Real-Time Cross-Device Login Approval Alert for Master Admin" 
          url="https://eradashboard.com.et/admin/security/pending-approvals" 
          badge="Figure 29.2"
          badgeColor="bg-rose-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/60 space-y-2 text-2xs text-slate-300">
            <div className="flex items-center justify-between pb-1 border-b border-rose-900/40 font-bold">
              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                IMMEDIATE ACTION REQUIRED: New User Sign-in Approval Request
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Timestamp: Just now</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">User: mulugeta.tesfaye@era.gov.et</span>
                <span className="text-amber-400">Device: Windows 11 (Chrome 122)</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Location: Hawassa Regional Office (IP: 196.188.14.72)</span>
                <span>Requested Role: Editor (Pavement & Civil)</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <span className="px-3 py-1 bg-slate-800 text-rose-400 rounded font-bold cursor-pointer">Deny & Block</span>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded font-bold cursor-pointer">✓ Approve & Authorize Access</span>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 29.2 — Real-Time Cross-Device Login Approval Alert:</strong> Whenever a new user signs in from any location or device, a high-priority notification is immediately broadcast to the Master Admin screen for instant verification and one-click authorization.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Administer User Security and Approvals
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Open Workspace Settings:</strong> Click the "Settings" tab in the main navigation.</li>
            <li><strong>Add User Credential:</strong> Click <strong>+ Provision User Account</strong>, assign professional role, authorized modules, and approval thresholds.</li>
            <li><strong>Real-Time Sign-In Approval:</strong> When a user attempts to log in from a new machine or geographic location, the Master Admin immediately receives an interactive on-screen modal containing the user's IP, device footprint, and requested role.</li>
            <li><strong>Authorize or Revoke:</strong> Click <strong>Approve</strong> to allow immediate access, or <strong>Deny</strong> to protect enterprise data.</li>
            <li><strong>Permanent Deletion:</strong> Master Admins can permanently delete accounts or de-authorize obsolete staff in one click.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SECTION 30: DATA IMPORT, EXPORT, OFFLINE SYNC & PDF REPORTING ENGINE
      ========================================================================= */}
      <section id="sec-data-exchange" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">30.0</span>
          <span>Data Exchange & PDF [Fig. 30.1, 30.2]</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Data Import, Export, Offline Sync & PDF Reporting Engine</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Complete input/output interoperability supporting Excel/CSV bulk data ingestion, IndexedDB offline persistence with automatic cloud resynchronization, and high-fidelity 20-page vector PDF generation using jsPDF.
        </p>

        {/* Screen Mockup: Figure 30.1 Data Exchange & CSV Ingestion */}
        <ScreenMockup 
          title="Figure 30.1 — Bidirectional Data Ingestion & Excel/CSV Migration Engine" 
          url="https://eradashboard.com.et/project/daye-girja/data-exchange" 
          badge="Figure 30.1"
          badgeColor="bg-emerald-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Supported Data Schemas: Primavera P6 (CSV), MS Project (XLSX), ERA Standard BOQ</span>
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold">Import Data</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Offline Cache Status</span>
                <span className="text-emerald-600 font-bold text-[10px]">IndexedDB Cache Active (100% Synced)</span>
                <span className="text-slate-500 text-[9px] block">Safe to continue working without internet connection</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Cloud Sync Protocol</span>
                <span className="text-blue-600 font-bold text-[10px]">Firestore Operational & Real-time</span>
                <span className="text-slate-500 text-[9px] block">Conflict Resolution: Server-authoritative timestamping</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 30.1 — Bidirectional Data Ingestion & Excel/CSV Migration Engine:</strong> Ingests complex schedules and BOQs with schema auto-detection and handles offline field caching transparently.
        </p>

        {/* Screen Mockup: Figure 30.2 PDF Engine */}
        <ScreenMockup 
          title="Figure 30.2 — jsPDF High-Resolution Vector Executive PDF Generator" 
          url="https://eradashboard.com.et/project/daye-girja/reports?type=vector-pdf" 
          badge="Figure 30.2"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-2xs text-slate-300">
            <div className="flex justify-between items-center pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-200">Vector PDF Rendering Pipeline</span>
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold text-[10px]">A4 / A3 Multi-Page Ready</span>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>Executive Summary & Physical S-Curve Charts</span>
                <span className="text-emerald-400">Vector Line Render (Clean Scale)</span>
              </div>
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>IPC Financial Audit Ledger & Retention Balances</span>
                <span className="text-emerald-400">Exact Mathematical Tabulation</span>
              </div>
              <div className="flex justify-between p-1 bg-slate-900 rounded">
                <span>PGL Layer-by-Layer Linear Progress Diagrams</span>
                <span className="text-emerald-400">Color-Coded Geometry</span>
              </div>
            </div>
          </div>
        </ScreenMockup>

        <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
          <strong>Figure 30.2 — jsPDF High-Resolution Vector Executive PDF Generator:</strong> Renders print-ready, high-resolution documentation featuring official ERA headers, vector graphics, and comprehensive financial tables.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-2xs tracking-wide">
            How to Ingest Data and Generate Official Reports
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li><strong>Import Schedule / BOQ:</strong> Navigate to the relevant tab and click <strong>Import CSV / Excel</strong>. Select your spreadsheet; the validation engine verifies column headers automatically.</li>
            <li><strong>Offline Mode Working:</strong> When operating in remote field zones without mobile connectivity, continue logging daily progress; the IndexedDB engine safely buffers records locally.</li>
            <li><strong>Cloud Resynchronization:</strong> As soon as network signal is restored, the application reconciles all pending offline changes directly to the enterprise database.</li>
            <li><strong>Generate Executive PDF:</strong> Click <strong>Download PDF Manual</strong> or <strong>Generate Executive Report</strong> to download the vector-rendered publication.</li>
          </ol>
        </div>
      </section>

      {/* =========================================================================
          SUPPLEMENTAL TOOLS & AI COLLABORATION MODULES
      ========================================================================= */}
      <section id="sec-workspace" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">31.1</span>
          <span>Field Collaboration</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Workspace Notes & Field Scratchpad</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Interactive engineering scratchpad for real-time field meeting notes, quantity calculation drafts, and collaborative memos synchronized across devices.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="Cloud Synchronized Engineering Scratchpad & Field Notes" 
          url="https://eradashboard.com.et/project/daye-girja/workspace" 
          badge="Real-Time Workspace"
          badgeColor="bg-blue-600"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 font-bold">
              <span>Cloud Sync State: Synced (Local + Firebase)</span>
              <span className="text-emerald-600 font-bold">Auto-Saving Field Memo</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded text-slate-700 dark:text-slate-300 font-mono">
              [Site Meeting Notes: Joint survey completed at Km 34+500 with RE team. Verified ROW clearance progress...]
            </div>
          </div>
        </ScreenMockup>
      </section>

      <section id="sec-ai" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">31.2</span>
          <span>AI Assistant</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">AI Road Engineer Assistant Chat</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          An intelligent conversational engineering advisor querying real-time project metrics, explaining FIDIC contractual clauses, and drafting executive delay diagnostics.
        </p>

        {/* Screen Mockup */}
        <ScreenMockup 
          title="AI Road Engineer Assistant Conversational Intelligence Window" 
          url="https://eradashboard.com.et/project/daye-girja/ai-assistant" 
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
          </div>
        </ScreenMockup>
      </section>

      <section id="sec-group-report" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">31.3</span>
          <span>Portfolio Reports</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Executive Group Comparative Report Generator</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Generates multi-project comparative executive reports, 5-dimension compliance evaluations, and vector PDF/Excel exports for directorate briefings.
        </p>
      </section>

      <section id="sec-draft-sandbox" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">31.4</span>
          <span>Simulation Sandbox</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Draft Playground & Simulation Sandbox</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          A sandboxed "what-if" modeling environment where engineers test variations, schedule revisions, and price escalations without altering live production data.
        </p>
      </section>

      {/* =========================================================================
          SECTION 32: FAQS & QUICK TROUBLESHOOTING GUIDE
      ========================================================================= */}
      <section id="sec-faqs" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">FAQ</span>
          <span>Troubleshooting</span>
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
          SECTION 33: CONTACT & OFFICIAL TECHNICAL SUPPORT
      ========================================================================= */}
      <section id="sec-contact" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">Support</span>
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

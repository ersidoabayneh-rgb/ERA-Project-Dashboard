import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Sparkles, 
  RefreshCcw, 
  Key, 
  Lock, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sliders,
  Shield,
  Palette,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Scale,
  Award,
  Plus,
  Trash2,
  Database,
  Server,
  HardDrive,
  Download,
  Copy,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCode2
} from 'lucide-react';
import { 
  User, 
  ContractorScoringWeights, 
  ConsultantScoringWeights, 
  DEFAULT_CONTRACTOR_SCORING_WEIGHTS, 
  DEFAULT_CONSULTANT_SCORING_WEIGHTS,
  CustomScoringCriterion
} from '../types';
import { 
  safeSyncScoringWeights,
  fetchMySQLDiagnostics,
  testMySQLServerConnection,
  triggerMySQLBiDirectionalSync,
  fetchMySQLSchemaSQL,
  ClientMySQLDiagnostics
} from '../lib/apiSync';
import { realtimeManager, RealtimeSyncStatus } from '../lib/realtime';

const CONTRACTOR_CRITERIA_META: Array<{ key: string; defaultLabel: string; defaultDesc: string; defaultWeight: number }> = [
  { key: 'fidic', defaultLabel: '1. FIDIC Contract Compliance', defaultDesc: 'Performance/Mobilization Guarantees & Risk notices', defaultWeight: 15 },
  { key: 'projectMgmt', defaultLabel: '2. Project Management (Time)', defaultDesc: 'Schedule overrun & EOT extension compliance', defaultWeight: 15 },
  { key: 'evm', defaultLabel: '3. EVM Metrics (CPI & SPI)', defaultDesc: 'Cost Efficiency Index (CPI) & Schedule Performance (SPI)', defaultWeight: 15 },
  { key: 'kpi', defaultLabel: '4. KPIs & Quality Milestones', defaultDesc: 'Key milestone completions & critical risk mitigations', defaultWeight: 15 },
  { key: 'linear', defaultLabel: '5. Linear Layer Physical Progress', defaultDesc: 'Earthwork, Subgrade, Subbase, Basecourse, & Asphalt pavement layers', defaultWeight: 15 },
  { key: 'rfi', defaultLabel: '6. Technical RFIs Performance', defaultDesc: 'RFI response, quality & resolution compliance ratio', defaultWeight: 10 },
  { key: 'materialApproval', defaultLabel: '7. Material Approval Submittals', defaultDesc: 'Timeliness & specification compliance of material samples', defaultWeight: 10 },
  { key: 'workInspection', defaultLabel: '8. Work Inspections (WIR)', defaultDesc: 'First-time pass rate and quality inspection submittals', defaultWeight: 5 },
  { key: 'resourceMobilization', defaultLabel: '9. Resource Mobilization', defaultDesc: 'Equipment, machinery & key personnel site presence', defaultWeight: 5 },
];

const CONSULTANT_CRITERIA_META: Array<{ key: string; defaultLabel: string; defaultDesc: string; defaultWeight: number }> = [
  { key: 'sla', defaultLabel: '1. Submittal SLA & RFI Turnaround', defaultDesc: 'Response time on contractor submittals and technical RFIs against SLA targets', defaultWeight: 25 },
  { key: 'staff', defaultLabel: '2. Key Staff Mobilization', defaultDesc: 'Presence, deployment ratio, and qualifications of resident supervision team', defaultWeight: 20 },
  { key: 'ipc', defaultLabel: '3. IPC Verification Timeliness', defaultDesc: 'Interim Payment Certificate certification speed within FIDIC Clause 14.6/14.7', defaultWeight: 20 },
  { key: 'claims', defaultLabel: '4. Claims & Determinations', defaultDesc: 'Objective handling of EOT claims, rate fixing, variation orders, and disputes', defaultWeight: 20 },
  { key: 'quality', defaultLabel: '5. Quality Assurance & WIR', defaultDesc: 'Work inspection requests turnaround and material lab testing oversight', defaultWeight: 15 },
];

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  vantaColor: string;
  vantaBgColor: string;
  vantaPoints: number;
  onUpdateVanta: (color: string, bg: string, points: number) => void;
  onResetVanta: () => void;
  customBgColor: string;
  customTxtColor: string;
  customWordColor: string;
  customTxtBgColor: string;
  customChartTooltipBgColor: string;
  onUpdateCustomColors: (bg: string, txt: string, word: string, txtBg: string, chartTooltipBg: string) => void;
  onResetCustomColors: () => void;
  currentUser?: User | null;
  contractorWeights?: ContractorScoringWeights;
  consultantWeights?: ConsultantScoringWeights;
  onUpdateScoringWeights?: (contractorWeights: ContractorScoringWeights, consultantWeights: ConsultantScoringWeights) => Promise<void> | void;
  allUsers?: User[];
  onOpenThemeCustomizer?: () => void;
  onApproveUser?: (username: string) => void;
  onRejectUser?: (username: string) => void;
}

export default function SettingsView({
  darkMode,
  onToggleDarkMode,
  vantaColor,
  vantaBgColor,
  vantaPoints,
  onUpdateVanta,
  onResetVanta,
  customBgColor,
  customTxtColor,
  customWordColor,
  customTxtBgColor,
  customChartTooltipBgColor,
  onUpdateCustomColors,
  onResetCustomColors,
  currentUser,
  contractorWeights = DEFAULT_CONTRACTOR_SCORING_WEIGHTS,
  consultantWeights = DEFAULT_CONSULTANT_SCORING_WEIGHTS,
  onUpdateScoringWeights,
  allUsers = [],
  onOpenThemeCustomizer,
  onApproveUser,
  onRejectUser
}: SettingsViewProps) {

  const isMasterAdmin = Boolean(
    currentUser?.role === 'master_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.username === 'proj_1781786415663' ||
    (currentUser?.username && currentUser.username.toLowerCase().includes('ersido'))
  );

  const [activeModelTab, setActiveModelTab] = useState<'contractor' | 'consultant'>('contractor');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempContractorWeights, setTempContractorWeights] = useState<ContractorScoringWeights>(contractorWeights);
  const [tempConsultantWeights, setTempConsultantWeights] = useState<ConsultantScoringWeights>(consultantWeights);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Real-time synchronization state
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeSyncStatus>(() => realtimeManager.getStatus());
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = realtimeManager.subscribeStatus((status) => {
      setRealtimeStatus(status);
    });
    return unsub;
  }, []);

  const handleForceSync = async () => {
    setIsSyncingNow(true);
    try {
      await realtimeManager.forceSyncNow();
      setSyncFeedback('All database data synchronized across all devices!');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Sync completed.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Ethio Telecom Traditional MySQL Database States
  const [mysqlDiag, setMysqlDiag] = useState<ClientMySQLDiagnostics | null>(null);
  const [isLoadingMysql, setIsLoadingMysql] = useState(false);
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [isSyncingMysql, setIsSyncingMysql] = useState(false);
  const [mysqlNotice, setMysqlNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string; recommendation?: string } | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [schemaSqlText, setSchemaSqlText] = useState('');
  const [hasCopiedSchema, setHasCopiedSchema] = useState(false);
  const [showCpanelGuide, setShowCpanelGuide] = useState(false);

  const loadMySQLDiagnostics = async () => {
    setIsLoadingMysql(true);
    try {
      const diag = await fetchMySQLDiagnostics();
      if (diag) setMysqlDiag(diag);
    } catch {} finally {
      setIsLoadingMysql(false);
    }
  };

  React.useEffect(() => {
    loadMySQLDiagnostics();
  }, []);

  const handleTestMySQL = async () => {
    setIsTestingMysql(true);
    setMysqlNotice(null);
    try {
      const res = await testMySQLServerConnection();
      if (res.success && res.diagnostics) {
        setMysqlDiag(res.diagnostics);
        setMysqlNotice({
          type: 'success',
          text: `Connection verified! Ethio Telecom MySQL responded in ${res.diagnostics.latencyMs}ms.`
        });
      } else {
        const diag = res.diagnostics || (await fetchMySQLDiagnostics());
        if (diag) setMysqlDiag(diag);
        setMysqlNotice({
          type: 'error',
          text: diag?.errorDetails || res.error || 'Connection to Ethio Telecom MySQL host is offline or blocked by firewall.',
          recommendation: diag?.recommendation || 'Verify database credentials in cPanel and check Remote MySQL port 3306.'
        });
      }
    } catch (e: any) {
      setMysqlNotice({
        type: 'error',
        text: e?.message || 'Failed to ping Ethio Telecom MySQL host.'
      });
    } finally {
      setIsTestingMysql(false);
      setTimeout(() => setMysqlNotice(null), 12000);
    }
  };

  const handleSyncMySQL = async () => {
    setIsSyncingMysql(true);
    setMysqlNotice(null);
    try {
      const res = await triggerMySQLBiDirectionalSync();
      if (res.success) {
        await loadMySQLDiagnostics();
        setMysqlNotice({
          type: 'success',
          text: res.message || 'Bi-directional synchronization with Ethio Telecom MySQL database completed!'
        });
      } else {
        setMysqlNotice({
          type: 'error',
          text: res.error || 'Failed to execute bi-directional MySQL sync. Verify database is reachable.'
        });
      }
    } catch (e: any) {
      setMysqlNotice({ type: 'error', text: e?.message || 'Sync operation encountered an error.' });
    } finally {
      setIsSyncingMysql(false);
      setTimeout(() => setMysqlNotice(null), 12000);
    }
  };

  const handleOpenSchemaModal = async () => {
    setIsSchemaModalOpen(true);
    if (!schemaSqlText) {
      const sql = await fetchMySQLSchemaSQL();
      setSchemaSqlText(sql);
    }
  };

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(schemaSqlText);
      setHasCopiedSchema(true);
      setTimeout(() => setHasCopiedSchema(false), 2500);
    } catch {}
  };

  const handleOpenModal = () => {
    setTempContractorWeights(contractorWeights);
    setTempConsultantWeights(consultantWeights);
    setIsModalOpen(true);
  };

  const handleSaveWeights = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(tempContractorWeights));
      localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(tempConsultantWeights));

      await safeSyncScoringWeights(tempContractorWeights, tempConsultantWeights, currentUser?.username);

      if (onUpdateScoringWeights) {
        await onUpdateScoringWeights(tempContractorWeights, tempConsultantWeights);
      }

      setSaveSuccessMessage('Scoring model weightages successfully updated and saved to configuration database!');
      setTimeout(() => setSaveSuccessMessage(null), 5000);
      setIsModalOpen(false);
    } catch (e) {
      console.error('Failed to save scoring weights', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header Box */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            ERP Dashboard Workspace Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personalize workspace parameters, configure scoring model weightages, and customize ambient visual densities.
          </p>
        </div>

        {isMasterAdmin && (
          <div className="shrink-0">
            <span className="px-3 py-1.5 text-2xs font-extrabold text-amber-900 dark:text-amber-200 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Master Admin Authenticated</span>
            </span>
          </div>
        )}
      </div>

      {saveSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs"
        >
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </motion.div>
      )}

      {/* MASTER ADMIN EXCLUSIVE: Contractor & Consultant Compliance & Grade Scoring Model Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                  Project Contractor Compliance & Grade Scoring Model Configuration
                </h3>
                {isMasterAdmin ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-md font-mono">
                    Master Admin Configurable
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                    🔒 Master Admin Restricted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Defines the Supervision Service Performance Evaluation scoring matrix applied across executive group reports and project audits. Saved to the configuration database.
              </p>
            </div>
          </div>

          {isMasterAdmin && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-4 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Sliders className="w-4 h-4" />
              <span>⚙️ Edit Scoring Model Weights</span>
            </button>
          )}
        </div>

        {/* Display Project Contractor Model Dimensions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-slate-400 font-extrabold">
            <span>PROJECT CONTRACTOR COMPLIANCE DIMENSIONS</span>
            <span>CONFIGURED WEIGHTAGE (% OF 100)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {CONTRACTOR_CRITERIA_META.map((item, idx) => {
              const label = contractorWeights.labels?.[item.key] ?? item.defaultLabel;
              const desc = contractorWeights.descriptions?.[item.key] ?? item.defaultDesc;
              const weight = contractorWeights[item.key] ?? item.defaultWeight;
              return (
                <div key={item.key} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 p-3.5 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Dimension {idx + 1}</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">{label}</span>
                  <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
                  <div className="pt-2 flex items-baseline justify-between border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-500">Weightage</span>
                    <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">{weight}%</span>
                  </div>
                </div>
              );
            })}

            {(contractorWeights.customCriteria || []).map((c, i) => (
              <div key={c.id || i} className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3.5 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-black text-indigo-500 block">Custom {i + 1}</span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate">{c.label}</span>
                <p className="text-[10px] text-slate-500 leading-tight">{c.description || 'Master Admin custom criteria'}</p>
                <div className="pt-2 flex items-baseline justify-between border-t border-indigo-200 dark:border-indigo-800">
                  <span className="text-xs font-semibold text-slate-500">Weightage</span>
                  <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">{c.weight}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Style selection */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Interface Theme mode
          </h3>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-750">
            <div className="space-y-0.5">
              <p className="font-bold text-xs text-slate-700 dark:text-slate-200">Dark / Light UI Toggle</p>
              <p className="text-2xs text-slate-400">Dim workspace elements for high-density reviewing.</p>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-200 transition cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-spin" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
        </div>

        {/* Custom Color Overrides Palette (without background change) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Interactive Custom Palette
          </h3>

          <div className="space-y-3 text-xs text-slate-650 dark:text-slate-350">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Text Background Color:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customTxtBgColor || (darkMode ? '#1e293b' : '#ffffff')}
                  onChange={e => onUpdateCustomColors('', customTxtColor, customWordColor, e.target.value, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom background color specifically for text inputs, tables, and card containers"
                />
                {(customTxtBgColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors('', customTxtColor, customWordColor, '', customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Body Text Color:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customTxtColor || (darkMode ? '#f1f5f9' : '#0f1721')}
                  onChange={e => onUpdateCustomColors(customBgColor, e.target.value, customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom body text color"
                />
                {(customTxtColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, '', customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Text & Word Color Selection:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customWordColor || (darkMode ? '#3b82f6' : '#1e3a8a')}
                  onChange={e => onUpdateCustomColors(customBgColor, customTxtColor, e.target.value, customTxtBgColor, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom text & word highlights and headers color"
                />
                {(customWordColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, customTxtColor, '', customTxtBgColor, customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Chart Tooltip / Selection Label BG:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customChartTooltipBgColor || '#0f172a'}
                  onChange={e => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, customTxtBgColor, e.target.value)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom background color for chart tooltips"
                />
                {(customChartTooltipBgColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, customTxtBgColor, '')}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-750 pt-2 flex justify-end">
              <button
                type="button"
                onClick={onResetCustomColors}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              >
                Reset Colors
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Graphics Configs */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Ambient Workspace Graphics
          </h3>

          <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350">
            <div className="flex items-center justify-between">
              <label htmlFor="color-node" className="font-semibold">Node Color Network:</label>
              <input 
                id="color-node"
                type="color" 
                value={vantaColor}
                onChange={e => onUpdateVanta(e.target.value, vantaBgColor, vantaPoints)}
                className="w-10 h-7 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="color-workspace" className="font-semibold">Workspace Background:</label>
              <input 
                id="color-workspace"
                type="color" 
                value={vantaBgColor}
                onChange={e => onUpdateVanta(vantaColor, e.target.value, vantaPoints)}
                className="w-10 h-7 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <label htmlFor="range-density">Particle Network Density:</label>
                <span className="font-mono">{vantaPoints} pts</span>
              </div>
              <input 
                id="range-density"
                type="range" 
                min="5" 
                max="25" 
                value={vantaPoints}
                onChange={e => onUpdateVanta(vantaColor, vantaBgColor, parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-750 pt-3 flex justify-end">
              <button
                onClick={onResetVanta}
                className="flex items-center gap-1 text-2xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* USER SIGN-UP APPROVALS (MASTER ADMIN ONLY) */}
      {isMasterAdmin && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 p-6 rounded-2xl shadow-sm space-y-5">
           <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <Shield className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                  User Registration Requests & Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Approve or reject new user sign-up requests.</p>
              </div>
           </div>
           
           <div className="space-y-3">
             {allUsers.filter(u => u.isPendingApproval).length === 0 ? (
               <div className="text-center py-6 text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                 No pending sign-up requests at this time.
               </div>
             ) : (
               allUsers.filter(u => u.isPendingApproval).map(user => (
                 <div key={user.username} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-750">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="font-bold text-slate-800 dark:text-slate-200">{user.fullName || user.username}</span>
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">@{user.username}</span>
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 capitalize">{user.role.replace('_', ' ')}</span>
                     </div>
                     <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                       {user.email && <span>📧 {user.email}</span>}
                       {user.phone && <span>📞 {user.phone}</span>}
                       {user.assignedDirectorate && <span>🏢 {user.assignedDirectorate} Directorate</span>}
                     </div>
                   </div>
                   <div className="flex items-center gap-2 mt-3 sm:mt-0">
                     <button
                       onClick={() => onApproveUser?.(user.username)}
                       className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm cursor-pointer"
                     >
                       Approve Access
                     </button>
                     <button
                       onClick={() => onRejectUser?.(user.username)}
                       className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
                     >
                       Reject
                     </button>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      )}

      {/* MASTER ADMIN MODAL: Edit Scoring Weights & Save to Configuration Database */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight">Master Admin: Scoring Model Weightages</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded font-mono">
                      Database Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure percentage weight distribution. Saved to Firestore database (`config/scoring_weights`).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-zinc-100 text-xs">

              {/* Model Total Balance Validation Bar */}
              {(() => {
                const calcContractorSum = (w: ContractorScoringWeights) => {
                  const fidic = Number(w.fidic) || 0;
                  const pm = Number(w.projectMgmt) || 0;
                  const evm = Number(w.evm) || 0;
                  const kpi = Number(w.kpi) || 0;
                  const linear = Number(w.linear) || 0;
                  const rfi = Number(w.rfi ?? 10);
                  const mat = Number(w.materialApproval ?? 10);
                  const wir = Number(w.workInspection ?? 5);
                  const mob = Number(w.resourceMobilization ?? 5);
                  const custom = (w.customCriteria || []).reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
                  return fidic + pm + evm + kpi + linear + rfi + mat + wir + mob + custom;
                };

                const currentSum = calcContractorSum(tempContractorWeights);
                const isBalanced = currentSum === 100;

                const handleAutoBalance = () => {
                  const total = calcContractorSum(tempContractorWeights);
                  if (total <= 0) return;
                  const factor = 100 / total;
                  let fidic = Math.round((tempContractorWeights.fidic || 0) * factor);
                  let projectMgmt = Math.round((tempContractorWeights.projectMgmt || 0) * factor);
                  let evm = Math.round((tempContractorWeights.evm || 0) * factor);
                  let kpi = Math.round((tempContractorWeights.kpi || 0) * factor);
                  let linear = Math.round((tempContractorWeights.linear || 0) * factor);
                  let rfi = Math.round((tempContractorWeights.rfi ?? 10) * factor);
                  let materialApproval = Math.round((tempContractorWeights.materialApproval ?? 10) * factor);
                  let workInspection = Math.round((tempContractorWeights.workInspection ?? 5) * factor);
                  let resourceMobilization = Math.round((tempContractorWeights.resourceMobilization ?? 5) * factor);

                  const customCriteria = (tempContractorWeights.customCriteria || []).map(c => ({
                    ...c,
                    weight: Math.round((c.weight || 0) * factor)
                  }));

                  const customSum = customCriteria.reduce((acc, c) => acc + c.weight, 0);
                  const newTotal = fidic + projectMgmt + evm + kpi + linear + rfi + materialApproval + workInspection + resourceMobilization + customSum;
                  const diff = 100 - newTotal;
                  if (diff !== 0) projectMgmt = Math.max(0, projectMgmt + diff);

                  setTempContractorWeights({
                    ...tempContractorWeights,
                    fidic,
                    projectMgmt,
                    evm,
                    kpi,
                    linear,
                    rfi,
                    materialApproval,
                    workInspection,
                    resourceMobilization,
                    customCriteria
                  });
                };

                return (
                  <div className={`p-4 rounded-xl border transition-all ${
                    isBalanced
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-xs mb-2">
                      <span className="flex items-center gap-1.5">
                        {isBalanced ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                        )}
                        <span>Total Model Weight Distribution Balance</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {!isBalanced && (
                          <button
                            type="button"
                            onClick={handleAutoBalance}
                            className="px-2.5 py-1 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>⚡ Auto-Balance to 100%</span>
                          </button>
                        )}
                        <span className={`font-mono text-sm px-2.5 py-0.5 rounded-lg border font-black ${
                          isBalanced 
                            ? 'bg-emerald-500 text-white border-emerald-600' 
                            : 'bg-rose-600 text-white border-rose-700'
                        }`}>
                          {currentSum}% / 100%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden my-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isBalanced ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, currentSum)}%` }}
                      />
                    </div>

                    <p className="text-[11px] font-medium leading-relaxed">
                      {isBalanced ? (
                        <span>✅ Perfect model balance. The weightages sum to 100%. Ready to save to configuration database.</span>
                      ) : (
                        <span>
                          ⚠️ Model weights sum to <strong>{currentSum}%</strong>. Total must equal exactly 100%.{' '}
                          {currentSum < 100 ? `Add ${100 - currentSum}% across dimensions.` : `Reduce ${currentSum - 100}% across dimensions.`}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Editable Fields Grid */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-xs">
                        PROJECT CONTRACTOR EVALUATION DIMENSIONS & CRITERIA
                      </h4>
                      <p className="text-[11px] text-slate-500">Edit dimension names, criteria guidelines, and configure baseline weightages (% of 100).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newCriterion: CustomScoringCriterion = {
                            id: 'crit_' + Date.now(),
                            label: 'Custom Evaluation Criterion ' + ((tempContractorWeights.customCriteria?.length || 0) + 1),
                            weight: 5,
                            description: 'Custom evaluation dimension defined by Master Admin'
                          };
                          setTempContractorWeights({
                            ...tempContractorWeights,
                            customCriteria: [...(tempContractorWeights.customCriteria || []), newCriterion]
                          });
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2.5 py-1.5 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1 font-extrabold text-xs cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Custom Criteria</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempContractorWeights(DEFAULT_CONTRACTOR_SCORING_WEIGHTS)}
                        className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold text-xs cursor-pointer transition"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {CONTRACTOR_CRITERIA_META.map((item, idx) => {
                      const currentLabel = tempContractorWeights.labels?.[item.key] ?? item.defaultLabel;
                      const currentDesc = tempContractorWeights.descriptions?.[item.key] ?? item.defaultDesc;
                      const currentWeight = tempContractorWeights[item.key] ?? item.defaultWeight;

                      return (
                        <div key={item.key} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex-1">
                              <span className="text-[10px] uppercase font-black text-slate-400 block">Dimension {idx + 1}</span>
                              <input
                                type="text"
                                value={currentLabel}
                                onChange={(e) => setTempContractorWeights({
                                  ...tempContractorWeights,
                                  labels: {
                                    ...(tempContractorWeights.labels || {}),
                                    [item.key]: e.target.value
                                  }
                                })}
                                className="font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 focus:border-indigo-500 outline-none w-full text-xs py-0.5"
                                title="Click to edit dimension title"
                                placeholder="Dimension Title"
                              />
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{currentWeight}%</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Criteria & Description</label>
                            <input
                              type="text"
                              value={currentDesc}
                              onChange={(e) => setTempContractorWeights({
                                ...tempContractorWeights,
                                descriptions: {
                                  ...(tempContractorWeights.descriptions || {}),
                                  [item.key]: e.target.value
                                }
                              })}
                              className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 w-full outline-none focus:border-indigo-500"
                              placeholder="Description / notes..."
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <label className="text-2xs font-bold uppercase text-slate-400">Weightage (%):</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentWeight}
                              onChange={(e) => setTempContractorWeights({
                                ...tempContractorWeights,
                                [item.key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                              })}
                              className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 text-xs text-right"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom Added Criteria */}
                    {(tempContractorWeights.customCriteria || []).map((criterion, idx) => (
                      <div key={criterion.id} className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <input
                            type="text"
                            value={criterion.label}
                            onChange={(e) => {
                              const updated = (tempContractorWeights.customCriteria || []).map(c => c.id === criterion.id ? { ...c, label: e.target.value } : c);
                              setTempContractorWeights({ ...tempContractorWeights, customCriteria: updated });
                            }}
                            className="font-bold text-xs text-slate-800 dark:text-slate-200 bg-transparent border-b border-indigo-300 dark:border-indigo-700 focus:outline-none w-full"
                          />
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{criterion.weight}%</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (tempContractorWeights.customCriteria || []).filter(c => c.id !== criterion.id);
                                setTempContractorWeights({ ...tempContractorWeights, customCriteria: updated });
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Delete custom criterion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={criterion.weight}
                          onChange={(e) => {
                            const updated = (tempContractorWeights.customCriteria || []).map(c => c.id === criterion.id ? { ...c, weight: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) } : c);
                            setTempContractorWeights({ ...tempContractorWeights, customCriteria: updated });
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setTempContractorWeights(DEFAULT_CONTRACTOR_SCORING_WEIGHTS)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-700/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                {(() => {
                  const calcContractorSum = (w: ContractorScoringWeights) => {
                    const fidic = Number(w.fidic) || 0;
                    const pm = Number(w.projectMgmt) || 0;
                    const evm = Number(w.evm) || 0;
                    const kpi = Number(w.kpi) || 0;
                    const linear = Number(w.linear) || 0;
                    const rfi = Number(w.rfi ?? 10);
                    const mat = Number(w.materialApproval ?? 10);
                    const wir = Number(w.workInspection ?? 5);
                    const mob = Number(w.resourceMobilization ?? 5);
                    const custom = (w.customCriteria || []).reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
                    return fidic + pm + evm + kpi + linear + rfi + mat + wir + mob + custom;
                  };

                  const currentSum = calcContractorSum(tempContractorWeights);
                  const isValid = currentSum === 100;

                  return (
                    <button
                      type="button"
                      disabled={!isValid || isSaving}
                      onClick={handleSaveWeights}
                      className={`px-5 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm ${
                        isValid && !isSaving
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-98'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving to Database...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save & Sync to Configuration Database</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ETHIO TELECOM MYSQL SCHEMA VIEWER MODAL */}
      {isSchemaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight">ethiotelecom_mysql_schema.sql</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-slate-950 rounded font-mono">
                      InnoDB / utf8mb4
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Traditional DDL schema optimized for phpMyAdmin import on Ethio Telecom hosting (lin1.ethiotelecom.et).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySchema}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {hasCopiedSchema ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>

                <a
                  href="/api/mysql/download-schema"
                  download="ethiotelecom_mysql_schema.sql"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => setIsSchemaModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SQL Content Box */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950">
              <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre p-2 select-all">
                {schemaSqlText || '-- Fetching schema SQL from server...'}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div>
                💡 <strong>phpMyAdmin Tip:</strong> Log in to cPanel, open phpMyAdmin, select your database, click <strong>Import</strong>, and upload this file.
              </div>
              <button
                onClick={() => setIsSchemaModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}


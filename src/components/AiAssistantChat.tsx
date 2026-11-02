import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User as UserIcon, 
  RefreshCw, 
  AlertCircle, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  FileText, 
  Clock, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Project, AiChatMessage } from '../types';

interface AiAssistantChatProps {
  project: Project;
  currentUserObj: { username: string; role: string; fullName?: string } | null;
  onProjectUpdate: (updatedFields: Partial<Project>, logMessage: string) => void;
}

// Markdown parser helper for rich chat responses
function renderFormattedMessage(text: string) {
  if (!text) return null;

  // Split into lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-indigo-500">
          {listBuffer.items.map((item, i) => (
            <li key={i} className="text-xs leading-relaxed text-slate-700 dark:text-zinc-200">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-decimal marker:text-indigo-500 marker:font-bold">
          {listBuffer.items.map((item, i) => (
            <li key={i} className="text-xs leading-relaxed text-slate-700 dark:text-zinc-200">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();

    // Empty lines
    if (!line) {
      flushList();
      continue;
    }

    // Horizontal Rule
    if (line === '---' || line === '***' || line === '___') {
      flushList();
      elements.push(
        <hr key={`hr-${idx}`} className="my-3 border-slate-200 dark:border-slate-800" />
      );
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={`h4-${idx}`} className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mt-2.5 mb-1 flex items-center gap-1.5">
          {parseInlineMarkdown(line.slice(5))}
        </h5>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${idx}`} className="text-sm font-extrabold text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-1.5">
          {parseInlineMarkdown(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${idx}`} className="text-base font-black text-slate-900 dark:text-white mt-3.5 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          {parseInlineMarkdown(line.slice(3))}
        </h3>
      );
      continue;
    }

    // Unordered List Items (- or *)
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(ulMatch[1]);
      continue;
    }

    // Ordered List Items (1. , 2. )
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(olMatch[2]);
      continue;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-slate-700 dark:text-zinc-200 my-1">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

// Inline markdown parser: **bold**, *italic*, `code`, and FIDIC clause badges
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**), inline code (`...`), or italic (*...*)
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return tokens.map((token, i) => {
    if (!token) return null;

    // Bold **text**
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const inner = token.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {inner}
        </strong>
      );
    }

    // Inline code `text`
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      const inner = token.slice(1, -1);
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
          {inner}
        </code>
      );
    }

    // Italic *text*
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      const inner = token.slice(1, -1);
      return (
        <em key={i} className="italic text-slate-600 dark:text-slate-300">
          {inner}
        </em>
      );
    }

    // Process FIDIC Clauses highlight in regular text
    return highlightFidicClauses(token, i);
  });
}

function highlightFidicClauses(text: string, baseKey: number): React.ReactNode {
  // Pattern to catch Clause references like "Clause 8.4", "Sub-Clause 14.3", "Clause 20.1", "Clause 13", "Clause 8.6"
  const fidicRegex = /\b((?:Sub-Clause|Clause)\s+\d+(?:\.\d+)?)\b/gi;
  const parts = text.split(fidicRegex);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, pIdx) => {
    if (fidicRegex.test(part)) {
      return (
        <span 
          key={`${baseKey}-${pIdx}`} 
          className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded font-mono font-bold text-[11px] bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800/80 shadow-2xs"
          title="FIDIC Contract Clause Reference"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function AiAssistantChat({ project, currentUserObj, onProjectUpdate }: AiAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatHistory: AiChatMessage[] = project.aiChatHistory || [];

  // Scroll to bottom when chat updates or is opened
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen, isLoading]);

  // Escape key handler to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Construct live project context
  const getProjectContext = useCallback(() => {
    const slippageVal = typeof project.physicalProgress === 'number' && typeof (project as any).plannedProgress === 'number'
      ? ((project.physicalProgress - (project as any).plannedProgress)).toFixed(1)
      : '0.0';

    return {
      name: project.name,
      contractor: project.contractor,
      consultant: project.consultant || project.supervisionConsultant?.firmName || 'Supervision Consultant',
      contractType: project.contractType || project.fidicContractType || 'FIDIC Red Book (MDB Harmonized)',
      lengthKm: project.lengthKm,
      physicalProgress: project.physicalProgress,
      plannedProgress: (project as any).plannedProgress ?? 0,
      slippage: slippageVal,
      status: project.status || 'In Progress',
      risksCount: project.risks?.length || 0,
      submittalsCount: project.supervisionConsultant?.submittalKpis?.length || 0,
      paymentsCount: project.payment?.length || 0
    };
  }, [project]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputValue).trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) {
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setErrorMsg(null);
    setIsLoading(true);

    const userName = currentUserObj?.fullName || currentUserObj?.username || 'ERA Engineer';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    const userMsg: AiChatMessage = {
      role: 'user',
      content: textToSend,
      username: userName,
      timestamp
    };
    const updatedHistoryWithUser: AiChatMessage[] = [...chatHistory, userMsg];
    
    // Save User message immediately
    onProjectUpdate({ aiChatHistory: updatedHistoryWithUser }, `AI Chat Message by ${userName}`);

    try {
      let aiResponseText = '';
      const context = getProjectContext();

      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            projectContext: context,
            history: chatHistory.slice(-8)
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResponseText = data.text || '';
        } else {
          const errData = await response.json().catch(() => ({}));
          aiResponseText = errData.text || '';
        }
      } catch (e) {
        console.warn('API fetch failed, falling back to local client advisory', e);
      }

      // If network failed completely or returned blank, provide rich client fallback
      if (!aiResponseText) {
        aiResponseText = `### 🏛️ ERA Contractual & Engineering Advisory Notice
**Project:** ${project.name}
**Query:** "${textToSend}"

**Contractual Directives (ERA Standard Specifications & FIDIC Red Book):**
1. **Clause 8.4 (Extension of Time):** Ensure any event giving rise to delay is supported by contemporaneous daily records, weather logs, and served to the Engineer within 28 days under Sub-Clause 20.1.
2. **Clause 13 (Variations & Adjustments):** Physical scope revisions must be executed via formal Variation Orders with agreed BOQ unit rates.
3. **Sub-Clause 14.3 & 14.6 (IPC Payments):** Ensure interim certificates comply with statutory deductions, price adjustments (Sub-Clause 13.8), and advance repayment amortization.
4. **Submittal Turnaround:** Adhere strictly to the 14-calendar-day SLA for Requests for Inspection (RFIs) and material submittals.`;
      }

      // 2. Add AI response to history
      const aiMsg: AiChatMessage = {
        role: 'assistant',
        content: aiResponseText,
        username: 'ERA AI Consultant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalHistory: AiChatMessage[] = [...updatedHistoryWithUser, aiMsg];
      onProjectUpdate({ aiChatHistory: finalHistory }, 'AI Consultant Answer Received');
    } catch (err: any) {
      console.error('Error in AI Assistant:', err);
      setErrorMsg('An error occurred while generating the advisory response.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action Prompts
  const handleRunHealthAudit = () => {
    const seriesList = (project.series || []).slice(0, 5).map(s => `- ${s.desc}: Contract: ${s.contractAmt} ETB, Executed: ${s.execAmt} ETB (${s.progress}%)`).join('\n');
    const riskList = (project.risks || []).slice(0, 3).map(r => `- [${r.status}] ${r.category}: ${r.description}`).join('\n');
    
    const prompt = `Conduct a comprehensive ERA Project Health Audit for "${project.name}" (Contract Type: ${project.contractType || 'FIDIC Red Book'}).
Key Parameters:
- Contractor: ${project.contractor}
- Consultant: ${project.consultant}
- Physical Accomplishment: ${project.physicalProgress}%
- Road Length: ${project.lengthKm} KM

Active BOQ Series Sample:
${seriesList || 'No series loaded'}

Active Project Risks:
${riskList || 'No critical risks recorded'}

Please evaluate progress alignment, schedule slippage risk, IPC cashflow health, and outline 3 actionable contractual directives for the Resident Engineer under FIDIC terms.`;

    handleSendMessage(prompt);
  };

  const handleEotPrompt = () => {
    handleSendMessage(`Provide a comprehensive legal and technical assessment under FIDIC Sub-Clause 8.4 [Extension of Time for Completion] and Sub-Clause 20.1 [Contractor's Claims] for project "${project.name}". Detail the mandatory notice timelines, contemporary record requirements, critical path float analysis, and the Resident Engineer's determination procedure under Sub-Clause 3.5.`);
  };

  const handlePaymentPrompt = () => {
    handleSendMessage(`Explain the contractual rules for Interim Payment Certificates (IPCs) under FIDIC Clause 14 for "${project.name}", including advance payment recovery amortization (Sub-Clause 14.2), 5% retention money deduction & release (Sub-Clause 14.9), and price adjustment escalation formula implementation (Sub-Clause 13.8).`);
  };

  const handleRowPrompt = () => {
    handleSendMessage(`What are the legal entitlements and mitigation steps when Right-of-Way (ROW) obstructions, utility pole relocations, or delayed compensation halt critical path earthworks under FIDIC Sub-Clause 2.1 [Right of Access to the Site] on "${project.name}"?`);
  };

  const handleNoticeLetterPrompt = () => {
    handleSendMessage(`Draft a formal contractual Notice to Correct under FIDIC Sub-Clause 8.6 [Rate of Progress] and Sub-Clause 15.1 from the Resident Engineer to the Contractor (${project.contractor}) regarding critical progress slippage on "${project.name}".`);
  };

  // Copy message text to clipboard
  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  // Export chat transcript as text dossier
  const handleExportTranscript = () => {
    if (chatHistory.length === 0) return;

    const header = `========================================================================
ETHIOPIAN ROADS ADMINISTRATION (ERA)
AI CONTRACT & ENGINEERING CONSULTANT CHAT DOSSIER
========================================================================
Project: ${project.name}
Contractor: ${project.contractor}
Consultant: ${project.consultant || 'N/A'}
Export Date: ${new Date().toLocaleString()}
Total Messages: ${chatHistory.length}
========================================================================\n\n`;

    const body = chatHistory.map((m, idx) => {
      const speaker = m.role === 'assistant' ? `🤖 ERA AI CONSULTANT` : `👤 ${m.username.toUpperCase()}`;
      return `[#${idx + 1}] ${speaker} (${m.timestamp})\n------------------------------------------------------------------------\n${m.content}\n\n`;
    }).join('\n');

    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERA_AI_Consultant_Dossier_${project.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear chat history with non-blocking inline confirmation
  const handleConfirmClear = () => {
    onProjectUpdate({ aiChatHistory: [] }, 'Cleared AI Chat History');
    setShowClearConfirm(false);
  };

  return (
    <>
      {/* Floating AI Trigger Button (hidden in print/PDF views) */}
      <button
        id="floating-ai-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open ERA AI Engineering & FIDIC Contract Consultant"
        className="print:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold p-3.5 md:p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-300 group border-2 border-white/30 dark:border-indigo-400/30"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-xs md:text-sm font-bold tracking-wide">
          ERA AI Consultant
        </span>
        {chatHistory.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
            {chatHistory.length > 99 ? '99+' : chatHistory.length}
          </span>
        )}
      </button>

      {/* AI Drawer / Chat Panel */}
      {isOpen && (
        <div 
          className="print:hidden fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-850/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm md:text-base flex items-center gap-2">
                    ERA FIDIC Assistant
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Live Sync
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 truncate max-w-xs" title={project.name}>
                    {project.name}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1">
                {chatHistory.length > 0 && (
                  <>
                    <button
                      onClick={handleExportTranscript}
                      className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Export Chat Dossier (.txt)"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Clear Chat History"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Close Assistant (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inline Clear Confirmation Banner */}
            {showClearConfirm && (
              <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/60 p-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Clear entire AI chat history for this project?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmClear}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs transition"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Project Quick Health Metric Strip */}
            <div className="bg-slate-100/70 dark:bg-slate-850/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between overflow-x-auto gap-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 font-medium">Progress:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                  {project.physicalProgress}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 font-medium">Contract:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {project.contractType || 'DBB'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 font-medium">Length:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {project.lengthKm} KM
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 font-medium">Role:</span>
                <span className="font-mono text-2xs uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {currentUserObj?.role?.replace('_', ' ') || 'User'}
                </span>
              </div>
            </div>

            {/* Chat History Panel */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/30"
            >
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
                    <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-base">
                      ERA FIDIC Engineering Assistant
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Instant contractual advisory, delay float audits, Clause 8.4 EOT claims, and payment reconciliation for Ethiopian trunk road projects.
                    </p>
                  </div>

                  {/* Primary Call to Action */}
                  <div className="w-full max-w-md pt-2 space-y-2">
                    <button
                      onClick={handleRunHealthAudit}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Terminal className="w-4 h-4 text-amber-300" />
                      Run Auto-Generated Project Health Audit
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 text-left">
                      <button
                        onClick={handleEotPrompt}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Clause 8.4 EOT Protocol</span>
                      </button>
                      <button
                        onClick={handlePaymentPrompt}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Clause 14 IPC Payments</span>
                      </button>
                      <button
                        onClick={handleRowPrompt}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Sub-Clause 2.1 ROW Obstructions</span>
                      </button>
                      <button
                        onClick={handleNoticeLetterPrompt}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                      >
                        <Terminal className="w-4 h-4 text-purple-500 shrink-0" />
                        <span>Draft Clause 8.6 Notice</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, index) => {
                  const isAi = msg.role === 'assistant';
                  const isCopied = copiedIndex === index;

                  return (
                    <div 
                      key={index}
                      className={`flex gap-3 max-w-[90%] md:max-w-[85%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-xs ${
                        isAi 
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {isAi ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className={`flex items-center gap-2 text-[10px] font-mono text-slate-400 ${!isAi ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-600 dark:text-slate-300">{msg.username}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div className={`p-4 rounded-2xl text-xs leading-relaxed relative group shadow-sm ${
                          isAi 
                            ? 'bg-white dark:bg-slate-850 text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-800' 
                            : 'bg-indigo-600 text-white font-medium shadow-indigo-600/20'
                        }`}>
                          {isAi ? (
                            <>
                              {renderFormattedMessage(msg.content)}
                              {/* Copy Button */}
                              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyMessage(msg.content, index)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] flex items-center gap-1 shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  title="Copy response to clipboard"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-emerald-600 font-bold">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="whitespace-pre-line text-xs font-medium">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Senior Consultant analyzing FIDIC provisions...</span>
                    <p className="text-[10px] text-slate-400 font-mono">Evaluating live baseline CPM, BOQ items & contractual clauses</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex gap-2.5 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold">Advisory Alert:</span> {errorMsg}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Chips (Visible during active conversation) */}
            {chatHistory.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={handleRunHealthAudit}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap shrink-0 transition"
                >
                  🩺 Health Audit
                </button>
                <button
                  onClick={handleEotPrompt}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 transition"
                >
                  ⏱️ Clause 8.4 EOT
                </button>
                <button
                  onClick={handlePaymentPrompt}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 transition"
                >
                  💰 Clause 14 IPCs
                </button>
                <button
                  onClick={handleRowPrompt}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 transition"
                >
                  🚧 ROW & Access
                </button>
                <button
                  onClick={handleNoticeLetterPrompt}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 transition"
                >
                  ✉️ Notice Letter
                </button>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about FIDIC clauses, CPM float delays, payments, or claims... (Enter to send, Shift+Enter for new line)"
                  className="flex-1 bg-transparent text-slate-900 dark:text-white rounded-xl px-2 py-1 text-xs md:text-sm outline-none resize-none max-h-28 placeholder:text-slate-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 text-white rounded-xl shadow-md transition-all duration-200 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  title="Send query"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pt-2">
                <span>Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline</span>
                <span className="font-mono text-2xs">ERA Infrastructure Intelligence</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

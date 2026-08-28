import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  X, 
  Printer, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Download,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { USER_GUIDE_SECTIONS_META } from '../data/userGuideSectionsData';
import UserGuideSections from './UserGuideSections';
import { downloadUserManual } from '../data/userManual';

interface UserGuideManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserGuideManualModal({ isOpen, onClose }: UserGuideManualModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('sec-intro');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter sections based on search query
  const filteredSections = USER_GUIDE_SECTIONS_META.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.number.toString().includes(searchQuery)
  );

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(sectionId);
    if (element && scrollContainerRef.current) {
      const topOffset = element.offsetTop - 80;
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, topOffset),
        behavior: 'smooth'
      });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      // Small timeout to allow UI update
      setTimeout(() => {
        downloadUserManual();
        setIsGeneratingPdf(false);
      }, 100);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="user-guide-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden"
      >
        <motion.div
          id="user-guide-modal-container"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isMaximized ? 'w-full h-full rounded-none' : 'w-full max-w-7xl h-[92vh]'
          }`}
        >
          {/* Top Header Bar */}
          <div 
            id="user-guide-modal-header"
            className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Ethiopian Roads Administration ERP
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Official User Guide
                  </span>
                </div>
                <p className="text-2xs text-slate-400 font-medium">
                  Comprehensive 30-Section Documentation & Interactive Operational Guide
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="btn-download-pdf-manual"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Download complete vector PDF documentation manual"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Manual'}</span>
              </button>

              <button
                id="btn-print-user-guide"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Print documentation or save to printer PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / Save PDF</span>
              </button>

              <button
                id="btn-toggle-maximize-guide"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title={isMaximized ? 'Restore window size' : 'Maximize window'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                id="btn-close-user-guide"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                title="Close manual (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Search & Filter Subheader */}
          <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-user-guide"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guide by page, feature, FIDIC clause, or keyword..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-zinc-200 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Quick Jumps:</span>
              <button 
                onClick={() => scrollToSection('sec-intro')}
                className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
              >
                Introduction
              </button>
              <span>•</span>
              <button 
                onClick={() => scrollToSection('sec-dash')}
                className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
              >
                Dashboard
              </button>
              <span>•</span>
              <button 
                onClick={() => scrollToSection('sec-consultant')}
                className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
              >
                Consultant SLA
              </button>
              <span>•</span>
              <button 
                onClick={() => scrollToSection('sec-faqs')}
                className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
              >
                FAQs
              </button>
              <span>•</span>
              <button 
                onClick={() => scrollToSection('sec-contact')}
                className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
              >
                Support
              </button>
            </div>
          </div>

          {/* Modal Body: Two-Column Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Navigation Sidebar */}
            <div 
              id="user-guide-sidebar"
              className="w-72 sm:w-80 bg-slate-50 dark:bg-slate-950/70 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 shrink-0 hidden lg:block"
            >
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-2xs font-extrabold uppercase tracking-wider text-slate-400">
                  All 30 Guide Sections
                </div>
                {filteredSections.map(sec => {
                  const Icon = sec.icon;
                  const isActive = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full p-2 rounded-xl text-left text-xs transition flex items-center justify-between group ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                        <span className="truncate">
                          {sec.number}. {sec.title}
                        </span>
                      </div>
                      <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-400 group-hover:translate-x-0.5'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Scrollable Viewport */}
            <div 
              ref={scrollContainerRef}
              id="user-guide-viewport"
              className="flex-1 overflow-y-auto p-5 sm:p-8 bg-white dark:bg-slate-900 scroll-smooth"
            >
              <div className="max-w-4xl mx-auto">
                <UserGuideSections 
                  onScrollToSection={scrollToSection} 
                  onDownloadPdf={handleDownloadPdf} 
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

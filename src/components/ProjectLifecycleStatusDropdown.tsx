import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Archive, Lock } from 'lucide-react';
import { ProjectLifecycleStatus, isProjectClosed, isMasterAdminOnly, User } from '../types';

interface ProjectLifecycleStatusDropdownProps {
  status?: ProjectLifecycleStatus | string;
  onChangeStatus: (newStatus: ProjectLifecycleStatus) => void;
  currentUserObj?: User | null;
  size?: 'compact' | 'md';
  triggerClassName?: string;
  title?: string;
}

const ACTIVE_STATUS_OPTIONS: Array<{ value: ProjectLifecycleStatus; label: string; icon: string }> = [
  { value: 'In Progress', label: 'In Progress', icon: '🟢' },
  { value: 'Completed', label: 'Completed', icon: '✅' },
  { value: 'Suspended', label: 'Suspended', icon: '⏸️' },
  { value: 'Terminated', label: 'Terminated', icon: '🛑' },
];

const ARCHIVE_STATUS_OPTIONS: Array<{ value: ProjectLifecycleStatus; label: string; icon: string }> = [
  { value: 'Completed and Closed', label: 'Completed & Closed (Archive)', icon: '🔒' },
  { value: 'Terminated and Closed', label: 'Terminated & Closed (Archive)', icon: '🔒' },
  { value: 'Archived', label: 'Archived', icon: '📦' },
];

export function getLifecycleBadgeMeta(status?: string) {
  const s = status || 'In Progress';
  switch (s) {
    case 'Completed':
      return {
        label: 'Completed',
        icon: '✅',
        style: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'Completed and Closed':
      return {
        label: 'Completed & Closed',
        icon: '🔒',
        style: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      };
    case 'Terminated and Closed':
      return {
        label: 'Terminated & Closed',
        icon: '🔒',
        style: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
      };
    case 'Suspended':
      return {
        label: 'Suspended',
        icon: '⏸️',
        style: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'Terminated':
      return {
        label: 'Terminated',
        icon: '🛑',
        style: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'Archived':
      return {
        label: 'Archived',
        icon: '📦',
        style: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'In Progress':
    default:
      return {
        label: 'In Progress',
        icon: '🟢',
        style: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      };
  }
}

export default function ProjectLifecycleStatusDropdown({
  status,
  onChangeStatus,
  currentUserObj,
  size = 'compact',
  triggerClassName,
  title,
}: ProjectLifecycleStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 272,
    openUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentStatus = (status || 'In Progress') as ProjectLifecycleStatus;
  const isClosed = isProjectClosed(currentStatus);
  const isArchivedFlag = currentStatus === 'Archived' || isClosed;
  const isMaster = isMasterAdminOnly(currentUserObj);
  const badgeMeta = getLifecycleBadgeMeta(currentStatus);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 280;
    const estimatedHeight = 365;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    let left = rect.right - menuWidth;
    if (left < 8) left = Math.max(8, rect.left);
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }

    const top = openUpward
      ? Math.max(8, rect.top - estimatedHeight - 6)
      : Math.min(window.innerHeight - estimatedHeight - 8, rect.bottom + 6);

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left,
      width: menuWidth,
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchivedFlag) {
      if (!isMaster) return;
      const restoredStatus: ProjectLifecycleStatus =
        currentStatus === 'Completed and Closed'
          ? 'Completed'
          : currentStatus === 'Terminated and Closed'
            ? 'Terminated'
            : 'In Progress';
      onChangeStatus(restoredStatus);
    } else {
      onChangeStatus('Archived');
    }
    setIsOpen(false);
  };

  const handleSelectOption = (nextStatus: ProjectLifecycleStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeStatus(nextStatus);
    setIsOpen(false);
  };

  const stopAllPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="relative inline-flex items-center"
      onClick={stopAllPropagation}
      onMouseDown={stopAllPropagation}
      onPointerDown={stopAllPropagation}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseDown={stopAllPropagation}
        onPointerDown={stopAllPropagation}
        title={
          title ||
          (isClosed
            ? 'Project is in Archive (Closed). Only Master Admin has privilege to reopen or change its lifecycle.'
            : 'Change project lifecycle status or toggle Archived state')
        }
        className={
          triggerClassName ||
          (size === 'md'
            ? 'inline-flex items-center gap-1.5 bg-transparent text-[12px] font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition'
            : `inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-lg border outline-none cursor-pointer transition shadow-2xs ${badgeMeta.style}`)
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{badgeMeta.icon}</span>
        <span>{badgeMeta.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-75 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            onClick={stopAllPropagation}
            onMouseDown={stopAllPropagation}
            onPointerDown={stopAllPropagation}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpward ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100"
            role="menu"
          >
            {/* Dedicated Archive Toggle Switch Header */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isArchivedFlag
                        ? 'bg-slate-800 text-white dark:bg-amber-500/20 dark:text-amber-300'
                        : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                      <span>Mark as Archived</span>
                      {isArchivedFlag && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded">
                          On
                        </span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                      Excludes project &amp; all reports from all group views.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isArchivedFlag}
                  disabled={isArchivedFlag && !isMaster}
                  onClick={handleToggleArchive}
                  title={
                    isArchivedFlag && !isMaster
                      ? 'Only Master Admin can unarchive a closed project'
                      : isArchivedFlag
                        ? 'Toggle OFF to restore project to Active Portfolio & Group Reports'
                        : 'Toggle ON to mark project as Archived and exclude from all Group Views'
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isArchivedFlag
                      ? isMaster
                        ? 'bg-amber-600 cursor-pointer'
                        : 'bg-slate-400 cursor-not-allowed opacity-70'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 cursor-pointer'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isArchivedFlag ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {isArchivedFlag && !isMaster && (
                <div className="mt-2 flex items-center gap-1 text-[9.5px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Only Master Admin can restore archived projects.</span>
                </div>
              )}
            </div>

            {/* Active Portfolio Statuses */}
            <div className="p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Portfolio
              </div>
              {ACTIVE_STATUS_OPTIONS.map((opt) => {
                const isSelected = currentStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelectOption(opt.value, e)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* Archive Repository Statuses */}
            <div className="p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Archive Repository (Closed)
              </div>
              {ARCHIVE_STATUS_OPTIONS.map((opt) => {
                const isSelected = currentStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelectOption(opt.value, e)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

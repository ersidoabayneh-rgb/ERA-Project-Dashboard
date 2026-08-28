import React from 'react';

interface ScreenMockupProps {
  title: string;
  url: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}

export default function ScreenMockup({
  title,
  url,
  badge,
  badgeColor = 'bg-blue-600',
  children
}: ScreenMockupProps) {
  return (
    <div className="my-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-lg transition duration-200">
      {/* Top Browser Bar */}
      <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-3 text-2xs font-mono">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <span className="text-slate-400 font-sans font-bold ml-2 hidden sm:inline">{title}</span>
        </div>
        <div className="flex-1 max-w-lg mx-2 px-3 py-1 bg-slate-800 rounded-lg text-slate-300 truncate text-[11px]">
          {url}
        </div>
        {badge && (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Screen Canvas Preview Content */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-200 text-xs">
        {children}
      </div>
    </div>
  );
}

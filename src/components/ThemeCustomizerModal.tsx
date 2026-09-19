import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  X, 
  Check, 
  RotateCcw, 
  Image as ImageIcon, 
  Sliders, 
  Upload, 
  Sparkles, 
  Sun, 
  Moon, 
  Eye, 
  Layers,
  Link,
  Trash2
} from 'lucide-react';
import { ThemeSettings, ThemePresetId, DEFAULT_THEME_SETTINGS } from '../types';

export interface ThemePresetOption {
  id: ThemePresetId;
  name: string;
  description: string;
  isDark: boolean;
  bgPreview: string;
  cardPreview: string;
  textPreview: string;
  borderPreview: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    id: 'light-slate',
    name: 'Light Slate',
    description: 'Clean executive light palette with high-contrast slate text and crisp borders.',
    isDark: false,
    bgPreview: '#f8fafc',
    cardPreview: '#ffffff',
    textPreview: '#0f172a',
    borderPreview: '#e2e8f0',
  },
  {
    id: 'deep-dark',
    name: 'Deep Dark',
    description: 'Sophisticated midnight charcoal and slate tone for eye-safe night operation.',
    isDark: true,
    bgPreview: '#0f172a',
    cardPreview: '#1e293b',
    textPreview: '#f8fafc',
    borderPreview: '#334155',
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'High-tech deep sapphire and navy theme with luminescent telemetry highlights.',
    isDark: true,
    bgPreview: '#0a1128',
    cardPreview: '#1c2541',
    textPreview: '#e0e6ed',
    borderPreview: '#2d3f66',
  },
  {
    id: 'cyber-blueprint',
    name: 'Cyber Blueprint',
    description: 'Civil engineering CAD and technical matrix aesthetic with blueprint styling.',
    isDark: true,
    bgPreview: '#031926',
    cardPreview: '#002538',
    textPreview: '#d8f3dc',
    borderPreview: '#004666',
  },
  {
    id: 'sepia-warmth',
    name: 'Sepia Warmth',
    description: 'Warm parchment editorial palette with gentle amber and natural earth tones.',
    isDark: false,
    bgPreview: '#faf6ee',
    cardPreview: '#f4ede0',
    textPreview: '#2c2523',
    borderPreview: '#e6ded1',
  },
];

export interface AccentColorOption {
  name: string;
  hex: string;
  bgClass: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  { name: 'Royal Blue', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { name: 'Emerald Green', hex: '#059669', bgClass: 'bg-emerald-600' },
  { name: 'Amber Gold', hex: '#d97706', bgClass: 'bg-amber-600' },
  { name: 'Violet Purple', hex: '#7c3aed', bgClass: 'bg-purple-600' },
  { name: 'Rose Pink', hex: '#e11d48', bgClass: 'bg-rose-600' },
  { name: 'Cyan Sky', hex: '#0284c7', bgClass: 'bg-sky-600' },
];

export interface WallpaperOption {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
}

export const INFRASTRUCTURE_WALLPAPERS: WallpaperOption[] = [
  {
    id: 'expressway-overpass',
    name: 'Expressway Viaduct',
    category: 'Expressway',
    url: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'mountain-highway',
    name: 'Mountain Pass Highway',
    category: 'High-Altitude Corridor',
    url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'suspension-bridge',
    name: 'Cable Suspension Bridge',
    category: 'Bridge Engineering',
    url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'asphalt-paving',
    name: 'Asphalt Paving Works',
    category: 'Road Construction',
    url: 'https://images.unsplash.com/photo-1584463699039-389db2d58cb4?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1584463699039-389db2d58cb4?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'civil-blueprint',
    name: 'Civil Engineering Matrix',
    category: 'Architectural Blueprint',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=70',
  },
  {
    id: 'night-expressway',
    name: 'Night Expressway Lights',
    category: 'Urban Infrastructure',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=70',
  },
];

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeSettings: ThemeSettings;
  onUpdateTheme: (settings: ThemeSettings) => void;
  onResetTheme: () => void;
}

export default function ThemeCustomizerModal({
  isOpen,
  onClose,
  themeSettings,
  onUpdateTheme,
  onResetTheme,
}: ThemeCustomizerModalProps) {
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlError, setUrlError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'accents' | 'wallpapers' | 'filters'>('presets');

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: ThemePresetId) => {
    onUpdateTheme({
      ...themeSettings,
      preset: presetId,
    });
  };

  const handleSelectAccent = (colorHex: string) => {
    onUpdateTheme({
      ...themeSettings,
      accentColor: colorHex,
    });
  };

  const handleSelectWallpaper = (url: string) => {
    onUpdateTheme({
      ...themeSettings,
      wallpaper: url,
    });
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    try {
      new URL(customUrlInput.trim());
      setUrlError(false);
      onUpdateTheme({
        ...themeSettings,
        wallpaper: customUrlInput.trim(),
      });
      setCustomUrlInput('');
    } catch {
      setUrlError(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onUpdateTheme({
          ...themeSettings,
          wallpaper: result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 z-10"
        >
          {/* Top Decorative Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/20">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20"
                style={{ backgroundColor: themeSettings.accentColor }}
              >
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Theme, Colors & Background Customizer
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-2.5 h-2.5" /> Live Preview
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Personalize the ERP interface with executive presets, custom accents, and infrastructure wallpapers.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
              title="Close Customizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Theme Presets ({THEME_PRESETS.length})
            </button>
            <button
              onClick={() => setActiveTab('accents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'accents'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              Accent Colors
            </button>
            <button
              onClick={() => setActiveTab('wallpapers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'wallpapers'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              Wallpaper Gallery {themeSettings.wallpaper ? '• Active' : ''}
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'filters'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              Blur & Opacity ({themeSettings.blur}px / {themeSettings.opacity}%)
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
            
            {/* TAB 1: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Executive Theme Presets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Switch the global contrast, typography styling, and background mood instantly.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = themeSettings.preset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/60'
                        }`}
                      >
                        {/* Swatch Mini Preview Card */}
                        <div 
                          className="h-20 rounded-xl p-2.5 flex flex-col justify-between border shadow-xs"
                          style={{
                            backgroundColor: preset.bgPreview,
                            borderColor: preset.borderPreview,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span 
                              className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ 
                                backgroundColor: preset.cardPreview, 
                                color: preset.textPreview,
                                border: `1px solid ${preset.borderPreview}` 
                              }}
                            >
                              ERA ERP
                            </span>
                            {preset.isDark ? (
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </div>

                          <div 
                            className="p-1.5 rounded-lg flex items-center justify-between text-[9px] font-bold"
                            style={{ 
                              backgroundColor: preset.cardPreview,
                              color: preset.textPreview,
                              border: `1px solid ${preset.borderPreview}`
                            }}
                          >
                            <span>Contract #142</span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeSettings.accentColor }} />
                          </div>
                        </div>

                        {/* Text Details */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {preset.name}
                            </h4>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: ACCENT COLORS */}
            {activeTab === 'accents' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Primary Brand Accent Color
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Controls active navigation badges, primary commit buttons, status highlights, and interactive chart accents.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {ACCENT_COLORS.map((accent) => {
                    const isSelected = themeSettings.accentColor.toLowerCase() === accent.hex.toLowerCase();
                    return (
                      <button
                        key={accent.name}
                        onClick={() => handleSelectAccent(accent.hex)}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition text-center cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/60'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                          style={{ backgroundColor: accent.hex }}
                        >
                          {isSelected && <Check className="w-5 h-5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {accent.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">
                            {accent.hex}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={themeSettings.accentColor}
                        onChange={(e) => handleSelectAccent(e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer opacity-0 absolute inset-0"
                      />
                      <div 
                        className="w-12 h-12 rounded-xl border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-inner cursor-pointer"
                        style={{ backgroundColor: themeSettings.accentColor }}
                      >
                        <Palette className="w-5 h-5 text-white drop-shadow-sm" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Custom Hex Color Picker
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Click the swatch or enter a custom hex value for precise branding.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#</span>
                    <input
                      type="text"
                      maxLength={7}
                      value={themeSettings.accentColor.replace('#', '')}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
                          handleSelectAccent(`#${val}`);
                        }
                      }}
                      placeholder="2563EB"
                      className="w-28 px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl uppercase text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Live Preview Sample Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Live Accent Feedback Preview
                  </span>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition"
                      style={{ backgroundColor: themeSettings.accentColor }}
                    >
                      Primary Action Button
                    </button>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: themeSettings.accentColor }}
                    >
                      Active Status Tag
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: themeSettings.accentColor }}>
                      <Check className="w-4 h-4" /> Selected Metric Item
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WALLPAPER GALLERY */}
            {activeTab === 'wallpapers' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Infrastructure Wallpaper Gallery
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select a curated high-resolution highway infrastructure background or upload your own project photography.
                    </p>
                  </div>
                  {themeSettings.wallpaper && (
                    <button
                      onClick={() => handleSelectWallpaper('')}
                      className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Wallpaper
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {/* None / Solid Color Tile */}
                  <div
                    onClick={() => handleSelectWallpaper('')}
                    className={`relative h-32 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-2 text-center ${
                      !themeSettings.wallpaper
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-850'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Clean Minimal
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Solid Background
                      </div>
                    </div>
                    {!themeSettings.wallpaper && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Infrastructure Wallpapers */}
                  {INFRASTRUCTURE_WALLPAPERS.map((wp) => {
                    const isSelected = themeSettings.wallpaper === wp.url;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => handleSelectWallpaper(wp.url)}
                        className={`group relative h-32 rounded-2xl border-2 overflow-hidden transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                        }`}
                      >
                        <img
                          src={wp.thumbnail}
                          alt={wp.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-2.5 flex flex-col justify-end">
                          <div className="text-xs font-bold text-white leading-tight drop-shadow-sm">
                            {wp.name}
                          </div>
                          <div className="text-[9px] font-medium text-slate-300">
                            {wp.category}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Image Upload & URL Form */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Link className="w-4 h-4 text-indigo-500" />
                      Custom Wallpaper Image (URL or Local Upload)
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload from Device
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <form onSubmit={handleCustomUrlSubmit} className="flex gap-2">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="Paste image web URL (e.g. https://example.com/highway.jpg)..."
                      className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Apply URL
                    </button>
                  </form>
                  {urlError && (
                    <p className="text-xs text-rose-500 font-medium">
                      Please enter a valid image URL (including https://).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BLUR & OPACITY CONTROLS */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Backdrop Blur & Contrast Opacity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fine-tune background softness and darkness overlay to ensure maximum readability and zero eye strain.
                  </p>
                </div>

                {/* Blur Slider */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      Backdrop Blur Intensity
                    </label>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {themeSettings.blur} px
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={themeSettings.blur}
                    onChange={(e) =>
                      onUpdateTheme({
                        ...themeSettings,
                        blur: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0px (Crisp Sharp)</span>
                    <span>10px (Balanced Softness)</span>
                    <span>20px (Dreamy Diffusion)</span>
                  </div>
                </div>

                {/* Darkness Opacity Slider */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      Darkness Overlay Opacity
                    </label>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {themeSettings.opacity} %
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={themeSettings.opacity}
                    onChange={(e) =>
                      onUpdateTheme({
                        ...themeSettings,
                        opacity: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% (Vibrant Original)</span>
                    <span>45% (Recommended High Contrast)</span>
                    <span>90% (Ultra Dark Tone)</span>
                  </div>
                </div>

                {/* Practical Advice Note */}
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  💡 <strong>Readability Recommendation:</strong> A blur setting between <strong>4px–10px</strong> combined with an opacity of <strong>30%–50%</strong> maintains the scenic aesthetics of road construction photography while keeping project contract tables, FIDIC claims, and EVM charts crystal clear.
                </div>
              </div>
            )}

          </div>

          {/* Bottom Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3">
            <button
              onClick={onResetTheme}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer hover:opacity-95"
              style={{ backgroundColor: themeSettings.accentColor }}
            >
              Done & Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

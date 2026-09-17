import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Image as ImageIcon, 
  Sun, 
  Moon, 
  Upload, 
  RotateCcw, 
  X, 
  Check, 
  Sparkles, 
  Sliders, 
  Maximize2, 
  Layers,
  Settings,
  Eye
} from 'lucide-react';

export interface ThemeConfig {
  darkMode: boolean;
  themePreset: 'light' | 'dark' | 'midnight' | 'blueprint' | 'sepia' | 'glass';
  primaryAccent: string;
  bgImage: string;
  bgBlur: number; // 0 to 25px
  bgOpacity: number; // 0 to 90%
  bgFit: 'cover' | 'contain' | 'repeat';
  customBgColor: string;
  customTxtColor: string;
  customCardBgColor: string;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  darkMode: false,
  themePreset: 'light',
  primaryAccent: '#2563eb',
  bgImage: '',
  bgBlur: 4,
  bgOpacity: 35,
  bgFit: 'cover',
  customBgColor: '',
  customTxtColor: '',
  customCardBgColor: ''
};

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeConfig;
  onUpdateConfig: (newConfig: ThemeConfig) => void;
  onResetDefault: () => void;
}

export const PRESET_WALLPAPERS = [
  {
    id: 'none',
    name: 'Clean Solid Canvas',
    url: '',
    preview: 'bg-slate-100 dark:bg-slate-800'
  },
  {
    id: 'blueprint',
    name: 'Engineering Blueprint Grid',
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'highway',
    name: 'Infrastructure & Expressway Aerial',
    url: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'bridge',
    name: 'Cable-Stayed Bridge Structure',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'cyber',
    name: 'Dark Cyber Tech Mesh',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'fluid',
    name: 'Abstract Fluid Mesh Gradient',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80'
  }
];

export const ACCENT_COLOR_PRESETS = [
  { name: 'Royal Blue', hex: '#2563eb', bg: 'bg-blue-600' },
  { name: 'Emerald Green', hex: '#059669', bg: 'bg-emerald-600' },
  { name: 'Violet Purple', hex: '#7c3aed', bg: 'bg-violet-600' },
  { name: 'Amber Gold', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'Crimson Red', hex: '#dc2626', bg: 'bg-red-600' },
  { name: 'Cyber Teal', hex: '#0891b2', bg: 'bg-cyan-600' },
  { name: 'Midnight Obsidian', hex: '#0f172a', bg: 'bg-slate-900' }
];

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetDefault
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'wallpaper' | 'colors'>('themes');
  const [customUrlInput, setCustomUrlInput] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please select an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onUpdateConfig({
            ...config,
            bgImage: result
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      onUpdateConfig({
        ...config,
        bgImage: customUrlInput.trim()
      });
      setCustomUrlInput('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 font-black">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                  <span>Website Theme & Appearance Customizer</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    Live
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customize themes, accent colors, and background wallpapers in real-time
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveTab('themes')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'themes'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Theme Modes</span>
            </button>
            <button
              onClick={() => setActiveTab('wallpaper')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'wallpaper'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Background Picture</span>
              {config.bgImage && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'colors'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Accent Colors & Fine Tuning</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
            {/* TAB 1: THEME MODES */}
            {activeTab === 'themes' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Select Interface Mode
                  </h3>
                  <p className="text-xs text-slate-500">
                    Switch between dark, light, and specialized high-contrast presentation themes.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Light Mode */}
                  <button
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        darkMode: false,
                        themePreset: 'light',
                        customBgColor: '',
                        customTxtColor: ''
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                      !config.darkMode && config.themePreset === 'light'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sun className="w-5 h-5 text-amber-500" />
                      {!config.darkMode && config.themePreset === 'light' && (
                        <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 font-black" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Clean Light</div>
                      <div className="text-[10px] text-slate-500">High clarity daytime canvas</div>
                    </div>
                  </button>

                  {/* Dark Mode */}
                  <button
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        darkMode: true,
                        themePreset: 'dark',
                        customBgColor: '',
                        customTxtColor: ''
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                      config.darkMode && config.themePreset === 'dark'
                        ? 'border-amber-500 bg-slate-900 text-white ring-2 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-900 text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Moon className="w-5 h-5 text-indigo-400" />
                      {config.darkMode && config.themePreset === 'dark' && (
                        <Check className="w-4 h-4 text-amber-400 font-black" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Executive Dark</div>
                      <div className="text-[10px] text-slate-400">Low-light eye comfort</div>
                    </div>
                  </button>

                  {/* Midnight Luxury */}
                  <button
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        darkMode: true,
                        themePreset: 'midnight',
                        primaryAccent: '#d97706',
                        customBgColor: '#090d16',
                        customTxtColor: '#f1f5f9'
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                      config.themePreset === 'midnight'
                        ? 'border-amber-500 bg-slate-950 ring-2 ring-amber-500/30'
                        : 'border-slate-800 bg-slate-950 text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      {config.themePreset === 'midnight' && (
                        <Check className="w-4 h-4 text-amber-400 font-black" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-400">Midnight Gold</div>
                      <div className="text-[10px] text-slate-400">Deep obsidian luxury</div>
                    </div>
                  </button>

                  {/* Blueprint Tech */}
                  <button
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        darkMode: true,
                        themePreset: 'blueprint',
                        primaryAccent: '#3b82f6',
                        customBgColor: '#0f172a',
                        customTxtColor: '#e2e8f0'
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                      config.themePreset === 'blueprint'
                        ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/30'
                        : 'border-slate-800 bg-slate-900 text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Layers className="w-5 h-5 text-blue-400" />
                      {config.themePreset === 'blueprint' && (
                        <Check className="w-4 h-4 text-blue-400 font-black" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-400">Blueprint Navy</div>
                      <div className="text-[10px] text-slate-400">Engineering cad grid</div>
                    </div>
                  </button>

                  {/* Warm Sepia */}
                  <button
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        darkMode: false,
                        themePreset: 'sepia',
                        primaryAccent: '#d97706',
                        customBgColor: '#faf8f5',
                        customTxtColor: '#332f2b'
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between h-28 cursor-pointer relative overflow-hidden ${
                      config.themePreset === 'sepia'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-600/30'
                        : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sun className="w-5 h-5 text-amber-700" />
                      {config.themePreset === 'sepia' && (
                        <Check className="w-4 h-4 text-amber-700 font-black" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-900">Warm Sepia Paper</div>
                      <div className="text-[10px] text-amber-800/70">Anti-eyestrain reading canvas</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BACKGROUND PICTURE & WALLPAPER */}
            {activeTab === 'wallpaper' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Website Background Picture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a high-resolution wallpaper, upload your custom image, or paste an image URL.
                  </p>
                </div>

                {/* Preset Wallpaper Gallery */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_WALLPAPERS.map((wp) => {
                    const isSelected = config.bgImage === wp.url;
                    return (
                      <button
                        key={wp.id}
                        onClick={() => {
                          onUpdateConfig({
                            ...config,
                            bgImage: wp.url
                          });
                        }}
                        className={`group relative rounded-2xl overflow-hidden border text-left h-28 transition cursor-pointer flex flex-col justify-between p-3 ${
                          isSelected
                            ? 'border-amber-500 ring-4 ring-amber-500/30 shadow-lg'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {wp.url ? (
                          <>
                            <img
                              src={wp.preview}
                              alt={wp.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800"></div>
                        )}

                        <div className="relative z-10 flex items-center justify-between">
                          {isSelected ? (
                            <span className="p-1 rounded-full bg-amber-500 text-white text-xs shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full bg-black/40 text-white/70 text-xs backdrop-blur-xs">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="relative z-10">
                          <div className={`text-xs font-extrabold ${wp.url ? 'text-white drop-shadow-sm' : 'text-slate-800 dark:text-slate-200'}`}>
                            {wp.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Upload Custom Image & Custom URL Input */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span>Upload Custom Wallpaper / Picture</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Max 5MB (PNG/JPG/WEBP)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* File Upload Button */}
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <span>Choose Local File...</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* URL Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="Paste image URL (https://...)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={handleApplyCustomUrl}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>

                {/* Background Image Adjustments (Blur, Opacity, Fit) */}
                {config.bgImage && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-500" />
                      <span>Wallpaper Controls & Blur Settings</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Blur Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Background Blur</span>
                          <span className="text-amber-500">{config.bgBlur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          value={config.bgBlur}
                          onChange={(e) =>
                            onUpdateConfig({ ...config, bgBlur: parseInt(e.target.value) })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Overlay Mask Opacity Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Text Legibility Mask Opacity</span>
                          <span className="text-amber-500">{config.bgOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={config.bgOpacity}
                          onChange={(e) =>
                            onUpdateConfig({ ...config, bgOpacity: parseInt(e.target.value) })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACCENT COLORS & CUSTOM COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Primary Accent Color Presets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sets the primary button, badge, and active highlights color across the website.
                  </p>
                </div>

                {/* Color Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ACCENT_COLOR_PRESETS.map((p) => {
                    const isSelected = config.primaryAccent === p.hex;
                    return (
                      <button
                        key={p.hex}
                        onClick={() =>
                          onUpdateConfig({
                            ...config,
                            primaryAccent: p.hex
                          })
                        }
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/30 font-extrabold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full shadow-xs shrink-0 flex items-center justify-center text-white text-xs`}
                          style={{ backgroundColor: p.hex }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom HEX Color Picker */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span>Custom Accent Color Picker</span>
                    <span className="font-mono text-amber-500">{config.primaryAccent}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.primaryAccent || '#2563eb'}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          primaryAccent: e.target.value
                        })
                      }
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-600 p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.primaryAccent}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          primaryAccent: e.target.value
                        })
                      }
                      placeholder="#2563eb"
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono w-36 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between">
            <button
              onClick={onResetDefault}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Theme</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ThemeCustomizerModal;

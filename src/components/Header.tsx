import React, { useRef } from 'react';
import { Upload, RefreshCw, Monitor, Volume2, VolumeX, Shield, FileText, Info, MapPin } from 'lucide-react';

interface HeaderProps {
  onOpenFile: (file: File) => void;
  onReloadLive: () => void;
  isLoading: boolean;
  totalRecords: number;
  dateRange: { start: string; end: string } | null;
  isBridgeMode: boolean;
  onToggleBridgeMode: () => void;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
  onShowCredits: () => void;
  onBackToMain?: () => void;
  onOpenFreePlan?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFile,
  onReloadLive,
  isLoading,
  totalRecords,
  dateRange,
  isBridgeMode,
  onToggleBridgeMode,
  isAudioMuted,
  onToggleAudioMute,
  onShowCredits,
  onBackToMain,
  onOpenFreePlan,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
  };

  return (
    <header className="w-full bg-slate-950/95 border-b border-sky-900/40 px-4 md:px-8 py-3.5 sticky top-0 z-40 backdrop-blur">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl shrink-0">
            🐋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                WhaleWay
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                ICELANDIC MARITIME
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 text-[10px] font-black tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Onboard Command Bridge</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Vessel Cetacean Collision Avoidance & Lookahead Radar · Powered by Copernicus SST & Spatial Grid
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Return to Main Launch Screen"
            >
              <span>← Main Screen</span>
            </button>
          )}

          {onOpenFreePlan && (
            <button
              onClick={onOpenFreePlan}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Free Plan: Sample Icelandic Waypoints & 10-Day Historical Archive"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sample Waypoints (Free)</span>
            </button>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,text/csv"
            className="hidden"
          />

          {/* Open Data File Button (Mandatory Core Feature) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700 hover:border-sky-500 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Load CSV data file from your computer"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Open data file</span>
          </button>

          {/* Reload Live Starter Data */}
          <button
            onClick={onReloadLive}
            disabled={isLoading}
            className="p-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reload live dataset from Copernicus Marine mirror"
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Reload Live</span>
          </button>

          {/* Bridge / Projector Display Mode Toggle */}
          <button
            onClick={onToggleBridgeMode}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              isBridgeMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle high-contrast large-scale projector mode for bridge displays"
          >
            <Monitor className="w-4 h-4" />
            <span>{isBridgeMode ? 'Bridge Display: ON' : 'Bridge Display'}</span>
          </button>

          {/* Audio Chime Mute Toggle */}
          {/* <button
            onClick={onToggleAudioMute}
            className={`p-2 rounded-xl border transition-colors ${
              isAudioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-cyan-950 text-cyan-300 border-cyan-700'
            }`}
            title={isAudioMuted ? 'Bridge Alarm Muted' : 'Bridge Alarm Active'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button> */}

          {/* Info / Credit Modal Trigger */}
          <button
            onClick={onShowCredits}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Copernicus Marine Attribution & Scientific Model"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  Ship,
  ShieldCheck,
  Compass,
  Navigation,
  ArrowRight,
  ExternalLink,
  Sparkles,
  MapPin,
  Grid,
} from 'lucide-react';

interface MainLandingScreenProps {
  onSelectFreePlan: () => void;
  onSelectBridge: () => void;
}

export const MainLandingScreen: React.FC<MainLandingScreenProps> = ({
  onSelectFreePlan,
  onSelectBridge,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-[#020814] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* FULLSCREEN BACKGROUND IMAGE WITH MARITIME OVERLAYS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/src/assets/images/whale_underwater_sun_1792243434633.jpg"
          alt="Whale underwater in Icelandic waters"
          className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.12]"
        />
        {/* Deep ocean tint and gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020814] via-[#020814]/40 to-[#020814]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#020814]/30 to-[#020814]/90" />
      </div>

      {/* TOP HEADER BAR */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 backdrop-blur-md flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-2xl">
            🐋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                WhaleWay
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/50">
                ICELANDIC MARITIME
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium drop-shadow">
              Vessel Cetacean Collision Avoidance & Radar System
            </p>
          </div>
        </div>

        {/* Quick Launch CTA in header */}
        <button
          onClick={onSelectBridge}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <span>Open Navigation Bridge</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex flex-col items-center my-auto">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/70 border border-emerald-400/60 backdrop-blur-md text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider mb-5 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Vessel Software · M/V Elding IV (TF-2514)</span>
        </div>

        {/* Main Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] max-w-4xl text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          Real-Time Cetacean Protection & Maritime Safety Suite
        </h2>

        {/* Subtitle */}
        <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl text-center leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-medium">
          Select an access mode below to inspect Icelandic waters, check sea surface temperature, or operate the full onboard navigation bridge.
        </p>

        {/* TWO TIERS / OPTIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full max-w-4xl">
          {/* OPTION 1: FREE PLAN (SPOT COORDINATES RISK MAP) */}
          <div className="relative rounded-3xl bg-slate-950/45 hover:bg-slate-950/60 border border-white/20 hover:border-cyan-400/60 p-6 backdrop-blur-md transition-all duration-300 flex flex-col justify-between group shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  Free Access · Standard Mode
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  No Registration
                </span>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>Sample Waypoints & 10-Day Archive</span>
              </h3>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                Retrospective 10-day historical analysis across 5 curated Icelandic waypoints. Features smooth day-over-day migration tracking, model density coefficients, and solid macro-zone charts.
              </p>

              <ul className="mt-5 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>5 Fixed Icelandic sample waypoints (Faxaflói, Westfjords, Eyjafjörður, Eastfjords, Vestmannaeyjar)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>10-Day retrospective timeline with autoplay migration replay</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Primary model density coefficients with day-over-day deltas</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Simplified solid macro-sector visualization & sighting records</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={onSelectFreePlan}
                className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wide transition-all border border-slate-600 hover:border-cyan-400 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Launch Sample Waypoints (Free)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* OPTION 2: ONBOARD NAVIGATION BRIDGE (PRO SUITE) */}
          <div className="relative rounded-3xl bg-slate-950/60 hover:bg-slate-950/75 border border-cyan-400/50 hover:border-cyan-300 p-6 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between group shadow-2xl">
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20">
              ✓ Active Vessel License
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-400/50">
                  Onboard Bridge Suite
                </span>
                <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pro Fleet</span>
                </span>
              </div>

              <h3 className="text-xl font-black text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <span>Command Bridge & Collision Alerts</span>
              </h3>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                Full-scale maritime ECDIS suite featuring real-time 441-node spatial radar, lookahead route hazard timeline, acoustic bridge alarms, safe-speed advisories (≤ 10 kts), and offshore bypass guidance.
              </p>

              <ul className="mt-5 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Ship className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Acoustic bridge collision alert & deceleration advisory notices (≤ 10 kts)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Real-time vessel route simulator with GPS/AIS SOG telemetry tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Lookahead route hazard profile with proportional leg distance & ETA</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Full 441-node continuous spatial grid & high-contrast bridge display mode</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-cyan-500/30">
              <button
                onClick={onSelectBridge}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black text-xs tracking-wide transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Launch Navigation Bridge</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-center sm:text-left drop-shadow">
          <span>Generated using E.U. Copernicus Marine Service Information.</span>
          <a
            href="https://doi.org/10.48670/moi-00016"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline inline-flex items-center gap-1 font-mono"
          >
            DOI: 10.48670/moi-00016
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className="text-slate-400 drop-shadow">IMO MEPC.201 Compliance Standards</span>
      </footer>
    </div>
  );
};

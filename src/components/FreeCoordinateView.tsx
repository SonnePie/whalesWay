import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SeaTempRecord } from '../types/whale';
import {
  ICELAND_MAINLAND_PATH,
  ICELAND_ISLANDS_PATHS,
} from '../data/icelandPaths';
import { getZoneColorByCoefficient } from '../data/whaleGridData';
import {
  MapPin,
  Compass,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  Anchor,
  Layers,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Waves,
} from 'lucide-react';

interface FreeCoordinateViewProps {
  recordsMap: Map<string, SeaTempRecord> | undefined;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dates: string[];
  onBackToHome: () => void;
  onLaunchBridge: () => void;
  gridData?: [number, number, number][];
}

export interface SampleWaypoint {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  region: string;
  svgPos: { x: number; y: number };
  majorPort: string;
  description: string;
  depthDescription: string;
}

// 5 Curated Icelandic Sample Waypoints
export const SAMPLE_ICELANDIC_WAYPOINTS: SampleWaypoint[] = [
  {
    id: 'Faxaflói',
    name: 'Faxaflói Bay (Reykjavík)',
    shortName: 'Faxaflói',
    lat: 64.33,
    lon: -22.58,
    region: 'Southwest Waters',
    svgPos: { x: 228, y: 418 },
    majorPort: 'Reykjavík Harbour',
    description: 'Sheltered western bay with intense shipping routes and seasonal sandeel foraging grounds.',
    depthDescription: 'Coastal shelf (40m – 110m)',
  },
  {
    id: 'Westfjords',
    name: 'Westfjords Shelf (Ísafjörður)',
    shortName: 'Westfjords',
    lat: 66.42,
    lon: -24.00,
    region: 'Northwest Fjords',
    svgPos: { x: 137, y: 147 },
    majorPort: 'Ísafjörður Port',
    description: 'Deep glacial drop-offs meeting Arctic currents, frequented by humpbacks and blue whales.',
    depthDescription: 'Fjord trench (80m – 220m)',
  },
  {
    id: 'North (Eyjafjörður)',
    name: 'North Coast (Eyjafjörður / Akureyri)',
    shortName: 'Eyjafjörður',
    lat: 66.50,
    lon: -18.42,
    region: 'North Coast Basin',
    svgPos: { x: 498, y: 136 },
    majorPort: 'Akureyri / Húsavík Port',
    description: "Iceland's renowned cetacean feeding bay, with frequent summer humpback and minke aggregations.",
    depthDescription: 'Arctic shelf basin (50m – 140m)',
  },
  {
    id: 'Eastfjords',
    name: 'Eastfjords Trough (Seyðisfjörður)',
    shortName: 'Eastfjords',
    lat: 64.92,
    lon: -13.17,
    region: 'East Atlantic Shelf',
    svgPos: { x: 837, y: 344 },
    majorPort: 'Seyðisfjörður Ferry Terminal',
    description: 'Deep oceanic trench opening into the Norwegian Sea; transit path for migrating sei and fin whales.',
    depthDescription: 'Continental margin (150m – 320m)',
  },
  {
    id: 'South (Vestmannaeyjar)',
    name: 'South Volcanic Shelf (Vestmannaeyjar)',
    shortName: 'Vestmannaeyjar',
    lat: 63.33,
    lon: -20.33,
    region: 'South Coast Archipelagos',
    svgPos: { x: 375, y: 540 },
    majorPort: 'Heimaey Port',
    description: 'Nutrient-rich volcanic shelf with strong tidal upwelling and high seasonal orca and dolphin encounters.',
    depthDescription: 'Subsea volcanic shelf (40m – 90m)',
  },
];

// Solid-colored macro ocean sectors (one-tone zones)
const SECTOR_POLYGONS: Record<string, { path: string; labelPos: { x: number; y: number } }> = {
  'Faxaflói': {
    path: 'M 140,360 L 260,370 L 270,440 L 220,490 L 130,460 L 100,380 Z',
    labelPos: { x: 185, y: 420 },
  },
  'Westfjords': {
    path: 'M 60,260 L 150,110 L 280,120 L 270,250 L 170,290 L 100,280 Z',
    labelPos: { x: 165, y: 195 },
  },
  'North (Eyjafjörður)': {
    path: 'M 350,110 L 460,90 L 650,90 L 630,220 L 470,240 L 350,190 Z',
    labelPos: { x: 495, y: 155 },
  },
  'Eastfjords': {
    path: 'M 660,160 L 860,160 L 880,380 L 740,420 L 680,330 L 660,230 Z',
    labelPos: { x: 775, y: 285 },
  },
  'South (Vestmannaeyjar)': {
    path: 'M 240,490 L 440,500 L 530,540 L 490,600 L 280,600 L 220,530 Z',
    labelPos: { x: 375, y: 550 },
  },
};

export interface ZoneDayRecord {
  coeff: number; // Primary model parameter (18.0 to 29.0 scale matching backend model)
  temp: number; // Environmental covariate: sea surface temperature (°C)
  sightings: number;
  note: string;
}

// 10-day retrospective historical data with realistic smooth migratory progression
export const ARCHIVE_10_DAYS_DATA: Record<string, Record<string, ZoneDayRecord>> = {
  '2026-10-04': {
    'Faxaflói': { coeff: 27.85, temp: 10.1, sightings: 9, note: 'High coastal sandeel foraging concentration near bay shelf.' },
    'Westfjords': { coeff: 21.80, temp: 7.6, sightings: 4, note: 'Moderate transit movement off Látrabjarg cape.' },
    'North (Eyjafjörður)': { coeff: 19.50, temp: 7.0, sightings: 2, note: 'Low aggregation; early season krill buildup in outer fjord.' },
    'Eastfjords': { coeff: 22.50, temp: 8.2, sightings: 4, note: 'Dispersed fin whale transit corridor into Norwegian Sea.' },
    'South (Vestmannaeyjar)': { coeff: 26.40, temp: 10.2, sightings: 8, note: 'High seasonal density around volcanic archipelago banks.' },
  },
  '2026-10-05': {
    'Faxaflói': { coeff: 27.40, temp: 10.0, sightings: 8, note: 'Pod cluster holding feeding positions; slow northward drift.' },
    'Westfjords': { coeff: 22.60, temp: 7.5, sightings: 4, note: 'Upward activity gradient as leading pods enter shelf edge.' },
    'North (Eyjafjörður)': { coeff: 20.10, temp: 7.0, sightings: 3, note: 'Gradual increase in acoustic clicks and foraging dives.' },
    'Eastfjords': { coeff: 22.10, temp: 8.1, sightings: 3, note: 'Stable outer shelf passage; low shallow-water density.' },
    'South (Vestmannaeyjar)': { coeff: 26.10, temp: 10.1, sightings: 8, note: 'Sustained foraging on capelin schools off southern shoals.' },
  },
  '2026-10-06': {
    'Faxaflói': { coeff: 26.90, temp: 9.8, sightings: 7, note: 'Slight dispersion of surface pods as tidal front eases.' },
    'Westfjords': { coeff: 23.50, temp: 7.5, sightings: 5, note: 'Notable pod influx toward deep fjord entrance troughs.' },
    'North (Eyjafjörður)': { coeff: 20.90, temp: 6.9, sightings: 3, note: 'Inflow of plankton blooms attracting scout minke pods.' },
    'Eastfjords': { coeff: 21.70, temp: 8.1, sightings: 3, note: 'Steady transit; no stationary aggregations observed.' },
    'South (Vestmannaeyjar)': { coeff: 25.40, temp: 10.0, sightings: 7, note: 'Migration wave beginning to move westward toward Faxaflói.' },
  },
  '2026-10-07': {
    'Faxaflói': { coeff: 26.25, temp: 9.8, sightings: 7, note: 'Active feeding continuing, slight density transition toward Snæfellsnes.' },
    'Westfjords': { coeff: 24.40, temp: 7.4, sightings: 6, note: 'Crossed into High Density tier; multiple humpbacks surfacing.' },
    'North (Eyjafjörður)': { coeff: 21.70, temp: 6.9, sightings: 4, note: 'Crossed into Moderate tier; increased pod sightings.' },
    'Eastfjords': { coeff: 21.20, temp: 8.0, sightings: 2, note: 'Dispersed transit along 200m bathymetric isobath.' },
    'South (Vestmannaeyjar)': { coeff: 24.60, temp: 9.9, sightings: 6, note: 'Reduced surface sightings as pods travel off the shelf.' },
  },
  '2026-10-08': {
    'Faxaflói': { coeff: 25.50, temp: 9.7, sightings: 6, note: 'Steady migration transit past western headlands.' },
    'Westfjords': { coeff: 25.60, temp: 7.4, sightings: 7, note: 'Strong aggregation forming in Ísafjarðardjúp mouth.' },
    'North (Eyjafjörður)': { coeff: 22.80, temp: 6.9, sightings: 4, note: 'Whale density climbing steadily; active surface lunges.' },
    'Eastfjords': { coeff: 20.70, temp: 8.0, sightings: 2, note: 'Low baseline activity; standard cruising corridor.' },
    'South (Vestmannaeyjar)': { coeff: 23.70, temp: 9.9, sightings: 5, note: 'Moderate activity; majority of pod transitioned west.' },
  },
  '2026-10-09': {
    'Faxaflói': { coeff: 24.80, temp: 9.6, sightings: 5, note: 'Moderate density corridor; major pods now in Westfjords.' },
    'Westfjords': { coeff: 26.80, temp: 7.3, sightings: 8, note: 'Peak Critical hotspot! High baleen feeding concentration.' },
    'North (Eyjafjörður)': { coeff: 24.10, temp: 6.8, sightings: 5, note: 'Entering High Density tier; summer feeding grounds filling.' },
    'Eastfjords': { coeff: 20.20, temp: 7.9, sightings: 2, note: 'Quiet oceanic margin with low strike probability.' },
    'South (Vestmannaeyjar)': { coeff: 22.90, temp: 9.8, sightings: 4, note: 'Moderate transit; typical seasonal sub-polar conditions.' },
  },
  '2026-10-10': {
    'Faxaflói': { coeff: 23.95, temp: 9.6, sightings: 5, note: 'Moderate corridor; standard maritime vigilance required.' },
    'Westfjords': { coeff: 26.20, temp: 7.3, sightings: 8, note: 'Critical cluster beginning slow rounding toward Hornstrandir.' },
    'North (Eyjafjörður)': { coeff: 25.50, temp: 6.8, sightings: 6, note: 'High density wave approaching Akureyri inner fjord.' },
    'Eastfjords': { coeff: 19.80, temp: 7.9, sightings: 1, note: 'Low aggregation index; clear transit waters.' },
    'South (Vestmannaeyjar)': { coeff: 22.10, temp: 9.7, sightings: 4, note: 'Moderate transit; minimal feeding activity.' },
  },
  '2026-10-11': {
    'Faxaflói': { coeff: 23.20, temp: 9.5, sightings: 4, note: 'Stable moderate presence; dolphins and occasional minke.' },
    'Westfjords': { coeff: 25.10, temp: 7.3, sightings: 6, note: 'Gradual decrease as pods navigate north of the Arctic circle.' },
    'North (Eyjafjörður)': { coeff: 27.10, temp: 6.8, sightings: 9, note: 'Critical hotspot reached! Massive krill feast in Skjálfandi.' },
    'Eastfjords': { coeff: 20.40, temp: 7.9, sightings: 2, note: 'Occasional pelagic fin whale sightings in outer deeps.' },
    'South (Vestmannaeyjar)': { coeff: 21.30, temp: 9.6, sightings: 3, note: 'Approaching low baseline threshold; pods dispersed.' },
  },
  '2026-10-12': {
    'Faxaflói': { coeff: 22.40, temp: 9.5, sightings: 4, note: 'Normal coastal passage density; safe standard routing.' },
    'Westfjords': { coeff: 24.20, temp: 7.3, sightings: 5, note: 'High density receding toward outer banks.' },
    'North (Eyjafjörður)': { coeff: 27.75, temp: 6.9, sightings: 10, note: 'Peak Critical aggregation; highest collision hazard zone.' },
    'Eastfjords': { coeff: 21.30, temp: 7.9, sightings: 2, note: 'Slight influx of migrating pods from Arctic edge.' },
    'South (Vestmannaeyjar)': { coeff: 20.60, temp: 9.6, sightings: 2, note: 'Low activity; clear shipping approaches.' },
  },
  '2026-10-13': {
    'Faxaflói': { coeff: 21.65, temp: 9.5, sightings: 3, note: 'Moderate transit; routine vigilance maintained.' },
    'Westfjords': { coeff: 23.30, temp: 7.2, sightings: 4, note: 'Moderate transit corridor along western fjords.' },
    'North (Eyjafjörður)': { coeff: 27.50, temp: 6.9, sightings: 9, note: 'Sustained Critical feeding concentration on north coast.' },
    'Eastfjords': { coeff: 22.20, temp: 7.8, sightings: 3, note: 'Moderate migration activity traversing southeast shelf.' },
    'South (Vestmannaeyjar)': { coeff: 20.10, temp: 9.5, sightings: 2, note: 'Low activity baseline; clear transit zone.' },
  },
};

const DEFAULT_ARCHIVE_DATES = Object.keys(ARCHIVE_10_DAYS_DATA).sort();

export const FreeCoordinateView: React.FC<FreeCoordinateViewProps> = ({
  recordsMap,
  selectedDate,
  onSelectDate,
  dates,
  onBackToHome,
  onLaunchBridge,
}) => {
  // Selected waypoint from the 5 curated sample locations
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>('Faxaflói');

  // Animation autoplay state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Derive the 10 retrospective past dates (Day -10 to Day -1)
  const archiveDates = useMemo(() => {
    if (dates && dates.length > 0) {
      const analysisDates = dates.filter(
        d =>
          !d.startsWith('2026-10-14') &&
          !d.startsWith('2026-10-15') &&
          !d.startsWith('2026-10-16') &&
          !d.startsWith('2026-10-17') &&
          !d.startsWith('2026-10-18') &&
          !d.startsWith('2026-10-19') &&
          !d.startsWith('2026-10-20') &&
          !d.startsWith('2026-10-21') &&
          !d.startsWith('2026-10-22')
      );
      if (analysisDates.length >= 10) {
        return analysisDates.slice(-10);
      }
    }
    return DEFAULT_ARCHIVE_DATES;
  }, [dates]);

  // Active date within the archive window
  const activeArchiveDate = useMemo(() => {
    if (archiveDates.includes(selectedDate)) {
      return selectedDate;
    }
    return archiveDates[archiveDates.length - 1]; // Default to most recent past day (Day -1)
  }, [selectedDate, archiveDates]);

  // Current day index in the 10-day list
  const currentDayIndex = archiveDates.indexOf(activeArchiveDate);
  const previousArchiveDate = currentDayIndex > 0 ? archiveDates[currentDayIndex - 1] : null;

  // Autoplay loop for smooth migration visualization
  const activeArchiveDateRef = useRef(activeArchiveDate);
  activeArchiveDateRef.current = activeArchiveDate;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const current = activeArchiveDateRef.current;
      const idx = archiveDates.indexOf(current);
      if (idx === -1 || idx >= archiveDates.length - 1) {
        onSelectDate(archiveDates[0]);
      } else {
        onSelectDate(archiveDates[idx + 1]);
      }
    }, 1400);

    return () => clearInterval(timer);
  }, [isPlaying, archiveDates, onSelectDate]);

  // Active waypoint object
  const currentWaypoint = useMemo(() => {
    return (
      SAMPLE_ICELANDIC_WAYPOINTS.find(w => w.id === selectedWaypointId) ||
      SAMPLE_ICELANDIC_WAYPOINTS[0]
    );
  }, [selectedWaypointId]);

  // Helper to fetch zone day data (primary model coefficient & covariates)
  const getZoneData = (siteId: string, date: string): ZoneDayRecord => {
    const dayData = ARCHIVE_10_DAYS_DATA[date];
    if (dayData && dayData[siteId]) {
      return dayData[siteId];
    }
    // Fallback if date is not directly in table
    return {
      coeff: 22.0,
      temp: 7.5,
      sightings: 3,
      note: 'Standard baseline coastal observation data.',
    };
  };

  // Compute stats for all 5 zones on current day
  const zonesTodayStats = useMemo(() => {
    const map: Record<string, { current: ZoneDayRecord; prev: ZoneDayRecord | null; delta: number }> = {};
    let peakSite = 'Faxaflói';
    let peakVal = -Infinity;

    SAMPLE_ICELANDIC_WAYPOINTS.forEach(w => {
      const current = getZoneData(w.id, activeArchiveDate);
      const prev = previousArchiveDate ? getZoneData(w.id, previousArchiveDate) : null;
      const delta = prev ? current.coeff - prev.coeff : 0;
      map[w.id] = { current, prev, delta };

      if (current.coeff > peakVal) {
        peakVal = current.coeff;
        peakSite = w.id;
      }
    });

    return { map, peakSite, peakVal };
  }, [activeArchiveDate, previousArchiveDate]);

  // Active zone data and style
  const activeZoneRecord = zonesTodayStats.map[currentWaypoint.id]?.current || getZoneData(currentWaypoint.id, activeArchiveDate);
  const activeZoneDelta = zonesTodayStats.map[currentWaypoint.id]?.delta ?? 0;
  const activeZoneStyle = getZoneColorByCoefficient(activeZoneRecord.coeff, 0.55);

  return (
    <div className="min-h-screen bg-[#020814] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* HEADER */}
      <header className="w-full bg-slate-950/95 border-b border-sky-900/40 px-4 md:px-8 py-3.5 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Return to Main Launch Screen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Main Screen</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  WhaleWay
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-700">
                  Free Demo · 10-Day Historical Archive
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Model Whale Density Coefficients · 5 Fixed Sample Waypoints · Smooth Coastal Migration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onLaunchBridge}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Navigation Bridge</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3.5 md:p-6 flex flex-col gap-5">
        {/* TOP MODEL NOTIFICATION BANNER */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/70 to-slate-900 border border-sky-800/50 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                  Model Density Coefficient Engine (Historical Replay)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Day: <strong className="text-white">{activeArchiveDate}</strong>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                  Today&apos;s Hotspot: {zonesTodayStats.peakSite.split(' ')[0]} ({zonesTodayStats.peakVal.toFixed(2)})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Primary metric is the model-derived whale presence coefficient (18.0 – 29.0). As you scrub through days, observe the smooth gradual migration along the Icelandic continental shelf.
              </p>
            </div>
          </div>

          {/* Model Risk Scale Legend */}
          <div className="flex items-center gap-2.5 text-xs font-mono text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Low &lt;21</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Mod 21-24</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>High 24-26.5</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Crit ≥26.5</span>
            </span>
          </div>
        </div>

        {/* 10-DAY PAST TIMELINE SCRUBBER WITH AUTOPLAY */}
        <div className="bg-slate-900/90 rounded-2xl border border-sky-900/40 p-3.5 shadow-lg backdrop-blur flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                10-Day Historical Migration Timeline:
              </span>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {activeArchiveDate} (Day -{10 - currentDayIndex})
              </span>
            </div>

            {/* Autoplay Migration Animation Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isPlaying
                    ? 'bg-rose-500 text-slate-950 border-rose-300 shadow-md shadow-rose-500/30'
                    : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-700'
                }`}
                title="Play migration simulation over the 10-day period"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Simulation' : '▶ Play Migration Replay'}</span>
              </button>
            </div>
          </div>

          {/* 10 Date Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {archiveDates.map((d, idx) => {
              const isSelected = d === activeArchiveDate;
              const dayNum = 10 - idx;
              const dateObj = new Date(d);
              const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              // Check peak zone for this day to show a micro badge
              const dayData = ARCHIVE_10_DAYS_DATA[d];
              let topCoeff = 0;
              let topSite = '';
              if (dayData) {
                Object.entries(dayData).forEach(([s, r]) => {
                  if (r.coeff > topCoeff) {
                    topCoeff = r.coeff;
                    topSite = s;
                  }
                });
              }

              return (
                <button
                  key={d}
                  onClick={() => {
                    setIsPlaying(false);
                    onSelectDate(d);
                  }}
                  className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/30 font-black scale-102 ring-2 ring-cyan-400/50'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80 hover:text-white'
                  }`}
                >
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                    Day -{dayNum}
                  </span>
                  <span className="text-xs font-mono font-bold my-0.5">
                    {label}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded truncate max-w-full ${
                      isSelected
                        ? 'bg-slate-950 text-cyan-300 font-bold'
                        : topCoeff >= 26.5
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {topSite.split(' ')[0]} ({topCoeff.toFixed(1)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* WORKSPACE: LEFT MAP (7 COLS) & RIGHT WAYPOINTS SELECTOR (5 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: SOLID-ZONE NAUTICAL CHART (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="bg-slate-900/95 rounded-2xl border border-sky-900/40 p-3 shadow-xl backdrop-blur relative overflow-hidden flex flex-col">
              {/* Map Bar */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-900/30 text-xs">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    Selected Waypoint:
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {currentWaypoint.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-400">Model Coeff:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {activeZoneRecord.coeff.toFixed(2)}
                  </span>
                  {activeZoneDelta !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold ${
                        activeZoneDelta > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {activeZoneDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{activeZoneDelta > 0 ? `+${activeZoneDelta.toFixed(2)}` : activeZoneDelta.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive SVG Chart with 5 Solid Macro Zones */}
              <div className="relative w-full aspect-[920/620] bg-[#030d1a] rounded-xl overflow-hidden border border-sky-950 select-none">
                <svg viewBox="0 0 920 620" className="w-full h-full object-contain">
                  <defs>
                    <radialGradient id="freeOceanGrad" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#081e36" />
                      <stop offset="70%" stopColor="#041224" />
                      <stop offset="100%" stopColor="#020813" />
                    </radialGradient>

                    <linearGradient id="freeLandFill" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>

                    {/* Subtle pulse glow for today's hotspot zone */}
                    <filter id="hotspotGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Ocean Base */}
                  <rect width="920" height="620" fill="url(#freeOceanGrad)" />

                  {/* Bathymetry Contours */}
                  <g className="fill-none select-none pointer-events-none opacity-25">
                    <path
                      d="M 60,320 C 60,200 90,80 200,60 C 320,40 500,45 660,65 C 790,80 890,180 890,320 C 890,460 760,540 600,560 C 420,580 240,580 180,540 C 100,490 60,420 60,320 Z"
                      stroke="#0369a1"
                      strokeWidth="1.2"
                      strokeDasharray="4 6"
                    />
                    <path
                      d="M 100,310 C 100,210 130,110 220,90 C 330,75 490,80 620,95 C 740,110 820,200 820,320 C 820,430 710,500 560,520 C 400,535 270,535 220,500 C 150,455 100,390 100,310 Z"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                  </g>

                  {/* 5 SOLID-COLORED MACRO ZONES (SMOOTH COEFFICIENT SPECTRUM) */}
                  {Object.entries(SECTOR_POLYGONS).map(([siteKey, poly]) => {
                    const zoneStat = zonesTodayStats.map[siteKey];
                    const coeff = zoneStat ? zoneStat.current.coeff : 22.0;
                    const delta = zoneStat ? zoneStat.delta : 0;
                    const isSelected = selectedWaypointId === siteKey;
                    const isPeakHotspot = zonesTodayStats.peakSite === siteKey;

                    // Smooth color computed from model continuous gradient
                    const zoneStyle = getZoneColorByCoefficient(coeff, isSelected ? 0.52 : 0.28);

                    return (
                      <g
                        key={siteKey}
                        className="cursor-pointer transition-all duration-300"
                        onClick={() => setSelectedWaypointId(siteKey)}
                      >
                        <path
                          d={poly.path}
                          fill={zoneStyle.fill}
                          stroke={isSelected ? '#ffffff' : zoneStyle.stroke}
                          strokeWidth={isSelected ? 3 : isPeakHotspot ? 2 : 1.2}
                          strokeDasharray={isPeakHotspot && !isSelected ? '6 3' : 'none'}
                          strokeLinejoin="round"
                          className="transition-all duration-500 hover:fill-opacity-60"
                        />

                        {/* Zone Center Floating Card */}
                        <g transform={`translate(${poly.labelPos.x}, ${poly.labelPos.y})`} className="pointer-events-none">
                          <rect
                            x="-55"
                            y="-18"
                            width="110"
                            height="36"
                            rx="6"
                            fill="#020817"
                            fillOpacity="0.88"
                            stroke={isSelected ? '#38bdf8' : zoneStyle.stroke}
                            strokeWidth={isSelected ? 1.8 : 1}
                            className="shadow-lg"
                          />
                          <text x="0" y="-4" textAnchor="middle" className="text-[10px] font-bold fill-white">
                            {siteKey.split(' ')[0]}
                          </text>

                          {/* Coefficient with Delta Trend Tag */}
                          <text x="0" y="11" textAnchor="middle" className="text-[10px] font-mono font-black" fill={zoneStyle.stroke}>
                            Coeff: {coeff.toFixed(2)}
                            {delta !== 0 && (
                              <tspan dx="4" fill={delta > 0 ? '#fb7185' : '#34d399'} className="text-[9px]">
                                {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                              </tspan>
                            )}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* ICELAND MAINLAND & COASTAL ISLANDS */}
                  <g className="pointer-events-none select-none">
                    <path
                      d={ICELAND_MAINLAND_PATH}
                      fill="url(#freeLandFill)"
                      stroke="#38bdf8"
                      strokeWidth="1.4"
                      strokeOpacity="0.9"
                    />
                    {ICELAND_ISLANDS_PATHS.map((islandPath, idx) => (
                      <path
                        key={idx}
                        d={islandPath}
                        fill="url(#freeLandFill)"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                      />
                    ))}
                  </g>

                  {/* 5 CURATED SAMPLE WAYPOINT PINS */}
                  {SAMPLE_ICELANDIC_WAYPOINTS.map((wp) => {
                    const isSelected = wp.id === selectedWaypointId;
                    const isPeakHotspot = zonesTodayStats.peakSite === wp.id;
                    const zoneStat = zonesTodayStats.map[wp.id];
                    const coeff = zoneStat ? zoneStat.current.coeff : 22.0;
                    const style = getZoneColorByCoefficient(coeff, 1);

                    return (
                      <g
                        key={wp.id}
                        transform={`translate(${wp.svgPos.x}, ${wp.svgPos.y})`}
                        onClick={() => setSelectedWaypointId(wp.id)}
                        className="cursor-pointer"
                      >
                        {/* Selected Ping Halo */}
                        {isSelected && (
                          <>
                            <circle r="22" fill={style.stroke} fillOpacity="0.18" className="animate-ping" />
                            <circle r="13" fill={style.stroke} fillOpacity="0.35" />
                          </>
                        )}

                        {/* Peak Hotspot Ring Indicator */}
                        {isPeakHotspot && !isSelected && (
                          <circle r="11" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" className="animate-spin-slow opacity-80" />
                        )}

                        {/* Pin Dot */}
                        <circle
                          r={isSelected ? 6.5 : 5}
                          fill={style.stroke}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2 : 1.2}
                          className="transition-all"
                        />

                        {/* Pin Callout Flag for Selected */}
                        {isSelected && (
                          <g transform="translate(0, -22)" className="pointer-events-none">
                            <rect
                              x="-55"
                              y="-18"
                              width="110"
                              height="20"
                              rx="5"
                              fill="#020817"
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                            />
                            <text
                              x="0"
                              y="-4"
                              textAnchor="middle"
                              className="text-[9px] font-mono font-bold fill-cyan-300"
                            >
                              {wp.lat.toFixed(2)}°N {wp.lon.toFixed(2)}°W
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Map Bottom Hint */}
                <div className="absolute bottom-2.5 left-2.5 bg-slate-950/85 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono pointer-events-none flex items-center gap-1.5 shadow">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Click any zone to inspect coefficient telemetry · Press Play to preview migration wave</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: WAYPOINT SELECTOR & RETROSPECTIVE TELEMETRY (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* 1. SELECTOR DROPDOWN & 5 WAYPOINTS CARDS */}
            <div className="bg-slate-900/95 rounded-2xl border border-sky-900/40 p-4 md:p-5 shadow-xl backdrop-blur flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-900/30">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    Sample Icelandic Waypoints (5 Locations)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 font-bold">
                  Day: {activeArchiveDate}
                </span>
              </div>

              {/* Waypoint Select Dropdown */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Select Maritime Location:
                </label>
                <select
                  value={selectedWaypointId}
                  onChange={(e) => setSelectedWaypointId(e.target.value)}
                  className="w-full bg-slate-800 text-white font-mono text-sm px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {SAMPLE_ICELANDIC_WAYPOINTS.map((w) => {
                    const z = zonesTodayStats.map[w.id];
                    const c = z ? z.current.coeff : 22.0;
                    return (
                      <option key={w.id} value={w.id}>
                        {w.name} — Coeff: {c.toFixed(2)} ({w.lat}°N, {w.lon}°W)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 5 Quick Selection Cards with Primary Coefficient & Day-Over-Day Shift */}
              <div className="flex flex-col gap-2 mt-1">
                {SAMPLE_ICELANDIC_WAYPOINTS.map((w) => {
                  const isSelected = w.id === selectedWaypointId;
                  const z = zonesTodayStats.map[w.id];
                  const coeff = z ? z.current.coeff : 22.0;
                  const delta = z ? z.delta : 0;
                  const style = getZoneColorByCoefficient(coeff, 1);

                  return (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWaypointId(w.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-400 shadow-md shadow-cyan-950 scale-101'
                          : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm transition-colors duration-300"
                          style={{ backgroundColor: style.stroke }}
                        />
                        <div>
                          <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {w.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {w.lat.toFixed(2)}°N, {w.lon.toFixed(2)}°W · {w.majorPort}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-sm font-mono font-black text-white">
                            {coeff.toFixed(2)}
                          </span>
                          {delta !== 0 && (
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${style.badgeClass}`}
                        >
                          {style.tier}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. HISTORICAL COEFFICIENT TELEMETRY CARD FOR SELECTED WAYPOINT */}
            <div className="bg-slate-900/95 rounded-2xl border border-sky-900/40 p-4 md:p-5 shadow-xl backdrop-blur flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-900/30">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Model Coefficient Telemetry
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${activeZoneStyle.badgeClass}`}
                >
                  {activeZoneStyle.tier}
                </span>
              </div>

              {/* Waypoint Meta Summary */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {currentWaypoint.name}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {currentWaypoint.region}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentWaypoint.description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-400">
                  <span>Bathymetry: {currentWaypoint.depthDescription}</span>
                  <span>·</span>
                  <span>Port: {currentWaypoint.majorPort}</span>
                </div>
              </div>

              {/* PRIMARY METRIC: MODEL COEFFICIENT & DAY-OVER-DAY SHIFT */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900 border border-slate-700/80 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Primary Model Density Coefficient
                  </span>
                  {activeZoneDelta !== 0 && (
                    <span
                      className={`text-[11px] font-mono font-bold flex items-center gap-1 ${
                        activeZoneDelta > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {activeZoneDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{activeZoneDelta > 0 ? `+${activeZoneDelta.toFixed(2)} vs yesterday` : `${activeZoneDelta.toFixed(2)} vs yesterday`}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-mono font-black text-white tracking-tight">
                    {activeZoneRecord.coeff.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    / 29.0 Scale (Normalized: {(activeZoneStyle.norm * 100).toFixed(0)}%)
                  </span>
                </div>

                {/* Density Bar */}
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-700/60 mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${activeZoneStyle.norm * 100}%`,
                      backgroundColor: activeZoneStyle.stroke,
                    }}
                  />
                </div>
              </div>

              {/* SECONDARY ROW: ENVIRONMENTAL COVARIATE (SST) & SIGHTINGS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Copernicus SST (Covariate)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-mono font-black text-white">
                      {activeZoneRecord.temp.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">°C</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    Supporting ocean temp
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Past Sighting Index
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-mono font-black text-cyan-300">
                      {activeZoneRecord.sightings}
                    </span>
                    <span className="text-xs font-bold text-slate-400">records</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Survey frequency
                  </span>
                </div>
              </div>

              {/* MIGRATION MOVEMENT OBSERVATION */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  activeZoneStyle.tier === 'CRITICAL'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : activeZoneStyle.tier === 'HIGH'
                    ? 'bg-orange-950/40 border-orange-500/50 text-orange-200'
                    : activeZoneStyle.tier === 'MODERATE'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {activeZoneStyle.tier === 'CRITICAL' || activeZoneStyle.tier === 'HIGH' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : activeZoneStyle.tier === 'MODERATE' ? (
                  <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="text-xs font-bold block">
                    {activeZoneStyle.label} ({activeZoneStyle.advisory})
                  </span>
                  <span className="text-[10px] opacity-80 mt-1 block leading-relaxed font-mono">
                    Movement: {activeZoneRecord.note}
                  </span>
                </div>
              </div>

              {/* Navigation Bridge Upgrade Banner */}
              <div className="mt-1 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-sky-950/80 border border-cyan-500/50 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                    Need Real-Time Radar & Live Forecasts?
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Navigation Bridge features full 441-node spatial radar, live daily forecasts, real-time lookahead route analysis, and automated bridge acoustic alarm alerts.
                </p>
                <button
                  onClick={onLaunchBridge}
                  className="mt-1 py-2 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Full Navigation Bridge</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

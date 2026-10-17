import React, { useState, useMemo } from 'react';
import { SeaTempRecord, SiteMeta, ShipRoute, RiskEvaluation } from '../types/whale';
import { ICELAND_SITES_META, evaluateRiskFromTemp } from '../utils/riskCalculator';
import { ICELAND_MAINLAND_PATH, ICELAND_ISLANDS_PATHS, ICELAND_PROJECTED_PINS } from '../data/icelandPaths';
import { WhaleGridOverlay } from './WhaleGridOverlay';
import { BackendGridModal } from './BackendGridModal';
import { queryWhaleGrid, WhaleGridPoint, RAW_WHALE_GRID_DATA } from '../data/whaleGridData';
import { svgCoordsToGeo } from '../utils/geoUtils';
import {
  Compass,
  Ship,
  Waves,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Navigation,
  Database,
  Grid,
  Layers,
  X,
  Crosshair,
  Info,
} from 'lucide-react';

interface IcelandMapProps {
  recordsMap: Map<string, SeaTempRecord> | undefined;
  selectedSite: string | null;
  onSelectSite: (siteName: string) => void;
  activeRoute: ShipRoute;
  shipProgress: number; // 0 to 1 along waypoints
  isShipSimulating: boolean;
  onToggleSimulate: () => void;
  onResetShip: () => void;
  isBridgeMode: boolean;
  currentShipSpeedKnots: number;
  onApplySlowDown: () => void;
  gridData?: [number, number, number][];
  onUpdateGridData?: (newData: [number, number, number][]) => void;
  onResetGridData?: () => void;
}

// Ocean sector boundary polygons in SVG coordinates (viewBox 0 0 920 620)
// Conforming to authentic Mercator projection and Copernicus Marine sampling locations
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

export const IcelandMap: React.FC<IcelandMapProps> = ({
  recordsMap,
  selectedSite,
  onSelectSite,
  activeRoute,
  shipProgress,
  isShipSimulating,
  onToggleSimulate,
  onResetShip,
  isBridgeMode,
  currentShipSpeedKnots,
  onApplySlowDown,
  gridData = RAW_WHALE_GRID_DATA,
  onUpdateGridData,
  onResetGridData,
}) => {
  const [showBathymetry, setShowBathymetry] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showWhaleGrid, setShowWhaleGrid] = useState(true);
  const [showGridValues, setShowGridValues] = useState(false);
  const [gridOpacity, setGridOpacity] = useState(0.55);
  const [showSectors, setShowSectors] = useState(true);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [selectedGridCell, setSelectedGridCell] = useState<WhaleGridPoint | null>(null);
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);

  // Compute interpolated ship coordinates along waypoints
  const shipPosition = useMemo(() => {
    const wps = activeRoute.waypoints;
    if (wps.length === 0) return { x: 200, y: 300, currentSiteId: null, heading: 0 };
    if (wps.length === 1) return { x: wps[0].x, y: wps[0].y, currentSiteId: wps[0].siteId ?? null, heading: 0 };

    const totalDist = activeRoute.totalDistanceNm || (wps[wps.length - 1].distanceFromStartNm ?? 1);
    const currentDist = Math.max(0, Math.min(totalDist, shipProgress * totalDist));

    // Find the exact leg [i, i+1] where currentDist falls
    let legIndex = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      const d1 = wps[i].distanceFromStartNm ?? 0;
      const d2 = wps[i + 1].distanceFromStartNm ?? totalDist;
      if (currentDist >= d1 && currentDist <= d2) {
        legIndex = i;
        break;
      }
      if (i === wps.length - 2) {
        legIndex = i;
      }
    }

    const p1 = wps[legIndex];
    const p2 = wps[legIndex + 1];
    const d1 = p1.distanceFromStartNm ?? 0;
    const d2 = p2.distanceFromStartNm ?? totalDist;
    const legSpan = Math.max(0.001, d2 - d1);
    const segFrac = Math.max(0, Math.min(1, (currentDist - d1) / legSpan));

    const x = p1.x + (p2.x - p1.x) * segFrac;
    const y = p1.y + (p2.y - p1.y) * segFrac;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angleRad = Math.atan2(dy, dx);
    const heading = (angleRad * 180) / Math.PI + 90;

    const currentSiteId = segFrac < 0.5 ? p1.siteId : p2.siteId;

    return { x, y, currentSiteId, heading };
  }, [activeRoute, shipProgress]);

  // Convert ship SVG coordinates to real geographic coordinates
  const shipGeo = useMemo(() => {
    return svgCoordsToGeo(shipPosition.x, shipPosition.y);
  }, [shipPosition.x, shipPosition.y]);

  // Real-time whale grid query for current vessel location
  const vesselGridCell = useMemo(() => {
    return queryWhaleGrid(shipGeo.lat, shipGeo.lon, gridData);
  }, [shipGeo.lat, shipGeo.lon, gridData]);

  const isShipInHighGridRisk =
    vesselGridCell.tierInfo.tier === 'CRITICAL' || vesselGridCell.tierInfo.tier === 'HIGH';

  // Risk evaluation for the macro-sector where ship is currently sailing
  const shipSectorRisk = useMemo<RiskEvaluation | null>(() => {
    if (!shipPosition.currentSiteId || !recordsMap) return null;
    const rec = recordsMap.get(shipPosition.currentSiteId);
    if (!rec) return null;
    return evaluateRiskFromTemp(rec.sea_temp_c);
  }, [shipPosition.currentSiteId, recordsMap]);

  // Overall collision risk is HIGH if either macro-sector or local whale grid cell is high
  const isShipInHighRisk = shipSectorRisk?.level === 'HIGH' || isShipInHighGridRisk;

  // SVG route path string
  const routePathD = useMemo(() => {
    if (activeRoute.waypoints.length === 0) return '';
    return activeRoute.waypoints.map((wp, i) => `${i === 0 ? 'M' : 'L'} ${wp.x},${wp.y}`).join(' ');
  }, [activeRoute]);

  return (
    <div className="relative w-full h-full bg-slate-950/90 rounded-2xl border border-sky-900/40 shadow-2xl overflow-hidden flex flex-col">
      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-sky-900/40 bg-slate-900/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs md:text-sm">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>Icelandic Marine Nautical Chart</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-xs hidden sm:inline">
            Datum: WGS 84 · Mercator Projection · Copernicus SST Analysis
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Whale Data Zones Layer Toggle */}
          <button
            onClick={() => setShowWhaleGrid(!showWhaleGrid)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showWhaleGrid
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-200 border-cyan-400 shadow-md shadow-cyan-950'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Display 441 spatial zones by coordinates and coefficients"
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Zones</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700">441 zones</span>
          </button>

          {/* Values toggle inside cells */}
          {showWhaleGrid && (
            <button
              onClick={() => setShowGridValues(!showGridValues)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                showGridValues
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle numeric coefficient values inside each zone"
            >
              <span className="font-mono text-[11px] font-bold">12.3</span>
              <span className="hidden sm:inline">Coefficients</span>
            </button>
          )}

          {/* Opacity selector */}
          {showWhaleGrid && (
            <div className="flex items-center bg-slate-800/70 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                onClick={() => setGridOpacity(0.45)}
                className={`px-2 py-1 rounded cursor-pointer ${gridOpacity === 0.45 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Opacity 45%"
              >
                45%
              </button>
              <button
                onClick={() => setGridOpacity(0.70)}
                className={`px-2 py-1 rounded cursor-pointer ${gridOpacity === 0.70 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Opacity 70%"
              >
                70%
              </button>
              <button
                onClick={() => setGridOpacity(0.90)}
                className={`px-2 py-1 rounded cursor-pointer ${gridOpacity === 0.90 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Opacity 90% (Vivid)"
              >
                90%
              </button>
            </div>
          )}

          {/* Backend API Dummy Data config modal */}
          <button
            onClick={() => setShowBackendModal(true)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-cyan-950"
            title="Open backend API data inspector / upload custom data"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Backend API</span>
          </button>

          {/* Layer toggles */}
          <button
            onClick={() => setShowBathymetry(!showBathymetry)}
            className={`px-2 py-1 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
              showBathymetry
                ? 'bg-sky-900/60 text-sky-200 border-sky-600'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Continental Shelf Bathymetric Contours"
          >
            <Waves className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Shelf</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
              showGrid
                ? 'bg-sky-900/60 text-sky-200 border-sky-600'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Nautical Graticule"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Graticule</span>
          </button>

          {/* Ship Simulation Controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 ml-auto sm:ml-0">
            <button
              onClick={onToggleSimulate}
              className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                isShipSimulating
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-sky-600 text-white hover:bg-sky-500'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>{isShipSimulating ? 'Pause Voyage' : 'Simulate Route'}</span>
            </button>
            <button
              onClick={onResetShip}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Ship to Origin"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Live Vessel Grid Cell Telemetry & Continuous Color Scale Bar */}
      <div className="bg-[#030e1e] border-b border-sky-950 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Current Vessel Zone:</span>
          </span>
          <span className="font-mono text-white text-[11px] font-bold">
            {shipGeo.lat.toFixed(2)}°N, {shipGeo.lon.toFixed(2)}°W
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 text-[11px]">
            Risk Coefficient: <span className="font-mono font-black text-cyan-300 text-sm">{vesselGridCell.interpolatedValue.toFixed(2)}</span>
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${vesselGridCell.tierInfo.badgeClass}`}>
            {vesselGridCell.tierInfo.label}
          </span>
        </div>

        {/* Continuous Color Scale Bar based strictly on coefficient value */}
        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-emerald-400 font-bold">18.0</span>
          <div
            className="w-28 sm:w-36 h-2.5 rounded-full shadow-inner border border-white/20"
            style={{
              background: 'linear-gradient(to right, rgb(16,185,129), rgb(6,182,212), rgb(234,179,8), rgb(249,115,22), rgb(225,29,72))',
            }}
            title="Continuous zone color scale: 18.0 (green/safe) to 29.0 (crimson/critical)"
          />
          <span className="text-rose-400 font-bold">29.0</span>
          <span className="text-slate-400 text-[9px] hidden lg:inline">· Zone color by coefficient</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative flex-1 w-full min-h-[460px] max-h-[720px] select-none bg-[#030d1a]">
        <svg
          viewBox="0 0 920 620"
          className="w-full h-full object-contain"
          style={{ filter: isBridgeMode ? 'contrast(1.15) brightness(1.05)' : 'none' }}
        >
          <defs>
            {/* Ocean radial background gradient */}
            <radialGradient id="oceanGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#081e36" />
              <stop offset="70%" stopColor="#041224" />
              <stop offset="100%" stopColor="#020813" />
            </radialGradient>

            {/* Land pattern */}
            <linearGradient id="icelandLand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0b1120" />
            </linearGradient>

            {/* Glaciers style */}
            <linearGradient id="glacierGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.25" />
            </linearGradient>

            {/* Pulsing filters for High Risk Alert */}
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Hatch pattern for No Data */}
            <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.6" />
            </pattern>
          </defs>

          {/* Deep Ocean Base */}
          <rect width="920" height="620" fill="url(#oceanGrad)" />

          {/* Nautical Graticule / Coordinates */}
          {showGrid && (
            <g className="text-[10px] fill-cyan-400/40 select-none font-mono">
              {/* Latitude lines */}
              <line x1="40" y1="90" x2="880" y2="90" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="46" y="86">67° 00' N (Arctic Circle)</text>
              <line x1="40" y1="210" x2="880" y2="210" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="46" y="206">66° 00' N</text>
              <line x1="40" y1="360" x2="880" y2="360" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="46" y="356">65° 00' N</text>
              <line x1="40" y1="490" x2="880" y2="490" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="46" y="486">64° 00' N</text>

              {/* Longitude lines */}
              <line x1="120" y1="40" x2="120" y2="580" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="124" y="594">24° W</text>
              <line x1="280" y1="40" x2="280" y2="580" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="284" y="594">21° W</text>
              <line x1="480" y1="40" x2="480" y2="580" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="484" y="594">18° W</text>
              <line x1="680" y1="40" x2="680" y2="580" stroke="#0e3a64" strokeWidth="0.8" strokeDasharray="3 4" />
              <text x="684" y="594">15° W</text>
            </g>
          )}

          {/* Bathymetric Contours (100m and 200m Continental Shelf Edge) */}
          {showBathymetry && (
            <g className="fill-none select-none">
              {/* 200m Shelf Break */}
              <path
                d="M 60,320 C 60,200 90,80 200,60 C 320,40 500,45 660,65 C 790,80 890,180 890,320 C 890,460 760,540 600,560 C 420,580 240,580 180,540 C 100,490 60,420 60,320 Z"
                stroke="#0369a1"
                strokeWidth="1.2"
                strokeDasharray="4 6"
                strokeOpacity="0.45"
              />
              {/* 100m Coastal Feeding Shelf */}
              <path
                d="M 100,310 C 100,210 130,110 220,90 C 330,75 490,80 620,95 C 740,110 820,200 820,320 C 820,430 710,500 560,520 C 400,535 270,535 220,500 C 150,455 100,390 100,310 Z"
                stroke="#0284c7"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
              <text x="735" y="105" className="text-[9px] fill-sky-500/50 font-mono">200m isobath (Whale migration trough)</text>
              <text x="680" y="535" className="text-[9px] fill-sky-500/50 font-mono">100m shelf (Prey bloom)</text>
            </g>
          )}

          {/* 441-NODE WHALE DENSITY GRID OVERLAY */}
          <WhaleGridOverlay
            visible={showWhaleGrid}
            gridData={gridData}
            opacity={gridOpacity}
            showValues={showGridValues}
            vesselGeo={shipGeo}
            selectedPoint={selectedGridCell}
            onSelectGridPoint={(pt) => setSelectedGridCell(pt)}
            isBridgeMode={isBridgeMode}
          />

          {/* ICELAND AUTHENTIC NATURAL EARTH COASTLINE */}
          <g className="select-none filter drop-shadow-md">
            {/* Mainland Iceland */}
            <path
              d={ICELAND_MAINLAND_PATH}
              fill="url(#icelandLand)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />

            {/* Offshore Islands (Vestmannaeyjar / Heimaey, Grímsey, Hrísey, etc.) */}
            {ICELAND_ISLANDS_PATHS.map((islandPath, idx) => (
              <path
                key={idx}
                d={islandPath}
                fill="url(#icelandLand)"
                stroke="#38bdf8"
                strokeWidth="1.2"
              />
            ))}

            {/* Major Glaciers (Vatnajökull) for geographic anchor */}
            <path
              d="M 570,395 C 600,385 660,395 680,430 C 660,460 590,470 550,455 C 530,435 550,405 570,395 Z"
              fill="url(#glacierGrad)"
              stroke="#cbd5e1"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <text x="615" y="432" textAnchor="middle" className="text-[10px] fill-slate-400/60 font-sans uppercase tracking-widest font-semibold pointer-events-none">
              Vatnajökull
            </text>

            {/* Key Coastal Ports positioned with accurate Mercator projection */}
            <g className="text-[9px] font-mono fill-white pointer-events-none drop-shadow">
              <circle cx={ICELAND_PROJECTED_PINS['Reykjavík'][0]} cy={ICELAND_PROJECTED_PINS['Reykjavík'][1]} r="3.5" fill="#38bdf8" />
              <text x={ICELAND_PROJECTED_PINS['Reykjavík'][0] + 7} y={ICELAND_PROJECTED_PINS['Reykjavík'][1] + 3} className="font-bold">Reykjavík</text>

              <circle cx={ICELAND_PROJECTED_PINS['Akureyri'][0]} cy={ICELAND_PROJECTED_PINS['Akureyri'][1]} r="3.5" fill="#38bdf8" />
              <text x={ICELAND_PROJECTED_PINS['Akureyri'][0] + 7} y={ICELAND_PROJECTED_PINS['Akureyri'][1] + 3} className="font-bold">Akureyri</text>

              <circle cx={ICELAND_PROJECTED_PINS['Ísafjörður'][0]} cy={ICELAND_PROJECTED_PINS['Ísafjörður'][1]} r="3" fill="#38bdf8" />
              <text x={ICELAND_PROJECTED_PINS['Ísafjörður'][0] - 52} y={ICELAND_PROJECTED_PINS['Ísafjörður'][1] + 3}>Ísafjörður</text>

              <circle cx={ICELAND_PROJECTED_PINS['Seyðisfjörður'][0]} cy={ICELAND_PROJECTED_PINS['Seyðisfjörður'][1]} r="3" fill="#38bdf8" />
              <text x={ICELAND_PROJECTED_PINS['Seyðisfjörður'][0] + 7} y={ICELAND_PROJECTED_PINS['Seyðisfjörður'][1] + 3}>Seyðisfjörður</text>

              <circle cx={ICELAND_PROJECTED_PINS['South (Vestmannaeyjar)'][0]} cy={ICELAND_PROJECTED_PINS['South (Vestmannaeyjar)'][1]} r="3" fill="#38bdf8" />
              <text x={ICELAND_PROJECTED_PINS['South (Vestmannaeyjar)'][0] + 7} y={ICELAND_PROJECTED_PINS['South (Vestmannaeyjar)'][1] + 3}>Vestmannaeyjar</text>
            </g>
          </g>

          {/* ACTIVE SHIP ROUTE & WAYPOINTS */}
          <g>
            {/* Projected Route Line Glow */}
            <path
              d={routePathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeOpacity="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Projected Route Line Core */}
            <path
              d={routePathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Waypoint Markers with Risk-Color Coding */}
            {activeRoute.waypoints.map((wp, index) => {
              const rec = wp.siteId && recordsMap ? recordsMap.get(wp.siteId) : undefined;
              const r = evaluateRiskFromTemp(rec ? rec.sea_temp_c : null);
              const wpColor = r.level === 'HIGH' ? '#f43f5e' : r.level === 'MODERATE' ? '#f59e0b' : '#38bdf8';

              return (
                <g key={index} transform={`translate(${wp.x}, ${wp.y})`}>
                  <circle r={r.level === 'HIGH' ? 6 : 4} fill={wpColor} stroke="#ffffff" strokeWidth="1.4" />
                  {r.level === 'HIGH' && (
                    <circle r="12" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping opacity-75" />
                  )}
                  {index === 0 && (
                    <text x="8" y="3" className="text-[9px] fill-cyan-300 font-mono font-bold drop-shadow">
                      START: {wp.name.split(' ')[0]}
                    </text>
                  )}
                  {index === activeRoute.waypoints.length - 1 && (
                    <text x="8" y="3" className="text-[9px] fill-amber-300 font-mono font-bold drop-shadow">
                      DEST: {wp.name.split(' ')[0]}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ANIMATED VESSEL POSITION WITH FORWARD RADAR SCAN & SAFETY PERIMETER */}
            <g
              transform={`translate(${shipPosition.x}, ${shipPosition.y})`}
              className="transition-transform duration-100 ease-linear pointer-events-none"
            >
              {/* 5 NM and 10 NM safety perimeter circles */}
              <circle r="18" fill="none" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="2 3" strokeOpacity="0.5" />
              <circle r="36" fill="none" stroke="#0284c7" strokeWidth="0.6" strokeDasharray="2 4" strokeOpacity="0.3" />

              {/* Alert halo if ship is in high risk zone */}
              {isShipInHighRisk && (
                <>
                  <circle r="32" fill="rgba(244,63,94,0.2)" className="animate-ping" />
                  <circle r="22" fill="rgba(244,63,94,0.35)" stroke="#f43f5e" strokeWidth="2" />
                </>
              )}

              {/* Vessel marker & forward radar arc rotated to heading */}
              <g transform={`rotate(${shipPosition.heading})`}>
                {/* Forward lookahead radar arc */}
                <path
                  d="M 0,-12 L -22,-52 A 56 56 0 0 1 22,-52 Z"
                  fill={isShipInHighRisk ? 'rgba(244,63,94,0.18)' : 'rgba(56,189,248,0.12)'}
                  stroke={isShipInHighRisk ? 'rgba(244,63,94,0.6)' : 'rgba(56,189,248,0.4)'}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Ship hull icon */}
                <path
                  d="M 0,-12 L 6,4 L 4,10 L -4,10 L -6,4 Z"
                  fill={isShipInHighRisk ? '#f43f5e' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
              </g>

              {/* Vessel Telemetry Callout */}
              <g transform="translate(14, -20)">
                <rect
                  x="0"
                  y="0"
                  width="145"
                  height="36"
                  rx="6"
                  fill="#020817"
                  fillOpacity="0.94"
                  stroke={isShipInHighRisk ? '#f43f5e' : '#0284c7'}
                  strokeWidth="1.5"
                />
                <text x="8" y="14" className="font-bold fill-white text-[10px] tracking-tight">
                  {activeRoute.vesselCallsign ? `[${activeRoute.vesselCallsign}] ` : ''}{activeRoute.vesselType.split('(')[0].trim()}
                </text>
                <text
                  x="8"
                  y="27"
                  className={`font-mono font-bold text-[10px] ${
                    isShipInHighRisk ? 'fill-rose-400' : 'fill-cyan-300'
                  }`}
                >
                  SOG: {currentShipSpeedKnots.toFixed(1)} kts · HDG: {Math.round((shipPosition.heading % 360 + 360) % 360)}°
                </text>
              </g>
            </g>
          </g>

          {/* Nautical Legend (Bottom Left Corner) - Color scale based on coefficient */}
          <g transform="translate(20, 470)" className="select-none pointer-events-none">
            <rect x="0" y="0" width="176" height="110" rx="8" fill="#091424" fillOpacity="0.92" stroke="#0e3a64" strokeWidth="1" />
            <text x="12" y="18" className="text-[10px] font-bold fill-slate-200 uppercase tracking-wider">
              Zone Color by Coefficient
            </text>

            <circle cx="20" cy="36" r="5" fill="#e11d48" />
            <text x="32" y="40" className="text-[10px] font-mono fill-rose-300 font-bold">
              Critical: ≥ 26.5
            </text>

            <circle cx="20" cy="54" r="5" fill="#f97316" />
            <text x="32" y="58" className="text-[10px] font-mono fill-orange-300 font-bold">
              High: 24.0 – 26.5
            </text>

            <circle cx="20" cy="72" r="5" fill="#eab308" />
            <text x="32" y="76" className="text-[10px] font-mono fill-yellow-300 font-bold">
              Moderate: 21.0 – 24.0
            </text>

            <circle cx="20" cy="90" r="5" fill="#10b981" />
            <text x="32" y="94" className="text-[10px] font-mono fill-emerald-300 font-bold">
              Low: &lt; 21.0
            </text>
          </g>
        </svg>

        {/* OVERLAY: Selected Grid Cell Inspector Panel */}
        {selectedGridCell && (
          <div className="absolute bottom-4 right-4 max-w-sm bg-slate-900/95 border border-cyan-500 rounded-xl p-3.5 shadow-2xl backdrop-blur z-30 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inspected Grid Cell</span>
              </span>
              <button
                onClick={() => setSelectedGridCell(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Coordinates</span>
                <span className="font-mono font-bold text-white">
                  {selectedGridCell.lat.toFixed(2)}°N, {selectedGridCell.lon.toFixed(2)}°W
                </span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Whale Density</span>
                <span className="font-mono font-black text-cyan-300 text-sm">
                  {selectedGridCell.value.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300">
              {selectedGridCell.value >= 26.5
                ? 'CRITICAL CETACEAN CONCENTRATION: Maximum strike probability. Mandatory speed cap 10 kts.'
                : selectedGridCell.value >= 23.5
                ? 'HIGH CETACEAN DENSITY: Surface foraging corridor. Post active forward lookout.'
                : selectedGridCell.value >= 20.5
                ? 'MODERATE CETACEAN ACTIVITY: Active transit route. Normal navigational caution.'
                : 'LOW PROBABILITY: Baseline ocean waters.'}
            </p>
          </div>
        )}
      </div>

      {/* Backend Grid API & Dummy Values Modal */}
      <BackendGridModal
        isOpen={showBackendModal}
        onClose={() => setShowBackendModal(false)}
        gridData={gridData}
        onUpdateGridData={(newData) => {
          if (onUpdateGridData) onUpdateGridData(newData);
        }}
        onResetGridData={() => {
          if (onResetGridData) onResetGridData();
        }}
      />
    </div>
  );
};


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SeaTempRecord, DataKind, ShipRoute } from './types/whale';
import { parseSeaTempCSV, ParsedDataset, fetchLiveStarterCSV } from './utils/csvParser';
import { SAMPLE_SHIP_ROUTES, evaluateRiskFromTemp, bridgeAudio } from './utils/riskCalculator';
import { Header } from './components/Header';
import { IcelandMap } from './components/IcelandMap';
import { ForecastDateSelector } from './components/ForecastDateSelector';
import { ShipRouteAlert } from './components/ShipRouteAlert';
import { AreaCardsGrid } from './components/AreaCardsGrid';
import { CreditsModal } from './components/CreditsModal';
import { RouteHazardTimeline } from './components/RouteHazardTimeline';
import { MainLandingScreen } from './components/MainLandingScreen';
import { FreeCoordinateView } from './components/FreeCoordinateView';
import { RAW_WHALE_GRID_DATA, queryWhaleGrid } from './data/whaleGridData';
import { svgCoordsToGeo } from './utils/geoUtils';
import { AlertCircle, ExternalLink, Ship, Waves, Compass, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation mode: 'main' (Launch Overview Screen), 'free' (Sample Waypoints), or 'bridge' (Command Console)
  const [viewMode, setViewMode] = useState<'main' | 'free' | 'bridge'>('main');

  // Whale Risk Spatial Grid Data (received from backend model, initialized with 441-point dummy dataset)
  const [gridData, setGridData] = useState<[number, number, number][]>(RAW_WHALE_GRID_DATA);

  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('Copernicus Marine Mirror');

  // Selected date and site state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('Faxaflói');

  // Route & Ship Simulation state
  const [activeRoute, setActiveRoute] = useState<ShipRoute>(SAMPLE_SHIP_ROUTES[0]);
  const [shipProgress, setShipProgress] = useState<number>(0.15);
  const [isShipSimulating, setIsShipSimulating] = useState<boolean>(false);
  const [currentShipSpeedKnots, setCurrentShipSpeedKnots] = useState<number>(18.5);

  // Display & UI modes
  const [isBridgeMode, setIsBridgeMode] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);

  // Track previous risk level to trigger audio alert on transition to HIGH
  const prevRiskLevelRef = useRef<string>('LOW');

  // Initial Data Load
  const loadInitialData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const csvText = await fetchLiveStarterCSV();
      const parsed = parseSeaTempCSV(csvText);
      setDataset(parsed);

      // Choose sensible default date: prefer the first forecast day (e.g. 2026-10-14), or latest date
      if (parsed.forecastDates.length > 0) {
        setSelectedDate(parsed.forecastDates[0]);
      } else if (parsed.dates.length > 0) {
        setSelectedDate(parsed.dates[parsed.dates.length - 1]);
      }
      setDataSourceLabel('Live Copernicus Marine Service');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sea temperature data';
      console.error('Error loading sea temperature dataset:', err);
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle local user file upload via "Open data file" button
  const handleOpenFile = (file: File) => {
    setIsLoading(true);
    setLoadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('File is empty.');
        const parsed = parseSeaTempCSV(text);
        setDataset(parsed);

        if (parsed.forecastDates.length > 0) {
          setSelectedDate(parsed.forecastDates[0]);
        } else if (parsed.dates.length > 0) {
          setSelectedDate(parsed.dates[parsed.dates.length - 1]);
        }
        setDataSourceLabel(`Local File: ${file.name}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error parsing uploaded CSV file';
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setLoadError('Failed to read file from disk.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  // Records for current selected date
  const currentRecordsMap = useMemo(() => {
    if (!dataset || !selectedDate) return undefined;
    return dataset.recordsByDateAndSite.get(selectedDate);
  }, [dataset, selectedDate]);

  // Current vessel sector calculation based on route progress
  const currentVesselSectorId = useMemo(() => {
    const wps = activeRoute.waypoints;
    if (wps.length === 0) return null;
    const totalSegments = wps.length - 1;
    const scaled = shipProgress * totalSegments;
    const segmentIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const segmentProgress = scaled - segmentIndex;
    return segmentProgress < 0.5 ? wps[segmentIndex].siteId ?? null : wps[segmentIndex + 1].siteId ?? null;
  }, [activeRoute, shipProgress]);

  // Convert ship progress along waypoints to real geographic coordinates
  const currentShipGeo = useMemo(() => {
    const wps = activeRoute.waypoints;
    if (wps.length < 2) {
      return wps[0] ? svgCoordsToGeo(wps[0].x, wps[0].y) : { lat: 64.3, lon: -22.5 };
    }
    const totalSegments = wps.length - 1;
    const scaled = shipProgress * totalSegments;
    const segmentIndex = Math.min(Math.floor(scaled), totalSegments - 1);
    const segmentProgress = scaled - segmentIndex;
    const p1 = wps[segmentIndex];
    const p2 = wps[segmentIndex + 1];
    const x = p1.x + (p2.x - p1.x) * segmentProgress;
    const y = p1.y + (p2.y - p1.y) * segmentProgress;
    return svgCoordsToGeo(x, y);
  }, [activeRoute, shipProgress]);

  // Current vessel whale grid query
  const currentShipGridCell = useMemo(() => {
    return queryWhaleGrid(currentShipGeo.lat, currentShipGeo.lon, gridData);
  }, [currentShipGeo, gridData]);

  // Check if vessel is currently in High Risk zone
  const currentVesselRisk = useMemo(() => {
    if (!currentVesselSectorId || !currentRecordsMap) return null;
    const rec = currentRecordsMap.get(currentVesselSectorId);
    if (!rec) return null;
    return evaluateRiskFromTemp(rec.sea_temp_c);
  }, [currentVesselSectorId, currentRecordsMap]);

  // Automated audio alert trigger when entering HIGH risk (either macro-sector or local whale grid)
  useEffect(() => {
    const isSectorHigh = currentVesselRisk?.level === 'HIGH';
    const isGridHigh =
      currentShipGridCell.tierInfo.tier === 'CRITICAL' ||
      currentShipGridCell.tierInfo.tier === 'HIGH';
    const isHigh = isSectorHigh || isGridHigh;

    if (isHigh && prevRiskLevelRef.current !== 'HIGH' && !isAudioMuted) {
      bridgeAudio.playSlowDownAlert();
    }
    prevRiskLevelRef.current = isHigh ? 'HIGH' : 'LOW';
  }, [currentVesselRisk, currentShipGridCell, isAudioMuted]);

  // Animated Ship Progress Loop
  useEffect(() => {
    if (!isShipSimulating) return;

    // Movement speed depends on knots and actual route distance
    const totalDist = activeRoute.totalDistanceNm || 248;
    const speedFactor = currentShipSpeedKnots / 18.5;
    const intervalTime = 80; // ms
    const step = (0.0035 * speedFactor * 248) / totalDist;

    const timer = setInterval(() => {
      setShipProgress((prev) => {
        const next = prev + step;
        if (next >= 1.0) {
          return 0.0; // loop back to port origin
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isShipSimulating, currentShipSpeedKnots, activeRoute.totalDistanceNm]);

  // Automated Timeline Playback Loop
  useEffect(() => {
    if (!isPlayingTimeline || !dataset || dataset.dates.length === 0) return;

    const timer = setInterval(() => {
      setSelectedDate((current) => {
        const idx = dataset.dates.indexOf(current);
        if (idx === -1 || idx >= dataset.dates.length - 1) {
          return dataset.dates[0]; // loop from beginning
        }
        return dataset.dates[idx + 1];
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlayingTimeline, dataset]);

  // Slow-down action
  const handleApplySlowDown = () => {
    setCurrentShipSpeedKnots(9.8);
    bridgeAudio.playSlowDownAlert();
  };

  const handleToggleAudioMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    bridgeAudio.setMuted(next);
  };

  // 1. MAIN LAUNCH SCREEN
  if (viewMode === 'main') {
    return (
      <MainLandingScreen
        onSelectFreePlan={() => setViewMode('free')}
        onSelectBridge={() => setViewMode('bridge')}
      />
    );
  }

  // 2. SPOT COORDINATES RISK MAP (FREE PLAN)
  if (viewMode === 'free') {
    return (
      <FreeCoordinateView
        recordsMap={currentRecordsMap}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        dates={dataset?.dates ?? []}
        onBackToHome={() => setViewMode('main')}
        onLaunchBridge={() => setViewMode('bridge')}
        gridData={gridData}
      />
    );
  }

  // 3. NAVIGATION BRIDGE: Full Primary Command Console with Real-Time Alerts & 441 Data Zones
  return (
    <div
      className={`min-h-screen bg-[#020814] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 ${
        isBridgeMode ? 'bridge-mode' : ''
      }`}
    >
      {/* Top Application Header with Return Button */}
      <Header
        onOpenFile={handleOpenFile}
        onReloadLive={loadInitialData}
        isLoading={isLoading}
        totalRecords={dataset?.records.length ?? 0}
        dateRange={
          dataset && dataset.dates.length > 0
            ? { start: dataset.dates[0], end: dataset.dates[dataset.dates.length - 1] }
            : null
        }
        isBridgeMode={isBridgeMode}
        onToggleBridgeMode={() => setIsBridgeMode(!isBridgeMode)}
        isAudioMuted={isAudioMuted}
        onToggleAudioMute={handleToggleAudioMute}
        onShowCredits={() => setShowCreditsModal(true)}
        onBackToMain={() => setViewMode('main')}
        onOpenFreePlan={() => setViewMode('free')}
      />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3.5 md:p-6 flex flex-col gap-5">
        {/* ONBOARD VESSEL LICENSE & STATUS BANNER */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/40 rounded-2xl p-4 shadow-xl backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/60 shadow-sm">
                  ✓ Subscription Active · Onboard Software Active
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Vessel: <strong className="text-white">M/V Elding IV</strong> (Callsign: <strong className="text-cyan-300">TF-2514</strong> · MMSI: <strong className="text-cyan-300">251482000</strong>)
                </span>
              </div>
              <p className="text-xs text-slate-300/90 mt-1">
                WhaleWay Onboard Suite active. Real-time route hazard lookahead analysis, 441-node spatial cetacean model, and automated acoustic slow-down advisories to ≤ 10 knots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Whale Grid Model
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                441 Cells · Real-Time Grid
              </span>
            </div>
          </div>
        </div>

        {/* Error Notification if data fails to load */}
        {loadError && (
          <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-4 flex items-center justify-between gap-3 text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Data Loading Notice</p>
                <p className="text-xs text-rose-300/90">{loadError}</p>
              </div>
            </div>
            <button
              onClick={loadInitialData}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Global Forecast Date Selector (Top Center) */}
        {dataset && (
          <ForecastDateSelector
            dates={dataset.dates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dateKinds={dataset.dateKinds}
            isPlayingTimeline={isPlayingTimeline}
            onTogglePlayTimeline={() => setIsPlayingTimeline(!isPlayingTimeline)}
            isBridgeMode={isBridgeMode}
          />
        )}

        {/* Real-Time Lookahead Route Hazard Profile */}
        <RouteHazardTimeline
          activeRoute={activeRoute}
          shipProgress={shipProgress}
          onSelectWaypointIndex={(idx) => {
            const wps = activeRoute.waypoints;
            if (!wps || wps.length === 0) return;
            const targetWp = wps[idx];
            if (!targetWp) return;
            const totalDist = activeRoute.totalDistanceNm || (wps[wps.length - 1].distanceFromStartNm ?? 1);
            const targetDist = targetWp.distanceFromStartNm ?? 0;
            setShipProgress(Math.min(1, Math.max(0, targetDist / totalDist)));
          }}
          recordsMap={currentRecordsMap}
          onSwitchRoute={(routeId) => {
            const r = SAMPLE_SHIP_ROUTES.find((item) => item.id === routeId);
            if (r) {
              setActiveRoute(r);
              setShipProgress(0);
              setCurrentShipSpeedKnots(r.defaultSpeedKnots);
            }
          }}
          currentShipSpeedKnots={currentShipSpeedKnots}
          gridData={gridData}
        />

        {/* Primary Dashboard Grid: Map on Left / Controls & Telemetry on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Nautical Chart of Iceland (Col 7) */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[520px]">
            <IcelandMap
              recordsMap={currentRecordsMap}
              selectedSite={selectedSite}
              onSelectSite={setSelectedSite}
              activeRoute={activeRoute}
              shipProgress={shipProgress}
              isShipSimulating={isShipSimulating}
              onToggleSimulate={() => setIsShipSimulating(!isShipSimulating)}
              onResetShip={() => setShipProgress(0)}
              isBridgeMode={isBridgeMode}
              currentShipSpeedKnots={currentShipSpeedKnots}
              onApplySlowDown={handleApplySlowDown}
              gridData={gridData}
              onUpdateGridData={(newData) => setGridData(newData)}
              onResetGridData={() => setGridData(RAW_WHALE_GRID_DATA)}
            />

            {/* Maritime Chart Legend & Directives */}
            <div className="bg-slate-900/60 rounded-xl px-4 py-2.5 border border-sky-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
                  <span className="text-rose-300 font-semibold">Critical Zone: Coeff. ≥ 26.5 (Speed ≤ 10 kts)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span className="text-orange-300 font-semibold">High: 24.0 – 26.5</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <span className="text-yellow-300 font-semibold">Moderate: 21.0 – 24.0</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-emerald-300 font-semibold">Low: &lt; 21.0</span>
                </span>
              </div>
              <span className="font-mono text-[11px] text-cyan-400">
                Model: 441 Zones · {dataSourceLabel}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Route Alert & Quick Access Controls (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Sample Ship Route & Automated Slow-Down Alert */}
            <ShipRouteAlert
              activeRoute={activeRoute}
              onSelectRoute={setActiveRoute}
              currentShipSpeedKnots={currentShipSpeedKnots}
              onSetShipSpeed={setCurrentShipSpeedKnots}
              shipSectorId={currentVesselSectorId}
              recordsMap={currentRecordsMap}
              isBridgeMode={isBridgeMode}
              isAudioMuted={isAudioMuted}
              onToggleAudioMute={handleToggleAudioMute}
              selectedDate={selectedDate}
              currentShipGridCell={currentShipGridCell}
              onSwitchRoute={(routeId) => {
                const r = SAMPLE_SHIP_ROUTES.find((item) => item.id === routeId);
                if (r) {
                  setActiveRoute(r);
                  setShipProgress(0);
                  setCurrentShipSpeedKnots(r.defaultSpeedKnots);
                }
              }}
            />
          </div>
        </div>

        {/* BOTTOM SECTION: 441 Data Zones Overview & Hotspots Grid */}
        <div className="mt-2">
          <AreaCardsGrid
            recordsMap={currentRecordsMap}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSite}
            isBridgeMode={isBridgeMode}
            selectedDate={selectedDate}
            gridData={gridData}
          />
        </div>

        {/* COMPREHENSIVE MARITIME FOOTER WITH MANDATORY ATTRIBUTION */}
        <footer className="mt-4 pt-5 pb-8 border-t border-sky-950 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-slate-300">
              Generated using E.U. Copernicus Marine Service Information.
            </span>
            <a
              href="https://doi.org/10.48670/moi-00016"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-mono"
            >
              <span>https://doi.org/10.48670/moi-00016</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>IMO Resolution MEPC.201(62)</span>
            <span>·</span>
            <span>International Whaling Commission (IWC)</span>
            <span>·</span>
            <button
              onClick={() => setShowCreditsModal(true)}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Methodology & Thresholds
            </button>
          </div>
        </footer>
      </main>

      {/* Provenance & Methodology Modal */}
      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </div>
  );
}

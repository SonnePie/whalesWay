import React from 'react';
import { ShipRoute, SeaTempRecord, RiskEvaluation } from '../types/whale';
import { SAMPLE_SHIP_ROUTES, evaluateRiskFromTemp, bridgeAudio } from '../utils/riskCalculator';
import {
  Ship,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  CheckCircle2,
  Volume2,
  VolumeX,
  Compass,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { queryWhaleGrid, getZoneColorByCoefficient } from '../data/whaleGridData';

interface ShipRouteAlertProps {
  activeRoute: ShipRoute;
  onSelectRoute: (route: ShipRoute) => void;
  currentShipSpeedKnots: number;
  onSetShipSpeed: (speed: number) => void;
  shipSectorId: string | null;
  recordsMap: Map<string, SeaTempRecord> | undefined;
  isBridgeMode: boolean;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
  selectedDate: string;
  onSwitchRoute?: (routeId: string) => void;
  currentShipGridCell?: ReturnType<typeof queryWhaleGrid>;
}

export const ShipRouteAlert: React.FC<ShipRouteAlertProps> = ({
  activeRoute,
  onSelectRoute,
  currentShipSpeedKnots,
  onSetShipSpeed,
  shipSectorId,
  recordsMap,
  isBridgeMode,
  isAudioMuted,
  onToggleAudioMute,
  selectedDate,
  onSwitchRoute,
  currentShipGridCell,
}) => {
  // Evaluate risk of the sector and zone the vessel is currently traversing
  const currentRecord = shipSectorId && recordsMap ? recordsMap.get(shipSectorId) : undefined;
  const currentTemp = currentRecord ? currentRecord.sea_temp_c : null;
  const currentRisk: RiskEvaluation = evaluateRiskFromTemp(currentTemp);

  const isGridHigh =
    currentShipGridCell &&
    (currentShipGridCell.tierInfo.tier === 'CRITICAL' ||
      currentShipGridCell.tierInfo.tier === 'HIGH');

  const isHighRisk = currentRisk.level === 'HIGH' || Boolean(isGridHigh);
  const isModerateRisk =
    !isHighRisk &&
    (currentRisk.level === 'MODERATE' || currentShipGridCell?.tierInfo.tier === 'MODERATE');
  const isSpeedCompliant = !isHighRisk || currentShipSpeedKnots <= 10.0;

  const currentZoneStyle = currentShipGridCell
    ? getZoneColorByCoefficient(currentShipGridCell.interpolatedValue)
    : null;

  return (
    <div className="w-full bg-slate-900/90 rounded-2xl border border-sky-900/40 p-4 md:p-5 shadow-xl backdrop-blur flex flex-col gap-4">
      {/* Route Selector & Audio Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-900/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800/80 flex items-center justify-center shrink-0">
            <Ship className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Vessel Transit Advisory
              </h3>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800 font-bold">
                {activeRoute.vesselCallsign}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ECDIS & Whale Collision Advisory Alert System
            </p>
          </div>
        </div>

        {/* Route Dropdown & Audio Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={activeRoute.id}
            onChange={(e) => {
              const r = SAMPLE_SHIP_ROUTES.find((item) => item.id === e.target.value);
              if (r) {
                onSelectRoute(r);
                onSetShipSpeed(r.defaultSpeedKnots);
              }
            }}
            className="bg-slate-800 text-slate-100 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium cursor-pointer max-w-[200px] truncate"
            title="Select ship voyage route"
          >
            {SAMPLE_SHIP_ROUTES.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>

          {/* <button
            onClick={onToggleAudioMute}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isAudioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-cyan-950 text-cyan-300 border-cyan-600 hover:bg-cyan-900'
            }`}
            title={isAudioMuted ? 'Unmute Bridge Alarm' : 'Mute Bridge Alarm'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button> */}
        </div>
      </div>

      {/* DYNAMIC ALERT BANNER (High, Moderate, or Clear) */}
      {isHighRisk ? (
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/95 via-slate-900 to-rose-950/70 border border-rose-500/80 shadow-xl shadow-rose-950/50 flex flex-col gap-3">
          {/* Top alert pill row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Automated Slow-Down Advisory
              </span>
            </div>
            {currentShipGridCell && currentZoneStyle && (
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border text-white shadow-sm"
                style={{
                  backgroundColor: currentZoneStyle.fill,
                  borderColor: currentZoneStyle.stroke,
                }}
              >
                Coeff: {currentShipGridCell.interpolatedValue.toFixed(2)}
              </span>
            )}
          </div>

          {/* Alert Message */}
          <div>
            <h4 className="text-sm md:text-base font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {currentShipGridCell
                  ? `Zone ${currentShipGridCell.nearestPoint.lat.toFixed(2)}°N, ${currentShipGridCell.nearestPoint.lon.toFixed(2)}°W`
                  : `High-Risk Water Sector: ${shipSectorId}`}
              </span>
            </h4>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
              {currentShipGridCell && currentShipGridCell.interpolatedValue >= 26.5
                ? 'High whale concentration along vessel heading. Reducing speed to ≤ 10.0 knots decreases lethal strike risk by > 80%.'
                : 'Elevated whale density detected. Maintain heightened forward watch and decelerate to safe transit speed.'}
            </p>
          </div>

          {/* Navigational Advisories & Recommendations (Alarm Notification Only) */}
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 pt-2 border-t border-rose-500/30">
            {/* Speed Deceleration Advisory Notice */}
            <div
              className={`flex-1 rounded-xl p-2.5 border flex items-center gap-2.5 ${
                currentShipSpeedKnots > 10.0
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                  : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  currentShipSpeedKnots > 10.0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider">
                  {currentShipSpeedKnots > 10.0
                    ? 'ADVISORY: REDUCE SPEED TO ≤ 10 KTS (9.8 KTS RECOMMENDED)'
                    : `SAFE SPEED COMPLIANT: ${currentShipSpeedKnots.toFixed(1)} KTS`}
                </span>
                <span className="text-[10px] opacity-80 leading-tight">
                  {currentShipSpeedKnots > 10.0
                    ? 'Bridge acoustic alarm active · Manual throttle reduction required by watch officer'
                    : 'Current speed reduces strike lethality probability by > 80%'}
                </span>
              </div>
            </div>

            {/* Offshore Bypass Advisory Notice */}
            {activeRoute.alternativeRouteId && (
              <div className="rounded-xl p-2.5 bg-slate-900/90 border border-cyan-500/50 text-cyan-200 flex items-center gap-2.5 shrink-0">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-300 tracking-wider">
                    {activeRoute.isOffshoreBypass
                      ? 'ROUTE STATUS: OFFSHORE BYPASS ACTIVE'
                      : 'ADVISORY: OFFSHORE BYPASS RECOMMENDED'}
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {activeRoute.isOffshoreBypass
                      ? 'Navigating whale-safe bypass corridor'
                      : 'Detour (+16 NM) available via route selector'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isModerateRisk ? (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Caution Transit Zone: {shipSectorId || 'Active Corridor'}
              </p>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Moderate cetacean density. Maintain forward visual lookout. Advised speed ≤ 14.0 kts.
              </p>
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[11px] font-mono font-bold shrink-0 self-start sm:self-auto">
            ADVISORY: MAINTAIN ≤ 14.0 KTS
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Standard Navigational Watch · Low whale aggregation likelihood in sector</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 uppercase shrink-0">
            Clear Transit
          </span>
        </div>
      )}

      {/* COMPACT & FLEXIBLE 2x2 TELEMETRY GRID */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: Position & Water Sector */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Water Sector
            </span>
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-sm md:text-base font-black text-white mt-1 block truncate">
            {shipSectorId || 'Iceland Shelf'}
          </span>
          <span className="text-[10px] text-cyan-300/80 font-mono mt-0.5 truncate block">
            {currentRecord
              ? `${currentRecord.latitude}°N, ${currentRecord.longitude}°W`
              : 'Underway'}
          </span>
        </div>

        {/* Card 2: Vessel Speed (SOG) */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Speed Over Ground
            </span>
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl md:text-2xl font-black font-mono tracking-tight ${
                !isSpeedCompliant ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
              }`}
            >
              {currentShipSpeedKnots.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">kts</span>
          </div>
          {/* Safe Speed Limit Indicator */}
          <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
            <span className="text-slate-400">Target limit:</span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold ${
                currentShipSpeedKnots <= 10.0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/60'
              }`}
            >
              ≤ 10.0 kts
            </span>
          </div>
        </div>

        {/* Card 3: Sea Surface Temp (Copernicus SST) */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sea Surface Temp
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-white">
              {currentTemp !== null && !isNaN(currentTemp) ? currentTemp.toFixed(2) : 'no data'}
            </span>
            {currentTemp !== null && !isNaN(currentTemp) && (
              <span className="text-[10px] font-bold text-slate-400">°C</span>
            )}
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5 truncate font-mono">
            {selectedDate || 'Copernicus Mirror'}
          </span>
        </div>

        {/* Card 4: Whale Strike Risk Classification */}
        <div
          className={`rounded-xl p-3 border flex flex-col justify-between ${
            isHighRisk
              ? 'bg-rose-950/40 border-rose-500/50'
              : isModerateRisk
              ? 'bg-amber-950/30 border-amber-500/40'
              : 'bg-emerald-950/30 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
              Strike Risk
            </span>
            {currentZoneStyle && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: currentZoneStyle.fill }}
              />
            )}
          </div>
          <span
            className={`text-sm md:text-base font-black mt-1 block truncate ${
              isHighRisk ? 'text-rose-400' : isModerateRisk ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {currentShipGridCell
              ? currentShipGridCell.tierInfo.tier
              : currentRisk.label}
          </span>
          <span className="text-[9px] text-slate-300/80 font-mono block mt-0.5 truncate">
            {currentShipGridCell
              ? `Coeff: ${currentShipGridCell.interpolatedValue.toFixed(2)}`
              : currentRisk.speedRecommendation}
          </span>
        </div>
      </div>
    </div>
  );
};

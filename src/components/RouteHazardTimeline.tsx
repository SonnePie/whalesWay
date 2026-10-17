import React from 'react';
import { ShipRoute, SeaTempRecord, RiskEvaluation } from '../types/whale';
import { evaluateRiskFromTemp, SAMPLE_SHIP_ROUTES } from '../utils/riskCalculator';
import { queryWhaleGrid, RAW_WHALE_GRID_DATA, getZoneColorByCoefficient } from '../data/whaleGridData';
import { svgCoordsToGeo } from '../utils/geoUtils';
import { Navigation, AlertTriangle, ShieldCheck, ShieldAlert, ArrowRight, RefreshCw, Compass, Grid } from 'lucide-react';

interface RouteHazardTimelineProps {
  activeRoute: ShipRoute;
  shipProgress: number; // 0 to 1
  onSelectWaypointIndex: (index: number) => void;
  recordsMap: Map<string, SeaTempRecord> | undefined;
  onSwitchRoute: (routeId: string) => void;
  currentShipSpeedKnots: number;
  gridData?: [number, number, number][];
}

export const RouteHazardTimeline: React.FC<RouteHazardTimelineProps> = ({
  activeRoute,
  shipProgress,
  onSelectWaypointIndex,
  recordsMap,
  onSwitchRoute,
  currentShipSpeedKnots,
  gridData = RAW_WHALE_GRID_DATA,
}) => {
  const totalWaypoints = activeRoute.waypoints.length;
  const totalDistanceNm = activeRoute.totalDistanceNm || (activeRoute.waypoints[totalWaypoints - 1]?.distanceFromStartNm ?? 1);
  const currentDistanceNm = Math.round(Math.min(totalDistanceNm, Math.max(0, shipProgress * totalDistanceNm)));
  const remainingDistanceNm = Math.max(0, totalDistanceNm - currentDistanceNm);

  // Find alternative route if available
  const alternativeRoute = activeRoute.alternativeRouteId
    ? SAMPLE_SHIP_ROUTES.find((r) => r.id === activeRoute.alternativeRouteId)
    : null;

  // Compute hazard level for each waypoint using both SST records and Whale Grid
  const waypointsData = activeRoute.waypoints.map((wp, idx) => {
    const rec = wp.siteId && recordsMap ? recordsMap.get(wp.siteId) : undefined;
    const temp = rec ? rec.sea_temp_c : null;
    const risk = evaluateRiskFromTemp(temp);

    // Query micro-cell from whale grid data
    const geo = svgCoordsToGeo(wp.x, wp.y);
    const gridCell = queryWhaleGrid(geo.lat, geo.lon, gridData);
    const isGridHigh = gridCell.tierInfo.tier === 'CRITICAL' || gridCell.tierInfo.tier === 'HIGH';

    return {
      wp,
      idx,
      geo,
      temp,
      risk,
      gridCell,
      isGridHigh,
    };
  });

  // Compute legs between consecutive waypoints for proportional timeline rendering
  const legs = [];
  for (let i = 0; i < totalWaypoints - 1; i++) {
    const startWp = activeRoute.waypoints[i];
    const endWp = activeRoute.waypoints[i + 1];
    const startDist = startWp.distanceFromStartNm ?? 0;
    const endDist = endWp.distanceFromStartNm ?? totalDistanceNm;
    const spanNm = Math.max(0.1, endDist - startDist);
    const widthPercent = (spanNm / totalDistanceNm) * 100;

    const midLat = (startWp.lat + endWp.lat) / 2;
    const midLon = (startWp.lon + endWp.lon) / 2;
    const legGridCell = queryWhaleGrid(midLat, midLon, gridData);
    const legStyle = getZoneColorByCoefficient(legGridCell.interpolatedValue, 0.85);

    legs.push({
      index: i,
      startWp,
      endWp,
      startDist,
      endDist,
      spanNm,
      widthPercent,
      legGridCell,
      legStyle,
    });
  }

  // Find closest waypoint to the vessel's current distance
  let closestWpIdx = 0;
  let minDiff = Infinity;
  activeRoute.waypoints.forEach((wp, i) => {
    const dist = wp.distanceFromStartNm ?? 0;
    const diff = Math.abs(dist - currentDistanceNm);
    if (diff < minDiff) {
      minDiff = diff;
      closestWpIdx = i;
    }
  });

  // Calculate upcoming hazard distance ahead of current vessel position
  let nextHazardInfo: { name: string; distanceNm: number; temp: number | null; risk: RiskEvaluation; gridVal: number } | null = null;
  for (let i = 0; i < totalWaypoints; i++) {
    const wpData = waypointsData[i];
    const wpDist = wpData.wp.distanceFromStartNm ?? 0;
    if (wpDist > currentDistanceNm) {
      if (wpData.risk.level === 'HIGH' || wpData.risk.level === 'MODERATE' || wpData.isGridHigh) {
        nextHazardInfo = {
          name: wpData.wp.name,
          distanceNm: Math.max(1, wpDist - currentDistanceNm),
          temp: wpData.temp,
          risk: wpData.risk,
          gridVal: wpData.gridCell.interpolatedValue,
        };
        break;
      }
    }
  }

  // Calculate ETA to next hazard
  const etaMinutes =
    nextHazardInfo && currentShipSpeedKnots > 0
      ? Math.round((nextHazardInfo.distanceNm / currentShipSpeedKnots) * 60)
      : null;

  return (
    <div className="w-full bg-slate-900/95 rounded-2xl border border-sky-900/40 p-4 shadow-xl backdrop-blur">
      {/* Top Header: Route Hazard Overview & Alternative Reroute */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-900/30">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Lookahead Route Hazard Profile
          </h3>
          <span className="text-[10px] font-mono bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-700">
            {totalDistanceNm} NM VOYAGE
          </span>
        </div>

        {/* Alternative Route Toggle for the Captain */}
        {alternativeRoute && (
          <button
            onClick={() => onSwitchRoute(alternativeRoute.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeRoute.isOffshoreBypass
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                : 'bg-cyan-950/80 text-cyan-300 border-cyan-600 hover:bg-cyan-900'
            }`}
            title="Toggle between Coastal Route and Whale-Safe Offshore Corridor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {activeRoute.isOffshoreBypass
                ? 'Active: Whale-Safe Bypass (Switch to Coastal)'
                : 'Switch to Whale-Safe Offshore Bypass (+16 NM)'}
            </span>
          </button>
        )}
      </div>

      {/* Lookahead Alert Pill */}
      <div className="mt-3">
        {nextHazardInfo && nextHazardInfo.distanceNm <= 40 ? (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              nextHazardInfo.risk.level === 'HIGH'
                ? 'bg-rose-950/60 border-rose-500/80 text-rose-200'
                : 'bg-amber-950/60 border-amber-500/80 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold uppercase tracking-wide">
                  Upcoming Hazard:{' '}
                </span>
                <span className="text-white font-semibold">{nextHazardInfo.name}</span>
                <span className="mx-1.5 opacity-60">·</span>
                <span className="font-mono">
                  SST {nextHazardInfo.temp !== null ? `${nextHazardInfo.temp.toFixed(1)}°C` : 'no data'}
                </span>
                <span className="mx-1.5 opacity-60">·</span>
                <span className="font-bold">
                  {nextHazardInfo.risk.level === 'HIGH'
                    ? 'Dense Baleen Feeding Concentration'
                    : 'Active Cetacean Transit Corridor'}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono">
              <span className="font-bold text-white text-sm">
                in {nextHazardInfo.distanceNm} NM
              </span>
              {etaMinutes !== null && (
                <span className="block text-[10px] opacity-80">
                  ETA: ~{etaMinutes} min
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Waters ahead clear for next 40+ NM · No major feeding aggregations detected at present sea temperatures.
            </span>
          </div>
        )}
      </div>

      {/* Visual Timeline Scrubber with Distance-Proportional Segments */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
          <span>
            Voyage Progress: <strong className="text-white">{currentDistanceNm} NM</strong> / {totalDistanceNm} NM ({Math.round(shipProgress * 100)}%)
          </span>
          <span>
            Remaining: <strong className="text-cyan-300">{remainingDistanceNm} NM</strong>
          </span>
        </div>

        {/* Hazard Segment Bar based strictly on Route Distance & Zone Coefficient */}
        <div className="relative h-5 w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-stretch shadow-inner">
          {legs.map((leg) => {
            return (
              <div
                key={leg.index}
                onClick={() => onSelectWaypointIndex(leg.index)}
                className="h-full border-r border-slate-950/80 transition-colors cursor-pointer relative group"
                style={{
                  width: `${leg.widthPercent}%`,
                  backgroundColor: leg.legStyle.fill,
                }}
                title={`Leg ${leg.index + 1}: ${leg.startWp.name} → ${leg.endWp.name} (${leg.spanNm} NM) · Coeff ${leg.legGridCell.interpolatedValue.toFixed(2)}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                  <div className="bg-slate-950 text-white text-[10px] px-2.5 py-1 rounded-md shadow-xl border border-slate-700 whitespace-nowrap font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leg.legStyle.stroke }} />
                    <span>
                      {leg.startWp.name.split(' ')[0]} → {leg.endWp.name.split(' ')[0]}: coeff. {leg.legGridCell.interpolatedValue.toFixed(2)} ({leg.spanNm} NM)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Animated Vessel Marker Pointer along the timeline bar */}
          <div
            className="absolute top-0 bottom-0 w-3 bg-white shadow-[0_0_14px_#38bdf8] border-x border-slate-950 z-20 -translate-x-1/2 transition-all duration-100 ease-linear rounded-sm"
            style={{ left: `${shipProgress * 100}%` }}
            title={`Vessel Position: ${currentDistanceNm} NM (${Math.round(shipProgress * 100)}%)`}
          />
        </div>

        {/* Waypoint Sequence Cards: strictly synchronized by distance and index */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {waypointsData.map((seg, idx) => {
            const wpDist = seg.wp.distanceFromStartNm ?? 0;
            const isCurrent = idx === closestWpIdx;
            const isPassed = wpDist < currentDistanceNm - 1 && !isCurrent;
            const zoneStyle = getZoneColorByCoefficient(seg.gridCell.interpolatedValue);

            return (
              <button
                key={idx}
                onClick={() => onSelectWaypointIndex(idx)}
                className={`shrink-0 px-3 py-2 rounded-xl text-left border text-xs transition-all cursor-pointer font-mono ${
                  isCurrent
                    ? 'bg-sky-950/95 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400'
                    : isPassed
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-cyan-500'
                }`}
                title={`Click to set ship position to ${seg.wp.name} (${wpDist} NM)`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: zoneStyle.fill }}
                    />
                    <span className="font-bold text-[11px] truncate">
                      {seg.wp.name.split(' ')[0]}
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950">
                      SHIP
                    </span>
                  )}
                </div>

                <div className="text-[10px] opacity-90 mt-1 flex items-center justify-between gap-3">
                  <span className={isCurrent ? 'text-cyan-300 font-bold' : ''}>
                    {wpDist} NM
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: zoneStyle.stroke }}
                  >
                    coeff. {seg.gridCell.interpolatedValue.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { RAW_WHALE_GRID_DATA, WhaleGridPoint } from '../data/whaleGridData';
import { Grid } from 'lucide-react';

interface AreaCardsGridProps {
  isBridgeMode?: boolean;
  gridData?: [number, number, number][];
  onSelectGridCell?: (cell: WhaleGridPoint) => void;
  selectedSite?: string | null;
  onSelectSite?: (siteName: string) => void;
  recordsMap?: unknown;
  selectedDate?: string;
}

export const AreaCardsGrid: React.FC<AreaCardsGridProps> = ({
  gridData = RAW_WHALE_GRID_DATA,
}) => {
  const data = gridData && gridData.length > 0 ? gridData : RAW_WHALE_GRID_DATA;

  // Compute stats across all 441 zones
  const stats = useMemo(() => {
    let criticalCount = 0;
    let highCount = 0;
    let moderateCount = 0;
    let lowCount = 0;
    let maxPoint: WhaleGridPoint = { lon: data[0][0], lat: data[0][1], value: data[0][2] };
    let minPoint: WhaleGridPoint = { lon: data[0][0], lat: data[0][1], value: data[0][2] };

    for (const [lon, lat, val] of data) {
      if (val >= 26.5) criticalCount++;
      else if (val >= 24.0) highCount++;
      else if (val >= 21.0) moderateCount++;
      else lowCount++;

      if (val > maxPoint.value) maxPoint = { lon, lat, value: val };
      if (val < minPoint.value) minPoint = { lon, lat, value: val };
    }

    return {
      total: data.length,
      criticalCount,
      highCount,
      moderateCount,
      lowCount,
      maxPoint,
      minPoint,
    };
  }, [data]);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header with Title and Overall Color Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-950 pb-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <span>Spatial Marine Zones by Coefficient Data (441 Zones)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Each zone is defined by latitude and longitude coordinates. Zone color varies continuously based on the model coefficient.
          </p>
        </div>

        {/* Global Continuous Color Scale Bar */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-sky-900/50">
          <span className="text-emerald-400 font-bold">18.0</span>
          <div
            className="w-32 h-2.5 rounded-full shadow-inner border border-white/20"
            style={{
              background: 'linear-gradient(to right, rgb(16,185,129), rgb(6,182,212), rgb(234,179,8), rgb(249,115,22), rgb(225,29,72))',
            }}
          />
          <span className="text-rose-400 font-bold">29.0</span>
          <span className="text-[10px] text-slate-400 hidden md:inline">· Risk Scale</span>
        </div>
      </div>

      {/* 4 TIER SUMMARY TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Critical Danger Tile */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-br from-rose-950/70 to-slate-900 border border-rose-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Critical (Crimson)</span>
            </span>
            <span className="text-xs font-mono font-bold text-rose-300 px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800">
              ≥ 26.5
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">{stats.criticalCount}</span>
            <span className="text-[11px] text-rose-200/80">marine zones</span>
          </div>
          <p className="text-[10px] text-rose-300/80 mt-1 font-medium">
            Mandatory vessel speed reduction to ≤ 10 knots
          </p>
        </div>

        {/* High Density Tile */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-br from-orange-950/60 to-slate-900 border border-orange-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>High (Orange)</span>
            </span>
            <span className="text-xs font-mono font-bold text-orange-300 px-1.5 py-0.5 rounded bg-orange-950 border border-orange-800">
              24.0 – 26.5
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">{stats.highCount}</span>
            <span className="text-[11px] text-orange-200/80">marine zones</span>
          </div>
          <p className="text-[10px] text-orange-300/80 mt-1 font-medium">
            Station dedicated forward visual lookout on bridge
          </p>
        </div>

        {/* Moderate Density Tile */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Moderate (Cyan)</span>
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
              21.0 – 24.0
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">{stats.moderateCount}</span>
            <span className="text-[11px] text-cyan-200/80">marine zones</span>
          </div>
          <p className="text-[10px] text-cyan-300/80 mt-1 font-medium">
            Active transit corridor, standard situational awareness
          </p>
        </div>

        {/* Low / Safe Tile */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Low (Green)</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
              &lt; 21.0
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">{stats.lowCount}</span>
            <span className="text-[11px] text-emerald-200/80">marine zones</span>
          </div>
          <p className="text-[10px] text-emerald-300/80 mt-1 font-medium">
            Standard navigation waters, low encounter probability
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  RAW_WHALE_GRID_DATA,
  WHALE_GRID_CONFIG,
  getZoneColorByCoefficient,
  getGridRiskTier,
  WhaleGridPoint,
} from '../data/whaleGridData';
import { geoToSvgCoords } from '../utils/geoUtils';

interface WhaleGridOverlayProps {
  visible: boolean;
  gridData?: [number, number, number][];
  opacity?: number;
  showValues?: boolean;
  highlightCoord?: { lat: number; lon: number } | null;
  vesselGeo?: { lat: number; lon: number } | null;
  selectedPoint?: WhaleGridPoint | null;
  onSelectGridPoint?: (point: WhaleGridPoint) => void;
  isBridgeMode?: boolean;
}

export const WhaleGridOverlay: React.FC<WhaleGridOverlayProps> = ({
  visible,
  gridData,
  opacity = 0.65,
  showValues = false,
  highlightCoord,
  vesselGeo,
  selectedPoint,
  onSelectGridPoint,
  isBridgeMode = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeData = useMemo(() => {
    return gridData && gridData.length > 0 ? gridData : RAW_WHALE_GRID_DATA;
  }, [gridData]);

  // Pre-calculate SVG cell polygons for all grid points
  const gridCells = useMemo(() => {
    const halfStep = WHALE_GRID_CONFIG.step / 2; // 0.125 deg

    return activeData.map(([lon, lat, val], index) => {
      // 4 corners of each 0.25° x 0.25° cell
      const nw = geoToSvgCoords(lat + halfStep, lon - halfStep);
      const ne = geoToSvgCoords(lat + halfStep, lon + halfStep);
      const se = geoToSvgCoords(lat - halfStep, lon + halfStep);
      const sw = geoToSvgCoords(lat - halfStep, lon - halfStep);

      const center = geoToSvgCoords(lat, lon);
      const zoneStyle = getZoneColorByCoefficient(val, opacity);

      const pathD = `M ${nw.x},${nw.y} L ${ne.x},${ne.y} L ${se.x},${se.y} L ${sw.x},${sw.y} Z`;

      return {
        index,
        lon,
        lat,
        val,
        pathD,
        center,
        nw,
        ne,
        se,
        sw,
        color: zoneStyle.fill,
        strokeColor: zoneStyle.stroke,
        tier: zoneStyle.tier,
        label: zoneStyle.label,
        advisory: zoneStyle.advisory,
        badgeClass: zoneStyle.badgeClass,
      };
    });
  }, [activeData, opacity]);

  // Check which cell contains the ship/vessel
  const vesselCellIndex = useMemo(() => {
    if (!vesselGeo) return null;
    const halfStep = WHALE_GRID_CONFIG.step / 2;

    for (const cell of gridCells) {
      if (
        Math.abs(cell.lat - vesselGeo.lat) <= halfStep &&
        Math.abs(cell.lon - vesselGeo.lon) <= halfStep
      ) {
        return cell.index;
      }
    }
    return null;
  }, [vesselGeo, gridCells]);

  // Check which cell matches the highlighted coordinate (if provided)
  const activeHighlightedIndex = useMemo(() => {
    if (!highlightCoord) return null;
    const halfStep = WHALE_GRID_CONFIG.step / 2;

    for (const cell of gridCells) {
      if (
        Math.abs(cell.lat - highlightCoord.lat) <= halfStep &&
        Math.abs(cell.lon - highlightCoord.lon) <= halfStep
      ) {
        return cell.index;
      }
    }
    return null;
  }, [highlightCoord, gridCells]);

  // Check which cell matches the selected point
  const selectedCellIndex = useMemo(() => {
    if (!selectedPoint) return null;
    const halfStep = WHALE_GRID_CONFIG.step / 2;

    for (const cell of gridCells) {
      if (
        Math.abs(cell.lat - selectedPoint.lat) <= halfStep &&
        Math.abs(cell.lon - selectedPoint.lon) <= halfStep
      ) {
        return cell.index;
      }
    }
    return null;
  }, [selectedPoint, gridCells]);

  if (!visible) return null;

  return (
    <g className="whale-grid-layer select-none">
      {/* 441 Grid Cells Mesh */}
      {gridCells.map((cell) => {
        const isHovered = hoveredIndex === cell.index;
        const isHighlighted = activeHighlightedIndex === cell.index;
        const isSelected = selectedCellIndex === cell.index;
        const isVesselInCell = vesselCellIndex === cell.index;

        let strokeColor = cell.strokeColor;
        let strokeWidth = 0.75;

        if (isSelected) {
          strokeColor = '#ffffff';
          strokeWidth = 2.6;
        } else if (isVesselInCell) {
          strokeColor = cell.tier === 'CRITICAL' || cell.tier === 'HIGH' ? '#f43f5e' : '#38bdf8';
          strokeWidth = 2.4;
        } else if (isHighlighted) {
          strokeColor = '#38bdf8';
          strokeWidth = 2.2;
        } else if (isHovered) {
          strokeColor = '#ffffff';
          strokeWidth = 2.0;
        }

        return (
          <g
            key={cell.index}
            className="cursor-pointer group"
            onMouseEnter={() => setHoveredIndex(cell.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectGridPoint) {
                onSelectGridPoint({ lon: cell.lon, lat: cell.lat, value: cell.val });
              }
            }}
          >
            {/* Cell Polygon */}
            <path
              d={cell.pathD}
              fill={cell.color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={isVesselInCell ? '4 2' : 'none'}
              className="transition-colors duration-150"
            />

            {/* Glowing radar target brackets if the vessel is currently in this cell */}
            {isVesselInCell && (
              <path
                d={cell.pathD}
                fill="none"
                stroke={cell.tier === 'CRITICAL' ? '#f43f5e' : '#38bdf8'}
                strokeWidth="2.5"
                className="animate-pulse"
                opacity="0.9"
              />
            )}

            {/* Subtle center marker for Critical/Peak nodes */}
            {cell.val >= 26.5 && (
              <circle
                cx={cell.center.x}
                cy={cell.center.y}
                r={isVesselInCell || isSelected ? 3.5 : 2}
                fill={cell.val >= 27.8 ? '#f43f5e' : '#f59e0b'}
                opacity={0.85}
              />
            )}

            {/* Numeric Density Value Label (when toggled ON or hovered/selected) */}
            {(showValues || isHovered || isSelected || isVesselInCell) && (
              <text
                x={cell.center.x}
                y={cell.center.y + 3.5}
                textAnchor="middle"
                className={`font-mono font-bold pointer-events-none drop-shadow select-none ${
                  isVesselInCell || isSelected
                    ? 'fill-white text-[9px]'
                    : cell.tier === 'CRITICAL'
                    ? 'fill-rose-200 text-[8px]'
                    : cell.tier === 'HIGH'
                    ? 'fill-amber-200 text-[8px]'
                    : 'fill-sky-100 text-[7.5px]'
                }`}
                style={{
                  fontSize: isBridgeMode ? '10px' : undefined,
                }}
              >
                {cell.val.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}

      {/* Floating Hover/Inspect Tooltip */}
      {hoveredIndex !== null && gridCells[hoveredIndex] && (
        <g
          transform={`translate(${gridCells[hoveredIndex].center.x}, ${Math.max(
            35,
            gridCells[hoveredIndex].center.y - 28
          )})`}
          className="pointer-events-none z-50 select-none drop-shadow-2xl"
        >
          <rect
            x="-95"
            y="-52"
            width="190"
            height="58"
            rx="8"
            fill="#020817"
            fillOpacity="0.96"
            stroke={gridCells[hoveredIndex].strokeColor}
            strokeWidth="1.8"
          />
          <text
            x="0"
            y="-34"
            textAnchor="middle"
            className="text-[10px] font-bold fill-slate-300 font-mono tracking-wide"
          >
            ZONE: {gridCells[hoveredIndex].lat.toFixed(2)}°N {gridCells[hoveredIndex].lon.toFixed(2)}°W
          </text>
          <text
            x="0"
            y="-18"
            textAnchor="middle"
            className="text-[11px] font-black fill-white font-mono"
          >
            COEFFICIENT: <tspan fill="#38bdf8" className="text-cyan-300">{gridCells[hoveredIndex].val.toFixed(2)}</tspan>
          </text>
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            className="text-[9px] font-bold uppercase tracking-wider fill-amber-300"
          >
            {gridCells[hoveredIndex].label}
          </text>
        </g>
      )}
    </g>
  );
};

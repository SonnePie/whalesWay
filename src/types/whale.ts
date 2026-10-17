export type DataKind = 'analysis' | 'forecast';

export interface SeaTempRecord {
  date: string; // YYYY-MM-DD
  site: string; // e.g., 'Faxaflói', 'Westfjords', 'North (Eyjafjörður)', 'Eastfjords', 'South (Vestmannaeyjar)'
  latitude: number | null;
  longitude: number | null;
  sea_temp_c: number | null;
  kind: DataKind;
}

export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'NO_DATA';

export interface RiskEvaluation {
  level: RiskLevel;
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  bgGlowClass: string;
  textColor: string;
  advisory: string;
  speedRecommendation: string;
  speedLimitKnots: number | null;
  description: string;
}

export interface SiteMeta {
  id: string;
  displayName: string;
  shortName: string;
  region: string;
  lat: number;
  lon: number;
  svgCenter: { x: number; y: number };
  majorPort: string;
  description: string;
  commonWhales: string[];
}

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  x: number; // SVG coordinate
  y: number; // SVG coordinate
  siteId?: string;
  distanceFromStartNm?: number;
}

export interface ShipRoute {
  id: string;
  name: string;
  description: string;
  vesselType: string;
  vesselCallsign: string;
  defaultSpeedKnots: number;
  totalDistanceNm: number;
  isOffshoreBypass?: boolean;
  alternativeRouteId?: string;
  waypoints: Waypoint[];
}

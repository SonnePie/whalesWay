import { ICELAND_SITES_META } from './riskCalculator';

export interface NearestSiteResult {
  siteId: string;
  distanceNm: number; // nautical miles
  lat: number;
  lon: number;
  svgPos: { x: number; y: number };
}

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine formula to compute distance in nautical miles
export function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_km = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R_km * c;
  return km * 0.539957; // 1 km = 0.539957 nautical miles
}

// Conformal Mercator projection matching authentic Natural Earth 1:10m Iceland geometry (viewBox 0 0 920 620)
export function geoToSvgCoords(lat: number, lon: number): { x: number; y: number } {
  const minLon = -25.5;
  const maxLon = -12.5;
  const minLat = 63.0;
  const maxLat = 67.2;

  function latToY(l: number) {
    const rad = (l * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + rad / 2));
  }

  const yMin = latToY(minLat);
  const yMax = latToY(maxLat);
  const curY = latToY(lat);

  const width = 920;
  const height = 620;

  const x = ((lon - minLon) / (maxLon - minLon)) * (width - 80) + 40;
  const y = height - 40 - ((curY - yMin) / (yMax - yMin)) * (height - 80);

  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// Invert Mercator SVG coordinates back to genuine Lat/Lon
export function svgCoordsToGeo(x: number, y: number): { lat: number; lon: number } {
  const minLon = -25.5;
  const maxLon = -12.5;
  const minLat = 63.0;
  const maxLat = 67.2;

  function latToY(l: number) {
    const rad = (l * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + rad / 2));
  }

  function yToLat(yVal: number) {
    const rad = 2 * Math.atan(Math.exp(yVal)) - Math.PI / 2;
    return (rad * 180) / Math.PI;
  }

  const width = 920;
  const height = 620;

  const lon = minLon + ((x - 40) / (width - 80)) * (maxLon - minLon);
  const yMin = latToY(minLat);
  const yMax = latToY(maxLat);
  const curY = yMin + ((height - 40 - y) / (height - 80)) * (yMax - yMin);
  const lat = yToLat(curY);

  return {
    lat: Math.round(Math.max(62.5, Math.min(68.0, lat)) * 1000) / 1000,
    lon: Math.round(Math.max(-26.5, Math.min(-12.0, lon)) * 1000) / 1000,
  };
}

// Find closest Copernicus Marine sampling site
export function findNearestIcelandSite(lat: number, lon: number): NearestSiteResult {
  const sites = Object.values(ICELAND_SITES_META);
  let bestSite = sites[0];
  let minDistance = Infinity;

  for (const site of sites) {
    const dist = calculateDistanceNm(lat, lon, site.lat, site.lon);
    if (dist < minDistance) {
      minDistance = dist;
      bestSite = site;
    }
  }

  const svgPos = geoToSvgCoords(lat, lon);

  return {
    siteId: bestSite.id,
    distanceNm: Math.round(minDistance * 10) / 10,
    lat,
    lon,
    svgPos,
  };
}

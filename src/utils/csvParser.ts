import { SeaTempRecord, DataKind } from '../types/whale';

export interface ParsedDataset {
  records: SeaTempRecord[];
  dates: string[]; // sorted chronological
  analysisDates: string[];
  forecastDates: string[];
  sites: string[];
  recordsByDateAndSite: Map<string, Map<string, SeaTempRecord>>;
  dateKinds: Map<string, DataKind>;
}

export function parseSeaTempCSV(csvContent: string): ParsedDataset {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing data rows.');
  }

  // Header detection
  const header = lines[0].split(',').map(c => c.trim().toLowerCase());
  const dateIdx = header.indexOf('date');
  const siteIdx = header.indexOf('site');
  const latIdx = header.indexOf('latitude');
  const lonIdx = header.indexOf('longitude');
  const tempIdx = header.indexOf('sea_temp_c');
  const kindIdx = header.indexOf('kind');

  if (dateIdx === -1 || siteIdx === -1) {
    throw new Error('CSV must contain at least "date" and "site" columns.');
  }

  const records: SeaTempRecord[] = [];
  const datesSet = new Set<string>();
  const analysisDatesSet = new Set<string>();
  const forecastDatesSet = new Set<string>();
  const sitesSet = new Set<string>();
  const recordsByDateAndSite = new Map<string, Map<string, SeaTempRecord>>();
  const dateKinds = new Map<string, DataKind>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length <= Math.max(dateIdx, siteIdx)) continue;

    const date = row[dateIdx];
    const site = row[siteIdx];
    if (!date || !site) continue;

    const latRaw = latIdx !== -1 && row[latIdx] !== '' ? parseFloat(row[latIdx]) : NaN;
    const lonRaw = lonIdx !== -1 && row[lonIdx] !== '' ? parseFloat(row[lonIdx]) : NaN;
    const tempRaw = tempIdx !== -1 && row[tempIdx] !== '' ? parseFloat(row[tempIdx]) : NaN;

    const kindRaw = kindIdx !== -1 ? row[kindIdx]?.toLowerCase() : '';
    const kind: DataKind = kindRaw === 'forecast' ? 'forecast' : 'analysis';

    const record: SeaTempRecord = {
      date,
      site,
      latitude: isNaN(latRaw) ? null : latRaw,
      longitude: isNaN(lonRaw) ? null : lonRaw,
      sea_temp_c: isNaN(tempRaw) ? null : tempRaw,
      kind,
    };

    records.push(record);
    datesSet.add(date);
    sitesSet.add(site);
    dateKinds.set(date, kind);

    if (kind === 'forecast') {
      forecastDatesSet.add(date);
    } else {
      analysisDatesSet.add(date);
    }

    if (!recordsByDateAndSite.has(date)) {
      recordsByDateAndSite.set(date, new Map<string, SeaTempRecord>());
    }
    recordsByDateAndSite.get(date)!.set(site, record);
  }

  const sortedDates = Array.from(datesSet).sort();
  const sortedAnalysis = Array.from(analysisDatesSet).sort();
  const sortedForecast = Array.from(forecastDatesSet).sort();
  const sortedSites = Array.from(sitesSet).sort();

  return {
    records,
    dates: sortedDates,
    analysisDates: sortedAnalysis,
    forecastDates: sortedForecast,
    sites: sortedSites,
    recordsByDateAndSite,
    dateKinds,
  };
}

export const KNOWN_SITES = [
  'Faxaflói',
  'Westfjords',
  'North (Eyjafjörður)',
  'Eastfjords',
  'South (Vestmannaeyjar)',
];

export async function fetchLiveStarterCSV(): Promise<string> {
  const remoteUrl = 'https://oceanbuild.netlify.app/iceland_sea_temp_starter.csv';
  try {
    const res = await fetch(remoteUrl, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const text = await res.text();
    if (text && text.includes('sea_temp_c')) {
      return text;
    }
    throw new Error('Invalid CSV response received from remote server');
  } catch (err) {
    console.warn('Direct fetch from remote failed, loading local bundled dataset fallback...', err);
    const localRes = await fetch('/iceland_sea_temp_starter.csv');
    if (!localRes.ok) {
      throw new Error('Failed to load both live remote and local starter datasets');
    }
    return await localRes.text();
  }
}

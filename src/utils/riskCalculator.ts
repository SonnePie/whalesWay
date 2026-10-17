import { RiskEvaluation, SiteMeta, ShipRoute } from '../types/whale';

export function evaluateRiskFromTemp(tempC: number | null): RiskEvaluation {
  if (tempC === null || isNaN(tempC)) {
    return {
      level: 'NO_DATA',
      label: 'No Data',
      badgeClass: 'bg-slate-700/80 text-slate-300 border border-slate-600',
      cardBorderClass: 'border-slate-700/50',
      bgGlowClass: 'from-slate-900/40 to-slate-950/80',
      textColor: 'text-slate-400',
      advisory: 'No temperature data recorded for this date/site.',
      speedRecommendation: 'Standard caution · Maintain lookout',
      speedLimitKnots: null,
      description: 'Insufficient satellite/model data for deterministic risk evaluation.',
    };
  }

  if (tempC >= 9.0) {
    return {
      level: 'HIGH',
      label: 'HIGH RISK',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)]',
      cardBorderClass: 'border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)]',
      bgGlowClass: 'from-rose-950/40 via-slate-900/80 to-slate-950/90',
      textColor: 'text-rose-400',
      advisory: 'CRITICAL ALERT: High whale surface aggregation. Reduce speed to ≤ 10 knots.',
      speedRecommendation: 'Mandatory Slow-Down: ≤ 10.0 knots',
      speedLimitKnots: 10,
      description: 'Thermal front in prime baleen feeding range. Humpback & minke whales actively surface feeding.',
    };
  }

  if (tempC >= 6.0) {
    return {
      level: 'MODERATE',
      label: 'MODERATE RISK',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      cardBorderClass: 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      bgGlowClass: 'from-amber-950/30 via-slate-900/80 to-slate-950/90',
      textColor: 'text-amber-400',
      advisory: 'ADVISORY: Active migration & diving corridor. Enhanced lookout required.',
      speedRecommendation: 'Caution Advisory: ≤ 14.0 knots',
      speedLimitKnots: 14,
      description: 'Moderate foraging activity. Whales transitioning between deeper feeding troughs and coastal shelf.',
    };
  }

  return {
    level: 'LOW',
    label: 'LOW RISK',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    cardBorderClass: 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    bgGlowClass: 'from-emerald-950/30 via-slate-900/80 to-slate-950/90',
    textColor: 'text-emerald-400',
    advisory: 'CLEAR: Low whale strike likelihood. Standard maritime watch.',
    speedRecommendation: 'Standard Cruising Permitted',
    speedLimitKnots: null,
    description: 'Cold sub-polar waters below primary feeding aggregation threshold. Routine navigational watch.',
  };
}

export const ICELAND_SITES_META: Record<string, SiteMeta> = {
  'Faxaflói': {
    id: 'Faxaflói',
    displayName: 'Faxaflói Bay',
    shortName: 'Faxaflói',
    region: 'Southwest Waters',
    lat: 64.333,
    lon: -22.583,
    svgCenter: { x: 228, y: 418 },
    majorPort: 'Reykjavík Harbour',
    description: 'Sheltered western bay with dense shipping traffic, whale-watching excursions, and sandeel feeding grounds.',
    commonWhales: ['Minke Whales', 'Humpback Whales', 'White-beaked Dolphins', 'Harbour Porpoises'],
  },
  'Westfjords': {
    id: 'Westfjords',
    displayName: 'Westfjords (Vestfirðir)',
    shortName: 'Westfjords',
    region: 'Northwest Shelf',
    lat: 66.417,
    lon: -24.0,
    svgCenter: { x: 137, y: 147 },
    majorPort: 'Ísafjörður Port',
    description: 'Dramatic deep fjords and Greenland Sea meeting zone with steep continental shelf drop-offs.',
    commonWhales: ['Humpback Whales', 'Fin Whales', 'Blue Whales', 'Orcas (Killer Whales)'],
  },
  'North (Eyjafjörður)': {
    id: 'North (Eyjafjörður)',
    displayName: 'North (Eyjafjörður)',
    shortName: 'Eyjafjörður',
    region: 'North Coast & Arctic Front',
    lat: 66.5,
    lon: -18.417,
    svgCenter: { x: 498, y: 136 },
    majorPort: 'Akureyri / Húsavík Port',
    description: "Iceland's longest fjord and adjacent Skjálfandi Bay, globally renowned as prime cetacean summer feeding basin.",
    commonWhales: ['Humpback Whales', 'Minke Whales', 'Blue Whales', 'Northern Bottlenose'],
  },
  'Eastfjords': {
    id: 'Eastfjords',
    displayName: 'Eastfjords (Austfirðir)',
    shortName: 'Eastfjords',
    region: 'East Atlantic Shelf',
    lat: 64.917,
    lon: -13.167,
    svgCenter: { x: 837, y: 344 },
    majorPort: 'Seyðisfjörður Ferry Terminal',
    description: 'Deep glacial fjords opening into the Norwegian Sea; prime transit corridor for migrating fin and sei whales.',
    commonWhales: ['Fin Whales', 'Sei Whales', 'Humpback Whales', 'Long-finned Pilot Whales'],
  },
  'South (Vestmannaeyjar)': {
    id: 'South (Vestmannaeyjar)',
    displayName: 'South (Vestmannaeyjar)',
    shortName: 'Vestmannaeyjar',
    region: 'South Volcanic Shelf',
    lat: 63.333,
    lon: -20.333,
    svgCenter: { x: 374, y: 540 },
    majorPort: 'Vestmannaeyjar Harbour',
    description: 'Nutrient-rich Atlantic upwelling zone surrounding the volcanic archipelago; rich herring and capelin nursery.',
    commonWhales: ['Orcas (Killer Whales)', 'Minke Whales', 'Fin Whales', 'Pilot Whales'],
  },
};

export const SAMPLE_SHIP_ROUTES: ShipRoute[] = [
  {
    id: 'route-northbound',
    name: 'Reykjavík → Akureyri (Standard Coastal)',
    description: 'Direct coastal cargo & passenger corridor transit through Faxaflói, rounding the Westfjords into Eyjafjörður.',
    vesselType: 'Coastal Freight / Ferry (MS Akranes)',
    vesselCallsign: 'TF-921',
    defaultSpeedKnots: 18.5,
    totalDistanceNm: 248,
    alternativeRouteId: 'route-northbound-offshore',
    waypoints: [
      { name: 'Reykjavík Harbor Departure', lat: 64.15, lon: -21.95, x: 269, y: 440, siteId: 'Faxaflói', distanceFromStartNm: 0 },
      { name: 'Outer Faxaflói Passage', lat: 64.40, lon: -22.75, x: 218, y: 409, siteId: 'Faxaflói', distanceFromStartNm: 26 },
      { name: 'Snæfellsnes West Shoal', lat: 64.85, lon: -24.10, x: 130, y: 353, siteId: 'Westfjords', distanceFromStartNm: 68 },
      { name: 'Látrabjarg Cape Offshore', lat: 65.50, lon: -24.70, x: 92, y: 269, siteId: 'Westfjords', distanceFromStartNm: 114 },
      { name: 'Hornstrandir Arctic Point', lat: 66.50, lon: -23.20, x: 189, y: 136, siteId: 'Westfjords', distanceFromStartNm: 172 },
      { name: 'Siglufjörður Approach', lat: 66.35, lon: -18.90, x: 466, y: 156, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 210 },
      { name: 'Eyjafjörður Deep Fairway', lat: 66.05, lon: -18.30, x: 505, y: 197, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 232 },
      { name: 'Akureyri Commercial Pier', lat: 65.68, lon: -18.08, x: 519, y: 245, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 248 },
    ],
  },
  {
    id: 'route-northbound-offshore',
    name: 'Reykjavík → Akureyri (Whale-Safe Offshore Bypass)',
    description: 'Safe offshore shipping corridor routing 18 NM beyond coastal feeding shelf to avoid dense whale concentrations.',
    vesselType: 'Coastal Freight / Ferry (MS Akranes)',
    vesselCallsign: 'TF-921',
    defaultSpeedKnots: 19.5,
    totalDistanceNm: 264,
    isOffshoreBypass: true,
    alternativeRouteId: 'route-northbound',
    waypoints: [
      { name: 'Reykjavík Harbor Departure', lat: 64.15, lon: -21.95, x: 269, y: 440, siteId: 'Faxaflói', distanceFromStartNm: 0 },
      { name: 'Deep Faxaflói Bypass Point', lat: 64.48, lon: -23.40, x: 175, y: 399, siteId: 'Faxaflói', distanceFromStartNm: 34 },
      { name: 'Snæfellsnes Deep Trench (200m+)', lat: 65.05, lon: -24.95, x: 76, y: 327, siteId: 'Westfjords', distanceFromStartNm: 84 },
      { name: 'Outer Denmark Strait Corridor', lat: 65.80, lon: -25.20, x: 60, y: 231, siteId: 'Westfjords', distanceFromStartNm: 136 },
      { name: 'Horn Deep Passage', lat: 66.70, lon: -22.50, x: 233, y: 110, siteId: 'Westfjords', distanceFromStartNm: 188 },
      { name: 'North Shelf Safe Corridor', lat: 66.50, lon: -18.80, x: 473, y: 136, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 230 },
      { name: 'Akureyri Pier Entry', lat: 65.68, lon: -18.08, x: 519, y: 245, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 264 },
    ],
  },
  {
    id: 'route-south-islands',
    name: 'Reykjavík → Vestmannaeyjar (South Channel)',
    description: 'Frequent southern ferry and fisheries corridor traversing Faxaflói, Reykjanes, and the volcanic south shelf.',
    vesselType: 'Automobile & Passenger Ferry (Herjólfur)',
    vesselCallsign: 'TF-HER',
    defaultSpeedKnots: 19.0,
    totalDistanceNm: 76,
    waypoints: [
      { name: 'Reykjavík Sound', lat: 64.16, lon: -21.98, x: 267, y: 439, siteId: 'Faxaflói', distanceFromStartNm: 0 },
      { name: 'Reykjanes Shelf Warning Point', lat: 63.80, lon: -22.85, x: 211, y: 483, siteId: 'Faxaflói', distanceFromStartNm: 28 },
      { name: 'Grindavík Offshore Fairway', lat: 63.75, lon: -22.15, x: 256, y: 490, siteId: 'South (Vestmannaeyjar)', distanceFromStartNm: 44 },
      { name: 'South Coast Shoals', lat: 63.55, lon: -21.00, x: 331, y: 514, siteId: 'South (Vestmannaeyjar)', distanceFromStartNm: 62 },
      { name: 'Heimaey Harbor Entry', lat: 63.44, lon: -20.27, x: 378, y: 527, siteId: 'South (Vestmannaeyjar)', distanceFromStartNm: 76 },
    ],
  },
  {
    id: 'route-arctic-east',
    name: 'Akureyri → Seyðisfjörður (Northeast Passage)',
    description: 'North-to-East transit passing the feeding waters of Eyjafjörður, Skjálfandi, and into the deep eastern fjords.',
    vesselType: 'Oceanographic Vessel / Cargo (KV Þór)',
    vesselCallsign: 'TF-THOR',
    defaultSpeedKnots: 17.0,
    totalDistanceNm: 182,
    waypoints: [
      { name: 'Akureyri Port', lat: 65.68, lon: -18.08, x: 519, y: 245, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 0 },
      { name: 'Eyjafjörður Fjord Mouth', lat: 66.25, lon: -18.25, x: 508, y: 170, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 36 },
      { name: 'Grímsey Sound Fairway', lat: 66.60, lon: -17.80, x: 538, y: 123, siteId: 'North (Eyjafjörður)', distanceFromStartNm: 62 },
      { name: 'Langanes Northeast Cape', lat: 66.40, lon: -14.50, x: 751, y: 150, siteId: 'Eastfjords', distanceFromStartNm: 124 },
      { name: 'Borgarfjörður Eystri Offshore', lat: 65.60, lon: -13.60, x: 809, y: 256, siteId: 'Eastfjords', distanceFromStartNm: 158 },
      { name: 'Seyðisfjörður Fjord Reach', lat: 65.26, lon: -13.99, x: 784, y: 300, siteId: 'Eastfjords', distanceFromStartNm: 182 },
    ],
  },
];

// Nautical bridge alert chime using Web Audio API
class BridgeAudioNotifier {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playSlowDownAlert() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      // High-priority dual nautical tone (880Hz -> 659Hz chime)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.45);

      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.45);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.52);
      osc2.stop(now + 0.52);
    } catch {
      // Audio playback fails gracefully if browser policy blocks autoplay before gesture
    }
  }
}

export const bridgeAudio = new BridgeAudioNotifier();

/**
 * seriOperational.ts
 * Pure utility: maps SERI score → Operational Readiness, Barricade Recommendation,
 * and static Diversion Playbooks.
 *
 * All outputs are advisory guidance derived from SERI.
 * No live traffic data. No route optimization. No simulation.
 * No exact officer or barricade counts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RiskBand = "Low" | "Medium" | "High" | "Critical";

export interface OperationalReadiness {
  band: RiskBand;
  level: string;       // display label
  action: string;      // recommended action
  color: string;       // hex
  bgColor: string;
  borderColor: string;
}

export interface BarricadeRecommendation {
  band: RiskBand;
  text: string;
  color: string;
  bgColor: string;
}

export interface DiversionPlaybook {
  corridor: string;
  alternateCorrdiors: string[];
  monitoringZones: string[];
  notes: string[];
}

// ─── SERI → Risk Band ────────────────────────────────────────────────────────

export function getSeriBand(seri: number): RiskBand {
  if (seri >= 81) return "Critical";
  if (seri >= 61) return "High";
  if (seri >= 31) return "Medium";
  return "Low";
}

// ─── Operational Readiness ───────────────────────────────────────────────────

const READINESS_MAP: Record<RiskBand, OperationalReadiness> = {
  Low: {
    band: "Low",
    level: "Low",
    action: "Routine Monitoring",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  Medium: {
    band: "Medium",
    level: "Medium",
    action: "Enhanced Monitoring",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  High: {
    band: "High",
    level: "High",
    action: "Active Traffic Management",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.08)",
    borderColor: "rgba(249,115,22,0.3)",
  },
  Critical: {
    band: "Critical",
    level: "Critical",
    action: "Incident Response Readiness",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.3)",
  },
};

export function getOperationalReadiness(seri: number): OperationalReadiness {
  return READINESS_MAP[getSeriBand(seri)];
}

// ─── Barricade Recommendation ─────────────────────────────────────────────────

const BARRICADE_MAP: Record<RiskBand, BarricadeRecommendation> = {
  Low: {
    band: "Low",
    text: "No Temporary Barricading Required",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.06)",
  },
  Medium: {
    band: "Medium",
    text: "Barricade Review Recommended",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.06)",
  },
  High: {
    band: "High",
    text: "Strategic Barricading Recommended",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.06)",
  },
  Critical: {
    band: "Critical",
    text: "Temporary Barricading Strongly Recommended",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.06)",
  },
};

export function getBarricadeRecommendation(seri: number): BarricadeRecommendation {
  return BARRICADE_MAP[getSeriBand(seri)];
}

// ─── Static Diversion Playbooks ───────────────────────────────────────────────

/**
 * Static playbooks for major Bengaluru corridors.
 * These are advisory suggestions — requires human approval before deployment.
 */
const DIVERSION_PLAYBOOKS: DiversionPlaybook[] = [
  {
    corridor: "ORR East",
    alternateCorrdiors: [
      "Marathahalli Bridge – Whitefield Road",
      "Sarjapur Road – Bellandur junction",
      "Domlur Flyover – Indiranagar 100ft Road",
    ],
    monitoringZones: [
      "Marathahalli Junction",
      "Bellandur Lake Road",
      "Kadubeesanahalli Signal",
    ],
    notes: [
      "ORR East sees peak freight movement between 01:00–04:00 IST.",
      "Whitefield Road congestion likely during any major diversion.",
      "Coordinate with BBMP for signal timing adjustment at Marathahalli.",
    ],
  },
  {
    corridor: "Mysore Road",
    alternateCorrdiors: [
      "Kanakapura Road – NICE Road corridor",
      "Magadi Road – Chord Road",
      "Banashankari – JP Nagar via 80ft Road",
    ],
    monitoringZones: [
      "Kengeri Toll Gate",
      "Rajarajeshwari Nagar Junction",
      "Magadi Road Bridge",
    ],
    notes: [
      "Mysore Road is primary freight corridor to Mysuru Highway.",
      "NICE Road diversion adds approx. 8–12 km but reduces signal crossings.",
      "Monitor Kengeri satellite town area for spillover congestion.",
    ],
  },
  {
    corridor: "Bellary Road",
    alternateCorrdiors: [
      "Hebbal – Thanisandra – ORR North",
      "Manyata Tech Park Road – Nagawara Junction",
      "Outer Ring Road North via Kogilu Cross",
    ],
    monitoringZones: [
      "Hebbal Flyover",
      "Mekhri Circle",
      "Nagawara Junction",
    ],
    notes: [
      "Bellary Road is the primary artery to Kempegowda International Airport.",
      "Airport traffic peaks 04:00–07:00 IST and 18:00–21:00 IST.",
      "Thanisandra Road can absorb moderate volume — not suitable during peak.",
    ],
  },
  {
    corridor: "Tumkur Road",
    alternateCorrdiors: [
      "Yeshwanthpur – ORR West via Goraguntepalya",
      "Chord Road – Rajajinagar via Magadi Road",
      "Peenya Industrial Area – Jalahalli Cross",
    ],
    monitoringZones: [
      "Peenya Junction",
      "Yeshwanthpur Circle",
      "Nelamangala Toll Gate",
    ],
    notes: [
      "Tumkur Road is a major industrial freight corridor to Nelamangala.",
      "Heavy vehicle movement is continuous during night hours.",
      "Peenya Industrial Area generates significant cross-traffic on diversions.",
    ],
  },
  {
    corridor: "Hosur Road",
    alternateCorrdiors: [
      "Bannerghatta Road – JP Nagar",
      "Sarjapur Road – Marathahalli Bridge",
      "Electronic City Phase 2 – ORR South via Carmelaram",
    ],
    monitoringZones: [
      "Silk Board Junction",
      "Electronic City Toll",
      "Hosa Road Junction",
    ],
    notes: [
      "Silk Board Junction is one of Bengaluru's most congested nodes.",
      "Electronic City generates large IT workforce traffic 08:00–10:30 IST and 18:00–20:30 IST.",
      "Sarjapur Road diversion should only be used for moderate traffic volumes.",
    ],
  },
];

/**
 * Match a corridor string to a playbook using substring/keyword matching.
 * Returns null if no match found.
 */
export function getDiversionPlaybook(corridor: string): DiversionPlaybook | null {
  if (!corridor) return null;
  const normalized = corridor.toLowerCase();

  // Keyword aliases for fuzzy matching
  const aliases: Record<string, string> = {
    "orr east": "ORR East",
    "outer ring road east": "ORR East",
    "outer ring road": "ORR East",
    "mysore road": "Mysore Road",
    "mysuru road": "Mysore Road",
    "bellary road": "Bellary Road",
    "bellari road": "Bellary Road",
    "nh44": "Bellary Road",
    "tumkur road": "Tumkur Road",
    "tumakuru road": "Tumkur Road",
    "nh648": "Tumkur Road",
    "hosur road": "Hosur Road",
    "hosur": "Hosur Road",
    "silk board": "Hosur Road",
  };

  for (const [keyword, target] of Object.entries(aliases)) {
    if (normalized.includes(keyword)) {
      return DIVERSION_PLAYBOOKS.find(p => p.corridor === target) || null;
    }
  }

  return null;
}

// ─── Convenience: full guidance for a corridor+SERI pair ─────────────────────

export interface OperationalGuidance {
  seri: number;
  band: RiskBand;
  readiness: OperationalReadiness;
  barricade: BarricadeRecommendation;
  playbook: DiversionPlaybook | null;
}

export function getOperationalGuidance(seri: number, corridor?: string): OperationalGuidance {
  const band = getSeriBand(seri);
  return {
    seri,
    band,
    readiness: READINESS_MAP[band],
    barricade: BARRICADE_MAP[band],
    playbook: corridor ? getDiversionPlaybook(corridor) : null,
  };
}

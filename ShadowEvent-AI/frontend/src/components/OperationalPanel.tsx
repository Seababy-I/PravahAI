import { getOperationalGuidance, type OperationalGuidance } from "../utils/seriOperational";

interface OperationalPanelProps {
  seri: number;
  corridor?: string;
  /** When true, renders compactly (no playbook, single row layout) */
  compact?: boolean;
}

/**
 * OperationalPanel — Reusable SERI-driven operational guidance card.
 *
 * Displays:
 *  • SERI score + Risk Band
 *  • Operational Readiness level + recommended action
 *  • Barricade recommendation
 *  • Diversion Playbook (if corridor is a known major corridor)
 *  • Advisory disclaimer
 *
 * All recommendations are advisory guidance derived from historical SERI data.
 * Requires human approval before any operational deployment.
 */
export default function OperationalPanel({ seri, corridor, compact = false }: OperationalPanelProps) {
  const g: OperationalGuidance = getOperationalGuidance(seri, corridor);

  const { readiness, barricade, playbook, band } = g;

  const BAND_ICON: Record<string, string> = {
    Low: "🟢",
    Medium: "🟡",
    High: "🟠",
    Critical: "🔴",
  };

  return (
    <div className="operational-panel" style={{
      background: readiness.bgColor,
      border: `1px solid ${readiness.borderColor}`,
      borderRadius: 10,
      marginTop: 12,
      overflow: "hidden",
    }}>
      {/* Advisory banner */}
      <div className="advisory-banner" style={{
        background: "rgba(99,102,241,0.12)",
        borderBottom: "1px solid rgba(99,102,241,0.2)",
        padding: "6px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "rgba(165,180,252,0.9)",
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}>
        <span style={{ fontSize: 13 }}>🛡️</span>
        OPERATIONAL GUIDANCE — REQUIRES HUMAN APPROVAL
        <span style={{ marginLeft: "auto", fontWeight: 400, color: "rgba(148,163,184,0.7)", fontSize: 10 }}>
          Derived from historical SERI · Not real-time
        </span>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Header: SERI + Band */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 10,
            background: `${readiness.color}18`, border: `2px solid ${readiness.color}44`,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: readiness.color, lineHeight: 1 }}>
              {Math.round(seri)}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", marginTop: 2 }}>SERI</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{BAND_ICON[band]}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: readiness.color }}>{band} Risk</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                background: `${readiness.color}20`, color: readiness.color,
                letterSpacing: "0.04em",
              }}>
                SERI {seri >= 81 ? "81–100" : seri >= 61 ? "61–80" : seri >= 31 ? "31–60" : "0–30"}
              </span>
            </div>
            {corridor && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                {corridor}
              </div>
            )}
          </div>
        </div>

        {/* Grid: Readiness + Barricade */}
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10, marginBottom: playbook && !compact ? 14 : 0 }}>
          {/* Operational Readiness */}
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
              ⚙️ OPERATIONAL READINESS
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20,
              background: `${readiness.color}20`,
              border: `1px solid ${readiness.color}40`,
              marginBottom: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: readiness.color, display: "inline-block" }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: readiness.color }}>{readiness.level}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              → {readiness.action}
            </div>
          </div>

          {/* Barricade Recommendation */}
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: barricade.bgColor, border: `1px solid ${barricade.color}22`,
          }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
              🚧 BARRICADE ADVISORY
            </div>
            <div style={{ fontSize: 12, color: barricade.color, fontWeight: 600, lineHeight: 1.4 }}>
              {barricade.text}
            </div>
          </div>
        </div>

        {/* Diversion Playbook */}
        {playbook && !compact && (
          <div style={{
            borderRadius: 8, border: "1px solid rgba(99,102,241,0.2)",
            background: "rgba(99,102,241,0.04)", overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>🗺️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(165,180,252,0.9)" }}>
                  Suggested Diversion Playbook — {playbook.corridor}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  Operational guidance · Requires human approval before use
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              {/* Alternate Corridors */}
              <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(99,102,241,0.1)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
                  ↪ ALTERNATE CORRIDORS
                </div>
                {playbook.alternateCorrdiors.map((alt, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: "var(--text-secondary)", marginBottom: 5,
                    paddingLeft: 8, borderLeft: "2px solid rgba(99,102,241,0.3)",
                  }}>
                    {alt}
                  </div>
                ))}
              </div>
              {/* Monitoring Zones */}
              <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(99,102,241,0.1)" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
                  📍 MONITORING ZONES
                </div>
                {playbook.monitoringZones.map((zone, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: "var(--text-secondary)", marginBottom: 5,
                    paddingLeft: 8, borderLeft: "2px solid rgba(245,158,11,0.4)",
                  }}>
                    {zone}
                  </div>
                ))}
              </div>
              {/* Operational Notes */}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
                  📋 OPERATIONAL NOTES
                </div>
                {playbook.notes.map((note, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: "var(--text-muted)", marginBottom: 5, lineHeight: 1.4,
                    paddingLeft: 8, borderLeft: "2px solid rgba(16,185,129,0.3)",
                  }}>
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No playbook notice */}
        {!playbook && !compact && corridor && (
          <div style={{
            marginTop: 10, padding: "10px 14px", borderRadius: 8,
            background: "rgba(148,163,184,0.04)", border: "1px solid var(--border)",
            fontSize: 11, color: "var(--text-muted)",
          }}>
            🗺️ No static diversion playbook for <em>{corridor}</em>.
            Playbooks available for: ORR East · Mysore Road · Bellary Road · Tumkur Road · Hosur Road.
          </div>
        )}
      </div>
    </div>
  );
}

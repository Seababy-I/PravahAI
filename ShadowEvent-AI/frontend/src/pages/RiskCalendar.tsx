import { useEffect, useState } from "react";
import { getRiskCalendar } from "../api/endpoints";
import { Sunrise, Sun, CloudSun, Sunset, Moon, Star, Calendar, AlertTriangle, MapPin } from "lucide-react";

const TIME_BUCKETS = ["early_morning", "morning", "afternoon", "evening", "night", "midnight"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BUCKET_ICONS: Record<string, any> = {
  early_morning: <Sunrise size={14} />,
  morning: <Sun size={14} />,
  afternoon: <CloudSun size={14} />,
  evening: <Sunset size={14} />,
  night: <Moon size={14} />,
  midnight: <Star size={14} />,
};

function getRiskColor(risk: string, alpha: number = 1) {
  if (risk === "High")   return `rgba(239,68,68,${alpha})`;
  if (risk === "Medium") return `rgba(245,158,11,${alpha})`;
  return `rgba(16,185,129,${alpha})`;
}

export default function RiskCalendar() {
  const [calendar, setCalendar] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRiskCalendar()
      .then(setCalendar)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;
  if (!calendar) return <div className="page-body">No calendar data available.</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Risk Calendar
          </div>
          <div className="page-subtitle">Weekly proactive risk forecast — click any cell to explore</div>
        </div>
      </div>

      <div className="page-body">
        {/* Day-level summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, marginBottom: 24 }}>
          {DAYS.map(day => {
            const d = calendar.day_risk?.[day];
            return (
              <div key={day} className="card" style={{
                textAlign: "center", padding: "14px 10px",
                borderColor: getRiskColor(d?.overall_risk || "Low", 0.4),
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{day.slice(0, 3).toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: getRiskColor(d?.overall_risk || "Low", 1), margin: "6px 0" }}>
                  {((d?.avg_score || 0) * 100).toFixed(0)}%
                </div>
                <div><span className={`risk-badge ${d?.overall_risk || "Low"}`}>{d?.overall_risk || "Low"}</span></div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                  {d?.high_risk_count} High slots
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Calendar Grid */}
        <div className="card" style={{ marginBottom: 24, overflowX: "auto" }}>
          <div className="section-title" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={18} /> Weekly Risk Matrix</div>
          <div className="calendar-grid">
            {/* Header row */}
            <div className="cal-header" />
            {DAYS.map(d => (
              <div key={d} className="cal-header">{d.slice(0, 3)}</div>
            ))}

            {/* Data rows */}
            {TIME_BUCKETS.map(bucket => (
              <>
                <div key={`lbl-${bucket}`} className="cal-label">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.7 }}>
                    {BUCKET_ICONS[bucket]} {bucket.replace(/_/g, " ")}
                  </div>
                </div>
                {DAYS.map(day => {
                  const cell = calendar.matrix?.[day]?.[bucket];
                  const risk = cell?.risk_level || "Low";
                  return (
                    <div
                      key={`${day}-${bucket}`}
                      className={`cal-cell risk-${risk.toLowerCase()}`}
                      onClick={() => setSelected({ day, bucket, ...cell })}
                      title={`${day} ${bucket}: ${cell?.top_corridor}`}
                    >
                      <div className="cal-score" style={{ color: getRiskColor(risk) }}>
                        {cell ? `${(cell.score * 100).toFixed(0)}%` : "-"}
                      </div>
                      <span className={`risk-badge ${risk}`} style={{ fontSize: 9, padding: "1px 6px" }}>{risk}</span>
                      <div className="cal-corridor">{cell?.top_corridor || "-"}</div>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Top Risk Slots */}
        <div className="grid-2">
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={18} className="text-danger" /> Top High-Risk Slots</div>
            {calendar.top_risk_slots?.map((slot: any, i: number) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: "1px solid var(--border)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-muted)", minWidth: 24 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{slot.corridor}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {slot.day} · {slot.time_bucket.replace(/_/g, " ")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent-red)", fontSize: 18 }}>
                    {(slot.score * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{slot.incident_count} incidents</div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected cell detail */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>
              {selected ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={16} /> {selected.day} · {selected.bucket?.replace(/_/g, " ")}</div> : "Click a cell to inspect"}
            </div>
            {selected ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span className={`risk-badge ${selected.risk_level}`}>{selected.risk_level} Risk</span>
                  <span style={{ fontWeight: 800, fontSize: 24, color: getRiskColor(selected.risk_level) }}>
                    {(selected.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Top Corridor: </span><b>{selected.top_corridor}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Incident Count: </span><b>{selected.incident_count}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Top Causes: </span>
                    {selected.top_causes?.map((c: string) => (
                      <span key={c} className={`tag cause-${c}`} style={{ marginRight: 4 }}>{c.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>
                Click any calendar cell to see detailed risk breakdown for that time slot.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const BAND_COLOR: Record<string, string> = {
  Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#10b981",
};
const DARK_TIP = {
  contentStyle: { background: "#131c2e", border: "1px solid #1e2d47", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }
};

const DEMO_STEPS = [
  { id: 1, label: "City Risk Overview", icon: "🏙️" },
  { id: 2, label: "Top Shadow Events", icon: "👁️" },
  { id: 3, label: "Weekly Forecast", icon: "📅" },
  { id: 4, label: "What-If Simulator", icon: "🧪" },
  { id: 5, label: "Learning Engine", icon: "🧠" },
  { id: 6, label: "MapMyIndia Context", icon: "🗺️" },
  { id: 7, label: "Methodology", icon: "📖" },
];

export default function Demo() {
  const [stats, setStats] = useState<any>(null);
  const [shadows, setShadows] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [mmi, setMmi] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/stats`),
      axios.get(`${API_BASE}/seri`, { params: { named_only: true, limit: 8 } }),
      axios.get(`${API_BASE}/forecast`, { params: { named_only: true, limit: 50 } }),
      axios.get(`${API_BASE}/mmi-config`),
    ]).then(([s, sh, f, m]) => {
      setStats(s.data);
      setShadows(sh.data.data || []);
      setForecast(f.data);
      setMmi(m.data);
    }).finally(() => setLoading(false));
  }, []);

  const weekly = forecast?.weekly_view || {};
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayRisk = days.map(d => {
    const slots = Object.values(weekly[d] || {}) as any[];
    const max = slots.length ? Math.max(...slots.map((s: any) => s.max_score || 0)) : 0;
    const band = slots.find((s: any) => s.max_score === max)?.risk_level || "Low";
    return { day: d.slice(0, 3), score: max, band };
  });

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;

  return (
    <div className="fade-in" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "#100F0A",
        borderBottom: "1px solid rgba(6,182,212,0.25)",
        padding: "24px 32px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontSize: 28, fontWeight: 900,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}>Interactive Demo</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
              Urban Traffic Intelligence Platform · Bengaluru
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
            <div style={{ color: "#9D5FF5", fontWeight: 700, marginBottom: 4 }}>LIVE DEMO MODE</div>
            Nov 2023 – Apr 2024 · {stats?.total_incidents?.toLocaleString()} incidents · {stats?.total_weeks_in_data} weeks
          </div>
        </div>

        {/* Step nav */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {DEMO_STEPS.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{
                padding: "8px 16px", borderRadius: 20, border: "1px solid", fontSize: 12, cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: step === s.id ? 700 : 500,
                borderColor: step === s.id ? "rgba(124,58,237,0.5)" : "var(--glass-border)",
                background: step === s.id ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                color: step === s.id ? "#9D5FF5" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >{s.icon} {s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 32px 40px" }}>

        {/* STEP 1 — City Overview */}
        {step === 1 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              🏙️ City Risk Overview
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Incidents", value: stats?.total_incidents?.toLocaleString(), color: "var(--accent-cyan)" },
                { label: "Shadow Event Slots", value: stats?.total_shadow_events, color: "#8b5cf6" },
                { label: "High/Critical SERI", value: stats?.high_risk_events, color: "var(--accent-red)" },
                { label: "Named Corridors", value: stats?.named_corridors, color: "var(--accent-green)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div className="grid-2">
              <div className="card">
                <div className="section-title" style={{ marginBottom: 14 }}>Cause Distribution</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(stats?.cause_distribution || {}).slice(0, 8).map(([k, v]) => ({ name: k.replace(/_/g, " "), count: v }))} layout="vertical" barSize={12}>
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip {...DARK_TIP} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="section-title" style={{ marginBottom: 14 }}>IST Hour Distribution</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(stats?.hour_distribution || {}).map(([k, v]) => ({ hour: `${k}h`, count: v }))} barSize={10}>
                      <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip {...DARK_TIP} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{stats?.timestamp_note}</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Top Shadow Events */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              👁️ Top Shadow Events by SERI
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {shadows.slice(0, 8).map((se: any, i: number) => (
                <div key={i} className="card" style={{
                  borderLeft: `4px solid ${BAND_COLOR[se.seri_band] || "#3b82f6"}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{se.corridor}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {se.day_name} · {se.time_bucket?.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {se.incident_count} incidents · {(se.recurrence_score * 100).toFixed(0)}% recurrence
                    </div>
                    <span className={`risk-badge ${se.seri_band}`} style={{ marginTop: 6, display: "inline-block" }}>{se.seri_band}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: BAND_COLOR[se.seri_band] }}>{se.seri?.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>SERI</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              SERI = 0.4×Recurrence + 0.4×Frequency + 0.2×Severity · Scale 0–100
            </div>
          </div>
        )}

        {/* STEP 3 — Forecast */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              📅 Weekly Risk Forecast
            </div>
            <div style={{ fontSize: 12, color: "var(--accent-yellow)", marginBottom: 20, fontWeight: 600 }}>
              Historical Pattern-Based Forecast — NOT real-time prediction · MAE = {forecast?.metadata?.validation_mae ? `${(forecast.metadata.validation_mae * 100).toFixed(2)}%` : "—"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, marginBottom: 24 }}>
              {dayRisk.map(({ day, score, band }) => (
                <div key={day} className="card" style={{ textAlign: "center", padding: "16px 8px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>{day}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: BAND_COLOR[band], margin: "8px 0" }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <span className={`risk-badge ${band}`}>{band}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Top Forecast Slots (All Days)</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead><tr><th>Corridor</th><th>Day</th><th>Time Slot</th><th>Score</th><th>SERI</th><th>Band</th></tr></thead>
                  <tbody>
                    {(forecast?.data || []).filter((r: any) => r.corridor !== "Non-corridor").slice(0, 12).map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.corridor}</td>
                        <td>{r.day_name}</td>
                        <td>{r.time_bucket?.replace(/_/g, " ")}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 50, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${r.forecast_score * 100}%`, height: "100%", background: BAND_COLOR[r.forecast_band] }} />
                            </div>
                            <span style={{ fontSize: 12 }}>{(r.forecast_score * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.seri?.toFixed(1)}</td>
                        <td><span className={`risk-badge ${r.forecast_band}`}>{r.forecast_band}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — What-If (static demo) */}
        {step === 4 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              🧪 What-If Event Simulator
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Historical analog lookup — NOT a traffic simulation
            </div>
            <div className="grid-2">
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}>How It Works</div>
                {[
                  ["Input", "Event location (lat/lon), type, attendance, day"],
                  ["Step 1", "Find all historical incidents within 2 km (haversine)"],
                  ["Step 2", "Find historical incidents of same type on same day-of-week"],
                  ["Step 3", "Look up SERI of affected named corridors"],
                  ["Step 4", "Apply attendance multiplier: S×1.0, M×1.3, L×1.7"],
                  ["Output", "Estimated SERI per corridor + historical analogs"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 13 }}>
                    <span style={{ width: 60, flexShrink: 0, fontWeight: 700, color: "var(--accent-cyan)" }}>{k}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)" }}>
                  <b>Limitation:</b> Does not simulate vehicles, signals, or diversions.
                  Attendance multiplier is a heuristic estimate.
                </div>
              </div>
              <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}>Example: Palace Grounds Concert (Large)</div>
                {[
                  { corridor: "Bellary Road 1", base: 68, est: 115, band: "Critical" },
                  { corridor: "Ballary Road 2", base: 52, est: 88, band: "High" },
                  { corridor: "ORR North 1", base: 45, est: 76, band: "High" },
                ].map(c => (
                  <div key={c.corridor} style={{
                    padding: "14px", marginBottom: 10, borderRadius: 8,
                    background: `${BAND_COLOR[c.band]}10`, border: `1px solid ${BAND_COLOR[c.band]}40`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.corridor}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                          Base SERI: {c.base} × 1.7 (large)
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: BAND_COLOR[c.band] }}>{Math.min(100, c.est)}</div>
                        <span className={`risk-badge ${c.band}`}>{c.band}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  * Illustrative example — run live simulation in What-If page
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Learning Engine */}
        {step === 5 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              🧠 Adaptive Learning Engine
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Feedback-driven audit loop — not ML weight training
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Learning Loop Architecture</div>
              <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
                {["Forecast Score", "→", "Actual Event (held-out or user-marked)", "→", "Error = |forecast - actual| / forecast × 100", "→", "Store in DB", "→", "Surface corridor bias"].map((s, i) => (
                  <div key={i} style={{
                    padding: s === "→" ? "0 8px" : "12px 14px",
                    background: s === "→" ? "transparent" : "var(--bg-secondary)",
                    border: s === "→" ? "none" : "1px solid var(--border)",
                    borderRadius: 8, color: s === "→" ? "var(--accent-cyan)" : "var(--text-secondary)",
                    fontSize: s === "→" ? 20 : 11, margin: "4px 2px",
                  }}>{s}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { label: "Held-out MAE", value: "13.75%", sub: "Mean abs error on held-out weeks (8-9/2024)", color: "var(--accent-cyan)" },
                { label: "Covered Slots", value: forecast?.metadata?.validation_covered_slots || "113", sub: "Slots with actual incidents in holdout", color: "#10b981" },
                { label: "Feedback Type", value: "Manual", sub: "Analysts mark Accurate/Partial/Inaccurate", color: "#8b5cf6" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card" style={{ textAlign: "center", padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6 — MapMyIndia */}
        {step === 6 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              🗺️ MapMyIndia Live Context Layer
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Historical Intelligence + MapMyIndia Context = Operational Intelligence
            </div>
            <div className="grid-2">
              <div className="card">
                <div className="section-title" style={{ marginBottom: 14 }}>Integration Status</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px",
                  background: mmi?.valid ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1px solid ${mmi?.valid ? "#10b981" : "#f59e0b"}40`, borderRadius: 8, marginBottom: 16
                }}>
                  <span style={{ fontSize: 28 }}>{mmi?.valid ? "✅" : "âš™ï¸"}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: mmi?.valid ? "#10b981" : "var(--accent-yellow)" }}>
                      {mmi?.valid ? "MapMyIndia Connected" : "MapMyIndia Ready (Key Required)"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {mmi?.configured
                        ? "Tile layers active"
                        : "Set MMI_REST_KEY env var to activate"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                  <b>Current tile source:</b> {mmi?.configured ? "MapMyIndia (Mappls)" : "OpenStreetMap CARTO Dark"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Tile URL template:<br />
                  <code style={{ fontSize: 10, wordBreak: "break-all", color: "var(--accent-cyan)" }}>
                    {mmi?.tile_url || "—"}
                  </code>
                </div>
              </div>
              <div className="card">
                <div className="section-title" style={{ marginBottom: 14 }}>Documented APIs</div>
                {(mmi?.apis_documented || []).map((api: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12, padding: "10px", background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", marginBottom: 4 }}>{api.name}</div>
                    <div style={{ fontSize: 10, color: "var(--accent-cyan)", wordBreak: "break-all", marginBottom: 4 }}>{api.url}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Auth: {api.auth}</div>
                    {api.status && <div style={{ fontSize: 11, color: "var(--accent-yellow)", marginTop: 2 }}>{api.status}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7 — Methodology summary */}
        {step === 7 && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              📖 System Methodology Summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                {
                  title: "SERI Formula", color: "#3b82f6",
                  content: "0.4×Recurrence + 0.4×Frequency + 0.2×Severity → scale 0–100"
                },
                {
                  title: "Forecast Formula", color: "#8b5cf6",
                  content: "0.7×Recurrence + 0.3×Recent Trend (last 4 weeks)\nMAE: 13.75% on held-out weeks"
                },
                {
                  title: "KNN Similarity", color: "#06b6d4",
                  content: "BallTree · Euclidean · k=10\nFeatures: lat, lon, hour_IST, day, cause, corridor\nNormalised: StandardScaler"
                },
                {
                  title: "DBSCAN Hotspots", color: "#f59e0b",
                  content: "eps=0.008Â° (~890m) · min_samples=10\n14 clusters found in dataset"
                },
                {
                  title: "Shadow Events", color: "#10b981",
                  content: "666 total (corridor × day × IST time bucket)\n4 Critical · 11 High · 48 Medium · 603 Low"
                },
                {
                  title: "Honest Labeling", color: "#ef4444",
                  content: "All forecasts marked 'Historical Pattern-Based'\nNo real-time data · No vehicle simulation\nAssumptions fully documented"
                },
              ].map(({ title, color, content }) => (
                <div key={title} className="card" style={{ borderTop: `3px solid ${color}` }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-line", lineHeight: 1.6 }}>{content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <button className="btn-secondary"
            onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
            â† Previous
          </button>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Step {step} of {DEMO_STEPS.length}</div>
          <button className="btn-primary"
            onClick={() => setStep(s => Math.min(DEMO_STEPS.length, s + 1))} disabled={step === DEMO_STEPS.length}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

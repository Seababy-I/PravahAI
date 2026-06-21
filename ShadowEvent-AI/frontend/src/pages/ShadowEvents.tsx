import { useEffect, useState } from "react";
import { getShadowEvents, getCorridors } from "../api/endpoints";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Shield, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import OperationalPanel from "../components/OperationalPanel";
import { getOperationalGuidance } from "../utils/seriOperational";

const DARK_TOOLTIP = {
  contentStyle: { background: "#131c2e", border: "1px solid #1e2d47", borderRadius: 8, color: "#f1f5f9", fontSize: 12 },
};
const RISK_COLORS: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#10b981" };
const TIME_BUCKETS = ["early_morning", "morning", "afternoon", "evening", "night", "midnight"];

export default function ShadowEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [corridors, setCorridors] = useState<string[]>([]);
  const [corridor, setCorridor] = useState("");
  const [day, setDay] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [timeBucket, setTimeBucket] = useState("");
  const [namedOnly, setNamedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const LIMIT = 50;

  useEffect(() => { getCorridors().then(setCorridors); }, []);

  useEffect(() => {
    setLoading(true);
    getShadowEvents({ corridor, day, risk_level: riskLevel, time_bucket: timeBucket, named_only: namedOnly, limit: LIMIT, offset })
      .then(r => { setEvents(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [corridor, day, riskLevel, timeBucket, namedOnly, offset]);

  // Chart data: top corridors by incident count
  const chartData = [...events]
    .sort((a, b) => b.incident_count - a.incident_count)
    .slice(0, 15)
    .map(e => ({ name: e.corridor.slice(0, 16), count: e.incident_count, risk: e.risk_level }));

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Shadow Event Explorer
          </div>
          <div className="page-subtitle">Recurring traffic incident patterns discovered from historical data</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #9D5FF5, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>total patterns</div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <select className="filter-select" value={corridor} onChange={e => { setCorridor(e.target.value); setOffset(0); }}>
            <option value="">All Corridors</option>
            {corridors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={day} onChange={e => { setDay(e.target.value); setOffset(0); }}>
            <option value="">All Days</option>
            {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="filter-select" value={riskLevel} onChange={e => { setRiskLevel(e.target.value); setOffset(0); }}>
            <option value="">All Risk Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select className="filter-select" value={timeBucket} onChange={e => { setTimeBucket(e.target.value); setOffset(0); }}>
            <option value="">All Time Buckets</option>
            {TIME_BUCKETS.map(b => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={namedOnly} onChange={e => { setNamedOnly(e.target.checked); setOffset(0); }} />
            Named Corridors Only
          </label>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Top Shadow Event Corridors (by incident count)</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip {...DARK_TOOLTIP} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={RISK_COLORS[entry.risk] || "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Shadow Event Records</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 10, color: "rgba(165,180,252,0.7)", fontWeight: 600,
                padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.1)",
                letterSpacing: "0.04em",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Shield size={14} /> CLICK ROW FOR OPERATIONAL GUIDANCE</div>
              </span>
              <span className="section-count">{total.toLocaleString()} patterns</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                    <th>ID</th><th>Corridor</th><th>Day</th><th>Time Bucket</th>
                    <th>Incidents</th><th>SERI</th><th>Risk</th><th>Top Cause</th><th>Ops Readiness</th>
                  </tr>
                  </thead>
                  <tbody>
                    {events.map((e: any) => {
                      const guidance = getOperationalGuidance(e.seri, e.corridor);
                      const isSelected = selectedEvent?.shadow_event_id === e.shadow_event_id;
                      return (
                        <>
                          <tr key={e.shadow_event_id}
                            onClick={() => setSelectedEvent(isSelected ? null : e)}
                            style={{ cursor: "pointer", background: isSelected ? "rgba(99,102,241,0.08)" : undefined }}
                          >
                            <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{e.shadow_event_id}</td>
                            <td style={{ fontWeight: 600 }}>{e.corridor}</td>
                            <td>{e.day_name}</td>
                            <td style={{ textTransform: "capitalize" }}>{e.time_bucket?.replace(/_/g, " ")}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{e.incident_count}</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 60, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ width: `${e.seri}%`, height: "100%", background: RISK_COLORS[e.risk_level] || "#3b82f6", borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.seri?.toFixed(1)}</span>
                              </div>
                            </td>
                            <td><span className={`risk-badge ${e.risk_level}`}>{e.risk_level}</span></td>
                            <td><span className={`tag cause-${e.top_cause}`}>{e.top_cause?.replace(/_/g, " ")}</span></td>
                            <td>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                                background: `${guidance.readiness.color}18`,
                                color: guidance.readiness.color,
                                border: `1px solid ${guidance.readiness.color}35`,
                              }}>
                                {guidance.readiness.level}
                              </span>
                            </td>
                          </tr>
                          {isSelected && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0 }}>
                                <div style={{ padding: "0 12px 14px" }}>
                                  <OperationalPanel seri={e.seri} corridor={e.corridor} compact={false} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button className="page-btn" disabled={offset === 0} onClick={() => setOffset(0)}><ChevronsLeft size={16} /></button>
                <button className="page-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 100, textAlign: "center" }}>Page {currentPage} / {totalPages}</span>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + LIMIT)}><ChevronRight size={16} /></button>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setOffset((totalPages - 1) * LIMIT)}><ChevronsRight size={16} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

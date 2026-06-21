import { useEffect, useState, useCallback } from "react";
import { searchIncidents, getCorridors, getCauses, getZones } from "../api/endpoints";
import { Search, Folder, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_BUCKETS = ["early_morning", "morning", "afternoon", "evening", "night", "midnight"];

export default function Repository() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [cause, setCause] = useState("all");
  const [corridor, setCorridor] = useState("");
  const [zone, setZone] = useState("all");
  const [priority, setPriority] = useState("all");
  const [dayName, setDayName] = useState("");
  const [timeBucket, setTimeBucket] = useState("all");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const [corridors, setCorridors] = useState<string[]>([]);
  const [causes, setCauses] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getCorridors(), getCauses(), getZones()])
      .then(([c, ca, z]) => { setCorridors(c); setCauses(ca); setZones(z); });
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    searchIncidents({ q, event_cause: cause === "all" ? undefined : cause, corridor: corridor || undefined, zone: zone === "all" ? undefined : zone, priority: priority === "all" ? undefined : priority, day_name: dayName || undefined, time_bucket: timeBucket === "all" ? undefined : timeBucket, limit: LIMIT, offset })
      .then(r => { setData(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [q, cause, corridor, zone, priority, dayName, timeBucket, offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const resetFilters = () => {
    setQ(""); setCause("all"); setCorridor(""); setZone("all");
    setPriority("all"); setDayName(""); setTimeBucket("all");
    setOffset(0);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Knowledge Repository
          </div>
          <div className="page-subtitle">Search and filter the complete ASTRAM incident database</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #9D5FF5, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>matching records</div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Search size={18} /> Search & Filter</div>
          <div className="filter-bar">
            <input
              className="filter-input"
              placeholder="Search address, corridor, cause..."
              value={q}
              onChange={e => { setQ(e.target.value); setOffset(0); }}
            />
            <select className="filter-select" value={cause} onChange={e => { setCause(e.target.value); setOffset(0); }}>
              <option value="all">All Causes</option>
              {causes.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
            <select className="filter-select" value={corridor} onChange={e => { setCorridor(e.target.value); setOffset(0); }}>
              <option value="">All Corridors</option>
              {corridors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={zone} onChange={e => { setZone(e.target.value); setOffset(0); }}>
              <option value="all">All Zones</option>
              {zones.filter(z => z !== "Unknown").map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="filter-select" value={priority} onChange={e => { setPriority(e.target.value); setOffset(0); }}>
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Low">Low</option>
            </select>
            <select className="filter-select" value={dayName} onChange={e => { setDayName(e.target.value); setOffset(0); }}>
              <option value="">All Days</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="filter-select" value={timeBucket} onChange={e => { setTimeBucket(e.target.value); setOffset(0); }}>
              <option value="all">All Time Buckets</option>
              {TIME_BUCKETS.map(b => <option key={b} value={b}>{b.replace(/_/g, " ")}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={resetFilters}>Clear</button>
          </div>
        </div>

        {/* Results Table */}
        <div className="card">
          <div className="section-header">
            <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Folder size={18} /> Incident Records</div>
            <span className="section-count">Showing {Math.min(offset + 1, total)}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}</span>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No records found for the current filters.</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Cause</th><th>Corridor</th><th>Zone</th>
                      <th>Day</th><th>Time</th><th>Priority</th>
                      <th>Status</th><th>Vehicle</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((inc: any) => (
                      <tr key={inc.id}>
                        <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>{inc.id}</td>
                        <td><span className={`tag cause-${inc.event_cause}`}>{inc.event_cause?.replace(/_/g, " ")}</span></td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.corridor}</td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{inc.zone}</td>
                        <td style={{ fontSize: 12 }}>{inc.day_name?.slice(0, 3)}</td>
                        <td style={{ fontSize: 12 }}>{inc.time_bucket?.replace(/_/g, " ")}</td>
                        <td><span className={`risk-badge ${inc.priority === "High" ? "High" : "Low"}`}>{inc.priority}</span></td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: inc.status === "closed" ? "var(--text-muted)" : inc.status === "active" ? "var(--accent-yellow)" : "var(--accent-green)"
                          }}>
                            {inc.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{inc.veh_type?.replace(/_/g, " ")}</td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{inc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button className="page-btn" disabled={offset === 0} onClick={() => setOffset(0)}>Â«</button>
                <button className="page-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 100, textAlign: "center" }}>
                  Page {currentPage} / {totalPages}
                </span>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + LIMIT)}><ChevronRight size={16} /></button>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setOffset((totalPages - 1) * LIMIT)}>Â»</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

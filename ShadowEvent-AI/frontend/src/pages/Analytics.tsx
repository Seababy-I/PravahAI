import { useEffect, useState } from "react";
import { getStats } from "../api/endpoints";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const CAUSE_COLORS: Record<string, string> = {
  vehicle_breakdown: "#3b82f6",
  others: "#8b5cf6",
  pot_holes: "#f59e0b",
  construction: "#f97316",
  water_logging: "#06b6d4",
  accident: "#ef4444",
  tree_fall: "#10b981",
  congestion: "#ec4899",
  road_conditions: "#a3e635",
  public_event: "#fbbf24",
};

const DARK_TOOLTIP = {
  contentStyle: {
    background: "#131c2e", border: "1px solid #1e2d47",
    borderRadius: 8, color: "#f1f5f9", fontSize: 12,
  },
};

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats({ named_only: true })
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-wrapper">
      <div className="spinner" />
      <span style={{ color: "var(--text-secondary)" }}>Loading Analytics...</span>
    </div>
  );

  const causeData = stats
    ? Object.entries(stats.cause_distribution as Record<string, number>)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    : [];

  const hourData = stats
    ? Object.entries(stats.hour_distribution as Record<string, number>)
        .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    : [];

  const dayData = stats
    ? Object.entries(stats.day_distribution as Record<string, number>)
        .map(([day, count]) => ({ day: day.slice(0, 3), count }))
    : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Historical Analytics
          </div>
          <div className="page-subtitle">ASTRAM Dataset · Nov 2023 – Apr 2024 · Bengaluru</div>
        </div>
        <div className="ai-status-pill">
          <div className="ai-status-dot" />
          8,139 Incidents
        </div>
      </div>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {[
            { label: "Total Incidents", value: stats?.total_incidents?.toLocaleString(), color: "blue", icon: "⚡", sub: "Across all corridors" },
            { label: "Shadow Events", value: stats?.total_shadow_events?.toLocaleString(), color: "purple", icon: "👻", sub: "Recurring patterns found" },
            { label: "High Risk Events", value: stats?.high_risk_events, color: "red", icon: "🔴", sub: "Immediate attention needed" },
            { label: "Active Corridors", value: stats?.active_corridors, color: "green", icon: "🛣️", sub: "Monitored routes" },
            { label: "Top Cause", value: stats?.top_cause?.replace(/_/g, " "), color: "orange", icon: "⚠️", sub: "Most frequent incident" },
          ].map(({ label, value, color, icon, sub }) => (
            <div key={label} className={`kpi-card ${color}`}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value ?? "—"}</div>
              <div className="kpi-sub">{sub}</div>
              <div className="kpi-icon">{icon}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">Incidents by Cause</div>
            <div className="chart-wrap" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={causeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {causeData.map(({ name }) => (
                      <Cell key={name} fill={CAUSE_COLORS[name] || "#475569"} />
                    ))}
                  </Pie>
                  <Tooltip {...DARK_TOOLTIP} formatter={(v: any, n: any) => [v, n.replace(/_/g, " ")]} />
                  <Legend
                    formatter={(v) => v.replace(/_/g, " ")}
                    wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Incidents by Day of Week</div>
            <div className="chart-wrap" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} barSize={32}>
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...DARK_TOOLTIP} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hour Distribution */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Hourly Incident Distribution (0–23 hrs)</div>
          <div className="chart-wrap" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} barSize={16}>
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...DARK_TOOLTIP} />
                <Bar dataKey="count"
                  fill="url(#hourGrad)"
                  radius={[3, 3, 0, 0]}
                />
                <defs>
                  <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

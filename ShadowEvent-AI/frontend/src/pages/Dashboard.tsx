import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../api/client";
import OperationalIntelligenceMap from "./OperationalIntelligenceMap";
import pravahLogo from "../assets/pravah_logo.png";
import { ArrowDown, Settings, Target, Activity, Shield, ChevronRight } from "lucide-react";

// ─── Animated Hero Canvas ─────────────────────────────────────────────────────
// Traffic particles moving along a city grid — elegant & subtle

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    const GRID = 80;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      hue: number;
      trail: { x: number; y: number }[];
    }

    const snap = (v: number) => Math.round(v / GRID) * GRID;

    const mkParticle = (): Particle => {
      const ang = Math.floor(Math.random() * 4) * (Math.PI / 2);
      const spd = 0.5 + Math.random() * 0.7;
      return {
        x: snap(Math.random() * W),
        y: snap(Math.random() * H),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: Math.random() * 180,
        maxLife: 160 + Math.random() * 220,
        hue: 255 + Math.random() * 65, // purple → pink
        trail: [],
      };
    };

    const particles: Particle[] = Array.from({ length: 65 }, mkParticle);

    let animId: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // ── Grid lines (road network) ──
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(124,58,237,0.045)";
      for (let x = 0; x <= W; x += GRID) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += GRID) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── Intersection nodes ──
      for (let x = 0; x <= W; x += GRID) {
        for (let y = 0; y <= H; y += GRID) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(157,95,245,0.14)";
          ctx.fill();
        }
      }

      // ── Particles ──
      for (const p of particles) {
        p.life++;

        // Turn at intersections
        const sx = snap(p.x), sy = snap(p.y);
        if (Math.abs(p.x - sx) < 1.8 && Math.abs(p.y - sy) < 1.8 && Math.random() < 0.07) {
          const ang = Math.floor(Math.random() * 4) * (Math.PI / 2);
          const spd = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(ang) * spd;
          p.vy = Math.sin(ang) * spd;
          p.x = sx; p.y = sy;
        }

        p.x += p.vx; p.y += p.vy;

        // Wrap
        if (p.x < -GRID) p.x = W + GRID;
        if (p.x > W + GRID) p.x = -GRID;
        if (p.y < -GRID) p.y = H + GRID;
        if (p.y > H + GRID) p.y = -GRID;

        // Store trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();

        if (p.life >= p.maxLife) {
          Object.assign(p, mkParticle());
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI);

        // Trail
        p.trail.forEach((pt, i) => {
          const ta = (i / p.trail.length) * alpha * 0.35;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},75%,65%,${ta})`;
          ctx.fill();
        });

        // Head glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        grd.addColorStop(0, `hsla(${p.hue},80%,70%,${alpha * 0.22})`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Head dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,72%,${alpha * 0.85})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─── Risk colours & actions ───────────────────────────────────────────────────

const BAND_COLOR: Record<string, string> = {
  Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#22c55e",
};
const BAND_ACTION: Record<string, string> = {
  Critical: "Incident Response Readiness",
  High: "Active Traffic Management",
  Medium: "Enhanced Monitoring",
  Low: "Routine Monitoring",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const intelligenceRef = useRef<HTMLDivElement>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/forecast`, { params: { named_only: true, limit: 8 } }).then(r => r.data),
      axios.get(`${API_BASE}/stats`, { params: { named_only: true } }).then(r => r.data),
    ])
      .then(([f, st]) => { setForecast(f.data || []); setStats(st); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollDown = () => intelligenceRef.current?.scrollIntoView({ behavior: "smooth" });

  const top = forecast[0];
  const topBand = top?.forecast_band || "Low";

  return (
    <div className="landing-page">

      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════ */}
      <section className="hero-section">
        <HeroCanvas />
        <div className="hero-overlay" />

        <div className="hero-content fade-in">
          {/* Title Logo */}
          <img src={pravahLogo} alt="Urban Traffic Intelligence" className="hero-logo" />

          {/* Tagline */}
          <p className="hero-tagline">Urban Traffic Intelligence Platform</p>

          {/* Description */}
          <p className="hero-description">
            PravahAI discovers recurring traffic risks, forecasts disruptions,
            and recommends operational interventions before incidents occur.
          </p>

          {/* Live stats from backend */}
          <div className="hero-stats-row">
            <div className="hero-stat">
              <div className="hero-stat-value">8,139</div>
              <div className="hero-stat-label">Incidents Analysed</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">666</div>
              <div className="hero-stat-label">Shadow Events</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">23</div>
              <div className="hero-stat-label">Weeks of Data</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">0–100</div>
              <div className="hero-stat-label">SERI Scale</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={scrollDown}>
              Explore Intelligence
              <ArrowDown className="hero-btn-arrow" size={18} />
            </button>
            <button className="hero-btn-secondary" onClick={() => navigate("/methodology")}>
              View Methodology
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <button className="hero-scroll-hint" onClick={scrollDown} aria-label="Scroll down">
          <div className="hero-scroll-chevron" />
          <span>Scroll to explore</span>
        </button>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — LIVE INTELLIGENCE
      ═══════════════════════════════════════════ */}
      <section className="intel-section" ref={intelligenceRef}>
        <div className="section-header-block">
          <div className="section-eyebrow">Live Intelligence</div>
          <h2 className="section-heading">Bengaluru Intelligence Map</h2>
          <p className="section-subheading">
            Shadow events, SERI risk layers, hotspots, and forecast corridors — visualised from historical data
          </p>
        </div>

        <div className="intel-body">
          {/* Map 70% */}
          <div className="intel-map">
            <OperationalIntelligenceMap hideControls={true} />
          </div>

          {/* Panel 30% */}
          <div className="intel-panel">
            <div className="intel-panel-title">Upcoming High-Risk Corridors</div>
            <div className="intel-panel-sub">Historical pattern forecast · Not real-time</div>

            {loading ? (
              <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                {/* Top corridor highlight */}
                {top && (
                  <div className="intel-highlight" style={{ borderColor: `${BAND_COLOR[topBand]}50` }}>
                    <div className="intel-highlight-label">Highest Risk Corridor</div>
                    <div className="intel-highlight-name" style={{ color: BAND_COLOR[topBand] }}>
                      {top.corridor}
                    </div>
                    <div className="intel-highlight-meta">
                      {top.day_name} · {top.time_bucket?.replace(/_/g, " ")}
                    </div>
                    <div className="intel-highlight-action" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Settings size={14} /> {BAND_ACTION[topBand]}
                    </div>
                  </div>
                )}

                {/* Forecast rows */}
                <div className="intel-forecast-list">
                  {forecast.map((f: any, i: number) => (
                    <div key={i} className="intel-forecast-row" style={{
                      borderLeft: `3px solid ${BAND_COLOR[f.forecast_band] || "#475569"}40`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="intel-forecast-day">{f.day_name}</div>
                        <div className="intel-forecast-corridor">{f.corridor}</div>
                        <div className="intel-forecast-time">{f.time_bucket?.replace(/_/g, " ")}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span className={`risk-badge ${f.forecast_band}`}>{f.forecast_band}</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: BAND_COLOR[f.forecast_band], marginTop: 2 }}>
                          {(f.forecast_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real stats from backend */}
                {stats && (
                  <div className="intel-stats-row">
                    <div className="intel-stat">
                      <div className="intel-stat-val">{stats.active_corridors}</div>
                      <div className="intel-stat-label">Active Corridors</div>
                    </div>
                    <div className="intel-stat">
                      <div className="intel-stat-val" style={{ color: "#ef4444" }}>{stats.high_risk_events}</div>
                      <div className="intel-stat-label">High Risk</div>
                    </div>
                    <div className="intel-stat">
                      <div className="intel-stat-val">{stats.total_shadow_events}</div>
                      <div className="intel-stat-label">Patterns</div>
                    </div>
                  </div>
                )}

                <div className="intel-disclaimer">
                  Advisory guidance derived from historical SERI data.
                  Not real-time. Requires human approval.
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — HOW PRAVAHAI WORKS
      ═══════════════════════════════════════════ */}
      <section className="how-section">
        <div className="section-header-block">
          <div className="section-eyebrow">System Architecture</div>
          <h2 className="section-heading">How PravahAI Works</h2>
          <p className="section-subheading">
            A three-stage intelligence pipeline from raw data to operational guidance
          </p>
        </div>

        {/* Three pillars */}
        <div className="how-pillars">
          <div className="how-pillar" onClick={() => navigate("/shadow-events")} role="button" tabIndex={0}>
            <div className="pillar-icon-wrap" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#818cf8" }}>
              <Target size={32} />
            </div>
            <div className="pillar-stage" style={{ color: "#818cf8" }}>01 — Discover</div>
            <div className="pillar-name">Shadow Events</div>
            <div className="pillar-desc">
              Detect recurring traffic patterns hidden inside historical incident data.
              Each shadow event represents a (corridor, day, time) slot with
              documented recurrence across 23 weeks.
            </div>
            <div className="pillar-cta">Explore Shadow Events →</div>
          </div>

          <div className="how-arrow"><ChevronRight size={32} /></div>

          <div className="how-pillar" onClick={() => navigate("/forecast")} role="button" tabIndex={0}>
            <div className="pillar-icon-wrap" style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              <Activity size={32} />
            </div>
            <div className="pillar-stage" style={{ color: "#a78bfa" }}>02 — Predict</div>
            <div className="pillar-name">Forecast Engine</div>
            <div className="pillar-desc">
              Score future high-risk windows using SERI and historical recurrence patterns.
              The forecast formula is fully documented and reproducible — no black box.
            </div>
            <div className="pillar-cta">View Forecasts →</div>
          </div>

          <div className="how-arrow"><ChevronRight size={32} /></div>

          <div className="how-pillar" onClick={() => navigate("/what-if")} role="button" tabIndex={0}>
            <div className="pillar-icon-wrap" style={{ background: "rgba(236,72,153,0.08)", borderColor: "rgba(236,72,153,0.25)", color: "#f9a8d4" }}>
              <Shield size={32} />
            </div>
            <div className="pillar-stage" style={{ color: "#f9a8d4" }}>03 — Advise</div>
            <div className="pillar-name">Operational Intelligence</div>
            <div className="pillar-desc">
              Generate SERI-driven readiness levels, barricade advisories, and static
              diversion playbooks — grounded entirely in data, labelled advisory,
              requiring human approval before deployment.
            </div>
            <div className="pillar-cta">Run Simulator →</div>
          </div>
        </div>

        {/* Pipeline workflow strip */}
        <div className="pipeline-strip">
          <div className="pipeline-label">Data Pipeline</div>
          <div className="pipeline-steps">
            {[
              { name: "ASTRAM Dataset", sub: "8,139 incidents" },
              { name: "Shadow Events",  sub: "666 patterns" },
              { name: "SERI Score",     sub: "0–100 scale" },
              { name: "Forecast",       sub: "Pattern-based" },
              { name: "Advisory",       sub: "Human-approved" },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div className="pipeline-step">
                  <div className="pipeline-step-num">{i + 1}</div>
                  <div className="pipeline-step-name">{s.name}</div>
                  <div className="pipeline-step-sub">{s.sub}</div>
                </div>
                {i < arr.length - 1 && <div className="pipeline-chevron"><ChevronRight size={20} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <img src={pravahLogo} alt="PravahAI" className="footer-logo" />
            <div className="footer-tagline">Urban Traffic Intelligence Platform</div>
            <div className="footer-desc">
              Predictive traffic intelligence for smarter urban operations.
              Powered by historical SERI analysis and shadow event detection.
            </div>
            <div className="footer-disclaimer">
              All recommendations are advisory guidance derived from historical data.
              Not real-time. Requires human approval before deployment.
            </div>
          </div>

          {/* Tech stack */}
          <div className="footer-col">
            <div className="footer-col-title">Technology Stack</div>
            {[
              "ASTRAM Dataset",
              "Shadow Events",
              "SERI Algorithm",
              "Forecast Engine",
              "Similarity Engine",
              "Gemini Advisory Layer",
            ].map(t => (
              <div key={t} className="footer-tech-chip">{t}</div>
            ))}
          </div>

          {/* Quick links */}
          <div className="footer-col">
            <div className="footer-col-title">Quick Links</div>
            {[
              { label: "Analytics",         path: "/analytics" },
              { label: "Methodology",       path: "/methodology" },
              { label: "Learning Engine",   path: "/learning" },
              { label: "Risk Calendar",     path: "/calendar" },
              { label: "Scenario Simulator",path: "/what-if" },
              { label: "Shadow Events",     path: "/shadow-events" },
            ].map(({ label, path }) => (
              <button key={path} className="footer-nav-link" onClick={() => navigate(path)}>
                {label}
              </button>
            ))}
          </div>

          {/* Dataset info */}
          <div className="footer-col">
            <div className="footer-col-title">Dataset</div>
            <div className="footer-dataset-name">
              <span className="footer-dataset-dot" />
              ASTRAM Traffic Events
            </div>
            <div className="footer-dataset-meta">
              Nov 2023 – Apr 2024<br />
              Bengaluru, India<br />
              8,139 incidents · 23 weeks<br />
              46 raw columns → 20 used
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>PravahAI · Bengaluru Traffic Intelligence · ASTRAM 2023–2024</span>
          <span>Built for Flipkart Grid 6.0 Hackathon · Theme 2</span>
        </div>
      </footer>

    </div>
  );
}

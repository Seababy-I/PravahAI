import {
  BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import RiskCalendar from "./pages/RiskCalendar";
import ShadowEvents from "./pages/ShadowEvents";
import SimilarityExplorer from "./pages/SimilarityExplorer";
import Repository from "./pages/Repository";
import Forecast from "./pages/Forecast";
import WhatIf from "./pages/WhatIf";
import LearningEngine from "./pages/LearningEngine";
import Methodology from "./pages/Methodology";
import Demo from "./pages/Demo";
import OperationalIntelligenceMap from "./pages/OperationalIntelligenceMap";
import pravahLogo from "./assets/pravah_logo.png";
import "./index.css";

const NAV_ITEMS = [
  { path: "/dashboard",    label: "Overview"      },
  { path: "/shadow-events",label: "Shadow Events" },
  { path: "/forecast",     label: "Forecast"      },
  { path: "/similarity",   label: "Similarity"    },
  { path: "/op-intel",     label: "Impact Map"    },
  { path: "/calendar",     label: "Risk Calendar" },
  { path: "/what-if",      label: "Simulator"     },
  { path: "/learning",     label: "Learning"      },
  { path: "/analytics",    label: "Analytics"     },
  { path: "/methodology",  label: "Methodology"   },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {time.toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })} IST
    </span>
  );
}

function TopNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`top-navbar${scrolled ? " scrolled" : ""}`}>
      {/* Brand */}
      <div
        className="navbar-brand"
        onClick={() => navigate("/dashboard")}
        title="PravahAI — Go to Overview"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && navigate("/dashboard")}
      >
        <img src={pravahLogo} alt="PravahAI" className="navbar-logo-img" />
      </div>

      {/* Links */}
      <div className="navbar-links">
        {NAV_ITEMS.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right: clock + theme toggle */}
      <div className="navbar-right">
        <div className="navbar-clock">
          <span className="navbar-clock-dot" />
          <LiveClock />
        </div>
        <button
          className="navbar-theme-btn"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          ◐
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "PravahAI — Bengaluru Traffic Intelligence";
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <TopNav />
        <main className="main-content">
          <Routes>
            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/analytics"     element={<Analytics />} />
            <Route path="/shadow-events" element={<ShadowEvents />} />
            <Route path="/calendar"      element={<RiskCalendar />} />
            <Route path="/map"           element={<OperationalIntelligenceMap />} />
            <Route path="/similarity"    element={<SimilarityExplorer />} />
            <Route path="/repository"    element={<Repository />} />
            <Route path="/forecast"      element={<Forecast />} />
            <Route path="/what-if"       element={<WhatIf />} />
            <Route path="/learning"      element={<LearningEngine />} />
            <Route path="/methodology"   element={<Methodology />} />
            <Route path="/demo"          element={<Demo />} />
            <Route path="/op-intel"      element={<OperationalIntelligenceMap />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from './firebase.js';
import { useFirestoreIncidents } from './hooks/useFirestoreIncidents.js';
import { ROUTES } from './data/routes.js';
import {
  computeRiskScore,
  getActionableAlert,
  getExtraDelay,
  getRiskLabel,
} from './logic/scorer.js';
import AlertCard from './components/AlertCard';
import CountdownBar from './components/CountdownBar';
import DotField from './components/DotField';
import RiskGauge from './components/RiskGauge';
import RouteMap from './components/RouteMap';
import RouteSelector from './components/RouteSelector';

const SEVERITY_CHIP = {
  green: 'bg-green-900/40 text-green-400',
  amber: 'bg-amber-900/40 text-amber-400',
  red:   'bg-red-900/40 text-red-400',
};

const SEVERITY_DOT = {
  green: 'bg-[#639922]',
  amber: 'bg-[#BA7517]',
  red:   'bg-[#E24B4A]',
};

const SEVERITY_BORDER = {
  green: 'border-[#639922]/40',
  amber: 'border-[#BA7517]/40',
  red:   'border-[#E24B4A]/40',
};

function formatTime(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [selectedId, setSelectedId]   = useState(ROUTES[0].id);
  const handleSelectRoute = useCallback((id) => {
    setSelectedId(id);
    const route = ROUTES.find((r) => r.id === id);
    track('select_route', { route_id: id, route_name: route?.name ?? id });
  }, []);
  const [routeData,  setRouteData]    = useState(() =>
    ROUTES.map((r) => ({
      ...r,
      segments:  r.segments.map((s) => ({ ...s })),
      incidents: r.incidents.map((i) => ({ ...i })),
    }))
  );
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [demoMode,    setDemoMode]    = useState(false);
  const tickRef = useRef(null);

  // ── Firebase: merge live Firestore incidents over static data ───────────────
  const { incidentMap } = useFirestoreIncidents();
  useEffect(() => {
    if (!incidentMap || Object.keys(incidentMap).length === 0) return;
    setRouteData((prev) =>
      prev.map((r) =>
        incidentMap[r.id]
          ? { ...r, incidents: incidentMap[r.id] }
          : r
      )
    );
  }, [incidentMap]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentRoute     = routeData.find((r) => r.id === selectedId);
  const score            = computeRiskScore(currentRoute);
  const { label, severity } = getRiskLabel(score);
  const alert            = getActionableAlert(currentRoute, score);
  const delay            = getExtraDelay(currentRoute);
  const countdownMinutes = Math.round((100 - score) * 0.6);
  const departBy         = new Date(Date.now() + countdownMinutes * 60 * 1000);
  const countdownHint    = `Leave before ${formatTime(departBy)} to avoid peak risk`;

  // Other routes for comparison strip
  const otherRoutes = routeData.filter((r) => r.id !== selectedId);

  // Severity map for the live map (all routes need a color)
  const severityMap = Object.fromEntries(
    routeData.map((r) => [r.id, getRiskLabel(computeRiskScore(r)).severity])
  );

  // ── Simulation ───────────────────────────────────────────────────────────────
  const simulateTick = useCallback(() => {
    setRouteData((prev) =>
      prev.map((route) => {
        if (route.id !== selectedId) return route;
        const range = demoMode ? 40 : 20;   // demo: ±20 swing; normal: -8 to +12
        const base  = demoMode ? -20 : -8;
        const nudge = Math.random() * range + base;
        return {
          ...route,
          congestion_index: Math.min(100, Math.max(0, route.congestion_index + nudge)),
          incidents: route.incidents.map((inc) => ({
            ...inc,
            reported_minutes_ago: inc.reported_minutes_ago + 3,
          })),
        };
      })
    );
    setLastUpdated('Just now');
  }, [selectedId, demoMode]);

  // Auto-tick: 4 s in demo mode, 30 s normally
  useEffect(() => {
    const interval = demoMode ? 4_000 : 30_000;
    tickRef.current = setInterval(simulateTick, interval);
    return () => clearInterval(tickRef.current);
  }, [simulateTick, demoMode]);

  // Reset lastUpdated label after 5 s
  useEffect(() => {
    if (lastUpdated !== 'Just now') return;
    const id = setTimeout(
      () => setLastUpdated(`Updated at ${formatTime(new Date())}`),
      5_000
    );
    return () => clearTimeout(id);
  }, [lastUpdated]);

  // ── "How does scoring work?" ─────────────────────────────────────────────────
  function handleScoringInfo() {
    const msg =
      'CommutePulse risk score = (congestion × 0.40) + (incident recency/severity × 0.35) + (time-of-day multiplier × 25), clamped to 0–100.';
    if (typeof window !== 'undefined' && window.sendPrompt) {
      window.sendPrompt(msg);
    } else {
      console.info('[CommutePulse scoring]', msg);
    }
  }

  // ── Layout ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ position: 'relative' }}>
      {/* Skip to main content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Animated dot field background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DotField
          dotRadius={1.5}
          dotSpacing={22}
          bulgeStrength={60}
          glowRadius={180}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(99, 153, 34, 0.2)"
          gradientTo="rgba(226, 75, 74, 0.12)"
          glowColor="#030712"
        />
      </div>
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-6 space-y-5" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">CommutePulse</h1>
            <p className="text-xs text-gray-500 mt-0.5">{lastUpdated}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Demo mode toggle */}
            <button
              onClick={() => setDemoMode((d) => !d)}
              aria-pressed={demoMode}
              aria-label={demoMode ? 'Demo mode on — disable fast simulation' : 'Enable demo mode for fast simulation'}
              className={[
                'px-3 py-1 text-xs font-semibold rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
                demoMode
                  ? 'bg-orange-500/20 border-orange-500/60 text-orange-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500',
              ].join(' ')}
            >
              {demoMode ? '⚡ Demo ON' : 'Demo mode'}
            </button>
            {/* Live dot */}
            <div className="flex items-center gap-1.5" aria-label="Data is live" role="status">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-400">Live</span>
            </div>
          </div>
        </header>

        {/* Route selector */}
        <RouteSelector
          routes={routeData}
          selectedId={selectedId}
          onSelect={handleSelectRoute}
        />

        {/* Live map */}
        <RouteMap
          routes={routeData}
          selectedId={selectedId}
          severityMap={severityMap}
          onSelect={handleSelectRoute}
        />

        {/* Gauge + metrics row */}
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <RiskGauge score={Math.round(score)} severity={severity} />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div>
              <span
                className={`text-xs font-semibold uppercase tracking-widest ${
                  severity === 'green'
                    ? 'text-green-400'
                    : severity === 'amber'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {label}
              </span>
              <h2 className="text-lg font-semibold text-white leading-tight truncate">
                {currentRoute.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEVERITY_CHIP[severity]}`}>
                Congestion {Math.round(currentRoute.congestion_index)}%
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEVERITY_CHIP[severity]}`}>
                {currentRoute.incidents.length} incident{currentRoute.incidents.length !== 1 ? 's' : ''}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEVERITY_CHIP[severity]}`}>
                +{delay} min delay
              </span>
            </div>
          </div>
        </div>

        {/* Alert card */}
        <AlertCard key={`${selectedId}-${score}`} alert={alert} severity={severity} />

        {/* Countdown bar */}
        <CountdownBar
          key={`${selectedId}-${countdownMinutes}`}
          minutes={countdownMinutes}
          severity={severity}
          hint={countdownHint}
        />

        {/* ── Other routes comparison strip ── */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Other routes</p>
          <div className="grid grid-cols-2 gap-3">
            {otherRoutes.map((route) => {
              const s   = computeRiskScore(route);
              const { label: lbl, severity: sev } = getRiskLabel(s);
              const d   = getExtraDelay(route);
              return (
                <button
                  key={route.id}
                  onClick={() => handleSelectRoute(route.id)}
                  className={[
                    'text-left p-3 rounded-lg bg-gray-900 border transition-colors hover:bg-gray-800',
                    SEVERITY_BORDER[sev],
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[sev]}`} />
                    <span className="text-xs text-gray-400 truncate">{lbl}</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight truncate">{route.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xl font-bold text-white">{s}</span>
                    <span className="text-xs text-gray-500">+{d} min</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={simulateTick}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Simulate update
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentRoute.gmaps_origin)}&destination=${encodeURIComponent(currentRoute.gmaps_destination)}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4C15.163 4 8 11.163 8 20c0 11.836 14.337 23.197 15.01 23.73a1.5 1.5 0 001.98 0C25.663 43.197 40 31.836 40 20c0-8.837-7.163-16-16-16z" fill="#EA4335"/>
              <circle cx="24" cy="20" r="6" fill="white"/>
            </svg>
            Open in Google Maps
          </a>
          <button
            onClick={handleScoringInfo}
            className="px-4 py-2 text-sm font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded-lg transition-colors"
          >
            How does scoring work?
          </button>
        </div>

      </main>

      {/* Screen-reader announcement for score changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`${currentRoute.name}: ${label}, risk score ${Math.round(score)} out of 100`}
      </div>
    </div>
  );
}

import { ROUTES } from '../data/routes.js';

/**
 * Returns the risk multiplier from the route's time_risk_table for the given hour.
 * Keys are "start-end" strings; the "21-7" band wraps past midnight.
 */
export function getTimeRiskMultiplier(route, hourOverride) {
  const hour = hourOverride !== undefined ? hourOverride : new Date().getHours();
  for (const [range, multiplier] of Object.entries(route.time_risk_table)) {
    const [start, end] = range.split('-').map(Number);
    const inRange =
      start < end
        ? hour >= start && hour < end
        : hour >= start || hour < end; // wraps past midnight
    if (inRange) return multiplier;
  }
  return 1.0; // fallback — should never be reached with well-formed data
}

/**
 * Scores the incidents array 0–100.
 * Formula per incident: severity * max(0, (60 - reported_minutes_ago) / 60) * 33
 * Incidents ≥ 60 min old contribute 0. Clamped to 100.
 */
export function scoreIncidents(incidents) {
  const raw = incidents.reduce((sum, incident) => {
    const recency = Math.max(0, (60 - incident.reported_minutes_ago) / 60);
    return sum + incident.severity * recency * 33;
  }, 0);
  return Math.min(100, raw);
}

/**
 * Combines all risk signals into a single integer score 0–100.
 *   Congestion component : route.congestion_index * 0.40
 *   Incident component   : scoreIncidents(incidents) * 0.35
 *   Time component       : getTimeRiskMultiplier(route, hour) * 25
 */
export function computeRiskScore(route, hourOverride) {
  const congestion = route.congestion_index * 0.40;
  const incident = scoreIncidents(route.incidents) * 0.35;
  const time = getTimeRiskMultiplier(route, hourOverride) * 25;
  return Math.min(100, Math.max(0, Math.round(congestion + incident + time)));
}

/**
 * Maps a numeric score to a human-readable label and severity colour token.
 *   0–40  → "Low risk"    / "green"
 *   41–65 → "Medium risk" / "amber"
 *   66–100→ "High risk"   / "red"
 */
export function getRiskLabel(score) {
  if (score <= 40) return { label: 'Low risk', severity: 'green' };
  if (score <= 65) return { label: 'Medium risk', severity: 'amber' };
  return { label: 'High risk', severity: 'red' };
}

/**
 * Produces a one-sentence actionable alert for the given route and score.
 * Returns { title, body }.
 */
export function getActionableAlert(route, score) {
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  if (score > 65) {
    // Surface the worst (highest severity, then most recent) active incident.
    const worst = [...route.incidents].sort(
      (a, b) => b.severity - a.severity || a.reported_minutes_ago - b.reported_minutes_ago
    )[0];
    const typePhrase =
      worst.type === 'accident'
        ? 'An accident'
        : worst.type === 'waterlogging'
        ? 'Waterlogging'
        : 'A breakdown';
    return {
      title: `High risk on ${route.name}`,
      body: `${typePhrase} reported at ${worst.location} ${worst.reported_minutes_ago} min ago (severity ${worst.severity}/3). Consider an alternate route.`,
    };
  }

  if (score > 40) {
    // Describe the most impactful incident still within the 60-min window.
    const active = [...route.incidents]
      .filter((i) => i.reported_minutes_ago < 60)
      .sort((a, b) => b.severity - a.severity || a.reported_minutes_ago - b.reported_minutes_ago);

    if (active.length > 0) {
      const inc = active[0];
      return {
        title: `Moderate delays on ${route.name}`,
        body: `${capitalize(inc.type)} at ${inc.location} is causing slowdowns. Expect some delays but no need to reroute.`,
      };
    }
    return {
      title: `Moderate congestion on ${route.name}`,
      body: `Traffic is heavier than usual. Allow extra travel time before departing.`,
    };
  }

  return {
    title: `${route.name} is clear`,
    body: `No significant incidents. Traffic is moving well — good time to commute.`,
  };
}

/**
 * Estimates extra delay in minutes due to congestion.
 * extra = (congestion_index / 100) * averageSegmentTravelTime * 0.6
 * where averageSegmentTravelTime is the mean of (length_km / base_speed_kmh * 60) per segment.
 */
export function getExtraDelay(route) {
  const segmentTimes = route.segments.map((seg) => (seg.length_km / seg.base_speed_kmh) * 60);
  const avgTime = segmentTimes.reduce((a, b) => a + b, 0) / segmentTimes.length;
  return Math.round((route.congestion_index / 100) * avgTime * 0.6);
}

// ---------------------------------------------------------------------------
// DEV-only smoke tests — run `npm run dev` and check the browser console.
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
  const TEST_HOURS = [8, 13, 18, 23]; // morning peak, midday, evening peak, night

  console.groupCollapsed('%c[scorer] smoke tests', 'color:#6366f1;font-weight:bold');

  ROUTES.forEach((route) => {
    console.group(`Route: ${route.name}`);

    // getTimeRiskMultiplier
    console.group('getTimeRiskMultiplier');
    TEST_HOURS.forEach((h) => {
      console.log(`  hour ${String(h).padStart(2, '0')}:00 →`, getTimeRiskMultiplier(route, h));
    });
    console.groupEnd();

    // scoreIncidents
    const incidentScore = scoreIncidents(route.incidents);
    console.log('scoreIncidents →', incidentScore.toFixed(2));

    // computeRiskScore (at each test hour)
    console.group('computeRiskScore');
    TEST_HOURS.forEach((h) => {
      const score = computeRiskScore(route, h);
      const { label, severity } = getRiskLabel(score);
      console.log(`  hour ${String(h).padStart(2, '0')}:00 → score ${score}  [${label} / ${severity}]`);
    });
    console.groupEnd();

    // getRiskLabel boundary check
    console.group('getRiskLabel boundaries');
    [0, 40, 41, 65, 66, 100].forEach((s) => {
      const { label, severity } = getRiskLabel(s);
      console.log(`  score ${String(s).padStart(3)} → ${label} / ${severity}`);
    });
    console.groupEnd();

    // getActionableAlert at morning-peak score
    const morningScore = computeRiskScore(route, 8);
    const alert = getActionableAlert(route, morningScore);
    console.group(`getActionableAlert (score ${morningScore} @ 08:00)`);
    console.log('  title:', alert.title);
    console.log('  body: ', alert.body);
    console.groupEnd();

    // getExtraDelay
    console.log('getExtraDelay →', getExtraDelay(route), 'min');

    console.groupEnd(); // route
  });

  console.groupEnd(); // scorer smoke tests
}

import { describe, it, expect } from 'vitest';
import {
  getTimeRiskMultiplier,
  scoreIncidents,
  computeRiskScore,
  getRiskLabel,
  getActionableAlert,
  getExtraDelay,
} from './scorer.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

const ROUTE_STUB = {
  name: 'Test Route',
  congestion_index: 50,
  time_risk_table: {
    '7-10':  1.5,
    '10-16': 0.85,
    '16-21': 1.4,
    '21-7':  0.65,
  },
  incidents: [],
  segments: [
    { length_km: 10, base_speed_kmh: 50 },
    { length_km: 5,  base_speed_kmh: 25 },
  ],
};

// ── getTimeRiskMultiplier ────────────────────────────────────────────────────

describe('getTimeRiskMultiplier', () => {
  it('returns morning peak multiplier at 08:00', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 8)).toBe(1.5);
  });

  it('returns midday multiplier at 13:00', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 13)).toBe(0.85);
  });

  it('returns evening peak multiplier at 18:00', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 18)).toBe(1.4);
  });

  it('returns night multiplier at 23:00', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 23)).toBe(0.65);
  });

  it('handles midnight wrap (00:00) in the 21-7 band', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 0)).toBe(0.65);
  });

  it('returns boundary hour 7 in morning band', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 7)).toBe(1.5);
  });

  it('returns boundary hour 10 in midday band', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 10)).toBe(0.85);
  });

  it('returns boundary hour 21 in night band', () => {
    expect(getTimeRiskMultiplier(ROUTE_STUB, 21)).toBe(0.65);
  });
});

// ── scoreIncidents ───────────────────────────────────────────────────────────

describe('scoreIncidents', () => {
  it('returns 0 with no incidents', () => {
    expect(scoreIncidents([])).toBe(0);
  });

  it('returns 0 for an incident older than 60 minutes', () => {
    expect(scoreIncidents([{ severity: 3, reported_minutes_ago: 60 }])).toBe(0);
    expect(scoreIncidents([{ severity: 3, reported_minutes_ago: 120 }])).toBe(0);
  });

  it('scores a fresh severity-3 incident near max', () => {
    const score = scoreIncidents([{ severity: 3, reported_minutes_ago: 0 }]);
    expect(score).toBeCloseTo(99, 0);
  });

  it('scores a severity-1 incident reported 30 min ago', () => {
    const score = scoreIncidents([{ severity: 1, reported_minutes_ago: 30 }]);
    expect(score).toBeCloseTo(16.5, 1);
  });

  it('clamps total score to 100 with multiple incidents', () => {
    const incidents = [
      { severity: 3, reported_minutes_ago: 0 },
      { severity: 3, reported_minutes_ago: 0 },
      { severity: 3, reported_minutes_ago: 0 },
    ];
    expect(scoreIncidents(incidents)).toBe(100);
  });

  it('accumulates multiple incidents correctly', () => {
    const incidents = [
      { severity: 1, reported_minutes_ago: 0 },
      { severity: 1, reported_minutes_ago: 0 },
    ];
    expect(scoreIncidents(incidents)).toBeCloseTo(66, 0);
  });
});

// ── computeRiskScore ─────────────────────────────────────────────────────────

describe('computeRiskScore', () => {
  it('returns an integer between 0 and 100', () => {
    const score = computeRiskScore(ROUTE_STUB, 8);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('higher congestion produces higher score', () => {
    const low  = computeRiskScore({ ...ROUTE_STUB, congestion_index: 10 }, 13);
    const high = computeRiskScore({ ...ROUTE_STUB, congestion_index: 90 }, 13);
    expect(high).toBeGreaterThan(low);
  });

  it('peak hour produces higher score than off-peak at same congestion', () => {
    const peak    = computeRiskScore(ROUTE_STUB, 8);
    const offPeak = computeRiskScore(ROUTE_STUB, 13);
    expect(peak).toBeGreaterThan(offPeak);
  });

  it('clamps to 100 with extreme inputs', () => {
    const extreme = {
      ...ROUTE_STUB,
      congestion_index: 100,
      incidents: [
        { severity: 3, reported_minutes_ago: 0 },
        { severity: 3, reported_minutes_ago: 0 },
      ],
    };
    expect(computeRiskScore(extreme, 8)).toBe(100);
  });

  it('never goes below 0', () => {
    const empty = { ...ROUTE_STUB, congestion_index: 0, incidents: [] };
    expect(computeRiskScore(empty, 23)).toBeGreaterThanOrEqual(0);
  });
});

// ── getRiskLabel ─────────────────────────────────────────────────────────────

describe('getRiskLabel', () => {
  it('score 0 → green / Low risk', () => {
    expect(getRiskLabel(0)).toEqual({ label: 'Low risk', severity: 'green' });
  });

  it('score 40 → green / Low risk (boundary)', () => {
    expect(getRiskLabel(40)).toEqual({ label: 'Low risk', severity: 'green' });
  });

  it('score 41 → amber / Medium risk (boundary)', () => {
    expect(getRiskLabel(41)).toEqual({ label: 'Medium risk', severity: 'amber' });
  });

  it('score 65 → amber / Medium risk (boundary)', () => {
    expect(getRiskLabel(65)).toEqual({ label: 'Medium risk', severity: 'amber' });
  });

  it('score 66 → red / High risk (boundary)', () => {
    expect(getRiskLabel(66)).toEqual({ label: 'High risk', severity: 'red' });
  });

  it('score 100 → red / High risk', () => {
    expect(getRiskLabel(100)).toEqual({ label: 'High risk', severity: 'red' });
  });
});

// ── getActionableAlert ───────────────────────────────────────────────────────

describe('getActionableAlert', () => {
  const activeIncident = {
    type: 'accident',
    location: 'Test Junction',
    reported_minutes_ago: 5,
    severity: 3,
  };

  it('returns a clear alert for low-risk route', () => {
    const route = { ...ROUTE_STUB, name: 'A → B', incidents: [] };
    const alert = getActionableAlert(route, 20);
    expect(alert.title).toContain('clear');
    expect(alert.body).toBeTruthy();
  });

  it('returns a moderate alert for mid-risk route with active incident', () => {
    const route = { ...ROUTE_STUB, name: 'A → B', incidents: [activeIncident] };
    const alert = getActionableAlert(route, 55);
    expect(alert.title).toContain('Moderate');
  });

  it('returns a high-risk alert for score > 65', () => {
    const route = { ...ROUTE_STUB, name: 'A → B', incidents: [activeIncident] };
    const alert = getActionableAlert(route, 80);
    expect(alert.title).toContain('High risk');
    expect(alert.body).toContain('accident');
  });

  it('surfaces the worst incident in high-risk alert', () => {
    const route = {
      ...ROUTE_STUB,
      name: 'A → B',
      incidents: [
        { type: 'waterlogging', location: 'Loc A', reported_minutes_ago: 5, severity: 1 },
        { type: 'accident',     location: 'Loc B', reported_minutes_ago: 2, severity: 3 },
      ],
    };
    const alert = getActionableAlert(route, 80);
    expect(alert.body).toContain('Loc B');
  });

  it('handles moderate congestion with no active incidents', () => {
    const route = {
      ...ROUTE_STUB,
      name: 'A → B',
      incidents: [{ type: 'accident', location: 'Old spot', reported_minutes_ago: 90, severity: 1 }],
    };
    const alert = getActionableAlert(route, 55);
    expect(alert.title).toContain('Moderate');
    expect(alert.body).toContain('heavier than usual');
  });
});

// ── getExtraDelay ────────────────────────────────────────────────────────────

describe('getExtraDelay', () => {
  it('returns 0 delay at 0% congestion', () => {
    expect(getExtraDelay({ ...ROUTE_STUB, congestion_index: 0 })).toBe(0);
  });

  it('returns a positive delay at 100% congestion', () => {
    expect(getExtraDelay({ ...ROUTE_STUB, congestion_index: 100 })).toBeGreaterThan(0);
  });

  it('returns an integer', () => {
    const delay = getExtraDelay(ROUTE_STUB);
    expect(Number.isInteger(delay)).toBe(true);
  });

  it('higher congestion yields higher delay', () => {
    const low  = getExtraDelay({ ...ROUTE_STUB, congestion_index: 20 });
    const high = getExtraDelay({ ...ROUTE_STUB, congestion_index: 80 });
    expect(high).toBeGreaterThan(low);
  });
});

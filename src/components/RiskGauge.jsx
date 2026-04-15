import { useEffect, useRef } from 'react';

const STROKE_COLORS = {
  green: '#639922',
  amber: '#BA7517',
  red:   '#E24B4A',
};

const PULSE_DURATIONS = {
  green: '3s',
  amber: '2s',
  red:   '1.4s',
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION = 600; // ms

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function RiskGauge({ score, severity }) {
  const targetScore = Math.min(100, Math.max(0, score));
  const strokeColor   = STROKE_COLORS[severity] ?? STROKE_COLORS.green;
  const pulseDuration = PULSE_DURATIONS[severity] ?? '3s';

  // DOM refs — we mutate these directly to avoid re-renders during animation
  const ringRef  = useRef(null);
  const textRef  = useRef(null);
  const rafRef   = useRef(null);
  const fromRef  = useRef(targetScore); // tracks where the last animation ended

  useEffect(() => {
    const from  = fromRef.current;
    const to    = targetScore;
    if (from === to) return;

    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const t       = Math.min(1, elapsed / DURATION);
      const eased   = easeInOut(t);
      const current = from + (to - from) * eased;

      // Update ring fill
      if (ringRef.current) {
        const filled = (current / 100) * CIRCUMFERENCE;
        ringRef.current.setAttribute(
          'stroke-dasharray',
          `${filled} ${CIRCUMFERENCE}`
        );
      }

      // Update center number
      if (textRef.current) {
        textRef.current.textContent = Math.round(current);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [targetScore]);

  // Seed initial render without animation
  const initialFilled = (targetScore / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <style>{`
        @keyframes gauge-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        .gauge-ring {
          animation: gauge-pulse var(--pulse-dur) ease-in-out infinite;
        }
      `}</style>

      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ '--pulse-dur': pulseDuration }}
      >
        {/* Track */}
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="#1f2937"
          strokeWidth="10"
        />
        {/* Filled ring — mutated directly via ref */}
        <circle
          ref={ringRef}
          className="gauge-ring"
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${initialFilled} ${CIRCUMFERENCE}`}
          transform="rotate(-90 70 70)"
        />
        {/* Score label — mutated directly via ref */}
        <text
          ref={textRef}
          x="70"
          y="70"
          dominantBaseline="central"
          textAnchor="middle"
          fill="white"
          fontSize="28"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {targetScore}
        </text>
      </svg>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

const BAR_COLORS = {
  green: 'bg-[#639922]',
  amber: 'bg-[#BA7517]',
  red:   'bg-[#E24B4A]',
};

export default function CountdownBar({ minutes, severity, hint }) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(totalSeconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [totalSeconds]);

  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const barColor = BAR_COLORS[severity] ?? BAR_COLORS.green;
  const expired = remaining === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Extra delay</span>
        {expired ? (
          <span className="text-red-400 font-semibold">Route is now critical</span>
        ) : (
          <span className="text-white font-mono">
            {mins} min {String(secs).padStart(2, '0')} sec
          </span>
        )}
      </div>

      <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

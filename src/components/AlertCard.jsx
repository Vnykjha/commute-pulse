import { useEffect, useState } from 'react';

const BORDER_COLORS = {
  green: 'border-l-[#639922]',
  amber: 'border-l-[#BA7517]',
  red:   'border-l-[#E24B4A]',
};

export default function AlertCard({ alert, severity }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(id);
  }, []);

  const borderColor = BORDER_COLORS[severity] ?? BORDER_COLORS.green;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        'border-l-4 bg-gray-800 rounded-r-lg px-4 py-3 transition-all duration-300',
        borderColor,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      ].join(' ')}
    >
      <p className="text-sm font-semibold text-white">{alert.title}</p>
      <p className="text-sm text-gray-300 mt-0.5">{alert.body}</p>
    </div>
  );
}

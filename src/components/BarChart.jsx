export default function BarChart({ data, width = 560, height = 190, color = '#1B2430' }) {
  if (!data.length || data.every((v) => v === 0)) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="chart-empty">
          Ma'lumot yo'q
        </text>
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const pad = 26;
  const gap = 8;
  const slot = (width - 2 * pad) / data.length;
  const barW = Math.max(slot - gap, 3);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = (v / max) * (height - 2 * pad - 10);
        const x = pad + i * slot + gap / 2;
        const y = height - pad - bh;
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={barW.toFixed(1)}
            height={Math.max(bh, 1).toFixed(1)}
            rx="3"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

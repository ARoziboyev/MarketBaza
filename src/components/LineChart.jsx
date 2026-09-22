export default function LineChart({ data, width = 560, height = 190, color = '#C68A2E' }) {
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
  const stepX = (width - 2 * pad) / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (v / max) * (height - 2 * pad);
    return [x, y];
  });
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaD =
    pathD +
    ` L${pts[pts.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)} L${pts[0][0].toFixed(1)},${(height - pad).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
      {[0, 1, 2, 3].map((i) => {
        const y = pad + ((height - 2 * pad) * i) / 3;
        return <line key={i} x1={pad} y1={y.toFixed(1)} x2={width - pad} y2={y.toFixed(1)} className="chart-grid" />;
      })}
      <path d={areaD} fill={color} opacity="0.13" stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="3" fill={color} />
      ))}
    </svg>
  );
}

export function fmt(n) {
  n = Math.round(n || 0);
  const neg = n < 0;
  n = Math.abs(n);
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + s + " so'm";
}

export function fmtDate(iso, withTime) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  let s = `${dd}.${mm}.${yy}`;
  if (withTime) {
    s += ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  return s;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
export function profitOfSale(sale) {
  return (sale.items || []).reduce((s, it) => s + ((it.price || 0) - (it.cost || 0)) * (it.qty || 0), 0);
}
export function qtyOfSale(sale) {
  return (sale.items || []).reduce((s, it) => s + (it.qty || 0), 0);
}
export function salesFrom(sales, fromDate) {
  return sales.filter((s) => new Date(s.created_at) >= fromDate);
}
export function periodProfit(sales, days) {
  const from = startOfDay(daysAgoDate(days - 1));
  return salesFrom(sales, from).reduce((s, sale) => s + profitOfSale(sale), 0);
}
export function periodRevenue(sales, days) {
  const from = startOfDay(daysAgoDate(days - 1));
  return salesFrom(sales, from).reduce((s, sale) => s + (sale.total || 0), 0);
}
export function periodCount(sales, days) {
  const from = startOfDay(daysAgoDate(days - 1));
  return salesFrom(sales, from).reduce((s, sale) => s + qtyOfSale(sale), 0);
}
export function dailySeries(sales, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfDay(daysAgoDate(i));
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const sold = sales.filter((s) => {
      const t = new Date(s.created_at);
      return t >= dayStart && t < dayEnd;
    });
    out.push({
      date: dayStart,
      revenue: sold.reduce((s, x) => s + (x.total || 0), 0),
      profit: sold.reduce((s, x) => s + profitOfSale(x), 0),
      count: sold.length,
      items: sold.reduce((s, x) => s + qtyOfSale(x), 0),
    });
  }
  return out;
}
export function topDemand(sales, days, limit) {
  const from = startOfDay(daysAgoDate(days - 1));
  const map = {};
  salesFrom(sales, from).forEach((sale) => {
    (sale.items || []).forEach((it) => {
      map[it.name] = (map[it.name] || 0) + (it.qty || 0);
    });
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 6);
}

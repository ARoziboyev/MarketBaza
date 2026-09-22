import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { dailySeries, periodCount, periodProfit, periodRevenue, topDemand } from '../lib/stats';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';

const PERIODS = [1, 10, 30, 365];
const LABELS = { 1: '1 kunlik', 10: '10 kunlik', 30: '30 kunlik', 365: '1 yillik' };

export default function Home() {
  const { sales } = useData();
  const [period, setPeriod] = useState(30);

  const statCards = PERIODS.map((p) => ({ p, profit: periodProfit(sales, p) }));

  const { chartSvgData, chartCaption } = useMemo(() => {
    if (period === 365) {
      const monthly = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const sum = sales
          .filter((s) => { const t = new Date(s.created_at); return t >= start && t < end; })
          .reduce((s, x) => s + (x.items || []).reduce((a, it) => a + ((it.price || 0) - (it.cost || 0)) * (it.qty || 0), 0), 0);
        monthly.push(sum);
      }
      return { chartSvgData: monthly, chartCaption: "Oxirgi 12 oylik foyda dinamikasi" };
    }
    const series = dailySeries(sales, period);
    return { chartSvgData: series.map((d) => d.profit), chartCaption: `Kunlik foyda dinamikasi (${period} kun)` };
  }, [sales, period]);

  const demand = topDemand(sales, period === 365 ? 365 : period, 7);
  const maxDemand = demand.length ? demand[0][1] : 1;

  const todayRevenue = periodRevenue(sales, 1);
  const last7 = dailySeries(sales, 7);
  const last7labels = last7.map((d) => String(d.date.getDate()).padStart(2, '0') + '.' + String(d.date.getMonth() + 1).padStart(2, '0')).join(' \u00b7 ');

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Bosh sahifa</h1>
          <div className="page-sub">Do'kon holati bir qarashda</div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {statCards.map(({ p, profit }) => (
          <div key={p} className={'card stat-card' + (period === p ? ' active' : '')} onClick={() => setPeriod(p)}>
            <div className="stat-label">{LABELS[p]} foyda</div>
            <div className="stat-num">{fmt(profit)}</div>
            <div className="stat-trend">{LABELS[p]} davr foydasi</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card pad">
          <div className="section-title">{chartCaption}</div>
          <LineChart data={chartSvgData} color="#C68A2E" />
        </div>
        <div className="card pad">
          <div className="section-title">Talab yuqori mahsulotlar</div>
          {demand.length ? (
            demand.map(([name, qty], i) => (
              <div className="demand-row" key={name}>
                <span className="demand-rank">{i + 1}</span>
                <span className="demand-name">{name}</span>
                <span className="demand-bar-wrap"><span className="demand-bar" style={{ width: Math.round((qty / maxDemand) * 100) + '%' }} /></span>
                <span className="demand-qty">{qty} dona</span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>Hali savdo yo'q</div>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card pad">
          <div className="kicker">Bugungi savdo</div>
          <div className="stat-num" style={{ fontSize: 30 }}>{fmt(todayRevenue)}</div>
          <div className="stat-trend">Bugun sotilgan: {periodCount(sales, 1)} dona mahsulot</div>
        </div>
        <div className="card pad">
          <div className="section-title">So'nggi 7 kunda sotilgan mahsulotlar</div>
          <BarChart data={last7.map((d) => d.items)} color="#1B2430" />
          <div className="stat-trend" style={{ textAlign: 'center' }}>{last7labels}</div>
        </div>
      </div>
    </>
  );
}

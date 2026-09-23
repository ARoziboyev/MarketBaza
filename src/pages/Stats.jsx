import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { dailySeries, topDemand } from '../lib/stats';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';

export default function Stats() {
  const { sales } = useData();
  const cash = sales.filter((s) => s.type === 'naqt');
  const credit = sales.filter((s) => s.type === 'nasiya');
  const cashSum = cash.reduce((s, x) => s + x.total, 0);
  const creditSum = credit.reduce((s, x) => s + x.total, 0);
  const totalSum = cashSum + creditSum || 1;
  const top = topDemand(sales, 90, 8);
  const series = dailySeries(sales, 30);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Sotuv statistikasi</h1>
          <div className="page-sub">Naqt / nasiya taqsimoti va eng ko'p sotilgan mahsulotlar</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card pad">
          <div className="section-title">30 kunlik tushum dinamikasi</div>
          <LineChart data={series.map((d) => d.revenue)} color="#1B2430" />
        </div>
        <div className="card pad">
          <div className="section-title">To'lov turlari bo'yicha taqsimot</div>
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Naqt pul</span><span className="mono-num">{fmt(cashSum)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.round((cashSum / totalSum) * 100) + '%', background: 'var(--green)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '14px 0 6px' }}>
              <span>Nasiya</span><span className="mono-num">{fmt(creditSum)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.round((creditSum / totalSum) * 100) + '%', background: 'var(--rust)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">Eng ko'p sotilgan mahsulotlar (90 kun)</div>
        {top.length ? (
          <>
            <BarChart data={top.map((t) => t[1])} color="#C68A2E" height={170} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
              {top.map(([name, qty]) => (
                <span key={name} style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  {name} &middot; <b style={{ color: 'var(--ink)' }}>{qty}</b>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">Hali ma'lumot yo'q</div>
        )}
      </div>
    </>
  );
}
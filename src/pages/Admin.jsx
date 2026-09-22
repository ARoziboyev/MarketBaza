import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { periodCount, periodProfit, periodRevenue, profitOfSale, topDemand } from '../lib/stats';

export default function Admin() {
  const { products, sales } = useData();

  const allTimeRevenue = sales.reduce((s, x) => s + x.total, 0);
  const allTimeProfit = sales.reduce((s, x) => s + profitOfSale(x), 0);
  const inventoryValue = products.reduce((s, p) => s + (p.price || 0) * (p.qty || 0), 0);
  const debt = sales.filter((s) => s.type === 'nasiya' && s.status !== 'yopilgan').reduce((s, x) => s + x.total, 0);
  const best = topDemand(sales, 3650, 1)[0];
  const low = products.filter((p) => (p.qty || 0) <= 3);
  const todayRevenue = periodRevenue(sales, 1);
  const todayProfit = periodProfit(sales, 1);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Boshliq paneli</h1>
          <div className="page-sub">Do'kon bo'yicha umumiy hisobot</div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card stat-card"><div className="stat-label">Jami tushum (barcha davr)</div><div className="stat-num">{fmt(allTimeRevenue)}</div></div>
        <div className="card stat-card"><div className="stat-label">Jami foyda (barcha davr)</div><div className="stat-num">{fmt(allTimeProfit)}</div></div>
        <div className="card stat-card"><div className="stat-label">Ombordagi mahsulot qiymati</div><div className="stat-num">{fmt(inventoryValue)}</div></div>
        <div className="card stat-card"><div className="stat-label">Undirilmagan nasiya qarzlari</div><div className="stat-num" style={{ color: 'var(--rust)' }}>{fmt(debt)}</div></div>
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="card pad">
          <div className="section-title">Bugungi hisobot</div>
          <table><tbody>
            <tr><td>Bugungi tushum</td><td className="mono-num" style={{ textAlign: 'right' }}>{fmt(todayRevenue)}</td></tr>
            <tr><td>Bugungi foyda</td><td className="mono-num" style={{ textAlign: 'right' }}>{fmt(todayProfit)}</td></tr>
            <tr><td>Bugun sotilgan dona</td><td className="mono-num" style={{ textAlign: 'right' }}>{periodCount(sales, 1)} dona</td></tr>
            <tr><td>Eng ko'p sotilgan mahsulot</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{best ? best[0] : '\u2014'}</td></tr>
          </tbody></table>
        </div>
        <div className="card pad">
          <div className="section-title">Kam qolgan mahsulotlar</div>
          {low.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9 }}>
              {low.slice(0, 6).map((p) => <li key={p.id}>{p.name} &mdash; {p.qty} {p.unit || ''} qoldi</li>)}
            </ul>
          ) : (
            <div className="empty-state" style={{ padding: '10px 0' }}>Hammasi yetarli miqdorda</div>
          )}
          {low.length > 6 && <div className="stat-trend">va yana {low.length - 6} ta mahsulot...</div>}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">Tezkor havolalar</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <a className="btn btn-outline" href="#stats">Statistika</a>
          <a className="btn btn-outline" href="#credit">Nasiya ro'yxati</a>
          <a className="btn btn-outline" href="#stock">Ombor</a>
          <a className="btn btn-outline" href="#sold">Savdo tarixi</a>
          <a className="btn btn-outline" href="#add">Mahsulot qo'shish</a>
        </div>
      </div>
    </>
  );
}

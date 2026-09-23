import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';

export default function Stock() {
  const { products, adjustStock, setStockQty } = useData();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Barchasi');

  const cats = ['Barchasi', ...Array.from(new Set(products.map((p) => p.category || 'Umumiy')))];
  let list = products.slice();
  if (cat !== 'Barchasi') list = list.filter((p) => (p.category || 'Umumiy') === cat);
  if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const totalValue = products.reduce((s, p) => s + (p.price || 0) * (p.qty || 0), 0);
  const lowCount = products.filter((p) => (p.qty || 0) <= 3).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Qolgan mahsulotlar</h1>
          <div className="page-sub">Joriy ombor holati</div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card stat-card"><div className="stat-label">Jami mahsulot turi</div><div className="stat-num">{products.length}</div></div>
        <div className="card stat-card"><div className="stat-label">Ombor qiymati (sotish narxida)</div><div className="stat-num">{fmt(totalValue)}</div></div>
        <div className="card stat-card"><div className="stat-label">Kam qolgan mahsulotlar</div><div className="stat-num">{lowCount}</div></div>
        <div className="card stat-card"><div className="stat-label">Kategoriyalar</div><div className="stat-num">{cats.length - 1}</div></div>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Mahsulot qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card"><div className="table-wrap"><table><tbody>
        <tr><th>Nomi</th><th>Kategoriya</th><th>Narxi</th><th>Qoldiq</th><th>Holati</th><th>Tuzatish</th></tr>
        {list.length ? list.map((p) => {
          const low = (p.qty || 0) <= 3;
          return (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category || ''}</td>
              <td className="mono-num">{fmt(p.price)}</td>
              <td className="mono-num">{p.qty || 0} {p.unit || ''}</td>
              <td>{low ? <span className="badge badge-low">Kam qoldi</span> : <span className="badge badge-ok">Yetarli</span>}</td>
              <td>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => adjustStock(p.id, -1)}>&minus;</button>
                  <input
                    type="number" min="0" step="1" className="stock-qty-input" defaultValue={p.qty || 0}
                    key={p.id + '-' + p.qty}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n !== p.qty) setStockQty(p.id, Math.max(0, n));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  />
                  <button className="btn btn-outline btn-sm" onClick={() => adjustStock(p.id, 1)}>+</button>
                </div>
              </td>
            </tr>
          );
        }) : <tr><td colSpan={6} className="empty-state">Mahsulot topilmadi</td></tr>}
      </tbody></table></div></div>
    </>
  );
}
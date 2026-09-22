import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt, fmtDate } from '../lib/format';

export default function Credit() {
  const { sales, markCreditPaid } = useData();
  const [view, setView] = useState('active');
  const [archiveQ, setArchiveQ] = useState('');

  const list = sales.filter((s) => s.type === 'nasiya');
  const pending = list.filter((s) => s.status !== 'yopilgan');
  const paid = list
    .filter((s) => s.status === 'yopilgan')
    .sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));
  const pendingSum = pending.reduce((s, x) => s + x.total, 0);

  let archiveList = paid;
  if (archiveQ) {
    const q = archiveQ.toLowerCase();
    archiveList = archiveList.filter((s) => (s.buyer_name || '').toLowerCase().includes(q) || (s.buyer_phone || '').toLowerCase().includes(q));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Nasiyaga sotilganlar</h1>
          <div className="page-sub">Qarzga berilgan mahsulotlar ro'yxati va to'langanlar arxivi</div>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="kicker">Jami qaytarilmagan qarz</div>
          <div className="stat-num" style={{ fontSize: 26 }}>{fmt(pendingSum)}</div>
        </div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{pending.length} ta ochiq nasiya &middot; {paid.length} ta arxivda</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={'btn btn-sm ' + (view === 'active' ? 'btn-gold' : 'btn-outline')} onClick={() => setView('active')}>Faol nasiyalar ({pending.length})</button>
        <button className={'btn btn-sm ' + (view === 'archive' ? 'btn-gold' : 'btn-outline')} onClick={() => setView('archive')}>Arxiv ({paid.length})</button>
      </div>

      {view === 'active' ? (
        <div className="card"><div className="table-wrap"><table><tbody>
          <tr><th>Sana</th><th>Xaridor</th><th>Telefon</th><th>Summa</th><th>Holati</th><th></th></tr>
          {pending.length ? pending.map((s) => (
            <tr key={s.id}>
              <td>{fmtDate(s.created_at, true)}</td>
              <td>{s.buyer_name || '-'}</td>
              <td>{s.buyer_phone || '-'}</td>
              <td className="mono-num">{fmt(s.total)}</td>
              <td><span className="badge badge-wait">Kutilmoqda</span></td>
              <td><button className="btn btn-green btn-sm" onClick={() => markCreditPaid(s.id)}>To'landi deb belgilash</button></td>
            </tr>
          )) : <tr><td colSpan={6} className="empty-state">Faol nasiya yo'q</td></tr>}
        </tbody></table></div></div>
      ) : (
        <>
          <div className="filter-bar">
            <input className="search-input" placeholder="Klient ismi yoki telefoni bo'yicha qidirish..." value={archiveQ} onChange={(e) => setArchiveQ(e.target.value)} />
          </div>
          <div className="card"><div className="table-wrap"><table><tbody>
            <tr><th>Sotilgan sana</th><th>Xaridor</th><th>Telefon</th><th>Summa</th><th>To'langan sana</th><th>Holati</th></tr>
            {archiveList.length ? archiveList.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.created_at, true)}</td>
                <td>{s.buyer_name || '-'}</td>
                <td>{s.buyer_phone || '-'}</td>
                <td className="mono-num">{fmt(s.total)}</td>
                <td>{s.paid_at ? fmtDate(s.paid_at, true) : '\u2014'}</td>
                <td><span className="badge badge-ok">To'langan</span></td>
              </tr>
            )) : <tr><td colSpan={6} className="empty-state">Arxivda mos yozuv topilmadi</td></tr>}
          </tbody></table></div></div>
        </>
      )}
    </>
  );
}

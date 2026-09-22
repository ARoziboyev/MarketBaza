import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt, fmtDate } from '../lib/format';
import ReceiptModal from '../components/ReceiptModal';

export default function Sold() {
  const { sales } = useData();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [openSale, setOpenSale] = useState(null);

  let list = sales.slice();
  if (type !== 'all') list = list.filter((s) => s.type === type);
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter((s) => (s.items || []).some((it) => it.name.toLowerCase().includes(ql)) || (s.buyer_name || '').toLowerCase().includes(ql));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Sotilgan mahsulotlar</h1>
          <div className="page-sub">Barcha savdolar tarixi</div>
        </div>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Mahsulot yoki xaridor..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Barcha turlar</option>
          <option value="naqt">Naqt pul</option>
          <option value="nasiya">Nasiya</option>
        </select>
        <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginLeft: 'auto' }}>{list.length} ta savdo</div>
      </div>

      <div className="card"><div className="table-wrap"><table><tbody>
        <tr><th>Sana</th><th>Mahsulotlar</th><th>Turi</th><th>Summa</th><th></th></tr>
        {list.length ? list.map((s) => (
          <tr key={s.id}>
            <td>{fmtDate(s.created_at, true)}</td>
            <td style={{ maxWidth: 260 }}>{(s.items || []).map((it) => `${it.name} x${it.qty}`).join(', ')}</td>
            <td>{s.type === 'nasiya' ? <span className="badge badge-credit">Nasiya</span> : <span className="badge badge-cash">Naqt</span>}</td>
            <td className="mono-num">{fmt(s.total)}</td>
            <td><button className="btn btn-outline btn-sm" onClick={() => setOpenSale(s)}>Chek</button></td>
          </tr>
        )) : <tr><td colSpan={5} className="empty-state">Savdo topilmadi</td></tr>}
      </tbody></table></div></div>

      {openSale && <ReceiptModal sale={openSale} onClose={() => setOpenSale(null)} />}
    </>
  );
}

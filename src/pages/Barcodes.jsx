import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import BarcodeModal from '../components/BarcodeModal';

export default function Barcodes() {
  const { products } = useData();
  const [q, setQ] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);

  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Shtrix-kodlar</h1>
          <div className="page-sub">Mahsulotni tanlang — ombordagi miqdoricha shtrix-kod yorliqlari chop etiladi</div>
        </div>
        <input className="search-input" placeholder="Mahsulot qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card"><div className="table-wrap"><table><tbody>
        <tr><th>Nomi</th><th>Kategoriya</th><th>Narxi</th><th>Ombordagi miqdor</th><th>Shtrix-kod</th><th></th></tr>
        {list.length ? list.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.category || ''}</td>
            <td className="mono-num">{fmt(p.price)}</td>
            <td className="mono-num">{p.qty || 0} {p.unit || ''}</td>
            <td>{p.barcode ? <span className="badge badge-ok">Mavjud</span> : <span className="badge badge-wait">Yo'q</span>}</td>
            <td><button className="btn btn-outline btn-sm" onClick={() => setActiveProduct(p)}>Shtrix-kod</button></td>
          </tr>
        )) : <tr><td colSpan={6} className="empty-state">Mahsulot topilmadi</td></tr>}
      </tbody></table></div></div>

      {activeProduct && <BarcodeModal product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </>
  );
}
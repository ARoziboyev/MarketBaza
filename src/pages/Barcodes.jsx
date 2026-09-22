import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { detectBarcodeFormat, generateEan13 } from '../lib/barcode';

function BarcodeLabel({ product, selected, onToggle }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !product.barcode) return;
    const format = detectBarcodeFormat(product.barcode);
    try {
      JsBarcode(svgRef.current, product.barcode, {
        format,
        displayValue: true,
        fontSize: 13,
        height: 46,
        margin: 6,
        width: 1.8,
      });
    } catch {
      // Format mos kelmasa (masalan noto'g'ri check-digit), CODE128 bilan
      // urinib ko'ramiz — u ixtiyoriy matnni chizadi.
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128', displayValue: true, fontSize: 13, height: 46, margin: 6, width: 1.8,
        });
      } catch {
        // ignore — noto'g'ri belgilar bo'lsa ham sahifa buzilmasin
      }
    }
  }, [product.barcode]);

  return (
    <label className={'barcode-label' + (selected ? ' selected' : '')}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="barcode-check no-print" />
      <div className="barcode-name">{product.name}</div>
      <svg ref={svgRef} />
      <div className="barcode-price">{fmt(product.price)}</div>
    </label>
  );
}

export default function Barcodes() {
  const { products, updateProduct, toast } = useData();
  const [selected, setSelected] = useState(() => new Set());
  const [q, setQ] = useState('');

  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const missing = products.filter((p) => !p.barcode);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(list.filter((p) => p.barcode).map((p) => p.id))); }
  function clearSelection() { setSelected(new Set()); }

  async function assignBarcode(p) {
    const code = generateEan13();
    const ok = await updateProduct(p.id, { barcode: code });
    if (ok) toast('Shtrix-kod yaratildi: ' + p.name);
  }

  function printSelected() {
    if (!selected.size) { toast('Avval kamida bitta mahsulotni belgilang'); return; }
    window.print();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Shtrix-kodlar</h1>
          <div className="page-sub">Har bir mahsulot uchun chop etiladigan shtrix-kod yorliqlari</div>
        </div>
        <input className="search-input" placeholder="Mahsulot qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {missing.length > 0 && (
        <div className="hint-box" style={{ marginBottom: 16 }}>
          {missing.length} ta mahsulotda hali shtrix-kod yo'q. Pastdagi "Kod yaratish" tugmasi orqali avtomatik yaratishingiz, yoki "Mahsulot qo'shish" bo'limida qadoqdagi haqiqiy shtrix-kodni qo'lda kiritishingiz mumkin.
        </div>
      )}

      <div className="filter-bar no-print">
        <button className="btn btn-outline btn-sm" onClick={selectAll}>Barchasini belgilash</button>
        <button className="btn btn-outline btn-sm" onClick={clearSelection}>Belgilashni bekor qilish</button>
        <button className="btn btn-gold btn-sm" onClick={printSelected}>Belgilanganlarni chop etish ({selected.size})</button>
      </div>

      <div className="barcode-grid" id="barcode-print-area">
        {list.length ? list.map((p) => (
          <div key={p.id} className={'barcode-cell' + (selected.has(p.id) ? '' : ' print-hide')}>
            {p.barcode ? (
              <BarcodeLabel product={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
            ) : (
              <div className="barcode-empty card pad">
                <div className="barcode-name">{p.name}</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: 12, margin: '8px 0' }}>Shtrix-kod yo'q</div>
                <button className="btn btn-outline btn-sm no-print" onClick={() => assignBarcode(p)}>Kod yaratish</button>
              </div>
            )}
          </div>
        )) : <div className="empty-state">Mahsulot topilmadi</div>}
      </div>
    </>
  );
}
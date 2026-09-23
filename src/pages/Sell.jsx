import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import ReceiptModal from '../components/ReceiptModal';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

export default function Sell() {
  const { products, addSale, toast } = useData();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]); // {productId,name,price,cost,qty,unit,stock}
  const [pendingType, setPendingType] = useState(null); // 'naqt' | 'nasiya' | null
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [negotiated, setNegotiated] = useState(''); // string, empty = not negotiating
  const [receiptSale, setReceiptSale] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const list = products.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()));
  const baseTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const negotiatedNum = negotiated !== '' && !isNaN(parseFloat(negotiated)) ? parseFloat(negotiated) : null;
  const isNegotiated = negotiatedNum !== null && negotiatedNum >= 0 && negotiatedNum !== baseTotal;
  const effTotal = isNegotiated ? negotiatedNum : baseTotal;

  function addToCart(p) {
    if ((p.qty || 0) <= 0) { toast('Omborda qolmagan'); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.qty) { toast('Omborda yetarli mahsulot yo\'q'); return prev; }
        return prev.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, cost: p.cost || 0, qty: 1, unit: p.unit, stock: p.qty }];
    });
    setNegotiated('');
  }
  function decCart(id) {
    setCart((prev) => prev.map((c) => (c.productId === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
    setNegotiated('');
  }
  function incCart(id) {
    setCart((prev) => prev.map((c) => {
      if (c.productId !== id) return c;
      if (c.qty + 1 > c.stock) { toast('Omborda yetarli mahsulot yo\'q'); return c; }
      return { ...c, qty: c.qty + 1 };
    }));
    setNegotiated('');
  }
  function setCartQty(id, value) {
    let n = parseInt(value, 10);
    setCart((prev) => {
      const c = prev.find((x) => x.productId === id);
      if (!c) return prev;
      if (isNaN(n) || n <= 0) return prev.filter((x) => x.productId !== id);
      if (n > c.stock) { toast(`Omborda yetarli mahsulot yo'q (bor-yo'g'i ${c.stock} ${c.unit || 'dona'})`); n = c.stock; }
      return prev.map((x) => (x.productId === id ? { ...x, qty: n } : x));
    });
    setNegotiated('');
  }
  function removeFromCart(id) {
    setCart((prev) => prev.filter((c) => c.productId !== id));
    setNegotiated('');
  }

  const [manualCode, setManualCode] = useState('');

  function handleScan(code) {
    const clean = String(code || '').trim();
    if (!clean) return;
    const p = products.find((x) => x.barcode === clean);
    if (!p) {
      toast("Shtrix-kod topilmadi: " + clean);
      return;
    }
    addToCart(p);
    toast('Skanerlandi: ' + p.name);
  }

  // Apparat (USB/Bluetooth HID skaner) sahifada ekanida doim tinglanadi —
  // qurilma ulanishi shart emas, u shunchaki klaviaturadek ishlaydi.
  useBarcodeScanner(handleScan);

  function handleManualScan(e) {
    e.preventDefault();
    handleScan(manualCode);
    setManualCode('');
  }

  function chooseSaleType(type) {
    if (!cart.length) { toast("Avval savatga mahsulot qo'shing"); return; }
    setPendingType(type);
  }
  function cancelSaleType() {
    setPendingType(null);
    setBuyerName('');
    setBuyerPhone('');
  }

  async function finalizeSale(e) {
    e.preventDefault();
    if (!cart.length || submitting) return;
    if (pendingType === 'nasiya' && (!buyerName.trim() || !buyerPhone.trim())) {
      toast('Ism-familiya va telefon raqamini kiriting');
      return;
    }
    setSubmitting(true);
    const items = cart.map((c) => ({ productId: c.productId, name: c.name, price: c.price, cost: c.cost, qty: c.qty, unit: c.unit }));
    const sale = await addSale({
      items, total: effTotal, baseTotal, type: pendingType,
      buyerName: buyerName.trim(), buyerPhone: buyerPhone.trim(),
    });
    setSubmitting(false);
    if (sale) {
      setCart([]); setPendingType(null); setNegotiated(''); setBuyerName(''); setBuyerPhone('');
      setReceiptSale(sale);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Mahsulot sotish</h1>
          <div className="page-sub">Mahsulotlarni savatga qo'shib, to'lov turini tanlang</div>
        </div>
        <input className="search-input" placeholder="Mahsulot qidirish..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="scanner-bar">
        <span className="badge badge-ok" title="Shtrix-kod skaneri fon rejimida doim tinglaydi, alohida ulash shart emas">
          <span className="status-dot on" />Skaner faol
        </span>
        <form onSubmit={handleManualScan} className="scanner-manual">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Skaner yo'q bo'lsa: kodni qo'lda kiriting va Enter bosing"
          />
        </form>
      </div>

      <div className="sell-grid">
        <div className="card pad" style={{ maxHeight: 640, overflowY: 'auto' }}>
          {list.length ? list.map((p) => {
            const low = p.qty <= 3;
            return (
              <div className="product-pick" key={p.id}>
                <div>
                  <div className="pp-name">{p.name}</div>
                  <div className="pp-meta">{p.category || ''} &middot; qoldi: <span style={{ color: low ? 'var(--rust)' : 'inherit' }}>{p.qty} {p.unit || 'dona'}</span></div>
                </div>
                <div className="pp-price">{fmt(p.price)}</div>
                <button className="btn btn-gold btn-sm" disabled={p.qty <= 0} onClick={() => addToCart(p)}>+ Savat</button>
              </div>
            );
          }) : (
            <div className="empty-state"><div className="em-title">Mahsulot topilmadi</div>Avval "Mahsulot qo'shish" bo'limidan mahsulot qo'shing.</div>
          )}
        </div>

        <div className="card pad" style={{ position: 'sticky', top: 20 }}>
          <div className="section-title">Savat</div>
          {cart.length ? cart.map((c) => (
            <div className="cart-row" key={c.productId}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{fmt(c.price)} / {c.unit || 'dona'}</div>
              </div>
              <div className="qty-stepper">
                <button onClick={() => decCart(c.productId)}>&minus;</button>
                <input type="number" min="1" step="1" className="cart-qty-input" value={c.qty} onChange={(e) => setCartQty(c.productId, e.target.value)} />
                <button onClick={() => incCart(c.productId)}>+</button>
              </div>
              <div className="mono-num" style={{ width: 90, textAlign: 'right', fontWeight: 700 }}>{fmt(c.price * c.qty)}</div>
              <button className="btn btn-outline btn-sm" onClick={() => removeFromCart(c.productId)}>&times;</button>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>Savat bo'sh</div>
          )}

          {cart.length > 0 && (
            <div className="field" style={{ marginTop: 10, marginBottom: 6 }}>
              <label>Narxni kelishtirib berish (ixtiyoriy)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min="0" step="1" placeholder={String(baseTotal)} value={negotiated} onChange={(e) => setNegotiated(e.target.value)} style={{ flex: 1 }} />
                {isNegotiated && <button type="button" className="btn btn-outline btn-sm" onClick={() => setNegotiated('')}>Asliga qaytarish</button>}
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="cart-total-row">
              <span>Jami{isNegotiated ? ' (kelishilgan)' : ''}</span>
              <span className="amt">{fmt(effTotal)}</span>
            </div>
          )}
          {isNegotiated && <div className="stat-trend" style={{ textAlign: 'right', marginTop: -8 }}>Asl narx: {fmt(baseTotal)}</div>}

          {!pendingType && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-green btn-block" onClick={() => chooseSaleType('naqt')}>Naqt pulga sotish</button>
              <button className="btn btn-rust btn-block" onClick={() => chooseSaleType('nasiya')}>Nasiyaga sotish</button>
            </div>
          )}
          {pendingType === 'naqt' && (
            <form onSubmit={finalizeSale} style={{ marginTop: 14 }}>
              <div className="hint-box">Naqt pulga sotilmoqda. Tasdiqlansa chek va QR-kod chiqariladi.</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-outline btn-block" onClick={cancelSaleType}>Bekor qilish</button>
                <button type="submit" className="btn btn-green btn-block" disabled={submitting}>Sotish</button>
              </div>
            </form>
          )}
          {pendingType === 'nasiya' && (
            <form onSubmit={finalizeSale} style={{ marginTop: 14 }}>
              <div className="field"><label>Xaridor ism-familiyasi</label><input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required placeholder="Ism Familiya" /></div>
              <div className="field"><label>Telefon raqami</label><input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} required placeholder="+998 90 123 45 67" /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-outline btn-block" onClick={cancelSaleType}>Bekor qilish</button>
                <button type="submit" className="btn btn-rust btn-block" disabled={submitting}>Nasiyaga sotish</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {receiptSale && <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />}
    </>
  );
}
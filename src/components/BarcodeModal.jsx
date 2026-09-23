import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { detectBarcodeFormat, generateEan13 } from '../lib/barcode';

function BarcodeSvg({ value, width = 1.6, height = 42, fontSize = 12 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    const format = detectBarcodeFormat(value);
    try {
      JsBarcode(ref.current, value, { format, displayValue: true, fontSize, height, margin: 4, width });
    } catch {
      try {
        JsBarcode(ref.current, value, { format: 'CODE128', displayValue: true, fontSize, height, margin: 4, width });
      } catch {
        // ignore — noto'g'ri belgilar bo'lsa ham sahifa buzilmasin
      }
    }
  }, [value, width, height, fontSize]);
  return <svg ref={ref} />;
}

export default function BarcodeModal({ product, onClose }) {
  const { updateProduct, toast } = useData();
  // Mahsulotda hali kod bo'lmasa, modal ochilganda bittagina namunaviy kod
  // generatsiya qilinadi (hali bazaga yozilmaydi — faqat "Shtrix-kod chiqarish"
  // bosilganda saqlanadi).
  const [previewCode] = useState(() => product.barcode || generateEan13());
  const [stage, setStage] = useState('preview'); // 'preview' | 'printing'
  const printCount = Math.max(0, Math.round(product.qty || 0));

  useEffect(() => {
    if (stage !== 'printing') return undefined;
    function handleAfterPrint() {
      setStage('preview');
      onClose();
    }
    window.addEventListener('afterprint', handleAfterPrint);
    // Barcha yorliqlar DOM'ga chizilishi uchun bir oz kutamiz, keyin chop etamiz.
    const t = setTimeout(() => window.print(), 250);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      clearTimeout(t);
    };
  }, [stage, onClose]);

  async function handleGenerate() {
    if (printCount <= 0) {
      toast("Ombordagi miqdor 0 — chop etish uchun mahsulot qolmagan");
      return;
    }
    if (printCount > 300) {
      const ok = confirm(`Diqqat: ${printCount} dona shtrix-kod chop etiladi. Bu biroz vaqt olishi mumkin. Davom etasizmi?`);
      if (!ok) return;
    }
    if (!product.barcode) {
      const ok = await updateProduct(product.id, { barcode: previewCode });
      if (!ok) return;
    }
    setStage('printing');
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && stage !== 'printing') onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="pad">
          <div className="section-title" style={{ marginBottom: 4 }}>Shtrix-kod chiqarish</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>{product.name}</div>

          <div className="barcode-label" style={{ cursor: 'default', margin: '0 auto' }}>
            <div className="barcode-name">{product.name}</div>
            <BarcodeSvg value={previewCode} />
            <div className="barcode-price">{fmt(product.price)}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '14px 0' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Ombordagi miqdor</span>
            <span className="mono-num" style={{ fontWeight: 700 }}>{printCount} {product.unit || 'dona'}</span>
          </div>

          {stage === 'printing' ? (
            <div className="hint-box">Chop etishga tayyorlanmoqda — {printCount} ta yorliq yaratilmoqda...</div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-block" onClick={onClose}>Bekor qilish</button>
              <button type="button" className="btn btn-gold btn-block" onClick={handleGenerate} disabled={printCount <= 0}>
                Shtrix-kod chiqarish
              </button>
            </div>
          )}
        </div>

        {stage === 'printing' && (
          <div id="barcode-print-area">
            {Array.from({ length: printCount }).map((_, i) => (
              <div className="barcode-print-cell" key={i}>
                <div className="barcode-name">{product.name}</div>
                <BarcodeSvg value={previewCode} width={1.4} height={34} fontSize={10} />
                <div className="barcode-price">{fmt(product.price)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
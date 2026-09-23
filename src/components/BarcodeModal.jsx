import { useRef, useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { detectBarcodeFormat, generateEan13 } from '../lib/barcode';
import { buildBarcodeLabelsEscPosBytes } from '../lib/barcodeDevice';
import { printViaLocalService } from '../lib/localPrintService';

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
  const { settings, updateProduct, toast } = useData();
  // Mahsulotda hali kod bo'lmasa, modal ochilganda bittagina namunaviy kod
  // generatsiya qilinadi (hali bazaga yozilmaydi — faqat "Shtrix-kod chiqarish"
  // bosilganda saqlanadi).
  const [previewCode] = useState(() => product.barcode || generateEan13());
  const [stage, setStage] = useState('preview'); // 'preview' | 'printing'
  const printCount = Math.max(0, Math.round(product.qty || 0));

  const printerReady = settings?.conn_type === 'local' && !!settings?.printer_name;

  async function handleGenerate() {
    if (printCount <= 0) {
      toast("Ombordagi miqdor 0 — chop etish uchun mahsulot qolmagan");
      return;
    }
    if (!printerReady) {
      toast('Avval "Chek chiqarish" bo\'limida "Mahalliy chop etish xizmati"ni sozlab, printerni ulang.');
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
    try {
      const bytes = buildBarcodeLabelsEscPosBytes({
        name: product.name,
        price: fmt(product.price),
        code: previewCode,
        count: printCount,
      });
      await printViaLocalService(settings.printer_name, bytes);
      toast(`${printCount} ta shtrix-kod yorlig'i printerga yuborildi`);
      onClose();
    } catch (error) {
      toast('Xatolik: ' + (error?.message || 'Nomaʼlum xato'));
      setStage('preview');
    }
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

          {!printerReady && (
            <div className="hint-box" style={{ marginBottom: 14 }}>
              Shtrix-kod printerga to'g'ridan-to'g'ri (haqiqiy shtrix-kod sifatida) yuborilishi uchun
              avval <b>"Chek chiqarish"</b> bo'limida <b>"Mahalliy chop etish xizmati"</b> rejimini
              sozlab, printeringizni ulang.
            </div>
          )}

          {stage === 'printing' ? (
            <div className="hint-box">Chop etilmoqda — {printCount} ta yorliq printerga yuborilmoqda...</div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-block" onClick={onClose}>Bekor qilish</button>
              <button type="button" className="btn btn-gold btn-block" onClick={handleGenerate} disabled={printCount <= 0}>
                Shtrix-kod chiqarish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useData } from '../context/DataContext';

export default function ClearDataModal({ onClose }) {
  const { products, sales, settings, clearAllProducts, clearAllSales, clearCreditArchive, resetPrinterSettings } = useData();
  const [busyKey, setBusyKey] = useState(null);

  const paidCreditCount = sales.filter((s) => s.type === 'nasiya' && s.status === 'yopilgan').length;

  const sections = [
    {
      key: 'products',
      title: 'Mahsulotlar',
      desc: "Bazadagi barcha mahsulotlar (ombor, narxlar, shtrix-kodlar).",
      count: `${products.length} ta mahsulot`,
      action: clearAllProducts,
      confirmText: `Barcha ${products.length} ta mahsulotni butunlay o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`,
    },
    {
      key: 'sales',
      title: 'Savdo tarixi',
      desc: "Barcha sotuvlar (naqt va nasiya) — bu Statistika, Kunlik daromad, Sotilganlar va Boshliq hisobotlariga ham ta'sir qiladi.",
      count: `${sales.length} ta savdo`,
      action: clearAllSales,
      confirmText: `Barcha ${sales.length} ta savdo yozuvini butunlay o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`,
    },
    {
      key: 'creditArchive',
      title: 'Nasiya arxivi',
      desc: "Faqat to'langan (arxivlangan) nasiyalar. Faol (kutilayotgan) qarzlarga tegmaydi.",
      count: `${paidCreditCount} ta yozuv`,
      action: clearCreditArchive,
      confirmText: `Arxivdagi barcha ${paidCreditCount} ta to'langan nasiyani o'chirasizmi?`,
    },
    {
      key: 'printer',
      title: 'Printer sozlamalari',
      desc: 'Ulangan chek apparati va uning sozlamalari.',
      count: settings?.printer_name ? `Ulangan: ${settings.printer_name}` : 'Sozlanmagan',
      action: resetPrinterSettings,
      confirmText: "Printer sozlamalarini tozalaysizmi? Keyinroq apparatni qayta ulashingiz kerak bo'ladi.",
    },
  ];

  async function handleClear(section) {
    if (!confirm(section.confirmText)) return;
    setBusyKey(section.key);
    await section.action();
    setBusyKey(null);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="pad">
          <div className="section-title" style={{ marginBottom: 4 }}>Tarixni tozalash</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
            Har bir bo'lim alohida tozalanadi. Bu amallarni ortga qaytarib bo'lmaydi.
          </div>

          {sections.map((s) => (
            <div key={s.key} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{s.count}</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '6px 0 10px' }}>{s.desc}</div>
              <button
                type="button"
                className="btn btn-rust btn-sm btn-block"
                onClick={() => handleClear(s)}
                disabled={busyKey === s.key}
              >
                {busyKey === s.key ? "O'chirilmoqda..." : `${s.title}ni o'chirish`}
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-outline btn-block" onClick={onClose} style={{ marginTop: 4 }}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
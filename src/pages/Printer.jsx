import { useEffect, useState } from 'react';

import { useData } from '../context/DataContext';

import ReceiptModal from '../components/ReceiptModal';

import {
  connectReceiptDevice,
  disconnectReceiptDevice,
  isReceiptDeviceConnected,
  isWebUSBSupported,
  isWebSerialSupported,
  reconnectReceiptDevice,
  buildReceiptEscPosBytes,
} from '../lib/receiptDevice';

import {
  isLocalPrintServiceAvailable,
  listLocalPrinters,
  printViaLocalService,
} from '../lib/localPrintService';

export default function Printer() {
  const { settings, savePrinterSettings, toast } = useData();

  const [form, setForm] = useState({
    printer_name: '',
    conn_type: 'usb',
    address: '',
    baud_rate: 9600,
  });

  const [testSale, setTestSale] = useState(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const [localServiceUp, setLocalServiceUp] = useState(null); // null=tekshirilmoqda, true/false
  const [localPrinters, setLocalPrinters] = useState([]);
  const [checkingLocal, setCheckingLocal] = useState(false);

  /*
    "Mahalliy chop etish xizmati" rejimida haqiqiy USB obyekti yo'q —
    shuning uchun "ulangan" holatini vaqtinchalik state'da emas,
    SAQLANGAN sozlamalarning o'zidan aniqlaymiz. Shu sabab u sahifa
    almashtirilganda yoki brauzer yangilanganda (F5) yo'qolib qolmaydi
    — faqat "Apparatni uzish" bosilsa (u printer_name'ni bazadan
    tozalaydi) o'chadi.
  */
  const isLocalConnected =
    form.conn_type === 'local' &&
    settings?.conn_type === 'local' &&
    !!settings?.printer_name;

  const effectiveConnected = form.conn_type === 'local' ? isLocalConnected : connected;

  /*
    Sozlamalarni yuklash
  */
  useEffect(() => {
    setForm({
      printer_name: settings?.printer_name || '',
      conn_type: settings?.conn_type || 'usb',
      address: settings?.address || '',
      baud_rate: settings?.baud_rate || 9600,
    });
  }, [settings]);

  /*
    Printer holatini tekshirish (USB/Serial uchun, sahifa
    yangilanganda oldin ruxsat berilgan qurilmani qayta ulash)
  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (form.conn_type === 'local') return;

      if (isReceiptDeviceConnected()) {
        setConnected(true);
        return;
      }

      if (isWebUSBSupported() && form.conn_type === 'usb') {
        try {
          await reconnectReceiptDevice();
          if (!cancelled) setConnected(true);
          return;
        } catch {
          // Avval ruxsat berilgan qurilma yo'q — bu normal holat.
        }
      }

      if (!cancelled) setConnected(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    Mahalliy print xizmati (server.js) holatini tekshirish —
    "Mahalliy xizmat" rejimi tanlanganda avtomatik ishga tushadi.
  */
  useEffect(() => {
    if (form.conn_type !== 'local') return undefined;
    let cancelled = false;

    (async () => {
      setCheckingLocal(true);
      const up = await isLocalPrintServiceAvailable();
      if (cancelled) return;
      setLocalServiceUp(up);
      if (up) {
        try {
          const printers = await listLocalPrinters();
          if (!cancelled) setLocalPrinters(printers);
        } catch (error) {
          if (!cancelled) toast('Printerlar ro\'yxatini olishda xato: ' + (error?.message || ''));
        }
      }
      if (!cancelled) setCheckingLocal(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.conn_type]);

  async function refreshLocalPrinters() {
    setCheckingLocal(true);
    const up = await isLocalPrintServiceAvailable();
    setLocalServiceUp(up);
    if (up) {
      try {
        const printers = await listLocalPrinters();
        setLocalPrinters(printers);
        toast(`${printers.length} ta printer topildi`);
      } catch (error) {
        toast('Xato: ' + (error?.message || ''));
      }
    } else {
      toast("Mahalliy xizmat ishlamayapti — kompyuterda \"npm run printer\" buyrug'ini ishga tushiring");
    }
    setCheckingLocal(false);
  }

  /*
    Sozlamalarni saqlash
  */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await savePrinterSettings(form);
      toast('Printer sozlamalari saqlandi');
    } catch (error) {
      console.error(error);
      toast('Sozlamalarni saqlashda xato: ' + (error?.message || 'Nomaʼlum xato'));
    }
  }

  /*
    APPARATNI ULASH
  */
  async function handleConnect() {
    setBusy(true);
    try {
      if (form.conn_type === 'local') {
        const up = await isLocalPrintServiceAvailable();
        setLocalServiceUp(up);
        if (!up) {
          toast("Mahalliy xizmat topilmadi. Kompyuterda loyiha papkasida \"npm run printer\" buyrug'ini ishga tushiring.");
          setConnected(false);
          return;
        }
        if (!form.printer_name) {
          toast("Ro'yxatdan printer nomini tanlang");
          setConnected(false);
          return;
        }
        setConnected(true);
        const saved = await savePrinterSettings({ ...form, saved_at: new Date().toISOString() });
        if (!saved) {
          // savePrinterSettings o'zi aniq DB xatosini toast qilib ko'rsatdi
          // (masalan, yetishmayotgan ustun) — bu yerda yolg'ondan "ulandi"
          // demasligimiz kerak.
          setConnected(false);
          return;
        }
        toast('Mahalliy chop etish xizmatiga ulandi');
        return;
      }

      if (form.conn_type === 'usb') {
        if (!isWebUSBSupported()) {
          toast('Brauzeringiz WebUSB ni qo‘llab-quvvatlamaydi. Chrome yoki Edge ishlating.');
          return;
        }
        await connectReceiptDevice({ connection: 'usb' });
      } else {
        if (!isWebSerialSupported()) {
          toast('Brauzeringiz Web Serial API ni qo‘llab-quvvatlamaydi. Chrome yoki Edge ishlating.');
          return;
        }
        await connectReceiptDevice({ connection: 'serial', baudRate: form.baud_rate });
      }

      setConnected(true);
      await savePrinterSettings({ ...form, saved_at: new Date().toISOString() });
      toast('Chek apparati muvaffaqiyatli ulandi');
    } catch (error) {
      console.error('Printer ulashda xato:', error);
      setConnected(false);

      let message = error?.message || 'Nomaʼlum xato';
      if (message.toLowerCase().includes('access denied')) {
        message =
          'USB printerga kirish rad etildi — Windows printer drayveri qurilmani band qilib turibdi. ' +
          'Bu holatda "Mahalliy chop etish xizmati" rejimidan foydalaning (pastdagi tushuntirishga qarang).';
      }
      toast('Printer ulanmadi: ' + message);
    } finally {
      setBusy(false);
    }
  }

  /*
    APPARATNI UZISH
  */
  async function handleDisconnect() {
    setBusy(true);
    try {
      if (form.conn_type === 'local') {
        // printer_name'ni bazadan tozalaymiz — shu bilan "ulangan"
        // holati barcha sahifalarda va refreshdan keyin ham to'g'ri
        // "uzilgan" bo'lib qoladi (chunki holat shu maydondan olinadi).
        await savePrinterSettings({ ...form, printer_name: '', saved_at: new Date().toISOString() });
        setForm((f) => ({ ...f, printer_name: '' }));
        setConnected(false);
        toast('Mahalliy xizmatdan uzildi');
        return;
      }
      await disconnectReceiptDevice();
      setConnected(false);
      toast('Chek apparati uzildi');
    } catch (error) {
      console.error('Printer uzishda xato:', error);
      toast('Printer uzishda xato: ' + (error?.message || 'Nomaʼlum xato'));
    } finally {
      setBusy(false);
    }
  }

  /*
    SINOV CHEKI
  */
  async function testPrint() {
    if (!effectiveConnected) {
      toast('Avval chek apparatini ulang');
      return;
    }

    const sale = {
      items: [
        { name: 'Non', price: 4000, qty: 2 },
        { name: 'Sut 1L', price: 12000, qty: 1 },
      ],
      total: 20000,
      base_total: 20000,
      negotiated: false,
      type: 'naqt',
      status: 'yopilgan',
      created_at: new Date().toISOString(),
    };

    if (form.conn_type === 'local') {
      try {
        const bytes = buildReceiptEscPosBytes(sale);
        await printViaLocalService(form.printer_name, bytes);
        toast('Sinov cheki printerga yuborildi');
      } catch (error) {
        toast('Xatolik: ' + (error?.message || 'Nomaʼlum xato'));
      }
      return;
    }

    setTestSale(sale);
  }

  /*
    ULASH TURI O'ZGARISHI
  */
  function handleConnectionTypeChange(value) {
    setForm({ ...form, conn_type: value });
    if (connected && form.conn_type !== 'local') {
      disconnectReceiptDevice()
        .then(() => setConnected(false))
        .catch((error) => console.error(error));
    } else if (connected) {
      setConnected(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Chek chiqarish apparati</h1>
          <div className="page-sub">
            Chekni brauzer oynasi orqali emas, ulangan ESC/POS apparatga to'g'ridan-to'g'ri yuborish
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card pad">
          <div className="section-title">
            <span className={'status-dot ' + (effectiveConnected ? 'on' : 'off')}></span>
            {effectiveConnected ? 'Apparat ulangan' : 'Apparat ulanmagan'}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Qurilma nomi</label>
              <input
                value={form.printer_name}
                onChange={(e) => setForm({ ...form, printer_name: e.target.value })}
                placeholder="Masalan: Chek apparati / Xprinter XP-58"
                disabled={form.conn_type === 'local'}
              />
            </div>

            <div className="field">
              <label>Ulanish turi</label>
              <select value={form.conn_type} onChange={(e) => handleConnectionTypeChange(e.target.value)}>
                <option value="usb">USB printer (WebUSB / ESC-POS)</option>
                <option value="serial">USB / Serial (Web Serial)</option>
                <option value="local">Mahalliy chop etish xizmati (server.js)</option>
              </select>
            </div>

            {form.conn_type === 'serial' && (
              <div className="field">
                <label>Baud rate</label>
                <select
                  value={form.baud_rate}
                  onChange={(e) => setForm({ ...form, baud_rate: Number(e.target.value) })}
                >
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
              </div>
            )}

            {form.conn_type === 'local' && (
              <div className="field">
                <label>Windows printeri</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={form.printer_name}
                    onChange={(e) => setForm({ ...form, printer_name: e.target.value })}
                    style={{ flex: 1 }}
                    disabled={!localPrinters.length && !form.printer_name}
                  >
                    <option value="">— printerni tanlang —</option>
                    {form.printer_name && !localPrinters.some((p) => p.name === form.printer_name) && (
                      <option value={form.printer_name}>{form.printer_name} (saqlangan)</option>
                    )}
                    {localPrinters.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline btn-sm" onClick={refreshLocalPrinters} disabled={checkingLocal}>
                    {checkingLocal ? '...' : 'Yangilash'}
                  </button>
                </div>
              </div>
            )}

            {form.conn_type !== 'local' && (
              <div className="field">
                <label>IP manzil (tarmoq apparati bo'lsa)</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="192.168.1.50"
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="submit" className="btn btn-outline btn-block" disabled={busy}>
                Sozlamalarni saqlash
              </button>
              {effectiveConnected ? (
                <button type="button" className="btn btn-outline btn-block" onClick={handleDisconnect} disabled={busy}>
                  {busy ? 'Uzilmoqda...' : 'Apparatni uzish'}
                </button>
              ) : (
                <button type="button" className="btn btn-gold btn-block" onClick={handleConnect} disabled={busy}>
                  {busy ? 'Ulanmoqda...' : 'Apparatni ulash'}
                </button>
              )}
            </div>
          </form>

          {form.conn_type === 'usb' && (
            <div className="hint-box">
              Bu rejim ESC/POS buyruqlarini USB orqali printerga yuborishga harakat qiladi.
              <br /><br />
              <b>USB printer ulash:</b>
              <br />
              "Apparatni ulash" tugmasini bosing va Chrome oynasidan chek printeringizni tanlang.
            </div>
          )}

          {form.conn_type === 'serial' && (
            <div className="hint-box">
              Bu rejim chekni <b>Web Serial API</b> orqali yuboradi.
              <br /><br />
              USB-Serial adapter yoki COM port sifatida ko'rinadigan printerlar uchun ishlatiladi.
            </div>
          )}

          {form.conn_type === 'local' && (
            <div className="hint-box">
              Bu rejim chekni <b>brauzerdan emas</b>, kompyuteringizda ishlaydigan mahalliy xizmat
              (<code>server.js</code>) orqali, printer drayverining o'zi bilan chop etadi — shuning
              uchun drayver o'rnatilgan bo'lishi bu yerda muammo emas, aksincha talab qilinadi.
              <br /><br />
              <b>Ishga tushirish:</b> kompyuterda loyiha papkasini oching va terminalda:
              <br />
              <code>npm run printer</code>
              <br /><br />
              {localServiceUp === false && (
                <span style={{ color: 'var(--rust)' }}>Xizmat topilmadi — yuqoridagi buyruqni ishga tushirganingizga ishonch hosil qiling, so'ng "Yangilash" bosing.</span>
              )}
              {localServiceUp === true && (
                <span style={{ color: 'var(--green)' }}>Xizmat ishlamoqda — {localPrinters.length} ta printer topildi.</span>
              )}
            </div>
          )}

          {form.conn_type === 'usb' && !isWebUSBSupported() && (
            <div className="hint-box" style={{ marginTop: 10 }}>
              Brauzeringiz WebUSB'ni qo'llab-quvvatlamaydi. Chrome yoki Edge'da localhost orqali oching.
            </div>
          )}

          {form.conn_type === 'serial' && !isWebSerialSupported() && (
            <div className="hint-box" style={{ marginTop: 10 }}>
              Brauzeringiz Web Serial'ni qo'llab-quvvatlamaydi. Chrome yoki Edge'da localhost orqali oching.
            </div>
          )}

          {form.conn_type === 'usb' && (
            <div className="hint-box" style={{ marginTop: 10 }}>
              Agar <b>"Access denied"</b> xatosi chiqsa, Windows printer drayveri USB qurilmani band
              qilgan bo'lishi mumkin — bu holda "Mahalliy chop etish xizmati" rejimiga o'ting.
            </div>
          )}
        </div>

        <div className="card pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
          <div className="section-title" style={{ margin: 0 }}>Apparatdan sinov cheki</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
            Avval apparatni ulang.
            <br />
            {form.conn_type === 'local'
              ? 'Keyin "Sinov chekini chiqarish" tugmasini bosing — chek to\'g\'ridan-to\'g\'ri printerga yuboriladi.'
              : <>Keyin sinov chekini ochib,<br />"Apparatga chiqarish" tugmasini bosing.</>}
          </div>
          <button className="btn btn-gold" onClick={testPrint} disabled={!effectiveConnected}>
            Sinov chekini chiqarish
          </button>
        </div>
      </div>

      {testSale && <ReceiptModal sale={testSale} onClose={() => setTestSale(null)} />}
    </>
  );
}
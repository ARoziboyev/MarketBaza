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
} from '../lib/receiptDevice';

export default function Printer() {
  const {
    settings,
    savePrinterSettings,
    toast,
  } = useData();

  const [form, setForm] = useState({
    printer_name: '',
    conn_type: 'usb',
    address: '',
    baud_rate: 9600,
  });

  const [testSale, setTestSale] = useState(null);

  const [connected, setConnected] = useState(false);

  const [busy, setBusy] = useState(false);

  /*
    Sozlamalarni yuklash
  */

  useEffect(() => {
    setForm({
      printer_name:
        settings?.printer_name || '',

      conn_type:
        settings?.conn_type || 'usb',

      address:
        settings?.address || '',

      baud_rate:
        settings?.baud_rate || 9600,
    });
  }, [settings]);

  /*
    Printer holatini tekshirish
  */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isReceiptDeviceConnected()) {
        setConnected(true);
        return;
      }

      /*
        BUG FIX: sahifa yangilanganda (F5) modul
        xotirasi tozalanadi va printer "ulanmagan"
        bo'lib qoladi, garchi foydalanuvchi avval
        WebUSB ruxsatini bergan bo'lsa ham. Avval
        ruxsat berilgan USB printerni foydalanuvchi
        harakatisiz (picker chiqmasdan) qayta ulashga
        harakat qilamiz.
      */

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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    Sozlamalarni saqlash
  */

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await savePrinterSettings(form);

      toast(
        'Printer sozlamalari saqlandi'
      );
    } catch (error) {
      console.error(error);

      toast(
        'Sozlamalarni saqlashda xato: ' +
          (error?.message || 'Nomaʼlum xato')
      );
    }
  }

  /*
    APPARATNI ULASH
  */

  async function handleConnect() {
    setBusy(true);

    try {
      /*
        USB rejimi
      */

      if (form.conn_type === 'usb') {
        if (!isWebUSBSupported()) {
          toast(
            'Brauzeringiz WebUSB ni qo‘llab-quvvatlamaydi. Chrome yoki Edge ishlating.'
          );

          return;
        }

        await connectReceiptDevice({
          connection: 'usb',
        });
      }

      /*
        SERIAL rejimi
      */

      else {
        if (!isWebSerialSupported()) {
          toast(
            'Brauzeringiz Web Serial API ni qo‘llab-quvvatlamaydi. Chrome yoki Edge ishlating.'
          );

          return;
        }

        await connectReceiptDevice({
          connection: 'serial',
          baudRate: form.baud_rate,
        });
      }

      setConnected(true);

      /*
        Sozlamani saqlaymiz
      */

      await savePrinterSettings({
        ...form,

        saved_at:
          new Date().toISOString(),
      });

      toast(
        'Chek apparati muvaffaqiyatli ulandi'
      );
    } catch (error) {
      console.error(
        'Printer ulashda xato:',
        error
      );

      setConnected(false);

      let message =
        error?.message ||
        'Nomaʼlum xato';

      /*
        WebUSB Access denied
      */

      if (
        message
          .toLowerCase()
          .includes('access denied')
      ) {
        message =
          'USB printerga kirish rad etildi. Windows printer drayveri qurilmani ishlatayotgan bo‘lishi mumkin.';
      }

      toast(
        'Printer ulanmadi: ' +
          message
      );
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
      await disconnectReceiptDevice();

      setConnected(false);

      toast(
        'Chek apparati uzildi'
      );
    } catch (error) {
      console.error(
        'Printer uzishda xato:',
        error
      );

      toast(
        'Printer uzishda xato: ' +
          (error?.message || 'Nomaʼlum xato')
      );
    } finally {
      setBusy(false);
    }
  }

  /*
    SINOV CHEKI
  */

  function testPrint() {
    if (!connected) {
      toast(
        'Avval chek apparatini ulang'
      );

      return;
    }

    setTestSale({
      items: [
        {
          name: 'Non',
          price: 4000,
          qty: 2,
        },

        {
          name: 'Sut 1L',
          price: 12000,
          qty: 1,
        },
      ],

      total: 20000,

      base_total: 20000,

      negotiated: false,

      type: 'naqt',

      status: 'yopilgan',

      created_at:
        new Date().toISOString(),
    });
  }

  /*
    ULASH TURI O'ZGARISHI
  */

  function handleConnectionTypeChange(
    value
  ) {
    setForm({
      ...form,
      conn_type: value,
    });

    /*
      Agar ulangan printer bo'lsa,
      rejimni almashtirganda avtomatik
      uzamiz.
    */

    if (connected) {
      disconnectReceiptDevice()
        .then(() => {
          setConnected(false);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            Chek chiqarish apparati
          </h1>

          <div className="page-sub">
            Chekni brauzer oynasi orqali emas,
            ulangan ESC/POS apparatga
            to'g'ridan-to'g'ri yuborish
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* =====================================================
            APPARAT SOZLAMALARI
        ===================================================== */}

        <div className="card pad">
          <div className="section-title">
            <span
              className={
                'status-dot ' +
                (connected
                  ? 'on'
                  : 'off')
              }
            ></span>

            {connected
              ? 'Apparat ulangan'
              : 'Apparat ulanmagan'}
          </div>

          <form onSubmit={handleSubmit}>
            {/* QURILMA NOMI */}

            <div className="field">
              <label>
                Qurilma nomi
              </label>

              <input
                value={
                  form.printer_name
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    printer_name:
                      e.target.value,
                  })
                }
                placeholder="Masalan: Chek apparati / Xprinter XP-58"
              />
            </div>

            {/* ULANISH TURI */}

            <div className="field">
              <label>
                Ulanish turi
              </label>

              <select
                value={
                  form.conn_type
                }
                onChange={(e) =>
                  handleConnectionTypeChange(
                    e.target.value
                  )
                }
              >
                <option value="usb">
                  USB printer (WebUSB / ESC-POS)
                </option>

                <option value="serial">
                  USB / Serial (Web Serial)
                </option>
              </select>
            </div>

            {/* BAUD RATE */}

            {form.conn_type ===
              'serial' && (
              <div className="field">
                <label>
                  Baud rate
                </label>

                <select
                  value={
                    form.baud_rate
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      baud_rate:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                >
                  <option value="9600">
                    9600
                  </option>

                  <option value="19200">
                    19200
                  </option>

                  <option value="38400">
                    38400
                  </option>

                  <option value="57600">
                    57600
                  </option>

                  <option value="115200">
                    115200
                  </option>
                </select>
              </div>
            )}

            {/* IP MANZIL */}

            <div className="field">
              <label>
                IP manzil (tarmoq apparati
                bo'lsa)
              </label>

              <input
                value={
                  form.address
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    address:
                      e.target.value,
                  })
                }
                placeholder="192.168.1.50"
              />
            </div>

            {/* TUGMALAR */}

            <div
              style={{
                display: 'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap: 10,
              }}
            >
              <button
                type="submit"
                className="btn btn-outline btn-block"
                disabled={busy}
              >
                Sozlamalarni saqlash
              </button>

              {connected ? (
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={
                    handleDisconnect
                  }
                  disabled={busy}
                >
                  {busy
                    ? 'Uzilmoqda...'
                    : 'Apparatni uzish'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-gold btn-block"
                  onClick={
                    handleConnect
                  }
                  disabled={busy}
                >
                  {busy
                    ? 'Ulanmoqda...'
                    : 'Apparatni ulash'}
                </button>
              )}
            </div>
          </form>

          {/* =================================================
              USB TUSHUNTIRISH
          ================================================= */}

          {form.conn_type ===
            'usb' && (
            <div className="hint-box">
              Bu rejim ESC/POS buyruqlarini
              USB orqali printerga yuborishga
              harakat qiladi.

              <br />

              <br />

              <b>
                USB printer ulash:
              </b>

              <br />

              "Apparatni ulash" tugmasini
              bosing va Chrome oynasidan
              chek printeringizni tanlang.
            </div>
          )}

          {/* =================================================
              SERIAL TUSHUNTIRISH
          ================================================= */}

          {form.conn_type ===
            'serial' && (
            <div className="hint-box">
              Bu rejim chekni
              <b>
                Web Serial API
              </b>
              orqali yuboradi.

              <br />

              <br />

              USB-Serial adapter yoki
              COM port sifatida ko'rinadigan
              printerlar uchun ishlatiladi.
            </div>
          )}

          {/* WEBUSB SUPPORT */}

          {form.conn_type ===
            'usb' &&
            !isWebUSBSupported() && (
              <div
                className="hint-box"
                style={{
                  marginTop: 10,
                }}
              >
                Brauzeringiz WebUSB'ni
                qo'llab-quvvatlamaydi.
                Chrome yoki Edge'da
                localhost orqali oching.
              </div>
            )}

          {/* WEBSERIAL SUPPORT */}

          {form.conn_type ===
            'serial' &&
            !isWebSerialSupported() && (
              <div
                className="hint-box"
                style={{
                  marginTop: 10,
                }}
              >
                Brauzeringiz Web Serial'ni
                qo'llab-quvvatlamaydi.
                Chrome yoki Edge'da
                localhost orqali oching.
              </div>
            )}

          {/* ACCESS DENIED ESLATMA */}

          {form.conn_type ===
            'usb' && (
            <div
              className="hint-box"
              style={{
                marginTop: 10,
              }}
            >
              Agar{' '}
              <b>
                "Access denied"
              </b>{' '}
              xatosi chiqsa, Windows
              printer drayveri USB
              qurilmani band qilgan bo'lishi
              mumkin.
            </div>
          )}
        </div>

        {/* =====================================================
            SINOV CHEKI
        ===================================================== */}

        <div
          className="card pad"
          style={{
            display: 'flex',

            flexDirection: 'column',

            alignItems: 'center',

            justifyContent:
              'center',

            textAlign: 'center',

            gap: 14,
          }}
        >
          <div
            className="section-title"
            style={{
              margin: 0,
            }}
          >
            Apparatdan sinov cheki
          </div>

          <div
            style={{
              color:
                'var(--ink-soft)',

              fontSize: 13,
            }}
          >
            Avval apparatni ulang.

            <br />

            Keyin sinov chekini ochib,

            <br />

            "Apparatga chiqarish"
            tugmasini bosing.
          </div>

          <button
            className="btn btn-gold"
            onClick={testPrint}
            disabled={!connected}
          >
            Sinov chekini chiqarish
          </button>
        </div>
      </div>

      {/* =====================================================
          RECEIPT MODAL
      ===================================================== */}

      {testSale && (
        <ReceiptModal
          sale={testSale}
          onClose={() =>
            setTestSale(null)
          }
        />
      )}
    </>
  );
}
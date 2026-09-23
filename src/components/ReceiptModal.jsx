import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { fmt, fmtDate } from '../lib/format';
import { receiptText } from '../lib/receipt';
import { useData } from '../context/DataContext';

import {
  isReceiptDeviceConnected,
  printReceiptToDevice,
  buildReceiptEscPosBytes,
} from '../lib/receiptDevice';

import { printViaLocalService } from '../lib/localPrintService';

export default function ReceiptModal({
  sale,
  onClose,
}) {
  const { settings } = useData();
  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState('');

  if (!sale) {
    return null;
  }

  const items = sale.items || [];
  const isCredit = sale.type === 'nasiya';

  async function handleDevicePrint() {
    /*
      "Mahalliy chop etish xizmati" rejimi tanlangan bo'lsa,
      WebUSB/Serial holatini tekshirmasdan to'g'ridan-to'g'ri
      server.js orqali yuboramiz — chunki bu rejimda "ulanish"
      shunchaki xizmat ishga tushganini va printer tanlanganini
      bildiradi, WebUSB obyekti umuman ishlatilmaydi.
    */
    if (settings?.conn_type === 'local') {
      if (!settings?.printer_name) {
        setPrintMessage("Xatolik: avval Chek chiqarish bo'limida printerni tanlang.");
        return;
      }
      setPrinting(true);
      setPrintMessage('');
      try {
        const bytes = buildReceiptEscPosBytes(sale);
        await printViaLocalService(settings.printer_name, bytes);
        setPrintMessage('Chek printerga yuborildi.');
      } catch (error) {
        setPrintMessage('Xatolik: ' + error.message);
      } finally {
        setPrinting(false);
      }
      return;
    }

    if (!isReceiptDeviceConnected()) {
      setPrintMessage(
        "Avval Chek chiqarish apparati bo'limidan apparatni ulang."
      );

      return;
    }

    setPrinting(true);
    setPrintMessage('');

    try {
      await printReceiptToDevice(sale);

      setPrintMessage(
        'Chek apparatga yuborildi.'
      );
    } catch (error) {
      setPrintMessage(
        'Xatolik: ' + error.message
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-box"
        id="print-area"
      >

        {/* CHEK HEADER */}

        <div className="receipt-head">
          <div className="rh-brand">
            MarketBaza
          </div>

          <div className="rh-meta">
            {fmtDate(
              sale.created_at,
              true
            )}

            {' · '}

            {isCredit
              ? 'Nasiya'
              : 'Naqt pul'}
          </div>
        </div>

        {/* MAHSULOTLAR */}

        <div className="receipt-items">

          {items.map((item, index) => (
            <div
              className="receipt-item"
              key={index}
            >
              <span>
                {item.name} ×{item.qty}
              </span>

              <span className="mono-num">
                {fmt(
                  item.price * item.qty
                )}
              </span>
            </div>
          ))}

          {/* KELISHILGAN NARX */}

          {sale.negotiated && (
            <div className="receipt-item">
              <span>
                Kelishilgan narx
                {' '}
                (asl: {fmt(sale.base_total)})
              </span>

              <span></span>
            </div>
          )}

          {/* NASIYA XARIDORI */}

          {isCredit && (
            <div className="receipt-item">

              <span>
                Xaridor
              </span>

              <span>
                {sale.buyer_name}
                {' / '}
                {sale.buyer_phone}
              </span>

            </div>
          )}

        </div>

        {/* JAMI */}

        <div className="receipt-total">

          <span>
            Jami
          </span>

          <span>
            {fmt(sale.total)}
          </span>

        </div>

        {/* QR CODE */}

        <div className="receipt-qr">
          <QRCodeSVG
            value={receiptText(sale)}
            size={150}
            level="M"
          />
        </div>

        {/* BUTTONS */}

        <div className="modal-actions">

          <button
            className="btn btn-outline btn-block"
            onClick={onClose}
          >
            Yopish
          </button>

          <button
            className="btn btn-gold btn-block"
            disabled={printing}
            onClick={handleDevicePrint}
          >
            {printing
              ? 'Apparatga yuborilmoqda...'
              : 'Apparatga chiqarish'}
          </button>

        </div>

        {/* STATUS */}

        {printMessage && (
          <div
            style={{
              marginTop: 10,
              textAlign: 'center',
              fontSize: 12,

              color:
                printMessage.startsWith('Xatolik')
                  ? 'var(--rust)'
                  : 'var(--gold)',
            }}
          >
            {printMessage}
          </div>
        )}

      </div>
    </div>
  );
}
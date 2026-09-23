/*
  MarketBaza — mahalliy chop etish xizmati bilan ishlash

  Nega kerak:
  Agar Windows'da printer drayveri o'rnatilgan bo'lsa, WebUSB o'sha
  USB interfeysni OCHA OLMAYDI ("Access denied") — chunki drayver
  uni allaqachon band qilib turadi. Bu WebUSB'ning tabiiy cheklovi,
  MarketBaza kodidagi xato emas.

  Yechim: `server.js` (loyihaning ildizida) — brauzerdan chetda,
  kompyuterning o'zida ishlaydigan kichik Node/Express xizmat.
  U PowerShell orqali chekni to'g'ridan-to'g'ri O'RNATILGAN Windows
  printer drayveriga yuboradi — ya'ni drayverning band qilib turishi
  bu yo'l uchun muammo emas, aksincha talab qilinadi.

  Ishga tushirish: loyiha papkasida `npm run printer`
  (server http://127.0.0.1:17891 da ishlaydi).
*/

const BASE_URL = 'http://127.0.0.1:17891';

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function isLocalPrintServiceAvailable() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function listLocalPrinters() {
  const res = await fetch(`${BASE_URL}/printers`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.message || "Printerlar ro'yxatini olishda xatolik");
  }
  return data.printers || [];
}

export async function printViaLocalService(printerName, bytes) {
  if (!printerName) {
    throw new Error("Avval printer nomini tanlang");
  }
  const res = await fetch(`${BASE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerName, dataBase64: bytesToBase64(bytes) }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.message || 'Printerga chiqarishda xatolik');
  }
  return data;
}
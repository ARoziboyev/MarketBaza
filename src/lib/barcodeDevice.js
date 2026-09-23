/*
  MarketBaza — shtrix-kod yorliqlarini ESC/POS orqali chop etish

  Muhim: avvalgi usul brauzerning window.print() funksiyasidan
  foydalanardi — bu butun veb-sahifani (SVG rasm sifatida) printerga
  yuborardi. Ko'p chek/termal printerlar Windows'da "Generic / Text
  Only" drayveri bilan o'rnatilgani uchun ular veb-sahifani bosib
  chiqara olmaydi va o'rniga tushunarsiz belgilar chiqaradi.

  Bu fayl esa xuddi chek chiqarishda ishlatilgan usul bilan — ESC/POS
  RAW buyruqlari orqali — shtrix-kodni to'g'ridan-to'g'ri printerning
  o'ziga "buyruq" sifatida yuboradi, shuning uchun printer buni
  haqiqiy shtrix-kod sifatida bosib chiqaradi.
*/

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/*
  Qog'oz kengligi (dot birligida). Eng ko'p tarqalgan chek apparatlari:
  58mm rulon  ≈ 384 dot   (standart qiymat)
  80mm rulon  ≈ 576 dot
  Agar apparatingiz 80mm bo'lsa yoki shtrix-kod hali ham o'rtada
  chiqmasa, shu qiymatni 576 ga o'zgartiring.
*/
const PAPER_WIDTH_DOTS = 384;

function encodeText(text) {
  return new TextEncoder().encode(String(text ?? ''));
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  CUT: new Uint8Array([GS, 0x56, 0x00]),
};

function barcodeHeight(dots = 70) {
  return new Uint8Array([GS, 0x68, dots]); // GS h n
}
function barcodeWidth(n = 2) {
  return new Uint8Array([GS, 0x77, n]); // GS w n
}
function barcodeHriBelow() {
  return new Uint8Array([GS, 0x48, 0x02]); // GS H 2 — raqamlar chiziq ostida ko'rinadi
}
function setAbsolutePosition(dots) {
  // ESC $ nL nH — joriy qatorda chop etish boshlanadigan gorizontal
  // nuqtani qo'lda belgilaydi (0 = eng chap chet).
  const n = Math.max(0, Math.round(dots));
  const nL = n & 0xff;
  const nH = (n >> 8) & 0xff;
  return new Uint8Array([ESC, 0x24, nL, nH]);
}

function ean13Command(digits13) {
  // Function A: GS k m d1...d13 NUL  (m=2 => EAN13/JAN13)
  return concatBytes(new Uint8Array([GS, 0x6b, 0x02]), encodeText(digits13), new Uint8Array([0x00]));
}
function code39Command(text) {
  // Function A: GS k m d1...dn NUL  (m=4 => CODE39, harf/raqam qo'llab-quvvatlaydi)
  return concatBytes(new Uint8Array([GS, 0x6b, 0x04]), encodeText(text.toUpperCase()), new Uint8Array([0x00]));
}

function buildOneLabel({ name, price, code }) {
  const clean = String(code || '').trim();
  const isEan13 = /^\d{13}$/.test(clean);
  const moduleWidth = 2;

  const parts = [];
  parts.push(CMD.ALIGN_CENTER, CMD.BOLD_ON);
  parts.push(concatBytes(encodeText(String(name || '').slice(0, 32)), new Uint8Array([LF])));
  parts.push(CMD.BOLD_OFF);
  parts.push(barcodeWidth(moduleWidth), barcodeHeight(70), barcodeHriBelow());

  /*
    Ba'zi arzon/klon printerlar shtrix-kod (GS k) chop etishda
    "o'rtaga tekislash" (ESC a) buyrug'iga rioya qilmaydi va uni doim
    chap chetdan boshlaydi. Shu sabab shtrix-kod kengligini o'zimiz
    hisoblab, uni ESC $ (absolyut pozitsiya) orqali qo'lda sahifa
    o'rtasiga joylashtiramiz.
  */
  const barcodeWidthDots = isEan13
    ? 95 * moduleWidth // EAN13 — doim 95 modul
    : (clean.length + 2) * 13 * moduleWidth; // CODE39 — taxminiy kenglik
  const marginDots = Math.max(0, Math.floor((PAPER_WIDTH_DOTS - barcodeWidthDots) / 2));
  parts.push(setAbsolutePosition(marginDots));

  parts.push(isEan13 ? ean13Command(clean) : code39Command(clean || 'NOCODE'));
  parts.push(CMD.ALIGN_CENTER); // narxni qayta o'rtaga qaytarish uchun
  parts.push(new Uint8Array([LF]));
  parts.push(concatBytes(encodeText(String(price || '')), new Uint8Array([LF, LF])));
  return concatBytes(...parts);
}

/*
  Bir nechta (count ta) bir xil yorliqni, har biridan keyin kesish
  (CUT) buyrug'i bilan, bitta yaxlit ESC/POS oqimiga yig'adi — shu
  bilan bitta HTTP so'rovda hammasi chop etiladi.
*/
export function buildBarcodeLabelsEscPosBytes({ name, price, code, count = 1 }) {
  const one = buildOneLabel({ name, price, code });
  const parts = [CMD.INIT];
  const n = Math.max(1, Math.round(count) || 1);
  for (let i = 0; i < n; i++) {
    parts.push(one);
    parts.push(CMD.CUT);
  }
  return concatBytes(...parts);
}
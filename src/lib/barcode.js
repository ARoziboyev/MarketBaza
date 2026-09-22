// src/lib/barcode.js
// Mahsulot shtrix-kodlari bilan ishlash uchun yordamchi funksiyalar.

export function randomDigits(n) {
 let s = '';
 for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
 return s;
}

// EAN-13 uchun standart mod-10 tekshiruv raqami (check digit).
export function ean13CheckDigit(first12) {
 const digits = String(first12).split('').map(Number);
 const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
 const mod = sum % 10;
 return mod === 0 ? 0 : 10 - mod;
}

// GS1 "200-299" oralig'i do'kon ichida o'zi shtrix-kod chiqaradigan
// mahsulotlar uchun ajratilgan (in-store use) — shuning uchun bu yerda
// generatsiya qilingan kodlar haqiqiy ishlab chiqaruvchi kodlari bilan
// hech qachon to'qnashmaydi.
export function generateEan13(prefix = '20') {
 const body = (prefix + randomDigits(12 - prefix.length)).slice(0, 12);
 const check = ean13CheckDigit(body);
 return body + String(check);
}

// Qadoqdagi tayyor shtrix-kod (UPC-A, EAN-13, EAN-8) yoki o'zimiz
// yaratgan kod bo'lishi mumkin — uzunligiga qarab formatni aniqlaymiz.
export function detectBarcodeFormat(code) {
 const clean = String(code || '').trim();
 if (/^\d{13}$/.test(clean)) return 'EAN13';
 if (/^\d{12}$/.test(clean)) return 'UPC';
 if (/^\d{8}$/.test(clean)) return 'EAN8';
 return 'CODE128';
}

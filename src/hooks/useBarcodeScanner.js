// src/hooks/useBarcodeScanner.js
//
// DIQQAT: Deyarli barcha USB/Bluetooth shtrix-kod skanerlari
// "HID klaviatura" sifatida ishlaydi — ular Windows/brauzer uchun
// oddiy klaviaturadek ko'rinadi va shtrix-kodni juda tez (odatda
// 10-40 millisekund oralig'ida) "terib", oxirida Enter bosadi.
//
// Shu sababli bu turdagi apparatlar WebUSB yoki WebHID orqali alohida
// "ulash" tugmasi talab qilmaydi (aksincha, brauzerlar xavfsizlik
// sababli klaviatura-klass HID qurilmalarini WebHID'ga umuman
// bermaydi). Ular shunchaki USB portga ulanadi va darhol ishlay
// boshlaydi — "ulanish" jarayoni yo'q, chunki OS ularni klaviatura
// deb biladi.
//
// Shu yondashuv bilan biz butun sahifa bo'ylab klaviatura hodisalarini
// kuzatamiz va inson terishidan (sekinroq, notekis interval) apparat
// terishini (juda tez, deyarli bir xil interval) ajratib olamiz.

import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan, options = {}) {
  const {
    enabled = true,
    minLength = 4, // bundan qisqa ketma-ketlik shtrix-kod deb hisoblanmaydi
    maxKeyDelay = 60, // ms — ketma-ket belgilar orasidagi maksimal interval
    resetDelay = 300, // ms — shundan ko'p kutilsa, bufer tozalanadi
  } = options;

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;

    let buffer = '';
    let lastTime = 0;
    let fastStreak = 0; // ketma-ket "tez" bosilgan belgilar soni
    let resetTimer = null;

    function clearBuffer() {
      buffer = '';
      fastStreak = 0;
    }

    function handleKeyDown(e) {
      // Modifikator tugmalari (Shift, Ctrl...) bufer holatiga ta'sir qilmasin
      if (e.key.length > 1 && e.key !== 'Enter') return;

      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      clearTimeout(resetTimer);
      resetTimer = setTimeout(clearBuffer, resetDelay);

      if (e.key === 'Enter') {
        const code = buffer;
        const wasFast = fastStreak >= Math.max(minLength - 1, 3);
        clearBuffer();

        if (wasFast && code.length >= minLength) {
          // Bu skanerdan kelgan shtrix-kod — forma yuborilib
          // ketmasligi va fokusdagi maydonga yozilib qolmasligi uchun
          // to'xtatamiz.
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current?.(code);
        }
        return;
      }

      if (delta > maxKeyDelay) {
        // Interval katta bo'lsa — bu inson terishi, yangi buferdan boshlaymiz
        buffer = e.key;
        fastStreak = 0;
      } else {
        buffer += e.key;
        fastStreak += 1;
      }

      // Apparat terishi aniqlangan bo'lsa, belgi fokusdagi inputga
      // yozilib qolmasligi uchun to'xtatamiz.
      if (fastStreak >= 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // capture=true — hatto input/select fokusda bo'lsa ham eshitamiz
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(resetTimer);
    };
  }, [enabled, minLength, maxKeyDelay, resetDelay]);
}

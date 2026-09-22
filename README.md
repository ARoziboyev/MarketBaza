# MarketBaza (React + Supabase)

MarketBaza — market uchun mahsulot, savdo, nasiya, ombor va chek boshqaruv tizimi.

## 1. O'rnatish

```bash
npm install
npm run dev
```

Brauzer: `http://localhost:5173`

Production:

```bash
npm run build
npm run preview
```

## 2. MUHIM: Supabase bazasini bir marta yaratish

Agar brauzer konsolida quyidagi xato chiqsa:

```text
PGRST205: Could not find the table 'public.products' in the schema cache
```

bu React xatosi emas. Supabase'da jadvallar hali yaratilmagan.

### Qilish kerak:

1. Supabase Dashboard'ni oching.
2. Loyihangizni tanlang.
3. **SQL Editor** → **New query**.
4. Ushbu loyihadagi `supabase/schema.sql` faylining **hamma qismini** nusxalang.
5. SQL Editor'ga joylashtiring.
6. **Run** bosing.
7. Natijada quyidagi 3 ta jadval ko'rinishi kerak:
   - `products`
   - `sales`
   - `printer_settings`
8. MarketBaza sahifasini `Ctrl + R` bilan yangilang.

MarketBaza endi `PGRST205` xatosini ko'paytirib console'ni to'ldirmaydi; baza tayyor bo'lmasa, ekranda aniq sozlash oynasini ko'rsatadi.

## 3. .env

Loyihaning ildizida `.env` bo'lishi kerak:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

Supabase publishable/anon key frontendda ishlatiladi. **Service role key yoki database parolini frontendga qo'ymang.**

## 4. Konsoldagi xabarlar

`Download the React DevTools for a better development experience...` — development rejimidagi oddiy React xabari, xato emas.

`favicon.ico 404` — tuzatildi: loyiha endi `public/favicon.svg` ishlatadi.

`/rest/v1/products`, `/sales`, `/printer_settings` 404 va `PGRST205` — Supabase jadvallari yaratilmaganda chiqadi. `supabase/schema.sql`ni ishga tushirish bilan hal qilinadi.

## 5. Tuzilishi

```text
src/
  context/DataContext.jsx   — Supabase CRUD, realtime va baza holati
  components/               — UI komponentlari va baza sozlash oynasi
  pages/                    — 10 ta asosiy sahifa
  lib/                      — Supabase client, statistika, chek va formatlar
supabase/schema.sql         — kerakli Supabase jadvallari va policy'lar
public/favicon.svg          — sayt favicon'i
```

## 6. Muhim xavfsizlik eslatmasi

Hozirgi loyiha login talab qilmaydigan ichki market uchun sodda RLS policy'lar bilan keladi. Saytni umumiy internetga chiqarishdan oldin Supabase Auth va `auth.uid()` asosidagi RLS policy'larini qo'shish kerak.

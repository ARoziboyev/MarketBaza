import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext(null);

function isMissingTable(error) {
  return error?.code === 'PGRST205' || /could not find the table .* in the schema cache/i.test(error?.message || '');
}

function isMissingSchema(error) {
  return isMissingTable(error) || error?.code === '42P01';
}

export function DataProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState({ printer_name: '', conn_type: 'usb', address: '', saved_at: null });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('checking');
  const [dbError, setDbError] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2600);
  }, []);

  const handleDbError = useCallback((error, label) => {
    if (isMissingSchema(error)) {
      setDbStatus('missing');
      setDbError(error);
      return true;
    }
    console.error(label, error);
    setDbStatus('error');
    setDbError(error);
    return false;
  }, []);

  const fetchProducts = useCallback(async ({ notify = true } = {}) => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      if (!handleDbError(error, 'Products fetch error')) {
        if (notify) toast('Mahsulotlarni yuklashda xatolik: ' + error.message);
      }
      return { ok: false, error };
    }
    setProducts(data || []);
    return { ok: true, data: data || [] };
  }, [handleDbError, toast]);

  const fetchSales = useCallback(async ({ notify = true } = {}) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      if (!handleDbError(error, 'Sales fetch error')) {
        if (notify) toast('Savdolarni yuklashda xatolik: ' + error.message);
      }
      return { ok: false, error };
    }
    setSales(data || []);
    return { ok: true, data: data || [] };
  }, [handleDbError, toast]);

  const fetchSettings = useCallback(async ({ notify = true } = {}) => {
    const { data, error } = await supabase.from('printer_settings').select('*').eq('id', 1).maybeSingle();
    if (error) {
      if (!handleDbError(error, 'Printer settings fetch error') && notify) {
        console.error(error);
      }
      return { ok: false, error };
    }
    if (data) setSettings(data);
    return { ok: true, data };
  }, [handleDbError]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setDbStatus('checking');
      setDbError(null);

      // Check the schema in a predictable order. If the first table is missing,
      // do not fire more requests that would only create the same console noise.
      const productsResult = await fetchProducts({ notify: false });
      if (!alive) return;
      if (!productsResult.ok) {
        setLoading(false);
        return;
      }

      const salesResult = await fetchSales({ notify: false });
      if (!alive) return;
      if (!salesResult.ok) {
        setLoading(false);
        return;
      }

      const settingsResult = await fetchSettings({ notify: false });
      if (!alive) return;
      if (!settingsResult.ok) {
        setLoading(false);
        return;
      }

      setDbStatus('ready');
      setLoading(false);
    })();

    const channel = supabase
      .channel('marketbaza-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts({ notify: false }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchSales({ notify: false }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'printer_settings' }, () => fetchSettings({ notify: false }))
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [fetchProducts, fetchSales, fetchSettings]);

  const addProduct = useCallback(async (data) => {
    const { error } = await supabase.from('products').insert([data]);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchProducts();
    return true;
  }, [fetchProducts, toast]);

  const updateProduct = useCallback(async (id, data) => {
    const { error } = await supabase.from('products').update(data).eq('id', id);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchProducts();
    return true;
  }, [fetchProducts, toast]);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchProducts();
    return true;
  }, [fetchProducts, toast]);

  const setStockQty = useCallback(async (id, qty) => updateProduct(id, { qty }), [updateProduct]);

  const adjustStock = useCallback(async (id, delta) => {
    const p = products.find((x) => x.id === id);
    if (!p) return false;
    const newQty = Math.max(0, (p.qty || 0) + delta);
    return updateProduct(id, { qty: newQty });
  }, [products, updateProduct]);

  // items: [{productId,name,price,cost,qty,unit}]
  const addSale = useCallback(async ({ items, total, baseTotal, type, buyerName, buyerPhone }) => {
    const row = {
      items,
      total,
      base_total: baseTotal,
      negotiated: total !== baseTotal,
      type,
      buyer_name: buyerName || null,
      buyer_phone: buyerPhone || null,
      status: type === 'nasiya' ? 'kutilmoqda' : 'yopilgan',
    };
    const { data, error } = await supabase.from('sales').insert([row]).select().single();
    if (error) { toast('Sotishda xatolik: ' + error.message); return null; }

    for (const it of items) {
      const p = products.find((x) => x.id === it.productId);
      if (p) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ qty: Math.max(0, (p.qty || 0) - it.qty) })
          .eq('id', it.productId);
        if (stockError) {
          toast('Savdo saqlandi, lekin omborni yangilashda xatolik: ' + stockError.message);
        }
      }
    }
    await Promise.all([fetchProducts(), fetchSales()]);
    return data;
  }, [products, fetchProducts, fetchSales, toast]);

  const markCreditPaid = useCallback(async (id) => {
    const { error } = await supabase
      .from('sales')
      .update({ status: 'yopilgan', paid_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchSales();
    toast("Nasiya to'landi deb belgilandi va arxivga ko'chirildi");
    return true;
  }, [fetchSales, toast]);

  const savePrinterSettings = useCallback(async (data) => {
    const row = { id: 1, ...data, saved_at: new Date().toISOString() };
    const { error } = await supabase.from('printer_settings').upsert(row);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchSettings();
    toast('Printer sozlamalari saqlandi');
    return true;
  }, [fetchSettings, toast]);

  /*
    MA'LUMOTLARNI TOZALASH (Boshliq paneli / Nasiya arxivi uchun)
  */
  const clearAllProducts = useCallback(async () => {
    const { error } = await supabase.from('products').delete().not('id', 'is', null);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchProducts();
    toast("Barcha mahsulotlar o'chirildi");
    return true;
  }, [fetchProducts, toast]);

  const clearAllSales = useCallback(async () => {
    const { error } = await supabase.from('sales').delete().not('id', 'is', null);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchSales();
    toast("Barcha savdo tarixi o'chirildi");
    return true;
  }, [fetchSales, toast]);

  const clearCreditArchive = useCallback(async () => {
    const { error } = await supabase.from('sales').delete().eq('type', 'nasiya').eq('status', 'yopilgan');
    if (error) { toast('Xatolik: ' + error.message); return false; }
    await fetchSales();
    toast("Nasiya arxivi tozalandi");
    return true;
  }, [fetchSales, toast]);

  const resetPrinterSettings = useCallback(async () => {
    const { error } = await supabase.from('printer_settings').delete().eq('id', 1);
    if (error) { toast('Xatolik: ' + error.message); return false; }
    setSettings({ printer_name: '', conn_type: 'usb', address: '', saved_at: null });
    toast('Printer sozlamalari tozalandi');
    return true;
  }, [toast]);

  const value = {
    products, sales, settings, loading, dbStatus, dbError,
    addProduct, updateProduct, deleteProduct, setStockQty, adjustStock,
    addSale, markCreditPaid, savePrinterSettings,
    clearAllProducts, clearAllSales, clearCreditArchive, resetPrinterSettings,
    toast, toastMsg, toastVisible,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
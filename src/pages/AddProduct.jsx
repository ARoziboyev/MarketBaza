import { useState } from 'react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/format';
import { generateEan13 } from '../lib/barcode';

const emptyForm = { name: '', category: '', price: '', cost: '', qty: '', unit: 'dona', barcode: '' };

export default function AddProduct() {
  const { products, addProduct, updateProduct, deleteProduct, toast } = useData();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const price = parseFloat(form.price) || 0;
    if (!name || price <= 0) { toast("Nomi va narxini to'g'ri kiriting"); return; }
    const ok = await addProduct({
      name,
      category: form.category.trim() || 'Umumiy',
      price,
      cost: parseFloat(form.cost) || 0,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit.trim() || 'dona',
      barcode: form.barcode.trim() || null,
    });
    if (ok) { toast("Mahsulot qo'shildi: " + name); setForm(emptyForm); }
  }

  function openEdit(p) {
    setEditId(p.id);
    setEditForm({ name: p.name, category: p.category || '', price: p.price, cost: p.cost || 0, qty: p.qty, unit: p.unit || 'dona', barcode: p.barcode || '' });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const name = editForm.name.trim();
    const price = parseFloat(editForm.price) || 0;
    if (!name || price <= 0) { toast("Nomi va narxini to'g'ri kiriting"); return; }
    const ok = await updateProduct(editId, {
      name,
      category: editForm.category.trim() || 'Umumiy',
      price,
      cost: parseFloat(editForm.cost) || 0,
      qty: parseFloat(editForm.qty) || 0,
      unit: editForm.unit.trim() || 'dona',
      barcode: editForm.barcode.trim() || null,
    });
    if (ok) { toast('Mahsulot yangilandi: ' + name); setEditId(null); }
  }

  async function handleDelete(id) {
    if (!confirm("Bu mahsulotni o'chirasizmi?")) return;
    const ok = await deleteProduct(id);
    if (ok) toast("Mahsulot o'chirildi");
  }

  const recent = products.slice(0, 8);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Mahsulot qo'shish</h1>
          <div className="page-sub">Bazaga yangi mahsulot kiritish</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card pad">
          <form onSubmit={handleSubmit}>
            <div className="field"><label>Mahsulot nomi</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Masalan: Coca-Cola 1.5L" />
            </div>
            <div className="form-row">
              <div className="field"><label>Kategoriya</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ichimlik, oziq-ovqat..." />
              </div>
              <div className="field"><label>O'lchov birligi</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="dona, kg, litr" />
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Sotish narxi (so'm)</label>
                <input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="field"><label>Tannarxi (so'm)</label>
                <input type="number" min="0" step="1" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>Miqdori (ombordagi soni)</label>
              <input type="number" min="0" step="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
            </div>
            <div className="field"><label>Shtrix-kod (ixtiyoriy)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Qadoqdagi kodni kiriting yoki avtomatik yarating" style={{ flex: 1 }} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, barcode: generateEan13() })}>Avtomatik</button>
              </div>
            </div>
            <button type="submit" className="btn btn-gold btn-block">Bazaga qo'shish</button>
          </form>
        </div>

        <div className="card">
          <div className="pad" style={{ paddingBottom: 0 }}><div className="section-title">So'nggi qo'shilganlar</div></div>
          <div className="table-wrap">
            <table><tbody>
              <tr><th>Nomi</th><th>Kategoriya</th><th>Narxi</th><th>Miqdor</th><th></th></tr>
              {recent.length ? recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category || ''}</td>
                  <td className="mono-num">{fmt(p.price)}</td>
                  <td className="mono-num">{p.qty} {p.unit || ''}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Tahrirlash</button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(p.id)}>O'chirish</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="empty-state">Hali mahsulot yo'q</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>

      {editId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="pad">
              <div className="section-title" style={{ marginBottom: 16 }}>Mahsulotni tahrirlash</div>
              <form onSubmit={handleEditSubmit}>
                <div className="field"><label>Mahsulot nomi</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="field"><label>Kategoriya</label>
                    <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                  </div>
                  <div className="field"><label>O'lchov birligi</label>
                    <input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="field"><label>Sotish narxi (so'm)</label>
                    <input type="number" min="0" step="1" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
                  </div>
                  <div className="field"><label>Tannarxi (so'm)</label>
                    <input type="number" min="0" step="1" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} />
                  </div>
                </div>
                <div className="field"><label>Miqdori (ombordagi soni)</label>
                  <input type="number" min="0" step="1" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} required />
                </div>
                <div className="field"><label>Shtrix-kod (ixtiyoriy)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={editForm.barcode} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} style={{ flex: 1 }} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditForm({ ...editForm, barcode: generateEan13() })}>Avtomatik</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" className="btn btn-outline btn-block" onClick={() => setEditId(null)}>Bekor qilish</button>
                  <button type="submit" className="btn btn-gold btn-block">Saqlash</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

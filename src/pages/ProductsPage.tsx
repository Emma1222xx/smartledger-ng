import { useState, useEffect } from 'react';
import { Package, Plus, Search, Archive, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, toKobo, fromKobo } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/EmptyState';
import type { Product } from '@/types';

export function ProductsPage() {
  const { business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', selling_price: '', unit_cost: '', stock_qty: '0', low_stock_threshold: '5',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .order('name');
    if (err) setError(err.message);
    else setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [business]);

  const filtered = products.filter((p) =>
    !p.archived && p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku ?? '',
        selling_price: fromKobo(product.selling_price_kobo).toFixed(2),
        unit_cost: fromKobo(product.unit_cost_kobo).toFixed(2),
        stock_qty: String(product.stock_qty),
        low_stock_threshold: String(product.low_stock_threshold),
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', selling_price: '', unit_cost: '', stock_qty: '0', low_stock_threshold: '5' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!business) return;
    const trimmed = formData.name.trim();
    if (!trimmed) { setError('Product name is required.'); return; }
    if (trimmed.length > 200) { setError('Product name must be under 200 characters.'); return; }

    const sellingPrice = parseFloat(formData.selling_price || '0');
    const unitCost = parseFloat(formData.unit_cost || '0');
    const stockQty = parseInt(formData.stock_qty || '0', 10);
    const lowStock = parseInt(formData.low_stock_threshold || '5', 10);

    if (sellingPrice < 0 || unitCost < 0 || stockQty < 0 || lowStock < 0) {
      setError('Prices and quantities cannot be negative.');
      return;
    }

    setSaving(true);
    setError('');

    if (editingProduct) {
      const { error: err } = await supabase
        .from('products')
        .update({
          name: trimmed,
          sku: formData.sku.trim() || null,
          selling_price_kobo: toKobo(sellingPrice),
          unit_cost_kobo: toKobo(unitCost),
          stock_qty: stockQty,
          low_stock_threshold: lowStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProduct.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('products').insert({
        business_id: business.id,
        name: trimmed,
        sku: formData.sku.trim() || null,
        selling_price_kobo: toKobo(sellingPrice),
        unit_cost_kobo: toKobo(unitCost),
        stock_qty: stockQty,
        low_stock_threshold: lowStock,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleArchive = async (product: Product) => {
    const { error: err } = await supabase
      .from('products')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', product.id);
    if (err) setError(err.message);
    else load();
  };

  if (!business) return null;
  if (loading) return <LoadingState />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Products & Inventory</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Add product
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          className="input pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="No products found"
          message="Add your first product to get started."
          action={
            <button className="btn-primary" onClick={() => openModal()}>
              <Plus size={18} /> Add product
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.sku && `SKU: ${p.sku} • `}
                  Stock: <strong>{p.stock_qty}</strong>
                  {p.stock_qty <= p.low_stock_threshold && (
                    <span className="ml-1 badge-red">Low stock</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatNaira(p.selling_price_kobo)}</p>
                <p className="text-xs text-gray-500">Cost: {formatNaira(p.unit_cost_kobo)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(p)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleArchive(p)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                  <Archive size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit product' : 'Add product'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <Package size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Product name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Indomie Chicken 70g"
                />
              </div>
              <div>
                <label className="label">SKU / Barcode (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. IDM-CH-70"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Selling price (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Unit cost (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Current stock</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Low stock threshold</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

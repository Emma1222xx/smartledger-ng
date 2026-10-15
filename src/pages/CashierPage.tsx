import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, toKobo, fromKobo } from '@/lib/utils';
import { LoadingState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Product, Customer, PaymentMethod } from '@/types';

interface CartItem {
  product: Product;
  qty: number;
}

export function CashierPage() {
  const { business, user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!business) return;
    Promise.all([
      supabase.from('products').select('*').eq('business_id', business.id).eq('archived', false).order('name'),
      supabase.from('customers').select('*').eq('business_id', business.id).order('name'),
    ]).then(([p, c]) => {
      if (p.data) setProducts(p.data);
      if (c.data) setCustomers(c.data);
      setLoading(false);
    });
  }, [business]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) {
      setCart(cart.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((i) => (i.product.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const totalKobo = cart.reduce((sum, i) => sum + i.product.selling_price_kobo * i.qty, 0);

  const handleSave = async () => {
    if (!business || !user) return;
    if (cart.length === 0) { setError('Cart is empty.'); return; }

    for (const item of cart) {
      if (item.qty > item.product.stock_qty) {
        setError(`Insufficient stock for ${item.product.name}. Available: ${item.product.stock_qty}`);
        return;
      }
    }

    if (paymentMethod === 'credit' && !customerId && !customerName.trim()) {
      setError('Credit sales require a customer name or selection.');
      return;
    }

    const received = paymentMethod === 'cash' ? toKobo(parseFloat(amountReceived || '0')) : totalKobo;
    if (paymentMethod === 'cash' && received < totalKobo) {
      setError('Amount received is less than total. Change calculation requires full payment.');
      return;
    }

    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError('');

    const saleId = crypto.randomUUID();
    const items = cart.map((i) => ({
      product_id: i.product.id,
      product_name_snapshot: i.product.name,
      qty: i.qty,
      unit_price_kobo: i.product.selling_price_kobo,
      unit_cost_kobo: i.product.unit_cost_kobo,
    }));

    const received = paymentMethod === 'cash' ? toKobo(parseFloat(amountReceived || '0')) : totalKobo;
    const creditRemaining = paymentMethod === 'credit' ? totalKobo : 0;

    const { data: _, error: callError } = await supabase.rpc('create_sale', {
      p_id: saleId,
      p_customer_id: customerId,
      p_customer_name_snapshot: customerName.trim() || null,
      p_payment_method: paymentMethod,
      p_total_kobo: totalKobo,
      p_amount_paid_kobo: received,
      p_credit_remaining_kobo: creditRemaining,
      p_note: null,
      p_items: items,
    });

    setSaving(false);

    if (callError) {
      setError(callError.message);
      return;
    }

    navigate(`/receipt/${saleId}`);
  };

  const change = paymentMethod === 'cash' && amountReceived
    ? toKobo(parseFloat(amountReceived)) - totalKobo
    : 0;

  if (!business) return null;
  if (loading) return <LoadingState />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Cashier</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product search */}
        <div className="card p-4 space-y-3">
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
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No products found.</p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock_qty === 0}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      Stock: {p.stock_qty} {p.sku && `• SKU: ${p.sku}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-600 ml-2 flex-shrink-0">
                    {formatNaira(p.selling_price_kobo)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Cart + checkout */}
        <div className="card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ShoppingCart size={16} /> Cart ({cart.length})
          </h2>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Cart is empty. Select products to add.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{formatNaira(item.product.selling_price_kobo)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => changeQty(item.product.id, -1)}
                        className="p-1 text-gray-500 hover:bg-white rounded"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        onClick={() => changeQty(item.product.id, 1)}
                        disabled={item.qty >= item.product.stock_qty}
                        className="p-1 text-gray-500 hover:bg-white rounded disabled:opacity-50"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums w-20 text-right">
                      {formatNaira(item.product.selling_price_kobo * item.qty)}
                    </span>
                    <button onClick={() => removeItem(item.product.id)} className="text-red-500 hover:bg-white p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Subtotal</span>
                  <span className="font-bold text-gray-900 tabular-nums">{formatNaira(totalKobo)}</span>
                </div>

                <div>
                  <label className="label">Payment method</label>
                  <select
                    className="input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="pos">POS</option>
                    <option value="credit">Credit (pay later)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {paymentMethod === 'credit' && (
                  <div>
                    <label className="label">Customer</label>
                    <select
                      className="input mb-2"
                      value={customerId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerId(val || null);
                        if (val) {
                          const c = customers.find((x) => x.id === val);
                          if (c) setCustomerName(c.name);
                        }
                      }}
                    >
                      <option value="">— or enter name below —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {!customerId && (
                      <input
                        type="text"
                        placeholder="Customer name"
                        className="input"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="label">Amount received (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder={fromKobo(totalKobo).toFixed(2)}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                    {change > 0 && (
                      <p className="mt-1 text-xs text-green-700">Change: {formatNaira(change)}</p>
                    )}
                    {change < 0 && (
                      <p className="mt-1 text-xs text-red-600">Insufficient amount received</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setCart([])}
                    className="btn-secondary flex-1"
                    disabled={saving}
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary flex-1"
                    disabled={saving || cart.length === 0}
                  >
                    {saving ? 'Saving...' : `Complete sale (${formatNaira(totalKobo)})`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Confirm sale"
          message={`Complete this ${paymentMethod} sale for ${formatNaira(totalKobo)}?`}
          confirmLabel="Complete sale"
          onConfirm={confirmSave}
          onCancel={() => setShowConfirm(false)}
          loading={saving}
        />
      )}
    </div>
  );
}

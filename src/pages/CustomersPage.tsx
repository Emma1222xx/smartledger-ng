import { useState, useEffect } from 'react';
import { Users, Plus, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, toKobo, fromKobo } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/EmptyState';
import type { Customer } from '@/types';

export function CustomersPage() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('name');
    if (err) setError(err.message);
    else setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [business]);

  const handleAddCustomer = async () => {
    if (!business) return;
    const trimmed = formData.name.trim();
    if (!trimmed) { setError('Customer name is required.'); return; }
    if (trimmed.length > 120) { setError('Name must be under 120 characters.'); return; }

    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('customers').insert({
      business_id: business.id,
      name: trimmed,
      phone: formData.phone.trim() || null,
    });
    setSaving(false);

    if (err) { setError(err.message); return; }
    setShowModal(false);
    setFormData({ name: '', phone: '' });
    load();
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer) return;
    const amount = parseFloat(paymentAmount || '0');
    if (amount <= 0) { setError('Payment amount must be greater than zero.'); return; }
    const amountKobo = toKobo(amount);
    if (amountKobo > selectedCustomer.outstanding_balance_kobo) {
      setError('Payment exceeds outstanding balance.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: err } = await supabase.rpc('record_customer_payment', {
      p_customer_id: selectedCustomer.id,
      p_sale_id: null,
      p_amount_kobo: amountKobo,
      p_note: paymentNote.trim() || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }

    setSelectedCustomer(null);
    setPaymentAmount('');
    setPaymentNote('');
    load();
  };

  if (!business) return null;
  if (loading) return <LoadingState />;

  const withDebt = customers.filter((c) => c.outstanding_balance_kobo > 0);
  const totalDebt = withDebt.reduce((sum, c) => sum + c.outstanding_balance_kobo, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add customer
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {totalDebt > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="text-sm font-semibold text-amber-900">
            Total outstanding credit: {formatNaira(totalDebt)}
          </p>
          <p className="text-xs text-amber-700 mt-1">{withDebt.length} customer(s) with unpaid credit</p>
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No customers yet"
          message="Add customers to track credit sales and payments."
          action={
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Add customer
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
              </div>
              {c.outstanding_balance_kobo > 0 ? (
                <>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">{formatNaira(c.outstanding_balance_kobo)}</p>
                    <p className="text-xs text-gray-500">Owed</p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(c)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <DollarSign size={14} /> Record payment
                  </button>
                </>
              ) : (
                <span className="badge-green">Paid up</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add customer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <Users size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08012345678"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={handleAddCustomer} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Record payment</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <DollarSign size={20} />
              </button>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Outstanding: {formatNaira(selectedCustomer.outstanding_balance_kobo)}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Payment amount (₦) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={fromKobo(selectedCustomer.outstanding_balance_kobo)}
                  required
                  className="input"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Partial payment"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setSelectedCustomer(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={handleRecordPayment} disabled={saving}>
                {saving ? 'Recording...' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

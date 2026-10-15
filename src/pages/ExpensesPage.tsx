import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, toKobo, fromKobo, formatDate, todayLagos } from '@/lib/utils';
import { LoadingState, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export function ExpensesPage() {
  const { business, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'miscellaneous' as ExpenseCategory,
    date: todayLagos(),
    note: '',
    payment_method: 'cash' as PaymentMethod,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', business.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setExpenses(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [business]);

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        amount: fromKobo(expense.amount_kobo).toFixed(2),
        category: expense.category,
        date: expense.date,
        note: expense.note ?? '',
        payment_method: expense.payment_method,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        amount: '',
        category: 'miscellaneous',
        date: todayLagos(),
        note: '',
        payment_method: 'cash',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!business || !user) return;
    const amount = parseFloat(formData.amount || '0');
    if (amount <= 0) { setError('Amount must be greater than zero.'); return; }

    setSaving(true);
    setError('');

    if (editingExpense) {
      const { error: err } = await supabase
        .from('expenses')
        .update({
          amount_kobo: toKobo(amount),
          category: formData.category,
          date: formData.date,
          note: formData.note.trim() || null,
          payment_method: formData.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingExpense.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('expenses').insert({
        business_id: business.id,
        amount_kobo: toKobo(amount),
        category: formData.category,
        date: formData.date,
        note: formData.note.trim() || null,
        payment_method: formData.payment_method,
        created_by: user.id,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error: err } = await supabase.from('expenses').delete().eq('id', deleteConfirm.id);
    if (err) setError(err.message);
    setDeleteConfirm(null);
    load();
  };

  if (!business) return null;
  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Add expense
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="No expenses recorded"
          message="Track rent, utilities, salaries, and other business costs."
          action={
            <button className="btn-primary" onClick={() => openModal()}>
              <Plus size={18} /> Add expense
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 capitalize">{exp.category.replace('_', ' ')}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(exp.date)} • {exp.payment_method.replace('_', ' ')}
                  {exp.note && ` • ${exp.note}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-red-600">{formatNaira(exp.amount_kobo)}</span>
              {exp.created_by === user?.id && (
                <div className="flex gap-1">
                  <button onClick={() => openModal(exp)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm(exp)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingExpense ? 'Edit expense' : 'Add expense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <CreditCard size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Amount (₦) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={todayLagos()}
                />
              </div>
              <div>
                <label className="label">Payment method</label>
                <select
                  className="input"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="pos">POS</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Additional details"
                />
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

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete expense"
          message="This expense will be permanently removed from your records."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          destructive
        />
      )}
    </div>
  );
}

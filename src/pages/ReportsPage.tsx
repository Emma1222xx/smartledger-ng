import { useState, useEffect } from 'react';
import { BarChart2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, formatDate, todayLagos, startOfDayISO, endOfDayISO } from '@/lib/utils';
import { LoadingState } from '@/components/ui/EmptyState';
import type { Sale, Expense } from '@/types';

export function ReportsPage() {
  const { business } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(todayLagos());

  const load = async () => {
    if (!business) return;
    setLoading(true);
    setError('');

    const from = startOfDayISO(fromDate);
    const to = endOfDayISO(toDate);

    const [salesRes, expensesRes] = await Promise.all([
      supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('business_id', business.id)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('*')
        .eq('business_id', business.id)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false }),
    ]);

    if (salesRes.error || expensesRes.error) {
      setError(salesRes.error?.message ?? expensesRes.error?.message ?? 'Failed to load data');
    } else {
      setSales(salesRes.data ?? []);
      setExpenses(expensesRes.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [business]);

  const totalSalesKobo = sales.reduce((sum, s) => sum + s.total_kobo, 0);
  const totalExpensesKobo = expenses.reduce((sum, e) => sum + e.amount_kobo, 0);
  let cogsKobo = 0;
  for (const s of sales) {
    for (const item of (s.sale_items ?? [])) {
      cogsKobo += item.unit_cost_kobo * item.qty;
    }
  }
  const grossProfitKobo = totalSalesKobo - cogsKobo;
  const netProfitKobo = grossProfitKobo - totalExpensesKobo;

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Description', 'Amount (NGN)']];
    for (const s of sales) {
      rows.push([
        formatDate(s.created_at),
        'Sale',
        s.customer_name_snapshot ?? 'Walk-in',
        (s.total_kobo / 100).toFixed(2),
      ]);
    }
    for (const e of expenses) {
      rows.push([
        e.date,
        'Expense',
        e.category.replace('_', ' '),
        (-e.amount_kobo / 100).toFixed(2),
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartledger-report-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!business) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <button
          className="btn-secondary"
          onClick={exportCSV}
          disabled={sales.length === 0 && expenses.length === 0}
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-4 flex gap-4 items-end flex-wrap">
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input w-auto"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={todayLagos()}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input w-auto"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            max={todayLagos()}
          />
        </div>
        <button className="btn-primary" onClick={load}>
          Apply
        </button>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <strong>Keep your exports private.</strong> CSV files contain your business data. Do not share them publicly or upload to untrusted services.
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Sales revenue</p>
              <p className="mt-2 text-xl font-bold text-green-700">{formatNaira(totalSalesKobo)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Expenses</p>
              <p className="mt-2 text-xl font-bold text-red-600">{formatNaira(totalExpensesKobo)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Gross profit</p>
              <p className={`mt-2 text-xl font-bold ${grossProfitKobo >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatNaira(grossProfitKobo)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Est. net profit</p>
              <p className={`mt-2 text-xl font-bold ${netProfitKobo >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatNaira(netProfitKobo)}
              </p>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart2 size={16} /> Transactions ({sales.length + expenses.length})
            </h2>
            {sales.length === 0 && expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No transactions in this period.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...sales.map((s) => ({ type: 'sale' as const, data: s, date: s.created_at })),
                  ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: e.date }))]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.type === 'sale'
                            ? (item.data as Sale).customer_name_snapshot ?? 'Walk-in customer'
                            : (item.data as Expense).category.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(item.date)} • {item.type}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          item.type === 'sale' ? 'text-green-700' : 'text-red-600'
                        }`}
                      >
                        {item.type === 'sale' ? '+' : '−'}
                        {formatNaira(item.type === 'sale' ? (item.data as Sale).total_kobo : (item.data as Expense).amount_kobo)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

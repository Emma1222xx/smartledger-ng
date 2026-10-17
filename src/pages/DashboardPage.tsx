import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  CreditCard,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, formatDateTime, todayLagos, startOfDayISO, endOfDayISO } from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, ErrorState } from '@/components/ui/EmptyState';
import type { Sale } from '@/types';

type Range = 'today' | '7d' | '30d' | 'custom';

interface DashboardMetrics {
  totalSalesKobo: number;
  cashCollectedKobo: number;
  creditOutstandingKobo: number;
  totalExpensesKobo: number;
  grossProfitKobo: number;
  cogsKobo: number;
  lowStockCount: number;
  recentSales: Sale[];
}

function rangeToISO(range: Range, from?: string, to?: string) {
  const today = todayLagos();
  if (range === 'today') {
    return { from: startOfDayISO(today), to: endOfDayISO(today) };
  }
  if (range === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return { from: startOfDayISO(d.toISOString().slice(0, 10)), to: endOfDayISO(today) };
  }
  if (range === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return { from: startOfDayISO(d.toISOString().slice(0, 10)), to: endOfDayISO(today) };
  }
  return { from: startOfDayISO(from ?? today), to: endOfDayISO(to ?? today) };
}

export function DashboardPage() {
  const { business } = useAuth();
  const [range, setRange] = useState<Range>('today');
  const [customFrom, setCustomFrom] = useState(todayLagos());
  const [customTo, setCustomTo] = useState(todayLagos());
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!business) return;
    setLoading(true); setError('');

    const { from, to } = rangeToISO(range, customFrom, customTo);

    const [salesRes, expensesRes, customersRes, lowStockRes, recentRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total_kobo, amount_paid_kobo, credit_remaining_kobo, sale_items(unit_cost_kobo, qty)')
        .eq('business_id', business.id)
        .gte('created_at', from)
        .lte('created_at', to),
      supabase
        .from('expenses')
        .select('amount_kobo')
        .eq('business_id', business.id)
        .gte('date', from.slice(0, 10))
        .lte('date', to.slice(0, 10)),
      supabase
        .from('customers')
        .select('outstanding_balance_kobo')
        .eq('business_id', business.id)
        .gt('outstanding_balance_kobo', 0),
      supabase
        .from('products')
        .select('id')
        .eq('business_id', business.id)
        .eq('archived', false)
        .filter('stock_qty', 'lte', 'low_stock_threshold'),
      supabase
        .from('sales')
        .select('id, total_kobo, payment_method, customer_name_snapshot, created_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    if (salesRes.error || expensesRes.error) {
      setError(salesRes.error?.message ?? expensesRes.error?.message ?? 'Failed to load data');
      setLoading(false);
      return;
    }

    const sales = salesRes.data ?? [];
    let totalSales = 0, cashCollected = 0, cogs = 0;
    for (const s of sales) {
      totalSales += s.total_kobo;
      cashCollected += s.amount_paid_kobo;
      for (const item of (s.sale_items as { unit_cost_kobo: number; qty: number }[] ?? [])) {
        cogs += item.unit_cost_kobo * item.qty;
      }
    }
    const creditOut = (customersRes.data ?? []).reduce((a, c) => a + c.outstanding_balance_kobo, 0);
    const totalExp = (expensesRes.data ?? []).reduce((a, e) => a + e.amount_kobo, 0);

    setMetrics({
      totalSalesKobo: totalSales,
      cashCollectedKobo: cashCollected,
      creditOutstandingKobo: creditOut,
      totalExpensesKobo: totalExp,
      cogsKobo: cogs,
      grossProfitKobo: totalSales - cogs,
      lowStockCount: lowStockRes.data?.length ?? 0,
      recentSales: (recentRes.data ?? []) as Sale[],
    });
    setLoading(false);
  }, [business, range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  if (!business) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Business welcome panel after setup */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              🎉 Shop "{business.name}" is ready! You're all set to start selling.
            </p>
            <p className="text-xs text-green-700 mt-1">
              Complete your first sale using the Cashier page or explore your dashboard.
            </p>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{business.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['today', '7d', '30d', 'custom'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                range === r
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {range === 'custom' && (
        <div className="card p-4 flex gap-4 items-end flex-wrap">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-auto" value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)} max={todayLagos()} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-auto" value={customTo}
              onChange={(e) => setCustomTo(e.target.value)} max={todayLagos()} />
          </div>
          <button className="btn-primary" onClick={load}>Apply</button>
        </div>
      )}

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={load} />}

      {/* Welcome panel shown after shop setup */}
      {metrics && !loading && !error && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                🎉 Shop "{business.name}" is ready! You're all set to start selling.
              </p>
              <p className="text-xs text-green-700 mt-1">
                Complete your first sale using the Cashier page or explore your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {metrics && !loading && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              label="Sales Revenue"
              value={formatNaira(metrics.totalSalesKobo)}
              sub="Total invoiced (incl. credit)"
              color="green"
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label="Cash / Payments Received"
              value={formatNaira(metrics.cashCollectedKobo)}
              sub="Actually collected"
              color={metrics.cashCollectedKobo > 0 ? 'green' : 'default'}
              icon={<ShoppingCart size={18} />}
            />
            <StatCard
              label="Outstanding Credit"
              value={formatNaira(metrics.creditOutstandingKobo)}
              sub="Total owed by customers"
              color={metrics.creditOutstandingKobo > 0 ? 'amber' : 'default'}
              icon={<Users size={18} />}
            />
            <StatCard
              label="Expenses"
              value={formatNaira(metrics.totalExpensesKobo)}
              sub="Recorded costs"
              color={metrics.totalExpensesKobo > 0 ? 'red' : 'default'}
              icon={<CreditCard size={18} />}
            />
            <StatCard
              label="Est. Gross Profit"
              value={formatNaira(metrics.grossProfitKobo)}
              sub="Revenue − cost of goods sold"
              color={metrics.grossProfitKobo > 0 ? 'green' : 'red'}
              icon={<BarChart2 size={18} />}
            />
            <StatCard
              label="Low Stock Items"
              value={String(metrics.lowStockCount)}
              sub="Products at or below threshold"
              color={metrics.lowStockCount > 0 ? 'amber' : 'default'}
              icon={<Package size={18} />}
            />
          </div>

          {/* Profit note */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            <strong>How these numbers are calculated:</strong>{' '}
            Sales Revenue = total of all sale invoices (including credit sales) in the period.{' '}
            Cash/Payments Received = amounts actually collected (excludes unpaid credit).{' '}
            Est. Gross Profit = Sales Revenue − Cost of Goods Sold (unit costs × quantities); it does
            NOT deduct operating expenses. Est. Net Profit = Gross Profit − Expenses
            ({formatNaira(metrics.grossProfitKobo - metrics.totalExpensesKobo)}).{' '}
            These are estimates; consult an accountant for reliable financial reporting.
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { to: '/cashier', label: 'New Sale', icon: <ShoppingCart size={20} /> },
                { to: '/products?modal=add', label: 'Add Product', icon: <Package size={20} /> },
                { to: '/expenses?modal=add', label: 'Add Expense', icon: <CreditCard size={20} /> },
                { to: '/customers', label: 'Record Payment', icon: <Users size={20} /> },
              ].map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="card p-4 flex flex-col items-center gap-2 text-xs font-semibold text-gray-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors text-center"
                >
                  <span className="text-brand-600">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent sales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Recent transactions</h2>
              <Link to="/reports" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                View all <BarChart2 size={12} />
              </Link>
            </div>
            {metrics.recentSales.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-400">
                No transactions yet.{' '}
                <Link to="/cashier" className="text-brand-600 hover:underline">Record your first sale.</Link>
              </div>
            ) : (
              <div className="card divide-y divide-gray-100">
                {metrics.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sale.customer_name_snapshot ?? 'Walk-in customer'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(sale.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`badge-${
                          sale.payment_method === 'credit'
                            ? 'yellow'
                            : sale.payment_method === 'cash'
                            ? 'green'
                            : 'gray'
                        }`}
                      >
                        {sale.payment_method.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatNaira(sale.total_kobo)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add sale FAB (mobile) */}
          <Link
            to="/cashier"
            className="fixed right-4 bottom-20 lg:hidden btn-primary rounded-full w-14 h-14 shadow-lg p-0 flex items-center justify-center"
            aria-label="New sale"
          >
            <Plus size={24} />
          </Link>
        </>
      )}
    </div>
  );
}

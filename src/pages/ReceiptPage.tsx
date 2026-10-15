import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatNaira, formatDateTime } from '@/lib/utils';
import { LoadingState, ErrorState } from '@/components/ui/EmptyState';
import type { Sale } from '@/types';

export function ReceiptPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const { business } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!business || !saleId) return;
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('business_id', business.id)
      .eq('id', saleId)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setSale(data as Sale);
        setLoading(false);
      });
  }, [business, saleId]);

  if (!business) return null;
  if (loading) return <LoadingState message="Loading receipt..." />;
  if (error || !sale) return <ErrorState message={error || 'Receipt not found'} />;

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* Actions (hidden when printing) */}
        <div className="no-print flex gap-3">
          <Link to="/dashboard" className="btn-secondary">
            <ArrowLeft size={18} /> Back to dashboard
          </Link>
          <button onClick={handlePrint} className="btn-primary">
            <Printer size={18} /> Print receipt
          </button>
        </div>

        {/* Receipt */}
        <div className="card p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            {business.phone && <p className="text-sm text-gray-600 mt-1">{business.phone}</p>}
            {business.address && <p className="text-sm text-gray-600">{business.address}</p>}
            <p className="text-xs text-gray-500 mt-2">RECEIPT</p>
          </div>

          {/* Sale info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Date</p>
              <p className="font-medium text-gray-900">{formatDateTime(sale.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Receipt #</p>
              <p className="font-medium text-gray-900 truncate">{sale.id.slice(0, 8)}</p>
            </div>
            {sale.customer_name_snapshot && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Customer</p>
                <p className="font-medium text-gray-900">{sale.customer_name_snapshot}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-b py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold text-gray-700">Item</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Price</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.sale_items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{item.product_name_snapshot}</td>
                    <td className="py-2 text-right text-gray-700">{item.qty}</td>
                    <td className="py-2 text-right text-gray-700 tabular-nums">
                      {formatNaira(item.unit_price_kobo)}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900 tabular-nums">
                      {formatNaira(item.line_total_kobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal</span>
              <span className="font-semibold text-gray-900 tabular-nums">{formatNaira(sale.total_kobo)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900 tabular-nums">{formatNaira(sale.total_kobo)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-700">Payment method</span>
              <span className="font-medium text-gray-900 capitalize">
                {sale.payment_method.replace('_', ' ')}
              </span>
            </div>
            {sale.payment_method === 'cash' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount paid</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {formatNaira(sale.amount_paid_kobo)}
                  </span>
                </div>
                {sale.amount_paid_kobo > sale.total_kobo && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Change</span>
                    <span className="font-medium text-green-700 tabular-nums">
                      {formatNaira(sale.amount_paid_kobo - sale.total_kobo)}
                    </span>
                  </div>
                )}
              </>
            )}
            {sale.payment_method === 'credit' && sale.credit_remaining_kobo > 0 && (
              <div className="flex justify-between rounded-lg bg-amber-50 border border-amber-200 p-3 mt-2">
                <span className="font-semibold text-amber-900">Amount owed</span>
                <span className="font-bold text-amber-900 tabular-nums">
                  {formatNaira(sale.credit_remaining_kobo)}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">Thank you for your business!</p>
            <p className="text-xs text-gray-400 mt-2">Powered by SmartLedger NG</p>
          </div>
        </div>
      </div>
    </div>
  );
}

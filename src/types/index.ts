export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'credit' | 'other';
export type DebtStatus = 'open' | 'paid' | 'overdue';
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'transport'
  | 'supplies'
  | 'maintenance'
  | 'marketing'
  | 'miscellaneous';

export interface Business {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  selling_price_kobo: number;
  unit_cost_kobo: number;
  stock_qty: number;
  low_stock_threshold: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name_snapshot: string | null;
  payment_method: PaymentMethod;
  total_kobo: number;
  amount_paid_kobo: number;
  credit_remaining_kobo: number;
  note: string | null;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  qty: number;
  unit_price_kobo: number;
  unit_cost_kobo: number;
  line_total_kobo: number;
}

export interface Expense {
  id: string;
  business_id: string;
  amount_kobo: number;
  category: ExpenseCategory;
  date: string;
  note: string | null;
  payment_method: PaymentMethod;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  outstanding_balance_kobo: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayment {
  id: string;
  business_id: string;
  customer_id: string;
  sale_id: string | null;
  amount_kobo: number;
  note: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  business_id: string;
  product_id: string;
  qty_change: number;
  reason: string;
  reference_id: string | null;
  created_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

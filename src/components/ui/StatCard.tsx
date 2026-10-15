import { clsx } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'green' | 'red' | 'amber';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, color = 'default', icon }: StatCardProps) {
  const accent = {
    default: 'text-gray-900',
    green: 'text-green-700',
    red: 'text-red-600',
    amber: 'text-amber-600',
  }[color];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold tabular-nums', accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

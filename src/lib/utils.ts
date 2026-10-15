import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const LAGOS_TZ = 'Africa/Lagos';

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function fromKobo(kobo: number): number {
  return kobo / 100;
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(fromKobo(kobo));
}

export function formatDate(isoString: string): string {
  const date = parseISO(isoString);
  const zoned = toZonedTime(date, LAGOS_TZ);
  return format(zoned, 'dd MMM yyyy');
}

export function formatDateTime(isoString: string): string {
  const date = parseISO(isoString);
  const zoned = toZonedTime(date, LAGOS_TZ);
  return format(zoned, 'dd MMM yyyy, h:mm a');
}

export function formatRelative(isoString: string): string {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
}

export function todayLagos(): string {
  const now = new Date();
  const zoned = toZonedTime(now, LAGOS_TZ);
  return format(zoned, 'yyyy-MM-dd');
}

export function startOfDayISO(dateStr: string): string {
  return `${dateStr}T00:00:00+01:00`;
}

export function endOfDayISO(dateStr: string): string {
  return `${dateStr}T23:59:59+01:00`;
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

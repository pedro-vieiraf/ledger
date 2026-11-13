import type { AccountType } from '@/services/accounts-api';
import type { TransactionType } from '@/services/transactions-api';

const MONTH_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const fullMonthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const shortTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const AXIS_STEPS = [1, 2, 2.5, 5, 10] as const;

let compactCurrencyFormatter: Intl.NumberFormat | undefined;

function getCompactCurrencyFormatter() {
  compactCurrencyFormatter ??= new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return compactCurrencyFormatter;
}

export function formatCurrency(value: number, currency = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatCompactCurrency(value: number) {
  try {
    return getCompactCurrencyFormatter().format(value);
  } catch {
    return formatCurrency(value);
  }
}

export function buildCurrencyAxis(maxValue: number, targetTicks = 4) {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  const reference = safeMax || 100;
  const rawStep = reference / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = AXIS_STEPS.find((step) => normalized <= step) ?? 10;
  const step = niceStep * magnitude;
  const max = Math.ceil(reference / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }

  return { max, ticks };
}

export function formatSignedCurrency(value: number, currency = 'BRL') {
  const formatted = formatCurrency(Math.abs(value), currency);

  if (value > 0) {
    return `+ ${formatted}`;
  }

  if (value < 0) {
    return `− ${formatted}`;
  }

  return formatted;
}

export function formatMonthLabel(date: Date) {
  const formatted = fullMonthFormatter.format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatMonthShort(date: Date) {
  return MONTH_SHORT[date.getMonth()];
}

export function formatAccountType(type: AccountType) {
  return type === 'CHECKING' ? 'Conta corrente' : 'Poupança';
}

export function getDefaultTransactionDescription(type: TransactionType) {
  if (type === 'INCOME') return 'Receita';
  if (type === 'TRANSFER') return 'Transferência';
  return 'Despesa';
}

function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatTransactionDate(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const time = shortTimeFormatter.format(date);

  if (isSameLocalDay(date, now)) {
    return `Hoje, ${time}`;
  }

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );

  if (isSameLocalDay(date, yesterday)) {
    return `Ontem, ${time}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_SHORT[date.getMonth()];
  const year =
    date.getFullYear() !== now.getFullYear()
      ? ` ${date.getFullYear()}`
      : '';

  return `${day} ${month}${year}`;
}

import {
  formatIsoDate,
  formatDateParts,
} from '@/utils/date-time';
import type {
  Recurrence,
  RecurrenceFrequency,
} from '@/services/recurrences-api';

export const RECURRENCE_COLORS = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E7F0E9',
  text: '#202720',
  secondary: '#747C73',
  border: '#E7E9E2',
  income: '#27835B',
  incomeBackground: '#E8F5EC',
  expense: '#C6534B',
  expenseBackground: '#FBECE9',
  danger: '#B84D4D',
  dangerLight: '#F9EDEC',
  inactive: '#8A9188',
  inactiveBackground: '#F0F1ED',
};

export const FREQUENCY_OPTIONS: {
  label: string;
  value: RecurrenceFrequency;
}[] = [
  { label: 'Diária', value: 'DAILY' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Mensal', value: 'MONTHLY' },
  { label: 'Anual', value: 'YEARLY' },
];

export function frequencyLabel(frequency: RecurrenceFrequency) {
  return (
    FREQUENCY_OPTIONS.find((option) => option.value === frequency)
      ?.label ?? frequency
  );
}

export function recurrenceDescription(recurrence: Recurrence) {
  return (
    recurrence.description?.trim() ||
    (recurrence.type === 'INCOME'
      ? 'Receita recorrente'
      : 'Despesa recorrente')
  );
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

export function formatRecurrenceDate(value: string) {
  return formatIsoDate(value);
}

export function todayDateInput() {
  return formatDateParts(new Date());
}

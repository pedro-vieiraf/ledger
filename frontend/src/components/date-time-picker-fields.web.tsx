import { StyleSheet, View } from 'react-native';
import type { CSSProperties } from 'react';

import type { DateTimePickerFieldsProps } from './date-time-picker-fields';
import {
  formatDateParts,
  parseLocalDateTime,
} from '@/utils/date-time';

const COLORS = {
  surface: '#FFFFFF',
  text: '#202720',
  border: '#E7E9E2',
};

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

/** Formato exigido por `<input type="date">`: `AAAA-MM-DD`. */
function toIsoDateInput(date: Date) {
  return (
      `${date.getFullYear()}-` +
      `${padNumber(date.getMonth() + 1)}-` +
      `${padNumber(date.getDate())}`
  );
}

const dateInputStyle: CSSProperties = {
  flex: 2,
  minWidth: 0,
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 13,
  padding: '12px 14px',
  color: COLORS.text,
  fontSize: 14,
  fontFamily: 'inherit',
};

const timeInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  backgroundColor: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 13,
  padding: '12px 14px',
  color: COLORS.text,
  fontSize: 14,
  fontFamily: 'inherit',
};

/**
 * Campos de data e hora para a web usando os controles nativos do
 * navegador (`<input type="date">` e `<input type="time">`), que abrem o
 * calendário e o seletor de hora do próprio browser.
 */
export default function DateTimePickerFields(
    {
      date,
      time,
      onDateChange,
      onTimeChange,
    }: DateTimePickerFieldsProps,
) {
  const currentDate = parseLocalDateTime(date, '00:00');
  const parsedTime = parseLocalDateTime(date, time || '00:00');

  const handleDateChange = (value: string) => {
    // Input vazio = usuário limpou o campo; mantém o valor anterior.
    if (!value) {
      return;
    }

    const [year, month, day] = value.split('-').map(Number);

    onDateChange(formatDateParts(new Date(year, month - 1, day)));
  };

  const handleTimeChange = (value: string) => {
    if (!value) {
      return;
    }

    onTimeChange(value.slice(0, 5));
  };

  return (
      <View style={styles.row}>
        <input
            type="date"
            value={currentDate ? toIsoDateInput(currentDate) : ''}
            onChange={(event) => handleDateChange(event.target.value)}
            style={dateInputStyle}
            aria-label="Data da transação"
        />
        <input
            type="time"
            value={parsedTime
                ? `${padNumber(parsedTime.getHours())}:${padNumber(parsedTime.getMinutes())}`
                : ''}
            onChange={(event) => handleTimeChange(event.target.value)}
            style={timeInputStyle}
            aria-label="Horário da transação"
        />
      </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
});

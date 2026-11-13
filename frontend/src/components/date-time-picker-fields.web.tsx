import { StyleSheet, View } from 'react-native';
import type { CSSProperties } from 'react';

import type { DateTimePickerFieldsProps } from './date-time-picker-fields';
import { Fonts } from '@/constants/theme';
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
  fontFamily: Fonts.sans,
  fontVariantNumeric: 'tabular-nums',
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
  fontFamily: Fonts.sans,
  fontVariantNumeric: 'tabular-nums',
};

const desktopBaseStyle: CSSProperties = {
  height: 44,
  minHeight: 44,
  boxSizing: 'border-box',
  lineHeight: '20px',
  borderRadius: 12,
  padding: '11px 13px',
  fontSize: 13,
};

const desktopDateInputStyle: CSSProperties = {
  ...dateInputStyle,
  ...desktopBaseStyle,
};

const desktopTimeInputStyle: CSSProperties = {
  ...timeInputStyle,
  ...desktopBaseStyle,
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
      variant = 'mobile',
    }: DateTimePickerFieldsProps,
) {
  const currentDate = parseLocalDateTime(date, '00:00');
  const parsedTime = parseLocalDateTime(date, time || '00:00');
  const isDesktop = variant === 'desktop';

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
            style={isDesktop ? desktopDateInputStyle : dateInputStyle}
            aria-label="Data da transação"
        />
        <input
            type="time"
            value={parsedTime
                ? `${padNumber(parsedTime.getHours())}:${padNumber(parsedTime.getMinutes())}`
                : ''}
            onChange={(event) => handleTimeChange(event.target.value)}
            style={isDesktop ? desktopTimeInputStyle : timeInputStyle}
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

import type { CSSProperties } from 'react';

import type { DatePickerFieldProps } from './date-picker-field';
import { Fonts } from '@/constants/theme';
import {
  formatDateParts,
  parseLocalDate,
  toIsoDate,
} from '@/utils/date-time';

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  backgroundColor: '#FFFFFF',
  border: '1px solid #E7E9E2',
  borderRadius: 13,
  padding: '12px 14px',
  color: '#202720',
  fontSize: 14,
  fontFamily: Fonts.sans,
  fontVariantNumeric: 'tabular-nums',
};

const desktopInputStyle: CSSProperties = {
  ...inputStyle,
  height: 44,
  minHeight: 44,
  boxSizing: 'border-box',
  lineHeight: '20px',
  borderRadius: 12,
  padding: '11px 13px',
  fontSize: 13,
};

/**
 * Campo de data única para web usando o controle nativo do navegador.
 */
export default function DatePickerField(
    {
      value,
      onChange,
      accessibilityLabel = 'Selecionar data',
      variant = 'mobile',
    }: DatePickerFieldProps,
) {
  const currentDate = parseLocalDate(value);

  const handleChange = (nextValue: string) => {
    // Input vazio = usuário limpou o campo; mantém o valor anterior.
    if (!nextValue) {
      return;
    }

    const [year, month, day] = nextValue.split('-').map(Number);

    onChange(formatDateParts(new Date(year, month - 1, day, 12)));
  };

  return (
      <input
          type="date"
          value={currentDate ? toIsoDate(currentDate) : ''}
          onChange={(event) => handleChange(event.target.value)}
          style={variant === 'desktop' ? desktopInputStyle : inputStyle}
          aria-label={accessibilityLabel}
      />
  );
}

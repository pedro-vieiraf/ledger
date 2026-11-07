import { TextInput, type TextInputProps } from 'react-native';

import {
  amountToCents,
  extractDigits,
  formatCents,
} from '@/utils/currency';

type CurrencyInputProps = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType'
> & {
  /** Valor em reais, sempre não negativo. */
  value: number;
  /** Recebe o valor em reais já convertido de centavos. */
  onChangeValue: (value: number) => void;
  /** Exibe o prefixo "R$" dentro do campo. */
  showCurrencySymbol?: boolean;
  /** Quantidade máxima de dígitos aceitos (padrão: 12). */
  maxDigits?: number;
};

export function CurrencyInput({
  value,
  onChangeValue,
  showCurrencySymbol = true,
  maxDigits = 12,
  ...inputProps
}: CurrencyInputProps) {
  const cents = amountToCents(value);
  const displayValue = formatCents(cents, showCurrencySymbol);

  function handleChangeText(text: string) {
    const digits = extractDigits(text, maxDigits);
    const nextCents = digits ? Number(digits) : 0;

    onChangeValue(nextCents / 100);
  }

  return (
    <TextInput
      {...inputProps}
      value={displayValue}
      onChangeText={handleChangeText}
      keyboardType="number-pad"
    />
  );
}

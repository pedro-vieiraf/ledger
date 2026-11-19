import { StyleSheet, View } from 'react-native';

const USAGE_COLORS = {
  normal: '#1F5B45',
  warning: '#A36A1F',
  danger: '#B5473C',
} as const;

const WARNING_THRESHOLD = 0.7;
const DANGER_THRESHOLD = 0.9;

type CreditCardUsageBarProps = {
  /** Proporção do limite comprometida, entre 0 e 1. */
  ratio: number;
  thickness?: number;
};

/**
 * Barra informativa de uso do limite do cartão.
 *
 * A proporção recebida já deve vir de `getUsageRatio`; nenhum cálculo
 * financeiro é feito aqui.
 */
export function CreditCardUsageBar({
  ratio,
  thickness = 6,
}: CreditCardUsageBarProps) {
  const safeRatio = Number.isFinite(ratio)
    ? Math.min(1, Math.max(0, ratio))
    : 0;

  const color =
    safeRatio >= DANGER_THRESHOLD
      ? USAGE_COLORS.danger
      : safeRatio >= WARNING_THRESHOLD
        ? USAGE_COLORS.warning
        : USAGE_COLORS.normal;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Uso do limite do cartão"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(safeRatio * 100),
      }}
      style={[
        styles.track,
        { height: thickness, borderRadius: thickness / 2 },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${safeRatio * 100}%` as `${number}%`,
            backgroundColor: color,
            borderRadius: thickness / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E4E7E0',
  },
  fill: {
    height: '100%',
  },
});

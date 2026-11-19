import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
} from '@/constants/mobile-theme';
import { usePrivacy } from '@/contexts/privacy-context';
import { useDashboardCreditCards } from '@/hooks/use-dashboard-credit-cards';
import { maskMoney } from '@/utils/privacy';

const colors = {
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  muted: mobileColors.textMuted,
  border: mobileColors.border,
};

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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function monthLabel(key: string) {
  const month = Number(key.slice(5, 7));

  return MONTH_SHORT[month - 1] ?? key;
}

/**
 * Evolução das faturas do Dashboard mobile.
 *
 * As barras horizontais mostram o `remainingAmount` das faturas pendentes de
 * cartões ativos por mês de vencimento, sem rolagem horizontal. Nenhuma compra
 * futura é projetada; meses sem faturas só aparecem zerados quando a consulta
 * de faturas terminou com sucesso.
 */
export function MobileDashboardInvoiceEvolution() {
  const { hidden } = usePrivacy();
  const {
    evolution,
    evolutionPeriod,
    hasEvolutionData,
    loading,
    error,
    invoicesError,
    refresh,
  } = useDashboardCreditCards();

  const maxValue = evolution.reduce(
    (maximum, point) => Math.max(maximum, point.total),
    0,
  );

  const isInitialLoading = loading && evolution.length === 0;
  const isRefreshing = loading && evolution.length > 0;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Evolução das faturas</Text>
      </View>

      {error ? (
        <View style={styles.feedbackBlock}>
          <InlineFeedback
            variant="error"
            title="Não foi possível carregar a evolução das faturas"
            message={error}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            disabled={isRefreshing}
            onPress={() => void refresh().catch(() => {})}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
              isRefreshing && styles.disabled,
            ]}
          >
            <Text style={styles.retryButtonText}>
              {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {invoicesError && !error ? (
        <InlineFeedback
          variant="warning"
          title="Evolução parcial"
          message="Algumas faturas não puderam ser atualizadas; o gráfico considera apenas os dados disponíveis."
          style={styles.feedbackBlock}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateText}>Carregando evolução...</Text>
        </View>
      ) : !hasEvolutionData && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Nenhuma fatura pendente no período
          </Text>
          <Text style={styles.emptyText}>
            A evolução aparece quando houver faturas em aberto com vencimento
            nos próximos meses.
          </Text>
        </View>
      ) : hasEvolutionData ? (
        <View
          accessibilityRole="image"
          accessibilityLabel={`Gráfico de evolução das faturas: ${evolutionPeriod}`}
          style={styles.panel}
        >
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>Total restante por mês</Text>
            <Text style={styles.periodValue} numberOfLines={1}>
              {evolutionPeriod}
            </Text>
          </View>

          <View style={styles.bars}>
            {evolution.map((point, index) => {
              const ratio =
                maxValue > 0 ? Math.min(point.total / maxValue, 1) : 0;

              return (
                <View
                  key={point.key}
                  style={[
                    styles.barRow,
                    index > 0 && styles.barRowDivider,
                  ]}
                >
                  <Text style={styles.monthLabel}>
                    {monthLabel(point.key)}
                  </Text>

                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.round(ratio * 100)}%` },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.amount,
                      point.total <= 0 && styles.amountEmpty,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {maskMoney(formatCurrency(point.total), hidden)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: mobileFont,
  },
  feedbackBlock: {
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: mobileFont,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 22,
  },
  stateText: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: mobileFont,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  periodLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    fontFamily: mobileFont,
  },
  periodValue: {
    flexShrink: 1,
    fontSize: 10,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  bars: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  barRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  monthLabel: {
    width: 28,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'lowercase',
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  amount: {
    width: 96,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  amountEmpty: {
    color: colors.muted,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});

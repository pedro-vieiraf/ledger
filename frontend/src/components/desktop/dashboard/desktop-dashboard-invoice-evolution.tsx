import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  buildCurrencyAxis,
  formatCompactCurrency,
  formatCurrency,
  formatMonthShort,
} from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { usePrivacy } from '@/contexts/privacy-context';
import { useDashboardCreditCards } from '@/hooks/use-dashboard-credit-cards';
import { maskMoney } from '@/utils/privacy';

const CHART_PLOT_HEIGHT = 170;

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return key;
  }

  return formatMonthShort(new Date(year, month - 1, 1, 12));
}

/**
 * Evolução das faturas do Dashboard desktop.
 *
 * Soma o `remainingAmount` das faturas pendentes de cartões ativos por mês de
 * vencimento, na janela dos próximos seis meses. Não há projeção de compras
 * futuras: as barras refletem apenas faturas já retornadas pelo backend. Se a
 * consulta de faturas falhar, o gráfico mostra somente o período com dados
 * confirmados.
 */
export function DesktopDashboardInvoiceEvolution() {
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

  const axis = useMemo(() => {
    const maxValue = evolution.reduce(
      (maximum, point) => Math.max(maximum, point.total),
      0,
    );

    return buildCurrencyAxis(maxValue);
  }, [evolution]);

  const ticksDescending = useMemo(
    () => [...axis.ticks].reverse(),
    [axis.ticks],
  );

  function barHeight(value: number) {
    if (axis.max <= 0 || value <= 0) {
      return 0;
    }

    return Math.max((value / axis.max) * CHART_PLOT_HEIGHT, 4);
  }

  const isInitialLoading = loading && evolution.length === 0;
  const isRefreshing = loading && evolution.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Evolução das faturas</Text>
          <Text style={styles.subtitle}>
            {hasEvolutionData
              ? `Vencimentos de ${evolutionPeriod}`
              : 'Vencimentos dos próximos seis meses'}
          </Text>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.legendLabel}>Total restante por mês</Text>
        </View>
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
              pressed && styles.retryButtonPressed,
              isRefreshing && styles.retryButtonDisabled,
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
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando evolução...</Text>
        </View>
      ) : !hasEvolutionData && !error ? (
        <View style={styles.emptyState}>
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
          style={styles.chartFrame}
        >
          <View style={styles.yAxis}>
            {ticksDescending.map((tick, index) => (
              <Text
                key={tick}
                style={[
                  styles.yAxisLabel,
                  {
                    top:
                      (index / Math.max(ticksDescending.length - 1, 1)) *
                        CHART_PLOT_HEIGHT -
                      6,
                  },
                ]}
                numberOfLines={1}
              >
                {maskMoney(formatCompactCurrency(tick), hidden)}
              </Text>
            ))}
          </View>

          <View style={styles.plotColumn}>
            <View style={styles.plot}>
              <View style={styles.gridLayer} pointerEvents="none">
                {ticksDescending.map((tick, index) => (
                  <View
                    key={tick}
                    style={[
                      styles.gridLine,
                      index === ticksDescending.length - 1 &&
                        styles.gridLineBase,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.chartArea}>
                {evolution.map((point) => (
                  <View key={point.key} style={styles.chartGroup}>
                    <View style={styles.barsRow}>
                      <View
                        style={[styles.bar, { height: barHeight(point.total) }]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>
                      {monthLabel(point.key)}
                    </Text>
                    <Text
                      style={styles.chartValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {maskMoney(formatCurrency(point.total), hidden)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  heading: {
    flexShrink: 1,
    minWidth: 180,
  },
  title: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: desktopFont,
  },
  subtitle: {
    marginTop: 4,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: desktopColors.primary,
  },
  legendLabel: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  feedbackBlock: {
    marginBottom: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: desktopColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  retryButtonDisabled: {
    opacity: 0.4,
  },
  retryButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  emptyState: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  emptyTitle: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  emptyText: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  chartFrame: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  yAxis: {
    position: 'relative',
    width: 54,
    height: CHART_PLOT_HEIGHT,
  },
  yAxisLabel: {
    position: 'absolute',
    right: 0,
    color: desktopColors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  plotColumn: {
    flex: 1,
    minWidth: 0,
  },
  plot: {
    position: 'relative',
  },
  gridLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CHART_PLOT_HEIGHT,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: desktopColors.border,
  },
  gridLineBase: {
    backgroundColor: desktopColors.borderStrong,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartGroup: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  barsRow: {
    width: '100%',
    height: CHART_PLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: '58%',
    maxWidth: 40,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: desktopColors.primary,
  },
  chartLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'lowercase',
    fontFamily: desktopFont,
  },
  chartValue: {
    color: desktopColors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
});

import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  buildCurrencyAxis,
  formatAccountType,
  formatCompactCurrency,
  formatCurrency,
  formatSignedCurrency,
} from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import {
  useDesktopDashboard,
  type CategoryExpensePoint,
  type ChartRange,
  type DashboardTransaction,
  type MonthlySeriesPoint,
} from '@/components/desktop/dashboard/use-desktop-dashboard';
import { usePrivacy } from '@/contexts/privacy-context';
import { maskMoney } from '@/utils/privacy';

const CHART_PLOT_HEIGHT = 180;

const KPI_ICONS: Record<
  'balance' | 'income' | 'expense' | 'result',
  SymbolViewProps['name']
> = {
  balance: {
    ios: 'wallet.pass.fill',
    android: 'account_balance_wallet',
    web: 'account_balance_wallet',
  },
  income: {
    ios: 'arrow.up.right',
    android: 'trending_up',
    web: 'trending_up',
  },
  expense: {
    ios: 'arrow.down.right',
    android: 'trending_down',
    web: 'trending_down',
  },
  result: {
    ios: 'chart.line.uptrend.xyaxis',
    android: 'insights',
    web: 'insights',
  },
};

const CHART_RANGE_OPTIONS: readonly {
  value: ChartRange;
  label: string;
  description: string;
}[] = [
  { value: '3m', label: '3 meses', description: 'Últimos 3 meses' },
  { value: '6m', label: '6 meses', description: 'Últimos 6 meses' },
  { value: '12m', label: '1 ano', description: 'Último ano' },
];

type KpiTone = 'primary' | 'income' | 'expense' | 'neutral';

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
  icon: SymbolViewProps['name'];
}) {
  const toneColors = {
    primary: {
      background: desktopColors.primarySoft,
      foreground: desktopColors.primary,
    },
    income: {
      background: desktopColors.incomeSoft,
      foreground: desktopColors.income,
    },
    expense: {
      background: desktopColors.expenseSoft,
      foreground: desktopColors.expense,
    },
    neutral: {
      background: desktopColors.surfaceMuted,
      foreground: desktopColors.textSecondary,
    },
  } as const;

  const palette = toneColors[tone];

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View
          style={[
            styles.kpiIcon,
            { backgroundColor: palette.background },
          ]}
        >
          <SymbolView
            name={icon}
            size={16}
            tintColor={palette.foreground}
          />
        </View>
      </View>

      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      <Text style={styles.kpiHint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

function MonthlyBars({
  data,
  rangeLabel,
  hidden,
}: {
  data: MonthlySeriesPoint[];
  rangeLabel: string;
  hidden: boolean;
}) {
  const axis = useMemo(() => {
    const maxValue = data.reduce(
      (maximum, point) => Math.max(maximum, point.income, point.expense),
      0,
    );

    return buildCurrencyAxis(maxValue);
  }, [data]);

  const ticksDescending = useMemo(() => [...axis.ticks].reverse(), [axis.ticks]);

  function barHeight(value: number) {
    if (axis.max <= 0 || value <= 0) {
      return 0;
    }

    return Math.max((value / axis.max) * CHART_PLOT_HEIGHT, 4);
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Gráfico de receitas versus despesas: ${rangeLabel}`}
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
            {data.map((point) => (
              <View key={point.key} style={styles.chartGroup}>
                <View style={styles.barsRow}>
                  <View
                    style={[
                      styles.bar,
                      styles.barIncome,
                      { height: barHeight(point.income) },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      styles.barExpense,
                      { height: barHeight(point.expense) },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function CategoryBreakdown({
  data,
  hidden,
}: {
  data: CategoryExpensePoint[];
  hidden: boolean;
}) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Sem despesas no período</Text>
        <Text style={styles.emptyText}>
          A distribuição por categoria aparece quando houver despesas
          registradas no mês selecionado.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.categoryList}>
      {data.map((entry) => (
        <View key={entry.id} style={styles.categoryRow}>
          <View style={styles.categoryRowHeader}>
            <View style={styles.categoryNameWrap}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: entry.color },
                ]}
              />
              <Text style={styles.categoryName} numberOfLines={1}>
                {entry.name}
              </Text>
            </View>

            <View style={styles.categoryValues}>
              <Text style={styles.categoryAmount} numberOfLines={1}>
                {maskMoney(formatCurrency(entry.amount), hidden)}
              </Text>
              <Text style={styles.categoryPercent}>
                {Math.round(entry.percent * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.categoryTrack}>
            <View
              style={[
                styles.categoryFill,
                {
                  width: `${Math.max(entry.percent * 100, 2)}%` as `${number}%`,
                  backgroundColor: entry.color,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function RecentTransactionRow({
  transaction,
  hidden,
}: {
  transaction: DashboardTransaction;
  hidden: boolean;
}) {
  const isIncome = transaction.type === 'INCOME';
  const isExpense = transaction.type === 'EXPENSE';

  const toneBackground = isIncome
    ? desktopColors.incomeSoft
    : isExpense
      ? desktopColors.expenseSoft
      : desktopColors.transferSoft;

  const toneForeground = isIncome
    ? desktopColors.income
    : isExpense
      ? desktopColors.expense
      : desktopColors.transfer;

  const icon = isIncome ? '↑' : isExpense ? '↓' : '⇄';
  const amount = formatCurrency(transaction.amount, transaction.currency);
  const signedAmount = isIncome
    ? `+ ${amount}`
    : isExpense
      ? `− ${amount}`
      : amount;
  return (
    <View style={styles.transactionRow}>
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: toneBackground },
        ]}
      >
        <Text
          style={[styles.transactionIconText, { color: toneForeground }]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionMeta} numberOfLines={1}>
          {transaction.category} · {transaction.dateLabel}
          {transaction.isRecurring ? ' · Recorrente' : ''}
        </Text>
      </View>

      <Text
        style={[styles.transactionAmount, { color: toneForeground }]}
        numberOfLines={1}
      >
        {maskMoney(signedAmount, hidden)}
      </Text>
    </View>
  );
}

export function DesktopDashboard() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const {
    activeAccounts,
    totalBalance,
    selectedMonth,
    monthLabel,
    isCurrentMonth,
    changeMonth,
    chartRange,
    changeChartRange,
    summary,
    monthlySeries,
    categoryBreakdown,
    recentTransactions,
    isInitialLoading,
    refreshing,
    errorMessage,
    refreshDashboard,
  } = useDesktopDashboard();

  const resultTone: KpiTone =
    summary.result > 0 ? 'income' : summary.result < 0 ? 'expense' : 'neutral';

  const resultValue =
    summary.result === 0
      ? formatCurrency(0)
      : formatSignedCurrency(summary.result);
  const maskedResultValue = maskMoney(resultValue, hidden);

  const monthName = useMemo(() => {
    const month = selectedMonth.toLocaleDateString('pt-BR', {
      month: 'long',
    });

    return month.charAt(0).toUpperCase() + month.slice(1);
  }, [selectedMonth]);

  const chartRangeOption =
    CHART_RANGE_OPTIONS.find((option) => option.value === chartRange) ??
    CHART_RANGE_OPTIONS[1];

  const chartSubtitle = `${chartRangeOption.description} até ${monthLabel.toLowerCase()}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>Visão geral</Text>
          <Text style={styles.subtitle}>
            Acompanhe o equilíbrio das suas finanças em um só lugar.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.periodSelector}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              onPress={() => changeMonth(-1)}
              style={({ pressed }) => [
                styles.periodButton,
                pressed && styles.periodButtonPressed,
              ]}
            >
              <Text style={styles.periodButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.periodLabel} numberOfLines={1}>
              {monthLabel}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              accessibilityState={{ disabled: isCurrentMonth }}
              disabled={isCurrentMonth}
              onPress={() => changeMonth(1)}
              style={({ pressed }) => [
                styles.periodButton,
                isCurrentMonth && styles.periodButtonDisabled,
                pressed && !isCurrentMonth && styles.periodButtonPressed,
              ]}
            >
              <Text style={styles.periodButtonText}>›</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atualizar painel"
            disabled={refreshing}
            onPress={() => void refreshDashboard()}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshing && styles.refreshButtonDisabled,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
            <Text style={styles.refreshLabel}>
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {errorMessage ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar o painel"
          message={errorMessage}
        />
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={desktopColors.primary} />
          <Text style={styles.loadingText}>
            Carregando suas informações financeiras...
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard
              label="Saldo total"
              value={maskMoney(formatCurrency(totalBalance), hidden)}
              hint={`${activeAccounts.length} ${
                activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'
              }`}
              tone="primary"
              icon={KPI_ICONS.balance}
            />
            <KpiCard
              label="Receitas"
              value={maskMoney(formatCurrency(summary.income), hidden)}
              hint={monthName}
              tone="income"
              icon={KPI_ICONS.income}
            />
            <KpiCard
              label="Despesas"
              value={maskMoney(formatCurrency(summary.expense), hidden)}
              hint={monthName}
              tone="expense"
              icon={KPI_ICONS.expense}
            />
            <KpiCard
              label="Resultado"
              value={maskedResultValue}
              hint="Receitas menos despesas"
              tone={resultTone}
              icon={KPI_ICONS.result}
            />
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.chartCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>Receitas x despesas</Text>
                  <Text style={styles.cardSubtitle}>{chartSubtitle}</Text>
                </View>

                <View style={styles.chartHeaderActions}>
                  <View style={styles.rangeSelector}>
                    {CHART_RANGE_OPTIONS.map((option) => {
                      const isActive = option.value === chartRange;

                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityLabel={option.description}
                          accessibilityState={{ selected: isActive }}
                          onPress={() => changeChartRange(option.value)}
                          style={({ pressed }) => [
                            styles.rangeButton,
                            isActive && styles.rangeButtonActive,
                            pressed &&
                              !isActive &&
                              styles.rangeButtonPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rangeButtonText,
                              isActive && styles.rangeButtonTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View
                        style={[styles.legendDot, styles.legendDotIncome]}
                      />
                      <Text style={styles.legendLabel}>Receitas</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View
                        style={[styles.legendDot, styles.legendDotExpense]}
                      />
                      <Text style={styles.legendLabel}>Despesas</Text>
                    </View>
                  </View>
                </View>
              </View>

              <MonthlyBars
                data={monthlySeries}
                rangeLabel={chartRangeOption.description}
                hidden={hidden}
              />
            </View>

            <View style={styles.categoryCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>
                    Despesas por categoria
                  </Text>
                  <Text style={styles.cardSubtitle}>{monthLabel}</Text>
                </View>
              </View>

              <CategoryBreakdown data={categoryBreakdown} hidden={hidden} />
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.accountsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>Contas</Text>
                  <Text style={styles.cardSubtitle}>
                    Saldos das contas ativas
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.navigate('/accounts')}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.linkText}>Ver contas</Text>
                  <Text style={styles.linkChevron}>›</Text>
                </Pressable>
              </View>

              {activeAccounts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Nenhuma conta ativa</Text>
                  <Text style={styles.emptyText}>
                    Cadastre uma conta para acompanhar seus saldos aqui.
                  </Text>
                </View>
              ) : (
                <View style={styles.accountList}>
                  {activeAccounts.map((account) => (
                    <Pressable
                      key={account.id}
                      accessibilityRole="link"
                      onPress={() =>
                        router.navigate({
                          pathname: '/accounts/[id]',
                          params: { id: account.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.accountRow,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.accountBadge}>
                        <Text style={styles.accountBadgeText}>
                          {account.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.accountInfo}>
                        <Text
                          style={styles.accountName}
                          numberOfLines={1}
                        >
                          {account.name}
                        </Text>
                        <Text style={styles.accountType} numberOfLines={1}>
                          {formatAccountType(account.type)}
                        </Text>
                      </View>

                      <Text style={styles.accountBalance} numberOfLines={1}>
                        {maskMoney(formatCurrency(account.balance), hidden)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.transactionsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>Últimas transações</Text>
                  <Text style={styles.cardSubtitle}>
                    Movimentações mais recentes
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.navigate('/transactions')}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.linkText}>Ver todas</Text>
                  <Text style={styles.linkChevron}>›</Text>
                </Pressable>
              </View>

              {recentTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>
                    Nenhuma transação registrada
                  </Text>
                  <Text style={styles.emptyText}>
                    Suas movimentações mais recentes aparecerão nesta lista.
                  </Text>
                </View>
              ) : (
                <View style={styles.transactionList}>
                  {recentTransactions.map((transaction) => (
                    <RecentTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      hidden={hidden}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: desktopColors.background,
  },
  content: {
    width: '100%',
    maxWidth: desktopLayout.contentMaxWidth,
    alignSelf: 'center',
    padding: desktopLayout.pagePadding,
    paddingBottom: 48,
    gap: 22,
  },
  pageHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
  },
  heading: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
  },
  title: {
    color: desktopColors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    fontFamily: desktopFont,
  },
  subtitle: {
    marginTop: 6,
    color: desktopColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: desktopFont,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodSelector: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  periodButton: {
    width: 32,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  periodButtonDisabled: {
    opacity: 0.32,
  },
  periodButtonText: {
    color: desktopColors.primary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  periodLabel: {
    minWidth: 132,
    textAlign: 'center',
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  refreshButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: desktopColors.primary,
  },
  refreshButtonPressed: {
    backgroundColor: desktopColors.primaryStrong,
  },
  refreshButtonDisabled: {
    opacity: 0.72,
  },
  refreshIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  refreshLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  loadingCard: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 13,
    fontFamily: desktopFont,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 190,
    padding: 20,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kpiLabel: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    marginTop: 14,
    color: desktopColors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  kpiHint: {
    marginTop: 6,
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 16,
  },
  chartCard: {
    flexGrow: 2,
    flexBasis: 480,
    minWidth: 320,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  categoryCard: {
    flexGrow: 1,
    flexBasis: 300,
    minWidth: 280,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  cardHeading: {
    flexShrink: 1,
    minWidth: 160,
  },
  cardTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: desktopFont,
  },
  cardSubtitle: {
    marginTop: 4,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotIncome: {
    backgroundColor: desktopColors.income,
  },
  legendDotExpense: {
    backgroundColor: desktopColors.expense,
  },
  legendLabel: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  chartHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rangeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  rangeButton: {
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonActive: {
    backgroundColor: desktopColors.primary,
  },
  rangeButtonPressed: {
    backgroundColor: desktopColors.surface,
  },
  rangeButtonText: {
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
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
    gap: 6,
  },
  chartGroup: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 8,
  },
  barsRow: {
    width: '100%',
    height: CHART_PLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    flex: 1,
    maxWidth: 20,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barIncome: {
    backgroundColor: desktopColors.income,
  },
  barExpense: {
    backgroundColor: desktopColors.expense,
  },
  chartLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'lowercase',
    fontFamily: desktopFont,
  },
  categoryList: {
    gap: 16,
  },
  categoryRow: {
    gap: 7,
  },
  categoryRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  categoryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryAmount: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  categoryPercent: {
    minWidth: 32,
    textAlign: 'right',
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  categoryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: desktopColors.surfaceMuted,
  },
  categoryFill: {
    height: 6,
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 16,
  },
  accountsCard: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 290,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  transactionsCard: {
    flexGrow: 2,
    flexBasis: 520,
    minWidth: 330,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  accountList: {
    gap: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  rowPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  accountBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  accountBadgeText: {
    color: desktopColors.primary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  accountType: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  accountBalance: {
    marginLeft: 8,
    maxWidth: '45%',
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  transactionList: {
    gap: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderRadius: 11,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  transactionMeta: {
    marginTop: 3,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  transactionAmount: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  linkButtonPressed: {
    opacity: 0.62,
  },
  linkText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  linkChevron: {
    color: desktopColors.primary,
    fontSize: 16,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 8,
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
});

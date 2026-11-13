import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { DesktopDashboard } from '@/components/desktop/dashboard/desktop-dashboard';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { useAccounts, type Account } from '@/contexts/accounts-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import { useTransactions, type Transaction } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import {
  filterTransactionsByMonth,
  getActiveAccounts,
  summarizeTransactions,
  sumAccountBalances,
} from '@/utils/financial-summary';
import { sortTransactionsByTimestampDescending } from '@/utils/transaction-sort';
import { maskMoney } from '@/utils/privacy';

const COLORS = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primarySoft: '#E5F0E9',
  text: '#202820',
  secondary: '#69736B',
  border: '#E6E8E2',
  income: '#237A4B',
  incomeBackground: '#E2F3E8',
  expense: '#B5473C',
  expenseBackground: '#FBE9E6',
  transfer: '#5474A1',
  transferBackground: '#EDF1F8',
};

const MONTH_ABBREVIATIONS = [
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

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

type TransactionType = Transaction['type'];

function formatCurrency(value: number, currency = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatAccountType(type: Account['type']) {
  return type === 'CHECKING' ? 'Conta corrente' : 'Poupança';
}

function formatMonth(date: Date) {
  const formatted = monthFormatter.format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatTransactionDate(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const time = timeFormatter.format(date);

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
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const year =
    date.getFullYear() !== now.getFullYear()
      ? ` ${date.getFullYear()}`
      : '';

  return `${day} ${month}${year}, ${time}`;
}

function getDefaultDescription(type: TransactionType) {
  if (type === 'INCOME') return 'Receita';
  if (type === 'TRANSFER') return 'Transferência';
  return 'Despesa';
}

function getCategoryLabel(
  transaction: Transaction,
  categoriesById: Map<string, string>,
) {
  if (transaction.type === 'TRANSFER') {
    return 'Transferência';
  }

  const categoryName = transaction.categoryId
    ? categoriesById.get(transaction.categoryId)
    : undefined;

  return categoryName ?? 'Sem categoria';
}

function getTransactionPalette(type: TransactionType) {
  if (type === 'INCOME') {
    return {
      color: COLORS.income,
      background: COLORS.incomeBackground,
      icon: '↙',
      prefix: '+ ',
    };
  }

  if (type === 'TRANSFER') {
    return {
      color: COLORS.transfer,
      background: COLORS.transferBackground,
      icon: '↔',
      prefix: '',
    };
  }

  return {
    color: COLORS.expense,
    background: COLORS.expenseBackground,
    icon: '↗',
    prefix: '− ',
  };
}

function DashboardHeader({ refreshing }: { refreshing: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.brand}>finora</Text>
        <Text style={styles.subtitle}>Seu controle financeiro</Text>
      </View>

      {refreshing ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : null}
    </View>
  );
}

function MobileDashboardScreen() {
  const router = useRouter();
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refreshAccounts,
  } = useAccounts();
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refreshTransactions,
  } = useTransactions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const { hidden, toggle: togglePrivacy } = usePrivacy();
  const [monthOffset, setMonthOffset] = useState(0);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const data = await getCategories();

      setCategories(data);
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as categorias.',
      );
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);

    await Promise.allSettled([
      refreshAccounts(),
      refreshTransactions(),
      loadCategories(),
    ]);

    refreshInFlightRef.current = false;
    setRefreshing(false);
    setHasLoadedOnce(true);
  }, [loadCategories, refreshAccounts, refreshTransactions]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  const selectedMonth = useMemo(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const activeAccounts = useMemo(
    () => getActiveAccounts(accounts),
    [accounts],
  );

  const totalBalance = useMemo(
    () => sumAccountBalances(activeAccounts),
    [activeAccounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const monthlyTransactions = useMemo(
    () => filterTransactionsByMonth(transactions, selectedMonth),
    [selectedMonth, transactions],
  );

  const summary = useMemo(
    () => summarizeTransactions(monthlyTransactions),
    [monthlyTransactions],
  );

  const recentTransactions = useMemo(
    () =>
      sortTransactionsByTimestampDescending(transactions).slice(0, 5),
    [transactions],
  );

  const isInitialLoading =
    !hasLoadedOnce &&
    (accountsLoading || transactionsLoading || categoriesLoading);

  const errorMessage =
    accountsError ?? transactionsError ?? categoriesError;

  const resultColor =
    summary.result > 0
      ? COLORS.income
      : summary.result < 0
        ? COLORS.expense
        : COLORS.text;

  function changeMonth(offset: number) {
    setMonthOffset((current) => Math.min(current + offset, 0));
  }

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContent}>
          <DashboardHeader refreshing={false} />

          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando seu painel...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader refreshing={refreshing} />

        {errorMessage ? (
          <View style={styles.errorBlock}>
            <InlineFeedback
              variant="error"
              title="Não foi possível atualizar"
              message={errorMessage}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshDashboard()}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
                refreshing && styles.disabled,
              ]}
            >
              <Text style={styles.retryButtonText}>
                {refreshing ? 'Atualizando...' : 'Tentar novamente'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo total</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hidden
                  ? 'Mostrar valores financeiros'
                  : 'Ocultar valores financeiros'
              }
              onPress={togglePrivacy}
              hitSlop={8}
              style={({ pressed }) => [
                styles.balanceToggleButton,
                pressed && styles.balanceTogglePressed,
              ]}
            >
              <SymbolView
                name={
                  hidden
                    ? {
                        ios: 'eye.slash',
                        android: 'visibility_off',
                        web: 'visibility_off',
                      }
                    : { ios: 'eye', android: 'visibility', web: 'visibility' }
                }
                size={20}
                tintColor="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            style={styles.balanceValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {maskMoney(formatCurrency(totalBalance), hidden)}
          </Text>

          <View style={styles.balanceFooter}>
            <View style={styles.balanceStatus}>
              <View style={styles.balanceDot} />
              <Text style={styles.balanceFooterText}>
                {activeAccounts.length}{' '}
                {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
              </Text>
            </View>

            <Text style={styles.balanceFooterMuted}>Saldo consolidado</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumo financeiro</Text>
        </View>

        <View style={styles.monthSelector}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [
              styles.monthArrow,
              pressed && styles.monthArrowPressed,
            ]}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>

          <Text style={styles.monthLabel}>{formatMonth(selectedMonth)}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            accessibilityState={{ disabled: monthOffset === 0 }}
            onPress={() => changeMonth(1)}
            disabled={monthOffset === 0}
            style={({ pressed }) => [
              styles.monthArrow,
              pressed && monthOffset !== 0 && styles.monthArrowPressed,
              monthOffset === 0 && styles.disabled,
            ]}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: COLORS.incomeBackground },
              ]}
            >
              <Text style={[styles.summaryIconText, { color: COLORS.income }]}>
                ↙
              </Text>
            </View>

            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text
              style={[styles.summaryValue, { color: COLORS.income }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {maskMoney(formatCurrency(summary.income), hidden)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: COLORS.expenseBackground },
              ]}
            >
              <Text style={[styles.summaryIconText, { color: COLORS.expense }]}>
                ↗
              </Text>
            </View>

            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text
              style={[styles.summaryValue, { color: COLORS.expense }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {maskMoney(formatCurrency(summary.expense), hidden)}
            </Text>
          </View>
        </View>

        <View style={styles.resultCard}>
          <View style={styles.resultInfo}>
            <Text style={styles.resultLabel}>Resultado do mês</Text>
            <Text style={styles.resultHint}>
              Receitas menos despesas, sem transferências
            </Text>
          </View>

          <Text
            style={[styles.resultValue, { color: resultColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {maskMoney(formatCurrency(summary.result), hidden)}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minhas contas</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/accounts')}
          >
            <Text style={styles.sectionLink}>Ver contas</Text>
          </Pressable>
        </View>

        {activeAccounts.length > 0 ? (
          <View style={styles.listCard}>
            {activeAccounts.map((account, index) => (
              <View
                key={account.id}
                style={[
                  styles.accountRow,
                  index < activeAccounts.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.accountIcon}>
                  <Text style={styles.accountIconText}>
                    {account.type === 'CHECKING' ? '▤' : '◫'}
                  </Text>
                </View>

                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={styles.accountType}>
                    {formatAccountType(account.type)}
                  </Text>
                </View>

                <Text
                  style={styles.accountBalance}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {maskMoney(formatCurrency(account.balance), hidden)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma conta ativa</Text>
            <Text style={styles.emptyText}>
              Crie ou reative uma conta para acompanhar seu saldo consolidado.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/accounts')}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emptyButtonText}>Gerenciar contas</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações recentes</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/transactions')}
          >
            <Text style={styles.sectionLink}>Ver todas</Text>
          </Pressable>
        </View>

        {recentTransactions.length > 0 ? (
          <View style={styles.listCard}>
            {recentTransactions.map((transaction, index) => {
              const palette = getTransactionPalette(transaction.type);
              const description =
                transaction.description?.trim() ||
                getDefaultDescription(transaction.type);
              const category = getCategoryLabel(
                transaction,
                categoriesById,
              );
              const date = formatTransactionDate(transaction.timestamp);
              const meta = [category, date].filter(Boolean).join(' · ');

              return (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionRow,
                    index < recentTransactions.length - 1 &&
                      styles.rowDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: palette.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.transactionIconText,
                        { color: palette.color },
                      ]}
                    >
                      {palette.icon}
                    </Text>
                  </View>

                  <View style={styles.transactionInfo}>
                    <Text
                      style={styles.transactionDescription}
                      numberOfLines={1}
                    >
                      {description}
                    </Text>
                    <Text style={styles.transactionMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: palette.color },
                    ]}
                    numberOfLines={1}
                  >
                    {hidden ? (
                      '••••••'
                    ) : (
                      <>
                        {palette.prefix}
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </>
                    )}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma transação registrada</Text>
            <Text style={styles.emptyText}>
              Suas movimentações mais recentes aparecerão aqui.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.secondary,
  },
  errorBlock: {
    marginBottom: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F2D22',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D9E8E0',
  },
  balanceToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTogglePressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  balanceValue: {
    marginTop: 14,
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  balanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8FD3AE',
  },
  balanceFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D9E8E0',
  },
  balanceFooterMuted: {
    fontSize: 11,
    color: '#A9C8B8',
  },
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
    color: COLORS.text,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 12,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowPressed: {
    backgroundColor: COLORS.primarySoft,
  },
  monthArrowText: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: COLORS.primary,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  resultCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  resultHint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.secondary,
  },
  resultValue: {
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  accountType: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.secondary,
  },
  accountBalance: {
    marginLeft: 10,
    maxWidth: '45%',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  transactionMeta: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.secondary,
  },
  transactionAmount: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default function HomeScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopDashboard />;
  }

  return <MobileDashboardScreen />;
}

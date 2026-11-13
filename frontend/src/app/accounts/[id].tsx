import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { DesktopAccountDetails } from '@/components/desktop/accounts/desktop-account-details';
import { useAccounts, type Account } from '@/contexts/accounts-context';
import { usePrivacy } from '@/contexts/privacy-context';
import {
  useTransactions,
  type Transaction,
} from '@/contexts/transactions-context';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import { getCategories, type Category } from '@/services/categories-api';
import { maskMoney } from '@/utils/privacy';
import { compareTransactionsByTimestampDescending } from '@/utils/transaction-sort';

const colors = {
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
  transfer: '#5474A1',
  transferBackground: '#EDF1F8',
  danger: '#B84D4D',
  dangerLight: '#F9EDEC',
};

type TransactionFilter = 'all' | 'income' | 'expense' | 'transfer';
type TransactionDirection = 'in' | 'out';

type AccountTransaction = {
  transaction: Transaction;
  direction: TransactionDirection;
  dateKey: string;
};

const FILTERS: { label: string; value: TransactionFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Transferências', value: 'transfer' },
];

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const dateHeadingFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
});

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

function getLocalDateKey(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateHeading(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return dateHeadingFormatter.format(date);
}

function getDefaultDescription(type: Transaction['type']) {
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

function getTransactionMeta(
  transaction: Transaction,
  accountId: string,
  categoriesById: Map<string, string>,
  accountsById: Map<string, Account>,
) {
  if (transaction.type !== 'TRANSFER') {
    return getCategoryLabel(transaction, categoriesById);
  }

  if (transaction.accountId === accountId) {
    const destinationName = transaction.destinationAccountId
      ? accountsById.get(transaction.destinationAccountId)?.name ??
        'Conta excluída'
      : 'Conta excluída';

    return `Transferência · Enviada para ${destinationName}`;
  }

  const sourceName =
    accountsById.get(transaction.accountId)?.name ?? 'Conta excluída';

  return `Transferência · Recebida de ${sourceName}`;
}

function getTransactionDirection(
  transaction: Transaction,
  accountId: string,
): TransactionDirection {
  if (transaction.type === 'TRANSFER') {
    return transaction.accountId === accountId ? 'out' : 'in';
  }

  return transaction.type === 'INCOME' ? 'in' : 'out';
}

function getTransactionPalette(
  type: Transaction['type'],
  direction: TransactionDirection,
) {
  if (type === 'INCOME') {
    return {
      color: colors.income,
      background: colors.incomeBackground,
      icon: '↙',
      prefix: '+ ',
    };
  }

  if (type === 'TRANSFER') {
    return {
      color: colors.transfer,
      background: colors.transferBackground,
      icon: '↔',
      prefix: direction === 'in' ? '+ ' : '− ',
    };
  }

  return {
    color: colors.expense,
    background: colors.expenseBackground,
    icon: '↗',
    prefix: '− ',
  };
}

export default function AccountDetailsScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopAccountDetails />;
  }

  return <AccountDetailsMobileScreen />;
}

function AccountDetailsMobileScreen() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const [monthOffset, setMonthOffset] = useState(0);
  const [filter, setFilter] = useState<TransactionFilter>('all');

  const account = useMemo(
    () => accounts.find((item) => item.id === id),
    [accounts, id],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((item) => [item.id, item])),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

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

  const refreshDetails = useCallback(async () => {
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
      void refreshDetails();
    }, [refreshDetails]),
  );

  const selectedMonth = useMemo(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthKey = [
    selectedMonth.getFullYear(),
    String(selectedMonth.getMonth() + 1).padStart(2, '0'),
  ].join('-');

  const accountTransactions = useMemo<AccountTransaction[]>(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.accountId === id ||
            transaction.destinationAccountId === id,
        )
        .map((transaction) => ({
          transaction,
          direction: getTransactionDirection(transaction, id),
          dateKey: getLocalDateKey(transaction.timestamp),
        }))
        .sort((first, second) =>
          compareTransactionsByTimestampDescending(
            first.transaction,
            second.transaction,
          ),
        ),
    [id, transactions],
  );

  const monthTransactions = useMemo(
    () =>
      accountTransactions.filter((item) =>
        item.dateKey.startsWith(monthKey),
      ),
    [accountTransactions, monthKey],
  );

  const summary = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;

    for (const { transaction } of monthTransactions) {
      if (
        transaction.currency !== 'BRL' ||
        transaction.accountId !== id
      ) {
        continue;
      }

      const cents = Math.round(transaction.amount * 100);

      if (transaction.type === 'INCOME') {
        incomeCents += cents;
      } else if (transaction.type === 'EXPENSE') {
        expenseCents += cents;
      }
    }

    return {
      income: incomeCents / 100,
      expense: expenseCents / 100,
    };
  }, [id, monthTransactions]);

  const filteredTransactions = useMemo(
    () =>
      monthTransactions.filter(({ transaction }) => {
        if (filter === 'all') return true;
        if (filter === 'income') return transaction.type === 'INCOME';
        if (filter === 'expense') return transaction.type === 'EXPENSE';
        return transaction.type === 'TRANSFER';
      }),
    [filter, monthTransactions],
  );

  const groupedTransactions = useMemo(() => {
    const groups: {
      dateKey: string;
      items: AccountTransaction[];
    }[] = [];

    for (const item of filteredTransactions) {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.dateKey === item.dateKey) {
        lastGroup.items.push(item);
      } else {
        groups.push({
          dateKey: item.dateKey,
          items: [item],
        });
      }
    }

    return groups;
  }, [filteredTransactions]);

  const errorMessage =
    accountsError ?? transactionsError ?? categoriesError;

  const isInitialLoading =
    !account && (accountsLoading || !hasLoadedOnce);

  const isHistoryLoading =
    (transactionsLoading || categoriesLoading) &&
    accountTransactions.length === 0;

  function changeMonth(offset: number) {
    setMonthOffset((current) => Math.min(current + offset, 0));
  }

  if (!account) {
    if (isInitialLoading) {
      return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando conta...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centeredContent}>
          <Text style={styles.notFoundTitle}>
            {accountsError
              ? 'Não foi possível carregar a conta'
              : 'Conta não encontrada'}
          </Text>
          <Text style={styles.notFoundDescription}>
            {accountsError ??
              'Essa conta pode ter sido removida ou não está mais disponível.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Voltar</Text>
          </Pressable>

          {accountsError ? (
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => void refreshDetails()}
            >
              <Text style={styles.secondaryButtonText}>
                Tentar novamente
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const isActive = account.status === 'ACTIVE';
  const statusLabel =
    account.status === 'ACTIVE'
      ? 'Conta ativa'
      : account.status === 'DELETED'
        ? 'Conta excluída'
        : 'Conta inativa';
  const movementCount = filteredTransactions.length;
  const monthHasTransactions = monthTransactions.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹  Voltar para contas</Text>
        </Pressable>

        <Text style={styles.eyebrow}>finora / CONTAS</Text>

        <View style={styles.heading}>
          <View
            style={[
              styles.accountIcon,
              !isActive && styles.accountIconInactive,
            ]}
          >
            <Text style={styles.accountIconText}>
              {account.type === 'CHECKING' ? '▤' : '◫'}
            </Text>
          </View>

          <View style={styles.headingText}>
            <Text style={styles.title}>{account.name}</Text>
            <Text style={styles.subtitle}>
              {formatAccountType(account.type)}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.feedbackBlock}>
            <InlineFeedback
              variant="error"
              title="Não foi possível atualizar"
              message={errorMessage}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshDetails()}
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
            <Text style={styles.balanceLabel}>Saldo atual</Text>

            {refreshing ? (
              <ActivityIndicator size="small" color="#D9E8E0" />
            ) : null}
          </View>

          <Text
            style={styles.balanceAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {maskMoney(formatCurrency(account.balance), hidden)}
          </Text>

          <View
            style={[
              styles.statusBadge,
              isActive ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                !isActive && styles.statusDotInactive,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                !isActive && styles.statusTextInactive,
              ]}
            >
              {statusLabel}
            </Text>
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
                { backgroundColor: colors.incomeBackground },
              ]}
            >
              <Text
                style={[styles.summaryIconText, { color: colors.income }]}
              >
                ↙
              </Text>
            </View>

            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text
              style={[styles.summaryValue, { color: colors.income }]}
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
                { backgroundColor: colors.expenseBackground },
              ]}
            >
              <Text
                style={[styles.summaryIconText, { color: colors.expense }]}
              >
                ↗
              </Text>
            </View>

            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text
              style={[styles.summaryValue, { color: colors.expense }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {maskMoney(formatCurrency(summary.expense), hidden)}
            </Text>
          </View>
        </View>

        <Text style={styles.summaryHint}>
          Transferências não entram no resumo financeiro.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          <Text style={styles.historyCount}>
            {movementCount}{' '}
            {movementCount === 1 ? 'movimentação' : 'movimentações'}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;

            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item.value)}
                style={[
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isHistoryLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyDescription}>
              Carregando movimentações...
            </Text>
          </View>
        ) : groupedTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {monthHasTransactions
                ? 'Nenhuma movimentação para este filtro'
                : 'Nenhuma movimentação neste mês'}
            </Text>
            <Text style={styles.emptyDescription}>
              {monthHasTransactions
                ? 'Tente selecionar outro tipo de movimentação.'
                : 'Selecione outro mês ou registre uma nova transação na aba Transações.'}
            </Text>
          </View>
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.dateKey} style={styles.dateGroup}>
              <Text style={styles.dateHeading}>
                {formatDateHeading(group.dateKey)}
              </Text>

              <View style={styles.transactionsCard}>
                {group.items.map((item, index) => {
                  const { transaction, direction } = item;
                  const palette = getTransactionPalette(
                    transaction.type,
                    direction,
                  );
                  const description =
                    transaction.description?.trim() ||
                    getDefaultDescription(transaction.type);
                  const meta = getTransactionMeta(
                    transaction,
                    id,
                    categoriesById,
                    accountsById,
                  );

                  return (
                    <View
                      key={transaction.id}
                      style={[
                        styles.transactionRow,
                        index < group.items.length - 1 &&
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
                        <Text
                          style={styles.transactionMeta}
                          numberOfLines={1}
                        >
                          {meta}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: palette.color },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {maskMoney(
                          `${palette.prefix}${formatCurrency(
                            transaction.amount,
                            transaction.currency,
                          )}`,
                          hidden,
                        )}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <Text style={styles.disclaimer}>
          Dados carregados da API da Finora. Transferências são exibidas
          conforme a conta de origem e destino.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 13,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 24,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 18,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  accountIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconInactive: {
    backgroundColor: '#EEEEEA',
  },
  accountIconText: {
    color: colors.primary,
    fontSize: 26,
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 5,
  },
  feedbackBlock: {
    marginBottom: 18,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 22,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: '#D9E8E0',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 14,
    marginBottom: 18,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 7,
  },
  statusActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statusInactive: {
    backgroundColor: colors.dangerLight,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9BD4B4',
  },
  statusDotInactive: {
    backgroundColor: colors.danger,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextInactive: {
    color: colors.danger,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  historyCount: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLight,
  },
  monthArrowText: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryHint: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 10,
  },
  filters: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  dateGroup: {
    marginBottom: 18,
  },
  dateHeading: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  transactionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  transactionMeta: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  transactionAmount: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statusState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  disclaimer: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 24,
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundDescription: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});

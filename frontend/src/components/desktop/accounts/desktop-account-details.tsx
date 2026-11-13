import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { DesktopAccountFormModal } from '@/components/desktop/accounts/desktop-account-form-modal';
import {
  formatCurrency,
  formatMonthLabel,
} from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import {
  mapDesktopTransaction,
  type DesktopTransaction,
} from '@/components/desktop/transactions/desktop-transactions-data';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { TransactionFormModal } from '@/components/transactions/transaction-form-modal';
import { useAccounts, type Account } from '@/contexts/accounts-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useTransactions } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import {
  deactivateAccount as deactivateAccountRequest,
  reactivateAccount as reactivateAccountRequest,
} from '@/services/accounts-api';
import { formatAccountType } from '@/utils/accounts';
import {
  TYPE_OPTIONS,
  filterDesktopTransactions,
  type TransactionTypeFilter,
} from '@/utils/desktop-transaction-filters';
import { summarizeTransactions } from '@/utils/financial-summary';
import { maskMoney } from '@/utils/privacy';
import { sortTransactionsByTimestampDescending } from '@/utils/transaction-sort';

/** Ícones vetoriais da página, na mesma biblioteca do Dashboard. */
const ICONS = {
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  previous: {
    ios: 'chevron.left',
    android: 'chevron_left',
    web: 'chevron_left',
  },
  next: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
  edit: { ios: 'square.and.pencil', android: 'edit', web: 'edit' },
  deactivate: {
    ios: 'pause.circle',
    android: 'power_settings_new',
    web: 'power_settings_new',
  },
  reactivate: {
    ios: 'checkmark.circle',
    android: 'check_circle',
    web: 'check_circle',
  },
  checking: {
    ios: 'building.columns',
    android: 'account_balance',
    web: 'account_balance',
  },
  savings: { ios: 'banknote', android: 'savings', web: 'savings' },
  wallet: {
    ios: 'wallet.pass',
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
  transfer: {
    ios: 'arrow.left.arrow.right',
    android: 'swap_horiz',
    web: 'swap_horiz',
  },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  remove: { ios: 'trash', android: 'delete_outline', web: 'delete_outline' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  empty: { ios: 'tray', android: 'inventory_2', web: 'inventory_2' },
} satisfies Record<string, SymbolViewProps['name']>;

type IconKey = keyof typeof ICONS;

function Icon({
  name,
  color,
  size = 16,
  style,
}: {
  name: IconKey;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}

type RowTone = {
  color: string;
  background: string;
  icon: IconKey;
};

const TONES: Record<DesktopTransaction['type'], RowTone> = {
  INCOME: {
    color: desktopColors.income,
    background: desktopColors.incomeSoft,
    icon: 'income',
  },
  EXPENSE: {
    color: desktopColors.expense,
    background: desktopColors.expenseSoft,
    icon: 'expense',
  },
  TRANSFER: {
    color: desktopColors.transfer,
    background: desktopColors.transferSoft,
    icon: 'transfer',
  },
};

type TransferDirection = 'in' | 'out';

const MENU_WIDTH = 172;
const MENU_HEIGHT = 100;

type RowMenuAnchor = {
  transaction: DesktopTransaction;
  left: number;
  top: number;
};

function getDirection(
  transaction: DesktopTransaction,
  accountId: string,
): TransferDirection {
  if (transaction.type === 'TRANSFER') {
    return transaction.accountId === accountId ? 'out' : 'in';
  }

  return transaction.type === 'INCOME' ? 'in' : 'out';
}

function getTypeLabel(
  transaction: DesktopTransaction,
  direction: TransferDirection,
) {
  if (transaction.type === 'INCOME') {
    return 'Receita';
  }

  if (transaction.type === 'EXPENSE') {
    return 'Despesa';
  }

  return direction === 'in'
    ? 'Transferência recebida'
    : 'Transferência enviada';
}

function getAmountPrefix(
  type: DesktopTransaction['type'],
  direction: TransferDirection,
) {
  if (type === 'INCOME') {
    return '+ ';
  }

  if (type === 'EXPENSE') {
    return '− ';
  }

  return direction === 'in' ? '+ ' : '− ';
}

function getCounterpartLabel(
  transaction: DesktopTransaction,
  accountId: string,
  accountsById: Map<string, Account>,
) {
  if (transaction.type !== 'TRANSFER') {
    return null;
  }

  if (transaction.accountId === accountId) {
    const name = transaction.destinationAccountId
      ? accountsById.get(transaction.destinationAccountId)?.name
      : null;

    return `Para ${name ?? 'conta removida'}`;
  }

  const name = accountsById.get(transaction.accountId)?.name;

  return `Recebida de ${name ?? 'conta removida'}`;
}

export function DesktopAccountDetails() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const accountId = Array.isArray(params.id) ? params.id[0] : params.id;

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
    deleteTransaction,
  } = useTransactions();
  const { showToast } = useFeedback();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const [monthOffset, setMonthOffset] = useState(0);
  const [type, setType] = useState<TransactionTypeFilter>('all');

  const [formVisible, setFormVisible] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [menuAnchor, setMenuAnchor] = useState<RowMenuAnchor | null>(null);

  const [deactivationVisible, setDeactivationVisible] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(
    null,
  );

  const [reactivationVisible, setReactivationVisible] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [reactivationError, setReactivationError] = useState<string | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<DesktopTransaction | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (cause) {
      setCategoriesError(
        cause instanceof Error
          ? cause.message
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

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId),
    [accountId, accounts],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((item) => [item.id, item])),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const selectedMonth = useMemo(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const desktopTransactions = useMemo(
    () =>
      sortTransactionsByTimestampDescending(
        transactions.map((transaction) =>
          mapDesktopTransaction(transaction, accountsById, categoriesById),
        ),
      ),
    [accountsById, categoriesById, transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      accountId
        ? filterDesktopTransactions(
            desktopTransactions,
            {
              query: '',
              period: 'current-month',
              accountId,
              categoryId: 'all',
              type,
              customStart: '',
              customEnd: '',
            },
            selectedMonth,
          )
        : [],
    [accountId, desktopTransactions, selectedMonth, type],
  );

  const summary = useMemo(() => {
    const visibleIds = new Set(
      filteredTransactions.map((transaction) => transaction.id),
    );

    return summarizeTransactions(
      transactions.filter((transaction) => visibleIds.has(transaction.id)),
    );
  }, [filteredTransactions, transactions]);

  const hasActiveFilters = monthOffset !== 0 || type !== 'all';

  const errorMessage = accountsError ?? transactionsError ?? categoriesError;

  const isInitialLoading = !account && (accountsLoading || !hasLoadedOnce);

  const isHistoryLoading =
    (transactionsLoading || categoriesLoading) &&
    desktopTransactions.length === 0;

  function changeMonth(offset: number) {
    setMonthOffset((current) => Math.min(current + offset, 0));
  }

  function clearFilters() {
    setMonthOffset(0);
    setType('all');
  }

  function goBack() {
    router.push('/accounts');
  }

  function openEditAccount() {
    if (!account) {
      return;
    }

    if (account.status !== 'ACTIVE') {
      showToast({
        variant: 'warning',
        title: 'Conta inativa',
        message: 'Não é possível editar uma conta inativa nesta versão.',
      });
      return;
    }

    setFormVisible(true);
  }

  async function confirmDeactivation() {
    if (!account || deactivating) {
      return;
    }

    setDeactivating(true);
    setDeactivationError(null);

    try {
      await deactivateAccountRequest(account.id);
      await refreshAccounts();
      setDeactivationVisible(false);

      showToast({
        variant: 'success',
        title: 'Conta desativada',
        message: 'A conta foi movida para as contas inativas.',
      });
    } catch (cause) {
      setDeactivationError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível desativar a conta. Tente novamente.',
      );
    } finally {
      setDeactivating(false);
    }
  }

  async function confirmReactivation() {
    if (!account || reactivating) {
      return;
    }

    setReactivating(true);
    setReactivationError(null);

    try {
      await reactivateAccountRequest(account.id);
      await refreshAccounts();
      setReactivationVisible(false);

      showToast({
        variant: 'success',
        title: 'Conta reativada',
        message: 'A conta voltou a aparecer entre as contas ativas.',
      });
    } catch (cause) {
      setReactivationError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível reativar a conta. Tente novamente.',
      );
    } finally {
      setReactivating(false);
    }
  }

  function openRowMenu(event: GestureResponderEvent, item: DesktopTransaction) {
    const { pageX, pageY } = event.nativeEvent;

    setMenuAnchor({
      transaction: item,
      left: Math.min(
        Math.max(pageX - MENU_WIDTH + 24, 12),
        Math.max(12, windowWidth - MENU_WIDTH - 12),
      ),
      top: Math.min(
        pageY + 8,
        Math.max(12, windowHeight - MENU_HEIGHT - 12),
      ),
    });
  }

  async function confirmDeleteTransaction() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);

      showToast({
        variant: 'success',
        title: 'Transação excluída',
        message: 'O histórico e os saldos foram atualizados.',
      });
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível excluir a transação. Tente novamente.',
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!account) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para minhas contas"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Icon name="back" size={16} color={desktopColors.primary} />
          <Text style={styles.backButtonText}>Minhas contas</Text>
        </Pressable>

        <View style={styles.stateCard}>
          {isInitialLoading ? (
            <>
              <ActivityIndicator size="large" color={desktopColors.primary} />
              <Text style={styles.stateText}>Carregando conta...</Text>
            </>
          ) : (
            <>
              <Text style={styles.stateTitle}>
                {accountsError
                  ? 'Não foi possível carregar a conta'
                  : 'Conta não encontrada'}
              </Text>
              <Text style={styles.stateText}>
                {accountsError ??
                  'Essa conta pode ter sido removida ou não está mais disponível.'}
              </Text>

              {accountsError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refreshDetails()}
                  disabled={refreshing}
                  style={({ pressed }) => [
                    styles.stateButton,
                    pressed && styles.stateButtonPressed,
                  ]}
                >
                  <Text style={styles.stateButtonText}>
                    {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  const isActive = account.status === 'ACTIVE';
  const accountIcon = account.type === 'SAVINGS' ? 'savings' : 'checking';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para minhas contas"
        onPress={goBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <Icon name="back" size={16} color={desktopColors.primary} />
        <Text style={styles.backButtonText}>Minhas contas</Text>
      </Pressable>

      <View style={styles.pageHeader}>
        <View style={styles.identity}>
          <View
            style={[
              styles.accountIcon,
              !isActive && styles.accountIconInactive,
            ]}
          >
            <Icon
              name={accountIcon}
              size={22}
              color={
                isActive ? desktopColors.primary : desktopColors.textMuted
              }
            />
          </View>

          <View style={styles.identityText}>
            <Text style={styles.title} numberOfLines={1}>
              {account.name}
            </Text>
            <View style={styles.identityMeta}>
              <Text style={styles.subtitle}>
                {formatAccountType(account.type)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isActive
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isActive
                      ? styles.statusDotActive
                      : styles.statusDotInactive,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    isActive
                      ? styles.statusTextActive
                      : styles.statusTextInactive,
                  ]}
                >
                  {isActive ? 'Ativa' : 'Inativa'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {isActive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar conta"
              onPress={openEditAccount}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Icon name="edit" size={15} color={desktopColors.textSecondary} />
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </Pressable>
          ) : null}

          {isActive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Desativar conta"
              onPress={() => {
                setDeactivationError(null);
                setDeactivationVisible(true);
              }}
              style={({ pressed }) => [
                styles.warningButton,
                pressed && styles.warningButtonPressed,
              ]}
            >
              <Icon name="deactivate" size={15} color={desktopColors.warning} />
              <Text style={styles.warningButtonText}>Desativar</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reativar conta"
              onPress={() => {
                setReactivationError(null);
                setReactivationVisible(true);
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Icon name="reactivate" size={15} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Reativar</Text>
            </Pressable>
          )}
        </View>
      </View>

      {errorMessage ? (
        <InlineFeedback
          variant="error"
          title="Não foi possível atualizar"
          message={errorMessage}
        />
      ) : null}

      <View style={styles.balanceCard}>
        <View style={styles.balanceMain}>
          <View style={styles.balanceIcon}>
            <Icon name="wallet" size={22} color={desktopColors.primary} />
          </View>

          <View style={styles.balanceTexts}>
            <Text style={styles.balanceLabel}>Saldo atual</Text>
            <Text
              style={[
                styles.balanceValue,
                account.balance < 0 && styles.negativeValue,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {maskMoney(formatCurrency(account.balance), hidden)}
            </Text>
            <Text style={styles.balanceHint} numberOfLines={1}>
              {account.name} · {formatAccountType(account.type)}
            </Text>
          </View>
        </View>

        <View style={styles.balanceSide}>
          {refreshing ? (
            <ActivityIndicator size="small" color={desktopColors.primary} />
          ) : (
            <Text style={styles.balanceSideText}>{formatMonthLabel(selectedMonth)}</Text>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Indicadores do período</Text>
        <Text style={styles.sectionHint}>
          {formatMonthLabel(selectedMonth)}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: desktopColors.incomeSoft },
            ]}
          >
            <Icon
              name="income"
              size={16}
              color={desktopColors.income}
            />
          </View>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text
            style={[styles.summaryValue, { color: desktopColors.income }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {maskMoney(formatCurrency(summary.income), hidden)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: desktopColors.expenseSoft },
            ]}
          >
            <Icon
              name="expense"
              size={16}
              color={desktopColors.expense}
            />
          </View>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text
            style={[styles.summaryValue, { color: desktopColors.expense }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {maskMoney(formatCurrency(summary.expense), hidden)}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryHint}>
        Transferências não entram nos indicadores de receitas e despesas.
      </Text>

      <View style={styles.filtersCard}>
        <View style={styles.filtersRow}>
          <View style={styles.periodField}>
            <Text style={styles.filterLabel}>Período</Text>
            <View style={styles.monthControl}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                onPress={() => changeMonth(-1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  pressed && styles.monthButtonPressed,
                ]}
              >
                <Icon
                  name="previous"
                  size={16}
                  color={desktopColors.primary}
                />
              </Pressable>

              <Text style={styles.monthLabel}>
                {formatMonthLabel(selectedMonth)}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                accessibilityState={{ disabled: monthOffset === 0 }}
                disabled={monthOffset === 0}
                onPress={() => changeMonth(1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  monthOffset === 0 && styles.monthButtonDisabled,
                  pressed && monthOffset !== 0 && styles.monthButtonPressed,
                ]}
              >
                <Icon
                  name="next"
                  size={16}
                  color={desktopColors.primary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.typeField}>
            <Text style={styles.filterLabel}>Tipo</Text>
            <View style={styles.typeGroup}>
              {TYPE_OPTIONS.map((option) => {
                const isSelected = type === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setType(option.value)}
                    style={({ pressed }) => [
                      styles.typeButton,
                      isSelected && styles.typeButtonActive,
                      pressed && !isSelected && styles.typeButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        isSelected && styles.typeButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.filtersFooter}>
          <Text style={styles.filterHint}>
            {filteredTransactions.length}{' '}
            {filteredTransactions.length === 1
              ? 'movimentação encontrada'
              : 'movimentações encontradas'}
          </Text>

          {hasActiveFilters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar filtros"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearFiltersButton,
                pressed && styles.clearFiltersButtonPressed,
              ]}
            >
              <Icon
                name="close"
                size={13}
                color={desktopColors.primary}
              />
              <Text style={styles.clearFiltersText}>Limpar filtros</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headCell, styles.dateCell]}>Data</Text>
          <Text style={[styles.headCell, styles.descriptionCell]}>
            Descrição
          </Text>
          <Text style={[styles.headCell, styles.categoryCell]}>
            Categoria
          </Text>
          <Text style={[styles.headCell, styles.typeCell]}>Tipo</Text>
          <Text style={[styles.headCell, styles.amountCell]}>Valor</Text>
          <View style={styles.actionsCell} />
        </View>

        {isHistoryLoading ? (
          <View style={styles.tableState}>
            <ActivityIndicator size="large" color={desktopColors.primary} />
            <Text style={styles.stateText}>Carregando movimentações...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.tableState}>
            <View style={styles.emptyIcon}>
              <Icon name="empty" size={26} color={desktopColors.primary} />
            </View>
            <Text style={styles.stateTitle}>
              {hasActiveFilters
                ? 'Nenhuma movimentação para os filtros'
                : 'Nenhuma movimentação neste mês'}
            </Text>
            <Text style={styles.stateText}>
              {hasActiveFilters
                ? 'Ajuste o período ou o tipo para ver outras movimentações.'
                : 'Selecione outro mês ou registre uma transação na aba Transações.'}
            </Text>

            {hasActiveFilters ? (
              <Pressable
                accessibilityRole="button"
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.stateButton,
                  pressed && styles.stateButtonPressed,
                ]}
              >
                <Text style={styles.stateButtonText}>Limpar filtros</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filteredTransactions.map((item, index) => {
            const direction = getDirection(item, account.id);
            const tone = TONES[item.type];
            const counterpart = getCounterpartLabel(
              item,
              account.id,
              accountsById,
            );

            return (
              <View
                key={item.id}
                style={[
                  styles.row,
                  index === filteredTransactions.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.dateCell}>
                  <Text style={styles.dateText}>{item.dateLabel}</Text>
                  <Text style={styles.timeText}>{item.timeLabel}</Text>
                </View>

                <View style={styles.descriptionCell}>
                  <Text style={styles.descriptionText} numberOfLines={1}>
                    {item.description}
                  </Text>
                  {counterpart ? (
                    <Text style={styles.descriptionMeta} numberOfLines={1}>
                      {counterpart}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.categoryText, styles.categoryCell]} numberOfLines={1}>
                  {item.category}
                </Text>

                <View style={styles.typeCell}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: tone.background },
                    ]}
                    accessibilityLabel={getTypeLabel(item, direction)}
                  >
                    <Icon name={tone.icon} size={11} color={tone.color} />
                    <Text
                      style={[styles.typeBadgeText, { color: tone.color }]}
                      numberOfLines={1}
                    >
                      {getTypeLabel(item, direction)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.amountText,
                    styles.amountCell,
                    { color: tone.color },
                  ]}
                  numberOfLines={1}
                >
                  {maskMoney(
                    `${getAmountPrefix(item.type, direction)}${formatCurrency(
                      item.amount,
                      item.currency,
                    )}`,
                    hidden,
                  )}
                </Text>

                <View style={styles.actionsCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ações da transação ${item.description}`}
                    onPress={(event) => openRowMenu(event, item)}
                    style={({ pressed }) => [
                      styles.moreButton,
                      pressed && styles.moreButtonPressed,
                    ]}
                  >
                    <Icon
                      name="more"
                      size={18}
                      color={desktopColors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.disclaimer}>
        Saldos e transações são carregados da API da Finora. Transferências são
        exibidas conforme a conta de origem e destino.
      </Text>

      {formVisible ? (
        <DesktopAccountFormModal
          mode="edit"
          account={account}
          onClose={() => setFormVisible(false)}
        />
      ) : null}

      {editingTransactionId ? (
        <TransactionFormModal
          mode="edit"
          transactionId={editingTransactionId}
          accounts={accounts}
          categories={categories}
          variant="desktop"
          onClose={() => setEditingTransactionId(null)}
        />
      ) : null}

      <Modal
        transparent
        visible={menuAnchor !== null}
        animationType="fade"
        onRequestClose={() => setMenuAnchor(null)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuAnchor(null)}
          />

          {menuAnchor ? (
            <View
              style={[
                styles.rowMenu,
                { left: menuAnchor.left, top: menuAnchor.top },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const { transaction } = menuAnchor;
                  setMenuAnchor(null);
                  setEditingTransactionId(transaction.id);
                }}
                style={({ pressed }) => [
                  styles.rowMenuItem,
                  pressed && styles.rowMenuItemPressed,
                ]}
              >
                <Icon
                  name="edit"
                  size={15}
                  color={desktopColors.textSecondary}
                />
                <Text style={styles.rowMenuText}>Editar</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const { transaction } = menuAnchor;
                  setMenuAnchor(null);
                  setDeleteError(null);
                  setDeleteTarget(transaction);
                }}
                style={({ pressed }) => [
                  styles.rowMenuItem,
                  pressed && styles.rowMenuItemPressed,
                ]}
              >
                <Icon name="remove" size={15} color={desktopColors.expense} />
                <Text style={[styles.rowMenuText, styles.rowMenuDangerText]}>
                  Excluir
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <ConfirmDialog
        visible={deactivationVisible}
        title="Desativar conta?"
        message={`A conta "${account.name}" deixará de aparecer entre as contas ativas. Você poderá reativá-la posteriormente.`}
        confirmLabel="Desativar"
        tone="warning"
        loading={deactivating}
        error={deactivationError}
        onConfirm={() => void confirmDeactivation()}
        onCancel={() => {
          if (!deactivating) {
            setDeactivationVisible(false);
            setDeactivationError(null);
          }
        }}
      />

      <ConfirmDialog
        visible={reactivationVisible}
        title="Reativar conta?"
        message={`Deseja reativar "${account.name}"? A conta voltará a aparecer entre as contas ativas.`}
        confirmLabel="Reativar"
        tone="primary"
        loading={reactivating}
        error={reactivationError}
        onConfirm={() => void confirmReactivation()}
        onCancel={() => {
          if (!reactivating) {
            setReactivationVisible(false);
            setReactivationError(null);
          }
        }}
      />

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Excluir transação?"
        message={
          deleteTarget
            ? `Deseja excluir "${deleteTarget.description}"? Essa operação também reverterá o efeito da transação no saldo da conta.`
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void confirmDeleteTransaction()}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
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
    gap: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: -4,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    color: desktopColors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  pageHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
  },
  accountIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  accountIconInactive: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  identityText: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: desktopColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: desktopFont,
  },
  identityMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: desktopColors.incomeSoft,
  },
  statusBadgeInactive: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: desktopColors.income,
  },
  statusDotInactive: {
    backgroundColor: desktopColors.textMuted,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: desktopFont,
  },
  statusTextActive: {
    color: desktopColors.income,
  },
  statusTextInactive: {
    color: desktopColors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  secondaryButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  secondaryButtonText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  warningButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.warningSoft,
    backgroundColor: desktopColors.warningSoft,
  },
  warningButtonPressed: {
    backgroundColor: '#F1E4CB',
  },
  warningButtonText: {
    color: desktopColors.warning,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  primaryButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: desktopColors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: desktopColors.primaryStrong,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  balanceCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    padding: 22,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  balanceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexGrow: 1,
    minWidth: 250,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  balanceTexts: {
    flexShrink: 1,
    minWidth: 0,
  },
  balanceLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  balanceValue: {
    marginTop: 4,
    color: desktopColors.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.1,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  negativeValue: {
    color: desktopColors.expense,
  },
  balanceHint: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  balanceSide: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 120,
  },
  balanceSideText: {
    color: desktopColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  sectionTitle: {
    color: desktopColors.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  sectionHint: {
    color: desktopColors.textMuted,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 240,
    maxWidth: 460,
    gap: 6,
    padding: 18,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  summaryHint: {
    marginTop: -6,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  filtersCard: {
    gap: 12,
    padding: 16,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 16,
  },
  periodField: {
    gap: 6,
  },
  filterLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  monthControl: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  monthButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  monthButtonDisabled: {
    opacity: 0.32,
  },
  monthLabel: {
    minWidth: 148,
    textAlign: 'center',
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  typeField: {
    gap: 6,
    flexGrow: 1,
  },
  typeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    borderRadius: 13,
    backgroundColor: desktopColors.surfaceMuted,
  },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: desktopColors.surface,
    shadowColor: desktopColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  typeButtonPressed: {
    backgroundColor: desktopColors.surface,
  },
  typeButtonText: {
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  typeButtonTextActive: {
    color: desktopColors.primary,
  },
  filtersFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterHint: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  clearFiltersButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  clearFiltersText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  tableCard: {
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    overflow: 'hidden',
    ...desktopShadows.card,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  headCell: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dateCell: {
    width: 82,
    flexShrink: 0,
  },
  descriptionCell: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  categoryCell: {
    width: 136,
    flexShrink: 0,
  },
  typeCell: {
    width: 158,
    flexShrink: 0,
  },
  amountCell: {
    width: 126,
    flexShrink: 0,
    textAlign: 'right',
  },
  actionsCell: {
    width: 30,
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  dateText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  timeText: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  descriptionText: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  descriptionMeta: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  categoryText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
  moreButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  tableState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 46,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 56,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  stateTitle: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  stateText: {
    maxWidth: 420,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  stateButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  stateButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  stateButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  disclaimer: {
    marginTop: 2,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
  overlay: {
    flex: 1,
  },
  rowMenu: {
    position: 'absolute',
    width: MENU_WIDTH,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.popover,
  },
  rowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  rowMenuItemPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  rowMenuText: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  rowMenuDangerText: {
    color: desktopColors.expense,
  },
});

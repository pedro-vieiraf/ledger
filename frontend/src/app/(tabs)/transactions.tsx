
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import {
  useTransactions,
} from '../../contexts/transactions-context';
import {
  getAccounts,
  type Account,
} from '../../services/accounts-api';
import {
  getCategories,
  type Category,
} from '../../services/categories-api';
import type {
  Transaction as ApiTransaction,
  TransactionType as ApiTransactionType,
} from '../../services/transactions-api';

type TransactionType = 'income' | 'expense' | 'transfer';
type FilterType = 'all' | TransactionType;
type FormMode = 'create' | 'edit';

type Transaction = {
  id: string;
  description: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  currency: string;
  type: TransactionType;
  icon: string;
};

type TransactionForm = {
  type: TransactionType;
  amount: string;
  description: string;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
};

const COLORS = {
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
};

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
  { label: 'Transferências', value: 'transfer' },
];

const TRANSACTION_TYPES: {
  label: string;
  value: TransactionType;
}[] = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferência', value: 'transfer' },
];

const INITIAL_FORM: TransactionForm = {
  type: 'expense',
  amount: '',
  description: '',
  accountId: '',
  destinationAccountId: '',
  categoryId: '',
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatMonth(date: Date) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDateHeading(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(date);
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

function parseAmount(value: string): number {
  const normalized = value.trim().replace(/\s/g, '');

  if (!normalized) {
    return Number.NaN;
  }

  const parsed = normalized.includes(',')
      ? Number(normalized.replace(/\./g, '').replace(',', '.'))
      : Number(normalized);

  return parsed;
}

function mapTransactionType(type: ApiTransactionType): TransactionType {
  switch (type) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'TRANSFER':
      return 'transfer';
  }
}

function toApiTransactionType(type: TransactionType): ApiTransactionType {
  switch (type) {
    case 'income':
      return 'INCOME';
    case 'expense':
      return 'EXPENSE';
    case 'transfer':
      return 'TRANSFER';
  }
}

function getTransactionColor(type: TransactionType) {
  if (type === 'income') return COLORS.income;
  if (type === 'transfer') return COLORS.transfer;
  return COLORS.expense;
}

function getTransactionBackground(type: TransactionType) {
  if (type === 'income') return COLORS.incomeBackground;
  if (type === 'transfer') return COLORS.transferBackground;
  return COLORS.expenseBackground;
}

function getAmountPrefix(type: TransactionType) {
  if (type === 'income') return '+ ';
  if (type === 'expense') return '− ';
  return '';
}

function getTransactionIcon(type: TransactionType) {
  if (type === 'income') return '↙';
  if (type === 'transfer') return '↔';
  return '↗';
}

function getDefaultDescription(type: TransactionType) {
  if (type === 'income') return 'Receita';
  if (type === 'transfer') return 'Transferência';
  return 'Despesa';
}

function mapApiTransaction(
    transaction: ApiTransaction,
    accountsById: Map<string, Account>,
    categoriesById: Map<string, Category>,
): Transaction {
  const type = mapTransactionType(transaction.type);
  const sourceAccount = accountsById.get(transaction.accountId);
  const destinationAccount = transaction.destinationAccountId
      ? accountsById.get(transaction.destinationAccountId)
      : undefined;

  const category = transaction.categoryId
      ? categoriesById.get(transaction.categoryId)
      : undefined;

  let accountLabel = sourceAccount?.name ?? 'Conta desconhecida';

  if (type === 'transfer' && destinationAccount) {
    accountLabel = `${accountLabel} → ${destinationAccount.name}`;
  }

  return {
    id: transaction.id,
    description:
        transaction.description?.trim() || getDefaultDescription(type),
    category:
        type === 'transfer'
            ? 'Transferência'
            : category?.name ?? 'Sem categoria',
    account: accountLabel,
    date: getLocalDateKey(transaction.timestamp),
    amount: transaction.amount,
    currency: transaction.currency,
    type,
    icon: getTransactionIcon(type),
  };
}

function TransactionRow({
                          transaction,
                          onPress,
                        }: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const color = getTransactionColor(transaction.type);
  const backgroundColor = getTransactionBackground(transaction.type);

  return (
      <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${transaction.description}`}
          onPress={onPress}
          style={({ pressed }) => [
            styles.transactionRow,
            pressed && styles.pressedRow,
          ]}
      >
        <View style={[styles.transactionIcon, { backgroundColor }]}>
          <Text style={styles.transactionIconText}>
            {transaction.icon}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionMeta} numberOfLines={1}>
            {transaction.category} · {transaction.account}
          </Text>
        </View>

        <Text
            style={[styles.transactionAmount, { color }]}
            numberOfLines={1}
        >
          {getAmountPrefix(transaction.type)}
          {formatCurrency(transaction.amount, transaction.currency)}
        </Text>
      </Pressable>
  );
}

export default function TransactionsScreen() {
  const {
    transactions: apiTransactions,
    loading: transactionsLoading,
    error: transactionsError,
    refreshTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedFilter, setSelectedFilter] =
      useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTransactionId, setEditingTransactionId] =
      useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadScreenData = useCallback(async () => {
    setReferencesLoading(true);
    setScreenError(null);

    try {
      const [loadedAccounts, loadedCategories] = await Promise.all([
        getAccounts(),
        getCategories(),
        refreshTransactions(),
      ]).then(([accountData, categoryData]) => [
        accountData,
        categoryData,
      ] as const);

      setAccounts(loadedAccounts);
      setCategories(loadedCategories);
    } catch (cause) {
      setScreenError(
          cause instanceof Error
              ? cause.message
              : 'Não foi possível carregar os dados das transações.',
      );
    } finally {
      setReferencesLoading(false);
    }
  }, [refreshTransactions]);

  useFocusEffect(
      useCallback(() => {
        void loadScreenData();
      }, [loadScreenData]),
  );

  const activeAccounts = useMemo(
      () => accounts.filter((account) => account.status === 'ACTIVE'),
      [accounts],
  );

  const accountsById = useMemo(
      () => new Map(accounts.map((account) => [account.id, account])),
      [accounts],
  );

  const categoriesById = useMemo(
      () =>
          new Map(categories.map((category) => [category.id, category])),
      [categories],
  );

  const mappedTransactions = useMemo(
      () =>
          apiTransactions
          .map((transaction) =>
              mapApiTransaction(transaction, accountsById, categoriesById),
          )
          .sort(
              (a, b) =>
                  b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          ),
      [apiTransactions, accountsById, categoriesById],
  );

  const selectedMonth = useMemo(() => {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth() + monthOffset,
        1,
    );
  }, [monthOffset]);

  const monthKey = [
    selectedMonth.getFullYear(),
    String(selectedMonth.getMonth() + 1).padStart(2, '0'),
  ].join('-');

  const monthTransactions = useMemo(
      () =>
          mappedTransactions
          .filter((transaction) => transaction.date.startsWith(monthKey))
          .sort(
              (a, b) =>
                  b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          ),
      [mappedTransactions, monthKey],
  );

  const summary = useMemo(
      () =>
          monthTransactions.reduce(
              (totals, transaction) => {
                if (transaction.currency !== 'BRL') {
                  return totals;
                }

                if (transaction.type === 'income') {
                  totals.income += transaction.amount;
                } else if (transaction.type === 'expense') {
                  totals.expense += transaction.amount;
                } else {
                  totals.transfer += transaction.amount;
                }

                return totals;
              },
              { income: 0, expense: 0, transfer: 0 },
          ),
      [monthTransactions],
  );

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('pt-BR');

    return monthTransactions.filter((transaction) => {
      const matchesFilter =
          selectedFilter === 'all' ||
          transaction.type === selectedFilter;

      const searchableText = [
        transaction.description,
        transaction.category,
        transaction.account,
      ]
      .join(' ')
      .toLocaleLowerCase('pt-BR');

      return (
          matchesFilter &&
          (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [monthTransactions, searchQuery, selectedFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string; transactions: Transaction[] }[] = [];

    for (const transaction of filteredTransactions) {
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.date === transaction.date) {
        lastGroup.transactions.push(transaction);
      } else {
        groups.push({
          date: transaction.date,
          transactions: [transaction],
        });
      }
    }

    return groups;
  }, [filteredTransactions]);

  const updateForm = <K extends keyof TransactionForm>(
      key: K,
      value: TransactionForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openCreateModal = () => {
    if (activeAccounts.length === 0) {
      Alert.alert(
          'Nenhuma conta ativa',
          'Crie ou reative uma conta antes de registrar uma transação.',
      );
      return;
    }

    setFormMode('create');
    setEditingTransactionId(null);
    setForm({
      ...INITIAL_FORM,
      accountId: activeAccounts[0]?.id ?? '',
      destinationAccountId:
          activeAccounts.find(
              (account) => account.id !== activeAccounts[0]?.id,
          )?.id ?? '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (transactionId: string) => {
    const transaction = apiTransactions.find(
        (item) => item.id === transactionId,
    );

    if (!transaction) {
      Alert.alert(
          'Transação indisponível',
          'Não foi possível encontrar essa transação nos dados atuais. Atualize a tela e tente novamente.',
      );
      return;
    }

    setFormMode('edit');
    setEditingTransactionId(transaction.id);
    setForm({
      type: mapTransactionType(transaction.type),
      amount: String(transaction.amount),
      description: transaction.description ?? '',
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId ?? '',
      categoryId: transaction.categoryId ?? '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);

    const amount = parseAmount(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Informe um valor maior que zero. Exemplo: 125,90.');
      return;
    }

    if (formMode === 'create') {
      const sourceAccount = activeAccounts.find(
          (account) => account.id === form.accountId,
      );

      if (!sourceAccount) {
        setFormError('Selecione uma conta de origem ativa.');
        return;
      }

      if (
          form.type === 'transfer' &&
          (!form.destinationAccountId ||
              form.destinationAccountId === form.accountId ||
              !activeAccounts.some(
                  (account) => account.id === form.destinationAccountId,
              ))
      ) {
        setFormError(
            'Selecione uma conta de destino ativa, diferente da origem.',
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (formMode === 'create') {
        await createTransaction({
          amount,
          currency: 'BRL',
          type: toApiTransactionType(form.type),
          description: form.description.trim() || null,
          accountId: form.accountId,
          ...(form.type === 'transfer'
              ? { destinationAccountId: form.destinationAccountId }
              : {}),
          ...(form.type !== 'transfer' && form.categoryId
              ? { categoryId: form.categoryId }
              : {}),
        });
      } else {
        if (!editingTransactionId) {
          throw new Error('Não foi possível identificar a transação.');
        }

        const originalTransaction = apiTransactions.find(
            (transaction) => transaction.id === editingTransactionId,
        );

        if (!originalTransaction) {
          throw new Error(
              'A transação não está mais disponível. Atualize a lista e tente novamente.',
          );
        }

        await updateTransaction(editingTransactionId, {
          amount,
          description: form.description.trim() || null,
          ...(originalTransaction.type !== 'TRANSFER' && form.categoryId
              ? { categoryId: form.categoryId }
              : {}),
        });
      }

      setModalVisible(false);
      setFormError(null);
    } catch (cause) {
      setFormError(
          cause instanceof Error
              ? cause.message
              : 'Não foi possível salvar a transação.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (transactionId: string) => {
    const transaction = apiTransactions.find(
        (item) => item.id === transactionId,
    );

    if (!transaction) {
      Alert.alert(
          'Transação indisponível',
          'Atualize a lista antes de tentar excluir essa transação.',
      );
      return;
    }

    const description =
        transaction.description?.trim() ||
        getDefaultDescription(mapTransactionType(transaction.type));

    Alert.alert(
        'Excluir transação?',
        `Deseja excluir "${description}"? Essa operação também reverterá o efeito da transação no saldo da conta.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await deleteTransaction(transactionId);
                  setModalVisible(false);
                } catch (cause) {
                  Alert.alert(
                      'Não foi possível excluir',
                      cause instanceof Error
                          ? cause.message
                          : 'Tente novamente.',
                  );
                }
              })();
            },
          },
        ],
    );
  };

  const loading = referencesLoading || transactionsLoading;
  const error = screenError ?? transactionsError;

  return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.eyebrow}>SEU DINHEIRO, EM DETALHES</Text>
              <Text style={styles.title}>Transações</Text>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar transação"
                onPress={openCreateModal}
                style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.monthSelector}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                onPress={() => setMonthOffset((current) => current - 1)}
                style={styles.monthArrow}
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </Pressable>

            <Text style={styles.monthTitle}>
              {formatMonth(selectedMonth)}
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                onPress={() =>
                    setMonthOffset((current) => Math.min(current + 1, 0))
                }
                disabled={monthOffset === 0}
                style={[
                  styles.monthArrow,
                  monthOffset === 0 && styles.disabledArrow,
                ]}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resultado do período</Text>
            <Text
                style={[
                  styles.summaryBalance,
                  summary.income - summary.expense < 0 &&
                  styles.negativeBalance,
                ]}
            >
              {formatCurrency(summary.income - summary.expense, 'BRL')}
            </Text>
            <Text style={styles.summaryHint}>
              Receitas menos despesas, sem transferências
            </Text>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <View style={styles.metricHeading}>
                  <View
                      style={[
                        styles.metricDot,
                        { backgroundColor: COLORS.income },
                      ]}
                  />
                  <Text style={styles.metricLabel}>Receitas</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.income }]}>
                  {formatCurrency(summary.income, 'BRL')}
                </Text>
              </View>

              <View style={styles.metricSeparator} />

              <View style={styles.summaryMetric}>
                <View style={styles.metricHeading}>
                  <View
                      style={[
                        styles.metricDot,
                        { backgroundColor: COLORS.expense },
                      ]}
                  />
                  <Text style={styles.metricLabel}>Despesas</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.expense }]}>
                  {formatCurrency(summary.expense, 'BRL')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.transferSummary}>
            <View style={styles.transferIcon}>
              <Text style={styles.transferIconText}>↔</Text>
            </View>
            <View style={styles.transferDetails}>
              <Text style={styles.transferTitle}>Transferências</Text>
              <Text style={styles.transferHint}>
                Movimentações entre contas
              </Text>
            </View>
            <Text style={styles.transferAmount}>
              {formatCurrency(summary.transfer, 'BRL')}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico</Text>
            <Text style={styles.transactionCount}>
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1
                  ? 'movimentação'
                  : 'movimentações'}
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar transação, categoria ou conta"
                placeholderTextColor={COLORS.secondary}
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Buscar transações"
            />
            {searchQuery.length > 0 && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca"
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                >
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
            )}
          </View>

          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
          >
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter.value;

              return (
                  <Pressable
                      key={filter.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedFilter(filter.value)}
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
                      {filter.label}
                    </Text>
                  </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
              <View style={styles.statusState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptyDescription}>
                  Carregando transações...
                </Text>
              </View>
          ) : error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  Não foi possível carregar as transações
                </Text>
                <Text style={styles.emptyDescription}>{error}</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadScreenData()}
                    style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </Pressable>
              </View>
          ) : groupedTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⌕</Text>
                <Text style={styles.emptyTitle}>
                  Nenhuma transação encontrada
                </Text>
                <Text style={styles.emptyDescription}>
                  Tente outro filtro, outro termo de busca ou selecione um mês
                  diferente. Você também pode registrar uma nova transação.
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={openCreateModal}
                    style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Adicionar transação</Text>
                </Pressable>
              </View>
          ) : (
              groupedTransactions.map((group) => (
                  <View key={group.date} style={styles.dateGroup}>
                    <Text style={styles.dateHeading}>
                      {formatDateHeading(group.date)}
                    </Text>

                    <View style={styles.transactionList}>
                      {group.transactions.map((transaction) => (
                          <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              onPress={() => openEditModal(transaction.id)}
                          />
                      ))}
                    </View>
                  </View>
              ))
          )}

          <Text style={styles.disclaimer}>
            Dados carregados da API do Ledger. As contas não estão conectadas
            automaticamente a instituições financeiras.
          </Text>
        </ScrollView>

        <Modal
            visible={modalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeModal}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <KeyboardAvoidingView
                style={styles.modalKeyboard}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalEyebrow}>
                    {formMode === 'create'
                        ? 'NOVA MOVIMENTAÇÃO'
                        : 'DETALHES DA MOVIMENTAÇÃO'}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {formMode === 'create'
                        ? 'Adicionar transação'
                        : 'Editar transação'}
                  </Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar formulário"
                    onPress={closeModal}
                    disabled={saving}
                    style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
              >
                {formMode === 'create' ? (
                    <>
                      <Text style={styles.fieldLabel}>Tipo de transação</Text>
                      <View style={styles.optionRow}>
                        {TRANSACTION_TYPES.map((item) => {
                          const selected = form.type === item.value;

                          return (
                              <Pressable
                                  key={item.value}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected }}
                                  onPress={() => {
                                    updateForm('type', item.value);

                                    if (item.value === 'transfer') {
                                      updateForm('categoryId', '');
                                    }
                                  }}
                                  style={[
                                    styles.typeOption,
                                    selected && styles.typeOptionSelected,
                                  ]}
                              >
                                <Text
                                    style={[
                                      styles.typeOptionText,
                                      selected && styles.typeOptionTextSelected,
                                    ]}
                                >
                                  {item.label}
                                </Text>
                              </Pressable>
                          );
                        })}
                      </View>
                    </>
                ) : (
                    <View style={styles.readOnlyNotice}>
                      <Text style={styles.readOnlyNoticeText}>
                        Tipo e contas não podem ser alterados nesta versão.
                        Para mudar esses dados, exclua a transação e crie outra.
                      </Text>
                    </View>
                )}

                <Text style={styles.fieldLabel}>Valor (R$)</Text>
                <TextInput
                    value={form.amount}
                    onChangeText={(value) => updateForm('amount', value)}
                    placeholder="0,00"
                    placeholderTextColor={COLORS.secondary}
                    keyboardType="decimal-pad"
                    style={styles.formInput}
                    accessibilityLabel="Valor da transação em reais"
                />

                <Text style={styles.fieldLabel}>Descrição</Text>
                <TextInput
                    value={form.description}
                    onChangeText={(value) => updateForm('description', value)}
                    placeholder="Ex.: Mercado, salário, aluguel..."
                    placeholderTextColor={COLORS.secondary}
                    style={styles.formInput}
                    maxLength={160}
                    accessibilityLabel="Descrição da transação"
                />

                {formMode === 'create' && (
                    <>
                      <Text style={styles.fieldLabel}>
                        {form.type === 'transfer'
                            ? 'Conta de origem'
                            : 'Conta'}
                      </Text>

                      {activeAccounts.length === 0 ? (
                          <Text style={styles.noOptionsText}>
                            Nenhuma conta ativa disponível.
                          </Text>
                      ) : (
                          <View style={styles.selectionList}>
                            {activeAccounts.map((account) => {
                              const selected = form.accountId === account.id;

                              return (
                                  <Pressable
                                      key={account.id}
                                      accessibilityRole="button"
                                      accessibilityState={{ selected }}
                                      onPress={() => {
                                        updateForm('accountId', account.id);

                                        if (
                                            form.destinationAccountId === account.id
                                        ) {
                                          updateForm(
                                              'destinationAccountId',
                                              activeAccounts.find(
                                                  (item) => item.id !== account.id,
                                              )?.id ?? '',
                                          );
                                        }
                                      }}
                                      style={[
                                        styles.selectionOption,
                                        selected && styles.selectionOptionSelected,
                                      ]}
                                  >
                                    <Text
                                        style={[
                                          styles.selectionOptionText,
                                          selected &&
                                          styles.selectionOptionTextSelected,
                                        ]}
                                    >
                                      {account.name}
                                    </Text>
                                    <Text
                                        style={[
                                          styles.selectionCheck,
                                          selected && styles.selectionCheckSelected,
                                        ]}
                                    >
                                      {selected ? '✓' : ''}
                                    </Text>
                                  </Pressable>
                              );
                            })}
                          </View>
                      )}

                      {form.type === 'transfer' && (
                          <>
                            <Text style={styles.fieldLabel}>Conta de destino</Text>
                            <View style={styles.selectionList}>
                              {activeAccounts
                              .filter((account) => account.id !== form.accountId)
                              .map((account) => {
                                const selected =
                                    form.destinationAccountId === account.id;

                                return (
                                    <Pressable
                                        key={account.id}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        onPress={() =>
                                            updateForm(
                                                'destinationAccountId',
                                                account.id,
                                            )
                                        }
                                        style={[
                                          styles.selectionOption,
                                          selected &&
                                          styles.selectionOptionSelected,
                                        ]}
                                    >
                                      <Text
                                          style={[
                                            styles.selectionOptionText,
                                            selected &&
                                            styles.selectionOptionTextSelected,
                                          ]}
                                      >
                                        {account.name}
                                      </Text>
                                      <Text
                                          style={[
                                            styles.selectionCheck,
                                            selected &&
                                            styles.selectionCheckSelected,
                                          ]}
                                      >
                                        {selected ? '✓' : ''}
                                      </Text>
                                    </Pressable>
                                );
                              })}
                              {activeAccounts.filter(
                                  (account) => account.id !== form.accountId,
                              ).length === 0 && (
                                  <Text style={styles.noOptionsText}>
                                    Você precisa de pelo menos duas contas ativas
                                    para realizar uma transferência.
                                  </Text>
                              )}
                            </View>
                          </>
                      )}
                    </>
                )}

                {form.type !== 'transfer' && (
                    <>
                      <Text style={styles.fieldLabel}>Categoria</Text>

                      <View style={styles.selectionList}>
                        {formMode === 'create' && (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{
                                  selected: form.categoryId === '',
                                }}
                                onPress={() => updateForm('categoryId', '')}
                                style={[
                                  styles.selectionOption,
                                  form.categoryId === '' &&
                                  styles.selectionOptionSelected,
                                ]}
                            >
                              <Text
                                  style={[
                                    styles.selectionOptionText,
                                    form.categoryId === '' &&
                                    styles.selectionOptionTextSelected,
                                  ]}
                              >
                                Sem categoria
                              </Text>
                              <Text
                                  style={[
                                    styles.selectionCheck,
                                    form.categoryId === '' &&
                                    styles.selectionCheckSelected,
                                  ]}
                              >
                                {form.categoryId === '' ? '✓' : ''}
                              </Text>
                            </Pressable>
                        )}

                        {categories.map((category) => {
                          const selected = form.categoryId === category.id;

                          return (
                              <Pressable
                                  key={category.id}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected }}
                                  onPress={() =>
                                      updateForm('categoryId', category.id)
                                  }
                                  style={[
                                    styles.selectionOption,
                                    selected && styles.selectionOptionSelected,
                                  ]}
                              >
                                <Text
                                    style={[
                                      styles.selectionOptionText,
                                      selected &&
                                      styles.selectionOptionTextSelected,
                                    ]}
                                >
                                  {category.name}
                                </Text>
                                <Text
                                    style={[
                                      styles.selectionCheck,
                                      selected && styles.selectionCheckSelected,
                                    ]}
                                >
                                  {selected ? '✓' : ''}
                                </Text>
                              </Pressable>
                          );
                        })}

                        {categories.length === 0 && (
                            <Text style={styles.noOptionsText}>
                              Nenhuma categoria cadastrada. Você pode salvar sem
                              categoria e cadastrar uma depois.
                            </Text>
                        )}
                      </View>

                      {formMode === 'edit' &&
                          !form.categoryId && (
                              <Text style={styles.fieldHint}>
                                A transação continuará sem categoria se você não
                                selecionar uma.
                              </Text>
                          )}
                    </>
                )}

                {formError && (
                    <View style={styles.formErrorContainer}>
                      <Text style={styles.formErrorText}>{formError}</Text>
                    </View>
                )}

                <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleSave()}
                    disabled={saving}
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
                >
                  {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                  ) : (
                      <Text style={styles.saveButtonText}>
                        {formMode === 'create'
                            ? 'Salvar transação'
                            : 'Salvar alterações'}
                      </Text>
                  )}
                </Pressable>

                {formMode === 'edit' && editingTransactionId && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => handleDelete(editingTransactionId)}
                        disabled={saving}
                        style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>
                        Excluir transação
                      </Text>
                    </Pressable>
                )}

                <Text style={styles.modalDisclaimer}>
                  Os saldos são atualizados pelo backend após salvar ou excluir
                  uma transação.
                </Text>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '400',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 28,
  },
  disabledArrow: {
    opacity: 0.35,
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBalance: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  negativeBalance: {
    color: COLORS.expense,
  },
  summaryHint: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMetric: {
    flex: 1,
  },
  metricHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  metricSeparator: {
    width: 1,
    height: 38,
    backgroundColor: COLORS.border,
    marginHorizontal: 18,
  },
  transferSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.transferBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 26,
  },
  transferIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  transferIconText: {
    color: COLORS.transfer,
    fontSize: 20,
    fontWeight: '700',
  },
  transferDetails: {
    flex: 1,
  },
  transferTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  transferHint: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  transferAmount: {
    color: COLORS.transfer,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  transactionCount: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 13,
  },
  searchIcon: {
    color: COLORS.secondary,
    fontSize: 23,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    paddingVertical: 13,
  },
  clearSearch: {
    color: COLORS.secondary,
    fontSize: 22,
    paddingLeft: 8,
  },
  filters: {
    gap: 8,
    paddingBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  dateGroup: {
    marginBottom: 22,
  },
  dateHeading: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 10,
  },
  transactionList: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pressedRow: {
    opacity: 0.7,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  transactionMeta: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 5,
  },
  transactionAmount: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyIcon: {
    color: COLORS.primary,
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalEyebrow: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 26,
    lineHeight: 29,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 9,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
  },
  readOnlyNotice: {
    backgroundColor: COLORS.primaryLight,
    padding: 13,
    borderRadius: 12,
  },
  readOnlyNoticeText: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 18,
  },
  selectionList: {
    gap: 7,
  },
  selectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selectionOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  selectionOptionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  selectionOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectionCheck: {
    color: 'transparent',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  selectionCheckSelected: {
    color: COLORS.primary,
  },
  noOptionsText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 5,
  },
  fieldHint: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  formErrorContainer: {
    backgroundColor: COLORS.expenseBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  formErrorText: {
    color: COLORS.expense,
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.expense,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: COLORS.expense,
    fontSize: 13,
    fontWeight: '700',
  },
  modalDisclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
});

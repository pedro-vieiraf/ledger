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

import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { RecurrenceFormModal } from '@/components/recurrences/recurrence-form-modal';
import {
  RECURRENCE_COLORS as COLORS,
  formatCurrency,
  formatRecurrenceDate,
  frequencyLabel,
  recurrenceDescription,
} from '@/components/recurrences/recurrence-utils';
import { useAccounts } from '@/contexts/accounts-context';
import { useFeedback } from '@/contexts/feedback-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useRecurrences } from '@/contexts/recurrences-context';
import { useTransactions } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import { maskMoney } from '@/utils/privacy';
import { sortTransactionsByTimestampDescending } from '@/utils/transaction-sort';

type ConfirmAction = 'cancel' | 'delete' | null;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTransactionDate(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return dateTimeFormatter.format(date);
}

export default function RecurrenceDetailsScreen() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useFeedback();
  const {
    accounts,
    refreshAccounts,
    loading: accountsLoading,
    error: accountsError,
  } = useAccounts();
  const {
    transactions,
    refreshTransactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions();
  const {
    recurrences,
    loading: recurrencesLoading,
    error: recurrencesError,
    refreshRecurrences,
    cancelRecurrence,
    activateRecurrence,
    deleteRecurrence,
  } = useRecurrences();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  const recurrence = useMemo(
    () => recurrences.find((item) => item.id === id),
    [id, recurrences],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      setCategories(await getCategories());
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
      refreshRecurrences(),
      refreshAccounts(),
      refreshTransactions(),
      loadCategories(),
    ]);

    refreshInFlightRef.current = false;
    setRefreshing(false);
    setHasLoadedOnce(true);
  }, [
    loadCategories,
    refreshAccounts,
    refreshRecurrences,
    refreshTransactions,
  ]);

  useFocusEffect(
    useCallback(() => {
      void refreshDetails();
    }, [refreshDetails]),
  );

  const generatedTransactions = useMemo(
    () =>
      sortTransactionsByTimestampDescending(
        transactions.filter(
          (transaction) => transaction.recurrenceId === id,
        ),
      ),
    [id, transactions],
  );

  const loading =
    !recurrence &&
    (!hasLoadedOnce ||
      recurrencesLoading ||
      accountsLoading ||
      categoriesLoading);
  const error = recurrencesError ?? accountsError ?? categoriesError;

  function closeConfirm() {
    if (actionLoading) {
      return;
    }

    setConfirmAction(null);
    setActionError(null);
  }

  async function runConfirmAction() {
    if (!recurrence || !confirmAction || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      if (confirmAction === 'cancel') {
        await cancelRecurrence(recurrence.id);

        showToast({
          variant: 'success',
          title: 'Recorrência cancelada',
          message: 'Nenhuma nova ocorrência será gerada.',
        });

        setConfirmAction(null);
      } else {
        await deleteRecurrence(recurrence.id);

        showToast({
          variant: 'success',
          title: 'Recorrência excluída',
          message: 'As transações já geradas foram preservadas.',
        });

        setConfirmAction(null);
        router.back();
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível concluir a operação.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function reactivate() {
    if (!recurrence || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      await activateRecurrence(recurrence.id);

      showToast({
        variant: 'success',
        title: 'Recorrência reativada',
        message: 'As próximas ocorrências voltarão a ser geradas.',
      });
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível reativar a recorrência.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (!recurrence) {
    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Carregando recorrência...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.centeredContent}>
          <Text style={styles.notFoundTitle}>
            {error
              ? 'Não foi possível carregar a recorrência'
              : 'Recorrência não encontrada'}
          </Text>
          <Text style={styles.notFoundDescription}>
            {error ??
              'Essa regra pode ter sido removida ou não está mais disponível.'}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Voltar</Text>
          </Pressable>

          {error ? (
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

  const isActive = recurrence.status === 'ACTIVE';
  const isIncome = recurrence.type === 'INCOME';
  const account = accountsById.get(recurrence.accountId);
  const category = recurrence.categoryId
    ? categoriesById.get(recurrence.categoryId)
    : undefined;
  const amountColor = isIncome ? COLORS.income : COLORS.expense;
  const historyLoading =
    transactionsLoading && generatedTransactions.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ‹  Voltar para recorrências
          </Text>
        </Pressable>

        <Text style={styles.eyebrow}>FINORA / RECORRÊNCIA</Text>

        <View style={styles.heading}>
          <View
            style={[
              styles.headingIcon,
              {
                backgroundColor: isIncome
                  ? COLORS.incomeBackground
                  : COLORS.expenseBackground,
              },
            ]}
          >
            <Text style={[styles.headingIconText, { color: amountColor }]}>
              {isIncome ? '↙' : '↗'}
            </Text>
          </View>

          <View style={styles.headingText}>
            <Text style={styles.title} numberOfLines={2}>
              {recurrenceDescription(recurrence)}
            </Text>
            <Text style={styles.subtitle}>
              {isIncome ? 'Receita recorrente' : 'Despesa recorrente'}
            </Text>
          </View>
        </View>

        {error ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar"
            message={error}
            style={styles.feedback}
          />
        ) : null}

        {actionError && !confirmAction ? (
          <InlineFeedback
            variant="error"
            message={actionError}
            style={styles.feedback}
          />
        ) : null}

        <View style={styles.amountCard}>
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>Valor da ocorrência</Text>

            {refreshing ? (
              <ActivityIndicator size="small" color="#D9E8E0" />
            ) : null}
          </View>

          <Text
            style={styles.amountValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {maskMoney(
              `${isIncome ? '+ ' : '− '}${formatCurrency(
                recurrence.amount,
                recurrence.currency,
              )}`,
              hidden,
            )}
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
              {isActive ? 'Ativa' : 'Inativa'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow
            label="Frequência"
            value={frequencyLabel(recurrence.frequency)}
          />
          <DetailRow
            label="Data inicial"
            value={formatRecurrenceDate(recurrence.startDate)}
          />
          <DetailRow
            label="Próxima ocorrência"
            value={formatRecurrenceDate(recurrence.nextOccurrence)}
          />
          <DetailRow
            label="Conta"
            value={account?.name ?? 'Conta excluída'}
          />
          <DetailRow
            label="Categoria"
            value={category?.name ?? 'Sem categoria'}
            last
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico gerado</Text>
          <Text style={styles.historyCount}>
            {generatedTransactions.length}{' '}
            {generatedTransactions.length === 1
              ? 'transação'
              : 'transações'}
          </Text>
        </View>

        {historyLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Carregando transações...
            </Text>
          </View>
        ) : transactionsError ? (
          <InlineFeedback
            variant="error"
            title="Não foi possível carregar o histórico"
            message={transactionsError}
          />
        ) : generatedTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Nenhuma transação gerada ainda
            </Text>
            <Text style={styles.emptyDescription}>
              As movimentações aparecerão aqui depois que a primeira
              ocorrência vencer.
            </Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            {generatedTransactions.map((transaction, index) => {
              const transactionCategory = transaction.categoryId
                ? categoriesById.get(transaction.categoryId)
                : undefined;
              const transactionIsIncome =
                transaction.type === 'INCOME';
              const transactionColor = transactionIsIncome
                ? COLORS.income
                : COLORS.expense;

              return (
                <View
                  key={transaction.id}
                  style={[
                    styles.historyRow,
                    index < generatedTransactions.length - 1 &&
                      styles.historyDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.historyIcon,
                      {
                        backgroundColor: transactionIsIncome
                          ? COLORS.incomeBackground
                          : COLORS.expenseBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyIconText,
                        { color: transactionColor },
                      ]}
                    >
                      {transactionIsIncome ? '↙' : '↗'}
                    </Text>
                  </View>

                  <View style={styles.historyInfo}>
                    <Text
                      style={styles.historyDescription}
                      numberOfLines={1}
                    >
                      {transaction.description?.trim() ||
                        recurrenceDescription(recurrence)}
                    </Text>
                    <Text style={styles.historyMeta} numberOfLines={1}>
                      {formatTransactionDate(transaction.timestamp)}
                      {transactionCategory
                        ? ` · ${transactionCategory.name}`
                        : ''}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.historyAmount,
                      { color: transactionColor },
                    ]}
                    numberOfLines={1}
                  >
                    {maskMoney(
                      `${transactionIsIncome ? '+ ' : '− '}${formatCurrency(
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
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFormVisible(true)}
            disabled={actionLoading}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Editar recorrência</Text>
          </Pressable>

          {isActive ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActionError(null);
                setConfirmAction('cancel');
              }}
              disabled={actionLoading}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Cancelar recorrência
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void reactivate()}
              disabled={actionLoading}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Reativar recorrência
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setActionError(null);
              setConfirmAction('delete');
            }}
            disabled={actionLoading}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>
              Excluir recorrência
            </Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Cancelar impede novas ocorrências. Excluir remove a regra. Em ambos
          os casos, as transações já geradas são preservadas.
        </Text>
      </ScrollView>

      {formVisible ? (
        <RecurrenceFormModal
          recurrence={recurrence}
          accounts={accounts.filter(
            (item) => item.status === 'ACTIVE',
          )}
          categories={categories}
          onClose={() => setFormVisible(false)}
          onSaved={() => void refreshDetails()}
        />
      ) : null}

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'delete'
            ? 'Excluir recorrência?'
            : 'Cancelar recorrência?'
        }
        message={
          confirmAction === 'delete'
            ? 'A regra será removida permanentemente. As transações já geradas serão preservadas no histórico.'
            : 'Nenhuma nova ocorrência será gerada. As transações já geradas serão preservadas e a regra poderá ser reativada depois.'
        }
        confirmLabel={
          confirmAction === 'delete' ? 'Excluir' : 'Cancelar recorrência'
        }
        cancelLabel="Voltar"
        tone={confirmAction === 'delete' ? 'danger' : 'primary'}
        icon={confirmAction === 'delete' ? '×' : '↻'}
        loading={actionLoading}
        error={actionError}
        onConfirm={() => void runConfirmAction()}
        onCancel={closeConfirm}
      />
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailDivider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
    color: COLORS.secondary,
    fontSize: 13,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 24,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    color: COLORS.primary,
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
  headingIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingIconText: {
    fontSize: 26,
    fontWeight: '700',
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 14,
    marginTop: 5,
  },
  feedback: {
    marginBottom: 18,
  },
  amountCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 22,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    color: '#D9E8E0',
    fontSize: 13,
    fontWeight: '600',
  },
  amountValue: {
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
    backgroundColor: COLORS.dangerLight,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9BD4B4',
  },
  statusDotInactive: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextInactive: {
    color: COLORS.danger,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  historyCount: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
  },
  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
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
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyDescription: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  historyMeta: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  historyAmount: {
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: 10,
    marginTop: 26,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 22,
  },
  notFoundTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundDescription: {
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
});

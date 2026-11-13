import { useCallback, useMemo, useState } from 'react';
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

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { DesktopRecurrences } from '@/components/desktop/recurrences/desktop-recurrences';
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
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';
import { getCategories, type Category } from '@/services/categories-api';
import type { RecurrenceStatus } from '@/services/recurrences-api';
import { maskMoney } from '@/utils/privacy';

type StatusFilter = 'all' | RecurrenceStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'ACTIVE' },
  { label: 'Inativas', value: 'INACTIVE' },
];

export default function RecurrencesScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return <DesktopRecurrences />;
  }

  return <RecurrencesMobileScreen />;
}

function RecurrencesMobileScreen() {
  const router = useRouter();
  const { showToast } = useFeedback();
  const { hidden } = usePrivacy();
  const {
    accounts,
    refreshAccounts,
    loading: accountsLoading,
    error: accountsError,
  } = useAccounts();
  const {
    recurrences,
    loading: recurrencesLoading,
    error: recurrencesError,
    refreshRecurrences,
  } = useRecurrences();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formVisible, setFormVisible] = useState(false);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'ACTIVE'),
    [accounts],
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

  const loadScreenData = useCallback(async () => {
    setRefreshing(true);

    await Promise.allSettled([
      refreshRecurrences(),
      refreshAccounts(),
      loadCategories(),
    ]);

    setHasLoadedOnce(true);
    setRefreshing(false);
  }, [loadCategories, refreshAccounts, refreshRecurrences]);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData();
    }, [loadScreenData]),
  );

  const filteredRecurrences = useMemo(() => {
    if (statusFilter === 'all') {
      return recurrences;
    }

    return recurrences.filter(
      (recurrence) => recurrence.status === statusFilter,
    );
  }, [recurrences, statusFilter]);

  const activeCount = recurrences.filter(
    (recurrence) => recurrence.status === 'ACTIVE',
  ).length;

  const loading =
    !hasLoadedOnce &&
    (recurrencesLoading || accountsLoading || categoriesLoading);
  const error = recurrencesError ?? accountsError ?? categoriesError;

  function openCreateForm() {
    if (activeAccounts.length === 0) {
      showToast({
        variant: 'warning',
        title: 'Nenhuma conta ativa',
        message:
          'Crie ou reative uma conta antes de cadastrar uma recorrência.',
      });
      return;
    }

    setFormVisible(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>FINORA / PLANEJAMENTO</Text>
            <Text style={styles.title}>Recorrências</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar recorrência"
            onPress={openCreateForm}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.description}>
          Organize despesas e receitas que se repetem automaticamente.
        </Text>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Regras ativas</Text>
            <Text style={styles.summaryValue}>{activeCount}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRight}>
            <Text style={styles.summaryHint}>
              O backend gera cada ocorrência na data programada, mesmo com o
              aplicativo fechado.
            </Text>
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : null}
          </View>
        </View>

        <View style={styles.filters}>
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setStatusFilter(filter.value)}
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
        </View>

        {loading ? (
          <View style={styles.statusState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.emptyDescription}>
              Carregando recorrências...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <InlineFeedback
              variant="error"
              title="Não foi possível carregar"
              message={error}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadScreenData()}
              disabled={refreshing}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : filteredRecurrences.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>↻</Text>
            <Text style={styles.emptyTitle}>
              {recurrences.length === 0
                ? 'Nenhuma recorrência cadastrada'
                : 'Nenhuma recorrência neste filtro'}
            </Text>
            <Text style={styles.emptyDescription}>
              {recurrences.length === 0
                ? 'Cadastre uma despesa ou receita recorrente para que as movimentações sejam criadas automaticamente.'
                : 'Selecione outro filtro para visualizar as regras.'}
            </Text>

            {recurrences.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={openCreateForm}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>
                  Criar recorrência
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredRecurrences.map((recurrence) => {
              const isActive = recurrence.status === 'ACTIVE';
              const isIncome = recurrence.type === 'INCOME';
              const account = accountsById.get(recurrence.accountId);
              const category = recurrence.categoryId
                ? categoriesById.get(recurrence.categoryId)
                : undefined;

              return (
                <Pressable
                  key={recurrence.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes de ${recurrenceDescription(
                    recurrence,
                  )}`}
                  onPress={() =>
                    router.push({
                      pathname: '/recurrences/[id]',
                      params: { id: recurrence.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.pressed,
                    !isActive && styles.cardInactive,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.icon,
                        {
                          backgroundColor: isIncome
                            ? COLORS.incomeBackground
                            : COLORS.expenseBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.iconText,
                          {
                            color: isIncome
                              ? COLORS.income
                              : COLORS.expense,
                          },
                        ]}
                      >
                        {isIncome ? '↙' : '↗'}
                      </Text>
                    </View>

                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {recurrenceDescription(recurrence)}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {category?.name ?? 'Sem categoria'} ·{' '}
                        {frequencyLabel(recurrence.frequency)}
                      </Text>
                      <Text style={styles.cardAccount} numberOfLines={1}>
                        {account?.name ?? 'Conta excluída'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.cardAmount,
                        { color: isIncome ? COLORS.income : COLORS.expense },
                      ]}
                      numberOfLines={1}
                    >
                      {maskMoney(
                        formatCurrency(
                          recurrence.amount,
                          recurrence.currency,
                        ),
                        hidden,
                      )}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.nextLabel}>
                      Próxima: {formatRecurrenceDate(recurrence.nextOccurrence)}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        isActive
                          ? styles.statusActive
                          : styles.statusInactive,
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
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.disclaimer}>
          As transações são geradas pelo backend e aparecem no histórico
          normal de movimentações.
        </Text>
      </ScrollView>

      {formVisible ? (
        <RecurrenceFormModal
          accounts={activeAccounts}
          categories={categories}
          onClose={() => setFormVisible(false)}
          onSaved={() => void loadScreenData()}
        />
      ) : null}
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
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
  description: {
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginHorizontal: 18,
  },
  summaryRight: {
    flex: 1,
    gap: 10,
  },
  summaryHint: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  statusState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 42,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
  },
  emptyIcon: {
    color: COLORS.primary,
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardInactive: {
    opacity: 0.78,
  },
  pressed: {
    opacity: 0.82,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 19,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardMeta: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  cardAccount: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  cardAmount: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 14,
    paddingTop: 12,
  },
  nextLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusActive: {
    backgroundColor: COLORS.incomeBackground,
  },
  statusInactive: {
    backgroundColor: COLORS.inactiveBackground,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.income,
  },
  statusDotInactive: {
    backgroundColor: COLORS.inactive,
  },
  statusText: {
    color: COLORS.income,
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextInactive: {
    color: COLORS.inactive,
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 24,
  },
});
